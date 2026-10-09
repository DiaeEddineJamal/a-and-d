/**
 * GET /api/yt?url=<youtube link> -> the song's audio file (m4a, or webm when YouTube has no m4a).
 * Used by the arcade's "Tape Deck" app on the CD-ROM drive, which keeps the file on the player's PC.
 *
 * yt-dlp is fetched once into the temp dir on first use, so the free host needs no build step for it.
 * Title and artist come back in X-Track-Title / X-Track-Artist (URI-encoded).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';

const WINDOWS = process.platform === 'win32';
const BIN = path.join(os.tmpdir(), WINDOWS ? 'yt-dlp.exe' : 'yt-dlp');
const RELEASE = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${WINDOWS ? 'yt-dlp.exe' : process.platform === 'darwin' ? 'yt-dlp_macos' : 'yt-dlp_linux'}`;
const MAX_JOBS = 2;
// ponytail: a global job counter, a queue if two people ever need it at once
let jobs = 0;
let fetching = null;

/** youtube.com/watch?v=, youtu.be/, /shorts/, /embed/, music.youtube.com -> the 11-character video id */
export function videoId(link) {
  try {
    const url = new URL(String(link).trim());
    const host = url.hostname.replace(/^(www|m|music)\./, '');
    const id = host === 'youtu.be' ? url.pathname.slice(1)
      : host === 'youtube.com' ? url.searchParams.get('v') ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1]
      : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

function ensureBinary() {
  if (fs.existsSync(BIN)) return Promise.resolve();
  fetching ??= fetch(RELEASE).then(async response => {
    if (!response.ok) throw new Error(`yt-dlp download failed: ${response.status}`);
    fs.writeFileSync(BIN, Buffer.from(await response.arrayBuffer()), { mode: 0o755 });
  }).finally(() => { fetching = null; });
  return fetching;
}

export function attachYoutube(app) {
  app.get('/api/yt', async (req, res) => {
    res.set({ 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'X-Track-Title, X-Track-Artist' });
    const id = videoId(req.query.url);
    if (!id) return res.status(400).json({ error: 'That is not a YouTube video link.' });
    if (jobs >= MAX_JOBS) return res.status(429).json({ error: 'The tape deck is busy. Try again in a minute.' });
    jobs++;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-'));
    const done = () => { jobs--; fs.rm(dir, { recursive: true, force: true }, () => {}); };
    try {
      await ensureBinary();
      const args = [
        '--no-playlist', '--no-progress', '--no-simulate', '--no-warnings',
        '-f', 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio',
        '--max-filesize', '60M', '--match-filter', 'duration < 1500',
        '-o', path.join(dir, 'track.%(ext)s'),
        '--print', 'after_move:%(title)s\t%(artist,uploader,channel)s\t%(filepath)s',
        `https://www.youtube.com/watch?v=${id}`,
      ];
      const output = await new Promise((resolve, reject) => execFile(BIN, args, { timeout: 150_000, maxBuffer: 1 << 20 }, (error, stdout, stderr) => {
        if (error) reject(new Error(stderr.split('\n').find(line => line.startsWith('ERROR')) ?? error.message)); else resolve(stdout);
      }));
      const [title, artist, file] = output.trim().split('\n').pop().split('\t');
      if (!file || !fs.existsSync(file)) throw new Error('This video is too long (25 minutes max) or has no audio.');
      res.set({
        'Content-Type': file.endsWith('.m4a') ? 'audio/mp4' : 'audio/webm',
        'X-Track-Title': encodeURIComponent(title), 'X-Track-Artist': encodeURIComponent(artist === 'NA' ? '' : artist),
        'Cache-Control': 'no-store',
      });
      res.sendFile(file, done);
    } catch (error) {
      done();
      console.warn('[yt]', id, error.message);
      res.status(502).json({ error: /sign in|bot/i.test(error.message) ? 'YouTube refused the server this time. Try again later, or add the song as a file.' : error.message.replace(/^ERROR:\s*(\[[^\]]+\]\s*)?(\w+:\s*)?/, '') });
    }
  });
}

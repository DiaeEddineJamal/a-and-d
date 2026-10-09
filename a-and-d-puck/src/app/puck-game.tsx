"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { PUCK, chaseMallet, clamp, clearMallet, freshPuck, homeMallet, servePuck, stepPuck } from "../game/puck-core.mjs";
import { useDuoRoom } from "../game/duo-room";
import { DifficultyPicker, DuoLobby, ModeSwitch, type Difficulty, type PlayMode } from "../game/duo-lobby";
import { createSpriteBank, drawFx, spawnFx, type Fx } from "../game/sprite-bank";
import { applyView, pointerToBoard, screenSize, themeFont, uprightOverlay, uprightText, usePortrait, type BoardView } from "../game/board-view";

type Body = { x: number; y: number; vx: number; vy: number };
type Snap = number[];
const { W, H, puckR, malletR, goalHalf, winScore } = PUCK;
const SEAT_NAMES: [string, string] = ["TEAL", "BRICK"];
/** Wall-clock for network bookkeeping inside socket handlers. */
const clockMs = () => performance.now();

/** How the CPU plays at each level: top speed, how often it rethinks, aim wobble, appetite for attacking. */
const CPU = {
  easy: { speed: 950, react: 0.24, wobble: 46, attack: 0.35 },
  normal: { speed: 1550, react: 0.12, wobble: 20, attack: 0.65 },
  hard: { speed: 2300, react: 0.05, wobble: 7, attack: 0.95 },
} as const;

type Ai = { think: number; target: { x: number; y: number }; plan: "defend" | "line-up" | "strike"; strikeFor: number; aim: number };

/** Where the puck will cross a vertical line, bouncing off the side rails. */
function crossingY(p: Body, lineX: number) {
  if (Math.abs(p.vx) < 1) return p.y;
  const t = (lineX - p.x) / p.vx;
  if (t < 0) return p.y;
  const span = H - 2 * puckR;
  let y = p.y - puckR + p.vy * t;
  y = ((y % (2 * span)) + 2 * span) % (2 * span);
  return (y > span ? 2 * span - y : y) + puckR;
}

function thinkCpu(ai: Ai, puck: Body, me: Body, level: Difficulty, dt: number) {
  const cfg = CPU[level];
  ai.think -= dt;
  if (ai.plan === "strike") {
    ai.strikeFor -= dt;
    if (ai.strikeFor <= 0) { ai.plan = "defend"; ai.think = 0; }
  }
  if (ai.think > 0) return;
  ai.think = cfg.react;
  const wobble = () => (Math.random() - 0.5) * 2 * cfg.wobble;
  const onMySide = puck.x > W / 2 - puckR;
  const slowOrComing = puck.vx > -260;
  if (onMySide && slowOrComing && (ai.plan !== "defend" || Math.random() < cfg.attack)) {
    // Line up behind the puck on the line to the goal, then drive through it.
    if (ai.plan === "defend") { ai.plan = "line-up"; ai.aim = H / 2 + (Math.random() - 0.5) * goalHalf * 1.2; }
    const dx = puck.x - 0, dy = puck.y - ai.aim, d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    if (ai.plan === "line-up") {
      const behind = { x: puck.x + ux * (puckR + malletR + 14), y: puck.y + uy * (puckR + malletR + 14) };
      ai.target = { x: behind.x, y: behind.y };
      if (Math.hypot(me.x - behind.x, me.y - behind.y) < 18 || behind.x > W - malletR) { ai.plan = "strike"; ai.strikeFor = 0.28; }
    }
    if (ai.plan === "strike") ai.target = { x: puck.x - ux * 90 + wobble() * 0.3, y: puck.y - uy * 90 + wobble() * 0.3 };
    return;
  }
  ai.plan = "defend";
  const guardX = level === "hard" ? W - 150 : W - 115;
  const y = puck.vx > 0 ? crossingY(puck, guardX) : puck.y * 0.55 + (H / 2) * 0.45;
  ai.target = { x: guardX, y: clamp(y + wobble(), H / 2 - goalHalf - 30, H / 2 + goalHalf + 30) };
}

/** Keeps a finger's events on this element; harmless if the browser refuses. */
const capture = (el: Element, id: number) => { try { el.setPointerCapture(id); } catch { /* not a live pointer */ } };

export function PuckGame({ sprites: files }: { sprites: string[] }) {
  // State, not a ref: the drawing loop restarts whenever the canvas element is replaced.
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [mode, setModeState] = useState<PlayMode>("cpu");
  const [difficulty, setDifficultyState] = useState<Difficulty>("normal");
  const [hud, setHud] = useState({ left: 0, right: 0, message: "FIRST TO 7" });
  const modeRef = useRef<PlayMode>("cpu");
  const difficultyRef = useRef<Difficulty>("normal");
  const puck = useRef<Body>(freshPuck());
  const mallets = useRef<[Body, Body]>([homeMallet(0), homeMallet(1)]);
  const match = useRef({ scores: [0, 0], hold: 1.2, round: 0, flash: 0, flashText: "" });
  const keys = useRef(new Set<string>());
  const pointers = useRef(new Map<number, { seat: number; x: number; y: number }>());
  const hover = useRef<{ x: number; y: number } | null>(null);
  const ai = useRef<Ai>({ think: 0, target: { x: W - 110, y: H / 2 }, plan: "defend", strikeFor: 0, aim: H / 2 });
  const trail = useRef<{ x: number; y: number }[]>([]);
  // Optional art from /public/sprites; anything missing is drawn in code.
  const [sprites] = useState(() => createSpriteBank(files));
  const fx = useRef<Fx[]>([]);
  const hitAt = useRef([0, 0]);
  // On a phone held upright the table turns so your own goal sits at the bottom.
  const portrait = usePortrait();
  const view = useRef<BoardView>({ portrait: false, bottom: "left", W, H });
  const net = useRef({ hasSnap: false, err: { x: 0, y: 0 }, opp: { x: 0, y: 0, vx: 0, vy: 0 }, lastSend: 0, claimId: 0, claim: null as null | { id: number; at: number }, lastClaim: 0, seq: -1, round: 0, frozen: false });

  const say = useCallback((message: string) => {
    const m = match.current;
    setHud({ left: m.scores[0], right: m.scores[1], message });
  }, []);

  const resetMatch = useCallback((message = "FIRST TO 7") => {
    puck.current = freshPuck(); mallets.current = [homeMallet(0), homeMallet(1)];
    match.current = { scores: [0, 0], hold: 1.2, round: 0, flash: 0, flashText: "" };
    trail.current = []; keys.current.clear(); pointers.current.clear();
    say(message);
  }, [say]);

  const room = useDuoRoom("puck", {
    onStart: () => {
      const n = net.current;
      net.current = { ...n, hasSnap: false, err: { x: 0, y: 0 }, claim: null, seq: -1, round: 0, frozen: false };
      resetMatch("FACE-OFF");
    },
    onSnapshot: (snap: Snap) => {
      const [t, px, py, vx, vy, ax, ay, avx, avy, bx, by, bvx, bvy, s0, s1, round, winner, hold, seq, ack0, ack1, pending] = snap;
      const n = net.current, m = match.current, mine = room.seatRef.current ?? 0;
      const age = clamp((room.serverNow() - t) / 1000, 0, 0.25);
      const lead = Math.min(age, 0.08);
      n.opp = mine === 0 ? { x: bx + bvx * lead, y: by + bvy * lead, vx: bvx, vy: bvy } : { x: ax + avx * lead, y: ay + avy * lead, vx: avx, vy: avy };
      if (!n.hasSnap) { mallets.current[1 - mine] = { ...n.opp }; mallets.current[mine] = mine === 0 ? { x: ax, y: ay, vx: 0, vy: 0 } : { x: bx, y: by, vx: 0, vy: 0 }; }

      const newRound = round !== n.round;
      if (newRound) { n.round = round; m.flash = PUCK.faceoff; m.flashText = `${SEAT_NAMES[winner - 1]} WINS`; }
      if (s0 !== m.scores[0] || s1 !== m.scores[1]) {
        const scorer = s0 > m.scores[0] ? 0 : 1;
        m.scores = [s0, s1];
        if (!newRound) { m.flash = PUCK.faceoff; m.flashText = "GOAL!"; }
        goalFx(scorer);
        say(newRound ? `${SEAT_NAMES[winner - 1]} WINS · NEW MATCH` : `${SEAT_NAMES[scorer]} SCORES`);
      }

      // While our own hit is still on its way to the server, our prediction
      // is newer than anything the server can tell us about the puck.
      const myAck = mine === 0 ? ack0 : ack1;
      const now = clockMs();
      if (n.claim && myAck < n.claim.id && now - n.claim.at < 350) return;
      n.claim = null;
      const p = { x: px, y: py, vx, vy };
      if (!pending) {
        const moving = Math.max(0, age - hold);
        const res = stepPuck(p, moving, mallets.current);
        if (res.contact[mine]) sendClaim(p);
      }
      const shown = { x: puck.current.x + n.err.x, y: puck.current.y + n.err.y };
      const jump = Math.hypot(shown.x - p.x, shown.y - p.y);
      n.err = n.hasSnap && jump < 110 && seq === n.seq ? { x: shown.x - p.x, y: shown.y - p.y } : n.hasSnap && jump < 110 ? { x: (shown.x - p.x) * 0.6, y: (shown.y - p.y) * 0.6 } : { x: 0, y: 0 };
      puck.current = p; m.hold = Math.max(0, hold - age); n.seq = seq; n.frozen = !!pending; n.hasSnap = true;
    },
  });

  /** Burst at the goal mouth the puck just went into. */
  function goalFx(scorer: number) {
    spawnFx(fx.current, { name: "fx_goal", kind: "burst", x: scorer === 0 ? W - 20 : 20, y: H / 2, size: 260, color: scorer === 0 ? "#8fc4bb" : "#dc7a5c", life: 0.9 }, clockMs());
  }
  const sendClaim = (p: Body) => {
    const n = net.current, now = clockMs();
    if (now - n.lastClaim < 30) return;
    n.lastClaim = now;
    n.claim = { id: ++n.claimId, at: now };
    room.emit("puck:hit", { id: n.claimId, t: room.serverNow(), x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, vx: Math.round(p.vx), vy: Math.round(p.vy) });
  };
  const sendClaimRef = useRef(sendClaim);
  const roomRef = useRef(room);
  useEffect(() => { sendClaimRef.current = sendClaim; roomRef.current = room; });

  const setMode = (next: PlayMode) => {
    if (next === modeRef.current) return;
    if (modeRef.current === "online") room.leave();
    modeRef.current = next; setModeState(next);
    resetMatch(next === "online" ? "ONLINE LOBBY" : "FIRST TO 7");
    if (next === "online") room.open();
  };
  const setDifficulty = (d: Difficulty) => { difficultyRef.current = d; setDifficultyState(d); resetMatch(`CPU: ${d.toUpperCase()}`); };

  useEffect(() => {
    if (!room.resuming) return;
    const t = window.setTimeout(() => { modeRef.current = "online"; setModeState("online"); }, 0);
    return () => window.clearTimeout(t);
  }, [room.resuming]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) { e.preventDefault(); pointers.current.clear(); hover.current = null; }
      keys.current.add(key);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    const release = () => { keys.current.clear(); pointers.current.clear(); };
    const hidden = () => { if (document.hidden) release(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", hidden);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", release); document.removeEventListener("visibilitychange", hidden); };
  }, []);

  const showBoard = mode !== "online" || room.phase === "playing";
  const bottomSide = mode === "online" && room.seat === 1 ? "right" : "left";
  useEffect(() => { view.current = { portrait, bottom: bottomSide, W, H }; }, [portrait, bottomSide]);
  useEffect(() => {
    const canvas = canvasEl;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);


    // The table never changes, so it is painted once.
    const table = document.createElement("canvas");
    table.width = W * dpr; table.height = H * dpr;
    const tc = table.getContext("2d")!;
    tc.scale(dpr, dpr);
    let painted = -1;
    // Repainted when the optional surface image arrives. Markings always
    // come from code so the lines match the physics exactly.
    const paintTable = () => {
      if (painted === sprites.version()) return;
      painted = sprites.version();
      const surface = sprites.get("table_surface");
      if (surface) tc.drawImage(surface, 0, 0, W, H);
      else {
        tc.fillStyle = "#35615c"; tc.fillRect(0, 0, W, H);
        tc.fillStyle = "rgba(242,232,202,.13)";
        for (let y = 18; y < H; y += 24) for (let x = 18 + ((y / 24) % 2) * 12; x < W; x += 24) { tc.beginPath(); tc.arc(x, y, 1.6, 0, Math.PI * 2); tc.fill(); }
      }
      tc.strokeStyle = "rgba(242,232,202,.55)"; tc.lineWidth = 4;
      tc.beginPath(); tc.moveTo(W / 2, 0); tc.lineTo(W / 2, H); tc.stroke();
      tc.beginPath(); tc.arc(W / 2, H / 2, 70, 0, Math.PI * 2); tc.stroke();
      tc.fillStyle = "rgba(242,232,202,.55)"; tc.beginPath(); tc.arc(W / 2, H / 2, 8, 0, Math.PI * 2); tc.fill();
      for (const side of [0, 1]) {
        const gx = side === 0 ? 0 : W;
        tc.strokeStyle = side === 0 ? "rgba(127,184,176,.8)" : "rgba(208,105,77,.8)"; tc.lineWidth = 4;
        tc.beginPath(); tc.arc(gx, H / 2, goalHalf + 34, side === 0 ? -Math.PI / 2 : Math.PI / 2, side === 0 ? Math.PI / 2 : Math.PI * 1.5); tc.stroke();
        tc.fillStyle = "#1c1814"; tc.fillRect(side === 0 ? 0 : W - 10, H / 2 - goalHalf, 10, goalHalf * 2);
      }
      tc.strokeStyle = "#c3973a"; tc.lineWidth = 6; tc.strokeRect(3, 3, W - 6, H - 6);
    };

    const room = roomRef.current;
    /** A mallet touched the puck: spark once per strike, and flash that mallet. */
    const contacts = (contact: boolean[]) => {
      const now = performance.now(), p = puck.current;
      contact.forEach((hit, seat) => {
        if (!hit) return;
        if (now - hitAt.current[seat] > 140) {
          const m = mallets.current[seat], d = Math.hypot(p.x - m.x, p.y - m.y) || 1;
          spawnFx(fx.current, { name: "fx_hit", kind: "spark", x: m.x + ((p.x - m.x) / d) * malletR, y: m.y + ((p.y - m.y) / d) * malletR, size: 90, color: "#f2e8ca", life: 0.35 }, now);
        }
        hitAt.current[seat] = now;
      });
    };
    let raf = 0, last = performance.now();
    const drawMallet = (m: Body, seat: number, label: string | null) => {
      ctx.fillStyle = "rgba(10,12,11,.35)"; ctx.beginPath(); ctx.arc(m.x + 5, m.y + 7, malletR, 0, Math.PI * 2); ctx.fill();
      const name = seat === 0 ? "mallet_teal" : "mallet_brick";
      const struck = performance.now() - hitAt.current[seat] < 120;
      const art = (struck && sprites.get(`${name}_hit`)) || sprites.get(name);
      if (art) {
        ctx.drawImage(art, m.x - malletR, m.y - malletR, malletR * 2, malletR * 2);
        if (label) uprightText(ctx, view.current, dpr, label, m.x, m.y, `600 14px ${themeFont("mono")}`, "#f2e8ca");
        return;
      }
      ctx.fillStyle = seat === 0 ? "#567b78" : "#a44f39"; ctx.beginPath(); ctx.arc(m.x, m.y, malletR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = seat === 0 ? "#8fc4bb" : "#dc7a5c"; ctx.beginPath(); ctx.arc(m.x, m.y, malletR - 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = seat === 0 ? "#3f5f5c" : "#80392a"; ctx.beginPath(); ctx.arc(m.x, m.y, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,248,230,.45)"; ctx.beginPath(); ctx.arc(m.x - 5, m.y - 6, 6, 0, Math.PI * 2); ctx.fill();
      if (label) uprightText(ctx, view.current, dpr, label, m.x, m.y, `600 14px ${themeFont("mono")}`, "#f2e8ca");
    };
    const draw = (overlay: string | null, youSeat: number | null) => {
      const p = puck.current, m = match.current, n = net.current;
      const online = modeRef.current === "online";
      const shown = online ? { x: p.x + n.err.x, y: p.y + n.err.y } : p;
      const v = view.current, size = screenSize(v);
      const cw = Math.round(size.w * dpr), ch = Math.round(size.h * dpr);
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      applyView(ctx, v, dpr);
      paintTable();
      ctx.drawImage(table, 0, 0, W, H);
      const t = trail.current;
      t.push({ x: shown.x, y: shown.y }); if (t.length > 9) t.shift();
      t.forEach((q, i) => { ctx.fillStyle = `rgba(195,151,58,${(i / t.length) * 0.28})`; ctx.beginPath(); ctx.arc(q.x, q.y, puckR * (0.5 + i / t.length / 2), 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = "rgba(10,12,11,.35)"; ctx.beginPath(); ctx.arc(shown.x + 4, shown.y + 5, puckR, 0, Math.PI * 2); ctx.fill();
      const speed = Math.hypot(p.vx, p.vy);
      const puckArt = (speed > 40 && sprites.loop("puck_spin", performance.now() / 1000, Math.min(24, speed / 60))) || sprites.get("puck");
      if (puckArt) ctx.drawImage(puckArt, shown.x - puckR, shown.y - puckR, puckR * 2, puckR * 2);
      else {
        ctx.fillStyle = "#1c1814"; ctx.beginPath(); ctx.arc(shown.x, shown.y, puckR, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#c3973a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(shown.x, shown.y, puckR - 6, 0, Math.PI * 2); ctx.stroke();
      }
      const hint = m.hold > 0 ? youSeat : null;
      drawMallet(mallets.current[0], 0, hint === 0 ? "YOU" : null);
      drawMallet(mallets.current[1], 1, hint === 1 ? "YOU" : modeRef.current === "cpu" && m.hold > 0 ? "CPU" : null);
      drawFx(ctx, sprites, fx.current, performance.now());
      if (m.flash > 0) {
        const px = Math.round(Math.min(64, screenSize(v).w / 7));
        uprightText(ctx, v, dpr, m.flashText, W / 2, H / 2 - 36, `600 ${px}px ${themeFont("serif")}`, `rgba(242,232,202,${Math.min(1, m.flash) * 0.9})`);
      }
      if (m.hold > 0.05 && m.flashText) {
        const px = Math.round(Math.min(72, screenSize(v).w / 6));
        uprightText(ctx, v, dpr, String(Math.ceil(m.hold)), W / 2, H / 2 + 48, `600 ${px}px ${themeFont("serif")}`, "rgba(242,232,202,.95)");
      }
      if (overlay) uprightOverlay(ctx, v, dpr, [overlay]);
    };

    /** Keyboard, finger or mouse: each resolves to a target the mallet chases. */
    const steer = (seat: number, dt: number, keySet: string[][] | null) => {
      const mallet = mallets.current[seat];
      for (const ptr of pointers.current.values()) if (ptr.seat === seat) { chaseMallet(mallet, seat, ptr.x, ptr.y, dt); return; }
      if (seat === mySeat() && hover.current && modeRef.current !== "local") { chaseMallet(mallet, seat, hover.current.x, hover.current.y, dt); return; }
      let kx = 0, ky = 0;
      for (const [up, down, left, right] of keySet ?? []) {
        const k = keys.current;
        ky += (k.has(down) ? 1 : 0) - (k.has(up) ? 1 : 0);
        kx += (k.has(right) ? 1 : 0) - (k.has(left) ? 1 : 0);
      }
      const len = Math.hypot(kx, ky) || 1;
      chaseMallet(mallet, seat, mallet.x + (kx / len) * PUCK.keySpeed * dt, mallet.y + (ky / len) * PUCK.keySpeed * dt, dt, PUCK.keySpeed);
    };
    const WASD = ["w", "s", "a", "d"], ARROWS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    const mySeat = () => (modeRef.current === "online" ? room.seatRef.current ?? 0 : 0);

    const offline = (dt: number) => {
      const m = match.current, cpu = modeRef.current === "cpu";
      steer(0, dt, cpu ? [WASD, ARROWS] : [WASD]);
      if (cpu) {
        thinkCpu(ai.current, puck.current, mallets.current[1], difficultyRef.current, dt);
        chaseMallet(mallets.current[1], 1, ai.current.target.x, ai.current.target.y, dt, CPU[difficultyRef.current].speed);
      } else steer(1, dt, [ARROWS]);
      if (m.hold > 0) {
        m.hold -= dt;
        clearMallet(puck.current, mallets.current[0], 0);
        clearMallet(puck.current, mallets.current[1], 1);
        return;
      }
      const { goal, contact } = stepPuck(puck.current, dt, mallets.current);
      contacts(contact);
      if (!goal) return;
      const scorer = goal === 1 ? 0 : 1;
      goalFx(scorer);
      m.scores[scorer]++;
      m.hold = PUCK.faceoff;
      if (m.scores[scorer] >= winScore) {
        m.flash = PUCK.faceoff; m.flashText = `${cpu ? (scorer === 0 ? "YOU WIN" : "CPU WINS") : `${SEAT_NAMES[scorer]} WINS`}`;
        say(`${m.flashText} · ${m.scores[0]}–${m.scores[1]}`);
        m.scores = [0, 0];
      } else {
        m.flash = PUCK.faceoff; m.flashText = "GOAL!";
        say(`${cpu && scorer === 1 ? "CPU" : SEAT_NAMES[scorer]} SCORES`);
      }
      puck.current = servePuck(1 - scorer);
      clearMallet(puck.current, mallets.current[0], 0);
      clearMallet(puck.current, mallets.current[1], 1);
    };

    const online = (dt: number, now: number) => {
      const n = net.current, m = match.current, mine = mySeat(), me = mallets.current[mine];
      steer(mine, dt, [WASD, ARROWS]);
      if (now - n.lastSend > 30) {
        room.emit("puck:m", [Math.round(me.x), Math.round(me.y), Math.round(me.vx), Math.round(me.vy)], true);
        n.lastSend = now;
      }
      if (!n.hasSnap) return;
      const opp = mallets.current[1 - mine];
      const blend = 1 - Math.exp(-dt * 24);
      opp.x += (n.opp.x - opp.x) * blend; opp.y += (n.opp.y - opp.y) * blend; opp.vx = n.opp.vx; opp.vy = n.opp.vy;
      const decay = Math.exp(-dt * 12);
      n.err.x *= decay; n.err.y *= decay;
      if (room.statusRef.current !== "ok" || n.frozen) return;
      if (m.hold > 0) {
        m.hold = Math.max(0, m.hold - dt);
        clearMallet(puck.current, mallets.current[0], 0);
        clearMallet(puck.current, mallets.current[1], 1);
        return;
      }
      const res = stepPuck(puck.current, dt, mallets.current);
      contacts(res.contact);
      if (res.contact[mine]) sendClaimRef.current(puck.current);
      // A predicted goal waits for the server to confirm it.
      if (res.goal) { puck.current.vx = 0; puck.current.vy = 0; n.frozen = true; }
    };

    const frame = (now: number) => {
      // rAF timestamps can land a hair before `last` on the first frame.
      const dt = Math.max(0, Math.min((now - last) / 1000, 0.05)); last = now;
      const m = match.current;
      if (m.flash > 0) m.flash -= dt;
      const isOnline = modeRef.current === "online";
      if (isOnline) online(dt, now); else offline(dt);
      const status = room.statusRef.current;
      draw(isOnline ? (status === "reconnecting" ? "RECONNECTING…" : status === "partner-away" ? "WAITING FOR PARTNER" : null) : null,
        isOnline ? mySeat() : modeRef.current === "cpu" ? 0 : null);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [say, canvasEl, sprites]);

  const boardPoint = (e: ReactPointerEvent<HTMLCanvasElement>) => pointerToBoard(view.current, e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  const seatFor = (x: number) => (mode === "local" ? (x < W / 2 ? 0 : 1) : mode === "online" ? room.seatRef.current ?? 0 : 0);
  // A fingertip would hide the mallet it drags, so the mallet rides a little ahead of it.
  const reach = (e: ReactPointerEvent<HTMLCanvasElement>, seat: number, p: { x: number; y: number }) =>
    e.pointerType === "touch" ? { x: p.x + (seat === 0 ? 34 : -34), y: p.y } : p;
  const boardProps = {
    onPointerDown: (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const p = boardPoint(e);
      capture(e.currentTarget, e.pointerId);
      const seat = seatFor(p.x);
      pointers.current.set(e.pointerId, { seat, ...reach(e, seat, p) });
    },
    onPointerMove: (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const p = boardPoint(e), ptr = pointers.current.get(e.pointerId);
      if (ptr) { const q = reach(e, ptr.seat, p); ptr.x = q.x; ptr.y = q.y; return; }
      // With a mouse, vs CPU and online, the mallet simply follows the cursor.
      if (e.pointerType === "mouse" && mode !== "local") hover.current = p;
    },
    onPointerUp: (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const ptr = pointers.current.get(e.pointerId);
      pointers.current.delete(e.pointerId);
      if (ptr && e.pointerType === "mouse" && mode !== "local") hover.current = { x: ptr.x, y: ptr.y };
    },
    onPointerCancel: (e: ReactPointerEvent<HTMLCanvasElement>) => { pointers.current.delete(e.pointerId); },
  };

  const status = mode === "online" && room.phase === "playing" ? `LIVE${room.ping ? ` · ${room.ping} MS` : ""}` : mode === "cpu" ? `CPU · ${difficulty.toUpperCase()}` : mode === "local" ? "SAME SCREEN" : "LOBBY";
  const hint = mode === "local" ? "TEAL: W A S D · BRICK: ARROWS · TOUCH: DRAG ON YOUR HALF"
    : mode === "cpu" ? "MOUSE, FINGER, WASD OR ARROWS · YOU ARE TEAL"
    : `YOU ARE ${SEAT_NAMES[room.seat ?? 0]} · MOUSE, FINGER, WASD OR ARROWS`;

  return <>
    <section className="game-shell">
      <div className="scoreboard">
        <div className="score"><strong>{hud.left}</strong><small>TEAL<br />{mode === "cpu" ? "YOU" : "LEFT GOAL"}</small></div>
        <span className="round-status">{status}<br />{hud.message}</span>
        <div className="score score-right"><small>BRICK<br />{mode === "cpu" ? "CPU" : "RIGHT GOAL"}</small><strong>{hud.right}</strong></div>
      </div>
      <div className="mode-row">
        <ModeSwitch mode={mode} onChange={setMode} />
        {mode === "cpu" && <DifficultyPicker value={difficulty} onChange={setDifficulty} />}
      </div>
      {showBoard
        ? <div className="board-wrap" style={{ "--board-ratio": portrait ? H / W : W / H, "--chrome": "172px", "--chrome-land": "118px", "--rails": "2rem" } as React.CSSProperties}>
          <canvas className="game-canvas" ref={setCanvasEl} width={W} height={H} style={{ aspectRatio: portrait ? `${H} / ${W}` : `${W} / ${H}` }} aria-label="A&D Puck air hockey table" {...boardProps} />
        </div>
        : <DuoLobby room={room} seatNames={SEAT_NAMES} onStart={() => room.start()} />}
      <div className="game-bottom">
        <a className="mobile-back" href={process.env.NEXT_PUBLIC_ARCADE_URL ?? "http://localhost:3010"}>← ARCADE</a>
        <span className="control-hint">{hint}</span>
        <button className="mode-button" onClick={() => { if (mode === "online") room.leave(); resetMatch(); }}>↻ {mode === "online" ? "LEAVE ROOM" : "RESTART MATCH"}</button>
      </div>
    </section>
    <section className="game-notes"><p>VS CPU / THREE LEVELS. HARD ONE BITES.</p><p>ONLINE / CREATE A CODE. SHARE IT. PLAY.</p><p>FIRST TO 7 / YOU CAN’T CROSS THE CENTRE LINE.</p></section>
  </>;
}

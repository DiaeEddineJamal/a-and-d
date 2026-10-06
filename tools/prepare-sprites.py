"""
Prepares generated art for the games. Run from the repository root after adding
or replacing PNGs in any game's public/sprites folder:

    python tools/prepare-sprites.py

What it does, per file:
  - keeps an untouched copy in <game>/art-originals/ (outside public/, never shipped)
    and always works from that copy, so running it twice changes nothing; a file
    in public/ that differs from the script's last output is treated as new art;
  - round objects (ball, puck, mallets): trims the empty margin and centres the
    object on a square canvas, so every animation frame is the same size;
  - paddles: trims to the paddle itself, so it fills the tall slot the game draws;
  - storm overlays: resizes every frame to the court's 16:9 shape;
  - resizes everything to what the game actually draws (with room for 2x screens)
    and re-saves it with a reduced palette, so phones download far less.

Needs Pillow:  pip install pillow
"""
import hashlib
import json
import os
import re
import shutil
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAMES = ["mangolian-pong", "mangolian-puck", "lmongolyan-chefs"]

ROUND = re.compile(r"^(ball|puck|mallet_)")
PADDLE = re.compile(r"^paddle_")
STORM = re.compile(r"^fx_storm")
BACKDROP = re.compile(r"^(court|table_surface)$")


def target_size(name):
    """Longest side in pixels, sized from how large the game draws it."""
    if BACKDROP.match(name):
        return 1280
    if STORM.match(name):
        return 960
    if name.startswith("fx_goal"):
        return 384
    if name.startswith("tile_"):
        return 160
    if PADDLE.match(name):
        return 320
    return 256


def trim(im, pad=0.0):
    box = im.getchannel("A").point(lambda a: 255 if a > 16 else 0).getbbox()
    if not box:
        return im
    im = im.crop(box)
    if pad:
        w, h = im.size
        p = int(max(w, h) * pad)
        canvas = Image.new("RGBA", (w + 2 * p, h + 2 * p), (0, 0, 0, 0))
        canvas.paste(im, (p, p))
        im = canvas
    return im


def square(im):
    w, h = im.size
    side = max(w, h)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - w) // 2, (side - h) // 2))
    return canvas


def fit(im, longest):
    w, h = im.size
    k = min(1.0, longest / max(w, h))
    return im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS) if k < 1 else im


def save(im, path, opaque):
    if opaque:
        im.convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)
    else:
        im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(path, optimize=True)


def prepare(game):
    folder = os.path.join(ROOT, game, "public", "sprites")
    originals = os.path.join(ROOT, game, "art-originals")
    if not os.path.isdir(folder):
        return 0, 0
    os.makedirs(originals, exist_ok=True)
    ledger_path = os.path.join(originals, "prepared.json")
    ledger = json.load(open(ledger_path)) if os.path.exists(ledger_path) else {}
    digest = lambda f: hashlib.sha1(open(f, "rb").read()).hexdigest()
    before = after = 0
    for file in sorted(os.listdir(folder)):
        if not file.lower().endswith(".png"):
            continue
        path, keep = os.path.join(folder, file), os.path.join(originals, file)
        # Anything in public/ that isn't our own last output is new art: keep it as the original.
        if not os.path.exists(keep) or ledger.get(file) != digest(path):
            shutil.copy2(path, keep)
        name = file[:-4]
        im = Image.open(keep).convert("RGBA")
        before += os.path.getsize(keep)
        opaque = name.startswith("tile_") or bool(BACKDROP.match(name))
        if ROUND.match(name):
            im = square(trim(im, pad=0.02))
        elif PADDLE.match(name):
            im = trim(im, pad=0.01)
        elif STORM.match(name):
            im = im.resize((960, 540), Image.LANCZOS)
        im = fit(im, target_size(name))
        save(im, path, opaque)
        ledger[file] = digest(path)
        after += os.path.getsize(path)
    json.dump(ledger, open(ledger_path, "w"), indent=1, sort_keys=True)
    return before, after


def main():
    total_before = total_after = 0
    for game in GAMES:
        b, a = prepare(game)
        total_before += b
        total_after += a
        if b:
            print(f"{game:18s} {b / 1e6:6.1f} MB -> {a / 1e6:5.2f} MB")
    print(f"{'total':18s} {total_before / 1e6:6.1f} MB -> {total_after / 1e6:5.2f} MB")


if __name__ == "__main__":
    sys.exit(main())

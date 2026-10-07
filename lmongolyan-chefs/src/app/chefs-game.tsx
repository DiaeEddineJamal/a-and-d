"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { KITCHEN, LAYOUT, RECIPES, createBot, createKitchen, interact, moveChef, starsFor, stepBot, targetIndex, tickKitchen } from "../game/kitchen-core.mjs";
import { useDuoRoom } from "../game/duo-room";
import { DifficultyPicker, DuoLobby, ModeSwitch, type Difficulty, type PlayMode } from "../game/duo-lobby";
import { createSpriteBank, drawFx, spawnFx, type Fx, type SpriteBank } from "../game/sprite-bank";
import { applyView, screenDirToBoard, screenSize, themeFont, uprightOverlay, uprightText, usePortrait, type BoardView } from "../game/board-view";

type Kitchen = ReturnType<typeof createKitchen>;
type Item = string | { plate: string[] } | null;
type Packed = {
  t: number; tiles: [number, Item, number][]; chefs: [number, number, number, number, Item, number][];
  orders: [number, string, number, number][]; score: number; served: number; missed: number; timeLeft: number;
  over: boolean; msg: string | null; msgId: number; difficulty: Difficulty;
};
type Ticket = { id: number; recipe: keyof typeof RECIPES; left: number; total: number };

const { T, COLS, ROWS, W, H } = KITCHEN;
const SEAT_NAMES: [string, string] = ["TEAL CHEF", "BRICK CHEF"];
/** The CPU helper keeps up with the kitchen: steady on Easy and Normal, sharp on Hard. */
const HELPER: Record<Difficulty, "normal" | "hard"> = { easy: "normal", normal: "normal", hard: "hard" };
const LABEL: Record<string, string> = {
  tomato_chopped: "tomato", lettuce_chopped: "lettuce", bread: "bun", meat_cooked: "patty",
};
const TILE_SPRITE: Record<string, string> = { ".": "tile_floor", "#": "tile_counter", C: "tile_board", S: "tile_stove", T: "tile_crate", L: "tile_crate", B: "tile_crate", M: "tile_crate", P: "tile_counter", W: "tile_pass", X: "tile_bin" };

// --- Drawing ---------------------------------------------------------------
// Everything is drawn in code so the game works with no image files. Drop PNGs
// named as in docs/ASSET_PROMPTS.md into /public/sprites and they replace the drawn art.

function drawFood(ctx: CanvasRenderingContext2D, item: string, x: number, y: number, s: number, img?: CanvasImageSource) {
  if (img) { ctx.drawImage(img, x - s / 2, y - s / 2, s, s); return; }
  const r = s / 2;
  ctx.save(); ctx.translate(x, y);
  const blob = (color: string, rx: number, ry: number, ox = 0, oy = 0) => { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
  switch (item) {
    case "tomato": blob("#c9452f", r * 0.78, r * 0.72); blob("#e0684f", r * 0.3, r * 0.22, -r * 0.25, -r * 0.2); blob("#4f7f38", r * 0.3, r * 0.14, 0, -r * 0.66); break;
    case "tomato_chopped": for (const [ox, oy] of [[-0.35, 0.1], [0.3, -0.15], [0.1, 0.4]]) { blob("#c9452f", r * 0.36, r * 0.3, ox * r, oy * r); blob("#f0a07a", r * 0.2, r * 0.15, ox * r, oy * r); } break;
    case "lettuce": blob("#4d8a3a", r * 0.8, r * 0.7); blob("#78b35a", r * 0.55, r * 0.46, 0, -r * 0.05); ctx.strokeStyle = "#cfe6a8"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, r * 0.5); ctx.lineTo(0, -r * 0.45); ctx.stroke(); break;
    case "lettuce_chopped": for (const [ox, oy] of [[-0.4, 0], [0.35, -0.2], [0, 0.35], [0.2, 0.15], [-0.15, -0.35]]) blob("#6aa84c", r * 0.28, r * 0.13, ox * r, oy * r); break;
    case "bread": blob("#b8793a", r * 0.85, r * 0.42, 0, r * 0.2); blob("#dca25a", r * 0.8, r * 0.52, 0, -r * 0.05); for (const [ox, oy] of [[-0.3, -0.2], [0.2, -0.3], [0.4, 0], [-0.05, 0]]) blob("#f6e3b8", r * 0.07, r * 0.045, ox * r, oy * r); break;
    case "meat": blob("#c9707a", r * 0.8, r * 0.55); blob("#e19aa0", r * 0.5, r * 0.3, -r * 0.1, -r * 0.1); break;
    case "meat_cooked": blob("#6e3f26", r * 0.8, r * 0.55); ctx.strokeStyle = "#3d2215"; ctx.lineWidth = 3; for (const ox of [-0.35, 0, 0.35]) { ctx.beginPath(); ctx.moveTo(ox * r - 6, -r * 0.3); ctx.lineTo(ox * r + 6, r * 0.3); ctx.stroke(); } break;
    case "meat_burnt": blob("#241d1a", r * 0.8, r * 0.55); blob("rgba(200,200,190,.35)", r * 0.35, r * 0.25, r * 0.2, -r * 0.8); break;
    default: blob("#999", r * 0.5, r * 0.5);
  }
  ctx.restore();
}

function drawItem(ctx: CanvasRenderingContext2D, item: Item, x: number, y: number, s: number, sprites: SpriteBank) {
  if (!item) return;
  if (typeof item === "string") { drawFood(ctx, item, x, y, s, sprites.get(item)); return; }
  const plate = sprites.get("plate");
  if (plate) ctx.drawImage(plate, x - s * 0.6, y - s * 0.6, s * 1.2, s * 1.2);
  else {
    ctx.fillStyle = "#cbbd9c"; ctx.beginPath(); ctx.ellipse(x, y + 2, s * 0.62, s * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f4ecd8"; ctx.beginPath(); ctx.ellipse(x, y, s * 0.58, s * 0.46, 0, 0, Math.PI * 2); ctx.fill();
  }
  const order = ["bread", "meat_cooked", "lettuce_chopped", "tomato_chopped"];
  item.plate.slice().sort((a: string, b: string) => order.indexOf(a) - order.indexOf(b)).forEach((food: string, i: number, all: string[]) => {
    const spread = all.length > 1 ? (i - (all.length - 1) / 2) * s * 0.2 : 0;
    drawFood(ctx, food, x + spread, y - i * 3, s * 0.62, sprites.get(food));
  });
}

function paintKitchen(ctx: CanvasRenderingContext2D, sprites: SpriteBank) {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const x = c * T, y = r * T, ch = LAYOUT[r][c];
    const art = sprites.get(TILE_SPRITE[ch]);
    if (art) { ctx.drawImage(art, x, y, T, T); continue; }
    if (ch === ".") {
      ctx.fillStyle = (r + c) % 2 ? "#e6d8b7" : "#dccaa3"; ctx.fillRect(x, y, T, T);
      continue;
    }
    // Counter body, then a lighter worktop inset
    ctx.fillStyle = "#6b4d31"; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = "#9c7449"; ctx.fillRect(x + 3, y + 3, T - 6, T - 10);
    if (ch === "C") { ctx.fillStyle = "#e0c291"; ctx.fillRect(x + 8, y + 9, T - 16, T - 22); ctx.strokeStyle = "#b8955f"; ctx.lineWidth = 2; ctx.strokeRect(x + 8, y + 9, T - 16, T - 22); }
    if (ch === "S") {
      ctx.fillStyle = "#2b2724"; ctx.fillRect(x + 4, y + 4, T - 8, T - 12);
      ctx.strokeStyle = "#5b5550"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2 - 3, 18, 0, Math.PI * 2); ctx.stroke();
    }
    if ("TLBM".includes(ch)) {
      ctx.fillStyle = "#b08352"; ctx.fillRect(x + 6, y + 6, T - 12, T - 16);
      ctx.strokeStyle = "#7d5a35"; ctx.lineWidth = 2;
      for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 6, y + 6 + i * (T - 16) / 3); ctx.lineTo(x + T - 6, y + 6 + i * (T - 16) / 3); ctx.stroke(); }
    }
    if (ch === "W") {
      ctx.fillStyle = "#a44f39"; ctx.fillRect(x + 3, y + 3, T - 6, T - 10);
      ctx.fillStyle = "#f2e8ca"; ctx.font = `600 11px ${themeFont("mono")}`; ctx.textAlign = "center"; ctx.fillText("PASS", x + T / 2, y + T - 16);
      ctx.fillStyle = "#c3973a"; ctx.beginPath(); ctx.arc(x + T / 2, y + 24, 10, Math.PI, 0); ctx.fill(); ctx.fillRect(x + T / 2 - 13, y + 24, 26, 3);
    }
    if (ch === "X") { ctx.fillStyle = "#3b3a37"; ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2 - 3, 20, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#1d1c1a"; ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2 - 3, 14, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "rgba(32,27,22,.35)"; ctx.fillRect(x, y + T - 7, T, 7);
  }
}

type Net = { hasSnap: boolean; partner: { x: number; y: number }; lastSend: number; lastSent: string; chopping: boolean };

/** Copies a server snapshot into the local kitchen, leaving our own chef where we walked it. */
function applyPacked(k: Kitchen, n: Net, p: Packed, mine: number) {
  for (const tile of k.tiles) { tile.item = null; tile.progress = 0; }
  for (const [i, item, progress] of p.tiles) { k.tiles[i].item = item; k.tiles[i].progress = progress; }
  p.chefs.forEach(([x, y, fx, fy, holding, chopping], i) => {
    const chef = k.chefs[i];
    chef.holding = holding; chef.chopping = !!chopping;
    if (i === mine) {
      if (!n.hasSnap) { chef.x = x; chef.y = y; chef.fx = fx; chef.fy = fy; }
      return;
    }
    n.partner = { x, y }; chef.fx = fx; chef.fy = fy;
    if (!n.hasSnap) { chef.x = x; chef.y = y; }
  });
  k.orders = p.orders.map(([id, recipe, timeLeft, total]) => ({ id, recipe, timeLeft, total }));
  k.score = p.score; k.served = p.served; k.missed = p.missed; k.timeLeft = p.timeLeft; k.over = p.over;
  k.msg = p.msg ? { text: p.msg, ttl: 1 } : null;
  n.hasSnap = true;
}

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Keeps a finger's events on this element; harmless if the browser refuses. */
const capture = (el: Element, id: number) => { try { el.setPointerCapture(id); } catch { /* not a live pointer */ } };

export function ChefsGame({ sprites: files }: { sprites: string[] }) {
  // State, not a ref: the drawing loop restarts whenever the canvas element is replaced.
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [mode, setModeState] = useState<PlayMode>("cpu");
  const [difficulty, setDifficultyState] = useState<Difficulty>("normal");
  const [running, setRunning] = useState(false);
  // Pause (offline) or an open menu (online) brings back the controls that a
  // phone hides while you cook.
  const [paused, setPausedState] = useState(false);
  const pausedRef = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState({ score: 0, served: 0, missed: 0, time: KITCHEN.roundTime, msg: "", over: false, tickets: [] as Ticket[] });
  const modeRef = useRef<PlayMode>("cpu");
  const runningRef = useRef(false);
  const kitchen = useRef<Kitchen>(createKitchen("normal"));
  const bot = useRef(createBot("normal"));
  const keys = useRef(new Set<string>());
  // Touch input per chef: a floating thumbstick direction and a held CHOP button.
  const sticks = useRef([{ x: 0, y: 0 }, { x: 0, y: 0 }]);
  const touchChop = useRef([false, false]);
  const stickGhosts = useRef<(HTMLDivElement | null)[]>([null, null]);
  const stickPointers = useRef(new Map<number, { seat: number; ox: number; oy: number }>());
  // On a phone held upright the kitchen stands up to fill the screen.
  const portrait = usePortrait();
  const boardView = useRef<BoardView>({ portrait: false, bottom: "left", W, H });
  useEffect(() => { boardView.current = { portrait, bottom: "left", W, H }; }, [portrait]);
  const [sprites] = useState(() => createSpriteBank(files));
  const [recipeArt] = useState(() => new Set(files.map((f) => f.replace(/\.png$/i, ""))));
  const net = useRef<Net>({ hasSnap: false, partner: { x: 0, y: 0 }, lastSend: 0, lastSent: "", chopping: false });

  const newShift = useCallback((d: Difficulty) => {
    kitchen.current = createKitchen(d);
    bot.current = createBot(HELPER[d]);
    keys.current.clear();
  }, []);

  const room = useDuoRoom("chefs", {
    onStart: () => { net.current = { ...net.current, hasSnap: false }; kitchen.current = createKitchen("normal"); },
    onSnapshot: (p: Packed) => applyPacked(kitchen.current, net.current, p, roomRef.current.seatRef.current ?? 0),
  });
  const roomRef = useRef(room);
  useEffect(() => { roomRef.current = room; });

  const setMode = (next: PlayMode) => {
    if (next === modeRef.current) return;
    if (modeRef.current === "online") room.leave();
    modeRef.current = next; setModeState(next);
    runningRef.current = false; setRunning(false); pausedRef.current = false; setPausedState(false); setMenuOpen(false);
    newShift(difficulty);
    if (next === "online") room.open();
  };
  const setDifficulty = (d: Difficulty) => { setDifficultyState(d); if (!runningRef.current) newShift(d); };
  const startShift = () => { newShift(difficulty); runningRef.current = true; setRunning(true); pausedRef.current = false; setPausedState(false); };
  const togglePause = useCallback(() => {
    if (modeRef.current === "online") { setMenuOpen((open) => !open); return; }
    if (!runningRef.current) return;
    pausedRef.current = !pausedRef.current;
    setPausedState(pausedRef.current);
  }, []);

  useEffect(() => {
    if (!room.resuming) return;
    const t = window.setTimeout(() => { modeRef.current = "online"; setModeState("online"); }, 0);
    return () => window.clearTimeout(t);
  }, [room.resuming]);

  // --- Input ---------------------------------------------------------------
  const holdChop = useCallback((seat: number, on: boolean) => { touchChop.current[seat] = on; }, []);
  const analogPointers = useRef(new Map<number, number>());
  /**
   * The on-screen analog stick. Push distance sets walking speed; the knob
   * follows the thumb. A stick turned upside down for the player across the
   * table still follows their thumb, because its knob offset is flipped back.
   */
  const analogMove = useCallback((seat: number, flipped: boolean, el: HTMLElement, clientX: number, clientY: number, id: number, start: boolean) => {
    if (!start && analogPointers.current.get(id) !== seat) return;
    analogPointers.current.set(id, seat);
    const r = el.getBoundingClientRect(), reach = r.width * 0.32;
    let dx = clientX - (r.left + r.width / 2), dy = clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > reach) { dx *= reach / len; dy *= reach / len; }
    const knob = el.firstElementChild as HTMLElement | null;
    if (knob) { knob.style.transition = "none"; knob.style.transform = `translate(${flipped ? -dx : dx}px, ${flipped ? -dy : dy}px)`; }
    el.dataset.on = "true";
    sticks.current[seat] = len < reach * 0.18 ? { x: 0, y: 0 } : screenDirToBoard(boardView.current, dx / reach, dy / reach);
  }, []);
  const analogEnd = useCallback((seat: number, el: HTMLElement, id: number) => {
    if (analogPointers.current.get(id) !== seat) return;
    analogPointers.current.delete(id);
    sticks.current[seat] = { x: 0, y: 0 };
    const knob = el.firstElementChild as HTMLElement | null;
    if (knob) { knob.style.transition = ""; knob.style.transform = ""; }
    el.dataset.on = "false";
  }, []);
  const act = useCallback((seat: number) => {
    const k = kitchen.current;
    if (modeRef.current === "online") {
      const me = k.chefs[seat];
      roomRef.current.emit("chefs:act", { at: [Math.round(me.x), Math.round(me.y), me.fx, me.fy] });
    } else if (runningRef.current) interact(k, seat);
  }, []);

  useEffect(() => {
    const code = (e: KeyboardEvent) => (e.key.length === 1 ? e.key.toLowerCase() : e.key === "Shift" ? e.code : e.key);
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
      const key = code(e);
      if (["w", "a", "s", "d", "e", "q", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", ".", "/"].includes(key)) e.preventDefault();
      if (e.repeat) return;
      keys.current.add(key);
      const solo = modeRef.current !== "local";
      const mine = modeRef.current === "online" ? roomRef.current.seatRef.current ?? 0 : 0;
      if (key === "p" || key === "Escape") togglePause();
      else if (key === "e" || (solo && (key === " " || key === "Enter"))) act(mine);
      else if (!solo && (key === "Enter" || key === ".")) act(1);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(code(e));
    const release = () => { keys.current.clear(); sticks.current = [{ x: 0, y: 0 }, { x: 0, y: 0 }]; touchChop.current = [false, false]; };
    const hidden = () => { if (document.hidden) release(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", hidden);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", release); document.removeEventListener("visibilitychange", hidden); };
  }, [act, togglePause]);

  // --- Loop ------------------------------------------------------------------
  const showBoard = mode !== "online" || room.phase === "playing";
  useEffect(() => {
    const canvas = canvasEl;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const floor = document.createElement("canvas");
    floor.width = W * dpr; floor.height = H * dpr;
    const fc = floor.getContext("2d")!; fc.scale(dpr, dpr);
    // Repainted whenever an optional tile image finishes loading.
    let painted = -1;
    const paintFloor = () => { if (painted === sprites.version()) return; painted = sprites.version(); fc.clearRect(0, 0, W, H); paintKitchen(fc, sprites); };
    const fx: Fx[] = [];
    const lastPos = [{ x: 0, y: 0, moving: 0 }, { x: 0, y: 0, moving: 0 }];
    let lastScore = 0;
    const room = roomRef.current;
    let raf = 0, last = performance.now(), lastView = 0;

    const axis = (up: string, down: string, left: string, right: string) => {
      const k = keys.current;
      return { x: (k.has(right) ? 1 : 0) - (k.has(left) ? 1 : 0), y: (k.has(down) ? 1 : 0) - (k.has(up) ? 1 : 0) };
    };
    const inputFor = (seat: number, solo: boolean) => {
      const a = solo ? axis("w", "s", "a", "d") : seat === 0 ? axis("w", "s", "a", "d") : axis("ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight");
      if (solo) { const b = axis("ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"); a.x += b.x; a.y += b.y; }
      a.x += sticks.current[seat].x; a.y += sticks.current[seat].y;
      const k = keys.current, held = touchChop.current[seat];
      const chop = solo
        ? k.has("q") || k.has("f") || k.has("ShiftLeft") || k.has("ShiftRight") || k.has("/") || held
        : seat === 0 ? k.has("q") || held : k.has("ShiftRight") || k.has("/") || held;
      return { x: Math.max(-1, Math.min(1, a.x)), y: Math.max(-1, Math.min(1, a.y)), chop };
    };

    const drawChef = (chef: Kitchen["chefs"][number], seat: number, tag: string | null) => {
      const { x, y, fx, fy } = chef;
      ctx.fillStyle = "rgba(32,27,22,.28)"; ctx.beginPath(); ctx.ellipse(x + 3, y + 16, 22, 9, 0, 0, Math.PI * 2); ctx.fill();
      // Frames: chop while chopping, carry or walk while moving, idle otherwise.
      const base = seat === 0 ? "chef_teal" : "chef_brick", t = performance.now() / 1000;
      const lp = lastPos[seat], moved = Math.hypot(x - lp.x, y - lp.y) > 0.4;
      lp.moving = moved ? 0.12 : Math.max(0, lp.moving - 1 / 60); lp.x = x; lp.y = y;
      const walking = lp.moving > 0;
      const art = (chef.chopping && sprites.loop(`${base}_chop`, t, 10))
        || (walking && chef.holding && sprites.loop(`${base}_carry`, t, 8))
        || (walking && sprites.loop(`${base}_walk`, t, 8))
        || (chef.holding && sprites.frames(`${base}_carry`)[0])
        || sprites.loop(`${base}_idle`, t, 2)
        || sprites.get(base);
      if (art) {
        // Chef art is drawn facing down; turn it toward where the chef faces.
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(fy, fx) - Math.PI / 2); ctx.drawImage(art, -30, -30, 60, 60); ctx.restore();
        if (chef.holding) drawItem(ctx, chef.holding as Item, x + fx * 24, y + fy * 22 - 4, 30, sprites);
        if (tag) uprightText(ctx, boardView.current, dpr, tag, x, y, `600 12px ${themeFont("mono")}`, "#201b16");
        return;
      }
      ctx.fillStyle = seat === 0 ? "#567b78" : "#a44f39"; ctx.beginPath(); ctx.arc(x, y + 2, 21, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f2e8ca"; ctx.beginPath(); ctx.arc(x, y + 5, 13, 0, Math.PI * 2); ctx.fill();
      // Hat: a puffed cap that leans the way the chef faces
      ctx.fillStyle = "#fbf6ea"; ctx.beginPath(); ctx.arc(x + fx * 3, y - 14 + fy * 2, 12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x - 8 + fx * 3, y - 10 + fy * 2, 8, 0, Math.PI * 2); ctx.arc(x + 8 + fx * 3, y - 10 + fy * 2, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#201b16";
      for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(x + fx * 7 + (fy !== 0 ? side * 5 : 0), y + 3 + fy * 5 + (fx !== 0 ? side * 4 : 0), 2.2, 0, Math.PI * 2); ctx.fill(); }
      if (chef.holding) drawItem(ctx, chef.holding as Item, x + fx * 22, y + fy * 20 - 4, 30, sprites);
      if (chef.chopping) { ctx.strokeStyle = "#f2e8ca"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + fx * 28 - 6, y + fy * 28 - 8); ctx.lineTo(x + fx * 28 + 6, y + fy * 28 + 2); ctx.stroke(); }
      if (tag) uprightText(ctx, boardView.current, dpr, tag, x, y, `600 12px ${themeFont("mono")}`, "#201b16");
    };

    const draw = (overlay: string | null, you: number | null) => {
      const k = kitchen.current;
      const v = boardView.current, size = screenSize(v);
      const cw = Math.round(size.w * dpr), ch = Math.round(size.h * dpr);
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      applyView(ctx, v, dpr);
      paintFloor();
      ctx.drawImage(floor, 0, 0, W, H);
      k.tiles.forEach((tile, i) => {
        const x = (i % COLS) * T, y = Math.floor(i / COLS) * T;
        if (tile.type === "crate" && tile.ing) drawFood(ctx, tile.ing, x + T / 2, y + T / 2 - 4, 34, sprites.get(tile.ing));
        if (tile.type === "plates") for (let s = 0; s < 3; s++) drawItem(ctx, { plate: [] }, x + T / 2, y + T / 2 - s * 4, 34, sprites);
        if (tile.type === "stove" && tile.item === "meat") { ctx.fillStyle = `rgba(230,120,40,${0.35 + Math.sin(performance.now() / 120) * 0.1})`; ctx.beginPath(); ctx.arc(x + T / 2, y + T / 2 - 3, 22, 0, Math.PI * 2); ctx.fill(); }
        const cut = tile.type === "board" && (tile.item === "tomato" || tile.item === "lettuce") && tile.progress >= 0.5 ? sprites.get(`${tile.item}_cut`) : undefined;
        if (cut) ctx.drawImage(cut, x + T / 2 - 19, y + T / 2 - 23, 38, 38);
        else if (tile.item) drawItem(ctx, tile.item as Item, x + T / 2, y + T / 2 - 4, 38, sprites);
        const now = performance.now() / 1000;
        if (tile.type === "stove" && (tile.item === "meat" || tile.item === "meat_cooked")) {
          const sizzle = sprites.loop("fx_sizzle", now, 10);
          if (sizzle) ctx.drawImage(sizzle, x + 4, y - 4, T - 8, T - 8);
          else for (let d = 0; d < 4; d++) {
            const phase = (now * 2.2 + d * 0.27 + i) % 1;
            ctx.fillStyle = `rgba(242,232,202,${1 - phase})`;
            ctx.beginPath(); ctx.arc(x + 18 + ((d * 37 + i * 13) % 30), y + 30 - phase * 16, 2.2, 0, Math.PI * 2); ctx.fill();
          }
        }
        if (tile.type === "stove" && ((tile.item === "meat_cooked" && tile.progress > 0.45) || tile.item === "meat_burnt")) {
          const smoke = sprites.loop("fx_smoke", now, 6);
          if (smoke) ctx.drawImage(smoke, x, y - T * 0.6, T, T);
          else for (let d = 0; d < 3; d++) {
            const phase = (now * 0.8 + d / 3) % 1;
            ctx.fillStyle = `rgba(90,86,80,${0.45 * (1 - phase)})`;
            ctx.beginPath(); ctx.arc(x + T / 2 + Math.sin(now * 2 + d) * 6, y + 20 - phase * 40, 7 + phase * 10, 0, Math.PI * 2); ctx.fill();
          }
        }
        if (tile.type === "board" && (tile.item === "tomato" || tile.item === "lettuce") && k.chefs.some((c, ci) => c.chopping && targetIndex(k, ci) === i)) {
          const chop = sprites.loop("fx_chop", now, 12);
          if (chop) ctx.drawImage(chop, x + 4, y - 2, T - 8, T - 8);
          else {
            ctx.fillStyle = tile.item === "tomato" ? "#e0684f" : "#8cc46a";
            for (let d = 0; d < 3; d++) { const a = now * 9 + d * 2.1; ctx.fillRect(x + T / 2 + Math.cos(a) * 16, y + T / 2 - 6 + Math.sin(a * 1.3) * 10, 4, 3); }
          }
        }
        if (tile.progress > 0) {
          const burning = tile.type === "stove" && tile.item === "meat_cooked";
          if (burning && tile.progress < 0.45) return;
          ctx.fillStyle = "#201b16"; ctx.fillRect(x + 6, y - 8, T - 12, 11);
          ctx.fillStyle = burning ? (Math.floor(performance.now() / 180) % 2 ? "#e0533a" : "#f2e8ca") : tile.type === "stove" ? "#e08a3a" : "#7fb35a";
          ctx.fillRect(x + 8, y - 6, (T - 16) * Math.min(1, tile.progress), 7);
        }
      });
      const seats = modeRef.current === "local" ? [0, 1] : you !== null ? [you] : [];
      for (const s of seats) {
        const idx = targetIndex(k, s);
        if (idx < 0) continue;
        ctx.strokeStyle = s === 0 ? "rgba(86,123,120,.9)" : "rgba(164,79,57,.9)"; ctx.lineWidth = 3;
        ctx.strokeRect((idx % COLS) * T + 2, Math.floor(idx / COLS) * T + 2, T - 4, T - 10);
      }
      if (k.score > lastScore) {
        // A served plate: burst over whichever pass is closest to a chef.
        let best = 0, bestD = Infinity;
        k.tiles.forEach((t, ti) => {
          if (t.type !== "window") return;
          for (const c of k.chefs) {
            const d = Math.hypot((ti % COLS + 0.5) * T - c.x, (Math.floor(ti / COLS) + 0.5) * T - c.y);
            if (d < bestD) { bestD = d; best = ti; }
          }
        });
        spawnFx(fx, { name: "fx_serve", kind: "burst", x: (best % COLS + 0.5) * T, y: (Math.floor(best / COLS) + 0.5) * T, size: 120, color: "#c3973a", life: 0.7 }, performance.now());
      }
      lastScore = k.score;
      const early = k.elapsed < 4 || !runningRef.current;
      k.chefs.forEach((chef, i) => drawChef(chef, i, early ? (modeRef.current === "cpu" ? (i === 0 ? "YOU" : "CPU") : modeRef.current === "online" ? (i === you ? "YOU" : null) : SEAT_NAMES[i].split(" ")[0]) : null));
      drawFx(ctx, sprites, fx, performance.now());
      if (overlay) uprightOverlay(ctx, v, dpr, overlay.split("\n"));
    };

    const publish = (now: number) => {
      if (now - lastView < 200) return;
      lastView = now;
      const k = kitchen.current;
      setView({ score: k.score, served: k.served, missed: k.missed, time: k.timeLeft, msg: k.msg?.text ?? "", over: k.over,
        tickets: k.orders.map((o: { id: number; recipe: string; timeLeft: number; total: number }) => ({ id: o.id, recipe: o.recipe as Ticket["recipe"], left: o.timeLeft, total: o.total })) });
    };

    const frame = (now: number) => {
      // rAF timestamps can land a hair before `last` on the first frame.
      const dt = Math.max(0, Math.min((now - last) / 1000, 0.05)); last = now;
      const k = kitchen.current, m = modeRef.current;
      let overlay: string | null = null, you: number | null = null;
      if (m === "online") {
        const n = net.current, mine = room.seatRef.current ?? 0, status = room.statusRef.current;
        you = mine;
        if (n.hasSnap && status === "ok" && !k.over) {
          const input = inputFor(mine, true);
          moveChef(k, mine, input.x, input.y, dt);
          if (input.chop !== n.chopping) { n.chopping = input.chop; room.emit("chefs:chop", input.chop); }
          const me = k.chefs[mine], packet = `${Math.round(me.x)},${Math.round(me.y)},${me.fx},${me.fy}`;
          if ((packet !== n.lastSent && now - n.lastSend > 45) || now - n.lastSend > 300) {
            room.emit("chefs:move", [Math.round(me.x), Math.round(me.y), me.fx, me.fy], true);
            n.lastSend = now; n.lastSent = packet;
          }
          const partner = k.chefs[1 - mine], blend = 1 - Math.exp(-dt * 14);
          partner.x += (n.partner.x - partner.x) * blend; partner.y += (n.partner.y - partner.y) * blend;
        }
        overlay = status === "reconnecting" ? "RECONNECTING…" : status === "partner-away" ? "WAITING FOR PARTNER" : null;
      } else if (runningRef.current && pausedRef.current && !k.over) {
        overlay = "PAUSED\nTap Ⅱ to keep cooking";
      } else if (runningRef.current && !k.over) {
        const solo = m === "cpu";
        const p0 = inputFor(0, solo);
        moveChef(k, 0, p0.x, p0.y, dt); k.chefs[0].chopping = p0.chop;
        if (solo) stepBot(k, 1, bot.current, dt);
        else { const p1 = inputFor(1, false); moveChef(k, 1, p1.x, p1.y, dt); k.chefs[1].chopping = p1.chop; }
        tickKitchen(k, dt);
        you = 0;
      } else if (!runningRef.current) overlay = "READY FOR SERVICE?\nPress START SHIFT";
      if (k.over) overlay = `SERVICE OVER  ${"★".repeat(starsFor(k.score))}${"☆".repeat(3 - starsFor(k.score))}\n${k.score} points · ${k.served} served · ${k.missed} missed`;
      draw(overlay, you);
      publish(now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [canvasEl, sprites]);

  // --- Touch controls -----------------------------------------------------------
  // Put a thumb anywhere on the kitchen and slide: a stick appears under it and the
  // chef walks that way on screen. With two chefs on one phone, each player owns
  // the half of the board nearest them (the bottom or left half is the teal chef).
  const mySeat = mode === "online" ? room.seat ?? 0 : 0;
  const STICK_R = 46;
  const seatForTouch = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (mode !== "local") return mySeat;
    const r = e.currentTarget.getBoundingClientRect();
    return portrait ? (e.clientY < r.top + r.height / 2 ? 1 : 0) : (e.clientX < r.left + r.width / 2 ? 0 : 1);
  };
  const placeGhost = (seat: number, ox: number, oy: number, kx: number, ky: number) => {
    const ghost = stickGhosts.current[seat], wrap = ghost?.parentElement;
    if (!ghost || !wrap) return;
    const w = wrap.getBoundingClientRect();
    ghost.style.transform = `translate(${ox - w.left}px, ${oy - w.top}px)`;
    ghost.style.setProperty("--kx", `${kx}px`); ghost.style.setProperty("--ky", `${ky}px`);
    ghost.dataset.on = "true";
  };
  const boardTouch = {
    onPointerDown: (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (e.pointerType === "mouse") return;
      const seat = seatForTouch(e);
      capture(e.currentTarget, e.pointerId);
      stickPointers.current.set(e.pointerId, { seat, ox: e.clientX, oy: e.clientY });
      placeGhost(seat, e.clientX, e.clientY, 0, 0);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const sp = stickPointers.current.get(e.pointerId);
      if (!sp) return;
      let dx = e.clientX - sp.ox, dy = e.clientY - sp.oy;
      const len = Math.hypot(dx, dy);
      if (len > STICK_R) { dx *= STICK_R / len; dy *= STICK_R / len; }
      const dead = len < 8;
      const dir = dead ? { x: 0, y: 0 } : screenDirToBoard(boardView.current, dx / STICK_R, dy / STICK_R);
      sticks.current[sp.seat] = dir;
      placeGhost(sp.seat, sp.ox, sp.oy, dx, dy);
    },
    onPointerUp: (e: ReactPointerEvent<HTMLCanvasElement>) => endTouch(e.pointerId),
    onPointerCancel: (e: ReactPointerEvent<HTMLCanvasElement>) => endTouch(e.pointerId),
  };
  function endTouch(id: number) {
    const sp = stickPointers.current.get(id);
    if (!sp) return;
    stickPointers.current.delete(id);
    sticks.current[sp.seat] = { x: 0, y: 0 };
    const ghost = stickGhosts.current[sp.seat];
    if (ghost) ghost.dataset.on = "false";
  }
  const chopProps = (seat: number) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => { e.preventDefault(); capture(e.currentTarget, e.pointerId); holdChop(seat, true); },
    onPointerUp: () => holdChop(seat, false),
    onPointerCancel: () => holdChop(seat, false),
    onLostPointerCapture: () => holdChop(seat, false),
  });
  const analog = (seat: number, flipped: boolean) => (
    <div
      key="stick"
      className={`analog analog--${seat === 0 ? "teal" : "brick"}`}
      aria-hidden="true"
      onPointerDown={(e) => { e.preventDefault(); capture(e.currentTarget, e.pointerId); analogMove(seat, flipped, e.currentTarget, e.clientX, e.clientY, e.pointerId, true); }}
      onPointerMove={(e) => analogMove(seat, flipped, e.currentTarget, e.clientX, e.clientY, e.pointerId, false)}
      onPointerUp={(e) => analogEnd(seat, e.currentTarget, e.pointerId)}
      onPointerCancel={(e) => analogEnd(seat, e.currentTarget, e.pointerId)}
      onLostPointerCapture={(e) => analogEnd(seat, e.currentTarget, e.pointerId)}
    >
      <span className="analog-knob" />
    </div>
  );
  const chefButtons = (seat: number) => [
    seat === (mode === "local" ? 0 : mySeat) && <button key="menu" className="pad-btn pad-btn--small pad-btn--menu" aria-label={mode === "online" ? "Menu" : paused ? "Resume" : "Pause"} onClick={togglePause}>{mode !== "online" && paused ? "▶" : "Ⅱ"}</button>,
    <button key="grab" className="pad-btn pad-btn--word" onPointerDown={(e) => { e.preventDefault(); act(seat); }}>GRAB</button>,
    <button key="chop" className="pad-btn pad-btn--word pad-btn--chop" {...chopProps(seat)}>CHOP</button>,
  ];
  const chefSet = (key: string, seat: number, slot: "top" | "bottom" | "left" | "right", parts: React.ReactNode[], flipped = false) => (
    <div className={`pad-set pad-set--chef pad-set--${seat === 0 ? "teal" : "brick"}`} data-slot={slot} data-flipped={flipped} key={key}>{parts}</div>
  );
  // Portrait: stick bottom-left, buttons to its right. Landscape: stick under the
  // left thumb, buttons under the right one (each player owns a side in 2 chefs).
  const pads = portrait
    ? mode === "local"
      ? [chefSet("p1", 1, "top", [analog(1, true), ...chefButtons(1)], true), chefSet("p0", 0, "bottom", [analog(0, false), ...chefButtons(0)])]
      : [chefSet("me", mySeat, "bottom", [analog(mySeat, false), ...chefButtons(mySeat)])]
    : mode === "local"
      ? [chefSet("p0", 0, "left", [analog(0, false), ...chefButtons(0)]), chefSet("p1", 1, "right", [analog(1, false), ...chefButtons(1)])]
      : [chefSet("stick", mySeat, "left", [analog(mySeat, false)]), chefSet("buttons", mySeat, "right", chefButtons(mySeat))];
  const hint = mode === "local"
    ? "TEAL: WASD · E GRAB · HOLD Q CHOP   BRICK: ARROWS · ENTER GRAB · HOLD RIGHT SHIFT CHOP"
    : "MOVE: WASD / ARROWS · GRAB: E, SPACE OR ENTER · CHOP: HOLD Q OR SHIFT";
  const stars = starsFor(view.score);
  // On phones, a running shift hides the mode row and bottom bar so the kitchen gets the room.
  const focused = mode === "online" ? room.phase === "playing" && !view.over && !menuOpen : running && !paused && !view.over;
  const chrome = focused ? (mode === "local" ? "374px" : "264px") : (mode === "local" ? "470px" : "362px");
  const chromeLand = focused ? "100px" : "146px";

  return <>
    <section className={`game-shell${focused ? " is-playing" : ""}`}>
      <div className="scoreboard">
        <div className="score"><strong>{view.score}</strong><small>POINTS<br />{view.served} SERVED</small></div>
        <span className="round-status">{mode === "online" && room.phase === "playing" && room.ping ? `${fmtTime(view.time)} · ${room.ping} MS` : fmtTime(view.time)}<br />{view.msg || (running || mode === "online" ? "ORDERS UP" : "3 MINUTE SHIFT")}</span>
        <div className="score score-right"><small>STARS<br />{view.missed} MISSED</small><strong>{stars}/3</strong></div>
      </div>
      <div className="mode-row">
        <ModeSwitch mode={mode} onChange={setMode} labels={{ local: "2 CHEFS", cpu: "WITH CPU CHEF", online: "ONLINE" }} />
        {mode !== "online" && <DifficultyPicker value={difficulty} onChange={setDifficulty} label="PACE" />}
      </div>
      {showBoard
        ? <div className="board-wrap board-wrap--chefs" data-mode={mode} style={{ "--board-ratio": portrait ? H / W : W / H, "--chrome": chrome, "--chrome-land": chromeLand, "--rails": "17rem" } as React.CSSProperties}>
          <ol className="tickets" aria-label="Open orders">
            {view.tickets.length === 0 && <li className="ticket ticket-empty">No orders yet</li>}
            {view.tickets.map((t) => (
              <li className="ticket" key={t.id} data-urgent={t.left / t.total < 0.3}>
                {recipeArt.has(`recipe_${t.recipe}`) && <span className="ticket-icon" aria-hidden="true" style={{ backgroundImage: `url(/sprites/recipe_${t.recipe}.png)` }} />}
                <b>{RECIPES[t.recipe].name}</b>
                <span>{RECIPES[t.recipe].items.map((i) => LABEL[i]).join(" + ")}</span>
                <i style={{ transform: `scaleX(${Math.max(0, t.left / t.total)})` }} />
              </li>
            ))}
          </ol>
          <canvas className="game-canvas" ref={setCanvasEl} width={W} height={H} style={{ aspectRatio: portrait ? `${H} / ${W}` : `${W} / ${H}` }} aria-label="Lmongolyan Chefs kitchen" {...boardTouch} />
          {[0, 1].map((seat) => <div key={seat} className={`stick-ghost stick-ghost--${seat === 0 ? "teal" : "brick"}`} ref={(el) => { stickGhosts.current[seat] = el; }} aria-hidden="true"><span /></div>)}
          {pads}
        </div>
        : <DuoLobby room={room} seatNames={SEAT_NAMES} startExtra={<DifficultyPicker value={difficulty} onChange={setDifficulty} label="PACE" />} onStart={() => room.start({ difficulty })} />}
      <div className="game-bottom">
        <a className="mobile-back" href={process.env.NEXT_PUBLIC_ARCADE_URL ?? "http://localhost:3010"}>← ARCADE</a>
        <span className="control-hint">{hint}</span>
        {mode === "online"
          ? room.phase === "playing" && room.seat === 0 && view.over
            ? <button className="mode-button" onClick={() => room.start({ difficulty })}>↻ NEW SHIFT</button>
            : <button className="mode-button" onClick={() => room.leave()}>LEAVE ROOM</button>
          : <button className="mode-button" onClick={startShift}>{running ? "↻ RESTART SHIFT" : "▶ START SHIFT"}</button>}
      </div>
    </section>
    <section className="game-notes"><p>CHOP / TOMATO AND LETTUCE ON A BOARD.</p><p>COOK / PATTIES ON THE STOVE. DON’T LET THEM BURN.</p><p>PLATE IT / THEN HAND IT THROUGH THE PASS.</p></section>
  </>;
}

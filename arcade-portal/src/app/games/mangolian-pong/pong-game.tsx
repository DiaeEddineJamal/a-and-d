"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };
const W = 960, H = 540, PADDLE_H = 124, PADDLE_W = 25, PADDLE_SPEED = 440;

export function PongGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef({ left: H / 2 - PADDLE_H / 2, right: H / 2 - PADDLE_H / 2, ball: { x: W / 2, y: H / 2 } as Point, velocity: { x: 275, y: 132 } as Point, leftScore: 0, rightScore: 0, hits: 0, storm: 0, nextStorm: 12, paused: false });
  const keys = useRef<Set<string>>(new Set());
  const sprites = useRef<HTMLImageElement | null>(null);
  const [hud, setHud] = useState({ left: 0, right: 0, message: "FIRST TO 11", storm: "CALM" });

  const resetBall = useCallback((toLeft = Math.random() > .5) => { const s = state.current; s.ball = { x: W / 2, y: H / 2 }; s.velocity = { x: (toLeft ? -1 : 1) * (260 + Math.min(s.hits * 8, 170)), y: Math.random() * 180 - 90 }; s.hits = 0; }, []);
  const announce = useCallback((message: string, storm = state.current.storm > 0 ? "YURT STORM" : "CALM") => { const s = state.current; setHud({ left: s.leftScore, right: s.rightScore, message, storm }); }, []);

  useEffect(() => {
    const sprite = new Image(); sprite.src = "/mangolian-pong-sprites.png"; sprite.onload = () => { sprites.current = sprite; };
    const down = (event: KeyboardEvent) => { if (["w", "s", "ArrowUp", "ArrowDown", " "].includes(event.key)) event.preventDefault(); keys.current.add(event.key); if (event.key === " ") state.current.paused = !state.current.paused; };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key);
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    let animation = 0, last = performance.now(), elapsed = 0;
    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
    const score = (leftWon: boolean) => { const s = state.current; if (leftWon) s.leftScore++; else s.rightScore++; const won = (leftWon ? s.leftScore : s.rightScore) >= 11; announce(won ? `${leftWon ? "TURQUOISE" : "VERMILION"} WINS — NEW ROUND` : `${leftWon ? "TURQUOISE" : "VERMILION"} SCORES`); if (won) { s.leftScore = 0; s.rightScore = 0; } resetBall(!leftWon); };
    const drawSprite = (sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) => { if (sprites.current?.complete) ctx.drawImage(sprites.current, sx, sy, sw, sh, dx, dy, dw, dh); else { ctx.fillStyle = "#ffc234"; ctx.fillRect(dx, dy, dw, dh); } };
    const draw = () => { const s = state.current; ctx.fillStyle = "#092528"; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = s.storm ? "#ff6538" : "#19a6a5"; ctx.lineWidth = 3; ctx.setLineDash([7, 11]); ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]); for (let y = 42; y < H; y += 80) { ctx.fillStyle = "rgba(255,241,207,.14)"; ctx.fillRect(W / 2 - 3, y, 6, 40); } if (s.storm) { ctx.fillStyle = "rgba(255,101,56,.15)"; for (let x = 0; x < W; x += 45) ctx.fillRect(x + ((elapsed * 90) % 45), 0, 12, H); } drawSprite(145, 40, 235, 900, 24, s.left, PADDLE_W, PADDLE_H); drawSprite(1160, 40, 250, 900, W - 49, s.right, PADDLE_W, PADDLE_H); const glow = s.storm ? 34 : 20; ctx.fillStyle = s.storm ? "rgba(255,101,56,.38)" : "rgba(12,166,165,.32)"; ctx.beginPath(); ctx.arc(s.ball.x, s.ball.y, glow, 0, Math.PI * 2); ctx.fill(); drawSprite(600, 330, 320, 330, s.ball.x - 14, s.ball.y - 14, 28, 28); if (s.paused) { ctx.fillStyle = "rgba(9,37,40,.77)"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#fff1cf"; ctx.font = "48px Anton"; ctx.textAlign = "center"; ctx.fillText("PAUSED", W / 2, H / 2); } };
    const frame = (now: number) => { const dt = Math.min((now - last) / 1000, .032); last = now; elapsed += dt; const s = state.current; if (!s.paused) { const leftMove = (keys.current.has("w") ? -1 : 0) + (keys.current.has("s") ? 1 : 0), rightMove = (keys.current.has("ArrowUp") ? -1 : 0) + (keys.current.has("ArrowDown") ? 1 : 0); s.left = clamp(s.left + leftMove * PADDLE_SPEED * dt, 0, H - PADDLE_H); s.right = clamp(s.right + rightMove * PADDLE_SPEED * dt, 0, H - PADDLE_H); s.ball.x += s.velocity.x * dt; s.ball.y += s.velocity.y * dt; if (s.ball.y < 14 || s.ball.y > H - 14) { s.velocity.y *= -1; s.ball.y = clamp(s.ball.y, 14, H - 14); } const leftHit = s.velocity.x < 0 && s.ball.x - 14 < 49 && s.ball.x + 14 > 24 && s.ball.y > s.left && s.ball.y < s.left + PADDLE_H, rightHit = s.velocity.x > 0 && s.ball.x + 14 > W - 49 && s.ball.x - 14 < W - 24 && s.ball.y > s.right && s.ball.y < s.right + PADDLE_H; if (leftHit || rightHit) { const paddleY = leftHit ? s.left : s.right, relative = (s.ball.y - (paddleY + PADDLE_H / 2)) / (PADDLE_H / 2); s.velocity.x = (leftHit ? 1 : -1) * Math.min(Math.abs(s.velocity.x) + 21, 610); s.velocity.y += relative * 105; s.ball.x = leftHit ? 50 : W - 50; s.hits++; if (s.hits % 5 === 0) announce(`RALLY ×${s.hits} — BALL IS HOT`); } if (s.ball.x < -30) score(false); if (s.ball.x > W + 30) score(true); s.nextStorm -= dt; if (s.nextStorm <= 0) { s.storm = s.storm ? 0 : 5.5; s.nextStorm = s.storm ? 5.5 : 12; if (s.storm) { s.velocity.y *= 1.65; announce("YURT STORM — CURVES GO WILD", "YURT STORM"); } else announce("STORM PASSED"); } if (s.storm) { s.storm -= dt; s.velocity.y += Math.sin(elapsed * 6) * 2.8; } } draw(); animation = requestAnimationFrame(frame); };
    animation = requestAnimationFrame(frame); return () => cancelAnimationFrame(animation);
  }, [announce, resetBall]);
  const restart = () => { const s = state.current; s.leftScore = 0; s.rightScore = 0; s.storm = 0; s.nextStorm = 12; resetBall(); announce("FRESH MATCH — GO!"); };
  return <><section className="game-shell"><div className="scoreboard"><div className="score"><strong>{hud.left}</strong><small>TURQUOISE<br />W / S</small></div><span className="round-status">{hud.storm}<br />{hud.message}</span><div className="score score-right"><small>VERMILION<br />↑ / ↓</small><strong>{hud.right}</strong></div></div><canvas className="game-canvas" ref={canvasRef} width={W} height={H} aria-label="Mangolian Pong game board" /><div className="game-bottom"><span className="control-hint">FIRST TO 11 · SPACE = PAUSE · SHARE THE KEYBOARD</span><button className="mode-button" onClick={restart}>↻ NEW MATCH</button></div></section><section className="game-notes"><p>YURT STORM / EVERY 12 SECONDS THE WIND BENDS THE RALLY.</p><p>RALLY HEAT / EVERY 5 HITS THE BALL GETS FASTER.</p><p>COMING NEXT / ROOM CODES FOR REMOTE FRIENDS.</p></section></>;
}

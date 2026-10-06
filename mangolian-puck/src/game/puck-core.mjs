/**
 * Mangolian Puck: air hockey rules and physics.
 *
 * SHARED FILE. The server and the browser game run this exact module, so the
 * puck the server simulates and the puck each browser predicts behave the
 * same. Edit it here, in racing-game/server/games/, then run
 * `npm run sync:cores` from the repository root to copy it into the game.
 */

export const PUCK = {
  W: 960, H: 540,
  puckR: 22, malletR: 40,
  goalHalf: 92,
  maxSpeed: 1650,
  friction: 0.16,         // exponential slow-down per second; the air cushion
  restitution: 0.98,      // mallet hits stay elastic, so a glancing strike keeps its angle
  wallRestitution: 0.9,
  grip: 0.55,             // how much a sweeping mallet drags the puck sideways
  faceoff: 3,             // seconds the puck stays dead after a goal
  winScore: 7,
  malletSpeed: 2400,      // how fast a mallet chases the pointer, px/s
  keySpeed: 720,          // keyboard mallet speed, px/s
};

const { W, H, puckR, malletR, goalHalf, maxSpeed } = PUCK;

export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/** Seat 0 defends the left goal, seat 1 the right one. Mallets stay on their half. */
export function clampMallet(seat, x, y) {
  const minX = seat === 0 ? malletR : W / 2 + malletR;
  const maxX = seat === 0 ? W / 2 - malletR : W - malletR;
  return { x: clamp(x, minX, maxX), y: clamp(y, malletR, H - malletR) };
}

export function homeMallet(seat) {
  return { x: seat === 0 ? 110 : W - 110, y: H / 2, vx: 0, vy: 0 };
}

export function freshPuck(towardSeat = Math.random() > 0.5 ? 1 : 0) {
  return { x: W / 2, y: H / 2, vx: towardSeat === 0 ? -90 : 90, vy: Math.random() * 80 - 40 };
}

/** Puck placed on the side of the player who conceded, ready for them to strike. */
export function servePuck(concededSeat) {
  return { x: concededSeat === 0 ? W * 0.27 : W * 0.73, y: H / 2, vx: 0, vy: 0 };
}

function capSpeed(p) {
  const speed = Math.hypot(p.vx, p.vy);
  if (speed > maxSpeed) { p.vx *= maxSpeed / speed; p.vy *= maxSpeed / speed; }
}

/**
 * Resolves a puck/mallet overlap. The mallet counts as infinitely heavy: the
 * puck leaves with its own velocity reflected relative to the mallet's, plus
 * the mallet's velocity, which is what makes a swing feel like a swing.
 * Returns true on contact.
 */
function collideMallet(p, m) {
  const dx = p.x - m.x, dy = p.y - m.y;
  const dist = Math.hypot(dx, dy);
  const reach = puckR + malletR;
  if (dist >= reach) return false;
  // Contact normal points from the mallet through the puck, so an off-centre
  // strike sends the puck off at an angle instead of straight down the table.
  const nx = dist > 0.001 ? dx / dist : 1, ny = dist > 0.001 ? dy / dist : 0;
  p.x = m.x + nx * reach;
  p.y = m.y + ny * reach;
  const mvx = m.vx || 0, mvy = m.vy || 0;
  const rvx = p.vx - mvx, rvy = p.vy - mvy;
  const vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    p.vx -= (1 + PUCK.restitution) * vn * nx;
    p.vy -= (1 + PUCK.restitution) * vn * ny;
    // A sideways sweep drags the puck along the mallet, the way a real one does.
    const tx = -ny, ty = nx;
    const vt = (p.vx - mvx) * tx + (p.vy - mvy) * ty;
    p.vx -= PUCK.grip * vt * tx;
    p.vy -= PUCK.grip * vt * ty;
  }
  capSpeed(p);
  return true;
}

/** During a face-off the mallet yields, so it cannot rest on top of the puck. */
export function clearMallet(p, m, seat) {
  const dx = m.x - p.x, dy = m.y - p.y;
  const dist = Math.hypot(dx, dy);
  const reach = puckR + malletR + 10;
  if (dist >= reach) return;
  const nx = dist > 0.001 ? dx / dist : (seat === 0 ? -1 : 1);
  const ny = dist > 0.001 ? dy / dist : 0;
  const pos = clampMallet(seat, p.x + nx * reach, p.y + ny * reach);
  m.x = pos.x;
  m.y = pos.y;
  m.vx = 0;
  m.vy = 0;
}

/**
 * Advances the puck by dt, in substeps short enough that it cannot tunnel
 * through a mallet or a rail. `mallets` is [seat0, seat1]; either may be null
 * to leave that mallet out (the server lets each browser resolve its own hits).
 *
 * Returns { goal: 0 | 1 | 2, contact: [bool, bool] } where goal 1 means seat 0
 * scored (the puck went into the right-hand goal) and 2 means seat 1 scored.
 */
export function stepPuck(p, dt, mallets) {
  const contact = [false, false];
  const speed = Math.hypot(p.vx, p.vy) + Math.max(Math.hypot(mallets[0]?.vx || 0, mallets[0]?.vy || 0), Math.hypot(mallets[1]?.vx || 0, mallets[1]?.vy || 0));
  const steps = clamp(Math.ceil((speed * dt) / (puckR * 0.45)), 1, 24);
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    p.x += p.vx * h;
    p.y += p.vy * h;
    for (let seat = 0; seat < 2; seat++) {
      const m = mallets[seat];
      if (m && collideMallet(p, m)) contact[seat] = true;
    }
    if (p.y < puckR) { p.y = puckR; p.vy = Math.abs(p.vy) * PUCK.wallRestitution; }
    if (p.y > H - puckR) { p.y = H - puckR; p.vy = -Math.abs(p.vy) * PUCK.wallRestitution; }
    // The goal is only the opening at each end. Treating that band as open
    // across the whole table used to pin the puck in a lane and dump every
    // hit into one goal or the other.
    const mouthTop = H / 2 - goalHalf + puckR;
    const mouthBot = H / 2 + goalHalf - puckR;
    const inOpening = p.y > mouthTop && p.y < mouthBot;
    if (p.x < puckR) {
      if (!inOpening) { p.x = puckR; p.vx = Math.abs(p.vx) * PUCK.wallRestitution; }
      else if (p.x < -puckR) return { goal: 2, contact };
    }
    if (p.x > W - puckR) {
      if (!inOpening) { p.x = W - puckR; p.vx = -Math.abs(p.vx) * PUCK.wallRestitution; }
      else if (p.x > W + puckR) return { goal: 1, contact };
    }
  }
  const damp = Math.exp(-PUCK.friction * dt);
  p.vx *= damp; p.vy *= damp;
  return { goal: 0, contact };
}

/**
 * Moves a mallet toward a target (pointer or finger), limited to a top speed,
 * and records the velocity the puck should feel on contact.
 */
export function chaseMallet(m, seat, tx, ty, dt, maxSpeed = PUCK.malletSpeed) {
  const target = clampMallet(seat, tx, ty);
  const dx = target.x - m.x, dy = target.y - m.y;
  const dist = Math.hypot(dx, dy), step = maxSpeed * Math.max(0, dt);
  const k = dist > step && dist > 0 ? step / dist : 1;
  const nx = m.x + dx * k, ny = m.y + dy * k;
  if (dt > 0) {
    // Light smoothing keeps a jittery touch sample from launching the puck.
    m.vx += ((nx - m.x) / dt - m.vx) * 0.6;
    m.vy += ((ny - m.y) / dt - m.vy) * 0.6;
  }
  m.x = nx; m.y = ny;
}

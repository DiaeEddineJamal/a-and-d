// Copies the files the server and the duo games share into each game.
// Run from the repository root: npm run sync:cores
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const copies = [
  ['racing-game/server/games/puck-core.mjs', 'mangolian-puck/src/game/puck-core.mjs'],
  ['racing-game/server/games/kitchen-core.mjs', 'lmongolyan-chefs/src/game/kitchen-core.mjs'],
  ['shared/duo-room.ts', 'mangolian-puck/src/game/duo-room.ts'],
  ['shared/duo-room.ts', 'lmongolyan-chefs/src/game/duo-room.ts'],
  ['shared/duo-lobby.tsx', 'mangolian-puck/src/game/duo-lobby.tsx'],
  ['shared/duo-lobby.tsx', 'lmongolyan-chefs/src/game/duo-lobby.tsx'],
  ['shared/sprite-bank.ts', 'mangolian-puck/src/game/sprite-bank.ts'],
  ['shared/sprite-bank.ts', 'lmongolyan-chefs/src/game/sprite-bank.ts'],
  ['shared/sprite-bank.ts', 'mangolian-pong/src/game/sprite-bank.ts'],
  ['shared/board-view.ts', 'mangolian-pong/src/game/board-view.ts'],
  ['shared/board-view.ts', 'mangolian-puck/src/game/board-view.ts'],
  ['shared/board-view.ts', 'lmongolyan-chefs/src/game/board-view.ts'],
];
for (const [from, to] of copies) {
  fs.mkdirSync(path.dirname(path.join(root, to)), { recursive: true });
  fs.copyFileSync(path.join(root, from), path.join(root, to));
  console.log(`${from} -> ${to}`);
}

// The phone layout lives in shared/mobile-board.css and is kept as the last
// block of each game's globals.css; replace that block with the current copy.
const MARK = '/* ===== Phone layout (shared/mobile-board.css)';
const mobileCss = fs.readFileSync(path.join(root, 'shared/mobile-board.css'), 'utf8');
for (const app of ['mangolian-pong', 'mangolian-puck', 'lmongolyan-chefs']) {
  const file = path.join(root, app, 'src/app/globals.css');
  const css = fs.readFileSync(file, 'utf8');
  const at = css.indexOf(MARK);
  fs.writeFileSync(file, `${(at < 0 ? css : css.slice(0, at)).trimEnd()}\n${mobileCss}`);
  console.log(`shared/mobile-board.css -> ${app}/src/app/globals.css`);
}

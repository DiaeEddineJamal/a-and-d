// Copies the files the server and the duo games share into each game.
// Run from the repository root: npm run sync:cores
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const copies = [
  ['a-and-d-kart/server/games/puck-core.mjs', 'a-and-d-puck/src/game/puck-core.mjs'],
  ['a-and-d-kart/server/games/kitchen-core.mjs', 'a-and-d-chefs/src/game/kitchen-core.mjs'],
  ['shared/duo-room.ts', 'a-and-d-puck/src/game/duo-room.ts'],
  ['shared/duo-room.ts', 'a-and-d-chefs/src/game/duo-room.ts'],
  ['shared/duo-lobby.tsx', 'a-and-d-puck/src/game/duo-lobby.tsx'],
  ['shared/duo-lobby.tsx', 'a-and-d-chefs/src/game/duo-lobby.tsx'],
  ['shared/sprite-bank.ts', 'a-and-d-puck/src/game/sprite-bank.ts'],
  ['shared/sprite-bank.ts', 'a-and-d-chefs/src/game/sprite-bank.ts'],
  ['shared/sprite-bank.ts', 'a-and-d-pong/src/game/sprite-bank.ts'],
  ['shared/board-view.ts', 'a-and-d-pong/src/game/board-view.ts'],
  ['shared/board-view.ts', 'a-and-d-puck/src/game/board-view.ts'],
  ['shared/board-view.ts', 'a-and-d-chefs/src/game/board-view.ts'],
];
for (const [from, to] of copies) {
  fs.mkdirSync(path.dirname(path.join(root, to)), { recursive: true });
  fs.copyFileSync(path.join(root, from), path.join(root, to));
  console.log(`${from} -> ${to}`);
}

// The phone layout (shared/mobile-board.css) and then the A&D theme (shared/ad-theme.css)
// are kept as the last blocks of each game's globals.css; replace them with the current copies.
const MARK = '/* ===== Phone layout (shared/mobile-board.css)';
const mobileCss = fs.readFileSync(path.join(root, 'shared/mobile-board.css'), 'utf8').trimEnd() + '\n\n' + fs.readFileSync(path.join(root, 'shared/ad-theme.css'), 'utf8');
for (const app of ['a-and-d-pong', 'a-and-d-puck', 'a-and-d-chefs']) {
  const file = path.join(root, app, 'src/app/globals.css');
  const css = fs.readFileSync(file, 'utf8');
  const at = css.indexOf(MARK);
  fs.writeFileSync(file, `${(at < 0 ? css : css.slice(0, at)).trimEnd()}\n${mobileCss}`);
  console.log(`shared/mobile-board.css + ad-theme.css -> ${app}/src/app/globals.css`);
}

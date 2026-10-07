# A&D Arcade

This repository is organized as independent applications that share one room server:

- `a-and-d-arcade/`: Next.js arcade portal (http://localhost:3010)
- `a-and-d-pong/`: Pong, with 2-player, vs CPU and online modes (http://localhost:3001)
- `a-and-d-puck/`: air hockey, with 2-player, vs CPU and online modes (http://localhost:3002)
- `a-and-d-chefs/`: co-op cooking, with 2 chefs, a CPU chef, or online (http://localhost:3003)
- `a-and-d-kart/`: Vite kart racer, plus the shared Socket.IO room server for every game

## Run locally

From the repository root, one terminal each:

```bash
npm run server:racing
npm run dev:racing
npm run dev:pong
npm run dev:puck
npm run dev:chefs
npm run dev:portal
```

The shared room server runs at `http://localhost:3000`. The games reach it through
`NEXT_PUBLIC_RACING_SERVER_URL`; the portal links can be overridden with
`NEXT_PUBLIC_PONG_URL`, `NEXT_PUBLIC_RACING_URL`, `NEXT_PUBLIC_PUCK_URL` and
`NEXT_PUBLIC_CHEFS_URL`.

## Shared code

Air hockey physics (`puck-core.mjs`) and the kitchen rules with the CPU chef
(`kitchen-core.mjs`) live in `a-and-d-kart/server/games/`, because the server runs
them too. The browser room hook and lobby live in `shared/`. After editing any of
them, copy them into the games:

```bash
npm run sync:cores
```

## Art

Each game draws everything in code and swaps in PNGs from its `public/sprites/`
folder when they exist. `docs/ASSET_PROMPTS.md` has the ChatGPT prompts and the
exact filenames.

After adding or replacing any art, run:

```bash
npm run prepare:art
```

It trims and centres objects so animation frames line up, resizes everything to the
size the games draw it, and shrinks the files (about 30 MB down to 3.5 MB). Untouched
originals are kept in each game's `art-originals/` folder, outside `public/`, and running
it again is safe.

## Build everything

```bash
npm run build
```

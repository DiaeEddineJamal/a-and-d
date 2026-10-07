# Asset prompts for ChatGPT

Every game already runs with art drawn in code. Each image you generate **replaces
one drawn piece automatically** once it is saved under the right name in the right
folder. Nothing else needs changing. Missing files are fine; that piece just stays
drawn in code.

## How to use this

1. Start a new ChatGPT image chat and paste the **Style block** first, on its own.
   Say: "Use this style for every image in this chat."
2. Then paste one prompt at a time. One image per message works best.
3. Download as **PNG**. Rename it to the filename shown and drop it in the folder shown.
   When you've added a batch, run `npm run prepare:art` from the repository root
   (it lines up animation frames, resizes and compresses; the originals are kept).
4. For the objects (paddles, mallets, chefs, food), transparency matters. If ChatGPT
   gives you a white or checkered background instead of a real transparent one, keep
   the file anyway: the coding chat set up with the handoff prompt at the end of this
   document is told to cut backgrounds out.
5. Sizes: ChatGPT makes square (1024×1024), landscape (1536×1024) or tall (1024×1536)
   images. Ask for the shape listed next to each file; the games scale everything
   themselves, so the exact pixel size doesn't matter.
6. **You only need the teal versions** of the chefs, mallets and paddles. When a
   `..._teal...` file has no `..._brick...` partner, the game makes the brick one
   itself by recolouring. Generate a brick file only if you want it to look different.
7. **Animations are numbered frames**, one image per frame: `chef_teal_walk_1.png`,
   `chef_teal_walk_2.png`, and so on. The game plays them in order. To keep frames
   consistent, make frame 1, then in the same chat say: *"Using the previous image as
   the exact reference (same character, same size, same position on the canvas, same
   colours), draw frame 2: …"*, describing only what changes. If a frame drifts, upload
   frame 1 again and ask for the next frame based on it.
8. **Effects** (`fx_...`) are drawn over the game, so they must be on a transparent
   background with nothing else in the image. Until they exist, the game draws a simple
   version itself.

---

## Style block (paste this first)

> Style for this whole chat: a lovingly preserved mid-century printed game catalogue
> crossed with hand-inked theatrical packaging. Bold confident ink linework, flat
> colour fills, subtle risograph halftone dots and a faint aged-paper grain. Limited
> palette only: ink #201b16, cream #f2e8ca, warm paper #e6d8b7, muted teal #567b78,
> brick red #a44f39, mustard #c3973a, with small touches of coral #d9694f. Warm and
> playful, never glossy, no neon, no glassmorphism, no 3D-render look, no photographic
> realism. No text, no letters, no numbers, no logos, no watermarks anywhere in the
> image. No flags, no national or cultural symbols. Original designs only; nothing
> resembling existing game characters or brands.

---

## 1. Game box covers (portal)

The portal crops each cover to a tall box front and prints the game title over the
bottom of it in code. So: **no text in the image**, main subject in the **middle half**
of the width, and a calmer **bottom quarter**.

Folder: `a-and-d-arcade/public/`

### Mangolian Puck cover → `puck-cover-box-art.png` (landscape)

> Game box cover illustration, landscape 3:2. A dramatic low three-quarter view across
> an air hockey table: a dark puck with a mustard ring skids toward the viewer, trailing
> a streak of cream motion lines and small ink speed-sparks. In the foreground, a teal
> air hockey mallet strikes it; a brick-red mallet waits across the centre line in the
> background. The table surface is muted teal with a subtle grid of tiny air holes, cream
> centre line and centre circle, and a mustard rail. Behind the table, a theatrical
> backdrop of stylised sunburst rays in teal, mustard and brick, framed by heavy
> brick-red stage curtains at the top corners, like a vintage arena poster. Keep the
> puck and the striking mallet inside the middle half of the image width. Keep the
> bottom quarter simpler (table surface only) because a title will be printed there.
> No hands or people, no faces on the equipment, no text.

### Lmongolyan Chefs cover → `chefs-cover-box-art.png` (landscape)

> Game box cover illustration, landscape 3:2. Two cheerful round-bodied cartoon chefs in
> tall puffy white chef hats, seen from the waist up behind a wooden kitchen counter,
> working together in a busy restaurant kitchen: the one on the left wears a teal apron
> and is flipping a burger patty in a pan with a burst of flame; the one on the right
> wears a brick-red apron and is tossing a tomato and lettuce leaves into the air above a
> chopping board. Between them, at the centre, a finished burger (sesame bun, lettuce,
> tomato, patty) floats on a cream plate, glowing slightly, framed by a mustard sunburst.
> Background: a cream and paper checkerboard tiled wall, a hanging row of order tickets,
> copper pans. Simple friendly faces (dot eyes, small smiles). Keep the burger and both
> chefs' upper bodies inside the middle 60% of the image width. Keep the bottom quarter
> simpler (counter top only) because a title will be printed there. No text on the
> tickets or anywhere else.

### Optional: refresh the two existing covers so all four match

The current Pong and Kart covers already fit the look. Only redo them if you want
the set to feel even more uniform. Same size and rules as above; save over
`pong-cover-box-art.png` and `kart-cover-box-art.png`.

> Pong: Game box cover, landscape 3:2. A glowing cream table tennis ball arcs between
> two tall rounded rectangular paddles on a teal table seen in dramatic perspective: a
> brick-red paddle in the foreground left, a teal paddle far right. Behind them, a
> theatrical sunburst backdrop and heavy brick-red stage curtains. Paddles have no faces.
> Subject in the middle half of the width, calm bottom quarter, no text.

> Kart: Game box cover, landscape 3:2. A little vintage mustard-yellow soap-box racing
> kart with a brick-red stripe drifts through a dusty bend on a countryside dirt track,
> the driver in a cream helmet and a flying red scarf, a rival kart behind. Big curling
> dust clouds, speed streaks in the sky, rolling hills and cypress trees. Subject in the
> middle half of the width, calm bottom quarter, no text.

---

## 2. Mangolian Puck (air hockey)

Folder: `a-and-d-puck/public/sprites/`

The code always draws the table **markings** (centre line, circles, goals) itself so
they line up with the physics. The surface image is just the playing surface.

### Table surface → `table_surface.png` (landscape)

> A perfectly flat, straight-down top view of an air hockey playing surface filling the
> entire image edge to edge, landscape. Muted teal #35615c surface with a very even grid of
> tiny cream air holes, faint halftone texture and gentle scuffs, slightly lighter in
> the middle. Absolutely no lines, circles, goals, rails, borders, text or objects. Just
> the surface texture.

### Teal mallet → `mallet_teal.png` (square, transparent)

> A single air hockey mallet seen from directly above, perfectly centred and filling
> about 90% of a square canvas, transparent background. Round muted teal #567b78 base
> ring, a lighter teal top disc, and a darker teal round knob handle in the centre with
> a small cream highlight. Bold ink outline. No shadow on the background, no face, no
> text.

### Brick mallet → `mallet_brick.png` (optional; made automatically from the teal one)

> The exact same air hockey mallet design, same angle and size, recoloured brick red:
> base ring #a44f39, top disc #dc7a5c, knob #80392a. Transparent background, no shadow,
> no text.

### Mallet strike flash → `mallet_teal_hit.png` (square, transparent)

Shown for a split second each time the mallet hits the puck.

> The same teal air hockey mallet as before, identical size and position, at the instant
> it strikes: the top disc glows a brighter cream-teal, a thin bright cream rim of light
> runs around the edge, and the whole mallet looks very slightly squashed wider. Transparent
> background, no text.

### Puck → `puck.png` (square, transparent)

> A single air hockey puck seen from directly above, perfectly centred, filling about 90%
> of a square canvas, transparent background. Near-black ink #1c1814 disc with a thin
> mustard #c3973a ring inset from the edge and a faint worn texture. No shadow, no text.

### Spinning puck → `puck_spin_1.png` … `puck_spin_4.png` (square, transparent)

Plays while the puck slides, faster the faster it goes. Add a small off-centre mark so
the spin is visible.

> Frame 1 of 4: the same air hockey puck, identical size and position, with a small cream
> notch mark on the mustard ring at the 12 o'clock position. Transparent background.

Then frames 2, 3 and 4: *"the same puck, identical in every way, with the notch mark
rotated to 3 o'clock"* (frame 2), *"6 o'clock"* (frame 3), *"9 o'clock"* (frame 4).

### Hit spark → `fx_hit_1.png` … `fx_hit_4.png` (square, transparent)

Plays where a mallet strikes the puck.

> Frame 1 of 4 of an impact spark effect, centred on a square transparent canvas, nothing
> else in the image: a small tight burst of cream #f2e8ca and mustard #c3973a ink sparks
> with a tiny bright centre. Bold ink style, flat colours.

Frame 2: *"the burst larger and wider, sparks flying outward"*. Frame 3: *"sparks at their
widest, thinning out"*. Frame 4: *"only a few faint sparks and specks left at the edges"*.

### Goal burst → `fx_goal_1.png` … `fx_goal_4.png` (square, transparent)

Plays at the goal mouth when a goal goes in.

> Frame 1 of 4 of a celebratory goal burst, centred on a square transparent canvas,
> nothing else in the image: a ring of stylised starburst rays in mustard #c3973a, cream
> and coral #d9694f bursting outward from the centre, with small confetti squares.

Frame 2: *"the rays longer and the confetti spreading"*. Frame 3: *"the burst at full size,
confetti scattered wide"*. Frame 4: *"the rays fading and only scattered confetti left"*.

---

## 3. Lmongolyan Chefs (co-op cooking)

Folder: `a-and-d-chefs/public/sprites/`

The kitchen is a top-down grid, so everything must be seen from **straight above**
(no perspective, no side view). Tiles are square and fill the whole image.

### Characters (square, transparent)

The chef art is drawn **facing the bottom of the image**; the game rotates it to the
direction the chef walks.

**Teal chef → `chef_teal.png`**

> A cute round cartoon chef character seen from directly above (bird's-eye, top-down
> game sprite), centred on a square transparent canvas, filling about 85% of it. We see
> the top of a big puffy white chef hat in the middle, the round shoulders of a teal
> #567b78 chef jacket around it, and two small cream hands reaching forward toward the
> bottom edge of the image, as if about to grab something. Bold ink outline, flat colours,
> a tiny cream apron tie visible at the back (top edge). No face visible from this angle,
> no shadow, no background, no text.

**Brick chef → `chef_brick.png`** (optional; made automatically from the teal chef)

> The same chef character, identical pose, design, size and angle, with the jacket
> recoloured brick red #a44f39. Transparent background, no shadow, no text.

### Chef animations (square, transparent, top-down, facing the bottom edge)

Make `chef_teal.png` first; every frame below is **that same chef**, same size and
position on the canvas, seen from directly above. Only the arms, hands, shoulders and hat
change. The game plays walk and carry at 8 frames a second, chop at 10, idle at 2.

**Idle → `chef_teal_idle_1.png`, `chef_teal_idle_2.png`**

> Frame 1: the chef standing still, hands resting at the sides of the body.
> Frame 2: identical, but the shoulders slightly raised and the hat a touch taller, as if
> breathing in.

**Walk → `chef_teal_walk_1.png` … `chef_teal_walk_4.png`**

Seen from above, a walk shows as swinging arms and a small side-to-side shoulder sway.

> Frame 1: left hand swung forward toward the bottom edge, right hand swung back toward
> the top, shoulders tilted slightly to the right.
> Frame 2: both hands level at the sides, shoulders straight (passing position).
> Frame 3: right hand forward, left hand back, shoulders tilted slightly to the left.
> Frame 4: both hands level at the sides again, shoulders straight.

**Carry → `chef_teal_carry_1.png` … `chef_teal_carry_4.png`**

The game draws the food or plate in the chef's hands, so **leave the hands empty**, held
together in front.

> Frame 1: both hands held together out in front toward the bottom edge, palms up as if
> carrying a tray (hands empty), shoulders tilted slightly right.
> Frame 2: same hands, shoulders straight.
> Frame 3: same hands, shoulders tilted slightly left.
> Frame 4: same hands, shoulders straight.

**Chop → `chef_teal_chop_1.png` … `chef_teal_chop_3.png`**

> Frame 1: the right hand raised holding a small kitchen knife up high, the left hand
> steadying something just in front toward the bottom edge.
> Frame 2: the knife halfway down.
> Frame 3: the knife down at the bottom edge, a tiny cream motion line above it.

### Cooking stages (square, transparent)

Use the same food icon line as below.

| File | Prompt |
|---|---|
| `tomato_cut.png` | A tomato cut in half, the two halves side by side showing the red flesh and seeds. Shown halfway through chopping. |
| `lettuce_cut.png` | A head of lettuce sliced in half, with a few loose leaves beside it. Shown halfway through chopping. |

### Order ticket icons (square, transparent)

Small pictures shown on each order ticket above the kitchen.

| File | Prompt |
|---|---|
| `recipe_salad.png` | A small cream bowl of green lettuce and red tomato slices, seen at a slight angle, as a menu icon. |
| `recipe_toast.png` | A slice of golden toast topped with red tomato slices, as a menu icon. |
| `recipe_burger.png` | A simple burger: sesame bun and brown patty, seen from the side, as a menu icon. |
| `recipe_deluxe.png` | A tall burger: sesame bun, lettuce, tomato and patty, seen from the side, as a menu icon. |

### Kitchen effects (square, transparent, nothing else in the image)

**Sizzle → `fx_sizzle_1.png` … `fx_sizzle_3.png`** (loops over a patty on the stove)

> Frame 1: a few small cream grease droplets and tiny white steam puffs popping upward in
> a loose ring, seen from above, centred, with an empty middle where a patty sits.
> Frame 2: the droplets in different spots, one steam puff bigger.
> Frame 3: the droplets in different spots again, two small pops.

**Smoke → `fx_smoke_1.png` … `fx_smoke_3.png`** (loops over a burning patty)

> Frame 1: a small curl of grey #5a5650 smoke rising from the bottom centre of the canvas.
> Frame 2: the curl taller and drifting slightly left, a second puff starting at the bottom.
> Frame 3: the first curl near the top and fading, the second puff halfway up.

**Chop flecks → `fx_chop_1.png` … `fx_chop_3.png`** (loops while someone chops)

> Frame 1: a few small cream and green flecks jumping up from the centre of a chopping
> board, with a tiny motion arc. Frame 2: the flecks higher and spread. Frame 3: the flecks
> falling back down.

**Serve burst → `fx_serve_1.png` … `fx_serve_4.png`** (plays once at the pass when an order is served)

> Frame 1: a small burst of mustard #c3973a starburst rays and cream sparkles around an
> empty centre. Frame 2: the rays longer, sparkles spreading, a few tiny coin shapes.
> Frame 3: the burst at full size. Frame 4: only fading sparkles left.

### Food and plates (square, transparent)

Paste this line before each food prompt: *"Single top-down game item icon, seen from
directly above, centred on a square transparent canvas, filling about 80% of it, bold
ink outline, flat colours, no shadow, no plate unless asked, no text."*

| File | Prompt |
|---|---|
| `tomato.png` | A whole ripe tomato, brick-red with a small green leafy top and a cream highlight. |
| `tomato_chopped.png` | Three neat round tomato slices, slightly overlapping, showing seeds. |
| `lettuce.png` | A whole round head of green lettuce with pale ribs. |
| `lettuce_chopped.png` | A small loose pile of shredded green lettuce. |
| `bread.png` | A golden burger bun with sesame seeds, seen from above. |
| `meat.png` | A raw pink burger patty. |
| `meat_cooked.png` | A cooked brown burger patty with dark grill marks. |
| `meat_burnt.png` | A charred black burger patty with a small wisp of grey smoke. |
| `plate.png` | An empty round cream ceramic plate with a slightly darker rim. |

### Environment tiles (square, fill the whole image, no transparency)

Paste this line before each tile prompt: *"Square top-down game tile, seen from
directly above with no perspective, filling the entire image edge to edge, flat
colours, bold ink details, subtle halftone grain, no text, no characters."*

| File | Prompt |
|---|---|
| `tile_floor.png` | Warm kitchen floor: a 2×2 checkerboard of cream #e6d8b7 and paper #dccaa3 tiles with thin grout lines. Must tile seamlessly when repeated. |
| `tile_counter.png` | A wooden kitchen worktop in warm brown #9c7449 with visible grain and a darker front edge along the bottom of the tile. Must tile seamlessly left to right. |
| `tile_board.png` | The same wooden worktop with a pale wooden chopping board on top and a small knife resting at its edge. |
| `tile_stove.png` | A black cast-iron stove top with one round burner ring and grate in the centre. |
| `tile_crate.png` | An open wooden produce crate seen from above, slatted sides, empty inside (the game draws the food in it). |
| `tile_pass.png` | A brick-red serving hatch counter with a small brass service bell near the top. |
| `tile_bin.png` | A round dark grey kitchen bin with its lid open, seen from above, on the wooden worktop. |

---

## 4. Mangolian Pong

Folder: `a-and-d-pong/public/sprites/`

The code draws the centre line and the Film Frenzy storm effect on top of the court.

### Court → `court.png` (landscape)

> A perfectly flat, straight-down top view of a table tennis court surface filling the
> entire image edge to edge, landscape. Deep muted teal #385954 with a soft darker vignette at
> the edges, faint halftone dots and gentle wear. Absolutely no lines, net, paddles, ball,
> borders or text.

### Teal paddle → `paddle_teal.png` (tall, transparent)

> A single tall rounded-rectangle game paddle standing upright, seen straight on, centred
> on a tall transparent canvas and filling it top to bottom. Muted teal #567b78 face with
> a slightly lighter bevelled edge, a cream highlight streak on the left, and a bold ink
> outline. No face, no handle, no shadow, no text.

### Brick paddle → `paddle_brick.png` (optional; made automatically from the teal one)

> The exact same paddle, same size and angle, recoloured brick red #a44f39 with a coral
> #d9694f highlight. Transparent background, no text.

### Paddle hit flash → `paddle_teal_hit.png` (tall, transparent)

> The same teal paddle, identical size and position, at the instant the ball hits it: the
> face glows a brighter cream-teal and a bright cream rim of light runs around the edge.
> Transparent background, no text.

### Ball → `ball.png` (square, transparent)

> A single glowing cream table tennis ball, centred, filling about 70% of a square
> transparent canvas, with a soft mustard #c3973a glow ring around it and a small
> highlight. No shadow on the background, no text.

### Spinning ball → `ball_spin_1.png` … `ball_spin_4.png` (square, transparent)

> Frame 1 of 4: the same glowing ball, identical size and position, with a thin curved
> mustard seam line across it running top-left to bottom-right. Then frames 2 to 4: the
> same ball with the seam rotated a further quarter turn each frame.

### Hit spark → `fx_hit_1.png` … `fx_hit_4.png` (square, transparent)

Use exactly the same four prompts as the air hockey hit spark above (section 2).

### Film Frenzy storm → `fx_storm_1.png` … `fx_storm_3.png` (landscape, transparent)

Laid over the whole court during a Film Frenzy gust, so keep it light and see-through.

> Frame 1 of 3: a transparent landscape overlay with nothing but loose diagonal wind
> streaks in brick red #a44f39 and cream, sweeping from left to right across the whole
> image, with small swirls, like old film scratches. Mostly empty space between streaks.

Frames 2 and 3: *"the same overlay with every streak shifted a little further to the right
and the swirls in new places"*.

---

## Checklist

Everything is optional, and anything missing is drawn by the game. The files marked ★
change the look the most.

| Game | Folder | Files |
|---|---|---|
| Portal | `a-and-d-arcade/public/` | ★ `puck-cover-box-art`, ★ `chefs-cover-box-art` · optional refresh: `pong-cover-box-art`, `kart-cover-box-art` |
| Puck | `a-and-d-puck/public/sprites/` | ★ `table_surface`, ★ `mallet_teal`, `mallet_teal_hit`, ★ `puck`, `puck_spin_1-4`, `fx_hit_1-4`, `fx_goal_1-4` |
| Chefs | `a-and-d-chefs/public/sprites/` | ★ `chef_teal`, `chef_teal_idle_1-2`, ★ `chef_teal_walk_1-4`, `chef_teal_carry_1-4`, `chef_teal_chop_1-3` · ★ 9 food files, `tomato_cut`, `lettuce_cut`, 4 `recipe_…` icons · ★ 7 tile files · `fx_sizzle_1-3`, `fx_smoke_1-3`, `fx_chop_1-3`, `fx_serve_1-4` |
| Pong | `a-and-d-pong/public/sprites/` | `court`, ★ `paddle_teal`, `paddle_teal_hit`, ★ `ball`, `ball_spin_1-4`, `fx_hit_1-4`, `fx_storm_1-3` |

All filenames end in `.png`. Brick versions (`chef_brick…`, `mallet_brick…`,
`paddle_brick…`) are optional overrides.

---

## Handing development over to ChatGPT

Paste the prompt below into ChatGPT as the first message of a new coding chat. It's
written so ChatGPT can pick up where this work stopped without breaking what already
works. Give it access to the repository (upload the zipped folder or connect GitHub).

````text
You are taking over development of "Lmogolyan Arcade", a small multi-game website I play
with my partner. Read this whole brief before changing anything, then read README.md
and docs/ASSET_PROMPTS.md in the repository.

## What exists
A monorepo with independent apps that share one real-time server:
- a-and-d-arcade/ : Next.js 16 portal (port 3010). A "shelf" of 3D game boxes; data is
  the `games` array in src/app/page.tsx. Covers live in public/; puck/chefs covers are
  picked automatically: `<name>.png` if present, else the stand-in `<name>.svg`.
- a-and-d-pong/ : Pong (port 3001). Modes: 2 players, vs CPU (easy/normal/hard), online.
- a-and-d-puck/ : air hockey (port 3002). Same three modes.
- a-and-d-chefs/ : co-op cooking (port 3003). Modes: 2 chefs, with a CPU chef, online.
  Difficulty here is kitchen pace (order rate and patience).
- a-and-d-kart/ : Vite + Three.js kart racer AND the Socket.IO server (server/index.js,
  port 3000) that hosts rooms for every game.

## Architecture rules (do not break these)
1. Shared logic has ONE source of truth. Edit only these originals, then run
   `npm run sync:cores` from the repo root, which copies them into each game's src/game/:
   - a-and-d-kart/server/games/puck-core.mjs   (air hockey physics; server + browser)
   - a-and-d-kart/server/games/kitchen-core.mjs (kitchen rules, recipes, CPU chef planner)
   - shared/duo-room.ts    (browser room hook: lobby, reconnect, resume, clock sync)
   - shared/duo-lobby.tsx  (mode switch, difficulty picker, private-room lobby UI)
   - shared/sprite-bank.ts (optional art loader, animation frames, effects)
   - shared/board-view.ts  (turns the board upright on portrait phones; rotates input)
   - shared/mobile-board.css (phone layout; synced as the last block of each globals.css)
   Never edit the copies in */src/game/ directly, or the phone-layout block at the end of
   each game's globals.css; they get overwritten. Phones: games simulate in landscape
   board coordinates and only drawing/input rotate, so draw text with uprightText /
   uprightOverlay and convert touches with pointerToBoard / screenDirToBoard.
2. Online model. Rooms are two seats keyed by a per-tab token (sessionStorage), not by
   socket id, so a dropped phone keeps its seat for 45 s and the match pauses
   (a-and-d-kart/server/games/duo-rooms.mjs). Pong has its own equivalent inside
   server/index.js.
   - Pong: server runs the ball; each browser owns its paddle and sends its position
     (`pong:paddle`); clients extrapolate the ball with server-time-stamped snapshots.
   - Puck: server runs the puck and goals; each browser owns its mallet (`puck:m`) and
     claims its own hits (`puck:hit`), which the server checks against recent puck history.
   - Chefs: server owns the kitchen; browsers own chef positions (`chefs:move`) and send
     actions (`chefs:act`, `chefs:chop`).
   Keep snapshots small, keep `volatile` for positional updates, and keep the rAF time
   step clamped to >= 0 (a negative first frame once turned everything into NaN).
3. Art is optional and data-driven. Each game's page.tsx lists PNGs in public/sprites and
   passes them to the game; sprite-bank.ts loads only those. Names:
   single `name.png`; animation frames `name_1.png`, `name_2.png`, ... (consecutive from 1).
   Missing art falls back to code drawing, so never make the game depend on a file.
   `*_teal*` art gets an automatic brick twin by recolouring unless `*_brick*` exists.
   docs/ASSET_PROMPTS.md lists every filename the code looks for. If you add a new art
   hook, add its prompt and filename there too.
4. Style: palette ink #201b16, cream #f2e8ca, paper #e6d8b7, teal #567b78, brick #a44f39,
   mustard #c3973a, coral #d9694f; fonts Bungee (display) and Rubik (UI), Georgia for body
   copy. Printed, hand-inked, playful. No neon, glassmorphism or gradient text. Keep
   keyboard access, visible focus, and reduced-motion support. See PRODUCT.md.

## How to run and check
From the repo root, in separate terminals: `npm run server:racing`, `npm run dev:portal`,
`npm run dev:pong`, `npm run dev:puck`, `npm run dev:chefs` (and `npm run dev:racing` for
the kart game). Before finishing any change run, in each app you touched:
`npx tsc --noEmit -p .` and `npx eslint src`. Both must pass with zero errors.
Test online play with two browser tabs (host creates a room, guest joins with the code).

## Deploying
The server (a-and-d-kart) must be redeployed whenever server/games/* or server/index.js
changes; the Pong/Puck/Chefs apps and the server must be deployed together when the
network protocol changes. Each game app needs NEXT_PUBLIC_RACING_SERVER_URL and
NEXT_PUBLIC_ARCADE_URL; the portal needs NEXT_PUBLIC_PONG_URL, NEXT_PUBLIC_RACING_URL,
NEXT_PUBLIC_PUCK_URL and NEXT_PUBLIC_CHEFS_URL.

## Your first task
I'm adding generated art. For each PNG I give you:
1. Check the filename against docs/ASSET_PROMPTS.md and put it in the folder listed there.
2. If the background isn't truly transparent where it should be, remove the background
   (keep soft edges) before saving.
3. Keep frames of one animation the same canvas size, with the subject in the same place.
4. Don't change game code just to fit an image; the loader already scales and positions
   art. Only touch code if an image needs a different on-screen size or offset, and then
   change the one draw call for that sprite.
5. After placing files, run `npm run prepare:art` from the repo root. It trims and
   centres round objects and paddles, fixes frame sizes, and resizes and compresses
   everything; untouched originals go to <game>/art-originals/. Never put originals
   back into public/sprites by hand; re-run the script instead.
6. Tell me which files you placed and which of the listed files are still missing.
````

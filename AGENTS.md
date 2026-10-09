## Learned User Preferences

- Publish portal and game changes to the existing production Vercel projects.
- Keep local folders, GitHub repos, and Vercel projects on the A&D names.
- When a game has its own git repo, push unpushed commits. When it does not, deploy the latest suite build to its Vercel project.

## Learned Workspace Facts

- This workspace is the A&D Arcade suite (`DiaeEddineJamal/a-and-d`). Apps are `a-and-d-arcade` (portal), `a-and-d-pong`, `a-and-d-puck`, `a-and-d-chefs`, and `a-and-d-kart` (kart client plus the shared Socket.IO room server for every game).
- `a-and-d-arcade` and `a-and-d-pong` are git submodules. Puck, Chefs, and Kart live in the suite repo and have no separate remotes.
- Vercel projects are `a-and-d-arcade`, `a-and-d-pong`, `a-and-d-puck`, `a-and-d-chefs`, and `a-and-d-kart`. The kart project builds from the `a-and-d-kart` folder; a suite-root build fails because Next is not installed there.

# AGENTS.md

Static p5.js + ml5.js hand tracking playground. **No toolchain**: no `package.json`, no build, no lint, no tests — do not go looking for one.

## Run and verify

**You must serve over `http(s)`, not `file://`.** `getUserMedia` requires a secure context, so opening `index.html` by double-click leaves the camera dead. Use `npx serve`, `python -m http.server`, or Live Server, then open the localhost URL.

- First load needs network: p5 **2.3.3** (jsDelivr) and ml5 **1.x** (unpkg) are both CDN-only, and the model weights load from tfhub.dev on first run.
- Manual check only: allow camera permission, hold a hand up, and the skeleton should track it. Devtools console must be error-free.
- Node 24 is available for ad-hoc `node --check <file>` syntax checks. There is no test suite.

## Architecture

Three modules, one composition root, wired through globals on `window`. Data flows one direction:

```
camera -> Hands (landmarks) -> Game (state) -> UI (pixels)
```

sketch.js owns the p5 lifecycle and nothing else: no game rules, no drawing, no model calls.

| Path | Role |
|------|------|
| `index.html` | Loads p5, ml5, then `js/handpose.js`, `js/gamelogic.js`, `js/ui.js`, then `sketch.js`. |
| `js/handpose.js` | `Hands` — camera + ml5 model, coordinate mapping, bone topology. Complete. |
| `js/gamelogic.js` | `Game` — game state derived from hands. Stub owned by the game-logic person. |
| `js/ui.js` | `UI` — all drawing. Stub owned by the UI person. |
| `sketch.js` | `async setup()` awaits `Hands.init()`, then calls `Game.update()` / `UI.render()` per frame. |

Each module documents its own contract in a header comment. **Read the header before editing.**

## Traps

- **Do not add `type="module"` to any `<script>`.** p5 global mode cannot see `setup()`/`draw()` declared in module scope — the sketch silently never starts. Classic scripts only.
- **The ml5 method is `ml5.handPose()` — capital P.** The docs page is lowercase (`/reference/handpose`), so copying that name throws `ml5.handpose is not a function`.
- **ml5 constructors are async with p5 2.x.** `await ml5.handPose({...})` inside `async setup()`. `preload()` no longer handles this.
- **Never write into `Hands.hands` or `Game.state` from another module.** They are read-only by contract; mutating shared state is how three people break each other.
- **`detectStart()` runs its own loop.** Do not also call `detect()` from `draw()` — you will double the inference cost.
- The reset in `style.css` sets `overflow: hidden` and `max-width: 100%` on `canvas`. Safe while the canvas is viewport-sized; a larger fixed `createCanvas()` would desync `mouseX`/`mouseY` from rendered coordinates.
- **No `.gitignore`.** Everything at the root is tracked — keep scratch files out of the working tree.

## Git

- **No remote is configured.** `git push`, PRs, and CI do not exist until someone adds one.
- Branches: `main`, `develop`, `feature/handpose` (currently checked out). `main` is 2 commits behind `develop`.
- gitflow prefixes are set in `.git/config` (`feature/`, `bugfix/`, `release/`, `hotfix/`, `support/`), but the **`git flow` CLI is not installed**, and `gitflow.branch.master` points at `handpose` — a branch that does not exist. `git flow ...` will fail; branch manually unless the user fixes that config.
- No active git hooks (only `*.sample`), no commit linter. History is free-form Spanish (`init`, `cambios js`, `css reset`); match the existing style rather than assuming a conventional format is enforced.

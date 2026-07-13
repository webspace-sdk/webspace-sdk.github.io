# 03 — Getting Started as a Developer

## Prerequisites

- Node.js (the repo's `.tool-versions` pins the intended version; the toolchain is webpack 5 /
  Babel-era, so a Node from that period — 16/18 — is the safe choice).
- Chrome (the engine targets last-2 Chrome/Firefox; Chrome is the primary target, and the
  File System Access API used for local writeback is Chrome-only).
- The GitHub-pinned dependencies (see [02](02-repo-layout.md)) must still resolve for `npm ci`.

## Run the engine locally

```bash
cd webspace-engine
npm ci
npm run local        # webpack-dev-server on http://localhost:8080
```

Then create a world: save this as `index.html` in some new folder —

```html
<html>
<head><script src="http://localhost:8080/assets/js/index.js"></script></head>
<body></body>
</html>
```

— and open it in Chrome via **File → Open**. You get an empty 3D world backed by that file. Because
it's a `file:` URL, the engine offers **local writeback**: grant it access to the folder and your
in-world edits are saved into the HTML file itself. Open the file in an editor afterward to see the
world you built as markup.

Against production instead of a local build, use `<script src="https://webspace.run"></script>`
(that URL serves `webspace-latest.js` from the S3 bucket — see [25](25-build-deploy.md)).

## Everyday commands

| Command | What it does |
|---|---|
| `npm run local` | Dev server with HMR at `0.0.0.0:8080` |
| `npm run build` | Production bundle to `dist/assets/js/index.js` |
| `npm run test` | lint + unit tests (ava, `test/unit`) + build |
| `npm run test:unit` | ava only |
| `npm run storybook` | React component gallery on port 6006 |
| `npm run bundle-analyzer` | Bundle size inspection |
| `npm run deploy` | Build + upload to `s3://webspace.run/webspace-latest.js` (needs AWS creds) |
| `npm run spritesheet` | Regenerate UI sprite sheets from `src/assets/images/sprites/` |

## Using a world (user-level crash course)

Once in a world (these are taught interactively by the tutorial worlds on webspaces.space):

- **Move**: WASD; mouse-drag to look, Shift toggles mouse lock; Space jumps; hold Space to fire the
  equipped emoji. Mobile: pinch to move, drag to look.
- **Create**: press `/` to open the create menu (text, images by URL, video/YouTube, GLB models,
  .svox voxel models, emoji…). Paste (Ctrl-V) and drag-drop also work.
- **Manipulate**: right-click-drag moves an object (or TAB for move mode); while moving, Space snaps
  to floor, Q/E rotate, T/G reorient, 1/2/3 constrain to the object's X/Y/Z axes. Ctrl-drag or
  hover+C clones. L unlocks a locked object. `~` opens the voxel editor on a voxel object. V paints
  voxels with the brush.
- **Modes**: the right panel toggles **Launcher** (emoji blaster + presence list) vs **Builder**
  (voxel brush tools). Text objects are edited by clicking them (Quill inline).
- **Persist**: the top bar's writeback dialog connects the world to its origin — automatic for
  `file:` worlds (directory picker), or GitHub via fine-grained personal access token with
  **Contents** permission on just that repo (walkthrough: `webspace-engine/github-writeback.md`).

## Repo entry points for reading code

Start with these, in order:

1. `src/index.js` — bootstrap; read alongside [05 — Boot sequence](05-boot-sequence.md).
2. `src/aframe-dom.js` — the entire scene skeleton in one string.
3. `src/utils/world-importer.js` — HTML → entities.
4. `src/systems/hubs-systems.js` — the frame loop and every system's tick order.
5. `src/systems/dom-serialize-system.js` — entities → HTML (the return trip).
6. `src/utils/atom-access-manager.js` — permissions + writeback orchestration.

## Gotchas

- **Shadow DOM everywhere**: the page you inspect in devtools is the *document*; the running world
  and UI live in the shadow root on `<body>` (`window.DOM_ROOT`). A-Frame selectors are re-rooted
  via `AFRAME.selectorRoot`.
- **`THREE.Object3D.DefaultMatrixAutoUpdate = false`** globally. If an object isn't where you put it,
  you probably didn't update its matrix.
- **Determinism matters**: object IDs derive from content hashes with a seeded RNG. Don't casually
  reorder element serialization or ID generation.
- **The scene hard-pauses on tab blur** (with debounce); systems that must keep running while paused
  are ticked by a separate interval in `hubs-systems.js`.
- **COEP/SharedArrayBuffer**: on HTTP(S) hosts, `webspace.service.js` (service worker) must sit next
  to the HTML to enable SharedArrayBuffer (lip sync, WASM threads). Without it those features
  silently degrade.

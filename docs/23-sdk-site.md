# 23 — The Public Site & Tutorial Worlds (webspace-sdk.github.io)

The repo `webspace-sdk.github.io/` is the public face at **webspaces.space** (GitHub Pages, CNAME).
Its conceit: every documentation page is itself a webspace — you learn the product by standing
inside it. `index.html` redirects into `introduction.html`.

## The tutorial sequence

| World | Teaches |
|---|---|
| `introduction.html` | What webspaces are: static HTML on GitHub Pages, one script tag, fork-to-create workflow; links the launch blog post ("Rebooting the Web in 3D with Webspaces"). |
| `hello-world.html` | Minimal world (two text labels); wandering; `/` create menu; that others can join by URL. |
| `basic-controls.html` | WASD + mouse look, Shift mouse lock, Space jump / hold-to-shoot equipped emoji, mobile pinch/drag, side menu. |
| `manipulating-objects.html` | Right-click-drag move, TAB move mode, Space floor-snap, Q/E rotate, T/G reorient, 1/2/3 axis moves, Ctrl-drag/C clone, L unlock, `~` voxel editor. A staging area of draggable voxel furniture. |
| `media-support.html` | Media types: .vox → SmoothVoxels, YouTube in `<video>`, image paste/drag/`/`-menu, `.glb` models; links the SVOX playground (svox.glitch.me). |
| `imported-image-example.html` | A giant voxel object made from an image via the SVOX playground; painting on voxels with the [V] brush in attach mode. |

Each file demonstrates the document format for real — engine include, `webspace.environment.*`
meta tags with distinct seeds/palettes, spawn transforms, owner keys, and bodies full of positioned
`<label>`, `<model>`, `<img>`, `<video>`, `<marquee>`, and emoji `<div>` elements with `assets/`
alongside. They double as the best integration-test corpus in the project.

## Also hosted here

- `webspace.service.js` + `webspace.service.1.0.1.js` — the COEP service worker users copy next to
  their own worlds ([21](21-workers-wasm.md), [22](22-meta-tags-and-service.md)).
- `assets/` — the tutorial worlds' media (svox models, images, glb).

## Why this matters for onboarding

If you change the engine, open these worlds against your local build (swap the script src to
`http://localhost:8080/assets/js/index.js`) — they exercise terrain, media, text, voxels, flat/
spatial projection, and writeback markup in a few clicks. The site was updated the same day as the
final engine commit (2025-12-05), so it reflects the engine's last known-good state.

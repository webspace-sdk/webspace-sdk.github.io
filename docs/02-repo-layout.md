# 02 — Repository Layout

This working folder (`C:\Users\gfodo\webspaces`) contains five independent git repositories, all under
the **github.com/webspace-sdk** organization. One is the product; the rest are its forks and its
public face.

```
webspaces/
├── webspace-engine/          ← THE project. The engine itself.
├── webspace-sdk.github.io/   ← Public site (webspaces.space): tutorials that are themselves webspaces.
├── networked-aframe/         ← Fork of NAF (multiplayer entity sync), branch webspaces/master.
├── quill/                    ← Fork of the Quill rich-text editor, used for in-world text pages.
├── smoothvoxels/             ← Fork/home of the Smooth Voxels (.svox) library used for voxel models.
└── docs/                     ← This documentation (not a repo of its own).
```

## webspace-engine — the main repo

- **What**: The complete client engine. A single webpack bundle (`index.js`) that, when included from a
  `<script>` tag in any HTML file, turns that file into an editable multiplayer 3D world.
- **Size**: ~563 files, ~85,000 lines of JS/JSX under `src/`.
- **License**: MPL-2.0. Version `0.9.0`.
- **Lineage**: Derived from Mozilla Hubs by way of the author's intermediate project **Jel**
  (you will see `jel` in dependency branch names like `three-ammo#jel/master` and in domains like
  `cors-proxy.jel.app`). Much Hubs DNA remains: A-Frame ECS, `hubs-systems`, Ammo.js physics,
  the naming of "hubs" for worlds.
- **History**: 11,076 commits (includes Hubs history). Last commit 2025-12-05
  (`e9ca4b206` — "Fix YouTube resolution failures causing game freeze"). Late history shows dead-code
  removal, Draco support, GLB walkability, YouTube.js migration — i.e. active polish right up to pause.
- **Layout** (`src/`):
  - `index.js`, `init.js`, `App.js`, `aframe-dom.js`, `scene-entry-manager.js` — boot & core (see [05](05-boot-sequence.md))
  - `systems/` — game systems (see [07](07-systems.md))
  - `components/` — A-Frame components (see [08](08-components.md))
  - `ui/` — React UI (see [14](14-ui-layer.md))
  - `writeback/` — persistence to disk/GitHub (see [12](12-writeback.md))
  - `storage/` — local stores (see [12](12-writeback.md))
  - `terra/` — procedural terrain (see [17](17-terrain.md))
  - `objects/`, `materials/`, `effects/`, `loaders/`, `fonts/` — rendering (see [19](19-rendering.md))
  - `workers/`, `worklets/`, `wasm/` — off-main-thread code (see [21](21-workers-wasm.md))
  - `utils/` — ~everything else: world importer/exporter, channels, DOM serialization, media utils
  - `assets/` — images, models, sounds, translations, stylesheets
- Root oddities worth knowing: `svox.fbs` (FlatBuffers schema for voxel model serialization),
  `github-writeback.md` (user guide for GitHub token setup), `doc/todo.txt` (the paused work list),
  `doc/meta-dataflow.txt` (metadata flow notes).

## webspace-sdk.github.io — the public site

- Served at **webspaces.space** via GitHub Pages (`CNAME` file present).
- The clever bit: every tutorial page (`index.html`, `introduction.html`, `hello-world.html`,
  `basic-controls.html`, `manipulating-objects.html`, `media-support.html`) is itself a webspace —
  an HTML world that loads the engine. The docs are dogfood.
- Also hosts `webspace.service.js` (the service worker users copy next to their HTML file, needed
  for COEP headers / SharedArrayBuffer).
- 70 commits, last touched 2025-12-05 (same day as the engine — final session).

## networked-aframe — multiplayer sync fork

- Fork of [networked-aframe](https://github.com/networkedaframe/networked-aframe) on branch
  `webspaces/master`; last commit 2022-12-30 ("Bump p2pcf").
- Consumed by the engine via `"networked-aframe": "github:webspace-sdk/networked-aframe#webspaces/master"`.
- Notable additions visible at the root: `schema.fbs` + `NetworkedAframeSchema.ts` — FlatBuffers
  binary serialization of network updates (upstream NAF uses JSON). See [24](24-sibling-repos.md).

## quill — rich text editor fork

- Fork of Quill (branch checked out locally: `develop`; the engine consumes
  `github:webspace-sdk/quill#webspaces/master`). Last local commit 2022-07-06.
- Used for the in-world editable text pages/labels/banners (`media-text`), with deltas synced via Yjs.
  See [15](15-text-and-quill.md) and [24](24-sibling-repos.md).

## smoothvoxels — voxel model library

- The Smooth Voxels library (`.svox` format): voxel models with smoothing/deformation so they don't
  look like Minecraft blocks. Published to npm as `smoothvoxels@1.2.8`; engine depends on that version.
- Contains A-Frame and three.js integration entry points plus a meshing `worker.js`.
  See [16](16-voxels.md) and [24](24-sibling-repos.md).

## Other patched dependencies (not in this folder, but part of the picture)

The engine pins many GitHub forks under `webspace-sdk/` or `mozillareality/`:

| Dependency | Fork/branch | Why |
|---|---|---|
| `aframe` | `webspace-sdk/aframe#hubs-141-upgrade` | Hubs-era A-Frame with three r141 upgrade |
| `three` | `webspace-sdk/three.js#webspaces-patches-141-2` | Patched three.js r141 |
| `ammo.js` / `three-ammo` | `webspace-sdk/...#jel/master` | Physics (WASM Bullet) with Jel-era patches |
| `fast-vixel` | `webspace-sdk/fast-vixel` | Path-traced voxel renderer (thumbnails/preview) |
| `quill-emoji` | `webspace-sdk/quill-emoji#jel-master` | Emoji support in text editor |
| `phoenix` | `gfodor/phoenix-js` | Phoenix channels client (legacy Reticulum-era networking) |
| `meyda` | `webspace-sdk/meyda` | Audio feature extraction (lip sync) |
| `three-batch-manager`, `three-bmfont-text`, `anime`, `nipplejs`, `spritesheet.js` | `mozillareality/*` | Inherited Hubs forks |

If you ever need to rebuild from scratch, these GitHub-pinned deps are the fragile part — they must
still exist and resolve for `npm ci` to succeed.

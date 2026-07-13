# 05 — Boot Sequence: From `<script>` Tag to Enterable World

This is the step-by-step story of what happens when a browser opens a webspace HTML file. All paths
are relative to `webspace-engine/`.

## The cast

| File | Role |
|---|---|
| `src/index.js` (~1,270 lines) | Bootstrap: patching, capture, scene creation, pause logic, quality scaling |
| `src/init.js` (~510 lines) | Network stack: hub join, presence, datachannel handlers, position tracking |
| `src/App.js` | Global app object (`window.APP`): store, quality/detail level |
| `src/aframe-dom.js` | The entire A-Frame scene as a hardcoded XML string (cursors, avatar rig, NAF templates) |
| `src/scene-entry-manager.js` | Gate between "loaded" and "playing": avatar spawn, media event handlers |
| `src/utils/world-importer.js` | Parses the captured HTML into networked 3D entities |

## Step by step

### 1. Script load & patching (`src/index.js`)

A DOMContentLoaded listener calls `start()` (registered near `src/index.js:1263`). Before and during
early startup:

- `seedrandom("base")` seeds the RNG — **determinism matters** because entity IDs must match across clients.
- WebGL context is patched to detect software rendering (SwiftShader), which drives initial quality.
- three.js is patched to never dispose shader programs (`patchThreeNoProgramDispose`).
- `window.APP = new App()` is created — the global hub for store, quality, scene reference.
- `THREE.Object3D.DefaultMatrixAutoUpdate = false` (index.js:187) — matrices are updated manually
  engine-wide; this is a pervasive performance assumption inherited from Hubs.
- Platform detection (OS, browser, mobile/VR) sets flags used everywhere (`isBotMode`, `isDebug`, etc.).

### 2. Capture the user's HTML, hide it behind a shadow root (`src/index.js:920–962`)

The load-bearing trick of the whole project:

```js
const initialWorldHTML = `<!DOCTYPE html>\n<html><body>${document.body.innerHTML}</body></html>`;
window.DOM_ROOT = document.body.attachShadow({ mode: "open" });
AFRAME.selectorRoot = window.DOM_ROOT;
```

The author's plain HTML body — paragraphs, images, divs with CSS transforms — is snapshotted into a
string, then a **shadow root is attached to `<body>`**, which visually replaces the page content.
Everything the engine renders (the A-Frame scene, the React UI) lives inside that shadow root. The
original light-DOM body remains the durable, serializable document — the "file on disk" — while the
shadow DOM is the runtime view. A-Frame is pointed at the shadow root via `AFRAME.selectorRoot`.

### 3. Instantiate the A-Frame scene (`src/aframe-dom.js`)

`aframe-dom.js` exports one big XML string containing the whole static scene:

- `<a-scene embedded effects hubs-systems renderer="webgl2: true; colorManagement: true" …>`
- Two cursor entities (left/right) with kinematic physics bodies and billboard visuals.
- The **avatar rig** (`#avatar-rig`): POV camera node at y=1.6, left/right controller entities with
  teleporter components, and a skinned glTF avatar model with IK controller, nametag, audio source.
- A separate **viewing rig** for spectator/flat cameras.
- The NAF `<template>` elements: `#remote-avatar`, `#interactable-media`, `#static-media`, etc. —
  the blueprints every networked entity is stamped from.

It's appended into `DOM_ROOT`, and boot awaits its `nodeready` event.

### 4. Managers wired onto `window.APP` (`src/index.js:155–180`)

| Manager | Purpose |
|---|---|
| `accountChannel`, `dynaChannel`, `spaceChannel`, `hubChannel` | Metadata/state channels (Reticulum-era names; now largely DOM/P2P-backed — see [13](13-collaborative-editing.md)) |
| `atomAccessManager` | Permissions: who may edit, upload, spawn (see [10](10-networking.md), [12](12-writeback.md)) |
| `editRingManager` | Coordinates concurrent voxel editing across clients |
| `hubMetadata` / `spaceMetadata` / `voxMetadata` | Metadata sources feeding the UI |

### 5. Physics + scene loaded

When the scene fires `loaded`, `initPhysicsThreeAndCursor(scene)` runs (index.js:1180–1184) — Ammo.js
(WASM Bullet) is synced with the three.js scene graph and cursor raycasting starts.

### 6. Join the hub & configure networking (`src/init.js:250–359`)

`joinHub()` / `joinHubChannel()`:

1. Resolve hub (world) metadata — geometry type, spawn point, **worker URL** (the Cloudflare worker used for P2P signaling).
2. Configure NAF: `scene.setAttribute("networked-scene", { room: hub.hub_id, adapter: "p2pcf", app: "webspace", adapterOptions: { workerUrl } })`.
3. Subscribe to NAF datachannel messages: `chat`, `reactji`, `emoji_launch`/`emoji_burst`,
   `update_hub_meta`, `update_vox_meta`, `edit_ring_message`, `upload_asset_request`,
   and `challenge`/`challenge_response` (Ed25519 identity challenges — see [10](10-networking.md)).

### 7. Import the document into the world (`src/init.js:279–290`)

```js
scene.systems.networked.pause();                       // avoid races
new WorldImporter().importHtmlToCurrentWorld(initialWorldHTML, true, true).then(() => {
  scene.systems.networked.play();
  scene.addState("document-imported");
});
```

`WorldImporter` (`src/utils/world-importer.js`) parses the captured HTML with `DOMParser`, converts
each qualifying body child into a networked A-Frame entity, translating CSS 3D transforms into
three.js transforms (`translate3d` cm→m, `rotate3d` deg→rad, `scale3d`). Details in
[06 — DOM ↔ 3D mapping](06-dom-to-3d.md).

**Deterministic IDs** (index.js:827–867): each element's ID is derived from
`SHA-256(el.outerHTML + index)` fed into a seeded RNG, producing a 7-char alphanumeric ID. Identical
HTML yields identical IDs on every client, so peers agree on entity identity with zero coordination.
Networked elements get the `naf-` prefix.

### 8. Presence (`src/init.js:361–453`)

`initPresence()` binds the P2P presence list to the UI and avatar system: join/leave/rename events
emit `client-presence-updated`, post chat log entries (suppressed above 12 occupants), and dirty the
avatar renderer.

### 9. Enter the scene (`src/scene-entry-manager.js`)

`entryManager.enterScene(false)` then:

- `_setupPlayerRig()` — applies profile (name, avatar colors) to the rig.
- `_setupMedia()` — registers the big family of creation events: `add_media` (URL/File → object),
  `add_media_text` (page/label/banner), `add_media_emoji`, `add_media_vox`,
  `add_media_exploded_pdf`, plus `action_share_screen` / `action_share_camera` for WebRTC capture.
    Also drag-drop and paste handlers.
- `_spawnAvatar()` — creates the networked avatar entity so peers see you.
- `scene.addState("entered")` — systems that wait for entry (audio, input) go live.

Finally the React UI remounts with `isDoneLoading: true` and the user is standing in the world.

### 10. Post-boot quality scaling (`src/index.js:~402–567`)

- Boots at **detail level 3** (lowest) for fast first paint; when the initial terrain-chunk CPU spike
  ends (`terrain_chunk_cpu_spike_over` event), quality is boosted (detail 0 on hardware GL, pixel
  ratio raised) and `autoQualitySystem` starts tracking frame rate to degrade gracefully.
- Detail levels: 0 = full effects, 1 = no reflections, 2 = no FXAA, 3 = software-safe minimum (no SSAO/FXAA).
- On tab blur the entire scene pauses (A-Frame ticks, render loop, audio clock) to save CPU/battery —
  with a platform-dependent debounce (0ms Linux, 5s elsewhere).

### Flat projection mode

Documents that are "pages" rather than "worlds" render in `PROJECTION_TYPES.FLAT`: the same engine
runs, but with an orthographic camera and 2D-page styling (UI gets the `projection-flat` class). This
is how a webspace can double as a normal-looking web page. (Several todo.txt items relate to polishing
flat mode.)

### The service worker (`src/webspace.service.js`)

Users copy `webspace.service.js` next to their HTML file. It's tiny: it intercepts fetches and adds
`Cross-Origin-Embedder-Policy: credentialless` / `Cross-Origin-Opener-Policy: same-origin` /
`Cross-Origin-Resource-Policy: cross-origin` headers so **SharedArrayBuffer** works on static hosts
(needed for WASM threading / audio worklets). It is versioned (`webspace.service.1.0.1.js`) for cache
busting and only registers on non-`file:` origins; `file://` worlds work without it.

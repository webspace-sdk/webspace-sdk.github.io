# 09 — Media Pipeline: How a URL Becomes an Object

The path from "user pastes a URL / drops a file / the importer meets an `<img>`" to "textured,
physical, networked object in the world".

## Overview

```
URL / File / Clipboard / <element in document>
   │
   ▼
scene-entry-manager media events (add_media, add_media_text, add_media_vox, …)
   │        └── or WorldImporter during document import
   ▼
entity stamped from NAF template (#interactable-media …) with media-loader
   │
   ▼
media-loader: URL resolution → CORS preflight/proxy → content-type detection
   │
   ▼
media-presence-system: distance gate (HIDDEN / PENDING / PRESENT, ≤4 concurrent loads)
   │
   ▼
type-specific view component (media-image / media-video / media-pdf / media-text / media-vox / media-emoji / media-audio / media-stream)
   │
   ▼
geometry + material + physics shape + hover menu + networked sync + DOM serialization
```

## Entry points (`src/scene-entry-manager.js:166–419`)

Scene events registered at entry:

- `add_media` — generic URL/File. Files are uploaded to the writeback origin's `assets/` folder
  (or offered to peers via `upload_asset_request` if you lack upload rights).
- `add_media_text` — creates a Quill text object (contentSubtypes: page, label, banner).
- `add_media_emoji`, `add_media_vox`, `add_media_exploded_pdf`.
- `action_share_screen` / `action_share_camera` — WebRTC capture into a `media-stream` entity.
- Drag-drop and paste handlers route here too (`paste-system`).

Object provenance is tracked via `src/object-types.js`: origins URL / FILE / CLIPBOARD / SPAWNER
crossed with content class (IMAGE, VIDEO, PDF, MODEL, …) inferred from MIME prefix.

## URL resolution & type detection (`src/utils/media-utils.js`)

- `preflightUrl()` — canonicalizes, checks CORS, and falls back to the configured CORS proxy
  (late commits switched to a **Cloudflare CORS proxy**).
- `guessContentType()` — extension first, then HEAD request `Content-Type`.
- YouTube URLs resolve through **youtubei.js** (`YouTube.js`) — the final commit in the repo fixed
  YouTube resolution failures that froze the game.
- Thumbnails historically via the Hubs "nearspark" thumbnail server (legacy `.defaults.env` entry).

## Distance-based presence (`src/systems/media-presence-system.js`)

Media far from the player isn't loaded at all:

- States: `PRESENT`, `HIDDEN`, `PENDING`.
- Beyond ~17 units, new media starts HIDDEN; approach promotes to PRESENT; retreat past ~25 demotes.
- At most 4 concurrent transitions, staggered over frames, to avoid load hitches.

## Per-type handling (`src/components/media-views.js` unless noted)

| Type | Pipeline notes |
|---|---|
| **Image** | HubsTextureLoader; Basis/KTX2 GPU-compressed formats supported ([19](19-rendering.md)); animated GIF via canvas-swapping GIFTexture; aspect-preserving chiclet plane; equirect images can feed the environment map. Known todos: transparent PNG black background, local GIF paste/unpack bugs. |
| **Video** | Direct `<video>` for MP4/WebM; **hls.js** for HLS; **dashjs** for DASH; YouTube via youtubei.js. VideoTexture on a plane, hover menu play/pause/volume, networked `time`/`videoPaused` (non-authorized: anyone can play/pause), spatialized audio. |
| **Audio** | THREE positional audio + speaker icon billboard. |
| **PDF** | pdfjs-dist renders the current page into a pooled canvas (`src/utils/pdf-pool`); `index` (page) is networked; "exploded" mode spawns each page as an object. |
| **Text** | Quill document rendered to texture; content synced as Yjs deltas, not as texture. [15](15-text-and-quill.md) |
| **VOX/SVOX** | Registered with VoxSystem; meshed in a worker; instanced; editable. [16](16-voxels.md) |
| **glTF/GLB** | `gltf-model-plus` with ref-counted cache; Draco decode supported; can contribute walkable geometry (floor/wall colliders from GLBs was among the last features). |
| **Emoji** | Voxelized through voxmoji atlas instancing. |
| **Stream** | Screen/camera share; snap position/scale for screen share still a todo. |

## What every media object gets

- **Physics**: `body-helper` + auto box/hull shape; un-owned bodies kinematic.
- **Interaction**: `tags` (holdable, remote-constraint), hover menu, hoverable glow.
- **Networking**: stamped from `#interactable-media` schema (`src/network-schemas.js`) — transform +
  media fields sync; `locked` prevents casual edits.
- **Persistence**: `dom-serialized-entity` mirrors it into the light DOM as the right tag
  ([06](06-dom-to-3d.md)); uploads live in `assets/` next to the HTML.
- **Spawn flair**: scale-in animation + particle loader + sky beam (skippable via `skipLoader`).
- **Undo**: registered with the undo system.

## Upload flow

With writeback active, `atomAccessManager.uploadAsset(fileOrBlob)` writes into `assets/` (local dir
or GitHub repo). Without upload rights, `upload_asset_request` over the data channel asks a
privileged peer to store it (permission `upload_files`). The returned relative URL
(`assets/<name>`) is what lands in the document — worlds stay self-contained and portable.

# 04 — Architecture Overview

One page to hold the whole system in your head. Everything here is expanded in the numbered docs.

## The core inversion: the document is the world

A traditional engine loads a scene file into memory and the file format is an implementation detail.
Webspaces inverts this: **an ordinary HTML document is the persistent world state**, and the engine
is a runtime view over it.

```
        ┌──────────────────────────────────────────────────────────────┐
        │ your-world.html  (light DOM — durable, serializable, shared) │
        │   <head>: <script src=webspace.run>, webspace.* meta tags    │
        │   <body>: <img>, <video>, <model>, <label contenteditable>…  │
        └───────────────┬───────────────────────────▲──────────────────┘
             snapshot → │ WorldImporter             │ DomSerializeSystem
                        │ (HTML → entities)         │ (entities → HTML)
        ┌───────────────▼───────────────────────────┴──────────────────┐
        │ shadow root on <body>  (window.DOM_ROOT — runtime view)      │
        │   <a-scene> + NAF templates + React UI (#react-root)         │
        └──────┬─────────────────┬───────────────────┬─────────────────┘
               │                 │                   │
        A-Frame ECS          React UI         networked-aframe (NAF)
     (~58 systems ticked   (panels, HUD,      p2pcf adapter: WebRTC mesh,
      in explicit order     popups, tree       Cloudflare Worker signaling,
      by hubs-systems)      navigation)        FlatBuffers messages
               │                                     │
        Ammo.js physics                    Yjs CRDTs (text) + edit rings
        (worker + SAB)                     presence, voice, visemes
                                                     │
        ┌────────────────────────────────────────────▼─────────────────┐
        │ Writeback (AtomAccessManager + MutationObserver, ≤1 write/10s)│
        │   file:  File System Access API → write HTML + assets/ dir   │
        │   https: GitHub API (Octokat) → blob/tree/commit/ref push    │
        └───────────────────────────────────────────────────────────────┘
```

## The five load-bearing mechanisms

1. **Snapshot + shadow root** (`src/index.js`). At boot the engine captures `document.body.innerHTML`,
   attaches a shadow root that visually replaces the page, and builds the world from the snapshot.
   The light DOM stays authoritative for persistence; the shadow DOM holds the A-Frame scene and the
   React UI. [05](05-boot-sequence.md)

2. **Deterministic entity identity** (`src/index.js:827`). Element IDs = seeded-RNG over
   `SHA-256(outerHTML + index)`, 7 chars. Every client derives identical network IDs from the same
   file, so multiplayer needs no ID authority. [06](06-dom-to-3d.md)

3. **Explicitly ordered ECS** (`src/systems/hubs-systems.js`). A-Frame is the component substrate, but
   ~50 systems are hand-instantiated and ticked in a fixed dependency order (input → animation →
   character → vox → targeting → physics → terrain/atmosphere → UI/avatar). A few systems keep
   ticking on a timer while the scene is paused. [07](07-systems.md)

4. **Serverless multiplayer** (`src/init.js`, networked-aframe fork). NAF with the `p2pcf` adapter:
   a Cloudflare Worker does peer discovery, everything else is a WebRTC mesh. Sync messages are
   FlatBuffers; epsilon thresholds gate transform updates; ownership is per-entity with master-client
   failover; identity is Ed25519 challenge/response against the owner key in the document's meta
   tags. Voice/screenshare ride the same peer connections. [10](10-networking.md), [11](11-voice.md)

5. **Writeback** (`src/utils/atom-access-manager.js`, `src/writeback/*`). A MutationObserver on the
   document marks it dirty; a throttled writer (≥10s between writes, flush on beforeunload)
   serializes and persists — to disk via the File System Access API for `file:` worlds, or as git
   commits via the GitHub API for hosted worlds. `DomSerializeSystem` continuously mirrors entity
   state (transforms as `translate3d(…cm) rotate3d() scale3d()` CSS) back into the light DOM so
   there is always something correct to save. Uploaded media lands in an `assets/` folder next to
   the HTML. [12](12-writeback.md)

## Subsystem map

| Subsystem | Where | Doc |
|---|---|---|
| Boot, capture, quality scaling | `src/index.js`, `src/init.js`, `src/App.js` | [05](05-boot-sequence.md) |
| HTML ↔ entity mapping | `src/utils/world-importer.js`, `src/systems/dom-serialize-system.js`, `src/aframe-dom.js` | [06](06-dom-to-3d.md) |
| Systems (input, character, camera, interact…) | `src/systems/` | [07](07-systems.md) |
| Components (media views, buttons, physics helpers…) | `src/components/` | [08](08-components.md) |
| Media pipeline (URL → object) | `media-loader`, `media-views`, presence culling | [09](09-media-pipeline.md) |
| Networking (NAF, p2pcf, presence, permissions) | `src/init.js`, `src/network-schemas.js`, NAF fork | [10](10-networking.md) |
| Voice, lip sync | `src/systems/audio-system.js`, worklets, WASM | [11](11-voice.md) |
| Writeback + storage | `src/writeback/`, `src/storage/`, `atom-access-manager` | [12](12-writeback.md) |
| Collaborative editing (Yjs, edit rings, tree sync) | `media-text-system`, `edit-ring-manager`, `tree-sync` | [13](13-collaborative-editing.md) |
| React UI | `src/ui/` | [14](14-ui-layer.md) |
| Text (Quill in-world) | `media-text`, quill fork | [15](15-text-and-quill.md) |
| Voxels (.vox/.svox, builder) | `vox-system`, `builder-system`, smoothvoxels | [16](16-voxels.md) |
| Terrain | `src/terra/`, `terrain-system` | [17](17-terrain.md) |
| Avatars | `avatar-system`, `ik-controller` | [18](18-avatars.md) |
| Rendering (batching, SSAO, curved world) | `src/effects/`, `src/materials/`, `src/objects/` | [19](19-rendering.md) |
| Physics | `physics-system`, three-ammo | [20](20-physics.md) |
| Workers/worklets/WASM | `src/workers/`, `src/worklets/`, `src/wasm/` | [21](21-workers-wasm.md) |

## Vocabulary you need immediately

- **hub** = one world = one HTML file. **space** = a set of worlds under an origin (a "site").
- **atom** = generic unit in the permission/metadata system (hub, space, or vox model).
- **writeback origin** = where the file lives and how we save to it (file handle or GitHub repo).
- **flat vs spatial projection** = the same document rendered as a 2D page vs a 3D world
  (`webspace.projection.type` meta tag).
- Full decoder ring: [27 — Glossary](27-glossary.md).

## Design tendencies worth internalizing

- **Everything prefers zero-server**: metadata in meta tags, permissions via public keys, discovery
  via one stateless worker, media via CORS proxies, search via legacy Reticulum endpoints (the one
  remaining server dependency, slated for removal in todo.txt).
- **Performance by relocation**: anything heavy runs off the main thread — physics, terrain
  generation, voxel meshing, lip sync — over transferables or SharedArrayBuffer.
- **Performance by batching**: instanced meshes for avatars/voxels/emoji, three-batch-manager for
  media, epsilon-gated network sync, throttled writes, distance-based media presence.
- **Hubs bones, Webspaces flesh**: when confused about a name, ask "is this a Hubs leftover?" —
  often the answer explains the weirdness (e.g. channel classes that no longer talk to a server).

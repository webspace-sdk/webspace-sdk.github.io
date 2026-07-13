# 27 — Glossary

The codebase speaks three dialects (Hubs, Jel, Webspaces). Decoder ring:

| Term | Meaning |
|---|---|
| **webspace** | One HTML file rendered as a multiplayer 3D world (or flat page). |
| **hub** | Hubs-era word for a single world. `hub_id`, `hubChannel`, `hubCan()` all mean "this world/document". |
| **space** | A collection of worlds under one origin — conceptually a site. Has an index document holding the nav tree. |
| **atom** | Generic unit in the metadata/permission system: a hub, a space, or a vox model. Hence `atomAccessManager`, atom metadata sources. |
| **Jel** | The author's pre-Webspaces project (Slack-like of 3D worlds); survives in dependency branches (`#jel/master`) and domains (`cors-proxy.jel.app`). |
| **Reticulum** | Hubs' Phoenix backend. Mostly excised; names remain (`phx-reliable`, `accountChannel`, media search API). |
| **Dialog** | Hubs' SFU voice server — replaced entirely by P2P WebRTC here. |
| **NAF** | networked-aframe, the entity sync library (forked, FlatBuffers + P2P). |
| **p2pcf** | "P2P over CloudFlare" — WebRTC signaling via a cheap Cloudflare Worker; the network adapter. |
| **worker URL** | The Cloudflare Worker endpoint a hub uses for p2pcf signaling (hub metadata). |
| **template** | `<template>` in `aframe-dom.js` from which networked entities are stamped (`#interactable-media`, `#remote-avatar`…). |
| **schema** | Per-template whitelist of networked components (`network-schemas.js`). |
| **ownership** | Which client simulates/broadcasts an entity; transferred on grab; master client adopts orphans. |
| **master writer** | The one client persisting the document to its origin. |
| **writeback** | Saving the serialized document (and `assets/`) to its origin: file handle or GitHub commits. |
| **origin** | Where the world's file lives (`file:` folder, GitHub repo). `originState` = credential/repo validity. |
| **edit ring** | Gossip membership protocol for live co-edited docs (Yjs text, vox deltas) over data channels. |
| **presence** | Who's connected + profile state; Yjs Awareness over NAF. |
| **persona / profile** | Display name + avatar color stored in presence and local store. |
| **projection type** | `spatial` (3D world) vs `flat` (2D page) rendering of the same document. |
| **flat mode / page** | A webspace rendered as a normal-looking web page. |
| **world tree / nav** | The hierarchy of a space's worlds, stored in the index HTML, shown in the left panel (rc-tree). |
| **vox** | A voxel model object (from .vox/.svox). `voxId = btoa(url)`. |
| **svox / Smooth Voxels** | The smoothed-voxel model format + library ([16](16-voxels.md)). |
| **voxmoji** | Emoji extruded into voxel objects (atlas-instanced). |
| **builder** | The in-world voxel editing mode (right panel toggle; flying enabled). |
| **launcher** | The emoji-blaster mode (hold Space to fire equipped emoji). |
| **equips** | Your saved emoji/color slots (local store). |
| **brush** | Voxel editing tool state: type/mode/shape/size/color/crawl/mirror (`constants.js`). |
| **terra** | The procedural terrain subsystem (`src/terra/`, terra.worker). |
| **chunk** | 64×64×256 terrain unit; 8 m square; world wraps at 8×8 chunks. |
| **vertex curving** | The shader that bends geometry over WORLD_RADIUS=1024 for the small-planet horizon. |
| **wrapped entity** | Object whose coordinates wrap with the toroidal world (`wrapped-entity-system`). |
| **detail level** | 0 (full) → 3 (software-safe) quality tier on `window.APP`. |
| **media presence** | Distance-based load state of media: HIDDEN / PENDING / PRESENT. |
| **chiclet** | The slightly-3D plane geometry used for image/media cards. |
| **hover menu** | In-3D context menu over media (video controls, PDF pager…). |
| **inspect** | Camera mode orbiting a focused object. |
| **duck / quack** | The ceremonial Hubs duck. Spawnable. Quacks. |
| **MSDF** | Multi-channel signed distance field text (nametags/labels), vs Quill canvas text. |
| **viseme** | Mouth-shape index derived from voice, synced by appending bytes to audio frames. |
| **AEC hack** | Chrome echo-cancellation workaround (loopback peer connection). |
| **COEP / credentialless** | Cross-origin isolation headers the service worker adds so SharedArrayBuffer works. |
| **DOM_ROOT** | The shadow root on `<body>` where the scene + UI actually live. |
| **light DOM** | The original document — the durable, serialized world state. |
| **deterministic IDs** | 7-char element IDs seeded from content hashes so peers agree without coordination. |
| **fast-vixel** | Path-traced voxel renderer fork used by the vox pipeline. |
| **three-batch-manager** | Hubs library batching many media meshes into few draws. |
| **hubs-systems** | The A-Frame system that instantiates and ticks all custom systems in order. |
| **action path** | Named input signal in the userinput framework (`/actions/...`), produced by device bindings. |

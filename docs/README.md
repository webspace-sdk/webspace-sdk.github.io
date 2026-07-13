# Webspaces Documentation

This folder is the onboarding manual for the **Webspaces** project — an ambitious system for creating
multiplayer, editable 3D worlds out of nothing but static HTML files. It was built by George Fodor
(gfodor) as an evolution of Mozilla Hubs (via the intermediate project "Jel"), and was paused
mid-flight; these docs exist so that anyone (including future-you) can get back up to speed rapidly,
top to bottom.

> **The one-sentence pitch:** a webspace is a plain `.html` file with one `<script>` include; opening
> it in Chrome renders the document as a walkable 3D world, editing the world edits the HTML, and the
> engine writes the HTML back to wherever the file lives (local disk via the File System Access API,
> or a GitHub repo via the API) while syncing everything peer-to-peer with no dedicated server.

## Reading order

Start at 01 and read in order for a full ramp-up, or jump straight to the area you need.

### Orientation
- [01 — What is Webspaces?](01-what-is-webspaces.md) — vision, lineage (Hubs → Jel → Webspaces), core ideas, project status.
- [02 — Repository layout](02-repo-layout.md) — the five repos in this folder and how they relate.
- [03 — Getting started as a developer](03-getting-started.md) — running the engine locally, creating a webspace, dev workflow.

### The engine, top-down
- [04 — Architecture overview](04-architecture-overview.md) — the big picture: DOM as the source of truth, ECS, networking, writeback.
- [05 — Boot sequence](05-boot-sequence.md) — from `<script src=…>` to an enterable world, step by step.
- [06 — The DOM ↔ 3D mapping](06-dom-to-3d.md) — how HTML elements become objects; webspace document format.
- [07 — Systems inventory](07-systems.md) — every system in `src/systems`, with deep dives on the big ten.
- [08 — Components inventory](08-components.md) — every A-Frame component in `src/components`.
- [09 — Media pipeline](09-media-pipeline.md) — how a URL/file becomes an image, video, PDF, model, or text page in-world.

### Networking & persistence
- [10 — Networking architecture](10-networking.md) — P2P via p2pcf/Cloudflare, NAF adapter, ownership, presence.
- [11 — Voice chat](11-voice.md) — WebRTC audio, worklets, lip sync/visemes.
- [12 — Writeback & persistence](12-writeback.md) — saving worlds back to disk and GitHub; the origin abstraction.
- [13 — Collaborative editing](13-collaborative-editing.md) — Yjs + Quill rich text sync, metadata dataflow.

### Front end
- [14 — UI layer](14-ui-layer.md) — the React app, panels, dialogs, HUD, popups, i18n, storybook.
- [15 — Text & Quill](15-text-and-quill.md) — in-world rich text pages, the Quill fork, rendering text to textures.

### 3D specialities
- [16 — Voxels & SmoothVoxels](16-voxels.md) — VOX editing, the .svox format, the smoothvoxels library, voxmoji.
- [17 — Terrain](17-terrain.md) — procedural terrain (`src/terra`), chunking, workers, water/sky/environment.
- [18 — Avatars](18-avatars.md) — avatar construction, customization, animation.
- [19 — Rendering pipeline](19-rendering.md) — three.js fork, batching, effects, materials, text rendering.
- [20 — Physics](20-physics.md) — Ammo.js/three-ammo integration, character controller.
- [21 — Workers, worklets & WASM](21-workers-wasm.md) — everything running off the main thread.

### Public surface & ecosystem
- [22 — Configuration surface](22-meta-tags-and-service.md) — `webspace.*` meta tags, attributes, query params, the COEP service worker, runtime globals.
- [23 — The docs/tutorial site](23-sdk-site.md) — webspace-sdk.github.io and the example worlds.
- [24 — Forked & sibling repos](24-sibling-repos.md) — quill, networked-aframe, smoothvoxels forks; what changed and why.
- [25 — Build, deploy & release](25-build-deploy.md) — webpack, S3/webspace.run deployment, versioning.

### Wrap-up
- [26 — Known issues & unfinished work](26-unfinished-work.md) — the todo list, rough edges, where work stopped.
- [27 — Glossary](27-glossary.md) — Hubs/Jel/Webspaces jargon decoder.

### Looking outward
- [28 — Webspaces × Atrium](28-atrium-integration.md) — analysis of Tony Parisi's Atrium (glTF browser with multiplayer) and concrete integration paths.

## Quick facts

| | |
|---|---|
| Main repo | `webspace-engine` (~563 source files, ~85k lines of JS under `src/`) |
| License | MPL-2.0 |
| Last engine commit | 2025-12-05 (`e9ca4b206` "Fix YouTube resolution failures causing game freeze") |
| Lineage | Mozilla Hubs → Jel → Webspaces |
| Org | github.com/webspace-sdk |
| Public site | https://webspaces.space (served from `webspace-sdk.github.io`) |
| Engine CDN | `webspace.run` S3 bucket (`webspace-latest.js`) |

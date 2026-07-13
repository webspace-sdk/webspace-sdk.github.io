# 01 — What is Webspaces?

## The idea

Webspaces makes 3D multiplayer worlds out of **plain HTML files**. Not "HTML that describes a scene
for a server to host" — the HTML file *is* the world, the way an HTML file *is* a web page:

- You create a `.html` file with a single `<script src="https://webspace.run"></script>` include.
- Opening it in Chrome renders the document as a walkable, first-person 3D world.
- The `<body>`'s children are the world's objects: an `<img>` is a floating picture, a `<video>` is a
  screen (YouTube URLs work), a `<model type="model/vnd.svox">` is a voxel sculpture, a
  `<label contenteditable>` is an editable rich-text sign. Position, rotation, and scale are ordinary
  CSS 3D transforms (`translate3d(…cm) rotate3d(…) scale3d(…)`).
- Everyone who opens the same URL is **in the world together** — avatars, voice chat, live editing —
  with no game server: peers find each other through a tiny Cloudflare Worker and talk over WebRTC.
- Edits made in-world (dragging objects, typing text, sculpting voxels) mutate the DOM, and the DOM
  is **written back** to wherever the file lives: your local disk (File System Access API) or a
  GitHub repo (commits via the API). Host on GitHub Pages and your world is published, versioned,
  and forkable.

The tagline used publicly was **"Rebooting the Web in 3D"**: bringing the original properties of the
web — view-source, copy-and-tweak, static hosting, no lock-in — to 3D social spaces.

## Lineage: Hubs → Jel → Webspaces

The engine is a heavily evolved descendant of **Mozilla Hubs** (the open-source social-VR platform),
by way of the author's intermediate project **Jel** ("the communication tool for people who make
things" — a Slack-like of 3D worlds). The migration path explains most of what you'll see in the code:

| Inherited from Hubs | Replaced/added in Jel & Webspaces |
|---|---|
| A-Frame ECS, `hubs-systems` tick orchestration | DOM-as-world-document model, shadow-DOM isolation |
| Ammo.js physics, media loader, interaction system | P2P networking (p2pcf on Cloudflare) instead of Reticulum/Dialog servers |
| Reticulum-era names: "hub" (a world), channels, presence | Writeback to file/GitHub instead of server-side storage |
| Avatar rig, IK, nametags | Procedural voxel terrain, in-world voxel editor (SmoothVoxels), instanced toon avatars |
| React UI shell | Quill+Yjs collaborative text, world-tree navigation, emoji launcher |

You will constantly encounter all three vocabularies: `hub` = a world, `space` = a collection of
worlds (a site/folder of pages), `atom` = the generic unit (hub/space/vox) in the permission system,
and `jel`/`reticulum`/`dialog` in leftover names and dependency branches. See the
[glossary](27-glossary.md).

## What makes it technically interesting

1. **The DOM is the scene graph's source of truth.** The engine snapshots `document.body`, attaches a
   shadow root over it, renders the world from the snapshot, and serializes runtime changes back into
   the light DOM. Saving a world = saving an HTML file. View-source works.
2. **Deterministic identity without a server.** Entity IDs are seeded hashes of element HTML, so any
   two clients loading the same file independently agree about every object's network identity.
3. **Serverless multiplayer.** Peer discovery uses `p2pcf` (a Cloudflare Worker + WebRTC); state sync
   is networked-aframe with FlatBuffers serialization; text is Yjs CRDTs gossiped over data channels;
   voice is direct WebRTC with WASM noise-gating and lip-sync viseme extraction.
4. **Ownership via cryptography, not accounts.** A world's `<head>` embeds the owner's public key in a
   `<meta name="webspace.keys.owner">` tag; clients prove identity by Ed25519 challenge/response over
   the data channel. Permissions (`content_change_role` etc.) are also meta tags.
5. **A full game engine in one JS file**: procedural terrain with a curved-world shader, voxel
   sculpting with undo and multiplayer edit rings, physics in a worker over SharedArrayBuffer,
   instanced avatars, SSAO/FXAA postprocessing, MSDF text, PDFs, HLS/DASH video, screen share.

## Project status (as of the last commits, 2025-12-05)

The project reached a polished 0.9 state and was paused. What exists and works:

- The full engine (`webspace-engine`), deployable as one script to `webspace.run`.
- The public tutorial site (`webspaces.space`) whose docs pages are themselves webspaces.
- File and GitHub writeback, multiplayer, voice, terrain, voxel editing, text editing.

What was left undone is catalogued in [26 — Unfinished work](26-unfinished-work.md): mobile/tablet
polish, PWA support, iOS quirks, a batch of voxel-editor UX items, dead-code cleanup of remaining
Hubs infrastructure, and launch content (blog post, READMEs, tweet thread — i.e. it was paused close
to, but before, a public push).

## Where to go next

- Hands-on: [03 — Getting started](03-getting-started.md)
- Big picture: [04 — Architecture overview](04-architecture-overview.md)
- The whole doc map: [README](README.md)

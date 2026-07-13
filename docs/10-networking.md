# 10 — Networking Architecture

How N browsers looking at the same HTML file become one shared world with no dedicated game server.

## Topology

```
                   Cloudflare Worker  (p2pcf signaling — the only "server")
                    ▲    ▲    ▲   (worker URL from hub metadata / meta tags)
        signaling   │    │    │
              ┌─────┘    │    └─────┐
           Browser A ⇄ Browser B ⇄ Browser C     full WebRTC mesh
             (data channels: entity sync, chat, edit rings, challenges;
              media tracks: voice, screen share)
```

- **Adapter**: `p2pcf` — configured in `src/init.js:336–344` via
  `scene.setAttribute("networked-scene", { room: hub.hub_id, adapter: "p2pcf", app: "webspace", adapterOptions: { workerUrl } })`.
  P2PCF is a Cloudflare-Workers-based signaling scheme (cheap, stateless); after discovery, peers
  are a direct WebRTC mesh. TURN configuration in the document was still a todo.
- **Legacy layer**: Phoenix/Reticulum plumbing (`src/utils/phoenix-utils.js`, `accountChannel`,
  media search) survives from Hubs; `NAF.options.syncSource = "phx-reliable"` names persist. The
  todo list marks most of it for removal. No Reticulum is needed to run a world.

## Entity sync: the networked-aframe fork

The fork (`networked-aframe` repo here, branch `webspaces/master`) replaces upstream NAF's JSON
protocol with **binary FlatBuffers** (`schema.fbs`): a `Message` union of `SceneUpdate`
(UpdateOp/DeleteOp), `CustomOp`, doc-sync ops, and `PresenceUpdate`. Component values are nested
**FlexBuffers**; custom data is MessagePack. Key source: `src/NetworkConnection.js`,
`src/NetworkEntities.js`, `src/adapters/P2PCFAdapter.js`, `src/Lerper.js` (interpolation).

Concepts:

- **Templates**: entities instantiate from the `<template>`s in `aframe-dom.js`; local vs remote
  copies get different behavior.
- **Schemas** (`webspace-engine/src/network-schemas.js`): whitelists of synced components per
  template with **epsilon gating** — position syncs only on >1 mm change, rotation >0.5 rad, so
  continuous motion costs ~1–2 updates/s. Avatar schema also syncs camera + controller poses;
  media schema syncs `media-loader` fields, text deltas, video time (non-authorized), PDF page.
- **Ownership**: each entity has one owner who simulates and broadcasts it; `takeOwnership()`
  transfers (grabbing an object takes it). Non-owned bodies are kinematic. A **master client**
  adopts persistent entities when their creator leaves.
- **Deterministic IDs**: network IDs derive from document content ([06](06-dom-to-3d.md)), so peers
  loading the same file agree on identity without negotiation.

## Data channels (`src/init.js:116–250`)

| Channel | Purpose | Permission |
|---|---|---|
| `chat` | chat messages | — |
| `reactji` | emoji reactions at an avatar | — |
| `emoji_launch` / `emoji_burst` | projectile playback | — |
| `update_hub_meta` | world metadata changes | `update_hub_meta` |
| `update_vox_meta` | voxel model metadata | `edit_vox` |
| `update_nav` | space tree / index HTML updates | `edit_nav` |
| `edit_ring_message` | Yjs deltas + doc sync ([13](13-collaborative-editing.md)) | — |
| `upload_asset_request` | ask a privileged peer to store an asset | `upload_files` |
| `challenge` / `challenge_response` | Ed25519 identity verification | — |

Send via `NAF.connection.broadcastCustomDataGuaranteed(type, payload)` or
`sendCustomDataGuaranteed(type, payload, clientId)`.

## Presence & identity

- **Presence** rides Yjs's Awareness protocol inside the NAF fork (`PresenceUpdate` messages).
  Per-client state: `{ profile: { displayName, persona.avatar.primary_color }, context,
  sync_ring_memberships }`. `initPresence()` (`src/init.js:361–453`) wires join/leave/update to UI
  and avatar rendering; join/leave chat notices are suppressed above 12 occupants.
- **Identity = keypair, not account.** Each client holds an ECDSA keypair in its local store
  (`src/storage/store.js` `credentials`). The world's owner public key is in the
  `webspace.keys.owner` meta tag. Peers verify claims via `challenge`/`challenge_response`
  signatures. There is no login.

## Permissions (`src/utils/atom-access-manager.js`)

Per-atom-type roles resolved from document meta tags (`webspace.permissions.*`) + verified identity:

- **HUB**: `update_hub_meta`, `spawn_and_move_media`, `upload_files`, `kick_users`, `fly`, …
- **SPACE**: `create_world_hub`, `edit_nav`.
- **VOX**: `edit_vox`.

Checked everywhere as `atomAccessManager.hubCan(...)` / `spaceCan(...)` / `voxCan(...)`.
`content_change_role` (owner|member) decides whether visitors may edit. Note the todo:
"authorize + sanitize in NAF adapter" — inbound-update authorization hardening was unfinished.

## What's synced by which mechanism (summary)

| State | Mechanism |
|---|---|
| Object transforms, media fields | NAF schemas (FlatBuffers, epsilon-gated) |
| Rich text | Yjs CRDT deltas over `edit_ring_message` |
| Voxel edits | delta ring via `editRingManager` + `update_vox_meta` |
| World/space metadata, nav tree | full-doc/metadata broadcasts (`update_hub_meta`, `update_nav`) |
| Voice, screen share | WebRTC media tracks (see [11](11-voice.md)) |
| Who's here, names, colors | Yjs Awareness presence |
| The document itself | writeback to origin ([12](12-writeback.md)) — late joiners just load the file |

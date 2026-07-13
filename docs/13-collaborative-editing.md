# 13 — Collaborative Editing: Yjs, Edit Rings, Tree Sync

Object transforms use last-write-wins NAF sync; **text** (and voxel edit streams) need real
convergence. That's handled by Yjs CRDTs gossiped through "edit rings".

## Yjs + Quill (`src/systems/media-text-system.js`)

Each text object owns a `Y.Doc` with a `Y.Text` named `"quill"`:

- The Quill editor binds to the Y.Text by deltas: Quill `text-change` → delta →
  `editRingManager.sendDeltaSync(networkId, delta)`; inbound deltas →
  `type.applyDelta(ops)` inside a transaction (origin-tagged to prevent echo loops) → Quill updates
  via the Y.Text observer.
- The system keeps parallel arrays per text component: component, Y.Text, Quill instance, observer
  fns. Rendering to texture is separate ([15](15-text-and-quill.md)).
- Persistence: the current content serializes into the document (`deltaOps` in the NAF schema and
  the label's HTML on writeback), so the CRDT is only needed while co-editing.

## Edit rings (`src/utils/edit-ring-manager.js`)

A lightweight membership protocol deciding who has the live doc, over the `edit_ring_message`
data channel:

- Per doc: `UNSYNCED` → `PENDING` (requested) → `SYNCING` (in the ring).
- Presence advertises ring membership: `presence.setLocalStateField("sync_ring_memberships",
  [{ doc_id }])`.
- Joining: if someone is already syncing the doc, request a **full doc** from the member with the
  highest clientId (`request_full_doc` → `receive_full_doc`, a serialized Y.Doc update); otherwise
  you're the genesis publisher.
- Steady state: only `delta` messages flow.
- **Tiebreaker**: simultaneous genesis before presence converges resolves by deferring to the higher
  clientId (tracked via `seenClientIdsInPresence` / `hasKnownGoodDocIds`), preventing doc
  bifurcation.

The same ring machinery coordinates **voxel co-editing** (`editRingManager` is also handed vox edit
deltas; VoxSystem keeps a 32-entry delta ring buffer per model and debounces writeback by 10s).

## Metadata & the world tree

Two DOM-backed metadata flows (sketched in `doc/meta-dataflow.txt`):

1. **Hub meta** — name, colors, spawn point: broadcast on `update_hub_meta` *and* written into the
   current document's meta tags; the MutationObserver + `LocalDOMHubMetadataSource` turn that into
   `hub_meta_refresh` UI events.
2. **Space meta / nav tree** — the hierarchy of worlds in a space lives in the space's *index*
   HTML document. `src/utils/tree-sync.js` fetches and parses it (`DOMParser`), tree edits mutate
   that document via DOM APIs, then it is **written back** (persist) and **broadcast** as
   `update_nav` (live peers rebuild via `tree-manager`, fire `treedata_updated`, and the rc-tree UI
   re-renders). Throttled ~3s by `dynaChannel.updateSpace`.

## Consistency model summary

| Data | Convergence strategy |
|---|---|
| Rich text | Yjs CRDT (true concurrent merge) |
| Voxel edits | ordered deltas via edit ring + full-model sync on join |
| Transforms/media fields | ownership + last-write-wins, epsilon-gated |
| Doc/nav metadata | single-writer broadcast + DOM as authority |
| The file itself | single master writer to origin ([12](12-writeback.md)) |

The design consistently avoids needing a server-side merge: either one owner exists (transforms,
writeback), or the data type is conflict-free (Yjs), or the whole state is rebroadcast (metadata).

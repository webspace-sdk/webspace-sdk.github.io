# Discussion: Webspaces × Atrium — a sibling project offering persistence, permissions, and a serverless tier

Hi Tony — I'm the author of [Webspaces](https://github.com/webspace-sdk/webspace-engine)
([webspaces.space](https://webspaces.space)), a descendant of Mozilla Hubs I built around one idea:
**a multiplayer 3D world is a plain HTML file.** One `<script>` include turns any static HTML
document into a walkable shared world; the DOM is the scene graph's source of truth
(import: [`world-importer.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/utils/world-importer.js),
export back to markup: [`dom-serialize-system.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/systems/dom-serialize-system.js));
in-world edits mutate the DOM and are written back to wherever the file lives — local disk via the
File System Access API or git commits via the GitHub API; multiplayer is serverless — a WebRTC mesh
with a stateless Cloudflare Worker for signaling. No accounts: the world's owner key lives in a
meta tag and clients prove identity by challenge/response.

I've spent some time reading Atrium end to end — README, the SOM/SOP packages, the session briefs
and the 2026-06-22 handoff — and I think we're building the same thesis in two dialects. SOM is
explicitly "DOM-inspired"; Webspaces uses the literal DOM. Your world config lives in
`extras.atrium`; mine lives in `webspace.*` meta tags. Your mutation events are the wire protocol;
my MutationObserver drives persistence. Your Seven Rules are the same rules Webspaces was built to
demonstrate, in HTML instead of glTF.

What makes this worth raising: **nearly every "🔜 Future" item on your status table is something
Webspaces has a working, shipped implementation of** — and the reverse is true too (Webspaces has
no protocol formalism, no schema validation, no server-authoritative option; Atrium has all three).
Concretely, matched to your roadmap, with pointers into the code:

### 1. Persistence (your roadmap: Future)
Webspaces' writeback subsystem maps almost verbatim onto Atrium: SOM already serializes the whole
world (`som-dump` *is* a save), so a `persistence` package could hang off SOM mutation events —
dirty-tracking, throttled writes, a single elected writer — and commit `space.gltf` + `assets/` to
a GitHub repo, or write it to disk. The pieces in Webspaces:

- [`src/writeback/github-writeback.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/writeback/github-writeback.js) —
  the full GitHub flow: create blob → fetch branch head → create tree → create commit → update ref,
  with origin-state validation (bad token / repo / path) and asset uploads into `assets/`.
- [`src/writeback/file-writeback.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/writeback/file-writeback.js) —
  the File System Access API twin (persistent directory handles in IndexedDB, permission
  re-prompting, blob-URL serving of local assets).
- [`src/utils/atom-access-manager.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/utils/atom-access-manager.js) —
  the orchestration: MutationObserver dirty-tracking, a 10s max-write-rate throttle
  (`MAX_WRITE_RATE_MS`), forced flush on `beforeunload`, and master-writer election so only one
  client persists.
- [`github-writeback.md`](https://github.com/webspace-sdk/webspace-engine/blob/master/github-writeback.md) —
  the end-user story: a fine-grained PAT scoped to one repo's Contents permission.

In Webspaces this means a world's history is literally its git history, which I think is the most
rules-compliant persistence story available: the creator owns the file, the repo, and the timeline.

### 2. Identity & permissions (your roadmap: Future; currently any client can mutate anything)
Webspaces' model needs no accounts and fits your document-first design: owner public key embedded
in the world document (a `webspace.keys.owner` meta tag — would map to `extras.atrium.keys.owner`),
per-client ECDSA keypairs kept in local storage
([`src/storage/store.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/storage/store.js)),
challenge/response at connect, and role metadata gating mutations — the permission matrix and
enforcement live in
[`atom-access-manager.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/utils/atom-access-manager.js)
as well. Your protocol looks like it's already waiting for this — `hello` reserves a `ticket` field
and the error schema includes `PERMISSION_DENIED` and `AUTH_FAILED` — and unlike my P2P setup, your
server gives enforcement a natural home in the `send` validation gate.

### 3. A serverless tier (static → P2P → server-authoritative)
Your degradation story is "static first, multiplayer second." Webspaces adds a middle rung I'd love
to see in Atrium: SOP is small transport-agnostic JSON, so it could ride a WebRTC mesh with
Cloudflare-Worker signaling — I use [p2pcf](https://github.com/gfodor/p2pcf); the working
integration is the adapter in my networked-aframe fork,
[`P2PCFAdapter.js`](https://github.com/webspace-sdk/networked-aframe/blob/webspaces/master/src/adapters/P2PCFAdapter.js).
The authority gap is solvable with master-client election — the elected peer runs your
(deliberately tiny, headless) world/server logic in-browser. An `.atrium.json` with no `server`
field could still be multiplayer, on static hosting, for free.

### 4. An HTML ⇄ glTF bridge + a content corpus
Both formats are "document + config-in-extras + positioned objects," so a faithful converter is
realistic: my meta tags ↔ your root extras, body elements ↔ named nodes, CSS
`translate3d/rotate3d/scale3d` ↔ node TRS (the mapping is exactly what
[`world-importer.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/utils/world-importer.js)
and
[`dom-serialize-system.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/systems/dom-serialize-system.js)
already implement in the HTML direction), media elements ↔ nodes with `extras.atrium.source`. That
would let existing webspaces open in the Atrium browser and SOM inspector — and would feed your
"real content stress testing" backlog item with an instant corpus of real worlds (the tutorial
worlds at [webspace-sdk.github.io](https://github.com/webspace-sdk/webspace-sdk.github.io) are a
ready-made starter set).

### 5. Experience-layer donations, when you get there
- **Voice**: Webspaces ships P2P WebRTC voice with WASM RNNoise VAD and a lip-sync trick — viseme
  bytes appended to encoded audio frames via insertable streams. The pipeline is
  [`src/systems/audio-system.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/systems/audio-system.js)
  + [`src/worklets/audio-forward.worklet.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/worklets/audio-forward.worklet.js)
  + [`src/workers/lipsync.worker.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/workers/lipsync.worker.js),
  with the frame-level viseme injection in the
  [P2PCF adapter](https://github.com/webspace-sdk/networked-aframe/blob/webspaces/master/src/adapters/P2PCFAdapter.js).
  It's already server-optional and could become an `@atrium/voice` package.
- **`ATRIUM_interactivity`**: Webspaces is a live catalog of the interaction policy that extension
  will need to express — grab/move with grid + angle snapping, stacking axes, axis-constrained
  moves ([`src/systems/transform-selected-object.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/systems/transform-selected-object.js)),
  locking, hover menus, and per-entity undo
  ([`src/systems/undo-system.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/systems/undo-system.js)).
  Happy to feed that into the design before the schema ossifies.
- **CRDTs**: when per-field last-write-wins isn't enough (collaborative text panels), Webspaces'
  Yjs-over-gossip-ring design is proven and portable:
  [`src/utils/edit-ring-manager.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/utils/edit-ring-manager.js)
  (ring membership, full-doc sync, clientId tiebreaking) +
  [`src/systems/media-text-system.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/systems/media-text-system.js)
  (Y.Text ↔ editor binding).
- **`ATRIUM_user_object`**: my media pipeline — image/video/PDF/rich-text/voxel object types behind
  one loader ([`src/components/media-loader.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/components/media-loader.js),
  [`src/components/media-views.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/components/media-views.js)) —
  is effectively a working draft of an object-type registry, and
  [`src/network-schemas.js`](https://github.com/webspace-sdk/webspace-engine/blob/master/src/network-schemas.js)
  shows what per-type networked property whitelists look like in practice.

### Proposed sequencing
I've read enough session briefs to know the house style is design-before-code, so I'd start by
drafting **two design briefs — persistence and permissions** — in your brief format, for discussion
before any code. If those land well, the HTML→glTF exporter is the demo that makes the relationship
concrete, and the deeper move after that is an SOP adapter inside webspace-engine — making it
exactly the third-party client your README invites, and proving SOP as an interop standard rather
than one app's protocol.

(And noted from the handoff doc that Session 47's camera work is mid-flight — nothing above goes
near the camera/nav paths.)

Is there interest, and if so, which thread would you want first?

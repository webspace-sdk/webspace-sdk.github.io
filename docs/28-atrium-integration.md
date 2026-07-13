# 28 — Webspaces × Atrium: Integration Analysis

Analysis of [tparisi/atrium](https://github.com/tparisi/atrium) (cloned at `atrium/`, last commit
2026-06-22) and the concrete ways Webspaces could join what Tony Parisi is building.

## What Atrium is

**"A glTF browser with multiplayer."** Point it at a `.gltf` and it renders; put a world server
behind it and it's a shared space. Built explicitly to follow Parisi's *Seven Rules of the
Metaverse*. Three layers:

- **Content**: standard glTF 2.0; world config in root `extras.atrium` (name, navigation modes,
  speeds, update rates); per-node `extras.atrium.source` for external references;
  `extras.atrium.playback` for animation state; `.atrium.json` manifest (gltf + ws:// server URL).
- **Protocol (SOP)**: ~13 JSON-schema-validated WebSocket messages — `hello`/`ping`/`tick`,
  `send` (client mutation request) → `set` (authoritative broadcast, session-tagged for loopback),
  `add`/`remove` (nodes, incl. avatar descriptors with inline mesh geometry), `view` (fire-and-
  forget avatar pose, rate-limited ~20 Hz), `join`/`leave` (presence), `som-dump` (full world glTF
  to late joiners).
- **Runtime (SOM)**: a **DOM-inspired Scene Object Model** over glTF-Transform — SOMNode/Mesh/
  Material/Camera/Light/Animation wrappers with typed accessors, `mutation` events, DOM-style
  `addEventListener`, `getObjectByName()` flat namespace, `setPath()` deep mutation
  (`mesh.primitives[0].material.baseColorFactor`), and DOM-like pointer events (`pointerdown`,
  capture, hover) dispatched onto SOM nodes. Same API on server and client; **the wire protocol is
  serialized SOM mutations**. ~432 tests; renderer-neutral headless client; Three.js glue isolated
  in `renderer-three` (glTF-Transform `DocumentView`); interaction *policy* isolated in
  `@atrium/interaction`.

Server-authoritative, last-write-wins by sequence number; avatars are client-authored "ephemeral"
nodes; the server is a ~500-line Node process; **no persistence, no permissions, no physics, no
voice yet** — all explicitly on the roadmap (with `ATRIUM_world` / `ATRIUM_interactivity` /
`ATRIUM_user_object` extensions ahead).

## The rhyme

The two projects are the same thesis in two dialects:

| | Webspaces | Atrium |
|---|---|---|
| The world is… | an HTML document | a glTF document |
| Live API over it | the actual DOM (+shadow-root runtime) | SOM, a "DOM-inspired" model |
| Change detection | MutationObserver → writeback | SOM mutation events → SOP `send` |
| World config | `webspace.*` meta tags | root `extras.atrium` |
| Sub-resources | `assets/` + element `src` | `extras.atrium.source` external refs |
| Multiplayer | serverless P2P (p2pcf/WebRTC, FlatBuffers NAF) | small authoritative WebSocket server (JSON SOP) |
| Consistency | per-entity ownership + Yjs CRDTs | server last-write-wins + seq |
| Identity/permissions | keypair in document meta, challenge/response | none yet (roadmap) |
| Persistence | writeback to file/GitHub | none yet (roadmap) |
| Engine surface | huge (terrain, voxels, voice, physics, text, media) | minimal, disciplined, tested |
| Status | feature-rich, paused 2025-12 | active (Session 47, June 2026), foundation-stage |
| Ethos | "Rebooting the web in 3D" — view-source, static hosting, own your file | Seven Rules — browser not platform, open formats, static first |

Webspaces is a maximal *experience* built on a document-as-world idea with no protocol formalism;
Atrium is a minimal, rigorously specified *protocol + object model* with almost no experience layer
yet. Nearly every gap in one is a strength of the other.

## Ways to bring Webspaces into the fold

Ordered roughly by leverage-per-effort.

### 1. Donate the persistence design (and code): glTF writeback
Atrium's biggest open hole vs. its own Rule of ownership — persistence is "🔜 Future" — is exactly
Webspaces' crown jewel. The writeback architecture ([12](12-writeback.md)) ports almost verbatim:
SOM already serializes the whole world (`io.writeJSON` — the som-dump path *is* a save), so wire an
`AtriumWriteback` module to the server (or a privileged client): dirty-tracking off SOM mutation
events, ≥10s throttle, master-writer election, then commit `space.gltf` (+ `assets/`) to a GitHub
repo via fine-grained PAT, or to disk via the File System Access API in a browser-hosted server.
"Your world's history is git history" is the most Seven-Rules-compliant persistence story
imaginable, and it's already proven in Webspaces. This is the highest-value, lowest-friction
contribution — a PR-sized project (`packages/persistence`?).

### 2. Donate the identity/permissions model
Atrium currently lets every connected client mutate everything; permissions are deferred with no
design yet. Webspaces' model ([10](10-networking.md)) needs no accounts and fits Atrium's document-
first ethos exactly: owner public key in the document (`extras.atrium.keys.owner` mirroring
`webspace.keys.owner`), client keypairs in local storage, Ed25519 challenge/response at `hello`,
role meta (`extras.atrium.permissions.content_change_role`) enforced at the server's `send`
validation gate — which, unlike P2P Webspaces, has a natural enforcement point. SOP already has
`PERMISSION_DENIED` and `AUTH_FAILED` error codes and a `ticket` field in `hello` reserved —
the protocol was built waiting for this. A design doc + reference implementation would likely be
welcomed.

### 3. Make webspace-engine an SOP client (the flagship move)
Atrium's README: *"if you want to build a client in a different renderer… everything you need is
here."* Webspaces can be that thousand-flowers client. Concretely: an `sop` adapter alongside the
`p2pcf` NAF adapter in webspace-engine — map `som-dump` → world import, `set`/`add`/`remove` →
entity updates, avatar rig → `view` messages + an `add`ed avatar descriptor, and expose Webspaces
objects by name to `getObjectByName` addressing. A webspace could then join an Atrium world server
(rich Webspaces client rendering an Atrium world), and Atrium's inspectors could debug a live
Webspaces session. Real caveats: webspace-engine's scene identity is name/hash-based DOM entities
vs. SOM's glTF node names (bridgeable — both are flat name namespaces), and the authority models
differ (Webspaces per-entity ownership vs. Atrium server authority — the adapter simply defers to
the server). This is the deepest integration but also the clearest demonstration that SOP is an
interoperable standard rather than one app's protocol.

### 4. Give Atrium a serverless tier
Atrium's degradation story is "static first, multiplayer second"; Webspaces adds the missing middle
rung: **static → P2P → server-authoritative**. Port the p2pcf transport (Cloudflare Worker
signaling + WebRTC mesh) as an alternate SOP carrier — SOP messages are small JSON and transport-
agnostic; the missing piece is authority, solvable with Webspaces' master-client election
(the elected peer runs the same `@atrium/server` world logic in-browser — feasible because the
server is deliberately tiny and the client package is headless/renderer-neutral). Result: an
`.atrium.json` with no `server` field could still be multiplayer, for free, on static hosting.
That's a capability Parisi's framing clearly wants and Webspaces has already de-risked.

### 5. An HTML ⇄ glTF world bridge
Both formats are "document + config-in-extras + positioned objects", so a converter is honest, not
lossy hackery: `webspace.*` meta tags ↔ root `extras.atrium`; body elements ↔ named nodes;
CSS `translate3d/rotate3d/scale3d` ↔ node TRS; media elements ↔ nodes with `extras.atrium.source`
(images/video as textured quads; `.glb` models directly; svox → glTF mesh export via the
SmoothVoxels generator, which already emits positions/normals/colors/indices). Two deliverables:
`webspace export space.gltf` (any webspace becomes viewable in Atrium and every other glTF tool —
a huge portability win for Webspaces content) and `<model src="world.gltf">` honoring
`extras.atrium` (Atrium worlds embedded inside webspaces). This also feeds Atrium's "real content
stress testing" roadmap item with an instant corpus.

### 6. Contribute subsystem experience where Atrium's roadmap is heading
- **Voice**: Atrium has none; Webspaces' WebRTC voice + RNNoise VAD + viseme-in-audio-frame trick
  ([11](11-voice.md)) could become an `@atrium/voice` package — it's already peer-to-peer and
  server-optional.
- **`ATRIUM_interactivity`** (awaits pointer bubbling): Webspaces is a live catalog of the
  interaction policy this extension must express — grab/move with snapping, stack axes, locking,
  hover menus, undo. Since Atrium deliberately splits policy into `@atrium/interaction`, Webspaces'
  battle-tested conventions can inform the schema before it ossifies.
- **CRDTs**: SOP's per-field last-write-wins can't do collaborative text or concurrent fine-grained
  edits; Webspaces' Yjs + edit-ring design ([13](13-collaborative-editing.md)) is the proven
  next step when Atrium gets there (e.g., a text-panel user object).
- **`ATRIUM_user_object`** (design open): Webspaces' media pipeline (image/video/PDF/text/voxel
  objects with per-type components) is effectively a working draft of an object-type registry.

### 7. Strategic/positioning framing
Webspaces *is* the Seven Rules implemented in HTML — no accounts, static hosting, view-source,
own-your-file, graceful degradation. Rather than merging codebases (impractical: Webspaces is a
paused 85k-line Hubs descendant on three r141; Atrium is a young, clean-room stack), the fold-in
is: **shared specs, shared modules, sibling runtimes.** Atrium defines SOP/SOM and the extras
conventions; Webspaces adopts them where it's weak (protocol formalism, schema validation, a
server-authoritative option) and donates where it's strong (persistence, permissions, serverless
transport, voice, interaction UX, content). A joint blog post — "the same seven rules, in HTML and
in glTF" — practically writes itself, and Webspaces' unfinished launch content
([26](26-unfinished-work.md)) could ride it.

## Sequencing recommendation

1. **Week-one conversation starter**: the permissions design doc (#2) + GitHub-writeback
   persistence module (#1) — small, self-contained, directly on Atrium's stated roadmap, and they
   showcase Webspaces' distinctive ideas.
2. **The demo that sells it**: HTML→glTF exporter (#5) so existing webspaces open in Atrium's
   browser and SOM inspector.
3. **The deep integration**: SOP adapter in webspace-engine (#3), then the serverless SOP tier (#4).
4. **Ongoing**: voice package and interactivity/user-object design input (#6).

## Watch-outs

- **Atrium is design-first and test-first** (432 tests, "no throwaway code", session briefs before
  code). Contributions should arrive as design briefs + tested packages, matching the house style —
  not engine-sized code drops.
- **Session 47 is mid-flight** (SOMCamera position seeding bug; "do not attempt further fixes until
  resolved") — avoid touching camera/nav code paths initially.
- **Authority-model mismatch** is the one real philosophical divergence (P2P ownership vs. server
  authority). The serverless tier (#4) is the reconciliation, but it needs a real design
  conversation, not a unilateral PR.
- **Webspaces bitrot**: before any joint demo, re-verify webspace-engine still builds and runs
  ([26](26-unfinished-work.md) step 1).

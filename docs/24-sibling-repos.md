# 24 — Forked & Sibling Repos

Deep-dives on the three library repos in this folder and how the engine consumes them. (The SDK
site has its own doc: [23](23-sdk-site.md).)

## networked-aframe (fork, branch `webspaces/master`)

**Role**: the entity-sync layer ("NAF"). Upstream NAF syncs A-Frame entities over pluggable
adapters using JSON; the Webspaces fork rebuilds the wire layer around **binary serialization and
P2P**:

- **FlatBuffers protocol** (`schema.fbs`, `NetworkedAframeSchema.ts`): `Message { data:
  SceneUpdate | CustomOp | DocSyncRequest | DocSyncResponse | DocUpdate | PresenceUpdate }`;
  `UpdateOp` carries network_id, creator, template, owner, last_owner_time, and components as a
  nested **FlexBuffer**; `DeleteOp`; MessagePack for custom payloads. Compact enough for chatty
  transform sync over data channels.
- **P2PCFAdapter** (`src/adapters/P2PCFAdapter.js`): peer discovery through a Cloudflare Worker,
  then WebRTC mesh; handles voice tracks with SDP tuning (mono, 64 kbps) and **viseme bytes
  appended to encoded audio frames** via insertable streams ([11](11-voice.md)).
- **Presence** via Yjs Awareness (`PresenceUpdate` messages) instead of a server roster.
- **Master-client** concept: persistent entities get adopted when their creator disconnects.
- Core files: `src/NetworkConnection.js`, `src/NetworkEntities.js`, `src/components/networked.js`,
  `src/Schemas.js`, `src/Lerper.js` (interpolation), `src/FlexBufferUtils.js`.
- Late commits (through 2022-12-30): p2pcf bumps/tuning, dropped a Yjs doc-sync protocol (moved to
  the engine's edit rings), viseme work, serialization fixes.

**Engine coupling**: templates/schemas live on the engine side (`aframe-dom.js`,
`network-schemas.js`); deterministic IDs come from the engine ([06](06-dom-to-3d.md)).

## quill (fork; engine pins `#webspaces/master`)

**Role**: the rich-text editor behind in-world text objects ([15](15-text-and-quill.md)). The local
checkout is on upstream `develop` (mid-TypeScript migration, ~2022-07); the engine consumes the
`webspaces/master` branch from GitHub. Fork motivations: deterministic render-to-texture, shadow-
DOM/pooled lifecycle friendliness, and pairing with the forked `quill-emoji` (`#jel-master`).
Content model is Quill Deltas, which is also what syncs over Yjs and what `deltaOps` in the NAF
schema carries.

## smoothvoxels (the .svox engine; npm `smoothvoxels@1.2.8`)

**Role**: voxel models that don't look blocky. A standalone library (with A-Frame/three.js entry
points and a meshing worker) providing:

- The **.svox model format**: voxels + materials + directives — per-material `deform`
  (iterative smoothing with damping), `shape` warps (sphere/cylinder), `flatten`/`clamp`
  constraints, ambient occlusion, shells/outlines, lights, `scale/rotation/position`, palette-
  indexed voxels (1–8 bits/voxel, max dim 128).
- **SvoxMeshGenerator**: model → positions/normals/colors/uvs/indices + bounds, ready for three.js.
- **Converters**: `vox-to-svox` (full MagicaVoxel import incl. scene-graph chunks) and
  `img-to-svox` (image → voxel slab; powers the playground workflow).
- History: perf rewrites (typed arrays/bitfields, ~5×), custom fields (the engine stores
  stack-axis/snap metadata), mirroring and resize fixes; v1.2.8 final (2022-12-27).

**Engine coupling**: the engine embeds its own worker around `SvoxMeshGenerator`
(`vox-mesher.worker.js`), serializes voxels through its own FlatBuffers schema
(`webspace-engine/svox.fbs`), and layers instancing, editing, undo, and multiplayer on top
([16](16-voxels.md)).

## Coupling map

```
webspace-engine
 ├─ networked-aframe#webspaces/master  → entity sync, presence, voice transport
 ├─ quill#webspaces/master (+quill-emoji#jel-master) → text editing → Yjs → NAF edit rings
 ├─ smoothvoxels@1.2.8                 → voxel model format + mesher (worker-wrapped)
 └─ webspace-sdk.github.io             → not a dependency; the showcase & service-worker host
```

All three libraries were effectively frozen at the end of 2022; from then on the engine evolved
against pinned versions. If you resume work, treat their APIs as stable internal contracts.

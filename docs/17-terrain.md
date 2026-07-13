# 17 — Terrain

Every world can have an infinite(-feeling) procedurally generated landscape, defined entirely by a
few meta tags: a generator type, a seed, and eight colors. Code: `src/terra/` (generation) +
`src/systems/terrain-system.js` (client management) + `src/workers/terra.worker.js`.

## Configuration (document meta tags)

```html
<meta name="webspace.environment.type" content="terrain" />
<meta name="webspace.environment.terrain.type" content="plains" />  <!-- islands|hills|plains|flat -->
<meta name="webspace.environment.terrain.seed" content="117" />
<meta name="webspace.environment.terrain.colors.ground|sky|water|grass|rock|bark|leaves|edge" content="#…" />
```

Same seed + type ⇒ identical terrain for every visitor, no terrain data stored anywhere.

## Generation (`src/terra/`)

- `generator.js` — FastNoise WASM (`src/wasm/fastnoise-wasm.js`) 4D simplex noise, **circularly
  tiled** so the world wraps seamlessly. Generator types ISLANDS / HILLY / PLAINS / FLAT compose
  height layers (terrain, plateau, peaks), place features (trees/vegetation via a feature
  callback), detect edges/overhangs. Colors come from height-indexed maps with noise perturbation;
  separate low-LOD colors.
- `chunk.js` — chunks are 64×64 columns × 256 max height; per-voxel fields
  `[type, r, g, b, lowres-rgb, palette]` in one Uint8Array; heightmap per chunk; 4 vertical
  subchunks meshed independently.
- `mesher.js` — greedy meshing, quads capped at 12 to avoid seams; separate opaque/transparent
  (water) geometry.
- `constants.js` — `VOXEL_SIZE = 1/8 m`, `VOXELS_PER_CHUNK = 64` ⇒ chunk = 8 m; world is 8×8 chunks
  wrapping; `WATER_LEVEL = 4`.
- Chunks travel encoded as protobufs (`protocol.Chunks`).

## The worker (`src/workers/terra.worker.js`)

One `World` per (seed, generator type). Priority-queued jobs; results cached in IndexedDB `terra`
keyed `type/mesher/seed/x/z/CHUNK_VERSION`, so revisits are instant. (Historic note: a "terra
server" on Arweave appears in `.defaults.env` — superseded by local generation.)

## Client management (`src/systems/terrain-system.js`)

- Load radius 3 chunks (6 in director mode), requested nearest-first from a precomputed sorted
  grid; wrap-aware coordinate normalization (`wrapped-entity-system` wraps entities/avatars too).
- Builds render meshes with a voxel palette-texture material and **the vertex-curving shader**
  (`addVertexCurvingToShader`): positions are bent over `WORLD_RADIUS = 1024` via a complex-
  exponential map, giving the signature "small planet" horizon. The same curve is injected into
  vox/avatar/media shaders so everything bends consistently ([19](19-rendering.md)).
- Physics: static heightfield bodies per chunk ([20](20-physics.md)); character grounding raycasts
  against them ([07](07-systems.md)).
- Fires `terrain_chunk_loaded` and the boot-time `terrain_chunk_cpu_spike_over` that triggers the
  initial quality boost ([05](05-boot-sequence.md)).
- `updateWorldColors()` re-palettes terrain live when environment settings change (UI:
  environment-settings popup).

## Environment around it

Water plane (reflection/refraction within radius 2 chunks), sky dome, sun/ambient/fog — owned by
`atmosphere-system.js`, colored from the same palette. Grass/field detail ("FIELD" render order)
pops in around the player; "grass popping in late" and "fog color should match sky" are known
todos, as are "disable LOD on flat + plains" and pushing chunks to origin on first edit.

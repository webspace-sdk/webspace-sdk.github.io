# 16 — Voxels & SmoothVoxels

Voxels are Webspaces' native creative medium: MagicaVoxel-style models rendered smooth, editable
in-world by multiple people, persisted as `.svox` files in the world's `assets/`.

## Formats

- **.vox** — MagicaVoxel binary (magic 542658390, v150; SIZE/XYZI/RGBA chunks, 256-color palette).
  Parsed by `src/objects/VOXLoader.js`; imported .vox is converted to svox.
- **.svox** — Smooth Voxels text/model format from the `smoothvoxels` library: voxels + materials +
  deformation/AO/lighting directives. In webspaces, MIME `model/vnd.svox`.
- **FlatBuffers wire/storage form** — `webspace-engine/svox.fbs`: `SVox { header, name, version,
  revision, scale, stack_axis, stack_snap_position/scale, frames: [SVoxChunk] }` where `SVoxChunk`
  is size + bit-packed palette indices (4/6/8 bits per voxel). Serialization helpers in
  `src/utils/vox-utils.js` (`voxelsToSerializedVoxelsBytes`, `modelFromString`, `modelToString`).

## The smoothvoxels library (`smoothvoxels/` repo, npm `smoothvoxels@1.2.8`)

What it does: turns blocky voxel grids into **smoothed, deformed, materialed meshes** —
per-material deformation (iterative vertex relaxation with damping), shape warps (box → sphere/
cylinder), flatten/clamp planar constraints, ambient occlusion, shells (outlines), lights, then
generates a three.js-ready mesh (`SvoxMeshGenerator`). Optimized ~5× with typed arrays/bitfields;
max dimension 128. Includes:

- `src/smoothvoxels/` — Model, Voxels (palette-indexed grid), Deformer, mesh generator,
  ModelReader/Writer.
- `src/vox-to-svox/` — MagicaVoxel import (incl. scene graph nTRN/nGRP/nSHP chunks).
- `src/img-to-svox/` — image → voxel conversion (used by the SVOX playground; the
  imported-image tutorial world showcases it).
- `aframe.js` / `three.js` / `worker.js` entry points. The engine ships its own copy of the mesher
  in `src/workers/vox-mesher.worker.js` with a preallocated 375k `SvoxBuffers`.
- Playground: https://svox.glitch.me/ (linked from tutorials).

## VoxSystem (`src/systems/vox-system.js`, ~2k lines)

The engine-side registry/renderer:

- **Identity**: `voxId = btoa(voxUrl)`. `register(voxUrl, source)` / `unregister` tie `media-vox`
  entities to models.
- **Instancing**: one `DynamicInstancedMesh` per model (≤255 instances, ≤32 frames);
  `getSourceForMeshAndInstance()` resolves raycast hits back to entities.
- **Meshing**: model string + voxel package → `vox-mesher.worker.js` → transferable
  positions/normals/colors/indices/uvs.
- **Materials**: standard VOX shader (vertex colors, custom shadow handling), SVOX toon material
  (MeshToonMaterial + gradient map, stencil ref 2 to dodge SSAO), voxmoji atlas material.
- **Editing state**: per-model undo stacks, delta ring buffer (32), `RESHAPE_DELAY_MS = 5000`,
  writeback debounce `WRITEBACK_DELAY_MS = 10000`; `canEditAsync()` permission check
  (`edit_vox`); `createVoxInFrontOfPlayer()` for new models.
- **Physics**: generates collision hulls/boxes from voxel data.
- `fast-vixel` (path-traced voxel renderer fork) is used for high-quality voxel
  rendering/preview duties.

## BuilderSystem (`src/systems/builder-system.js`)

The in-world editor UX ([07](07-systems.md) has the systems view):

- Brush types VOXEL/FACE/BOX/CENTER/FILL/PICK; modes ADD/REMOVE/PAINT; shapes BOX/SPHERE; crawl
  (flood) by geometry or color; mirroring; sweep-plane face dragging.
- Right-panel UI: tool segment control, size, color swatches ([14](14-ui-layer.md)); `~` opens the
  editor on a model; V paints in attach mode.
- Edits flow: brush stroke → voxel delta → VoxSystem apply + broadcast via edit ring
  ([13](13-collaborative-editing.md)) → re-mesh in worker → eventual `.svox` writeback.

## Voxmoji (`src/systems/voxmoji-system.js`)

Emoji become extruded voxel objects via texture-atlas instanced rendering (256 per type, 4×4
atlas grid); used for emoji objects and the emoji launcher's projectiles/bursts.

## Known rough edges (todo.txt)

A large cluster of the remaining work is voxel-editor UX: undo/redo buttons, editor layout
(materials palette + text editor), origin display, publish-time burning of axis/snap/scale,
immutable linked `.svox`, randomized mesher output, lazy buffer allocation, moving meshing fully to
a worker, local svox `file://` URL embedding bug.

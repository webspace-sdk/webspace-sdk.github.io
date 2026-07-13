# 19 — Rendering Pipeline

three.js r141 (forked), WebGL2, heavy batching/instancing, a curved-world vertex shader, and a
combined SSAO+FXAA post pass. Sources: `src/effects/`, `src/materials/`, `src/objects/`,
`src/loaders/`, plus shader injection in systems.

## The three.js fork

`three: github:webspace-sdk/three.js#webspaces-patches-141-2`, plus A-Frame fork
`#hubs-141-upgrade`. Patches support vertex curving hooks, instancing/stencil needs, and a boot
patch prevents shader program disposal. Global `THREE.Object3D.DefaultMatrixAutoUpdate = false` —
manual matrix updates everywhere.

## Draw organization

- **Render order** (`src/constants.js:16`): LIGHTS 0 → HUD 1–2 → TERRAIN 10 → FIELD 100 →
  PHYSICS_DEBUG 1000 → VOX 5000 → MEDIA 10000 → MEDIA_NO_FXAA 10010 → TOON 20000 →
  INSTANCED_AVATAR 21000 → INSTANCED_BEAM 22000 → SKY 100000 → HELPERS → CURSOR →
  PICTURE_IN_PICTURE. The 20000+ range renders last for stencil tricks (toon/avatar surfaces write
  stencil ref 2 so the SSAO pass skips them).
- **Batching**: `@mozillareality/three-batch-manager` merges media meshes into large batches.
- **Instancing**: `src/objects/DynamicInstancedMesh.js` — InstancedMesh with a free-index pool and
  pooled per-instance attributes (Matrix4/Vector3/Vector4/float); used by avatars, vox models,
  voxmoji, sky beams.

## The curved world

`addVertexCurvingToShader()` (in `terrain-system.js`, applied via onBeforeCompile across terrain,
vox, avatar, media, and beam materials) maps vertex positions through a complex exponential with
`WORLD_RADIUS = 1024`, bending geometry down toward a horizon — the world reads as a small planet
while remaining planar (and wrapping) in logic. Any new material must opt in or it will float
visibly off the curve.

## Post-processing (`src/effects/`)

`effects-system.js` runs a composer whose main pass is `cube-ssao.js`: a combined **SSAO + FXAA**
shader (aoClamp 0.55, lumInfluence 0.7, fog-aware, depth+stencil texture; stencil-masked to skip
avatars/toon). Modes toggle AO/FXAA/copy per detail level ([05](05-boot-sequence.md)): detail 0 =
both, 2 = no FXAA, 3 = neither. "Precompile SSAO pass to avoid load hitch" is a known todo.
`fxaa-shader.js` holds the FXAA implementation.

## Materials (`src/materials/`, `src/utils/material-utils.js`)

- `MobileStandardMaterial` — cut-down StandardMaterial swapped in on low quality
  (`convertStandardMaterial`, `mapMaterials` traversal).
- Voxel terrain material — palette-texture shader ([17](17-terrain.md)).
- VOX vertex-color shader / SVOX toon gradient material / voxmoji atlas material
  ([16](16-voxels.md)).
- Highlight/hover effects via `hoverable-visuals` shader uniforms.

Tone mapping: ACES + sRGB, owned by `atmosphere-system.js`, which also runs water
reflection/refraction pre-passes and shadow maps ([17](17-terrain.md)).

## Loaders (`src/loaders/`)

- `HubsBasisTextureLoader` — Basis Universal supercompressed textures, 4-worker transcode pool,
  target format by GPU support (ASTC/BC3/PVRTC/ETC1).
- `HubsTextureLoader` — general textures incl. KTX2.
- glTF via `gltf-model-plus` (+ Draco decoders aliased in webpack; Basis/Draco codec paths).
- `VOXLoader` in `src/objects/`.

## Text rendering

MSDF (multi-channel signed distance field) via three-bmfont-text with a bundled Roboto atlas
(`src/fonts/Roboto-msdf.*`), anisotropy 16 — crisp at any scale/angle; used for nametags and 3D
labels (`hubs-text`). Quill text renders to canvas textures instead ([15](15-text-and-quill.md)).

## Quality scaling

`App.detailLevel` 0–3 + `auto-quality-system.js` (framerate tracking) govern pixel ratio, effects,
material quality (`low` on mobile), shadows, reflections. Software-GL detection pins detail 3.
"Clean up per-frame allocations" remains a todo — be careful adding per-tick garbage.

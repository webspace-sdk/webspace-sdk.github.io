# 07 — Systems Inventory

Everything under `webspace-engine/src/systems/`. The engine is A-Frame-based but most logic lives in
hand-rolled system classes ticked in explicit order — not in A-Frame's own system registry.

## How systems are registered and ticked

`src/systems/hubs-systems.js` is the orchestrator. It's registered as the single A-Frame system
`hubs-systems`; its `init()` instantiates ~40 custom system classes, and its `tick(t, dt)` calls each
one **in a fixed order that encodes data dependencies**:

1. **Input**: `userinput.tick2()`, then `interaction.tick2()` (A-Frame-registered systems).
2. **Animation**: `animationMixerSystem` (animations override transforms).
3. **Movement**: `characterController`, `pasteSystem`.
4. **Pre-targeting transforms**: `wrappedEntitySystem`, `cursorPoseTracking`, `voxSystem` (meshes must
   be current before raycasts).
5. **Targeting**: `cameraSystem`, `cursorTargettingSystem`.
6. **Physics**: `constraintsSystem`, `physicsSystem`.
7. **World state**: `terrainSystem`, `atmosphereSystem`, `mediaInteractionSystem`, transform/scale systems.
8. **Presentation**: `uiAnimationSystem`, `avatarSystem`, `keyboardTipSystem`.
9. **Last word**: `boneVisibilitySystem` (final visibility override).

A handful of A-Frame-registered systems exist too (`interaction`, `userinput`,
`transform-selected-object`, `scale-object`, button systems) — but even those are invoked from the
orchestrator (`tick2`) rather than left to A-Frame's ordering.

**Paused-mode self-update**: when the scene is paused (tab blur), `hubs-systems` runs a private
~60 Hz interval that still ticks `domSerializeSystem`, `soundEffectsSystem`, `mediaTextSystem`,
`uiAnimationSystem`, `avatarSystem`, `keyboardTipSystem` — so saving, text editing, and UI stay live
while rendering is frozen.

## The big ten (deep dives)

### 1. CharacterControllerSystem — `character-controller-system.js`
Avatar locomotion: WASD/stick motion accumulated via `enqueueRelativeMotion()`, in-place rotation,
jumping with gravity, snap rotation, and terrain-aware grounding via heightfield raycasts. Owns the
walk-vs-fly distinction (builder mode flies; `builderSystem.enabled` toggles it). Listens for terrain
chunk loads to re-ground the player, and syncs the rig into `networked-avatar` for peers. Works with
`walkableModels` (GLB walkability was one of the last features added).

### 2. PhysicsSystem — `physics-system.js`
Fronts the Ammo.js (Bullet) simulation living in a worker. Bodies/shapes are declared by components
(`body-helper`, `shape-helper`, `heightfield`); transforms flow both ways through a shared
`ArrayBuffer` of matrices (`objectMatricesFloatArray`), stepped at ~90 Hz. Gravity −9.8; `MAX_BODIES
= 512`; message types INIT / BODY_READY / SHAPES_READY / TRANSFER_DATA. Everything that needs
raycast-vs-world or collision queries goes through here. See [20](20-physics.md).

### 3. VoxSystem — `vox-system.js` (~2,000 lines, the biggest system)
Registry and renderer for all voxel models: registration by `voxId = btoa(url)`, per-model
`DynamicInstancedMesh` (up to 255 instances, 32 animation frames), off-thread meshing via
`vox-mesher.worker.js` (SmoothVoxels generator), three-mesh-bvh for raycasts, per-model undo stacks,
delta ring buffers for multiplayer edits, and 10s-debounced writeback of edited models. Also
generates physics hulls and invisible raycast meshes. See [16](16-voxels.md).

### 4. TerrainSystem — `terrain-system.js`
Streams procedurally generated terrain chunks from `terra.worker.js` (IndexedDB-cached), builds
voxel-shader meshes and heightfield physics bodies, manages load radius (3, or 6 in director mode),
world wrap, water/reflection radii, and injects the **vertex-curving shader** that bends the world
over a 1024-radius horizon. Fires `terrain_chunk_loaded` / CPU-spike events that gate quality
boosts. See [17](17-terrain.md).

### 5. CursorTargettingSystem — `cursor-targetting-system.js`
The scene-wide raycasting hub for both cursors/hands. Maintains a dirty-flagged `targets[]` list
(rebuilt on DOM mutation, camera-mode change, vox mesh add/remove), resolves instanced hits back to
their source entity via `voxSystem.getSourceForMeshAndInstance()`, and feeds intersections to the
interaction system. In inspect mode it narrows targets to the inspected subtree.

### 6. Interaction + ConstraintsSystem — `interactions.js`, `constraints-system.js`
Tracks hover/held state per interactor (left/right hand, left/right remote). Grabbing an object with
`offersHandConstraint`/`offersRemoteConstraint` tags creates a physics constraint between hand and
body; release removes it. Permission-gated via `atomAccessManager`.

### 7. TransformSelectedObjectSystem + ScaleObjectSystem — `transform-selected-object.js`, `scale-object.js`
The manipulation toolset: modes AXIS, ALIGN, SCALE, SLIDE, STACK, LIFT, MOVEX/Y/Z. Implements grid
snap (multiples of `VOXEL_SIZE = 1/8 m`), 22.5° angle snap, surface-normal stacking, ground
detection via physics raycast, and pushes matrix-undo entries to `undo-system.js` on release.
Driven by `MediaInteractionSystem`, which polls userinput actions and gates on
`hubCan("spawn_and_move_media")` + `ensureOwnership()`.

### 8. CameraSystem — `camera-system.js`
Camera modes: first-person, third-person near/far, **inspect** (orbit around an object), scene
preview. Adjusts far plane and fog per mode, owns the ortho camera for flat projection, and emits
`mode_changed` (which dirties cursor targets and disables manipulation where appropriate).

### 9. BuilderSystem — `builder-system.js` (~1,200 lines)
The in-world voxel editor. Brush model from `constants.js`: types VOXEL/FACE/BOX/CENTER/FILL/PICK,
modes ADD/REMOVE/PAINT, shapes BOX/SPHERE, crawl types (geo/color) for flood-like ops, mirroring,
sweep planes for face drag operations. Converts brush strokes into voxel deltas applied through
VoxSystem, with its own undo state machine. Enabling builder switches the character controller into
fly mode.

### 10. AtmosphereSystem — `atmosphere-system.js`
Environment rendering: directional sun with tuned shadow maps, ambient light, sky dome, water plane
with reflection/refraction passes, fog, environment map, ACES tone mapping. Consumes the world color
palette from the document's terrain-color meta tags (`WORLD_COLOR_TYPES` in constants.js: ground,
edge, leaves, bark, rock, grass, sky, water).

## Full inventory (by area)

### Input (`systems/userinput/`)
The Hubs action-path input framework: `userinput.js` (core), `resolve-action-sets.js`, `sets.js`,
`paths.js`, `pose.js`, plus **bindings** for keyboard-mouse, touchscreen, WebXR, Oculus Touch/Go,
Vive, WMR, Daydream, Cardboard, Xbox/generic gamepad — and **devices** wrapping each hardware source
(including `app-aware-mouse/touchscreen` that respect UI focus/cursor lock, `gyro`, `hud`). Inputs
resolve through declarative bindings into named action paths that systems poll.

### Interaction & tools
`interactions.js`, `constraints-system.js`, `transform-selected-object.js`, `scale-object.js`,
`two-point-stretching-system.js` (two-hand stretch), `cursor-targetting-system.js`,
`cursor-toggling-system.js`, `cursor-pose-tracking.js`, `media-interaction-system.js`,
`undo-system.js` (per-entity matrix undo, 64 deep), `paste-system.js`, `super-spawner-system.js`.

### Media
`media-presence-system.js` (distance-based HIDDEN/PENDING/PRESENT with ≤4 concurrent transitions),
`media-stream-system.js` (mic/camera/screen streams), `media-text-system.js` (Quill+Yjs lifecycle),
`linked-media.js`, `listed-media.js`. See [09](09-media-pipeline.md).

### Voxel/terrain/world
`vox-system.js`, `voxmoji-system.js` (emoji→voxel atlas instancing), `terrain-system.js`,
`builder-system.js`, `wrapped-entity-system.js` (world wrap-around for entities),
`dom-serialize-system.js` (entities → HTML, see [06](06-dom-to-3d.md)).

### Rendering & environment
`atmosphere-system.js`, `effects-system.js` (composer: SSAO/FXAA, see [19](19-rendering.md)),
`sky-beam-system.js` (spawn beams), `auto-quality-system.js` (framerate-driven detail scaling),
`external-camera-system.js` (spectator/stream cam), `scene-preview-camera-system.js`,
`camera-rotator-system.js`, `scale-in-screen-space.js`, `helpers-system.js` (guide planes, debug).

### Avatar & audio
`avatar-system.js` (instanced avatars, eye animation — see [18](18-avatars.md)),
`personal-space-bubble.js`, `audio-system.js` + `audio-settings-system.js` (see [11](11-voice.md)),
`sound-effects-system.js`, `interaction-sfx-system.js`.

### UI-adjacent
`hover-menu-system.js`, `button-systems.js` (single-action/holdable/hover buttons),
`keyboard-tip-system.js`, `ui-animation-system.js` (panel expand/collapse).

### Game-y extras
`launcher-system.js` + `projectile-system.js` (emoji blaster projectiles/bursts),
`director-system.js` (guided camera tours), `emoji-system` bits inside launcher, `haptic-feedback-system.js`.

### Lifecycle/misc
`app-mode.js`, `idle-detector.js`, `exit-on-blur.js`, `frame-scheduler.js`,
`enter-vr-button-system.js`, `permissions.js`.

## Reading tips

- To trace "what happens when I press X": start at `userinput/paths.js` (find the action path), grep
  which system polls it, follow into the system's tick.
- To trace "why did this object move": physics (`body-helper` dynamic bodies), constraints (held),
  transform system (user manipulation), animation mixer, or NAF remote update — in roughly that
  order of likelihood.
- The tick order in `hubs-systems.js` is the ground truth for inter-system races; several bugs in
  `doc/todo.txt` are ordering-related.

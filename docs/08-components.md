# 08 — Components Inventory

Everything under `webspace-engine/src/components/` (~88 files). These are A-Frame components —
per-entity behaviors — as opposed to the scene-wide systems of [07](07-systems.md). Grouped by role.

## Media view components (the heart of content rendering)

| Component | Role |
|---|---|
| `media-loader.js` | The universal entry point on every media entity. Resolves/preflights the URL (CORS proxy when needed), detects content type, shows the spawn animation + particle loader, dispatches to the right view component, handles ownership, locking, `fitToBox`, versioned refresh, and registration with undo/sky-beam systems. Schema includes `src`, `contentType`, `contentSubtype`, `initialContents`, `mediaOptions`, `locked`, `createdAt`. |
| `media-views.js` | Implements the per-type views: **media-image** (HubsTextureLoader, basis/ktx2, animated GIF via GIFTexture, aspect-fit "chiclet" plane), **media-video** (HLS via hls.js, DASH via dashjs, YouTube via youtubei.js resolution, VideoTexture, networked time/pause), **media-audio** (positional THREE.Audio + speaker icon), **media-pdf** (pdfjs render-to-canvas via `pdf-pool`, page pager). |
| `media-text.js` | Rich text object (page/label/banner). Quill content rendered to a canvas texture (`renderQuillToImg`), color presets (13 opaque pairs + 35 transparent variants), fit-to-content sizing. See [15](15-text-and-quill.md). |
| `media-vox.js` | Voxel model view; registers with VoxSystem for instanced rendering. |
| `media-emoji.js` | Emoji object; renders through voxmoji-system's atlas instancing. |
| `media-stream.js` | Live WebRTC stream surfaces (screen share / camera share). |
| `media-canvas.js`-style helpers | (within media-views) canvas/texture plumbing. |

## Models & animation

- `gltf-model-plus.js` — the Hubs glTF loader: caching with reference counts, clone-on-retain,
  custom component mappings from glTF extras (`gltf-component-mappings.js` registers e.g. `duck`,
  `quack`, `background`), material conversion (`MobileStandardMaterial` on low quality).
- `animation-mixer.js`, `animation.js`, `loop-animation.js` — skeletal/property animation playback.
- `bone-visibility.js` — show/hide bones (e.g. hide hands when no controllers); its system ticks last.
- `hand-poses.js`, `hand-controls2.js` — hand pose state from controllers.
- `ik-controller.js` — avatar IK: solves head/hands from camera+controller poses, hip-rooted; spring
  steps for squeeze/jump feel (bezier-eased). See [18](18-avatars.md).

## Avatar & presence

- `networked-avatar.js` — syncs avatar state (position/rotation handled by NAF schema; plus color,
  expression bits).
- `player-info.js` — display name + persona; drives nametag.
- `avatar-audio-source.js` — positional voice playback at the head.
- `avatar-volume-controls.js` — per-avatar gain UI.
- `personal-space-bubble` (system+component) — fades avatars that get too close.

## Physics & spatial helpers

- `body-helper.js` — declares an Ammo body (type, mass, collision group/mask) for the entity.
- `shape-helper.js` — collision shapes (box/sphere/hull/etc.).
- `heightfield.js` — terrain heightfield collision.
- `set-unowned-body-kinematic.js` — un-owned networked bodies become kinematic (only the owner
  simulates dynamics; everyone else lerps).
- `floaty-object.js` — the Hubs "floats in place" behavior: gravity tweaks on release, auto-lock.
- `destroy-at-extreme-distances.js` — GC for objects that fall out of the world.
- `offset-relative-to.js`, `pinned-to-self.js`, `follow-in-fov.js`, `position-at-border.js`,
  `look-at-self.js`, `billboard.js`, `set-yxz-order.js` (canonical Euler order), `layers.js`,
  `disable-frustum-culling.js`, `scale-in-screen-space.js`.

## Interaction & UI-in-3D

- `cursor-controller.js` — per-hand raycaster; produces the intersections consumed by the targeting
  system.
- `hover-menu.js` + `hoverable-visuals.js` / `hover-visuals.js` — context menus over objects (video
  controls, PDF pager, link open, photo actions) and hover glow.
- `icon-button.js`, `text-button.js`, `inspect-button.js`, `open-media-button.js`,
  `refresh-media-button.js`, `remove-networked-object-button.js`, `unmute-video-button.js`,
  `mute-mic.js` — 3D button family, themed via the theme system.
- `tags.js` — the interaction capability flags (`isHoldable`, `offersRemoteConstraint`,
  `inspectable`, `isHandCollisionTarget`…) read by interaction/constraints systems.
- `scalable-when-grabbed.js`, `action-to-event.js`, `action-to-remove.js`.
- `virtual-gamepad-controls.js` — nipplejs touch joysticks on mobile.

## Networking-adjacent

- `networked-counter.js`, `periodic-full-syncs.js` (avatar rig periodically full-syncs),
  `owned-object-limiter.js`, `spawn-controller.js`, `super-spawner.js` (spawner objects that stamp
  copies — "creating a duck without permission on spawner" is a known todo).

## Scene & environment

- `scene-components.js` (scene-level config), `environment-map.js`, `point-light.js`,
  `spot-light.js`, `fader.js`, `particle-emitter.js` (spawn/loader particles), `cylinder-texture.js`,
  `set-active-camera.js`, `scene-preview-camera.js`, `set-max-resolution.js`.
- `teleporter.js` — VR teleport arcs on controllers.
- `visibility-by-path.js`, `visibility-while-frozen.js` — conditional visibility helpers.

## Text

- `hubs-text.js` — MSDF text via three-bmfont-text with bundled Roboto MSDF atlas; used for nametags
  and 3D labels (distinct from Quill-based `media-text`). Schema: align/anchor/baseline/color/
  lineHeight/wrapPixels; anisotropy 16.

## Fun

- `duck.js` + `quack.js` — the mandatory Hubs duck, spawnable and squeakable.
- `emoji.js`, `replay.js`, `track-pose.js`.

## Patterns to know

1. **Template-stamped stacks**: entities aren't assembled ad hoc — the NAF templates in
   `src/aframe-dom.js` define the canonical component stack for each entity class
   (`#interactable-media`, `#remote-avatar`, `#static-media`…). If you wonder "where did this entity
   get component X", look at its template.
2. **Components declare, systems do**: most components are thin schema+lifecycle wrappers that
   register with a system (`media-vox` → VoxSystem, `body-helper` → PhysicsSystem). Behavior lives in
   the system tick.
3. **Networked schemas whitelist components**: only components listed in `src/network-schemas.js`
   sync; everything else is local. `nonAuthorizedComponents` (video time/pause) can be changed by
   non-owners.

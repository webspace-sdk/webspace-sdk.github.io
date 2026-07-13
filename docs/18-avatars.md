# 18 — Avatars

Webspaces avatars are deliberately simple and cheap: instanced, toon-shaded, colorable "orbs with
eyes" that blink, glance, bob, and lip-sync — hundreds render in a few draw calls.

## Rendering (`src/systems/avatar-system.js`)

- All remote avatars draw through a `DynamicInstancedMesh` (`AvatarSphereBufferGeometry`, radius
  0.4) with a toon material and a decal texture atlas (`avatar-sheet.png`, Basis-compressed
  variant available).
- **Eyes**: 8 decal states (neutral, up/down/left/right, blink 1–3). Per-frame probabilities:
  blink 0.5%, glance 0.5%; blink frames 25 ms; glance lasts 500 ms. Plus a sine bob per instance.
- **Mouth**: viseme decals driven by voice lip sync ([11](11-voice.md)); the 2D `avatar-swatch` in
  the UI animates the same states.
- **Color**: per-instance color from presence (`profile.persona.avatar.primary_color`), edited via
  the self-panel color picker.
- Stencil ref 2 excludes avatars from SSAO; `INSTANCED_AVATAR` renders late ([19](19-rendering.md)).

## The rig (`src/aframe-dom.js:307–401`)

Your local player is a full Hubs-style rig even though the visible body is simple:

```
#avatar-rig (ik-root, player-info, periodic-full-syncs)
├── #avatar-pov-node (camera, y=1.6)
├── player-left/right-controller (track-pose, teleporter, hand-controls2)
└── model (gltf-model-plus, skinned)
    ├── AvatarRoot (ik-controller)
    ├── Neck (nametag billboard — MSDF text)
    ├── Spine (personal-space-bubble)
    ├── Head (avatar-audio-source, body-helper)
    └── Left/RightHand (bone-visibility, hover visuals)
```

- `ik-controller.js` solves head/hands from camera + controller poses (hip-rooted; eased
  spring steps for squeeze/jump feel). In VR, controllers drive hands; on desktop they're hidden
  via bone-visibility.
- `networked-avatar` + the `#remote-avatar` NAF schema sync position/rotation (epsilon-gated),
  camera and controller poses, `player-info`, and avatar state; `periodic-full-syncs` guards
  against drift.
- Position persistence: your last position/rotation per world is saved every second to the hub
  store, so you respawn where you left ([05](05-boot-sequence.md)).

## Presence & identity

Display name (3–32 chars, `^[A-Za-z0-9 -]+$`) and color live in presence, editable in the self
panel; nametags billboard at the neck. Kick/block plumbing exists from Hubs
(`scene-entry-manager._setupKicking`). Identity is the local keypair ([10](10-networking.md)).

Todos in this area: "bring in avatar audio system", muted ring indicator, making labels/banners
spawn larger.

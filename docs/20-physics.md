# 20 — Physics

Bullet physics (Ammo.js WASM) in a **web worker**, talking to the main thread through a shared
matrix buffer. Forks: `ammo.js#jel/master`, `three-ammo#jel/master`, `ammo-debug-drawer`.

## Architecture (`src/systems/physics-system.js`)

- The worker (three-ammo's AmmoWorker) owns the Bullet world: gravity (0, −9.8, 0), ~90 Hz step,
  `MAX_BODIES = 512`, debug wireframe drawer available.
- Main-thread ↔ worker transform sync via one `ArrayBuffer` viewed as `Float32Array`/`Int32Array`
  of per-body matrices — zero-copy-ish, ownership transferred back and forth (message types INIT /
  BODY_READY / SHAPES_READY / TRANSFER_DATA).
- `bodyUuidToData` maps bodies to entities; ready/reset callbacks per body.

## Declaring physics on entities

- `body-helper` — body type (dynamic/kinematic/static), mass, `collisionFilterGroup/Mask`.
- `shape-helper` — box/sphere/cylinder/cone/plane/hull shapes; media auto-generate box/hull.
- `heightfield` — terrain chunks ([17](17-terrain.md)).
- Voxel models get shapes computed from voxel data by VoxSystem.

## Collision layers (`src/constants.js:1`)

Bitmask groups: INTERACTABLES 1, ENVIRONMENT 2, AVATAR 4, HANDS 8, PROJECTILES 16, BURSTS 32.
Composites: `DEFAULT_INTERACTABLE = 31` (everything but bursts), `UNOWNED_INTERACTABLE = 25`,
`ENVIRONMENTAL_VOX = 17`, `DEFAULT_SPAWNER = 9`.

## Ownership & kinematics

Only the network owner simulates an object dynamically; everyone else's copy is kinematic
(`set-unowned-body-kinematic`) and follows NAF lerps. Grabbing = take ownership + hand↔body
constraint (`constraints-system.js`); release restores `floaty-object` behavior (low/zero gravity
float, auto-lock).

## Consumers

- **Character controller** — grounding raycasts, jump ballistics, walkable surfaces (incl. GLB
  walkability via floor/wall colliders, one of the final features).
- **Cursor/interaction** — obstacle checks; note the late optimization "stop computing bounding box
  for every raycast".
- **Projectiles** (emoji launcher) — PROJECTILES/BURSTS layers, `projectile-system.js`.
- **Transform system** — ground detection for snap/stack.

Physics debug: ammo-debug-drawer renders wireframes when enabled (helpers-system/debug flags).

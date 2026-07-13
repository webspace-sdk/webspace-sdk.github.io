# 21 — Workers, Worklets & WASM

Everything the engine pushes off the main thread. Rule of thumb in this codebase: if it can hitch a
frame, it runs somewhere else and communicates via transferables or SharedArrayBuffer.

## Web workers (`src/workers/`)

| Worker | Job | Communication |
|---|---|---|
| `terra.worker.js` | Procedural terrain chunk generation (FastNoise WASM), IndexedDB `terra` cache, priority job queue | protobuf-encoded chunks, request/response with priorities ([17](17-terrain.md)) |
| `vox-mesher.worker.js` | SmoothVoxels meshing (`SvoxMeshGenerator.generate`) with preallocated 375k `SvoxBuffers` | model string + voxel package in; transferable position/normal/color/index/uv buffers out ([16](16-voxels.md)) |
| `lipsync.worker.js` | Viseme classification from mic audio features | SharedArrayBuffers: 28-float feature buffer, uint8 result, dual 2048-sample audio frame ring ([11](11-voice.md)) |
| AmmoWorker (from three-ammo dep) | Bullet physics simulation | shared matrix ArrayBuffer, ~90 Hz ([20](20-physics.md)) |
| Basis transcoder pool (loader-managed) | Texture transcoding, 4 workers | per-load messages ([19](19-rendering.md)) |

Webpack wires these via `worker-loader` (inline fallback).

## Audio worklets (`src/worklets/`, via `worklet-loader`)

- `audio-forward.worklet.js` — `AudioWorkletProcessor` that copies 128-sample mic frames into the
  shared ring buffer (two Float32 frame buffers, 16-slot rotation) feeding the lip-sync worker.
- `vad.worklet.js` — voice-activity detection stage feeding RNNoise WASM.

Both require SharedArrayBuffer, hence the COEP service worker ([05](05-boot-sequence.md)); both are
supposed to shut down when the scene pauses (an unfinished todo).

## WASM (`src/wasm/`)

- `fastnoise-wasm.js` — simplex noise for terrain generation (runs inside terra worker).
- `rnnoise-vad-wasm.js` — RNNoise-based VAD.
- Plus WASM shipped by dependencies: Ammo.js (Bullet), Basis transcoder, Draco decoder.

## The enabling constraint: cross-origin isolation

SharedArrayBuffer needs cross-origin isolation. Since webspaces are static files on arbitrary
hosts, the project ships `webspace.service.js` — a ~50-line service worker users place next to
their HTML — which stamps `Cross-Origin-Embedder-Policy: credentialless`,
`Cross-Origin-Opener-Policy: same-origin`, and `Cross-Origin-Resource-Policy: cross-origin` on
responses. Versioned as `webspace.service.<version>.js`; skipped on `file:` (where isolation rules
differ). Features degrade gracefully without it (no lip sync/VAD; physics falls back to
non-shared messaging paths where applicable).

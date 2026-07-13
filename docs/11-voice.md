# 11 — Voice Chat & Audio

Voice is peer-to-peer WebRTC audio on the same p2pcf mesh as entity sync, with an unusually deep
client-side pipeline: WASM voice-activity detection, lip-sync viseme extraction, and an echo-
cancellation hack. Core file: `src/systems/audio-system.js` (large), plus worklets, workers, WASM.

## Capture → outbound chain

1. `getUserMedia({ audio })` — device pick via `audio-settings-system.js` / device selector popup.
2. Mic → `outboundGainNode` → `outboundAnalyser` (FFT 32, drives the self mic meter) →
   `MediaStreamDestination` → **outbound stream** handed to the NAF adapter, which attaches it as a
   WebRTC track to each peer connection.
3. The P2PCF adapter (`networked-aframe/src/adapters/P2PCFAdapter.js`) rewrites SDP for quality:
   mono, 64 kbps max average bitrate, no CBR (`stereo=0;maxaveragebitrate=64000;cbr=0;usetx=1`),
   video start bitrate 1000 for screen share.

## Playback

Remote tracks play through `avatar-audio-source` at each avatar's head — positional, distance-
attenuated, with per-avatar volume controls (`avatar-volume-controls`). The scene's audio listener
rides the camera; on pause the audio clock is stopped explicitly (a lerp-bug workaround noted in
`index.js`).

## Lip sync (visemes)

When the platform allows (needs **AudioWorklet + SharedArrayBuffer + Insertable Streams**; skipped
on Safari/mobile or with `?skip_lipsync`):

- `src/worklets/audio-forward.worklet.js` copies 128-sample frames into a shared ring buffer
  (two Float32 frame buffers, 16-slot ring).
- `src/workers/lipsync.worker.js` consumes the ring, extracts features (28-float shared feature
  buffer; audio analysis via the `meyda` fork), classifies a mouth shape, and writes the viseme
  index into a shared result buffer.
- The local viseme is **embedded into the outgoing audio** via Insertable Streams (a 5-byte payload
  appended to encoded frames — see the adapter), so peers get mouth shapes without extra messages.
  A todo notes visemes should be skipped for peers that can't decode them.
- Remote visemes drive avatar mouth decals ([18](18-avatars.md)); the self-avatar UI swatch also
  animates (`avatar-swatch` mouth shapes).

## Voice activity detection & noise

- `src/worklets/vad.worklet.js` + `src/wasm/rnnoise-vad-wasm.js` — RNNoise-based VAD in WASM, used
  to gate lip sync and talking indicators.

## The AEC hack

Chrome desktop's echo cancellation fails against WebAudio-routed output, so every 500ms the system
maintains a loopback dual-peer-connection workaround ("AEC hack") that routes audio so hardware AEC
sees it. Disable with `?noaechack`. (Classic Hubs lineage trick.)

## Related loose ends (todo.txt)

- Shut down audio worklet + lip sync jobs when paused.
- "Bring in avatar audio system" / "bring over muted ring" — some Hubs audio affordances never
  ported.
- Considered alternative: agora.io (listed as an open question).
- HLS/DASH audio testing, video-tick-while-tabbed issues.

# 26 — Known Issues & Unfinished Work

Where the project stood when it was paused. Primary source: `webspace-engine/doc/todo.txt`
(verbatim, ~120 lines), plus signals from late commits. The last work (Dec 2025) was polish:
YouTube resolution fixes, Cloudflare CORS proxy, dead-code removal, Draco, GLB walkability.

## Reading of the state

The engine was **feature-complete for a 1.0 push and in cleanup mode**. The top of todo.txt is
launch content — "READMEs, images for blog post, tweet thread" — i.e. the pause happened during
launch prep, not mid-refactor. Nothing in the list is architectural; it's polish, platform gaps,
and deferred cleanup.

## Themes (each item traces to todo.txt)

### Platform gaps (the biggest cluster)
- **Tablets not working**; iOS: missing video play button, pinch-zoom leaking through the mic
  dialog, can't move while pinching on a text field; Android should fullscreen on tap.
- **PWA support** not done (a `useInstallPWA` hook exists in `src/ui/input/`).
- iframe embedding untested; HLS/DASH untested; video pauses/resets on tab switches and new joins.

### Voxel editor UX
Undo/redo buttons; editor layout (materials palette left, text editor middle, hue-sorted swatches,
group hover-highlighting); show origin ray; publish should burn axis/snap/scale; immutable linked
`.svox` semantics (no rename, bake-to-copy); randomized mesher output; lazy svox buffers; meshing
fully to worker; local svox objects embed `file://` URLs (bug); hide other instances while editing;
lock unnecessarily re-meshes.

### Flat/page mode
Right/middle-click on links broken; nav items should be real `<a>` tags; world-vs-page icons and
correct "Page/World" labels in UI and commit messages; hide emoji button in page mode.

### Networking & permissions hardening
**"Authorize + sanitize in NAF adapter"** (inbound update validation — the most security-relevant
gap); cull permissions in atom manager; TURN config in index.html + copy networking config to new
hubs; networking settings via query string; sessionId → clientId rename; presence message pile-up;
consolidate channel classes; "add service to register spaces".

### Writeback & deploy flow
Don't load the page while a git deploy is in flight; write back PDF page changes when locked;
create-dialog blur bug during deploy; autocorrect off on the repo field.

### Rendering/perf
Precompile SSAO (load hitch); per-frame allocation cleanup; grass pop-in; fog color should match
sky; LOD off on flat/plains; labels/banners initial scale; transparent PNGs render black;
terrain chunks should snap to origin on first edit.

### Interaction polish
Gesture switching mid-drag (O/W X/Y/Z); V-scale clipping; snap-on-space if held before grab;
XYZ-move guides; Reset (G) missing from undo stack; set-spawn-point should close menu; unsaved-
changes dialog glitch when clicking nav.

### Cleanup debt (Hubs excision)
Remove hubs-cloud webpack config and env vars; drop the config system (keep meta tags); drop
a-assets; drop external camera system; review deps; dash-case all event names; remove unused
translations; grep for `TODO SHARED`; general dead code (late commits were already doing this).

### Audio
Stop worklet + lip-sync jobs on pause; don't send visemes to peers that can't decode; muted ring;
avatar audio system port; agora.io (open question).

## Suggested first moves on resume

1. Reproduce the golden path: local build + tutorial worlds ([03](03-getting-started.md),
   [23](23-sdk-site.md)) — confirm the 2025-12 state still runs on current Chrome (service worker,
   File System Access, and WebRTC behaviors drift).
2. Check the pinned GitHub deps still resolve (`npm ci`) — the biggest bitrot risk
   ([02](02-repo-layout.md)).
3. Then pick a theme above; "NAF authorize/sanitize" and the platform gaps matter most for real
   users, the Hubs excision most for maintainability.

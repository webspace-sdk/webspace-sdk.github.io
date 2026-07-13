# 15 — Text & Quill: In-World Rich Text

Text objects (pages, labels, banners) are first-class world citizens: a `<label contenteditable>` in
the document, a Quill editor when focused, a texture when not, and a Yjs document when co-edited.

## The three representations

1. **DOM**: `<label>`/`<marquee>`/`<div>` with HTML content, colors, and font-family — the persisted
   form ([06](06-dom-to-3d.md)).
2. **Quill**: when a user clicks a text object, a pooled Quill instance attaches; content is Delta
   ops. Contentsubtypes page / label / banner get different sizing.
3. **Texture**: for display, Quill's rendered content is drawn into a canvas and mapped onto the
   object's plane — `renderQuillToImg` / `computeQuillContentRect` in `src/utils/quill-utils.js`,
   with editor dimensions from `src/utils/quill-pool.js` (instances are pooled and recycled;
   `EDITOR_WIDTH`/`EDITOR_HEIGHT`, `FIT_CONTENT_EXTRA_SCALE = 1.5` for fit-to-content).

`src/components/media-text.js` owns appearance: 13 opaque foreground/background color presets plus
~35 transparent-background variants, cycle-able; font families map to the engine font set
(`src/fonts/quill-fonts.js`: SansSerif, Serif, Mono, Comic, Writing, Label). Fit-to-content sizing
derives the plane from the content rect.

`src/systems/media-text-system.js` manages lifecycles: attaching/detaching pooled editors,
enabling/disabling editing from permissions (`syncQuillEnableStateWithPermissions`), binding Yjs
([13](13-collaborative-editing.md)), and re-rendering textures on change (also while the scene is
paused, via the self-tick).

## The Quill fork (`quill/` repo)

The engine pins `github:webspace-sdk/quill#webspaces/master` (the local checkout sits on upstream
`develop`, mid-TypeScript-migration — the fork period is ~2022). Why a fork at all:

- Rendering Quill content to canvas/texture requires deterministic, headless-friendly rendering
  (identical output across clients — the texture *is* the shared visual).
- Shadow-DOM hosting and pooling need lifecycle hooks vanilla Quill didn't expose cleanly.
- `quill-emoji` (also forked, `#jel-master`) provides the emoji picker/inline emoji; several
  todo.txt items track emoji-popup misbehavior in Quill.

Also present: `highlight.js` for code blocks and Quill's bubble theme styles, all bundled into the
shadow-root stylesheet (`src/styles.js`).

## Two text systems — don't confuse them

| | Quill text (`media-text`) | MSDF text (`hubs-text`) |
|---|---|---|
| Use | user content: pages/labels/banners | engine labels: nametags, UI-in-3D |
| Source | Quill deltas / DOM HTML | plain strings |
| Rendering | canvas texture | three-bmfont-text MSDF (Roboto atlas in `src/fonts/`) |
| Networked | Yjs deltas | via component values only |

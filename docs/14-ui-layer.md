# 14 — The UI Layer (React)

All 2D UI lives in `webspace-engine/src/ui/` — ~61 React components (plus 25 Storybook stories),
styled-components, react-intl, mounted **inside the shadow root** next to the 3D canvas.

## Mounting & engine bridge

- React renders into `DOM_ROOT.getElementById("react-root")` (`src/index.js:248`), inside the shadow
  root attached at boot. Styles are injected as one bundle (`src/styles.js`: normalize, A-Frame,
  Tippy, Quill, highlight.js, theme + tree SCSS) via styled-components' `StyleSheetManager`
  targeting `DOM_ROOT`. `react-shadow-dom-retarget-events` re-targets React's synthetic events
  across the shadow boundary.
- UI ↔ engine communication is untyped but consistent: read/write `window.APP` (store, channels,
  atomAccessManager, metadata sources), call `SYSTEMS.*` directly (launcher/builder/camera/
  uiAnimation/soundEffects/vox/characterController), and listen for scene events
  (`action_chat_entry`, `add_media_vox`, `presence-synced`, `navigating-away`, …).

## Component tree (root: `ui-root.js`)

`UIRoot` wraps everything in `StyleSheetManager` + `WrappedIntlProvider` + React Router, tracks
top-level state (mute, launcher-vs-builder trigger mode, tree data, loading), and branches on
projection type (SPATIAL vs FLAT). Its main children:

| Surface | Files | What it is |
|---|---|---|
| **Left panel** | `left-panel.js`, `hub-tree.js`, `space-tree.js`, `hub-node-title.js`, `hub-context-menu.js`, `rename-popup.js`, `invite-panel.js`, `create-file-object-popup.js` | Space banner (editable w/ `update_space_meta`), invite button, and the **world tree** — rc-tree of the space's hubs with drag-reorder, context menus (rename, spawn point, permissions), and "add world". Tree hooks in `src/utils/tree-utils.js` (`useTreeData`, `useExpandableTree`, drop handler). |
| **Right panel** | `right-panel.js`, `presence-list.js`, `emoji-equip.js`, `builder-controls.js`, `segment-control.js` | Mode toggle Launcher/Builder. Launcher: presence list (avatars, names, teleport-to) + emoji equip slots with picker. Builder: brush tool segment control (pick/fill/box/sphere), size, color swatches. |
| **Canvas top HUD** | `canvas-top.js`, `create-select-popup.js`/`create-select.js`, `environment-settings-popup.js`, `hub-permissions-popup.js`, `writeback-setup-popup.js` | Back button, editable world title, corner buttons: hub menu, permissions, environment settings (terrain colors/type), invite, create (`/` menu — fuse.js-searchable create list). |
| **Chat** | `chat-log.js`, `chat-input-popup.js`, `chat-input-panel.js` | Space-key chat input popup; auto-hiding log (15s) bottom-left; linkify + emoji rendering; sends via `hubChannel.broadcastMessage`. |
| **Self panel** | `self-panel.js`, `avatar-swatch.js`, `avatar-editor-popup.js`, `profile-editor-popup.js`, `device-selector-popup.js` | Bottom-left you: 2D avatar swatch (eyes + viseme mouth animate live), name, mic mute, color picker (react-color, writes `persona.avatar.primary_color` into presence), display name editor, audio device picker. |
| **Popups root** | `root-popups.js`, `create-embed-popup.js` | Scene-event-triggered dialogs: embed-by-URL, create .svox file object, chat input. Popper.js positioning via `popup-utils.js` hooks. |
| **Key tips** | `key-tips.js` | Bottom-right shortcut legend, right-click to toggle, hidden on mobile. |
| **Loading panel** | `loading-panel.js` | Boot overlay until `isDoneLoading`. |
| **Misc overlays** | paused label, external camera canvas, equipped-status icons (`equipped-emoji-icon.js` etc.), `atom-trail.js` breadcrumbs, `snackbar.js`-style notices | |

Primitives: `action-button` (+small/tiny), `icon-button`, `panel-item-button`,
`panel-section-header`, `popup-menu`/`popup-panel-menu`, `floating-text-input`, `form-components`
(Label/Checkbox/Radio), `tooltip.js` (Tippy), `layer-pager`, `segment-control`.

## Theming, i18n, Storybook

- **Theming**: styled-components + CSS custom properties (`--panel-background-color`,
  `--action-button-*`, `--menu-*`, `--canvas-overlay-*` …) set by `src/utils/theme.js`; overridable
  via `window.APP_CONFIG.theme`. Layout state via body classes: `.panels-collapsed`, `.paused`,
  `.projection-flat`.
- **i18n**: react-intl v5; `wrapped-intl-provider.js` re-renders on `locale-updated`; locale JSONs in
  `src/assets/locales/`; detection in `src/utils/i18n.js` with fallbacks to `en`. ("Remove unused
  translations" is a todo.)
- **Storybook** 6 (`npm run storybook`, port 6006): 25 stories covering most primitives and popups —
  the fastest way to see the design system.

## Assets

`src/assets/images/icons/` (~80 inline SVGs, `.svgi`), avatar SVG parts + viseme mouth shapes,
HUD 9-patches, cubemap, MSDF fonts, spritesheets (regenerate via `npm run spritesheet`).

# EduMaker fork notes

This repository is EduMaker's fork of [scratchfoundation/scratch-editor](https://github.com/scratchfoundation/scratch-editor),
licensed AGPL-3.0 like the original. It serves the editor under the EduMaker name (에듀메이커 블록코딩).

## Changes to upstream packages

Keep these small so upstream updates merge easily.

| Change | Files |
| - | - |
| Menu bar honors the `logo`/`logoAlt` props and renders an empty slot (`extraMenuSlotId`) for the host app's menu | `scratch-gui/src/components/menu-bar/`, `components/gui/gui.jsx` |
| Default sprite is EduBot (own artwork) with a self-made "ding" sound; Scratch Cat, Gobo, Pico, Nano, Giga and Tera are filtered out of the libraries | `scratch-gui/src/lib/default-project/`, `lib/libraries/library-content.js` |
| Korean translations for strings missing from `scratch-l10n` | `scratch-gui/src/lib/locale-overrides.js`, `reducers/locales.js` |
| Save to and open from local files with the File System Access API (save overwrites the opened file), download/upload fallback elsewhere | `scratch-gui/src/lib/project-file-handle.js`, `containers/sb3-downloader.jsx`, `lib/sb-file-uploader-hoc.jsx` |

## EduMaker packages

- `packages/edumaker-app`: the app users see. See its README for running it and for the lesson content format.

Lesson content is data, not code. Only a public test sample lives here (`packages/edumaker-app/public/contents`);
real lessons are kept in a separate private repository and served from `VITE_CONTENT_BASE_URL`.

## Open items

- Sprite, backdrop and sound libraries still load from the Scratch CDN (`cdn.assets.scratch.mit.edu`); those assets
  are CC BY-SA (Scratch Foundation). Self-hosting needs a decision.
- Upstream workflows meant for the Scratch organization (`update-i18n`, `ghpages-cleanup`, `signature-assistant`,
  `publish`) should stay disabled in this fork.
- Trademark and AGPL scope questions are listed for legal review in the EduMaker prototype repository
  (`docs/spike-scratch-editor.md` in `edumaker7/edumaker-blocks`).

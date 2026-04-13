# Changes made

## PDF parsing
- Disabled PDF.js worker in Electron main process for stability.
- Replaced raw `items.map(str).join(' ')` extraction with line reconstruction based on x/y coordinates.
- Added spacing rules for punctuation and line merging.
- Added paragraph detection from vertical gaps.
- Added hyphenated line rejoin handling.
- Added cleanup for page numbers and simple footer/header noise.

## Export
- Added `Dataset JSON` export.
- Added `Dataset JSONL` export.
- Exports include offsets, selected text, labels, notes, and nearby context windows.

## Notes
- The uploaded zip contained `node_modules` with a missing Rollup optional dependency on this machine, so I could not complete a full `electron-vite build` here.
- The source code has been updated; on your machine, run `npm install` and then `npm run dev`.

# LinguaSpace Coding Lab integration

This repository is based on the official Scratch Editor monorepo from the Scratch
Foundation and is licensed under GNU AGPL v3. The `scratch-gui` package is built
as a separate static application and embedded by LinguaSpace in a same-origin
iframe, so Scratch does not enter the main Next.js JavaScript bundle.

## Build

From the repository root, install the monorepo dependencies and build the
standalone iframe editor:

```sh
npm ci
npm run prepare:linguaspace
npm run build:linguaspace
```

The generated editor is in `packages/scratch-gui/build/`. LinguaSpace serves
that directory from `public/coding/editor/`.

## LinguaSpace changes

- `packages/scratch-gui/src/playground/linguaspace-coding-assist.js` provides
  English SpeechSynthesis for selected Scratch blocks, typed block-field
  characters, manual block/script reading, and safe same-origin project
  import/export messages.
- `packages/scratch-gui/src/playground/render-gui.jsx` installs the bridge only
  in the regular Scratch editor.
- `packages/scratch-gui/webpack.config.js` adds an iframe-only build target and
  omits the editor's other demo entry points from that build.

The bridge handles only Scratch's editor controls. It does not listen to or
read password fields or page text outside the Scratch editor.

## License and source

This is a modified version of Scratch Editor. It is distributed under the
GNU Affero General Public License, version 3. Keep the upstream license and
copyright notices with this source. Users of a modified network service must
be able to access the corresponding source under the AGPL terms.

Upstream project: <https://github.com/scratchfoundation/scratch-editor>

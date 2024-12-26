# Loro Monaco

[Demo](https://mslxl.github.io/loro-monaco/)

A library for using Loro CRDT with Monaco Editor.

## Usage

First, install the dependencies:

```bash
npm install loro-monaco
```

And then you can use it in your project

```ts
const container = document.getElementById("editorB")!;

const editorA = editor.create(container, {
  theme: "vs",
  automaticLayout: true,
});
const doc = new LoroDoc();
const text = docA.getText("code");
const awarenessA = new MonacoAwareness(docA.peerIdStr);

new MonacoBinding(
  docA,
  textA,
  editorA.getModel()!,
  new Set([editorA]),
  awarenessA
);
```

You can see more details in the [sample](https://github.com/mslxl/loro-monaco/blob/main/demo/src/main.ts).

## Features

- [X] Shared Cursor
- [ ] Time Travel

## Styling

You can use the following CSS classes to style remote cursor selections:

- `loroRemoteSelection`
- `loroRemoteSelectionHead`

Additionally, you can enable per-user styling (e.g.: different colors per user).

- `yRemoteSelection-${PeerId}`
- `yRemoteSelectionHead-${PeerId}`

## Credits

This library is a imitation of [y-monaco](https://github.com/yjs/y-monaco), thanks to the great work of the yjs team.

Also, thanks to loro-dev tem for their great work on Loro.

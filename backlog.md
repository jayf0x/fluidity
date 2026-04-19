## BUG/CORE: Global typing is imported

Currently types are manually imported. A d.ts file should normally be global.

> This is because the prop `"declarationDir": "./types",` in `tsconfig.json` does not work (error: The 'rootDir' setting must be explicitly set to this or another path to adjust your output's file layout.)

TODO:

- move ./types/index.d.ts to src/index.d.ts
- make sure build process correctly build the typing into ./dist/index.d.ts

## BUG/CORE: failed to fetch image

On a local project where I installed our library I tried `<FluidImage src="logo.png"/>`, where `logo.png` is stored in the `./public` folder.
Gives error: `Simulation error: Failed to execute 'fetch' on 'WorkerGlobalScope': Failed to parse URL from preview.png`

This issue is commonly caused by blob-based worker scripts created via URL.createObjectURL(new Blob(...)) or specific bundler configurations (like Turbopack in Next.js), where the worker's base URI becomes the blob itself, making relative paths invalid.

To resolve this, you must ensure the worker receives an absolute base URL from the main thread and constructs the resource URL explicitly.

eg.

```js
// Main Thread
const workerScript = `
  onmessage = (evt) => {
    const base = evt.data; // e.g., 'http://localhost:3000/'
    const absoluteUrl = new URL("preview.png", base).href;
    fetch(absoluteUrl)
      .then(resp => resp.blob())
      .then(blob => postMessage(blob));
  };
`;
const workerUrl = URL.createObjectURL(new Blob([workerScript], { type: 'application/javascript' }));
const worker = new Worker(workerUrl);
// Pass the base URI from the main thread to the worker
worker.postMessage(window.location.origin);
```

## BUG/CORE: better typing for `DEFAULT_PROPS`

File: src/core/config.ts

const `DEFAULT_PROPS` has no real typing and should.
Possibly split this up into a shared, and custom per type (image, text).

Expected:

- All component, functions, objects, variables... must use strict typing that is globally defined in types/index.d.ts
- if you encounter more issues like this, either create a separate bug or resolve.

## BUG/CORE: Better UX and Refine Ref API functions

Scope:

- src/react/FluidImage.tsx
- src/react/FluidText.tsx
- src/fluid-controller.ts
- src/core/simulation.ts

Currently we support 4 functions on the imperative ref: reset, updateLocation, splat, updateConfig.

TODO

- FluidImage: `reset` triggers `setImageSource` in `simulation.ts`. Is the reload of the Bitmap really needed here or is there no valid reason? Double check and change if needed.
- Rename `updateLocation` to `move` in the react hooks only.
- Currently `FluidImage` and `FluidText` use the separate useImperative functions with similar functionality. Make sure there is strict typing to make sure each has all of the 4 functions.

## Final Cleanup and quality assessment

Go through the readme and core files and see where there are inconsistencies, possible big improvements, bugs...

RULES

- document all issues or improvements you find as a backlog.md item
- optionally add a `// TODO: [backlog-item-name]` where you found the issue
- do not waste tokens or energy on being too precise or too perfect. You can loosely reference what the bug is and where it can be found, no need to be too detailed. use caveman like pragmatism.

## BUG/CORE: Global typing is imported

Currently types are manually imported. A d.ts file should normally be global.

> This is because the prop `"declarationDir": "./types",` in `tsconfig.json` does not work (error: The 'rootDir' setting must be explicitly set to this or another path to adjust your output's file layout.)

TODO:

- move ./types/index.d.ts to src/index.d.ts
- make sure build process correctly build the typing into ./dist/index.d.ts
-

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

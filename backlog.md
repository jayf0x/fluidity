## CORE/FEATURE: native string color support

Add native support for multiple string color values for configs like `glowColor` and `waterColor` to be set to hex or rgb values.

## CORE/FEATURE: merge props config into main

Merge prop `config` for fluid config into general props.

Question:
is it worth it? Typing and prop passing might simplify, but prop's and con's need to be established first.

## CORE/BUG: documentation about web working with multiple instances is inaccurate

Currently in readme and `demo/src/examples/SplitExample.tsx` it's documented that you need to disable the web-worker if you want to use 2 elements.

This need to disable is false as they (likely) use the same worker instance.

Task: find out where this confusion comes from and resolve it. Update documentation and code (eg. `/demo/src/examples/SplitExample.tsx`) according.

## CORE/BUG: add support for text positioning customization

Currently no support to eg. move text to left or align on right.

Task: add prop `textAlign` to `<FluidText` to update text positioning in `src/core/textures.ts`.

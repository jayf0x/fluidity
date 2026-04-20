## CORE/BUG: black outline on Text

On `<FluidText` there is a tiny black border on the text. Even visible when setting all colors (background, text, shine...) to white, there is still a tiny black border.

It looks like some source of blackness is filling the pixelated edges of the text.

Expected:
Either to have this source of blackness set to the text-color so there are no conflicts or no fill at all (if possible).

Or maybe make the text itself just 1px larger or the backdrop text 1px smaller?

## CORE/BUG backgroundSrc not working for text

tbd.

---

## CORE/FEATURE: native string color support

Add native support for multiple string color values for configs like `glowColor` and `waterColor` to be set to hex or rgb values.

## CORE/FEATURE: merge props config into main

Merge prop `config` for fluid config into general props.

Question:
is it worth it? Typing and prop passing might simplify, but prop's and con's need to be established first.

## CORE/FEATURE: add support for text positioning customization

Currently no support to move text to left or align on right.

Task: add prop `textAlign` to `<FluidText` to update text positioning in `src/core/textures.ts`.
Default remains 'center'.

## CORE/FEATURE: Support transparent colors

tbd.

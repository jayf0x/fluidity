## CORE/FEATURE + DEMO/FEATURE: better value ranges

Currently values are not correctly reflected. This also needs to be visible in the DEMO os that the DEMO is a reflection of the ideal/basic use case.
Ideally all inputs in the DEMO also are a float and we normalize them internally.

eg.
"densityDissipation" can is a float, but the actual value is in between 0.95 and 0.998 or 1. So the float value that can be inputted should be normalized to fit that 0.95-1.0 ratio without the user having to worry about this.

Needs investigation and tests using values from DEMO and defaults.

Expected:

- all values that can be passed in components or DEMO are a float
- internally the float is normalized to a fitting range for some unique use cases.
- no max or min, the user can choose to pass custom values that don't fit the normal.

Important:
Do not resolve this feature if you have no idea what the values should be! Then simply ask the user to figure this otu and provide them (or some). You can either way already setup some functionality using "densityDissipation".

## CORE/FEATURE: merge props config into main

Merge prop `config` for fluid config into general props.

Question:
is it worth it? Typing and prop passing might simplify, but prop's and con's need to be established first.

## CORE/FEATURE: add support for text positioning customization

Currently no support to move text to left or align on right.

Task: add prop `textAlign` to `<FluidText` to update text positioning in `src/core/textures.ts`.
Default remains 'center'.

## CORE/FEATURE: Support transparency in colors

tbd.

## CORE/BUG: black outline on Text

On `<FluidText` there is a tiny black border on the text. Even visible when setting all colors (background, text, shine...) to white, there is still a tiny black border.

It looks like some source of blackness is filling the pixelated edges of the text.

Expected:
Either to have this source of blackness set to the text-color so there are no conflicts or no fill at all (if possible).

Or maybe make the text itself just 1px larger or the backdrop text 1px smaller?

## CORE/BUG backgroundSrc not working for text

tbd.

---

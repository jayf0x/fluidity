## CORE/BUG: documentation about web working with multiple instances is inaccurate

Currently in readme and `demo/src/examples/SplitExample.tsx` it's documented that you need to disable the web-worker if you want to use 2 elements.
But it works fine without disabling this. However there was an articles that highlighted that this could cause issues, but that might already be outdated by modern standards. Research this.

Task: find out where this confusion comes from and resolve it. Update documentation and code (eg. `/demo/src/examples/SplitExample.tsx`) accordingly.

## CORE/BUG: text in range of splatRadius flickers

Setup: background=black, text-color=white.

Text in range of the cursor (aka. `splatRadius`) flickers.
The flicker gets more heavy when the cursor is closer. When fully on top the flicker is most visible.

Conditions for flicker:

- in range fo text. The close the more the flicker is visible.
- cursor needs to move. No movement (aka. no new splats), no flicker.
- only visible with `<FluidText`.

Possibly related or cause:
I can see the `splatRadius` as a radial shadow on top of the text.
This might be the cause of the splat as when the cursor moves, the shadow is not visible and we see the full white text or letter. But when the cursor is idle, the 'shadow' appears. This could cause the flicker as we switch from shadow to no-shadow when a new splat is triggered.

## CORE/BUG: black outline on Text

On `<FluidText` there is a tiny black border on the text. Even visible when setting all colors (background, text, shine...) to white, there is still a tiny black border.

It looks like some source of blackness is filling the pixelated edges of the text.

Expected:
Either to have this source of blackness set to the text-color so there are no conflicts or no fill at all (if possible).

Or maybe make the text itself just 1px larger or the backdrop text 1px smaller?

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

## CORE/FEATURE

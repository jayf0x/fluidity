# CORE/BUG: typing errors on useImperativeHandle

In both files there are ts errors:

- src/react/FluidImage.tsx
- src/react/FluidText.tsx

## BUG/CORE: Text edges are pixelated

Try refine the edges of text to not be pixelated. Possibly project on larger canvas first and then downscale.

Possibly unrelated: there is a thin ~1px black border around text.

## CORE/BUG, DEMO/BUG: preset should be default prop

Make that preset can always be passed and is an option selectable in the `useFluidControls`.

Currently in `demo/src/examples/PresetsExample.tsx` we have to manually set the preset, but this should also work with a prop.
Currently this errors when preset prop is passed to the component.

ORder of props that should take effect:

- preset sets a base
- regular props overwrite base

## CORE/BUG: Splash is still black with red background

Setting the background of the image to 'red' via `backgroundColor` and then moving the cursor, still adds blackness to the canvas.
Even setting the {"waterColor":"#ffffff"} and {"glowColor":"#ffffff"} there is still dark grey or minimal blackness in the 'splash'.

Especially visible when setting the `algorithm` to "aurora" or "ripple", the cursor just adds blackness.

Expected:
When the background is red, and the water and glow colors are set to red, I might expect some darkness due to light refraction, but it's currently too black.

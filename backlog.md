## BUG/CORE: Text edges are pixelated

Try refine the edges of text to not be pixelated. Possibly project on larger canvas first and then downscale.

Possibly unrelated: there is a thin ~1px black border around text.

## BUG/CORE: Splash is still black with red background

Setting the background of the image to 'red' via `backgroundColor` and then moving the cursor, still adds blackness to the canvas.
Even setting the {"waterColor":"#ffffff"} and {"glowColor":"#ffffff"} there is still dark grey or minimal blackness in the 'splash'.

Especially visible when setting the `algorithm` to "aurora" or "ripple", the cursor just adds blackness.

Expected:
When the background is red, and the water and glow colors are set to red, I might expect some darkness due to light refraction, but it's currently too black.

## BUG/DEMO: change current rending to has router

Change current custom routing logic to a simple hash router or use Tanstack router.

## BUG/CORE: prop textQuality does not work

This prop was added to control how high quality the text must be rendered.
This was meant to solve the issue where text is badly pixelated edges. Eg. upscaling it first to then print the bitmap on a smaller canvas.

Currently the prop does not do much and setting it to higher values does not meaningfully increase the text.

This might be related:

```
Fonts on a JavaScript Canvas appear badly pixelated or blurry primarily because the canvas rendering resolution often does not match the device's high pixel density (Retina/High DPI screens), causing the browser to stretch a low-resolution bitmap to fit the display.  Additionally, text smoothing (anti-aliasing) is often enabled by default, which blurs sharp pixel fonts, and non-integer pixel offsets in CSS or transform operations can further degrade text crispness.
```

Expected outcome depends:

- If upgrading the quality of the text causes real performance decrease, then `textQuality=1` (or maybe even support values higher than 1) should give highest quality, while `textQuality=0` should give the current result with badly pixelated edges.
- if the performance is not hurt by increasing the text quality (eg. only initial setup), then simply always go for HQ and remove prop `textQuality`

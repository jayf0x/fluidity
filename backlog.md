## CORE/BUG: Param `curl` has no effect

Param Curl has no visual effect in any test case so far.

## CORE/BUG: Param `pressureIterations` has no effect

pressureIterations is normally in charge of general quality.
Setting it to 20 or 200 has no visual difference.

## CORE/BUG: A background image set with `backgroundSrc` needs to have `effect`

Currently passing a bright image as `backgroundSrc` will result in the brighter parts of the image not being interactive.
For the `createImageTextures` we used the `ctx.filter` like `brightness(${effect}) blur(8px);`, but this does not work well for the bitmap background.

In `src/core/textures.ts` the `createTextTextures` I added a possible fix for the text, but this makes both the image and text more transparent:

```tsx
export function createTextTextures(
    ...
    const draw = (fillColor: string, blur = 0) => {
        if (backgroundBitmap) {
            ...
            ctx.filter = blur ? `brightness(0.1) blur(50px)` : '';
            ctx.drawImage(backgroundBitmap, x, y, drawW, drawH);
            ctx.filter = '';
        ...
```

This makes the background image and text nearly fully transparent to the background.

Maybe there are some better resolutions to making the image more interactive without our brightness hack?

## CORE/BUG: Cursor splash flickering when hover none interactive part

When you have a text or background without effect and you hover over it, you get a flicker.
The flicker is the cursor or splat being active but then immediately being killed the second it exists.

So if you hover slowly, you will see the splat around the cursor being active and then instantly being killed.

Expected:
Either no flicker, or some smoothening functionality that makes the flicker not visible.

## CORE/BUG: background always defined as black

In code textures there are a lot of hard-coded `ctx.fillStyle = 'black';`.

Answer question: does this impact anything? Possibly make this the background color prop.

## CORE/BUG: performance shaders

Research if conditionals in shader (src/core/shaders.ts) are a performance issue.
Currently no real issues, but the conditional algorithm could maybe be optimized using a separate shader.

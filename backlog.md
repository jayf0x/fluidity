## CORE/BUG: `curl` param has no visual effect

Setting `curl` 0→2 produces no visible difference in any example.

**Suspect:** `vorticityShader` uniform binding or `cfg.curl` value range mismatch. DEFAULT_CONFIG has `curl: 0.0001` — may be too small to matter. Check `vorticity.uniforms.curl` is correctly bound in `simulation.ts #step()` and that the value passed is in the right unit (shader may expect 0–10 not 0–0.01).

**Files:** `src/core/simulation.ts` (vorticity pass, line ~340), `src/core/shaders.ts` (vorticityShader), `src/core/config.ts` (DEFAULT_CONFIG curl default).

---

## CORE/BUG: `pressureIterations` has no visual effect

Changing 20→200 shows no quality difference.

**Suspect:** Pressure FBO may not be swapping correctly per iteration, or divergence pass input is wrong. Check the loop in `#step()` — each iteration should read `pressure.read.tex` and write to `pressure.write.fbo` then swap. If `blit(pressure.write.fbo)` + `pressure.swap()` is inside the loop correctly, also verify `uDivergence` stays bound to `divergence.tex` (not accidentally re-bound per iteration).

**Files:** `src/core/simulation.ts` pressure solve loop (~line 380–395).

---

## CORE/BUG: `backgroundSrc` obstacle detection broken for bright images

Bright `backgroundSrc` images → bright areas non-interactive (obstacle mask reads high brightness = solid obstacle).

**Root cause:** `createTextTextures` / `createImageTextures` in `textures.ts` draw the background bitmap into the same canvas used to generate the obstacle texture. Obstacle = brightness of drawn pixels. Background image bleeds into obstacle mask.

**Fix options:**

1. **Separate canvases** — draw background on one canvas (background tex), draw only text/image on a second canvas (obstacle tex). Don't composite background into obstacle canvas at all. This is cleanest — zero coupling.
2. **Post-process obstacle** — after compositing, draw obstacle content again on top at full brightness to "overwrite" any background influence on the obstacle channel.

Option 1 is correct. `createTextTextures` should return `backgroundTex` from a canvas with only the background bitmap, `obstacleTex` from a canvas with only the text (no background).

Make sure that invariant is preserved after the refactor — the coverage texture should still come from the obstacle canvas (text/image shape), not the background canvas.

**Files:** `src/core/textures.ts` — `createTextTextures`, `createImageTextures`.

---

## CORE/BUG: Cursor splat flickers over non-interactive areas

Moving cursor over non-obstacle (empty canvas region) → splat appears then immediately vanishes.

**Cause:** Obstacle mask = 0 in empty areas → advection step zeroes velocity and density near those pixels → splat injected by `handleMove` gets wiped in same frame by advection pass using obstacle mask.

**Fix:** Advection zeroing should only zero _inside_ obstacles (obs=1), not outside (obs=0). Check advection shader — it should zero velocity where `obs > threshold`, not where `obs < threshold`. Possible sign flip. Also check `uObstacle` texture: value should be 1 _inside_ obstacle (text/image pixels), 0 _outside_ (empty space). If inverted → empty space acts as obstacle.

**Files:** `src/core/shaders.ts` (advectionShader obstacle sampling), `src/core/textures.ts` (verify obstacle texture polarity).

---

## CORE/BUG: Background hardcoded black in textures

`ctx.fillStyle = 'black'` appears multiple times in `textures.ts` as canvas clear color. If user sets `backgroundColor` to something other than near-black, this fill bleeds into the texture and looks wrong.

**Question first:** Does this `fillStyle` affect visual output or just act as a neutral base? If background texture is fully covered by drawImage, it's harmless. If not fully covered (e.g. small `imageSize`), black bleeds in.

**Fix (if it matters):** Accept `backgroundColor` string param in `createTextTextures` / `createImageTextures`, use as `ctx.fillStyle` instead of `'black'`. Prop already exists on components → thread it through `FluidSimulation.setTextSource` opts or add separate param.

**Files:** `src/core/textures.ts`, possibly `src/core/simulation.ts` if prop needs threading.

---

## CORE/PERF: Display shader conditionals (`uAlgorithm` int switch)

Display shader has `if (uAlgorithm == N)` branches for 5 algorithms. On some GPU drivers, uniform-based branching is fine (branch is uniform → no divergence). On others, all branches may execute.

**Research:** GLSL `if` on a `uniform int` is typically fine — GPU can predict branch at draw time. Real concern is only if branches have vastly different instruction counts causing stall. Current 5 algorithms are similar length.

**Option if perf is actually measured bad:** Compile 5 separate `Program` instances (one per algorithm), select at draw time with `switch (algorithmInt) { case 0: programs.display_standard.bind(); ... }`. Zero branching in shader. Trades 5× program memory for zero conditional overhead.

**Verdict:** Probably not worth changing unless profiling shows it. Measure first.

**Files:** `src/core/shaders.ts` (displayShader), `src/core/gl-utils.ts` + `src/core/simulation.ts` if splitting programs.

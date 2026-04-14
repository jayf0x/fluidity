## CORE/BUG: `pressureIterations` has no visual effect

Changing 20→200 shows no quality difference.

**Suspect:** Pressure FBO may not be swapping correctly per iteration, or divergence pass input is wrong. Check the loop in `#step()` — each iteration should read `pressure.read.tex` and write to `pressure.write.fbo` then swap. If `blit(pressure.write.fbo)` + `pressure.swap()` is inside the loop correctly, also verify `uDivergence` stays bound to `divergence.tex` (not accidentally re-bound per iteration).

**Files:** `src/core/simulation.ts` pressure solve loop (~line 380–395).

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

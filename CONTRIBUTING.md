# Contributing to fluidity-js

## Setup

```bash
git clone https://github.com/jayf0x/fluidity
cd fluidity
bun install
```

Run tests:

```bash
bun test:claude
```

Run the demo (requires Node 20):

```bash
cd demo
PATH=/Users/me/.nvm/versions/node/v20.19.6/bin:$PATH bun install
PATH=/Users/me/.nvm/versions/node/v20.19.6/bin:$PATH bun dev
```

## Before opening a PR

- All 83 tests pass (`bun test:claude`)
- No new peer dependencies without prior discussion
- Code formatted with `bun format`
- See [AGENTS.md](./AGENTS.md) for code style and architecture constraints

## Where to look

| Goal | Files |
|------|-------|
| Add/change a visual effect | `src/core/shaders.ts`, `src/core/wgsl-shaders.ts`, `src/core/simulation.ts` |
| Add a new prop | `src/globals.d.ts`, `src/react/FluidText.tsx` or `FluidImage.tsx`, `src/core/config.ts` |
| Add a preset | `src/core/config.ts` |
| Fix a simulation bug | `src/core/simulation.ts`, `src/core/gl-utils.ts`, `src/core/gpu-utils.ts` |
| Fix React lifecycle | `src/react/useFluid.ts`, `src/fluid-controller.ts` |
| Fix worker communication | `src/worker/index.ts`, `src/fluid-controller.ts` |

## Labels

Every issue carries three label groups:

### `type:*`
| Label | Use for |
|-------|---------|
| `type:bug` | Something broken |
| `type:feature` | New prop, algorithm, or API |
| `type:improvement` | Perf, visual quality, or correctness enhancement |
| `type:docs` | Documentation fix |
| `type:refactor` | Code restructure, no behaviour change |

### `domain:*`
| Label | Scope |
|-------|-------|
| `domain:core` | Props, config, public API |
| `domain:render` | Shaders, FBOs, display pass |
| `domain:physics` | Fluid solver, pressure, advection |
| `domain:react` | React components and hooks |
| `domain:dx` | Build, packaging, DX |

### `effort:*`
| Label | Meaning |
|-------|---------|
| `effort:1` | Trivial — under 30 min |
| `effort:2` | Small — a few hours |
| `effort:3` | Medium — half to full day |
| `effort:4` | Large — multi-day |
| `effort:5` | Major — architectural change |

## Reporting issues

Use the GitHub issue templates. Pick the template that matches your issue type and add the appropriate `type:*`, `domain:*`, and `effort:*` labels.

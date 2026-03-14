# Vitest v4 Breaking Changes (v3 → v4)

> Requires Vite >= 6, Node.js >= 20
> Researched: 2026-03-14

- `vite-node` replaced with Vite's Module Runner
- `workspace` config key renamed to `projects`
- Worker pool options renamed:
  - `maxThreads`/`maxForks` → `maxWorkers`
  - `singleThread`/`singleFork` → `maxWorkers: 1, isolate: false`
- `@vitest/browser/context` → `vitest/browser`
- Removed: `poolMatchGlobs`, `environmentMatchGlobs`, `deps.external`, `deps.inline`, `deps.fallbackCJS`, `minWorkers`

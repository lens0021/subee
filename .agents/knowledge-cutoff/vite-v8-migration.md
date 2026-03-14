# Vite v8 Migration Notes

> Researched: 2026-03-14
> Current versions: vite ^6.0.7, vitest ^3.2.4
> Target version: vite ^8.0.0

---

## Migration Path

Either upgrade v6 → v7 → v8 in steps, or jump directly to v8 while applying breaking changes from both versions.

---

## Vite 7 Breaking Changes (v6 → v7)

### Node.js Requirements
- Node.js 18 dropped (EOL April 2025)
- **Node.js 20.19+ or 22.12+** required
- CommonJS build of Vite removed — ESM-only distribution

### Default Browser Target (`build.target`)
- Before: `'modules'`
- After: `'baseline-widely-available'` (Baseline as of May 2025)
- Chrome 87→107, Firefox 78→104, Safari 14.0→16.0

### Removed APIs
- `splitVendorChunkPlugin` → use `build.rollupOptions.output.manualChunks`
- Sass legacy API (`css.preprocessorOptions.sass.api`) removed

### Plugin Hook Changes
`transformIndexHtml` `enforce`/`transform` properties removed:
```ts
// Before
{ enforce: 'pre', transform(html) {} }

// After
{ order: 'pre', handler(html) {} }
```

---

## Vite 8 Breaking Changes (v7 → v8)

> Released: 2026-03-12. "The most significant architectural change since Vite 2."

### Core: Rolldown + Oxc Replace esbuild + Rollup
- esbuild and Rollup → **Rolldown** (Rust-based bundler) + **Oxc**
- Build speed 10–30x faster (Linear: 46s→6s, Beehiiv: 64% reduction)
- Install size increases ~15 MB (lightningcss ~10 MB, Rolldown ~5 MB)

### Browser Target Further Bumped
- Chrome 107→111, Firefox 104→114, Safari 16.0→16.4 (Baseline as of 2026-01-01)

### Config Key Renames (deprecated warnings shown, auto-compat provided)
| Before | After |
|--------|-------|
| `build.rollupOptions` | `build.rolldownOptions` |
| `worker.rollupOptions` | `worker.rolldownOptions` |
| `esbuild` | `oxc` |
| `optimizeDeps.esbuildOptions` | `optimizeDeps.rolldownOptions` |

### JS Transform: esbuild → Oxc
- `transformWithEsbuild` deprecated → use `transformWithOxc`
- **Decorator limitation**: Oxc cannot lower native decorators — use Babel or SWC plugin if needed
- `esbuild.supported` option removed

### Minifier Changes
- JS: Oxc Minifier replaces esbuild
  - Revert with: `build.minify: 'esbuild'` + separate esbuild install
  - `mangleProps`/`reserveProps` not supported
- CSS: Lightning CSS replaces esbuild
  - Revert with: `build.cssMinify: 'esbuild'`

### Plugin API Changes
- `load`/`transform` hooks converting non-JS to JS must return `moduleType` explicitly:
  ```ts
  // Before
  return { code }

  // After
  return { code, moduleType: 'js' }
  ```
- Build error type is now `BundleError` (`Error & { errors?: RolldownError[] }`)
- Parallel hooks now execute sequentially in Rolldown
- Removed hooks: `shouldTransformCachedModule`, `resolveImportMeta`, `renderDynamicImport`, `resolveFileUrl`

### CJS Interop Change
Default import behavior from CJS modules unified between dev and build.
Escape hatch: `legacy.inconsistentCjsInterop: true`

### Removed Features
- Object form of `build.rolldownOptions.output.manualChunks`
- System and AMD output formats
- `import.meta.hot.accept` no longer accepts URLs — use module IDs instead

### New in v8 (non-breaking)
- `resolve.tsconfigPaths` option — can replace `vite-tsconfig-paths` plugin
- `server.forwardConsole` — forwards browser console logs to terminal
- Integrated Vite DevTools

---

## Vitest v4 Breaking Changes

Vitest follows its own release cycle. If upgrading alongside Vite 8:

- `vite-node` replaced with Vite's Module Runner
- `workspace` config renamed to `projects`
- Worker pool options renamed:
  - `maxThreads`/`maxForks` → `maxWorkers`
  - `singleThread`/`singleFork` → `maxWorkers: 1, isolate: false`
- `@vitest/browser/context` → `vitest/browser`
- Removed: `poolMatchGlobs`, `environmentMatchGlobs`, `deps.external`, `deps.inline`, etc.

---

## Project Checklist

- [ ] Verify Node.js version (20.19+ or 22.12+)
- [ ] Rename `build.rollupOptions` → `build.rolldownOptions`
- [ ] Rename `esbuild` config → `oxc`
- [ ] Update `transformIndexHtml` plugin hooks: `enforce`/`transform` → `order`/`handler`
- [ ] Update `vitest.config`: `workspace` → `projects`
- [ ] Update worker pool options: `maxThreads`/`maxForks` → `maxWorkers`
- [ ] Evaluate `resolve.tsconfigPaths` (project already has path aliases)
- [ ] Verify build output after migration

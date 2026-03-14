# Vite v8 Breaking Changes (v7 → v8)

> Released: 2026-03-12. "The most significant architectural change since Vite 2."
> Researched: 2026-03-14

### Core: Rolldown + Oxc replace esbuild + Rollup
- Build speed 10–30x faster (Linear: 46s→6s, Beehiiv: 64% reduction)
- Install size increases ~15 MB (lightningcss ~10 MB, Rolldown ~5 MB)
- Browser target bumped: Chrome 107→111, Firefox 104→114, Safari 16.0→16.4 (Baseline 2026-01-01)

### Config key renames (auto-compat provided, deprecation warnings shown)
| Before | After |
|--------|-------|
| `build.rollupOptions` | `build.rolldownOptions` |
| `worker.rollupOptions` | `worker.rolldownOptions` |
| `esbuild` | `oxc` |
| `optimizeDeps.esbuildOptions` | `optimizeDeps.rolldownOptions` |

### JS transform: esbuild → Oxc
- `transformWithEsbuild` deprecated → use `transformWithOxc`
- `esbuild.supported` option removed
- **Decorator limitation**: Oxc cannot lower native decorators — use Babel or SWC plugin if needed

### Minifier changes
- JS: Oxc Minifier (revert: `build.minify: 'esbuild'` + separate esbuild install; `mangleProps`/`reserveProps` unsupported)
- CSS: Lightning CSS (revert: `build.cssMinify: 'esbuild'`)

### Plugin API changes
- `load`/`transform` converting non-JS to JS must return `moduleType` explicitly:
  ```ts
  // Before
  return { code }
  // After
  return { code, moduleType: 'js' }
  ```
- Build error type: `BundleError` (`Error & { errors?: RolldownError[] }`)
- Parallel hooks now execute sequentially in Rolldown
- Removed hooks: `shouldTransformCachedModule`, `resolveImportMeta`, `renderDynamicImport`, `resolveFileUrl`

### Other removals
- Object form of `build.rolldownOptions.output.manualChunks`
- System and AMD output formats
- `import.meta.hot.accept` no longer accepts URLs — use module IDs

### New (non-breaking)
- `resolve.tsconfigPaths` — can replace `vite-tsconfig-paths` plugin
- `server.forwardConsole` — forwards browser console to terminal
- Integrated Vite DevTools

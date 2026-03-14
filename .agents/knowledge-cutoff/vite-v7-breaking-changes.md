# Vite v7 Breaking Changes (v6 → v7)

> Released: mid-2025
> Researched: 2026-03-14

- Node.js 18 dropped (EOL April 2025) — requires **Node.js 20.19+ or 22.12+**
- CommonJS build of Vite removed — ESM-only distribution
- Default `build.target` changed: `'modules'` → `'baseline-widely-available'` (Baseline May 2025)
  - Chrome 87→107, Firefox 78→104, Safari 14.0→16.0
- `splitVendorChunkPlugin` removed → use `build.rollupOptions.output.manualChunks`
- Sass legacy API (`css.preprocessorOptions.sass.api`) removed
- `transformIndexHtml` plugin hook: `enforce`/`transform` → `order`/`handler`

```ts
// Before
{ enforce: 'pre', transform(html) {} }

// After
{ order: 'pre', handler(html) {} }
```

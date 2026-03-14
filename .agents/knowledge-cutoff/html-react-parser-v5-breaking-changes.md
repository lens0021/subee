# html-react-parser v5 Breaking Changes (v3 → v5)

> v4: 2023-05-31 / v5: 2023-10-29
> Researched: 2026-03-14

**v4:** Internal `html-dom-parser` bumped to v4 — parsing behavior changes.

**v5:** Migrated to TypeScript — module export structure changed.
- CommonJS: `require('html-react-parser').default` now required
  (previously `require('html-react-parser')` returned the function directly)
- `normalizeWhitespace` parser option removed

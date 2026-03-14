# TypeScript 5.9 Changes

> Researched: 2026-03-14

### `tsc --init` now generates modern defaults

The generated tsconfig template changed significantly. These options are now
included by default in new projects, but **they are not actual compiler defaults**
— removing them from an existing tsconfig will change behavior:

- `strict: true`
- `skipLibCheck: true`
- `isolatedModules: true`
- `jsx: "react-jsx"`
- `module: "nodenext"` (was `"commonjs"`)
- `target: "esnext"` (was `"ES2016"`)
- `verbatimModuleSyntax: true` (new addition)

### New: module/target implications

- `"module": "node20"` → implies `"target": "es2023"`
- `"module": "nodenext"` → implies `"target": "esnext"`

### New flag: `--erasableSyntaxOnly`

Disallows TypeScript syntax that cannot be erased without transformation
(e.g. `enum`, `namespace`, parameter properties). Useful for runtimes that
support type-strip-only execution (Node.js 22.6+ `--experimental-strip-types`).

### Existing implication (not new, but worth noting)

- `"moduleResolution": "bundler"` implies `allowSyntheticDefaultImports: true`
  — so explicitly setting `esModuleInterop: true` just for synthetic default
  imports is redundant in bundler-mode projects, though `esModuleInterop` also
  emits CJS interop helpers (irrelevant when `noEmit: true`).

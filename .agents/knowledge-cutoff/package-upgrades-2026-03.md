# Package Upgrade Notes (March 2026)

> Researched: 2026-03-14

---

## @tailwindcss/vite — Vite 8 Support

- Latest stable: `4.2.1` (2026-02-23) — does **not** support Vite 8
- Vite 8 peer dep support was merged to `main` the same day as Vite 8 shipped (2026-03-12),
  but has not been released yet — watch for `v4.2.2` or `v4.3.0`
- Open issue (#19792): possible LightningCSS config conflict between Vite 8 and this plugin

---

## @biomejs/biome v2 ("Biotype", 2025-06-17)

**Breaking changes from v1:**
- Suppression comment syntax changed: `lint(<GROUP>/<RULE>)` → `lint/<GROUP>/<RULE>` (no parens)
- `ignore`/`include` config fields → unified `includes` field; glob behavior overhauled (`*` no longer matches path separators, no auto-prepend `**/`)
- `all` linter option removed; use `"recommended": true` instead
- `style` rule group no longer errors by default — must be explicitly configured
- Import organizer moved: `organizeImports` → `assist` actions; sort order changed

**Notable new features:**
- Type-aware linting without TypeScript compiler
- Multi-file/monorepo analysis
- Plugin system (GritQL-based)
- New suppress directives: `biome-ignore-all`, `biome-ignore-start`, `biome-ignore-end`
- Experimental HTML formatter
- New rules: `noReactForwardRef` (React 19 deprecated `forwardRef`), `noNextAsyncClientComponent`

---

## React 19

- 19.0 released 2024-12-05; 19.2 released 2025-10-01

**Breaking changes:**
- `forwardRef` deprecated (still works, will be removed in a future major); refs now passed as plain props
- Ref callback cleanup: returning a non-function value from a ref callback is now an error
- UMD builds removed
- Legacy `ReactDOM.render` / `ReactDOM.hydrate` removed (were deprecated in v18)

**New features:**
- `use` hook — read Promises and Context in render (including inside conditionals)
- Async transitions (`useTransition` accepts async functions)
- `useActionState` — form action state management
- `useOptimistic` — declarative optimistic UI
- Server Components & Server Actions now stable
- Auto-hoisting of `<title>`, `<meta>`, `<link>` to `<head>` from anywhere in the tree
- React 19.2: `<Activity>` component, `useEffectEvent` hook (stable)

---

## @fortawesome v7 + react-fontawesome v3

- `react-fontawesome` v3 requires React 18+, Node 20+
- **Dynamic icon imports dropped** — all imports must be static

**Font Awesome v7 breaking changes:**
- Fixed width is now the default (was `fa-fw`)
- Icons are decorative by default (hidden from screen readers); accessibility must be implemented manually
- Sass: Dart Sass only, `@import` syntax dropped
- Webfonts: `.woff2` only (`.woff`, `.ttf`, `.eot` dropped)
- SVG files no longer include global stylesheets
- Dropped: jQuery, Less CSS, Django, Require.js integrations

---

## html-react-parser v5

**v4 (2023-05-31):** Internal `html-dom-parser` bumped to v4 (parsing behavior changes).

**v5 (2023-10-29):**
- Migrated to TypeScript — module export structure changed
- **CommonJS**: `require('html-react-parser').default` required (previously returned the function directly)
- `normalizeWhitespace` option removed

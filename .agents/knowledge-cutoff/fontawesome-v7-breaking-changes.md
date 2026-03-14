# Font Awesome v7 Breaking Changes (v6 → v7)

> Includes @fortawesome/react-fontawesome v3
> Researched: 2026-03-14

### react-fontawesome v3
- Requires React 18+, Node.js 20+
- **Dynamic icon imports dropped** — all icon imports must be static

### Font Awesome v7 general
- Fixed width is now the default (was `fa-fw` class)
- Icons are decorative by default (hidden from screen readers) — accessibility must be implemented manually (`sr-only` class removed)
- Sass: Dart Sass only, `@import` syntax dropped (use `@use`)
- Webfonts: `.woff2` only (`.woff`, `.ttf`, `.eot` dropped)
- SVG files no longer include global stylesheets; Duotone colors use CSS custom properties
- Dropped integrations: jQuery, Less CSS, Django, Require.js, Ruby on Rails gem
- Vue: Vue 3+ required

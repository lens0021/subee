# React v19 Breaking Changes and New Features

> 19.0 released: 2024-12-05 / 19.2 released: 2025-10-01
> Researched: 2026-03-14

### Breaking changes
- `forwardRef` deprecated — refs now passed as plain props to function components (still works, will be removed in a future major)
- Ref callback cleanup: returning a non-function value from a ref callback is now an error
- UMD builds removed — use ESM CDNs (e.g. `esm.sh`) for script-tag usage
- `ReactDOM.render` / `ReactDOM.hydrate` removed (were deprecated in v18)

### New features
- `use` hook — read Promises and Context in render, including inside conditionals
- Async transitions — `useTransition` now accepts async functions; handles pending/error/optimistic states
- `useActionState` — form action state management (replaces `ReactDOM.useFormState`)
- `useOptimistic` — declarative optimistic UI updates
- Server Components & Server Actions now stable (`"use server"` / `"use client"`)
- Auto-hoisting of `<title>`, `<meta>`, `<link>` to `<head>` from anywhere in the tree
- Resource APIs: `preload`, `preinit`, `prefetchDNS`, `preconnect`
- React 19.2: `<Activity>` component (formerly `<Offscreen>`), `useEffectEvent` hook (stable)

# Biome v2 Breaking Changes (v1 → v2)

> Released: 2025-06-17. Codename: "Biotype."
> Researched: 2026-03-14

### Config changes
- `ignore`/`include` fields → unified `includes` field
- Glob behavior overhauled: `*` no longer matches path separators, no auto-prepend `**/`, paths are relative to config file
- `all` linter option removed — use `"recommended": true` instead
- `style` rule group no longer errors by default — must be explicitly configured
- Import organizer moved: `organizeImports` → `assist` actions; sort order changed

### Suppression comment syntax changed
```
// Before
// biome-ignore lint(group/rule): reason

// After
// biome-ignore lint/group/rule: reason
```

### New suppression directives
- `biome-ignore-all` — suppress in entire file
- `biome-ignore-start` / `biome-ignore-end` — suppress a range

### New notable lint rules
- `noReactForwardRef` — flags deprecated `forwardRef` usage (React 19)
- `noNextAsyncClientComponent` — Next.js specific

### New features
- Type-aware linting without TypeScript compiler
- Multi-file / monorepo analysis (opt-in)
- Plugin system (GritQL-based custom rules)
- Experimental HTML formatter

### Migration
Run `biome migrate --write` to auto-update `biome.json`.

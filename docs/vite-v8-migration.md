# Vite v8 마이그레이션 노트

> 조사일: 2026-03-14
> 현재 버전: vite ^6.0.7, vitest ^3.2.4
> 목표 버전: vite ^8.0.0

---

## 마이그레이션 경로

v6 → v7 → v8 순서로 진행하거나, v8로 한 번에 올리되 두 버전의 breaking changes를 모두 반영해야 함.

---

## Vite 7 Breaking Changes (v6 → v7)

### Node.js 요구사항
- Node.js 18 지원 종료
- **Node.js 20.19+ 또는 22.12+** 필요

### 기본 브라우저 타겟 변경 (`build.target`)
- 이전: `'modules'`
- 이후: `'baseline-widely-available'` (2025년 5월 기준 Baseline)
- Chrome 87→107, Firefox 78→104, Safari 14.0→16.0

### 제거된 API
- `splitVendorChunkPlugin` → `build.rollupOptions.output.manualChunks` 사용
- Sass legacy API (`css.preprocessorOptions.sass.api`) 제거

### Plugin hook 변경
`transformIndexHtml`의 `enforce`/`transform` 프로퍼티 제거:
```ts
// Before
{ enforce: 'pre', transform(html) {} }

// After
{ order: 'pre', handler(html) {} }
```

### CommonJS 빌드 제거
Vite 자체가 ESM-only 배포로 전환됨.

---

## Vite 8 Breaking Changes (v7 → v8)

> 출시일: 2026-03-12. "Vite 2 이후 가장 큰 아키텍처 변경"

### 핵심: Rolldown + Oxc로 교체
- esbuild, Rollup → **Rolldown** (Rust 기반 번들러) + **Oxc**
- 빌드 속도 10~30x 향상 (Linear: 46s→6s)
- 패키지 설치 크기 ~15MB 증가 (lightningcss ~10MB, Rolldown ~5MB)

### 브라우저 타겟 추가 상향
- Chrome 107→111, Firefox 104→114, Safari 16.0→16.4 (2026-01-01 기준 Baseline)

### Config 키 이름 변경 (deprecated warning 표시, 자동 호환 유지)
| 이전 | 이후 |
|------|------|
| `build.rollupOptions` | `build.rolldownOptions` |
| `worker.rollupOptions` | `worker.rolldownOptions` |
| `esbuild` | `oxc` |
| `optimizeDeps.esbuildOptions` | `optimizeDeps.rolldownOptions` |

### JS 변환: esbuild → Oxc
- `transformWithEsbuild` deprecated → `transformWithOxc` 사용
- **데코레이터 제한**: Oxc가 native decorator를 lowering 불가
  - 필요 시 Babel 또는 SWC 플러그인 사용
- `esbuild.supported` 옵션 제거

### 미니파이어 변경
- JS: Oxc Minifier (기존 esbuild)
  - 되돌리려면: `build.minify: 'esbuild'` + esbuild 별도 설치
  - `mangleProps`/`reserveProps` 미지원
- CSS: Lightning CSS (기존 esbuild)
  - 되돌리려면: `build.cssMinify: 'esbuild'`

### Plugin API 변경
- `load`/`transform`에서 non-JS → JS 변환 시 `moduleType` 명시 필요:
  ```ts
  // Before
  return { code }

  // After
  return { code, moduleType: 'js' }
  ```
- 빌드 에러 타입: `BundleError` (`Error & { errors?: RolldownError[] }`)
- 병렬 훅이 Rolldown에서는 순차 실행됨
- 제거된 훅: `shouldTransformCachedModule`, `resolveImportMeta`, `renderDynamicImport`, `resolveFileUrl`

### CJS 상호운용 변경
dev/build 간 default import 동작이 통일됨.
임시 탈출구: `legacy.inconsistentCjsInterop: true`

### 제거된 기능
- `build.rolldownOptions.output.manualChunks`의 object 형태
- System, AMD 출력 포맷
- `import.meta.hot.accept`에서 URL 불가 → 모듈 ID 사용

### v8 신규 기능 (non-breaking)
- `resolve.tsconfigPaths` 옵션 → `vite-tsconfig-paths` 플러그인 대체 가능
- `server.forwardConsole` — 브라우저 console을 터미널로 전달
- Vite DevTools 통합

---

## Vitest v4 Breaking Changes

Vitest는 별도 버전 사이클. Vite 8과 함께 올릴 경우:

- `vite-node` → Vite Module Runner로 교체
- workspace config 이름 변경: `workspace` → `projects`
- Worker pool 옵션 변경:
  - `maxThreads`/`maxForks` → `maxWorkers`
  - `singleThread`/`singleFork` → `maxWorkers: 1, isolate: false`
- `@vitest/browser/context` → `vitest/browser`
- `poolMatchGlobs`, `environmentMatchGlobs`, `deps.external`, `deps.inline` 등 제거

---

## 이 프로젝트 체크리스트

- [ ] Node.js 버전 확인 (20.19+ 또는 22.12+)
- [ ] `build.rollupOptions` → `build.rolldownOptions` 이름 변경
- [ ] `esbuild` config → `oxc` 이름 변경
- [ ] Plugin `transformIndexHtml`에서 `enforce`/`transform` → `order`/`handler`
- [ ] `vitest.config`에서 `workspace` → `projects`
- [ ] `maxThreads`/`maxForks` → `maxWorkers` 변경
- [ ] `resolve.tsconfigPaths` 활용 가능 여부 검토 (현재 path aliases 있음)
- [ ] 빌드 후 출력 정상 확인

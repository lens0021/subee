# Terminology

- **페이지 새로고침** — 브라우저 F5/Cmd+R. 전체 JS 상태 초기화.
- **피드 새로고침** — 앱 내 Refresh 버튼 클릭. 폴링을 시작하는 동작.

## 페이지 새로고침 흐름

1. 커서 캐시(`subee:cursors:{instanceUrl}`, TTL 7일)와 게시물 캐시(`subee:posts:{instanceUrl}`, TTL 7일)를 localStorage에서 복원.
2. 캐시가 유효하고 모든 구독 handle이 커서 캐시에 포함되면 → 즉시 피드 표시 (API 호출 없음).
3. 캐시가 없거나 새 handle이 있으면 → 계정 resolve(`initCursors`) 후 초기 게시물 fetch(`fetchMore`).
4. 캐시에서 복원한 직후, 마지막 폴링이 `AUTO_POLL_STALE_MS`(5분)보다 오래됐으면 자동으로 1회 폴링해 새 글을 버퍼("N new")에 적재. 자고 일어난 뒤처럼 오래 닫아둔 경우 앱을 열면 "N new"가 떠 있음. 빠르게 다시 연 경우(5분 이내)엔 폴링하지 않아 인스턴스 부담을 피함. 이후 지속 폴링은 없음 — 추가 갱신은 사용자가 직접 Refresh.
5. 앱을 백그라운드에서 다시 포그라운드로 가져올 때(`visibilitychange`)도 같은 staleness 조건으로 1회 폴링.

## 피드 새로고침 흐름

1. **폴링 (polling)** — Refresh 클릭(또는 앱 오픈 시 자동 폴링) 후 각 계정의 새 게시물을 API로 가져오는 작업. 진행 중에는 `N/total` pill 표시. 폴링은 조용히 진행됨 — 계정 상태 dot(초기 로딩 표시)을 띄우지 않음. HTTP 429를 받으면 이번 회차를 즉시 중단하고 `Retry-After`(없으면 `X-RateLimit-Reset`, 그래도 없으면 5분, 최대 1시간)만큼 다음 폴링을 건너뜀(웹·포그라운드 폴링도 Android 워커와 동일 정책). 폴링 중 일시적 실패(429·네트워크)는 dot으로 노출하지 않음.
2. **버퍼 (buffer)** — 폴링 완료 후 피드에 아직 반영되지 않은 게시물 임시 보관소. "N new" 버튼으로 표시됨 (대기 중 상태).
3. **피드 반영 (flush)** — "N new" 클릭 시 버퍼를 피드에 표시하는 동작. 구분선과 함께 해당 위치로 스크롤.

## 엔드유저 UI

### 화면 구성

- **헤더** — 화면 상단 고정. 앱 이름(subee), 탭 전환 버튼, 설정 버튼(⚙).
- **탭** — Subscribed(구독 피드)와 Home(인스턴스 홈 타임라인) 두 가지.
- **피드** — 탭 아래 스크롤 영역. 게시물 카드 목록.
- **계정 상태 표시** — 피드 상단에 계정별 컬러 dot. **초기 로딩(initCursors+fetch) 전용** 표시 — 초기 로딩 중 또는 초기 로딩에서 실패한 계정이 있을 때만 표시. 캐시 적중으로 즉시 피드를 보여주는 재오픈이나 백그라운드 폴링에서는 표시되지 않음(성공한 폴링은 기존 실패 dot을 해제만 함). dot을 탭하면 해당 계정 handle과 상태 확인 가능.
- **새로고침 버튼** — 스크롤을 내리면 화면 상단 중앙에 뜨는 플로팅 버튼. 상태에 따라 세 가지 모습으로 변함 (아래 참고).
- **구분선** — 피드 반영 후 새 게시물과 기존 게시물 사이에 "New posts" 텍스트와 함께 표시되는 선.

### 새로고침 버튼 상태

| 모습 | 의미 | 탭 시 동작 |
|------|------|-----------|
| 회색 "Refresh · checked Xm ago" | 폴링 대기 중 | 폴링 시작 |
| `● N/total` (회색 pill) | 폴링 진행 중 | 반응 없음 |
| 파란 "N new" | 버퍼에 N개 대기 중 | 피드 반영 |

### 설정 메뉴 (⚙)

헤더 우측 톱니바퀴 버튼을 탭하면 열리는 드롭다운.

- **인스턴스 hostname** — 현재 로그인된 인스턴스 표시 (비활성).
- **Export subscriptions** — 구독 목록을 텍스트로 클립보드에 복사.
- **Import subscriptions** — 텍스트로 구독 목록을 일괄 교체.
- **Subscribe to account** — 단일 handle을 구독 목록에 추가.
- **Exclude subscribed** — 체크 시 Subscribed 탭의 게시물에서 이미 구독한 계정 게시물을 Home 탭에서 숨김.
- **Background sync** — 체크 시 백그라운드(앱 닫혀 있을 때 포함)에서 주기적으로 새 게시물을 폴링. 브라우저에서는 Periodic Background Sync 사용(minInterval 12시간, 실제 간격은 브라우저가 결정, Firefox/Safari에서는 항목 숨김, 권한 거부 시 자동 off). Android APK에서는 네이티브 WorkManager가 약 4시간 주기(실제 간격은 Doze/배터리 상태에 따라 더 길어질 수 있음)로 계정을 **순차** 폴링(홈 인스턴스 부담·폰 피크 리소스 최소화)하고, 새 글 도착 시 단일 알림을 누적 대기 글 수로 in-place 갱신(IMPORTANCE_LOW·setOnlyAlertOnce로 무음·재알림 없음, 앱을 열면 해제). HTTP 429를 받으면 이번 회차 폴링을 즉시 중단하고 `Retry-After`(없으면 `X-RateLimit-Reset`, 그래도 없으면 5분, 최대 1시간)만큼 다음 회차를 건너뜀.
- **Log out** — 탭 시 "Log out? / Yes / Cancel" 확인 후 로그아웃.

### 게시물 카드

- 계정 이름, 아바타, 게시 시간, 본문, 미디어, boost/favourite 수 표시.
- **+ Subscribe / Subscribed** 버튼으로 해당 계정 구독 토글.
- CW(content warning) 있는 게시물은 접힌 상태로 표시, "Show content"로 펼침.

## Android APK

- `android/` — WebView 래퍼 앱. `npm run build:android`가 웹 빌드를 `android/app/src/main/assets/www`로 출력하고, `WebViewAssetLoader`가 `https://appassets.androidplatform.net/`으로 서빙.
- 브리지: 웹 `src/native/android.ts` ↔ 네이티브 `SubeeBridge.kt` (`window.SubeeAndroid`). 웹이 auth와 계정별 커서를 push(`updateSyncState`)하면 네이티브 `FeedSyncWorker`(WorkManager, 1시간 주기)가 폴링해 알림을 띄우고, 앱 시작 시 웹이 `consumeSyncResults`로 새 글과 커서 갱신을 가져와 캐시에 병합.
- OAuth는 WebView 안에서 진행됨. redirect_uri가 appassets origin이라 외부 브라우저로 빼면 돌아올 수 없음.
- 빌드 순서: `npm run build:android` → `cd android && ./gradlew assembleDebug`. CI는 `.github/workflows/android.yaml`이 `subee-debug` artifact 업로드.

# Terminology

- **페이지 새로고침** — 브라우저 F5/Cmd+R. 전체 JS 상태 초기화.
- **피드 새로고침** — 앱 내 Refresh 버튼 클릭. 폴링을 시작하는 동작.

## 피드 새로고침 흐름

1. **폴링 (polling)** — Refresh 클릭 후 각 계정의 새 게시물을 API로 가져오는 작업. 진행 중에는 `N/total` pill 표시.
2. **버퍼 (buffer)** — 폴링 완료 후 피드에 아직 반영되지 않은 게시물 임시 보관소. "N new" 버튼으로 표시됨 (대기 중 상태).
3. **피드 반영 (flush)** — "N new" 클릭 시 버퍼를 피드에 표시하는 동작. 구분선과 함께 해당 위치로 스크롤.

## UI 컴포넌트

- **AppHeader** — 상단 헤더. 탭 전환(Subscribed / Home), 인스턴스 hostname, 설정 메뉴(cog), 로그아웃 버튼.
- **FloatingRefreshButton** — 스크롤 내려갔을 때 상단 중앙에 뜨는 버튼. 세 가지 상태:
  - 회색 "Refresh" — 폴링 시작
  - `● N/total` pill — 폴링 진행 중 (클릭 불가)
  - 파란 "N new" — 피드 반영 대기 중
- **AccountStatusGrid** — 각 계정의 로딩 상태를 컬러 dot으로 표시. 로딩 중이거나 실패 계정이 있거나 pinStatusGrid 설정 시 표시. dot 클릭 시 handle과 상태 표시.
- **PostList** — 게시물 목록. 무한 스크롤(load more), 에러 시 Retry 버튼, 구분선(New posts divider) 포함.
- **PostCard** — 개별 게시물 카드. Subscribe/Subscribed 버튼, boost/favourite 수, CW(content warning) 토글 포함.
- **FloatingRefreshButton (PublicPage)** — Home 탭에서도 동일 컴포넌트 사용. onPoll 없이 onRefresh만 연결되어 있어 클릭 시 타임라인 재fetch.
- **ImportOverlay** — 구독 목록 텍스트 일괄 import 모달.
- **AddAccountOverlay** — 단일 handle 구독 추가 모달.
- **LoginPage** — 미인증 시 표시. Mastodon 인스턴스 URL 입력 후 OAuth 로그인.

# CONVERSATION_LOG.md

## 2026-11-17 — 프로젝트 복제 및 문서화

### 한 일
1. `helpy2.1/OpenNadeuli` 전체 코드 분석 (README, serve.mjs, index.template.html, build-standalone.mjs, capture-snapshot.mjs, js/data.js, js/nlu.js, js/tools.js, js/agent.js, js/ui.js, js/main.js)
2. 카카오 지도 SDK 진단:
   - 최초 키(`5197c2...`)로 curl 테스트 → HTTP 403 `NotAuthorizedError: App disabled OPEN_MAP_AND_LOCAL service`
   - 키 수정(`5fef331...`) 후 재테스트 → HTTP 200 정상 응답 확인
3. `js/ui.js` 버그 수정:
   - `bounds.clear is not a function` — Kakao Maps SDK v2의 `LatLngBounds`에 `.clear()` 메서드 없음
   - 수정: `const bounds = new kakao.maps.LatLngBounds()` 제거, `redraw()` 내부에서 매번 `new kakao.maps.LatLngBounds()` 생성
   - `node build-standalone.mjs` 실행 → `index.html` + `standalone.html` 161.7 KB 생성 완료
4. 프로젝트 폴더 복제: `helpy2.1/OpenNadeuli` → `OpenNadeuli` (동일 경로 상위)
5. `AGENTS.md` 작성 (이 파일) — 워크스페이스 규칙에 따라 Vanilla JS 정적 웹앱 기준 재구성

### 실측 결과
| 항목 | 결과 |
|------|------|
| 카카오 SDK 앱 키 | `.env` 24줄 `KaKo_Key_OpenNadeuli=(값 비공개)` (2026-11-17 수정됨) |
| SDK 로드 | HTTP 200 정상 (브라우저에서 지도 표시 확인됨) |
| 지도 핀 버그 | `ui.js` 수정 후 빌드 완료. 브라우저 재테스트 미실시 |
| 빌드 산출물 | `index.html`, `standalone.html` 각 161.7 KB |

### 미검증
- 3번 이후 지도 핀이 모두 정상 배치되는지 브라우저 실 테스트 미실시
- 앱 설정(⚙️)에서 공공 데이터 API 키 입력 후 실시간 조회 연동 테스트 미실시
- `serve.mjs`에 `/proxy/kakaomaps` 프록시 미확인 (구버전, 인수인계 §5 미적용)

### 다음 할 일
1. Vercel에 GitHub 레포 연결하여 배포 (이미 배포 중인 서비스라면 프로젝트 연동)
2. 인수인계 §5 미적용 항목 검토:
   - `serve.mjs`에 `/proxy/kakaomaps` 프록시 추가
   - 카카오 링크 좌표 순서 버그 수정 (`lng,lat` → `lat,lng`)
   - 개별 카드 지도 링크를 네이버 지도에서 카카오맵으로 변경 여부 결정
   - 00~24 타임라인 전체 채움 스케줄러 + 슬라이더 절대 존중 (이미 코드에 반영된 듯 보임, 재확인 필요)
3. 루트 `CONVERSATION_LOG.md`에 오늘 날짜 요약 남기기

### 결정 근거
- 카카오 SDK `bounds.clear` 제거: Kakao Maps SDK v2 문서상 `LatLngBounds`에 `.clear()` 메서드 없음. 콘솔 에러 `TypeError: bounds.clear is not a function` 실측 확인.
- 프로젝트 복제: 기존 `helpy2.1/OpenNadeuli`와 동일한 상태로 GitHub 이관을 위한 독립 폴더 생성.
- GitHub 레포: `https://github.com/cosohotmas/OpenNadeuli.git`에 main 브랜치로 푸시 완료 (2026-11-17)
- `.env`는 `.gitignore`로 제외, `.env.example`만 관리. Vercel 배포 시 Environment Variables에 실제 API 키 등록 필요.
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


### 2026-11-18 — 백엔드( FastAPI )+프론트엔드( React+TS ) 재구성 및 로컬 연동 테스트

### 한 일
1. 백엔드 FastAPI( uvicorn app:app )와 프론트엔드 React+TS+Vite 연동 구조 확인
2. `backend/src/services/agent.py`의 임포트 경로 버그 수정
   - `from .data.sample_data import REGIONS` → `from ..data.sample_data import REGIONS`
   - `from .data.sample_data import filter_spots` → `from ..data.sample_data import filter_spots`
   - 원인: `agent.py`( services/ ) 기준 `data/` 패키지는 한 단계 상위(`..`)에 위치
3. 백엔드 라우트 등록 확인: `/api/health`, `/api/course`, `/api/settings` 모두 정상
4. `/api/health` → `{"status":"ok","service":"opennadeuli"}` (HTTP 200)
5. `/api/course` → 부산 무장애 관광지 1곳(해운대해수욕장 무장애구역) 추천, HTTP 200 정상
6. 프론트엔드 빌드: `npm run build` 성공 (31 modules, dist/ 생성)
7. 백엔드 `python -m uvicorn app:app --port 8899` 실행 완료
8. 프론트엔드 `npm run dev -- --port 5174` 실행 완료

### 실측 결과
| 항목 | 결과 |
|------|------|
| 백엔드 `/api/health` | HTTP 200, `{"status":"ok","service":"opennadeuli"}` |
| 백엔드 `/api/course` | HTTP 200, 부산 무장애 관광지 1곳 추천 |
| 백엔드 `/api/settings` | HTTP 405 (GET/POST 테스트 미실시) |
| 프론트엔드 빌드 | `npm run build` 성공 (31 modules transformed) |
| 백엔드 서버 | `uvicorn app:app --port 8899` 기동 |
| 프론트엔드 서버 | `vite --port 5174` 기동 |

### 미검증
- 프론트엔드 → 백엔드 API 연동 (브라우저 E2E) — 백엔드 200 확인 완료, 프론트엔드 UI 연동은 미검증
- `app.py`의 `api_router` 등록이 `_IncludedRouter`로 래핑되어 `app.routes`에 직접 노출되지 않음 — `url_path_for()`는 정상 반환 확인

### 다음 할 일
1. 프론트엔드 `/api/course` API 연동 테스트 (브라우저에서 백엔드 API 호출 확인)
2. Vercel 배포 준비 (백엔드 `@vercel/python` + 프론트엔드 `vite`)
3. 루트 `CONVERSATION_LOG.md`에 오늘 날짜 요약 남기기
- `.env`는 `.gitignore`로 제외, `.env.example`만 관리. Vercel 배포 시 Environment Variables에 실제 API 키 등록 필요.

### 2026-11-18 — 문서 보정 및 PR #2 머지 완료

### 한 일
1. Git 히스토리 정리 (보안 및 품질):
   - 카카오 지도 JavaScript 키 값이 포함된 `CONVERSATION_LOG.md` 내용을 비공개 처리 (`KaKo_Key_OpenNadeuli=...` → `(값 비공개)`)
   - `frontend/node_modules` 2333개 파일 추적 해제 (`git rm -r --cached`) 및 `.gitignore`에 `node_modules/` 추가
   - 커밋 메시지의 `Co-authored-by` 제거 (AI 흔적 금지 규칙 준수)
   - `git filter-branch`로 전체 커밋 히스토리 재작성 후 `--force-with-lease`로 원격 푸시 (원격 히스토리 포함)
   - 백업 브랜치 `backup/before-rewrite` 생성 (로컬만)
2. `fix/cleanup-and-deploy-prep` 브랜치에서 백엔드 보안 강화 커밋 후 PR #1 생성 및 머지 완료:
   - `app.py`: 포트 8899 통일, CORS 오리진 제한(`CORS_ORIGINS` 환경변수), 중복 `/api/health` 제거, 정적 파일 마운트 순서 조정, 없는 `/api/*` 경로 JSON 404 처리
   - `.env.example`: `PORT`, `CORS_ORIGINS` 추가
   - `backend/src/api/routes.py`: `import os` 추가, `POST /api/settings`에 `ENABLE_SETTINGS` 환경변수로 403 제어
3. 프론트엔드 연동 검증:
   - `npm run build` 성공 (31 modules transformed, `dist/` 생성)
   - `vite preview`로 `dist/` 정적 파일 서빙 확인 (`index.html` 200, JS 애셋 200)
   - Playwright 헤드리스 브라우저로 `http://127.0.0.1:5188/` 접속 시도 → `vite preview` 서버가 응답하지 않아 timeout (curl로도 재현, 원인 미상)
   - 브라우저 렌더링 연동 테스트는 미검증으로 처리
4. CORS 검증:
   - `http://127.0.0.1:5188` 허용 오리진에 대해 preflight 응답 확인 (`access-control-allow-origin` 반환)
   - 허용 목록 외 origin(`http://evil.example`)에도 헤더가 반환되는 보안 문제 확인 (보완 필요)
5. 문서 재구성 (AGENTS.md, README.md, 기획서.md):
   - 루트 앱 지위: 병행 운영 중인 레거시에서 지위 미정 TODO(확인 필요)로 변경
   - 기술 스택·파일 구조·실행 방법·보안 원칙·배포·완료 기준·기본 스킬 구성을 실제 코드 기준으로 교체
   - CORS_ORIGINS, ENABLE_SETTINGS, PORT 환경변수 추가(코드에 추가, .env.example 미등재)
   - README 1절: 과장 표현 완화(완벽한 시연 제거), 서비스명 코드 기준(KorWithService2) 통일
   - README 2절: 빌드 명령·출력 디렉터리 명시, CORS 설정 경고 추가
   - README 4절: 스냅샷 워크플로 삭제(파일 부재), 우선순위 문구 삭제
   - README 7절: localStorage 문장을 React/백엔드 경로 기준으로 한정
   - README 8절: 검증 상태 표 정리(403 검증됨, CORS 부분 검증, 브라우저 렌더링 미실행)
   - README 배포 절: Vercel 환경변수는 백엔드용(OPENNADEULI_*) 명시, VITE_* 아님
   - 기획서 2절: 툴 체이닝 계약 코드 기준 경로 교체
   - 기획서 3절: 범위(백엔드/프런트 분리)
   - 기획서 4-1: 시간대 규칙(06:00~08:00 공백 코드 확인 불가)
   - 기획서 4-2: 데이터셋 표(장애인편의시설 API 미구현→로드맵, 내장 탐방로는 내장 샘플)
   - 기획서 5-3: 무의존성 정적 번들링 플랜 변경 기록
   - 기획서 6절: 위험 표(프런트→백엔드 CORS 미검증, 루트 앱 병행 운영 미검증)
   - 기획서 7절: 새벽·야간 안전 안내, 성공 지표(코드·테스트 기준만), 경사도 8% TODO(출처 확인 필요), 인용문 예시 표시, 0% 표현 완화
   - 기획서 정보 출처와 라이선스 표: 확인 시각 칸 추가, 라이선스 칸은 TODO(확인 필요)
6. PR #2 생성 및 머지 완료:
   - 브랜치: `docs/documentation-sync` (origin/main에서 분기)
   - 커밋: `97b5886` (49 insertions, 15 deletions)
   - PR URL: https://github.com/cosohotmas/OpenNadeuli/pull/2

### 실측 결과
| 항목 | 결과 |
|------|------|
| 백엔드 `/api/health` | HTTP 200, `{"status":"ok","service":"opennadeuli"}` |
| 백엔드 `/api/course` | HTTP 200, 부산 무장애 관광지 1곳 추천 |
| 백엔드 `/api/settings` | HTTP 403 (ENABLE_SETTINGS 미설정 시) |
| 프론트엔드 빌드 | `npm run build` 성공 (31 modules transformed) |
| 프론트 정적 서빙 (`vite preview`) | 서버 hang으로 무응답 (curl로도 재현, 원인 미상) |
| CORS preflight (`http://127.0.0.1:5188`) | 허용 헤더 반환 확인 |
| 브라우저 렌더링 (Playwright) | timeout으로 미검증 (원인: vite preview 무응답) |
| Git 히스토리 정리 | 키 제거 완료, node_modules 추적 해제 완료, Co-authored-by 제거 완료 |

### 미검증
- 프론트엔드 → 백엔드 API 연동 (브라우저 E2E) — vite preview 서버 hang으로 테스트 불가
- Vercel 실제 배포 — 승인 대기
- CORS 허용 목록 외 origin 헤더 반환 원인 (보안 문제)

### 다음 할 일
1. B-1 프런트 API base URL 하드코딩 문제 해결 (상대경로 `/api` 또는 `VITE_API_BASE` 환경변수)
2. 루트 `CONVERSATION_LOG.md`에 오늘 날짜 요약 남기기
3. Vercel 배포 (사용자 승인 후)

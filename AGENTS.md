# AGENTS.md

루트(프로젝트 루트):
app.py                  FastAPI 진입점 (포트 8899, CORS_ORIGINS, 정적 파일 서빙)
requirements.txt        fastapi, uvicorn, python-dotenv, httpx, pydantic
test_backend.py         백엔드 로직 테스트 스크립트
.env.example            API 키 템플릿 (키 이름만, 값 없음)
vercel.json             Vercel 배포 설정
.gitignore              제외 파일 설정

backend/(Python·FastAPI):
src/
  api/
    routes.py           /api/health, /api/course, /api/settings 라우트
  data/
    sample_data.py      내장 샘플 데이터 (filter_spots/trails/restaurants/hotels)
  services/
    agent.py            AI 에이전트 파이프라인 (OutingAgent)
    nlu.py              의도 분석기
    tools.py            공공 API 도구 스펙, 라이브/내장 폴백, 설정 저장(os.environ)

`frontend/`(Vite+React+TypeScript):
AI 코딩 에이전트(Claude Code, Codex, Cursor 등)가 이 저장소에서 작업할 때 따르는 공통 지침입니다. 어떤 도구를 쓰든 이 문서를 기준으로 합니다.

## 프로젝트 개요

오픈나들이(OpenNadeuli)는 휠체어·보행 약자를 위한 무장애 관광 AI 에이전트 웹앱입니다.
일상 대화 한마디로 공공 무장애 데이터(한국관광공사 열린관광지, 국립공원공단·지자체 무장애 탐방로, 소상공인 상권정보)를 조합해 헛걸음 없는 나들이 코스를 제안합니다.

- 구조: 루트(Vanilla JS 정적 앱, 지위 미정 TODO(확인 필요)) + `frontend/`(Vite+React+TypeScript) + `backend/`(Python·FastAPI)
| 공공 데이터 | 한국관광공사 열린관광지(KorWithService2), 소상공인 상권정보(sdsc2) | `backend/src/services/tools.py` |
| 공공 데이터 | 한국관광공사 열린관광지(KorWithService2), 소상공인 상권정보(sdsc2) | `backend/src/services/tools.py` |
| 환경변수 | `PORT`, `CORS_ORIGINS`, `KorWithS_End_Point`, `KorWithS_Key`, `SdsC_End_Point`, `SdsC_Key` (.env.example 5줄 추가됨) | `app.py`, `backend/src/api/routes.py` |
- 프런트: React 18 + TypeScript + Vite, `http://127.0.0.1:8899` 백엔드 직접 호출 (Vite 프록시 미사용, `VITE_*` 환경변수 미사용)
- 백엔드: FastAPI + uvicorn, 포트 8899, `/api/health`, `/api/course`, `/api/settings` 엔드포인트
- 실행: 백엔드 `python3 -m uvicorn app:app --host 127.0.0.1 --port 8899`, 프런트 `cd frontend && npm run dev` (포트 5176)
- 배포: `vercel.json` (FastAPI 함수 `/api/(.*)` → `/app.py`, 정적 파일 `/frontend/dist/index.html`)

## 기술 스택

| 영역 | 기술 | 확인 근거 |
|------|------|-----------|
| 프런트엔드 | React 18 + TypeScript + Vite | `frontend/package.json`, `frontend/vite.config.ts` |
| 빌드 도구 | Vite (`npm run build`) | `frontend/package.json` |
| 백엔드 | Python + FastAPI + uvicorn | `requirements.txt`, `app.py`, `backend/src/api/routes.py` |
| 공공 데이터 | 한국관광공사 열린관광지(KorWithService2), 소상공인 상권정보(sdsc2) | `backend/src/services/tools.py` |
| 환경변수 | `PORT`, `CORS_ORIGINS`, `KorWithS_End_Point`, `KorWithS_Key`, `SdsC_End_Point`, `SdsC_Key` (`.env.example` 5줄 추가됨) | `app.py`, `backend/src/api/routes.py` |
| 설정 저장 | 서버 메모리(`os.environ`)만, 파일 미저장, 재시작 시 소멸 | `backend/src/services/tools.py` (`save_settings`) |
| 도구 목록 | `searchOpenTouristSpots`, `searchAccessibleTrails`, `searchStayHotels`, `searchStepFreeRestaurants` | `backend/src/services/tools.py` (`TOOL_SPECS`) |
| 지도 | 루트 HTML: 네이버 지도 검색(mapUrl) + 카카오 동선 요약, React 프런트 미도입 | 루트 `index.html`, `frontend/src/App.tsx` |
| API 키 (프런트) | `VITE_*` 미사용, `http://127.0.0.1:8899` 하드코딩 | `frontend/src/lib/api.ts` (알려진 문제: 배포 시 실패) |

## 주요 파일 구조

루트(Vanilla JS 정적 앱, 지위 미정 TODO(확인 필요)):

```
index.html              단일 실행 파일 (CSS·JS 인라인) — vercel.json 배포 대상 아님
index.template.html     개발용 템플릿 (js/ 모듈 참조)
standalone.html         index.html과 동일한 사본 (file:// 직접 열기용)
styles.css              가독성 중심 UI
serve.mjs               정적 서버 + /proxy/openapi·/proxy/kakaomaps 프록시 (포트 8899)
js/
  data.js     내장 샘플 데이터 (관광지/탐방로/식당/호텔)
  nlu.js      규칙 기반 의도 분석기
  tools.js    도구 정의·라이브 API 커넥터·필터링·설정 저장소
  agent.js    파이프라인 오케스트레이터
```

지원 파일:
```
.env.example            API 키 템플릿 (키 이름만, 값 없음)
.gitignore              .env, node_modules, dist 등 제외
vercel.json             Vercel 배포 설정 (FastAPI 함수 + 정적 파일)
AGENTS.md               이 파일 (에이전트 지침)
README.md               개요·실행법 (사람 독자)
CONVERSATION_LOG.md     작업 기록
```

## Spec 먼저, 구현은 그다음

기능을 추가하거나 변경하기 전에 `docs/specs/{기능명}.md`에 Spec을 먼저 작성하세요. 형식은 다음 다섯 섹션을 모두 포함해야 합니다:

- **Why**: 페르소나·상황·문제·측정 지표
- **Goal**: 숫자로 된 성공 기준 + Out of Scope
- **What**: Happy Path + Edge Case
- **How**: API·데이터·제약 (에이전트가 임의 결정할 여지를 없앤다)
- **AC**: Given-When-Then 형식, 테스트 코드로 바로 옮길 수 있어야 함

## Out of Scope 원칙

에이전트는 Spec에 없는 기능을 임의로 추가하지 않습니다. "이왕이면"으로 범위를 넓히지 않습니다.

## 구현 원칙

- 이미 있는 코드·패턴을 우선 재사용합니다. 새로운 로직·알고리즘·추상화는 Spec에 명시되지 않았다면 임의로 만들지 않습니다.
- 구현 방식이 여러 개일 때는 가장 단순하고 기존 코드와 일관된 방법을 택합니다. "이게 더 나은 방식 같다"는 판단이 들어도 스스로 바꾸지 않고, 먼저 팀에 확인받습니다.
- Spec에 없는 결정(라이브러리 교체, 구조 변경 등)은 임의로 내리지 않습니다. 확신이 없으면 추측해서 구현하지 말고 질문합니다.

## Git 규칙

- `main` 브랜치에 직접 커밋·push하지 않습니다. 항상 새 브랜치(`feat/{작업내용}`, `fix/{내용}`, `docs/{내용}`)를 만들어 작업하고, PR로만 main에 합칩니다.
- 스택 PR을 만들지 않습니다 — 각 브랜치는 `origin/main`에서 새로 분기합니다. 이전 PR이 아직 merge되지 않았어도, 다음 작업은 옛 브랜치 위가 아니라 최신 `origin/main`에서 다시 딴다.
- `main` 브랜치에 force push(`--force`, `-f`)를 하지 않습니다.
- `git reset --hard`, `git clean -f` 등 되돌리기 힘든 명령은 임의로 실행하지 않고, 실행 전에 먼저 사용자에게 확인받습니다.
- 커밋 메시지에 AI 생성 흔적(`Co-Authored-By: Claude` 등)을 넣지 않습니다.
- PR 머지는 사용자가 직접 합니다. 에이전트는 PR 생성·보고까지만 수행합니다.
- 머지된 브랜치는 자동 폐기합니다(원격 `git push origin --delete`, 로컬 `git branch -d`). 남는 브랜치는 `main` 하나.

## 보안 원칙 (예외 없음)

- API 키·토큰·비밀번호·개인 실경로를 코드나 문서에 직접 작성(하드코딩 포함)하지 않습니다. 항상 `.env`를 통해 불러옵니다.
- 새로 필요한 키가 생기면 `.env.example`에 값 없이 키 이름만 추가합니다.
- `.env`·`*.orig`·`node_modules`·`dist`는 `.gitignore`에 둡니다.
- 비밀값을 문서·로그에 적지 않습니다(값 자체를 옮기지 않습니다).
- 이 저장소를 GitHub에 올릴 때는 `.env`를 반드시 제외하고, `.env.example`만 포함합니다.
- API 키는 **서버 메모리(`os.environ`)에만 저장**되며, 파일에는 저장되지 않습니다. 서버 재시작 시 소멸합니다(Vercel 서버리스 환경에서 유지 여부는 확인 불가).
- 프런트(`frontend/src/lib/api.ts`)는 `VITE_*` 환경변수를 사용하지 않고 `http://127.0.0.1:8899`를 하드코딩하고 있습니다. 이는 **배포 시 API 호출 실패 결함**이며, 문서 수정 PR에서는 코드를 수정하지 않고 PR 설명에 별도 제안으로 기록합니다(상대경로 `/api` 안 vs `VITE_API_BASE` 환경변수안 비교).

## 로깅 원칙

- 예외를 잡을 때 그냥 버리지 않습니다(`except Exception: pass`는 Python 표현). 무슨 예외였는지 콘솔/로그로 남깁니다. 프런트(JS)와 백엔드(Python) 각각에 맞게 로그를 남깁니다.
- URL·토큰·키 등 자격증명을 로그에 평문으로 남기지 않습니다.

## 배포

- **Vercel 배포**: `vercel.json` 설정 포함. GitHub 저장소 연결 후 Vercel에서 자동 배포.
- 배포 구조: FastAPI 함수(`/api/(.*)` → `/app.py`) + 정적 파일(`/frontend/dist/index.html` SPA 폴백)
- `.env`는 `.gitignore`로 제외. 실제 API 키는 Vercel 프로젝트 설정의 Environment Variables에 등록.
- 프런트(`frontend/src/lib/api.ts`)는 `http://127.0.0.1:8899`를 하드코딩하고 있어, Vercel 배포 시 모든 API 호출이 실패합니다. 배포 전 `VITE_API_BASE` 환경변수 도입 또는 상대경로 `/api` 사용으로 수정 필요(문서 수정 PR에서는 코드 미수정, PR 설명에 제안만 기록).
- 배포 도메인을 `CORS_ORIGINS` 환경변수에 추가해야 프런트·백엔드 간 CORS가 정상 동작합니다.
- Kakao JS SDK 도메인에 개발 포트와 Vercel 도메인을 등록해야 지도 기능이 정상 동작합니다(지도는 현재 React 프런트 미구현, 루트 HTML에만 참조됨).

## 완료 기준

- 백엔드 API: `GET /api/health` 200, `POST /api/course` 200 + `answer` 구조 반환 (curl/TestClient로 검증됨)
- 프런트 빌드: `cd frontend && npm run build` (`tsc && vite build`) 성공 (검증됨)
- 프런트 정적 서빙: 부분 검증 (python `http.server`는 정상, `vite preview`는 이 환경에서 무응답, 원인 미상)
- 브라우저 렌더링 연동: 미실행(원인: vite preview 무응답)
- 프런트→백엔드 실제 호출: 미실행(원인: vite preview 무응답)
- CORS preflight: 부분 검증(검증 origin `http://127.0.0.1:5188`에서는 `access-control-allow-origin` 반환 확인. 허용 목록 외 origin에도 헤더가 반환되는 현상 확인, 원인 미확인(보안 문제))
- 검증하지 않은 항목을 "완료"라고 말하지 않습니다.
- 브라우저 검증이 막히면 원인과 함께 "미검증"으로 표기하고, 우회 검증(대체 서버 등)을 썼다면 우회 사실을 기록합니다.

## 정보 출처와 라이선스

외부 정보는 공식 원문을 우선 사용하고, 기관명·데이터명·원문 URL·발표 또는 조회 시각을 표시한다.

| 데이터셋 | 기관 | 원문 URL | 라이선스·이용 조건 | 확인 시각 |
|----------|------|----------|-------------------|-----------|
| 한국관광공사 열린관광지 (KorWithService2) | 한국관광공사 | https://www.data.go.kr | TODO(확인 필요) | TODO(확인 필요) |
| 소상공인 상권정보 (sdsc2) | 소상공인시장진흥공단 | https://www.data.go.kr | TODO(확인 필요) | TODO(확인 필요) |
| 국립공원·지자체 무장애 탐방로 | 내장 샘플 | — | 데이터셋별 이용약관 확인 필요 | TODO(확인 필요) |
| Kakao Maps JavaScript SDK | (주)카카오 | https://apis.map.kakao.com | 카카오 개발자 약관 적용 | TODO(확인 필요) |

기상청 자료는 공공누리 표시 유형과 개별 이용 조건을 확인한 뒤 사용한다.
지도·접근성 데이터는 데이터셋별 이용약관과 라이선스를 확인한다.

## 기본 스킬 구성 (2026-11-05 추가)

이 프로젝트는 `.agents/skills/` 레지스트리와 프로젝트 루트의 `skills.config.json`을 기본 스킬 구성으로 사용합니다.

### 설치 방법

- 설치 전 **사용자 승인** 필요 (제3자 스킬 전역 설치 금지)
- 프로젝트 **로컬 설치**만 허용 (`-g` 전역 설치 금지)
- 버전 고정하여 설치
- 135개 전체 목록(k-skill)은 컨텍스트 낭비이므로 목록 파일 경로만 안내:
  - `.agents/skills/k-skill/k-skill-list.md` (존재 여부 확인 필요)
  - `.agents/skills/skills-sh/skills-rank-all-time-1a.md` ~ `1b-2.md` (존재 여부 확인 필요)
  - `.agents/skills/skills-sh/skills-rank-all-time-2a-1.md` ~ `2a-3.md` (존재 여부 확인 필요)

## 환경변수 비교 (코드 읽는 이름 vs .env.example 이름)

코드가 실제로 읽는 환경변수 이름과 `.env.example`에 적힌 이름을 나란히 비교한다. 불일치는 TODO로 둔다.

| 코드에서 읽는 이름 | 읽는 위치(파일) | `.env.example` 이름 | 일치 여부 | 비고 |
|-------------------|-----------------|---------------------|-----------|------|
| `PORT` | `app.py` | `PORT` | 일치 | |
| `CORS_ORIGINS` | `app.py` | `CORS_ORIGINS` | 일치 | |
| `ENABLE_SETTINGS` | `backend/src/api/routes.py` | 없음 | TODO(확인 필요) | `.env.example`에 미등재 |
| `OPENNADEULI_SEARCHOPENTOURISTSPOTS` | `backend/src/services/tools.py` | 없음 | TODO(확인 필요) | `.env.example`에 `KorS_Key`로 존재 (이름 불일치) |
| `OPENNADEULI_SEARCHACCESSIBLETRAILS` | `backend/src/services/tools.py` | 없음 | TODO(확인 필요) | `.env.example`에 해당 키 없음 |
| `OPENNADEULI_SEARCHSTEPFREERESTAURANTS` | `backend/src/services/tools.py` | 없음 | TODO(확인 필요) | `.env.example`에 해당 키 없음 |
| `OPENNADEULI_MAPKAKAO` | `backend/src/services/tools.py` | 없음 | TODO(확인 필요) | `.env.example`에 `# KaKo_Key_OpenNadeuli` 주석으로 존재 (표기 의심) |
| `OPENNADEULI_USE_LIVE` | `backend/src/services/tools.py` | 없음 | TODO(확인 필요) | `.env.example`에 미등재 |

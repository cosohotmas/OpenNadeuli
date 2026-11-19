# 오픈나들이 🦽🌿

**휠체어·보행 약자를 위한 무장애 관광 AI 에이전트** — 일상 대화 한마디로 공공 무장애 데이터(관광지·완만한 산책로·턱 없는 식당)를 자율 연동해, 헛걸음 걱정 없는 배리어프리 나들이 코스를 제안하는 원스톱 AI 큐레이션 웹앱.

---

## 1. 핵심 기능

| 요구사항 | 구현 |
| --- | --- |
| 자연어 → 공공데이터 코스 | FastAPI에서 지역과 일정 조건을 분석하고 선택한 공식 데이터 도구를 호출 |
| 한국관광공사 관광·숙박 | 무장애 여행 정보 목록과 상세 조회. 숙박은 `contentTypeId=32` |
| 인근 식당·카페 | 소상공인시장진흥공단 상권정보 반경 조회. 출입구·편의시설은 현장·유선 확인 권장 |
| 무장애 탐방로 | 부산 최대 경사도 공식 원본이 확정되기 전까지 운영 추천에서 제외 |
| 출처 표시 | 카드와 도구별 제공기관·조회 시각·원본 기준일, 원본에 기재된 속성과 확인 권장 항목을 분리 |
| 시연용 백업 | 정적 앱은 서버 접속 실패 시 내장 샘플로 전환하고 시연용임을 명시 |
| 일정·시간대 설정 아코디언 (모바일 터치) | 평소 입력창 위 **"⚙️ 일정 및 시간대 상세 설정" 한 줄 필**만 표시, 클릭 시 듀얼 썸 타임라인 슬라이더가 아래로 펼쳐짐. **[당일 코스]/[1박 2일 코스] 탭** — 1박 2일 선택 시 **[1일차]/[2일차]별 슬라이더** + **🏨 휠체어 숙소 추천 체크박스**. 활동은 시간대 칸에 고정하지 않고 **[식사 포함]/[카페 휴식 포함] 옵션**만 선택 — 에이전트가 발화(테마·동행)와 시간 창(끼니·카페)에 맞춰 관광지/산책로/식당/카페/호텔을 유연하게 배치하고 카드에 시간(예: "1일차 09:00 오전")을 표시 |
| 나들이 초대장 | 카카오톡에 붙여넣기 좋은 초대장 텍스트 생성·편집·원클릭 복사 |
| 여행지 목록 모드 | "여행지 3개 추천"처럼 **숫자+장소 명사**로 물으면 코스 조립 대신 관광지 N곳(2~6곳) 목록 카드로 응답 — 시간대 슬라이더 영향 없음, 마음에 드는 곳을 말하면 코스로 전환 |
| 조건 변경 재질문 | 답변 하단 후속 칩("다른 코스", "다른 지역", "비 오는 날 실내", "식당만") + 대화 맥락 유지 |

## 2. 기술 스택 & 실행

| 영역 | 기술 | 확인 근거 |
|------|------|-----------|
| 프런트엔드 | React 18 + TypeScript + Vite | `frontend/package.json`, `frontend/vite.config.ts` |
| 백엔드 | Python + FastAPI + uvicorn | `requirements.txt`, `app.py`, `backend/src/api/routes.py` |
| 빌드 도구 | Vite (`npm run build`) | `frontend/package.json` |
| 환경변수 | `CORS_ORIGINS`, `ENABLE_SETTINGS`, `PORT` (코드에 추가, `.env.example` 미등재) | `app.py`, `backend/src/api/routes.py` |
| 공공 데이터 | 한국관광공사 열린관광지(KorWithService2), 소상공인 상권정보(sdsc2) | `backend/src/services/tools.py` |
| 설정 저장 | 서버 메모리(`os.environ`)만, 파일 미저장, 재시작 시 소멸 | `backend/src/services/tools.py` (`save_settings`) |

### 실행 방법

백엔드 기동:
```bash
cd "OpenNadeuli"
python3 -m uvicorn app:app --host 127.0.0.1 --port 8899
```

프런트 개발 서버:
```bash
cd frontend
npm run dev   # vite, 포트 5176
```

프런트 빌드:
```bash
cd frontend
npm run build   # tsc && vite build → frontend/dist
```

프런트 미리보기:
```bash
cd frontend
npm run preview   # vite preview, 포트 5190
```

루트 Vanilla JS 정적 서버 (지위 미정 TODO(확인 필요)):
```bash
node serve.mjs 8899   # 포트 8899 (백엔드와 포트 충돌 가능)
```

### 브라우저 접속

- 백엔드 API: `http://127.0.0.1:8899/api/health`, `/api/course`, `/api/settings`
- 프런트 개발: `http://localhost:5176` (vite dev)
- 프런트 미리보기: `http://localhost:5190` (vite preview)
- 루트 Vanilla JS: `http://localhost:8899` (serve.mjs)

> ⚠️ **포트 충돌 주의**: 루트 `serve.mjs`와 백엔드 `app.py` 모두 포트 8899를 기본으로 사용하므로, 동시 기동 시 포트 충돌이 발생할 수 있습니다.

> 기본 화면은 React·TypeScript·CSS입니다. 같은 서버에서 `/elice-final.html`을 열면 엘리스 HTML·CSS·Vanilla JS 백업을 실행할 수 있습니다. 두 화면은 같은 코스 API를 사용하며, 정적 백업에 시연용 내장 엔진도 포함합니다.

## 3. 운영 구조와 코스 API

- 메인 `/`는 React·TypeScript·CSS, 백업 `/elice-final.html`은 HTML·CSS·Vanilla JS입니다. 두 화면은 같은 `POST /api/course` 응답을 사용합니다.
- FastAPI는 로컬 서버 또는 Vercel의 `api/index.py` 함수로 실행됩니다. 공공데이터 인증키는 서버 환경에만 둡니다.
- 기본 API 경로는 `/api`입니다. 별도 API 서버일 때만 공개 빌드 변수 `VITE_API_BASE`에 API 베이스 URL(예: `https://api.example.org/api`)을 설정하고 서버의 `CORS_ORIGINS`에 프런트 주소를 등록합니다.
- 응답은 코스 카드, 지도 좌표, 초대장과 도구 결과를 포함합니다. 카드와 도구 결과는 `sourceType`, `fetchedAt`(UTC 조회 시각), `sourceUpdatedAt`(원본 수정일 또는 기준월)을 구분합니다. 원본 날짜를 공급하지 않으면 미제공으로 표시합니다.

## 4. 공공 API 연동과 폴백

| 데이터 | 사용 범위 | 공식 원문 |
| --- | --- | --- |
| 한국관광공사 무장애 여행 정보 | 지역 관광지와 숙박 목록, 콘텐츠별 무장애 상세 | [공공데이터포털](https://www.data.go.kr/data/15101897/openapi.do) |
| 소상공인시장진흥공단 상가(상권)정보 | 선택한 관광지 또는 명시된 지역 기준점 반경 600m의 식당·카페 후보 | [공공데이터포털](https://www.data.go.kr/data/15012005/openapi.do) |
| 국립공원공단 탐방로 | 제공 파일에 최대 경사도 열 부재. 부산 무장애 탐방로 추천 보류 | [탐방로 등급제 정보](https://www.data.go.kr/data/15032340/fileData.do) |

- `live_api`는 공공 API 조회, `public_dataset`은 공식 공개 파일 데이터, `fallback_mock`은 시연용 내장 샘플입니다. 현재 운영 실시간 코스에는 공식 탐방로 파일을 연결하지 않습니다.
- 무장애 상세의 원문 값만 **공공데이터에 기재**로 표시합니다. 식당 출입구 턱, 숙박 객실·욕실 구조 등 원본에 없는 내용은 **현장·유선 확인 권장**으로 표시합니다. 코스 시간은 제안이며 영업시간·이동 가능성을 보장하지 않습니다.
- 정상 응답에 후보가 없으면 빈 결과를 표시합니다. 일부 도구만 실패하면 공식 조회에 성공한 후보와 실패 도구 상태를 표시합니다. 요청된 공식 조회가 모두 실패하면 서버가 503을 반환합니다.
- 정적 백업만 네트워크 오류, 타임아웃 또는 서버 5xx에서 시연용 샘플로 전환합니다. 운영 환경에서는 `ENABLE_SETTINGS=false`를 유지합니다.

### 서버 환경변수

`.env.example`의 서버 키 이름을 로컬 `.env`와 Vercel 환경에 사용합니다. 기존 로컬 `KorWithS_Key`, `SdsC_Key`는 호환 별칭입니다. 숙박 키를 별도 지정하지 않으면 관광공사 무장애 서비스 키를 사용합니다. `OPENNADEULI_USE_LIVE=false`는 개발용 명시적 샘플 모드입니다. 카카오맵은 도메인 제한된 공개 JavaScript 키를 별도로 사용합니다.

### 완전 오프라인 시연

인터넷이 연결된 환경에서 `npm --prefix frontend run build:offline`을 실행합니다. 생성된 `frontend/dist-offline/elice-offline.html` 한 파일을 저장한 뒤 브라우저에서 열면 내장 샘플로 실행됩니다. 오프라인에서는 지도 타일과 공공 API를 사용할 수 없습니다.

## 5. 프로젝트 구조

루트(Vanilla JS 정적 앱, 지위 미정 TODO(확인 필요)):

```
index.html              단일 실행 파일 (CSS·JS 인라인) — vercel.json 배포 대상 아님
index.template.html     개발용 템플릿 (js/ 모듈 참조)
standalone.html         build-standalone.mjs 생성물 (index.html과 동일 내용, file:// 직접 열기용)
styles.css              가독성 중심 UI
serve.mjs               정적 서버 + /proxy/openapi·/proxy/kakaomaps 프록시 (포트 8899)
js/
  data.js     내장 샘플 데이터 (관광지/탐방로/식당/호텔)
  nlu.js      규칙 기반 의도 분석기
  tools.js    도구 정의·라이브 API 커넥터·필터링·설정 저장소
  agent.js    파이프라인 오케스트레이터
  ui.js       채팅·타임라인·도구 칩·카드·초대장·설정 렌더링
  main.js     진입점
```

frontend/ (Vite+React+TypeScript):

```
package.json            vite, react, typescript, build:vercel 스크립트
vite.config.ts          Vite 설정 (포트 5176 dev / 5190 preview)
index.html              Vite 엔트리 HTML
```
src/
  App.tsx               React 챗봇 컴포넌트 (postCourse로 백엔드 호출)
  lib/api.ts            백엔드 API 호출 (API_BASE 하드코딩, VITE_* 미사용)
  main.tsx              React 진입점
  types.ts              CourseRequest/CourseResponse/CourseAnswer 등 타입 정의
  styles.css            스타일
```

`backend/`(Python·FastAPI):

```
app.py                  FastAPI 진입점 (포트 8899, CORS_ORIGINS, 정적 파일 서빙)
requirements.txt        fastapi, uvicorn, python-dotenv, httpx, pydantic
test_backend.py         백엔드 로직 테스트 스크립트
src/
  api/
    routes.py           /api/health, /api/course, /api/settings 라우트
  data/
    sample_data.py      내장 샘플 데이터 (filter_spots/trails/restaurants/hotels)
  services/
    agent.py            AI 에이전트 파이프라인 (OutingAgent)
    nlu.py              의도 분석기
    tools.py            공공 API 도구 스펙, 라이브/내장 폴백, 설정 저장(os.environ)
```

`docs/`:
```
docs/기획서.md          제품 기획 요약
docs/specs/             (없음 — Spec 작성 필요 시 작성)
docs/adr/               (없음 — ADR 작성 필요 시 작성)
```

지원 파일:
```
.env.example            API 키 템플릿 (키 이름만, 값 없음)
.gitignore              .env, node_modules, dist 등 제외
vercel.json             Vercel 배포 설정 (FastAPI 함수 + 정적 파일)
- **Vercel 배포**: `vercel.json` 설정 포함. GitHub 저장소 연결 후 Vercel에서 자동 배포.
- 배포 구조: FastAPI 함수(`/api/:path*` → `api/index.py`)와 Vite 정적 파일(`frontend/dist`)
- `.env`는 `.gitignore`로 제외. 실제 API 키는 Vercel 프로젝트 설정의 Environment Variables에 등록.
- 운영 첫 화면 `/`은 React입니다. 엘리스 정적 백업은 `/elice-final.html`에서 실행되며 두 화면은 기본적으로 같은 FastAPI 코스 API를 사용합니다.
- 다른 origin에서 API를 직접 호출하는 경우 해당 origin을 `CORS_ORIGINS`에 설정합니다.
- Kakao JS SDK 도메인에 개발 포트와 Vercel 도메인을 등록해야 지도 기능이 정상 동작합니다(React와 엘리스 백업 공통).

README.md               개요·실행법 (사람 독자)
CONVERSATION_LOG.md     작업 기록
```
## 6. 확장 포인트

- **LLM 연동**: `backend/src/services/nlu.py`의 `parse_intent`를 모델 기반 파서로 교체하고, `backend/src/services/tools.py`의 `TOOL_SPECS`는 OpenAI 스타일 function schema로 되어 있어 그대로 모델 tools에 전달할 수 있습니다.
- **지역·장소 추가**: `backend/src/data/sample_data.py`에 관광지/탐방로/식당 항목을 스펙 형식 그대로 추가하면 의도 분석 키워드만 보강해도 즉시 추천 대상에 포함됩니다.
- **배지 확장**: `backend/src/data/sample_data.py`의 배지 필드만 채우면 카드·요약·초대장에 자동 반영됩니다.
## 7. 주의

- 내장 데이터(장소명·주소·시설 정보)는 **시연용 가상 데이터**입니다. 실제 방문 전
  각 지자체·시설 공식 정보를 확인하세요. **루트 앱은 장소 링크에 네이버 지도 검색을 사용하고, 동선 요약·지도에는 카카오를 함께 사용합니다.** React의 장소별 링크는 네이버 지도를 엽니다. 전체 동선 지도는 빌드 환경의 `OPENNADEULI_MAPKAKAO`에 카카오 **JavaScript 키**가 있고 현재 도메인이 카카오에 등록되어 있을 때 표시합니다.

## 8. 현재 검증 상태

| 항목 | 결과 | 비고 |
|------|------|------|
| 백엔드 API (`GET /api/health`, `POST /api/course`) | 검증됨 | curl/TestClient로 200 + `answer` 구조 확인 |
| 백엔드 API (`POST /api/settings`) | 로컬 검증 | `ENABLE_SETTINGS` 빈 값에서 403, `true`에서 200. Vercel 인스턴스 간 설정 유지 여부는 미검증 |
| Vercel 프리뷰 HTTP | 검증됨 | 홈페이지·JS·헬스 체크·코스 요청 200, 설정 조회·저장 403 |
| 프런트 빌드 (`npm run build`) | 검증됨 | `tsc && vite build` 성공 |
| 프런트 정적 서빙 및 API 연동 | 로컬 검증 | Vite 프리뷰 5197 포트에서 브라우저가 코스 응답을 받아 추천 카드를 표시함 |
| CORS preflight | 로컬 검증 | 허용 origin은 200과 `Access-Control-Allow-Origin` 반환. 허용 목록 밖 origin은 400이며 해당 헤더 없음. 인수인계에 기록된 동작은 로컬에서 재현되지 않았으며, 당시 발생 원인은 미확인 |


## 정보 출처와 라이선스

외부 정보는 공식 원문을 우선 사용하고, 기관명·데이터명·원문 URL·발표 또는 조회 시각을 표시한다.

| 데이터셋 | 기관 | 원문 URL | 라이선스·이용 조건 | 확인 시각 |
|----------|------|----------|-------------------|-----------|
| 한국관광공사 열린관광지 (KorWithService2) | 한국관광공사 | https://www.data.go.kr | TODO(확인 필요) | TODO(확인 필요) |
| 소상공인 상권정보 (sdsc2) | 소상공인시장진흥공단 | https://www.data.go.kr | TODO(확인 필요) | TODO(확인 필요) |
| 국립공원·지자체 무장애 탐방로 | 내장 샘플 | — | 데이터셋별 이용약관 확인 필요 | TODO(확인 필요) |
| Kakao Maps JavaScript SDK | (주)카카오 | https://apis.map.kakao.com | 카카오 개발자 약관 적용 | TODO(확인 필요) |

※ 공공누리 유형과 조회 시각은 실제로 열어서 확인한 경우에만 기입한다. 확인하지 못한 칸은 TODO(확인 필요)로 두며, 조회 시각을 지어내지 않는다.


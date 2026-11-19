# 오픈나들이 🦽🌿

**휠체어·보행 약자를 위한 무장애 관광 AI 에이전트** — 일상 대화 한마디로 공공 무장애 데이터(관광지·완만한 산책로·턱 없는 식당)를 자율 연동해, 헛걸음 걱정 없는 배리어프리 나들이 코스를 제안하는 원스톱 AI 큐레이션 웹앱.

---

## 1. 핵심 기능

| 요구사항 | 구현 |
| --- | --- |
| 자연어 → 4개 공공 API 자율 호출·조합 | 규칙 기반 의도 분석(nlu.js) → 도구 조합 계획 → 도구 체이닝 실행(agent.js) |
| 한국관광공사 열린관광지 API | `searchOpenTouristSpots` — 휠체어 대여·장애인 화장실·휠체어 진입 완비 장소 |
| 국립공원공단·지자체 무장애 탐방로 API | `searchAccessibleTrails` — **최대 경사도 8% 이하** 데크길 필터링 |
| 소상공인시장진흥공단 상권정보 API | `searchStepFreeRestaurants` — **출입구 턱 없는** 인근 식당(카페 종목 포함) |
| 한국관광공사 무장애 숙박 API | `searchStayHotels` — 1박 2일 코스의 **휠체어 이용 가능 숙소(호텔·리조트)**, 숙박 카테고리(contenttypeid=32) |
| 내장 샘플 데이터로 시연 | 실제 공공데이터 스펙과 동일한 구조의 내장 샘플 데이터(부산 해운대·기장 / 서울 / 제주) — 실제 API 키 없이도 코스 추천 화면 확인 가능 ("완벽한 시연"은 아님, 외부 의존 최소화 수준) |
| 에이전트 추론 과정 시각화 | 채팅 안에 단계별 타임라인 + 도구 호출 JSON 칩 + 제외 근거 표시 |
| 코스 결과 카드 | 동선 순서(오전→점심→오후) 카드 + 안심 체크포인트 배지 + 한 줄 팁 + 지도 링크 |
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

> 기본 화면은 React·TypeScript·CSS입니다. 같은 서버에서 `/elice-final.html`을 열면 엘리스 HTML·CSS·Vanilla JS 백업을 실행할 수 있습니다. 두 화면은 브라우저에서 같은 내장 코스 엔진을 사용합니다.

## 3. 에이전트 동작 구조

React 화면과 엘리스 백업은 브라우저에서 같은 코스 엔진을 실행합니다. 아래 흐름은 별도로 제공하는 FastAPI의 `/api/course`를 직접 호출할 때 적용됩니다.

```
사용자 발화 ("주말에 휠체어 타고 부산 바다 데크길 코스 찾아줘")
   │
   ├─ POST /api/course (app.py 라우터 → backend/src/api/routes.py)
   │   ├─ ① 의도 분석    backend/src/services/nlu.py: 지역/테마/동행/우천/일정 → 파라미터
   │   ├─ ② 도구 조합 계획 4개 도구 호출 순서 확정
   │   ├─ ③ 도구 자율 호출 backend/src/services/tools.py: call_tool()
   │   │     ① searchOpenTouristSpots     (한국관광공사 열린관광지·TourAPI)
   │   │     ② searchAccessibleTrails     (무장애 탐방로, maxSlope ≤ 8%)
   │   │     ③ searchStayHotels           (무장애 숙소, contenttypeid=32)
   │   │     ④ searchStepFreeRestaurants  (상권정보, 턱 없는 식당) ← ①②의 '선택된 장소 인근 상권'을 인자로 사용 (도구 체이닝)
   │   ├─ ④ 검증·필터링 제외 사유까지 반환 (예: "갈치봉 능선 구간(경사도 11.8%) 제외")
   │   └─ ⑤ 코스 조립·응답   오전 관광지 → 점심 식당 → 오후 데크길 카드 + 배지 + 팁 + 초대장 + 후속 칩
   │
   └─ 응답 JSON: { "events": [...], "answer": { ... }, "source": "sample" }
```

운영 React 화면(`frontend/src/App.tsx`)은 `frontend/src/lib/sample-course.ts`를 통해 내장 코스 엔진을 호출하고 응답을 채팅 화면에 렌더링합니다.

각 단계는 이벤트 핸들러(`onStatus / onTool / onToolDone / onNote / onAnswer`)로 스트리밍되어 UI 타임라인에 표시됩니다.

## 4. 공공 API 실시간 연동 가이드

운영 화면은 **내장 샘플 데이터**로 동작합니다. 아래 공공데이터 설정은 개발 참고용입니다.

### 설정 저장 방식

- API 키는 `POST /api/settings`로 백엔드에 전달되며, `backend/src/services/tools.py`의 `save_settings()`가 `os.environ`에만 저장합니다. **파일에는 저장되지 않으며, 서버 재시작 시 소멸합니다.**
- `ENABLE_SETTINGS`가 비활성 상태이면 설정 조회와 저장이 모두 403을 반환합니다. 공개 환경에서는 비활성 상태를 유지합니다.

### 라이브 API 호출 경로

- 백엔드 `backend/src/services/tools.py`의 `_try_live()`가 `httpx.Client`로 공공데이터포털을 **서버에서 직접 호출**합니다.
- 브라우저 직접 호출 또는 `serve.mjs` 프록시는 현재 React 프런트에서 사용하지 않습니다.
- 라이브 호출 실패 시 내장 샘플 데이터로 자동 폴백합니다.

### 발급 절차

1. https://www.data.go.kr 회원가입 (본인인증)
2. 아래 서비스에 활용신청 후 인증키 발급:
   - 한국관광공사_국문관광정보 서비스 (KorWithService2)
   - 소상공인시장진흥공단_상가(상권)정보_OpenApi (sdsc2)
3. `POST /api/settings`로 키를 백엔드에 전달하거나, 서버 시작 시 `OPENNADEULI_<KEY_NAME_UPPER>` 환경변수로 설정

### 동작 방식과 안전장치

- 관광지는 무장애여행 API `areaBasedList2`(지역별)로 조회하고 0건이면 `searchKeyword2` 키워드로 재시도하며, 상위 3곳은 `detailIntro2` 상세로 무장애 시설(휠체어 대여·화장실 등)을 검증해 실배지를 부여합니다.
- 식당은 상권정보 `storeListInRadius`로 선택된 활동 장소 좌표 반경 600m 중 음식점을 선별하고, 카페 옵션 시 카페 종목 매장을 우선 배정합니다.
- 1박 2일 코스에서는 `searchStayHotels`로 무장애여행 정보의 숙박 콘텐츠(contenttypeid=32)를 조회해 1일차 마지막 "체크인" 카드로 배치합니다.
- 일정 조립은 시간대 칸에 활동을 고정하지 않습니다 — 시작~종료 시간 범위와 식사/카페 옵션만으로 활동 수(2.5시간당 1개, 최대 3개)와 끼니·카페 시간 창을 계산해 유연하게 배치하고, 시간에 맞지 않는 이벤트는 제외하며 그 근거를 노트로 표시합니다.
- 지역 인식은 `backend/src/services/nlu.py`의 `REGION_KEYWORDS` 사전 기준 — "동해"→강원, "서해"→인천, "남해"→경남, "포항·울진"→경북 등 바다 키워드를 포함한 전국 시·도를 인식하고, 호출 시 TourAPI 표준 지역코드(`AREA_CODE`)를 사용합니다. 내장 샘플이 없는 지역은 전국 샘플로 폴백하며 도구 노트에 근거를 표시합니다.
- 탐방로(`②`)는 data.go.kr에 OpenAPI가 미제공(파일데이터만 확인)이라 내장 데이터로 검증합니다. 행안부 생활안전지도(safemap.go.kr) 연동은 TODO(확인 필요)입니다.
- 한국관광공사_국문관광정보 서비스 (KorWithService2)
   - **[개발계정]한국관광공사_무장애 여행 정보** — End Point `KorWithService2` (전용 무장애 콘텐츠 + 상세 시설 검증)
   - **소상공인시장진흥공단_상가(상권)정보_api** — End Point `B553077/api/open/sdsc2` (반경내 상가업소 storeListInRadius)
   - (선택) 국립공원공단 탐방로 관련 서비스 — 신청 후 `js/tools.js`의 `LIVE_APIS.searchAccessibleTrails.url`에
     실제 경로를 기입하면 즉시 연결됩니다. (미기입 시 이 도구만 내장 데이터 사용)
3. 마이페이지 → 오픈API 마이페이지 → **인증키 복사**
4. 앱 **⚙️ API 설정** → 키 붙여넣기 → "실시간 조회 시도 사용" 체크 → 저장
5. **연결 테스트** 버튼: 실제 게이트웨이 응답 코드까지 리포트합니다.

### 카카오 지도 키 (동선 지도용 — 선택)

결과 하단 [📋 이번 나들이 전체 동선 요약]의 인라인 지도는 **카카오맵 JavaScript SDK**를 사용합니다.
키가 없으면 지도 대신 요약 리스트만 표시됩니다(기능에 영향 없음).

1. https://developers.kakao.com 회원가입(카카오 계정) → **내 애플리케이션 → 애플리케이션 추가하기**
2. 앱 설정 → 앱 키 → **JavaScript 키** 복사 (REST API 키가 아님에 주의)
3. 앱 **⚙️ API 설정** → "④ 카카오 지도 JavaScript 키"에 붙여넣기 → 저장
4. 좌표가 없는 장소는 카카오 장소 검색(services) → Nominatim 순으로 자동 보완합니다

- **도메인 등록(필수)** — 공식 문서(JavaScript 시작하기) 기준: JavaScript SDK로 카카오 API를 호출하려면
  **[앱] > [플랫폼 키] > [JavaScript 키] > [JavaScript SDK 도메인]**에 실행 도메인을 등록해야 합니다.
  - 주의: 앱 정보 폼의 **"앱 대표 도메인"은 지도와 무관**하고 localhost를 받지 않습니다(유효한 본인 사이트 URL 아무거나).
    지도 인증에 쓰이는 것은 **JavaScript 키 항목의 "JavaScript SDK 도메인"**입니다.
  - `file://` 직접 열기는 도메인 검사를 통과할 수 없어요 → **`node serve.mjs` 실행(기본 포트 8899) 후
    `http://localhost:8899`를 JavaScript SDK 도메인에 등록**하고, 브라우저에서 localhost로 접속하세요.
  - JavaScript SDK 도메인에 localhost 등록이 거부되면 로컬 인라인 지도는 불가 — 요약 리스트의
    **[카카오맵에서 보기]** 버튼(키 불필요)으로 장소별 지도를 여세요. 웹 배포(github.io 등) 시 그 도메인을
    등록하면 인라인 지도가 동작합니다.
  - ⚙️ 설정 저장 시 지도가 안 떠 있던 섹션을 **재검색 없이 즉시 재시도**합니다.
- 키 쿼터 초과·SDK 로드 실패 시 지도만 비활성화되고 코스·요약 리스트는 정상 동작합니다.

### 응답 코드 참고
| 코드 | 의미 |
| --- | --- |
| OK / NORMAL_SERVICE | 성공 — 실시간 조회 동작 |
| 30 / 31 | 활용신청 미완료·서비스 미등록 → 신청 상태 확인 |
| 33 | 인증키 오류 → 마이페이지 키 재확인 |
| 22 | 요청 한도 초과 → 잠시 후 재시도 |
| 12 | 서비스 미등록/폐기 안내 (잘못된 키·경로에서도 표시될 수 있음) |


### 동작 방식과 안전장치
- 호출 경로: **① 브라우저 직접 호출** (data.go.kr는 CORS를 허용 — Origin을 응답에 반영하므로 localhost·터널
  어디서든 동작하고, 호출 IP가 사용자 브라우저라 게이트웨이 응답도 정상) → 실패 시 **② serve.mjs 내장 프록시**
  (`/proxy/openapi`, apis.data.go.kr 경로만 허용). 둘 다 실패(file:// 직접 열기 등)하면 내장 데이터로 전환.
- 관광지는 무장애여행 API `areaBasedList2`(지역별)로 조회하고 0건이면 `searchKeyword2` 키워드로 재시도하며,
  상위 3곳은 `detailIntro2` 상세로 무장애 시설(휠체어 대여·화장실 등)을 검증해 실배지를 부여합니다.
- 식당은 상권정보 `storeListInRadius`로 선택된 활동 장소 좌표 반경 600m 중 음식점을 선별하고,
  카페 옵션 시 카페 종목 매장을 우선 배정합니다.
- 1박 2일 코스에서는 `searchStayHotels`로 무장애여행 정보의 숙박 콘텐츠(contenttypeid=32)를 조회해
  1일차 마지막 "체크인" 카드로 배치합니다 (관광지 도구와 같은 ① 키 사용).
- 일정 조립은 시간대 칸에 활동을 고정하지 않습니다 — 시작~종료 시간 범위와 식사/카페 옵션만으로
  활동 수(2.5시간당 1개, 최대 3개)와 끼니·카페 시간 창을 계산해 유연하게 배치하고,
  시간에 맞지 않는 이벤트는 제외하며 그 근거를 노트로 표시합니다.
- 지역 인식은 `nlu.js`의 `REGION_KEYWORDS` 사전 기준 — "동해"→강원, "서해"→인천, "남해"→경남,
  "포항·울진"→경북 등 바다 키워드를 포함한 전국 시·도를 인식하고, 호출 시 TourAPI 표준 지역코드
  (`AREA_CODE`)를 사용합니다. 내장 샘플이 없는 지역은 전국 샘플로 폴백하며 도구 노트에 근거를 표시합니다.
- 탐방로(②)는 data.go.kr에 OpenAPI가 미제공(파일데이터만 확인)이라 내장 데이터로 검증하며,
  대안으로 행안부 생활안전지도(safemap.go.kr) 국립공원탐방로 API 연동이 가능합니다.
- **현장 확인 배지**: 공공 API가 휠체어 대여·출입구 턱 등 상세 무장애 정보를 제공하지 않는 경우,
  라이브 결과 카드에는 "⚠️ 무장애 정보 현장 확인 필요" 배지를 붙여 확인되지 않은 정보를 안전하게 구분합니다.

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
- 운영 첫 화면 `/`은 React입니다. 엘리스 정적 백업은 `/elice-final.html`에서 실행되며 두 화면은 같은 코스 엔진을 사용합니다.
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


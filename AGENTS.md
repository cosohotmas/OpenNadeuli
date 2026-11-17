# AGENTS.md

AI 코딩 에이전트(Claude Code, Codex, Cursor 등)가 이 저장소에서 작업할 때 따르는 공통 지침입니다. 어떤 도구를 쓰든 이 문서를 기준으로 합니다.

## 프로젝트 개요

오픈나들이(OpenNadeuli)는 휠체어·보행 약자를 위한 무장애 관광 AI 에이전트 웹앱입니다.
일상 대화 한마디로 공공 무장애 데이터(한국관광공사 열린관광지, 국립공원공단·지자체 무장애 탐방로, 소상공인 상권정보)를 조합해 헛걸음 없는 나들이 코스를 제안합니다.

- 정적 웹앱: HTML5 + CSS3 + Vanilla JS(ES Modules) — 빌드·외부 라이브러리 없음(오프라인 시연 최적화)
- 단일 파일 빌드: `node build-standalone.mjs`로 `index.html`·`standalone.html` 생성
- 정적 서버: `node serve.mjs` (포트 8899, IPv4+IPv6, 캐시 방지, `/proxy/openapi` 프록시 포함)
- 실행: `http://localhost:8899` 또는 `file://`로 `standalone.html` 직접 열기

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Vanilla JS(ES Modules), HTML5, CSS3 |
| 빌드 도구 | Node.js 내장 모듈만 사용 (`build-standalone.mjs`) |
| 정적 서버 | `serve.mjs` (Node.js 내장 `http` + `fs/promises`) |
| 공공 데이터 | 한국관광공사 무장애여행 API(KorWithService2), 소상공인 상권정보 API(sdsc2) |
| 지도 | 카카오맵 JS SDK v2 (`dapi.kakao.com/v2/maps/sdk.js`) |
| 설정 저장 | 브라우저 `localStorage` (`opennatri.settings.v1`) — API 키는 외부 전송 안 함 |

## 주요 파일 구조

```
index.html            ★ 배포용 단일 실행 파일 (CSS·JS 전부 인라인)
standalone.html       index.html과 동일한 사본 (file:// 직접 열기용)
index.template.html   개발용 템플릿 (js/ 모듈 참조 버전, 배포 원본)
styles.css            가독성 중심 UI (본문 18px+, 고대비, 큰 터치 영역, 반응형)
serve.mjs             의존성 없는 정적 서버 + /proxy/openapi 프록시
build-standalone.mjs  js/ 소스를 인라인해 단일 HTML 생성
capture-snapshot.mjs  실측 데이터 스냅샷 캡처 도구 (인증키 미포함)
js/
  data.js     내장 샘플 데이터 (관광지/탐방로/식당/호텔, 배지 정의, 지역 좌표)
  nlu.js      규칙 기반 의도 분석기 (자연어 → 지역/테마/동행/일정 파라미터)
  tools.js    4개 도구 정의·라이브 API 커넥터·필터링·제외 근거·설정 저장소
  agent.js    파이프라인 오케스트레이터 (계획→호출→체이닝→조립, 후속 질문 맥락 유지)
  ui.js       채팅·타임라인·도구 칩·카드·초대장·설정 모달 렌더링
  main.js     진입점 — 에이전트·UI 초기화
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

## 로깅 원칙

- 예외를 잡을 때 그냥 버리지 않습니다(`except Exception: pass`). 무슨 예외였는지 콘솔/로그로 남깁니다.
- URL·토큰·키 등 자격증명을 로그에 평문으로 남기지 않습니다.

## 배포

- **Vercel 정적 사이트 배포**: `vercel.json` 설정 포함. GitHub 저장소 연결 후 Vercel에서 자동 배포.
- `.env`는 `.gitignore`로 제외. 실제 API 키는 Vercel 프로젝트 설정의 Environment Variables에 등록.

## 완료 기준

- 정적 웹앱: 브라우저 동작 확인 (코스 조회, 지도 렌더링, 초대장 생성 등)
- 빌드: `node build-standalone.mjs` 실행 후 `index.html`·`standalone.html` 정상 생성
- 검증하지 않은 항목을 "완료"라고 말하지 않습니다.

## 기본 스킬 구성 (2026-11-05 추가)

이 프로젝트는 `.agents/skills/` 레지스트리와 프로젝트 루트의 `skills.config.json`을 기본 스킬 구성으로 사용합니다.

### 설치 방법
- 개별 스킬: `npx --yes skills add <owner/repo> --skill <스킬명> -g`
- k-skill 번들: `npx --yes skills add NomaDamas/k-skill --all -g`

### 기본 스킬 목록
- skills.sh 상위 랭킹: `.agents/skills/skills-sh/skills-rank-all-time-*.md`
- k-skill 135개 전체: `.agents/skills/k-skill/k-skill-list.md`
- 설치 명령어 예시: `.agents/skills/skills-sh/install-commands.md`, `.agents/skills/k-skill/install-commands.md`

프로젝트 루트의 `skills.config.json`에 기본 스킬이 미리 등록되어 있습니다. 작업 시작 시 해당 프로젝트의 `skills.config.json`을 확인하고, 없는 스킬은 `.agents/skills/`에서 조회해 추가 설치합니다.
# Vercel API 라우팅

## Why

운영 React 화면을 연 방문자가 코스를 요청할 수 없다. 운영 `/api/health`는 Vercel 404이며, 빌드 결과 목록에 API 함수가 표시되지 않는다.

## Goal

- 프리뷰에서 홈페이지, JS 자산, 헬스 체크, 샘플 코스 요청 각각 1건 이상이 200을 반환한다.
- 설정 비활성 상태에서 공개 설정 조회와 저장 각각 1건이 403을 반환한다.
- 범위 제외는 초기 화면 복원, 공공 API 키 구성, 운영 전환이다.

## What

- React와 FastAPI를 한 Vercel 프로젝트에 배포한다.
- 알 수 없는 API 경로는 FastAPI의 JSON 404를 반환한다.
- 설정 조회도 설정 저장과 같은 환경변수 조건을 적용한다.

## How

- Vercel의 `api/index.py`가 기존 `app.py`의 ASGI 앱을 가져온다.
- `rewrites`는 `/api/:path*`를 API 함수로 전달하고 나머지 페이지 경로를 `/index.html`로 보낸다. Vite 빌드 위치는 유지한다.
- `ENABLE_SETTINGS`가 활성화된 로컬 환경에서는 기존 설정 동작을 유지한다. 프리뷰에는 키를 전달하지 않고 설정을 비활성화한다.

## AC

- Given 프리뷰가 준비됐다. When 브라우저가 홈페이지를 열고 부산 코스를 요청한다. Then 정적 자산과 `POST /api/course`가 200이며 추천 결과가 표시된다.
- Given 프리뷰 API 함수가 준비됐다. When `GET /api/health`와 미등록 API를 호출한다. Then 각각 JSON 200과 JSON 404를 반환한다.
- Given `ENABLE_SETTINGS=false`다. When `GET /api/settings` 또는 `POST /api/settings`를 호출한다. Then 403을 반환한다.

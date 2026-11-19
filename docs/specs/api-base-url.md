# Spec: 프런트 API base URL 설정 방식

## Why

현재 `frontend/src/lib/api.ts`가 `http://127.0.0.1:8899`를 하드코딩하고 있어, Vercel 배포 시 모든 API 호출이 `127.0.0.1:8899`(로컬호스트)를 가리켜 실패한다. 프런트가 백엔드를 직접 호출하므로, 배포 환경에서 프런트의 API base URL을 동적으로 구성할 수 있는 방식이 필요하다.

## Goal

- 배포(Vercel) 환경에서 프런트가 백엔드 API를 정상적으로 호출할 수 있어야 함
- 로컬 개발 환경(Vite dev server)에서도 백엔드 API 호출이 정상 동작해야 함
- API base URL 설정 방식을 확정하고, 구현 안을 문서화함

## What

프런트(`frontend/src/lib/api.ts`)의 API base URL을 하드코딩에서 환경 기반 설정으로 변경한다.

두 가지 안을 비교:

**안 A: 상대경로 `/api` + Vite 프록시**
- 프런트는 `/api/course` 등 상대경로로 호출
- Vite dev 서버의 `server.proxy`로 `/api`를 백엔드(`http://127.0.0.1:8899`)에 프록시
- 배포(Vercel) 시 프런트와 백엔드가 동일 도메인이므로 프록시 불필요, CORS도 불필요

**안 B: `VITE_API_BASE` 환경변수**
- 프런트는 `import.meta.env.VITE_API_BASE`를 base URL로 사용
- 빌드 시 환경변수 주입 필요
- 미설정 시 `127.0.0.1:8899` 폴백 가능 (로컬 개발 편의)
- 도메인이 다르면 `CORS_ORIGINS`에 배포 도메인 추가 필요

## How

### 안 A 구현 경로
1. `frontend/src/lib/api.ts`의 `API_BASE`를 `''`(상대경로)로 변경
2. `frontend/vite.config.ts`에 `server.proxy` 설정 추가: `/api` → `http://127.0.0.1:8899`
3. `vercel.json`은 기존 구조(`/api/(.*)` → `/app.py`) 유지, 별도 프록시 설정 불필요
4. 로컬 개발 시 Vite 프록시가 백엔드 요청을 처리, CORS 설정 불필요

### 안 B 구현 경로
1. `frontend/src/lib/api.ts`의 `API_BASE`를 `import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8899'`로 변경
2. `vercel.json`의 환경변수에 `VITE_API_BASE` 추가 (배포 도메인)
3. `.env.example`에 `VITE_API_BASE` 키 이름만 추가 (값 없음)
4. 로컬 개발 시 `.env`에 `VITE_API_BASE=http://127.0.0.1:8899` 설정

### 비교 요약

| 항목 | 상대경로 `/api` + Vite 프록시 | `VITE_API_BASE` 환경변수 |
|------|------------------------------|------------------------|
| 배포 시 CORS | 불필요 (동일 도메인) | 필요 (도메인이 다르면 `CORS_ORIGINS` 추가) |
| 로컬 개발 | Vite 프록시 필요 (이 경우 CORS 불필요) | 직접 호출, `CORS_ORIGINS`에 localhost 추가 필요 |
| 재빌드 필요 | 불필요 | 필요 (환경변수는 빌드 시 주입) |
| 값 노출 | 없음 (런타임 상대경로) | 빌드 시 번들에 포함될 수 있음 |
| 미설정 시 동작 | 프록시 미설정 시 실패 | `127.0.0.1:8899` 폴백 가능 |

## AC

- Given `VITE_API_BASE` 미설정
- When `npm run build` 실행
- Then 번들에 `127.0.0.1:8899` 하드코딩 문자열이 포함되지 않음

- Given 프런트가 `/api/course`로 상대경로 호출 (안 A)
- When Vite dev 서버가 `server.proxy`로 `/api`를 백엔드에 프록시
- Then 백엔드 `POST /api/course`에 정상적으로 요청이 도달하고 200 응답 수신

## Out of Scope

- `/api/settings` 보호 (ENABLE_SETTINGS 인증, 키 응답 포함 여부) - 별도 보안 검토 필요
- CORS 정책 변경 (`CORS_ORIGINS` 값 추가/삭제) - 배포 환경 설정 문제

## 사용자 결정 필요

상대경로 `/api` + Vite 프록시안과 `VITE_API_BASE` 환경변수안 중 어떤 방식을 채택할지 사용자가 결정해야 함.
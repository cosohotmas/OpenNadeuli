"""
app.py — OpenNadeuli FastAPI 앱 진입점

실행 순서:
  1. import + load_dotenv (.env 로드)
  2. FastAPI() 생성 + CORS 설정 (CORS_ORIGINS 환경변수, 기본은 로컬 개발 주소)
  3. API 라우트 등록 (/api/* — backend/src/api/routes.py 가 정본, /api/health 포함)
  4. 없는 /api/* 경로는 JSON 404 (정적 파일 탐색으로 빠지지 않게)
  5. 정적 파일 서빙 (frontend/dist, SPA 폴백) — 반드시 마지막에 마운트
  6. uvicorn.run(app) → 기본 :8899 LISTEN (PORT 환경변수로 변경)
  배포(Vercel)도 같은 app 객체를 사용한다. (Vercel 실배포 라우팅은 미검증)
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.src.api.routes import router as api_router

_ROOT = Path(__file__).resolve().parent

# .env 로드 (API 키 등)
load_dotenv(_ROOT / ".env")

DEFAULT_PORT = 8899
DEFAULT_CORS_ORIGINS = (
    "http://localhost:5176,http://127.0.0.1:5176,"
    "http://localhost:5173,http://127.0.0.1:5173"
)


def _cors_origins() -> list[str]:
    """CORS_ORIGINS(쉼표 구분)를 읽는다. 비어 있으면 로컬 개발 주소만 허용한다."""
    raw = os.environ.get("CORS_ORIGINS", "").strip() or DEFAULT_CORS_ORIGINS
    return [o.strip() for o in raw.split(",") if o.strip()]


app = FastAPI(title="OpenNadeuli API", version="1.0.0")

# CORS — 쿠키 인증을 쓰지 않으므로 allow_credentials 는 켜지 않는다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# API 라우트 (/api/health 등은 routes.py 에만 둔다 — 중복 정의 금지)
app.include_router(api_router)


@app.api_route(
    "/api/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    include_in_schema=False,
)
async def api_unknown(path: str) -> JSONResponse:
    """등록되지 않은 /api/* 경로는 HTML 이 아니라 JSON 404 로 답한다."""
    return JSONResponse(status_code=404, content={"detail": f"Unknown API path: /api/{path}"})


class SpaStaticFiles(StaticFiles):
    """화면 경로만 index.html 로 폴백하고, 확장자가 있는 누락 자산은 404 를 유지한다."""

    async def get_response(self, path, scope):  # type: ignore[override]
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as error:
            # 404 이고 확장자가 없는 경로(SPA 라우트)만 index.html 로 바꾼다.
            if error.status_code == 404 and "." not in Path(path).name:
                return await super().get_response("index.html", scope)
            raise


# 정적 파일 서빙 (프런트 빌드 산출물) — 모든 /api 라우트 뒤, 맨 마지막에 마운트한다.
_DIST = _ROOT / "frontend" / "dist"
if _DIST.exists():
    app.mount("/", SpaStaticFiles(directory=str(_DIST), html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", DEFAULT_PORT)))

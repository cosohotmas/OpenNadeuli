"""
app.py — OpenNadeuli FastAPI 앱 진입점

실행 순서:
  1. import + load_dotenv (.env 로드)
  2. FastAPI() 생성
  3. API 라우트 등록 (/api/*)
  4. 정적 파일 서빙 (frontend/dist)
  5. uvicorn.run(app) → 로컬 :3000 LISTEN
  배포(Vercel)도 같은 app 객체를 사용.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.src.api.routes import router as api_router

# .env 로드 (API 키 등)
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(env_path)

app = FastAPI(title="OpenNadeuli API", version="1.0.0")

# CORS — 프런트엔드 개발 서버에서 호출 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우트
app.include_router(api_router)

# 정적 파일 서빙 (프런트 빌드 산출물)
_DIST = Path(__file__).resolve().parent / "frontend" / "dist"
if _DIST.exists():
    app.mount("/", StaticFiles(directory=str(_DIST), html=True), name="static")


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "opennadeuli"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "3000")))
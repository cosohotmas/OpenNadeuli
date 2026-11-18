"""
api/routes.py — FastAPI 라우트

엔드포인트:
  GET  /api/health        서버 상태 확인
  POST /api/course        나들이 코스 추천 요청
  GET  /api/settings      현재 설정 조회
  POST /api/settings      설정 저장
"""

from __future__ import annotations

from typing import Any, Dict, Optional

import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.agent import get_agent, OutingAgent
from ..services.tools import load_settings, save_settings

router = APIRouter()


class CourseRequest(BaseModel):
    text: str
    schedule: Optional[Dict[str, Any]] = None


class SettingsRequest(BaseModel):
    useLive: Optional[bool] = None
    keys: Optional[Dict[str, str]] = None


@router.get("/api/health")
async def health() -> Dict[str, str]:
    """서버 상태 확인."""
    return {"status": "ok", "service": "opennadeuli"}


@router.post("/api/course")
async def course(req: CourseRequest) -> Dict[str, Any]:
    """나들이 코스 추천."""
    agent = get_agent()
    events = []

    def on_status(step):
        events.append({"type": "status", "step": step})

    def on_status_done(step, detail=""):
        events.append({"type": "statusDone", "step": step, "detail": detail})

    def on_tool(call):
        events.append({"type": "tool", "call": call})

    def on_tool_done(step, result):
        events.append({"type": "toolDone", "step": step, "result": result})

    def on_note(text):
        events.append({"type": "note", "text": text})

    def on_answer(answer):
        events.append({"type": "answer", "answer": answer})

    handlers = {
        "onStatus": on_status,
        "onStatusDone": on_status_done,
        "onTool": on_tool,
        "onToolDone": on_tool_done,
        "onNote": on_note,
        "onAnswer": on_answer,
    }

    await agent.handle(req.text, handlers, {"schedule": req.schedule})

    answer_event = next((e for e in events if e["type"] == "answer"), None)
    return {
        "events": events,
        "answer": answer_event["answer"] if answer_event else None,
        "source": agent.source_label(),
    }


@router.get("/api/settings")
async def get_settings() -> Dict[str, Any]:
    """현재 설정 조회."""
    return load_settings()


@router.post("/api/settings")
async def post_settings(req: SettingsRequest) -> Dict[str, Any]:
    """설정 저장. ENABLE_SETTINGS 가 true일 때만 허용한다."""
    if os.environ.get("ENABLE_SETTINGS", "").lower() not in {"1", "true", "yes"}:
        raise HTTPException(status_code=403, detail="Settings are disabled")
    current = load_settings()
    if req.useLive is not None:
        current["useLive"] = req.useLive
    if req.keys is not None:
        current["keys"] = {**current.get("keys", {}), **req.keys}
    save_settings(current)
    return current
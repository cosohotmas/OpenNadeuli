"""
api/routes.py — FastAPI 라우트

엔드포인트:
  GET  /api/health        서버 상태 확인
  POST /api/course        나들이 코스 추천 요청
  GET  /api/settings      현재 설정 조회
  POST /api/settings      설정 저장
"""

from __future__ import annotations

from typing import Any, Dict, Literal, Optional

import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

from ..services.agent import get_agent
from ..services.public_courses import PublicDataUnavailable, public_course
from ..services.tools import load_settings, save_settings

router = APIRouter()


class ScheduleRange(BaseModel):
    s: int = Field(default=0, ge=0, le=23)
    e: int = Field(default=24, ge=1, le=24)

    @model_validator(mode="after")
    def check_order(self):
        if self.s >= self.e:
            raise ValueError("Schedule start must be before end")
        return self


class CourseSchedule(BaseModel):
    tripType: Literal["day", "overnight"] = "day"
    d1: ScheduleRange = Field(default_factory=ScheduleRange)
    d2: ScheduleRange = Field(default_factory=ScheduleRange)
    meal: bool = True
    cafe: bool = True
    hotel: bool = False


class CourseRequest(BaseModel):
    text: str
    schedule: Optional[CourseSchedule] = None
    region: str | None = None
    regionSource: Literal["selected", "location", "location_unavailable"] | None = None
    locationStatus: Literal["denied", "timeout", "region_unknown", "unavailable"] | None = None


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
    if os.getenv("OPENNADEULI_USE_LIVE", "true").strip().lower() not in {"false", "0", "no"}:
        try:
            return await public_course(req.text, (req.schedule or CourseSchedule()).model_dump(), req.region, req.regionSource, req.locationStatus)
        except PublicDataUnavailable:
            raise HTTPException(status_code=503, detail="공공데이터 조회를 완료하지 못했어요.") from None
    agent = get_agent()
    events = []

    def on_status(step):
        events.append({"type": "status", "step": step})

    def on_status_done(step, detail=""):
        events.append({"type": "statusDone", "step": step, "detail": detail})

    def on_tool(call):
        events.append({"type": "tool", "call": call})

    def on_tool_done(step, result):
        events.append({"type": "toolDone", "step": step, "result": {
            **result, "sourceType": "fallback_mock", "fetchedAt": None, "sourceUpdatedAt": None,
            "status": "success" if result["items"] else "empty", "count": len(result["items"]),
        }})

    def on_note(text):
        events.append({"type": "note", "text": text})

    def on_answer(answer):
        answer["intro"] = "시연용 내장 샘플 · " + answer["intro"]
        for card in answer.get("cards", []):
            card.update(sourceType="fallback_mock", fetchedAt=None, sourceUpdatedAt=None, verifiedAttributes=[])
        events.append({"type": "answer", "answer": answer})

    handlers = {
        "onStatus": on_status,
        "onStatusDone": on_status_done,
        "onTool": on_tool,
        "onToolDone": on_tool_done,
        "onNote": on_note,
        "onAnswer": on_answer,
    }

    await agent.handle(req.text, handlers, {"schedule": req.schedule.model_dump() if req.schedule else None})

    answer_event = next((e for e in events if e["type"] == "answer"), None)
    return {
        "events": events,
        "answer": answer_event["answer"] if answer_event else None,
        "source": agent.source_label(),
        "sourceType": "fallback_mock",
    }


def _require_settings_enabled() -> None:
    if os.environ.get("ENABLE_SETTINGS", "").lower() not in {"1", "true", "yes"}:
        raise HTTPException(status_code=403, detail="Settings are disabled")


@router.get("/api/settings")
async def get_settings() -> Dict[str, Any]:
    """현재 설정 조회."""
    _require_settings_enabled()
    return {"useLive": load_settings()["useLive"]}


@router.post("/api/settings")
async def post_settings(req: SettingsRequest) -> Dict[str, Any]:
    """설정 저장. ENABLE_SETTINGS 가 true일 때만 허용한다."""
    _require_settings_enabled()
    current = load_settings()
    if req.useLive is not None:
        current["useLive"] = req.useLive
    if req.keys is not None:
        raise HTTPException(status_code=422, detail="공공데이터 인증키는 서버 환경변수로 설정해 주세요.")
    save_settings(current)
    return {"useLive": current["useLive"]}
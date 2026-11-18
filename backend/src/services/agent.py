"""
services/agent.py — 오픈나들이 AI 에이전트 파이프라인
"""

from typing import Any, Dict, List, Optional

from .nlu import Intent, parse_intent, default_region
from .tools import call_tool, TOOL_SPECS


class OutingAgent:
    """오픈나들이 AI 에이전트 — 코스 추천 파이프라인 오케스트레이터."""

    def __init__(self, settings: Optional[dict] = None):
        self.settings = settings or {}
        self.last_intent: Optional[dict] = None
        self.variants: Dict[str, int] = {}
        self.region_idx = 0

    def set_settings(self, settings: dict) -> None:
        self.settings = settings

    def welcome(self) -> dict:
        """첫 화면 환영 답변."""
        return {
            "type": "greeting",
            "intro": (
                "안녕하세요! 저는 오픈나들이 AI 에이전트예요. "
                "휠체어·보행 약자를 위한 무장애 관광 코스를 추천해 드립니다."
            ),
            "cards": [],
            "summary": [],
            "followups": [
                "부모님 모시고 가기 좋은 부산 바다 데크길 코스",
                "비 오는 날 휠체어로 편한 실내 나들이",
                "평지 위주 맛집+산책 반나절 코스",
                "제주에서 휠체어로 가볼 만한 곳 알려줘",
            ],
        }

    def source_label(self) -> str:
        """헤더 데이터 소스 배지 텍스트."""
        return "내장 샘플 데이터"

    async def handle(self, text: str, handlers: dict, extras: Optional[dict] = None) -> None:
        """사용자 발화 처리."""
        intent = parse_intent(text)
        if intent.greeting:
            handlers["onAnswer"](self.welcome())
            return

        from ..data.sample_data import REGIONS
        region = intent.region or default_region(intent.themes)
        self.region_idx = max(0, REGIONS.index(region))

        from ..data.sample_data import filter_spots
        result = filter_spots({"region": region, "themes": intent.themes, "indoorOnly": intent.indoor_only})

        cards = []
        for i, s in enumerate(result["items"][:5]):
            cards.append({
                "no": i + 1,
                "phase": "추천",
                "name": s.get("title", ""),
                "address": s.get("addr1", ""),
                "emoji": s.get("emoji", "📍"),
                "badges": [],
                "tip": s.get("tip", ""),
            })

        handlers["onAnswer"]({
            "type": "course",
            "intro": f"{region} 지역의 무장애 관광지 {len(cards)}곳을 추천해요.",
            "labels": intent.labels,
            "cards": cards,
            "summary": [],
            "invite": "",
            "route": {"points": []},
            "followups": [
                "다른 코스로 다시 추천해줘",
                "다른 지역 코스 보여줘",
                "비 오는 날 실내 코스로 바꿔줘",
                "식당만 더 보여줘",
            ],
            "meta": {"source": "sample", "region": region, "variant": 0},
        })


# 전역 인스턴스
agent_instance: Optional[OutingAgent] = None


def get_agent(settings: Optional[dict] = None) -> OutingAgent:
    global agent_instance
    if agent_instance is None:
        agent_instance = OutingAgent(settings)
    elif settings:
        agent_instance.set_settings(settings)
    return agent_instance
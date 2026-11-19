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

        from ..data.sample_data import BADGE_DEFS, REGIONS
        region = intent.region or default_region(intent.themes)
        self.region_idx = max(0, REGIONS.index(region))


        args = {"region": region, "themes": intent.themes, "indoorOnly": intent.indoor_only}
        cards = []
        schedule = (extras or {}).get("schedule")

        def lookup(tool_name):
            handlers["onTool"]({"name": tool_name, "args": args})
            result = call_tool(tool_name, args, {"useLive": False})
            handlers["onToolDone"](tool_name, result)
            return result["items"]

        def add_card(item, phase, name_key, address_key, emoji="📍", *, day=None, hour=None):
            badges = [
                BADGE_DEFS[key]["label"] for key, value in item.get("barrier", {}).items()
                if key in BADGE_DEFS and value == "Y"
            ]
            details = {
                label: item[field] for label, field in (
                    ("종목", "cat3name"), ("운영", "usageHour"), ("바닥", "surface"),
                    ("거리", "distance"), ("예상 소요", "duration"), ("관리", "agency"),
                    ("업종", "indsSclsNm"), ("객실", "roomInfo"), ("대여", "rentalInfo"),
                ) if item.get(field)
            }
            if item.get("access", {}).get("stepFree") is True:
                badges.append(BADGE_DEFS["stepFree"]["label"])
                if item["access"].get("memo"):
                    details["출입구"] = item["access"]["memo"]
            if "maxSlope" in item:
                slope = f'최대 {item["maxSlope"]}%'
                badges.append(f'최대 경사도 {item["maxSlope"]}%')
                rating = item.get("slopeRating")
                details["경사"] = f"{slope} ({rating})" if rating else slope
            if item.get("endPoint"):
                details["산책 구간"] = f'{item["startPoint"]} → {item["endPoint"]}'
            for field, label in (("handrail", "안전 난간"), ("restArea", "휴식 공간"),
                                 ("accessibleToilet", "장애인 화장실")):
                if item.get(field) == "Y":
                    details[label] = "있음"
                    if label not in badges:
                        badges.append(label)
                elif item.get(field) == "N":
                    details[label] = "없음"
            cards.append({
                "no": len(cards) + 1,
                "phase": phase,
                "name": item[name_key],
                "address": item.get(address_key, ""),
                "emoji": item.get("emoji", emoji),
                "badges": badges,
                "details": details,
                "tip": item.get("tip", ""),
                **({"day": day, "time": f"{hour:02d}:00"} if hour is not None else {}),
            })

        if schedule:
            # The end of each interval is exclusive.
            windows = [
                ("searchAccessibleTrails", 9, 11, "오전 산책", "parkName", "startPoint", "📍"),
                ("searchStepFreeRestaurants", 11, 14, "점심", "bizesNm", "rdnmAdr", "🍽️"),
                ("searchOpenTouristSpots", 14, 19, "오후 관광", "title", "addr1", "📍"),
                ("searchStayHotels", 17, 18, "숙소", "title", "addr1", "🏨"),
            ]
            allowed_tools = {
                "searchAccessibleTrails": not (intent.indoor_only or intent.spots_list or intent.restaurants_only),
                "searchStepFreeRestaurants": schedule["meal"] and (intent.restaurants_only or not intent.spots_list),
                "searchOpenTouristSpots": not intent.restaurants_only,
                "searchStayHotels": schedule["tripType"] == "overnight" and schedule["hotel"]
                                   and not (intent.spots_list or intent.restaurants_only),
            }
            days = [schedule["d1"]]
            if schedule["tripType"] == "overnight":
                days.append(schedule["d2"])
            results = {}
            for day, hours in enumerate(days, start=1):
                for tool_name, start, end, phase, name_key, address_key, emoji in windows:
                    hour = max(hours["s"], start)
                    if not allowed_tools[tool_name] or hour >= min(hours["e"], end):
                        continue
                    if tool_name == "searchStayHotels" and day != 1:
                        continue
                    if tool_name not in results:
                        items = lookup(tool_name)
                        if tool_name == "searchAccessibleTrails":
                            items = [item for item in items if region in item["agency"]]
                        elif tool_name == "searchStepFreeRestaurants":
                            items = [item for item in items if region in item["rdnmAdr"]
                                     and item.get("access", {}).get("stepFree") is True]
                        elif tool_name == "searchStayHotels":
                            items = [item for item in items if region in item["addr1"]]
                        results[tool_name] = iter(items)
                    limit = 5 if intent.spots_list else (3 if intent.restaurants_only else 1)
                    for _ in range(limit):
                        item = next(results[tool_name], None)
                        if item is None:
                            break
                        add_card(item, phase, name_key, address_key, emoji, day=day, hour=hour)
        else:
            spots = [] if intent.restaurants_only else lookup("searchOpenTouristSpots")
            if intent.spots_list and not intent.restaurants_only:
                for spot in spots[:5]:
                    add_card(spot, "추천", "title", "addr1")
            else:
                restaurants = [
                    item for item in lookup("searchStepFreeRestaurants")
                    if region in item["rdnmAdr"] and item.get("access", {}).get("stepFree") is True
                ]
                if intent.restaurants_only:
                    for restaurant in restaurants[:3]:
                        add_card(restaurant, "식당 추천", "bizesNm", "rdnmAdr", "🍽️")
                else:
                    spot = next(iter(spots), None)
                    trails = [] if intent.indoor_only else [
                        item for item in lookup("searchAccessibleTrails") if region in item["agency"]
                    ]
                    trail = next((item for item in trails if spot and item["subArea"] == spot["subArea"]),
                                 next(iter(trails), None))
                    subareas = {item["subArea"] for item in (spot, trail) if item}
                    restaurant = next((item for item in restaurants if item["subArea"] in subareas),
                                      next(iter(restaurants), None))
                    if spot:
                        add_card(spot, "오전", "title", "addr1")
                    if restaurant:
                        add_card(restaurant, "점심", "bizesNm", "rdnmAdr", "🍽️")
                    if trail:
                        add_card(trail, "오후 산책", "parkName", "startPoint")

        intro = f"{region} 지역에서 방문할 장소 {len(cards)}곳을 추천해요."
        if schedule and not cards:
            intro = f"{region} 지역에서 선택한 시간대와 조건에 맞는 방문지를 찾지 못했어요."

        labels = list(intent.labels)
        if not intent.region:
            labels.insert(0, f"지역 · {region}")
        if schedule:
            labels = [label for label in labels if not label.startswith(("일정 ·", "식사 ·"))]
            labels.append("일정 · 1박 2일" if schedule["tripType"] == "overnight" else "일정 · 당일")
            if schedule["meal"]:
                labels.append("식사 포함")
            if schedule["tripType"] == "overnight" and schedule["hotel"]:
                labels.append("숙소 추천 포함")
        handlers["onAnswer"]({
            "type": "course",
            "intro": intro,
            "labels": labels,
            "cards": cards,
            "summary": [f'{card["name"]} · {", ".join(card["badges"])}' for card in cards if card["badges"]],
            "invite": "",
            "route": {"points": cards},
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
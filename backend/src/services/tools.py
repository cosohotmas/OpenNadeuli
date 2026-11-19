"""
tools.py — 에이전트 도구 계층
"""

from typing import Any, Dict, List, Optional

AREA_CODE = {
    "서울": "1", "부산": "6", "제주": "5", "강원": "32", "인천": "2",
    "경남": "36", "경북": "35",
}

TOOL_SPECS = [
    {"name": "searchOpenTouristSpots", "label": "열린관광지", "icon": "🏛️",
     "description": "무장애 관광지 검색", "parameters": {"type": "object", "properties": {}, "required": []}},
    {"name": "searchAccessibleTrails", "label": "무장애 탐방로", "icon": "🌲",
     "description": "경사도 8% 이하 탐방로 검색", "parameters": {"type": "object", "properties": {}, "required": []}},
    {"name": "searchStayHotels", "label": "무장애 숙박", "icon": "🏨",
     "description": "무장애 숙소 검색", "parameters": {"type": "object", "properties": {}, "required": []}},
    {"name": "searchStepFreeRestaurants", "label": "턱 없는 식당", "icon": "🍚",
     "description": "출입구 턱 없는 식당 검색", "parameters": {"type": "object", "properties": {}, "required": []}},
]

LIVE_APIS = {
    "searchOpenTouristSpots": {"url": "https://apis.data.go.kr/B551011/KorWithService2/areaBasedList2"},
    "searchAccessibleTrails": {"url": ""},
    "searchStayHotels": {"url": "https://apis.data.go.kr/B551011/KorWithService2/areaBasedList2"},
    "searchStepFreeRestaurants": {"url": "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius"},
}

DEFAULT_SETTINGS = {
    "useLive": False,
    "keys": {
        "searchOpenTouristSpots": "",
        "searchAccessibleTrails": "",
        "searchStepFreeRestaurants": "",
        "mapKakao": "",
    },
}


def load_settings() -> dict:
    import os
    s = {**DEFAULT_SETTINGS, "keys": dict(DEFAULT_SETTINGS["keys"])}
    for key_name in s["keys"]:
        env_val = os.environ.get(f"OPENNADEULI_{key_name.upper()}")
        if env_val:
            s["keys"][key_name] = env_val
    s["useLive"] = os.environ.get("OPENNADEULI_USE_LIVE", "true").strip().lower() not in {"false", "0", "no"}
    return s


def save_settings(s: dict) -> None:
    import os
    for key_name, val in s.get("keys", {}).items():
        os.environ[f"OPENNADEULI_{key_name.upper()}"] = str(val)
    os.environ["OPENNADEULI_USE_LIVE"] = "true" if s.get("useLive") else "false"


def call_tool(name: str, args: dict, settings: Optional[dict] = None) -> dict:
    spec_map = {t["name"]: t for t in TOOL_SPECS}
    if name not in spec_map:
        raise ValueError(f"알 수 없는 도구: {name}")

    settings = settings or load_settings()
    live = _try_live(spec_map[name], args, settings)
    if live and live.get("ok"):
        return {"tool": spec_map[name], "args": args, "source": "live",
                "items": live.get("items", []), "excluded": [], "note": live.get("note", "")}

    from ..data.sample_data import filter_spots, filter_trails, filter_hotels, filter_restaurants

    if name == "searchOpenTouristSpots":
        filtered = filter_spots(args)
    elif name == "searchAccessibleTrails":
        filtered = filter_trails(args)
    elif name == "searchStayHotels":
        filtered = filter_hotels(args)
    else:
        filtered = filter_restaurants(args)

    return {
        "tool": spec_map[name], "args": args, "source": "sample",
        "items": filtered.get("items", []), "excluded": filtered.get("excluded", []),
        "note": filtered.get("regionNote"),
    }


def _try_live(spec: dict, args: dict, settings: dict) -> Optional[dict]:
    if not settings.get("useLive"):
        return None
    key = (settings.get("keys", {}).get(spec["name"], "") or "").strip()
    if not key:
        return None
    conf = LIVE_APIS.get(spec["name"])
    if not conf or not conf.get("url"):
        return {"ok": False, "note": "엔드포인트 미설정 → 내장 데이터 전환"}

    import httpx
    area_code = AREA_CODE.get(args.get("region", ""), "")
    params = {
        "serviceKey": key, "numOfRows": "20", "pageNo": "1",
        "MobileOS": "ETC", "MobileApp": "OpenNatri",
        "areaCode": area_code, "_type": "json",
    }
    if spec["name"] == "searchStayHotels":
        params["contentTypeId"] = "32"
    if spec["name"] == "searchStepFreeRestaurants":
        params = {"serviceKey": key, "numOfRows": "20", "pageNo": "1",
                  "radius": "600", "cx": args.get("cx", ""), "cy": args.get("cy", ""), "type": "json"}

    try:
        with httpx.Client(timeout=9.0) as client:
            resp = client.get(conf["url"], params=params)
            if resp.status_code != 200:
                return {"ok": False, "note": f"HTTP {resp.status_code} → 내장 데이터 전환"}
            data = resp.json()
            items = _map_response(spec["name"], data, args)
            return {"ok": True, "items": items, "excluded": [],
                    "note": f"실시간 공공데이터 {len(items)}건"}
    except (httpx.HTTPError, ValueError) as exc:
        import logging
        logging.getLogger(__name__).warning("자료 조회 실패: %s", type(exc).__name__)
        return {"ok": False, "note": "공공데이터 조회 실패 → 내장 데이터 전환"}


def _map_response(tool_name: str, json_data: dict, args: dict) -> List[dict]:
    items_raw = json_data.get("response", {}).get("body", {}).get("items", {}).get("item", [])
    if not isinstance(items_raw, list):
        items_raw = [items_raw] if items_raw else []
    region = args.get("region", "")
    results = []
    for r in items_raw:
        addr1 = r.get("addr1", "") or ""
        if region and region not in addr1:
            continue
        results.append({
            "contentid": r.get("contentid", ""), "contenttypeid": r.get("contenttypeid", ""),
            "title": r.get("title", "(제목 미상)"), "addr1": addr1,
            "areacode": r.get("areacode", ""), "cat3name": "무장애여행 공공데이터",
            "kind": "outdoor", "themes": [],
            "subArea": (addr1.split(" ")[1] if len(addr1.split(" ")) > 1 else ""),
            "emoji": "📍", "barrier": {}, "liveUnverified": True,
            "xswftm": r.get("mapx", ""), "yswftm": r.get("mapy", ""),
            "usageHour": "",
            "tip": "공공데이터 검색 결과예요. 상세 검증 후 배지를 갱신해요.",
        })
    return results
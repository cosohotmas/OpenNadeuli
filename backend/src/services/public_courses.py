"""Build courses from official records without inferring accessibility."""
from __future__ import annotations

import asyncio
import logging
import os
import ssl
from datetime import datetime, timezone
from urllib.parse import unquote

import httpx
import truststore

from ..data.sample_data import REGION_CENTER
from .nlu import default_region, parse_intent

LOGGER = logging.getLogger(__name__)
TOUR = "https://apis.data.go.kr/B551011/KorWithService2"
SHOPS = "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius"
TOUR_SOURCE = {"provider": "한국관광공사 무장애 여행 정보", "sourceUrl": "https://www.data.go.kr/data/15101897/openapi.do"}
SHOP_SOURCE = {"provider": "소상공인시장진흥공단 상가(상권)정보", "sourceUrl": "https://www.data.go.kr/data/15012005/openapi.do"}
DISTRICTS = {
    "서울": 11, "부산": 26, "대구": 27, "인천": 28, "광주": 29, "대전": 30, "울산": 31,
    "세종": 36, "경기": 41, "충북": 43, "충남": 44, "전남": 46, "경북": 47, "경남": 48,
    "제주": 50, "강원": 51, "전북": 52,
}
TOUR_FIELDS = {
    "wheelchair": "휠체어", "restroom": "화장실", "parking": "주차", "exit": "출입구",
    "elevator": "엘리베이터", "route": "접근로", "room": "객실",
}
NO_DATA = { "정보없음", "정보미제공", "미확인", "-", "null"}



class PublicDataUnavailable(Exception):
    """A source failed or was not configured."""


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def api_key(*names):
    return next((unquote(value.strip()) for name in names if (value := os.getenv(name, "")).strip()), "")


def coordinates(item, lat_key, lng_key):
    try:
        lat, lng = float(item[lat_key]), float(item[lng_key])
        return (lat, lng) if 32 <= lat <= 40 and 123 <= lng <= 134 else (None, None)
    except (KeyError, TypeError, ValueError):
        return None, None


async def read_items(client, url, key, params, *, shop=False):
    if not key:
        raise PublicDataUnavailable("서버 인증키 미설정")
    try:
        response = await client.get(url, params={**params, "serviceKey": key})
        response.raise_for_status()
        payload = response.json()
        envelope = payload if shop else payload["response"]
        header = envelope["header"]
        code = str(header["resultCode"])
        if code not in {"00", "0000", "03", "0003"}:
            raise PublicDataUnavailable("공급자가 조회를 거부했어요.")
        if code in {"03", "0003"}:
            return [], utc_now(), None
        body = envelope["body"]
        items = body["items"] if "items" in body else [] if str(body.get("totalCount")) == "0" else None
        if not shop and isinstance(items, dict):
            items = items.get("item", [])
        if isinstance(items, dict):
            items = [items]
        if items == "":
            items = []
        if not isinstance(items, list) or any(not isinstance(item, dict) for item in items):
            raise ValueError("Invalid items envelope")
        return items, utc_now(), header.get("stdrYm") or body.get("stdrYm")
    except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
        LOGGER.warning("공공데이터 조회 실패: operation=%s error=%s", url.rsplit("/", 1)[-1], type(exc).__name__)
        raise PublicDataUnavailable("공급자 응답을 읽지 못했어요.") from None


def tour_params(region, content_type):
    return {"MobileOS": "ETC", "MobileApp": "OpenNadeuli", "_type": "json",
            "lDongRegnCd": DISTRICTS[region], "contentTypeId": content_type, "numOfRows": 12}


async def tour_candidate(client, row, key, fetched_at, kind):
    attributes = []
    detail_at = None
    try:
        details, detail_at, _ = await read_items(client, f"{TOUR}/detailWithTour2", key, {
            "MobileOS": "ETC", "MobileApp": "OpenNadeuli", "_type": "json", "contentId": row["contentid"],
        })
    except (PublicDataUnavailable, KeyError):
        details = []
    for item in details[:1]:
        for field, label in TOUR_FIELDS.items():
            value = str(item.get(field) or "").strip()
            if value and value.replace(" ", "").lower() not in NO_DATA:
                attributes.append({"label": label, "value": value, "field": field})
    lat, lng = coordinates(row, "mapy", "mapx")
    notice = ("객실·욕실 구조, 휠체어 이용 가능 객실 및 운영 여부를 확인해 주세요."
              if kind == "숙박" else "입구 단차, 운영시간과 필요한 편의시설의 현재 상태를 확인해 주세요.")
    return {
        "name": row["title"], "address": row.get("addr1") or "", "kind": kind,
        "emoji": "🏨" if kind == "숙박" else "📍", "lat": lat, "lng": lng,
        "sourceType": "live_api", **TOUR_SOURCE, "fetchedAt": fetched_at,
        "sourceUpdatedAt": row.get("modifiedtime") or None, "accessibilityFetchedAt": detail_at,
        "verifiedAttributes": attributes, "verificationNotice": notice,
    }


async def public_course(text, schedule):
    intent = parse_intent(text)
    region = intent.region or default_region(intent.themes)
    events = []
    cards = []
    tour_key = api_key("OPENNADEULI_SEARCHOPENTOURISTSPOTS", "KorWithS_Key")
    shop_key = api_key("OPENNADEULI_SEARCHSTEPFREERESTAURANTS", "SdsC_Key")
    hotel_key = api_key("OPENNADEULI_SEARCHSTAYHOTELS") or tour_key
    overnight = schedule["tripType"] == "overnight"
    days = [schedule["d1"], schedule["d2"]] if overnight else [schedule["d1"]]
    tool_results = []
    followups = [f"{region} 비 오는 날 실내 코스", f"{region}에서 식당만 보여줘",
                 f"{region}에서 카페만 보여줘"]
    if intent.greeting:
        return {"answer": {"type": "greeting", "intro": "지역과 원하는 활동을 알려 주시면 공공데이터를 조회해요.",
                           "labels": [], "cards": [], "summary": [], "route": {"points": []},
                           "invite": "", "followups": followups}, "events": [], "sourceType": None}

    def log_tool(name, args, status, source, fetched=None, updated=None, count=0, note=None):
        outcome = {"status": status, "sourceType": "live_api" if source else None,
                   "fetchedAt": fetched, "sourceUpdatedAt": updated, "count": count,
                   **(source or {}), "note": note}
        tool_results.append(outcome)
        events.extend([
            {"type": "tool", "call": {"name": name, "args": args}},
            {"type": "toolDone", "step": name, "result": outcome},
        ])

    events.append({"type": "status", "step": "요청 분석", "detail": f"{region} · {'1박 2일' if overnight else '당일'}"})
    if not intent.restaurants_only:
        log_tool("searchAccessibleTrails", {"region": region}, "skipped", None,
                 note="공식 최대 경사도 원본이 확정되지 않아 탐방로를 제외했어요.")
    needs_meal = intent.restaurants_only or (schedule["meal"] and any(d["s"] < 14 and d["e"] > 11 for d in days))
    needs_cafe = (intent.restaurants_only and "카페만" in text
                  or not intent.restaurants_only and schedule["cafe"]
                  and any(d["s"] < 17 and d["e"] > 13 for d in days))
    needs_hotel = overnight and schedule["hotel"] and not intent.restaurants_only and days[0]["e"] > 17
    wants_spots = not intent.restaurants_only and (intent.spots_list or any(d["s"] < 19 and d["e"] > 9 for d in days))
    needs_shops = (needs_meal or needs_cafe) and not intent.spots_list
    tls_context = ssl.create_default_context(cafile=os.environ["SSL_CERT_FILE"]) if os.getenv("SSL_CERT_FILE") else truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)

    async with httpx.AsyncClient(verify=tls_context, timeout=httpx.Timeout(5.0), follow_redirects=False) as client:
        async def tourism(name, type_id, key, kind, limit):
            args = {"region": region, "contentTypeId": type_id}
            try:
                rows, fetched, _ = await read_items(client, f"{TOUR}/areaBasedList2", key, tour_params(region, type_id))
            except PublicDataUnavailable as exc:
                log_tool(name, args, "unavailable", TOUR_SOURCE, note=str(exc))
                return []
            rows = [row for row in rows if row.get("title") and str(row.get("contenttypeid")) == str(type_id)][:limit]
            enriched = await asyncio.gather(*(tour_candidate(client, row, key, fetched, kind) for row in rows))
            log_tool(name, args, "success" if enriched else "empty", TOUR_SOURCE, fetched, count=len(enriched),
                     note="목록과 무장애 상세에 기재된 항목을 표시해요."
                     if any(row["accessibilityFetchedAt"] for row in enriched) else "무장애 상세 확인값이 없으면 현장 확인이 필요해요.")
            return enriched

        async def shops(anchor):
            args = {"region": region, "radius": 600}
            if not anchor:
                log_tool("searchNearbyRestaurants", args, "skipped", SHOP_SOURCE,
                         note="반경 검색에 사용할 관광지 또는 지역 기준 좌표가 없어요.")
                return [], []
            lat, lng, name = anchor
            args.update({"anchor": name, "latitude": lat, "longitude": lng})
            try:
                rows, fetched, updated = await read_items(client, SHOPS, shop_key, {
                    "radius": 600, "cx": lng, "cy": lat, "indsLclsCd": "I2", "type": "json", "numOfRows": 50,
                }, shop=True)
            except PublicDataUnavailable as exc:
                log_tool("searchNearbyRestaurants", args, "unavailable", SHOP_SOURCE, note=str(exc))
                return [], []
            meals, cafes, seen = [], [], set()
            for row in rows:
                if row.get("indsLclsCd") != "I2" or not row.get("bizesNm"):
                    continue
                name = row["bizesNm"]
                branch = row.get("brchNm")
                if branch and branch not in name:
                    name = f"{name} {branch}"
                address = row.get("rdnmAdr") or row.get("lnoAdr") or ""
                identity = row.get("bizesId") or (name, address)
                if identity in seen:
                    continue
                seen.add(identity)
                category = str(row.get("indsSclsNm") or "")
                is_cafe = any(word in category for word in ("카페", "커피"))
                latitude, longitude = coordinates(row, "lat", "lon")
                (cafes if is_cafe else meals).append({
                    "name": name, "address": address, "kind": "카페" if is_cafe else "식당",
                    "emoji": "☕" if is_cafe else "🍽️", "lat": latitude, "lng": longitude,
                    "sourceType": "live_api", **SHOP_SOURCE, "fetchedAt": fetched,
                    "sourceUpdatedAt": updated, "verifiedAttributes": [],
                    "verificationNotice": "출입구 턱, 휠체어 좌석, 화장실과 영업 여부를 확인해 주세요.",
                    "details": {"업종": category} if category else {},
                })
            count = (len(meals) if needs_meal and "카페만" not in text else 0) + (len(cafes) if needs_cafe else 0)
            log_tool("searchNearbyRestaurants", args, "success" if count else "empty", SHOP_SOURCE, fetched, updated, count,
                     "상권 업종을 확인했어요. 출입구 턱과 편의시설 정보는 제공되지 않아요.")
            return meals, cafes

        async def attractions():
            candidates = await tourism("searchOpenTouristSpots", 14 if intent.indoor_only else 12, tour_key,
                                       "문화시설" if intent.indoor_only else "관광지", 6 if intent.spots_list else 4)
            anchor = next(((p["lat"], p["lng"], p["name"]) for p in candidates if p["lat"] is not None), None)
            return candidates, anchor

        async def lodging():
            return await tourism("searchStayHotels", 32, hotel_key, "숙박", 2) if needs_hotel else []

        async def places_and_food():
            places, anchor = await attractions() if wants_spots else ([], None)
            if not anchor and (center := REGION_CENTER.get(region)):
                anchor = (float(center["y"]), float(center["x"]), f"{region} 지역 기준점")
            meals, cafes = await shops(anchor) if needs_shops else ([], [])
            return places, meals, cafes

        (places, meals, cafes), hotels = await asyncio.gather(places_and_food(), lodging())

    successful = any(result["status"] in {"success", "empty"} for result in tool_results)
    if not successful and any(result["status"] == "unavailable" for result in tool_results):
        raise PublicDataUnavailable("공공데이터 조회를 완료하지 못했어요.")

    def add(candidate, phase, day=None, hour=None):
        if not candidate:
            return
        card = {**candidate, "no": len(cards) + 1, "phase": phase, "badges": [],
                "tip": "", "day": day, "time": f"{hour:02d}:00" if hour is not None else None}
        cards.append(card)

    if intent.restaurants_only:
        candidates = cafes if "카페만" in text else meals
        for candidate in candidates[:4]:
            add(candidate, "후보")
    elif intent.spots_list:
        for candidate in places[:6]:
            add(candidate, "후보")
    else:
        for day, hours in enumerate(days, 1):
            start, end = hours["s"], hours["e"]
            slots = []
            if places and max(9, start) < min(end, 19):
                slots.append((max(9, start), places.pop(0), "관광"))
            if needs_meal and meals and max(11, start) < min(14, end):
                slots.append((max(11, start), meals.pop(0), "식사"))
            if needs_cafe and cafes and max(14, start) < min(17, end):
                slots.append((max(14, start), cafes.pop(0), "카페"))
            if day == 1 and hotels and max(17, start) < end:
                slots.append((max(17, start), hotels[0], "숙소"))
            occupied = start - 1
            for hour, candidate, phase in sorted(slots, key=lambda slot: slot[0]):
                hour = max(hour, occupied + 1)
                if hour >= end or (phase == "식사" and hour >= 14) or (phase == "카페" and hour >= 17):
                    continue
                add(candidate, phase, day, hour)
                occupied = hour

    points = [{**c, "query": c["address"] or c["name"], "queryAlt": c["name"],
               "barrier": [f'{v["label"]} · {v["value"]}' for v in c["verifiedAttributes"]] +
                          [f'현장·유선 확인 권장 · {c["verificationNotice"]}']} for c in cards]
    summary = [f'{card["name"]} · {card["verificationNotice"]}' for card in cards]
    invite = "\n".join([f"[오픈나들이] {region} 방문 후보"] + [
        f'{point["no"]}. {point["day"] or ""}{("일차 " + point["time"] + " · ") if point["time"] else ""}'
        f'{point["name"]} — {point["address"]}\n   ' + " / ".join(point["barrier"])
        for point in points
    ]) if cards else ""
    intro = (f"{region} 공공데이터 방문 후보 {len(cards)}곳이에요. 시간은 일정 제안이며 실제 운영시간과 이동 시간은 확인해 주세요."
             if cards else f"{region}에서 조건에 맞는 결과가 없어요.")
    if any(result["status"] == "unavailable" for result in tool_results):
        intro += " 일부 공공데이터는 조회하지 못했어요."
    answer = {"type": "course", "intro": intro, "labels": intent.labels, "cards": cards,
              "summary": summary, "route": {"points": points}, "invite": invite, "followups": followups}
    return {"answer": answer, "events": events + [{"type": "answer", "answer": answer}],
            "sourceType": "live_api" if successful else None}

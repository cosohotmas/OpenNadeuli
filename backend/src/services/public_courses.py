"""Build courses from official records without inferring accessibility."""
from __future__ import annotations

import asyncio
import logging
import os
import re
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


SHOP_EXCLUDED = re.compile(r"콜라텍|유흥|단란주점|호프|노래방|부동산|공인중개|매매점|중개사무소|출장뷔페")
ACCESS_MARKERS = {
    "exit": r"턱이? 없|무단차|휠체어 접근 가능",
    "route": r"턱이? 없|무단차|휠체어 접근 가능|경사로가? 있",
    "restroom": r"장애인.*(?:있|설치|구비|이용 가능)",
    "parking": r"장애인.*(?:있|설치|구비|이용 가능|주차구역|주차장)",
    "wheelchair": r"대여.*(?:가능|있)|휠체어.*(?:구비|비치)",
    "elevator": r"(?:엘리베이터|승강기).*(?:있|설치|이용 가능)",
    "room": r"(?:장애인|휠체어).*(?:있|구비|이용 가능)",
}
ACCESS_LIMITATION = re.compile(r"불가|미설치|미구비|않|없|제한|어려")
STEP_FREE = re.compile(r"(?:단차|턱)이?\s*(?:없음|없습니다|없어|없으므로)")


def shop_kind(row):
    if row.get("indsLclsCd") != "I2" or not row.get("bizesNm"):
        return None
    name = " ".join(str(row.get(key) or "") for key in (
        "bizesNm", "brchNm", "indsMclsNm", "indsSclsNm", "ksicNm",
    ))
    if SHOP_EXCLUDED.search(re.sub(r"\s+", "", name)):
        return None
    code = str(row.get("ksicCd") or "").upper().removeprefix("I")
    if code.startswith("5622") or code == "56191":
        return "카페"
    if code.startswith("561"):
        return "식당"
    if not code:
        category = str(row.get("indsSclsNm") or "")
        if re.search(r"카페|커피|제과점|베이커리|빵집", category):
            return "카페"
        if re.search(r"음식점|식당|한식|중식|일식|양식|분식|김밥|만두|피자|치킨|햄버거", category):
            return "식당"
    return None


def confirmed_attributes(attributes):
    confirmed = []
    for attribute in attributes:
        value = attribute["value"]
        marker = ACCESS_MARKERS.get(attribute["field"])
        if marker and re.search(marker, value) and not ACCESS_LIMITATION.search(STEP_FREE.sub("", value)):
            confirmed.append(attribute)
    return confirmed


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
            value = re.sub(r"_+\s*무장애\s*편의시설\s*$", "", str(item.get(field) or "").strip())
            value = value.replace("_", " ").strip()
            if value and value.replace(" ", "").lower() not in NO_DATA:
                attributes.append({"label": label, "value": value, "field": field})
    lat, lng = coordinates(row, "mapy", "mapx")
    fields = {attribute["field"] for attribute in attributes}
    unknown = []
    if not fields.intersection({"exit", "route"}):
        unknown.append("입구 단차")
    if kind == "숙박" and "room" not in fields:
        unknown.append("휠체어 이용 객실·욕실 구조")
    notice = ", ".join(unknown) + " 확인" if unknown else ""
    return {
        "name": row["title"], "address": row.get("addr1") or "", "kind": kind,
        "emoji": "🏨" if kind == "숙박" else "📍", "lat": lat, "lng": lng,
        "sourceType": "live_api", **TOUR_SOURCE, "fetchedAt": fetched_at,
        "sourceUpdatedAt": row.get("modifiedtime") or None, "accessibilityFetchedAt": detail_at,
        "verifiedAttributes": attributes, "confirmedAttributes": confirmed_attributes(attributes),
        "verificationNotice": notice,
    }


# Window bounds and preferred times are minutes since midnight.
VISIT_WINDOWS = (
    ("관광", 540, 690, 540, None),
    ("점심", 660, 840, 690, "meal"),
    ("관광", 750, 930, 810, None),
    ("카페", 840, 1020, 930, "cafe"),
    ("관광", 960, 1140, 1020, None),
    ("저녁", 1020, 1230, 1110, "meal"),
    ("숙소", 1050, 1440, 1200, "hotel"),
)


def visit_slots(hours, schedule, day):
    start, end = hours["s"] * 60, hours["e"] * 60
    slots = []
    for phase, opens, closes, preferred, option in VISIT_WINDOWS:
        if (option and not schedule[option]) or (phase == "숙소" and day != 1):
            continue
        first, last = max(start, opens), min(end, closes)
        if first < last:
            minute = max(first, min(preferred, last - 30))
            slots.append((minute, phase, last))
    return sorted(slots, key=lambda slot: slot[0])


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
    day_slots = [visit_slots(hours, schedule, day if overnight else 0)
                 for day, hours in enumerate(days, 1)]
    phases = [phase for slots in day_slots for _, phase, _ in slots]
    spot_limit = 6 if intent.spots_list else phases.count("관광")
    needs_meal = intent.restaurants_only or any(phase in phases for phase in ("점심", "저녁"))
    needs_cafe = "카페만" in text if intent.restaurants_only else "카페" in phases
    needs_hotel = "숙소" in phases and not (intent.restaurants_only or intent.spots_list)
    wants_spots = not intent.restaurants_only and (intent.spots_list or "관광" in phases)
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
                kind = shop_kind(row)
                if not kind:
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
                is_cafe = kind == "카페"
                latitude, longitude = coordinates(row, "lat", "lon")
                (cafes if is_cafe else meals).append({
                    "name": name, "address": address, "kind": "카페" if is_cafe else "식당",
                    "emoji": "☕" if is_cafe else "🍽️", "lat": latitude, "lng": longitude,
                    "sourceType": "live_api", **SHOP_SOURCE, "fetchedAt": fetched,
                    "sourceUpdatedAt": updated, "verifiedAttributes": [],
                    "verificationNotice": "출입구 턱, 휠체어 좌석, 화장실과 영업 여부를 확인해 주세요.",
                    "details": {"업종": category} if category else {}, "_shopId": identity,
                })
            count = (len(meals) if needs_meal and "카페만" not in text else 0) + (len(cafes) if needs_cafe else 0)
            log_tool("searchNearbyRestaurants", args, "success" if count else "empty", SHOP_SOURCE, fetched, updated, count,
                     "상권 업종을 확인했어요. 출입구 턱과 편의시설 정보는 제공되지 않아요.")
            return meals, cafes

        async def attractions():
            candidates = await tourism("searchOpenTouristSpots", 14 if intent.indoor_only else 12, tour_key,
                                       "문화시설" if intent.indoor_only else "관광지", spot_limit)
            return candidates

        async def lodging():
            return await tourism("searchStayHotels", 32, hotel_key, "숙박", 2) if needs_hotel else []

        async def places_and_food():
            places = await attractions() if wants_spots else []
            anchors = list(dict.fromkeys((p["lat"], p["lng"], p["name"])
                                        for p in places if p["lat"] is not None and p["lng"] is not None))
            if not anchors and (center := REGION_CENTER.get(region)):
                anchors = [(float(center["y"]), float(center["x"]), f"{region} 지역 기준점")]
            pools = await asyncio.gather(*(shops(anchor) for anchor in anchors or [None])) if needs_shops else []
            return places, dict(zip(anchors, pools))

        (places, nearby), hotels = await asyncio.gather(places_and_food(), lodging())

    successful = any(result["status"] in {"success", "empty"} for result in tool_results)
    if not successful and any(result["status"] == "unavailable" for result in tool_results):
        raise PublicDataUnavailable("공공데이터 조회를 완료하지 못했어요.")

    def add(candidate, phase, day=None, hour=None):
        if not candidate:
            return
        card = {**candidate, "no": len(cards) + 1, "phase": phase, "badges": [],
                "tip": "", "day": day, "time": f"{hour // 60:02d}:{hour % 60:02d}" if hour is not None else None}
        cards.append(card)

    used_shops = set()

    def take_shop(phase, anchor=None):
        index = int(phase == "카페")
        pools = [nearby[anchor]] if anchor in nearby else nearby.values()
        for pool in pools:
            for candidate in pool[index]:
                identity = candidate["_shopId"]
                if identity not in used_shops:
                    used_shops.add(identity)
                    return {key: value for key, value in candidate.items() if key != "_shopId"}
        return None

    if intent.restaurants_only:
        for _ in range(4):
            add(take_shop("카페" if "카페만" in text else "식사"), "후보")
    elif intent.spots_list:
        for candidate in places[:6]:
            add(candidate, "후보")
    else:
        for day, slots in enumerate(day_slots, 1):
            occupied = -60
            anchor = None
            for minute, phase, closes in slots:
                minute = max(minute, occupied + 60)
                if minute >= closes:
                    continue
                if phase == "관광":
                    candidate = places.pop(0) if places else None
                    if candidate:
                        anchor = (candidate["lat"], candidate["lng"], candidate["name"])
                elif phase == "숙소":
                    candidate = hotels[0] if hotels else None
                else:
                    candidate = take_shop(phase, anchor)
                if candidate:
                    add(candidate, phase, day, minute)
                    occupied = minute

    points = [{**c, "query": c["address"] or c["name"], "queryAlt": c["name"],
               "barrier": [f'{v["label"]} · {v["value"]}' for v in c["verifiedAttributes"]] +
                          ([f'현장·유선 확인 권장 · {c["verificationNotice"]}'] if c["verificationNotice"] else [])} for c in cards]
    summary = [
        f'{card["name"]} · ' + " / ".join(f'{v["label"]}: {v["value"]}' for v in card["confirmedAttributes"])
        for card in cards if card.get("confirmedAttributes")
    ]
    pending = {}
    for card in cards:
        if card["verificationNotice"]:
            notice = ("방문 전 출입구·영업 확인 권장" if card["kind"] in {"식당", "카페"}
                      else card["verificationNotice"])
            pending.setdefault(notice, []).append(card["name"])
    visit_notes = [f'{", ".join(names)} · {notice}' for notice, names in pending.items()]
    invite_lines = [f"💌 오픈나들이 · {region} 가족 일정"]
    last_day = None
    for card in cards:
        if card["day"] is not None and card["day"] != last_day:
            last_day = card["day"]
            invite_lines.extend(["", f"{last_day}일차"])
        invite_lines.append(f'{card["time"] or "•"} {card["name"]} · {card["address"]}'.rstrip(" ·"))
        if details := card.get("confirmedAttributes"):
            invite_lines.append("✅ 확인된 무장애 항목 · " + " / ".join(v["label"] for v in details))
        if card["kind"] in {"식당", "카페"}:
            invite_lines.append("📞 방문 전 출입구·영업 확인 권장")
        elif card["verificationNotice"]:
            invite_lines.append(f'📞 {card["verificationNotice"]}')
    invite = "\n".join(invite_lines) if cards else ""
    intro = (f"{region} 공공데이터 방문 후보 {len(cards)}곳이에요. 시간은 일정 제안이며 실제 운영시간과 이동 시간은 확인해 주세요."
             if cards else f"{region}에서 조건에 맞는 결과가 없어요.")
    if any(result["status"] == "unavailable" for result in tool_results):
        intro += " 일부 공공데이터는 조회하지 못했어요."
    answer = {"type": "course", "intro": intro, "labels": intent.labels, "cards": cards,
              "summary": summary, "visitNotes": visit_notes, "route": {"points": points}, "invite": invite, "followups": followups}
    return {"answer": answer, "events": events + [{"type": "answer", "answer": answer}],
            "sourceType": "live_api" if successful else None}

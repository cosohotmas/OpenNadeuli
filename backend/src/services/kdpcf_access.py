"""Korea Social Security Information Service accessibility register."""
import asyncio
import math
import re
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

import httpx

BASE = "https://apis.data.go.kr/B554287/DisabledPersonConvenientFacility"
SOURCE = {
    "provider": "한국사회보장정보원 장애인편의시설 현황",
    "sourceUrl": "https://www.data.go.kr/data/15092317/openapi.do",
}
FACILITIES = {
    "승강기", "장애인사용가능화장실", "장애인전용주차구역", "주출입구높이차이제거",
    "주출입구접근로", "주출입구(문)",
}
USEFUL_STOPS = {"승강기", "장애인사용가능화장실"}
ROAD = re.compile(r"([가-힣A-Za-z0-9·.]+(?:대로|로|길))\s*(\d+(?:-\d+)?)")


class FacilityUnavailable(Exception):
    pass


def name_key(value):
    return re.sub(r"\s+", "", value or "").casefold()


def address_key(value):
    match = ROAD.search(value or "")
    if not match:
        return None
    # Disregard building/floor suffixes, but retain the district and street number.
    area = re.sub(r"(특별자치시|특별자치도|광역시|특별시)(?=\s)", "", value[:match.start()].strip())
    return name_key(area), match[1], match[2]


def coordinate(value, minimum, maximum):
    try:
        number = float(value)
        return number if minimum <= number <= maximum else None
    except (TypeError, ValueError):
        return None


def parse_xml(raw):
    if b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper() or len(raw) > 1_000_000:
        raise FacilityUnavailable("허용하지 않는 공급자 응답")
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        raise FacilityUnavailable("공급자 XML을 읽지 못했어요.") from None
    for node in root.iter():
        node.tag = node.tag.rsplit("}", 1)[-1]
    code = (root.findtext(".//resultCode") or "").strip()
    if code in {"03", "0003"}:
        return []
    if code not in {"0", "00", "0000"}:
        raise FacilityUnavailable("공급자 조회 거부 또는 결과코드 누락")
    return [{child.tag: (child.text or "").strip() for child in node}
            for node in root.iter() if node.find("faclNm") is not None
            and (node.find("wfcltId") is not None or node.find("srvInstId") is not None)]


def facility_record(row):
    identifier, name = row.get("wfcltId"), row.get("faclNm")
    if not identifier or not name or row.get("salStaDivCd") == "N":
        return None
    return {"id": identifier, "name": name, "address": row.get("lcMnad", ""),
            "lat": coordinate(row.get("faclLat"), 32, 40), "lng": coordinate(row.get("faclLng"), 123, 134)}


def distance(record, place):
    if any(x is None for x in (record["lat"], record["lng"], place.get("lat"), place.get("lng"))):
        return math.inf
    latitude = math.radians((record["lat"] + place["lat"]) / 2)
    return 111_195 * math.hypot(record["lat"] - place["lat"],
                               (record["lng"] - place["lng"]) * math.cos(latitude))


async def enrich_facilities(client, endpoint, key, cards):
    if endpoint.rstrip("/") != BASE or not key:
        return [], None, "서버 인증키 또는 엔드포인트 미설정"
    hotels = [card for card in cards if card["kind"] == "숙박"]
    roads = {}
    for card in cards:
        address = card["address"]
        match = ROAD.search(address)
        area = address[:match.start()].split() if match else []
        if area:
            province = area[0]
            district = next((part for part in reversed(area[1:]) if part.endswith(("시", "군", "구"))), None)
            query = {"siDoNm": province, "roadNm": match[1]}
            if district:
                query["cggNm"] = district
            roads.setdefault((province, district, match[1]), query)
    queries = [{"faclNm": card["name"]} for card in hotels] + list(roads.values())[:8]
    if not queries:
        return [], None, "조회할 숙소명·도로명 없음"

    async def read(operation, params):
        try:
            response = await client.get(f"{BASE}/{operation}", params={**params, "serviceKey": key}, timeout=4.5)
            response.raise_for_status()
            return parse_xml(response.content)
        except httpx.HTTPError as exc:
            raise FacilityUnavailable(type(exc).__name__) from None

    pages = await asyncio.gather(*(read("getDisConvFaclList", {"pageNo": 1, "numOfRows": 100, **query})
                                   for query in queries), return_exceptions=True)
    if all(isinstance(page, Exception) for page in pages):
        return [], None, "시설 목록을 조회하지 못했어요."
    candidates = {}
    for page in pages:
        if isinstance(page, list):
            for row in page:
                if record := facility_record(row):
                    candidates[record["id"]] = record

    lodging = {}
    for card in hotels:
        address = address_key(card["address"])
        matches = [r for r in candidates.values() if address and address_key(r["address"]) == address
                   and name_key(r["name"]) == name_key(card["name"])]
        if len(matches) == 1:
            lodging[matches[0]["id"]] = card
    nearby = []
    for record in candidates.values():
        if record["id"] in lodging or any(address_key(record["address"]) and
                address_key(record["address"]) == address_key(card["address"]) for card in cards):
            continue
        meters = min(distance(record, card) for card in cards)
        if meters <= 400:
            nearby.append((meters, record["id"]))
    nearby = sorted(nearby)[:6]
    ids = [*lodging, *(identifier for _, identifier in nearby)]
    details = await asyncio.gather(*(read("getFacInfoOpenApiJpEvalInfoList", {"wfcltId": identifier})
                                     for identifier in ids), return_exceptions=True)
    confirmed = {}
    fetched = datetime.now(timezone.utc).isoformat(timespec="seconds")
    for identifier, rows in zip(ids, details):
        if not isinstance(rows, list):
            continue
        record = candidates[identifier]
        rows = [row for row in rows if (row.get("srvInstId") or row.get("wfcltId")) == identifier
                and name_key(row.get("faclNm")) == name_key(record["name"])]
        fields = {}
        for row in rows:
            for value in (row.get("evalInfo") or "").split(","):
                if (normalized := name_key(value)) in FACILITIES:
                    fields[normalized] = value.strip()
        if fields:
            confirmed[identifier] = {**record, **SOURCE, "sourceType": "live_api",
                                     "fetchedAt": fetched, "sourceUpdatedAt": None,
                                     "facilities": list(fields.values())}
    for identifier, card in lodging.items():
        if identifier in confirmed:
            card["kdpcfFacility"] = confirmed[identifier]
    stops = [{**confirmed[identifier], "distanceM": round(meters)} for meters, identifier in nearby
             if identifier in confirmed and USEFUL_STOPS.intersection(map(name_key, confirmed[identifier]["facilities"]))]
    partial = any(isinstance(result, Exception) for result in [*pages, *details])
    return stops[:3], fetched, "일부 시설 조회에 실패했어요." if partial else None

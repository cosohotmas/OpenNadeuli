"""Join 부산교통공사 installation records to official station coordinates."""
import math
import re

from ..data.busan_station_coordinates import STATION_COORDINATES

SOURCE = {
    "provider": "부산교통공사 장애인 편의시설 정보",
    "sourceUrl": "https://www.data.go.kr/data/15158993/openapi.do",
}
COORDINATE_SOURCE = "https://data.kric.go.kr/rips/M_01_01/detail.do?id=32"
DISTANCE_LIMIT_M = 600
FACILITIES = {
    "elI": "내부 엘리베이터", "elO": "외부 엘리베이터", "ourbridge": "외부경사로",
    "toilet": "장애인화장실", "wlI": "내부 휠체어리프트", "wlO": "외부 휠체어리프트",
    "helptake": "승차보조대", "es": "에스컬레이터", "blindroad": "시각장애인 유도로",
}


def station_name(value):
    name = str(value or "").split("(")[0].strip()
    return "부산" if name == "부산역" else name


def station_records(rows, fetched_at):
    records = []
    for row in rows:
        code = str(row.get("scode") or "").strip().lstrip("0")
        location = STATION_COORDINATES.get(code)
        if not location:
            continue
        name, line, lat, lng, reference_date = location
        if station_name(name) != station_name(row.get("sname")):
            continue
        facilities = []
        for field, label in FACILITIES.items():
            count = str(row.get(field) or "").strip()
            if re.fullmatch(r"[0-9]+", count) and int(count) > 0:
                facilities.append({"code": field, "label": label, "count": int(count)})
        records.append({
            **SOURCE, "sourceType": "live_api", "fetchedAt": fetched_at,
            "code": code, "name": station_name(name),
            "line": line, "facilities": facilities,
            "lat": lat, "lng": lng,
            "coordinateSourceUrl": COORDINATE_SOURCE,
            "coordinateReferenceDate": reference_date,
        })
    return records


def distance_m(lat, lng, station):
    phi, station_phi = map(math.radians, (lat, station["lat"]))
    delta_lambda = math.radians(station["lng"] - lng)
    a = math.sin((station_phi - phi) / 2)**2 + math.cos(phi) * math.cos(station_phi) * math.sin(delta_lambda / 2)**2
    return 12_742_000 * math.asin(min(1, math.sqrt(a)))


def attach_nearby_stations(cards, stations):
    nearest_by_code = {}
    for card in cards:
        if card["lat"] is None or card["lng"] is None or not stations:
            continue
        distance, station = min(
            ((distance_m(card["lat"], card["lng"], station), station) for station in stations),
            key=lambda entry: entry[0],
        )
        if distance > DISTANCE_LIMIT_M or not station["facilities"]:
            continue
        card["nearbyStation"] = {**station, "distanceM": round(distance)}
        nearest_by_code.setdefault(station["code"], station)
    return list(nearest_by_code.values())

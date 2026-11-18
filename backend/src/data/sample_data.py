"""
data/sample_data.py — 내장 샘플 데이터
"""

REGIONS = ["부산", "서울", "제주", "강원", "인천", "경남", "경북"]

BADGE_DEFS = {
    "rental": {"emoji": "🦽", "label": "휠체어 대여"},
    "toilet": {"emoji": "🚻", "label": "장애인 화장실"},
    "enterable": {"emoji": "♿", "label": "휠체어 진입"},
    "elevator": {"emoji": "🛗", "label": "엘리베이터"},
    "parking": {"emoji": "🅿️", "label": "전용 주차장"},
    "slope8": {"emoji": "⛰️", "label": "경사도 8% 이하"},
    "stepFree": {"emoji": "🚪", "label": "출입구 턱 없음"},
    "unverified": {"emoji": "⚠️", "label": "무장애 정보 현장 확인 필요"},
}

REGION_CENTER = {
    "부산": {"x": "129.1583", "y": "35.1583"},
    "서울": {"x": "126.9241", "y": "37.5216"},
    "제주": {"x": "126.6299", "y": "33.4647"},
    "강원": {"x": "128.8970", "y": "37.7521"},
    "인천": {"x": "126.7056", "y": "37.4564"},
    "경남": {"x": "128.4365", "y": "34.8574"},
    "경북": {"x": "129.3435", "y": "36.0190"},
}

TOURIST_SPOTS = [
    {
        "contentid": "OT6260001",
        "title": "해운대해수욕장 무장애구역",
        "addr1": "부산광역시 해운대구 우동",
        "areacode": "6",
        "sigungucode": "12",
        "cat3name": "해수욕장/해변",
        "kind": "outdoor",
        "themes": ["sea"],
        "subArea": "해운대",
        "emoji": "🏖️",
        "barrier": {"rental": "Y", "toilet": "Y", "enterable": "Y", "parking": "Y"},
        "rentalInfo": "해변 전용 휠체어 무료 대여 10:00~17:00",
        "usageHour": "09:00~19:00",
        "tip": "해변 전용 휠체어로 물가 목데크까지 그대로 진입해요.",
    },
    {
        "contentid": "OT1100001",
        "title": "여의한강공원 무장애구역",
        "addr1": "서울특별시 영등포구 여의동로 330",
        "areacode": "1",
        "sigungucode": "15",
        "cat3name": "공원",
        "kind": "outdoor",
        "themes": ["park"],
        "subArea": "여의도",
        "emoji": "🌳",
        "barrier": {"rental": "Y", "toilet": "Y", "enterable": "Y", "parking": "Y"},
        "usageHour": "24시간",
        "tip": "한강 전망 광장까지 완만한 경사로가 이어져요.",
    },
    {
        "contentid": "OT5000001",
        "title": "협재해수욕장",
        "addr1": "제주특별자치도 제주시 애월읍 협재리",
        "areacode": "5",
        "sigungucode": "1",
        "cat3name": "해수욕장/해변",
        "kind": "outdoor",
        "themes": ["sea"],
        "subArea": "애월/협재",
        "emoji": "🏖️",
        "barrier": {"rental": "Y", "toilet": "Y", "enterable": "Y", "parking": "Y"},
        "usageHour": "연중무휴",
        "tip": "모래 대신 해변 목데크를 따라 가면 바다 앞까지만 이동해요.",
    },
]

TRAILS = [
    {
        "trailId": "TR-BS-01",
        "agency": "부산 해운대구",
        "parkName": "해운대 해변 데크길",
        "trailName": "구멍새길 목데크 구간",
        "subArea": "해운대",
        "themes": ["sea"],
        "emoji": "🌉",
        "distance": "1.8km",
        "duration": "50분",
        "maxSlope": 4.2,
        "slopeRating": "완만(쉬움)",
        "surface": "목재 데크 + 무턱 포장",
        "startPoint": "해운대해수욕장 중앙광장",
        "endPoint": "동백섬 입구",
        "handrail": "Y",
        "restArea": "Y",
        "accessibleToilet": "Y",
        "tip": "데크가 해수면 높이라 파도 튀는 날엔 안전 난간 가까이 걷세요.",
    },
    {
        "trailId": "TR-BS-04",
        "agency": "부산 기장군",
        "parkName": "기장 갈치봉 탐방로",
        "trailName": "갈치봉 능선 구간",
        "subArea": "기장",
        "themes": ["park"],
        "emoji": "⛰️",
        "distance": "2.6km",
        "duration": "90분",
        "maxSlope": 11.8,
        "slopeRating": "보통(경사 있음)",
        "surface": "자연흙 + 계단",
        "startPoint": "갈치봉 등산로 입구",
        "endPoint": "갈치봉 정상",
        "handrail": "N",
        "restArea": "N",
        "accessibleToilet": "N",
        "tip": "경사가 있어 보행 보조기에는 부적합한 구간이에요.",
    },
    {
        "trailId": "TR-SL-01",
        "agency": "서울 한강사업본부",
        "parkName": "여의도 한강공원",
        "trailName": "한강 둘레길 평지 구간",
        "subArea": "여의도",
        "themes": ["park"],
        "emoji": "🌳",
        "distance": "2.4km",
        "duration": "60분",
        "maxSlope": 3.1,
        "slopeRating": "완만(매우 쉬움)",
        "surface": "무턱 아스팔트 + 데크",
        "startPoint": "여의도동 주차장 안내소",
        "endPoint": "여의나루역",
        "handrail": "Y",
        "restArea": "Y",
        "accessibleToilet": "Y",
        "tip": "한강 전망이 트인 평지 산책로예요.",
    }
]


def filter_spots(args):
    region = args.get("region", "")
    themes = args.get("themes", [])
    indoor_only = args.get("indoorOnly", False)
    items = []
    for s in TOURIST_SPOTS:
        if region and s.get("areacode") != _area_code_for_region(region):
            continue
        if indoor_only and "indoor" not in s.get("themes", []):
            continue
        if themes and not any(t in s.get("themes", []) for t in themes):
            continue
        items.append(s)
    return {"items": items, "excluded": [], "regionNote": None}


def filter_trails(args):
    region = args.get("region", "")
    themes = args.get("themes", [])
    max_slope = args.get("maxSlope", 8)
    items = []
    excluded = []
    for t in TRAILS:
        if region and t.get("subArea") not in _subareas_for_region(region):
            continue
        if themes and not any(th in t.get("themes", []) for th in themes):
            continue
        if t.get("maxSlope", 99) > max_slope:
            excluded.append(t.get("trailName", "알 수 없음"))
            continue
        items.append(t)
    return {"items": items, "excluded": excluded, "regionNote": None}


def filter_hotels(args):
    region = args.get("region", "")
    items = []
    for h in HOTELS:
        if region and h.get("subArea") not in _subareas_for_region(region):
            continue
        items.append(h)
    return {"items": items, "excluded": [], "regionNote": None}


def filter_restaurants(args):
    region = args.get("region", "")
    sub_areas = args.get("subAreas", [])

    # RESTAURANTS 정의에서 subArea를 자동 추출 (rdnmAdr 기반)
    _build_restaurant_subarea_map()

    items = []
    for r in RESTAURANTS:
        sa = r.get("subArea", "")
        if region and sa not in _subareas_for_region(region):
            continue
        if sub_areas and sa not in sub_areas:
            continue
        items.append(r)
    return {"items": items, "excluded": [], "regionNote": None}


def _area_code_for_region(region):
    code_map = {"부산": "6", "서울": "1", "제주": "5", "강원": "32", "인천": "2",
                "경남": "36", "경북": "35"}
    return code_map.get(region, "")


def _subareas_for_region(region):
    subareas = set()
    for s in TOURIST_SPOTS:
        if s.get("subArea"):
            subareas.add(s["subArea"])
    for t in TRAILS:
        if t.get("subArea"):
            subareas.add(t["subArea"])
    for h in HOTELS:
        if h.get("subArea"):
            subareas.add(h["subArea"])
    return sorted(subareas)


RESTAURANTS = [
    {
        "bizesId": "BS-001",
        "bizesNm": "해운대 토종국밥",
        "indsMclsNm": "음식점",
        "indsSclsNm": "한식",
        "rdnmAdr": "부산광역시 해운대구 구남로 12",
        "lon": "129.1583",
        "lat": "35.1583",
        "subArea": "해운대",
        "access": {"stepFree": True, "memo": "출입구 턱 없음"},
        "liveUnverified": False,
        "tip": "입구에 턱이 없어 휠체어 이용이 편해요.",
    },
    {
        "bizesId": "SL-001",
        "bizesNm": "여의도 한강 뷰 레스토랑",
        "indsMclsNm": "음식점",
        "indsSclsNm": "한식",
        "rdnmAdr": "서울특별시 영등포구 여의동로 330",
        "lon": "126.9170",
        "lat": "37.5240",
        "subArea": "여의도",
        "access": {"stepFree": True, "memo": "출입구 턱 없음"},
        "liveUnverified": False,
        "tip": "한강 전망과 함께 휠체어 전용 좌석이 준비돼 있어요.",
    },
]

# RESTAURANTS의 subArea를 자동 추출 (rdnmAdr 기반) — 기존 데이터 유지보수용
def _build_restaurant_subarea_map():
    mapping = {}
    region_map = {
        "부산": "해운대", "서울": "여의도", "제주": "애월/협재",
        "강원": "강릉", "인천": "을왕리", "경남": "통영", "경북": "포항",
    }
    for r in RESTAURANTS:
        rdnm = r.get("rdnmAdr", "")
        for region_key, sub in region_map.items():
            if region_key in rdnm:
                r["subArea"] = sub
                break
    return {r["bizesId"]: r.get("subArea", "") for r in RESTAURANTS}


if __name__ == "__main__":
    import json
    print(json.dumps([{"bizesId": r["bizesId"], "subArea": r["subArea"]} for r in RESTAURANTS], ensure_ascii=False, indent=2))

HOTELS = [
    {
        "contentid": "HT-BS-01",
        "title": "해운대 오션 무장애 호텔",
        "addr1": "부산광역시 해운대구 해운대해변로 298",
        "subArea": "해운대",
        "barrier": {"rental": "Y", "toilet": "Y", "enterable": "Y", "elevator": "Y", "parking": "Y"},
        "roomInfo": "졸대 폭 90cm 이상 객실 4개",
        "tip": "예약 시 '휠체어 객실'로 요청하세요.",
    },
    {
        "contentid": "HT-SL-01",
        "title": "여의도 강변 무장애 호텔",
        "addr1": "서울특별시 영등포구 여의대방로 110",
        "subArea": "여의도",
        "barrier": {"rental": "N", "toilet": "Y", "enterable": "Y", "elevator": "Y", "parking": "Y"},
        "roomInfo": "배리어프리 유닛 6개",
        "tip": "한강 산책로와 지하로 연결돼 있어요.",
    },
]
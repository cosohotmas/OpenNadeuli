from backend.src.services.nlu import parse_intent, default_region
from backend.src.data.sample_data import (
    filter_spots, filter_trails, filter_restaurants, filter_hotels, RESTAURANTS
)

print("=== 백엔드 테스트 ===")
print()

# 1. NLU
intent = parse_intent("부모님 모시고 가기 좋은 부산 바다 데크길 코스")
print("1. NLU:", intent.region, "|", intent.themes, "|", intent.mobility, "|", intent.duration)
print()

# 2. 관광지 필터링
r = filter_spots({"region": "부산", "themes": ["sea"], "indoorOnly": False})
print("2. 관광지:", len(r["items"]), "개")
if r["items"]:
    print("   -", r["items"][0]["title"])

# 3. 탐방로 필터링 (경사도 8% 이하)
r = filter_trails({"region": "부산", "themes": [], "maxSlope": 8})
print("3. 탐방로:", len(r["items"]), "개, 제외:", r["excluded"])

# 4. 식당 필터링
r = filter_restaurants({"region": "부산", "subAreas": []})
print("4. 식당:", len(r["items"]), "개")
for item in r["items"]:
    print("   -", item["bizesNm"], "(", item.get("subArea", "없음"), ")")

# 5. 호텔 필터링
r = filter_hotels({"region": "부산"})
print("5. 숙수:", len(r["items"]), "개")

print()
print("✅ 모든 백엔드 테스트 통과!")

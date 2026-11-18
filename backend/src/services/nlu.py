"""
nlu.py — 규칙 기반 의도 분석기 (자연어 → 파라미터)

Function Calling 파이프라인의 1단계.
사용자 발화에서 지역·테마·동행·날씨·일정·식사 의사를 추출해
도구 호출 인자(arguments)로 변환한다.
(LLM 연동 시 이 모듈을 모델 기반 파서로 교체하면 되는 인터페이스)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Intent:
    """사용자 발화에서 추출된 구조화된 의도."""

    text: str
    region: Optional[str] = None
    themes: List[str] = field(default_factory=list)
    rain: bool = False
    mobility: List[str] = field(default_factory=list)
    duration: Optional[str] = None  # "oneday" | "halfday" | None
    wants_food: bool = False
    restaurants_only: bool = False
    next_region: bool = False
    another_course: bool = False
    greeting: bool = False
    outing: bool = False
    indoor_only: bool = False
    spots_list: bool = False
    want_n: int = 0
    labels: List[str] = field(default_factory=list)


REGION_KEYWORDS = [
    {"region": "부산", "keys": ['부산', '해운대', '기장', '동백섬', '광안리', '송정', '블루라인', '씨라이프', '해변열차']},
    {"region": "서울", "keys": ['서울', '여의도', '마곡', '서울숲', '경복궁', '청계천', '성수', '인사동', '광화문', '한강']},
    {"region": "제주", "keys": ['제주', '협재', '새별오름', '돈내코', '애월', '서귀포', '카멜리아', '조천']},
    {"region": "강원", "keys": ['강원', '동해', '동해 바다', '동해바다', '강릉', '속초', '양양', '정동진', '경포', '삼척', '동해시', '묵호', '주문진', '낙산', '설악', '안목']},
    {"region": "인천", "keys": ['인천', '서해', '을왕리', '송도', '월미도', '영종', '강화', '소래']},
    {"region": "경남", "keys": ['경남', '남해', '통영', '거제', '사천', '진주', '고성', '한려']},
    {"region": "경북", "keys": ['경북', '포항', '울진', '영덕', '경주', '호미곶', '죽도']},
    {"region": "울산", "keys": ['울산', '간절곶', '태화강', '진하']},
    {"region": "경기", "keys": ['경기', '수원', '안산', '평택', '가평', '양평', '시흥', '오이도']},
    {"region": "대전", "keys": ['대전']},
    {"region": "대구", "keys": ['대구']},
    {"region": "광주", "keys": ['광주']},
    {"region": "세종", "keys": ['세종']},
    {"region": "충북", "keys": ['충북', '충청북', '청주', '충주', '제천']},
    {"region": "충남", "keys": ['충남', '충청남', '천안', '아산', '당진', '태안', '안면도', '서산']},
    {"region": "전북", "keys": ['전북', '전라북', '전주', '군산', '익산', '남원']},
    {"region": "전남", "keys": ['전남', '전라남', '여수', '순천', '목포', '담양', '무안']},
]

THEME_KEYWORDS = [
    {"theme": "sea", "keys": ['바다', '해변', '바닷가', '해수욕장', '갯바위', '파도']},
    {"theme": "park", "keys": ['산책', '공원', '숲', '데크', '둘레길', '오름', '정원', '자연', '평지']},
    {"theme": "culture", "keys": ['미술관', '박물관', '전시', '문화', '궁']},
    {"theme": "indoor", "keys": ['실내', '수족관', '아쿠아리움', '박람회']},
]

RAIN_KEYWORDS = ["비 오", "비가", "우천", "장마", "소나기", "흐린", "안개", "비오는"]

MOBILITY_KEYWORDS = {
    "wheelchair": ["휠체어"],
    "walker": ["보행기", "워커", "지팡이", "보행 보조"],
    "senior": ["부모님", "아버지", "어머니", "할아버지", "할머니", "어르신", "노모", "모시고", "친정", "노부모", "엄마", "아빠"],
    "stroller": ["유모차", "아기", "어린이", "아이랑"],
}

FOOD_KEYWORDS = ["맛집", "식당", "점심", "저녁", "밥", "음식", "먹거리", "카페", "식사"]

GREETING_KEYWORDS = ["안녕", "하이", "hi", "hello", "뭐 하는", "누구야", "도움말", "사용법", "처음", "가이드"]


def _has_any(text: str, keys: List[str]) -> bool:
    """텍스트에 키워드 중 하나라도 포함되어 있는지 확인."""
    return any(k in text for k in keys)


def parse_intent(raw_text: str) -> Intent:
    """사용자 발화를 구조화된 의도(Intent) 객체로 변환.

    처리 순서:
      1. 텍스트 정규화 (trim, 소문자 변환)
      2. 지역 키워드 매칭
      3. 테마 키워드 매칭 (복수 가능)
      4. 날씨·동행·일정·식사 키워드 매칭
      5. 후속 요청 신호 감지 (인사, 다른 코스, 지역 변경 등)
      6. 여행지 목록 요청 감지 (숫자 + 장소 명사)
      7. 실내 전용 모드 판단 (비 오거나 실내 테마)
      8. Intent 객체 구성 및 반환
    """
    text = (raw_text or "").strip()
    lower = text.lower()
    # 2) 지역 매칭
    region_hit = next((r for r in REGION_KEYWORDS if _has_any(lower, r["keys"])), None)
    region = region_hit["region"] if region_hit else None

    # 3) 테마 매칭 (복수 가능)
    themes = [t["theme"] for t in THEME_KEYWORDS if _has_any(lower, t["keys"])]

    # 4) 날씨·동행·일정·식사 매칭
    rain = _has_any(lower, RAIN_KEYWORDS)
    mobility = [k for k, keys in MOBILITY_KEYWORDS.items() if _has_any(lower, keys)]
    halfday = _has_any(lower, ["반나절", "오전", "오후", "아침"])
    oneday = _has_any(lower, ["하루", "당일", "종일"])
    wants_food = _has_any(lower, FOOD_KEYWORDS)
    indoor_only = rain or "indoor" in themes
    # 5) 후속 요청 신호 감지
    restaurants_only = _has_any(lower, ["식당만", "맛집만", "먹을 곳만", "점심만", "저녁만", "카페만"])
    next_region = _has_any(lower, ["다른 지역", "지역 바꿔", "지역 바꾸"])
    another_course = _has_any(lower, ["다른 코스", "다시 추천", "다시 보여", "코스 바꿔", "다르게", "다른 장소", "다른 곳"])
    greeting = (
        _has_any(lower, GREETING_KEYWORDS)
        and not region
        and len(themes) == 0
        and not restaurants_only
        and not another_course
    )
    outing = _has_any(lower, ["나들이", "가볼 만한", "찾아", "코스", "여행", "산책", "추천", "다려", "어디 가", "가고 싶", "가기 좋은"])

    # 6) 여행지 목록 요청 감지 (숫자 + 장소 명사)
    count_m = re.search(r"(\d+)\s*(개|곳|군데)", text)
    spots_list = bool(count_m and re.search(r"(여행지|관광지|장소|곳|군데)", text))
    want_n = int(count_m.group(1)) if count_m else 0

    # 8) Intent 객체 구성
    intent = Intent(
        text=text,
        region=region,
        themes=themes,
        rain=rain,
        mobility=mobility,
        duration="oneday" if oneday else ("halfday" if halfday else None),
        wants_food=wants_food,
        restaurants_only=restaurants_only,
        next_region=next_region,
        another_course=another_course,
        greeting=greeting,
        outing=outing,
        indoor_only=indoor_only,
        spots_list=spots_list,
        want_n=want_n,
    )

    # 9) 화면에 표시할 의도 요약 배지 생성
    intent.labels = _build_labels(intent)
    return intent


def _build_labels(intent: Intent) -> List[str]:
    """의도 객체에서 화면 표시용 라벨 목록을 생성."""
    labels: List[str] = []
    if intent.region:
        labels.append(f"지역 · {intent.region}")

    mo: List[str] = []
    if "wheelchair" in intent.mobility:
        mo.append("휠체어")
    if "walker" in intent.mobility:
        mo.append("보행기")
    if "senior" in intent.mobility:
        mo.append("노부모 동행")
    if "stroller" in intent.mobility:
        mo.append("유모차")
    if mo:
        labels.append(f"동행 · {'·'.join(mo)}")

    if intent.themes:
        theme_names = {"sea": "바다", "park": "산책·공원", "culture": "문화·전시", "indoor": "실내"}
        labels.append(f"테마 · {'·'.join(theme_names[t] for t in intent.themes)}")

    if intent.rain:
        labels.append("우천 · 실내 중심")

    if intent.duration:
        duration_label = "하루" if intent.duration == "oneday" else "반나절"
        labels.append(f"일정 · {duration_label}")

    if intent.wants_food or intent.restaurants_only:
        labels.append("식사 · 맛집 포함")

    return labels


def default_region(themes: List[str]) -> str:
    """지역 미지정 시 기본 지역 선택."""
    if "indoor" in themes or "culture" in themes:
        return "서울"
    if "sea" in themes:
        return "부산"
    return "서울"

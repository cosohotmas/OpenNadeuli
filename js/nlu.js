/**
 * nlu.js — 규칙 기반 의도 분석기 (자연어 → 파라미터)
 *
 * Function Calling 파이프라인의 1단계.
 * 사용자 발화에서 지역·테마·동행·날씨·일정·식사 의사를 추출해
 * 도구 호출 인자(arguments)로 변환한다.
 * (LLM 연동 시 이 모듈을 모델 기반 파서로 교체하면 되는 인터페이스)
 */

const REGION_KEYWORDS = [
  { region: "부산", keys: ["부산", "해운대", "기장", "동백섬", "광안리", "송정", "블루라인", "씨라이프", "해변열차"] },
  { region: "서울", keys: ["서울", "여의도", "마곡", "서울숲", "경복궁", "청계천", "성수", "인사동", "광화문", "한강"] },
  { region: "제주", keys: ["제주", "협재", "새별오름", "돈내코", "애월", "서귀포", "카멜리아", "조천"] },
  { region: "강원", keys: ["강원", "동해", "동해 바다", "동해바다", "강릉", "속초", "양양", "정동진", "경포", "삼척", "동해시", "묵호", "주문진", "낙산", "설악", "안목"] },
  { region: "인천", keys: ["인천", "서해", "을왕리", "송도", "월미도", "영종", "강화", "소래"] },
  { region: "경남", keys: ["경남", "남해", "통영", "거제", "사천", "진주", "고성", "한려"] },
  { region: "경북", keys: ["경북", "포항", "울진", "영덕", "경주", "호미곶", "죽도"] },
  { region: "울산", keys: ["울산", "간절곶", "태화강", "진하"] },
  { region: "경기", keys: ["경기", "수원", "안산", "평택", "가평", "양평", "시흥", "오이도"] },
  { region: "대전", keys: ["대전"] },
  { region: "대구", keys: ["대구"] },
  { region: "광주", keys: ["광주"] },
  { region: "세종", keys: ["세종"] },
  { region: "충북", keys: ["충북", "충청북", "청주", "충주", "제천"] },
  { region: "충남", keys: ["충남", "충청남", "천안", "아산", "당진", "태안", "안면도", "서산"] },
  { region: "전북", keys: ["전북", "전라북", "전주", "군산", "익산", "남원"] },
  { region: "전남", keys: ["전남", "전라남", "여수", "순천", "목포", "담양", "무안"] },
];

const THEME_KEYWORDS = [
  { theme: "sea", keys: ["바다", "해변", "바닷가", "해수욕장", "갯바위", "파도"] },
  { theme: "park", keys: ["산책", "공원", "숲", "데크", "둘레길", "오름", "정원", "자연", "평지"] },
  { theme: "culture", keys: ["미술관", "박물관", "전시", "문화", "궁"] },
  { theme: "indoor", keys: ["실내", "수족관", "아쿠아리움", "박람회"] },
];

const RAIN_KEYWORDS = ["비 오", "비가", "우천", "장마", "소나기", "흐린", "안개", "비오는"];

const MOBILITY_KEYWORDS = {
  wheelchair: ["휠체어"],
  walker: ["보행기", "워커", "지팡이", "보행 보조"],
  senior: ["부모님", "아버지", "어머니", "할아버지", "할머니", "어르신", "노모", "모시고", "친정", "노부모", "엄마", "아빠"],
  stroller: ["유모차", "아기", "어린이", "아이랑"],
};

const FOOD_KEYWORDS = ["맛집", "식당", "점심", "저녁", "밥", "음식", "먹거리", "카페", "식사"];

const GREETING_KEYWORDS = ["안녕", "하이", "hi", "hello", "뭐 하는", "누구야", "도움말", "사용법", "처음", "가이드"];

function hasAny(text, keys) {
  return keys.some((k) => text.includes(k));
}

/** 발화 → 구조화된 의도(intent) */
export function parseIntent(rawText) {
  const text = (rawText || "").trim();
  const lower = text.toLowerCase();

  /* 지역 */
  const regionHit = REGION_KEYWORDS.find((r) => hasAny(lower, r.keys));
  const region = regionHit ? regionHit.region : null;

  /* 테마 (복수 가능) */
  const themes = THEME_KEYWORDS.filter((t) => hasAny(lower, t.keys)).map((t) => t.theme);

  /* 날씨/동행/일정/식사 */
  const rain = hasAny(lower, RAIN_KEYWORDS);
  const mobility = Object.entries(MOBILITY_KEYWORDS)
    .filter(([, keys]) => hasAny(lower, keys))
    .map(([k]) => k);
  const halfday = hasAny(lower, ["반나절", "오전", "오후", "아침"]);
  const oneday = hasAny(lower, ["하루", "당일", "종일"]);
  const wantsFood = hasAny(lower, FOOD_KEYWORDS);

  /* 후속 요청 신호 */
  const restaurantsOnly = hasAny(lower, ["식당만", "맛집만", "먹을 곳만", "점심만", "저녁만", "카페만"]);
  const nextRegion = hasAny(lower, ["다른 지역", "지역 바꿔", "지역 바꾸"]);
  const anotherCourse = hasAny(lower, ["다른 코스", "다시 추천", "다시 보여", "코스 바꿔", "다르게", "다른 장소", "다른 곳"]);
  const greeting = hasAny(lower, GREETING_KEYWORDS) && !region && themes.length === 0 && !restaurantsOnly && !anotherCourse;
  const outing = hasAny(lower, ["나들이", "가볼 만한", "찾아", "코스", "여행", "산책", "추천", "다려", "어디 가", "가고 싶", "가기 좋은"]);

  /* 여행지 목록 요청 신호: 숫자 + 장소 명사 ("여행지 3개 추천", "장소 2곳 알려줘")
     → 코스 조립이 아니라 관광지 N곳 목록으로 응답 */
  const countM = text.match(/(\d+)\s*(개|곳|군데)/);
  const spotsList = !!(countM && /(여행지|관광지|장소|곳|군데)/.test(text));
  const wantN = countM ? parseInt(countM[1], 10) : 0;

  const indoorOnly = rain || themes.includes("indoor");

  const intent = {
    text,
    region, themes, rain, mobility,
    duration: oneday ? "oneday" : halfday ? "halfday" : null,
    wantsFood, restaurantsOnly, nextRegion, anotherCourse,
    greeting, outing, indoorOnly,
    spotsList, wantN,
  };

  intent.labels = buildLabels(intent);
  return intent;
}

/** 화면에 표시할 의도 요약 배지 */
function buildLabels(i) {
  const labels = [];
  if (i.region) labels.push(`지역 · ${i.region}`);
  const mo = [];
  if (i.mobility.includes("wheelchair")) mo.push("휠체어");
  if (i.mobility.includes("walker")) mo.push("보행기");
  if (i.mobility.includes("senior")) mo.push("노부모 동행");
  if (i.mobility.includes("stroller")) mo.push("유모차");
  if (mo.length) labels.push(`동행 · ${mo.join("·")}`);
  if (i.themes.length) {
    const names = { sea: "바다", park: "산책·공원", culture: "문화·전시", indoor: "실내" };
    labels.push(`테마 · ${i.themes.map((t) => names[t]).join("·")}`);
  }
  if (i.rain) labels.push("우천 · 실내 중심");
  if (i.duration) labels.push(`일정 · ${i.duration === "oneday" ? "하루" : "반나절"}`);
  if (i.wantsFood || i.restaurantsOnly) labels.push("식사 · 맛집 포함");
  return labels;
}

/** 지역 미지정 시 기본 지역 선택 */
export function defaultRegion(themes) {
  if (themes.includes("indoor") || themes.includes("culture")) return "서울";
  if (themes.includes("sea")) return "부산";
  return "서울";
}

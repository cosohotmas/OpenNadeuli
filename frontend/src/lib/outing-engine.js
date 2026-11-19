/* 단일 파일 빌드: ES 모듈 번들을 합친 스크립트 (2026-11-17T05:19:53.424Z) */
/* ====== js/data.js ====== */
/**
 * 내장 샘플 데이터 (시연용)
 * ------------------------------------------------------------------
 * 실제 공공데이터 응답 스펙과 동일한 항목 구조로 설계했습니다.
 *
 *  - TOURIST_SPOTS  : 한국관광공사_열린관광지 정보조회서비스 스타일
 *                     (contentid, areacode, wheelchairrental, disabledtoilet ...)
 *  - TRAILS         : 국립공원공단·지자체 무장애 탐방로(데크길) 스타일
 *                     (maxSlope=최대 경사도(%), distance, startPoint ...)
 *  - RESTAURANTS    : 소상공인시장진흥공단 상권정보-상가(상권)정보 스타일
 *                     (bizesId, bizesNm, indsSclsNm, xswftm/yswftm ...)
 *
 * ※ 장소명·주소·시설 정보는 시연을 위한 가상 데이터입니다. (README 참고)
 */

const REGIONS = ["부산", "서울", "제주", "강원", "인천", "경남", "경북"];

/** 안심 체크포인트 배지 정의 */
const BADGE_DEFS = {
  rental:          { emoji: "🦽", label: "휠체어 대여" },
  toilet:          { emoji: "🚻", label: "장애인 화장실" },
  enterable:       { emoji: "♿", label: "휠체어 진입" },
  elevator:        { emoji: "🛗", label: "엘리베이터" },
  parking:         { emoji: "🅿️", label: "전용 주차장" },
  slope8:          { emoji: "⛰️", label: "경사도 8% 이하" },
  handrail:        { emoji: "🛡️", label: "안전 난간" },
  restArea:        { emoji: "🪑", label: "휴식 공간" },
  stepFree:        { emoji: "🚪", label: "출입구 턱 없음" },
  lowTable:        { emoji: "🍽️", label: "저상 테이블" },
  unverified:      { emoji: "⚠️", label: "무장애 정보 현장 확인 필요" },
};

/* ============================ 관광지 ============================ */
const TOURIST_SPOTS = [
  /* -------------------------- 부산 -------------------------- */
  {
    contentid: "OT6260001",
    title: "해운대해수욕장 무장애구역",
    addr1: "부산광역시 해운대구 우동",
    areacode: "6", sigungucode: "12",
    cat3name: "해수욕장/해변", kind: "outdoor",
    themes: ["sea"], subArea: "해운대", emoji: "🏖️",
    barrier: { rental: "Y", toilet: "Y", enterable: "Y", parking: "Y" },
    rentalInfo: "해변 전용 휠체어 무료 대여 10:00~17:00",
    usageHour: "09:00~19:00",
    tip: "해변 전용 휠체어로 물가 목데크까지 그대로 진입해요. 대여는 오전에 먼저 받는 게 좋아요.",
  },
  {
    contentid: "OT6260002",
    title: "동백섬 공원",
    addr1: "부산광역시 해운대구 중동",
    areacode: "6", sigungucode: "12",
    cat3name: "공원", kind: "outdoor",
    themes: ["sea", "park"], subArea: "동백섬", emoji: "🌊",
    barrier: { rental: "N", toilet: "Y", enterable: "Y", parking: "Y" },
    usageHour: "연중무휴",
    tip: "섬 전체가 평평한 회로 산책로라 방향만 정하면 길을 잃지 않아요. 등대 앞 벤치에서 쉬기 좋아요.",
  },
  {
    contentid: "OT6260003",
    title: "해운대블루라인파크 해변열차",
    addr1: "부산광역시 해운대구 송정동",
    areacode: "6", sigungucode: "12",
    cat3name: "레저/열차", kind: "outdoor",
    themes: ["sea"], subArea: "송정", emoji: "🚂",
    barrier: { rental: "N", toilet: "Y", enterable: "Y", parking: "Y" },
    usageHour: "09:30~19:00 (막차 18:30)",
    tip: "휠체어 전용 탑승구는 해변열차 첫 차량, 출발 20분 전 안내소에서 도움을 받으세요.",
  },
  {
    contentid: "OT6260004",
    title: "씨라이프 부산 아쿠아리움",
    addr1: "부산광역시 해운대구 해운대해변로 266",
    areacode: "6", sigungucode: "12",
    cat3name: "수족관", kind: "indoor",
    themes: ["sea", "indoor"], subArea: "해운대", emoji: "🐠",
    barrier: { rental: "Y", toilet: "Y", enterable: "Y", elevator: "Y", parking: "Y" },
    usageHour: "10:00~18:00 (입장 마감 17:00)",
    tip: "어두운 수중 터널도 그대로 이동 가능해요. 눈이 밝은 곳에 적응할 때 잠시 머무는 코스를 추천해요.",
  },
  {
    contentid: "OT6260005",
    title: "기장 오랑해변",
    addr1: "부산광역시 기장군 기장읍 오랑리",
    areacode: "6", sigungucode: "21",
    cat3name: "해수욕장/해변", kind: "outdoor",
    themes: ["sea"], subArea: "기장", emoji: "🌅",
    barrier: { rental: "N", toilet: "Y", enterable: "Y", parking: "Y" },
    usageHour: "연중무휴",
    tip: "데크 입구까지 승하차 공간이 있어 어르신 이동 거리가 짧아요. 오후에 파도 소리가 좋아요.",
  },
  {
    contentid: "OT6260006",
    title: "부산시립미술관",
    addr1: "부산광역시 해운대구 APEC로 58",
    areacode: "6", sigungucode: "12",
    cat3name: "미술관", kind: "indoor",
    themes: ["culture", "indoor"], subArea: "해운대", emoji: "🖼️",
    barrier: { rental: "Y", toilet: "Y", enterable: "Y", elevator: "Y", parking: "Y" },
    usageHour: "10:00~18:00 (월요일 휴관)",
    tip: "1·2층 무장애 동선 리플렛을 리셉션에서 받으세요. 카페 테이블도 저상형이 있어요.",
  },

  /* -------------------------- 서울 -------------------------- */
  {
    contentid: "OT1100001",
    title: "여의한강공원 무장애구역",
    addr1: "서울특별시 영등포구 여의동로 330",
    areacode: "1", sigungucode: "15",
    cat3name: "공원", kind: "outdoor",
    themes: ["park", "sea"], subArea: "여의도", emoji: "🌳",
    barrier: { rental: "Y", toilet: "Y", enterable: "Y", parking: "Y" },
    rentalInfo: "공원 안내소 휠체어 무료 대여 09:00~18:00",
    usageHour: "24시간 (안내소 09:00~18:00)",
    tip: "한강 전망 광장까지 완만한 경사로가 이어져요. 주말엔 대여 휠체어가 오전에 먼저 소진돼요.",
  },
  {
    contentid: "OT1100002",
    title: "서울식물원·마곡나루",
    addr1: "서울특별시 강서구 마곡동로 161",
    areacode: "1", sigungucode: "5",
    cat3name: "식물원", kind: "mixed",
    themes: ["park"], subArea: "마곡", emoji: "🌿",
    barrier: { rental: "Y", toilet: "Y", enterable: "Y", elevator: "Y", parking: "Y" },
    usageHour: "야외 05:00~22:00 / 주 전시관 09:30~18:00",
    tip: "비 오는 날엔 주 전시관(실내) 중심으로 둘러보세요. 전시관 바닥 전 구간이 평평해요.",
  },
  {
    contentid: "OT1100003",
    title: "국립현대미술관 서울관",
    addr1: "서울특별시 종로구 삼청로 30",
    areacode: "1", sigungucode: "23",
    cat3name: "미술관", kind: "indoor",
    themes: ["culture", "indoor"], subArea: "광화문", emoji: "🖼️",
    barrier: { rental: "Y", toilet: "Y", enterable: "Y", elevator: "Y", parking: "Y" },
    usageHour: "10:00~18:00 (1·3월 월요일 휴관)",
    tip: "무빙워크로 언덕 없이 입구까지 연결돼요. 전시 3개 중 1곳은 실내 평지 동선으로 이어져요.",
  },
  {
    contentid: "OT1100004",
    title: "서울숲",
    addr1: "서울특별시 성동구 뚝섬로 273",
    areacode: "1", sigungucode: "23",
    cat3name: "공원", kind: "outdoor",
    themes: ["park"], subArea: "서울숲", emoji: "🌲",
    barrier: { rental: "Y", toilet: "Y", enterable: "Y", parking: "Y" },
    usageHour: "05:30~22:00",
    tip: "문화예술공원 쪽이 가장 평평해요. 이벤트가 있는 주말엔 산책로가 붐비니 오전을 권해요.",
  },
  {
    contentid: "OT1100005",
    title: "경복궁",
    addr1: "서울특별시 종로구 사직로 161",
    areacode: "1", sigungucode: "23",
    cat3name: "고궁/역사", kind: "outdoor",
    themes: ["culture", "park"], subArea: "광화문", emoji: "🏯",
    barrier: { rental: "Y", toilet: "Y", enterable: "Y", parking: "N" },
    usageHour: "09:00~18:00 (화요일 휴궁)",
    tip: "계단 대신 후문 평평한 길로 들어가면 이동이 편해요. 휠체어 대여는 흥례문 안내소에서.",
  },

  /* -------------------------- 제주 -------------------------- */
  {
    contentid: "OT5000001",
    title: "협재해수욕장",
    addr1: "제주특별자치도 제주시 애월읍 협재리",
    areacode: "5", sigungucode: "1",
    cat3name: "해수욕장/해변", kind: "outdoor",
    themes: ["sea"], subArea: "애월/협재", emoji: "🏖️",
    barrier: { rental: "Y", toilet: "Y", enterable: "Y", parking: "Y" },
    rentalInfo: "서비스센터 휠체어·유모차 대여 09:00~18:00",
    usageHour: "연중무휴",
    tip: "모래 대신 해변 목데크를 따라 가면 바다 앞까지만 이동해요. 서핑 보드 대신 그늘 매트도 대여돼요.",
  },
  {
    contentid: "OT5000002",
    title: "새별오름",
    addr1: "제주특별자치도 제주시 조천읍 교래리",
    areacode: "5", sigungucode: "1",
    cat3name: "오름/자연", kind: "outdoor",
    themes: ["park"], subArea: "조천", emoji: "🌄",
    barrier: { rental: "N", toilet: "Y", enterable: "Y", parking: "Y" },
    usageHour: "09:00~18:00",
    tip: "완경사 계단식 데크로 정상 근처 전망대까지 이동 가능해요. 바람이 강한 날엔 외투를 챙기세요.",
  },
  {
    contentid: "OT5000003",
    title: "돈내코 계곡",
    addr1: "제주특별자치도 제주시 아라일동",
    areacode: "5", sigungucode: "1",
    cat3name: "계곡/자연", kind: "outdoor",
    themes: ["park"], subArea: "돈내코", emoji: "🌲",
    barrier: { rental: "N", toilet: "Y", enterable: "Y", parking: "Y" },
    usageHour: "08:00~19:00",
    tip: "주차장에서 데크 시작점까지 30m라 이동 부담이 적어요. 쉼터가 중간마다 있어요.",
  },
  {
    contentid: "OT5000004",
    title: "제주 아쿠아플라넷",
    addr1: "제주특별자치도 제주시 조천읍 백록로 95",
    areacode: "5", sigungucode: "1",
    cat3name: "수족관", kind: "indoor",
    themes: ["sea", "indoor"], subArea: "조천", emoji: "🐠",
    barrier: { rental: "Y", toilet: "Y", enterable: "Y", elevator: "Y", parking: "Y" },
    usageHour: "09:30~19:00",
    tip: "관람 동선 전체가 엘리베이터와 완만한 경사로로 연결돼요. 오페라하우스 전망 테라스도 평평해요.",
  },
  {
    contentid: "OT5000005",
    title: "카멜리아힐",
    addr1: "제주특별자치도 서귀포시 안덕면 병액로 166",
    areacode: "5", sigungucode: "2",
    cat3name: "식물원", kind: "mixed",
    themes: ["park", "indoor"], subArea: "서귀포", emoji: "🌺",
    barrier: { rental: "Y", toilet: "Y", enterable: "Y", parking: "Y" },
    usageHour: "08:30~18:30",
    tip: "온실 가든은 실내라 날씨와 상관없이 산책돼요. 도보 쉼표(그늘 쉘터)가 구간마다 있어요.",
  },

  /* -------------------------- 강원 (동해) -------------------------- */
  {
    contentid: "OT3260001",
    title: "경포해변 무장애 목데크",
    addr1: "강원특별자치도 강릉시 경포로 365",
    areacode: "32", sigungucode: "1",
    cat3name: "해수욕장/해변", kind: "outdoor",
    themes: ["sea"], subArea: "강릉", emoji: "🏖️",
    barrier: { rental: "Y", toilet: "Y", enterable: "Y", parking: "Y" },
    rentalInfo: "해변 전용 휠체어 여름철 무료 대여 10:00~16:00",
    usageHour: "09:00~18:00",
    tip: "해변 목데크가 끝까지 이어져 파도 구경이 편해요. 대여는 해변 안내소에서 오전에 먼저 받아요.",
  },
  {
    contentid: "OT3260002",
    title: "속초해수욕장 평지 데크",
    addr1: "강원특별자치도 속초시 조명정로 189",
    areacode: "32", sigungucode: "1",
    cat3name: "해수욕장/해변", kind: "outdoor",
    themes: ["sea", "park"], subArea: "속초", emoji: "🌊",
    barrier: { rental: "N", toilet: "Y", enterable: "Y", parking: "Y" },
    usageHour: "연중무휴",
    tip: "설악산 전망까지 평평한 데크라 보행기 산책에 좋아요. 오후엔 바람이 불어 담요를 챙기세요.",
  },
  /* -------------------------- 인천 (서해) -------------------------- */
  {
    contentid: "OT2260001",
    title: "을왕리해수욕장 무장애 데크",
    addr1: "인천광역시 중구 을왕동",
    areacode: "2", sigungucode: "6",
    cat3name: "해수욕장/해변", kind: "outdoor",
    themes: ["sea"], subArea: "을왕리", emoji: "🏖️",
    barrier: { rental: "Y", toilet: "Y", enterable: "Y", parking: "Y" },
    rentalInfo: "해변 안내센터 전용 휠체어 무료 대여 09:00~18:00",
    usageHour: "연중무휴",
    tip: "해변 앞 상가까지 무턱 포장이 이어져 저녁 산책도 편해요.",
  },
  {
    contentid: "OT2260002",
    title: "월미도 문화공원 평지길",
    addr1: "인천광역시 중구 월미문화로 40",
    areacode: "2", sigungucode: "6",
    cat3name: "공원", kind: "mixed",
    themes: ["park"], subArea: "월미도", emoji: "🌳",
    barrier: { rental: "N", toilet: "Y", enterable: "Y", parking: "Y" },
    usageHour: "09:00~21:00",
    tip: "공원 입구부터 유람선 승강장까지 완만한 경사로예요. 낮 시간엔 문화거리 공연이 열려요.",
  },
  /* -------------------------- 경남 (남해) -------------------------- */
  {
    contentid: "OT3660001",
    title: "통영 해변 데크산책로",
    addr1: "경상남도 통영시 도남동",
    areacode: "36", sigungucode: "2",
    cat3name: "해수욕장/해변", kind: "outdoor",
    themes: ["sea", "park"], subArea: "통영", emoji: "🌉",
    barrier: { rental: "N", toilet: "Y", enterable: "Y", parking: "Y" },
    usageHour: "연중무휴",
    tip: "한려수도 뱃길 전망이 보이는 데크예요. 유람선 승선 시 무턱 경사로 승강장을 이용해요.",
  },
  {
    contentid: "OT3660002",
    title: "거제 바람의 언덕 평지정원",
    addr1: "경상남도 거제시 상동",
    areacode: "36", sigungucode: "2",
    cat3name: "공원", kind: "mixed",
    themes: ["park"], subArea: "거제", emoji: "🌺",
    barrier: { rental: "N", toilet: "Y", enterable: "Y", parking: "Y" },
    usageHour: "09:00~19:00",
    tip: "정원 메인 동선이 평평한 카페트길이라 유모차·보행기 모두 편해요.",
  },
  /* -------------------------- 경북 (동해 남부) -------------------------- */
  {
    contentid: "OT3560001",
    title: "포항 영일대 해변 데크",
    addr1: "경상북도 포항시 북구 두호동",
    areacode: "35", sigungucode: "2",
    cat3name: "해수욕장/해변", kind: "outdoor",
    themes: ["sea"], subArea: "포항", emoji: "🏖️",
    barrier: { rental: "N", toilet: "Y", enterable: "Y", parking: "Y" },
    usageHour: "연중무휴",
    tip: "해변 열차 승강장까지 데크가 이어져요. 바람은 아침이 가장 적어요.",
  },
  {
    contentid: "OT3560002",
    title: "울진 죽도 해안 목데크",
    addr1: "경상북도 울진군 죽도면",
    areacode: "35", sigungucode: "3",
    cat3name: "해수욕장/해변", kind: "outdoor",
    themes: ["sea"], subArea: "울진", emoji: "🌉",
    barrier: { rental: "N", toilet: "Y", enterable: "Y", parking: "Y" },
    usageHour: "연중무휴",
    tip: "죽도 방파제까지 목데크가 이어져요. 낚시 인파는 오후에 늘어 아침 방문을 권해요.",
  },
];

/* ========================= 무장애 탐방로 ========================= */
const TRAILS = [
  /* -------------------------- 부산 -------------------------- */
  {
    trailId: "TR-BS-01",
    agency: "부산 해운대구",
    parkName: "해운대 해변 데크길",
    trailName: "구멍새길 목데크 구간",
    subArea: "해운대", themes: ["sea"], emoji: "🌉",
    distance: "1.8km", duration: "50분",
    maxSlope: 4.2, slopeRating: "완만(쉬움)",
    surface: "목재 데크 + 무턱 포장",
    startPoint: "해운대해수욕장 중앙광장",
    endPoint: "동백섬 입구",
    handrail: "Y", restArea: "Y", accessibleToilet: "Y",
    tip: "데크가 해수면 높이라 파도 튀는 날엔 안전 난간 가까이 걷세요.",
  },
  {
    trailId: "TR-BS-02",
    agency: "부산 해운대구",
    parkName: "동백섬 산책로",
    trailName: "동백섬 평지 회로",
    subArea: "동백섬", themes: ["sea", "park"], emoji: "🌴",
    distance: "1.0km", duration: "40분",
    maxSlope: 5.5, slopeRating: "완만(쉬움)",
    surface: "매끈 포장 + 부분 데크",
    startPoint: "동백섬 주차장",
    endPoint: "동백섬 등대",
    handrail: "Y", restArea: "Y", accessibleToilet: "Y",
    tip: "회로 구간이라 중간에 돌아와도 좋아요. 등대 앞에 저상 테이블 벤치가 있어요.",
  },
  {
    trailId: "TR-BS-03",
    agency: "부산 기장군",
    parkName: "기장 해안 데크길",
    trailName: "오랑해변 데크 구간",
    subArea: "기장", themes: ["sea"], emoji: "🌉",
    distance: "1.2km", duration: "40분",
    maxSlope: 6.8, slopeRating: "완만(쉬움)",
    surface: "콘크리트 데크",
    startPoint: "오랑해변 주차장",
    endPoint: "오랑 갯바위 전망점",
    handrail: "Y", restArea: "Y", accessibleToilet: "Y",
    tip: "전망점까지 데크가 이어져요. 바람 많은 날엔 후드 챙기세요.",
  },
  {
    trailId: "TR-BS-04",
    agency: "부산 기장군",
    parkName: "기장 갈치봉 탐방로",
    trailName: "갈치봉 능선 구간",
    subArea: "기장", themes: ["park"], emoji: "⛰️",
    distance: "2.6km", duration: "90분",
    maxSlope: 11.8, slopeRating: "보통(경사 있음)",
    surface: "자연흙 + 계단",
    startPoint: "갈치봉 등산로 입구",
    endPoint: "갈치봉 정상",
    handrail: "N", restArea: "N", accessibleToilet: "N",
    tip: "경사가 있어 보행 보조기에는 부적합한 구간이에요.",
  },
  {
    trailId: "TR-BS-05",
    agency: "부산 수영구",
    parkName: "광안리 해변 보행데크",
    trailName: "광안대교 전망 데크",
    subArea: "광안리", themes: ["sea"], emoji: "🌉",
    distance: "1.4km", duration: "45분",
    maxSlope: 3.6, slopeRating: "완만(매우 쉬움)",
    surface: "무턱 방수 데크",
    startPoint: "광안리 해변 주차장",
    endPoint: "민락 수변공원 입구",
    handrail: "Y", restArea: "Y", accessibleToilet: "Y",
    tip: "야경이 좋아 저녁 산책에 적합해요. 데크 틈새로 바람이 불어 담요를 챙기세요.",
  },

  /* -------------------------- 서울 -------------------------- */
  {
    trailId: "TR-SL-01",
    agency: "서울 한강사업본부",
    parkName: "여의도 한강공원",
    trailName: "한강 둘레길 평지 구간",
    subArea: "여의도", themes: ["park", "sea"], emoji: "🌳",
    distance: "2.4km", duration: "60분",
    maxSlope: 3.1, slopeRating: "완만(매우 쉬움)",
    surface: "무턱 아스팔트 + 데크",
    startPoint: "여의도동 주차장 안내소",
    endPoint: "한강 전망 광장",
    handrail: "Y", restArea: "Y", accessibleToilet: "Y",
    tip: "구간 중간 이동 화장실도 있어요. 벚꽃철엔 데크가 붐비니 오전 산책을 권해요.",
  },
  {
    trailId: "TR-SL-02",
    agency: "서울시 설계",
    parkName: "서울식물원",
    trailName: "호수 데크 산책로",
    subArea: "마곡", themes: ["park"], emoji: "🌿",
    distance: "1.5km", duration: "45분",
    maxSlope: 4.6, slopeRating: "완만(쉬움)",
    surface: "목재 데크",
    startPoint: "주 전시관 정문",
    endPoint: "호수 전망 데크",
    handrail: "Y", restArea: "Y", accessibleToilet: "Y",
    tip: "비 오는 날엔 주 전시관(실내)에서 데크 일부만 잠깐 이동해요.",
  },
  {
    trailId: "TR-SL-03",
    agency: "서울숲관리사업소",
    parkName: "서울숲",
    trailName: "문화예술공원 평지 데크",
    subArea: "서울숲", themes: ["park"], emoji: "🌲",
    distance: "1.9km", duration: "50분",
    maxSlope: 3.8, slopeRating: "완만(매우 쉬움)",
    surface: "무턱 데크 + 포장",
    startPoint: "서울숲 주차장",
    endPoint: "잔디광장",
    handrail: "Y", restArea: "Y", accessibleToilet: "Y",
    tip: "잔디광장 가장자리 데크가 가장 평평해요. 도서 카페 쉼터도 있어요.",
  },
  {
    trailId: "TR-SL-04",
    agency: "국립공원공단 북한산",
    parkName: "북한산국립공원",
    trailName: "우이천 입구 능선 구간",
    subArea: "북한산", themes: ["park"], emoji: "⛰️",
    distance: "2.2km", duration: "80분",
    maxSlope: 12.5, slopeRating: "보통(경사 있음)",
    surface: "자연흙 + 계단",
    startPoint: "우이 입구",
    endPoint: "빼떼바위",
    handrail: "N", restArea: "N", accessibleToilet: "N",
    tip: "경사가 있어 보행 보조기에는 부적합한 구간이에요.",
  },

  /* -------------------------- 제주 -------------------------- */
  {
    trailId: "TR-JJ-01",
    agency: "제주 애월읍",
    parkName: "협재 해변",
    trailName: "협재 목데크 구간",
    subArea: "애월/협재", themes: ["sea"], emoji: "🌉",
    distance: "0.8km", duration: "25분",
    maxSlope: 3.6, slopeRating: "완만(매우 쉬움)",
    surface: "목재 데크",
    startPoint: "협재 서비스센터",
    endPoint: "협재 해변 그늘 쉘터",
    handrail: "Y", restArea: "Y", accessibleToilet: "Y",
    tip: "데크가 모래 위에 설치돼 바다 앞까지 이동이 쉬워요. 휠체어 바퀴에 모래가 붙으면 서비스센터에서 물 세척이 돼요.",
  },
  {
    trailId: "TR-JJ-02",
    agency: "제주 조천읍",
    parkName: "새별오름",
    trailName: "새별오름 완만 탐방로",
    subArea: "조천", themes: ["park"], emoji: "🌄",
    distance: "1.3km", duration: "45분",
    maxSlope: 7.9, slopeRating: "완만(쉬움)",
    surface: "계단식 데크 + 완경사 포장",
    startPoint: "새별오름 주차장",
    endPoint: "정상 전망대",
    handrail: "Y", restArea: "Y", accessibleToilet: "Y",
    tip: "중간 쉼터에서 봄나물 논 풍경이 보여요. 전망대 입구까지 데크가 이어져요.",
  },
  {
    trailId: "TR-JJ-03",
    agency: "제주 한라산 북부",
    parkName: "돈내코 계곡",
    trailName: "돈내코 데크길",
    subArea: "돈내코", themes: ["park"], emoji: "🌲",
    distance: "1.1km", duration: "35분",
    maxSlope: 5.2, slopeRating: "완만(쉬움)",
    surface: "무턱 데크",
    startPoint: "돈내코 주차장",
    endPoint: "계곡 전망 쉼터",
    handrail: "Y", restArea: "Y", accessibleToilet: "Y",
    tip: "곰솔 숲 사이 데크라 여름에도 시원해요. 쉼터마다 저상 벤치가 있어요.",
  },
  {
    trailId: "TR-JJ-04",
    agency: "제주 서귀포시",
    parkName: "서귀포 올레",
    trailName: "천제연 인근 올레 구간",
    subArea: "서귀포", themes: ["park"], emoji: "⛰️",
    distance: "1.6km", duration: "55분",
    maxSlope: 10.4, slopeRating: "보통(경사 있음)",
    surface: "자연길 + 경사로",
    startPoint: "천제연폭포 상류 주차장",
    endPoint: "올레 길 입구",
    handrail: "N", restArea: "N", accessibleToilet: "N",
    tip: "경사가 있어 보행 보조기에는 부적합한 구간이에요.",
  },

  /* -------------------------- 강원 (동해) -------------------------- */
  {
    trailId: "TR-GW-01",
    agency: "강원 강릉시",
    parkName: "경포 해변 데크길",
    trailName: "경포대 평지 데크 구간",
    subArea: "강릉", themes: ["sea"], emoji: "🌉",
    distance: "1.5km", duration: "45분",
    maxSlope: 4.8, slopeRating: "완만(쉬움)",
    surface: "목재 데크 + 무턱 포장",
    startPoint: "경포해수욕장 주차장",
    endPoint: "경포대 입구 광장",
    handrail: "Y", restArea: "Y", accessibleToilet: "Y",
    tip: "데크 중간에 쉼터 벤치가 있어 중간에 쉬어 가도 돼요.",
  },
  {
    trailId: "TR-GW-02",
    agency: "강원 속초시",
    parkName: "속초 해변 산책로",
    trailName: "설악정자 → 대포항 데크",
    subArea: "속초", themes: ["sea"], emoji: "🌉",
    distance: "2.0km", duration: "60분",
    maxSlope: 6.2, slopeRating: "완만(쉬움)",
    surface: "무턱 방수 데크",
    startPoint: "설악정자 방파제",
    endPoint: "대포항 인근 데크 출구",
    handrail: "Y", restArea: "Y", accessibleToilet: "Y",
    tip: "바다가 보이는 긴 데크예요. 겨울철 바람이 강해 방한용품을 챙기세요.",
  },
  /* -------------------------- 인천 (서해) -------------------------- */
  {
    trailId: "TR-IC-01",
    agency: "인천 중구",
    parkName: "을왕리 해변 데크길",
    trailName: "을왕리 은해산 목데크 구간",
    subArea: "을왕리", themes: ["sea"], emoji: "🌉",
    distance: "1.2km", duration: "40분",
    maxSlope: 5.0, slopeRating: "완만(쉬움)",
    surface: "목재 데크",
    startPoint: "을왕리해수욕장 안내센터",
    endPoint: "은해산 전망휴게소",
    handrail: "Y", restArea: "Y", accessibleToilet: "Y",
    tip: "전망휴게소에서 서해 방면 바다가 보여요.",
  },
  /* -------------------------- 경남 (남해) -------------------------- */
  {
    trailId: "TR-GN-01",
    agency: "경남 통영시",
    parkName: "통영 해안 데크길",
    trailName: "유람선 승강장 → 방패섬 전망 데크",
    subArea: "통영", themes: ["sea"], emoji: "🌉",
    distance: "1.3km", duration: "40분",
    maxSlope: 5.8, slopeRating: "완만(쉬움)",
    surface: "무턱 방수 데크",
    startPoint: "통영 유람선 터미널",
    endPoint: "방패섬 전망대 입구",
    handrail: "Y", restArea: "Y", accessibleToilet: "Y",
    tip: "뱃길 풍경이 좋아 오전 뱃놀이 후 산책 코스로 적합해요.",
  },
  /* -------------------------- 경북 (동해 남부) -------------------------- */
  {
    trailId: "TR-GB-01",
    agency: "경북 포항시",
    parkName: "영일대 해변 데크길",
    trailName: "영일대 해변 보행데크",
    subArea: "포항", themes: ["sea"], emoji: "🌉",
    distance: "1.7km", duration: "50분",
    maxSlope: 3.9, slopeRating: "완만(매우 쉬움)",
    surface: "무턱 방수 데크",
    startPoint: "영일대해변수욕장 주차장",
    endPoint: "해변 열차 승강장",
    handrail: "Y", restArea: "Y", accessibleToilet: "Y",
    tip: "해변 열차와 연계하면 산책 후 이동이 편해요.",
  },
];

/* ============================ 식당 ============================ */
const RESTAURANTS = [
  /* -------------------------- 부산 -------------------------- */
  {
    bizesId: "SGB6600121",
    bizesNm: "해운대 솥밥집",
    indsLclsNm: "음식", indsMclsNm: "한식", indsSclsNm: "백반/가정식",
    rdnmAdr: "부산 해운대구 해운대해변로 235, 1층",
    subAreas: ["해운대", "동백섬"],
    xswftm: "129.1603", yswftm: "35.1586",
    access: { stepFree: true, toilet: true, lowTable: true, parking: true, memo: "입구 평평, 안쪽 저상 테이블 먼저 안내받기" },
    tip: "주말 12시~1시는 대기가 있어 11시 30분 방문을 권해요.",
  },
  {
    bizesId: "SGB6600122",
    bizesNm: "동백섬 물회집",
    indsLclsNm: "음식", indsMclsNm: "한식", indsSclsNm: "해물/생선",
    rdnmAdr: "부산 해운대구 중동 1230, 동백섬 주차장 반대편",
    subAreas: ["동백섬", "해운대"],
    xswftm: "129.1681", yswftm: "35.1563",
    access: { stepFree: true, toilet: false, lowTable: false, parking: true, memo: "문 폭 90cm 이상, 휠체어 테이블 2개" },
    tip: "휠체어용 넓은 테이블은 창가 자리, 미리 말씀하면 배려받을 수 있어요.",
  },
  {
    bizesId: "SGB6600123",
    bizesNm: "송정 갈치구이집",
    indsLclsNm: "음식", indsMclsNm: "한식", indsSclsNm: "해물/생선",
    rdnmAdr: "부산 해운대구 송정구서로 61, 1층",
    subAreas: ["송정", "기장"],
    xswftm: "129.1857", yswftm: "35.1801",
    access: { stepFree: true, toilet: true, lowTable: true, parking: false, memo: "주차는 해변열차 주차장 이용" },
    tip: "갈치구이는 2인분부터 조리되지만 반반 조리 요청이 가능해요.",
  },
  {
    bizesId: "SGB6600124",
    bizesNm: "기장 왕솥밥",
    indsLclsNm: "음식", indsMclsNm: "한식", indsSclsNm: "백반/가정식",
    rdnmAdr: "부산 기장군 기장읍 기장해안로 26, 1층",
    subAreas: ["기장"],
    xswftm: "129.2142", yswftm: "35.2447",
    access: { stepFree: true, toilet: true, lowTable: true, parking: true, memo: "입구 무턱, 화장실 안쪽 손잡이 있음" },
    tip: "식사 후 해안 데크길 입구까지 도보 3분이에요.",
  },
  {
    bizesId: "SGB6600125",
    bizesNm: "광안리 씨푸드 파크",
    indsLclsNm: "음식", indsMclsNm: "횟집/해산물", indsSclsNm: "해산물",
    rdnmAdr: "부산 수영구 광안해변로 219, 1~2층",
    subAreas: ["광안리"],
    xswftm: "129.1684", yswftm: "35.1557",
    access: { stepFree: true, toilet: true, lowTable: false, parking: true, memo: "1층만 무장애, 2층은 계단" },
    tip: "예약 시 '1층 휠체어 자리'라고 말하면 창가 자리로 안내돼요.",
  },
  {
    bizesId: "SGB6600126",
    bizesNm: "해운대 유리테라스",
    indsLclsNm: "음식", indsMclsNm: "카페/양식", indsSclsNm: "브런치",
    rdnmAdr: "부산 해운대구 해운대로 570, 2층",
    subAreas: ["해운대"],
    xswftm: "129.1526", yswftm: "35.1631",
    access: { stepFree: false, toilet: false, lowTable: false, parking: false, memo: "입구 계단 2단, 경사로 미설치" },
    tip: "입구에 단차가 있어 휠체어 이용은 어려워요.",
  },

  /* -------------------------- 서울 -------------------------- */
  {
    bizesId: "SGB1100121",
    bizesNm: "여의도 봄나물 밥상",
    indsLclsNm: "음식", indsMclsNm: "한식", indsSclsNm: "백반/가정식",
    rdnmAdr: "서울 영등포구 여의대방로 44, 1층",
    subAreas: ["여의도"],
    xswftm: "126.9241", yswftm: "37.5216",
    access: { stepFree: true, toilet: true, lowTable: true, parking: true, memo: "입구 무턱, 저상 테이블 4석" },
    tip: "점심 11시 30분 오픈이라 그때 들어가면 자리가 여유로워요.",
  },
  {
    bizesId: "SGB1100122",
    bizesNm: "마곡 자연식당",
    indsLclsNm: "음식", indsMclsNm: "한식", indsSclsNm: "채식/건강식",
    rdnmAdr: "서울 강서구 마곡중앙로 126, 1층",
    subAreas: ["마곡"],
    xswftm: "126.8295", yswftm: "37.5678",
    access: { stepFree: true, toilet: true, lowTable: true, parking: true, memo: "식물원 정문 도보 5분" },
    tip: "맑은 채식 메뉴가 많아 어르신 입맛에 부담이 적어요.",
  },
  {
    bizesId: "SGB1100123",
    bizesNm: "성수 저상 카페리",
    indsLclsNm: "음식", indsMclsNm: "카페/디저트", indsSclsNm: "카페",
    rdnmAdr: "서울 성동구 뚝섬로 302, 1층",
    subAreas: ["서울숲"],
    xswftm: "127.0504", yswftm: "37.5447",
    access: { stepFree: true, toilet: true, lowTable: true, parking: false, memo: "서울숲 주차장 이용 권장" },
    tip: "커피와 함께 어르신 과일주스 메뉴가 별도로 있어요.",
  },
  {
    bizesId: "SGB1100124",
    bizesNm: "인사동 솥밥집",
    indsLclsNm: "음식", indsMclsNm: "한식", indsSclsNm: "백반/가정식",
    rdnmAdr: "서울 종로구 인사동길 33, 지하1층~1층",
    subAreas: ["광화문"],
    xswftm: "126.9858", yswftm: "37.5716",
    access: { stepFree: true, toilet: true, lowTable: false, parking: true, memo: "1층 좌석만 무장애, 엘리베이터 있음" },
    tip: "지하 식당가 대신 1층 휠체어 자리를 요청하세요.",
  },
  {
    bizesId: "SGB1100125",
    bizesNm: "여의도 유리궁전",
    indsLclsNm: "음식", indsMclsNm: "한식", indsSclsNm: "맥주/호프",
    rdnmAdr: "서울 영등포구 여의동로 330, 2층",
    subAreas: ["여의도"],
    xswftm: "126.9333", yswftm: "37.5292",
    access: { stepFree: false, toilet: false, lowTable: false, parking: false, memo: "입구 단차 1단, 경사로 미설치" },
    tip: "입구에 단차가 있어 휠체어 이용은 어려워요.",
  },

  /* -------------------------- 제주 -------------------------- */
  {
    bizesId: "SGB5000121",
    bizesNm: "협재 해물뚝배기",
    indsLclsNm: "음식", indsMclsNm: "한식", indsSclsNm: "해물/생선",
    rdnmAdr: "제주 제주시 애월읍 협재1길 12, 1층",
    subAreas: ["애월/협재"],
    xswftm: "126.6299", yswftm: "33.4647",
    access: { stepFree: true, toilet: true, lowTable: true, parking: true, memo: "해변 서비스센터 도보 2분" },
    tip: "해물뚝배기는 어르신이 먹기 좋게 국물 적게 요청 가능해요.",
  },
  {
    bizesId: "SGB5000122",
    bizesNm: "조천 바다밥상",
    indsLclsNm: "음식", indsMclsNm: "한식", indsSclsNm: "해물/생선",
    rdnmAdr: "제주 제주시 조천읍 신촌리 2531, 1층",
    subAreas: ["조천"],
    xswftm: "126.7215", yswftm: "33.5067",
    access: { stepFree: true, toilet: true, lowTable: true, parking: true, memo: "새별오름 입구에서 차량 10분" },
    tip: "점심 메뉴에 연하장(무치기 쉬운) 반찬 구성을 요청할 수 있어요.",
  },
  {
    bizesId: "SGB5000123",
    bizesNm: "돈내코 곰솔채식",
    indsLclsNm: "음식", indsMclsNm: "한식", indsSclsNm: "채식/건강식",
    rdnmAdr: "제주 제주시 아라일동 1456, 1층",
    subAreas: ["돈내코", "조천"],
    xswftm: "126.6836", yswftm: "33.4438",
    access: { stepFree: true, toilet: true, lowTable: false, parking: true, memo: "계곡 데크 입구 도보 3분" },
    tip: "산책 후 도라지 차가 따뜻하게 준비돼 있어요.",
  },
  {
    bizesId: "SGB5000124",
    bizesNm: "서귀포 갈치조림집",
    indsLclsNm: "음식", indsMclsNm: "한식", indsSclsNm: "해물/생선",
    rdnmAdr: "제주 서귀포시 중정로 51, 1층",
    subAreas: ["서귀포"],
    xswftm: "126.5216", yswftm: "33.2487",
    access: { stepFree: true, toilet: false, lowTable: true, parking: true, memo: "화장실은 옆 건물 1층 공용" },
    tip: "조림은 뼈 제거 요청이 가능해요.",
  },
  {
    bizesId: "SGB5000125",
    bizesNm: "애월 돌하르방 파스타",
    indsLclsNm: "음식", indsMclsNm: "카페/양식", indsSclsNm: "양식",
    rdnmAdr: "제주 제주시 애월읍 애월해안로 219, 2층",
    subAreas: ["애월/협재"],
    xswftm: "126.5442", yswftm: "33.4669",
    access: { stepFree: false, toilet: false, lowTable: false, parking: false, memo: "계단식 2층 입점, 엘리베이터 없음" },
    tip: "계단 위 2층 자리라 휠체어 이용은 어려워요.",
  },

  /* -------------------------- 강원 (동해) -------------------------- */
  {
    bizesId: "SGB3260001",
    bizesNm: "강릉 커피거리 해맞이카페",
    indsLclsNm: "음식", indsMclsNm: "카페/양식", indsSclsNm: "카페",
    rdnmAdr: "강원 강릉시 창해로 307, 1층",
    subAreas: ["강릉"],
    xswftm: "128.8988", yswftm: "37.7630",
    access: { stepFree: true, toilet: true, lowTable: true, parking: true, memo: "입구 무턱, 안쪽 저상 좌석 안내" },
    tip: "창가 바다뷰 좌석은 1층 안쪽, 미리 말하면 안내돼요.",
  },
  {
    bizesId: "SGB3260002",
    bizesNm: "속초 대포항 물회집",
    indsLclsNm: "음식", indsMclsNm: "한식", indsSclsNm: "해물/생선",
    rdnmAdr: "강원 속초시 설악로 66, 1층",
    subAreas: ["속초"],
    xswftm: "128.5897", yswftm: "38.2035",
    access: { stepFree: true, toilet: false, lowTable: false, parking: true, memo: "문 폭 90cm, 휠체어 테이블 1개" },
    tip: "휠체어 테이블은 한 개라 방문 전 전화 확인을 권해요.",
  },
  /* -------------------------- 인천 (서해) -------------------------- */
  {
    bizesId: "SGB2260001",
    bizesNm: "을왕리 바다횟집",
    indsLclsNm: "음식", indsMclsNm: "횟집/해산물", indsSclsNm: "해산물",
    rdnmAdr: "인천 중구 을왕대로 78, 1층",
    subAreas: ["을왕리"],
    xswftm: "126.7053", yswftm: "37.4560",
    access: { stepFree: true, toilet: true, lowTable: false, parking: true, memo: "입구 평평, 화장실 연결길 무턱" },
    tip: "해물탕은 2인분부터 조리되지만 반반 요청이 가능해요.",
  },
  /* -------------------------- 경남 (남해) -------------------------- */
  {
    bizesId: "SGB3660001",
    bizesNm: "통영 항남 물장수",
    indsLclsNm: "음식", indsMclsNm: "한식", indsSclsNm: "해물/생선",
    rdnmAdr: "경남 통영시 항남길 25, 1층",
    subAreas: ["통영"],
    xswftm: "128.4358", yswftm: "34.8526",
    access: { stepFree: true, toilet: true, lowTable: true, parking: true, memo: "입구 무턱, 저상 테이블 2개" },
    tip: "유람선 터미널에서 도보 5분, 식사 후 데크길 산책이 이어져요.",
  },
  /* -------------------------- 경북 (동해 남부) -------------------------- */
  {
    bizesId: "SGB3560001",
    bizesNm: "포항 두두 물회밥집",
    indsLclsNm: "음식", indsMclsNm: "한식", indsSclsNm: "해물/생선",
    rdnmAdr: "경북 포항시 북구 두두로 30, 1층",
    subAreas: ["포항"],
    xswftm: "129.3682", yswftm: "36.0418",
    access: { stepFree: true, toilet: true, lowTable: false, parking: true, memo: "입구 무턱, 계단 없는 1층" },
    tip: "식사 후 영일대 데크길 입구까지 도보 4분이에요.",
  },
];

/** 지역별 기본 코스에서 우선 참조할 대표 서브지역 */
const REGION_MAIN_SUBAREA = {
  부산: "해운대",
  서울: "여의도",
  제주: "애월/협재",
  강원: "강릉",
  인천: "을왕리",
  경남: "통영",
  경북: "포항",
};

/** 상권정보 반경 조회 등에 쓰는 지역 대표 좌표(WGS84) — 관광지 좌표가 없을 때 폴백 */
const REGION_CENTER = {
  부산: { x: "129.1583", y: "35.1583" },  // 해운대
  서울: { x: "126.9241", y: "37.5216" },  // 여의도
  제주: { x: "126.6299", y: "33.4647" },  // 협재
  강원: { x: "128.8970", y: "37.7521" },  // 강릉
  인천: { x: "126.7056", y: "37.4564" },  // 을왕리
  경남: { x: "128.4365", y: "34.8574" },  // 통영
  경북: { x: "129.3435", y: "36.0190" },  // 포항 시청
  울산: { x: "129.3114", y: "35.5399" },  // 울산 시청
  경기: { x: "127.0096", y: "37.2790" },  // 수원
  대전: { x: "127.3849", y: "36.3510" },  // 대전
  대구: { x: "128.6014", y: "35.8686" },  // 대구
  광주: { x: "126.8514", y: "35.1595" },  // 광주
  세종: { x: "127.2891", y: "36.4801" },  // 세종
  충북: { x: "127.4914", y: "36.6424" },  // 청주
  충남: { x: "127.1520", y: "36.8065" },  // 천안
  전북: { x: "127.1490", y: "35.8196" },  // 전주
  전남: { x: "127.6622", y: "34.7604" },  // 여수
};

/* ============================ 무장애 숙소(호텔) ============================ */
/**
 * 1박 2일 코스용 샘플 — TourAPI 숙박 콘텐츠(contenttypeid=32) 스타일.
 * 라이브에서는 한국관광공사_무장애 여행 정보(KorWithService2) areaBasedList2의
 * 숙박 카테고리를 사용하고, 실패 시 이 샘플로 폴백한다.
 */
const HOTELS = [
  {
    contentid: "HT-BS-01",
    title: "해운대 오션 무장애 호텔",
    addr1: "부산광역시 해운대구 해운대해변로 298",
    subArea: "해운대",
    barrier: { rental: "Y", toilet: "Y", enterable: "Y", elevator: "Y", parking: "Y" },
    roomInfo: "졸대 폭 90cm 이상 객실 4개, 욕실 손잡이·미닫이 문",
    tip: "오션뷰 무장애 객실은 한정 수량 — 예약 시 '휠체어 객실'로 꼭 요청하세요.",
  },
  {
    contentid: "HT-SL-01",
    title: "여의도 강변 무장애 호텔",
    addr1: "서울특별시 영등포구 여의대방로 110",
    subArea: "여의도",
    barrier: { rental: "N", toilet: "Y", enterable: "Y", elevator: "Y", parking: "Y" },
    roomInfo: "전 객실 미닫이 출입문, 배리어프리 유닛 6개",
    tip: "한강 산책로와 지하로 연결돼 재초점 산책에 좋아요.",
  },
  {
    contentid: "HT-JJ-01",
    title: "애월 바다 무장애 리조트",
    addr1: "제주특별자치도 제주시 애월읍 애월해안로 320",
    subArea: "애월",
    barrier: { rental: "Y", toilet: "Y", enterable: "Y", elevator: "Y", parking: "Y" },
    roomInfo: "1층 바다뷰 배리어프리 객실, 화장실 문 폭 100cm",
    tip: "1층 객실은 수가 적어 이른 시간 예약을 권해요.",
  },
  {
    contentid: "HT-GW-01",
    title: "경포 수변 무장애 호텔",
    addr1: "강원특별자치도 강릉시 창해로 307",
    subArea: "강릉",
    barrier: { rental: "Y", toilet: "Y", enterable: "Y", elevator: "Y", parking: "Y" },
    roomInfo: "무장애 유닛 5개, 객실 내 욕창 방지 손잡이",
    tip: "커피거리 도보권이라 저녁 카페 산책까지 이어가기 좋아요.",
  },
  {
    contentid: "HT-IC-01",
    title: "을왕리 프론트씨 무장애 호텔",
    addr1: "인천광역시 중구 을왕대로 78",
    subArea: "을왕리",
    barrier: { rental: "N", toilet: "Y", enterable: "Y", elevator: "Y", parking: "Y" },
    roomInfo: "졸대 없는 입구, 접이식 샤워 의자 비치",
    tip: "해변 데크길 정면 — 저녁 야경 산책에 최적이에요.",
  },
  {
    contentid: "HT-GN-01",
    title: "통영 해안 무장애 호텔",
    addr1: "경상남도 통영시 항남길 25",
    subArea: "통영",
    barrier: { rental: "N", toilet: "Y", enterable: "Y", elevator: "Y", parking: "Y" },
    roomInfo: "배리어프리 객실 3개, 객실 캐시워크 포함",
    tip: "유람선 터미널 도보 5분 — 뱃길 일정과 연결이 쉬워요.",
  },
  {
    contentid: "HT-GB-01",
    title: "영일대 파도 무장애 호텔",
    addr1: "경상북도 포항시 북구 두두로 30",
    subArea: "포항",
    barrier: { rental: "Y", toilet: "Y", enterable: "Y", elevator: "Y", parking: "Y" },
    roomInfo: "무장애 객실 4개, 해변 데크길 직결 통로",
    tip: "해변 열차 승강장까지 데크로 연결돼요.",
  },
];


/* ====== js/nlu.js ====== */
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
function parseIntent(rawText) {
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
function defaultRegion(themes) {
  if (themes.includes("indoor") || themes.includes("culture")) return "서울";
  if (themes.includes("sea")) return "부산";
  return "서울";
}


/* ====== js/tools.js ====== */
/**
 * tools.js — 에이전트 도구 계층 (Function Calling 대상 3종)
 *
 * 각 도구는 OpenAI 스타일 함수 정의(name/description/parameters)를 갖고,
 * 호출 시 다음 순서로 동작한다.
 *   1) 실시간 모드 + API 키가 있으면 공공데이터포털 실제 호출 시도 (LIVE_APIS)
 *   2) 실패(키 없음·CORS·형식 불일치) 시 동일 스펙의 내장 샘플 데이터로 자동 폴백
 *   3) 필터링 규칙(경사도 8% 이하, 출입구 턱 없음 등)을 적용하고
 *      '제외 사유'까지 반환해 에이전트가 근거를 화면에 표시할 수 있게 한다.
 */


/* ---------------------- 도구 정의(스키마) ---------------------- */

const TOOL_SPECS = [
  {
    name: "searchOpenTouristSpots",
    label: "한국관광공사·열린관광지 정보 API",
    icon: "🏛️",
    description: "휠체어 대여, 장애인 화장실, 휠체어 진입 등 무장애 정보가 완비된 관광지를 검색한다.",
    parameters: {
      type: "object",
      properties: {
        region: { type: "string", description: "지역명 (전국 시·도: 부산/서울/제주/강원/인천/경남/경북 등)" },
        themes: { type: "array", items: { type: "string" }, description: "테마 (sea/park/culture/indoor)" },
        indoorOnly: { type: "boolean", description: "우천 시 실내·반실내 장소만" },
      },
      required: ["region"],
    },
  },
  {
    name: "searchAccessibleTrails",
    label: "국립공원공단·지자체 무장애 탐방로(데크길) API",
    icon: "🌲",
    description: "최대 경사도 8% 이하의 완만한 산책로·데크길을 검색한다. 경사도 기준 초과 구간은 제외한다.",
    parameters: {
      type: "object",
      properties: {
        region: { type: "string", description: "지역명" },
        themes: { type: "array", items: { type: "string" } },
        maxSlope: { type: "number", description: "허용 최대 경사도(%)", default: 8 },
      },
      required: ["region"],
    },
  },
  {
    name: "searchStayHotels",
    label: "한국관광공사·무장애 숙박(호텔) API",
    icon: "🏨",
    description: "1박 2일 코스용 — 휠체어 이용 가능한 숙소(호텔·리조트)를 검색한다.",
    parameters: {
      type: "object",
      properties: {
        region: { type: "string", description: "지역명" },
      },
      required: ["region"],
    },
  },
  {
    name: "searchStepFreeRestaurants",
    label: "소상공인시장진흥공단·상권정보 API",
    icon: "🍚",
    description: "출입구 턱이 없는(step-free) 인근 식당을 검색한다. 턱이 있는 매장은 제외한다.",
    parameters: {
      type: "object",
      properties: {
        subAreas: { type: "array", items: { type: "string" }, description: "인근 상권(서브지역) 목록" },
        region: { type: "string", description: "지역명" },
      },
      required: ["subAreas"],
    },
  },
];

/* ---------------------- 실시간 API 구성 ---------------------- */
/**
 * 공공데이터포털(data.go.kr) 실제 서비스 스펙 (2026-11 포털 End Point 확인):
 *  ① 관광지   : 한국관광공사_[개발계정]무장애 여행 정보 — KorWithService2
 *               areaBasedList2(지역별 무장애 콘텐츠) → 0건이면 searchKeyword2로 재시도,
 *               상위 3곳은 detailIntro2로 무장애 상세(휠체어 대여·화장실 등)를 검증해 배지 부여
 *  ② 탐방로   : data.go.kr에 국립공원공단 OpenAPI 미제공(파일데이터만 확인됨)
 *               → 내장 데이터 사용 (대안: 행안부 생활안전지도 safemap API 별도 연동 가능)
 *  ③ 식당     : 소상공인 상가(상권)정보 sdsc2 storeListInRadius
 *               관광지 좌표(cx, cy) 반경 600m 상가업소 중 음식점 선별
 *               ※ 상권 API에는 '출입구 턱' 정보가 없어, 라이브 결과는
 *                  '현장 확인 필요' 배지로 표시한다(무단 추정 금지 원칙).
 *  ④ 숙박     : 무장애여행 정보(KorWithService2)의 숙박 콘텐츠(contenttypeid=32)
 *               1박 2일 코스 + 숙소 옵션에서만 호출. 관광지 도구와 같은 ① 키 사용.
 *
 * 호출은 CORS 제약 때문에 1) 브라우저 직접 호출 2) serve.mjs /proxy/openapi 3) JSONP 순으로 진행된다.
 */
/* TourAPI 표준 지역코드 (areaCodeList 기준) */
const AREA_CODE = {
  서울: "1", 인천: "2", 대전: "3", 대구: "4", 광주: "5", 부산: "6", 울산: "7", 세종: "8",
  경기: "31", 강원: "32", 충북: "33", 충남: "34", 경북: "35", 경남: "36", 전북: "37", 전남: "38", 제주: "39",
};

const DEFAULT_SETTINGS = {
  useLive: false,
  keys: {
    searchOpenTouristSpots: "",
    searchAccessibleTrails: "",
    searchStepFreeRestaurants: "",
    searchStayHotels: "",
    mapKakao: "",
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------- 샘플 필터 로직 ---------------------- */

function badgeCount(spot) {
  return Object.values(spot.barrier || {}).filter((v) => v === "Y").length;
}

/** 지역명 매칭: "경남"↔"경상남도", "충북"↔"충청북도", "전남"↔"전라남도" 등 약칭/정식명 호환 */
function regionIn(region, text) {
  const t = text || "";
  const alt = {
    경남: "경상남", 경북: "경상북", 충남: "충청남", 충북: "충청북", 전남: "전라남", 전북: "전라북",
  }[region];
  return t.includes(region) || (!!alt && t.includes(alt));
}

function filterSpots(args) {
  const region = args.region || "부산";
  let items = TOURIST_SPOTS.filter((s) => regionIn(region, s.addr1));
  let regionNote = null;
  if (!items.length) {
    /* 샘플 데이터에 없는 지역 → 전국 샘플로 대체 (근거를 노트로 표시) */
    regionNote = `내장 샘플에 "${region}"이(가) 없어 전국 샘플로 대체`;
    items = TOURIST_SPOTS.slice();
  }
  items = items.map((s) => ({ ...s, _region: region }));
  const excluded = [];

  const wantIndoor = !!args.indoorOnly;
  const themes = args.themes || [];

  if (wantIndoor) {
    const indoor = items.filter((s) => s.kind === "indoor" || s.kind === "mixed");
    excluded.push(...items.filter((s) => s.kind === "outdoor").map((s) => `${s.title}(야외)`));
    items = indoor;
  }
  if (themes.length) {
    /* 테마 매칭이 충분하면 좁히고, 부족하면 지역 전체에서 배지 많은 순으로 완화 */
    const matched = items.filter((s) =>
      s.themes.some((t) => themes.includes(t)) || (wantIndoor && s.kind === "mixed"));
    if (matched.length >= 2) items = matched;
    else {
      const rest = items.filter((s) => !matched.includes(s));
      items = [...matched, ...rest];
    }
  }

  /* 순위: 무장애 배지 개수 + 테마 적합도(휠체어 대여·야외 가중, 우천 아닐 때 실내 감점) */
  const spotScore = (s) => {
    const bc = badgeCount(s);
    const tm = themes.filter((t) => s.themes?.includes(t)).length;
    let score = bc + tm * 2;
    if (s.barrier?.rental === "Y") score += 1;
    if (wantIndoor && (s.kind === "indoor" || s.kind === "mixed")) score += 1;
    if (!wantIndoor && s.kind === "outdoor") score += 0.6;
    if (!wantIndoor && s.kind === "indoor") score -= 0.8;
    return score;
  };
  items.sort((a, b) => spotScore(b) - spotScore(a));
  return { items, excluded, regionNote };
}

function filterTrails(args) {
  const region = args.region || "부산";
  const maxSlope = typeof args.maxSlope === "number" ? args.maxSlope : 8;
  let inRegion = TRAILS.filter((t) => regionIn(region, t.agency));
  let regionNote = null;
  if (!inRegion.length) {
    regionNote = `내장 샘플에 "${region}"이(가) 없어 전국 샘플로 대체`;
    inRegion = TRAILS.slice();
  }
  const ok = [];
  const excluded = [];
  for (const t of inRegion) {
    if (t.maxSlope <= maxSlope) ok.push(t);
    else excluded.push(`${t.trailName}(경사도 ${t.maxSlope}%)`);
  }
  const themes = args.themes || [];
  let items = ok;
  if (themes.length) {
    const matched = items.filter((t) => t.themes.some((x) => themes.includes(x)));
    if (matched.length >= 2) items = matched;
    else {
      const rest = items.filter((t) => !matched.includes(t));
      items = [...matched, ...rest];
    }
  }
  items.sort((a, b) => a.maxSlope - b.maxSlope);
  return { items, excluded, regionNote };
}

function filterRestaurants(args) {
  const subAreas = args.subAreas && args.subAreas.length ? args.subAreas : [];
  const region = args.region || "부산";
  let pool = RESTAURANTS.filter((r) => regionIn(region, r.rdnmAdr));
  let regionNote = null;
  if (!pool.length) {
    regionNote = `내장 샘플에 "${region}"이(가) 없어 전국 샘플로 대체`;
    pool = RESTAURANTS.slice();
  }
  const excluded = [];
  const near = pool.filter((r) => r.subAreas.some((s) => subAreas.includes(s)));
  if (near.length) pool = near;

  const ok = [];
  for (const r of pool) {
    if (r.access.stepFree) ok.push(r);
    else excluded.push(`${r.bizesNm}(출입구 턱 있음)`);
  }
  ok.sort((a, b) => (b.access.toilet ? 1 : 0) - (a.access.toilet ? 1 : 0));
  return { items: ok, excluded, regionNote };
}

function filterHotels(args) {
  const region = args.region || "부산";
  let items = HOTELS.filter((ht) => regionIn(region, ht.addr1));
  let regionNote = null;
  if (!items.length) {
    /* 숙소 샘플이 없는 지역 → 전국 샘플로 대체 (근거를 노트로 표시) */
    regionNote = `내장 샘플에 "${region}" 숙소가 없어 전국 샘플로 대체`;
    items = HOTELS.slice();
  }
  items = items.slice().sort((a, b) => badgeCount(b) - badgeCount(a));
  return { items, excluded: [], regionNote };
}

async function callTool(name, args) {
  const spec = TOOL_SPECS.find((t) => t.name === name);
  if (!spec) throw new Error(`알 수 없는 도구: ${name}`);

  await sleep(550 + Math.random() * 450); // 도구 호출 지연(시각화용)
  let filtered;
  if (name === "searchOpenTouristSpots") filtered = filterSpots(args);
  else if (name === "searchAccessibleTrails") filtered = filterTrails(args);
  else if (name === "searchStayHotels") filtered = filterHotels(args);
  else filtered = filterRestaurants(args);

  /* 라이브 실패 사유 + 샘플 대체 사유를 한 줄로 합쳐 노트 표시 */
  const note = filtered.regionNote || null;

  return {
    tool: spec,
    args,
    source: "sample",
    liveNote: note,
    items: filtered.items,
    excluded: filtered.excluded,
  };
}

/* ====== js/agent.js ====== */
/**
 * agent.js — 오픈나들이 AI 에이전트 파이프라인
 *
 * 동작 구조 (Function Calling 파이프라인):
 *
 *   사용자 발화
 *      │
 *      ├─ 1. 의도 분석 (nlu.parseIntent)  → 지역/테마/동행/우천/일정 파라미터화
 *      ├─ 2. 도구 조합 계획               → 3개 도구 호출 순서 확정
 *      ├─ 3. 도구 자율 호출 (tools.callTool)
 *      │      ① searchOpenTouristSpots     (한국관광공사 열린관광지)
 *      │      ② searchAccessibleTrails     (무장애 탐방로·데크길, 경사도 ≤8%)
 *      │      ③ searchStepFreeRestaurants  (상권정보, 출입구 턱 없음)
 *      │      ※ ③은 ①②의 결과(인근 상권)를 인자로 사용 — 도구 체이닝
 *      ├─ 4. 검증·필터링                  → 제외 사유를 근거로 반환
 *      └─ 5. 코스 조립·응답 생성          → 카드/배지/팁/초대장/후속 질문
 *
 * 각 단계는 핸들러(h)로 이벤트를 내보내 UI에서 실시간 스트리밍된다.
 */




class OutingAgent {
  constructor(settings) {
    this.settings = settings || {};
    this.lastIntent = null;   // 후속 질문("다른 코스" 등)에 재사용
    this.variants = {};       // 지역별 코스 변형 카운터
    this.regionIdx = 0;
  }

  setSettings(s) { this.settings = s; }

  /** 첫 화면 환영 답변 */
  welcome() { return greetingAnswer(); }

  /** 헤더 데이터 소스 배지 표시용 */
  sourceLabel() {
    const hasKey = Object.values(this.settings?.keys || {}).some((k) => k && k.trim());
    return this.settings?.useLive && hasKey ? "실시간 API 시도 · 내장 폴백" : "내장 샘플 데이터";
  }

  /**
   * 사용자 발화 처리
   * @param {string} text
   * @param {object} h 이벤트 핸들러 { onStatus, onStatusDone, onTool, onToolDone, onAnswer, onNote }
   * @param {object} [extras] UI 컨트롤 값 — { timeRange: { s, e } } (시간대 슬라이더, 단위: 시 8~20)
   */
  async handle(text, h, extras) {
    const intent = parseIntent(text);

    /* 인사·안내 요청 */
    if (intent.greeting) { h.onAnswer(greetingAnswer()); return; }

    /* 코스 요청 판단: 힌트가 전혀 없으면 안내 응답 */
    const hasHint = intent.region || intent.themes.length || intent.mobility.length ||
      intent.restaurantsOnly || intent.anotherCourse || intent.outing || (intent.text || "").length >= 8;
    if (!hasHint) { h.onAnswer(greetingAnswer()); return; }

    /* ---------- 1단계: 의도 분석 ---------- */
    const step0 = h.onStatus({ icon: "🧠", title: "요청 분석 중…", labels: intent.labels });
    await sleep(500);

    /* 지역 결정(후속 질문 맥락 유지) */
    let region = intent.region;
    if (intent.nextRegion) {
      this.regionIdx = (this.regionIdx + 1) % REGIONS.length;
      region = REGIONS[this.regionIdx];
    }
    if (!region) region = this.lastIntent?.region || null;
    if (!region) region = defaultRegion(intent.themes);
    this.regionIdx = Math.max(0, REGIONS.indexOf(region));

    if (intent.anotherCourse) this.variants[region] = (this.variants[region] || 0) + 1;
    const variant = this.variants[region] || 0;

    /* ---------- 일정·시간대 설정(아코디언) → 유연한 스케줄 ---------- */
    const sched = normalizeSchedule(extras?.schedule);
    /* 활동 배치 선호: 실내·문화는 관광지 고정, 산책·바다·공원은 탐방로 교차 */
    const pref = {
      trailOk: !intent.indoorOnly && !(intent.themes.length === 1 && intent.themes[0] === "culture"),
    };
    const scheduleEvents = buildSchedule(sched, pref);

    const ctx = { ...intent, region, variant, schedule: { ...sched, events: scheduleEvents } };

    /* 여행지 N곳 목록 모드: "여행지 3개 추천" — 코스가 아닌 관광지 목록으로 응답 */
    const listMode = !ctx.restaurantsOnly && !!intent.spotsList && (intent.wantN || 0) >= 2;
    if (listMode) ctx.labels.push(`형식 · 여행지 ${intent.wantN}곳 목록`);
    ctx.listMode = listMode;
    this.lastIntent = ctx;

    /* 옵션·일정 라벨 */
    if (!listMode && !ctx.restaurantsOnly) {
      if (!intent.labels.some((l) => l.startsWith("일정 ·"))) {
        intent.labels.push(`일정 · ${sched.tripType === "overnight" ? "1박 2일" : "당일"}`);
      }
      if (sched.meal && !intent.labels.some((l) => l.includes("식사") || l.includes("식당"))) intent.labels.push("식사 포함");
      if (sched.cafe) intent.labels.push("카페 포함");
    }
    const needSpots = scheduleEvents.some((ev) => ev.kind === "act" && ev.act === "spot");
    const needTrails = scheduleEvents.some((ev) => ev.kind === "act" && ev.act === "trail");
    const needRests = scheduleEvents.some((ev) => ev.kind === "lunch" || ev.kind === "cafe" || ev.kind === "dinner");
    const needHotels = sched.tripType === "overnight" && sched.hotel && scheduleEvents.some((ev) => ev.kind === "hotel");
    if (needHotels) intent.labels.push("숙소 추천 포함");

    /* 도구 조합: 일정 이벤트에 필요한 도구만 동적으로 호출 */
    const toolNames = listMode
      ? ["searchOpenTouristSpots"]
      : ctx.restaurantsOnly
        ? ["searchStepFreeRestaurants"]
        : [
            ...(needSpots ? ["searchOpenTouristSpots"] : []),
            ...(needTrails ? ["searchAccessibleTrails"] : []),
            ...(needRests ? ["searchStepFreeRestaurants"] : []),
            ...(needHotels ? ["searchStayHotels"] : []),
          ];

    const d1 = sched.d1, d2 = sched.d2;
    const schedLabel = listMode
      ? `여행지 ${intent.wantN}곳 목록`
      : `${sched.tripType === "overnight" ? "1박 2일" : "당일"} ${hh(d1.s)}~${hh(d1.e)}${sched.tripType === "overnight" ? ` / ${hh(d2.s)}~${hh(d2.e)}` : ""}`;
    h.onStatusDone(step0, `분석 완료 → 지역 "${region}" · ${schedLabel} · 도구 ${toolNames.length}개`);

    /* ---------- 2단계: 도구 조합 계획 ---------- */
    const planStep = h.onStatus({
      icon: "🗂️",
      title: "도구 조합 계획 수립",
      detail: toolNames.map((n, i) => `${i + 1}. ${TOOL_SPECS.find((t) => t.name === n).label}`).join("  →  "),
    });
    await sleep(450);
    const SHORT_TOOL = {
      searchOpenTouristSpots: "관광지",
      searchAccessibleTrails: "탐방로",
      searchStepFreeRestaurants: "인근 식당(연계)",
      searchStayHotels: "숙소",
    };
    h.onStatusDone(planStep, `호출 순서 확정: ${toolNames.map((n) => SHORT_TOOL[n]).join(" → ")}`);

    /* ---------- 3단계: 도구 자율 호출 (활동 먼저 → 체이닝으로 식당) ---------- */
    const results = {};

    if (ctx.indoorOnly && !toolNames.includes("searchAccessibleTrails")) {
      h.onNote("우천·실내 판단 → 데크길 산책 대신 실내·반실내 동선으로 구성");
    }

    /* ① 열린관광지 */
    if (toolNames.includes("searchOpenTouristSpots")) {
      const args = { region, themes: ctx.themes, indoorOnly: ctx.indoorOnly };
      results.spots = await this.#runTool(h, "searchOpenTouristSpots", args);

      if (ctx.indoorOnly && results.spots.items.length) {
        h.onNote(`우천·실내 조건 적용 → 실내·반실내 ${results.spots.items.length}곳만 통과`);
      }
    }

    /* ② 무장애 탐방로 (경사도 8% 이하) */
    if (toolNames.includes("searchAccessibleTrails")) {
      const args = { region, themes: ctx.themes, maxSlope: 8 };
      results.trails = await this.#runTool(h, "searchAccessibleTrails", args);

      const ex = results.trails.excluded;
      if (results.trails.source === "sample") {
        h.onNote(ex.length
          ? `경사도 8% 이하 필터링 → 제외: ${ex.join(", ")}`
          : "경사도 8% 이하 필터링 → 전 구간 통과");
      }
    }

    /* ④ 무장애 숙소 (1박 2일 + 숙소 옵션) */
    if (toolNames.includes("searchStayHotels")) {
      results.hotels = await this.#runTool(h, "searchStayHotels", { region });
    }

    /* 일정 이벤트에 활동 배정 (관광지·산책로 → 좌표 확정) */
    this.#assignActPicks(ctx, results, h);

    /* ③ 상권정보 식당 (선택된 활동의 좌표를 인자로 사용 — 도구 체이닝) */
    if (toolNames.includes("searchStepFreeRestaurants")) {
      const firstAct = ctx.schedule.events.find((ev) => ev.kind === "act" && ev.pick);
      const cc = REGION_CENTER[region] || {};
      const actSubs = ctx.schedule.events
        .filter((ev) => ev.kind === "act" && ev.pick)
        .map((ev) => ev.pick.subArea)
        .filter(Boolean);
      const args = {
        region,
        cx: firstAct?.pick?.xswftm || firstAct?.pick?.mapx || cc.x || "",
        cy: firstAct?.pick?.yswftm || firstAct?.pick?.mapy || cc.y || "",
        subAreas: actSubs.length ? actSubs : [REGION_MAIN_SUBAREA[region]].filter(Boolean),
      };
      results.rests = await this.#runTool(h, "searchStepFreeRestaurants", args);

      const ex = results.rests.excluded;
      if (results.rests.source === "sample") {
        h.onNote(ex.length
          ? `턱 없는 출입구 필터 → 제외: ${ex.join(", ")}`
          : "턱 없는 출입구 필터 → 전 매장 통과");
      } else if (results.rests.liveNote) {
        h.onNote(results.rests.liveNote);
      }
    }

    /* 식사·카페·숙소 이벤트에 후보 배정 */
    this.#assignRestPicks(ctx, results, h);

    /* ---------- 4~5단계: 검증·코스 조립·응답 ---------- */
    /* 여행지 목록 모드: 코스 조립 없이 관광지 N곳 목록으로 응답 */
    if (ctx.listMode) {
      const buildStep = h.onStatus({
        icon: "📋",
        title: "여행지 목록 조립 중…",
        detail: "무장애 배지 많은 순 정렬 → 상위 N곳 선별",
      });
      await sleep(500);
      const answer = this.#spotsListAnswer(ctx, results);
      h.onStatusDone(buildStep, `여행지 ${answer.cards.length}곳 목록 완성`);
      await sleep(250);
      h.onAnswer(answer);
      return;
    }
    const buildStep = h.onStatus({ icon: "✅", title: "코스 조립·안심 검증 중…", detail: "동선 순서 정렬 → 배지 부여 → 초대장 생성" });
    await sleep(600);
    const answer = this.#assembleAnswer(ctx, results);
    h.onStatusDone(buildStep, `검증 완료 · 코스 ${answer.cards.length}곳 구성`);
    await sleep(250);
    h.onAnswer(answer);
  }

  /** 도구 1회 호출 + 이벤트 스트리밍 */
  async #runTool(h, name, args) {
    const id = h.onTool({ name, args });
    const result = await callTool(name, args, this.settings);
    h.onToolDone(id, result);
    return result;
  }

  /* ================ 코스 조립 ================ */

  #pickNth(arr, variant) {
    if (!arr || !arr.length) return null;
    return arr[variant % arr.length];
  }

  #assembleAnswer(ctx, results) {
    if (ctx.restaurantsOnly) return this.#restaurantsOnlyAnswer(ctx, results);
    return this.#scheduleAnswer(ctx, results);
  }

  /* --- 유연 스케줄링 코스: 일정 이벤트 → 시간 순서 카드 조립 --- */
  #scheduleAnswer(ctx, results) {
    const sched = ctx.schedule;
    const overnight = sched.tripType === "overnight";
    const cards = [];
    let no = 1;
    for (const ev of sched.events) {
      if (!ev.pick) continue;   /* 후보 없는 이벤트는 카드 생략(노트로 안내됨) */
      const phase = schedulePhase(ev, overnight);
      if (ev.kind === "act") {
        cards.push(ev.act === "trail"
          ? this.#trailCard(ev.pick, no++, phase)
          : this.#spotCard(ev.pick, no++, phase));
      } else if (ev.kind === "hotel") {
        cards.push(this.#hotelCard(ev.pick, no++, phase));
      } else {
        cards.push(this.#restCard(ev.pick, no++, phase));
      }
    }

    const rangeText = overnight
      ? `1일차 ${hh(sched.d1.s)}~${hh(sched.d1.e)} · 2일차 ${hh(sched.d2.s)}~${hh(sched.d2.e)}`
      : `${hh(sched.d1.s)}~${hh(sched.d1.e)}`;
    const opts = [];
    if (sched.meal) opts.push("식사");
    if (sched.cafe) opts.push("카페");
    if (overnight && sched.hotel) opts.push("무장애 숙소");
    const intro = this.#scheduleIntro(ctx, rangeText, opts, cards.length);

    /* 후속 "식당만 더 보여줘" 질문을 위한 인근 상권 기억 */
    this.lastSubAreas = sched.events
      .filter((ev) => ev.kind === "act" && ev.pick && ev.pick.subArea)
      .map((ev) => ev.pick.subArea);

    const summary = this.#scheduleSummary(sched.events);
    const route = { points: routeRows(sched.events, overnight) };
    const invite = this.#scheduleInvite(sched.events, overnight, route.points);

    return {
      type: "course",
      intro,
      labels: ctx.labels,
      cards,
      summary,
      invite,
      route,
      followups: FOLLOWUP_CHIPS,
      meta: {
        source: results.spots?.source || results.rests?.source || results.hotels?.source || "sample",
        region: ctx.region,
        variant: ctx.variant,
      },
    };
  }

  /* 일정 이벤트(kind=act)에 관광지/산책로 배정 — 변형 코스 회전 */
  #assignActPicks(ctx, results, h) {
    const spots = results.spots?.items || [];
    const trails = results.trails?.items || [];
    let si = 0, ti = 0;
    let hourFallbackNoted = false;
    let unverifiedNoted = false;
    for (const ev of ctx.schedule.events) {
      if (ev.kind !== "act") continue;
      if (ev.act === "spot") {
        /* 이벤트 시간대(새벽·야간 포함)에 운영 중인 곳을 우선 배정 — 24시간 운영 장소 반영 */
        const fits = (sp) =>
          spotOpenAt(sp.usageHour, ev.start, ev.end) &&
          !(ev.start < 9 && !hoursKnown(sp.usageHour));   /* 새벽 슬롯은 운영시간 명시 곳만 */
        let pick = null, anyOpen = false, usedUnverified = false;
        if (spots.length) {
          for (let k = 0; k < spots.length; k++) {   /* 1차: 무장애 검증된 곳만 */
            const cand = spots[(ctx.variant + si + k) % spots.length];
            if (cand.liveUnverified || !fits(cand)) continue;
            pick = cand; anyOpen = true; break;
          }
          if (!pick) {
            for (let k = 0; k < spots.length; k++) {   /* 2차: 조건 완화 — 미검증 실시간 결과 허용 */
              const cand = spots[(ctx.variant + si + k) % spots.length];
              if (!fits(cand)) continue;
              pick = cand; anyOpen = true; usedUnverified = !!cand.liveUnverified; break;
            }
          }
          if (!pick) pick = spots[(ctx.variant + si) % spots.length];   /* 전부 불일치 → 회전 폴백 */
          si++;
        }
        if (spots.length && !anyOpen && !hourFallbackNoted) {
          hourFallbackNoted = true;
          h.onNote("선택 시간대에 운영 중 표시된 관광지 정보가 부족해 운영시간 확인이 필요한 곳도 함께 골랐어요.");
        }
        if (pick?.liveUnverified && !unverifiedNoted) {
          unverifiedNoted = true;
          h.onNote("무장애 검증 정보가 있는 곳이 부족해 실시간 검색 결과(⚠️ 현장 확인 필요)도 보조로 골랐어요.");
        }
        ev.pick = pick;
      } else {
        ev.pick = trails.length ? trails[(ctx.variant + ti++) % trails.length] : null;
      }
      if (!ev.pick) {
        h.onNote(`${ev.day === 2 ? "2일차" : "1일차"} ${fmtT(ev.start)} ${ev.act === "trail" ? "산책로" : "관광지"} 후보가 없어 일정에서 제외했어요.`);
      }
    }
  }

  /* 식사·카페·숙소 이벤트 배정 — 점심·저녁은 서로 다른 식당, 카페는 카페 종목 우선 */
  #assignRestPicks(ctx, results, h) {
    const rests = results.rests?.items || [];
    const hotels = results.hotels?.items || [];
    const used = new Set();
    const CAFE_RE = /카페|베이커리|브런치|디저트|다방|찻집/i;
    let lunchPickRef = null;
    const pickRest = (filterFn) => {
      const pool = filterFn ? rests.filter(filterFn) : rests.slice();
      const unused = pool.filter((r) => !used.has(r.bizesId || r.bizesNm));
      const pick = this.#pickNth(unused.length ? unused : pool, ctx.variant);
      if (pick) used.add(pick.bizesId || pick.bizesNm);
      return pick;
    };
    for (const ev of ctx.schedule.events) {
      if (ev.kind === "lunch" || ev.kind === "dinner") {
        ev.pick = pickRest();
        if (!ev.pick) {
          h.onNote(`${ev.day === 2 ? "2일차" : "1일차"} ${fmtT(ev.start)} 식당 후보가 없어 일정에서 제외했어요.`);
        } else if (ev.kind === "dinner" && lunchPickRef && (ev.pick.bizesId || ev.pick.bizesNm) === (lunchPickRef.bizesId || lunchPickRef.bizesNm)) {
          ev.pick = null;
          h.onNote("식당 후보가 하나뿐이라 저녁은 점심 장소 재방문을 권해요.");
        }
        if (ev.kind === "lunch" && ev.pick) lunchPickRef = ev.pick;
      } else if (ev.kind === "cafe") {
        ev.pick = pickRest((r) => CAFE_RE.test(`${r.indsMclsNm || ""} ${r.indsSclsNm || ""} ${r.bizesNm || ""}`)) || pickRest();
        if (!ev.pick) h.onNote(`${ev.day === 2 ? "2일차" : "1일차"} ${fmtT(ev.start)} 카페 후보가 없어 일정에서 제외했어요.`);
      } else if (ev.kind === "hotel") {
        ev.pick = hotels.length ? this.#pickNth(hotels, ctx.variant) : null;
        if (!ev.pick) h.onNote("숙소 후보가 없어 체크인 일정에서 제외했어요.");
      }
    }
  }

  /* --- 스케줄 인트로 --- */
  #scheduleIntro(ctx, rangeText, opts, cardCount) {
    const parts = [];
    if (ctx.mobility.includes("wheelchair") || ctx.mobility.includes("senior")) {
      parts.push("휠체어·보행기 이용 가족이라면 턱과 경사가 제일 큰 걱정이죠.");
    }
    if (ctx.variant > 0) parts.push("이전과 다른 조합으로 새로 검증했어요.");
    const overnight = ctx.schedule.tripType === "overnight";
    parts.push(
      `열린관광지(무장애 정보)·무장애 탐방로·상권정보${overnight ? "·숙박" : ""} 데이터를 조합해 ` +
      `${ctx.region} ${overnight ? "1박 2일" : "당일"} 코스(${rangeText})를 만들었어요. ` +
      `옵션: ${opts.length ? opts.join(" · ") : "없음"} — 시간대에 맞춰 ${cardCount}곳을 유연하게 배치했어요.`
    );
    if (ctx.schedule.meal && !ctx.schedule.events.some((ev) => ev.kind === "lunch" || ev.kind === "dinner")) {
      parts.push("식사 포함을 선택하셨지만 활동 시간에 여유가 없어 식당을 뺐어요.");
    }
    if (ctx.schedule.cafe && !ctx.schedule.events.some((ev) => ev.kind === "cafe")) {
      parts.push("카페 옵션은 활동 시간에 여유가 없어 제외했어요.");
    }
    parts.push("아래 카드를 시간 순서대로 따라가시면 돼요.");
    return parts.join(" ");
  }

  /* --- 스케줄 안심 체크포인트 --- */
  #scheduleSummary(evs) {
    const pts = [];
    for (const ev of evs) {
      if (!ev.pick) continue;
      const dayTag = ev.day === 2 ? "2일차 " : "";
      if (ev.kind === "act" && ev.act === "trail") {
        pts.push(`${dayTag}산책로 최대 경사도 ${ev.pick.maxSlope}% — 8% 이하 데크길`);
        if (ev.pick.handrail === "Y") pts.push(`${dayTag}산책로 안전 난간 완비`);
        if (ev.pick.restArea === "Y") pts.push(`${dayTag}산책로 중간 휴식 공간 완비`);
        if (ev.pick.accessibleToilet === "Y") pts.push(`${dayTag}산책로 인근 장애인 화장실 완비`);
      } else if (ev.kind === "act" && ev.act === "spot") {
        const b = ev.pick.barrier || {};
        if (b.rental === "Y") pts.push(`휠체어 대여: ${ev.pick.rentalInfo || ev.pick.title}`);
        if (b.toilet === "Y") pts.push(`${ev.pick.title} 장애인 화장실 완비`);
      } else if (ev.kind === "lunch" || ev.kind === "dinner") {
        const unv = !!ev.pick.liveUnverified;
        pts.push(`${ev.kind === "dinner" ? "저녁 식당" : "식당"} ${ev.pick.bizesNm} — ${ev.pick.access?.memo || (unv ? "턱 유무 미제공 · 전화 확인 필요" : "출입구 턱 없음 확인")}`);
      } else if (ev.kind === "cafe") {
        pts.push(`카페 ${ev.pick.bizesNm} — 이동 중 휴식 (턱 정보는 전화 확인 권장)`);
      } else if (ev.kind === "hotel") {
        pts.push(`숙소 ${ev.pick.title} — ${ev.pick.roomInfo || "무장애 객실"}`);
      }
    }
    return pts;
  }

  /* --- 스케줄 초대장 (동선 목록은 routeRows 데이터를 그대로 사용 — 요약 리스트·지도와 동기화) --- */
  #scheduleInvite(evs, overnight, points) {
    const lines = [];
    lines.push(`💌 [오픈나들이] ${nextWeekendLabel()} ${overnight ? "1박 2일" : "당일"} 무장애 나들이 초대장`);
    lines.push("");
    let dayShown = 0;
    for (const r of points) {
      if (overnight && r.day !== dayShown) {
        lines.push(r.day === 1 ? "DAY 1" : "DAY 2");
        dayShown = r.day;
      }
      lines.push(`${r.no}. ${r.time}  ${r.emoji} ${r.name} — ${r.address || r.query}`);
      if (r.barrier.length) lines.push(`   ${r.barrier.join(" · ")}`);
    }
    lines.push("");
    lines.push("✅ 안심 체크포인트");
    this.#scheduleSummary(evs).forEach((p) => lines.push(`· ${p}`));
    lines.push("");
    lines.push("💡 한 줄 팁");
    for (const ev of evs) if (ev.pick?.tip) lines.push(`· ${ev.pick.tip}`);
    lines.push("");
    lines.push("일상 대화 한마디, 헛걸음 없는 나들이 — 오픈나들이 AI 에이전트가 검증했어요.");
    lines.push("#오픈나들이 #무장애나들이 #가족나들이");
    return lines.join("\n");
  }

  /* --- 여행지 N곳 목록 (코스가 아닌 목록형 응답) --- */
  #spotsListAnswer(ctx, { spots }) {
    const items = spots?.items || [];
    const wantN = Math.max(2, Math.min(6, ctx.wantN || 3));
    const picked = [];
    const seen = new Set();
    for (let i = 0; picked.length < wantN && i < items.length; i++) {
      const it = items[(ctx.variant + i) % items.length];
      const key = it.contentid || it.title;
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(it);
    }
    const cards = picked.map((s, i) => this.#spotCard(s, i + 1, `여행지 ${i + 1}`));
    const summary = picked.slice(0, 3).map((s) => {
      const b = s.barrier || {};
      const bits = [];
      if (b.rental === "Y") bits.push("휠체어 대여");
      if (b.toilet === "Y") bits.push("장애인 화장실");
      if (b.enterable === "Y") bits.push("휠체어 진입");
      if (b.elevator === "Y") bits.push("엘리베이터");
      if (b.parking === "Y") bits.push("전용 주차장");
      if (s.liveUnverified) bits.push("현장 확인 필요");
      return `${s.title} — ${bits.length ? bits.join(", ") : "무장애 정보 미제공"}`;
    });
    const intro =
      `${ctx.region}에서 부모님·휠체어 기준으로 편하게 가볼 만한 여행지 ${picked.length}곳을 골랐어요. ` +
      "코스가 아니라 목록이에요 — 시간대 슬라이더는 코스 요청에 적용돼요. " +
      "마음에 드는 곳을 말씀해 주시면 점심 식당과 산책로까지 붙인 코스로 바꿔 드릴게요.";

    const invite = [
      `💌 [오픈나들이] ${nextWeekendLabel()} 여행지 목록 (${ctx.region})`,
      "",
      ...picked.map((s, i) => `${i + 1}. ${s.emoji || "📍"} ${s.title} — ${s.addr1}`),
      "",
      "✅ 안심 체크포인트",
      ...summary.map((p) => `· ${p}`),
      "",
      "일상 대화 한마디, 헛걸음 없는 나들이 — 오픈나들이 AI 에이전트가 검증했어요.",
      "#오픈나들이 #무장애나들이 #가족나들이",
    ].join("\n");

    return {
      type: "course",
      intro,
      labels: ctx.labels,
      cards,
      summary,
      invite,
      followups: FOLLOWUP_CHIPS,
      meta: { source: spots?.source || "sample", region: ctx.region, variant: ctx.variant },
    };
  }

  /* --- 식당만 --- */
  #restaurantsOnlyAnswer(ctx, { rests }) {
    const items = rests?.items || [];
    const picks = [];
    for (let i = 0; i < Math.min(3, items.length); i++) {
      picks.push(items[(ctx.variant * 3 + i) % items.length]);
    }
    const cards = picks.map((r, i) => this.#restCard(r, i + 1, i === 0 ? "점심 추천" : `${i + 1}순위`));
    const names = picks.map((p) => p.bizesNm).join(", ");
    const intro =
      `${ctx.region} 인근에서 출입구 턱 없는 식당 ${picks.length}곳을 골랐어요. ` +
      "모든 매장은 입구 단차 없음 기준으로 검증했어요.";
    const summary = picks.map((p) =>
      `${p.bizesNm} — ${p.access.memo || "턱 없는 출입구 확인"}`);
    const invite = [
      `💌 [오픈나들이] ${nextWeekendLabel()} 맛집 나들이 초대장`,
      "",
      `🍚 턱 없는 식당 · ${ctx.region}`,
      ...picks.map((p, i) => `${i + 1}. ${p.bizesNm} (${p.indsSclsNm}) — ${p.rdnmAdr}`),
      "",
      "✅ 안심 체크포인트",
      ...picks.map((p) => `· ${p.bizesNm}: ${p.access.memo || "출입구 턱 없음"}`),
      "",
      "#오픈나들이 #무장애나들이",
    ].join("\n");

    return {
      type: "course",
      intro, labels: ctx.labels, cards, summary, invite,
      followups: FOLLOWUP_CHIPS.filter((c) => c !== "식당만 더 보여줘"),
      meta: { source: rests?.source || "sample", region: ctx.region, variant: ctx.variant },
    };
  }

  /* --- 카드 생성 --- */
  #spotCard(spot, no, phase) {
    /* 실시간 공공데이터 결과: 무장애 여부 미제공 → 미검증 배지로만 표시 (상세 조회로 확보된 운영시간은 표시) */
    if (spot.liveUnverified) {
      const details = [["출처", "공공데이터포털 TourAPI 검색 결과"]];
      if (spot.usageHour) details.unshift(["운영", spot.usageHour]);
      return {
        no, phase, kind: "관광지 · 실시간 검색", kindIcon: "📡",
        name: spot.title, address: spot.addr1 || "주소 확인 필요", emoji: spot.emoji || "📍",
        badges: ["unverified"],
        details,
        tip: spot.tip,
        mapQuery: spot.title,
      };
    }
    const b = spot.barrier || {};
    const badges = [];
    if (b.rental === "Y") badges.push("rental");
    if (b.toilet === "Y") badges.push("toilet");
    if (b.enterable === "Y") badges.push("enterable");
    if (b.elevator === "Y") badges.push("elevator");
    if (b.parking === "Y") badges.push("parking");
    const details = [];
    if (spot.cat3name) details.push(["종목", spot.cat3name]);
    if (spot.usageHour) details.push(["운영", spot.usageHour]);
    if (b.rental === "Y" && spot.rentalInfo) details.push(["대여", spot.rentalInfo]);
    /* 이곳을 고른 이유를 카드에 그대로 보여준다 */
    const why = [];
    if (b.rental === "Y") why.push("휠체어 대여");
    if (b.enterable === "Y") why.push("휠체어 진입로");
    if (b.toilet === "Y") why.push("장애인 화장실");
    if (b.parking === "Y") why.push("전용 주차");
    if (b.elevator === "Y") why.push("엘리베이터");
    details.push(["선정", why.length ? `${why.join(" · ")} 검증` : "무장애 정보 기준 통과"]);
    return {
      no, phase, kind: "관광지", kindIcon: "🏛️",
      name: spot.title, address: spot.addr1, emoji: spot.emoji,
      badges, details, tip: spot.tip,
      mapQuery: spot.title,
    };
  }

  #trailCard(trail, no, phase) {
    const badges = ["slope8"];
    if (trail.handrail === "Y") badges.push("handrail");
    if (trail.restArea === "Y") badges.push("restArea");
    if (trail.accessibleToilet === "Y") badges.push("toilet");
    return {
      no, phase, kind: "무장애 산책로", kindIcon: "🌲",
      name: `${trail.parkName} · ${trail.trailName}`,
      address: `${trail.startPoint} → ${trail.endPoint} (${trail.distance}·${trail.duration})`,
      emoji: trail.emoji,
      badges, badgeNote: { slope8: `최대 경사도 ${trail.maxSlope}%` },
      details: [
        ["경사", `최대 ${trail.maxSlope}% (${trail.slopeRating})`],
        ["바닥", trail.surface],
        ["난간", trail.handrail === "Y" ? "전 구간 안전 난간" : "구간 확인 필요"],
        ["휴식", trail.restArea === "Y" ? "중간 휴식 공간 완비" : "구간 확인 필요"],
        ["화장실", trail.accessibleToilet === "Y" ? "인근 장애인 화장실 완비" : "인근 확인 필요"],
        ["관리", trail.agency || "지자체 무장애 탐방로"],
      ],
      tip: trail.tip,
      mapQuery: trail.parkName,
    };
  }

  #restCard(r, no, phase) {
    /* 실시간 상권정보 결과: 턱 정보 미제공 → 미검증 배지 */
    if (r.liveUnverified) {
      return {
        no, phase, kind: "식당 · 실시간 검색", kindIcon: "📡",
        name: r.bizesNm, address: r.rdnmAdr || "주소 확인 필요", emoji: "🍽️",
        badges: ["unverified"],
        details: [["업종", r.indsSclsNm || "음식점"], ["출처", "공공데이터포털 상권정보 검색 결과"]],
        tip: r.tip,
        mapQuery: r.bizesNm,
      };
    }
    const a = r.access || {};
    const badges = ["stepFree"];
    if (a.toilet) badges.push("toilet");
    if (a.lowTable) badges.push("lowTable");
    if (a.parking) badges.push("parking");
    return {
      no, phase, kind: "식당", kindIcon: "🍚",
      name: r.bizesNm, address: r.rdnmAdr, emoji: "🍽️",
      badges, details: [["업종", `${r.indsMclsNm} · ${r.indsSclsNm}`], ["출입구", a.memo || "턱 없음"]],
      tip: r.tip,
      mapQuery: r.bizesNm,
    };
  }

  /* --- 숙박 카드 --- */
  #hotelCard(ht, no, phase) {
    if (ht.liveUnverified) {
      return {
        no, phase, kind: "숙박 · 실시간 검색", kindIcon: "📡",
        name: ht.title, address: ht.addr1 || "주소 확인 필요", emoji: "🏨",
        badges: ["unverified"],
        details: [["출처", "공공데이터포털 무장애여행 숙박 결과"]],
        tip: ht.tip,
        mapQuery: ht.title,
      };
    }
    const b = ht.barrier || {};
    const badges = [];
    if (b.rental === "Y") badges.push("rental");
    if (b.toilet === "Y") badges.push("toilet");
    if (b.enterable === "Y") badges.push("enterable");
    if (b.elevator === "Y") badges.push("elevator");
    if (b.parking === "Y") badges.push("parking");
    return {
      no, phase, kind: "숙박 · 무장애 객실", kindIcon: "🏨",
      name: ht.title, address: ht.addr1, emoji: ht.emoji || "🏨",
      badges, details: ht.roomInfo ? [["객실", ht.roomInfo]] : [],
      tip: ht.tip,
      mapQuery: ht.title,
    };
  }
}

/* 후속(조건 변경 재질문) 칩 */
const FOLLOWUP_CHIPS = [
  "다른 코스로 다시 추천해줘",
  "다른 지역 코스 보여줘",
  "비 오는 날 실내 코스로 바꿔줘",
  "식당만 더 보여줘",
];

/* ============================ 유연 스케줄링 ============================ */
/**
 * 일정 설정(아코디언) 검증·기본화. UI가 항상 전달하지만,
 * 직접 호출(테스트 등) 시 기본값: 당일 00:00~24:00 · 식사 포함.
 */
function normalizeSchedule(raw) {
  const num = (v, def) => (Number.isFinite(Number(v)) ? Number(v) : def);
  const clampR = (r, defS, defE) => {
    let s = Math.max(0, Math.min(24, Math.round(num(r?.s, defS))));
    let e = Math.max(0, Math.min(24, Math.round(num(r?.e, defE))));
    if (e <= s) {
      if (s >= 24) { s = 23; e = 24; }  /* 상한에서 충돌 → 23~24로 보정 */
      else e = s + 1;
    }
    return { s, e };
  };
  return {
    tripType: raw?.tripType === "overnight" ? "overnight" : "day",
    d1: clampR(raw?.d1, 0, 24),
    d2: clampR(raw?.d2, 0, 24),
    meal: raw ? !!raw.meal : true,
    cafe: raw ? !!raw.cafe : true,   /* 제품 기본값: 식사+카페 모두 ON */
    hotel: raw ? !!raw.hotel : false,
  };
}

const ACT_DUR = { act: 2.5, lunch: 1.25, cafe: 1, dinner: 1.5, hotel: 0.5 };
const WINDOW = { lunch: [11, 13], cafe: [13.75, 16], dinner: [17, 18.75] };

/**
 * 일정 설정 → 이벤트 배열 (유연한 스케줄링).
 * 활동을 시간대 칸에 고정하지 않고, 남은 시간과 끼니·카페 시간 창에 맞춰 배치한다.
 * pref.trailOk: 발화 테마상 산책로 배치 가능(바다·공원·산책, 우천 아님) 여부
 * 슬라이더로 지정한 시간 범위(d1·d2)는 항상 그대로 존중한다.
 */
function buildSchedule(sched, pref = {}) {
  const days = sched.tripType === "overnight"
    ? [{ day: 1, ...sched.d1 }, { day: 2, ...sched.d2 }]
    : [{ day: 1, ...sched.d1 }];
  const events = [];
  for (const d of days) events.push(...scheduleDayRange(d, sched, pref));
  return events;
}

function scheduleDayRange({ day, s, e }, sched, pref) {
  const isD2 = day === 2;
  /* 슬라이더로 지정한 시간 범위는 그대로 존중 — 00시 시작이면 00시부터 배치하고, 그 어떤 키워드(부모님 동행 등)로도 미루지 않는다 */
  const sUse = s;
  const lunch = sched.meal && sUse < 14 && e > 11;
  const dinner = sched.meal && !isD2 && e >= 17;
  const cafe = sched.cafe && sUse < 17 && e > 13;

  /* 끼니·카페 시간 창을 앵커로 세우고, 앵커 사이 빈 구간에 활동을 균등 분배해 채운다 */
  const anchors = [lunch && "lunch", cafe && "cafe", dinner && "dinner"].filter(Boolean)
    .sort((a, b) => WINDOW[a][0] - WINDOW[b][0]);
  const hotelGap = !isD2 && sched.tripType === "overnight" && sched.hotel ? 1.5 : 0;
  const dayEnd = e - hotelGap;   /* 숙소 체크인 1.5시간은 하루 끝에 비워 둠 */

  const seq = [];
  let cursor = sUse;
  for (const kind of anchors) {
    const [lo, hi] = WINDOW[kind];
    let start = Math.max(cursor, lo);
    if (start > hi) start = hi;      /* 창이 밀렸으면 창 끝으로 */
    if (start < cursor) break;       /* 끼니 시간이 이미 지났으면 이후 끼니도 생략 */
    const end = Math.min(e, start + ACT_DUR[kind]);
    if (end - start < 0.25) break;
    fillWithActs(seq, cursor, start, day);
    seq.push({ kind, day, start, end });
    cursor = end;
  }
  fillWithActs(seq, cursor, dayEnd, day);
  if (hotelGap) seq.push({ kind: "hotel", day, start: e - 1.5, end: e });

  /* 산책로 교차: 날 전체 활동 순서 기준 (관광지→산책로→관광지…) */
  let ai = 0;
  for (const ev of seq) {
    if (ev.kind !== "act") continue;
    ev.act = pref.trailOk && ai % 3 === 1 ? "trail" : "spot";
    ai++;
  }
  return seq;
}

/* [from, to] 빈 구간을 활동으로 채움 — 활동 1개 2.5시간 기준 균등 분할(0.75~3시간) */
function fillWithActs(seq, from, to, day) {
  const len = to - from;
  if (len < 0.75) return;   /* 너무 짧은 틈은 비워 둔다 */
  let n = Math.max(1, Math.round(len / 2.5));
  if (len / n > 3) n += 1;
  const dur = Math.max(0.75, Math.round((len / n) * 4) / 4);
  for (let i = 0; i < n; i++) {
    seq.push({
      kind: "act", day,
      start: from + i * dur,
      end: i === n - 1 ? to : from + (i + 1) * dur,   /* 마지막 활동이 구간 끝까지 채움 */
    });
  }
}

const hh = (h) => `${String(h).padStart(2, "0")}:00`;
const fmtT = (x) => {
  const h = Math.floor(x);
  const m = Math.round((x - h) * 4) / 4 * 60;   /* 15분 단위 반올림 */
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
const KIND_LABEL = { lunch: "점심", cafe: "카페", dinner: "저녁", hotel: "체크인" };

/**
 * 코스 동선 요약 행 — 초대장 텍스트·하단 요약 리스트·지도 핀이 이 데이터 하나를 공유한다.
 * barrier: 무장애 핵심 정보(경사도·편의시설 등), query/queryAlt: 지오코딩용 검색어,
 * lat/lng: 실시간 데이터가 제공하는 좌표(없으면 null — UI에서 지오코딩으로 보완)
 */
function routeRows(evs, overnight) {
  const rows = [];
  for (const ev of evs) {
    const p = ev.pick;
    if (!p) continue;
    const row = {
      no: rows.length + 1,
      day: ev.day,
      time: fmtT(ev.start),
      phase: schedulePhase(ev, overnight),
      name: "", address: "", emoji: "",
      barrier: [], query: "", queryAlt: "",
      lat: null, lng: null,
    };
    if (ev.kind === "act" && ev.act === "trail") {
      row.name = `${p.parkName} · ${p.trailName}`;
      row.address = `${p.startPoint} → ${p.endPoint} (${p.distance}·${p.duration})`;
      row.emoji = p.emoji || "🌲";
      row.barrier.push(`최대 경사도 ${p.maxSlope}%`);
      if (p.handrail === "Y") row.barrier.push("안전 난간");
      if (p.restArea === "Y") row.barrier.push("휴식 공간");
      if (p.accessibleToilet === "Y") row.barrier.push("장애인 화장실");
      row.query = p.startPoint || p.parkName;
      row.queryAlt = p.parkName;
    } else if (ev.kind === "act") {
      const b = p.barrier || {};
      row.name = p.title;
      row.address = p.addr1 || "";
      row.emoji = p.emoji || "📍";
      if (b.rental === "Y") row.barrier.push("휠체어 대여");
      if (b.toilet === "Y") row.barrier.push("장애인 화장실");
      if (b.enterable === "Y") row.barrier.push("휠체어 진입");
      if (b.elevator === "Y") row.barrier.push("엘리베이터");
      if (b.parking === "Y") row.barrier.push("전용 주차");
      if (p.usageHour) row.barrier.push(`운영 ${p.usageHour}`);
      row.query = p.addr1 ? `${p.title} ${p.addr1}` : p.title;
      row.queryAlt = p.title;
      if (p.yswftm && p.xswftm) { row.lat = +p.yswftm; row.lng = +p.xswftm; }
    } else if (ev.kind === "hotel") {
      const b = p.barrier || {};
      row.name = p.title;
      row.address = p.addr1 || "";
      row.emoji = "🏨";
      if (p.roomInfo) row.barrier.push(p.roomInfo);
      if (b.elevator === "Y") row.barrier.push("엘리베이터");
      if (b.toilet === "Y") row.barrier.push("장애인 화장실");
      if (b.parking === "Y") row.barrier.push("전용 주차");
      row.query = p.addr1 ? `${p.title} ${p.addr1}` : p.title;
      row.queryAlt = p.title;
    } else {
      const a = p.access || {};
      row.name = p.bizesNm;
      row.address = p.rdnmAdr || "";
      row.emoji = ev.kind === "cafe" ? "☕" : "🍚";
      if (p.liveUnverified) row.barrier.push("턱 유무 전화 확인 필요");
      else row.barrier.push(a.memo || "출입구 턱 없음");
      if (a.toilet) row.barrier.push("장애인 화장실");
      if (a.lowTable) row.barrier.push("저상 테이블");
      row.query = p.rdnmAdr || p.bizesNm;
      row.queryAlt = `${p.bizesNm} ${p.rdnmAdr || ""}`.trim();
    }
    rows.push(row);
  }
  return rows;
}

/* usageHour 문자열로 이벤트 시간대 운영 여부 판정 — "연중무휴"/"24시간"·미제공은 제한 없음 */
function spotOpenAt(usageHour, start, end) {
  const u = String(usageHour || "");
  if (/연중무휴|24시간/.test(u)) return true;
  const m = u.match(/(\d{1,2}):(\d{2})\s*[~–-]\s*(\d{1,2}):(\d{2})/);
  if (!m) return true;
  const open = +m[1] + +m[2] / 60;
  const close = +m[3] + +m[4] / 60;
  return start >= open - 0.01 && end <= close + 0.01;
}

/* 운영시간이 '명시된' 장소인지 — 연중무휴·24시간 또는 HH:MM~HH:MM 범위 */
function hoursKnown(usageHour) {
  const u = String(usageHour || "");
  return /연중무휴|24시간/.test(u) || /(\d{1,2}):(\d{2})\s*[~–-]\s*(\d{1,2}):(\d{2})/.test(u);
}

/** 이벤트 → 카드 phase 라벨 ("1일차 00:00 새벽" / "09:00 오전" / "13:30 오후" / "21:15 야간") */
function schedulePhase(ev, overnight) {
  const dayTag = overnight ? (ev.day === 1 ? "1일차 " : "2일차 ") : "";
  const label = ev.kind === "act"
    ? (ev.act === "trail" ? "산책" : (ev.start < 6 ? "새벽" : ev.start < 12 ? "오전" : ev.start < 18 ? "오후" : "야간"))
    : KIND_LABEL[ev.kind];
  return `${dayTag}${fmtT(ev.start)} ${label}`;
}

/* 인사/안내 응답 */
function greetingAnswer() {
  return {
    type: "greeting",
    intro:
      "안녕하세요! 저는 공공 무장애 데이터 3종(한국관광공사 열린관광지 · 국립공원공단·지자체 무장애 탐방로 · 소상공인 상권정보)을 " +
      "자동으로 조합해, 헛걸음 없는 나들이 코스를 만들어 드리는 오픈나들이 AI 에이전트예요.\n\n" +
      "이렇게 말씀해 보세요.\n" +
      "· \"주말에 휠체어 타고 산책할 만한 부산 근교 나들이 장소 찾아줘\"\n" +
      "· \"부모님 모시고 가기 좋은 바다 데크길 코스\"\n" +
      "· \"비 오는 날 실내로 편하게 가고 싶어요\"\n\n" +
      "지역·테마·동행 상황만 담으면, 경사도 8% 이하 산책로와 턱 없는 식당까지 한 번에 검증해 드릴게요.",
    cards: [],
    summary: [],
    followups: STARTER_CHIPS,
  };
}

const STARTER_CHIPS = [
  "부모님 모시고 가기 좋은 부산 바다 데크길 코스",
  "비 오는 날 휠체어로 편한 실내 나들이",
  "평지 위주 맛집+산책 반나절 코스",
  "제주에서 휠체어로 가볼 만한 곳 알려줘",
];

/** 이번 주말(토요일) 날짜 라벨 */
function nextWeekendLabel() {
  const d = new Date();
  const add = (6 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${dow})`;
}

export { BADGE_DEFS, DEFAULT_SETTINGS, OutingAgent, TOOL_SPECS, buildSchedule };

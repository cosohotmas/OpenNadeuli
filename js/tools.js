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

import { TOURIST_SPOTS, TRAILS, RESTAURANTS, HOTELS } from "./data.js";

/* ---------------------- 도구 정의(스키마) ---------------------- */

export const TOOL_SPECS = [
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

export const LIVE_APIS = {
  searchOpenTouristSpots: {
    url: "https://apis.data.go.kr/B551011/KorWithService2/areaBasedList2",
    keywordless: true,
    buildParams: (kw, args, key) => ({
      serviceKey: key, numOfRows: "20", pageNo: "1",
      MobileOS: "ETC", MobileApp: "OpenNatri",
      areaCode: AREA_CODE[args.region] || "", _type: "json",
    }),
    map: (json, args) => {
      const raw = itemsOf(json);
      const region = args.region || "";
      const inRegion = raw.filter((r) => regionIn(region, r.addr1));
      const items = (inRegion.length ? inRegion : raw).map((r) => ({
        contentid: r.contentid || "",
        contenttypeid: r.contenttypeid || "",
        title: r.title || "(제목 미상)",
        addr1: r.addr1 || "",
        areacode: r.areacode || "",
        cat3name: "무장애여행 공공데이터",
        kind: "outdoor", themes: [], subArea: (r.addr1 || "").split(" ")[1] || "",
        emoji: "📍", barrier: {}, liveUnverified: true,
        xswftm: r.mapx || "", yswftm: r.mapy || "",
        usageHour: "", tip: "공공데이터 '무장애 여행 정보' 검색 결과예요. 상세 검증 후 배지를 갱신해요.",
      }));
      const note = items.length
        ? `무장애여행 API 결과 ${items.length}곳${!inRegion.length && raw.length ? " (해당 지역 일치 없음 → 전국 결과)" : ""}`
        : "";
      return { items, note };
    },
    /* areaBasedList2가 0건일 때 키워드 검색으로 재시도 */
    fallback: {
      url: "https://apis.data.go.kr/B551011/KorWithService2/searchKeyword2",
      keywords: ["무장애", "휠체어", "배리어프리"],
      buildParams: (kw, args, key) => ({
        serviceKey: key, numOfRows: "20", pageNo: "1",
        MobileOS: "ETC", MobileApp: "OpenNatri",
        keyword: kw, areaCode: AREA_CODE[args.region] || "", _type: "json",
      }),
    },
  },
  searchAccessibleTrails: {
    url: "",
    note: "국립공원·지자체 무장애 탐방로는 data.go.kr에 OpenAPI가 없음(파일데이터만 제공 확인) → 내장 데이터 사용",
  },
  /* 숙박: 무장애여행 정보 서비스의 숙박 콘텐츠(contenttypeid=32) — 관광지 도구와 같은 키 사용 */
  searchStayHotels: {
    url: "https://apis.data.go.kr/B551011/KorWithService2/areaBasedList2",
    keywordless: true,
    buildParams: (kw, args, key) => ({
      serviceKey: key, numOfRows: "20", pageNo: "1",
      MobileOS: "ETC", MobileApp: "OpenNatri",
      areaCode: AREA_CODE[args.region] || "", contentTypeId: "32", _type: "json",
    }),
    map: (json, args) => {
      const raw = itemsOf(json);
      const region = args.region || "";
      const inRegion = raw.filter((r) => regionIn(region, r.addr1));
      const items = (inRegion.length ? inRegion : raw).map((r) => ({
        contentid: r.contentid || "",
        title: r.title || "(숙소 미상)",
        addr1: r.addr1 || "",
        cat3name: "무장애여행 숙박",
        subArea: (r.addr1 || "").split(" ")[1] || "",
        emoji: "🏨", barrier: {}, liveUnverified: true,
        xswftm: r.mapx || "", yswftm: r.mapy || "",
        roomInfo: "",
        tip: "공공데이터 '무장애 여행 정보' 숙박 결과예요. 객실 폭·욕실 상세는 예약 전에 확인을 권해요.",
      }));
      const note = items.length
        ? `무장애여행 숙박 API 결과 ${items.length}곳${!inRegion.length && raw.length ? " (지역 일치 없음 → 전국 결과)" : ""}`
        : "";
      return { items, note };
    },
    /* 0건이면 숙박 키워드로 재시도 */
    fallback: {
      url: "https://apis.data.go.kr/B551011/KorWithService2/searchKeyword2",
      keywords: ["호텔", "리조트", "모텔", "숙박"],
      buildParams: (kw, args, key) => ({
        serviceKey: key, numOfRows: "20", pageNo: "1",
        MobileOS: "ETC", MobileApp: "OpenNatri",
        keyword: kw, areaCode: AREA_CODE[args.region] || "", contentTypeId: "32", _type: "json",
      }),
    },
  },
  searchStepFreeRestaurants: {
    url: "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius",
    keywordless: true,
    buildParams: (kw, args, key) => ({
      serviceKey: key, numOfRows: "20", pageNo: "1",
      radius: "600", cx: args.cx || "", cy: args.cy || "", type: "json",
    }),
    map: (json) => {
      const FOOD = /음식|한식|중식|일식|양식|분식|치킨|피자|카페|베이커리|패스트푸드|식당|해물|횟집|술집|국밥|냉면|떡볶이/i;
      const raw = itemsOf(json);
      const food = raw.filter((r) =>
        FOOD.test(String(r.indsLclsNm || "") + String(r.indsMclsNm || "") + String(r.indsSclsNm || "")));
      const use = food.length ? food : raw;
      const items = use.slice(0, 12).map((r) => ({
        bizesId: r.bizesId || "",
        bizesNm: r.bizesNm || "(상호 미상)",
        indsLclsNm: "음식", indsMclsNm: r.indsMclsNm || "", indsSclsNm: r.indsSclsNm || r.indsMclsNm || "음식점",
        rdnmAdr: r.rdnmAdr || "",
        subAreas: [], xswftm: r.lon || "", yswftm: r.lat || "",
        access: { stepFree: null, memo: "" }, liveUnverified: true,
        tip: "상권정보에는 출입구 턱 정보가 없어요. 예약 시 '입구 단차' 전화 확인을 권해요.",
      }));
      return { items, note: items.length ? `반경 내 상가업소 중 음식점 ${items.length}건 선별 (턱 정보 미제공 → 현장 확인 배지)` : "" };
    },
  },
};

/** 공공API 응답에서 item 배열 추출 (1건일 때 객체로 오는 경우까지 방어) */
function itemsOf(json) {
  const it = json?.response?.body?.items?.item
    ?? json?.body?.items
    ?? json?.items
    ?? [];
  if (Array.isArray(it)) return it;
  return it ? [it] : [];
}

/** JSON·XML 양쪽 방어 파서. 성공 시 {json, count}, 실패 시 {error:{code,msg}} */
function parseOpenApi(text) {
  try {
    const json = JSON.parse(text);
    const head = json?.response?.header || json?.header || {};
    const msg = head.resultMsg || head.resultmessage || "";
    /* sdsc2 등 상위 플랫 구조 오류 (resultCode 00=성공) */
    if (json?.resultCode && json.resultCode !== "00" && json.resultCode !== "0000") {
      return { error: { code: json.resultCode, msg: json?.resultMsg || "호출 오류" } };
    }
    if (msg && msg !== "OK" && msg !== "NORMAL_SERVICE") {
      return { error: { code: head.resultCode || "-", msg } };
    }
    if (json?.OpenAPI_ServiceResponse) {
      const h = json.OpenAPI_ServiceResponse.cmmMsgHeader || {};
      return { error: { code: h.returnReasonCode || "-", msg: h.returnAuthMsg || h.errMsg || "호출 실패" } };
    }
    const count = json?.response?.body?.totalCount ?? json?.body?.totalCount ?? json?.body?.list_total_count ?? null;
    return { json, count };
  } catch (_) {
    if (text.includes("OpenAPI_ServiceResponse")) {
      const code = (text.match(/<returnReasonCode>([^<]+)<\/returnReasonCode>/) || [])[1] || "-";
      const msg = (text.match(/<returnAuthMsg>([^<]+)<\/returnAuthMsg>/) || [])[1]
        || (text.match(/<errMsg>([^<]+)<\/errMsg>/) || [])[1] || "호출 실패";
      return { error: { code, msg } };
    }
    return { json: null, count: null };
  }
}

/* ---------------------- 실시간 호출 시도 ---------------------- */

/**
 * 공공데이터포털 호출 경로 (순차 폴백):
 *  1) 브라우저 직접 호출 — data.go.kr는 CORS를 허용(Origin 반영)하므로
 *     localhost·터널 어디서든 동작. 호출 IP가 사용자 브라우저라 게이트웨이 응답도 정상.
 *  2) /proxy/openapi — serve.mjs로 서빙될 때만 존재하는 서버 프록시 (직접 호출 실패 시)
 *  3) JSONP — TourAPI(KorWithService2)는 callback 파라미터를 공식 지원하므로
 *     CORS·네트워크 제약을 스크립트 태그로 우회 (직접·프록시 모두 실패 시)
 * 반환: { text, via } — via는 어떤 경로로 받았는지(표시용)
 */
export async function fetchPublicApi(path, searchParams) {
  try {
    const res = await fetch(`https://apis.data.go.kr/${path}?${searchParams.toString()}`,
      { signal: AbortSignal.timeout(9000) });
    return { text: await decodeBody(await res.arrayBuffer()), via: "브라우저 직접 호출" };
  } catch (_) { /* 직접 호출 실패(CORS/네트워크) → 다음 경로 */ }

  try {
    const res2 = await fetch(`/proxy/openapi?path=${encodeURIComponent(path)}&${searchParams.toString()}`,
      { signal: AbortSignal.timeout(9000) });
    if (!res2.ok && !String(res2.status).startsWith("4")) throw new Error(`프록시 HTTP ${res2.status}`);
    return { text: await decodeBody(await res2.arrayBuffer()), via: "프록시 경유" };
  } catch (_) { /* 프록시 없음(터널·file://) → JSONP 시도 */ }

  if (!path.startsWith("B551011/")) throw new Error("직접 호출·프록시 모두 실패");
  return { text: await fetchJsonp(`https://apis.data.go.kr/${path}?${searchParams.toString()}`), via: "JSONP" };
}

/**
 * 공공 API는 charset 헤더 없이 EUC-KR로 응답하는 경우가 있다.
 * UTF-8 디코딩에 U+FFFD(깨진 문자)가 섞이면 EUC-KR로 재디코딩한다.
 */
async function decodeBody(buf) {
  const utf8 = new TextDecoder("utf-8").decode(buf);
  if (!utf8.includes("\uFFFD")) return utf8;
  try { return new TextDecoder("euc-kr").decode(buf); } catch (_) { return utf8; }
}

function fetchJsonp(url, timeout = 9000) {
  return new Promise((resolve, reject) => {
    const cb = "__opennatri_cb_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    const timer = setTimeout(() => { cleanup(); reject(new Error("JSONP 시간 초과")); }, timeout);
    function cleanup() { clearTimeout(timer); delete window[cb]; script.remove(); }
    window[cb] = (data) => { cleanup(); resolve(JSON.stringify(data)); };
    script.src = `${url}&callback=${cb}`;
    script.onerror = () => { cleanup(); reject(new Error("JSONP 로드 실패")); };
    document.head.appendChild(script);
  });
}

async function tryLive(spec, args, settings) {
  if (!settings?.useLive) return null;
  /* 숙박 도구는 관광지 도구와 같은 TourAPI 키를 사용 (설정 모달의 ① 키) */
  const key = (settings.keys?.[spec.name]
    || (spec.name === "searchStayHotels" ? settings.keys?.searchOpenTouristSpots : "")
    || "").trim();
  if (!key) return null;
  const conf = LIVE_APIS[spec.name];
  if (!conf?.url) return { ok: false, note: conf?.note || "라이브 엔드포인트 미설정 → 내장 데이터 전환" };

  /* 키워드 후보: keywordless 도구는 인자(cx/cy 등)만으로 호출 */
  const kwPool = conf.keywordless ? [null]
    : [...(args.subAreas || []), args.region].filter(Boolean);
  const path = conf.url.replace("https://apis.data.go.kr/", "");

  for (const kw of kwPool) {
    const params = conf.buildParams(kw, args, key);
    const relay = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== "") relay.append(k, v);
    try {
      const { text, via } = await fetchPublicApi(path, relay);
      const parsed = parseOpenApi(text);
      if (parsed.error) {
        return { ok: false, note: `공공API 오류 [${parsed.error.code}] ${parsed.error.msg} → 내장 데이터 전환` };
      }
      const mapped = conf.map(parsed.json, args) || { items: [] };
      if (mapped.items.length) {
        return { ok: true, items: mapped.items, excluded: [], note: `${mapped.note || `실시간 공공데이터 ${mapped.items.length}건`} (${via})` };
      }
      /* 0건이면 다음 키워드로 재시도 */
    } catch (e) {
      const reason = e.name === "TimeoutError" || e.name === "AbortError" ? "시간 초과" : (e.message || "호출 실패");
      return { ok: false, note: `실시간 호출 실패(${reason}) → 내장 데이터 전환` };
    }
  }

  /* 0건이면 fallback(예: areaBasedList2 → searchKeyword2)으로 재시도 */
  if (conf.fallback) {
    const fpath = conf.fallback.url.replace("https://apis.data.go.kr/", "");
    for (const kw of conf.fallback.keywords) {
      const relay = new URLSearchParams();
      for (const [k, v] of Object.entries(conf.fallback.buildParams(kw, args, key))) if (v !== "") relay.append(k, v);
      try {
        const { text } = await fetchPublicApi(fpath, relay);
        const parsed = parseOpenApi(text);
        if (parsed.error) return { ok: false, note: `공공API 오류 [${parsed.error.code}] ${parsed.error.msg} → 내장 데이터 전환` };
        const mapped = conf.map(parsed.json, args) || { items: [] };
        if (mapped.items.length) {
          return { ok: true, items: mapped.items, excluded: [], note: `${mapped.note || `실시간 공공데이터 ${mapped.items.length}건`} (키워드 재검색)` };
        }
      } catch (_) { break; /* 폴백 실패 시 내장 데이터로 */ }
    }
  }
  return { ok: false, note: `실시간 검색 0건 → 내장 데이터 전환` };
}

/**
 * 무장애여행 상세(detailIntro2)로 상위 관광지의 무장애 시설을 검증해 배지를 갱신한다.
 * 상세 필드가 제공되면 liveUnverified를 해제(실배지), 아니면 미검증 배지 유지.
 */
async function enrichTourist(items, settings) {
  const key = (settings?.keys?.searchOpenTouristSpots || "").trim();
  if (!key) return;
  for (const it of items.slice(0, 3)) {
    if (!it.contentid || !it.contenttypeid) continue;
    try {
      const relay = new URLSearchParams({
        serviceKey: key, numOfRows: "1", pageNo: "1",
        MobileOS: "ETC", MobileApp: "OpenNatri",
        contentId: it.contentid, contentTypeId: it.contenttypeid, _type: "json",
      });
      const { text } = await fetchPublicApi("B551011/KorWithService2/detailIntro2", relay);
      const parsed = parseOpenApi(text);
      const raw = itemsOf(parsed.json ?? {})[0];
      if (!raw) continue;
      const barrier = {};
      for (const [k, v] of Object.entries(raw)) {
        if (!/^(Y|있음|가능|무료|유)/i.test(String(v))) continue;
        if (/wheelchairrental/i.test(k)) barrier.rental = "Y";
        else if (/(disabled|wheelchair|barrier).*toilet|toilet.*(disabled|wheelchair)/i.test(k)) barrier.toilet = "Y";
        else if (/wheelchairenter|entryroute/i.test(k)) barrier.enterable = "Y";
        else if (/elevator/i.test(k)) barrier.elevator = "Y";
        else if (/parking/i.test(k) && /(disab|wheelchair|barrier)/i.test(k)) barrier.parking = "Y";
      }
      if (Object.keys(barrier).length) {
        it.barrier = barrier;
        it.liveUnverified = false;
        it.cat3name = "무장애여행 상세정보 기준";
        if (raw.wheelchairrental && raw.wheelchairrental !== "Y") it.rentalInfo = String(raw.wheelchairrental);
        if (raw.usetime && String(raw.usetime).trim()) it.usageHour = String(raw.usetime).trim();
        it.tip = "공공데이터 '무장애 여행 정보' 상세 기준이에요. 최신 운영 상태는 방문 전 확인을 권해요.";
      }
    } catch (_) { /* 상세 조회 실패 시 미검증 배지 유지 */ }
  }
}

export const DEFAULT_SETTINGS = {
  useLive: false,
  keys: {
    searchOpenTouristSpots: "",
    searchAccessibleTrails: "",
    searchStepFreeRestaurants: "",
    searchStayHotels: "",
    mapKakao: "",
  },
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

/* ---------------------- 실측 스냅샷 (선택 계층) ---------------------- */
/**
 * 실측 데이터 스냅샷: capture-snapshot.mjs가 본인 PC에서 캡처한 실제 API 응답.
 * js/snapshot.js(window.__SNAPSHOT__)가 있으면 'live 실패 시 → 실측 → 샘플' 순으로 사용.
 * 스냅샷 파일에는 인증키가 포함되지 않는다(보안).
 */
let SNAP_CACHE, SNAP_TRIED = false;
async function getSnapshot() {
  if (SNAP_TRIED) return SNAP_CACHE;
  SNAP_TRIED = true;
  try { if (typeof window !== "undefined" && window.__SNAPSHOT__) { SNAP_CACHE = window.__SNAPSHOT__; return SNAP_CACHE; } } catch (_) {}
  try { await import("./snapshot.js"); } catch (_) {}
  try { if (typeof window !== "undefined" && window.__SNAPSHOT__) SNAP_CACHE = window.__SNAPSHOT__; } catch (_) {}
  return SNAP_CACHE;
}

function snapshotItems(name, args, snap) {
  const region = args.region || "부산";
  if (name === "searchOpenTouristSpots") {
    const list = snap.tourist?.[region]?.length ? snap.tourist[region] : Object.values(snap.tourist || {}).flat();
    const items = list.map((s) => ({
      contentid: s.contentid || "", contenttypeid: s.contenttypeid || "",
      title: s.title || "(제목 미상)", addr1: s.addr1 || "",
      areacode: "", cat3name: "무장애여행 실측 데이터",
      kind: "outdoor", themes: [], subArea: (s.addr1 || "").split(" ")[1] || "",
      emoji: "📍", barrier: s.barrier || {}, liveUnverified: !s.barrierFound,
      xswftm: s.mapx || "", yswftm: s.mapy || "",
      usageHour: "",
      tip: s.barrierFound
        ? "공공데이터 '무장애 여행 정보' 상세 기준이에요. 최신 운영 상태는 방문 전 확인을 권해요."
        : "실측 데이터 기준이며 무장애 상세는 미수집이에요. 방문 전 전화 확인을 권해요.",
    }));
    return { items, excluded: [] };
  }
  if (name === "searchStepFreeRestaurants") {
    const list = snap.restaurants?.[region]?.length ? snap.restaurants[region] : Object.values(snap.restaurants || {}).flat();
    const items = list.map((r) => ({
      bizesId: r.bizesId || "", bizesNm: r.bizesNm || "(상호 미상)",
      indsLclsNm: "음식", indsMclsNm: r.indsMclsNm || "", indsSclsNm: r.indsSclsNm || r.indsMclsNm || "음식점",
      rdnmAdr: r.rdnmAdr || "", subAreas: [], xswftm: r.lon || "", yswftm: r.lat || "",
      access: { stepFree: null, memo: "" }, liveUnverified: true,
      tip: "상권정보에는 출입구 턱 정보가 없어요. 예약 시 '입구 단차' 전화 확인을 권해요.",
    }));
    return { items, excluded: [] };
  }
  return null;
}

/* ---------------------- 공용 진입점 ---------------------- */

/**
 * 실시간 관광지 결과 + 내장 검증 데이터 병합 — 무장애 검증된 곳 우선.
 * 순서: ① 상세 검증된 실시간 결과 ② 내장 검증 데이터 ③ 미검증 실시간 결과.
 * 나들이 대상 외 종목(음식점 39·숙박 32·쇼핑 38·행사 15)은 관광지 풀에서 제외.
 */
export function mergeSpotPools(liveItems, sampleResult) {
  const SPOT_TYPES = new Set(["12", "14", "25", "28"]);
  const live = (liveItems || []).filter((it) => SPOT_TYPES.has(String(it.contenttypeid || "")));
  const verifiedLive = live.filter((it) => !it.liveUnverified);
  const unverifiedLive = live.filter((it) => it.liveUnverified);
  const sample = sampleResult?.items || [];
  const seen = new Set();
  const merged = [];
  for (const s of [...verifiedLive, ...sample, ...unverifiedLive]) {
    const key = (s.title || "").replace(/\s+/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(s);
  }
  return merged;
}

/**
 * 도구 실행. 반환값:
 * { tool, args, source: "sample"|"live", items, excluded, note }
 */
export async function callTool(name, args, settings = DEFAULT_SETTINGS) {
  const spec = TOOL_SPECS.find((t) => t.name === name);
  if (!spec) throw new Error(`알 수 없는 도구: ${name}`);

  await sleep(550 + Math.random() * 450); // 도구 호출 지연(시각화용)
  const live = await tryLive(spec, args, settings);

  /* 실시간 성공: 공공데이터 결과를 그대로 사용. 관광지는 상세 검증(배지 갱신) + 검증 데이터 병합 후 반환 */
  if (live?.ok) {
    let items = live.items;
    let note = live.note;
    if (name === "searchOpenTouristSpots") {
      await enrichTourist(items, settings);
      items = mergeSpotPools(items, filterSpots(args));
      note = `${note} · 무장애 검증 내장 데이터 병합 (검증 곳 우선)`;
    }
    return { tool: spec, args, source: "live", liveNote: note, items, excluded: [] };
  }

  /* 실시간 실패 시 실측 스냅샷(실제 API 응답 캡처본) 사용 — 인증키 불필요 */
  const snap = await getSnapshot();
  if (snap) {
    const s = snapshotItems(name, args, snap);
    if (s?.items?.length) {
      return {
        tool: spec, args, source: "snapshot",
        liveNote: `실측 데이터 스냅샷 — 실제 API 응답 캡처본 사용 (수집: ${snap.capturedAt || "날짜 미상"})`,
        items: s.items, excluded: [],
      };
    }
  }

  let filtered;
  if (name === "searchOpenTouristSpots") filtered = filterSpots(args);
  else if (name === "searchAccessibleTrails") filtered = filterTrails(args);
  else if (name === "searchStayHotels") filtered = filterHotels(args);
  else filtered = filterRestaurants(args);

  /* 라이브 실패 사유 + 샘플 대체 사유를 한 줄로 합쳐 노트 표시 */
  const note = [live?.note, filtered.regionNote].filter(Boolean).join(" · ") || null;

  return {
    tool: spec,
    args,
    source: "sample",
    liveNote: note,
    items: filtered.items,
    excluded: filtered.excluded,
  };
}

/** 설정 저장소(localStorage) */
export function loadSettings() {
  try {
    const raw = localStorage.getItem("opennatri.settings.v1");
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (_) { /* 저장소 미사용 환경 */ }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s) {
  try { localStorage.setItem("opennatri.settings.v1", JSON.stringify(s)); } catch (_) {}
}

#!/usr/bin/env node
/**
 * capture-snapshot.mjs — 실측 데이터 스냅샷 캡처 (보안 안전 설계)
 *
 * ▶ 반드시 본인 컴퓨터에서 실행하세요. 인증키는 이 스크립트 실행에만 사용되며
 *   어디에도 저장·출력되지 않습니다. 생성되는 js/snapshot.js에는 데이터만 들어갑니다.
 *
 * 사용법:
 *   node capture-snapshot.mjs <공공데이터포털_인증키>
 *
 * 수집 내용 (공공데이터포털 실제 응답):
 *   1) 무장애여행 API(KorWithService2)  — 부산/서울/제주 무장애 콘텐츠 + 상위 3곳 상세 시설값
 *   2) 상권정보 API(sdsc2)              — 지역 대표 좌표 반경 600m 음식점
 *
 * 완료 후: js/snapshot.js 가 생성됩니다 → 이 파일을 Helpy 대화에 첨부하세요.
 */
import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const key = process.argv[2];
if (!key || key.length < 20) {
  console.error("사용법: node capture-snapshot.mjs <인증키>");
  console.error("※ 인증키는 공공데이터포털 마이페이지에서 복사 (URL 인코딩 상태 그대로)");
  process.exit(1);
}

/* 지역 코드·대표 좌표 (js/data.js의 값과 동일) */
const REGIONS = [
  { name: "부산", areaCode: "6", cx: "129.1583", cy: "35.1583" },
  { name: "서울", areaCode: "1", cx: "126.9241", cy: "37.5216" },
  { name: "제주", areaCode: "39", cx: "126.6299", cy: "33.4647" },
];

/** 공공 API 호출 + charset 방어 디코딩 */
async function callApi(path, params) {
  const qs = new URLSearchParams({ serviceKey: key, MobileOS: "ETC", MobileApp: "OpenNatri", ...params });
  const res = await fetch(`https://apis.data.go.kr/${path}?${qs}`, { signal: AbortSignal.timeout(12000) });
  const buf = await res.arrayBuffer();
  let text = new TextDecoder("utf-8").decode(buf);
  if (text.includes("\uFFFD")) { try { text = new TextDecoder("euc-kr").decode(buf); } catch (_) {} }
  const json = JSON.parse(text);
  const head = json?.response?.header || json?.header || {};
  const msg = head.resultMsg || "";
  if (json?.OpenAPI_ServiceResponse || (msg && msg !== "OK" && msg !== "NORMAL_SERVICE"))
    throw new Error(head.returnAuthMsg || head.resultMsg || json?.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnAuthMsg || "호출 오류");
  if (json?.resultCode && json.resultCode !== "00" && json.resultCode !== "0000")
    throw new Error(json?.resultMsg || "호출 오류");
  const it = json?.response?.body?.items?.item ?? json?.body?.items ?? json?.items ?? [];
  return Array.isArray(it) ? it : (it ? [it] : []);
}

const FOOD = /음식|한식|중식|일식|양식|분식|치킨|피자|카페|베이커리|패스트푸드|식당|해물|횟집|술집|국밥|냉면|떡볶이/i;

/** 무장애 상세 필드 → 배지 매핑 (앱 tools.js와 동일 규칙) */
function scanBarrier(raw) {
  const barrier = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!/^(Y|있음|가능|무료|유)/i.test(String(v))) continue;
    if (/wheelchairrental/i.test(k)) barrier.rental = "Y";
    else if (/(disabled|wheelchair|barrier).*toilet|toilet.*(disabled|wheelchair)/i.test(k)) barrier.toilet = "Y";
    else if (/wheelchairenter|entryroute/i.test(k)) barrier.enterable = "Y";
    else if (/elevator/i.test(k)) barrier.elevator = "Y";
    else if (/parking/i.test(k) && /(disab|wheelchair|barrier)/i.test(k)) barrier.parking = "Y";
  }
  return barrier;
}

console.log("① 무장애여행 API 수집 중…");
const tourist = {};
for (const r of REGIONS) {
  try {
    const items = await callApi("B551011/KorWithService2/areaBasedList2",
      { numOfRows: "8", pageNo: "1", areaCode: r.areaCode, _type: "json" });
    const mapped = [];
    for (const it of items.slice(0, 8)) {
      const spot = {
        contentid: it.contentid || "", contenttypeid: it.contenttypeid || "",
        title: it.title || "", addr1: it.addr1 || "",
        mapx: it.mapx || "", mapy: it.mapy || "",
        barrier: {}, barrierFound: false,
      };
      if (spot.contentid && spot.contenttypeid) {
        try {
          const d = await callApi("B551011/KorWithService2/detailIntro2",
            { numOfRows: "1", pageNo: "1", contentId: spot.contentid, contentTypeId: spot.contenttypeid, _type: "json" });
          const raw = d[0];
          if (raw) {
            const b = scanBarrier(raw);
            if (Object.keys(b).length) { spot.barrier = b; spot.barrierFound = true; }
          }
        } catch (_) { /* 상세 실패는 건너뜀 */ }
      }
      mapped.push(spot);
    }
    tourist[r.name] = mapped;
    console.log(`   ${r.name}: ${mapped.length}곳 (상세 검증 ${mapped.filter((s) => s.barrierFound).length}곳)`);
  } catch (e) {
    console.log(`   ${r.name}: 실패 — ${e.message}`);
    tourist[r.name] = [];
  }
}

console.log("② 상권정보 API 수집 중…");
const restaurants = {};
for (const r of REGIONS) {
  try {
    const items = await callApi("B553077/api/open/sdsc2/storeListInRadius",
      { numOfRows: "20", pageNo: "1", radius: "600", cx: r.cx, cy: r.cy, type: "json" });
    const food = items.filter((s) =>
      FOOD.test(String(s.indsLclsNm || "") + String(s.indsMclsNm || "") + String(s.indsSclsNm || "")));
    const use = (food.length ? food : items).slice(0, 8).map((s) => ({
      bizesId: s.bizesId || "", bizesNm: s.bizesNm || "",
      indsMclsNm: s.indsMclsNm || "", indsSclsNm: s.indsSclsNm || s.indsMclsNm || "",
      rdnmAdr: s.rdnmAdr || "", lon: s.lon || "", lat: s.lat || "",
    }));
    restaurants[r.name] = use;
    console.log(`   ${r.name}: ${use.length}곳 (음식점 필터 ${food.length ? "적용" : "미적용 — 전체 반환"})`);
  } catch (e) {
    console.log(`   ${r.name}: 실패 — ${e.message}`);
    restaurants[r.name] = [];
  }
}

const total = Object.values(tourist).flat().length + Object.values(restaurants).flat().length;
if (!total) { console.error("수집된 데이터가 없습니다. 인증키·활용신청 상태를 확인하세요."); process.exit(1); }

const snap = {
  capturedAt: new Date().toISOString(),
  source: "apis.data.go.kr — 무장애여행(KorWithService2) · 상가(상권)정보(sdsc2) 실제 응답 캡처",
  tourist, restaurants,
};
const jsonText = JSON.stringify(snap, null, 2).replace(/<\//g, "<\\/"); // </script> 방지
const out = `/**
 * 실측 데이터 스냅샷 (자동 생성 — capture-snapshot.mjs)
 * 실제 공공데이터포털 API 응답을 캡처한 것으로, 인증키는 포함되어 있지 않습니다.
 * 갱신: node capture-snapshot.mjs <인증키>  →  이 파일 교체  →  node build-standalone.mjs
 */
window.__SNAPSHOT__ = ${jsonText};
`;
const outPath = join(root, "js", "snapshot.js");
writeFileSync(outPath, out, "utf8");
console.log(`\n✅ 완료: js/snapshot.js (관광지 ${Object.values(tourist).flat().length}곳 · 음식점 ${Object.values(restaurants).flat().length}곳)`);
console.log("→ 이 파일을 Helpy 대화에 첨부하세요. (인증키는 파일에 포함되지 않았습니다)");
console.log("※ 참고: 프로젝트의 js/data.js 지역 좌표를 사용했습니다:", readFileSync(join(root, "js", "data.js"), "utf8").includes("REGION_CENTER") ? "확인" : "직접 정의");

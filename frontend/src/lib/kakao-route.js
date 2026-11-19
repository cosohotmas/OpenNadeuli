const GEO_CACHE_KEY = "opennatri.geo.v1";
function loadGeoCache() {
  try { return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || "{}"); } catch (_) { return {}; }
}
function saveGeoCache(c) {
  try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(c)); } catch (_) { /* 저장소 미사용 환경 */ }
}

let kakaoReadyKey = null;
let kakaoLoading;
/** 카카오맵 JS SDK를 한 번만 로드 (autoload=false → kakao.maps.load 후 사용 가능. 실패 시 false) */
function ensureKakao(key) {
  if (!key) return Promise.resolve(false);
  if (window.kakao?.maps && kakaoReadyKey === key) return Promise.resolve(true);
  kakaoLoading ??= new Promise((resolve) => {
    const js = document.createElement("script");
    const finish = (ok) => {
      clearTimeout(timeout);
      if (!ok) js.remove();
      resolve(ok);
    };
    const timeout = setTimeout(() => finish(false), 10000);
    /* 스크립트 태그 동적 삽입이라 file://·localhost·웹서버 모두 동일하게 동작 */
    js.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=services&autoload=false`;
    js.onload = () => {
      try {
        kakao.maps.load(() => { kakaoReadyKey = key; finish(true); });
      } catch (_) { finish(false); }
    };
    js.onerror = () => finish(false);
    document.head.appendChild(js);
  }).then((ok) => {
    if (!ok) kakaoLoading = undefined;
    return ok;
  });
  return kakaoLoading;
}

/* 지오코딩 큐 — 공급자 관계없이 초당 1회 수준으로 순차 처리 */
const geoQueue = [];
let geoBusy = false;
function enqueueGeocode(task) {
  geoQueue.push(task);
  void runGeoQueue();
}
async function runGeoQueue() {
  if (geoBusy) return;
  geoBusy = true;
  try {
    while (geoQueue.length) {
      try {
        await geoQueue.shift()();
      } catch {
        console.warn("나들이 장소 좌표 조회를 완료하지 못했어요.");
      }
      await new Promise((r) => setTimeout(r, 1100));
    }
  } finally {
    geoBusy = false;
  }
}

/** 카카오 장소(POI) 검색 → 좌표 (services 라이브러리) */
function kakaoSearch(q) {
  return new Promise((resolve) => {
    try {
      const places = new kakao.maps.services.Places();
      places.keywordSearch(q, (data, status) => {
        if (status === kakao.maps.services.Status.OK && data?.length && data[0].y && data[0].x) {
          resolve({ lat: +data[0].y, lng: +data[0].x });
        } else resolve(null);
      });
    } catch (_) { resolve(null); }
  });
}

/** Nominatim 지오코딩 → 좌표 (카카오 검색 실패 시 폴백) */
async function nominatimSearch(q) {
  try {
    const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=kr&accept-language=ko&q=${encodeURIComponent(q)}`;
    const res = await fetch(u, { signal: AbortSignal.timeout(6000) });
    const arr = await res.json();
    if (Array.isArray(arr) && arr.length && arr[0].lat && arr[0].lon) {
      return { lat: +arr[0].lat, lng: +arr[0].lon };
    }
  } catch (_) { /* 폴백 실패 */ }
  return null;
}

/** 장소 검색어 → 좌표 (캐시 우선 → 카카오 POI 검색 → Nominatim 폴백, 최종 null) */
async function geocodePoint(pt) {
  const cache = loadGeoCache();
  if (cache[pt.query]) return cache[pt.query];
  const kakaoReady = !!(window.kakao && window.kakao.maps && kakaoReadyKey);
  const kakaoFirst = kakaoReady ? [pt.queryAlt, pt.query].filter(Boolean) : [];   /* 카카오는 장소명이 유리 */
  const nomiFirst = [pt.query, pt.queryAlt].filter(Boolean);        /* Nominatim은 주소가 유리 */
  const seen = new Set();
  for (const q of kakaoFirst) {
    if (seen.has(q)) continue;
    seen.add(q);
    const hit = await kakaoSearch(q);
    if (hit) { cache[pt.query] = hit; saveGeoCache(cache); return hit; }
  }
  for (const q of nomiFirst) {
    if (seen.has(q)) continue;
    seen.add(q);
    const hit = await nominatimSearch(q);
    if (hit) { cache[pt.query] = hit; saveGeoCache(cache); return hit; }
  }
  return null;
}

export { enqueueGeocode, ensureKakao, geocodePoint };

export function kakaoLinks({ name, address, lat, lng }) {
  const base = 'https://map.kakao.com/link';
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    const pin = `${encodeURIComponent(name)},${lat},${lng}`;
    return { map: `${base}/map/${pin}`, directions: `${base}/to/${pin}` };
  }
  return { map: `${base}/search/${encodeURIComponent([name, address].filter(Boolean).join(' '))}` };
}

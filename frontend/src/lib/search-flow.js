import { ensureKakao } from './kakao-route.js';
import regions from './search-regions.json';

export const regionOptions = regions.map(({ region }) => region);
const provinceAliases = {
  경상북도: '경북', 경상남도: '경남', 충청북도: '충북', 충청남도: '충남',
  전라북도: '전북', 전라남도: '전남',
};

const LOCATION_WAIT_MS = 30_000;
const POSITION_TIMEOUT_MS = 15_000;
const REGION_CACHE_KEY = 'opennadeuli.recent-region.v1';
const REGION_FALLBACK_AGE_MS = 30 * 60_000;
let recentRegion;

function cachedRegion(maxAge) {
  let cached = recentRegion;
  if (!cached) {
    try { cached = JSON.parse(sessionStorage.getItem(REGION_CACHE_KEY)); } catch { /* storage unavailable */ }
  }
  const age = Date.now() - cached?.at;
  return regionOptions.includes(cached?.region) && age >= 0 && age < maxAge ? cached.region : null;
}

function rememberRegion(region) {
  recentRegion = { region, at: Date.now() };
  try { sessionStorage.setItem(REGION_CACHE_KEY, JSON.stringify(recentRegion)); } catch { /* storage unavailable */ }
}

async function reverseRegion(position) {
  if (!__KAKAO_MAP_JS_KEY__) return null;
  return new Promise((resolve) => {
    let expired = false;
    const timer = setTimeout(() => { expired = true; resolve(null); }, 6000);
    const finish = (value) => { clearTimeout(timer); resolve(value); };
    void ensureKakao(__KAKAO_MAP_JS_KEY__).then((ready) => {
      if (expired || !ready) return finish(null);
      const { services } = window.kakao.maps;
      const { latitude, longitude } = position.coords;
      new services.Geocoder().coord2RegionCode(
        Number(longitude.toFixed(3)), Number(latitude.toFixed(3)), (rows, status) => {
          const province = status === services.Status.OK && rows[0]?.region_1depth_name;
          finish(province ? provinceAliases[province] || regionOptions.find((name) => province.startsWith(name)) : null);
        });
    }).catch(() => finish(null));
  });
}

function unavailable(locationStatus) {
  const region = locationStatus === 'denied' ? null : cachedRegion(REGION_FALLBACK_AGE_MS);
  return region ? { region, regionSource: 'location_recent', locationStatus }
    : { regionSource: 'location_unavailable', locationStatus };
}

export async function resolveSearchRegion(text, selected, report, onLateRegion = () => {}) {
  if (regions.some(({ keys }) => keys.some((key) => text.includes(key)))) return {};
  if (selected) return { region: selected, regionSource: 'selected' };
  if (!navigator.geolocation || !navigator.onLine) return unavailable('unavailable');
  const fresh = cachedRegion(60_000);
  if (fresh) return { region: fresh, regionSource: 'location' };
  report('현재 위치 확인 중 · 브라우저 권한 요청에 응답해 주세요.');
  return new Promise((resolve) => {
    let settled = false;
    let accepted = false;
    let retried = false;
    let generation = 0;
    let timer;
    let permission;
    const finish = (location) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      permission?.removeEventListener('change', permissionChanged);
      resolve(location);
    };
    const deadline = (ms) => {
      clearTimeout(timer);
      timer = setTimeout(() => finish(unavailable('timeout')), ms);
    };
    const success = async (position) => {
      if (accepted) return;
      accepted = true;
      clearTimeout(timer);
      if (!settled) report('좌표 수신 완료 · 현재 위치의 지역 확인 중');
      const region = await reverseRegion(position);
      if (!region) return finish(unavailable('region_unknown'));
      rememberRegion(region);
      if (settled) onLateRegion(region);
      else finish({ region, regionSource: 'location' });
    };
    function retryPosition() {
      if (settled || accepted || retried) return false;
      retried = true;
      report('현재 위치 좌표를 다시 요청하는 중');
      deadline(POSITION_TIMEOUT_MS + 1000);
      requestPosition();
      return true;
    }
    function permissionChanged() {
      if (permission.state === 'granted') retryPosition();
      else if (permission.state === 'denied') finish(unavailable('denied'));
    }
    function requestPosition() {
      const attempt = ++generation;
      const failure = (error) => {
        if (settled || accepted || attempt !== generation) return;
        if (error?.code === 3 && permission?.state !== 'denied' && retryPosition()) return;
        finish(unavailable(error?.code === 1 ? 'denied' : error?.code === 3 ? 'timeout' : 'unavailable'));
      };
      try {
        navigator.geolocation.getCurrentPosition(success, failure, {
          timeout: POSITION_TIMEOUT_MS, maximumAge: 60_000, enableHighAccuracy: false,
        });
      } catch {
        failure();
      }
    }
    deadline(LOCATION_WAIT_MS);
    // Observe permission in parallel so unsupported or slow Permissions APIs cannot block the prompt.
    void Promise.resolve().then(() => navigator.permissions?.query({ name: 'geolocation' })).then((status) => {
      if (settled || accepted || !status) return;
      permission = status;
      status.addEventListener('change', permissionChanged);
      if (status.state === 'denied') permissionChanged();
    }).catch(() => {});
    requestPosition();
  });
}

export function searchProgress(location) {
  const progress = '관광지·편의시설 조회 및 동선 구성 중';
  if (location.regionSource === 'location') return `현재 위치 확인 · ${location.region} · ${progress}`;
  if (location.regionSource !== 'location_unavailable' && location.regionSource !== 'location_recent') return progress;
  const reason = {
    denied: '위치 권한 거부', timeout: '위치 확인 시간 초과',
    region_unknown: '좌표 수신 · 지역 판별 실패', unavailable: '현재 위치 확인 불가',
  }[location.locationStatus];
  const basis = location.regionSource === 'location_recent' ? `최근 확인 지역 ${location.region}` : '기본 지역 서울';
  return `${reason} · ${basis} · ${progress}`;
}
export function revealDelay(index) {
  return Math.min(index, 10) * 65;
}

export function scrollToResponse(element) {
  element?.scrollIntoView({ block: 'start', behavior: 'instant' });
}

import { ensureKakao } from './kakao-route.js';
import regions from './search-regions.json';

export const regionOptions = regions.map(({ region }) => region);
const provinceAliases = {
  경상북도: '경북', 경상남도: '경남', 충청북도: '충북', 충청남도: '충남',
  전라북도: '전북', 전라남도: '전남',
};

const LOCATION_WAIT_MS = 30_000;
let recentRegion;

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
  return { regionSource: 'location_unavailable', locationStatus };
}

export async function resolveSearchRegion(text, selected, report, onLateRegion = () => {}) {
  if (regions.some(({ keys }) => keys.some((key) => text.includes(key)))) return {};
  if (selected) return { region: selected, regionSource: 'selected' };
  if (!navigator.geolocation || !navigator.onLine) return unavailable('unavailable');
  if (recentRegion && Date.now() - recentRegion.at < 60_000) {
    return { region: recentRegion.region, regionSource: 'location' };
  }
  report('현재 위치 확인 중 · 브라우저 권한 요청에 응답해 주세요.');
  return new Promise((resolve) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      resolve(unavailable('timeout'));
    }, LOCATION_WAIT_MS);
    const success = async (position) => {
      clearTimeout(timer);
      if (!timedOut) report('좌표 수신 완료 · 현재 위치의 지역 확인 중');
      const region = await reverseRegion(position);
      if (region) {
        recentRegion = { region, at: Date.now() };
        if (timedOut) onLateRegion(region);
        else resolve({ region, regionSource: 'location' });
      } else if (!timedOut) resolve(unavailable('region_unknown'));
    };
    const failure = (error) => {
      clearTimeout(timer);
      resolve(unavailable(error?.code === 1 ? 'denied' : error?.code === 3 ? 'timeout' : 'unavailable'));
    };
    try {
      navigator.geolocation.getCurrentPosition(success, failure, {
        timeout: 12_000, maximumAge: 60_000, enableHighAccuracy: false,
      });
    } catch {
      failure();
    }
  });
}

export function searchProgress(location) {
  const progress = '관광지·편의시설 조회 및 동선 구성 중';
  if (location.regionSource === 'location') return `현재 위치 확인 · ${location.region} · ${progress}`;
  if (location.regionSource !== 'location_unavailable') return progress;
  const reason = {
    denied: '위치 권한 거부', timeout: '위치 확인 시간 초과',
    region_unknown: '좌표 수신 · 지역 판별 실패', unavailable: '현재 위치 확인 불가',
  }[location.locationStatus];
  return `${reason} · 기본 지역 서울 · ${progress}`;
}
export function revealDelay(index) {
  return Math.min(index, 10) * 65;
}

export function scrollToResponse(element) {
  element?.scrollIntoView({ block: 'start', behavior: 'instant' });
}

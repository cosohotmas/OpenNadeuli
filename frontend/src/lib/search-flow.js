import { ensureKakao } from './kakao-route.js';
import regions from './search-regions.json';

export const regionOptions = regions.map(({ region }) => region);
const provinceAliases = {
  경상북도: '경북', 경상남도: '경남', 충청북도: '충북', 충청남도: '충남',
  전라북도: '전북', 전라남도: '전남',
};

export async function resolveSearchRegion(text, selected, report) {
  if (regions.some(({ keys }) => keys.some((key) => text.includes(key)))) return {};
  if (selected) return { region: selected, regionSource: 'selected' };
  const unavailable = { regionSource: 'location_unavailable' };
  if (!navigator.geolocation || !navigator.onLine || !__KAKAO_MAP_JS_KEY__) return unavailable;
  report('현재 위치에서 검색 지역 확인 중');
  const position = await new Promise((resolve) => {
    // A permission prompt itself may exceed the browser geolocation timeout.
    const timer = setTimeout(() => resolve(null), 5500);
    const finish = (value) => { clearTimeout(timer); resolve(value); };
    try {
      navigator.geolocation.getCurrentPosition(finish, () => finish(null), {
        timeout: 4500, maximumAge: 60000, enableHighAccuracy: false,
      });
    } catch {
      finish(null);
    }
  });
  if (!position) return unavailable;
  const region = await new Promise((resolve) => {
    let expired = false;
    const timer = setTimeout(() => { expired = true; resolve(null); }, 3000);
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
  return region ? { region, regionSource: 'location' } : unavailable;
}

export function revealDelay(index) {
  return Math.min(index, 10) * 65;
}

export function scrollToResponse(element) {
  element?.scrollIntoView({ block: 'start', behavior: 'instant' });
}

import { useEffect, useRef, useState } from 'react';
import type { CourseCard } from '../types';

declare const __KAKAO_MAP_JS_KEY__: string;

type Position = object;
type MapView = { setBounds(bounds: object): void };
type Overlay = { setMap(map: MapView | null): void };
type Coordinates = { x: string; y: string };
type Place = Coordinates & { place_name: string; address_name?: string };
type MapLocation = { position: Position; approximate: boolean };
type Maps = {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => Position;
  LatLngBounds: new () => { extend(position: Position): void };
  Map: new (element: HTMLElement, options: { center: Position; level: number }) => MapView;
  CustomOverlay: new (options: { map: MapView; position: Position; content: HTMLElement }) => Overlay;
  Polyline: new (options: {
    map: MapView; path: Position[]; strokeColor: string; strokeWeight: number; strokeStyle: string;
  }) => Overlay;
  services: {
    Places: new () => { keywordSearch(query: string, callback: (places: Place[], status: string) => void): void };
    Geocoder: new () => { addressSearch(query: string, callback: (places: Coordinates[], status: string) => void): void };
    Status: { OK: string };
  };
};

let sdk: Promise<Maps> | undefined;

function loadMaps() {
  sdk ??= new Promise<Maps>((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => reject(new Error('Kakao Maps SDK timed out')), 10000);
    const fail = () => {
      window.clearTimeout(timeout);
      reject(new Error('Kakao Maps SDK could not load'));
    };
    const params = new URLSearchParams({
      appkey: __KAKAO_MAP_JS_KEY__,
      libraries: 'services',
      autoload: 'false',
    });
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?${params}`;
    script.onerror = fail;
    script.onload = () => {
      const maps = (window as Window & { kakao?: { maps: Maps } }).kakao?.maps;
      if (!maps) {
        fail();
        return;
      }
      maps.load(() => {
        window.clearTimeout(timeout);
        resolve(maps);
      });
    };
    document.head.appendChild(script);
  });
  return sdk;
}

const normalizeName = (name: string) => name.replace(/[^\p{L}\p{N}]/gu, '');

function searchCoordinates<T extends Coordinates>(
  maps: Maps,
  search: (callback: (results: T[], status: string) => void) => void,
  select: (results: T[]) => T | undefined,
) {
  return new Promise<Position | null>((resolve) => {
    const timeout = window.setTimeout(() => resolve(null), 5000);
    search((results, status) => {
      window.clearTimeout(timeout);
      const match = status === maps.services.Status.OK ? select(results) : undefined;
      const lat = Number(match?.y);
      const lng = Number(match?.x);
      resolve(Number.isFinite(lat) && Number.isFinite(lng) ? new maps.LatLng(lat, lng) : null);
    });
  });
}

async function findPosition(maps: Maps, point: CourseCard): Promise<MapLocation | null> {
  const places = new maps.services.Places();
  const name = point.name.replace(/\s+무장애구역$/, '');
  const searchName = (query: string) => searchCoordinates<Place>(
    maps,
    (callback) => places.keywordSearch(query, callback),
    (results) => results.find((place) => normalizeName(place.place_name) === normalizeName(query)),
  );
  const byName = await searchName(name);
  if (byName) return { position: byName, approximate: false };
  if (!point.address) return null;

  const byAddress = /\d/.test(point.address)
    ? await searchCoordinates<Coordinates>(
      maps,
      (callback) => new maps.services.Geocoder().addressSearch(point.address, callback),
      (results) => results[0],
    )
    : await searchName(point.address);
  return byAddress ? { position: byAddress, approximate: true } : null;
}

export default function CourseMap({ points }: { points: CourseCard[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [approximate, setApproximate] = useState(false);
  const [foundCount, setFoundCount] = useState<number | null>(null);

  useEffect(() => {
    if (!__KAKAO_MAP_JS_KEY__ || !points.length) return;
    let cancelled = false;
    const overlays: Overlay[] = [];
    const container = mapRef.current;

    const showMap = async () => {
      const maps = await loadMaps();
      if (cancelled || !container) return;
      const hits = await Promise.all(points.map(async (point) => ({
        point, location: await findPosition(maps, point),
      })));
      if (cancelled) return;
      const locations = hits.flatMap(({ point, location }) => location ? [{ point, ...location }] : []);
      setApproximate(locations.some((location) => location.approximate));
      setFoundCount(locations.length);
      if (!locations.length) return;

      const map = new maps.Map(container, { center: locations[0].position, level: 5 });
      const bounds = new maps.LatLngBounds();
      for (const { point, position } of locations) {
        const label = document.createElement('span');
        label.className = 'route-map-marker';
        label.textContent = String(point.no);
        label.title = point.name;
        bounds.extend(position);
        overlays.push(new maps.CustomOverlay({ map, position, content: label }));
      }
      if (locations.length > 1) {
        map.setBounds(bounds);
        if (locations.length === points.length) {
          overlays.push(new maps.Polyline({
            map, path: locations.map(({ position }) => position),
            strokeColor: '#18634b', strokeWeight: 3, strokeStyle: 'shortdash',
          }));
        }
      }
    };
    void showMap().catch(() => {
      if (!cancelled) {
        console.warn('Kakao Maps could not display the itinerary');
        setFoundCount(0);
      }
    });
    return () => {
      cancelled = true;
      overlays.forEach((overlay) => overlay.setMap(null));
      container?.replaceChildren();
    };
  }, [points]);

  if (!__KAKAO_MAP_JS_KEY__) return null;

  return (
    <>
      <div ref={mapRef} className="route-map" aria-label="방문 순서 지도" aria-hidden={!foundCount} hidden={foundCount === 0} />
      {foundCount !== null && foundCount < points.length && (
        <p role="status">지도에 표시된 방문지 {foundCount}/{points.length}곳. 아래 장소별 지도 링크를 이용할 수 있어요.</p>
      )}
      {approximate && <p>일부 핀은 도로명 주소 또는 탐방로 출발점 기준입니다.</p>}
      {foundCount !== null && foundCount > 1 && foundCount === points.length && (
        <p>점선은 방문 순서를 나타냅니다.</p>
      )}
    </>
  );
}

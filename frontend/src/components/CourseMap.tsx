import { kakaoLinks } from '../lib/kakao-route.js';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { RoutePoint } from '../types';
import { enqueueGeocode, ensureKakao, geocodePoint, type Coordinates } from '../lib/kakao-route.js';

declare const __KAKAO_MAP_JS_KEY__: string;

type Position = object;
type Bounds = { extend(position: Position): void };
type MapView = { setBounds(bounds: Bounds): void; setCenter(position: Position): void; panTo(position: Position): void };
type Overlay = { setMap(map: MapView | null): void };
type Maps = {
  LatLng: new (lat: number, lng: number) => Position;
  LatLngBounds: new () => Bounds;
  Map: new (element: HTMLElement, options: { center: Position; level: number }) => MapView;
  CustomOverlay: new (options: { map: MapView; position: Position; content: HTMLElement; clickable: boolean; zIndex: number }) => Overlay;
  Polyline: new (options: {
    map: MapView; path: Position[][]; strokeColor: string; strokeWeight: number; strokeStyle: string;
  }) => Overlay;
  InfoWindow: new (options: { removable: boolean }) => {
    close(): void;
    setContent(content: HTMLElement): void;
    setPosition(position: Position): void;
    open(map: MapView): void;
  };
};

function popupFor(point: RoutePoint) {
  const content = document.createElement('div');
  content.className = 'route-popup';
  const name = document.createElement('strong');
  name.textContent = `${point.no}. ${point.name}`;
  const details = document.createElement('p');
  details.textContent = [point.phase, point.address || point.query].filter(Boolean).join(' · ');
  const access = document.createElement('p');
  access.textContent = point.barrier.join(' · ');
  content.append(name, details, access);
  const links = kakaoLinks(point);
  for (const [label, url] of [[links.mapLabel, links.map], ['주소로 검색 ↗', links.addressSearch], [links.directionsLabel, links.directions]] as const) {
    if (!url) continue;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = label;
    content.append(link, document.createTextNode(' '));
  }
  return content;
}

export interface CourseMapHandle {
  focusVisit(no: number): boolean;
}

const CourseMap = forwardRef<CourseMapHandle, { points: RoutePoint[] }>(function CourseMap({ points }, ref) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState<number | null>(null);
  const focusByNumber = useRef(new Map<number, () => void>());
  useImperativeHandle(ref, () => ({
    focusVisit(no) {
      const focus = focusByNumber.current.get(no);
      if (!focus) return false;
      mapRef.current?.closest('section')?.scrollIntoView({ block: 'start' });
      focus();
      return true;
    },
  }), []);

  useEffect(() => {
    const container = mapRef.current;
    if (!container || !__KAKAO_MAP_JS_KEY__ || !points.length) return;
    let cancelled = false;
    const overlays: Overlay[] = [];
    const visitActions = focusByNumber.current;
    let closePopup: (() => void) | undefined;

    const showMap = async () => {
      const ready = await ensureKakao(__KAKAO_MAP_JS_KEY__);
      if (cancelled) return;
      const maps = (window as Window & { kakao?: { maps: Maps } }).kakao?.maps;
      if (!ready || !maps) {
        setCount(0);
        return;
      }

      const resolvePoint = (point: RoutePoint) => new Promise<Coordinates | null>((resolve) => {
        if (typeof point.lat === 'number' && typeof point.lng === 'number') {
          resolve({ lat: point.lat, lng: point.lng });
          return;
        }
        enqueueGeocode(async () => {
          if (cancelled) {
            resolve(null);
            return;
          }
          try {
            resolve(await geocodePoint(point));
          } catch {
            resolve(null);
          }
        });
      });
      const locations = await Promise.all(points.map(resolvePoint));
      if (cancelled) return;
      const first = locations.find((point) => point !== null);
      if (!first) {
        setCount(0);
        return;
      }

      const toPosition = ({ lat, lng }: Coordinates) => new maps.LatLng(lat, lng);
      const map = new maps.Map(container, { center: toPosition(first), level: 6 });
      const popup = new maps.InfoWindow({ removable: true });
      closePopup = () => popup.close();
      const groups = new Map<string, HTMLElement>();
      const bounds = new maps.LatLngBounds();
      const segments: Position[][] = [];
      let segment: Position[] = [];

      locations.forEach((coordinates, index) => {
        if (!coordinates) {
          if (segment.length > 1) segments.push(segment);
          segment = [];
          return;
        }
        const point = points[index];
        const position = toPosition(coordinates);
        segment.push(position);
        const key = `${coordinates.lat},${coordinates.lng}`;
        let group = groups.get(key);
        if (!group) {
          group = document.createElement('div');
          group.className = 'route-pin-group';
          groups.set(key, group);
          bounds.extend(position);
          overlays.push(new maps.CustomOverlay({ map, position, content: group, clickable: true, zIndex: 10 }));
        }

        const pin = document.createElement('button');
        pin.type = 'button';
        pin.className = 'route-map-marker';
        pin.textContent = String(point.no);
        pin.setAttribute('aria-label', `${point.no}번 ${point.name} 무장애 정보`);
        const showPopup = () => {
          map.panTo(position);
          popup.setContent(popupFor(kakaoLinks(point).notice ? point : { ...point, ...coordinates }));
          popup.setPosition(position);
          popup.open(map);
        };
        pin.addEventListener('click', showPopup);
        visitActions.set(point.no, () => {
          pin.focus({ preventScroll: true });
          showPopup();
        });
        group.append(pin);
      });
      if (segment.length > 1) segments.push(segment);
      if (segments.length) overlays.push(new maps.Polyline({
        map, path: segments, strokeColor: '#18634b', strokeWeight: 3, strokeStyle: 'shortdash',
      }));
      if (groups.size > 1) map.setBounds(bounds);
      setCount(locations.filter(Boolean).length);
    };

    void showMap().catch((error: unknown) => {
      console.warn('Kakao Maps could not display the itinerary', error instanceof Error ? error.name : '');
      if (!cancelled) setCount(0);
    });
    return () => {
      cancelled = true;
      visitActions.clear();
      closePopup?.();
      overlays.forEach((overlay) => overlay.setMap(null));
      container.replaceChildren();
    };
  }, [points]);

  if (!__KAKAO_MAP_JS_KEY__) return <p>아래 장소별 지도 링크에서 위치를 확인할 수 있어요.</p>;

  return (
    <>
      <div ref={mapRef} className="route-map" aria-label="방문 순서 지도" aria-hidden={!count} hidden={count === 0} />
      <p role="status">
        {count === null ? '장소 좌표를 확인하는 중이에요.'
          : count === 0 ? '지도에 표시할 좌표를 찾지 못했어요. 아래 링크에서 장소를 확인할 수 있어요.'
          : `${points.length}곳 중 ${count}곳을 지도에 표시했어요. 핀을 누르면 무장애 정보를 볼 수 있어요.`}
      </p>
    </>
  );
});

export default CourseMap;

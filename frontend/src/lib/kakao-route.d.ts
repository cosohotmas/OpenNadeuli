import type { RoutePoint } from '../types';

export interface Coordinates {
  lat: number;
  lng: number;
}

export function ensureKakao(key: string): Promise<boolean>;
export function enqueueGeocode(task: () => Promise<void>): void;
export function geocodePoint(point: RoutePoint): Promise<Coordinates | null>;
export function kakaoLinks(place: { name: string; address?: string; kind?: string; lat?: number | null; lng?: number | null }): {
  map: string;
  mapLabel: string;
  addressSearch?: string;
  directionsLabel: string;
  notice?: string;
  directions?: string;
};

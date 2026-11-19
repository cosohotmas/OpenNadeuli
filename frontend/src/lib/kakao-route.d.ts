import type { RoutePoint } from '../types';

export interface Coordinates {
  lat: number;
  lng: number;
}

export function ensureKakao(key: string): Promise<boolean>;
export function enqueueGeocode(task: () => Promise<void>): void;
export function geocodePoint(point: RoutePoint): Promise<Coordinates | null>;

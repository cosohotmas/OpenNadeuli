export type SearchRegion = {
  region?: string;
  locationStatus?: 'denied' | 'timeout' | 'region_unknown' | 'unavailable';
  regionSource?: 'selected' | 'location' | 'location_unavailable';
};
export const regionOptions: string[];
export function resolveSearchRegion(text: string, selected: string, report: (step: string) => void, onLateRegion?: (region: string) => void): Promise<SearchRegion>;
export function revealDelay(index: number): number;
export function scrollToResponse(element: HTMLElement | null): void;

export function searchProgress(location: SearchRegion): string;

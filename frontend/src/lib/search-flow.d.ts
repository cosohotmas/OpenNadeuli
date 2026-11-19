export type SearchRegion = {
  region?: string;
  regionSource?: 'selected' | 'location' | 'location_unavailable';
};
export const regionOptions: string[];
export function resolveSearchRegion(text: string, selected: string, report: (step: string) => void): Promise<SearchRegion>;
export function revealDelay(index: number): number;
export function scrollToResponse(element: HTMLElement | null): void;

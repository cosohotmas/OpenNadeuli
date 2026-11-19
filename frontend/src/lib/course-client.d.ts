import type { CourseResponse, CourseSchedule, PublicSource, SourceType } from '../types';

export function requestCourse(text: string, schedule?: CourseSchedule): Promise<CourseResponse>;
export function sourceLabel(sourceType?: SourceType | null): string;
export function sourceLines(source: Partial<PublicSource>): string[];
export class CourseApiError extends Error {
  allowFallback: boolean;
}
export function cardMetadata(card: import('../types').CourseCard): {
  chips: { tone: string; text: string }[];
  fields: [string, string][];
};
export function familyInvite(places: import('../types').CourseCard[]): string;

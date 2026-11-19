import type { CourseResponse, CourseSchedule, PublicSource, SourceType } from '../types';

export function requestCourse(text: string, schedule?: CourseSchedule): Promise<CourseResponse>;
export function sourceLabel(sourceType?: SourceType | null): string;
export function sourceLines(source: Partial<PublicSource>): string[];
export class CourseApiError extends Error {
  allowFallback: boolean;
}

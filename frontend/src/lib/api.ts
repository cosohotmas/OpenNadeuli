/** 백엔드 API 호출 유틸리티 */
import type { CourseRequest, CourseResponse } from '../types';

/** 백엔드 API base URL — 직접 호출 사용 (Vite 프록시 사용 안 함) */
export const API_BASE = 'http://127.0.0.1:8899';

/**
 * 사용자 입력을 백엔드로 보내고 에이전트 응답을 받는다.
 *
 * @param text 사용자가 입력한 자연어 요청
 * @param schedule 선택적 일정 설정 (tripType, d1, d2, meal, cafe, hotel)
 * @returns 에이전트 응답 (intro, cards, followups 포함)
 */
export async function postCourse(
  text: string,
  schedule?: {
    tripType: 'day' | 'overnight';
    d1: { s: number; e: number };
    d2: { s: number; e: number };
    meal: boolean;
    cafe: boolean;
    hotel: boolean;
  },
): Promise<CourseResponse> {
  const body: CourseRequest = { text, schedule };
  const res = await fetch(`${API_BASE}/course`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API 요청 실패: ${res.status} ${err}`);
  }

  return res.json();
}

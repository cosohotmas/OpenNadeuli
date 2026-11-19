/** 백엔드 API 호출 유틸리티 */
import type { CourseRequest, CourseResponse } from '../types';

/** 현재 origin의 백엔드 API 경로 */
export const API_BASE = '/api';

/**
 * 사용자 입력을 백엔드로 보내고 에이전트 응답을 받는다.
 *
 * @param text 사용자가 입력한 자연어 요청
 * @param schedule 선택적 일정 설정 (tripType, d1, d2, meal, cafe, hotel)
 * @returns 에이전트 응답 (intro, cards, followups 포함)
 */
export async function postCourse(
  text: string,
  schedule?: CourseRequest['schedule'],
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

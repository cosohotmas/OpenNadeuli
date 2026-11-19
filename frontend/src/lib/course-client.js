const base = (__COURSE_API_BASE__ || '/api').replace(/\/+$/, '');

const sourceNames = {
  live_api: '공공 API 조회',
  public_dataset: '공식 공개 데이터',
  fallback_mock: '시연용 내장 샘플',
};

export function sourceLabel(sourceType) {
  return sourceNames[sourceType] || '';
}

export class CourseApiError extends Error {
  constructor(message, allowFallback = false) {
    super(message);
    this.allowFallback = allowFallback;
  }
}

export async function requestCourse(text, schedule) {
  if (window.location.protocol === 'file:' || !navigator.onLine) {
    throw new CourseApiError('온라인 코스 API에 연결할 수 없어요.', true);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);
  try {
    const response = await fetch(`${base}/course`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, schedule }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new CourseApiError('공공데이터 코스 API를 이용할 수 없어요.', response.status >= 500);
    }
    const result = await response.json();
    if (!Array.isArray(result.events) || !Array.isArray(result.answer?.cards)) {
      throw new CourseApiError('코스 API 응답을 읽지 못했어요.', true);
    }
    return result;
  } catch (error) {
    if (error instanceof CourseApiError) throw error;
    throw new CourseApiError('공공데이터 코스 API에 연결할 수 없어요.', true);
  } finally {
    clearTimeout(timeout);
  }
}

export function sourceLines(source) {
  return [
    sourceLabel(source.sourceType),
    source.provider || '',
    source.fetchedAt ? `API 조회 ${source.fetchedAt}` : '',
    source.sourceUpdatedAt ? `원본 기준·갱신일 ${source.sourceUpdatedAt}` : '원본 기준·갱신일 미제공',
  ].filter(Boolean);
}

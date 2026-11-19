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

export function cardMetadata(card) {
  const chips = [];
  const fields = [];
  const source = sourceLabel(card.sourceType);
  const shop = card.sourceType === 'live_api' && ['식당', '카페'].includes(card.kind);
  const details = Array.isArray(card.details) ? card.details : Object.entries(card.details || {});
  if (source) {
    const period = shop && /^\d{6}$/.test(card.sourceUpdatedAt || '') ? ` · 상권 ${card.sourceUpdatedAt}` : '';
    chips.push({ tone: 'source', text: source + period });
    fields.push(['출처', card.provider || source], ['원본 기준·갱신일', card.sourceUpdatedAt || '미제공']);
  }
  if (card.fetchedAt) fields.push(['API 조회 시각', card.fetchedAt]);
  if (card.accessibilityFetchedAt) fields.push(['무장애 상세 조회 시각', card.accessibilityFetchedAt]);
  details.forEach(([label, value]) => {
    if (label === '업종') chips.push({ tone: 'neutral', text: `업종: ${value}` });
    else fields.push([label, value]);
  });
  const attributes = card.verifiedAttributes || [];
  for (const { field, label, value } of attributes) {
    const shortValue = value.length <= 18 && !/[\r\n]/.test(value) ? `: ${value}` : ' 정보';
    chips.push({ tone: ['restroom', 'parking'].includes(field) ? 'facility' : 'access',
      text: label + shortValue });
    fields.push([`공공데이터에 기재 · ${label}`, value]);
  }
  if (card.verificationNotice) {
    const text = shop ? '출입구 턱·좌석·화장실' : card.verificationNotice.replace(/ 확인$/, '');
    chips.push({ tone: 'notice', text: `📞 ${text} 현장·유선 확인 권장` });
    fields.push(['현장·유선 확인 권장', card.verificationNotice]);
  }
  return { chips, fields };
}

export type SourceType = 'live_api' | 'public_dataset' | 'fallback_mock';

export interface PublicSource {
  sourceType?: SourceType | null;
  provider?: string;
  sourceUrl?: string;
  fetchedAt?: string | null;
  sourceUpdatedAt?: string | null;
}

/** 에이전트 응답에서 사용하는 카드 UI 타입 */
export interface CourseCard extends PublicSource {
  no: number;
  day?: number | null;
  time?: string | null;
  phase: string;
  kind?: string;
  mapQuery?: string;
  lat?: number | null;
  lng?: number | null;
  name: string;
  address: string;
  emoji: string;
  badges: string[];
  details?: Record<string, string>;
  tip: string;
  verifiedAttributes?: { label: string; value: string; field: string }[];
  accessibilityFetchedAt?: string | null;
  verificationNotice?: string;
}

export interface RoutePoint {
  no: number;
  day: number | null;
  time: string | null;
  phase: string;
  name: string;
  address: string;
  emoji: string;
  barrier: string[];
  query: string;
  queryAlt: string;
  lat?: number | null;
  lng?: number | null;
}

export interface CourseStep {
  title: string;
  detail?: string;
  done?: string;
  args?: unknown;
  notes?: string[];
  source?: PublicSource;
  labels?: string[];
}

/** 채팅 메시지 타입 */
export interface ChatMessage {
  id: number;
  type: 'user' | 'agent';
  text?: string;
  intro?: string;
  cards?: CourseCard[];
  summary?: string[];
  labels?: string[];
  steps?: CourseStep[];
  invite?: string;
  route?: { points: RoutePoint[] };
  followups?: string[];
  meta?: {
    source: string;
    region: string;
    variant: number;
  };
}

/** 에이전트 API 요청의 코스 요청 타입 */
export interface CourseRequest {
  text: string;
  schedule?: CourseSchedule;
}

export interface CourseSchedule {
    tripType: 'day' | 'overnight';
    d1: {
      s: number;
      e: number;
    };
    d2: {
      s: number;
      e: number;
    };
    meal: boolean;
    cafe: boolean;
    hotel: boolean;
}

/** 백엔드 응답의 코스 부분 */
export interface CourseAnswer {
  type: string;
  intro: string;
  labels: string[];
  cards: CourseCard[];
  summary: string[];
  invite: string;
  route: { points: RoutePoint[] };
  followups: string[];
  meta: {
    source: string;
    region: string;
    variant: number;
  };
}

/** 백엔드 응답 전체 */
export interface CourseResponse {
  events: Array<{
    type: string;
    step?: string;
    detail?: string;
    call?: { name: string; args: unknown };
    result?: PublicSource & {
      status: 'success' | 'empty' | 'unavailable' | 'skipped';
      count: number;
      note?: string | null;
    };
  }>;
  answer?: CourseAnswer;
  source?: string;
  sourceType?: SourceType | null;
}

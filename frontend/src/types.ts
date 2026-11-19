/** 에이전트 응답에서 사용하는 카드 UI 타입 */
export interface CourseCard {
  no: number;
  day?: number;
  time?: string;
  phase: string;
  name: string;
  address: string;
  emoji: string;
  badges: string[];
  details?: Record<string, string>;
  tip: string;
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
  lookups?: { name: string; count: number; source: string }[];
  invite?: string;
  route?: CourseAnswer['route'];
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
  route: {
    points: CourseCard[];
  };
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
    result?: {
      source: string;
      items: Array<{
        contentid?: string;
        title: string;
        addr1?: string;
        emoji?: string;
        barrier?: Record<string, unknown>;
        usageHour?: string;
        tip?: string;
      }>;
      excluded?: string[];
      note?: string;
    };
  }>;
  answer?: CourseAnswer;
  source?: string;
}

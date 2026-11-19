import type { CourseSchedule, RoutePoint } from '../types';

type SampleCard = {
  no: number;
  phase: string;
  name: string;
  address: string;
  emoji: string;
  kind: string;
  badges: string[];
  badgeNote?: Record<string, string>;
  details?: [string, string][];
  tip: string;
  mapQuery?: string;
};

export interface SampleAnswer {
  intro: string;
  labels?: string[];
  cards?: SampleCard[];
  summary?: string[];
  invite?: string;
  route?: { points: RoutePoint[] };
  followups?: string[];
}

export const BADGE_DEFS: Record<string, { label: string; emoji: string }>;
export const DEFAULT_SETTINGS: { useLive: boolean; keys: Record<string, string> };
export const TOOL_SPECS: { name: string; label: string; icon: string }[];

export function buildSchedule(schedule: CourseSchedule): {
  day: number;
  kind: 'act' | 'lunch' | 'cafe' | 'dinner' | 'hotel';
}[];

export class OutingAgent {
  constructor(settings: typeof DEFAULT_SETTINGS);
  welcome(): SampleAnswer;
  handle(text: string, handlers: {
    onStatus(step: { title: string; detail?: string; labels?: string[] }): number;
    onStatusDone(index: number, detail?: string): void;
    onTool(call: { name: string; args: unknown }): number;
    onToolDone(index: number, result: { items: unknown[]; liveNote?: string }): void;
    onNote(text: string): void;
    onAnswer(answer: SampleAnswer): void;
  }, extras: { schedule: CourseSchedule }): Promise<void>;
}

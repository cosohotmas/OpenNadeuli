import type { ChatMessage, CourseSchedule, CourseStep } from '../types';
import { BADGE_DEFS, DEFAULT_SETTINGS, OutingAgent, TOOL_SPECS, type SampleAnswer } from './outing-engine.js';

export function toChatMessage(answer: SampleAnswer, id: number): ChatMessage {
  return {
    id,
    type: 'agent',
    intro: answer.intro,
    labels: answer.labels,
    cards: answer.cards?.map((card) => ({
      ...card,
      badges: card.badges.map((badge) => card.badgeNote?.[badge] || BADGE_DEFS[badge]?.label || badge),
      details: card.details && Object.fromEntries(card.details),
    })),
    route: answer.route,
    summary: answer.summary,
    invite: answer.invite,
    followups: answer.followups,
  };
}

export class SampleCourse {
  private agent = new OutingAgent(DEFAULT_SETTINGS);

  welcome(id: number) {
    return toChatMessage(this.agent.welcome(), id);
  }

  async recommend(text: string, schedule: CourseSchedule, id: number, update: (message: ChatMessage) => void) {
    const steps: CourseStep[] = [];
    const publish = (answer?: SampleAnswer) => {
      const message: ChatMessage = answer ? toChatMessage(answer, id) : { id, type: 'agent' };
      update({ ...message, steps: steps.map((step) => ({ ...step })) });
    };
    const addStep = (step: CourseStep) => {
      steps.push(step);
      publish();
      return steps.length - 1;
    };
    const finish = (index: number, done: string) => {
      steps[index] = { ...steps[index], done };
      publish();
    };
    await this.agent.handle(text, {
      onStatus: addStep,
      onStatusDone: (index, detail) => finish(index, detail || '완료'),
      onTool: ({ name, args }) => addStep({
        title: TOOL_SPECS.find((tool) => tool.name === name)?.label ?? name,
        args,
      }),
      onToolDone: (index, result) => {
        if (result.liveNote) steps[index].notes = [result.liveNote];
        finish(index, `${result.items.length}건 선별 · 내장 샘플 데이터`);
      },
      onNote: (text) => {
        const step = steps[steps.length - 1];
        if (step) {
          step.notes = [...(step.notes || []), text];
          publish();
        }
      },
      onAnswer: publish,
    }, { schedule });
  }
}

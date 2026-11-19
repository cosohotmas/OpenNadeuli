import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, CourseResponse, CourseSchedule } from './types';
import { postCourse } from './lib/api';
import CourseMap from './components/CourseMap';
import TimeRange, { formatHour } from './components/TimeRange';

const quickQuestions = [
          '부모님 모시고 가기 좋은 부산 바다 데크길 코스',
          '비 오는 날 휠체어로 편한 실내 나들이',
          '평지 위주 맛집+산책 반나절 코스',
          '제주에서 휠체어로 가볼 만한 곳 알려줘',
];

const toolLabels: Record<string, string> = {
  searchOpenTouristSpots: '열린관광지',
  searchAccessibleTrails: '무장애 탐방로',
  searchStepFreeRestaurants: '상권정보 · 턱 없는 식당',
  searchStayHotels: '무장애 숙소',
};

const defaultSchedule: CourseSchedule = {
  tripType: 'day',
  d1: { s: 0, e: 24 },
  d2: { s: 0, e: 24 },
  meal: true,
  cafe: false,
  hotel: true,
};

const mapUrl = (name: string, address: string) =>
  `https://map.naver.com/p/search/${encodeURIComponent(`${name} ${address}`.trim())}`;

const App = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [activeDay, setActiveDay] = useState<'d1' | 'd2'>('d1');
  const [scheduleChanged, setScheduleChanged] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [inviteText, setInviteText] = useState('');
  const inviteDialogRef = useRef<HTMLDialogElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addWelcomeMessage = () => {
    setMessages([
      {
        id: 0,
        type: 'agent',
        intro:
          '안녕하세요! 저는 오픈나들이 AI 에이전트예요. 휠체어·보행 약자를 위한 무장애 관광 코스를 추천해 드립니다.\n\n이렇게 말씀해 보세요.\n· "주말에 휠체어 타고 산책할 만한 부산 근교 나들이 장소 찾아줘"\n· "부모님 모시고 가기 좋은 바다 데크길 코스"\n· "비 오는 날 실내로 편하게 가고 싶어요"',
        cards: [],
      },
    ]);
  };

  useEffect(() => {
    addWelcomeMessage();
  }, []);

  const sendMessage = async (text: string) => {
    const message = text.trim();
    if (loading || !message) return;

    const dates = schedule.tripType === 'overnight' ? [schedule.d1, schedule.d2] : [schedule.d1];
    if (dates.some(({ s, e }) => !Number.isInteger(s) || !Number.isInteger(e) || s < 0 || e > 24 || e <= s)) {
      setToast('일정 시작과 종료 시간을 확인해 주세요.');
      return;
    }

    const userMsg: ChatMessage = { id: Date.now(), type: 'user', text: message };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setToast(null);
    setLoading(true);

    try {
      const requestedSchedule = schedule.tripType === 'day' ? { ...schedule, d2: defaultSchedule.d2 } : schedule;
      const response: CourseResponse = await postCourse(message, scheduleChanged ? requestedSchedule : undefined);
      const agentMsg: ChatMessage = {
        id: Date.now() + 1,
        type: 'agent',
        intro: response.answer?.intro || '응답을 생성 중이에요.',
        cards: response.answer?.cards || [],
        labels: response.answer?.labels,
        summary: response.answer?.summary,
        lookups: response.events.flatMap((event) =>
          event.type === 'toolDone' && event.step && event.result
            ? [{ name: toolLabels[event.step] ?? event.step, count: event.result.items.length, source: event.result.source }]
            : [],
        ),
        invite: response.answer?.invite,
        route: response.answer?.route,
        followups: response.answer?.followups || [],
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      console.error(err);
      setToast('요청 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'agent',
          intro: '죄송해요. 처리 중 문제가 생겼어요. 다시 한 번 말해주시겠어요?',
          cards: [],
          followups: ['부모님 모시고 가기 좋은 부산 바다 데크길 코스'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(inputValue);
  };

  const resetChat = () => {
    setInputValue('');
    setToast(null);
    addWelcomeMessage();
  };

  const openInvite = (message: ChatMessage) => {
    const places = (message.route?.points.length ? message.route.points : message.cards)?.map((card) =>
      `- ${card.day ? `${card.day}일차 ${card.time} · ` : ''}${card.name}${card.address ? ` (${card.address})` : ''}`,
    ).join('\n');
    const checkpoints = message.summary?.length ? `\n\n안심 체크포인트\n${message.summary.map((line) => `- ${line}`).join('\n')}` : '';
    setInviteText(message.invite || `함께 나들이 가요!\n\n${places}${checkpoints}`);
    setToast(null);
    inviteDialogRef.current?.showModal();
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteText);
      inviteDialogRef.current?.close();
      setToast('초대장을 복사했어요.');
    } catch (error) {
      console.error('Could not copy the invitation', error);
      setToast('복사하지 못했어요. 초대장 텍스트를 직접 복사해 주세요.');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-logo" aria-hidden="true">🦽</div>
          <div className="brand-text">
            <h1>오픈나들이</h1>
            <p>휠체어·보행 약자를 위한 무장애 관광 AI 에이전트</p>
          </div>
        </div>
        <div className="header-actions">
          <span className="data-badge">내장 샘플 데이터</span>
          <button className="btn btn-ghost" type="button" onClick={resetChat} disabled={loading}>
            ↺ 대화 초기화
          </button>
        </div>
      </header>

      <main className="chat" aria-live="polite" aria-label="오픈나들이 AI 에이전트 대화">
        {messages.map((msg) => (
          <div key={msg.id} className={`msg ${msg.type}`}>
            {msg.type === 'agent' && <div className="avatar" aria-hidden="true">🌿</div>}
            <div className="bubble">
              {msg.text && <p>{msg.text}</p>}
              {!!msg.lookups?.length && (
                <details className="lookup-details">
                  <summary>요청 분석 · 데이터 조회 {msg.lookups.length}건</summary>
                  <ol>
                    {msg.lookups.map((lookup) => (
                      <li key={lookup.name}>
                        <strong>{lookup.name}</strong>
                        <span>{lookup.count}건 조회 · {lookup.source === 'live' ? '실시간 API' : '내장 샘플 데이터'}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              {msg.intro && <p>{msg.intro}</p>}
              {!!msg.labels?.length && (
                <ul className="intent-labels" aria-label="요청 조건">
                  {msg.labels.map((label) => <li key={label}>{label}</li>)}
                </ul>
              )}
              {msg.cards && msg.cards.length > 0 && (
                <div className="course-cards">
                  {msg.cards.map((card) => (
                    <article key={card.no} className="card">
                      <div className="card-header">
                        <span className="card-no">{card.no}</span>
                        <span className="card-phase">
                          {card.day && `${card.day}일차 ${card.time} · `}{card.phase}
                        </span>
                        <h3 className="card-name"><span aria-hidden="true">{card.emoji}</span> {card.name}</h3>
                      </div>
                      <div className="card-address">{card.address}</div>
                      {card.badges.length > 0 && (
                        <div className="card-badges" aria-label="무장애 편의시설">
                          {card.badges.map((b) => (
                            <span key={b} className="badge">
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                      {!card.badges.length && <p className="card-address">등록된 무장애 편의시설 정보가 없어요.</p>}
                      {card.details && !!Object.keys(card.details).length && (
                        <dl className="card-details">
                          {Object.entries(card.details).map(([label, value]) => (
                            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                          ))}
                        </dl>
                      )}
                      {card.tip && <div className="card-tip">💡 {card.tip}</div>}
                      <a
                        className="map-link"
                        href={mapUrl(card.name, card.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${card.name} 지도에서 보기 (새 탭)`}
                      >
                        🗺️ 지도에서 보기
                      </a>
                    </article>
                  ))}
                </div>
              )}
              {!!msg.route?.points.length && (
                <section className="route-summary" aria-label="이번 나들이 전체 동선 요약">
                  <div className="section-heading">
                    <h2>이번 나들이 전체 동선 요약</h2>
                    <button className="btn" type="button" onClick={() => openInvite(msg)}>초대장 보기</button>
                  </div>
                  <CourseMap points={msg.route.points} />
                  <ol className="route-stops">
                    {msg.route.points.map((point) => (
                      <li key={point.no}>
                        <span className="card-no" aria-hidden="true">{point.no}</span>
                        <div>
                          <strong>{point.name}</strong>
                          <p>{point.day && `${point.day}일차 ${point.time} · `}{point.phase} · {point.address}</p>
                          <div className="card-badges">{point.badges.map((badge) => <span key={badge} className="badge">{badge}</span>)}</div>
                          <a className="map-link" href={`https://map.kakao.com/link/search/${encodeURIComponent(`${point.name} ${point.address}`.trim())}`}
                            target="_blank" rel="noopener noreferrer" aria-label={`${point.name} 카카오맵에서 보기 (새 탭)`}>
                            카카오맵에서 보기
                          </a>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
              {!!msg.summary?.length && (
                <section className="checkpoints">
                  <h2>안심 체크포인트</h2>
                  <ul>{msg.summary.map((line) => <li key={line}>{line}</li>)}</ul>
                </section>
              )}
              {!!msg.cards?.length && (
                <button className="btn btn-primary invite-button" type="button" onClick={() => openInvite(msg)}>
                  💌 가족 단톡방용 초대장 만들기
                </button>
              )}
              {msg.followups && msg.followups.length > 0 && (
                <div className="followups">
                  {msg.followups.map((f) => (
                    <button
                      key={f}
                      className="chip"
                      type="button"
                      onClick={() => void sendMessage(f)}
                      disabled={loading}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      <div className="composer">
        <div className="quick-questions" aria-label="빠른 질문">
          {quickQuestions.map((question) => (
            <button key={question} className="chip" type="button" disabled={loading}
              onClick={() => void sendMessage(question)}>{question}</button>
          ))}
        </div>
        <details className="schedule">
          <summary>
            일정 및 시간대 상세 설정
            {scheduleChanged && <strong>
              {formatHour(schedule.d1.s)}–{formatHour(schedule.d1.e)}
              {schedule.tripType === 'overnight' && ` / ${formatHour(schedule.d2.s)}–${formatHour(schedule.d2.e)}`}
              {schedule.meal && ' · 식사'}
              {schedule.tripType === 'overnight' && schedule.hotel && ' · 숙소'}
            </strong>}
          </summary>
          <fieldset disabled={loading} aria-label="나들이 일정">
            <div className="schedule-actions" role="group" aria-label="여행 유형">
              {(['day', 'overnight'] as const).map((type) => (
                <button key={type} className="chip" type="button" aria-pressed={schedule.tripType === type}
                  onClick={() => {
                    setSchedule({ ...schedule, tripType: type });
                    setActiveDay('d1');
                    setScheduleChanged(true);
                  }}>{type === 'day' ? '당일 코스' : '1박 2일 코스'}</button>
              ))}
              <button className="btn schedule-reset" type="button" onClick={() => {
                setSchedule(defaultSchedule);
                setActiveDay('d1');
                setScheduleChanged(false);
              }}>초기화</button>
            </div>
            {schedule.tripType === 'overnight' && (
              <div className="schedule-actions schedule-days" role="group" aria-label="일차 선택">
                {(['d1', 'd2'] as const).map((day, index) => (
                  <button key={day} className="chip" type="button" aria-pressed={activeDay === day}
                    onClick={() => setActiveDay(day)}>{index + 1}일차</button>
                ))}
                <label className="hotel-option">
                  <input type="checkbox" checked={schedule.hotel} onChange={(event) => {
                    setSchedule({ ...schedule, hotel: event.target.checked });
                    setScheduleChanged(true);
                  }} />
                  무장애 숙소 추천
                </label>
              </div>
            )}
            <TimeRange
              day={activeDay === 'd1' ? 1 : 2}
              hours={schedule[activeDay]}
              meal={schedule.meal}
              hotel={activeDay === 'd1' && schedule.tripType === 'overnight' && schedule.hotel}
              onChange={(hours) => {
                setSchedule({ ...schedule, [activeDay]: hours });
                setScheduleChanged(true);
              }}
            />
            <label className="chip meal-option">
              <input type="checkbox" checked={schedule.meal} onChange={(event) => {
                setSchedule({ ...schedule, meal: event.target.checked });
                setScheduleChanged(true);
              }} />
              식사 포함
            </label>
          </fieldset>
        </details>
        <form onSubmit={handleSend} className="composer-form">
          <input
            id="chatInput"
            type="text"
            inputMode="text"
            placeholder="예) 주말에 휠체어 타고 산책할 만한 부산 근교 나들이 장소 찾아줘"
            aria-label="메시지 입력"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            전송 ✉️
          </button>
        </form>
      </div>
      <dialog ref={inviteDialogRef} className="invite-dialog" aria-labelledby="inviteTitle">
        <div className="section-heading">
          <h2 id="inviteTitle">나들이 초대장</h2>
          <button type="button" className="btn" onClick={() => inviteDialogRef.current?.close()}>닫기</button>
        </div>
        <section className="invite-preview" aria-label="초대장 미리보기">
          <h3>오픈나들이 · 가족 초대장</h3>
          <p>{inviteText}</p>
        </section>
        <textarea
          aria-label="초대장 텍스트 편집"
          rows={8}
          value={inviteText}
          onChange={(event) => setInviteText(event.target.value)}
        />
        <div>
          <button type="button" className="btn btn-primary" onClick={() => void copyInvite()}>
            초대장 텍스트 복사
          </button>

        </div>
        {toast && <p role="status">{toast}</p>}
      </dialog>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
   );
};

export default App;
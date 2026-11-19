import { mountRegionPicker } from './lib/region-picker.js';
import { resolveSearchRegion, revealDelay, scrollToResponse, searchProgress } from './lib/search-flow.js';
import './card-metadata.css';
import React, { useState, useEffect, useRef } from 'react';
import { kakaoLinks } from './lib/kakao-route.js';
import type { CourseCard, ChatMessage, CourseSchedule, CourseStep, KdpcfFacility, TransitStation } from './types';
import { SampleCourse } from './lib/sample-course';
import { postCourse } from './lib/api';
import { cardMetadata, familyInvite, sourceLines, stationInfo, stationUseNote } from './lib/course-client.js';
import CourseMap, { type CourseMapHandle } from './components/CourseMap';
import TimeRange, { formatHour } from './components/TimeRange';

const quickQuestions = [
  '부모님 모시고 가기 좋은 부산 바다 데크길 코스',
  '비 오는 날 휠체어로 편한 실내 나들이',
  '평지 위주 맛집+산책 반나절 코스',
  '제주에서 휠체어로 가볼 만한 곳 알려줘',
];

const defaultSchedule: CourseSchedule = {
  tripType: 'day',
  d1: { s: 0, e: 24 },
  d2: { s: 0, e: 24 },
  meal: true,
  cafe: true,
  hotel: true,
};

function CardMetadata({ card }: { card: CourseCard }) {
  const { chips, fields, contact } = cardMetadata(card);
  return <>
    {!!chips.length && <div className="course-meta-chips">
      {chips.map(({ tone, text }) => <span key={text} className={`course-meta-chip course-meta-${tone}`}>{text}</span>)}
    </div>}
    {contact && <a className="map-link" href={contact.href}>전화 {contact.text}</a>}
    {(!!fields.length || card.sourceUrl) && <details className="course-meta-details">
      <summary>출처·조회정보 보기</summary>
      <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {card.sourceUrl && <a href={card.sourceUrl} target="_blank" rel="noopener noreferrer">공식 원문 ↗</a>}
    </details>}
  </>;
}

function FacilityDetails({ facility }: { facility: KdpcfFacility }) {
  return <div className="course-station">
    <strong>{facility.name}</strong>
    {facility.distanceM != null && <span> · 방문 지점에서 직선 약 {facility.distanceM}m</span>}
    {facility.address && <div>{facility.address}</div>}
    <div className="course-meta-chips" aria-label="공공데이터에 기재된 기구표 항목">
      {facility.facilities.map((item) => <span className="course-meta-chip course-meta-facility" key={item}>{item}</span>)}
    </div>
    <a href={facility.sourceUrl} target="_blank" rel="noopener noreferrer">공공 API 조회 · {facility.provider}</a>
    <div>API 조회 <time dateTime={facility.fetchedAt || undefined}>{facility.fetchedAt}</time></div>
    <div>공공데이터 기구표에 기재된 항목입니다. 이용 가능 여부는 방문 전 확인해 주세요.</div>
  </div>;
}

function StationDetails({ station }: { station: TransitStation }) {
  const info = stationInfo(station);
  return <div className="course-station">
    <strong>🚇 {info.title}</strong>
    {station.distanceM != null && <span> · 직선 약 {station.distanceM}m</span>}
    <div className="course-meta-chips" aria-label="역사 설비 설치 현황">
      {info.facilities.map((item) => <span className="course-meta-chip course-meta-facility" key={item}>{item}</span>)}
    </div>
    <a href={station.sourceUrl} target="_blank" rel="noopener noreferrer">{info.source}</a>
    <div>API 조회 <time dateTime={station.fetchedAt}>{station.fetchedAt}</time></div>
    <div><a href={station.coordinateSourceUrl} target="_blank" rel="noopener noreferrer">역 위치 원본</a> · 기준일 {station.coordinateReferenceDate}</div>
    <div>{stationUseNote}</div>
  </div>;
}

function ExternalMapLinks({ place }: { place: Pick<CourseCard, 'name' | 'address' | 'lat' | 'lng' | 'kind'> }) {
  const links = kakaoLinks(place);
  return <>
    <a className="map-link" href={links.map} target="_blank" rel="noopener noreferrer">{links.mapLabel}</a>
    {links.addressSearch && <a className="map-link" href={links.addressSearch} target="_blank" rel="noopener noreferrer">주소로 검색 ↗</a>}
    {links.directions && <a className="map-link" href={links.directions} target="_blank" rel="noopener noreferrer">{links.directionsLabel}</a>}
  </>;
}

const App = () => {
  const [engine, setEngine] = useState(() => new SampleCourse());
  const [messages, setMessages] = useState<ChatMessage[]>(() => [engine.welcome(0)]);
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [activeDay, setActiveDay] = useState<'d1' | 'd2'>('d1');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const pickerHost = useRef<HTMLDivElement>(null);
  const picker = useRef<ReturnType<typeof mountRegionPicker> | null>(null);
  const [locationRetry, setLocationRetry] = useState<{ text: string; region: string } | null>(null);
  useEffect(() => {
    if (pickerHost.current) picker.current = mountRegionPicker(pickerHost.current, () => setLocationRetry(null));
  }, []);
  useEffect(() => { picker.current?.setDisabled(loading); }, [loading]);
  const [pending, setPending] = useState<{ id: number; stage: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [invitePlaces, setInvitePlaces] = useState<CourseCard[]>([]);
  const [inviteText, setInviteText] = useState('');
  const scheduleRef = useRef<HTMLDetailsElement>(null);
  const requestId = useRef(0);
  const busy = useRef(false);
  const inviteDialogRef = useRef<HTMLDialogElement>(null);
  const resultMaps = useRef(new Map<number, CourseMapHandle>());
  const responseStart = useRef<HTMLDivElement>(null);
  const pendingId = pending?.id;
  useEffect(() => {
    if (pendingId != null) scrollToResponse(responseStart.current);
  }, [pendingId]);

  const lastAnswer = messages[messages.length - 1];
  useEffect(() => {
    if (lastAnswer?.type === "agent" && lastAnswer.id !== 0) {
      scrollToResponse(document.getElementById(`response-${lastAnswer.id}`));
    }
  }, [lastAnswer]);

  const sendMessage = async (text: string) => {
    const message = text.trim();
    if (busy.current || !message) return;

    const dates = schedule.tripType === 'overnight' ? [schedule.d1, schedule.d2] : [schedule.d1];
    if (dates.some(({ s, e }) => !Number.isInteger(s) || !Number.isInteger(e) || s < 0 || e > 24 || e <= s)) {
      setToast('일정 시작과 종료 시간을 확인해 주세요.');
      return;
    }

    busy.current = true;
    if (scheduleRef.current) scheduleRef.current.open = false;
    const userMsg: ChatMessage = { id: ++requestId.current, type: 'user', text: message };
    const answerId = ++requestId.current;
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setToast(null);
    setLoading(true);
    setLocationRetry(null);
    setPending({ id: answerId, stage: "요청 분석 중" });

    try {
      const report = (stage: string) => setPending({ id: answerId, stage });
      const location = await resolveSearchRegion(message, picker.current?.value || '', report, (region) => {
        if (requestId.current === answerId && !picker.current?.value) setLocationRetry({ text: message, region });
      });
      report(searchProgress(location));
      const response = await postCourse(message, schedule, location);
      const answer = response.answer;
      if (!answer) throw new Error('Missing course answer');
      const names: Record<string, string> = {
        searchOpenTouristSpots: '한국관광공사 관광지',
        searchNearbyRestaurants: '인근 식당·카페',
        searchStayHotels: '한국관광공사 숙박',
        searchAccessibleTrails: '무장애 탐방로',
        searchBusanStationFacilities: '부산 도시철도 역사 편의시설',
        searchKdpcfFacilities: '한국사회보장정보원 장애인편의시설',
      };
      const statuses = { success: '조회 완료', empty: '조건에 맞는 결과 없음', unavailable: '조회 실패', skipped: '조회 보류' };
      const steps: CourseStep[] = response.events.flatMap((event): CourseStep[] => {
        if (event.type === 'status') return [{ title: event.step ?? '요청 분석', detail: event.detail, done: '완료' }];
        if (event.type !== 'toolDone' || !event.result) return [];
        const result = event.result;
        return [{
          title: names[event.step ?? ''] || event.step || '데이터 조회',
          done: `${statuses[result.status]} · ${result.count}건`,
          source: result.fetchedAt || result.sourceType === 'fallback_mock' ? result : undefined,
          notes: result.note ? [result.note] : undefined,
        }];
      });
      setMessages((previous) => [...previous, { ...answer, id: answerId, type: 'agent', steps }]);
    } catch (err) {
      console.error(err);
      setToast('공공데이터를 조회하지 못했어요. 다시 시도하거나 백업을 열어 주세요.');
      setMessages((prev) => [
        ...prev.filter((row) => row.id !== answerId),
        {
          id: answerId,
          type: 'agent',
          intro: '공공데이터 연결을 확인해 주세요. 백업에서는 시연용 샘플을 실행할 수 있어요.',
          cards: [],
          followups: ['부모님 모시고 가기 좋은 부산 바다 데크길 코스'],
        },
      ]);
    } finally {
      busy.current = false;
      setLoading(false);
      setPending(null);
    }
  };

  const handleSend = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(inputValue);
  };

  const resetChat = () => {
    requestId.current++;
    setLocationRetry(null);
    setInputValue('');
    setToast(null);
    const next = new SampleCourse();
    setEngine(next);
    setMessages([next.welcome(0)]);
  };

  const openInvite = (message: ChatMessage) => {
    const cards = message.cards || [];
    setInvitePlaces(cards);
    setInviteText(familyInvite(cards));
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
          <span className="data-badge">공공데이터 코스</span>
          <button className="btn btn-ghost" type="button" onClick={resetChat} disabled={loading}>
            ↺ 대화 초기화
          </button>
        </div>
      </header>

      <main className="chat" aria-live="polite" aria-label="오픈나들이 AI 에이전트 대화">
        {messages.map((msg) => (
          <div id={`response-${msg.id}`} key={msg.id} className={`msg ${msg.type} search-response`}>
            {msg.type === 'agent' && <div className="avatar" aria-hidden="true">🌿</div>}
            <div className="bubble">
              {msg.text && <p>{msg.text}</p>}
              {!!msg.steps?.length && (
                <ol className="agent-timeline" aria-label="코스 조합 과정">
                  {msg.steps.map((step, index) => (
                    <li key={index} className="search-reveal" style={{ "--search-delay": `${revealDelay(index)}ms` } as React.CSSProperties}>
                      <span className="step-mark" aria-label={step.done ? '완료' : '진행 중'}>{step.done ? '✓' : '…'}</span>
                      <div>
                        <strong>{step.title}</strong>
                        {step.detail && <p>{step.detail}</p>}
                        {step.args !== undefined && <details><summary>조회 조건</summary><pre>{JSON.stringify(step.args, null, 2)}</pre></details>}
                        {step.done && <p>{step.done}</p>}
                        {step.source && <p className="source-details">{sourceLines(step.source).join(' · ')}</p>}
                        {step.notes?.map((note) => <p className="step-note" key={note}>{note}</p>)}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {msg.intro && <p className="search-reveal" style={{ "--search-delay": `${revealDelay(msg.steps?.length || 0)}ms` } as React.CSSProperties}>{msg.intro}</p>}
              {!!msg.labels?.length && (
                <ul className="intent-labels" aria-label="요청 조건">
                  {msg.labels.map((label) => <li key={label}>{label}</li>)}
                </ul>
              )}
              {!!msg.route?.points.length && (
                <section id={`course-route-${msg.id}`} className="route-summary search-reveal" style={{ "--search-delay": `${revealDelay(msg.steps?.length || 0) + 65}ms` } as React.CSSProperties} aria-label="이번 나들이 전체 동선 요약">
                  <div className="section-heading">
                    <h2>📋 이번 나들이 전체 동선 요약</h2>
                    <button className="btn" type="button" onClick={() => openInvite(msg)}>초대장 보기</button>
                  </div>
                  <CourseMap points={msg.route.points} ref={(map) => {
                    if (map) resultMaps.current.set(msg.id, map);
                    else resultMaps.current.delete(msg.id);
                  }} />
                </section>
              )}
              {msg.cards && msg.cards.length > 0 && (
                <div className="course-cards search-reveal" style={{ "--search-delay": `${revealDelay(msg.steps?.length || 0) + 130}ms` } as React.CSSProperties}>
                  {msg.cards.map((card) => (
                    <article key={card.no} className="card">
                      <div className="card-header">
                        <span className="card-no">{card.no}</span>
                        <span className="card-phase">
                          {card.time ? `${card.day ? `${card.day}일차 ` : ''}${card.time} · ` : ''}{card.phase}
                        </span>
                        <h3 className="card-name"><span aria-hidden="true">{card.emoji}</span> {card.name}</h3>
                      </div>
                      {card.kind && <div className="card-kind">{card.kind}</div>}
                      <div className="card-address">{card.address}</div>
                      <CardMetadata card={card} />
                      {card.badges.length > 0 && (
                        <div className="card-badges" aria-label="무장애 편의시설">
                          {card.badges.map((b) => (
                            <span key={b} className="badge">
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                      {card.tip && <div className="card-tip">💡 {card.tip}</div>}
                      {card.kdpcfFacility && <section aria-label="숙소 편의시설 보조 원본"><h4>숙소 편의시설 추가 출처</h4><FacilityDetails facility={card.kdpcfFacility} /></section>}
                      {card.nearbyStation && <section aria-label="인근 역사 이동 참고"><h4>인근 역사 이동 참고</h4><StationDetails station={card.nearbyStation} /></section>}
                      {kakaoLinks(card).notice && <p className="course-map-note">{kakaoLinks(card).notice}</p>}
                      <div className="course-map-links">
                        {!!msg.route?.points.length && <button className="btn" type="button" onClick={() => {
                          if (!resultMaps.current.get(msg.id)?.focusVisit(card.no)) {
                            setToast('내장 지도에서 이 장소의 위치를 표시할 수 없어요.');
                          }
                        }}>내장 지도 위치</button>}
                        <ExternalMapLinks place={card} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {(!!msg.summary?.length || !!msg.transitStations?.length || !!msg.nearbyFacilities?.length) && (
                <section className="checkpoints search-reveal" style={{ "--search-delay": `${revealDelay(msg.steps?.length || 0) + 195}ms` } as React.CSSProperties}>
                  <h2>안심 체크포인트</h2>
                  {!!msg.summary?.length && <ul>{msg.summary.map((line) => <li key={line}>{line}</li>)}</ul>}
                  {!!msg.transitStations?.length && <div>
                    <h3>인근 역사 이동 참고</h3>
                    {msg.transitStations.map((station) => <StationDetails station={station} key={station.code} />)}
                  </div>}
                  {!!msg.nearbyFacilities?.length && <div>
                    <h3>동선 인근 편의시설 참고</h3>
                    {msg.nearbyFacilities.map((facility) => <FacilityDetails facility={facility} key={facility.id} />)}
                  </div>}
                </section>
              )}
              {!!msg.visitNotes?.length && (
                <section className="checkpoints search-reveal" style={{ "--search-delay": `${revealDelay(msg.steps?.length || 0) + 195}ms` } as React.CSSProperties}>
                  <h2>방문 전 확인 메모</h2>
                  <ul>{msg.visitNotes.map((note) => <li key={note}>{note}</li>)}</ul>
                </section>
              )}
              {!!msg.cards?.length && (
                <button className="btn btn-primary invite-button" type="button" onClick={() => openInvite(msg)}>
                  💌 가족 단톡방용 초대장 만들기
                </button>
              )}
              {msg.id !== 0 && msg.followups && msg.followups.length > 0 && (
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
        {pending && <div ref={responseStart} className="msg agent search-response">
          <div className="avatar" aria-hidden="true">🌿</div>
          <div className="bubble search-progress" role="status">
            <span className="search-spinner" aria-hidden="true" />{pending.stage}
          </div>
        </div>}
      </main>

      <div className="composer">
        {locationRetry && <button type="button" className="btn location-retry" disabled={loading}
          onClick={() => void sendMessage(locationRetry.text)}>현재 위치 확인 · {locationRetry.region}로 다시 검색</button>}
        <div className="quick-questions" aria-label="빠른 질문">
          {quickQuestions.map((question) => (
            <button key={question} className="chip" type="button" disabled={loading}
              onClick={() => void sendMessage(question)}>{question}</button>
          ))}
        </div>
        <details className="schedule" ref={scheduleRef}>
          <summary>
            일정·시간대 및 지역 설정
            <strong>
              {formatHour(schedule.d1.s)}–{formatHour(schedule.d1.e)}
              {schedule.tripType === 'overnight' && ` / ${formatHour(schedule.d2.s)}–${formatHour(schedule.d2.e)}`}
              {schedule.meal && ' · 식사'}
              {schedule.cafe && ' · 카페'}
              {schedule.tripType === 'overnight' && schedule.hotel && ' · 숙소'}
            </strong>
          </summary>
          <div className="search-region">
            <span>검색 지역</span><div ref={pickerHost} />
          </div>
          <fieldset disabled={loading} aria-label="나들이 일정">
            <div className="schedule-actions" role="group" aria-label="여행 유형">
              {(['day', 'overnight'] as const).map((type) => (
                <button key={type} className="chip" type="button" aria-pressed={schedule.tripType === type}
                  onClick={() => {
                    setSchedule({ ...schedule, tripType: type });
                    setActiveDay('d1');
                  }}>{type === 'day' ? '당일 코스' : '1박 2일 코스'}</button>
              ))}
              <button className="btn schedule-reset" type="button" onClick={() => {
                setSchedule(defaultSchedule);
                setActiveDay('d1');
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
                  }} />
                  무장애 숙소 추천
                </label>
              </div>
            )}
            <TimeRange
              day={activeDay === 'd1' ? 1 : 2}
              hours={schedule[activeDay]}
              schedule={schedule}
              onChange={(hours) => {
                setSchedule({ ...schedule, [activeDay]: hours });
              }}
            />
            <label className="chip meal-option">
              <input type="checkbox" checked={schedule.meal} onChange={(event) => {
                setSchedule({ ...schedule, meal: event.target.checked });
              }} />
              식사 포함
            </label>
            <label className="chip meal-option">
              <input type="checkbox" checked={schedule.cafe}
                onChange={(event) => setSchedule({ ...schedule, cafe: event.target.checked })} />
              카페 휴식 포함
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
        <textarea
          aria-label="초대장 텍스트 편집"
          rows={8}
          value={inviteText}
          onChange={(event) => setInviteText(event.target.value)}
        />
        <div className="invite-links" aria-label="장소별 빠른 링크">
          {invitePlaces.map((card) => <div className="course-map-links" key={card.no}>
            <strong>{card.name}</strong><ExternalMapLinks place={card} />
          </div>)}
        </div>
        <div>
          <button type="button" className="btn btn-primary" onClick={() => void copyInvite()}>
            초대장 전체 복사
          </button>

        </div>
        {toast && <p role="status">{toast}</p>}
      </dialog>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
   );
};

export default App;
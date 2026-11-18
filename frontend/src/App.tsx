import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, CourseResponse } from './types';
import { postCourse } from './lib/api';

const App = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
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
        followups: [
          '부모님 모시고 가기 좋은 부산 바다 데크길 코스',
          '비 오는 날 휠체어로 편한 실내 나들이',
          '평지 위주 맛집+산책 반나절 코스',
          '제주에서 휠체어로 가볼 만한 곳 알려줘',
        ],
      },
    ]);
  };

  useEffect(() => {
    addWelcomeMessage();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = { id: Date.now(), type: 'user', text: inputValue };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const response: CourseResponse = await postCourse(inputValue);
      const agentMsg: ChatMessage = {
        id: Date.now() + 1,
        type: 'agent',
        intro: response.answer?.intro || '응답을 생성 중이에요.',
        cards: response.answer?.cards || [],
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

  const handleFollowup = (text: string) => {
    setInputValue(text);
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
          <button className="btn btn-ghost" type="button">⚙️ API 설정</button>
          <button className="btn btn-ghost" type="button">↺ 대화 초기화</button>
        </div>
      </header>

      <main className="chat" aria-live="polite" aria-label="오픈나들이 AI 에이전트 대화">
        {messages.map((msg) => (
          <div key={msg.id} className={`msg ${msg.type}`}>
            {msg.type === 'agent' && <div className="avatar" aria-hidden="true">🌿</div>}
            <div className="bubble">
              {msg.intro && <p>{msg.intro}</p>}
              {msg.cards && msg.cards.length > 0 && (
                <div className="course-cards">
                  {msg.cards.map((card) => (
                    <div key={card.no} className="card">
                      <div className="card-header">
                        <span className="card-no">{card.no}</span>
                        <span className="card-phase">{card.phase}</span>
                        <span className="card-name">{card.emoji} {card.name}</span>
                      </div>
                      <div className="card-address">{card.address}</div>
                      {card.badges.length > 0 && (
                        <div className="card-badges">
                          {card.badges.map((b) => (
                            <span key={b} className="badge">
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="card-tip">💡 {card.tip}</div>
                    </div>
                  ))}
                </div>
              )}
              {msg.followups && msg.followups.length > 0 && (
                <div className="followups">
                  {msg.followups.map((f) => (
                    <button
                      key={f}
                      className="chip"
                      onClick={() => handleFollowup(f)}
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
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
   );
};

export default App;
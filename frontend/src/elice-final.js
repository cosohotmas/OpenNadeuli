import './card-metadata.css';
import { cardMetadata, familyInvite, CourseApiError, requestCourse, sourceLabel, sourceLines, stationInfo, stationUseNote } from "./lib/course-client.js";
import { enqueueGeocode, ensureKakao, geocodePoint, kakaoLinks } from "./lib/kakao-route.js";
import { BADGE_DEFS, DEFAULT_SETTINGS, OutingAgent, TOOL_SPECS, buildSchedule } from "./lib/outing-engine.js";

/* ====== js/ui.js ====== */
/**
 * ui.js — 화면·인터랙션 계층
 * 채팅 메시지, 에이전트 상태 타임라인, 도구 호출 칩, 코스 카드,
 * 초대장/설정 모달, 토스트를 렌더링한다.
 */



const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

let uiAgent = null;
let busy = false;
let refs = {};

function init({ agentInstance }) {
  uiAgent = agentInstance;
  refs = {
    chat: $("#chat"),
    form: $("#chatForm"),
    input: $("#chatInput"),
    sendBtn: $("#sendBtn"),
    quick: $("#quickChips"),
    badge: $("#dataSourceBadge"),
    resetBtn: $("#resetBtn"),
    inviteModal: $("#inviteModal"),
    toast: $("#toast"),
  };

  /* 이벤트 */
  refs.form.addEventListener("submit", (e) => { e.preventDefault(); const t = refs.input.value.trim(); if (t) submit(t); });
  refs.quick.addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (b && !busy) submit(b.dataset.q);
  });
  refs.resetBtn.addEventListener("click", resetChat);

  /* 모달 닫기 */
  document.querySelectorAll("[data-close]").forEach((b) =>
    b.addEventListener("click", () => closeModal(b.dataset.close)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeModal("inviteModal"); setExpanded(false); }
  });
  document.querySelectorAll(".modal-backdrop").forEach((m) =>
    m.addEventListener("mousedown", (e) => { if (e.target === m) closeModal(m.id); }));

  /* 초대장 복사 */
  $("#copyInviteBtn").addEventListener("click", copyInvite);

  /* 초기 상태 */
  updateBadge();
  renderQuickChips();
  initScheduleBar();
  showWelcome();


}

/* ============================ 전송 흐름 ============================ */

async function submit(text) {
  if (busy) return;
  busy = true;
  /* 전송 시 시간대 패널 자동 접기 — 답변이 화면을 가리지 않도록 */
  setExpanded(false);
  refs.input.value = "";
  setBusy(true);

  addUserMessage(text);
  const { bubble, handlers } = newAgentBubble();
  const schedule = {
    tripType: schedState.tripType,
    d1: { ...schedState.d1 },
    d2: { ...schedState.d2 },
    meal: schedState.meal,
    cafe: schedState.cafe,
    hotel: schedState.hotel,
  };
  try {
    let response;
    try {
      response = await requestCourse(text, schedule);
    } catch (error) {
      if (!(error instanceof CourseApiError) || !error.allowFallback) throw error;
      refs.badge.textContent = "시연용 내장 샘플";
      handlers.onNote("서버에 연결하지 못해 시연용 내장 샘플을 표시해요. 실제 접근성 확인 결과는 아니에요.");
      await uiAgent.handle(text, {
        ...handlers,
        onAnswer(answer) {
          handlers.onAnswer({
            ...answer,
            intro: `시연용 내장 샘플 · ${answer.intro}`,
            cards: answer.cards?.map((card) => ({ ...card, sourceType: "fallback_mock" })),
          });
        },
      }, { schedule });
    }
    if (response) {
      refs.badge.textContent = sourceLabel(response.sourceType) || "공공데이터 코스";
      const names = {
        searchNearbyRestaurants: "인근 식당·카페",
        searchOpenTouristSpots: "한국관광공사 관광지",
        searchStayHotels: "한국관광공사 숙박",
        searchAccessibleTrails: "무장애 탐방로",
        searchBusanStationFacilities: "부산 도시철도 역사 편의시설",
      };
      const status = { success: "조회 완료", empty: "조건에 맞는 결과 없음", unavailable: "조회 실패", skipped: "조회 보류" };
      for (const event of response.events) {
        if (event.type === "status") {
          handlers.onStatusDone(handlers.onStatus({ icon: "📋", title: event.step }), event.detail);
        } else if (event.type === "toolDone") {
          const result = event.result;
          const step = handlers.onStatus({ icon: "📋", title: names[event.step] || event.step });
          const source = result.fetchedAt || result.sourceType === "fallback_mock" ? sourceLines(result).join(" · ") : "";
          handlers.onStatusDone(step, [`${status[result.status]} · ${result.count}건`, source].filter(Boolean).join(" · "));
          if (result.note) handlers.onNote(result.note);
        }
      }
      handlers.onAnswer(response.answer);
    }
  } catch (err) {
    handlers.onAnswer({
      type: "greeting",
      intro: "죄송해요, 처리 중 문제가 생겼어요. 다시 한 번 말씀해 주시겠어요?",
      cards: [], summary: [],
      followups: ["부모님 모시고 가기 좋은 부산 바다 데크길 코스", "비 오는 날 휠체어로 편한 실내 나들이"],
    });
    console.error(err);
  }
  busy = false;
  setBusy(false);
}

function setBusy(v) {
  refs.sendBtn.disabled = v;
  refs.input.disabled = v;
  document.querySelectorAll(".chip").forEach((c) => (c.disabled = v));
}

function addUserMessage(text) {
  const m = el("div", "msg user");
  m.innerHTML = `<div class="bubble"><p>${esc(text)}</p></div>`;
  refs.chat.appendChild(m);
  autoscroll();
}

function newAgentBubble() {
  const m = el("div", "msg agent");
  m.innerHTML = `
    <div class="avatar" aria-hidden="true">🌿</div>
    <div class="bubble">
      <div class="timeline"></div>
      <div class="content"></div>
      <div class="chips"></div>
    </div>`;
  refs.chat.appendChild(m);
  autoscroll();

  const timeline = m.querySelector(".timeline");
  const content = m.querySelector(".content");
  const chips = m.querySelector(".chips");

  const handlers = {
    /* 진행 상태 스텝 생성 */
    onStatus({ icon, title, labels, detail }) {
      const s = newStep(timeline, icon, title, detail);
      if (labels?.length) {
        const row = el("div", "intent-chips");
        labels.forEach((l) => row.appendChild(el("span", "intent-chip", l)));
        s.querySelector(".step-body").appendChild(row);
      }
      return s;
    },
    onStatusDone(s, detail) {
      doneStep(s);
      if (detail) s.querySelector(".step-body").appendChild(el("div", "step-detail", detail));
      autoscroll();
    },
    /* 도구(Function) 호출 시각화 */
    onTool({ name, args }) {
      const spec = TOOL_SPECS.find((t) => t.name === name);
      const s = newStep(timeline, spec.icon, `${spec.label} 조회 중…`);
      const chip = el("details", "tool-chip");
      chip.innerHTML = `
        <summary><code>${esc(name)}(${esc(JSON.stringify(args))})</code></summary>
        <pre>${esc(JSON.stringify(args, null, 2))}</pre>`;
      s.querySelector(".step-body").appendChild(chip);
      return s;
    },
    onToolDone(s, result) {
      doneStep(s);
      const src = result.source === "live" ? "실시간 API (apis.data.go.kr)"
        : result.source === "snapshot" ? "실측 데이터 스냅샷 (실제 API 응답 캡처)"
        : "내장 샘플 데이터(시연용 가상)";
      s.querySelector(".step-body").appendChild(el("div", "step-detail",
        `→ 응답 ${result.items.length}건 선별 · ${src}`));
      if (result.liveNote) s.querySelector(".step-body").appendChild(el("div", "step-note", `ⓘ ${result.liveNote}`));
      autoscroll();
    },
    /* 검증 근거 메모 (마지막 스텝 하단) */
    onNote(text) {
      const last = timeline.lastElementChild;
      const body = last?.querySelector(".step-body");
      const note = el("div", "step-note", `· ${text}`);
      if (body) body.appendChild(note); else timeline.appendChild(note);
      autoscroll();
    },
    onAnswer(answer) {
      renderAnswer(content, chips, answer);
      const map = content.querySelector(".route-section");
      if (map) requestAnimationFrame(() => map.scrollIntoView({ block: "start" }));
      else autoscroll();
    },
  };
  return { bubble: m, handlers };
}

function newStep(timeline, icon, title, detail) {
  const s = el("div", "step active");
  s.innerHTML = `
    <div class="dot"><span class="spinner" aria-hidden="true"></span></div>
    <div class="step-body">
      <div class="step-title"><span class="step-icon">${icon}</span> ${esc(title)}</div>
      ${detail ? `<div class="step-detail">${esc(detail)}</div>` : ""}
    </div>`;
  timeline.appendChild(s);
  autoscroll();
  return s;
}

function doneStep(s) {
  s.classList.remove("active");
  s.classList.add("done");
  s.querySelector(".dot").textContent = "✓";
}

function autoscroll() {
  requestAnimationFrame(() => { refs.chat.scrollTop = refs.chat.scrollHeight; });
}

/* ============================ 응답 렌더 ============================ */

function renderAnswer(content, chips, answer) {
  const intro = el("div", "intro");
  intro.innerHTML = esc(answer.intro).replace(/\n/g, "<br>");
  content.appendChild(intro);

  if (answer.labels?.length) {
    const row = el("div", "intent-chips answer-labels");
    answer.labels.forEach((l) => row.appendChild(el("span", "intent-chip", l)));
    content.appendChild(row);
  }

  const focusVisit = answer.route?.points?.length ? renderRouteSection(content, answer) : null;

  if (answer.cards?.length) {
    const rail = el("div", "course");
    answer.cards.forEach((c) => rail.appendChild(renderCard(c, focusVisit)));
    content.appendChild(rail);
  }

  if (answer.summary?.length || answer.transitStations?.length) {
    const sum = el("section", "summary");
    sum.innerHTML = `<strong>✅ 안심 체크포인트</strong>
      ${answer.summary?.length ? `<ul>${answer.summary.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>` : ""}
      ${answer.transitStations?.length ? `<h3>인근 역사 이동 참고</h3>${answer.transitStations.map(stationHtml).join("")}` : ""}`;
    content.appendChild(sum);
  }
  if (answer.visitNotes?.length) {
    const notes = el("section", "summary");
    notes.innerHTML = `<strong>방문 전 확인 메모</strong><ul>${answer.visitNotes.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>`;
    content.appendChild(notes);
  }

  if (answer.invite) {
    const row = el("div", "invite-row");
    const btn = el("button", "btn btn-primary btn-lg", "💌 가족 단톡방용 초대장 만들기");
    btn.addEventListener("click", () => openInvite(answer.cards));
    row.appendChild(btn);
    content.appendChild(row);
  }

  renderChips(chips, answer.followups || []);
}

function stationHtml(station) {
  const info = stationInfo(station);
  return `<div class="course-station">
    <strong>🚇 ${esc(info.title)}</strong>
    ${station.distanceM != null ? ` · 직선 약 ${esc(station.distanceM)}m` : ""}
    <div class="course-meta-chips" aria-label="역사 설비 설치 현황">
      ${info.facilities.map((item) => `<span class="course-meta-chip course-meta-facility">${esc(item)}</span>`).join("")}
    </div>
    <a href="${esc(station.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(info.source)}</a>
    <div>API 조회 <time datetime="${esc(station.fetchedAt)}">${esc(station.fetchedAt)}</time></div>
    <div><a href="${esc(station.coordinateSourceUrl)}" target="_blank" rel="noopener noreferrer">역 위치 원본</a> · 기준일 ${esc(station.coordinateReferenceDate)}</div>
    <div>${stationUseNote}</div>
  </div>`;
}

function renderCard(c, focusVisit) {
  const card = el("article", "card");
  const phase = c.time ? `${c.day ? `${c.day}일차 ` : ""}${c.time} · ${c.phase}` : c.phase;
  const { chips, fields } = cardMetadata(c);
  card.innerHTML = `
    <div class="card-rail">
      <div class="card-order"><span class="no">${c.no}</span></div>
      <div class="phase">${esc(phase)}</div>
    </div>
    <div class="card-main">
      <div class="card-head">
        <span class="card-emoji" aria-hidden="true">${c.emoji}</span>
        <div class="card-names">
          <h3 class="card-title">${esc(c.name)}</h3>
          <span class="card-type">${esc(c.kindIcon || "")} ${esc(c.kind || "")}</span>
        </div>
      </div>
      <div class="card-addr">📍 ${esc(c.address)}</div>
      <div class="badges">${(c.badges || []).map((k) => badgeHtml(k, c.badgeNote?.[k]) || `<span class="badge">${esc(k)}</span>`).join("")}</div>
      ${chips.length ? `<div class="course-meta-chips">${chips.map(({ tone, text }) => `<span class="course-meta-chip course-meta-${tone}">${esc(text)}</span>`).join("")}</div>` : ""}
      ${fields.length || c.sourceUrl ? `<details class="course-meta-details">
        <summary>출처·조회정보 보기</summary>
        <dl>${fields.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>
        ${c.sourceUrl ? `<a href="${esc(c.sourceUrl)}" target="_blank" rel="noopener noreferrer">공식 원문 ↗</a>` : ""}
      </details>` : ""}
      ${c.tip ? `<div class="card-tip">💡 ${esc(c.tip)}</div>` : ""}
      ${c.nearbyStation ? `<section aria-label="인근 역사 이동 참고"><h4>인근 역사 이동 참고</h4>${stationHtml(c.nearbyStation)}</section>` : ""}
      <div class="card-links">${focusVisit ? '<button type="button" class="btn">내장 지도 위치</button>' : ''} ${mapLinksHtml(c)}</div>
    </div>`;
  card.querySelector(".card-links button")?.addEventListener("click", () => {
    if (!focusVisit(c.no)) toast("내장 지도에서 이 장소의 위치를 표시할 수 없어요.");
  });
  return card;
}

function badgeHtml(key, note) {
  const d = BADGE_DEFS[key];
  if (!d) return "";
  return `<span class="badge b-${key}" title="${esc(note || d.label)}">${d.emoji} ${esc(note || d.label)}</span>`;
}

function mapLinksHtml(place) {
  const { map, directions } = kakaoLinks(place);
  const link = (url, label) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  return link(map, "카카오맵에서 열기 ↗") + (directions ? " " + link(directions, "길찾기 ↗") : "");
}

/* ==================== 전체 동선 요약 + 인라인 지도 (카카오맵) ==================== */

/** 전체 동선 지도와 상세 카드의 방문 번호를 연결한다. */
function renderRouteSection(content, answer) {
  const pts = answer.route.points;
  const sec = el("section", "route-section");

  const head = el("div", "route-head");
  head.innerHTML = `<h2>📋 이번 나들이 전체 동선 요약</h2>`;
  const inviteBtn = el("button", "btn btn-sm", "💌 초대장 보기");
  inviteBtn.addEventListener("click", () => openInvite(answer.cards));
  head.appendChild(inviteBtn);
  sec.appendChild(head);

  /* 지도 영역 */
  const mapWrap = el("div", "route-map-wrap");
  const mapDiv = el("div", "route-map");
  mapDiv.id = `route-map-${Math.random().toString(36).slice(2)}`;
  mapDiv.setAttribute("aria-label", "방문 순서 지도");
  const mapHint = el("div", "route-map-hint", "🗺️ 장소 좌표를 확인하는 중…");
  mapHint.setAttribute("role", "status");
  mapWrap.appendChild(mapDiv);
  mapWrap.appendChild(mapHint);
  sec.appendChild(mapWrap);

  content.appendChild(sec);

  let mapReady = false;
  let initializing = false;
  const placed = new Array(pts.length).fill(null);   /* 방문 순서 인덱스 → 좌표 */
  const visitActions = new Map();

  const setHint = (msg, withRetry) => {
    mapHint.style.display = "";
    mapHint.textContent = "";
    mapHint.appendChild(document.createTextNode(msg));
    if (withRetry) {
      mapHint.appendChild(document.createTextNode(" "));
      const btn = el("button", "route-retry", "🔄 다시 시도");
      btn.type = "button";
      btn.addEventListener("click", () => initMap(true));
      mapHint.appendChild(btn);
    }
  };
  const failMap = (msg, withRetry = true) => {
    mapWrap.classList.add("route-map-off");
    setHint(msg, withRetry);
  };

  function initMap(retry = false) {
    if (mapReady || initializing) return;
    if (retry) {
      mapWrap.classList.remove("route-map-off");
      setHint("🗺️ 장소 좌표를 확인하는 중…", false);
    }
    const key = __KAKAO_MAP_JS_KEY__;
    if (!key) {
      failMap("🗺️ 동선 지도를 사용할 수 없어요. 아래 상세 카드의 지도 링크를 이용해 주세요.", false);
      return;
    }
    initializing = true;
    ensureKakao(key).then((ok) => {
      if (mapReady || !sec.isConnected) return;
      if (!ok) {
        failMap("🗺️ 카카오맵을 불러오지 못했어요. 아래 상세 카드의 지도 링크를 이용해 주세요.");
        return;
      }
      let map = null;
      try {
        map = new kakao.maps.Map(mapDiv, { center: new kakao.maps.LatLng(36.4, 127.9), level: 13 });
      } catch (e) {
        failMap("🗺️ 카카오맵을 표시하지 못했어요. 아래 상세 카드의 지도 링크를 이용해 주세요.");
        return;
      }
      mapReady = true;
      mapWrap.classList.remove("route-map-off");
      mapWrap.classList.add("route-map-on");
      setHint("🗺️ 장소 좌표를 확인하는 중…", false);

      const infoWin = new kakao.maps.InfoWindow({ removable: true });
      const line = new kakao.maps.Polyline({
        path: [], strokeColor: "#0f766e", strokeWeight: 3,
        strokeStyle: "dash", strokeOpacity: 0.85, zIndex: 1,
      });
      line.setMap(map);

      const popupHtml = (p) => `
        <div class="route-popup">
          <b>${p.no}. ${esc(p.name)}</b>
          <span class="popup-addr">${esc(p.phase)} · 📍 ${esc(p.address || p.query)}</span>
          <span class="popup-badges">${p.barrier.map((b) => `<i>${esc(b)}</i>`).join("")}</span>
          <div>${mapLinksHtml(p)}</div>
        </div>`;

      /* 방문 순서대로 폴리라인 갱신 + 배치된 핀 기준 화면 맞춤 */
      let focused = false;
      const redraw = () => {
        const cs = placed.filter(Boolean);
        const segments = [];
        let segment = [];
        for (const c of placed) {
          if (c) segment.push(new kakao.maps.LatLng(c.lat, c.lng));
          else {
            if (segment.length > 1) segments.push(segment);
            segment = [];
          }
        }
        if (segment.length > 1) segments.push(segment);
        line.setPath(segments);
        if (!cs.length || focused) return;
        if (cs.every((c) => c.lat === cs[0].lat && c.lng === cs[0].lng)) {
          map.setCenter(new kakao.maps.LatLng(cs[0].lat, cs[0].lng));
          map.setLevel(8);
          return;
        }
        const bounds = new kakao.maps.LatLngBounds();
        cs.forEach((c) => bounds.extend(new kakao.maps.LatLng(c.lat, c.lng)));
        map.setBounds(bounds);
      };

      const focus = (i, position, coordinates) => {
        focused = true;
        map.panTo(position);
        infoWin.setContent(popupHtml({ ...pts[i], ...coordinates }));
        infoWin.setPosition(position);
        infoWin.open(map);
      };

      const pinGroups = new Map();
      const place = (i, c) => {
        const position = new kakao.maps.LatLng(c.lat, c.lng);
        const key = `${c.lat},${c.lng}`;
        let group = pinGroups.get(key);
        if (!group) {
          group = el("div", "route-pin-group");
          new kakao.maps.CustomOverlay({ map, position, content: group, clickable: true, yAnchor: 1, zIndex: 10 });
          pinGroups.set(key, group);
        }
        const pin = el("button", "route-pin kakao");
        pin.type = "button";
        pin.setAttribute("aria-label", `${pts[i].no}번 ${pts[i].name} 무장애 정보`);
        pin.appendChild(el("span", "", String(pts[i].no)));
        pin.addEventListener("click", () => focus(i, position, c));
        visitActions.set(pts[i].no, () => {
          pin.focus({ preventScroll: true });
          focus(i, position, c);
        });
        group.appendChild(pin);
        placed[i] = c;
      };

      let remaining = pts.length;
      const finish = (i, hit) => {
        if (!sec.isConnected) return;
        if (hit) {
          place(i, hit);
          redraw();
        }
        remaining -= 1;
        if (remaining) return;
        const count = placed.filter(Boolean).length;
        const missing = pts.length - count;
        if (!count) failMap("🗺️ 좌표를 찾지 못했어요. 아래 상세 카드의 지도 링크를 이용해 주세요.", false);
        else setHint(missing
          ? `🗺️ ${missing}곳의 좌표를 찾지 못했어요. 점선은 좌표가 있는 연속 방문 순서를 표시해요.`
          : "🗺️ 점선은 방문 순서를 표시해요. 핀을 누르면 무장애 정보를 볼 수 있어요.", false);
      };

      pts.forEach((point, i) => {
        if (point.lat && point.lng) {
          finish(i, { lat: point.lat, lng: point.lng });
        } else enqueueGeocode(async () => {
          if (!sec.isConnected) return;
          try {
            finish(i, await geocodePoint(point));
          } catch {
            finish(i, null);
          }
        });
      });
    }).finally(() => { initializing = false; });
  }

  initMap();
  return (no) => {
    const focus = visitActions.get(no);
    if (!focus) return false;
    sec.scrollIntoView({ block: "start" });
    focus();
    return true;
  };
}

function renderChips(container, items) {
  container.innerHTML = "";
  if (!items.length) { container.classList.remove("visible"); return; }
  container.classList.add("visible");
  const label = el("div", "chips-label", "조건을 바꿔 다시 물어볼 수 있어요");
  container.appendChild(label);
  items.forEach((t) => {
    const b = el("button", "chip", t);
    b.type = "button";
    b.disabled = busy;
    b.addEventListener("click", () => submit(t));
    container.appendChild(b);
  });
}

function renderQuickChips() {
  refs.quick.innerHTML = "";
  const label = el("div", "chips-label", "👇 눌러서 바로 물어보세요");
  refs.quick.appendChild(label);
  const row = el("div", "quick-row");
  [
    "부모님 모시고 가기 좋은 부산 바다 데크길 코스",
    "비 오는 날 휠체어로 편한 실내 나들이",
    "평지 위주 맛집+산책 반나절 코스",
    "제주에서 휠체어로 가볼 만한 곳 알려줘",
  ].forEach((q) => {
    const b = el("button", "chip chip-quick", q);
    b.type = "button";
    b.dataset.q = q;
    row.appendChild(b);
  });
  refs.quick.appendChild(row);
}

function showWelcome() {
  const m = el("div", "msg agent");
  m.innerHTML = `
    <div class="avatar" aria-hidden="true">🌿</div>
    <div class="bubble">
      <div class="content"></div>
      <div class="chips"></div>
    </div>`;
  refs.chat.appendChild(m);
  renderAnswer(
    m.querySelector(".content"),
    m.querySelector(".chips"),
    uiAgent.welcome()
  );
  autoscroll();
}

function resetChat() {
  refs.chat.innerHTML = "";
  showWelcome();
  toast("대화를 새로 시작했어요.");
}

/* ============================ 초대장 ============================ */

function openInvite(places = []) {
  $("#inviteLinks").innerHTML = places.map((place) =>
    `<div class="card-links"><b>${esc(place.name)}</b> ${mapLinksHtml(place)}</div>`).join("");
  $("#inviteText").value = familyInvite(places);
  openModal(refs.inviteModal);
}

function copyInvite() {
  const text = $("#inviteText").value;
  const done = () => toast("복사 완료! 카카오톡에 붙여넣어 주세요. 📋");
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}

function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { if (!document.execCommand("copy")) throw new Error("Copy unavailable"); done(); } catch (_) { toast("복사에 실패했어요. 텍스트를 직접 선택해 주세요."); }
  ta.remove();
}

/* ============================ 설정 ============================ */

function updateBadge() {
  refs.badge.textContent = location.protocol === "file:" ? "시연용 내장 샘플" : "공공데이터 코스";
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.hidden = true; m.style.display = "none"; } // 인라인까지 막아 어떤 CSS와도 충돌 없음
}

function openModal(m) {
  m.hidden = false;
  m.style.display = ""; // 인라인 숨김 해제 → CSS(.modal-backdrop)가 표시 담당
}

/* ============================ 토스트 ============================ */

let toastTimer = null;
function toast(msg) {
  refs.toast.textContent = msg;
  refs.toast.hidden = false; refs.toast.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { refs.toast.hidden = true; refs.toast.style.display = "none"; }, 2600);
}

/* ===================== 일정·시간대 설정 (아코디언 + 유연 스케줄링) ===================== */
/**
 * 모바일 터치 최적화 일정 설정 컴포넌트.
 *  - 평소: 입력창 위 "⚙️ 일정 및 시간대 상세 설정" 한 줄 필만 표시
 *  - 클릭: 아래로 아코디언 펼침 → [당일/1박 2일] 탭 + 듀얼 썸 타임라인 슬라이더(기존 디자인) + 옵션
 *  - 1박 2일: [1일차][2일차] 탭으로 슬라이더를 각각 조절 + 🏨 휠체어 숙소 추천 체크박스
 *  - 활동은 시간대 칸에 고정하지 않고 [식사 포함][카페 휴식 포함] 옵션만 선택 —
 *    어떤 장소를 배치할지는 에이전트가 사용자 발화(테마·동행)에 맞춰 유연하게 조립한다
 */
const TB_MIN = 0, TB_MAX = 24;
let schedState = {
  tripType: "day",            /* "day" | "overnight" */
  activeDay: 1,               /* 패널에서 조작 중인 일차 (전송 시 제외) */
  d1: { s: 0, e: 24 },
  d2: { s: 0, e: 24 },
  meal: true,                 /* 식사 포함 (기본 ON) */
  cafe: true,                 /* 카페 휴식 포함 (기본 ON) */
  hotel: true,                /* 1박 2일: 휠체어 숙소 추천 포함 */
};
let tbExpanded = false;

const fmtHour = (h) => `${String(h).padStart(2, "0")}:00`;
const activeRange = () => (schedState.activeDay === 2 ? schedState.d2 : schedState.d1);

function loadSchedState() {
  try {
    const r = JSON.parse(localStorage.getItem("opennatri.schedule.v3") || "null");
    if (r && r.d1 && Number.isFinite(r.d1.s) && r.d1.e > r.d1.s) {
      schedState = { ...schedState, ...r, activeDay: 1 };
    }
  } catch (_) { /* 저장소 미사용 환경 */ }
}

function saveSchedState() {
  try { localStorage.setItem("opennatri.schedule.v3", JSON.stringify({ ...schedState, activeDay: 1 })); } catch (_) {}
}

/* 아코디언 펼치기/접기 */
function setExpanded(v) {
  tbExpanded = !!v;
  const p = document.getElementById("tbPanel");
  if (p) p.hidden = !tbExpanded;
  const t = document.getElementById("timebarToggle");
  if (t) {
    t.setAttribute("aria-expanded", String(tbExpanded));
    t.classList.toggle("open", tbExpanded);
  }
}

function setRange(s, e) {
  const r = activeRange();
  s = Math.max(TB_MIN, Math.min(TB_MAX, Math.round(Number(s) || TB_MIN)));
  e = Math.max(TB_MIN, Math.min(TB_MAX, Math.round(Number(e) || TB_MAX)));
  if (e - s < 1) { if (s >= TB_MAX) s = TB_MAX - 1; e = s + 1; }
  r.s = s; r.e = e;
  saveSchedState();
  renderSchedule();
}

function hourFromEvent(ev) {
  const rect = $("#tbTrack").getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
  return TB_MIN + Math.round(ratio * (TB_MAX - TB_MIN));
}

function dragThumb(which, ev) {
  const r = activeRange();
  const h = hourFromEvent(ev);
  if (which === "s") setRange(Math.min(h, r.e - 1), r.e);
  else setRange(r.s, Math.max(h, r.s + 1));
}

function renderSchedule() {
  const r = activeRange();
  const overnight = schedState.tripType === "overnight";

  /* 슬라이더 (현재 일차 범위) */
  const pct = (h) => ((h - TB_MIN) / (TB_MAX - TB_MIN)) * 100;
  $("#tbFill").style.left = pct(r.s) + "%";
  $("#tbFill").style.width = Math.max(0, pct(r.e) - pct(r.s)) + "%";
  const tS = $("#tbThumbS"), tE = $("#tbThumbE");
  tS.style.left = pct(r.s) + "%";
  tE.style.left = pct(r.e) + "%";
  for (const [btn, h] of [[tS, r.s], [tE, r.e]]) {
    btn.setAttribute("aria-valuenow", String(h));
    btn.setAttribute("aria-valuetext", fmtHour(h));
  }

  /* 탭·체크박스 상태 */
  document.querySelectorAll(".tb-tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.trip === schedState.tripType));
  document.querySelectorAll(".tb-daytab").forEach((t) =>
    t.classList.toggle("active", Number(t.dataset.day) === schedState.activeDay));
  $("#tbDayRow").hidden = !overnight;
  if ($("#tbHotel").checked !== !!schedState.hotel) $("#tbHotel").checked = !!schedState.hotel;

  /* 옵션 칩 활성 표시 */
  document.querySelectorAll("#tbChips .tb-chip").forEach((c) => {
    const on = c.dataset.opt === "meal" ? schedState.meal : schedState.cafe;
    c.classList.toggle("active", on);
    c.setAttribute("aria-pressed", String(on));
  });

  /* 실시간 요약 문구 */
  const rangeText = overnight
    ? `1일차 ${fmtHour(schedState.d1.s)}~${fmtHour(schedState.d1.e)} / 2일차 ${fmtHour(schedState.d2.s)}~${fmtHour(schedState.d2.e)}`
    : `${fmtHour(r.s)}~${fmtHour(r.e)}`;
  const hotelBit = overnight ? (schedState.hotel ? " · 숙소 추천 포함" : " · 숙소 제외") : "";
  const activityLabels = { act: "관광·산책", lunch: "점심 식사", dinner: "저녁 식사", cafe: "카페 휴식", hotel: "숙소" };
  const activities = [...new Set(buildSchedule(schedState).map((event) => activityLabels[event.kind]))].join(" + ");
  $("#tbSummary").textContent =
    `${overnight ? "1박 2일" : "당일"} 코스 · ${rangeText} · ${activities || "선택 가능한 활동 없음"}${hotelBit}`;

  /* 접힌 상태 한 줄 요약 (예: 00:00~24:00 · 식사+카페) */
  const head = document.getElementById("tbHeadSummary");
  if (head) {
    const shortOpts = [
      schedState.meal ? "식사" : null,
      schedState.cafe ? "카페" : null,
      overnight && schedState.hotel ? "숙소" : null,
    ].filter(Boolean).join("+");
    const headRange = overnight
      ? `${fmtHour(schedState.d1.s)}~${fmtHour(schedState.d1.e)}+${fmtHour(schedState.d2.s)}~${fmtHour(schedState.d2.e)}`
      : `${fmtHour(r.s)}~${fmtHour(r.e)}`;
    head.textContent = `${headRange}${shortOpts ? " · " + shortOpts : ""}`;
  }
}

function bindThumb(btn, which) {
  let dragging = false;
  btn.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    dragging = true;
    try { btn.setPointerCapture(ev.pointerId); } catch (_) { /* 미지원 환경 */ }
  });
  btn.addEventListener("pointermove", (ev) => { if (dragging) dragThumb(which, ev); });
  const stop = () => { dragging = false; };
  btn.addEventListener("pointerup", stop);
  btn.addEventListener("pointercancel", stop);
  /* 키보드 접근: 화살표로 1시간씩 조절 */
  btn.addEventListener("keydown", (ev) => {
    const d = ev.key === "ArrowRight" ? 1 : ev.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    ev.preventDefault();
    const r = activeRange();
    if (which === "s") setRange(Math.min(r.s + d, r.e - 1), r.e);
    else setRange(r.s, Math.max(r.e + d, r.s + 1));
  });
}

function initScheduleBar() {
  loadSchedState();
  /* 눈금 (00~24, 2시간 간격) */
  const ticks = $("#tbTicks");
  for (let h = TB_MIN; h <= TB_MAX; h += 2) {
    const t = el("span", "tb-tick", String(h).padStart(2, "0"));
    t.style.left = ((h - TB_MIN) / (TB_MAX - TB_MIN)) * 100 + "%";
    ticks.appendChild(t);
  }
  /* 옵션 칩: 식사 포함 / 카페 휴식 포함 (활동은 시간대에 고정하지 않음) */
  const chipBox = $("#tbChips");
  [
    { key: "meal", label: "🍚 식사 포함" },
    { key: "cafe", label: "☕ 카페 휴식 포함" },
  ].forEach((o) => {
    const c = el("button", "chip tb-chip", o.label);
    c.type = "button";
    c.dataset.opt = o.key;
    c.disabled = busy;
    c.setAttribute("aria-pressed", "false");
    c.addEventListener("click", () => {
      if (busy) return;
      schedState[o.key] = !schedState[o.key];
      saveSchedState();
      renderSchedule();
    });
    chipBox.appendChild(c);
  });
  /* 썸 드래그 — 터치·펜·마우스 공용 Pointer Events */
  bindThumb($("#tbThumbS"), "s");
  bindThumb($("#tbThumbE"), "e");
  /* 트랙을 직접 탭하면 가까운 썸이 이동 */
  $("#tbTrack").addEventListener("pointerdown", (ev) => {
    if (ev.target.closest?.(".tb-thumb")) return;
    const r = activeRange();
    const h = hourFromEvent(ev);
    if (h < (r.s + r.e) / 2) dragThumb("s", ev); else dragThumb("e", ev);
  });
  /* 여행 형태 탭: 당일 / 1박 2일 */
  document.querySelectorAll(".tb-tab").forEach((t) => {
    t.addEventListener("click", () => {
      if (busy) return;
      schedState.tripType = t.dataset.trip;
      schedState.activeDay = 1;
      saveSchedState();
      renderSchedule();
    });
  });
  /* 일차 탭 (1박 2일): 일차별 슬라이더 전환 */
  document.querySelectorAll(".tb-daytab").forEach((t) => {
    t.addEventListener("click", () => {
      if (busy) return;
      schedState.activeDay = Number(t.dataset.day);
      renderSchedule();
    });
  });
  /* 숙소 체크박스 (1박 2일) */
  $("#tbHotel").addEventListener("change", (e) => {
    schedState.hotel = e.target.checked;
    saveSchedState();
    renderSchedule();
  });
  $("#timebarReset").addEventListener("click", () => {
    schedState = { tripType: "day", activeDay: 1, d1: { s: 0, e: 24 }, d2: { s: 0, e: 24 }, meal: true, cafe: true, hotel: true };
    saveSchedState();
    renderSchedule();
    toast("일정 설정을 기본값(00:00~24:00 · 식사+카페)으로 되돌렸어요.");
  });
  /* 토글 + 패널 밖 클릭 시 자동 닫기 */
  $("#timebarToggle").addEventListener("click", () => setExpanded(!tbExpanded));
  document.addEventListener("pointerdown", (ev) => {
    if (!tbExpanded) return;
    const p = document.getElementById("tbPanel");
    if (p && !p.contains(ev.target) && ev.target !== $("#timebarToggle") && !$("#timebarToggle").contains(ev.target)) {
      setExpanded(false);
    }
  });
  setExpanded(false);
  renderSchedule();

  /* 테스트·자동화용 제어 API (일반 사용 기능에는 영향 없음) */
  try {
    window.__opennatri = {
      setTimeRange: (s, e) => setRange(s, e),
      getTimeRange: () => ({ ...activeRange() }),
      setExpanded: (v) => setExpanded(v),
      isExpanded: () => tbExpanded,
      setTripType: (t) => { schedState.tripType = t; schedState.activeDay = 1; saveSchedState(); renderSchedule(); },
      setDay: (n) => { schedState.activeDay = n; renderSchedule(); },
      setOptions: (o = {}) => {
        if ("meal" in o) schedState.meal = !!o.meal;
        if ("cafe" in o) schedState.cafe = !!o.cafe;
        if ("hotel" in o) schedState.hotel = !!o.hotel;
        saveSchedState();
        renderSchedule();
      },
      getSchedule: () => JSON.parse(JSON.stringify({
        tripType: schedState.tripType, d1: schedState.d1, d2: schedState.d2,
        meal: schedState.meal, cafe: schedState.cafe, hotel: schedState.hotel,
      })),
    };
  } catch (_) { /* window 없는 환경 */ }
}


/* ====== js/main.js ====== */
/**
 * main.js — 애플리케이션 진입점
 */




const agent = new OutingAgent(DEFAULT_SETTINGS);

init({
  agentInstance: agent,
});

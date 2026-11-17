/**
 * ui.js — UI & Interaction Layer / 화면·인터랙션 계층
 * Renders chat messages, agent status timeline, tool call chips, course cards,
 * invitation/settings modals, and toast notifications / 채팅 메시지, 에이전트 상태 타임라인, 도구 호출 칩, 코스 카드, 초대장/설정 모달, 토스트를 렌더링한다.
 *
 * Execution order / 실행 순서:
 * 1. init(): Register event listeners, load settings, show welcome / 1. 이벤트 리스너 등록, 설정 로드, 환영 메시지 표시
 * 2. submit(): User sends message → call agent.handle() → render answer via handlers / 2. 사용자 메시지 전송 → 에이전트 핸들러 호출 → 핸들러를 통해 응답 렌더링
 * 3. renderRouteSection(): Render route summary + Kakao Map / 3. 전체 동선 요약 + 카카오맵 렌더링
 * 4. ensureKakao(): Load Kakao Maps SDK v2 / 4. 카카오맵 JS SDK v2 로드
 * 5. geocodePoint(): Kakao POI search → Nominatim fallback / 5. 카카오 POI 검색 → Nominatim 폴백
 *
 * No API keys are hardcoded / API 키는 하드코딩되지 않음.
 * Kakao Maps JavaScript key comes from settings modal (localStorage) / 카카오 맵 JavaScript 키는 설정 모달(localStorage)에서 가져옴.
 */

import { BADGE_DEFS } from "./data.js";
import { TOOL_SPECS, loadSettings, saveSettings, fetchPublicApi } from "./tools.js";

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

export function init({ agentInstance, onSettingsChange }) {
  uiAgent = agentInstance;
  refs = {
    chat: $("#chat"),
    form: $("#chatForm"),
    input: $("#chatInput"),
    sendBtn: $("#sendBtn"),
    quick: $("#quickChips"),
    badge: $("#dataSourceBadge"),
    settingsBtn: $("#settingsBtn"),
    resetBtn: $("#resetBtn"),
    settingsModal: $("#settingsModal"),
    inviteModal: $("#inviteModal"),
    toast: $("#toast"),
  };

  /* 이벤트 */
  refs.form.addEventListener("submit", (e) => { e.preventDefault(); const t = refs.input.value.trim(); if (t) submit(t); });
  refs.quick.addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (b && !busy) submit(b.dataset.q);
  });
  refs.settingsBtn.addEventListener("click", openSettings);
  refs.resetBtn.addEventListener("click", resetChat);

  /* 모달 닫기 */
  document.querySelectorAll("[data-close]").forEach((b) =>
    b.addEventListener("click", () => closeModal(b.dataset.close)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeModal("settingsModal"); closeModal("inviteModal"); setExpanded(false); }
  });
  document.querySelectorAll(".modal-backdrop").forEach((m) =>
    m.addEventListener("mousedown", (e) => { if (e.target === m) closeModal(m.id); }));

  /* 설정 모달 내부 버튼 */
  $("#saveKeysBtn").addEventListener("click", () => {
    const s = readSettingsForm();
    const hadMapKey = !!loadSettings().keys?.mapKakao;
    saveSettings(s);
    uiAgent.setSettings(s);
    updateBadge();
    closeModal("settingsModal");
    /* 카카오 지도 키를 넣었으면 안 떠 있던 동선 지도를 재검색 없이 즉시 재시도 */
    if (s.keys?.mapKakao && routeMapRetries.length) {
      retryRouteMaps();
      toast("설정이 저장되었어요 — 동선 지도를 다시 시도합니다.");
    } else if (s.keys?.mapKakao && !hadMapKey) {
      toast("설정이 저장되었어요 — 새 코스 검색 시 동선 지도가 표시돼요.");
    } else {
      toast("설정이 저장되었어요.");
    }
  });
  $("#clearKeysBtn").addEventListener("click", () =>
    fillSettingsForm({ useLive: false, keys: { searchOpenTouristSpots: "", searchAccessibleTrails: "", searchStepFreeRestaurants: "", mapKakao: "" } }));
  $("#testKeysBtn").addEventListener("click", testConnection);

  /* 초대장 복사 */
  $("#copyInviteBtn").addEventListener("click", copyInvite);

  /* 초기 상태 */
  fillSettingsForm(loadSettings());
  updateBadge();
  renderQuickChips();
  initScheduleBar();
  showWelcome();

  /* 프로젝트 zip 다운로드 버튼 (빌드에 zip이 내장된 경우만 표시) */
  try {
    if (typeof window.__ZIP_B64__ === "string" && window.__ZIP_B64__.length > 1000) {
      const b = el("button", "btn btn-ghost", "📦 zip 받기");
      b.type = "button";
      b.title = "이 앱의 전체 프로젝트 zip을 다운로드합니다";
      b.addEventListener("click", () => {
        const a = document.createElement("a");
        a.href = `data:application/zip;base64,${window.__ZIP_B64__}`;
        a.download = "opennatri-project.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast("zip 다운로드를 시작했어요 — 브라우저 다운로드 항목을 확인하세요.");
      });
      document.querySelector(".header-actions")?.appendChild(b);
    }
  } catch (_) { /* 비브라우저 환경 */ }
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
  try {
    /* 일정·시간대 설정값을 에이전트에 전달 → 유연한 스케줄링 (blocks → schedule) */
    await uiAgent.handle(text, handlers, {
      schedule: {
        tripType: schedState.tripType,
        d1: { ...schedState.d1 },
        d2: { ...schedState.d2 },
        meal: schedState.meal,
        cafe: schedState.cafe,
        hotel: schedState.hotel,
      },
    });
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
    onAnswer(answer) { renderAnswer(content, chips, answer); autoscroll(); },
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

  if (answer.cards?.length) {
    const rail = el("div", "course");
    answer.cards.forEach((c) => rail.appendChild(renderCard(c)));
    content.appendChild(rail);
  }

  /* 카드 하단: 전체 동선 요약 리스트 + 인라인 지도 (초대장과 같은 route 데이터) */
  if (answer.route?.points?.length) renderRouteSection(content, answer);

  if (answer.summary?.length) {
    const sum = el("div", "summary");
    sum.innerHTML = `<strong>✅ 안심 체크포인트</strong><ul>${answer.summary.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`;
    content.appendChild(sum);
  }

  if (answer.invite) {
    const row = el("div", "invite-row");
    const btn = el("button", "btn btn-primary btn-lg", "💌 가족 단톡방용 초대장 만들기");
    btn.addEventListener("click", () => openInvite(answer.invite));
    row.appendChild(btn);
    content.appendChild(row);
  }

  renderChips(chips, answer.followups || []);
}

function renderCard(c) {
  const card = el("article", "card");
  card.innerHTML = `
    <div class="card-rail">
      <div class="card-order"><span class="no">${c.no}</span></div>
      <div class="phase">${esc(c.phase)}</div>
    </div>
    <div class="card-main">
      <div class="card-head">
        <span class="card-emoji" aria-hidden="true">${c.emoji}</span>
        <div class="card-names">
          <h3 class="card-title">${esc(c.name)}</h3>
          <span class="card-type">${c.kindIcon} ${esc(c.kind)}</span>
        </div>
      </div>
      <div class="card-addr">📍 ${esc(c.address)}</div>
      <div class="badges">${c.badges.map((k) => badgeHtml(k, c.badgeNote?.[k])).join("")}</div>
      ${c.details?.length ? `<div class="card-details">${c.details.map(([k, v]) => `<span><b>${esc(k)}</b> ${esc(v)}</span>`).join("")}</div>` : ""}
      <div class="card-tip">💡 ${esc(c.tip)}</div>
      <div class="card-links"><a href="${mapUrl(c.mapQuery)}" target="_blank" rel="noopener">🗺️ 지도에서 보기</a></div>
    </div>`;
  return card;
}

function badgeHtml(key, note) {
  const d = BADGE_DEFS[key];
  if (!d) return "";
  return `<span class="badge b-${key}" title="${esc(note || d.label)}">${d.emoji} ${esc(note || d.label)}</span>`;
}

const mapUrl = (q) => `https://map.naver.com/p/search/${encodeURIComponent(q)}`;

/* ==================== 전체 동선 요약 + 인라인 지도 (카카오맵) ==================== */

const GEO_CACHE_KEY = "opennatri.geo.v1";
function loadGeoCache() {
  try { return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || "{}"); } catch (_) { return {}; }
}
function saveGeoCache(c) {
  try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(c)); } catch (_) { /* 저장소 미사용 환경 */ }
}

let kakaoReadyKey = null;
/** 카카오맵 JS SDK를 한 번만 로드 (autoload=false → kakao.maps.load 후 사용 가능. 실패 시 false) */
function ensureKakao(key) {
  if (!key) return Promise.resolve(false);
  if (window.kakao?.maps && kakaoReadyKey === key) return Promise.resolve(true);
  return new Promise((resolve) => {
    const js = document.createElement("script");
    /* 스크립트 태그 동적 삽입이라 file://·localhost·웹서버 모두 동일하게 동작 */
    js.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=services&autoload=false`;
    js.onload = () => {
      try {
        kakao.maps.load(() => { kakaoReadyKey = key; resolve(true); });
      } catch (_) { resolve(false); }
    };
    js.onerror = () => resolve(false);
    document.head.appendChild(js);
  });
}

/* 지오코딩 큐 — 공급자 관계없이 초당 1회 수준으로 순차 처리 */
const geoQueue = [];
let geoBusy = false;
function enqueueGeocode(task) {
  geoQueue.push(task);
  void runGeoQueue();
}
async function runGeoQueue() {
  if (geoBusy) return;
  geoBusy = true;
  while (geoQueue.length) {
    await geoQueue.shift()();
    await new Promise((r) => setTimeout(r, 1100));
  }
  geoBusy = false;
}

/* 설정 저장 후 지도가 아직 안 뜬 동선 섹션을 즉시 재시도 — 재검색 없이 렌더링 */
const routeMapRetries = [];
function retryRouteMaps() {
  const pend = routeMapRetries.splice(0);
  pend.forEach((fn) => { try { fn(); } catch (_) { /* 재시도 실패는 무시 */ } });
}

/** 카카오 장소(POI) 검색 → 좌표 (services 라이브러리) */
function kakaoSearch(q) {
  return new Promise((resolve) => {
    try {
      const places = new kakao.maps.services.Places();
      places.keywordSearch(q, (data, status) => {
        if (status === kakao.maps.services.Status.OK && data?.length && data[0].y && data[0].x) {
          resolve({ lat: +data[0].y, lng: +data[0].x });
        } else resolve(null);
      });
    } catch (_) { resolve(null); }
  });
}

/** Nominatim 지오코딩 → 좌표 (카카오 검색 실패 시 폴백) */
async function nominatimSearch(q) {
  try {
    const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=kr&accept-language=ko&q=${encodeURIComponent(q)}`;
    const res = await fetch(u);
    const arr = await res.json();
    if (Array.isArray(arr) && arr.length && arr[0].lat && arr[0].lon) {
      return { lat: +arr[0].lat, lng: +arr[0].lon };
    }
  } catch (_) { /* 폴백 실패 */ }
  return null;
}

/** 장소 검색어 → 좌표 (캐시 우선 → 카카오 POI 검색 → Nominatim 폴백, 최종 null) */
async function geocodePoint(pt) {
  const cache = loadGeoCache();
  if (cache[pt.query]) return cache[pt.query];
  const kakaoReady = !!(window.kakao && window.kakao.maps && kakaoReadyKey);
  const kakaoFirst = kakaoReady ? [pt.queryAlt, pt.query].filter(Boolean) : [];   /* 카카오는 장소명이 유리 */
  const nomiFirst = [pt.query, pt.queryAlt].filter(Boolean);        /* Nominatim은 주소가 유리 */
  const seen = new Set();
  for (const q of kakaoFirst) {
    if (seen.has(q)) continue;
    seen.add(q);
    const hit = await kakaoSearch(q);
    if (hit) { cache[pt.query] = hit; saveGeoCache(cache); return hit; }
  }
  for (const q of nomiFirst) {
    if (seen.has(q)) continue;
    seen.add(q);
    const hit = await nominatimSearch(q);
    if (hit) { cache[pt.query] = hit; saveGeoCache(cache); return hit; }
  }
  return null;
}

/** [📋 이번 나들이 전체 동선 요약] 섹션: 지도 + 요약 리스트 (초대장과 같은 route 데이터) */
function renderRouteSection(content, answer) {
  const pts = answer.route.points;
  const resolved = new Array(pts.length).fill(null);   /* 지오코딩으로 확정된 좌표(카카오맵 링크 계산용) */
  /** 카카오맵 웹 링크 — 좌표가 있으면 지도 핀 링크, 없으면 장소 검색 */
  const kakaoLinkFor = (i) => {
    const p = pts[i];
    const c = resolved[i];
    return c
      ? `https://map.kakao.com/link/map/${encodeURIComponent(p.name)},${c.lat},${c.lng}`
      : `https://map.kakao.com/?q=${encodeURIComponent(p.name || p.query)}`;
  };
  const sec = el("section", "route-section");

  const head = el("div", "route-head");
  head.innerHTML = `<h2>📋 이번 나들이 전체 동선 요약</h2>`;
  const inviteBtn = el("button", "btn btn-sm", "💌 초대장 보기");
  inviteBtn.addEventListener("click", () => openInvite(answer.invite));
  head.appendChild(inviteBtn);
  sec.appendChild(head);

  /* 지도 영역 */
  const mapWrap = el("div", "route-map-wrap");
  const mapDiv = el("div", "route-map");
  mapDiv.id = `route-map-${Math.random().toString(36).slice(2)}`;
  const mapHint = el("div", "route-map-hint", "🗺️ 장소 좌표를 확인하는 중…");
  mapWrap.appendChild(mapDiv);
  mapWrap.appendChild(mapHint);
  sec.appendChild(mapWrap);

  /* 요약 리스트 (모달을 열지 않아도 바로 보임) — 각 행에 카카오맵 웹 바로가기 버튼 */
  const list = el("ol", "route-list");
  const rowEls = pts.map((p, i) => {
    const li = el("li", "route-row");
    li.innerHTML = `
      <span class="route-no">${p.no}</span>
      <span class="route-phase">${esc(p.phase)}</span>
      <span class="route-name">${esc(p.emoji)} ${esc(p.name)}</span>
      <span class="route-addr">${esc(p.address || p.query)}</span>
      <span class="route-barrier">${p.barrier.map((b) => `<i>${esc(b)}</i>`).join("")}</span>`;
    const mapLink = el("button", "route-maplink", "🗺️ 카카오맵에서 보기");
    mapLink.type = "button";
    mapLink.title = "카카오맵 웹에서 이 장소 바로 보기 (새 창)";
    mapLink.addEventListener("click", (ev) => {
      ev.stopPropagation();   /* 행 전체 클릭(지도 포커스)과 분리 */
      window.open(kakaoLinkFor(i), "_blank", "noopener");
    });
    li.appendChild(mapLink);
    list.appendChild(li);
    return li;
  });
  sec.appendChild(list);
  content.appendChild(sec);

  /* 지도 초기화 — 실패 사유별 안내 + ⚙️ 설정 저장 시 즉시 재시도(routeMapRetries) */
  let mapReady = false;
  const placed = new Array(pts.length).fill(null);   /* 방문 순서 인덱스 → 좌표 */

  const failMap = (msg) => {
    mapWrap.classList.add("route-map-off");
    mapHint.style.display = "";
    mapHint.textContent = msg;
    routeMapRetries.push(() => initMap(true));
  };

  function initMap(retry = false) {
    if (mapReady) return;
    if (retry) {
      mapWrap.classList.remove("route-map-off");
      mapHint.style.display = "";
      mapHint.textContent = "🗺️ 장소 좌표를 확인하는 중…";
    }
    const key = loadSettings().keys?.mapKakao;
    if (!key) {
      failMap("🗺️ 설정(⚙️)에서 카카오 지도 JavaScript 키를 입력하면 동선 지도가 표시돼요.");
      return;
    }
    ensureKakao(key).then((ok) => {
      if (mapReady) return;
      if (!ok) {
        failMap("🗺️ 카카오 지도 SDK를 불러오지 못했어요(네트워크·차단). 각 장소의 [카카오맵에서 보기]로 확인해 주세요.");
        return;
      }
      let map = null;
      try {
        map = new kakao.maps.Map(mapDiv, { center: new kakao.maps.LatLng(36.4, 127.9), level: 13 });
      } catch (e) {
        failMap(
          "🗺️ 카카오 지도 인증 실패 — ⚙️ 설정에서 JavaScript 키(REST 키 아님)를 다시 확인하고, " +
          "새 지도 콘솔 키라면 플랫폼에 웹 도메인(http://localhost:8899) 등록이 필요할 수 있어요. " +
          "file:// 대신 node serve.mjs 실행을 권장해요.",
        );
        return;
      }
      mapReady = true;
      mapWrap.classList.remove("route-map-off");
      mapHint.style.display = "";
      mapHint.textContent = "🗺️ 장소 좌표를 확인하는 중…";

      const infoWin = new kakao.maps.InfoWindow({ removable: true });
      const line = new kakao.maps.Polyline({
        path: [], strokeColor: "#0f766e", strokeWeight: 3,
        strokeStyle: "dash", strokeOpacity: 0.85, zIndex: 1,
      });
      line.setMap(map);

      const popupHtml = (p) => `
        <div class="route-popup">
          <b>${p.no}. ${esc(p.name)}</b>
          <span class="popup-addr">📍 ${esc(p.address || p.query)}</span>
          <span class="popup-badges">${p.barrier.map((b) => `<i>✅ ${esc(b)}</i>`).join("")}</span>
        </div>`;

      /* 방문 순서대로 폴리라인 갱신 + 배치된 핀 기준 화면 맞춤 */
      const redraw = () => {
        const cs = placed.filter(Boolean);
        line.setPath(cs.map((c) => new kakao.maps.LatLng(c.lat, c.lng)));
        if (!cs.length) return;
        if (cs.length === 1) {
          map.setCenter(new kakao.maps.LatLng(cs[0].lat, cs[0].lng));
          map.setLevel(8);
          return;
        }
        const currentBounds = new kakao.maps.LatLngBounds();
        cs.forEach((c) => currentBounds.extend(new kakao.maps.LatLng(c.lat, c.lng)));
        map.setBounds(currentBounds);
      };

      /* 행·핀 공용 포커스: 지도 이동 + 말풍선 (핀 없으면 카카오맵 웹 링크 폴백) */
      const focus = (i) => {
        list.querySelectorAll(".route-row.active").forEach((x) => x.classList.remove("active"));
        rowEls[i].classList.add("active");
        const c = placed[i];
        if (!c) { window.open(kakaoLinkFor(i), "_blank", "noopener"); return; }
        const pos = new kakao.maps.LatLng(c.lat, c.lng);
        map.panTo(pos);
        infoWin.setContent(popupHtml(pts[i]));
        infoWin.setPosition(pos);
        infoWin.open(map, pos);
      };

      const place = (i, c) => {
        const pos = new kakao.maps.LatLng(c.lat, c.lng);
        /* 순번 핀: HTML 커스텀 오버레이(클릭 가능) */
        const node = document.createElement("div");
        node.className = "route-pin kakao";
        node.innerHTML = `<span>${pts[i].no}</span>`;
        node.addEventListener("click", () => focus(i));
        const ov = new kakao.maps.CustomOverlay({ position: pos, content: node, yAnchor: 1, zIndex: 10 });
        ov.setMap(map);
        placed[i] = c;
        resolved[i] = c;
        redraw();
      };

      /* 좌표가 있는 장소(실시간 데이터)는 즉시 배치, 없으면 지오코딩 큐로 보완 */
      pts.forEach((p, i) => {
        if (p.lat && p.lng) { place(i, { lat: p.lat, lng: p.lng }); return; }
        enqueueGeocode(async () => {
          const hit = await geocodePoint(p);
          if (hit) place(i, hit);
          else rowEls[i].classList.add("unmapped");
          if (!geoQueue.length) {
            const done = placed.filter(Boolean).length;
            if (done === pts.length) mapHint.style.display = "none";
            else mapHint.textContent = done
              ? `🗺️ ${pts.length - done}곳은 좌표를 찾지 못해 지도에서 제외됐어요`
              : "🗺️ 좌표를 찾지 못했어요 — 요약 리스트로 확인해 주세요.";
          }
        });
      });

      /* 리스트 행 클릭 → 지도 이동 + 말풍선 */
      rowEls.forEach((li, i) => li.addEventListener("click", () => focus(i)));
    });
  }
  initMap();
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

let currentInvite = "";

function openInvite(text) {
  currentInvite = text;
  const body = $("#invitePreview");
  body.innerHTML = `<div class="invite-card">
    <div class="invite-card-head">💌 오픈나들이 · 가족 초대장</div>
    <div class="invite-card-body">${esc(text)}</div>
  </div>`;
  $("#inviteText").value = text;
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
  try { document.execCommand("copy"); done(); } catch (_) { toast("복사에 실패했어요. 텍스트를 직접 선택해 주세요."); }
  ta.remove();
}

/* ============================ 설정 ============================ */

function updateBadge() {
  refs.badge.textContent = uiAgent.sourceLabel();
}

function openSettings() {
  fillSettingsForm(loadSettings());
  $("#testResult").hidden = true;
  openModal(refs.settingsModal);
}

function fillSettingsForm(s) {
  $("#useLive").checked = !!s.useLive;
  $("#keyTour").value = s.keys?.searchOpenTouristSpots || "";
  $("#keyTrail").value = s.keys?.searchAccessibleTrails || "";
  $("#keyBiz").value = s.keys?.searchStepFreeRestaurants || "";
  $("#keyMap").value = s.keys?.mapKakao || "";
}

function readSettingsForm() {
  return {
    useLive: $("#useLive").checked,
    keys: {
      searchOpenTouristSpots: $("#keyTour").value.trim(),
      searchAccessibleTrails: $("#keyTrail").value.trim(),
      searchStepFreeRestaurants: $("#keyBiz").value.trim(),
      mapKakao: $("#keyMap").value.trim(),
    },
  };
}

async function testConnection() {
  const s = readSettingsForm();
  const box = $("#testResult");
  box.hidden = false;
  box.style.display = "block";
  const key = s.keys.searchOpenTouristSpots;
  if (!key) { box.textContent = "⚠️ 테스트할 관광공사 API 키를 먼저 입력해 주세요."; return; }
  box.textContent = "공공데이터포털 연결 테스트 중…";

  const qs = new URLSearchParams({
    serviceKey: key, numOfRows: "1", pageNo: "1",
    MobileOS: "ETC", MobileApp: "OpenNatri",
    keyword: "무장애", _type: "json",
  });

  /* 브라우저 직접 호출 → 프록시 → JSONP 순차 시도(tools.fetchPublicApi)
     테스트 대상: [개발계정]한국관광공사_무장애 여행 정보 (KorWithService2) — 앱 라이브 경로와 동일 */
  try {
    const { text, via } = await fetchPublicApi("B551011/KorWithService2/searchKeyword2", qs);
    let json = null;
    try { json = JSON.parse(text); } catch (_) {}
    const gwErr = json?.OpenAPI_ServiceResponse?.cmmMsgHeader
      || (json?.response?.header && json.response.header.resultMsg !== "OK" ? json.response.header : null);
    if (gwErr?.returnReasonCode || gwErr?.resultCode) {
      const code = gwErr.returnReasonCode || gwErr.resultCode;
      const msg = gwErr.returnAuthMsg || gwErr.resultMsg || gwErr.errMsg || "";
      const hint = {
        "22": "요청 한도 초과(개발계정 일 한도 확인)",
        "30": "이 키가 무장애여행(KorWithService2)에 등록되지 않음 — 재발급 전 옛 키인지, 승인 후 1~2시간 경과했는지 확인",
        "31": "활용신청·승인 상태 확인",
        "32": "접근 거부",
        "33": "인증키 오류",
      }[code] || "키 발급·활용신청 상태 확인";
      box.textContent = `⚠️ 게이트웨이 응답 [${code}] ${msg} — ${hint}. (경로: ${via})`;
    } else if (json?.response?.header?.resultMsg === "OK") {
      const n = json?.response?.body?.totalCount ?? "?";
      box.textContent = `✅ 인증키 유효(${via})! 실시간 조회 준비 완료 — 무장애여행 검색 결과 ${n}건 수신 확인.`;
    } else {
      box.textContent = `⚠️ 응답 확인 필요(${via}): ${String(text).slice(0, 120)}…`;
    }
  } catch (e) {
    /* 모든 경로 실패 — 주소창 직접 테스트 안내.
       ⚠️ 보안: 키가 포함된 URL은 화면에 표시하지 않고 복사 버튼(클립보드)으로만 전달한다. */
    box.textContent = "";
    box.appendChild(el("div", null,
      `⚠️ 호출 경로 3개(직접·프록시·JSONP) 모두 실패(${e.message}). ` +
      `아래 버튼으로 '주소창 테스트 URL'을 복사한 뒤, 본인 브라우저의 주소창에 붙여넣어 열어 보세요 — ` +
      `데이터가 보이면 키는 유효한 것이고, 앱 환경의 네트워크 제한 문제입니다.`));
    const masked = "https://apis.data.go.kr/B551011/KorWithService2/searchKeyword2?serviceKey=●●●(복사 버튼 사용)&numOfRows=1&MobileOS=ETC&MobileApp=OpenNatri&keyword=무장애&_type=json";
    box.appendChild(el("div", "step-note", `테스트 URL 형태: ${masked}`));
    const rawUrl = `https://apis.data.go.kr/B551011/KorWithService2/searchKeyword2?serviceKey=${encodeURIComponent(key)}&numOfRows=1&pageNo=1&MobileOS=ETC&MobileApp=OpenNatri&keyword=${encodeURIComponent("무장애")}&_type=json`;
    const btn = el("button", "btn btn-ghost", "📋 주소창 테스트 URL 복사 (키는 화면에 표시되지 않음)");
    btn.addEventListener("click", () => {
      const done = () => toast("테스트 URL 복사 완료 — 브라우저 주소창에 붙여넣어 열어 보세요");
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(rawUrl).then(done).catch(() => fallbackCopy(rawUrl, done));
      else fallbackCopy(rawUrl, done);
    });
    box.appendChild(btn);
  }
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
  const optBits = [schedState.meal ? "식사 포함" : "식사 제외", schedState.cafe ? "카페 포함" : null].filter(Boolean);
  const rangeText = overnight
    ? `1일차 ${fmtHour(schedState.d1.s)}~${fmtHour(schedState.d1.e)} / 2일차 ${fmtHour(schedState.d2.s)}~${fmtHour(schedState.d2.e)}`
    : `${fmtHour(r.s)}~${fmtHour(r.e)}`;
  const hotelBit = overnight ? (schedState.hotel ? " · 숙소 추천 포함" : " · 숙소 제외") : "";
  $("#tbSummary").textContent =
    `${overnight ? "1박 2일" : "당일"} 코스 · ${rangeText} · ${optBits.join(", ")}${hotelBit}`;

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

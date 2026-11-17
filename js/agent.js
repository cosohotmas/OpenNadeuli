/**
 * agent.js — OpenNadeuli AI Agent Pipeline / 오픈나들이 AI 에이전트 파이프라인
 *
 * Pipeline structure / 동작 구조 (Function Calling 파이프라인):
 *
 *   User utterance / 사용자 발화
 *      │
 *      ├─ 1. Intent analysis (nlu.parseIntent)  → Region/theme/companion/weather/schedule parameters / 지역/테마/동행/우천/일정 파라미터화
 *      ├─ 2. Tool combination planning / 도구 조합 계획 → Determine tool call order / 3개 도구 호출 순서 확정
 *      ├─ 3. Autonomous tool calls (tools.callTool) / 도구 자율 호출
 *      │      ① searchOpenTouristSpots     (Korea Tourism Organization Open API / 한국관광공사 열린관광지)
 *      │      ② searchAccessibleTrails     (Barrier-free walking paths, max slope ≤8% / 무장애 탐방로·데크길, 경사도 ≤8%)
 *      │      ③ searchStepFreeRestaurants  (Small business info API, step-free entrance / 상권정보, 출입구 턱 없음)
 *      │      ※ ③ uses results from ①② as arguments — tool chaining / ③은 ①②의 결과(인근 상권)를 인자로 사용 — 도구 체이닝
 *      ├─ 4. Verification & filtering / 검증·필터링 → Return exclusion reasons as rationale / 제외 사유를 근거로 반환
 *      └─ 5. Course assembly & response generation / 코스 조립·응답 생성 → Cards/badges/tips/invitation/follow-up questions / 카드/배지/팁/초대장/후속 질문
 *
 * Each stage emits events via handler (h) for real-time streaming in UI / 각 단계는 핸들러(h)로 이벤트를 내보내 UI에서 실시간 스트리밍됨.
 */

import { REGIONS, REGION_MAIN_SUBAREA, REGION_CENTER, BADGE_DEFS } from "./data.js";
import { parseIntent, defaultRegion } from "./nlu.js";
import { callTool, TOOL_SPECS, sleep } from "./tools.js";

export class OutingAgent {
  constructor(settings) {
    this.settings = settings || {};
    this.lastIntent = null;   // 후속 질문("다른 코스" 등)에 재사용
    this.variants = {};       // 지역별 코스 변형 카운터
    this.regionIdx = 0;
  }

  setSettings(s) { this.settings = s; }

  /** 첫 화면 환영 답변 */
  welcome() { return greetingAnswer(); }

  /** 헤더 데이터 소스 배지 표시용 */
  sourceLabel() {
    const hasKey = Object.values(this.settings?.keys || {}).some((k) => k && k.trim());
    return this.settings?.useLive && hasKey ? "실시간 API 시도 · 내장 폴백" : "내장 샘플 데이터";
  }

  /**
   * Process user utterance / 사용자 발화 처리 — 파이프라인 메인 진입점
   * @param {string} text — User input text / 사용자 입력 텍스트
   * @param {object} h — Event handlers { onStatus, onStatusDone, onTool, onToolDone, onAnswer, onNote } / 이벤트 핸들러
   * @param {object} [extras] — UI control values — { schedule: { tripType, d1, d2, meal, cafe, hotel } } / UI 컨트롤 값
   *
   * Execution order / 처리 순서:
   * 1. Parse intent (nlu.parseIntent) / 1. 의도 분석
   * 2. Handle greeting / no hint → return greeting answer / 인사 또는 힌트 없음 → 안내 응답 반환
   * 3. Determine region (respect nextRegion, lastIntent, defaultRegion) / 3. 지역 결정 (다음 지역, 마지막 의도, 기본 지역 순서로 존중)
   * 4. Normalize schedule from UI slider (00:00~24:00, always respected) / 4. UI 슬라이더에서 일정 정규화 (00:00~24:00, 항상 존중)
   * 5. Build schedule events / 5. 일정 이벤트 구성
   * 6. Detect spots list mode (N tourist spots instead of course) / 6. 여행지 목록 모드 감지 (코스 대신 관광지 N곳)
   * 7. Add option/schedule labels / 7. 옵션·일정 라벨 추가
   */
  async handle(text, h, extras) {
    // 1) Parse intent / 1) 의도 분석
    const intent = parseIntent(text);

    // 2) Greeting or no hint → return greeting answer / 2) 인사 또는 힌트 없음 → 안내 응답
    if (intent.greeting) { h.onAnswer(greetingAnswer()); return; }

    const hasHint = intent.region || intent.themes.length || intent.mobility.length ||
      intent.restaurantsOnly || intent.anotherCourse || intent.outing || (intent.text || "").length >= 8;
    if (!hasHint) { h.onAnswer(greetingAnswer()); return; }

    // 3) Region determination (respect user slider time range, never clamp to 9am) / 3) 지역 결정
    let region = intent.region;
    if (intent.nextRegion) {
      this.regionIdx = (this.regionIdx + 1) % REGIONS.length;
      region = REGIONS[this.regionIdx];
    }
    if (!region) region = this.lastIntent?.region || null;
    if (!region) region = defaultRegion(intent.themes);
    this.regionIdx = Math.max(0, REGIONS.indexOf(region));

    if (intent.anotherCourse) this.variants[region] = (this.variants[region] || 0) + 1;
    const variant = this.variants[region] || 0;

    // 4) Normalize schedule from UI accordion → flexible scheduling / 4) UI 아코디언에서 일정 정규화 → 유연한 스케줄
    const sched = normalizeSchedule(extras?.schedule);
    // Activity placement preference: indoor/culture → tourist spots fixed; walk/sea/park → trails / 4-1) 활동 배치 선호
    const pref = {
      trailOk: !intent.indoorOnly && !(intent.themes.length === 1 && intent.themes[0] === "culture"),
    };
    const scheduleEvents = buildSchedule(sched, pref);

    const ctx = { ...intent, region, variant, schedule: { ...sched, events: scheduleEvents } };

    // 5) Spots list mode: "recommend 3 tourist spots" → list of spots instead of course / 5) 여행지 목록 모드
    const listMode = !ctx.restaurantsOnly && !!intent.spotsList && (intent.wantN || 0) >= 2;
    if (listMode) ctx.labels.push(`형식 · 여행지 ${intent.wantN}곳 목록`);
    ctx.listMode = listMode;
    this.lastIntent = ctx;

    // 6) Option/schedule labels / 6) 옵션·일정 라벨
    if (!listMode && !ctx.restaurantsOnly) {
      if (!intent.labels.some((l) => l.startsWith("일정 ·"))) {
        intent.labels.push(`일정 · ${sched.tripType === "overnight" ? "1박 2일" : "당일"}`);
      }
      if (sched.meal && !intent.labels.some((l) => l.includes("식사") || l.includes("식당"))) intent.labels.push("식사 포함");
      if (sched.cafe) intent.labels.push("카페 포함");
    }
    const needSpots = scheduleEvents.some((ev) => ev.kind === "act" && ev.act === "spot");
    const needTrails = scheduleEvents.some((ev) => ev.kind === "act" && ev.act === "trail");
    const needRests = scheduleEvents.some((ev) => ev.kind === "lunch" || ev.kind === "cafe" || ev.kind === "dinner");
    const needHotels = sched.tripType === "overnight" && sched.hotel && scheduleEvents.some((ev) => ev.kind === "hotel");
    if (needHotels) intent.labels.push("숙소 추천 포함");

    /* 도구 조합: 일정 이벤트에 필요한 도구만 동적으로 호출 */
    const toolNames = listMode
      ? ["searchOpenTouristSpots"]
      : ctx.restaurantsOnly
        ? ["searchStepFreeRestaurants"]
        : [
            ...(needSpots ? ["searchOpenTouristSpots"] : []),
            ...(needTrails ? ["searchAccessibleTrails"] : []),
            ...(needRests ? ["searchStepFreeRestaurants"] : []),
            ...(needHotels ? ["searchStayHotels"] : []),
          ];
    if (!toolNames.length) toolNames.push("searchOpenTouristSpots"); /* 안전망 */
    const d1 = sched.d1, d2 = sched.d2;
    const schedLabel = listMode
      ? `여행지 ${intent.wantN}곳 목록`
      : `${sched.tripType === "overnight" ? "1박 2일" : "당일"} ${hh(d1.s)}~${hh(d1.e)}${sched.tripType === "overnight" ? ` / ${hh(d2.s)}~${hh(d2.e)}` : ""}`;
    h.onStatusDone(step0, `분석 완료 → 지역 "${region}" · ${schedLabel} · 도구 ${toolNames.length}개`);

    /* ---------- 2단계: 도구 조합 계획 ---------- */
    const planStep = h.onStatus({
      icon: "🗂️",
      title: "도구 조합 계획 수립",
      detail: toolNames.map((n, i) => `${i + 1}. ${TOOL_SPECS.find((t) => t.name === n).label}`).join("  →  "),
    });
    await sleep(450);
    const SHORT_TOOL = {
      searchOpenTouristSpots: "관광지",
      searchAccessibleTrails: "탐방로",
      searchStepFreeRestaurants: "인근 식당(연계)",
    };
    h.onStatusDone(planStep, `호출 순서 확정: ${toolNames.map((n) => SHORT_TOOL[n]).join(" → ")}`);

    /* ---------- 3단계: 도구 자율 호출 (활동 먼저 → 체이닝으로 식당) ---------- */
    const results = {};

    if (ctx.indoorOnly && !toolNames.includes("searchAccessibleTrails")) {
      h.onNote("우천·실내 판단 → 데크길 산책 대신 실내·반실내 동선으로 구성");
    }

    /* ① 열린관광지 */
    if (toolNames.includes("searchOpenTouristSpots")) {
      const args = { region, themes: ctx.themes, indoorOnly: ctx.indoorOnly };
      results.spots = await this.#runTool(h, "searchOpenTouristSpots", args);

      if (ctx.indoorOnly && results.spots.items.length) {
        h.onNote(`우천·실내 조건 적용 → 실내·반실내 ${results.spots.items.length}곳만 통과`);
      }
    }

    /* ② 무장애 탐방로 (경사도 8% 이하) */
    if (toolNames.includes("searchAccessibleTrails")) {
      const args = { region, themes: ctx.themes, maxSlope: 8 };
      results.trails = await this.#runTool(h, "searchAccessibleTrails", args);

      const ex = results.trails.excluded;
      if (results.trails.source === "sample") {
        h.onNote(ex.length
          ? `경사도 8% 이하 필터링 → 제외: ${ex.join(", ")}`
          : "경사도 8% 이하 필터링 → 전 구간 통과");
      }
    }

    /* ④ 무장애 숙소 (1박 2일 + 숙소 옵션) */
    if (toolNames.includes("searchStayHotels")) {
      results.hotels = await this.#runTool(h, "searchStayHotels", { region });
    }

    /* 일정 이벤트에 활동 배정 (관광지·산책로 → 좌표 확정) */
    this.#assignActPicks(ctx, results, h);

    /* ③ 상권정보 식당 (선택된 활동의 좌표를 인자로 사용 — 도구 체이닝) */
    if (toolNames.includes("searchStepFreeRestaurants")) {
      const firstAct = ctx.schedule.events.find((ev) => ev.kind === "act" && ev.pick);
      const cc = REGION_CENTER[region] || {};
      const actSubs = ctx.schedule.events
        .filter((ev) => ev.kind === "act" && ev.pick)
        .map((ev) => ev.pick.subArea)
        .filter(Boolean);
      const args = {
        region,
        cx: firstAct?.pick?.xswftm || firstAct?.pick?.mapx || cc.x || "",
        cy: firstAct?.pick?.yswftm || firstAct?.pick?.mapy || cc.y || "",
        subAreas: actSubs.length ? actSubs : [REGION_MAIN_SUBAREA[region]].filter(Boolean),
      };
      results.rests = await this.#runTool(h, "searchStepFreeRestaurants", args);

      const ex = results.rests.excluded;
      if (results.rests.source === "sample") {
        h.onNote(ex.length
          ? `턱 없는 출입구 필터 → 제외: ${ex.join(", ")}`
          : "턱 없는 출입구 필터 → 전 매장 통과");
      } else if (results.rests.liveNote) {
        h.onNote(results.rests.liveNote);
      }
    }

    /* 식사·카페·숙소 이벤트에 후보 배정 */
    this.#assignRestPicks(ctx, results, h);

    /* ---------- 4~5단계: 검증·코스 조립·응답 ---------- */
    /* 여행지 목록 모드: 코스 조립 없이 관광지 N곳 목록으로 응답 */
    if (ctx.listMode) {
      const buildStep = h.onStatus({
        icon: "📋",
        title: "여행지 목록 조립 중…",
        detail: "무장애 배지 많은 순 정렬 → 상위 N곳 선별",
      });
      await sleep(500);
      const answer = this.#spotsListAnswer(ctx, results);
      h.onStatusDone(buildStep, `여행지 ${answer.cards.length}곳 목록 완성`);
      await sleep(250);
      h.onAnswer(answer);
      return;
    }
    const buildStep = h.onStatus({ icon: "✅", title: "코스 조립·안심 검증 중…", detail: "동선 순서 정렬 → 배지 부여 → 초대장 생성" });
    await sleep(600);
    const answer = this.#assembleAnswer(ctx, results);
    h.onStatusDone(buildStep, `검증 완료 · 코스 ${answer.cards.length}곳 구성`);
    await sleep(250);
    h.onAnswer(answer);
  }

  /** 도구 1회 호출 + 이벤트 스트리밍 */
  async #runTool(h, name, args) {
    const id = h.onTool({ name, args });
    const result = await callTool(name, args, this.settings);
    h.onToolDone(id, result);
    return result;
  }

  /* ================ 코스 조립 ================ */

  #pickNth(arr, variant) {
    if (!arr || !arr.length) return null;
    return arr[variant % arr.length];
  }

  #assembleAnswer(ctx, results) {
    if (ctx.restaurantsOnly) return this.#restaurantsOnlyAnswer(ctx, results);
    return this.#scheduleAnswer(ctx, results);
  }

  /* --- 유연 스케줄링 코스: 일정 이벤트 → 시간 순서 카드 조립 --- */
  #scheduleAnswer(ctx, results) {
    const sched = ctx.schedule;
    const overnight = sched.tripType === "overnight";
    const cards = [];
    let no = 1;
    for (const ev of sched.events) {
      if (!ev.pick) continue;   /* 후보 없는 이벤트는 카드 생략(노트로 안내됨) */
      const phase = schedulePhase(ev, overnight);
      if (ev.kind === "act") {
        cards.push(ev.act === "trail"
          ? this.#trailCard(ev.pick, no++, phase)
          : this.#spotCard(ev.pick, no++, phase));
      } else if (ev.kind === "hotel") {
        cards.push(this.#hotelCard(ev.pick, no++, phase));
      } else {
        cards.push(this.#restCard(ev.pick, no++, phase));
      }
    }

    const rangeText = overnight
      ? `1일차 ${hh(sched.d1.s)}~${hh(sched.d1.e)} · 2일차 ${hh(sched.d2.s)}~${hh(sched.d2.e)}`
      : `${hh(sched.d1.s)}~${hh(sched.d1.e)}`;
    const opts = [];
    if (sched.meal) opts.push("식사");
    if (sched.cafe) opts.push("카페");
    if (overnight && sched.hotel) opts.push("무장애 숙소");
    const intro = this.#scheduleIntro(ctx, rangeText, opts, cards.length);

    /* 후속 "식당만 더 보여줘" 질문을 위한 인근 상권 기억 */
    this.lastSubAreas = sched.events
      .filter((ev) => ev.kind === "act" && ev.pick && ev.pick.subArea)
      .map((ev) => ev.pick.subArea);

    const summary = this.#scheduleSummary(sched.events);
    const invite = this.#scheduleInvite(ctx, sched.events, overnight);
    /* 하단 동선 요약·지도 핀 — 초대장과 같은 routeRows 데이터를 공유 */
    const route = { points: routeRows(sched.events, overnight) };

    return {
      type: "course",
      intro,
      labels: ctx.labels,
      cards,
      summary,
      invite,
      route,
      followups: FOLLOWUP_CHIPS,
      meta: {
        source: results.spots?.source || results.rests?.source || results.hotels?.source || "sample",
        region: ctx.region,
        variant: ctx.variant,
      },
    };
  }

  /* 일정 이벤트(kind=act)에 관광지/산책로 배정 — 변형 코스 회전 */
  #assignActPicks(ctx, results, h) {
    const spots = results.spots?.items || [];
    const trails = results.trails?.items || [];
    let si = 0, ti = 0;
    let hourFallbackNoted = false;
    let unverifiedNoted = false;
    for (const ev of ctx.schedule.events) {
      if (ev.kind !== "act") continue;
      if (ev.act === "spot") {
        /* 이벤트 시간대(새벽·야간 포함)에 운영 중인 곳을 우선 배정 — 24시간 운영 장소 반영 */
        const fits = (sp) =>
          spotOpenAt(sp.usageHour, ev.start, ev.end) &&
          !(ev.start < 9 && !hoursKnown(sp.usageHour));   /* 새벽 슬롯은 운영시간 명시 곳만 */
        let pick = null, anyOpen = false, usedUnverified = false;
        if (spots.length) {
          for (let k = 0; k < spots.length; k++) {   /* 1차: 무장애 검증된 곳만 */
            const cand = spots[(ctx.variant + si + k) % spots.length];
            if (cand.liveUnverified || !fits(cand)) continue;
            pick = cand; anyOpen = true; break;
          }
          if (!pick) {
            for (let k = 0; k < spots.length; k++) {   /* 2차: 조건 완화 — 미검증 실시간 결과 허용 */
              const cand = spots[(ctx.variant + si + k) % spots.length];
              if (!fits(cand)) continue;
              pick = cand; anyOpen = true; usedUnverified = !!cand.liveUnverified; break;
            }
          }
          if (!pick) pick = spots[(ctx.variant + si) % spots.length];   /* 전부 불일치 → 회전 폴백 */
          si++;
        }
        if (spots.length && !anyOpen && !hourFallbackNoted) {
          hourFallbackNoted = true;
          h.onNote("선택 시간대에 운영 중 표시된 관광지 정보가 부족해 운영시간 확인이 필요한 곳도 함께 골랐어요.");
        }
        if (pick?.liveUnverified && !unverifiedNoted) {
          unverifiedNoted = true;
          h.onNote("무장애 검증 정보가 있는 곳이 부족해 실시간 검색 결과(⚠️ 현장 확인 필요)도 보조로 골랐어요.");
        }
        ev.pick = pick;
      } else {
        ev.pick = trails.length ? trails[(ctx.variant + ti++) % trails.length] : null;
      }
      if (!ev.pick) {
        h.onNote(`${ev.day === 2 ? "2일차" : "1일차"} ${fmtT(ev.start)} ${ev.act === "trail" ? "산책로" : "관광지"} 후보가 없어 일정에서 제외했어요.`);
      }
    }
  }

  /* 식사·카페·숙소 이벤트 배정 — 점심·저녁은 서로 다른 식당, 카페는 카페 종목 우선 */
  #assignRestPicks(ctx, results, h) {
    const rests = results.rests?.items || [];
    const hotels = results.hotels?.items || [];
    const used = new Set();
    const CAFE_RE = /카페|베이커리|브런치|디저트|다방|찻집/i;
    let lunchPickRef = null;
    const pickRest = (filterFn) => {
      const pool = filterFn ? rests.filter(filterFn) : rests.slice();
      const unused = pool.filter((r) => !used.has(r.bizesId || r.bizesNm));
      const pick = this.#pickNth(unused.length ? unused : pool, ctx.variant);
      if (pick) used.add(pick.bizesId || pick.bizesNm);
      return pick;
    };
    for (const ev of ctx.schedule.events) {
      if (ev.kind === "lunch" || ev.kind === "dinner") {
        ev.pick = pickRest();
        if (!ev.pick) {
          h.onNote(`${ev.day === 2 ? "2일차" : "1일차"} ${fmtT(ev.start)} 식당 후보가 없어 일정에서 제외했어요.`);
        } else if (ev.kind === "dinner" && lunchPickRef && (ev.pick.bizesId || ev.pick.bizesNm) === (lunchPickRef.bizesId || lunchPickRef.bizesNm)) {
          ev.pick = null;
          h.onNote("식당 후보가 하나뿐이라 저녁은 점심 장소 재방문을 권해요.");
        }
        if (ev.kind === "lunch" && ev.pick) lunchPickRef = ev.pick;
      } else if (ev.kind === "cafe") {
        ev.pick = pickRest((r) => CAFE_RE.test(`${r.indsMclsNm || ""} ${r.indsSclsNm || ""} ${r.bizesNm || ""}`)) || pickRest();
        if (!ev.pick) h.onNote(`${ev.day === 2 ? "2일차" : "1일차"} ${fmtT(ev.start)} 카페 후보가 없어 일정에서 제외했어요.`);
      } else if (ev.kind === "hotel") {
        ev.pick = hotels.length ? this.#pickNth(hotels, ctx.variant) : null;
        if (!ev.pick) h.onNote("숙소 후보가 없어 체크인 일정에서 제외했어요.");
      }
    }
  }

  /* --- 스케줄 인트로 --- */
  #scheduleIntro(ctx, rangeText, opts, cardCount) {
    const parts = [];
    if (ctx.mobility.includes("wheelchair") || ctx.mobility.includes("senior")) {
      parts.push("휠체어·보행기 이용 가족이라면 턱과 경사가 제일 큰 걱정이죠.");
    }
    if (ctx.variant > 0) parts.push("이전과 다른 조합으로 새로 검증했어요.");
    const overnight = ctx.schedule.tripType === "overnight";
    parts.push(
      `열린관광지(무장애 정보)·무장애 탐방로·상권정보${overnight ? "·숙박" : ""} 데이터를 조합해 ` +
      `${ctx.region} ${overnight ? "1박 2일" : "당일"} 코스(${rangeText})를 만들었어요. ` +
      `옵션: ${opts.length ? opts.join(" · ") : "없음"} — 시간대에 맞춰 ${cardCount}곳을 유연하게 배치했어요.`
    );
    if (ctx.schedule.meal && !ctx.schedule.events.some((ev) => ev.kind === "lunch" || ev.kind === "dinner")) {
      parts.push("식사 포함을 선택하셨지만 활동 시간에 여유가 없어 식당을 뺐어요.");
    }
    if (ctx.schedule.cafe && !ctx.schedule.events.some((ev) => ev.kind === "cafe")) {
      parts.push("카페 옵션은 활동 시간에 여유가 없어 제외했어요.");
    }
    parts.push("아래 카드를 시간 순서대로 따라가시면 돼요.");
    return parts.join(" ");
  }

  /* --- 스케줄 안심 체크포인트 --- */
  #scheduleSummary(evs) {
    const pts = [];
    for (const ev of evs) {
      if (!ev.pick) continue;
      const dayTag = ev.day === 2 ? "2일차 " : "";
      if (ev.kind === "act" && ev.act === "trail") {
        pts.push(`${dayTag}산책로 최대 경사도 ${ev.pick.maxSlope}% — 8% 이하 데크길`);
        if (ev.pick.handrail === "Y") pts.push(`${dayTag}산책로 안전 난간 완비`);
        if (ev.pick.restArea === "Y") pts.push(`${dayTag}산책로 중간 휴식 공간 완비`);
        if (ev.pick.accessibleToilet === "Y") pts.push(`${dayTag}산책로 인근 장애인 화장실 완비`);
      } else if (ev.kind === "act" && ev.act === "spot") {
        const b = ev.pick.barrier || {};
        if (b.rental === "Y") pts.push(`휠체어 대여: ${ev.pick.rentalInfo || ev.pick.title}`);
        if (b.toilet === "Y") pts.push(`${ev.pick.title} 장애인 화장실 완비`);
      } else if (ev.kind === "lunch" || ev.kind === "dinner") {
        const unv = !!ev.pick.liveUnverified;
        pts.push(`${ev.kind === "dinner" ? "저녁 식당" : "식당"} ${ev.pick.bizesNm} — ${ev.pick.access?.memo || (unv ? "턱 유무 미제공 · 전화 확인 필요" : "출입구 턱 없음 확인")}`);
      } else if (ev.kind === "cafe") {
        pts.push(`카페 ${ev.pick.bizesNm} — 이동 중 휴식 (턱 정보는 전화 확인 권장)`);
      } else if (ev.kind === "hotel") {
        pts.push(`숙소 ${ev.pick.title} — ${ev.pick.roomInfo || "무장애 객실"}`);
      }
    }
    return pts;
  }

  /* --- 스케줄 초대장 (동선 목록은 routeRows 데이터를 그대로 사용 — 요약 리스트·지도와 동기화) --- */
  #scheduleInvite(ctx, evs, overnight) {
    const lines = [];
    lines.push(`💌 [오픈나들이] ${nextWeekendLabel()} ${overnight ? "1박 2일" : "당일"} 무장애 나들이 초대장`);
    lines.push("");
    let dayShown = 0;
    for (const r of routeRows(evs, overnight)) {
      if (overnight && r.day !== dayShown) {
        lines.push(r.day === 1 ? "DAY 1" : "DAY 2");
        dayShown = r.day;
      }
      lines.push(`${r.no}. ${r.time}  ${r.emoji} ${r.name} — ${r.address || r.query}`);
    }
    lines.push("");
    lines.push("✅ 안심 체크포인트");
    this.#scheduleSummary(evs).forEach((p) => lines.push(`· ${p}`));
    lines.push("");
    lines.push("💡 한 줄 팁");
    for (const ev of evs) if (ev.pick?.tip) lines.push(`· ${ev.pick.tip}`);
    lines.push("");
    lines.push("일상 대화 한마디, 헛걸음 없는 나들이 — 오픈나들이 AI 에이전트가 검증했어요.");
    lines.push("#오픈나들이 #무장애나들이 #가족나들이");
    return lines.join("\n");
  }

  /* --- 여행지 N곳 목록 (코스가 아닌 목록형 응답) --- */
  #spotsListAnswer(ctx, { spots }) {
    const items = spots?.items || [];
    const wantN = Math.max(2, Math.min(6, ctx.wantN || 3));
    const picked = [];
    const seen = new Set();
    for (let i = 0; picked.length < wantN && i < items.length; i++) {
      const it = items[(ctx.variant + i) % items.length];
      const key = it.contentid || it.title;
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(it);
    }
    const cards = picked.map((s, i) => this.#spotCard(s, i + 1, `여행지 ${i + 1}`));
    const summary = picked.slice(0, 3).map((s) => {
      const b = s.barrier || {};
      const bits = [];
      if (b.rental === "Y") bits.push("휠체어 대여");
      if (b.toilet === "Y") bits.push("장애인 화장실");
      if (b.enterable === "Y") bits.push("휠체어 진입");
      if (b.elevator === "Y") bits.push("엘리베이터");
      if (b.parking === "Y") bits.push("전용 주차장");
      if (s.liveUnverified) bits.push("현장 확인 필요");
      return `${s.title} — ${bits.length ? bits.join(", ") : "무장애 정보 미제공"}`;
    });
    const intro =
      `${ctx.region}에서 부모님·휠체어 기준으로 편하게 가볼 만한 여행지 ${picked.length}곳을 골랐어요. ` +
      "코스가 아니라 목록이에요 — 시간대 슬라이더는 코스 요청에 적용돼요. " +
      "마음에 드는 곳을 말씀해 주시면 점심 식당과 산책로까지 붙인 코스로 바꿔 드릴게요.";

    const invite = [
      `💌 [오픈나들이] ${nextWeekendLabel()} 여행지 목록 (${ctx.region})`,
      "",
      ...picked.map((s, i) => `${i + 1}. ${s.emoji || "📍"} ${s.title} — ${s.addr1}`),
      "",
      "✅ 안심 체크포인트",
      ...summary.map((p) => `· ${p}`),
      "",
      "일상 대화 한마디, 헛걸음 없는 나들이 — 오픈나들이 AI 에이전트가 검증했어요.",
      "#오픈나들이 #무장애나들이 #가족나들이",
    ].join("\n");

    return {
      type: "course",
      intro,
      labels: ctx.labels,
      cards,
      summary,
      invite,
      followups: FOLLOWUP_CHIPS,
      meta: { source: spots?.source || "sample", region: ctx.region, variant: ctx.variant },
    };
  }

  /* --- 식당만 --- */
  #restaurantsOnlyAnswer(ctx, { rests }) {
    const items = rests?.items || [];
    const picks = [];
    for (let i = 0; i < Math.min(3, items.length); i++) {
      picks.push(items[(ctx.variant * 3 + i) % items.length]);
    }
    const cards = picks.map((r, i) => this.#restCard(r, i + 1, i === 0 ? "점심 추천" : `${i + 1}순위`));
    const names = picks.map((p) => p.bizesNm).join(", ");
    const intro =
      `${ctx.region} 인근에서 출입구 턱 없는 식당 ${picks.length}곳을 골랐어요. ` +
      "모든 매장은 입구 단차 없음 기준으로 검증했어요.";
    const summary = picks.map((p) =>
      `${p.bizesNm} — ${p.access.memo || "턱 없는 출입구 확인"}`);
    const invite = [
      `💌 [오픈나들이] ${nextWeekendLabel()} 맛집 나들이 초대장`,
      "",
      `🍚 턱 없는 식당 · ${ctx.region}`,
      ...picks.map((p, i) => `${i + 1}. ${p.bizesNm} (${p.indsSclsNm}) — ${p.rdnmAdr}`),
      "",
      "✅ 안심 체크포인트",
      ...picks.map((p) => `· ${p.bizesNm}: ${p.access.memo || "출입구 턱 없음"}`),
      "",
      "#오픈나들이 #무장애나들이",
    ].join("\n");

    return {
      type: "course",
      intro, labels: ctx.labels, cards, summary, invite,
      followups: FOLLOWUP_CHIPS.filter((c) => c !== "식당만 더 보여줘"),
      meta: { source: rests?.source || "sample", region: ctx.region, variant: ctx.variant },
    };
  }

  /* --- 카드 생성 --- */
  #spotCard(spot, no, phase) {
    /* 실시간 공공데이터 결과: 무장애 여부 미제공 → 미검증 배지로만 표시 (상세 조회로 확보된 운영시간은 표시) */
    if (spot.liveUnverified) {
      const details = [["출처", "공공데이터포털 TourAPI 검색 결과"]];
      if (spot.usageHour) details.unshift(["운영", spot.usageHour]);
      return {
        no, phase, kind: "관광지 · 실시간 검색", kindIcon: "📡",
        name: spot.title, address: spot.addr1 || "주소 확인 필요", emoji: spot.emoji || "📍",
        badges: ["unverified"],
        details,
        tip: spot.tip,
        mapQuery: spot.title,
      };
    }
    const b = spot.barrier || {};
    const badges = [];
    if (b.rental === "Y") badges.push("rental");
    if (b.toilet === "Y") badges.push("toilet");
    if (b.enterable === "Y") badges.push("enterable");
    if (b.elevator === "Y") badges.push("elevator");
    if (b.parking === "Y") badges.push("parking");
    const details = [];
    if (spot.cat3name) details.push(["종목", spot.cat3name]);
    if (spot.usageHour) details.push(["운영", spot.usageHour]);
    if (b.rental === "Y" && spot.rentalInfo) details.push(["대여", spot.rentalInfo]);
    /* 이곳을 고른 이유를 카드에 그대로 보여준다 */
    const why = [];
    if (b.rental === "Y") why.push("휠체어 대여");
    if (b.enterable === "Y") why.push("휠체어 진입로");
    if (b.toilet === "Y") why.push("장애인 화장실");
    if (b.parking === "Y") why.push("전용 주차");
    if (b.elevator === "Y") why.push("엘리베이터");
    details.push(["선정", why.length ? `${why.join(" · ")} 검증` : "무장애 정보 기준 통과"]);
    return {
      no, phase, kind: "관광지", kindIcon: "🏛️",
      name: spot.title, address: spot.addr1, emoji: spot.emoji,
      badges, details, tip: spot.tip,
      mapQuery: spot.title,
    };
  }

  #trailCard(trail, no, phase) {
    const badges = ["slope8"];
    if (trail.handrail === "Y") badges.push("handrail");
    if (trail.restArea === "Y") badges.push("restArea");
    if (trail.accessibleToilet === "Y") badges.push("toilet");
    return {
      no, phase, kind: "무장애 산책로", kindIcon: "🌲",
      name: `${trail.parkName} · ${trail.trailName}`,
      address: `${trail.startPoint} → ${trail.endPoint} (${trail.distance}·${trail.duration})`,
      emoji: trail.emoji,
      badges, badgeNote: { slope8: `최대 경사도 ${trail.maxSlope}%` },
      details: [
        ["경사", `최대 ${trail.maxSlope}% (${trail.slopeRating})`],
        ["바닥", trail.surface],
        ["난간", trail.handrail === "Y" ? "전 구간 안전 난간" : "구간 확인 필요"],
        ["휴식", trail.restArea === "Y" ? "중간 휴식 공간 완비" : "구간 확인 필요"],
        ["화장실", trail.accessibleToilet === "Y" ? "인근 장애인 화장실 완비" : "인근 확인 필요"],
        ["관리", trail.agency || "지자체 무장애 탐방로"],
      ],
      tip: trail.tip,
      mapQuery: trail.parkName,
    };
  }

  #restCard(r, no, phase) {
    /* 실시간 상권정보 결과: 턱 정보 미제공 → 미검증 배지 */
    if (r.liveUnverified) {
      return {
        no, phase, kind: "식당 · 실시간 검색", kindIcon: "📡",
        name: r.bizesNm, address: r.rdnmAdr || "주소 확인 필요", emoji: "🍽️",
        badges: ["unverified"],
        details: [["업종", r.indsSclsNm || "음식점"], ["출처", "공공데이터포털 상권정보 검색 결과"]],
        tip: r.tip,
        mapQuery: r.bizesNm,
      };
    }
    const a = r.access || {};
    const badges = ["stepFree"];
    if (a.toilet) badges.push("toilet");
    if (a.lowTable) badges.push("lowTable");
    if (a.parking) badges.push("parking");
    return {
      no, phase, kind: "식당", kindIcon: "🍚",
      name: r.bizesNm, address: r.rdnmAdr, emoji: "🍽️",
      badges, details: [["업종", `${r.indsMclsNm} · ${r.indsSclsNm}`], ["출입구", a.memo || "턱 없음"]],
      tip: r.tip,
      mapQuery: r.bizesNm,
    };
  }

  /* --- 숙박 카드 --- */
  #hotelCard(ht, no, phase) {
    if (ht.liveUnverified) {
      return {
        no, phase, kind: "숙박 · 실시간 검색", kindIcon: "📡",
        name: ht.title, address: ht.addr1 || "주소 확인 필요", emoji: "🏨",
        badges: ["unverified"],
        details: [["출처", "공공데이터포털 무장애여행 숙박 결과"]],
        tip: ht.tip,
        mapQuery: ht.title,
      };
    }
    const b = ht.barrier || {};
    const badges = [];
    if (b.rental === "Y") badges.push("rental");
    if (b.toilet === "Y") badges.push("toilet");
    if (b.enterable === "Y") badges.push("enterable");
    if (b.elevator === "Y") badges.push("elevator");
    if (b.parking === "Y") badges.push("parking");
    return {
      no, phase, kind: "숙박 · 무장애 객실", kindIcon: "🏨",
      name: ht.title, address: ht.addr1, emoji: ht.emoji || "🏨",
      badges, details: ht.roomInfo ? [["객실", ht.roomInfo]] : [],
      tip: ht.tip,
      mapQuery: ht.title,
    };
  }
}

/* 후속(조건 변경 재질문) 칩 */
export const FOLLOWUP_CHIPS = [
  "다른 코스로 다시 추천해줘",
  "다른 지역 코스 보여줘",
  "비 오는 날 실내 코스로 바꿔줘",
  "식당만 더 보여줘",
];

/* ============================ 유연 스케줄링 ============================ */
/**
 * 일정 설정(아코디언) 검증·기본화. UI가 항상 전달하지만,
 * 직접 호출(테스트 등) 시 기본값: 당일 00:00~24:00 · 식사 포함.
 */
export function normalizeSchedule(raw) {
  const num = (v, def) => (Number.isFinite(Number(v)) ? Number(v) : def);
  const clampR = (r, defS, defE) => {
    let s = Math.max(0, Math.min(24, Math.round(num(r?.s, defS))));
    let e = Math.max(0, Math.min(24, Math.round(num(r?.e, defE))));
    if (e <= s) {
      if (s >= 24) { s = 23; e = 24; }  /* 상한에서 충돌 → 23~24로 보정 */
      else e = s + 1;
    }
    return { s, e };
  };
  return {
    tripType: raw?.tripType === "overnight" ? "overnight" : "day",
    d1: clampR(raw?.d1, 0, 24),
    d2: clampR(raw?.d2, 0, 24),
    meal: raw ? !!raw.meal : true,
    cafe: raw ? !!raw.cafe : true,   /* 제품 기본값: 식사+카페 모두 ON */
    hotel: raw ? !!raw.hotel : false,
  };
}

const ACT_DUR = { act: 2.5, lunch: 1.25, cafe: 1, dinner: 1.5, hotel: 0.5 };
const WINDOW = { lunch: [11, 13], cafe: [13.75, 16], dinner: [17, 18.75] };

/**
 * 일정 설정 → 이벤트 배열 (유연한 스케줄링).
 * 활동을 시간대 칸에 고정하지 않고, 남은 시간과 끼니·카페 시간 창에 맞춰 배치한다.
 * pref.trailOk: 발화 테마상 산책로 배치 가능(바다·공원·산책, 우천 아님) 여부
 * 슬라이더로 지정한 시간 범위(d1·d2)는 항상 그대로 존중한다.
 */
export function buildSchedule(sched, pref = {}) {
  const days = sched.tripType === "overnight"
    ? [{ day: 1, ...sched.d1 }, { day: 2, ...sched.d2 }]
    : [{ day: 1, ...sched.d1 }];
  const events = [];
  for (const d of days) events.push(...scheduleDayRange(d, sched, pref));
  return events;
}

function scheduleDayRange({ day, s, e }, sched, pref) {
  const isD2 = day === 2;
  /* 슬라이더로 지정한 시간 범위는 그대로 존중 — 00시 시작이면 00시부터 배치하고, 그 어떤 키워드(부모님 동행 등)로도 미루지 않는다 */
  const sUse = s;
  const lunch = sched.meal && sUse < 14 && e > 11;
  const dinner = sched.meal && !isD2 && e >= 17;
  const cafe = sched.cafe && sUse < 17 && e > 13;

  /* 끼니·카페 시간 창을 앵커로 세우고, 앵커 사이 빈 구간에 활동을 균등 분배해 채운다 */
  const anchors = [lunch && "lunch", cafe && "cafe", dinner && "dinner"].filter(Boolean)
    .sort((a, b) => WINDOW[a][0] - WINDOW[b][0]);
  const hotelGap = !isD2 && sched.tripType === "overnight" && sched.hotel ? 1.5 : 0;
  const dayEnd = e - hotelGap;   /* 숙소 체크인 1.5시간은 하루 끝에 비워 둠 */

  const seq = [];
  let cursor = sUse;
  for (const kind of anchors) {
    const [lo, hi] = WINDOW[kind];
    let start = Math.max(cursor, lo);
    if (start > hi) start = hi;      /* 창이 밀렸으면 창 끝으로 */
    if (start < cursor) break;       /* 끼니 시간이 이미 지났으면 이후 끼니도 생략 */
    const end = Math.min(e, start + ACT_DUR[kind]);
    if (end - start < 0.25) break;
    fillWithActs(seq, cursor, start, day);
    seq.push({ kind, day, start, end });
    cursor = end;
  }
  fillWithActs(seq, cursor, dayEnd, day);
  if (hotelGap) seq.push({ kind: "hotel", day, start: e - 1.5, end: e });

  /* 산책로 교차: 날 전체 활동 순서 기준 (관광지→산책로→관광지…) */
  let ai = 0;
  for (const ev of seq) {
    if (ev.kind !== "act") continue;
    ev.act = pref.trailOk && ai % 3 === 1 ? "trail" : "spot";
    ai++;
  }
  return seq;
}

/* [from, to] 빈 구간을 활동으로 채움 — 활동 1개 2.5시간 기준 균등 분할(0.75~3시간) */
function fillWithActs(seq, from, to, day) {
  const len = to - from;
  if (len < 0.75) return;   /* 너무 짧은 틈은 비워 둔다 */
  let n = Math.max(1, Math.round(len / 2.5));
  if (len / n > 3) n += 1;
  const dur = Math.max(0.75, Math.round((len / n) * 4) / 4);
  for (let i = 0; i < n; i++) {
    seq.push({
      kind: "act", day,
      start: from + i * dur,
      end: i === n - 1 ? to : from + (i + 1) * dur,   /* 마지막 활동이 구간 끝까지 채움 */
    });
  }
}

const hh = (h) => `${String(h).padStart(2, "0")}:00`;
const fmtT = (x) => {
  const h = Math.floor(x);
  const m = Math.round((x - h) * 4) / 4 * 60;   /* 15분 단위 반올림 */
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
const KIND_LABEL = { lunch: "점심", cafe: "카페", dinner: "저녁", hotel: "체크인" };

/**
 * 코스 동선 요약 행 — 초대장 텍스트·하단 요약 리스트·지도 핀이 이 데이터 하나를 공유한다.
 * barrier: 무장애 핵심 정보(경사도·편의시설 등), query/queryAlt: 지오코딩용 검색어,
 * lat/lng: 실시간 데이터가 제공하는 좌표(없으면 null — UI에서 지오코딩으로 보완)
 */
function routeRows(evs, overnight) {
  const rows = [];
  for (const ev of evs) {
    const p = ev.pick;
    if (!p) continue;
    const row = {
      no: rows.length + 1,
      day: ev.day,
      time: fmtT(ev.start),
      phase: schedulePhase(ev, overnight),
      name: "", address: "", emoji: "",
      barrier: [], query: "", queryAlt: "",
      lat: null, lng: null,
    };
    if (ev.kind === "act" && ev.act === "trail") {
      row.name = `${p.parkName} · ${p.trailName}`;
      row.address = `${p.startPoint} → ${p.endPoint} (${p.distance}·${p.duration})`;
      row.emoji = p.emoji || "🌲";
      row.barrier.push(`최대 경사도 ${p.maxSlope}%`);
      if (p.handrail === "Y") row.barrier.push("안전 난간");
      if (p.restArea === "Y") row.barrier.push("휴식 공간");
      if (p.accessibleToilet === "Y") row.barrier.push("장애인 화장실");
      row.query = p.startPoint || p.parkName;
      row.queryAlt = p.parkName;
    } else if (ev.kind === "act") {
      const b = p.barrier || {};
      row.name = p.title;
      row.address = p.addr1 || "";
      row.emoji = p.emoji || "📍";
      if (b.rental === "Y") row.barrier.push("휠체어 대여");
      if (b.toilet === "Y") row.barrier.push("장애인 화장실");
      if (b.enterable === "Y") row.barrier.push("휠체어 진입");
      if (b.elevator === "Y") row.barrier.push("엘리베이터");
      if (b.parking === "Y") row.barrier.push("전용 주차");
      if (p.usageHour) row.barrier.push(`운영 ${p.usageHour}`);
      row.query = p.addr1 ? `${p.title} ${p.addr1}` : p.title;
      row.queryAlt = p.title;
      if (p.yswftm && p.xswftm) { row.lat = +p.yswftm; row.lng = +p.xswftm; }
    } else if (ev.kind === "hotel") {
      const b = p.barrier || {};
      row.name = p.title;
      row.address = p.addr1 || "";
      row.emoji = "🏨";
      if (p.roomInfo) row.barrier.push(p.roomInfo);
      if (b.elevator === "Y") row.barrier.push("엘리베이터");
      if (b.toilet === "Y") row.barrier.push("장애인 화장실");
      if (b.parking === "Y") row.barrier.push("전용 주차");
      row.query = p.addr1 ? `${p.title} ${p.addr1}` : p.title;
      row.queryAlt = p.title;
    } else {
      const a = p.access || {};
      row.name = p.bizesNm;
      row.address = p.rdnmAdr || "";
      row.emoji = ev.kind === "cafe" ? "☕" : "🍚";
      if (p.liveUnverified) row.barrier.push("턱 유무 전화 확인 필요");
      else row.barrier.push(a.memo || "출입구 턱 없음");
      if (a.toilet) row.barrier.push("장애인 화장실");
      if (a.lowTable) row.barrier.push("저상 테이블");
      row.query = p.rdnmAdr || p.bizesNm;
      row.queryAlt = `${p.bizesNm} ${p.rdnmAdr || ""}`.trim();
    }
    rows.push(row);
  }
  return rows;
}

/* usageHour 문자열로 이벤트 시간대 운영 여부 판정 — "연중무휴"/"24시간"·미제공은 제한 없음 */
function spotOpenAt(usageHour, start, end) {
  const u = String(usageHour || "");
  if (/연중무휴|24시간/.test(u)) return true;
  const m = u.match(/(\d{1,2}):(\d{2})\s*[~–-]\s*(\d{1,2}):(\d{2})/);
  if (!m) return true;
  const open = +m[1] + +m[2] / 60;
  const close = +m[3] + +m[4] / 60;
  return start >= open - 0.01 && end <= close + 0.01;
}

/* 운영시간이 '명시된' 장소인지 — 연중무휴·24시간 또는 HH:MM~HH:MM 범위 */
function hoursKnown(usageHour) {
  const u = String(usageHour || "");
  return /연중무휴|24시간/.test(u) || /(\d{1,2}):(\d{2})\s*[~–-]\s*(\d{1,2}):(\d{2})/.test(u);
}

/** 이벤트 → 카드 phase 라벨 ("1일차 00:00 새벽" / "09:00 오전" / "13:30 오후" / "21:15 야간") */
function schedulePhase(ev, overnight) {
  const dayTag = overnight ? (ev.day === 1 ? "1일차 " : "2일차 ") : "";
  const label = ev.kind === "act"
    ? (ev.act === "trail" ? "산책" : (ev.start < 6 ? "새벽" : ev.start < 12 ? "오전" : ev.start < 18 ? "오후" : "야간"))
    : KIND_LABEL[ev.kind];
  return `${dayTag}${fmtT(ev.start)} ${label}`;
}

/* 인사/안내 응답 */
function greetingAnswer() {
  return {
    type: "greeting",
    intro:
      "안녕하세요! 저는 공공 무장애 데이터 3종(한국관광공사 열린관광지 · 국립공원공단·지자체 무장애 탐방로 · 소상공인 상권정보)을 " +
      "자동으로 조합해, 헛걸음 없는 나들이 코스를 만들어 드리는 오픈나들이 AI 에이전트예요.\n\n" +
      "이렇게 말씀해 보세요.\n" +
      "· \"주말에 휠체어 타고 산책할 만한 부산 근교 나들이 장소 찾아줘\"\n" +
      "· \"부모님 모시고 가기 좋은 바다 데크길 코스\"\n" +
      "· \"비 오는 날 실내로 편하게 가고 싶어요\"\n\n" +
      "지역·테마·동행 상황만 담으면, 경사도 8% 이하 산책로와 턱 없는 식당까지 한 번에 검증해 드릴게요.",
    cards: [],
    summary: [],
    followups: STARTER_CHIPS,
  };
}

export const STARTER_CHIPS = [
  "부모님 모시고 가기 좋은 부산 바다 데크길 코스",
  "비 오는 날 휠체어로 편한 실내 나들이",
  "평지 위주 맛집+산책 반나절 코스",
  "제주에서 휠체어로 가볼 만한 곳 알려줘",
];

/** 이번 주말(토요일) 날짜 라벨 */
function nextWeekendLabel() {
  const d = new Date();
  const add = (6 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${dow})`;
}

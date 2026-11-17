/**
 * main.js — Application entry point / 애플리케이션 진입점
 *
 * Execution order / 실행 순서:
 * 1. Import modules / 모듈 임포트
 * 2. Load settings from localStorage / localStorage에서 설정 로드
 * 3. Create OutingAgent instance / OutingAgent 인스턴스 생성
 * 4. Initialize UI with agent and settings change handler / UI 초기화 (에이전트와 설정 변경 핸들러 전달)
 */

import { OutingAgent } from "./agent.js";
import { loadSettings } from "./tools.js";
import { init } from "./ui.js";

// 1) Load settings (API keys, live mode flag) / 1) 설정 로드 (API 키, 실시간 모드 플래그)
//    Settings are stored in browser localStorage, never hardcoded / 설정은 브라우저 localStorage에 저장, 하드코딩 금지
const settings = loadSettings();

// 2) Create agent instance with settings / 2) 설정과 함께 에이전트 인스턴스 생성
const agent = new OutingAgent(settings);

// 3) Initialize UI / 3) UI 초기화
//    - agentInstance: passes agent to UI for handling user input / 사용자 입력을 처리하기 위해 UI에 에이전트 전달
//    - onSettingsChange: callback when user saves API keys in settings modal / 사용자가 설정 모달에서 API 키를 저장할 때 호출되는 콜백
init({
  agentInstance: agent,
  onSettingsChange: (s) => agent.setSettings(s),
});

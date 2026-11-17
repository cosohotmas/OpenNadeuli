/**
 * main.js — 애플리케이션 진입점
 */

import { OutingAgent } from "./agent.js";
import { loadSettings } from "./tools.js";
import { init } from "./ui.js";

const agent = new OutingAgent(loadSettings());

init({
  agentInstance: agent,
  onSettingsChange: (s) => agent.setSettings(s),
});

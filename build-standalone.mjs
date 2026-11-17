#!/usr/bin/env node
/**
 * build-standalone.mjs — 단일 파일 앱 생성
 *
 * index.template.html(개발용: ES 모듈 참조)을 읽어
 * CSS·JS를 전부 인라인한 단일 파일을 **index.html**과 **standalone.html**로 생성한다.
 *
 * - index.html   : 메인 파일. 터널 스냅샷·file:// 직접 열기·정적 서버 어디서든 동작
 *                  (모듈 스크립트를 외부 경로로 참조하지 않으므로 미리보기 환경에서도 JS가 산다)
 * - standalone.html : 동일 내용의 사본 (이름으로 구분해 열기 편하게)
 * - js/*.js      : 개발용 소스 모듈. 수정 후 이 스크립트로 재생성: node build-standalone.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(root, p), "utf8");

/* 모듈 로딩 순서(의존성 기준) */
const ORDER = ["js/data.js", "js/nlu.js", "js/tools.js", "js/agent.js", "js/ui.js", "js/main.js"];

function toClassic(src, file) {
  // import 문 제거 (본 프로젝트는 모두 한 줄 import)
  src = src.replace(/^import [^\n]*;\s*$/gm, "");
  // export 키워드 제거 (export const/class/function/async function/let/var)
  src = src.replace(/^export (?=(?:const|class|function|async function|let|var)\b)/gm, "");
  if (/^export /m.test(src)) throw new Error(`처리되지 않은 export가 남아 있습니다: ${file}`);
  return src;
}

let bundle = ORDER.map((p) => {
  const src = toClassic(read(p), p);
  return `/* ====== ${p} ====== */\n${src}`;
}).join("\n\n");

/* 실측 스냅샷(js/snapshot.js)이 있으면 단일 파일에 주입 — 키는 포함되지 않은 데이터 파일 */
try {
  const snap = read("js/snapshot.js").trim();
  if (snap) bundle = `/* ====== js/snapshot.js (실측 데이터, 키 미포함) ====== */\n${snap}\n\n${bundle}`;
} catch (_) { /* 스냅샷 없음 — 내장 샘플 사용 */ }

/* 프로젝트 zip 내장 — 앱 헤더의 '📦 zip 받기' 버튼으로 다운로드 제공 (외부 업로드 불가 환경 대비) */
try {
  const zipBuf = readFileSync(join(root, "..", "opennatri-project.zip"));
  if (zipBuf.length > 1000) {
    bundle = `/* ====== 내장 프로젝트 zip (헤더 '📦 zip 받기' 버튼용) ====== */\nwindow.__ZIP_B64__ = ${JSON.stringify(zipBuf.toString("base64"))};\n\n${bundle}`;
    console.log(`프로젝트 zip 내장: ${(zipBuf.length / 1024).toFixed(1)} KB`);
  }
} catch (_) { /* zip 없음 — 버튼 미표시 */ }

// 번들 전체를 한 번 더 파싱해 문법 오류를 조기에 잡는다 (실행은 안 함)
new Function(bundle);

let html = read("index.template.html");

/* CSS 인라인 */
const css = read("styles.css");
html = html.replace(
  /<link rel="stylesheet" href="styles\.css" \/>/,
  `<style>\n${css}\n</style>`
);

/* JS 인라인 (클래식 스크립트) */
html = html.replace(
  /<script type="module" src="js\/main\.js"><\/script>/,
  `<script>\n/* 단일 파일 빌드: ES 모듈 번들을 합친 스크립트 (${new Date().toISOString()}) */\n${bundle}\n</script>`
);

if (html.includes('type="module"') || html.includes('href="styles.css"') || html.includes('src="js/main.js"')) {
  throw new Error("치환 실패: index.template.html 구조를 확인하세요.");
}

writeFileSync(join(root, "index.html"), html, "utf8");
writeFileSync(join(root, "standalone.html"), html, "utf8");
console.log(`index.html + standalone.html 생성 완료 (${(html.length / 1024).toFixed(1)} KB each)`);

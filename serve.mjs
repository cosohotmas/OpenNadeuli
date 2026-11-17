#!/usr/bin/env node
/**
 * serve.mjs — 의존성 없는 정적 서버 (python http.server 대체)
 * - 듀얼스택: IPv4(127.0.0.1)와 IPv6(::1) 모두 수신 → 미리보기 브라우저 호환
 * - Cache-Control: no-store → 코드 수정 후 캐시로 인한 '옛 화면' 방지
 *
 * 사용:  node serve.mjs [포트=8899]
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)));
const port = Number(process.argv[2] || 8899);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");

    /* ---- 공공데이터포털 OpenAPI 프록시 (브라우저 CORS 우회) ----
       사용: /proxy/openapi?path=B551011/KorService1/searchKeyword1&serviceKey=...&...
       - path 파라미터는 apis.data.go.kr 내부 경로만 허용(화이트리스트) → 오픈 프록시 방지
       - 서버 사이드에서 fetch 후 응답을 그대로 중계 */
    if (url.pathname === "/proxy/openapi") {
      const path = url.searchParams.get("path") || "";
      if (!/^B\d+(\/[A-Za-z0-9_.\-]+){1,5}$/.test(path)) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("허용되지 않는 API 경로입니다. (apis.data.go.kr 경로만 허용)");
      }
      const relay = new URLSearchParams();
      for (const [k, v] of url.searchParams) if (k !== "path") relay.append(k, v);
      const target = `https://apis.data.go.kr/${path}?${relay.toString()}`;
      try {
        const upstream = await fetch(target, { headers: { "User-Agent": "OpenNatri/1.0" } });
        res.writeHead(upstream.status, {
          "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(Buffer.from(await upstream.arrayBuffer()));
      } catch (e) {
        res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(`공공데이터포털 요청 실패: ${e.message}`);
      }
      return;
    }

    let p = decodeURIComponent(url.pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = normalize(join(root, p));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end("Forbidden"); }
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME[extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found — 오픈나들이 서버에서 찾을 수 없는 경로예요.");
  }
});

server.listen(port, () => {
  console.log(`🦽 오픈나들이 서버 기동: http://localhost:${port}  (IPv4+IPv6)`);
});

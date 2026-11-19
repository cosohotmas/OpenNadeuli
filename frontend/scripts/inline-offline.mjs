import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve('dist-offline');
let html = await readFile(resolve(directory, 'elice-final.html'), 'utf8');
const styleTag = /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="\/?([^"]+)"[^>]*>/g;
for (const match of html.matchAll(styleTag)) {
  const css = await readFile(resolve(directory, match[1]), 'utf8');
  html = html.replace(match[0], () => `<style>${css}</style>`);
}
const faviconTypes = { 'favicon.ico': 'image/x-icon', 'favicon.svg': 'image/svg+xml', 'apple-touch-icon.png': 'image/png' };
for (const [filename, type] of Object.entries(faviconTypes)) {
  const bytes = await readFile(resolve(directory, filename));
  html = html.replace(`href="/${filename}"`, `href="data:${type};base64,${bytes.toString('base64')}"`);
}
const moduleTag = /<script\b[^>]*\btype="module"[^>]*\bsrc="\/?([^"]+)"[^>]*><\/script>/;
const entry = html.match(moduleTag);
if (!entry) throw new Error('Static backup script was not emitted');
const script = await readFile(resolve(directory, entry[1]), 'utf8');
// Escape the HTML script end marker without changing the JavaScript string value.
const inline = script.replace(/<\/script/gi, '<\\/script');
await writeFile(resolve(directory, 'elice-offline.html'), html.replace(moduleTag, () => `<script type="module">\n${inline}\n</script>`));

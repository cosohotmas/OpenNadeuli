import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve('dist-offline');
const html = await readFile(resolve(directory, 'elice-final.html'), 'utf8');
const moduleTag = /<script\b[^>]*\btype="module"[^>]*\bsrc="\/?([^"]+)"[^>]*><\/script>/;
const entry = html.match(moduleTag);
if (!entry) throw new Error('Static backup script was not emitted');
const script = await readFile(resolve(directory, entry[1]), 'utf8');
// Escape the HTML script end marker without changing the JavaScript string value.
const inline = script.replace(/<\/script/gi, '<\\/script');
await writeFile(resolve(directory, 'elice-offline.html'), html.replace(moduleTag, () => `<script type="module">\n${inline}\n</script>`));

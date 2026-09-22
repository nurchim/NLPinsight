import { copyFile, cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pdfjsRoot = resolve(root, 'node_modules/pdfjs-dist');
const targetRoot = resolve(root, 'public/pdfjs');

await mkdir(targetRoot, { recursive: true });
await copyFile(resolve(pdfjsRoot, 'build/pdf.worker.min.mjs'), resolve(targetRoot, 'pdf.worker.min.mjs'));

for (const folder of ['cmaps', 'standard_fonts', 'wasm']) {
  try {
    await cp(resolve(pdfjsRoot, folder), resolve(targetRoot, folder), { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

console.log('Aset PDF.js siap di public/pdfjs/.');

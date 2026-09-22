import { copyFile, cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pdfjsRoot = resolve(root, 'node_modules/pdfjs-dist');
const targetRoot = resolve(root, 'public/pdfjs');

// Penting: library di aplikasi memakai pdfjs-dist/legacy/build/pdf.mjs.
// Worker wajib berasal dari build dan versi yang sama agar kompatibel.
const workerSource = resolve(pdfjsRoot, 'legacy/build/pdf.worker.min.mjs');
const workerTarget = resolve(targetRoot, 'pdf.worker.legacy.min.mjs');

await mkdir(targetRoot, { recursive: true });
await copyFile(workerSource, workerTarget);

for (const folder of ['cmaps', 'standard_fonts', 'wasm']) {
  try {
    await cp(resolve(pdfjsRoot, folder), resolve(targetRoot, folder), { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

console.log('Aset PDF.js legacy siap di public/pdfjs/.');

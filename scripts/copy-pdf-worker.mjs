import { copyFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pdfjsRoot = resolve(root, 'node_modules/pdfjs-dist');
const targetRoot = resolve(root, 'public/pdfjs');
const workerSource = resolve(pdfjsRoot, 'build/pdf.worker.min.mjs');
const workerTarget = resolve(targetRoot, 'pdf.worker.min.mjs');
const compatWorkerTarget = resolve(targetRoot, 'pdf.worker.compat.mjs');

await mkdir(targetRoot, { recursive: true });
await copyFile(workerSource, workerTarget);

// PDF.js 6 memanggil Uint8Array.prototype.toHex(). Sebagian browser lama dan
// embedded webview belum memilikinya. Karena Web Worker memiliki global scope
// sendiri, polyfill harus dipasang di dalam worker sebelum kode PDF.js berjalan.
const workerCode = await readFile(workerSource, 'utf8');
const compatibilityPrelude = `
/* Text2Insight: compatibility layer for PDF.js 6 */
if (typeof Uint8Array !== "undefined" && typeof Uint8Array.prototype.toHex !== "function") {
  Object.defineProperty(Uint8Array.prototype, "toHex", {
    configurable: true,
    writable: true,
    enumerable: false,
    value: function toHex() {
      let output = "";
      for (let i = 0; i < this.length; i += 1) {
        output += this[i].toString(16).padStart(2, "0");
      }
      return output;
    }
  });
}
if (typeof Promise !== "undefined" && typeof Promise.withResolvers !== "function") {
  Promise.withResolvers = function withResolvers() {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}
`;
await writeFile(compatWorkerTarget, `${compatibilityPrelude}\n${workerCode}`, 'utf8');

for (const folder of ['cmaps', 'standard_fonts', 'wasm']) {
  try {
    await cp(resolve(pdfjsRoot, folder), resolve(targetRoot, folder), { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

console.log('Aset PDF.js dan worker kompatibilitas siap di public/pdfjs/.');

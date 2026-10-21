// Copies the report-reading libraries from node_modules into vendor/, which the
// server publishes at /vendor. They are committed like js/bundle.js, because the
// host installs production dependencies only.
// Run after updating pdfjs-dist, tesseract.js or @tesseract.js-data/eng:
//   node scripts/copy-vendor.mjs
import { mkdirSync, copyFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = join(root, 'node_modules');
const out = join(root, 'vendor');

const files = [
  ['pdfjs-dist/build/pdf.min.mjs', 'pdfjs/pdf.min.mjs'],
  ['pdfjs-dist/build/pdf.worker.min.mjs', 'pdfjs/pdf.worker.min.mjs'],
  ['pdfjs-dist/LICENSE', 'pdfjs/LICENSE'],
  ['tesseract.js/dist/tesseract.min.js', 'tesseract/tesseract.min.js'],
  ['tesseract.js/dist/worker.min.js', 'tesseract/worker.min.js'],
  ['tesseract.js/LICENSE.md', 'tesseract/LICENSE.md'],
  // Tesseract picks one of these by the browser's WebAssembly support (LSTM engine only).
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract/core/tesseract-core-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract/core/tesseract-core-simd-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract/core/tesseract-core-relaxedsimd-lstm.wasm.js'],
  // English model, integer "best" variant: accurate and about 3 MB.
  ['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'tesseract/lang/eng.traineddata.gz']
];

rmSync(out, { recursive: true, force: true });
let total = 0;
for (const [from, to] of files) {
  const src = join(nm, from);
  const dest = join(out, to);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  total += statSync(dest).size;
  console.log(`${to}  ${(statSync(dest).size / 1024).toFixed(0)} KB`);
}
console.log(`vendor/: ${(total / 1024 / 1024).toFixed(1)} MB`);

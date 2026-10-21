/**
 * reportReader.js
 * Turns an uploaded report (PDF or photo) into text, in the browser, so the
 * report never leaves the device for this step.
 *
 * Digital PDFs carry their text, which pdf.js reads exactly. Scanned PDFs and
 * photos have none, so they go through Tesseract OCR. Both libraries are
 * served from this site (/vendor, see scripts/copy-vendor.mjs) and loaded only
 * when someone asks for a report to be read.
 */

const PDFJS_URL = '/vendor/pdfjs/pdf.min.mjs';
const PDFJS_WORKER_URL = '/vendor/pdfjs/pdf.worker.min.mjs';
const TESSERACT_URL = '/vendor/tesseract/tesseract.min.js';
const TESSERACT_PATHS = {
  workerPath: '/vendor/tesseract/worker.min.js',
  corePath: '/vendor/tesseract/core',
  langPath: '/vendor/tesseract/lang',
  gzip: true
};

/** Pages read from one PDF; lab reports are short, and OCR takes seconds a page. */
const MAX_PAGES = 6;

/** Fewer characters than this on a PDF page means it is a scan with no text to read. */
const MIN_TEXT_PER_PAGE = 60;

/** Longest a report may take to read: a slow phone, several scanned pages. */
const READ_TIME_LIMIT_MS = 3 * 60 * 1000;

let pdfjsPromise = null;
let tesseractPromise = null;

function loadPdfJs() {
  if (!pdfjsPromise) {
    const url = PDFJS_URL;
    pdfjsPromise = import(/* @vite-ignore */ url).then(pdfjs => {
      pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return pdfjs;
    }).catch(err => { pdfjsPromise = null; throw err; });
  }
  return pdfjsPromise;
}

function loadTesseract() {
  if (!tesseractPromise) {
    tesseractPromise = new Promise((resolve, reject) => {
      if (window.Tesseract) return resolve(window.Tesseract);
      const script = document.createElement('script');
      script.src = TESSERACT_URL;
      script.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error('OCR library did not load')));
      script.onerror = () => reject(new Error('OCR library could not be downloaded'));
      document.head.appendChild(script);
    }).catch(err => { tesseractPromise = null; throw err; });
  }
  return tesseractPromise;
}

/**
 * A PDF page's text as printed lines. pdf.js gives positioned fragments; those
 * at the same height form a line, read left to right, and a wide horizontal
 * gap becomes a run of spaces so table columns stay apart.
 */
export function pageLines(items) {
  const parts = items
    .filter(it => it.str && it.str.trim())
    .map(it => ({ text: it.str, x: it.transform[4], y: it.transform[5], w: it.width || 0, h: Math.abs(it.height || it.transform[3]) || 8 }));
  parts.sort((a, b) => b.y - a.y || a.x - b.x);

  const lines = [];
  parts.forEach(p => {
    const line = lines.find(l => Math.abs(l.y - p.y) <= Math.max(2, Math.min(l.h, p.h) * 0.5));
    if (line) line.parts.push(p);
    else lines.push({ y: p.y, h: p.h, parts: [p] });
  });

  return lines
    .sort((a, b) => b.y - a.y)
    .map(line => {
      const sorted = line.parts.sort((a, b) => a.x - b.x);
      let text = '';
      let end = null;
      sorted.forEach(p => {
        if (end !== null) {
          const gap = p.x - end;
          if (gap > p.h * 1.2) text += '   ';
          else if (gap > p.h * 0.15 && !/\s$/.test(text) && !/^\s/.test(p.text)) text += ' ';
        }
        text += p.text;
        end = p.x + p.w;
      });
      return text.replace(/\s+$/, '');
    })
    .join('\n');
}

/**
 * Numbers Tesseract recognised with less confidence than this are not used:
 * a misread number (a lost decimal point, a 3 read as 8) is worse than a blank
 * the person fills in. Set from tests on photographed reports.
 */
export const MIN_NUMBER_CONFIDENCE = 85;

/** Photos less sharp than this are not read (see photoSharpness). */
export const MIN_SHARPNESS = 47;

/**
 * Long side of the image handed to OCR. Enlarging phone photos to about this
 * size gave the most correct readings in testing; it also stays under the
 * 16.7-megapixel canvas limit of phone browsers.
 */
const OCR_LONG_SIDE = 4400;

/**
 * OCR output as printed lines. Words come with their position and confidence:
 * a wide gap between words becomes a run of spaces, keeping table columns
 * apart, and a number below the confidence floor becomes "?", which the value
 * finder treats as unreadable.
 */
export function ocrLines(data, minConfidence = MIN_NUMBER_CONFIDENCE) {
  const lines = [];
  (data.blocks || []).forEach(block => (block.paragraphs || []).forEach(paragraph => (paragraph.lines || []).forEach(line => {
    const words = (line.words || []).filter(w => w.text && w.text.trim());
    if (!words.length) return;
    const heights = words.map(w => w.bbox.y1 - w.bbox.y0).sort((a, b) => a - b);
    const height = heights[Math.floor(heights.length / 2)] || 10;
    let text = '';
    let end = null;
    words.forEach(w => {
      const word = /\d/.test(w.text) && w.confidence < minConfidence ? '?' : w.text;
      if (end !== null) text += w.bbox.x0 - end > height * 1.2 ? '   ' : ' ';
      text += word;
      end = w.bbox.x1;
    });
    lines.push(text);
  })));
  return lines.join('\n');
}

/**
 * How sharp a photo is: the strength of the strongest edges (top 1% of the
 * Laplacian) on a copy 1200 px wide. Text in focus has hard edges; a shaken or
 * out-of-focus photo has soft ones, and OCR on it misreads digits. Below
 * MIN_SHARPNESS the photo is not read (calibrated on test photos).
 * @param {CanvasImageSource & {width: number, height: number}} source
 */
export function photoSharpness(source) {
  const width = 1200;
  const height = Math.max(1, Math.round(source.height * width / source.width));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  const histogram = new Uint32Array(1021);
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = Math.abs(gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width] - 4 * gray[i]);
      histogram[Math.min(1020, Math.round(lap))]++;
      count++;
    }
  }
  // Mean of the strongest 1% of edge responses.
  let need = Math.max(1, Math.round(count * 0.01));
  let sum = 0;
  let taken = 0;
  for (let v = 1020; v >= 0 && taken < need; v--) {
    const n = Math.min(histogram[v], need - taken);
    sum += n * v;
    taken += n;
  }
  return taken ? sum / taken : 0;
}

/** A canvas holding the image, enlarged when small and in greyscale: both help OCR. */
function preparedImage(bitmap) {
  const scale = OCR_LONG_SIDE / Math.max(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.filter = 'grayscale(1) contrast(1.15)';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** The error for a photo too blurred to read; the caller asks for a sharper one. */
function tooBlurry() {
  const err = new Error('The photo is too blurry to read reliably');
  err.code = 'blurry';
  return err;
}

async function createOcrWorker(onProgress) {
  const Tesseract = await loadTesseract();
  const worker = await Tesseract.createWorker('eng', 1, {
    ...TESSERACT_PATHS,
    logger: m => {
      if (m && m.status === 'recognizing text' && typeof m.progress === 'number') onProgress({ stage: 'ocr', progress: m.progress });
      else if (m && m.status) onProgress({ stage: 'loading', progress: m.progress || 0 });
    }
  });
  return worker;
}

async function ocrImages(images, onProgress) {
  const worker = await createOcrWorker(onProgress);
  try {
    const pages = [];
    for (let i = 0; i < images.length; i++) {
      onProgress({ stage: 'ocr', page: i + 1, pages: images.length, progress: 0 });
      const bitmap = images[i] instanceof HTMLCanvasElement ? images[i] : await createImageBitmap(images[i]);
      if (photoSharpness(bitmap) < MIN_SHARPNESS) throw tooBlurry();
      const { data } = await worker.recognize(preparedImage(bitmap), {}, { text: true, blocks: true });
      pages.push(ocrLines(data));
    }
    return pages.join('\n');
  } finally {
    await worker.terminate().catch(() => {});
  }
}

async function readPdf(file, onProgress) {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const pdf = await task.promise;
  try {
    const count = Math.min(pdf.numPages, MAX_PAGES);
    const texts = [];
    const scanned = [];
    for (let n = 1; n <= count; n++) {
      onProgress({ stage: 'pdf', page: n, pages: count });
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const text = pageLines(content.items);
      if (text.replace(/\s/g, '').length >= MIN_TEXT_PER_PAGE) {
        texts.push(text);
      } else {
        const viewport = page.getViewport({ scale: 2.5 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        // "print" draws without waiting for animation frames, which stop while the tab is hidden.
        await page.render({ canvasContext: canvas.getContext('2d'), canvas, viewport, intent: 'print' }).promise;
        scanned.push(canvas);
      }
    }
    if (scanned.length) texts.push(await ocrImages(scanned, onProgress));
    return { text: texts.join('\n'), source: scanned.length ? (texts.length > 1 ? 'pdf+ocr' : 'ocr') : 'pdf' };
  } finally {
    Promise.resolve().then(() => task.destroy()).catch(() => {});
  }
}

/**
 * Read a report's text.
 * @param {File} file PDF, JPG or PNG
 * @param {(p: {stage: string, page?: number, pages?: number, progress?: number}) => void} [onProgress]
 * @returns {Promise<{text: string, source: 'pdf'|'ocr'|'pdf+ocr'}>}
 */
export async function readReportText(file, onProgress = () => {}) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  const isImage = /^image\//.test(file.type) || /\.(jpe?g|png)$/i.test(file.name || '');
  if (!isPdf && !isImage) throw new Error('Only PDF, JPG and PNG reports can be read.');
  const reading = isPdf
    ? readPdf(file, onProgress)
    : ocrImages([file], onProgress).then(text => ({ text, source: 'ocr' }));
  // Never leave the person waiting: past this, the report is saved without values.
  let timer;
  const limit = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Reading the report took too long')), READ_TIME_LIMIT_MS); });
  try {
    return await Promise.race([reading, limit]);
  } finally {
    clearTimeout(timer);
  }
}

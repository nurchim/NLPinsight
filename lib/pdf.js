const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_PDF_PAGES = 120;
const MAX_SEGMENTS = 800;

function cleanPageText(text = '') {
  return text
    .replace(/\u00ad/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitLongText(text, targetLength = 420) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const sentences = normalized.match(/[^.!?]+(?:[.!?]+|$)/g)?.map(s => s.trim()).filter(Boolean) || [normalized];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
      continue;
    }
    if ((current.length + sentence.length + 1) <= targetLength) {
      current += ` ${sentence}`;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }
  if (current) chunks.push(current);

  return chunks.flatMap(chunk => {
    if (chunk.length <= targetLength * 2) return [chunk];
    const words = chunk.split(/\s+/);
    const out = [];
    let part = '';
    for (const word of words) {
      if (part && (part.length + word.length + 1) > targetLength) {
        out.push(part);
        part = word;
      } else {
        part = part ? `${part} ${word}` : word;
      }
    }
    if (part) out.push(part);
    return out;
  });
}

function pageToSegments(pageText) {
  const clean = cleanPageText(pageText);
  if (!clean) return [];

  const paragraphs = clean
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(p => p.length >= 25);

  const base = paragraphs.length > 1 ? paragraphs : [clean.replace(/\n/g, ' ')];
  return base.flatMap(p => splitLongText(p));
}

export async function extractPdfTexts(file) {
  if (!file) throw new Error('Berkas PDF tidak ditemukan.');
  if (file.size > MAX_PDF_BYTES) {
    throw new Error('Ukuran PDF melebihi 20 MB. Gunakan dokumen yang lebih kecil agar analisis tetap ringan di peramban.');
  }

  const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data,
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    wasmUrl: '/pdfjs/wasm/'
  });
  const document = await loadingTask.promise;

  try {
    if (document.numPages > MAX_PDF_PAGES) {
      throw new Error(`PDF memiliki ${document.numPages} halaman. Batas aplikasi adalah ${MAX_PDF_PAGES} halaman per analisis.`);
    }

    let pagesWithText = 0;
    let characterCount = 0;
    const texts = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = '';

      for (const item of content.items) {
        if (!item || typeof item.str !== 'string') continue;
        pageText += item.str;
        pageText += item.hasEOL ? '\n' : ' ';
      }

      const clean = cleanPageText(pageText);
      if (clean.length >= 20) {
        pagesWithText++;
        characterCount += clean.length;
        for (const segment of pageToSegments(clean)) {
          if (texts.length >= MAX_SEGMENTS) break;
          texts.push(segment);
        }
      }
      if (texts.length >= MAX_SEGMENTS) break;
    }

    if (!texts.length || characterCount < 20) {
      throw new Error('Teks tidak dapat diekstrak dari PDF. Dokumen kemungkinan berupa hasil pindai/gambar dan memerlukan OCR terlebih dahulu.');
    }

    let metadata = {};
    try {
      const result = await document.getMetadata();
      metadata = result?.info || {};
    } catch {}

    return {
      texts,
      meta: {
        fileName: file.name,
        fileType: 'PDF',
        fileSize: file.size,
        pageCount: document.numPages,
        pagesWithText,
        characterCount,
        segmentCount: texts.length,
        documentTitle: metadata.Title || '',
        truncated: texts.length >= MAX_SEGMENTS
      }
    };
  } finally {
    try { await document.destroy(); } catch {}
  }
}

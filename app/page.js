'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_CATEGORIES,
  SAMPLE_TEXTS,
  analyzeDataset,
  generateEvidence,
  generateInsightSummary,
  generateRecommendations,
  normalizeText
} from '../lib/nlp';
import { extractPdfTexts } from '../lib/pdf';

const STEPS = [
  ['konteks', '1', 'Konteks'],
  ['data', '2', 'Data / Dokumen'],
  ['hasil', '3', 'Hasil NLP'],
  ['laporan', '4', 'Laporan']
];

const initialSourceMeta = {
  fileName: '',
  fileType: '',
  fileSize: 0,
  pageCount: 0,
  pagesWithText: 0,
  characterCount: 0,
  segmentCount: 0,
  documentTitle: '',
  truncated: false
};

const initialProject = {
  title: 'Analisis Data Teks Tempat Kerja',
  workplace: '',
  purpose: '',
  dataSource: '',
  dataPeriod: ''
};

function parseCsvLine(line) {
  const out = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      out.push(current.trim());
      current = '';
    } else current += ch;
  }
  out.push(current.trim());
  return out;
}

function extractTextsFromFile(name, content) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.json')) {
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      return data.map(x => typeof x === 'string' ? x : (x.text || x.teks || x.content || x.komentar || x.pesan || '')).filter(Boolean);
    }
    throw new Error('JSON harus berupa larik teks atau objek yang memiliki kolom teks/text/content.');
  }
  if (lower.endsWith('.csv')) {
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const header = parseCsvLine(lines[0]).map(x => normalizeText(x));
    let textIndex = header.findIndex(x => ['text','teks','content','komentar','ulasan','pesan'].includes(x));
    const hasHeader = textIndex >= 0;
    if (!hasHeader) textIndex = 0;
    return lines.slice(hasHeader ? 1 : 0).map(line => parseCsvLine(line)[textIndex]).filter(Boolean);
  }
  return content.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
}

function pct(count, total) { return total ? Math.round(count / total * 100) : 0; }

function Metric({ label, value, hint }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}

function Bar({ label, value, max, suffix = '' }) {
  const width = max ? Math.max(3, Math.round(value / max * 100)) : 0;
  return <div className="bar-row">
    <div className="bar-label"><span>{label}</span><b>{value}{suffix}</b></div>
    <div className="bar-track"><div className="bar-fill" style={{ width: `${width}%` }} /></div>
  </div>;
}

function InfoBox({ tone = 'info', children }) {
  return <div className={`info-box ${tone}`}>{children}</div>;
}

export default function Home() {
  const [step, setStep] = useState('konteks');
  const [project, setProject] = useState(initialProject);
  const [rawText, setRawText] = useState('');
  const [texts, setTexts] = useState([]);
  const [fileMessage, setFileMessage] = useState('');
  const [sourceMeta, setSourceMeta] = useState(initialSourceMeta);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [summaryLength, setSummaryLength] = useState(3);
  const [hydrated, setHydrated] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('text2insight-state-v3') || localStorage.getItem('text2insight-state-v2') || 'null');
      if (saved) {
        setProject({ ...initialProject, ...(saved.project || {}) });
        setRawText(saved.rawText || '');
        setTexts(saved.texts || []);
        setSummaryLength(saved.summaryLength || 3);
        setSourceMeta({ ...initialSourceMeta, ...(saved.sourceMeta || {}) });
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem('text2insight-state-v3', JSON.stringify({ project, rawText, texts, summaryLength, sourceMeta }));
    } catch {
      // Dokumen besar dapat melampaui kapasitas localStorage. Analisis tetap berjalan pada sesi aktif.
    }
  }, [hydrated, project, rawText, texts, summaryLength, sourceMeta]);

  const analysis = useMemo(() => analyzeDataset(texts, DEFAULT_CATEGORIES, summaryLength), [texts, summaryLength]);
  const evidence = useMemo(() => generateEvidence(analysis, { isDocument: sourceMeta.fileType === 'PDF' }), [analysis, sourceMeta.fileType]);
  const insightSummary = useMemo(() => generateInsightSummary(analysis, project.dataPeriod, { isDocument: sourceMeta.fileType === 'PDF' }), [analysis, project.dataPeriod, sourceMeta.fileType]);
  const recommendations = useMemo(() => generateRecommendations(analysis, { isDocument: sourceMeta.fileType === 'PDF' }), [analysis, sourceMeta.fileType]);

  function usePastedData(goToResults = false) {
    const splitter = sourceMeta.fileType === 'PDF' ? /\n{2,}/ : /\r?\n/;
    const list = rawText.split(splitter).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
    setTexts(list);
    if (sourceMeta.fileType === 'PDF') {
      setSourceMeta(meta => ({ ...meta, segmentCount: list.length, characterCount: list.join(' ').length }));
    } else {
      setSourceMeta(initialSourceMeta);
    }
    setFileMessage(list.length ? `${list.length} segmen teks siap dianalisis.` : 'Belum ada teks yang dapat dimuat.');
    if (list.length && goToResults) setStep('hasil');
  }

  function loadSample() {
    setRawText(SAMPLE_TEXTS.join('\n'));
    setTexts(SAMPLE_TEXTS);
    setProject(p => ({
      ...p,
      workplace: p.workplace || 'Layanan Akademik Perguruan Tinggi',
      purpose: p.purpose || 'Mengetahui masalah yang paling sering muncul dan kecenderungan tanggapan pengguna.',
      dataSource: p.dataSource || 'Pesan layanan mahasiswa',
      dataPeriod: p.dataPeriod || 'Januari–Juni 2026'
    }));
    setSourceMeta({ ...initialSourceMeta, fileType: 'Contoh data', segmentCount: SAMPLE_TEXTS.length });
    setFileMessage('Data contoh berhasil dimuat.');
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsReadingFile(true);
    setFileMessage(`Membaca ${file.name}...`);

    try {
      const lower = file.name.toLowerCase();
      let list = [];
      let meta = { ...initialSourceMeta, fileName: file.name, fileSize: file.size };

      if (lower.endsWith('.pdf') || file.type === 'application/pdf') {
        const result = await extractPdfTexts(file);
        list = result.texts;
        meta = result.meta;
        setProject(p => ({
          ...p,
          dataSource: p.dataSource || `Dokumen PDF: ${file.name}`
        }));
      } else {
        const content = await file.text();
        list = extractTextsFromFile(file.name, content);
        meta.fileType = lower.endsWith('.csv') ? 'CSV' : lower.endsWith('.json') ? 'JSON' : 'TXT';
        meta.characterCount = list.join(' ').length;
        meta.segmentCount = list.length;
      }

      setTexts(list);
      setRawText(list.join('\n\n'));
      setSourceMeta(meta);
      const pdfNote = meta.fileType === 'PDF' ? ` dari ${meta.pageCount} halaman PDF` : '';
      const limitNote = meta.truncated ? ' Analisis dibatasi pada 800 segmen pertama agar tetap responsif.' : '';
      setFileMessage(`${list.length} segmen teks berhasil dibaca${pdfNote} dari ${file.name}.${limitNote}`);
    } catch (err) {
      setTexts([]);
      setRawText('');
      setSourceMeta(initialSourceMeta);
      const message = String(err?.message || err || 'Kesalahan tidak diketahui.');
      const compatibilityHint = (message.includes('toHex') || message.includes('getOrInsertComputed'))
        ? ' Komponen PDF.js lama masih tersaji pada deployment. Versi terbaru memakai build legacy resmi PDF.js. Jalankan npm install, deploy ulang tanpa cache, lalu muat ulang halaman.'
        : '';
      setFileMessage(`Gagal membaca berkas: ${message}${compatibilityHint}`);
    } finally {
      setIsReadingFile(false);
      if (e.target) e.target.value = '';
    }
  }

  function resetAll() {
    if (!confirm('Hapus seluruh data proyek yang tersimpan pada cache browser ini?')) return;
    setProject(initialProject);
    setRawText('');
    setTexts([]);
    setSummaryLength(3);
    setFileMessage('');
    setSourceMeta(initialSourceMeta);
    setStep('konteks');
    localStorage.removeItem('text2insight-state-v2');
    localStorage.removeItem('text2insight-state-v3');
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ project, sourceMeta, texts, analysis, evidence, insightSummary, recommendations }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'text2insight-hasil.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function next() {
    const idx = STEPS.findIndex(x => x[0] === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1][0]);
  }
  function prev() {
    const idx = STEPS.findIndex(x => x[0] === step);
    if (idx > 0) setStep(STEPS[idx - 1][0]);
  }

  return (
    <main>
      <header className="topbar no-print">
        <div className="brand">
          <div className="logo">T2I</div>
          <div><h1>Text2Insight Lab</h1><p>Dari teks menjadi informasi, wawasan, dan tindakan</p></div>
        </div>
        <div className="top-actions">
          <span className="status-dot">Tersimpan otomatis di cache browser</span>
          <button className="ghost" onClick={resetAll}>Atur Ulang</button>
        </div>
      </header>

      <div className="app-shell">
        <aside className="sidebar no-print">
          <div className="side-title">Alur Analisis</div>
          {STEPS.map(([id, n, label]) => (
            <button key={id} onClick={() => setStep(id)} className={`step-button ${step === id ? 'active' : ''}`}>
              <span>{n}</span><div>{label}<small>{id === 'hasil' || id === 'laporan' ? `${texts.length} teks` : ''}</small></div>
            </button>
          ))}
          <div className="flow-card"><b>Alur sederhana</b><p>Konteks → Data → Hasil NLP → Laporan</p></div>
        </aside>

        <section className="content">
          {step === 'konteks' && <>
            <div className="page-heading"><div><span className="eyebrow">LANGKAH 1</span><h2>Konteks Analisis</h2><p>Cukup jelaskan konteks, sumber data, dan kurun waktu data.</p></div></div>
            <InfoBox><b>Mulai dari kebutuhan informasi.</b> Aplikasi akan menjalankan analisis NLP secara otomatis setelah data dimasukkan.</InfoBox>
            <div className="card form-card">
              <label>Bidang / tempat kerja<input value={project.workplace} onChange={e => setProject(p => ({...p, workplace:e.target.value}))} placeholder="Contoh: Layanan Akademik Perguruan Tinggi" /></label>
              <label>Apa yang ingin diketahui?<textarea value={project.purpose} onChange={e => setProject(p => ({...p, purpose:e.target.value}))} placeholder="Contoh: Mengetahui masalah yang paling sering disampaikan mahasiswa melalui layanan chat." /></label>
              <div className="grid two">
                <label>Sumber data<input value={project.dataSource} onChange={e => setProject(p => ({...p, dataSource:e.target.value}))} placeholder="Contoh: Pesan layanan mahasiswa" /></label>
                <label>Kurun waktu data<input value={project.dataPeriod} onChange={e => setProject(p => ({...p, dataPeriod:e.target.value}))} placeholder="Contoh: Januari–Juni 2026" /></label>
              </div>
            </div>
          </>}

          {step === 'data' && <>
            <div className="page-heading"><div><span className="eyebrow">LANGKAH 2</span><h2>Masukkan Data Teks atau Dokumen</h2><p>Tempel teks atau unggah TXT, CSV, JSON, dan PDF.</p></div><button className="secondary" onClick={loadSample}>Muat Data Contoh</button></div>
            <InfoBox tone="warning"><b>Perlindungan data.</b> Jangan unggah kata sandi, NIK, nomor rekening, rekam medis, data pelanggan rahasia, atau informasi internal yang tidak diizinkan.</InfoBox>
            <div className="card">
              <div className="upload-row">
                <div><b>Unggah data atau dokumen</b><p>Format: TXT, CSV, JSON, atau PDF. PDF maksimum 20 MB dan 120 halaman. Teks diekstrak langsung di browser lalu dianalisis sebagai segmen-segmen dokumen.</p></div>
                <input ref={fileRef} type="file" accept=".txt,.csv,.json,.pdf,text/plain,text/csv,application/json,application/pdf" onChange={handleFile} hidden />
                <button className="secondary" onClick={() => fileRef.current?.click()} disabled={isReadingFile}>{isReadingFile ? 'Membaca Berkas...' : 'Pilih Berkas'}</button>
              </div>
              {sourceMeta.fileType === 'PDF' && <div className="pdf-status"><div className="pdf-icon">PDF</div><div><b>{sourceMeta.fileName}</b><p>{sourceMeta.pageCount} halaman · {sourceMeta.pagesWithText} halaman memiliki teks · {sourceMeta.segmentCount} segmen dianalisis</p>{sourceMeta.documentTitle && <small>Judul dokumen: {sourceMeta.documentTitle}</small>}</div></div>}
              <div className="divider"><span>atau tempel data</span></div>
              <label>Data teks<textarea className="data-area" value={rawText} onChange={e => setRawText(e.target.value)} placeholder={'Satu teks per baris.\nContoh:\nAplikasi sangat lambat.\nPetugas sangat membantu.'} /></label>
              <div className="button-row"><button onClick={() => usePastedData(true)}>Analisis NLP Sekarang</button><button className="secondary" onClick={() => usePastedData(false)}>Muat Data</button><span className="muted">{fileMessage}</span></div>
            </div>
            {texts.length > 0 && <><div className="metrics-grid"><Metric label={sourceMeta.fileType === 'PDF' ? 'Segmen PDF' : 'Jumlah teks'} value={texts.length}/><Metric label="Jumlah kata" value={analysis.totalWords}/><Metric label="Kosakata unik" value={analysis.uniqueWords}/><Metric label="Kurun waktu" value={project.dataPeriod || '-'}/></div>{sourceMeta.fileType === 'PDF' && <InfoBox><b>Dokumen siap dianalisis.</b> PDF memiliki {sourceMeta.pageCount} halaman dan diekstrak menjadi {texts.length} segmen teks. PDF berbasis gambar/pindai tanpa lapisan teks memerlukan OCR terlebih dahulu.</InfoBox>}</>}
          </>}

          {step === 'hasil' && <>
            <div className="page-heading no-print"><div><span className="eyebrow">LANGKAH 3</span><h2>Hasil NLP dan Wawasan</h2><p>Temuan, ringkasan teks, bukti, dan rekomendasi tersusun otomatis dari data yang dianalisis.</p></div><div className="button-row"><button className="secondary" onClick={exportJson}>Ekspor JSON</button><button onClick={() => setStep('laporan')}>Lihat Laporan →</button></div></div>
            {!texts.length ? <InfoBox tone="warning">Belum ada data. Masukkan data pada langkah 2 lalu tekan <b>Analisis NLP Sekarang</b>.</InfoBox> : <>
              <div className="metrics-grid">
                <Metric label={sourceMeta.fileType === 'PDF' ? 'Segmen PDF dianalisis' : 'Teks dianalisis'} value={texts.length}/>
                <Metric label="Sentimen negatif" value={`${pct(analysis.sentimentCounts.Negatif,texts.length)}%`}/>
                <Metric label={sourceMeta.fileType === 'PDF' ? 'Istilah dominan' : 'Topik dominan'} value={sourceMeta.fileType === 'PDF' ? (analysis.keywords[0]?.term || '-') : (analysis.categoriesRanked[0]?.name || '-')}/>
                <Metric label="Kurun waktu" value={project.dataPeriod || '-'}/>
              </div>

              {sourceMeta.fileType === 'PDF' && <div className="document-banner"><span>Dokumen PDF</span><b>{sourceMeta.documentTitle || sourceMeta.fileName}</b><small>{sourceMeta.pageCount} halaman · {sourceMeta.pagesWithText} halaman terbaca · {sourceMeta.characterCount.toLocaleString('id-ID')} karakter diekstrak</small></div>}

              <div className="card insight-highlight">
                <span className="eyebrow">WAWASAN OTOMATIS</span>
                <h3>Apa arti pola pada data?</h3>
                <p className="insight-text">{insightSummary}</p>
              </div>

              <div className="card">
                <div className="section-title-row"><div><h3>Peringkasan Teks Otomatis</h3><p className="muted">Peringkasan teks (text summarization) ekstraktif memilih teks yang paling mewakili kata dan pola penting dalam keseluruhan data.</p></div><label className="summary-control">Panjang ringkasan<select value={summaryLength} onChange={e=>setSummaryLength(Number(e.target.value))}><option value={3}>Ringkas · 3</option><option value={5}>Sedang · 5</option><option value={7}>Lebih lengkap · 7</option></select></label></div>
                <div className="summary-box">{analysis.summary.length ? <ol className="summary-list">{analysis.summary.map((s,i)=><li key={i}>{s}</li>)}</ol> : <p className="muted">Ringkasan belum tersedia.</p>}</div>
              </div>

              <div className="grid two align-start">
                <div className="card"><h3>Sentimen</h3>{['Negatif','Netral','Positif'].map(k=><Bar key={k} label={k} value={analysis.sentimentCounts[k]} max={texts.length} suffix={` (${pct(analysis.sentimentCounts[k],texts.length)}%)`} />)}</div>
                <div className="card"><h3>{sourceMeta.fileType === 'PDF' ? 'Istilah / Tema Dominan' : 'Topik / Kategori'}</h3>{sourceMeta.fileType === 'PDF' ? analysis.keywords.slice(0,6).map(x=><Bar key={x.term} label={x.term} value={x.count} max={Math.max(...analysis.keywords.map(k=>k.count),1)} />) : analysis.categoriesRanked.slice(0,6).map(x=><Bar key={x.name} label={x.name} value={x.count} max={Math.max(...analysis.categoriesRanked.map(x=>x.count),1)} suffix={` (${x.pct}%)`} />)}</div>
              </div>

              <div className="grid two align-start">
                <div className="card"><h3>Kata Kunci</h3><div className="tag-cloud">{analysis.keywords.slice(0,12).map(k=><span key={k.term}>{k.term}<b>{k.count}</b></span>)}</div></div>
                <div className="card evidence-card"><h3>Bukti Utama</h3><ul>{evidence.map((e,i)=><li key={i}>{e}</li>)}</ul></div>
              </div>

              {sourceMeta.fileType === 'PDF' && analysis.entitiesRanked.length > 0 && <div className="card"><h3>Entitas Penting dalam Dokumen</h3><p className="muted">Organisasi, lokasi, tanggal, nilai, surel, atau URL yang terdeteksi dari teks PDF.</p><div className="entity-list">{analysis.entitiesRanked.map((e,i)=><div key={`${e.type}-${e.value}-${i}`}><span className="pill">{e.type}</span><b>{e.value}</b><em>{e.count}×</em></div>)}</div></div>}

              <div className="card"><h3>Rekomendasi Berdasarkan Temuan</h3><ul>{recommendations.map((r,i)=><li key={i}>{r}</li>)}</ul><p className="footnote">Rekomendasi merupakan interpretasi awal berdasarkan pola teks. Verifikasi dengan kondisi nyata sebelum digunakan sebagai dasar keputusan.</p></div>

            </>}
          </>}


          {step === 'laporan' && <>
            <div className="page-heading no-print"><div><span className="eyebrow">LANGKAH 4</span><h2>Laporan Analisis NLP</h2><p>Laporan akhir merangkum konteks, data, temuan, wawasan, bukti, rekomendasi, dan keterbatasan analisis.</p></div><div className="button-row"><button className="secondary" onClick={() => setStep('hasil')}>← Kembali ke Hasil</button><button onClick={() => window.print()}>Cetak / Simpan PDF</button></div></div>
            {!texts.length ? <InfoBox tone="warning">Belum ada data untuk dilaporkan. Masukkan data pada langkah 2, lalu lakukan analisis NLP.</InfoBox> : <article className="report">
              <div className="report-cover"><span>TEXT2INSIGHT LAB</span><h2>{project.title || 'Laporan Analisis NLP'}</h2><p>From Text to Insight — Menggali Informasi Data Dunia Kerja dengan Natural Language Processing</p></div>
              <section><h3>1. Konteks dan Sumber Data</h3><dl><dt>Bidang / tempat kerja</dt><dd>{project.workplace || '-'}</dd><dt>Tujuan analisis</dt><dd>{project.purpose || '-'}</dd><dt>Sumber data</dt><dd>{project.dataSource || '-'}</dd><dt>Kurun waktu data</dt><dd>{project.dataPeriod || '-'}</dd>{sourceMeta.fileName && <><dt>Berkas dianalisis</dt><dd>{sourceMeta.fileName}</dd><dt>Jenis berkas</dt><dd>{sourceMeta.fileType || '-'}</dd></>}{sourceMeta.fileType === 'PDF' && <><dt>Jumlah halaman PDF</dt><dd>{sourceMeta.pageCount}</dd><dt>Halaman dengan teks</dt><dd>{sourceMeta.pagesWithText}</dd></>}</dl></section>
              <section><h3>2. Ringkasan Data</h3><div className="report-metrics"><Metric label={sourceMeta.fileType === 'PDF' ? 'Jumlah segmen' : 'Jumlah teks'} value={texts.length}/><Metric label="Jumlah kata" value={analysis.totalWords}/><Metric label="Kosakata unik" value={analysis.uniqueWords}/><Metric label="Rata-rata" value={`${analysis.averageLength} kata`}/></div></section>
              <section><h3>3. Ringkasan Teks</h3><p>{analysis.summary.join(' ') || '-'}</p></section>
              <section><h3>4. Temuan NLP</h3><div className="grid two align-start"><div><h4>Sentimen</h4>{['Negatif','Netral','Positif'].map(k=><Bar key={k} label={k} value={analysis.sentimentCounts[k]} max={texts.length} suffix={` (${pct(analysis.sentimentCounts[k],texts.length)}%)`} />)}</div><div><h4>{sourceMeta.fileType === 'PDF' ? 'Istilah / tema dominan' : 'Topik / kategori'}</h4>{sourceMeta.fileType === 'PDF' ? analysis.keywords.slice(0,5).map(x=><Bar key={x.term} label={x.term} value={x.count} max={Math.max(...analysis.keywords.map(k=>k.count),1)} />) : analysis.categoriesRanked.slice(0,5).map(x=><Bar key={x.name} label={x.name} value={x.count} max={Math.max(...analysis.categoriesRanked.map(x=>x.count),1)} suffix={` (${x.pct}%)`} />)}</div></div>{sourceMeta.fileType === 'PDF' && analysis.entitiesRanked.length > 0 && <><h4>Entitas penting</h4><ul>{analysis.entitiesRanked.slice(0,8).map((e,i)=><li key={`${e.type}-${e.value}-${i}`}>{e.type}: {e.value} ({e.count} kali)</li>)}</ul></>}</section>
              <section><h3>5. Wawasan</h3><p>{insightSummary}</p><h4>Bukti pendukung</h4><ul>{evidence.map((e,i)=><li key={i}>{e}</li>)}</ul></section>
              <section><h3>6. Rekomendasi</h3><ul>{recommendations.map((r,i)=><li key={i}>{r}</li>)}</ul></section>
              <section><h3>7. Keterbatasan</h3><p>Hasil hanya merepresentasikan data yang dimasukkan dan kurun waktu yang ditetapkan. Analisis sentimen, kategori, serta ringkasan bersifat indikatif dan perlu dibaca bersama konteks organisasi. Untuk PDF, aplikasi hanya menganalisis teks yang dapat diekstrak; dokumen hasil pindai tanpa lapisan teks memerlukan OCR.</p></section>
            </article>}
          </>}

          <div className="nav-actions no-print"><button className="ghost" onClick={prev} disabled={step === STEPS[0][0]}>← Sebelumnya</button><span>Langkah {STEPS.findIndex(x=>x[0]===step)+1} dari {STEPS.length}</span><button onClick={next} disabled={step === STEPS[STEPS.length-1][0]}>Berikutnya →</button></div>
        </section>
      </div>
      <footer className="no-print">Text2Insight Lab · Analisis NLP berbasis bukti · Data tersimpan lokal pada cache browser pengguna</footer>
    </main>
  );
}

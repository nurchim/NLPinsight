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

const STEPS = [
  ['konteks', '1', 'Konteks'],
  ['data', '2', 'Data Teks'],
  ['hasil', '3', 'Hasil dan Laporan']
];

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
  const [summaryLength, setSummaryLength] = useState(3);
  const [hydrated, setHydrated] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('text2insight-state-v2') || 'null');
      if (saved) {
        setProject({ ...initialProject, ...(saved.project || {}) });
        setRawText(saved.rawText || '');
        setTexts(saved.texts || []);
        setSummaryLength(saved.summaryLength || 3);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('text2insight-state-v2', JSON.stringify({ project, rawText, texts, summaryLength }));
  }, [hydrated, project, rawText, texts, summaryLength]);

  const analysis = useMemo(() => analyzeDataset(texts, DEFAULT_CATEGORIES, summaryLength), [texts, summaryLength]);
  const evidence = useMemo(() => generateEvidence(analysis), [analysis]);
  const insightSummary = useMemo(() => generateInsightSummary(analysis, project.dataPeriod), [analysis, project.dataPeriod]);
  const recommendations = useMemo(() => generateRecommendations(analysis), [analysis]);

  function usePastedData(goToResults = false) {
    const list = rawText.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    setTexts(list);
    setFileMessage(list.length ? `${list.length} teks berhasil dimuat.` : 'Belum ada teks yang dapat dimuat.');
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
    setFileMessage('Data contoh berhasil dimuat.');
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const list = extractTextsFromFile(file.name, content);
      setTexts(list);
      setRawText(list.join('\n'));
      setFileMessage(`${list.length} teks berhasil dibaca dari ${file.name}.`);
    } catch (err) {
      setFileMessage(`Gagal membaca berkas: ${err.message}`);
    }
  }

  function resetAll() {
    if (!confirm('Hapus seluruh data proyek yang tersimpan pada peramban ini?')) return;
    setProject(initialProject);
    setRawText('');
    setTexts([]);
    setSummaryLength(3);
    setFileMessage('');
    setStep('konteks');
    localStorage.removeItem('text2insight-state-v2');
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ project, texts, analysis, evidence, insightSummary, recommendations }, null, 2)], { type: 'application/json' });
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
          <span className="status-dot">Tersimpan otomatis di peramban</span>
          <button className="ghost" onClick={resetAll}>Atur Ulang</button>
        </div>
      </header>

      <div className="app-shell">
        <aside className="sidebar no-print">
          <div className="side-title">Alur Analisis</div>
          {STEPS.map(([id, n, label]) => (
            <button key={id} onClick={() => setStep(id)} className={`step-button ${step === id ? 'active' : ''}`}>
              <span>{n}</span><div>{label}<small>{id === 'hasil' ? `${texts.length} teks` : ''}</small></div>
            </button>
          ))}
          <div className="flow-card"><b>Alur sederhana</b><p>Konteks → Data → NLP → Wawasan → Laporan</p></div>
        </aside>

        <section className="content">
          {step === 'konteks' && <>
            <div className="page-heading"><div><span className="eyebrow">LANGKAH 1</span><h2>Konteks Analisis</h2><p>Cukup jelaskan konteks, sumber data, dan kurun waktu data.</p></div></div>
            <InfoBox><b>Mulai dari kebutuhan informasi.</b> Mahasiswa tidak perlu memilih algoritma. Aplikasi akan menjalankan analisis NLP secara otomatis setelah data dimasukkan.</InfoBox>
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
            <div className="page-heading"><div><span className="eyebrow">LANGKAH 2</span><h2>Masukkan Data Teks</h2><p>Tempel satu teks per baris atau unggah berkas.</p></div><button className="secondary" onClick={loadSample}>Muat Data Contoh</button></div>
            <InfoBox tone="warning"><b>Perlindungan data.</b> Jangan unggah kata sandi, NIK, nomor rekening, rekam medis, data pelanggan rahasia, atau informasi internal yang tidak diizinkan.</InfoBox>
            <div className="card">
              <div className="upload-row">
                <div><b>Unggah berkas</b><p>Format: TXT, CSV, atau JSON. Untuk CSV, gunakan kolom <code>teks</code>, <code>text</code>, <code>komentar</code>, <code>pesan</code>, atau <code>ulasan</code>.</p></div>
                <input ref={fileRef} type="file" accept=".txt,.csv,.json" onChange={handleFile} hidden />
                <button className="secondary" onClick={() => fileRef.current?.click()}>Pilih Berkas</button>
              </div>
              <div className="divider"><span>atau tempel data</span></div>
              <label>Data teks<textarea className="data-area" value={rawText} onChange={e => setRawText(e.target.value)} placeholder={'Satu teks per baris.\nContoh:\nAplikasi sangat lambat.\nPetugas sangat membantu.'} /></label>
              <div className="button-row"><button onClick={() => usePastedData(true)}>Analisis NLP Sekarang</button><button className="secondary" onClick={() => usePastedData(false)}>Muat Data</button><span className="muted">{fileMessage}</span></div>
            </div>
            {texts.length > 0 && <div className="metrics-grid"><Metric label="Jumlah teks" value={texts.length}/><Metric label="Jumlah kata" value={analysis.totalWords}/><Metric label="Kosakata unik" value={analysis.uniqueWords}/><Metric label="Kurun waktu" value={project.dataPeriod || '-'}/></div>}
          </>}

          {step === 'hasil' && <>
            <div className="page-heading no-print"><div><span className="eyebrow">LANGKAH 3</span><h2>Hasil NLP dan Wawasan</h2><p>Temuan, ringkasan teks, bukti, rekomendasi, dan laporan tersusun otomatis.</p></div><div className="button-row"><button className="secondary" onClick={exportJson}>Ekspor JSON</button><button onClick={()=>window.print()}>Cetak / Simpan PDF</button></div></div>
            {!texts.length ? <InfoBox tone="warning">Belum ada data. Masukkan data pada langkah 2 lalu tekan <b>Analisis NLP Sekarang</b>.</InfoBox> : <>
              <div className="metrics-grid">
                <Metric label="Teks dianalisis" value={texts.length}/>
                <Metric label="Sentimen negatif" value={`${pct(analysis.sentimentCounts.Negatif,texts.length)}%`}/>
                <Metric label="Topik dominan" value={analysis.categoriesRanked[0]?.name || '-'}/>
                <Metric label="Kurun waktu" value={project.dataPeriod || '-'}/>
              </div>

              <div className="card insight-highlight">
                <span className="eyebrow">WAWASAN OTOMATIS</span>
                <h3>Apa arti pola pada data?</h3>
                <p className="insight-text">{insightSummary}</p>
              </div>

              <div className="card">
                <div className="section-title-row"><div><h3>Ringkasan Teks Otomatis</h3><p className="muted">Text summarization ekstraktif memilih teks yang paling mewakili kata dan pola penting dalam keseluruhan data.</p></div><label className="summary-control">Panjang ringkasan<select value={summaryLength} onChange={e=>setSummaryLength(Number(e.target.value))}><option value={3}>Ringkas · 3</option><option value={5}>Sedang · 5</option><option value={7}>Lebih lengkap · 7</option></select></label></div>
                <div className="summary-box">{analysis.summary.length ? <ol className="summary-list">{analysis.summary.map((s,i)=><li key={i}>{s}</li>)}</ol> : <p className="muted">Ringkasan belum tersedia.</p>}</div>
              </div>

              <div className="grid two align-start">
                <div className="card"><h3>Sentimen</h3>{['Negatif','Netral','Positif'].map(k=><Bar key={k} label={k} value={analysis.sentimentCounts[k]} max={texts.length} suffix={` (${pct(analysis.sentimentCounts[k],texts.length)}%)`} />)}</div>
                <div className="card"><h3>Topik / Kategori</h3>{analysis.categoriesRanked.slice(0,6).map(x=><Bar key={x.name} label={x.name} value={x.count} max={Math.max(...analysis.categoriesRanked.map(x=>x.count),1)} suffix={` (${x.pct}%)`} />)}</div>
              </div>

              <div className="grid two align-start">
                <div className="card"><h3>Kata Kunci</h3><div className="tag-cloud">{analysis.keywords.slice(0,12).map(k=><span key={k.term}>{k.term}<b>{k.count}</b></span>)}</div></div>
                <div className="card evidence-card"><h3>Bukti Utama</h3><ul>{evidence.map((e,i)=><li key={i}>{e}</li>)}</ul></div>
              </div>

              <div className="card"><h3>Rekomendasi Berdasarkan Temuan</h3><ul>{recommendations.map((r,i)=><li key={i}>{r}</li>)}</ul><p className="footnote">Rekomendasi merupakan interpretasi awal berdasarkan pola teks. Verifikasi dengan kondisi nyata sebelum digunakan sebagai dasar keputusan.</p></div>

              <details className="card process-details"><summary>Lihat bagaimana NLP bekerja</summary><div className="process-flow"><span>Data teks</span><b>→</b><span>Normalisasi</span><b>→</b><span>Tokenisasi</span><b>→</b><span>Sentimen</span><b>→</b><span>Kategori</span><b>→</b><span>Kata kunci</span><b>→</b><span>Ringkasan</span><b>→</b><span>Wawasan</span></div></details>

              <article className="report">
                <div className="report-cover"><span>TEXT2INSIGHT LAB</span><h2>{project.title || 'Laporan Analisis NLP'}</h2><p>From Text to Insight — Menggali Informasi Data Dunia Kerja dengan Natural Language Processing</p></div>
                <section><h3>1. Konteks dan Sumber Data</h3><dl><dt>Bidang / tempat kerja</dt><dd>{project.workplace || '-'}</dd><dt>Tujuan analisis</dt><dd>{project.purpose || '-'}</dd><dt>Sumber data</dt><dd>{project.dataSource || '-'}</dd><dt>Kurun waktu data</dt><dd>{project.dataPeriod || '-'}</dd></dl></section>
                <section><h3>2. Ringkasan Data</h3><div className="report-metrics"><Metric label="Jumlah teks" value={texts.length}/><Metric label="Jumlah kata" value={analysis.totalWords}/><Metric label="Kosakata unik" value={analysis.uniqueWords}/><Metric label="Rata-rata" value={`${analysis.averageLength} kata`}/></div></section>
                <section><h3>3. Ringkasan Teks</h3><p>{analysis.summary.join(' ') || '-'}</p></section>
                <section><h3>4. Temuan NLP</h3><div className="grid two align-start"><div><h4>Sentimen</h4>{['Negatif','Netral','Positif'].map(k=><Bar key={k} label={k} value={analysis.sentimentCounts[k]} max={texts.length} suffix={` (${pct(analysis.sentimentCounts[k],texts.length)}%)`} />)}</div><div><h4>Topik / kategori</h4>{analysis.categoriesRanked.slice(0,5).map(x=><Bar key={x.name} label={x.name} value={x.count} max={Math.max(...analysis.categoriesRanked.map(x=>x.count),1)} suffix={` (${x.pct}%)`} />)}</div></div></section>
                <section><h3>5. Wawasan</h3><p>{insightSummary}</p><h4>Bukti pendukung</h4><ul>{evidence.map((e,i)=><li key={i}>{e}</li>)}</ul></section>
                <section><h3>6. Rekomendasi</h3><ul>{recommendations.map((r,i)=><li key={i}>{r}</li>)}</ul></section>
                <section><h3>7. Keterbatasan</h3><p>Hasil hanya merepresentasikan data yang dimasukkan dan kurun waktu yang ditetapkan. Analisis sentimen, kategori, serta ringkasan bersifat indikatif dan perlu dibaca bersama konteks organisasi.</p></section>
                <section className="method-note"><h3>Catatan Metode</h3><p>Analisis memakai normalisasi teks, tokenisasi, kamus sentimen, klasifikasi berbasis kata kunci, ekstraksi kata kunci, dan text summarization ekstraktif. Pendekatan dibuat transparan agar proses NLP mudah dipahami oleh mahasiswa.</p></section>
              </article>
            </>}
          </>}

          <div className="nav-actions no-print"><button className="ghost" onClick={prev} disabled={step === STEPS[0][0]}>← Sebelumnya</button><span>Langkah {STEPS.findIndex(x=>x[0]===step)+1} dari {STEPS.length}</span><button onClick={next} disabled={step === STEPS[STEPS.length-1][0]}>Berikutnya →</button></div>
        </section>
      </div>
      <footer className="no-print">Text2Insight Lab · Analisis NLP berbasis bukti · Data tersimpan lokal pada peramban pengguna</footer>
    </main>
  );
}

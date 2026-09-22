export const STOPWORDS = new Set([
  'yang','dan','di','ke','dari','untuk','pada','dengan','ini','itu','atau','karena','sebagai','oleh','dalam','sudah','belum','saya','kami','kita','anda','mereka','dia','ia','ada','tidak','bisa','dapat','akan','telah','sangat','lebih','juga','agar','jadi','namun','tetapi','sehingga','saat','ketika','setelah','sebelum','masih','hanya','seperti','tentang','terhadap','antara','sebuah','para','nya','pun','lah','apakah','bagaimana','apa','siapa','dimana','mana','hari','tadi','sejak','terus','sering','terlalu'
]);

const POSITIVE = new Set([
  'baik','bagus','cepat','mudah','membantu','ramah','puas','lancar','tepat','berhasil','stabil','nyaman','mantap','responsif','jelas','rapi','aman','efektif','efisien','senang','suka','memuaskan','terima','kasih'
]);

const NEGATIVE = new Set([
  'buruk','lambat','gagal','error','rusak','sulit','bingung','kecewa','terlambat','masalah','gangguan','tidak','belum','lama','marah','hilang','salah','macet','down','putus','keluhan','komplain','ribet','rumit','parah','jelek','menunggu','antre','antri','korup','spam'
]);

const NEGATIONS = new Set(['tidak','tak','bukan','belum','jangan','kurang']);

export const DEFAULT_CATEGORIES = [
  { id: 'login', name: 'Akun dan Masuk', keywords: 'login, masuk, password, kata sandi, akun, autentikasi, otp, reset' },
  { id: 'pembayaran', name: 'Pembayaran', keywords: 'bayar, pembayaran, transfer, saldo, tagihan, ukt, biaya, transaksi, refund' },
  { id: 'jadwal', name: 'Jadwal', keywords: 'jadwal, kalender, waktu, jam, kelas, kuliah, agenda' },
  { id: 'sistem', name: 'Sistem dan Aplikasi', keywords: 'aplikasi, sistem, error, gagal, lambat, server, halaman, situs, website, jaringan' },
  { id: 'layanan', name: 'Layanan', keywords: 'petugas, layanan, pelayanan, customer service, cs, balas, respons, ramah' }
];

export const SAMPLE_TEXTS = [
  'Aplikasi sering error ketika saya mencoba masuk ke akun.',
  'Password sudah saya ubah tetapi masih gagal masuk.',
  'Pelayanan petugas akademik sangat ramah dan membantu.',
  'Pembayaran UKT saya gagal tetapi saldo sudah berkurang.',
  'Jadwal kuliah belum muncul pada aplikasi.',
  'Sistem KRS sangat lambat pada jam sibuk.',
  'Proses reset kata sandi mudah dan berhasil.',
  'Petugas belum membalas pesan saya sejak pagi.',
  'Pembayaran berhasil dan prosesnya sangat cepat.',
  'Aplikasi sempat tidak dapat dibuka setelah pembaruan.',
  'Jadwal kelas berubah tetapi informasinya terlambat.',
  'Saya puas karena layanan administrasi lebih cepat sekarang.'
];

export function normalizeText(text = '') {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s@._/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text = '') {
  return normalizeText(text).split(' ').filter(Boolean);
}

export function usefulTokens(text = '') {
  return tokenize(text).filter(t => t.length > 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

export function analyzeSentiment(text = '') {
  const tokens = tokenize(text);
  let score = 0;
  let pos = 0;
  let neg = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const previousNegation = i > 0 && NEGATIONS.has(tokens[i - 1]);
    if (POSITIVE.has(t)) {
      score += previousNegation ? -1 : 1;
      previousNegation ? neg++ : pos++;
    }
    if (NEGATIVE.has(t)) {
      score += previousNegation ? 1 : -1;
      previousNegation ? pos++ : neg++;
    }
  }
  let label = 'Netral';
  if (score > 0) label = 'Positif';
  if (score < 0) label = 'Negatif';
  return { score, label, positiveHits: pos, negativeHits: neg };
}

function categoryScore(text, category) {
  const n = ` ${normalizeText(text)} `;
  const keywords = String(category.keywords || '')
    .split(',')
    .map(k => normalizeText(k))
    .filter(Boolean);
  let score = 0;
  const matched = [];
  for (const k of keywords) {
    if (n.includes(` ${k} `) || (k.includes(' ') && n.includes(k))) {
      score += k.includes(' ') ? 2 : 1;
      matched.push(k);
    }
  }
  return { score, matched };
}

export function classifyText(text, categories = DEFAULT_CATEGORIES) {
  const ranked = categories
    .map(c => ({ ...c, ...categoryScore(text, c) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score === 0) return { id: 'lainnya', name: 'Lainnya', score: 0, matched: [] };
  return best;
}

export function keywordFrequency(texts = [], limit = 15) {
  const freq = {};
  texts.forEach(text => {
    usefulTokens(text).forEach(t => { freq[t] = (freq[t] || 0) + 1; });
  });
  return Object.entries(freq)
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, limit);
}

const MONTHS = '(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)';
const CITY_NAMES = ['Jakarta','Bandung','Surabaya','Semarang','Yogyakarta','Solo','Surakarta','Medan','Makassar','Denpasar','Palembang','Malang','Bogor','Depok','Bekasi','Tangerang'];

export function extractEntities(text = '') {
  const entities = [];
  const pushMatches = (regex, type, source = text) => {
    const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
    const r = new RegExp(regex.source, flags);
    for (const m of source.matchAll(r)) {
      const value = (m[0] || '').trim();
      if (value && !entities.some(e => e.type === type && e.value.toLowerCase() === value.toLowerCase())) {
        entities.push({ type, value });
      }
    }
  };

  pushMatches(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/g, 'EMAIL');
  pushMatches(/https?:\/\/[^\s]+/g, 'URL');
  pushMatches(/(?:Rp\.?\s?)?\d{1,3}(?:\.\d{3})+(?:,\d+)?/gi, 'NILAI');
  pushMatches(new RegExp(`\\b(?:\\d{1,2}\\s+)?${MONTHS}(?:\\s+\\d{4})?\\b`, 'gi'), 'TANGGAL');
  pushMatches(/\b(?:PT|CV|UD|RS|Universitas|Institut|Politeknik)\s+[A-Z][A-Za-z0-9.&' -]{2,50}/g, 'ORGANISASI');

  for (const city of CITY_NAMES) {
    const r = new RegExp(`\\b${city}\\b`, 'i');
    if (r.test(text)) entities.push({ type: 'LOKASI', value: city });
  }
  return entities;
}

export function summarizeExtractive(texts = [], maxSentences = 3) {
  if (!texts.length) return [];
  const keywords = keywordFrequency(texts, 20);
  const weights = Object.fromEntries(keywords.map((k, i) => [k.term, Math.max(1, 20 - i)]));
  return texts
    .map((text, index) => {
      const score = usefulTokens(text).reduce((s, t) => s + (weights[t] || 0), 0);
      return { text, index, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map(x => x.text);
}

export function analyzeDataset(texts, categories, summarySentences = 3) {
  const rows = texts.map((text, index) => {
    const sentiment = analyzeSentiment(text);
    const category = classifyText(text, categories);
    const entities = extractEntities(text);
    return { id: index + 1, text, sentiment, category, entities };
  });

  const sentimentCounts = { Positif: 0, Netral: 0, Negatif: 0 };
  const categoryCounts = {};
  const entityCounts = {};

  rows.forEach(row => {
    sentimentCounts[row.sentiment.label]++;
    categoryCounts[row.category.name] = (categoryCounts[row.category.name] || 0) + 1;
    row.entities.forEach(e => {
      const key = `${e.type}|${e.value}`;
      entityCounts[key] = (entityCounts[key] || 0) + 1;
    });
  });

  const categoriesRanked = Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count, pct: texts.length ? Math.round(count / texts.length * 100) : 0 }))
    .sort((a, b) => b.count - a.count);

  const entitiesRanked = Object.entries(entityCounts)
    .map(([key, count]) => {
      const [type, value] = key.split('|');
      return { type, value, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return {
    rows,
    sentimentCounts,
    categoriesRanked,
    entitiesRanked,
    keywords: keywordFrequency(texts, 15),
    summary: summarizeExtractive(texts, summarySentences),
    totalWords: texts.reduce((n, t) => n + tokenize(t).length, 0),
    uniqueWords: new Set(texts.flatMap(usefulTokens)).size,
    averageLength: texts.length ? Math.round(texts.reduce((n, t) => n + tokenize(t).length, 0) / texts.length * 10) / 10 : 0
  };
}

export function generateEvidence(analysis) {
  if (!analysis || !analysis.rows?.length) return [];
  const total = analysis.rows.length;
  const neg = analysis.sentimentCounts.Negatif || 0;
  const pos = analysis.sentimentCounts.Positif || 0;
  const topCat = analysis.categoriesRanked[0];
  const topKeyword = analysis.keywords[0];
  const out = [];
  if (topCat) out.push(`Kategori paling dominan adalah “${topCat.name}” dengan ${topCat.count} dari ${total} teks (${topCat.pct}%).`);
  out.push(`Sentimen negatif ditemukan pada ${neg} dari ${total} teks (${Math.round(neg / total * 100)}%), sedangkan sentimen positif pada ${pos} teks (${Math.round(pos / total * 100)}%).`);
  if (topKeyword) out.push(`Kata kunci yang paling sering muncul adalah “${topKeyword.term}” sebanyak ${topKeyword.count} kali.`);
  if (analysis.entitiesRanked[0]) out.push(`Entitas yang paling sering terdeteksi adalah “${analysis.entitiesRanked[0].value}” (${analysis.entitiesRanked[0].type}) sebanyak ${analysis.entitiesRanked[0].count} kali.`);
  return out;
}

export function checkInsight(text, analysis) {
  const warnings = [];
  const n = normalizeText(text);
  const causal = ['karena','disebabkan','penyebab','mengakibatkan','akibat'];
  if (causal.some(w => n.includes(w))) {
    warnings.push('Pernyataan memuat hubungan sebab-akibat. Pastikan penyebab tersebut benar-benar didukung data, bukan sekadar dugaan.');
  }
  if (text.trim().length > 0 && text.trim().length < 35) {
    warnings.push('Wawasan masih terlalu singkat. Sertakan temuan utama dan bukti kuantitatif yang mendukungnya.');
  }
  const evidence = generateEvidence(analysis).join(' ').toLowerCase();
  if (n.includes('server') && !evidence.includes('server')) {
    warnings.push('Kata “server” tidak muncul pada ringkasan bukti otomatis. Tandai sebagai hipotesis jika belum ada bukti tambahan.');
  }
  return warnings;
}


export function generateInsightSummary(analysis, dataPeriod = '') {
  if (!analysis?.rows?.length) return 'Belum ada data yang dapat diringkas.';
  const total = analysis.rows.length;
  const topCat = analysis.categoriesRanked?.[0];
  const topKeywords = (analysis.keywords || []).slice(0, 5).map(k => k.term);
  const neg = analysis.sentimentCounts?.Negatif || 0;
  const pos = analysis.sentimentCounts?.Positif || 0;
  const net = analysis.sentimentCounts?.Netral || 0;
  const dominantSentiment = [
    ['negatif', neg], ['positif', pos], ['netral', net]
  ].sort((a,b) => b[1] - a[1])[0];
  const parts = [`Analisis terhadap ${total} teks${dataPeriod ? ` pada kurun waktu ${dataPeriod}` : ''} menunjukkan`];
  if (topCat) parts.push(`topik/kategori yang paling dominan adalah ${topCat.name} (${topCat.pct}%)`);
  parts.push(`dengan kecenderungan sentimen ${dominantSentiment[0]} pada ${Math.round(dominantSentiment[1] / total * 100)}% data`);
  if (topKeywords.length) parts.push(`Kata kunci yang menonjol meliputi ${topKeywords.join(', ')}`);
  return `${parts[0]} ${parts.slice(1).join('. ')}.`;
}

export function generateRecommendations(analysis) {
  if (!analysis?.rows?.length) return [];
  const top = analysis.categoriesRanked?.[0]?.name || '';
  const actionMap = {
    'Akun dan Masuk': 'Tinjau alur masuk, pengaturan ulang kata sandi, dan bantuan akses akun.',
    'Pembayaran': 'Tinjau alur transaksi, penanganan pembayaran gagal, dan kejelasan informasi pembayaran.',
    'Jadwal': 'Periksa ketepatan dan keterbaruan informasi jadwal yang diterima pengguna.',
    'Sistem dan Aplikasi': 'Identifikasi bagian sistem yang paling sering disebut bermasalah lalu lakukan pemeriksaan teknis terarah.',
    'Layanan': 'Tinjau waktu respons, kejelasan jawaban, dan konsistensi pelayanan kepada pengguna.',
    'Lainnya': 'Kelompokkan data “Lainnya” lebih lanjut untuk menemukan pola yang belum tertangkap kategori awal.'
  };
  const out = [];
  if (top) out.push(actionMap[top] || `Tinjau lebih lanjut isu pada kategori ${top} dengan membaca contoh teks pendukung.`);
  const total = analysis.rows.length;
  const negPct = Math.round((analysis.sentimentCounts.Negatif || 0) / total * 100);
  if (negPct >= 50) out.push('Prioritaskan pemeriksaan pada teks bersentimen negatif untuk mengetahui masalah yang paling mendesak.');
  out.push('Validasi temuan dengan konteks organisasi dan, bila memungkinkan, bandingkan dengan kurun waktu data lain sebelum mengambil keputusan.');
  return out;
}

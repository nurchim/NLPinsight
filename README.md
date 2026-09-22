# Text2Insight Lab

Aplikasi pembelajaran **Natural Language Processing (NLP)** untuk membantu mahasiswa mengubah data teks dari konteks dunia kerja menjadi temuan, ringkasan, wawasan, bukti, rekomendasi, dan laporan.

## Alur aplikasi

Aplikasi dibuat sederhana agar mudah digunakan oleh mahasiswa nonteknis:

1. **Konteks** — isi bidang/tempat kerja, tujuan analisis, sumber data, dan kurun waktu data.
2. **Data Teks** — tempel teks atau unggah TXT, CSV, atau JSON.
3. **Hasil dan Laporan** — aplikasi otomatis menjalankan NLP, text summarization, menghasilkan wawasan, bukti, rekomendasi, dan laporan.

## Fitur utama

- Keterangan sumber data dan **kurun waktu data**.
- Masukan data melalui tempel teks, TXT, CSV, atau JSON.
- Tombol **Analisis NLP Sekarang** untuk langsung menuju hasil.
- Analisis sentimen berbasis kamus dan aturan negasi sederhana.
- Klasifikasi topik/kategori berbasis kata kunci yang transparan.
- Ekstraksi kata kunci.
- **Text summarization ekstraktif** dengan pilihan panjang 3, 5, atau 7 teks representatif.
- Wawasan otomatis berdasarkan pola hasil NLP.
- Bukti kuantitatif untuk mendukung wawasan.
- Rekomendasi awal berdasarkan temuan.
- Laporan otomatis yang memuat konteks, sumber data, kurun waktu, ringkasan teks, temuan NLP, wawasan, bukti, rekomendasi, dan keterbatasan.
- Cetak atau simpan laporan sebagai PDF melalui peramban.
- Ekspor hasil sebagai JSON.
- Penyimpanan otomatis menggunakan `localStorage`; data tidak dikirim ke server.

## Teknologi

- Next.js 16.3
- React 19
- JavaScript
- CSS murni
- Tidak memerlukan API eksternal atau kunci API

## Persyaratan

- Node.js 24
- npm

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Build produksi

```bash
npm run build
npm start
```

## Unggah ke GitHub

```bash
git init
git add .
git commit -m "Initial commit: Text2Insight Lab"
git branch -M main
git remote add origin https://github.com/NAMA-PENGGUNA/NAMA-REPOSITORI.git
git push -u origin main
```

## Deploy ke Vercel

1. Masuk ke Vercel menggunakan akun GitHub.
2. Pilih **Add New Project**.
3. Impor repositori Text2Insight Lab.
4. Vercel akan mendeteksi Next.js secara otomatis.
5. Gunakan Node.js 24 sesuai `package.json`.
6. Klik **Deploy**.

Tidak ada variabel lingkungan yang diperlukan.

## Format data

### TXT

Satu teks per baris.

```text
Aplikasi sangat lambat.
Petugas sangat membantu.
Pembayaran saya gagal.
```

### CSV

Gunakan salah satu nama kolom berikut: `teks`, `text`, `content`, `komentar`, `ulasan`, atau `pesan`.

```csv
teks
"Aplikasi sangat lambat."
"Petugas sangat membantu."
```

### JSON

```json
[
  "Aplikasi sangat lambat.",
  "Petugas sangat membantu."
]
```

atau:

```json
[
  {"teks": "Aplikasi sangat lambat."},
  {"teks": "Petugas sangat membantu."}
]
```

## Cara kerja text summarization

Versi ini menggunakan **ringkasan ekstraktif**. Sistem menghitung kata-kata penting dalam keseluruhan data, memberi skor pada setiap teks, kemudian memilih 3, 5, atau 7 teks yang paling representatif. Pendekatan ini sengaja dibuat transparan agar mahasiswa dapat memahami bagaimana ringkasan diperoleh tanpa bergantung pada model generatif eksternal.

## Catatan akademik

Hasil NLP merupakan indikasi awal. Wawasan dan rekomendasi perlu dibaca bersama konteks organisasi dan tidak boleh dianggap sebagai bukti hubungan sebab-akibat tanpa pemeriksaan tambahan.

## Privasi

Seluruh proses utama berjalan di peramban. Data dan proyek tersimpan pada `localStorage`. Jangan memasukkan data pribadi, rahasia, atau data organisasi yang tidak diizinkan.

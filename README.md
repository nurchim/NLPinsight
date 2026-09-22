# Text2Insight Lab

Aplikasi pembelajaran **Natural Language Processing (NLP)** untuk membantu mahasiswa mengubah data teks dan dokumen PDF dari konteks dunia kerja menjadi temuan, ringkasan, wawasan, bukti, rekomendasi, dan laporan.

## Alur aplikasi

1. **Konteks** — isi bidang/tempat kerja, tujuan analisis, sumber data, dan kurun waktu data.
2. **Data Teks atau Dokumen** — tempel teks atau unggah TXT, CSV, JSON, atau PDF.
3. **Hasil dan Laporan** — aplikasi otomatis menjalankan NLP, text summarization, menghasilkan wawasan, bukti, rekomendasi, dan laporan.

## Fitur utama

- Keterangan sumber data dan **kurun waktu data**.
- Masukan melalui tempel teks, TXT, CSV, JSON, dan **PDF**.
- Ekstraksi teks PDF langsung di peramban menggunakan **PDF.js**.
- PDF dipecah menjadi segmen teks agar analisis kata kunci, sentimen, topik, dan ringkasan lebih bermakna.
- Informasi PDF pada hasil: nama berkas, jumlah halaman, halaman yang memiliki teks, karakter, dan jumlah segmen.
- Tombol **Analisis NLP Sekarang** untuk langsung menuju hasil.
- Analisis sentimen berbasis kamus dan aturan negasi sederhana.
- Klasifikasi topik/kategori berbasis kata kunci yang transparan.
- Ekstraksi kata kunci.
- **Peringkasan teks (text summarization) ekstraktif** dengan pilihan panjang 3, 5, atau 7 teks representatif.
- Wawasan otomatis berdasarkan pola hasil NLP.
- Bukti kuantitatif untuk mendukung wawasan.
- Rekomendasi awal berdasarkan temuan.
- Laporan otomatis yang memuat konteks, sumber data, kurun waktu, metadata PDF, ringkasan teks, temuan NLP, wawasan, bukti, rekomendasi, dan keterbatasan.
- Cetak atau simpan laporan sebagai PDF melalui peramban.
- Ekspor hasil sebagai JSON.
- Penyimpanan otomatis menggunakan `localStorage`; isi dokumen tidak diunggah ke server aplikasi.

## Dukungan PDF

Aplikasi memakai paket `pdfjs-dist` (PDF.js) untuk membaca teks dari PDF secara lokal di peramban. Saat `npm install`, skrip `postinstall` akan menyalin worker, CMaps, font standar, dan aset WASM PDF.js ke folder `public/pdfjs` secara otomatis.

Batas versi pembelajaran ini:

- ukuran PDF maksimum: **20 MB**;
- maksimum: **120 halaman** per dokumen;
- maksimum: **800 segmen teks** untuk menjaga aplikasi tetap responsif;
- PDF hasil pindai/gambar tanpa lapisan teks **belum mendukung OCR**. Lakukan OCR terlebih dahulu atau gunakan PDF yang teksnya dapat dipilih/disalin.

## Teknologi

- Next.js 16.3
- React 19
- JavaScript
- CSS murni
- PDF.js / `pdfjs-dist` 6.3.289
- Tidak memerlukan API AI eksternal atau kunci API

## Persyaratan

- Node.js 24
- npm

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

`npm install` otomatis menjalankan `scripts/copy-pdf-worker.mjs` sehingga dukungan PDF siap digunakan.

## Build produksi

```bash
npm run build
npm start
```

## Unggah ke GitHub

```bash
git init
git add .
git commit -m "Text2Insight Lab dengan analisis PDF"
git branch -M main
git remote add origin https://github.com/NAMA-PENGGUNA/NAMA-REPOSITORI.git
git push -u origin main
```

## Deploy ke Vercel

1. Masuk ke Vercel menggunakan akun GitHub.
2. Pilih **Add New Project**.
3. Impor repositori Text2Insight Lab.
4. Vercel mendeteksi Next.js secara otomatis.
5. Gunakan Node.js 24 sesuai `package.json`.
6. Klik **Deploy**.

Tidak ada variabel lingkungan yang diperlukan. Pada proses instalasi, `postinstall` menyiapkan aset PDF.js di `public/pdfjs/`.

## Format data

### PDF

Pilih berkas `.pdf`. Aplikasi mengekstrak teks, memecahnya menjadi segmen, kemudian menjalankan analisis NLP. Dokumen tidak dikirim ke backend aplikasi.

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

Versi ini menggunakan **ringkasan ekstraktif**. Sistem menghitung kata-kata penting dalam keseluruhan data, memberi skor pada setiap segmen, kemudian memilih 3, 5, atau 7 segmen yang paling representatif.

## Catatan akademik

Hasil NLP merupakan indikasi awal. Wawasan dan rekomendasi perlu dibaca bersama konteks organisasi dan tidak boleh dianggap sebagai bukti hubungan sebab-akibat tanpa pemeriksaan tambahan.

## Privasi

Proses analisis utama berjalan di peramban. Data proyek disimpan pada `localStorage` bila kapasitas peramban mencukupi. Jangan memasukkan data pribadi, rahasia, atau data organisasi yang tidak diizinkan.


## Alur 4 Halaman

1. **Konteks** — bidang/tempat kerja, tujuan analisis, sumber data, dan kurun waktu data.
2. **Data / Dokumen** — tempel teks atau unggah TXT, CSV, JSON, dan PDF.
3. **Hasil NLP** — temuan, peringkasan teks, sentimen, topik/istilah, kata kunci, entitas, bukti, wawasan, rekomendasi, serta tombol **Ekspor JSON**.
4. **Laporan** — laporan terstruktur yang siap dibaca dan memiliki tombol **Cetak / Simpan PDF**.

Tombol ekspor JSON hanya tersedia pada halaman Hasil NLP. Tombol Cetak / Simpan PDF hanya tersedia pada halaman Laporan.

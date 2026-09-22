import './globals.css';

export const metadata = {
  title: 'Text2Insight Lab',
  description: 'Laboratorium pembelajaran NLP: dari teks menjadi informasi, wawasan, dan rekomendasi tindakan.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

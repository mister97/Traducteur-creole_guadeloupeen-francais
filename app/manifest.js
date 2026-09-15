export default function manifest() {
  return {
    name: 'Mofwazé – Kréyòl Gwadloupéyen ↔ Fransé',
    short_name: 'Mofwazé',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff8e6',
    theme_color: '#ffcc00',
    icons: [
      { src: '/img/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/img/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}

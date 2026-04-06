self.addEventListener('install', (e) => {
  console.log('[Service Worker] Kuruldu');
});

self.addEventListener('fetch', (e) => {
  // PWA şartını sağlamak için boş bir fetch dinleyicisi yeterli
});
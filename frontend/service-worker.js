self.addEventListener('install', (event) => {
    console.log('Service Worker installed.');
    self.skipWaiting();
  });
  
  self.addEventListener('activate', (event) => {
    console.log('Service Worker activated.');
  });
  
  self.addEventListener('fetch', (event) => {
    // No offline support – everything goes to the network
  });
  

  self.addEventListener('install', (e) => {
    self.skipWaiting(); // 🚀 Forces the new service worker to activate immediately
  });
  
  self.addEventListener('activate', (e) => {
    clients.claim(); // 🚀 Takes control of all pages
  });
  
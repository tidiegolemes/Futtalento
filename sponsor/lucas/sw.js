const CACHE='ft-jornada-shell-v1';
const SHELL=['/sponsor/lucas/','/sponsor/lucas/jornada.css','/sponsor/lucas/jornada.js','/sponsor/lucas/calendario.js','/futtalentologo.png','/favicon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ft-jornada-shell-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(url.pathname.startsWith('/api/')||url.pathname.includes('/gestao/')||url.pathname.includes('/password')||url.pathname.includes('/login'))return;
 if(!SHELL.includes(url.pathname))return;
 event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(request,copy)).catch(()=>{});}return response;}).catch(()=>caches.match(request)));
});

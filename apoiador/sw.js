const NAME='ft-apoiador-shell-v1';
const SHELL=['/apoiador/','/apoiador/painel.css','/apoiador/painel.js','/sponsor/lucas/jornada.css','/futtalentologo.png','/favicon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(NAME).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ft-apoiador-shell-')&&k!==NAME).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
const req=event.request,url=new URL(req.url);
if(req.method!=='GET'||url.origin!==self.location.origin||!SHELL.includes(url.pathname))return;
event.respondWith(fetch(req).then(response=>{if(response.ok)caches.open(NAME).then(c=>c.put(req,response.clone())).catch(()=>{});return response;}).catch(()=>caches.match(req)));
});
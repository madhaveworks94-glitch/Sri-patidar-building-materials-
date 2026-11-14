// Offline cache. Bump the version number whenever any web file changes.
const V='pa-v4';
const FILES=['./','index.html','styles.css','app.js','util.js','store.js','calc.js','settings.js','sales.js','ledgerpdf.js','pdftools.js','analysis.js','invoices.js','invcalc.js','invdoc.js','stock.js','purchases.js','pdfimport.js','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
// Network first: you always get the newest uploaded files when online. The cache is only used when offline.
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;
 const u=new URL(r.url),cdn=u.hostname==='cdnjs.cloudflare.com';
 if(u.origin!==location.origin&&!cdn)return;
 e.respondWith(fetch(r,{cache:cdn?'default':'no-cache'}).then(res=>{if(res&&res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r,{ignoreSearch:true})));
});

// Offline cache. Bump the version number whenever any web file changes.
const V='pa-v3';
const FILES=['./','index.html','styles.css','app.js','util.js','store.js','calc.js','settings.js','sales.js','ledgerpdf.js','pdftools.js','analysis.js','invoices.js','invcalc.js','invdoc.js','stock.js','purchases.js','pdfimport.js','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;
 const u=new URL(r.url),cdn=u.hostname==='cdnjs.cloudflare.com';
 if(u.origin!==location.origin&&!cdn)return;
 e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>{
  const net=fetch(r).then(res=>{if(res&&res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>hit);
  return hit||net}));
});

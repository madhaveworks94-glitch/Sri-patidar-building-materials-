import {db,save,uid} from './store.js';
const num=v=>parseFloat(v)||0,fmt=n=>String(Math.round(n*100)/100);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const UN=/^(bags?|kgs?|pcs?|nos?|tons?|mt|qtl|quintals?|cft|trolleys?|sq\.?ft|ltrs?|litres?|box(es)?|bundles?|rolls?|mtr|meters?)$/i;
const UMAP={bags:'bag',kgs:'kg',pc:'pcs',no:'pcs',nos:'pcs',tons:'ton',mt:'ton',quintals:'quintal',qtl:'quintal',trolleys:'trolley',ltrs:'ltr',litres:'ltr',litre:'ltr',boxes:'box',bundles:'bundle',rolls:'roll',meters:'meter',mtr:'meter'};
const normU=u=>{u=u.toLowerCase().replace(/\.$/,'');return UMAP[u]||u};
const numOf=s=>/^-?[\d,]+(\.\d+)?$/.test(s)?parseFloat(s.replace(/,/g,'')):null;
const SKIP=/total|subtotal|grand|cgst|sgst|igst|round|discount|freight|balance|amount in words/i;

export function parseLine(cells){
 const toks=[];cells.forEach(c=>{const m=c.match(/^([\d,]+(?:\.\d+)?)\s*([A-Za-z.]+)$/);if(m&&UN.test(m[2]))toks.push(m[1],m[2]);else toks.push(c)});
 const nums=[];toks.forEach(t=>{const v=numOf(t);if(v!==null)nums.push(v)});
 if(nums.length<3)return null;
 const name=toks.filter(t=>numOf(t)===null&&!UN.test(t)&&/[A-Za-z]{3,}/.test(t)).sort((a,b)=>b.length-a.length)[0];
 if(!name||SKIP.test(name))return null;
 let best=null;
 for(const f of [1,1.05,1.12,1.18,1.28]){
  for(let k=nums.length-1;k>=2&&!best;k--)for(let i=0;i<k&&!best;i++)for(let j=i+1;j<k;j++){
   const a=nums[i],b=nums[j];if(a>0&&b>0&&Math.abs(a*b*f-nums[k])<=Math.max(1,nums[k]*0.01)){best={q:a,r:b,i,j,k};break}}
  if(best)break;
 }
 if(!best)return null;
 const g=nums.find((v,x)=>x!==best.i&&x!==best.j&&x!==best.k&&[5,12,18,28].includes(v));
 const u=toks.find(t=>UN.test(t));
 return{n:name.trim(),q:best.q,u:u?normU(u):'',r:best.r,g:g||''};
}

let lib;
async function pdfjs(){if(lib)return lib;await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s.onload=ok;s.onerror=()=>no(new Error('offline'));document.head.appendChild(s)});window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';return lib=window.pdfjsLib}
async function readLines(file){
 const doc=await (await pdfjs()).getDocument({data:await file.arrayBuffer()}).promise,lines=[];
 for(let p=1;p<=Math.min(doc.numPages,10);p++){
  const tc=await (await doc.getPage(p)).getTextContent(),rows=[];
  tc.items.forEach(it=>{if(!it.str.trim())return;const y=it.transform[5];let r=rows.find(x=>Math.abs(x.y-y)<=3);if(!r){r={y,c:[]};rows.push(r)}r.c.push({x:it.transform[4],w:it.width,s:it.str.trim()})});
  rows.sort((a,b)=>b.y-a.y).forEach(r=>{r.c.sort((a,b)=>a.x-b.x);const cells=[];r.c.forEach(it=>{const l=cells[cells.length-1];if(l&&it.x-l.end<6){l.s+=' '+it.s;l.end=it.x+it.w}else cells.push({s:it.s,end:it.x+it.w})});lines.push(cells.map(c=>c.s))});
 }
 return lines;
}

const words=s=>new Set(String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w.length>1));
function match(name){const a=words(name);if(!a.size)return null;let best=null,bs=0;db.products.forEach(p=>{const b=words(p.name);let n=0;a.forEach(w=>{if(b.has(w))n++});const s=n/Math.min(a.size,b.size||1);if(s>bs){bs=s;best=p}});return bs>=0.6?best:null}
const per=(p,u)=>(p.units.find(x=>x.name===u)||{per:1}).per;

export function mountImport(root,onDone){
 const $=s=>root.querySelector(s);let rows=[],fname='',note='';
 const pick=(m)=>{root.innerHTML=`<div class="bl"><button class="link" id="x-back" style="margin:0 0 8px">← Back to inventory</button><h1>Import invoice</h1><div class="card"><p class="mute" style="margin-top:0">Choose the supplier invoice PDF. I will read the items, and you check them before stock changes. Works with PDFs made on a computer or app, not photos or scans.</p><label>Invoice PDF</label><input id="x-file" type="file" accept="application/pdf"><div class="bl-msg" id="x-msg">${esc(m||'')}</div></div></div>`;
  $('#x-back').onclick=onDone;
  $('#x-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;fname=f.name;$('#x-msg').style.color='var(--mute)';$('#x-msg').textContent='Reading the PDF…';
   try{const lines=await readLines(f);if(!lines.length)return pick('No text found. This looks like a photo or scan. Use Add item, or type the rows below.');
    rows=lines.map(parseLine).filter(Boolean).map(x=>({on:'1',n:x.n,q:x.q,u:x.u,r:x.r,g:x.g,sell:''}));review(rows.length?'':'I could not find item rows in this PDF. Add them by hand below.')}
   catch(err){pick(err.message==='offline'?'Could not load the PDF reader. Check your internet and try again.':'Could not read this PDF.')}};};
 const rowH=(x,i)=>{const p=match(x.n),f=`data-i="${i}" data-f`;const units=p?p.units.map(u=>u.name):null;
  return`<div class="bl-row"><div style="display:flex;gap:8px;align-items:center;justify-content:space-between"><span class="pill" style="${p?'':'color:var(--or)'}">${p?'Existing: '+esc(p.name):'New item'}</span><select ${f}="on" style="width:auto"><option value="1" ${x.on==='1'?'selected':''}>Add to stock</option><option value="0" ${x.on==='0'?'selected':''}>Skip</option></select></div>
  <input ${f}="n" value="${esc(x.n)}" placeholder="Item name" style="margin-top:8px"><div class="bl-3"><input ${f}="q" inputmode="decimal" value="${x.q}" placeholder="Qty">${units?`<select ${f}="u">${units.map(u=>`<option ${u===(units.includes(x.u)?x.u:p.baseUnit)?'selected':''}>${esc(u)}</option>`).join('')}</select>`:`<input ${f}="u" value="${esc(x.u||'pcs')}" placeholder="Unit">`}<input ${f}="r" inputmode="decimal" value="${x.r}" placeholder="Buy rate ₹"></div>${p?'':`<label>Selling rate for this new item (₹)</label><input ${f}="sell" inputmode="decimal" value="${x.sell||x.r}">`}</div>`};
 const review=(m)=>{root.innerHTML=`<div class="bl"><button class="link" id="x-back" style="margin:0 0 8px">← Cancel</button><h1>Check items</h1><p class="mute">${esc(fname)}. Fix anything wrong. Stock changes only when you confirm.</p><div id="x-rows">${rows.map(rowH).join('')}</div><button class="btn ghost" id="x-add" type="button">+ Add row</button><label>Note (supplier, bill number)</label><input id="x-note" value="${esc(note)}"><div class="bl-msg" id="x-msg">${esc(m||'')}</div><button class="btn dark" id="x-ok" type="button">Confirm and update stock</button></div>`;
  $('#x-back').onclick=onDone;
  root.onclick=e=>{const t=e.target;
   if(t.id==='x-add'){rows.push({on:'1',n:'',q:'',u:'',r:'',g:'',sell:''});$('#x-rows').innerHTML=rows.map(rowH).join('')}
   else if(t.id==='x-ok')apply()};
  root.oninput=e=>{const d=e.target.dataset;if(d.f)rows[d.i][d.f]=e.target.value;else if(e.target.id==='x-note')note=e.target.value};
  root.onchange=e=>{const d=e.target.dataset;if(d.f==='n'||d.f==='u'||d.f==='on'){rows[d.i][d.f]=e.target.value;if(d.f!=='on')$('#x-rows').innerHTML=rows.map(rowH).join('')}};
 };
 const apply=()=>{
  const use=rows.filter(x=>x.on==='1'&&num(x.q)>0&&x.n.trim());if(!use.length)return $('#x-msg').textContent='Nothing to add. Check the quantities.';
  let made=0;const log=(db.stockLog=db.stockLog||[]);
  use.forEach(x=>{let p=match(x.n);const u=(x.u||'pcs').trim()||'pcs';
   if(!p){p={id:uid(),name:x.n.trim(),baseUnit:u,units:[{name:u,per:1}],stock:0,rate:num(x.sell)||num(x.r),gst:num(x.g)||18,low:0,cost:0};db.products.push(p);made++}
   const k=per(p,p.units.some(y=>y.name===u)?u:p.baseUnit),qb=num(x.q)*k,c=num(x.r)/k,old=Math.max(p.stock,0);
   if(c>0)p.cost=old+qb>0?(old*(p.cost||0)+qb*c)/(old+qb):c;
   p.stock+=qb;log.push({id:uid(),pid:p.id,qty:qb,type:'in',note:note||fname,cost:c,date:Date.now()})});
  save();root.innerHTML=`<div class="bl"><h1>Stock updated</h1><div class="card"><p>${use.length} items added to stock${made?`, ${made} of them new. Open each new item to check its selling rate and low-stock level.`:'.'}</p></div><button class="btn dark" id="x-done" type="button">Back to inventory</button></div>`;
  root.onclick=e=>{if(e.target.id==='x-done')onDone()};
 };
 pick();
}

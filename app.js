import {db,save,seed,clearAll,inr,dateFmt} from './store.js';
import {mountBilling} from './billing.js';
import {mountKhata} from './khata.js';
import {mountStock} from './inventory.js';
import {mountFleet} from './fleet.js';
import {mountReports} from './reports.js';
import {mountBackup} from './backup.js';
const $=s=>document.querySelector(s);
const P={home:'M3 11l9-8 9 8v10h-6v-6H9v6H3z',receipt:'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',book:'M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11',box:'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',truck:'M2 6h11v10H2zM13 10h5l3 3v3h-8zM6 19h.01M17 19h.01',chart:'M4 20V10M10 20V4M16 20v-7M22 20H2'};
const ic=n=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${P[n]}"/></svg>`;
const NAV=[['overview','Overview','home'],['billing','Billing','receipt'],['khata','Khata','book'],['stock','Inventory','box'],['fleet','Fleet','truck'],['reports','Reports','chart']];
const STEP={billing:'Step 2: GST / Kachha billing',khata:'Step 3: Khata ledger',stock:'Step 4: Multi-unit inventory and PDF import',fleet:'Step 5: Fleet and trips',reports:'Step 6: Analytics'};

const sod=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
const due=b=>Math.max(b.total-b.paid,0);

function chart(){
 const days=[...Array(7)].map((_,i)=>{const s=sod(Date.now()-(6-i)*864e5);const bs=db.bills.filter(b=>sod(b.date)===s);
  return{l:new Date(s).toLocaleDateString('en-IN',{weekday:'short'}),cash:bs.reduce((a,b)=>a+b.paid,0),due:bs.reduce((a,b)=>a+due(b),0)}});
 const W=340,H=170,max=Math.max(1,...days.map(d=>Math.max(d.cash,d.due))),g=W/7,bw=14,y=v=>(H-26)*(v/max);
 return`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Cash received and udhaar given, last 7 days"><defs><pattern id="h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#f26a21"/><rect width="2.5" height="6" fill="#ffb98f"/></pattern></defs>`+
 days.map((d,i)=>{const x=i*g+g/2-bw-1;return`<rect x="${x}" y="${H-22-y(d.cash)}" width="${bw}" height="${y(d.cash)}" rx="4" fill="#141414"/><rect x="${x+bw+2}" y="${H-22-y(d.due)}" width="${bw}" height="${y(d.due)}" rx="4" fill="url(#h)"/><text x="${i*g+g/2}" y="${H-6}" text-anchor="middle" font-size="11" fill="#7b7b78">${d.l}</text>`}).join('')+`</svg>`;
}

function overview(){
 const today=db.bills.filter(b=>sod(b.date)===sod(Date.now())),wk=db.bills.filter(b=>b.date>=sod(Date.now())-6*864e5);
 const owed=db.bills.reduce((a,b)=>a+due(b),0),low=db.products.filter(p=>p.stock<=p.low).length;
 const h=new Date().getHours(),g=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
 const rows=db.bills.slice(0,6).map(b=>`<tr><td>#${b.no}</td><td>${b.customerName}</td><td class="hide-m"><span class="tag ${b.type==='gst'?'gst':''}">${b.type==='gst'?'GST':'Kachha'}</span></td><td>${inr(b.total)}</td><td class="st ${due(b)?'bad':'ok'}">${due(b)?inr(due(b))+' due':'Paid'}</td><td class="hide-m">${dateFmt(b.date)}</td></tr>`).join('');
 return`<h1>${g}, ${db.shop.owner}</h1><p class="sub">${db.shop.name}. Today’s money, udhaar and stock in one place.</p>
 ${(db.bills.length&&(!db.lastBackup||Date.now()-db.lastBackup>6048e5))?`<a class="card" href="#/backup" style="display:block;margin-bottom:12px;text-decoration:none;color:inherit"><b>Back up your data</b><br><small class="mute">Last backup: ${db.lastBackup?dateFmt(db.lastBackup):'never'}. Tap to save a copy.</small></a>`:''}
 <div class="grid">
  <div class="card span2 wide"><h3>Udhaar to collect</h3><div class="num">${inr(owed)}</div><div class="btns"><a class="btn dark" href="#/billing">New bill</a><a class="btn ghost" href="#/khata">Receive payment</a></div></div>
  <div class="card hero"><h3>Today’s sales</h3><div class="num">${inr(today.reduce((a,b)=>a+b.total,0))}</div><span class="pill">${today.length} bills</span></div>
  <div class="card"><h3>Cash this week</h3><div class="num">${inr(wk.reduce((a,b)=>a+b.paid,0))}</div><span class="pill">${wk.length} bills</span></div>
  <div class="card"><h3>Low stock</h3><div class="num">${low}</div><span class="pill">${db.products.length} items</span></div>
  <div class="card"><h3>Vehicles on trip</h3><div class="num">${db.trips.filter(t=>!t.done).length}</div><span class="pill">${db.vehicles.length} vehicles</span></div>
  <div class="card span2 wide"><h3>Last 7 days</h3><div class="legend"><span><i style="background:#141414"></i>Cash received</span><span><i style="background:#f26a21"></i>Udhaar given</span></div>${chart()}</div>
  <div class="card wide" style="grid-column:1/-1"><h3>Recent bills</h3>${rows?`<table><tr><th>Bill</th><th>Customer</th><th class="hide-m">Type</th><th>Amount</th><th>Status</th><th class="hide-m">Date</th></tr>${rows}</table>`:`<div class="empty">No bills yet.<br><button class="btn dark" id="seed" style="margin:12px auto 0;max-width:240px">Load sample data</button></div>`}</div>
 </div>${db.bills.length?'<button class="link" id="clear">Clear all data</button>':''}`;
}

function render(){
 const r=(location.hash.replace('#/','')||'overview'),k=NAV.find(n=>n[0]===r)?r:r==='backup'?'backup':'overview';
 $('#nav').innerHTML=NAV.map(([id,l,i])=>`<a href="#/${id}" class="${id===k?'on':''}">${ic(i)}<span>${l}</span></a>`).join('');
 $('#shopname').textContent=db.shop.name;$('#me').textContent=db.shop.owner[0];$('#me').onclick=()=>{location.hash='#/backup'};
 if(k==='billing')mountBilling($('#view'));else if(k==='khata')mountKhata($('#view'));else if(k==='stock')mountStock($('#view'));else if(k==='fleet')mountFleet($('#view'));else if(k==='reports')mountReports($('#view'));else if(k==='backup')mountBackup($('#view'));else $('#view').innerHTML=k==='overview'?overview():`<h1>${NAV.find(n=>n[0]===k)[1]}</h1><div class="card soon"><b>${STEP[k]}</b><p class="sub">Coming in the next step.</p></div>`;
 if($('#seed'))$('#seed').onclick=()=>{seed();render()};
 if($('#clear'))$('#clear').onclick=e=>{if(e.target.dataset.a){clearAll();render()}else{e.target.dataset.a=1;e.target.textContent='Tap again to delete everything'}};
}
addEventListener('hashchange',render);render();

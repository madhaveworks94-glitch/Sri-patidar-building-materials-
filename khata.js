import {db,save,uid,inr,dateFmt} from './store.js';
document.head.insertAdjacentHTML('beforeend','<style>button.kh{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;text-align:left;font:inherit;color:inherit;margin-bottom:10px;cursor:pointer}.kh-r{padding:10px 0;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:12px}.kh-r small{color:var(--mute)}</style>');
const num=v=>parseFloat(v)||0;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const due=b=>Math.max(b.total-b.paid,0);
const pays=()=>db.ledger.filter(l=>l.type==='payment');
const opens=c=>db.ledger.filter(l=>l.type==='opening'&&l.customerId===c);
const bal=c=>db.bills.filter(b=>b.customerId===c).reduce((s,b)=>s+due(b),0)+opens(c).reduce((s,o)=>s+o.left,0);
let root,sel=null,q='',msg='';
const $=s=>root.querySelector(s);

function receive(cid,amt,mode){
 let left=amt;const allocs=[];
 const items=[...db.bills.filter(b=>b.customerId===cid&&due(b)>0).map(b=>({k:'bill',id:b.id,date:b.date,o:b})),...opens(cid).filter(o=>o.left>0).map(o=>({k:'open',id:o.id,date:o.date,o}))].sort((a,b)=>a.date-b.date);
 for(const it of items){if(left<=0)break;const x=Math.min(it.k==='bill'?due(it.o):it.o.left,left);if(it.k==='bill')it.o.paid+=x;else it.o.left-=x;allocs.push({k:it.k,id:it.id,amt:x});left-=x}
 db.ledger.push({id:uid(),customerId:cid,type:'payment',amount:amt-left,mode,date:Date.now(),allocs});save();
}
function undo(cid){
 const p=pays().filter(x=>x.customerId===cid).sort((a,b)=>b.date-a.date)[0];if(!p)return false;
 p.allocs.forEach(a=>{if(a.k==='bill'){const b=db.bills.find(x=>x.id===a.id);if(b)b.paid-=a.amt}else{const o=db.ledger.find(x=>x.id===a.id);if(o)o.left+=a.amt}});
 db.ledger=db.ledger.filter(x=>x!==p);save();return true;
}
function stmt(cid){
 const al=(k,id)=>pays().flatMap(p=>p.allocs).filter(a=>a.k===k&&a.id===id).reduce((s,a)=>s+a.amt,0),ev=[];
 db.bills.filter(b=>b.customerId===cid).forEach(b=>{const s0=b.paid-al('bill',b.id);ev.push({d:b.date,t:'Bill '+(b.inv||'#'+b.no),n:s0>0?'Paid '+inr(s0)+' at sale':'',dr:b.total-s0})});
 opens(cid).forEach(o=>ev.push({d:o.date,t:'Old balance',n:o.note||'',dr:o.amount}));
 pays().filter(p=>p.customerId===cid).forEach(p=>ev.push({d:p.date,t:'Payment received',n:p.mode,cr:p.amount}));
 ev.sort((a,b)=>a.d-b.d);let r=0;ev.forEach(e=>{r+=(e.dr||0)-(e.cr||0);e.r=r});return ev.reverse();
}

function list(){
 const rows=db.customers.map(c=>({c,b:bal(c.id)})).filter(x=>q?x.c.name.toLowerCase().includes(q.toLowerCase()):x.b>0).sort((a,b)=>b.b-a.b);
 const tot=db.customers.reduce((s,c)=>s+bal(c.id),0),n=db.customers.filter(c=>bal(c.id)>0).length;
 root.innerHTML=`<div class="bl"><h1>Khata</h1><p class="mute">Who owes you money.</p>
 <div class="card hero"><h3>Total to collect</h3><div class="num">${inr(tot)}</div><span class="pill">${n} customers</span></div>
 <label>Search customer</label><input id="kh-q" value="${esc(q)}" placeholder="Name">
 <div style="margin-top:12px">${rows.length?rows.map(({c,b})=>`<button class="card kh" data-c="${c.id}"><span><b>${esc(c.name)}</b><br><small class="mute">${esc(c.phone||'No phone')}</small></span><b class="${b>0?'bad':'ok'}">${b>0?inr(b):'Settled'}</b></button>`).join(''):'<p class="mute">No customers with udhaar.</p>'}</div>
 <button class="btn ghost" id="kh-old" type="button">+ Add old udhaar</button><div id="kh-form"></div></div>`;
 $('#kh-q').oninput=e=>{q=e.target.value;const p=e.target.selectionStart;list();const i=$('#kh-q');i.focus();i.setSelectionRange(p,p)};
 root.onclick=e=>{const t=e.target,c=t.closest('[data-c]');
  if(c){sel=c.dataset.c;msg='';detail()}
  else if(t.id==='kh-old')$('#kh-form').innerHTML=`<div class="card" style="margin-top:10px"><label>Customer name</label><input id="o-n" list="o-l"><datalist id="o-l">${db.customers.map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist><label>Phone (optional)</label><input id="o-p" type="tel" inputmode="numeric"><label>Old balance (₹)</label><input id="o-a" inputmode="decimal"><label>Note (optional)</label><input id="o-t" placeholder="From the old register"><div class="bl-msg" id="o-m"></div><button class="btn dark" id="o-s" type="button">Save</button></div>`;
  else if(t.id==='o-s'){const n=$('#o-n').value.trim(),a=num($('#o-a').value);if(!n||a<=0)return $('#o-m').textContent='Enter the name and a balance above zero.';
   let c=db.customers.find(x=>x.name.toLowerCase()===n.toLowerCase());if(!c){c={id:uid(),name:n,phone:''};db.customers.push(c)}
   if($('#o-p').value.trim())c.phone=$('#o-p').value.replace(/\D/g,'');
   db.ledger.push({id:uid(),customerId:c.id,type:'opening',amount:a,left:a,note:$('#o-t').value.trim(),date:Date.now()});save();sel=c.id;detail()}
 };
}

function detail(){
 const c=db.customers.find(x=>x.id===sel);if(!c){sel=null;return list()}
 const b=bal(c.id),ph=(c.phone||'').replace(/\D/g,''),shop=db.shop.name;
 const t=`Namaste ${c.name} ji, ${shop} mein aapka ${inr(b)} baaki hai. Kripya jaldi bhugtan karein. Dhanyavaad.`;
 const wa=`https://wa.me/${ph.length===10?'91'+ph:ph}?text=${encodeURIComponent(t)}`;
 root.innerHTML=`<div class="bl"><button class="link" id="kh-back" style="margin:0 0 8px">← All customers</button><h1 style="margin:0">${esc(c.name)}</h1><div class="mute">${esc(c.phone||'No phone saved')}</div>
 <div class="card" style="margin-top:12px"><h3>Balance</h3><div class="num ${b>0?'bad':'ok'}">${b>0?inr(b):'Settled'}</div>
 ${b>0?`<div class="btns"><button class="btn dark" id="kh-pay" type="button">Receive payment</button><a class="btn ghost" target="_blank" rel="noopener" href="${wa}">Remind</a></div>`:''}<div id="kh-panel"></div><div class="bl-msg" id="kh-msg">${esc(msg)}</div></div>
 <h3 class="mute" style="margin:16px 4px 4px">Statement</h3><div class="card">${stmt(c.id).map(e=>`<div class="kh-r"><span><b>${esc(e.t)}</b><br><small>${dateFmt(e.d)}${e.n?', '+esc(e.n):''}</small></span><span style="text-align:right"><b class="${e.cr?'ok':''}">${e.cr?'− '+inr(e.cr):'+ '+inr(e.dr)}</b><br><small>Balance ${inr(e.r)}</small></span></div>`).join('')||'<p class="mute">No activity yet.</p>'}</div>
 <button class="btn ghost" id="kh-undo" type="button" style="margin-top:12px">Undo last payment</button></div>`;
 root.onclick=e=>{const t=e.target;
  if(t.id==='kh-back'){sel=null;list()}
  else if(t.id==='kh-pay')$('#kh-panel').innerHTML=`<label>Amount received (₹)</label><input id="p-a" inputmode="decimal" value="${b}"><label>Mode</label><select id="p-m"><option>Cash</option><option>UPI</option><option>Cheque</option><option>Bank transfer</option></select><button class="btn dark" id="p-s" type="button" style="margin-top:10px;width:100%">Save payment</button>`;
  else if(t.id==='p-s'){const a=num($('#p-a').value);if(a<=0){msg='Enter the amount received.';return detail()}
   receive(c.id,Math.min(a,b),$('#p-m').value);msg=a>b?`Saved ${inr(b)}. The extra ${inr(a-b)} was not recorded because advances are not supported yet.`:'Payment saved.';detail()}
  else if(t.id==='kh-undo'){msg=undo(c.id)?'Last payment undone.':'No payment to undo.';detail()}
 };
}
export function mountKhata(r){root=r;sel?detail():list()}

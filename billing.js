import {db,save,uid,inr} from './store.js';
document.head.insertAdjacentHTML('beforeend',`<style>
.seg{display:flex;background:#fff;border-radius:99px;padding:4px;gap:4px;margin:10px 0}
.seg button{flex:1;min-height:42px;border:0;border-radius:99px;background:none;font:700 14px Hind,system-ui,sans-serif;color:var(--mute)}
.seg button.on{background:var(--ink);color:#fff}
.bl label{display:block;font-size:13px;color:var(--mute);margin:10px 0 4px}
.bl input,.bl select{width:100%;min-height:46px;font:inherit;color:var(--ink);background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:10px}
.bl .btn{width:100%;margin-top:10px}
.bl-row{background:var(--card);border:1px solid #fff;border-radius:18px;padding:10px;margin-bottom:10px}
.bl-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px}
.bl-ft{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:6px}
.bl-ft label{display:flex;align-items:center;gap:6px;margin:0}.bl-ft label input{width:64px;min-height:38px}
.bl-ft button{border:0;background:none;font-size:24px;color:var(--mute)}
.bl-l{display:flex;justify-content:space-between;padding:6px 0}.bl-l.big{font-size:20px;border-top:1px solid var(--line);margin-top:4px}
.bad{color:var(--bad)}.ok{color:var(--ok)}.mute{color:var(--mute);font-size:14px}
.bl-msg{color:var(--bad);font-weight:600;margin-top:8px}
@media print{.top,nav,.noprint{display:none!important}body{background:#fff}.card{border:0}}
</style>`);
const num=v=>parseFloat(v)||0;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const blank=()=>({n:'',q:'',u:'',r:'',g:18});
let st=null,root=null;
const fresh=()=>{st={type:st?st.type:'gst',cust:'',phone:'',gstin:'',paid:'',rows:[blank()]}};
const prod=n=>db.products.find(p=>p.name.toLowerCase()===String(n).trim().toLowerCase());
const per=(p,u)=>(p.units.find(x=>x.name===u)||{per:1}).per;
function calc(){let sub=0,tax=0;st.rows.forEach(x=>{const a=num(x.q)*num(x.r);sub+=a;if(st.type==='gst')tax+=a*num(x.g)/100});const total=sub+tax,paid=Math.min(num(st.paid),total);return{sub,tax,total,paid,bal:total-paid}}
const $=s=>root.querySelector(s);

const rowH=(x,i)=>{const p=prod(x.n),f=`data-i="${i}" data-f`;return`<div class="bl-row"><input list="bl-p" ${f}="n" value="${esc(x.n)}" placeholder="Item (cement, sand, bricks…)" autocomplete="off"><div class="bl-3"><input ${f}="q" inputmode="decimal" value="${esc(x.q)}" placeholder="Qty">${p?`<select ${f}="u">${p.units.map(u=>`<option ${u.name===x.u?'selected':''}>${esc(u.name)}</option>`).join('')}</select>`:`<input ${f}="u" value="${esc(x.u)}" placeholder="Unit">`}<input ${f}="r" inputmode="decimal" value="${esc(x.r)}" placeholder="Rate ₹"></div><div class="bl-ft">${st.type==='gst'?`<label>GST %<input ${f}="g" inputmode="decimal" value="${x.g}"></label>`:'<span></span>'}<b id="bl-a${i}">${inr(num(x.q)*num(x.r))}</b><button type="button" data-rm="${i}" aria-label="Remove item">×</button></div></div>`};
const rowsH=()=>st.rows.map(rowH).join('');
function lines(){const c=calc();$('#bl-lines').innerHTML=`<div class="bl-l"><span>Subtotal</span><b>${inr(c.sub)}</b></div>${st.type==='gst'?`<div class="bl-l"><span>CGST</span><b>${inr(c.tax/2)}</b></div><div class="bl-l"><span>SGST</span><b>${inr(c.tax/2)}</b></div>`:''}<div class="bl-l big"><span>Total</span><b>${inr(c.total)}</b></div>`;$('#bl-bal').innerHTML=`<span>Balance (udhaar)</span><b class="${c.bal>0?'bad':'ok'}">${inr(c.bal)}</b>`}

export function mountBilling(r){
 root=r;if(!st)fresh();const g=st.type==='gst';
 root.innerHTML=`<div class="bl"><h1>New bill</h1><div class="seg"><button data-t="gst" class="${g?'on':''}">GST invoice</button><button data-t="kachha" class="${!g?'on':''}">Kachha bill</button></div>
 <p class="mute">${g?'GST is added on top of the rate. Use this for contractors who need a tax invoice.':'No GST. Use this for walk-in customers and estimates.'}</p>
 <div class="card"><label>Customer</label><input id="bl-c" list="bl-cs" value="${esc(st.cust)}" placeholder="Name (empty for walk-in)" autocomplete="off"><label>Phone (optional)</label><input id="bl-ph" type="tel" inputmode="numeric" value="${esc(st.phone)}">
 ${g?`<label>Customer GSTIN</label><input id="bl-gi" value="${esc(st.gstin)}" placeholder="Optional for small buyers"><label>Your shop GSTIN</label><input id="bl-sg" value="${esc(db.shop.gstin||'')}" placeholder="15-character GSTIN">`:''}</div>
 <h3 class="mute" style="margin:14px 4px 6px">Items</h3><div id="bl-rows">${rowsH()}</div><button class="btn ghost" id="bl-add" type="button">+ Add item</button>
 <div class="card" style="margin-top:12px"><div id="bl-lines"></div><label>Paid now (₹)</label><input id="bl-pd" inputmode="decimal" value="${esc(st.paid)}" placeholder="0"><button class="btn ghost" id="bl-full" type="button">Paid in full</button><div class="bl-l" id="bl-bal" style="margin-top:6px"></div></div>
 <div class="bl-msg" id="bl-msg"></div><button class="btn dark" id="bl-save" type="button">Save bill</button>
 <datalist id="bl-p">${db.products.map(p=>`<option value="${esc(p.name)}">`).join('')}</datalist><datalist id="bl-cs">${db.customers.map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist></div>`;
 lines();
 root.onclick=e=>{const t=e.target,d=t.dataset;
  if(d.t){st.type=d.t;mountBilling(root)}
  else if(d.rm!=null){st.rows.splice(d.rm,1);if(!st.rows.length)st.rows.push(blank());$('#bl-rows').innerHTML=rowsH();lines()}
  else if(t.id==='bl-add'){st.rows.push(blank());$('#bl-rows').innerHTML=rowsH()}
  else if(t.id==='bl-full'){st.paid=String(calc().total);$('#bl-pd').value=st.paid;lines()}
  else if(t.id==='bl-save')saveBill();
 };
 root.oninput=e=>{const t=e.target,d=t.dataset;
  if(d.f){st.rows[d.i][d.f]=t.value;const a=$('#bl-a'+d.i);if(a)a.textContent=inr(num(st.rows[d.i].q)*num(st.rows[d.i].r));lines()}
  else if(t.id==='bl-c')st.cust=t.value;else if(t.id==='bl-ph')st.phone=t.value;else if(t.id==='bl-gi')st.gstin=t.value;
  else if(t.id==='bl-sg'){db.shop.gstin=t.value.trim().toUpperCase();save()}
  else if(t.id==='bl-pd'){st.paid=t.value;lines()}
 };
 root.onchange=e=>{const t=e.target,d=t.dataset;
  if(d.f==='n'){const x=st.rows[d.i],p=prod(x.n);if(p){x.u=x.u&&p.units.some(u=>u.name===x.u)?x.u:p.baseUnit;x.r=String(p.rate*per(p,x.u));x.g=p.gst;$('#bl-rows').innerHTML=rowsH();lines();const q=root.querySelector(`[data-i="${d.i}"][data-f="q"]`);if(q)q.focus()}}
  else if(d.f==='u'){const x=st.rows[d.i],p=prod(x.n);if(p){x.r=String(p.rate*per(p,x.u));$('#bl-rows').innerHTML=rowsH();lines()}}
  else if(t.id==='bl-c'){const c=db.customers.find(x=>x.name.toLowerCase()===st.cust.trim().toLowerCase());if(c&&c.phone&&!st.phone){st.phone=c.phone;$('#bl-ph').value=c.phone}}
 };
}

function saveBill(){
 const msg=t=>{$('#bl-msg').textContent=t};
 const items=st.rows.filter(x=>x.n.trim()&&num(x.q)*num(x.r)>0).map(x=>{const p=prod(x.n);return{pid:p?p.id:'',name:x.n.trim(),qty:num(x.q),unit:x.u||(p?p.baseUnit:'pcs'),rate:num(x.r),gst:st.type==='gst'?num(x.g):0}});
 if(!items.length)return msg('Add at least one item with quantity and rate.');
 const c=calc(),name=st.cust.trim();
 if(c.bal>0&&!name)return msg('Enter the customer name to record udhaar.');
 let cu=name&&db.customers.find(x=>x.name.toLowerCase()===name.toLowerCase());
 if(name&&!cu){cu={id:uid(),name,phone:st.phone};db.customers.push(cu)}
 const k=st.type;db.seq[k]=db.seq[k]||1;
 const b={id:uid(),no:db.seq.bill++,inv:(k==='gst'?'INV-':'EST-')+String(db.seq[k]++).padStart(3,'0'),type:k,customerId:cu?cu.id:'',customerName:name||'Walk-in',phone:st.phone,gstin:st.gstin,items,sub:c.sub,tax:c.tax,total:c.total,paid:c.paid,date:Date.now()};
 items.forEach(it=>{const p=db.products.find(x=>x.id===it.pid);if(p)p.stock-=it.qty*per(p,it.unit)});
 if(c.bal>0)db.ledger.push({id:uid(),customerId:cu.id,billId:b.id,type:'credit',amount:c.bal,date:b.date});
 db.bills.unshift(b);save();preview(b);
}

function preview(b){
 const g=b.type==='gst',d=new Date(b.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}),bal=Math.max(b.total-b.paid,0);
 const txt=[db.shop.name,(g?'Tax invoice ':'Estimate ')+b.inv+', '+d,b.customerName,'',...b.items.map(i=>`${i.name}: ${i.qty} ${i.unit} x ${i.rate}`),'',`Total: ${inr(b.total)}`,`Paid: ${inr(b.paid)}`,bal?`Due: ${inr(bal)}`:'Paid in full'].join('\n');
 const ph=(b.phone||'').replace(/\D/g,''),wa=`https://wa.me/${ph.length===10?'91'+ph:ph}?text=${encodeURIComponent(txt)}`;
 root.innerHTML=`<div class="bl"><div class="card"><h2 style="margin:0">${esc(db.shop.name)}</h2><div class="mute">${g?'Tax invoice '+b.inv+(db.shop.gstin?', GSTIN '+esc(db.shop.gstin):', GSTIN not set'):'Estimate '+b.inv}, ${d}</div>
 <p><b>${esc(b.customerName)}</b>${b.phone?', '+esc(b.phone):''}${b.gstin?'<br><span class="mute">GSTIN '+esc(b.gstin)+'</span>':''}</p>
 <table><tr><th>Item</th><th>Qty</th><th>Rate</th>${g?'<th>GST</th>':''}<th>Amount</th></tr>${b.items.map(i=>`<tr><td>${esc(i.name)}</td><td>${i.qty} ${esc(i.unit)}</td><td>${inr(i.rate)}</td>${g?`<td>${i.gst}%</td>`:''}<td>${inr(i.qty*i.rate)}</td></tr>`).join('')}</table>
 <div class="bl-l" style="margin-top:8px"><span>Subtotal</span><b>${inr(b.sub)}</b></div>${g?`<div class="bl-l"><span>CGST</span><b>${inr(b.tax/2)}</b></div><div class="bl-l"><span>SGST</span><b>${inr(b.tax/2)}</b></div>`:''}
 <div class="bl-l big"><span>Total</span><b>${inr(b.total)}</b></div><div class="bl-l"><span>Paid</span><b>${inr(b.paid)}</b></div><div class="bl-l"><span>Due</span><b class="${bal?'bad':'ok'}">${inr(bal)}</b></div></div>
 <div class="noprint"><a class="btn ghost" style="margin-top:10px" target="_blank" rel="noopener" href="${wa}">Share on WhatsApp</a><button class="btn ghost" id="bl-pr" type="button">Print</button><button class="btn dark" id="bl-new" type="button">New bill</button></div></div>`;
 $('#bl-pr').onclick=()=>window.print();
 $('#bl-new').onclick=()=>{fresh();mountBilling(root)};
}

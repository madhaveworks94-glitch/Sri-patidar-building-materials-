import {db,save,inr,dateFmt} from './store.js';
import {invoiceHTML} from './invoice.js';
import {editBill} from './billing.js';
import {makeInvoicePdf,savePdf} from './invoicepdf.js';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let root,q='',flt='all',sel=null,msg='';
const $=s=>root.querySelector(s);
const all=()=>[...db.bills,...(db.cancelled||[])].sort((a,b)=>b.date-a.date);
const due=b=>b.cancelled?0:Math.max(b.total-b.paid,0);

export function cancelBill(b){
 b.items.forEach(it=>{const p=db.products.find(x=>x.id===it.pid);if(p){const k=(p.units.find(u=>u.name===it.unit)||{per:1}).per;p.stock+=it.qty*k}});
 db.bills=db.bills.filter(x=>x!==b);
 (db.cancelled=db.cancelled||[]).unshift({...b,cancelled:true,cancelledAt:Date.now()});
 db.ledger=db.ledger.filter(l=>l.billId!==b.id);save();
}
function list(){
 const rows=all().filter(b=>(flt==='all'||(flt==='cancelled'?b.cancelled:!b.cancelled&&b.type===flt))&&(!q||(b.customerName+' '+b.inv).toLowerCase().includes(q.toLowerCase())));
 root.innerHTML=`<div class="bl"><h1>Past bills</h1><p class="mute">Every bill and invoice you have made.</p>
 <div class="seg" style="flex-wrap:wrap">${[['all','All'],['gst','GST'],['kachha','Kachha'],['cancelled','Cancelled']].map(([k,l])=>`<button data-f="${k}" class="${flt===k?'on':''}">${l}</button>`).join('')}</div>
 <input id="b-q" value="${esc(q)}" placeholder="Search customer or invoice number"><div style="margin-top:12px">${rows.length?rows.map(b=>`<button class="card kh" data-b="${b.id}"><span><b>${esc(b.customerName)}</b><br><small class="mute">${esc(b.inv)}, ${dateFmt(b.date)}</small></span><span style="text-align:right"><b>${inr(b.total)}</b><br><small class="${b.cancelled?'bad':due(b)?'bad':'ok'}"><b>${b.cancelled?'Cancelled':due(b)?inr(due(b))+' due':'Paid'}</b></small></span></button>`).join(''):'<p class="mute">No bills found.</p>'}</div></div>`;
 $('#b-q').oninput=e=>{q=e.target.value;const p=e.target.selectionStart;list();const i=$('#b-q');i.focus();i.setSelectionRange(p,p)};
 root.onclick=e=>{const t=e.target,c=t.closest('[data-b]');if(t.dataset.f){flt=t.dataset.f;list()}else if(c){sel=c.dataset.b;msg='';detail()}};
}
function detail(){
 const b=all().find(x=>x.id===sel);if(!b){sel=null;return list()}
 const ph=(b.phone||'').replace(/\D/g,''),bal=due(b);
 const txt=[b.sup?b.sup.name:db.shop.name,(b.type==='gst'?'Tax invoice ':'Estimate ')+b.inv+', '+dateFmt(b.date),b.customerName,'',...b.items.map(i=>`${i.name}: ${i.qty} ${i.unit} x ${i.rate}`),'',`Total: ${inr(b.total)}`,bal?`Due: ${inr(bal)}`:'Paid in full'].join('\n');
 root.innerHTML=`<div class="bl"><button class="link" id="d-back" style="margin:0 0 8px">← All bills</button>${b.cancelled?`<div class="card" style="margin-bottom:10px"><b class="bad">Cancelled on ${dateFmt(b.cancelledAt)}</b><br><small class="mute">Stock was returned. Any money already received on this bill should be refunded or adjusted by you.</small></div>`:''}${invoiceHTML(b)}
 <div class="noprint"><button class="btn dark" id="d-pdf" type="button" style="margin-top:10px">Download invoice as PDF</button><a class="btn ghost" style="margin-top:8px" target="_blank" rel="noopener" href="https://wa.me/${ph.length===10?'91'+ph:ph}?text=${encodeURIComponent(txt)}">Share on WhatsApp</a>
 ${b.cancelled?'':'<button class="btn ghost" id="d-edit" type="button">Edit this bill</button><button class="btn ghost" id="d-cx" type="button">Cancel this bill</button>'}<div class="bl-msg" id="d-msg" style="color:var(--ok)">${esc(msg)}</div></div></div>`;
 root.onclick=async e=>{const t=e.target;
  if(t.id==='d-back'){sel=null;list()}
  else if(t.id==='d-pdf'){$('#d-msg').textContent='Making the PDF…';try{await savePdf(await makeInvoicePdf(b));msg='PDF created.'}catch(x){msg=x.message==='offline'?'Could not load the PDF tool. Check your internet and try again.':'The PDF was not saved.'}detail()}
  else if(t.id==='d-cx'){if(t.dataset.a){cancelBill(b);msg='Bill cancelled. Stock returned.';detail()}else{t.dataset.a=1;t.textContent='Tap again to cancel this bill'}}
  else if(t.id==='d-edit'){if(t.dataset.a){const copy=JSON.parse(JSON.stringify(b));cancelBill(b);editBill(copy);location.hash='#/billing'}else{t.dataset.a=1;t.textContent='Tap again: this cancels it and opens a new bill'}}
 };
}
export function mountBills(r){root=r;sel=null;list()}

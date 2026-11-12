import {db,save,inr,dateFmt} from './store.js';
import {docsHTML,mixed,parts} from './invoice.js';
import {billProfit} from './profit.js';
import {editBill} from './billing.js';
import {makeInvoicePdf,makeInvoicesPdf,savePdf} from './invoicepdf.js';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let root,q='',flt='all',sel=null,msg='',xo=false,xf='',xt='',xk='gst',xm='';
const iso=d=>d.toISOString().slice(0,10);
const when=t=>new Date(t).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true});
const $=s=>root.querySelector(s);
const all=()=>[...db.bills,...(db.cancelled||[])].sort((a,b)=>b.date-a.date);
const due=b=>b.cancelled?0:Math.max(b.total-b.paid,0);

export function cancelBill(b){
 b.items.forEach(it=>{const p=db.products.find(x=>x.id===it.pid);if(p){const k=(p.units.find(u=>u.name===it.unit)||{per:1}).per;p.stock+=it.qty*k}});
 db.bills=db.bills.filter(x=>x!==b);
 (db.cancelled=db.cancelled||[]).unshift({...b,cancelled:true,cancelledAt:Date.now()});
 db.ledger=db.ledger.filter(l=>l.billId!==b.id);save();
}

// Which documents go into the export: GST invoices, kachha bills, or both (cancelled bills are left out)
function pick(){
 const a=new Date(xf+'T00:00:00').getTime(),z=new Date(xt+'T23:59:59.999').getTime(),out=[];
 db.bills.filter(b=>b.date>=a&&b.date<=z).sort((x,y)=>x.date-y.date).forEach(b=>{
  if(b.type==='gst'){
   const p=parts(b);
   if(p.inv&&xk!=='kachha')out.push({b,part:'inv',inv:p.inv.inv,total:p.inv.total,cust:b.customerName,date:b.date});
   if(p.memo&&xk!=='gst')out.push({b,part:'memo',inv:b.inv+' (kachha)',total:b.total,cust:b.customerName,date:b.date});
   if(!p.inv&&xk!=='gst'&&!p.memo)out.push({b,part:'inv',inv:b.inv,total:b.total,cust:b.customerName,date:b.date});
  }else if(xk!=='gst')out.push({b,part:'inv',inv:b.inv,total:b.total,cust:b.customerName,date:b.date});
 });
 return out;
}
function xprev(){
 const box=$('#x-p');if(!box)return;
 if(!xf||!xt||xf>xt){box.innerHTML='<p class="mute">Choose a start date that is not after the end date.</p>';return}
 const l=pick(),tot=l.reduce((s,x)=>s+x.total,0);
 box.innerHTML=l.length?`<p><b>${l.length}</b> ${l.length===1?'document':'documents'} found, total <b>${inr(tot)}</b>. They will go into one PDF, one invoice per page.</p><div class="card" style="max-height:200px;overflow:auto;padding:8px 10px">${l.map(x=>`<div class="bl-l" style="padding:3px 0"><span>${esc(x.inv)}<br><small class="mute">${esc(x.cust)}, ${when(x.date)}</small></span><b>${inr(x.total)}</b></div>`).join('')}</div>`:'<p class="mute">No bills between these dates.</p>';
}
function list(){
 const rows=all().filter(b=>(flt==='all'||(flt==='cancelled'?b.cancelled:!b.cancelled&&b.type===flt))&&(!q||(b.customerName+' '+b.inv).toLowerCase().includes(q.toLowerCase())));
 root.innerHTML=`<div class="bl"><h1>Past bills</h1><p class="mute">Every bill and invoice you have made.</p>
 <div class="seg" style="flex-wrap:wrap">${[['all','All'],['gst','GST'],['kachha','Kachha'],['cancelled','Cancelled']].map(([k,l])=>`<button data-f="${k}" class="${flt===k?'on':''}">${l}</button>`).join('')}</div>
 <button class="btn ghost" id="x-tog" type="button" style="margin:0 0 10px">${xo?'Close export':'Export invoices by date'}</button>
 ${xo?`<div class="card" style="margin-bottom:12px"><h3>Export invoices by date</h3><label>From</label><input type="date" id="x-f" value="${xf}"><label>To</label><input type="date" id="x-t" value="${xt}"><label>What to include</label><select id="x-k"><option value="gst" ${xk==='gst'?'selected':''}>GST invoices only</option><option value="kachha" ${xk==='kachha'?'selected':''}>Kachha bills only</option><option value="all" ${xk==='all'?'selected':''}>Both</option></select><div id="x-p"></div><button class="btn dark" id="x-go" type="button">Download all as one PDF</button><div class="bl-msg" id="x-m" style="color:var(--ok)">${esc(xm)}</div></div>`:''}
 <input id="b-q" value="${esc(q)}" placeholder="Search customer or invoice number"><div style="margin-top:12px">${rows.length?rows.map(b=>`<button class="card kh" data-b="${b.id}"><span><b>${esc(b.customerName)}</b><br><small class="mute">${esc(b.inv)}</small><br><small class="mute"><b>${when(b.date)}</b></small></span><span style="text-align:right"><b>${inr(b.total)}</b><br><small class="${b.cancelled?'bad':due(b)?'bad':'ok'}"><b>${b.cancelled?'Cancelled':due(b)?inr(due(b))+' due':'Paid'}</b></small></span></button>`).join(''):'<p class="mute">No bills found.</p>'}</div></div>`;
 $('#b-q').oninput=e=>{q=e.target.value;const p=e.target.selectionStart;list();const i=$('#b-q');i.focus();i.setSelectionRange(p,p)};
 if(xo){xprev();root.oninput=e=>{const i=e.target.id;if(i==='x-f'){xf=e.target.value;xprev()}else if(i==='x-t'){xt=e.target.value;xprev()}}}
 root.onchange=e=>{if(e.target.id==='x-k'){xk=e.target.value;xprev()}};
 root.onclick=async e=>{const t=e.target,c=t.closest('[data-b]');
  if(t.id==='x-tog'){xo=!xo;if(xo){const n=new Date();if(!xf)xf=iso(new Date(n.getFullYear(),n.getMonth(),1));if(!xt)xt=iso(n)}xm='';list()}
  else if(t.id==='x-go'){const m=$('#x-m');if(!xf||!xt||xf>xt){m.style.color='';m.textContent='Choose a start date that is not after the end date.';return}const l=pick();if(!l.length){m.style.color='';m.textContent='There are no bills between these dates.';return}
   m.style.color='var(--ok)';m.textContent='Making the PDF of '+l.length+' documents…';
   try{await savePdf(await makeInvoicesPdf(l,'Invoices-'+xk+'-'+xf+'_to_'+xt+'.pdf'));xm='PDF created with '+l.length+' documents.'}catch(x){xm=x.message==='offline'?'Could not load the PDF tool. Check your internet and try again.':'The PDF was not saved.'}list()}
  else if(t.dataset.f){flt=t.dataset.f;list()}else if(c){sel=c.dataset.b;msg='';detail()}};
}
function detail(){
 const b=all().find(x=>x.id===sel);if(!b){sel=null;return list()}
 const ph=(b.phone||'').replace(/\D/g,''),bal=due(b),bp=billProfit(b);
 const txt=[b.sup?b.sup.name:db.shop.name,(b.type==='gst'?(mixed(b)?'Bill ':'Tax invoice '):'Bill ')+b.inv+', '+dateFmt(b.date),b.customerName,'',...b.items.map(i=>`${i.name}: ${i.qty} ${i.unit} x ${i.rate}`),'',`Total: ${inr(b.total)}`,bal?`Due: ${inr(bal)}`:'Paid in full'].join('\n');
 root.innerHTML=`<div class="bl"><button class="link" id="d-back" style="margin:0 0 8px">← All bills</button>${b.cancelled?`<div class="card" style="margin-bottom:10px"><b class="bad">Cancelled on ${dateFmt(b.cancelledAt)}</b><br><small class="mute">Stock was returned. Any money already received on this bill should be refunded or adjusted by you.</small></div>`:''}${docsHTML(b)}
 <div class="noprint"><div class="card" style="margin-top:10px"><div class="bl-l"><span>Date and time</span><b>${when(b.date)}</b></div>${bp.known?`<div class="bl-l"><span>Estimated profit (only you see this)</span><b class="${bp.prof<0?'bad':'ok'}">${inr(bp.prof)}</b></div>`:''}</div>${mixed(b)?'<button class="btn dark" id="d-pdf" type="button" style="margin-top:10px">Download GST invoice PDF</button><button class="btn dark" id="d-pdf2" type="button">Download kachha bill PDF</button>':`<button class="btn dark" id="d-pdf" type="button" style="margin-top:10px">Download ${b.type==='gst'?'invoice':'bill'} as PDF</button>`}<a class="btn ghost" style="margin-top:8px" target="_blank" rel="noopener" href="https://wa.me/${ph.length===10?'91'+ph:ph}?text=${encodeURIComponent(txt)}">Share on WhatsApp</a>
 ${b.cancelled?'':'<button class="btn ghost" id="d-edit" type="button">Edit this bill</button><button class="btn ghost" id="d-cx" type="button">Cancel this bill</button>'}<div class="bl-msg" id="d-msg" style="color:var(--ok)">${esc(msg)}</div></div></div>`;
 root.onclick=async e=>{const t=e.target;
  if(t.id==='d-back'){sel=null;list()}
  else if(t.id==='d-pdf'||t.id==='d-pdf2'){$('#d-msg').textContent='Making the PDF…';try{await savePdf(await makeInvoicePdf(b,t.id==='d-pdf2'?'memo':'inv'));msg='PDF created.'}catch(x){msg=x.message==='offline'?'Could not load the PDF tool. Check your internet and try again.':'The PDF was not saved.'}detail()}
  else if(t.id==='d-cx'){if(t.dataset.a){cancelBill(b);msg='Bill cancelled. Stock returned.';detail()}else{t.dataset.a=1;t.textContent='Tap again to cancel this bill'}}
  else if(t.id==='d-edit'){if(t.dataset.a){const copy=JSON.parse(JSON.stringify(b));cancelBill(b);editBill(copy);location.hash='#/billing'}else{t.dataset.a=1;t.textContent='Tap again: this cancels it and opens a new bill'}}
 };
}
export function mountBills(r){root=r;sel=null;list()}

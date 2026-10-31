import {db} from './store.js';
import {STATES} from './invoice.js';
import {makePdf} from './gstpdf.js';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const f2=n=>Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const sn=c=>{const s=STATES.find(x=>x[0]===c);return s?s[1]+' ('+c+')':c||''};
const iso=d=>{const x=new Date(d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
const dmy=t=>{const x=new Date(t);return String(x.getDate()).padStart(2,'0')+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+x.getFullYear()};
const UQC={bag:'BAG',kg:'KGS',pcs:'PCS',ton:'TON',quintal:'QTL',ltr:'LTR',box:'BOX',bundle:'BDL',roll:'ROL',meter:'MTR'};
const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
let root,from,to,msg='';
{const n=new Date();from=iso(new Date(n.getFullYear(),n.getMonth(),1));to=iso(n)}
const $=s=>root.querySelector(s);

export function data(){
 const a=new Date(from+'T00:00:00').getTime(),z=new Date(to+'T23:59:59.999').getTime();
 const all=db.bills.filter(b=>b.date>=a&&b.date<=z&&!b.cancelled);
 const inv=all.filter(b=>b.type==='gst').sort((x,y)=>x.date-y.date),kach=all.filter(b=>b.type!=='gst');
 const rowOf=b=>{let tx=0,tax=0;b.items.forEach(i=>{const t=(i.tx!==undefined?i.tx:i.qty*i.rate);tx+=t;tax+=t*(i.gst||0)/100});return{b,tx,tax,cgst:b.inter?0:tax/2,sgst:b.inter?0:tax/2,igst:b.inter?tax:0}};
 const rows=inv.map(rowOf),cn=(db.creditNotes||[]).filter(c=>c.type==='gst'&&c.date>=a&&c.date<=z).map(rowOf),canc=(db.cancelled||[]).filter(c=>c.type==='gst'&&c.date>=a&&c.date<=z);
 const h={};inv.forEach(b=>b.items.forEach(i=>{const t=(i.tx!==undefined?i.tx:i.qty*i.rate),tax=t*(i.gst||0)/100,k=[i.hsn||'',i.unit,i.gst||0].join('|');const x=h[k]=h[k]||{hsn:i.hsn||'',name:i.name,uqc:UQC[i.unit]||'OTH',qty:0,tx:0,rate:i.gst||0,cgst:0,sgst:0,igst:0};x.qty+=i.qty;x.tx+=t;if(b.inter)x.igst+=tax;else{x.cgst+=tax/2;x.sgst+=tax/2}}));
 return{rows,cn,canc,hs:Object.values(h),kach,noHsn:sum(inv,b=>b.items.filter(i=>!i.hsn).length)};
}
const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
const csv=(head,lines)=>'\uFEFF'+[head,...lines].map(r=>r.map(q).join(',')).join('\r\n');
export function csvInvoices(d){
 const L=[];d.rows.forEach(({b})=>{const g={};b.items.forEach(i=>{g[i.gst||0]=(g[i.gst||0]||0)+(i.tx!==undefined?i.tx:i.qty*i.rate)});
  Object.entries(g).forEach(([r,tx])=>{const tax=tx*r/100;L.push([b.gstin?'B2B':'B2C',b.gstin||'',b.customerName,b.inv,dmy(b.date),b.total.toFixed(2),sn(b.state),'N','Regular',r,tx.toFixed(2),b.inter?'0.00':(tax/2).toFixed(2),b.inter?'0.00':(tax/2).toFixed(2),b.inter?tax.toFixed(2):'0.00'])})});
 d.cn.forEach(({b,tx,cgst,sgst,igst})=>L.push(['CREDIT NOTE',b.gstin||'',b.customerName,b.inv,dmy(b.date),'-'+b.total.toFixed(2),sn(b.state),'N','Credit note','','-'+tx.toFixed(2),'-'+cgst.toFixed(2),'-'+sgst.toFixed(2),'-'+igst.toFixed(2)]));
 d.canc.forEach(b=>L.push(['CANCELLED','',b.customerName,b.inv,dmy(b.date),'0.00','','N','Cancelled','','0.00','0.00','0.00','0.00']));
 return csv(['Type','GSTIN of Recipient','Receiver Name','Invoice Number','Invoice Date','Invoice Value','Place Of Supply','Reverse Charge','Invoice Type','Rate','Taxable Value','CGST','SGST','IGST'],L);
}
export function csvHsn(d){
 return csv(['HSN','Description','UQC','Total Quantity','Total Value','Taxable Value','Rate','Integrated Tax','Central Tax','State/UT Tax','Cess'],d.hs.map(x=>[x.hsn,x.name,x.uqc,x.qty,(x.tx+x.cgst+x.sgst+x.igst).toFixed(2),x.tx.toFixed(2),x.rate,x.igst.toFixed(2),x.cgst.toFixed(2),x.sgst.toFixed(2),'0.00']));
}
async function savePdf(p){
 const c=window.Capacitor,P=c&&c.isNativePlatform&&c.isNativePlatform()?c.Plugins:null;
 if(P&&P.Filesystem&&P.Share){const r=await P.Filesystem.writeFile({path:p.name,data:p.b64,directory:'CACHE'});await P.Share.share({title:p.name,url:r.uri,dialogTitle:'Save or send this report'})}
 else p.doc.save(p.name);
}
async function saveFile(name,text){
 const c=window.Capacitor,P=c&&c.isNativePlatform&&c.isNativePlatform()?c.Plugins:null;
 if(P&&P.Filesystem&&P.Share){const r=await P.Filesystem.writeFile({path:name,data:text,directory:'CACHE',encoding:'utf8'});await P.Share.share({title:name,url:r.uri,dialogTitle:'Save or send this file'})}
 else{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();a.remove()}
}

function render(){
 const d=data(),r=d.rows,b2b=r.filter(x=>x.b.gstin),b2c=r.filter(x=>!x.b.gstin);
 const tx=sum(r,x=>x.tx),cg=sum(r,x=>x.cgst),sg=sum(r,x=>x.sgst),ig=sum(r,x=>x.igst),tot=sum(r,x=>x.b.total);
 const warn=[!db.shop.gstin?'Your shop GSTIN is not set (Backup, Shop details).':'',d.noHsn?`${d.noHsn} item lines have no HSN code. Add HSN in Inventory.`:'',r.some(x=>!x.b.addr&&x.b.gstin)?'Some business customers have no address.':''].filter(Boolean);
 const tbl=(h,body)=>`<div style="overflow-x:auto"><table style="min-width:640px"><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr>${body}</table></div>`;
 root.innerHTML=`<div class="bl"><a href="#/reports" class="mute">← Reports</a><h1>GST report</h1>
 <p class="mute">Your sales list for GST filing. Give the two files to your accountant. They use it to file GSTR-1 (sales list) and GSTR-3B (tax payment) on the GST portal.</p>
 <div class="card"><label>From</label><input type="date" id="g-f" value="${from}"><label>To</label><input type="date" id="g-t" value="${to}"><div class="btns"><button class="btn ghost" id="g-m" type="button">This month</button><button class="btn ghost" id="g-l" type="button">Last month</button></div></div>
 <div class="grid" style="margin-top:12px"><div class="card hero wide"><h3>Invoice value</h3><div class="num">₹${f2(tot)}</div><span class="pill">${r.length} GST invoices</span></div>
 <div class="card"><h3>Taxable value</h3><div class="num" style="font-size:22px">₹${f2(tx)}</div></div><div class="card"><h3>Total GST</h3><div class="num" style="font-size:22px">₹${f2(cg+sg+ig)}</div></div>
 <div class="card"><h3>CGST + SGST</h3><div class="num" style="font-size:20px">₹${f2(cg)} + ₹${f2(sg)}</div></div><div class="card"><h3>IGST</h3><div class="num" style="font-size:20px">₹${f2(ig)}</div></div></div>
 <div class="card" style="margin-top:12px"><div class="bl-l"><span>Business customers (B2B)</span><b>${b2b.length} invoices, ₹${f2(sum(b2b,x=>x.b.total))}</b></div><div class="bl-l"><span>Other customers (B2C)</span><b>${b2c.length} invoices, ₹${f2(sum(b2c,x=>x.b.total))}</b></div>${d.cn.length?`<div class="bl-l"><span>Credit notes (reduce tax)</span><b>${d.cn.length}, tax ₹${f2(sum(d.cn,x=>x.tax))}</b></div>`:''}${d.canc.length?`<div class="bl-l"><span>Cancelled invoices</span><b>${d.canc.map(x=>esc(x.b?x.b.inv:x.inv)).join(', ')}</b></div>`:''}<p class="mute" style="margin:6px 0 0">${d.kach.length} kachha bills (₹${f2(sum(d.kach,b=>b.total))}) are not included because they are not tax invoices.</p></div>
 ${warn.length?`<div class="card" style="margin-top:12px"><b class="bad">Check before filing</b>${warn.map(w=>`<p class="mute" style="margin:6px 0 0">${w}</p>`).join('')}</div>`:''}
 <button class="btn dark" id="g-pdf" type="button" style="margin-top:12px">Save PDF report (for filing)</button><button class="btn ghost" id="g-ci" type="button">Excel list: invoices (CSV)</button><button class="btn ghost" id="g-ch" type="button">Excel list: HSN summary (CSV)</button><div class="bl-msg" id="g-msg" style="color:var(--ok)">${esc(msg)}</div>
 <h3 class="mute" style="margin:16px 4px 6px">Invoices</h3><div class="card">${r.length?tbl(['Invoice','Date','Customer','GSTIN','Taxable','CGST','SGST','IGST','Total'],r.map(x=>`<tr><td>${esc(x.b.inv)}</td><td>${dmy(x.b.date)}</td><td>${esc(x.b.customerName)}</td><td>${esc(x.b.gstin||'-')}</td><td>${f2(x.tx)}</td><td>${f2(x.cgst)}</td><td>${f2(x.sgst)}</td><td>${f2(x.igst)}</td><td>${f2(x.b.total)}</td></tr>`).join('')):'<p class="mute">No GST invoices in these dates.</p>'}</div>
 <h3 class="mute" style="margin:16px 4px 6px">HSN summary</h3><div class="card">${d.hs.length?tbl(['HSN','Item','Unit','Qty','Taxable','Rate %','Tax'],d.hs.map(x=>`<tr><td>${esc(x.hsn||'-')}</td><td>${esc(x.name)}</td><td>${x.uqc}</td><td>${x.qty}</td><td>${f2(x.tx)}</td><td>${x.rate}</td><td>${f2(x.cgst+x.sgst+x.igst)}</td></tr>`).join('')):'<p class="mute">Nothing to show.</p>'}</div></div>`;
 root.onchange=e=>{if(e.target.id==='g-f'||e.target.id==='g-t'){from=$('#g-f').value||from;to=$('#g-t').value||to;msg='';render()}};
 root.onclick=async e=>{const t=e.target.id,n=new Date();
  if(t==='g-m'){from=iso(new Date(n.getFullYear(),n.getMonth(),1));to=iso(n);msg='';render()}
  else if(t==='g-l'){from=iso(new Date(n.getFullYear(),n.getMonth()-1,1));to=iso(new Date(n.getFullYear(),n.getMonth(),0));msg='';render()}
  else if(t==='g-pdf'){if(!d.rows.length){msg='There are no GST invoices in these dates.';return render()}
   $('#g-msg').textContent='Making the PDF…';
   try{await savePdf(await makePdf(d,from,to));msg='PDF created.'}catch(x){msg=x.message==='offline'?'Could not load the PDF tool. Check your internet and try again.':'The PDF was not saved.'}render()}
  else if(t==='g-ci'||t==='g-ch'){try{await saveFile((t==='g-ci'?'GST-invoices-':'GST-HSN-summary-')+from+'_to_'+to+'.csv',(t==='g-ci'?csvInvoices:csvHsn)(d));msg='File created.'}catch(x){msg='File was not saved.'}render()}};
}
export function mountGst(r){root=r;msg='';render()}

import {db} from './store.js';
import {tools} from './gstpdf.js';
import {savePdf} from './invoicepdf.js';
document.head.insertAdjacentHTML('beforeend','<style>a.kh{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;margin-bottom:10px;color:inherit}</style>');
const f2=n=>Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const dmy=t=>{const x=new Date(t);return String(x.getDate()).padStart(2,'0')+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+x.getFullYear()};
const due=b=>Math.max(b.total-b.paid,0);
let root,msg='';
export function events(){
 const al=db.ledger.filter(l=>l.type==='payment').flatMap(l=>l.allocs||[]),ev=[];
 db.bills.forEach(b=>{const s0=b.paid-al.filter(a=>a.k==='bill'&&a.id===b.id).reduce((s,a)=>s+a.amt,0);if(s0>0.004)ev.push({d:b.date,t:'Sale '+b.inv,n:b.customerName,i:s0,o:0})});
 db.ledger.filter(l=>l.type==='payment'&&l.mode!=='Credit note').forEach(l=>{const c=db.customers.find(x=>x.id===l.customerId);ev.push({d:l.date,t:'Payment received',n:(c?c.name:'')+(l.mode?', '+l.mode:''),i:l.amount,o:0})});
 (db.creditNotes||[]).filter(c=>c.mode==='refund').forEach(c=>ev.push({d:c.date,t:'Refund '+c.inv,n:c.customerName,i:0,o:c.total}));
 (db.spend||[]).forEach(e=>{const a=e.type==='pay'?e.amount:e.paid;if(a>0.004)ev.push({d:e.date,t:e.type==='pay'?'Paid to supplier':e.cat,n:e.party||e.note||'',i:0,o:a})});
 return ev.sort((a,b)=>a.d-b.d);
}
export async function makeBusinessLedger(fromS,toS){
 const J=await tools(),doc=new J({unit:'mm',format:'a4'}),W=210,H=297,sh=db.shop;
 const a=new Date(fromS+'T00:00:00').getTime(),z=new Date(toS+'T23:59:59.999').getTime(),all=events();
 const open=all.filter(e=>e.d<a).reduce((s,e)=>s+e.i-e.o,0),rows=all.filter(e=>e.d>=a&&e.d<=z);let bal=open;
 const body=rows.map(e=>{bal+=e.i-e.o;return[dmy(e.d),e.t,e.n,e.i?f2(e.i):'',e.o?f2(e.o):'',f2(bal)]});
 const al=db.ledger.filter(l=>l.type==='payment').flatMap(l=>l.allocs||[]),bills=db.bills.filter(b=>b.date>=a&&b.date<=z);
 const sales=bills.reduce((s,b)=>s+b.total,0);
 const credit=bills.reduce((s,b)=>{const s0=Math.max(b.paid-al.filter(x=>x.k==='bill'&&x.id===b.id).reduce((t,x)=>t+x.amt,0),0);return s+Math.max(b.total-s0,0)},0);
 const spend=db.spend||[],spent=spend.filter(e=>e.type==='spend'&&e.date>=a&&e.date<=z).reduce((s,e)=>s+e.amount,0);
 const tin=rows.reduce((s,e)=>s+e.i,0),tout=rows.reduce((s,e)=>s+e.o,0);
 const custOwe=db.bills.reduce((s,b)=>s+due(b),0)+db.ledger.filter(l=>l.type==='opening').reduce((s,o)=>s+o.left,0);
 const sup=[...new Set(spend.map(e=>e.party).filter(Boolean))].map(p=>({p,o:spend.filter(e=>e.party===p).reduce((s,e)=>s+(e.type==='pay'?-e.amount:e.amount-e.paid),0)})).filter(x=>x.o>0.004).sort((x,y)=>y.o-x.o);
 const base={theme:'grid',margin:{left:10,right:10},styles:{fontSize:8.5,cellPadding:1.7,lineColor:[70,70,70],lineWidth:.15,textColor:20},headStyles:{fillColor:[225,225,225],textColor:20,fontStyle:'bold'},footStyles:{fillColor:[240,240,240],textColor:20,fontStyle:'bold'}};
 let y=14;doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('BUSINESS LEDGER',105,y,{align:'center'});y+=7;doc.setFontSize(12);doc.text(sh.name||'',10,y);y+=5;
 doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('Period: '+dmy(a)+' to '+dmy(z),10,y);y+=5;
 doc.autoTable({...base,startY:y,margin:{left:10,right:W/2+5},body:[['Sales (all bills)',f2(sales)],['Sold on udhaar',f2(credit)],['Total spend and purchases',f2(spent)],['Money in',f2(tin)],['Money out',f2(tout)],['Closing balance',f2(bal)]],columnStyles:{1:{halign:'right'}}});
 const y1=doc.lastAutoTable.finalY;
 doc.autoTable({...base,startY:y,margin:{left:W/2+5,right:10},body:[['Customers owe you today',f2(custOwe)],['You owe suppliers today',f2(sup.reduce((s,x)=>s+x.o,0))]],columnStyles:{1:{halign:'right'}}});
 y=Math.max(y1,doc.lastAutoTable.finalY)+6;
 doc.autoTable({...base,startY:y,showFoot:'lastPage',
  head:[['Date','Particulars','Details','Money in (Rs.)','Money out (Rs.)','Balance (Rs.)']],body:[['','Opening balance','','','',f2(open)],...body],
  foot:[['','Closing balance','',f2(tin),f2(tout),f2(bal)]],didParseCell:k=>{if(k.column.index>=3)k.cell.styles.halign='right'}});
 y=doc.lastAutoTable.finalY+6;
 if(sup.length){doc.autoTable({...base,startY:y,head:[['Suppliers you owe today','Amount (Rs.)']],body:sup.map(x=>[x.p,f2(x.o)]),columnStyles:{1:{halign:'right'}},tableWidth:100});y=doc.lastAutoTable.finalY+6}
 doc.setFontSize(8.5);doc.text(doc.splitTextToSize('Money in is cash, UPI or cheque received from sales and khata payments. Money out is what you paid for purchases, expenses, supplier payments and refunds. Computer generated statement.',W-20),10,y);
 const n=doc.internal.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(7.5);doc.setTextColor(90);doc.text((sh.name||'')+'   Business ledger',10,H-6);doc.text('Page '+i+' of '+n,W-10,H-6,{align:'right'})}
 return{name:'Business-ledger-'+fromS+'_to_'+toS+'.pdf',b64:doc.output('datauristring').split('base64,')[1],doc};
}
export const makeCashBook=makeBusinessLedger;
const CARDS=[['Past bills and invoices','Every bill and invoice, with PDF download','#/bills'],['GST report','Monthly sales list and PDF for your accountant','#/gst'],['Sales reports','Sales, profit, best sellers, udhaar age','#/reports']];
export function mountDocs(r){
 root=r;const n=new Date(),iso=d=>d.toISOString().slice(0,10);
 root.innerHTML=`<div class="bl"><h1>Documents</h1><p class="mute">All your documents and ledgers in one place.</p>
 <div class="card"><h3>Business ledger (PDF)</h3><p class="mute" style="margin:0">Sales, money received, spend, purchases and supplier payments between two dates.</p><label>From</label><input type="date" id="c-f" value="${iso(new Date(n.getFullYear(),n.getMonth(),1))}"><label>To</label><input type="date" id="c-t" value="${iso(n)}"><button class="btn dark" id="c-go" type="button">Download business ledger PDF</button><a class="btn ghost" href="#/spend">+ Add spend, purchase or supplier payment</a><div class="bl-msg" id="c-m" style="color:var(--ok)">${msg}</div></div>
 <div style="height:12px"></div>
 ${CARDS.map(([t,s,h])=>`<a class="card kh" href="${h}" style="text-decoration:none"><span><b>${t}</b><br><small class="mute">${s}</small></span><b class="mute">›</b></a>`).join('')}</div>`;
 root.onclick=async e=>{if(e.target.id!=='c-go')return;const m=root.querySelector('#c-m');m.textContent='Making the PDF…';
  try{await savePdf(await makeBusinessLedger(root.querySelector('#c-f').value,root.querySelector('#c-t').value));msg='PDF created.'}catch(x){msg=x.message==='offline'?'Could not load the PDF tool. Check your internet and try again.':'The PDF was not saved.'}mountDocs(root)};
}

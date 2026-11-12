import {db,inr} from './store.js';
import {billProfit} from './profit.js';
import {tools} from './gstpdf.js';
import {savePdf} from './invoicepdf.js';
document.head.insertAdjacentHTML('beforeend','<style>a.kh{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;margin-bottom:10px;color:inherit}</style>');
const f2=n=>Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const dmy=t=>{const x=new Date(t);return String(x.getDate()).padStart(2,'0')+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+x.getFullYear()};
const due=b=>Math.max(b.total-b.paid,0);
let root,msg='';
export function events(){
 const al=db.ledger.filter(l=>l.type==='payment').flatMap(l=>l.allocs||[]),ev=[];
 db.bills.forEach(b=>{const s0=Math.max(b.paid-al.filter(a=>a.k==='bill'&&a.id===b.id).reduce((s,a)=>s+a.amt,0),0),bp=billProfit(b),cr=b.total-s0;ev.push({d:b.date,t:'Sale '+b.inv,n:b.customerName+(cr>0.004?' (udhaar '+f2(cr)+')':''),s:b.total,p:bp.known?bp.prof:null,i:s0,o:0})});
 db.ledger.filter(l=>l.type==='payment'&&l.mode!=='Credit note').forEach(l=>{const c=db.customers.find(x=>x.id===l.customerId);ev.push({d:l.date,t:'Payment received',n:(c?c.name:'')+(l.mode?', '+l.mode:''),s:0,p:null,i:l.amount,o:0})});
 (db.creditNotes||[]).filter(c=>c.mode==='refund').forEach(c=>ev.push({d:c.date,t:'Refund '+c.inv,n:c.customerName,s:0,p:null,i:0,o:c.total}));
 (db.spend||[]).forEach(e=>{const a=e.type==='pay'?e.amount:e.paid;if(a>0.004)ev.push({d:e.date,t:e.type==='pay'?'Paid to supplier':e.cat,n:e.party||e.note||'',s:0,p:null,i:0,o:a})});
 return ev.sort((a,b)=>a.d-b.d);
}
// All the numbers for the business ledger between two dates (used by the preview and by the PDF)
export function ledgerData(fromS,toS){
 const a=new Date(fromS+'T00:00:00').getTime(),z=new Date(toS+'T23:59:59.999').getTime(),all=events();
 const open=all.filter(e=>e.d<a).reduce((s,e)=>s+e.i-e.o,0),rows=all.filter(e=>e.d>=a&&e.d<=z);let bal=open;
 const lines=rows.map(e=>{bal+=e.i-e.o;return{...e,bal}});
 const al=db.ledger.filter(l=>l.type==='payment').flatMap(l=>l.allocs||[]),bills=db.bills.filter(b=>b.date>=a&&b.date<=z);
 const sales=bills.reduce((s,b)=>s+b.total,0);
 const credit=bills.reduce((s,b)=>{const s0=Math.max(b.paid-al.filter(x=>x.k==='bill'&&x.id===b.id).reduce((t,x)=>t+x.amt,0),0);return s+Math.max(b.total-s0,0)},0);
 const spend=db.spend||[],spent=spend.filter(e=>e.type==='spend'&&e.date>=a&&e.date<=z).reduce((s,e)=>s+e.amount,0);
 const tin=rows.reduce((s,e)=>s+e.i,0),tout=rows.reduce((s,e)=>s+e.o,0);
 const profit=rows.reduce((s,e)=>s+(e.p||0),0),pknown=rows.some(e=>e.p!==null&&e.p!==undefined);
 const custOwe=db.bills.reduce((s,b)=>s+due(b),0)+db.ledger.filter(l=>l.type==='opening').reduce((s,o)=>s+o.left,0);
 const sup=[...new Set(spend.map(e=>e.party).filter(Boolean))].map(p=>({p,o:spend.filter(e=>e.party===p).reduce((s,e)=>s+(e.type==='pay'?-e.amount:e.amount-e.paid),0)})).filter(x=>x.o>0.004).sort((x,y)=>y.o-x.o);
 return{a,z,open,lines,bal,sales,credit,spent,tin,tout,profit,pknown,custOwe,sup};
}
export async function makeBusinessLedger(fromS,toS){
 const J=await tools(),doc=new J({unit:'mm',format:'a4'}),W=210,H=297,sh=db.shop;
 const {a,z,open,lines,bal,sales,credit,spent,tin,tout,profit,pknown,custOwe,sup}=ledgerData(fromS,toS);
 const body=lines.map(e=>[dmy(e.d),e.t,e.n,e.s?f2(e.s):'',e.i?f2(e.i):'',e.o?f2(e.o):'',e.p!==null&&e.p!==undefined?f2(e.p):'',f2(e.bal)]);
 const base={theme:'grid',margin:{left:10,right:10},styles:{fontSize:8.5,cellPadding:1.7,lineColor:[70,70,70],lineWidth:.15,textColor:20},headStyles:{fillColor:[225,225,225],textColor:20,fontStyle:'bold'},footStyles:{fillColor:[240,240,240],textColor:20,fontStyle:'bold'}};
 let y=14;doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('BUSINESS LEDGER',105,y,{align:'center'});y+=7;doc.setFontSize(12);doc.text(sh.name||'',10,y);y+=5;
 doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('Period: '+dmy(a)+' to '+dmy(z),10,y);y+=5;
 doc.autoTable({...base,startY:y,margin:{left:10,right:W/2+5},body:[['Sales (all bills)',f2(sales)],['Sold on udhaar',f2(credit)],['Estimated profit',pknown?f2(profit):'-'],['Total spend and purchases',f2(spent)],['Money in',f2(tin)],['Money out',f2(tout)],['Closing balance',f2(bal)]],columnStyles:{1:{halign:'right'}}});
 const y1=doc.lastAutoTable.finalY;
 doc.autoTable({...base,startY:y,margin:{left:W/2+5,right:10},body:[['Customers owe you today',f2(custOwe)],['You owe suppliers today',f2(sup.reduce((s,x)=>s+x.o,0))]],columnStyles:{1:{halign:'right'}}});
 y=Math.max(y1,doc.lastAutoTable.finalY)+6;
 doc.autoTable({...base,startY:y,showFoot:'lastPage',styles:{...base.styles,fontSize:8,cellPadding:1.5},
  head:[['Date','Particulars','Details','Sale (Rs.)','Money in (Rs.)','Money out (Rs.)','Profit (Rs.)','Balance (Rs.)']],body:[['','Opening balance','','','','','',f2(open)],...body],
  foot:[['','Total / closing','',f2(sales),f2(tin),f2(tout),pknown?f2(profit):'',f2(bal)]],
  columnStyles:{0:{cellWidth:18},1:{cellWidth:30},3:{cellWidth:20},4:{cellWidth:20},5:{cellWidth:20},6:{cellWidth:18},7:{cellWidth:22}},
  didParseCell:k=>{if(k.column.index>=3)k.cell.styles.halign='right'}});
 y=doc.lastAutoTable.finalY+6;
 if(sup.length){doc.autoTable({...base,startY:y,head:[['Suppliers you owe today','Amount (Rs.)']],body:sup.map(x=>[x.p,f2(x.o)]),columnStyles:{1:{halign:'right'}},tableWidth:100});y=doc.lastAutoTable.finalY+6}
 doc.setFontSize(8.5);doc.text(doc.splitTextToSize('Every sale is listed. Sale is the full bill amount. Money in is cash, UPI or cheque received at the time of sale and from khata payments, so a sale on udhaar shows nothing in Money in until it is paid. Money out is what you paid for purchases, expenses, supplier payments and refunds. Profit is an estimate from the buying prices saved in Inventory (blank when no buying price was set). Computer generated statement.',W-20),10,y);
 const n=doc.internal.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(7.5);doc.setTextColor(90);doc.text((sh.name||'')+'   Business ledger',10,H-6);doc.text('Page '+i+' of '+n,W-10,H-6,{align:'right'})}
 return{name:'Business-ledger-'+fromS+'_to_'+toS+'.pdf',b64:doc.output('datauristring').split('base64,')[1],doc};
}
export const makeCashBook=makeBusinessLedger;
const CARDS=[['Past bills and invoices','Every bill and invoice, with PDF download and export by date','#/bills'],['GST report','Monthly sales list and PDF for your accountant','#/gst'],['Sales reports','Sales, profit, best sellers, udhaar age','#/reports']];
document.head.insertAdjacentHTML('beforeend','<style>.lp-s{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}.lp-s div{background:var(--bg);border-radius:12px;padding:8px 10px}.lp-s small{display:block;color:var(--mute)}.lp-s b{font-size:15px}.lp-box{max-height:58vh;overflow:auto;border:1px solid var(--line);border-radius:12px;margin-top:8px}.lp-r{display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border-bottom:1px solid var(--line);font-size:13px}.lp-r:last-child{border:0}.lp-r small{color:var(--mute);display:block}.lp-r .rt{text-align:right;white-space:nowrap}</style>');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const iso=d=>d.toISOString().slice(0,10);
let fromV='',toV='';
const pdate=t=>{const x=new Date(t);return x.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})};
function preview(){
 const box=root.querySelector('#c-pv');if(!box)return;
 if(!fromV||!toV||fromV>toV){box.innerHTML='<p class="mute">Choose a start date that is not after the end date.</p>';return}
 const d=ledgerData(fromV,toV),MAX=400,shown=d.lines.slice(0,MAX);
 box.innerHTML=`<div class="lp-s"><div><small>Sales</small><b>${inr(d.sales)}</b></div><div><small>Estimated profit</small><b>${d.pknown?inr(d.profit):'-'}</b></div><div><small>Money in</small><b>${inr(d.tin)}</b></div><div><small>Money out</small><b>${inr(d.tout)}</b></div><div><small>Sold on udhaar</small><b>${inr(d.credit)}</b></div><div><small>Closing balance</small><b>${inr(d.bal)}</b></div></div>
 <div class="lp-box"><div class="lp-r"><span><b>Opening balance</b></span><span class="rt"><b>${inr(d.open)}</b></span></div>${shown.map(e=>`<div class="lp-r"><span><b>${esc(e.t)}</b><small>${pdate(e.d)}${e.n?', '+esc(e.n):''}</small></span><span class="rt">${e.s?`Sale <b>${inr(e.s)}</b><br>`:''}${e.i?`<small style="color:var(--ok)">In ${inr(e.i)}</small>`:''}${e.o?`<small style="color:var(--bad,#c0392b)">Out ${inr(e.o)}</small>`:''}${e.p!==null&&e.p!==undefined?`<small>Profit ${inr(e.p)}</small>`:''}<small>Balance ${inr(e.bal)}</small></span></div>`).join('')||'<div class="lp-r"><span class="mute">No entries between these dates.</span></div>'}</div>${d.lines.length>MAX?`<p class="mute">Showing the first ${MAX} of ${d.lines.length} entries. The PDF has all of them.</p>`:`<p class="mute">${d.lines.length} entries. This is what the PDF will contain.</p>`}`;
}
export function mountDocs(r){
 root=r;const n=new Date();if(!fromV)fromV=iso(new Date(n.getFullYear(),n.getMonth(),1));if(!toV)toV=iso(n);
 root.innerHTML=`<div class="bl"><h1>Documents</h1><p class="mute">All your documents and ledgers in one place.</p>
 <div class="card"><h3>Business ledger</h3><p class="mute" style="margin:0">Every sale, money received, spend, purchases and supplier payments between two dates. Check the preview, then download the PDF.</p><label>From</label><input type="date" id="c-f" value="${fromV}"><label>To</label><input type="date" id="c-t" value="${toV}"><div id="c-pv"></div><button class="btn dark" id="c-go" type="button">Download business ledger PDF</button><a class="btn ghost" href="#/spend">+ Add spend, purchase or supplier payment</a><div class="bl-msg" id="c-m" style="color:var(--ok)">${esc(msg)}</div></div>
 <div style="height:12px"></div>
 ${CARDS.map(([t,s,h])=>`<a class="card kh" href="${h}" style="text-decoration:none"><span><b>${t}</b><br><small class="mute">${s}</small></span><b class="mute">›</b></a>`).join('')}</div>`;
 msg='';preview();
 root.oninput=e=>{if(e.target.id==='c-f'){fromV=e.target.value;preview()}else if(e.target.id==='c-t'){toV=e.target.value;preview()}};
 root.onclick=async e=>{if(e.target.id!=='c-go')return;const m=root.querySelector('#c-m');if(!fromV||!toV||fromV>toV){m.style.color='';m.textContent='Choose a start date that is not after the end date.';return}m.textContent='Making the PDF…';
  try{await savePdf(await makeBusinessLedger(fromV,toV));msg='PDF created.'}catch(x){msg=x.message==='offline'?'Could not load the PDF tool. Check your internet and try again.':'The PDF was not saved.'}mountDocs(root)};
}

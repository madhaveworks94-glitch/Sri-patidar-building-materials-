import {db} from './store.js';
import {STATES,words} from './invoice.js';
import {tools} from './gstpdf.js';
const f2=n=>Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const sn=c=>{const s=STATES.find(x=>x[0]===c);return s?s[1]+' ('+c+')':c||''};
const dmy=t=>{const x=new Date(t);return String(x.getDate()).padStart(2,'0')+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+x.getFullYear()};
export async function savePdf(p){
 const c=window.Capacitor,P=c&&c.isNativePlatform&&c.isNativePlatform()?c.Plugins:null;
 if(P&&P.Filesystem&&P.Share){const r=await P.Filesystem.writeFile({path:p.name,data:p.b64,directory:'CACHE'});await P.Share.share({title:p.name,url:r.uri,dialogTitle:'Save or send this invoice'})}
 else p.doc.save(p.name);
}
export async function makeInvoicePdf(b){
 const J=await tools(),doc=new J({unit:'mm',format:'a4'}),W=210,H=297,g=b.type==='gst',sup=b.sup||{name:db.shop.name,addr:db.shop.addr,gstin:db.shop.gstin,state:db.shop.stateCode},bal=Math.max(b.total-b.paid,0);
 const L=b.items.map(i=>{const tx=i.tx!==undefined?i.tx:i.qty*i.rate,tax=tx*(i.gst||0)/100;return{...i,tx,tax,gr:i.qty*i.rate}});
 const base={theme:'grid',margin:{left:10,right:10},styles:{fontSize:8.5,cellPadding:1.8,lineColor:[70,70,70],lineWidth:.15,textColor:20}};
 let y=14;
 doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text(b.isCN?(g?'CREDIT NOTE':'RETURN NOTE'):(g?'TAX INVOICE':'CASH MEMO / ESTIMATE'),W/2,y,{align:'center'});
 doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(g?'Original for Recipient':b.inv,W-10,y,{align:'right'});y+=7;
 doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text(sup.name||'',10,y);y+=5;
 doc.setFont('helvetica','normal');doc.setFontSize(9);
 [sup.addr,sup.phone?'Phone: '+sup.phone:'',g?'GSTIN: '+(sup.gstin||'Not set')+'   State: '+sn(sup.state):''].filter(Boolean).forEach(t=>{doc.text(t,10,y);y+=4.5});
 y+=2;
 doc.autoTable({...base,startY:y,body:[g?[(b.isCN?'Credit note no: ':'Invoice No: ')+b.inv+'\nDate: '+dmy(b.date)+(b.isCN?'\nAgainst invoice: '+b.billInv:'\nReverse charge: No'),'Place of supply: '+sn(b.state)]:['Date: '+dmy(b.date)+'\nNo: '+b.inv,'To: '+b.customerName+(b.phone?'\n'+b.phone:'')]],columnStyles:{0:{cellWidth:95}}});
 y=doc.lastAutoTable.finalY;
 if(g){doc.autoTable({...base,startY:y,body:[['Bill to: '+b.customerName+'\n'+(b.addr||'')+(b.phone?'\nPhone: '+b.phone:'')+'\nGSTIN: '+(b.gstin||'Unregistered')+'\nState: '+sn(b.state)]]});y=doc.lastAutoTable.finalY}
 y+=4;
 const R=idx=>({didParseCell:c=>{if(idx.includes(c.column.index))c.cell.styles.halign='right'}});
 doc.autoTable({...base,startY:y,...(g?R([3,4,5,6,7,8,9]):R([2,3,4,5])),headStyles:{fillColor:[225,225,225],textColor:20,fontStyle:'bold'},
  head:[g?['Sr','Description','HSN','Qty','Rate','Disc','Taxable','GST %','GST amt','Total']:['Sr','Item','Qty','Rate','Disc','Amount']],
  body:L.map((x,i)=>g?[String(i+1),x.name,x.hsn||'',x.qty+' '+x.unit,f2(x.rate),f2(x.gr-x.tx),f2(x.tx),String(x.gst||0),f2(x.tax),f2(x.tx+x.tax)]:[String(i+1),x.name,x.qty+' '+x.unit,f2(x.rate),f2(x.gr-x.tx),f2(x.tx)])});
 y=doc.lastAutoTable.finalY+4;
 const rows=[];
 if(b.disc>0.004)rows.push(['Discount given',f2(b.disc)]);
 if(g){const tax=L.reduce((s,x)=>s+x.tax,0);rows.push(['Taxable value',f2(L.reduce((s,x)=>s+x.tx,0))]);if(b.inter)rows.push(['IGST',f2(tax)]);else{rows.push(['CGST',f2(tax/2)]);rows.push(['SGST',f2(tax/2)])}if(b.round)rows.push(['Round off',f2(b.round)])}
 rows.push([g?'Invoice total':'Total',f2(b.total)]);if(!b.isCN)rows.push(['Paid',f2(b.paid)],['Balance due',f2(bal)]);
 doc.autoTable({...base,startY:y,body:rows,tableWidth:80,margin:{left:W-90,right:10},columnStyles:{1:{halign:'right'}},styles:{...base.styles,fontStyle:'bold'}});
 y=doc.lastAutoTable.finalY+6;
 doc.setFont('helvetica','normal');doc.setFontSize(9);
 doc.text(doc.splitTextToSize('Amount in words: '+words(b.total),W-20),10,y);y+=10;
 doc.setFontSize(8);doc.text(doc.splitTextToSize(g?'Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.':'This is an estimate and not a tax invoice. Thank you for your business.',W-20),10,y);
 doc.setFontSize(9);doc.text('Customer signature',10,H-22);doc.text('For '+(sup.name||''),W-10,H-26,{align:'right'});doc.text('Authorised signatory',W-10,H-22,{align:'right'});
 if(b.cancelled){doc.setTextColor(200,0,0);doc.setFont('helvetica','bold');doc.setFontSize(48);doc.text('CANCELLED',W/2,H/2,{align:'center',angle:30})}
 return{name:(b.inv||'invoice').replace(/[\/\\]/g,'-')+'.pdf',b64:doc.output('datauristring').split('base64,')[1],doc};
}

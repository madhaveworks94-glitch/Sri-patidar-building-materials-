import {db} from './store.js';
import {STATES,fy} from './invoice.js';
const f2=n=>Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const sn=c=>{const s=STATES.find(x=>x[0]===c);return s?s[1]+' ('+c+')':c||''};
const dmy=t=>{const x=new Date(t);return String(x.getDate()).padStart(2,'0')+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+x.getFullYear()};
const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
const load=u=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=()=>no(new Error('offline'));document.head.appendChild(s)});
export async function tools(){
 if(!(window.jspdf&&window.jspdf.jsPDF))await load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
 if(!window.jspdf.jsPDF.API.autoTable)await load('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js');
 return window.jspdf.jsPDF;
}
export async function makePdf(d,from,to){
 const J=await tools(),doc=new J({orientation:'landscape',unit:'mm',format:'a4'}),W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight();
 const sh=db.shop,r=d.rows,b2b=r.filter(x=>x.b.gstin),b2c=r.filter(x=>!x.b.gstin);
 const a=new Date(from+'T00:00:00').getTime(),z=new Date(to+'T00:00:00').getTime();
 let y=14;
 const base={theme:'grid',margin:{left:10,right:10},styles:{fontSize:8,cellPadding:1.6,lineColor:[70,70,70],lineWidth:.15,textColor:20}};
 const head=t=>{if(y>H-45){doc.addPage();y=14}doc.setFont('helvetica','bold');doc.setFontSize(10.5);doc.text(t,10,y);y+=3};
 const tbl=(hd,body,foot,right)=>{doc.autoTable({...base,startY:y,head:[hd],body,foot:foot?[foot]:undefined,showFoot:'lastPage',headStyles:{fillColor:[225,225,225],textColor:20,fontStyle:'bold'},footStyles:{fillColor:[240,240,240],textColor:20,fontStyle:'bold'},didParseCell:c=>{if(right.includes(c.column.index))c.cell.styles.halign='right'}});y=doc.lastAutoTable.finalY+8};

 doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('SALES REGISTER (OUTWARD SUPPLIES)',W/2,y,{align:'center'});y+=6;
 doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text('Statement of outward supplies under the Central Goods and Services Tax Act, 2017. Supporting statement for GSTR-1 and GSTR-3B.',W/2,y,{align:'center'});y+=4;
 doc.setLineWidth(.5);doc.line(10,y,W-10,y);y+=5;
 doc.autoTable({...base,startY:y,body:[['Legal / trade name',sh.name],['GSTIN of supplier',sh.gstin||'Not set'],['Address',sh.addr||'Not set'],['State',sn(sh.stateCode||'23')],['Tax period',dmy(a)+' to '+dmy(z)],['Financial year','20'+fy(a)],['No. of tax invoices',String(r.length)],['Statement generated on',dmy(Date.now())]],columnStyles:{0:{fontStyle:'bold',fillColor:[240,240,240],cellWidth:55}}});
 y=doc.lastAutoTable.finalY+8;

 head('A. Summary of outward supplies');
 const row=(l,x)=>[l,String(x.length),f2(sum(x,k=>k.tx)),f2(sum(x,k=>k.cgst)),f2(sum(x,k=>k.sgst)),f2(sum(x,k=>k.igst)),f2(sum(x,k=>k.b.total))];
 tbl(['Category','No. of invoices','Taxable value (Rs.)','CGST (Rs.)','SGST (Rs.)','IGST (Rs.)','Invoice value (Rs.)'],[row('B2B (recipient has GSTIN)',b2b),row('B2C (recipient unregistered)',b2c)],row('Total',r),[1,2,3,4,5,6]);

 head('B. Invoice-wise details');
 tbl(['Sr','Invoice no.','Date','Recipient','GSTIN of recipient','Place of supply','Taxable (Rs.)','CGST (Rs.)','SGST (Rs.)','IGST (Rs.)','Invoice value (Rs.)'],
  r.map((x,i)=>[String(i+1),x.b.inv,dmy(x.b.date),x.b.customerName,x.b.gstin||'Unregistered',sn(x.b.state),f2(x.tx),f2(x.cgst),f2(x.sgst),f2(x.igst),f2(x.b.total)]),
  ['','','','','','Total',f2(sum(r,x=>x.tx)),f2(sum(r,x=>x.cgst)),f2(sum(r,x=>x.sgst)),f2(sum(r,x=>x.igst)),f2(sum(r,x=>x.b.total))],[0,6,7,8,9,10]);

 head('C. HSN-wise summary of outward supplies');
 tbl(['HSN','Description','UQC','Total quantity','Total value (Rs.)','Taxable value (Rs.)','Rate %','IGST (Rs.)','CGST (Rs.)','SGST (Rs.)'],
  d.hs.map(x=>[x.hsn||'-',x.name,x.uqc,String(x.qty),f2(x.tx+x.cgst+x.sgst+x.igst),f2(x.tx),String(x.rate),f2(x.igst),f2(x.cgst),f2(x.sgst)]),null,[3,4,5,6,7,8,9]);

 head('D. Rate-wise summary');
 const g={};d.hs.forEach(x=>{const k=g[x.rate]=g[x.rate]||{tx:0,cgst:0,sgst:0,igst:0};k.tx+=x.tx;k.cgst+=x.cgst;k.sgst+=x.sgst;k.igst+=x.igst});
 const rates=Object.keys(g).map(Number).sort((p,q)=>p-q);
 tbl(['Tax rate %','Taxable value (Rs.)','CGST (Rs.)','SGST (Rs.)','IGST (Rs.)','Total tax (Rs.)'],rates.map(k=>[String(k),f2(g[k].tx),f2(g[k].cgst),f2(g[k].sgst),f2(g[k].igst),f2(g[k].cgst+g[k].sgst+g[k].igst)]),
  ['Total',f2(sum(r,x=>x.tx)),f2(sum(r,x=>x.cgst)),f2(sum(r,x=>x.sgst)),f2(sum(r,x=>x.igst)),f2(sum(r,x=>x.cgst+x.sgst+x.igst))],[0,1,2,3,4,5]);

 if(y>H-60){doc.addPage();y=14}
 head('E. Declaration');
 doc.setFont('helvetica','normal');doc.setFontSize(9);
 const t=doc.splitTextToSize('I declare that the particulars given in this statement are true and correct and have been compiled from the tax invoices issued by the registered person during the period stated above. No material information has been concealed.',W-20);
 doc.text(t,10,y+3);y+=t.length*4.5+12;
 doc.text('Name of authorised signatory: ________________________________',10,y);doc.text('Designation: ______________________',160,y);y+=12;
 doc.text('Place: ______________________',10,y);doc.text('Date: ______________________',100,y);doc.line(W-75,y+2,W-10,y+2);doc.text('Signature and seal',W-70,y+7);

 const n=doc.internal.getNumberOfPages();
 for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(7.5);doc.setTextColor(90);doc.text((sh.name||'')+'   GSTIN: '+(sh.gstin||'Not set')+'   Computer generated statement',10,H-6);doc.text('Page '+i+' of '+n,W-10,H-6,{align:'right'})}
 return{name:'Sales-Register-'+from+'_to_'+to+'.pdf',b64:doc.output('datauristring').split('base64,')[1],doc};
}

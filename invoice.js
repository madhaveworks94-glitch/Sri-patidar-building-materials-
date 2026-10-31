document.head.insertAdjacentHTML('beforeend',`<style>
.inv{background:#fff;color:#111;border:1px solid #cfcfcf;padding:14px;font:500 13px/1.4 Hind,system-ui,sans-serif}
.inv *{color:#111}.inv .m{color:#555}
.inv-t{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:6px;margin-bottom:8px}
.inv-t b{font-size:17px;letter-spacing:.5px}
.inv-n{font-size:18px}
.inv-2{display:grid;grid-template-columns:1fr 1fr;gap:8px;border:1px solid #444;margin:10px 0}
.inv-2>div{padding:8px}.inv-2>div+div{border-left:1px solid #444}
.inv-sc{overflow-x:auto;margin:8px 0}
.inv table{border-collapse:collapse;width:100%;min-width:560px;background:#fff;border-radius:0}
.inv th,.inv td{border:1px solid #444;padding:5px 6px;font-size:12px;text-align:left;background:#fff}
.inv th{background:#f1f1f1}.inv td.r,.inv th.r{text-align:right}
.inv-tt{margin-left:auto;max-width:300px}
.inv-tt div{display:flex;justify-content:space-between;padding:3px 0}
.inv-tt .g{border-top:2px solid #111;font-size:16px;font-weight:700;margin-top:4px;padding-top:6px}
.inv-sig{display:flex;justify-content:space-between;align-items:flex-end;margin-top:26px;gap:12px}
</style>`);
const STATES=('01 Jammu and Kashmir,02 Himachal Pradesh,03 Punjab,04 Chandigarh,05 Uttarakhand,06 Haryana,07 Delhi,08 Rajasthan,09 Uttar Pradesh,10 Bihar,11 Sikkim,12 Arunachal Pradesh,13 Nagaland,14 Manipur,15 Mizoram,16 Tripura,17 Meghalaya,18 Assam,19 West Bengal,20 Jharkhand,21 Odisha,22 Chhattisgarh,23 Madhya Pradesh,24 Gujarat,26 Dadra and Nagar Haveli and Daman and Diu,27 Maharashtra,29 Karnataka,30 Goa,31 Lakshadweep,32 Kerala,33 Tamil Nadu,34 Puducherry,35 Andaman and Nicobar Islands,36 Telangana,37 Andhra Pradesh,38 Ladakh').split(',').map(s=>[s.slice(0,2),s.slice(3)]);
export {STATES};
const sn=c=>{const s=STATES.find(x=>x[0]===c);return s?`${s[1]} (${c})`:c||''};
export const fy=(t=Date.now())=>{const d=new Date(t),y=d.getFullYear()%100,a=d.getMonth()>=3?y:(y+99)%100;return String(a).padStart(2,'0')+'-'+String((a+1)%100).padStart(2,'0')};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const f2=n=>Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const A=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'],T=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
const two=n=>n<20?A[n]:T[Math.floor(n/10)]+(n%10?' '+A[n%10]:'');
const three=n=>(n>=100?A[Math.floor(n/100)]+' Hundred'+(n%100?' ':''):'')+(n%100?two(n%100):'');
export function words(n){n=Math.round(n*100)/100;const r=Math.floor(n),p=Math.round((n-r)*100);let s='';
 const cr=Math.floor(r/1e7),lk=Math.floor(r%1e7/1e5),th=Math.floor(r%1e5/1e3),rest=r%1e3;
 if(cr)s+=three(cr)+' Crore ';if(lk)s+=two(lk)+' Lakh ';if(th)s+=two(th)+' Thousand ';if(rest)s+=three(rest)+' ';
 return 'Rupees '+(s.trim()||'Zero')+(p?' and '+two(p)+' Paise':'')+' Only';}

export function invoiceHTML(b){
 const g=b.type==='gst',sup=b.sup||{name:'',addr:'',gstin:'',state:''},d=new Date(b.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
 const L=b.items.map(i=>{const tx=i.tx!==undefined?i.tx:i.qty*i.rate,tax=tx*(i.gst||0)/100;return{...i,tx,tax,tot:tx+tax,gr:i.qty*i.rate}});
 const sumTx=L.reduce((s,x)=>s+x.tx,0),sumTax=L.reduce((s,x)=>s+x.tax,0),bal=Math.max(b.total-b.paid,0);
 const head=`<div class="inv-h"><b class="inv-n">${esc(sup.name)}</b><br>${esc(sup.addr)}${sup.phone?'<br>Phone: '+esc(sup.phone):''}${g?`<br><b>GSTIN: ${esc(sup.gstin||'Not set')}</b><br>State: ${esc(sn(sup.state))}`:''}</div>`;
 const pay=b.isCN?'':`<div class="inv-tt"><div><span>Paid</span><span>${f2(b.paid)}</span></div><div><span>Balance due</span><b>${f2(bal)}</b></div></div>`;
 if(!g)return`<div class="inv"><div class="inv-t"><b>${b.isCN?'RETURN NOTE':'CASH MEMO / ESTIMATE'}</b><span class="m">${esc(b.inv)}</span></div>${head}
 <div class="inv-2"><div>Date: <b>${d}</b></div><div>To: <b>${esc(b.customerName)}</b>${b.phone?'<br>'+esc(b.phone):''}</div></div>
 <div class="inv-sc"><table><tr><th>#</th><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>${L.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.name)}</td><td class="r">${x.qty} ${esc(x.unit)}</td><td class="r">${f2(x.rate)}</td><td class="r">${f2(x.tx)}</td></tr>`).join('')}</table></div>
 <div class="inv-tt">${b.disc>0.004?`<div><span>Items total</span><span>${f2(b.gross)}</span></div><div><span>Discount</span><span>- ${f2(b.disc)}</span></div>`:''}<div class="g"><span>Total</span><span>${f2(b.total)}</span></div></div>${pay}<p class="m" style="margin-top:10px">This is an estimate and not a tax invoice. Thank you for your business.</p></div>`;
 const split=!b.inter;
 return`<div class="inv"><div class="inv-t"><b>${b.isCN?'CREDIT NOTE':'TAX INVOICE'}</b><span class="m">Original for Recipient</span></div>${head}
 <div class="inv-2"><div>${b.isCN?'Credit note no':'Invoice No'}: <b>${esc(b.inv)}</b><br>Date: <b>${d}</b>${b.isCN?'<br>Against invoice: '+esc(b.billInv)+' dated '+new Date(b.billDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'<br>Reverse charge: No'}</div><div>Place of supply:<br><b>${esc(sn(b.state))}</b></div></div>
 <div class="inv-2" style="grid-template-columns:1fr"><div><b>Bill to</b><br><b>${esc(b.customerName)}</b><br>${esc(b.addr||'')}${b.phone?'<br>Phone: '+esc(b.phone):''}<br>GSTIN: ${esc(b.gstin||'Unregistered')}<br>State: ${esc(sn(b.state))}</div></div>
 <div class="inv-sc"><table><tr><th>#</th><th>Description</th><th>HSN</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Disc</th><th class="r">Taxable value</th><th class="r">GST %</th><th class="r">GST amt</th><th class="r">Total</th></tr>${L.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.name)}</td><td>${esc(x.hsn||'')}</td><td class="r">${x.qty} ${esc(x.unit)}</td><td class="r">${f2(x.rate)}</td><td class="r">${f2(x.gr-x.tx)}</td><td class="r">${f2(x.tx)}</td><td class="r">${x.gst||0}</td><td class="r">${f2(x.tax)}</td><td class="r">${f2(x.tot)}</td></tr>`).join('')}</table></div>
 <div class="inv-tt">${b.disc>0.004?`<div><span>Discount given</span><span>${f2(b.disc)}</span></div>`:''}<div><span>Taxable value</span><span>${f2(sumTx)}</span></div>${split?`<div><span>CGST</span><span>${f2(sumTax/2)}</span></div><div><span>SGST</span><span>${f2(sumTax/2)}</span></div>`:`<div><span>IGST</span><span>${f2(sumTax)}</span></div>`}${b.round?`<div><span>Round off</span><span>${f2(b.round)}</span></div>`:''}<div class="g"><span>Invoice total</span><span>${f2(b.total)}</span></div></div>
 <p style="margin:8px 0 0"><b>Amount in words:</b> ${words(b.total)}</p>${pay}
 <p class="m" style="margin-top:12px;font-size:12px">Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
 <div class="inv-sig"><span class="m">Customer signature</span><span style="text-align:right">For <b>${esc(sup.name)}</b><br><br>Authorised signatory</span></div></div>`;
}

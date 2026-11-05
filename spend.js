import {db,save,uid,inr,dateFmt} from './store.js';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num=v=>parseFloat(v)||0;
const CATS=['Purchase from supplier','Transport / fuel','Salary / labour','Shop rent','Electricity','Repair','Other'];
let root,msg='';
const $=s=>root.querySelector(s);
const sp=()=>(db.spend=db.spend||[]);
export const owe=p=>sp().filter(e=>e.party===p).reduce((s,e)=>s+(e.type==='pay'?-e.amount:e.amount-e.paid),0);
const parties=()=>[...new Set(sp().map(e=>e.party).filter(Boolean))];
const today=()=>new Date().toISOString().slice(0,10);
const at=s=>new Date((s||today())+'T12:00:00').getTime();

function list(){
 const n=new Date(),ms=new Date(n.getFullYear(),n.getMonth(),1).getTime();
 const month=sp().filter(e=>e.type==='spend'&&e.date>=ms).reduce((s,e)=>s+e.amount,0);
 const dues=parties().map(p=>({p,o:owe(p)})).filter(x=>x.o>0.004).sort((a,b)=>b.o-a.o);
 root.innerHTML=`<div class="bl"><h1>Spend and suppliers</h1>
 <div class="card hero"><h3>Spent this month</h3><div class="num">${inr(month)}</div><span class="pill">You owe suppliers ${inr(dues.reduce((s,x)=>s+x.o,0))}</span></div>
 <button class="btn dark" id="s-add" type="button" style="margin-top:12px">+ Add spend or purchase</button><div id="s-form"></div>
 ${dues.length?`<h3 class="mute" style="margin:16px 4px 6px">You owe suppliers</h3>${dues.map(x=>`<div class="card" style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center"><span><b>${esc(x.p)}</b><br><small class="bad"><b>${inr(x.o)}</b></small></span><button class="btn ghost" style="flex:none;width:auto;padding:0 18px;margin:0" data-pay="${esc(x.p)}">Pay</button></div>`).join('')}`:''}
 <div class="bl-msg" style="color:var(--ok)">${esc(msg)}</div>
 <h3 class="mute" style="margin:16px 4px 6px">Recent entries</h3><div class="card">${sp().slice().sort((a,b)=>b.date-a.date).slice(0,30).map(e=>`<div class="kh-r"><span><b>${esc(e.type==='pay'?'Paid to '+e.party:e.cat)}</b><br><small>${dateFmt(e.date)}${e.party&&e.type!=='pay'?', '+esc(e.party):''}${e.note?', '+esc(e.note):''}</small></span><span style="text-align:right"><b>${inr(e.amount)}</b><br><button class="link" style="margin:0;font-size:12px" data-del="${e.id}">Delete</button></span></div>`).join('')||'<p class="mute">Nothing yet.</p>'}</div></div>`;
 root.onclick=e=>{const t=e.target,d=t.dataset;
  if(t.id==='s-add')$('#s-form').innerHTML=`<div class="card" style="margin-top:10px"><label>Date</label><input type="date" id="f-d" value="${today()}"><label>What was it for</label><select id="f-c">${CATS.map(c=>`<option>${c}</option>`).join('')}</select><label>Supplier or person (optional)</label><input id="f-p" list="f-l" autocomplete="off"><datalist id="f-l">${parties().map(p=>`<option value="${esc(p)}">`).join('')}</datalist><label>Amount (₹)</label><input id="f-a" inputmode="decimal"><label>Paid now (₹, leave empty if fully paid)</label><input id="f-r" inputmode="decimal"><label>Note (optional)</label><input id="f-n"><div class="bl-msg" id="f-m"></div><button class="btn dark" id="f-s" type="button">Save</button></div>`;
  else if(t.id==='f-s'){const a=num($('#f-a').value),pd=$('#f-r').value===''?a:Math.min(num($('#f-r').value),a),p=$('#f-p').value.trim();
   if(a<=0)return $('#f-m').textContent='Enter the amount.';if(a-pd>0.004&&!p)return $('#f-m').textContent='Enter the supplier name when part is unpaid.';
   sp().push({id:uid(),type:'spend',date:at($('#f-d').value),cat:$('#f-c').value,party:p,amount:a,paid:pd,note:$('#f-n').value.trim()});save();msg='Saved.';list()}
  else if(d.pay){const p=d.pay,o=owe(p);$('#s-form').innerHTML=`<div class="card" style="margin-top:10px"><b>Pay ${esc(p)}</b><p class="mute" style="margin:0">You owe ${inr(o)}</p><label>Amount paid (₹)</label><input id="y-a" inputmode="decimal" value="${o}"><label>Date</label><input type="date" id="y-d" value="${today()}"><button class="btn dark" id="y-s" data-p="${esc(p)}" type="button">Save payment</button></div>`}
  else if(t.id==='y-s'){const p=d.p,a=Math.min(num($('#y-a').value),owe(p));if(a<=0)return;sp().push({id:uid(),type:'pay',date:at($('#y-d').value),party:p,amount:a,paid:a});save();msg='Payment saved.';list()}
  else if(d.del){if(d.a){db.spend=sp().filter(x=>x.id!==d.del);save();list()}else{d.a=1;t.textContent='Tap again'}}
 };
}
export function mountSpend(r){root=r;msg='';list()}

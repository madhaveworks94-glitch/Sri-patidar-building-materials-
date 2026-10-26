import {db,save,uid,inr,dateFmt} from './store.js';
const num=v=>parseFloat(v)||0,fmt=n=>String(Math.round(n*100)/100);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let root,sel=null,edit=null,q='',flt='all',msg='';
const $=s=>root.querySelector(s);
const log=()=>(db.stockLog=db.stockLog||[]);
const per=(p,u)=>(p.units.find(x=>x.name===u)||{per:1}).per;
const low=p=>p.stock<=p.low;
function show(p){const big=p.units.filter(u=>u.per>1).sort((a,b)=>b.per-a.per).find(u=>Math.abs(p.stock)>=u.per);return`${fmt(p.stock)} ${esc(p.baseUnit)}`+(big?` (${fmt(p.stock/big.per)} ${esc(big.name)})`:'')}
const note=(p,qty,type,txt,cost)=>log().push({id:uid(),pid:p.id,qty,type,note:txt||'',cost:cost||0,date:Date.now()});
function render(){edit?form():sel?detail():list()}

function list(){
 const items=db.products.filter(p=>(!q||p.name.toLowerCase().includes(q.toLowerCase()))&&(flt==='all'||low(p)));
 const val=db.products.reduce((s,p)=>s+Math.max(p.stock,0)*p.rate,0),nl=db.products.filter(low).length;
 root.innerHTML=`<div class="bl"><h1>Inventory</h1><div class="card hero"><h3>Stock value at selling rate</h3><div class="num">${inr(val)}</div><span class="pill">${db.products.length} items</span> <span class="pill">${nl} low</span></div>
 <div class="seg"><button data-f="all" class="${flt==='all'?'on':''}">All items</button><button data-f="low" class="${flt==='low'?'on':''}">Low stock</button></div>
 <input id="in-q" value="${esc(q)}" placeholder="Search item"><div style="margin-top:12px">${items.length?items.map(p=>`<button class="card kh" data-p="${p.id}"><span><b>${esc(p.name)}</b><br><small class="mute">${show(p)}</small></span><span style="text-align:right">${low(p)?'<b class="bad">Low</b><br>':''}<small class="mute">${inr(p.rate)} / ${esc(p.baseUnit)}</small></span></button>`).join(''):'<p class="mute">No items here yet.</p>'}</div>
 <button class="btn dark" id="in-new" type="button">+ Add item</button></div>`;
 $('#in-q').oninput=e=>{q=e.target.value;const p=e.target.selectionStart;list();const i=$('#in-q');i.focus();i.setSelectionRange(p,p)};
 root.onclick=e=>{const t=e.target,p=t.closest('[data-p]');
  if(t.dataset.f){flt=t.dataset.f;list()}else if(p){sel=p.dataset.p;msg='';render()}else if(t.id==='in-new'){edit='new';render()}};
}

function form(){
 const n=edit==='new',p=n?{name:'',baseUnit:'',units:[],rate:'',gst:18,low:''}:db.products.find(x=>x.id===edit),ex=p.units.filter(u=>u.name!==p.baseUnit);
 const f=(id,l,v,ph,m)=>`<label>${l}</label><input id="${id}" value="${esc(v??'')}" placeholder="${ph||''}" ${m?'inputmode="decimal"':''}>`;
 root.innerHTML=`<div class="bl"><h1>${n?'Add item':'Edit item'}</h1><div class="card">${f('f-n','Item name',p.name,'Cement (PPC)')}${f('f-b','Smallest unit (what you count)',p.baseUnit,'bag, kg, pcs, cft')}
 <label style="margin-top:14px">Bigger units (optional)</label><p class="mute" style="margin:0">Example: 1 ton = 20 bags. Name the unit, then say how many smallest units it holds.</p>
 <div class="bl-3" style="grid-template-columns:1fr 1fr"><input id="f-u1" value="${esc(ex[0]?ex[0].name:'')}" placeholder="Unit, like ton"><input id="f-p1" inputmode="decimal" value="${ex[0]?ex[0].per:''}" placeholder="Holds how many"><input id="f-u2" value="${esc(ex[1]?ex[1].name:'')}" placeholder="Another unit"><input id="f-p2" inputmode="decimal" value="${ex[1]?ex[1].per:''}" placeholder="Holds how many"></div>
 ${f('f-r','Selling rate per smallest unit (₹)',p.rate,'395',1)}${f('f-g','GST %',p.gst,'18',1)}${f('f-l','Low stock alert at (smallest units)',p.low,'50',1)}${n?f('f-s','Opening stock (smallest units)','','0',1):''}
 <div class="bl-msg" id="f-m"></div><button class="btn dark" id="f-save" type="button">Save item</button><button class="btn ghost" id="f-x" type="button">Cancel</button></div></div>`;
 root.onclick=e=>{const t=e.target;
  if(t.id==='f-x'){edit=null;render()}
  else if(t.id==='f-save'){const name=$('#f-n').value.trim(),b=$('#f-b').value.trim();if(!name||!b)return $('#f-m').textContent='Enter the item name and its smallest unit.';
   const units=[{name:b,per:1}];[1,2].forEach(i=>{const u=$('#f-u'+i).value.trim(),k=num($('#f-p'+i).value);if(u&&k>0&&!units.some(x=>x.name===u))units.push({name:u,per:k})});
   const d={name,baseUnit:b,units,rate:num($('#f-r').value),gst:num($('#f-g').value),low:num($('#f-l').value)};
   if(n){const np={id:uid(),stock:num($('#f-s').value),cost:0,...d};db.products.push(np);if(np.stock>0)note(np,np.stock,'in','Opening stock');sel=np.id}else Object.assign(p,d);
   save();edit=null;msg='Saved.';render()}};
}

function detail(){
 const p=db.products.find(x=>x.id===sel);if(!p){sel=null;return list()}
 const h=log().filter(x=>x.pid===p.id).sort((a,b)=>b.date-a.date).slice(0,8);
 root.innerHTML=`<div class="bl"><button class="link" id="d-back" style="margin:0 0 8px">← All items</button><h1 style="margin:0">${esc(p.name)}</h1><div class="mute">${inr(p.rate)} per ${esc(p.baseUnit)}, GST ${p.gst}%${p.units.length>1?', '+p.units.filter(u=>u.per>1).map(u=>'1 '+esc(u.name)+' = '+fmt(u.per)+' '+esc(p.baseUnit)).join(', '):''}</div>
 <div class="card" style="margin-top:12px"><h3>In stock</h3><div class="num ${low(p)?'bad':''}">${show(p)}</div>${low(p)?'<div class="bad"><b>Low stock, reorder soon.</b></div>':''}
 <div class="btns"><button class="btn dark" id="d-in" type="button">Add stock</button><button class="btn ghost" id="d-adj" type="button">Count / fix</button></div><div id="d-panel"></div><div class="bl-msg" style="color:var(--ok)">${esc(msg)}</div></div>
 <h3 class="mute" style="margin:16px 4px 4px">Recent stock changes</h3><div class="card">${h.map(x=>`<div class="kh-r"><span><b>${x.type==='in'?'Stock added':'Count fixed'}</b><br><small>${dateFmt(x.date)}${x.note?', '+esc(x.note):''}</small></span><b class="${x.qty>=0?'ok':'bad'}">${x.qty>=0?'+':''}${fmt(x.qty)} ${esc(p.baseUnit)}</b></div>`).join('')||'<p class="mute">No changes recorded yet. Sales reduce stock automatically.</p>'}</div>
 <button class="btn ghost" id="d-edit" type="button" style="margin-top:12px">Edit item</button><button class="btn ghost" id="d-del" type="button">Delete item</button></div>`;
 root.onclick=e=>{const t=e.target;
  if(t.id==='d-back'){sel=null;msg='';list()}
  else if(t.id==='d-edit'){edit=p.id;render()}
  else if(t.id==='d-del'){if(t.dataset.a){db.products=db.products.filter(x=>x!==p);save();sel=null;list()}else{t.dataset.a=1;t.textContent='Tap again to delete'}}
  else if(t.id==='d-in')$('#d-panel').innerHTML=`<label>Quantity received</label><input id="i-q" inputmode="decimal"><label>Unit</label><select id="i-u">${p.units.map(u=>`<option>${esc(u.name)}</option>`).join('')}</select><label>Buying price per unit (₹, optional)</label><input id="i-c" inputmode="decimal"><label>Note (supplier, optional)</label><input id="i-n"><button class="btn dark" id="i-s" type="button">Save stock</button>`;
  else if(t.id==='i-s'){const u=$('#i-u').value,q=num($('#i-q').value)*per(p,u);if(q<=0){msg='';return $('#d-panel').insertAdjacentHTML('beforeend','<div class="bl-msg">Enter a quantity.</div>')}
   const c=num($('#i-c').value)/per(p,u),old=Math.max(p.stock,0);if(c>0)p.cost=old+q>0?(old*(p.cost||0)+q*c)/(old+q):c;
   p.stock+=q;note(p,q,'in',$('#i-n').value.trim(),c);save();msg='Added '+fmt(q)+' '+p.baseUnit+'.';detail()}
  else if(t.id==='d-adj')$('#d-panel').innerHTML=`<label>Actual count now (${esc(p.baseUnit)})</label><input id="a-q" inputmode="decimal" value="${fmt(p.stock)}"><label>Reason (optional)</label><input id="a-n" placeholder="Damaged, counted, returned"><button class="btn dark" id="a-s" type="button">Save count</button>`;
  else if(t.id==='a-s'){const v=num($('#a-q').value),d=v-p.stock;if(d!==0){p.stock=v;note(p,d,'adjust',$('#a-n').value.trim());save()}msg='Stock updated.';detail()}
 };
}
export function mountStock(r){root=r;render()}

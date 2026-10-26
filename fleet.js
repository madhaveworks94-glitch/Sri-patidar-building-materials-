import {db,save,uid,inr,dateFmt} from './store.js';
const num=v=>parseFloat(v)||0;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let root,sel=null,edit=null,msg='';
const $=s=>root.querySelector(s);
const act=v=>db.trips.find(t=>t.vid===v.id&&!t.done);
const days=d=>d?Math.ceil((new Date(d)-Date.now())/864e5):null;
const alerts=v=>[['Insurance',v.ins],['PUC',v.puc]].map(([l,d])=>{const n=days(d);return n!==null&&n<=30?l+(n<0?' expired':' ends in '+n+' days'):''}).filter(Boolean);
const net=t=>num(t.freight)-num(t.fuel)-num(t.other);
const km=t=>t.kmStart&&t.kmEnd&&t.kmEnd>t.kmStart?t.kmEnd-t.kmStart:0;
const render=()=>edit?form():sel?detail():list();
const fld=(id,l,v,ph,t)=>`<label>${l}</label><input id="${id}" ${t?`type="${t}"`:''} value="${esc(v??'')}" placeholder="${ph||''}" ${t==='number'?'inputmode="decimal"':''}>`;

function list(){
 const on=db.trips.filter(t=>!t.done).length,al=db.vehicles.reduce((s,v)=>s+alerts(v).length,0);
 root.innerHTML=`<div class="bl"><h1>Fleet</h1><div class="card hero"><h3>Vehicles on trip</h3><div class="num">${on} of ${db.vehicles.length}</div><span class="pill">${al} document alerts</span></div>
 <div style="margin-top:12px">${db.vehicles.map(v=>{const t=act(v),a=alerts(v);return`<button class="card kh" data-v="${v.id}"><span><b>${esc(v.name)}</b> <small class="mute">${esc(v.plate)}</small><br><small class="mute">${esc(v.driver||'No driver set')}</small>${a.length?`<br><small class="bad"><b>${a.join(', ')}</b></small>`:''}</span><b style="color:${t?'var(--or)':'var(--ok)'}">${t?'On trip':'Free'}</b></button>`}).join('')||'<p class="mute">No vehicles yet. Add your delivery vehicle.</p>'}</div>
 <button class="btn dark" id="v-new" type="button">+ Add vehicle</button></div>`;
 root.onclick=e=>{const t=e.target,v=t.closest('[data-v]');if(v){sel=v.dataset.v;msg='';render()}else if(t.id==='v-new'){edit='new';render()}};
}

function form(){
 const n=edit==='new',v=n?{}:db.vehicles.find(x=>x.id===edit);
 root.innerHTML=`<div class="bl"><h1>${n?'Add vehicle':'Edit vehicle'}</h1><div class="card">${fld('v-n','Vehicle name',v.name,'Tata Ace, Tractor')}${fld('v-p','Number plate',v.plate,'MP 09 AB 1234')}${fld('v-d','Driver name',v.driver)}${fld('v-ph','Driver phone',v.phone,'','tel')}${fld('v-i','Insurance valid till',v.ins,'','date')}${fld('v-u','PUC valid till',v.puc,'','date')}<div class="bl-msg" id="v-m"></div><button class="btn dark" id="v-s" type="button">Save vehicle</button><button class="btn ghost" id="v-x" type="button">Cancel</button></div></div>`;
 root.onclick=e=>{const t=e.target;if(t.id==='v-x'){edit=null;render()}
  else if(t.id==='v-s'){const name=$('#v-n').value.trim();if(!name)return $('#v-m').textContent='Enter the vehicle name.';
   const d={name,plate:$('#v-p').value.trim().toUpperCase(),driver:$('#v-d').value.trim(),phone:$('#v-ph').value.replace(/\D/g,''),ins:$('#v-i').value,puc:$('#v-u').value};
   if(n){const nv={id:uid(),...d};db.vehicles.push(nv);sel=nv.id}else Object.assign(v,d);save();edit=null;render()}};
}

function detail(){
 const v=db.vehicles.find(x=>x.id===sel);if(!v){sel=null;return list()}
 const t=act(v),a=alerts(v),ms=new Date(new Date().getFullYear(),new Date().getMonth(),1).getTime();
 const all=db.trips.filter(x=>x.vid===v.id&&x.done).sort((a,b)=>b.end-a.end),mo=all.filter(x=>x.end>=ms);
 const sum=(f)=>mo.reduce((s,x)=>s+f(x),0);
 const ph=v.phone.length===10?'91'+v.phone:v.phone;
 const wa=t&&v.phone?`https://wa.me/${ph}?text=${encodeURIComponent(`Trip: ${t.dest}${t.cust?', for '+t.cust:''}. Load: ${t.load||'-'}.${t.billNo?' Bill '+t.billNo+'.':''}`)}`:'';
 root.innerHTML=`<div class="bl"><button class="link" id="d-back" style="margin:0 0 8px">← All vehicles</button><h1 style="margin:0">${esc(v.name)}</h1><div class="mute">${esc(v.plate)}${v.driver?', driver '+esc(v.driver):''}</div>${a.length?`<div class="bad" style="margin-top:6px"><b>${a.join(', ')}</b></div>`:''}
 <div class="card" style="margin-top:12px">${t?`<h3>On trip since ${dateFmt(t.start)}</h3><div class="num" style="font-size:22px">${esc(t.dest)}</div><div class="mute">${esc(t.cust||'')}${t.load?', '+esc(t.load):''}</div><div class="btns"><button class="btn dark" id="t-end" type="button">End trip</button>${wa?`<a class="btn ghost" target="_blank" rel="noopener" href="${wa}">Send to driver</a>`:''}</div>`:`<h3>Status</h3><div class="num ok" style="font-size:22px">Free</div><div class="btns"><button class="btn dark" id="t-start" type="button">Start trip</button></div>`}<div id="d-panel"></div><div class="bl-msg" style="color:var(--ok)">${esc(msg)}</div></div>
 <h3 class="mute" style="margin:16px 4px 4px">This month</h3><div class="card"><div class="bl-l"><span>Trips</span><b>${mo.length}</b></div><div class="bl-l"><span>Distance</span><b>${sum(km)} km</b></div><div class="bl-l"><span>Fuel and expenses</span><b>${inr(sum(x=>num(x.fuel)+num(x.other)))}</b></div><div class="bl-l"><span>Delivery charges earned</span><b>${inr(sum(x=>num(x.freight)))}</b></div><div class="bl-l big"><span>Net</span><b class="${sum(net)>=0?'ok':'bad'}">${inr(sum(net))}</b></div></div>
 <h3 class="mute" style="margin:16px 4px 4px">Recent trips</h3><div class="card">${all.slice(0,8).map(x=>`<div class="kh-r"><span><b>${esc(x.dest)}</b><br><small>${dateFmt(x.end)}${x.cust?', '+esc(x.cust):''}${km(x)?', '+km(x)+' km':''}</small></span><b class="${net(x)>=0?'ok':'bad'}">${inr(net(x))}</b></div>`).join('')||'<p class="mute">No finished trips yet.</p>'}</div>
 <button class="btn ghost" id="d-edit" type="button" style="margin-top:12px">Edit vehicle</button><button class="btn ghost" id="d-del" type="button">Delete vehicle</button></div>`;
 root.onclick=e=>{const x=e.target;
  if(x.id==='d-back'){sel=null;msg='';list()}
  else if(x.id==='d-edit'){edit=v.id;render()}
  else if(x.id==='d-del'){if(x.dataset.a){db.vehicles=db.vehicles.filter(y=>y!==v);db.trips=db.trips.filter(y=>y.vid!==v.id);save();sel=null;list()}else{x.dataset.a=1;x.textContent='Tap again to delete'}}
  else if(x.id==='t-start')$('#d-panel').innerHTML=`${fld('s-d','Destination','','Village or site name')}<label>Customer (optional)</label><input id="s-c" list="s-l"><datalist id="s-l">${db.customers.map(c=>`<option value="${esc(c.name)}">`).join('')}</datalist>${fld('s-o','Load','','100 bags cement')}${fld('s-b','Bill number (optional)')}${fld('s-k','Starting km (optional)','','','number')}<div class="bl-msg" id="s-m"></div><button class="btn dark" id="s-go" type="button">Start trip</button>`;
  else if(x.id==='s-go'){const dest=$('#s-d').value.trim();if(!dest)return $('#s-m').textContent='Enter the destination.';
   db.trips.push({id:uid(),vid:v.id,dest,cust:$('#s-c').value.trim(),load:$('#s-o').value.trim(),billNo:$('#s-b').value.trim(),kmStart:num($('#s-k').value),start:Date.now(),done:false});save();msg='Trip started.';detail()}
  else if(x.id==='t-end')$('#d-panel').innerHTML=`${fld('e-k','Ending km (optional)','','','number')}${fld('e-f','Fuel spent (₹)','','0','number')}${fld('e-o','Other expense, toll or driver (₹)','','0','number')}${fld('e-r','Delivery charge earned (₹)','','0','number')}${fld('e-n','Note (optional)')}<button class="btn dark" id="e-go" type="button">Finish trip</button>`;
  else if(x.id==='e-go'){Object.assign(t,{kmEnd:num($('#e-k').value),fuel:num($('#e-f').value),other:num($('#e-o').value),freight:num($('#e-r').value),note:$('#e-n').value.trim(),end:Date.now(),done:true});save();msg='Trip finished.';detail()}
 };
}
export function mountFleet(r){root=r;render()}

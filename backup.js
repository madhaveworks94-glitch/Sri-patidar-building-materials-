import {db,save,dateFmt,clearAll} from './store.js';
import {STATES} from './invoice.js';
import {addUser,delUser} from './auth.js';
import {setLang,lang} from './lang.js';
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let root,msg='',pending=null;
const $=s=>root.querySelector(s);
const native=()=>{const c=window.Capacitor;return c&&c.isNativePlatform&&c.isNativePlatform()?c.Plugins:null};

async function exportFile(){
 const name=`dukaan-os-backup-${new Date().toISOString().slice(0,10)}.json`,data=JSON.stringify(db),P=native();
 if(P&&P.Filesystem&&P.Share){
  const r=await P.Filesystem.writeFile({path:name,data,directory:'CACHE',encoding:'utf8'});
  await P.Share.share({title:'Dukaan OS backup',url:r.uri,dialogTitle:'Save or send your backup'});
 }else{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove()}
 db.lastBackup=Date.now();save();
}
const f=(id,l,v,ph)=>`<label>${l}</label><input id="${id}" value="${esc(v||'')}" placeholder="${ph||''}">`;
function render(){
 root.innerHTML=`<div class="bl"><h1>Backup</h1>
 <div class="card"><h3>Saved on this phone</h3><div class="bl-l"><span>Bills</span><b>${db.bills.length}</b></div><div class="bl-l"><span>Customers</span><b>${db.customers.length}</b></div><div class="bl-l"><span>Inventory items</span><b>${db.products.length}</b></div><div class="bl-l"><span>Last backup</span><b>${db.lastBackup?dateFmt(db.lastBackup):'Never'}</b></div>
 <p class="mute">All your data stays on this phone. Nothing is sent to a server. If the app is uninstalled or its data is cleared, the data is gone, so back up regularly and keep the file in WhatsApp, Drive, or Files.</p>
 <button class="btn dark" id="b-exp" type="button">Back up now</button></div>
 <div class="card" style="margin-top:12px"><h3>Restore from a backup file</h3>${pending?`<p>Replace everything on this phone with this backup (${pending.bills.length} bills, ${pending.products.length} items)?</p><button class="btn dark" id="b-yes" type="button">Yes, restore</button><button class="btn ghost" id="b-no" type="button">Cancel</button>`:`<input id="b-file" type="file" accept=".json,application/json">`}</div>
 <div class="card" style="margin-top:12px"><h3>Shop details</h3>${f('s-n','Shop name',db.shop.name)}${f('s-o','Owner name',db.shop.owner)}${f('s-g','Shop GSTIN',db.shop.gstin,'15-character GSTIN')}${f('s-a','Shop address',db.shop.addr,'Street, village, city, PIN')}${f('s-p','Shop phone',db.shop.phone)}<label>Shop state</label><select id="s-s">${STATES.map(([c,n])=>`<option value="${c}" ${c===(db.shop.stateCode||'23')?'selected':''}>${n}</option>`).join('')}</select></div>
 <div class="card" style="margin-top:12px"><h3>Language</h3><div class="seg"><button data-lang="en" class="${lang()==='en'?'on':''}">English</button><button data-lang="hi" class="${lang()==='hi'?'on':''}">हिन्दी</button></div></div>
 <div class="card" style="margin-top:12px"><h3>Logins</h3>${(db.users||[]).length?(db.users||[]).map(u=>`<div class="bl-l"><span><b>${esc(u.name)}</b> <small class="mute">${u.role==='owner'?'Owner, sees everything':'Staff, billing, khata and stock only'}</small></span><button class="link" style="margin:0" data-ud="${esc(u.name)}">Remove</button></div>`).join(''):'<p class="mute">No login yet, so anyone who opens the app sees everything. Add the owner login first.</p>'}
 <label>Name</label><input id="u-n" autocomplete="off"><label>Passkey (at least 4 characters)</label><input id="u-p" type="password"><label>Type</label><select id="u-r"><option value="staff">Staff</option><option value="owner">Owner</option></select><button class="btn dark" id="u-add" type="button">Add login</button><p class="mute">Keep the owner passkey safe. If it is lost, the app can only be opened again by reinstalling and restoring a backup.</p></div>
 <div class="card" style="margin-top:12px"><h3>Start fresh</h3><p class="mute">Deletes all bills, customers, items and trips on this phone. Back up first.</p><button class="btn ghost" id="b-clr" type="button">Clear all data</button></div>
 <div class="bl-msg" id="b-msg" style="${msg.startsWith('Backup')?'color:var(--ok)':''}">${esc(msg)}</div></div>`;
 root.oninput=e=>{const t=e.target;if(t.id==='s-n')db.shop.name=t.value.trim()||'My Shop';else if(t.id==='s-o')db.shop.owner=t.value.trim()||'Owner';else if(t.id==='s-g')db.shop.gstin=t.value.trim().toUpperCase();else if(t.id==='s-a')db.shop.addr=t.value;else if(t.id==='s-p')db.shop.phone=t.value;else if(t.id==='s-s')db.shop.stateCode=t.value;else return;save()};
 root.onclick=async e=>{const t=e.target;
  if(t.id==='b-exp'){try{await exportFile();msg='Backup created.'}catch(err){msg='Backup was not saved.'}render()}
  else if(t.id==='b-clr'){if(t.dataset.a){clearAll();location.hash='#/overview';location.reload()}else{t.dataset.a=1;t.textContent='Tap again to delete everything'}}
  else if(t.id==='u-add'){const n=$('#u-n').value.trim(),p=$('#u-p').value;if(!n||p.length<4){msg='Enter a name and a passkey of at least 4 characters.';return render()}if((db.users||[]).some(u=>u.name.toLowerCase()===n.toLowerCase())){msg='That name is already used.';return render()}await addUser(n,p,$('#u-r').value);msg='Login added.';render()}
  else if(t.dataset.ud){if(t.dataset.a){msg=delUser(t.dataset.ud);render()}else{t.dataset.a=1;t.textContent='Tap again to remove'}}
  else if(t.dataset.lang)setLang(t.dataset.lang)
  else if(t.id==='b-no'){pending=null;render()}
  else if(t.id==='b-yes'){localStorage.setItem('dukaanos.v1',JSON.stringify(pending));pending=null;location.hash='#/overview';location.reload()}};
 root.onchange=e=>{if(e.target.id!=='b-file'||!e.target.files[0])return;const fr=new FileReader();
  fr.onload=()=>{try{const d=JSON.parse(fr.result);if(!d||!Array.isArray(d.bills)||!Array.isArray(d.products))throw 0;pending=d;msg=''}catch(x){msg='This is not a valid Dukaan OS backup file.'}render()};fr.readAsText(e.target.files[0])};
}
export function mountBackup(r){root=r;msg='';pending=null;render()}

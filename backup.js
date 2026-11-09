import {db,save,dateFmt,clearAll,isTest,meta,DBKEY} from './store.js';
import {STATES} from './invoice.js';
import {addUser,delUser,RESERVED,setOwnerPassword,who} from './auth.js';
import {mountShare} from './share.js';
import {setLang,lang} from './lang.js';
import {plan,count,run} from './clean.js';
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let root,msg='',pending=null,chg=false;
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
function loginsHTML(){
 const canAdd=isTest||meta.mode==='primary';
 const staff=(db.users||[]).map(u=>`<div class="bl-l"><span><b>${esc(u.name)}</b> <small class="mute">Staff, billing, khata and stock only</small></span>${canAdd?`<button class="link" style="margin:0" data-ud="${esc(u.name)}">Remove</button>`:''}</div>`).join('');
 const owner=isTest?'':`<div class="bl-l"><span><b>Sanjaya</b> <small class="mute">Owner, sees everything</small></span><button class="link" style="margin:0" id="o-chg" type="button">Change password</button></div>${chg?'<label>New password (at least 4 characters)</label><input id="o-p" type="password"><button class="btn dark" id="o-save" type="button">Save new password</button>':''}`;
 const tester=!isTest&&!db.noTester&&meta.mode==='primary'?`<div class="bl-l"><span><b>TESTERMAD</b> <small class="mute">Test login. Opens separate practice data and never touches your real shop data.</small></span><button class="link" style="margin:0" id="t-off" type="button">Turn off</button></div>`:(!isTest&&db.noTester&&meta.mode==='primary'?`<div class="bl-l"><span><b>TESTERMAD</b> <small class="mute">Test login is turned off.</small></span><button class="link" style="margin:0" id="t-on" type="button">Turn on</button></div>`:'');
 const add=canAdd?'<label>New staff name</label><input id="u-n" autocomplete="off"><label>Staff password (at least 4 characters)</label><input id="u-p" type="password"><button class="btn dark" id="u-add" type="button">Add staff</button>':'<p class="mute">Staff are added on the owner main phone.</p>';
 return`<div class="card" style="margin-top:12px"><h3>Logins</h3>${owner}${staff}${tester}${add}</div>`;
}
const f=(id,l,v,ph)=>`<label>${l}</label><input id="${id}" value="${esc(v||'')}" placeholder="${ph||''}">`;
function render(){
 root.innerHTML=`<div class="bl"><h1>Backup</h1>
 <div class="card"><h3>Saved on this phone</h3><div class="bl-l"><span>Bills</span><b>${db.bills.length}</b></div><div class="bl-l"><span>Customers</span><b>${db.customers.length}</b></div><div class="bl-l"><span>Inventory items</span><b>${db.products.length}</b></div><div class="bl-l"><span>Last backup</span><b>${db.lastBackup?dateFmt(db.lastBackup):'Never'}</b></div>
 <p class="mute">All your data stays on this phone. Nothing is sent to a server. If the app is uninstalled or its data is cleared, the data is gone, so back up regularly and keep the file in WhatsApp, Drive, or Files.</p>
 <button class="btn dark" id="b-exp" type="button">Back up now</button></div>
 ${meta.mode==='linked'?'':`<div class="card" style="margin-top:12px"><h3>Restore from a backup file</h3>${pending?`<p>Replace everything on this phone with this backup (${pending.bills.length} bills, ${pending.products.length} items)?</p><button class="btn dark" id="b-yes" type="button">Yes, restore</button><button class="btn ghost" id="b-no" type="button">Cancel</button>`:`<input id="b-file" type="file" accept=".json,application/json">`}</div>`}
 <div class="card" style="margin-top:12px"><h3>Shop details</h3>${f('s-n','Shop name',db.shop.name)}${f('s-o','Owner name',db.shop.owner)}${f('s-g','Shop GSTIN',db.shop.gstin,'15-character GSTIN')}${f('s-a','Shop address',db.shop.addr,'Street, village, city, PIN')}${f('s-p','Shop phone',db.shop.phone)}<label>Shop state</label><select id="s-s">${STATES.map(([c,n])=>`<option value="${c}" ${c===(db.shop.stateCode||'23')?'selected':''}>${n}</option>`).join('')}</select></div>
 ${meta.mode==='linked'?'':`<div class="card" style="margin-top:12px"><h3>Clean old data</h3><label>Clean automatically when records are older than</label><select id="c-m">${[[0,'Never'],[3,'3 months'],[6,'6 months'],[12,'12 months']].map(([v,l])=>`<option value="${v}" ${(db.cleanMonths||0)===v?'selected':''}>${l}</option>`).join('')}</select>
 <p class="mute">Removes old kachha bills, payment entries, trips and stock history. It never removes unpaid udhaar, customer khata accounts, GST invoices or credit notes (the law asks you to keep them for 6 years). Reports for cleaned dates will be smaller, so save your reports first.</p><button class="btn ghost" id="c-now" type="button">Clean now</button></div>`}
 <div class="card" style="margin-top:12px"><h3>Language</h3><div class="seg"><button data-lang="en" class="${lang()==='en'?'on':''}">English</button><button data-lang="hi" class="${lang()==='hi'?'on':''}">हिन्दी</button></div></div>
 <div id="sh-box"></div>
 <div class="card" style="margin-top:12px"><h3>Logged in</h3><div class="bl-l"><span>You are logged in as <b>${(who()||'').replace(/[<>&"]/g,'')}</b></span><button class="btn ghost" id="lg-out" type="button" style="width:auto;margin:0">Log out</button></div></div>
 ${loginsHTML()}
 ${meta.mode==='linked'?'':`<div class="card" style="margin-top:12px"><h3>Start fresh</h3><p class="mute">Deletes all bills, customers, items and trips on this phone. Back up first.</p><button class="btn ghost" id="b-clr" type="button">Clear all data</button></div>`}
 <div class="bl-msg" id="b-msg" style="${msg.startsWith('Backup')?'color:var(--ok)':''}">${esc(msg)}</div></div>`;
 mountShare(root.querySelector('#sh-box'));
 root.oninput=e=>{const t=e.target;if(t.id==='s-n')db.shop.name=t.value.trim()||'My Shop';else if(t.id==='s-o')db.shop.owner=t.value.trim()||'Owner';else if(t.id==='s-g')db.shop.gstin=t.value.trim().toUpperCase();else if(t.id==='s-a')db.shop.addr=t.value;else if(t.id==='s-p')db.shop.phone=t.value;else if(t.id==='s-s')db.shop.stateCode=t.value;else return;save()};
 root.onclick=async e=>{const t=e.target;
  if(t.id==='b-exp'){try{await exportFile();msg='Backup created.'}catch(err){msg='Backup was not saved.'}render()}
  else if(t.id==='b-clr'){if(t.dataset.a){clearAll();location.hash='#/overview';location.reload()}else{t.dataset.a=1;t.textContent='Tap again to delete everything'}}
  else if(t.id==='u-add'){const n=$('#u-n').value.trim(),p=$('#u-p').value;if(!n||p.length<4){msg='Enter a name and a password of at least 4 characters.';return render()}if(RESERVED.includes(n.toLowerCase())||(db.users||[]).some(u=>u.name.toLowerCase()===n.toLowerCase())){msg='That name is already used.';return render()}await addUser(n,p);msg='Staff login added.';render()}
  else if(t.id==='lg-out'){try{sessionStorage.removeItem('dk.u')}catch(x){}location.hash='#/overview';location.reload()}
  else if(t.id==='o-chg'){chg=!chg;render()}
  else if(t.id==='o-save'){const p=$('#o-p').value;if(p.length<4){msg='Use a password of at least 4 characters.';return render()}await setOwnerPassword(p);chg=false;msg='Owner password changed.';render()}
  else if(t.id==='t-on'){db.noTester=false;save();msg='Tester login turned on.';render()}
  else if(t.id==='t-off'){if(t.dataset.a){db.noTester=true;save();msg='Tester login turned off.';render()}else{t.dataset.a=1;t.textContent='Tap again to turn off'}}
  else if(t.dataset.ud){if(t.dataset.a){msg=delUser(t.dataset.ud);render()}else{t.dataset.a=1;t.textContent='Tap again to remove'}}
  else if(t.dataset.lang)setLang(t.dataset.lang)
  else if(t.id==='c-now'){const m=db.cleanMonths||0;if(!m){msg='Choose 3, 6 or 12 months first.';return render()}const n=count(plan(m));if(!n){msg='Nothing is old enough to clean.';return render()}if(t.dataset.a){msg='Cleaned '+run(m)+' old records.';render()}else{t.dataset.a=1;t.textContent='Remove '+n+' old records? Tap again'}}
  else if(t.id==='b-no'){pending=null;render()}
  else if(t.id==='b-yes'){localStorage.setItem(DBKEY,JSON.stringify(pending));pending=null;location.hash='#/overview';location.reload()}};
 root.onchange=e=>{if(e.target.id==='c-m'){db.cleanMonths=+e.target.value;save();msg=db.cleanMonths?'Old data will be cleaned automatically after '+db.cleanMonths+' months.':'Automatic cleaning is off.';return render()}if(e.target.id!=='b-file'||!e.target.files[0])return;const fr=new FileReader();
  fr.onload=()=>{try{const d=JSON.parse(fr.result);if(!d||!Array.isArray(d.bills)||!Array.isArray(d.products))throw 0;pending=d;msg=''}catch(x){msg='This is not a valid Dukaan OS backup file.'}render()};fr.readAsText(e.target.files[0])};
}
export function mountBackup(r){root=r;msg='';pending=null;chg=false;render()}

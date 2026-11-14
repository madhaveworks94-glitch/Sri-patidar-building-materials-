import {db,save,replaceAll,wipe,hasData} from './store.js';
import {esc,stateOpts,saveFile,toast,today,dmy} from './util.js';
import {refreshBrand} from './app.js';
let root;
const $=s=>root.querySelector(s);
export function mount(r){root=r;draw()}
function draw(){
 const s=db.shop;
 root.innerHTML=`<h1>Settings</h1><p class="sub">Your shop details appear on every invoice.</p>
 <div class="card"><h3>Shop details</h3>
 <label>Shop name</label><input id="s-n" value="${esc(s.name)}" placeholder="Patidar Building Materials">
 <label>GSTIN</label><input id="s-g" value="${esc(s.gstin)}" maxlength="15" placeholder="15 character GST number" autocapitalize="characters">
 <label>Address</label><textarea id="s-a" placeholder="Shop address">${esc(s.addr)}</textarea>
 <label>Phone</label><input id="s-p" value="${esc(s.phone)}" inputmode="tel">
 <label>State (decides CGST + SGST or IGST)</label><select id="s-s">${stateOpts(s.state)}</select>
 <label>Bank details (optional, printed on invoice)</label><textarea id="s-b" placeholder="Bank name, A/c no, IFSC">${esc(s.bank)}</textarea>
 <label>Terms (printed on invoice)</label><textarea id="s-t">${esc(s.terms)}</textarea>
 <div class="msg" id="s-m"></div><button class="btn" id="s-save" type="button">Save shop details</button></div>
 <div class="card"><h3>Owner signature</h3><p class="mute" style="margin:0 0 8px">Printed on every invoice. Draw it with your finger, or pick a photo of your signature.</p>
 ${s.sign?`<img class="sigimg" src="${s.sign}" alt="Signature"><div style="height:8px"></div>`:'<p class="mute">No signature saved yet.</p>'}
 <canvas class="sig" id="sg" width="900" height="300"></canvas>
 <div class="btns"><button class="btn ghost" id="sg-c" type="button">Clear</button><button class="btn" id="sg-s" type="button">Save drawing</button></div>
 <label>Or pick a signature photo</label><input id="sg-f" type="file" accept="image/*">
 ${s.sign?'<button class="btn red" id="sg-d" type="button">Remove saved signature</button>':''}<div class="msg" id="sg-m"></div></div>
 <div class="card"><h3>Backup</h3><p class="mute" style="margin:0">All your data is saved only on this phone. If you change or lose the phone it is gone, so save a backup file now and then and keep it somewhere safe (WhatsApp to yourself, Drive).</p>
 <button class="btn" id="bk" type="button">Save backup file</button>
 <label>Restore from a backup file</label><input id="rs" type="file" accept=".json,application/json"><div class="msg" id="b-m"></div></div>
 <p class="mute" style="text-align:center"><small>Patidar Accounts · version 4</small></p>
 <div class="card"><h3>Delete everything</h3><p class="mute" style="margin:0">Removes all sales, spends, stock and invoices from this phone. Cannot be undone.</p>
 <label>Type DELETE to confirm</label><input id="dl" autocapitalize="characters"><button class="btn red" id="dl-b" type="button">Delete all data</button></div>`;
 pad();
 $('#s-save').onclick=()=>{
  const g=$('#s-g').value.trim().toUpperCase();
  if(g&&!/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(g)){const m=$('#s-m');m.className='msg';return m.textContent='That GSTIN does not look right. It has 15 letters and numbers, like 23ABCDE1234F1Z5.'}
  Object.assign(db.shop,{name:$('#s-n').value.trim(),gstin:g,addr:$('#s-a').value.trim(),phone:$('#s-p').value.trim(),state:$('#s-s').value||(g?g.slice(0,2):''),bank:$('#s-b').value.trim(),terms:$('#s-t').value.trim()});
  if(g&&!$('#s-s').value)$('#s-s').value=g.slice(0,2);
  save();refreshBrand();const m=$('#s-m');m.className='msg ok';m.textContent='Saved.';toast('Shop details saved')};
 $('#bk').onclick=async()=>{try{await saveFile('patidar-accounts-backup-'+today()+'.json','application/json',new Blob([JSON.stringify(db)],{type:'application/json'}));const m=$('#b-m');m.className='msg ok';m.textContent='Backup file ready.'}catch(e){const m=$('#b-m');m.className='msg';m.textContent='Could not save the file.'}};
 $('#rs').onchange=async e=>{const f=e.target.files[0];if(!f)return;const m=$('#b-m');m.className='msg';
  try{const d=JSON.parse(await f.text());if(!d||typeof d!=='object'||!d.shop||!d.days)throw 0;
   if(hasData()&&!confirm('This replaces everything on this phone with the backup. Continue?')){e.target.value='';return}
   replaceAll(d);refreshBrand();toast('Backup restored');draw()}
  catch(x){m.textContent='This file is not a backup from this app.'}};
 $('#dl-b').onclick=()=>{if($('#dl').value.trim()!=='DELETE')return toast('Type DELETE first',true);wipe();refreshBrand();toast('All data deleted');draw()};
}
function pad(){
 const c=$('#sg'),x=c.getContext('2d');let on=false,dirty=false;
 x.lineWidth=7;x.lineCap='round';x.lineJoin='round';x.strokeStyle='#111';
 const pt=e=>{const b=c.getBoundingClientRect();return[(e.clientX-b.left)*c.width/b.width,(e.clientY-b.top)*c.height/b.height]};
 c.onpointerdown=e=>{on=true;dirty=true;c.setPointerCapture(e.pointerId);const[a,b]=pt(e);x.beginPath();x.moveTo(a,b);x.lineTo(a+.1,b+.1);x.stroke();e.preventDefault()};
 c.onpointermove=e=>{if(!on)return;const[a,b]=pt(e);x.lineTo(a,b);x.stroke();e.preventDefault()};
 c.onpointerup=c.onpointercancel=()=>{on=false};
 const msg=(t,ok)=>{const m=$('#sg-m');m.className='msg'+(ok?' ok':'');m.textContent=t};
 $('#sg-c').onclick=()=>{x.clearRect(0,0,c.width,c.height);dirty=false};
 $('#sg-s').onclick=()=>{if(!dirty)return msg('Draw your signature first.');db.shop.sign=c.toDataURL('image/png');save();toast('Signature saved');draw()};
 const d=$('#sg-d');if(d)d.onclick=()=>{db.shop.sign='';save();draw()};
 $('#sg-f').onchange=e=>{const f=e.target.files[0];if(!f)return;const u=URL.createObjectURL(f),im=new Image();
  im.onload=()=>{const k=Math.min(1,600/im.width,200/im.height),w=Math.round(im.width*k),h=Math.round(im.height*k),t=document.createElement('canvas');t.width=w;t.height=h;const g=t.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);g.drawImage(im,0,0,w,h);URL.revokeObjectURL(u);db.shop.sign=t.toDataURL('image/jpeg',.85);save();toast('Signature saved');draw()};
  im.onerror=()=>msg('Could not read that picture.');im.src=u};
}

import {isTest} from './store.js';
import {getStatus,onStatus,setKeep,syncNow,removeDevice,resetThisPhone} from './sync.js';
import {keepAliveAvailable,openBatterySettings} from './keepalive.js';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ago=t=>{if(!t)return 'never';const m=Math.round((Date.now()-t)/6e4);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' hours ago':new Date(t).toLocaleDateString('en-IN',{day:'numeric',month:'short'})};
const LBL={online:'Connected',connecting:'Connecting…',offline:'Not connected',off:'Not started yet',error:'Problem',unknown:'Not recognised'};
let box=null,show2=false;
function html(){
 const s=getStatus(),c='<div class="card" style="margin-top:12px">';
 if(isTest)return c+'<h3>Sharing</h3><p class="mute">Sharing is switched off in test mode.</p></div>';
 if(s.mode==='linked')return c+`<h3>Linked to the owner's phone</h3><div class="bl-l"><span>Status</span><b class="${s.state==='online'?'ok':''}">${LBL[s.state]||''}</b></div>${s.msg?`<p class="mute" style="margin:4px 0">${esc(s.msg)}</p>`:''}<div class="bl-l"><span>Last updated</span><b>${ago(s.last)}</b></div><div class="bl-l"><span>Waiting to send</span><b>${s.pending} changes</b></div><div class="bl-l"><span>Bill numbers on this phone</span><b>start with ${esc(s.letter)}</b></div><p class="mute">You can keep working with no internet or while the owner phone is off. Everything is saved on this phone and goes to the owner by itself, within seconds of the owner phone coming back.</p><button class="btn ghost" id="sh-now" type="button">Update now</button>${s.state==='unknown'?'<button class="btn ghost" id="sh-reset" type="button" style="margin-top:8px">Reset this phone and log in again</button>':''}</div>`;
 const rows=s.devices.map(d=>`<div class="bl-l"><span><b>${esc(d.user)}</b> <small class="mute">${d.role==='owner'?'Owner phone':'Staff'}, bills ${esc(d.letter)}. ${d.online?'Online':'Last seen '+ago(d.seen)}</small></span><button class="link" style="margin:0" data-rd="${d.id}">Remove</button></div>`).join('');
 return c+`<h3>Staff phones</h3><div class="bl-l"><span>Status</span><b class="${s.state==='online'?'ok':''}">${LBL[s.state]||''}</b></div>${s.msg?`<p class="mute" style="margin:4px 0">${esc(s.msg)}</p>`:''}
 <p class="mute">Nothing to set up. Add a staff login above, then the staff member installs the app and logs in with that name and password. The phone connects to this one by itself. This phone keeps the main copy, so keep this app open (or the background setting on) while staff work. If this phone is off, staff keep working and everything reaches this phone when it is back on.</p>
 <h3 style="margin-top:14px">Phones</h3>${rows||'<p class="mute">No phone has joined yet.</p>'}
 ${keepAliveAvailable()?`<div class="bl-l" style="margin-top:10px"><span>Keep sharing when the app is closed<br><small class="mute">Shows a small notification and uses more battery, so keep the phone charging.</small></span><button class="btn ${s.keep?'dark':'ghost'}" id="sh-keep" type="button" style="width:auto;margin:0">${s.keep?'On':'Off'}</button></div><button class="link" id="sh-bat" type="button" style="margin:6px 0 0">Open battery settings and allow this app to run in the background</button>`:''}
 <button class="link" id="sh-2" type="button" style="margin:12px 0 0">${show2?'Hide':'Add a second owner phone'}</button>
 ${show2?`<p class="mute" style="margin:6px 0 4px">On the other phone, tap "Second owner phone? Join the shop" on the login screen and enter Sanjaya, the owner password and this code. Keep the code private.</p><div style="font:700 26px/1.2 Hind,system-ui,sans-serif;letter-spacing:3px;user-select:all">${s.code}</div><button class="btn ghost" id="sh-copy" type="button">Copy code</button>`:''}</div>`;
}
function draw(){if(box&&document.body.contains(box))box.innerHTML=html()}
onStatus(draw);
export function mountShare(el){
 box=el;draw();
 el.onclick=async e=>{
  const t=e.target,s=getStatus();
  if(t.id==='sh-now')syncNow();
  else if(t.id==='sh-keep')setKeep(!s.keep);
  else if(t.id==='sh-bat')openBatterySettings();
  else if(t.id==='sh-2'){show2=!show2;draw()}
  else if(t.id==='sh-reset'){if(t.dataset.a)resetThisPhone();else{t.dataset.a=1;t.textContent='Tap again: this clears the phone'}}
  else if(t.id==='sh-copy'){try{await navigator.clipboard.writeText(s.code);t.textContent='Copied'}catch(x){t.textContent='Press and hold the code to copy'}}
  else if(t.dataset.rd){if(t.dataset.a)removeDevice(t.dataset.rd);else{t.dataset.a=1;t.textContent='Tap again to remove'}}
 };
}

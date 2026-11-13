import {db,save,isTest,meta,realField} from './store.js';
let user=null,hiddenAt=0,usersHook=()=>{};
const OWNER=['overview','billing','khata','stock','fleet','reports','backup','gst','bills','docs','spend'],STAFF=['billing','khata','stock'];
// Built-in logins. Only salted hashes are kept here, never the passwords themselves.
const PRE={
 sanjaya:{name:'Sanjaya',salt:'dk-owner-s1',hash:'dd7a8ad6075154ce807b95d2c3add470a8c5869774b73cf27d6ac267175f7cc8'},
 testermad:{name:'TESTERMAD',salt:'dk-test-t1',hash:'1077764f0d3a5d2708854d8b9594e0925c43a389300fb13f4380190002493f98'}
};
export const RESERVED=Object.keys(PRE);
export async function hash(salt,pass){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+pass));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}
const pwOk=async(salt,h,p)=>(await hash(salt,p))===h||(p!==p.trim()&&(await hash(salt,p.trim()))===h);
export const who=()=>user?user.name:null;
export const role=()=>user?user.role:'owner';
export const allowed=r=>(role()==='staff'?STAFF:OWNER).includes(r);
export const onUsersChanged=f=>{usersHook=f};
const linked=()=>meta.mode==='linked'?meta.role:'';
// A phone that has never been used: a staff member logging in here fetches the shop from the owner phone by themselves
const newPhone=()=>!isTest&&meta.mode==='primary'&&!(db.users||[]).length&&!db.bills.length&&!db.products.length&&!db.customers.length;
const ownerAuth=()=>(isTest?realField('ownerAuth'):db.ownerAuth)||PRE.sanjaya;
export async function setOwnerPassword(p){const salt=Math.random().toString(36).slice(2)+Date.now().toString(36);db.ownerAuth={salt,hash:await hash(salt,p)};save()}
export async function addUser(name,pass){
 const us=db.users=db.users||[],salt=Math.random().toString(36).slice(2)+Date.now().toString(36);
 us.push({name,salt,hash:await hash(salt,pass),role:'staff'});save();usersHook(name,'add');
}
export function delUser(name){
 const us=db.users||[],u=us.find(x=>x.name===name);if(!u)return'';
 db.users=us.filter(x=>x!==u);save();usersHook(name,'del');return'';
}
// Used by the owner's main phone to accept a staff phone or a second owner phone
export async function checkJoin(name,pass){
 const n=String(name).trim().toLowerCase();
 if(n==='sanjaya'){const a=ownerAuth();return await hash(a.salt,pass)===a.hash?{role:'owner',name:PRE.sanjaya.name}:null}
 const u=(db.users||[]).find(x=>x.name.toLowerCase()===n);
 return u&&await hash(u.salt,pass)===u.hash?{role:'staff',name:u.name}:null;
}
function setSession(n){try{sessionStorage.setItem('dk.u',n)}catch(e){}}
function switchMode(test,name){try{if(test)localStorage.setItem('dk.mode','test');else localStorage.removeItem('dk.mode');setSession(name)}catch(e){}location.reload()}
async function verify(name,pass){
 const n=name.trim().toLowerCase(),lr=linked();
 if(n==='sanjaya'){
  if(lr==='staff')return null;const a=ownerAuth();if(!await pwOk(a.salt,a.hash,pass))return null;
  if(isTest){switchMode(false,PRE.sanjaya.name);return'switching'}return{name:PRE.sanjaya.name,role:'owner'};
 }
 if(n==='testermad'){
  if(!await pwOk(PRE.testermad.salt,PRE.testermad.hash,pass))return null;
  if(lr)return{err:"The test login works only on the owner's main phone, not on a staff or second phone."};
  if(isTest)return{name:PRE.testermad.name,role:'owner'};
  switchMode(true,PRE.testermad.name);return'switching';
 }
 if(lr==='owner')return null;
 const u=(db.users||[]).find(x=>x.name.toLowerCase()===n);
 return u&&await hash(u.salt,pass)===u.hash?{name:u.name,role:'staff'}:null;
}
function fromSession(){
 let n='';try{n=sessionStorage.getItem('dk.u')||''}catch(e){}
 if(!n)return null;const k=n.toLowerCase(),lr=linked();
 if(k==='sanjaya')return !isTest&&lr!=='staff'?{name:PRE.sanjaya.name,role:'owner'}:null;
 if(k==='testermad')return isTest&&!lr?{name:PRE.testermad.name,role:'owner'}:null;
 const u=(db.users||[]).find(x=>x.name===n);return u&&lr!=='owner'?{name:u.name,role:'staff'}:null;
}
export function gate(done){
 if(user){const fresh=fromSession();if(fresh&&fresh.name===user.name&&fresh.role===user.role)return true}
 user=fromSession();if(user)return true;lock(done);return false;
}
function lock(done){
 let el=document.getElementById('lock');if(el)return;
 el=document.createElement('div');el.id='lock';el.style.cssText='position:fixed;inset:0;z-index:50;background:var(--bg);display:grid;place-items:center;padding:20px;overflow:auto';
 el.innerHTML='<div class="card" style="width:100%;max-width:360px"><h1 style="margin:0">Dukaan OS</h1><p class="sub">Log in to continue</p><div class="bl" id="l-main"><label>Name</label><input id="l-n" autocomplete="off"><label>Password</label><input id="l-p" type="password"><div class="bl-msg" id="l-m"></div><button class="btn dark" id="l-go" type="button">Log in</button><p class="mute" style="margin-top:12px">Forgot your password? Ask the owner.</p>'+(isTest||meta.mode==='linked'?'':'<button class="link" id="l-j" type="button" style="margin:6px 0 0">Second owner phone? Join the shop</button>')+'</div><div class="bl" id="l-join" style="display:none"><label>Name</label><input id="j-n" autocomplete="off" placeholder="Sanjaya"><label>Password</label><input id="j-p" type="password"><label>Owner code (from Backup on the main phone)</label><input id="j-c" autocomplete="off" autocapitalize="characters"><p class="mute" style="margin:8px 0 0">Anything already saved on this phone will be replaced with the shop data. Staff do not need this: they just log in with their name and password.</p><div class="bl-msg" id="j-m"></div><button class="btn dark" id="j-go" type="button">Join the shop</button><button class="link" id="j-b" type="button" style="margin:6px 0 0">Back to log in</button></div></div>';
 document.body.appendChild(el);
 const $=s=>el.querySelector(s),msg=(id,t,ok)=>{const m=$(id);m.style.color=ok?'var(--ok)':'';m.textContent=t};
 const login=async()=>{
  const n=$('#l-n').value.trim(),p=$('#l-p').value;if(!n||!p)return msg('#l-m','Enter your name and password.');
  const u=await verify(n,p);if(u==='switching')return;if(u&&u.err){msg('#l-m',u.err);return}
  if(u){user=u;setSession(u.name);el.remove();done();return}
  const k=n.toLowerCase();
  if(newPhone()&&k!=='sanjaya'&&k!=='testermad'){
   msg('#l-m','Checking with the owner phone…',true);$('#l-go').disabled=true;
   try{const s=await import('./sync.js'),r=await s.joinShop(n,p,'');if(r.ok){setSession(n);location.reload();return}msg('#l-m',r.err||'Wrong name or password.')}catch(e){msg('#l-m','Could not reach the owner phone. Check your internet.')}
   $('#l-go').disabled=false;return;
  }
  msg('#l-m','Wrong name or password.');
 };
 $('#l-go').onclick=login;$('#l-p').onkeydown=e=>{if(e.key==='Enter')login()};
 if($('#l-j'))$('#l-j').onclick=()=>{$('#l-main').style.display='none';$('#l-join').style.display=''};
 $('#j-b').onclick=()=>{$('#l-join').style.display='none';$('#l-main').style.display=''};
 $('#j-go').onclick=async()=>{
  const c=$('#j-c').value,n=$('#j-n').value.trim(),p=$('#j-p').value;if(!n||!p)return msg('#j-m','Enter your name and your password.');
  msg('#j-m','Connecting to the owner phone…',true);$('#j-go').disabled=true;
  try{const s=await import('./sync.js'),r=await s.joinShop(n,p,c);if(r.ok){setSession(n);location.reload();return}msg('#j-m',r.err||'Could not join.')}catch(e){msg('#j-m','Could not join. Check your internet and try again.')}
  $('#j-go').disabled=false;
 };
}
export function initAuth(){
 document.addEventListener('visibilitychange',()=>{if(document.hidden)hiddenAt=Date.now();else if(hiddenAt&&Date.now()-hiddenAt>3e5){try{sessionStorage.removeItem('dk.u')}catch(e){}location.reload()}});
 if(isTest){
  const b=document.createElement('div');b.style.cssText='position:sticky;top:0;z-index:40;background:#7c3aed;color:#fff;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;gap:10px;font:600 13px Hind,system-ui,sans-serif';
  b.innerHTML='<span>TEST MODE: practice data only, your real shop data is not touched</span><button type="button" style="background:#fff;color:#7c3aed;border:0;border-radius:999px;padding:6px 12px;font:inherit;cursor:pointer">Exit</button>';
  b.querySelector('button').onclick=()=>{try{localStorage.removeItem('dk.mode');sessionStorage.removeItem('dk.u')}catch(e){}location.reload()};
  document.body.prepend(b);
 }
}

import {db,save} from './store.js';
let user=null,hiddenAt=0;
const OWNER=['overview','billing','khata','stock','fleet','reports','backup','gst','bills'],STAFF=['billing','khata','stock'];
export async function hash(salt,pass){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+pass));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('')}
export const who=()=>user?user.name:null;
export const role=()=>user?user.role:'owner';
export const allowed=r=>(role()==='staff'?STAFF:OWNER).includes(r);
export async function addUser(name,pass,r){
 const us=db.users=db.users||[],salt=Math.random().toString(36).slice(2)+Date.now().toString(36);
 const u={name,salt,hash:await hash(salt,pass),role:us.length?r:'owner'};us.push(u);if(us.length===1)user=u;save();
}
export function delUser(name){
 const us=db.users||[],u=us.find(x=>x.name===name);if(!u)return'';
 if(u.role==='owner'&&us.filter(x=>x.role==='owner').length<2)return'Keep at least one owner login.';
 db.users=us.filter(x=>x!==u);save();return'';
}
export function gate(done){
 const us=db.users||[];if(!us.length)return true;
 if(!user){try{const n=sessionStorage.getItem('dk.u');user=us.find(u=>u.name===n)||null}catch(e){}}
 if(user&&us.includes(user))return true;user=null;lock(done);return false;
}
function lock(done){
 let el=document.getElementById('lock');if(el)return;
 el=document.createElement('div');el.id='lock';el.style.cssText='position:fixed;inset:0;z-index:50;background:var(--bg);display:grid;place-items:center;padding:20px';
 el.innerHTML='<div class="card" style="width:100%;max-width:360px"><h1 style="margin:0">Dukaan OS</h1><p class="sub">Log in to continue</p><div class="bl"><label>Name</label><input id="l-n" autocomplete="off"><label>Passkey</label><input id="l-p" type="password"><div class="bl-msg" id="l-m"></div><button class="btn dark" id="l-go" type="button">Log in</button><p class="mute" style="margin-top:12px">Forgot your passkey? Ask the owner.</p></div></div>';
 document.body.appendChild(el);
 el.querySelector('#l-go').onclick=async()=>{const n=el.querySelector('#l-n').value.trim().toLowerCase(),p=el.querySelector('#l-p').value,u=(db.users||[]).find(x=>x.name.toLowerCase()===n);
  if(u&&await hash(u.salt,p)===u.hash){user=u;try{sessionStorage.setItem('dk.u',u.name)}catch(e){}el.remove();done()}else el.querySelector('#l-m').textContent='Wrong name or passkey.'};
}
export function initAuth(){
 document.addEventListener('visibilitychange',()=>{if(document.hidden)hiddenAt=Date.now();else if(hiddenAt&&Date.now()-hiddenAt>3e5&&(db.users||[]).length){try{sessionStorage.removeItem('dk.u')}catch(e){}location.reload()}});
}

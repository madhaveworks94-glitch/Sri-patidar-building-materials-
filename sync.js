// Phone-to-phone sharing over the internet (WebRTC through PeerJS).
// The owner's main phone ("primary") keeps the master copy and accepts connections. Staff phones and a second owner phone
// ("linked") connect to it, keep their own copy, and send every change to the primary. The primary applies the change,
// then passes it on to the other phones. A free PeerJS service only introduces the phones to each other; no shop data is
// stored anywhere except on the phones themselves.
import {db,meta,saveMeta,persist,setSaveHook,replaceData,resetDevice,isTest} from './store.js';
import {SCOPES,makeBase,diff,applyOps,filterOps,snapshot} from './syncops.js';
import {checkJoin,onUsersChanged} from './auth.js';
import {setKeepAlive} from './keepalive.js';

let base=null,stale=true,peer=null,conns={},state='off',msg='',ready=false,lconn=null,backoff=3000,lastRx=0,starting=false;
const timers={},listeners=[],fails={};
const CH=48000;
const rnd=n=>{const a=new Uint8Array(n);crypto.getRandomValues(a);return[...a].map(x=>(x%36).toString(36)).join('')};
const peerCfg=()=>{try{return JSON.parse(localStorage.getItem('dk.peer')||'null')||{}}catch(e){return{}}};
const myScope=()=>meta.mode==='linked'?SCOPES[meta.role]:SCOPES.owner;
const staffUsers=()=>(db.users||[]).map(u=>({...u}));
const retry=(k,f,ms)=>{clearTimeout(timers[k]);timers[k]=setTimeout(f,ms)};
const refresh=()=>{try{window.dispatchEvent(new Event('dk-synced'))}catch(e){}};
export const onStatus=f=>{listeners.push(f)};
const emit=()=>{for(const f of listeners){try{f()}catch(e){}}};
function setState(s,m){state=s;msg=m||'';emit()}

// ---- messages: JSON text, split into pieces when large ----
function send(c,m){
 if(!c||!c.open)return false;
 const s=JSON.stringify(m);
 if(s.length<=CH){c.send(s);return true}
 const id=rnd(8),n=Math.ceil(s.length/CH);
 for(let i=0;i<n;i++)c.send(JSON.stringify({t:'part',id,i,n,d:s.slice(i*CH,(i+1)*CH)}));
 return true;
}
function recv(c,raw){
 let m;try{m=typeof raw==='string'?JSON.parse(raw):raw}catch(e){return null}
 if(!m||m.t!=='part')return m;
 const b=c.dkb=c.dkb||{},x=b[m.id]||(b[m.id]={n:m.n,p:[],c:0});
 x.p[m.i]=m.d;if(++x.c<x.n)return null;delete b[m.id];
 try{return JSON.parse(x.p.join(''))}catch(e){return null}
}
function loadPeer(){
 const get=()=>window.Peer||(window.peerjs&&window.peerjs.Peer);
 if(get())return Promise.resolve(get());
 const add=src=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)});
 return add('peerjs.min.js').catch(()=>add('https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js')).then(()=>{if(!get())throw 0;return get()});
}

// ---- recording changes ----
function onSave(){
 const lk=meta.mode==='linked';
 if(!lk&&!Object.keys(conns).length){stale=true;return}
 if(!base||stale){base=makeBase(db,myScope());stale=false;return}
 const ops=diff(db,base,myScope());if(!ops.length)return;
 if(lk){const b={n:++meta.nseq,ops};meta.queue.push(b);saveMeta();if(ready)send(lconn,{t:'ops',n:b.n,ops})}
 else relay(ops,null);
 emit();
}
function relay(ops,except){
 for(const id in conns){
  if(id===except)continue;const d=meta.devs[id];if(!d)continue;
  const o=filterOps(ops,SCOPES[d.role],'out');if(o.length)send(conns[id],{t:'ops',ops:o});
 }
}
const ensureBase=()=>{if(!base||stale){base=makeBase(db,SCOPES.owner);stale=false}};

// ---- the owner's main phone ----
async function startPrimary(){
 if(isTest||meta.mode!=='primary'||!meta.shareOn||starting)return;
 if(!meta.shopId){meta.shopId=rnd(8);saveMeta()}
 starting=true;setState('connecting');
 let Peer;try{Peer=await loadPeer()}catch(e){starting=false;setState('error','The sharing tool could not load. Check the internet.');retry('p',startPrimary,15000);return}
 try{if(peer)peer.destroy()}catch(e){}
 const p=peer=new Peer('dkos-'+meta.shopId,peerCfg());
 p.on('open',()=>{if(peer!==p)return;starting=false;setState('online');setKeepAlive(!!meta.keep)});
 p.on('connection',onConn);
 p.on('disconnected',()=>{if(peer!==p||p.destroyed)return;setState('connecting');retry('pd',()=>{try{if(peer===p&&!p.destroyed)p.reconnect()}catch(e){}},3000)});
 p.on('close',()=>{if(peer!==p)return;starting=false;setState('connecting');retry('p',startPrimary,5000)});
 p.on('error',e=>{
  if(peer!==p)return;const t=e&&e.type;
  if(t==='peer-unavailable'||t==='webrtc')return;
  starting=false;
  if(t==='unavailable-id'){setState('connecting','Waiting for the old connection to clear…');retry('p',startPrimary,12000)}
  else{setState('connecting','No internet, or the connection service is busy. Trying again…');retry('p',startPrimary,10000)}
 });
}
function onConn(conn){
 const to=setTimeout(()=>{if(!conn.dk){try{conn.close()}catch(e){}}},20000);
 conn.on('data',raw=>{const m=recv(conn,raw);if(m)handle(conn,m).catch(e=>console.error(e))});
 const gone=()=>{clearTimeout(to);const id=conn.dk&&conn.dk.dev;if(id&&conns[id]===conn){delete conns[id];emit()}};
 conn.on('close',gone);conn.on('error',gone);
}
const validDev=d=>d&&(d.role==='owner'||(db.users||[]).some(u=>u.name===d.user));
const buildSnap=role=>({data:snapshot(db,SCOPES[role]),users:staffUsers()});
function applyFrom(id,role,ops){
 const ok=filterOps(Array.isArray(ops)?ops:[],SCOPES[role],'in');if(!ok.length)return;
 ensureBase();applyOps(db,ok,base);persist();relay(ok,id);emit();refresh();
}
async function handle(conn,m){
 if(m.t==='ping'){send(conn,{t:'pong'});return}
 if(m.t==='join')return doJoin(conn,m);
 if(m.t==='hello')return doHello(conn,m);
 const id=conn.dk&&conn.dk.dev,d=id&&meta.devs[id];if(!d)return;
 if(m.t==='ops'){
  if(!validDev(d)){removeDevice(id);return}
  if(m.n>d.ack){applyFrom(id,d.role,m.ops);d.ack=m.n;d.seen=Date.now();saveMeta()}
  send(conn,{t:'ack',n:d.ack});
 }
}
async function doJoin(conn,m){
 const key=String(m.name||'').trim().toLowerCase(),f=fails[key]||{n:0,until:0};
 if(Date.now()<f.until){send(conn,{t:'fail',msg:'Too many wrong tries. Wait 5 minutes and try again.'});return}
 const who=await checkJoin(m.name,m.pass);
 if(!who){f.n++;if(f.n>=5){f.until=Date.now()+3e5;f.n=0}fails[key]=f;send(conn,{t:'fail',msg:'Wrong name or password.'});return}
 fails[key]={n:0,until:0};
 if(meta.nextL>=26){send(conn,{t:'fail',msg:'Too many phones have been added to this shop. Remove the ones you do not use and contact support.'});return}
 ensureBase();
 const dev=rnd(10),k=rnd(24),letter=String.fromCharCode(65+meta.nextL++);
 meta.devs[dev]={user:who.name,role:who.role,key:k,letter,seen:Date.now(),ack:0};saveMeta();
 conn.dk={dev};conns[dev]=conn;
 send(conn,{t:'joined',dev,key:k,letter,role:who.role,user:who.name,snap:buildSnap(who.role)});emit();
}
async function doHello(conn,m){
 const d=meta.devs[m.dev];
 if(!d||d.key!==m.key||!validDev(d)){send(conn,{t:'revoked'});setTimeout(()=>{try{conn.close()}catch(e){}},500);return}
 const old=conns[m.dev];if(old&&old!==conn){delete conns[m.dev];try{old.close()}catch(e){}}
 conn.dk={dev:m.dev};conns[m.dev]=conn;ensureBase();
 const q=Array.isArray(m.queue)?m.queue.slice().sort((a,b)=>a.n-b.n):[];
 for(const b of q){if(b.n>d.ack){try{applyFrom(m.dev,d.role,b.ops)}catch(e){console.error(e)}d.ack=b.n}}
 d.seen=Date.now();saveMeta();
 send(conn,{t:'snap',ack:d.ack,snap:buildSnap(d.role)});emit();
}
export function removeDevice(id){
 const c=conns[id];delete meta.devs[id];delete conns[id];saveMeta();
 if(c){send(c,{t:'revoked'});setTimeout(()=>{try{c.close()}catch(e){}},500)}
 emit();
}
onUsersChanged((name,kind)=>{
 if(meta.mode!=='primary')return;
 if(kind==='del')for(const id of Object.keys(meta.devs))if(meta.devs[id].role==='staff'&&meta.devs[id].user===name)removeDevice(id);
 for(const id in conns)send(conns[id],{t:'users',users:staffUsers()});
});

// ---- a staff phone or second owner phone ----
async function startLinked(){
 if(isTest||meta.mode!=='linked'||starting)return;
 starting=true;setState('connecting');
 let Peer;try{Peer=await loadPeer()}catch(e){starting=false;setState('offline','The sharing tool could not load. Check the internet.');retry('l',startLinked,15000);return}
 try{if(peer)peer.destroy()}catch(e){}
 const p=peer=new Peer(peerCfg());
 p.on('open',()=>{if(peer!==p)return;starting=false;connect()});
 p.on('disconnected',()=>{retry('pd',()=>{try{if(peer===p&&!p.destroyed)p.reconnect()}catch(e){}},3000)});
 p.on('close',()=>{if(peer!==p)return;starting=false;retry('l',startLinked,5000)});
 p.on('error',e=>{
  if(peer!==p)return;const t=e&&e.type;
  if(t==='peer-unavailable'){down('The owner phone is not reachable. It must be switched on with the app open and internet.')}
  else{starting=false;down('No internet, or the connection service is busy. Trying again…',true)}
 });
}
function connect(){
 if(meta.mode!=='linked')return;
 if(lconn&&lconn.open)return;
 if(!peer||peer.destroyed)return startLinked();
 if(peer.disconnected){try{peer.reconnect()}catch(e){}retry('c',connect,3000);return}
 setState('connecting');
 const c=lconn=peer.connect('dkos-'+meta.shopId,{serialization:'json',reliable:true});
 const to=setTimeout(()=>{if(lconn===c&&!c.open)down('The owner phone is not reachable.')},15000);
 c.on('open',()=>{clearTimeout(to);lastRx=Date.now();send(c,{t:'hello',dev:meta.devId,key:meta.devKey,queue:meta.queue})});
 c.on('data',raw=>{lastRx=Date.now();const m=recv(c,raw);if(m)lmsg(m)});
 c.on('close',()=>{clearTimeout(to);if(lconn===c)down()});
 c.on('error',()=>{clearTimeout(to);if(lconn===c)down()});
}
function down(m,hard){
 ready=false;const c=lconn;lconn=null;try{c&&c.close()}catch(e){}
 setState('offline',m||'');retry('c',()=>hard?startLinked():connect(),backoff);backoff=Math.min(Math.round(backoff*1.6),60000);
}
const trim=n=>{meta.queue=(meta.queue||[]).filter(b=>b.n>n);saveMeta()};
function lmsg(m){
 const sc=SCOPES[meta.role];
 if(m.t==='snap'){
  trim(m.ack);replaceData(m.snap.data,[...sc.cols,...sc.recv]);db.users=m.snap.users||[];
  for(const b of meta.queue)applyOps(db,b.ops,null);
  base=makeBase(db,sc);stale=false;persist();
  ready=true;backoff=3000;meta.last=Date.now();saveMeta();setState('online');
  for(const b of meta.queue)send(lconn,{t:'ops',n:b.n,ops:b.ops});
  refresh();
 }else if(m.t==='ops'){
  applyOps(db,filterOps(m.ops||[],sc,'out'),base);persist();meta.last=Date.now();saveMeta();emit();refresh();
 }else if(m.t==='ack')trim(m.n);
 else if(m.t==='users'){db.users=m.users||[];persist()}
 else if(m.t==='revoked'){
  resetDevice();try{alert('This phone was removed from the shop. The shop data on it has been cleared.')}catch(e){}location.reload();
 }
}
// Called from the login screen on a new phone
export async function joinShop(code,name,pass){
 const id=String(code).replace(/[^a-z0-9]/gi,'').toLowerCase();
 if(id.length<6)return{err:'Enter the shop code shown on the owner phone.'};
 let Peer;try{Peer=await loadPeer()}catch(e){return{err:'The sharing tool could not load. Check your internet and try again.'}}
 return new Promise(res=>{
  const p=new Peer(peerCfg());let over=false;
  const done=r=>{if(over)return;over=true;clearTimeout(to);try{p.destroy()}catch(e){}res(r)};
  const to=setTimeout(()=>done({err:'Could not reach the owner phone. It must be on, with the app open and internet.'}),30000);
  p.on('error',e=>done({err:e&&e.type==='peer-unavailable'?'Owner phone not found. Check the code, and that the owner app is open.':'Connection problem ('+(e&&e.type||'unknown')+'). Check your internet.'}));
  p.on('open',()=>{
   const c=p.connect('dkos-'+id,{serialization:'json',reliable:true});
   c.on('open',()=>send(c,{t:'join',name,pass}));
   c.on('data',raw=>{
    const m=recv(c,raw);if(!m)return;
    if(m.t==='fail')done({err:m.msg});
    else if(m.t==='joined'){try{adopt(m,id);done({ok:true})}catch(e){done({err:'Could not save the shop data on this phone.'})}}
   });
   c.on('error',()=>done({err:'Connection problem. Try again.'}));
  });
 });
}
function adopt(m,shopId){
 Object.assign(meta,{mode:'linked',shopId,devId:m.dev,devKey:m.key,letter:m.letter,role:m.role,user:m.user,queue:[],nseq:0,seq:{},shareOn:false,devs:{},last:Date.now()});saveMeta();
 const sc=SCOPES[m.role];
 for(const k of Object.keys(db))delete db[k];
 Object.assign(db,{v:1,shop:{name:'',gstin:'',owner:''},products:[],customers:[],bills:[],ledger:[],vehicles:[],trips:[],seq:{bill:1}});
 replaceData(m.snap.data,[...sc.cols,...sc.recv]);db.users=m.snap.users||[];persist();
}

// ---- controls used by the Backup screen ----
export function getStatus(){
 const f=s=>s?(s.slice(0,4)+'-'+s.slice(4)).toUpperCase():'';
 return{mode:meta.mode,role:meta.role,user:meta.user,state,msg,shareOn:!!meta.shareOn,code:f(meta.shopId),keep:!!meta.keep,pending:(meta.queue||[]).length,last:meta.last||0,letter:meta.letter||'',
  devices:Object.entries(meta.devs||{}).map(([id,d])=>({id,user:d.user,role:d.role,letter:d.letter,online:!!(conns[id]&&conns[id].open),seen:d.seen}))};
}
export function startSharing(){if(meta.mode!=='primary')return;meta.shareOn=true;saveMeta();startPrimary();emit()}
export function stopSharing(){
 meta.shareOn=false;saveMeta();clearTimeout(timers.p);
 for(const id in conns){try{conns[id].close()}catch(e){}}conns={};
 try{if(peer)peer.destroy()}catch(e){}peer=null;starting=false;setKeepAlive(false);setState('off');
}
export function setKeep(on){meta.keep=!!on;saveMeta();if(meta.mode==='primary'&&meta.shareOn)setKeepAlive(!!on);emit()}
export function syncNow(){
 if(meta.mode!=='linked')return;
 backoff=3000;clearTimeout(timers.c);ready=false;const c=lconn;lconn=null;try{c&&c.close()}catch(e){}connect();
}
export function initSync(){
 if(isTest)return;
 setSaveHook(onSave);
 if(meta.mode==='linked'){base=makeBase(db,SCOPES[meta.role]);stale=false}
 if(meta.mode==='primary')startPrimary();else startLinked();
 const wake=()=>{
  if(meta.mode==='primary'){if(meta.shareOn&&(!peer||peer.destroyed||peer.disconnected))startPrimary()}
  else if(!(lconn&&lconn.open)){backoff=3000;clearTimeout(timers.c);connect()}
 };
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake()});
 addEventListener('online',wake);
 setInterval(()=>{
  if(meta.mode==='primary'){if(meta.shareOn&&(!peer||peer.destroyed||peer.disconnected)&&!starting)startPrimary();return}
  if(lconn&&lconn.open){if(Date.now()-lastRx>55000)down('Connection lost.');else send(lconn,{t:'ping'})}
 },20000);
}

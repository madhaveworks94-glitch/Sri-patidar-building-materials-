// Test mode (TESTERMAD login) keeps its own separate data so practice bills never touch the real shop.
const MODE=(()=>{try{return localStorage.getItem('dk.mode')==='test'?'test':'real'}catch(e){return 'real'}})();
export const isTest=MODE==='test';
export const DBKEY=isTest?'dukaanos.test':'dukaanos.v1';
const MKEY=isTest?'dukaanos.testmeta':'dukaanos.sync';
const empty=()=>({v:1,shop:{name:'Patidar Building Materials',gstin:'',owner:'Sanjaya'},products:[],customers:[],bills:[],ledger:[],vehicles:[],trips:[],seq:{bill:1}});
function load(){try{return{...empty(),...JSON.parse(localStorage.getItem(DBKEY)||'{}')}}catch(e){return empty()}}
export let db=load();
// Device settings that are never shared: is this the owner's main phone or a linked phone, bill-number series, unsent changes
const emptyMeta=()=>({mode:'primary',devs:{},nextL:0,seq:{},queue:[],nseq:0,keep:true,shareOn:false});
function loadMeta(){try{return{...emptyMeta(),...JSON.parse(localStorage.getItem(MKEY)||'{}')}}catch(e){return emptyMeta()}}
export const meta=loadMeta();
export const saveMeta=()=>{try{localStorage.setItem(MKEY,JSON.stringify(meta))}catch(e){}};
export const resetDevice=()=>{try{localStorage.removeItem(DBKEY);localStorage.removeItem(MKEY);sessionStorage.removeItem('dk.u')}catch(e){}};
export const persist=()=>{try{localStorage.setItem(DBKEY,JSON.stringify(db))}catch(e){}};
let hook=null;
export const setSaveHook=f=>{hook=f};
// save() first lets the sync layer record what changed, then writes to the phone
export const save=()=>{if(hook){try{hook()}catch(e){console.error(e)}}persist()};
// Replace data in place (keeps every module's reference valid). Used by sync snapshots and joining a shop.
export function replaceData(obj,keys){for(const k of keys){if(k in obj)db[k]=obj[k]}persist()}
export const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
export const inr=n=>'₹'+Math.round(n).toLocaleString('en-IN');
export const dateFmt=t=>new Date(t).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
export function clearAll(){const keep={users:db.users,ownerAuth:db.ownerAuth,noTester:db.noTester};db=empty();for(const k in keep)if(keep[k]!==undefined)db[k]=keep[k];save()}
export function realField(k){try{return(JSON.parse(localStorage.getItem('dukaanos.v1')||'{}'))[k]}catch(e){return undefined}}
// Bill numbers. The owner's main phone keeps the normal series (INV/26-27/0001). Every linked phone gets its own
// letter (INV/26-27/A0001) so phones can bill offline and numbers never clash or leave gaps.
export function numbers(k,fy){
 const pad=(n,w)=>String(n).padStart(w,'0'),L=meta.letter||'';
 if(!L){db.seq[k]=db.seq[k]||1;const no=db.seq.bill++;return{no,inv:k==='gst'?'INV/'+fy+'/'+pad(db.seq['g'+fy]=(db.seq['g'+fy]||0)+1,4):'BILL-'+pad(db.seq[k]++,3)}}
 const s=meta.seq=meta.seq||{},gk='g'+fy;s.bill=(s.bill||0)+1;
 const n=k==='gst'?(s[gk]=(s[gk]||0)+1):(s[k]=(s[k]||0)+1);saveMeta();
 return{no:(L.charCodeAt(0)-64)*100000+s.bill,inv:k==='gst'?'INV/'+fy+'/'+L+pad(n,4):'BILL-'+L+pad(n,3)};
}
// Sample data so the dashboard can be previewed before real bills exist
export function seed(){
 const day=864e5,now=Date.now();
 db.products=[
  {id:uid(),name:'Cement (PPC)',baseUnit:'bag',units:[{name:'bag',per:1},{name:'ton',per:20}],stock:180,rate:395,gst:28,low:50},
  {id:uid(),name:'Sand (balu)',baseUnit:'cft',units:[{name:'cft',per:1},{name:'trolley',per:100}],stock:900,rate:45,gst:5,low:300},
  {id:uid(),name:'Bricks',baseUnit:'pcs',units:[{name:'pcs',per:1},{name:'1000',per:1000}],stock:2500,rate:8,gst:5,low:3000},
  {id:uid(),name:'TMT bar 12mm',baseUnit:'kg',units:[{name:'kg',per:1},{name:'quintal',per:100}],stock:1200,rate:62,gst:18,low:400}];
 db.customers=['Ramesh Contractor','Sharma Builders','Walk-in','Vijay Singh'].map(n=>({id:uid(),name:n,phone:''}));
 const rows=[[0,0,'gst',48500,20000],[0,2,'kachha',2400,2400],[1,1,'gst',126000,60000],[2,3,'kachha',7800,0],[3,0,'gst',32000,32000],[4,2,'kachha',1500,1500],[5,1,'gst',88000,30000],[6,3,'kachha',5200,5200]];
 db.bills=rows.map(([d,c,t,total,paid],i)=>({id:uid(),no:i+1,type:t,customerId:db.customers[c].id,customerName:db.customers[c].name,items:[],total,paid,date:now-d*day-i*36e5})).sort((a,b)=>b.date-a.date);
 db.seq.bill=rows.length+1;save();
}

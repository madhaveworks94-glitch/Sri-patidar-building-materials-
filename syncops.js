// Change tracking for phone-to-phone sharing. No network and no screen code here, so it can be tested on its own.
// Every save() is compared with what the phone last knew. The difference becomes small "ops":
//   {c,id,rec}      a new record          {c,id,f,i,u}  changed fields (f = new values, i = number changes, u = removed fields)
//   {c,id,del:1}    a removed record      {s,v}         a single setting (shop details etc.)
// Numbers that several phones change at once (stock, paid, left) travel as "+/- amounts", so two staff selling the same
// item at the same moment both count.
export const ACC={products:['stock'],bills:['paid'],ledger:['left']};
const ALL=['products','customers','bills','ledger','stockLog','vehicles','trips','spend','creditNotes','cancelled'];
const OWNER_SINGLE=['shop','cleanMonths','noTester','ownerAuth'];
export const SCOPES={
 owner:{cols:ALL,single:OWNER_SINGLE,recv:OWNER_SINGLE},
 staff:{cols:['products','customers','bills','ledger','stockLog'],single:[],recv:['shop'],trim:true}
};
const DAY=864e5;
const keep=(scope,c,r)=>{if(!scope.trim)return true;const lim=Date.now()-90*DAY;if(c==='bills')return(r.total-r.paid)>0.004||r.date>lim;if(c==='stockLog')return r.date>lim;return true};
const J=JSON.stringify;
export function makeBase(db,scope){
 const c={},s={};
 for(const k of scope.cols){const m=new Map();for(const r of db[k]||[])if(r&&r.id!=null)m.set(r.id,J(r));c[k]=m}
 for(const k of new Set([...scope.single,...scope.recv]))s[k]=J(db[k]===undefined?null:db[k]);
 return{c,s};
}
export function diff(db,base,scope){
 const ops=[];
 for(const c of scope.cols){
  const bm=base.c[c]||(base.c[c]=new Map()),seen=new Set(),acc=ACC[c]||[];
  for(const r of db[c]||[]){
   if(!r||r.id==null)continue;seen.add(r.id);
   const s=J(r),o=bm.get(r.id);if(o===s)continue;
   if(o===undefined)ops.push({c,id:r.id,rec:JSON.parse(s)});
   else{
    const p=JSON.parse(o),f={},i={},u=[];
    for(const k of new Set([...Object.keys(p),...Object.keys(r)])){
     if(J(p[k])===J(r[k]))continue;
     if(acc.includes(k)&&typeof p[k]==='number'&&typeof r[k]==='number')i[k]=r[k]-p[k];
     else if(r[k]===undefined)u.push(k);else f[k]=JSON.parse(J(r[k]));
    }
    ops.push({c,id:r.id,f,i,u});
   }
   bm.set(r.id,s);
  }
  for(const id of [...bm.keys()])if(!seen.has(id)){ops.push({c,id,del:1});bm.delete(id)}
 }
 for(const k of scope.single){const s=J(db[k]===undefined?null:db[k]);if(base.s[k]!==s){ops.push({s:k,v:db[k]===undefined?null:JSON.parse(s)});base.s[k]=s}}
 return ops;
}
// Apply ops that came from another phone. base (if given) is updated so the same change is not sent back.
export function applyOps(db,ops,base){
 const idx={},ix=c=>idx[c]||(idx[c]=new Map((db[c]||[]).filter(r=>r&&r.id!=null).map(r=>[r.id,r])));
 for(const o of ops){
  if(o.s){db[o.s]=o.v;if(base)base.s[o.s]=J(o.v===undefined?null:o.v);continue}
  const c=o.c;if(!db[c])db[c]=[];const m=ix(c),cur=m.get(o.id),bm=base&&base.c[c];
  if(o.del){if(cur){const a=db[c],i=a.indexOf(cur);if(i>=0)a.splice(i,1);m.delete(o.id)}if(bm)bm.delete(o.id);continue}
  if(o.rec){
   if(cur){for(const k of Object.keys(cur))delete cur[k];Object.assign(cur,o.rec)}
   else{const r=o.rec;if(c==='bills'||c==='cancelled')db[c].unshift(r);else db[c].push(r);m.set(o.id,r)}
  }else{
   if(!cur)continue;
   for(const k in o.f||{})cur[k]=o.f[k];
   for(const k in o.i||{})cur[k]=(Number(cur[k])||0)+o.i[k];
   for(const k of o.u||[])delete cur[k];
  }
  if(bm){const r=m.get(o.id);if(r)bm.set(o.id,J(r))}
 }
}
// dir 'in': what a phone with this scope may send us. dir 'out': what we may send to it.
export function filterOps(ops,scope,dir){
 const sing=dir==='in'?scope.single:scope.recv;
 return ops.filter(o=>o.s?sing.includes(o.s):scope.cols.includes(o.c));
}
export function snapshot(db,scope){
 const data={};
 for(const c of scope.cols)data[c]=(db[c]||[]).filter(r=>keep(scope,c,r));
 for(const k of scope.recv)if(db[k]!==undefined)data[k]=db[k];
 return data;
}

import {db,save,uid} from './store.js';
import {fy} from './invoice.js';
import {receive} from './khata.js';
const per=(p,u)=>(p.units.find(x=>x.name===u)||{per:1}).per;
export function makeCN(b,qtys,mode){
 const items=[];let tx=0,tax=0;
 b.items.forEach((it,i)=>{
  const q=Math.min(parseFloat(qtys[i])||0,it.qty-(it.ret||0));if(q<=0)return;
  const unit=it.tx!==undefined&&it.qty>0?it.tx/it.qty:it.rate,t=unit*q;tx+=t;tax+=t*(it.gst||0)/100;
  items.push({pid:it.pid,name:it.name,hsn:it.hsn||'',unit:it.unit,gst:it.gst||0,qty:q,rate:unit,tx:t,disc:0});it.ret=(it.ret||0)+q;
 });
 if(!items.length)return null;
 const raw=tx+tax,total=b.type==='gst'?Math.round(raw):raw,k='c'+fy();db.seq[k]=(db.seq[k]||0)+1;
 const cn={id:uid(),isCN:true,type:b.type,billId:b.id,billInv:b.inv,billDate:b.date,inv:b.type==='gst'?'CN/'+fy()+'/'+String(db.seq[k]).padStart(4,'0'):'RET-'+String(db.seq[k]).padStart(3,'0'),
  customerId:b.customerId,customerName:b.customerName,phone:b.phone,gstin:b.gstin,addr:b.addr,state:b.state,inter:b.inter,sup:b.sup,items,gross:tx,disc:0,sub:tx,tax,round:total-raw,total,paid:total,mode,date:Date.now()};
 items.forEach(it=>{const p=db.products.find(x=>x.id===it.pid);if(p)p.stock+=it.qty*per(p,it.unit)});
 if(mode==='adjust'&&b.customerId)receive(b.customerId,total,'Credit note');
 (db.creditNotes=db.creditNotes||[]).unshift(cn);save();return cn;
}

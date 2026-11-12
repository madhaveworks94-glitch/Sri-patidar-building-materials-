// Profit helpers. Each bill line remembers what the item cost when it was sold (cost = per unit sold),
// so changing the buying price later does not change old bills. Old bills fall back to the item's buying price.
import {db} from './store.js';
const pu=(p,u)=>(p.units.find(x=>x.name===u)||{per:1}).per;
// amount of a line without GST (what the shop really earns)
export const lineAmt=i=>i.tx!==undefined?i.tx:i.qty*i.rate;
// profit of one bill line, or null when no buying price is known
export function lineProfit(i){
 let c=i.cost;
 if(c===undefined){const p=db.products.find(x=>x.id===i.pid);c=p&&p.cost>0?p.cost*pu(p,i.unit):0}
 if(!(c>0))return null;
 return lineAmt(i)-i.qty*c;
}
// profit of a whole bill. known = at least one line had a buying price; rev = sales value of those lines
export function billProfit(b){
 let prof=0,rev=0,known=false;
 for(const i of b.items||[]){const x=lineProfit(i);if(x!==null){prof+=x;rev+=lineAmt(i);known=true}}
 return{prof,rev,known};
}

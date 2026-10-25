const KEY='dukaanos.v1';
const empty=()=>({v:1,shop:{name:'Patidar Building Materials',gstin:'',owner:'Madhav'},products:[],customers:[],bills:[],ledger:[],vehicles:[],trips:[],seq:{bill:1}});
function load(){try{return{...empty(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){return empty()}}
export let db=load();
export const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}};
export const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
export const inr=n=>'₹'+Math.round(n).toLocaleString('en-IN');
export const dateFmt=t=>new Date(t).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
export function clearAll(){db=empty();save()}
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

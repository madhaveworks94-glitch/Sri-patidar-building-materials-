import {db,inr} from './store.js';
const num=v=>parseFloat(v)||0;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sod=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
const N={today:1,week:7,month:30},LB={today:'Today',week:'Last 7 days',month:'Last 30 days'};
let root,per='week';
const pays=()=>db.ledger.filter(l=>l.type==='payment');
const pu=(p,u)=>(p.units.find(x=>x.name===u)||{per:1}).per;
const due=b=>Math.max(b.total-b.paid,0);
const top=(o,n)=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,n);

function data(){
 const n=N[per],from=sod(Date.now())-(n-1)*864e5,bills=db.bills.filter(b=>b.date>=from),al=pays().flatMap(p=>p.allocs);
 const s0=b=>b.paid-al.filter(a=>a.k==='bill'&&a.id===b.id).reduce((s,a)=>s+a.amt,0);
 const d={n,from,bills,sales:bills.reduce((s,b)=>s+b.total,0),tax:bills.reduce((s,b)=>s+(b.type==='gst'?num(b.tax):0),0)};
 d.recv=bills.reduce((s,b)=>s+s0(b),0)+pays().filter(p=>p.date>=from).reduce((s,p)=>s+p.amount,0);
 d.owed=db.bills.reduce((s,b)=>s+due(b),0)+db.ledger.filter(l=>l.type==='opening').reduce((s,o)=>s+o.left,0);
 let rev=0,prof=0;const ir={},cr={};
 bills.forEach(b=>{cr[b.customerName]=(cr[b.customerName]||0)+b.total;(b.items||[]).forEach(i=>{const a=i.qty*i.rate;ir[i.name]=(ir[i.name]||0)+a;const p=db.products.find(x=>x.id===i.pid);if(p&&p.cost>0){rev+=a;prof+=a-i.qty*pu(p,i.unit)*p.cost}})});
 Object.assign(d,{rev,prof,items:top(ir,5),custs:top(cr,5)});
 const age=[0,0,0];db.bills.forEach(b=>{if(due(b)>0){const a=(Date.now()-b.date)/864e5;age[a<=30?0:a<=60?1:2]+=due(b)}});
 db.ledger.filter(l=>l.type==='opening'&&l.left>0).forEach(o=>{const a=(Date.now()-o.date)/864e5;age[a<=30?0:a<=60?1:2]+=o.left});
 d.age=age;
 d.fleet=db.trips.filter(t=>t.done&&t.end>=from).reduce((s,t)=>s+num(t.freight)-num(t.fuel)-num(t.other),0);
 d.days=[...Array(n)].map((_,i)=>{const s=sod(Date.now()-(n-1-i)*864e5);return db.bills.filter(b=>sod(b.date)===s).reduce((a,b)=>a+b.total,0)});
 return d;
}
function chart(d){
 if(d.n<7)return'';const W=340,H=130,m=Math.max(1,...d.days),g=W/d.n,bw=g*.62;
 return`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Daily sales">`+d.days.map((v,i)=>{const h=(H-8)*v/m;return`<rect x="${i*g+(g-bw)/2}" y="${H-4-h}" width="${bw}" height="${Math.max(h,v?2:0)}" rx="3" fill="${v?'#f26a21':'#e4e4e1'}"/>`}).join('')+`</svg>`;
}
const bars=(rows,max)=>rows.length?rows.map(([k,v])=>`<div style="margin:8px 0"><div class="bl-l" style="padding:0"><span>${esc(k)}</span><b>${inr(v)}</b></div><div style="height:6px;border-radius:9px;background:var(--line)"><div style="height:6px;border-radius:9px;background:var(--or);width:${Math.max(4,100*v/max)}%"></div></div></div>`).join(''):'<p class="mute">Nothing yet for this period.</p>';

function render(){
 const d=data(),pm=d.rev>0?Math.round(100*d.prof/d.rev):null;
 const txt=[`${db.shop.name}, ${LB[per]}`,`Sales: ${inr(d.sales)} (${d.bills.length} bills)`,`Money received: ${inr(d.recv)}`,`Udhaar pending: ${inr(d.owed)}`,d.tax?`GST collected: ${inr(d.tax)}`:'',d.rev>0?`Profit estimate: ${inr(d.prof)}`:'',d.items[0]?`Top item: ${d.items[0][0]}`:''].filter(Boolean).join('\n');
 root.innerHTML=`<div class="bl"><h1>Reports</h1><div class="seg">${Object.keys(N).map(k=>`<button data-p="${k}" class="${k===per?'on':''}">${k==='today'?'Today':k==='week'?'7 days':'30 days'}</button>`).join('')}</div>
 <div class="grid"><div class="card hero wide"><h3>Sales, ${LB[per].toLowerCase()}</h3><div class="num">${inr(d.sales)}</div><span class="pill">${d.bills.length} bills</span></div>
 <div class="card"><h3>Money received</h3><div class="num">${inr(d.recv)}</div></div><div class="card"><h3>Udhaar pending</h3><div class="num bad">${inr(d.owed)}</div></div>
 <div class="card"><h3>GST collected</h3><div class="num">${inr(d.tax)}</div></div><div class="card"><h3>Profit (estimate)</h3><div class="num ${d.prof<0?'bad':''}">${d.rev>0?inr(d.prof):'—'}</div>${pm!==null?`<span class="pill">${pm}% margin</span>`:'<small class="mute">Add buying prices in Inventory</small>'}</div></div>
 ${d.n>=7?`<div class="card" style="margin-top:12px"><h3>Daily sales</h3>${chart(d)}</div>`:''}
 <div class="card" style="margin-top:12px"><h3>Best selling items</h3>${bars(d.items,d.items[0]?d.items[0][1]:1)}</div>
 <div class="card" style="margin-top:12px"><h3>Top customers</h3>${bars(d.custs,d.custs[0]?d.custs[0][1]:1)}</div>
 <div class="card" style="margin-top:12px"><h3>How old is the udhaar</h3><div class="bl-l"><span>Up to 30 days</span><b>${inr(d.age[0])}</b></div><div class="bl-l"><span>31 to 60 days</span><b>${inr(d.age[1])}</b></div><div class="bl-l"><span>Over 60 days</span><b class="${d.age[2]?'bad':''}">${inr(d.age[2])}</b></div></div>
 <div class="card" style="margin-top:12px"><h3>Delivery vehicles, net</h3><div class="num ${d.fleet<0?'bad':''}">${inr(d.fleet)}</div></div>
 <a class="btn dark" style="margin-top:12px" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">Send report on WhatsApp</a></div>`;
 root.onclick=e=>{const p=e.target.dataset.p;if(p){per=p;render()}};
}
export function mountReports(r){root=r;render()}

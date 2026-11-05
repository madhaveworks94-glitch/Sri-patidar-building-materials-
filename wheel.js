// Half-wheel navigation for phones. Home is the hub in the centre; the other sections sit on the arc.
// Swipe left or right on the wheel to turn it, tap any section to open it.
const STEP=40,R=104,CY=40,HUB=62,ITEM=58,PAD=8,DISK=R+ITEM/2+PAD,H=CY+R+ITEM/2+PAD+2,PX=R*STEP*Math.PI/180;
document.head.insertAdjacentHTML('beforeend',`<style>
#wheel{display:none}
@media(max-width:699px){
 nav{display:none!important}
 .app{padding-bottom:calc(${H+16}px + env(safe-area-inset-bottom))}
 #wheel{display:block;position:fixed;left:0;right:0;bottom:0;height:calc(${H}px + env(safe-area-inset-bottom));z-index:6;overflow:hidden;touch-action:pan-y;user-select:none;-webkit-user-select:none;transition:transform .3s ease;pointer-events:none}
 #wheel.hid{transform:translateY(${H-82}px)}
 #wheel>*{pointer-events:auto}
 .wh-d{position:absolute;left:50%;bottom:calc(${CY-DISK}px + env(safe-area-inset-bottom));width:${DISK*2}px;height:${DISK*2}px;margin-left:-${DISK}px;border-radius:50%;background:#fff;box-shadow:0 -3px 16px rgba(0,0,0,.14)}
 .wh-c{position:absolute;left:50%;bottom:calc(${CY}px + env(safe-area-inset-bottom));width:0;height:0;pointer-events:none}
 .wh-i{position:absolute;left:0;top:0;width:${ITEM}px;height:${ITEM}px;margin:-${ITEM/2}px 0 0 -${ITEM/2}px;padding:0;border:0;border-radius:50%;background:var(--card);color:var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font:600 10px/1.1 Hind,system-ui,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.14);pointer-events:auto;transition:transform .28s ease,opacity .28s ease;cursor:pointer}
 .wh-i.on{background:var(--or);color:#fff}
 #wheel.drag .wh-i{transition:none}
 .wh-h{position:absolute;left:50%;bottom:calc(${CY-HUB/2}px + env(safe-area-inset-bottom));width:${HUB}px;height:${HUB}px;margin-left:-${HUB/2}px;border:0;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;padding:0;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)}
 .wh-h.on{background:var(--or)}
 .wh-h svg{width:26px;height:26px}
}
@media print{#wheel{display:none!important}}
</style>`);
let el,ring,hub,items=[],pos=0,active='',key='',go=()=>{},down=null;
const clamp=v=>Math.max(0,Math.min(Math.max(items.length-1,0),v));
function place(){
 if(!ring)return;
 ring.querySelectorAll('.wh-i').forEach((b,i)=>{
  const d=i-pos,a=(90-d*STEP)*Math.PI/180,dist=Math.abs(d)*STEP,op=dist>100?0:dist>78?(100-dist)/22:1,s=1+.14*Math.max(0,1-Math.abs(d));
  b.style.transform=`translate(${(R*Math.cos(a)).toFixed(1)}px,${(-R*Math.sin(a)).toFixed(1)}px) scale(${s.toFixed(3)})`;
  b.style.opacity=op;b.style.pointerEvents=op<.3?'none':'auto';
  b.classList.toggle('on',items[i].id===active);
 });
}
export function initWheel(homeSvg,onGo){
 go=onGo||(id=>{location.hash='#/'+id});
 el=document.createElement('div');el.id='wheel';
 el.innerHTML=`<div class="wh-d"></div><div class="wh-c"></div><button class="wh-h" type="button" data-w="overview" aria-label="Home">${homeSvg}</button>`;
 document.body.appendChild(el);ring=el.querySelector('.wh-c');hub=el.querySelector('.wh-h');
 el.addEventListener('pointerdown',e=>{
  if(el.classList.contains('hid')&&!e.target.closest('.wh-h')){el.classList.remove('hid');down=null;return}
  down={x:e.clientX,p:pos,t:e.target,moved:false};
 });
 el.addEventListener('pointermove',e=>{
  if(!down)return;const dx=e.clientX-down.x;
  if(!down.moved&&Math.abs(dx)>6){down.moved=true;el.classList.add('drag');try{el.setPointerCapture(e.pointerId)}catch(_){}}
  if(down.moved){pos=clamp(down.p-dx/PX);place()}
 });
 el.addEventListener('pointerup',()=>{
  if(!down)return;const d=down;down=null;el.classList.remove('drag');
  if(d.moved){pos=Math.round(pos);place()}
  else{const b=d.t.closest&&d.t.closest('[data-w]');if(b){el.classList.remove('hid');go(b.dataset.w)}}
 });
 el.addEventListener('pointercancel',()=>{if(!down)return;down=null;el.classList.remove('drag');pos=Math.round(pos);place()});
 let last=window.scrollY;
 addEventListener('scroll',()=>{const y=window.scrollY;if(y>last+10&&y>80)el.classList.add('hid');else if(y<last-10||y<=20)el.classList.remove('hid');last=y},{passive:true});
}
// list: [{id,label,svg}] sections on the arc (without Home); activeId: section being shown; isHome: Home is open
export function syncWheel(list,activeId,isHome){
 if(!ring)return;
 const k=list.map(x=>x.id).join(',');
 if(k!==key){key=k;items=list;ring.innerHTML=list.map((x,i)=>`<button class="wh-i" type="button" data-w="${x.id}" aria-label="${x.label}">${x.svg}<span>${x.label}</span></button>`).join('')}
 active=isHome?'':activeId;
 const i=items.findIndex(x=>x.id===activeId);if(i>=0)pos=i;else pos=clamp(pos);
 hub.classList.toggle('on',!!isHome);el.classList.remove('hid');place();
}

// Slim bottom navigation for phones.
// Home is fixed on the left. The other sections sit on a gentle curve: the selected one is raised in the centre.
// Swipe the strip sideways to slide the sections, tap one to open it (it slides to the centre).
const ITEM=52,BAR=70,HOMEW=68;
document.head.insertAdjacentHTML('beforeend',`<style>
#wheel{display:none}
@media(max-width:699px){
 nav{display:none!important}
 .app{padding-bottom:calc(${BAR+18}px + env(safe-area-inset-bottom))}
 #wheel{display:block;position:fixed;left:0;right:0;bottom:0;height:calc(${BAR}px + env(safe-area-inset-bottom));z-index:6;background:#fff;border-radius:20px 20px 0 0;box-shadow:0 -2px 12px rgba(0,0,0,.12);touch-action:none;user-select:none;-webkit-user-select:none}
 #wheel.kb{display:none}
 .wh-v{position:absolute;left:${HOMEW}px;right:0;top:0;height:${BAR}px;overflow:hidden}
 .wh-c{position:absolute;left:50%;top:0;width:0;height:0}
 .wh-b{position:absolute;margin:0;padding:0;border:0;background:var(--card);color:var(--ink);width:${ITEM}px;height:${ITEM}px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font:600 10px/1.1 Hind,system-ui,sans-serif;cursor:pointer}
 .wh-b svg{width:22px;height:22px}
 .wh-i{left:-${ITEM/2}px;top:9px;transition:transform .28s ease,opacity .28s ease,background .2s}
 .wh-i.on{background:var(--or);color:#fff}
 #wheel.drag .wh-i{transition:none}
 .wh-h{left:8px;top:9px;background:var(--ink);color:#fff}
 .wh-h.on{background:var(--or)}
 .wh-l{position:absolute;left:${HOMEW-2}px;top:16px;height:${BAR-32}px;width:1px;background:var(--line)}
}
@media print{#wheel{display:none!important}}
</style>`);
let el,view,ring,hub,items=[],pos=0,active='',key='',go=()=>{},down=null;
const clamp=v=>Math.max(0,Math.min(Math.max(items.length-1,0),v));
const sp=()=>Math.max(52,Math.min(64,(view.clientWidth||300)/5));
function place(){
 if(!ring)return;
 ring.querySelectorAll('.wh-i').forEach((b,i)=>{
  const d=i-pos,a=Math.abs(d),near=Math.max(0,1-a),op=a<=2?1:Math.max(0,1-(a-2)*1.6),dy=-5*near+Math.min(d*d*2,6),s=1+.12*near;
  b.style.transform=`translate(${(d*sp()).toFixed(1)}px,${dy.toFixed(1)}px) scale(${s.toFixed(3)})`;
  b.style.opacity=op;b.style.pointerEvents=op<.3?'none':'auto';
  b.classList.toggle('on',items[i].id===active);
 });
}
export function initWheel(homeSvg,onGo){
 go=onGo||(id=>{location.hash='#/'+id});
 el=document.createElement('div');el.id='wheel';
 el.innerHTML=`<button class="wh-b wh-h" type="button" data-w="overview" aria-label="Home">${homeSvg}<span>Home</span></button><div class="wh-l"></div><div class="wh-v"><div class="wh-c"></div></div>`;
 document.body.appendChild(el);view=el.querySelector('.wh-v');ring=el.querySelector('.wh-c');hub=el.querySelector('.wh-h');
 el.addEventListener('pointerdown',e=>{down={x:e.clientX,p:pos,t:e.target,moved:false}});
 el.addEventListener('pointermove',e=>{
  if(!down)return;const dx=e.clientX-down.x;
  if(!down.moved&&Math.abs(dx)>6){down.moved=true;el.classList.add('drag');try{el.setPointerCapture(e.pointerId)}catch(_){}}
  if(down.moved){pos=clamp(down.p-dx/sp());place()}
 });
 el.addEventListener('pointerup',()=>{
  if(!down)return;const d=down;down=null;el.classList.remove('drag');
  if(d.moved){pos=Math.round(pos);place()}
  else{const b=d.t.closest&&d.t.closest('[data-w]');if(b){const i=items.findIndex(x=>x.id===b.dataset.w);if(i>=0){pos=i;place()}go(b.dataset.w)}}
 });
 el.addEventListener('pointercancel',()=>{if(!down)return;down=null;el.classList.remove('drag');pos=Math.round(pos);place()});
 // hide the bar while typing so the keyboard and the bar never fight for space
 document.addEventListener('focusin',e=>{if(/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))el.classList.add('kb')});
 document.addEventListener('focusout',()=>setTimeout(()=>{const a=document.activeElement;if(!a||!/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))el.classList.remove('kb')},150));
 addEventListener('resize',place);
}
// list: [{id,label,svg}] sections on the strip (without Home); activeId: section being shown; isHome: Home is open
export function syncWheel(list,activeId,isHome){
 if(!ring)return;
 const k=list.map(x=>x.id).join(',');
 if(k!==key){key=k;items=list;ring.innerHTML=list.map(x=>`<button class="wh-b wh-i" type="button" data-w="${x.id}" aria-label="${x.label}">${x.svg}<span>${x.label}</span></button>`).join('')}
 active=isHome?'':activeId;
 const i=items.findIndex(x=>x.id===activeId);if(i>=0)pos=i;else pos=clamp(pos);
 hub.classList.toggle('on',!!isHome);place();
}

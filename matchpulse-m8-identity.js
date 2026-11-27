/* M8 Identity — local cosmetic trial. No wallet/inventory mutation, no claimed ownership. */
(function(){
'use strict';
if(window.MP_M8_IDENTITY_READY)return;
const plates=[["classic","Classic","Comune",30],["green","Green Crest","Comune",30],["storm","Storm Line","Comune",30],["violet","Violet Edge","Rara",60],["sakura","Sakura Bloom","Rara",60],["thunder","Thunderbolt","Rara",60],["grandline","Grand Line","Epica",110],["saiyan","Saiyan Power","Epica",110],["nightcity","Night City","Epica",110],["hyperdrive","Hyperdrive","Leggendaria",200],["divine","Divine Crown","Leggendaria",200],["cosmic","Cosmic Infinity","Leggendaria",200]];
const titles=["Il Debuttante","Il Combattente","Il Cecchino","Il Generoso","Il Veterano","Il Bomber","Il Regista","Il Muro","L'Instancabile","Il Vincente","Re del Gol","Maestro del Gioco","L'Inarrestabile","L'Uomo della Provvidenza","Il Fenomeno","Il Centurione","Il Re","L'Architetto","Leggenda Vivente","L'Immortale"];
const app=document.getElementById('app');
const key='matchpulse_m8_identity_preview_v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let uid=null,selection={plate:'',title:''},draft={...selection},open=false,queued=false;
function valid(o){return {plate:plates.some(p=>p[0]===o?.plate)?o.plate:'',title:titles.includes(o?.title)?o.title:''};}
function read(){
  const next=window.mpM6Catalog?.().userId||uid;
  if(!next)return;
  if(next!==uid){uid=next;try{selection=valid(JSON.parse(localStorage.getItem(key+':'+uid)||'{}'));}catch{selection={plate:'',title:''};}}
}
async function resolveUser(){
  const current=window.mpM6Catalog?.().userId;
  if(current){read();return;}
  if(!uid){
    try{
      const db=window.matchpulseSupabase;
      const r=await db?.auth?.getSession?.();
      const id=r?.data?.session?.user?.id;
      if(id){uid=id;try{selection=valid(JSON.parse(localStorage.getItem(key+':'+id)||'{}'));}catch{selection={plate:'',title:''};}}
    }catch{}
  }
}
function plateImage(id,lazy=false){
  if(!plates.some(p=>p[0]===id))return '';
  return '<img class="mp8-plate-image" src="mp8-plates/'+id+'.webp?v=hd1" width="1100" height="320" alt="" decoding="async"'+(lazy?' loading="lazy"':'')+'>';
}
function markup(o){
  if(!o?.plate&&!o?.title)return '';
  const idx=plates.findIndex(p=>p[0]===o.plate);
  const title=o.title||'';
  const size=title.length>24?'is-long':title.length>17?'is-medium':'';
  return '<div class="mp8-identity-content"><div class="mp8-plate '+(idx>=0?'mp8-art':'mp8-text-only')+' '+(o.plate==='divine'?'is-divine':'')+'">'+(idx>=0?plateImage(o.plate):'')+'<span class="mp8-title-text '+size+'">'+esc(title.toUpperCase())+'</span></div></div>';
}
function updateHome(){
  read();
  const host=app?.querySelector('.premium-home .mp7-arena');
  const el=host?.querySelector(':scope > .mp7-identity');
  if(!el)return;
  const show=!!uid&&!!(selection.plate||selection.title);
  if(!show){el.hidden=true;return;}
  const switches=host.querySelector(':scope > .mp7-toggle');
  if(switches&&switches.nextElementSibling!==el)switches.insertAdjacentElement('afterend',el);
  const signature=JSON.stringify(selection);
  if(el.dataset.mp8Signature!==signature){el.innerHTML=markup(selection);el.dataset.mp8Signature=signature;}
  el.classList.add('mp8-home-identity');el.hidden=false;
}
window.mpM8SyncIdentity=updateHome;
window.mpM8OwnPlateMarkup=(member)=>{
  read();
  if(!uid||member?.user_id!==uid)return '';
  const content=markup(selection);
  return content?'<div class="mp8-club-identity">'+content+'</div>':'';
};
function schedule(){if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;updateHome();});}}
function close(){document.querySelector('.mp8-dialog-host')?.remove();open=false;}
function preview(){
  const host=document.querySelector('.mp8-dialog-host');if(!host)return;
  const box=host.querySelector('.mp8-preview');
  box.innerHTML=markup(draft)||'<p>Nessun titolo o targhetta selezionato.</p>';
}
function pickPlate(id){draft.plate=plates.some(p=>p[0]===id)?id:'';document.querySelectorAll('.mp8-plate-choice').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plate===draft.plate)));preview();}
function save(){
  if(!uid){alert('Apri il Club per recuperare il tuo account. Nessuna modifica effettuata.');return;}
  selection=valid(draft);
  try{localStorage.setItem(key+':'+uid,JSON.stringify(selection));}catch(e){alert('Salvataggio locale non disponibile.');return;}
  close();
  if(typeof setRoute==='function'&&typeof route!=='undefined'&&route!=='home')setRoute('home');
  requestAnimationFrame(()=>{updateHome();app?.querySelector('.mp7-arena')?.scrollIntoView({block:'start',behavior:'auto'});});
}
async function show(){
  close();await resolveUser();read();draft={...selection};
  const host=document.createElement('div');host.className='mp8-dialog-host';
  host.innerHTML='<section class="mp8-dialog" role="dialog" aria-modal="true" aria-label="Titoli e targhette"><header><div><small>MATCHPULSE / IDENTITÀ</small><h2>Titoli e targhette</h2></div><button type="button" class="mp8-close" aria-label="Chiudi">✕</button></header><p class="mp8-note">Anteprima gratuita sul dispositivo. Acquisti, ricompense e sincronizzazione saranno disponibili dopo l’attivazione del database. Non vengono spesi token.</p><div class="mp8-preview"></div><label>Titolo<select id="mp8-title-select"><option value="">Nessun titolo</option>'+titles.map(t=>'<option value="'+esc(t)+'" '+(t===draft.title?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label><div class="mp8-choice-head"><strong>Targhetta</strong><button class="mp8-plate-choice" type="button" data-plate="" aria-pressed="'+String(!draft.plate)+'">Nessuna</button></div><div class="mp8-choices">'+plates.map((p,i)=>'<button type="button" class="mp8-plate-choice" data-plate="'+p[0]+'" aria-pressed="'+String(draft.plate===p[0])+'"><div class="mp8-plate mp8-art">'+plateImage(p[0],true)+'</div><strong>'+esc(p[1])+'</strong><small>'+esc(p[2])+'</small></button>').join('')+'</div><button class="mp8-apply" type="button">APPLICA ANTEPRIMA SULLA HOME</button><button class="mp8-reset" type="button">RIMUOVI TITOLO E TARGHETTA</button></section>';
  document.body.append(host);open=true;
  host.querySelector('.mp8-close').onclick=close;
  host.querySelector('#mp8-title-select').onchange=e=>{draft.title=e.target.value;preview();};
  host.querySelectorAll('.mp8-plate-choice').forEach(b=>b.onclick=()=>pickPlate(b.dataset.plate));
  host.querySelector('.mp8-apply').onclick=save;
  host.querySelector('.mp8-reset').onclick=()=>{draft={plate:'',title:''};save();};
  host.addEventListener('click',e=>{if(e.target===host)close();});
  preview();host.querySelector('.mp8-close').focus({preventScroll:true});
}
window.mpM8OpenIdentity=()=>{void show().catch(e=>alert('Anteprima non disponibile: '+(e?.message||String(e))));};
window.mpM8IdentityInspect=()=>({version:'M8.2-HD-local',plates:plates.length,titles:titles.length,selected:{...selection},shared:false});
document.addEventListener('keydown',e=>{if(open&&e.key==='Escape')close();});
if(app)new MutationObserver(schedule).observe(app,{subtree:true,childList:true});
new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['data-mp7-home-view']});
void resolveUser().then(updateHome);
window.MP_M8_IDENTITY_READY=true;
})();

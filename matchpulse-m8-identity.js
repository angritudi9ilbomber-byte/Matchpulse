/* M8 Identity — server-owned titles, nameplates and Identity Pack. */
(function(){
'use strict';
if(window.MP_M8_IDENTITY_READY)return;
const app=document.getElementById('app'), db=()=>window.matchpulseSupabase;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plateIds=new Set(['classic','green','storm','violet','sakura','thunder','grandline','saiyan','nightcity','hyperdrive','divine','cosmic']);
const rarity={common:'Comune',rare:'Rara',epic:'Epica',legendary:'Leggendaria'};
const tiers=Object.keys(rarity);
let uid=null,state=null,inflight=null,epoch=0,mode='shop',draft={plate_id:null,title_id:null},lab={plate_id:null,title_id:null},busy=false,queued=false,lastRoute='',founderPlayers=[],founderItem='',reveal=null,detailId='';
const cat=()=>state?.catalog||[], item=id=>cat().find(x=>x.id===id), owned=id=>!!id&&(state?.owned||[]).includes(id);
function plateImage(id,lazy=false){
 const key=String(id||'').replace(/^plate_/,'');
 if(!plateIds.has(key))return '';
 return '<img class="mp8-plate-image" src="mp8-plates/'+key+'.webp?v=hd1" width="1100" height="320" alt="" decoding="async"'+(lazy?' loading="lazy"':'')+'>';
}
const completePair=eq=>!!(eq?.plate_id&&eq?.title_id);
const hasKind=kind=>cat().some(x=>x.kind===kind&&owned(x.id));
const canEquipPair=()=>hasKind('plate')&&hasKind('title');
const missingPair=()=>!hasKind('plate')?'Ti manca una targhetta.':!hasKind('title')?'Ti manca un titolo.':'Scegli un titolo e una targhetta.';
function markup(eq){
 const title=item(eq?.title_id)?.title||'', plate=plateImage(eq?.plate_id);
 if(!plate&&!title)return '';
 const size=title.length>24?'is-long':title.length>17?'is-medium':'';
 return '<div class="mp8-identity-content"><div class="mp8-plate '+(plate?'mp8-art':'mp8-text-only')+' '+(eq?.plate_id==='plate_divine'?'is-divine':'')+'">'+plate+'<span class="mp8-title-text '+size+'">'+esc(title.toUpperCase())+'</span></div></div>';
}
function currentRoute(){return typeof route==='string'?route:'';}
function updateHome(){
 const host=app?.querySelector('.premium-home .mp7-arena'),el=host?.querySelector(':scope > .mp7-identity');
 if(!el)return;
 const content=state&&uid&&completePair(state.equipped)?markup(state.equipped):'';
 if(!content){el.hidden=true;return;}
 const switches=host.querySelector(':scope > .mp7-toggle');
 if(switches&&switches.nextElementSibling!==el)switches.insertAdjacentElement('afterend',el);
 if(el.dataset.mp8Signature!==content){el.innerHTML=content;el.dataset.mp8Signature=content;}
 el.classList.add('mp8-home-identity');el.hidden=false;
}
window.mpM8SyncIdentity=updateHome;
window.mpM8OwnPlateMarkup=member=>{
 if(!state||!uid||!member?.user_id)return '';
 const eq=member.user_id===uid?state.equipped:state.club_equipped?.find(x=>x.user_id===member.user_id);
 const content=completePair(eq)?markup(eq):'';return content?'<div class="mp8-club-identity">'+content+'</div>':'';
};
window.mpM8Catalogue=()=>cat().map(x=>({...x}));
window.mpM8FounderProducts=()=>[...cat().filter(x=>x.kind==='plate').map(x=>({...x,type:'plate'})),...(state?.pack?[{...state.pack,type:'identity_pack',id:'identity_pack',title:'Identity Pack'}]:[])];
window.mpM8Label=id=>item(id)?.title||'Cosmetico identità';
window.mpM8Ready=()=>!!state;
window.mpM8IsFounder=()=>!!state?.admin;
window.mpM8RevealGift=async id=>{if(busy)return;await refresh({force:true,render:false});await show('detail',false,id);reveal=id;paint();};
async function rpc(name,args={}){
 if(!db())throw Error('Connessione non disponibile');
 const {data,error}=await db().rpc(name,args);if(error)throw error;return data;
}
async function refresh({render=true,quiet=false,force=false}={}){
 if(inflight){if(!force)return inflight;await inflight;}
 const version=++epoch;
 const task=(async()=>{
  try{
   const r=await db()?.auth?.getSession?.();if(r?.error)throw r.error;
   const next=r?.data?.session?.user?.id||null;
   if(version!==epoch)return false;
   if(next!==uid){uid=next;state=null;updateHome();mountStore();}
   if(!next)return false;
   const data=await rpc('mp_m8_state');
   if(version!==epoch||uid!==next)return false;
   if(!data||!Array.isArray(data.catalog)||!Array.isArray(data.owned))throw Error('Catalogo identità non disponibile');
   const prev=JSON.stringify([state?.equipped,state?.club_equipped,state?.catalog]);
   state=data;updateHome();mountStore();
   const changed=prev!==JSON.stringify([state.equipped,state.club_equipped,state.catalog]);
   if(changed&&currentRoute()==='locker')window.mpM7RerenderClub?.();
   if(render&&currentRoute()==='challenges')window.mpM1RefreshIdentityUI?.();
   return true;
  }catch(e){if(!quiet)console.warn('MatchPulse M8',e);return false;}
 })();
 inflight=task;
 try{return await task;}finally{if(inflight===task)inflight=null;}
}
window.mpM8Refresh=refresh;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{
 queued=false;updateHome();mountStore();const next=currentRoute();
 if(next!==lastRoute){lastRoute=next;if(['home','locker','store','challenges'].includes(next))void refresh({quiet:true});}
});}
function close(){document.querySelector('.mp8-dialog-host')?.remove();reveal=null;}
function host(){return document.querySelector('.mp8-dialog-host');}
function msg(s){const el=host()?.querySelector('.mp8-status');if(el)el.textContent=s;else if(s)alert(s);}
function opt(id,label,selected){return '<option value="'+esc(id||'')+'" '+(id===selected?'selected':'')+'>'+esc(label)+'</option>';}
function selectItems(kind,selected,all=false){return opt('','Nessuno',selected||'')+cat().filter(x=>x.kind===kind&&(all||owned(x.id))).map(x=>opt(x.id,x.title,selected)).join('');}
function card(x,action,label,disabled=false){
 return '<article class="mp8-item"><div class="mp8-item-art">'+(x.kind==='plate'?'<div class="mp8-plate mp8-art">'+plateImage(x.id,true)+'</div>':'<div class="mp8-title-sample">'+esc(x.title.toUpperCase())+'</div>')+'</div><strong>'+esc(x.title)+'</strong><small class="mp8-rarity '+esc(x.rarity)+'">'+esc(rarity[x.rarity]||x.rarity)+'</small><button type="button" class="mp8-action" data-action="'+action+'" data-id="'+esc(x.id)+'" '+(disabled?'disabled':'')+'>'+esc(label)+'</button></article>';
}
function packOdds(){
 const p=state?.pack;if(!p)return [];
 const w=tiers.map(r=>cat().some(x=>x.kind==='plate'&&x.shop_active&&x.rarity===r&&!owned(x.id))?Number(p[r+'_weight'])||0:0),sum=w.reduce((a,b)=>a+b,0);
 if(!sum)return [];
 const raw=w.map(v=>v*10000/sum),rounded=raw.map(Math.floor),rank=raw.map((v,i)=>[i,v-rounded[i]]).sort((a,b)=>b[1]-a[1]);
 for(let i=0;i<10000-rounded.reduce((a,b)=>a+b,0);){const missing=10000-rounded.reduce((a,b)=>a+b,0);for(let j=0;j<missing;j++)rounded[rank[j][0]]++;break;}
 return tiers.map((r,i)=>[r,rounded[i]/100]);
}
function packPanel(){
 const p=state?.pack,odds=packOdds();
 if(!p||!p.active)return '<p class="mp8-note">Identity Pack al momento non in vendita.</p>';
 return '<section class="mp8-pack"><div class="mp8-pack-visual mp8-pack-art">✦<span>IDENTITY</span><small>MATCHPULSE PACK</small></div><h3>Identity Pack</h3><p>Una targhetta non ancora posseduta. Rarità esaurite escluse.</p><div class="mp8-odds">'+odds.map(([r,v])=>'<span>'+rarity[r]+' <b>'+v.toLocaleString('it-IT',{maximumFractionDigits:2})+'%</b></span>').join('')+'</div><button class="mp8-apply" data-action="buy" data-id="identity_pack" '+(!odds.length?'disabled':'')+'>'+(odds.length?'ACQUISTA E APRI · '+p.price+' TOKEN':'PACCHETTO ESAURITO')+'</button></section>';
}
function shopPanel(){
 const visible=cat().filter(x=>x.shop_active||owned(x.id));
 return ['plate','title'].map(k=>'<h3>'+ (k==='plate'?'Targhette':'Titoli in vendita')+'</h3><div class="mp8-choices">'+visible.filter(x=>x.kind===k).map(x=>card(x,owned(x.id)?'inventory':'buy',owned(x.id)?'POSSEDUTO':x.price+' TOKEN')).join('')+'</div>'+(!visible.some(x=>x.kind===k)?'<p class="mp8-note">Nessun prodotto in vendita in questa categoria.</p>':'')).join('');
}
function inventoryPanel(){
 const allowed=canEquipPair();
 return '<p class="mp8-note">Per mostrare la tua identità devi possedere e selezionare sia un titolo sia una targhetta. Gli oggetti restano nel tuo inventario anche al cambio di stagione.</p><div class="mp8-preview">'+(completePair(draft)?markup(draft):'<p>Seleziona entrambi per vedere la combinazione.</p>')+'</div><label>Titolo<select id="mp8-title-select">'+selectItems('title',draft.title_id)+'</select></label><label>Targhetta<select id="mp8-plate-select">'+selectItems('plate',draft.plate_id)+'</select></label>'+(!allowed?'<p class="mp8-note">🔒 '+missingPair()+'</p>':'')+'<button class="mp8-apply" data-action="equip" '+(!allowed||!completePair(draft)?'disabled':'')+'>EQUIPAGGIA ENTRAMBI</button><button class="mp8-reset" data-action="clear" '+(!completePair(state?.equipped)?'disabled':'')+'>RIMUOVI ENTRAMBI</button><h3>I tuoi cosmetici · '+(state?.owned||[]).length+'</h3><div class="mp8-choices">'+cat().filter(x=>owned(x.id)).map(x=>card(x,'select',x.id===draft[x.kind+'_id']?'SELEZIONATO':'SELEZIONA')).join('')+'</div>';
}
function labPanel(){
 return '<p class="mp8-note">Solo anteprima nel laboratorio. Non modifica saldi, inventario o carta condivisa.</p><div class="mp8-preview">'+(markup(lab)||'<p>Scegli una targhetta e un titolo.</p>')+'</div><label>Titolo<select id="mp8-title-select">'+selectItems('title',lab.title_id,true)+'</select></label><label>Targhetta<select id="mp8-plate-select">'+selectItems('plate',lab.plate_id,true)+'</select></label><div class="mp8-choices">'+cat().filter(x=>x.kind==='plate').map(x=>card(x,'select','PROVA')).join('')+'</div>';
}
function founderPanel(){return '<p>La gestione è nel Centro Founder: Negozio per i prodotti, Titoli per creare e modificare.</p>';}

function storeItem(x,inv=false){
 const equipped=state?.equipped?.[x.kind+'_id']===x.id, mine=owned(x.id);
 const id=esc(x.id),kind=x.kind==='plate'?'Targhetta':'Titolo';
 const art=x.kind==='plate'?'<div class="mp8-plate mp8-art">'+plateImage(x.id,true)+'</div>':'<div class="mp8-title-sample">'+esc(x.title.toUpperCase())+'</div>';
 const action=inv?'<button class="mp6-action" data-mp8-inline="equip" data-id="'+id+'" '+(!equipped&&!canEquipPair()?'disabled':'')+'>'+(equipped?'RIMUOVI ENTRAMBI':canEquipPair()?'ABBINA ED EQUIPAGGIA':x.kind==='plate'?'MANCA IL TITOLO':'MANCA LA TARGHETTA')+'</button>':mine?'<button class="mp6-action mp6-owned" data-mp8-inline="inventory">GIÀ TUA ✓</button>':'<button class="mp6-action" data-mp8-inline="buy" data-id="'+id+'">ACQUISTA</button>';
 return '<article class="mp6-cosmetic mp6-tier-'+esc(x.rarity)+' mp8-inline-item"><div class="mp6-cosmetic-top"><div class="mp8-inline-art">'+art+'</div><span class="mp6-rarity-pill">'+esc(rarity[x.rarity]||x.rarity)+'</span></div><div class="mp6-cosmetic-copy"><small>'+kind.toUpperCase()+'</small><h4>'+esc(x.title)+'</h4><p>'+(inv?(equipped?'Equipaggiato':'Nel tuo inventario'):'Cosmetico permanente per la tua identità.')+'</p><div class="mp6-cosmetic-foot">'+(inv?'':'<b>✦ '+Number(x.price)+'</b>')+'<div class="mp6-cosmetic-buttons"><button class="mp6-action mp6-outline" data-mp8-inline="preview" data-id="'+id+'">ANTEPRIMA</button>'+action+'</div></div></div></article>';
}
function storePack(){
 const p=state?.pack;if(!p?.active)return '';
 const odds=packOdds();
 return '<article class="mp6-pack"><div class="mp6-pack-picture"><div class="mp8-pack-visual mp8-pack-art">✦<span>IDENTITY</span><small>MATCHPULSE PACK</small></div></div><div class="mp6-pack-info"><small>IDENTITÀ</small><h3>Identity Pack</h3><p>Una targhetta non ancora posseduta.</p><div class="mp6-odds">'+(odds.length?odds.map(([r,v])=>'<span>'+rarity[r]+' <b>'+v.toLocaleString('it-IT',{maximumFractionDigits:2})+'%</b></span>').join(''):'<span>POOL ESAURITO</span>')+'</div><div class="mp6-pack-footer"><b>✦ '+Number(p.price)+'</b><div class="mp6-pack-actions"><button class="mp6-action mp6-outline" data-mp8-inline="preview" data-id="identity_pack">ANTEPRIMA</button><button class="mp6-action" data-mp8-inline="buy" data-id="identity_pack" '+(!odds.length?'disabled':'')+'>'+(odds.length?'ACQUISTA E APRI':'ESAURITO')+'</button></div></div></div></article>';
}
function storeSection(kind,inv=false){
 const entries=cat().filter(x=>x.kind===kind&&(inv?owned(x.id):x.shop_active));
 if(!entries.length&&!inv)return '';
 const label=kind==='plate'?'TARGHETTE':'TITOLI';
 return '<section class="mp6-intro"><small>'+(inv?'INVENTARIO PERMANENTE':'IDENTITÀ / COSMETICI')+'</small><h3>'+label+'</h3><p>'+(inv?'I tuoi oggetti, conservati anche al cambio di stagione. Per equipaggiarli servono un titolo e una targhetta.':kind==='plate'?'Personalizza la cornice del tuo titolo.':'Personalizza il titolo sopra la tua carta.')+'</p><div class="mp6-showcase">'+entries.map(x=>storeItem(x,inv)).join('')+'</div>'+(!entries.length?'<p>Nessun oggetto posseduto.</p>':'')+'</section>';
}

function titlesCollection(){
 const all=cat().filter(x=>x.kind==='title');
 return '<section class="mp6-intro"><small>COLLEZIONE TITOLI</small><h3>TUTTI I TITOLI · '+all.filter(x=>owned(x.id)).length+'/'+all.length+'</h3><p>Acquista o sblocca i titoli con le sfide e i regali del Founder. Per equipaggiarne uno serve anche una targhetta.</p><div class="mp6-showcase">'+all.map(x=>owned(x.id)?storeItem(x,true):x.shop_active?storeItem(x,false):'<article class="mp6-cosmetic mp6-tier-'+esc(x.rarity)+' mp8-inline-item mp8-locked"><div class="mp6-cosmetic-top"><div class="mp8-inline-art"><div class="mp8-title-sample">'+esc(x.title.toUpperCase())+'</div></div><span class="mp6-rarity-pill">'+esc(rarity[x.rarity])+'</span></div><div class="mp6-cosmetic-copy"><small>TITOLO</small><h4>'+esc(x.title)+'</h4><p>🔒 Non ancora sbloccato</p></div></article>').join('')+'</div></section>';
}

function mountStore(){
 if(currentRoute()!=='store'||!app)return;
 for(const slot of app.querySelectorAll('[data-mp8-store]')){
  const tab=slot.dataset.mp8Store;
  const content=!state?'<p class="mp8-note">Catalogo identità non disponibile. <button class="mp6-action mp6-outline" data-mp8-inline="retry">RIPROVA</button></p>':tab==='packs'?storePack():tab==='plates'?storeSection('plate',false):tab==='titles'?storeSection('title',false)||'<p class="mp8-note">Nessun titolo attualmente in vendita.</p>':storeSection('plate',true)+titlesCollection();
  if(slot._mp8Content!==content){slot._mp8Content=content;slot.innerHTML=content;}
  slot.querySelectorAll('button[data-mp8-inline="equip"],button[data-mp8-inline="buy"]').forEach(b=>{if(!b.dataset.mp8OriginalDisabled)b.dataset.mp8OriginalDisabled=b.disabled?'yes':'no';b.disabled=busy||b.dataset.mp8OriginalDisabled==='yes';});
 }
}
window.mpM8MountStore=mountStore;
function detailPanel(){
 if(detailId==='identity_pack')return packPanel();
 const x=item(detailId);if(!x)return '<p>Articolo non disponibile.</p>';
 const eq={...state?.equipped,[x.kind+'_id']:x.id};
 return '<div class="mp8-preview">'+markup(eq)+'</div><h3>'+esc(x.title)+'</h3><p class="mp8-note">'+esc(rarity[x.rarity]||x.rarity)+' · '+(owned(x.id)?'Già nel tuo inventario':x.shop_active?x.price+' token':'Non in vendita')+'</p>'+(owned(x.id)?'<button class="mp8-apply" data-action="inventory">VAI ALL’INVENTARIO</button>':x.shop_active?'<button class="mp8-apply" data-action="buy" data-id="'+esc(x.id)+'">ACQUISTA · '+x.price+' TOKEN</button>':'');
}
async function inlineEquip(id){
 if(busy||!owned(id))return;
 const x=item(id);if(!x)return;
 const eq=state?.equipped||{};
 if(completePair(eq)&&eq[x.kind+'_id']===id){
  if(!confirm('Rimuovere titolo e targhetta dalla carta?'))return;
  busy=true;mountStore();
  try{await rpc('mp_m8_equip',{p_plate:null,p_title:null});await refresh({force:true,render:false});}
  catch(e){alert(e?.message||String(e));}finally{busy=false;mountStore();}
  return;
 }
 if(!canEquipPair()){alert(missingPair());return;}
 await show('inventory',true);
 if(!host()||!owned(id))return;
 draft[x.kind+'_id']=id;
 const other=x.kind==='plate'?'title':'plate';
 if(!draft[other+'_id']){const options=cat().filter(c=>c.kind===other&&owned(c.id));if(options.length===1)draft[other+'_id']=options[0].id;}
 paint();
}
app?.addEventListener('click',async e=>{
 const b=e.target.closest?.('[data-mp8-inline]');if(!b||busy)return;
 const action=b.dataset.mp8Inline,id=b.dataset.id;
 if(action==='retry'){await refresh({force:true});mountStore();}
 else if(action==='inventory')window.mpM2Tab?.('inventory');
 else if(action==='equip')void inlineEquip(id);
 else if(action==='preview'||action==='buy'){await show('detail',true,id);if(action==='buy'&&host()&&detailId===id)void buy(id);}
});

function paint(){
 const h=host();if(!h)return;
 const section=h.querySelector('.mp8-body'),nav=h.querySelector('.mp8-tabs');
 const tabs=[['shop','Negozio'],['packs','Pacchetti'],['inventory','Inventario']];
 if(state?.admin)tabs.push(['lab','Lab']);
 nav.hidden=mode==='founder'||mode==='detail';nav.innerHTML=tabs.map(([id,label])=>'<button data-action="tab" data-id="'+id+'" aria-pressed="'+(mode===id)+'">'+label+'</button>').join('');
 if(!state){section.innerHTML='<p class="mp8-note">Identità non disponibile. Riprova dopo aver verificato la connessione.</p><button class="mp8-apply" data-action="retry">RIPROVA</button>';return;}
 if(reveal){const x=item(reveal);section.innerHTML='<section class="mp8-reveal"><small>NUOVO COSMETICO</small><div class="mp8-preview">'+(x?.kind==='plate'?markup({plate_id:x.id}):markup({title_id:x?.id}))+'</div><h3>'+esc(x?.title||'Cosmetico ottenuto')+'</h3><p>'+esc(rarity[x?.rarity]||'')+'</p><button class="mp8-apply" data-action="inventory">VAI ALL’INVENTARIO</button></section>';return;}
 section.innerHTML=mode==='detail'?detailPanel():mode==='founder'?founderPanel():mode==='lab'?labPanel():mode==='inventory'?inventoryPanel():mode==='packs'?packPanel():shopPanel();
 if(busy)h.querySelectorAll('button:not(.mp8-close)').forEach(x=>x.disabled=true);
}
async function run(fn){
 if(busy)return;busy=true;mountStore();const h=host();h?.querySelectorAll('button:not(.mp8-close)').forEach(x=>x.disabled=true);msg('Operazione in corso…');
 try{await fn();if(host()===h){msg('Operazione completata.');}}
 catch(e){msg(e?.message||String(e));}
 finally{busy=false;mountStore();if(host()===h)paint();}
}
function requestId(product){
 const key='matchpulse_m8_pending:'+uid+':'+product;
 let id;try{id=localStorage.getItem(key);}catch{}
 if(!id){id=crypto.randomUUID();try{localStorage.setItem(key,id);}catch{}}
 return {id,done:()=>{try{localStorage.removeItem(key);}catch{}}};
}
async function buy(product){
 const x=product==='identity_pack'?state?.pack:item(product);
 if(!x||!(x.shop_active||x.active)||product!=='identity_pack'&&owned(product))return;
 if(!confirm('Confermi '+(product==='identity_pack'?'Identity Pack':x.title)+' per '+x.price+' token?'))return;
 await run(async()=>{
  const pending=requestId(product);
  const result=await rpc('mp_m8_buy',{p_product:product,p_request:pending.id});
  if(!result?.item_id)throw Error('Risposta acquisto non valida. Riprova.');
  pending.done();reveal=result.item_id;
  await refresh({force:true,render:false});
  window.mpM2AfterWalletChange?.();void window.mpM1RefreshWallet?.();
  msg('Acquisto salvato sul server.');
 });
}
function switchTab(id){if(id==='founder'&&!state?.admin)return;mode=id;reveal=null;if(id==='inventory')draft={...state?.equipped};if(id==='lab')lab={...state?.equipped};paint();}
async function equip(clear=false){
 if(clear)draft={plate_id:null,title_id:null};
 else if(!completePair(draft)||!owned(draft.plate_id)||!owned(draft.title_id)){msg(missingPair());return;}
 await run(async()=>{await rpc('mp_m8_equip',{p_plate:draft.plate_id||null,p_title:draft.title_id||null});await refresh({force:true,render:false});draft={...state?.equipped};updateHome();msg('Equipaggiamento sincronizzato.');});
}
async function openBonus(id){
 if(!state?.bonus?.some(x=>x.id===id))return;
 if(!confirm('Aprire gratuitamente l’Identity Pack vinto?'))return;
 await show('packs',false);
 await run(async()=>{const r=await rpc('mp_m8_open_bonus',{p_id:id});reveal=r?.item_id||null;await refresh({force:true,render:false});window.mpM1RefreshIdentityUI?.();});
}
window.mpM8OpenBonus=id=>void openBonus(id);
window.mpM8BonusMarkup=()=>{
 const list=state?.bonus||[];if(!list.length)return '';
 return '<section class="mp-m1-bonus"><h3>🎁 IDENTITY PACK VINTI · '+list.length+'</h3>'+list.map(x=>'<div class="mp-m1-bonus-item"><span class="mp-m1-pack-ico" aria-hidden="true">📦</span><strong>Identity Pack</strong><button type="button" onclick="mpM8OpenBonus(\''+esc(x.id)+'\')">APRI GRATIS</button></div>').join('')+'</section>';
};
async function submit(e){
 e.preventDefault();const f=e.target,data=new FormData(f);
 if(!state?.admin)return;
 if(f.id==='mp8-item-form'){
  if(!f.reportValidity())return;
  await run(async()=>{founderItem=await rpc('mp_m8_founder_item',{p_id:founderItem||null,p_title:String(data.get('title')||'').trim(),p_rarity:data.get('rarity'),p_price:Number(data.get('price')),p_active:data.has('active')});await refresh({force:true,render:false});msg('Prodotto salvato.');});
 }else if(f.id==='mp8-grant-form'){
  if(!f.reportValidity()||!confirm('Assegnare questo cosmetico gratuitamente al giocatore selezionato?'))return;
  await run(async()=>{await rpc('mp_m8_founder_grant',{p_user:data.get('user'),p_item:data.get('item')});await refresh({force:true,render:false});msg('Premio assegnato.');});
 }else if(f.id==='mp8-pack-form'){
  if(!f.reportValidity())return;
  const w=tiers.map(r=>Math.round(Number(data.get(r))*100));
  if(w.reduce((a,b)=>a+b,0)!==10000){msg('Le percentuali devono sommare esattamente a 100%.');return;}
  if(!confirm('Salvare prezzo, disponibilità e probabilità per tutti?'))return;
  await run(async()=>{await rpc('mp_m8_founder_pack',{p_price:Number(data.get('price')),p_active:data.has('active'),p_common:w[0],p_rare:w[1],p_epic:w[2],p_legendary:w[3]});await refresh({force:true,render:false});msg('Identity Pack aggiornato.');});
 }
}
async function show(next='shop',load=true,product=''){
 if(busy)return;
 close();mode=next;reveal=null;detailId=product;
 const h=document.createElement('div');h.className='mp8-dialog-host';
 h.innerHTML='<section class="mp8-dialog" role="dialog" aria-modal="true" aria-label="Identità MatchPulse"><header><div><small>MATCHPULSE / IDENTITÀ</small><h2>'+ (next==='founder'?'Gestione identità':'Titoli e targhette')+'</h2></div><button type="button" class="mp8-close" aria-label="Chiudi">✕</button></header><nav class="mp8-tabs" aria-label="Sezioni identità"></nav><p class="mp8-status" role="status" aria-live="polite"></p><div class="mp8-body"><p>Caricamento…</p></div></section>';
 document.body.append(h);
 h.querySelector('.mp8-close').onclick=()=>{if(!busy)close();};
 h.addEventListener('click',e=>{
  if(e.target===h){if(!busy)close();return;}
  const b=e.target.closest('button[data-action]');if(!b||busy)return;
  const {action,id}=b.dataset;
  if(action==='tab')switchTab(id);
  else if(action==='retry')void show(mode,true,detailId);
  else if(action==='buy')void buy(id);
  else if(action==='inventory'){if(currentRoute()==='store'){close();window.mpM2Tab?.('inventory');}else switchTab('inventory');}
  else if(action==='equip')void equip();
  else if(action==='clear')void equip(true);
  else if(action==='select'){const x=item(id);if(x&&(mode==='lab'||owned(id))){const q=mode==='lab'?lab:draft;q[x.kind+'_id']=id;paint();}}
 });
 h.addEventListener('change',e=>{
  const id=e.target.id;if(id==='mp8-founder-item'){founderItem=e.target.value;paint();return;}
  if(id==='mp8-title-select'||id==='mp8-plate-select'){const q=mode==='lab'?lab:draft;q[id==='mp8-title-select'?'title_id':'plate_id']=e.target.value||null;if(mode==='inventory'){paint();}else{const preview=h.querySelector('.mp8-preview');if(preview)preview.innerHTML=markup(q)||'<p>Nessun cosmetico selezionato.</p>';}}
 });
 h.addEventListener('submit',e=>void submit(e));
 if(load){const ok=await refresh({force:true,render:false});if(!ok)msg('Impossibile aggiornare il catalogo. Riprova.');}
 if(host()!==h)return;
 draft={...state?.equipped};lab={...state?.equipped};paint();h.querySelector('.mp8-close').focus({preventScroll:true});
}
window.mpM8OpenIdentity=(next='shop')=>void show(next);
window.mpM8OpenFounder=players=>{
 founderPlayers=Array.isArray(players)?players.filter(x=>x.id).map(x=>({id:x.id,name:x.name||'Giocatore'})):[];
 founderItem='';void show('founder');
};
window.mpM8IdentityInspect=()=>({version:'M8.3-live',ready:!!state,catalogue:cat().length,owned:state?.owned?.length||0,equipped:{...state?.equipped},shared:true});
document.addEventListener('keydown',e=>{if(host()&&e.key==='Escape'&&!busy)close();});
if(app)new MutationObserver(schedule).observe(app,{subtree:true,childList:true});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refresh({quiet:true});});
window.addEventListener('focus',()=>void refresh({quiet:true}));
db()?.auth?.onAuthStateChange?.((_event,session)=>{const next=session?.user?.id||null;if(next!==uid){epoch++;state=null;uid=next;close();updateHome();mountStore();setTimeout(()=>void refresh({force:true,quiet:true}),0);}});
setInterval(()=>{if(document.visibilityState==='visible'&&currentRoute()==='locker')void refresh({quiet:true});},30000);
void refresh({quiet:true});window.MP_M8_IDENTITY_READY=true;
})();

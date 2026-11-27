/* MatchPulse Founder gifts — separate from game engine. */
(function(){
'use strict';
if(window.MP_GIFTS_READY)return;
const app=document.getElementById('app'),db=()=>window.matchpulseSupabase;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opt=(id,label,selected)=>'<option value="'+esc(id)+'" '+(id===selected?'selected':'')+'>'+esc(label)+'</option>';
const kinds=[['skin','Skin e decorazioni'],['emblem','Emblemi'],['plate','Targhette'],['title','Titoli'],['pack','Pacchetti']];
const emblems=new Set(['op_straw','db_kame','cp_night','f1_grid']);
let uid=null,gifts=[],ready=false,loading=null,busy=false,queued=false,lastRoute='',draft={user:'',category:'skin',product:''},notice='',pending=null;
const current=()=>typeof route==='string'?route:'';
async function rpc(name,args={}){if(!db())throw Error('Connessione non disponibile');const {data,error}=await db().rpc(name,args);if(error)throw error;return data;}
function products(kind){
 const context=window.mpM1GiftContext?.()||{},all=context.products||[];
 if(kind==='skin'||kind==='emblem')return all.filter(x=>x.type==='skin'&&emblems.has(x.id)===(kind==='emblem'));
 if(kind==='pack')return [...all.filter(x=>x.type==='pack'),{id:'identity_pack',title:'Identity Pack'}];
 return (window.mpM8Catalogue?.()||[]).filter(x=>x.kind===kind);
}
function mountForm(){
 const slot=document.getElementById('mp9GiftForm');if(!slot||slot.dataset.mounted==='1')return;
 const people=window.mpM1GiftContext?.()?.players||[];
 if(!people.length)return;
 slot.dataset.mounted='1';
 slot.innerHTML='<form class="mp8-admin-section"><label>Giocatore<select name="user" required>'+opt('','Seleziona giocatore',draft.user)+people.map(x=>opt(x.id,x.name,draft.user)).join('')+'</select></label><label>Categoria<select name="category">'+kinds.map(([id,n])=>opt(id,n,draft.category)).join('')+'</select></label><label>Oggetto<select name="product" required></select></label><button class="mp8-apply" type="submit">CONSEGNA GRATIS</button><p class="mp8-note">Il regalo compare nell’inventario. I pacchetti restano da aprire. Notifica sui dispositivi abilitati.</p><p class="mp8-status" role="status">'+esc(notice)+'</p></form>';
 const f=slot.querySelector('form'),select=f.elements.product;
 const fill=()=>{select.innerHTML=opt('','Seleziona oggetto',draft.product)+products(draft.category).map(x=>opt(x.id,x.title,draft.product)).join('');};
 fill();
 f.addEventListener('change',e=>{draft.user=f.elements.user.value;if(e.target===f.elements.category){draft.category=e.target.value;draft.product='';fill();}else draft.product=select.value;});
 f.addEventListener('submit',async e=>{
  e.preventDefault();if(busy||!f.reportValidity())return;
  const category=f.elements.category.value,x=products(category).find(x=>x.id===select.value),person=people.find(x=>x.id===f.elements.user.value);
  if(!x||!person)return;
  if(!confirm('Consegnare gratis '+x.title+' a '+person.name+'?'))return;
  const kind=category==='pack'?'pack':category==='skin'||category==='emblem'?'skin':'identity',sig=[person.id,kind,x.id].join('|'),key='mp_gift_pending:'+uid+':'+sig;
  let request;try{request=localStorage.getItem(key);}catch{}
  if(!request){request=pending?.sig===sig?pending.request:crypto.randomUUID();try{localStorage.setItem(key,request);}catch{}}
  pending={sig,request};busy=true;const b=f.querySelector('button'),status=f.querySelector('.mp8-status');b.disabled=true;status.textContent='Consegna in corso…';
  try{
   const r=await rpc('mp_founder_gift',{p_user:person.id,p_kind:kind,p_product:x.id,p_request:request});
   try{localStorage.removeItem(key);}catch{}pending=null;
   notice='Regalo consegnato a '+person.name+'. '+(r.replayed?'Consegna già registrata.':r.push_queued?'Notifica accodata per '+r.push_queued+' dispositivo/i.':'Nessuna notifica push accodata; regalo disponibile nell’inventario.');
   status.textContent=notice;draft.product='';select.value='';
   await refresh();void window.mpM8Refresh?.({force:true,render:false});window.mpM2AfterWalletChange?.();
  }catch(e){notice=e?.message||String(e);status.textContent=notice;}
  finally{busy=false;b.disabled=false;mount();}
 });
}
function giftMarkup(){
 if(!ready)return '<p class="mp8-note">Caricamento regali… <button class="mp6-action mp6-outline" data-mp9="retry">RIPROVA</button></p>';
 const unopened=gifts.filter(g=>g.kind==='pack'&&!g.opened_at),recent=gifts.filter(g=>g.kind!=='pack'||g.opened_at);
 return '<section class="mp6-intro mp9-gift-list"><small>CONSEGNE FOUNDER</small><h3>REGALI RICEVUTI</h3><p>'+(gifts.length?'I cosmetici sono già nell’inventario. Apri qui i pacchetti regalati.':'Nessun regalo ricevuto.')+'</p>'+unopened.map(g=>'<div class="mp6-equipped-summary"><span>🎁 <b>'+esc(g.product_name)+'</b>Pacchetto sigillato</span><button data-mp9="open" data-id="'+esc(g.id)+'">APRI GRATIS</button></div>').join('')+recent.slice(0,12).map(g=>'<div class="mp6-equipped-summary"><span>🎁 <b>'+esc(g.product_name)+'</b>'+(g.kind==='pack'?'Pacchetto aperto':'Consegnato nell’inventario')+'</span><small>'+(!g.seen_at?'NUOVO':'✓')+'</small></div>').join('')+(gifts.some(g=>!g.seen_at)?'<button class="mp6-action mp6-outline" data-mp9="seen">SEGNA COME LETTI</button>':'')+'</section>';
}
function mount(){
 mountForm();
 for(const slot of app?.querySelectorAll('[data-mp9-gifts]')||[]){const content=giftMarkup();if(slot._giftMarkup!==content){slot._giftMarkup=content;slot.innerHTML=content;}slot.querySelectorAll('button[data-mp9="open"]').forEach(b=>b.disabled=busy);}
 const home=app?.querySelector('.premium-home'),n=gifts.filter(g=>!g.seen_at).length;
 if(!home)return;let el=home.querySelector('.mp9-gift-notice');
 if(!n){el?.remove();return;}
 if(!el){el=document.createElement('button');el.className='mp9-gift-notice';el.type='button';el.dataset.mp9='inventory';home.prepend(el);}
 const label='🎁 Hai '+n+' '+(n===1?'nuovo regalo':'nuovi regali')+' dal Founder · Vai all’inventario';
 if(el.textContent!==label)el.textContent=label;
}
async function refresh(){
 if(loading)return loading;
 loading=(async()=>{try{
 const session=await db()?.auth?.getSession?.();const next=session?.data?.session?.user?.id||null;
 if(next!==uid){uid=next;gifts=[];ready=false;draft={user:'',category:'skin',product:''};notice='';}
 if(!uid)return;
 const data=await rpc('mp_gifts_state');if(!Array.isArray(data))throw Error('Regali non disponibili');
 const old=JSON.stringify(gifts);gifts=data;ready=true;
 if(old!==JSON.stringify(gifts)){void window.mpM8Refresh?.({force:true,render:false});if(current()==='store')window.mpM2AfterWalletChange?.();}
 }catch(e){console.warn('MatchPulse regali',e);}finally{mount();}})();
 try{await loading;}finally{loading=null;}
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount();const r=current();if(r!==lastRoute){lastRoute=r;void refresh();}});}
function inventory(){
 if(typeof setRoute==='function'&&current()!=='store')setRoute('store');
 window.mpM2Tab?.('inventory');void refresh();
 requestAnimationFrame(()=>app?.querySelector('.mp9-gift-list')?.scrollIntoView({block:'start'}));
}
async function openGift(id){
 if(busy||!gifts.some(g=>g.id===id&&g.kind==='pack'&&!g.opened_at))return;
 if(!confirm('Aprire gratuitamente questo pacchetto?'))return;
 busy=true;mount();
 try{
 const r=await rpc('mp_gift_open',{p_id:id});await refresh();window.mpM2AfterWalletChange?.();
 if(r.pack_id==='identity_pack')await window.mpM8RevealGift?.(r.item_id);
 else if(window.mpM2RevealWonPack)await window.mpM2RevealWonPack({skin_id:r.item_id,pack_id:r.pack_id});
 else alert('Premio ricevuto: lo trovi nell’inventario.');
 }catch(e){alert(e?.message||String(e));}finally{busy=false;mount();}
}
app?.addEventListener('click',async e=>{const b=e.target.closest?.('[data-mp9]');if(!b)return;const action=b.dataset.mp9;
 if(action==='inventory')inventory();
 else if(action==='open')void openGift(b.dataset.id);
 else if(action==='retry')void refresh();
 else if(action==='seen'&&!busy){try{await rpc('mp_gifts_seen');await refresh();}catch(e){alert(e?.message||String(e));}}
});
navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='MATCHPULSE_OPEN_GIFTS')inventory();});
const url=new URL(location.href);
if(url.searchParams.get('mpOpen')==='gifts'){url.searchParams.delete('mpOpen');history.replaceState({},document.title,url.pathname+url.search+url.hash);setTimeout(inventory,700);}
if(app)new MutationObserver(schedule).observe(app,{subtree:true,childList:true});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refresh();});
window.addEventListener('focus',()=>void refresh());
db()?.auth?.onAuthStateChange?.((_event,s)=>{if((s?.user?.id||null)!==uid){uid=null;gifts=[];ready=false;mount();setTimeout(()=>void refresh(),0);}});
setInterval(()=>{if(document.visibilityState==='visible')void refresh();},30000);
window.MP_GIFTS_READY=true;void refresh();schedule();
})();

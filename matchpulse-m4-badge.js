/* MatchPulse M4.0 — slot emblema indipendente, senza riscrivere M2/M3/V8.
 * Precondizioni: JS M2/M3/B3 caricato e SQL M4 eseguito.
 * La simulazione Founder NON invia scritture al database.
 */
(function(){
 'use strict';
 if(window.MP_M4_BADGE_READY)return;
 const BADGES=Object.freeze({
   op_straw:{slug:'op-straw',title:'Cappello di Paglia',file:'onepiece.png'},
   db_kame:{slug:'db-kame',title:'Sfera del Drago',file:'dragonball.png'},
   cp_night:{slug:'cp-night',title:'Impianto ottico',file:'cyberpunk.png'},
   f1_grid:{slug:'f1-grid',title:'Casco da pilota',file:'formula1.png'}
 });
 const BY_SLUG=Object.fromEntries(Object.entries(BADGES).map(([id,b])=>[b.slug,id]));
 const app=document.getElementById('app');
 const state={userId:null,emblemId:null,ready:false,busy:false,error:'',lastLoad:0,
   refreshing:null,clubBadges:new Map(),clubLastLoad:0,clubLoading:null,queued:false};
 const ESC=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const season=()=>window.mpM3Boot?.currentSeason?.()||(()=>{
   const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
   const y=Number(p.year)-(Number(p.month)<9?1:0);return y+'-'+(y+1);
 })();
 const db=()=>typeof matchpulseSupabase!=='undefined'?matchpulseSupabase:null;
 const routeNow=()=>typeof route==='string'?route:'';
 const file=id=>`mp-m4-art/${BADGES[id].file}?v=20261112-m4`;
 const isPromo=card=>Boolean(card.closest('.mp-promo-card,.mp-promo-v3-card,[data-promo-card="true"]'))||card.dataset.promoCard==='true';
 function setBadge(card,id){
   if(!card||!card.classList.contains('player-card')||isPromo(card))return;
   if(!BADGES[id]){
     card.querySelector(':scope > .mp-m4-medallion')?.remove();
     card.removeAttribute('data-mp4-emblem');return;
   }
   const cur=card.querySelector(':scope > .mp-m4-medallion');
   if(cur?.dataset.skinId===id)return;
   cur?.remove();
   const badge=document.createElement('span');badge.className='mp-m4-medallion';
   badge.dataset.skinId=id;badge.setAttribute('aria-hidden','true');
   const image=document.createElement('img');image.src=file(id);image.alt='';image.decoding='async';
   badge.appendChild(image);card.appendChild(badge);card.dataset.mp4Emblem=id;
 }
 function holderUserId(el){
   for(let n=el;n&&n!==document.body;n=n.parentElement){
     if(n.dataset?.m3UserId)return n.dataset.m3UserId;
     if(n.dataset?.mpSharedUser)return n.dataset.mpSharedUser;
     if(n.getAttribute){const m=(n.getAttribute('onclick')||'').match(/mpOpenClubMember\(\s*['"]([a-f0-9-]{36})['"]/i);
       if(m)return m[1];}
   }
   const modal=document.getElementById('mpClubMemberModal');
   if(modal?.contains(el))return modal.dataset.mpSharedUser||null;
   return null;
 }
 function applyAll(){
   document.querySelectorAll('.player-card').forEach(card=>{
     if(card.closest('.mp-m4-preview-host,.mp6-preview-overlay'))return;
     if(card.closest('.mp-m2-product,.mp-m2-reveal'))return;
     const insideClub=Boolean(card.closest('.mp-club-page,#mpClubMemberModal,.mp-club-showcase-card,.mp-club-member-card,.mp-club-home-card'));
     let id=null;
     if(insideClub){const uid=holderUserId(card);if(uid)id=state.clubBadges.get(uid)||(uid===state.userId?state.emblemId:null);
       else return; // Non attribuire al membro sbagliato l'emblema del proprietario.
     }else id=state.emblemId;
     setBadge(card,id);
   });
 }
 async function refresh(force=false){
   if(state.refreshing)return state.refreshing;
   if(!force&&state.ready&&Date.now()-state.lastLoad<30000)return;
   state.refreshing=(async()=>{
     try{
       if(!db()||typeof mpEnsureClubAuth!=='function')throw Error('Accesso al Club non disponibile');
       const user=await mpEnsureClubAuth();if(!user?.id)throw Error('Sessione non disponibile');
       const {data,error}=await db().from('matchpulse_m4_equipped_emblems').select('skin_id')
         .eq('user_id',user.id).eq('season_id',season()).maybeSingle();
       if(error)throw error;
       state.userId=user.id;state.emblemId=BADGES[data?.skin_id]?data.skin_id:null;
       state.ready=true;state.error='';state.lastLoad=Date.now();
     }catch(e){state.error=String(e?.message||e);state.ready=false;
       console.warn('MatchPulse M4 — slot emblema non disponibile:',state.error);
     }finally{state.refreshing=null;schedule();}
   })();return state.refreshing;
 }
 async function fetchClubBadges(force=false){
   if(state.clubLoading||!db()||typeof mpGetMyClub!=='function')return;
   if(!force&&Date.now()-state.clubLastLoad<60000)return;
   state.clubLoading=(async()=>{
     try{
       const club=await mpGetMyClub();if(!club?.club_id){state.clubBadges.clear();return;}
       const {data,error}=await db().rpc('mp_m4_get_club_emblems',{p_club_id:String(club.club_id)});
       if(error)throw error;
       state.clubBadges=new Map((data||[]).filter(x=>x.season_id===season()&&BADGES[x.skin_id])
         .map(x=>[x.user_id,x.skin_id]));state.clubLastLoad=Date.now();
     }catch(e){console.warn('M4 Club emblemi:',e?.message||e);}
     finally{state.clubLoading=null;schedule();}
   })();return state.clubLoading;
 }
 function buttonFor(product){return product.querySelector('.mp-m2-buy-row button.mp-m2-action');}
 function productId(product){
   if(product.dataset.bSlug&&BY_SLUG[product.dataset.bSlug])return BY_SLUG[product.dataset.bSlug];
   const art=product.querySelector('.mp-m2-art');if(!art)return null;
   for(const cl of art.classList){if(cl.startsWith('mp-m2-art-')){
     const id=BY_SLUG[cl.slice('mp-m2-art-'.length)];if(id)return id;
   }}return null;
 }
 function refreshInventoryUI(){
   const page=app?.querySelector('.mp-m2-page');if(!page)return;
   const oldHead=page.querySelector('.mp-m2-inventory-head');
   if(!oldHead)return; // Il tab 'Estetiche' resta invariato.
   let row=page.querySelector('.mp-m4-inventory-slot');
   if(!row){row=document.createElement('div');row.className='mp-m4-inventory-slot';
     oldHead.insertAdjacentElement('afterend',row);}
   const title=state.emblemId?BADGES[state.emblemId].title:'Nessuno';
   const html=`<strong>STEMMA ESTERNO</strong><span>${ESC(title)}</span>`+
     `<button type="button" onclick="mpM4Equip('')" ${!state.emblemId||state.busy?'disabled':''}>RIMUOVI STEMMA</button>`;
   const renderKey=String(state.emblemId||'none')+'|'+state.busy+'|'+state.ready;
   if(row.dataset.renderKey!==renderKey){row.innerHTML=html;row.dataset.renderKey=renderKey;}
   if(state.error){row.dataset.status='error';row.title='Slot emblema: '+state.error;}
   else {delete row.dataset.status;row.removeAttribute('title');}
   page.querySelectorAll('.mp-m2-product').forEach(product=>{
     const id=productId(product);if(!id)return;
     const b=buttonFor(product);if(!b)return;
     const action=`mpM4Equip('${id}')`,on=state.emblemId===id;
     if(b.getAttribute('onclick')!==action)b.setAttribute('onclick',action);
     const label=on?'EQUIPAGGIATO ✓':'EQUIPAGGIA STEMMA';
     if(b.textContent!==label)b.textContent=label;
     b.disabled=state.busy||!state.ready;
     b.classList.toggle('is-equipped',on);
   });
 }
 function founderButton(){
   const lab=document.querySelector('.mp-b-founder-lab');if(!lab||lab.querySelector('.mp-m4-founder-action'))return;
   const target=lab.querySelector('.mp-b-lab-controls');if(!target)return;
   const btn=document.createElement('button');btn.className='mp-m4-founder-action';
   btn.type='button';btn.textContent='PROVA EMBLEMA ESTERNO';btn.addEventListener('click',()=>{
     const selected=document.getElementById('mpBFounderSelect')?.value;
     window.mpM4Preview(BADGES[selected]?selected:'op_straw');
   });target.appendChild(btn);
 }
 let priorFocus=null;
 function closePreview(){const host=document.querySelector('.mp-m4-preview-host');host?.remove();
   if(priorFocus?.isConnected)priorFocus.focus();priorFocus=null;}
 function preview(id){
   if(!BADGES[id])return;
   closePreview();priorFocus=document.activeElement;
   let source=document.querySelector('.premium-home .player-card');
   let card;
   if(source){card=source.cloneNode(true);card.querySelectorAll('.mp-m4-medallion,.mp-b-card-layer').forEach(n=>n.remove());
     card.removeAttribute('data-mp4-emblem');}
   else {card=document.createElement('article');card.className='player-card card-gold';
     card.style.cssText='width:270px;min-height:390px;position:relative;background:linear-gradient(130deg,#c0a85a,#ece7c6);border-radius:18px;color:#171223;padding:35px 20px';
     card.innerHTML='<div class="player-top"><strong class="card-ovr" style="font-size:48px">78</strong><span>ATT</span></div><h3 style="margin-top:170px">PLAYER</h3><div class="player-stats">PAC 80 · SHO 76 · PAS 81</div>';}
   const host=document.createElement('div');host.className='mp-m4-preview-host';
   const shade=document.createElement('div');shade.className='mp-m4-preview-shade';shade.onclick=closePreview;
   const dialog=document.createElement('div');dialog.className='mp-m4-preview-dialog';dialog.setAttribute('role','dialog');
   dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Anteprima medaglione');
   dialog.innerHTML=`<header><strong>FOUNDER · SLOT EMBLEMA</strong><button type="button" aria-label="Chiudi anteprima">✕</button></header>
     <h3>${ESC(BADGES[id].title)}</h3><div class="mp-m4-card-stage"></div>
     <p class="mp-m4-preview-note">Anteprima gratuita: nessuna modifica a token, inventario o equipaggiamento reale.</p>`;
   dialog.querySelector('button').onclick=closePreview;
   host.append(shade,dialog);document.body.appendChild(host);
   dialog.querySelector('.mp-m4-card-stage').append(card);setBadge(card,id);
   dialog.querySelector('button').focus();
 }
 function schedule(){if(state.queued)return;state.queued=true;requestAnimationFrame(()=>{
   state.queued=false;applyAll();refreshInventoryUI();founderButton();
   if(routeNow()==='locker')void fetchClubBadges();
 });}
 let lastRoute='';
 const observer=new MutationObserver(mutations=>{
   if(mutations.some(m=>m.type==='childList'&&(m.addedNodes.length||m.removedNodes.length)))schedule();
   const route=routeNow();if(route!==lastRoute){lastRoute=route;
     if(route==='home'||route==='store')void refresh();
     if(route==='locker')void fetchClubBadges(true);
   }
 });
 observer.observe(document.body,{childList:true,subtree:true});
 window.mpM4Equip=async id=>{
   if(state.busy)return;
   if(id&&!BADGES[id])return;
   if(!state.ready){await refresh(true);if(!state.ready){alert('Slot emblema non disponibile: controlla che il SQL M4 sia installato.');return;}}
   state.busy=true;schedule();
   try{
     const {error}=await db().rpc('mp_m4_equip_emblem',{p_skin_id:id||null});
     if(error)throw error;
     state.emblemId=id||null;state.lastLoad=0;await refresh(true);
     state.clubLastLoad=0;void fetchClubBadges(true);
   }catch(e){alert(e?.message||'Equipaggiamento stemma non riuscito');}
   finally{state.busy=false;schedule();}
 };
 window.mpM4Preview=preview;
 window.mpM4ClosePreview=closePreview;
 window.mpM4Inspect=()=>({version:'M4.0-slot',ready:state.ready,error:state.error,
   emblem:state.emblemId,season:season(),clubEmblems:state.clubBadges.size});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closePreview();});
 window.MP_M4_BADGE_READY=true;
 void refresh();schedule();
})();

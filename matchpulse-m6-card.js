/* M6 — renderer unico con preset per singola skin.
   Home, Club, inventario e anteprima usano la stessa base,
   ma ogni estetica può avere percentuali diverse. */
(function(){
 'use strict';
 if(window.MP_M6_CARD_READY)return;

 const fileBySlug={
  'fc-dynasty':'fc_comune.webp','fc-ice':'fc_rara.webp','fc-neon':'fc_epica.webp','fc-blackout':'fc_leggendaria.webp',
  'op-nakama':'op_rara.webp','op-gear':'op_leggendaria.webp','db-saiyan':'db_rara.webp','db-ultra':'db_leggendaria.webp',
  'cp-edge':'cp_rara.webp','cp-samurai':'cp_leggendaria.webp','f1-pole':'f1_rara.webp','f1-champ':'f1_leggendaria.webp',
  'op-ocean-epic':'op_epica.webp','db-aura-epic':'db_epica.webp','cp-neon-epic':'cp_epica.webp','f1-racing-epic':'f1_epica.webp'
 };
 const alias={
  mp_gold_dynasty:'fc-dynasty',mp_icebreak:'fc-ice',mp_neon_pulse:'fc-neon',mp_blackout:'fc-blackout',
  op_nakama:'op-nakama',op_gear:'op-gear',db_saiyan:'db-saiyan',db_ultra:'db-ultra',
  cp_edge:'cp-edge',cp_samurai:'cp-samurai',f1_pole:'f1-pole',f1_champ:'f1-champ',
  op_ocean_epic:'op-ocean-epic',db_aura_epic:'db-aura-epic',cp_neon_epic:'cp-neon-epic',f1_racing_epic:'f1-racing-epic'
 };
 const common={op_straw:'onepiece.png',db_kame:'dragonball.png',cp_night:'cyberpunk.png',f1_grid:'formula1.png'};
 const scriptBase=new URL('mp-m6-art/',document.currentScript?.src||document.baseURI);
 const resolve=id=>alias[id]||id;
 const isPromo=card=>!!card.closest('.mp-promo-card,.mp-promo-v3-card,[data-promo-card="true"],.mp-m2-product,.mp-m2-reveal-skin')||card.dataset.promoCard==='true';

 const DEFAULT_PRESET={
  layout:'grid',
  width:'min(100%,355px)',
  boxShadow:'0 16px 40px #0007',
  ovrLeft:'15%', ovrTop:'17%',
  sideLeft:'10%', sideTop:'43%', sideWidth:'29%',
  photoLeft:'37%', photoTop:'27%', photoWidth:'47%', photoHeight:'34%', photoRadius:'12px',
  nameTop:'66%', nameLeft:'10%', nameRight:'10%',
  statsTop:'77%', statsLeft:'15%', statsRight:'15%', statsGap:'1px 3px'
 };

 const PRESETS={
  'fc-dynasty':{},
  'fc-ice':{},
  'fc-neon':{photoLeft:'34%',photoTop:'26%',photoWidth:'45%',photoHeight:'33%',sideTop:'43%',statsTop:'77%'},
  'fc-blackout':{layout:'row',photoLeft:'34%',photoTop:'28%',photoWidth:'41%',photoHeight:'29%',sideLeft:'9%',sideTop:'42%',sideWidth:'26%',nameTop:'66%',statsTop:'78.5%',statsLeft:'10%',statsRight:'10%'},

  'op-nakama':{photoLeft:'35%',photoTop:'28%',photoWidth:'45%',photoHeight:'33%',sideLeft:'7%',sideTop:'43%',sideWidth:'26%',statsTop:'77.5%'},
  'op-ocean-epic':{photoLeft:'35%',photoTop:'28%',photoWidth:'43%',photoHeight:'31%',sideLeft:'7%',sideTop:'43%',sideWidth:'26%',nameTop:'66.5%',statsTop:'77.8%'},
  'op-gear':{layout:'row',photoLeft:'31%',photoTop:'30%',photoWidth:'38%',photoHeight:'24%',sideLeft:'6%',sideTop:'43%',sideWidth:'24%',nameTop:'66.8%',statsTop:'79%',statsLeft:'10%',statsRight:'10%'},

  'db-saiyan':{photoLeft:'35%',photoTop:'28%',photoWidth:'45%',photoHeight:'33%',sideLeft:'7%',sideTop:'43%',sideWidth:'26%',statsTop:'77.4%'},
  'db-aura-epic':{photoLeft:'35%',photoTop:'28%',photoWidth:'43%',photoHeight:'31%',sideLeft:'7%',sideTop:'43%',sideWidth:'26%',nameTop:'66.5%',statsTop:'77.8%'},
  'db-ultra':{layout:'row',photoLeft:'31%',photoTop:'30%',photoWidth:'38%',photoHeight:'24%',sideLeft:'6%',sideTop:'43%',sideWidth:'24%',nameTop:'66.8%',statsTop:'79%',statsLeft:'10%',statsRight:'10%'},

  'cp-edge':{photoLeft:'35%',photoTop:'28%',photoWidth:'45%',photoHeight:'33%',sideLeft:'7%',sideTop:'43%',sideWidth:'26%',statsTop:'77.4%'},
  'cp-neon-epic':{photoLeft:'35%',photoTop:'28%',photoWidth:'43%',photoHeight:'31%',sideLeft:'7%',sideTop:'43%',sideWidth:'26%',nameTop:'66.5%',statsTop:'77.8%'},
  'cp-samurai':{layout:'row',photoLeft:'31%',photoTop:'30%',photoWidth:'38%',photoHeight:'24%',sideLeft:'6%',sideTop:'43%',sideWidth:'24%',nameTop:'66.8%',statsTop:'79%',statsLeft:'10%',statsRight:'10%'},

  'f1-pole':{photoLeft:'35%',photoTop:'28%',photoWidth:'45%',photoHeight:'33%',sideLeft:'7%',sideTop:'43%',sideWidth:'26%',statsTop:'77.4%'},
  'f1-racing-epic':{photoLeft:'35%',photoTop:'28%',photoWidth:'43%',photoHeight:'31%',sideLeft:'7%',sideTop:'43%',sideWidth:'26%',nameTop:'66.5%',statsTop:'77.8%'},
  'f1-champ':{layout:'row',photoLeft:'31%',photoTop:'30%',photoWidth:'38%',photoHeight:'24%',sideLeft:'6%',sideTop:'43%',sideWidth:'24%',nameTop:'66.8%',statsTop:'79%',statsLeft:'10%',statsRight:'10%'}
 };

 const VAR_KEYS=[
  '--mp6-width','--mp6-shadow','--mp6-ovr-left','--mp6-ovr-top',
  '--mp6-side-left','--mp6-side-top','--mp6-side-width',
  '--mp6-photo-left','--mp6-photo-top','--mp6-photo-width','--mp6-photo-height','--mp6-photo-radius',
  '--mp6-name-top','--mp6-name-left','--mp6-name-right',
  '--mp6-stats-top','--mp6-stats-left','--mp6-stats-right','--mp6-stats-gap'
 ];

 let latestHome=null,shown=false,queued=false;

 function mergedPreset(slug){
  return {...DEFAULT_PRESET,...(PRESETS[slug]||{})};
 }

 function resetVars(card){
  VAR_KEYS.forEach(key=>card.style.removeProperty(key));
  card.classList.remove('mp6-stats-row');
 }

 function applyPreset(card,slug){
  const p=mergedPreset(slug);
  card.style.setProperty('--mp6-width',p.width);
  card.style.setProperty('--mp6-shadow',p.boxShadow);
  card.style.setProperty('--mp6-ovr-left',p.ovrLeft);
  card.style.setProperty('--mp6-ovr-top',p.ovrTop);
  card.style.setProperty('--mp6-side-left',p.sideLeft);
  card.style.setProperty('--mp6-side-top',p.sideTop);
  card.style.setProperty('--mp6-side-width',p.sideWidth);
  card.style.setProperty('--mp6-photo-left',p.photoLeft);
  card.style.setProperty('--mp6-photo-top',p.photoTop);
  card.style.setProperty('--mp6-photo-width',p.photoWidth);
  card.style.setProperty('--mp6-photo-height',p.photoHeight);
  card.style.setProperty('--mp6-photo-radius',p.photoRadius);
  card.style.setProperty('--mp6-name-top',p.nameTop);
  card.style.setProperty('--mp6-name-left',p.nameLeft);
  card.style.setProperty('--mp6-name-right',p.nameRight);
  card.style.setProperty('--mp6-stats-top',p.statsTop);
  card.style.setProperty('--mp6-stats-left',p.statsLeft);
  card.style.setProperty('--mp6-stats-right',p.statsRight);
  card.style.setProperty('--mp6-stats-gap',p.statsGap);
  card.classList.toggle('mp6-stats-row',p.layout==='row');
 }

 function clean(card){
  card.querySelector(':scope > .mp6-art-layer')?.remove();
  card.querySelector(':scope > .mp5-surface')?.remove();
  card.querySelector(':scope > .mp-b-card-layer')?.remove();
  card.classList.remove('mp5-rendered','mp-b-card-common','mp-b-card-rare','mp-b-card-legendary','mp-b-card-epic','mp-m3-art-card','mp-m2-card-equipped','mp6-rendered');
  card.removeAttribute('data-mp6-look');
  resetVars(card);
 }

 function target(card){
  const source=card.dataset.mp6PreviewId||card.dataset.m2Skin||card.dataset.m3Skin||card.dataset.bTestSkin||'';
  const slug=resolve(source);
  return fileBySlug[slug]?slug:null;
 }

 function apply(card){
  if(!card?.classList?.contains('player-card')||isPromo(card))return;
  const slug=target(card);
  if(!slug){if(card.classList.contains('mp6-rendered'))clean(card);return;}
  if(card.dataset.mp6Look!==slug || !card.querySelector(':scope > .mp6-art-layer')){
    clean(card);
    const art=document.createElement('div');
    art.className='mp6-art-layer';
    art.setAttribute('aria-hidden','true');
    const img=document.createElement('img');
    img.alt='';
    img.loading='eager';
    img.decoding='async';
    img.src=new URL(fileBySlug[slug],scriptBase).href;
    img.onerror=()=>{if(card.dataset.mp6Look===slug)clean(card);};
    art.appendChild(img);
    card.prepend(art);
    card.dataset.mp6Look=slug;
    card.classList.add('mp6-rendered');
  }
  applyPreset(card,slug);
 }

 function badgePreview(card,id){
  if(!common[id])return;
  card.querySelector(':scope > .mp-m4-medallion')?.remove();
  const b=document.createElement('span');
  b.className='mp-m4-medallion mp6-preview-medallion';
  b.setAttribute('aria-hidden','true');
  const img=document.createElement('img');
  img.src=new URL(common[id],scriptBase).href;
  img.alt='';
  b.append(img);
  card.append(b);
  card.dataset.mp4Emblem=id;
 }

 function sync(){
  queued=false;
  document.querySelectorAll('.player-card').forEach(apply);
  const c=document.querySelector('.premium-home .featured-card-wrap .player-card,.premium-home .player-card,.home-player-stage .player-card');
  if(c&&!c.closest('.mp6-overlay'))latestHome=c.cloneNode(true);
 }

 function queue(){if(queued)return;queued=true;requestAnimationFrame(sync);}

 const watch=new MutationObserver(changes=>{
  if(changes.some(m=>(m.type==='childList'&&(m.addedNodes.length||m.removedNodes.length))||m.type==='attributes'))queue();
 });
 watch.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-m2-skin','data-m3-skin','data-mp6-preview-id']});

 function removeModal(){document.querySelector('.mp6-preview-overlay')?.remove();shown=false;}

 function sourceCard(){
  const c=document.querySelector('.premium-home .featured-card-wrap .player-card,.premium-home .player-card,.home-player-stage .player-card');
  if(c)return c;
  if(latestHome)return latestHome;
  try{
    if(typeof playerCard==='function'&&typeof playerRatings==='function'){
      const host=document.createElement('div');
      host.innerHTML=playerCard(playerRatings(typeof getMatches==='function'?getMatches():[]));
      return host.querySelector('.player-card');
    }
  }catch(e){
    console.warn('M6 preview: dati carta non disponibili',e);
  }
  return null;
 }

 function showPreview(id){
  const catalogue=window.mpM6Catalog?.();
  const product=catalogue?.skins?.find(x=>x.id===id);
  if(!product)return;
  removeModal();
  const modal=document.createElement('div');
  modal.className='mp6-preview-overlay mp6-overlay';
  modal.innerHTML=`<div class="mp6-modal-backdrop"></div><section class="mp6-preview-dialog" role="dialog" aria-modal="true" aria-label="Anteprima estetica">
     <header><div><small>ANTEPRIMA REALE · MATCHPULSE</small><h3></h3></div><button class="mp6-close-preview" type="button" aria-label="Chiudi">✕</button></header>
     <div class="mp6-preview-stage"></div><p>Anteprima senza costi: la tua foto e le tue statistiche restano invariate, anche dopo l'acquisto.</p>
     <button class="mp6-close-preview mp6-bottom-close" type="button">TORNA AL NEGOZIO</button></section>`;
  modal.querySelector('h3').textContent=product.title;
  modal.querySelector('.mp6-modal-backdrop').onclick=removeModal;
  modal.querySelectorAll('.mp6-close-preview').forEach(b=>b.onclick=removeModal);
  const c=sourceCard();
  if(c){
    const clone=c.cloneNode(true);
    clone.querySelectorAll('.mp6-art-layer,.mp5-surface,.mp-b-card-layer').forEach(n=>n.remove());
    clone.classList.remove('mp6-rendered','mp5-rendered');
    clone.removeAttribute('data-mp6-look');
    resetVars(clone);
    delete clone.dataset.mp6Look;
    for(const k of ['m2Skin','m3Skin','bTestSkin'])delete clone.dataset[k];
    if(common[id]){
      clone.removeAttribute('data-mp6-preview-id');
      clean(clone);
      badgePreview(clone,id);
    }else{
      clone.dataset.mp6PreviewId=id;
      apply(clone);
    }
    modal.querySelector('.mp6-preview-stage').append(clone);
  }else{
    modal.querySelector('.mp6-preview-stage').innerHTML='<div class="mp6-no-card">Apri la Home almeno una volta per visualizzare l’anteprima con la tua foto e le tue statistiche reali.</div>';
  }
  document.body.appendChild(modal);
  shown=true;
  modal.querySelector('.mp6-close-preview').focus();
 }

 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&shown){e.preventDefault();removeModal();}});
 window.mpM6Preview=showPreview;
 window.mpM6CardSync=queue;
 window.mpM6CardDiagnostics=()=>({rendered:document.querySelectorAll('.player-card.mp6-rendered').length,knownArt:Object.keys(fileBySlug).length,previewOpen:shown});
 window.MP_M6_CARD_READY=true;
 sync();
})();
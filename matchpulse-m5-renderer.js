/* MATCHPULSE M5 — renderer unico incrementale, SOLO GRAFICA.
 * Dipendenze: B3.2, M4 (emblema); foto, OVR e statistiche arrivano
 * esclusivamente dal markup V8 esistente, senza rigenerare o scrivere dati.
 */
(function(){
  'use strict';
  if (window.MP_M5_RENDERER_READY) return;
  const LOOKS = Object.freeze({
    // I quattro ID storici FC sono conservati per evitare perdita degli acquisti.
    'fc-dynasty': {name:'FC · Botanica',tier:'comune',file:'fc_comune.webp',ink:'#202a21'},
    'fc-ice': {name:'FC · Sakura',tier:'rara',file:'fc_rara.webp',ink:'#281a21'},
    'fc-neon': {name:'FC · Architettura',tier:'epica',file:'fc_epica.webp',ink:'#f7f1de'},
    'fc-blackout': {name:'FC · Cosmo',tier:'leggendaria',file:'fc_leggendaria.webp',ink:'#f6efff'},
    'op-nakama': {name:'One Piece · Rara',tier:'rara',file:'op_rara.webp',ink:'#30221d'},
    'op-gear': {name:'One Piece · Leggendaria',tier:'leggendaria',file:'op_leggendaria.webp',ink:'#261623'},
    'db-saiyan': {name:'Dragon Ball · Rara',tier:'rara',file:'db_rara.webp',ink:'#34221a'},
    'db-ultra': {name:'Dragon Ball · Leggendaria',tier:'leggendaria',file:'db_leggendaria.webp',ink:'#fff7ea'},
    'cp-edge': {name:'Cyberpunk · Rara',tier:'rara',file:'cp_rara.webp',ink:'#f9f1ff'},
    'cp-samurai': {name:'Cyberpunk · Leggendaria',tier:'leggendaria',file:'cp_leggendaria.webp',ink:'#fff1ff'},
    'f1-pole': {name:'Formula 1 · Rara',tier:'rara',file:'f1_rara.webp',ink:'#fff9f3'},
    'f1-champ': {name:'Formula 1 · Leggendaria',tier:'leggendaria',file:'f1_leggendaria.webp',ink:'#fff9ee'},
    // Anteprime di sviluppo. Non acquistabili o equipaggiabili dal database M2.
    'm5-op-epic': {name:'One Piece · Epica',tier:'epica',file:'op_epica.webp',ink:'#f9f3e6',previewOnly:true},
    'm5-db-epic': {name:'Dragon Ball · Epica',tier:'epica',file:'db_epica.webp',ink:'#fff7ed',previewOnly:true},
    'm5-cp-epic': {name:'Cyberpunk · Epica',tier:'epica',file:'cp_epica.webp',ink:'#f9ecff',previewOnly:true},
    'm5-f1-epic': {name:'Formula 1 · Epica',tier:'epica',file:'f1_epica.webp',ink:'#fff7ec',previewOnly:true}
  });
  const BASE = new URL('mp-m5-art/', document.currentScript?.src || document.baseURI);
  const aliases = Object.freeze({
    op_nakama:'op-nakama',op_gear:'op-gear',db_saiyan:'db-saiyan',db_ultra:'db-ultra',
    cp_edge:'cp-edge',cp_samurai:'cp-samurai',f1_pole:'f1-pole',f1_champ:'f1-champ',
    mp_gold_dynasty:'fc-dynasty',mp_icebreak:'fc-ice',mp_neon_pulse:'fc-neon',mp_blackout:'fc-blackout'
  });
  const SEEN = { applied:0, failed:new Set(), lastHome:null, previewOpen:false };
  const noPromo = card => !card.closest('.mp-promo-card,.mp-promo-v3-card,[data-promo-card="true"],.mp-m2-product,.mp-m2-reveal');
  const esc = value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const resolve = card => {
    const key=card.dataset.mp5PreviewId||card.dataset.bPreviewId||card.dataset.bTestSkin||card.dataset.bSkin||card.dataset.m2Skin||card.dataset.m3Skin||'';
    return LOOKS[aliases[key]||key] ? aliases[key]||key : null;
  };
  function clear(card){
    const old=card.querySelector(':scope > .mp5-surface');
    if(old)old.remove();
    card.classList.remove('mp5-rendered');card.removeAttribute('data-mp5-look');
    card.style.removeProperty('--mp5-ink');
  }
  function apply(card){
    if(!card?.classList?.contains('player-card')||!noPromo(card))return;
    const slug=resolve(card);
    if(!slug){if(card.classList.contains('mp5-rendered'))clear(card);return;}
    if(SEEN.failed.has(slug))return;
    if(card.dataset.mp5Look===slug&&card.querySelector(':scope > .mp5-surface'))return;
    const look=LOOKS[slug];
    clear(card);
    const surface=document.createElement('div');surface.className='mp5-surface';
    surface.setAttribute('aria-hidden','true');
    const img=document.createElement('img');img.className='mp5-art-image';
    img.alt='';img.decoding='async';img.loading='eager';
    img.onerror=()=>{
      SEEN.failed.add(slug);console.warn('M5: immagine mancante, ripristinato il renderer precedente',slug);
      if(card.isConnected&&card.dataset.mp5Look===slug)clear(card);
    };
    img.src=new URL(look.file,BASE).href;
    surface.appendChild(img);
    card.insertBefore(surface,card.firstChild);
    card.classList.add('mp5-rendered');
    card.dataset.mp5Look=slug;
    card.style.setProperty('--mp5-ink',look.ink);
    // La M4 gestisce il medaglione. Questo codice non lo sposta e non lo elimina.
    SEEN.applied+=1;
  }
  let queued=false;
  function sync(){
    queued=false;
    document.querySelectorAll('.player-card').forEach(apply);
    const live=document.querySelector('.premium-home .featured-card-wrap .player-card');
    if(live&&noPromo(live)&&!live.closest('.mp5-preview-overlay'))SEEN.lastHome=live.cloneNode(true);
    founderButton();
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(sync);}
  const observer=new MutationObserver(records=>{
    if(records.some(x=>x.type==='childList'&&(x.addedNodes.length||x.removedNodes.length)||x.type==='attributes'))schedule();
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-b-skin','data-b-preview-id','data-b-test-skin','data-m2-skin','data-m3-skin']});
  let returnFocus=null;
  function closePreview(){
    document.querySelector('.mp5-preview-overlay')?.remove();SEEN.previewOpen=false;
    if(returnFocus?.isConnected)returnFocus.focus();returnFocus=null;
  }
  function previewCard(slug){
    const stage=document.querySelector('.mp5-preview-stage');
    if(!stage||!LOOKS[slug])return;
    const old=stage.querySelector('.player-card');old?.remove();
    const source=document.querySelector('.premium-home .featured-card-wrap .player-card')||SEEN.lastHome;
    if(!source){stage.innerHTML='<p class="mp5-no-home">Apri prima la Home, poi torna al laboratorio: la prova userà i tuoi dati reali, senza inventare OVR o statistiche.</p>';return;}
    const card=source.cloneNode(true);
    card.querySelectorAll('.mp5-surface,.mp-b-card-layer').forEach(e=>e.remove());
    card.classList.remove('mp5-rendered');card.removeAttribute('data-mp5-look');
    card.dataset.mp5PreviewId=slug;
    stage.append(card);apply(card);
  }
  function showPreview(slug='m5-op-epic'){
    if(!LOOKS[slug])return;
    closePreview();returnFocus=document.activeElement;
    const modal=document.createElement('div');modal.className='mp5-preview-overlay';
    modal.innerHTML=`<div class="mp5-preview-shade"></div><section class="mp5-preview-dialog" role="dialog" aria-modal="true" aria-label="Anteprima rendering estetiche">
      <header><strong>FOUNDER · RENDERER M5</strong><button class="mp5-preview-close" type="button" aria-label="Chiudi">✕</button></header>
      <label for="mp5-look-picker">Estetica da provare</label><select id="mp5-look-picker">${Object.entries(LOOKS).map(([id,v])=>`<option value="${id}" ${id===slug?'selected':''}>${esc(v.name)}${v.previewOnly?' · SOLO ANTEPRIMA':''}</option>`).join('')}</select>
      <div class="mp5-preview-stage"></div><p class="mp5-preview-note">Stessa struttura della carta live: foto, OVR e statistiche originali. Nessun acquisto, token o equipaggiamento viene modificato.</p>
      <button class="mp5-preview-done" type="button">CHIUDI ANTEPRIMA</button></section>`;
    modal.querySelector('.mp5-preview-shade').addEventListener('click',closePreview);
    modal.querySelector('.mp5-preview-close').addEventListener('click',closePreview);
    modal.querySelector('.mp5-preview-done').addEventListener('click',closePreview);
    modal.querySelector('select').addEventListener('change',e=>previewCard(e.target.value));
    document.body.append(modal);SEEN.previewOpen=true;previewCard(slug);
    modal.querySelector('.mp5-preview-close').focus();
  }
  function founderButton(){
    // La presenza del pannello Founder viene controllata da B3 tramite ruolo server-side.
    const panel=document.querySelector('.mp-b-founder-lab .mp-b-lab-controls');
    if(!panel||panel.querySelector('.mp5-founder-test'))return;
    const button=document.createElement('button');button.type='button';button.className='mp5-founder-test';
    button.textContent='ANTEPRIMA NUOVE CARTE (M5)';
    button.addEventListener('click',()=>showPreview('m5-op-epic'));
    panel.append(button);
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&SEEN.previewOpen){e.preventDefault();closePreview();}});
  window.mpM5Preview=showPreview;
  window.mpM5ClosePreview=closePreview;
  window.mpM5Inspect=()=>({version:'M5.0',activeCards:document.querySelectorAll('.player-card.mp5-rendered').length,
    artwork:Object.keys(LOOKS).length, previewOnly:Object.values(LOOKS).filter(x=>x.previewOnly).length,
    failedImages:Array.from(SEEN.failed),m4Ready:!!window.MP_M4_BADGE_READY});
  window.MP_M5_RENDERER_READY=true;
  sync();
})();

/* ===============================================================
   MATCHPULSE PREMIUM B / R3.0 DEFINITIVO — NEGOZIO DEFINITIVO
   Overlay progressivo sopra app.js + M1 + M2 + M3 + Premium A.
   Non concede token e non modifica le RPC di acquisto reali.
   Founder Sandbox: solo account verificato dalla RPC di admin.
   =============================================================== */
(function(){
 'use strict';
 if(window.MP_PREMIUM_B_READY) return;
 const MAIN=document.getElementById('app');
 if(!MAIN) return;
 const ORIGINAL={
   'op-straw':['op','common','Cappello di Paglia'],
   'op-nakama':['op','rare','Rotta della Grand Line'],
   'op-gear':['op','legendary','Risveglio della Grand Line'],
   'db-kame':['db','common','Sfera del Drago'],
   'db-saiyan':['db','rare','Aura Saiyan'],
   'db-ultra':['db','legendary','Ultra Instinct'],
   'cp-night':['cp','common','Neural Chip'],
   'cp-edge':['cp','rare','Neon Edgerunner'],
   'cp-samurai':['cp','legendary','Night City Samurai'],
   'f1-grid':['f1','common','Casco da Pilota'],
   'f1-pole':['f1','rare','Pole Position'],
   'f1-champ':['f1','legendary','World Champion'],
   'fc-dynasty':['fcgold','legendary','Gold Dynasty'],
   'fc-ice':['fcice','legendary','Icebreak'],
   'fc-neon':['fcneon','legendary','Neon Pulse'],
   'fc-blackout':['fcblack','legendary','Blackout']
 };
 const BY_ID={
   op_straw:'op-straw',op_nakama:'op-nakama',op_gear:'op-gear',
   db_kame:'db-kame',db_saiyan:'db-saiyan',db_ultra:'db-ultra',
   cp_night:'cp-night',cp_edge:'cp-edge',cp_samurai:'cp-samurai',
   f1_grid:'f1-grid',f1_pole:'f1-pole',f1_champ:'f1-champ',
   mp_gold_dynasty:'fc-dynasty',mp_icebreak:'fc-ice',
   mp_neon_pulse:'fc-neon',mp_blackout:'fc-blackout'
 };
 const THEMES={op:'ONE PIECE',db:'DRAGON BALL',cp:'CYBERPUNK 2077',f1:'FORMULA 1',
   fcgold:'FC ORIGINALS',fcice:'FC ORIGINALS',fcneon:'FC ORIGINALS',fcblack:'FC ORIGINALS'};
 const ESC=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const src=(theme,type)=>`b-art/${theme}-${type}.svg?v=20261112-b3`;
 const liveRoute=()=>typeof route==='string'?route:'';
 const isPromo=el=>!!el?.closest('.mp-promo-card,.mp-promo-v3-card,[data-promo-card="true"]')||el?.dataset?.promoCard==='true';
 const m2State=()=>{try{return window.mpM2Inspect?.()||{};}catch{return{};}};
 const STATE={admin:false,adminChecked:false,theme:'all',queued:false,cardHTML:'',
   currentPreview:null,pendingProduct:null,lastPackTheme:'any',overlayTimer:0,fetchingAdmin:false,
   sandboxOwned:new Set(),sandboxEquipped:null,sandboxHistory:[],
   sandboxPacks:[],sandboxSkins:[],sandboxCatalogReady:false,sandboxError:'',
   currentEquipped:null};
 const img=(theme,type,cl)=>`<img loading="lazy" class="${cl}" src="${src(theme,type)}" alt="" aria-hidden="true">`;
 const family=(theme)=>['fcgold','fcice','fcneon','fcblack'].includes(theme)?'matchpulse':theme;
 // L'identita' cosmetica puo' arrivare da M2 (Home), M3 (Club) o dal sandbox.
 // Si identifica soltanto tramite ID/slug noto, mai dai testi dell'utente.
 function currentCardInfo(card){
   const override=card.dataset.bPreviewId||card.dataset.bTestSkin;
   if(override)return BY_ID[override]||override;
   const slug=card.dataset.m2Skin||card.dataset.m3Skin||'';
   return Object.prototype.hasOwnProperty.call(ORIGINAL,slug)?slug:null;
 }
 function removeCardDecoration(card){
   card.querySelector(':scope > .mp-b-card-layer')?.remove();
   card.classList.remove('mp-b-card-common','mp-b-card-rare','mp-b-card-legendary');
   delete card.dataset.bSkin;delete card.dataset.bRarity;
   card.removeAttribute('data-b-skin');card.removeAttribute('data-b-rarity');
 }
 function applyCard(card){
   if(!card||isPromo(card)||card.closest('.mp-m2-product,.mp-m2-reveal,.mp-b-preview-tile'))return;
   const slug=currentCardInfo(card),config=ORIGINAL[slug];
   if(!config){if(card.dataset.bSkin)removeCardDecoration(card);return;}
   if(card.dataset.bSkin===slug && card.querySelector(':scope > .mp-b-card-layer'))return;
   const [theme,rarity]=config;
   // M2/M3 dipingevano in modo generico ogni skin: ne escludiamo SOLO lo stile.
   // I data-attribute restano disponibili a M2/M3 per rileggere l'equip reale.
   card.classList.remove('mp-m2-card-equipped','mp-m3-art-card');
   removeCardDecoration(card);
   card.classList.add('mp-b-card-'+rarity);
   card.dataset.bSkin=slug;card.dataset.bRarity=rarity;
   const layer=document.createElement('div');layer.className='mp-b-card-layer';
   layer.setAttribute('aria-hidden','true');
   layer.innerHTML=rarity==='common'?img(theme,'badge','mp-b-badge'):
       img(theme,'frame','mp-b-frame');
   card.insertBefore(layer,card.firstChild);
 }
 // I renderer Club cambiano tra la lista e la modale. M3 conserva l'ID
 // equipaggiato del proprietario in data-m3-skin sul contenitore corretto.
 // Se esiste una vera player-card, il frame deve stare SU quella carta,
 // e non sul pannello o sull'intero pulsante del membro.
 function decorateClubContainer(container){
   if(!container||isPromo(container))return;
   const slug=container.dataset.m3Skin;
   const conf=ORIGINAL[slug];
   const inside=container.querySelector('.player-card');
   if(inside){
     if(conf && !isPromo(inside))inside.dataset.bTestSkin=slug;
     else if(inside.dataset.bTestSkin){delete inside.dataset.bTestSkin;removeCardDecoration(inside);}
     // Rimuovi la pelle generica del contenitore; sara' applicata solo
     // sulla carta interna, senza coprire gli altri elementi del Club.
     container.classList.remove('mp-m3-art-card');
     container.querySelector(':scope > .mp-b-club-layer')?.remove();
     applyCard(inside);
     return;
   }
   const old=container.querySelector(':scope > .mp-b-club-layer');
   if(!conf){if(old)old.remove();container.classList.remove('mp-b-club-common','mp-b-club-rare','mp-b-club-legendary');
     delete container.dataset.bClubSkin;return;}
   if(old&&container.dataset.bClubSkin===slug)return;
   old?.remove();
   container.classList.remove('mp-m3-art-card','mp-b-club-common','mp-b-club-rare','mp-b-club-legendary');
   container.classList.add('mp-b-club-'+conf[1]);container.dataset.bClubSkin=slug;
   const node=document.createElement('div');node.className='mp-b-club-layer';node.setAttribute('aria-hidden','true');
   node.innerHTML=conf[1]==='common'?img(conf[0],'badge','mp-b-badge'):
     img(conf[0],'frame','mp-b-frame');
   container.appendChild(node);
 }
 function decorateAllCards(){
   document.querySelectorAll('.mp-club-showcase-card[data-m3-skin],.mp-club-member-card[data-m3-skin],.mp-club-home-card[data-m3-skin],.mp-club-showcase-card[data-b-club-skin],.mp-club-member-card[data-b-club-skin],.mp-club-home-card[data-b-club-skin]').forEach(decorateClubContainer);
   document.querySelectorAll('#mpClubMemberModal [data-m3-skin]').forEach(el=>{
     if(el.classList.contains('player-card'))applyCard(el);
     else decorateClubContainer(el);
   });
   document.querySelectorAll('.player-card[data-m2-skin],.player-card[data-m3-skin],.player-card[data-b-preview-id],.player-card[data-b-test-skin],.player-card[data-b-skin]').forEach(applyCard);
 }
 function rememberCard(){
   if(liveRoute()!=='home')return;
   const card=MAIN.querySelector('.premium-home .featured-card-wrap .player-card');
   if(card){
     const clone=card.cloneNode(true);
     clone.querySelectorAll('.mp-b-card-layer').forEach(node=>node.remove());
     STATE.cardHTML=clone.outerHTML;
   }
 }
 function productSlug(node){
   const art=node.querySelector('.mp-m2-art');
   if(art){
     const found=[...art.classList].find(c=>c.startsWith('mp-m2-art-')&&Object.hasOwn(ORIGINAL,c.slice(10)));
     if(found)return found.slice(10);
   }
   const btn=node.querySelector('[onclick*="mpM2Open"],[onclick*="mpM2Equip"]');
   const raw=btn?.getAttribute('onclick')||'';
   const id=raw.match(/mpM2(?:Open\('skin',\s*'|Equip\(')([^']+)/)?.[1];
   return BY_ID[id]||null;
 }
 function decorateProduct(product){
   const slug=productSlug(product),config=ORIGINAL[slug];
   if(!config)return;
   if(product.dataset.bSlug===slug && product.querySelector('.mp-b-shop-art')) return;
   const [theme,rarity]=config;
   const art=product.querySelector('.mp-m2-art');if(!art)return;
   product.dataset.bSlug=slug;
   product.dataset.bFamily=family(theme);
   product.dataset.bRarity=rarity;
   product.classList.add('mp-b-product',`mp-b-${rarity}`);
   const old=art.querySelector('.mp-b-shop-art');if(old)old.remove();
   const artEl=document.createElement('div');artEl.className='mp-b-shop-art';
   artEl.innerHTML=img(theme,'background','mp-b-product-background')+
     (rarity==='common'?img(theme,'badge','mp-b-product-badge'):img(theme,'frame','mp-b-product-frame'))+
     `<span class="mp-b-product-kind">${rarity==='common'?'EMBLEMA':rarity==='rare'?'CORNICE 3D':'SKIN COMPLETA'}</span>`;
   art.appendChild(artEl);
 }
 const themeFromPack=p=>{
   for(const t of ['onepiece','dragonball','cyberpunk','formula1','matchpulse'])
     if(p.classList.contains('mp-m2-pack-'+t)) return t;
   return 'any';
 };
 const slugFromPack=t=>({onepiece:'op',dragonball:'db',cyberpunk:'cp',formula1:'f1',matchpulse:'fcgold',any:'fcneon'})[t]||'fcneon';
 function decoratePack(pack){
   const art=pack.querySelector('.mp-m2-pack-art');if(!art)return;
   const theme=themeFromPack(art);
   if(pack.dataset.bPackTheme===theme && pack.querySelector('.mp-b-pack-cover'))return;
   pack.dataset.bPackTheme=theme;
   const shell=art.querySelector('.mp-m2-pack-shell');if(!shell)return;
   shell.querySelector('.mp-b-pack-cover')?.remove();
   shell.insertAdjacentHTML('afterbegin',img(slugFromPack(theme),'background','mp-b-pack-cover')+
     (['onepiece','dragonball','cyberpunk','formula1'].includes(theme)?img(slugFromPack(theme),'badge','mp-b-pack-crest'):''));
   shell.classList.add('mp-b-pack-shell');
 }
 function banner(){
   const page=MAIN.querySelector('.mp-m2-page');if(!page||page.querySelector('.mp-b-catalog-header'))return;
   const tabs=page.querySelector('.mp-m2-utility-tabs');if(!tabs)return;
   const strip=document.createElement('div');strip.className='mp-b-catalog-header';
   strip.innerHTML=`<div class="mp-b-section-intro"><span>THE NEW COLLECTION</span><h3>LA TUA CARTA. <em>IL TUO STILE.</em></h3><p>Estetiche FC e collezioni speciali, senza alterare OVR o statistiche.</p></div>
     <div class="mp-b-collection-grid">
       <button class="mp-b-collection" data-theme="matchpulse" onclick="mpBTheme('matchpulse')"><span>ORIGINALS</span><strong>FC / MATCHPULSE</strong><small>4 estetiche premium</small></button>
       <button class="mp-b-collection" data-theme="onepiece" onclick="mpBTheme('onepiece')"><span>GRAND LINE</span><strong>ONE PIECE</strong><small>Emblema · Cornice · Skin</small></button>
       <button class="mp-b-collection" data-theme="dragonball" onclick="mpBTheme('dragonball')"><span>AWAKENING</span><strong>DRAGON BALL</strong><small>Emblema · Cornice · Skin</small></button>
       <button class="mp-b-collection" data-theme="cyberpunk" onclick="mpBTheme('cyberpunk')"><span>NIGHT CITY</span><strong>CYBERPUNK 2077</strong><small>Emblema · Cornice · Skin</small></button>
       <button class="mp-b-collection" data-theme="formula1" onclick="mpBTheme('formula1')"><span>GRAND PRIX</span><strong>FORMULA 1</strong><small>Emblema · Cornice · Skin</small></button>
     </div>`;
   tabs.insertAdjacentElement('afterend',strip);
 }
 function updateFilter(){
   const page=MAIN.querySelector('.mp-m2-page');if(!page)return;
   const stock=page.querySelector('.mp-m2-theme-filter');
   if(stock && !stock.querySelector('.mp-b-filter-fc')){
     const fc=document.createElement('button');fc.className='mp-b-filter-fc';fc.textContent='FC ORIGINALS';
     fc.onclick=()=>window.mpBTheme('matchpulse');stock.insertBefore(fc,stock.children[1]||null);
   }
   page.querySelectorAll('.mp-b-collection').forEach(b=>b.classList.toggle('is-selected',b.dataset.theme===STATE.theme));
   page.querySelector('.mp-b-filter-fc')?.classList.toggle('active',STATE.theme==='matchpulse');
 }
 function shopStage(){
   const page=MAIN.querySelector('.mp-m2-page');if(!page)return;
   page.classList.add('mp-b-store');
   banner();updateFilter();
   page.querySelectorAll('.mp-m2-product').forEach(decorateProduct);
   page.querySelectorAll('.mp-m2-pack-item').forEach(decoratePack);
   if(STATE.admin) mountFounderButton(page);
   // Un oggetto comune dà uno stemma; raro una cornice scolpita;
   // leggendario una skin. Lo spieghiamo anche nello Store.
   const grid=page.querySelector('.mp-m2-skin-grid');
   if(grid&&!page.querySelector('.mp-b-rarity-hint')){
     const hint=document.createElement('p');hint.className='mp-b-rarity-hint';
     hint.innerHTML='<b>COMUNE</b> Emblema sulla carta &nbsp;·&nbsp; <b>RARA</b> Cornice ornamentale &nbsp;·&nbsp; <b>LEGGENDARIA</b> Skin completa';
     grid.insertAdjacentElement('beforebegin',hint);
   }
 }
 function modalStage(){
   document.querySelectorAll('.mp-m2-modal-host .mp-m2-reveal-skin .mp-m2-art').forEach(art=>{
     const product=art.closest('.mp-m2-reveal-skin');
     if(product){
       const inferred=[...art.classList].find(x=>x.startsWith('mp-m2-art-')&&ORIGINAL[x.slice(10)]);
       if(inferred){const slug=inferred.slice(10);const c=ORIGINAL[slug];
         if(art.dataset.bSlug!==slug){
           art.dataset.bSlug=slug;
           const old=art.querySelector('.mp-b-shop-art');old?.remove();
           art.insertAdjacentHTML('beforeend',`<div class="mp-b-shop-art">${img(c[0],'background','mp-b-product-background')}${c[1]==='common'?img(c[0],'badge','mp-b-product-badge'):img(c[0],'frame','mp-b-product-frame')}</div>`);
         }
       }
     }
   });
   document.querySelectorAll('.mp-m2-reveal-scene').forEach(scene=>{
     if(scene.dataset.bReady)return;
     scene.dataset.bReady='1';
     scene.insertAdjacentHTML('beforeend','<span class="mp-b-sparks" aria-hidden="true"></span>');
   });
 }
 function getPreviewCardHTML(skinId){
   let html=STATE.cardHTML;
   if(!html&&typeof playerCard==='function'&&typeof playerRatings==='function'){
     try{html=playerCard(playerRatings(typeof getMatches==='function'?getMatches():[]));}catch{}
   }
   if(!html){
     html='<article class="player-card card-bronze" aria-label="Anteprima carta"><div class="player-top"><strong class="card-ovr">70</strong><span>DC</span></div><h3>PLAYER</h3><div class="player-stats"><span>PAC 70</span><span>SHO 70</span><span>PAS 70</span></div></article>';
   }
   const holder=document.createElement('div');holder.innerHTML=html;
   const card=holder.querySelector('.player-card');if(!card)return html;
   card.classList.remove('mp-m2-card-equipped','mp-m3-art-card','mp-b-card-common','mp-b-card-rare','mp-b-card-legendary');
   for(const name of ['data-m3-skin','data-m2-skin','data-b-skin','data-b-rarity','data-b-test-skin'])card.removeAttribute(name);
   card.querySelector('.mp-b-card-layer')?.remove();
   card.setAttribute('data-b-preview-id',skinId);
   return holder.innerHTML;
 }
 function renderPreview(id){
   const slug=BY_ID[id]||id,conf=ORIGINAL[slug];if(!conf)return;
   document.querySelector('.mp-b-dev-overlay')?.remove();
   const host=document.createElement('div');host.className='mp-b-dev-overlay';
   host.innerHTML=`<div class="mp-b-dev-shade" onclick="mpBClosePreview()"></div>
     <div class="mp-b-dev-dialog mp-b-preview-modal" role="dialog" aria-modal="true" aria-label="Anteprima cosmetica Founder">
       <div class="mp-b-dev-top"><span>FOUNDER · ANTEPRIMA SENZA COSTI</span><button onclick="mpBClosePreview()" aria-label="Chiudi">✕</button></div>
       <h3>${ESC(conf[2])}</h3><p>${conf[1]==='common'?'EMBLEMA':conf[1]==='rare'?'CORNICE ARCHITETTATA':'SKIN COMPLETA'} · ${ESC(THEMES[conf[0]])}</p>
       <div class="mp-b-preview-stage">${getPreviewCardHTML(id)}</div>
       <p class="mp-b-preview-note">I valori OVR, posizione, foto e statistiche sono quelli della tua carta se hai aperto la Home almeno una volta.</p>
       <div class="mp-b-preview-actions"><button onclick="mpBFounderReveal('${ESC(id)}')">PROVA IL REVEAL</button><button onclick="mpBFounder()">TORNA AL LABORATORIO</button></div>
     </div>`;
   document.body.appendChild(host);
   const card=host.querySelector('.player-card');if(card)applyCard(card);
 }
 function reveal(id,mode='sandbox'){
   const slug=BY_ID[id]||id,conf=ORIGINAL[slug];if(!conf)return;
   document.querySelector('.mp-b-dev-overlay')?.remove();
   const [theme,rarity,title]=conf;
   const realPurchase=mode==='real';
   const host=document.createElement('div');host.className='mp-b-dev-overlay';
   host.innerHTML=`<div class="mp-b-dev-shade"></div><div class="mp-b-dev-dialog mp-b-unboxing" role="dialog" aria-modal="true" aria-label="Reveal ${ESC(title)}">
     <div class="mp-b-dev-top"><span>${realPurchase?'ACQUISTO CONFERMATO':'FOUNDER · SIMULAZIONE GRATUITA'}</span><button onclick="mpBClosePreview()" aria-label="Chiudi">✕</button></div>
     <div class="mp-b-reveal-stage"><div class="mp-b-reveal-beam"></div>
       <button class="mp-b-reveal-seal" onclick="mpBUnseal()" aria-label="Apri la confezione"><span>MP</span><b>ULTIMATE PACK</b><small>TOCCA PER APRIRE</small></button>
       <div class="mp-b-reveal-card">${img(theme,'background','mp-b-product-background')}
       ${rarity==='common'?img(theme,'badge','mp-b-product-badge'):img(theme,'frame','mp-b-product-frame')}
       <div class="mp-b-reveal-rarity">${rarity==='common'?'COMUNE':rarity==='rare'?'RARA':'LEGGENDARIA'}</div></div></div>
     <div class="mp-b-reveal-meta"><small>${ESC(THEMES[theme])}</small><h3>${ESC(title)}</h3><p>${realPurchase?'Oggetto aggiunto all’inventario.':'Simulazione: token e inventario reali invariati.'}</p>
     <button onclick="${realPurchase?'mpBClosePreview()':'mpBFounder()'}">${realPurchase?'CHIUDI':'TORNA AL LAB'}</button></div></div>`;
   document.body.appendChild(host);
 }
 function founderAvailable(){return typeof window.mpPromoSecureIsAdmin==='function';}
 async function checkFounder(force=false){
   if(STATE.fetchingAdmin||!founderAvailable()||(STATE.adminChecked&&!force))return;
   STATE.fetchingAdmin=true;
   try{
     // RPC server-side: il ruolo Founder non si decide da localStorage/UI.
     const ok=await window.mpPromoSecureIsAdmin(true);
     STATE.admin=ok===true;STATE.adminChecked=true;
     if(STATE.admin && liveRoute()==='store')mountFounderButton(MAIN.querySelector('.mp-m2-page'));
     if(!STATE.admin)document.querySelector('.mp-b-founder-entry')?.remove();
   }catch(e){STATE.admin=false;STATE.adminChecked=true;console.warn('Premium B Founder non disponibile',e?.message||e);}
   finally{STATE.fetchingAdmin=false;}
 }
 function mountFounderButton(page){
   if(!page||page.querySelector('.mp-b-founder-entry'))return;
   const hero=page.querySelector('.mp-m2-hero')||page;
   const btn=document.createElement('button');btn.type='button';btn.className='mp-b-founder-entry';
   btn.textContent='✦ FOUNDER LAB';btn.onclick=()=>void window.mpBFounder();hero.appendChild(btn);
 }
 async function loadSandboxCatalog(){
   if(STATE.sandboxCatalogReady||typeof matchpulseSupabase==='undefined')return;
   try{
     const [p,s]=await Promise.all([
       matchpulseSupabase.from('matchpulse_m2_packs').select('*').eq('active',true).order('sort_order'),
       matchpulseSupabase.from('matchpulse_m2_skins').select('*').eq('active',true).order('sort_order')
     ]);
     if(p.error||s.error)throw(p.error||s.error);
     STATE.sandboxPacks=p.data||[];STATE.sandboxSkins=s.data||[];
     STATE.sandboxCatalogReady=true;STATE.sandboxError='';
   }catch(e){STATE.sandboxError='Catalogo non disponibile per il simulatore: '+(e?.message||e);}
 }
 function selectSkin(){return document.getElementById('mpBFounderSelect')?.value||'op_straw';}
 function selectPack(){return document.getElementById('mpBFounderPack')?.value||'pack_classic';}
 function selectTier(){return document.getElementById('mpBFounderTier')?.value||'auto';}
 function saveHistory(action,id){
   STATE.sandboxHistory.unshift({action,id,at:new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})});
   if(STATE.sandboxHistory.length>12)STATE.sandboxHistory.length=12;
 }
 function labInventoryHTML(){
   const names=[...STATE.sandboxOwned].map(id=>ORIGINAL[BY_ID[id]]?.[2]||id);
   return `<strong>${STATE.sandboxOwned.size} cosmetici virtuali</strong><p>${names.length?ESC(names.join(' · ')):'Nessun elemento simulato'}</p>`;
 }
 async function openFounder(){
   await checkFounder(true);
   if(!STATE.admin)return;
   await loadSandboxCatalog();
   document.querySelector('.mp-b-dev-overlay')?.remove();
   const host=document.createElement('div');host.className='mp-b-dev-overlay';
   const select=Object.entries(BY_ID).map(([id,slug])=>`<option value="${ESC(id)}">${ESC(ORIGINAL[slug][2])} · ${ESC(ORIGINAL[slug][1])}</option>`).join('');
   const packList=STATE.sandboxPacks.length?STATE.sandboxPacks:
     [{id:'pack_classic',title:'Pacchetto Classico'},{id:'pack_onepiece',title:'One Piece'},
      {id:'pack_dragonball',title:'Dragon Ball'},{id:'pack_cyberpunk',title:'Cyberpunk'},
      {id:'pack_formula1',title:'Formula 1'},{id:'pack_fc_originals',title:'FC Originals'}];
   host.innerHTML=`<div class="mp-b-dev-shade" onclick="mpBClosePreview()"></div>
     <div class="mp-b-dev-dialog mp-b-founder-lab" role="dialog" aria-modal="true" aria-label="Laboratorio Founder">
       <div class="mp-b-dev-top"><span>FOUNDER · AREA RISERVATA VERIFICATA</span><button onclick="mpBClosePreview()" aria-label="Chiudi">✕</button></div>
       <div class="mp-b-lab-head"><span>∞</span><div><h2>TOKEN DI PROVA ILLIMITATI</h2><p>Wallet virtuale, NON spendibile nell'app reale. Nessun premio, skin o saldo viene regalato al tuo account.</p></div></div>
       <div class="mp-b-lab-panel"><strong>01 / PERSONALIZZA</strong>
         <label class="mp-b-dev-label" for="mpBFounderSelect">OGGETTO COSMETICO</label>
         <select id="mpBFounderSelect">${select}</select>
         <div class="mp-b-lab-controls">
           <button onclick="mpBFounderPreview()">ANTEPRIMA CARTA</button>
           <button onclick="mpBSandboxBuy()">SIMULA ACQUISTO ∞</button>
           <button onclick="mpBSandboxEquip()">EQUIPAGGIA NEL LAB</button>
         </div>
         <div id="mpBSandboxInventory" class="mp-b-sandbox-inventory">${labInventoryHTML()}</div>
       </div>
       <div class="mp-b-lab-panel"><strong>02 / PROVA I PACCHETTI</strong>
         <label class="mp-b-dev-label" for="mpBFounderPack">PACCHETTO</label>
         <select id="mpBFounderPack">${packList.map(p=>`<option value="${ESC(p.id)}">${ESC(p.title)}</option>`).join('')}</select>
         <label class="mp-b-dev-label" for="mpBFounderTier">RARITÀ DEL TEST</label>
         <select id="mpBFounderTier"><option value="auto">Secondo probabilità del catalogo</option><option value="common">Forza comune</option><option value="rare">Forza rara</option><option value="legendary">Forza leggendaria</option></select>
         <div class="mp-b-lab-controls"><button onclick="mpBSandboxOpenPack()">APRI PACK DI PROVA ∞</button><button onclick="mpBFounderReveal()">REVEAL OGGETTO SCELTO</button></div>
         ${STATE.sandboxError?`<p class="mp-b-sandbox-warning">${ESC(STATE.sandboxError)}</p>`:''}
       </div>
       <div class="mp-b-lab-panel"><strong>03 / PULIZIA LABORATORIO</strong><div class="mp-b-lab-controls">
         <button class="is-secondary" onclick="mpBSandboxUnlockAll()">SBLOCCA TUTTO (TEST)</button>
         <button class="is-secondary" onclick="mpBSandboxClearEquip()">TOGLI SKIN DI TEST</button>
         <button class="is-danger" onclick="mpBSandboxReset()">RESETTA SOLO IL LAB</button></div>
         <div class="mp-b-sandbox-status" role="status" aria-live="polite">${STATE.sandboxEquipped?'Skin test: '+ESC(ORIGINAL[BY_ID[STATE.sandboxEquipped]]?.[2]||STATE.sandboxEquipped):'Nessuna skin test applicata'}</div>
       </div>
       <p class="mp-b-lab-disclaimer">Gli strumenti qui sopra non fanno chiamate di scrittura a Supabase. Gli acquisti reali utilizzano sempre la RPC M2 e richiedono token guadagnati nel gioco. Gli obiettivi definitivi saranno progettati separatamente.</p>
     </div>`;
   document.body.appendChild(host);
 }
 function renderLabInventory(){
   const box=document.getElementById('mpBSandboxInventory');if(box)box.innerHTML=labInventoryHTML();
   const status=document.querySelector('.mp-b-sandbox-status');
   if(status)status.textContent=STATE.sandboxEquipped?'Skin di test: '+(ORIGINAL[BY_ID[STATE.sandboxEquipped]]?.[2]||STATE.sandboxEquipped):'Nessuna skin test applicata';
 }
 function sampleSandboxPack(){
   const p=STATE.sandboxPacks.find(x=>x.id===selectPack());
   const tier=selectTier();
   const options=STATE.sandboxSkins.filter(s=>BY_ID[s.id]&&s.active!==false&&
     (!p||p.theme==='any'||s.theme===p.theme)&&
     !STATE.sandboxOwned.has(s.id));
   // Se il laboratorio ha gia' sbloccato tutto, reinizia il pool di test
   // soltanto quando richiesto: non riduce alcun oggetto reale.
   if(!options.length)return null;
   let available=options.filter(s=>tier==='auto'||s.rarity===tier);
   if(!available.length)return null;
   if(tier==='auto'&&p){
     const tierWeights=['common','rare','legendary'].map(r=>({r,w:available.some(s=>s.rarity===r)?Number(p[r+'_weight']||0):0})).filter(x=>x.w>0);
     const total=tierWeights.reduce((n,x)=>n+x.w,0);
     if(total){let r=Math.random()*total;let chosen=tierWeights[tierWeights.length-1].r;
       for(const t of tierWeights){r-=t.w;if(r<0){chosen=t.r;break;}}
       available=available.filter(s=>s.rarity===chosen);
     }
   }
   return available[Math.floor(Math.random()*available.length)]?.id||null;
 }
 function reloadFromNetwork(){
   if(typeof matchpulseSupabase==='undefined'||typeof mpEnsureClubAuth!=='function')return;
   void (async()=>{
     try{
       const user=await mpEnsureClubAuth();if(!user?.id)return;
       const now=window.mpM3Boot?.currentSeason?.();
       const {data,error}=await matchpulseSupabase.from('matchpulse_m2_equipped')
         .select('skin_id').eq('user_id',user.id).eq('season_id',now).maybeSingle();
       if(error)throw error;
       STATE.currentEquipped=data?.skin_id||null;
     }catch(e){console.warn('Premium B: equipaggiamento non verificato',e?.message||e);}
   })();
 }
 function sync(){
   STATE.queued=false;
   if(liveRoute()==='home')rememberCard();
   if(liveRoute()==='store'){shopStage();
     if(STATE.lastVisibleRoute!=='store')void checkFounder(true);
     else if(!STATE.adminChecked)void checkFounder();}
   STATE.lastVisibleRoute=liveRoute();
   decorateAllCards();modalStage();
 }
 function schedule(){if(STATE.queued)return;STATE.queued=true;requestAnimationFrame(sync);}
 const observer=new MutationObserver(changes=>{
   if(changes.some(m=>(m.type==='attributes'&&
     (m.attributeName==='data-m3-skin'||m.attributeName==='data-m2-skin'))||
     (m.type==='childList'&&(m.addedNodes.length||m.removedNodes.length))))schedule();
 });
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,
   attributeFilter:['data-m3-skin','data-m2-skin']});
 if(typeof window.mpM2Theme==='function'){
   const old=window.mpM2Theme;
   window.mpM2Theme=id=>{STATE.theme=id;const result=old(id);schedule();return result;};
 }
 window.mpBTheme=id=>window.mpM2Theme?.(id);
 if(typeof window.mpM2Open==='function'){
   const old=window.mpM2Open;
   window.mpM2Open=(kind,id)=>{STATE.pendingProduct={kind,id};return old(kind,id);};
 }
 if(typeof window.mpM2Confirm==='function'){
   const old=window.mpM2Confirm;
   window.mpM2Confirm=async(...args)=>{
     const pending=STATE.pendingProduct, before=m2State().ownedSkins;
     const result=await old(...args);
     const after=m2State().ownedSkins;
     // Reveal speciale solo dopo l'update confermato dal server.
     if(pending?.kind==='skin'&&Number.isInteger(before)&&Number.isInteger(after)&&after>before&&BY_ID[pending.id]){
       reveal(pending.id,'real');
     }
     STATE.pendingProduct=null;schedule();return result;
   };
 }
 if(typeof window.mpM2Equip==='function'){
   const old=window.mpM2Equip;
   window.mpM2Equip=async(...args)=>{const result=await old(...args);reloadFromNetwork();schedule();return result;};
 }
 window.mpBFounder=openFounder;
 window.mpBFounderPreview=()=>{if(!STATE.admin)return;renderPreview(selectSkin());};
 window.mpBFounderReveal=(id)=>{if(!STATE.admin)return;reveal(id||selectSkin(),'sandbox');};
 window.mpBUnseal=()=>{const box=document.querySelector('.mp-b-unboxing');if(!box)return;
   box.classList.add('is-revealed');box.querySelector('.mp-b-reveal-seal')?.setAttribute('disabled','true');};
 window.mpBSandboxBuy=()=>{if(!STATE.admin)return;const id=selectSkin();
   STATE.sandboxOwned.add(id);saveHistory('acquisto',id);renderLabInventory();reveal(id,'sandbox');};
 window.mpBSandboxEquip=()=>{if(!STATE.admin)return;const id=selectSkin();
   STATE.sandboxOwned.add(id);STATE.sandboxEquipped=id;saveHistory('equip',id);renderLabInventory();renderPreview(id);};
 window.mpBSandboxOpenPack=()=>{if(!STATE.admin)return;const id=sampleSandboxPack();
   if(!id){const box=document.querySelector('.mp-b-sandbox-status');
     if(box)box.textContent='Nessuna skin disponibile per questo pacchetto / rarità. Cambia filtro o resetta il laboratorio.';return;}
   STATE.sandboxOwned.add(id);saveHistory('pack',id);renderLabInventory();reveal(id,'sandbox');};
 window.mpBSandboxUnlockAll=()=>{if(!STATE.admin)return;Object.keys(BY_ID).forEach(id=>STATE.sandboxOwned.add(id));
   saveHistory('tutto','*');renderLabInventory();};
 window.mpBSandboxClearEquip=()=>{if(!STATE.admin)return;STATE.sandboxEquipped=null;renderLabInventory();};
 window.mpBSandboxReset=()=>{if(!STATE.admin)return;STATE.sandboxOwned.clear();STATE.sandboxHistory=[];
   STATE.sandboxEquipped=null;renderLabInventory();};
 window.mpBClosePreview=()=>document.querySelector('.mp-b-dev-overlay')?.remove();
 window.mpBInspect=()=>({version:'B3.0',premiumA:!!window.MP_PREMIUM_R1_READY,
   shopReady:!!window.MP_M2_READY,founderVerified:STATE.admin,
   cosmeticCatalog:Object.keys(BY_ID).length,decoratedCards:document.querySelectorAll('.player-card[data-b-skin]').length,
   clubDecorated:document.querySelectorAll('.mp-club-showcase-card[data-b-club-skin],.mp-club-member-card[data-b-club-skin]').length,
   liveBalance:m2State().wallet??null,sandboxBalance:STATE.admin?'infinite (sandbox only)':null,
   sandboxItems:STATE.admin?STATE.sandboxOwned.size:0});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')window.mpBClosePreview();});
 window.MP_PREMIUM_B_READY=true;
 schedule();
})();

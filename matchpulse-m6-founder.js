/* MATCHPULSE M6 Founder Sandbox — SOLO test, nessuna RPC di acquisto/saldo.
   Mostra la console soltanto dopo la verifica amministratore server-side esistente. */
(function(){
 'use strict';if(window.MP_M6_FOUNDER_READY)return;
 const S={checked:false,admin:false,checking:false,owned:new Set(),revealed:[],founderOpen:false};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const db=()=>window.mpM6Catalog?.()||{skins:[],packs:[]};
 function close(){document.querySelector('.mp6-founder-overlay')?.remove();S.founderOpen=false;}
 function pickSkin(){return document.getElementById('mp6FounderSkin')?.value||'';}
 function pickPack(){return document.getElementById('mp6FounderPack')?.value||'';}
 function selectedRarity(){return document.getElementById('mp6FounderRarity')?.value||'auto';}
 function notice(msg){const el=document.getElementById('mp6FounderStatus');if(el)el.textContent=msg;}
 function sample(){
   const c=db(),pack=c.packs.find(x=>x.id===pickPack()),forced=selectedRarity();
   if(!pack)return null;
   let eligible=c.skins.filter(x=>x.active!==false&&!S.owned.has(x.id) && (pack.theme==='any'||pack.theme===x.theme));
   if(forced!=='auto')eligible=eligible.filter(x=>x.rarity===forced);
   else {
     const weights=['common','rare','epic','legendary'].map(r=>({rarity:r,w:eligible.some(x=>x.rarity===r)?Number(pack[r+'_weight']||0):0})).filter(x=>x.w>0);
     const total=weights.reduce((a,x)=>a+x.w,0);
     if(!total)return null;
     let p=Math.random()*total;let tier=weights[weights.length-1].rarity;
     for(const x of weights){p-=x.w;if(p<0){tier=x.rarity;break;}}
     eligible=eligible.filter(x=>x.rarity===tier);
   }
   return eligible.length?eligible[Math.floor(Math.random()*eligible.length)]:null;
 }
 function reveal(id){
   const item=db().skins.find(x=>x.id===id);if(!item){notice('Oggetto non disponibile.');return;}
   S.owned.add(id);S.revealed.unshift(item.title);
   const box=document.getElementById('mp6FounderReveal');if(!box)return;
   box.innerHTML=`<div class="mp6-founder-reveal-enter"><div class="mp6-founder-reveal-plate">✦</div><h3>${esc(item.title)}</h3><p>${esc(item.theme.toUpperCase())} · ${esc(item.rarity.toUpperCase())}</p>
    <button type="button" onclick="mpM6Preview('${esc(id)}')">ANTEPRIMA SULLA MIA CARTA</button>
    <button type="button" class="is-secondary" onclick="mpM6FounderClearReveal()">TORNA AL LAB</button></div>`;
   notice('Ricompensa virtuale ottenuta. Nessuna modifica a token o inventario reali.');
   refreshInventory();
 }
 function refreshInventory(){const el=document.getElementById('mp6FounderOwned');if(el)el.textContent='Cosmetici di test: '+S.owned.size+' · Ultimo: '+(S.revealed[0]||'nessuno');}
 function simulate(){const result=sample();if(!result){notice('Pool virtuale esaurito o nessuna rarità disponibile. Cambia pacchetto oppure resetta il Lab.');return;}reveal(result.id);}
 function show(){if(!S.admin)return;close();S.founderOpen=true;
   const c=db();const host=document.createElement('div');host.className='mp6-founder-overlay mp6-overlay';
   host.innerHTML=`<div class="mp6-modal-backdrop" onclick="mpM6FounderClose()"></div><section class="mp6-founder-dialog" role="dialog" aria-modal="true" aria-label="Laboratorio Founder">
    <header><div><small>FOUNDER · MODALITÀ TEST</small><h2>TOKEN VIRTUALI ∞</h2></div><button type="button" aria-label="Chiudi" onclick="mpM6FounderClose()">✕</button></header>
    <p>Questa sandbox non accredita token e non sblocca nulla nel tuo account reale. I test vengono cancellati chiudendo o resettando il laboratorio.</p>
    <div class="mp6-founder-grid"><div class="mp6-founder-panel"><strong>01 / ANTEPRIMA O ACQUISTO VIRTUALE</strong>
       <select id="mp6FounderSkin">${c.skins.map(s=>`<option value="${esc(s.id)}">${esc(s.title)} · ${esc(s.rarity)}</option>`).join('')}</select>
       <div class="mp6-founder-buttons"><button onclick="mpM6FounderPreview()">ANTEPRIMA CARTA</button><button onclick="mpM6FounderBuy()">SIMULA ACQUISTO ∞</button></div></div>
       <div class="mp6-founder-panel"><strong>02 / PACCHETTI</strong>
        <select id="mp6FounderPack">${c.packs.map(p=>`<option value="${esc(p.id)}">${esc(p.title)}</option>`).join('')}</select>
        <select id="mp6FounderRarity"><option value="auto">Rarità secondo probabilità reali</option><option value="common">Forza Comune</option><option value="rare">Forza Rara</option><option value="epic">Forza Epica</option><option value="legendary">Forza Leggendaria</option></select>
        <button onclick="mpM6FounderSimulate()">APRI PACCHETTO DI PROVA ∞</button></div></div>
     <div class="mp6-founder-panel"><strong>03 / INVENTARIO VIRTUALE</strong><p id="mp6FounderOwned"></p><button class="is-danger" onclick="mpM6FounderReset()">RESET SOLO LAB</button></div>
     <div id="mp6FounderReveal"></div><p id="mp6FounderStatus" role="status" aria-live="polite">Il saldo reale non viene toccato.</p>
     <button class="mp6-founder-done" onclick="mpM6FounderClose()">CHIUDI LABORATORIO</button></section>`;
   document.body.append(host);refreshInventory();host.querySelector('header button').focus();
 }
 async function mount(){const spot=document.getElementById('mp6FounderEntry');if(!spot)return;
   if(!S.checked&&typeof window.mpPromoSecureIsAdmin==='function'&&!S.checking){
     S.checking=true;try{S.admin=(await window.mpPromoSecureIsAdmin(true))===true;S.checked=true;}
     catch(e){S.admin=false;console.warn('M6 Founder: verifica amministratore fallita',e);}
     finally{S.checking=false;}
   }
   if(S.admin&&!spot.querySelector('button')){const b=document.createElement('button');b.type='button';b.textContent='✦ APRI FOUNDER LAB';b.onclick=show;spot.append(b);}
 }
 window.mpM6FounderMount=()=>{void mount();};
 window.mpM6FounderClose=close;
 window.mpM6Founder=show;
 window.mpM6FounderPreview=()=>window.mpM6Preview?.(pickSkin());
 window.mpM6FounderBuy=()=>reveal(pickSkin());
 window.mpM6FounderSimulate=simulate;
 window.mpM6FounderClearReveal=()=>{const r=document.getElementById('mp6FounderReveal');if(r)r.innerHTML='';};
 window.mpM6FounderReset=()=>{S.owned.clear();S.revealed=[];window.mpM6FounderClearReveal();refreshInventory();notice('Laboratorio virtuale azzerato. Account reale invariato.');};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&S.founderOpen&&!document.querySelector('.mp6-preview-overlay'))close();});
 window.MP_M6_FOUNDER_READY=true;window.mpM6FounderMount();
})();

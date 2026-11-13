/* ================================================================
   MATCHPULSE ULTIMATE TEAM — MACROBLOCCO 2
   Negozio · Pacchetti · Inventario · Carte cosmetiche
   Da caricare DOPO app.js e matchpulse-m1.js.
   Nessuna modifica a V8, promo, PlayStyle o partite.
   ================================================================ */
(function () {
  "use strict";
  if (window.MP_M2_READY) return;

  const VERSION = "M2.1";
  const MAIN = document.getElementById("app");
  const DB = {
    skins: "matchpulse_m2_skins",
    packs: "matchpulse_m2_packs",
    inventory: "matchpulse_m2_inventory",
    equipped: "matchpulse_m2_equipped",
    orders: "matchpulse_m2_orders",
    ledger: "matchpulse_m1_wallet_ledger"
  };
  const THEMES = {
    onepiece: {name:"ONE PIECE", mark:"☠", tagline:"GRAND LINE"},
    dragonball: {name:"DRAGON BALL", mark:"悟", tagline:"Z FIGHTERS"},
    cyberpunk: {name:"CYBERPUNK 2077", mark:"77", tagline:"NIGHT CITY"},
    formula1: {name:"FORMULA 1", mark:"F1", tagline:"GRAND PRIX"},
    matchpulse: {name:"MATCHPULSE", mark:"MP", tagline:"ORIGINAL"},
    any: {name:"TUTTE LE COLLEZIONI", mark:"✦", tagline:"RANDOM DROP"}
  };
  const RARITIES = {
    common: {name:"COMUNE", rank:1},
    rare: {name:"RARA", rank:2},
    epic: {name:"EPICA", rank:3},
    legendary: {name:"LEGGENDARIA", rank:4}
  };
  const S = {
    tab: "skins", theme: "all", collection: "", ready: false, loading: false,
    busy:false, error:"", lastLoad:0, userId:null,
    skins:[], packs:[], inventory:[], equipped:[], orders:[], ledger:[],
    pending:null, reveal:null, revealOpened:false
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch =>
      ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);
  }
  function todayRome() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone:"Europe/Rome", year:"numeric", month:"2-digit", day:"2-digit"
    }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map(x => [x.type,x.value]));
    const year = Number(p.year), month = Number(p.month);
    const startYear = month >= 9 ? year : year-1;
    return `${startYear}-${startYear+1}`;
  }
  function client() {
    return typeof matchpulseSupabase !== "undefined" ? matchpulseSupabase : null;
  }
  async function identity() {
    if (!client() || typeof mpEnsureClubAuth !== "function")
      throw Error("Connessione Supabase non disponibile. Controlla il Club.");
    const user = await mpEnsureClubAuth();
    if (!user?.id) throw Error("Sessione Supabase non disponibile.");
    return user.id;
  }
  function owned(skinId) {
    const season = todayRome();
    return S.inventory.some(i => i.user_id === S.userId &&
      i.season_id === season && i.skin_id === skinId);
  }
  function equippedId() {
    const season = todayRome();
    return S.equipped.find(x => x.season_id === season && x.user_id === S.userId)?.skin_id || null;
  }
  function findSkin(id) { return S.skins.find(x => x.id === id); }
  function findPack(id) { return S.packs.find(x => x.id === id); }
  function balance() {
    return S.ledger.filter(l => l.user_id === S.userId && l.season_id === todayRome())
      .reduce((value,l) => value + Number(l.amount || 0), 0);
  }
  
function eligibleSkins(pack) {
  return S.skins.filter(s =>
    s.active !== false &&
    !owned(s.id) &&
    (pack.theme === "any" || s.theme === pack.theme) &&
    (
      pack.id !== "pack_collaborazioni" ||
      ["onepiece","dragonball","cyberpunk","formula1"]
        .includes(s.theme)
    ) &&
    Number(pack[`${s.rarity}_weight`] || 0) > 0
  );
}

  
  function packOdds(pack) {
    const available = eligibleSkins(pack);
    const weights = Object.keys(RARITIES).map(rarity => ({
      rarity, weight: available.some(x => x.rarity === rarity)
        ? Number(pack[`${rarity}_weight`] || 0) : 0
    }));
    const total = weights.reduce((acc,x) => acc + x.weight, 0);
    return total ? weights.filter(x => x.weight > 0).map(x => ({
      ...x, percent: Math.round(x.weight * 10000 / total) / 100
    })) : [];
  }
  async function fetchData() {
    const db = client();
    if (!db) throw Error("Impossibile connettersi al database.");
    const season = todayRome();
    const entries = await Promise.all([
      db.from(DB.skins).select("*").eq("active",true).order("sort_order"),
      db.from(DB.packs).select("*").eq("active",true).order("sort_order"),
      db.from(DB.inventory).select("*").eq("user_id",S.userId).eq("season_id",season),
      db.from(DB.equipped).select("*").eq("user_id",S.userId).eq("season_id",season),
      db.from(DB.orders).select("*").eq("user_id",S.userId).eq("season_id",season).order("created_at",{ascending:false}).limit(40),
      db.from(DB.ledger).select("amount,user_id,season_id").eq("user_id",S.userId).eq("season_id",season)
    ]);
    for (const entry of entries) if (entry.error) throw entry.error;
    [S.skins,S.packs,S.inventory,S.equipped,S.orders,S.ledger] =
      entries.map(entry => entry.data || []);
  }
  let loadPromise = null;
  function load(force=false) {
    if (loadPromise) return loadPromise;
    if (!force && S.ready && Date.now()-S.lastLoad < 30000) return Promise.resolve();
    S.loading=true;
    if (route === "store") drawStore();
    loadPromise = (async () => {
      try {
        S.userId = await identity();
        await fetchData();
        S.error=""; S.ready=true; S.lastLoad=Date.now();
        decorateCards();
      } catch (e) {
        console.error("MATCHPULSE M2",e);
        S.error=e?.message || "Errore del negozio";
        S.ready=false;
      } finally {
        S.loading=false;
        loadPromise=null;
        if (route === "store") drawStore();
      }
    })();
    return loadPromise;
  }
  function badge(rarity) {
    return `<span class="mp-m2-rarity r-${esc(rarity)}">${esc(RARITIES[rarity]?.name||rarity)}</span>`;
  }
  function artForSkin(s, size="regular") {
    const theme = THEMES[s.theme] || THEMES.matchpulse;
    return `<div class="mp-m2-art mp-m2-art-${esc(s.theme)} mp-m2-art-${esc(s.css_theme)} ${size === "large" ? "large" : ""}" aria-hidden="true">
      <div class="mp-m2-art-grid"></div><span class="mp-m2-art-sigil">${esc(theme.mark)}</span>
      <span class="mp-m2-art-label">${esc(theme.tagline)}</span>
      <span class="mp-m2-art-sheen"></span>
    </div>`;
  }
  function artForPack(p) {
    const theme = THEMES[p.theme] || THEMES.any;
    return `<div class="mp-m2-pack-art mp-m2-pack-${esc(p.theme)}" aria-hidden="true">
      <div class="mp-m2-pack-light"></div><div class="mp-m2-pack-shell"><span class="mp-m2-pack-mark">${esc(theme.mark)}</span>
      <span class="mp-m2-pack-word">MATCHPULSE</span><span class="mp-m2-pack-seam"></span>
      <strong>PACK</strong></div></div>`;
  }
  // M6: catalogo a collezioni; tutte le immagini sono file individuali.
  const M6_FILES={
    mp_gold_dynasty:'fc_comune.webp',mp_icebreak:'fc_rara.webp',mp_neon_pulse:'fc_epica.webp',mp_blackout:'fc_leggendaria.webp',
    op_nakama:'op_rara.webp',op_ocean_epic:'op_epica.webp',op_gear:'op_leggendaria.webp',
    db_saiyan:'db_rara.webp',db_aura_epic:'db_epica.webp',db_ultra:'db_leggendaria.webp',
    cp_edge:'cp_rara.webp',cp_neon_epic:'cp_epica.webp',cp_samurai:'cp_leggendaria.webp',
    f1_pole:'f1_rara.webp',f1_racing_epic:'f1_epica.webp',f1_champ:'f1_leggendaria.webp',
    op_straw:'onepiece.png',db_kame:'dragonball.png',cp_night:'cyberpunk.png',f1_grid:'formula1.png'
  };
  const M6_COLLECTIONS={
    matchpulse:{name:'FC ORIGINALS',tag:'LE ORIGINALI MATCHPULSE',description:'Quattro estetiche originali, una per rarità, senza modificare OVR e statistiche.'},
    onepiece:{name:'ONE PIECE',tag:'GRAND LINE',description:'Il richiamo dell’oceano, delle vele e del cappello di paglia.'},
    dragonball:{name:'DRAGON BALL',tag:'AWAKENING',description:'Energia, Sfere del Drago e luce da battaglia.'},
    cyberpunk:{name:'CYBERPUNK 2077',tag:'NIGHT CITY',description:'Neon, metropoli futuristiche e tecnologia.'},
    formula1:{name:'FORMULA 1',tag:'GRAND PRIX',description:'Carbonio, velocità e circuiti da leggenda.'}
  };
  const M6_TIER={common:['COMUNE','FC Originals: skin completa. Collaborazioni: emblema esterno.'],rare:['RARA','FC Originals: skin completa. Collaborazioni: decorazioni tematiche.'],epic:['EPICA','FC Originals: skin completa. Collaborazioni: cornice scolpita.'],legendary:['LEGGENDARIA','Skin completa, esclusiva e ricca di dettagli.']};
  
const m6Asset = id => {
  const file = M6_FILES[id];
  if (!file) return '';

  const isBadge = [
    'op_straw',
    'db_kame',
    'cp_night',
    'f1_grid'
  ].includes(id);

  const folder = isBadge
    ? 'mp-m4-art/'
    : 'mp-m5-art/';

  return folder + file + '?v=fix-m6-assets';
};

const m6Cover = theme => {
  const covers = {
    matchpulse: 'fc_leggendaria.webp',
    onepiece: 'op_leggendaria.webp',
    dragonball: 'db_leggendaria.webp',
    cyberpunk: 'cp_leggendaria.webp',
    formula1: 'f1_leggendaria.webp',
    any: 'fc_epica.webp'
  };

  return 'mp-m5-art/' +
    (covers[theme] || covers.matchpulse) +
    '?v=fix-m6-assets';
};

  const m6Has=id=>owned(id);
  const m6Active=id=>id==='op_straw'||id==='db_kame'||id==='cp_night'||id==='f1_grid'
    ? window.mpM4Inspect?.().emblem===id : equippedId()===id;
  function m6Artwork(s){
    const file=m6Asset(s.id), common=s.rarity==='common'&&s.theme!=='matchpulse';
    if(!file)return `<div class="mp6-placeholder">ILLUSTRAZIONE IN PREPARAZIONE</div>`;
    return `<div class="mp6-art-frame ${common?'mp6-common':''}"><img src="${file}" alt="" loading="eager" decoding="async"><span class="mp6-art-type">${s.theme==='matchpulse'?'SKIN ORIGINALE':common?'EMBLEMA':s.rarity==='rare'?'DECORAZIONE':s.rarity==='epic'?'CORNICE 3D':'SKIN COMPLETA'}</span></div>`;
  }
  function m6RarityGuide(mode='collab'){return `<div class="mp6-rarity-guide">${Object.entries(M6_TIER).map(([id,[name,desc]])=>
    `<div class="mp6-rarity-item mp6-tier-${id}"><i></i><strong>${name}</strong><span>${mode==='fc'?({common:'Skin originale sobria e raffinata.',rare:'Skin più decorata e ricca di materiali.',epic:'Skin architettonica scenografica.',legendary:'Skin più elaborata, con effetti premium.'}[id]):desc}</span></div>`).join('')}</div>`;}
  function m6SkinCard(s,fromInventory=false){
    const mine=m6Has(s.id),equipped=m6Active(s.id), tier=M6_TIER[s.rarity]||['ESTETICA',''];
    let action;
    if(fromInventory)action=`<button class="mp6-action" type="button" onclick="mpM6Equip('${esc(s.id)}')">${equipped?'RIMUOVI':'EQUIPAGGIA'}</button>`;
    else if(mine)action=`<button class="mp6-action mp6-owned" onclick="mpM2Tab('inventory')">GIÀ TUA ✓</button>`;
    else action=`<button class="mp6-action" type="button" ${S.busy?'disabled':''} onclick="mpM2Open('skin','${esc(s.id)}')">ACQUISTA</button>`;
    return `<article class="mp6-cosmetic mp6-tier-${esc(s.rarity)}" data-cosmetic-id="${esc(s.id)}">
      <div class="mp6-cosmetic-top">${m6Artwork(s)}<span class="mp6-rarity-pill">${tier[0]}</span></div>
      <div class="mp6-cosmetic-copy"><small>${esc(M6_COLLECTIONS[s.theme]?.name||s.theme)}</small><h4>${esc(s.title)}</h4><p>${esc(s.description)}</p>
      <div class="mp6-cosmetic-foot"><b>✦ ${Number(s.price)||0}</b><div class="mp6-cosmetic-buttons"><button class="mp6-action mp6-outline" onclick="mpM6Preview('${esc(s.id)}')">ANTEPRIMA</button>${action}</div></div>
      </div></article>`;
  }
  function m6CollectionPanel(theme){
    const entries=S.skins.filter(x=>x.theme===theme&&x.active!==false).sort((a,b)=>RARITIES[a.rarity].rank-RARITIES[b.rarity].rank);
    const info=M6_COLLECTIONS[theme];
    return `<section class="mp6-focused" data-theme="${theme}">
      <div class="mp6-focused-heading"><button class="mp6-back" onclick="mpM6Collection('')">← COLLEZIONI</button><div><small>${info.tag}</small><h3>${info.name}</h3><p>${info.description}</p></div></div>
      <div class="mp6-showcase">${entries.map(s=>m6SkinCard(s)).join('')||'<p>Catalogo temporaneamente non disponibile.</p>'}</div>
    </section>`;
  }
  function m6CollectionTile(theme){const x=M6_COLLECTIONS[theme];return `<button class="mp6-collection-tile" type="button" data-theme="${theme}" onclick="mpM6Collection('${theme}')"><img src="${m6Cover(theme)}" alt="" loading="lazy"><span><small>${x.tag}</small><strong>${x.name}</strong><em>ESPLORA LA COLLEZIONE ↗</em></span></button>`;}
  
function m6PackCard(p) {
  const odds = packOdds(p);
  const disabled = odds.length === 0;
  const collab = p.id === "pack_collaborazioni";
  const kind = p.theme === "any" ? "matchpulse" : p.theme;

  const picture = collab
    ? `<div class="mp6-pack-collab-images">
        ${["onepiece","dragonball","cyberpunk","formula1"]
          .map(t => `<img src="${m6Cover(t)}" alt="">`)
          .join("")}
       </div>`
    : `<img src="${m6Cover(kind)}" alt="" loading="lazy">`;

  const label = collab
    ? "QUATTRO UNIVERSI"
    : p.theme === "matchpulse"
      ? "FC ORIGINALS"
      : "TUTTE LE COLLEZIONI";

  return `
    <article class="mp6-pack">
      <div class="mp6-pack-picture">
        <div class="mp6-pack-tilt">
          ${picture}
          <span>MATCHPULSE</span>
          <strong>PACK</strong>
        </div>
      </div>
      <div class="mp6-pack-info">
        <small>${label}</small>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.description)}</p>

        <div class="mp6-odds">
          ${odds.length
            ? odds.map(o =>
                `<span>${RARITIES[o.rarity].name}
                  <b>${o.percent}%</b></span>`
              ).join("")
            : "<span>POOL ESAURITO</span>"}
        </div>

        <div class="mp6-pack-footer">
          <b>✦ ${Number(p.price) || 0}</b>
          <div class="mp6-pack-actions">
            <button class="mp6-action mp6-outline"
              onclick="mpM2PreviewPack('${esc(p.id)}')">
              ANTEPRIMA
            </button>
            <button class="mp6-action"
              ${disabled || S.busy ? "disabled" : ""}
              onclick="mpM2Open('pack','${esc(p.id)}')">
              ${disabled ? "ESAURITO" : "ACQUISTA E APRI"}
            </button>
          </div>
        </div>
      </div>
    </article>`;
}

  function drawStore(){
    if(!MAIN||route!=='store')return;
    const total=S.skins.filter(s=>s.active!==false).length;
    const mine=S.skins.filter(s=>m6Has(s.id));
    MAIN.innerHTML=`<section class="mp6-store mp-m2-page"><header class="mp6-hero"><small>MATCHPULSE / COLLEZIONI COSMETICHE</small><h2>LA TUA CARTA.<br><em>IL TUO STILE.</em></h2><p>Estetiche originali e collaborazioni. Nessun aumento di OVR o statistiche.</p>
      <div class="mp6-wallet"><div><small>SALDO STAGIONE ${esc(todayRome().replace('-','/'))}</small><strong>✦ ${S.ready?balance():'—'}</strong></div><button onclick="setRoute('challenges')">GUADAGNA TOKEN ↗</button></div>
      <div class="mp6-founder-entry" id="mp6FounderEntry"></div></header>
      <nav class="mp6-tabs" aria-label="Sezioni del Negozio" role="tablist">${[['skins','COSMETICHE'],['packs','PACCHETTI'],['inventory','INVENTARIO']].map(([id,name])=>
        `<button role="tab" aria-selected="${S.tab===id}" class="${S.tab===id?'active':''}" onclick="mpM2Tab('${id}')">${name}</button>`).join('')}</nav>
      ${S.error?`<div class="mp6-error"><b>Negozio non disponibile</b><p>${esc(S.error)}</p><button onclick="mpM2Retry()">RIPROVA</button></div>`:''}
      ${!S.ready?'<p class="mp6-loading">Caricamento catalogo e saldo…</p>':S.tab==='skins'?
        (S.collection?m6CollectionPanel(S.collection):`<section class="mp6-intro"><small>01 / ESTETICHE ESCLUSIVE</small><h3>FC ORIGINALS</h3><p>Quattro estetiche originali di MatchPulse, applicabili a qualsiasi carta senza modificare statistiche e OVR.</p>${m6RarityGuide('fc')}
         <div class="mp6-showcase">${S.skins.filter(s=>s.theme==='matchpulse'&&s.active!==false).sort((a,b)=>RARITIES[a.rarity].rank-RARITIES[b.rarity].rank).map(s=>m6SkinCard(s)).join('')}</div></section>
         <section class="mp6-intro"><small>02 / COLLEZIONI TEMATICHE</small><h3>COLLABORAZIONI</h3><p>Apri una collezione per vedere Comune, Rara, Epica e Leggendaria, con anteprima sulla tua carta.</p>
         <div class="mp6-collection-tiles">${['onepiece','dragonball','cyberpunk','formula1'].map(m6CollectionTile).join('')}</div></section>`)
      :S.tab==='packs'?`<section class="mp6-intro"><small>02 / APERTURA PACCHETTI</small><h3>PACCHETTI</h3><p>Probabilità effettive: le rarità esaurite vengono escluse. Nessun doppione.</p>
        <div class="mp6-packs">${S.packs.filter(p=>p.active!==false).map(m6PackCard).join('')}</div></section>`:
        `<section class="mp6-intro"><small>03 / OGGETTI POSSEDUTI</small><h3>IL MIO INVENTARIO</h3><p>${mine.length} di ${total} cosmetici sbloccati nella stagione attuale.</p>
        <div class="mp6-equipped-summary"><span>ESTETICA ATTIVA: <b>${esc(findSkin(equippedId())?.title||'CARTA ORIGINALE')}</b></span><button onclick="mpM6Equip('')" ${!equippedId()?'disabled':''}>RIMUOVI SKIN</button></div>
        <div class="mp6-equipped-summary"><span>EMBLEMA ESTERNO: <b>${esc(findSkin(window.mpM4Inspect?.().emblem)?.title||'NESSUNO')}</b></span><button onclick="mpM6Equip('REMOVE_BADGE')">RIMUOVI EMBLEMA</button></div>
        ${mine.length?`<div class="mp6-showcase">${mine.sort((a,b)=>RARITIES[a.rarity].rank-RARITIES[b.rarity].rank).map(s=>m6SkinCard(s,true)).join('')}</div>`:'<p>Non hai ancora cosmetici acquistati.</p>'}
        <p class="mp6-inventory-footnote">Oggetti cosmetici disponibili nella stagione in cui sono stati ottenuti. Le promo non vengono modificate.</p></section>`}
      </section>`;
    window.mpM6FounderMount?.();
  }
  function toastMessage(message) {
    if (typeof toast === "function") toast(message);
    else console.info("MATCHPULSE M2",message);
  }
  function requestId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6]=(bytes[6]&0x0f)|0x40;
      bytes[8]=(bytes[8]&0x3f)|0x80;
      return Array.from(bytes,(x,i) => [4,6,8,10].includes(i)?"-"+x.toString(16).padStart(2,"0"):x.toString(16).padStart(2,"0")).join("");
    }
    throw Error("Questa connessione non supporta acquisti sicuri. Apri MatchPulse in HTTPS.");
  }
  function overlay(fragment) {
    document.querySelector(".mp-m2-modal-host")?.remove();
    const host=document.createElement("div");
    host.className="mp-m2-modal-host";
    host.innerHTML=fragment;
    document.body.appendChild(host);
  }
  function closeOverlay() {
    S.pending=null;S.reveal=null;S.revealOpened=false;
    document.querySelector(".mp-m2-modal-host")?.remove();
  }
  function openPurchase(kind,id) {
    if (!S.ready || S.busy) return;
    const product = kind === "skin" ? findSkin(id) : findPack(id);
    if (!product) return;
    if (kind === "skin" && owned(product.id)) return;
    if (kind === "pack" && !eligibleSkins(product).length) return;
    S.pending={kind,id,requestId:requestId()};
    const insufficient=balance()<Number(product.price);
    const odds = kind === "pack" ? packOdds(product) : [];
    overlay(`<div class="mp-m2-shade" onclick="mpM2Close()"></div>
      <div class="mp-m2-dialog" role="dialog" aria-modal="true" aria-label="Conferma acquisto">
        <button class="mp-m2-x" onclick="mpM2Close()" aria-label="Chiudi">×</button>
        <span class="mp-m2-kicker">CONFERMA ACQUISTO</span><h2>${esc(product.title)}</h2>
        <p>${esc(product.description)}</p>
        ${kind === "pack" ? `<div class="mp-m2-confirm-odds">${odds.map(x=>
          `<span>${esc(RARITIES[x.rarity].name)} <strong>${x.percent}%</strong></span>`).join("")}</div>` : ""}
        <div class="mp-m2-confirm-row"><span>IL TUO SALDO</span><strong>✦ ${balance()}</strong></div>
        <div class="mp-m2-confirm-row"><span>PREZZO</span><strong>✦ ${Number(product.price)}</strong></div>
        ${insufficient ? '<div class="mp-m2-warning">Non hai abbastanza token. Completa le Sfide per guadagnarne.</div>' : ""}
        <button class="mp-m2-confirm-buy" ${insufficient ? "disabled" : ""} onclick="mpM2Confirm()">${kind==="pack"?"COMPRA E APRI":"CONFERMA ACQUISTO"}</button>
        <button class="mp-m2-cancel" onclick="mpM2Close()">ANNULLA</button>
      </div>`);
  }
  async function updateM1Wallet() {
    try { if (typeof window.mpM1RefreshWallet === "function") await window.mpM1RefreshWallet(); }
    catch (e) { console.warn("MATCHPULSE M2: aggiornamento Sfide",e); }
  }
  async function confirmPurchase() {
    if (!S.pending || S.busy) return;
    S.busy=true;
    const pending={...S.pending};
    const buyButton=document.querySelector(".mp-m2-confirm-buy");
    if (buyButton) { buyButton.disabled=true;buyButton.textContent="ACQUISTO IN CORSO…"; }
    try {
      const {data,error}=await client().rpc("mp_m2_buy",{
        p_product_type:pending.kind,p_product_id:pending.id,p_request_id:pending.requestId
      });
      if (error) throw error;
      const result=data;
      if (!result?.skin_id) throw Error("Il server non ha restituito la skin.");
      closeOverlay();
      await load(true);
      // Se la rete cade durante il refresh, la proprietà rimane comunque salvata sul server.
      const skin = findSkin(result.skin_id) || {id:result.skin_id,title:result.skin_id,rarity:"common",theme:"matchpulse",css_theme:""};
      if (pending.kind === "pack") {
        S.reveal={skin,pack:findPack(pending.id)};
        S.revealOpened=false;
        showReveal();
      } else {
        toastMessage(`Skin ${skin.title} acquistata!`);
        S.reveal={skin,pack:null};S.revealOpened=false;showReveal();
      }
      await updateM1Wallet();
    } catch(e) {
      console.error("MATCHPULSE M2 PURCHASE",e);
      toastMessage(e?.message || "Acquisto non riuscito.");
      // Non cambiare requestId: ripetere lo stesso acquisto è idempotente.
      if (buyButton) {buyButton.disabled=false;buyButton.textContent="RIPROVA ACQUISTO";}
    } finally {S.busy=false;}
  }
  
function showReveal() {
  if (!S.reveal) return;

  const { skin, pack } = S.reveal;
  const demo = Boolean(S.reveal.demo);
  const collab = pack?.id === "pack_collaborazioni";

  const cover = collab
    ? `<div class="mp6-pack-collab-images">
        ${["onepiece","dragonball","cyberpunk","formula1"]
          .map(t => `<img src="${m6Cover(t)}" alt="">`)
          .join("")}
       </div>`
    : `<img class="mp6-pack-open-cover"
        src="${m6Cover(
          pack?.theme && pack.theme !== "any"
            ? pack.theme : "matchpulse"
        )}" alt="">`;

  overlay(`
    <div class="mp-m2-shade"
      onclick="mpM2FinishReveal()"></div>

    <div class="mp-m2-reveal" role="dialog"
      aria-modal="true" aria-label="Apertura pacchetto">

      <button class="mp6-reveal-x"
        onclick="mpM2FinishReveal()"
        aria-label="Chiudi">✕</button>

      <p class="mp-m2-kicker">
        ${demo
          ? "ANTEPRIMA GRATUITA"
          : "MATCHPULSE / APERTURA REALE"}
      </p>

      <div class="mp-m2-reveal-scene">
        <div class="mp-m2-reveal-sealed">
          ${cover}
          <span>✦</span>
          <strong>${esc(pack?.title || "MATCHPULSE PACK")}</strong>
          <small>TOCCA PER APRIRE</small>
        </div>

        <div class="mp-m2-reveal-skin">
          ${m6Artwork(skin)}
          ${badge(skin.rarity || "common")}
        </div>
      </div>

      <div class="mp-m2-reveal-footer">
        <h2>${esc(pack?.title || "NUOVA ESTETICA")}</h2>
        <p>${demo
          ? "Estrazione dimostrativa: non spendi token e non ottieni l’oggetto."
          : "La ricompensa è stata assegnata al tuo inventario."}
        </p>
        <button class="mp-m2-confirm-buy"
          onclick="mpM2RevealOpen()">
          APRI IL PACCHETTO ✦
        </button>
      </div>
    </div>`);
}

function previewReward(pack, forcedSkinId = "") {
  if (!pack) return;

  let skin = forcedSkinId ? findSkin(forcedSkinId) : null;

  if (!skin) {
    const pool = eligibleSkins(pack);
    const tiers = packOdds(pack);

    let n = Math.random() *
      tiers.reduce((a, x) => a + x.percent, 0);

    let rarity = tiers[tiers.length - 1]?.rarity;

    for (const tier of tiers) {
      n -= tier.percent;

      if (n <= 0) {
        rarity = tier.rarity;
        break;
      }
    }

    const options = pool.filter(
      x => x.rarity === rarity
    );

    skin = options[
      Math.floor(Math.random() * options.length)
    ];
  }

  if (!skin) {
    toastMessage("Nessuna estetica disponibile per questa anteprima.");
    return;
  }

  S.reveal = { skin, pack, demo: true };
  S.revealOpened = false;
  showReveal();
}

  function decorateCards() {
    const skin = findSkin(equippedId());
    const apply = root => {
      if (!root) return;
      root.querySelectorAll(".player-card").forEach(card => {
        if (card.closest(".mp-m2-product")) return;
        if (card.classList.contains("mp-promo-card") || card.dataset.promoCard === "true") return;
        card.classList.toggle("mp-m2-card-equipped", Boolean(skin) && !["op_straw","db_kame","cp_night","f1_grid"].includes(skin.id));
        if (skin && !["op_straw","db_kame","cp_night","f1_grid"].includes(skin.id)) {
          card.setAttribute("data-m2-theme",skin.theme);
          card.setAttribute("data-m2-skin",skin.css_theme);
          card.setAttribute("data-m2-title",skin.title);
        } else {
          card.removeAttribute("data-m2-theme");
          card.removeAttribute("data-m2-skin");
          card.removeAttribute("data-m2-title");
        }
      });
    };
    if (route === "home") apply(MAIN);
  }
  async function equip(skinId) {
    if (S.busy || !S.ready) return;
    S.busy=true;
    try {
      const {error}=await client().rpc("mp_m2_equip",{
        p_skin_id:skinId || null
      });
      if (error) throw error;
      await load(true);
      toastMessage(skinId ? "Skin equipaggiata!" : "Carta originale ripristinata.");
      closeOverlay();
      S.tab="inventory";
      if(route === "store") drawStore();
      decorateCards();
    } catch(e) {
      console.error("MATCHPULSE M2 EQUIP",e);
      toastMessage(e?.message||"Impossibile equipaggiare la skin.");
    } finally {
      S.busy=false;
      if (route === "store" && !S.reveal) drawStore();
    }
  }
  // Integra la grafica corrente nella carta base del Club del proprietario.
  // La visibilità delle skin DEGLI ALTRI MEMBRI sarà completata nel M3.
  const originalClubCard=typeof window.mpClubMemberCard === "function" ? window.mpClubMemberCard : null;
  if (originalClubCard) {
    const wrappedClubCard=function(member,ownerId,...rest) {
      const result=originalClubCard.call(this,member,ownerId,...rest);
      if (member?.user_id !== S.userId || !equippedId() || !S.ready ||
          member?.card_stats?.promoCard === true || typeof result !== "string") return result;
      const skin=findSkin(equippedId());
      if(!skin) return result;
      const holder=document.createElement("div");holder.innerHTML=result;
      const card=holder.querySelector(".mp-club-home-card.player-card");
      if(card) {
        card.classList.add("mp-m2-card-equipped");
        card.dataset.m2Theme=skin.theme;
        card.dataset.m2Skin=skin.css_theme;
        card.dataset.m2Title=skin.title;
      }
      return holder.innerHTML;
    };
    window.mpClubMemberCard=wrappedClubCard;
    try { mpClubMemberCard=wrappedClubCard; } catch{}
  }

  // Il router del M1 è già installato. Sostituiamo SOLO la pagina Negozio.
  const oldRender=render;
  render=function (...args) {
    if (route === "store") {
      drawStore();
      void load(false);
      return;
    }
    const out=oldRender.apply(this,args);
    if(route === "home") decorateCards();
    return out;
  };
  window.render=render;
  const oldRenderHome=renderHome;
  renderHome=function (...args) {
    const result=oldRenderHome.apply(this,args);
    decorateCards();
    return result;
  };
  window.renderHome=renderHome;
  window.mpM2Tab = id => {
    if (!["skins","packs","inventory"].includes(id)) return;
    S.tab=id;S.collection="";drawStore();
  };
  window.mpM6Collection = id => { if(id && !M6_COLLECTIONS[id]) return; S.collection=id;drawStore();window.scrollTo(0,0); };
  window.mpM6Catalog = () => ({skins:S.skins.map(x=>({...x})), packs:S.packs.map(x=>({...x})),owned:new Set(S.inventory.map(x=>x.skin_id)),wallet:balance(),season:todayRome(),userId:S.userId});
  window.mpM2Theme = id => {
    if (id !== "all" && !THEMES[id]) return;
    S.theme=id;drawStore();
  };
  window.mpM2Retry = () => void load(true);
  window.mpM2Open = openPurchase;
  window.mpM2Close = closeOverlay;
  window.mpM2Confirm = confirmPurchase;
  window.mpM2Equip = equip;
  window.mpM6Equip=async id=>{
    if(id==='REMOVE_BADGE'){if(typeof window.mpM4Equip==='function')await window.mpM4Equip('');drawStore();return;}
    if(id && !findSkin(id))return;
    if(id && findSkin(id)?.rarity==='common' && findSkin(id)?.theme!=='matchpulse'){
      if(typeof window.mpM4Equip!=='function'){alert('Installa prima il modulo M4 emblemi.');return;}
      const old=window.mpM4Inspect?.().emblem;
      await window.mpM4Equip(old===id?'':id);drawStore();return;
    }
    await equip(equippedId()===id ? null : id);drawStore();
  };
  

window.mpM2PreviewPack = id =>
  previewReward(findPack(id));

window.mpM2PreviewReward = (skinId, packId) => {
  const skin = findSkin(skinId);
  if (!skin) return;

  previewReward(
    findPack(packId) || findPack("pack_classic"),
    skin.id
  );
};

window.mpM2RevealOpen = () => {
  if (!S.reveal || S.revealOpened) return;

  const opened = S.reveal;
  const scene = document.querySelector(
    ".mp-m2-reveal-scene"
  );
  if (!scene) return;

  S.revealOpened = true;

  const button = document.querySelector(
    ".mp-m2-reveal-footer .mp-m2-confirm-buy"
  );

  if (button) {
    button.disabled = true;
    button.textContent = "APERTURA IN CORSO…";
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (scene.isConnected && S.reveal === opened) {
        scene.classList.add("is-open");
      }
    });
  });

  setTimeout(() => {
    if (S.reveal !== opened || !scene.isConnected) return;

    const footer = document.querySelector(
      ".mp-m2-reveal-footer"
    );
    if (!footer) return;

    const title = esc(opened.skin.title);
    const theme = esc(
      THEMES[opened.skin.theme]?.name ||
      opened.skin.theme
    );

    footer.innerHTML = opened.demo
      ? `<h2>${title}</h2>
         <p>${theme} · SIMULAZIONE: nessun acquisto o token speso.</p>
         <button class="mp-m2-confirm-buy"
           onclick="mpM2FinishReveal()">
           CHIUDI ANTEPRIMA
         </button>`
      : `<h2>${title}</h2>
         <p>${theme} · Estetica aggiunta al tuo inventario.</p>
         <button class="mp-m2-confirm-buy"
           onclick="mpM6Equip('${esc(opened.skin.id)}')">
           EQUIPAGGIA ORA
         </button>
         <button class="mp-m2-cancel"
           onclick="mpM2FinishReveal()">
           VAI ALL'INVENTARIO
         </button>`;
  }, 1000);
};

window.mpM2FinishReveal = () => {
  const demo = Boolean(S.reveal?.demo);

  closeOverlay();

  if (!demo) {
    S.tab = "inventory";
    if (route === "store") drawStore();
  }
};

  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.mp-m2-modal-host'))window.mpM2Close();});
  window.mpM2AfterWalletChange = () => { S.lastLoad=0; void load(true); };
  window.mpM2Inspect=()=>({
    version:VERSION, backendReady:S.ready, backendError:S.error,
    season:todayRome(), wallet:balance(), ownedSkins:S.inventory.length,
    equippedSkin:equippedId(), packs:S.packs.length, catalogue:S.skins.length
  });
  window.MP_M2_READY=true;
  void load(false);
})();

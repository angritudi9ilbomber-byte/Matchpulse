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
    legendary: {name:"LEGGENDARIA", rank:3}
  };
  const S = {
    tab: "skins", theme: "all", ready: false, loading: false,
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
    return S.skins.filter(s => s.active !== false && !owned(s.id) &&
      (pack.theme === "any" || s.theme === pack.theme) &&
      Number(pack[`${s.rarity}_weight`] || 0) > 0);
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
  function skinCard(s, inventoryMode=false) {
    const has = owned(s.id);
    const current = equippedId() === s.id;
    const action = inventoryMode
      ? `<button class="mp-m2-action ${current ? "is-equipped" : ""}" ${S.busy ? "disabled" : ""} onclick="mpM2Equip('${esc(current ? "" : s.id)}')">${current ? "RIMUOVI" : "EQUIPAGGIA"}</button>`
      : has
        ? `<button class="mp-m2-action is-owned" onclick="mpM2Tab('inventory')">GIÀ TUA ✓</button>`
        : `<button class="mp-m2-action" ${S.busy || !S.ready ? "disabled" : ""} onclick="mpM2Open('skin','${esc(s.id)}')">ACQUISTA</button>`;
    return `<article class="mp-m2-product">
      <div class="mp-m2-art-wrap">${artForSkin(s)}${badge(s.rarity)}</div>
      <div class="mp-m2-product-info"><span class="mp-m2-theme-name">${esc(THEMES[s.theme]?.name||s.theme)}</span>
      <h3>${esc(s.title)}</h3><p>${esc(s.description)}</p>
      <div class="mp-m2-buy-row"><span class="mp-m2-cost">✦ ${Number(s.price)||0}</span>${action}</div></div>
    </article>`;
  }
  function packCard(p) {
    const odds = packOdds(p);
    const soldout = !odds.length;
    return `<article class="mp-m2-pack-item">
      ${artForPack(p)}
      <div class="mp-m2-pack-details"><span class="mp-m2-theme-name">${esc(THEMES[p.theme]?.name||"")}</span>
      <h3>${esc(p.title)}</h3><p>${esc(p.description)}</p>
      <div class="mp-m2-odds">${odds.length ? odds.map(x => `<span>${esc(RARITIES[x.rarity].name)} <b>${x.percent}%</b></span>`).join("") : '<span class="is-empty">NESSUNA SKIN DISPONIBILE</span>'}</div>
      <div class="mp-m2-buy-row"><span class="mp-m2-cost">✦ ${Number(p.price)||0}</span>
        <button class="mp-m2-action" ${soldout || S.busy ? "disabled" : ""} onclick="mpM2Open('pack','${esc(p.id)}')">${soldout ? "ESAURITO" : "APRI PACCHETTO"}</button>
      </div></div>
    </article>`;
  }
  function drawStore() {
    if (!MAIN || route !== "store") return;
    const selected = Object.entries(THEMES).filter(([id]) => !["any","matchpulse"].includes(id));
    const catalog = S.skins.filter(x => x.active !== false && (S.theme === "all" || x.theme === S.theme));
    const mine = S.skins.filter(x => owned(x.id));
    MAIN.innerHTML = `<section class="mp-m2-page mp-m1-page">
      <div class="mp-m2-hero"><div class="mp-m2-hero-grid"></div>
        <div class="mp-m2-title-block"><p class="mp-m2-kicker">MATCHPULSE / ULTIMATE TEAM</p>
          <h2>THE <em>STORE</em></h2><p>La tua carta. Il tuo stile. Nessun boost alle statistiche.</p></div>
        <div class="mp-m2-wallet"><small>SALDO · STAGIONE ${esc(todayRome().replace("-","/"))}</small>
          <strong>✦ ${S.ready ? balance() : "—"}</strong>
          <button type="button" onclick="setRoute('challenges')">GUADAGNA TOKEN ↗</button></div>
      </div>
      <div class="mp-m2-utility-tabs" role="tablist">
        ${[["skins","ESTETICHE"],["packs","PACCHETTI"],["inventory","IL MIO INVENTARIO"]]
          .map(([id,name]) => `<button type="button" role="tab" aria-selected="${S.tab===id}" class="${S.tab===id?"active":""}" onclick="mpM2Tab('${id}')">${name}</button>`).join("")}
      </div>
      ${S.error ? `<div class="mp-m2-message error"><strong>Negozio non disponibile</strong><p>${esc(S.error)}</p><button onclick="mpM2Retry()">RIPROVA</button></div>` : ""}
      ${S.loading && !S.ready ? '<div class="mp-m2-message">Connessione al negozio…</div>' : ""}
      ${S.ready ? (S.tab === "skins" ? `
          <div class="mp-m2-section-title"><div><span>01 / COLLEZIONI</span><h3>SKIN ESCLUSIVE</h3></div><small>${catalog.length} estetiche</small></div>
          <div class="mp-m2-theme-filter"><button class="${S.theme==="all"?"active":""}" onclick="mpM2Theme('all')">TUTTE</button>
          ${selected.map(([id,t]) => `<button class="${S.theme===id?"active":""}" onclick="mpM2Theme('${id}')">${esc(t.name)}</button>`).join("")}</div>
          <div class="mp-m2-skin-grid">${catalog.map(x => skinCard(x)).join("") || '<div class="mp-m2-message">Nessuna skin.</div>'}</div>
        ` : S.tab === "packs" ? `
          <div class="mp-m2-section-title"><div><span>02 / DROP</span><h3>PACCHETTI MISTERIOSI</h3></div><small>1 SKIN GARANTITA</small></div>
          <div class="mp-m2-hint">Le probabilità cambiano se esaurisci alcune rarità. Il negozio mostra sempre le probabilità effettive prima dell'acquisto. Niente doppioni.</div>
          <div class="mp-m2-pack-grid">${S.packs.map(x => packCard(x)).join("")}</div>
        ` : `
          <div class="mp-m2-section-title"><div><span>03 / COLLEZIONE</span><h3>LE MIE SKIN</h3></div><small>${mine.length} / ${S.skins.length}</small></div>
          <div class="mp-m2-inventory-head"><span>${equippedId() ? "SKIN ATTIVA: "+esc(findSkin(equippedId())?.title || "") : "CARTA BASE ORIGINALE EQUIPAGGIATA"}</span>
           <button ${equippedId() ? "" : "disabled"} onclick="mpM2Equip('')">RIMUOVI SKIN</button></div>
          ${mine.length ? `<div class="mp-m2-skin-grid">${mine.map(x => skinCard(x,true)).join("")}</div>` : `<div class="mp-m2-message">Non hai ancora skin. Vai su Estetiche o Pacchetti per iniziare la tua collezione.</div>`}
          <p class="mp-m2-hint">Le skin sono equipaggiabili soltanto durante la stagione in cui vengono ottenute. Le carte promo non vengono modificate.</p>
          ${S.orders.length ? `<div class="mp-m2-orders"><h3>ULTIMI ACQUISTI</h3>${S.orders.slice(0,8).map(x =>
            `<div><span>${esc(findSkin(x.skin_id)?.title||x.skin_id)}</span><small>✦ ${Number(x.cost)||0}</small></div>`).join("")}</div>` : ""}
        `) : ""}
    </section>`;
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
        S.tab="inventory";
        if (route === "store") drawStore();
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
    const skin=S.reveal.skin;
    const rarity=skin.rarity || "common";
    overlay(`<div class="mp-m2-shade"></div><div class="mp-m2-reveal" role="dialog" aria-modal="true" aria-label="Apertura pacchetto">
      <p class="mp-m2-kicker">MATCHPULSE / PACK REVEAL</p>
      <div class="mp-m2-reveal-scene ${S.revealOpened?"is-open":""}">
        <div class="mp-m2-reveal-sealed"><span>✦</span><strong>ULTIMATE PACK</strong><small>TOCCA PER APRIRE</small></div>
        <div class="mp-m2-reveal-skin">${artForSkin(skin,"large")}${badge(rarity)}</div>
      </div>
      <div class="mp-m2-reveal-footer"><h2>${S.revealOpened?esc(skin.title):"COSA HAI TROVATO?"}</h2>
      <p>${S.revealOpened ? esc(THEMES[skin.theme]?.name||skin.theme) : "Una skin è già stata assegnata al tuo inventario."}</p>
      ${S.revealOpened ? `<button class="mp-m2-confirm-buy" onclick="mpM2Equip('${esc(skin.id)}')">EQUIPAGGIA ORA</button>
        <button class="mp-m2-cancel" onclick="mpM2FinishReveal()">VAI ALL'INVENTARIO</button>` :
        `<button class="mp-m2-confirm-buy" onclick="mpM2RevealOpen()">APRI IL PACCHETTO ✦</button>`}
      </div></div>`);
  }
  function decorateCards() {
    const skin = findSkin(equippedId());
    const apply = root => {
      if (!root) return;
      root.querySelectorAll(".player-card").forEach(card => {
        if (card.closest(".mp-m2-product")) return;
        if (card.classList.contains("mp-promo-card") || card.dataset.promoCard === "true") return;
        card.classList.toggle("mp-m2-card-equipped", Boolean(skin));
        if (skin) {
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
    S.tab=id;drawStore();
  };
  window.mpM2Theme = id => {
    if (id !== "all" && !THEMES[id]) return;
    S.theme=id;drawStore();
  };
  window.mpM2Retry = () => void load(true);
  window.mpM2Open = openPurchase;
  window.mpM2Close = closeOverlay;
  window.mpM2Confirm = confirmPurchase;
  window.mpM2Equip = equip;
  window.mpM2RevealOpen=()=>{if(!S.reveal) return;S.revealOpened=true;showReveal();};
  window.mpM2FinishReveal=()=>{closeOverlay();S.tab="inventory";if(route==="store") drawStore();};
  window.mpM2AfterWalletChange = () => { S.lastLoad=0; void load(true); };
  window.mpM2Inspect=()=>({
    version:VERSION, backendReady:S.ready, backendError:S.error,
    season:todayRome(), wallet:balance(), ownedSkins:S.inventory.length,
    equippedSkin:equippedId(), packs:S.packs.length, catalogue:S.skins.length
  });
  window.MP_M2_READY=true;
  void load(false);
})();

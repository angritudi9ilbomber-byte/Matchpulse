/* ===========================================================
   MATCHPULSE ULTIMATE TEAM — MACROBLOCCO 1
   Navigazione, Home, Sfide, Token, Traguardi.
   Caricare DOPO app.js. Non modifica il motore V8.
   =========================================================== */
(function () {
  "use strict";
  if (window.MP_M1_READY) return;

  const CLIENT_VERSION = "M1.0";
  const NAV = document.querySelector(".bottom-nav");
  const MAIN = document.querySelector("#app");
  const AUTH_TABLES = {
    challenges: "matchpulse_m1_challenges",
    events: "matchpulse_m1_matches",
    locks: "matchpulse_m1_role_locks",
    manual: "matchpulse_m1_manual_progress",
    claims: "matchpulse_m1_claims",
    ledger: "matchpulse_m1_wallet_ledger"
  };
  const ROLE_LABELS = {
    ATT: "Attaccante", ALA: "Ala", COC: "Trequartista",
    CC: "Centrocampista", CDC: "Mediano", DC: "Difensore",
    TERZINO: "Terzino"
  };
  const store = {
    tab: "weekly", ready: false, busy: false, loading: false,
    error: "", userId: null, lastLoad: 0, catalogue: [], bonusPacks: [],
    events: [], locks: [], manual: [], claims: [], ledger: []
  };

  function html(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, c =>
      ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[c]);
  }
  function digits(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  function italianDateParts() {
    const entries = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric"
    }).formatToParts(new Date());
    return Object.fromEntries(entries.map(x => [x.type, x.value]));
  }
  function timeContext() {
    const x = italianDateParts();
    const year = Number(x.year), month = Number(x.month), day = Number(x.day);
    const utc = new Date(Date.UTC(year, month - 1, day));
    const iso = utc.toISOString().slice(0, 10);
    const weekday = utc.getUTCDay();
    utc.setUTCDate(utc.getUTCDate() - ((weekday + 6) % 7));
    const week = utc.toISOString().slice(0, 10);
    const seasonStartYear = month >= 9 ? year : year - 1;
    return {
      date: iso, week, season: `${seasonStartYear}-${seasonStartYear + 1}`,
      seasonStart: `${seasonStartYear}-09-01`,
      seasonEnd: `${seasonStartYear + 1}-09-01`
    };
  }
  function currentRole() {
    const p = typeof getPlayerProfile === "function" ? getPlayerProfile() : {};
    const r = String(p.role || "CC").toUpperCase();
    return ROLE_LABELS[r] ? r : "CC";
  }
  function client() {
    return typeof matchpulseSupabase !== "undefined" ? matchpulseSupabase : null;
  }
  async function identity() {
    const db = client();
    if (!db || typeof mpEnsureClubAuth !== "function") {
      throw Error("Supabase non è disponibile: verifica la connessione del Club.");
    }
    const user = await mpEnsureClubAuth();
    if (!user?.id) throw Error("Sessione Supabase non disponibile.");
    return user.id;
  }
  function localEvents() {
    const input = typeof getMatches === "function" ? getMatches() : [];
    if (!Array.isArray(input)) return [];
    const ids = new Set();
    return input.map(m => {
      const id = String(m?.id ?? "");
      const date = String(m?.date || "").slice(0,10);
      const check = new Date(`${date}T12:00:00Z`);
      if (!id || ids.has(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date)
          || !Number.isFinite(check.getTime())
          || check.toISOString().slice(0,10) !== date) return null;
      ids.add(id);
      return {
        match_id: id, match_date: date,
        outcome: String(m.outcome || "").slice(0,32),
        goals: Math.min(99, digits(m.goals)),
        assists: Math.min(99, digits(m.assists)),
        role: String(m.role || m.matchRole || currentRole()).toUpperCase().slice(0,16)
      };
    }).filter(Boolean);
  }
  async function syncExistingMatches(userId) {
    const db = client();
    const events = localEvents();
    // Solo merge: NON cancella partite remote presenti su un altro dispositivo.
    for (let i = 0; i < events.length; i += 100) {
      const page = events.slice(i, i + 100).map(m => ({ user_id: userId, ...m }));
      const { error } = await db.from(AUTH_TABLES.events)
        .upsert(page, { onConflict: "user_id,match_id" });
      if (error) throw error;
    }
    const ctx = timeContext();
    // Nessun UPDATE o DELETE per il ruolo settimanale: si blocca alla prima visita.
    const { error: lockError } = await db.from(AUTH_TABLES.locks).upsert({
      user_id: userId, season_id: ctx.season,
      week_key: ctx.week, role: currentRole()
    }, { onConflict: "user_id,season_id,week_key", ignoreDuplicates: true });
    if (lockError) throw lockError;
  }
  async function fetchAll() {
    const db = client();
    const { error: publishError } =
  await db.rpc('mp_m1_publish_due');

if (publishError) throw publishError;
    const cols = ["challenges", "events", "locks", "manual", "claims", "ledger"];
    const answers = await Promise.all(cols.map(k => db.from(AUTH_TABLES[k]).select("*")));
    for (let i = 0; i < answers.length; i++) {
      if (answers[i].error) throw answers[i].error;
      store[cols[i] === "challenges" ? "catalogue" : cols[i]] = answers[i].data || [];
    }
    const ctx=timeContext();
    const bonus=await db.from("matchpulse_m1_bonus_packs").select("*")
      .eq("user_id",store.userId).eq("season_id",ctx.season)
      .is("opened_at",null).order("created_at");
    if(bonus.error)throw bonus.error;
    store.bonusPacks=bonus.data||[];
  }
  async function load(force = false) {
    if (store.loading || store.busy) return;
    if (!force && store.ready && Date.now() - store.lastLoad < 45000) return;
    store.loading = true; store.error = "";
    if (route === "challenges") renderChallengesUI();
    try {
      const userId = await identity();
      store.userId = userId;
      await syncExistingMatches(userId);
      await fetchAll();
      store.ready = true;
      store.lastLoad = Date.now();
    } catch (e) {
      console.error("MATCHPULSE M1", e);
      store.error = e?.message || "Impossibile collegarsi a Supabase.";
    } finally {
      store.loading = false;
      if (route === "challenges") renderChallengesUI();
      if (route === "home") refreshHomeWallet();
    }
  }
  function roleLock(ctx) {
    const lock = store.locks.find(x => x.user_id === store.userId
      && x.season_id === ctx.season && x.week_key === ctx.week);
    return lock?.role || currentRole();
  }
  function periodicKey(ch, ctx) {
    return ch.scope === "milestone" ? ctx.season : ctx.week;
  }
  function isClaimed(ch, ctx) {
    const key = periodicKey(ch, ctx);
    return store.claims.some(x => x.challenge_id === ch.id && x.season_id === ctx.season
      && x.period_key === key && x.user_id === store.userId);
  }
  function eligibleEvents(ch, ctx) {
    return store.events.filter(m => m.user_id === store.userId
      && m.match_date >= ctx.seasonStart && m.match_date < ctx.seasonEnd
      && (ch.scope === "milestone" || (m.match_date >= ctx.week && m.match_date < isoPlusDays(ctx.week,7))));
  }
  function isoPlusDays(date, days) {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0,10);
  }
  function progress(ch, ctx) {
    if (ch.metric === "manual") {
      const row = store.manual.find(x => x.challenge_id === ch.id
        && x.season_id === ctx.season && x.period_key === periodicKey(ch,ctx)
        && x.user_id === store.userId);
      return digits(row?.progress);
    }
    const events = eligibleEvents(ch, ctx);
    const lock = roleLock(ctx);
    const filtered = ch.metric.startsWith("role_")
      ? events.filter(m => m.role === lock) : events;
    const count = (fn) => filtered.reduce((acc,m) => acc + fn(m), 0);
    switch (ch.metric) {
      case "played": case "role_played": return filtered.length;
      case "wins": case "role_wins": return count(m => m.outcome === "Vittoria" ? 1 : 0);
      case "goals": case "role_goals": return count(m => digits(m.goals));
      case "assists": case "role_assists": return count(m => digits(m.assists));
      case "contributions": case "role_contributions":
        return count(m => digits(m.goals) + digits(m.assists));
      default: return 0;
    }
  }
  function wallet(ctx) {
    return store.ledger.filter(x => x.user_id === store.userId && x.season_id === ctx.season)
      .reduce((sum,x) => sum + (Number(x.amount) || 0), 0);
  }

  const MP_SKIN_ART={
    mp_gold_dynasty:"fc_comune.webp",mp_icebreak:"fc_rara.webp",
    mp_neon_pulse:"fc_epica.webp",mp_blackout:"fc_leggendaria.webp",
    op_straw:"onepiece.png",op_nakama:"op_rara.webp",
    op_ocean_epic:"op_epica.webp",op_gear:"op_leggendaria.webp",
    db_kame:"dragonball.png",db_saiyan:"db_rara.webp",
    db_aura_epic:"db_epica.webp",db_ultra:"db_leggendaria.webp",
    cp_night:"cyberpunk.png",cp_edge:"cp_rara.webp",
    cp_neon_epic:"cp_epica.webp",cp_samurai:"cp_leggendaria.webp",
    f1_grid:"formula1.png",f1_pole:"f1_rara.webp",
    f1_racing_epic:"f1_epica.webp",f1_champ:"f1_leggendaria.webp"
  };
  const MP_REWARD_PACKS={
    pack_classic:["Classico"],
    pack_fc_originals:["FC Originals"],
    pack_collaborazioni:["Collaborazioni"]
  };
  function prizeArt(id){
    const file=MP_SKIN_ART[id];
    if(!file)return "";
    const folder=["op_straw","db_kame","cp_night","f1_grid"].includes(id)
      ?"mp-m4-art/":"mp-m5-art/";
    return folder+file;
  }
  function rewardDetails(ch){
    const r=ch.reward_config||{};
    const tokens=Number.isFinite(Number(r.tokens))?Math.max(0,Number(r.tokens)):digits(ch.reward);
    return {tokens,pack:r.pack_id||"",skin:r.skin_id||"",emblem:r.emblem_id||""};
  }
  function rewardDisplay(ch){
    const r=rewardDetails(ch), out=[];
    if(r.tokens)out.push('<span class="mp-m1-prize">✦ '+r.tokens+' token</span>');
    if(r.pack){
      const meta=MP_REWARD_PACKS[r.pack]||[r.pack];
      out.push('<span class="mp-m1-prize"><span class="mp-m1-pack-ico" aria-hidden="true">📦</span>Pacchetto '+html(meta[0])+'</span>');
    }
    for(const [key,kind] of [["skin","Skin"],["emblem","Emblema"]]){
      if(!r[key])continue;
      const item=window.mpM6Catalog?.().skins?.find(x=>x.id===r[key]);
      const src=prizeArt(r[key]);
      out.push('<span class="mp-m1-prize">'+(src?'<img src="'+src+'" alt="">':'')+html(item?.title||kind+" "+r[key])+'</span>');
    }
    return out.join("")||'<span class="mp-m1-prize">Premio da configurare</span>';
  }
  function dualProgress(ch,ctx){
    const role=ch.metric.startsWith("role_"),events=eligibleEvents(ch,ctx)
      .filter(m=>!role||m.role===roleLock(ctx));
    const goals=events.reduce((a,m)=>a+digits(m.goals),0);
    const assists=events.reduce((a,m)=>a+digits(m.assists),0);
    const gt=Math.max(1,digits(ch.goals_target||ch.target));
    const at=Math.max(1,digits(ch.assists_target||ch.target));
    const goalRatio=Math.min(1,goals/gt),assistRatio=Math.min(1,assists/at);
    const both=ch.goal_logic==="both";
    return {
      ready:both?goals>=gt&&assists>=at:goals>=gt||assists>=at,
      percent:Math.floor((both?(goalRatio+assistRatio)/2:Math.max(goalRatio,assistRatio))*100),
      label:goals+" / "+gt+" gol "+(both?"E":"O")+" "+assists+" / "+at+" assist"
    };
  }
  function wonPackList(){
    const list=store.bonusPacks||[];
    if(!list.length)return "";
    return '<section class="mp-m1-bonus"><h3>🎁 PACCHETTI VINTI · '+list.length+'</h3>'+
      list.map(p=>{
        const pack=MP_REWARD_PACKS[p.pack_id]||[p.pack_id];
        return '<div class="mp-m1-bonus-item"><span class="mp-m1-pack-ico" aria-hidden="true">📦</span><strong>Pacchetto '+html(pack[0])+'</strong>'+
          '<button type="button" onclick="mpM1OpenRewardPack(\''+html(p.id)+'\')">APRI GRATIS</button></div>';
      }).join('')+'</section>';
  }
  function challengeCards(scope, ctx) {
    const lockedRole = roleLock(ctx);
    const list = store.catalogue.filter(ch => ch.active !== false && ch.scope === scope
      && (scope !== "role" || ch.role === lockedRole))
      .sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
    if (!list.length) return '<div class="mp-m1-empty">Nessuna sfida disponibile in questa categoria.</div>';
    return list.map(ch => {
      const value = progress(ch, ctx);
      const goal = Math.max(1, digits(ch.target));
      const done = isClaimed(ch, ctx);
      const dual=ch.goal_logic==="both"||ch.goal_logic==="either"
        ?dualProgress(ch,ctx):null;
      const reached=dual?dual.ready:value>=goal;
      const ratio=dual?dual.percent:Math.min(100,Math.floor(value/goal*100));
      return `<article class="mp-m1-challenge ${done ? "is-claimed" : ""}">
        <div class="mp-m1-challenge-head">
          <div><strong>${html(ch.title)}</strong><p>${html(ch.description)}</p></div>
          <div class="mp-m1-prizes">${rewardDisplay(ch)}</div>
        </div>
        <div class="mp-m1-progress-line"><span style="width:${ratio}%"></span></div>
        <div class="mp-m1-challenge-foot">
          <span class="mp-m1-count">${dual?html(dual.label):Math.min(value,goal)+" / "+goal}</span>
          ${ch.metric === "manual" && !done ? `<div class="mp-m1-stepper">
            <button type="button" ${store.busy || !value ? "disabled" : ""} onclick="mpM1Adjust('${ch.id}',-1)" aria-label="Sottrai una azione">−</button>
            <button type="button" ${store.busy || value >= goal ? "disabled" : ""} onclick="mpM1Adjust('${ch.id}',1)" aria-label="Aggiungi una azione">+</button>
            </div>` : ""}
          <button class="mp-m1-redeem" type="button" ${store.busy || done || !reached ? "disabled" : ""}
            onclick="mpM1Claim('${ch.id}')">${done ? "Riscattato ✓" : "Riscatta"}</button>
        </div>
      </article>`;
    }).join("");
  }
  function renderChallengesUI() {
    if (!MAIN) return;
    const ctx = timeContext();
    const tabs = [
      ["weekly", "Settimanali"], ["role", "Di ruolo"], ["milestone", "Traguardi"]
    ];
    MAIN.innerHTML = `<section class="mp-m1-page mp-m1-challenges-page">
      <div class="mp-m1-heading"><div><p class="mp-m1-kicker">MATCHPULSE / OBIETTIVI</p>
       <h2>LE TUE SFIDE</h2><p>Gioca, completa gli obiettivi e riscatta token.</p></div>
       <div class="mp-m1-token"><small>SALDO STAGIONALE</small><strong>✦ ${store.ready ? wallet(ctx) : "—"}</strong></div></div>
      <div class="mp-m1-overview">
       <span>STAGIONE ${ctx.season.replace("-","/")}</span>
       <span>${store.tab === "milestone" ? "Nessuna scadenza nella stagione" : "Reset settimanale: lunedì 00:00 · Roma"}</span>
      </div>
      <div id="mpM1FounderSlot"></div>
      <div class="mp-m1-tabs" role="tablist">${tabs.map(([id,label]) =>
        `<button type="button" role="tab" aria-selected="${store.tab === id}" class="${store.tab === id ? "active" : ""}" onclick="mpM1Tab('${id}')">${label}</button>`).join("")}</div>
      ${store.error ? `<div class="mp-m1-error"><strong>Configurazione sfide necessaria</strong><p>${html(store.error)}</p><button type="button" onclick="mpM1Retry()">Riprova</button></div>` : ""}
      ${store.loading && !store.ready ? '<div class="mp-m1-loading">Caricamento delle sfide…</div>' : ""}
      ${store.ready ? wonPackList()+`<div class="mp-m1-challenges-list">${challengeCards(store.tab,ctx)}</div>` : ""}
      ${store.ready && store.tab === "role" ? `<div class="mp-m1-hint">Ruolo di questa settimana: <strong>${html(ROLE_LABELS[roleLock(ctx)])}</strong>. Rimane bloccato fino al prossimo lunedì per evitare riscatti multipli.</div>` : ""}
      ${store.ready && store.tab === "milestone" ? '<div class="mp-m1-hint">Le azioni speciali si registrano con i pulsanti + e −. I traguardi si riscattano una sola volta per stagione.</div>' : ""}
        </section>`;
    window.mpM1FounderMount?.();
  }
  function refreshHomeWallet() {
    const el = document.querySelector("[data-m1-wallet]");
    if (el) el.textContent = store.ready ? String(wallet(timeContext())) : "—";
  }
  async function perform(fn) {
    if (store.busy || store.loading) return;
    store.busy = true;
    if (route === "challenges") renderChallengesUI();
    try {
      await fn();
      await fetchAll();
      store.ready = true; store.error = ""; store.lastLoad = Date.now();
    } catch (e) {
      console.error("MATCHPULSE M1 action", e);
      if (typeof toast === "function") toast(e.message || "Operazione non riuscita");
    } finally {
      store.busy = false;
      if (route === "challenges") renderChallengesUI();
      refreshHomeWallet();
      if (typeof window.mpM2AfterWalletChange === "function") window.mpM2AfterWalletChange();
    }
  }
  window.mpM1Tab = id => {
    if (!["weekly", "role", "milestone"].includes(id)) return;
    store.tab = id;
    renderChallengesUI();
  };
  window.mpM1Adjust = (id, delta) => perform(async () => {
    if (!store.catalogue.some(ch => ch.id === id && ch.metric === "manual")) return;
    const {error} = await client().rpc("mp_m1_adjust_manual", {
      p_challenge_id: id, p_delta: delta
    });
    if (error) throw error;
  });
  window.mpM1Claim = id => perform(async () => {
    const {data,error}=await client().rpc("mp_m1_claim_rewards",{p_challenge_id:id});
    if(error)throw error;
    const parts=[];
    if(data?.tokens)parts.push(data.tokens+" token");
    if(data?.skin_awarded)parts.push("skin/emblema");
    if(data?.pack_id)parts.push("pacchetto gratuito");
    if(data?.already_owned?.length)parts.push("cosmetico già posseduto");
    if(typeof toast==="function")toast("Riscattato: "+(parts.join(", ")||"premio registrato"));
  });
  window.mpM1OpenRewardPack=id=>{
    let opened=null;
    void perform(async()=>{
      const {data,error}=await client().rpc("mp_m1_open_reward_pack",{p_reward_id:id});
      if(error)throw error;
      opened=data;
    }).then(()=>{
      if(opened)void window.mpM2RevealWonPack?.(opened);
    });
  };
  window.mpM1Retry = () => load(true);
  function renderChallenges() {
    renderChallengesUI();
    void load(false);
  }
  function renderMatchesHub() {
    const all = typeof getMatches === "function" ? getMatches() : [];
    const ordered = [...all].sort((a,b) => String(b.date||"").localeCompare(String(a.date||"")));
    const last = ordered[0];
    MAIN.innerHTML = `<section class="mp-m1-page">
      <div class="mp-m1-heading"><div><p class="mp-m1-kicker">MATCHPULSE / CARRIERA</p><h2>PARTITE</h2>
      <p>Tutte le tue prestazioni, in un unico posto.</p></div></div>
      <div class="mp-m1-hub-grid">
        <button class="mp-m1-hub-primary" onclick="setRoute('new')"><span>＋</span><strong>NUOVA PARTITA</strong><small>Registra la prestazione</small></button>
        <button class="mp-m1-hub-tile" onclick="setRoute('history')"><span>▤</span><strong>STORICO</strong><small>${all.length} partite registrate</small></button>
        <button class="mp-m1-hub-tile" onclick="setRoute('stats')"><span>◫</span><strong>STATISTICHE</strong><small>Grafici e record</small></button>
      </div>
      ${last ? `<div class="mp-m1-panel"><span class="mp-m1-kicker">ULTIMA PARTITA</span>
        <h3>${html(last.result || "Partita giocata")}</h3>
        <p>${html(last.date || "")}${last.outcome ? ` · ${html(last.outcome)}` : ""}</p>
        <div class="mp-m1-inline-stats"><span>${digits(last.goals)} GOL</span><span>${digits(last.assists)} ASSIST</span></div>
        <button class="mp-m1-link" onclick="setRoute('history')">Apri lo storico →</button></div>` : ""}
    </section>`;
  }
  function renderStorePreview() {
    MAIN.innerHTML = `<section class="mp-m1-page mp-m1-store-preview">
      <div class="mp-m1-heading"><div><p class="mp-m1-kicker">MATCHPULSE / MARKET</p>
      <h2>NEGOZIO</h2><p>Le estetiche e i pacchetti arriveranno con il Macroblocco 2.</p></div>
      <div class="mp-m1-token"><small>I TUOI TOKEN</small><strong>✦ <span data-m1-wallet>${store.ready ? wallet(timeContext()) : "—"}</span></strong></div></div>
      <div class="mp-m1-panel mp-m1-store-hero"><span class="mp-m1-kicker">PROSSIMAMENTE</span>
      <h3>LA TUA CARTA. IL TUO STILE.</h3><p>Skin, collezioni tematiche e pacchetti animati. Nessun boost alle statistiche.</p>
      <button type="button" onclick="setRoute('challenges')">Guadagna token dalle Sfide →</button></div>
    </section>`;
    if (!store.ready) void load(false);
  }
  function mountHome() {
    const home = MAIN.querySelector(".premium-home");
    if (!home) return;
    home.classList.add("mp-m1-home");
    home.querySelectorAll(".home-achievements-card, .home-trend-card, .home-action-grid, .action-grid-premium").forEach(el => el.remove());
    const title = `<div class="mp-m1-home-top"><div><p class="mp-m1-kicker">MATCHPULSE ULTIMATE TEAM</p>
      <h2>LA TUA CARRIERA</h2><span>La tua carta. Le tue partite. Le tue sfide.</span></div>
      <div class="mp-m1-token"><small>TOKEN</small><strong>✦ <span data-m1-wallet>${store.ready ? wallet(timeContext()) : "—"}</span></strong></div></div>`;
    home.insertAdjacentHTML("afterbegin", title);
    home.insertAdjacentHTML("beforeend", `<div class="mp-m1-home-links">
      <button onclick="setRoute('matches')"><span>⚽</span><strong>PARTITE</strong><small>Registra e consulta</small></button>
      <button onclick="setRoute('challenges')"><span>✦</span><strong>SFIDE</strong><small>Ottieni token</small></button>
      <button onclick="setRoute('playstyles')"><span>◇</span><strong>PLAYSTYLE</strong><small>La tua specialità</small></button>
      <button onclick="setRoute('promos')"><span>✧</span><strong>PROMO</strong><small>Le tue carte speciali</small></button>
    </div>`);
    const month = home.querySelector(".home-mini-grid");
    if (month) month.insertAdjacentHTML("beforebegin", '<div class="mp-m1-section-caption">IL TUO RIEPILOGO</div>');
    if (!store.ready) void load(false);
  }

  // Il progetto originale contiene render() concatenati per Club/Promo/PlayStyles.
  // Li preserviamo delegando solo le nuove rotte e pulendo la Home DOPO i vecchi wrapper.
  // I record personali erano nella vecchia pagina Focus: li trasferiamo in Stats.
  const previousStats = renderStats;
  renderStats = function (...args) {
    const result = previousStats.apply(this, args);
    if (typeof goalsPageRecords === "function" && MAIN &&
        !MAIN.querySelector(".mp-m1-records")) {
      const records = goalsPageRecords(getMatches());
      MAIN.insertAdjacentHTML("beforeend", `<section class="mp-m1-records">
        <p class="mp-m1-kicker">ARCHIVIO CARRIERA</p><h2>RECORD PERSONALI</h2>
        ${records}</section>`);
    }
    return result;
  };
  window.renderStats = renderStats;
  const previousHome = renderHome;
  renderHome = function (...args) {
    const result = previousHome.apply(this, args);
    mountHome();
    return result;
  };
  window.renderHome = renderHome;
  const previousRender = render;
  render = function (...args) {
    if (route === "matches") return renderMatchesHub();
    if (route === "challenges" || route === "goals") return renderChallenges();
    if (route === "store") return renderStorePreview();
    return previousRender.apply(this, args);
  };
  window.render = render;
  // Mantiene attiva Partite anche nelle pagine figlie (Nuova/Storico/Stats/Dettaglio).
  const previousSetRoute = setRoute;
  setRoute = function (next, id = null) {
    const newRoute = next === "goals" ? "challenges" : next;
    const result = previousSetRoute(newRoute, id);
    if (NAV) {
      const tab = ["new","history","stats","detail"].includes(newRoute) ? "matches" : newRoute;
      NAV.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.route === tab));
    }
    return result;
  };
  window.setRoute = setRoute;
  // Se una partita viene eliminata, rimuoviamo il solo mirror Sfide su Supabase.
  if (typeof deleteMatch === "function") {
    const previousDelete = deleteMatch;
    deleteMatch = async function (id, ...args) {
      const existed = (getMatches() || []).some(m => String(m.id) === String(id));
      const result = await previousDelete.call(this, id, ...args);
      if (existed && !(getMatches() || []).some(m => String(m.id) === String(id))) {
        try {
          const userId = await identity();
          const {error} = await client().from(AUTH_TABLES.events).delete()
            .eq("user_id", userId).eq("match_id", String(id));
          if (error) throw error;
          store.ready = false; store.lastLoad = 0;
        } catch (e) { console.warn("Mirror Sfide: partita non rimossa dal cloud", e); }
      }
      return result;
    };
    window.deleteMatch = deleteMatch;
  }
  if (NAV) NAV.classList.add("mp-m1-nav");
  window.mpM1RefreshWallet = async function () {
    store.lastLoad = 0;
    store.ready = false;
    await load(true);
    return wallet(timeContext());
  };
  window.MP_M1_READY = true;
  window.mpM1Inspect = () => ({ version: CLIENT_VERSION, season: timeContext().season,
    week: timeContext().week, role: roleLock(timeContext()),
    backendReady: store.ready, backendError: store.error,
    challenges: store.catalogue.length, wallet: wallet(timeContext()) });
  if (typeof render === "function") render();
})();


/* MATCHPULSE — FOUNDER SFIDE MOBILE */
(function(){
  'use strict';
  if(window.MP_M1_FOUNDER_READY)return;

  const F={
    admin:false,checking:false,open:false,loaded:false,
    goals:[],players:[],products:[],
    editing:'',player:'',product:''
  };

  const db=()=>window.matchpulseSupabase;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',
    '"':'&quot;',"'":'&#39;'
  }[c]));

  const inputStyle=
    'width:100%;box-sizing:border-box;min-height:44px;padding:10px;' +
    'border-radius:10px;border:1px solid #77608e;' +
    'background:#171126;color:white;font-size:16px';

  const buttonStyle=
    'padding:11px 14px;border:1px solid #9a56d0;' +
    'border-radius:10px;background:#7128ac;color:white;font-weight:800';

  const roles=[
    ['ATT','Attaccante'],['ALA','Ala'],['COC','Trequartista'],
    ['CC','Centrocampista'],['CDC','Mediano'],
    ['DC','Difensore'],['TERZINO','Terzino']
  ];

  const types=[
    ['weekly','Settimanale'],
    ['role','Di ruolo'],
    ['milestone','Traguardo stagionale']
  ];

  const metrics=[
    ['played','Partite giocate'],
    ['wins','Vittorie'],
    ['goals','Gol'],
    ['assists','Assist'],
    ['contributions','Contributi totali (somma)'],
    ['goals_both','Gol + Assist (entrambi)'],
    ['goals_either','Gol O Assist (alternativi)'],
    ['role_played','Partite nel ruolo'],
    ['role_wins','Vittorie nel ruolo'],
    ['role_goals','Gol nel ruolo'],
    ['role_assists','Assist nel ruolo'],
    ['role_contributions','Contributi totali nel ruolo (somma)'],
    ['role_goals_both','Gol + Assist nel ruolo (entrambi)'],
    ['role_goals_either','Gol O Assist nel ruolo (alternativi)'],
    ['manual','Manuale +1 / −1']
  ];

  const opts=(list,current)=>list.map(([v,t])=>
    `<option value="${esc(v)}" ${v===current?'selected':''}>${esc(t)}</option>`
  ).join('');

  const entry=()=>document.getElementById('mpM1FounderSlot');
  const selectedGoal=()=>F.goals.find(x=>x.id===F.editing);
  const selectedPlayer=()=>F.players.find(x=>x.id===F.player);
  const message=e=>alert(e?.message||String(e));

  async function refresh(){
    const [goals,players,skins,packs]=await Promise.all([
      db().from('matchpulse_m1_challenges')
        .select('*').order('sort_order'),
      db().rpc('mp_m1_founder_players'),
      db().from('matchpulse_m2_skins')
        .select('id,title,price,theme,rarity,active').order('sort_order'),
      db().from('matchpulse_m2_packs')
        .select('id,title,price,active').order('sort_order')
    ]);

    for(const r of [goals,players,skins,packs]){
      if(r.error)throw r.error;
    }

    F.goals=(goals.data||[]).filter(g=>!g.founder_deleted);
    F.players=players.data||[];
    F.products=[
      ...(skins.data||[]).map(p=>({...p,type:'skin'})),
      ...(packs.data||[]).map(p=>({...p,type:'pack'}))
    ];
    F.loaded=true;

    if(!F.players.some(x=>x.id===F.player))
      F.player=F.players[0]?.id||'';

    if(!F.products.some(p=>p.type+'|'+p.id===F.product)){
      const p=F.products[0];
      F.product=p?p.type+'|'+p.id:'';
    }

    paint();
  }

  function paint(){
    const slot=entry();
    if(!slot||!F.admin)return;

    if(!F.open){
      slot.innerHTML=`
        <button type="button" onclick="mpM1FounderToggle()"
          style="${buttonStyle};width:100%;margin:12px 0">
          ✦ FOUNDER · GESTISCI SFIDE E TOKEN
        </button>`;
      return;
    }

    if(!F.loaded){
      slot.innerHTML='<p>Caricamento Founder…</p>';
      void refresh().catch(message);
      return;
    }

    const ch=selectedGoal()||{};
    const rc=ch.reward_config||{};
    const editMetric=(ch.goal_logic==="both"||ch.goal_logic==="either")?
      (ch.metric.startsWith("role_")?"role_":"")+"goals_"+ch.goal_logic:ch.metric;
    const isDual=editMetric==="goals_both"||editMetric==="goals_either"||
      editMetric==="role_goals_both"||editMetric==="role_goals_either";
    const player=selectedPlayer();
    const product=F.products.find(p=>p.type+'|'+p.id===F.product);

    slot.innerHTML=`
    <section style="background:#1c1530;border:1px solid #925dc4;
      border-radius:16px;padding:14px;margin:14px 0;display:grid;gap:14px">

      <div style="display:flex;align-items:center;
        justify-content:space-between;gap:8px">
        <strong>✦ FOUNDER · SFIDE</strong>
        <button type="button" style="${buttonStyle}"
          onclick="mpM1FounderToggle()">Chiudi</button>
      </div>

      <p style="font-size:12px;opacity:.8;margin:0">
        Gestione riservata. Le modifiche sono condivise con tutti i giocatori.
      </p>

      <label>Obiettivo da modificare
        <select style="${inputStyle}"
          onchange="mpM1FounderChoose(this.value)">
          <option value="">＋ CREA NUOVO OBIETTIVO</option>
          ${F.goals.map(g=>`
            <option value="${esc(g.id)}"
              ${g.id===F.editing?'selected':''}>
              ${g.active?'':'[DISATTIVO] '}
              ${esc(g.title)} · ${esc(g.scope)}
            </option>`).join('')}
        </select>
      </label>

      ${F.editing ? `
  <button type="button"
    onclick="mpM1FounderDelete()"
    style="${buttonStyle};background:#8b233b">
    🗑 ELIMINA OBIETTIVO SELEZIONATO
  </button>
` : ''}
      <form id="mfGoalForm" onsubmit="mpM1FounderSave(event)"
        style="display:grid;gap:9px">

        <label>Nome obiettivo
          <input name="title" required maxlength="90"
            style="${inputStyle}" value="${esc(ch.title||'')}"
            placeholder="Es. Muro difensivo">
        </label>

        <label>Descrizione
          <textarea name="description" required maxlength="350"
            style="${inputStyle};min-height:70px"
            placeholder="Come si completa">${esc(ch.description||'')}</textarea>
        </label>

        <label>Categoria
          <select name="scope" id="mfScope" style="${inputStyle}"
            onchange="mpM1FounderScope()">
            ${opts(types,ch.scope||'weekly')}
          </select>
        </label>

        <label>Ruolo (solo sfide di ruolo)
          <select name="role" style="${inputStyle}">
            ${opts(roles,ch.role||'DC')}
          </select>
        </label>

        <label>Modalità di avanzamento
          <select name="metric" id="mfMetric" style="${inputStyle}"
            onchange="mpM1FounderMetric()">
            ${opts(metrics,editMetric||'played')}
          </select>
        </label>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">
          <label>Quantità richiesta
            <input name="target" type="number" min="1" max="1000"
              required style="${inputStyle}"
              value="${esc(ch.target||1)}">
          </label>

          <label>Token premio
            <input name="reward" type="number" min="0" max="2000"
              required style="${inputStyle}"
              value="${esc(rc.tokens??ch.reward??10)}">
          </label>
        </div>

        <div id="mfDualGoals" style="display:${isDual?'grid':'none'};grid-template-columns:1fr 1fr;gap:9px">
          <label>Gol richiesti
            <input name="goals_target" type="number" min="1" max="1000"
              style="${inputStyle}" value="${esc(ch.goals_target||10)}">
          </label>
          <label>Assist richiesti
            <input name="assists_target" type="number" min="1" max="1000"
              style="${inputStyle}" value="${esc(ch.assists_target||10)}">
          </label>
        </div>
        <strong>🎁 RICOMPENSE AGGIUNTIVE (COMBINABILI)</strong>
        <label>Pacchetto gratuito
          <select name="pack_id" style="${inputStyle}">
            ${opts([["","Nessun pacchetto"],...F.products
              .filter(p=>p.type==="pack"&&p.active!==false)
              .map(p=>[p.id,p.title])],rc.pack_id||"")}
          </select>
        </label>
        <label>Skin o decorazione
          <select name="skin_id" style="${inputStyle}">
            ${opts([["","Nessuna skin"],...F.products
              .filter(p=>p.type==="skin"&&p.active!==false&&
                !(p.rarity==="common"&&p.theme!=="matchpulse"))
              .map(p=>[p.id,p.title])],rc.skin_id||"")}
          </select>
        </label>
        <label>Emblema
          <select name="emblem_id" style="${inputStyle}">
            ${opts([["","Nessun emblema"],...F.products
              .filter(p=>p.type==="skin"&&p.rarity==="common"&&p.theme!=="matchpulse")
              .map(p=>[p.id,p.title])],rc.emblem_id||"")}
          </select>
        </label>
        <small>Puoi assegnare 0 token e soltanto un cosmetico o un pacchetto.
          Il pacchetto arriverà nelle Sfide e si aprirà senza spesa.</small>
        <label style="display:flex;align-items:center;gap:8px">
          <input name="active" type="checkbox"
            ${ch.active===false?'':'checked'}>
          Obiettivo attivo
        </label>

        <button type="submit" style="${buttonStyle}">
          SALVA ORA
        </button>
      </form>

      <hr style="width:100%;border-color:#69537b">

      <hr style="width:100%;border-color:#69537b">

<strong>✦ MONITORAGGIO GIOCATORI</strong>

<button type="button"
  onclick="mpM1FounderMonitorOpen()"
  style="${buttonStyle}">
  APRI MONITORAGGIO OBIETTIVI
</button>

<div id="mpM1FounderMonitor"></div>
      <strong>✦ GESTIONE TOKEN</strong>

      <label>Account
        <select style="${inputStyle}"
          onchange="mpM1FounderPlayer(this.value)">
          ${F.players.map(p=>`
            <option value="${esc(p.id)}"
              ${p.id===F.player?'selected':''}>
              ${esc(p.name)} · ${esc(p.balance)} token
            </option>`).join('')}
        </select>
      </label>

      <label>Imposta saldo a
        <input id="mfBalance" type="number" min="0" max="50000"
          style="${inputStyle}" value="${esc(player?.balance??0)}">
      </label>

      <button type="button" style="${buttonStyle}"
        onclick="mpM1FounderSetBalance()">
        CONFERMA NUOVO SALDO
      </button>

      <small>Inserendo 0 azzeri il saldo disponibile.
        Inventario e acquisti restano conservati.</small>

      <hr style="width:100%;border-color:#69537b">

      <strong>✦ PREZZI DEL NEGOZIO</strong>

      <label>Prodotto
        <select style="${inputStyle}"
          onchange="mpM1FounderProduct(this.value)">
          ${F.products.map(p=>`
            <option value="${esc(p.type+'|'+p.id)}"
              ${p.type+'|'+p.id===F.product?'selected':''}>
              ${p.type==='pack'?'PACCHETTO':'SKIN'} · ${esc(p.title)}
            </option>`).join('')}
        </select>
      </label>

      <label>Prezzo in token
        <input id="mfPrice" type="number" min="1" max="9999"
          style="${inputStyle}" value="${esc(product?.price??80)}">
      </label>

      <button type="button" style="${buttonStyle}"
        onclick="mpM1FounderSetPrice()">
        SALVA PREZZO
      </button>

      <hr style="width:100%;border-color:#69537b">

      <button type="button" onclick="mpM1FounderPauseAll()"
        style="${buttonStyle};background:#7b253b">
        PROGRAMMA STOP SETTIMANALI E DI RUOLO
      </button>

      <small>Questa operazione conserva lo storico delle ricompense
        e non cancella le partite.</small>
    </section>`;
  }

  async function mount(){
    if(!entry()||!db()||
      typeof window.mpPromoSecureIsAdmin!=='function')return;

    if(!F.admin&&!F.checking){
      F.checking=true;
      try{
        F.admin=(await window.mpPromoSecureIsAdmin(true))===true;
      }catch(e){
        console.warn('M1 Founder: verifica fallita',e);
      }finally{
        F.checking=false;
      }
    }

    if(F.admin)paint();
  }

  window.mpM1FounderMount=()=>{void mount();};

  window.mpM1FounderToggle=()=>{
    F.open=!F.open;
    paint();
  };

  window.mpM1FounderChoose=id=>{
    F.editing=id;
    paint();
  };

  window.mpM1FounderPlayer=id=>{
    F.player=id;
    paint();
  };

  window.mpM1FounderProduct=id=>{
    F.product=id;
    paint();
  };

  window.mpM1FounderMetric=()=>{
    const v=document.getElementById("mfMetric")?.value||"";
    const dual=v.endsWith("_both")||v.endsWith("_either");
    const el=document.getElementById("mfDualGoals");
    if(el)el.style.display=dual?"grid":"none";
  };
  window.mpM1FounderScope=()=>{
    document.getElementById('mfMetric').value=
      document.getElementById('mfScope').value==='role'
        ?'role_played':'played';
    window.mpM1FounderMetric();
  };

  window.mpM1FounderSave=async event=>{
    event.preventDefault();

    const form=event.currentTarget;
    const o=Object.fromEntries(new FormData(form).entries());

    o.id=F.editing||null;
    o.active=form.elements.active.checked;
    o.sort_order=selectedGoal()?.sort_order??500;
    const selectedMetric=o.metric;
    o.goal_logic=selectedMetric.endsWith("_both")?"both":
      selectedMetric.endsWith("_either")?"either":"legacy";
    if(o.goal_logic!=="legacy"){
      o.metric=selectedMetric.startsWith("role_")?
        "role_contributions":"contributions";
    }
    const tokens=Number(o.reward);
    if(!Number.isInteger(tokens)||tokens<0||tokens>2000){
      alert("Token premio non validi.");return;
    }
    o.reward_config={
      tokens,
      pack_id:o.pack_id||null,
      skin_id:o.skin_id||null,
      emblem_id:o.emblem_id||null
    };
    o.reward=Math.max(1,tokens);
    if(!o.reward_config.tokens&&!o.reward_config.pack_id&&
       !o.reward_config.skin_id&&!o.reward_config.emblem_id){
      alert("Seleziona almeno una ricompensa.");return;
    }
    if(o.goal_logic==="legacy"){o.goals_target=null;o.assists_target=null;}

    try{
      const {data,error}=await db().rpc('mp_m1_founder_save_v2',{
        p_goal:o
      });
      if(error)throw error;

      F.editing=data;
      await refresh();
      window.mpM1Retry?.();
      alert('Obiettivo salvato e pubblicato subito!');
    }catch(e){
      message(e);
    }
  };

  window.mpM1FounderSetBalance=async()=>{
    const value=Number(document.getElementById('mfBalance')?.value);

    if(!F.player||!Number.isInteger(value)||
      value<0||value>50000){
      alert('Saldo non valido.');
      return;
    }

    if(!confirm('Impostare questo saldo a '+value+' token?'))return;

    try{
      const {error}=await db().rpc('mp_m1_founder_set_balance',{
        p_user:F.player,
        p_balance:value
      });
      if(error)throw error;

      await refresh();
      window.mpM1Retry?.();
      await window.mpM1RefreshWallet?.();
      window.mpM2AfterWalletChange?.();

      alert('Saldo aggiornato.');
    }catch(e){
      message(e);
    }
  };

  window.mpM1FounderSetPrice=async()=>{
    const p=F.products.find(
      x=>x.type+'|'+x.id===F.product
    );

    const price=Number(document.getElementById('mfPrice')?.value);

    if(!p||!Number.isInteger(price)||price<1||price>9999){
      alert('Prezzo non valido.');
      return;
    }

    if(!confirm('Cambiare il prezzo di '+p.title+
      ' a '+price+' token?'))return;

    try{
      const {error}=await db().rpc('mp_m1_founder_set_price',{
        p_type:p.type,
        p_id:p.id,
        p_price:price
      });
      if(error)throw error;

      await refresh();
      window.mpM2AfterWalletChange?.();

      alert('Prezzo aggiornato.');
    }catch(e){
      message(e);
    }
  };

  window.mpM1FounderPauseAll=async()=>{
    if(!confirm(
      'Disattivare tutti gli obiettivi attuali per tutti i giocatori?'
    ))return;

    try{
      const {data,error}=await db().rpc(
        'mp_m1_founder_pause_all'
      );
      if(error)throw error;

      F.editing='';
      await refresh();
      window.mpM1Retry?.();

      alert(
  data+' obiettivi programmati per la disattivazione di lunedì.'
);
    }catch(e){
      message(e);
    }
  };


window.mpM1FounderDelete = async () => {
  const goal = selectedGoal();

  if (!goal) {
    alert('Seleziona prima un obiettivo.');
    return;
  }

  if (!confirm(
    'Eliminare definitivamente dalla lista "' +
    goal.title + '"?\n\n' +
    'L’obiettivo sparirà subito per tutti. ' +
    'I token già riscattati resteranno invariati.'
  )) return;

  try {
    const { error } = await db().rpc(
      'mp_m1_founder_delete',
      { p_id: goal.id }
    );

    if (error) throw error;

    F.editing = '';

    await refresh();
    window.mpM1Retry?.();

    alert('Obiettivo eliminato.');
  } catch (e) {
    alert(
      'Eliminazione non riuscita: ' +
      (e?.message || String(e))
    );
  }
};

  window.MP_M1_FOUNDER_READY=true;
  if(entry())window.mpM1FounderMount();
})();


/* MATCHPULSE — FOUNDER MONITOR SFIDE */
(function(){
  'use strict';

  if(window.MP_M1_FOUNDER_MONITOR_READY)return;
  window.MP_M1_FOUNDER_MONITOR_READY=true;

  const E=s=>String(s??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',
    '"':'&quot;',"'":'&#39;'
  }[c]));

  const R={
    ATT:'Attaccante',
    ALA:'Ala',
    COC:'Trequartista',
    CC:'Centrocampista',
    CDC:'Mediano',
    DC:'Difensore',
    TERZINO:'Terzino'
  };

  const count=n=>
    Math.max(0,Math.floor(Number(n)||0));

  function mondayDate(offset=0){
    const p=Object.fromEntries(
      new Intl.DateTimeFormat('en-GB',{
        timeZone:'Europe/Rome',
        year:'numeric',
        month:'2-digit',
        day:'2-digit'
      }).formatToParts(new Date())
        .map(x=>[x.type,x.value])
    );

    const d=new Date(
      Date.UTC(+p.year,+p.month-1,+p.day,12)
    );

    d.setUTCDate(
      d.getUTCDate()
      -((d.getUTCDay()+6)%7)
      -offset*7
    );

    return d.toISOString().slice(0,10);
  }

  function progress(goal,p,info){
    const ms=(info.matches||[])
      .filter(m=>m.user_id===p.user_id);

    const filtered=
      String(goal.metric).startsWith('role_')
        ?ms.filter(m=>m.role===p.role)
        :ms;

    const num=fn=>
      filtered.reduce((acc,m)=>acc+fn(m),0);

    if(goal.metric==='manual'){
      return count(
        (info.manual||[]).find(x=>
          x.user_id===p.user_id &&
          x.challenge_id===goal.id
        )?.progress
      );
    }

    switch(goal.metric){
      case 'played':
      case 'role_played':
        return filtered.length;

      case 'wins':
      case 'role_wins':
        return num(m=>
          m.outcome==='Vittoria'?1:0
        );

      case 'goals':
      case 'role_goals':
        return num(m=>count(m.goals));

      case 'assists':
      case 'role_assists':
        return num(m=>count(m.assists));

      case 'contributions':
      case 'role_contributions':
        return num(m=>
          count(m.goals)+count(m.assists)
        );

      default:
        return 0;
    }
  }

  function render(info,week){
    const el=document.getElementById(
      'mpM1FounderMonitor'
    );

    if(!el)return;

    const people=info.players||[];
    const goals=info.goals||[];
    const claims=info.claims||[];

    const names=new Map(
      people.map(p=>[p.user_id,p.name])
    );

    const goalNames=new Map(
      goals.map(g=>[g.id,g.title])
    );

    const recent=claims.slice().sort(
      (a,b)=>String(b.claimed_at)
        .localeCompare(String(a.claimed_at))
    );

    const card=p=>{
      const list=goals.filter(g=>
        g.scope==='role' &&
        g.role===p.role
      );

      const finished=list.filter(g=>
        claims.some(c=>
          c.user_id===p.user_id &&
          c.challenge_id===g.id
        )
      ).length;

      return `
      <section style="
        padding:12px;
        margin:10px 0;
        background:#171225;
        border:1px solid #54456b;
        border-radius:12px">

        <strong>
          ${E(p.name)} ·
          ${E(R[p.role]||p.role||'Ruolo non impostato')}
        </strong>

        <p style="margin:3px 0 9px;font-size:12px;opacity:.75">
          ${finished}/${list.length} riscattati
          ${p.role_locked?'':'· ruolo indicativo, non ancora bloccato'}
        </p>

        ${list.length
          ?list.map(g=>{
            const claim=claims.find(c=>
              c.user_id===p.user_id &&
              c.challenge_id===g.id
            );

            const value=progress(g,p,info);
            const target=count(g.target);

            const status=claim
              ?'✅ RISCATTATO'
              :value>=target
                ?'🟡 COMPLETATO, NON RISCATTATO'
                :'IN CORSO';

            return `
              <div style="
                padding:7px 0;
                border-top:1px solid #423450;
                font-size:13px">

                <div>
                  <strong>${E(g.title)}</strong>
                  · ${E(g.reward)} token
                </div>

                <div style="opacity:.85">
                  ${Math.min(value,target)}/${target}
                  · ${status}
                </div>
              </div>
            `;
          }).join('')
          :'<p style="font-size:12px">Nessun obiettivo di ruolo assegnato.</p>'
        }
      </section>`;
    };

    const options=
      Array.from({length:13},(_,i)=>mondayDate(i))
      .map(w=>`
        <option value="${w}" ${w===week?'selected':''}>
          Settimana del ${w.split('-').reverse().join('/')}
        </option>
      `).join('');

    el.innerHTML=`
      <section style="margin-top:12px;display:grid;gap:10px">

        <h3 style="margin:0">Monitoraggio giocatori</h3>

        <label>
          Settimana

          <select
            onchange="mpM1FounderMonitorWeek(this.value)"
            style="
              display:block;
              width:100%;
              padding:10px;
              background:#241a37;
              color:white;
              border:1px solid #75638a;
              border-radius:8px">
            ${options}
          </select>
        </label>

        <button type="button"
          onclick="mpM1FounderMonitorWeek('${E(week)}')">
          ↻ AGGIORNA RISCATTI
        </button>

        <div style="
          padding:10px;
          background:#201a30;
          border-radius:10px">

          <strong>Ultimi obiettivi riscattati</strong>

          ${recent.length
            ?recent.map(c=>`
              <p style="font-size:12px;margin:6px 0">
                ✅ ${E(names.get(c.user_id)||'Giocatore')}
                ha riscattato
                <strong>
                  ${E(goalNames.get(c.challenge_id)||c.challenge_id)}
                </strong>
                (+${E(c.tokens)} token)
                · ${E(new Date(c.claimed_at).toLocaleString(
                  'it-IT',{timeZone:'Europe/Rome'}
                ))}
              </p>
            `).join('')
            :'<p style="font-size:12px">Nessun riscatto in questa settimana.</p>'
          }
        </div>

        ${people.length
          ?people.map(card).join('')
          :'<p>Nessun giocatore trovato nel Club.</p>'
        }

        <small>
          I progressi si aggiornano quando i giocatori
          sincronizzano le proprie partite. Lo stato
          RISCATTATO indica un premio effettivamente ottenuto.
        </small>

      </section>`;
  }

  window.mpM1FounderMonitorWeek=async week=>{
    const el=document.getElementById(
      'mpM1FounderMonitor'
    );

    if(!el)return;

    el.textContent='Caricamento dei progressi…';

    try{
      const db=window.matchpulseSupabase;

      if(!db){
        throw Error('Supabase non disponibile');
      }

      const {data,error}=await db.rpc(
        'mp_m1_founder_report',
        {p_week:week}
      );

      if(error)throw error;

      render(data||{},week);

    }catch(e){
      el.textContent=
        'Impossibile caricare il monitoraggio: '+
        (e?.message||String(e));
    }
  };

  window.mpM1FounderMonitorOpen=()=>
    window.mpM1FounderMonitorWeek(mondayDate());

  // Se MatchPulse rimane aperto oltre la mezzanotte,
  // controlla il cambio di settimana e aggiorna le Sfide.
  let lastWeek=mondayDate();

  function checkWeek(){
    const next=mondayDate();

    if(next!==lastWeek){
      lastWeek=next;
      window.mpM1Retry?.();
    }
  }

  document.addEventListener(
    'visibilitychange',
    ()=>{
      if(!document.hidden)checkWeek();
    }
  );

  setInterval(checkWeek,60000);
})();


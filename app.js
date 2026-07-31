const STORAGE_KEY = "matchpulse.matches.v1";
const app = document.querySelector("#app");
const navButtons = [...document.querySelectorAll(".nav-btn")];
let route = "home";
let selectedMatchId = null;

const fields = {
  "Info partita": [
    ["date", "Data", "date", null, "1"],
    ["result", "Risultato", "text", null, "1"],

    [
      "outcome",
      "Esito",
      "select",
      ["Vittoria", "Pareggio", "Sconfitta"],
      "1"
    ],

    ["field", "Campo", "text", null, "1"]
  ],

  "Prestazione": [
    ["goals", "Gol", "number", null, "1"],
    ["assists", "Assist", "number", null, "1"],
    [
      "rating",
      "Valutazione generale",
      "number",
      null,
      "0.5"
    ]
  ]
};

const sectionNames = {
  info: "Info partita", attack: "Attacco", passing: "Passaggi", dribbling: "Dribbling", defense: "Difesa", possession: "Gestione palla", goalkeeper: "Portiere"
};

function getMatches() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function saveMatches(matches) { localStorage.setItem(STORAGE_KEY, JSON.stringify(matches)); }
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function pct(a, b) { return num(b) > 0 ? `${((num(a) / num(b)) * 100).toFixed(1)}%` : "—"; }
function avg(a, b) { return num(b) > 0 ? (num(a) / num(b)).toFixed(2) : "—"; }
function formatDate(value) { if (!value) return "Senza data"; return new Date(value + "T12:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }); }
function sum(matches, key) { return matches.reduce((acc, m) => acc + num(m[key]), 0); }
function toast(text) {
  let el = document.querySelector(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
  el.textContent = text; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 1800);
}

function mpSetTopProfileButtonVisible(visible) {
  const button = document.querySelector(
    ".top-profile-btn"
  );

  if (!button) {
    return;
  }

  button.classList.toggle(
    "is-hidden",
    !visible
  );

  button.setAttribute(
    "aria-hidden",
    String(!visible)
  );

  button.tabIndex = visible ? 0 : -1;
}


function mpSyncTopProfileButton() {
  const profilePageOpen =
    document.querySelector(
      ".profile-setup-section"
    );

  const shouldShow =
    route === "home" &&
    !profilePageOpen;

  mpSetTopProfileButtonVisible(
    shouldShow
  );
}

function setRoute(next, id = null) {
  route = next;
  selectedMatchId = id;

  navButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.route === route
    );
  });

  render();
  mpSyncTopProfileButton();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}
navButtons.forEach(btn => btn.addEventListener("click", () => setRoute(btn.dataset.route)));

function totals(matches = getMatches()) {
  const played = matches.length;
  const shots = sum(matches, "shots");
  const shotsOn = sum(matches, "shotsOn");
  const goals = sum(matches, "goals");
  const passAtt = sum(matches, "passesAttempted");
  const passComp = sum(matches, "passesCompleted");
  const dribAtt = sum(matches, "dribblesAttempted");
  const dribComp = sum(matches, "dribblesCompleted");
  const tackAtt = sum(matches, "tacklesAttempted");
  const tackWon = sum(matches, "tacklesWon");
  return { played, goals, assists: sum(matches, "assists"), shots, shotsOn, passAtt, passComp, dribAtt, dribComp, tackAtt, tackWon, rating: sum(matches, "rating") };
}

function clamp(value, min = 40, max = 99) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
function ratioValue(a, b) {
  return num(b) > 0 ? (num(a) / num(b)) * 100 : 0;
}
function perMatch(matches, key) {
  return matches.length ? sum(matches, key) / matches.length : 0;
}

/* =========================================================
   PROFILO GIOCATORE
   ========================================================= */

let pendingProfilePhoto = null;
const MP_CARD_ROLE_OPTIONS = [
  ["ATT", "Attaccante"],
  ["ALA", "Ala / esterno"],
  ["COC", "Trequartista"],
  ["CC", "Centrocampista"],
  ["CDC", "Mediano"],
  ["DC", "Difensore centrale"],
  ["TERZINO", "Laterale difensivo"]
];

const MP_CARD_ROLES =
  MP_CARD_ROLE_OPTIONS.map(
    ([value]) => value
  );


const MP_CARD_STYLE_OPTIONS = [
  ["Equilibrato", "Completo"],
  ["Finalizzatore", "Tiro e attacco"],
  ["Regista", "Passaggi e visione"],
  ["Dribblatore", "Tecnica e controllo"],
  ["Difensore", "Difesa e marcatura"],
  ["Motore", "Corsa e intensità"],
  ["Velocista", "Scatti e accelerazione"],
  ["Boa", "Fisico e protezione palla"]
];

const MP_CARD_STYLES =
  MP_CARD_STYLE_OPTIONS.map(
    ([value]) => value
  );

function getPlayerProfile() {
  const saved = JSON.parse(
    localStorage.getItem(
      "matchpulse_player_profile"
    ) || "{}"
  );

  const savedRole = String(
    saved.role || ""
  )
    .trim()
    .toUpperCase();

  const savedStyle = String(
    saved.playStyle || ""
  ).trim();

  return {
    name:
      saved.name ||
      "Giuseppe",

    role:
      MP_CARD_ROLES.includes(savedRole)
        ? savedRole
        : "CC",

    shirtNumber:
      saved.shirtNumber ||
      "10",

    foot:
      saved.foot ||
      "Destro",

    playStyle:
      MP_CARD_STYLES.includes(savedStyle)
        ? savedStyle
        : "Equilibrato",

    team:
      saved.team ||
      "",

    photo:
      saved.photo ||
      "profile.jpg",

    photoX:
      saved.photoX ?? 50,

    photoY:
      saved.photoY ?? 8,

    photoZoom:
      saved.photoZoom ?? 1.02,

    completed:
      saved.completed ||
      false
  };
}

function savePlayerProfileData(profile) {
  localStorage.setItem("matchpulse_player_profile", JSON.stringify(profile));
}

function isPlayerProfileReady() {
  const saved = JSON.parse(localStorage.getItem("matchpulse_player_profile") || "{}");
  return saved.completed === true;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function resizeProfileImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const maxSize = 900;
        const scale = Math.min(1, maxSize / img.width, maxSize / img.height);

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };

      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function previewProfilePhoto(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    pendingProfilePhoto = await resizeProfileImage(file);

    const img = document.getElementById("profilePhotoPreview");
    if (img) {
      img.src = pendingProfilePhoto;
    }

    updateProfilePreview();
  } catch (error) {
    toast("Impossibile caricare questa foto");
  }
}

function updateProfilePreview() {
  const form = document.querySelector(".profile-setup-form");
  const img = document.getElementById("profilePhotoPreview");

  if (!form || !img) return;

  const x = form.photoX.value;
  const y = form.photoY.value;
  const zoom = form.photoZoom.value;

  img.style.objectPosition = `${x}% ${y}%`;
  img.style.transform = `scale(${zoom})`;

  const xLabel = document.getElementById("photoXValue");
  const yLabel = document.getElementById("photoYValue");
  const zoomLabel = document.getElementById("photoZoomValue");

  if (xLabel) xLabel.textContent = `${x}%`;
  if (yLabel) yLabel.textContent = `${y}%`;
  if (zoomLabel) zoomLabel.textContent = `${zoom}x`;
}

function renderProfileSetup(editMode = false) {
  mpSetTopProfileButtonVisible(false);
  const profile = getPlayerProfile();
  pendingProfilePhoto = profile.photo;

  app.innerHTML = `
    <section class="section profile-setup-section">
      <div class="profile-setup-hero">
        <div>
          <h2>${editMode ? "Modifica profilo" : "Crea il tuo profilo"}</h2>
          <p>Inserisci nome, ruolo e foto da usare sulla tua card.</p>
        </div>

        ${editMode ? `<button class="ghost-btn" onclick="setRoute('home')">← Home</button>` : ""}
      </div>

      <form class="card profile-setup-form" onsubmit="savePlayerProfile(event)">
        <div class="profile-card-preview">
          <div class="profile-photo-preview-wrap">
            <img
              id="profilePhotoPreview"
              src="${escapeHtml(profile.photo || "profile.jpg")}"
              alt="Anteprima foto"
              style="object-position:${profile.photoX}% ${profile.photoY}%; transform:scale(${profile.photoZoom});"
            >
          </div>
        </div>

        <div class="field">
          <label>Nome sulla carta</label>
          <input name="name" value="${escapeHtml(profile.name)}" placeholder="Il tuo nome" required>
        </div>

        <div class="field">
          <label>Ruolo principale della carta</label>

          <select
            name="role"
            required
          >
            ${MP_CARD_ROLE_OPTIONS
              .map(([value, label]) => `
                <option
                  value="${value}"
                  ${profile.role === value
                    ? "selected"
                    : ""}
                >
                  ${value} — ${label}
                </option>
              `)
              .join("")}
            </select>

            <small class="field-help">
              È il ruolo permanente mostrato sulla carta.
              Il ruolo scelto nelle singole partite non lo modifica.
            </small>
        </div>

        <div class="profile-extra-grid">
  <div class="field">
    <label>Numero maglia</label>
    <input name="shirtNumber" value="${escapeHtml(profile.shirtNumber)}" placeholder="10" maxlength="3">
  </div>

  <div class="field">
    <label>Piede preferito</label>
    <select name="foot">
      <option value="Destro" ${profile.foot === "Destro" ? "selected" : ""}>Destro</option>
      <option value="Sinistro" ${profile.foot === "Sinistro" ? "selected" : ""}>Sinistro</option>
      <option value="Ambidestro" ${profile.foot === "Ambidestro" ? "selected" : ""}>Ambidestro</option>
    </select>
  </div>
</div>

<div class="field">
  <label>Profilo di gioco</label>

  <select
    name="playStyle"
    required
  >
    ${MP_CARD_STYLE_OPTIONS
      .map(([value, description]) => `
        <option
          value="${value}"
          ${profile.playStyle === value
            ? "selected"
            : ""}
        >
          ${value} — ${description}
        </option>
      `)
      .join("")}
  </select>

  <small class="field-help">
    Modifica leggermente la distribuzione iniziale
    delle statistiche, senza cambiare l'Overall 60.
  </small>
</div>

<div class="field">
  <label>Squadra / nickname</label>
  <input name="team" value="${escapeHtml(profile.team)}" placeholder="Es. MatchPulse FC">
</div>
        
        <div class="field">
          <label>Foto giocatore</label>
          <input name="photo" type="file" accept="image/*" onchange="previewProfilePhoto(event)">
          <small class="field-help">Meglio una foto verticale o mezzo busto. Puoi sistemarla con i controlli sotto.</small>
        </div>

        <div class="photo-controls">
          <div class="field">
            <label>Sposta destra/sinistra <span id="photoXValue">${profile.photoX}%</span></label>
            <input name="photoX" type="range" min="0" max="100" value="${profile.photoX}" oninput="updateProfilePreview()">
          </div>

          <div class="field">
            <label>Sposta alto/basso <span id="photoYValue">${profile.photoY}%</span></label>
            <input name="photoY" type="range" min="0" max="100" value="${profile.photoY}" oninput="updateProfilePreview()">
          </div>

          <div class="field">
            <label>Zoom <span id="photoZoomValue">${profile.photoZoom}x</span></label>
            <input name="photoZoom" type="range" min="0.9" max="1.5" step="0.01" value="${profile.photoZoom}" oninput="updateProfilePreview()">
          </div>
        </div>

        <button class="primary-btn" type="submit">
          ${editMode ? "Salva modifiche" : "Crea profilo"}
        </button>
      </form>
    </section>
  `;
}

function savePlayerProfile(event) {
  event.preventDefault();

  const form = event.target;
  const previousProfile =
    getPlayerProfile();

  const selectedRole = String(
    form.role.value || ""
  )
    .trim()
    .toUpperCase();

  const selectedStyle = String(
    form.playStyle.value || ""
  ).trim();

  const profile = {
    name:
      form.name.value.trim() ||
      "PLAYER",

    role:
      MP_CARD_ROLES.includes(
        selectedRole
      )
        ? selectedRole
        : "CC",

    shirtNumber:
      form.shirtNumber.value.trim() ||
      "10",

    foot:
      form.foot.value,

    playStyle:
      MP_CARD_STYLES.includes(
        selectedStyle
      )
        ? selectedStyle
        : "Equilibrato",

    team:
      form.team.value.trim(),

    photo:
      pendingProfilePhoto ||
      "profile.jpg",

    photoX:
      Number(form.photoX.value),

    photoY:
      Number(form.photoY.value),

    photoZoom:
      Number(form.photoZoom.value),

    completed:
      true
  };

  const cardIdentityChanged =
    previousProfile.role !==
      profile.role ||
    previousProfile.playStyle !==
      profile.playStyle;

  savePlayerProfileData(profile);

  /*
    Cambiando ruolo principale o stile,
    la carta viene ricostruita partendo
    dal nuovo modello iniziale.

    I ruoli salvati nelle vecchie partite
    non vengono modificati.
  */

  if (
    cardIdentityChanged &&
    typeof rebuildCardStatsFromHistory ===
      "function"
  ) {
    rebuildCardStatsFromHistory();
  }

  toast("Profilo salvato");
  setRoute("home");
}


function playerProfileSummary() {
  const profile = getPlayerProfile();

  return `
    <section class="player-profile-summary">
      <div class="profile-summary-main">
        <div class="profile-summary-avatar">
          <img src="${escapeHtml(profile.photo)}" alt="Foto profilo">
        </div>

        <div>
          <h3>${escapeHtml(profile.name)}</h3>
          <span>${escapeHtml(profile.role)} · #${escapeHtml(profile.shirtNumber)}</span>
        </div>
      </div>

      <div class="profile-summary-tags">
        <span>🦶 ${escapeHtml(profile.foot)}</span>
        <span>🎮 ${escapeHtml(profile.playStyle)}</span>
        ${profile.team ? `<span>🛡️ ${escapeHtml(profile.team)}</span>` : ""}
      </div>
    </section>
  `;
}

/* rende i pulsanti profilo sempre cliccabili */
window.renderProfileSetup = renderProfileSetup;
window.savePlayerProfile = savePlayerProfile;
window.previewProfilePhoto = previewProfilePhoto;
window.updateProfilePreview = updateProfilePreview;

function cardTierFromOvr(ovr) {
  const value = Number(ovr) || 0;

  if (value < 65) {
    return { tier: "Bronzo", tierClass: "tier-bronze" };
  }

  if (value < 75) {
    return { tier: "Argento", tierClass: "tier-silver" };
  }

  if (value < 90) {
    return { tier: "Oro", tierClass: "tier-gold" };
  }

  return { tier: "Icona", tierClass: "tier-icon" };
}

function playerRatings(matches = getMatches()) {
  const profile = getPlayerProfile();
  if (!matches.length) {
  const finalOvr = 60; // TEST TEMPORANEO
  const tierInfo = cardTierFromOvr(finalOvr);

  return {
    name: profile.name,
    role: profile.role,
    ovr: finalOvr,
    pac: 60,
    sho: 60,
    pas: 60,
    dri: 60,
    def: 60,
    phy: 60,
    tier: tierInfo.tier,
    tierClass: tierInfo.tierClass
  };
}
  const last = [...matches].sort((a,b) => (b.date || "").localeCompare(a.date || ""))[0];
  const shotOnPct = ratioValue(sum(matches, "shotsOn"), sum(matches, "shots"));
  const conversionPct = ratioValue(sum(matches, "goals"), sum(matches, "shots"));
  const passPct = ratioValue(sum(matches, "passesCompleted"), sum(matches, "passesAttempted"));
  const dribPct = ratioValue(sum(matches, "dribblesCompleted"), sum(matches, "dribblesAttempted"));
  const tacklePct = ratioValue(sum(matches, "tacklesWon"), sum(matches, "tacklesAttempted"));
  const duelPct = ratioValue(sum(matches, "duelsWon"), sum(matches, "duelsWon") + sum(matches, "duelsLost"));

  const goalsPG = perMatch(matches, "goals");
  const assistsPG = perMatch(matches, "assists");
  const keyPassesPG = perMatch(matches, "keyPasses");
  const dribblesPG = perMatch(matches, "dribblesCompleted");
  const recoveriesPG = perMatch(matches, "recoveries");
  const interceptionsPG = perMatch(matches, "interceptions");
  const tacklesWonPG = perMatch(matches, "tacklesWon");
  const foulsWonPG = perMatch(matches, "foulsSuffered");
  const blocksPG = perMatch(matches, "blocks");
  const turnoversPG = perMatch(matches, "dangerousTurnovers");

  const pac = clamp(62 + dribblesPG * 3.2 + recoveriesPG * 1.4 - turnoversPG * 2.2, 45, 99);
  const sho = clamp(50 + goalsPG * 16 + shotOnPct * .16 + conversionPct * .28, 45, 99);
  const pas = clamp(48 + passPct * .28 + assistsPG * 11 + keyPassesPG * 4.5, 45, 99);
  const dri = clamp(50 + dribPct * .30 + dribblesPG * 3.5, 45, 99);
  const def = clamp(43 + tacklePct * .24 + recoveriesPG * 4 + interceptionsPG * 4 + blocksPG * 3, 40, 99);
  const phy = clamp(52 + duelPct * .20 + tacklesWonPG * 3 + foulsWonPG * 2.2 + recoveriesPG * 1.4, 45, 99);
  const calculatedOvr = clamp((pac + sho + pas + dri + def + phy) / 6, 0, 99);

/* TEST OVR: metti un numero solo per provare, poi rimetti null */
const testOvr = null;

const cardOvr = testOvr !==null? testOvr : Math.round(calculatedOvr);
 const tierInfo =
  cardOvr < 65
    ? { tier: "Bronzo", tierClass: "tier-bronze" }
    : cardOvr < 75
      ? { tier: "Argento", tierClass: "tier-silver" }
      : cardOvr < 90
        ? { tier: "Oro", tierClass: "tier-gold" }
        : { tier: "Icona", tierClass: "tier-icon" };
return {
  name: "Giuseppe",
  role: (profile.role || last.role || "PLAYER").toUpperCase().slice(0, 8),
  ovr: cardOvr,
  pac,
  sho,
  pas,
  dri,
  def,
  phy,
  tier: tierInfo.tier,
  tierClass: tierInfo.tierClass
};
}

/* =========================================================
   PS+ MOSTRATI SULLA CARTA
   ========================================================= */

function mpGetCardPlusIcons() {
  let saved = {};

  try {
    saved = JSON.parse(
      localStorage.getItem("matchpulse_playstyles_v1") || "{}"
    );
  } catch (error) {
    saved = {};
  }

  const plusIcons = [];

  /* TIRO A GIRO+ */
  if (saved.finesseShot === "plus") {
    plusIcons.push({
      name: "Tiro a giro+",
      src: "assets/playstyles/finesse-shot-plus.png"
    });
  }

  /* Sulla carta potranno apparire massimo 3 PS+ */
  return plusIcons.slice(0, 3);
}

function mpCardPlusIcon(icon) {
  if (!icon) return "";

  return `
    <img
      class="card-ps-plus-icon"
      src="${escapeHtml(icon.src)}"
      alt="${escapeHtml(icon.name)}"
    >
  `;
}

function playerCard(r) {
  const profile = getPlayerProfile();
  const photoSrc = profile.photo || "profile.jpg";
  const plusIcons = mpGetCardPlusIcons();

  const cardStats = getCardStats();
  const cardOvr = calculateOVR(cardStats);
  const cardRarity = getCardRarity(cardOvr);

  const cardTierLabel = {
    bronze: "Bronzo",
    silver: "Argento",
    gold: "Oro",
    icon: "Icona",
    special: "Icona"
  }[cardRarity] || "Argento";

  return `<article class="player-card card-${cardRarity}" aria-label="Carta giocatore" style="--photo-x:${profile.photoX}%; --photo-y:${profile.photoY}%; --photo-zoom:${profile.photoZoom};">
    <div class="player-card-glow"></div>

    <div class="player-top">
      <div>
        <strong class="card-ovr">${cardOvr}</strong>
        <span class="card-overall-label">OVERALL</span>
      </div>

      <div>
        <b>${escapeHtml(profile.role || "CC")}</b>
        <span>${escapeHtml(cardTierLabel)}</span>
      </div>
    </div>

    <div class="player-card-side-info">
      <div>
        ${mpCardPlusIcon(plusIcons[0])}

        <span>MAGLIA</span>
        <strong>#${escapeHtml(profile.shirtNumber || "10")}</strong>
      </div>

      <div>
        ${mpCardPlusIcon(plusIcons[1])}

        <span>PIEDE</span>
        <strong>${escapeHtml((profile.foot || "Destro").toUpperCase())}</strong>
      </div>

      <div>
        ${mpCardPlusIcon(plusIcons[2])}

        <span>STILE</span>
        <strong>${escapeHtml((profile.playStyle || "Equilibrato").toUpperCase())}</strong>
      </div>
    </div>

    <div class="player-photo-wrap">
      <img class="player-photo" src="${escapeHtml(photoSrc)}" alt="Foto giocatore">
    </div>

    <h3>${escapeHtml(r.name)}</h3>

    <div class="player-stats">
  <div>
    <strong class="stat-pac">${Math.round(cardStats.pac)}</strong>
    <span>PAC</span>
  </div>

  <div>
    <strong class="stat-sho">${Math.round(cardStats.sho)}</strong>
    <span>SHO</span>
  </div>

  <div>
    <strong class="stat-pas">${Math.round(cardStats.pas)}</strong>
    <span>PAS</span>
  </div>

  <div>
    <strong class="stat-dri">${Math.round(cardStats.dri)}</strong>
    <span>DRI</span>
  </div>

  <div>
    <strong class="stat-def">${Math.round(cardStats.def)}</strong>
    <span>DEF</span>
  </div>

  <div>
    <strong class="stat-phy">${Math.round(cardStats.phy)}</strong>
    <span>PHY</span>
  </div>
</div>
  </article>`;
}
function playerStat(label, value) {
  return `<div><strong>${value}</strong><span>${label}</span></div>`;
}

function homeMiniStat(label, value, sublabel, accent = "green") {
  return `
    <div class="home-mini-card ${accent}">
      <span class="mini-label">${label}</span>
      <strong class="mini-value">${value}</strong>
      <span class="mini-sub">${sublabel}</span>
    </div>
  `;
}

function homeActionTile(icon, title, subtitle, routeName, accent = "green") {
  return `
    <button class="home-action-tile ${accent}" onclick="setRoute('${routeName}')">
      <div class="action-icon">${icon}</div>
      <div class="action-text">
        <strong>${title}</strong>
        <span>${subtitle}</span>
      </div>
    </button>
  `;
}

function homeTrendPreview(matches) {
  const ordered = [...matches].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const recent = ordered.slice(-6).map(m => num(m.rating)).filter(v => Number.isFinite(v) && v > 0);

  if (recent.length < 2) {
    return `
      <div class="home-trend-card">
        <div class="home-trend-head">
          <div>
            <h3>ANDAMENTO</h3>
            <span>Ultime partite</span>
          </div>
          <div class="trend-side-number">—</div>
        </div>
        <p class="trend-empty-text">Salva almeno 2 partite per vedere l’andamento.</p>
      </div>
    `;
  }

  const avgRecent = (recent.reduce((a, b) => a + b, 0) / recent.length).toFixed(1);
  const diff = recent[recent.length - 1] - recent[0];
  const diffText = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}`;
  const up = diff >= 0;

  return `
    <div class="home-trend-card ${up ? "up" : "down"}">
      <div class="home-trend-head">
        <div>
          <h3>ANDAMENTO</h3>
          <span>Ultime ${recent.length} partite</span>
        </div>

        <div class="trend-side-box">
          <strong>${avgRecent}</strong>
          <span>MEDIA</span>
          <em>${diffText}</em>
        </div>
      </div>

      ${homeSparkline(recent)}
    </div>
  `;
}

function homeSparkline(values) {
  const w = 320;
  const h = 110;
  const pad = 12;

  let min = Math.min(...values);
  let max = Math.max(...values);

  if (min === max) {
    min -= 1;
    max += 1;
  }

  const points = values.map((v, i) => {
    const x = pad + i * ((w - pad * 2) / (values.length - 1));
    const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    return { x, y };
  });

  const line = points.map(p => `${p.x},${p.y}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;

  return `
    <svg class="home-sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <polygon points="${area}" class="spark-area"></polygon>
      <polyline points="${line}" class="spark-line"></polyline>
      ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" class="spark-dot"></circle>`).join("")}
    </svg>
  `;
}

function achievements(matches) {
  const t = totals(matches);
  const rating = playerRatings(matches);

  const passPct = t.passesAttempted > 0
    ? pctValue(t.passesCompleted, t.passesAttempted)
    : 0;

  const shotPct = t.shots > 0
    ? pctValue(t.shotsOn, t.shots)
    : 0;

  const dribblePct = t.dribblesAttempted > 0
    ? pctValue(t.dribblesCompleted, t.dribblesAttempted)
    : 0;

  return [
    {
      icon: "🏁",
      title: "Prima partita",
      desc: "Registra la tua prima partita",
      unlocked: t.played >= 1
    },
    {
      icon: "⚽",
      title: "Bomber",
      desc: "Raggiungi 10 gol totali",
      unlocked: t.goals >= 10,
      progress: `${t.goals}/10`
    },
    {
      icon: "🎯",
      title: "Assistman",
      desc: "Raggiungi 10 assist totali",
      unlocked: t.assists >= 10,
      progress: `${t.assists}/10`
    },
    {
      icon: "🚀",
      title: "Precisione",
      desc: "Almeno 60% di tiri in porta",
      unlocked: t.shots >= 10 && shotPct >= 60,
      progress: `${shotPct}%`
    },
    {
      icon: "🧠",
      title: "Regista",
      desc: "Almeno 80% precisione passaggi",
      unlocked: t.passesAttempted >= 30 && passPct >= 80,
      progress: `${passPct}%`
    },
    {
      icon: "🌀",
      title: "Dribblomane",
      desc: "Almeno 65% dribbling riusciti",
      unlocked: t.dribblesAttempted >= 10 && dribblePct >= 65,
      progress: `${dribblePct}%`
    },
    {
      icon: "🧱",
      title: "Muro",
      desc: "Raggiungi 20 recuperi palla",
      unlocked: t.recoveries >= 20,
      progress: `${t.recoveries}/20`
    },
    {
      icon: "🔥",
      title: "Forma alta",
      desc: "Valutazione media almeno 7.5",
      unlocked: t.played >= 3 && Number(avg(t.rating, t.played)) >= 7.5,
      progress: `${avg(t.rating, t.played)}/7.5`
    },
    {
      icon: "🥉",
      title: "Carta bronzo",
      desc: "OVR da 0 a 64",
      unlocked: rating.ovr < 65
    },
    {
      icon: "🥈",
      title: "Carta argento",
      desc: "OVR da 65 a 74",
      unlocked: rating.ovr >= 65 && rating.ovr < 75
    },
    {
      icon: "🥇",
      title: "Carta oro",
      desc: "OVR da 75 a 89",
      unlocked: rating.ovr >= 75 && rating.ovr < 90
    }
  ];
}

function getCustomAchievements() {
  return JSON.parse(localStorage.getItem("matchpulse_custom_achievements") || "[]");
}

function saveCustomAchievements(items) {
  localStorage.setItem("matchpulse_custom_achievements", JSON.stringify(items));
}

function customAchievementValue(stat, matches) {
  const t = totals(matches);
  const rating = playerRatings(matches);

  if (stat === "goals") return t.goals;
  if (stat === "assists") return t.assists;
  if (stat === "played") return t.played;
  if (stat === "recoveries") return t.recoveries;
  if (stat === "rating") return Number(avg(t.rating, t.played));
  if (stat === "ovr") return rating.ovr;
  if (stat === "passesCompleted") return t.passesCompleted;
  if (stat === "shotsOn") return t.shotsOn;
  if (stat === "dribblesCompleted") return t.dribblesCompleted;

  return 0;
}

function statLabel(stat) {
  const labels = {
    goals: "Gol",
    assists: "Assist",
    played: "Partite giocate",
    recoveries: "Recuperi palla",
    rating: "Voto medio",
    ovr: "OVR carta",
    passesCompleted: "Passaggi riusciti",
    shotsOn: "Tiri in porta",
    dribblesCompleted: "Dribbling riusciti"
  };

  return labels[stat] || stat;
}

function customAchievements(matches) {
  return getCustomAchievements().map(item => {
    const value = customAchievementValue(item.stat, matches);
    const target = num(item.target);

    return {
      icon: item.icon || "🏆",
      title: item.title || "Trofeo",
      desc: `${statLabel(item.stat)}: ${value}/${target}`,
      unlocked: value >= target,
      progress: `${value}/${target}`,
      custom: true
    };
  });
}

function achievementsPreview(matches) {
  const list = [...achievements(matches), ...customAchievements(matches)];
  const unlocked = list.filter(a => a.unlocked).length;

  return `
    <section class="home-achievements-card">
      <div class="achievements-head">
  <div>
    <h3>Bacheca trofei</h3>
    <span>${unlocked}/${list.length} sbloccati</span>
  </div>

  <div class="achievements-actions">
    <strong>${Math.round((unlocked / list.length) * 100)}%</strong>
    <button type="button" onclick="window.renderAchievementsManager()">Gestisci</button>
  </div>
</div>
          <h3>Bacheca trofei</h3>
          <span>${unlocked}/${list.length} sbloccati</span>
        </div>

        <strong>${Math.round((unlocked / list.length) * 100)}%</strong>
      </div>

      <div class="achievements-list">
        ${list.map(a => `
          <div class="achievement-item ${a.unlocked ? "unlocked" : "locked"}">
            <div class="achievement-icon">${a.icon}</div>

            <div class="achievement-info">
              <strong>${a.title}</strong>
              <span>${a.desc}</span>
              ${a.progress ? `<small>${a.progress}</small>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderAchievementsManager() {
  const items = getCustomAchievements();

  app.innerHTML = `
    <section class="section">
      <div class="page-head">
        <button class="ghost-btn" onclick="setRoute('home')">← Home</button>
        <div>
          <h2>Gestisci trofei</h2>
          <p>Crea obiettivi personalizzati per la tua card.</p>
        </div>
      </div>

      <form class="card custom-achievement-form" onsubmit="addCustomAchievement(event)">
        <div class="field">
          <label>Icona</label>
          <input name="icon" placeholder="🏆" maxlength="2">
        </div>

        <div class="field">
          <label>Nome trofeo</label>
          <input name="title" placeholder="Killer sotto porta" required>
        </div>

        <div class="field">
          <label>Statistica</label>
          <select name="stat" required>
            <option value="goals">Gol</option>
            <option value="assists">Assist</option>
            <option value="played">Partite giocate</option>
            <option value="recoveries">Recuperi palla</option>
            <option value="rating">Voto medio</option>
            <option value="ovr">OVR carta</option>
            <option value="passesCompleted">Passaggi riusciti</option>
            <option value="shotsOn">Tiri in porta</option>
            <option value="dribblesCompleted">Dribbling riusciti</option>
          </select>
        </div>

        <div class="field">
          <label>Obiettivo</label>
          <input name="target" type="number" step="0.1" min="1" placeholder="10" required>
        </div>

        <button class="primary-btn" type="submit">Aggiungi trofeo</button>
      </form>

      <div class="custom-achievements-list">
        ${
          items.length
            ? items.map((item, index) => `
              <div class="card custom-achievement-row">
                <div>
                  <strong>${item.icon || "🏆"} ${item.title}</strong>
                  <span>${statLabel(item.stat)} · obiettivo ${item.target}</span>
                </div>

                <button onclick="deleteCustomAchievement(${index})">Elimina</button>
              </div>
            `).join("")
            : `<div class="card"><p class="muted">Non hai ancora creato trofei personalizzati.</p></div>`
        }
      </div>
    </section>
  `;
}

function addCustomAchievement(event) {
  event.preventDefault();

  const form = event.target;
  const item = {
    icon: form.icon.value.trim() || "🏆",
    title: form.title.value.trim(),
    stat: form.stat.value,
    target: Number(form.target.value)
  };

  if (!item.title || !item.target || item.target <= 0) {
    toast("Compila bene il trofeo");
    return;
  }

  const items = getCustomAchievements();
  items.push(item);
  saveCustomAchievements(items);

  toast("Trofeo aggiunto");
  renderAchievementsManager();
}

function deleteCustomAchievement(index) {
  const ok = confirm("Vuoi eliminare questo trofeo?");
  if (!ok) return;

  const items = getCustomAchievements();
  items.splice(index, 1);
  saveCustomAchievements(items);

  toast("Trofeo eliminato");
  renderAchievementsManager();
}

/* =========================================================
   PAGINA OBIETTIVI: PRE-PARTITA + RECORD PERSONALI
   ========================================================= */

function getPreMatchGoals() {
  return JSON.parse(localStorage.getItem("matchpulse_pre_match_goals") || "[]");
}

function savePreMatchGoals(goals) {
  localStorage.setItem("matchpulse_pre_match_goals", JSON.stringify(goals));
}

function preMatchGoalOptions() {
  return [
    { key: "goals", label: "Gol", mode: "min", step: "1" },
    { key: "assists", label: "Assist", mode: "min", step: "1" },
    { key: "rating", label: "Voto personale", mode: "min", step: "0.1" },
    { key: "shotsOn", label: "Tiri in porta", mode: "min", step: "1" },
    { key: "passesPct", label: "Precisione passaggi %", mode: "min", step: "1" },
    { key: "dribblesCompleted", label: "Dribbling riusciti", mode: "min", step: "1" },
    { key: "recoveries", label: "Recuperi palla", mode: "min", step: "1" },
    { key: "tacklesWon", label: "Contrasti vinti", mode: "min", step: "1" },
    { key: "ballsLost", label: "Palle perse massimo", mode: "max", step: "1" }
  ];
}

function preMatchGoalLabel(key) {
  const option = preMatchGoalOptions().find(item => item.key === key);
  return option ? option.label : key;
}

function latestSavedMatch(matches) {
  if (!matches.length) return null;

  return [...matches].sort((a, b) => {
    const da = a.date || "";
    const db = b.date || "";
    return db.localeCompare(da);
  })[0];
}

function preMatchGoalValue(goal, match) {
  if (!match) return null;

  if (goal.key === "goals") return num(match.goals);
  if (goal.key === "assists") return num(match.assists);
  if (goal.key === "rating") return num(match.rating);
  if (goal.key === "shotsOn") return num(match.shotsOn);
  if (goal.key === "dribblesCompleted") return num(match.dribblesCompleted);
  if (goal.key === "recoveries") return num(match.recoveries);
  if (goal.key === "tacklesWon") return num(match.tacklesWon);
  if (goal.key === "ballsLost") return num(match.ballsLost);

  if (goal.key === "passesPct") {
    if (num(match.passesAttempted) <= 0) return 0;
    return pctValue(match.passesCompleted, match.passesAttempted);
  }

  return 0;
}

function isPreMatchGoalReached(goal, match) {
  const value = preMatchGoalValue(goal, match);

  if (value === null) return false;

  if (goal.mode === "max") {
    return value <= num(goal.target);
  }

  return value >= num(goal.target);
}

function addPreMatchGoal(event) {
  event.preventDefault();

  const form = event.target;
  const key = form.elements.goalType.value;
  const target = Number(form.elements.goalTarget.value);
  const option = preMatchGoalOptions().find(item => item.key === key);

  if (!option || !target || target <= 0) {
    toast("Inserisci bene l'obiettivo");
    return;
  }

  const title = form.elements.goalTitle.value.trim() || preMatchGoalLabel(key);

  const goals = getPreMatchGoals();

  goals.unshift({
    id: Date.now(),
    title,
    key,
    target,
    mode: option.mode,
    createdAt: new Date().toISOString()
  });

  savePreMatchGoals(goals);

  toast("Obiettivo aggiunto");
  renderGoalsPage();
}

function deletePreMatchGoal(id) {
  const ok = confirm("Vuoi eliminare questo obiettivo?");
  if (!ok) return;

  const goals = getPreMatchGoals().filter(goal => goal.id !== id);
  savePreMatchGoals(goals);

  toast("Obiettivo eliminato");
  renderGoalsPage();
}

function goalPageFormatDate(match) {
  if (!match || !match.date) return "Ultima partita";

  return new Date(match.date + "T12:00:00").toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  });
}

function goalPageBestRecord(matches, label, icon, getValue, suffix = "", decimals = 0) {
  const valid = matches
    .map(match => ({
      match,
      value: getValue(match)
    }))
    .filter(item => Number.isFinite(item.value) && item.value > 0);

  if (!valid.length) return "";

  const best = valid.reduce((max, item) => item.value > max.value ? item : max, valid[0]);

  const date = goalPageFormatDate(best.match);
  const opponent = best.match.opponent || best.match.field || "";

  return `
    <div class="goal-record-item">
      <div class="goal-record-icon">${icon}</div>

      <div>
        <span>${label}</span>
        <strong>${best.value.toFixed(decimals)}${suffix}</strong>
        <small>${date}${opponent ? ` · ${escapeHtml(opponent)}` : ""}</small>
      </div>
    </div>
  `;
}

function goalsPageRecords(matches) {
  if (!matches.length) {
    return `
      <section class="goals-page-card">
        <div class="goals-page-head">
          <div>
            <h3>Record personali</h3>
            <span>Nessuna partita salvata</span>
          </div>
          <strong>🏆</strong>
        </div>

        <p class="goals-empty">Salva almeno una partita per creare i tuoi record personali.</p>
      </section>
    `;
  }

  const records = [
    goalPageBestRecord(matches, "Miglior voto", "⭐", m => num(m.rating), "/10", 1),
    goalPageBestRecord(matches, "Più gol", "⚽", m => num(m.goals)),
    goalPageBestRecord(matches, "Più assist", "🎯", m => num(m.assists)),
    goalPageBestRecord(matches, "Più dribbling", "🌀", m => num(m.dribblesCompleted)),
    goalPageBestRecord(matches, "Più recuperi", "🧱", m => num(m.recoveries)),
    goalPageBestRecord(matches, "Più contrasti vinti", "💪", m => num(m.tacklesWon)),
    goalPageBestRecord(matches, "Più parate", "🧤", m => num(m.saves)),
    goalPageBestRecord(
      matches,
      "Miglior precisione passaggi",
      "🧠",
      m => num(m.passesAttempted) >= 5 ? pctValue(m.passesCompleted, m.passesAttempted) : 0,
      "%",
      0
    )
  ].filter(Boolean);

  return `
    <section class="goals-page-card">
      <div class="goals-page-head">
        <div>
          <h3>Record personali</h3>
          <span>I tuoi picchi migliori in partita</span>
        </div>
        <strong>🏆</strong>
      </div>

      <div class="goal-records-grid">
        ${records.join("")}
      </div>
    </section>
  `;
}

/* =========================================================
   PROSSIMO UPGRADE CARTA
   ========================================================= */

function cardUpgradeInfo() {
  const rating = playerRatings(getMatches());
  const ovr = Number(rating.ovr) || 0;

  if (ovr < 65) {
    return {
      current: "Bronzo",
      next: "Argento",
      target: 65,
      from: 0,
      to: 65,
      remaining: 65 - ovr
    };
  }

  if (ovr < 75) {
    return {
      current: "Argento",
      next: "Oro",
      target: 75,
      from: 65,
      to: 75,
      remaining: 75 - ovr
    };
  }

  if (ovr < 90) {
    return {
      current: "Oro",
      next: "Icona",
      target: 90,
      from: 75,
      to: 90,
      remaining: 90 - ovr
    };
  }

  return {
    current: "Icona",
    next: "99 OVR",
    target: 99,
    from: 90,
    to: 99,
    remaining: Math.max(0, 99 - ovr)
  };
}

function cardUpgradePreview() {
  const rating = playerRatings(getMatches());
  const info = cardUpgradeInfo();
  const ovr = Number(rating.ovr) || 0;
  const cardRarity = getCardRarity(ovr);

  const progress = Math.max(
    0,
    Math.min(100, ((ovr - info.from) / (info.to - info.from)) * 100)
  );

  const remainingText = info.remaining <= 0
    ? "Upgrade massimo raggiunto"
    : `${Number(info.remaining.toFixed(1))} punti OVR`;

  return `
    <section class="goals-page-card card-upgrade-card-${cardRarity}">
      <div class="goals-page-head">
        <div>
          <h3>Prossimo upgrade carta</h3>
          <span>${info.current} → ${info.next}</span>
        </div>

        <strong>⬆️</strong>
      </div>

      <div class="card-upgrade-content">
        <div class="card-upgrade-ovr">
          <span>OVR</span>
          <strong>${rating.ovr}</strong>
          <small>${escapeHtml(info.current)}</small>
        </div>

        <div class="card-upgrade-details">
          <div>
            <span>Carta attuale</span>
            <strong>${escapeHtml(info.current)}</strong>
          </div>

          <div>
            <span>Prossimo step</span>
            <strong>${escapeHtml(info.next)}</strong>
          </div>

          <div>
            <span>Target</span>
            <strong>${info.target} OVR</strong>
          </div>

          <div>
            <span>Ti manca</span>
            <strong>${remainingText}</strong>
          </div>
        </div>
      </div>

      <div class="card-upgrade-progress">
        <div class="card-upgrade-bar">
          <div style="width:${progress}%"></div>
        </div>

        <small>${Math.round(progress)}% verso il prossimo upgrade</small>
      </div>
    </section>
  `;
}

function renderGoalsPage() {
  const matches = getMatches();
  const last = latestSavedMatch(matches);
  const goals = getPreMatchGoals();

  app.innerHTML = `
    <section class="section goals-page">
      <div class="page-head">
        <button class="ghost-btn" onclick="setRoute('home')">← Home</button>

        <div>
          <h2>Obiettivi</h2>
          <p>Imposta cosa vuoi fare prima della partita e controlla dopo se ci sei riuscito.</p>
        </div>
      </div>

      ${cardUpgradePreview()}

      <section class="goals-page-card">
        <div class="goals-page-head">
          <div>
            <h3>Obiettivi pre-partita</h3>
            <span>
              ${last ? `Valutati su: ${goalPageFormatDate(last)}` : "Nessuna partita salvata"}
            </span>
          </div>

          <strong>🎯</strong>
        </div>

        <form class="pre-goal-form" onsubmit="addPreMatchGoal(event)">
          <div class="field">
            <label>Nome obiettivo</label>
            <input name="goalTitle" placeholder="Es. Partita da bomber">
          </div>

          <div class="pre-goal-grid">
            <div class="field">
              <label>Statistica</label>
              <select name="goalType" required>
                ${preMatchGoalOptions().map(option => `
                  <option value="${option.key}">${option.label}</option>
                `).join("")}
              </select>
            </div>

            <div class="field">
              <label>Obiettivo</label>
              <input name="goalTarget" type="number" min="0.1" step="0.1" placeholder="1" required>
            </div>
          </div>

          <button class="primary-btn" type="submit">Aggiungi obiettivo</button>
        </form>

        <div class="pre-goals-list">
          ${
            goals.length
              ? goals.map(goal => {
                  const value = preMatchGoalValue(goal, last);
                  const reached = last ? isPreMatchGoalReached(goal, last) : false;
                  const statusClass = !last ? "pending" : reached ? "done" : "missed";
                  const statusText = !last ? "Da valutare" : reached ? "Raggiunto" : "Non raggiunto";
                  const symbol = goal.mode === "max" ? "≤" : "≥";

                  return `
                    <div class="pre-goal-item ${statusClass}">
                      <div>
                        <strong>${escapeHtml(goal.title)}</strong>
                        <span>
                          ${preMatchGoalLabel(goal.key)} ${symbol} ${goal.target}
                        </span>
                        <small>
                          Ultima partita: ${value === null ? "—" : value}
                        </small>
                      </div>

                      <div class="pre-goal-side">
                        <em>${statusText}</em>
                        <button type="button" onclick="deletePreMatchGoal(${goal.id})">Elimina</button>
                      </div>
                    </div>
                  `;
                }).join("")
              : `
                <div class="goals-empty-box">
                  <p>Nessun obiettivo pre-partita attivo.</p>
                  <span>Esempio: “voglio fare almeno 1 assist” oppure “voglio perdere massimo 5 palloni”.</span>
                </div>
              `
          }
        </div>
      </section>

      ${goalsPageRecords(matches)}
    </section>
  `;
}

/* rende cliccabili i pulsanti della pagina Obiettivi */
window.renderGoalsPage = renderGoalsPage;
window.addPreMatchGoal = addPreMatchGoal;
window.deletePreMatchGoal = deletePreMatchGoal;

/* =========================================================
   SPOGLIATOIO / CLUB
   ========================================================= */

function getLockerReports() {
  return JSON.parse(localStorage.getItem("matchpulse_locker_reports") || "[]");
}

function saveLockerReports(reports) {
  localStorage.setItem("matchpulse_locker_reports", JSON.stringify(reports));
}

function renderLockerRoom() {
  const reports = getLockerReports();

  app.innerHTML = `
    <section class="section locker-page">
      <div class="page-head">
        <div>
          <h2>Spogliatoio</h2>
          <p>Qui finiranno i report condivisi della squadra.</p>
        </div>
      </div>

      <section class="locker-hero-card">
        <div>
          <span>🏟️</span>
          <h3>Report squadra</h3>
          <p>
            Crea un report dopo la partita e pubblicalo qui. Più avanti potremo collegarlo online,
            così anche i tuoi amici potranno vedere i report entrando nello stesso Club.
          </p>
        </div>
      </section>

      <section class="locker-reports-card">
        <div class="locker-head">
          <div>
            <h3>Ultimi report</h3>
            <span>${reports.length} pubblicati</span>
          </div>

          <strong>🛡️</strong>
        </div>

        ${
          reports.length
            ? `
              <div class="locker-report-list">
                ${reports.map(report => `
                  <div class="locker-report-item">
                    <div class="locker-report-top">
                      <strong>${escapeHtml(report.playerName || "Giocatore")}</strong>
                      <span>${escapeHtml(report.rating || "—")}</span>
                    </div>

                    <p>
                      ${escapeHtml(report.summary || "Report partita")}
                    </p>

                    <small>${escapeHtml(report.date || "Data non disponibile")}</small>
                  </div>
                `).join("")}
              </div>
            `
            : `
              <div class="locker-empty">
                <strong>Nessun report pubblicato</strong>
                <p>
                  Per ora lo Spogliatoio è pronto, ma dobbiamo ancora creare il pulsante
                  “Pubblica report” dal dettaglio partita.
                </p>
                <button type="button" onclick="setRoute('history')">
                  Vai allo storico
                </button>
              </div>
            `
        }
      </section>
    </section>
  `;
}

function renderHome() {
  if (!isPlayerProfileReady()) {
    renderProfileSetup(false);
    return;
  }
  const matches = getMatches();
  const t = totals(matches);
  const last = [...matches].sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
  const best = [...matches].sort((a, b) => num(b.rating) - num(a.rating))[0];
  const ratingCard = playerRatings(matches);

  const avgRating = avg(t.rating, t.played);
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const monthMatches = matches.filter(m => {
    if (!m.date) return false;
    const d = new Date(m.date + "T12:00:00");
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  app.innerHTML = `
    <section class="premium-home">
      <div class="featured-card-wrap">
  <div class="home-brand">
    <div class="brand-mark">⚽</div>
    <div class="brand-text">
      <strong>MATCH<span>PULSE</span></strong>
      <small>Stats Tracker</small>
    </div>
    <div class="brand-pulse"></div>
  </div>

  ${playerCard(ratingCard)}
</div>
  
  
  ${playerProfileSummary()}
  ${achievementsPreview(matches)}

      <div class="home-mini-grid">
        ${homeMiniStat(
          "ULTIMA PARTITA",
          last ? (last.result || "—") : "—",
          last ? (last.outcome || "Nessun dato") : "Nessuna partita",
          "green"
        )}

        ${homeMiniStat(
          "VALUTAZIONE MEDIA",
          avgRating,
          t.played ? "Su tutte le partite" : "Ancora nessun dato",
          "yellow"
        )}

        ${homeMiniStat(
          "PARTITE GIOCATE",
          t.played,
          `${monthMatches} questo mese`,
          "blue"
        )}
      </div>

      

      ${homeTrendPreview(matches)}

      <div class="home-action-grid">
        ${homeActionTile("⚽", "NUOVA", "PARTITA", "new", "green")}
        ${homeActionTile("📋", "STORICO", "PARTITE", "history", "purple")}
        ${homeActionTile("📊", "STATISTICHE", "DETTAGLIATE", "stats", "orange")}
        ${homeActionTile("🎯", "OBIETTIVI", "PRE PARTITA", "goals", "blue")}
      </div>
    </section>
  `;
}

function actionTile(icon, title, subtitle, target, accent) {
  const click = target ? `setRoute('${target}')` : `toast('Obiettivi in arrivo')`;
  return `<button class="mp-action ${accent}" onclick="${click}"><span>${icon}</span><strong>${title}</strong><em>${subtitle}</em></button>`;
}
function statCard(value, label) { return `<div class="card stat-card"><strong>${value}</strong><span>${label}</span></div>`; }
function miniMatch(m) {
  return `<div class="match-card" onclick="setRoute('detail','${m.id}')">
    <h3>${m.result || "Partita"}</h3>
    <div class="match-meta">
      <span class="pill good">Gol ${num(m.goals)}</span><span class="pill">Assist ${num(m.assists)}</span><span class="pill">Voto ${m.rating || "—"}</span><span class="pill">Passaggi ${pct(m.passesCompleted, m.passesAttempted)}</span>
    </div>
  </div>`;
}

function mpSelfRatingRow(
  name,
  icon,
  title,
  description
) {
  return `
    <label class="self-rating-row">

      <div class="self-rating-head">

        <span class="self-rating-icon">
          ${icon}
        </span>

        <div class="self-rating-text">
          <strong>${title}</strong>
          <small>${description}</small>
        </div>

        <output
          class="self-rating-value"
          id="${name}Value"
        >
          6.0
        </output>

      </div>

      <input
        type="range"
        name="${name}"
        min="1"
        max="10"
        step="0.5"
        value="6"
        required
        oninput="mpUpdateSelfRating(this)"
      >

      <div class="self-rating-scale">
        <span>1</span>
        <span>5</span>
        <span>10</span>
      </div>

    </label>
  `;
}


function mpUpdateSelfRating(input) {
  const output = document.getElementById(
    `${input.name}Value`
  );

  if (!output) {
    return;
  }

  output.textContent = Number(
    input.value
  ).toFixed(1);
}

window.mpUpdateSelfRating = mpUpdateSelfRating;

function renderNew() {
  app.innerHTML = `
    <section class="section new-match-page">

      <div class="new-match-header">
        <span>REPORT PRESTAZIONE</span>
        <h2>Nuova partita</h2>

        <p>
          Inserisci i dati essenziali e valuta le
          caratteristiche della tua prestazione.
        </p>
      </div>

      <form
        id="match-form"
        class="grid"
      ></form>

    </section>
  `;

  const form = document.querySelector(
    "#match-form"
  );

  Object.entries(fields).forEach(
    ([key, items]) => {
      const section = document.createElement(
        "div"
      );

      section.className =
        "card form-section match-form-card";

      section.innerHTML = `
        <h3>${sectionNames[key] || key}</h3>

        <div class="grid form-grid"></div>
      `;

      const grid = section.querySelector(
        ".form-grid"
      );

      items.forEach(
        ([name, label, type, options, step]) => {
          grid.appendChild(
            createField(
              name,
              label,
              type,
              options,
              step
            )
          );
        }
      );

      form.appendChild(section);

      /*
        Il ruolo viene mostrato subito dopo
        le informazioni della partita.
      */

      if (key === "Info partita") {
        const roleSection =
          document.createElement("div");

        roleSection.className =
          "card form-section match-role-section";

        roleSection.innerHTML = `
          <div class="match-section-intro">
            <div>
              <span>IDENTITÀ TATTICA</span>
              <h3>Ruolo nella partita</h3>
            </div>

            <strong>⚽</strong>
          </div>

          <p class="match-section-help">
            Il ruolo stabilisce quali statistiche
            avranno più peso nell’upgrade della carta.
          </p>

          <div class="match-role-grid">

            <label class="match-role-option">
              <input
                type="radio"
                name="role"
                value="ATT"
                required
              >

              <span>
                <b>ATT</b>
                <small>Attaccante</small>
              </span>
            </label>


            <label class="match-role-option">
              <input
                type="radio"
                name="role"
                value="ALA"
                required
              >

              <span>
                <b>ALA</b>
                <small>Esterno</small>
              </span>
            </label>


            <label class="match-role-option">
              <input
                type="radio"
                name="role"
                value="COC"
                required
              >

              <span>
                <b>COC</b>
                <small>Trequartista</small>
              </span>
            </label>


            <label class="match-role-option">
              <input
                type="radio"
                name="role"
                value="CC"
                required
              >

              <span>
                <b>CC</b>
                <small>Centrocampista</small>
              </span>
            </label>


            <label class="match-role-option">
              <input
                type="radio"
                name="role"
                value="CDC"
                required
              >

              <span>
                <b>CDC</b>
                <small>Mediano</small>
              </span>
            </label>


            <label class="match-role-option">
              <input
                type="radio"
                name="role"
                value="DC"
                required
              >

              <span>
                <b>DC</b>
                <small>Difensore</small>
              </span>
            </label>


            <label class="match-role-option">
              <input
                type="radio"
                name="role"
                value="TERZINO"
                required
              >

              <span>
                <b>TERZINO</b>
                <small>Laterale difensivo</small>
              </span>
            </label>

          </div>
        `;

        form.appendChild(roleSection);
      }
    }
  );


  /*
    AUTOVALUTAZIONE DELLE SEI STATISTICHE
  */

  const evaluationSection =
    document.createElement("div");

  evaluationSection.className =
    "card form-section self-evaluation-section";

  evaluationSection.innerHTML = `
    <div class="match-section-intro">

      <div>
        <span>AUTOVALUTAZIONE</span>
        <h3>Come valuti la tua prestazione?</h3>
      </div>

      <strong>📊</strong>

    </div>

    <p class="match-section-help">
      Valuta quanto sei andato bene
      in ciascun aspetto, da 1 a 10.
    </p>

    <div class="self-rating-list">

      ${mpSelfRatingRow(
        "selfPac",
        "⚡",
        "Velocità",
        "Scatti, accelerazioni e recuperi"
      )}

      ${mpSelfRatingRow(
        "selfSho",
        "🎯",
        "Finalizzazione",
        "Conclusioni, precisione e freddezza"
      )}

      ${mpSelfRatingRow(
        "selfPas",
        "🧠",
        "Passaggi e visione",
        "Impostazione, assist e scelte di gioco"
      )}

      ${mpSelfRatingRow(
        "selfDri",
        "✨",
        "Dribbling e controllo",
        "Primo controllo, tecnica e gestione palla"
      )}

      ${mpSelfRatingRow(
        "selfDef",
        "🛡️",
        "Difesa e posizionamento",
        "Marcatura, intercetti e coperture"
      )}

      ${mpSelfRatingRow(
        "selfPhy",
        "💪",
        "Fisico e protezione palla",
        "Duelli, resistenza e gioco spalle alla porta"
      )}

    </div>
  `;

  form.appendChild(evaluationSection);


  /*
    NOTE
  */

  const notes = document.createElement("div");

  notes.className =
    "card form-section match-form-card";

  notes.innerHTML = `
    <h3>Note</h3>

    <label class="field">
      <span>Commento sulla partita</span>

      <textarea
        name="notes"
        placeholder="Es: ottima partita in impostazione, stanco nel finale..."
      ></textarea>
    </label>
  `;

  form.appendChild(notes);


  /*
    AZIONI
  */

  const actions = document.createElement("div");

  actions.className = "grid match-form-actions";

  actions.innerHTML = `
    <button
      class="primary-btn"
      type="submit"
    >
      Salva partita
    </button>

    <button
      class="secondary-btn"
      type="button"
      onclick="setRoute('home')"
    >
      Annulla
    </button>
  `;

  form.appendChild(actions);


  /*
    IMPOSTAZIONI CAMPI
  */

  const date = form.querySelector(
    "[name='date']"
  );

  if (date) {
    date.valueAsDate = new Date();
  }

  const ratingInput = form.querySelector(
    "[name='rating']"
  );

  if (ratingInput) {
    ratingInput.min = "1";
    ratingInput.max = "10";
    ratingInput.step = "0.5";
    ratingInput.placeholder = "Es. 7.5";
    ratingInput.required = true;
  }

  form.addEventListener(
    "submit",
    handleSave
  );
}

function createField(name, label, type, options, step) {
  const wrap = document.createElement("label"); wrap.className = "field";
  const span = document.createElement("span"); span.textContent = label; wrap.appendChild(span);
  let input;
  if (type === "select") {
    input = document.createElement("select"); input.name = name;
    ["", ...options].forEach(opt => { const o = document.createElement("option"); o.value = opt; o.textContent = opt || "Seleziona"; input.appendChild(o); });
  } else {
    input = document.createElement("input"); input.name = name; input.type = type; if (type === "number") { input.min = "0"; input.step = step || "1"; input.inputMode = "decimal"; input.placeholder = "0"; }
  }
  wrap.appendChild(input); return wrap;
}
function handleSave(e) {
  e.preventDefault();

  const data = Object.fromEntries(new FormData(e.target).entries());
  const selfRatingKeys = [
  "selfPac",
  "selfSho",
  "selfPas",
  "selfDri",
  "selfDef",
  "selfPhy"
];

selfRatingKeys.forEach(key => {
  data[key] = num(data[key]);
});

data.role = String(
  data.role || ""
).trim().toUpperCase();

  Object.values(fields).flat().forEach(([name, label, type]) => {
    if (type === "number") data[name] = num(data[name]);
  });
  if (!data.role) {
  toast("Seleziona il ruolo della partita");
  return;
}

if (
  data.rating < 1 ||
  data.rating > 10
) {
  toast("Inserisci una valutazione da 1 a 10");
  return;
}

const invalidSelfRating =
  selfRatingKeys.some(key => {
    return (
      data[key] < 1 ||
      data[key] > 10
    );
  });

if (invalidSelfRating) {
  toast(
    "Completa tutte le autovalutazioni da 1 a 10"
  );

  return;
}

  // Compatibilità con il resto dell'app
// Alcune parti vecchie del codice usano nomi diversi.
data.shotsOnTarget = num(data.shotsOn);
data.dribbles = num(data.dribblesCompleted);
data.turnovers = num(data.ballsLost);
data.dangerousTurnovers = 0;

if (num(data.shots) < num(data.shotsOn)) {
  data.shots = num(data.shotsOn);
}
  data.id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  data.createdAt = new Date().toISOString();

  const matches = getMatches();
  matches.push(data);
  saveMatches(matches);

  rebuildCardStatsFromHistory();

  toast("Partita salvata");
  setRoute("detail", data.id);

  setTimeout(() => {
    renderPlayerCardStats();
  }, 0);
}

function renderHistory() {
  const matches = [...getMatches()].sort((a,b) => (b.date || "").localeCompare(a.date || ""));
  app.innerHTML = `<section class="section"><h2>Storico partite</h2><div class="grid">${matches.length ? matches.map(matchCard).join("") : `<div class="empty">Nessuna partita salvata. Aggiungine una dalla schermata “Nuova”.</div>`}</div></section>`;
}
function matchCard(m) {
  return `<article class="card match-card" onclick="setRoute('detail','${m.id}')">
    <div class="card-title"><h3>${formatDate(m.date)}</h3><span>${m.outcome || ""}</span></div>
    <div class="match-meta">
      <span class="pill good">${num(m.goals)} G</span><span class="pill">${num(m.assists)} A</span><span class="pill">Voto ${m.rating || "—"}</span><span class="pill">${m.role || "Ruolo —"}</span>
    </div>
    <div class="metric-list">
      ${metric("Tiri in porta", pct(m.shotsOn, m.shots))}
      ${metric("Realizzazione", pct(m.goals, m.shots))}
      ${metric("Passaggi", pct(m.passesCompleted, m.passesAttempted))}
    </div>
  </article>`;
}
function metric(label, value) { return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`; }

function renderDetail() {
  const m = getMatches().find(x => x.id === selectedMatchId);
  if (!m) { setRoute("history"); return; }
  app.innerHTML = `<section class="section">
    <div class="card">
      <div class="card-title"><h3>${formatDate(m.date)}</h3><span>${m.outcome || ""}</span></div>
      <div class="match-meta"><span class="pill good">${m.result || "Risultato —"}</span><span class="pill">${m.role || "Ruolo —"}</span><span class="pill">${m.duration || "—"} min</span><span class="pill warn">Voto ${m.rating || "—"}</span></div>
    </div>
    <div class="grid cards">
      <div class="card"><div class="card-title"><h3>Percentuali chiave</h3><span>calcolate</span></div><div class="metric-list">
        ${metric("Tiri in porta", pct(m.shotsOn, m.shots))}
        ${bar(pctValue(m.shotsOn, m.shots))}
        ${metric("Realizzazione", pct(m.goals, m.shots))}
        ${bar(pctValue(m.goals, m.shots))}
        ${metric("Precisione passaggi", pct(m.passesCompleted, m.passesAttempted))}
        ${bar(pctValue(m.passesCompleted, m.passesAttempted))}
        ${metric("Successo dribbling", pct(m.dribblesCompleted, m.dribblesAttempted))}
        ${bar(pctValue(m.dribblesCompleted, m.dribblesAttempted))}
        ${metric("Contrasti vinti", pct(m.tacklesWon, m.tacklesAttempted))}
        ${bar(pctValue(m.tacklesWon, m.tacklesAttempted))}
      </div></div>
      ${detailSection("Attacco", [["Gol", m.goals], ["Assist", m.assists], ["Tiri", m.shots], ["Tiri in porta", m.shotsOn], ["Tiri fuori", m.shotsOff], ["Pali/traverse", m.woodwork], ["Passaggi chiave", m.keyPasses], ["xG", m.xG], ["xA", m.xA]])}
      ${detailSection("Passaggi", [["Tentati", m.passesAttempted], ["Riusciti", m.passesCompleted], ["Sbagliati", m.passesFailed], ["Filtranti", `${num(m.throughBallsCompleted)}/${num(m.throughBallsAttempted)}`], ["Cross", `${num(m.crossesCompleted)}/${num(m.crossesAttempted)}`], ["Lanci lunghi", `${num(m.longBallsCompleted)}/${num(m.longBallsAttempted)}`]])}
      ${detailSection("Dribbling e difesa", [["Dribbling", `${num(m.dribblesCompleted)}/${num(m.dribblesAttempted)}`], ["Tunnel", m.nutmegs], ["Recuperi", m.recoveries], ["Intercetti", m.interceptions], ["Contrasti", `${num(m.tacklesWon)}/${num(m.tacklesAttempted)}`], ["Palle perse", m.turnovers], ["Palle perse gravi", m.dangerousTurnovers]])}
      ${m.notes ? `<div class="card"><div class="card-title"><h3>Note</h3></div><p style="color:var(--muted);line-height:1.5">${escapeHtml(m.notes)}</p></div>` : ""}
      <div class="actions detail-actions">
  <button class="secondary-btn" onclick="setRoute('history')">Storico</button>

  <button class="locker-publish-btn" onclick="publishMatchToLockerRoom('${m.id}')">
    Pubblica nello Spogliatoio
  </button>

  <button class="danger-btn" onclick="deleteMatch('${m.id}')">Elimina</button>
</div>
  </section>`;
}
function pctValue(a,b){ return num(b)>0 ? Math.max(0, Math.min(100, (num(a)/num(b))*100)) : 0; }
function bar(value){ return `<div class="progress"><i style="width:${value}%"></i></div>`; }
function detailSection(title, rows) { return `<div class="card"><div class="card-title"><h3>${title}</h3></div><div class="metric-list">${rows.map(([l,v]) => metric(l, v ?? 0)).join("")}</div></div>`; }
function escapeHtml(s) { return String(s).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function deleteMatch(id) {
  if (!confirm("Eliminare questa partita?")) return;

  const updatedMatches = getMatches().filter(m => m.id !== id);

  saveMatches(updatedMatches);
  rebuildCardStatsFromHistory();

  toast("Partita eliminata");
  setRoute("history");

  setTimeout(() => {
    renderPlayerCardStats();
  }, 0);

}
function deleteAllMatches() {
  const matches = getMatches();

  if (!matches.length) {
    toast("Non ci sono partite da eliminare");
    return;
  }

  const ok = confirm("Vuoi eliminare TUTTE le partite salvate? Questa azione non si può annullare.");

  if (!ok) return;

  saveMatches([]);

  rebuildCardStatsFromHistory();

  toast("Tutte le partite sono state eliminate");
  setRoute("home");

  setTimeout(() => {
    renderPlayerCardStats();
  }, 0);
}

function formatShortDate(value, fallback) {
  if (!value) return `P${fallback + 1}`;
  return new Date(value + "T12:00:00").toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit"
  });
}

function trendMetric(match, key) {
  if (key === "rating") return num(match.rating);
  if (key === "goals") return num(match.goals);
  if (key === "assists") return num(match.assists);

  if (key === "shotsOnPct") {
    return num(match.shots) > 0 ? pctValue(match.shotsOn, match.shots) : null;
  }

  if (key === "passingPct") {
    return num(match.passesAttempted) > 0 ? pctValue(match.passesCompleted, match.passesAttempted) : null;
  }

  if (key === "dribblingPct") {
    return num(match.dribblesAttempted) > 0 ? pctValue(match.dribblesCompleted, match.dribblesAttempted) : null;
  }

  return null;
}

function trendCharts(matches) {
  const ordered = [...matches].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  if (ordered.length < 2) {
    return `
      <div class="card trend-empty">
        <div class="card-title">
          <h3>Andamento</h3>
          <span>grafici</span>
        </div>
        <p>Salva almeno 2 partite per vedere i grafici dell’andamento.</p>
      </div>
    `;
  }

  const charts = [
    { key: "rating", title: "Voto personale", suffix: "/10" },
    { key: "goals", title: "Gol", suffix: "" },
    { key: "assists", title: "Assist", suffix: "" },
    { key: "shotsOnPct", title: "Tiri in porta", suffix: "%" },
    { key: "passingPct", title: "Precisione passaggi", suffix: "%" },
    { key: "dribblingPct", title: "Successo dribbling", suffix: "%" }
  ];

  return `
    <section class="section">
      <div class="card-title trend-title">
        <h3>Andamento prestazioni</h3>
        <span>partita dopo partita</span>
      </div>

      <div class="grid trend-grid">
        ${charts.map(chart => trendCard(ordered, chart)).join("")}
      </div>
    </section>
  `;
}

function trendCard(matches, config) {
  const data = matches
    .map((m, index) => ({
      label: formatShortDate(m.date, index),
      value: trendMetric(m, config.key)
    }))
    .filter(item => item.value !== null && Number.isFinite(item.value));

  if (data.length < 2) {
    return `
      <div class="card trend-card">
        <div class="trend-head">
          <div>
            <h3>${config.title}</h3>
            <span>Dati insufficienti</span>
          </div>
        </div>
      </div>
    `;
  }

  const first = data[0].value;
  const last = data[data.length - 1].value;
  const diff = last - first;
  const isUp = diff >= 0;

  const color = isUp ? "var(--green)" : "var(--red)";
  const label = isUp ? "In crescita" : "In calo";
  const sign = diff > 0 ? "+" : "";

  return `
    <div class="card trend-card" style="--trend-color:${color}">
      <div class="trend-head">
        <div>
          <h3>${config.title}</h3>
          <span>${data[0].label} → ${data[data.length - 1].label}</span>
        </div>

        <div class="trend-badge">
          ${label} · ${sign}${diff.toFixed(1)}${config.suffix}
        </div>
      </div>

      ${trendSvg(data)}

      <div class="trend-values">
        <span>Prima: <strong>${first.toFixed(1)}${config.suffix}</strong></span>
        <span>Ultima: <strong>${last.toFixed(1)}${config.suffix}</strong></span>
      </div>
    </div>
  `;
}

function trendSvg(data) {
  const w = 320;
  const h = 120;
  const pad = 16;

  let min = Math.min(...data.map(d => d.value));
  let max = Math.max(...data.map(d => d.value));

  if (min === max) {
    min -= 1;
    max += 1;
  }

  const points = data.map((d, index) => {
    const x = pad + index * ((w - pad * 2) / (data.length - 1));
    const y = h - pad - ((d.value - min) / (max - min)) * (h - pad * 2);
    return { x, y, value: d.value, label: d.label };
  });

  const line = points.map(p => `${p.x},${p.y}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;

  return `
    <svg class="trend-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <polygon points="${area}" class="trend-area"></polygon>

      <line x1="${pad}" y1="${h - pad}" x2="${w - pad}" y2="${h - pad}" class="trend-grid-line"></line>
      <line x1="${pad}" y1="${pad}" x2="${w - pad}" y2="${pad}" class="trend-grid-line"></line>

      <polyline points="${line}" class="trend-line"></polyline>

      ${points.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="4.2" class="trend-dot"></circle>
      `).join("")}
    </svg>
  `;
}
function renderStats() {
  const matches = getMatches(); const t = totals(matches);
  app.innerHTML = `<section class="section"><h2>Statistiche generali</h2>
    ${trendCharts(matches)}
    ${matches.length ? `<div class="grid-2 cards">
      ${statCard(t.played, "Partite")}${statCard(t.goals, "Gol")}${statCard(t.assists, "Assist")}${statCard(avg(t.rating,t.played), "Media voto")}
    </div>
    <div class="grid cards">
      <div class="card"><div class="card-title"><h3>Medie partita</h3><span>totale</span></div><div class="metric-list">
        ${metric("Gol a partita", avg(t.goals, t.played))}
        ${metric("Assist a partita", avg(t.assists, t.played))}
        ${metric("Tiri a partita", avg(t.shots, t.played))}
        ${metric("Passaggi riusciti a partita", avg(t.passComp, t.played))}
        ${metric("Dribbling riusciti a partita", avg(t.dribComp, t.played))}
      </div></div>
      <div class="card"><div class="card-title"><h3>Percentuali totali</h3><span>aggregate</span></div><div class="metric-list">
        ${metric("Tiri in porta", pct(t.shotsOn, t.shots))}${bar(pctValue(t.shotsOn, t.shots))}
        ${metric("Realizzazione", pct(t.goals, t.shots))}${bar(pctValue(t.goals, t.shots))}
        ${metric("Precisione passaggi", pct(t.passComp, t.passAtt))}${bar(pctValue(t.passComp, t.passAtt))}
        ${metric("Successo dribbling", pct(t.dribComp, t.dribAtt))}${bar(pctValue(t.dribComp, t.dribAtt))}
        ${metric("Contrasti vinti", pct(t.tackWon, t.tackAtt))}${bar(pctValue(t.tackWon, t.tackAtt))}
      </div></div>
      <div class="card"><div class="card-title"><h3>Ultime partite</h3><span>andamento</span></div><div class="metric-list">
        ${[...matches].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,5).map(m => metric(formatDate(m.date), `G ${num(m.goals)} · A ${num(m.assists)} · V ${m.rating || "—"}`)).join("")}
      </div></div>
    </div>` : `<div class="empty">Le statistiche appariranno dopo aver salvato almeno una partita.</div>`}
  </section>`;
  app.insertAdjacentHTML("beforeend", `
    <section class="section">
      <div class="card danger-zone">
        <div class="card-title">
          <h3>Impostazioni dati</h3>
          <span>gestione partite</span>
        </div>

        <div class="metric-list">
          <div class="metric">
            <span>Partite salvate</span>
            <strong>${matches.length}</strong>
          </div>
        </div>

        <button class="danger-btn full-btn" onclick="deleteAllMatches()">
          Elimina tutte le partite salvate
        </button>

        <p class="danger-note">
          Attenzione: questa azione cancella lo storico dal browser e non può essere annullata.
        </p>
      </div>
    </section>
  `);
}
function render() {
  if (route === "home") renderHome();
  if (route === "new") renderNew();
  if (route === "history") renderHistory();
  if (route === "detail") renderDetail();
  if (route === "stats") renderStats();
  if (route === "goals") renderGoalsPage();
  if (route === "locker") renderLockerRoom();
}
render();

/* === rende cliccabili i pulsanti dei trofei === */
window.renderAchievementsManager = renderAchievementsManager;
window.addCustomAchievement = addCustomAchievement;
window.deleteCustomAchievement = deleteCustomAchievement;

/* =========================================================
   PROFILO RAPIDO + BACKUP
   ========================================================= */

function openProfileHub() {
  const profile = getPlayerProfile();

  const old = document.querySelector(".profile-hub-overlay");
  if (old) old.remove();

  document.body.insertAdjacentHTML("beforeend", `
    <div class="profile-hub-overlay" onclick="closeProfileHub(event)">
      <div class="profile-hub-panel" onclick="event.stopPropagation()">
        <div class="profile-hub-head">
          <div class="profile-hub-avatar">
            <img src="${escapeHtml(profile.photo || "profile.jpg")}" alt="Foto profilo">
          </div>

          <div>
            <h3>${escapeHtml(profile.name || "PLAYER")}</h3>
            <span>${escapeHtml(profile.role || "PLAYER")} · #${escapeHtml(profile.shirtNumber || "10")}</span>
          </div>

          <button type="button" onclick="closeProfileHub()">×</button>
        </div>

        <div class="profile-hub-tags">
          <span>🦶 ${escapeHtml(profile.foot || "Destro")}</span>
          <span>🎮 ${escapeHtml(profile.playStyle || "Equilibrato")}</span>
          ${profile.team ? `<span>🛡️ ${escapeHtml(profile.team)}</span>` : ""}
        </div>

        <div class="profile-hub-actions">
          <button type="button" onclick="closeProfileHub(); renderProfileSetup(true);">
            👤 Modifica profilo
          </button>

          <button type="button" onclick="exportMatchPulseBackup()">
            💾 Esporta backup
          </button>

          <button type="button" onclick="document.getElementById('backupImportInputHub').click()">
            📂 Importa backup
          </button>

          <input
            id="backupImportInputHub"
            type="file"
            accept=".json,application/json"
            hidden
            onchange="importMatchPulseBackup(event)"
          >
        </div>

        <p class="profile-hub-note">
          Il backup salva profilo, foto, partite, trofei e obiettivi.
        </p>
      </div>
    </div>
  `);
}

function closeProfileHub(event) {
  if (event && event.target !== event.currentTarget) return;

  const modal = document.querySelector(".profile-hub-overlay");
  if (modal) modal.remove();
}

window.openProfileHub = openProfileHub;
window.closeProfileHub = closeProfileHub;

/* =========================================================
   BACKUP DATI MATCHPULSE
   ========================================================= */

function readStorageJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function exportMatchPulseBackup() {
  const backup = {
    app: "MatchPulse",
    version: 1,
    exportedAt: new Date().toISOString(),

    matches: getMatches(),
    playerProfile: readStorageJson("matchpulse_player_profile", {}),
    customAchievements: readStorageJson("matchpulse_custom_achievements", []),
    preMatchGoals: readStorageJson("matchpulse_pre_match_goals", [])
  };

  const text = JSON.stringify(backup, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");

  link.href = url;
  link.download = `matchpulse-backup-${date}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);

  toast("Backup esportato");
}

function importMatchPulseBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      if (!data || data.app !== "MatchPulse") {
        toast("File backup non valido");
        return;
      }

      const ok = confirm("Importare questo backup? I dati attuali verranno sostituiti.");
      if (!ok) return;

      if (Array.isArray(data.matches)) {
        saveMatches(data.matches);
      }

      if (data.playerProfile && typeof data.playerProfile === "object") {
        localStorage.setItem("matchpulse_player_profile", JSON.stringify(data.playerProfile));
      }

      if (Array.isArray(data.customAchievements)) {
        localStorage.setItem("matchpulse_custom_achievements", JSON.stringify(data.customAchievements));
      }

      if (Array.isArray(data.preMatchGoals)) {
        localStorage.setItem("matchpulse_pre_match_goals", JSON.stringify(data.preMatchGoals));
      }

      toast("Backup importato");
      setRoute("home");
    } catch (error) {
      toast("Errore durante l'importazione");
    } finally {
      event.target.value = "";
    }
  };

  reader.readAsText(file);
}

/* rende cliccabili i pulsanti backup */
window.exportMatchPulseBackup = exportMatchPulseBackup;
window.importMatchPulseBackup = importMatchPulseBackup;

/* =========================================================
   SPOGLIATOIO ONLINE - SUPABASE
   ========================================================= */

/*
  QUI DEVI METTERE I TUOI DATI SUPABASE.

  ESEMPIO:
  var MATCHPULSE_SUPABASE_URL = "https://xxxxx.supabase.co";
  var MATCHPULSE_SUPABASE_KEY = "sb_publishable_xxxxx";
*/

var MATCHPULSE_SUPABASE_URL = "https://ekinjrmxpzqyzqdnudsj.supabase.co";
var MATCHPULSE_SUPABASE_KEY = "sb_publishable_ooKXipESJwYqwUCYqcjZwA_SMr5HRwY";

var matchpulseSupabaseReady =
  MATCHPULSE_SUPABASE_URL.startsWith("https://") &&
  MATCHPULSE_SUPABASE_KEY.length > 20 &&
  window.supabase;

var matchpulseSupabase = matchpulseSupabaseReady
  ? window.supabase.createClient(MATCHPULSE_SUPABASE_URL, MATCHPULSE_SUPABASE_KEY)
  : null;

/* ID locale del giocatore: serve per capire quali report sono tuoi */
function getLocalPlayerId() {
  let id = localStorage.getItem("matchpulse_player_id");

  if (!id) {
    if (window.crypto && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = `mp_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    }

    localStorage.setItem("matchpulse_player_id", id);
  }

  return id;
}

function normalizeClubCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
}

function getClubCode() {
  return localStorage.getItem("matchpulse_club_code") || "";
}

function saveClubCode(event) {
  event.preventDefault();

  const form = event.target;
  const code = normalizeClubCode(form.clubCode.value);

  if (!code) {
    toast("Inserisci un codice Club");
    return;
  }

  localStorage.setItem("matchpulse_club_code", code);
  toast("Codice Club salvato");
  renderLockerRoom();
}

async function fetchOnlineLockerReports() {
  if (!matchpulseSupabase) {
    throw new Error("Supabase non configurato");
  }

  const clubCode = getClubCode();

  if (!clubCode) {
    return [];
  }

  const { data, error } = await matchpulseSupabase
    .from("locker_reports")
    .select("*")
    .eq("club_code", clubCode)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  return data || [];
}

/* =========================================================
   CLASSIFICA CLUB
   ========================================================= */

function buildClubLeaderboard(reports) {
  const players = {};

  reports.forEach(report => {
    const name = report.player_name || "Giocatore";
    const payload = report.payload || {};

    if (!players[name]) {
      players[name] = {
        name: name,
        reports: 0,
        goals: 0,
        assists: 0,
        ratingSum: 0,
        ratingCount: 0
      };
    }

    const player = players[name];

    player.reports += 1;
    player.goals += Number(payload.goals) || 0;
    player.assists += Number(payload.assists) || 0;

    if (report.rating !== null && report.rating !== undefined && report.rating !== "") {
      const rating = Number(report.rating);

      if (!Number.isNaN(rating)) {
        player.ratingSum += rating;
        player.ratingCount += 1;
      }
    }
  });

  return Object.values(players).map(player => ({
    ...player,
    avgRating: player.ratingCount ? player.ratingSum / player.ratingCount : 0
  }));
}

function renderLeaderboardRows(players, valueFn, formatFn, emptyText) {
  const sorted = [...players]
    .filter(player => valueFn(player) > 0)
    .sort((a, b) => valueFn(b) - valueFn(a))
    .slice(0, 5);

  if (!sorted.length) {
    return `
      <div class="club-ranking-empty">
        ${escapeHtml(emptyText)}
      </div>
    `;
  }

  return `
    <div class="club-ranking-list">
      ${sorted.map((player, index) => `
        <div class="club-ranking-row">
          <span>${index + 1}</span>

          <strong>${escapeHtml(player.name)}</strong>

          <em>${escapeHtml(formatFn(valueFn(player)))}</em>
        </div>
      `).join("")}
    </div>
  `;
}

function renderClubLeaderboard(reports) {
  if (!reports.length) {
    return `
      <div class="locker-empty">
        <strong>Classifica vuota</strong>
        <p>
          Pubblica almeno un report vero nello Spogliatoio per iniziare a creare la classifica Club.
        </p>
      </div>
    `;
  }

  const players = buildClubLeaderboard(reports);

  return `
    <div class="club-leaderboard-grid">
      <div class="club-ranking-card">
        <div class="club-ranking-title">
          <span>⚽</span>
          <strong>Bomber Club</strong>
        </div>

        ${renderLeaderboardRows(
          players,
          player => player.goals,
          value => `${value} gol`,
          "Ancora nessun gol nei report."
        )}
      </div>

      <div class="club-ranking-card">
        <div class="club-ranking-title">
          <span>🎯</span>
          <strong>Assistman</strong>
        </div>

        ${renderLeaderboardRows(
          players,
          player => player.assists,
          value => `${value} assist`,
          "Ancora nessun assist nei report."
        )}
      </div>

      <div class="club-ranking-card">
        <div class="club-ranking-title">
          <span>⭐</span>
          <strong>Media voto</strong>
        </div>

        ${renderLeaderboardRows(
          players,
          player => player.avgRating,
          value => value.toFixed(1),
          "Ancora nessun voto valido."
        )}
      </div>

      <div class="club-ranking-card">
        <div class="club-ranking-title">
          <span>📋</span>
          <strong>Report pubblicati</strong>
        </div>

        ${renderLeaderboardRows(
          players,
          player => player.reports,
          value => `${value} report`,
          "Ancora nessun report."
        )}
      </div>
    </div>
  `;
}

function renderOnlineLockerReports(reports) {
  if (!reports.length) {
    return `
      <div class="locker-empty">
        <strong>Nessun report online</strong>
        <p>
          Il Club è collegato, ma non ci sono ancora report pubblicati.
          Usa il pulsante “Pubblica report test” per provare.
        </p>
      </div>
    `;
  }

  return `
    <div class="locker-report-list">
      ${reports.map(report => {
        const payload = report.payload || {};

        const ratingText =
          report.rating !== null && report.rating !== undefined
            ? Number(report.rating).toFixed(1).replace(".0", "")
            : "—";

        const goals = payload.goals ?? 0;
        const assists = payload.assists ?? 0;
        const localPlayerId = getLocalPlayerId();
        const reportOwnerId = report.owner_id || "";
        const isLegacyReport = !reportOwnerId;
        const isMine = isLegacyReport || reportOwnerId === localPlayerId;

        const dateText =
          report.match_date ||
          (report.created_at ? new Date(report.created_at).toLocaleString("it-IT") : "Data non disponibile");

        return `
          <div class="locker-report-item">
            <div class="locker-report-top">
              <div>
                <strong>${escapeHtml(report.player_name || "Giocatore")}</strong>
                <small>${escapeHtml(report.tier || "Carta")} · ${escapeHtml(String(report.ovr || "—"))} OVR</small>
              </div>

              ${
  isMine
    ? `
      <button
        type="button"
        class="locker-delete-report"
        onclick="deleteOnlineLockerReport('${escapeHtml(report.id)}', '${escapeHtml(reportOwnerId)}')"
      >
        Elimina
      </button>
    `
    : `
      <span class="locker-owner-badge">
        Compagno
      </span>
    `
}
            </div>

            <div class="locker-report-stats">
              <div>
                <strong>${escapeHtml(String(goals))}</strong>
                <span>Gol</span>
              </div>

              <div>
                <strong>${escapeHtml(String(assists))}</strong>
                <span>Assist</span>
              </div>

              <div>
                <strong>${escapeHtml(ratingText)}</strong>
                <span>Valutazione</span>
              </div>
            </div>

            <p>${escapeHtml(report.summary || "Report partita")}</p>

            <small class="locker-report-date">
              ${escapeHtml(dateText)}
            </small>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

async function deleteOnlineLockerReport(reportId, reportOwnerId = "") {
  if (!matchpulseSupabase) {
    toast("Supabase non configurato");
    return;
  }

  const clubCode = getClubCode();

  if (!clubCode) {
    toast("Codice Club mancante");
    return;
  }

  const localPlayerId = getLocalPlayerId();

  if (reportOwnerId && reportOwnerId !== localPlayerId) {
    toast("Puoi eliminare solo i tuoi report");
    return;
  }

  const ok = confirm("Vuoi eliminare questo report dallo Spogliatoio?");
  if (!ok) return;

  let query = matchpulseSupabase
    .from("locker_reports")
    .delete()
    .eq("id", reportId)
    .eq("club_code", clubCode);

  if (reportOwnerId) {
    query = query.eq("owner_id", localPlayerId);
  }

  const { error } = await query;

  if (error) {
    console.error(error);
    toast("Errore eliminazione report");
    return;
  }

  toast("Report eliminato");
  renderLockerRoom();
}

window.deleteOnlineLockerReport = deleteOnlineLockerReport;

async function publishTestLockerReport() {
  if (!matchpulseSupabase) {
    toast("Supabase non configurato");
    return;
  }

  const clubCode = getClubCode();

  if (!clubCode) {
    toast("Prima salva un codice Club");
    return;
  }

  const profile = getPlayerProfile();
  const rating = playerRatings(getMatches());

  const report = {
    club_code: clubCode,
    owner_id: getLocalPlayerId(),
    player_name: profile.name || "Giocatore",
    role: profile.role || "PLAYER",
    ovr: Number(rating.ovr) || 0,
    tier: rating.tier || "Carta",
    rating: 8.0,
    summary: "Report test MatchPulse: 2 gol, 1 assist e valutazione 8.",
    match_date: new Date().toLocaleDateString("it-IT"),
    payload: {
      type: "test",
      createdFrom: "MatchPulse",
      goals: 2,
      assists: 1
    }
  };

  const { error } = await matchpulseSupabase
    .from("locker_reports")
    .insert(report);

  if (error) {
    console.error(error);
    toast("Errore pubblicazione online");
    return;
  }

  toast("Report test pubblicato");
  renderLockerRoom();
}

async function publishMatchToLockerRoom(matchId) {
  if (!matchpulseSupabase) {
    toast("Supabase non configurato");
    return;
  }

  const clubCode = getClubCode();

  if (!clubCode) {
    toast("Prima salva un codice Club");
    setRoute("locker");
    return;
  }

  const match = getMatches().find(m => m.id === matchId);

  if (!match) {
    toast("Partita non trovata");
    return;
  }

  const profile = getPlayerProfile();
  const rating = playerRatings(getMatches());

  const goals = num(match.goals);
  const assists = num(match.assists);
  const matchRating = num(match.rating);

  const summary = `${goals} gol, ${assists} assist, valutazione ${matchRating || "—"}.`;

  const report = {
    club_code: clubCode,
    owner_id: getLocalPlayerId(),
    player_name: profile.name || "Giocatore",
    role: profile.role || "PLAYER",
    ovr: Number(rating.ovr) || 0,
    tier: rating.tier || "Carta",
    rating: matchRating || null,
    summary: summary,
    match_date: match.date ? formatDate(match.date) : new Date().toLocaleDateString("it-IT"),
    payload: {
      type: "match",
      createdFrom: "MatchPulse",
      matchId: match.id,

      goals: goals,
      assists: assists,
      rating: matchRating,

      opponent: match.opponent || "",
      result: match.result || "",
      outcome: match.outcome || "",
      role: match.role || "",

      shots: num(match.shots),
      shotsOn: num(match.shotsOn),
      passesCompleted: num(match.passesCompleted),
      passesAttempted: num(match.passesAttempted),
      recoveries: num(match.recoveries),
      tacklesWon: num(match.tacklesWon)
    }
  };

  const { data: existingReports, error: checkError } = await matchpulseSupabase
  .from("locker_reports")
  .select("id,payload")
  .eq("club_code", clubCode)
  .limit(100);

if (checkError) {
  console.error(checkError);
  toast("Errore controllo doppioni");
  return;
}

const alreadyPublished = (existingReports || []).some(item => {
  const payload = item.payload || {};
  return String(payload.matchId || "") === String(match.id);
});

if (alreadyPublished) {
  toast("Questa partita è già nello Spogliatoio");
  setRoute("locker");
  return;
}

const ok = confirm("Pubblicare questa partita nello Spogliatoio?");
if (!ok) return;

const { error } = await matchpulseSupabase
  .from("locker_reports")
  .insert(report);

  if (error) {
    console.error(error);
    toast("Errore pubblicazione report");
    return;
  }

  toast("Report pubblicato nello Spogliatoio");
  setRoute("locker");
}

window.publishMatchToLockerRoom = publishMatchToLockerRoom;

async function renderLockerRoom() {
  const clubCode = getClubCode();

  app.innerHTML = `
    <section class="section locker-page">
      <div class="page-head">
        <div>
          <h2>Spogliatoio</h2>
          <p>Report condivisi della squadra tramite codice Club.</p>
        </div>
      </div>

      <section class="club-code-card">
        <div class="locker-head">
          <div>
            <h3>Codice Club</h3>
            <span>Usate tutti lo stesso codice per vedere gli stessi report</span>
          </div>

          <strong>🛡️</strong>
        </div>

        <form class="club-code-form" onsubmit="saveClubCode(event)">
          <input
            name="clubCode"
            value="${escapeHtml(clubCode)}"
            placeholder="Es. CALCETTO2026"
            autocomplete="off"
          >

          <button type="submit">
            Salva
          </button>
        </form>

        <p class="club-code-note">
          Esempio: tu e i tuoi amici inserite <b>CALCETTO2026</b>. Tutti i report pubblicati con quel codice appariranno qui.
        </p>
      </section>

      ${
  clubCode
    ? `
      <section class="club-leaderboard-card">
        <div class="locker-head">
          <div>
            <h3>Classifica Club</h3>
            <span>Statistiche calcolate dai report online</span>
          </div>

          <strong>🏆</strong>
        </div>

        <div id="clubLeaderboardContent" class="club-leaderboard-content">
          <div class="locker-loading">Calcolo classifica Club...</div>
        </div>
      </section>
    `
    : ""
}
      <section class="locker-reports-card">
        <div class="locker-head">
          <div>
            <h3>Report online</h3>
            <span>${clubCode ? `Club: ${escapeHtml(clubCode)}` : "Nessun Club selezionato"}</span>
          </div>

          <strong>🌐</strong>
        </div>

        <div class="locker-online-actions locker-online-actions-single">
  <button type="button" onclick="renderLockerRoom()">
    Aggiorna report
  </button>
</div>

        <div id="lockerOnlineContent" class="locker-online-content">
          ${
            clubCode
              ? `<div class="locker-loading">Caricamento report online...</div>`
              : `
                <div class="locker-empty">
                  <strong>Inserisci un codice Club</strong>
                  <p>
                    Dopo aver salvato il codice, qui compariranno i report pubblicati online.
                  </p>
                </div>
              `
          }
        </div>
      </section>
    </section>
  `;

  if (!clubCode) return;

  const onlineBox = document.getElementById("lockerOnlineContent");
  if (!onlineBox) return;

  try {
  const reports = await fetchOnlineLockerReports();

  const updatedBox = document.getElementById("lockerOnlineContent");
  const leaderboardBox = document.getElementById("clubLeaderboardContent");

  if (updatedBox) {
    updatedBox.innerHTML = renderOnlineLockerReports(reports);
  }

  if (leaderboardBox) {
    leaderboardBox.innerHTML = renderClubLeaderboard(reports);
  }
} catch (error) {
  console.error(error);

  const updatedBox = document.getElementById("lockerOnlineContent");
  const leaderboardBox = document.getElementById("clubLeaderboardContent");

  if (updatedBox) {
    updatedBox.innerHTML = `
      <div class="locker-empty">
        <strong>Errore collegamento online</strong>
        <p>
          Controlla Project URL, publishable key e tabella Supabase.
        </p>
      </div>
    `;
  }

  if (leaderboardBox) {
    leaderboardBox.innerHTML = `
      <div class="locker-empty">
        <strong>Errore classifica</strong>
        <p>
          Non riesco a calcolare la classifica dai report online.
        </p>
      </div>
    `;
  }

  toast("Errore caricamento online");
}
}

window.saveClubCode = saveClubCode;
window.publishTestLockerReport = publishTestLockerReport;
window.renderLockerRoom = renderLockerRoom;

// ======================================
// SISTEMA UPGRADE STATISTICHE CARTA
// ======================================

const CARD_STATS_KEY = "matchpulse_card_stats";

const DEFAULT_CARD_STATS = {
  pac: 70,
  sho: 70,
  pas: 70,
  dri: 70,
  def: 70,
  phy: 70
};

function getNumber(value) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function clampStat(value) {
  return Math.max(0, Math.min(99, value));
}

function getCardStats() {
  const saved = localStorage.getItem("matchpulse_card_stats");

  if (!saved) {
    saveCardStats({ ...DEFAULT_CARD_STATS });
    return { ...DEFAULT_CARD_STATS };
  }

  try {
    const stats = JSON.parse(saved);

    return {
      pac: Number(stats.pac) || DEFAULT_CARD_STATS.pac,
      sho: Number(stats.sho) || DEFAULT_CARD_STATS.sho,
      pas: Number(stats.pas) || DEFAULT_CARD_STATS.pas,
      dri: Number(stats.dri) || DEFAULT_CARD_STATS.dri,
      def: Number(stats.def) || DEFAULT_CARD_STATS.def,
      phy: Number(stats.phy) || DEFAULT_CARD_STATS.phy
    };
  } catch (error) {
    saveCardStats({ ...DEFAULT_CARD_STATS });
    return { ...DEFAULT_CARD_STATS };
  }
}

function saveCardStats(stats) {
  localStorage.setItem(CARD_STATS_KEY, JSON.stringify(stats));
}

function calculateOVR(stats) {
  const total =
    stats.pac +
    stats.sho +
    stats.pas +
    stats.dri +
    stats.def +
    stats.phy;

  return Math.round(total / 6);
}

function getCardRarity(ovr) {
  if (ovr <= 64) return "bronze";
  if (ovr <= 74) return "silver";
  if (ovr <= 89) return "gold";
  return "icon";
}

function getMatchValue(match, possibleNames) {
  for (const name of possibleNames) {
    if (match[name] !== undefined) {
      return getNumber(match[name]);
    }
  }

  return 0;
}

function cardValue(match, names) {
  for (const name of names) {
    if (match[name] !== undefined && match[name] !== null && match[name] !== "") {
      return getNumber(match[name]);
    }
  }

  return 0;
}

function limitUpgrade(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function ratingMultiplier(rating) {
  if (rating <= 4.5) return 0;
  if (rating < 5.5) return 0.20;
  if (rating < 6.5) return 0.45;
  if (rating < 7.5) return 0.75;
  if (rating < 8.5) return 1;
  return 1.15;
}

// ======================================
// SISTEMA UPGRADE CARTA - VERSIONE GRIND
// ======================================

function cardUpgradeNumber(value) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function cardUpgradeValue(match, possibleNames) {
  for (const name of possibleNames) {
    if (match[name] !== undefined && match[name] !== null && match[name] !== "") {
      return cardUpgradeNumber(match[name]);
    }
  }

  return 0;
}

function cardClamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cardRatingBase(rating) {
  if (!rating) return 65;

  // Voto 6 => base circa 75
  // Voto 7 => base circa 80
  // Voto 8 => base circa 85
  // Voto 9 => base circa 90
  return cardClamp(45 + rating * 5, 45, 95);
}

function cardRatingCap(rating) {
  if (!rating) return 72;

  if (rating < 4.5) return 60;
  if (rating < 5.5) return 68;
  if (rating < 6.5) return 76;
  if (rating < 7.5) return 82;
  if (rating < 8.5) return 88;
  if (rating < 9.5) return 93;

  return 97;
}

function cardTargetByRating(rawTarget, rating) {
  const cap = cardRatingCap(rating);
  return cardClamp(rawTarget, 40, cap);
}

function moveCardStat(currentValue, targetValue, rating) {
  const difference = targetValue - currentValue;

  // La carta non prende direttamente il valore della partita.
  // Si avvicina piano piano.
  let change = difference * 0.12;

  let maxUp = 0.6;
  let maxDown = 0.5;

  if (rating < 4.5) {
    maxUp = 0;
    maxDown = 1.2;
  } else if (rating < 5.5) {
    maxUp = 0.1;
    maxDown = 0.9;
  } else if (rating < 6.5) {
    maxUp = 0.7;
    maxDown = 0.6;
  } else if (rating < 7.5) {
    maxUp = 1.0;
    maxDown = 0.45;
  } else if (rating < 8.5) {
    maxUp = 1.3;
    maxDown = 0.35;
  } else {
    maxUp = 1.8;
    maxDown = 0.25;
  }

  change = cardClamp(change, -maxDown, maxUp);

  return cardClamp(currentValue + change, 0, 99);
}

function mpNumber(value) {
  if (value === undefined || value === null || value === "") return 0;

  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function mpValue(match, names) {
  for (const name of names) {
    if (match[name] !== undefined && match[name] !== null && match[name] !== "") {
      return mpNumber(match[name]);
    }
  }

  return 0;
}

function mpClamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mpRatingMultiplier(rating) {
  if (!rating) return 0.5;

  if (rating < 4.5) return 0;
  if (rating < 5.5) return 0.25;
  if (rating < 6.5) return 0.55;
  if (rating < 7.5) return 0.8;
  if (rating < 8.5) return 1;
  if (rating < 9.5) return 1.25;

  return 1.45;
}

function mpMaxUpByRating(rating) {
  if (!rating) return 0.35;

  if (rating < 4.5) return 0;
  if (rating < 5.5) return 0.15;
  if (rating < 6.5) return 0.45;
  if (rating < 7.5) return 0.75;
  if (rating < 8.5) return 1.05;
  if (rating < 9.5) return 1.35;

  return 1.7;
}

function mpMaxDownByRating(rating) {
  if (!rating) return 0.35;

  if (rating < 4.5) return 1.25;
  if (rating < 5.5) return 0.9;
  if (rating < 6.5) return 0.45;
  if (rating < 7.5) return 0.35;
  if (rating < 8.5) return 0.25;

  return 0.2;
}

function mpApplyDelta(current, rawDelta, rating) {
  const multiplier = mpRatingMultiplier(rating);
  const maxUp = mpMaxUpByRating(rating);
  const maxDown = mpMaxDownByRating(rating);

  let delta = rawDelta * multiplier;

  if (rating > 0 && rating < 5.5) {
    delta -= (5.5 - rating) * 0.15;
  }

  delta = mpClamp(delta, -maxDown, maxUp);

  return mpClamp(current + delta, 0, 99);
}

function mpSimpleNumber(value) {
  if (value === undefined || value === null || value === "") return 0;

  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function mpSimpleValue(match, names) {
  for (const name of names) {
    if (match[name] !== undefined && match[name] !== null && match[name] !== "") {
      return mpSimpleNumber(match[name]);
    }
  }

  return 0;
}

function mpClamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mpRatingPower(rating) {
  if (!rating) return 0.5;

  if (rating < 4.5) return -0.8;
  if (rating < 5.5) return -0.3;
  if (rating < 6.5) return 0.45;
  if (rating < 7.5) return 0.75;
  if (rating < 8.5) return 1;
  if (rating < 9.5) return 1.25;

  return 1.45;
}

function applyMatchUpgrades(match) {
  const stats = getCardStats();

  const rating = mpSimpleValue(match, [
    "rating",
    "voto",
    "valutazione",
    "matchRating"
  ]);

  const goals = mpSimpleValue(match, [
    "goals",
    "goal",
    "gol"
  ]);

  const assists = mpSimpleValue(match, [
    "assists",
    "assist"
  ]);

  const shotsOnTarget = mpSimpleValue(match, [
    "shotsOnTarget",
    "tiriInPorta",
    "tiri_porta"
  ]);

  const keyPasses = mpSimpleValue(match, [
    "keyPasses",
    "passaggiChiave",
    "passaggi_chiave"
  ]);

  const dribbles = mpSimpleValue(match, [
    "dribbles",
    "dribbling",
    "dribblesCompleted",
    "dribblingRiusciti",
    "dribbling_riusciti"
  ]);

  const recoveries = mpSimpleValue(match, [
    "recoveries",
    "recuperi"
  ]);

  const power = mpRatingPower(rating);

  let delta = {
    pac: 0,
    sho: 0,
    pas: 0,
    dri: 0,
    def: 0,
    phy: 0
  };

  // TIRO
  delta.sho += goals * 0.16;
  delta.sho += shotsOnTarget * 0.05;

  // PASSAGGIO
  delta.pas += assists * 0.14;
  delta.pas += keyPasses * 0.05;

  // DRIBBLING
  delta.dri += dribbles * 0.025;

  // VELOCITÀ
  // PAC non dipende dai minuti.
  delta.pac += dribbles * 0.010;
  delta.pac += goals * 0.025;

  // DIFESA
  delta.def += recoveries * 0.05;

  // FISICO
  delta.phy += recoveries * 0.015;

  // Il voto controlla tutto.
  // Voto basso = può anche scendere.
  delta.pac *= power;
  delta.sho *= power;
  delta.pas *= power;
  delta.dri *= power;
  delta.def *= power;
  delta.phy *= power;

  // Malus se il voto è brutto.
  if (rating > 0 && rating < 5.5) {
    const penalty = (5.5 - rating) * 0.25;

    delta.pac -= penalty * 0.4;
    delta.sho -= penalty * 0.6;
    delta.pas -= penalty * 0.6;
    delta.dri -= penalty * 0.5;
    delta.def -= penalty * 0.4;
    delta.phy -= penalty * 0.3;
  }

  // Limite massimo per singola partita.
  // Anche se fai 5 gol, non diventi Icon.
  const maxUp = rating >= 8.5 ? 1.2 : rating >= 7 ? 0.8 : 0.45;
  const maxDown = rating < 5.5 ? 1.0 : 0.35;

  delta.pac = mpClamp(delta.pac, -maxDown, maxUp);
  delta.sho = mpClamp(delta.sho, -maxDown, maxUp);
  delta.pas = mpClamp(delta.pas, -maxDown, maxUp);
  delta.dri = mpClamp(delta.dri, -maxDown, maxUp);
  delta.def = mpClamp(delta.def, -maxDown, maxUp);
  delta.phy = mpClamp(delta.phy, -maxDown, maxUp);

  const updatedStats = {
    pac: mpClamp(stats.pac + delta.pac, 0, 99),
    sho: mpClamp(stats.sho + delta.sho, 0, 99),
    pas: mpClamp(stats.pas + delta.pas, 0, 99),
    dri: mpClamp(stats.dri + delta.dri, 0, 99),
    def: mpClamp(stats.def + delta.def, 0, 99),
    phy: mpClamp(stats.phy + delta.phy, 0, 99)
  };

  saveCardStats(updatedStats);

  console.log("SIMPLE_CARD_UPGRADE", {
    rating,
    goals,
    assists,
    shotsOnTarget,
    keyPasses,
    dribbles,
    recoveries,
    oldStats: stats,
    delta,
    updatedStats
  });

  return updatedStats;
}


function rebuildCardStatsFromHistory() {
  saveCardStats({ ...DEFAULT_CARD_STATS });

  const matches = typeof getMatches === "function" ? getMatches() : [];

  matches.forEach((match) => {
    applyMatchUpgrades(match);
  });

  renderPlayerCardStats();
}

window.rebuildCardStatsFromHistory = rebuildCardStatsFromHistory;

function renderPlayerCardStats() {
  const stats = getCardStats();
  const ovr = calculateOVR(stats);
  const rarity = getCardRarity(ovr);

  const ovrElement = document.querySelector(".card-ovr");
  const pacElement = document.querySelector(".stat-pac");
  const shoElement = document.querySelector(".stat-sho");
  const pasElement = document.querySelector(".stat-pas");
  const driElement = document.querySelector(".stat-dri");
  const defElement = document.querySelector(".stat-def");
  const phyElement = document.querySelector(".stat-phy");

if (ovrElement) ovrElement.textContent = ovr;
if (pacElement) pacElement.textContent = Math.round(stats.pac);
if (shoElement) shoElement.textContent = Math.round(stats.sho);
if (pasElement) pasElement.textContent = Math.round(stats.pas);
if (driElement) driElement.textContent = Math.round(stats.dri);
if (defElement) defElement.textContent = Math.round(stats.def);
if (phyElement) phyElement.textContent = Math.round(stats.phy);

  const card = document.querySelector(".player-card");

  if (card) {
    card.classList.remove(
  "card-bronze",
  "card-silver",
  "card-gold",
  "card-icon",
  "card-special",
  "bronze",
  "silver",
  "gold",
  "icon",
  "special"
);

card.classList.add(`card-${rarity}`);
  }
}

function resetCardStats() {
  saveCardStats(DEFAULT_CARD_STATS);
  renderPlayerCardStats();
}

// =====================================================
// CARD UPGRADE SYSTEM - VERSIONE DEFINITIVA GRIND
// =====================================================

function mpCardNumber(value) {
  if (value === undefined || value === null || value === "") return 0;

  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function mpCardValue(match, names) {
  for (const name of names) {
    if (match[name] !== undefined && match[name] !== null && match[name] !== "") {
      return mpCardNumber(match[name]);
    }
  }

  return 0;
}

function mpCardClamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getCardStats() {
  const saved = localStorage.getItem("matchpulse_card_stats");

  if (!saved) {
    return {
      pac: 60,
      sho: 60,
      pas: 60,
      dri: 60,
      def: 60,
      phy: 60
    };
  }

  try {
    const stats = JSON.parse(saved);

    return {
      pac: mpCardNumber(stats.pac) || 60,
      sho: mpCardNumber(stats.sho) || 60,
      pas: mpCardNumber(stats.pas) || 60,
      dri: mpCardNumber(stats.dri) || 60,
      def: mpCardNumber(stats.def) || 60,
      phy: mpCardNumber(stats.phy) || 60
    };
  } catch (error) {
    return {
      pac: 60,
      sho: 60,
      pas: 60,
      dri: 60,
      def: 60,
      phy: 60
    };
  }
}

function saveCardStats(stats) {
  localStorage.setItem("matchpulse_card_stats", JSON.stringify(stats));
}

function calculateOVR(stats) {
  return Math.round(
    (stats.pac + stats.sho + stats.pas + stats.dri + stats.def + stats.phy) / 6
  );
}

function getCardRarity(ovr) {
  if (ovr <= 64) return "bronze";
  if (ovr <= 74) return "silver";
  if (ovr <= 89) return "gold";
  return "special";
}

function mpRatingBase(rating) {
  if (!rating) return 65;

  // Voto 6 = prestazione circa 75
  // Voto 7 = prestazione circa 80
  // Voto 8 = prestazione circa 85
  // Voto 9 = prestazione circa 90
  return mpCardClamp(45 + rating * 5, 45, 95);
}

function mpRatingCap(rating) {
  if (!rating) return 72;

  if (rating < 4.5) return 58;
  if (rating < 5.5) return 68;
  if (rating < 6.5) return 76;
  if (rating < 7.5) return 82;
  if (rating < 8.5) return 88;
  if (rating < 9.5) return 93;

  return 97;
}

function mpMoveStat(current, target, rating) {
  const diff = target - current;

  let maxUp = 0.50;
  let maxDown = 0.50;

  if (rating < 4.5) {
    maxUp = 0;
    maxDown = 1.40;
  } else if (rating < 5.5) {
    maxUp = 0.10;
    maxDown = 1.10;
  } else if (rating < 6.5) {
    maxUp = 0.70;
    maxDown = 0.90;
  } else if (rating < 7.5) {
    maxUp = 0.95;
    maxDown = 0.60;
  } else if (rating < 8.5) {
    maxUp = 1.20;
    maxDown = 0.45;
  } else {
    maxUp = 1.60;
    maxDown = 0.35;
  }

  const change = mpCardClamp(diff * 0.10, -maxDown, maxUp);

  return mpCardClamp(current + change, 0, 99);
}

function mpRatingMultiplier(rating) {
  if (!rating) return 0.45;

  if (rating < 4.5) return 0;
  if (rating < 5.5) return 0.20;
  if (rating < 6.5) return 0.65;
  if (rating < 7.5) return 0.85;
  if (rating < 8.5) return 1.05;
  if (rating < 9.5) return 1.25;

  return 1.45;
}

function mpMaxUpByRating(rating) {
  if (!rating) return 0.40;

  if (rating < 4.5) return 0;
  if (rating < 5.5) return 0.15;
  if (rating < 6.5) return 0.65;
  if (rating < 7.5) return 0.95;
  if (rating < 8.5) return 1.25;
  if (rating < 9.5) return 1.60;

  return 2.00;
}

function mpMaxDownByRating(rating) {
  if (!rating) return 0.40;

  if (rating < 4.5) return 1.40;
  if (rating < 5.5) return 1.00;
  if (rating < 6.5) return 0.50;
  if (rating < 7.5) return 0.35;
  if (rating < 8.5) return 0.25;

  return 0.20;
}

function mpApplyDelta(current, rawDelta, rating) {
  const multiplier = mpRatingMultiplier(rating);
  const maxUp = mpMaxUpByRating(rating);
  const maxDown = mpMaxDownByRating(rating);

  let delta = rawDelta * multiplier;

  if (rating > 0 && rating < 5.5) {
    delta -= (5.5 - rating) * 0.18;
  }

  delta = mpCardClamp(delta, -maxDown, maxUp);

  return mpCardClamp(current + delta, 0, 99);
}

function applyMatchUpgrades(match) {
  const stats = getCardStats();

  const rating = mpCardValue(match, [
    "rating",
    "voto",
    "valutazione",
    "matchRating"
  ]);

  const goals = mpCardValue(match, ["goals", "goal", "gol"]);
  const assists = mpCardValue(match, ["assists", "assist"]);

  const shots = mpCardValue(match, ["shots", "tiri"]);
  const shotsOnTarget = mpCardValue(match, [
    "shotsOnTarget",
    "tiriInPorta",
    "tiri_porta"
  ]);
  const shotsOffTarget = mpCardValue(match, [
    "shotsOffTarget",
    "tiriFuori",
    "tiri_fuori"
  ]);

  const xg = mpCardValue(match, [
    "xg",
    "expectedGoal",
    "expectedGoals",
    "expected_goal"
  ]);

  const xa = mpCardValue(match, [
    "xa",
    "expectedAssist",
    "expectedAssists",
    "expected_assist"
  ]);

  const keyPasses = mpCardValue(match, [
    "keyPasses",
    "passaggiChiave",
    "passaggi_chiave"
  ]);

  const passesAttempted = mpCardValue(match, [
    "passesAttempted",
    "passaggiTentati",
    "passaggi_tentati",
    "passes"
  ]);

  const passesCompleted = mpCardValue(match, [
    "passesCompleted",
    "passaggiRiusciti",
    "passaggi_riusciti"
  ]);

  const throughBallsCompleted = mpCardValue(match, [
    "throughBallsCompleted",
    "filtrantiRiusciti",
    "filtranti_riusciti"
  ]);

  const crossesCompleted = mpCardValue(match, [
    "crossesCompleted",
    "crossRiusciti",
    "cross_riusciti"
  ]);

  const longBallsCompleted = mpCardValue(match, [
    "longBallsCompleted",
    "lanciLunghiRiusciti",
    "lanci_lunghi_riusciti"
  ]);

  const dribblesCompleted = mpCardValue(match, [
    "dribblesCompleted",
    "dribblingRiusciti",
    "dribbling_riusciti",
    "dribbles",
    "dribbling"
  ]);

  const dribblesAttempted = mpCardValue(match, [
    "dribblesAttempted",
    "dribblingTentati",
    "dribbling_tentati"
  ]);

  const nutmegs = mpCardValue(match, ["nutmegs", "tunnel"]);

  const recoveries = mpCardValue(match, ["recoveries", "recuperi"]);
  const interceptions = mpCardValue(match, ["interceptions", "intercetti"]);

  const tacklesWon = mpCardValue(match, [
    "tacklesWon",
    "contrastiVinti",
    "contrasti_vinti",
    "tackles",
    "contrasti"
  ]);

  const tacklesAttempted = mpCardValue(match, [
    "tacklesAttempted",
    "contrastiTentati",
    "contrasti_tentati"
  ]);

  const duelsWon = mpCardValue(match, [
    "duelsWon",
    "duelliVinti",
    "duelli_vinti",
    "duels",
    "duelli"
  ]);

  const ballsLost = mpCardValue(match, [
    "ballsLost",
    "pallePerse",
    "palle_perse"
  ]);

  const seriousBallsLost = mpCardValue(match, [
    "seriousBallsLost",
    "pallePerseGravi",
    "palle_perse_gravi"
  ]);

  let passAccuracyBonus = 0;

  if (passesAttempted > 0) {
    const passAccuracy = passesCompleted / passesAttempted;

    if (passAccuracy >= 0.80) passAccuracyBonus = 0.16;
    else if (passAccuracy >= 0.70) passAccuracyBonus = 0.08;
    else if (passAccuracy < 0.55) passAccuracyBonus = -0.16;
  }

  let dribbleAccuracyBonus = 0;

  if (dribblesAttempted > 0) {
    const dribbleAccuracy = dribblesCompleted / dribblesAttempted;

    if (dribbleAccuracy >= 0.65) dribbleAccuracyBonus = 0.16;
    else if (dribbleAccuracy >= 0.50) dribbleAccuracyBonus = 0.08;
    else if (dribbleAccuracy < 0.40) dribbleAccuracyBonus = -0.18;
  }

  let tackleAccuracyBonus = 0;

  if (tacklesAttempted > 0) {
    const tackleAccuracy = tacklesWon / tacklesAttempted;

    if (tackleAccuracy >= 0.70) tackleAccuracyBonus = 0.16;
    else if (tackleAccuracy >= 0.50) tackleAccuracyBonus = 0.08;
    else if (tackleAccuracy < 0.35) tackleAccuracyBonus = -0.18;
  }

  const rawSho =
    goals * 0.16 +
    shotsOnTarget * 0.05 +
    shots * 0.015 +
    xg * 0.03 -
    shotsOffTarget * 0.025;

  const rawPas =
    assists * 0.12 +
    keyPasses * 0.04 +
    xa * 0.035 +
    passesCompleted * 0.006 +
    throughBallsCompleted * 0.035 +
    crossesCompleted * 0.025 +
    longBallsCompleted * 0.015 +
    passAccuracyBonus -
    ballsLost * 0.04 -
    seriousBallsLost * 0.18;

  const rawDri =
    dribblesCompleted * 0.012 +
    nutmegs * 0.06 +
    dribbleAccuracyBonus -
    ballsLost * 0.06 -
    seriousBallsLost * 0.20;

  const rawDef =
    recoveries * 0.035 +
    interceptions * 0.05 +
    tacklesWon * 0.07 +
    tackleAccuracyBonus -
    seriousBallsLost * 0.06;

  const rawPhy =
    duelsWon * 0.05 +
    tacklesWon * 0.035 +
    recoveries * 0.012 -
    seriousBallsLost * 0.05;

  const rawPac =
    dribblesCompleted * 0.006 +
    goals * 0.025 +
    nutmegs * 0.035 -
    ballsLost * 0.03 -
    seriousBallsLost * 0.10;

  const updatedStats = {
    pac: mpApplyDelta(stats.pac, rawPac, rating),
    sho: mpApplyDelta(stats.sho, rawSho, rating),
    pas: mpApplyDelta(stats.pas, rawPas, rating),
    dri: mpApplyDelta(stats.dri, rawDri, rating),
    def: mpApplyDelta(stats.def, rawDef, rating),
    phy: mpApplyDelta(stats.phy, rawPhy, rating)
  };

  console.log("CARD_UPGRADE_CALCETTO", {
    rating,
    oldStats: stats,
    raw: {
      pac: rawPac,
      sho: rawSho,
      pas: rawPas,
      dri: rawDri,
      def: rawDef,
      phy: rawPhy
    },
    updatedStats
  });

  saveCardStats(updatedStats);

  return updatedStats;
}

function renderPlayerCardStats() {
  const stats = getCardStats();
  const ovr = calculateOVR(stats);
  const rarity = getCardRarity(ovr);

  const ovrElement = document.querySelector(".card-ovr");
  const pacElement = document.querySelector(".stat-pac");
  const shoElement = document.querySelector(".stat-sho");
  const pasElement = document.querySelector(".stat-pas");
  const driElement = document.querySelector(".stat-dri");
  const defElement = document.querySelector(".stat-def");
  const phyElement = document.querySelector(".stat-phy");

  if (ovrElement) ovrElement.textContent = ovr;
  if (pacElement) pacElement.textContent = Math.round(stats.pac);
  if (shoElement) shoElement.textContent = Math.round(stats.sho);
  if (pasElement) pasElement.textContent = Math.round(stats.pas);
  if (driElement) driElement.textContent = Math.round(stats.dri);
  if (defElement) defElement.textContent = Math.round(stats.def);
  if (phyElement) phyElement.textContent = Math.round(stats.phy);

  const card = document.querySelector(".player-card");

  if (card) {
    card.classList.remove("card-bronze", "card-silver", "card-gold", "card-special");

    if (rarity === "bronze") card.classList.add("card-bronze");
    if (rarity === "silver") card.classList.add("card-silver");
    if (rarity === "gold") card.classList.add("card-gold");
    if (rarity === "special") card.classList.add("card-special");
  }
}

function resetCardStats() {
  saveCardStats({
    pac: 60,
    sho: 60,
    pas: 60,
    dri: 60,
    def: 60,
    phy: 60
  });

  renderPlayerCardStats();
}

function rebuildCardStatsFromHistory() {
  resetCardStats();

  const matches = typeof getMatches === "function" ? getMatches() : [];

  matches.forEach((match) => {
    applyMatchUpgrades(match);
  });

  renderPlayerCardStats();
}

window.applyMatchUpgrades = applyMatchUpgrades;
window.renderPlayerCardStats = renderPlayerCardStats;
window.resetCardStats = resetCardStats;
window.rebuildCardStatsFromHistory = rebuildCardStatsFromHistory;

renderPlayerCardStats();

// =====================================================
// FIX DEFINITIVO CARTA BASE 70 + RICALCOLO STORICO
// =====================================================

const MP_BASE_CARD_STATS_70 = {
  pac: 70,
  sho: 70,
  pas: 70,
  dri: 70,
  def: 70,
  phy: 70
};

function getBaseCardStats70() {
  return { ...MP_BASE_CARD_STATS_70 };
}

function saveCardStats(stats) {
  localStorage.setItem("matchpulse_card_stats", JSON.stringify(stats));
}

function getCardStats() {
  const saved = localStorage.getItem("matchpulse_card_stats");

  if (!saved) {
    saveCardStats(getBaseCardStats70());
    return getBaseCardStats70();
  }

  try {
    const stats = JSON.parse(saved);

    return {
      pac: Number(stats.pac) || 70,
      sho: Number(stats.sho) || 70,
      pas: Number(stats.pas) || 70,
      dri: Number(stats.dri) || 70,
      def: Number(stats.def) || 70,
      phy: Number(stats.phy) || 70
    };
  } catch (error) {
    saveCardStats(getBaseCardStats70());
    return getBaseCardStats70();
  }
}

function calculateOVR(stats) {
  return Math.round(
    (stats.pac + stats.sho + stats.pas + stats.dri + stats.def + stats.phy) / 6
  );
}

function getCardRarity(ovr) {
  if (ovr <= 64) return "bronze";
  if (ovr <= 74) return "silver";
  if (ovr <= 89) return "gold";
  return "icon";
}

function resetCardStats() {
  saveCardStats(getBaseCardStats70());
  renderPlayerCardStats();

  setTimeout(() => {
    renderPlayerCardStats();
  }, 0);
}

function rebuildCardStatsFromHistory() {
  saveCardStats(getBaseCardStats70());

  const matches = typeof getMatches === "function" ? getMatches() : [];

  matches.forEach((match) => {
    applyMatchUpgrades(match);
  });

  renderPlayerCardStats();

  setTimeout(() => {
    renderPlayerCardStats();
  }, 0);
}

window.resetCardStats = resetCardStats;
window.rebuildCardStatsFromHistory = rebuildCardStatsFromHistory;
window.getCardStats = getCardStats;
window.saveCardStats = saveCardStats;

function syncCardStatsOnPageLoad() {
  if (typeof rebuildCardStatsFromHistory === "function") {
    rebuildCardStatsFromHistory();
    return;
  }

  saveCardStats(getBaseCardStats70());
  renderPlayerCardStats();

  setTimeout(() => {
  rebuildCardStatsFromHistory();
  render();
  renderPlayerCardStats();
}, 50);
}

syncCardStatsOnPageLoad();

// =====================================================
// MATCHPULSE CARD SYSTEM - BASE 70 + UPGRADE SEMPLICE
// =====================================================

var MP_FINAL_BASE_CARD_STATS = {
  pac: 60,
  sho: 60,
  pas: 60,
  dri: 60,
  def: 60,
  phy: 60
};

function mpFinalBaseStats() {
  return { ...MP_FINAL_BASE_CARD_STATS };
}

function mpFinalNumber(value) {
  if (value === undefined || value === null || value === "") return 0;

  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function mpFinalValue(match, names) {
  for (const name of names) {
    if (match[name] !== undefined && match[name] !== null && match[name] !== "") {
      return mpFinalNumber(match[name]);
    }
  }

  return 0;
}

function mpFinalClamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function saveCardStats(stats) {
  localStorage.setItem("matchpulse_card_stats", JSON.stringify(stats));
}

function getCardStats() {
  const saved = localStorage.getItem("matchpulse_card_stats");

  if (!saved) {
    saveCardStats(mpFinalBaseStats());
    return mpFinalBaseStats();
  }

  try {
    const stats = JSON.parse(saved);

    return {
      pac: Number(stats.pac) || MP_FINAL_BASE_CARD_STATS.pac,
      sho: Number(stats.sho) || MP_FINAL_BASE_CARD_STATS.sho,
      pas: Number(stats.pas) || MP_FINAL_BASE_CARD_STATS.pas,
      dri: Number(stats.dri) || MP_FINAL_BASE_CARD_STATS.dri,
      def: Number(stats.def) || MP_FINAL_BASE_CARD_STATS.def,
      phy: Number(stats.phy) || MP_FINAL_BASE_CARD_STATS.phy
    };
  } catch (error) {
    saveCardStats(mpFinalBaseStats());
    return mpFinalBaseStats();
  }
}

function calculateOVR(stats) {
  return Math.round(
    (stats.pac + stats.sho + stats.pas + stats.dri + stats.def + stats.phy) / 6
  );
}

function getCardRarity(ovr) {
  if (ovr <= 64) return "bronze";
  if (ovr <= 74) return "silver";
  if (ovr <= 89) return "gold";
  return "icon";
}

function mpFinalRatingPower(rating) {
  if (!rating) return 0.45;

  if (rating < 4.5) return -0.8;
  if (rating < 5.5) return -0.25;
  if (rating < 6.5) return 0.45;
  if (rating < 7.5) return 0.7;
  if (rating < 8.5) return 0.95;
  if (rating < 9.5) return 1.2;

  return 1.4;
}

function mpFinalMaxUp(rating) {
  if (!rating) return 0.35;

  if (rating < 4.5) return 0;
  if (rating < 5.5) return 0.12;
  if (rating < 6.5) return 0.45;
  if (rating < 7.5) return 0.75;
  if (rating < 8.5) return 1.0;
  if (rating < 9.5) return 1.25;

  return 1.5;
}

function mpFinalMaxDown(rating) {
  if (!rating) return 0.35;

  if (rating < 4.5) return 1.2;
  if (rating < 5.5) return 0.8;
  if (rating < 6.5) return 0.45;
  if (rating < 7.5) return 0.35;

  return 0.25;
}

function mpFinalApplyDelta(current, rawDelta, rating) {
  const power = mpFinalRatingPower(rating);
  const maxUp = mpFinalMaxUp(rating);
  const maxDown = mpFinalMaxDown(rating);

  let delta = rawDelta * power;

  if (rating > 0 && rating < 5.5) {
    delta -= (5.5 - rating) * 0.15;
  }

  delta = mpFinalClamp(delta, -maxDown, maxUp);

  return mpFinalClamp(current + delta, 0, 99);
}

function applyMatchUpgrades(match) {
  const stats = getCardStats();

  const rating = mpFinalValue(match, ["rating", "voto", "valutazione", "matchRating"]);

  const goals = mpFinalValue(match, ["goals", "goal", "gol"]);
  const assists = mpFinalValue(match, ["assists", "assist"]);
  const shotsOnTarget = mpFinalValue(match, ["shotsOnTarget", "tiriInPorta", "tiri_porta"]);
  const keyPasses = mpFinalValue(match, ["keyPasses", "passaggiChiave", "passaggi_chiave"]);
  const dribbles = mpFinalValue(match, ["dribbles", "dribbling", "dribblesCompleted", "dribblingRiusciti"]);
  const ballsLost = mpFinalValue(match, ["ballsLost", "pallePerse", "palle_perse"]);
  const recoveries = mpFinalValue(match, ["recoveries", "recuperi"]);
  const duelsWon = mpFinalValue(match, ["duelsWon", "duelliVinti", "duelli_vinti"]);

  const raw = {
    pac: 0,
    sho: 0,
    pas: 0,
    dri: 0,
    def: 0,
    phy: 0
  };

  // PAC - Velocità
  raw.pac += dribbles * 0.006;
  raw.pac += goals * 0.015;
  raw.pac -= ballsLost * 0.018;

  // SHO - Tiro
  raw.sho += goals * 0.11;
  raw.sho += shotsOnTarget * 0.04;

  // PAS - Passaggio
  raw.pas += assists * 0.10;
  raw.pas += keyPasses * 0.04;
  raw.pas -= ballsLost * 0.025;

  // DRI - Dribbling
  raw.dri += dribbles * 0.018;
  raw.dri -= ballsLost * 0.04;

  // DEF - Difesa
  raw.def += recoveries * 0.045;

  // PHY - Fisico
  raw.phy += duelsWon * 0.055;
  raw.phy += recoveries * 0.012;

  const updatedStats = {
    pac: mpFinalApplyDelta(stats.pac, raw.pac, rating),
    sho: mpFinalApplyDelta(stats.sho, raw.sho, rating),
    pas: mpFinalApplyDelta(stats.pas, raw.pas, rating),
    dri: mpFinalApplyDelta(stats.dri, raw.dri, rating),
    def: mpFinalApplyDelta(stats.def, raw.def, rating),
    phy: mpFinalApplyDelta(stats.phy, raw.phy, rating)
  };

  saveCardStats(updatedStats);

  console.log("MATCHPULSE_CARD_UPGRADE", {
    rating,
    goals,
    assists,
    shotsOnTarget,
    keyPasses,
    dribbles,
    ballsLost,
    recoveries,
    duelsWon,
    oldStats: stats,
    raw,
    updatedStats
  });

  return updatedStats;
}

function renderPlayerCardStats() {
  const stats = getCardStats();
  const ovr = calculateOVR(stats);
  const rarity = getCardRarity(ovr);

  const ovrElement = document.querySelector(".card-ovr");
  const pacElement = document.querySelector(".stat-pac");
  const shoElement = document.querySelector(".stat-sho");
  const pasElement = document.querySelector(".stat-pas");
  const driElement = document.querySelector(".stat-dri");
  const defElement = document.querySelector(".stat-def");
  const phyElement = document.querySelector(".stat-phy");

  if (ovrElement) ovrElement.textContent = ovr;
  if (pacElement) pacElement.textContent = Math.round(stats.pac);
  if (shoElement) shoElement.textContent = Math.round(stats.sho);
  if (pasElement) pasElement.textContent = Math.round(stats.pas);
  if (driElement) driElement.textContent = Math.round(stats.dri);
  if (defElement) defElement.textContent = Math.round(stats.def);
  if (phyElement) phyElement.textContent = Math.round(stats.phy);

  const card = document.querySelector(".player-card");

  if (card) {
    card.classList.remove(
      "card-bronze",
      "card-silver",
      "card-gold",
      "card-icon",
      "card-special",
      "bronze",
      "silver",
      "gold",
      "icon",
      "special"
    );

    card.classList.add(`card-${rarity}`);
  }
}

function resetCardStats() {
  saveCardStats(mpFinalBaseStats());
  renderPlayerCardStats();
}

function rebuildCardStatsFromHistory() {
  saveCardStats(mpFinalBaseStats());

  const matches = typeof getMatches === "function" ? getMatches() : [];

  matches.forEach((match) => {
    applyMatchUpgrades(match);
  });

  renderPlayerCardStats();
}

function syncCardStatsOnPageLoad() {
  rebuildCardStatsFromHistory();

  setTimeout(() => {
    renderPlayerCardStats();
  }, 0);
}

window.getCardStats = getCardStats;
window.saveCardStats = saveCardStats;
window.calculateOVR = calculateOVR;
window.getCardRarity = getCardRarity;
window.applyMatchUpgrades = applyMatchUpgrades;
window.renderPlayerCardStats = renderPlayerCardStats;
window.resetCardStats = resetCardStats;
window.rebuildCardStatsFromHistory = rebuildCardStatsFromHistory;
window.syncCardStatsOnPageLoad = syncCardStatsOnPageLoad;

syncCardStatsOnPageLoad();

/* =========================================================
   MATCHPULSE FIX FINALE - STATS NUOVE + TROFEI + CARD
   Incollare in fondo ad app.js
   ========================================================= */

function totals(matches = getMatches()) {
  const played = matches.length;

  const goals = sum(matches, "goals");
  const assists = sum(matches, "assists");
  const rating = sum(matches, "rating");

  const shots = sum(matches, "shots");
  const shotsOn = sum(matches, "shotsOn") + sum(matches, "shotsOnTarget");

  const keyPasses = sum(matches, "keyPasses");

  const dribbles =
    sum(matches, "dribblesCompleted") +
    sum(matches, "dribbles");

  const ballsLost = sum(matches, "ballsLost");
  const recoveries = sum(matches, "recoveries");
  const duelsWon = sum(matches, "duelsWon");

  return {
    played,
    goals,
    assists,
    rating,
    shots,
    shotsOn,
    keyPasses,
    dribbles,
    dribblesCompleted: dribbles,
    ballsLost,
    recoveries,
    duelsWon
  };
}

function applyMatchUpgrades(match) {
  const stats = getCardStats();

  const rating = mpFinalValue(match, ["rating", "voto", "valutazione", "matchRating"]);
  const matchRating = rating > 0 ? rating : 6;

  const outcome = String(match.outcome || "").toLowerCase();
  const isLoss =
    outcome.includes("sconfitta") ||
    outcome.includes("perso") ||
    outcome.includes("persa") ||
    outcome.includes("lost");

  const goals = mpFinalValue(match, ["goals", "goal", "gol"]);
  const assists = mpFinalValue(match, ["assists", "assist"]);

  const shots = mpFinalValue(match, ["shots", "tiri", "shotsTotal", "tiriTotali"]);
  const shotsOn = mpFinalValue(match, ["shotsOn", "shotsOnTarget", "tiriInPorta", "tiri_porta"]);

  const keyPasses = mpFinalValue(match, ["keyPasses", "passaggiChiave", "passaggi_chiave"]);

  const dribbles = mpFinalValue(match, [
    "dribbles",
    "dribblesCompleted",
    "dribbling",
    "dribblingRiusciti"
  ]);

  const ballsLost = mpFinalValue(match, ["ballsLost", "pallePerse", "palle_perse"]);
  const recoveries = mpFinalValue(match, ["recoveries", "recuperi"]);
  const duelsWon = mpFinalValue(match, ["duelsWon", "duelliVinti", "duelli_vinti"]);

  const shotAccuracy = shots > 0 ? shotsOn / shots : 0;

  function qualityMultiplier(r) {
    if (r < 4.5) return 0.20;
    if (r < 5.5) return 0.35;
    if (r < 6.0) return 0.55;
    if (r < 6.5) return 0.75;
    if (r < 7.0) return 0.95;
    if (r < 7.5) return 1.10;
    if (r < 8.0) return 1.25;
    if (r < 8.5) return 1.40;
    if (r < 9.0) return 1.60;
    if (r < 9.5) return 1.85;
    return 2.10;
  }

  function maxUpgradeByRating(r) {
    if (r < 5.5) return 0;      // partita brutta: non puoi salire
    if (r < 6.0) return 0.15;
    if (r < 6.5) return 0.45;
    if (r < 7.0) return 0.90;
    if (r < 7.5) return 1.40;
    if (r < 8.0) return 2.10;
    if (r < 8.5) return 2.80;
    if (r < 9.0) return 3.70;
    if (r < 9.5) return 4.80;
    return 5.60;
  }

  function maxDowngradeByRating(r) {
    if (r < 4.5) return 2.80;
    if (r < 5.5) return 1.90;
    if (r < 6.0) return 1.10;
    if (r < 6.5) return 0.55;
    return 0.20;
  }

  function applyStatDelta(current, rawDelta) {
    const maxUp = maxUpgradeByRating(matchRating);
    const maxDown = maxDowngradeByRating(matchRating);

    const delta = mpFinalClamp(rawDelta, -maxDown, maxUp);
    const next = mpFinalClamp(current + delta, 0, 99);

    return Number(next.toFixed(2));
  }

  const q = qualityMultiplier(matchRating);

  const raw = {
    pac: 0,
    sho: 0,
    pas: 0,
    dri: 0,
    def: 0,
    phy: 0
  };

  /*
    IMPORTANTISSIMO:
    Qui NON mettiamo più un bonus generico uguale su tutte le stats.
    Ogni statistica sale solo se fai cose collegate a quella statistica.
  */

  // PAC - Velocità / esplosività
  raw.pac += dribbles * 0.22 * q;
  raw.pac += recoveries * 0.06 * q;
  raw.pac -= ballsLost * 0.08;

  // SHO - Tiro
  raw.sho += goals * 0.95 * q;
  raw.sho += shotsOn * 0.16 * q;
  raw.sho += shotAccuracy * 0.35 * q;

  // PAS - Passaggio
  raw.pas += assists * 0.90 * q;
  raw.pas += keyPasses * 0.36 * q;
  raw.pas -= ballsLost * 0.08;

  // DRI - Dribbling / controllo palla
  raw.dri += dribbles * 0.42 * q;
  raw.dri -= ballsLost * 0.18;

  // DEF - Difesa
  raw.def += recoveries * 0.36 * q;
  raw.def += duelsWon * 0.14 * q;

  // PHY - Fisico
  raw.phy += duelsWon * 0.38 * q;
  raw.phy += recoveries * 0.10 * q;
  raw.phy -= ballsLost * 0.04;

  // Penalità generale per voto basso.
  // Non fa salire tutte le stats: le frena o le abbassa.
  if (matchRating < 6) {
    const badPenalty = matchRating < 5.5 ? 0.65 : 0.30;

    raw.pac -= badPenalty;
    raw.sho -= badPenalty;
    raw.pas -= badPenalty;
    raw.dri -= badPenalty;
    raw.def -= badPenalty;
    raw.phy -= badPenalty;
  }

  // Se perdi e ti dai voto basso, la partita è chiaramente negativa.
  if (isLoss && matchRating < 6) {
    raw.pac -= 0.25;
    raw.sho -= 0.25;
    raw.pas -= 0.25;
    raw.dri -= 0.25;
    raw.def -= 0.25;
    raw.phy -= 0.25;
  }

  let updatedStats = {
    pac: applyStatDelta(stats.pac, raw.pac),
    sho: applyStatDelta(stats.sho, raw.sho),
    pas: applyStatDelta(stats.pas, raw.pas),
    dri: applyStatDelta(stats.dri, raw.dri),
    def: applyStatDelta(stats.def, raw.def),
    phy: applyStatDelta(stats.phy, raw.phy)
  };

  const oldOvr = calculateOVR(stats);
  const newOvr = calculateOVR(updatedStats);

  /*
    Blocco coerenza:
    se il voto è brutto, l'OVR non può salire.
    Può restare uguale o scendere.
  */
  if (matchRating < 5.5 && newOvr > oldOvr) {
    updatedStats = {
      pac: Math.min(updatedStats.pac, stats.pac),
      sho: Math.min(updatedStats.sho, stats.sho),
      pas: Math.min(updatedStats.pas, stats.pas),
      dri: Math.min(updatedStats.dri, stats.dri),
      def: Math.min(updatedStats.def, stats.def),
      phy: Math.min(updatedStats.phy, stats.phy)
    };
  }

  saveCardStats(updatedStats);

  console.log("MATCHPULSE_CARD_UPGRADE", {
    rating,
    matchRating,
    isLoss,
    goals,
    assists,
    shots,
    shotsOn,
    shotAccuracy,
    keyPasses,
    dribbles,
    ballsLost,
    recoveries,
    duelsWon,
    oldStats: stats,
    raw,
    updatedStats,
    oldOvr,
    newOvr: calculateOVR(updatedStats)
  });

  return updatedStats;
}

function achievements(matches) {
  const t = totals(matches);
  const cardStats = getCardStats();
  const ovr = calculateOVR(cardStats);

  const avgRating = t.played ? Number(avg(t.rating, t.played)) : 0;
  const shotPct = t.shots > 0 ? pctValue(t.shotsOn, t.shots) : 0;

  return [
    {
      icon: "🏁",
      title: "Prima partita",
      desc: "Registra la tua prima partita",
      unlocked: t.played >= 1
    },
    {
      icon: "⚽",
      title: "Bomber",
      desc: "Raggiungi 10 gol totali",
      unlocked: t.goals >= 10,
      progress: `${t.goals}/10`
    },
    {
      icon: "🎯",
      title: "Assistman",
      desc: "Raggiungi 10 assist totali",
      unlocked: t.assists >= 10,
      progress: `${t.assists}/10`
    },
    {
      icon: "🚀",
      title: "Cecchino",
      desc: "Raggiungi 20 tiri in porta totali",
      unlocked: t.shotsOn >= 20,
      progress: `${t.shotsOn}/20`
    },
    {
      icon: "🔥",
      title: "Precisione offensiva",
      desc: "Almeno 60% di tiri in porta con 10+ tiri totali",
      unlocked: t.shots >= 10 && shotPct >= 60,
      progress: `${Math.round(shotPct)}%`
    },
    {
      icon: "🧠",
      title: "Regista",
      desc: "Raggiungi 15 passaggi chiave",
      unlocked: t.keyPasses >= 15,
      progress: `${t.keyPasses}/15`
    },
    {
      icon: "🌀",
      title: "Dribblatore",
      desc: "Raggiungi 20 dribbling riusciti",
      unlocked: t.dribbles >= 20,
      progress: `${t.dribbles}/20`
    },
    {
      icon: "🧱",
      title: "Muro",
      desc: "Raggiungi 20 recuperi palla",
      unlocked: t.recoveries >= 20,
      progress: `${t.recoveries}/20`
    },
    {
      icon: "💪",
      title: "Fisico dominante",
      desc: "Raggiungi 20 duelli vinti",
      unlocked: t.duelsWon >= 20,
      progress: `${t.duelsWon}/20`
    },
    {
      icon: "✨",
      title: "Piedi puliti",
      desc: "Meno di 20 palle perse dopo almeno 5 partite",
      unlocked: t.played >= 5 && t.ballsLost < 20,
      progress: `${t.ballsLost}/20`
    },
    {
      icon: "🔥",
      title: "Forma alta",
      desc: "Valutazione media almeno 7.5 dopo 3 partite",
      unlocked: t.played >= 3 && avgRating >= 7.5,
      progress: `${avgRating.toFixed(1)}/7.5`
    },
    {
      icon: "🥉",
      title: "Carta bronzo",
      desc: "OVR da 0 a 64",
      unlocked: ovr < 65
    },
    {
      icon: "🥈",
      title: "Carta argento",
      desc: "OVR da 65 a 74",
      unlocked: ovr >= 65 && ovr < 75
    },
    {
      icon: "🥇",
      title: "Carta oro",
      desc: "OVR da 75 a 89",
      unlocked: ovr >= 75 && ovr < 90
    },
    {
      icon: "👑",
      title: "Icona",
      desc: "OVR da 90 in su",
      unlocked: ovr >= 90
    }
  ];
}

function customAchievementValue(stat, matches) {
  const t = totals(matches);
  const cardStats = getCardStats();
  const ovr = calculateOVR(cardStats);

  if (stat === "goals") return t.goals;
  if (stat === "assists") return t.assists;
  if (stat === "played") return t.played;
  if (stat === "rating") return Number(avg(t.rating, t.played));
  if (stat === "ovr") return ovr;
  if (stat === "shotsOn") return t.shotsOn;
  if (stat === "keyPasses") return t.keyPasses;
  if (stat === "dribbles") return t.dribbles;
  if (stat === "dribblesCompleted") return t.dribbles;
  if (stat === "recoveries") return t.recoveries;
  if (stat === "duelsWon") return t.duelsWon;
  if (stat === "ballsLost") return t.ballsLost;

  return 0;
}

function statLabel(stat) {
  const labels = {
    goals: "Gol",
    assists: "Assist",
    played: "Partite giocate",
    rating: "Voto medio",
    ovr: "OVR carta",
    shotsOn: "Tiri in porta",
    keyPasses: "Passaggi chiave",
    dribbles: "Dribbling riusciti",
    dribblesCompleted: "Dribbling riusciti",
    recoveries: "Recuperi palla",
    duelsWon: "Duelli vinti",
    ballsLost: "Palle perse"
  };

  return labels[stat] || stat;
}

function preMatchGoalOptions() {
  return [
    { key: "goals", label: "Gol", mode: "min", step: "1" },
    { key: "assists", label: "Assist", mode: "min", step: "1" },
    { key: "rating", label: "Voto personale", mode: "min", step: "0.1" },
    { key: "shotsOn", label: "Tiri in porta", mode: "min", step: "1" },
    { key: "keyPasses", label: "Passaggi chiave", mode: "min", step: "1" },
    { key: "dribblesCompleted", label: "Dribbling riusciti", mode: "min", step: "1" },
    { key: "recoveries", label: "Recuperi palla", mode: "min", step: "1" },
    { key: "duelsWon", label: "Duelli vinti", mode: "min", step: "1" },
    { key: "ballsLost", label: "Palle perse massimo", mode: "max", step: "1" }
  ];
}

function preMatchGoalValue(goal, match) {
  if (!match) return null;

  if (goal.key === "goals") return num(match.goals);
  if (goal.key === "assists") return num(match.assists);
  if (goal.key === "rating") return num(match.rating);
  if (goal.key === "shotsOn") return num(match.shotsOn) + num(match.shotsOnTarget);
  if (goal.key === "keyPasses") return num(match.keyPasses);
  if (goal.key === "dribblesCompleted") return num(match.dribblesCompleted) + num(match.dribbles);
  if (goal.key === "recoveries") return num(match.recoveries);
  if (goal.key === "duelsWon") return num(match.duelsWon);
  if (goal.key === "ballsLost") return num(match.ballsLost);

  return 0;
}

function goalsPageRecords(matches) {
  if (!matches.length) {
    return `
      <section class="goals-page-card">
        <div class="goals-page-head">
          <div>
            <h3>Record personali</h3>
            <span>Nessuna partita salvata</span>
          </div>
          <strong>🏆</strong>
        </div>

        <p class="goals-empty">Salva almeno una partita per creare i tuoi record personali.</p>
      </section>
    `;
  }

  const records = [
    goalPageBestRecord(matches, "Miglior voto", "⭐", m => num(m.rating), "/10", 1),
    goalPageBestRecord(matches, "Più gol", "⚽", m => num(m.goals)),
    goalPageBestRecord(matches, "Più assist", "🎯", m => num(m.assists)),
    goalPageBestRecord(matches, "Più tiri in porta", "🚀", m => num(m.shotsOn) + num(m.shotsOnTarget)),
    goalPageBestRecord(matches, "Più passaggi chiave", "🧠", m => num(m.keyPasses)),
    goalPageBestRecord(matches, "Più dribbling", "🌀", m => num(m.dribblesCompleted) + num(m.dribbles)),
    goalPageBestRecord(matches, "Più recuperi", "🧱", m => num(m.recoveries)),
    goalPageBestRecord(matches, "Più duelli vinti", "💪", m => num(m.duelsWon))
  ].filter(Boolean);

  return `
    <section class="goals-page-card">
      <div class="goals-page-head">
        <div>
          <h3>Record personali</h3>
          <span>I tuoi picchi migliori in partita</span>
        </div>
        <strong>🏆</strong>
      </div>

      <div class="goal-records-grid">
        ${records.join("")}
      </div>
    </section>
  `;
}

function cardUpgradeInfo() {
  const stats = getCardStats();
  const ovr = calculateOVR(stats);

  if (ovr < 65) {
    return {
      current: "Bronzo",
      next: "Argento",
      target: 65,
      from: 0,
      to: 65,
      remaining: 65 - ovr
    };
  }

  if (ovr < 75) {
    return {
      current: "Argento",
      next: "Oro",
      target: 75,
      from: 65,
      to: 75,
      remaining: 75 - ovr
    };
  }

  if (ovr < 90) {
    return {
      current: "Oro",
      next: "Icona",
      target: 90,
      from: 75,
      to: 90,
      remaining: 90 - ovr
    };
  }

  return {
    current: "Icona",
    next: "99 OVR",
    target: 99,
    from: 90,
    to: 99,
    remaining: Math.max(0, 99 - ovr)
  };
}

function cardUpgradePreview() {
  const stats = getCardStats();
  const ovr = calculateOVR(stats);
  const info = cardUpgradeInfo();
  const cardRarity = getCardRarity(ovr);

  const progress = Math.max(
    0,
    Math.min(100, ((ovr - info.from) / (info.to - info.from)) * 100)
  );

  const remainingText = info.remaining <= 0
    ? "Upgrade massimo raggiunto"
    : `${Number(info.remaining.toFixed(1))} punti OVR`;

  return `
    <section class="goals-page-card card-upgrade-card-${cardRarity}">
      <div class="goals-page-head">
        <div>
          <h3>Prossimo upgrade carta</h3>
          <span>${info.current} → ${info.next}</span>
        </div>

        <strong>⬆️</strong>
      </div>

      <div class="card-upgrade-content">
        <div class="card-upgrade-ovr">
          <span>OVR</span>
          <strong>${ovr}</strong>
          <small>${escapeHtml(info.current)}</small>
        </div>

        <div class="card-upgrade-details">
          <div>
            <span>Carta attuale</span>
            <strong>${escapeHtml(info.current)}</strong>
          </div>

          <div>
            <span>Prossimo step</span>
            <strong>${escapeHtml(info.next)}</strong>
          </div>

          <div>
            <span>Target</span>
            <strong>${info.target} OVR</strong>
          </div>

          <div>
            <span>Ti manca</span>
            <strong>${remainingText}</strong>
          </div>
        </div>
      </div>

      <div class="card-upgrade-progress">
        <div class="card-upgrade-bar">
          <div style="width:${progress}%"></div>
        </div>

        <small>${Math.round(progress)}% verso il prossimo upgrade</small>
      </div>
    </section>
  `;
}

function renderPlayerCardStats() {
  const stats = getCardStats();
  const ovr = calculateOVR(stats);
  const rarity = getCardRarity(ovr);

  const tierLabel = {
    bronze: "Bronzo",
    silver: "Argento",
    gold: "Oro",
    icon: "Icona",
    special: "Icona"
  }[rarity] || "Argento";

  const ovrElement = document.querySelector(".card-ovr");
  const pacElement = document.querySelector(".stat-pac");
  const shoElement = document.querySelector(".stat-sho");
  const pasElement = document.querySelector(".stat-pas");
  const driElement = document.querySelector(".stat-dri");
  const defElement = document.querySelector(".stat-def");
  const phyElement = document.querySelector(".stat-phy");

  if (ovrElement) ovrElement.textContent = ovr;
  if (pacElement) pacElement.textContent = Math.round(stats.pac);
  if (shoElement) shoElement.textContent = Math.round(stats.sho);
  if (pasElement) pasElement.textContent = Math.round(stats.pas);
  if (driElement) driElement.textContent = Math.round(stats.dri);
  if (defElement) defElement.textContent = Math.round(stats.def);
  if (phyElement) phyElement.textContent = Math.round(stats.phy);

  const card = document.querySelector(".player-card");

  if (card) {
    card.classList.remove(
      "card-bronze",
      "card-silver",
      "card-gold",
      "card-icon",
      "card-special",
      "bronze",
      "silver",
      "gold",
      "icon",
      "special"
    );

    card.classList.add(`card-${rarity}`);
  }

  const tierText = document.querySelector(".player-top > div:nth-child(2) span");
  if (tierText) tierText.textContent = tierLabel;
}

window.totals = totals;
window.applyMatchUpgrades = applyMatchUpgrades;
window.achievements = achievements;
window.customAchievementValue = customAchievementValue;
window.statLabel = statLabel;
window.preMatchGoalOptions = preMatchGoalOptions;
window.preMatchGoalValue = preMatchGoalValue;
window.goalsPageRecords = goalsPageRecords;
window.cardUpgradeInfo = cardUpgradeInfo;
window.cardUpgradePreview = cardUpgradePreview;
window.renderPlayerCardStats = renderPlayerCardStats;

/* =========================================================
   MATCHPULSE - NASCONDI TROFEI BASE / ELIMINA PERSONALIZZATI
   VERSIONE SICURA
   ========================================================= */

var MP_HIDDEN_ACHIEVEMENTS_KEY = "matchpulse_hidden_base_achievements";

function mpAchievementKey(item, index) {
  if (item.key) return item.key;

  return String(item.title || `trofeo_${index}`)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getHiddenAchievements() {
  try {
    return JSON.parse(localStorage.getItem(MP_HIDDEN_ACHIEVEMENTS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHiddenAchievements(items) {
  localStorage.setItem(MP_HIDDEN_ACHIEVEMENTS_KEY, JSON.stringify(items));
}

function hideBaseAchievement(key) {
  const hidden = getHiddenAchievements();

  if (!hidden.includes(key)) {
    hidden.push(key);
  }

  saveHiddenAchievements(hidden);
  toast("Trofeo nascosto");
  renderAchievementsManager();
}

function restoreBaseAchievement(key) {
  const hidden = getHiddenAchievements().filter(item => item !== key);
  saveHiddenAchievements(hidden);

  toast("Trofeo ripristinato");
  renderAchievementsManager();
}

function resetHiddenAchievements() {
  saveHiddenAchievements([]);
  toast("Trofei base ripristinati");
  renderAchievementsManager();
}

function achievementsPreview(matches) {
  const hidden = getHiddenAchievements();

  const baseList = achievements(matches).filter((item, index) => {
    const key = mpAchievementKey(item, index);
    return !hidden.includes(key);
  });

  const customList = customAchievements(matches);
  const list = [...baseList, ...customList];

  const unlocked = list.filter(item => item.unlocked).length;
  const percentage = list.length ? Math.round((unlocked / list.length) * 100) : 0;

  return `
    <section class="home-achievements-card">
      <div class="achievements-head">
        <div>
          <h3>Bacheca trofei</h3>
          <span>${unlocked}/${list.length} sbloccati</span>
        </div>

        <div class="achievements-actions">
          <strong>${percentage}%</strong>
          <button type="button" onclick="renderAchievementsManager()">Gestisci</button>
        </div>
      </div>

      <div class="achievements-list">
        ${
          list.length
            ? list.map(item => `
              <div class="achievement-item ${item.unlocked ? "unlocked" : "locked"}">
                <div class="achievement-icon">${item.icon}</div>

                <div class="achievement-info">
                  <strong>${escapeHtml(item.title)}</strong>
                  <span>${escapeHtml(item.desc)}</span>
                  ${item.progress ? `<small>${escapeHtml(item.progress)}</small>` : ""}
                </div>
              </div>
            `).join("")
            : `
              <div class="achievement-item locked">
                <div class="achievement-icon">🏆</div>
                <div class="achievement-info">
                  <strong>Nessun trofeo visibile</strong>
                  <span>Puoi ripristinarli da Gestisci trofei.</span>
                </div>
              </div>
            `
        }
      </div>
    </section>
  `;
}

function renderAchievementsManager() {
  const matches = getMatches();
  const hidden = getHiddenAchievements();

  const baseItems = achievements(matches);
  const customItems = getCustomAchievements();

  const baseHtml = baseItems.map((item, index) => {
    const key = mpAchievementKey(item, index);
    const isHidden = hidden.includes(key);

    const actionButton = isHidden
      ? `<button type="button" onclick="restoreBaseAchievement('${key}')">Ripristina</button>`
      : `<button type="button" class="danger-btn" onclick="hideBaseAchievement('${key}')">Nascondi</button>`;

    return `
      <div class="card custom-achievement-row">
        <div>
          <strong>${item.icon} ${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.desc)}${item.progress ? ` · ${escapeHtml(item.progress)}` : ""}</span>
          ${isHidden ? `<small class="muted">Nascosto dalla bacheca</small>` : ""}
        </div>

        ${actionButton}
      </div>
    `;
  }).join("");

  const customHtml = customItems.length
    ? customItems.map((item, index) => `
      <div class="card custom-achievement-row">
        <div>
          <strong>${escapeHtml(item.icon || "🏆")} ${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(statLabel(item.stat))} · obiettivo ${escapeHtml(item.target)}</span>
        </div>

        <button type="button" class="danger-btn" onclick="deleteCustomAchievement(${index})">
          Elimina
        </button>
      </div>
    `).join("")
    : `<div class="card"><p class="muted">Non hai ancora creato trofei personalizzati.</p></div>`;

  app.innerHTML = `
    <section class="section">
      <div class="page-head">
        <button class="ghost-btn" onclick="setRoute('home')">← Home</button>

        <div>
          <h2>Gestisci trofei</h2>
          <p>Nascondi i trofei base o elimina quelli personalizzati.</p>
        </div>
      </div>

      <section class="card">
        <div class="card-title">
          <h3>Trofei base</h3>
          <button type="button" class="secondary-btn" onclick="resetHiddenAchievements()">
            Ripristina tutti
          </button>
        </div>

        <div class="custom-achievements-list">
          ${baseHtml}
        </div>
      </section>

      <form class="card custom-achievement-form" onsubmit="addCustomAchievement(event)">
        <div class="field">
          <label>Icona</label>
          <input name="icon" placeholder="🏆" maxlength="2">
        </div>

        <div class="field">
          <label>Nome trofeo</label>
          <input name="title" placeholder="Killer sotto porta" required>
        </div>

        <div class="field">
          <label>Statistica</label>
          <select name="stat" required>
            <option value="goals">Gol</option>
            <option value="assists">Assist</option>
            <option value="played">Partite giocate</option>
            <option value="rating">Voto medio</option>
            <option value="ovr">OVR carta</option>
            <option value="shotsOn">Tiri in porta</option>
            <option value="keyPasses">Passaggi chiave</option>
            <option value="dribbles">Dribbling riusciti</option>
            <option value="recoveries">Recuperi palla</option>
            <option value="duelsWon">Duelli vinti</option>
            <option value="ballsLost">Palle perse</option>
          </select>
        </div>

        <div class="field">
          <label>Obiettivo</label>
          <input name="target" type="number" step="0.1" min="1" placeholder="10" required>
        </div>

        <button class="primary-btn" type="submit">Aggiungi trofeo</button>
      </form>

      <section class="card">
        <div class="card-title">
          <h3>Trofei personalizzati</h3>
          <span>${customItems.length}</span>
        </div>

        <div class="custom-achievements-list">
          ${customHtml}
        </div>
      </section>
    </section>
  `;
}

window.getHiddenAchievements = getHiddenAchievements;
window.hideBaseAchievement = hideBaseAchievement;
window.restoreBaseAchievement = restoreBaseAchievement;
window.resetHiddenAchievements = resetHiddenAchievements;
window.achievementsPreview = achievementsPreview;
window.renderAchievementsManager = renderAchievementsManager;

/* =========================================================
   MATCHPULSE PATCH FINALE - CARD DIFFERENZIATA + STATS NUOVE
   Incolla QUESTO BLOCCO ALLA FINE DI app.js
   ========================================================= */

function mpRoleBaseStats60(role) {
  const roleBases = {

    ATT: {
      pac: 64,
      sho: 68,
      pas: 58,
      dri: 64,
      def: 48,
      phy: 58
    },

    ALA: {
      pac: 68,
      sho: 61,
      pas: 61,
      dri: 67,
      def: 48,
      phy: 55
    },

    COC: {
      pac: 61,
      sho: 61,
      pas: 68,
      dri: 66,
      def: 49,
      phy: 55
    },

    CC: {
      pac: 60,
      sho: 56,
      pas: 68,
      dri: 63,
      def: 57,
      phy: 56
    },

    CDC: {
      pac: 59,
      sho: 49,
      pas: 65,
      dri: 56,
      def: 67,
      phy: 64
    },

    DC: {
      pac: 62,
      sho: 46,
      pas: 64,
      dri: 53,
      def: 69,
      phy: 66
    },

    TERZINO: {
      pac: 66,
      sho: 50,
      pas: 62,
      dri: 59,
      def: 64,
      phy: 59
    }
  };

  return {
    ...(
      roleBases[role] ||
      roleBases.CC
    )
  };
}


function mpCardStyleModifiers60(
  playStyle
) {
  const modifiers = {

    Equilibrato: {
      pac: 0,
      sho: 0,
      pas: 0,
      dri: 0,
      def: 0,
      phy: 0
    },

    Finalizzatore: {
      pac: 1,
      sho: 3,
      pas: -1,
      dri: 1,
      def: -3,
      phy: -1
    },

    Regista: {
      pac: -1,
      sho: -2,
      pas: 4,
      dri: 1,
      def: -1,
      phy: -1
    },

    Dribblatore: {
      pac: 2,
      sho: 0,
      pas: -1,
      dri: 4,
      def: -3,
      phy: -2
    },

    Difensore: {
      pac: 0,
      sho: -3,
      pas: 1,
      dri: -1,
      def: 4,
      phy: -1
    },

    Motore: {
      pac: 2,
      sho: -2,
      pas: 1,
      dri: -1,
      def: -1,
      phy: 1
    },

    Velocista: {
      pac: 4,
      sho: 0,
      pas: -1,
      dri: 1,
      def: -2,
      phy: -2
    },

    Boa: {
      pac: -2,
      sho: 2,
      pas: -1,
      dri: 0,
      def: -2,
      phy: 3
    }
  };

  return (
    modifiers[playStyle] ||
    modifiers.Equilibrato
  );
}


function mpBaseCardStats60() {
  const profile = getPlayerProfile();

  const roleBase =
    mpRoleBaseStats60(
      profile.role
    );

  const styleModifiers =
    mpCardStyleModifiers60(
      profile.playStyle
    );

  return {
    pac:
      roleBase.pac +
      styleModifiers.pac,

    sho:
      roleBase.sho +
      styleModifiers.sho,

    pas:
      roleBase.pas +
      styleModifiers.pas,

    dri:
      roleBase.dri +
      styleModifiers.dri,

    def:
      roleBase.def +
      styleModifiers.def,

    phy:
      roleBase.phy +
      styleModifiers.phy
  };
}

function mpShotAccuracyValue(shotsOn, shots) {
  return shots > 0 ? Math.max(0, Math.min(1, shotsOn / shots)) : 0;
}

function mpQualityMultiplier(rating) {
  const r = Number(rating) || 6;

  if (r < 5.5) return 0;
  if (r < 6.0) return 0.45;
  if (r < 6.5) return 0.75;
  if (r < 7.0) return 1.00;
  if (r < 7.5) return 1.25;
  if (r < 8.0) return 1.55;
  if (r < 8.5) return 1.90;
  if (r < 9.0) return 2.25;
  if (r < 9.5) return 2.65;
  return 3.00;
}

function mpMaxGainByRating(rating) {
  const r = Number(rating) || 6;

  if (r < 5.5) return 0;
  if (r < 6.0) return 0.25;
  if (r < 6.5) return 1.00;
  if (r < 7.0) return 2.25;
  if (r < 7.5) return 3.50;
  if (r < 8.0) return 5.00;
  if (r < 8.5) return 6.50;
  if (r < 9.0) return 8.00;
  if (r < 9.5) return 9.50;
  return 11.00;
}

function mpMaxLossByRating(rating) {
  const r = Number(rating) || 6;

  if (r < 4.5) return 4.00;
  if (r < 5.5) return 2.75;
  if (r < 6.0) return 1.40;
  if (r < 6.5) return 0.55;
  return 0.15;
}

function mpApplyCardDelta(current, rawDelta, rating) {
  const gainCap = mpMaxGainByRating(rating);
  const lossCap = mpMaxLossByRating(rating);

  const delta = mpFinalClamp(rawDelta, -lossCap, gainCap);
  const next = mpFinalClamp(current + delta, 0, 99);

  return Number(next.toFixed(2));
}

function applyMatchUpgrades(match) {
  const oldStats = getCardStats();

  const rating = mpFinalValue(match, ["rating", "voto", "valutazione", "matchRating"]);
  const r = rating > 0 ? rating : 6;

  const outcome = String(match.outcome || match.result || "").toLowerCase();
  const isLoss =
    outcome.includes("sconfitta") ||
    outcome.includes("perso") ||
    outcome.includes("persa") ||
    outcome.includes("lost");

  const goals = mpFinalValue(match, ["goals", "goal", "gol"]);
  const assists = mpFinalValue(match, ["assists", "assist"]);

  const shotsInput = mpFinalValue(match, ["shots", "tiri", "shotsTotal", "tiriTotali"]);
  const shotsOnInput = mpFinalValue(match, ["shotsOn", "shotsOnTarget", "tiriInPorta", "tiri_porta"]);

  const shots = Math.max(shotsInput, shotsOnInput);
  const shotsOn = shotsOnInput;
  const missedShots = Math.max(0, shots - shotsOn);
  const shotAccuracy = mpShotAccuracyValue(shotsOn, shots);

  const keyPasses = mpFinalValue(match, ["keyPasses", "passaggiChiave", "passaggi_chiave"]);

  const dribbles = mpFinalValue(match, [
    "dribbles",
    "dribblesCompleted",
    "dribbling",
    "dribblingRiusciti"
  ]);

  const ballsLost = mpFinalValue(match, ["ballsLost", "pallePerse", "palle_perse"]);
  const recoveries = mpFinalValue(match, ["recoveries", "recuperi"]);
  const duelsWon = mpFinalValue(match, ["duelsWon", "duelliVinti", "duelli_vinti"]);

  const q = mpQualityMultiplier(r);

  const raw = {
    pac: 0,
    sho: 0,
    pas: 0,
    dri: 0,
    def: 0,
    phy: 0
  };

  /*
    Formula nuova:
    - niente bonus uguale su tutte le stats;
    - ogni stat sale solo per azioni collegate;
    - i tiri totali contano: se fai 6 tiri e solo 2 in porta, SHO viene frenato.
  */

  // PAC - velocità, strappi, attività
  raw.pac += dribbles * 0.55 * q;
  raw.pac += recoveries * 0.12 * q;
  raw.pac -= ballsLost * 0.14;

  // SHO - tiro, gol, precisione
  raw.sho += goals * 1.85 * q;
  raw.sho += shotsOn * 0.42 * q;
  raw.sho += shotAccuracy * 1.15 * q;
  raw.sho -= missedShots * 0.42;

  // PAS - assist e passaggi chiave
  raw.pas += assists * 1.65 * q;
  raw.pas += keyPasses * 0.75 * q;
  raw.pas -= ballsLost * 0.16;

  // DRI - dribbling e gestione palla
  raw.dri += dribbles * 0.90 * q;
  raw.dri -= ballsLost * 0.28;

  // DEF - recuperi e duelli
  raw.def += recoveries * 0.80 * q;
  raw.def += duelsWon * 0.24 * q;

  // PHY - fisico, duelli, intensità
  raw.phy += duelsWon * 0.85 * q;
  raw.phy += recoveries * 0.20 * q;
  raw.phy -= ballsLost * 0.08;

  // Voto brutto: la partita non può produrre upgrade furbi.
  if (r < 5.5) {
    raw.pac -= 0.90;
    raw.sho -= 0.90;
    raw.pas -= 0.90;
    raw.dri -= 0.90;
    raw.def -= 0.90;
    raw.phy -= 0.90;
  }

  // Sconfitta + voto basso: prestazione negativa.
  if (isLoss && r < 6) {
    raw.pac -= 0.35;
    raw.sho -= 0.35;
    raw.pas -= 0.35;
    raw.dri -= 0.35;
    raw.def -= 0.35;
    raw.phy -= 0.35;
  }

  let newStats = {
    pac: mpApplyCardDelta(oldStats.pac, raw.pac, r),
    sho: mpApplyCardDelta(oldStats.sho, raw.sho, r),
    pas: mpApplyCardDelta(oldStats.pas, raw.pas, r),
    dri: mpApplyCardDelta(oldStats.dri, raw.dri, r),
    def: mpApplyCardDelta(oldStats.def, raw.def, r),
    phy: mpApplyCardDelta(oldStats.phy, raw.phy, r)
  };

  const oldOvr = calculateOVR(oldStats);
  const newOvr = calculateOVR(newStats);

  // Se il voto è brutto, l'OVR non può salire.
  if (r < 5.5 && newOvr > oldOvr) {
    newStats = {
      pac: Math.min(newStats.pac, oldStats.pac),
      sho: Math.min(newStats.sho, oldStats.sho),
      pas: Math.min(newStats.pas, oldStats.pas),
      dri: Math.min(newStats.dri, oldStats.dri),
      def: Math.min(newStats.def, oldStats.def),
      phy: Math.min(newStats.phy, oldStats.phy)
    };
  }

  saveCardStats(newStats);

  console.log("MATCHPULSE_CARD_UPGRADE_FINAL", {
    rating: r,
    q,
    isLoss,
    goals,
    assists,
    shots,
    shotsOn,
    missedShots,
    shotAccuracy,
    keyPasses,
    dribbles,
    ballsLost,
    recoveries,
    duelsWon,
    oldStats,
    raw,
    newStats,
    oldOvr,
    newOvr: calculateOVR(newStats)
  });

  return newStats;
}

function resetCardStats() {
  saveCardStats(mpBaseCardStats60());
  renderPlayerCardStats();
}

function rebuildCardStatsFromHistory() {
  saveCardStats(mpBaseCardStats60());

  const matches = typeof getMatches === "function" ? getMatches() : [];

  matches.forEach(match => {
    applyMatchUpgrades(match);
  });

  renderPlayerCardStats();
}

/* =========================================================
   STATS APP - NUOVE STATISTICHE, NIENTE PASSAGGI VECCHI
   ========================================================= */

function totals(matches = getMatches()) {
  const played = matches.length;

  const goals = sum(matches, "goals");
  const assists = sum(matches, "assists");
  const rating = sum(matches, "rating");

  const shots = sum(matches, "shots");
  const shotsOn = sum(matches, "shotsOn") + sum(matches, "shotsOnTarget");
  const keyPasses = sum(matches, "keyPasses");

  const dribbles =
    sum(matches, "dribblesCompleted") +
    sum(matches, "dribbles");

  const ballsLost = sum(matches, "ballsLost");
  const recoveries = sum(matches, "recoveries");
  const duelsWon = sum(matches, "duelsWon");

  return {
    played,
    goals,
    assists,
    rating,
    shots,
    shotsOn,
    keyPasses,
    dribbles,
    dribblesCompleted: dribbles,
    ballsLost,
    recoveries,
    duelsWon
  };
}

function trendMetric(match, key) {
  if (key === "rating") return num(match.rating);
  if (key === "goals") return num(match.goals);
  if (key === "assists") return num(match.assists);
  if (key === "shotsOnPct") {
    const shots = Math.max(num(match.shots), num(match.shotsOn), num(match.shotsOnTarget));
    const shotsOn = num(match.shotsOn) + num(match.shotsOnTarget);
    return shots > 0 ? pctValue(shotsOn, shots) : null;
  }
  if (key === "keyPasses") return num(match.keyPasses);
  if (key === "dribbles") return num(match.dribblesCompleted) + num(match.dribbles);
  if (key === "recoveries") return num(match.recoveries);
  if (key === "duelsWon") return num(match.duelsWon);
  if (key === "ballsLost") return num(match.ballsLost);

  return null;
}

function trendCharts(matches) {
  const ordered = [...matches].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  if (ordered.length < 2) {
    return `
      <div class="card trend-empty">
        <div class="card-title">
          <h3>Andamento</h3>
          <span>grafici</span>
        </div>
        <p>Salva almeno 2 partite per vedere i grafici dell’andamento.</p>
      </div>
    `;
  }

  const charts = [
    { key: "rating", title: "Voto personale", suffix: "/10" },
    { key: "goals", title: "Gol", suffix: "" },
    { key: "assists", title: "Assist", suffix: "" },
    { key: "shotsOnPct", title: "Precisione tiro", suffix: "%" },
    { key: "keyPasses", title: "Passaggi chiave", suffix: "" },
    { key: "dribbles", title: "Dribbling riusciti", suffix: "" },
    { key: "recoveries", title: "Recuperi", suffix: "" },
    { key: "duelsWon", title: "Duelli vinti", suffix: "" }
  ];

  return `
    <section class="section">
      <div class="card-title trend-title">
        <h3>Andamento prestazioni</h3>
        <span>partita dopo partita</span>
      </div>

      <div class="grid trend-grid">
        ${charts.map(chart => trendCard(ordered, chart)).join("")}
      </div>
    </section>
  `;
}

function matchCard(m) {
  return `<article class="card match-card" onclick="setRoute('detail','${m.id}')">
    <div class="card-title"><h3>${formatDate(m.date)}</h3><span>${m.outcome || ""}</span></div>
    <div class="match-meta">
      <span class="pill good">${num(m.goals)} G</span>
      <span class="pill">${num(m.assists)} A</span>
      <span class="pill">Voto ${m.rating || "—"}</span>
      <span class="pill">${m.role || "Ruolo —"}</span>
    </div>
    <div class="metric-list">
      ${metric("Tiri in porta", pct(num(m.shotsOn) + num(m.shotsOnTarget), Math.max(num(m.shots), num(m.shotsOn), num(m.shotsOnTarget))))}
      ${metric("Realizzazione", pct(m.goals, m.shots))}
      ${metric("Passaggi chiave", num(m.keyPasses))}
    </div>
  </article>`;
}

function renderDetail() {
  const m = getMatches().find(x => x.id === selectedMatchId);
  if (!m) {
    setRoute("history");
    return;
  }

  const shots = Math.max(num(m.shots), num(m.shotsOn), num(m.shotsOnTarget));
  const shotsOn = num(m.shotsOn) + num(m.shotsOnTarget);
  const missedShots = Math.max(0, shots - shotsOn);

  app.innerHTML = `<section class="section">
    <div class="card">
      <div class="card-title">
        <h3>${formatDate(m.date)}</h3>
        <span>${m.outcome || ""}</span>
      </div>
      <div class="match-meta">
        <span class="pill good">${m.result || "Risultato —"}</span>
        <span class="pill">${m.role || "Ruolo —"}</span>
        <span class="pill warn">Voto ${m.rating || "—"}</span>
      </div>
    </div>

    <div class="grid cards">
      <div class="card">
        <div class="card-title">
          <h3>Percentuali chiave</h3>
          <span>calcolate</span>
        </div>
        <div class="metric-list">
          ${metric("Precisione tiro", pct(shotsOn, shots))}
          ${bar(pctValue(shotsOn, shots))}
          ${metric("Realizzazione", pct(m.goals, shots))}
          ${bar(pctValue(m.goals, shots))}
          ${metric("Tiri fuori", missedShots)}
          ${metric("Palle perse", num(m.ballsLost))}
        </div>
      </div>

      ${detailSection("Attacco", [
        ["Gol", m.goals],
        ["Assist", m.assists],
        ["Tiri totali", shots],
        ["Tiri in porta", shotsOn],
        ["Tiri fuori", missedShots],
        ["Passaggi chiave", m.keyPasses]
      ])}

      ${detailSection("Tecnica", [
        ["Dribbling riusciti", num(m.dribblesCompleted) + num(m.dribbles)],
        ["Palle perse", m.ballsLost]
      ])}

      ${detailSection("Difesa e fisico", [
        ["Recuperi", m.recoveries],
        ["Duelli vinti", m.duelsWon]
      ])}

      ${m.notes ? `<div class="card"><div class="card-title"><h3>Note</h3></div><p style="color:var(--muted);line-height:1.5">${escapeHtml(m.notes)}</p></div>` : ""}

      <div class="actions detail-actions">
        <button class="secondary-btn" onclick="setRoute('history')">Storico</button>

        <button class="locker-publish-btn" onclick="publishMatchToLockerRoom('${m.id}')">
          Pubblica nello Spogliatoio
        </button>

        <button class="danger-btn" onclick="deleteMatch('${m.id}')">Elimina</button>
      </div>
    </div>
  </section>`;
}

function renderStats() {
  const matches = getMatches();
  const t = totals(matches);

  app.innerHTML = `<section class="section"><h2>Statistiche generali</h2>
    ${trendCharts(matches)}
    ${matches.length ? `<div class="grid-2 cards">
      ${statCard(t.played, "Partite")}
      ${statCard(t.goals, "Gol")}
      ${statCard(t.assists, "Assist")}
      ${statCard(avg(t.rating, t.played), "Media voto")}
    </div>

    <div class="grid cards">
      <div class="card">
        <div class="card-title"><h3>Medie partita</h3><span>totale</span></div>
        <div class="metric-list">
          ${metric("Gol a partita", avg(t.goals, t.played))}
          ${metric("Assist a partita", avg(t.assists, t.played))}
          ${metric("Tiri a partita", avg(t.shots, t.played))}
          ${metric("Tiri in porta a partita", avg(t.shotsOn, t.played))}
          ${metric("Passaggi chiave a partita", avg(t.keyPasses, t.played))}
          ${metric("Dribbling riusciti a partita", avg(t.dribbles, t.played))}
          ${metric("Recuperi a partita", avg(t.recoveries, t.played))}
          ${metric("Duelli vinti a partita", avg(t.duelsWon, t.played))}
          ${metric("Palle perse a partita", avg(t.ballsLost, t.played))}
        </div>
      </div>

      <div class="card">
        <div class="card-title"><h3>Percentuali totali</h3><span>aggregate</span></div>
        <div class="metric-list">
          ${metric("Precisione tiro", pct(t.shotsOn, t.shots))}
          ${bar(pctValue(t.shotsOn, t.shots))}
          ${metric("Realizzazione", pct(t.goals, t.shots))}
          ${bar(pctValue(t.goals, t.shots))}
        </div>
      </div>

      <div class="card">
        <div class="card-title"><h3>Ultime partite</h3><span>andamento</span></div>
        <div class="metric-list">
          ${[...matches]
            .sort((a,b)=>(b.date||"").localeCompare(a.date||""))
            .slice(0,5)
            .map(m => metric(formatDate(m.date), `G ${num(m.goals)} · A ${num(m.assists)} · V ${m.rating || "—"}`))
            .join("")}
        </div>
      </div>
    </div>` : `<div class="empty">Le statistiche appariranno dopo aver salvato almeno una partita.</div>`}
  </section>`;

  app.insertAdjacentHTML("beforeend", `
    <section class="section">
      <div class="card danger-zone">
        <div class="card-title">
          <h3>Impostazioni dati</h3>
          <span>gestione partite</span>
        </div>

        <div class="metric-list">
          <div class="metric">
            <span>Partite salvate</span>
            <strong>${matches.length}</strong>
          </div>
        </div>

        <button class="danger-btn full-btn" onclick="deleteAllMatches()">
          Elimina tutte le partite salvate
        </button>

        <p class="danger-note">
          Attenzione: questa azione cancella lo storico dal browser e non può essere annullata.
        </p>
      </div>
    </section>
  `);
}

window.applyMatchUpgrades = applyMatchUpgrades;
window.resetCardStats = resetCardStats;
window.rebuildCardStatsFromHistory = rebuildCardStatsFromHistory;
window.totals = totals;
window.trendMetric = trendMetric;
window.trendCharts = trendCharts;
window.matchCard = matchCard;
window.renderDetail = renderDetail;
window.renderStats = renderStats;

setTimeout(() => {
  rebuildCardStatsFromHistory();
  renderPlayerCardStats();
}, 0);

/* =========================================================
   MATCHPULSE PATCH - FIX TIRI IN PORTA DOPPI
   Incolla ALLA FINE di app.js
   ========================================================= */

function mpSafeShotsOn(match) {
  if (!match) return 0;

  // Nuovo campo ufficiale
  if (
    match.shotsOn !== undefined &&
    match.shotsOn !== null &&
    match.shotsOn !== ""
  ) {
    return num(match.shotsOn);
  }

  // Vecchio campo di compatibilità
  return num(match.shotsOnTarget);
}

function mpSafeShots(match) {
  if (!match) return 0;

  const total = num(match.shots);
  const onTarget = mpSafeShotsOn(match);

  // Se per errore i tiri totali sono minori dei tiri in porta, correggiamo.
  return Math.max(total, onTarget);
}

function mpSafeShotPct(match) {
  const shots = mpSafeShots(match);
  const shotsOn = mpSafeShotsOn(match);

  return shots > 0 ? pctValue(shotsOn, shots) : 0;
}

function totals(matches = getMatches()) {
  const played = matches.length;

  const goals = sum(matches, "goals");
  const assists = sum(matches, "assists");
  const rating = sum(matches, "rating");

  const shots = matches.reduce((acc, match) => acc + mpSafeShots(match), 0);
  const shotsOn = matches.reduce((acc, match) => acc + mpSafeShotsOn(match), 0);

  const keyPasses = sum(matches, "keyPasses");

  const dribbles =
    sum(matches, "dribblesCompleted") +
    sum(matches, "dribbles");

  const ballsLost = sum(matches, "ballsLost");
  const recoveries = sum(matches, "recoveries");
  const duelsWon = sum(matches, "duelsWon");

  return {
    played,
    goals,
    assists,
    rating,
    shots,
    shotsOn,
    keyPasses,
    dribbles,
    dribblesCompleted: dribbles,
    ballsLost,
    recoveries,
    duelsWon
  };
}

function trendMetric(match, key) {
  if (key === "rating") return num(match.rating);
  if (key === "goals") return num(match.goals);
  if (key === "assists") return num(match.assists);

  if (key === "shotsOnPct") {
    const shots = mpSafeShots(match);
    const shotsOn = mpSafeShotsOn(match);
    return shots > 0 ? pctValue(shotsOn, shots) : null;
  }

  if (key === "keyPasses") return num(match.keyPasses);
  if (key === "dribbles") return num(match.dribblesCompleted) + num(match.dribbles);
  if (key === "recoveries") return num(match.recoveries);
  if (key === "duelsWon") return num(match.duelsWon);
  if (key === "ballsLost") return num(match.ballsLost);

  return null;
}

function preMatchGoalValue(goal, match) {
  if (!match) return null;

  if (goal.key === "goals") return num(match.goals);
  if (goal.key === "assists") return num(match.assists);
  if (goal.key === "rating") return num(match.rating);
  if (goal.key === "shotsOn") return mpSafeShotsOn(match);
  if (goal.key === "keyPasses") return num(match.keyPasses);
  if (goal.key === "dribblesCompleted") return num(match.dribblesCompleted) + num(match.dribbles);
  if (goal.key === "recoveries") return num(match.recoveries);
  if (goal.key === "duelsWon") return num(match.duelsWon);
  if (goal.key === "ballsLost") return num(match.ballsLost);

  return 0;
}

function matchCard(m) {
  const shots = mpSafeShots(m);
  const shotsOn = mpSafeShotsOn(m);

  return `<article class="card match-card" onclick="setRoute('detail','${m.id}')">
    <div class="card-title"><h3>${formatDate(m.date)}</h3><span>${m.outcome || ""}</span></div>

    <div class="match-meta">
      <span class="pill good">${num(m.goals)} G</span>
      <span class="pill">${num(m.assists)} A</span>
      <span class="pill">Voto ${m.rating || "—"}</span>
      <span class="pill">${m.role || "Ruolo —"}</span>
    </div>

    <div class="metric-list">
      ${metric("Tiri in porta", pct(shotsOn, shots))}
      ${metric("Realizzazione", pct(m.goals, shots))}
      ${metric("Passaggi chiave", num(m.keyPasses))}
    </div>
  </article>`;
}

function renderDetail() {
  const m = getMatches().find(x => x.id === selectedMatchId);

  if (!m) {
    setRoute("history");
    return;
  }

  const shots = mpSafeShots(m);
  const shotsOn = mpSafeShotsOn(m);
  const missedShots = Math.max(0, shots - shotsOn);

  app.innerHTML = `<section class="section">
    <div class="card">
      <div class="card-title">
        <h3>${formatDate(m.date)}</h3>
        <span>${m.outcome || ""}</span>
      </div>

      <div class="match-meta">
        <span class="pill good">${m.result || "Risultato —"}</span>
        <span class="pill">${m.role || "Ruolo —"}</span>
        <span class="pill warn">Voto ${m.rating || "—"}</span>
      </div>
    </div>

    <div class="grid cards">
      <div class="card">
        <div class="card-title">
          <h3>Percentuali chiave</h3>
          <span>calcolate</span>
        </div>

        <div class="metric-list">
          ${metric("Precisione tiro", pct(shotsOn, shots))}
          ${bar(pctValue(shotsOn, shots))}
          ${metric("Realizzazione", pct(m.goals, shots))}
          ${bar(pctValue(m.goals, shots))}
          ${metric("Tiri fuori", missedShots)}
          ${metric("Palle perse", num(m.ballsLost))}
        </div>
      </div>

      ${detailSection("Attacco", [
        ["Gol", m.goals],
        ["Assist", m.assists],
        ["Tiri totali", shots],
        ["Tiri in porta", shotsOn],
        ["Tiri fuori", missedShots],
        ["Passaggi chiave", m.keyPasses]
      ])}

      ${detailSection("Tecnica", [
        ["Dribbling riusciti", num(m.dribblesCompleted) + num(m.dribbles)],
        ["Palle perse", m.ballsLost]
      ])}

      ${detailSection("Difesa e fisico", [
        ["Recuperi", m.recoveries],
        ["Duelli vinti", m.duelsWon]
      ])}

      ${m.notes ? `<div class="card"><div class="card-title"><h3>Note</h3></div><p style="color:var(--muted);line-height:1.5">${escapeHtml(m.notes)}</p></div>` : ""}

      <div class="actions detail-actions">
        <button class="secondary-btn" onclick="setRoute('history')">Storico</button>

        <button class="locker-publish-btn" onclick="publishMatchToLockerRoom('${m.id}')">
          Pubblica nello Spogliatoio
        </button>

        <button class="danger-btn" onclick="deleteMatch('${m.id}')">Elimina</button>
      </div>
    </div>
  </section>`;
}

function goalsPageRecords(matches) {
  if (!matches.length) {
    return `
      <section class="goals-page-card">
        <div class="goals-page-head">
          <div>
            <h3>Record personali</h3>
            <span>Nessuna partita salvata</span>
          </div>
          <strong>🏆</strong>
        </div>

        <p class="goals-empty">Salva almeno una partita per creare i tuoi record personali.</p>
      </section>
    `;
  }

  const records = [
    goalPageBestRecord(matches, "Miglior voto", "⭐", m => num(m.rating), "/10", 1),
    goalPageBestRecord(matches, "Più gol", "⚽", m => num(m.goals)),
    goalPageBestRecord(matches, "Più assist", "🎯", m => num(m.assists)),
    goalPageBestRecord(matches, "Più tiri in porta", "🚀", m => mpSafeShotsOn(m)),
    goalPageBestRecord(matches, "Miglior precisione tiro", "🎯", m => mpSafeShots(m) >= 3 ? mpSafeShotPct(m) : 0, "%", 0),
    goalPageBestRecord(matches, "Più passaggi chiave", "🧠", m => num(m.keyPasses)),
    goalPageBestRecord(matches, "Più dribbling", "🌀", m => num(m.dribblesCompleted) + num(m.dribbles)),
    goalPageBestRecord(matches, "Più recuperi", "🧱", m => num(m.recoveries)),
    goalPageBestRecord(matches, "Più duelli vinti", "💪", m => num(m.duelsWon))
  ].filter(Boolean);

  return `
    <section class="goals-page-card">
      <div class="goals-page-head">
        <div>
          <h3>Record personali</h3>
          <span>I tuoi picchi migliori in partita</span>
        </div>
        <strong>🏆</strong>
      </div>

      <div class="goal-records-grid">
        ${records.join("")}
      </div>
    </section>
  `;
}

window.mpSafeShotsOn = mpSafeShotsOn;
window.mpSafeShots = mpSafeShots;
window.mpSafeShotPct = mpSafeShotPct;
window.totals = totals;
window.trendMetric = trendMetric;
window.preMatchGoalValue = preMatchGoalValue;
window.matchCard = matchCard;
window.renderDetail = renderDetail;
window.goalsPageRecords = goalsPageRecords;

setTimeout(() => {
  if (route === "detail") {
    renderDetail();
  } else if (route === "history") {
    renderHistory();
  } else if (route === "stats") {
    renderStats();
  } else if (route === "goals") {
    renderGoalsPage();
  } else {
    render();
    renderPlayerCardStats();
  }
}, 0)

/* =========================================================
   MATCHPULSE PATCH - OVR CONSERVATIVO
   L'OVR sale solo quando la media arriva davvero al punto pieno
   ========================================================= */

function calculateOVR(stats) {
  const pac = Number(stats.pac) || 60;
  const sho = Number(stats.sho) || 60;
  const pas = Number(stats.pas) || 60;
  const dri = Number(stats.dri) || 60;
  const def = Number(stats.def) || 60;
  const phy = Number(stats.phy) || 60;

  const average = (pac + sho + pas + dri + def + phy) / 6;

  return Math.floor(average);
}

window.calculateOVR = calculateOVR;

setTimeout(() => {
  rebuildCardStatsFromHistory();
  renderPlayerCardStats();

  if (route === "home") {
    render();
    renderPlayerCardStats();
  }
}, 0);

/* =========================================================
   MATCHPULSE - SISTEMA GENERALE PLAYSTYLES
   ========================================================= */

const MP_PS_STORAGE_KEY = "matchpulse_playstyles_v1";

/*
  Sblocco slot:
  PS normali: massimo 8
  PS+: massimo 3
*/

const MP_PS_NORMAL_THRESHOLDS = [
  60,
  65,
  70,
  74,
  78,
  82,
  86,
  90
];

const MP_PS_PLUS_THRESHOLDS = [
  70,
  80,
  90
];


/* =========================================================
   CATEGORIE PLAYSTYLE
   Per aggiungere una categoria in futuro basta inserirla qui.
   Nessuna categoria Portiere.
   ========================================================= */

const MP_PS_CATEGORIES = [
  {
    id: "shooting",
    eyebrow: "FINALIZZAZIONE",
    title: "TIRO"
  },

  {
    id: "passing",
    eyebrow: "CREAZIONE",
    title: "PASSAGGIO"
  },
  
  {
  id: "defending",
  eyebrow: "PROTEZIONE",
  title: "DIFESA"
  },

  {
  id: "ballControl",
  eyebrow: "TECNICA E MOVIMENTO",
  title: "CONTROLLO PALLA"
  },

  {
  id: "physical",
  eyebrow: "FORZA E RESISTENZA",
  title: "FISICO"
  }
];


/* =========================================================
   CATALOGO GENERALE PLAYSTYLES
   ========================================================= */

const MP_PLAYSTYLES = [
  {
    id: "finesseShot",
    name: "Tiro a giro",
    category: "shooting",
    normalIcon: "assets/playstyles/finesse-shot-normal.png",
    plusIcon: "assets/playstyles/finesse-shot-plus.png"
  },

  {
    id: "deadBall",
    name: "Palle inattive",
    category: "shooting",
    normalIcon: "assets/playstyles/dead-ball-normal.png",
    plusIcon: "assets/playstyles/dead-ball-plus.png"
  },

  {
    id: "chipShot",
    name: "Pallonetto",
    category: "shooting",
    normalIcon: "assets/playstyles/chip-shot-normal.png",
    plusIcon: "assets/playstyles/chip-shot-plus.png"
  },

  {
    id: "acrobatic",
    name: "Acrobata",
    category: "shooting",
    normalIcon: "assets/playstyles/acrobatic-normal.png",
    plusIcon: "assets/playstyles/acrobatic-plus.png"
  },

  {
    id: "gamechanger",
    name: "Funambolo",
    category: "shooting",
    normalIcon: "assets/playstyles/gamechanger-normal.png",
    plusIcon: "assets/playstyles/gamechanger-plus.png"
  },

  {
    id: "powerShot",
    name: "Tiro potente",
    category: "shooting",
    normalIcon: "assets/playstyles/power-shot-normal.png",
    plusIcon: "assets/playstyles/power-shot-plus.png"
  },

  {
    id: "precisionHeader",
    name: "Forte di testa",
    category: "shooting",
    normalIcon: "assets/playstyles/precision-header-normal.png",
    plusIcon: "assets/playstyles/precision-header-plus.png"
  },

  {
    id: "lowDriven",
    name: "Tiro rasoterra",
    category: "shooting",
    normalIcon: "assets/playstyles/low-driven-normal.png",
    plusIcon: "assets/playstyles/low-driven-plus.png"
  },

  {
  id: "inventive",
  name: "Fantasia",
  category: "passing",
  normalIcon: "assets/playstyles/inventive-normal.png",
  plusIcon: "assets/playstyles/inventive-plus.png"
},

{
  id: "incisivePass",
  name: "Passaggio incisivo",
  category: "passing",
  normalIcon: "assets/playstyles/incisive-pass-normal.png",
  plusIcon: "assets/playstyles/incisive-pass-plus.png"
},

{
  id: "pingedPass",
  name: "Passaggio calibrato",
  category: "passing",
  normalIcon: "assets/playstyles/pinged-pass-normal.png",
  plusIcon: "assets/playstyles/pinged-pass-plus.png"
},

{
  id: "longBallPass",
  name: "Passaggio lungo",
  category: "passing",
  normalIcon: "assets/playstyles/long-ball-pass-normal.png",
  plusIcon: "assets/playstyles/long-ball-pass-plus.png"
},

{
  id: "tikiTaka",
  name: "Tiki Taka",
  category: "passing",
  normalIcon: "assets/playstyles/tiki-taka-normal.png",
  plusIcon: "assets/playstyles/tiki-taka-plus.png"
},

{
  id: "whippedPass",
  name: "Passaggio teso",
  category: "passing",
  normalIcon: "assets/playstyles/whipped-pass-normal.png",
  plusIcon: "assets/playstyles/whipped-pass-plus.png"
},

{
  id: "jockey",
  name: "Affronta",
  category: "defending",
  normalIcon: "assets/playstyles/jockey-normal.png",
  plusIcon: "assets/playstyles/jockey-plus.png"
},

{
  id: "block",
  name: "Blocco",
  category: "defending",
  normalIcon: "assets/playstyles/block-normal.png",
  plusIcon: "assets/playstyles/block-plus.png"
},

{
  id: "intercept",
  name: "Intercetto",
  category: "defending",
  normalIcon: "assets/playstyles/intercept-normal.png",
  plusIcon: "assets/playstyles/intercept-plus.png"
},

{
  id: "anticipate",
  name: "Procione",
  category: "defending",
  normalIcon: "assets/playstyles/anticipate-normal.png",
  plusIcon: "assets/playstyles/anticipate-plus.png"
},

{
  id: "slideTackle",
  name: "Scivolata",
  category: "defending",
  normalIcon: "assets/playstyles/slide-tackle-normal.png",
  plusIcon: "assets/playstyles/slide-tackle-plus.png"
},

{
  id: "aerialFortress",
  name: "Forte di testa",
  category: "defending",
  normalIcon: "assets/playstyles/aerial-fortress-normal.png",
  plusIcon: "assets/playstyles/aerial-fortress-plus.png"
},

{
  id: "firstTouch",
  name: "Primo controllo",
  category: "ballControl",
  normalIcon: "assets/playstyles/first-touch-normal.png",
  plusIcon: "assets/playstyles/first-touch-plus.png"
},

{
  id: "pressProven",
  name: "A prova di pressing",
  category: "ballControl",
  normalIcon: "assets/playstyles/press-proven-normal.png",
  plusIcon: "assets/playstyles/press-proven-plus.png"
},

{
  id: "rapid",
  name: "Rapido",
  category: "ballControl",
  normalIcon: "assets/playstyles/rapid-normal.png",
  plusIcon: "assets/playstyles/rapid-plus.png"
},

{
  id: "technical",
  name: "Tecnico",
  category: "ballControl",
  normalIcon: "assets/playstyles/technical-normal.png",
  plusIcon: "assets/playstyles/technical-plus.png"
},

{
  id: "trickster",
  name: "Illusionista",
  category: "ballControl",
  normalIcon: "assets/playstyles/trickster-normal.png",
  plusIcon: "assets/playstyles/trickster-plus.png"
},

{
  id: "bruiser",
  name: "Mastino",
  category: "physical",
  normalIcon: "assets/playstyles/bruiser-normal.png",
  plusIcon: "assets/playstyles/bruiser-plus.png"
},

{
  id: "enforcer",
  name: "Solidità",
  category: "physical",
  normalIcon: "assets/playstyles/enforcer-normal.png",
  plusIcon: "assets/playstyles/enforcer-plus.png"
},

{
  id: "quickStep",
  name: "Passo veloce",
  category: "physical",
  normalIcon: "assets/playstyles/quick-step-normal.png",
  plusIcon: "assets/playstyles/quick-step-plus.png"
},

{
  id: "relentless",
  name: "Inesauribile",
  category: "physical",
  normalIcon: "assets/playstyles/relentless-normal.png",
  plusIcon: "assets/playstyles/relentless-plus.png"
},

];


/* =========================================================
   RICERCA PLAYSTYLE
   ========================================================= */

function mpGetPlayStyle(playStyleId) {
  return MP_PLAYSTYLES.find(
    playStyle => playStyle.id === playStyleId
  ) || null;
}


/* =========================================================
   SALVATAGGIO PLAYSTYLES
   ========================================================= */

function mpGetPsData() {
  let saved = {};

  try {
    saved = JSON.parse(
      localStorage.getItem(MP_PS_STORAGE_KEY) || "{}"
    );
  } catch (error) {
    saved = {};
  }

  /*
  Migrazione dei vecchi nomi:
  evita di perdere eventuali PlayStyle già selezionati.
*/

if (saved.trivela && !saved.gamechanger) {
  saved.gamechanger = saved.trivela;
}

if (saved.powerHeader && !saved.precisionHeader) {
  saved.precisionHeader = saved.powerHeader;
}

  const data = {};

  MP_PLAYSTYLES.forEach(playStyle => {
    const savedState = saved[playStyle.id];

    data[playStyle.id] =
      savedState === "normal" || savedState === "plus"
        ? savedState
        : "none";
  });

  return data;
}

function mpSavePsData(data) {
  localStorage.setItem(
    MP_PS_STORAGE_KEY,
    JSON.stringify(data)
  );
}


/* =========================================================
   SLOT SBLOCCATI DALL'OVR
   ========================================================= */

function mpNormalPsSlots(ovr) {
  return MP_PS_NORMAL_THRESHOLDS.filter(
    threshold => ovr >= threshold
  ).length;
}

function mpPlusPsSlots(ovr) {
  return MP_PS_PLUS_THRESHOLDS.filter(
    threshold => ovr >= threshold
  ).length;
}

function mpCurrentCardOvr() {
  return calculateOVR(getCardStats());
}


/* =========================================================
   PLAYSTYLES EQUIPAGGIATI
   ========================================================= */

function mpEquippedPlayStyles(kind, data = mpGetPsData()) {
  return MP_PLAYSTYLES.filter(
    playStyle => data[playStyle.id] === kind
  );
}

function mpCountOtherPlayStyles(data, playStyleId, kind) {
  return MP_PLAYSTYLES.filter(
    playStyle =>
      playStyle.id !== playStyleId &&
      data[playStyle.id] === kind
  ).length;
}


/* =========================================================
   SLOT VISIBILI
   ========================================================= */

function mpPsSlotRow(kind, data, ovr) {
  const isNormal = kind === "normal";

  const thresholds = isNormal
    ? MP_PS_NORMAL_THRESHOLDS
    : MP_PS_PLUS_THRESHOLDS;

  const unlockedSlots = isNormal
    ? mpNormalPsSlots(ovr)
    : mpPlusPsSlots(ovr);

  const equippedPlayStyles = mpEquippedPlayStyles(
    kind,
    data
  );

  return thresholds.map((threshold, index) => {
    const unlocked = index < unlockedSlots;
    const playStyle = equippedPlayStyles[index] || null;
    const equipped = unlocked && Boolean(playStyle);

    let slotContent = "";

    if (equipped) {
      const icon = isNormal
        ? playStyle.normalIcon
        : playStyle.plusIcon;

      slotContent = `
        <img
          src="${escapeHtml(icon)}"
          alt="${escapeHtml(playStyle.name)}"
        >
      `;
    } else if (unlocked) {
      slotContent = `
        <span class="ps-empty-slot"></span>
      `;
    } else {
      slotContent = `
        <b>${threshold}</b>
      `;
    }

    return `
      <div
        class="
          ps-slot
          ps-slot-${kind}
          ${unlocked ? "unlocked" : "locked"}
          ${equipped ? "equipped" : ""}
        "
      >
        ${slotContent}
      </div>
    `;
  }).join("");
}


/* =========================================================
   TESTO STATO
   ========================================================= */

function mpPsStateLabel(state) {
  if (state === "normal") {
    return "PS normale";
  }

  if (state === "plus") {
    return "PS+";
  }

  return "Non selezionato";
}


/* =========================================================
   SINGOLO ELEMENTO PLAYSTYLE
   ========================================================= */

function mpRenderPlayStyleItem(playStyle, data) {
  const state = data[playStyle.id] || "none";

  const displayedIcon =
    state === "plus"
      ? playStyle.plusIcon
      : playStyle.normalIcon;

  return `
    <button
      type="button"
      class="ps-item ps-state-${state}"
      onclick="mpOpenPsSelector('${playStyle.id}')"
    >
      <div class="ps-item-icon">
        <img
          src="${escapeHtml(displayedIcon)}"
          alt="${escapeHtml(playStyle.name)}"
        >
      </div>

      <strong>${escapeHtml(playStyle.name)}</strong>

      <small>
        ${mpPsStateLabel(state)}
      </small>
    </button>
  `;
}


/* =========================================================
   SINGOLA CATEGORIA
   ========================================================= */

function mpRenderPlayStyleCategory(category, data) {
  const playStyles = MP_PLAYSTYLES.filter(
    playStyle => playStyle.category === category.id
  );

  if (!playStyles.length) {
    return "";
  }

  return `
    <section class="ps-category-card">

      <div class="ps-category-header">
        <span>${escapeHtml(category.eyebrow)}</span>
        <h3>${escapeHtml(category.title)}</h3>
      </div>

      <div
        class="ps-category-scroll"
        id="ps-scroll-${category.id}"
      >
        ${playStyles.map(
          playStyle => mpRenderPlayStyleItem(
            playStyle,
            data
          )
        ).join("")}
      </div>

    </section>
  `;
}

function mpEnablePlayStyleDragScroll() {
  const scrollers = document.querySelectorAll(
    ".ps-category-scroll"
  );

  scrollers.forEach(scroller => {
    if (scroller.dataset.dragReady === "true") {
      return;
    }

    scroller.dataset.dragReady = "true";

    let isPressed = false;
    let isDragging = false;
    let suppressClick = false;

    let startX = 0;
    let initialScrollLeft = 0;

    scroller.addEventListener("pointerdown", event => {
      /*
        Lo scorrimento manuale serve soltanto al mouse.
        Su telefono lasciamo il comportamento nativo.
      */
      if (
        event.pointerType !== "mouse" ||
        event.button !== 0
      ) {
        return;
      }

      isPressed = true;
      isDragging = false;
      suppressClick = false;

      startX = event.clientX;
      initialScrollLeft = scroller.scrollLeft;
    });

    scroller.addEventListener("pointermove", event => {
      if (!isPressed) {
        return;
      }

      const distance = event.clientX - startX;

      /*
        Finché il mouse si muove poco, viene considerato
        un normale clic sul PlayStyle.
      */
      if (!isDragging && Math.abs(distance) < 7) {
        return;
      }

      isDragging = true;
      suppressClick = true;

      scroller.classList.add("is-dragging");

      scroller.scrollLeft =
        initialScrollLeft - distance;

      event.preventDefault();
    });

    function finishDrag() {
      if (!isPressed) {
        return;
      }

      isPressed = false;
      isDragging = false;

      scroller.classList.remove("is-dragging");

      /*
        Lascia suppressClick attivo fino all'eventuale click
        generato subito dopo il trascinamento.
      */
      setTimeout(() => {
        suppressClick = false;
      }, 0);
    }

    scroller.addEventListener("pointerup", finishDrag);
    scroller.addEventListener("pointercancel", finishDrag);
    scroller.addEventListener("pointerleave", finishDrag);

    scroller.addEventListener(
      "click",
      event => {
        /*
          Blocca il clic solamente quando hai davvero trascinato.
          Un normale clic o tap continua ad aprire il PlayStyle.
        */
        if (!suppressClick) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        suppressClick = false;
      },
      true
    );
  });
}


/* =========================================================
   PAGINA PLAYSTYLES
   ========================================================= */

function renderPlayStyles() {
  const ovr = mpCurrentCardOvr();
  const data = mpGetPsData();

  const normalEquipped = mpEquippedPlayStyles(
    "normal",
    data
  ).length;

  const plusEquipped = mpEquippedPlayStyles(
    "plus",
    data
  ).length;

  const normalSlots = mpNormalPsSlots(ovr);
  const plusSlots = mpPlusPsSlots(ovr);

  app.innerHTML = `
    <section class="section ps-page">

      <div class="ps-page-header">

        <button
          type="button"
          class="ghost-btn"
          onclick="setRoute('home')"
        >
          ← Home
        </button>

        <div class="ps-page-title">
          <span>GESTIONE GIOCATORE</span>
          <h2>PlayStyles</h2>
        </div>

        <div class="ps-page-ovr">
          <span>OVR</span>
          <strong>${ovr}</strong>
        </div>

      </div>


      <section class="ps-loadout-card">

        <div class="ps-loadout-group">

          <div class="ps-loadout-title">
            <span>
              PS NORMALI · ${normalEquipped}/${normalSlots}
            </span>
          </div>

          <div class="ps-slot-row ps-normal-row">
            ${mpPsSlotRow("normal", data, ovr)}
          </div>

        </div>


        <div class="ps-loadout-group">

          <div class="ps-loadout-title">
            <span>
              PLAYSTYLE+ · ${plusEquipped}/${plusSlots}
            </span>
          </div>

          <div class="ps-slot-row ps-plus-row">
            ${mpPsSlotRow("plus", data, ovr)}
          </div>

        </div>

      </section>


      ${MP_PS_CATEGORIES.map(
        category => mpRenderPlayStyleCategory(
          category,
          data
        )
      ).join("")}

    </section>
  `;

  requestAnimationFrame(() => {
    mpEnablePlayStyleDragScroll();
  });
}



/* =========================================================
   TESTO DISPONIBILITÀ SELETTORE
   ========================================================= */

function mpPsSelectionText(
  kind,
  currentState,
  ovr,
  otherEquipped
) {
  const isNormal = kind === "normal";

  const requiredOvr = isNormal ? 60 : 70;

  const availableSlots = isNormal
    ? mpNormalPsSlots(ovr)
    : mpPlusPsSlots(ovr);

  if (currentState === kind) {
    return "Selezionato";
  }

  if (ovr < requiredOvr) {
    return `Richiede ${requiredOvr} OVR`;
  }

  if (otherEquipped >= availableSlots) {
    return "Slot pieni";
  }

  return "Seleziona";
}


/* =========================================================
   MENU DI SELEZIONE GENERICO
   ========================================================= */

function mpOpenPsSelector(playStyleId) {
  mpClosePsSelector();

  const playStyle = mpGetPlayStyle(playStyleId);

  if (!playStyle) {
    toast("PlayStyle non trovato");
    return;
  }

  const data = mpGetPsData();
  const ovr = mpCurrentCardOvr();
  const currentState = data[playStyle.id] || "none";

  const normalSlots = mpNormalPsSlots(ovr);
  const plusSlots = mpPlusPsSlots(ovr);

  const otherNormalPs = mpCountOtherPlayStyles(
    data,
    playStyle.id,
    "normal"
  );

  const otherPlusPs = mpCountOtherPlayStyles(
    data,
    playStyle.id,
    "plus"
  );

  const normalAvailable =
    currentState === "normal" ||
    (
      normalSlots > 0 &&
      otherNormalPs < normalSlots
    );

  const plusAvailable =
    currentState === "plus" ||
    (
      plusSlots > 0 &&
      otherPlusPs < plusSlots
    );

  const category =
    MP_PS_CATEGORIES.find(
      item => item.id === playStyle.category
    );

  const categoryName = category
    ? category.title
    : "PLAYSTYLE";

  const normalText = mpPsSelectionText(
    "normal",
    currentState,
    ovr,
    otherNormalPs
  );

  const plusText = mpPsSelectionText(
    "plus",
    currentState,
    ovr,
    otherPlusPs
  );

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div
        class="ps-selector-overlay"
        onclick="mpClosePsSelector()"
      >
        <div
          class="ps-selector-sheet"
          onclick="event.stopPropagation()"
        >
          <div class="ps-selector-handle"></div>

          <div class="ps-selector-title">

            <img
              src="${escapeHtml(playStyle.normalIcon)}"
              alt="${escapeHtml(playStyle.name)}"
            >

            <div>
              <span>${escapeHtml(categoryName)}</span>
              <h3>${escapeHtml(playStyle.name)}</h3>
            </div>

          </div>


          <div class="ps-selector-actions">

            <button
              type="button"
              class="
                ps-select-normal
                ${normalAvailable ? "" : "locked"}
                ${currentState === "normal" ? "selected" : ""}
              "
              onclick="
                mpSetPlayStyle(
                  '${playStyle.id}',
                  'normal'
                )
              "
            >
              <img
                src="${escapeHtml(playStyle.normalIcon)}"
                alt=""
              >

              <span>
                <strong>PS normale</strong>
                <small>${normalText}</small>
              </span>
            </button>


            <button
              type="button"
              class="
                ps-select-plus
                ${plusAvailable ? "" : "locked"}
                ${currentState === "plus" ? "selected" : ""}
              "
              onclick="
                mpSetPlayStyle(
                  '${playStyle.id}',
                  'plus'
                )
              "
            >
              <img
                src="${escapeHtml(playStyle.plusIcon)}"
                alt=""
              >

              <span>
                <strong>PlayStyle+</strong>
                <small>${plusText}</small>
              </span>
            </button>


            <button
              type="button"
              class="ps-select-remove"
              onclick="
                mpSetPlayStyle(
                  '${playStyle.id}',
                  'none'
                )
              "
            >
              Rimuovi PS
            </button>

          </div>
        </div>
      </div>
    `
  );
}

function mpClosePsSelector() {
  const overlay = document.querySelector(
    ".ps-selector-overlay"
  );

  if (overlay) {
    overlay.remove();
  }
}


/* =========================================================
   SELEZIONE GENERICA PLAYSTYLE
   ========================================================= */

function mpSetPlayStyle(playStyleId, nextState) {
  const validStates = [
    "none",
    "normal",
    "plus"
  ];

  if (!validStates.includes(nextState)) {
    return;
  }

  const playStyle = mpGetPlayStyle(playStyleId);

  if (!playStyle) {
    toast("PlayStyle non trovato");
    return;
  }

  const data = mpGetPsData();
  const ovr = mpCurrentCardOvr();
  const currentState = data[playStyle.id] || "none";

  if (currentState === nextState) {
    mpClosePsSelector();
    toast(`${playStyle.name} è già selezionato`);
    return;
  }

  if (nextState === "normal") {
    const availableSlots = mpNormalPsSlots(ovr);

    const otherNormalPs = mpCountOtherPlayStyles(
      data,
      playStyle.id,
      "normal"
    );

    if (availableSlots === 0) {
      toast(
        "Il primo PS normale si sblocca a 60 OVR"
      );
      return;
    }

    if (otherNormalPs >= availableSlots) {
      toast(
        "Non hai altri slot PS normali disponibili"
      );
      return;
    }
  }

  if (nextState === "plus") {
    const availableSlots = mpPlusPsSlots(ovr);

    const otherPlusPs = mpCountOtherPlayStyles(
      data,
      playStyle.id,
      "plus"
    );

    if (availableSlots === 0) {
      toast(
        "Il primo PS+ si sblocca a 70 OVR"
      );
      return;
    }

    if (otherPlusPs >= availableSlots) {
      toast(
        "Non hai altri slot PS+ disponibili"
      );
      return;
    }
  }

  data[playStyle.id] = nextState;

  mpSavePsData(data);
  mpClosePsSelector();
  renderPlayStyles();

  if (nextState === "normal") {
    toast(`${playStyle.name} selezionato`);
  } else if (nextState === "plus") {
    toast(`${playStyle.name} trasformato in PS+`);
  } else {
    toast(`${playStyle.name} rimosso`);
  }
}


/* =========================================================
   PS+ MOSTRATI SULLA CARTA
   Sovrascrive la vecchia funzione dedicata solo al Tiro a giro.
   ========================================================= */

mpGetCardPlusIcons = function () {
  const data = mpGetPsData();

  return MP_PLAYSTYLES
    .filter(
      playStyle => data[playStyle.id] === "plus"
    )
    .slice(0, 3)
    .map(playStyle => ({
      name: `${playStyle.name}+`,
      src: playStyle.plusIcon
    }));
};


/* =========================================================
   AGGIUNGE PLAYSTYLES ALLA HOME
   ========================================================= */

const mpOriginalRenderHomeForPs = renderHome;

renderHome = function () {
  mpOriginalRenderHomeForPs();

  const actionGrid = document.querySelector(
    ".home-action-grid"
  );

  if (!actionGrid) {
    return;
  }

  actionGrid.insertAdjacentHTML(
    "beforeend",
    `
      <button
        type="button"
        class="home-action-tile orange ps-home-tile"
        onclick="setRoute('playstyles')"
      >
        <div class="action-icon">◇</div>

        <div class="action-text">
          <strong>PLAYSTYLES</strong>
          <span>GESTISCI PS</span>
        </div>
      </button>
    `
  );
};


/* =========================================================
   AGGIUNGE LA ROUTE PLAYSTYLES
   ========================================================= */

const mpOriginalRenderForPs = render;

render = function () {
  if (route === "playstyles") {
    renderPlayStyles();
    return;
  }

  mpOriginalRenderForPs();
};


/* =========================================================
   FUNZIONI DISPONIBILI NEGLI ONCLICK HTML
   ========================================================= */

window.renderPlayStyles = renderPlayStyles;
window.mpOpenPsSelector = mpOpenPsSelector;
window.mpClosePsSelector = mpClosePsSelector;
window.mpSetPlayStyle = mpSetPlayStyle;


/* aggiorna subito la Home dopo il caricamento */

if (route === "home") {
  render();
}

setTimeout(() => {
  mpSyncTopProfileButton();
}, 0);

/* =========================================================
   MATCHPULSE
   CONSIGLI PLAYSTYLE + SCORRIMENTO FLUIDO
   ========================================================= */

const MP_PS_REC_IGNORED_KEY =
  "matchpulse_ps_recommendations_ignored_v1";

const MP_PS_RECENT_MATCH_LIMIT = 8;
const MP_PS_RECOMMENDATION_LIMIT = 4;


/* =========================================================
   REGOLE DEI PLAYSTYLE

   weights:
   caratteristiche che rendono il PS consigliabile.

   goalWeight:
   importanza dei gol per quel PS.

   assistWeight:
   importanza degli assist per quel PS.

   preferredRoles:
   ruoli con maggiore affinità.
   ========================================================= */

const MP_PS_RECOMMENDATION_RULES = {

  /* TIRO */

  finesseShot: {
    weights: {
      sho: 1.25,
      dri: 0.25
    },
    goalWeight: 1.00,
    assistWeight: 0.05,
    preferredRoles: [
      "ATT",
      "ALA",
      "COC"
    ]
  },

  deadBall: {
    weights: {
      sho: 0.85,
      pas: 0.45
    },
    goalWeight: 0.40,
    assistWeight: 0.15,
    preferredRoles: [
      "ATT",
      "COC",
      "CC"
    ],
    confidence: 0.88
  },

  chipShot: {
    weights: {
      sho: 1.00,
      dri: 0.35
    },
    goalWeight: 0.75,
    assistWeight: 0.05,
    preferredRoles: [
      "ATT",
      "ALA",
      "COC"
    ]
  },

  acrobatic: {
    weights: {
      sho: 0.90,
      phy: 0.45
    },
    goalWeight: 0.70,
    assistWeight: 0.00,
    preferredRoles: [
      "ATT"
    ]
  },

  gamechanger: {
    weights: {
      sho: 0.85,
      dri: 0.65
    },
    goalWeight: 0.70,
    assistWeight: 0.10,
    preferredRoles: [
      "ATT",
      "ALA",
      "COC"
    ]
  },

  powerShot: {
    weights: {
      sho: 1.30,
      phy: 0.30
    },
    goalWeight: 1.10,
    assistWeight: 0.00,
    preferredRoles: [
      "ATT",
      "ALA",
      "COC",
      "CC"
    ]
  },

  precisionHeader: {
    weights: {
      sho: 0.75,
      phy: 0.75
    },
    goalWeight: 0.75,
    assistWeight: 0.00,
    preferredRoles: [
      "ATT",
      "DC"
    ],
    confidence: 0.90
  },

  lowDriven: {
    weights: {
      sho: 1.30,
      dri: 0.15
    },
    goalWeight: 1.15,
    assistWeight: 0.00,
    preferredRoles: [
      "ATT",
      "ALA",
      "COC"
    ]
  },


  /* PASSAGGIO */

  inventive: {
    weights: {
      pas: 1.20,
      dri: 0.55
    },
    goalWeight: 0.00,
    assistWeight: 1.05,
    preferredRoles: [
      "COC",
      "CC",
      "ALA"
    ]
  },

  incisivePass: {
    weights: {
      pas: 1.40,
      dri: 0.20
    },
    goalWeight: 0.00,
    assistWeight: 1.20,
    preferredRoles: [
      "COC",
      "CC",
      "CDC",
      "DC"
    ]
  },

  pingedPass: {
    weights: {
      pas: 1.25,
      phy: 0.15
    },
    goalWeight: 0.00,
    assistWeight: 0.75,
    preferredRoles: [
      "CC",
      "CDC",
      "DC",
      "TERZINO"
    ]
  },

  longBallPass: {
    weights: {
      pas: 1.25,
      def: 0.25
    },
    goalWeight: 0.00,
    assistWeight: 0.90,
    preferredRoles: [
      "CDC",
      "DC",
      "TERZINO"
    ]
  },

  tikiTaka: {
    weights: {
      pas: 1.05,
      dri: 0.55
    },
    goalWeight: 0.00,
    assistWeight: 0.90,
    preferredRoles: [
      "COC",
      "CC",
      "CDC",
      "ALA"
    ]
  },

  whippedPass: {
    weights: {
      pas: 1.05,
      pac: 0.35
    },
    goalWeight: 0.00,
    assistWeight: 0.75,
    preferredRoles: [
      "ALA",
      "TERZINO"
    ],
    confidence: 0.90
  },


  /* DIFESA */

  jockey: {
    weights: {
      def: 1.10,
      pac: 0.55
    },
    goalWeight: 0.00,
    assistWeight: 0.00,
    preferredRoles: [
      "CDC",
      "DC",
      "TERZINO"
    ]
  },

  block: {
    weights: {
      def: 1.30,
      phy: 0.25
    },
    goalWeight: 0.00,
    assistWeight: 0.00,
    preferredRoles: [
      "DC",
      "CDC"
    ]
  },

  intercept: {
    weights: {
      def: 1.30,
      pas: 0.25
    },
    goalWeight: 0.00,
    assistWeight: 0.10,
    preferredRoles: [
      "CDC",
      "DC",
      "CC"
    ]
  },

  anticipate: {
    weights: {
      def: 1.25,
      pac: 0.35
    },
    goalWeight: 0.00,
    assistWeight: 0.00,
    preferredRoles: [
      "DC",
      "CDC",
      "TERZINO"
    ]
  },

  slideTackle: {
    weights: {
      def: 1.00,
      phy: 0.45
    },
    goalWeight: 0.00,
    assistWeight: 0.00,
    preferredRoles: [
      "DC",
      "CDC",
      "TERZINO"
    ],
    confidence: 0.88
  },


  /* CONTROLLO PALLA */

  firstTouch: {
    weights: {
      dri: 1.20,
      pas: 0.30
    },
    goalWeight: 0.10,
    assistWeight: 0.25,
    preferredRoles: [
      "ATT",
      "ALA",
      "COC",
      "CC"
    ]
  },

  pressProven: {
    weights: {
      dri: 0.90,
      phy: 0.85
    },
    goalWeight: 0.10,
    assistWeight: 0.10,
    preferredRoles: [
      "ATT",
      "COC",
      "CC",
      "CDC"
    ]
  },

  rapid: {
    weights: {
      pac: 1.05,
      dri: 0.85
    },
    goalWeight: 0.20,
    assistWeight: 0.15,
    preferredRoles: [
      "ATT",
      "ALA",
      "COC"
    ]
  },

  technical: {
    weights: {
      dri: 1.35,
      pas: 0.25
    },
    goalWeight: 0.10,
    assistWeight: 0.20,
    preferredRoles: [
      "ALA",
      "COC",
      "CC",
      "ATT"
    ]
  },

  trickster: {
    weights: {
      dri: 1.55
    },
    goalWeight: 0.10,
    assistWeight: 0.10,
    preferredRoles: [
      "ALA",
      "COC",
      "ATT"
    ]
  },


  /* FISICO */

  bruiser: {
    weights: {
      phy: 1.15,
      def: 0.65
    },
    goalWeight: 0.05,
    assistWeight: 0.00,
    preferredRoles: [
      "DC",
      "CDC",
      "ATT"
    ]
  },

  enforcer: {
    weights: {
      phy: 1.25,
      def: 0.55
    },
    goalWeight: 0.00,
    assistWeight: 0.00,
    preferredRoles: [
      "DC",
      "CDC",
      "CC"
    ]
  },

  quickStep: {
    weights: {
      pac: 1.35,
      dri: 0.30
    },
    goalWeight: 0.20,
    assistWeight: 0.10,
    preferredRoles: [
      "ATT",
      "ALA",
      "TERZINO"
    ]
  },

  relentless: {
    weights: {
      phy: 0.95,
      pac: 0.85
    },
    goalWeight: 0.05,
    assistWeight: 0.05,
    preferredRoles: [
      "ALA",
      "CC",
      "CDC",
      "TERZINO"
    ]
  }
};


/* =========================================================
   STRUMENTI GENERALI
   ========================================================= */

function mpPsRecNumber(value, fallback = 0) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const number = Number(
    String(value).replace(",", ".")
  );

  return Number.isFinite(number)
    ? number
    : fallback;
}


function mpPsRecClamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}


function mpPsRecFeatureLabel(key) {
  const labels = {
    pac: "velocità",
    sho: "finalizzazione",
    pas: "passaggi e visione",
    dri: "dribbling e controllo",
    def: "difesa e posizionamento",
    phy: "fisico e protezione palla"
  };

  return labels[key] || "prestazioni";
}


function mpPsRecFeatureValue(match, key) {
  const aliases = {
    pac: [
      "selfPac",
      "performancePac",
      "pacRating"
    ],

    sho: [
      "selfSho",
      "performanceSho",
      "shoRating"
    ],

    pas: [
      "selfPas",
      "performancePas",
      "pasRating"
    ],

    dri: [
      "selfDri",
      "performanceDri",
      "driRating"
    ],

    def: [
      "selfDef",
      "performanceDef",
      "defRating"
    ],

    phy: [
      "selfPhy",
      "performancePhy",
      "phyRating"
    ]
  };

  const possibleKeys = aliases[key] || [];

  for (const possibleKey of possibleKeys) {
    if (
      match[possibleKey] !== undefined &&
      match[possibleKey] !== null &&
      match[possibleKey] !== ""
    ) {
      const value = mpPsRecNumber(
        match[possibleKey],
        0
      );

      if (value >= 1 && value <= 10) {
        return value;
      }
    }
  }

  return null;
}


function mpPsRecHasSelfRatings(match) {
  const keys = [
    "pac",
    "sho",
    "pas",
    "dri",
    "def",
    "phy"
  ];

  const completed = keys.filter(key => {
    return mpPsRecFeatureValue(
      match,
      key
    ) !== null;
  });

  return completed.length >= 4;
}


function mpPsRecMatchTime(match) {
  if (match.createdAt) {
    const createdTime = new Date(
      match.createdAt
    ).getTime();

    if (Number.isFinite(createdTime)) {
      return createdTime;
    }
  }

  if (match.date) {
    const dateTime = new Date(
      `${match.date}T12:00:00`
    ).getTime();

    if (Number.isFinite(dateTime)) {
      return dateTime;
    }
  }

  return 0;
}


function mpPsRecQualityMultiplier(rating) {
  const value = mpPsRecNumber(
    rating,
    6
  );

  if (value < 5.5) return 0.52;
  if (value < 6.0) return 0.65;
  if (value < 6.5) return 0.78;
  if (value < 7.5) return 0.91;
  if (value < 8.5) return 1.02;
  if (value < 9.5) return 1.09;

  return 1.14;
}


/*
  Gol e assist hanno rendimento decrescente.

  1 evento: importante
  2-3 eventi: molto importanti
  Dal quarto in poi: incremento ridotto
*/

function mpPsRecDiminishingCount(count) {
  const value = Math.max(
    0,
    Math.floor(
      mpPsRecNumber(count, 0)
    )
  );

  if (value === 0) return 0;
  if (value === 1) return 0.65;
  if (value === 2) return 1.00;
  if (value === 3) return 1.25;

  return Math.min(
    1.75,
    1.25 + (value - 3) * 0.12
  );
}


function mpPsRecGoalRoleMultiplier(role) {
  const value = String(
    role || ""
  ).toUpperCase();

  const multipliers = {
    ATT: 1.00,
    ALA: 1.00,
    COC: 0.95,
    CC: 1.05,
    CDC: 1.15,
    DC: 1.25,
    TERZINO: 1.15
  };

  return multipliers[value] || 1;
}


function mpPsRecAssistRoleMultiplier(role) {
  const value = String(
    role || ""
  ).toUpperCase();

  const multipliers = {
    ATT: 0.90,
    ALA: 1.00,
    COC: 1.00,
    CC: 1.10,
    CDC: 1.15,
    DC: 1.25,
    TERZINO: 1.15
  };

  return multipliers[value] || 1;
}


/* =========================================================
   AFFINITÀ TRA RUOLO E CATEGORIA
   ========================================================= */

function mpPsRecRoleCategoryFactor(
  role,
  category
) {
  const value = String(
    role || ""
  ).toUpperCase();

  const tables = {

    shooting: {
      ATT: 1.25,
      ALA: 1.17,
      COC: 1.10,
      CC: 0.90,
      CDC: 0.68,
      DC: 0.58,
      TERZINO: 0.72
    },

    passing: {
      ATT: 0.86,
      ALA: 1.00,
      COC: 1.23,
      CC: 1.22,
      CDC: 1.16,
      DC: 1.12,
      TERZINO: 1.08
    },

    defending: {
      ATT: 0.52,
      ALA: 0.70,
      COC: 0.66,
      CC: 0.95,
      CDC: 1.22,
      DC: 1.27,
      TERZINO: 1.18
    },

    ballControl: {
      ATT: 1.07,
      ALA: 1.23,
      COC: 1.22,
      CC: 1.08,
      CDC: 0.82,
      DC: 0.72,
      TERZINO: 0.92
    },

    physical: {
      ATT: 1.05,
      ALA: 0.90,
      COC: 0.82,
      CC: 1.00,
      CDC: 1.17,
      DC: 1.22,
      TERZINO: 1.08
    }
  };

  const table = tables[category];

  if (!table) {
    return 1;
  }

  return table[value] || 1;
}


/* =========================================================
   PUNTEGGIO DI UN PS PER UNA PARTITA
   ========================================================= */

function mpPsRecScoreSingleMatch(
  playStyle,
  rule,
  match,
  profileRole
) {
  const featureEntries = Object.entries(
    rule.weights || {}
  );

  let weightedValue = 0;
  let totalWeight = 0;

  const contributions = [];

  featureEntries.forEach(
    ([feature, weight]) => {
      const value = mpPsRecFeatureValue(
        match,
        feature
      );

      if (value === null) {
        return;
      }

      weightedValue += value * weight;
      totalWeight += weight;

      contributions.push({
        feature,
        value,
        contribution: value * weight
      });
    }
  );

  if (totalWeight <= 0) {
    return null;
  }

  const featureAverage =
    weightedValue / totalWeight;

  const quality =
    mpPsRecQualityMultiplier(
      match.rating
    );

  const matchRole = String(
    match.role || profileRole || "CC"
  ).toUpperCase();

  const cardRole = String(
    profileRole || "CC"
  ).toUpperCase();

  const matchRoleFactor =
    mpPsRecRoleCategoryFactor(
      matchRole,
      playStyle.category
    );

  const cardRoleFactor =
    mpPsRecRoleCategoryFactor(
      cardRole,
      playStyle.category
    );

  /*
    Il ruolo della partita pesa il 75%.
    Il ruolo principale della carta pesa il 25%.
  */

  const blendedRoleFactor =
    matchRoleFactor * 0.75 +
    cardRoleFactor * 0.25;

  /*
    Evitiamo che il ruolo cancelli completamente
    una grande autovalutazione.
  */

  const roleMultiplier =
    0.72 +
    blendedRoleFactor * 0.28;

  const preferredRoleMultiplier =
    Array.isArray(rule.preferredRoles) &&
    rule.preferredRoles.includes(matchRole)
      ? 1.055
      : 1;

  const goals =
    mpPsRecNumber(match.goals, 0);

  const assists =
    mpPsRecNumber(match.assists, 0);

  const goalBonus =
    mpPsRecDiminishingCount(goals) *
    (rule.goalWeight || 0) *
    mpPsRecGoalRoleMultiplier(matchRole);

  const assistBonus =
    mpPsRecDiminishingCount(assists) *
    (rule.assistWeight || 0) *
    mpPsRecAssistRoleMultiplier(matchRole);

  const confidence =
    rule.confidence || 1;

  const score =
    (
      featureAverage *
      quality *
      roleMultiplier *
      preferredRoleMultiplier
    ) * confidence +
    goalBonus +
    assistBonus;

  contributions.sort(
    (a, b) =>
      b.contribution -
      a.contribution
  );

  return {
    score,
    featureAverage,
    dominantFeature:
      contributions[0]?.feature ||
      "pac",

    dominantValue:
      contributions[0]?.value ||
      featureAverage,

    goals,
    assists,
    matchRole
  };
}


/* =========================================================
   PLAYSTYLE IGNORATI
   ========================================================= */

function mpGetIgnoredPsRecommendations() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(
        MP_PS_REC_IGNORED_KEY
      ) || "[]"
    );

    return Array.isArray(saved)
      ? saved
      : [];
  } catch {
    return [];
  }
}


function mpSaveIgnoredPsRecommendations(ids) {
  localStorage.setItem(
    MP_PS_REC_IGNORED_KEY,
    JSON.stringify(
      [...new Set(ids)]
    )
  );
}


function mpIgnorePsRecommendation(
  playStyleId
) {
  const ignored =
    mpGetIgnoredPsRecommendations();

  if (!ignored.includes(playStyleId)) {
    ignored.push(playStyleId);
  }

  mpSaveIgnoredPsRecommendations(
    ignored
  );

  toast("Consiglio ignorato");

  if (route === "playstyles") {
    renderPlayStyles();
  } else if (route === "detail") {
    renderDetail();
  }
}


function mpRestorePsRecommendations() {
  localStorage.removeItem(
    MP_PS_REC_IGNORED_KEY
  );

  toast("Consigli ripristinati");

  if (route === "playstyles") {
    renderPlayStyles();
  } else if (route === "detail") {
    renderDetail();
  }
}


/* =========================================================
   COSTRUZIONE DEI CONSIGLI
   ========================================================= */

function mpBuildPsRecommendations(
  matches,
  options = {}
) {
  const limit =
    options.limit ||
    MP_PS_RECOMMENDATION_LIMIT;

  const mode =
    options.mode ||
    "profile";

  const profile =
    getPlayerProfile();

  const data =
    mpGetPsData();

  const ignored =
    mpGetIgnoredPsRecommendations();

  const sortedMatches = [
    ...(Array.isArray(matches)
      ? matches
      : [])
  ]
    .filter(mpPsRecHasSelfRatings)
    .sort(
      (a, b) =>
        mpPsRecMatchTime(b) -
        mpPsRecMatchTime(a)
    )
    .slice(
      0,
      mode === "latest"
        ? 1
        : MP_PS_RECENT_MATCH_LIMIT
    );

  if (!sortedMatches.length) {
    return [];
  }

  const recommendations =
    MP_PLAYSTYLES
      .map(playStyle => {
        const rule =
          MP_PS_RECOMMENDATION_RULES[
            playStyle.id
          ];

        if (!rule) {
          return null;
        }

        /*
          Se il PS è già normale o Plus,
          non può essere consigliato.
        */

        const currentState =
          data[playStyle.id] ||
          "none";

        if (
          currentState === "normal" ||
          currentState === "plus"
        ) {
          return null;
        }

        if (
          ignored.includes(
            playStyle.id
          )
        ) {
          return null;
        }

        let totalScore = 0;
        let totalRecencyWeight = 0;
        let strongMatches = 0;

        const featureTotals = {};
        const featureWeights = {};

        let totalGoals = 0;
        let totalAssists = 0;

        sortedMatches.forEach(
          (match, index) => {
            const result =
              mpPsRecScoreSingleMatch(
                playStyle,
                rule,
                match,
                profile.role
              );

            if (!result) {
              return;
            }

            /*
              Le partite recenti contano
              maggiormente.
            */

            const recencyWeight =
              Math.pow(
                0.86,
                index
              );

            totalScore +=
              result.score *
              recencyWeight;

            totalRecencyWeight +=
              recencyWeight;

            if (result.score >= 7.6) {
              strongMatches += 1;
            }

            totalGoals +=
              result.goals;

            totalAssists +=
              result.assists;

            Object.keys(
              rule.weights
            ).forEach(feature => {
              const value =
                mpPsRecFeatureValue(
                  match,
                  feature
                );

              if (value === null) {
                return;
              }

              featureTotals[feature] =
                (
                  featureTotals[
                    feature
                  ] || 0
                ) +
                value *
                recencyWeight;

              featureWeights[feature] =
                (
                  featureWeights[
                    feature
                  ] || 0
                ) +
                recencyWeight;
            });
          }
        );

        if (totalRecencyWeight <= 0) {
          return null;
        }

        let finalScore =
          totalScore /
          totalRecencyWeight;

        /*
          Piccolo bonus continuità:
          non domina il risultato.
        */

        finalScore += Math.min(
          0.35,
          strongMatches * 0.08
        );

        const dominantFeatures =
          Object.keys(featureTotals)
            .map(feature => ({
              feature,

              average:
                featureTotals[feature] /
                Math.max(
                  0.01,
                  featureWeights[feature]
                ),

              importance:
                (
                  featureTotals[feature] /
                  Math.max(
                    0.01,
                    featureWeights[feature]
                  )
                ) *
                (
                  rule.weights[
                    feature
                  ] || 1
                )
            }))
            .sort(
              (a, b) =>
                b.importance -
                a.importance
            );

        const dominant =
          dominantFeatures[0];

        const dominantLabel =
          mpPsRecFeatureLabel(
            dominant?.feature
          );

        const dominantValue =
          dominant
            ? dominant.average
            : 6;

        const latestMatch =
          sortedMatches[0];

        let reason;

        if (mode === "latest") {
          reason =
            `Prestazione da ${String(
              latestMatch.role ||
              profile.role ||
              "CC"
            ).toUpperCase()}: ` +
            `${dominantLabel} ` +
            `${dominantValue.toFixed(1)}/10.`;
        } else {
          reason =
            `${dominantLabel} media ` +
            `${dominantValue.toFixed(1)}/10 ` +
            `nelle ultime ` +
            `${sortedMatches.length} ` +
            `${sortedMatches.length === 1
              ? "partita"
              : "partite"}.`;
        }

        if (
          (rule.goalWeight || 0) >= 0.7 &&
          totalGoals > 0
        ) {
          reason +=
            ` ${totalGoals} ` +
            `${totalGoals === 1
              ? "gol"
              : "gol"} recente.`;
        } else if (
          (rule.assistWeight || 0) >= 0.7 &&
          totalAssists > 0
        ) {
          reason +=
            ` ${totalAssists} ` +
            `${totalAssists === 1
              ? "assist"
              : "assist"} recente.`;
        }

        return {
          id: playStyle.id,
          playStyle,
          category:
            playStyle.category,

          score:
            Number(
              finalScore.toFixed(3)
            ),

          reason
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.score -
          a.score
      );

  /*
    Massimo due consigli della
    stessa categoria.
  */

  const selected = [];
  const categoryCounts = {};

  for (
    const recommendation
    of recommendations
  ) {
    const category =
      recommendation.category;

    const currentCount =
      categoryCounts[category] ||
      0;

    if (currentCount >= 2) {
      continue;
    }

    selected.push(
      recommendation
    );

    categoryCounts[category] =
      currentCount + 1;

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}


/* =========================================================
   HTML DEI CONSIGLI
   ========================================================= */

function mpRenderPsRecommendationItem(
  recommendation
) {
  const playStyle =
    recommendation.playStyle;

  return `
    <article class="ps-recommendation-item">

      <div class="ps-recommendation-top">

        <div class="ps-recommendation-icon">
          <img
            src="${escapeHtml(
              playStyle.normalIcon
            )}"
            alt="${escapeHtml(
              playStyle.name
            )}"
          >
        </div>

        <div>
          <span>CONSIGLIATO</span>

          <strong>
            ${escapeHtml(
              playStyle.name
            )}
          </strong>
        </div>

      </div>

      <p>
        ${escapeHtml(
          recommendation.reason
        )}
      </p>

      <div class="ps-recommendation-actions">

        <button
          type="button"
          class="ps-recommendation-open"
          onclick="
            mpOpenPsSelector(
              '${escapeHtml(
                playStyle.id
              )}'
            )
          "
        >
          Visualizza
        </button>

        <button
          type="button"
          class="ps-recommendation-ignore"
          onclick="
            mpIgnorePsRecommendation(
              '${escapeHtml(
                playStyle.id
              )}'
            )
          "
        >
          Ignora
        </button>

      </div>

    </article>
  `;
}


function mpRenderProfilePsRecommendations() {
  const matches = getMatches();

  const recommendations =
    mpBuildPsRecommendations(
      matches,
      {
        mode: "profile",
        limit: 4
      }
    );

  const hasRatedMatches =
    matches.some(
      mpPsRecHasSelfRatings
    );

  return `
    <section class="ps-recommendations-card">

      <div class="ps-recommendations-header">

        <div>
          <span>ANALISI PRESTAZIONI</span>
          <h3>Consigliati per te</h3>
        </div>

        <strong>✦</strong>

      </div>

      <p class="ps-recommendations-description">
        Suggerimenti basati sulle tue partite
        recenti. La scelta finale rimane sempre tua.
      </p>

      ${
        recommendations.length
          ? `
            <div class="ps-recommendations-scroll">
              ${recommendations
                .map(
                  mpRenderPsRecommendationItem
                )
                .join("")}
            </div>
          `
          : `
            <div class="ps-recommendations-empty">

              <strong>
                ${
                  hasRatedMatches
                    ? "Nessun nuovo consiglio disponibile"
                    : "Servono nuove autovalutazioni"
                }
              </strong>

              <p>
                ${
                  hasRatedMatches
                    ? "I PlayStyle più adatti potrebbero essere già equipaggiati o ignorati."
                    : "Salva almeno una partita con le sei valutazioni della prestazione."
                }
              </p>

            </div>
          `
      }

      ${
        mpGetIgnoredPsRecommendations()
          .length
          ? `
            <button
              type="button"
              class="ps-restore-recommendations"
              onclick="
                mpRestorePsRecommendations()
              "
            >
              Ripristina consigli ignorati
            </button>
          `
          : ""
      }

    </section>
  `;
}


function mpRenderLatestMatchPsRecommendations(
  match
) {
  if (
    !match ||
    !mpPsRecHasSelfRatings(match)
  ) {
    return "";
  }

  const recommendations =
    mpBuildPsRecommendations(
      [match],
      {
        mode: "latest",
        limit: 3
      }
    );

  if (!recommendations.length) {
    return `
      <div class="card ps-match-recommendations">

        <div class="ps-match-rec-header">
          <div>
            <span>ANALISI PLAYSTYLE</span>
            <h3>Consigli della partita</h3>
          </div>

          <strong>✦</strong>
        </div>

        <p class="ps-match-rec-empty">
          Nessun nuovo PlayStyle consigliato:
          quelli più adatti potrebbero essere
          già equipaggiati o ignorati.
        </p>

      </div>
    `;
  }

  return `
    <div class="card ps-match-recommendations">

      <div class="ps-match-rec-header">

        <div>
          <span>ANALISI PLAYSTYLE</span>
          <h3>Consigli della partita</h3>
        </div>

        <strong>✦</strong>

      </div>

      <p class="ps-match-rec-intro">
        Questi consigli non vengono applicati
        automaticamente alla carta.
      </p>

      <div class="ps-match-rec-list">

        ${recommendations
          .map(recommendation => `
            <button
              type="button"
              class="ps-match-rec-item"
              onclick="
                mpOpenPsSelector(
                  '${escapeHtml(
                    recommendation.id
                  )}'
                )
              "
            >

              <img
                src="${escapeHtml(
                  recommendation.playStyle
                    .normalIcon
                )}"
                alt=""
              >

              <span>
                <strong>
                  ${escapeHtml(
                    recommendation.playStyle
                      .name
                  )}
                </strong>

                <small>
                  ${escapeHtml(
                    recommendation.reason
                  )}
                </small>
              </span>

              <b>›</b>

            </button>
          `)
          .join("")}

      </div>

    </div>
  `;
}


/* =========================================================
   SCORRIMENTO PLAYSTYLE MOLTO PIÙ FLUIDO
   ========================================================= */

function mpEnablePlayStyleSmoothScroll() {
  const scrollers =
    document.querySelectorAll(
      [
        ".ps-category-scroll",
        ".ps-recommendations-scroll"
      ].join(",")
    );

  scrollers.forEach(scroller => {
    if (
      scroller.dataset
        .mpSmoothScrollReady ===
      "true"
    ) {
      return;
    }

    scroller.dataset
      .mpSmoothScrollReady =
      "true";

    let pointerActive = false;
    let pointerId = null;

    let dragging = false;
    let blockClick = false;

    let startX = 0;
    let lastX = 0;
    let lastMoveTime = 0;

    let velocity = 0;
    let momentumFrame = 0;

    let wheelFrame = 0;
    let wheelTarget =
      scroller.scrollLeft;


    function maxScrollLeft() {
      return Math.max(
        0,
        scroller.scrollWidth -
        scroller.clientWidth
      );
    }


    function stopMomentum() {
      if (momentumFrame) {
        cancelAnimationFrame(
          momentumFrame
        );

        momentumFrame = 0;
      }

      velocity = 0;
    }


    function stopWheelAnimation() {
      if (wheelFrame) {
        cancelAnimationFrame(
          wheelFrame
        );

        wheelFrame = 0;
      }
    }


    function startMomentum() {
      stopMomentum();

      if (Math.abs(velocity) < 0.02) {
        return;
      }

      let previousTime =
        performance.now();

      function momentumStep(now) {
        const deltaTime = Math.min(
          32,
          now - previousTime
        );

        previousTime = now;

        const previousScroll =
          scroller.scrollLeft;

        scroller.scrollLeft +=
          velocity *
          deltaTime;

        const maximum =
          maxScrollLeft();

        if (
          scroller.scrollLeft <= 0 ||
          scroller.scrollLeft >= maximum ||
          scroller.scrollLeft ===
            previousScroll
        ) {
          stopMomentum();
          return;
        }

        velocity *= Math.pow(
          0.925,
          deltaTime / 16.67
        );

        if (Math.abs(velocity) < 0.018) {
          stopMomentum();
          return;
        }

        momentumFrame =
          requestAnimationFrame(
            momentumStep
          );
      }

      momentumFrame =
        requestAnimationFrame(
          momentumStep
        );
    }


    function animateWheel() {
      if (wheelFrame) {
        return;
      }

      function wheelStep() {
        const difference =
          wheelTarget -
          scroller.scrollLeft;

        if (
          Math.abs(difference) < 0.55
        ) {
          scroller.scrollLeft =
            wheelTarget;

          wheelFrame = 0;
          return;
        }

        scroller.scrollLeft +=
          difference * 0.20;

        wheelFrame =
          requestAnimationFrame(
            wheelStep
          );
      }

      wheelFrame =
        requestAnimationFrame(
          wheelStep
        );
    }


    scroller.addEventListener(
      "pointerdown",
      event => {
        /*
          Su telefono lasciamo lavorare
          lo scorrimento nativo.

          La gestione personalizzata serve
          soprattutto al mouse.
        */

        if (
          event.pointerType === "touch"
        ) {
          return;
        }

        if (
          event.pointerType === "mouse" &&
          event.button !== 0
        ) {
          return;
        }

        stopMomentum();
        stopWheelAnimation();

        pointerActive = true;
        pointerId = event.pointerId;

        dragging = false;
        blockClick = false;

        startX = event.clientX;
        lastX = event.clientX;
        lastMoveTime =
          performance.now();

        velocity = 0;

        
      }
    );


    scroller.addEventListener(
      "pointermove",
      event => {
        if (
          !pointerActive ||
          event.pointerId !== pointerId
        ) {
          return;
        }

        const totalDistance =
          event.clientX -
          startX;

        if (
          !dragging &&
          Math.abs(totalDistance) < 5
        ) {
          return;
        }

        dragging = true;
        blockClick = true;

/*
  Catturiamo il puntatore soltanto
  quando è iniziato un vero trascinamento.
  Un semplice clic resta libero.
*/

        try {
          if (
            !scroller.hasPointerCapture(
              event.pointerId
            )
          ) {
            scroller.setPointerCapture(
              event.pointerId
            );
          }
        } catch {
          /* niente */
        }

        scroller.classList.add(
          "is-dragging"
        );

        const now =
          performance.now();

        const elapsed = Math.max(
          1,
          now - lastMoveTime
        );

        const movement =
          event.clientX -
          lastX;

        scroller.scrollLeft -=
          movement;

        const instantVelocity =
          -movement /
          elapsed;

        velocity =
          velocity * 0.60 +
          instantVelocity * 0.40;

        lastX = event.clientX;
        lastMoveTime = now;

        event.preventDefault();
      },
      {
        passive: false
      }
    );


    function finishPointer(event) {
      if (
        !pointerActive ||
        (
          event &&
          event.pointerId !==
            pointerId
        )
      ) {
        return;
      }

      pointerActive = false;

      scroller.classList.remove(
        "is-dragging"
      );

      if (dragging) {
        startMomentum();

        /*
          Il click prodotto subito dopo
          il trascinamento viene bloccato.
        */

        setTimeout(() => {
          blockClick = false;
        }, 180);
      }

      dragging = false;
      pointerId = null;
    }


    scroller.addEventListener(
      "pointerup",
      finishPointer
    );

    scroller.addEventListener(
      "pointercancel",
      finishPointer
    );

    scroller.addEventListener(
      "lostpointercapture",
      finishPointer
    );


    scroller.addEventListener(
      "click",
      event => {
        if (!blockClick) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        blockClick = false;
      },
      true
    );


    /*
      Rotellina del mouse:
      lo scorrimento verticale viene
      trasformato in movimento orizzontale.
    */

    scroller.addEventListener(
      "wheel",
      event => {
        if (
          scroller.scrollWidth <=
          scroller.clientWidth
        ) {
          return;
        }

        const delta =
          Math.abs(event.deltaX) >
          Math.abs(event.deltaY)
            ? event.deltaX
            : event.deltaY;

        if (!delta) {
          return;
        }

        const maximum =
          maxScrollLeft();

        const nextTarget =
          mpPsRecClamp(
            wheelTarget + delta,
            0,
            maximum
          );

        const movingLeft =
          delta < 0 &&
          scroller.scrollLeft > 0;

        const movingRight =
          delta > 0 &&
          scroller.scrollLeft <
            maximum;

        if (
          !movingLeft &&
          !movingRight
        ) {
          return;
        }

        event.preventDefault();

        stopMomentum();

        wheelTarget =
          nextTarget;

        animateWheel();
      },
      {
        passive: false
      }
    );


    scroller.addEventListener(
      "dragstart",
      event => {
        event.preventDefault();
      }
    );
  });
}


/*
  Se esiste la vecchia funzione,
  la sostituiamo con quella nuova.
*/

if (
  typeof mpEnablePlayStyleDragScroll !==
  "undefined"
) {
  mpEnablePlayStyleDragScroll =
    mpEnablePlayStyleSmoothScroll;
}

window.mpEnablePlayStyleSmoothScroll =
  mpEnablePlayStyleSmoothScroll;

window.mpEnablePlayStyleDragScroll =
  mpEnablePlayStyleSmoothScroll;


/* =========================================================
   AGGIUNGE I CONSIGLI ALLA PAGINA PLAYSTYLE
   ========================================================= */

const mpRenderPlayStylesBeforeRecommendations =
  renderPlayStyles;

renderPlayStyles = function () {
  mpRenderPlayStylesBeforeRecommendations();

  const loadout =
    document.querySelector(
      ".ps-loadout-card"
    );

  if (
    loadout &&
    !document.querySelector(
      ".ps-recommendations-card"
    )
  ) {
    loadout.insertAdjacentHTML(
      "afterend",
      mpRenderProfilePsRecommendations()
    );
  }

  requestAnimationFrame(() => {
    mpEnablePlayStyleSmoothScroll();
  });
};

window.renderPlayStyles =
  renderPlayStyles;


/* =========================================================
   AGGIUNGE I CONSIGLI AL DETTAGLIO DELLA PARTITA
   ========================================================= */

const mpRenderDetailBeforePsRecommendations =
  renderDetail;

renderDetail = function () {
  mpRenderDetailBeforePsRecommendations();

  const match = getMatches().find(
    item =>
      item.id === selectedMatchId
  );

  if (!match) {
    return;
  }

  const actions =
    document.querySelector(
      ".detail-actions"
    );

  if (
    actions &&
    !document.querySelector(
      ".ps-match-recommendations"
    )
  ) {
    actions.insertAdjacentHTML(
      "beforebegin",
      mpRenderLatestMatchPsRecommendations(
        match
      )
    );
  }
};

window.renderDetail = renderDetail;


/* =========================================================
   FUNZIONI DISPONIBILI NEGLI ONCLICK
   ========================================================= */

window.mpIgnorePsRecommendation =
  mpIgnorePsRecommendation;

window.mpRestorePsRecommendations =
  mpRestorePsRecommendations;

window.mpBuildPsRecommendations =
  mpBuildPsRecommendations;


/* =========================================================
   AGGIORNAMENTO DELLA PAGINA CORRENTE
   ========================================================= */

requestAnimationFrame(() => {
  if (route === "playstyles") {
    renderPlayStyles();
  } else if (route === "detail") {
    renderDetail();
  }
});

/* =========================================================
   MATCHPULSE - STORICO NUOVO E PULITO
   Rimuove tutte le vecchie statistiche non più utilizzate
   ========================================================= */

function mpHistoryNumber(value, fallback = 0) {
  const number = Number(
    String(value ?? "").replace(",", ".")
  );

  return Number.isFinite(number)
    ? number
    : fallback;
}


function mpHistoryDisplayRating(value) {
  const number = mpHistoryNumber(value, 0);

  if (!number) {
    return "—";
  }

  return number
    .toFixed(1)
    .replace(".0", "");
}


function mpHistoryOutcomeClass(outcome) {
  const value = String(
    outcome || ""
  ).toLowerCase();

  if (value.includes("vittoria")) {
    return "win";
  }

  if (value.includes("sconfitta")) {
    return "loss";
  }

  return "draw";
}


function mpHistorySelfRatingRow(
  icon,
  label,
  value,
  statClass
) {
  const number = Math.max(
    0,
    Math.min(
      10,
      mpHistoryNumber(value, 0)
    )
  );

  const shownValue = number
    ? number.toFixed(1).replace(".0", "")
    : "—";

  return `
    <div class="history-self-rating">

      <span class="history-self-icon">
        ${icon}
      </span>

      <div class="history-self-content">

        <div class="history-self-head">
          <strong>${label}</strong>
          <b class="${statClass}">
            ${shownValue}
          </b>
        </div>

        <div class="history-self-track">
          <i style="width:${number * 10}%"></i>
        </div>

      </div>

    </div>
  `;
}


/* =========================================================
   CARD NELLA LISTA DELLO STORICO
   ========================================================= */

matchCard = function (match) {
  const outcomeClass =
    mpHistoryOutcomeClass(
      match.outcome
    );

  const result =
    match.result ||
    "Risultato non inserito";

  const field =
    match.field ||
    "Campo non specificato";

  return `
    <article
      class="card match-card history-match-card"
      onclick="
        setRoute(
          'detail',
          '${escapeHtml(match.id)}'
        )
      "
    >

      <div class="history-match-top">

        <div>
          <span class="history-match-date">
            ${formatDate(match.date)}
          </span>

          <h3>
            ${escapeHtml(result)}
          </h3>

          <small>
            ${escapeHtml(field)}
          </small>
        </div>

        <span
          class="
            history-outcome
            ${outcomeClass}
          "
        >
          ${escapeHtml(
            match.outcome || "—"
          )}
        </span>

      </div>

      <div class="history-match-summary">

        <div>
          <span>GOL</span>
          <strong>
            ${mpHistoryNumber(
              match.goals,
              0
            )}
          </strong>
        </div>

        <div>
          <span>ASSIST</span>
          <strong>
            ${mpHistoryNumber(
              match.assists,
              0
            )}
          </strong>
        </div>

        <div>
          <span>VOTO</span>
          <strong>
            ${mpHistoryDisplayRating(
              match.rating
            )}
          </strong>
        </div>

        <div>
          <span>RUOLO</span>
          <strong>
            ${escapeHtml(
              match.role || "—"
            )}
          </strong>
        </div>

      </div>

      <div class="history-match-open">
        <span>Apri analisi partita</span>
        <b>›</b>
      </div>

    </article>
  `;
};


/* =========================================================
   PAGINA STORICO
   ========================================================= */

renderHistory = function () {
  const matches = [
    ...getMatches()
  ].sort((a, b) => {
    const dateComparison =
      String(b.date || "")
        .localeCompare(
          String(a.date || "")
        );

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return Number(b.createdAt || 0) -
      Number(a.createdAt || 0);
  });

  app.innerHTML = `
    <section class="section history-page">

      <div class="history-page-header">

        <div>
          <span>ARCHIVIO PRESTAZIONI</span>
          <h2>Storico partite</h2>

          <p>
            Rivedi risultati, ruolo,
            autovalutazioni e andamento
            delle tue partite.
          </p>
        </div>

        <strong>
          ${matches.length}
        </strong>

      </div>

      ${
        matches.length
          ? `
            <div class="grid history-match-list">
              ${matches
                .map(matchCard)
                .join("")}
            </div>
          `
          : `
            <div class="empty history-empty">
              <strong>
                Nessuna partita salvata
              </strong>

              <p>
                Aggiungi la prima partita
                dalla sezione Partita.
              </p>
            </div>
          `
      }

    </section>
  `;
};


/* =========================================================
   DETTAGLIO DELLA SINGOLA PARTITA
   ========================================================= */

renderDetail = function () {
  const match = getMatches().find(
    item =>
      String(item.id) ===
      String(selectedMatchId)
  );

  if (!match) {
    setRoute("history");
    return;
  }

  const outcomeClass =
    mpHistoryOutcomeClass(
      match.outcome
    );

  const recommendationsHtml =
    typeof mpRenderLatestMatchPsRecommendations ===
      "function"
      ? mpRenderLatestMatchPsRecommendations(
          match
        )
      : "";

  app.innerHTML = `
    <section class="section match-detail-page">

      <div class="history-detail-hero">

        <div class="history-detail-heading">

          <button
            type="button"
            class="history-back-btn"
            onclick="setRoute('history')"
          >
            ←
          </button>

          <div>
            <span>
              ${formatDate(match.date)}
            </span>

            <h2>
              ${escapeHtml(
                match.result ||
                "Partita"
              )}
            </h2>

            <small>
              ${escapeHtml(
                match.field ||
                "Campo non specificato"
              )}
            </small>
          </div>

        </div>

        <span
          class="
            history-outcome
            ${outcomeClass}
          "
        >
          ${escapeHtml(
            match.outcome || "—"
          )}
        </span>

      </div>


      <div class="history-detail-main-stats">

        <div>
          <span>GOL</span>
          <strong>
            ${mpHistoryNumber(
              match.goals,
              0
            )}
          </strong>
        </div>

        <div>
          <span>ASSIST</span>
          <strong>
            ${mpHistoryNumber(
              match.assists,
              0
            )}
          </strong>
        </div>

        <div>
          <span>VOTO</span>
          <strong>
            ${mpHistoryDisplayRating(
              match.rating
            )}
          </strong>
        </div>

        <div>
          <span>RUOLO</span>
          <strong>
            ${escapeHtml(
              match.role || "—"
            )}
          </strong>
        </div>

      </div>


      <div class="card history-self-card">

        <div class="history-section-title">

          <div>
            <span>AUTOVALUTAZIONE</span>
            <h3>Prestazione personale</h3>
          </div>

          <strong>📊</strong>

        </div>

        <div class="history-self-list">

          ${mpHistorySelfRatingRow(
            "⚡",
            "Velocità",
            match.selfPac,
            "pac"
          )}

          ${mpHistorySelfRatingRow(
            "🎯",
            "Finalizzazione",
            match.selfSho,
            "sho"
          )}

          ${mpHistorySelfRatingRow(
            "🧠",
            "Passaggi e visione",
            match.selfPas,
            "pas"
          )}

          ${mpHistorySelfRatingRow(
            "✨",
            "Dribbling e controllo",
            match.selfDri,
            "dri"
          )}

          ${mpHistorySelfRatingRow(
            "🛡️",
            "Difesa e posizionamento",
            match.selfDef,
            "def"
          )}

          ${mpHistorySelfRatingRow(
            "💪",
            "Fisico e protezione palla",
            match.selfPhy,
            "phy"
          )}

        </div>

      </div>


      ${
        match.notes
          ? `
            <div class="card history-notes-card">

              <div class="history-section-title">
                <div>
                  <span>COMMENTO</span>
                  <h3>Note della partita</h3>
                </div>

                <strong>✎</strong>
              </div>

              <p>
                ${escapeHtml(match.notes)}
              </p>

            </div>
          `
          : ""
      }


      ${recommendationsHtml}


      <div class="history-detail-actions">

        <button
          type="button"
          class="secondary-btn"
          onclick="setRoute('history')"
        >
          Torna allo storico
        </button>

        <button
          type="button"
          class="danger-btn"
          onclick="
            deleteMatch(
              '${escapeHtml(match.id)}'
            )
          "
        >
          Elimina partita
        </button>

      </div>

    </section>
  `;

  if (
    typeof mpEnablePlayStyleSmoothScroll ===
      "function"
  ) {
    requestAnimationFrame(() => {
      mpEnablePlayStyleSmoothScroll();
    });
  }
};


window.matchCard = matchCard;
window.renderHistory = renderHistory;
window.renderDetail = renderDetail;


/*
  Il vecchio pulsante non deve più
  pubblicare report nello Spogliatoio.
*/

publishMatchToLockerRoom = function () {
  toast(
    "I vecchi report Club sono stati rimossi"
  );
};

window.publishMatchToLockerRoom =
  publishMatchToLockerRoom;


/*
  Aggiorna la schermata aperta.
*/

requestAnimationFrame(() => {
  if (route === "history") {
    renderHistory();
  }

  if (route === "detail") {
    renderDetail();
  }
});

/* =========================================================
   MATCHPULSE
   BLOCCA IL GRUPPO DEI PLAYSTYLE CONSIGLIATI

   I consigli restano fissi fino alla prossima
   partita salvata. Ignorare o selezionare un PS
   non fa apparire nuovi sostituti.
   ========================================================= */

const MP_PS_FIXED_BATCH_KEY =
  "matchpulse_ps_fixed_recommendations_v1";


/*
  Conserviamo la funzione originale che
  calcola liberamente tutti i consigli.
*/

const mpDynamicBuildPsRecommendations =
  mpBuildPsRecommendations;


/* =========================================================
   LETTURA E SALVATAGGIO DEI GRUPPI
   ========================================================= */

function mpReadFixedPsBatches() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(
        MP_PS_FIXED_BATCH_KEY
      ) || "{}"
    );

    return (
      saved &&
      typeof saved === "object" &&
      !Array.isArray(saved)
    )
      ? saved
      : {};
  } catch {
    return {};
  }
}


function mpSaveFixedPsBatches(batches) {
  localStorage.setItem(
    MP_PS_FIXED_BATCH_KEY,
    JSON.stringify(batches)
  );
}


/* =========================================================
   FIRMA DELLE PARTITE

   Il gruppo cambia soltanto quando cambia
   lo storico delle partite o il ruolo principale.
   Non dipende dai PS selezionati o ignorati.
   ========================================================= */

function mpFixedPsHistorySignature(
  matches,
  mode
) {
  const profile =
    getPlayerProfile();

  const matchSignature = [
    ...(Array.isArray(matches)
      ? matches
      : [])
  ]
    .sort((a, b) => {
      return (
        mpPsRecMatchTime(a) -
        mpPsRecMatchTime(b)
      );
    })
    .map(match => {
      return [
        match.id || "",
        match.date || "",
        match.role || "",
        match.rating || "",
        match.goals || 0,
        match.assists || 0,
        match.selfPac ?? "",
        match.selfSho ?? "",
        match.selfPas ?? "",
        match.selfDri ?? "",
        match.selfDef ?? "",
        match.selfPhy ?? ""
      ].join(":");
    })
    .join("|");

  return [
    "versione-1",
    mode,
    profile.role || "CC",
    profile.playStyle || "Equilibrato",
    matchSignature
  ].join("::");
}


/* =========================================================
   CHIAVE DEL GRUPPO

   Profilo:
   un gruppo generale basato sulle ultime partite.

   Dettaglio:
   un gruppo separato per ogni partita.
   ========================================================= */

function mpFixedPsBatchId(
  matches,
  mode,
  limit
) {
  if (mode === "latest") {
    const match =
      Array.isArray(matches)
        ? matches[0]
        : null;

    const matchId =
      match?.id ||
      mpPsRecMatchTime(match || {}) ||
      "partita";

    return `latest:${matchId}:${limit}`;
  }

  return `profile:${limit}`;
}


/* =========================================================
   CREA O RECUPERA IL GRUPPO INIZIALE
   ========================================================= */

function mpGetFixedPsBatch(
  matches,
  options = {}
) {
  const mode =
    options.mode ||
    "profile";

  const limit =
    options.limit ||
    MP_PS_RECOMMENDATION_LIMIT;

  const batches =
    mpReadFixedPsBatches();

  const batchId =
    mpFixedPsBatchId(
      matches,
      mode,
      limit
    );

  const signature =
    mpFixedPsHistorySignature(
      matches,
      mode
    );

  let batch =
    batches[batchId];


  /*
    Generiamo un nuovo gruppo solamente
    quando cambia la firma delle partite.
  */

  if (
    !batch ||
    batch.signature !== signature ||
    !Array.isArray(batch.items)
  ) {
    const initialRecommendations =
      mpDynamicBuildPsRecommendations(
        matches,
        {
          ...options,
          mode,
          limit
        }
      );

    batch = {
      signature,

      createdAt:
        new Date().toISOString(),

      items:
        initialRecommendations.map(
          recommendation => ({
            id:
              recommendation.id,

            score:
              recommendation.score,

            reason:
              recommendation.reason
          })
        )
    };

    batches[batchId] = batch;

    mpSaveFixedPsBatches(
      batches
    );
  }


  /*
    Riprendiamo esclusivamente i PS
    presenti nel gruppo iniziale.

    Non cerchiamo mai dei sostituti.
  */

  const playStyleData =
    mpGetPsData();

  const ignored =
    mpGetIgnoredPsRecommendations();

  return batch.items
    .map(savedRecommendation => {
      const playStyle =
        MP_PLAYSTYLES.find(
          item =>
            item.id ===
            savedRecommendation.id
        );

      if (!playStyle) {
        return null;
      }

      const currentState =
        playStyleData[
          playStyle.id
        ] || "none";


      /*
        Se è stato equipaggiato,
        sparisce dai consigli.

        Ma non viene sostituito.
      */

      if (
        currentState === "normal" ||
        currentState === "plus"
      ) {
        return null;
      }


      /*
        Se è stato ignorato,
        sparisce dai consigli.

        Ma non viene sostituito.
      */

      if (
        ignored.includes(
          playStyle.id
        )
      ) {
        return null;
      }

      return {
        id:
          playStyle.id,

        playStyle,

        category:
          playStyle.category,

        score:
          savedRecommendation.score,

        reason:
          savedRecommendation.reason
      };
    })
    .filter(Boolean);
}


/* =========================================================
   SOVRASCRIVE IL CALCOLO USATO DALLA PAGINA
   ========================================================= */

mpBuildPsRecommendations =
  function (
    matches,
    options = {}
  ) {
    return mpGetFixedPsBatch(
      matches,
      options
    );
  };


window.mpBuildPsRecommendations =
  mpBuildPsRecommendations;


/* =========================================================
   RESET MANUALE DEL GRUPPO
   Utile solo per eventuali prove.
   ========================================================= */

function mpResetFixedPsRecommendations() {
  localStorage.removeItem(
    MP_PS_FIXED_BATCH_KEY
  );

  toast(
    "Consigli PlayStyle ricalcolati"
  );

  if (route === "playstyles") {
    renderPlayStyles();
  } else if (route === "detail") {
    renderDetail();
  }
}


window.mpResetFixedPsRecommendations =
  mpResetFixedPsRecommendations;


/*
  Ricrea immediatamente la schermata aperta
  usando il nuovo sistema fisso.
*/

requestAnimationFrame(() => {
  if (route === "playstyles") {
    renderPlayStyles();
  } else if (route === "detail") {
    renderDetail();
  }
});

/* =========================================================
   MATCHPULSE - AUTENTICAZIONE SUPABASE ANONIMA
   ========================================================= */

async function mpEnsureClubAuth() {
  if (!matchpulseSupabase) {
    throw new Error("Supabase non configurato");
  }

  const {
    data: sessionData,
    error: sessionError
  } = await matchpulseSupabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (sessionData?.session?.user) {
    return sessionData.session.user;
  }

  const {
    data,
    error
  } = await matchpulseSupabase.auth.signInAnonymously();

  if (error) {
    throw error;
  }

  if (!data?.user) {
    throw new Error("Impossibile creare l'utente Supabase");
  }

  return data.user;
}

window.mpEnsureClubAuth = mpEnsureClubAuth;


/* =========================================================
   TEST NUOVO PROGETTO SUPABASE
   ========================================================= */

async function mpTestClubSupabase() {
  try {
    const user = await mpEnsureClubAuth();

    const {
      data,
      error
    } = await matchpulseSupabase.rpc(
      "get_my_matchpulse_club"
    );

    if (error) {
      throw error;
    }

    console.log("UTENTE MATCHPULSE:", user.id);
    console.log("CLUB MATCHPULSE:", data);

    if (typeof toast === "function") {
      toast("Supabase MatchPulse collegato");
    }

    return {
      user,
      club: data
    };
  } catch (error) {
    console.error(
      "ERRORE SUPABASE MATCHPULSE:",
      error
    );

    if (typeof toast === "function") {
      toast("Errore collegamento Supabase");
    }

    throw error;
  }
}

window.mpTestClubSupabase = mpTestClubSupabase;

/* =========================================================
   MATCHPULSE CLUB ONLINE
   INCOLLA ALLA FINE DI app.js
   ========================================================= */

var MP_CLUB_MEMBERS_CACHE = [];
var MP_CLUB_CURRENT = null;


/* =========================================================
   FUNZIONI DI SUPPORTO
   ========================================================= */

function mpClubEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mpClubNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function mpClubClamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, mpClubNumber(value, min))
  );
}

function mpClubToast(message) {
  if (typeof toast === "function") {
    toast(message);
    return;
  }

  console.log(message);
}

function mpClubTierFromOvr(ovr) {
  const value = mpClubClamp(ovr, 0, 99);

  if (value <= 64) return "Bronzo";
  if (value <= 74) return "Argento";
  if (value <= 89) return "Oro";

  return "Icona";
}

function mpClubTierClass(ovr) {
  const value = mpClubClamp(ovr, 0, 99);

  if (value <= 64) return "mp-club-tier-bronze";
  if (value <= 74) return "mp-club-tier-silver";
  if (value <= 89) return "mp-club-tier-gold";

  return "mp-club-tier-icon";
}

function mpClubInitials(name) {
  const cleanName = String(name || "PLAYER")
    .trim()
    .replace(/\s+/g, " ");

  const words = cleanName.split(" ");

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    words[0].charAt(0) +
    words[words.length - 1].charAt(0)
  ).toUpperCase();
}

function mpClubStars(value) {
  const amount = Math.round(
    mpClubClamp(value, 1, 5)
  );

  return `
    <span class="mp-club-stars-active">
      ${"★".repeat(amount)}
    </span>
    <span class="mp-club-stars-empty">
      ${"★".repeat(5 - amount)}
    </span>
  `;
}

function mpClubFormatDate(value) {
  if (!value) {
    return "Mai";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function mpClubGetPlayStylesData() {
  if (typeof mpGetPsData === "function") {
    try {
      return mpGetPsData() || {};
    } catch (error) {
      console.warn(error);
    }
  }

  try {
    return JSON.parse(
      localStorage.getItem(
        "matchpulse_playstyles_v1"
      ) || "{}"
    );
  } catch (error) {
    return {};
  }
}

function mpClubGetProfile() {
  const profile =
    typeof getPlayerProfile === "function"
      ? getPlayerProfile()
      : {};

  return {
    name:
      String(profile.name || "PLAYER")
        .trim()
        .slice(0, 40) || "PLAYER",

    role:
      String(profile.role || "CC")
        .trim()
        .toUpperCase()
        .slice(0, 15) || "CC",

    shirtNumber:
      String(
        profile.shirtNumber || "10"
      ).slice(0, 4),

    foot:
      String(
        profile.foot || "Destro"
      ).slice(0, 20),

    playStyle:
      String(
        profile.playStyle || "Equilibrato"
      ).slice(0, 30),

    weakFoot: mpClubClamp(
      profile.weakFoot ?? 3,
      1,
      5
    ),

    skillMoves: mpClubClamp(
      profile.skillMoves ?? 3,
      1,
      5
    ),

    photoX: mpClubNumber(
      profile.photoX,
      50
    ),

    photoY: mpClubNumber(
      profile.photoY,
      8
    ),

    photoZoom: mpClubNumber(
      profile.photoZoom,
      1.02
    )
  };
}

function mpClubGetCardStats() {
  const source =
    typeof getCardStats === "function"
      ? getCardStats()
      : {};

  return {
    pac: Math.round(
      mpClubClamp(source.pac ?? 60, 0, 99)
    ),

    sho: Math.round(
      mpClubClamp(source.sho ?? 60, 0, 99)
    ),

    pas: Math.round(
      mpClubClamp(source.pas ?? 60, 0, 99)
    ),

    dri: Math.round(
      mpClubClamp(source.dri ?? 60, 0, 99)
    ),

    def: Math.round(
      mpClubClamp(source.def ?? 60, 0, 99)
    ),

    phy: Math.round(
      mpClubClamp(source.phy ?? 60, 0, 99)
    )
  };
}

function mpClubCalculateOvr(stats) {
  if (typeof calculateOVR === "function") {
    try {
      return Math.round(
        mpClubClamp(
          calculateOVR(stats),
          0,
          99
        )
      );
    } catch (error) {
      console.warn(error);
    }
  }

  return Math.round(
    (
      stats.pac +
      stats.sho +
      stats.pas +
      stats.dri +
      stats.def +
      stats.phy
    ) / 6
  );
}


/* =========================================================
   RECUPERA IL CLUB ATTUALE
   ========================================================= */

async function mpGetMyClub() {
  await mpEnsureClubAuth();

  const {
    data,
    error
  } = await matchpulseSupabase.rpc(
    "get_my_matchpulse_club"
  );

  if (error) {
    throw error;
  }

  return Array.isArray(data) && data.length
    ? data[0]
    : null;
}


/* =========================================================
   SINCRONIZZA IL PROFILO LOCALE
   ========================================================= */

async function mpSyncMyClubProfile(clubId) {
  const user = await mpEnsureClubAuth();

  const profile = mpClubGetProfile();
  const cardStats = mpClubGetCardStats();
  const ovr = mpClubCalculateOvr(cardStats);
  const playstyles = mpClubGetPlayStylesData();

  const memberUpdate = {
    player_name: profile.name,
    role: profile.role,
    ovr: ovr,
    tier: mpClubTierFromOvr(ovr),

    shirt_number:
      profile.shirtNumber,

    preferred_foot:
      profile.foot,

    profile_style:
      profile.playStyle,

    weak_foot:
      Math.round(profile.weakFoot),

    skill_moves:
      Math.round(profile.skillMoves),

    card_stats:
      cardStats,

    playstyles:
      playstyles,

    photo_x:
      profile.photoX,

    photo_y:
      profile.photoY,

    photo_zoom:
      profile.photoZoom,

    last_seen_at:
      new Date().toISOString()
  };

  const {
    error
  } = await matchpulseSupabase
    .from("matchpulse_club_members")
    .update(memberUpdate)
    .eq("club_id", clubId)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }

  return memberUpdate;
}


/* =========================================================
   RECUPERA I MEMBRI
   ========================================================= */

async function mpFetchClubMembers(clubId) {
  const {
    data,
    error
  } = await matchpulseSupabase
    .from("matchpulse_club_members")
    .select(`
      club_id,
      user_id,
      player_name,
      role,
      ovr,
      tier,
      shirt_number,
      preferred_foot,
      profile_style,
      weak_foot,
      skill_moves,
      card_stats,
      playstyles,
      avatar_path,
      joined_at,
      updated_at,
      last_seen_at
    `)
    .eq("club_id", clubId)
    .order("ovr", {
      ascending: false
    })
    .order("player_name", {
      ascending: true
    });

  if (error) {
    throw error;
  }

  return Array.isArray(data)
    ? data
    : [];
}


/* =========================================================
   CREA UN CLUB
   ========================================================= */

async function mpCreateClub(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector(
    'button[type="submit"]'
  );

  const clubName =
    String(
      form.elements.clubName?.value || ""
    ).trim();

  if (clubName.length < 2) {
    mpClubToast(
      "Inserisci un nome di almeno 2 caratteri"
    );
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "CREAZIONE...";
  }

  try {
    await mpEnsureClubAuth();

    const {
      data,
      error
    } = await matchpulseSupabase.rpc(
      "create_matchpulse_club",
      {
        p_name: clubName
      }
    );

    if (error) {
      throw error;
    }

    console.log(
      "CLUB CREATO:",
      data
    );

    mpClubToast(
      "Club creato correttamente"
    );

    await renderLockerRoom();
  } catch (error) {
    console.error(
      "ERRORE CREAZIONE CLUB:",
      error
    );

    mpClubToast(
      error?.message ||
      "Errore durante la creazione"
    );

    if (button) {
      button.disabled = false;
      button.textContent = "CREA CLUB";
    }
  }
}


/* =========================================================
   ENTRA IN UN CLUB
   ========================================================= */

async function mpJoinClub(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector(
    'button[type="submit"]'
  );

  const code = String(
    form.elements.clubCode?.value || ""
  )
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (code.length !== 6) {
    mpClubToast(
      "Il codice Club deve avere 6 caratteri"
    );
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "ACCESSO...";
  }

  try {
    await mpEnsureClubAuth();

    const {
      data,
      error
    } = await matchpulseSupabase.rpc(
      "join_matchpulse_club",
      {
        p_code: code
      }
    );

    if (error) {
      throw error;
    }

    console.log(
      "INGRESSO CLUB:",
      data
    );

    mpClubToast(
      "Sei entrato nel Club"
    );

    await renderLockerRoom();
  } catch (error) {
    console.error(
      "ERRORE INGRESSO CLUB:",
      error
    );

    mpClubToast(
      error?.message ||
      "Impossibile entrare nel Club"
    );

    if (button) {
      button.disabled = false;
      button.textContent = "ENTRA NEL CLUB";
    }
  }
}


/* =========================================================
   ESCI DAL CLUB
   ========================================================= */

async function mpLeaveClub() {
  if (!MP_CLUB_CURRENT?.club_id) {
    return;
  }

  const message = MP_CLUB_CURRENT.is_owner
    ? "Se sei rimasto da solo, il Club verrà eliminato. Continuare?"
    : "Vuoi davvero uscire dal Club?";

  const confirmed = confirm(message);

  if (!confirmed) {
    return;
  }

  try {
    const {
      error
    } = await matchpulseSupabase.rpc(
      "leave_matchpulse_club",
      {
        p_club_id:
          MP_CLUB_CURRENT.club_id
      }
    );

    if (error) {
      throw error;
    }

    MP_CLUB_CURRENT = null;
    MP_CLUB_MEMBERS_CACHE = [];

    mpClubToast(
      "Hai lasciato il Club"
    );

    await renderLockerRoom();
  } catch (error) {
    console.error(
      "ERRORE USCITA CLUB:",
      error
    );

    mpClubToast(
      error?.message ||
      "Impossibile uscire dal Club"
    );
  }
}


/* =========================================================
   COPIA CODICE CLUB
   ========================================================= */

async function mpCopyClubCode() {
  const code =
    MP_CLUB_CURRENT?.club_code;

  if (!code) {
    return;
  }

  try {
    await navigator.clipboard.writeText(
      code
    );

    mpClubToast(
      "Codice Club copiato"
    );
  } catch (error) {
    const input =
      document.createElement("textarea");

    input.value = code;
    input.setAttribute(
      "readonly",
      ""
    );

    input.style.position = "fixed";
    input.style.opacity = "0";

    document.body.appendChild(input);

    input.select();
    document.execCommand("copy");
    input.remove();

    mpClubToast(
      "Codice Club copiato"
    );
  }
}


/* =========================================================
   PLAYSTYLES DEL MEMBRO
   ========================================================= */

function mpClubGetMemberPlayStyles(member) {
  const saved =
    member?.playstyles &&
    typeof member.playstyles === "object"
      ? member.playstyles
      : {};

  const catalog =
    typeof MP_PLAYSTYLES !== "undefined" &&
    Array.isArray(MP_PLAYSTYLES)
      ? MP_PLAYSTYLES
      : [];

  return catalog
    .map(playStyle => {
      const state =
        saved[playStyle.id];

      const isPlus =
        state === "plus";

      const isNormal =
        state === "normal" ||
        state === "silver";

      if (!isPlus && !isNormal) {
        return null;
      }

      return {
        id: playStyle.id,
        name: playStyle.name,
        category: playStyle.category,
        state: isPlus
          ? "plus"
          : "normal",

        icon: isPlus
          ? playStyle.plusIcon
          : playStyle.normalIcon
      };
    })
    .filter(Boolean);
}

function mpClubPlayStyleItem(playStyle) {
  return `
    <div class="
      mp-club-ps-item
      ${playStyle.state === "plus"
        ? "mp-club-ps-plus"
        : "mp-club-ps-normal"}
    ">
      <img
        src="${mpClubEscape(playStyle.icon)}"
        alt="${mpClubEscape(playStyle.name)}"
      >

      <div>
        <strong>
          ${mpClubEscape(playStyle.name)}
        </strong>

        <span>
          ${playStyle.state === "plus"
            ? "PLAYSTYLE+"
            : "PLAYSTYLE"}
        </span>
      </div>
    </div>
  `;
}


/* =========================================================
   CARTA RIDOTTA DEL MEMBRO
   ========================================================= */

function mpClubMemberCard(
  member,
  ownerId
) {
  const stats =
    member.card_stats || {};

  const isOwner =
    member.user_id === ownerId;

  const ovr = mpClubClamp(
    member.ovr,
    0,
    99
  );

  return `
    <button
      type="button"
      class="
        mp-club-member-card
        ${mpClubTierClass(ovr)}
      "
      onclick="
        mpOpenClubMember(
          '${mpClubEscape(member.user_id)}'
        )
      "
    >
      <div class="mp-club-member-top">
        <div class="mp-club-member-ovr">
          <strong>${Math.round(ovr)}</strong>
          <span>OVERALL</span>
        </div>

        <div class="mp-club-member-role">
          ${mpClubEscape(
            member.role || "CC"
          )}
        </div>

        ${
          isOwner
            ? `
              <span class="mp-club-founder">
                FONDATORE
              </span>
            `
            : ""
        }
      </div>

      <div class="mp-club-member-avatar">
        ${mpClubEscape(
          mpClubInitials(
            member.player_name
          )
        )}
      </div>

      <div class="mp-club-member-name">
        ${mpClubEscape(
          member.player_name || "PLAYER"
        )}
      </div>

      <div class="mp-club-member-mini-stats">
        <span>
          <b>${Math.round(
            mpClubClamp(stats.pac ?? 60, 0, 99)
          )}</b>
          PAC
        </span>

        <span>
          <b>${Math.round(
            mpClubClamp(stats.sho ?? 60, 0, 99)
          )}</b>
          SHO
        </span>

        <span>
          <b>${Math.round(
            mpClubClamp(stats.pas ?? 60, 0, 99)
          )}</b>
          PAS
        </span>

        <span>
          <b>${Math.round(
            mpClubClamp(stats.dri ?? 60, 0, 99)
          )}</b>
          DRI
        </span>

        <span>
          <b>${Math.round(
            mpClubClamp(stats.def ?? 60, 0, 99)
          )}</b>
          DEF
        </span>

        <span>
          <b>${Math.round(
            mpClubClamp(stats.phy ?? 60, 0, 99)
          )}</b>
          PHY
        </span>
      </div>

      <div class="mp-club-member-open">
        APRI PROFILO
      </div>
    </button>
  `;
}


/* =========================================================
   PROFILO COMPLETO DEL MEMBRO
   ========================================================= */

function mpOpenClubMember(userId) {
  const member =
    MP_CLUB_MEMBERS_CACHE.find(
      item => item.user_id === userId
    );

  if (!member) {
    mpClubToast(
      "Profilo non trovato"
    );
    return;
  }

  mpCloseClubMember();

  const stats =
    member.card_stats || {};

  const playstyles =
    mpClubGetMemberPlayStyles(member);

  const normalPlayStyles =
    playstyles.filter(
      item => item.state === "normal"
    );

  const plusPlayStyles =
    playstyles.filter(
      item => item.state === "plus"
    );

  const isOwner =
    member.user_id ===
    MP_CLUB_CURRENT?.owner_id;

  const modal = document.createElement(
    "div"
  );

  modal.id = "mpClubMemberModal";
  modal.className =
    "mp-club-profile-backdrop";

  modal.onclick = function (event) {
    if (event.target === modal) {
      mpCloseClubMember();
    }
  };

  modal.innerHTML = `
    <section class="mp-club-profile-modal">
      <button
        type="button"
        class="mp-club-profile-close"
        onclick="mpCloseClubMember()"
        aria-label="Chiudi"
      >
        ×
      </button>

      <div class="mp-club-profile-head">
        <div class="
          mp-club-profile-card
          ${mpClubTierClass(member.ovr)}
        ">
          <div class="mp-club-profile-rating">
            <strong>
              ${Math.round(
                mpClubClamp(
                  member.ovr,
                  0,
                  99
                )
              )}
            </strong>

            <span>OVERALL</span>
          </div>

          <div class="mp-club-profile-role">
            ${mpClubEscape(
              member.role || "CC"
            )}
          </div>

          <div class="mp-club-profile-avatar">
            ${mpClubEscape(
              mpClubInitials(
                member.player_name
              )
            )}
          </div>

          <h3>
            ${mpClubEscape(
              member.player_name ||
              "PLAYER"
            )}
          </h3>

          <div class="mp-club-profile-stats">
            ${mpClubProfileStat(
              "PAC",
              stats.pac
            )}

            ${mpClubProfileStat(
              "SHO",
              stats.sho
            )}

            ${mpClubProfileStat(
              "PAS",
              stats.pas
            )}

            ${mpClubProfileStat(
              "DRI",
              stats.dri
            )}

            ${mpClubProfileStat(
              "DEF",
              stats.def
            )}

            ${mpClubProfileStat(
              "PHY",
              stats.phy
            )}
          </div>
        </div>

        <div class="mp-club-profile-info">
          <div class="mp-club-profile-title">
            <div>
              <span>PROFILO GIOCATORE</span>

              <h2>
                ${mpClubEscape(
                  member.player_name ||
                  "PLAYER"
                )}
              </h2>
            </div>

            ${
              isOwner
                ? `
                  <strong class="mp-club-founder-large">
                    FONDATORE
                  </strong>
                `
                : ""
            }
          </div>

          <div class="mp-club-profile-details">
            <div>
              <span>Ruolo</span>
              <strong>
                ${mpClubEscape(
                  member.role || "CC"
                )}
              </strong>
            </div>

            <div>
              <span>Numero</span>
              <strong>
                ${mpClubEscape(
                  member.shirt_number ||
                  "10"
                )}
              </strong>
            </div>

            <div>
              <span>Piede</span>
              <strong>
                ${mpClubEscape(
                  member.preferred_foot ||
                  "Destro"
                )}
              </strong>
            </div>

            <div>
              <span>Stile profilo</span>
              <strong>
                ${mpClubEscape(
                  member.profile_style ||
                  "Equilibrato"
                )}
              </strong>
            </div>
          </div>

          <div class="mp-club-star-details">
            <div>
              <span>Piede debole</span>

              <strong>
                ${mpClubStars(
                  member.weak_foot ?? 3
                )}
              </strong>
            </div>

            <div>
              <span>Mosse abilità</span>

              <strong>
                ${mpClubStars(
                  member.skill_moves ?? 3
                )}
              </strong>
            </div>
          </div>

          <div class="mp-club-last-update">
            Ultimo aggiornamento:
            <strong>
              ${mpClubEscape(
                mpClubFormatDate(
                  member.last_seen_at
                )
              )}
            </strong>
          </div>
        </div>
      </div>

      <section class="mp-club-profile-ps-section">
        <div class="mp-club-profile-section-title">
          <div>
            <span>EQUIPAGGIAMENTO</span>
            <h3>PlayStyles</h3>
          </div>

          <strong>
            ${playstyles.length}
          </strong>
        </div>

        <div class="mp-club-ps-group">
          <h4>
            PlayStyle normali
            <span>${normalPlayStyles.length}</span>
          </h4>

          <div class="mp-club-ps-grid">
            ${
              normalPlayStyles.length
                ? normalPlayStyles
                    .map(mpClubPlayStyleItem)
                    .join("")
                : `
                  <div class="mp-club-empty-small">
                    Nessun PlayStyle normale equipaggiato.
                  </div>
                `
            }
          </div>
        </div>

        <div class="mp-club-ps-group">
          <h4>
            PlayStyle+
            <span>${plusPlayStyles.length}</span>
          </h4>

          <div class="mp-club-ps-grid">
            ${
              plusPlayStyles.length
                ? plusPlayStyles
                    .map(mpClubPlayStyleItem)
                    .join("")
                : `
                  <div class="mp-club-empty-small">
                    Nessun PlayStyle+ equipaggiato.
                  </div>
                `
            }
          </div>
        </div>
      </section>
    </section>
  `;

  document.body.appendChild(modal);
  document.body.classList.add(
    "mp-club-modal-open"
  );
}

function mpClubProfileStat(label, value) {
  return `
    <div>
      <strong>
        ${Math.round(
          mpClubClamp(value ?? 60, 0, 99)
        )}
      </strong>

      <span>${label}</span>
    </div>
  `;
}

function mpCloseClubMember() {
  const modal = document.getElementById(
    "mpClubMemberModal"
  );

  if (modal) {
    modal.remove();
  }

  document.body.classList.remove(
    "mp-club-modal-open"
  );
}


/* =========================================================
   PAGINA SENZA CLUB
   ========================================================= */

function mpRenderNoClub() {
  MP_CLUB_CURRENT = null;
  MP_CLUB_MEMBERS_CACHE = [];

  app.innerHTML = `
    <section class="section mp-club-page">
      <div class="page-head mp-club-page-head">
        <div>
          <span class="mp-club-eyebrow">
            MATCHPULSE ONLINE
          </span>

          <h2>Club</h2>

          <p>
            Crea una squadra oppure entra
            usando il codice di un amico.
          </p>
        </div>

        <div class="mp-club-head-icon">
          MP
        </div>
      </div>

      <div class="mp-club-entry-grid">
        <section class="mp-club-entry-card">
          <div class="mp-club-entry-number">
            01
          </div>

          <div class="mp-club-entry-copy">
            <span>NUOVA SQUADRA</span>
            <h3>Crea un Club</h3>

            <p>
              Scegli il nome. MatchPulse
              genererà automaticamente il
              codice da condividere.
            </p>
          </div>

          <form
            class="mp-club-form"
            onsubmit="mpCreateClub(event)"
          >
            <label for="mpClubName">
              Nome del Club
            </label>

            <input
              id="mpClubName"
              name="clubName"
              type="text"
              minlength="2"
              maxlength="40"
              placeholder="Esempio: FC Angritudi"
              autocomplete="off"
              required
            >

            <button
              type="submit"
              class="primary-btn full-btn"
            >
              CREA CLUB
            </button>
          </form>
        </section>

        <section class="mp-club-entry-card">
          <div class="mp-club-entry-number">
            02
          </div>

          <div class="mp-club-entry-copy">
            <span>CODICE INVITO</span>
            <h3>Entra in un Club</h3>

            <p>
              Inserisci il codice di sei
              caratteri ricevuto dal
              fondatore.
            </p>
          </div>

          <form
            class="mp-club-form"
            onsubmit="mpJoinClub(event)"
          >
            <label for="mpClubCode">
              Codice Club
            </label>

            <input
              id="mpClubCode"
              name="clubCode"
              class="mp-club-code-input"
              type="text"
              minlength="6"
              maxlength="6"
              placeholder="ABC234"
              autocomplete="off"
              spellcheck="false"
              required
              oninput="
                this.value =
                  this.value
                    .toUpperCase()
                    .replace(
                      /[^A-Z0-9]/g,
                      ''
                    )
              "
            >

            <button
              type="submit"
              class="secondary-btn full-btn"
            >
              ENTRA NEL CLUB
            </button>
          </form>
        </section>
      </div>

      <section class="mp-club-info-strip">
        <div>
          <strong>1</strong>
          <span>Club per giocatore</span>
        </div>

        <div>
          <strong>6</strong>
          <span>Caratteri nel codice</span>
        </div>

        <div>
          <strong>LIVE</strong>
          <span>Profili sincronizzati</span>
        </div>
      </section>
    </section>
  `;
}


/* =========================================================
   PAGINA DEL CLUB
   ========================================================= */

function mpRenderClub(
  club,
  members
) {
  const updatedTimes = members
    .map(member =>
      new Date(
        member.last_seen_at
      ).getTime()
    )
    .filter(Number.isFinite);

  const latestUpdate =
    updatedTimes.length
      ? new Date(
          Math.max(...updatedTimes)
        ).toISOString()
      : null;

  app.innerHTML = `
    <section class="section mp-club-page">
      <section class="mp-club-dashboard-head">
        <div class="mp-club-dashboard-copy">
          <span class="mp-club-eyebrow">
            IL TUO CLUB
          </span>

          <h2>
            ${mpClubEscape(
              club.club_name
            )}
          </h2>

          <div class="mp-club-code-row">
            <span>CODICE</span>

            <strong>
              ${mpClubEscape(
                club.club_code
              )}
            </strong>

            <button
              type="button"
              onclick="mpCopyClubCode()"
            >
              COPIA
            </button>
          </div>
        </div>

        <div class="mp-club-dashboard-actions">
          <button
            type="button"
            class="mp-club-refresh-btn"
            onclick="renderLockerRoom()"
          >
            AGGIORNA
          </button>

          <button
            type="button"
            class="mp-club-leave-btn"
            onclick="mpLeaveClub()"
          >
            ESCI
          </button>
        </div>
      </section>

      <section class="mp-club-summary">
        <div>
          <span>MEMBRI</span>
          <strong>${members.length}</strong>
        </div>

        <div>
          <span>FONDATORE</span>
          <strong>
            ${
              club.is_owner
                ? "TU"
                : "MEMBRO"
            }
          </strong>
        </div>

        <div>
          <span>ULTIMO AGGIORNAMENTO</span>
          <strong>
            ${mpClubEscape(
              mpClubFormatDate(
                latestUpdate
              )
            )}
          </strong>
        </div>
      </section>

      <section class="mp-club-roster-section">
        <div class="mp-club-roster-head">
          <div>
            <span>ROSA ONLINE</span>
            <h3>Membri del Club</h3>
          </div>

          <p>
            Premi una carta per aprire
            il profilo completo.
          </p>
        </div>

        <div class="mp-club-members-grid">
          ${
            members.length
              ? members
                  .map(member =>
                    mpClubMemberCard(
                      member,
                      club.owner_id
                    )
                  )
                  .join("")
              : `
                <div class="mp-club-empty">
                  Nessun membro trovato.
                </div>
              `
          }
        </div>
      </section>
    </section>
  `;
}


/* =========================================================
   CARICAMENTO PAGINA CLUB
   ========================================================= */

async function mpRenderClubPage() {
  app.innerHTML = `
    <section class="section mp-club-page">
      <div class="mp-club-loading">
        <div class="mp-club-loading-ball"></div>

        <strong>
          CARICAMENTO CLUB
        </strong>

        <span>
          Sincronizzazione con MatchPulse...
        </span>
      </div>
    </section>
  `;

  try {
    await mpEnsureClubAuth();

    const club =
      await mpGetMyClub();

    if (!club) {
      mpRenderNoClub();
      return;
    }

    MP_CLUB_CURRENT = club;

    await mpSyncMyClubProfile(
      club.club_id
    );

    const members =
      await mpFetchClubMembers(
        club.club_id
      );

    MP_CLUB_MEMBERS_CACHE =
      members;

    mpRenderClub(
      club,
      members
    );
  } catch (error) {
    console.error(
      "ERRORE PAGINA CLUB:",
      error
    );

    app.innerHTML = `
      <section class="section mp-club-page">
        <div class="mp-club-error">
          <strong>
            Impossibile caricare il Club
          </strong>

          <p>
            ${mpClubEscape(
              error?.message ||
              "Errore sconosciuto"
            )}
          </p>

          <button
            type="button"
            class="primary-btn"
            onclick="renderLockerRoom()"
          >
            RIPROVA
          </button>
        </div>
      </section>
    `;
  }
}


/* =========================================================
   DISATTIVA IL VECCHIO SISTEMA REPORT
   ========================================================= */

async function publishMatchToLockerRoom() {
  mpClubToast(
    "Le partite non devono più essere pubblicate: il profilo Club si aggiorna automaticamente."
  );
}


/* =========================================================
   COLLEGAMENTI GLOBALI
   ========================================================= */

renderLockerRoom = mpRenderClubPage;

window.renderLockerRoom =
  mpRenderClubPage;

window.mpCreateClub =
  mpCreateClub;

window.mpJoinClub =
  mpJoinClub;

window.mpLeaveClub =
  mpLeaveClub;

window.mpCopyClubCode =
  mpCopyClubCode;

window.mpOpenClubMember =
  mpOpenClubMember;

window.mpCloseClubMember =
  mpCloseClubMember;

window.mpSyncMyClubProfile =
  mpSyncMyClubProfile;

window.publishMatchToLockerRoom =
  publishMatchToLockerRoom;


/* Chiusura profilo con ESC */

if (!window.MP_CLUB_ESCAPE_READY) {
  window.MP_CLUB_ESCAPE_READY = true;

  document.addEventListener(
    "keydown",
    event => {
      if (event.key === "Escape") {
        mpCloseClubMember();
      }
    }
  );
}

/* =========================================================
   MATCHPULSE PATCH
   FOTO CLUB + PIEDE DEBOLE + MOSSE ABILITÀ
   INCOLLA ALLA FINE DI app.js
   ========================================================= */

(function () {
  if (window.MP_AVATAR_STARS_PATCH_READY) {
    return;
  }

  window.MP_AVATAR_STARS_PATCH_READY = true;

  var MP_AVATAR_BUCKET =
    "matchpulse-avatars";

  var MP_AVATAR_CACHE_KEY =
    "matchpulse_avatar_sync_v1";


  /* =======================================================
     STELLE: FUNZIONI BASE
     ======================================================= */

  function mpAbilityClamp(value) {
    var number = Math.round(
      Number(value) || 3
    );

    return Math.max(
      1,
      Math.min(5, number)
    );
  }

  function mpAbilityStarsHtml(value) {
    var amount =
      mpAbilityClamp(value);

    return `
      <span class="mp-ability-stars-on">
        ${"★".repeat(amount)}
      </span>

      <span class="mp-ability-stars-off">
        ${"★".repeat(5 - amount)}
      </span>
    `;
  }


  /* =======================================================
     AGGIUNGE I VALORI AL PROFILO
     ======================================================= */

  var mpPreviousGetPlayerProfile =
    getPlayerProfile;

  getPlayerProfile = function () {
    var profile =
      mpPreviousGetPlayerProfile();

    var saved = {};

    try {
      saved = JSON.parse(
        localStorage.getItem(
          "matchpulse_player_profile"
        ) || "{}"
      );
    } catch (error) {
      saved = {};
    }

    return {
      ...profile,

      weakFoot: mpAbilityClamp(
        saved.weakFoot ??
        profile.weakFoot ??
        3
      ),

      skillMoves: mpAbilityClamp(
        saved.skillMoves ??
        profile.skillMoves ??
        3
      )
    };
  };

  window.getPlayerProfile =
    getPlayerProfile;


  /* =======================================================
     CONTROLLI STELLE NEL PROFILO
     ======================================================= */

  function mpProfileStarControl(
    fieldName,
    label,
    value
  ) {
    var selected =
      mpAbilityClamp(value);

    var buttons = "";

    for (
      var star = 1;
      star <= 5;
      star++
    ) {
      buttons += `
        <button
          type="button"
          class="
            mp-profile-star-button
            ${star <= selected
              ? "is-active"
              : ""}
          "
          data-value="${star}"
          aria-pressed="${
            star <= selected
              ? "true"
              : "false"
          }"
          onclick="
            mpSetProfileStars(
              '${fieldName}',
              ${star}
            )
          "
        >
          ★
        </button>
      `;
    }

    return `
      <div
        class="mp-profile-star-field"
        data-star-name="${fieldName}"
      >
        <div class="mp-profile-star-head">
          <label>${label}</label>

          <strong
            data-star-number="${fieldName}"
          >
            ${selected}/5
          </strong>
        </div>

        <input
          type="hidden"
          name="${fieldName}"
          value="${selected}"
        >

        <div class="mp-profile-star-buttons">
          ${buttons}
        </div>
      </div>
    `;
  }

  function mpSetProfileStars(
    fieldName,
    value
  ) {
    var form = document.querySelector(
      ".profile-setup-form"
    );

    if (!form) {
      return;
    }

    var selected =
      mpAbilityClamp(value);

    var field =
      form.querySelector(
        `[data-star-name="${fieldName}"]`
      );

    var input =
      form.elements[fieldName];

    if (input) {
      input.value = selected;
    }

    if (!field) {
      return;
    }

    var numberLabel =
      field.querySelector(
        `[data-star-number="${fieldName}"]`
      );

    if (numberLabel) {
      numberLabel.textContent =
        `${selected}/5`;
    }

    field
      .querySelectorAll(
        ".mp-profile-star-button"
      )
      .forEach(button => {
        var buttonValue =
          Number(
            button.dataset.value
          );

        var active =
          buttonValue <= selected;

        button.classList.toggle(
          "is-active",
          active
        );

        button.setAttribute(
          "aria-pressed",
          active ? "true" : "false"
        );
      });
  }

  window.mpSetProfileStars =
    mpSetProfileStars;


  function mpInsertProfileStarFields() {
    var form = document.querySelector(
      ".profile-setup-form"
    );

    if (
      !form ||
      form.querySelector(
        ".mp-profile-star-grid"
      )
    ) {
      return;
    }

    var profile =
      getPlayerProfile();

    var submitButton =
      form.querySelector(
        'button[type="submit"]'
      );

    if (!submitButton) {
      return;
    }

    submitButton.insertAdjacentHTML(
      "beforebegin",
      `
        <section class="mp-profile-star-section">
          <div class="mp-profile-star-title">
            <span>CARATTERISTICHE</span>
            <h3>Abilità giocatore</h3>
          </div>

          <div class="mp-profile-star-grid">
            ${mpProfileStarControl(
              "weakFoot",
              "Piede debole",
              profile.weakFoot
            )}

            ${mpProfileStarControl(
              "skillMoves",
              "Mosse abilità",
              profile.skillMoves
            )}
          </div>
        </section>
      `
    );
  }


  /* Avvolge la pagina profilo esistente */

  var mpPreviousRenderProfileSetup =
    renderProfileSetup;

  renderProfileSetup = function (
    editMode = false
  ) {
    mpPreviousRenderProfileSetup(
      editMode
    );

    mpInsertProfileStarFields();
  };

  window.renderProfileSetup =
    renderProfileSetup;


  /* =======================================================
     SALVATAGGIO PROFILO CON STELLE
     ======================================================= */

  function mpProfileFieldValue(
    form,
    fieldName,
    fallback
  ) {
    var field =
      form.elements[fieldName];

    if (!field) {
      return fallback;
    }

    return field.value;
  }

  savePlayerProfile = function (event) {
    event.preventDefault();

    var form =
      event.currentTarget ||
      event.target;

    var current =
      getPlayerProfile();

    var selectedPhoto =
      typeof pendingProfilePhoto !==
        "undefined" &&
      pendingProfilePhoto
        ? pendingProfilePhoto
        : current.photo;

    var profile = {
      ...current,

      name:
        String(
          mpProfileFieldValue(
            form,
            "name",
            current.name
          )
        ).trim() || "PLAYER",

      role:
        String(
          mpProfileFieldValue(
            form,
            "role",
            current.role
          )
        )
          .trim()
          .toUpperCase()
          .slice(0, 15) || "CC",

      shirtNumber:
        String(
          mpProfileFieldValue(
            form,
            "shirtNumber",
            current.shirtNumber
          )
        ).trim() || "10",

      foot:
        String(
          mpProfileFieldValue(
            form,
            "foot",
            current.foot
          )
        ),

      playStyle:
        String(
          mpProfileFieldValue(
            form,
            "playStyle",
            current.playStyle
          )
        ),

      team:
        String(
          mpProfileFieldValue(
            form,
            "team",
            current.team || ""
          )
        ).trim(),

      photo:
        selectedPhoto ||
        "profile.jpg",

      photoX:
        Number(
          mpProfileFieldValue(
            form,
            "photoX",
            current.photoX
          )
        ),

      photoY:
        Number(
          mpProfileFieldValue(
            form,
            "photoY",
            current.photoY
          )
        ),

      photoZoom:
        Number(
          mpProfileFieldValue(
            form,
            "photoZoom",
            current.photoZoom
          )
        ),

      weakFoot:
        mpAbilityClamp(
          mpProfileFieldValue(
            form,
            "weakFoot",
            current.weakFoot
          )
        ),

      skillMoves:
        mpAbilityClamp(
          mpProfileFieldValue(
            form,
            "skillMoves",
            current.skillMoves
          )
        ),

      completed: true
    };

    savePlayerProfileData(profile);

    if (
      typeof toast === "function"
    ) {
      toast("Profilo salvato");
    }

    setRoute("home");

    /*
      Se il giocatore è già dentro
      un Club, aggiorna anche Supabase.
    */

    setTimeout(async function () {
      try {
        if (
          typeof mpGetMyClub !==
          "function"
        ) {
          return;
        }

        var club =
          await mpGetMyClub();

        if (
          club &&
          club.club_id &&
          typeof mpSyncMyClubProfile ===
            "function"
        ) {
          await mpSyncMyClubProfile(
            club.club_id
          );
        }
      } catch (error) {
        console.warn(
          "Sincronizzazione profilo Club:",
          error
        );
      }
    }, 0);
  };

  window.savePlayerProfile =
    savePlayerProfile;


  /* =======================================================
     STELLE SULLA CARTA PRINCIPALE
     ======================================================= */

  var mpPreviousPlayerCard =
    playerCard;

  playerCard = function (rating) {
    var html =
      mpPreviousPlayerCard(rating);

    if (
      html.includes(
        "mp-card-ability-stars"
      )
    ) {
      return html;
    }

    var profile =
      getPlayerProfile();

    var abilityHtml = `
      <div class="mp-card-ability-stars">
        <div>
          <span>PIEDE DEBOLE</span>

          <strong>
            ${mpAbilityStarsHtml(
              profile.weakFoot
            )}
          </strong>
        </div>

        <div>
          <span>MOSSE ABILITÀ</span>

          <strong>
            ${mpAbilityStarsHtml(
              profile.skillMoves
            )}
          </strong>
        </div>
      </div>
    `;

    if (
      html.includes(
        '<div class="player-stats">'
      )
    ) {
      return html.replace(
        '<div class="player-stats">',
        `
          ${abilityHtml}
          <div class="player-stats">
        `
      );
    }

    return html.replace(
      "</article>",
      `
        ${abilityHtml}
      </article>
      `
    );
  };

  window.playerCard =
    playerCard;


  /* =======================================================
     CONVERSIONE FOTO LOCALE IN FILE
     ======================================================= */

  function mpAvatarHash(value) {
    var text =
      String(value || "");

    var hash = 2166136261;

    for (
      var index = 0;
      index < text.length;
      index++
    ) {
      hash ^= text.charCodeAt(index);

      hash = Math.imul(
        hash,
        16777619
      );
    }

    return (
      hash >>> 0
    ).toString(16);
  }

  function mpDataUrlToBlob(dataUrl) {
    var parts =
      String(dataUrl).split(",");

    if (parts.length !== 2) {
      throw new Error(
        "Formato foto non valido"
      );
    }

    var mimeMatch =
      parts[0].match(
        /data:(.*?);base64/
      );

    var mimeType =
      mimeMatch?.[1] ||
      "image/jpeg";

    var binary =
      atob(parts[1]);

    var bytes =
      new Uint8Array(
        binary.length
      );

    for (
      var index = 0;
      index < binary.length;
      index++
    ) {
      bytes[index] =
        binary.charCodeAt(index);
    }

    return new Blob(
      [bytes],
      {
        type: mimeType
      }
    );
  }

  function mpReadAvatarCache() {
    try {
      return JSON.parse(
        localStorage.getItem(
          MP_AVATAR_CACHE_KEY
        ) || "{}"
      );
    } catch (error) {
      return {};
    }
  }

  function mpSaveAvatarCache(data) {
    localStorage.setItem(
      MP_AVATAR_CACHE_KEY,
      JSON.stringify(data)
    );
  }

  function mpAvatarExtension(mimeType) {
    if (
      mimeType === "image/png"
    ) {
      return "png";
    }

    if (
      mimeType === "image/webp"
    ) {
      return "webp";
    }

    return "jpg";
  }


  /* =======================================================
     CARICA LA FOTO SU SUPABASE STORAGE
     ======================================================= */

  async function mpSyncClubAvatar(
    user
  ) {
    var profile =
      getPlayerProfile();

    var source =
      String(
        profile.photo || ""
      );

    var cache =
      mpReadAvatarCache();

    /*
      profile.jpg è la foto predefinita:
      non deve essere caricata.
    */

    if (
      !source.startsWith(
        "data:image/"
      )
    ) {
      if (
        cache.userId === user.id &&
        cache.path
      ) {
        return cache.path;
      }

      return null;
    }

    var signature =
      mpAvatarHash(source);

    if (
      cache.userId === user.id &&
      cache.signature === signature &&
      cache.path
    ) {
      return cache.path;
    }

    var blob =
      mpDataUrlToBlob(source);

    var extension =
      mpAvatarExtension(
        blob.type
      );

    var filePath =
      `${user.id}/avatar-${signature}.${extension}`;

    var uploadResult =
      await matchpulseSupabase
        .storage
        .from(MP_AVATAR_BUCKET)
        .upload(
          filePath,
          blob,
          {
            cacheControl: "3600",
            contentType:
              blob.type ||
              "image/jpeg",
            upsert: true
          }
        );

    if (uploadResult.error) {
      throw uploadResult.error;
    }

    /*
      Elimina la vecchia versione dopo
      che la nuova è stata caricata.
    */

    if (
      cache.userId === user.id &&
      cache.path &&
      cache.path !== filePath
    ) {
      try {
        await matchpulseSupabase
          .storage
          .from(MP_AVATAR_BUCKET)
          .remove([
            cache.path
          ]);
      } catch (error) {
        console.warn(
          "Vecchia foto non eliminata:",
          error
        );
      }
    }

    mpSaveAvatarCache({
      userId: user.id,
      signature: signature,
      path: filePath
    });

    return filePath;
  }


  /* =======================================================
     URL PUBBLICO DELLA FOTO
     ======================================================= */

  function mpClubAvatarPublicUrl(
    member
  ) {
    var path =
      String(
        member?.avatar_path || ""
      );

    if (
      !path ||
      !matchpulseSupabase
    ) {
      return "";
    }

    var result =
      matchpulseSupabase
        .storage
        .from(MP_AVATAR_BUCKET)
        .getPublicUrl(path);

    return (
      result?.data?.publicUrl ||
      ""
    );
  }

  window.mpClubAvatarPublicUrl =
    mpClubAvatarPublicUrl;

  /*
    getPublicUrl crea l'indirizzo della
    foto dentro il bucket pubblico.
  */


  /* =======================================================
     SINCRONIZZAZIONE PROFILO CLUB COMPLETA
     ======================================================= */

  mpSyncMyClubProfile =
    async function (clubId) {
      var user =
        await mpEnsureClubAuth();

      var profile =
        mpClubGetProfile();

      var cardStats =
        mpClubGetCardStats();

      var ovr =
        mpClubCalculateOvr(
          cardStats
        );

      var playstyles =
        mpClubGetPlayStylesData();

      var avatarPath = null;

      try {
        avatarPath =
          await mpSyncClubAvatar(
            user
          );
      } catch (error) {
        console.error(
          "ERRORE FOTO CLUB:",
          error
        );

        if (
          typeof mpClubToast ===
          "function"
        ) {
          mpClubToast(
            "Profilo aggiornato, ma foto non sincronizzata"
          );
        }
      }

      var memberUpdate = {
        player_name:
          profile.name,

        role:
          profile.role,

        ovr: ovr,

        tier:
          mpClubTierFromOvr(ovr),

        shirt_number:
          profile.shirtNumber,

        preferred_foot:
          profile.foot,

        profile_style:
          profile.playStyle,

        weak_foot:
          mpAbilityClamp(
            profile.weakFoot
          ),

        skill_moves:
          mpAbilityClamp(
            profile.skillMoves
          ),

        card_stats:
          cardStats,

        playstyles:
          playstyles,

        photo_x:
          profile.photoX,

        photo_y:
          profile.photoY,

        photo_zoom:
          profile.photoZoom,

        last_seen_at:
          new Date().toISOString()
      };

      /*
        Non cancella una foto esistente
        quando non c'è un nuovo upload.
      */

      if (
        typeof avatarPath ===
        "string"
      ) {
        memberUpdate.avatar_path =
          avatarPath;
      }

      var result =
        await matchpulseSupabase
          .from(
            "matchpulse_club_members"
          )
          .update(memberUpdate)
          .eq("club_id", clubId)
          .eq("user_id", user.id);

      if (result.error) {
        throw result.error;
      }

      return memberUpdate;
    };

  window.mpSyncMyClubProfile =
    mpSyncMyClubProfile;


  /* =======================================================
     RECUPERA ANCHE POSIZIONE E ZOOM FOTO
     ======================================================= */

  mpFetchClubMembers =
    async function (clubId) {
      var result =
        await matchpulseSupabase
          .from(
            "matchpulse_club_members"
          )
          .select(`
            club_id,
            user_id,
            player_name,
            role,
            ovr,
            tier,
            shirt_number,
            preferred_foot,
            profile_style,
            weak_foot,
            skill_moves,
            card_stats,
            playstyles,
            avatar_path,
            photo_x,
            photo_y,
            photo_zoom,
            joined_at,
            updated_at,
            last_seen_at
          `)
          .eq("club_id", clubId)
          .order(
            "ovr",
            {
              ascending: false
            }
          )
          .order(
            "player_name",
            {
              ascending: true
            }
          );

      if (result.error) {
        throw result.error;
      }

      return Array.isArray(
        result.data
      )
        ? result.data
        : [];
    };

  window.mpFetchClubMembers =
    mpFetchClubMembers;


  /* =======================================================
     FOTO NELLA CARTA RIDOTTA DEL CLUB
     ======================================================= */

  var mpPreviousClubMemberCard =
    mpClubMemberCard;

  mpClubMemberCard = function (
    member,
    ownerId
  ) {
    var html =
      mpPreviousClubMemberCard(
        member,
        ownerId
      );

    var photoUrl =
      mpClubAvatarPublicUrl(
        member
      );

    if (!photoUrl) {
      return html;
    }

    var initials =
      mpClubInitials(
        member.player_name
      );

    var photoX =
      Number(
        member.photo_x ?? 50
      );

    var photoY =
      Number(
        member.photo_y ?? 8
      );

    var photoZoom =
      Number(
        member.photo_zoom ?? 1.02
      );

    var replacement = `
      <div class="mp-club-member-avatar">
        <img
          src="${mpClubEscape(
            photoUrl
          )}"
          alt="${mpClubEscape(
            member.player_name ||
            "Giocatore"
          )}"
          style="
            object-position:
              ${photoX}% ${photoY}%;
            transform:
              scale(${photoZoom});
          "
          onerror="
            this.remove();
            this.parentElement.textContent =
              '${mpClubEscape(initials)}';
          "
        >
      </div>
    `;

    return html.replace(
      /<div class="mp-club-member-avatar">[\s\S]*?<\/div>/,
      replacement
    );
  };

  window.mpClubMemberCard =
    mpClubMemberCard;


  /* =======================================================
     FOTO NEL PROFILO COMPLETO DEL MEMBRO
     ======================================================= */

  var mpPreviousOpenClubMember =
    mpOpenClubMember;

  mpOpenClubMember = function (
    userId
  ) {
    mpPreviousOpenClubMember(
      userId
    );

    var member =
      MP_CLUB_MEMBERS_CACHE.find(
        item =>
          item.user_id === userId
      );

    if (!member) {
      return;
    }

    var photoUrl =
      mpClubAvatarPublicUrl(
        member
      );

    if (!photoUrl) {
      return;
    }

    var avatar =
      document.querySelector(
        "#mpClubMemberModal " +
        ".mp-club-profile-avatar"
      );

    if (!avatar) {
      return;
    }

    var initials =
      mpClubInitials(
        member.player_name
      );

    var photoX =
      Number(
        member.photo_x ?? 50
      );

    var photoY =
      Number(
        member.photo_y ?? 8
      );

    var photoZoom =
      Number(
        member.photo_zoom ?? 1.02
      );

    avatar.innerHTML = `
      <img
        src="${mpClubEscape(
          photoUrl
        )}"
        alt="${mpClubEscape(
          member.player_name ||
          "Giocatore"
        )}"
        style="
          object-position:
            ${photoX}% ${photoY}%;
          transform:
            scale(${photoZoom});
        "
        onerror="
          this.remove();
          this.parentElement.textContent =
            '${mpClubEscape(initials)}';
        "
      >
    `;
  };

  window.mpOpenClubMember =
    mpOpenClubMember;
})();

/* =========================================================
   MATCHPULSE PATCH V2
   BADGE ABILITÀ PREMIUM + FIX FOTO CLUB
   INCOLLA ALLA FINE DI app.js
   ========================================================= */

(function () {
  if (window.MP_CLUB_VISUAL_FIX_V2) {
    return;
  }

  window.MP_CLUB_VISUAL_FIX_V2 = true;

  const MP_AVATAR_BUCKET_V2 =
    "matchpulse-avatars";


  /* =======================================================
     VALORI ABILITÀ
     ======================================================= */

  function mpPolishAbilityValue(value) {
    const number = Math.round(
      Number(value) || 3
    );

    return Math.max(
      1,
      Math.min(5, number)
    );
  }


  /* =======================================================
     CINQUE STELLE UNITE NEL PROFILO CLUB
     ======================================================= */

  function mpPolishClubStars(value) {
    const amount =
      mpPolishAbilityValue(value);

    let stars = "";

    for (
      let index = 1;
      index <= 5;
      index++
    ) {
      stars += `
        <span class="
          mp-club-single-star
          ${index <= amount
            ? "is-active"
            : ""}
        ">
          ★
        </span>
      `;
    }

    return `
      <span
        class="mp-club-unified-stars"
        aria-label="${amount} stelle su 5"
      >
        ${stars}
      </span>
    `;
  }

  mpClubStars =
    mpPolishClubStars;

  window.mpClubStars =
    mpPolishClubStars;


  /* =======================================================
     INDICATORE A CINQUE LIVELLI DELLA CARTA
     ======================================================= */

  function mpCardAbilityMeter(value) {
    const amount =
      mpPolishAbilityValue(value);

    let segments = "";

    for (
      let index = 1;
      index <= 5;
      index++
    ) {
      segments += `
        <i class="${
          index <= amount
            ? "is-active"
            : ""
        }"></i>
      `;
    }

    return segments;
  }

  function mpCardAbilityFeature(
    code,
    label,
    value
  ) {
    const amount =
      mpPolishAbilityValue(value);

    return `
      <div class="mp-card-feature">
        <div class="mp-card-feature-code">
          ${code}
        </div>

        <div class="mp-card-feature-main">
          <span>${label}</span>

          <div class="mp-card-feature-value">
            <strong>${amount}</strong>
            <b>★</b>
          </div>

          <div class="mp-card-feature-meter">
            ${mpCardAbilityMeter(amount)}
          </div>
        </div>
      </div>
    `;
  }


  /* =======================================================
     NUOVI BADGE SULLA CARTA
     ======================================================= */

  if (
    typeof playerCard === "function"
  ) {
    const mpCardBeforePolish =
      playerCard;

    playerCard = function (rating) {
      let html =
        mpCardBeforePolish(rating);

      if (
        html.includes(
          "mp-card-premium-features"
        )
      ) {
        return html;
      }

      const profile =
        getPlayerProfile();

      const features = `
        <div class="mp-card-premium-features">
          ${mpCardAbilityFeature(
            "WF",
            "PIEDE DEBOLE",
            profile.weakFoot
          )}

          ${mpCardAbilityFeature(
            "SM",
            "MOSSE ABILITÀ",
            profile.skillMoves
          )}
        </div>
      `;

      if (
        html.includes(
          '<div class="player-stats">'
        )
      ) {
        return html.replace(
          '<div class="player-stats">',
          `
            ${features}
            <div class="player-stats">
          `
        );
      }

      return html.replace(
        "</article>",
        `
          ${features}
        </article>
        `
      );
    };

    window.playerCard =
      playerCard;
  }


  /* =======================================================
     HASH DELLA FOTO
     ======================================================= */

  function mpClubPhotoHash(value) {
    const text =
      String(value || "");

    let hash = 2166136261;

    /*
      Per foto molto grandi legge dei
      campioni senza rallentare l'app.
    */

    const step = Math.max(
      1,
      Math.floor(
        text.length / 25000
      )
    );

    for (
      let index = 0;
      index < text.length;
      index += step
    ) {
      hash ^= text.charCodeAt(index);

      hash = Math.imul(
        hash,
        16777619
      );
    }

    hash ^= text.length;

    return (
      hash >>> 0
    ).toString(16);
  }


  /* =======================================================
     DATA URL → BLOB
     ======================================================= */

  function mpClubDataUrlToBlob(
    dataUrl
  ) {
    const parts =
      String(dataUrl).split(",");

    if (parts.length < 2) {
      throw new Error(
        "Formato della foto non valido"
      );
    }

    const header = parts[0];
    const content =
      parts.slice(1).join(",");

    const mimeMatch =
      header.match(
        /data:(.*?)(;|$)/
      );

    const mimeType =
      mimeMatch?.[1] ||
      "image/jpeg";

    let bytes;

    if (
      header.includes(";base64")
    ) {
      const binary =
        atob(content);

      bytes =
        new Uint8Array(
          binary.length
        );

      for (
        let index = 0;
        index < binary.length;
        index++
      ) {
        bytes[index] =
          binary.charCodeAt(index);
      }
    } else {
      const decoded =
        decodeURIComponent(content);

      bytes =
        new TextEncoder()
          .encode(decoded);
    }

    return new Blob(
      [bytes],
      {
        type: mimeType
      }
    );
  }


  /* =======================================================
     QUALSIASI SORGENTE FOTO → BLOB
     ======================================================= */

  async function mpClubPhotoToBlob(
    source
  ) {
    const value =
      String(source || "").trim();

    if (!value) {
      return null;
    }

    const cleanValue =
      value
        .split("?")[0]
        .toLowerCase();

    /*
      Non carica la foto predefinita.
    */

    if (
      cleanValue === "profile.jpg" ||
      cleanValue.endsWith(
        "/profile.jpg"
      )
    ) {
      return null;
    }

    if (
      value.startsWith(
        "data:image/"
      )
    ) {
      return mpClubDataUrlToBlob(
        value
      );
    }

    /*
      Supporta anche blob URL,
      indirizzi HTTP e file locali
      appartenenti alla web app.
    */

    const response =
      await fetch(value);

    if (!response.ok) {
      throw new Error(
        `Foto non leggibile: ${response.status}`
      );
    }

    const blob =
      await response.blob();

    if (
      !String(blob.type)
        .startsWith("image/")
    ) {
      throw new Error(
        "Il file selezionato non è un'immagine"
      );
    }

    return blob;
  }

  function mpClubPhotoExtension(
    mimeType
  ) {
    const type =
      String(mimeType || "")
        .toLowerCase();

    if (
      type.includes("png")
    ) {
      return "png";
    }

    if (
      type.includes("webp")
    ) {
      return "webp";
    }

    return "jpg";
  }


  /* =======================================================
     UPLOAD FORZATO FOTO
     ======================================================= */

  async function mpUploadMyClubPhoto(
    user
  ) {
    const profile =
      getPlayerProfile();

    const source =
      String(
        profile.photo || ""
      );

    const blob =
      await mpClubPhotoToBlob(
        source
      );

    if (!blob) {
      return "";
    }

    const extension =
      mpClubPhotoExtension(
        blob.type
      );

    const signature =
      mpClubPhotoHash(source);

    const path =
      `${user.id}/avatar-${signature}.${extension}`;

    const {
      data,
      error
    } =
      await matchpulseSupabase
        .storage
        .from(
          MP_AVATAR_BUCKET_V2
        )
        .upload(
          path,
          blob,
          {
            cacheControl: "3600",
            contentType:
              blob.type ||
              "image/jpeg",
            upsert: true
          }
        );

    if (error) {
      console.error(
        "UPLOAD AVATAR COMPLETO:",
        error
      );

      throw error;
    }

    return data?.path || path;
  }


  /* =======================================================
     SINCRONIZZAZIONE COMPLETA PROFILO
     ======================================================= */

  mpSyncMyClubProfile =
    async function (clubId) {
      const user =
        await mpEnsureClubAuth();

      const profile =
        mpClubGetProfile();

      const cardStats =
        mpClubGetCardStats();

      const ovr =
        mpClubCalculateOvr(
          cardStats
        );

      const playstyles =
        mpClubGetPlayStylesData();

      let avatarPath = "";
      let avatarError = null;

      try {
        avatarPath =
          await mpUploadMyClubPhoto(
            user
          );
      } catch (error) {
        avatarError = error;

        console.error(
          "ERRORE SINCRONIZZAZIONE FOTO:",
          error
        );
      }

      const updateData = {
        player_name:
          profile.name,

        role:
          profile.role,

        ovr: ovr,

        tier:
          mpClubTierFromOvr(ovr),

        shirt_number:
          profile.shirtNumber,

        preferred_foot:
          profile.foot,

        profile_style:
          profile.playStyle,

        weak_foot:
          mpPolishAbilityValue(
            profile.weakFoot
          ),

        skill_moves:
          mpPolishAbilityValue(
            profile.skillMoves
          ),

        card_stats:
          cardStats,

        playstyles:
          playstyles,

        photo_x:
          profile.photoX,

        photo_y:
          profile.photoY,

        photo_zoom:
          profile.photoZoom,

        last_seen_at:
          new Date().toISOString()
      };

      /*
        Non cancella la vecchia foto
        quando non ne è stata scelta una.
      */

      if (avatarPath) {
        updateData.avatar_path =
          avatarPath;
      }

      const {
        error
      } =
        await matchpulseSupabase
          .from(
            "matchpulse_club_members"
          )
          .update(updateData)
          .eq(
            "club_id",
            clubId
          )
          .eq(
            "user_id",
            user.id
          );

      if (error) {
        throw error;
      }

      if (avatarError) {
        mpClubToast(
          `Profilo aggiornato, foto non caricata: ${
            avatarError.message ||
            "errore Storage"
          }`
        );
      }

      return updateData;
    };

  window.mpSyncMyClubProfile =
    mpSyncMyClubProfile;


  /* =======================================================
     RIPARAZIONE MANUALE FOTO
     ======================================================= */

  async function mpRepairClubPhoto() {
    try {
      const club =
        await mpGetMyClub();

      if (!club?.club_id) {
        mpClubToast(
          "Non sei ancora dentro un Club"
        );
        return;
      }

      mpClubToast(
        "Caricamento foto in corso..."
      );

      await mpSyncMyClubProfile(
        club.club_id
      );

      await renderLockerRoom();

      mpClubToast(
        "Foto Club aggiornata"
      );
    } catch (error) {
      console.error(
        "RIPARAZIONE FOTO CLUB:",
        error
      );

      mpClubToast(
        error?.message ||
        "Errore caricamento foto"
      );

      throw error;
    }
  }

  window.mpRepairClubPhoto =
    mpRepairClubPhoto;
})();

/* =========================================================
   MATCHPULSE - FIX FOTO CLUB V3
   FOTO AFFIDABILE + STELLE PROFILO UNITE
   ========================================================= */

(function () {
  if (window.MP_CLUB_FIX_V3_READY) {
    return;
  }

  window.MP_CLUB_FIX_V3_READY = true;

  const MP_CLUB_AVATAR_BUCKET =
    "matchpulse-avatars";


  /* =======================================================
     SUPPORTO STELLE
     ======================================================= */

  function mpV3StarValue(value) {
    const number = Math.round(
      Number(value) || 3
    );

    return Math.max(
      1,
      Math.min(5, number)
    );
  }

  function mpV3Stars(value) {
    const amount =
      mpV3StarValue(value);

    let html = "";

    for (
      let index = 1;
      index <= 5;
      index++
    ) {
      html += `
        <span class="
          mp-club-single-star
          ${index <= amount
            ? "is-active"
            : ""}
        ">★</span>
      `;
    }

    return `
      <span class="mp-club-unified-stars">
        ${html}
      </span>
    `;
  }

  mpClubStars = mpV3Stars;
  window.mpClubStars = mpV3Stars;


  /* =======================================================
     TIMEOUT PER EVITARE PROMISE INFINITA
     ======================================================= */

  function mpV3Timeout(
    promise,
    milliseconds,
    message
  ) {
    return Promise.race([
      promise,

      new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(
            new Error(message)
          );
        }, milliseconds);
      })
    ]);
  }


  /* =======================================================
     DATA URL IN BLOB
     ======================================================= */

  function mpV3DataUrlToBlob(dataUrl) {
    const parts =
      String(dataUrl).split(",");

    if (parts.length < 2) {
      throw new Error(
        "Formato della foto non valido"
      );
    }

    const header = parts[0];

    const content =
      parts.slice(1).join(",");

    const mimeMatch =
      header.match(
        /data:(.*?)(;|$)/
      );

    const mimeType =
      mimeMatch?.[1] ||
      "image/jpeg";

    const binary =
      atob(content);

    const bytes =
      new Uint8Array(
        binary.length
      );

    for (
      let index = 0;
      index < binary.length;
      index++
    ) {
      bytes[index] =
        binary.charCodeAt(index);
    }

    return new Blob(
      [bytes],
      {
        type: mimeType
      }
    );
  }


  /* =======================================================
     RECUPERA IL FILE DELLA FOTO
     ======================================================= */

  async function mpV3PhotoBlob(source) {
    const value =
      String(source || "").trim();

    if (
      !value ||
      value === "profile.jpg" ||
      value.endsWith("/profile.jpg")
    ) {
      throw new Error(
        "Nel profilo è ancora impostata la foto predefinita"
      );
    }

    if (
      value.startsWith(
        "data:image/"
      )
    ) {
      return mpV3DataUrlToBlob(
        value
      );
    }

    const response =
      await mpV3Timeout(
        fetch(value),
        15000,
        "Lettura della foto scaduta"
      );

    if (!response.ok) {
      throw new Error(
        `Foto non leggibile: ${response.status}`
      );
    }

    const blob =
      await response.blob();

    if (
      !String(blob.type)
        .startsWith("image/")
    ) {
      throw new Error(
        "Il file del profilo non è un'immagine"
      );
    }

    return blob;
  }

  function mpV3Extension(type) {
    const mime =
      String(type || "")
        .toLowerCase();

    if (mime.includes("png")) {
      return "png";
    }

    if (mime.includes("webp")) {
      return "webp";
    }

    return "jpg";
  }


  /* =======================================================
     URL PUBBLICO
     ======================================================= */

  function mpV3PublicAvatarUrl(
    member
  ) {
    const path =
      String(
        member?.avatar_path || ""
      );

    if (!path) {
      return "";
    }

    const result =
      matchpulseSupabase
        .storage
        .from(
          MP_CLUB_AVATAR_BUCKET
        )
        .getPublicUrl(path);

    const url =
      result?.data?.publicUrl || "";

    if (!url) {
      return "";
    }

    return `${url}?v=${
      encodeURIComponent(
        member.updated_at ||
        member.last_seen_at ||
        Date.now()
      )
    }`;
  }

  window.mpV3PublicAvatarUrl =
    mpV3PublicAvatarUrl;


  /* =======================================================
     CARICA E SALVA LA FOTO
     ======================================================= */

  async function mpRepairClubPhotoNow() {
    const user =
      await mpEnsureClubAuth();

    const club =
      await mpGetMyClub();

    if (!club?.club_id) {
      throw new Error(
        "Non sei ancora dentro un Club"
      );
    }

    const profile =
      getPlayerProfile();

    console.log(
      "FOTO LOCALE PROFILO:",
      profile.photo
        ? String(profile.photo)
            .slice(0, 80)
        : "vuota"
    );

    const blob =
      await mpV3PhotoBlob(
        profile.photo
      );

    console.log(
      "DIMENSIONE FOTO:",
      Math.round(
        blob.size / 1024
      ),
      "KB"
    );

    const extension =
      mpV3Extension(blob.type);

    /*
      Nome sempre nuovo:
      non dipende dall'upsert e non resta
      bloccato su una versione precedente.
    */

    const avatarPath =
      `${user.id}/avatar-${Date.now()}.${extension}`;

    const uploadResult =
      await mpV3Timeout(
        matchpulseSupabase
          .storage
          .from(
            MP_CLUB_AVATAR_BUCKET
          )
          .upload(
            avatarPath,
            blob,
            {
              cacheControl: "3600",
              contentType:
                blob.type ||
                "image/jpeg",
              upsert: false
            }
          ),
        20000,
        "Upload della foto scaduto dopo 20 secondi"
      );

    if (uploadResult.error) {
      throw uploadResult.error;
    }

    console.log(
      "FOTO CARICATA:",
      uploadResult.data
    );

    const updateResult =
      await mpV3Timeout(
        matchpulseSupabase
          .from(
            "matchpulse_club_members"
          )
          .update({
            avatar_path:
              avatarPath,

            photo_x:
              Number(
                profile.photoX ?? 50
              ),

            photo_y:
              Number(
                profile.photoY ?? 8
              ),

            photo_zoom:
              Number(
                profile.photoZoom ??
                1.02
              ),

            weak_foot:
              mpV3StarValue(
                profile.weakFoot
              ),

            skill_moves:
              mpV3StarValue(
                profile.skillMoves
              ),

            last_seen_at:
              new Date().toISOString()
          })
          .eq(
            "club_id",
            club.club_id
          )
          .eq(
            "user_id",
            user.id
          )
          .select(`
            avatar_path,
            photo_x,
            photo_y,
            photo_zoom,
            weak_foot,
            skill_moves,
            updated_at
          `)
          .single(),
        20000,
        "Aggiornamento profilo scaduto dopo 20 secondi"
      );

    if (updateResult.error) {
      throw updateResult.error;
    }

    console.log(
      "RIGA AGGIORNATA:",
      updateResult.data
    );

    /*
      Elimina la cache del vecchio sistema.
    */

    localStorage.removeItem(
      "matchpulse_avatar_sync_v1"
    );

    await renderLockerRoom();

    if (
      typeof toast === "function"
    ) {
      toast(
        "Foto Club caricata correttamente"
      );
    }

    return {
      success: true,
      avatarPath:
        avatarPath,

      row:
        updateResult.data
    };
  }

  window.mpRepairClubPhotoNow =
    mpRepairClubPhotoNow;


  /* =======================================================
     FOTO NELLA CARTA DELLA ROSA
     ======================================================= */

  const mpV3PreviousMemberCard =
    mpClubMemberCard;

  mpClubMemberCard = function (
    member,
    ownerId
  ) {
    let html =
      mpV3PreviousMemberCard(
        member,
        ownerId
      );

    const photoUrl =
      mpV3PublicAvatarUrl(
        member
      );

    if (!photoUrl) {
      return html;
    }

    const initials =
      mpClubInitials(
        member.player_name
      );

    const photoX =
      Number(
        member.photo_x ?? 50
      );

    const photoY =
      Number(
        member.photo_y ?? 8
      );

    const photoZoom =
      Number(
        member.photo_zoom ?? 1.02
      );

    const avatarHtml = `
      <div class="mp-club-member-avatar">
        <img
          src="${mpClubEscape(
            photoUrl
          )}"
          alt="${mpClubEscape(
            member.player_name ||
            "Giocatore"
          )}"
          style="
            object-position:
              ${photoX}% ${photoY}%;
            transform:
              scale(${photoZoom});
          "
          onerror="
            this.remove();
            this.parentElement.textContent =
              '${mpClubEscape(initials)}';
          "
        >
      </div>
    `;

    return html.replace(
      /<div class="mp-club-member-avatar">[\s\S]*?<\/div>/,
      avatarHtml
    );
  };

  window.mpClubMemberCard =
    mpClubMemberCard;


  /* =======================================================
     FOTO E STELLE NEL PROFILO APERTO
     ======================================================= */

  const mpV3PreviousOpenMember =
    mpOpenClubMember;

  mpOpenClubMember = function (
    userId
  ) {
    mpV3PreviousOpenMember(
      userId
    );

    const member =
      MP_CLUB_MEMBERS_CACHE.find(
        item =>
          item.user_id === userId
      );

    if (!member) {
      return;
    }

    const modal =
      document.getElementById(
        "mpClubMemberModal"
      );

    if (!modal) {
      return;
    }

    const starBoxes =
      modal.querySelectorAll(
        ".mp-club-star-details > div"
      );

    const weakFootTarget =
      starBoxes[0]?.querySelector(
        "strong"
      );

    const skillMovesTarget =
      starBoxes[1]?.querySelector(
        "strong"
      );

    if (weakFootTarget) {
      weakFootTarget.innerHTML =
        mpV3Stars(
          member.weak_foot
        );
    }

    if (skillMovesTarget) {
      skillMovesTarget.innerHTML =
        mpV3Stars(
          member.skill_moves
        );
    }

    const photoUrl =
      mpV3PublicAvatarUrl(
        member
      );

    const avatar =
      modal.querySelector(
        ".mp-club-profile-avatar"
      );

    if (!photoUrl || !avatar) {
      return;
    }

    const initials =
      mpClubInitials(
        member.player_name
      );

    avatar.innerHTML = `
      <img
        src="${mpClubEscape(
          photoUrl
        )}"
        alt="${mpClubEscape(
          member.player_name ||
          "Giocatore"
        )}"
        style="
          object-position:
            ${Number(
              member.photo_x ?? 50
            )}%
            ${Number(
              member.photo_y ?? 8
            )}%;

          transform:
            scale(
              ${Number(
                member.photo_zoom ??
                1.02
              )}
            );
        "
        onerror="
          this.remove();
          this.parentElement.textContent =
            '${mpClubEscape(initials)}';
        "
      >
    `;
  };

  window.mpOpenClubMember =
    mpOpenClubMember;
})();
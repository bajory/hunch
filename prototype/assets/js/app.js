/* =========================================================================
   HUNCH — Atelier · PDP customization engine
   ========================================================================= */

const state = {
  teamId: "real-madrid",
  competition: "ucl",      // domestic league or "ucl" — default to UCL so we open on a real photo
  view: "back",            // "front" | "back"
  mode: "player",          // "player" | "custom"
  player: 0,               // index into roster (player mode)
  name: "MBAPPÉ",
  number: "9",
  size: "M",
  bag: 0,
};

/* ---------- tiny helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

function team() { return TEAMS[state.teamId]; }
function comp() { return COMPETITIONS[state.competition]; }

/* =========================================================================
   PATCH ARTWORK  (sleeve patches — stylised, drawn inline)
   Each returns an SVG group sized to a 40x40 box (scaled when placed).
   ========================================================================= */
const PatchArt = {
  ucl: () => `
    <g>
      <circle cx="20" cy="20" r="18" fill="#0A1A4A"/>
      <circle cx="20" cy="20" r="18" fill="none" stroke="#C9A24B" stroke-width="1"/>
      ${starball(20, 20, 13)}
    </g>`,
  laliga: () => `
    <g>
      <rect x="3" y="9" width="34" height="22" rx="4" fill="#0B0B0B"/>
      <rect x="3" y="9" width="34" height="22" rx="4" fill="none" stroke="#E4002B" stroke-width="1.4"/>
      <circle cx="13" cy="20" r="4.2" fill="#E4002B"/>
      <text x="22" y="24" font-family="'Saira',sans-serif" font-weight="800" font-size="9" fill="#fff" letter-spacing="0.5">LIGA</text>
    </g>`,
  premier: () => `
    <g>
      <circle cx="20" cy="20" r="18" fill="#3D195B"/>
      <circle cx="20" cy="20" r="18" fill="none" stroke="#fff" stroke-width="1"/>
      ${lionMark(20, 19)}
    </g>`,
  seriea: () => `
    <g>
      <rect x="4" y="8" width="32" height="24" rx="6" fill="#003366"/>
      <path d="M12 26 L20 12 L28 26 Z" fill="none" stroke="#fff" stroke-width="2"/>
      <circle cx="20" cy="22" r="2.4" fill="#E4002B"/>
    </g>`,
  bundesliga: () => `
    <g>
      <rect x="4" y="10" width="32" height="20" rx="10" fill="#D20515"/>
      <text x="20" y="24" text-anchor="middle" font-family="'Teko',sans-serif" font-weight="700" font-size="12" fill="#fff" letter-spacing="0.5">BL</text>
    </g>`,
};

/* the iconic UCL "starball": white sphere with black stars */
function starball(cx, cy, r) {
  const stars = [];
  const ring = [
    [0, -1], [0.85, -0.5], [0.85, 0.5], [0, 1], [-0.85, 0.5], [-0.85, -0.5],
  ];
  ring.forEach(([dx, dy]) => {
    stars.push(star(cx + dx * r * 0.66, cy + dy * r * 0.66, r * 0.22, "#0A1A4A"));
  });
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/>
    ${star(cx, cy, r * 0.3, "#0A1A4A")}
    ${stars.join("")}`;
}
function star(cx, cy, R, fill) {
  let pts = "";
  for (let i = 0; i < 5; i++) {
    const ao = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const ai = ao + Math.PI / 5;
    pts += `${cx + R * Math.cos(ao)},${cy + R * Math.sin(ao)} `;
    pts += `${cx + R * 0.42 * Math.cos(ai)},${cy + R * 0.42 * Math.sin(ai)} `;
  }
  return `<polygon points="${pts}" fill="${fill}"/>`;
}
function lionMark(cx, cy) {
  return `<g transform="translate(${cx - 7},${cy - 7})" fill="#fff">
    <path d="M3 11 C3 6 6 3 9 4 C8 6 10 6 11 5 C12 7 11 9 9 10 C11 10 12 12 11 13 C9 12 7 13 6 12 C5 13 3 12 3 11 Z"/>
  </g>`;
}

/* =========================================================================
   JERSEY SVG
   A stylised back / front view. Name + number are real <text> driven by the
   selected competition's typeface so styling updates live.
   ========================================================================= */
const JERSEY_PATH =
  "M200 36 C182 36 168 41 158 49 L104 74 C82 84 70 104 60 132 L100 162 " +
  "C108 156 117 152 126 150 L126 162 C122 244 120 350 128 430 " +
  "C160 444 240 444 272 430 C280 350 278 244 274 162 L274 150 " +
  "C283 152 292 156 300 162 L340 132 C330 104 318 84 296 74 L242 49 " +
  "C232 41 218 36 200 36 Z";

function jerseyMarkup() {
  const t = team(), c = comp(), k = t.kit;
  const isBack = state.view === "back";

  // Lettering colour:
  //  - UCL uses a uniform face for every club, but the colour still contrasts
  //    the shirt (the club's `uclFill`) — not a blind white that vanishes on
  //    light kits like Real Madrid.
  //  - Domestic league uses the league fill + optional outline.
  const isUCL = c.kind === "continental";
  const lettering = isUCL ? k.uclFill : k.leagueFill;
  const letterStroke = (!isUCL && k.leagueStroke && k.leagueStroke !== "none")
    ? k.leagueStroke : "none";

  const name = (c.uppercase ? state.name.toUpperCase() : state.name) || "";
  const number = state.number || "";

  // Shrink long names so they fit the back arc (as real heat-press kits do).
  const L = name.length;
  const nameSize = L <= 7 ? 32 : L <= 9 ? 27 : L <= 11 ? 23 : L <= 13 ? 20 : 18;

  // stripes (clipped to body) for striped kits
  let stripes = "";
  if (k.stripes) {
    const [a, b] = k.stripes.colors, w = k.stripes.width;
    let x = 40, i = 0;
    while (x < 360) {
      stripes += `<rect x="${x}" y="0" width="${w}" height="470" fill="${i % 2 ? b : a}"/>`;
      x += w; i++;
    }
    stripes = `<g clip-path="url(#bodyclip)">${stripes}</g>`;
  }

  // sleeve patch — wearer's RIGHT shoulder.
  //   back view: appears on viewer's LEFT sleeve (x≈82)
  //   front view: appears on viewer's RIGHT sleeve (x≈318)
  const patchX = isBack ? 82 : 318;
  const patchY = 132;
  const patchSVG = PatchArt[c.patch] ? PatchArt[c.patch]() : "";
  const patch = patchSVG
    ? `<g transform="translate(${patchX - 20},${patchY - 20}) scale(1.05)" class="sleeve-patch">${patchSVG}</g>`
    : "";

  // FRONT decorations: crest + sponsor
  const front = `
    <g class="kit-front">
      <g transform="translate(150,150)">
        <rect x="0" y="0" width="34" height="40" rx="3" fill="${k.crestBg}"/>
        <text x="17" y="27" text-anchor="middle" font-family="'Cormorant',serif"
              font-weight="700" font-size="17" fill="${k.crestFg}">${esc(k.crestText)}</text>
      </g>
      <text x="200" y="250" text-anchor="middle" font-family="'Montserrat',sans-serif"
            font-weight="700" font-size="15" letter-spacing="2" fill="${readable(k.body)}"
            opacity="0.92">${esc(k.sponsor)}</text>
      <text x="248" y="178" text-anchor="middle" font-family="'Cormorant',serif"
            font-weight="700" font-size="13" fill="${readable(k.body)}" opacity="0.55">HUNCH</text>
    </g>`;

  // BACK decorations: arched name + big number
  const back = `
    <g class="kit-back">
      <path id="namearc" d="M96 200 Q200 162 304 200" fill="none"/>
      <text class="jersey-name" text-anchor="middle"
            font-family="${letteringFont()}" font-weight="${c.nameWeight}"
            letter-spacing="${c.tracking}" fill="${lettering}"
            stroke="${letterStroke}" stroke-width="${letterStroke === "none" ? 0 : 1}"
            style="font-size:${nameSize}px">
        <textPath href="#namearc" startOffset="50%">${esc(name)}</textPath>
      </text>
      <text class="jersey-number" x="200" y="350" text-anchor="middle"
            font-family="${letteringFont()}" font-weight="${c.numberWeight}"
            letter-spacing="${c.tracking}" fill="${lettering}"
            stroke="${letterStroke}" stroke-width="${letterStroke === "none" ? 0 : 2}"
            style="font-size:150px">${esc(number)}</text>
    </g>`;

  return `
  <svg viewBox="0 0 400 470" xmlns="http://www.w3.org/2000/svg" role="img"
       aria-label="${esc(t.name)} jersey, ${isBack ? "back" : "front"} view${isBack ? `, ${esc(name)} number ${esc(number)}` : ""}">
    <defs>
      <clipPath id="bodyclip"><path d="${JERSEY_PATH}"/></clipPath>
      <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0.10"/>
        <stop offset="0.5" stop-color="#fff" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.18"/>
      </linearGradient>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000" flood-opacity="0.55"/>
      </filter>
    </defs>

    <g filter="url(#soft)" class="jersey-body" style="transition:opacity .35s ease">
      <!-- base body -->
      <path d="${JERSEY_PATH}" fill="${k.body}"/>
      ${stripes}
      <!-- shading -->
      <path d="${JERSEY_PATH}" fill="url(#sheen)"/>
      <!-- collar -->
      <path d="M158 49 C176 70 224 70 242 49 C232 60 224 66 200 66 C176 66 168 60 158 49 Z"
            fill="${k.collar}"/>
      <!-- side seams hint -->
      <path d="M126 150 C122 244 120 350 128 430" fill="none" stroke="#000" stroke-opacity="0.12" stroke-width="2"/>
      <path d="M274 150 C278 244 280 350 272 430" fill="none" stroke="#000" stroke-opacity="0.12" stroke-width="2"/>

      ${isBack ? back : front}
      ${patch}
    </g>
  </svg>`;
}

/* pick black/white text that reads on a given kit colour */
function readable(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1A1A1A" : "#FFFFFF";
}

/* =========================================================================
   RENDER — controls + stage
   ========================================================================= */
/* shared lettering attributes (used by both SVG + photo modes) */
// Official-font override per team: a string (all comps) or {ucl,laliga,…} per comp.
// Falls back to the competition stand-in font when none is set.
function letteringFont() {
  const ov = (PRINT[state.teamId] || {}).font;
  const o = typeof ov === "string" ? ov : (ov && ov[state.competition]);
  return o || comp().fontFamily;
}

function lettering() {
  const c = comp(), k = team().kit;
  const isUCL = c.kind === "continental";
  return {
    fill: isUCL ? k.uclFill : k.leagueFill,
    stroke: (!isUCL && k.leagueStroke && k.leagueStroke !== "none") ? k.leagueStroke : "none",
    font: letteringFont(), nameWeight: c.nameWeight, numberWeight: c.numberWeight, tracking: c.tracking,
    name: (c.uppercase ? state.name.toUpperCase() : state.name) || "",
    number: state.number || "",
  };
}

/* name + number overlay drawn onto a real shirt photo (back view),
   positioned via fractional geometry so it scales to any image size */
function overlayContent(W, H, g) {
  const s = lettering();
  const cx = W / 2;
  const span = g.name.span * W, midY = g.name.cy * H, rise = g.name.arc * H;
  const arc = `M ${cx - span / 2} ${midY} Q ${cx} ${midY - rise} ${cx + span / 2} ${midY}`;
  const nameSize = g.name.size * W, numSize = g.number.size * W, numY = g.number.cy * H;
  const ns = s.stroke === "none" ? 0 : Math.max(1, nameSize * 0.04);
  const xs = s.stroke === "none" ? 0 : Math.max(1, numSize * 0.035);
  return `
    <path id="ov-arc" d="${arc}" fill="none"/>
    <text text-anchor="middle" font-family="${s.font}" font-weight="${s.nameWeight}"
          letter-spacing="${s.tracking}" fill="${s.fill}" stroke="${s.stroke}"
          stroke-width="${ns}" paint-order="stroke" style="font-size:${nameSize}px">
      <textPath href="#ov-arc" startOffset="50%">${esc(s.name)}</textPath>
    </text>
    <text x="${cx}" y="${numY}" text-anchor="middle" dominant-baseline="central"
          font-family="${s.font}" font-weight="${s.numberWeight}" letter-spacing="${s.tracking}"
          fill="${s.fill}" stroke="${s.stroke}" stroke-width="${xs}" paint-order="stroke"
          style="font-size:${numSize}px">${esc(s.number)}</text>`;
}

let stageGen = 0;   // guards against stale async image handlers clobbering a newer render
function renderStage() {
  const stage = $("#stage-jersey");
  const g = printFor(state.teamId, state.competition, state.view);
  const myGen = ++stageGen;

  if (g) {
    stage.classList.add("is-photo");
    stage.innerHTML = `
      <div class="photo-wrap">
        <img class="photo-base" id="kit-photo" alt="${esc(team().name)} jersey, ${state.view}" src="${g.src}">
        <svg class="photo-overlay" id="kit-overlay" preserveAspectRatio="xMidYMid meet"></svg>
      </div>`;
    const img = $("#kit-photo"), svg = $("#kit-overlay");
    const draw = () => {
      if (myGen !== stageGen) return;             // a newer render superseded us
      const W = img.naturalWidth || 1000, H = img.naturalHeight || 1200;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.innerHTML = state.view === "back" ? overlayContent(W, H, g) : "";
    };
    img.onload = draw;
    img.onerror = () => {        // photo not added yet -> graceful SVG fallback
      if (myGen !== stageGen) return;             // ignore aborted load from a replaced img
      stage.classList.remove("is-photo");
      stage.innerHTML = jerseyMarkup();
    };
    if (img.complete && img.naturalWidth) draw();
  } else {
    stage.classList.remove("is-photo");
    stage.innerHTML = jerseyMarkup();
  }

  $("#stage-edition").textContent = team().edition;
  $$(".viewtoggle button").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.view === state.view));
  if (window.__tune) Tune.attach(g);
}

/* ---- #tune : on-page calibration for a freshly added photo ---- */
const Tune = {
  target: "number", g: null, _kb: false,
  attach(g) {
    this.g = g; this.panel();
    if (!this._kb) { this._kb = true; document.addEventListener("keydown", (e) => this.key(e)); }
  },
  panel() {
    let el = $("#tune-panel");
    if (!el) { el = document.createElement("div"); el.id = "tune-panel"; document.body.appendChild(el); }
    const g = this.g;
    if (!g) { el.innerHTML = "<b>#tune</b> — add a photo for this team/competition first."; return; }
    el.innerHTML =
      `<b>#tune</b> · target <u>${this.target}</u> &nbsp;|&nbsp; N/M select · arrows move · +/- size · [ ] arch<br>` +
      `<code>name: { cy:${g.name.cy.toFixed(3)}, span:${g.name.span.toFixed(3)}, arc:${g.name.arc.toFixed(3)}, size:${g.name.size.toFixed(3)} }, ` +
      `number: { cy:${g.number.cy.toFixed(3)}, size:${g.number.size.toFixed(3)} }</code>`;
  },
  key(e) {
    if (!window.__tune || !this.g) return;
    const g = this.g, t = this.target, s = e.shiftKey ? 0.02 : 0.004;
    let used = true;
    const k = e.key;
    if (k === "n" || k === "N") this.target = "name";
    else if (k === "m" || k === "M") this.target = "number";
    else if (k === "ArrowUp") g[t].cy -= s;
    else if (k === "ArrowDown") g[t].cy += s;
    else if (k === "ArrowLeft" && g[t].span != null) g[t].span -= s;
    else if (k === "ArrowRight" && g[t].span != null) g[t].span += s;
    else if (k === "+" || k === "=") g[t].size += s;
    else if (k === "-" || k === "_") g[t].size -= s;
    else if (k === "[" && g.name.arc != null) g.name.arc -= s;
    else if (k === "]" && g.name.arc != null) g.name.arc += s;
    else used = false;
    if (!used) return;
    e.preventDefault();
    const p = PRINT[state.teamId] || (PRINT[state.teamId] = {});
    p.name = { ...g.name }; p.number = { ...g.number };
    renderStage(); this.panel();
    console.log(`PRINT["${state.teamId}"] →`, JSON.stringify({ name: g.name, number: g.number }));
  },
};
window.__tune = location.hash === "#tune";
window.addEventListener("hashchange", () => { window.__tune = location.hash === "#tune"; renderStage(); });

function renderTeams() {
  $("#teams").innerHTML = Object.values(TEAMS).map((t) => `
    <button class="team ${t.id === state.teamId ? "is-active" : ""}" data-team="${t.id}">
      <span class="team__swatch" style="background:${t.kit.body};${t.kit.stripes ? `background:linear-gradient(90deg, ${t.kit.stripes.colors[0]} 50%, ${t.kit.stripes.colors[1]} 50%)` : ""}"></span>
      ${esc(t.name)}
    </button>`).join("");
}

function renderCompetition() {
  const comps = competitionsForTeam(state.teamId);
  $("#competition").innerHTML = comps.map((id) => `
    <button class="${id === state.competition ? "is-active" : ""}" data-comp="${id}">
      ${esc(COMPETITIONS[id].label)}
    </button>`).join("");

  // patch preview
  const c = comp();
  $("#patch-preview").innerHTML = `
    <svg viewBox="0 0 40 40">${PatchArt[c.patch] ? PatchArt[c.patch]() : ""}</svg>
    <span class="pinfo">
      <span class="pttl">${esc(PATCHES[c.patch].label)} patch</span>
      <span class="psub">${esc(PATCHES[c.patch].sleeve)} · lettering set in ${esc(c.label)} typeface</span>
    </span>`;
}

function renderMode() {
  $$("#mode button").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.mode === state.mode));
  $("#roster").style.display = state.mode === "player" ? "grid" : "none";
  $("#custom").style.display = state.mode === "custom" ? "block" : "none";

  if (state.mode === "player") {
    $("#roster").innerHTML = team().roster.map((p, i) => `
      <button class="player ${i === state.player ? "is-active" : ""}" data-player="${i}">
        <span class="pname">${esc(p.name)}</span>
        <span class="pnum">${p.number}</span>
      </button>`).join("");
  } else {
    $("#in-name").value = state.name;
    $("#in-number").value = state.number;
  }
}

function renderSizes() {
  $("#sizes").innerHTML = SIZES.map((s) => `
    <button class="size ${s === state.size ? "is-active" : ""}" data-size="${s}">${s}</button>`).join("");
}

function renderSummary() {
  const base = team().price;
  const personalised = (state.name || state.number) ? CUSTOMIZATION_FEE : 0;
  const total = base + personalised;
  $("#sum-base").textContent = `$${base}`;
  $("#sum-custom-row").style.display = personalised ? "flex" : "none";
  $("#sum-custom").textContent = `$${personalised}`;
  $("#sum-line").textContent =
    `${team().name} · ${comp().label} · ${state.size}` +
    ((state.name || state.number) ? ` · ${state.name || "—"} ${state.number}` : "");
  $("#sum-total").textContent = `$${total}`;
}

function renderAll() {
  renderStage();
  renderTeams();
  renderCompetition();
  renderMode();
  renderSizes();
  renderSummary();
}

/* =========================================================================
   STATE TRANSITIONS
   ========================================================================= */
function setTeam(id) {
  state.teamId = id;
  // reset competition to the team's domestic league
  state.competition = team().league;
  // refresh roster selection
  if (state.mode === "player") {
    state.player = 0;
    const p = team().roster[0];
    state.name = p.name; state.number = String(p.number);
  }
  renderAll();
}
function setCompetition(id) { state.competition = id; renderStage(); renderCompetition(); renderSummary(); }
function setView(v) { state.view = v; renderStage(); }
function setMode(m) { state.mode = m; renderMode(); renderStage(); renderSummary(); }
function setPlayer(i) {
  state.player = i;
  const p = team().roster[i];
  state.name = p.name; state.number = String(p.number);
  renderMode(); renderStage(); renderSummary();
}
function setSize(s) { state.size = s; renderSizes(); renderSummary(); }

/* =========================================================================
   EVENTS  (delegated)
   ========================================================================= */
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-team]"); if (t) return setTeam(t.dataset.team);
  const c = e.target.closest("[data-comp]"); if (c) return setCompetition(c.dataset.comp);
  const v = e.target.closest("[data-view]"); if (v) return setView(v.dataset.view);
  const m = e.target.closest("[data-mode]"); if (m) return setMode(m.dataset.mode);
  const p = e.target.closest("[data-player]"); if (p) return setPlayer(+p.dataset.player);
  const s = e.target.closest("[data-size]"); if (s) return setSize(s.dataset.size);
});

document.addEventListener("input", (e) => {
  if (e.target.id === "in-name") {
    state.name = e.target.value.slice(0, 14);
    renderStage(); renderSummary();
  }
  if (e.target.id === "in-number") {
    state.number = e.target.value.replace(/\D/g, "").slice(0, 2);
    e.target.value = state.number;
    renderStage(); renderSummary();
  }
});

/* add to bag */
function addToBag() {
  state.bag++;
  $("#bag-count").textContent = state.bag;
  $("#bag-count").style.display = "grid";
  const toast = $("#toast");
  $("#toast-text").textContent =
    `${team().name} ${state.name || ""} ${state.number || ""} · ${state.size} added to bag`;
  toast.classList.add("is-show");
  clearTimeout(addToBag._t);
  addToBag._t = setTimeout(() => toast.classList.remove("is-show"), 2600);
}
$("#cta").addEventListener("click", addToBag);

/* boot */
renderAll();

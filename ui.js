// ui.js — banner, elenco giorni e dettaglio giorno (usato da functions.js e functionsScopri.js)
import { loadTrip, tripFromUrl, infoData, gruppiGiorno, AREE, STAGIONI, dividiNome, raggruppaLuoghi, ordinale, leggiIndice } from "./parser.js";
import { SCENE } from "./scene.js";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export { dividiNome };

// etichette sulle card: area (in alto a sinistra), stagione (pallino in alto a destra), "in programma"
// stagioni = elenco di stagioni per i luoghi con più viaggi (pillola al posto del pallino)
export function etichetteCard(t, stagioni) {
  const a = AREE[t.area], s = STAGIONI[t.stagione];
  let stag = "";
  if (stagioni) {
    if (stagioni.length) stag = `<span class="stag multi" title="${esc(stagioni.map(k => STAGIONI[k].nome).join(", "))}">${stagioni.map(k => STAGIONI[k].emoji).join("")}</span>`;
  } else if (s) {
    stag = `<span class="stag" title="${s.nome}" aria-label="${s.nome}">${s.emoji}</span>`;
  }
  return (a ? `<span class="tag">${a.emoji} ${a.nome}</span>` : "") + stag +
    (t._futuro ? `<span class="tag prog">IN PROGRAMMA</span>` : "");
}
(function stileCard() {
  const s = document.createElement("style");
  s.textContent = `
    .trip-card .tag { text-transform: none; font-size: 18px; padding: 4px 11px; }
    .trip-card .tag.prog { left: auto; right: 12px; top: 56px; background: var(--lilla, #7a5fc4); color: #fff; font-size: 16px; }
    .trip-card .stag { position: absolute; top: 10px; right: 12px; z-index: 3; width: 36px; height: 36px; display: grid; place-items: center;
      border-radius: 50%; background: #fff; font-size: 19px; line-height: 1; box-shadow: 0 3px 10px rgba(110,80,180,.18); }
    .trip-card .stag.multi { width: auto; min-width: 36px; padding: 0 11px; border-radius: 99px; font-size: 16px; letter-spacing: 2px; }
    /* luoghi con più viaggi: mazzetto di biglietti sovrapposti */
    .mazzo { position: relative; isolation: isolate; margin-bottom: 14px; }
    .mazzo::before, .mazzo::after { content: ""; position: absolute; inset: 0; border-radius: 22px; transition: transform .25s;
      background: color-mix(in srgb, var(--acc, #7a5fc4) 20%, #fff); box-shadow: 0 6px 16px rgba(110,80,180,.14); }
    .mazzo::before { z-index: 0; transform: translateY(8px) rotate(-2.6deg); }
    .mazzo::after { z-index: -1; transform: translateY(15px) rotate(2.4deg); opacity: .8; }
    .mazzo-2::after { display: none; }
    .mazzo > .trip-card { position: relative; z-index: 1; }
    .mazzo:hover::before { transform: translate(-4px, 10px) rotate(-4.5deg); }
    .mazzo:hover::after { transform: translate(4px, 17px) rotate(4.2deg); }
    @media (prefers-reduced-motion: reduce) { .mazzo::before, .mazzo::after { transition: none; } }`;
  document.head.appendChild(s);
})();

// indirizzo di un luogo: un solo viaggio -> direttamente l'itinerario; più viaggi -> pagina del luogo
export function urlLuogo(p, scopri = false) {
  return p.trips.length > 1
    ? `luogo.html?l=${encodeURIComponent(p.id)}${scopri ? "&m=scopri" : ""}`
    : `${scopri ? "scopriViaggio" : "viaggio"}.html?trip=${p.trips[0].id}`;
}

// card di un luogo (senza anni): singola, oppure "mazzetto" se ha più viaggi
export function cardLuogo(p, { scopri = false } = {}) {
  const t = p.principale, multi = p.trips.length > 1;
  const stagioni = [...new Set(p.trips.map(x => x.stagione).filter(Boolean))];
  const nLuoghi = x => Object.values(x.giorni).reduce((s, g) => s + g.luoghi.length, 0);
  const s = STAGIONI[t.stagione];
  const per = multi
    ? `${p.trips.length} viaggi`
    : scopri ? `${nLuoghi(t)} luoghi da scoprire` : [notti(t), dividiNome(t.nome).extra].filter(Boolean).join(" · ");   // la stagione è il pallino con l'emoji
  const eti = etichetteCard({ ...t, _futuro: p.trips.some(x => x._futuro) }, multi ? stagioni : undefined);
  const card = `<a class="trip-card" href="${urlLuogo(p, scopri)}" style="--acc:${esc(t.colore)}">${eti}
    <div class="art">${scenaSvg(t)}</div>
    <div class="info"><h3>${esc(p.nome)}</h3><div class="per">${esc(per)}</div></div></a>`;
  return multi ? `<div class="mazzo mazzo-${Math.min(p.trips.length, 3)}" style="--acc:${esc(t.colore)}">${card}</div>` : card;
}

export function scenaSvg(trip) {
  return SCENE[trip.scena] || SCENE.default;
}

export function notti(trip) {
  const n = Object.keys(trip.giorni).length - 1;
  return n > 0 ? `${n} nott${n === 1 ? "e" : "i"}` : "";
}

// tratteggio di rotta con aeroplanino (decorazione dei banner)
export const ROTTA = `<svg class="rotta" viewBox="0 0 600 260" aria-hidden="true">
  <path d="M10 230 C 140 40, 330 40, 470 120 S 560 60, 585 30" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round"/>
  <circle cx="10" cy="230" r="6" fill="#fff" fill-opacity=".9"/>
  <g transform="translate(585 30) rotate(-38)"><path d="M-14 0 L14 0 L22 -3 L22 3 L14 0 M-4 0 L-12 -14 L-7 -14 L5 0 M-4 0 L-12 14 L-7 14 L5 0 M-14 0 L-18 -6 L-15 -6 L-9 0 M-14 0 L-18 6 L-15 6 L-9 0" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></g>
</svg>`;

export function heroHtml(trip, etichetta, sottoTesto) {
  const { titolo, extra } = dividiNome(trip.nome);
  const stag = STAGIONI[trip.stagione];
  const sotto = sottoTesto ?? [trip.periodo, notti(trip), extra].filter(Boolean).join(" · ");
  const pillole = trip.citta.map(c =>
    `<span class="pill"><i style="background:${esc(c.colore)}"></i>${esc(c.nome)}${c.info ? ` <s>${esc(c.info)}</s>` : ""}</span>`).join("");
  return `
    <div class="trip-hero" style="--acc:${esc(trip.colore)}">
      <div class="hero-text">
        <small>${esc(etichetta)}</small>
        <h1>${esc(titolo)}${stag ? `<em>${stag.emoji} ${esc(stag.nome)}</em>` : ""}</h1>
        <p>${esc(sotto)}</p>
        ${pillole ? `<div class="pills">${pillole}</div>` : ""}
      </div>
      ${ROTTA}
      ${scenaSvg(trip)}
    </div>`;
}

function dataTl(trip, g, chiave) {
  const d = infoData(trip, g);
  const num = chiave.replace(/\D/g, "");
  return d
    ? `<span class="tl-date"><i class="fas fa-plane"></i><span><b>${d.giorno}</b><small>${d.mese.slice(0, 3)}</small></span></span>`
    : `<span class="tl-date"><i class="fas fa-plane"></i><span><b>${num}</b><small>GIORNO</small></span></span>`;
}

const ICONE = { MATTINA: "sun", POMERIGGIO: "cloud-sun", SERA: "moon", ALBA: "sun", GIORNATA: "sun", VIAGGIO: "train", PRANZO: "utensils" };

const plain = html => String(html).replace(/<[^>]*>/g, "");

// stile del pulsante "indietro" e dei giorni a tendina
function stileCrumb() {
  if (document.getElementById("stile-crumb")) return;
  const s = document.createElement("style");
  s.id = "stile-crumb";
  s.textContent = `
    .crumb { display: inline-flex; align-items: center; gap: 8px; margin: 0 2px 12px; padding: 9px 17px; border-radius: 99px;
      background: #fff; color: var(--ink, #2d2150); text-decoration: none; font: 800 14px 'Nunito', sans-serif;
      box-shadow: 0 3px 10px rgba(110,80,180,.12); transition: transform .15s; }
    .crumb:hover { transform: translateX(-3px); }
    .crumb i { font-size: 12px; color: var(--lilla, #7a5fc4); }

    /* giorni a tendina: il dettaglio si apre sotto il biglietto, senza cambiare pagina */
    .tl-item { scroll-margin-top: 96px; }
    .tl-item a.tl-head { cursor: pointer; }
    .tl-chev { flex: none; align-self: center; margin: 0 14px 0 0; font-size: 13px; color: var(--lilla, #7a5fc4); transition: transform .3s; }
    .tl-item.open .tl-chev { transform: rotate(180deg); }
    .tl-item.open a.tl-head { border-radius: 20px 20px 0 0; transform: none; }
    .tl-item.open a.tl-head::after { display: none; }
    .tl-item.open .tl-date { border-radius: 20px 0 0 0; }
    .tl-det { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .35s ease; }
    .tl-item.open .tl-det { grid-template-rows: 1fr; }
    .tl-det-in { min-height: 0; overflow: hidden; background: #fff; border-radius: 0 0 20px 20px; visibility: hidden; transition: visibility 0s linear .35s; }
    .tl-item.open .tl-det-in { visibility: visible; transition-delay: 0s; box-shadow: 0 10px 24px rgba(110,80,180,.10); }
    .tl-det-in .pass-body { border-top: 2px dashed color-mix(in srgb, var(--c) 45%, #fff); padding: 14px 22px 22px; }
    @media (prefers-reduced-motion: reduce) { .tl-det, .tl-chev, .tl-det-in { transition: none; } }`;
  document.head.appendChild(s);
}

// modo: "agenda" (itinerario) oppure "scopri" (luoghi di interesse)
export async function montaViaggio(modo) {
  const hero = document.getElementById("hero");
  const vista = document.getElementById("vista");
  const agenda = modo === "agenda";
  stileCrumb();
  // pulsante "indietro" sempre visibile: torna alla lista dei viaggi
  const crumb = `<a class="crumb" href="${agenda ? "itinerari.html" : "scopri.html"}"><i class="fas fa-arrow-left"></i> ${agenda ? "Tutti gli itinerari" : "Tutti i luoghi"}</a>`;
  let trip;
  try {
    trip = await loadTrip(tripFromUrl());
  } catch (e) {
    hero.innerHTML = crumb;
    vista.innerHTML = `<p class="vuoto">${esc(e.message)}</p>`;
    return;
  }
  document.title = (agenda ? "" : "Scopri – ") + dividiNome(trip.nome).titolo;
  // se il luogo ha più viaggi, "indietro" torna alla pagina del luogo
  const crumbViaggio = trip.fratelli > 1
    ? `<a class="crumb" href="luogo.html?l=${encodeURIComponent(trip.luogo)}${agenda ? "" : "&m=scopri"}"><i class="fas fa-arrow-left"></i> Tutti i viaggi qui</a>`
    : crumb;
  hero.innerHTML = crumbViaggio + heroHtml(trip, agenda ? "il mio itinerario" : "da non perdere");

  // giorni mostrati (in "scopri" solo quelli con luoghi)
  const chiavi = Object.keys(trip.giorni).filter(k => agenda || trip.giorni[k].luoghi.length);

  // contenuto del giorno (quello che si apre nella tendina)
  function corpoGiorno(k) {
    const g = trip.giorni[k];
    let corpo = "";
    if (agenda) {
      gruppiGiorno(g).forEach(gr => {
        const ic = ICONE[gr.etichetta] ? `<i class="fas fa-${ICONE[gr.etichetta]}"></i>` : "";
        corpo += `<div class="grp"><div class="grp-h">${ic}${esc(gr.etichetta)}</div>` + gr.voci.map(a => {
          const t = /^\d/.test(a.ora || "") ? `<span class="t">${esc(a.ora)}</span>` : `<span class="t vuoto">•</span>`;
          return `<div class="line">${t}<span>${esc(a.attivita)}${a.nota ? `<span class="nota">${esc(a.nota)}</span>` : ""}</span></div>`;
        }).join("") + `</div>`;
      });
      g.noteFinali.forEach(n => { corpo += `<div class="note">${esc(n)}</div>`; });
    } else {
      corpo = `<ul class="luoghi">` + g.luoghi.map(l =>
        `<li><span class="ic">${l.icona ? `<i class="fas fa-${esc(l.icona)}"></i>` : ""}</span><div><strong>${esc(l.titolo)}</strong><span>${esc(l.descrizione)}</span></div></li>`).join("") + `</ul>`;
    }
    return corpo;
  }

  function elenco() {
    if (!chiavi.length) {
      vista.innerHTML = `<p class="vuoto">Nessuna descrizione ancora per questo viaggio.</p>`;
      return;
    }
    let html = `<ol class="tl">`;
    let cittaPrec = null;
    chiavi.forEach(k => {
      const g = trip.giorni[k];
      if (g.citta && g.citta !== cittaPrec) {
        cittaPrec = g.citta;
        html += `<li class="tl-city" style="--c:${esc(g.citta.colore)}"><span>${esc(g.citta.nome)}${g.citta.info ? ` <small>${esc(g.citta.info)}</small>` : ""}</span></li>`;
      }
      const anteprima = agenda
        ? g.attivita.filter(a => /^\d/.test(a.ora || "") ? !/pranzo|cena|colazione/i.test(a.attivita) : true).slice(0, 2).map(a => a.attivita).join(" · ")
        : g.luoghi.slice(0, 3).map(l => l.titolo).join(" · ");
      const d = infoData(trip, g);
      html += `<li class="tl-item" id="${k}" data-k="${k}" style="--c:${esc(g.colore)}">
        <a class="tl-head" href="#${k}" role="button" aria-expanded="false" aria-controls="det-${k}">
          ${dataTl(trip, g, k)}
          <div class="tl-body">${d && d.sett ? `<div class="sett">${esc(d.sett)}</div>` : ""}<h3>${esc(g.titolo)}</h3><p>${esc(anteprima)}</p></div>
          <i class="fas fa-chevron-down tl-chev" aria-hidden="true"></i><span class="tl-bars"></span>
        </a>
        <div class="tl-det" id="det-${k}" role="region"><div class="tl-det-in"><div class="pass-body">${corpoGiorno(k)}</div></div></div>
      </li>`;
    });
    html += `</ol>`;
    if (agenda && trip.foto.length) {
      html += `<div class="gallery">${trip.foto.map(f => `<img src="${esc(f.src)}" alt="${esc(f.alt)}" loading="lazy">`).join("")}</div>`;
    }
    vista.innerHTML = html;
  }

  // apre/chiude un giorno (uno alla volta, come una tendina)
  function imposta(li, on) {
    li.classList.toggle("open", on);
    li.querySelector("a.tl-head").setAttribute("aria-expanded", on ? "true" : "false");
  }
  function apri(k) {
    const li = vista.querySelector(`.tl-item[data-k="${k}"]`);
    if (!li) return;
    const aprire = !li.classList.contains("open");
    vista.querySelectorAll(".tl-item.open").forEach(x => imposta(x, false));
    if (aprire) imposta(li, true);
    // l'indirizzo ricorda il giorno aperto (si può condividere) senza riempire la cronologia
    try { history.replaceState(null, "", aprire ? "#" + k : location.pathname + location.search); } catch (e) {}
    // a fine animazione, se il giorno non è tutto in vista, porta in alto il suo biglietto
    if (aprire) setTimeout(() => {
      const r = li.getBoundingClientRect();
      if (r.top < 90 || r.bottom > window.innerHeight) li.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 380);
  }

  elenco();
  vista.addEventListener("click", e => {
    const h = e.target.closest("a.tl-head");
    if (!h) return;
    e.preventDefault();
    apri(h.parentElement.dataset.k);
  });
  vista.addEventListener("keydown", e => {
    if (e.key !== " ") return;
    const h = e.target.closest && e.target.closest("a.tl-head");
    if (!h) return;
    e.preventDefault();
    apri(h.parentElement.dataset.k);
  });
  // indirizzo con #giornoN: apre direttamente quel giorno
  const apriDaIndirizzo = () => {
    const k = location.hash.slice(1);
    const li = chiavi.includes(k) && vista.querySelector(`.tl-item[data-k="${k}"]`);
    if (li && !li.classList.contains("open")) apri(k);
  };
  window.addEventListener("hashchange", apriDaIndirizzo);
  apriDaIndirizzo();
}

// ---------- pagina di un luogo con più viaggi (luogo.html?l=londra) ----------
export async function montaLuogo() {
  stileCrumb();
  const hero = document.getElementById("hero");
  const vista = document.getElementById("vista");
  const q = new URLSearchParams(location.search);
  const slug = (q.get("l") || "").toLowerCase();
  const scopri = q.get("m") === "scopri";
  const crumb = `<a class="crumb" href="${scopri ? "scopri.html" : "itinerari.html"}"><i class="fas fa-arrow-left"></i> ${scopri ? "Tutti i luoghi" : "Tutti gli itinerari"}</a>`;
  let trips;
  try {
    const indice = await leggiIndice();
    const ids = indice.filter(v => v.luogo === slug).map(v => v.id);
    if (!ids.length) throw new Error(`Luogo "${slug}" non trovato`);
    const r = await Promise.allSettled(ids.map(loadTrip));
    trips = r.filter(x => x.status === "fulfilled").map(x => x.value);
    if (scopri) trips = trips.filter(t => Object.values(t.giorni).some(g => g.luoghi.length));
    if (!trips.length) throw new Error("Nessun viaggio disponibile per questo luogo");
  } catch (e) {
    hero.innerHTML = crumb;
    vista.innerHTML = `<p class="vuoto">${esc(e.message)}</p>`;
    return;
  }
  const [p] = raggruppaLuoghi(trips);
  document.title = p.nome;
  const stagioni = [...new Set(p.trips.map(t => t.stagione).filter(Boolean))].map(k => STAGIONI[k].emoji).join(" ");
  const sotto = `${p.trips.length} ${p.trips.length === 1 ? "viaggio" : "viaggi"}${stagioni ? " · " + stagioni : ""}`;
  hero.innerHTML = crumb + heroHtml({ ...p.principale, nome: p.nome, periodo: "", giorni: {}, citta: [], stagione: "" }, scopri ? "da non perdere" : "i miei viaggi qui", sotto);

  vista.innerHTML = `<ol class="tl">` + p.trips.map((t, i) => {
    const s = STAGIONI[t.stagione];
    const extra = dividiNome(t.nome).extra;
    const periodo = (t.periodo || "").replace(/\s*\b\d{4}\b/g, "").replace(/\s+/g, " ").trim();   // date senza anno
    const titolo = periodo || [s && s.nome, extra].filter(Boolean).join(" · ") || p.nome;
    const sottoTit = [s && s.nome, notti(t), extra].filter(Boolean).join(" · ");
    return `<li class="tl-item" style="--c:${esc(t.colore)}"><a href="${scopri ? "scopriViaggio" : "viaggio"}.html?trip=${encodeURIComponent(t.id)}">
      <span class="tl-date"><i class="fas fa-plane"></i><span><b>${s ? s.emoji : "✈️"}</b><small>${i + 1}°</small></span></span>
      <div class="tl-body"><div class="sett">${esc(ordinale(i))}</div><h3>${esc(titolo)}</h3><p>${esc(sottoTit)}</p></div><span class="tl-bars"></span>
    </a></li>`;
  }).join("") + `</ol>`;
}

// ==========================================================
// MENU IN ALTO (tutti i dispositivi): voci + rotta tratteggiata con aeroplanino
// Si attiva da solo su ogni pagina che importa ui.js.
// Dentro un viaggio le voci diventano: Home · Viaggi · Itinerario · Scopri
// ==========================================================
function montaMenu() {
  if (document.getElementById("bar-viaggio")) return;
  const pagina = (location.pathname.split("/").pop() || "index.html");
  const trip = new URLSearchParams(location.search).get("trip");
  const q = trip ? "?trip=" + encodeURIComponent(trip) : "";
  const dentro = pagina === "viaggio.html" || pagina === "scopriViaggio.html";

  const voci = dentro
    ? [["index.html", "house", "Home", "index.html"],
       ["itinerari.html", "map-location-dot", "Viaggi", "itinerari.html"],
       ["viaggio.html" + q, "route", "Itinerario", "viaggio.html"],
       ["scopriViaggio.html" + q, "compass", "Scopri", "scopriViaggio.html"]]
    : [["index.html", "house", "Home", "index.html"],
       ["itinerari.html", "map-location-dot", "Itinerari", "itinerari.html"],
       ["scopri.html", "compass", "Scopri di più", "scopri.html"]];

  const paginaAttiva = pagina === "luogo.html"
    ? (new URLSearchParams(location.search).get("m") === "scopri" ? "scopri.html" : "itinerari.html")
    : pagina;
  const attiva = Math.max(0, voci.findIndex(v => v[3] === paginaAttiva));
  const pos = i => ((i + .5) / voci.length) * 100;

  const s = document.createElement("style");
  s.textContent = `
    body.v2 .navbar.transparent { display: none; }
    body.v2 .v2-main { padding-top: calc(104px + env(safe-area-inset-top)); }
    .bar { position: fixed; z-index: 1000; top: calc(10px + env(safe-area-inset-top)); left: 50%; transform: translateX(-50%);
      display: flex; width: min(520px, calc(100% - 24px)); padding: 8px 6px 30px; border-radius: 26px;
      background: rgba(255,255,255,.95); box-shadow: 0 10px 28px rgba(110,80,180,.2); }
    .bar-rotta { position: absolute; left: 24px; right: 24px; bottom: 15px; border-top: 2px dashed #d8ccf3; }
    .bar-rotta::before, .bar-rotta::after { content: ""; position: absolute; top: -5px; width: 8px; height: 8px; border-radius: 50%; background: #d8ccf3; }
    .bar-rotta::before { left: -4px; } .bar-rotta::after { right: -4px; }
    .bar-aereo { position: absolute; bottom: 2px; width: 28px; height: 28px; margin-left: -14px; display: grid; place-items: center;
      border-radius: 50%; background: var(--lilla, #7a5fc4); color: #fff; font-size: 12px; box-shadow: 0 4px 10px rgba(122,95,196,.45);
      transition: left .55s cubic-bezier(.5,0,.2,1); }
    .bar a { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 6px 2px 2px; border-radius: 16px; text-decoration: none;
      color: #9a8fc0; font: 800 12px 'Nunito', sans-serif; white-space: nowrap; -webkit-tap-highlight-color: transparent; transition: color .15s; }
    .bar a:hover { color: var(--lilla, #7a5fc4); }
    .bar a i { font-size: 18px; transition: transform .2s; }
    .bar a.on { color: var(--lilla, #7a5fc4); }
    .bar a.on i { transform: translateY(-1px) scale(1.1); }
    @media (prefers-reduced-motion: reduce) { .bar-aereo { transition: none; } }`;
  document.head.appendChild(s);

  const nav = document.createElement("nav");
  nav.id = "bar-viaggio"; nav.className = "bar"; nav.setAttribute("aria-label", "Menu");
  nav.innerHTML = `<span class="bar-rotta"></span><span class="bar-aereo"><i class="fas fa-plane"></i></span>` +
    voci.map((v, i) => `<a href="${v[0]}"${i === attiva ? ' class="on" aria-current="page"' : ""}><i class="fas fa-${v[1]}"></i><span>${v[2]}</span></a>`).join("");
  document.body.appendChild(nav);

  // l'aeroplanino parte dalla voce della pagina precedente e vola fino a quella attuale
  const aereo = nav.querySelector(".bar-aereo");
  let da = pos(attiva);
  try { const p = sessionStorage.getItem("barPos"); if (p !== null) da = +p; } catch (e) {}
  aereo.style.left = da + "%";
  requestAnimationFrame(() => requestAnimationFrame(() => { aereo.style.left = pos(attiva) + "%"; }));
  try { sessionStorage.setItem("barPos", pos(attiva)); } catch (e) {}
}
montaMenu();

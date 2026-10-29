// ui.js — banner, elenco giorni e dettaglio giorno (usato da functions.js e functionsScopri.js)
import { loadTrip, tripFromUrl, infoData, gruppiGiorno } from "./parser.js";
import { SCENE } from "./scene.js";

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// "Grecia 2024 – Santorini" -> { titolo: "Grecia", anno: "2024", extra: "Santorini" }
export function dividiNome(nome) {
  let extra = "";
  const parti = nome.split(" – ");
  if (parti.length > 1) { nome = parti[0]; extra = parti.slice(1).join(" – "); }
  const m = nome.match(/^(.*?)\s+(\d{4}(?:\/\d{2})?)$/);
  return m ? { titolo: m[1], anno: m[2], extra } : { titolo: nome, anno: "", extra };
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

export function heroHtml(trip, etichetta) {
  const { titolo, anno, extra } = dividiNome(trip.nome);
  const sotto = [trip.periodo, notti(trip), extra].filter(Boolean).join(" · ");
  const pillole = trip.citta.map(c =>
    `<span class="pill"><i style="background:${esc(c.colore)}"></i>${esc(c.nome)}${c.info ? ` <s>${esc(c.info)}</s>` : ""}</span>`).join("");
  return `
    <div class="trip-hero" style="--acc:${esc(trip.colore)}">
      <div class="hero-text">
        <small>${esc(etichetta)}</small>
        <h1>${esc(titolo)}${anno ? `<em>${esc(anno)}</em>` : ""}</h1>
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

// modo: "agenda" (itinerario) oppure "scopri" (luoghi di interesse)
export async function montaViaggio(modo) {
  const hero = document.getElementById("hero");
  const vista = document.getElementById("vista");
  let trip;
  try {
    trip = await loadTrip(tripFromUrl());
  } catch (e) {
    vista.innerHTML = `<p class="vuoto">${esc(e.message)}</p>`;
    return;
  }
  const agenda = modo === "agenda";
  document.title = (agenda ? "" : "Scopri – ") + trip.nome;
  hero.innerHTML = heroHtml(trip, agenda ? "il mio itinerario" : "da non perdere");

  // giorni mostrati (in "scopri" solo quelli con luoghi)
  const chiavi = Object.keys(trip.giorni).filter(k => agenda || trip.giorni[k].luoghi.length);

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
      html += `<li class="tl-item" style="--c:${esc(g.colore)}"><a href="#${k}">
        ${dataTl(trip, g, k)}
        <div class="tl-body">${d && d.sett ? `<div class="sett">${esc(d.sett)}</div>` : ""}<h3>${esc(g.titolo)}</h3><p>${esc(anteprima)}</p></div><span class="tl-bars"></span>
      </a></li>`;
    });
    html += `</ol>`;
    if (agenda && trip.foto.length) {
      html += `<div class="gallery">${trip.foto.map(f => `<img src="${esc(f.src)}" alt="${esc(f.alt)}" loading="lazy">`).join("")}</div>`;
    }
    vista.innerHTML = html;
  }

  function giorno(k) {
    const g = trip.giorni[k];
    const i = chiavi.indexOf(k);
    const d = infoData(trip, g);
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
    const prev = chiavi[i - 1], next = chiavi[i + 1];
    const etich = (agenda ? "GIORNO " : "DA VEDERE · GIORNO ") + String(k.replace(/\D/g, "")).padStart(2, "0") + (d && d.sett ? " · " + d.sett.toUpperCase() : "");
    vista.innerHTML = `
      <div class="day-top">
        <a class="back" href="#" id="back-btn">← Tutti i giorni</a>
        <span class="pn">${prev ? `<a href="#${prev}" aria-label="Giorno precedente">‹</a>` : ""}${next ? `<a href="#${next}" aria-label="Giorno successivo">›</a>` : ""}</span>
      </div>
      <div class="pass" style="--c:${esc(g.colore)}">
        <div class="pass-head">
          <div><small>${esc(etich)}</small><h3>${esc(g.titolo)}</h3></div>
          ${d ? `<div class="pass-date"><b>${d.giorno}</b><small>${d.mese.slice(0, 3)}</small></div>` : ""}
        </div>
        <div class="pass-fields">
          <div><small>DATA</small><b>${d ? d.giorno + " " + d.mese.slice(0, 3) : "—"}</b></div>
          <div><small>TAPPA</small><b>${esc(g.citta ? g.citta.nome : (trip.nome.split(" ")[0]))}</b></div>
          <div><small>${agenda ? "ATTIVITÀ" : "LUOGHI"}</small><b>${agenda ? g.attivita.length : g.luoghi.length}</b></div>
          <i class="fas fa-plane"></i>
        </div>
        <div class="pass-tear"></div>
        <div class="pass-body">${corpo}</div>
        <div class="pass-foot"><span class="hand">Buon viaggio!</span><span class="bars"></span></div>
      </div>`;
    document.getElementById("back-btn").addEventListener("click", e => { e.preventDefault(); location.hash = ""; });
  }

  function mostra() {
    const k = location.hash.slice(1);
    if (k && chiavi.includes(k)) giorno(k); else elenco();
    window.scrollTo({ top: hero.offsetHeight > 0 && k ? 0 : window.scrollY });
  }
  window.addEventListener("hashchange", mostra);
  mostra();
}

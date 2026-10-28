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
  return (SCENE[trip.scena] || SCENE.default).replace(/ACC/g, trip.colore);
}

export function notti(trip) {
  const n = Object.keys(trip.giorni).length - 1;
  return n > 0 ? `${n} nott${n === 1 ? "e" : "i"}` : "";
}

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
      ${scenaSvg(trip)}
    </div>`;
}

function badge(trip, g, chiave, colore) {
  const d = infoData(trip, g);
  const num = chiave.replace(/\D/g, "");
  return d
    ? `<div class="date" style="background:${esc(colore)}"><small>${d.mese}</small><strong>${d.giorno}</strong>${d.sett ? `<span>${d.sett}</span>` : ""}</div>`
    : `<div class="date" style="background:${esc(colore)}"><small>GIORNO</small><strong>${num}</strong></div>`;
}

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
  hero.innerHTML = heroHtml(trip, agenda ? "ITINERARIO" : "SCOPRI DI PIÙ");

  // giorni mostrati (in "scopri" solo quelli con luoghi)
  const chiavi = Object.keys(trip.giorni).filter(k => agenda || trip.giorni[k].luoghi.length);

  function elenco() {
    if (!chiavi.length) {
      vista.innerHTML = `<p class="vuoto">Nessuna descrizione ancora per questo viaggio.</p>`;
      return;
    }
    let html = `<div class="tiles">`;
    let cittaPrec = null;
    chiavi.forEach(k => {
      const g = trip.giorni[k];
      if (g.citta && g.citta !== cittaPrec) {
        cittaPrec = g.citta;
        html += `</div><div class="city" style="--c:${esc(g.citta.colore)}"><h2>${esc(g.citta.nome)}</h2><span>${esc(g.citta.info)}</span></div><div class="tiles">`;
      }
      const anteprima = agenda
        ? g.attivita.filter(a => /^\d/.test(a.ora || "") ? !/pranzo|cena|colazione/i.test(a.attivita) : true).slice(0, 2).map(a => a.attivita).join(" · ")
        : g.luoghi.slice(0, 3).map(l => l.titolo).join(" · ");
      html += `<a class="tile" href="#${k}">
        ${badge(trip, g, k, g.colore)}
        <div class="tile-body"><h3>${esc(g.titolo)}</h3><p>${esc(anteprima)}</p></div>
      </a>`;
    });
    html += `</div>`;
    if (agenda && trip.foto.length) {
      html += `<div class="gallery">${trip.foto.map(f => `<img src="${esc(f.src)}" alt="${esc(f.alt)}" loading="lazy">`).join("")}</div>`;
    }
    vista.innerHTML = html;
  }

  function giorno(k) {
    const g = trip.giorni[k];
    const i = chiavi.indexOf(k);
    let corpo = "";
    if (agenda) {
      gruppiGiorno(g).forEach(gr => {
        corpo += `<div class="row"><b>${esc(gr.etichetta)}</b><div>` + gr.voci.map(a => {
          const t = /^\d/.test(a.ora || "") ? `<span class="t">${esc(a.ora)}</span> ` : "";
          return `<div class="line">${t}${esc(a.attivita)}${a.nota ? `<span class="nota">${esc(a.nota)}</span>` : ""}</div>`;
        }).join("") + `</div></div>`;
      });
      g.noteFinali.forEach(n => { corpo += `<div class="note">${esc(n)}</div>`; });
    } else {
      corpo = `<ul class="luoghi">` + g.luoghi.map(l =>
        `<li><span class="ic">${l.icona ? `<i class="fas fa-${esc(l.icona)}"></i>` : ""}</span><div><strong>${esc(l.titolo)}</strong><span>${esc(l.descrizione)}</span></div></li>`).join("") + `</ul>`;
    }
    const prev = chiavi[i - 1], next = chiavi[i + 1];
    vista.innerHTML = `
      <div class="day-top">
        <a class="back" href="#" id="back-btn">← Tutti i giorni</a>
        <span class="pn">${prev ? `<a href="#${prev}" aria-label="Giorno precedente">‹</a>` : ""}${next ? `<a href="#${next}" aria-label="Giorno successivo">›</a>` : ""}</span>
      </div>
      <div class="card">
        ${badge(trip, g, k, g.colore)}
        <div class="body"><h3>${esc(g.titolo)}</h3>${corpo}</div>
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

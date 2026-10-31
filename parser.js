// parser.js — legge i viaggi scritti in testo semplice (cartella data/)
//
// FORMATO di data/<id>.txt
//   # Nome viaggio | Periodo | latitudine, longitudine     <- prima riga (serve alla mappa)
//   @foto img/IMG_0001.JPG | Tokyo                         <- opzionale, una riga per foto
//   @colore #c8353d                                        <- opzionale, colore del viaggio
//   @scena londra                                          <- opzionale, disegno del banner (vedi scene.js)
//   @tipo fuga                                             <- opzionale: "fuga" oppure "avventura" (se manca: fuga)
//   @area europa                                           <- opzionale: "europa" oppure "asia" (se manca: nessuna etichetta)
//   @citta Osaka | 3 notti                                 <- opzionale, "pillola" delle tappe nel banner
//   ## Titolo del giorno                                   <- inizia un nuovo giorno
//   08:45 | Attività | nota facoltativa                    <- una riga per attività
//   > Nota di fine giornata                                <- nota finale (facoltativa)
//   + Nome luogo | icona | Descrizione                     <- luogo per "Scopri di più" (facoltativo)
//   // commento (ignorato)
//
// I giorni si numerano da soli: giorno1, giorno2, ...

const SEP = " | ";
const PALETTE = ["#d9a63c", "#e58aa3", "#d9442f", "#6f9bd6", "#7bb08a", "#a78bd0"];

// ---- categorie "travel" (usate da itinerari.html) ----
export const TIPI = {
  fuga:      { emoji: "✈️", nome: "Fughe" },
  avventura: { emoji: "🌍", nome: "Avventure" }
};
export const AREE = {
  europa: { emoji: "🇪🇺", nome: "Europa" },
  asia:   { emoji: "🌸", nome: "Asia" }
};

// da quanti giorni in poi un viaggio è "avventura" (sotto = "fuga")
export const SOGLIA_AVVENTURA = 5;

export function parseTrip(testo) {
  const trip = { nome: "", periodo: "", lat: 0, lng: 0, foto: [], citta: [], colore: "#6a0dad", scena: "", tipo: "", area: "", giorni: {} };
  let n = 0;
  let giorno = null;

  testo.split(/\r?\n/).forEach(raw => {
    const riga = raw.trim();
    if (!riga || riga.startsWith("//")) return;

    if (riga.startsWith("## ")) {
      n++;
      let titolo = riga.slice(3).trim();
      let data = null;
      const m = titolo.match(/^(\d{1,2})\/(\d{1,2})\s*[–-]\s*(.*)$/);
      if (m) { data = { g: +m[1], m: +m[2] }; titolo = m[3]; }
      giorno = { titolo, data, attivita: [], noteFinali: [], luoghi: [] };
      trip.giorni["giorno" + n] = giorno;
    } else if (riga.startsWith("# ")) {
      const [nome, periodo, coord] = riga.slice(2).split(SEP).map(s => s.trim());
      const [lat, lng] = (coord || "0,0").split(",").map(Number);
      Object.assign(trip, { nome, periodo: periodo || "", lat, lng });
    } else if (riga.startsWith("@colore")) {
      trip.colore = riga.slice(7).trim();
    } else if (riga.startsWith("@scena")) {
      trip.scena = riga.slice(6).trim();
    } else if (riga.startsWith("@tipo")) {
      const v = riga.slice(5).trim().toLowerCase();
      trip.tipo = TIPI[v] ? v : "fuga";
    } else if (riga.startsWith("@area")) {
      const v = riga.slice(5).trim().toLowerCase();
      trip.area = AREE[v] ? v : "";
    } else if (riga.startsWith("@citta")) {
      const [nome, info, colore] = riga.slice(6).split(SEP).map(s => s.trim());
      trip.citta.push({ nome, info: info || "", colore: colore || PALETTE[trip.citta.length % PALETTE.length] });
    } else if (riga.startsWith("@foto")) {
      const [src, alt] = riga.slice(5).split(SEP).map(s => s.trim());
      trip.foto.push({ src, alt: alt || "" });
    } else if (!giorno) {
      return; // righe prima del primo giorno: ignorate
    } else if (riga.startsWith(">")) {
      giorno.noteFinali.push(riga.slice(1).trim());
    } else if (riga.startsWith("+")) {
      const [nome, icona, descrizione] = riga.slice(1).split(SEP).map(s => s.trim());
      giorno.luoghi.push({
        nome: icona ? `${nome} <i class='fas fa-${icona}'></i>` : nome,
        titolo: nome,
        icona: icona || "",
        descrizione: descrizione || ""
      });
    } else {
      const [ora, attivita, nota] = riga.split(SEP).map(s => s.trim());
      giorno.attivita.push({ ora, attivita: attivita || "", nota });
    }
  });

  if (!trip.scena) trip.scena = "default";

  // ogni giorno prende il colore della città citata nel titolo (l'ultima citata, es. "Gand → Bruges" = Bruges);
  // se nessuna è citata resta quella del giorno prima
  let corrente = trip.citta.length ? trip.citta[0] : null;
  Object.values(trip.giorni).forEach(g => {
    if (trip.citta.length) {
      let best = -1;
      trip.citta.forEach(c => {
        const pos = g.titolo.toLowerCase().lastIndexOf(c.nome.toLowerCase());
        if (pos > best) { best = pos; corrente = c; }
      });
    }
    g.citta = trip.citta.length ? corrente : null;
    g.colore = corrente ? corrente.colore : trip.colore;
  });
  return trip;
}

// ---- aiuti per la grafica ----
const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
const GIORNI = ["domenica","lunedì","martedì","mercoledì","giovedì","venerdì","sabato"];

// { mese: "APRILE", giorno: 5, sett: "lunedì" } oppure null se il giorno non ha data
export function infoData(trip, giorno) {
  if (!giorno.data) return null;
  const { g, m } = giorno.data;
  const anno = (trip.periodo.match(/\d{4}/) || [])[0];
  let sett = "";
  if (anno) {
    // viaggi a cavallo d'anno (es. 26 dic – 1 gen): i mesi "bassi" sono dell'anno dopo
    const primo = Object.values(trip.giorni).find(x => x.data);
    const y = (primo && m < primo.data.m) ? +anno + 1 : +anno;
    sett = GIORNI[new Date(y, m - 1, g).getDay()];
  }
  return { mese: MESI[m - 1].toUpperCase(), giorno: g, sett };
}

// raggruppa le attività in MATTINA / POMERIGGIO / SERA in base all'orario
export function gruppiGiorno(giorno) {
  const gruppi = [];
  giorno.attivita.forEach(a => {
    const t = (a.ora || "").match(/^(\d{1,2}):(\d{2})$/);
    let etichetta;
    if (t) {
      const min = +t[1] * 60 + +t[2];
      etichetta = min < 12 * 60 + 30 ? "MATTINA" : min < 18 * 60 ? "POMERIGGIO" : "SERA";
    } else {
      etichetta = /sera|cena/i.test(a.ora) ? "SERA" : (a.ora || "").toUpperCase();
    }
    let g = gruppi[gruppi.length - 1];
    if (!g || g.etichetta !== etichetta) { g = { etichetta, voci: [] }; gruppi.push(g); }
    g.voci.push(a);
  });
  return gruppi;
}

export async function loadTrip(id) {
  // no-cache: il browser controlla sempre se il file è cambiato (niente dati vecchi dopo un aggiornamento)
  const res = await fetch(`data/${id}.txt`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Viaggio "${id}" non trovato`);
  const trip = parseTrip(await res.text());
  trip.id = id;
  return trip;
}

// data/index.txt: un viaggio per riga, nel formato   id | area      es.  madrid | europa
//   (l'ordine è quello mostrato). Il tipo si calcola dai giorni (SOGLIA_AVVENTURA);
//   per forzarlo aggiungilo:   lisbona | fuga | europa
//   Se il file del viaggio ha già @tipo / @area, valgono quelli di index.txt solo se indicati qui.
export async function loadAllTrips() {
  const res = await fetch("data/index.txt", { cache: "no-cache" });
  const voci = (await res.text())
    .split(/\r?\n/).map(s => s.trim())
    .filter(s => s && !s.startsWith("//"))
    .map(r => {
      // dopo l'id, l'ordine non conta: "europa" è l'area, "fuga"/"avventura" il tipo (facoltativo)
      const [id, ...resto] = r.split("|").map(s => s.trim().toLowerCase());
      return { id, tipo: resto.find(x => TIPI[x]) || "", area: resto.find(x => AREE[x]) || "" };
    });
  const risultati = await Promise.allSettled(voci.map(v =>
    loadTrip(v.id).then(t => {
      // tipo: se scritto in index.txt (fuga/avventura) vale quello; altrimenti automatico:
      // fino a 4 giorni = fuga, da 5 giorni in su = avventura
      if (TIPI[v.tipo]) t.tipo = v.tipo;
      else t.tipo = t.tipo || (Object.keys(t.giorni).length >= SOGLIA_AVVENTURA ? "avventura" : "fuga");
      if (AREE[v.area]) t.area = v.area;
      return t;
    })));
  return risultati.filter(r => r.status === "fulfilled").map(r => r.value);
}

export function tripFromUrl() {
  return new URLSearchParams(window.location.search).get("trip") || "giappone";
}

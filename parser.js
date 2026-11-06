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
export const STAGIONI = {
  primavera: { emoji: "🌷", nome: "Primavera" },
  estate:    { emoji: "☀️", nome: "Estate" },
  autunno:   { emoji: "🍂", nome: "Autunno" },
  inverno:   { emoji: "❄️", nome: "Inverno" }
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

// stagione dal mese di partenza: dic–feb inverno, mar–mag primavera, giu–ago estate, set–nov autunno
// (si legge dalla data del primo giorno; se i giorni non hanno data, dal mese scritto nel periodo)
export function stagioneViaggio(trip) {
  const g = Object.values(trip.giorni).find(x => x.data);
  let m = g ? g.data.m : 0;
  if (!m) {
    const testo = (trip.periodo || "").toLowerCase();
    let pos = 1e9;
    MESI.forEach((nome, i) => { const p = testo.indexOf(nome); if (p >= 0 && p < pos) { pos = p; m = i + 1; } });
  }
  if (!m) return "";
  return m === 12 || m <= 2 ? "inverno" : m <= 5 ? "primavera" : m <= 8 ? "estate" : "autunno";
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

// ---- nomi, date e luoghi ----

// "Grecia 2024 – Santorini" -> { titolo: "Grecia", anno: "2024", extra: "Santorini" }
export function dividiNome(nome) {
  let extra = "";
  const parti = nome.split(" – ");
  if (parti.length > 1) { nome = parti[0]; extra = parti.slice(1).join(" – "); }
  const m = nome.match(/^(.*?)\s+(\d{4}(?:\/\d{2})?)$/);
  return m ? { titolo: m[1], anno: m[2], extra } : { titolo: nome, anno: "", extra };
}

// data di partenza (serve per ordinare i viaggi e per capire se sono futuri)
export function inizioViaggio(t) {
  const anno = (t.periodo.match(/\d{4}/) || [])[0];
  const g = Object.values(t.giorni).find(x => x.data);
  const oggi = new Date();
  if (g) {
    if (anno) return new Date(+anno, g.data.m - 1, g.data.g);
    let d = new Date(oggi.getFullYear(), g.data.m - 1, g.data.g);   // senza anno: prossima occorrenza
    if (d < oggi) d = new Date(oggi.getFullYear() + 1, g.data.m - 1, g.data.g);
    return d;
  }
  return anno ? new Date(+anno, 0, 1) : oggi;
}

const ORDINALI = ["Primo", "Secondo", "Terzo", "Quarto", "Quinto", "Sesto", "Settimo", "Ottavo", "Nono", "Decimo"];
export const ordinale = i => (ORDINALI[i] ? ORDINALI[i] + " viaggio" : (i + 1) + "° viaggio");

// raggruppa i viaggi per luogo (campo "luogo:" in index.txt; senza, ogni viaggio è un luogo a sé)
// -> [{ id, nome, trips (dal più vecchio), principale, area, tipo, ultimo }]
export function raggruppaLuoghi(trips) {
  const mappa = new Map();
  trips.forEach(t => {
    const k = t.luogo || t.id;
    if (!mappa.has(k)) mappa.set(k, []);
    mappa.get(k).push(t);
  });
  return [...mappa].map(([id, lista]) => {
    lista.sort((a, b) => a._inizio - b._inizio);
    // il viaggio "principale" dà nome, disegno e colore al luogo: quello con lo stesso id del luogo, altrimenti il più recente
    const principale = lista.find(t => t.id === id) || lista[lista.length - 1];
    return { id, nome: dividiNome(principale.nome).titolo, trips: lista, principale,
             area: principale.area, tipo: principale.tipo, ultimo: lista[lista.length - 1]._inizio };
  });
}

// ---- data/index.txt ----
// Un viaggio per riga, nel formato   id | area | ...facoltativi...      es.  madrid | europa
//   (l'ordine delle righe è quello mostrato). Dopo l'id l'ordine non conta. Facoltativi:
//   - tipo:      fuga | avventura        (se manca: fino a 4 giorni = fuga, da 5 = avventura, vedi SOGLIA_AVVENTURA)
//   - stagione:  primavera | estate | autunno | inverno   (se manca: dal mese di partenza)
//   - luogo:     luogo:londra            (viaggi con lo stesso luogo finiscono nella stessa card; se manca: da soli)
let _indice = null;
export function leggiIndice() {
  if (!_indice) {
    _indice = fetch("data/index.txt", { cache: "no-cache" })
      .then(r => { if (!r.ok) throw new Error("data/index.txt non trovato"); return r.text(); })
      .then(testo => testo.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith("//")).map(r => {
        const [id, ...resto] = r.split("|").map(s => s.trim().toLowerCase());
        const luogo = (resto.find(x => x.startsWith("luogo:")) || "").slice(6).trim();
        return { id, tipo: resto.find(x => TIPI[x]) || "", area: resto.find(x => AREE[x]) || "",
                 stagione: resto.find(x => STAGIONI[x]) || "", luogo: luogo || id };
      }));
    _indice.catch(() => { _indice = null; });
  }
  return _indice;
}

// applica a un viaggio i dati di index.txt e quelli calcolati (tipo, area, stagione, luogo, data)
function applicaVoce(t, v) {
  v = v || {};
  if (TIPI[v.tipo]) t.tipo = v.tipo;
  else t.tipo = t.tipo || (Object.keys(t.giorni).length >= SOGLIA_AVVENTURA ? "avventura" : "fuga");
  if (AREE[v.area]) t.area = v.area;
  t.stagione = v.stagione || stagioneViaggio(t);
  t.luogo = v.luogo || t.id;
  t._inizio = inizioViaggio(t);
}

export async function loadTrip(id) {
  // no-cache: il browser controlla sempre se il file è cambiato (niente dati vecchi dopo un aggiornamento)
  const [res, indice] = await Promise.all([
    fetch(`data/${id}.txt`, { cache: "no-cache" }),
    leggiIndice().catch(() => [])
  ]);
  if (!res.ok) throw new Error(`Viaggio "${id}" non trovato`);
  const trip = parseTrip(await res.text());
  trip.id = id;
  applicaVoce(trip, indice.find(v => v.id === id));
  // quanti viaggi ci sono in questo luogo (serve per il pulsante "indietro")
  trip.fratelli = indice.filter(v => v.luogo === trip.luogo).length;
  return trip;
}

export async function loadAllTrips() {
  const indice = await leggiIndice();
  const risultati = await Promise.allSettled(indice.map(v => loadTrip(v.id)));
  return risultati.filter(r => r.status === "fulfilled").map(r => r.value);
}

export function tripFromUrl() {
  return new URLSearchParams(window.location.search).get("trip") || "giappone";
}

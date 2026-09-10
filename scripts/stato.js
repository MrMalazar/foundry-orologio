import { MODULO, MIN_SEGMENTI, MAX_SEGMENTI, PALETTE } from "./costanti.js";

/* ------------------------------------------------------------------ */
/*  Modello                                                            */
/* ------------------------------------------------------------------ */

export function limitaSegmenti(n) {
  n = Number.parseInt(n, 10);
  if (!Number.isFinite(n)) n = 4;
  return Math.min(MAX_SEGMENTI, Math.max(MIN_SEGMENTI, n));
}

export function nuovoOrologio(dati = {}) {
  const segmenti = limitaSegmenti(dati.segmenti ?? 4);
  const durata = Math.max(1, Number.parseInt(dati.durata ?? 60, 10) || 60);
  return {
    id: dati.id ?? foundry.utils.randomID(),
    titolo: dati.titolo ?? "",
    segmenti,
    pieni: 0,
    durata,                      // secondi per segmento
    colore: dati.colore in PALETTE ? dati.colore : "rosso",
    ciclo: !!dati.ciclo,
    visibile: dati.visibile ?? true,
    mostraNomi: !!dati.mostraNomi,
    mostraTimer: dati.mostraTimer ?? true,
    manualeScatena: dati.manualeScatena ?? true,
    nomi: Array.from({ length: segmenti }, (_, i) => dati.nomi?.[i] ?? ""),
    eventi: dati.eventi ?? {},   // { "1": [ {tipo, bersaglio, testo, soloNarratore} ], ... }
    attivo: false,
    inPausa: false,
    bloccato: false,
    scadenza: null,              // epoch ms di fine del segmento in corso
    residuo: durata * 1000,      // ms che restano al segmento in corso quando il timer non corre
    ordine: dati.ordine ?? Date.now()
  };
}

/* ------------------------------------------------------------------ */
/*  Persistenza (impostazione di mondo, la scrive solo il narratore)   */
/* ------------------------------------------------------------------ */

export function leggi() {
  return foundry.utils.deepClone(game.settings.get(MODULO, "orologi") ?? {});
}

export async function scrivi(orologi) {
  return game.settings.set(MODULO, "orologi", orologi);
}

export function lista() {
  return Object.values(leggi()).sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0));
}

export function prendi(id) {
  return leggi()[id] ?? null;
}

/* ------------------------------------------------------------------ */
/*  Operazioni sul singolo orologio (mutano l'oggetto, non salvano)    */
/* ------------------------------------------------------------------ */

export function durataMs(c) {
  return Math.max(1, c.durata) * 1000;
}

export function residuoMs(c, ora = Date.now()) {
  if (c.attivo && !c.inPausa && c.scadenza) return Math.max(0, c.scadenza - ora);
  return Math.max(0, c.residuo ?? durataMs(c));
}

/** Frazione (0..1) del segmento in corso già trascorsa. */
export function frazioneCorrente(c, ora = Date.now()) {
  if (c.pieni >= c.segmenti) return 0;
  const tot = durataMs(c);
  const resto = residuoMs(c, ora);
  if (!c.attivo && resto >= tot) return 0;
  return Math.min(1, Math.max(0, 1 - resto / tot));
}

export function avvia(c, ora = Date.now()) {
  if (c.bloccato) return false;
  if (c.pieni >= c.segmenti) {
    c.pieni = 0;
    c.residuo = durataMs(c);
  }
  c.attivo = true;
  c.inPausa = false;
  c.scadenza = ora + Math.max(0, c.residuo ?? durataMs(c));
  return true;
}

export function pausa(c, ora = Date.now()) {
  if (!c.attivo || c.inPausa) return false;
  c.residuo = Math.max(0, (c.scadenza ?? ora) - ora);
  c.inPausa = true;
  c.scadenza = null;
  return true;
}

function riparteSegmento(c, ora) {
  c.residuo = durataMs(c);
  c.scadenza = (c.attivo && !c.inPausa) ? ora + c.residuo : null;
}

/**
 * Manda avanti di un segmento. Torna il numero (1..n) del segmento
 * appena raggiunto, così chi chiama può far scattare i suoi eventi.
 */
export function avanza(c, ora = Date.now()) {
  if (c.bloccato) return 0;
  if (c.pieni >= c.segmenti && !c.ciclo) return 0;
  c.pieni += 1;
  const raggiunto = c.pieni;
  if (c.pieni >= c.segmenti) {
    if (c.ciclo) {
      c.pieni = 0;
    } else {
      c.pieni = c.segmenti;
      c.attivo = false;
      c.inPausa = false;
    }
  }
  riparteSegmento(c, ora);
  return raggiunto;
}

export function indietro(c, ora = Date.now()) {
  if (c.bloccato) return false;
  c.pieni = Math.max(0, c.pieni - 1);
  riparteSegmento(c, ora);
  return true;
}

export function azzera(c) {
  c.pieni = 0;
  c.attivo = false;
  c.inPausa = false;
  c.scadenza = null;
  c.residuo = durataMs(c);
}

export function blocca(c, stato, ora = Date.now()) {
  c.bloccato = !!stato;
  if (c.bloccato) pausa(c, ora);
}

/* ------------------------------------------------------------------ */
/*  Formattazione                                                      */
/* ------------------------------------------------------------------ */

export function formattaMs(ms) {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(r).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

import { leggi, scrivi, avanza, indietro, avvia, pausa, blocca, azzera } from "./stato.js";
import { eseguiEventi } from "./eventi.js";

/* ------------------------------------------------------------------ */
/*  Il motore: un solo narratore connesso fa scorrere i timer          */
/* ------------------------------------------------------------------ */

export class Motore {
  static #occupato = false;
  static #intervallo = null;

  /** Vero sul client del primo narratore attivo, e solo su quello. */
  static get sonoIlMotore() {
    if (!game.user?.isGM) return false;
    const gm = game.users?.activeGM;
    return !gm || gm.id === game.user.id;
  }

  static avvia() {
    if (Motore.#intervallo) return;
    Motore.#intervallo = setInterval(() => Motore.tick(), 1000);
  }

  static async tick() {
    if (!Motore.sonoIlMotore || Motore.#occupato) return;
    Motore.#occupato = true;
    try {
      const orologi = leggi();
      const ora = Date.now();
      const scattati = [];
      for (const c of Object.values(orologi)) {
        if (!c.attivo || c.inPausa || c.bloccato || !c.scadenza) continue;
        if (ora < c.scadenza) continue;
        const raggiunto = avanza(c, ora);
        if (raggiunto) scattati.push([c, raggiunto]);
      }
      if (!scattati.length) return;
      await scrivi(orologi);
      for (const [c, segmento] of scattati) await eseguiEventi(c, segmento);
    } catch (err) {
      console.error("Orologio | errore nel motore", err);
    } finally {
      Motore.#occupato = false;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Comandi del narratore                                              */
/* ------------------------------------------------------------------ */

export async function comando(id, azione) {
  if (!game.user.isGM) return;
  const orologi = leggi();
  const c = orologi[id];
  if (!c) return;
  const ora = Date.now();
  let raggiunto = 0;
  switch (azione) {
    case "avanti":
      raggiunto = avanza(c, ora);
      break;
    case "indietro":
      indietro(c, ora);
      break;
    case "playPausa":
      if (c.bloccato || c.senzaTimer) return;
      if (c.attivo && !c.inPausa) pausa(c, ora);
      else avvia(c, ora);
      break;
    case "blocca":
      blocca(c, !c.bloccato, ora);
      break;
    case "azzera":
      azzera(c);
      break;
    case "visibile":
      c.visibile = !c.visibile;
      break;
    case "elimina":
      delete orologi[id];
      break;
    default:
      return;
  }
  await scrivi(orologi);
  if (raggiunto && (c.manualeScatena || c.senzaTimer)) await eseguiEventi(c, raggiunto);
}

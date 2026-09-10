import { SOCKET, t } from "./costanti.js";

/* ------------------------------------------------------------------ */
/*  Esecuzione degli eventi di un segmento (lato narratore)            */
/* ------------------------------------------------------------------ */

export async function eseguiEventi(c, segmento) {
  const lista = c.eventi?.[String(segmento)] ?? [];
  for (const e of lista) {
    try {
      await eseguiEvento(c, e);
    } catch (err) {
      console.error(`Orologio | evento fallito (${c.titolo}, segmento ${segmento})`, e, err);
      ui.notifications?.warn(t("Avvisi.EventoFallito", { titolo: c.titolo, segmento }));
    }
  }
}

async function eseguiEvento(c, e) {
  switch (e.tipo) {
    case "scena": {
      const scena = game.scenes.get(e.bersaglio);
      if (scena) await scena.activate();
      break;
    }
    case "journal": {
      if (!e.bersaglio) break;
      const doc = await fromUuid(e.bersaglio);
      if (doc) await mostraJournalATutti(doc);
      break;
    }
    case "immagine": {
      if (!e.bersaglio) break;
      mostraImmagine(e.bersaglio, c.titolo);
      game.socket.emit(SOCKET, { azione: "immagine", src: e.bersaglio, titolo: c.titolo });
      break;
    }
    case "macro": {
      const macro = game.macros.get(e.bersaglio);
      if (macro) await macro.execute();
      break;
    }
    case "chat": {
      if (!e.testo) break;
      const whisper = e.soloNarratore ? game.users.filter(u => u.isGM).map(u => u.id) : [];
      await ChatMessage.create({
        content: e.testo,
        speaker: { alias: c.titolo || t("Titolo") },
        whisper
      });
      break;
    }
    case "suono": {
      if (!e.bersaglio) break;
      await foundry.audio.AudioHelper.play({ src: e.bersaglio, volume: 0.8, loop: false }, true);
      break;
    }
    default:
      break;
  }
}

/* ------------------------------------------------------------------ */
/*  Mostrare cose ai giocatori                                         */
/* ------------------------------------------------------------------ */

/**
 * Journal o pagina a tutti i giocatori. Usa la via di Foundry quando c'è,
 * perché concede la lettura anche a chi non ha il permesso sul documento;
 * altrimenti passa dal socket del modulo.
 */
async function mostraJournalATutti(doc) {
  const Raccolta = foundry.documents?.collections?.Journal ?? globalThis.Journal;
  if (typeof Raccolta?.show === "function") return Raccolta.show(doc, { force: true });
  if (typeof doc.show === "function") return doc.show(true);
  mostraJournal(doc);
  game.socket.emit(SOCKET, { azione: "journal", uuid: doc.uuid });
}

export function mostraJournal(doc) {
  if (!doc) return;
  if (doc.documentName === "JournalEntryPage") doc.parent?.sheet?.render(true, { pageId: doc.id });
  else doc.sheet?.render(true);
}

export function mostraImmagine(src, titolo) {
  const Popout = foundry.applications?.apps?.ImagePopout ?? globalThis.ImagePopout;
  if (!Popout) return;
  try {
    new Popout({ src, window: { title: titolo || t("Titolo") } }).render(true);
  } catch (_err) {
    new Popout(src, { title: titolo || t("Titolo") }).render(true);
  }
}

export async function ricezioneSocket(dati) {
  if (!dati || typeof dati !== "object") return;
  switch (dati.azione) {
    case "immagine":
      mostraImmagine(dati.src, dati.titolo);
      break;
    case "journal": {
      const doc = await fromUuid(dati.uuid);
      mostraJournal(doc);
      break;
    }
    default:
      break;
  }
}

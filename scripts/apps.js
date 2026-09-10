import { MODULO, MIN_SEGMENTI, MAX_SEGMENTI, PALETTE, TIPI_EVENTO, t } from "./costanti.js";
import { leggi, scrivi, lista, prendi, nuovoOrologio, limitaSegmenti, durataMs } from "./stato.js";
import { contesto, aggiornaTempi } from "./torta.js";
import { comando } from "./motore.js";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

/* ------------------------------------------------------------------ */
/*  Gestore: la lista degli orologi con i comandi                      */
/* ------------------------------------------------------------------ */

export class OrologioManager extends HandlebarsApplicationMixin(ApplicationV2) {
  static #istanza = null;
  #orologioTempi = null;

  static DEFAULT_OPTIONS = {
    id: "orologio-gestore",
    classes: ["orologio-app"],
    tag: "div",
    window: { title: "OROLOGIO.Gestore.Titolo", icon: "fa-solid fa-clock", resizable: true },
    position: { width: 560, height: "auto" },
    actions: {
      nuovo: OrologioManager.#nuovo,
      modifica: OrologioManager.#modifica,
      elimina: OrologioManager.#elimina,
      comando: OrologioManager.#comando
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULO}/templates/gestore.hbs` }
  };

  static get istanza() {
    return OrologioManager.#istanza;
  }

  static apri() {
    OrologioManager.#istanza ??= new OrologioManager();
    return OrologioManager.#istanza.render({ force: true });
  }

  static aggiorna() {
    const app = OrologioManager.#istanza;
    if (app?.rendered) app.render();
  }

  async _prepareContext() {
    const ora = Date.now();
    return { orologi: lista().map(c => contesto(c, true, ora)) };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    if (!this.#orologioTempi) {
      this.#orologioTempi = setInterval(() => aggiornaTempi(this.element, leggi(), true), 1000);
    }
  }

  async _onClose(options) {
    super._onClose?.(options);
    clearInterval(this.#orologioTempi);
    this.#orologioTempi = null;
  }

  static #nuovo() {
    OrologioConfig.nuovo();
  }

  static #modifica(event, target) {
    const id = target.closest("[data-id]")?.dataset.id;
    if (id) OrologioConfig.apri(id);
  }

  static async #elimina(event, target) {
    const id = target.closest("[data-id]")?.dataset.id;
    const c = id && prendi(id);
    if (!c) return;
    const ok = await DialogV2.confirm({
      window: { title: t("Gestore.EliminaTitolo") },
      content: `<p>${t("Gestore.EliminaTesto", { titolo: foundry.utils.escapeHTML(c.titolo || t("Titolo")) })}</p>`,
      rejectClose: false,
      modal: true
    });
    if (!ok) return;
    OrologioConfig.chiudi(id);
    await comando(id, "elimina");
  }

  static #comando(event, target) {
    const id = target.closest("[data-id]")?.dataset.id;
    const azione = target.dataset.azione;
    if (id && azione) return comando(id, azione);
  }
}

/* ------------------------------------------------------------------ */
/*  Configurazione di un orologio                                      */
/* ------------------------------------------------------------------ */

export class OrologioConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static #aperte = new Map();

  constructor(bozza, options = {}) {
    super(options);
    this.bozza = bozza;
  }

  static DEFAULT_OPTIONS = {
    classes: ["orologio-app", "orologio-config"],
    tag: "form",
    window: { title: "OROLOGIO.Config.Titolo", icon: "fa-solid fa-clock", resizable: true },
    position: { width: 600, height: "auto" },
    form: {
      handler: OrologioConfig.#salva,
      closeOnSubmit: true,
      submitOnChange: false
    },
    actions: {
      aggiungiEvento: OrologioConfig.#aggiungiEvento,
      rimuoviEvento: OrologioConfig.#rimuoviEvento,
      sfoglia: OrologioConfig.#sfoglia
    }
  };

  static PARTS = {
    form: { template: `modules/${MODULO}/templates/config.hbs`, scrollable: [".orologio-config-corpo"] }
  };

  get title() {
    const nome = this.bozza.titolo?.trim();
    return nome ? `${t("Config.Titolo")}: ${nome}` : t("Config.Titolo");
  }

  static nuovo() {
    const bozza = nuovoOrologio();
    const app = new OrologioConfig(bozza, { id: `orologio-config-${bozza.id}` });
    OrologioConfig.#aperte.set(bozza.id, app);
    return app.render({ force: true });
  }

  static apri(id) {
    const salvato = prendi(id);
    if (!salvato) return;
    let app = OrologioConfig.#aperte.get(id);
    if (!app) {
      app = new OrologioConfig(foundry.utils.deepClone(salvato), { id: `orologio-config-${id}` });
      OrologioConfig.#aperte.set(id, app);
    }
    return app.render({ force: true });
  }

  static chiudi(id) {
    const app = OrologioConfig.#aperte.get(id);
    if (app?.rendered) app.close();
    OrologioConfig.#aperte.delete(id);
  }

  async _onClose(options) {
    super._onClose?.(options);
    OrologioConfig.#aperte.delete(this.bozza.id);
  }

  /* ---------------------------- contesto ---------------------------- */

  async _prepareContext() {
    const o = this.bozza;
    const segmentiOpzioni = [];
    for (let n = MIN_SEGMENTI; n <= MAX_SEGMENTI; n++) segmentiOpzioni.push({ value: n, selected: n === o.segmenti });
    const colori = Object.entries(PALETTE).map(([chiave, hex]) => ({
      chiave, hex, selected: chiave === o.colore, etichetta: t(`Colori.${chiave}`)
    }));
    const righe = [];
    for (let s = 1; s <= o.segmenti; s++) {
      const eventi = (o.eventi?.[String(s)] ?? []).map((e, k) => this.#contestoEvento(e, s, k));
      righe.push({ s, i: s - 1, nome: o.nomi?.[s - 1] ?? "", eventi });
    }
    return {
      o,
      minuti: Math.floor(o.durata / 60),
      secondi: o.durata % 60,
      segmentiOpzioni,
      colori,
      righe
    };
  }

  #contestoEvento(e, s, k) {
    const tipi = TIPI_EVENTO.map(v => ({ value: v, label: t(`Eventi.${v}`), selected: v === e.tipo }));
    const nome = `eventi.${s}.${k}`;
    let campo = "select", tipoFile = "", opzioni = [];
    switch (e.tipo) {
      case "scena":
        opzioni = game.scenes.contents.map(sc => ({ value: sc.id, label: sc.name }));
        break;
      case "journal":
        for (const j of game.journal.contents) {
          opzioni.push({ value: j.uuid, label: j.name });
          for (const p of j.pages.contents) opzioni.push({ value: p.uuid, label: `   — ${p.name}` });
        }
        break;
      case "macro":
        opzioni = game.macros.contents.map(m => ({ value: m.id, label: m.name }));
        break;
      case "immagine":
        campo = "file"; tipoFile = "image";
        break;
      case "suono":
        campo = "file"; tipoFile = "audio";
        break;
      case "chat":
        campo = "chat";
        break;
    }
    opzioni.sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
    if (campo === "select") {
      opzioni.unshift({ value: "", label: t("Config.Scegli") });
      for (const op of opzioni) op.selected = op.value === (e.bersaglio ?? "");
    }
    return { ...e, s, k, nome, tipi, campo, tipoFile, opzioni };
  }

  /* --------------------------- interazione -------------------------- */

  _onRender(context, options) {
    super._onRender?.(context, options);
    for (const el of this.element.querySelectorAll(".ricalcola")) {
      el.addEventListener("change", () => {
        this.#cattura();
        this.render();
      });
    }
  }

  /** Legge il form com'è adesso e lo riversa nella bozza. */
  #cattura() {
    if (!this.form) return;
    const dati = new foundry.applications.ux.FormDataExtended(this.form).object;
    this.bozza = OrologioConfig.normalizza(this.bozza, dati);
  }

  static #aggiungiEvento(event, target) {
    this.#cattura();
    const s = String(target.dataset.segmento);
    this.bozza.eventi[s] ??= [];
    this.bozza.eventi[s].push({ tipo: "scena", bersaglio: "", testo: "", soloNarratore: false });
    this.render();
  }

  static #rimuoviEvento(event, target) {
    this.#cattura();
    const s = String(target.dataset.segmento);
    const k = Number.parseInt(target.dataset.k, 10);
    this.bozza.eventi[s]?.splice(k, 1);
    if (!this.bozza.eventi[s]?.length) delete this.bozza.eventi[s];
    this.render();
  }

  static #sfoglia(event, target) {
    const input = this.form.querySelector(`[name="${target.dataset.campo}"]`);
    if (!input) return;
    const Picker = foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
    new Picker({
      type: target.dataset.tipo || "any",
      current: input.value || "",
      callback: percorso => { input.value = percorso; }
    }).render(true);
  }

  /* ---------------------------- salvataggio ------------------------- */

  static async #salva(event, form, formData) {
    const bozza = OrologioConfig.normalizza(this.bozza, formData.object);
    const orologi = leggi();
    const esistente = orologi[bozza.id];
    const c = esistente ?? nuovoOrologio({ id: bozza.id });
    const durataCambiata = c.durata !== bozza.durata;
    for (const k of ["titolo", "segmenti", "durata", "colore", "ciclo", "visibile", "mostraNomi", "mostraTimer", "manualeScatena", "nomi", "eventi"]) {
      c[k] = bozza[k];
    }
    if (!c.titolo.trim()) c.titolo = t("Titolo");
    c.pieni = Math.min(c.pieni, c.segmenti);
    if (durataCambiata && !(c.attivo && !c.inPausa)) c.residuo = durataMs(c);
    orologi[c.id] = c;
    await scrivi(orologi);
    this.bozza = foundry.utils.deepClone(c);
  }

  /** Dai dati piatti del form alla forma dell'orologio. */
  static normalizza(base, dati) {
    const o = foundry.utils.deepClone(base);
    const d = foundry.utils.expandObject(dati);
    if (d.titolo !== undefined) o.titolo = String(d.titolo ?? "").trim();
    if (d.segmenti !== undefined) o.segmenti = limitaSegmenti(d.segmenti);
    const minuti = Math.max(0, Number.parseInt(d.minuti ?? Math.floor(o.durata / 60), 10) || 0);
    const secondi = Math.max(0, Number.parseInt(d.secondi ?? (o.durata % 60), 10) || 0);
    o.durata = Math.max(1, minuti * 60 + secondi);
    if (d.colore in PALETTE) o.colore = d.colore;
    for (const k of ["ciclo", "visibile", "mostraNomi", "mostraTimer", "manualeScatena"]) {
      if (d[k] !== undefined) o[k] = !!d[k];
    }
    const nomi = Array.from({ length: o.segmenti }, (_, i) => {
      const v = d.nomi?.[String(i)];
      return String(v ?? o.nomi?.[i] ?? "").trim();
    });
    o.nomi = nomi;
    if (d.eventi !== undefined) {
      const eventi = {};
      for (const [s, gruppo] of Object.entries(d.eventi ?? {})) {
        const n = Number.parseInt(s, 10);
        if (!Number.isFinite(n) || n < 1 || n > o.segmenti) continue;
        const righe = Array.isArray(gruppo) ? gruppo : Object.keys(gruppo).sort((a, b) => a - b).map(k => gruppo[k]);
        const puliti = righe.filter(Boolean).map(e => ({
          tipo: TIPI_EVENTO.includes(e.tipo) ? e.tipo : "scena",
          bersaglio: String(e.bersaglio ?? "").trim(),
          testo: String(e.testo ?? ""),
          soloNarratore: !!e.soloNarratore
        }));
        if (puliti.length) eventi[String(n)] = puliti;
      }
      o.eventi = eventi;
    } else {
      for (const s of Object.keys(o.eventi ?? {})) if (Number.parseInt(s, 10) > o.segmenti) delete o.eventi[s];
    }
    return o;
  }
}

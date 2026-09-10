import { MODULO, MODI_PANNELLO } from "./costanti.js";
import { leggi, lista } from "./stato.js";
import { contesto, aggiornaTempi } from "./torta.js";
import { comando } from "./motore.js";

/* ------------------------------------------------------------------ */
/*  Il pannello sul tavolo: i giocatori guardano, il narratore comanda */
/*                                                                     */
/*  Tre stati, scelti da ogni utente per sé:                           */
/*   grande  – le schede complete, dove l'utente lo ha trascinato      */
/*   piccolo – schede ridotte, ancorato in basso a sinistra accanto    */
/*             alla lista dei giocatori (si può comunque trascinare)   */
/*   minimo  – solo nome e conto alla rovescia, una riga per orologio  */
/* ------------------------------------------------------------------ */

export class Pannello {
  static el = null;
  static #trascino = null;

  static get visibile() {
    return game.settings.get(MODULO, "pannelloVisibile");
  }

  static get stato() {
    const s = game.settings.get(MODULO, "statoPannello") ?? {};
    return {
      modo: MODI_PANNELLO.includes(s.modo) ? s.modo : "grande",
      ancorato: !!s.ancorato,
      left: Number.isFinite(s.left) ? s.left : 110,
      top: Number.isFinite(s.top) ? s.top : 56,
      ridimensionabile: !!s.ridimensionabile,
      zoom: Number.isFinite(s.zoom) ? Math.min(3, Math.max(0.5, s.zoom)) : 1
    };
  }

  static async salvaStato(modifiche) {
    await game.settings.set(MODULO, "statoPannello", { ...Pannello.stato, ...modifiche });
  }

  static async imposta(visibile) {
    await game.settings.set(MODULO, "pannelloVisibile", !!visibile);
    Pannello.render();
  }

  static async alterna() {
    return Pannello.imposta(!Pannello.visibile);
  }

  /** Cambia stato: grande torna libero, piccolo si ancora, minimo tiene l'ancoraggio che ha. */
  static async cambiaModo(modo) {
    if (!MODI_PANNELLO.includes(modo)) return;
    const modifiche = { modo };
    if (modo === "grande") modifiche.ancorato = false;
    if (modo === "piccolo") modifiche.ancorato = true;
    await Pannello.salvaStato(modifiche);
    Pannello.render();
  }

  /** Accende o spegne la maniglia di ridimensionamento. */
  static async alternaRidimensionamento() {
    await Pannello.salvaStato({ ridimensionabile: !Pannello.stato.ridimensionabile });
    Pannello.render();
  }

  static init() {
    if (Pannello.el) return;
    const el = document.createElement("div");
    el.id = "orologio-panel";
    el.classList.add("nascosto");
    document.body.append(el);
    Pannello.el = el;
    el.addEventListener("click", Pannello.#onClick);
    el.addEventListener("pointerdown", Pannello.#onPointerDown);
    window.addEventListener("resize", () => Pannello.posiziona());
    Hooks.on("renderPlayers", () => Pannello.posiziona());
    setInterval(() => aggiornaTempi(Pannello.el, leggi(), game.user.isGM), 1000);
    Pannello.render();
  }

  /** Mette il pannello dove deve stare: ancorato accanto ai giocatori, oppure dove l'utente lo ha lasciato. */
  static posiziona() {
    const el = Pannello.el;
    if (!el) return;
    const s = Pannello.stato;
    el.classList.toggle("ancorato", s.ancorato);
    el.classList.toggle("ridimensionabile", s.ridimensionabile);
    Pannello.#applicaZoom(s.zoom);
    if (s.ancorato) {
      const giocatori = document.getElementById("players");
      const r = giocatori?.getBoundingClientRect();
      const left = r && r.width ? r.right + 8 : 10;
      const bottom = r && r.width ? Math.max(8, window.innerHeight - r.bottom) : 10;
      el.style.left = `${Math.round(left)}px`;
      el.style.top = "auto";
      el.style.bottom = `${Math.round(bottom)}px`;
    } else {
      el.style.left = `${Math.max(0, s.left)}px`;
      el.style.top = `${Math.max(0, s.top)}px`;
      el.style.bottom = "auto";
    }
  }

  static async render() {
    const el = Pannello.el;
    if (!el) return;
    const gm = game.user.isGM;
    const orologi = lista().filter(c => gm || c.visibile);
    const mostra = Pannello.visibile && orologi.length > 0;
    el.classList.toggle("nascosto", !mostra);
    el.classList.toggle("narratore", gm);
    const s = Pannello.stato;
    for (const m of MODI_PANNELLO) el.classList.toggle(`modo-${m}`, s.modo === m);
    if (!mostra) {
      el.innerHTML = "";
      return;
    }
    const ora = Date.now();
    const html = await foundry.applications.handlebars.renderTemplate(
      `modules/${MODULO}/templates/pannello.hbs`,
      {
        gm,
        modo: s.modo,
        grande: s.modo === "grande",
        piccolo: s.modo === "piccolo",
        minimo: s.modo === "minimo",
        ridimensionabile: s.ridimensionabile,
        orologi: orologi.map(c => contesto(c, gm, ora))
      }
    );
    // Lo zoom sta su un involucro interno, così left e top del pannello restano in pixel veri.
    el.innerHTML = `<div class="orologio-zoom">${html}</div>`;
    Pannello.posiziona();
  }

  static #applicaZoom(zoom) {
    const involucro = Pannello.el?.querySelector(".orologio-zoom");
    if (involucro) involucro.style.zoom = String(zoom);
  }

  static #onClick(event) {
    const bottone = event.target.closest("[data-azione]");
    if (!bottone) return;
    event.preventDefault();
    const azione = bottone.dataset.azione;
    if (azione === "modo") return Pannello.cambiaModo(bottone.dataset.modo);
    if (azione === "ridimensiona") return Pannello.alternaRidimensionamento();
    if (!game.user.isGM) return;
    const id = bottone.closest("[data-id]")?.dataset.id;
    if (!id) return;
    if (azione === "modifica") {
      return import("./apps.js").then(m => m.OrologioConfig.apri(id));
    }
    return comando(id, azione);
  }

  /* Trascinamento dalla presa in alto */

  static #onPointerDown(event) {
    if (event.target.closest(".orologio-maniglia")) return Pannello.#iniziaRidimensione(event);
    if (!event.target.closest(".orologio-presa") || event.target.closest("[data-azione]")) return;
    event.preventDefault();
    const rect = Pannello.el.getBoundingClientRect();
    Pannello.#trascino = { dx: event.clientX - rect.left, dy: event.clientY - rect.top, mosso: false };
    window.addEventListener("pointermove", Pannello.#onPointerMove);
    window.addEventListener("pointerup", Pannello.#onPointerUp, { once: true });
  }

  static #onPointerMove = (event) => {
    const d = Pannello.#trascino;
    if (!d) return;
    d.mosso = true;
    const left = Math.max(0, Math.min(window.innerWidth - 60, event.clientX - d.dx));
    const top = Math.max(0, Math.min(window.innerHeight - 40, event.clientY - d.dy));
    Pannello.el.classList.remove("ancorato");
    Pannello.el.style.left = `${left}px`;
    Pannello.el.style.top = `${top}px`;
    Pannello.el.style.bottom = "auto";
  };

  static #onPointerUp = () => {
    window.removeEventListener("pointermove", Pannello.#onPointerMove);
    const d = Pannello.#trascino;
    Pannello.#trascino = null;
    if (!d?.mosso) return;
    const left = Number.parseInt(Pannello.el.style.left, 10) || 0;
    const top = Number.parseInt(Pannello.el.style.top, 10) || 0;
    Pannello.salvaStato({ left, top, ancorato: false });
  };

  /* Ridimensionamento dalla maniglia in basso a destra: scala tutto il pannello */

  static #ridimensione = null;

  static #iniziaRidimensione(event) {
    event.preventDefault();
    event.stopPropagation();
    const rect = Pannello.el.getBoundingClientRect();
    Pannello.#ridimensione = { x0: event.clientX, y0: event.clientY, w0: rect.width, h0: rect.height, zoom0: Pannello.stato.zoom };
    window.addEventListener("pointermove", Pannello.#onRidimensiona);
    window.addEventListener("pointerup", Pannello.#fineRidimensione, { once: true });
  }

  static #onRidimensiona = (event) => {
    const d = Pannello.#ridimensione;
    if (!d) return;
    const rapporto = Math.max((d.w0 + event.clientX - d.x0) / d.w0, (d.h0 + event.clientY - d.y0) / d.h0);
    const zoom = Math.min(3, Math.max(0.5, d.zoom0 * rapporto));
    Pannello.#applicaZoom(zoom);
    Pannello.el.dataset.zoom = String(zoom);
  };

  static #fineRidimensione = () => {
    window.removeEventListener("pointermove", Pannello.#onRidimensiona);
    Pannello.#ridimensione = null;
    const zoom = Number.parseFloat(Pannello.el.dataset.zoom);
    if (Number.isFinite(zoom)) Pannello.salvaStato({ zoom }).then(() => Pannello.posiziona());
  };
}

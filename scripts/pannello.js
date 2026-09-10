import { MODULO } from "./costanti.js";
import { leggi, lista } from "./stato.js";
import { contesto, aggiornaTempi } from "./torta.js";
import { comando } from "./motore.js";

/* ------------------------------------------------------------------ */
/*  Il pannello sul tavolo: i giocatori guardano, il narratore comanda */
/* ------------------------------------------------------------------ */

export class Pannello {
  static el = null;
  static #trascino = null;

  static get visibile() {
    return game.settings.get(MODULO, "pannelloVisibile");
  }

  static async imposta(visibile) {
    await game.settings.set(MODULO, "pannelloVisibile", !!visibile);
    Pannello.render();
  }

  static init() {
    if (Pannello.el) return;
    const el = document.createElement("div");
    el.id = "orologio-panel";
    el.classList.add("nascosto");
    document.body.append(el);
    Pannello.el = el;
    Pannello.#posiziona();
    el.addEventListener("click", Pannello.#onClick);
    el.addEventListener("pointerdown", Pannello.#onPointerDown);
    setInterval(() => aggiornaTempi(Pannello.el, leggi(), game.user.isGM), 1000);
    Pannello.render();
  }

  static #posiziona() {
    const pos = game.settings.get(MODULO, "posizionePannello") ?? {};
    const left = Number.isFinite(pos.left) ? pos.left : 110;
    const top = Number.isFinite(pos.top) ? pos.top : 10;
    Pannello.el.style.left = `${Math.max(0, left)}px`;
    Pannello.el.style.top = `${Math.max(0, top)}px`;
  }

  static async render() {
    const el = Pannello.el;
    if (!el) return;
    const gm = game.user.isGM;
    const orologi = lista().filter(c => gm || c.visibile);
    const mostra = Pannello.visibile && orologi.length > 0;
    el.classList.toggle("nascosto", !mostra);
    el.classList.toggle("narratore", gm);
    if (!mostra) {
      el.innerHTML = "";
      return;
    }
    const ora = Date.now();
    const html = await foundry.applications.handlebars.renderTemplate(
      `modules/${MODULO}/templates/pannello.hbs`,
      { gm, orologi: orologi.map(c => contesto(c, gm, ora)) }
    );
    el.innerHTML = html;
  }

  static #onClick(event) {
    const bottone = event.target.closest("[data-azione]");
    if (!bottone || !game.user.isGM) return;
    event.preventDefault();
    const id = bottone.closest("[data-id]")?.dataset.id;
    const azione = bottone.dataset.azione;
    if (!id) return;
    if (azione === "modifica") {
      return import("./apps.js").then(m => m.OrologioConfig.apri(id));
    }
    return comando(id, azione);
  }

  /* Trascinamento dalla presa in alto */

  static #onPointerDown(event) {
    if (!event.target.closest(".orologio-presa")) return;
    event.preventDefault();
    const rect = Pannello.el.getBoundingClientRect();
    Pannello.#trascino = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    window.addEventListener("pointermove", Pannello.#onPointerMove);
    window.addEventListener("pointerup", Pannello.#onPointerUp, { once: true });
  }

  static #onPointerMove = (event) => {
    const d = Pannello.#trascino;
    if (!d) return;
    const left = Math.max(0, Math.min(window.innerWidth - 60, event.clientX - d.dx));
    const top = Math.max(0, Math.min(window.innerHeight - 40, event.clientY - d.dy));
    Pannello.el.style.left = `${left}px`;
    Pannello.el.style.top = `${top}px`;
  };

  static #onPointerUp = () => {
    window.removeEventListener("pointermove", Pannello.#onPointerMove);
    Pannello.#trascino = null;
    const left = Number.parseInt(Pannello.el.style.left, 10) || 0;
    const top = Number.parseInt(Pannello.el.style.top, 10) || 0;
    game.settings.set(MODULO, "posizionePannello", { left, top });
  };
}

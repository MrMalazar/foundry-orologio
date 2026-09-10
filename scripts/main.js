import { MODULO, SOCKET } from "./costanti.js";
import { Pannello } from "./pannello.js";
import { Motore } from "./motore.js";
import { ricezioneSocket } from "./eventi.js";
import { OrologioManager, OrologioConfig } from "./apps.js";

/* ------------------------------------------------------------------ */
/*  Un livello vuoto: serve solo a dare un'icona alla barra di sinistra */
/* ------------------------------------------------------------------ */

class OrologioLayer extends foundry.canvas.layers.InteractionLayer {
  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, { name: MODULO, zIndex: 900 });
  }
}

/* ------------------------------------------------------------------ */
/*  Avvio                                                              */
/* ------------------------------------------------------------------ */

Hooks.once("init", () => {
  CONFIG.Canvas.layers[MODULO] = { layerClass: OrologioLayer, group: "interface" };

  game.settings.register(MODULO, "orologi", {
    scope: "world",
    config: false,
    type: Object,
    default: {},
    onChange: () => {
      Pannello.render();
      OrologioManager.aggiorna();
    }
  });

  game.settings.register(MODULO, "pannelloVisibile", {
    scope: "client",
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULO, "statoPannello", {
    scope: "client",
    config: false,
    type: Object,
    default: { modo: "grande", ancorato: false, left: 110, top: 56 }
  });

  game.socket.on(SOCKET, ricezioneSocket);
});

Hooks.once("ready", () => {
  Pannello.init();
  Motore.avvia();
  game.modules.get(MODULO).api = { OrologioManager, OrologioConfig, Pannello, Motore };
});

/* ------------------------------------------------------------------ */
/*  Barra di sinistra                                                  */
/*                                                                     */
/*  L'icona dell'orologio si comporta da bottone: il giocatore accende */
/*  o spegne la sua vista del pannello, il narratore apre il gestore.  */
/*  Subito dopo si torna al controllo di prima, così i gettoni restano */
/*  selezionabili e il livello vuoto non resta attivo.                 */
/* ------------------------------------------------------------------ */

let controlloPrecedente = "tokens";

Hooks.on("renderSceneControls", app => {
  const nome = app.control?.name ?? app.activeControl;
  if (nome && nome !== MODULO) controlloPrecedente = nome;
});

function tornaAlControlloPrecedente() {
  const nome = controlloPrecedente in (ui.controls?.controls ?? {}) ? controlloPrecedente : "tokens";
  window.setTimeout(() => {
    try {
      ui.controls.activate({ control: nome });
    } catch (err) {
      console.warn("Orologio | non riesco a tornare al controllo precedente", err);
    }
  }, 0);
}

Hooks.on("getSceneControlButtons", controls => {
  const gm = game.user?.isGM ?? false;
  controls[MODULO] = {
    name: MODULO,
    title: gm ? "OROLOGIO.Controlli.TitoloNarratore" : "OROLOGIO.Controlli.TitoloGiocatore",
    icon: "fa-solid fa-clock",
    order: 90,
    visible: true,
    layer: MODULO,
    activeTool: gm ? "gestisci" : "pannello",
    onChange: (event, attivo) => {
      if (!attivo) return;
      if (gm) OrologioManager.apri();
      else Pannello.alterna();
      tornaAlControlloPrecedente();
    },
    tools: {
      gestisci: {
        name: "gestisci",
        title: "OROLOGIO.Controlli.Gestisci",
        icon: "fa-solid fa-list-check",
        order: 1,
        button: true,
        visible: gm,
        onChange: () => OrologioManager.apri()
      },
      nuovo: {
        name: "nuovo",
        title: "OROLOGIO.Controlli.Nuovo",
        icon: "fa-solid fa-plus",
        order: 2,
        button: true,
        visible: gm,
        onChange: () => OrologioConfig.nuovo()
      },
      pannello: {
        name: "pannello",
        title: "OROLOGIO.Controlli.Pannello",
        icon: "fa-solid fa-eye",
        order: 3,
        toggle: true,
        visible: !gm,
        active: game.settings.get(MODULO, "pannelloVisibile"),
        onChange: (event, attivo) => Pannello.imposta(attivo)
      }
    }
  };
});

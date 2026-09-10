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

  game.settings.register(MODULO, "posizionePannello", {
    scope: "client",
    config: false,
    type: Object,
    default: { left: 110, top: 10 }
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
/* ------------------------------------------------------------------ */

Hooks.on("getSceneControlButtons", controls => {
  const gm = game.user?.isGM ?? false;
  controls[MODULO] = {
    name: MODULO,
    title: "OROLOGIO.Controlli.Titolo",
    icon: "fa-solid fa-clock",
    order: 90,
    visible: true,
    layer: MODULO,
    activeTool: "pannello",
    onChange: (event, attivo) => {
      if (attivo && gm) OrologioManager.apri();
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
        active: game.settings.get(MODULO, "pannelloVisibile"),
        onChange: (event, attivo) => Pannello.imposta(attivo)
      }
    }
  };
});

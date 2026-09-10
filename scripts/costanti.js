export const MODULO = "orologio";
export const SOCKET = `module.${MODULO}`;
export const MIN_SEGMENTI = 3;
export const MAX_SEGMENTI = 16;

// Tavolozza semplice: una tinta per orologio.
export const PALETTE = {
  rosso: "#c0392b",
  ambra: "#d68910",
  verde: "#27ae60",
  azzurro: "#2e86c1",
  viola: "#8e44ad",
  avorio: "#e8e2d0"
};

export const COLORE_VUOTO = "#26262b";

// Diametro della torta nel pannello grande, in pixel.
export const DIMENSIONI = { piccolo: 56, medio: 76, grande: 104 };

// Stati del pannello: grande (schede complete), piccolo (ridotto), minimo (solo nome e timer).
export const MODI_PANNELLO = ["grande", "piccolo", "minimo"];

export const TIPI_EVENTO = ["scena", "journal", "immagine", "macro", "chat", "suono"];

export function t(chiave, dati) {
  return dati ? game.i18n.format(`OROLOGIO.${chiave}`, dati) : game.i18n.localize(`OROLOGIO.${chiave}`);
}

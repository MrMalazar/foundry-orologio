import { PALETTE, COLORE_VUOTO, DIMENSIONI, t } from "./costanti.js";
import { frazioneCorrente, residuoMs, formattaMs, nomeSegmento, indiceCorrente } from "./stato.js";

function punto(cx, cy, r, gradi) {
  const rad = (gradi * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function fetta(cx, cy, r, a0, a1) {
  const [x0, y0] = punto(cx, cy, r, a0);
  const [x1, y1] = punto(cx, cy, r, a1);
  const grande = a1 - a0 > 180 ? 1 : 0;
  return `M${cx},${cy} L${x0.toFixed(3)},${y0.toFixed(3)} A${r},${r} 0 ${grande} 1 ${x1.toFixed(3)},${y1.toFixed(3)} Z`;
}

function sicuro(testo) {
  return foundry.utils.escapeHTML(String(testo ?? ""));
}

/**
 * La torta di un orologio in SVG.
 * Le fette piene hanno la tinta dell'orologio, quella in corso si riempie
 * con il passare del tempo, le altre restano scure.
 */
export function torta(c, { ora = Date.now(), conNomi = false } = {}) {
  const n = c.segmenti;
  const cx = 50, cy = 50, r = 46;
  const colore = PALETTE[c.colore] ?? PALETTE.rosso;
  const passo = 360 / n;
  const frazione = frazioneCorrente(c, ora);
  let parti = "";
  for (let i = 0; i < n; i++) {
    const a0 = -90 + i * passo;
    const a1 = a0 + passo;
    const piena = i < c.pieni;
    const nome = conNomi ? nomeSegmento(c, i) : "";
    const titolo = nome ? `<title>${sicuro(nome)}</title>` : `<title>${i + 1}</title>`;
    parti += `<path class="orologio-fetta ${piena ? "piena" : "vuota"}" d="${fetta(cx, cy, r, a0, a1)}" fill="${piena ? colore : COLORE_VUOTO}">${titolo}</path>`;
    if (!piena && i === c.pieni && frazione > 0) {
      const fine = a0 + passo * frazione;
      parti += `<path class="orologio-fetta corrente" d="${fetta(cx, cy, r, a0, fine)}" fill="${colore}"/>`;
    }
  }
  const bloccato = c.bloccato
    ? `<text x="50" y="57" text-anchor="middle" class="orologio-lucchetto">&#xf023;</text>`
    : "";
  return `<svg viewBox="0 0 100 100" class="orologio-torta" data-colore="${c.colore}">${parti}<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" class="orologio-bordo"/>${bloccato}</svg>`;
}

/** Lo stato leggibile di un orologio. */
export function statoDi(c) {
  const completo = c.pieni >= c.segmenti;
  if (c.bloccato) return "bloccato";
  if (completo && !c.ciclo) return "completo";
  if (c.attivo && c.inPausa) return "pausa";
  if (c.attivo) return "attivo";
  return "fermo";
}

/** Il contesto che i template usano per un orologio. */
export function contesto(c, gm, ora = Date.now()) {
  const completo = c.pieni >= c.segmenti;
  const nomiVisibili = gm || c.mostraNomi;
  const indice = indiceCorrente(c);
  const corrente = nomiVisibili ? nomeSegmento(c, indice) : "";
  const stato = statoDi(c);
  return {
    ...c,
    svg: torta(c, { ora, conNomi: nomiVisibili }),
    tempo: formattaMs(residuoMs(c, ora)),
    durataTesto: formattaMs(Math.max(1, c.durata) * 1000),
    diametro: DIMENSIONI[c.dimensione] ?? DIMENSIONI.medio,
    stato,
    statoEtichetta: t(`Stato.${stato}`),
    completo,
    corrente,
    inCorso: c.attivo && !c.inPausa,
    mostraTempo: gm || c.mostraTimer,
    nomiVisibili
  };
}

/**
 * Aggiorna torta e conto alla rovescia dentro un contenitore già renderizzato,
 * senza rifare tutto il markup. Usato ogni secondo da pannello e gestore.
 */
export function aggiornaTempi(radice, orologi, gm, ora = Date.now()) {
  if (!radice) return;
  for (const el of radice.querySelectorAll("[data-id]")) {
    const c = orologi[el.dataset.id];
    if (!c) continue;
    const box = el.querySelector(".orologio-torta-box");
    if (box) box.innerHTML = torta(c, { ora, conNomi: gm || c.mostraNomi });
    const tempo = el.querySelector(".orologio-tempo");
    if (tempo) {
      tempo.textContent = formattaMs(residuoMs(c, ora));
      tempo.className = `orologio-tempo ${statoDi(c)}`;
    }
  }
}

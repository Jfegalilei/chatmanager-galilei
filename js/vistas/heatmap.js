/* Cuando escriben: dia x hora. */
import {DIAS, esc, num} from "../formato.js";

const TONOS = 6;

export function heatmap(calor){
  const max = Math.max(...calor.flat(), 0);
  const tono = v => v ? Math.min(TONOS, 1 + Math.floor((v / (max || 1)) * (TONOS - 0.001))) : 0;

  let html = '<div class="heat-wrap"><div class="heat" role="img" aria-label="Mensajes por día y hora"><span></span>';
  for (let h = 0; h < 24; h++) html += `<span class="h">${h % 3 === 0 ? h : ""}</span>`;
  calor.forEach((fila, d) => {
    html += `<span class="dlab">${DIAS[d]}</span>`;
    fila.forEach((v, h) => {
      const tip = `<b>${DIAS[d]} ${h}:00–${h + 1}:00</b><br>${num(v)} mensajes`;
      html += `<span class="c" style="background:var(--seq-${tono(v)})" data-tip="${esc(tip)}"></span>`;
    });
  });
  html += "</div></div>";

  const escala = Array.from({length: TONOS}, (_, i) => `<span class="sw" style="background:var(--seq-${i + 1})"></span>`).join("");
  return html + `<div class="escala">0${escala} ${num(max)} mensajes</div>`;
}

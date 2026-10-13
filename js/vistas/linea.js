/* Tendencia: una sola serie con crosshair (por semana, dia o mes). Devuelve el HTML y como
   engancharlo, para no mezclar pintar con escuchar eventos. */
import {num} from "../formato.js";
import {mostrarTip, ocultarTip} from "./tip.js";
import {vacio} from "./piezas.js";

const W = 560, H = 210, P = {l: 58, r: 14, t: 12, b: 44};

/* Escala "redonda": un paso de 1, 2 o 5 por potencia de 10, para que el eje
   muestre 0 · 500 · 1.000 · 1.500 y no numeros raros. */
function escala(max, marcas = 4){
  const crudo = max / marcas;
  const pot = Math.pow(10, Math.floor(Math.log10(crudo)));
  const paso = [1, 2, 2.5, 5, 10].map(k => k * pot).find(p => p >= crudo);
  const tope = Math.ceil(max / paso) * paso;
  return {tope, valores: Array.from({length: Math.round(tope / paso) + 1}, (_, i) => i * paso)};
}

/* `ejeX` es el titulo del eje horizontal; `vacio` lo que se dice con menos de
   dos puntos. Cada punto trae v, etq (rotulo del eje) y rango (titulo del globito). */
export function linea(puntos, {ejeX = "Semana", vacio: sinDatos = "La tendencia aparece cuando haya al menos dos semanas con reporte."} = {}){
  if (puntos.length < 2) return {html: vacio(sinDatos), enlazar(){}};
  const {tope, valores} = escala(Math.max(...puntos.map(p => p.v), 1));
  const x = i => P.l + i * (W - P.l - P.r) / (puntos.length - 1);
  const y = v => P.t + (1 - v / tope) * (H - P.t - P.b);
  const u = puntos.length - 1;
  const base = H - P.b;

  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mensajes de usuarios por semana">`;
  // Eje Y: lineas de guia suaves y su rotulo.
  valores.forEach(v => {
    if (v) s += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grid)" stroke-width="1"/>`;
    s += `<line x1="${P.l - 4}" x2="${P.l}" y1="${y(v)}" y2="${y(v)}" stroke="var(--axis)" stroke-width="1"/>`;
    s += `<text x="${P.l - 8}" y="${y(v) + 4}" text-anchor="end">${num(v)}</text>`;
  });
  // Los dos ejes.
  s += `<line x1="${P.l}" x2="${P.l}" y1="${P.t}" y2="${base}" stroke="var(--axis)" stroke-width="1"/>`;
  s += `<line x1="${P.l}" x2="${W - P.r}" y1="${base}" y2="${base}" stroke="var(--axis)" stroke-width="1"/>`;
  s += `<text class="titulo-eje" transform="translate(12 ${(P.t + base) / 2}) rotate(-90)" text-anchor="middle">Mensajes</text>`;
  s += `<text class="titulo-eje" x="${(P.l + W - P.r) / 2}" y="${H - 4}" text-anchor="middle">${ejeX}</text>`;
  /* Rotulos: todos si caben (hasta 12, como los meses de un ano); si no, uno
     de cada tanto y siempre el ultimo, sin dejar uno pegado a el. */
  const cada = puntos.length <= 12 ? 1 : Math.ceil(puntos.length / 8);
  const rotula = i => i === u || (i % cada === 0 && u - i >= cada);
  puntos.forEach((p, i) => {
    s += `<line x1="${x(i)}" x2="${x(i)}" y1="${base}" y2="${base + 4}" stroke="var(--axis)" stroke-width="1"/>`;
    if (rotula(i)) s += `<text x="${x(i)}" y="${base + 17}" text-anchor="middle">${p.etq}</text>`;
  });
  s += `<polyline fill="none" stroke="var(--series-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${
    puntos.map((p, i) => `${x(i)},${y(p.v)}`).join(" ")}"/>`;
  s += `<circle cx="${x(u)}" cy="${y(puntos[u].v)}" r="4" fill="var(--series-1)" stroke="var(--surface)" stroke-width="2"/>`;
  s += `<line class="cross" x1="0" x2="0" y1="${P.t}" y2="${base}" stroke="var(--axis)" stroke-width="1" visibility="hidden"/>`;
  s += `<circle class="punto" r="4" fill="var(--series-1)" stroke="var(--surface)" stroke-width="2" visibility="hidden"/>`;
  s += `<rect class="hit" x="${P.l}" y="0" width="${W - P.l - P.r}" height="${H}" fill="transparent"/></svg>`;

  return {
    html: `<div class="linea">${s}</div>`,
    enlazar(cont){
      const svg = cont.querySelector("svg");
      if (!svg) return;
      const cross = svg.querySelector(".cross"), punto = svg.querySelector(".punto"), hit = svg.querySelector(".hit");
      hit.addEventListener("mousemove", e => {
        const r = svg.getBoundingClientRect();
        const vx = (e.clientX - r.left) / r.width * W;
        const i = Math.max(0, Math.min(u, Math.round((vx - P.l) / ((W - P.l - P.r) / u))));
        cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("visibility", "visible");
        punto.setAttribute("cx", x(i)); punto.setAttribute("cy", y(puntos[i].v)); punto.setAttribute("visibility", "visible");
        mostrarTip(`<b>${puntos[i].rango}</b><br>${num(puntos[i].v)} mensajes de usuarios`, e.clientX, e.clientY);
      });
      hit.addEventListener("mouseleave", () => {
        cross.setAttribute("visibility", "hidden");
        punto.setAttribute("visibility", "hidden");
        ocultarTip();
      });
    }
  };
}

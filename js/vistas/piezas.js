/* Las piezas con las que se arman las pantallas: una cifra, una tarjeta, unas
   barras. Devuelven HTML y no saben de donde salieron los datos. */
import {esc, num} from "../formato.js";

export const vacio = texto => `<p class="meta">${esc(texto)}</p>`;

// Icono de ayuda: lo que antes era un parrafo de explicacion debajo del titulo.
export const ayuda = texto => texto
  ? `<button type="button" class="ayuda" tabindex="0" aria-label="Qué significa" data-tip="${esc(texto)}">
       <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 7.2v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="4.9" r=".9" fill="currentColor"/></svg>
     </button>`
  : "";

/* Una cifra grande. `tono` pinta el pie: "up" | "down" | "alerta". */
export function cifra({titulo, valor, pie = "", tono = "", explica = "", grande = false}){
  return `<div class="cifra${grande ? " grande" : ""}">
    <div class="k">${esc(titulo)}${ayuda(explica)}</div>
    <div class="v">${valor}</div>
    ${pie ? `<div class="d ${tono}">${pie}</div>` : ""}
  </div>`;
}

/* Flechas de los cambios. La flecha dice hacia donde se movio el numero; el
   color dice si eso es bueno (la palabra solo va en el globito), porque a veces bajar es mejorar
   (salidas, tiempo de respuesta). */
const FLECHA = {
  sube: '<path d="M8 12.5V3.5M4 7.5l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  baja: '<path d="M8 3.5v9M4 8.5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  igual: '<path d="M3.5 6h9M3.5 10h9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'
};
const icono = forma => `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">${FLECHA[forma]}</svg>`;
const PALABRA = {mejor: "Mejoró", peor: "Empeoró", igual: "Se mantuvo"};

/* Indicador de un dato secundario frente al periodo anterior.
   `formato` escribe los valores del globito (por defecto, numeros). */
export function indicador(c, anterior, formato = num){
  if (!c) return "";
  const forma = c.estado === "igual" ? "igual" : c.sube ? "sube" : "baja";
  const pct = c.estado !== "igual" && c.pct != null ? ` ${Math.abs(c.pct)}%` : "";
  const tip = `<b>${PALABRA[c.estado]}</b><br>${formato(c.ahora)} ahora · ${formato(c.antes)} ${esc(anterior)}`;
  return `<span class="cambio ${c.estado}" tabindex="0" data-tip="${esc(tip)}" aria-label="${PALABRA[c.estado]}${pct}">${icono(forma)}${pct}</span>`;
}

// Dato secundario, en una linea: "Callados 12 · Ingresos 3", con su indicador.
export const dato = (k, v, explica = "", cambioHtml = "") =>
  `<span class="dato"><span class="k">${esc(k)}${ayuda(explica)}</span><b>${v}</b>${cambioHtml}</span>`;

/* Pie de una cifra grande: flecha y porcentaje en el color de "bueno/malo",
   y el periodo con el que se compara en gris. */
export function delta(v, anterior, {mejorSiSube = true} = {}){
  if (!v) return "";
  const bueno = v.pct === 0 || v.sube === mejorSiSube;
  return `<span class="delta ${v.pct === 0 ? "igual" : bueno ? "mejor" : "peor"}">${icono(v.pct === 0 ? "igual" : v.sube ? "sube" : "baja")}${v.pct > 0 ? "+" : ""}${v.pct}%</span> vs ${esc(anterior)}`;
}

/* Curva suave del periodo, como la de Pulsar Gate: una linea con un degradado
   debajo. Interpolacion monotona (Fritsch-Carlson) para que la curva nunca
   baje de cero ni invente picos entre dos puntos. Cada punto tiene su franja
   con globito. */
let curvas = 0;
export function curva(puntos, {color = "var(--series-1)", tip = () => ""} = {}){
  const alto = 56, ancho = 300, pad = 4;
  if (puntos.length < 2) return `<div class="curva vacia" aria-hidden="true"></div>`;
  const max = Math.max(...puntos.map(p => p.v), 1);
  const xs = puntos.map((_, i) => i * ancho / (puntos.length - 1));
  const ys = puntos.map(p => alto - pad - p.v / max * (alto - pad * 2));
  const n = puntos.length;
  const d = xs.slice(1).map((x, i) => (ys[i + 1] - ys[i]) / (x - xs[i]));
  const m = xs.map((_, i) => i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  for (let i = 0; i < n - 1; i++){
    if (d[i] === 0){ m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9){ const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  const f = v => v.toFixed(1);
  let linea = `M${f(xs[0])},${f(ys[0])}`;
  for (let i = 0; i < n - 1; i++){
    const dx = (xs[i + 1] - xs[i]) / 3;
    linea += ` C${f(xs[i] + dx)},${f(ys[i] + m[i] * dx)} ${f(xs[i + 1] - dx)},${f(ys[i + 1] - m[i + 1] * dx)} ${f(xs[i + 1])},${f(ys[i + 1])}`;
  }
  const id = "curva" + (++curvas);
  // Cada franja va de la mitad hacia el punto anterior a la mitad hacia el siguiente.
  const borde = i => i <= 0 ? 0 : i >= n ? ancho : (xs[i - 1] + xs[i]) / 2;
  const zonas = puntos.map((p, i) => `<g class="zona" data-tip="${esc(tip(p, i))}">
      <rect x="${f(borde(i))}" y="0" width="${f(borde(i + 1) - borde(i))}" height="${alto}" fill="transparent"/>
      <line x1="${f(xs[i])}" x2="${f(xs[i])}" y1="0" y2="${alto}" vector-effect="non-scaling-stroke"/>
    </g>`).join("");
  return `<div class="curva" style="--c:${color}">
    <svg viewBox="0 0 ${ancho} ${alto}" preserveAspectRatio="none" role="img" aria-label="Curva del período">
      <defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="${color}" stop-opacity=".22"/><stop offset="1" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${linea} L${ancho},${alto} L0,${alto} Z" fill="url(#${id})"/>
      <path d="${linea}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
      ${zonas}
    </svg>
  </div>`;
}

/* Tarjeta de indicador, como las del resumen de Pulsar Gate: titulo, cifra,
   cambio contra el periodo anterior y la curva del periodo. */
export function kpi({titulo, valor, pie = "", explica = "", grafica = ""}){
  return `<section class="kpi">
    <div class="k">${esc(titulo)}${ayuda(explica)}</div>
    <div class="v">${valor}</div>
    <div class="d">${pie || "&nbsp;"}</div>
    ${grafica}
  </section>`;
}

export const tira = datos => `<div class="tira">${datos.join("")}</div>`;

export function tarjeta({titulo, explica = "", cuerpo, acciones = "", clase = ""}){
  return `<section class="card ${clase}">
    <div class="cab-card"><h3>${esc(titulo)}${ayuda(explica)}</h3>${acciones}</div>
    ${cuerpo}
  </section>`;
}

export function hbars(filas, etiquetaValor, {limite = 0} = {}){
  if (!filas.length) return vacio("Sin datos.");
  const vistas = limite ? filas.slice(0, limite) : filas;
  const max = Math.max(...filas.map(f => f.v), 1);
  const barras = vistas.map(f => {
    const tip = `<b>${esc(f.n)}</b><br>${num(f.v)} ${etiquetaValor}${f.extra ? "<br>" + esc(f.extra) : ""}`;
    return `<div class="hbar" tabindex="0" data-tip="${esc(tip)}">
      <span class="n">${esc(f.n)}</span>
      <span class="track"><span class="fill" style="width:${(f.v / max * 100).toFixed(1)}%"></span></span>
      <span class="val">${num(f.v)}</span>
    </div>`;
  }).join("");
  const resto = filas.length - vistas.length;
  return `<div class="hbars">${barras}</div>${resto > 0 ? vacio(`y ${resto} más`) : ""}`;
}

/* Barras de porcentaje con una linea de referencia (la meta). La escala llega
   un poco mas alla de la meta para que la linea nunca quede pegada al borde.
   Cada fila trae `v` (0-100 o null), `tono` ("ok" | "bajo" | "") y `tip`. */
export function barrasMeta(filas, {meta, etiquetaMeta}){
  if (!filas.length) return vacio("Sin datos.");
  const max = Math.min(100, Math.max(meta * 1.3, ...filas.map(f => f.v || 0)));
  const x = v => (v / max * 100).toFixed(1);
  const barras = filas.map(f => `<div class="hbar" tabindex="0" data-tip="${esc(f.tip)}">
      <span class="n">${esc(f.n)}</span>
      <span class="track">${!f.v ? "" : `<span class="fill ${f.tono}" style="width:${x(f.v)}%"></span>`}<span class="meta-linea" style="left:${x(meta)}%"></span></span>
      <span class="val">${f.v == null ? "–" : Math.round(f.v) + "%"}</span>
    </div>`).join("");
  return `<div class="hbars con-meta">${barras}</div>
    <p class="leyenda-meta"><span class="muestra"></span>${esc(etiquetaMeta)}</p>`;
}

// Barrita dentro de una celda de tabla.
export const mini = (v, max, ancho = 60) =>
  `<span class="mini" style="width:${Math.round((v || 0) / (max || 1) * ancho)}px"></span>`;

/* Tendencia en miniatura para el resumen: sin ejes ni numeros, solo la forma.
   La version grande, con crosshair, vive en linea.js. */
export function chispa(puntos, {ancho = 240, alto = 40} = {}){
  if (puntos.length < 2) return "";
  const max = Math.max(...puntos.map(p => p.v), 1);
  const x = i => i * ancho / (puntos.length - 1);
  const y = v => alto - 2 - (v / max) * (alto - 6);
  const linea = puntos.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const u = puntos.length - 1;
  return `<svg class="chispa" viewBox="0 0 ${ancho} ${alto}" preserveAspectRatio="none" aria-hidden="true">
    <polyline points="${linea}" fill="none" stroke="var(--series-1)" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(u).toFixed(1)}" cy="${y(puntos[u].v).toFixed(1)}" r="2.6" fill="var(--series-1)"/>
  </svg>`;
}

export const tablaEn = cuerpo => `<div class="tabla-wrap">${cuerpo}</div>`;

// Boton de "ver todas / ver menos" que las tablas ponen en su cabecera.
export const verMas = (abierto, cuantas, accion) =>
  `<button type="button" class="btn fantasma ver-mas" data-accion="${esc(accion)}">${abierto ? "Ver menos" : `Ver las ${num(cuantas)}`}</button>`;

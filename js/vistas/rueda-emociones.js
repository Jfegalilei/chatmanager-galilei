/* Rueda de Plutchik invertida: que emociones hay en el chat y que tan fuertes.

   Cada petalo es una emocion basica partida en sus tres nombres, como en la
   flor de Plutchik pero al reves: la version leve junto al centro (Serenidad),
   la basica en medio (Alegria) y la intensa en la punta (Extasis).

   Cada petalo se llena de una sola pieza desde el centro. El largo sale de
   sus mensajes pesados por intensidad (leve 1, basica 2, intensa 3) frente al
   total de mensajes con emocion: los intensos empujan mas hacia afuera. La
   escala: una emocion con el LLENA de los mensajes, todos leves, llena justo
   la franja leve; todos intensos, el petalo entero. Asi se notan las
   diferencias sin que ninguna tenga que llegar al tope.
   Cuando dos petalos vecinos estan fuertes se enciende entre ellos la diada
   que forman (Alegria + Confianza = Amor). */
import {esc, num} from "../formato.js";
import {EMOCIONES, DIADAS} from "../dominio/etiquetas.js";
import {perfilEmocional} from "../dominio/agregado.js";
import {vacio} from "./piezas.js";

const ORDEN = Object.keys(EMOCIONES);
const C = 270;                      // centro del lienzo (540 x 540)
const HUECO = 54;                   // circulo del centro, donde va la dominante
const ANILLOS = [HUECO, 118, 178, 232];
const PUNTA = ANILLOS[3] + 8;       // la punta del petalo
const R_NOMBRE = 252;
const R_DIADA = 214;
const NIVELES = ["leve", "basica", "intensa"];
const PASO = 360 / ORDEN.length;
const ABRE = PASO / 2 + 6;          // el relleno se recorta con la forma del petalo
// Parte de los mensajes con emocion que, toda leve, llena la franja leve.
const LLENA = .25;
// Una diada se enciende si las dos emociones pesan al menos esto.
const DIADA_MIN = 12;

const rad = g => (g - 90) * Math.PI / 180;     // 0 grados = arriba
const punto = (r, g) => [C + r * Math.cos(rad(g)), C + r * Math.sin(rad(g))];
const f = v => v.toFixed(1);

// Sector de anillo entre dos radios y dos angulos.
function sector(r0, r1, g0, g1){
  const [a, b] = [punto(r1, g0), punto(r1, g1)];
  const [c, d] = [punto(r0, g1), punto(r0, g0)];
  return `M${f(a[0])},${f(a[1])} A${r1},${r1} 0 0 1 ${f(b[0])},${f(b[1])} L${f(c[0])},${f(c[1])} A${r0},${r0} 0 0 0 ${f(d[0])},${f(d[1])} Z`;
}

/* Forma de un petalo apuntando hacia arriba: angosto junto al centro, ancho
   a dos tercios y en punta afuera. Luego se gira a su lugar. `dx` es lo que se
   abre hacia el lado y `r` la distancia al centro. */
const P = (dx, r) => `${f(C + dx)},${f(C - r)}`;
const PETALO = `M${P(-13, HUECO)} C${P(-28, 92)} ${P(-57, 124)} ${P(-57, 172)}`
  + ` C${P(-57, 206)} ${P(-24, 224)} ${P(0, PUNTA)}`
  + ` C${P(24, 224)} ${P(57, 206)} ${P(57, 172)}`
  + ` C${P(57, 124)} ${P(28, 92)} ${P(13, HUECO)} Z`;

// De 0..1 al radio: cada tercio ocupa su anillo, y el ultimo llega a la punta.
function alcance(lleno){
  const bordes = [HUECO - 4, ANILLOS[1], ANILLOS[2], PUNTA];
  const franja = Math.min(2, Math.floor(lleno * 3));
  return bordes[franja] + (lleno * 3 - franja) * (bordes[franja + 1] - bordes[franja]);
}

const pct = v => v >= 10 || v === 0 ? Math.round(v) + "%" : v.toFixed(1).replace(".", ",") + "%";
const NOMBRE_NIVEL = {leve: "leve", basica: "básica", intensa: "intensa"};

/* Nombre de una franja, escrito a lo largo del petalo. Si quedaria de
   cabeza se voltea media vuelta. */
function rotuloFranja(texto, r, g){
  const [x, y] = punto(r, g);
  let giro = ((g - 90) % 360 + 360) % 360;
  if (giro > 90 && giro < 270) giro -= 180;
  return `<text class="rueda-franja" x="${f(x)}" y="${f(y)}" text-anchor="middle" dominant-baseline="central" transform="rotate(${giro} ${f(x)} ${f(y)})">${esc(texto)}</text>`;
}

let ruedas = 0;
/* `elegida`: la emocion cuyos mensajes se estan mostrando debajo. */
export function ruedaEmociones(emociones, {elegida = null} = {}){
  const perfil = perfilEmocional(emociones || {}, ORDEN);
  if (!perfil.mensajes) return vacio("Sin emociones clasificadas en este período: usa Recalcular, o corre reclasificar-emociones.js para el histórico.");

  const id = "rueda" + (++ruedas);

  const petalos = perfil.filas.map((fila, i) => {
    const e = EMOCIONES[fila.k];
    const g = i * PASO;
    const nombres = {leve: e.leve, basica: e.nombre, intensa: e.intensa};
    // Una sola pieza desde el centro; cada tercio del llenado es una franja.
    const lleno = Math.min(1, fila.puntos / perfil.mensajes / (3 * LLENA));
    const relleno = fila.mensajes
      ? `<path d="${sector(HUECO - 4, alcance(lleno), -ABRE, ABRE)}" fill="url(#${id}-${fila.k})"/>`
      : "";
    // Lineas entre franjas, recortadas con el petalo.
    const cortes = ANILLOS.slice(1, 3).map(r => `<circle cx="${C}" cy="${C}" r="${r}" class="rueda-corte"/>`).join("");
    const franjas = NIVELES.map((n, j) => rotuloFranja(nombres[n], (ANILLOS[j] + ANILLOS[j + 1]) / 2 + (j === 2 ? 4 : 0), g)).join("");

    const media = fila.mensajes ? (fila.intensidad < 1.5 ? "leve" : fila.intensidad < 2.5 ? "básica" : "intensa") : "–";
    const tip = `<b>${esc(e.nombre)}</b> · ${pct(fila.pct)} del peso emocional<br>${num(fila.mensajes)} mensajes · intensidad media ${media}`
      + NIVELES.map(n => `<br>${esc(nombres[n])} (${NOMBRE_NIVEL[n]}): ${num(fila[n])}`).join("");
    // Rotulo de afuera: alineado segun el lado de la rueda.
    const [x, y] = punto(R_NOMBRE, g);
    const lado = Math.abs(x - C) < 8 ? "middle" : x > C ? "start" : "end";
    const dy = y < C - 200 ? -4 : y > C + 200 ? 14 : 4;
    return `<g class="petalo${fila === perfil.dominante ? " dominante" : ""}${fila.k === elegida ? " elegido" : ""}" tabindex="0" role="button" data-emocion="${fila.k}" data-tip="${esc(tip)}" aria-label="${esc(`${e.nombre}: ${pct(fila.pct)}, ${fila.mensajes} mensajes, intensidad ${media}`)}">
      <g transform="rotate(${g} ${C} ${C})">
        <path class="petalo-fondo" d="${PETALO}" fill="var(--emo-${fila.k})"/>
        <g clip-path="url(#${id}-petalo)">${relleno}${cortes}</g>
        <path class="petalo-borde" d="${PETALO}" stroke="var(--emo-${fila.k})"/>
      </g>
      ${franjas}
      <text class="rueda-nombre" x="${f(x)}" y="${f(y + dy)}" text-anchor="${lado}">${esc(e.nombre)}<tspan class="rueda-pct"> ${pct(fila.pct)}</tspan></text>
    </g>`;
  }).join("");

  // Diadas: entre cada par de petalos vecinos, lo que forman juntos.
  const diadas = perfil.filas.map((a, i) => {
    const b = perfil.filas[(i + 1) % ORDEN.length];
    const activa = a.pct >= DIADA_MIN && b.pct >= DIADA_MIN;
    const [x, y] = punto(R_DIADA, i * PASO + PASO / 2);
    const tip = `<b>${esc(DIADAS[a.k])}</b> = ${esc(EMOCIONES[a.k].nombre)} + ${esc(EMOCIONES[b.k].nombre)}<br>`
      + (activa ? "Las dos están fuertes en el chat." : `Se enciende cuando las dos pasan del ${DIADA_MIN}%.`);
    return `<text class="rueda-diada${activa ? " activa" : ""}" x="${f(x)}" y="${f(y)}" text-anchor="middle" dominant-baseline="central" tabindex="0" data-tip="${esc(tip)}">${esc(DIADAS[a.k])}</text>`;
  }).join("");

  // Mismo color de la emocion, mas encendido hacia la punta (lo intenso).
  const gradientes = ORDEN.map(k => `<radialGradient id="${id}-${k}" gradientUnits="userSpaceOnUse" cx="${C}" cy="${C}" r="${PUNTA}">
      <stop offset="${(HUECO / PUNTA).toFixed(3)}" style="stop-color:var(--emo-${k});stop-opacity:.75"/>
      <stop offset="1" style="stop-color:var(--emo-${k});stop-opacity:1"/>
    </radialGradient>`).join("");

  const dom = perfil.dominante ? EMOCIONES[perfil.dominante.k] : null;
  const centro = `<circle class="rueda-centro" cx="${C}" cy="${C}" r="${HUECO - 4}"/>
    <text class="rueda-centro-k" x="${C}" y="${C - 8}" text-anchor="middle">Apunta a</text>
    <text class="rueda-centro-v" x="${C}" y="${C + 13}" text-anchor="middle">${esc(dom ? dom.nombre : "–")}</text>`;

  return `<div class="rueda-emociones">
    <svg viewBox="-60 0 660 540" role="img" aria-label="Rueda de emociones del chat">
      <defs><clipPath id="${id}-petalo"><path d="${PETALO}"/></clipPath>${gradientes}</defs>
      ${petalos}${diadas}${centro}
    </svg>
  </div>`;
}

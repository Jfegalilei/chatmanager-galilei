/* El selector de periodo de la barra. En vez de una lista con todas las
   semanas, meses y anos, tres piezas:
     - Semana / Mes / Ano (control segmentado),
     - flechas para ir al periodo anterior o al siguiente,
     - la etiqueta del periodo, que abre un panel compacto para saltar lejos:
       las semanas agrupadas por mes, los meses en una cuadricula por ano.
   El valor sigue siendo el de siempre ("s:2026-W40", "m:2026-09", "a:2026"),
   asi que el resto de la pagina no se entera del cambio. */
import {esc} from "../formato.js";

const TIPOS = [{t: "s", n: "Semana"}, {t: "m", n: "Mes"}, {t: "a", n: "Año"}];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const flecha = d => `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const IZQ = flecha("M10 3.5L5.5 8l4.5 4.5"), DER = flecha("M6 3.5L10.5 8 6 12.5"), ABAJO = flecha("M4 6.5l4 4 4-4");

// "2026-09-28" -> "28 sep"
const diaMes = ymd => `${Number(ymd.slice(8))} ${MESES[Number(ymd.slice(5, 7)) - 1]}`;
const nombreMes = valor => `${MESES_LARGO[Number(valor.slice(5)) - 1]} ${valor.slice(0, 4)}`;
const numSemana = clave => Number(clave.split("-W")[1]);

export function selectorPeriodo({caja, alCambiar}){
  let listas = {s: [], m: [], a: []};    // de la mas nueva a la mas vieja
  let enCurso = null;
  let valor = "";
  let abierto = false;

  const tipo = () => valor.slice(0, 1);
  const clave = () => valor.slice(2);
  const semana = c => listas.s.find(s => s.clave === c);

  function etiqueta(){
    if (tipo() === "s"){
      const s = semana(clave());
      return s ? `Sem ${numSemana(s.clave)} · ${diaMes(s.desde)} – ${diaMes(s.hasta)}` : clave();
    }
    if (tipo() === "m") return nombreMes(clave()).replace(/^./, c => c.toUpperCase());
    return clave();
  }

  const claves = t => t === "s" ? listas.s.map(s => s.clave) : listas[t];

  /* Al cambiar de Semana a Mes (o al reves) se queda en el mismo momento:
     la semana elegida lleva a su mes y a su ano, y el mes a su ultima semana. */
  function equivalente(t){
    const k = clave(), de = tipo();
    const fecha = de === "s" ? (semana(k) || {}).desde || "" : k;   // "2026-09-28" | "2026-09" | "2026"
    const lista = claves(t);
    if (t === "s") return lista.find(c => semana(c).desde.startsWith(fecha) || semana(c).hasta.startsWith(fecha)) || lista[0];
    if (t === "m") return lista.find(m => fecha.startsWith(m) || m.startsWith(fecha)) || lista[0];
    return lista.find(a => fecha.startsWith(a)) || lista[0];
  }

  function elegir(nuevo){
    abierto = false;
    if (nuevo === valor) return pintar();
    valor = nuevo;
    pintar();
    alCambiar(valor);
  }

  function panel(){
    const t = tipo();
    const activo = c => (t + ":" + c) === valor;
    const ficha = (c, texto, extra = "") =>
      `<button type="button" class="ficha${activo(c) ? " activa" : ""}" data-valor="${esc(t + ":" + c)}"${extra}>${texto}</button>`;

    if (t === "s"){
      // Una fila por mes (el del lunes de la semana), con sus semanas en orden.
      const porMes = new Map();
      listas.s.forEach(s => {
        const m = s.desde.slice(0, 7);
        if (!porMes.has(m)) porMes.set(m, []);
        porMes.get(m).unshift(s);
      });
      return [...porMes].map(([m, lista]) => `<div class="fila-periodo">
          <span class="rotulo">${esc(nombreMes(m))}</span>
          <div class="fichas">${lista.map(s => ficha(s.clave,
            `S${numSemana(s.clave)}${s.clave === enCurso ? '<i class="vivo" aria-label="en curso"></i>' : ""}`,
            ` data-tip="${esc(`${diaMes(s.desde)} – ${diaMes(s.hasta)}${s.clave === enCurso ? " · en curso" : ""}`)}"`)).join("")}</div>
        </div>`).join("");
    }
    if (t === "m"){
      const anos = [...new Set(listas.m.map(m => m.slice(0, 4)))];
      return anos.map(a => `<div class="fila-periodo">
          <span class="rotulo">${a}</span>
          <div class="fichas cuadricula">${MESES.map((n, i) => {
            const c = `${a}-${String(i + 1).padStart(2, "0")}`;
            return listas.m.includes(c) ? ficha(c, n) : `<span class="ficha vacia" aria-hidden="true">${n}</span>`;
          }).join("")}</div>
        </div>`).join("");
    }
    return `<div class="fichas">${listas.a.map(a => ficha(a, a)).join("")}</div>`;
  }

  function pintar(){
    if (!valor){ caja.innerHTML = ""; return; }
    const lista = claves(tipo());
    const i = lista.indexOf(clave());
    caja.innerHTML = `<div class="segmento" role="group" aria-label="Tipo de período">
        ${TIPOS.map(x => `<button type="button" data-tipo="${x.t}" aria-pressed="${x.t === tipo()}"${claves(x.t).length ? "" : " disabled"}>${x.n}</button>`).join("")}
      </div>
      <div class="navegador">
        <button type="button" class="paso" data-paso="1" aria-label="Período anterior"${i >= lista.length - 1 ? " disabled" : ""}>${IZQ}</button>
        <button type="button" class="periodo-actual" aria-haspopup="dialog" aria-expanded="${abierto}">
          <span>${esc(etiqueta())}</span>${tipo() === "s" && clave() === enCurso ? '<span class="en-curso">en curso</span>' : ""}${ABAJO}
        </button>
        <button type="button" class="paso" data-paso="-1" aria-label="Período siguiente"${i <= 0 ? " disabled" : ""}>${DER}</button>
        <div class="panel-flotante panel-periodo" role="dialog" aria-label="Elegir período"${abierto ? "" : " hidden"}>${abierto ? panel() : ""}</div>
      </div>`;

    caja.querySelectorAll("[data-tipo]").forEach(b => b.onclick = () => {
      if (b.dataset.tipo !== tipo()) elegir(b.dataset.tipo + ":" + equivalente(b.dataset.tipo));
    });
    caja.querySelectorAll("[data-paso]").forEach(b => b.onclick = () => {
      const sig = lista[i + Number(b.dataset.paso)];
      if (sig) elegir(tipo() + ":" + sig);
    });
    caja.querySelector(".periodo-actual").onclick = () => { abierto = !abierto; pintar(); };
    caja.querySelectorAll("[data-valor]").forEach(b => b.onclick = () => elegir(b.dataset.valor));
    // Sin enfocar la ficha: su globito taparia el rotulo del mes.
    if (abierto){
      const sel = caja.querySelector(".ficha.activa");
      if (sel) sel.scrollIntoView({block: "nearest"});
    }
  }

  /* Cerrar con Escape o con un clic afuera. composedPath y no contains: el
     clic que abre el panel repinta la caja y su boton ya no esta en el DOM. */
  document.addEventListener("click", e => {
    if (abierto && !e.composedPath().includes(caja)){ abierto = false; pintar(); }
  });
  document.addEventListener("keydown", e => {
    if (abierto && e.key === "Escape"){ abierto = false; pintar(); caja.querySelector(".periodo-actual").focus(); }
  });

  return {
    /* Carga los periodos disponibles. Conserva el que se estaba viendo si
       sigue existiendo; si no, la semana mas reciente. Devuelve el valor. */
    cargar(meta){
      listas = {
        s: meta.guardadas.filter(s => s.analizada).sort((a, b) => b.clave.localeCompare(a.clave)),
        m: (meta.meses || []).map(x => x.valor).sort().reverse(),
        a: (meta.anos || []).map(x => x.valor).sort().reverse()
      };
      enCurso = meta.recientes && meta.recientes[0] ? meta.recientes[0].clave : null;
      const existe = v => v && claves(v.slice(0, 1)).includes(v.slice(2));
      if (!existe(valor)){
        const t = ["s", "m", "a"].find(x => claves(x).length);
        valor = t ? t + ":" + claves(t)[0] : "";
      }
      pintar();
      return valor;
    },
    valor: () => valor
  };
}

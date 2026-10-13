/* Las tres tablas del reporte. Cada una muestra pocas filas y deja el resto
   detras de "ver todas": lo que antes eran 200 filas de golpe.
   Los datos que no son imprescindibles viajan en el globito, no en columnas. */
import {esc, num, fecha, duracion, decimal, nombreGrupo} from "../formato.js";
import {FAMILIAS, EMOCIONES} from "../dominio/etiquetas.js";
import {esDuda} from "../dominio/dudas.js";
import {vacio, mini, tablaEn} from "./piezas.js";

const SI = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
const NO = '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

// "Es staff" va escondido detras de este boton para no darle sin querer.
const PUNTOS = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="3.5" cy="8" r="1.4" fill="currentColor"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><circle cx="12.5" cy="8" r="1.4" fill="currentColor"/></svg>';

const conGrupoTh =conGrupo => conGrupo ? "<th>Grupo</th>" : "";
const conGrupoTd = (conGrupo, g) => conGrupo ? `<td class="meta">${esc(nombreGrupo(g))}</td>` : "";

/* ---------- miembros mas activos ---------- */
export function ranking(lista, {conGrupo = false, limite = 5} = {}){
  if (!lista.length) return vacio("Sin mensajes de usuarios.");
  const vistas = lista.slice(0, limite);
  const max = lista[0].mensajes || 1;
  const filas = vistas.map(p => {
    const quien = p.tel && p.tel !== p.nombre ? `${p.nombre} · ${p.tel}` : p.nombre;
    return `<tr>
      <td><span tabindex="0" data-tip="${esc(`<b>${quien}</b><br>${num(p.reaccionesRecibidas)} reacciones recibidas`)}">${esc(p.nombre)}</span></td>
      ${conGrupoTd(conGrupo, p.grupo)}
      <td class="num">${mini(p.mensajes, max)}${num(p.mensajes)}</td>
      <td class="con-menu"><details class="menu-fila">
        <summary aria-label="Más opciones de ${esc(p.nombre)}">${PUNTOS}</summary>
        <div class="menu-fila-lista">
          <button type="button" class="marcar-staff" data-autor="${esc(p.autor)}" data-nombre="${esc(p.nombre)}" data-tel="${esc(p.tel || "")}">Marcar como staff</button>
          <span class="meta">Deja de contar como usuaria en todos los grupos</span>
        </div>
      </details></td>
    </tr>`;
  }).join("");
  return tablaEn(`<table><thead><tr><th>Persona</th>${conGrupoTh(conGrupo)}<th class="num">Mensajes</th><th></th></tr></thead><tbody>${filas}</tbody></table>`);
}

/* ---------- preguntas ---------- */
/* El estado dice de quién es la pelota: del staff, del grupo (si una
   compañera ya contestó) o de nadie, cuando ni era para el staff. */
function estadoPregunta(p){
  if (p.respondida) return `<span class="estado si">${SI}${duracion(p.minutos)}</span>`;
  if (p.respondidaPor === "companero") return `<span class="estado">${SI}La resolvió el grupo</span>`;
  if (!esDuda(p)) return `<span class="estado meta">Entre ellos</span>`;
  return `<span class="estado no">${NO}Sin responder</span>`;
}

export function preguntas(lista, {conGrupo = false, limite = 8} = {}){
  if (!lista.length) return vacio("No hay preguntas que mostrar.");
  const vistas = lista.slice(0, limite);
  const filas = vistas.map(p => {
    const quien = esc(p.nombre) + (p.tel && p.tel !== p.nombre ? " · " + esc(p.tel) : "");
    // "No es sobre la app" no aporta: ya lo dice el balde en el que está.
    const familia = p.familia && p.familia !== "otra" ? `<span class="pill">${esc(FAMILIAS[p.familia] || p.familia)}</span>` : "";
    // Clic (o Enter) abre el hilo: las respuestas y lo que siguio en el grupo.
    return `<tr class="con-hilo" tabindex="0" role="button" aria-expanded="false" aria-label="Ver respuestas"
        data-grupo="${esc(p.grupoId || "")}" data-id="${esc(p.id)}" data-ts="${p.ts}">
      <td class="meta nowrap">${fecha(p.ts, true)}</td>
      ${conGrupoTd(conGrupo, p.grupo)}
      <td><span class="quote">${esc(p.texto)}</span><div class="meta">${quien} ${familia}</div></td>
      <td>${estadoPregunta(p)}</td>
      <td class="abre">${ABRE}</td>
    </tr>`;
  }).join("");
  return tablaEn(`<table class="preguntas"><thead><tr><th>Cuándo</th>${conGrupoTh(conGrupo)}<th>Pregunta</th><th>Estado</th><th></th></tr></thead><tbody>${filas}</tbody></table>`);
}

/* ---------- mensajes de una emocion ---------- */
/* Lo que se dijo con una emocion de la rueda. La pildora lleva el nombre de
   su intensidad (Serenidad, Alegria, Extasis), que es como se lee la rueda. */
export function mensajesEmocion(lista, emocion, {conGrupo = false, limite = 8} = {}){
  const e = EMOCIONES[emocion];
  if (!lista.length) return vacio(`No hubo mensajes con ${e.nombre.toLowerCase()} en este período.`);
  const nivel = {leve: e.leve, basica: e.nombre, intensa: e.intensa};
  const filas = lista.slice(0, limite).map(m => {
    const quien = esc(m.nombre) + (m.tel && m.tel !== m.nombre ? " · " + esc(m.tel) : "");
    return `<tr>
      <td class="meta nowrap">${fecha(m.ts, true)}</td>
      ${conGrupoTd(conGrupo, m.grupo)}
      <td><span class="quote">${esc(m.texto)}</span><div class="meta">${quien}</div></td>
      <td><span class="pill emo-${esc(m.intensidad)}" style="--emo:var(--emo-${esc(emocion)})">${esc(nivel[m.intensidad] || "")}</span></td>
    </tr>`;
  }).join("");
  return tablaEn(`<table class="preguntas"><thead><tr><th>Cuándo</th>${conGrupoTh(conGrupo)}<th>Mensaje</th><th>Intensidad</th></tr></thead><tbody>${filas}</tbody></table>`);
}

/* ---------- hilo de una pregunta ---------- */
const ABRE = '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const TIPOS = {imagen: "Imagen", video: "Video", audio: "Audio", sticker: "Sticker", documento: "Documento", ubicacion: "Ubicación", contacto: "Contacto", encuesta: "Encuesta"};

function mensajeHilo(m, nota = ""){
  const cuerpo = m.texto
    ? esc(m.texto)
    : `<span class="meta">${esc(TIPOS[m.tipo] || m.tipo || "Mensaje")} sin texto</span>`;
  const quien = esc(m.nombre) + (m.tel && m.tel !== m.nombre ? ` · ${esc(m.tel)}` : "");
  return `<li class="${m.staff ? "staff" : ""}">
    <div class="cab-msj"><b>${quien}</b>${m.staff ? '<span class="pill">Staff</span>' : ""}<span class="meta">${fecha(m.ts, true)}</span>${nota}</div>
    <div class="txt">${cuerpo}</div>
  </li>`;
}

export function hilo({respuestas, despues}){
  const nota = r => r.como === "cercania"
    ? '<span class="meta" data-tip="No citó la pregunta: es el primer mensaje del staff en las 24 h siguientes, que es lo que el reporte cuenta como respuesta.">por cercanía</span>'
    : "";
  const bloque = (titulo, lista, vacioTexto, f) => `<div class="bloque-hilo">
      <h4>${titulo}</h4>
      ${lista.length ? `<ul class="hilo">${lista.map(f).join("")}</ul>` : `<p class="meta">${vacioTexto}</p>`}
    </div>`;
  return bloque("Respuestas", respuestas, "Nadie la citó y el staff no escribió en las 24 h siguientes.", r => mensajeHilo(r, nota(r)))
    + (despues.length ? bloque("Lo que siguió en el grupo", despues, "", m => mensajeHilo(m)) : "");
}

/* ---------- respuesta a contenidos ---------- */
/* ---------- retos lanzados en el grupo ----------
   Lo que salio de verdad, este o no en el calendario. La calificacion va
   al reto de la libreria; uno que no estaba queda por aprobar. */
const ESTADO_RETO = {
  libreria: "",
  descartado: '<span class="pill" title="Se descartó en el calendario: no se califica">Descartado</span>',
  nuevo: '<span class="pill">Nuevo</span>'
};
export function retos(filas, {conGrupo = false, limite = 8} = {}){
  if (!filas.length){
    return vacio("El staff no lanzó retos en este período en los grupos elegidos (o todavía no se reconocieron con IA).");
  }
  const cuerpo = filas.slice(0, limite).map(f => {
    const medida = f.pct == null ? "no se sabe cuántos miembros tiene el grupo"
      : `${num(f.participaron)} de ${num(f.miembros)} personas escribieron o reaccionaron en 24 h`
        + (f.miembrosAprox ? " (miembros de hoy)" : "");
    const tip = `<b>${esc(f.titulo)}</b><br>${medida}`
      + (f.completo === false ? "<br>datos de menos de 24 h: no se califica" : "")
      + (f.miembros != null && f.miembros < 5 ? "<br>grupo de menos de 5 miembros: no se califica" : "");
    return `<tr tabindex="0" data-tip="${esc(tip)}">
      <td class="meta nowrap">${fecha(f.ts, true)}</td>
      <td>${esc(f.titulo)} ${ESTADO_RETO[f.estado || "libreria"] || ""}</td>
      ${conGrupoTd(conGrupo, f.grupo)}
      <td class="num nowrap">${f.pct == null ? "—" : `${mini(f.pct, 100, 40)}${num(Math.round(f.pct))}%`}</td>
      <td class="num">${f.estrellas == null ? "—" : `${f.estrellas}/5`}</td>
    </tr>`;
  }).join("");
  return tablaEn(`<table><thead><tr><th>Cuándo</th><th>Reto</th>${conGrupoTh(conGrupo)}
    <th class="num">Participación</th><th class="num">Estrellas</th></tr></thead><tbody>${cuerpo}</tbody></table>`);
}

export function contenidos(filas, {conGrupo = false, limite = 8} = {}){
  if (!filas.length){
    return vacio("No hay publicaciones del calendario en este período para los grupos elegidos (o no se pudo leer el calendario).");
  }
  const vistas = filas.slice(0, limite);
  const max = Math.max(...filas.map(f => f.indice || 0), 2);
  const cuerpo = vistas.map(f => {
    const tip = `<b>${esc(f.titulo)}</b><br>${num(f.mensajes24h)} mensajes de ${num(f.personas24h)} personas en 24 h`
      + `<br>${f.piezaEncontrada ? num(f.reaccionesPieza) + " reacciones a la pieza" : "no se encontró la pieza del staff"}`
      + `<br>${f.origen === "marcado" ? "marcado por Chatmanager" : "hora programada"}`
      + (f.incompleto ? "<br>datos de menos de 24 h" : "");
    return `<tr tabindex="0" data-tip="${esc(tip)}">
      <td class="meta nowrap">${fecha(f.ts, true)}</td>
      <td>${esc(f.titulo)}${f.tipo ? ` <span class="pill">${esc(f.tipo)}</span>` : ""}</td>
      ${conGrupoTd(conGrupo, f.grupo)}
      <td class="num">${num(f.mensajes24h)}</td>
      <td class="num nowrap">${mini(f.indice, max, 40)}${decimal(f.indice)}</td>
    </tr>`;
  }).join("");
  return tablaEn(`<table><thead><tr><th>Cuándo</th><th>Publicación</th>${conGrupoTh(conGrupo)}
    <th class="num">Mensajes 24 h</th><th class="num">Índice</th></tr></thead><tbody>${cuerpo}</tbody></table>`);
}

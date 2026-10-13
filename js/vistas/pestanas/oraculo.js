/* GaliOraculo: preguntas libres sobre los chats de la seleccion de arriba
   (un grupo o todos, en el periodo elegido). Gemini lee todos los mensajes
   del alcance y responde citando los mensajes en los que se basa
   (analisis/oraculo.js).

   La conversacion vive solo en esta pagina: no se guarda. Cambiar de grupo
   o de periodo cambia el alcance de las preguntas siguientes. Lleva nombres:
   no va a la copia publicada. */
import {esc, num, fecha, nombreGrupo} from "../../formato.js";
import {api} from "../../api.js";
import {PUBLICADO} from "../../foto.js";
import {tarjeta, vacio} from "../piezas.js";

const conversacion = [];     // {pregunta, alcance, respuesta?, citas?, costo?, error?, pendiente}
let borrador = "";
let ocupado = false;

const EJEMPLOS = [
  "¿Quiénes se han quejado de que no les llegó un premio?",
  "¿Qué preguntas sobre la lotería quedaron sin responder?",
  "¿Quién es la persona más activa y de qué habla?",
  "¿Cómo reaccionó el grupo al último reto?"
];

function alcanceDe(ctx){
  const grupo = ctx.uno ? nombreGrupo(ctx.uno.nombre) : "todos los grupos";
  const r = ctx.reporte;
  const periodo = ctx.periodo ? ctx.periodo.etiqueta : r.desde ? `semana del ${r.desde} al ${r.hasta}` : `semana ${r.semana}`;
  return {grupo, periodo, texto: `${grupo} · ${periodo}`};
}

// Texto de Gemini a HTML: escapa todo y solo deja **negritas** y listas con "- ".
function formatear(t){
  const lineas = esc(t).split(/\r?\n/);
  let html = "", lista = 0;
  const cerrar = hasta => { while (lista > hasta){ html += "</ul>"; lista--; } };
  for (const l of lineas){
    const m = l.match(/^(\s*)[-*] (.*)$/);
    if (m){
      const nivel = Math.min(3, Math.floor(m[1].length / 2) + 1);
      while (lista < nivel){ html += "<ul>"; lista++; }
      cerrar(nivel);
      html += `<li>${m[2]}</li>`;
    } else {
      cerrar(0);
      if (l.trim()) html += `<p>${l}</p>`;
    }
  }
  cerrar(0);
  return html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

function citas(c){
  if (!c || !c.length) return "";
  return `<details class="oraculo-citas"><summary>${num(c.length)} mensaje${c.length === 1 ? "" : "s"} citado${c.length === 1 ? "" : "s"}</summary>
    <ul>${c.map(x => `<li><span class="meta nowrap">${fecha(x.ts, true)} · ${esc(x.grupo)}</span>
      <b>${esc(x.nombre)}</b>${x.tipo && x.tipo !== "texto" && x.tipo !== "chat" ? ` <span class="meta">(${esc(x.tipo)})</span>` : ""}: ${esc(x.texto || "")}${x.foto ? ` <span class="meta">[foto: ${esc(x.foto)}]</span>` : ""}</li>`).join("")}</ul>
  </details>`;
}

function turno(t){
  const cuerpo = t.pendiente
    ? '<p class="meta">Leyendo los mensajes…</p>'
    : t.error ? `<p class="error">${esc(t.error)}</p>`
    : formatear(t.respuesta) + citas(t.citas)
      + `<p class="meta">${num(t.mensajes)} mensajes leídos${t.recortado ? " (solo los más recientes: el período es muy largo)" : ""}`
      + (t.fotos && t.fotos.total ? ` · ${num(t.fotos.descritas)} de ${num(t.fotos.total)} fotos vistas` : "")
      + (t.costo ? ` · US$${t.costo.usd.toFixed(3)}` : "") + "</p>";
  return `<div class="oraculo-turno">
    <div class="oraculo-pregunta"><span>${esc(t.pregunta)}</span><span class="meta">${esc(t.alcance)}</span></div>
    <div class="oraculo-respuesta">${cuerpo}</div>
  </div>`;
}

export default {
  id: "oraculo",
  titulo: "GaliOráculo",

  html(ctx){
    const titulo = "GaliOráculo";
    const explica = "Pregúntale lo que quieras sobre los chats. Lee todos los mensajes del grupo y período elegidos arriba "
      + "(o de todos los grupos), más los retos y quién los cumplió, y responde citando los mensajes en que se basa. "
      + "Si algo no está en los mensajes, lo dice. Ve las fotos de los últimos 35 días (se describen solas después de cada lectura); "
      + "los videos y audios solo cuentan por su texto. "
      + "La conversación no se guarda. Cada pregunta cuesta centavos de dólar en Gemini: más si el período es largo.";
    if (PUBLICADO) return tarjeta({titulo, explica, cuerpo: vacio("Lee los mensajes con nombres: solo se usa en el PC del Chatmanager.")});
    const a = alcanceDe(ctx);
    const historial = conversacion.length
      ? `<div class="oraculo-conversacion">${conversacion.map(turno).join("")}</div>`
      : `<div class="oraculo-ejemplos">${EJEMPLOS.map(e => `<button type="button" class="btn" data-ejemplo="${esc(e)}">${esc(e)}</button>`).join("")}</div>`;
    const acciones = conversacion.length ? '<button type="button" class="btn fantasma" data-accion="oraculo-limpiar">Nueva conversación</button>' : "";
    return tarjeta({titulo, explica, acciones, clase: "sola", cuerpo: historial + `
      <form class="oraculo-form">
        <textarea name="pregunta" rows="2" placeholder="Pregunta sobre ${esc(a.texto)}…"${ocupado ? " disabled" : ""}>${esc(borrador)}</textarea>
        <div class="oraculo-pie">
          <span class="meta">Alcance: <b>${esc(a.texto)}</b>. Enter envía, Shift+Enter cambia de línea.</span>
          <button type="submit" class="btn primario"${ocupado ? " disabled" : ""}>Preguntar</button>
        </div>
      </form>`});
  },

  enlazar(cont, ctx){
    if (PUBLICADO) return;
    const form = cont.querySelector(".oraculo-form");
    const caja = form.querySelector("textarea");
    caja.oninput = () => { borrador = caja.value; };
    caja.onkeydown = ev => { if (ev.key === "Enter" && !ev.shiftKey){ ev.preventDefault(); form.requestSubmit(); } };
    if (!ocupado) caja.focus();

    cont.querySelectorAll("[data-ejemplo]").forEach(b => b.onclick = () => { borrador = b.dataset.ejemplo; form.requestSubmit(); });
    const limpiar = cont.querySelector('[data-accion="oraculo-limpiar"]');
    if (limpiar) limpiar.onclick = () => { conversacion.length = 0; ctx.repintar(); };

    form.onsubmit = async ev => {
      ev.preventDefault();
      const pregunta = (borrador || caja.value).trim();
      if (!pregunta || ocupado) return;
      const a = alcanceDe(ctx);
      // Solo las preguntas anteriores del mismo alcance dan contexto.
      const previas = conversacion.filter(t => t.alcance === a.texto && t.respuesta).map(t => ({pregunta: t.pregunta, respuesta: t.respuesta}));
      const t = {pregunta, alcance: a.texto, pendiente: true};
      conversacion.push(t);
      borrador = "";
      ocupado = true;
      ctx.repintar();
      try {
        Object.assign(t, await api.oraculo({pregunta, previas, desdeTs: ctx.reporte.desdeTs, hastaTs: ctx.reporte.hastaTs, ids: ctx.ids,
          etiqueta: a.periodo}));
      } catch (e){ t.error = e.message; }
      t.pendiente = false;
      ocupado = false;
      ctx.repintar();
    };
  }
};

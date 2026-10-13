/* Temas y dudas: de qué se habla y qué quedó sin responder.

   Tres baldes, porque en el grupo se mezcla todo: lo que el staff debe
   contestar (Sin responder), todas las dudas del programa, y lo que se
   preguntan entre ellos (que no cuenta en ninguna cifra). */
import {num, esc, duracion} from "../../formato.js";
import {api} from "../../api.js";
import {tarjeta, hbars, vacio, verMas, tablaEn, mini} from "../piezas.js";
import {preguntas, hilo, mensajesEmocion} from "../tablas.js";
import {FAMILIAS, TEMAS, EMOCIONES} from "../../dominio/etiquetas.js";
import {filasPorCategoria, perfilEmocional} from "../../dominio/agregado.js";
import {BALDES} from "../../dominio/dudas.js";
import {ruedaEmociones} from "../rueda-emociones.js";

const VISIBLES = 8;
let balde = BALDES[0].id;
let verMasFilas = false;
let emocion = null;          // la emocion de la rueda cuyos mensajes se ven (null = la dominante)
let verMasEmocion = false;
// Primero lo mas intenso; dentro de cada intensidad, lo mas reciente.
const ORDEN_INTENSIDAD = {intensa: 0, basica: 1, leve: 2};
const hilos = new Map();     // id de la pregunta -> promesa del hilo (se pide una sola vez)

/* Quien del staff atendio y que tan rapido. Una duda se le cuenta a quien la
   cito o, si nadie la cito, al primero del staff que escribio despues. */
function desempenoStaff(lista){
  const filas = lista.filter(s => s.mensajes || s.respondidas);
  const max = Math.max(...filas.map(s => s.respondidas), 1);
  const cuerpo = filas.length
    ? tablaEn(`<table><thead><tr><th>Persona</th><th class="num">Mensajes</th><th class="num">Dudas respondidas</th><th class="num">Mediana</th></tr></thead><tbody>
      ${filas.map(s => `<tr tabindex="0" data-tip="${esc([s.tel, s.grupos.length ? `Escribió en ${s.grupos.length} ${s.grupos.length === 1 ? "grupo" : "grupos"}` : ""].filter(Boolean).join("<br>"))}">
        <td>${esc(s.nombre || "Sin nombre")}</td><td class="num">${num(s.mensajes)}</td>
        <td class="num">${mini(s.respondidas, max, 40)}${num(s.respondidas)}</td><td class="num nowrap">${duracion(s.mediana)}</td></tr>`).join("")}
      </tbody></table>`)
    : vacio("El staff no escribió en este período en los grupos elegidos.");
  return tarjeta({
    titulo: "Desempeño del staff", clase: "sola", cuerpo,
    explica: "Por persona del staff: sus mensajes y las dudas que respondió, con la mediana de lo que tardó. "
      + "Una duda se le cuenta a quien la citó o, si nadie la citó, al primero del staff que escribió en las 24 h siguientes."
  });
}

/* Abre o cierra el hilo debajo de la fila, sin repintar la pestana. */
function alternarHilo(fila){
  const abierta = fila.getAttribute("aria-expanded") === "true";
  const siguiente = fila.nextElementSibling;
  if (abierta){
    if (siguiente && siguiente.classList.contains("fila-hilo")) siguiente.remove();
    fila.setAttribute("aria-expanded", "false");
    return;
  }
  fila.setAttribute("aria-expanded", "true");
  const tr = document.createElement("tr");
  tr.className = "fila-hilo";
  tr.innerHTML = `<td colspan="${fila.children.length}"><div class="caja-hilo"><p class="meta">Cargando…</p></div></td>`;
  fila.after(tr);
  const {grupo, id, ts} = fila.dataset;
  if (!hilos.has(id)) hilos.set(id, api.hilo({grupoId: grupo, id, ts}));
  hilos.get(id)
    .then(h => { tr.querySelector(".caja-hilo").innerHTML = hilo(h); })
    .catch(e => {
      hilos.delete(id);
      tr.querySelector(".caja-hilo").innerHTML = `<p class="meta error">${esc(e.message)}</p>`;
    });
}

/* "No es sobre la app" no es una familia de duda: en un reporte viejo puede
   venir contada, y ahi no aporta nada. */
const familias = total => filasPorCategoria(total.familias, FAMILIAS).filter(f => f.k !== "otra");

const SIN_FILAS = {
  pendientes: "Ninguna duda quedó sin responder.",
  dudas: "No hubo dudas sobre el programa en este período.",
  charla: "No hubo preguntas entre ellos."
};

export default {
  id: "dudas",
  titulo: "Temas y dudas",
  insignia: ctx => ctx.total.sinResponder || null,

  html(ctx){
    const {total, uno} = ctx;
    const hayIA = Object.keys(total.temas).length > 0;

    const clasificacion = `<div class="grid2">
      ${tarjeta({titulo: "Familias de las dudas", explica: "Misma taxonomía del reporte de dudas sobre la app. Solo cuenta las dudas del programa, no la charla del grupo.",
        cuerpo: hayIA ? hbars(familias(total), "dudas") : vacio("Pon GEMINI_API_KEY en .env y usa Recalcular.")})}
      ${tarjeta({titulo: "De qué se habla", explica: "Tema de cada mensaje de usuario, según Gemini.",
        cuerpo: hayIA ? hbars(filasPorCategoria(total.temas, TEMAS), "mensajes") : vacio("Disponible con Gemini.")})}
    </div>`;

    // La emocion elegida en la rueda; si no hay, la que mas pesa.
    const dominante = perfilEmocional(total.emociones, Object.keys(EMOCIONES)).dominante;
    const elegida = emocion || (dominante && dominante.k);
    const deEmocion = elegida ? total.conEmocion
      .filter(m => m.emocion === elegida)
      .sort((a, b) => ORDEN_INTENSIDAD[a.intensidad] - ORDEN_INTENSIDAD[b.intensidad] || b.ts - a.ts) : [];
    const listaEmocion = elegida && total.conEmocion.length
      ? `<div class="cab-card sub"><h4>Mensajes de ${esc(EMOCIONES[elegida].nombre)} (${num(deEmocion.length)})</h4>`
        + (deEmocion.length > VISIBLES ? verMas(verMasEmocion, Math.min(deEmocion.length, 200), "emocion") : "") + `</div>`
        + mensajesEmocion(deEmocion, elegida, {conGrupo: !uno, limite: verMasEmocion ? 200 : VISIBLES})
      : "";

    const emociones = tarjeta({
      titulo: "Emociones del chat", clase: "sola",
      explica: "Rueda de Plutchik invertida: cada pétalo es una emoción básica, con la versión leve en el centro y la intensa afuera. "
        + "Gemini le asigna a cada mensaje de usuario su emoción y qué tan fuerte se nota; lo neutro no cuenta. "
        + "Cada pétalo se llena desde el centro con sus mensajes pesados por intensidad (leve 1, básica 2, intensa 3): un 25% de los mensajes, "
        + "todos leves, llena la franja leve; todos intensos, el pétalo entero. Entre dos pétalos que pasan del 12% se enciende su díada (p. ej. Alegría + Confianza = Amor). "
        + "Toca un pétalo para ver sus mensajes.",
      cuerpo: ruedaEmociones(total.emociones, {elegida}) + listaEmocion
    });

    const cuentas = {};
    BALDES.forEach(b => cuentas[b.id] = b.filtra(total.preguntas));
    const lista = cuentas[balde];

    const chips = `<div class="tabs chicas">${BALDES.map(b =>
      `<button type="button" data-balde="${b.id}" aria-pressed="${b.id === balde}">${b.titulo} (${num(cuentas[b.id].length)})</button>`
    ).join("")}</div>`;

    const cuerpo = lista.length
      ? preguntas(lista, {conGrupo: !uno, limite: verMasFilas ? 200 : VISIBLES})
        + (lista.length > 200 ? vacio(`Se muestran 200 de ${num(lista.length)}.`) : "")
      : vacio(SIN_FILAS[balde]);

    const acciones = chips + (lista.length > VISIBLES ? verMas(verMasFilas, Math.min(lista.length, 200), "preguntas") : "");
    return clasificacion + emociones + tarjeta({
      titulo: "Preguntas", clase: "sola", acciones, cuerpo,
      explica: "Duda = pregunta o problema dirigido al staff y sobre el programa. Lo que se preguntan entre ellos "
        + "(turnos, chisme, bromas) va a “Entre ellos” y no cuenta en el resumen. "
        + "Respondida = el staff la citó o escribió en las 24 h siguientes."
    }) + desempenoStaff(ctx.total.staff || []);
  },

  enlazar(cont, ctx){
    cont.querySelectorAll("[data-balde]").forEach(b => b.onclick = () => {
      balde = b.getAttribute("data-balde");
      verMasFilas = false;
      ctx.repintar();
    });
    cont.querySelectorAll("tr.con-hilo").forEach(fila => {
      fila.onclick = () => alternarHilo(fila);
      fila.onkeydown = e => {
        if (e.key === "Enter" || e.key === " "){ e.preventDefault(); alternarHilo(fila); }
      };
    });
    cont.querySelectorAll("[data-emocion]").forEach(p => {
      const elegir = () => { emocion = p.getAttribute("data-emocion"); verMasEmocion = false; ctx.repintar(); };
      p.onclick = elegir;
      p.onkeydown = e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); elegir(); } };
    });
    const be = cont.querySelector('[data-accion="emocion"]');
    if (be) be.onclick = () => { verMasEmocion = !verMasEmocion; ctx.repintar(); };
    const b = cont.querySelector('[data-accion="preguntas"]');
    if (b) b.onclick = () => { verMasFilas = !verMasFilas; ctx.repintar(); };
  }
};

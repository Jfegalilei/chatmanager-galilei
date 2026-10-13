/* Resumen: lo que hay que saber en diez segundos. Tres cifras, lo que pide
   atencion y la forma de la semana. Todo lo demas esta en las otras
   pestanas. */
import {num, duracion, esc} from "../../formato.js";
import {kpi, delta, curva, indicador, dato, tira, chispa, ayuda} from "../piezas.js";
import {atencion} from "../../dominio/atencion.js";
import {puntosTendencia, serieDe, fechaDePunto} from "../../dominio/agregado.js";

// Cuando cae cada punto de la curva: "lunes 5 oct" o "septiembre 2026".
const cuandoCae = (serie, i) => fechaDePunto(serie, i).largo;

function curvaDe(serie, campo, color, unidad){
  if (!serie) return "";
  return curva(serie.puntos.map(p => ({v: p[campo]})), {
    color,
    tip: (p, i) => `<b>${esc(cuandoCae(serie, i))}</b><br>${num(p.v)} ${unidad}`
  });
}

const GRAVEDAD = {alta: "Atender", media: "Revisar", nota: "Nota"};

function avisos(ctx){
  const lista = atencion(ctx);
  if (!lista.length){
    return `<p class="todo-bien">Nada pendiente: no quedaron preguntas sin responder ni grupos apagados.</p>`;
  }
  return `<ul class="atender">${lista.map(a => `
    <li data-g="${a.gravedad}"${a.ir ? ` data-ir="${esc(a.ir)}" tabindex="0" role="button" aria-label="${esc(`${a.texto}. Ver ${a.ir}`)}"` : ""}>
      <span class="et">${GRAVEDAD[a.gravedad]}</span>
      <span class="tx"><b>${esc(a.texto)}</b>${a.detalle ? `<span class="meta">${esc(a.detalle)}</span>` : ""}</span>
      ${a.ir ? '<svg class="fl" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ""}
    </li>`).join("")}</ul>`;
}

export default {
  id: "resumen",
  titulo: "Resumen",

  html(ctx){
    const {total, comp, nombres, reporte, ids} = ctx;
    const puntos = puntosTendencia(reporte, ids);
    const serie = serieDe(reporte, ids);
    const porDia = serie && serie.paso === "mes" ? "por mes" : "por día";

    const cifras = `<div class="kpis">
      ${kpi({titulo: "Mensajes de usuarios", valor: num(total.mensajesUsuarios), pie: delta(comp.mensajes, nombres.anterior),
        explica: `Solo mensajes de la gente de los grupos; el staff se cuenta aparte. La curva va ${porDia}.`,
        grafica: curvaDe(serie, "m", "var(--series-1)", "mensajes")})}
      ${kpi({titulo: "Personas activas", valor: num(total.activos), pie: delta(comp.activos, nombres.anterior) || "escriben o reaccionan",
        explica: `Quien escribió o reaccionó al menos una vez en el período. La curva va ${porDia}: una persona cuenta una vez en cada punto.`,
        grafica: curvaDe(serie, "a", "var(--series-3)", "personas activas")})}
      ${kpi({titulo: "Dudas sin responder", valor: num(total.sinResponder),
        pie: `<span class="${total.sinResponder ? "alerta" : ""}">de ${num(total.dudas.length)} dudas</span>`,
        explica: "Duda = pregunta o problema dirigido al staff y sobre el programa; lo que se preguntan entre ellos no cuenta. "
          + "Respondida = el staff la citó o escribió en las 24 h siguientes."})}
    </div>`;

    // Cada dato con su indicador frente al periodo anterior.
    const c = comp.tira, ant = nombres.anterior;
    const pctCallados = v => v == null ? "–" : `${Math.round(v * 100)}% del grupo`;
    const secundarios = tira([
      dato("Respuesta del staff", duracion(total.mediana), "Mediana de lo que tarda el staff en contestar una duda. Mejora si baja.",
        indicador(c.mediana, ant, duracion)),
      dato("Preguntas entre ellos", num(total.charla), "Preguntas del grupo que no son para el staff: charla, coordinación del punto, bromas. Mejora si sube.",
        indicador(c.charla, ant)),
      dato("Callados", total.callados == null ? "–" : `${num(total.callados)} de ${num(total.participantes)}`,
        "Miembros que no escribieron ni reaccionaron. Requiere lectura por WhatsApp. Se compara como parte del grupo, para que entrar gente nueva no cuente como empeorar.",
        indicador(c.callados, ant, pctCallados)),
      dato("Ingresos", num(total.altas), "Personas que entraron o fueron agregadas al grupo. Mejora si sube.", indicador(c.altas, ant)),
      dato("Salidas", num(total.bajas), "Personas que salieron o fueron sacadas del grupo. Mejora si baja.", indicador(c.bajas, ant)),
      dato("Mensajes del staff", num(total.mensajesStaff), "Mejora si sube: más acompañamiento en los grupos.", indicador(c.mensajesStaff, ant)),
      dato("Reacciones", num(total.reacciones), "Mejora si sube.", indicador(c.reacciones, ant))
    ]);

    /* Ojo: no puede ser un <button>, porque el icono de ayuda ya es uno y un
       boton dentro de otro es HTML invalido (el navegador corta la caja). */
    const tendencia = puntos.length >= 2
      ? `<div class="chispa-caja" role="button" tabindex="0" data-ir="actividad" aria-label="Tendencia semanal: ver la pestaña Actividad">
           <span class="k">Tendencia semanal${ayuda("Mensajes de usuarios por semana. Clic para ver la gráfica completa.")}</span>
           ${chispa(puntos)}
           <span class="meta">últimas ${puntos.length} semanas · ver actividad</span>
         </div>`
      : "";

    return `${cifras}
      <section class="card atender-card">
        <div class="cab-card"><h3>Para atender</h3></div>
        ${avisos(ctx)}
      </section>
      ${secundarios}
      ${tendencia}`;
  }
};

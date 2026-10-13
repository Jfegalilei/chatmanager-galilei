/* Actividad: cuanto, cuando y quien. */
import {nombreGrupo, esc, num} from "../../formato.js";
import {tarjeta, hbars, barrasMeta, verMas} from "../piezas.js";
import {linea} from "../linea.js";
import {heatmap} from "../heatmap.js";
import {ranking} from "../tablas.js";
import {puntosTendencia, puntosDeSerie, serieDe, filasPorGrupo, filasPorDia, umbralDe, CONCENTRADO} from "../../dominio/agregado.js";

const VISIBLES = 5;

const LARGO = {semana: "la semana", mes: "el mes", ano: "el año"};

/* La tendencia cambia de grano con el periodo: una semana se ve contra las
   anteriores (por semana); un mes, dia por dia; un ano, mes por mes. */
function tendencia(reporte, ids){
  const tipo = (reporte.periodo && reporte.periodo.tipo) || "semana";
  const serie = tipo === "semana" ? null : serieDe(reporte, ids);
  if (!serie){
    return {titulo: "Tendencia semanal", explica: "Mensajes de usuarios por semana, las últimas 8",
      puntos: puntosTendencia(reporte, ids), ejeX: "Semana"};
  }
  return tipo === "mes"
    ? {titulo: "Tendencia diaria", explica: "Mensajes de usuarios por día del mes",
       puntos: puntosDeSerie(serie), ejeX: "Día", vacio: "La tendencia aparece desde el segundo día del mes."}
    : {titulo: "Tendencia mensual", explica: "Mensajes de usuarios por mes del año",
       puntos: puntosDeSerie(serie), ejeX: "Mes", vacio: "La tendencia aparece desde el segundo mes del año."};
}

function participacionPorGrupo(reporte, ids){
  const u = umbralDe(reporte.periodo);
  const largo = LARGO[(reporte.periodo && reporte.periodo.tipo) || "semana"];
  const filas = filasPorGrupo(reporte, ids).map(f => ({...f, tip: [
    `<b>${esc(f.n)}</b>`,
    f.v == null
      ? "Sin lista de miembros: no se puede calcular el porcentaje."
      : `${num(f.escribieron)} de ${num(f.miembros)} miembros escribieron (${Math.round(f.v)}%)`,
    `${num(f.mensajes)} mensajes de usuarios`,
    f.concentracion == null ? "" : `El 10% más activo hace el ${Math.round(f.concentracion)}% de los mensajes${
      f.concentrado ? ` (más de ${CONCENTRADO}%: depende de pocas personas)` : ""}`
  ].filter(Boolean).join("<br>")}));
  return barrasMeta(filas, {meta: u.ideal, etiquetaMeta: `Ideal: ${u.ideal}% de los miembros escribiendo en ${largo}`});
}
let todoElRanking = false;

export default {
  id: "actividad",
  titulo: "Actividad",

  html(ctx){
    const {reporte, ids, uno, total, nombres} = ctx;
    const t = tendencia(reporte, ids);
    const graf = linea(t.puntos, {ejeX: t.ejeX, vacio: t.vacio});
    this.grafica = graf;

    const comparacion = uno
      ? hbars(filasPorDia(total), "mensajes")
      : participacionPorGrupo(reporte, ids);

    const cuantos = total.ranking.length;
    return `<div class="grid2">
      ${tarjeta({titulo: t.titulo, cuerpo: `<div id="cLinea">${graf.html}</div>`,
        explica: `${t.explica} · ${uno ? esc(nombreGrupo(uno.nombre)) : "todos los grupos"}`})}
      ${tarjeta({titulo: uno ? "Por día" : "Por grupo", cuerpo: comparacion,
        explica: uno ? "Mensajes de usuarios de lunes a domingo"
          : `Qué parte de los miembros escribió ${nombres.este} (sin staff; reaccionar no cuenta). Así un grupo grande no tapa a uno pequeño. Verde: llega al ideal. Amarillo: por debajo de ${umbralDe(reporte.periodo).bajo}%, lo normal en una comunidad que no está enganchada. El globito trae los mensajes y cuánto depende el grupo de sus más activos.`})}
      ${tarjeta({titulo: "Cuándo escriben", cuerpo: heatmap(total.calor), explica: "Mensajes de usuarios por día y hora"})}
      ${tarjeta({titulo: "Miembros más activos", explica: "Sin staff. El globito muestra el teléfono y las reacciones recibidas.",
        acciones: cuantos > VISIBLES ? verMas(todoElRanking, cuantos, "ranking") : "",
        cuerpo: ranking(total.ranking, {conGrupo: !uno, limite: todoElRanking ? cuantos : VISIBLES})})}
    </div>`;
  },

  enlazar(cont, ctx){
    const caja = cont.querySelector("#cLinea");
    if (caja && this.grafica) this.grafica.enlazar(caja);
    const b = cont.querySelector('[data-accion="ranking"]');
    if (b) b.onclick = () => { todoElRanking = !todoElRanking; ctx.repintar(); };
  }
};

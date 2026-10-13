/* "Para atender": las pocas frases que valen la pena leer de primeras. Es la
   unica pieza que decide que es importante; las vistas solo lo muestran. Para
   agregar un aviso nuevo se agrega una regla a la lista, sin tocar nada mas.

   Cada regla recibe el reporte ya sumado y devuelve un aviso o null:
     {clave, gravedad: "alta" | "media" | "nota", texto, detalle, ir} */
import {num, duracion, decimal, nombreGrupo} from "../formato.js";

const LENTO_MIN = 4 * 60;        // mediana de respuesta que ya incomoda
const CAIDA_PCT = -40;           // baja fuerte de mensajes contra el periodo anterior
const BASE_COMPARABLE = 20;      // debajo de esto, un porcentaje no dice nada
const INDICE_FLOJO = 0.8;        // publicacion que no movio el grupo
const MAXIMO = 5;

const reglas = [
  function preguntasSinResponder({total}){
    if (!total.sinResponder) return null;
    return {
      clave: "sin-responder",
      gravedad: "alta",
      texto: `${num(total.sinResponder)} ${total.sinResponder === 1 ? "duda" : "dudas"} sin responder`,
      detalle: `de ${num(total.dudas.length)} ${total.dudas.length === 1 ? "duda" : "dudas"} del período`,
      ir: "dudas"
    };
  },

  function respuestaLenta({total}){
    if (total.mediana == null || total.mediana < LENTO_MIN) return null;
    return {
      clave: "lenta",
      gravedad: "media",
      texto: `El staff responde en ${duracion(total.mediana)}`,
      detalle: "mediana del período",
      ir: "dudas"
    };
  },

  function gruposQueCayeron({grupos}){
    const caidos = grupos.filter(g => g.antes >= BASE_COMPARABLE && g.pct != null && g.pct <= CAIDA_PCT);
    if (!caidos.length) return null;
    const peor = caidos.sort((a, b) => a.pct - b.pct)[0];
    return {
      clave: "caida",
      gravedad: "media",
      texto: caidos.length === 1
        ? `${peor.nombre} bajó ${Math.abs(peor.pct)}%`
        : `${caidos.length} grupos bajaron más del ${Math.abs(CAIDA_PCT)}%`,
      detalle: caidos.length === 1 ? "vs el período anterior" : caidos.map(g => g.nombre).join(", "),
      ir: "actividad"
    };
  },

  function gruposCallados({grupos}){
    const mudos = grupos.filter(g => g.ahora === 0);
    if (!mudos.length) return null;
    return {
      clave: "mudos",
      gravedad: "media",
      texto: mudos.length === 1 ? `${mudos[0].nombre} no tuvo mensajes` : `${mudos.length} grupos sin mensajes`,
      detalle: mudos.map(g => g.nombre).join(", "),
      ir: "actividad"
    };
  },

  function contenidosFlojos({contenidos}){
    const flojos = contenidos.filter(f => f.indice != null && f.indice < INDICE_FLOJO);
    if (!flojos.length) return null;
    return {
      clave: "contenidos",
      gravedad: "media",
      texto: `${flojos.length} ${flojos.length === 1 ? "publicación" : "publicaciones"} no movieron el grupo`,
      detalle: `índice bajo ${decimal(INDICE_FLOJO, 1)} en las 24 h siguientes`,
      ir: "contenidos"
    };
  },

  function datosIncompletos({avisos}){
    if (!avisos.length) return null;
    return {
      clave: "incompletos",
      gravedad: "nota",
      texto: avisos.length === 1 ? "Un grupo tiene datos incompletos" : `${avisos.length} grupos con datos incompletos`,
      detalle: avisos.join(" "),
      ir: null
    };
  }
];

const ORDEN = {alta: 0, media: 1, nota: 2};

/* grupos: [{nombre, ahora, antes, pct}] calculado aqui una sola vez para que
   las reglas no repitan la cuenta. */
function porGrupo(reporte, ids, previo){
  return ids.map(id => {
    const g = reporte.grupos[id];
    const antes = previo ? (previo[id] || {}).mensajes || 0 : null;
    const ahora = g.mensajesUsuarios;
    return {
      nombre: nombreGrupo(g.nombre),
      ahora,
      antes,
      pct: antes ? Math.round((ahora - antes) / antes * 100) : null
    };
  });
}

export function atencion({reporte, ids, total}){
  const tend = reporte.tendencia || [];
  const previo = reporte.previo || (tend.length >= 2 ? tend[tend.length - 2].porGrupo : null);
  const contexto = {
    reporte,
    total,
    grupos: porGrupo(reporte, ids, previo),
    contenidos: (reporte.contenidos || []).filter(f => ids.includes(f.grupoId)),
    avisos: reporte.avisos || []
  };
  return reglas
    .map(r => r(contexto))
    .filter(Boolean)
    .sort((a, b) => ORDEN[a.gravedad] - ORDEN[b.gravedad])
    .slice(0, MAXIMO);
}

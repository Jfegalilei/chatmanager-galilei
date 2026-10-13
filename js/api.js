/* El unico sitio que habla con el servidor. Las vistas piden por nombre y no
   saben de URLs, metodos ni JSON.

   En la copia publicada no hay servidor: cada URL se busca en la foto que
   descifro foto.js, y lo que escribiria algo se rechaza. */
import {PUBLICADO} from "./foto.js";

let foto = null;
export const usarFoto = f => { foto = f; };

const NO_HAY = {
  "/api/reporte/": "Esa semana no tiene reporte.",
  "hilo:": "No encontré esa pregunta en los mensajes guardados."
};

async function pedir(url, cuerpo){
  if (PUBLICADO){
    if (cuerpo !== undefined) throw new Error("Esta es la copia de solo lectura: los cambios se hacen en el PC del Chatmanager.");
    if (foto && foto[url] != null) return foto[url];
    const motivo = Object.keys(NO_HAY).find(p => url.startsWith(p));
    throw new Error(motivo ? NO_HAY[motivo] : "Esto no viene en la copia publicada.");
  }
  const opciones = cuerpo === undefined
    ? {}
    : {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(cuerpo)};
  const r = await fetch(url, opciones);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}

/* Copia publicada: Personas y Retos van en archivos aparte (c/...json), uno
   por periodo y grupo; el nombre lo arma igual lib/publicar.js. */
const archivoConsulta = (tipo, desdeTs, hastaTs, ids) =>
  `c/${tipo}-${desdeTs}-${hastaTs}-${ids.length === 1 ? ids[0].replace(/\W/g, "_") : "todos"}.json`;

async function consulta(tipo, url, {desdeTs, hastaTs, ids}){
  if (!PUBLICADO) return pedir(url);
  const r = await fetch(archivoConsulta(tipo, desdeTs, hastaTs, ids));
  if (!r.ok) throw new Error("Este período todavía no está en la copia publicada.");
  return r.json();
}

/* El Oraculo necesita a Gemini, que vive en el PC del Chatmanager: la copia
   le pregunta por el tunel. Con el PC apagado no hay a quien preguntarle. */
async function oraculoPorTunel(cuerpo){
  const base = foto && foto["/api/tunel"];
  const apagado = "El PC del Chatmanager está apagado o sin internet: el Oráculo vuelve cuando se prenda.";
  if (!base) throw new Error(apagado);
  let r;
  try {
    r = await fetch(base.replace(/\/$/, "") + "/api/oraculo",
      {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(cuerpo)});
  } catch { throw new Error(apagado); }
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) throw new Error((j && j.error) || apagado);
  return j;
}

export const api = {
  periodos: () => pedir("/api/semanas"),
  reporteSemana: clave => pedir(`/api/reporte/${clave}`),
  reportePeriodo: (tipo, valor) => pedir(`/api/periodo/${tipo}/${valor}`),
  hilo: ({grupoId, id, ts}) => pedir(PUBLICADO ? `hilo:${id}` : `/api/hilo?${new URLSearchParams({grupo: grupoId, id, ts})}`),

  actualizar: (cuerpo = {}) => pedir("/api/actualizar", cuerpo),
  cancelar: () => pedir("/api/cancelar", {}),
  reanalizar: clave => pedir(`/api/reanalizar/${clave}`, {}),
  desvincular: () => pedir("/api/desvincular", {}),
  probarAviso: () => pedir("/api/probar-aviso", {}),

  staff: () => pedir("/api/staff"),
  marcarStaff: persona => pedir("/api/staff", persona),

  personas: p => consulta("personas", `/api/personas?${new URLSearchParams({desde: p.desdeTs, hasta: p.hastaTs, grupos: p.ids.join(",")})}`, p),
  retos: p => consulta("retos", `/api/retos?${new URLSearchParams({desde: p.desdeTs, hasta: p.hastaTs, grupos: p.ids.join(",")})}`, p),
  jugadores: () => pedir("/api/jugadores"),
  consumo: (dias = 30) => pedir(`/api/consumo?dias=${dias}`),
  cargarJugadores: csv => pedir("/api/jugadores", {csv}),
  apodo: (autor, apodo) => pedir("/api/apodo", {autor, apodo}),
  oraculo: ({pregunta, previas, desdeTs, hastaTs, ids, etiqueta}) => {
    const cuerpo = {pregunta, previas, desde: desdeTs, hasta: hastaTs, grupos: ids, etiqueta};
    return PUBLICADO ? oraculoPorTunel(cuerpo) : pedir("/api/oraculo", cuerpo);
  }
};

/* Un periodo elegido en la barra se guarda como "s:2026-W38", "m:2026-09" o
   "a:2026"; aqui se traduce a la peticion que toca. */
export function reporteDe(valor){
  if (valor.startsWith("m:")) return api.reportePeriodo("mes", valor.slice(2));
  if (valor.startsWith("a:")) return api.reportePeriodo("ano", valor.slice(2));
  return api.reporteSemana(valor.replace(/^s:/, ""));
}

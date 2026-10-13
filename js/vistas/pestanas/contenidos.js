/* Contenidos: los retos que el staff lanzo de verdad en el periodo (no lo
   que decia el calendario) y, por cada uno, quien lo cumplio segun Gemini
   (analisis/cumplimiento.js): revisa los textos, fotos, videos y audios que
   cada persona mando al grupo dentro del plazo del reto.

   Lleva nombres: se pide aparte y no va a la copia publicada. */
import {esc, num, fecha, nombreGrupo} from "../../formato.js";
import {api} from "../../api.js";
import {PUBLICADO} from "../../foto.js";
import {tarjeta, vacio, tablaEn, mini} from "../piezas.js";

const cache = new Map();           // llave del periodo -> {promesa, datos, error}
const abiertos = new Set();        // retos desplegados (se conservan al repintar)

const llave = ctx => `${ctx.reporte.desdeTs}|${ctx.reporte.hastaTs}|${ctx.ids.join(",")}`;
function pedir(ctx){
  const k = llave(ctx);
  if (!cache.has(k)){
    const e = {datos: null, error: null};
    e.promesa = api.retos({desdeTs: ctx.reporte.desdeTs, hastaTs: ctx.reporte.hastaTs, ids: ctx.ids})
      .then(d => { e.datos = d; }, err => { e.error = err.message; });
    cache.set(k, e);
  }
  return cache.get(k);
}

const ESTADO_RETO = {
  nuevo: '<span class="pill">Nuevo</span>'
};
const VEREDICTO = {
  cumple: '<span class="pill estado-activo">Cumplió</span>',
  dudoso: '<span class="pill estado-riesgo">Dudoso</span>',
  no_cumple: '<span class="pill estado-salio">No cumplió</span>'
};
const EVIDENCIA = {texto: "un mensaje de texto", imagen: "una foto", video: "un video", audio: "un audio", cualquiera: "cualquier mensaje"};

function resumen(r){
  if (!r.revisado) return '<span class="meta">Sin revisar todavía</span>';
  if (r.requisito && !r.requisito.verificable) return '<span class="meta">Se cumple fuera del chat</span>';
  return `<b>${num(r.cumplen)}</b> cumplieron` + (r.dudosos ? ` · ${num(r.dudosos)} dudosos` : "")
    + (r.cerrado ? "" : ' <span class="meta">(abierto)</span>');
}

function detalle(r){
  if (!r.revisado) return vacio("Se revisa sola después de la próxima lectura de WhatsApp (cada 30 min).");
  const q = r.requisito;
  const pide = q ? `<p class="meta">Pide ${EVIDENCIA[q.evidencia] || q.evidencia} en ${num(q.horas)} h: ${esc(q.criterio)}</p>` : "";
  if (q && !q.verificable) return pide + vacio("Este reto se cumple en la app o en el punto, no en el chat: no hay nada que revisar aquí.");
  if (!r.personas.length) return pide + vacio("Nadie mandó al grupo lo que pedía el reto dentro del plazo.");
  return pide + tablaEn(`<table><thead><tr><th>Persona</th><th>Resultado</th><th>Por qué</th></tr></thead><tbody>
    ${r.personas.map(p => `<tr tabindex="0" data-tip="${esc([p.tel, p.adjuntos && p.adjuntos.perdidos ? `${p.adjuntos.perdidos} adjunto(s) ya no se pudieron ver` : ""].filter(Boolean).join("<br>"))}">
      <td>${esc(p.nombre)}</td><td>${VEREDICTO[p.veredicto] || esc(p.veredicto)}</td><td class="meta">${esc(p.motivo || "")}</td></tr>`).join("")}
  </tbody></table>`);
}

function lista(retos, ctx){
  if (!retos.length) return vacio("El staff no lanzó retos en este período en los grupos elegidos (o todavía no se reconocieron con IA).");
  return `<div class="retos">${retos.map(r => {
    const k = r.mensajeId || `${r.grupoId}|${r.ts}`;
    return `<details class="reto" data-reto="${esc(k)}"${abiertos.has(k) ? " open" : ""}>
      <summary>
        <span class="meta nowrap">${fecha(r.ts, true)}</span>
        <span class="reto-titulo">${esc(r.titulo)} ${ESTADO_RETO[r.estado] || ""}${ctx.uno ? "" : `<span class="meta"> · ${esc(nombreGrupo(r.grupo))}</span>`}</span>
        <span class="num nowrap" title="Escribieron o reaccionaron en 24 h, sobre los miembros sin staff">${r.pct == null ? "—" : `${mini(r.pct, 100, 30)}${num(Math.round(r.pct))}%`}</span>
        <span class="nowrap">${resumen(r)}</span>
      </summary>
      <div class="reto-detalle">${detalle(r)}</div>
    </details>`;
  }).join("")}</div>`;
}

export default {
  id: "contenidos",
  titulo: "Contenidos",
  insignia: ctx => { const e = cache.get(llave(ctx)); return e && e.datos ? e.datos.retos.length || null : null; },

  html(ctx){
    const titulo = "Retos del período";
    const explica = "Los retos que el staff lanzó de verdad en el grupo, estén o no en el calendario. "
      + "Gemini lee cada reto para saber qué evidencia pide (texto, foto, video o audio) y revisa lo que cada persona mandó dentro del plazo: "
      + "Cumplió, No cumplió o Dudoso (por ejemplo, un adjunto que WhatsApp ya borró). Las fotos y videos no se guardan. "
      + "El porcentaje es la participación: quien escribió o reaccionó en las 24 h siguientes.";
    if (PUBLICADO) return tarjeta({titulo, explica, cuerpo: vacio("Trae nombres: solo se ve en el PC del Chatmanager.")});
    const e = pedir(ctx);
    if (e.error) return tarjeta({titulo, explica, cuerpo: `<p class="error">${esc(e.error)}</p>`});
    if (!e.datos) return tarjeta({titulo, explica, cuerpo: vacio("Cargando…")});
    const aviso = e.datos.gemini ? "" : '<p class="error">Falta GEMINI_API_KEY en .env: no se puede revisar quién cumplió.</p>';
    return tarjeta({titulo, explica, clase: "sola", cuerpo: aviso + lista(e.datos.retos, ctx)});
  },

  enlazar(cont, ctx){
    if (PUBLICADO) return;
    const e = pedir(ctx);
    if (!e.datos && !e.error){
      const k = llave(ctx);
      e.promesa.then(() => { if (cache.get(k) === e) ctx.repintar(); });
      return;
    }
    cont.querySelectorAll("details.reto").forEach(d => d.ontoggle = () => {
      if (d.open) abiertos.add(d.dataset.reto); else abiertos.delete(d.dataset.reto);
    });
  }
};

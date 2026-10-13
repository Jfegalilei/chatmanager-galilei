/* La pastilla de conexion y su panel: en que anda la escucha y los ultimos
   avisos. Solo lee el estado que llega por SSE. */
import {esc, hora, cuando} from "../formato.js";
import {CONEXION, EXPLICA_CONEXION} from "../dominio/etiquetas.js";
import {panel} from "./panel.js";

const LEYENDO = ["sincronizando", "leyendo", "analizando"];

// El texto corto de la pastilla.
export function textoConexion(estado){
  const c = estado.conexion || {};
  const base = CONEXION[c.estado] || "–";
  if (c.estado === "publicado") return c.publicado ? `Subida ${cuando(c.publicado)}` : base;
  if (estado.recalculando) return `Recalculando (${estado.recalculando.hechas} de ${estado.recalculando.total})…`;
  if (c.estado === "conectado" && LEYENDO.includes(estado.fase)) return estado.fondo ? "Poniéndose al día…" : "Actualizando…";
  if (c.estado === "conectado" && c.ultimaLectura) return `${base} · ${hora(c.ultimaLectura * 1000)}`;
  if (c.estado === "desconectado" && c.desde) return `${base} desde ${hora(c.desde)}`;
  return base;
}

function explicacion(c){
  if (c.estado === "desconectado"){
    return `No hay conexión con WhatsApp${c.motivo ? ` (${esc(c.motivo)})` : ""}. Se reintenta sola`
      + `${c.reintento && c.reintento > Date.now() ? ` a las ${hora(c.reintento)}` : ""}.`
      + " Los mensajes no se pierden: al volver, se pone al día.";
  }
  return EXPLICA_CONEXION[c.estado] || "";
}

export function panelConexion({boton, caja, texto, leerEstado}){
  function pintar(){
    const estado = leerEstado();
    const c = estado.conexion || {};
    const alertas = estado.alertas || [];
    caja.innerHTML = `<h3>${esc(CONEXION[c.estado] || "Conexión")}</h3><p>${explicacion(c)}</p>`
      + (alertas.length ? `<h3>Últimos avisos</h3><ul>${alertas.map(a => `
          <li data-t="${esc(a.tipo)}">
            <b>${esc(a.titulo.replace(/^Chatmanager:\s*/, ""))}</b>
            <span class="meta">${cuando(a.ts)} · ${esc(a.texto)}</span>
          </li>`).join("")}</ul>` : "");
  }

  const p = panel({boton, caja, pintar});

  // La pastilla se repinta con cada evento; el panel, solo si esta abierto.
  return {
    ...p,
    actualizar(){
      const estado = leerEstado();
      const t = textoConexion(estado);
      boton.setAttribute("data-e", (estado.conexion || {}).estado || "");
      boton.setAttribute("aria-label", `Conexión: ${t}`);
      texto.textContent = t;
      p.refrescar();
    }
  };
}

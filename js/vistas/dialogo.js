/* El dialogo de la lectura. La pagina es el reporte: esto solo aparece para
   el QR de la primera vinculacion, para contar en que va una lectura larga y
   para dar una mala noticia. Al terminar bien, se cierra solo.

   Cada fase tiene su funcion: agregar una fase nueva es agregar una entrada
   al mapa, sin tocar el resto. */
import {esc, num, fecha} from "../formato.js";
import {api} from "../api.js";

const SPINNER = '<div class="spinner"></div>';
const cancelar = '<button class="btn" data-accion="cancelar">Cancelar</button>';
const salir = '<button class="btn primario" data-accion="salir">Cerrar</button>';
const acciones = botones => `<div class="acciones">${botones}</div>`;
const paso = (t, clase = "") => `<p class="paso ${clase}">${t}</p>`;
const nota = t => `<p class="nota">${t}</p>`;
const barra = pct => `<div class="barra-prog"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;

const TITULOS = {qr: "Vincular WhatsApp", desvinculando: "Desvincular", error: "No se pudo actualizar"};

const PASOS = {
  error: e => `<p class="error">${esc(e.error)}</p>${acciones(salir)}`,

  inactivo: () => paso("Los grupos están al día. El reporte es esta misma página: el período se elige arriba.") + acciones(salir),

  iniciando: () => SPINNER + paso("Abriendo WhatsApp Web…", "centrado") + acciones(cancelar),

  autenticando: e => {
    const pct = e.progreso && e.progreso.pct != null ? ` (${e.progreso.pct}%)` : "";
    return SPINNER + paso(`Conectado. Cargando chats${pct}…`, "centrado") + acciones(cancelar);
  },

  qr: e => `<div class="qr">
      <img alt="Código QR de WhatsApp" src="${e.qr}">
      ${paso("En el celular: WhatsApp &gt; Dispositivos vinculados &gt; Vincular un dispositivo.")}
      ${nota("Solo esta vez. Quedará vinculado como “Chatmanager”; lo puedes quitar cuando quieras.")}
    </div>${acciones(cancelar)}`,

  sincronizando: e => {
    const s = e.progreso || {};
    const cuantos = (e.grupos || []).length;
    const entrega = s.entrega != null && s.entrega < 100 ? ` (${s.entrega}%)` : "";
    const detalle = s.mensajes != null ? ` · ${num(s.mensajes)} mensajes · ${s.segundos} s` : "";
    return SPINNER
      + paso(`Encontré ${cuantos} grupos Galilei. Recibiendo los mensajes pendientes${entrega}${detalle}…`, "centrado")
      + nota(e.primeraVez
        ? "La primera vez tarda más: WhatsApp pasa el historial reciente. Deja el celular con WhatsApp abierto."
        : "Normalmente tarda menos de un minuto.")
      + acciones(cancelar);
  },

  leyendo: e => {
    const p = e.progreso || {};
    const desde = p.masViejo ? ` · ya va en ${fecha(p.masViejo, true)}` : "";
    const recargando = p.recargando && Date.now() - p.recargando < 15000
      ? nota("WhatsApp Web se recargó; retomando donde iba…") : "";
    return paso(`Leyendo <b>${esc(p.grupo)}</b> (${p.n} de ${p.total})`)
      + barra((p.n - 1) / p.total * 100)
      + recargando
      + nota(`Cargando mensajes guardados${p.tandas ? ` · tanda ${p.tandas}` : ""}${desde}.`)
      + acciones(cancelar);
  },

  desvinculando: () => SPINNER + paso("Quitando Chatmanager de los dispositivos vinculados…", "centrado"),

  analizando: e => {
    const q = e.progreso || {};
    const sem = q.semana ? ` (${q.semana.replace("-W", " · sem ")})` : "";
    if (q.fase === "clasificando"){
      return paso(`Clasificando mensajes con Gemini${sem}: ${num(q.hechos)} de ${num(q.total)}`) + barra(q.hechos / q.total * 100);
    }
    const texto = q.fase === "calendario" ? `Cruzando con el calendario${sem}…`
      : q.fase === "retos" ? `Calificando los retos${sem}…`
      : `Calculando métricas${sem}…`;
    return paso(texto) + SPINNER;
  }
};

PASOS.listo = PASOS.inactivo;

export function dialogo({dlg, titulo, cuerpo, botonCerrar, alFallar}){
  let ultimo = {fase: "inactivo"};

  function pintar(estado){
    ultimo = estado;
    titulo.textContent = TITULOS[estado.fase] || "Actualizando";
    cuerpo.innerHTML = (PASOS[estado.fase] || PASOS.inactivo)(estado);
    const c = cuerpo.querySelector('[data-accion="cancelar"]');
    if (c) c.onclick = () => api.cancelar().catch(e => alFallar(e.message));
    const s = cuerpo.querySelector('[data-accion="salir"]');
    if (s) s.onclick = () => dlg.close();
  }

  botonCerrar.onclick = () => dlg.close();

  return {
    abierto: () => dlg.open,
    cerrar: () => dlg.close(),
    abrir(estado = ultimo){
      if (!dlg.open) dlg.showModal();
      pintar(estado);
    },
    pintar(estado){ if (dlg.open) pintar(estado); },
    error(mensaje){
      if (!dlg.open) dlg.showModal();
      titulo.textContent = TITULOS.error;
      cuerpo.innerHTML = `<p class="error">${esc(mensaje)}</p>${acciones(salir)}`;
      cuerpo.querySelector('[data-accion="salir"]').onclick = () => dlg.close();
    }
  };
}

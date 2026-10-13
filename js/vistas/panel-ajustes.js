/* Ajustes: quien es staff, probar un aviso y desvincular el equipo. Antes
   eran dos botones en la barra (Staff y parte del panel de conexion); ahora
   es uno solo, porque nada de esto se mira todos los dias.

   La marca de staff es global: vale para todos los grupos y todas las
   semanas. Al cambiarla, el servidor recalcula las semanas ya analizadas. */
import {esc} from "../formato.js";
import {api} from "../api.js";
import {panel} from "./panel.js";

/* Consumo de Gemini (lib/consumo.js): promedio diario, por tarea y los ultimos dias. */
const usd = n => n < 0.01 && n > 0 ? "< US$0,01" : "US$" + n.toLocaleString("es-CO", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const miles = n => Math.round(n).toLocaleString("es-CO");
function bloqueConsumo(g){
  if (!g) return "";
  if (!g.dias) return `<h3>Consumo de Gemini</h3>
    <p class="meta">Todavía no hay registro. Se anota cada llamada a Gemini desde que se activó; aparece después de la próxima lectura.</p>`;
  const ultimos = g.porDia.slice(-7).reverse();
  return `<h3>Consumo de Gemini</h3>
    <p><b>${usd(g.promedioDia)}</b> por día en promedio
      <span class="meta">(${g.diasPromedio} ${g.diasPromedio === 1 ? "día" : "días"}${g.dias > g.diasPromedio ? " cerrados; hoy va aparte" : ""}).
      Total desde el ${new Date(g.desde + "T12:00:00").toLocaleDateString("es-CO")}: ${usd(g.total)}.</span></p>
    <table class="tabla-consumo"><thead><tr><th>Tarea</th><th>Llamadas</th><th>Tokens</th><th>Costo</th></tr></thead><tbody>
      ${g.porTarea.map(t => `<tr><td>${esc(t.nombre)}</td><td>${miles(t.llamadas)}</td><td>${miles(t.tokens)}</td><td>${usd(t.usd)}</td></tr>`).join("")}
    </tbody></table>
    <p class="meta">Últimos días: ${ultimos.map(d => `${esc(d.dia.slice(5))} ${usd(d.usd)}`).join(" · ")}<br>
      Precios de lista de ${esc(g.modelo)} (nivel pago). Si la clave está en el plan gratis, Google no cobra y esto es lo que costaría.
      No incluye luz del PC ni la SIM.</p>`;
}

export function panelAjustes({boton, caja, leerMeta, alCambiarStaff, alDesvincular, alFallar}){
  let staff = {marcado: [], lista: []};

  async function pintar(){
    caja.innerHTML = '<p class="meta">Cargando…</p>';
    let jug = {cargado: null, jugadores: 0};
    let gasto = null;
    try { [staff, jug, gasto] = await Promise.all([api.staff(), api.jugadores().catch(() => jug), api.consumo(30).catch(() => null)]); }
    catch (e){ caja.innerHTML = `<p class="error">${esc(e.message)}</p>`; return; }
    const meta = leerMeta() || {};

    const marcados = staff.marcado.length
      ? `<ul>${staff.marcado.map(p => `<li>
            <b>${esc(p.nombre || "Sin nombre")}</b>
            <span class="meta">${esc(p.tel || "")}</span>
            <button class="btn fantasma quitar-staff" data-autor="${esc(p.autor)}">Quitar</button>
          </li>`).join("")}</ul>`
      : '<p class="meta">Nadie marcado todavía. En Actividad, cada persona tiene un menú de tres puntos con <b>Marcar como staff</b>.</p>';

    caja.innerHTML = `
      <h3>Staff</h3>
      <p>Sus mensajes no cuentan como de usuarios y sirven para saber si una pregunta fue respondida. Vale para todos los grupos.</p>
      ${marcados}
      <p class="meta">Por nombre o teléfono: ${staff.lista.map(esc).join(" · ")}<br>Se edita en <code>config.json</code> &gt; <code>staff</code>.</p>
      <h3>Jugadores de la app</h3>
      <p class="meta">${jug.cargado ? `${jug.jugadores} jugadores, cargados el ${new Date(jug.cargado).toLocaleDateString("es-CO")}.` : "Todavía no se han cargado."}
        Sale del query de <code>Template Analythics/Jugadores con telefono.txt</code> en el chat de Analytics. Se cruzan por teléfono con la gente de los grupos (pestaña Personas) y quedan solo en este PC.</p>
      <p class="meta"><label class="btn fantasma">Cargar jugadores (CSV)<input type="file" accept=".csv,text/csv" class="cargar-jugadores" hidden></label>
        <span class="estado-jugadores"></span></p>
      ${bloqueConsumo(gasto)}
      <h3>Avisos</h3>
      <p class="meta">Salen como notificación de Windows${meta.ntfy ? " y en el celular (ntfy)" : ""}.
        <button class="btn fantasma" data-accion="probar">Probar aviso</button></p>
      ${meta.vinculado ? `<h3>Equipo</h3><p class="meta"><button class="btn fantasma" data-accion="desvincular">Desvincular este equipo</button></p>` : ""}`;

    caja.querySelectorAll(".quitar-staff").forEach(b => b.onclick = async () => {
      b.disabled = true;
      await alCambiarStaff({autor: b.getAttribute("data-autor"), quitar: true});
      pintar();
    });
    const archivo = caja.querySelector(".cargar-jugadores");
    if (archivo) archivo.onchange = async () => {
      const f = archivo.files[0];
      if (!f) return;
      const aviso = caja.querySelector(".estado-jugadores");
      aviso.textContent = "Cargando…";
      try {
        const r = await api.cargarJugadores(await f.text());
        aviso.textContent = `${r.jugadores} jugadores cargados${r.sinTelefono ? ` (${r.sinTelefono} sin teléfono: se cruzan por nombre)` : ""}.`;
        window.dispatchEvent(new CustomEvent("cm:jugadores"));
      } catch (e){ aviso.textContent = e.message; }
    };
    const probar = caja.querySelector('[data-accion="probar"]');
    if (probar) probar.onclick = () => api.probarAviso().catch(e => alFallar(e.message));
    const quitar = caja.querySelector('[data-accion="desvincular"]');
    if (quitar) quitar.onclick = () => {
      if (!window.confirm("¿Quitar Chatmanager de los dispositivos vinculados? La próxima vez habrá que escanear el QR y solo llegará historial reciente.")) return;
      p.cerrar();
      alDesvincular();
    };
  }

  const p = panel({boton, caja, pintar});
  return p;
}

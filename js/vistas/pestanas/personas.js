/* Personas: quien esta en los grupos y como va cada una. El directorio, quien
   esta en riesgo de irse, quien se fue y como estaba antes, quien viene
   subiendo y el cruce con los jugadores de la app.

   Los datos no vienen en el reporte: se piden aparte (traen nombres y
   telefonos, y no van a la copia publicada). */
import {esc, num, fecha} from "../../formato.js";
import {api} from "../../api.js";
import {PUBLICADO} from "../../foto.js";
import {tarjeta, cifra, vacio, verMas, chispa, tablaEn, mini} from "../piezas.js";
import {ESTADOS, ORDEN_ESTADOS, ANTES_DE_SALIR, textoBusqueda, csvPersonas} from "../../dominio/personas.js";

const VISIBLES = 12;
const cache = new Map();           // llave del periodo -> {promesa, datos, error}
// Al cargar jugadores en Ajustes, lo pedido ya no sirve.
window.addEventListener("cm:jugadores", () => cache.clear());
let verTodo = {personas: false, salidas: false, riesgo: false, fuera: false};
let filtro = {q: "", estado: ""};

const llave = ctx => `${ctx.reporte.desdeTs}|${ctx.reporte.hastaTs}|${ctx.ids.join(",")}`;
function pedir(ctx, forzar = false){
  const k = llave(ctx);
  if (forzar) cache.delete(k);
  if (!cache.has(k)){
    const e = {datos: null, error: null};
    e.promesa = api.personas({desdeTs: ctx.reporte.desdeTs, hastaTs: ctx.reporte.hastaTs, ids: ctx.ids})
      .then(d => { e.datos = d; }, err => { e.error = err.message; });
    cache.set(k, e);
  }
  return cache.get(k);
}

const pildora = estado => `<span class="pill estado-${estado}">${ESTADOS[estado].nombre}</span>`;
const nombreCon = p => `${esc(p.nombre)}${p.jugador ? ' <span class="pill" title="Nombre del jugador en la app">App</span>' : ""}`;
// El numero completo; sin numero, el nick que la persona se puso en WhatsApp.
const contacto = p => p.tel ? `<span class="nowrap">${esc(p.tel)}</span>`
  : p.nick ? `<span title="Nick de WhatsApp (no se sabe el número)">~${esc(p.nick)}</span>` : "—";
const hace = dias => dias == null ? "nunca" : dias === 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${num(dias)} días`;

function tablaPersonas(lista, {conGrupo}){
  if (!lista.length) return vacio("Nadie en los grupos elegidos para este período.");
  const max = Math.max(...lista.map(p => p.mensajes + p.reacciones), 1);
  const filas = lista.map((p, i) => {
    const tip = [p.nombreWhatsapp && p.nombreWhatsapp !== p.nombre ? `En WhatsApp: ${esc(p.nombreWhatsapp)}` : "",
      p.nick && p.nick !== p.nombre ? `Nick: ${esc(p.nick)}` : "", p.jugador ? `App: ${esc(p.jugador.compania)}${p.jugador.equipo ? " · " + esc(p.jugador.equipo) : ""}` : "",
      `Última actividad: ${hace(p.diasSin)}`].filter(Boolean).join("<br>");
    const menu = p.jugador ? "" : `<details class="menu-fila"><summary aria-label="Más opciones de ${esc(p.nombre)}">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="3.5" cy="8" r="1.4" fill="currentColor"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/><circle cx="12.5" cy="8" r="1.4" fill="currentColor"/></svg>
      </summary><div class="menu-fila-lista"><button class="btn fantasma poner-apodo" data-autor="${esc(p.autor)}" data-nombre="${esc(p.apodo || "")}">${p.apodo ? "Cambiar apodo" : "Poner apodo"}</button></div></details>`;
    return `<tr tabindex="0" data-tip="${esc(tip)}" data-fila="persona" data-estado="${p.estado}" data-texto="${esc(textoBusqueda(p))}"${i >= VISIBLES && !verTodo.personas ? " data-extra hidden" : ""}>
      <td>${nombreCon(p)}</td>
      <td class="meta">${contacto(p)}</td>
      ${conGrupo ? `<td class="meta">${esc(p.grupos.join(" · "))}</td>` : ""}
      <td>${pildora(p.estado)}</td>
      <td class="num">${mini(p.mensajes + p.reacciones, max, 40)}${num(p.mensajes)}</td>
      <td class="num">${num(p.reacciones)}</td>
      <td class="meta nowrap">${p.ultima ? fecha(p.ultima) : "—"}</td>
      <td class="con-menu">${menu}</td>
    </tr>`;
  }).join("");
  return tablaEn(`<table><thead><tr><th>Persona</th><th>Número o nick</th>${conGrupo ? "<th>Grupo</th>" : ""}<th>Estado</th>
    <th class="num">Mensajes</th><th class="num">Reacciones</th><th>Última vez</th><th></th></tr></thead><tbody>${filas}</tbody></table>`);
}

function tablaSimple(filas, columnas, limite){
  return tablaEn(`<table><thead><tr>${columnas.map(c => `<th${c.num ? ' class="num"' : ""}>${c.t}</th>`).join("")}</tr></thead>
    <tbody>${filas.slice(0, limite).join("")}</tbody></table>`);
}

function directorio(d, ctx){
  const c = d.cifras;
  const opciones = `<option value="">Todos los estados</option>` + ORDEN_ESTADOS
    .map(e => `<option value="${e}"${filtro.estado === e ? " selected" : ""}>${ESTADOS[e].nombre} (${num(c[e] || 0)})</option>`).join("");
  return tarjeta({
    titulo: "Personas",
    explica: "Todas las personas de los grupos elegidos, sin staff. Si se cargaron los jugadores de la app (Ajustes), sale su nombre de jugador. El globito trae el número y el nombre en WhatsApp.",
    acciones: `<span class="acciones-card"><button type="button" class="btn fantasma" data-accion="exportar">Exportar CSV</button>`
      + (d.personas.length > VISIBLES ? verMas(verTodo.personas, d.personas.length, "personas") : "") + "</span>",
    cuerpo: `<div class="cifras personas-cifras">
        ${cifra({titulo: "En el grupo", valor: num(c.total)})}
        ${cifra({titulo: "Activos", valor: num(c.activo), pie: c.total ? `${Math.round(c.activo / c.total * 100)}% del grupo` : "", explica: ESTADOS.activo.explica})}
        ${cifra({titulo: "Callados", valor: num(c.callado), explica: ESTADOS.callado.explica})}
        ${cifra({titulo: "En riesgo", valor: num(c.riesgo), tono: c.riesgo ? "alerta" : "", pie: c.riesgo ? `${d.riesgoDias} días o más sin actividad` : "", explica: ESTADOS.riesgo.explica})}
        ${cifra({titulo: "Salieron", valor: num(c.salio), tono: c.salio ? "down" : "", explica: "Estaban en el período y ya no están en el grupo."})}
      </div>
      <div class="filtros personas-filtros">
        <input type="search" class="buscar-persona" placeholder="Buscar por nombre o número" value="${esc(filtro.q)}" aria-label="Buscar persona">
        <select class="filtro-estado" aria-label="Filtrar por estado">${opciones}</select>
      </div>
      ${tablaPersonas(d.personas, {conGrupo: !ctx.uno})}`
  });
}

function riesgoYSalidas(d){
  const enRiesgo = d.personas.filter(p => p.estado === "riesgo").sort((a, b) => b.diasSin - a.diasSin);
  const r = d.resumenSalidas;
  const filasRiesgo = enRiesgo.map(p => `<tr tabindex="0" data-tip="${esc([p.tel, p.grupos.join(" · ")].filter(Boolean).join("<br>"))}">
    <td>${nombreCon(p)}</td><td class="num nowrap">${num(p.diasSin)} días</td></tr>`);
  const filasSalidas = d.salidas.map(s => `<tr tabindex="0" data-tip="${esc([s.tel, s.aprox ? "Fecha aproximada: se notó al comparar la lista de miembros entre dos lecturas." : ""].filter(Boolean).join("<br>"))}">
    <td class="meta nowrap">${fecha(s.ts)}${s.aprox ? "*" : ""}</td><td>${esc(s.nombre)}</td><td class="meta">${esc(s.grupo)}</td>
    <td>${ANTES_DE_SALIR[s.antes]}</td><td class="num">${s.dias == null ? "—" : (s.diasMinimo ? "≥" : "") + num(s.dias) + " d"}</td></tr>`);
  const resumen = r.n
    ? `<p class="meta">Antes de irse: callados ${num(r.callado)} · en riesgo ${num(r.riesgo)} · activos ${num(r.activo)}.`
      + (r.medianaDias != null ? ` Tiempo en el grupo (mediana): ${r.diasMinimo ? "al menos " : ""}${num(r.medianaDias)} días.` : "") + "</p>"
    : "";
  return `<div class="grid2">
    ${tarjeta({titulo: "En riesgo de salir",
      explica: `Personas que alguna vez participaron y llevan ${d.riesgoDias} días o más sin escribir ni reaccionar. Los que nunca han participado van como Callados.`,
      acciones: enRiesgo.length > 8 ? verMas(verTodo.riesgo, enRiesgo.length, "riesgo") : "",
      cuerpo: enRiesgo.length ? tablaSimple(filasRiesgo, [{t: "Persona"}, {t: "Sin actividad", num: true}], verTodo.riesgo ? enRiesgo.length : 8)
        : vacio("Nadie en riesgo en los grupos elegidos.")})}
    ${tarjeta({titulo: "Salidas del período",
      explica: "Quién se fue, cómo estaba antes de irse y cuánto duró en el grupo. Con * la fecha es aproximada. Con ≥, la persona ya estaba cuando Chatmanager empezó a guardar datos.",
      acciones: d.salidas.length > 8 ? verMas(verTodo.salidas, d.salidas.length, "salidas") : "",
      cuerpo: d.salidas.length ? resumen + tablaSimple(filasSalidas, [{t: "Cuándo"}, {t: "Persona"}, {t: "Grupo"}, {t: "Antes"}, {t: "Duró", num: true}], verTodo.salidas ? d.salidas.length : 8)
        : vacio("Nadie salió en este período.")})}
  </div>`;
}

function lideresYJugadores(d){
  const lideres = d.lideres.length
    ? `<ul class="lideres">${d.lideres.map(l => `<li tabindex="0" data-tip="${esc(`Últimas 8 semanas: ${l.serie.join(" · ")}`)}">
        <span><b>${esc(l.nombre)}</b><span class="meta">${esc(l.grupos.join(" · "))}</span></span>
        ${chispa(l.serie.map(v => ({v})), {ancho: 120, alto: 28})}
        <span class="meta nowrap">${l.crecimiento == null ? "nuevo" : `+${num(l.crecimiento)}%`}</span></li>`).join("")}</ul>`
    : vacio("Nadie viene subiendo de forma clara en las últimas 4 semanas.");

  let jugadores;
  const cr = d.cruce;
  if (!cr){
    jugadores = `<p class="meta">Para ver quién de los grupos juega en la app (y quién de la app no está en el grupo), corre en el chat de Analytics el query de
      <code>Template Analythics/Jugadores con telefono.txt</code> y carga el CSV en <b>Ajustes</b>.</p>`;
  } else {
    const filasNo = cr.noJugadores.map(p => `<tr tabindex="0" data-tip="${esc(p.tel || "")}"><td>${esc(p.nombre)}</td><td class="meta">${esc(p.grupos.join(" · "))}</td><td class="meta">${esc(p.motivo)}</td></tr>`);
    const filasFuera = cr.fuera.map(j => `<tr tabindex="0" data-tip="${esc(j.tel || "")}"><td>${esc(j.nombre)}</td><td class="meta">${esc(j.compania)}</td><td class="meta">${esc(j.equipo || "")}</td></tr>`);
    jugadores = `<p class="meta">${num(cr.cruzados)} de ${num(cr.presentes)} personas del grupo están en la app. Jugadores cargados el ${new Date(cr.cargado).toLocaleDateString("es-CO")}.</p>
      <h4>En el grupo sin jugador asociado <span class="meta">${num(cr.noJugadores.length)}</span></h4>
      ${filasNo.length ? tablaSimple(filasNo, [{t: "Persona"}, {t: "Grupo"}, {t: "Por qué"}], verTodo.fuera ? filasNo.length : 6) : vacio("Todos los del grupo son jugadores.")}
      <h4>Jugadores que no aparecen en el grupo <span class="meta">${num(cr.fuera.length)}</span></h4>
      ${filasFuera.length ? tablaSimple(filasFuera, [{t: "Jugador"}, {t: "Compañía"}, {t: "Equipo"}], verTodo.fuera ? filasFuera.length : 6) : vacio("Todos los jugadores de estas compañías están en el grupo.")}`;
  }
  const muchos = cr && (cr.noJugadores.length > 6 || cr.fuera.length > 6);
  return `<div class="grid2">
    ${tarjeta({titulo: "Futuros líderes",
      explica: "Personas que vienen subiendo: activas en al menos 3 de las últimas 4 semanas y con el doble de actividad en las 2 últimas que en las 2 anteriores. Sirve para elegir embajadores o premiar a quien se está enganchando.",
      cuerpo: lideres})}
    ${tarjeta({titulo: "Jugadores de la app",
      explica: "Cruce por nombre con los jugadores de las empresas activas (Analytics no da teléfonos): todas las palabras del nombre de WhatsApp, o del apodo, tienen que estar en el del jugador, dentro de la misma compañía. Quien solo sale con número no cruza; ponle un apodo con su nombre.",
      acciones: muchos ? verMas(verTodo.fuera, Math.max(cr.noJugadores.length, cr.fuera.length), "fuera") : "",
      cuerpo: jugadores})}
  </div>`;
}

export default {
  id: "personas",
  titulo: "Personas",

  html(ctx){
    if (PUBLICADO) return tarjeta({titulo: "Personas", cuerpo: vacio("Trae nombres y teléfonos: solo se ve en el PC del Chatmanager.")});
    const e = pedir(ctx);
    if (e.error) return tarjeta({titulo: "Personas", cuerpo: `<p class="error">${esc(e.error)}</p>`});
    if (!e.datos) return tarjeta({titulo: "Personas", cuerpo: vacio("Cargando…")});
    return `<div class="pila">${directorio(e.datos, ctx)}${riesgoYSalidas(e.datos)}${lideresYJugadores(e.datos)}</div>`;
  },

  enlazar(cont, ctx){
    if (PUBLICADO) return;
    const e = pedir(ctx);
    if (!e.datos && !e.error){
      const k = llave(ctx);
      e.promesa.then(() => { if (cache.get(k) === e) ctx.repintar(); });
      return;
    }
    if (!e.datos) return;

    // Buscar y filtrar sin repintar, para no perder el foco del buscador.
    const filas = [...cont.querySelectorAll('[data-fila="persona"]')];
    const aplicar = () => {
      const q = filtro.q.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
      const filtrando = !!(q || filtro.estado);
      let vistas = 0;
      filas.forEach(f => {
        const ok = (!filtro.estado || f.dataset.estado === filtro.estado) && (!q || f.dataset.texto.includes(q));
        const cabe = filtrando || verTodo.personas || vistas < VISIBLES;
        f.hidden = !(ok && cabe);
        if (ok) vistas++;
      });
    };
    const buscar = cont.querySelector(".buscar-persona");
    if (buscar) buscar.oninput = () => { filtro.q = buscar.value; aplicar(); };
    const estado = cont.querySelector(".filtro-estado");
    if (estado) estado.onchange = () => { filtro.estado = estado.value; aplicar(); };
    aplicar();

    ["personas", "salidas", "riesgo", "fuera"].forEach(k => {
      const b = cont.querySelector(`[data-accion="${k}"]`);
      if (b) b.onclick = () => { verTodo[k] = !verTodo[k]; ctx.repintar(); };
    });

    const exp = cont.querySelector('[data-accion="exportar"]');
    if (exp) exp.onclick = () => {
      const visibles = new Set(filas.filter(f => {
        const q = filtro.q.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
        return (!filtro.estado || f.dataset.estado === filtro.estado) && (!q || f.dataset.texto.includes(q));
      }).map(f => filas.indexOf(f)));
      const lista = e.datos.personas.filter((_, i) => visibles.has(i));
      const url = URL.createObjectURL(new Blob([csvPersonas(lista)], {type: "text/csv;charset=utf-8"}));
      const a = document.createElement("a");
      a.href = url;
      a.download = `personas-${ctx.reporte.desde || ""}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    };

    cont.querySelectorAll(".poner-apodo").forEach(b => b.onclick = async () => {
      const nuevo = window.prompt("Apodo para esta persona (vacío para quitarlo):", b.dataset.nombre || "");
      if (nuevo === null) return;
      b.disabled = true;
      try { await api.apodo(b.dataset.autor, nuevo); }
      catch (err){ window.alert(err.message); }
      cache.clear();
      ctx.repintar();
    });
  }
};

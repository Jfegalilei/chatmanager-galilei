/* El reporte: las pestanas y lo que hay dentro. No pide datos ni sabe de
   WhatsApp; recibe el reporte ya cargado y lo reparte entre las pestanas.

   Agregar una pestana es agregarla a la lista que llega por constructor: esta
   clase no se toca. */
import {esc, num, nombreGrupo} from "../formato.js";
import {sumar, comparacion} from "../dominio/agregado.js";
import {nombresDePeriodo} from "../dominio/etiquetas.js";
import {PUBLICADO} from "../foto.js";

export function vistaReporte({contenedor, pestanas, alMarcarStaff, alReanalizar, alReleer}){
  let activa = pestanas[0].id;
  let datos = null;         // {reporte, meta, grupoElegido}

  const cerrarMenus = (salvo = null) =>
    contenedor.querySelectorAll(".menu-fila[open]").forEach(d => { if (d !== salvo) d.open = false; });
  document.addEventListener("click", ev => { if (!ev.target.closest(".menu-fila")) cerrarMenus(); });
  document.addEventListener("keydown", ev => { if (ev.key === "Escape") cerrarMenus(); });
  window.addEventListener("scroll", () => cerrarMenus(), {passive: true, capture: true});
  window.addEventListener("resize", () => cerrarMenus());

  function contexto(){
    const {reporte, meta, grupoElegido} = datos;
    const ids = grupoElegido ? [grupoElegido] : Object.keys(reporte.grupos);
    const total = sumar(ids.map(id => ({...reporte.grupos[id], grupoId: id})));
    return {
      reporte, meta, ids, total,
      uno: ids.length === 1 ? reporte.grupos[ids[0]] : null,
      comp: comparacion(reporte, ids, total),
      nombres: nombresDePeriodo(reporte.periodo),
      periodo: reporte.periodo || null,
      repintar: pintar,
      irA
    };
  }

  function navegacion(ctx){
    return `<nav class="pestanas" role="tablist">${pestanas.map(p => {
      const n = p.insignia ? p.insignia(ctx) : null;
      return `<button type="button" role="tab" data-pestana="${p.id}" aria-selected="${p.id === activa}">
        ${esc(p.titulo)}${n ? `<span class="insignia">${num(n)}</span>` : ""}
      </button>`;
    }).join("")}</nav>`;
  }

  function pieDePagina(ctx){
    const generado = new Date(ctx.reporte.generado).toLocaleString("es-CO");
    if (ctx.periodo) return `<p class="pie">Generado ${generado} · ${esc(ctx.periodo.etiqueta)}, sumando las semanas guardadas</p>`;
    if (PUBLICADO) return `<p class="pie">Generado ${generado}</p>`;
    return `<p class="pie">Generado ${generado} ·
      <button class="btn fantasma" data-accion="reanalizar">Recalcular</button> ·
      <button class="btn fantasma" data-accion="releer">Releer en WhatsApp</button></p>`;
  }

  function pintar(){
    if (!datos) return;
    const ctx = contexto();
    const pestana = pestanas.find(p => p.id === activa) || pestanas[0];
    contenedor.innerHTML = navegacion(ctx)
      + `<div class="panel-pestana" role="tabpanel">${pestana.html(ctx)}</div>`
      + pieDePagina(ctx);

    contenedor.querySelectorAll("[data-pestana]").forEach(b => b.onclick = () => irA(b.getAttribute("data-pestana")));
    contenedor.querySelectorAll("[data-ir]").forEach(el => {
      const ir = () => irA(el.getAttribute("data-ir"));
      el.onclick = ir;
      el.onkeydown = ev => { if (ev.key === "Enter" || ev.key === " "){ ev.preventDefault(); ir(); } };
    });
    // El menu de cada fila (tablas.js): uno abierto a la vez, pegado a la
    // ventana porque la tabla recorta lo que se sale de ella.
    contenedor.querySelectorAll(".menu-fila").forEach(d => d.ontoggle = () => {
      if (!d.open) return;
      cerrarMenus(d);
      const r = d.querySelector("summary").getBoundingClientRect(), lista = d.querySelector(".menu-fila-lista");
      lista.style.top = `${r.bottom + 4}px`;
      lista.style.right = `${window.innerWidth - r.right}px`;
    });
    contenedor.querySelectorAll(".marcar-staff").forEach(b => b.onclick = () => {
      cerrarMenus();
      const quien = b.getAttribute("data-nombre");
      if (!window.confirm(`¿Marcar a ${quien} como staff? Deja de contar como usuaria en todos los grupos y en todas las semanas.`)) return;
      b.disabled = true;
      alMarcarStaff({autor: b.getAttribute("data-autor"), nombre: quien, tel: b.getAttribute("data-tel") || null});
    });
    const rean = contenedor.querySelector('[data-accion="reanalizar"]');
    if (rean) rean.onclick = () => alReanalizar(ctx.reporte.semana);
    const releer = contenedor.querySelector('[data-accion="releer"]');
    if (releer) releer.onclick = () => alReleer(ctx.reporte.semana);

    const pest = pestanas.find(p => p.id === activa);
    if (pest && pest.enlazar) pest.enlazar(contenedor.querySelector(".panel-pestana"), ctx);
  }

  function irA(id){
    if (!pestanas.some(p => p.id === id)) return;
    activa = id;
    pintar();
    contenedor.scrollIntoView({block: "start", behavior: "smooth"});
  }

  return {
    mostrar(nuevos){ datos = nuevos; pintar(); },
    pintar,
    irA,
    vacio(html){ datos = null; contenedor.innerHTML = html; },
    // Nombre del grupo elegido, para los titulos de la barra.
    etiquetaGrupo(){
      if (!datos || !datos.grupoElegido) return "Todos los grupos";
      const g = datos.reporte.grupos[datos.grupoElegido];
      return g ? nombreGrupo(g.nombre) : "Todos los grupos";
    }
  };
}

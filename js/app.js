/* Chatmanager, la pagina. Este archivo solo arma las piezas y las conecta:
   quien pide los datos (api.js), quien decide que es importante (dominio/),
   quien lo pinta (vistas/) y quien trae el estado en vivo (estado-vivo.js).

   Sin dependencias externas y sin build: son modulos ES que el navegador
   carga tal cual. */
import {api, reporteDe, usarFoto} from "./api.js";
import {PUBLICADO, abrirFoto} from "./foto.js";
import {esc, nombreGrupo} from "./formato.js";
import {estadoVivo} from "./estado-vivo.js";
import {instalarTip} from "./vistas/tip.js";
import {vistaReporte} from "./vistas/reporte.js";
import {dialogo} from "./vistas/dialogo.js";
import {panelConexion} from "./vistas/panel-conexion.js";
import {panelAjustes} from "./vistas/panel-ajustes.js";
import {selectorPeriodo} from "./vistas/selector-periodo.js";
import {tema} from "./vistas/tema.js";
import resumen from "./vistas/pestanas/resumen.js";
import actividad from "./vistas/pestanas/actividad.js";
import dudas from "./vistas/pestanas/dudas.js";
import contenidos from "./vistas/pestanas/contenidos.js";
import personas from "./vistas/pestanas/personas.js";
import oraculo from "./vistas/pestanas/oraculo.js";

const $ = id => document.getElementById(id);
const EN_MARCHA = fase => !["inactivo", "listo", "error"].includes(fase);

let meta = null;

/* ---------- las piezas ---------- */
instalarTip();
const vivo = estadoVivo();

const dlg = dialogo({
  dlg: $("dlg"), titulo: $("dlgTitulo"), cuerpo: $("dlgCuerpo"), botonCerrar: $("dlgCerrar"),
  alFallar: m => dlg.error(m)
});

const vista = vistaReporte({
  contenedor: $("reporte"),
  pestanas: [resumen, actividad, personas, dudas, contenidos, oraculo],
  alMarcarStaff: marcarStaff,
  alReanalizar: semana => api.reanalizar(semana).catch(e => dlg.error(e.message)),
  alReleer: semana => actualizar({semana})
});

const conexion = panelConexion({
  boton: $("btnConexion"), caja: $("panelConexion"), texto: $("conexionTexto"), leerEstado: vivo.actual
});

panelAjustes({
  boton: $("btnAjustes"), caja: $("panelAjustes"),
  leerMeta: () => meta,
  alCambiarStaff: marcarStaff,
  alDesvincular: () => api.desvincular().then(() => dlg.abrir(vivo.actual())).catch(e => dlg.error(e.message)),
  alFallar: m => dlg.error(m)
});

tema({boton: $("btnTema")});

const periodo = selectorPeriodo({caja: $("periodo"), alCambiar: v => cargarReporte(v)});

/* ---------- cargar ---------- */
async function cargarMeta(){
  meta = await api.periodos();
  const valor = periodo.cargar(meta);
  pintarBoton();
  if (!valor){
    vista.vacio('<p class="vacio">Todavía no hay reportes. Usa <b>Actualizar</b> para leer los grupos.</p>');
    return;
  }
  return cargarReporte(valor);
}

async function cargarReporte(clave){
  const caja = $("reporte");
  caja.style.opacity = .5;
  try {
    const reporte = await reporteDe(clave);
    const sel = $("selGrupo"), antes = sel.value;
    const ids = Object.keys(reporte.grupos)
      .sort((a, b) => nombreGrupo(reporte.grupos[a].nombre).localeCompare(nombreGrupo(reporte.grupos[b].nombre)));
    sel.innerHTML = '<option value="">Todos los grupos</option>'
      + ids.map(id => `<option value="${esc(id)}">${esc(nombreGrupo(reporte.grupos[id].nombre))}</option>`).join("");
    sel.value = reporte.grupos[antes] ? antes : "";
    vista.mostrar({reporte, meta, grupoElegido: sel.value});
  } catch (e){
    vista.vacio(`<p class="vacio error">${esc(e.message)}</p>`);
  } finally {
    caja.style.opacity = 1;
  }
}

async function marcarStaff(persona){
  try {
    await api.marcarStaff(persona);
    await cargarReporte(periodo.valor());
  } catch (e){ dlg.error(e.message); }
}

/* ---------- actualizar ---------- */
const hayQueVincular = () => !(meta && meta.vinculado) || (vivo.actual().conexion || {}).estado === "necesita-qr";

function actualizar(cuerpo){
  return api.actualizar(cuerpo || {}).catch(e => dlg.error(e.message));
}

function pintarBoton(){
  const b = $("btnGenerar");
  const estado = vivo.actual();
  const marcha = EN_MARCHA(estado.fase);
  b.disabled = marcha;
  b.textContent = !marcha
    ? (hayQueVincular() ? "Vincular WhatsApp" : "Actualizar")
    : estado.fondo ? "Poniéndose al día…" : "Actualizando…";
}

$("btnGenerar").onclick = () => {
  if (EN_MARCHA(vivo.actual().fase)) return;
  if (hayQueVincular()) dlg.abrir(vivo.actual());
  actualizar();
};
$("selGrupo").onchange = () => cargarReporte(periodo.valor());

/* ---------- reaccionar al estado en vivo ---------- */
vivo.suscribir((estado, previo) => {
  const antes = previo.fase;

  if (antes !== "listo" && estado.fase === "listo") cargarMeta();
  // Una lectura de fondo termino: recargar solo si afecta a lo que se esta viendo.
  if (estado.fondo && antes === "analizando" && estado.fase === "inactivo"){
    cargarMeta().then(() => {
      const v = periodo.valor();
      if (v && (!v.startsWith("s:") || (estado.analizadas || []).includes(v.slice(2)))) cargarReporte(v);
    });
  }
  if (previo.recalculando && !estado.recalculando) cargarMeta();
  if (antes === "desvinculando" && estado.fase === "inactivo") cargarMeta().then(() => dlg.pintar(estado));

  conexion.actualizar();
  pintarBoton();

  dlg.pintar(estado);
  if (dlg.abierto() && antes !== estado.fase && ["listo", "inactivo"].includes(estado.fase)) dlg.cerrar();
  if (!dlg.abierto() && ["qr", "error"].includes(estado.fase) && (!estado.fondo && antes !== estado.fase || estado.fase === "qr")){
    dlg.abrir(estado);
  }
});

/* La copia publicada primero pide la clave y descifra; lo demas es igual. */
async function arrancar(){
  if (PUBLICADO){
    conexion.actualizar();

    const foto = await abrirFoto($("reporte"));
    usarFoto(foto);
    vivo.fijar({conexion: {estado: "publicado", publicado: foto["/api/semanas"].publicado}});
  }
  return cargarMeta();
}

arrancar().catch(e => vista.vacio(`<p class="vacio error">${esc(e.message)}</p>`));

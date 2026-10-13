/* Las cuentas del reporte: sumar los grupos elegidos, comparar con el periodo
   anterior y armar las series. Son funciones puras -entra un reporte, sale un
   objeto-, sin DOM ni fetch, para poder razonarlas (y probarlas) solas. */
import {DIAS, nombreGrupo} from "../formato.js";
import {esDuda} from "./dudas.js";

export function sumar(lista){
  const t = {
    mensajesUsuarios: 0, mensajesStaff: 0, reacciones: 0, activos: 0, callados: null, participantes: null,
    altas: 0, bajas: 0, porDia: [0, 0, 0, 0, 0, 0, 0], calor: [], familias: {}, temas: {}, emociones: {}, conEmocion: [],
    preguntas: [], ranking: [], tonos: {positivo: 0, neutral: 0, negativo: 0}, tiempos: []
  };
  for (let i = 0; i < 7; i++) t.calor.push(new Array(24).fill(0));
  const porStaff = {};

  lista.forEach(g => {
    t.mensajesUsuarios += g.mensajesUsuarios;
    t.mensajesStaff += g.mensajesStaff;
    t.reacciones += g.reacciones;
    t.activos += g.activos;
    t.altas += g.altas;
    t.bajas += g.bajas;
    if (g.callados != null) t.callados = (t.callados || 0) + g.callados;
    if (g.participantes != null) t.participantes = (t.participantes || 0) + g.participantes;
    g.porDia.forEach((v, d) => t.porDia[d] += v);
    g.calor.forEach((fila, d) => fila.forEach((v, h) => t.calor[d][h] += v));
    Object.keys(g.familias || {}).forEach(k => t.familias[k] = (t.familias[k] || 0) + g.familias[k]);
    Object.keys(g.temas || {}).forEach(k => t.temas[k] = (t.temas[k] || 0) + g.temas[k]);
    Object.keys(g.tonos || {}).forEach(k => t.tonos[k] += g.tonos[k]);
    Object.entries(g.emociones || {}).forEach(([k, e]) => {
      const acum = t.emociones[k] || (t.emociones[k] = {leve: 0, basica: 0, intensa: 0});
      Object.keys(acum).forEach(i => acum[i] += e[i] || 0);
    });
    g.preguntas.forEach(p => t.preguntas.push({grupo: g.nombre, grupoId: g.grupoId, ...p}));
    (g.conEmocion || []).forEach(m => t.conEmocion.push({grupo: g.nombre, grupoId: g.grupoId, ...m}));
    g.ranking.forEach(p => t.ranking.push({grupo: g.nombre, ...p}));
    // La misma persona del staff atiende varios grupos: se suma por persona.
    (g.porStaff || []).forEach(s => {
      const a = porStaff[s.autor] || (porStaff[s.autor] = {autor: s.autor, nombre: s.nombre, tel: s.tel, mensajes: 0, respondidas: 0, tiempos: [], grupos: []});
      a.nombre = a.nombre || s.nombre;
      a.mensajes += s.mensajes;
      a.respondidas += s.respondidas;
      a.tiempos.push(...s.tiempos);
      if (s.mensajes) a.grupos.push(g.nombre);
    });
  });
  t.staff = Object.values(porStaff).map(s => {
    const ts = [...s.tiempos].sort((a, b) => a - b);
    return {...s, mediana: ts.length ? ts[Math.floor(ts.length / 2)] : null};
  }).sort((a, b) => b.respondidas - a.respondidas || b.mensajes - a.mensajes);

  t.ranking.sort((a, b) => b.mensajes - a.mensajes);
  t.ranking = t.ranking.slice(0, 10);
  t.preguntas.sort((a, b) => b.ts - a.ts);

  /* Solo las dudas cuentan: lo que se preguntan entre ellos no es deuda del
     staff, ni para el conteo ni para el tiempo de respuesta. */
  t.dudas = t.preguntas.filter(esDuda);
  t.charla = t.preguntas.length - t.dudas.length;
  t.tiempos = t.dudas.filter(p => p.minutos != null).map(p => p.minutos).sort((a, b) => a - b);
  t.mediana = t.tiempos.length ? t.tiempos[Math.floor(t.tiempos.length / 2)] : null;
  t.sinResponder = t.dudas.filter(p => !p.respondida).length;
  return t;
}

// Lo que habia en el periodo anterior, para los deltas.
function previo(reporte){
  if (reporte.previo) return reporte.previo;
  const tend = reporte.tendencia || [];
  return tend.length >= 2 ? tend[tend.length - 2].porGrupo : null;
}

const sumaPrevia = (prev, ids, campo) =>
  prev ? ids.reduce((n, id) => n + ((prev[id] || {})[campo] || 0), 0) : null;

/* Variacion contra el periodo anterior. Devuelve null cuando no hay con que
   comparar, para que la vista no tenga que adivinar. */
export function variacion(ahora, antes){
  if (antes == null || !antes) return null;
  const pct = Math.round((ahora - antes) / antes * 100);
  return {pct, sube: pct >= 0};
}

/* Si un dato mejoro, empeoro o se mantuvo frente al periodo anterior.
   `mejorSiSube` dice hacia donde es bueno; un cambio de hasta el 5% cuenta
   como "se mantuvo" (que tambien puede ser bueno). null = sin con que comparar. */
const TOLERANCIA = 5;
export function cambio(ahora, antes, {mejorSiSube = true} = {}){
  if (ahora == null || antes == null) return null;
  if (ahora === antes) return {estado: "igual", ahora, antes, pct: 0, sube: false};
  const pct = antes ? Math.round((ahora - antes) / antes * 100) : null;
  if (pct != null && Math.abs(pct) <= TOLERANCIA) return {estado: "igual", ahora, antes, pct, sube: pct > 0};
  const sube = ahora > antes;
  return {estado: sube === mejorSiSube ? "mejor" : "peor", ahora, antes, pct, sube};
}

const mediana = lista => {
  if (!lista.length) return null;
  const o = [...lista].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)];
};

export function comparacion(reporte, ids, total){
  const prev = previo(reporte);
  /* Las semanas viejas solo traen mensajes y activos del periodo anterior;
     el resto queda sin comparar (null) en vez de compararse contra cero. */
  const completo = prev && ids.some(id => prev[id] && prev[id].reacciones !== undefined);
  const antes = campo => completo ? sumaPrevia(prev, ids, campo) : null;
  const tasa = (callados, miembros) => callados == null || !miembros ? null : callados / miembros;
  const callAntes = completo ? ids.reduce((n, id) => n + ((prev[id] || {}).callados || 0), 0) : null;
  const partAntes = completo ? ids.reduce((n, id) => n + ((prev[id] || {}).participantes || 0), 0) : null;
  return {
    mensajes: variacion(total.mensajesUsuarios, sumaPrevia(prev, ids, "mensajes")),
    activos: variacion(total.activos, sumaPrevia(prev, ids, "activos")),
    tira: {
      mediana: cambio(total.mediana, completo ? mediana(ids.flatMap(id => (prev[id] || {}).tiempos || [])) : null, {mejorSiSube: false}),
      charla: cambio(total.charla, antes("charla")),
      // Callados como parte del grupo: si entra gente, mas callados no es peor.
      callados: cambio(tasa(total.callados, total.participantes), tasa(callAntes, partAntes), {mejorSiSube: false}),
      altas: cambio(total.altas, antes("altas")),
      bajas: cambio(total.bajas, antes("bajas"), {mejorSiSube: false}),
      mensajesStaff: cambio(total.mensajesStaff, antes("mensajesStaff")),
      reacciones: cambio(total.reacciones, antes("reacciones"))
    }
  };
}

/* La curva del periodo sumando los grupos elegidos. Todos los grupos de un
   reporte comparten el mismo rango, asi que los puntos se suman por posicion. */
export function serieDe(reporte, ids){
  const series = ids.map(id => reporte.grupos[id].serie).filter(Boolean);
  if (!series.length) return null;
  const n = Math.max(...series.map(s => s.puntos.length));
  const puntos = Array.from({length: n}, (_, i) => series.reduce((t, s) => {
    const p = s.puntos[i];
    if (p){ t.m += p.m; t.a += p.a; }
    return t;
  }, {m: 0, a: 0}));
  return {desdeTs: series[0].desdeTs, paso: series[0].paso, puntos};
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const diaMes = d => `${d.getDate()} ${MESES[d.getMonth()]}`;

// Lunes de una semana ISO ("2026-W40" -> 28 sep 2026), en hora local.
export function lunesDeSemana(clave){
  const [ano, w] = clave.split("-W").map(Number);
  const jan4 = new Date(ano, 0, 4);
  return new Date(ano, 0, 4 - ((jan4.getDay() + 6) % 7) + (w - 1) * 7);
}

const MESES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/* Fecha de cada punto de una serie (por dia o por mes calendario), con su
   rotulo corto para el eje y el largo para el globito. */
export function fechaDePunto(serie, i){
  const d0 = new Date(serie.desdeTs * 1000);
  if (serie.paso === "mes"){
    const d = new Date(d0.getFullYear(), d0.getMonth() + i, 1);
    return {etq: MESES[d.getMonth()], largo: `${MESES_LARGO[d.getMonth()]} ${d.getFullYear()}`};
  }
  const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i * serie.paso);
  return {etq: diaMes(d), largo: `${DIAS_LARGO[d.getDay()]} ${diaMes(d)}`};
}

// La serie del periodo como puntos de la tendencia (mes: por dia; ano: por mes).
export const puntosDeSerie = serie => serie.puntos.map((p, i) => {
  const f = fechaDePunto(serie, i);
  return {v: p.m, etq: f.etq, rango: f.largo};
});

/* Mensajes de usuarios por semana, para la tendencia. Cada punto se rotula
   con la fecha del lunes ("28 sep") y el globito lleva la semana completa. */
export function puntosTendencia(reporte, ids){
  return (reporte.tendencia || []).map(s => {
    const lunes = lunesDeSemana(s.semana);
    const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
    return {
      v: ids.reduce((n, id) => n + ((s.porGrupo[id] || {}).mensajes || 0), 0),
      etq: diaMes(lunes),
      rango: `Semana del ${diaMes(lunes)} – ${diaMes(domingo)} ${domingo.getFullYear()}`
    };
  });
}

/* Que parte de los miembros deberia escribir para hablar de un grupo
   enganchado. Sale de la regla 90-9-1 (en una comunidad normal escribe ~10%)
   y de los referentes de comunidades de empresa (15-30% activos al mes); se
   pide un poco mas porque son grupos con un proposito. Crece con el largo del
   periodo, pero no en proporcion: por eso va un umbral por tipo. */
export const UMBRALES = {
  semana: {bajo: 10, ideal: 20},
  mes: {bajo: 20, ideal: 35},
  ano: {bajo: 30, ideal: 50}
};
// Si el 10% mas activo hace mas que esto, el grupo depende de pocos.
export const CONCENTRADO = 70;

export const umbralDe = periodo => UMBRALES[(periodo && periodo.tipo) || "semana"] || UMBRALES.semana;

/* Participacion por grupo: personas que escribieron / miembros. Los grupos sin
   lista de miembros no tienen porcentaje y van al final. */
export function filasPorGrupo(reporte, ids){
  const u = umbralDe(reporte.periodo);
  return ids
    .map(id => {
      const g = reporte.grupos[id];
      const pct = g.miembros && g.escribieron != null ? Math.min(100, g.escribieron / g.miembros * 100) : null;
      return {
        id, n: nombreGrupo(g.nombre), v: pct,
        tono: pct == null ? "" : pct >= u.ideal ? "ok" : pct < u.bajo ? "bajo" : "",
        escribieron: g.escribieron, miembros: g.miembros,
        mensajes: g.mensajesUsuarios, concentracion: g.concentracion,
        concentrado: g.concentracion != null && g.concentracion > CONCENTRADO
      };
    })
    .sort((a, b) => (b.v ?? -1) - (a.v ?? -1) || b.mensajes - a.mensajes);
}

export const filasPorDia = total => total.porDia.map((v, d) => ({n: DIAS[d], v}));

// Cuenta por categoria, ordenada y sin los ceros.
export function filasPorCategoria(cuentas, etiquetas){
  return Object.keys(etiquetas)
    .map(k => ({k, n: etiquetas[k], v: cuentas[k] || 0}))
    .filter(f => f.v)
    .sort((a, b) => b.v - a.v);
}

/* Hacia donde apunta el chat en la rueda de Plutchik. Cada mensaje pesa por su
   intensidad (leve 1, basica 2, intensa 3): diez "jaja" no pesan lo que diez
   "GANEEE!!". `pct` es la parte de cada emocion en el total, e `intensidad`
   su intensidad media, de 1 (todo leve) a 3 (todo intenso): con eso se llena
   cada petalo, sin depender de los demas. */
const PESO = {leve: 1, basica: 2, intensa: 3};
export function perfilEmocional(emociones, orden){
  const filas = orden.map(k => {
    const e = emociones[k] || {leve: 0, basica: 0, intensa: 0};
    const mensajes = e.leve + e.basica + e.intensa;
    const puntos = e.leve * PESO.leve + e.basica * PESO.basica + e.intensa * PESO.intensa;
    return {k, ...e, mensajes, puntos, intensidad: mensajes ? puntos / mensajes : 0};
  });
  const total = filas.reduce((n, f) => n + f.puntos, 0);
  const max = Math.max(...filas.map(f => f.puntos), 0);
  filas.forEach(f => { f.pct = total ? f.puntos / total * 100 : 0; });
  const dominante = max ? filas.find(f => f.puntos === max) : null;
  return {filas, dominante, mensajes: filas.reduce((n, f) => n + f.mensajes, 0)};
}

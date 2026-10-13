/* Los estados de una persona y como se escriben. Las reglas que los deciden
   viven en el servidor (analisis/personas.js); aqui solo los nombres. */
export const ESTADOS = {
  activo: {nombre: "Activo", explica: "Escribió o reaccionó en el período."},
  inactivo: {nombre: "Inactivo", explica: "No hizo nada en el período, pero sí hace menos de 21 días."},
  riesgo: {nombre: "En riesgo", explica: "Alguna vez participó y lleva 21 días o más sin escribir ni reaccionar."},
  callado: {nombre: "Callado", explica: "Está en el grupo y nunca ha escrito ni reaccionado."},
  salio: {nombre: "Salió", explica: "Ya no está en el grupo."}
};
export const ORDEN_ESTADOS = ["activo", "inactivo", "riesgo", "callado", "salio"];

export const ANTES_DE_SALIR = {callado: "callado", riesgo: "en riesgo", activo: "activo"};

// El texto con el que se busca a alguien: nombre, numero, grupo y jugador.
export const textoBusqueda = p => [p.nombre, p.nombreWhatsapp, p.apodo, p.tel, p.nick, ...(p.grupos || []),
  p.jugador && p.jugador.nombre, p.jugador && p.jugador.equipo].filter(Boolean).join(" ")
  .normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// CSV de lo que se ve, para abrir en Excel (punto y coma, con BOM).
export function csvPersonas(lista){
  const c = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const fecha = ts => ts ? new Date(ts * 1000).toISOString().slice(0, 10) : "";
  const filas = [["Nombre", "Nombre en WhatsApp", "Telefono", "Nick", "Player id", "Compania (app)", "Equipo (app)", "Grupos", "Estado", "Mensajes", "Reacciones", "Ultima actividad", "Dias sin actividad"]]
    .concat(lista.map(p => [p.nombre, p.nombreWhatsapp, p.tel, p.nick, p.jugador && p.jugador.playerId, p.jugador && p.jugador.compania,
      p.jugador && p.jugador.equipo, (p.grupos || []).join(" / "), ESTADOS[p.estado].nombre, p.mensajes, p.reacciones,
      fecha(p.ultima), p.diasSin]));
  return "﻿" + filas.map(f => f.map(c).join(";")).join("\r\n");
}

/* Los nombres que ve la gente. Estan juntos para poder cambiar una palabra
   sin abrir ninguna vista. */

export const TEMAS = {
  participa_reto: "Participa en reto",
  duda_app: "Duda sobre la app",
  queja: "Queja",
  agradecimiento: "Agradecimiento",
  celebracion: "Celebración",
  saludo_social: "Saludo / social",
  otro: "Otro"
};

export const FAMILIAS = {
  reclamar: "Reclamar y redimir",
  dinamicas: "Dinámicas y lotería",
  entrega: "Entrega y pago",
  economia: "Economía del juego",
  acceso: "Acceso y soporte",
  niveles: "Niveles y metas",
  otra: "No es sobre la app"
};

/* Rueda de Plutchik en su orden (cada una enfrenta a su opuesta). El color es
   un token de app.css para que el modo oscuro tenga el suyo. */
export const EMOCIONES = {
  alegria: {nombre: "Alegría", leve: "Serenidad", intensa: "Éxtasis"},
  confianza: {nombre: "Confianza", leve: "Aceptación", intensa: "Admiración"},
  miedo: {nombre: "Miedo", leve: "Aprensión", intensa: "Terror"},
  sorpresa: {nombre: "Sorpresa", leve: "Distracción", intensa: "Asombro"},
  tristeza: {nombre: "Tristeza", leve: "Melancolía", intensa: "Pena"},
  aversion: {nombre: "Aversión", leve: "Aburrimiento", intensa: "Repugnancia"},
  ira: {nombre: "Ira", leve: "Molestia", intensa: "Furia"},
  anticipacion: {nombre: "Anticipación", leve: "Interés", intensa: "Vigilancia"}
};

/* Diadas primarias de Plutchik: lo que forman dos emociones vecinas de la
   rueda. La clave es la de la primera; la segunda es la siguiente en EMOCIONES. */
export const DIADAS = {
  alegria: "Amor", confianza: "Sumisión", miedo: "Susto", sorpresa: "Desaprobación",
  tristeza: "Remordimiento", aversion: "Desprecio", ira: "Agresividad", anticipacion: "Optimismo"
};

export const CONEXION = {
  conectado: "Al día",
  conectando: "Conectando…",
  desconectado: "Sin conexión",
  "necesita-qr": "Hay que escanear el QR",
  "sin-vinculo": "Sin vincular",
  publicado: "Copia de solo lectura"
};

export const EXPLICA_CONEXION = {
  conectado: "Chatmanager está vinculado y recibe los mensajes de los grupos Galilei a medida que llegan. Relee cada 30 minutos y arma solo el reporte cuando cierra la semana.",
  conectando: "Abriendo WhatsApp Web con la sesión guardada.",
  "necesita-qr": "WhatsApp desvinculó este equipo. Usa Actualizar para escanear el QR desde el celular de la SIM.",
  "sin-vinculo": "Todavía no hay un WhatsApp vinculado. Usa Actualizar para escanear el QR.",
  publicado: "Es una copia del reporte. Se actualiza sola cada vez que el PC del Chatmanager lee los grupos; si ese PC está apagado, muestra lo último que se subió."
};

// Como se llama el periodo anterior segun lo que se este mirando.
export function nombresDePeriodo(periodo){
  const tipo = periodo && periodo.tipo;
  if (tipo === "mes") return {anterior: "mes anterior", este: "este mes"};
  if (tipo === "ano") return {anterior: "año anterior", este: "este año"};
  return {anterior: "semana anterior", este: "esta semana"};
}

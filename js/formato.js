/* Como se escriben las cosas: numeros, fechas, nombres. No pinta nada ni
   sabe de datos; solo convierte a texto. */

export const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const ENTIDADES = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"};

export function esc(s){
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ENTIDADES[c]);
}

export const num = n => n == null ? "–" : Number(n).toLocaleString("es-CO");

const dosCifras = n => String(n).padStart(2, "0");

export function fecha(ts, conHora){
  const d = new Date(ts * 1000);
  const s = `${DIAS[(d.getDay() + 6) % 7]} ${d.getDate()}/${d.getMonth() + 1}`;
  return conHora ? `${s} ${dosCifras(d.getHours())}:${dosCifras(d.getMinutes())}` : s;
}

export function hora(ms){
  const d = new Date(ms);
  return `${dosCifras(d.getHours())}:${dosCifras(d.getMinutes())}`;
}

export function cuando(ms){
  const hoy = new Date(ms).toDateString() === new Date().toDateString();
  return `${hoy ? "hoy" : fecha(ms / 1000)} ${hora(ms)}`;
}

// 45 -> "45 min"; 150 -> "2,5 h"
export function duracion(minutos){
  if (minutos == null) return "–";
  return minutos < 60 ? `${minutos} min` : `${(minutos / 60).toFixed(1).replace(".", ",")} h`;
}

export const decimal = (n, cifras = 2) => n == null ? "–" : n.toFixed(cifras).replace(".", ",");

// "Galilei | Niku" -> "Niku"
export const nombreGrupo = n => String(n || "").replace(/^Galilei\s*[_|-]\s*/i, "");

export const porcentaje = p => `${p >= 0 ? "+" : ""}${p}%`;

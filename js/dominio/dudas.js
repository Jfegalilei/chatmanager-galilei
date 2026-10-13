/* Duda o charla, del lado de la página.

   Quien decide de verdad es el servidor (`analisis/dudas.js`), que guarda
   `duda` en cada pregunta. Pero un reporte generado antes de que existiera el
   filtro no trae ese campo: ahí se decide por la familia, que ya distingue
   "otra" = no es sobre la app. Así una semana vieja se ve razonable sin tener
   que reclasificarla con Gemini. */

export const esDuda = p => p.duda !== undefined ? !!p.duda : !!(p.familia && p.familia !== "otra");

export const esCharla = p => !esDuda(p);

// Los tres baldes de la pestaña, en el orden en que se muestran.
export const BALDES = [
  {id: "pendientes", titulo: "Sin responder", filtra: ps => ps.filter(p => esDuda(p) && !p.respondida)},
  {id: "dudas", titulo: "Dudas", filtra: ps => ps.filter(esDuda)},
  {id: "charla", titulo: "Entre ellos", filtra: ps => ps.filter(esCharla)}
];

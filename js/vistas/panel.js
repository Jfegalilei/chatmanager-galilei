/* Un menu que cuelga de un boton. Antes esto estaba escrito dos veces (una
   para la conexion y otra para el staff) con sus dos copias de "cerrar al
   hacer clic afuera" y "cerrar con Escape". Ahora es uno solo y cada panel
   solo dice que pinta. */

/* Todos los paneles de la barra: al abrir uno se cierran los demas (el clic
   en un boton no llega al documento, asi que no basta con "cerrar al hacer
   clic afuera"). */
const abiertos = new Set();

export function panel({boton, caja, pintar}){
  const abierto = () => !caja.hidden;

  function cerrar(devolverFoco){
    caja.hidden = true;
    boton.setAttribute("aria-expanded", "false");
    abiertos.delete(cerrar);
    if (devolverFoco) boton.focus();
  }

  function abrir(){
    abiertos.forEach(otro => { if (otro !== cerrar) otro(); });
    caja.hidden = false;
    boton.setAttribute("aria-expanded", "true");
    abiertos.add(cerrar);
    return Promise.resolve(pintar(caja));
  }

  boton.addEventListener("click", ev => {
    ev.stopPropagation();
    abierto() ? cerrar() : abrir();
  });
  caja.addEventListener("click", ev => ev.stopPropagation());
  document.addEventListener("click", () => { if (abierto()) cerrar(); });
  document.addEventListener("keydown", ev => {
    if (ev.key === "Escape" && abierto()) cerrar(true);
  });

  // `refrescar` sirve para repintar solo si esta a la vista.
  return {abrir, cerrar, abierto, refrescar: () => { if (abierto()) pintar(caja); }};
}

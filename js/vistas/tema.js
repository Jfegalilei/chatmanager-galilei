/* Claro u oscuro (el oscuro con la paleta Galilei). Sin eleccion guardada
   sigue al sistema; al tocar el boton queda fijo en este navegador. */
const LLAVE = "chatmanager-tema";

// Un solo icono de contraste (mitad lleno): el sol se confundia con el engrane de Ajustes.
const CONTRASTE = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>';

const delSistema = () => window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

function guardado(){
  try { return localStorage.getItem(LLAVE); } catch (e){ return null; }
}

export function tema({boton}){
  const actual = () => document.documentElement.getAttribute("data-theme") || guardado() || delSistema();

  function pintar(){
    const oscuro = actual() === "dark";
    boton.innerHTML = CONTRASTE;
    const texto = oscuro ? "Pasar a modo claro" : "Pasar a modo oscuro Galilei";
    boton.setAttribute("aria-label", texto);
    boton.setAttribute("data-tip", texto);
  }

  boton.onclick = () => {
    const nuevo = actual() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nuevo);
    try { localStorage.setItem(LLAVE, nuevo); } catch (e){}
    pintar();
  };
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", pintar);
  pintar();
}

/* El globito de ayuda. Cualquier elemento con data-tip lo muestra, asi que
   ninguna vista tiene que manejar eventos de raton. */

let caja = null;

function cajita(){
  if (!caja){
    caja = document.createElement("div");
    caja.className = "tip";
    caja.setAttribute("role", "tooltip");
    caja.hidden = true;
    document.body.appendChild(caja);
  }
  return caja;
}

export function mostrarTip(html, x, y){
  const t = cajita();
  t.innerHTML = html;
  t.hidden = false;
  t.style.left = Math.min(window.innerWidth - t.offsetWidth - 8, Math.max(8, x + 12)) + "px";
  t.style.top = Math.max(8, y - t.offsetHeight - 10) + "px";
}

export function ocultarTip(){ cajita().hidden = true; }

function enElemento(el, centrado){
  const r = el.getBoundingClientRect();
  mostrarTip(el.getAttribute("data-tip"), centrado ? r.left + r.width / 2 : r.left, r.top);
}

export function instalarTip(){
  document.addEventListener("mouseover", e => {
    const t = e.target.closest("[data-tip]");
    if (t) enElemento(t, true);
  });
  document.addEventListener("mouseout", e => { if (e.target.closest("[data-tip]")) ocultarTip(); });
  document.addEventListener("focusin", e => {
    const t = e.target.closest("[data-tip]");
    if (t) enElemento(t, false);
  });
  document.addEventListener("focusout", ocultarTip);
}

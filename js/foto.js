/* La copia de solo lectura (GitHub Pages). lib/publicar.js sube todo lo que
   la pagina pediria al servidor en un solo datos.bin, cifrado. Aqui se pide
   la clave, se descifra en el navegador y se entrega el mapa URL -> respuesta
   que usa api.js. Sin la clave no hay nada que mostrar.

   Formato (igual que cifrar() en lib/publicar.js):
   "CM01" | sal 16 | iv 12 | cifrado + etiqueta GCM  ->  gzip  ->  JSON */
export const PUBLICADO = document.documentElement.getAttribute("data-modo") === "publicado";

const MAGIA = "CM01";
const ITERACIONES = 310000;
const RECORDAR = "chatmanager-clave";

async function descifrar(bytes, clave){
  if (new TextDecoder().decode(bytes.slice(0, 4)) !== MAGIA) throw new Error("La copia publicada está dañada.");
  const sal = bytes.slice(4, 20), iv = bytes.slice(20, 32), cifrado = bytes.slice(32);
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(clave), "PBKDF2", false, ["deriveKey"]);
  const llave = await crypto.subtle.deriveKey(
    {name: "PBKDF2", salt: sal, iterations: ITERACIONES, hash: "SHA-256"},
    base, {name: "AES-GCM", length: 256}, false, ["decrypt"]);
  let gz;
  try { gz = await crypto.subtle.decrypt({name: "AES-GCM", iv}, llave, cifrado); }
  catch { throw new Error("Clave incorrecta."); }
  const texto = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
  return JSON.parse(texto);
}

const leer = k => { try { return sessionStorage.getItem(k); } catch { return null; } };
const guardar = (k, v) => { try { v ? sessionStorage.setItem(k, v) : sessionStorage.removeItem(k); } catch {} };

/* Pinta el candado en `caja` y resuelve con la foto cuando la clave sirve.
   La clave se recuerda solo mientras la pestana siga abierta. */
export async function abrirFoto(caja){
  const r = await fetch("datos.bin", {cache: "no-store"});
  if (!r.ok) throw new Error("Todavía no hay una copia publicada.");
  const bytes = new Uint8Array(await r.arrayBuffer());

  const recordada = leer(RECORDAR);
  if (recordada){
    try { return await descifrar(bytes, recordada); } catch { guardar(RECORDAR, null); }
  }

  return new Promise(resolver => {
    caja.innerHTML = `
      <form class="candado" autocomplete="off">
        <h2>Copia de solo lectura</h2>
        <p class="meta">El reporte trae nombres, teléfonos y mensajes de los grupos, por eso viaja cifrado. Escribe la clave para verlo.</p>
        <label class="oculto" for="clave">Clave</label>
        <input id="clave" type="password" placeholder="Clave" autocomplete="current-password" required>
        <button class="btn primario" type="submit">Ver reporte</button>
        <p class="error" role="alert"></p>
      </form>`;
    const form = caja.querySelector("form"), campo = form.querySelector("input"),
      boton = form.querySelector("button"), aviso = form.querySelector(".error");
    campo.focus();
    form.onsubmit = async ev => {
      ev.preventDefault();
      boton.disabled = true;
      boton.textContent = "Abriendo…";
      aviso.textContent = "";
      try {
        const foto = await descifrar(bytes, campo.value);
        guardar(RECORDAR, campo.value);
        caja.innerHTML = '<p class="vacio">Cargando…</p>';
        resolver(foto);
      } catch (e){
        aviso.textContent = e.message;
        boton.disabled = false;
        boton.textContent = "Ver reporte";
        campo.select();
      }
    };
  });
}

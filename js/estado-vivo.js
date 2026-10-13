/* El estado que el servidor empuja por SSE. Envuelve EventSource para que
   nadie mas tenga que saber que existe: se pide `suscribir` y llega el estado
   nuevo junto con el anterior (hace falta para reaccionar a los cambios). */

import {PUBLICADO} from "./foto.js";

export function estadoVivo(url = "/api/eventos"){
  const oyentes = new Set();
  let actual = {fase: "inactivo", conexion: PUBLICADO ? {estado: "publicado"} : {}, alertas: []};

  // La copia publicada no escucha nada: el estado lo fija app.js una vez,
  // con la hora en que se subio.
  if (PUBLICADO) return {
    actual: () => actual,
    suscribir(fn){ oyentes.add(fn); return () => oyentes.delete(fn); },
    fijar(cambios){
      const antes = actual;
      actual = {...actual, ...cambios};
      oyentes.forEach(fn => fn(actual, antes));
    }
  };

  let ultimo = "";
  const recibir = texto => {
    if (texto === ultimo) return;
    ultimo = texto;
    const antes = actual;
    actual = JSON.parse(texto);
    oyentes.forEach(fn => fn(actual, antes));
  };

  let llego = false;
  const fuente = new EventSource(url);
  fuente.onmessage = m => { llego = true; recibir(m.data); };

  // Por el tunel de Cloudflare el SSE puede quedarse retenido: si en 5 s no
  // llega nada, se pregunta el estado cada 3 s.
  setTimeout(() => {
    if (llego) return;
    fuente.close();
    const preguntar = () => fetch(url + "?foto=1").then(r => r.text()).then(recibir).catch(() => {});
    preguntar();
    setInterval(preguntar, 3000);
  }, 5000);

  return {
    actual: () => actual,
    suscribir(fn){
      oyentes.add(fn);
      return () => oyentes.delete(fn);
    }
  };
}

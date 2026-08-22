/*
 * "HAY UNA VERSIÓN NUEVA" (2026-08-22, Programador 3)
 *
 * EL FALLO QUE ESTO ARREGLA, Y ES MÍO. Desplegamos tres veces seguidas, el
 * código estaba demostrablemente en el fichero que sirve el servidor, y Eugenio
 * seguía viendo la aplicación de antes en su iPhone: «no ha cambiado nada».
 * Pensó que se me había olvidado desplegar. No: el service worker que yo puse
 * guarda copias para que la aplicación funcione sin red, y **nunca le di forma
 * de enterarse de que había una versión nueva**. Una aplicación instalada que
 * no puede actualizarse es peor que una que no se instala.
 *
 * POR QUÉ NO BASTA CON EL CICLO NORMAL DEL SERVICE WORKER. Ese ciclo solo se
 * dispara si cambia el propio `sw.js`, y en un despliegue normal no cambia:
 * cambia el JavaScript de la aplicación, que tiene otro nombre en cada
 * compilación. Además, en iOS una aplicación instalada se reanuda desde el
 * conmutador sin volver a navegar, así que puede pasar días sin pedir la página
 * otra vez.
 *
 * CÓMO SE ENTERA. Se mira el nombre del fichero principal —lleva un hash de su
 * contenido, así que cambia en cada compilación— y se compara con el que está
 * corriendo. Al abrir, y al volver a la aplicación desde el conmutador, que es
 * justo el momento en que un móvil lleva horas dormido.
 *
 * POR QUÉ NO SE RECARGA SOLO. Porque recargar tira lo que estés escribiendo. Se
 * avisa y decides tú. Lo único que hace sin preguntar es no volver a molestarte
 * con la misma versión.
 */

const ID = "aviso-version-nueva";
let avisada: string | null = null;

/** El fichero principal que está corriendo ahora mismo en esta pestaña. */
function versionActual(): string | null {
  const s = document.querySelector<HTMLScriptElement>('script[src*="/assets/index-"]');
  return s ? new URL(s.src, location.origin).pathname : null;
}

/** El que sirve el servidor en este momento. */
async function versionServida(): Promise<string | null> {
  // `no-store` y `?v=` para saltarse TODAS las cachés: la del navegador, la del
  // service worker y la de Cloudflare. Sin esto preguntaríamos a la misma copia
  // vieja que estamos intentando detectar.
  const res = await fetch(`/?v=${Date.now()}`, { cache: "no-store" });
  const html = await res.text();
  const m = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
  return m ? m[0] : null;
}

function pintar(alActualizar: () => void) {
  if (document.getElementById(ID)) return;
  const caja = document.createElement("div");
  caja.id = ID;
  caja.setAttribute("role", "status");
  caja.style.cssText = [
    "position:fixed",
    "left:0.75rem",
    "right:0.75rem",
    // Por encima de la barra de abajo, igual que los demás avisos.
    "bottom:calc(60px + env(safe-area-inset-bottom))",
    "z-index:10000",
    "display:flex",
    "align-items:center",
    "gap:0.75rem",
    "padding:0.85rem 1rem",
    "border-radius:1rem",
    "background:#1e293b",
    "color:#fff",
    "font:14px/1.35 system-ui,sans-serif",
    "box-shadow:0 10px 30px rgba(0,0,0,.35)",
  ].join(";");

  const texto = document.createElement("span");
  texto.style.cssText = "flex:1;min-width:0";
  texto.textContent = "Hay una versión nueva de la aplicación.";

  const boton = document.createElement("button");
  boton.type = "button";
  boton.textContent = "Actualizar";
  boton.style.cssText =
    "min-height:44px;padding:0 1rem;border:0;border-radius:.75rem;background:#22c55e;color:#062e16;font:700 14px system-ui;cursor:pointer";
  boton.onclick = alActualizar;

  const cerrar = document.createElement("button");
  cerrar.type = "button";
  cerrar.setAttribute("aria-label", "Ahora no");
  cerrar.textContent = "✕";
  cerrar.style.cssText =
    "min-height:44px;min-width:44px;border:0;background:transparent;color:#94a3b8;font:16px system-ui;cursor:pointer";
  cerrar.onclick = () => caja.remove();

  caja.append(texto, boton, cerrar);
  document.body.appendChild(caja);
}

async function actualizar() {
  // Se borran las copias guardadas del código. Las de TUS DATOS no se tocan:
  // son las que hacen que la aplicación siga abriendo sin red, y no tienen nada
  // que ver con la versión.
  if ("caches" in window) {
    for (const n of await caches.keys()) {
      if (n.includes("-assets") || n.includes("-shell")) await caches.delete(n);
    }
  }
  // Y que el service worker se replantee si él también es viejo.
  const reg = await navigator.serviceWorker?.getRegistration();
  await reg?.update().catch(() => {});
  location.reload();
}

async function comprobar() {
  try {
    const actual = versionActual();
    if (!actual) return; // en desarrollo no hay /assets/: no hay nada que comparar
    const servida = await versionServida();
    if (!servida || servida === actual || servida === avisada) return;
    avisada = servida;
    pintar(actualizar);
  } catch {
    // Sin red no hay versión nueva que anunciar. El aviso de "sin conexión" ya
    // se encarga de contar esa parte.
  }
}

export function vigilarVersion() {
  comprobar();
  // Al volver a la aplicación desde el conmutador de iOS, que es donde una
  // aplicación instalada se pasa días sin volver a pedir la página.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") comprobar();
  });
  window.addEventListener("focus", comprobar);
}

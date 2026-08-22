/*
 * "ADD TO HOME SCREEN" HINT FOR iOS (2026-08-22, Programador 3)
 *
 * WHY THIS EXISTS AT ALL: on Android the browser offers to install a PWA by
 * itself. On iOS it never does — there is no `beforeinstallprompt`, no banner,
 * nothing. The only way in is Share → Add to Home Screen, buried in a sheet, and
 * a user who does not already know it exists will never find it. An installable
 * app nobody can discover how to install is the same as one that is not.
 *
 * SO IT IS SHOWN, ONCE, AND NEVER AGAIN:
 * - Only on iOS, and only in Safari. Chrome on an iPhone cannot install a web
 *   app to the home screen, so telling its users to try would be a lie.
 * - Never when already installed: `display-mode: standalone` means they did it.
 * - Dismissed once, silent for 30 days. A hint that keeps coming back stops
 *   being a hint.
 */

const CLAVE = "hw:aviso-instalar-visto";
const DIAS = 30;

function esIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as a Mac; the touch points give it away.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function esSafari(): boolean {
  const ua = navigator.userAgent;
  // On iOS every browser is WebKit underneath, but only Safari can add to the
  // home screen. The others announce themselves in the user agent.
  return !/CriOS|FxiOS|EdgiOS|OPiOS|Instagram|FBAN|FBAV/.test(ua);
}

function yaInstalada(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's own flag, still the reliable one on iOS.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function silenciado(): boolean {
  try {
    const hasta = Number(localStorage.getItem(CLAVE) || 0);
    return Date.now() < hasta;
  } catch {
    return false; // private mode: better to show it than to crash
  }
}

function silenciar() {
  try {
    localStorage.setItem(CLAVE, String(Date.now() + DIAS * 86400000));
  } catch {
    /* private mode: it will appear again, and that is acceptable */
  }
}

export function ofrecerInstalacion() {
  if (!esIOS() || !esSafari() || yaInstalada() || silenciado()) return;

  const caja = document.createElement("div");
  caja.setAttribute("role", "dialog");
  caja.setAttribute("aria-label", "Instalar la aplicación");
  caja.style.cssText = [
    "position:fixed",
    "left:0.75rem",
    "right:0.75rem",
    "bottom:calc(0.75rem + env(safe-area-inset-bottom))",
    "z-index:9998",
    "padding:1rem",
    "border-radius:1rem",
    "background:#2b2258",
    "color:#fff",
    "font:14px/1.45 system-ui,sans-serif",
    "box-shadow:0 10px 30px rgba(0,0,0,.35)",
  ].join(";");

  const texto = document.createElement("div");
  texto.innerHTML =
    "<strong style='display:block;margin-bottom:.35rem'>Ten Humanity en tu pantalla de inicio</strong>" +
    "Toca <strong>Compartir</strong> abajo, y luego <strong>Añadir a pantalla de inicio</strong>. " +
    "Se abrirá a pantalla completa y funcionará aunque te quedes sin conexión.";

  const cerrar = document.createElement("button");
  cerrar.type = "button";
  cerrar.textContent = "Ahora no";
  // 44 px is Apple's minimum for something a finger has to hit.
  cerrar.style.cssText =
    "margin-top:.75rem;min-height:44px;width:100%;border:0;border-radius:.75rem;background:rgba(255,255,255,.15);color:#fff;font:600 14px system-ui;cursor:pointer";
  cerrar.onclick = () => {
    silenciar();
    caja.remove();
  };

  caja.append(texto, cerrar);
  document.body.appendChild(caja);
}

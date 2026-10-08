import {createRoot} from 'react-dom/client';
import {dominioPropio} from './utils/subdominio.ts';
import './index.css';
import './tema-oscuro.css';
import {iniciarTema} from './utils/tema.ts';
import {iniciarIdioma, ConIdioma} from './i18n/index.ts';
import {registrarPWA} from './pwa.ts';
import {instalarAutoscrollArrastre} from './utils/autoscrollArrastre.ts';

instalarAutoscrollArrastre();

// Sin StrictMode: su doble montaje (solo en desarrollo) deja el panZoom de
// React Flow 12 enganchado a un DOM desmontado y rompe fitView/zoom
// programático en los grafos. En producción nunca hubo doble montaje.
// ── QUÉ APLICACIÓN SE MONTA (2026-08-22) ────────────────────────────────────
// Si alguien llega por el dominio propio de otra persona —`lamieldelasierra.com`—
// no se monta la plataforma: se monta su web. Sin barra lateral, sin menú de
// herramientas, sin proveedores de datos y sin las cincuenta páginas.
//
// La decisión va AQUÍ y no dentro de `App`, porque no es «qué ruta pinto» sino
// «qué aplicación es esta». Puesta dentro, cualquier ruta que alguien añadiera
// mañana aparecería también en el dominio de un usuario sin que nadie lo
// decidiera.
//
// ── Y CADA UNA SE DESCARGA POR SEPARADO (2026-10-01) ────────────────────────
// Las dos iban en el mismo fichero, así que quien abría `luzhumanidad.com`
// se bajaba la plataforma entera —388 KB comprimidos— para pintar un título.
// Ahora cada una es su propio trozo y sólo se pide la que toca. Lo que vaya a
// hacer falta lo anuncia el HTML con `modulepreload` (ver `vite.config.ts`),
// así que no se espera a este fichero para empezar a bajarlo.
//
// En un dominio propio, hasta que llega, se ve la cabecera que el servidor ya
// escribió dentro de `#root` (`cabeceraSitio.tsx`). `render` la sustituye por
// la misma, ya viva.
iniciarTema();
iniciarIdioma();
const DOMINIO_PROPIO = dominioPropio();
const raiz = createRoot(document.getElementById('root')!);

if (DOMINIO_PROPIO) {
  import('./AplicacionDeDominio.tsx').then(({default: AplicacionDeDominio}) =>
    raiz.render(<ConIdioma><AplicacionDeDominio host={DOMINIO_PROPIO} /></ConIdioma>));
} else {
  import('./App.tsx').then(({default: App}) => raiz.render(<ConIdioma><App /></ConIdioma>));
}

// PWA: en producción siempre, en desarrollo solo con `?sw=on`. Ver src/pwa.ts.
registrarPWA();

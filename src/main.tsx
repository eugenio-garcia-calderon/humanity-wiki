import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AplicacionDeDominio from './AplicacionDeDominio.tsx';
import {dominioPropio} from './utils/subdominio.ts';
import './index.css';
import {registrarPWA} from './pwa.ts';

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
const DOMINIO_PROPIO = dominioPropio();

createRoot(document.getElementById('root')!).render(
  DOMINIO_PROPIO ? <AplicacionDeDominio host={DOMINIO_PROPIO} /> : <App />
);

// PWA: en producción siempre, en desarrollo solo con `?sw=on`. Ver src/pwa.ts.
registrarPWA();

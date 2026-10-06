import { createElement, Fragment, useEffect, useState, type ReactNode } from 'react';

// ============================================================================
// IDIOMAS DE LA INTERFAZ (2026-10-06, carril «espacio», #34)
// ============================================================================
// Un sistema a propósito pequeño: nada de librerías, nada de ficheros JSON
// por idioma ni de claves inventadas (`menu.perfil.titulo`).
//
//   t('Mis páginas')                       → «My pages» en inglés
//   t('{n} resultados', { n: 3 })          → «3 results»
//
// LA CLAVE ES EL TEXTO EN ESPAÑOL. Es el idioma en el que está escrita toda la
// interfaz, así que traducir una pantalla es envolver su texto en `t()` sin
// cambiar nada más; y si falta una traducción, sale el español —que se lee—
// en vez de una clave fea. Los diccionarios son un objeto «español → idioma»
// (`en.ts`). Para añadir otro: crear `fr.ts`, registrarlo en `DICCIONARIOS` y
// en `IDIOMAS`. `scripts/revisar-traducciones.mjs` lista lo que falta.
//
// CÓMO SE REPINTA AL CAMBIAR DE IDIOMA. `t()` es una función normal, sin
// hooks: se puede llamar en cualquier sitio, también fuera de un componente.
// A cambio, nadie se entera del cambio; por eso `ConIdioma` envuelve la
// aplicación con `key={idioma}` y, al cambiar, React la monta de nuevo ya con
// los textos nuevos. Cambiar de idioma es raro; perder el estado de la
// pantalla en ese momento es un precio aceptable por no tener que enganchar
// cientos de componentes.
//
// LO QUE NO SE TRADUCE: el contenido de las personas (títulos y textos de sus
// páginas, nombres de bases de datos, carpetas…). Y los mensajes de error que
// llegan del servidor siguen en español: el servidor aún no sabe el idioma de
// quien pregunta.
//
// ── ESTADO DE LA TRADUCCIÓN AL INGLÉS ───────────────────────────────────────
// TRADUCIDO:  menú lateral (raíl, herramientas, crear, paneles), barra
//             superior y buscador, menú del perfil (apariencia e idioma),
//             favoritos y recientes, paleta ⌘K y búsqueda avanzada, árbol de
//             páginas y su clic derecho, barra de la página (compartir,
//             descargar, ajustes), «Preferencias», y los mensajes comunes
//             (cargando, error, reintentar, cerrar…).
// SIN TRADUCIR: el editor por dentro (menú «/», menú de cada bloque, ajustes
//             de bloque), bases de datos (vistas, filtros, propiedades),
//             comentarios, versiones y compartir en detalle, Mercado, Debates,
//             Veracidad, Juego, Mensajes y Teléfono, administración, páginas
//             legales, textos largos de ayuda y los errores del servidor.
//             Mientras no se traduzcan se ven en español, sin romper nada.

export type Idioma = 'es' | 'en';
export const IDIOMAS: { id: Idioma; nombre: string }[] = [
  { id: 'es', nombre: 'Español' },
  { id: 'en', nombre: 'English' },
];
export const CLAVE_IDIOMA = 'humanity:idioma';
export const esIdioma = (v: unknown): v is Idioma => IDIOMAS.some(i => i.id === v);

type Diccionario = Record<string, string>;
let en: Diccionario = {};
// El inglés se carga aparte: quien usa la plataforma en español no se baja el diccionario.
const cargadores: Partial<Record<Idioma, () => Promise<Diccionario>>> = {
  en: () => import('./en').then(m => m.default),
};

let actual: Idioma = 'es';
const oyentes = new Set<() => void>();

/** El idioma del navegador si lo tenemos; si no, español. */
export function idiomaDelNavegador(): Idioma {
  const l = (typeof navigator !== 'undefined' ? navigator.languages?.[0] || navigator.language : '') || '';
  return l.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export function leerIdioma(): Idioma {
  try { const v = localStorage.getItem(CLAVE_IDIOMA); if (esIdioma(v)) return v; } catch { /* sin almacenamiento */ }
  return idiomaDelNavegador();
}
export const hayIdiomaElegido = () => { try { return esIdioma(localStorage.getItem(CLAVE_IDIOMA)); } catch { return false; } };

export const idiomaActual = () => actual;

/** Traduce. Con `{n}` en el texto y `vars`, rellena los huecos. */
export function t(texto: string, vars?: Record<string, string | number>): string {
  let s = actual === 'en' ? (en[texto] ?? texto) : texto;
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
}

async function cargar(i: Idioma) {
  const c = cargadores[i];
  if (c) {
    const d = await c();
    if (i === 'en') en = d;
  }
}

function aplicar(i: Idioma) {
  actual = i;
  if (typeof document !== 'undefined') document.documentElement.lang = i;
  oyentes.forEach(f => f());
}

/** Elegir idioma: se guarda y se repinta todo. */
export async function ponerIdioma(i: Idioma) {
  try { localStorage.setItem(CLAVE_IDIOMA, i); } catch { /* vale para esta visita */ }
  await cargar(i);
  aplicar(i);
}

/** Al arrancar: carga el diccionario del idioma elegido o del navegador. */
export function iniciarIdioma() {
  const i = leerIdioma();
  if (i === 'es') { aplicar('es'); return; }
  // Hasta que llega el diccionario se ve español; al llegar se repinta.
  void cargar(i).then(() => aplicar(i));
}

export function useIdioma() {
  const [i, setI] = useState<Idioma>(actual);
  useEffect(() => {
    const f = () => setI(actual);
    oyentes.add(f);
    f();
    return () => { oyentes.delete(f); };
  }, []);
  return { idioma: i, poner: ponerIdioma };
}

/** Monta de nuevo la aplicación al cambiar de idioma (ver la cabecera). */
export function ConIdioma({ children }: { children: ReactNode }) {
  const { idioma } = useIdioma();
  return createElement(Fragment, { key: idioma }, children);
}

import { useEffect, useState } from 'react';

// ============================================================================
// CLARO / OSCURO / SISTEMA (2026-10-06, carril «espacio», #25)
// ============================================================================
// La preferencia vive en `localStorage` (así también la tiene un visitante sin
// cuenta, que es quien mira las páginas públicas) y, si has entrado, se copia a
// `users.ui_settings.tema` para que te siga a otros dispositivos
// (`SincronizarPreferencias`).
//
// SIN PARPADEO: el `<script>` de `index.html` pone la clase `dark` en <html>
// ANTES de que el navegador pinte nada; esto solo la mantiene al día después
// (cambios del selector y cambios del sistema operativo).
//
// El tema se aplica como una clase en <html> y `src/tema-oscuro.css`, que se
// GENERA (`scripts/generar-tema-oscuro.mjs`), redefine las variables de color
// de Tailwind bajo esa clase. Ver la cabecera del generador.

export type PreferenciaTema = 'claro' | 'oscuro' | 'sistema';
export const CLAVE_TEMA = 'humanity:tema';
const VALIDAS: PreferenciaTema[] = ['claro', 'oscuro', 'sistema'];
export const esPreferenciaTema = (v: unknown): v is PreferenciaTema => VALIDAS.includes(v as PreferenciaTema);

export function leerTema(): PreferenciaTema {
  try { const v = localStorage.getItem(CLAVE_TEMA); if (esPreferenciaTema(v)) return v; } catch { /* sin almacenamiento */ }
  return 'sistema';
}
/** ¿Hay una elección guardada, o es el valor por defecto? */
export const hayTemaElegido = () => { try { return esPreferenciaTema(localStorage.getItem(CLAVE_TEMA)); } catch { return false; } };

const sistemaOscuro = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
export const temaResuelto = (p: PreferenciaTema): 'claro' | 'oscuro' => (p === 'oscuro' || (p === 'sistema' && sistemaOscuro()) ? 'oscuro' : 'claro');

export function aplicarTema(p: PreferenciaTema = leerTema()) {
  const oscuro = temaResuelto(p) === 'oscuro';
  const r = document.documentElement;
  r.classList.toggle('dark', oscuro);
  r.style.colorScheme = oscuro ? 'dark' : 'light';
  r.style.backgroundColor = ''; // el fondo provisional del script de index.html: ya manda el CSS
  // La barra del navegador en el móvil: morada en claro, la superficie en oscuro.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', oscuro ? '#11161d' : '#2b2258');
}

export function ponerTema(p: PreferenciaTema) {
  try { localStorage.setItem(CLAVE_TEMA, p); } catch { /* sin almacenamiento: vale para esta visita */ }
  aplicarTema(p);
  window.dispatchEvent(new CustomEvent('humanity:tema', { detail: p }));
}

/** Se llama una vez al arrancar: mantiene la clase al día cuando cambia el sistema. */
export function iniciarTema() {
  aplicarTema();
  if (typeof matchMedia !== 'function') return;
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (leerTema() === 'sistema') aplicarTema(); });
}

export function useTema() {
  const [pref, setPref] = useState<PreferenciaTema>(leerTema);
  useEffect(() => {
    const f = (e: Event) => setPref((e as CustomEvent).detail ?? leerTema());
    window.addEventListener('humanity:tema', f);
    return () => window.removeEventListener('humanity:tema', f);
  }, []);
  return { tema: pref, resuelto: temaResuelto(pref), poner: ponerTema };
}

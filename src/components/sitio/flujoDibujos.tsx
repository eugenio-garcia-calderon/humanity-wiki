// ============================================================================
// LOS DIBUJOS DE LA VISTA «FLUJO» (2026-10-30)
// ============================================================================
// Un dibujo de una línea por sistema, al estilo de las portadas de la casa
// (`portadas-ilustraciones/`): trazo oscuro fino, un acento azul y un relleno
// celeste suave. Para cambiar un dibujo se cambia aquí, sin tocar la vista.

const OSCURO = '#23384d', AZUL = '#3b82c4', CELESTE = '#d4e6f5';

import type { ReactElement } from 'react';

const DIBUJOS: Record<string, ReactElement> = {
  // Un corazón con el tejado de un hogar dentro: lo que la gente necesita.
  objetivos: (
    <>
      <path d="M32 38C20 30 12 22 12 14c0-6 5-9 10-9 4 0 8 2 10 6 2-4 6-6 10-6 5 0 10 3 10 9 0 8-8 16-20 24z" fill={CELESTE} stroke={OSCURO} strokeWidth="1.5" />
      <path d="M24 22l8-7 8 7M26 21v7h12v-7" fill="none" stroke={AZUL} strokeWidth="1.3" />
    </>
  ),
  // El sol sobre la montaña y el agua: con lo que cuenta el país.
  recursos: (
    <>
      <circle cx="46" cy="11" r="5" fill={CELESTE} stroke={AZUL} strokeWidth="1.3" />
      <path d="M46 2v3M53 4l-2 2M55 11h-3M39 4l2 2" stroke={AZUL} strokeWidth="1.2" />
      <path d="M6 32L20 12l9 13 5-6 12 13" fill="none" stroke={OSCURO} strokeWidth="1.5" />
      <path d="M6 38c4 0 4-2 8-2s4 2 8 2 4-2 8-2 4 2 8 2 4-2 8-2 4 2 8 2" fill="none" stroke={AZUL} strokeWidth="1.2" />
    </>
  ),
  // Una brújula: los principios que orientan.
  valores: (
    <>
      <circle cx="32" cy="22" r="16" fill={CELESTE} stroke={OSCURO} strokeWidth="1.5" />
      <circle cx="32" cy="22" r="12" fill="#fff" stroke={OSCURO} strokeWidth="1" />
      <path d="M32 12l4 10-4 10-4-10z" fill={CELESTE} stroke={AZUL} strokeWidth="1.3" />
      <circle cx="32" cy="22" r="1.6" fill={OSCURO} />
      <path d="M32 7v3M32 34v3M17 22h3M44 22h3" stroke={OSCURO} strokeWidth="1.2" />
    </>
  ),
  // El hemiciclo con sus escaños: donde se debate y se decide.
  politica: (
    <>
      <path d="M8 36a24 24 0 0 1 48 0z" fill={CELESTE} stroke={OSCURO} strokeWidth="1.5" />
      <path d="M18 36a14 14 0 0 1 28 0" fill="none" stroke={AZUL} strokeWidth="1.3" />
      <path d="M13 30l4 2M22 22l3 3M32 19v4M42 22l-3 3M51 30l-4 2" stroke={OSCURO} strokeWidth="1.3" />
      <rect x="29" y="30" width="6" height="6" fill="#fff" stroke={OSCURO} strokeWidth="1.3" />
    </>
  ),
  // El libro de las normas, con su balanza pequeña encima.
  ley: (
    <>
      <path d="M10 10c7-3 14-3 22 0 8-3 15-3 22 0v26c-7-3-14-3-22 0-8-3-15-3-22 0z" fill={CELESTE} stroke={OSCURO} strokeWidth="1.5" />
      <path d="M32 10v26" stroke={OSCURO} strokeWidth="1.2" />
      <path d="M15 17h12M15 22h12M15 27h12M37 17h12M37 22h12M37 27h12" stroke={AZUL} strokeWidth="1.1" />
    </>
  ),
  // La balanza: juzgar con las mismas pesas para todos.
  justicia: (
    <>
      <path d="M32 6v26M20 10h24" stroke={OSCURO} strokeWidth="1.5" />
      <path d="M20 10l-6 12h12zM44 10l-6 12h12z" fill={CELESTE} stroke={OSCURO} strokeWidth="1.3" />
      <path d="M14 22a6 6 0 0 0 12 0M38 22a6 6 0 0 0 12 0" fill="none" stroke={AZUL} strokeWidth="1.3" />
      <path d="M24 36h16M28 32h8" stroke={OSCURO} strokeWidth="1.5" />
    </>
  ),
  // La moneda girando en el ciclo del intercambio.
  economia: (
    <>
      <circle cx="32" cy="22" r="13" fill={CELESTE} stroke={OSCURO} strokeWidth="1.5" />
      <path d="M36 16a7 7 0 1 0 0 12M26 20h8M26 24h8" fill="none" stroke={OSCURO} strokeWidth="1.4" />
      <path d="M10 22a22 22 0 0 1 8-13l-1 6M54 22a22 22 0 0 1-8 13l1-6" fill="none" stroke={AZUL} strokeWidth="1.3" />
    </>
  ),
  // La nave con su chimenea y la gráfica que sube.
  empresa: (
    <>
      <path d="M10 38V18l12 8v-8l12 8v-8l14 10v10z" fill={CELESTE} stroke={OSCURO} strokeWidth="1.5" />
      <path d="M14 18v-8h5v11" fill="#fff" stroke={OSCURO} strokeWidth="1.3" />
      <path d="M36 32l6-6 4 3 7-8" fill="none" stroke={AZUL} strokeWidth="1.4" />
      <path d="M53 20l1 3-3 1" fill="none" stroke={AZUL} strokeWidth="1.4" />
    </>
  ),
  // El edificio de columnas de lo público.
  administracion: (
    <>
      <path d="M32 5L8 16h48z" fill={CELESTE} stroke={OSCURO} strokeWidth="1.5" />
      <path d="M12 20v14M22 20v14M32 20v14M42 20v14M52 20v14" stroke={OSCURO} strokeWidth="1.5" />
      <path d="M8 38h48M10 16v3h44v-3" fill="none" stroke={OSCURO} strokeWidth="1.3" />
      <circle cx="32" cy="11" r="1.8" fill="none" stroke={AZUL} strokeWidth="1.2" />
    </>
  ),
  // La cruz de la salud con el tejado que protege a todos.
  servicios: (
    <>
      <path d="M8 20L32 6l24 14" fill="none" stroke={OSCURO} strokeWidth="1.5" />
      <rect x="18" y="20" width="28" height="18" rx="2" fill={CELESTE} stroke={OSCURO} strokeWidth="1.5" />
      <path d="M32 24v10M27 29h10" stroke={AZUL} strokeWidth="2" />
      <path d="M10 38h44" stroke={OSCURO} strokeWidth="1.3" />
    </>
  ),
  // El engranaje que mueve todo lo demás.
  tecnicas: (
    <>
      <circle cx="32" cy="22" r="11" fill={CELESTE} stroke={OSCURO} strokeWidth="1.5" />
      <circle cx="32" cy="22" r="4.5" fill="#fff" stroke={AZUL} strokeWidth="1.4" />
      <path d="M32 7v5M32 32v5M17 22h5M42 22h5M21.4 11.4l3.5 3.5M39.1 29.1l3.5 3.5M42.6 11.4l-3.5 3.5M24.9 29.1l-3.5 3.5" stroke={OSCURO} strokeWidth="1.5" />
    </>
  ),
  // El libro abierto del que brota una idea.
  educacion: (
    <>
      <path d="M8 34V12c8-3 15-3 24 1 9-4 16-4 24-1v22c-8-3-15-3-24 1-9-4-16-4-24-1z" fill={CELESTE} stroke={OSCURO} strokeWidth="1.5" />
      <path d="M32 13v22" stroke={OSCURO} strokeWidth="1.2" />
      <circle cx="32" cy="8" r="3.5" fill="#fff" stroke={AZUL} strokeWidth="1.3" />
      <path d="M32 2v1.5M38 4l-1.5 1.5M26 4l1.5 1.5" stroke={AZUL} strokeWidth="1.2" />
    </>
  ),
  // La hoja con sus nervios: la vida que envuelve el sistema.
  ecologia: (
    <>
      <path d="M12 36C12 18 26 8 52 8c0 26-10 30-28 30-5 0-9-1-12-2z" fill={CELESTE} stroke={OSCURO} strokeWidth="1.5" />
      <path d="M16 34C24 24 34 17 46 13" fill="none" stroke={AZUL} strokeWidth="1.3" />
      <path d="M26 27l-2-7M33 22l-1-7M40 18l0-6" stroke={AZUL} strokeWidth="1.1" />
      <path d="M8 40c3-2 5-4 8-4" fill="none" stroke={OSCURO} strokeWidth="1.3" />
    </>
  ),
  // La cruz médica con el pulso que sigue vivo.
  salud: (
    <>
      <circle cx="32" cy="20" r="14" fill={CELESTE} stroke={OSCURO} strokeWidth="1.5" />
      <path d="M32 13v14M25 20h14" stroke={AZUL} strokeWidth="2.4" />
      <path d="M4 36h12l3-6 4 10 3-6h10" fill="none" stroke={OSCURO} strokeWidth="1.3" />
    </>
  ),
  // El rayo que sale del sol: la energía propia.
  energia: (
    <>
      <circle cx="18" cy="13" r="6" fill={CELESTE} stroke={AZUL} strokeWidth="1.3" />
      <path d="M18 3v3M26 8l-2 2M28 13h-3M10 8l2 2M8 13H5" stroke={AZUL} strokeWidth="1.2" />
      <path d="M38 4L26 24h8l-6 16 16-22h-9z" fill={CELESTE} stroke={OSCURO} strokeWidth="1.5" />
      <path d="M46 34h12M50 38h8" stroke={OSCURO} strokeWidth="1.3" />
    </>
  ),
  // El morro del tren rápido sobre su vía.
  movilidad: (
    <>
      <path d="M8 30h30c8 0 14-3 16-8 1-3-1-6-6-6H20c-6 0-10 5-12 14z" fill={CELESTE} stroke={OSCURO} strokeWidth="1.5" />
      <path d="M22 21h22M14 26h36" stroke={AZUL} strokeWidth="1.2" />
      <circle cx="18" cy="33" r="3" fill="#fff" stroke={OSCURO} strokeWidth="1.3" />
      <circle cx="36" cy="33" r="3" fill="#fff" stroke={OSCURO} strokeWidth="1.3" />
      <path d="M4 40h56" stroke={OSCURO} strokeWidth="1.3" />
    </>
  ),
  // La espiga y la manzana: del campo al plato.
  alimentacion: (
    <>
      <path d="M20 40V14" stroke={OSCURO} strokeWidth="1.5" />
      <path d="M20 16c-6-1-8-5-8-10 5 0 8 3 8 10zM20 16c6-1 8-5 8-10-5 0-8 3-8 10zM20 26c-6-1-8-5-8-10 5 0 8 3 8 10zM20 26c6-1 8-5 8-10-5 0-8 3-8 10z" fill={CELESTE} stroke={AZUL} strokeWidth="1.2" />
      <circle cx="44" cy="28" r="10" fill={CELESTE} stroke={OSCURO} strokeWidth="1.5" />
      <path d="M44 18c0-3 1-5 4-6" fill="none" stroke={OSCURO} strokeWidth="1.3" />
    </>
  ),
  // La gota sobre el agua embalsada.
  agua: (
    <>
      <path d="M32 3C24 13 20 19 20 26a12 12 0 0 0 24 0c0-7-4-13-12-23z" fill={CELESTE} stroke={OSCURO} strokeWidth="1.5" />
      <path d="M27 27a5 5 0 0 0 5 5" fill="none" stroke={AZUL} strokeWidth="1.3" />
      <path d="M6 41c4 0 4-2 8-2s4 2 8 2 4-2 8-2 4 2 8 2 4-2 8-2 4 2 8 2" fill="none" stroke={AZUL} strokeWidth="1.2" />
    </>
  ),
  // La casa en obra, con su grúa.
  vivienda: (
    <>
      <path d="M10 38V22l12-9 12 9v16z" fill={CELESTE} stroke={OSCURO} strokeWidth="1.5" />
      <path d="M18 38v-8h8v8" fill="#fff" stroke={OSCURO} strokeWidth="1.2" />
      <path d="M40 38V10h4M40 14h16M52 14v5" stroke={AZUL} strokeWidth="1.3" />
      <path d="M50 19h5v5h-5z" fill={CELESTE} stroke={AZUL} strokeWidth="1.2" />
      <path d="M6 38h52" stroke={OSCURO} strokeWidth="1.3" />
    </>
  ),
  // La antena que conecta el país.
  comunicacion: (
    <>
      <path d="M32 40V18" stroke={OSCURO} strokeWidth="1.5" />
      <path d="M26 40h12M29 27l-7 13M35 27l7 13" stroke={OSCURO} strokeWidth="1.3" />
      <circle cx="32" cy="14" r="4" fill={CELESTE} stroke={AZUL} strokeWidth="1.4" />
      <path d="M23 14a9 9 0 0 1 18 0M16 14a16 16 0 0 1 32 0" fill="none" stroke={AZUL} strokeWidth="1.2" />
    </>
  ),
};

/** El dibujo de un sistema, al tamaño que pida la tarjeta o el panel. */
export default function DibujoFlujo({ id, alto = 44 }: { id: string; alto?: number }) {
  const d = DIBUJOS[id];
  if (!d) return null;
  return <svg viewBox="0 0 64 44" style={{ height: alto, width: (alto * 64) / 44 }} aria-hidden>{d}</svg>;
}

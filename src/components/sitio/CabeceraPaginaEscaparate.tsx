import { cn } from '../../utils/cn';
import type { DatosPagina } from './CabeceraLectura';

// ============================================================================
// LA CABECERA DE UNA PÁGINA PROPIA DEL ESCAPARATE (2026-11-07)
// ============================================================================
// Colabora, Sala de prensa, Quiénes somos… las páginas de un escaparate que no son
// la portada, ni un proyecto, ni una persona. Eugenio: «con alta calidad, no quiero
// nada cutre». Con la cabecera de siempre llevaban el botón «Seguir» (en un sitio
// sin cuentas), las propiedades de la fila y la red de la página. Aquí se leen como
// la portada: la tarjeta con el sol de la marca, quién lo firma, el título (`h1`) y
// la entradilla (`subtitulo` de la página, que se escribe en el editor).
//
// Sin ganchos ni nada del navegador: el servidor la pinta igual dentro del HTML
// (`server/cabeceraSitio.tsx`), así que no salta al arrancar React.

/** ¿Se lee esta página como una página propia del escaparate? (`VistaPagina` y el servidor). */
export function esPaginaEscaparate(pagina: DatosPagina | null | undefined): boolean {
  const s = pagina?.sitio;
  if (!pagina || pagina.virtual || s?.config?.escaparate !== true || !s.raizId || s.raizId === pagina.id) return false;
  const cfg = pagina.config || {};
  // Un proyecto (su fila de `sitio.proyectos`) tiene su propia cabecera; una persona, su perfil.
  if (pagina.fila && pagina.fila.tabla_id === s.config?.proyectos) return false;
  const primero = (cfg.bloques || cfg.blocks || [])[0];
  if (primero?.tipo === 'termometro' || primero?.tipo === 'perfil') return false;
  // La que pidió ir sin cabecera (la de donar: «el bloque de donación arriba del todo») sigue igual.
  return cfg.sinCabecera !== true;
}

/** El sol de la marca, de fondo y muy suave (los anillos del logotipo, como en la portada). */
export function SolDeFondo({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 400" className={cn('pointer-events-none absolute -z-10', className)}>
      <circle cx="200" cy="200" r="70" fill="currentColor" opacity="0.5" />
      {[110, 150, 190].map((r, i) => <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="currentColor" strokeWidth={22 - i * 6} opacity={0.45 - i * 0.12} />)}
    </svg>
  );
}

export default function CabeceraPaginaEscaparate({ pagina }: { pagina: DatosPagina }) {
  const cfg = pagina.config || {};
  const organizacion = String(pagina.sitio?.config?.seo?.organizacion || pagina.sitio?.titulo || '').trim();
  const entradilla = typeof cfg.subtitulo === 'string' ? cfg.subtitulo.trim() : '';
  return (
    <header data-cabecera-pagina data-cabecera-escaparate
      className="relative isolate mb-8 overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white px-5 py-8 sm:mb-12 sm:px-10 sm:py-12">
      <SolDeFondo className="-right-32 -top-40 h-[440px] w-[440px] text-amber-300/30 sm:-right-16" />
      {organizacion && <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700 sm:text-xs">{organizacion}</p>}
      <h1 className="mt-2.5 max-w-[22ch] text-[2.1rem] font-black leading-[1.05] tracking-tight text-slate-900 [text-wrap:balance] sm:mt-3 sm:text-[3.4rem]">
        {pagina.titulo || 'Sin título'}
      </h1>
      {entradilla && (
        <p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-slate-600 [text-wrap:pretty] sm:mt-5 sm:text-xl sm:leading-relaxed">{entradilla}</p>
      )}
    </header>
  );
}

import { Maximize2 } from 'lucide-react';
import type { PropsLectura } from '../tipos';

/** La dirección del mapa: `/mapa`, en un marco, y abierto en un territorio si se eligió. */
export const direccionMapa = (datos: Record<string, unknown>, enMarco: boolean) => {
  const q = new URLSearchParams();
  if (enMarco) q.set('embed', '1');
  // Con la columna de los objetivos a la izquierda (2026-10-21).
  if (datos.filtros === true) q.set('filtros', '1');
  const t = String(datos.territorio || '').trim();
  if (t) q.set('territorio', t);
  const s = q.toString();
  return `/mapa${s ? `?${s}` : ''}`;
};

export function VistaMapaMundo({ datos }: { datos: Record<string, unknown> }) {
  // «Pantalla completa» (2026-10-21): todo el alto de la ventana, menos el menú de arriba.
  const pantalla = datos.alto === 'pantalla';
  const alto = pantalla ? 'max(560px, calc(100vh - 7rem))' : Math.min(1200, Math.max(320, Number(datos.alto) || 560));
  return (
    <figure className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
      <iframe src={direccionMapa(datos, true)} title="Mapa de indicadores del mundo" loading="lazy"
        className="block w-full" style={{ height: alto, border: 0 }} />
      {/* En un dominio propio, `/mapa` sin marco es una página del sitio: la pantalla completa se abre en humanity.wiki. */}
      <a href={(typeof window !== 'undefined' && !/(^|\.)humanity\.wiki$|^localhost$|^127\./.test(window.location.hostname) ? 'https://humanity.wiki' : '') + direccionMapa(datos, false)} target="_blank" rel="noreferrer"
        className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-black text-slate-700 shadow ring-1 ring-slate-200 hover:bg-white">
        <Maximize2 className="h-3.5 w-3.5" /> Pantalla completa
      </a>
    </figure>
  );
}

export default function Lectura({ datos }: PropsLectura) {
  return <VistaMapaMundo datos={datos} />;
}

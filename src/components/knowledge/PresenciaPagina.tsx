import { useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';

// ============================================================================
// QUIÉN MÁS ESTÁ EN ESTA PÁGINA (2026-10-06)
// ============================================================================
// Las caras de arriba, como en Notion. Se apoyan en el SSE
// `GET /api/paginas/:id/presencia` (ver `src/server/colaboracion.ts`) y el
// diseño completo está en la cabecera de `src/utils/colaboracion.ts`.

export interface Persona { id: string; nombre: string; avatar: string | null; color: string; edita: boolean; pestanas: number }

/**
 * Mantiene abierta la conexión mientras la página está en pantalla.
 * `alGuardar` se llama cuando OTRA pestaña o persona guarda la página, con la
 * versión nueva. Devuelve a quienes hay (incluida esta persona) y el
 * identificador de esta pestaña, que el editor manda al guardar para no
 * recibir su propio aviso.
 */
export function usePresencia(paginaId: string | null, activo: boolean, alGuardar: (version: number, por: string | null) => void) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [yo, setYo] = useState<string | null>(null);
  const conexion = useRef<string | null>(null);
  const cb = useRef(alGuardar);
  cb.current = alGuardar;

  useEffect(() => {
    if (!paginaId || !activo || typeof EventSource === 'undefined') return;
    // `EventSource` reconecta solo si se corta; al irse de la página se cierra.
    const es = new EventSource(`/api/paginas/${paginaId}/presencia`, { withCredentials: true });
    es.addEventListener('hola', e => { const d = JSON.parse((e as MessageEvent).data); conexion.current = d.conexion; setYo(d.yo); });
    es.addEventListener('presencia', e => setPersonas(JSON.parse((e as MessageEvent).data).personas || []));
    es.addEventListener('guardado', e => { const d = JSON.parse((e as MessageEvent).data); cb.current(Number(d.version), d.por || null); });
    return () => { es.close(); conexion.current = null; setPersonas([]); };
  }, [paginaId, activo]);

  return { personas, yo, conexion };
}

const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?';

/** Las caras. Quien eres tú va la última y sin repetirse en las demás pestañas. */
export function CarasPresencia({ personas, yo, siguiendo, alSeguir }: { personas: Persona[]; yo: string | null; siguiendo?: string | null; alSeguir?: (id: string) => void }) {
  const otras = personas.filter(p => p.id !== yo);
  if (!otras.length) return null;
  const MAX = 4;
  const vistas = otras.slice(0, MAX);
  return (
    <div className="flex items-center -space-x-1.5" aria-label={`${otras.length} ${otras.length === 1 ? 'persona más' : 'personas más'} en esta página`}>
      {vistas.map(p => (
        <span key={p.id} title={`${p.nombre}${p.edita ? ' · editando' : ' · mirando'}${alSeguir ? (siguiendo === p.id ? ' · pulsa para dejar de seguir' : ' · pulsa para seguir') : ''}`}
          onClick={alSeguir ? () => alSeguir(p.id) : undefined}
          role={alSeguir ? 'button' : undefined}
          className={cn('relative w-7 h-7 rounded-full grid place-items-center text-[10px] font-black text-white ring-2 ring-white overflow-hidden', !p.edita && 'opacity-80', alSeguir && 'cursor-pointer', siguiendo === p.id && '!ring-emerald-500')}
          style={{ background: p.color }}>
          {p.avatar ? <img src={p.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : iniciales(p.nombre)}
        </span>
      ))}
      {otras.length > MAX && (
        <span className="w-7 h-7 rounded-full grid place-items-center text-[10px] font-black bg-slate-200 text-slate-600 ring-2 ring-white">+{otras.length - MAX}</span>
      )}
    </div>
  );
}

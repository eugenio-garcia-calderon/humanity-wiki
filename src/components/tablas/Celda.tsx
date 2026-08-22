import { useEffect, useRef, useState } from 'react';
import { Check, Star, ExternalLink, Paperclip, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// TABLAS · UNA CELDA
// ============================================================================
// Pintar y editar una celda según su tipo. Es el único sitio del cliente que
// sabe cómo se ve cada tipo, para que añadir uno nuevo sea tocar aquí y nada
// más.
//
// ── LOS CUATRO ESTADOS SE VEN, NO SE ESCONDEN ───────────────────────────────
// El servidor manda `vacia`, `ok`, `sin_calcular` o `error`, y los cuatro se
// pintan distinto. Una celda con error enseña por qué, no un hueco: si una
// división entre cero se viera igual que una celda sin rellenar, un total mal
// calculado pasaría por un total pendiente de rellenar.

export type Celda =
  | { estado: 'vacia' }
  | { estado: 'ok'; valor: any }
  | { estado: 'sin_calcular' }
  | { estado: 'error'; mensaje: string };

export type Columna = {
  id: string; nombre: string; tipo: string;
  opciones?: Array<{ id: string; label: string; color?: string | null }>;
  config?: any;
};

/** Los tipos que no se escriben a mano: se calculan o se eligen de una lista. */
const CALCULADOS = new Set(['formula', 'agregado', 'condicional']);
const APUNTAN = new Set(['persona', 'proyecto', 'publicacion', 'relacion']);
const FICHEROS = new Set(['imagen', 'video', 'documento']);

/** Cómo se LEE un valor ya guardado. El formato vive aquí y no en el servidor
 *  porque es cosa de quien mira: el mismo 0,15 es «15 %» para una persona y un
 *  número para una suma. */
export function formatear(c: Celda, col: Columna, extra?: { apuntados?: any[]; archivos?: any[] }): string {
  if (c.estado !== 'ok') return '';
  const v = c.valor;
  switch (col.tipo) {
    case 'moneda': {
      const m = col.config?.moneda || 'EUR';
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: m }).format(Number(v));
    }
    case 'porcentaje':
      return new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: col.config?.decimales ?? 2 }).format(Number(v));
    case 'numero':
      return new Intl.NumberFormat('es-ES', { maximumFractionDigits: col.config?.decimales ?? 10 }).format(Number(v));
    case 'duracion': {
      const s = Number(v); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
      return col.config?.formato === 'h:mm:ss'
        ? `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
        : `${h}:${String(m).padStart(2, '0')}`;
    }
    case 'fecha':
      // Se parte la cadena en vez de usar `new Date`: construir una fecha desde
      // «2026-07-14» la interpreta en UTC y en España se ve el día 13.
      return String(v).split('-').reverse().join('/');
    case 'casilla': return v ? 'Sí' : 'No';
    case 'seleccion': return col.opciones?.find(o => o.id === v)?.label ?? String(v);
    case 'seleccion_multiple':
      return (Array.isArray(v) ? v : [v]).map(id => col.opciones?.find(o => o.id === id)?.label ?? id).join(', ');
    default:
      if (APUNTAN.has(col.tipo)) return (extra?.apuntados || []).map(a => a.etiqueta).join(', ');
      if (FICHEROS.has(col.tipo)) return (extra?.archivos || []).map(a => a.nombre).join(', ');
      return String(v);
  }
}

export default function CeldaTabla({
  celda, columna, apuntados, archivos, editable, onGuardar,
}: {
  celda: Celda;
  columna: Columna;
  apuntados?: any[];
  archivos?: any[];
  editable: boolean;
  onGuardar: (valor: any) => Promise<{ error?: string } | void>;
}) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editando) ref.current?.focus(); }, [editando]);

  const puedeEditar = editable && !CALCULADOS.has(columna.tipo);

  const guardar = async (valor: any) => {
    setGuardando(true); setFallo(null);
    const r = await onGuardar(valor);
    setGuardando(false);
    // EL ERROR SE QUEDA EN LA CELDA, no en un aviso que tapa la pantalla. Es
    // donde el usuario está mirando y es la celda que tiene que corregir.
    if (r && 'error' in r && r.error) { setFallo(r.error); return false; }
    setEditando(false);
    return true;
  };

  // ── LO QUE NO SE PUEDE EDITAR ─────────────────────────────────────────────
  if (celda.estado === 'error') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1.5 text-rose-600" title={celda.mensaje}>
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs font-bold truncate">{celda.mensaje}</span>
      </div>
    );
  }
  if (celda.estado === 'sin_calcular') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1.5 text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="text-xs">Calculando…</span>
      </div>
    );
  }

  // ── CASILLA: se marca de un toque, sin entrar a editar ────────────────────
  if (columna.tipo === 'casilla') {
    const marcado = celda.estado === 'ok' && celda.valor === true;
    return (
      <button
        disabled={!puedeEditar || guardando}
        onClick={() => guardar(!marcado)}
        className={cn('w-full h-full min-h-[38px] grid place-items-center transition-colors',
          puedeEditar && 'hover:bg-slate-50')}
      >
        <span className={cn('w-5 h-5 rounded-md border-2 grid place-items-center transition-colors',
          marcado ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300')}>
          {marcado && <Check className="w-3.5 h-3.5" />}
        </span>
      </button>
    );
  }

  // ── VALORACIÓN: estrellas ─────────────────────────────────────────────────
  if (columna.tipo === 'valoracion') {
    const max = columna.config?.maximo ?? 5;
    const n = celda.estado === 'ok' ? Number(celda.valor) : 0;
    return (
      <div className="flex items-center gap-0.5 px-2 py-1.5">
        {Array.from({ length: max }, (_, i) => (
          <button key={i} disabled={!puedeEditar || guardando}
            // Pulsar la estrella que ya está puesta la quita: sin eso, una
            // valoración de 1 no se puede deshacer nunca.
            onClick={() => guardar(n === i + 1 ? '' : i + 1)}
            className={cn('transition-colors', puedeEditar && 'hover:scale-110')}>
            <Star className={cn('w-4 h-4', i < n ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
          </button>
        ))}
      </div>
    );
  }

  // ── LO QUE APUNTA Y LOS FICHEROS: se enseñan como fichas ──────────────────
  if (APUNTAN.has(columna.tipo) || FICHEROS.has(columna.tipo)) {
    const lista = APUNTAN.has(columna.tipo) ? (apuntados || []) : (archivos || []);
    if (!lista.length) return <Vacia />;
    return (
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5">
        {lista.map((x: any) => (
          <span key={x.id}
            title={x.existe === false ? 'Lo que había aquí ya no existe' : undefined}
            className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold max-w-[12rem]',
              x.existe === false ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-700')}>
            {FICHEROS.has(columna.tipo) && <Paperclip className="w-3 h-3 shrink-0" />}
            <span className="truncate">{x.etiqueta ?? x.nombre}</span>
          </span>
        ))}
      </div>
    );
  }

  // ── SELECCIÓN: pastillas de color ─────────────────────────────────────────
  if (columna.tipo === 'seleccion' || columna.tipo === 'seleccion_multiple') {
    const ids: string[] = celda.estado === 'ok'
      ? (Array.isArray(celda.valor) ? celda.valor : [celda.valor]) : [];
    if (!ids.length && !editando) return <Vacia onClick={puedeEditar ? () => setEditando(true) : undefined} />;
    if (!editando) {
      return (
        <div onClick={() => puedeEditar && setEditando(true)}
          className={cn('flex flex-wrap items-center gap-1 px-2 py-1.5 min-h-[38px]', puedeEditar && 'cursor-pointer')}>
          {ids.map(id => {
            const o = columna.opciones?.find(x => x.id === id);
            return (
              <span key={id} className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold"
                style={{ backgroundColor: (o?.color || '#e2e8f0') + '33', color: o?.color || '#475569' }}>
                {o?.label ?? id}
              </span>
            );
          })}
        </div>
      );
    }
    const multiple = columna.tipo === 'seleccion_multiple';
    return (
      <div className="p-1.5 bg-white border border-emerald-300 rounded-lg shadow-lg">
        {(columna.opciones || []).map(o => {
          const puesta = ids.includes(o.id);
          return (
            <button key={o.id}
              onClick={async () => {
                const siguiente = multiple
                  ? (puesta ? ids.filter(i => i !== o.id) : [...ids, o.id])
                  : (puesta ? '' : o.id);
                await guardar(siguiente);
                if (!multiple) setEditando(false);
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-bold text-left hover:bg-slate-50">
              <span className={cn('w-3.5 h-3.5 rounded border grid place-items-center',
                puesta ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300')}>
                {puesta && <Check className="w-2.5 h-2.5" />}
              </span>
              <span style={{ color: o.color || undefined }}>{o.label}</span>
            </button>
          );
        })}
        <button onClick={() => setEditando(false)} className="w-full mt-1 px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-600">Cerrar</button>
      </div>
    );
  }

  // ── TEXTO Y NÚMEROS ───────────────────────────────────────────────────────
  if (editando) {
    return (
      <div className="relative">
        <input
          ref={ref}
          // 16 px: por debajo de eso, Safari de iOS hace zoom sobre la página al
          // enfocar el campo y deja la tabla descolocada.
          className="w-full px-2 py-1.5 text-base sm:text-sm outline-none border-2 border-emerald-400 rounded-md bg-white"
          value={borrador}
          onChange={e => setBorrador(e.target.value)}
          onBlur={() => guardar(borrador)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); guardar(borrador); }
            if (e.key === 'Escape') { setEditando(false); setFallo(null); }
          }}
        />
        {fallo && (
          <p className="absolute left-0 top-full z-30 mt-0.5 px-2 py-1 bg-rose-600 text-white text-[11px] font-bold rounded-md shadow-lg whitespace-nowrap">
            {fallo}
          </p>
        )}
      </div>
    );
  }

  if (celda.estado === 'vacia') {
    return <Vacia onClick={puedeEditar ? () => { setBorrador(''); setEditando(true); } : undefined} />;
  }

  const texto = formatear(celda, columna, { apuntados, archivos });
  return (
    <div
      onClick={() => { if (puedeEditar) { setBorrador(valorParaEditar(celda, columna)); setEditando(true); } }}
      className={cn('px-2 py-1.5 min-h-[38px] text-sm truncate',
        CALCULADOS.has(columna.tipo) && 'text-slate-500 italic',
        ['numero', 'moneda', 'porcentaje', 'duracion'].includes(columna.tipo) && 'text-right tabular-nums',
        puedeEditar && 'cursor-text hover:bg-slate-50')}
      title={texto}
    >
      {columna.tipo === 'url'
        ? <a href={String(celda.valor)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
             className="inline-flex items-center gap-1 text-sky-700 hover:underline">
            {texto.replace(/^https?:\/\//, '').slice(0, 40)} <ExternalLink className="w-3 h-3" />
          </a>
        : texto}
    </div>
  );
}

/** Lo que se pone en el campo al empezar a editar: el valor CRUDO, no el
 *  formateado. Editar «1.500,00 €» obligaría al usuario a borrar el símbolo. */
function valorParaEditar(c: Celda, col: Columna): string {
  if (c.estado !== 'ok') return '';
  if (col.tipo === 'porcentaje') return String(Number(c.valor) * 100);
  if (col.tipo === 'duracion') {
    const s = Number(c.valor);
    return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
  }
  return String(c.valor);
}

function Vacia({ onClick }: { onClick?: () => void }) {
  return (
    <div onClick={onClick}
      className={cn('px-2 py-1.5 min-h-[38px] text-sm text-slate-300', onClick && 'cursor-text hover:bg-slate-50')}>
      —
    </div>
  );
}

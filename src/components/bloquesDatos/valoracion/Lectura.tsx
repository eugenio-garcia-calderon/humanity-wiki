import { useCallback, useEffect, useRef, useState } from 'react';
import { Star, BadgeCheck, Info, Loader2 } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { Button } from '../../ui/core';
import type { PropsLectura } from '../tipos';
import { valoracionPrecargada } from '../precarga';

// ============================================================================
// BLOQUE «VALORACIÓN DE LA COMUNIDAD» (3.3, Wikiproducts W4, 2026-10-18)
// ============================================================================
// One bar per criterion with the plain mean and the number of votes, and five
// stars to vote. What is shown follows the server's rules (`bd/comunidad.ts`):
// below 3 voters no number at all, only how far it is («1 de 3 votos»); the
// adjusted note that orders the gallery is explained, not displayed as THE
// note, because 3,75 for three people who all gave 5 reads as a mistake.

export type Criterio = {
  columna_id: string; nombre: string; criterio: string;
  media_de_criterios: boolean; solo_compradores: boolean; umbral: number;
  suficiente: boolean; nota: number | null; media: number | null;
  votos: number; verificados: number; media_verificados: number | null;
  reparto: number[] | null;
};
export type Respuesta = {
  fila_id: string; criterios: Criterio[]; mios: Record<string, number>;
  sesion: boolean; comprador_verificado: boolean;
  agregado: { ratingValue: number; ratingCount: number } | null;
  metodo: { peso_previo: number; peso_verificado: number; umbral: number };
};

const decimal = (n: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
const votos = (n: number) => `${n} ${n === 1 ? 'voto' : 'votos'}`;

/** The row behind this block: the one named in its data, or the page it sits on. */
export function usarValoraciones(clave: string | undefined) {
  // Read before the first paint when this is the page the server sent
  // (`precarga.ts`): the block is drawn at its final height from the start.
  const [inicial] = useState<Respuesta | null>(() => valoracionPrecargada(clave));
  const [datos, setDatos] = useState<Respuesta | null>(inicial);
  const [fallo, setFallo] = useState<{ codigo: number; texto: string } | null>(null);
  const cargar = useCallback(async () => {
    if (!clave) { setFallo({ codigo: 404, texto: 'Sin ficha' }); return; }
    try {
      const r = await fetch(`/api/valoraciones/fila/${encodeURIComponent(clave)}`, { credentials: 'include' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setFallo({ codigo: r.status, texto: j.error || 'No se pudo leer.' }); return; }
      setFallo(null); setDatos(j);
    } catch { setFallo({ codigo: 0, texto: 'Sin conexión.' }); }
  }, [clave]);
  const primera = useRef(!!inicial);
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    cargar();
  }, [cargar]);
  return { datos, fallo, cargar };
}

function Estrellas({ valor, onElegir, deshabilitado, nombre }: {
  valor: number; onElegir?: (n: number | null) => void; deshabilitado?: boolean; nombre: string;
}) {
  const [encima, setEncima] = useState(0);
  const pintar = encima || valor;
  return (
    <div className="flex items-center" role="radiogroup" aria-label={`Tu nota de ${nombre}`} onMouseLeave={() => setEncima(0)}>
      {[1, 2, 3, 4, 5].map(n => (
        <Button key={n} variant="ghost" type="button" role="radio" aria-checked={valor === n}
          aria-label={`${n} de 5`} disabled={deshabilitado || !onElegir}
          title={valor === n ? 'Quitar mi voto' : `${n} de 5`}
          onMouseEnter={() => setEncima(n)}
          // Pulsar la estrella que ya está puesta quita el voto.
          onClick={() => onElegir?.(valor === n ? null : n)}
          className="h-9 w-8 !px-0 !py-0 disabled:opacity-40">
          <Star className={cn('h-5 w-5', n <= pintar ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
        </Button>
      ))}
    </div>
  );
}

export function Valoraciones({ datos, recargar }: { datos: Respuesta; recargar: () => void }) {
  const [guardando, setGuardando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mios, setMios] = useState(datos.mios);
  useEffect(() => setMios(datos.mios), [datos.mios]);

  const votar = async (c: Criterio, nota: number | null) => {
    setGuardando(c.columna_id); setAviso(null);
    const antes = mios[c.columna_id];
    setMios(m => { const x = { ...m }; if (nota === null) delete x[c.columna_id]; else x[c.columna_id] = nota; return x; });
    try {
      const r = await fetch(`/api/valoraciones/fila/${encodeURIComponent(datos.fila_id)}`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columna_id: c.columna_id, nota }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setAviso(j.error || 'No se pudo guardar tu voto.');
        setMios(m => ({ ...m, [c.columna_id]: antes }));
      } else recargar();
    } catch {
      setAviso('Sin conexión: tu voto no se ha guardado.');
      setMios(m => ({ ...m, [c.columna_id]: antes }));
    }
    setGuardando(null);
  };

  const general = datos.criterios.find(c => c.media_de_criterios);
  const criterios = datos.criterios.filter(c => !c.media_de_criterios);
  const resumen = datos.agregado;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-sm" aria-label="Puntuación de la comunidad">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900">Puntuación de la comunidad</h3>
          <p className="text-xs text-slate-500">
            {resumen
              ? `${resumen.ratingCount} ${resumen.ratingCount === 1 ? 'persona ha' : 'personas han'} puntuado`
              : `Todavía no tiene nota. Si lo has usado, puntúalo: con ${datos.metodo.umbral} votos por criterio aparece.`}
          </p>
        </div>
        {(general?.media ?? resumen?.ratingValue) != null ? (
          <p className="flex items-baseline gap-1">
            <Star className="h-5 w-5 self-center fill-amber-400 text-amber-400" />
            <span className="text-3xl font-black text-slate-900">{decimal((general?.media ?? resumen!.ratingValue) as number)}</span>
            <span className="text-sm font-bold text-slate-400">/ 5</span>
          </p>
        ) : (
          <p className="text-sm font-bold text-slate-500">Aún sin nota</p>
        )}
      </header>

      <ul className="mt-4 space-y-3">
        {criterios.map(c => {
          const mio = mios[c.columna_id] || 0;
          const bloqueado = c.solo_compradores && !datos.comprador_verificado;
          return (
            <li key={c.columna_id} className="grid grid-cols-1 gap-1 sm:grid-cols-[9rem_1fr_auto] sm:items-center sm:gap-3">
              <span className="text-sm font-bold text-slate-700">{c.nombre}</span>
              <div className="min-w-0">
                {c.suficiente && c.media !== null ? (
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${(c.media / 5) * 100}%` }} />
                    </div>
                    <span className="w-24 shrink-0 text-xs text-slate-600">
                      <b className="text-slate-900">{decimal(c.media)}</b> · {votos(c.votos)}
                    </span>
                  </div>
                ) : (
                  // Not «no hay votos»: how far it is, so a new sheet reads as
                  // an invitation and not as an empty page.
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1" aria-hidden>
                      {Array.from({ length: c.umbral }, (_, i) => (
                        <span key={i} className={cn('h-2 w-5 rounded-full', i < c.votos ? 'bg-amber-400' : 'bg-slate-200')} />
                      ))}
                    </div>
                    <span className="text-xs text-slate-500">
                      {c.votos} de {c.umbral} votos
                      {c.umbral - c.votos > 0 && <span className="text-slate-400"> · {c.umbral - c.votos === 1 ? 'falta 1' : `faltan ${c.umbral - c.votos}`} para la nota</span>}
                    </span>
                  </div>
                )}
                {c.suficiente && c.verificados > 0 && c.media_verificados !== null && (
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-700">
                    <BadgeCheck className="h-3.5 w-3.5" /> Compradores verificados: {decimal(c.media_verificados)} ({c.verificados})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {datos.sesion && !bloqueado && <span className="text-[11px] font-bold text-slate-400">{mio ? 'Tu nota' : 'Puntúa'}</span>}
                {guardando === c.columna_id && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                {datos.sesion && !bloqueado
                  ? <Estrellas nombre={c.nombre} valor={mio} deshabilitado={guardando !== null} onElegir={n => votar(c, n)} />
                  : bloqueado && datos.sesion
                    ? <span className="text-[11px] text-slate-400">Lo puntúa quien compró aquí</span>
                    : null}
              </div>
            </li>
          );
        })}
      </ul>

      {!datos.sesion && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 p-3">
          <p className="text-xs text-slate-700">
            <b>¿Lo has usado?</b> Tu nota ayuda a quien viene detrás. Un voto por persona y criterio; puedes cambiarlo cuando quieras.
          </p>
          <Button variant="primary" className="gap-1.5" onClick={() => {
            // The site's account menu (`CuentaMenu`) opens its sign-in panel
            // and marks the event as handled. Outside a site there is none.
            const ev = new CustomEvent('sitio:entrar', { cancelable: true });
            if (window.dispatchEvent(ev)) setAviso('Para puntuar necesitas entrar con tu cuenta en este sitio.');
          }}>
            <Star className="h-4 w-4" /> Entrar para puntuar
          </Button>
        </div>
      )}
      {aviso && <p role="alert" className="mt-3 text-xs font-bold text-rose-600">{aviso}</p>}

      <details className="mt-4 text-[11px] text-slate-500">
        <summary className="flex cursor-pointer items-center gap-1 font-bold text-slate-500"><Info className="h-3.5 w-3.5" /> Cómo se calcula y cómo se ordena</summary>
        <p className="mt-1.5 leading-relaxed">
          Cada persona da una nota de 1 a 5 por criterio. Quien lo compró a través de la plataforma cuenta {datos.metodo.peso_verificado} veces.
          La nota que ves es la media de esos votos, y sólo se enseña con {datos.metodo.umbral} votos o más.
          Para ordenar usamos una media ajustada, que parte de un 3 con el peso de {datos.metodo.peso_previo} votos: así un producto con
          tres cincos no adelanta a uno con trescientos votos de 4,6. La comisión que cobramos nunca entra en este cálculo.
        </p>
      </details>
    </section>
  );
}

export default function Lectura({ datos, paginaId }: PropsLectura) {
  const clave = (typeof datos.fila_id === 'string' && datos.fila_id) || paginaId;
  const { datos: r, fallo, cargar } = usarValoraciones(clave);
  // On a page that is not a row, or a table without criteria, the reader sees
  // nothing: there is nothing to rate here. The editor says why.
  if (fallo || !r || !r.criterios.length) return null;
  return <Valoraciones datos={r} recargar={cargar} />;
}

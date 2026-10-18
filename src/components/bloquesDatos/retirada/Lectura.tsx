import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import TextoConEnlaces from '../../ui/TextoConEnlaces';
import type { PropsLectura } from '../tipos';
import { useFicha } from '../ficha/useFicha';
import { vistaRetiradas, fraseSinRetiradas } from '../ficha/vistas';
import { sitioDe } from '../ficha/modelo';
import { Cargando, Seccion, SinFila } from '../ficha/comunes';

// RECALLS AND SAFETY ALERTS (plan §3.7). The one block where «nothing» has
// two meanings that must never look alike: «we searched, there are none»
// (green, with the date and where we searched) and «nobody has checked yet»
// (grey). See `vistaRetiradas`.

export function VistaRetiradas({ datos, paginaId, enEditor }: PropsLectura & { enEditor?: boolean }) {
  const manual = datos.modo === 'manual';
  const { ficha, cargando } = useFicha(manual ? undefined : paginaId);
  if (cargando) return <Cargando />;
  if (!manual && !ficha) return enEditor ? <SinFila que="En modo «esta fila», este bloque enseña las retiradas enlazadas a la fila." /> : null;
  const v = vistaRetiradas(manual ? null : ficha, datos);
  if (!v) return enEditor ? <p className="text-sm text-slate-400">La base de datos de esta fila no tiene columna de retiradas.</p> : null;
  return (
    <Seccion titulo={v.titulo}>
      {v.estado === 'hay' ? (
        <ul className="space-y-3">
          {v.items.map((r, i) => (
            <li key={i} className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
              <p className="flex items-start gap-1.5 font-semibold text-rose-900"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {r.titulo}</p>
              <p className="mt-0.5 text-xs text-slate-600">{[r.fecha, r.organismo, r.pais].filter(Boolean).join(' · ')}{r.referencia ? ` · Ref. ${r.referencia}` : ''}</p>
              {r.motivo ? <p className="mt-1.5 text-sm text-slate-700"><TextoConEnlaces texto={r.motivo} /></p> : null}
              {r.enlace ? <a href={r.enlace} target="_blank" rel="noopener nofollow" className="mt-1 inline-block text-xs text-sky-700 hover:underline">Aviso oficial ({sitioDe(r.enlace)})</a> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={v.estado === 'ninguna' ? 'flex items-start gap-1.5 text-sm text-emerald-800' : 'flex items-start gap-1.5 text-sm text-slate-500'}>
          {v.estado === 'ninguna' ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> : <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{fraseSinRetiradas(v)}</span>
        </p>
      )}
      {v.busqueda && v.estado !== 'sin_comprobar' ? <p className="mt-1 text-[11px] text-slate-400">Dónde se buscó: <TextoConEnlaces texto={v.busqueda} /></p> : null}
    </Seccion>
  );
}

export default function Lectura(p: PropsLectura) {
  return <VistaRetiradas {...p} />;
}

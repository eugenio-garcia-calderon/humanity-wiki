import { Badge } from '../../ui/core';
import TextoConEnlaces from '../../ui/TextoConEnlaces';
import type { PropsLectura } from '../tipos';
import { useFicha } from '../ficha/useFicha';
import { vistaAfirmaciones, ETIQUETA_VEREDICTO, type Veredicto } from '../ficha/vistas';
import { sitioDe } from '../ficha/modelo';
import { Cargando, Seccion, SinFila } from '../ficha/comunes';

// VERIFIED CLAIMS (plan §3.7): what the advertising says, the verdict and
// why, with sources. False ones first (`vistaAfirmaciones`).

export const VARIANTE_VEREDICTO: Record<Veredicto, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  cierta: 'success', matizable: 'warning', falsa: 'danger', sin_pruebas: 'info', desconocido: 'default',
};

export function VistaAfirmaciones({ datos, paginaId, enEditor }: PropsLectura & { enEditor?: boolean }) {
  const manual = datos.modo === 'manual';
  const { ficha, cargando } = useFicha(manual ? undefined : paginaId);
  if (cargando) return <Cargando />;
  if (!manual && !ficha) return enEditor ? <SinFila que="En modo «esta fila», este bloque enseña las afirmaciones enlazadas a la fila." /> : null;
  const v = vistaAfirmaciones(manual ? null : ficha, datos);
  if (!v) return enEditor ? <p className="text-sm text-slate-400">Sin afirmaciones todavía.</p> : null;
  return (
    <Seccion titulo={v.titulo}>
      {v.vacia ? <p className="text-base text-slate-500">{v.vacia}</p> : (
        <ul className="space-y-3">
          {v.items.map((a, i) => (
            <li key={i} className="rounded-xl border border-slate-100 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <q className="font-semibold text-slate-800">{a.texto}</q>
                <Badge variant={VARIANTE_VEREDICTO[a.veredicto]}>{ETIQUETA_VEREDICTO[a.veredicto]}</Badge>
              </div>
              {a.explicacion ? <p className="mt-1.5 text-base leading-relaxed text-slate-700"><TextoConEnlaces texto={a.explicacion} /></p> : null}
              <p className="mt-1 text-sm text-slate-500">
                {a.donde ? <>Dónde se dice: <a href={a.donde} target="_blank" rel="noopener nofollow" className="hover:underline">{sitioDe(a.donde) || a.donde}</a>. </> : null}
                {a.fecha ? <>Revisada el {a.fecha}. </> : null}
              </p>
              {a.fuentes ? <p className="mt-0.5 text-sm text-slate-500">Fuentes: <TextoConEnlaces texto={a.fuentes} /></p> : null}
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}

export default function Lectura(p: PropsLectura) {
  return <VistaAfirmaciones {...p} />;
}

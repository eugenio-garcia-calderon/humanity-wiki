import { useEffect, useMemo, useState } from 'react';
import type { PropsLectura } from '../tipos';
import { ponerFiltroPagina } from './filtroPagina';
import ElegirTerritorio, { territorioGuardado, guardarTerritorio, useTerritorios } from './ElegirTerritorio';
import { tonosDeNota, textoNota, textoSobre, colorDeNota } from '../../../utils/nota';

// ============================================================================
// EL FILTRO DE TERRITORIO (2026-10-25, Eugenio)
// ============================================================================
// «Un filtro de territorio y por defecto España seleccionado.» `datos`:
//   tabla_id  — la base de datos que se filtra (está en la misma página)
//   columna_id — su relación con la base de datos de territorios
//   defecto   — la fila del territorio que viene elegida (España)
// Se puede elegir cualquier territorio de su base de datos (2026-10-25: «en
// grande la posibilidad de escoger otro»); los que aún no tienen notas lo
// dicen en el resumen. La elección va en la dirección (`?territorio=`).

type Opcion = { id: string; nombre: string };

export function SelectorTerritorio({ datos }: { datos: Record<string, unknown> }) {
  const tablaId = String(datos.tabla_id || ''), columnaId = String(datos.columna_id || ''), defecto = String(datos.defecto || '');
  const [usados, setUsados] = useState<Opcion[]>([]);
  const [tablaTerritorios, setTablaTerritorios] = useState<string | null>(null);
  // Las notas de cada entrada por territorio, para el resumen (media, mejor y peor).
  const [notas, setNotas] = useState<Array<{ nombre: string; nota: number; territorios: string[] }>>([]);
  const [elegido, setElegido] = useState<string>(() => territorioGuardado(defecto));
  useEffect(() => {
    if (!tablaId || !columnaId) return;
    fetch(`/api/bd/tablas/${encodeURIComponent(tablaId)}`, { credentials: 'include' }).then(r => (r.ok ? r.json() : null)).then(j => {
      const vistos = new Map<string, string>();
      for (const f of j?.filas || []) for (const a of f.apuntados?.[columnaId] || []) vistos.set(a.id, a.etiqueta || 'Sin nombre');
      setUsados([...vistos].map(([id, nombre]) => ({ id, nombre })));
      setTablaTerritorios((j?.columnas || []).find((c: any) => c.id === columnaId)?.config?.tabla_destino || null);
      const colNota = (j?.columnas || []).find((c: any) => c.tipo === 'nota');
      const colT = j?.columna_titulo;
      if (colNota) setNotas((j.filas || []).filter((f: any) => f.celdas?.[colNota.id]?.estado === 'ok').map((f: any) => ({
        nombre: String(f.pagina?.titulo || (colT && f.celdas?.[colT]?.valor) || ''), nota: Number(f.celdas[colNota.id].valor),
        territorios: (f.apuntados?.[columnaId] || []).map((a: any) => a.id),
      })));
    }).catch(() => {});
  }, [tablaId, columnaId]);
  const opciones = useTerritorios(tablaTerritorios, usados);
  const conDatos = useMemo(() => new Set(usados.map(o => o.id)), [usados]);
  // Un `?territorio=` que no es ningún territorio: se vuelve al de por defecto.
  useEffect(() => { if (tablaTerritorios && opciones.length > usados.length && !opciones.some(o => o.id === elegido)) setElegido(defecto); }, [opciones]); // eslint-disable-line react-hooks/exhaustive-deps
  // La elección (también la de por defecto) se dice a las bases de datos de la página.
  useEffect(() => { if (tablaId && columnaId && elegido) ponerFiltroPagina(tablaId, { columna_id: columnaId, valor: elegido }); }, [tablaId, columnaId, elegido]);
  const elegir = (id: string) => { setElegido(id); guardarTerritorio(id, defecto); };
  if (!tablaId || !columnaId) return <p className="rounded-xl border border-dashed border-slate-300 p-3 text-center text-xs font-bold text-slate-400">Elige qué base de datos filtra este bloque.</p>;
  const nombre = opciones.find(o => o.id === elegido)?.nombre || '…';
  // EL RESUMEN DEL TERRITORIO (bot evaluador, ronda 1): la media en grande, lo mejor y lo peor, y la leyenda de colores.
  const suyas = notas.filter(x => x.territorios.includes(elegido));
  const media = suyas.length ? suyas.reduce((a, x) => a + x.nota, 0) / suyas.length : null;
  const max = suyas.length ? Math.max(...suyas.map(x => x.nota)) : null, min = suyas.length ? Math.min(...suyas.map(x => x.nota)) : null;
  const nombres = (v: number | null) => suyas.filter(x => x.nota === v).map(x => x.nombre);
  const lista = (xs: string[]) => xs.length <= 2 ? xs.join(' y ') : `${xs.slice(0, 2).join(', ')} y ${xs.length - 2} más`;
  const vuelta = defecto && elegido !== defecto ? opciones.find(o => o.id === defecto) : null;
  // UN SOLO RECUADRO (2026-10-25, Eugenio: «España a la izquierda y la nota media
  // a la derecha en el mismo recuadro unificado»): el territorio, lo mejor y lo
  // peor con la leyenda en medio, y la media en grande a la derecha.
  const circulo = media !== null && (
    <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full font-black tabular-nums shadow-md" style={{ backgroundColor: colorDeNota(media), color: textoSobre(colorDeNota(media)) }}
      aria-label={`Media de ${nombre}: ${textoNota(Math.round(media * 10) / 10)} sobre 10`}>
      <span className="flex items-baseline text-4xl">{textoNota(Math.round(media * 10) / 10)}<span className="ml-0.5 text-sm font-semibold">/10</span></span>
    </span>
  );
  const centro = media !== null ? (
    <div data-resumen-territorio className="min-w-0">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Media de {nombre} · {suyas.length} sistemas</p>
      <p className="mt-1 text-sm text-slate-700"><b className="font-black" style={{ color: tonosDeNota(max!).tinta }}>Mejor:</b> {lista(nombres(max))} ({textoNota(max)}) · <b className="font-black" style={{ color: tonosDeNota(min!).tinta }}>Peor:</b> {lista(nombres(min))} ({textoNota(min)})</p>
      <div className="mt-3" aria-label="Escala de colores del 1 al 10">
        <div className="flex h-3 overflow-hidden rounded-full">{Array.from({ length: 10 }, (_, i) => <span key={i} className="flex-1" style={{ backgroundColor: colorDeNota(i + 1) }} />)}</div>
        <div className="mt-1 flex justify-between text-[11px] font-bold text-slate-500"><span>1 · lo más urgente</span><span>10 · resuelto</span></div>
      </div>
    </div>
  ) : notas.length > 0 && nombre !== '…' ? (
    <div data-sin-notas className="min-w-0">
      <p className="text-base font-black text-slate-800">Todavía no hay notas para {nombre}.</p>
      <p className="mt-1 text-sm text-slate-500">Las notas se van poniendo territorio a territorio.</p>
      {vuelta && <button type="button" onClick={() => elegir(vuelta.id)} className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700">Ver {vuelta.nombre}</button>}
    </div>
  ) : null;
  return (
    <div data-filtro-territorio className="mx-auto my-6 grid max-w-5xl items-center gap-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-[auto_1fr_auto] lg:gap-8">
      <div className="flex justify-center lg:border-r lg:border-slate-100 lg:pr-6">
        <ElegirTerritorio sinMarco opciones={opciones} conDatos={conDatos} elegido={elegido} onElegir={elegir} />
      </div>
      {centro || <span />}
      {/* La media: a la derecha en el ordenador; en el móvil, centrada al final. */}
      {circulo && <div className="flex justify-center lg:pl-2">{circulo}</div>}
    </div>
  );
}

export default function Lectura({ datos }: PropsLectura) {
  return <SelectorTerritorio datos={datos} />;
}

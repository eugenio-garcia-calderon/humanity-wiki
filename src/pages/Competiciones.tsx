import { useMemo, useState } from 'react';
import { Card, Button } from '../components/ui/core';
import { COMPETICIONES, GRUPOS, type AmbitoCompeticion, type GrupoCompeticion } from '../data/competiciones';

// Página «Competiciones» (2026-11-18). Catálogo de competiciones con grupo (1 estudiantil … 5 élite), ámbito, categoría
// e ingresos. Se ordena por grupo, ingresos, nombre o categoría. Los ingresos sin fuente pública van al final.
type Orden = 'grupo' | 'ingresos' | 'nombre' | 'categoria';

export default function Competiciones() {
  const [grupo, setGrupo] = useState<GrupoCompeticion | 0>(0);
  const [ambito, setAmbito] = useState<AmbitoCompeticion | 'todos'>('España');
  const [orden, setOrden] = useState<Orden>('grupo');

  const lista = useMemo(() => {
    const filtrada = COMPETICIONES.filter(c =>
      (grupo === 0 || c.grupo === grupo) && (ambito === 'todos' || c.ambito === ambito));
    const cmp: Record<Orden, (a: typeof filtrada[number], b: typeof filtrada[number]) => number> = {
      grupo: (a, b) => a.grupo - b.grupo || a.nombre.localeCompare(b.nombre),
      ingresos: (a, b) => (b.ingresos ?? -1) - (a.ingresos ?? -1) || a.nombre.localeCompare(b.nombre),
      nombre: (a, b) => a.nombre.localeCompare(b.nombre),
      categoria: (a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre),
    };
    return [...filtrada].sort(cmp[orden]);
  }, [grupo, ambito, orden]);

  const chip = (activo: boolean) => `rounded-full border px-3 py-1 text-sm ${activo ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-700'}`;

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Competiciones</h1>
        <p className="text-sm text-slate-600">
          Competiciones de motor e innovación, de la estudiantil a la élite. Segundo lote: España, grupos estudiantil, aficionados, semiprofesional y profesional.
          Los ingresos sólo aparecen cuando una fuente pública los da; el resto no se publica.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Grupo">
        <button type="button" className={chip(grupo === 0)} onClick={() => setGrupo(0)}>Todos los grupos</button>
        {(Object.keys(GRUPOS) as unknown as GrupoCompeticion[]).map(g => (
          <button key={g} type="button" className={chip(grupo === g)} onClick={() => setGrupo(g)}>{g}. {GRUPOS[g]}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Ámbito">
        {(['España', 'Europa', 'Mundo', 'todos'] as const).map(a => (
          <button key={a} type="button" className={chip(ambito === a)} onClick={() => setAmbito(a)}>{a === 'todos' ? 'Todos los ámbitos' : a}</button>
        ))}
        <label className="ml-auto text-sm text-slate-700">
          Ordenar por{' '}
          <select className="rounded border border-slate-300 bg-white px-2 py-1" value={orden} onChange={e => setOrden(e.target.value as Orden)}>
            <option value="grupo">Grupo</option>
            <option value="ingresos">Ingresos</option>
            <option value="categoria">Categoría</option>
            <option value="nombre">Nombre</option>
          </select>
        </label>
      </div>

      {lista.length === 0 ? (
        <Card className="p-4 text-sm text-slate-600">No hay competiciones con esos filtros todavía.</Card>
      ) : (
        <ul className="space-y-3">
          {lista.map(c => (
            <li key={c.id}>
              <Card className="space-y-2 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{c.nombre}</h2>
                  <span className="text-xs text-slate-500">{c.grupo}. {GRUPOS[c.grupo]} · {c.ambito}</span>
                </div>
                <p className="text-sm text-slate-700"><strong>Categoría:</strong> {c.categoria}</p>
                <p className="text-sm text-slate-700">{c.que}</p>
                <p className="text-sm text-slate-700"><strong>Organiza:</strong> {c.organiza}</p>
                <p className="text-sm text-slate-700">
                  <strong>Ingresos:</strong> {c.ingresos === null ? 'no publicados' : `${c.ingresos.toLocaleString('es-ES')} €`}. {c.ingresosNota}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {c.fuentes.map(f => (
                    <a key={f} href={f} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-600 underline">Fuente</a>
                  ))}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="pt-2 text-xs text-slate-500">
        <Button variant="ghost" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Volver arriba</Button>
      </p>
    </div>
  );
}

// «Quién legisla qué»: the layers that write rules today for one matter, and
// what each would do with the proposal. Data: src/data/legal.ts (MATERIAS, NIVELES).
import { useState } from 'react';
import { ESCALA, numero } from '../../data/modeloSocioeconomico';
import { FUENTE_LEGAL, MATERIAS, MUNICIPIOS_ZBE, NIVELES, NORMAS, TEXTOS_MAXIMOS, type NivelId } from '../../data/legal';
import { Fuente, Muestra, Segmentado } from './piezas';
import { cn } from '../../utils/cn';

/** Which levels write a rule of their own on each matter today (the rest only apply or help). */
const ESCRIBEN_HOY: Record<string, NivelId[]> = {
  ruido: ['ue', 'estado', 'ccaa', 'municipio'],
  licencias: ['ue', 'estado', 'ccaa', 'municipio'],
  aire: ['ue', 'estado', 'ccaa', 'municipio'],
  residuos: ['ue', 'estado', 'ccaa', 'municipio'],
  suelo: ['estado', 'ccaa', 'municipio'],
};

export function F({ id }: { id: string }) {
  const f = FUENTE_LEGAL[id];
  return f ? <Fuente url={f.url} titulo={f.titulo} /> : null;
}

export function LegalDiagrama() {
  const [materiaId, setMateria] = useState(MATERIAS[0].id);
  const [vista, setVista] = useState<'hoy' | 'propuesta'>('hoy');
  const m = MATERIAS.find(x => x.id === materiaId)!;
  const escriben = vista === 'hoy' ? ESCRIBEN_HOY[m.id] : (['estado'] as NivelId[]);
  const maxTextos = m.id === 'suelo' ? 1 + NORMAS.ccaa + NORMAS.municipios : TEXTOS_MAXIMOS;

  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <figcaption className="text-lg font-bold text-slate-900">Quién escribe las reglas de…</figcaption>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Segmentado etiqueta="Materia" valor={materiaId} onChange={setMateria}
          opciones={MATERIAS.map(x => ({ id: x.id, texto: x.nombre }))} />
        <Segmentado<'hoy' | 'propuesta'> etiqueta="Hoy o con la propuesta" valor={vista} onChange={setVista}
          opciones={[{ id: 'hoy' as const, texto: 'Hoy' }, { id: 'propuesta' as const, texto: 'Con la propuesta' }]} />
      </div>

      <div className={cn('mt-5 rounded-xl px-4 py-3 text-[15px] leading-snug',
        vista === 'hoy' ? 'bg-rose-50 text-rose-900' : 'bg-emerald-50 text-emerald-900')}>
        {vista === 'hoy' && m.id === 'aire' ? (
          <>Las reglas para entrar en coche en una zona de bajas emisiones pueden ser distintas en <strong className="tabular-nums">al menos {numero(MUNICIPIOS_ZBE)} ciudades</strong>, las de más de 50.000 habitantes, que están obligadas a tener una. Cada una decide qué coches entran, cuándo y con qué multa.</>
        ) : vista === 'hoy' ? (
          <>Para una empresa que trabaja en toda España, las reglas sobre {m.nombre.toLowerCase()} pueden estar en <strong className="tabular-nums">hasta {numero(maxTextos)} textos distintos</strong>: {m.id === 'suelo' ? '' : 'el europeo, '}el del Estado, el de cada comunidad y el de cada ayuntamiento.</>
        ) : (
          <><strong>Un solo texto</strong>, el mismo en todo el país. Las escalas pequeñas no escriben otro: solo ajustan lo que ese texto les deja, y lo aplican.</>
        )}
      </div>

      <ol className="mt-5 space-y-2" aria-label={`Quién hace qué en ${m.nombre.toLowerCase()}, ${vista === 'hoy' ? 'hoy' : 'con la propuesta'}`}>
        {NIVELES.map(n => {
          const escribe = escriben.includes(n.id);
          return (
            <li key={n.id} className={cn('grid gap-x-4 gap-y-1 rounded-xl border p-3 sm:grid-cols-[250px_1fr]',
              escribe ? (vista === 'hoy' ? 'border-rose-300 bg-rose-50/40' : 'border-emerald-300 bg-emerald-50/50') : 'border-slate-200')}>
              <div className="flex items-start gap-2">
                <Muestra color={ESCALA[n.escala].color} className="mt-1.5" />
                <div>
                  <p className="font-semibold leading-snug text-slate-900">{n.nombre}</p>
                  <p className="text-xs text-slate-500">{n.cuantos}{n.id === 'municipio' && <F id="ine-municipios" />}</p>
                </div>
              </div>
              <div className="text-[15px] leading-snug text-slate-700">
                {escribe && (
                  <span className={cn('mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold',
                    vista === 'hoy' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800')}>
                    {vista === 'hoy' ? 'escribe su norma' : 'escribe la norma común'}
                  </span>
                )}
                {vista === 'hoy' ? m.hoy[n.id] : m.propuesta[n.id]}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        {vista === 'hoy' && m.id === 'aire'
          ? <>Recuento hecho con el padrón del INE de 2021. También están obligadas las islas y los municipios de más de 20.000 habitantes con mal aire, así que el número real es mayor.{m.fuentes.map(f => <F key={f} id={f} />)}</>
          : vista === 'hoy'
          ? <>«Hasta» es el máximo posible: no todos los municipios tienen ordenanza propia de cada cosa, y no hay un recuento oficial de ordenanzas municipales.{m.fuentes.map(f => <F key={f} id={f} />)}</>
          : <>Con la propuesta, la Unión Europea escribiría a futuro la norma común de lo que cruza fronteras, y la nación la del resto. Los colores son los de las ocho escalas del modelo.</>}
      </p>
    </figure>
  );
}

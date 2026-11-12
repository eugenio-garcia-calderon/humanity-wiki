// «Quién depende de quién» in the «Seguridad» window: today's chain of command
// for every security force, and the proposal's single body of guardianes, as
// one figure with a toggle. Plain boxes (not SVG) so it stacks on a phone.
import { useState, type ReactNode } from 'react';
import { ArrowDown, Eye } from 'lucide-react';
import { ESCALA, numero } from '../../data/modeloSocioeconomico';
import { ERTZAINTZA, FORAL, FUERZAS_ARMADAS, GUARDIA_CIVIL, LOCALES, MOSSOS, MUNICIPIOS_CON_POLICIA, POLICIA_NACIONAL } from '../../data/seguridad';
import { Muestra, Segmentado } from './piezas';
import { cn } from '../../utils/cn';

type Vista = 'hoy' | 'propuesta';

export function SeguridadMando() {
  const [vista, setVista] = useState<Vista>('hoy');
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <figcaption className="text-lg font-bold text-slate-900">Quién depende de quién</figcaption>
        <Segmentado<Vista> etiqueta="Ver el esquema de hoy o el de la propuesta" valor={vista} onChange={setVista}
          opciones={[{ id: 'hoy', texto: 'Hoy' }, { id: 'propuesta', texto: 'Con la propuesta' }]} />
      </div>
      {vista === 'hoy' ? <Hoy /> : <Propuesta />}
    </figure>
  );
}

function Caja({ titulo, children, tono = 'claro', className }: { titulo: ReactNode; children?: ReactNode; tono?: 'oscuro' | 'claro' | 'rojo' | 'verde' | 'gris'; className?: string }) {
  return (
    <div className={cn('rounded-xl border px-3 py-2.5 text-sm', {
      'border-slate-900 bg-slate-900 text-white': tono === 'oscuro',
      'border-slate-200 bg-slate-50 text-slate-800': tono === 'claro',
      'border-rose-200 bg-rose-50 text-slate-800': tono === 'rojo',
      'border-emerald-200 bg-emerald-50 text-slate-800': tono === 'verde',
      'border-dashed border-slate-300 bg-white text-slate-700': tono === 'gris',
    }, className)}>
      <p className="font-semibold leading-snug">{titulo}</p>
      {children && <div className={cn('mt-0.5 leading-snug', tono === 'oscuro' ? 'text-slate-300' : 'text-slate-600')}>{children}</div>}
    </div>
  );
}

const Flecha = ({ texto }: { texto?: string }) => (
  <div className="flex items-center justify-center gap-1.5 py-1 text-xs text-slate-500">
    <ArrowDown aria-hidden className="h-4 w-4" />{texto}
  </div>
);

function Hoy() {
  return (
    <div role="img" aria-label={`Hoy: el Gobierno de España manda en las Fuerzas Armadas (Defensa), la Policía Nacional y la Guardia Civil (Interior, y Defensa en misiones militares). Cuatro comunidades autónomas tienen su policía: Mossos, Ertzaintza, Policía Foral y Policía Canaria. Unos ${numero(MUNICIPIOS_CON_POLICIA)} ayuntamientos tienen cada uno su policía local. Se coordinan en juntas.`}>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {/* State */}
        <div className="rounded-2xl border border-slate-200 p-3">
          <Caja tono="oscuro" titulo="Gobierno de España">Dos ministerios distintos</Caja>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <Caja titulo="Ministerio de Defensa" />
              <Flecha />
              <Caja tono="gris" titulo="Fuerzas Armadas">{numero(FUERZAS_ARMADAS)} personas</Caja>
            </div>
            <div>
              <Caja titulo="Ministerio del Interior" />
              <Flecha />
              <div className="space-y-2">
                <Caja tono="rojo" titulo="Policía Nacional">{numero(POLICIA_NACIONAL)}</Caja>
                <Caja tono="rojo" titulo="Guardia Civil">{numero(GUARDIA_CIVIL)}; también depende de Defensa</Caja>
              </div>
            </div>
          </div>
        </div>
        {/* Regions */}
        <div className="rounded-2xl border border-slate-200 p-3">
          <Caja tono="oscuro" titulo="Comunidades autónomas">4 de las 17 tienen su policía</Caja>
          <Flecha />
          <div className="grid grid-cols-2 gap-2">
            <Caja tono="rojo" titulo="Mossos d’Esquadra">Cataluña · {numero(MOSSOS)}</Caja>
            <Caja tono="rojo" titulo="Ertzaintza">País Vasco · {numero(ERTZAINTZA)}</Caja>
            <Caja tono="rojo" titulo="Policía Foral">Navarra · ≈ {numero(FORAL)}</Caja>
            <Caja tono="rojo" titulo="Policía Canaria">Canarias · unos cientos</Caja>
          </div>
          <p className="mt-2 text-xs leading-snug text-slate-500">Las otras 13 solo coordinan a las policías locales de su territorio.</p>
        </div>
        {/* Municipalities */}
        <div className="rounded-2xl border border-slate-200 p-3">
          <Caja tono="oscuro" titulo="Ayuntamientos">Unos {numero(MUNICIPIOS_CON_POLICIA)} tienen policía</Caja>
          <Flecha />
          <div className="grid grid-cols-3 gap-1.5" aria-hidden>
            {Array.from({ length: 9 }, (_, i) => <span key={i} className="h-7 rounded-md border border-rose-200 bg-rose-50" />)}
          </div>
          <Caja tono="rojo" className="mt-2" titulo={`≈ ${numero(MUNICIPIOS_CON_POLICIA)} policías locales distintas`}>≈ {numero(LOCALES)} agentes, cada cuerpo con su jefe, su uniforme y su sueldo</Caja>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600">
        <strong className="text-slate-800">Cómo se coordinan:</strong> en juntas de seguridad (Estado con cada comunidad que tiene policía, y Estado con cada ayuntamiento) y en un consejo de ministros y consejeros de interior. Coordinan, pero no mandan: cada cuerpo sigue teniendo su jefe.
      </div>
    </div>
  );
}

const SECCIONES: { escala: 'municipio' | 'provincia' | 'region' | 'nacion' | 'continente'; t: string; d: string }[] = [
  { escala: 'municipio', t: 'Municipio', d: 'Guardianes de barrio' },
  { escala: 'provincia', t: 'Provincia', d: 'Carreteras y rescate' },
  { escala: 'region', t: 'Región', d: 'Unidades especiales' },
  { escala: 'nacion', t: 'Nación', d: 'Fronteras y crimen organizado' },
  { escala: 'continente', t: 'Continente', d: 'Enlace con Europa' },
];

function Propuesta() {
  return (
    <div role="img" aria-label="Con la propuesta: las asambleas de cada escala fijan prioridades a un solo cuerpo de guardianes, con un mando, una escala salarial y una academia, y secciones en el municipio, la provincia, la región, la nación y el enlace con Europa. Una inspección independiente vigila al cuerpo. El ejército queda aparte, con Defensa, coordinado con el mando nacional.">
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="rounded-2xl border border-emerald-200 p-3">
          <Caja tono="claro" titulo="Las asambleas de cada escala">Fijan las prioridades de su sección: qué vigilar más, dónde, con qué horario</Caja>
          <Flecha />
          <Caja tono="oscuro" titulo="Un solo cuerpo de guardianes">Un mando, una escala salarial, una jerarquía civil, una academia</Caja>
          <Flecha texto="secciones por escala" />
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {SECCIONES.map(s => (
              <li key={s.escala} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm">
                <p className="flex items-center gap-1.5 font-semibold text-slate-900"><Muestra color={ESCALA[s.escala].color} />{s.t}</p>
                <p className="mt-0.5 leading-snug text-slate-600">{s.d}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid content-start gap-3">
          <Caja tono="verde" titulo={<span className="inline-flex items-center gap-1.5"><Eye aria-hidden className="h-4 w-4" />Inspección independiente</span>}>
            Fuera del cuerpo. Recibe quejas, revisa grabaciones, publica datos y responde ante los jueces y la ciudadanía.
          </Caja>
          <Caja tono="gris" titulo="Ejército, aparte">
            Con Defensa y solo para defender el país. Se coordina con el mando nacional en catástrofes y con la defensa europea.
          </Caja>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-600">De unos {numero(MUNICIPIOS_CON_POLICIA)} cuerpos con su propio jefe a uno solo, con un único número de emergencia: el 112.</p>
    </div>
  );
}

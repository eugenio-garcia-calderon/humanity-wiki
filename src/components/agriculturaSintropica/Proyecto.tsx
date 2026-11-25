// ============================================================================
// AGRICULTURA SINTRÓPICA · THE PROJECT, EXPLAINED (2026-11-25)
// ============================================================================
// Eugenio: «tiene que ser lo más divulgativo posible para que la gente entienda lo
// que estamos haciendo». Spain's figures (with their official source and year),
// today's model against the syntropic one, the water, how the trial will measure
// the extra yield, and the team. Figures checked on 2026-11-25; each one names
// its source so it can be updated when the ministry publishes new ones.

import { ExternalLink } from 'lucide-react';

const CULTIVOS = [
  { nombre: 'Olivo', ha: 2768267, regadio: 0.31, nota: 'El cultivo con más superficie de regadío de España: 874.564 ha, el 31 % del olivar (ESYRCE 2023).' },
  { nombre: 'Viña', ha: 948024, regadio: 0.42, nota: '399.080 ha de viñedo en regadío (ESYRCE 2023); el viñedo está pasando de secano a regadío.' },
  { nombre: 'Almendro', ha: 878075, regadio: 0.14, nota: 'Más superficie que ningún otro país, pero segundo productor del mundo. En 2019, 563.642 ha de secano frente a 94.126 de regadío.' },
  { nombre: 'Pistacho', ha: 85800, regadio: 0.26, nota: 'El cultivo emergente: +1.978 % de superficie entre 2012 y 2022. Castilla-La Mancha tiene en torno al 80 %, sobre todo en secano.' },
];
const MAX = 2768267;

const COMPARA: [string, string, string][] = [
  ['Marco de plantación', 'Árboles solos en cuadrícula (7 × 7 m el almendro) para que pase un tractor grande', 'La mayor densidad posible: la clave rodeada de auxiliares en 5 estratos'],
  ['Especies', 'Una', 'De 10 a más de 30 por módulo'],
  ['Suelo', 'Labrado y desnudo: se calienta, se erosiona y pierde materia orgánica', 'Siempre cubierto: acolchado de poda, cubiertas vivas, hojarasca'],
  ['Nitrógeno', 'Abono comprado', 'Fijadoras (retamas, tagasaste, esparceta) y abono verde'],
  ['Agua', 'La lluvia de tormenta escurre ladera abajo', 'Zanjas en curva de nivel, medias lunas y alcorques que la frenan y la infiltran'],
  ['Maquinaria', 'Tractores grandes y pesados que compactan', 'Maquinaria estrecha y ligera por pasillos fijos'],
  ['Cosecha', 'Un solo producto, un solo riesgo', 'La clave más frutas, aromáticas y hortalizas: varias cosechas al año'],
];

const AGUA = [
  ['Zanjas de infiltración', 'Excavadas en curva de nivel, frenan la escorrentía y la meten en el suelo, donde la buscan las raíces. La tierra sacada forma un caballón aguas abajo.'],
  ['Sonrisas (medias lunas)', 'Bancales en forma de media luna abiertos hacia la ladera: cada uno recoge el agua de su trozo de pendiente y la entrega a las plantas de dentro.'],
  ['Alcorques', 'Un anillo alrededor de cada árbol clave que guarda el agua de lluvia (o de riego de apoyo) justo donde está la raíz.'],
  ['Pavimento filtrante', 'Pasillos que se pisan pero dejan pasar el agua en lugar de encauzarla.'],
  ['Acolchado y sombra', 'El suelo cubierto pierde mucha menos agua por evaporación, y la sombra parcial de los árboles altos baja la temperatura en verano.'],
];

const MEDIMOS = [
  ['Cosecha', 'Kilos por árbol de la especie clave y su calidad (calibre, rendimiento en grano o en aceite), más todo lo que dan las auxiliares.'],
  ['Agua en el suelo', 'Sondas de humedad a 20, 40 y 60 cm bajo la clave, en las dos parcelas, todo el año.'],
  ['Suelo', 'Materia orgánica, nitrógeno, vida del suelo e infiltración (ensayo de anillo), una vez al año.'],
  ['Microclima', 'Temperatura y humedad bajo la copa en verano y en las heladas de la floración.'],
  ['Biodiversidad', 'Polinizadores, aves e insectos auxiliares.'],
  ['Trabajo y dinero', 'Horas de trabajo, maquinaria, insumos y lo que se vende de cada parcela.'],
];

const FUENTES = [
  ['MAPA · AgrInfo 36: la superficie de cultivos leñosos 2012–2022', 'https://servicio.mapa.gob.es/fr/ministerio/servicios/analisis-y-prospectiva/aypagrinfo_usos_suelo_tcm36-680171.pdf'],
  ['MAPA · Regadío en España, ESYRCE 2023', 'https://www.mapa.gob.es/es/prensa/ultimas-noticias/detalle_noticias/el-ministerio-de-agricultura--pesca-y-alimentacion-constata-un-nuevo-aumento-del-regadio-eficiente-en-el-campo-espanol/97967b70-8385-470f-93ee-f2136e905f66'],
  ['MAPA · Anuario de estadística 2019, almendro (secano y regadío)', 'https://www.mapa.gob.es/estadistica/pags/anuario/2019/CAPITULOSPDF/CAPITULO07/pdfc07_10.1.2.pdf'],
  ['MAPA · Mesa sectorial de frutos secos, octubre de 2024', 'https://mapa.gob.es/es/prensa/241022mesasectorialfrutossecos_tcm30-695729.pdf'],
  ['MAPA · Cultivos leñosos: +9 % en diez años (pistacho +1.978 %)', 'https://www.mapa.gob.es/en/prensa/ultimas-noticias/detalle_noticias/la-superficie-de-cultivos-lenosos-en-espana-aumento-un-9---en-los-ultimos-10-anos-/a6a47716-eaee-4d75-ba12-ece73abcd92c'],
  ['Junta de Castilla-La Mancha · pistacho y almendro (2025)', 'https://castillalamancha.es/print/397391'],
  ['Agenda Götsch · composición de líneas en el Mediterráneo', 'https://agendagotsch.com/en/tree-line-composition-mediterranean/'],
  ['Wikifarmer · ¿Qué es la agricultura sintrópica?', 'https://wikifarmer.com/es/que-es-la-agricultura-sintropica-y-como-pueden-beneficiarse-de-ella-los-agricultores/'],
];

const Titulo = ({ children }: { children: React.ReactNode }) => <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-300">{children}</h2>;

export default function Proyecto() {
  return (
    <div className="space-y-5 text-xs leading-relaxed text-slate-300">
      <section>
        <h1 className="text-lg font-bold text-white">Agricultura sintrópica para los cultivos de España</h1>
        <p className="mt-1">España lidera el mundo en superficie de almendro, olivo y viña, y el pistacho crece más que ningún otro cultivo. Pero buena parte está en <b>secano</b>, donde los árboles producen una fracción de lo que dan con agua. Este proyecto quiere medir si la <b>agricultura sintrópica</b> —rodear cada especie clave de especies auxiliares que le den nitrógeno, sombra, biomasa y agua retenida— puede subir esa producción sin regar más.</p>
      </section>

      <section>
        <Titulo>España en cifras</Titulo>
        <div className="space-y-2">
          {CULTIVOS.map(c => (
            <div key={c.nombre} className="rounded-lg bg-slate-800/50 p-2">
              <div className="flex justify-between"><b className="text-slate-100">{c.nombre}</b><span className="font-mono text-slate-300">{c.ha.toLocaleString('es-ES')} ha</span></div>
              <div className="mt-1 flex h-2.5 overflow-hidden rounded bg-slate-900" style={{ width: `${Math.max(6, (c.ha / MAX) * 100)}%` }}>
                <div className="bg-amber-500/80" style={{ width: `${(1 - c.regadio) * 100}%` }} /><div className="bg-sky-500" style={{ width: `${c.regadio * 100}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">{c.nota}</p>
            </div>
          ))}
          <p className="text-[10px] text-slate-500"><span className="text-amber-400">■</span> secano · <span className="text-sky-400">■</span> regadío (aprox.). Superficies de 2022 (MAPA, AgrInfo 36); pistacho, campaña 2024/25.</p>
        </div>
      </section>

      <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
        <Titulo>El almendro: el reto del secano</Titulo>
        <p>Según el anuario del Ministerio de 2019, una hectárea de almendro en producción dio de media <b>438 kg</b> en secano y <b>1.820 kg</b> en regadío: unas <b>cuatro o cinco veces más</b> con agua. Y más de tres cuartas partes del almendral español es de secano. Por eso, siendo el país con más almendros, España es el segundo productor del mundo.</p>
        <p className="mt-1">La pregunta del proyecto: <b>¿cuánto de esa diferencia puede recuperar un bosque bien diseñado</b> —que guarda el agua de lluvia en el suelo, lo cubre, lo nitrogena y da sombra parcial— sin traer agua de fuera?</p>
      </section>

      <section>
        <Titulo>Modelo actual frente a sintrópico</Titulo>
        <div className="overflow-hidden rounded-xl border border-slate-800">
          {COMPARA.map(([a, b, c]) => (
            <div key={a} className="grid grid-cols-[5.5rem_1fr_1fr] gap-2 border-b border-slate-800 p-2 last:border-0">
              <b className="text-slate-200">{a}</b><span className="text-amber-200/80">{b}</span><span className="text-emerald-200">{c}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <Titulo>Cómo se retiene el agua</Titulo>
        <div className="space-y-1.5">{AGUA.map(([a, b]) => <p key={a}><b className="text-sky-300">{a}.</b> {b}</p>)}</div>
      </section>

      <section>
        <Titulo>El ensayo: cómo vamos a medirlo</Titulo>
        <p>Parcelas <b>pareadas</b> en fincas de secano: en cada una, la misma especie clave, misma variedad y misma edad en dos manejos —el convencional como control y el sintrópico diseñado con esta herramienta—, con al menos tres repeticiones para que el resultado no dependa de un rincón con mejor suelo. Al menos siete años, porque el sistema tarda en madurar.</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">{MEDIMOS.map(([a, b]) => <div key={a} className="rounded-lg bg-slate-800/50 p-2"><b className="text-slate-100">{a}</b><p className="text-[10px] text-slate-400">{b}</p></div>)}</div>
        <p className="mt-2">Los datos se publicarán abiertos en humanity.wiki, y el simulador de esta página se recalibrará con ellos: hoy sus efectos sobre la cosecha son <b>hipótesis</b>, no resultados.</p>
      </section>

      <section>
        <Titulo>Equipo</Titulo>
        <ul className="list-inside list-disc space-y-0.5">
          <li>Ingenieros agrícolas (agrónomos)</li>
          <li>Ingenieros forestales</li>
          <li>Agricultores sintrópicos: Vicente Cano, Vanessa Aguilar y Lucho Iglesias</li>
          <li>Coordina: Luz & Humanidad</li>
        </ul>
      </section>

      <section>
        <Titulo>Fuentes</Titulo>
        <ul className="space-y-1">{FUENTES.map(([t, u]) => <li key={u}><a href={u} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 text-sky-300 hover:underline"><ExternalLink size={11} className="mt-0.5 shrink-0" />{t}</a></li>)}</ul>
      </section>
    </div>
  );
}

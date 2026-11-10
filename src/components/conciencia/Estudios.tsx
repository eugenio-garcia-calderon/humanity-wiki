// The scientific part of the page, under the map: Grinberg's laboratory, his
// published studies, his books, and what other laboratories found afterwards.
// Every card has the anchor `estudio-<id>`, which is where the map's
// «Ver el estudio» buttons scroll to.
import { ExternalLink, FlaskConical, BookOpen, Scale } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ESTUDIOS, LIBROS, type Estudio } from '../../data/concienciaEstudios';

const LINEA_DE_VIDA: { anio: string; texto: string }[] = [
  { anio: '1946', texto: 'Nace en Ciudad de México el 12 de diciembre.' },
  { anio: 'Formación', texto: 'Estudia Psicología en la UNAM y se doctora en psicofisiología en el Brain Research Institute de Nueva York.' },
  { anio: 'Laboratorios', texto: 'Funda laboratorios de investigación en la Facultad de Psicología de la UNAM y en la Universidad Anáhuac. Allí registra con electroencefalograma la actividad del cerebro durante la meditación y la comunicación entre personas.' },
  { anio: 'Años 80', texto: 'Recorre México entrevistando y observando a chamanes y curanderos (entre ellos Pachita) para estudiar lo que llamó «psicología autóctona».' },
  { anio: '1987', texto: 'Funda el Instituto Nacional para el Estudio de la Conciencia (INPEC), donde hace la mayor parte de su trabajo experimental.' },
  { anio: '1991', texto: 'Publica «La teoría sintérgica», la versión completa de su teoría.' },
  { anio: '1994', texto: 'Publica en Physics Essays el experimento del potencial transferido. El 8 de diciembre se le ve por última vez en Ciudad de México; nunca se ha sabido qué le ocurrió.' },
];

function Tarjeta({ e }: { e: Estudio }) {
  return (
    <article id={`estudio-${e.id}`} className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-shadow" data-estudio={e.id}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="font-serif text-2xl text-amber-200">{e.anio}</span>
        <span className="text-right text-xs text-slate-400">{e.publicacion}</span>
      </div>
      <h4 className="font-semibold leading-snug text-slate-50">{e.titulo}</h4>
      <p className="mt-1 text-xs text-slate-400">{e.autores}</p>
      <dl className="mt-3 space-y-2 text-sm leading-relaxed">
        <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-violet-200">Qué se hizo</dt><dd className="text-slate-200">{e.queHizo}</dd></div>
        <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-teal-200">{e.tipo === 'grinberg' ? 'Qué se encontró' : 'Qué encontraron'}</dt><dd className="text-slate-200">{e.queEncontro}</dd></div>
      </dl>
      {e.enlace && (
        <a href={e.enlace.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm text-amber-200 underline decoration-amber-200/30 underline-offset-4 hover:decoration-amber-200">
          {e.enlace.texto} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </article>
  );
}

export function Estudios({ className }: { className?: string }) {
  const suyos = ESTUDIOS.filter(e => e.tipo === 'grinberg');
  const despues = ESTUDIOS.filter(e => e.tipo === 'posterior');
  return (
    <div className={cn('space-y-16', className)}>
      <section aria-labelledby="laboratorio">
        <div className="mb-6 flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-amber-200" />
          <h2 id="laboratorio" className="font-serif text-3xl text-slate-50">El laboratorio de la conciencia</h2>
        </div>
        <p className="mb-6 max-w-3xl leading-relaxed text-slate-300">
          Jacobo Grinberg-Zylberbaum fue un neurofisiólogo y psicólogo mexicano que intentó estudiar la conciencia con el método
          científico: electrodos, cámaras aisladas, estímulos al azar y grupos de control, al lado de la meditación y del saber de
          los chamanes de México. Escribió más de cincuenta libros.
        </p>
        <ol className="relative space-y-4 border-l border-amber-200/30 pl-6">
          {LINEA_DE_VIDA.map(h => (
            <li key={h.anio} className="relative">
              <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-amber-200 shadow-[0_0_12px] shadow-amber-200/60" />
              <span className="font-serif text-lg text-amber-200">{h.anio}</span>
              <p className="text-slate-300">{h.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="estudios-grinberg">
        <div className="mb-2 flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-violet-200" />
          <h2 id="estudios-grinberg" className="font-serif text-3xl text-slate-50">Los estudios científicos de Grinberg</h2>
        </div>
        <p className="mb-6 max-w-3xl leading-relaxed text-slate-300">
          Dos líneas de trabajo sostienen el mapa de arriba. La <b className="text-slate-100">visión extraocular</b>: percibir sin los ojos. Y la
          <b className="text-slate-100"> conexión entre campos mentales</b>: registrar a la vez el electroencefalograma de dos personas que se habían
          comunicado en silencio y, después, separadas en cámaras aisladas, comprobar si un estímulo dado a una aparecía también en el cerebro de la otra.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {suyos.map(e => <Tarjeta key={e.id} e={e} />)}
        </div>
        <h3 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wider text-slate-400">Libros de Grinberg citados</h3>
        <ul className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
          {LIBROS.map(l => (
            <li key={l.titulo} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2">
              <span className="text-amber-200">{l.anio}</span> · <i>{l.titulo}</i> · {l.editorial}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="despues">
        <div className="mb-2 flex items-center gap-3">
          <Scale className="h-6 w-6 text-teal-200" />
          <h2 id="despues" className="font-serif text-3xl text-slate-50">Lo que vino después: réplicas y debate</h2>
        </div>
        <div className="mb-6 max-w-3xl space-y-3 leading-relaxed text-slate-300">
          <p>
            Tras la desaparición de Grinberg, otros laboratorios repitieron la idea del potencial transferido con equipos más modernos.
            Algunos encontraron correlaciones entre cerebros aislados; otros no las encontraron.
          </p>
          <p className="rounded-xl border border-teal-200/20 bg-teal-200/[0.06] p-4 text-sm">
            <b className="text-teal-100">Cómo leer estos estudios.</b> Estos resultados no forman parte del consenso de la neurociencia:
            las muestras son pequeñas, el efecto aparece solo en una parte de las parejas, las réplicas no siempre lo encuentran y no se
            conoce un mecanismo físico que lo explique. Por eso aquí se presentan como lo que son: hallazgos publicados, con sus críticas,
            abiertos a más investigación.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {despues.map(e => <Tarjeta key={e.id} e={e} />)}
        </div>
      </section>
    </div>
  );
}

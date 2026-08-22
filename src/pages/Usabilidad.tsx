import { useMemo, useState } from 'react';
import {
  Hand, Eye, Layers3, MessageSquareWarning, Ruler, Repeat2, ChevronDown,
} from 'lucide-react';
import { cn } from '../utils/cn';

// ============================================================================
// USABILIDAD (2026-08-22, petición de Eugenio)
// ============================================================================
// «Crea en "i" la página de usabilidad y ahí mete todos los principios y planes
// para mejorar la usabilidad de la plataforma, añade las tareas que tienes
// pendientes en un kanban dentro de esa página emulando al de Hormiguero.»
//
// POR QUÉ CADA PRINCIPIO VIENE CON EL FALLO QUE LO CAUSÓ. Una lista de reglas
// generales no cambia lo que hace nadie: «sé consistente» y «reduce la carga
// cognitiva» se pueden leer cien veces sin reconocerlas en el código propio. Lo
// que sí funciona es el caso: cuando el borde discontinuo tiene detrás una
// captura de Eugenio diciendo «esto es terrible», la siguiente vez que alguien
// vaya a poner un borde discontinuo se acuerda.
//
// Todos los casos de esta página ocurrieron de verdad, aquí, el mismo día.
//
// DE DÓNDE SALEN LAS TAREAS. Están escritas en este fichero, no leídas de la
// base de datos. Es una decisión, no un atajo pendiente de terminar: la lista
// del hormiguero es trabajo del equipo entero y vive en el servidor; esto es el
// plan de una persona sobre una parte de la interfaz, y guardarlo aquí lo
// mantiene junto al código que lo cumple o lo incumple. Si algún día lo escribe
// más gente, entonces sí toca subirlo a la base de datos.

type Estado = 'hecho' | 'en_curso' | 'por_hacer' | 'propuesta';

/*
 * LOS MISMOS COLORES QUE EL HORMIGUERO Y POR LA MISMA RAZÓN: que el color diga
 * si algo te está esperando a ti. Ahí el ámbar es «te necesita»; aquí es lo
 * mismo, decisiones de producto que no puede tomar un programador.
 */
const SEMAFORO: Record<Estado, { punto: string; fondo: string; texto: string; label: string }> = {
  propuesta: { punto: 'bg-slate-400', fondo: 'bg-white border-slate-200', texto: 'text-slate-600', label: 'Propuesta' },
  por_hacer: { punto: 'bg-amber-500', fondo: 'bg-amber-50 border-amber-200', texto: 'text-amber-800', label: 'Por hacer' },
  en_curso: { punto: 'bg-sky-500', fondo: 'bg-sky-50 border-sky-200', texto: 'text-sky-800', label: 'En curso' },
  hecho: { punto: 'bg-emerald-500', fondo: 'bg-white border-slate-200', texto: 'text-emerald-700', label: 'Hecho' },
};

const COLUMNAS: Estado[] = ['por_hacer', 'en_curso', 'hecho', 'propuesta'];

type Tarea = { titulo: string; estado: Estado; nota?: string; quien?: string };

const TAREAS: Tarea[] = [
  // ── Hechas, y con el fallo que las provocó ────────────────────────────────
  { estado: 'hecho', titulo: 'La cámara ya no abre un editor que nadie pidió', nota: 'Ahora la foto se ve tal cual y se pregunta dónde va. Editar es un botón.' },
  { estado: 'hecho', titulo: 'Botones sólidos en vez de recuadros discontinuos', nota: 'El borde discontinuo significa «arrastra aquí un fichero», un gesto que en un móvil no existe.' },
  { estado: 'hecho', titulo: 'No pedir el título antes de que exista la foto', nota: 'Metadato antes que contenido, estando de pie con el móvil en la mano.' },
  { estado: 'hecho', titulo: 'Quitar la rejilla de herramientas cuando ya elegiste una', nota: 'Ocho decisiones ya tomadas ocupando media pantalla.' },
  { estado: 'hecho', titulo: 'Un nombre por cosa: «Publicación», «Cámara»', nota: '«Al muro» aquí y «Publicación» allí eran lo mismo; «Imagen» y «Cámara», también.' },
  { estado: 'hecho', titulo: 'Crear algo ya no te expulsa a un listado', nota: 'Se confirma donde estás, con «Verlo» y «Crear otra».' },
  { estado: 'hecho', titulo: 'La barra inferior respeta el borde del iPhone', nota: 'Instalada a pantalla completa se montaba sobre la rayita del móvil.' },
  { estado: 'hecho', titulo: 'La aplicación avisa cuando hay una versión nueva', nota: 'Antes una copia guardada podía enseñar la versión de ayer indefinidamente.' },
  { estado: 'hecho', titulo: 'Sin conexión ya no abre en blanco en la primera visita', nota: 'El código de la aplicación no se guardaba hasta la segunda visita.' },

  // ── En curso ──────────────────────────────────────────────────────────────
  { estado: 'en_curso', titulo: 'Una foto puede ir dentro de una tarea de un proyecto', nota: 'Y una tarea acepta foto y vídeo desde la cámara, no solo desde el carrete.' },

  // ── Por hacer ─────────────────────────────────────────────────────────────
  { estado: 'por_hacer', titulo: 'Repasar los textos de toda la aplicación contra lo que hace', nota: 'De un solo cambio de comportamiento aparecieron TRES copias del mismo texto falso. Falta barrer el resto de pantallas.' },
  { estado: 'por_hacer', titulo: 'Revisar el contraste y el tamaño de toque en todas las pantallas', nota: 'La regla es 44px de alto mínimo y gris claro nunca para algo que se pulsa.' },
  { estado: 'por_hacer', titulo: 'Que un vídeo pueda ser una publicación por sí misma', nota: 'Hoy solo entra en un lienzo o en una tarea.' },
  { estado: 'por_hacer', titulo: 'Qué pasa al escribir sin conexión', nota: 'Ahora se avisa de que no se guardará. Lo que falta es guardarlo y enviarlo al volver la red.' },

  // ── Propuestas: decisiones de producto, no de programación ────────────────
  { estado: 'propuesta', titulo: 'Notificaciones al móvil', quien: 'Decide Eugenio', nota: 'Una aplicación instalada puede avisar. Hay que decidir de qué, porque avisar de todo es no avisar de nada.' },
  { estado: 'propuesta', titulo: 'Un recorrido de primera vez', quien: 'Decide Eugenio', nota: 'Hoy la primera pantalla asume que ya sabes qué es un lienzo, un reto y un territorio.' },
  { estado: 'propuesta', titulo: 'Deshacer, en vez de preguntar «¿estás seguro?»', quien: 'Decide Eugenio', nota: 'Un aviso que sale siempre se pulsa sin leer. Deshacer protege de verdad.' },
];

type Principio = { icono: any; titulo: string; regla: string; caso: string };

const PRINCIPIOS: Principio[] = [
  {
    icono: MessageSquareWarning,
    titulo: 'Lo que dice la pantalla tiene que ser verdad',
    regla: 'Cambiar lo que hace algo incluye cambiar lo que dice que hace. Y el texto nunca está en un solo sitio: hay que buscarlo entero.',
    caso: 'Se quitó el editor automático de fotos y el texto siguió diciendo «la foto se abre en el editor antes de guardarse». Aparecieron tres copias de la misma frase, de un solo cambio. Una pantalla que miente enseña a no leer las pantallas — y entonces el aviso de «sin conexión» y el de «tus cambios no se guardarán» dejan de servir para nada.',
  },
  {
    icono: Hand,
    titulo: 'Lo importante, donde llega el pulgar',
    regla: 'La acción principal se ve sin hacer scroll, mide 44px de alto como mínimo y se parece a un botón.',
    caso: 'La pantalla de la cámara tenía «Hacer una foto» en un recuadro gris de línea discontinua, por debajo del pliegue. El borde discontinuo es el idioma de «arrastra aquí un fichero» —un gesto que en un móvil no existe— y el gris sobre blanco se lee como desactivado. La única acción de la pantalla parecía una zona rota.',
  },
  {
    icono: Layers3,
    titulo: 'No preguntar lo que ya se ha respondido',
    regla: 'Si alguien eligió una herramienta, se le abre esa herramienta. Nada de volver a enseñarle la lista.',
    caso: 'Pulsabas «Cámara» en el menú de crear y aterrizabas en una rejilla de ocho herramientas con Cámara marcada. Un paso que no avanza, y que empujaba la acción real fuera de la vista.',
  },
  {
    icono: Repeat2,
    titulo: 'Un nombre por cosa, y que sea el de quien la usa',
    regla: 'La misma cosa se llama igual en todas las pantallas. Y ante la duda, gana la palabra que usa la gente, no la más pulcra.',
    caso: 'Publicar al muro se llamaba «Al muro» en un sitio y «Publicación» en otro. «Imagen» y «Cámara» eran casi la misma herramienta. Al unificarlas se mantuvo «Cámara», que es la palabra de Eugenio, en vez de un «Foto o vídeo» más ordenado: inventarse un nombre nuevo habría recreado la inconsistencia que se venía a quitar.',
  },
  {
    icono: Eye,
    titulo: 'Nunca dos verdades a la vez',
    regla: 'Un dato guardado no puede parecer un dato de ahora. Si se enseña una copia, se dice que es una copia y de cuándo.',
    caso: 'La plataforma abre sin internet enseñando tus proyectos. Eso solo es aceptable porque la red siempre gana mientras funciona, la copia solo aparece cuando la petición falló de verdad, y una franja lo dice: «estás viendo una copia guardada hace X. Los cambios que hagas no se guardarán».',
  },
  {
    icono: Ruler,
    titulo: 'Un comentario que explica por qué algo es seguro no es prueba de que lo sea',
    regla: 'Se comprueba en la pantalla que el usuario nombra, en el estado en que la usa. Leer el código no es haberlo visto.',
    caso: 'Un comentario afirmaba que el código de la aplicación «se guarda según se usa». Sonaba razonable y describía una garantía que el código nunca dio: sin conexión, en la primera visita, la aplicación abría en blanco. Llevaba ahí desde la primera versión.',
  },
];

export default function Usabilidad() {
  const [abierto, setAbierto] = useState<number | null>(0);
  const porColumna = useMemo(
    () => COLUMNAS.map(c => [c, TAREAS.filter(t => t.estado === c)] as const),
    [],
  );

  return (
    <div className="max-w-6xl mx-auto px-5 py-8 pb-[calc(2rem+var(--hueco-muelle,0px))]">
      <header className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sobre la plataforma</p>
        <h1 className="text-3xl font-black text-slate-900 mt-1">Usabilidad</h1>
        <p className="mt-3 text-slate-600 leading-relaxed max-w-2xl">
          Los principios que sigue esta plataforma y el plan para mejorarla. Cada
          principio viene con el fallo real que lo puso ahí: una regla general se
          lee y se olvida, un caso concreto se reconoce la próxima vez que estás a
          punto de repetirlo.
        </p>
      </header>

      <section className="space-y-2 mb-12">
        {PRINCIPIOS.map((p, i) => (
          <article key={p.titulo} className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <button
              onClick={() => setAbierto(a => (a === i ? null : i))}
              aria-expanded={abierto === i}
              className="w-full min-h-[56px] flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
            >
              <p.icono className="w-5 h-5 shrink-0 text-slate-400" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-slate-900">{p.titulo}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{p.regla}</span>
              </span>
              <ChevronDown className={cn('w-4 h-4 shrink-0 text-slate-400 transition-transform', abierto === i && 'rotate-180')} />
            </button>
            {abierto === i && (
              <div className="px-4 pb-4 pl-12">
                <p className="text-sm text-slate-600 leading-relaxed border-l-2 border-slate-200 pl-4">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">El fallo que lo puso aquí</span>
                  {p.caso}
                </p>
              </div>
            )}
          </article>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-900">El plan</h2>
        <p className="text-sm text-slate-500 mt-1 mb-5">
          Ámbar es lo que toca hacer; gris son decisiones que no puede tomar un
          programador. Esta lista se escribe a mano junto al código, no sale de la
          base de datos: si algún día la escribe más gente, habrá que subirla.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {porColumna.map(([col, tareas]) => {
            const s = SEMAFORO[col];
            return (
              <div key={col} className="min-w-0">
                <div className="flex items-center gap-2 mb-2.5 px-1">
                  <span className={cn('w-2 h-2 rounded-full shrink-0', s.punto)} />
                  <h3 className={cn('text-xs font-black uppercase tracking-wider', s.texto)}>{s.label}</h3>
                  <span className="ml-auto text-xs font-bold text-slate-300">{tareas.length}</span>
                </div>
                <ul className="space-y-2">
                  {tareas.map(t => (
                    <li key={t.titulo} className={cn('rounded-2xl border p-3', s.fondo)}>
                      <p className="text-sm font-semibold text-slate-800 leading-snug">{t.titulo}</p>
                      {t.nota && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{t.nota}</p>}
                      {t.quien && (
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 mt-2">{t.quien}</p>
                      )}
                    </li>
                  ))}
                  {tareas.length === 0 && (
                    <li className="text-xs text-slate-300 px-1 py-2">Nada aquí.</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

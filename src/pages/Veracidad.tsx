import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Scale, GitBranch, Quote, Users, Sparkles, ShieldCheck, Layers, ArrowUpRight, MessagesSquare,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import TableroKanban, { type ItemTablero, type Grupo } from '../components/tablero/TableroKanban';
import { Card } from '../components/ui/core';

// ============================================================================
// VERACIDAD (2026-08-22, Eugenio: «una página donde pongamos los principios y
// tecnologías que usamos para esto, y un kanban con todas las tareas que
// tenemos hacia adelante; copia el modelo de Hormiguero»)
// ============================================================================
// Two things on one page, and they are not the same thing:
//
//   · WHAT WE PROMISE — the principles. They change rarely, and when one of
//     them changes, something in the product has to change with it.
//   · WHAT IS BUILT AND WHAT IS NOT — the board, read live from the platform's
//     own roadmap. It is not a copy: these thirty cards are the same rows the
//     «Visión y hoja de ruta» page shows, filtered to the `veracidad` group.
//     A second list of pending work would start lying the same week.
//
// The board is the shared `TableroKanban`, the same one the roadmap and every
// person's project already use. «Copy the Hormiguero model» is about what the
// page IS — the open, honest state of the work, visible to anyone, without
// having to ask — not about repeating its markup.

/** The single tag of this board. The phase already travels in each title.
 *  The hex is the one thing `TableroKanban` takes as a raw colour (its
 *  `Grupo` type asks for one, and every group on the roadmap is written the
 *  same way). It goes with the other 24 in the debt list, not on its own. */
const GRUPOS: Grupo[] = [
  { id: 'veracidad', label: 'Veracidad', color: '#7e22ce', desc: 'Debates, argumentos y fuentes' },
];

const PRINCIPIOS = [
  {
    icon: Users,
    titulo: 'No hay una verdad publicada: hay un espectro de visiones',
    texto: 'Donde hay desacuerdo de verdad, la pantalla enseña el reparto de posturas y las razones de cada una. Un veredicto se discute; un mapa del desacuerdo se entiende.',
  },
  {
    icon: GitBranch,
    titulo: 'Un debate es un árbol, no una conversación',
    texto: 'Cada argumento responde a UNA afirmación y solo a una. Es lo que hace que una discusión de trescientos mensajes siga diciendo de qué se está hablando.',
  },
  {
    icon: Quote,
    titulo: 'Lo que no tiene fuente lo dice',
    texto: 'Una afirmación sin nada detrás lleva escrito «sin fuente». No se calla, no se supone y no se presenta como un dato. Y una fuente es una cita exacta, no un enlace a doscientas páginas.',
  },
  {
    icon: Scale,
    titulo: 'Lo que pesa lo decide la gente, no el orden de llegada',
    texto: 'Cada persona dice cuánto le mueve un argumento, y las ramas se ordenan por eso. No es «me gusta»: es cuánto te cambia la postura.',
  },
  {
    icon: ShieldCheck,
    titulo: 'Cerrar un debate no borra el lado que perdió',
    texto: 'Cerrar retrata en qué punto quedó la discusión y en qué fecha. Lo que se argumentó sigue ahí, y se puede volver a abrir.',
  },
  {
    icon: Sparkles,
    titulo: 'Todo puede decir «no lo sé»',
    texto: 'Un argumento que nadie ha votado no vale cero: no tiene voto. Son dos cosas distintas y se dicen distinto, porque cuando algo no sabe decir que falta, quien mira rellena el hueco con una suposición.',
  },
];

const TECNOLOGIAS = [
  {
    titulo: 'El modelo de Kialo',
    texto: 'De Kialo tomamos la idea que funciona: tesis arriba, argumentos a favor y en contra colgando, cada uno discutible por separado, y una puntuación que dice cuánto mueve cada rama. Lo que no tomamos es la isla: aquí un debate se cuelga de un indicador, de un reto o de una publicación de la plataforma.',
  },
  {
    titulo: 'Un árbol en la base de datos, no un grafo',
    texto: 'Tres tablas —debates, argumentos y fuentes— donde cada argumento apunta a su padre. La profundidad la calcula el servidor a partir del padre, nunca la manda la pantalla: así ninguna petición puede aplanar ni injertar una rama.',
  },
  {
    titulo: 'El vocabulario que la plataforma ya tenía',
    texto: 'A favor, en contra y matiza son las mismas tres palabras (y los mismos tres colores) que el grafo de conocimiento usa para apoya, contradice y matiza. Una sola forma de nombrar el desacuerdo en toda la casa.',
  },
  {
    titulo: 'El lienzo que ya existe',
    texto: 'El debate visual no estrena dibujo: se pinta sobre el mismo lienzo del grafo, con sus flechas y sus colores. Lo que cambia es lo que se dibuja, no cómo se dibuja.',
  },
  {
    titulo: 'La votación que ya existía',
    texto: 'El impacto se guarda en la tabla de puntuaciones que la plataforma ya usa para otras cosas. Una tabla nueva de votos habría sido la segunda forma de puntuar algo, y dos formas de puntuar acaban dando dos números distintos.',
  },
  {
    titulo: 'La IA propone, no decide',
    texto: 'El asistente puede buscar qué contradice a lo que estás publicando y avisarte ANTES de publicar, y puede sugerir fuentes. Marcar algo como verificado o refutado es de una persona de nivel Conocimiento, y queda su nombre.',
  },
];

export default function Veracidad() {
  const { user } = useAuth();
  const esAdmin = !!user?.isAdmin;
  const [items, setItems] = useState<ItemTablero[] | null>(null);

  // A raw fetch in a page, and the exception src/pages/CLAUDE.md allows: the
  // roadmap is not in DataContext (nothing else on the platform reads it) and
  // preloading a board most people never open would cost every visitor a
  // request. `Vision.tsx` takes the same exception, from the same endpoint.
  //
  // `null` while loading so the empty board and the unloaded board are not the
  // same picture — the house rule about being able to say «I don't know».
  const cargar = () => fetch('/api/roadmap')
    .then(r => r.json())
    .then(j => setItems(Array.isArray(j) ? j.filter((i: ItemTablero) => i.grupo === 'veracidad') : []))
    .catch(() => setItems([]));

  useEffect(() => { cargar(); }, []);

  const cuenta = (estado: string) => (items || []).filter(i => i.estado === estado).length;

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* ── QUÉ ES ──────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 mb-4">
          <span className="mt-1 w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 grid place-items-center shrink-0">
            <Scale className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">Veracidad</h1>
            <p className="text-sm text-slate-500 font-bold">Debates, argumentos y fuentes</p>
          </div>
        </div>

        <p className="text-base sm:text-lg text-slate-700 leading-relaxed max-w-3xl">
          Una enciclopedia responde al desacuerdo con un solo texto que tiene que
          ponerse de acuerdo consigo mismo. Aquí el desacuerdo <strong>es</strong> el
          contenido: una afirmación, los argumentos a favor y en contra colgando de
          ella, las fuentes de cada uno, y cuánto mueve cada rama a quien la lee.
        </p>
        {/* LA PUERTA, ARRIBA. Esta página explica; los debates son la cosa.
            Un enlace a lo que se explica, junto a la explicación. */}
        <Link to="/debates"
          className="inline-flex items-center gap-1.5 mt-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold px-3.5 py-2 transition-colors">
          <MessagesSquare className="w-4 h-4" /> Ver los debates
        </Link>

        <p className="mt-4 text-base text-slate-600 leading-relaxed max-w-3xl">
          Lo que sale de ahí no es un veredicto: es un <strong>espectro de visiones</strong>,
          con las razones de cada una a la vista. Y lo que se publique en la
          plataforma se contrasta con lo que ya hay, para avisar de una
          contradicción antes de publicarla y no después.
        </p>

        {/* ── LOS PRINCIPIOS ──────────────────────────────────────────────── */}
        <h2 className="mt-10 mb-1 text-lg font-black text-slate-900">Los principios</h2>
        <p className="text-sm text-slate-500 mb-4">
          Lo que esta parte de la plataforma promete. Si uno cambia, cambia el producto.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {PRINCIPIOS.map(p => (
            <Card key={p.titulo} className="p-4">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 w-7 h-7 rounded-lg bg-slate-100 text-slate-500 grid place-items-center shrink-0">
                  <p.icon className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-800 leading-snug">{p.titulo}</p>
                  <p className="text-[13px] text-slate-600 leading-relaxed mt-1">{p.texto}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ── LAS TECNOLOGÍAS ─────────────────────────────────────────────── */}
        <h2 className="mt-10 mb-1 text-lg font-black text-slate-900">Con qué está hecho</h2>
        <p className="text-sm text-slate-500 mb-4">
          Casi nada de esto es nuevo: la mayor parte ya estaba en la plataforma y
          aquí se usa para otra cosa.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {TECNOLOGIAS.map(t => (
            <Card key={t.titulo} className="p-4">
              <p className="text-sm font-black text-slate-800 leading-snug">{t.titulo}</p>
              <p className="text-[13px] text-slate-600 leading-relaxed mt-1">{t.texto}</p>
            </Card>
          ))}
        </div>

        {/* ── EL TABLERO ──────────────────────────────────────────────────── */}
        <div className="mt-12 flex flex-wrap items-end justify-between gap-3 mb-1">
          <div>
            {/* EL TÍTULO DICE DE QUÉ ES ESTE TABLERO Y DE DÓNDE SALEN SUS
                TARJETAS. La plataforma tiene ya varias listas de tareas con la
                misma pinta (el hormiguero, la hoja de ruta, las de cada
                proyecto); quien mire esta tiene que saber en cuál está sin
                preguntárselo a nadie. */}
            <h2 className="text-lg font-black text-slate-900">El tablero de Veracidad</h2>
            <p className="text-sm text-slate-500">
              Diez fases, {items === null ? '…' : items.length} tarjetas. No es una lista aparte: son las
              tarjetas del grupo «veracidad» de la hoja de ruta de la plataforma, así que lo que se
              mueva aquí se mueve en{' '}
              <Link to="/vision" className="font-bold text-purple-700 hover:underline inline-flex items-center gap-0.5">
                Visión y hoja de ruta <ArrowUpRight className="w-3 h-3" />
              </Link>.
            </p>
          </div>
          {items !== null && (
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> {cuenta('hecho')} hechas
              </span>
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> {cuenta('en_curso')} en curso
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <span className="w-2 h-2 rounded-full bg-slate-400" /> {cuenta('por_hacer')} por hacer
              </span>
            </div>
          )}
        </div>

        {items === null ? (
          <p className="text-sm text-slate-400 text-center py-20">Cargando el tablero…</p>
        ) : items.length === 0 ? (
          <Card className="p-8 text-center">
            <Layers className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500 font-bold">El tablero está vacío.</p>
            <p className="text-xs text-slate-400 mt-1">
              Las tarjetas viven en la hoja de ruta, en el grupo «veracidad».
              Si no sale ninguna, es que la migración 0079 no se ha aplicado en este servidor.
            </p>
          </Card>
        ) : (
          <div className="mt-3">
            <TableroKanban
              items={items}
              grupos={GRUPOS.map(g => ({ ...g, icon: Scale }))}
              puedeEditar={esAdmin}
              onRecargar={cargar}
            />
          </div>
        )}
      </div>
    </div>
  );
}

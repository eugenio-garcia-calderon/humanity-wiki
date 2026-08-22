import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Table2, Store, ListChecks, CalendarDays, Globe2, Map as MapIcon,
  Sparkles, Database, Compass, MessageSquare, FolderKanban, Loader2,
  CheckCircle2, CircleDashed, CircleAlert, Bug,
} from 'lucide-react';

// ============================================================================
// CÓMO VAN LAS HERRAMIENTAS — `/herramientas` (2026-08-22)
// ============================================================================
// Eugenio: «crea una página que sea de información sobre las herramientas… y
// ahí mete de forma transparente la visión de todas y cada una de las
// herramientas, las tareas que tienes pendiente emulando lo del hormiguero y
// haz que esa página sea el dashboard de información y seguimiento».
//
// ── LO QUE SE MIDE Y LO QUE SE ESCRIBE, SEPARADOS ───────────────────────────
// Un panel de seguimiento escrito entero a mano miente a los dos días: dice
// «en marcha» de algo terminado y «funciona» de algo roto, y nadie se entera
// porque nadie vuelve a leerlo.
//
// Así que aquí hay dos cosas y no se mezclan:
//
//   · **Lo medido** viene de `/api/herramientas` contra la base de datos
//     ahora mismo. Cuántas páginas, cuántas tablas, cuántos pedidos. Si
//     mañana algo se rompe, este panel lo dice solo.
//
//   · **Lo escrito** —para qué sirve, qué falta, a dónde va— está aquí abajo
//     con su fecha. Es una intención, no un hecho, y se nota que lo es.
//
// ── POR QUÉ LOS FALLOS SE CUENTAN ───────────────────────────────────────────
// Cada herramienta dice también lo que NO hace. Un panel donde todo está en
// verde no informa: sólo tranquiliza. Y lo que aquí aparece como «falta» es
// medido, no supuesto — sale de haber usado cada herramienta con una cuenta
// nueva y haber anotado dónde se atasca.
//
// ── LA RAYA: LO QUE FALTA DE FUNCIÓN SÍ; LO QUE FALTA DE DEFENSA NO ─────────
// «El carrito no guarda entre dispositivos» es una carencia y se cuenta. «Esta
// ruta no comprueba la sesión» es un mapa de por dónde entrar, y eso no va en
// una página que lee cualquiera: va al tablero de seguridad, que pide permiso.
//
// Las diecinueve de abajo se repasaron con ese filtro el 2026-08-22. Ninguna
// dice dónde falta una comprobación. Si añades una línea aquí, pásala por la
// misma pregunta: ¿esto le sirve a alguien para USAR mejor la plataforma, o
// para ENTRAR donde no debe?

type Estado = 'usable' | 'a-medias' | 'esqueleto';

type Herramienta = {
  id: string;
  nombre: string;
  icono: any;
  destino: string;
  /** Para qué existe. Una frase, sin adornos. */
  vision: string;
  estado: Estado;
  /** La cuenta que la describe, si tiene sentido contarla. */
  cuenta?: { clave: string; etiqueta: string };
  /** Lo que ya funciona de verdad. */
  hecho: string[];
  /** Lo que falta, medido. Vacío es una afirmación: no encontré nada. */
  falta: string[];
  /** Palabras con las que se reconoce una nota del hormiguero suya. */
  claves: string[];
};

const REVISADO = '22 de agosto de 2026';

const HERRAMIENTAS: Herramienta[] = [
  {
    id: 'paginas', nombre: 'Páginas', icono: FileText, destino: '/paginas',
    vision: 'Escribir cualquier cosa y poder enseñarla: una nota, un manual, una tienda.',
    estado: 'usable',
    cuenta: { clave: 'paginas', etiqueta: 'páginas escritas' },
    hecho: [
      'Bloques de texto, listas, imágenes, vídeo y archivos',
      'Tablas de verdad dentro de una página',
      'Productos, portadas de tienda y rejillas',
      'Publicar en una dirección corta propia',
    ],
    falta: [
      'Crear una página cuesta cuatro pasos y te pide el título antes de escribir nada',
      'No se pueden reordenar bloques con el teclado',
    ],
    claves: ['página', 'paginas', 'documento', 'bloque', 'editor'],
  },
  {
    id: 'comercio', nombre: 'Comercio', icono: Store, destino: '/comercio',
    vision: 'Vender lo tuyo sin montar una tienda aparte ni pedirle permiso a nadie.',
    estado: 'a-medias',
    cuenta: { clave: 'productos', etiqueta: 'cosas a la venta' },
    hecho: [
      'Cuatro formas de vender: envío, descarga, servicio y suscripción',
      'Comprar sin tener cuenta',
      'Carrito, envío, stock reservado mientras se paga y pedidos',
      'Ficha propia por producto, con galería',
    ],
    falta: [
      'Todavía no se cobra de verdad: los pagos están en modo de prueba',
      'No hay opiniones ni valoraciones',
      'Un producto digital se cobra y no se entrega nada',
      'Sin variantes (talla, color), sin cupones y sin impuestos',
    ],
    claves: ['comercio', 'tienda', 'producto', 'pedido', 'carrito', 'stripe', 'venta'],
  },
  {
    id: 'tablas', nombre: 'Tablas', icono: Table2, destino: '/tablas',
    vision: 'Una base de datos que se usa sin saber lo que es una base de datos.',
    estado: 'usable',
    cuenta: { clave: 'tablas', etiqueta: 'tablas creadas' },
    hecho: [
      'Columnas con tipo, fórmulas y relaciones entre tablas',
      'Vistas, filtros y agregados',
      'Se pueden meter dentro de una página',
    ],
    falta: ['No se pueden borrar tablas, sólo vaciarlas'],
    claves: ['tabla', 'tablas', 'columna', 'fórmula', 'base de datos'],
  },
  {
    id: 'proyectos', nombre: 'Proyectos', icono: FolderKanban, destino: '/proyectos',
    vision: 'El cajón donde vive todo lo demás: páginas, tareas, gente.',
    estado: 'usable',
    cuenta: { clave: 'proyectos', etiqueta: 'proyectos' },
    hecho: ['Público o privado', 'Se le arrastran páginas y tareas'],
    falta: ['No se puede invitar a alguien a un proyecto por correo'],
    claves: ['proyecto', 'proyectos'],
  },
  {
    id: 'tareas', nombre: 'Tareas', icono: ListChecks, destino: '/tareas',
    vision: 'Qué hay que hacer, quién lo hace y en qué orden.',
    estado: 'usable',
    cuenta: { clave: 'tareas', etiqueta: 'tareas' },
    hecho: ['Tablero por estado y prioridad', 'Colgadas de un proyecto'],
    falta: [
      'Una tarea no se puede enlazar a una página ni a un producto',
      '«Crear → Tarea» te lleva a la lista, no crea una tarea',
    ],
    claves: ['tarea', 'tareas', 'kanban', 'roadmap'],
  },
  {
    id: 'esquemas', nombre: 'Esquemas', icono: Globe2, destino: '/esquemas',
    vision: 'Dibujar cómo se relaciona lo que sabes, no sólo escribirlo.',
    estado: 'usable',
    hecho: ['Lienzo infinito con nodos y enlaces', 'Se publican y se comparten'],
    falta: ['Sin plantillas para empezar'],
    claves: ['esquema', 'esquemas', 'grafo', 'lienzo', 'nodo'],
  },
  {
    id: 'mapas', nombre: 'Mapas', icono: MapIcon, destino: '/mapas',
    vision: 'Ver los datos sobre el territorio al que pertenecen.',
    estado: 'a-medias',
    hecho: ['Mapa de territorios con indicadores reales de agua'],
    falta: [
      'Casi todas las puntuaciones son simuladas, no medidas',
      'La geometría vive en ficheros, no en la base de datos',
    ],
    claves: ['mapa', 'mapas', 'territorio', 'geo'],
  },
  {
    id: 'ia', nombre: 'IA', icono: Sparkles, destino: '/ia',
    vision: 'Un ayudante que conoce lo que tienes delante, no un chat aparte.',
    estado: 'usable',
    hecho: ['Escribe y mejora texto dentro de una página', 'Sabe qué pantalla estás mirando'],
    falta: ['No puede crear cosas por ti todavía, sólo escribir'],
    claves: ['ia', 'asistente', 'chat'],
  },
  {
    id: 'calendario', nombre: 'Calendario', icono: CalendarDays, destino: '/calendario',
    vision: 'Cuándo pasa lo que estás organizando.',
    estado: 'a-medias',
    hecho: ['Vistas de día, semana, mes y año', 'Eventos propios'],
    falta: ['Sin invitaciones, sin recordatorios y sin conectar con otro calendario'],
    claves: ['calendario', 'evento', 'agenda'],
  },
  {
    id: 'archivos', nombre: 'Archivos', icono: Database, destino: '/archivos',
    vision: 'Todo lo que has subido, en un sitio, sin buscar en qué página lo pusiste.',
    estado: 'usable',
    hecho: ['Recoge lo subido en cualquier herramienta'],
    falta: ['Sin carpetas y sin buscador por contenido'],
    claves: ['archivo', 'archivos', 'fichero', 'subir'],
  },
  {
    id: 'mensajes', nombre: 'Mensajes', icono: MessageSquare, destino: '/mensajes',
    vision: 'Hablar con alguien sin salir de la plataforma.',
    estado: 'esqueleto',
    hecho: ['Conversaciones uno a uno'],
    falta: [
      'Sólo se empieza desde el perfil de alguien: no hay «escribir a…»',
      'Sin grupos y sin adjuntos',
    ],
    claves: ['mensaje', 'mensajes', 'conversación'],
  },
  {
    id: 'publicaciones', nombre: 'Publicaciones', icono: Compass, destino: '/explorar',
    vision: 'Lo que la comunidad comparte, ordenado por lo que te importa.',
    estado: 'usable',
    hecho: ['Muro con filtros por reto y por tipo', 'Reacciones y comentarios'],
    falta: ['El orden no aprende de lo que lees'],
    claves: ['publicación', 'publicaciones', 'muro', 'explorar'],
  },
];

const PINTA: Record<Estado, { texto: string; clase: string; Icono: any }> = {
  usable:    { texto: 'Se puede usar',   clase: 'text-emerald-700 bg-emerald-50', Icono: CheckCircle2 },
  'a-medias':{ texto: 'A medias',        clase: 'text-amber-700 bg-amber-50',     Icono: CircleDashed },
  esqueleto: { texto: 'Sólo el esqueleto', clase: 'text-slate-600 bg-slate-100',  Icono: CircleAlert },
};

export default function EstadoHerramientas() {
  const [datos, setDatos] = useState<any>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    fetch('/api/herramientas')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setDatos)
      .catch(() => setFallo(true));
  }, []);

  const notasDe = (h: Herramienta) => {
    const notas: any[] = datos?.notas || [];
    return notas.filter(n => {
      const t = (n.titulo || '').toLowerCase();
      return h.claves.some(k => t.includes(k));
    });
  };

  const total = HERRAMIENTAS.length;
  const usables = HERRAMIENTAS.filter(h => h.estado === 'usable').length;
  const pendientes = HERRAMIENTAS.reduce((n, h) => n + h.falta.length, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Cómo van las herramientas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Para qué sirve cada una, qué hace ya y qué le falta. Sin maquillar: una
          herramienta a medias se dice a medias.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Cifra n={`${usables}/${total}`} t="se pueden usar" />
        <Cifra n={String(pendientes)} t="cosas que faltan" />
        <Cifra n={datos ? String((datos.notas || []).length) : '—'} t="notas abiertas" />
      </div>

      {fallo && (
        <p className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          No se han podido leer las cifras en vivo. Lo escrito de abajo sigue siendo
          válido; lo que falta son los números.
        </p>
      )}

      <ul className="space-y-3">
        {HERRAMIENTAS.map(h => {
          const p = PINTA[h.estado];
          const notas = notasDe(h);
          const cuenta = h.cuenta && datos?.cuentas?.[h.cuenta.clave];
          return (
            <li key={h.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <h.icono className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={h.destino} className="text-base font-black text-slate-900 hover:underline">
                      {h.nombre}
                    </Link>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full ${p.clase}`}>
                      <p.Icono className="w-3 h-3" /> {p.texto}
                    </span>
                    {/* La cifra medida, y se dice que lo es. */}
                    {cuenta !== undefined && (
                      <span className="text-[11px] text-slate-400">
                        {cuenta} {h.cuenta!.etiqueta} ahora mismo
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{h.vision}</p>

                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700 mb-1">Ya hace</p>
                      <ul className="space-y-0.5">
                        {h.hecho.map((x, i) => (
                          <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                            <span className="text-emerald-500 shrink-0">·</span>{x}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-amber-700 mb-1">Le falta</p>
                      {h.falta.length === 0 ? (
                        // Vacío es una afirmación, no un hueco: se dice.
                        <p className="text-xs text-slate-400">Nada que yo haya encontrado.</p>
                      ) : (
                        <ul className="space-y-0.5">
                          {h.falta.map((x, i) => (
                            <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                              <span className="text-amber-500 shrink-0">·</span>{x}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {notas.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        En el hormiguero
                      </p>
                      <ul className="space-y-0.5">
                        {notas.slice(0, 4).map(n => (
                          <li key={n.id}>
                            <Link to="/hormiguero" className="text-xs text-slate-600 hover:text-slate-900 flex gap-1.5">
                              <Bug className="w-3 h-3 text-slate-300 shrink-0 mt-0.5" />
                              <span className="truncate">{n.titulo}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <footer className="mt-8 pt-4 border-t border-slate-100 space-y-1">
        <p className="text-xs text-slate-400">
          Las cifras se leen de la base de datos cada vez que se abre esta página
          {datos?.medido_en && ` — la última, ${new Date(datos.medido_en).toLocaleString('es-ES')}`}.
        </p>
        <p className="text-xs text-slate-400">
          Lo escrito —para qué sirve cada una y qué le falta— se revisó el {REVISADO}
          usando cada herramienta con una cuenta recién creada. Si algo aquí ya no es
          verdad, <Link to="/hormiguero" className="font-bold text-slate-500 hover:text-slate-800">dilo en el hormiguero</Link>.
        </p>
      </footer>
    </div>
  );
}

function Cifra({ n, t }: { n: string; t: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center">
      <p className="text-xl font-black text-slate-900 tabular-nums">{n}</p>
      <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{t}</p>
    </div>
  );
}

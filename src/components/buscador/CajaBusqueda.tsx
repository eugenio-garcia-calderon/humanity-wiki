import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, ArrowUpRight, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { areasQueEncajan, AREA_POR_ID } from '../../utils/objetivos';

// ============================================================================
// LA CAJA DE BUSCAR — sugerencias mientras escribes (2026-08-24)
// ============================================================================
// Eugenio: «según pones una palabra te encuentra dentro de la base de datos…
// y según vas escribiendo se va actualizando hasta que el usuario deja de
// escribir».
//
// ── «HASTA QUE DEJA DE ESCRIBIR» ES LA PARTE IMPORTANTE ─────────────────────
// Sin esperar, cada tecla es una consulta: escribir «agua» son cuatro, y las
// tres primeras llegan tarde y pisan a la buena — la lista parpadea y a veces
// se queda enseñando lo de «agu». Se espera a que pare (180 ms) y **se
// descarta la respuesta si ya se ha escrito otra cosa**, que es lo que de
// verdad evita el pisotón.
//
// ── DOS CLASES DE SUGERENCIA, DICHAS DISTINTAS ──────────────────────────────
// Lo que EXISTE lleva su tipo al lado y va directo. Lo que es una forma de
// completar la frase lleva una lupa y lleva a los resultados. Confundirlas
// sería prometer una página que no está.

//
// ── Y ES UNA SOLA CAJA, NO DOS PARECIDAS (2026-08-24) ───────────────────────
// Cuando llegué aquí ya existía `BuscadorSuperior`, la caja de la barra de
// arriba: misma idea, sin sugerencias y llevando a `/explorar?q=`. Lo que
// **no** se podía hacer era dejar las dos: dos cajas de buscar se escriben
// iguales y divergen en la primera corrección —el retardo, las flechas, qué
// pasa al pulsar Enter— y entonces la aplicación tiene dos buscadores que se
// portan distinto según dónde pinches.
//
// Así que ésta es la única, y la de arriba es esta misma con otra piel: forma
// de pastilla, y sus propios botones metidos dentro por `derecha`. La lista de
// sugerencias, la espera, el teclado y el descarte de respuestas tardías se
// escriben una vez.

// ── TRES CLASES, NO DOS (2026-08-24) ───────────────────────────────────────
// Eugenio: «cuando se escriban letras y palabras en el buscador se recomienda
// también temáticas, y con un icono poder separarlo, que es una temática de
// una publicación».
//
// `tematica` es una de las catorce áreas de la plataforma. No es una ficha: es
// la puerta a **todo lo publicado** sobre un tema, así que va la primera —
// escribiendo «eco», lo más útil que hay es ECOSISTEMAS, y hasta hoy era justo
// lo que no salía—.
//
// Y se distingue por SU icono y SU color, los mismos del mapa y de las
// pastillas de Explorar. Un icono genérico separaría una temática de una
// publicación, que es lo que se pidió, pero desaprovecha que quien ha visto
// esa hoja verde en Explorar ya sabe qué es sin leer la etiqueta.
type Sugerencia = {
  clase: 'contenido' | 'frase' | 'tematica';
  tipo?: string;
  texto: string;
  url: string;
  /** Solo en `tematica`: para pintar su icono y su color. */
  areaId?: string;
};

export default function CajaBusqueda({
  compacto = false, onCerrar, pastilla = false, derecha, placeholder, alBuscar, alPegarFichero, className,
}: {
  compacto?: boolean;
  onCerrar?: () => void;
  /** La piel de la barra de arriba: redonda y más baja. */
  pastilla?: boolean;
  /** Lo que va DENTRO de la caja, a la derecha (el interruptor de IA y la lupa
   *  de la barra superior). Dentro y no al lado a propósito: son propiedades de
   *  lo que estás escribiendo, no ajustes de la página. */
  derecha?: ReactNode;
  placeholder?: string;
  /** Qué hacer al buscar de verdad. Por defecto, la página de resultados. La
   *  barra de arriba lo cambia cuando el interruptor de IA está encendido. */
  alBuscar?: (q: string) => void;
  /** Qué hacer si pegan un FICHERO aquí dentro. Solo lo pone la barra de
   *  arriba cuando el interruptor de IA está encendido: entonces esta caja es
   *  «hablarle a la IA» y pegarle una captura tiene que hacer algo. Con el
   *  interruptor apagado esto no se pasa, y pegar un fichero en una caja de
   *  buscar palabras sigue sin hacer nada — que es lo correcto: mandar una
   *  imagen a la IA porque la pegaste en el buscador sería una sorpresa cara. */
  alPegarFichero?: (f: File) => void;
  className?: string;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [marcada, setMarcada] = useState(-1);
  const caja = useRef<HTMLDivElement>(null);
  // Cuál fue la última búsqueda pedida. Si cuando llega la respuesta ya no
  // coincide, se tira: es de una tecla anterior.
  const ultima = useRef('');

  /** Las temáticas que encajan con lo escrito. Se calculan aquí, sin red: son
   *  catorce y ya están cargadas, así que aparecen con la segunda letra y no
   *  esperan a la respuesta del servidor. */
  const tematicas = (v: string): Sugerencia[] => areasQueEncajan(v).map(o => ({
    clase: 'tematica',
    tipo: 'temática',
    texto: o.titulo,
    url: `/explorar?objetivo=${encodeURIComponent(o.id)}`,
    areaId: o.id,
  }));

  useEffect(() => {
    const v0 = q.trim();
    // Las temáticas se enseñan YA, antes de que conteste el servidor: si
    // esperaran, la lista aparecería primero sin ellas y saltarían al llegar
    // la red, moviendo lo que ya estabas a punto de pulsar.
    if (v0.length >= 2) {
      const t0 = tematicas(v0);
      if (t0.length) { setSugerencias(t0); setAbierto(true); }
    }
    const t = window.setTimeout(async () => {
      const v = q.trim();
      ultima.current = v;
      if (v.length < 2) { setSugerencias([]); setCargando(false); return; }
      setCargando(true);
      try {
        const r = await fetch(`/api/buscar/sugerencias?q=${encodeURIComponent(v)}`);
        const j = await r.json();
        if (ultima.current !== v) return;  // llegó tarde
        setSugerencias([...tematicas(v), ...(j.sugerencias || [])]);
        setAbierto(true);
      } catch {
        // Sin red quedan las temáticas, que no dependen de ella.
        if (ultima.current === v) setSugerencias(tematicas(v));
      }
      if (ultima.current === v) setCargando(false);
    }, 180);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  function buscar(texto?: string) {
    const v = (texto ?? q).trim();
    if (v.length < 2) return;
    setAbierto(false);
    onCerrar?.();
    if (alBuscar) alBuscar(v);
    else navigate(`/buscar?q=${encodeURIComponent(v)}`);
  }

  function teclas(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const s = marcada >= 0 ? sugerencias[marcada] : null;
      if (s) { setAbierto(false); onCerrar?.(); navigate(s.url); }
      else buscar();
      return;
    }
    // Con flechas se recorre la lista, como en cualquier buscador. Sin esto
    // hay que soltar el teclado para elegir, que en una caja de búsqueda es
    // el gesto más incómodo que existe.
    if (e.key === 'ArrowDown') { e.preventDefault(); setMarcada(i => Math.min(i + 1, sugerencias.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setMarcada(i => Math.max(i - 1, -1)); }
    if (e.key === 'Escape') { setAbierto(false); setMarcada(-1); onCerrar?.(); }
  }

  return (
    <div ref={caja} className={cn('relative w-full', pastilla && 'max-w-xl', className)}>
      {/* En la barra de arriba la caja es un `form`: así el Intro del teclado
          y la lupa hacen lo mismo sin escribirlo dos veces, y el navegador la
          reconoce como lo que es. */}
      <form
        onSubmit={e => { e.preventDefault(); buscar(); }}
        className={cn(
          'flex items-center bg-white transition-colors',
          pastilla
            ? cn('gap-1.5 rounded-full border border-slate-300 pl-3 focus-within:border-slate-400', compacto ? 'h-7' : 'h-9')
            : 'gap-2 h-10 px-3 rounded-xl border border-slate-200 focus-within:border-emerald-400',
        )}
      >
        <Search className="w-4 h-4 shrink-0 text-slate-400" />
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setMarcada(-1); }}
          onFocus={() => sugerencias.length && setAbierto(true)}
          // Pegar texto sigue siendo pegar texto: solo se intercepta cuando el
          // portapapeles trae un fichero Y hay quien sepa qué hacer con él.
          onPaste={e => {
            if (!alPegarFichero) return;
            const f = Array.from(e.clipboardData?.files || [])[0];
            if (!f) return;
            e.preventDefault();
            alPegarFichero(f);
          }}
          onKeyDown={teclas}
          placeholder={placeholder ?? 'Busca en toda la plataforma'}
          aria-label="Buscar"
          // 16 px en móvil o iOS hace zoom al tocar el campo, y desde ahí la
          // página se arrastra de lado.
          className="flex-1 min-w-0 bg-transparent text-base sm:text-sm outline-none placeholder:text-slate-400"
        />
        {cargando && <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-slate-300" />}
        {q && !cargando && (
          <button type="button" onClick={() => { setQ(''); setSugerencias([]); }} aria-label="Borrar"
            className="shrink-0 text-slate-300 hover:text-slate-500"><X className="w-3.5 h-3.5" /></button>
        )}
        {derecha}
      </form>

      {abierto && sugerencias.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 max-h-80 overflow-y-auto">
          {sugerencias.map((s, i) => (
            <li key={`${s.clase}-${i}`}>
              <button
                type="button"
                onMouseEnter={() => setMarcada(i)}
                onClick={() => { setAbierto(false); onCerrar?.(); navigate(s.url); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left ${i === marcada ? 'bg-slate-50' : ''}`}
              >
                {(() => {
                  if (s.clase === 'tematica') {
                    const a = s.areaId ? AREA_POR_ID[s.areaId] : null;
                    const Icono = a?.icono;
                    return Icono
                      ? <Icono className={cn('w-4 h-4 shrink-0', a!.color)} />
                      : <Search className="w-3.5 h-3.5 shrink-0 text-slate-300" />;
                  }
                  return s.clase === 'frase'
                    ? <Search className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                    : <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-emerald-500" />;
                })()}
                <span className="min-w-0 flex-1 text-sm text-slate-700 truncate">
                  {s.texto}
                  {s.clase === 'tematica' && (
                    <span className="text-slate-400"> · todo lo publicado</span>
                  )}
                </span>
                {s.tipo && <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-400">{s.tipo}</span>}
              </button>
            </li>
          ))}
          <li className="border-t border-slate-100 mt-1 pt-1">
            <button type="button" onClick={() => buscar()}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50">
              <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="text-sm text-slate-600">
                Ver todo lo que hay sobre <b className="text-slate-800">{q}</b>
              </span>
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

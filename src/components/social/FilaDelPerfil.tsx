// ============================================================================
// UNA FILA DEL PERFIL (2026-08-22, Eugenio: «pon en grande una fila de
// PROYECTOS que se puedan ver 3 y hacer scroll lateral, y otra de
// PUBLICACIONES […] y una tercera de PRODUCTOS. En móvil se verá una y un
// poquito de la otra para invitar a hacer scroll»).
// ============================================================================
// TRES ANCHOS Y UN CACHO. En el ordenador cada tarjeta ocupa un tercio; en el
// teléfono, un 78%, que deja asomar el borde de la siguiente. Ese trozo que se
// ve es lo que dice «hay más»: una fila que acaba justo en el borde parece que
// se acaba ahí, y nadie desliza lo que cree que no tiene continuación.
//
// UNA SOLA FILA PARA LAS TRES SECCIONES. Proyectos, publicaciones y productos
// se ven distintos por dentro pero se comportan igual, y tres copias de esto
// serían tres sitios donde arreglar el mismo desplazamiento.
import { useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ElementoDeFila {
  id: string;
  titulo: string;
  /** Lo pequeño de debajo: el autor, el precio, lo que quede. */
  detalle?: string | null;
  /** Una imagen si la hay; si no, el icono. */
  imagen?: string | null;
  icono?: ReactNode;
  /** Un color de fondo cuando no hay imagen, para que la fila no sea gris. */
  color?: string;
  onAbrir: () => void;
}

export default function FilaDelPerfil({ titulo, icono, elementos, vacio, onCrear, onEditar }: {
  titulo: string;
  icono: ReactNode;
  elementos: ElementoDeFila[];
  /** Qué decir cuando no hay nada. Se dice: una fila vacía sin explicación
   *  parece un fallo de carga. */
  vacio: string;
  /** Solo en tu propio perfil: crear uno nuevo desde aquí. */
  onCrear?: () => void;
  /** Solo en tu propio perfil: llevar a donde se gestionan. */
  onEditar?: () => void;
}) {
  const pista = useRef<HTMLDivElement>(null);

  /** Desplaza una tarjeta entera, no una cantidad fija de píxeles: así el
   *  siguiente empujón siempre deja una tarjeta encuadrada. */
  const mover = (dir: 1 | -1) => {
    const c = pista.current;
    if (!c) return;
    const paso = (c.querySelector('[data-tarjeta]') as HTMLElement)?.offsetWidth ?? c.clientWidth / 3;
    c.scrollBy({ left: dir * (paso + 12), behavior: 'smooth' });
  };

  return (
    <section className="min-w-0">
      <div className="flex items-center gap-2 mb-1.5 px-0.5">
        <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 inline-flex items-center gap-1.5">
          {icono} {titulo}
        </h2>
        {!!elementos.length && (
          <span className="text-[10px] font-bold text-slate-300">{elementos.length}</span>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          {onCrear && (
            <button onClick={onCrear} title={`Añadir a ${titulo.toLowerCase()}`}
              className="w-6 h-6 grid place-items-center rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Las flechas SOLO cuando hay más de lo que cabe. Unas flechas que
              no llevan a ninguna parte enseñan a no pulsarlas. */}
          {elementos.length > 3 && (
            <>
              <button onClick={() => mover(-1)} title="Anterior"
                className="hidden sm:grid w-6 h-6 place-items-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => mover(1)} title="Siguiente"
                className="hidden sm:grid w-6 h-6 place-items-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {elementos.length === 0 ? (
        <button
          onClick={onCrear || onEditar}
          disabled={!onCrear && !onEditar}
          className="w-full h-20 rounded-2xl border border-dashed border-slate-200 grid place-items-center text-[11px] text-slate-400 hover:border-emerald-300 hover:text-emerald-700 transition-colors disabled:hover:border-slate-200 disabled:hover:text-slate-400"
        >
          {vacio}
        </button>
      ) : (
        <div
          ref={pista}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {elementos.map(e => (
            <button
              key={e.id}
              data-tarjeta
              onClick={e.onAbrir}
              title={e.titulo}
              // EL HOVER QUE AMPLÍA (Eugenio: «haz un efecto hover del ratón
              // que se amplíe cuando haces hover en cualquiera de los
              // elementos»). Se agranda la TARJETA, no solo la imagen, y se
              // levanta un poco con sombra: así se entiende que se puede
              // pulsar. `will-change` para que el navegador la prepare y el
              // primer hover no dé un tirón.
              className={cn(
                'group shrink-0 snap-start text-left rounded-2xl overflow-hidden border border-slate-200 bg-white',
                'transition-all duration-200 will-change-transform',
                'hover:-translate-y-1 hover:shadow-xl hover:border-emerald-200 hover:scale-[1.03]',
                // Móvil: 78% deja asomar la siguiente. Escritorio: un tercio
                // justo, restando los dos huecos de 12 px, para que entren
                // TRES enteras y ni una más.
                'w-[78%] sm:w-[calc((100%-1.5rem)/3)]')}
            >
              <span className="block h-20 sm:h-24 relative overflow-hidden"
                style={{ background: e.color || 'linear-gradient(135deg,#e2e8f0,#f1f5f9)' }}>
                {e.imagen ? (
                  <img src={e.imagen} alt="" loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-white/80">{e.icono}</span>
                )}
              </span>
              <span className="block px-2.5 py-2">
                <span className="block text-xs font-bold text-slate-800 truncate leading-snug">{e.titulo}</span>
                {e.detalle && <span className="block text-[10px] text-slate-400 truncate">{e.detalle}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

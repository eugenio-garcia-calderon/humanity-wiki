// ============================================================================
// LOS CÍRCULOS DE ARRIBA (2026-08-21, Eugenio, con una captura de Instagram:
// «antes aparecerán círculos modo Instagram de las personas que tienes
// agregadas, y si no tienes agregado a nadie te aparecen canales relevantes a
// los que siga mucha gente»).
// ============================================================================
// SE DICE SI SON TUYOS O SUGERIDOS. Un círculo de alguien que sigues y uno de
// alguien que no sigues se ven exactamente igual, así que la diferencia la
// tiene que decir la interfaz: si no, la portada te hace creer que ya tienes
// una red que no tienes. El servidor devuelve `origen` justamente para esto.
//
// SE DESPLAZAN A LO ANCHO, como la tira de objetivos: veinte caras envueltas
// en filas serían media pantalla de caras antes de la primera publicación.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Persona {
  id: string;
  nombre: string | null;
  foto: string | null;
  seguidores: number;
  publicaciones: number;
}

/** Las iniciales, para quien no tiene foto. Aquí SÍ son la respuesta correcta,
 *  al revés que en los proyectos: una persona no se representa con un dibujo
 *  genérico, se representa con su nombre. */
const iniciales = (n: string) =>
  n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '·';

export default function CirculosDePersonas() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState<{ origen: 'seguidos' | 'sugeridos'; personas: Persona[] } | null>(null);

  useEffect(() => {
    fetch('/api/circulos', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setDatos(Array.isArray(j?.personas) ? j : null))
      .catch(() => setDatos(null));
  }, []);

  // NADA QUE ENSEÑAR, NADA QUE OCUPAR. Si no hay ni seguidos ni sugerencias
  // —una plataforma recién arrancada— no se pinta una fila vacía con un texto
  // de relleno: se quita y la primera publicación sube.
  if (!datos || !datos.personas.length) return null;

  const sugeridos = datos.origen === 'sugeridos';

  return (
    <div className="mb-3">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2 px-0.5">
        {sugeridos ? 'Gente a la que seguir' : 'A quien sigues'}
      </p>
      <div className="flex items-start gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {datos.personas.map(p => (
          <button
            key={p.id}
            onClick={() => navigate(`/personas/${p.id}`)}
            title={`${p.nombre || 'Alguien'} · ${p.publicaciones} ${p.publicaciones === 1 ? 'publicación' : 'publicaciones'}`}
            className="shrink-0 w-[68px] flex flex-col items-center gap-1 group"
          >
            {/* EL ANILLO ES LA SEÑAL, como en Instagram: de color si es tuyo,
                gris punteado si es una sugerencia. Así se distinguen de un
                vistazo sin leer el título de arriba. */}
            <span className={cn('rounded-full p-[2px] transition-transform group-hover:scale-105',
              sugeridos
                ? 'border-2 border-dashed border-slate-300'
                : 'bg-gradient-to-br from-emerald-400 via-teal-500 to-indigo-500')}>
              <span className="block rounded-full p-[2px] bg-white">
                {p.foto
                  ? <img src={p.foto} alt="" loading="lazy" className="w-12 h-12 rounded-full object-cover" />
                  : <span className="w-12 h-12 rounded-full bg-slate-100 grid place-items-center text-[13px] font-black text-slate-500">
                      {iniciales(p.nombre || '?')}
                    </span>}
              </span>
            </span>
            <span className="text-[10px] font-bold text-slate-600 truncate max-w-full leading-tight">
              {(p.nombre || 'Alguien').split(' ')[0]}
            </span>
            {/* CUÁNTA GENTE LE SIGUE, solo en las sugerencias: es la razón por
                la que está ahí, y esconderla dejaría la sugerencia sin motivo.
                Si no le sigue nadie todavía se dice el número de publicaciones,
                que es el otro dato real que hay. */}
            {sugeridos && (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-400 leading-none">
                <UserPlus className="w-2.5 h-2.5" />
                {p.seguidores > 0
                  ? `${p.seguidores}`
                  : `${p.publicaciones} pub.`}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

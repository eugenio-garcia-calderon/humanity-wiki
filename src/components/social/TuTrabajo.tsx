// ============================================================================
// TUS PROYECTOS EN LA PORTADA (2026-08-22)
// ============================================================================
// La portada era de LOS DEMÁS: a quién sigues y qué han publicado. Esto es la
// mitad que es TUYA — a dónde vuelves a trabajar.
//
// TENÍA TAMBIÉN LAS TAREAS y se han quitado el mismo día, a petición de
// Eugenio: cinco tareas con su plazo encima de las publicaciones convierten una
// portada en una bandeja de trabajo, y lo primero que uno ve al entrar acaba
// siendo lo que le falta por hacer. Los proyectos se quedan porque son un
// sitio al que ir, no una deuda.
//
// SE SIGUE PIDIENDO `/api/tareas`: es la ruta que trae los proyectos con sus
// tarjetas repartidas y los permisos ya resueltos, y de ahí sale el «3 por
// hacer» de cada tarjeta. Una ruta nueva solo para esto sería una segunda
// forma de contestar a la misma pregunta.
//
// SI NO HAY PROYECTOS, NO OCUPA: no se pinta un bloque vacío con un texto de
// relleno que empuje hacia abajo lo que sí hay que leer.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Icono from '../ui/Icono';
import { iconoDeProyecto } from '../../utils/iconoDeNombre';

interface Proyecto { id: string; titulo: string; slug: string; icono: string | null; pendientes: number }

export default function TuTrabajo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    if (!user) { setCargado(true); return; }
    // SE REUSA `/api/tareas`, que ya trae los proyectos con sus tareas
    // repartidas y los permisos resueltos. Una ruta nueva para la portada
    // sería una segunda forma de contestar a la misma pregunta.
    fetch('/api/tareas', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        const grupos = Array.isArray(j?.proyectos) ? j.proyectos : [];
        const mios = grupos.filter((p: any) => p.mio && !p.esHojaDeRuta);
        setProyectos(mios.map((p: any) => ({
          id: p.id, titulo: p.titulo, slug: p.url,
          icono: p.icono || null,
          pendientes: (p.tareas || []).filter((t: any) => t.estado !== 'hecho').length,
        })));
      })
      .catch(() => {})
      .finally(() => setCargado(true));
  }, [user]);

  if (!user || !cargado) return null;
  if (!proyectos.length) return null;

  return (
    <div className="mb-4">
      <div>
          <div className="flex items-center gap-2 mb-2 px-0.5">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Tus proyectos</p>
            <button onClick={() => navigate('/proyectos')}
              className="ml-auto text-[10px] font-bold text-slate-400 hover:text-emerald-700 inline-flex items-center gap-0.5">
              Ver todos <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {/* En una tira que se desplaza, igual que las personas y los
              objetivos: ocho proyectos en tarjetas serían dos pantallas de
              proyectos antes de la primera publicación. */}
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {proyectos.map(p => (
              <button
                key={p.id}
                onClick={() => navigate(p.slug)}
                className="shrink-0 w-40 text-left px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-colors"
              >
                <span className="flex items-center gap-1.5 mb-1 text-slate-700">
                  <Icono valor={iconoDeProyecto(p.icono, p.titulo)} tamano={16} />
                  <span className="text-xs font-bold truncate">{p.titulo}</span>
                </span>
                <span className="block text-[10px] text-slate-400">
                  {/* LO QUE QUEDA, no lo que hay. Es lo que se mira. */}
                  {p.pendientes === 0 ? 'todo hecho' : `${p.pendientes} por hacer`}
                </span>
              </button>
            ))}
          </div>
      </div>

      {/* LAS TAREAS SE HAN IDO DE LA PORTADA (2026-08-22, hormiguero: «no
          pongas las tareas ahí, mejor quítalas»).

          Se pusieron ayer para que el inicio dijera si había algo que hacer
          hoy. La idea era buena y el sitio, malo: cinco tareas con su plazo
          encima de las publicaciones convierten una portada en una bandeja de
          trabajo, y lo primero que uno ve al entrar es lo que le falta por
          hacer. Viven donde se trabajan —en Tareas y en su proyecto—, que es
          donde se pueden mover, marcar y reordenar.

          LOS PROYECTOS SE QUEDAN: son a dónde se va, no lo que se debe. */}

    </div>
  );
}

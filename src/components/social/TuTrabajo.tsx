// ============================================================================
// TUS PROYECTOS Y LO QUE TE QUEDA (2026-08-22, Eugenio: «la página de
// publicaciones, aparte de los globos de personas y una serie de publicaciones,
// también tiene que aparecer los proyectos de uno mismo y tareas pendientes»)
// ============================================================================
// La portada era de LOS DEMÁS: a quién sigues y qué han publicado. Faltaba la
// mitad que es TUYA, y era justo la que te dice si tienes algo que hacer hoy.
//
// PRIMERO LO QUE VENCE. De todas las tareas pendientes se enseñan las que
// tienen plazo y las que van con retraso, no las primeras que salgan: una
// portada que enseña cinco tareas cualesquiera es decoración; una que enseña
// las tres que se te pasan esta semana es una herramienta.
//
// SI NO HAY NADA, NO OCUPA. Ni proyectos ni tareas pendientes significa que no
// se pinta nada — ni un bloque vacío con un texto de relleno, que empujaría
// hacia abajo lo que sí hay que leer.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, ListChecks, CalendarDays, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../contexts/AuthContext';
import Icono from '../ui/Icono';
import { iconoDeProyecto } from '../../utils/iconoDeNombre';

interface Proyecto { id: string; titulo: string; slug: string; icono: string | null; pendientes: number }
interface Tarea {
  id: string; titulo: string; vence: string | null; prioridad: string | null;
  proyecto: string | null; proyectoUrl: string | null;
}

/** Los días que faltan, contando por DÍAS. Igual que en la lista de tareas: a
 *  las 23:00 sigue venciendo hoy, no «en 0,04 días». */
const diasHasta = (iso: string) => {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - hoy.getTime()) / 86400000);
};

const cuando = (iso: string) => {
  const n = diasHasta(iso);
  if (n < -1) return { txt: `hace ${-n} días`, urgente: true };
  if (n === -1) return { txt: 'ayer', urgente: true };
  if (n === 0) return { txt: 'hoy', urgente: true };
  if (n === 1) return { txt: 'mañana', urgente: false };
  return { txt: `en ${n} días`, urgente: false };
};

export default function TuTrabajo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
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

        const sueltas: Tarea[] = [];
        for (const p of mios) {
          for (const t of (p.tareas || [])) {
            if (t.estado === 'hecho') continue;
            sueltas.push({
              id: t.id, titulo: t.titulo, vence: t.vence || null, prioridad: t.prioridad,
              proyecto: p.titulo, proyectoUrl: p.url,
            });
          }
        }
        // Con plazo primero y por lo que antes vence; sin plazo, por prioridad.
        const peso: Record<string, number> = { alta: 0, media: 1, baja: 2 };
        sueltas.sort((a, b) => {
          const va = a.vence ? diasHasta(a.vence) : 9999;
          const vb = b.vence ? diasHasta(b.vence) : 9999;
          if (va !== vb) return va - vb;
          return (peso[a.prioridad || 'media'] ?? 1) - (peso[b.prioridad || 'media'] ?? 1);
        });
        setTareas(sueltas.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setCargado(true));
  }, [user]);

  if (!user || !cargado) return null;
  if (!proyectos.length && !tareas.length) return null;

  return (
    <div className="mb-4 space-y-3">
      {proyectos.length > 0 && (
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
      )}

      {tareas.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-0.5">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Lo que te queda</p>
            <button onClick={() => navigate('/tareas')}
              className="ml-auto text-[10px] font-bold text-slate-400 hover:text-emerald-700 inline-flex items-center gap-0.5">
              Ver todas <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {tareas.map(t => {
              const v = t.vence ? cuando(t.vence) : null;
              return (
                <button
                  key={t.id}
                  onClick={() => navigate(`${t.proyectoUrl}${t.proyectoUrl?.includes('?') ? '&' : '?'}tarea=${t.id}`)}
                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <ListChecks className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-slate-800 truncate">{t.titulo}</span>
                    <span className="block text-[10px] text-slate-400 truncate">{t.proyecto}</span>
                  </span>
                  {v && (
                    <span className={cn('shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider',
                      v.urgente ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-slate-500 bg-slate-50 border-slate-200')}>
                      <CalendarDays className="w-2.5 h-2.5" /> {v.txt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass, Layers, Map as MapIcon, Table2, Users, Store, Palette, Sparkles,
  Shield, Scale, FolderKanban, ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import TableroKanban, { type ItemTablero, type Grupo } from '../components/tablero/TableroKanban';

// ============================================================================
// VISIÓN Y HOJA DE RUTA (2026-08-08, petición del usuario)
// ============================================================================
// Para qué existe humanity.wiki, y el tablero operativo de qué está hecho,
// qué se está haciendo y qué falta. Nueve grupos para que cientos de
// funcionalidades sigan siendo legibles.
//
// El tablero es el mismo componente que usan los proyectos de cada persona.

const GRUPOS: Grupo[] = [
  { id: 'canvas', label: 'El lienzo', color: '#7c3aed', desc: 'La pizarra infinita estilo Miro' },
  { id: 'mapas', label: 'Los mapas', color: '#0284c7', desc: 'El conocimiento sobre el territorio' },
  { id: 'datos', label: 'Bases de datos', color: '#0d9488', desc: 'Tablas vivas estilo Notion' },
  { id: 'social', label: 'Red social', color: '#d97706', desc: 'Personas, roles y comunidad' },
  { id: 'mercado', label: 'Mercado', color: '#16a34a', desc: 'Pagos, productos y reparto' },
  { id: 'diseno', label: 'Diseño y UI', color: '#db2777', desc: 'Interfaz, onboarding y difusión' },
  { id: 'ia', label: 'La IA', color: '#4f46e5', desc: 'Modelos, agentes y veracidad' },
  { id: 'infra', label: 'Datos y seguridad', color: '#475569', desc: 'Almacenamiento e infraestructura' },
  { id: 'gobernanza', label: 'Gobernanza', color: '#b91c1c', desc: 'Veracidad, licencias y decisiones' },
];

const ICONOS: Record<string, any> = {
  canvas: Layers, mapas: MapIcon, datos: Table2, social: Users, mercado: Store,
  diseno: Palette, ia: Sparkles, infra: Shield, gobernanza: Scale,
};

export default function Vision() {
  const { user } = useAuth();
  const [items, setItems] = useState<ItemTablero[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = () => fetch('/api/roadmap')
    .then(r => r.json())
    .then(j => setItems(Array.isArray(j) ? j : []))
    .catch(() => setItems([]))
    .finally(() => setCargando(false));

  useEffect(() => { cargar(); }, []);

  const total = items.length;
  const hechas = items.filter(i => i.estado === 'hecho').length;
  const avance = total ? Math.round((hechas / total) * 100) : 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 pt-10 pb-24">

        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 mb-3 inline-flex items-center gap-1.5">
            <Compass className="w-3 h-3" /> Visión y hoja de ruta
          </p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-[1.1] text-slate-900">
            Agregar el conocimiento de la humanidad
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-sky-600 to-emerald-600">
              y repartir lo que genere entre quienes lo crean
            </span>
          </h1>
          <div className="mt-5 space-y-3 text-sm text-slate-600 leading-relaxed">
            <p>
              Hoy el saber está partido: los datos en un sitio, los mapas en otro, las conversaciones
              en un tercero, y lo que cada persona sabe encerrado en su cabeza o en su Notion.
              <b className="text-slate-900"> humanity.wiki junta las tres formas de mirar</b> — el dato en crudo,
              el conocimiento conectado y el conocimiento situado en el territorio — sobre una sola base.
            </p>
            <p>
              La plataforma tiene dos mitades que se necesitan. <b className="text-slate-900">El común</b>, donde
              se agrega lo que aporta todo el mundo y nada se duplica: si alguien ya lo escribió, se conecta.
              Y <b className="text-slate-900">tu espacio propio</b>, un lienzo infinito donde construyes lo tuyo
              y decides qué compartes.
            </p>
            <p>
              La inteligencia natural y la artificial trabajan aquí del mismo lado: la IA busca, contrasta,
              señala contradicciones y responde comentarios, pero <b className="text-slate-900">todo lo que
              escribe queda marcado</b> y pendiente de revisión humana. Y quien crea conocimiento que la gente
              lee, cobra por ello.
            </p>
          </div>

          <div className="mt-7 flex items-center gap-4">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-md">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                style={{ width: `${avance}%` }} />
            </div>
            <p className="text-xs font-bold text-slate-500 shrink-0">
              <span className="text-slate-900">{hechas}</span> de {total} · {avance}%
            </p>
          </div>

          <Link to="/proyectos"
            className="inline-flex items-center gap-1.5 mt-5 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors">
            <FolderKanban className="w-3.5 h-3.5" />
            Este mismo tablero, para tus proyectos
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="mt-9">
          {cargando ? (
            <p className="text-sm text-slate-400 text-center py-24">Cargando el tablero…</p>
          ) : (
            <TableroKanban
              items={items}
              grupos={GRUPOS.map(g => ({ ...g, icon: ICONOS[g.id] }))}
              puedeEditar={!!user?.isAdmin}
              onRecargar={cargar}
            />
          )}
        </div>
      </div>
    </div>
  );
}

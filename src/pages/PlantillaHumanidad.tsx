import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { crearHumanidadWiki } from '../utils/plantillaHumanidad';
import { VistaMenuTemas } from '../components/bloquesDatos/menuTemas/Lectura';
import { temasDeLaHumanidad } from '../components/bloquesDatos/menuTemas/temas';

// LA PLANTILLA «HUMANIDAD WIKI», A UN CLIC (2026-10-18). Cualquiera con cuenta la crea en su
// perfil y luego la cambia como quiera: es una página normal de Wiki Creator.
export default function PlantillaHumanidad() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [avance, setAvance] = useState<[number, number] | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  const crear = async () => {
    setFallo(null); setAvance([0, 1]);
    try {
      const id = await crearHumanidadWiki((h, t) => setAvance([h, t]));
      navigate(`/paginas/${id}`);
    } catch (e: any) { setFallo(e?.message || 'No se pudo crear.'); setAvance(null); }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Plantilla</p>
      <h1 className="mt-1 flex items-center gap-2 text-3xl font-black text-slate-900"><Globe2 className="h-7 w-7 text-emerald-600" /> Humanidad Wiki</h1>
      <p className="mt-2 max-w-xl text-slate-600">
        Una página para reunir el conocimiento, la sabiduría y las soluciones de la humanidad por temas. Se crea en tu perfil:
        una página principal con el menú de temas y una página por cada tema con todo lo publicado sobre él. Después la cambias como quieras.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={crear} disabled={!user || !!avance}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
          {avance && <Loader2 className="h-4 w-4 animate-spin" />}
          {avance ? `Creando… ${avance[0]} de ${avance[1]}` : 'Crear en mi perfil'}
        </button>
        {!user && <span className="text-sm text-slate-500">Inicia sesión para crearla.</span>}
      </div>
      {fallo && <p className="mt-3 text-sm font-bold text-rose-600">{fallo}</p>}
      <div className="mt-8">
        <p className="mb-2 text-xs font-bold text-slate-400">Así empieza el menú de temas:</p>
        <VistaMenuTemas datos={{ titulo: 'Temas', forma: 'rejilla', temas: temasDeLaHumanidad() }} enEditor />
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import {
  X, Camera, Megaphone, FolderKanban, ListChecks, FileText, Globe2,
  Map as MapIcon, Table2, CalendarDays, Store, Users2, Sparkles, Paperclip,
} from 'lucide-react';

/*
 * CREAR — LA HOJA QUE SUBE DESDE EL BOTÓN (2026-08-23, agente de APP/UX)
 * ============================================================================
 * Eugenio: «el botón del centro será un botón de crear, y aquí estarán todas
 * las herramientas que hemos desarrollado hasta ahora. Se abrirá un menú desde
 * el centro inferior hasta la mitad de la pantalla, tanto en móvil como en
 * ordenador».
 *
 * MEDIA PANTALLA Y NO MÁS, en los dos tamaños: crear es un paso de un segundo
 * —eliges qué y te vas—, no una pantalla donde quedarse. Ocupando la mitad, lo
 * que estabas haciendo sigue ahí detrás y se ve; a pantalla completa habría que
 * cerrarla para recordar de dónde venías.
 *
 * SUBE DESDE ABAJO porque es de donde sale el botón que la abre. Un menú que
 * aparece lejos del dedo que lo ha pedido obliga a buscarlo con la vista.
 *
 * EL ORDEN NO ES EL DEL RAÍL. Aquí manda con qué frecuencia se crea cada cosa,
 * no cómo se organizan después: la cámara y la publicación primero —lo que se
 * hace de pie, con el móvil en la mano— y las herramientas de escritorio
 * después. Es la misma lista de cosas y dos preguntas distintas.
 */

interface Cosa { nombre: string; icono: any; a: string; nota?: string }

const COSAS: Cosa[] = [
  { nombre: 'Foto o vídeo', icono: Camera,       a: '/?atajo=crear',        nota: 'Con la cámara' },
  { nombre: 'Publicación',  icono: Megaphone,    a: '/explorar?crear=1',    nota: 'En el muro' },
  { nombre: 'Proyecto',     icono: FolderKanban, a: '/proyectos?nuevo=1',   nota: 'Con su tablero' },
  { nombre: 'Tarea',        icono: ListChecks,   a: '/tareas?nueva=1' },
  { nombre: 'Página',       icono: FileText,     a: '/paginas?nueva=1',     nota: 'Texto, fotos y vídeo' },
  { nombre: 'Esquema',      icono: Globe2,       a: '/esquemas?nuevo=1',    nota: 'Ideas conectadas' },
  { nombre: 'Mapa',         icono: MapIcon,      a: '/mapas?nuevo=1' },
  { nombre: 'Tabla',        icono: Table2,       a: '/tablas?nueva=1',      nota: 'Datos con columnas' },
  { nombre: 'Fecha',        icono: CalendarDays, a: '/calendario?nuevo=1' },
  { nombre: 'Producto',     icono: Store,        a: '/comercio?nuevo=1',    nota: 'Para vender' },
  { nombre: 'Persona',      icono: Users2,       a: '/personas?nueva=1' },
  { nombre: 'Archivo',      icono: Paperclip,    a: '/archivos' },
  { nombre: 'Pedírselo a la IA', icono: Sparkles, a: '/ia',                 nota: 'Que lo haga ella' },
];

export default function HojaCrear({ onCerrar }: { onCerrar: () => void }) {
  const navegar = useNavigate();

  return (
    <>
      {/* Tocar fuera cierra, que es lo primero que intenta todo el mundo. */}
      <div
        onClick={onCerrar}
        aria-hidden
        className="fixed inset-0 z-[9998] bg-slate-900/30 animate-in fade-in duration-150"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Crear"
        className="fixed inset-x-0 bottom-0 z-[9998] h-1/2 animate-in slide-in-from-bottom duration-200"
      >
        <div className="mx-auto flex h-full max-w-2xl flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl">
          {/* El tirador de arriba: dice «esto se arrastra o se cierra» sin
              escribirlo, y es lo que la gente ya conoce de su teléfono. */}
          <div className="flex items-center justify-between px-5 pb-2 pt-3">
            <span className="mx-auto h-1 w-10 rounded-full bg-slate-200" />
            <button onClick={onCerrar} title="Cerrar" aria-label="Cerrar"
              className="absolute right-4 top-3 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="px-5 pb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Crear</p>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {COSAS.map(c => (
                <button
                  key={c.nombre}
                  onClick={() => { navegar(c.a); onCerrar(); }}
                  className="flex flex-col items-start gap-1 rounded-2xl border border-slate-200 px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                >
                  <c.icono className="h-5 w-5 text-emerald-600" />
                  <span className="text-[13px] font-black text-slate-900">{c.nombre}</span>
                  {/* La nota explica lo que el nombre no dice. Las que no la
                      necesitan no la llevan: rellenar todas con una frase
                      obligaría a inventar texto para «Mapa». */}
                  {c.nota && <span className="text-[11px] leading-snug text-slate-500">{c.nota}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

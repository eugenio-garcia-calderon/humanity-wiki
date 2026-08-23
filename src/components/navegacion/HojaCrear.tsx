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
        /*
         * 72 vh Y NO LA MITAD (2026-08-23). Eugenio: «haz más grande la ventana
         * central de crear y un poco más pequeñas las tarjetas de herramientas
         * para que quepa todo sin tener que hacer el scroll down».
         *
         * Media pantalla estaba bien elegida por lo que dura el gesto —creas y
         * te vas— y mal por lo que hay que enseñar: son TRECE cosas, y a la
         * mitad quedaban cinco fuera. Una lista donde hay que buscar lo que no
         * se ve pierde justo lo que la hacía rápida.
         *
         * El sitio sale de los dos lados a la vez: la hoja crece y la tarjeta
         * encoge. Sólo agrandando habría hecho falta el 95 % de la pantalla,
         * que ya no es una hoja sino otra página; sólo encogiendo, las tarjetas
         * dejarían de leerse. Con 72 vh y cinco columnas caben las trece en
         * tres filas en un ordenador y en cinco en un móvil.
         */
        className="fixed inset-x-0 bottom-0 z-[9998] h-[72vh] animate-in slide-in-from-bottom duration-200"
      >
        <div className="mx-auto flex h-full max-w-3xl flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl">
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

          {/* `overflow-y-auto` se queda aunque ya no haga falta: en una pantalla
              muy baja —un portátil de 13 pulgadas con la barra del navegador— o
              con la letra del sistema muy grande, trece tarjetas pueden volver a
              no caber. Que entonces se pueda bajar es mejor que quedarse sin
              ver las últimas. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {COSAS.map(c => (
                <button
                  key={c.nombre}
                  onClick={() => { navegar(c.a); onCerrar(); }}
                  title={c.nota}
                  className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 px-2 py-3 text-center transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                >
                  <c.icono className="h-5 w-5 shrink-0 text-emerald-600" />
                  <span className="text-[12px] font-black leading-tight text-slate-900">{c.nombre}</span>
                  {/* La nota se esconde en pantallas pequeñas y sigue viva en el
                      `title`: en un móvil el sitio se lo tienen que llevar los
                      nombres, que son lo que hay que leer. Las que no la
                      necesitan no la llevan — rellenarlas todas obligaría a
                      inventar una frase para «Mapa». */}
                  {c.nota && (
                    <span className="hidden text-[10px] leading-tight text-slate-500 sm:line-clamp-2">{c.nota}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

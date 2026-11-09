// ============================================================================
// VISTA «PANTALLA COMPLETA» (2026-11-09, Eugenio)
// ============================================================================
// «Una vista que sea solo del calendario, sin el menú ni ningún botón, para que
// se pueda ver en pantalla completa. Pulsando un botón arriba a la derecha… Y
// que aparezca el diseño que esté seleccionado como favorito.»
//
// Solo las hojas: la portada y los doce meses seguidos, sin editar, cada mes
// con su diseño FAVORITO. Cada página A4 (la ilustración, el calendario) se
// encaja en el alto de la pantalla. Se sale con Esc o con el aspa que asoma al
// mover el ratón o tocar la pantalla y se esconde sola a los dos segundos: sin
// ella, en un móvil (donde Esc no existe) no habría manera de volver.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/core';
import { HojaMes, ANCHO_MM, ALTO_MM } from './HojaMes';
import { HojaPortada, ALTO_PORTADA_MM } from './HojaPortada';
import type { ContenidoMes, PortadaCalendario } from '../../data/calendarioArteTipos';

const MM_A_PX = 96 / 25.4;
/** Proporción de una página A4 apaisada. */
const A4 = 297 / 210;

function Escalada({ children, altoMm }: { children: React.ReactNode; altoMm: number }) {
  const caja = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0.5);
  useLayoutEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setEscala(el.clientWidth / (ANCHO_MM * MM_A_PX));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={caja} className="w-full">
      <div style={{ height: altoMm * MM_A_PX * escala, width: ANCHO_MM * MM_A_PX * escala }} className="overflow-hidden shadow-2xl">
        <div style={{ transform: `scale(${escala})`, transformOrigin: 'top left', width: `${ANCHO_MM}mm` }}>{children}</div>
      </div>
    </div>
  );
}

interface Props {
  anio: number;
  portada: PortadaCalendario;
  /** Cada mes con `imagen` = su diseño favorito. */
  meses: ContenidoMes[];
  /** Ilustración favorita de cada mes, para las miniaturas de la portada. */
  imagenes: Record<number, string | undefined>;
  /** Las variables de la tipografía elegida. */
  estilo: React.CSSProperties;
  /** Mes en el que se estaba (0 = portada): se empieza ahí. */
  mesInicial: number;
  alSalir: () => void;
}

export function VistaPantalla({ anio, portada, meses, imagenes, estilo, mesInicial, alSalir }: Props) {
  const [aspa, setAspa] = useState(false);
  const temporizador = useRef<number>();

  // Asoma el aspa un momento al mover el ratón o tocar.
  useEffect(() => {
    const mostrar = () => {
      setAspa(true);
      window.clearTimeout(temporizador.current);
      temporizador.current = window.setTimeout(() => setAspa(false), 2000);
    };
    window.addEventListener('mousemove', mostrar);
    window.addEventListener('touchstart', mostrar, { passive: true });
    return () => {
      window.removeEventListener('mousemove', mostrar);
      window.removeEventListener('touchstart', mostrar);
      window.clearTimeout(temporizador.current);
    };
  }, []);

  // Esc sale. Y si el navegador sale de pantalla completa (Esc, F11, el gesto
  // del sistema), también se sale de esta vista: quedarse en ella sin pantalla
  // completa dejaría a la persona sin menú y sin saber por qué.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => alSalir());
      else alSalir();
    };
    const cambio = () => { if (!document.fullscreenElement) alSalir(); };
    document.addEventListener('keydown', tecla);
    document.addEventListener('fullscreenchange', cambio);
    return () => { document.removeEventListener('keydown', tecla); document.removeEventListener('fullscreenchange', cambio); };
  }, [alSalir]);

  // Empieza en el mes donde se estaba.
  useEffect(() => {
    if (mesInicial > 0) document.getElementById(`ca-pantalla-${mesInicial}`)?.scrollIntoView({ block: 'start' });
  }, [mesInicial]);

  const salir = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => alSalir());
    else alSalir();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-800" style={estilo}>
      {/* Cada página A4 ocupa el alto de la pantalla, o el ancho si es más estrecha. */}
      <div className="mx-auto flex flex-col items-center gap-8 py-4" style={{ width: `min(calc(100vw - 1.5rem), calc((100dvh - 2rem) * ${A4}))` }}>
        <Escalada altoMm={ALTO_PORTADA_MM}>
          <HojaPortada anio={anio} meses={meses} portada={portada} editando={false} alCambiar={() => {}} imagenes={imagenes} />
        </Escalada>
        {meses.map(m => (
          <div key={m.mes} id={`ca-pantalla-${m.mes}`} className="w-full">
            <Escalada altoMm={ALTO_MM}>
              <HojaMes anio={anio} contenido={m} editando={false} alCambiar={() => {}} perezosa />
            </Escalada>
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        onClick={salir}
        aria-label="Salir de la pantalla completa"
        className={`fixed right-3 top-3 rounded-full bg-black/50 p-2 text-white transition-opacity duration-500 hover:bg-black/70 ${aspa ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  );
}

// ============================================================================
// JUEGO VITAL — la transición de pantalla al entrar en un proyecto
// (2026-08-18, petición de Eugenio: «como en Pokémon»).
// ============================================================================
// Va en HTML, encima del lienzo, no dentro del 3D: así el mundo puede cambiar
// por debajo mientras la pantalla está tapada, que es justo el truco de los
// Pokémon —la transición existe para esconder el cambio de escenario.
//
// Dos tiempos: un fogonazo corto y una malla de rombos que crece desde el
// centro hasta cubrirlo todo. Al salir, la misma malla se retira.
import { useEffect, useState } from 'react';

/** Columnas y filas de rombos. Suficientes para que se lea como malla. */
const COLS = 14;
const FILAS = 8;

export type FaseTransicion = 'cerrando' | 'abriendo' | null;

export default function Transicion({ fase, color, titulo, onCubierto }: {
  fase: FaseTransicion;
  /** El color del proyecto: la transición se tiñe de lo que vas a visitar. */
  color: string;
  titulo?: string;
  /** Se llama cuando la pantalla está TAPADA del todo: es cuando se cambia el mundo. */
  onCubierto?: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!fase) { setVisible(false); return; }
    setVisible(true);
    if (fase !== 'cerrando') return;
    // Cuando termina de cerrarse, se avisa: ese es el instante de cambiar el
    // escenario sin que se vea el salto.
    const t = setTimeout(() => onCubierto?.(), 620);
    return () => clearTimeout(t);
  }, [fase, onCubierto]);

  if (!visible || !fase) return null;
  const cerrando = fase === 'cerrando';

  const rombos = [];
  for (let f = 0; f < FILAS; f++) {
    for (let c = 0; c < COLS; c++) {
      // El retraso sale de la distancia al centro: la malla nace en medio y se
      // abre hacia los bordes, como la onda de una explosión.
      const dx = (c + 0.5) / COLS - 0.5;
      const dy = (f + 0.5) / FILAS - 0.5;
      const d = Math.hypot(dx * 1.6, dy);
      const retraso = (cerrando ? d : 0.9 - d) * 320;
      rombos.push(
        <span
          key={`${f}-${c}`}
          style={{
            position: 'absolute',
            left: `${(c / COLS) * 100}%`,
            top: `${(f / FILAS) * 100}%`,
            width: `${100 / COLS}%`,
            height: `${100 / FILAS}%`,
            background: color,
            transform: cerrando ? 'scale(0) rotate(45deg)' : 'scale(1.6) rotate(45deg)',
            animation: `${cerrando ? 'jv-rombo-in' : 'jv-rombo-out'} 300ms cubic-bezier(.4,0,.2,1) ${retraso}ms forwards`,
          }}
        />,
      );
    }
  }

  return (
    <div className="absolute inset-0 z-[60] pointer-events-none overflow-hidden">
      <style>{`
        @keyframes jv-rombo-in  { to { transform: scale(1.6) rotate(45deg); } }
        @keyframes jv-rombo-out { to { transform: scale(0)   rotate(45deg); } }
        @keyframes jv-fogonazo  { 0% { opacity: 0 } 12% { opacity: .95 } 100% { opacity: 0 } }
        @keyframes jv-rotulo    { 0% { opacity: 0; transform: translateY(8px) } 25%,75% { opacity: 1; transform: none } 100% { opacity: 0 } }
      `}</style>
      {rombos}
      {cerrando && (
        <div className="absolute inset-0 bg-white" style={{ animation: 'jv-fogonazo 520ms ease-out forwards' }} />
      )}
      {cerrando && titulo && (
        <div
          className="absolute inset-0 flex items-center justify-center px-8"
          style={{ animation: 'jv-rotulo 900ms ease-out 340ms both' }}
        >
          <p className="text-center text-white font-black text-2xl sm:text-4xl tracking-tight drop-shadow-lg">
            {titulo}
          </p>
        </div>
      )}
    </div>
  );
}

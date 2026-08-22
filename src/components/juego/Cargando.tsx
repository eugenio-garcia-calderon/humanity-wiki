// ============================================================================
// JUEGO VITAL — LA PANTALLA DE CARGA (2026-08-19, fase 11).
//
// Entrar en la aldea son ~46 MB de modelos y texturas. Hasta ahora eso era
// una línea de texto gris parpadeando, y en una conexión normal parecía que
// la web se había colgado. Ahora se ve QUÉ se está cargando y CUÁNTO falta,
// y mientras tanto se aprende a jugar.
//
// El progreso es el de verdad: `useProgress` de drei escucha al gestor de
// carga de three.js, así que la barra avanza con cada fichero que entra.
// ============================================================================
import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

/** El nombre del fichero que está bajando, en cristiano. */
function enCastellano(url: string): string {
  const f = (url || '').split('/').pop() || '';
  if (/Hair/i.test(f)) return 'peinados';
  if (/Peasant|Ranger|Superhero|Regular/i.test(f)) return 'la gente de la aldea';
  if (/UAL|Animation/i.test(f)) return 'las animaciones (caminar, correr, saludar)';
  if (/hierba|grass/i.test(f)) return 'la hierba';
  if (/adoquin/i.test(f)) return 'los adoquines de la plaza';
  if (/corteza|follaje/i.test(f)) return 'la corteza y las hojas';
  if (/tierra|grava|roca/i.test(f)) return 'el suelo';
  if (/teja|revoco|ladrillo|madera|chapa/i.test(f)) return 'las casas';
  if (/agua|water|Water/i.test(f)) return 'el agua';
  if (/cielo|sky|hdr|exr/i.test(f)) return 'el cielo';
  if (f) return f.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]/g, ' ').toLowerCase();
  return 'tu mundo';
}

const CONSEJOS = [
  'Muévete con W A S D, o con las flechas. Mayúsculas para correr.',
  'Pulsa E cuando estés al lado de alguien para hablar con él.',
  'La rueda del ratón aleja y acerca la cámara.',
  'Del centro de la plaza salen seis caminos. Cada cartel te dice a dónde llevan.',
  'Todo lo que hay a los lados de los caminos se come: son 48 especies ibéricas de verdad.',
  'Acércate a una planta y te dirá cómo se llama y qué da.',
  'Con la bici y el aeromóvil llegas antes al otro extremo del valle.',
  'El contador de dinero abre tus finanzas: lo que tienes, lo que quieres y lo que cuesta cada proyecto.',
  'Es de día o de noche según la hora que sea en tu casa. Puedes cambiarla con el botón del sol.',
];

export default function Cargando() {
  const { progress, item, loaded, total } = useProgress();
  const [consejo, setConsejo] = useState(0);
  // Lo que ya ha llegado no se descuenta: si un lote nuevo entra en la cola,
  // la barra se quedaría atrás y parecería que va marcha atrás.
  const [tope, setTope] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setConsejo(c => (c + 1) % CONSEJOS.length), 4200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { setTope(t => Math.max(t, progress)); }, [progress]);

  const pct = Math.round(tope);

  return (
    // z-40: por encima del HUD (z-30). Mientras se carga no debe verse nada
    // más, y en una pantalla de móvil los botones se le montaban encima.
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 px-4 overflow-hidden
                    bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950">
      {/* Un ficus dibujado, para que la espera ya sea el sitio al que vas */}
      <svg viewBox="0 0 120 120" className="w-16 h-16 sm:w-24 sm:h-24 opacity-90" aria-hidden>
        <ellipse cx="60" cy="104" rx="34" ry="7" className="fill-emerald-800/40" />
        <path d="M58 104 L57 70 Q56 62 60 58 Q64 62 63 70 L62 104 Z" className="fill-amber-200/70" />
        <path d="M58 104 Q48 100 44 104 M62 104 Q72 100 76 104" className="stroke-amber-200/50" strokeWidth="3" fill="none" strokeLinecap="round" />
        <g className="fill-emerald-500/80">
          <circle cx="60" cy="44" r="22" />
          <circle cx="38" cy="54" r="15" />
          <circle cx="82" cy="54" r="15" />
          <circle cx="48" cy="34" r="13" />
          <circle cx="74" cy="34" r="13" />
        </g>
        <g className="fill-emerald-300/60">
          <circle cx="52" cy="38" r="5" />
          <circle cx="70" cy="46" r="4" />
          <circle cx="42" cy="52" r="3.5" />
        </g>
      </svg>

      <div className="text-center max-w-full">
        <p className="text-base sm:text-lg font-black text-white">Construyendo tu mundo</p>
        <p className="text-[11px] sm:text-xs text-emerald-300/80 mt-1 px-2 line-clamp-2">
          {pct >= 99 ? 'Ya casi: encendiendo las luces…' : `Cargando ${enCastellano(item)}`}
        </p>
      </div>

      {/* La barra */}
      <div className="w-full max-w-sm">
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-200 transition-[width] duration-300"
               style={{ width: `${Math.max(4, pct)}%` }} />
        </div>
        <div className="flex justify-between gap-2 mt-1.5 text-[10px] font-bold tabular-nums text-white/40">
          <span>{pct}%</span>
          {total > 0 && <span className="truncate">{loaded} de {total} piezas</span>}
        </div>
      </div>

      {/* Mientras esperas, aprendes a jugar */}
      <p key={consejo} className="max-w-sm text-center text-[11px] sm:text-xs leading-relaxed text-white/55 animate-in fade-in duration-700">
        {CONSEJOS[consejo]}
      </p>
    </div>
  );
}

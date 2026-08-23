// ============================================================================
// CONFIGURACIÓN (2026-08-20, petición de Eugenio: «lo del ajuste de tamaño de
// letra ponlo en una página dedicada que sea configuración»).
// ============================================================================
// Los ajustes que afectan a CÓMO se ve la app, no a lo que contiene. Vive
// fuera del menú de herramientas porque no es una herramienta: es un sitio al
// que vas una vez y te olvidas.
import { Settings, Check, Type } from 'lucide-react';
import { cn } from '../utils/cn';
import { useSettings, FontScaleKey, FONT_SCALE_LABELS } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { BorrarCuenta } from '../components/cuenta/BorrarCuenta';
import CuentaDeGoogle from '../components/social/CuentaDeGoogle';
import { Bloqueados } from '../components/cuenta/Bloqueados';

export default function Configuracion() {
  const { fontScale, setFontScale } = useSettings();
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto w-full">
      <h1 className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-slate-900 mb-6">
        <Settings className="w-5 h-5 text-emerald-600" /> Configuración
      </h1>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="inline-flex items-center gap-2 text-sm font-black text-slate-800 mb-1">
          <Type className="w-4 h-4 text-slate-400" /> Tamaño de letra
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Se aplica a toda la plataforma{user ? ' y se guarda en tu cuenta, así que te sigue a cualquier dispositivo' : ''}.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(FONT_SCALE_LABELS) as FontScaleKey[]).map(key => (
            <button
              key={key}
              onClick={() => setFontScale(key)}
              className={cn('flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-bold transition-colors',
                fontScale === key
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
            >
              {FONT_SCALE_LABELS[key]}
              {fontScale === key && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </section>

      {/* Y lo de la cuenta, al final y separado: lo de arriba se toca a menudo,
          esto se toca una vez en la vida. */}
      {/* CONECTAR GOOGLE VA ANTES QUE BORRAR LA CUENTA y después de lo de uso
          diario: es una decisión que se toma una vez, como bloquear a alguien,
          pero no es irreversible ni destructiva. El orden de esta columna es
          por cuánto duele equivocarse, de menos a más. */}
      <div className="mt-6 space-y-6">
        <CuentaDeGoogle />
        <Bloqueados />
        <BorrarCuenta />
      </div>
    </div>
  );
}

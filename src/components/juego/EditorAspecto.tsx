import { Card, Button } from '../ui/core';
import { X, Palette } from 'lucide-react';
import { cn } from '../../utils/cn';
import { TONOS_PIEL, TONOS_PELO, TONOS_ROPA, type Aspecto } from './aspecto';
import { CUERPOS } from './Modelos';

// ============================================================================
// JUEGO VITAL — elegir cara y ropa (2026-08-18, petición de Eugenio).
// ============================================================================
// Sirve igual para tu propio avatar y para cada persona de tu mundo. Los
// colores se aplican al momento sobre la paleta del modelo (ver aspecto.ts).

/** Fenotipo: los 10 cuerpos, con nombre entendible en vez de "character-male-c". */
const NOMBRE_CUERPO = (c: string) => {
  const genero = c.includes('female') ? 'Mujer' : 'Hombre';
  const n = c.slice(-1).toUpperCase();
  return `${genero} ${n}`;
};

function Fila({ titulo, colores, valor, onElegir }: {
  titulo: string;
  colores: readonly string[];
  valor?: string;
  onElegir: (c: string) => void;
}) {
  return (
    <div className="mt-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">{titulo}</p>
      <div className="flex flex-wrap gap-1.5">
        {colores.map(c => (
          <button
            key={c}
            onClick={() => onElegir(c)}
            title={c}
            style={{ background: c }}
            className={cn(
              'w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110',
              valor === c ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-white shadow-sm',
            )}
          />
        ))}
      </div>
    </div>
  );
}

export default function EditorAspecto({ titulo, aspecto, onCambiar, onCerrar, onGuardar, guardando }: {
  titulo: string;
  aspecto: Aspecto;
  onCambiar: (a: Aspecto) => void;
  onCerrar: () => void;
  onGuardar: () => void;
  guardando?: boolean;
}) {
  const set = (patch: Partial<Aspecto>) => onCambiar({ ...aspecto, ...patch });

  return (
    <div data-ui-juego className="absolute inset-0 z-50 flex items-center justify-center px-5 bg-slate-900/40 backdrop-blur-[2px]" onClick={onCerrar}>
      <Card className="p-5 w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Palette className="w-4 h-4 text-emerald-600" /> {titulo}
          </p>
          <Button variant="ghost" onClick={onCerrar} className="p-1"><X className="w-3.5 h-3.5" /></Button>
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">
          Los cambios se ven al momento en el mundo. El sombreado se conserva: solo cambia el tinte.
        </p>

        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Fenotipo</p>
          <div className="grid grid-cols-5 gap-1.5">
            {CUERPOS.map(c => (
              <button
                key={c}
                onClick={() => set({ cuerpo: c })}
                className={cn(
                  'px-1 py-1.5 rounded-lg text-[9px] font-bold border transition-colors',
                  aspecto.cuerpo === c
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300',
                )}
              >
                {NOMBRE_CUERPO(c)}
              </button>
            ))}
          </div>
        </div>

        <Fila titulo="Piel" colores={TONOS_PIEL} valor={aspecto.piel} onElegir={piel => set({ piel })} />
        <Fila titulo="Pelo" colores={TONOS_PELO} valor={aspecto.pelo} onElegir={pelo => set({ pelo })} />
        <Fila titulo="Ropa" colores={TONOS_ROPA} valor={aspecto.ropa} onElegir={ropa => set({ ropa })} />
        <Fila titulo="Pantalón" colores={TONOS_ROPA} valor={aspecto.pantalon} onElegir={pantalon => set({ pantalon })} />

        <div className="flex gap-2 mt-5">
          <Button onClick={onGuardar} disabled={guardando} className="flex-1">
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
        </div>
      </Card>
    </div>
  );
}

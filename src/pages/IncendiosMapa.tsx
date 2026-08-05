import { useEffect, useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { Flame, X, Sparkles } from 'lucide-react';

// ============================================================================
// Mapa de superficie quemada en España (Fase 14, 2026-08-05)
// ============================================================================
// Polígonos de los grandes incendios (2022-2025) sobre el mapa de CCAA:
// clic en una zona quemada → ficha con nombre, año, hectáreas, provincia,
// causa y fuente. Los perímetros son APROXIMADOS (generados por IA a partir
// de la superficie oficial) y así se declara en cada ficha — la sustitución
// por los perímetros reales de EFFIS/Copernicus queda como mejora.
// Se usa embebido en el grafo «Incendios en España» vía ?embed=1.

const REGIONS_URL = '/geo/spain_regions.json';
const FIRES_URL = '/geo/incendios_espana.geojson';

const YEAR_COLOR: Record<number, string> = {
  2022: '#b45309', // ámbar oscuro — cicatriz antigua
  2023: '#ea580c', // naranja
  2025: '#dc2626', // rojo — reciente
};

export default function IncendiosMapa() {
  const [selected, setSelected] = useState<any>(null);
  const [totalHa, setTotalHa] = useState<number | null>(null);

  useEffect(() => {
    fetch(FIRES_URL).then(r => r.json())
      .then(j => setTotalHa((j.features || []).reduce((s: number, f: any) => s + (f.properties?.hectareas || 0), 0)))
      .catch(() => {});
  }, []);

  return (
    <div className="relative w-full h-full min-h-[420px] bg-slate-50">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [-5.5, 41.0], scale: 2200 }}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup>
          <Geographies geography={REGIONS_URL}>
            {({ geographies }) => geographies.map(geo => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#e2e8f0"
                stroke="#cbd5e1"
                strokeWidth={0.5}
                style={{ default: { outline: 'none' }, hover: { outline: 'none', fill: '#d7dee8' }, pressed: { outline: 'none' } }}
              />
            ))}
          </Geographies>
          <Geographies geography={FIRES_URL}>
            {({ geographies }) => geographies.map(geo => {
              const p: any = geo.properties;
              const color = YEAR_COLOR[p.anio] || '#dc2626';
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={color}
                  fillOpacity={selected?.id === p.id ? 0.95 : 0.72}
                  stroke="#7f1d1d"
                  strokeWidth={0.6}
                  onClick={() => setSelected(p)}
                  style={{
                    default: { outline: 'none', cursor: 'pointer' },
                    hover: { outline: 'none', cursor: 'pointer', fillOpacity: 0.95 },
                    pressed: { outline: 'none' },
                  }}
                />
              );
            })}
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Cabecera + leyenda */}
      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow px-3 py-2 max-w-[240px]">
        <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-red-600" /> Superficie quemada
        </p>
        {totalHa != null && (
          <p className="text-[10px] text-slate-500 mt-0.5">
            {totalHa.toLocaleString('es-ES')} ha en los 8 grandes incendios mostrados (2022-2025)
          </p>
        )}
        <div className="flex items-center gap-2.5 mt-1.5 text-[9px] text-slate-500">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: YEAR_COLOR[2022] }} /> 2022</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: YEAR_COLOR[2023] }} /> 2023</span>
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: YEAR_COLOR[2025] }} /> 2025</span>
        </div>
        <p className="text-[9px] text-slate-400 mt-1">Clic en una zona quemada · arrastra y haz zoom</p>
      </div>

      {/* Ficha del incendio seleccionado */}
      {selected && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-[340px] bg-white border border-slate-200 rounded-2xl shadow-xl p-4 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-black text-slate-900 leading-tight pr-2">{selected.nombre}</p>
            <button onClick={() => setSelected(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[11px]">
            <p className="text-slate-400">Año</p><p className="font-bold text-slate-700">{selected.anio}</p>
            <p className="text-slate-400">Superficie</p><p className="font-bold text-red-700">{Number(selected.hectareas).toLocaleString('es-ES')} ha</p>
            <p className="text-slate-400">Provincia</p><p className="font-bold text-slate-700">{selected.provincia}</p>
            <p className="text-slate-400">Causa</p><p className="font-bold text-slate-700">{selected.causa}</p>
          </div>
          {selected.nota && <p className="text-[11px] text-slate-600 leading-relaxed mt-2">{selected.nota}</p>}
          <p className="text-[9px] text-slate-400 mt-2">Fuente: {selected.fuente}</p>
          <p className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-1.5 inline-flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> Perímetro {selected.perimetro}
          </p>
        </div>
      )}
    </div>
  );
}

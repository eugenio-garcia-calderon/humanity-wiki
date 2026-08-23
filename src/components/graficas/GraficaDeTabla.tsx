import { useEffect, useMemo, useState } from 'react';
import { Loader2, SlidersHorizontal, LineChart, BarChart3, Map as MapIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { adivinarPapeles, desdeFilas, type Tabla } from '../../utils/graficas/tabla';
import { normalizar, type ConfigGrafica, type TipoGrafica } from '../../utils/graficas/config';
import Grafica from './Grafica';

// ============================================================================
// UNA GRÁFICA SOBRE UNA TABLA DE LA PLATAFORMA (2026-08-23)
// ============================================================================
// El puente entre las dos mitades: coge una tabla de `/api/bd/tablas/:id` —la
// herramienta que ya existía, estilo Notion— y la convierte en el modelo
// entidad × tiempo × variable que necesitan las gráficas.
//
// SE ADIVINA QUÉ ES CADA COLUMNA Y SE PUEDE CORREGIR. Al abrir, la columna con
// más países reconocidos pasa a ser la entidad, la que parece años pasa a ser
// el tiempo y las numéricas son los valores. Acierta con una tabla normal, y
// cuando no acierta está el panel de al lado para arreglarlo en dos clics.
// Adivinar sin dejar corregir sería peor que no adivinar.
//
// TODAVÍA NO SE GUARDA. Lo que montes aquí se pierde al salir: guardar una
// gráfica necesita una columna nueva en `bd_vistas` —o sea, una migración y un
// turno de despliegue— y eso va en la siguiente entrega. Se dice en pantalla
// en vez de dejar que alguien monte una gráfica de veinte minutos y la pierda.

const TIPOS: Array<{ id: TipoGrafica; label: string; icon: any; ayuda: string }> = [
  { id: 'linea', label: 'Líneas', icon: LineChart, ayuda: 'Cómo cambia con el tiempo' },
  { id: 'barras', label: 'Barras', icon: BarChart3, ayuda: 'Comparar tamaños en un momento' },
  { id: 'mapa', label: 'Mapa', icon: MapIcon, ayuda: 'Dónde pasa — necesita una columna de países' },
];

export default function GraficaDeTabla({ tablaId, alto = 400 }: { tablaId: string; alto?: number }) {
  const [bruto, setBruto] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [ajustes, setAjustes] = useState(false);
  const [config, setConfig] = useState<ConfigGrafica | null>(null);

  useEffect(() => {
    let vivo = true;
    setBruto(null); setError(null); setConfig(null);
    fetch(`/api/bd/tablas/${tablaId}`, { credentials: 'include' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'No se ha podido cargar la tabla.'); return j; })
      .then(j => { if (vivo) setBruto(j); })
      .catch(e => { if (vivo) setError(e.message); });
    return () => { vivo = false; };
  }, [tablaId]);

  /**
   * La tabla columnar, con los papeles ya adivinados.
   *
   * Las celdas de `/api/bd` no son valores sueltos: son `{ estado, valor }`,
   * porque una celda puede estar vacía, tener un error de cálculo o venir de
   * una fórmula. Aquí se saca el valor y se convierte en `null` todo lo que no
   * esté en estado «ok» — un error de fórmula NO es un cero, y dibujarlo como
   * cero es la clase de mentira que hunde una gráfica entera.
   */
  const tabla: Tabla | null = useMemo(() => {
    if (!bruto) return null;
    const columnas = (bruto.columnas || []).map((c: any) => ({ id: c.id, nombre: c.nombre }));
    const filas = (bruto.filas || []).map((f: any) => {
      const plana: Record<string, unknown> = {};
      for (const [id, celda] of Object.entries(f.celdas || {})) {
        const c = celda as any;
        plana[id] = c && typeof c === 'object' && 'valor' in c
          ? (c.estado === 'ok' ? c.valor : null)
          : c;
      }
      return plana;
    });
    return adivinarPapeles(desdeFilas(filas, columnas));
  }, [bruto]);

  // La configuración inicial sale de lo adivinado; a partir de ahí manda quien mira.
  useEffect(() => {
    if (!tabla || config) return;
    const entidad = tabla.columnas.find(c => c.papel === 'entidad')?.id ?? null;
    const tiempo = tabla.columnas.find(c => c.papel === 'tiempo')?.id ?? null;
    const valores = tabla.columnas.filter(c => c.papel === 'valor').map(c => c.id);
    setConfig(normalizar({
      titulo: bruto?.tabla?.titulo || 'Gráfica',
      origen: { clase: 'tabla', tablaId },
      papeles: { entidad, tiempo, valores: valores.slice(0, 1) },
      // Sin tiempo no hay líneas que dibujar: se abre en barras, que es lo que
      // sí se puede leer.
      tipo: tiempo ? 'linea' : 'barras',
      pestañas: entidad ? ['grafica', 'mapa', 'tabla'] : ['grafica', 'tabla'],
    }));
  }, [tabla, config, bruto, tablaId]);

  if (error) return <p className="text-sm text-red-600 py-8 text-center">{error}</p>;
  if (!tabla || !config) {
    return <p className="text-sm text-slate-400 py-10 text-center inline-flex items-center gap-2 justify-center w-full">
      <Loader2 className="w-4 h-4 animate-spin" /> Preparando la gráfica…
    </p>;
  }

  const cambiar = (p: Partial<ConfigGrafica>) => setConfig(c => (c ? { ...c, ...p } : c));
  const sel = 'text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 w-full';

  const sinValores = !config.papeles.valores.length;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <div className="flex items-center gap-0.5 bg-slate-50 rounded-lg p-0.5">
          {TIPOS.filter(t => t.id !== 'mapa').map(t => (
            <button
              key={t.id} onClick={() => cambiar({ tipo: t.id })} title={t.ayuda}
              className={cn('px-2 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors',
                config.tipo === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')}
            >
              <t.icon className="w-3 h-3" /> {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setAjustes(v => !v)}
          className={cn('px-2 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1',
            ajustes ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}
        >
          <SlidersHorizontal className="w-3 h-3" /> Qué es cada columna
        </button>
      </div>

      {ajustes && (
        <div className="mb-3 p-3 border border-slate-200 rounded-xl grid gap-2 sm:grid-cols-3">
          <label className="block">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Entidad</span>
            <select
              className={sel}
              value={config.papeles.entidad || ''}
              onChange={e => cambiar({ papeles: { ...config.papeles, entidad: e.target.value || null } })}
            >
              <option value="">— ninguna —</option>
              {tabla.columnas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <span className="block text-[10px] text-slate-400 mt-0.5">Quién: el país, la persona, el proyecto.</span>
          </label>

          <label className="block">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Tiempo</span>
            <select
              className={sel}
              value={config.papeles.tiempo || ''}
              onChange={e => cambiar({ papeles: { ...config.papeles, tiempo: e.target.value || null } })}
            >
              <option value="">— ninguno —</option>
              {tabla.columnas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <span className="block text-[10px] text-slate-400 mt-0.5">Sin tiempo se puede dibujar igual, en barras o mapa.</span>
          </label>

          <label className="block">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Qué se mide</span>
            <select
              className={sel}
              value={config.papeles.valores[0] || ''}
              onChange={e => cambiar({ papeles: { ...config.papeles, valores: e.target.value ? [e.target.value] : [] } })}
            >
              <option value="">— elige una columna —</option>
              {tabla.columnas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <span className="block text-[10px] text-slate-400 mt-0.5">La columna de números que se dibuja.</span>
          </label>

          <label className="block">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Unidad</span>
            <input
              className={sel} value={config.unidad?.sufijo || ''}
              placeholder="%, kg, t CO₂…"
              onChange={e => cambiar({ unidad: { ...config.unidad, sufijo: e.target.value || null } })}
            />
          </label>

          <label className="block">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Por persona (dividir entre)</span>
            <select
              className={sel}
              value={config.transformar?.dividirPor || ''}
              onChange={e => cambiar({ transformar: { ...config.transformar, dividirPor: e.target.value || null } })}
            >
              <option value="">— no dividir —</option>
              {tabla.columnas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <span className="block text-[10px] text-slate-400 mt-0.5">Población, superficie… para comparar países de tamaños distintos.</span>
          </label>

          <label className="block">
            <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Fuente</span>
            <input
              className={sel} value={config.fuente || ''}
              placeholder="De dónde salen los números"
              onChange={e => cambiar({ fuente: e.target.value || null })}
            />
          </label>
        </div>
      )}

      {sinValores ? (
        <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center">
          <p className="text-sm font-bold text-slate-600">Falta decir qué se mide.</p>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            Esta tabla no tiene ninguna columna de números que se pueda dibujar, o todavía no se ha
            elegido. Ábrelo en «Qué es cada columna».
          </p>
        </div>
      ) : (
        <Grafica tabla={tabla} config={config} alto={alto} />
      )}

      <p className="mt-3 text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
        Esta gráfica <span className="font-bold">todavía no se guarda</span>: lo que ajustes aquí se pierde al salir.
        Guardarla necesita una columna nueva en las vistas de la tabla y va en la siguiente entrega.
      </p>
    </div>
  );
}

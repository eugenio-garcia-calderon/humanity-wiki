// ============================================================================
// ARQUITECTURA · EDITABLE 3D WORLD OF THE CIRCULAR HUMAN COMMUNITY (2026-11-05)
// ============================================================================
// Eugenio's request: «crea este mundo en 3D donde uno pueda ver las diferentes
// escalas que se repiten haciendo zoom… todos los elementos modificables con
// sliders… sacar planos de arquitectura… las dimensiones del mapa… vista
// cenital, vista frontal… formato tipo CAD… en humanity.wiki/arquitectura».
//
// Own page, OUTSIDE the platform Layout (same reason as /calendario-arte): it is
// opened from a link, needs no account, and is a full-screen tool.
//
// · Everything is computed in `components/arquitectura/geometria.ts` from the
//   parameters (metres). Sliders → parameters → world → 3D + plans + numbers.
// · Nothing is stored on the server: parameters live in this browser and in a
//   shareable link (#p=…). Export/import JSON to keep versions.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Download, Eye, FileCode2, Layers, Map as MapaIcono, Menu, Ruler, Share2, SlidersHorizontal, Upload, X, ZoomIn, RotateCcw, HelpCircle, Image as ImagenIcono } from 'lucide-react';
import { Button } from '../components/ui/core';
import { Deslizador } from '../components/ui/Deslizador';
import { cn } from '../utils/cn';
import { Escena, type Captura, type Modo, type Objetivo } from '../components/arquitectura/Escena';
import { construirMundo, type Foco, type Edificio } from '../components/arquitectura/geometria';
import { GRUPOS, GRUPO_DE_TIPO, POR_DEFECTO, cargarParametros, guardarParametros, enlaceCompartible, type Parametros, type ClaveNumerica } from '../components/arquitectura/parametros';
import { dxfPlanta, dxfAlzado, svgPlanta, csvDimensiones, descargar } from '../components/arquitectura/exportar';

type Nivel = 'ciudad' | 'pueblo' | 'comunidad' | 'familia' | 'nido';
const NIVELES: { id: Nivel; nombre: string }[] = [
  { id: 'ciudad', nombre: 'Ciudad' }, { id: 'pueblo', nombre: 'Pueblo' }, { id: 'comunidad', nombre: 'Comunidad' },
  { id: 'familia', nombre: 'Familia' }, { id: 'nido', nombre: 'Nido' },
];
type Pestana = 'editar' | 'medidas' | 'planos' | 'ayuda';

const num = (v: number, d = 0) => v.toLocaleString('es-ES', { maximumFractionDigits: d, minimumFractionDigits: d });
const metros = (m: number) => m >= 1000 ? `${num(m / 1000, 2)} km` : `${num(m, m < 20 ? 1 : 0)} m`;

function ambitoDe(f: Foco, n: Nivel) {
  const s = [`p${f.p}`, `c${f.c}`, `f${f.f}`, `n${f.n}`];
  const k = { ciudad: 0, pueblo: 1, comunidad: 2, familia: 3, nido: 4 }[n];
  return s.slice(0, k).join('/');
}

export default function Arquitectura() {
  const [p, setP] = useState<Parametros>(() => cargarParametros());
  const [pMundo, setPMundo] = useState<Parametros>(p);
  const [foco, setFoco] = useState<Partial<Foco>>({});
  const [modo, setModo] = useState<Modo>('perspectiva');
  const [nivel, setNivel] = useState<Nivel>('comunidad');
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [pestana, setPestana] = useState<Pestana>('editar');
  const [panelAbierto, setPanelAbierto] = useState(() => typeof window === 'undefined' || window.innerWidth >= 900);
  const [mPorPx, setMPorPx] = useState(1);
  const [aviso, setAviso] = useState<string | null>(null);
  const capturaRef = useRef<Captura | null>(null);

  // Debounce: rebuilding the whole city takes ~0.3 s, so sliders feel smooth.
  useEffect(() => {
    const t = setTimeout(() => { setPMundo(p); guardarParametros(p); }, 160);
    return () => clearTimeout(t);
  }, [p]);
  const mundo = useMemo(() => construirMundo(pMundo, foco), [pMundo, foco]);

  const objetivoDe = useCallback((n: Nivel, nonce: number): Objetivo => {
    const u = mundo.unidades.get(ambitoDe(mundo.foco, n)) ?? mundo.unidades.get('')!;
    const k = n === 'familia' ? 1.15 : n === 'nido' ? 1.6 : 1.08;
    return { cx: u.cx, cy: u.cy, radio: u.radio * k, nonce };
  }, [mundo]);
  const [objetivo, setObjetivo] = useState<Objetivo>(() => objetivoDe('comunidad', 1));
  const ir = (n: Nivel) => { setNivel(n); setObjetivo(objetivoDe(n, Date.now())); };
  const cambiarModo = (m: Modo) => { setModo(m); setObjetivo(objetivoDe(nivel, Date.now())); };

  const sel: Edificio | null = seleccion != null ? mundo.edificios[seleccion] ?? null : null;
  const onPick = useCallback((id: number) => {
    if (id < 0) { setSeleccion(null); return; }
    setSeleccion(id);
    const e = mundo.edificios[id];
    if (!e) return;
    const m = e.ambito.match(/^p(\d+)(?:\/c(\d+))?(?:\/f(\d+))?(?:\/n(\d+))?/);
    if (m) setFoco(f => ({ ...f, p: +m[1], ...(m[2] != null ? { c: +m[2] } : {}), ...(m[3] != null ? { f: +m[3] } : {}), ...(m[4] != null ? { n: +m[4] } : {}) }));
  }, [mundo]);

  const fijar = (k: ClaveNumerica, v: number) => setP(prev => ({ ...prev, [k]: v }));
  const avisar = (t: string) => { setAviso(t); setTimeout(() => setAviso(null), 3200); };

  // ---------------------------------------------------------------- exports
  const [ambitoPlano, setAmbitoPlano] = useState<Nivel>('comunidad');
  const [conArboles, setConArboles] = useState(true);
  const [conTextos, setConTextos] = useState(true);
  const mundoParaPlano = (n: Nivel) => {
    // Plans always carry full detail inside the exported scope, whatever the view shows.
    const detalle: Parametros['detalle'] = n === 'ciudad' ? 'ciudad' : n === 'pueblo' ? 'pueblo' : 'comunidad';
    return construirMundo({ ...p, detalle, mostrarArboles: conArboles, mostrarEtiquetas: true, mostrarCotas: true }, mundo.foco);
  };
  const nombreArchivo = (n: Nivel, sufijo: string) => {
    const u = mundo.unidades.get(ambitoDe(mundo.foco, n));
    return `comunidad-circular-${n}${u ? '-' + u.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '') : ''}-${sufijo}`;
  };
  const exportar = (tipo: 'planta' | 'alzado' | 'svg') => {
    const m = mundoParaPlano(ambitoPlano);
    const amb = ambitoDe(m.foco, ambitoPlano);
    const op = { arboles: conArboles, textos: conTextos };
    if (tipo === 'planta') descargar(nombreArchivo(ambitoPlano, 'planta.dxf'), dxfPlanta(m, amb, op), 'application/dxf');
    if (tipo === 'alzado') descargar(nombreArchivo(ambitoPlano, 'alzado.dxf'), dxfAlzado(m, amb, op), 'application/dxf');
    if (tipo === 'svg') descargar(nombreArchivo(ambitoPlano, 'planta.svg'), svgPlanta(m, amb, op), 'image/svg+xml');
    avisar('Plano descargado');
  };
  const capturar = () => {
    const url = capturaRef.current?.png();
    if (!url) return;
    const a = document.createElement('a'); a.href = url; a.download = `comunidad-circular-${nivel}-${modo}.png`; a.click();
  };
  const entradaJson = useRef<HTMLInputElement>(null);
  const cargarJson = (f: File) => {
    f.text().then(t => { setP({ ...POR_DEFECTO, ...JSON.parse(t) }); avisar('Parámetros cargados'); }).catch(() => avisar('Ese archivo no es un JSON de parámetros'));
  };

  // ---------------------------------------------------------------- scale bar
  const barra = useMemo(() => {
    const objetivoPx = 110, m = mPorPx * objetivoPx;
    const pot = Math.pow(10, Math.floor(Math.log10(m)));
    const largo = [1, 2, 5, 10].map(k => k * pot).reverse().find(v => v <= m) ?? pot;
    return { px: largo / mPorPx, texto: metros(largo) };
  }, [mPorPx]);

  const md = mundo.medidas;
  const nombreNivel = (n: Nivel) => mundo.unidades.get(ambitoDe(mundo.foco, n))?.nombre ?? '';

  return (
    <div className="fixed inset-0 flex bg-slate-950 text-slate-100 select-none">
      {/* ------------------------------------------------ side panel */}
      <aside className={cn('z-20 flex h-full w-[min(380px,92vw)] shrink-0 flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur transition-transform max-[900px]:absolute',
        panelAbierto ? 'translate-x-0' : '-translate-x-full max-[900px]:-translate-x-full min-[901px]:hidden')}>
        <div className="flex items-start justify-between gap-2 border-b border-slate-800 p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">humanity.wiki · arquitectura</p>
            <h1 className="mt-1 text-lg font-bold leading-tight">Comunidad Circular Humana</h1>
            <p className="mt-1 text-xs text-slate-400">Mundo 3D editable · del nido a la ciudad</p>
          </div>
          <Button variant="ghost" className="px-2 text-slate-300 hover:bg-slate-800" onClick={() => setPanelAbierto(false)} aria-label="Cerrar panel"><X size={16} /></Button>
        </div>
        <nav className="grid grid-cols-4 gap-1 border-b border-slate-800 p-2">
          {([['editar', 'Editar', SlidersHorizontal], ['medidas', 'Medidas', Ruler], ['planos', 'Planos', FileCode2], ['ayuda', 'Ayuda', HelpCircle]] as const).map(([id, t, I]) => (
            <Button key={id} variant="ghost" onClick={() => setPestana(id)}
              className={cn('flex-col gap-1 px-1 py-2 text-[10px] tracking-wider', pestana === id ? 'bg-slate-800 text-emerald-300' : 'text-slate-400 hover:bg-slate-800')}>
              <I size={15} />{t}
            </Button>
          ))}
        </nav>
        <div className="flex-1 overflow-y-auto p-4 text-sm">
          {pestana === 'editar' && (
            <div className="space-y-5">
              {sel && <TarjetaSeleccion e={sel} p={p} fijar={fijar} onAcercar={() => setObjetivo({ cx: sel.x, cy: sel.y, radio: Math.max(sel.ancho, sel.fondo) * 2.2 + 8, nonce: Date.now() })} onCerrar={() => setSeleccion(null)} />}
              <section className="space-y-3 rounded-xl border border-slate-800 p-3">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300"><Eye size={14} /> Vista</h2>
                <label className="block text-[11px] text-slate-300">Detalle (árboles y paneles)
                  <select value={p.detalle} onChange={e => setP({ ...p, detalle: e.target.value as Parametros['detalle'] })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs">
                    <option value="comunidad">Solo la comunidad enfocada (rápido)</option>
                    <option value="pueblo">El pueblo enfocado (equilibrado)</option>
                    <option value="ciudad">Toda la ciudad (~240.000 árboles · pesado)</option>
                  </select>
                </label>
                {([['mostrarArboles', 'Árboles'], ['mostrarEtiquetas', 'Etiquetas'], ['mostrarCotas', 'Cotas']] as const).map(([k, t]) => (
                  <label key={k} className="flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" className="accent-emerald-500" checked={p[k]} onChange={e => setP({ ...p, [k]: e.target.checked })} /> {t}
                  </label>
                ))}
              </section>
              {GRUPOS.map(g => (
                <details key={g.id} open={g.id === 'escalas' || g.id === 'nido'} className="group rounded-xl border border-slate-800 p-3">
                  <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-wider text-slate-300">{g.titulo}</summary>
                  <div className="mt-3 space-y-3">
                    {g.items.map(it => <Deslizador key={it.clave} etiqueta={it.etiqueta} valor={p[it.clave]} min={it.min} max={it.max} paso={it.paso} unidad={it.unidad} onChange={v => fijar(it.clave, v)} />)}
                  </div>
                </details>
              ))}
              <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => { setP({ ...POR_DEFECTO }); avisar('Valores de diseño restablecidos'); }}>
                <RotateCcw size={14} className="mr-2" /> Restablecer valores
              </Button>
            </div>
          )}

          {pestana === 'medidas' && (
            <div className="space-y-4">
              <Tabla titulo="Ciudad" filas={[
                ['Diámetro', metros(2 * md.ciudad.radio)], ['Superficie', `${num(md.ciudad.area / 1e6, 1)} km²`],
                ['Población', `${num(md.ciudad.poblacion)} personas`], ['Nidos', num(md.ciudad.nidos)], ['Densidad', `${num(md.ciudad.densidad, 1)} hab/km²`],
              ]} />
              <Tabla titulo="Pueblo" filas={[
                ['Diámetro', metros(2 * md.pueblo.radio)], ['Superficie', `${num(md.pueblo.area / 1e4, 0)} ha`],
                ['Población', `${num(md.pueblo.poblacion)} personas`], ['Radio del anillo de comunidades', metros(md.pueblo.radioAnillo)],
              ]} />
              <Tabla titulo="Comunidad" filas={[
                ['Diámetro', metros(2 * md.comunidad.radio)], ['Superficie', `${num(md.comunidad.area / 1e4, 1)} ha`],
                ['Población', `${num(md.comunidad.poblacion)} personas`], ['Suelo por persona', `${num(md.comunidad.areaPorPersona)} m²`],
                ['Divisoria sobre el centro', metros(p.radioComunidad * p.desplazamientoDivisoria)],
              ]} />
              <Tabla titulo="Familia (pétalo)" filas={[
                ['Largo', metros(md.familia.largo)], ['Ancho máximo', metros(md.familia.anchoMax)],
                ['Superficie', `${num(md.familia.area)} m²`], ['Personas', num(md.familia.personas, 0)],
              ]} />
              <Tabla titulo="Nido" filas={[
                ['Lado del hexágono', metros(md.nido.lado)], ['Ancho entre esquinas', metros(md.nido.diametro)],
                ['Superficie por planta', `${num(md.nido.areaPlanta, 1)} m²`], ['Plantas', num(md.nido.plantas)], ['Superficie construida', `${num(md.nido.construida, 1)} m²`],
              ]} />
              <Tabla titulo="Toda la ciudad" filas={[
                ['Calzada (vehículos)', `${num(md.viario.calzada, 1)} km`], ['Carril bici', `${num(md.viario.bici, 1)} km`], ['Peatonal (adoquín)', `${num(md.viario.peatonal, 1)} km`],
                ['Árboles', num(md.arboles)], ['Paneles solares', num(md.panelesSolares)], ['Superficie construida', `${num(md.superficieConstruida / 1e4, 1)} ha`],
              ]} />
              <section className="rounded-xl border border-slate-800 p-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Programa de edificios</h2>
                <div className="mt-2 space-y-2">
                  {md.equipamientos.map(e => (
                    <div key={e.escala + e.codigo} className="border-b border-slate-800 pb-2 text-[11px]">
                      <div className="flex justify-between gap-2"><span className="font-bold text-slate-200">{e.codigo} · {e.nombre} <span className="font-normal text-slate-500">({e.escala})</span></span><span className="font-mono text-emerald-300">{num(e.superficie)} m²</span></div>
                      <div className="text-slate-400">{e.dimensiones} · {e.funcion} · ×{num(e.cantidad)}</div>
                    </div>
                  ))}
                </div>
              </section>
              <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => descargar('comunidad-circular-dimensiones.csv', csvDimensiones(mundo), 'text/csv;charset=utf-8')}>
                <Download size={14} className="mr-2" /> Tabla de dimensiones (CSV)
              </Button>
            </div>
          )}

          {pestana === 'planos' && (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-slate-400">Planos en metros, por capas (viario, carril bici, peatonal, nidos, salud, educación, árboles, cotas…). El DXF se abre en AutoCAD, LibreCAD, QCAD, FreeCAD, Rhino o SketchUp.</p>
              <label className="block text-[11px] text-slate-300">Ámbito del plano
                <select value={ambitoPlano} onChange={e => setAmbitoPlano(e.target.value as Nivel)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs">
                  {NIVELES.map(n => <option key={n.id} value={n.id}>{n.nombre}{n.id !== 'ciudad' ? ` · ${nombreNivel(n.id)}` : ''}</option>)}
                </select>
              </label>
              <p className="text-[11px] text-slate-500">Para cambiar de pueblo, comunidad, familia o nido: pulsa un edificio en el 3D y el foco se mueve allí.</p>
              <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" className="accent-emerald-500" checked={conArboles} onChange={e => setConArboles(e.target.checked)} /> Incluir árboles {ambitoPlano === 'ciudad' && <span className="text-amber-400">(archivo grande)</span>}</label>
              <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" className="accent-emerald-500" checked={conTextos} onChange={e => setConTextos(e.target.checked)} /> Incluir textos y códigos</label>
              <div className="grid gap-2">
                <Button onClick={() => exportar('planta')}><MapaIcono size={14} className="mr-2" /> Planta · DXF</Button>
                <Button onClick={() => exportar('alzado')}><Layers size={14} className="mr-2" /> Alzado frontal · DXF</Button>
                <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => exportar('svg')}><MapaIcono size={14} className="mr-2" /> Planta a color · SVG</Button>
                <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" onClick={capturar}><ImagenIcono size={14} className="mr-2" /> Captura de la vista · PNG</Button>
              </div>
              <section className="space-y-2 rounded-xl border border-slate-800 p-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Guardar este diseño</h2>
                <Button variant="outline" className="w-full border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => descargar('comunidad-circular-parametros.json', JSON.stringify(p, null, 2), 'application/json')}><Download size={14} className="mr-2" /> Parámetros · JSON</Button>
                <Button variant="outline" className="w-full border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => entradaJson.current?.click()}><Upload size={14} className="mr-2" /> Cargar parámetros</Button>
                <input ref={entradaJson} type="file" accept="application/json,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) cargarJson(f); e.target.value = ''; }} />
                <Button variant="outline" className="w-full border-slate-700 text-slate-200 hover:bg-slate-800" onClick={() => { navigator.clipboard?.writeText(enlaceCompartible(p)).then(() => avisar('Enlace copiado: abre este diseño tal cual'), () => avisar('No se pudo copiar el enlace')); }}><Share2 size={14} className="mr-2" /> Copiar enlace a este diseño</Button>
              </section>
            </div>
          )}

          {pestana === 'ayuda' && (
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p><b className="text-slate-100">La misma regla en todas las escalas.</b> Cada unidad es un círculo. La vía circular de la escala superior la cruza a 0,2·R por encima del centro: arriba queda el escaparate productivo y común (agricultura, mercado, energía), abajo la vida (las familias, las comunidades o los pueblos). En el centro, agua y el centro social con sus 8 anexos.</p>
              <p><b className="text-slate-100">Vías.</b> Desde lo habitado hacia fuera: peatonal (adoquín), carril bici (rojo) y vehículos (asfalto).</p>
              <p><b className="text-slate-100">Moverse.</b> Arrastra para girar, rueda o pellizco para acercarte, botón derecho o dos dedos para desplazar. Los botones de arriba te llevan a cada escala.</p>
              <p><b className="text-slate-100">Vistas.</b> Perspectiva (libre), Cenital (planta, sin perspectiva) y Frontal (alzado, sin perspectiva). La barra de escala de abajo da los metros reales.</p>
              <p><b className="text-slate-100">Editar.</b> Pulsa un edificio: verás sus medidas y sus deslizadores. Todos los cambios rehacen el 3D, las cotas y los planos.</p>
              <p className="text-slate-500">Las superficies de los edificios son la propuesta de la lámina de diseño; son orientativas para empezar el proyecto con un estudio de arquitectura.</p>
            </div>
          )}
        </div>
        <div className="border-t border-slate-800 p-3 text-[10px] text-slate-500">
          <Link to="/" className="hover:text-emerald-300">← humanity.wiki</Link>
        </div>
      </aside>

      {/* ------------------------------------------------ 3D */}
      <main className="relative h-full flex-1">
        <Escena mundo={mundo} modo={modo} objetivo={objetivo} seleccion={seleccion} onPick={onPick} onEscala={setMPorPx} capturaRef={capturaRef} />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start gap-2 p-3">
          {!panelAbierto && (
            <Button variant="ghost" className="pointer-events-auto bg-slate-900/85 px-3 text-slate-100 hover:bg-slate-800" onClick={() => setPanelAbierto(true)} aria-label="Abrir panel"><Menu size={16} /></Button>
          )}
          <div className="pointer-events-auto flex flex-wrap gap-1 rounded-xl bg-slate-900/85 p-1 backdrop-blur">
            {NIVELES.map((n, i) => (
              <Button key={n.id} variant="ghost" onClick={() => ir(n.id)}
                className={cn('px-3 py-1.5 text-[10px]', nivel === n.id ? 'bg-emerald-500 text-white hover:bg-emerald-500' : 'text-slate-200 hover:bg-slate-800')}>
                <ZoomIn size={12} className={cn('mr-1', i === 0 && 'hidden')} />{n.nombre}
              </Button>
            ))}
          </div>
          <div className="pointer-events-auto flex gap-1 rounded-xl bg-slate-900/85 p-1 backdrop-blur">
            {([['perspectiva', 'Perspectiva'], ['cenital', 'Cenital'], ['frontal', 'Frontal']] as const).map(([m, t]) => (
              <Button key={m} variant="ghost" onClick={() => cambiarModo(m)}
                className={cn('px-3 py-1.5 text-[10px]', modo === m ? 'bg-sky-500 text-white hover:bg-sky-500' : 'text-slate-200 hover:bg-slate-800')}>
                <Box size={12} className="mr-1" />{t}
              </Button>
            ))}
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-slate-900/85 px-3 py-2 text-[10px] text-slate-200 backdrop-blur">
          <div className="h-2 border-x-2 border-b-2 border-slate-100" style={{ width: Math.max(20, Math.min(240, barra.px)) }} />
          <div className="mt-1 font-mono">{barra.texto}</div>
          <div className="mt-1 text-slate-400">{nombreNivel(nivel) || 'Ciudad'} · {modo}</div>
        </div>

        <Leyenda />

        {aviso && <div className="absolute bottom-16 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg">{aviso}</div>}
      </main>
    </div>
  );
}

function Tabla({ titulo, filas }: { titulo: string; filas: [string, string][] }) {
  return (
    <section className="rounded-xl border border-slate-800 p-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">{titulo}</h2>
      <dl className="mt-2 space-y-1 text-[12px]">
        {filas.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-slate-400">{k}</dt><dd className="font-mono text-slate-100">{v}</dd></div>)}
      </dl>
    </section>
  );
}

function TarjetaSeleccion({ e, p, fijar, onAcercar, onCerrar }: { e: Edificio; p: Parametros; fijar: (k: ClaveNumerica, v: number) => void; onAcercar: () => void; onCerrar: () => void }) {
  const medidas = e.forma === 'cilindro' ? `Ø ${num(e.ancho, 1)} m` : e.forma === 'hex' ? `hexágono de ${num(e.ancho, 1)} m de lado` : `${num(e.ancho, 1)} × ${num(e.fondo, 1)} m`;
  const grupos = GRUPOS.filter(g => (GRUPO_DE_TIPO[e.tipo] ?? []).includes(g.id));
  return (
    <section className="rounded-xl border border-emerald-700 bg-emerald-950/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{e.codigo} · {e.escala}</p>
          <h2 className="text-sm font-bold">{e.nombre}</h2>
        </div>
        <Button variant="ghost" className="px-2 text-slate-300 hover:bg-slate-800" onClick={onCerrar} aria-label="Quitar selección"><X size={14} /></Button>
      </div>
      <p className="mt-1 text-[11px] text-slate-300">{e.funcion}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <dt className="text-slate-400">Planta</dt><dd className="font-mono">{medidas}</dd>
        <dt className="text-slate-400">Altura</dt><dd className="font-mono">{num(e.alto, 1)} m · {e.plantas} pl.</dd>
        <dt className="text-slate-400">Superficie</dt><dd className="font-mono">{num(e.superficie)} m²</dd>
      </dl>
      <Button variant="outline" className="mt-2 w-full border-emerald-700 text-emerald-200 hover:bg-emerald-900/40" onClick={onAcercar}><ZoomIn size={13} className="mr-2" /> Acercar</Button>
      {grupos.length > 0 && <div className="mt-3 space-y-3 border-t border-emerald-900 pt-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Editar este elemento</p>
        {grupos.flatMap(g => g.items).map(it => <Deslizador key={it.clave} etiqueta={it.etiqueta} valor={p[it.clave]} min={it.min} max={it.max} paso={it.paso} unidad={it.unidad} onChange={v => fijar(it.clave, v)} />)}
      </div>}
    </section>
  );
}

function Leyenda() {
  const [abierta, setAbierta] = useState(false);
  const filas: { c: string; t: string }[] = [
    { c: 'bg-orange-700', t: 'Nido · centro social (teja)' },
    { c: 'bg-pink-300', t: 'Salud' }, { c: 'bg-purple-600', t: 'Educación' }, { c: 'bg-yellow-300', t: 'Energía' },
    { c: 'bg-sky-700', t: 'Movilidad' }, { c: 'bg-lime-600', t: 'Alimentación' }, { c: 'bg-cyan-500', t: 'Informática' },
    { c: 'bg-stone-500', t: 'Taller' }, { c: 'bg-red-600', t: 'Seguridad' },
    { c: 'bg-stone-300', t: 'Peatonal (adoquín)' }, { c: 'bg-red-800', t: 'Carril bici' }, { c: 'bg-neutral-800', t: 'Vehículos' },
    { c: 'bg-blue-600', t: 'Agua' }, { c: 'bg-green-900', t: 'Bosque comestible' },
  ];
  return (
    <div className="absolute bottom-3 right-3 max-w-[220px] rounded-lg bg-slate-900/85 p-2 text-[10px] text-slate-200 backdrop-blur">
      <Button variant="ghost" className="w-full justify-between px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800" onClick={() => setAbierta(a => !a)}>Leyenda <span>{abierta ? '−' : '+'}</span></Button>
      {abierta && <ul className="mt-1 space-y-1 px-1">{filas.map(f => <li key={f.t} className="flex items-center gap-2"><span className={cn('inline-block h-3 w-3 rounded-sm', f.c)} />{f.t}</li>)}</ul>}
    </div>
  );
}

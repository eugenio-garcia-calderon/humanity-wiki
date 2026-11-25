// ============================================================================
// AGRICULTURA SINTRÓPICA · DESIGNER AND SIMULATOR OF SYNTROPIC FORESTS (2026-11-25)
// ============================================================================
// Eugenio: «una herramienta que nos permita generar un bosque en una superficie
// determinada… inspirándonos en el creador de diseños 3D para vehículos…
// colocando especies clave, rodeándolas de especies auxiliares… un selector de
// especies auxiliares, otro de especies clave… encontrar esa geometría que se
// repite… una parte del modelo actual… retención de agua… lo más divulgativo
// posible… exportarlo para que luego se pueda implementar con un plano».
// And, the same afternoon: «una sucesión que permita simular el crecimiento…
// si pinchas en ellas te diga cuánta agua necesita, qué valor tiene, qué
// alimento produce, en qué zonas de la península… que te dé consejos».
//
// Own page, OUTSIDE the platform Layout (same reason as /arquitectura): opened
// from a link, no account needed, full-screen tool. Nothing is stored on the
// server: the design lives in this browser and in a shareable link (#d=…).
//
// components/agriculturaSintropica/:
//   especies.ts   the reference database of species
//   disenos.ts    the geometries that repeat (Eugenio's four sketches)
//   modelo.ts     plot, growth, 30-year simulation, advisor, steps
//   Escena3D.tsx  the 3D plot · EditorModulo.tsx the module from above
//   exportar.ts   SVG/DXF plans, planting CSV · FichaEspecie, Grafica, Proyecto

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, Box, CheckCircle2, Database, Download, Grid3x3, Lightbulb, Map as MapaIcono, Menu, Pause, Play, RotateCcw, Share2, SlidersHorizontal, Sprout, Upload, X, Image as ImagenIcono, Ruler, LandPlot, Shapes, Flower2, Sun, Leaf, Snowflake, Wind, Clock } from 'lucide-react';
import { Button } from '../components/ui/core';
import { Deslizador } from '../components/ui/Deslizador';
import { cn } from '../utils/cn';
import Escena3D, { type Ambiente, type ObjetivoCamara, type Vista3D } from '../components/agriculturaSintropica/Escena3D';
import { nombreMes, estacionDe } from '../components/agriculturaSintropica/fenologia';
import EditorModulo from '../components/agriculturaSintropica/EditorModulo';
import FichaEspecie, { Gotas, MapaZonas } from '../components/agriculturaSintropica/FichaEspecie';
import Grafica from '../components/agriculturaSintropica/Grafica';
import Proyecto from '../components/agriculturaSintropica/Proyecto';
import PanelPatron from '../components/agriculturaSintropica/PanelPatron';
import { CLAVES, ESPECIE, ESPECIES, ESTRATOS, FUNCIONES, GENERACIONES, ZONAS, type Estrato, type Funcion, type Zona } from '../components/agriculturaSintropica/especies';
import { DISENOS, NOMBRE_ROL, diseno, etiquetasDe, rol } from '../components/agriculturaSintropica/disenos';
import { ANOS, ETAPAS, MAQUINAS, MARCO_CONVENCIONAL, cifras, consejos, construirConvencional, construirParcela, etapa, huecosDe, huecosBase, aBase, pasos, porDefecto, simular, type Maquina, type Parametros, type Planta } from '../components/agriculturaSintropica/modelo';
import { COLOR_ROL } from '../components/agriculturaSintropica/paleta';
import { csvPlantas, descargar, dxfPlano, listaCompra, nombreArchivo, svgModulo, svgPlano } from '../components/agriculturaSintropica/exportar';

const CLAVE_LOCAL = 'agricultura-sintropica:v1';
type Pestana = 'diseno' | 'patron' | 'parcela' | 'simular' | 'especies' | 'consejos' | 'planos' | 'proyecto';
type Vista = '3d' | 'plano' | 'modulo';

const num = (v: number, d = 0) => v.toLocaleString('es-ES', { maximumFractionDigits: d, minimumFractionDigits: d });

function cargar(): Parametros {
  try {
    const h = window.location.hash.replace(/^#/, '');
    if (h.startsWith('d=')) return completar(JSON.parse(decodeURIComponent(h.slice(2))));
  } catch { /* malformed link */ }
  try { const s = window.localStorage.getItem(CLAVE_LOCAL); if (s) return completar(JSON.parse(s)); } catch { /* storage blocked */ }
  return porDefecto();
}
/** A saved design may predate a parameter: fill it with the default of ITS design, not of the first one. */
function completar(x: Partial<Parametros>): Parametros {
  return { ...porDefecto(x.diseno ?? 'modulo', x.clave ?? 'almendro'), ...x } as Parametros;
}
const enlace = (p: Parametros) => `${window.location.origin}/agricultura-sintropica#d=${encodeURIComponent(JSON.stringify(p))}`;

const selectCls = 'mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-200';
const btnOscuro = 'border-slate-700 text-slate-200 hover:bg-slate-800';
const Seccion = ({ titulo, children, icono }: { titulo: string; children: React.ReactNode; icono?: React.ReactNode }) => (
  <section className="space-y-3 rounded-xl border border-slate-800 p-3">
    <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">{icono}{titulo}</h2>
    {children}
  </section>
);

export default function AgriculturaSintropica() {
  const [p, setP] = useState<Parametros>(cargar);
  const [pd, setPd] = useState<Parametros>(p);                 // debounced copy that drives the heavy work
  const [t, setT] = useState(ANOS);
  const [jugando, setJugando] = useState(false);
  const [vista, setVista] = useState<Vista>('3d');
  const [comparar, setComparar] = useState(true);
  const [pestana, setPestana] = useState<Pestana>('diseno');
  const [panel, setPanel] = useState(() => typeof window === 'undefined' || window.innerWidth >= 900);
  const [ficha, setFicha] = useState<string | null>(null);
  const [selHueco, setSelHueco] = useState<number | null>(null);
  const [copas, setCopas] = useState(true);
  const [rejilla, setRejilla] = useState(0);
  // The seasons (2026-11-25, Eugenio: «una animación de las 4 estaciones, con flores, hojas caducas, luces del sol, vientos»).
  const [ambiente, setAmbiente] = useState<Ambiente>(() => ({ mes: 4.4, animarAno: false, hora: 16, animarDia: false, viento: 0.3, sombras: typeof window === 'undefined' || window.innerWidth >= 700 }));
  const [reloj, setReloj] = useState({ mes: 4.4, hora: 16 });
  const amb = (x: Partial<Ambiente>) => setAmbiente(a => ({ ...a, ...x }));
  const [camara, setCamara] = useState<ObjetivoCamara>({ vista: 'perspectiva', nonce: 1 });
  const [aviso, setAviso] = useState<string | null>(null);
  const [zoomPlano, setZoomPlano] = useState(1);
  const entradaJson = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = setTimeout(() => { setPd(p); try { window.localStorage.setItem(CLAVE_LOCAL, JSON.stringify(p)); } catch { /* */ } }, 160);
    return () => clearTimeout(k);
  }, [p]);
  useEffect(() => { if (!aviso) return; const k = setTimeout(() => setAviso(null), 2800); return () => clearTimeout(k); }, [aviso]);

  // play the succession: two years per second
  useEffect(() => {
    if (!jugando) return;
    let raf = 0, antes = performance.now();
    const paso = (ahora: number) => {
      const dt = (ahora - antes) / 1000; antes = ahora;
      setT(v => { const n = Math.min(ANOS, v + dt * 2); if (n >= ANOS) setJugando(false); return n; });
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [jugando]);

  const parcela = useMemo(() => construirParcela(pd), [pd]);
  const conv = useMemo(() => construirConvencional(pd), [pd]);
  const sim = useMemo(() => simular(pd, parcela, true), [pd, parcela]);
  const simC = useMemo(() => simular(pd, conv, false), [pd, conv]);
  const listaConsejos = useMemo(() => consejos(pd), [pd]);
  const ano = Math.round(t);
  const ahora = useMemo(() => consejos(pd, Math.max(1, ano)).filter(c => c.titulo.includes('demasiado juntos')), [pd, ano]);
  const cf = useMemo(() => cifras(pd, parcela), [pd, parcela]);
  const cfC = useMemo(() => cifras(pd, conv), [pd, conv]);
  const huecos = huecosDe(p);
  const etiquetas = etiquetasDe(huecos);
  const d = diseno(p.diseno);
  const et = etapa(t);
  const alertas = listaConsejos.filter(c => c.nivel === 'alerta' || c.nivel === 'aviso').length;
  const pasoT = (s: typeof sim) => s.reduce((b, x) => Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b, s[0]);
  const ya = pasoT(sim), yaC = pasoT(simC);

  const fijar = <K extends keyof Parametros>(k: K, v: Parametros[K]) => setP(prev => ({ ...prev, [k]: v }));
  const cambiarClave = (k: string) => { setP(prev => ({ ...prev, clave: k, asign: diseno(prev.diseno).asignar(k) })); setAviso(`Consorcio recomendado para el ${ESPECIE[k].nombre.toLowerCase()}`); };
  const cambiarDiseno = (id: string) => {
    setP(prev => { const n = porDefecto(id, prev.clave); return { ...n, ancho: prev.ancho, largo: prev.largo, zona: prev.zona, lluvia: prev.lluvia, pendiente: prev.pendiente, riego: prev.riego, mo0: prev.mo0, maquina: prev.maquina, poda: prev.poda, anuales: prev.anuales, anosAnuales: prev.anosAnuales, hipAgua: prev.hipAgua, hipN: prev.hipN, hipMicro: prev.hipMicro }; });
    setSelHueco(null);
  };
  // Dragging in the module view; snapped to the chosen grid in metres (from the module's south-west corner).
  const moverHueco = (i: number, u: number, v: number) => setP(prev => {
    const aj = (x: number, L: number) => rejilla ? Math.max(-0.5, Math.min(0.4999, Math.round(((x + 0.5) * L) / rejilla) * rejilla / L - 0.5)) : x;
    const h = [...huecosBase(prev)]; h[i] = { ...h[i], ...aBase(prev, i, aj(u, prev.modAncho), aj(v, prev.modLargo)) }; return { ...prev, huecos: h };
  });
  const elegirPlanta = (pl: Planta | null) => setFicha(pl ? pl.esp.id : null);
  const simularDesdeCero = () => { setT(0); setJugando(true); if (vista !== '3d') setVista('3d'); };
  const capturar = () => {
    const c = document.querySelector('canvas'); if (!c) return;
    const a = document.createElement('a'); a.href = (c as HTMLCanvasElement).toDataURL('image/png'); a.download = `${nombreArchivo(p)}-ano-${ano}.png`; a.click();
  };
  const cargarJson = (f: File) => f.text().then(s => { setP(completar(JSON.parse(s))); setAviso('Diseño cargado'); }).catch(() => setAviso('Ese archivo no es un diseño válido'));

  const PESTANAS: { id: Pestana; t: string; I: typeof Box }[] = [
    { id: 'diseno', t: 'Diseño', I: Grid3x3 }, { id: 'patron', t: 'Patrón', I: Shapes }, { id: 'parcela', t: 'Parcela', I: LandPlot }, { id: 'simular', t: 'Simular', I: Sprout },
    { id: 'especies', t: 'Especies', I: Database }, { id: 'consejos', t: 'Consejos', I: Lightbulb }, { id: 'planos', t: 'Planos', I: Ruler }, { id: 'proyecto', t: 'Proyecto', I: BookOpen },
  ];

  return (
    <div className="flex h-[100dvh] flex-col bg-slate-950 text-slate-100">
      {/* ------------------------------------------------ header */}
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-800 px-3 py-2">
        <Button variant="ghost" className="px-2 py-1 text-slate-300 hover:bg-slate-800" onClick={() => setPanel(v => !v)} aria-label="Panel"><Menu size={18} /></Button>
        <div className="mr-2 leading-tight">
          <h1 className="text-sm font-bold">Agricultura sintrópica</h1>
          <p className="text-[10px] text-slate-400">Diseñador de bosques · <a href="https://luzhumanidad.com" className="hover:text-emerald-300">Luz &amp; Humanidad</a></p>
        </div>
        <div className="flex gap-1">
          {CLAVES.map(k => (
            <Button key={k.id} variant="ghost" onClick={() => cambiarClave(k.id)}
              className={cn('gap-1.5 rounded-full px-3 py-1 text-[11px] normal-case tracking-normal', p.clave === k.id ? 'bg-amber-400 text-slate-900 hover:bg-amber-300' : 'text-slate-300 hover:bg-slate-800')}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: k.color }} />{k.nombre.replace(' (viña)', '')}{k.id === 'pistacho' && <span className="text-[9px] opacity-70">emergente</span>}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {([['3d', '3D', Box], ['plano', 'Plano', MapaIcono], ['modulo', 'Módulo', Grid3x3]] as const).map(([id, txt, I]) => (
            <Button key={id} variant="ghost" onClick={() => setVista(id)} className={cn('gap-1 px-2.5 py-1 text-[10px]', vista === id ? 'bg-slate-700 text-white hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-800')}><I size={13} />{txt}</Button>
          ))}
          <label className="ml-2 flex items-center gap-1.5 text-[11px] text-slate-300"><input type="checkbox" className="accent-amber-400" checked={comparar} onChange={e => setComparar(e.target.checked)} />Comparar con el modelo actual</label>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* ------------------------------------------------ side panel */}
        {panel && (
          <aside className="absolute inset-y-0 left-0 z-20 flex w-[min(25rem,100vw)] border-r border-slate-800 bg-slate-900 md:static">
            <nav className="flex w-16 shrink-0 flex-col border-r border-slate-800 py-1">
              {PESTANAS.map(({ id, t: txt, I }) => (
                <Button key={id} variant="ghost" onClick={() => { setPestana(id); if (id === 'patron') setVista('modulo'); }}
                  className={cn('relative flex-col gap-1 rounded-none px-1 py-2.5 text-[9px] tracking-wider', pestana === id ? 'bg-slate-800 text-emerald-300 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-800')}>
                  <I size={16} />{txt}
                  {id === 'consejos' && alertas > 0 && <span className="absolute right-1.5 top-1 rounded-full bg-amber-500 px-1 text-[8px] text-slate-900">{alertas}</span>}
                </Button>
              ))}
            </nav>
            <div className="flex-1 overflow-y-auto p-3 text-sm">
              {pestana === 'diseno' && (
                <div className="space-y-4">
                  <Seccion titulo="Geometría que se repite" icono={<Grid3x3 size={14} />}>
                    <div className="grid gap-1.5">
                      {DISENOS.map(x => (
                        <Button key={x.id} variant="ghost" onClick={() => cambiarDiseno(x.id)}
                          className={cn('block h-auto w-full rounded-lg border px-2.5 py-2 text-left normal-case tracking-normal', p.diseno === x.id ? 'border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/10' : 'border-slate-800 hover:bg-slate-800')}>
                          <span className="block text-xs font-bold text-slate-100">{x.nombre}</span>
                          <span className="block text-[10px] font-normal text-slate-400">{x.fuente}</span>
                        </Button>
                      ))}
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-400">{d.descripcion}</p>
                  </Seccion>

                  <Seccion titulo="Patrón base" icono={<Shapes size={14} />}>
                    <p className="text-[11px] leading-relaxed text-slate-400">{huecos.length} puestos en un módulo de {num(p.modAncho, 1)} × {num(p.modLargo, 1)} m{p.huecos ? ', modificado a mano' : ''}{p.separacion !== 1 ? `, auxiliares al ${Math.round(p.separacion * 100)} %` : ''}.</p>
                    <Button className="w-full" onClick={() => { setPestana('patron'); setVista('modulo'); }}><Shapes size={14} className="mr-2" />Editar el patrón base</Button>
                  </Seccion>

                  <Seccion titulo="Especies de cada número" icono={<Sprout size={14} />}>
                    {etiquetas.map(et2 => <Puesto key={et2} etiqueta={et2} p={p} setP={setP} onFicha={setFicha} />)}
                    <Button variant="outline" className={cn('w-full', btnOscuro)} onClick={() => { fijar('asign', d.asignar(p.clave)); setAviso('Consorcio recomendado restaurado'); }}><RotateCcw size={13} className="mr-2" />Consorcio recomendado</Button>
                  </Seccion>
                </div>
              )}

              {pestana === 'patron' && (
                <PanelPatron p={p} setP={setP} seleccion={selHueco} setSeleccion={i => { setSelHueco(i); if (vista !== 'modulo') setVista('modulo'); }} copas={copas} setCopas={setCopas}
                  rejilla={rejilla} setRejilla={setRejilla} onPlantilla={cambiarDiseno} onFicha={setFicha} />
              )}

              {pestana === 'parcela' && (
                <div className="space-y-4">
                  <Seccion titulo="Superficie" icono={<LandPlot size={14} />}>
                    <Deslizador etiqueta="Ancho" valor={p.ancho} min={10} max={300} paso={5} unidad="m" onChange={v => fijar('ancho', v)} />
                    <Deslizador etiqueta="Largo (en la dirección de la pendiente)" valor={p.largo} min={10} max={300} paso={5} unidad="m" onChange={v => fijar('largo', v)} />
                    <p className="text-[11px] text-slate-400">{num(cf.ha, 2)} ha · {num(parcela.modulos)} módulos</p>
                  </Seccion>
                  <Seccion titulo="Pasillos, agua y maquinaria" icono={<SlidersHorizontal size={14} />}>
                    <Deslizador etiqueta="Módulos por bloque (este–oeste)" valor={p.bloqueX} min={1} max={20} paso={1} onChange={v => fijar('bloqueX', v)} />
                    <Deslizador etiqueta="Módulos por bloque (norte–sur)" valor={p.bloqueY} min={1} max={10} paso={1} onChange={v => fijar('bloqueY', v)} />
                    <Deslizador etiqueta="Ancho de pasillo" valor={p.pasillo} min={0.8} max={6} paso={0.1} unidad="m" onChange={v => fijar('pasillo', v)} />
                    <label className="block text-[11px] text-slate-300">Entre bloques, en curva de nivel
                      <select className={selectCls} value={p.franja} onChange={e => fijar('franja', e.target.value as Parametros['franja'])}>
                        <option value="zanja">Zanja de infiltración + pasillo</option>
                        <option value="pavimento">Pasillo de pavimento filtrante</option>
                      </select>
                    </label>
                    {p.franja === 'zanja' && <>
                      <Deslizador etiqueta="Ancho de la zanja" valor={p.franjaAncho} min={0.3} max={3} paso={0.1} unidad="m" onChange={v => fijar('franjaAncho', v)} />
                      <Deslizador etiqueta="Profundidad de la zanja" valor={p.zanjaProf} min={0.2} max={1.2} paso={0.05} unidad="m" onChange={v => fijar('zanjaProf', v)} />
                    </>}
                    <label className="block text-[11px] text-slate-300">Maquinaria
                      <select className={selectCls} value={p.maquina} onChange={e => fijar('maquina', e.target.value as Maquina)}>
                        {Object.entries(MAQUINAS).map(([k, m]) => <option key={k} value={k}>{m.nombre}</option>)}
                      </select>
                    </label>
                  </Seccion>
                  <Seccion titulo="Lugar" icono={<MapaIcono size={14} />}>
                    <label className="block text-[11px] text-slate-300">Zona de la península
                      <select className={selectCls} value={p.zona} onChange={e => { const z = ZONAS.find(x => x.id === e.target.value)!; setP(prev => ({ ...prev, zona: z.id, lluvia: z.lluvia })); }}>
                        {ZONAS.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                      </select>
                    </label>
                    <Deslizador etiqueta="Lluvia anual" valor={p.lluvia} min={150} max={1500} paso={10} unidad="mm" onChange={v => fijar('lluvia', v)} />
                    <Deslizador etiqueta="Pendiente" valor={p.pendiente} min={0} max={25} paso={0.5} unidad="%" onChange={v => fijar('pendiente', v)} />
                  </Seccion>
                  <Seccion titulo="Cifras: sintrópico frente a actual">
                    <Tabla filas={[
                      ['Plantas por hectárea', num(cf.plantasHa), num(cfC.plantasHa)],
                      [`${ESPECIE[p.clave].nombre} por hectárea`, num(cf.clavesHa), num(cfC.clavesHa)],
                      ['Especies', num(cf.especies), '1'],
                      ['Pasillos y pavimento', `${num(cf.pasillos / 100 / cf.ha, 1)} %`, '—'],
                      ['Zanjas en curva de nivel', `${num(cf.zanjaLargo)} m`, '—'],
                      ['Agua que guardan las zanjas', `${num(cf.capacidad)} m³ por tormenta`, '—'],
                      ['Ancho de máquina', `${MAQUINAS[p.maquina].ancho} m`, `${MARCO_CONVENCIONAL[p.clave].dx} m de calle`],
                    ]} />
                    <p className="text-[10px] text-slate-500">Modelo actual: {MARCO_CONVENCIONAL[p.clave].nombre}, suelo labrado, sin zanjas.</p>
                  </Seccion>
                </div>
              )}

              {pestana === 'simular' && (
                <div className="space-y-4">
                  <Seccion titulo="Condiciones iniciales" icono={<Sprout size={14} />}>
                    <Deslizador etiqueta="Materia orgánica inicial del suelo" valor={p.mo0} min={0.3} max={4} paso={0.1} unidad="%" onChange={v => fijar('mo0', v)} />
                    <Deslizador etiqueta="Riego de apoyo" valor={p.riego} min={0} max={400} paso={10} unidad="mm/año" onChange={v => fijar('riego', v)} />
                    <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" className="accent-emerald-500" checked={p.poda} onChange={e => fijar('poda', e.target.checked)} /> Poda y acolchado (chop &amp; drop)</label>
                    <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" className="accent-emerald-500" checked={p.anuales} onChange={e => fijar('anuales', e.target.checked)} /> Hortalizas anuales los primeros años</label>
                    {p.anuales && <Deslizador etiqueta="Años con hortalizas" valor={p.anosAnuales} min={1} max={6} paso={1} unidad="años" onChange={v => fijar('anosAnuales', v)} />}
                    <Button className="w-full" onClick={simularDesdeCero}><Play size={14} className="mr-2" />Simular desde el año 0</Button>
                  </Seccion>
                  <div className="rounded-xl bg-emerald-500/10 p-3 text-xs">
                    <div className="font-bold text-emerald-300">Año {ano} · {et.nombre}</div>
                    <p className="mt-1 text-slate-300">{et.desc}</p>
                    {ahora.length > 0 && <p className="mt-1 text-amber-300">Toca poda: {ahora.length} pareja{ahora.length > 1 ? 's' : ''} del mismo estrato ya se tocan este año.</p>}
                  </div>
                  <p className="text-[10px] text-slate-500"><span className="text-emerald-300">━</span> sintrópico · <span className="text-amber-300">┅</span> modelo actual</p>
                  <Grafica titulo={`Cosecha por árbol de ${ESPECIE[p.clave].nombre.toLowerCase()}`} unidad="kg/árbol" a={sim.map(x => ({ t: x.t, v: x.porArbol }))} b={simC.map(x => ({ t: x.t, v: x.porArbol }))} t={t} decimales={1}
                    nota="Lo que el ensayo quiere subir: la producción de cada árbol clave gracias al agua, el nitrógeno y la sombra del bosque." />
                  <Grafica titulo={`Cosecha de ${ESPECIE[p.clave].nombre.toLowerCase()} por hectárea`} unidad="kg/ha" a={sim.map(x => ({ t: x.t, v: x.clave }))} b={simC.map(x => ({ t: x.t, v: x.clave }))} t={t}
                    nota="Hipótesis a medir, no un resultado (depende de los tres efectos de abajo). Por hectárea cuenta también cuántos árboles clave caben: el diseño cambia la densidad." />
                  <Grafica titulo="Otros alimentos del bosque" unidad="kg/ha" a={sim.map(x => ({ t: x.t, v: x.extra }))} t={t} nota="Frutas, hortalizas y frutos rojos de las auxiliares (orientativo)." />
                  <Grafica titulo="Agua útil para las plantas" unidad="mm" a={sim.map(x => ({ t: x.t, v: x.aguaUtil }))} b={simC.map(x => ({ t: x.t, v: x.aguaUtil }))} t={t} nota="Lluvia que se queda en el suelo y no se evapora." />
                  <Grafica titulo="Escorrentía" unidad="% de la lluvia" a={sim.map(x => ({ t: x.t, v: x.escorrentia * 100 }))} b={simC.map(x => ({ t: x.t, v: x.escorrentia * 100 }))} t={t} decimales={1} />
                  <Grafica titulo="Suelo cubierto" unidad="%" a={sim.map(x => ({ t: x.t, v: x.suelo * 100 }))} b={simC.map(x => ({ t: x.t, v: x.suelo * 100 }))} t={t} />
                  <Grafica titulo="Materia orgánica del suelo" unidad="%" a={sim.map(x => ({ t: x.t, v: x.mo }))} b={simC.map(x => ({ t: x.t, v: x.mo }))} t={t} decimales={2} />
                  <Grafica titulo="Nitrógeno fijado" unidad="kg/ha·año" a={sim.map(x => ({ t: x.t, v: x.n }))} t={t} />
                  <Grafica titulo="Biomasa para acolchar" unidad="t/ha·año" a={sim.map(x => ({ t: x.t, v: x.biomasa }))} t={t} decimales={1} />
                  <Seccion titulo="Hipótesis del ensayo">
                    <p className="text-[11px] leading-relaxed text-slate-400">Cuánto sube la cosecha de la clave por cada efecto. Son los números que el ensayo de campo tiene que medir; muévelos para ver escenarios prudentes u optimistas.</p>
                    <Deslizador etiqueta="Efecto del agua retenida (elasticidad)" valor={p.hipAgua} min={0} max={1} paso={0.05} onChange={v => fijar('hipAgua', v)} />
                    <Deslizador etiqueta="Efecto del nitrógeno (máx.)" valor={p.hipN * 100} min={0} max={30} paso={1} unidad="%" onChange={v => fijar('hipN', v / 100)} />
                    <Deslizador etiqueta="Efecto del microclima (máx.)" valor={p.hipMicro * 100} min={0} max={20} paso={1} unidad="%" onChange={v => fijar('hipMicro', v / 100)} />
                  </Seccion>
                </div>
              )}

              {pestana === 'especies' && <BaseEspecies zona={p.zona} onFicha={setFicha} />}

              {pestana === 'consejos' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {listaConsejos.map((c, i) => (
                      <div key={i} className={cn('rounded-lg border p-2 text-xs', c.nivel === 'alerta' ? 'border-rose-500/40 bg-rose-500/10' : c.nivel === 'aviso' ? 'border-amber-500/40 bg-amber-500/10' : c.nivel === 'ok' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-sky-500/30 bg-sky-500/5')}>
                        <div className="flex items-center gap-1.5 font-bold text-slate-100">
                          {c.nivel === 'ok' ? <CheckCircle2 size={13} className="text-emerald-400" /> : c.nivel === 'idea' ? <Lightbulb size={13} className="text-sky-300" /> : <AlertTriangle size={13} className={c.nivel === 'alerta' ? 'text-rose-400' : 'text-amber-400'} />}
                          {c.titulo}
                        </div>
                        <p className="mt-0.5 leading-relaxed text-slate-300">{c.texto}</p>
                        {c.especies && <div className="mt-1 flex flex-wrap gap-1">{c.especies.map(id => <Button key={id} variant="ghost" className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] normal-case tracking-normal text-slate-300 hover:bg-slate-700" onClick={() => setFicha(id)}>{ESPECIE[id]?.nombre}</Button>)}</div>}
                      </div>
                    ))}
                  </div>
                  <Seccion titulo="Pasos para implantarlo" icono={<Sprout size={14} />}>
                    <ol className="space-y-2">
                      {pasos(p).map((s, i) => <li key={i} className="text-xs"><b className="text-emerald-300">{i + 1}. {s.cuando}.</b> <span className="text-slate-300">{s.que}</span></li>)}
                    </ol>
                  </Seccion>
                </div>
              )}

              {pestana === 'planos' && (
                <div className="space-y-4">
                  <p className="text-xs leading-relaxed text-slate-400">Planos en metros para replantear en el campo: cada planta con su número, y la ficha del módulo con la distancia de cada puesto a la especie clave. El DXF se abre en AutoCAD, QCAD, LibreCAD o FreeCAD (una capa por número).</p>
                  <div className="grid gap-2">
                    <Button onClick={() => descargar(`${nombreArchivo(p)}-modulo.svg`, svgModulo(p).svg, 'image/svg+xml')}><Ruler size={14} className="mr-2" />Ficha del módulo con distancias · SVG</Button>
                    <Button onClick={() => descargar(`${nombreArchivo(p)}-plano.svg`, svgPlano(p, parcela, { numeros: true, copas: true }), 'image/svg+xml')}><MapaIcono size={14} className="mr-2" />Plano de la parcela · SVG</Button>
                    <Button onClick={() => descargar(`${nombreArchivo(p)}.dxf`, dxfPlano(p, parcela), 'application/dxf')}><MapaIcono size={14} className="mr-2" />Plano de la parcela · DXF (CAD)</Button>
                    <Button variant="outline" className={btnOscuro} onClick={() => descargar(`${nombreArchivo(p)}-plantacion.csv`, csvPlantas(parcela), 'text/csv;charset=utf-8')}><Download size={14} className="mr-2" />Lista de plantación (CSV)</Button>
                    <Button variant="outline" className={btnOscuro} onClick={() => { setVista('3d'); setTimeout(capturar, 300); }}><ImagenIcono size={14} className="mr-2" />Imagen del 3D · PNG</Button>
                  </div>
                  <Seccion titulo="Distancias del módulo">
                    <table className="w-full text-[11px]"><thead><tr className="text-slate-500"><th className="text-left">N.º</th><th className="text-left">Especie</th><th className="text-right">x</th><th className="text-right">y</th><th className="text-right">a la clave</th></tr></thead>
                      <tbody>{svgModulo(p).tabla.map((r, i) => <tr key={i} className="border-t border-slate-800 text-slate-300"><td className="font-bold">{r.etiqueta}</td><td className="truncate">{r.especie || '—'}</td><td className="text-right font-mono">{num(r.x, 2)}</td><td className="text-right font-mono">{num(r.y, 2)}</td><td className="text-right font-mono text-emerald-300">{num(r.aClave, 2)} m</td></tr>)}</tbody></table>
                    <p className="text-[10px] text-slate-500">x desde el borde oeste del módulo, y desde el borde sur.</p>
                  </Seccion>
                  <Seccion titulo="Para el vivero">
                    <table className="w-full text-[11px]"><tbody>{listaCompra(parcela).map(r => <tr key={r.esp.id} className="border-t border-slate-800 text-slate-300"><td><Button variant="ghost" className="px-0 py-0.5 text-[11px] normal-case tracking-normal text-slate-200 hover:bg-transparent hover:text-emerald-300" onClick={() => setFicha(r.esp.id)}>{r.esp.nombre}</Button></td><td className="text-right font-mono">{num(r.n)}</td></tr>)}</tbody></table>
                    <p className="text-[10px] text-slate-500">{num(cf.plantas)} plantas en {num(cf.ha, 2)} ha.</p>
                  </Seccion>
                  <Seccion titulo="Guardar y compartir" icono={<Share2 size={14} />}>
                    <Button variant="outline" className={cn('w-full', btnOscuro)} onClick={() => navigator.clipboard?.writeText(enlace(p)).then(() => setAviso('Enlace copiado: abre este diseño tal cual'), () => setAviso('No se pudo copiar el enlace'))}><Share2 size={14} className="mr-2" />Copiar enlace a este diseño</Button>
                    <Button variant="outline" className={cn('w-full', btnOscuro)} onClick={() => descargar(`${nombreArchivo(p)}.json`, JSON.stringify(p, null, 2), 'application/json')}><Download size={14} className="mr-2" />Guardar diseño · JSON</Button>
                    <Button variant="outline" className={cn('w-full', btnOscuro)} onClick={() => entradaJson.current?.click()}><Upload size={14} className="mr-2" />Cargar diseño</Button>
                    <input ref={entradaJson} type="file" accept="application/json,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) cargarJson(f); e.target.value = ''; }} />
                    <Button variant="ghost" className="w-full text-slate-400 hover:bg-slate-800" onClick={() => { setP(porDefecto('modulo', 'almendro')); setAviso('Diseño inicial restaurado'); }}><RotateCcw size={14} className="mr-2" />Empezar de nuevo</Button>
                  </Seccion>
                </div>
              )}

              {pestana === 'proyecto' && <Proyecto />}
            </div>
          </aside>
        )}

        {/* ------------------------------------------------ view */}
        <main className="relative min-w-0 flex-1">
          {vista === '3d' && <>
            <Escena3D parcela={parcela} convencional={comparar ? conv : null} p={pd} t={t} resaltar={ficha} camara={camara} onElegir={elegirPlanta}
              ambiente={ambiente} onReloj={(mes, hora) => setReloj({ mes, hora })} />
            <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1 rounded-xl bg-slate-900/85 p-1.5 text-[11px] text-slate-200 backdrop-blur sm:max-w-[calc(100%-18rem)]">
              {([['primavera', 'Primavera', 3.9, Flower2], ['verano', 'Verano', 6.9, Sun], ['otono', 'Otoño', 10.1, Leaf], ['invierno', 'Invierno', 0.6, Snowflake]] as const).map(([id, txt, m, I]) => (
                <Button key={id} variant="ghost" onClick={() => { amb({ mes: m, animarAno: false }); setReloj(r => ({ ...r, mes: m })); }}
                  className={cn('gap-1 px-2 py-1 text-[10px] normal-case tracking-normal', estacionDe(reloj.mes) === id ? 'bg-emerald-600 text-white hover:bg-emerald-600' : 'text-slate-300 hover:bg-slate-800')}><I size={13} />{txt}</Button>
              ))}
              <Button variant="ghost" className={cn('gap-1 px-2 py-1 text-[10px] normal-case tracking-normal', ambiente.animarAno ? 'bg-amber-400 text-slate-900 hover:bg-amber-300' : 'text-slate-200 hover:bg-slate-800')}
                onClick={() => amb(ambiente.animarAno ? { animarAno: false, mes: reloj.mes } : { animarAno: true })}>{ambiente.animarAno ? <Pause size={12} /> : <Play size={12} />}Año</Button>
              <span className="w-16 text-center font-semibold capitalize text-emerald-300">{nombreMes(reloj.mes)}</span>
              <span className="mx-1 h-5 w-px bg-slate-700" />
              <Clock size={13} className="text-slate-400" />
              <input type="range" min={6} max={21.5} step={0.25} value={ambiente.animarDia ? reloj.hora : ambiente.hora} aria-label="Hora del día"
                onChange={e => { amb({ hora: Number(e.target.value), animarDia: false }); setReloj(r => ({ ...r, hora: Number(e.target.value) })); }} className="w-20 accent-amber-400" />
              <span className="w-10 font-mono text-[10px]">{String(Math.floor(reloj.hora)).padStart(2, '0')}:{String(Math.floor((reloj.hora % 1) * 60)).padStart(2, '0')}</span>
              <Button variant="ghost" className={cn('gap-1 px-2 py-1 text-[10px] normal-case tracking-normal', ambiente.animarDia ? 'bg-amber-400 text-slate-900 hover:bg-amber-300' : 'text-slate-200 hover:bg-slate-800')}
                onClick={() => amb(ambiente.animarDia ? { animarDia: false, hora: reloj.hora } : { animarDia: true })}>{ambiente.animarDia ? <Pause size={12} /> : <Play size={12} />}Día</Button>
              <span className="mx-1 h-5 w-px bg-slate-700" />
              <Wind size={13} className="text-slate-400" />
              <select aria-label="Viento" className="rounded-md border border-slate-700 bg-slate-800 px-1 py-0.5 text-[10px]" value={ambiente.viento} onChange={e => amb({ viento: Number(e.target.value) })}>
                <option value={0}>Calma</option><option value={0.3}>Brisa</option><option value={0.65}>Viento</option><option value={1}>Vendaval</option>
              </select>
              <label className="ml-1 flex items-center gap-1 text-[10px] text-slate-300"><input type="checkbox" className="accent-emerald-500" checked={ambiente.sombras} onChange={e => amb({ sombras: e.target.checked })} />Sombras</label>
            </div>
            <div className="absolute bottom-3 right-3 flex gap-1">
              {([['perspectiva', 'Perspectiva'], ['cenital', 'Cenital'], ['lateral', 'A ras de suelo']] as [Vista3D, string][]).map(([v, txt]) => (
                <Button key={v} variant="ghost" className="bg-slate-900/80 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800" onClick={() => setCamara({ vista: v, nonce: Date.now() })}>{txt}</Button>
              ))}
            </div>
            <div className="pointer-events-none absolute left-3 right-3 top-3 w-fit max-w-full rounded-lg bg-slate-900/80 px-2.5 py-1.5 text-[11px] text-slate-300">
              <div>Toca un árbol para ver su ficha.</div>
              <div className="font-mono"><span className="text-emerald-300">{num(ya.porArbol, 1)}</span>{comparar && <> / <span className="text-amber-300">{num(yaC.porArbol, 1)}</span></>} kg por árbol · <span className="text-emerald-300">{num(ya.clave)}</span>{comparar && <> / <span className="text-amber-300">{num(yaC.clave)}</span></>} kg/ha · año {ano}</div>
              <div className="text-[10px] text-slate-500">{ESPECIE[p.clave].nombre}: sintrópico{comparar ? ' / modelo actual' : ''} · estimación a medir</div>
            </div>
          </>}
          {vista === 'plano' && (
            <div className="absolute inset-0 overflow-auto bg-white">
              <div style={{ width: `${zoomPlano * 100}%` }} dangerouslySetInnerHTML={{ __html: svgPlano(pd, parcela, { numeros: true, copas }).replace(/width="[\d.]+" height="[\d.]+"/, 'width="100%"') }} />
              <div className="fixed bottom-24 right-4 flex gap-1">
                <Button variant="outline" className="bg-white px-3" onClick={() => setZoomPlano(z => Math.max(1, z / 1.5))}>−</Button>
                <Button variant="outline" className="bg-white px-3" onClick={() => setZoomPlano(z => Math.min(12, z * 1.5))}>+</Button>
              </div>
            </div>
          )}
          {vista === 'modulo' && (
            <div className="absolute inset-0 bg-slate-100 p-2">
              <EditorModulo mediaLuna={!!d.mediaLuna} huecos={huecos} ancho={p.modAncho} largo={p.modLargo} asign={p.asign} copas={copas} seleccion={selHueco}
                onSeleccion={i => { setSelHueco(i); if (i != null) { setPestana('patron'); setPanel(true); } }} onMover={moverHueco} />
            </div>
          )}

          {ficha && ESPECIE[ficha] && (
            <div className="absolute inset-y-0 right-0 z-30 w-[min(22rem,100%)] overflow-y-auto border-l border-slate-800 bg-slate-900/95 p-3 backdrop-blur">
              <FichaEspecie e={ESPECIE[ficha]} lluvia={p.lluvia + p.riego} zona={p.zona} onCerrar={() => setFicha(null)} />
            </div>
          )}
          {aviso && <div className="absolute bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-slate-800 px-4 py-2 text-xs text-white shadow-lg">{aviso}</div>}
        </main>
      </div>

      {/* ------------------------------------------------ succession timeline */}
      <footer className="border-t border-slate-800 bg-slate-900 px-3 py-2">
        <div className="flex items-center gap-3">
          <Button className="h-9 w-9 shrink-0 rounded-full p-0" onClick={() => { if (!jugando && t >= ANOS) setT(0); setJugando(v => !v); }} aria-label={jugando ? 'Pausa' : 'Simular'}>
            {jugando ? <Pause size={16} /> : <Play size={16} />}
          </Button>
          <div className="min-w-0 flex-1">
            <div className="relative flex h-4 text-[9px] text-slate-500">
              {ETAPAS.slice(0, 4).map(e => (
                <span key={e.nombre} className={cn('absolute truncate border-l border-slate-700 pl-1', et.nombre === e.nombre && 'text-emerald-300')} style={{ left: `${(e.desde / ANOS) * 100}%`, width: `${((Math.min(ANOS, e.hasta) - e.desde) / ANOS) * 100}%` }}>{e.nombre}</span>
              ))}
            </div>
            <input type="range" min={0} max={ANOS} step={0.1} value={t} onChange={e => { setJugando(false); setT(Number(e.target.value)); }} className="w-full cursor-pointer accent-emerald-500" aria-label="Año" />
          </div>
          <div className="w-14 shrink-0 text-right"><div className="font-mono text-lg font-bold text-emerald-300">{t < 1 ? `${Math.round(t * 12)} m` : ano}</div><div className="text-[9px] text-slate-500">{t < 1 ? 'meses' : 'años'}</div></div>
        </div>
        <p className="mt-0.5 hidden truncate text-[11px] text-slate-400 sm:block"><b className="text-slate-200">{et.nombre}:</b> {et.desc}</p>
      </footer>
    </div>
  );
}

function Tabla({ filas }: { filas: [string, string, string][] }) {
  return (
    <table className="w-full text-[11px]">
      <thead><tr className="text-slate-500"><th /><th className="text-right font-normal text-emerald-400">Sintrópico</th><th className="text-right font-normal text-amber-400">Actual</th></tr></thead>
      <tbody>{filas.map(([a, b, c]) => <tr key={a} className="border-t border-slate-800"><td className="py-1 text-slate-300">{a}</td><td className="text-right font-mono text-slate-100">{b}</td><td className="text-right font-mono text-slate-400">{c}</td></tr>)}</tbody>
    </table>
  );
}

const ESTRATOS_DE_ROL: Record<number, Estrato[]> = { 1: [], 2: ['emergente', 'alto', 'medio'], 3: ['medio', 'bajo'], 4: ['bajo', 'suelo'], 5: ['suelo'] };

/** One number of the module: its species (a mix if several), and a selector to add more. */
function Puesto({ etiqueta, p, setP, onFicha }: { etiqueta: string; p: Parametros; setP: React.Dispatch<React.SetStateAction<Parametros>>; onFicha: (id: string) => void }) {
  const r = rol(etiqueta);
  const lista = p.asign[etiqueta] ?? [];
  const [todas, setTodas] = useState(false);
  const recomendados = r === 1 ? CLAVES : ESPECIES.filter(s => !s.clave && ESTRATOS_DE_ROL[r].includes(s.estrato));
  const opciones = (todas ? ESPECIES : recomendados).filter(s => !lista.includes(s.id) && (todas || s.ciclo !== 'anual' || r === 5));
  const poner = (ids: string[]) => setP(prev => ({ ...prev, asign: { ...prev.asign, [etiqueta]: ids } }));
  return (
    <div className="rounded-lg bg-slate-800/50 p-2">
      <div className="flex items-center gap-2">
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-bold text-slate-900" style={{ background: COLOR_ROL[r] }}>{etiqueta}</span>
        <span className="text-[11px] text-slate-400">{NOMBRE_ROL[r]}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {lista.length === 0 && <span className="text-[10px] text-amber-300">Sin especie: este puesto queda vacío</span>}
        {lista.map(id => ESPECIE[id] && (
          <span key={id} className="inline-flex items-center gap-1 rounded-full bg-slate-700 py-0.5 pl-2 pr-0.5 text-[11px] text-slate-100">
            <span className="h-2 w-2 rounded-full" style={{ background: ESPECIE[id].color }} />
            <Button variant="ghost" className="p-0 text-[11px] normal-case tracking-normal text-slate-100 hover:bg-transparent hover:text-emerald-300" onClick={() => onFicha(id)}>{ESPECIE[id].nombre}</Button>
            <Gotas n={ESPECIE[id].agua} className="scale-75" />
            <Button variant="ghost" className="rounded-full p-0.5 text-slate-400 hover:bg-slate-600" onClick={() => poner(lista.filter(x => x !== id))} aria-label="Quitar"><X size={11} /></Button>
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <select className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-300" value="" onChange={e => e.target.value && poner([...lista, e.target.value])}>
          <option value="">{lista.length ? '+ Añadir a la mezcla…' : '+ Elegir especie…'}</option>
          {ESTRATOS.map(es => { const g = opciones.filter(s => s.estrato === es.id); return g.length ? <optgroup key={es.id} label={es.nombre}>{g.map(s => <option key={s.id} value={s.id}>{s.nombre}{s.funciones.includes('fijaN') ? ' · fija N' : ''}{s.ciclo === 'anual' ? ' · anual' : ''}</option>)}</optgroup> : null; })}
        </select>
        <label className="flex items-center gap-1 text-[10px] text-slate-500"><input type="checkbox" className="accent-emerald-500" checked={todas} onChange={e => setTodas(e.target.checked)} />todas</label>
      </div>
    </div>
  );
}

/** The reference database: every species, filterable, each with its card. */
function BaseEspecies({ zona, onFicha }: { zona: Zona; onFicha: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [estrato, setEstrato] = useState<string>('');
  const [funcion, setFuncion] = useState<string>('');
  const [soloZona, setSoloZona] = useState(false);
  const [soloAut, setSoloAut] = useState(false);
  const [perennes, setPerennes] = useState(false);
  const qq = q.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const lista = ESPECIES.filter(s =>
    (!qq || (s.nombre + ' ' + s.cientifico + ' ' + s.alimento).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(qq)) &&
    (!estrato || s.estrato === estrato) && (!funcion || s.funciones.includes(funcion as Funcion)) &&
    (!soloZona || s.zonas.includes(zona)) && (!soloAut || s.autoctona) && (!perennes || s.ciclo !== 'anual'));
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-white">Base de especies</h2>
        <p className="text-[11px] text-slate-400">{ESPECIES.length} especies clasificadas por estrato, generación, sucesión, agua, valor, alimento y zonas de la península. Toca una para ver su ficha.</p>
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar: almendro, nitrógeno, higos…" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-200" />
      <div className="grid grid-cols-2 gap-2">
        <select className={selectCls} value={estrato} onChange={e => setEstrato(e.target.value)}><option value="">Todos los estratos</option>{ESTRATOS.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select>
        <select className={selectCls} value={funcion} onChange={e => setFuncion(e.target.value)}><option value="">Todas las funciones</option>{Object.entries(FUNCIONES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-slate-300">
        <label className="flex items-center gap-1"><input type="checkbox" className="accent-emerald-500" checked={soloZona} onChange={e => setSoloZona(e.target.checked)} />Aptas en mi zona</label>
        <label className="flex items-center gap-1"><input type="checkbox" className="accent-emerald-500" checked={soloAut} onChange={e => setSoloAut(e.target.checked)} />Autóctonas</label>
        <label className="flex items-center gap-1"><input type="checkbox" className="accent-emerald-500" checked={perennes} onChange={e => setPerennes(e.target.checked)} />Solo perennes</label>
      </div>
      <div className="divide-y divide-slate-800 rounded-xl border border-slate-800">
        {lista.map(s => (
          <Button key={s.id} variant="ghost" onClick={() => onFicha(s.id)} className="flex h-auto w-full items-center gap-2 rounded-none px-2 py-1.5 text-left normal-case tracking-normal hover:bg-slate-800">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold text-slate-100">{s.nombre}{s.clave && <span className="ml-1 text-[9px] text-amber-300">CLAVE</span>}</span>
              <span className="block truncate text-[10px] font-normal italic text-slate-500">{s.cientifico} · {ESTRATOS.find(e => e.id === s.estrato)!.nombre} · {GENERACIONES[s.gen].nombre}</span>
            </span>
            <Gotas n={s.agua} />
            <MapaZonas zonas={s.zonas} actual={zona} pequeno />
          </Button>
        ))}
        {!lista.length && <p className="p-3 text-xs text-slate-500">Ninguna especie con esos filtros.</p>}
      </div>
    </div>
  );
}

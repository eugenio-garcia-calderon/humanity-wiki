// ============================================================================
// Our own designs in the garage (2026-11-12)
// ============================================================================
// Eugenio: «permite en el garaje ver, agregar los otros modelos de vehículos. Por ejemplo, poder comparar el
// cuadriciclo con el triciclo en el garaje». Any saved design (the list the logo menu shows, from
// /api/aeromovil/disenos) can be put in the garage next to the design being edited: it is built once, when it is
// added, with the viewer's own builders (`construirDisenoGaraje`), and from then on the viewer treats it as one
// more garage car (placed, dragged, labelled, its doors opened). Which designs are in the garage, and where, is
// remembered per browser (localStorage, by design id). A design deleted or archived since simply drops out.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Check, Plus } from 'lucide-react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import { construirDisenoGaraje } from './Visor3D';
import { deDiseno, type Diseno } from './Disenos';
import { ajustarCarenado, areas, calcular, crearModelo, type Modelo, type Resultados } from './geometria';
import { camposTriciclo, nombreTriciclo } from './geometriaTriciclo';
import { cuerpoAeromovil, cuerpoTriciclo, peticionDe } from './tunel/nuestro';
import { pedirTunel, resultadoEnCache } from './tunel/cliente';
import type { Resolucion } from './tunel/malla';
import { olvidarVehiculo, registrarVehiculo } from './garaje/registro';
import { vehiculoGaraje } from './garaje';
import type { VehiculoGaraje } from './garaje/tipos';

const CLAVE = 'aeromovil_garaje_disenos_v1';
/** At most this many designs in the garage at once: a Triciclo takes about a second to build and its own memory. */
export const MAX_DISENOS_GARAJE = 4;
const PREFIJO = 'diseno-';
export const esDisenoGaraje = (id: string) => id.startsWith(PREFIJO);
const idGaraje = (id: number) => `${PREFIJO}${id}`;

export interface PlazaDiseno { id: number; x: number; z: number; giro: number }

const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

function leerPlazas(): PlazaDiseno[] {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) || '[]');
    if (!Array.isArray(g)) return [];
    const ok = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
    return g.filter(p => p && Number.isInteger(p.id) && ok(p.x) && ok(p.z)).map(p => ({ id: p.id, x: p.x, z: p.z, giro: ok(p.giro) ? p.giro : 0 })).slice(0, MAX_DISENOS_GARAJE);
  } catch { return []; }
}

/** The family's name, as the editor calls it (a Triciclo with two rear wheels is the «Cuadriciclo Bala clásico»). */
function familia(P: ReturnType<typeof deDiseno>, m: Modelo): string {
  return m.tipo === 'a1' ? 'Aeromóvil 1' : m.tipo === 'bala' ? 'Cuadriciclo Bala en rombo' : m.tipo === 'triciclo' ? nombreTriciclo(camposTriciclo(P)) : 'Aeromóvil Gota';
}

interface Info { d: Diseno; modelo: Modelo; res: Resultados; familia: string; def: VehiculoGaraje }

/**
 * A garage car for a saved design. Nothing is built until the viewer asks (`construir`); then the design is built
 * once into a template, and every later call hands out a copy (the viewer rebuilds the whole garage when its list
 * changes, and a Triciclo takes ~1 s). The copy shares geometries and materials with the template: the viewer
 * disposes the geometries when it empties the garage, and three.js uploads them again on the next draw.
 */
function vehiculoDe(d: Diseno, modelo: Modelo, nombreFamilia: string): VehiculoGaraje {
  let plantilla: THREE.Group | null = null;
  const def: VehiculoGaraje = {
    id: idGaraje(d.id), nombre: d.nombre,
    largo: modelo.Lf, ancho: modelo.P.W, alto: modelo.P.H, batalla: modelo.P.B,
    fuente: `Diseño guardado en el editor (${nombreFamilia})`,
    construir: () => {
      if (!plantilla) {
        const t0 = performance.now();
        const { grupo, pivotes } = construirDisenoGaraje(modelo);
        plantilla = grupo; def.pivotes = pivotes;
        try { performance.measure(`garaje-diseno:${modelo.tipo}`, { start: t0, end: performance.now() }); } catch { /* old browsers */ }
      }
      // (Object3D.clone copies userData through JSON: the builders' userData is left out of the copy)
      const datos = new Map<THREE.Object3D, Record<string, unknown>>();
      plantilla.traverse(o => { datos.set(o, o.userData); o.userData = {}; });
      const copia = plantilla.clone(true);
      for (const [o, u] of datos) o.userData = u;
      return copia;
    },
  };
  return def;
}

/** The Cd request for a design whose Cd only the tunnel gives (the Triciclo family and the Bala), numbers only. */
function peticionCd(i: Info, resolucion: Resolucion) {
  const { modelo: m, res } = i;
  if (m.tipo === 'triciclo') return { ...peticionDe({ ...cuerpoTriciclo(m), id: `garaje-cd-${i.d.id}` }, resolucion, 'pocas'), soloNumeros: true };
  if (m.tipo === 'bala') return { ...peticionDe({ ...cuerpoAeromovil(m, res.A), id: `garaje-cd-${i.d.id}` }, resolucion, 'pocas'), soloNumeros: true };
  return null;
}
/** The tunnel's Cd at `kmh`, interpolated between the speeds it computes (as the editor does for the Triciclo). */
function cdA(R: NonNullable<ReturnType<typeof resultadoEnCache>>, kmh: number) {
  const pv = R.porVelocidad, v = Math.min(pv[pv.length - 1].kmh, Math.max(pv[0].kmh, kmh));
  let k = 0; while (k < pv.length - 2 && v > pv[k + 1].kmh) k++;
  const u = (v - pv[k].kmh) / (pv[k + 1].kmh - pv[k].kmh);
  return pv[k].cd.total + (pv[k + 1].cd.total - pv[k].cd.total) * u;
}

/** A car's plan footprint: x from the tail to the nose, z across. */
type Huella = { x0: number; x1: number; z0: number; z1: number };
const solapan = (a: Huella, b: Huella, margen = 0.3) => a.x0 < b.x1 + margen && b.x0 < a.x1 + margen && a.z0 < b.z1 + margen && b.z0 < a.z1 + margen;

export function useDisenosGaraje({ actual, catalogo, resolucion }: {
  /** Our car: nose, tail and width (m). */
  actual: { xn: number; xt: number; W: number };
  /** The catalogue cars on show, with their place. */
  catalogo: { id: string; x: number; z: number; giro: number }[];
  resolucion: Resolucion;
}) {
  const [plazas, setPlazas] = useState<PlazaDiseno[]>(leerPlazas);
  const [lista, setLista] = useState<Diseno[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setVersion] = useState(0);
  useEffect(() => { try { localStorage.setItem(CLAVE, JSON.stringify(plazas)); } catch { /* without storage it is forgotten on reload */ } }, [plazas]);
  const cargar = () => {
    setError(null);
    fetch('/api/aeromovil/disenos', { credentials: 'include' })
      .then(async r => { if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || 'No se han podido leer los diseños.'); return r.json(); })
      .then((l: Diseno[]) => setLista(Array.isArray(l) ? l : []))
      .catch(e => setError(e?.message || 'No se han podido leer los diseños.'));
  };
  useEffect(cargar, []);
  // a design deleted or archived since it was put in the garage: it just drops out
  useEffect(() => { if (lista) setPlazas(p => { const q = p.filter(x => lista.some(d => d.id === x.id)); return q.length === p.length ? p : q; }); }, [lista]);

  // Each design's model and figures, worked out once per saved version (`updated_at`), and its garage car registered.
  const infos = useRef(new Map<string, Info>());
  const enGaraje = useMemo(() => {
    if (!lista) return [] as (Info & { plaza: PlazaDiseno })[];
    const out: (Info & { plaza: PlazaDiseno })[] = [];
    for (const p of plazas) {
      const d = lista.find(x => x.id === p.id); if (!d) continue;
      const clave = `${d.id}@${d.updated_at}`;
      let i = infos.current.get(clave);
      if (!i) {
        try {
          const P = deDiseno(d.parametros || {}), modelo = crearModelo(ajustarCarenado(P)), res = calcular(modelo, areas(modelo)), fam = familia(P, modelo);
          i = { d, modelo, res, familia: fam, def: vehiculoDe(d, modelo, fam) };
          infos.current.set(clave, i);
        } catch (e) { console.error(`[garaje] el diseño «${d.nombre}» no se ha podido calcular:`, e); continue; }
      }
      registrarVehiculo(i.def);
      out.push({ ...i, plaza: p });
    }
    return out;
  }, [lista, plazas]);
  // the ones taken out are forgotten (a design added again is registered again from its cached info)
  useEffect(() => {
    const dentro = new Set(enGaraje.map(i => i.def.id));
    for (const i of infos.current.values()) if (!dentro.has(i.def.id)) olvidarVehiculo(i.def.id);
  }, [enGaraje]);

  // The Cd of the designs whose Cd only the tunnel gives, in the background, after the editor's own requests.
  const peticiones = useMemo(() => enGaraje.map(i => ({ i, p: peticionCd(i, resolucion) })), [enGaraje, resolucion]);
  useEffect(() => {
    let vivo = true;
    for (const { p } of peticiones) if (p && !resultadoEnCache(p)) pedirTunel(p, 8).then(() => { if (vivo) setVersion(v => v + 1); });
    return () => { vivo = false; };
  }, [peticiones]);

  const fichas: Record<string, string[]> = {}, carteles: Record<string, string> = {};
  for (const { i, p } of peticiones) {
    const { modelo: m, res } = i;
    const R = p ? resultadoEnCache(p) : undefined;
    const kmh = m.tipo === 'triciclo' ? camposTriciclo(deDiseno(i.d.parametros || {})).tVel : 80;
    const cd = m.tipo === 'a1' || m.tipo === 'gota'
      ? `Cd ${fmt(res.Cd, 3)} (fórmula del editor)`
      : R ? `Cd ${fmt(cdA(R, kmh), 3)} (túnel, a ${Math.round(kmh)} km/h)` : 'Cd: el túnel lo está calculando…';
    const kWh = m.tipo === 'a1' ? m.P.kWh : m.tipo === 'triciclo' ? m.kWh : null;
    fichas[i.def.id] = [
      // (the family, unless the design is named after it)
      ...(i.familia !== i.d.nombre ? [i.familia] : []),
      `${fmt(m.Lf)} × ${fmt(m.P.W)} × ${fmt(m.P.H)} m (largo × ancho × alto)`,
      `${res.mVeh > 0 ? `${Math.round(res.mVeh)} kg en vacío` : 'sin masa (chasis y batería sin diseñar)'}${kWh != null ? ` · batería ${fmt(kWh, 1)} kWh` : ''}`,
      cd,
    ];
    // the label over the car with «Cd y consumo» or the tunnel on: its name and its Cd
    carteles[i.def.id] = `${i.d.nombre}\n${cd.replace(/ \(.*\)$/, '')}`;
  }

  /** A free place for a new design: beside ours if there is room, otherwise in a row in front of it. */
  const sitioLibre = (m: Modelo): { x: number; z: number } => {
    const ocupado: Huella[] = [{ x0: Math.min(actual.xt, actual.xn), x1: Math.max(actual.xt, actual.xn), z0: -actual.W / 2, z1: actual.W / 2 }];
    for (const v of catalogo) {
      const def = vehiculoGaraje(v.id); if (!def) continue;
      const xs = def.envolvente?.map(e => e[0]), xa = xs?.length ? Math.min(...xs) : -def.largo + 0.9, xb = xs?.length ? Math.max(...xs) : 0.9;
      const girado = Math.abs(Math.sin(v.giro)) > 0.5, mx = girado ? def.ancho / 2 : (xb - xa) / 2, mz = girado ? (xb - xa) / 2 : def.ancho / 2, cx = v.x + (xa + xb) / 2;
      ocupado.push({ x0: cx - mx, x1: cx + mx, z0: v.z - mz, z1: v.z + mz });
    }
    for (const i of enGaraje) ocupado.push({ x0: i.plaza.x + i.modelo.xt, x1: i.plaza.x + i.modelo.xn, z0: i.plaza.z - i.modelo.P.W / 2, z1: i.plaza.z + i.modelo.P.W / 2 });
    const libre = (x: number, z: number) => !ocupado.some(o => solapan(o, { x0: x + m.xt, x1: x + m.xn, z0: z - m.P.W / 2, z1: z + m.P.W / 2 }));
    const paso = (actual.W + m.P.W) / 2 + 0.6;
    for (const z of [-paso, paso]) if (libre(0, z)) return { x: 0, z };
    const xDelante = Math.round((actual.xn + 1.2 - m.xt) * 20) / 20;
    for (const z of [0, -2.6, 2.6, -5.2, 5.2, -7.8, 7.8]) if (libre(xDelante, z)) return { x: xDelante, z };
    return { x: xDelante + 5, z: 0 };
  };

  // the places of designs that still exist (the saved list is cleaned by the effect above, one render later)
  const validas = lista ? plazas.filter(x => lista.some(d => d.id === x.id)) : plazas;
  const anadir = (d: Diseno) => {
    if (validas.length >= MAX_DISENOS_GARAJE || plazas.some(p => p.id === d.id)) return;
    let m: Modelo;
    try { m = crearModelo(ajustarCarenado(deDiseno(d.parametros || {}))); } catch { return; }
    const { x, z } = sitioLibre(m);
    setPlazas(p => [...p, { id: d.id, x, z, giro: 0 }]);
  };
  const quitar = (id: string) => setPlazas(p => p.filter(x => idGaraje(x.id) !== id));
  const mover = (id: string, x: number, z: number) => setPlazas(p => p.map(v => idGaraje(v.id) === id ? { ...v, x, z } : v));

  /** What the viewer gets: the designs that are ready (registered), with their place. */
  const visor = useMemo(() => enGaraje.map(i => ({ id: i.def.id, x: i.plaza.x, z: i.plaza.z, giro: i.plaza.giro })), [enGaraje]);
  return { lista, error, cargar, plazas: validas, visor, fichas, carteles, anadir, quitar, mover };
}

/** «Mis diseños» in the garage block: every saved design, to put in the garage or take out (at most four). */
export function MisDisenosGaraje({ g }: { g: ReturnType<typeof useDisenosGaraje> }) {
  const lleno = g.plazas.length >= MAX_DISENOS_GARAJE;
  return (
    <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-2.5">
      <p className="flex items-baseline justify-between text-xs font-semibold text-slate-600">
        Mis diseños<span className="font-mono text-[11px] font-normal text-slate-400">{g.plazas.length}/{MAX_DISENOS_GARAJE} en el garaje</span>
      </p>
      {g.error && (
        <p className="text-xs text-red-700">{g.error} <Button variant="ghost" onClick={g.cargar} className="px-1 py-0 text-xs normal-case tracking-normal underline">Reintentar</Button></p>
      )}
      {!g.lista && !g.error && <p className="text-xs text-slate-400">Cargando los diseños…</p>}
      {g.lista && g.lista.length === 0 && <p className="text-xs text-slate-400">Aún no hay diseños guardados.</p>}
      {g.lista && g.lista.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {g.lista.map(d => {
            const dentro = g.plazas.some(p => p.id === d.id);
            return (
              <Button key={d.id} variant="outline" aria-pressed={dentro} disabled={!dentro && lleno}
                onClick={() => (dentro ? g.quitar(idGaraje(d.id)) : g.anadir(d))}
                title={dentro ? `Quitar «${d.nombre}» del garaje` : lleno ? `Caben ${MAX_DISENOS_GARAJE} diseños a la vez: quita uno antes` : `Poner «${d.nombre}» en el garaje`}
                className={cn('max-w-full gap-1 px-2 py-1 text-[11px] normal-case tracking-normal', dentro && 'border-teal-600 bg-teal-50 text-teal-800')}>
                {dentro ? <Check className="h-3 w-3 shrink-0" /> : <Plus className="h-3 w-3 shrink-0" />}
                <span className="truncate">{d.nombre}</span>
              </Button>
            );
          })}
        </div>
      )}
      <p className="text-[11px] leading-snug text-slate-500">
        Hasta {MAX_DISENOS_GARAJE} a la vez, tal como están guardados. Se ponen al lado del tuyo (o delante, si al lado no caben); púlsalos en el 3D para ver sus medidas, su masa y su Cd, abrir sus puertas o quitarlos, y arrástralos para moverlos.
      </p>
    </div>
  );
}

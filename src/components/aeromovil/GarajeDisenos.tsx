// ============================================================================
// Our own designs in the garage (2026-11-12; in rows since 2026-11-13)
// ============================================================================
// Eugenio, 2026-11-12: «permite en el garaje ver, agregar los otros modelos de vehículos. Por ejemplo, poder comparar el
// cuadriciclo con el triciclo en el garaje». And 2026-11-13: «quiero que todos los diseños estén… desplegados en el
// garaje, en la primera fila… cuando se pinche uno de ellos… aparezcan los sliders para modificar su carrocería…».
//
// Every saved design (the list the logo menu shows, from /api/aeromovil/disenos) stands in the garage's first row,
// in an order kept per browser (a copy goes right after its original). The one being edited is the viewer's own car,
// at the origin; every other one is built with the viewer's own builders (`construirDisenoGaraje`) once per saved
// version, one at a time after the page has drawn, and from then on copied (the copy shares the geometry). A design
// can be hidden from the 3D (per browser); the one being edited never is. The reference cars stand in a second row,
// behind (`garaje/filas.ts` places both rows).
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { construirDisenoGaraje } from './Visor3D';
import { deDiseno, guardarClave, leerClaves, type Diseno } from './Disenos';
import { ajustarCarenado, areas, calcular, crearModelo, type Modelo, type Parametros, type Resultados } from './geometria';
import { camposTriciclo, nombreTriciclo } from './geometriaTriciclo';
import { cuerpoAeromovil, cuerpoTriciclo, peticionDe } from './tunel/nuestro';
import { pedirTunel, resultadoEnCache } from './tunel/cliente';
import type { Resolucion } from './tunel/malla';
import { olvidarVehiculo, registrarVehiculo } from './garaje/registro';
import { vehiculoGaraje } from './garaje';
import type { VehiculoGaraje } from './garaje/tipos';
import { colocarFilas, type CocheFila, type Plaza } from './garaje/filas';

const CLAVE_ORDEN = 'aeromovil_garaje_orden_v1';
const CLAVE_OCULTOS = 'aeromovil_garaje_ocultos_v1';
const PREFIJO = 'diseno-';
export const esDisenoGaraje = (id: string) => id.startsWith(PREFIJO);
export const idGaraje = (id: number) => `${PREFIJO}${id}`;
/** The slot of the design being edited: the viewer's own car (the same id the labels and the tunnel use). */
export const ID_ACTIVO = 'aeromovil';

const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

function leerIds(clave: string): number[] {
  try { const g = JSON.parse(localStorage.getItem(clave) || '[]'); return Array.isArray(g) ? g.filter(Number.isInteger) : []; } catch { return []; }
}
const guardarIds = (clave: string, ids: number[]) => { try { localStorage.setItem(clave, JSON.stringify(ids)); } catch { /* without storage it is forgotten on reload */ } };

/** The family's name, as the editor calls it (a Triciclo with two rear wheels is the «Cuadriciclo Bala clásico»). */
export function familia(P: Parametros, m: Modelo): string {
  return m.tipo === 'a1' ? 'Aeromóvil 1' : m.tipo === 'bala' ? 'Cuadriciclo Bala en rombo' : m.tipo === 'triciclo' ? nombreTriciclo(camposTriciclo(P)) : 'Aeromóvil Gota';
}

interface Info { d: Diseno; modelo: Modelo; res: Resultados; familia: string; def: VehiculoGaraje & { preparar: () => void; listo: () => boolean } }

/**
 * A garage car for a saved design. Nothing is built until `preparar` (the hook calls it one design at a time, after the
 * page has drawn) or `construir`; then the design is built once into a template, and every later call hands out a
 * copy (the viewer rebuilds a car when it comes back into view, and a Triciclo takes ~1 s to build). The copy shares
 * geometries and materials with the template: the viewer disposes the geometries when it takes the car away, and
 * three.js uploads them again on the next draw.
 */
function vehiculoDe(d: Diseno, modelo: Modelo, nombreFamilia: string): Info['def'] {
  let plantilla: THREE.Group | null = null;
  const def: Info['def'] = {
    id: idGaraje(d.id), nombre: d.nombre,
    largo: modelo.Lf, ancho: modelo.P.W, alto: modelo.P.H, batalla: modelo.P.B, morroCola: [modelo.xn, modelo.xt],
    fuente: `Diseño guardado en el editor (${nombreFamilia})`,
    listo: () => !!plantilla,
    preparar: () => {
      if (plantilla) return;
      const t0 = performance.now();
      const { grupo, pivotes } = construirDisenoGaraje(modelo);
      plantilla = grupo; def.pivotes = pivotes;
      try { performance.measure(`garaje-diseno:${modelo.tipo}`, { start: t0, end: performance.now() }); } catch { /* old browsers */ }
    },
    construir: () => {
      def.preparar();
      // (Object3D.clone copies userData through JSON: the builders' userData is left out of the copy)
      const datos = new Map<THREE.Object3D, Record<string, unknown>>();
      plantilla!.traverse(o => { datos.set(o, o.userData); o.userData = {}; });
      const copia = plantilla!.clone(true);
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

/** The order of the first row: the order kept in this browser, then the rest in the order they were created. */
function ordenar(lista: Diseno[], orden: number[]): Diseno[] {
  const pos = new Map(orden.map((id, k) => [id, k]));
  return [...lista].sort((a, b) => (pos.get(a.id) ?? Infinity) - (pos.get(b.id) ?? Infinity) || a.id - b.id);
}

async function llamar(url: string, metodo: string, cuerpo: unknown) {
  const r = await fetch(url, { method: metodo, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j?.error || 'No se ha podido completar.');
  return j;
}

export function useDisenosGaraje({ activo, referencias, resolucion, conCd, huecoFila2 }: {
  /** The design being edited: its saved id (null if it is not saved), its name, nose and tail x and width (m). */
  activo: { id: number | null; nombre: string; morro: number; cola: number; ancho: number };
  /** The reference cars on show, in their catalogue order: the second row. */
  referencias: string[];
  resolucion: Resolucion;
  /** «Cd y consumo» or the tunnel is on: only then are the designs' Cd asked from the tunnel (it is work for the worker). */
  conCd: boolean;
  /** Gap between reference cars (m): wider with the tunnel on, for their wakes. */
  huecoFila2?: number;
}) {
  const [crudo, setCrudo] = useState<Diseno[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orden, setOrden] = useState<number[]>(() => leerIds(CLAVE_ORDEN));
  const [ocultos, setOcultos] = useState<number[]>(() => leerIds(CLAVE_OCULTOS));
  const [listos, setListos] = useState<Set<string>>(() => new Set());
  const [, setVersion] = useState(0);
  useEffect(() => guardarIds(CLAVE_ORDEN, orden), [orden]);
  useEffect(() => guardarIds(CLAVE_OCULTOS, ocultos), [ocultos]);
  const cargar = () => {
    setError(null);
    fetch('/api/aeromovil/disenos', { credentials: 'include' })
      .then(async r => { if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || 'No se han podido leer los diseños.'); return r.json(); })
      .then((l: Diseno[]) => setCrudo(Array.isArray(l) ? l : []))
      .catch(e => setError(e?.message || 'No se han podido leer los diseños.'));
  };
  useEffect(cargar, []);
  const lista = useMemo(() => (crudo ? ordenar(crudo, orden) : null), [crudo, orden]);

  // Each design's model and figures, worked out once per saved version (`updated_at`).
  const infos = useRef(new Map<string, Info>());
  const infoDe = (d: Diseno): Info | null => {
    const clave = `${d.id}@${d.updated_at}`;
    let i = infos.current.get(clave);
    if (!i) {
      try {
        const P = deDiseno(d.parametros || {}), modelo = crearModelo(ajustarCarenado(P)), res = calcular(modelo, areas(modelo)), fam = familia(P, modelo);
        i = { d, modelo, res, familia: fam, def: vehiculoDe(d, modelo, fam) };
      } catch (e) { console.error(`[garaje] el diseño «${d.nombre}» no se ha podido calcular:`, e); return null; }
      // an older version of the same design is not coming back: its template goes with it
      for (const k of [...infos.current.keys()]) if (k.startsWith(`${d.id}@`)) infos.current.delete(k);
      infos.current.set(clave, i);
    }
    return i;
  };

  // The first row: every design on show, the one being edited in its own place (first, if it is not saved).
  const { fila, enGaraje } = useMemo(() => {
    const fila: (CocheFila & { info?: Info })[] = [];
    const enGaraje: Info[] = [];
    const propio: CocheFila = { id: ID_ACTIVO, morro: activo.morro, cola: activo.cola, ancho: activo.ancho };
    if (activo.id == null || !lista?.some(d => d.id === activo.id)) fila.push(propio);
    for (const d of lista ?? []) {
      if (d.id === activo.id) { fila.push(propio); continue; }
      if (ocultos.includes(d.id)) continue;
      const i = infoDe(d); if (!i) continue;
      fila.push({ id: i.def.id, morro: i.modelo.xn, cola: i.modelo.xt, ancho: i.modelo.P.W, info: i });
      enGaraje.push(i);
    }
    return { fila, enGaraje };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista, ocultos, activo.id, activo.morro, activo.cola, activo.ancho]);

  // Build the designs one at a time, the nearest to the one being edited first, each in its own task so the page
  // draws in between (a Triciclo blocks for about a second). A design enters the viewer once it is built.
  useEffect(() => {
    const k0 = fila.findIndex(c => c.id === ID_ACTIVO);
    const pendientes = fila.map((c, k) => ({ c, k })).filter(({ c }) => c.info && !listos.has(`${c.info.d.id}@${c.info.d.updated_at}`))
      .sort((a, b) => Math.abs(a.k - k0) - Math.abs(b.k - k0));
    const sig = pendientes[0]?.c.info; if (!sig) return;
    const t = setTimeout(() => {
      try { sig.def.preparar(); } catch (e) { console.error(`[garaje] no se pudo construir «${sig.d.nombre}»:`, e); }
      setListos(s => new Set(s).add(`${sig.d.id}@${sig.d.updated_at}`));
    }, 30);
    return () => clearTimeout(t);
  }, [fila, listos]);

  // registered while on show (the viewer finds them by id); the rest forgotten
  const visibles = useMemo(() => enGaraje.filter(i => listos.has(`${i.d.id}@${i.d.updated_at}`) || i.def.listo()), [enGaraje, listos]);
  for (const i of visibles) registrarVehiculo(i.def);
  useEffect(() => {
    const dentro = new Set(visibles.map(i => i.def.id));
    for (const i of infos.current.values()) if (!dentro.has(i.def.id)) olvidarVehiculo(i.def.id);
  }, [visibles]);

  // Where everything goes: the first row, and the reference cars behind it.
  const plazas = useMemo<Map<string, Plaza>>(() => {
    const fila2: CocheFila[] = referencias.flatMap(id => {
      const def = vehiculoGaraje(id); if (!def) return [];
      const xs = def.envolvente?.map(e => e[0]);
      return [{ id, morro: xs?.length ? Math.max(...xs) : 0.9, cola: xs?.length ? Math.min(...xs) : 0.9 - def.largo, ancho: def.ancho }];
    });
    return colocarFilas(fila, ID_ACTIVO, fila2, { huecoFila2 });
  }, [fila, referencias, huecoFila2]);

  // The Cd of the designs whose Cd only the tunnel gives, in the background, after the editor's own requests.
  const peticiones = useMemo(() => visibles.map(i => ({ i, p: peticionCd(i, resolucion) })), [visibles, resolucion]);
  useEffect(() => {
    if (!conCd) return;
    let vivo = true;
    for (const { p } of peticiones) if (p && !resultadoEnCache(p)) pedirTunel(p, 8).then(() => { if (vivo) setVersion(v => v + 1); });
    return () => { vivo = false; };
  }, [peticiones, conCd]);

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
    // (2026-11-13, «también pon el peso, y el área frontal»: its empty mass and the frontal area its Cd is referred to,
    // the tunnel's for the Triciclo family and the Cuadriciclo en rombo, the editor's for the others)
    const area = p ? p.area : res.A;
    carteles[i.def.id] = `${i.d.nombre}\n${cd.replace(/ \(.*\)$/, '')}\n${res.mVeh > 0 ? `${Math.round(res.mVeh)} kg en vacío · ` : ''}${fmt(area)} m²`;
  }

  /** What the viewer gets: the designs that are built, with their place and their version (a new one is rebuilt). */
  const visor = useMemo(() => visibles.flatMap(i => {
    const p = plazas.get(i.def.id); return p ? [{ id: i.def.id, x: p.x, z: p.z, giro: 0, v: i.d.updated_at }] : [];
  }), [visibles, plazas]);
  /** A short name over every car when no other label is on (2026-11-13: «label each with its name»). */
  const nombres = useMemo(() => {
    const o: Record<string, string> = { [ID_ACTIVO]: activo.nombre };
    for (const i of visibles) o[i.def.id] = i.d.nombre;
    for (const id of referencias) { const def = vehiculoGaraje(id); if (def) o[id] = def.nombre; }
    return o;
  }, [visibles, referencias, activo.nombre]);

  // ── changes to the list ────────────────────────────────────────────────
  /** A design as the server returned it (saved, or new): replaces its old version, or goes in right after `junto`. */
  const actualizar = (d: Diseno, junto?: number | null) => {
    setCrudo(l => {
      if (!l) return l;
      if (l.some(x => x.id === d.id)) return l.map(x => (x.id === d.id ? d : x));
      return [...l, d];
    });
    setOrden(o => {
      if (o.includes(d.id)) return o;
      // the order as it is on screen, with the new one after `junto` (or at the end)
      const base = lista ? lista.map(x => x.id).filter(id => id !== d.id) : o;
      const k = junto != null ? base.indexOf(junto) : -1;
      return k >= 0 ? [...base.slice(0, k + 1), d.id, ...base.slice(k + 1)] : [...base, d.id];
    });
  };
  /** The list the logo menu just read: the garage follows it (a design removed there leaves the garage). */
  const ponerLista = (l: Diseno[]) => setCrudo(l);
  const alternarOculto = (id: number) => setOcultos(o => (o.includes(id) ? o.filter(x => x !== id) : [...o, id]));

  /** «Guardar como nuevo»: a new design with these parameters, right after `junto`. The edit key stays in this browser. */
  const copiar = async (nombre: string, parametros: Partial<Parametros>, junto: number | null): Promise<Diseno> => {
    let autor = ''; try { autor = localStorage.getItem('aeromovil.autor') || ''; } catch { /* nada */ }
    const j = await llamar('/api/aeromovil/disenos', 'POST', { nombre, parametros, autor });
    if (!j?.diseno) throw new Error('El servidor no ha devuelto el diseño nuevo.');
    if (j.clave) guardarClave(j.diseno.id, j.clave);
    actualizar(j.diseno, junto);
    return j.diseno;
  };
  /** Saves these parameters over a design (the owner's «Guardar cambios»), and the garage takes the new version. */
  const guardar = async (id: number, parametros: Partial<Parametros>): Promise<Diseno> => {
    const d = await llamar(`/api/aeromovil/disenos/${id}`, 'PUT', { parametros, clave: leerClaves()[id] });
    actualizar(d);
    return d;
  };
  /** «Eliminar»: the server archives it (it is not deleted); it leaves the list and the garage. */
  const archivar = async (id: number) => {
    await llamar(`/api/aeromovil/disenos/${id}`, 'DELETE', { clave: leerClaves()[id] });
    setCrudo(l => (l ? l.filter(x => x.id !== id) : l));
    setOcultos(o => o.filter(x => x !== id));
  };

  return { lista, error, cargar, visor, plazas, fichas, carteles, nombres, ocultos, alternarOculto, actualizar, ponerLista, copiar, guardar, archivar, construidos: visibles.length, enFila: enGaraje.length };
}

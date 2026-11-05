// ============================================================================
// ARQUITECTURA · THE 3D SCENE (2026-11-05)
// ============================================================================
// Renders the `Mundo` computed in geometria.ts. Four ideas keep a 30 km city
// down to a few dozen draw calls:
//
// 1. GROUND = PAINT. Every flat surface (grass, petals, lanes, water…) is merged
//    into one mesh per layer and drawn first, without depth test, in a fixed
//    order (`ORDEN`). Like paint on a plan: later layers cover earlier ones, so
//    there is no z-fighting at any zoom, from 20 km to 2 m.
// 2. Buildings, trees, panels and vehicles are INSTANCED (one mesh per shape).
// 3. Trees are only generated inside the detail scope (slider "Detalle").
// 4. Labels are sprites that only show while their on-screen size is readable.
//
// Logarithmic depth buffer: the camera goes from 120 km away to a few metres.

import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, events as eventosR3F, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { Mundo, Edificio } from './geometria';
import { SUELO, SISTEMA, EDIFICIO, COPAS, CIELO } from './paleta';
import { prototipo, type Prototipo } from './prototipos';
import { textura, TAM } from './texturas';

export type Modo = 'perspectiva' | 'cenital' | 'frontal';

// Its own chunk: downloaded the first time someone presses "Animar", never before.
const Animacion = lazy(() => import('./Animacion'));
export interface Objetivo { cx: number; cy: number; radio: number; nonce: number }

const ORDEN = ['campo', 'cesped', 'agricultura', 'parque', 'produccion', 'suelo', 'camino', 'huerto', 'gota', 'bosque',
  'bancalA', 'bancalB', 'bancalC', 'bancalD', 'senda', 'plaza', 'agua', 'vertipuerto', 'calzada', 'bici', 'peatonal', 'isleta', 'via', 'marca'];

function colorCapa(capa: string): string {
  if (capa.startsWith('enlace-')) return SISTEMA[capa.slice(7)]?.color ?? '#ffffff';
  return SUELO[capa] ?? '#ff00ff';
}

// ---------------------------------------------------------------- ground
/** Road markings drawn on top of the asphalt (render only; the DXF has its own EJES layer). */
function marcas(m: Mundo, push: (capa: string) => number[], tri: (a: number[], ...p: number[]) => void) {
  const a = push('marca');
  const raya = 3, hueco = 6, w = 0.15;
  // dashed centre line + solid edge lines along every ring of road
  for (const r of m.anillos) {
    if (r.capa !== 'calzada') continue;
    const rm = (r.r0 + r.r1) / 2;
    const L = (r.a1 - r.a0) * rm;
    const n = Math.floor(L / (raya + hueco));
    for (let i = 0; i < n; i++) {
      const t0 = r.a0 + ((i * (raya + hueco)) / rm), t1 = t0 + raya / rm;
      arco(a, tri, r.cx, r.cy, rm - w / 2, rm + w / 2, t0, t1, 1);
    }
    if (r.detalle) {
      const segs = Math.max(8, Math.min(720, Math.ceil(L / 4)));
      arco(a, tri, r.cx, r.cy, r.r0 + 0.25, r.r0 + 0.37, r.a0, r.a1, segs);
      arco(a, tri, r.cx, r.cy, r.r1 - 0.37, r.r1 - 0.25, r.a0, r.a1, segs);
    }
  }
  // straight roads (corridors and spokes): the same dashes along their axis
  for (const s of m.superficies) {
    if (s.capa !== 'calzada' || s.pts.length !== 8) continue;
    const q = s.pts;
    const ax = (q[0] + q[6]) / 2, ay = (q[1] + q[7]) / 2, bx = (q[2] + q[4]) / 2, by = (q[3] + q[5]) / 2;
    const L = Math.hypot(bx - ax, by - ay); if (L < 1) continue;
    const ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy * w / 2, ny = ux * w / 2;
    for (let d = 0; d + raya < L; d += raya + hueco) {
      const x0 = ax + ux * d, y0 = ay + uy * d, x1 = x0 + ux * raya, y1 = y0 + uy * raya;
      tri(a, x0 - nx, y0 - ny, x1 - nx, y1 - ny, x1 + nx, y1 + ny); tri(a, x0 - nx, y0 - ny, x1 + nx, y1 + ny, x0 + nx, y0 + ny);
    }
  }
}
function arco(a: number[], tri: (a: number[], ...p: number[]) => void, cx: number, cy: number, r0: number, r1: number, t0: number, t1: number, n: number) {
  for (let i = 0; i < n; i++) {
    const u0 = t0 + (t1 - t0) * i / n, u1 = t0 + (t1 - t0) * (i + 1) / n;
    const c0 = Math.cos(u0), s0 = Math.sin(u0), c1 = Math.cos(u1), s1 = Math.sin(u1);
    tri(a, cx + r0 * c0, cy + r0 * s0, cx + r1 * c0, cy + r1 * s0, cx + r1 * c1, cy + r1 * s1);
    tri(a, cx + r0 * c0, cy + r0 * s0, cx + r1 * c1, cy + r1 * s1, cx + r0 * c1, cy + r0 * s1);
  }
}

function construirSuelos(m: Mundo) {
  const porCapa = new Map<string, number[]>();
  const push = (capa: string) => { let a = porCapa.get(capa); if (!a) { a = []; porCapa.set(capa, a); } return a; };
  // positions stored as plan x,y pairs; turned into 3D (x, 0, -y) + world-space UVs below
  const tri = (a: number[], x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => { a.push(x1, y1, x2, y2, x3, y3); };
  for (const s of m.superficies) {
    const a = push(s.capa), q = s.pts;
    if (q.length === 8) { tri(a, q[0], q[1], q[2], q[3], q[4], q[5]); tri(a, q[0], q[1], q[4], q[5], q[6], q[7]); continue; }
    const contorno: THREE.Vector2[] = [];
    for (let i = 0; i < q.length; i += 2) contorno.push(new THREE.Vector2(q[i], q[i + 1]));
    const caras = THREE.ShapeUtils.triangulateShape(contorno, []);
    for (const [i, j, k] of caras) tri(a, contorno[i].x, contorno[i].y, contorno[j].x, contorno[j].y, contorno[k].x, contorno[k].y);
  }
  for (const r of m.anillos) {
    const len = (r.a1 - r.a0) * r.r1;
    const n = Math.max(6, Math.min(r.detalle ? 720 : 160, Math.ceil(len / (r.detalle ? 3 : 30))));
    arco(push(r.capa), tri as any, r.cx, r.cy, r.r0, r.r1, r.a0, r.a1, n);
  }
  for (const d of m.discos) {
    const a = push(d.capa);
    const n = Math.max(12, Math.min(160, Math.ceil(2 * Math.PI * d.r / 6)));
    for (let i = 0; i < n; i++) {
      const t0 = 2 * Math.PI * i / n, t1 = 2 * Math.PI * (i + 1) / n;
      tri(a, d.cx, d.cy, d.cx + d.r * Math.cos(t0), d.cy + d.r * Math.sin(t0), d.cx + d.r * Math.cos(t1), d.cy + d.r * Math.sin(t1));
    }
  }
  marcas(m, push, tri as any);
  const capas = [...porCapa.keys()].sort((x, y) => {
    const ix = x.startsWith('enlace-') ? 999 : ORDEN.indexOf(x), iy = y.startsWith('enlace-') ? 999 : ORDEN.indexOf(y);
    return ix - iy;
  });
  return capas.map((capa, i) => {
    const xy = porCapa.get(capa)!;
    const nv = xy.length / 2;
    const pos = new Float32Array(nv * 3);
    const tex = textura(capa);
    const uv = tex ? new Float32Array(nv * 2) : null;
    const k = 1 / (TAM[capa] ?? 10);
    for (let v = 0; v < nv; v++) {
      const x = xy[v * 2], y = xy[v * 2 + 1];
      pos[v * 3] = x; pos[v * 3 + 2] = -y;
      if (uv) { uv[v * 2] = x * k; uv[v * 2 + 1] = y * k; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const mat = tex
      ? new THREE.MeshBasicMaterial({ map: tex, depthTest: false, depthWrite: false, side: THREE.DoubleSide })
      : new THREE.MeshBasicMaterial({ color: colorCapa(capa), depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    return { capa, g, mat, orden: -1000 + i };
  });
}

function Suelos({ mundo }: { mundo: Mundo }) {
  const capas = useMemo(() => construirSuelos(mundo), [mundo]);
  useEffect(() => () => capas.forEach(c => { c.g.dispose(); c.mat.dispose(); }), [capas]);
  return <>{capas.map(c => <mesh key={c.capa} geometry={c.g} material={c.mat} renderOrder={c.orden} frustumCulled={false} />)}</>;
}

// ---------------------------------------------------------------- instancing helper
interface Inst { x: number; y: number; z: number; rx?: number; ry: number; sx: number; sy: number; sz: number; color: string; ref?: number }
/** Draws one prototype many times: one geometry, one GPU call, N copies. */
function Instancias({ geo, items, mat, onPick }: { geo: THREE.BufferGeometry; items: Inst[]; mat: THREE.Material; onPick?: (ref: number) => void }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const im = ref.current; if (!im) return;
    const o = new THREE.Object3D(), c = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(it.x, it.z, it.y);
      o.rotation.set(it.rx ?? 0, it.ry, 0, 'YXZ');
      o.scale.set(it.sx, it.sy, it.sz);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
      im.setColorAt(i, c.set(it.color));
    });
    im.count = items.length;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
  }, [items]);
  if (!items.length) return null;
  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[geo, mat, items.length]}
      onClick={onPick ? (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.instanceId != null) onPick(items[e.instanceId].ref ?? -1); } : undefined}
    />
  );
}

// One shared material for every prototype: the colours are in the vertices.
let MATERIAL: THREE.MeshStandardMaterial | null = null;
const material = () => MATERIAL ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.02 });

const RESALTE = '#ffd54a';
function colorEdificio(e: Edificio) {
  if (e.color in SISTEMA) return SISTEMA[e.color].color;
  return EDIFICIO[e.color] ?? '#cccccc';
}

function Edificios({ mundo, onPick, seleccion }: { mundo: Mundo; onPick: (id: number) => void; seleccion: number | null }) {
  const grupos = useMemo(() => {
    const g: Record<Prototipo, Inst[]> = {} as any;
    const add = (k: Prototipo, it: Inst) => (g[k] ??= []).push(it);
    for (const e of mundo.edificios) {
      const sel = e.id === seleccion;
      const base = { x: e.x, y: -e.y, ry: e.rot, ref: e.id };
      if (e.tipo === 'nido') {
        const hp = e.alto / e.plantas;
        for (let k = 0; k < e.plantas; k++) add('nidoPlanta', { ...base, z: k * hp, sx: e.ancho, sy: hp, sz: e.ancho, color: sel ? RESALTE : k === 1 ? '#f1e3cf' : k === 2 ? '#f7eee2' : EDIFICIO.muroNido });
        add('nidoTecho', { ...base, z: e.alto, sx: e.ancho, sy: e.ancho, sz: e.ancho, color: sel ? RESALTE : '#ffffff' });
      } else if (e.forma === 'cilindro') {
        add('socialMuro', { ...base, z: 0, sx: e.ancho, sy: e.alto, sz: e.ancho, color: sel ? RESALTE : EDIFICIO.muroSocial });
        add('socialTecho', { ...base, z: e.alto, sx: e.ancho, sy: e.ancho, sz: e.ancho, color: sel ? RESALTE : '#ffffff' });
      } else if (e.tipo === 'escaparate') {
        add('tienda', { ...base, z: 0, sx: e.ancho, sy: e.alto, sz: e.fondo, color: sel ? RESALTE : '#f6efe4' });
      } else if (e.tipo === 'fabrica') {
        add('nave', { ...base, z: 0, sx: e.ancho, sy: e.alto, sz: e.fondo, color: sel ? RESALTE : '#d9dde1' });
      } else {
        const hp = e.alto / e.plantas, col = sel ? RESALTE : colorEdificio(e);
        for (let k = 0; k < e.plantas; k++) add('anexoPlanta', { ...base, z: k * hp, sx: e.ancho, sy: hp, sz: e.fondo, color: col });
        add('anexoTecho', { ...base, z: e.alto, sx: e.ancho, sy: 1, sz: e.fondo, color: sel ? RESALTE : '#' + new THREE.Color('#ffffff').lerp(new THREE.Color(col), 0.65).getHexString() });
      }
    }
    return g;
  }, [mundo, seleccion]);
  return <>{(Object.keys(grupos) as Prototipo[]).map(k => <Instancias key={k} geo={prototipo(k)} items={grupos[k]} mat={material()} onPick={onPick} />)}</>;
}

function Arboles({ mundo }: { mundo: Mundo }) {
  // Full model (trunk + two crowns) inside the focused community, a light one elsewhere.
  const { cerca, lejos } = useMemo(() => {
    const a = mundo.arboles, cerca: Inst[] = [], lejos: Inst[] = [];
    const foco = `p${mundo.foco.p}/c${mundo.foco.c}`;
    for (let i = 0, k = 0; i < a.length; i += 5, k++) {
      const r = a[i + 2], h = Math.max(a[i + 3], r * 2.2);
      const amb = mundo.arbolesAmbito[k];
      const it = { x: a[i], y: -a[i + 1], z: 0, ry: i * 0.37, sx: r, sy: h, sz: r, color: COPAS[(a[i + 4] | 0) % COPAS.length] };
      (amb === foco || amb.startsWith(foco + '/') ? cerca : lejos).push(it);
    }
    return { cerca, lejos };
  }, [mundo]);
  return (
    <>
      <Instancias geo={prototipo('arbolDetalle')} items={cerca} mat={material()} />
      <Instancias geo={prototipo('arbolSimple')} items={lejos} mat={material()} />
    </>
  );
}

function Paneles({ mundo }: { mundo: Mundo }) {
  const items = useMemo(() => mundo.paneles.map(p => ({ x: p.x, y: -p.y, z: 0, ry: p.rot, sx: p.ancho, sy: 1, sz: p.fondo, color: '#ffffff' })), [mundo]);
  return <Instancias geo={prototipo('mesaSolar')} items={items} mat={material()} />;
}

const TINTES_COCHE = ['#f4f4f4', '#c9d3dc', '#5c86b0', '#b84a3e', '#2f3b45', '#e0c068'];
function Vehiculos({ mundo }: { mundo: Mundo }) {
  const por = useMemo(() => {
    const t: Record<string, Inst[]> = { coche: [], bus: [], bici: [], tren: [], aeronave: [] };
    mundo.vehiculos.forEach((v, i) => {
      const color = v.tipo === 'coche' ? TINTES_COCHE[i % TINTES_COCHE.length] : v.tipo === 'bus' ? '#9cc3e6' : v.tipo === 'bici' ? ['#2e7d32', '#1565c0', '#c62828', '#f9a825'][i % 4] : '#ffffff';
      t[v.tipo].push({ x: v.x, y: -v.y, z: 0, ry: v.rot, sx: 1, sy: 1, sz: 1, color });
    });
    return t;
  }, [mundo]);
  return <>{Object.entries(por).map(([k, items]) => <Instancias key={k} geo={prototipo(k as Prototipo)} items={items} mat={material()} />)}</>;
}

/** Street lamps every ~32 m along the pedestrian rings drawn in detail. */
function Farolas({ mundo }: { mundo: Mundo }) {
  const items = useMemo(() => {
    const out: Inst[] = [];
    for (const r of mundo.anillos) {
      if (r.capa !== 'peatonal' || !r.detalle || r.r1 > 3000) continue;
      const rm = r.r1 - 0.4, n = Math.floor(((r.a1 - r.a0) * rm) / 32);
      for (let i = 0; i < n; i++) {
        const t = r.a0 + (i + 0.5) * (r.a1 - r.a0) / n;
        out.push({ x: r.cx + rm * Math.cos(t), y: -(r.cy + rm * Math.sin(t)), z: 0, ry: t + Math.PI, sx: 1, sy: 1, sz: 1, color: '#ffffff' });
      }
    }
    return out;
  }, [mundo]);
  return <Instancias geo={prototipo('farola')} items={items} mat={material()} />;
}

// ---------------------------------------------------------------- labels and dimension lines
function texturaTexto(texto: string, color: string) {
  const fs = 64, pad = 18;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  ctx.font = `700 ${fs}px system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(texto).width) + pad * 2;
  c.width = w; c.height = fs + pad * 2;
  ctx.font = `700 ${fs}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  const r = 18;
  ctx.beginPath(); ctx.roundRect(0, 0, w, c.height, r); ctx.fill();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, pad, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { t, aspecto: w / c.height };
}

interface Rotulo { x: number; y: number; z: number; texto: string; tam: number; color: string }
function Rotulos({ items }: { items: Rotulo[] }) {
  const grupo = useRef<THREE.Group>(null);
  const sprites = useMemo(() => items.map(it => {
    const { t, aspecto } = texturaTexto(it.texto, it.color);
    const mat = new THREE.SpriteMaterial({ map: t, depthTest: false, depthWrite: false, transparent: true });
    const s = new THREE.Sprite(mat);
    s.position.set(it.x, it.z + it.tam * 0.6, -it.y);
    s.scale.set(it.tam * aspecto, it.tam, 1);
    s.renderOrder = 10;
    s.userData.tam = it.tam;
    return s;
  }), [items]);
  useEffect(() => {
    const g = grupo.current; if (!g) return;
    sprites.forEach(s => g.add(s));
    return () => sprites.forEach(s => { g.remove(s); (s.material as THREE.SpriteMaterial).map?.dispose(); s.material.dispose(); });
  }, [sprites]);
  const { size } = useThree();
  useFrame(({ camera }) => {
    const persp = (camera as THREE.PerspectiveCamera).isPerspectiveCamera;
    const alzado = !persp && camera.up.y > 0.5;
    const k = persp ? size.height / (2 * Math.tan(((camera as THREE.PerspectiveCamera).fov * Math.PI) / 360)) : (camera as THREE.OrthographicCamera).zoom;
    for (const s of sprites) {
      const px = persp ? (s.userData.tam * k) / Math.max(1, camera.position.distanceTo(s.position)) : s.userData.tam * k;
      s.visible = !alzado && px > 9 && px < 64;
    }
  });
  return <group ref={grupo} />;
}

function LineasCota({ mundo }: { mundo: Mundo }) {
  const g = useMemo(() => {
    const pos: number[] = [];
    for (const c of mundo.cotas) {
      pos.push(c.x1, 0.5, -c.y1, c.x2, 0.5, -c.y2);
      const dx = c.x2 - c.x1, dy = c.y2 - c.y1, L = Math.hypot(dx, dy) || 1;
      const t = L * 0.02, nx = -dy / L * t, ny = dx / L * t;
      for (const [x, y] of [[c.x1, c.y1], [c.x2, c.y2]]) pos.push(x - nx, 0.5, -(y - ny), x + nx, 0.5, -(y + ny));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return geo;
  }, [mundo]);
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: '#d4380d', depthTest: false }), []);
  return <lineSegments geometry={g} material={mat} renderOrder={5} frustumCulled={false} />;
}

// ---------------------------------------------------------------- cameras
function Director({ modo, objetivo, onEscala }: { modo: Modo; objetivo: Objetivo; onEscala: (mPorPx: number) => void }) {
  const { camera, controls, size } = useThree() as any;
  const anim = useRef<{ t0: number; desde: THREE.Vector3; hacia: THREE.Vector3; tDesde: THREE.Vector3; tHacia: THREE.Vector3 } | null>(null);
  const cuenta = useRef(0);
  useEffect(() => {
    if (!controls) return;
    const T = new THREE.Vector3(objetivo.cx, 0, -objetivo.cy);
    if (modo === 'perspectiva') {
      const d = objetivo.radio * 2.3;
      const hacia = T.clone().add(new THREE.Vector3(0, d * 0.72, d * 0.7));
      camera.up.set(0, 1, 0);
      anim.current = { t0: performance.now(), desde: camera.position.clone(), hacia, tDesde: controls.target.clone(), tHacia: T };
    } else if (modo === 'cenital') {
      anim.current = null;
      camera.up.set(0, 0, -1);
      camera.position.set(T.x, 100000, T.z + 0.001);
      controls.target.copy(T);
      camera.zoom = Math.min(size.width, size.height) / (2.3 * objetivo.radio);
      camera.updateProjectionMatrix();
      controls.update();
    } else {
      anim.current = null;
      camera.up.set(0, 1, 0);
      const h = Math.min(objetivo.radio * 0.15, 30);
      camera.position.set(T.x, h, T.z + 150000);
      controls.target.set(T.x, h, T.z);
      camera.zoom = size.width / (2.3 * objetivo.radio);
      camera.updateProjectionMatrix();
      controls.update();
    }
  }, [objetivo.nonce, modo, controls]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => {
    const a = anim.current;
    if (a && controls) {
      const k = Math.min(1, (performance.now() - a.t0) / 1100);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      // interpolate in log-distance so a 20 km → 20 m flight feels like a zoom, not a fall
      camera.position.lerpVectors(a.desde, a.hacia, e);
      controls.target.lerpVectors(a.tDesde, a.tHacia, e);
      controls.update();
      if (k >= 1) anim.current = null;
    }
    if (++cuenta.current % 8 === 0 || a) {
      if ((camera as THREE.OrthographicCamera).isOrthographicCamera) onEscala(1 / camera.zoom);
      else if (controls) onEscala((2 * camera.position.distanceTo(controls.target) * Math.tan((camera.fov * Math.PI) / 360)) / size.height);
    }
  });
  return null;
}

export interface Captura { png: () => string }

/** R3F's pointer events, but with the camera's world matrix refreshed before the ray is
 *  cast. Measured 2026-11-05: in the top and front views the camera's quaternion was
 *  right (straight down) but its matrixWorld still looked at the city centre from when
 *  the camera was created, so a click on the community picked the city's security annex. */
const eventosAlDia: typeof eventosR3F = (store) => {
  const base = eventosR3F(store);
  return {
    ...base,
    compute: (event, state, previous) => {
      state.camera.updateMatrixWorld();
      base.compute?.(event, state, previous);
    },
  };
};

export function Escena({ mundo, modo, objetivo, seleccion, onPick, onEscala, capturaRef, animar = false }: {
  mundo: Mundo; modo: Modo; objetivo: Objetivo; seleccion: number | null; animar?: boolean;
  onPick: (id: number) => void; onEscala: (m: number) => void; capturaRef: React.MutableRefObject<Captura | null>;
}) {
  const rotulos = useMemo<Rotulo[]>(() => [
    ...mundo.etiquetas.map(e => ({ x: e.x, y: e.y, z: e.alto, texto: e.texto, tam: e.tam, color: e.color ?? '#1f2937' })),
    ...mundo.cotas.map(c => ({ x: (c.x1 + c.x2) / 2, y: (c.y1 + c.y2) / 2, z: 1, texto: c.texto, tam: Math.hypot(c.x2 - c.x1, c.y2 - c.y1) * 0.035, color: '#d4380d' })),
  ], [mundo]);
  return (
    <Canvas
      gl={{ logarithmicDepthBuffer: true, antialias: true }}
      events={eventosAlDia}
      dpr={[1, 2]}
      onPointerMissed={() => onPick(-1)}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.NoToneMapping;
        scene.background = new THREE.Color(CIELO);
      }}
    >
      {modo === 'perspectiva'
        ? <PerspectiveCamera makeDefault fov={45} near={0.3} far={500000} position={[objetivo.cx, objetivo.radio * 1.6, -objetivo.cy + objetivo.radio * 1.6]} />
        : <OrthographicCamera makeDefault near={-1} far={400000} position={[objetivo.cx, 100000, -objetivo.cy]} />}
      <OrbitControls
        makeDefault
        enableRotate={modo === 'perspectiva'}
        screenSpacePanning
        minDistance={4}
        maxDistance={150000}
        maxPolarAngle={modo === 'perspectiva' ? Math.PI / 2 - 0.02 : Math.PI}
        zoomSpeed={1.3}
      />
      <Capturador capturaRef={capturaRef} />
      <Director modo={modo} objetivo={objetivo} onEscala={onEscala} />
      <hemisphereLight args={['#ffffff', '#6b8f5a', 1.25]} />
      <directionalLight position={[-3000, 6000, 2500]} intensity={1.6} />
      <Suelos mundo={mundo} />
      <Edificios mundo={mundo} onPick={onPick} seleccion={seleccion} />
      <Arboles mundo={mundo} />
      <Paneles mundo={mundo} />
      <Vehiculos mundo={mundo} />
      <Farolas mundo={mundo} />
      <LineasCota mundo={mundo} />
      <Rotulos items={rotulos} />
      {animar && <Suspense fallback={null}><Animacion mundo={mundo} /></Suspense>}
    </Canvas>
  );
}

/** Renders one frame on demand and reads it back (no preserveDrawingBuffer cost). */
function Capturador({ capturaRef }: { capturaRef: React.MutableRefObject<Captura | null> }) {
  const { camera, gl, scene } = useThree();
  useEffect(() => {
    capturaRef.current = { png: () => { gl.render(scene, camera); return gl.domElement.toDataURL('image/png'); } };
  }, [camera, gl, scene, capturaRef]);
  return null;
}

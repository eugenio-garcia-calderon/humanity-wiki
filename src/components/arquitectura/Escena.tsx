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

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { Mundo, Edificio } from './geometria';
import { SUELO, SISTEMA, EDIFICIO, COPAS, CIELO } from './paleta';

export type Modo = 'perspectiva' | 'cenital' | 'frontal';
export interface Objetivo { cx: number; cy: number; radio: number; nonce: number }

const ORDEN = ['campo', 'cesped', 'agricultura', 'parque', 'produccion', 'suelo', 'camino', 'huerto', 'gota', 'bosque',
  'bancalA', 'bancalB', 'bancalC', 'bancalD', 'senda', 'plaza', 'agua', 'vertipuerto', 'calzada', 'bici', 'peatonal', 'via', 'marca'];

function colorCapa(capa: string): string {
  if (capa.startsWith('enlace-')) return SISTEMA[capa.slice(7)]?.color ?? '#ffffff';
  return SUELO[capa] ?? '#ff00ff';
}

// ---------------------------------------------------------------- ground
function construirSuelos(m: Mundo) {
  const porCapa = new Map<string, number[]>();
  const push = (capa: string) => { let a = porCapa.get(capa); if (!a) { a = []; porCapa.set(capa, a); } return a; };
  const tri = (a: number[], x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    a.push(x1, 0, -y1, x2, 0, -y2, x3, 0, -y3);
  };
  for (const s of m.superficies) {
    const a = push(s.capa), q = s.pts;
    if (q.length === 8) { tri(a, q[0], q[1], q[2], q[3], q[4], q[5]); tri(a, q[0], q[1], q[4], q[5], q[6], q[7]); continue; }
    const contorno: THREE.Vector2[] = [];
    for (let i = 0; i < q.length; i += 2) contorno.push(new THREE.Vector2(q[i], q[i + 1]));
    const caras = THREE.ShapeUtils.triangulateShape(contorno, []);
    for (const [i, j, k] of caras) tri(a, contorno[i].x, contorno[i].y, contorno[j].x, contorno[j].y, contorno[k].x, contorno[k].y);
  }
  for (const r of m.anillos) {
    const a = push(r.capa);
    const len = (r.a1 - r.a0) * r.r1;
    const n = Math.max(6, Math.min(r.detalle ? 720 : 160, Math.ceil(len / (r.detalle ? 3 : 30))));
    for (let i = 0; i < n; i++) {
      const t0 = r.a0 + (r.a1 - r.a0) * i / n, t1 = r.a0 + (r.a1 - r.a0) * (i + 1) / n;
      const c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1);
      const ax = r.cx + r.r0 * c0, ay = r.cy + r.r0 * s0, bx = r.cx + r.r1 * c0, by = r.cy + r.r1 * s0;
      const cx = r.cx + r.r1 * c1, cy = r.cy + r.r1 * s1, dx = r.cx + r.r0 * c1, dy = r.cy + r.r0 * s1;
      tri(a, ax, ay, bx, by, cx, cy); tri(a, ax, ay, cx, cy, dx, dy);
    }
  }
  for (const d of m.discos) {
    const a = push(d.capa);
    const n = Math.max(12, Math.min(160, Math.ceil(2 * Math.PI * d.r / 6)));
    for (let i = 0; i < n; i++) {
      const t0 = 2 * Math.PI * i / n, t1 = 2 * Math.PI * (i + 1) / n;
      tri(a, d.cx, d.cy, d.cx + d.r * Math.cos(t0), d.cy + d.r * Math.sin(t0), d.cx + d.r * Math.cos(t1), d.cy + d.r * Math.sin(t1));
    }
  }
  const capas = [...porCapa.keys()].sort((x, y) => {
    const ix = x.startsWith('enlace-') ? 999 : ORDEN.indexOf(x), iy = y.startsWith('enlace-') ? 999 : ORDEN.indexOf(y);
    return ix - iy;
  });
  return capas.map((capa, i) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(porCapa.get(capa)!, 3));
    const mat = new THREE.MeshBasicMaterial({ color: colorCapa(capa), depthTest: false, depthWrite: false, side: THREE.DoubleSide });
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

const GEO = {
  caja: (() => { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); return g; })(),
  cilindro: (() => { const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 40); g.translate(0, 0.5, 0); return g; })(),
  hex: (() => { const g = new THREE.CylinderGeometry(1, 1, 1, 6); g.translate(0, 0.5, 0); return g; })(),
  techoHex: (() => { const g = new THREE.CylinderGeometry(1.1, 1.1, 1, 6); g.translate(0, 0.5, 0); return g; })(),
  cono: (() => { const g = new THREE.CylinderGeometry(0.17, 0.56, 1, 40); g.translate(0, 0.5, 0); return g; })(),
  copa: new THREE.IcosahedronGeometry(1, 0),
  panel: new THREE.BoxGeometry(1, 1, 1),
  coche: (() => { const g = new THREE.BoxGeometry(4.4, 1.5, 1.9); g.translate(0, 0.75, 0); return g; })(),
  bus: (() => { const g = new THREE.BoxGeometry(9, 3, 2.5); g.translate(0, 1.5, 0); return g; })(),
  bici: (() => { const g = new THREE.BoxGeometry(1.7, 1, 0.25); g.translate(0, 0.5, 0); return g; })(),
  tren: (() => { const g = new THREE.BoxGeometry(80, 4, 3.2); g.translate(0, 2, 0); return g; })(),
  aeronave: (() => {
    const partes = [new THREE.BoxGeometry(9, 1.6, 1.6), new THREE.BoxGeometry(1.8, 0.25, 12), new THREE.BoxGeometry(1, 0.2, 4)];
    partes[0].translate(0, 1.6, 0); partes[1].translate(0.5, 2.1, 0); partes[2].translate(-4, 2.2, 0);
    const pos: number[] = [], nor: number[] = [];
    partes.forEach(p => { const q = p.toNonIndexed(); pos.push(...(q.attributes.position.array as any)); nor.push(...(q.attributes.normal.array as any)); });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return g;
  })(),
};

function colorEdificio(e: Edificio) {
  if (e.color in SISTEMA) return SISTEMA[e.color].color;
  return EDIFICIO[e.color] ?? '#cccccc';
}

function Edificios({ mundo, onPick, seleccion }: { mundo: Mundo; onPick: (id: number) => void; seleccion: number | null }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.0 }), []);
  const vidrio = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.15, metalness: 0.1, emissive: new THREE.Color('#5ec8ff'), emissiveIntensity: 0.25 }), []);
  const grupos = useMemo(() => {
    const cajas: Inst[] = [], cil: Inst[] = [], hex: Inst[] = [], techosHex: Inst[] = [], conos: Inst[] = [], tragaluces: Inst[] = [];
    for (const e of mundo.edificios) {
      const sel = e.id === seleccion;
      const col = sel ? '#ffffff' : colorEdificio(e);
      const base = { x: e.x, y: -e.y, ry: e.rot, ref: e.id };
      if (e.forma === 'caja') cajas.push({ ...base, z: 0, sx: e.ancho, sy: e.alto, sz: e.fondo, color: col });
      else if (e.forma === 'cilindro') {
        cil.push({ ...base, z: 0, sx: e.ancho, sy: e.alto, sz: e.ancho, color: col });
        if (e.techo === 'cono') {
          const h = e.ancho * 0.22;
          conos.push({ ...base, z: e.alto, sx: e.ancho, sy: h, sz: e.ancho, color: sel ? '#ffffff' : EDIFICIO.teja });
          tragaluces.push({ ...base, z: e.alto + h - 0.05, sx: e.ancho * 0.34, sy: 0.25, sz: e.ancho * 0.34, color: EDIFICIO.tragaluz });
        }
      } else {
        const hp = e.alto / e.plantas;
        for (let k = 0; k < e.plantas; k++) {
          hex.push({ ...base, z: k * hp, sx: e.ancho, sy: hp - 0.25, sz: e.ancho, color: sel ? '#ffffff' : (k === 1 ? '#e7d3b8' : k === 2 ? '#f3e6d4' : EDIFICIO.muroNido) });
        }
        techosHex.push({ ...base, z: e.alto - 0.05, sx: e.ancho, sy: 0.45, sz: e.ancho, color: EDIFICIO.teja });
      }
    }
    return { cajas, cil, hex, techosHex, conos, tragaluces };
  }, [mundo, seleccion]);
  return (
    <>
      <Instancias geo={GEO.caja} items={grupos.cajas} mat={mat} onPick={onPick} />
      <Instancias geo={GEO.cilindro} items={grupos.cil} mat={mat} onPick={onPick} />
      <Instancias geo={GEO.hex} items={grupos.hex} mat={mat} onPick={onPick} />
      <Instancias geo={GEO.techoHex} items={grupos.techosHex} mat={mat} onPick={onPick} />
      <Instancias geo={GEO.cono} items={grupos.conos} mat={mat} onPick={onPick} />
      <Instancias geo={GEO.cilindro} items={grupos.tragaluces} mat={vidrio} />
    </>
  );
}

function Arboles({ mundo }: { mundo: Mundo }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), []);
  const items = useMemo(() => {
    const a = mundo.arboles, out: Inst[] = [];
    for (let i = 0; i < a.length; i += 5) {
      const r = a[i + 2], h = a[i + 3];
      out.push({ x: a[i], y: -a[i + 1], z: h * 0.55, ry: i * 0.37, sx: r, sy: Math.max(r, h * 0.42), sz: r, color: COPAS[(a[i + 4] | 0) % COPAS.length] });
    }
    return out;
  }, [mundo]);
  return <Instancias geo={GEO.copa} items={items} mat={mat} />;
}

function Paneles({ mundo }: { mundo: Mundo }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: EDIFICIO.panel, roughness: 0.3, metalness: 0.4 }), []);
  const items = useMemo(() => mundo.paneles.map(p => ({ x: p.x, y: -p.y, z: 1.3, rx: -0.44, ry: p.rot, sx: p.ancho, sy: 0.08, sz: p.fondo, color: EDIFICIO.panel })), [mundo]);
  return <Instancias geo={GEO.panel} items={items} mat={mat} />;
}

function Vehiculos({ mundo }: { mundo: Mundo }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.2 }), []);
  const por = useMemo(() => {
    const t: Record<string, Inst[]> = { coche: [], bus: [], bici: [], tren: [], aeronave: [] };
    for (const v of mundo.vehiculos) t[v.tipo].push({ x: v.x, y: -v.y, z: 0, ry: v.rot, sx: 1, sy: 1, sz: 1, color: EDIFICIO[v.tipo] });
    return t;
  }, [mundo]);
  return <>{Object.entries(por).map(([k, items]) => <Instancias key={k} geo={(GEO as any)[k]} items={items} mat={mat} />)}</>;
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

export function Escena({ mundo, modo, objetivo, seleccion, onPick, onEscala, capturaRef }: {
  mundo: Mundo; modo: Modo; objetivo: Objetivo; seleccion: number | null;
  onPick: (id: number) => void; onEscala: (m: number) => void; capturaRef: React.MutableRefObject<Captura | null>;
}) {
  const rotulos = useMemo<Rotulo[]>(() => [
    ...mundo.etiquetas.map(e => ({ x: e.x, y: e.y, z: e.alto, texto: e.texto, tam: e.tam, color: e.color ?? '#1f2937' })),
    ...mundo.cotas.map(c => ({ x: (c.x1 + c.x2) / 2, y: (c.y1 + c.y2) / 2, z: 1, texto: c.texto, tam: Math.hypot(c.x2 - c.x1, c.y2 - c.y1) * 0.035, color: '#d4380d' })),
  ], [mundo]);
  return (
    <Canvas
      gl={{ logarithmicDepthBuffer: true, antialias: true }}
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
      <hemisphereLight args={['#ffffff', '#6b8f5a', 1.1]} />
      <directionalLight position={[-3000, 6000, 2500]} intensity={1.6} />
      <Suelos mundo={mundo} />
      <Edificios mundo={mundo} onPick={onPick} seleccion={seleccion} />
      <Arboles mundo={mundo} />
      <Paneles mundo={mundo} />
      <Vehiculos mundo={mundo} />
      <LineasCota mundo={mundo} />
      <Rotulos items={rotulos} />
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

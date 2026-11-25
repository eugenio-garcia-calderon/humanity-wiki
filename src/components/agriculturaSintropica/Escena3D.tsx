// ============================================================================
// AGRICULTURA SINTRÓPICA · 3D VIEW OF THE PLOT, WITH THE SEASONS (2026-11-25)
// ============================================================================
// First version: one sphere per crown. Eugenio the same evening: «mejora el diseño
// de los árboles para que sean más realistas… una animación de las 4 estaciones,
// con flores, hojas caducas, luces del sol, vientos».
//
//  · Crowns are clusters of irregular lobes (up to 7 per plant, shaped by the
//    species' form: round, columnar, spreading, shrub, vine, palm), with branches
//    from the trunk top that show when a deciduous tree is bare.
//  · Each month every lobe takes its colour and size from `fenologia.ts`: bud
//    break, flowers (some lobes turn the flower's colour), autumn colour, leaf fall.
//  · The sun moves with the month and the hour (latitude 40° N): height, length
//    of the day, warm light when low; real shadows; an atmospheric sky.
//  · Wind sways crowns, trunks and branches in the vertex shader (a uniform, no
//    CPU work per tree) and carries petals in flowering time and leaves in autumn.
//
// Performance: three InstancedMeshes (lobes, trunks, branches) for the whole plot.
// Matrices and colours are rewritten only when the year, the month or the plants
// change, from `useFrame`, so the month can be animated without re-rendering React.
//
// Plan coordinates (x east, y north, metres) → three.js (x, 0, -y). Colours are
// material data (see paleta.ts).

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, Sky } from '@react-three/drei';
import * as THREE from 'three';
import type { Parcela, Parametros, Planta } from './modelo';
import { tamano } from './modelo';
import { rol } from './disenos';
import { COLOR } from './paleta';
import { FENOLOGIA, aspecto } from './fenologia';

export type Vista3D = 'perspectiva' | 'cenital' | 'lateral';
export interface ObjetivoCamara { vista: Vista3D; nonce: number }
export interface Ambiente {
  mes: number;          // 0–12, used when the year is not being animated
  animarAno: boolean;   // the months run by themselves (≈ 30 s per year)
  hora: number;         // 6–22, solar time
  animarDia: boolean;   // the hours run by themselves (≈ 16 s per day)
  viento: number;       // 0 calm · 0.45 breeze · 1 strong
  sombras: boolean;
}

interface Props {
  parcela: Parcela;
  convencional: Parcela | null;
  p: Parametros;
  t: number;
  resaltar: string | null;
  camara: ObjetivoCamara;
  ambiente: Ambiente;
  onElegir: (pl: Planta | null) => void;
  onReloj?: (mes: number, hora: number) => void;
}

type Reloj = React.MutableRefObject<{ mes: number; hora: number }>;
const SEPARACION = 14;
const hash = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------------------------------------------------------------- shapes
function forma(pl: Planta, h: number, c: number) {
  switch (pl.esp.forma) {
    case 'columnar': { const ch = h * 0.8; return { tronco: h - ch, cy: h - ch / 2, rx: c / 2, ry: ch / 2 }; }
    case 'extendida': { const ch = h * 0.5; return { tronco: h - ch, cy: h - ch / 2, rx: c / 2, ry: ch / 2 }; }
    case 'palmera': { const ch = Math.max(0.4, h * 0.18); return { tronco: h - ch * 0.4, cy: h - ch * 0.3, rx: c / 2, ry: ch / 2 }; }
    case 'cepa': return { tronco: h * 0.55, cy: h * 0.78, rx: c / 2, ry: h * 0.25 };
    case 'arbusto': case 'mata': case 'hierba': return { tronco: 0, cy: h / 2, rx: c / 2, ry: h / 2 };
    default: { const ch = Math.min(h * 0.65, c * 0.95); return { tronco: h - ch, cy: h - ch / 2, rx: c / 2, ry: ch / 2 }; }
  }
}

/** A lobe of a crown: offset (in crown radii), scale (in crown radii), yaw, tilt and a shade. */
interface Lobulo { o: [number, number, number]; s: [number, number, number]; giro: number; inclina: number; tono: number }
function lobulos(pl: Planta, semilla: number): Lobulo[] {
  const r = (k: number) => hash(semilla, k);
  const L = (o: Lobulo['o'], s: Lobulo['s'], giro = 0, inclina = 0, k = 0): Lobulo => ({ o, s, giro, inclina, tono: (r(k + 50) - 0.5) * 0.08 });
  switch (pl.esp.forma) {
    case 'columnar': return [-0.62, -0.22, 0.2, 0.58].map((y, i) => { const s = [0.72, 0.8, 0.7, 0.48][i]; return L([(r(i) - 0.5) * 0.2, y, (r(i + 9) - 0.5) * 0.2], [s, 0.42, s], r(i + 3) * 6, 0, i); });
    case 'extendida': return [L([0, 0.12, 0], [0.7, 0.62, 0.7]), ...[0, 1, 2, 3, 4].map(i => { const a = (i / 5) * Math.PI * 2 + r(i) * 0.7; return L([0.56 * Math.cos(a), -0.1 + r(i + 4) * 0.25, 0.56 * Math.sin(a)], [0.52, 0.48, 0.52], r(i + 7) * 6, 0, i + 1); })];
    case 'arbusto': case 'mata': return [0, 1, 2].map(i => { const a = (i / 3) * Math.PI * 2 + r(i) * 1.2; return L([0.34 * Math.cos(a), -0.05 + r(i + 5) * 0.15, 0.34 * Math.sin(a)], [0.66, 0.75, 0.66], r(i + 2) * 6, 0, i); });
    case 'hierba': return [0, 1].map(i => L([(r(i) - 0.5) * 0.5, 0, (r(i + 3) - 0.5) * 0.5], [0.7, 0.9, 0.7], r(i) * 6, 0, i));
    case 'cepa': return [-0.55, 0, 0.55].map((x, i) => L([x, (r(i) - 0.5) * 0.2, (r(i + 4) - 0.5) * 0.3], [0.55, 0.85, 0.6], r(i + 1) * 6, 0, i));
    case 'palmera': return [0, 1, 2, 3, 4, 5, 6].map(i => { const a = (i / 7) * Math.PI * 2 + r(i) * 0.4; return L([0.42 * Math.cos(a), 0, -0.42 * Math.sin(a)], [0.62, 0.12, 0.18], a, -0.45 - r(i + 2) * 0.3, i); });
    default: return [L([0, -0.05, 0], [0.76, 0.76, 0.76]), ...[0, 1, 2, 3].map(i => { const a = (i / 4) * Math.PI * 2 + r(i) * 0.9; return L([0.46 * Math.cos(a), -0.18 + r(i + 4) * 0.3, 0.46 * Math.sin(a)], [0.56 + r(i + 8) * 0.1, 0.52, 0.56], r(i + 2) * 6, 0, i + 1); }), L([(r(20) - 0.5) * 0.2, 0.48, (r(21) - 0.5) * 0.2], [0.5, 0.45, 0.5], 0, 0, 6)];
  }
}

/** Irregular low-poly blob: an icosphere with its vertices pushed in and out. */
function geometriaLobulo() {
  const g = new THREE.IcosahedronGeometry(1, 2), pos = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 0.84 + 0.22 * hash(Math.round(v.x * 50) + Math.round(v.y * 31), Math.round(v.z * 50));
    pos.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- wind in the vertex shader
interface Uniformes { uTiempo: { value: number }; uViento: { value: number } }
function conViento(m: THREE.MeshStandardMaterial, u: Uniformes, fuerza: number) {
  m.onBeforeCompile = shader => {
    shader.uniforms.uTiempo = u.uTiempo; shader.uniforms.uViento = u.uViento;
    shader.vertexShader = 'uniform float uTiempo;\nuniform float uViento;\n' + shader.vertexShader.replace(
      'mvPosition = modelViewMatrix * mvPosition;',
      `#ifdef USE_INSTANCING
        float hW = max(0.0, mvPosition.y);
        float fase = instanceMatrix[3].x * 0.13 + instanceMatrix[3].z * 0.09;
        float rafaga = 0.65 + 0.35 * sin(uTiempo * 0.35 + instanceMatrix[3].x * 0.02);
        float sw = uViento * rafaga * ${fuerza.toFixed(3)} * hW;
        mvPosition.x += sw * (0.75 + 0.6 * sin(uTiempo * 1.7 + fase) + 0.25 * sin(uTiempo * 3.6 + fase * 2.3));
        mvPosition.z += sw * 0.35 * sin(uTiempo * 1.2 + fase * 1.4);
      #endif
      mvPosition = modelViewMatrix * mvPosition;`);
  };
  m.customProgramCacheKey = () => `viento-${fuerza}`;
  return m;
}

// ---------------------------------------------------------------- sun at latitude 40° N
function sol(mes: number, hora: number) {
  const dia = mes * 30.42, decl = 23.44 * Math.sin((2 * Math.PI * (dia - 80)) / 365);
  const largo = 12 + 2.9 * Math.sin((2 * Math.PI * (dia - 80)) / 365);
  const maxEl = 50 + decl, salida = 12 - largo / 2;
  const f = (hora - salida) / largo;
  const el = f <= 0 || f >= 1 ? -6 : maxEl * Math.sin(Math.PI * f);
  const azMax = Math.PI / 2 + 0.55 * ((largo - 12) / 3);
  const az = ((hora - 12) / (largo / 2)) * azMax;           // 0 = south, + = west
  const er = (Math.max(el, -6) * Math.PI) / 180;
  const dir = new THREE.Vector3(-Math.sin(az) * Math.cos(er), Math.sin(er), Math.cos(az) * Math.cos(er)).normalize();
  return { dir, el };
}

const PALETA_CAMPO: [number, string][] = [[0, '#9fae6c'], [2.5, '#94b55a'], [4.5, '#a9b85a'], [6, '#cfbd7c'], [8, '#d8c48c'], [10, '#bdb27a'], [12, '#9fae6c']];
const tmpCampo = new THREE.Color();
function colorCampo(m: number, c: THREE.Color) {
  const x = ((m % 12) + 12) % 12;
  for (let i = 0; i < PALETA_CAMPO.length - 1; i++) {
    const [a, ca] = PALETA_CAMPO[i], [b, cb] = PALETA_CAMPO[i + 1];
    if (x >= a && x <= b) { c.set(ca).lerp(tmpCampo.set(cb), (x - a) / (b - a)); return; }
  }
}

// ---------------------------------------------------------------- plants
interface PropsPlantas {
  plantas: Planta[]; sintropico: boolean[]; p: Parametros; t: number; resaltar: string | null;
  reloj: Reloj; u: Uniformes; onElegir: (pl: Planta | null) => void; sombras: boolean;
}
function Plantas({ plantas, sintropico, p, t, resaltar, reloj, u, onElegir, sombras }: PropsPlantas) {
  const copas = useRef<THREE.InstancedMesh>(null), troncos = useRef<THREE.InstancedMesh>(null), ramas = useRef<THREE.InstancedMesh>(null);
  const geoLobulo = useMemo(geometriaLobulo, []);
  const geoTronco = useMemo(() => { const g = new THREE.CylinderGeometry(0.62, 1, 1, 7); g.translate(0, 0.5, 0); return g; }, []);
  const matCopa = useMemo(() => conViento(new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.92 }), u, 0.035), [u]);
  const matTronco = useMemo(() => conViento(new THREE.MeshStandardMaterial({ color: COLOR.tronco, roughness: 0.95 }), u, 0.035), [u]);

  // static description: lobes and branches of every plant
  const estatico = useMemo(() => {
    const lob: Lobulo[][] = plantas.map((pl, i) => lobulos(pl, i * 7.13 + pl.x * 0.37 + pl.y * 0.71));
    const n = lob.reduce((s, l) => s + l.length, 0);
    const deLobulo = new Int32Array(n); let k = 0;
    lob.forEach((l, i) => l.forEach(() => { deLobulo[k++] = i; }));
    const conRamas = plantas.map(pl => pl.esp.forma === 'redonda' || pl.esp.forma === 'columnar' || pl.esp.forma === 'extendida' || pl.esp.forma === 'cepa');
    const nRamas = conRamas.reduce((s, c, i) => s + (c ? (plantas[i].esp.forma === 'cepa' ? 2 : 12) : 0), 0);   // 4 branches + 2 twigs each
    return { lob, n, deLobulo, conRamas, nRamas };
  }, [plantas]);

  const ultimoMes = useRef(-99);
  const m = useMemo(() => ({ M: new THREE.Matrix4(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), e: new THREE.Euler(), pos: new THREE.Vector3(), esc: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), d: new THREE.Vector3(), base: new THREE.Vector3(), dst: new THREE.Vector3(), perp: new THREE.Vector3(), ram: new THREE.Vector3(), c: new THREE.Color(), c2: new THREE.Color(), gris: new THREE.Color(COLOR.apagado) }), []);

  const escribir = (mes: number) => {
    const mc = copas.current, mt = troncos.current, mr = ramas.current; if (!mc || !mt || !mr) return;
    const { M, q, q2, e, pos, esc, up, d, base, dst, perp, ram, c, c2, gris } = m;
    const cache = new Map<string, ReturnType<typeof aspecto>>();
    let k = 0, kt = 0, kr = 0;
    for (let i = 0; i < plantas.length; i++) {
      const pl = plantas[i], ls = estatico.lob[i];
      const z = tamano(pl, t, p, sintropico[i]);
      const oculto = z.vis <= 0 || z.h < 0.02;
      const f = forma(pl, Math.max(z.h, 0.01), Math.max(0.1, z.c)), s = z.vis;
      let a = cache.get(pl.esp.id); if (!a) { a = aspecto(pl.esp.id, mes); cache.set(pl.esp.id, a); }
      const fen = FENOLOGIA[pl.esp.id];
      for (let j = 0; j < ls.length; j++, k++) {
        const L = ls[j];
        const conFlor = a.flor > 0 && hash(i, j + 1) < a.flor * 0.85;
        const hoja = conFlor ? Math.max(a.hoja, 0.8) : a.hoja;
        if (oculto || hoja < 0.03) { M.makeScale(0, 0, 0); mc.setMatrixAt(k, M); continue; }
        const g = (0.18 + 0.82 * hoja) * s;
        e.set(L.inclina, L.giro, 0, 'YXZ'); q.setFromEuler(e);
        pos.set(pl.x + L.o[0] * f.rx * s, f.cy * s + L.o[1] * f.ry * s, -pl.y + L.o[2] * f.rx * s);
        esc.set(L.s[0] * f.rx * g, L.s[1] * f.ry * g, L.s[2] * f.rx * g);
        mc.setMatrixAt(k, M.compose(pos, q, esc));
        if (conFlor && fen?.flor) c.set(fen.flor[2]);
        else { c.set(pl.macho ? COLOR.macho : pl.esp.color); if (a.otono > 0 && fen?.otono) c.lerp(c2.set(fen.otono), a.otono); c.offsetHSL(0, 0, L.tono); }
        if (resaltar) { if (pl.esp.id === resaltar) c.offsetHSL(0, 0.08, 0.1); else c.lerp(gris, 0.75); }
        mc.setColorAt(k, c);
      }
      if (oculto || f.tronco <= 0.05) continue;
      // trunk
      const r = 0.035 + z.h * 0.02;
      pos.set(pl.x, 0, -pl.y); esc.set(r, f.tronco * s, r); q.identity();
      mt.setMatrixAt(kt++, M.compose(pos, q, esc));
      // branches: from the trunk top towards the side lobes (a bare tree shows them)
      if (!estatico.conRamas[i]) continue;
      base.set(pl.x, f.tronco * s * 0.92, -pl.y);
      const n = pl.esp.forma === 'cepa' ? 2 : 4;
      for (let b = 0; b < n; b++) {
        if (pl.esp.forma === 'cepa') dst.set(pl.x + (b ? 1 : -1) * f.rx * 0.85 * s, f.cy * s, -pl.y);
        else { const L = ls[1 + b] ?? ls[0]; dst.set(pl.x + L.o[0] * f.rx * s * 1.25, f.cy * s + (L.o[1] + 0.25) * f.ry * s, -pl.y + L.o[2] * f.rx * s * 1.25); }
        d.copy(dst).sub(base); const len = d.length(); if (len < 0.05) continue;
        q2.setFromUnitVectors(up, d.normalize());
        esc.set(r * 0.5, len, r * 0.5);
        mr.setMatrixAt(kr++, M.compose(base, q2, esc));
        if (pl.esp.forma === 'cepa') continue;
        // two twigs from the tip, splayed sideways and up
        perp.crossVectors(d, up); if (perp.lengthSq() < 1e-4) perp.set(1, 0, 0); perp.normalize();
        for (const lado of [-1, 1]) {
          ram.copy(d).addScaledVector(perp, 0.75 * lado).addScaledVector(up, 0.35).normalize();
          q2.setFromUnitVectors(up, ram);
          esc.set(r * 0.25, len * (0.4 + 0.15 * hash(i, b * 2 + lado)), r * 0.25);
          mr.setMatrixAt(kr++, M.compose(dst, q2, esc));
        }
      }
    }
    mt.count = kt; mr.count = kr;
    mc.instanceMatrix.needsUpdate = true; mt.instanceMatrix.needsUpdate = true; mr.instanceMatrix.needsUpdate = true;
    if (mc.instanceColor) mc.instanceColor.needsUpdate = true;
  };

  useLayoutEffect(() => {
    escribir(reloj.current.mes);
    ultimoMes.current = reloj.current.mes;
    copas.current?.computeBoundingSphere();
  });
  useFrame(() => {
    const mes = reloj.current.mes;
    if (Math.abs(mes - ultimoMes.current) > 0.015) { escribir(mes); ultimoMes.current = mes; }
  });

  return (
    <group>
      <instancedMesh ref={copas} args={[geoLobulo, matCopa, Math.max(1, estatico.n)]} castShadow={sombras} receiveShadow={sombras}
        onPointerDown={(ev: ThreeEvent<PointerEvent>) => { ev.stopPropagation(); if (ev.instanceId != null) onElegir(plantas[estatico.deLobulo[ev.instanceId]]); }} />
      <instancedMesh ref={troncos} args={[geoTronco, matTronco, Math.max(1, plantas.length)]} castShadow={sombras} />
      <instancedMesh ref={ramas} args={[geoTronco, matTronco, Math.max(1, estatico.nRamas)]} castShadow={sombras} />
    </group>
  );
}

// ---------------------------------------------------------------- ground
function Suelo({ parcela, dx, sintropico, alcorques, sombras }: { parcela: Parcela; dx: number; sintropico: boolean; alcorques: Planta[]; sombras: boolean }) {
  const anillos = useRef<THREE.InstancedMesh>(null);
  const geoAnillo = useMemo(() => { const g = new THREE.RingGeometry(0.86, 1, 24); g.rotateX(-Math.PI / 2); return g; }, []);
  useLayoutEffect(() => {
    const a = anillos.current; if (!a) return;
    const M = new THREE.Matrix4();
    alcorques.forEach((pl, i) => { const r = Math.max(0.6, pl.esp.copa * 0.3); M.makeScale(r, 1, r); M.setPosition(pl.x, 0.025, -pl.y); a.setMatrixAt(i, M); });
    a.count = alcorques.length; a.instanceMatrix.needsUpdate = true;
  }, [alcorques]);
  return (
    <group position={[dx, 0, 0]}>
      <mesh rotation-x={-Math.PI / 2} position={[parcela.ancho / 2, 0, -parcela.largo / 2]} receiveShadow={sombras}>
        <planeGeometry args={[parcela.ancho, parcela.largo]} />
        <meshStandardMaterial color={sintropico ? COLOR.acolchado : COLOR.desnudo} roughness={1} />
      </mesh>
      {parcela.rects.filter(r => r.tipo !== 'modulo').map((r, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[(r.x0 + r.x1) / 2, r.tipo === 'zanja' ? 0.012 : 0.008, -(r.y0 + r.y1) / 2]} receiveShadow={sombras}>
          <planeGeometry args={[r.x1 - r.x0, r.y1 - r.y0]} />
          <meshStandardMaterial color={r.tipo === 'zanja' ? COLOR.agua : r.tipo === 'pavimento' ? COLOR.pavimento : COLOR.pasillo} roughness={r.tipo === 'zanja' ? 0.25 : 1} metalness={r.tipo === 'zanja' ? 0.1 : 0} />
        </mesh>
      ))}
      {parcela.lunas.map((l, i) => (
        <group key={i} position={[l.cx, 0.02, -l.cy]} rotation-x={-Math.PI / 2}>
          <mesh><ringGeometry args={[l.r2, l.r2 + 0.25, 28, 1, l.a0, l.a1 - l.a0]} /><meshStandardMaterial color={COLOR.piedra} /></mesh>
          <mesh position={[0, 0, -0.005]} receiveShadow={sombras}><ringGeometry args={[l.r1, l.r2, 28, 1, l.a0, l.a1 - l.a0]} /><meshStandardMaterial color={COLOR.sonrisa} /></mesh>
        </group>
      ))}
      <instancedMesh ref={anillos} args={[geoAnillo, undefined, Math.max(1, alcorques.length)]} receiveShadow={sombras}>
        <meshStandardMaterial color={COLOR.alcorque} side={THREE.DoubleSide} />
      </instancedMesh>
      <mesh position={[-1.2, 0.85, 0.8]} castShadow={sombras}><capsuleGeometry args={[0.22, 1.25, 4, 8]} /><meshStandardMaterial color={COLOR.persona} /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------- petals and leaves in the wind
function Particulas({ ancho, largo, reloj, viento, clave }: { ancho: number; largo: number; reloj: Reloj; viento: number; clave: string }) {
  const N = 900;
  const ref = useRef<THREE.Points>(null);
  const datos = useMemo(() => {
    const p = new Float32Array(N * 3), v = new Float32Array(N);
    for (let i = 0; i < N; i++) { p[i * 3] = Math.random() * ancho; p[i * 3 + 1] = Math.random() * 12; p[i * 3 + 2] = -Math.random() * largo; v[i] = 0.4 + Math.random() * 0.9; }
    return { p, v };
  }, [ancho, largo]);
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(datos.p, 3)); return g; }, [datos]);
  const mat = useMemo(() => new THREE.PointsMaterial({ size: 0.32, transparent: true, opacity: 0.9, depthWrite: false }), []);
  useFrame((st, dt0) => {
    const pts = ref.current; if (!pts) return;
    const dt = Math.min(dt0, 0.05), mes = reloj.current.mes % 12;
    const petalos = Math.max(aspecto(clave, mes).flor, aspecto('almendro', mes).flor * 0.6);
    const otono = mes > 9.4 && mes < 11.6 ? Math.sin(((mes - 9.4) / 2.2) * Math.PI) : 0;
    const cantidad = Math.max(petalos, otono) * (0.35 + 0.65 * Math.min(1, viento * 1.5 + 0.2));
    pts.visible = cantidad > 0.02;
    if (!pts.visible) return;
    const hojas = otono > petalos;
    mat.color.set(hojas ? '#c9782e' : '#f7dbe6');
    mat.size = hojas ? 0.38 : 0.26;
    const n = Math.floor(N * cantidad); geo.setDrawRange(0, n);
    const p = datos.p, time = st.clock.elapsedTime;
    for (let i = 0; i < n; i++) {
      p[i * 3 + 1] -= datos.v[i] * (hojas ? 0.9 : 0.45) * dt;
      p[i * 3] += (viento * 4.5 * datos.v[i] + Math.sin(time * 2 + i) * 0.4) * dt;
      p[i * 3 + 2] += Math.cos(time * 1.3 + i * 0.7) * 0.3 * dt;
      if (p[i * 3 + 1] < 0.02 || p[i * 3] > ancho + 4) { p[i * 3] = Math.random() * ancho - viento * 6; p[i * 3 + 1] = 3 + Math.random() * 9; p[i * 3 + 2] = -Math.random() * largo; }
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

// ---------------------------------------------------------------- sun, sky and the clock
function Cielo({ reloj, ambiente, cx, cz, R, onReloj, campo }: {
  reloj: Reloj; ambiente: Ambiente; cx: number; cz: number; R: number;
  onReloj?: (mes: number, hora: number) => void; campo: React.RefObject<THREE.MeshStandardMaterial | null>;
}) {
  const luz = useRef<THREE.DirectionalLight>(null), hemi = useRef<THREE.HemisphereLight>(null), cielo = useRef<any>(null);
  const { scene } = useThree();
  const aviso = useRef({ mes: -1, hora: -1 });
  const tmp = useMemo(() => ({ calido: new THREE.Color('#ffb067'), blanco: new THREE.Color('#fff5e6') }), []);
  useEffect(() => { const l = luz.current; if (!l) return; scene.add(l.target); return () => { scene.remove(l.target); }; }, [scene]);
  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.1), r = reloj.current;
    if (ambiente.animarAno) r.mes = (r.mes + dt * 0.4) % 12; else r.mes = ambiente.mes;
    if (ambiente.animarDia) { r.hora += dt; if (r.hora > 21.5) r.hora = 6; } else r.hora = ambiente.hora;
    const { dir, el } = sol(r.mes, r.hora);
    const l = luz.current, h = hemi.current;
    if (l) {
      l.position.set(cx + dir.x * 400, Math.max(dir.y, 0.02) * 400, cz + dir.z * 400);
      l.target.position.set(cx, 0, cz); l.target.updateMatrixWorld();
      l.color.copy(tmp.calido).lerp(tmp.blanco, Math.max(0, Math.min(1, el / 35)));
      l.intensity = el > 0 ? 0.7 + 2.0 * Math.min(1, Math.sin((el * Math.PI) / 180) * 1.8) : 0;
    }
    if (h) h.intensity = el > 0 ? 0.7 + 0.5 * Math.min(1, el / 30) : 0.18;
    if (cielo.current?.material?.uniforms?.sunPosition) cielo.current.material.uniforms.sunPosition.value.copy(dir);
    if (campo.current) colorCampo(r.mes, campo.current.color);
    if (onReloj && (Math.abs(r.mes - aviso.current.mes) > 0.08 || Math.abs(r.hora - aviso.current.hora) > 0.24)) { aviso.current = { mes: r.mes, hora: r.hora }; onReloj(r.mes, r.hora); }
  });
  return (
    <>
      <Sky ref={cielo} distance={3000} sunPosition={[0, 1, 1]} turbidity={7} rayleigh={1.3} mieCoefficient={0.005} mieDirectionalG={0.82} />
      <hemisphereLight ref={hemi} args={[COLOR.cieloLuz, COLOR.sueloLuz, 0.8]} />
      <directionalLight ref={luz} castShadow={ambiente.sombras} intensity={2}
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.06}
        shadow-camera-left={-R} shadow-camera-right={R} shadow-camera-top={R} shadow-camera-bottom={-R} shadow-camera-near={10} shadow-camera-far={900} />
    </>
  );
}

function Camara({ objetivo, ancho, largo }: { objetivo: ObjetivoCamara; ancho: number; largo: number }) {
  const { camera, controls } = useThree() as any;
  useEffect(() => {
    const cx = ancho / 2, cz = -largo / 2, R = Math.max(ancho, largo);
    const pos = objetivo.vista === 'cenital' ? [cx, R * 1.15, cz + 0.01] : objetivo.vista === 'lateral' ? [cx * 0.5, 4, 16] : [cx - R * 0.15, R * 0.62, cz + R * 0.95];
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(cx, 0, cz);
    if (controls) { controls.target.set(cx, objetivo.vista === 'lateral' ? 3 : 0, cz); controls.update(); }
  }, [objetivo.nonce, objetivo.vista, ancho, largo, camera, controls]);
  return null;
}

function Viento({ u, viento }: { u: Uniformes; viento: number }) {
  useFrame((_, dt) => { u.uTiempo.value += Math.min(dt, 0.1); u.uViento.value += (viento - u.uViento.value) * Math.min(1, dt * 1.5); });
  return null;
}

export default function Escena3D({ parcela, convencional, p, t, resaltar, camara, ambiente, onElegir, onReloj }: Props) {
  const dx = parcela.ancho + SEPARACION;
  const { plantas, sintropico } = useMemo(() => {
    const a = parcela.plantas, b = convencional ? convencional.plantas.map(x => ({ ...x, x: x.x + dx })) : [];
    return { plantas: [...a, ...b], sintropico: [...a.map(() => true), ...b.map(() => false)] };
  }, [parcela, convencional, dx]);
  const alcorques = useMemo(() => p.diseno === 'modulo' || p.diseno === 'pistacho-vina' ? parcela.plantas.filter(x => rol(x.etiqueta) === 1) : [], [parcela, p.diseno]);
  const anchoTotal = convencional ? dx + parcela.ancho : parcela.ancho;
  const reloj = useRef({ mes: ambiente.mes, hora: ambiente.hora });
  const u = useMemo<Uniformes>(() => ({ uTiempo: { value: 0 }, uViento: { value: 0 } }), []);
  const campo = useRef<THREE.MeshStandardMaterial>(null);
  const R = Math.max(anchoTotal, parcela.largo) * 0.62 + 10;
  return (
    <Canvas shadows={ambiente.sombras ? 'soft' : false} camera={{ fov: 40, near: 0.3, far: 5000, position: [60, 130, 150] }} gl={{ preserveDrawingBuffer: true, antialias: true }}
      onPointerMissed={() => onElegir(null)}>
      <Cielo reloj={reloj} ambiente={ambiente} cx={anchoTotal / 2} cz={-parcela.largo / 2} R={R} onReloj={onReloj} campo={campo} />
      <Viento u={u} viento={ambiente.viento} />
      <mesh rotation-x={-Math.PI / 2} position={[anchoTotal / 2, -0.02, -parcela.largo / 2]} receiveShadow={ambiente.sombras}>
        <planeGeometry args={[anchoTotal + 600, parcela.largo + 600]} />
        <meshStandardMaterial ref={campo} color={COLOR.campo} roughness={1} />
      </mesh>
      <Suelo parcela={parcela} dx={0} sintropico alcorques={alcorques} sombras={ambiente.sombras} />
      {convencional && <Suelo parcela={convencional} dx={dx} sintropico={false} alcorques={[]} sombras={ambiente.sombras} />}
      <Plantas plantas={plantas} sintropico={sintropico} p={p} t={t} resaltar={resaltar} reloj={reloj} u={u} onElegir={onElegir} sombras={ambiente.sombras} />
      <Particulas ancho={anchoTotal} largo={parcela.largo} reloj={reloj} viento={ambiente.viento} clave={p.clave} />
      <Html zIndexRange={[10, 0]} position={[parcela.ancho / 2, 0.2, 4]} center><div className="whitespace-nowrap rounded-full bg-emerald-700/90 px-3 py-1 text-xs font-bold text-white">Sintrópico</div></Html>
      {convencional && <Html zIndexRange={[10, 0]} position={[dx + parcela.ancho / 2, 0.2, 4]} center><div className="whitespace-nowrap rounded-full bg-amber-700/90 px-3 py-1 text-xs font-bold text-white">Modelo actual</div></Html>}
      <Html zIndexRange={[10, 0]} position={[-3, 0.2, -parcela.largo + 3]} center><div className="rounded bg-white/80 px-1.5 text-[10px] font-bold text-slate-700">N ↑</div></Html>
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.05} />
      <Camara objetivo={camara} ancho={anchoTotal} largo={parcela.largo} />
    </Canvas>
  );
}

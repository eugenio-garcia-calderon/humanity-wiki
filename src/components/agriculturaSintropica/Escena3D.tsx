// ============================================================================
// AGRICULTURA SINTRÓPICA · 3D VIEW OF THE PLOT (2026-11-25)
// ============================================================================
// One InstancedMesh for every crown and one for every trunk, so a hectare with
// ten thousand plants is two draw calls. When the year changes only the instance
// matrices are rewritten (sizes come from modelo.ts `tamano`).
//
// Plan coordinates (x east, y north, metres) → three.js (x, 0, -y). The
// conventional plot, when shown, sits to the east of the syntropic one.
// Colours are material data (see paleta.ts).

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Parcela, Parametros, Planta } from './modelo';
import { tamano } from './modelo';
import { rol } from './disenos';
import { COLOR } from './paleta';

export type Vista3D = 'perspectiva' | 'cenital' | 'lateral';
export interface ObjetivoCamara { vista: Vista3D; nonce: number }

interface Props {
  parcela: Parcela;
  convencional: Parcela | null;
  p: Parametros;
  t: number;
  resaltar: string | null;            // species id to highlight
  camara: ObjetivoCamara;
  onElegir: (pl: Planta | null) => void;
}

const SEPARACION = 14;   // metres between the two plots

function forma(pl: Planta, h: number, c: number) {
  // → trunk height, crown centre height, crown radii (x, y)
  switch (pl.esp.forma) {
    case 'columnar': { const ch = h * 0.8; return { tronco: h - ch, cy: h - ch / 2, rx: c / 2, ry: ch / 2 }; }
    case 'extendida': { const ch = h * 0.5; return { tronco: h - ch, cy: h - ch / 2, rx: c / 2, ry: ch / 2 }; }
    case 'palmera': { const ch = Math.max(0.3, h * 0.14); return { tronco: h - ch / 2, cy: h - ch / 2, rx: c / 2, ry: ch / 2 }; }
    case 'cepa': return { tronco: h * 0.55, cy: h * 0.75, rx: c / 2, ry: h * 0.25 };
    case 'arbusto': case 'mata': case 'hierba': return { tronco: 0, cy: h / 2, rx: c / 2, ry: h / 2 };
    default: { const ch = Math.min(h * 0.65, c * 0.9); return { tronco: h - ch, cy: h - ch / 2, rx: c / 2, ry: ch / 2 }; }
  }
}

function Plantas({ plantas, p, t, resaltar, onElegir, sintropico }: { plantas: Planta[]; p: Parametros; t: number; resaltar: string | null; onElegir: (pl: Planta | null) => void; sintropico: boolean[] }) {
  const copas = useRef<THREE.InstancedMesh>(null);
  const troncos = useRef<THREE.InstancedMesh>(null);
  const geoCopa = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const geoTronco = useMemo(() => { const g = new THREE.CylinderGeometry(1, 1.2, 1, 6); g.translate(0, 0.5, 0); return g; }, []);
  const n = plantas.length;

  useLayoutEffect(() => {
    const mc = copas.current, mt = troncos.current; if (!mc || !mt) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), esc = new THREE.Vector3();
    let k = 0;
    for (let i = 0; i < n; i++) {
      const pl = plantas[i];
      const z = tamano(pl, t, p, sintropico[i]);
      if (z.vis <= 0 || z.h < 0.02) { m.makeScale(0, 0, 0); mc.setMatrixAt(i, m); continue; }
      const f = forma(pl, z.h, Math.max(0.1, z.c));
      const s = z.vis;
      pos.set(pl.x, f.cy * s, -pl.y); esc.set(f.rx * s, f.ry * s, f.rx * s);
      mc.setMatrixAt(i, m.compose(pos, q, esc));
      if (f.tronco > 0.05) {
        const r = 0.03 + z.h * 0.018;
        pos.set(pl.x, 0, -pl.y); esc.set(r, f.tronco * s, r);
        mt.setMatrixAt(k++, m.compose(pos, q, esc));
      }
    }
    mt.count = k;
    mc.instanceMatrix.needsUpdate = true; mt.instanceMatrix.needsUpdate = true;
    mc.computeBoundingSphere();
  }, [plantas, p, t, n, sintropico]);

  useLayoutEffect(() => {
    const mc = copas.current; if (!mc) return;
    const c = new THREE.Color(), gris = new THREE.Color(COLOR.apagado);
    for (let i = 0; i < n; i++) {
      c.set(plantas[i].macho ? COLOR.macho : plantas[i].esp.color);
      if (resaltar) { if (plantas[i].esp.id === resaltar) c.offsetHSL(0, 0.1, 0.12); else c.lerp(gris, 0.75); }
      mc.setColorAt(i, c);
    }
    if (mc.instanceColor) mc.instanceColor.needsUpdate = true;
  }, [plantas, resaltar, n]);

  return (
    <group>
      <instancedMesh ref={copas} args={[geoCopa, undefined, Math.max(1, n)]} castShadow
        onPointerDown={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); if (e.instanceId != null) onElegir(plantas[e.instanceId]); }}>
        <meshStandardMaterial flatShading roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={troncos} args={[geoTronco, undefined, Math.max(1, n)]}>
        <meshStandardMaterial color={COLOR.tronco} roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

function Suelo({ parcela, dx, sintropico, alcorques }: { parcela: Parcela; dx: number; sintropico: boolean; alcorques: Planta[] }) {
  const anillos = useRef<THREE.InstancedMesh>(null);
  const geoAnillo = useMemo(() => { const g = new THREE.RingGeometry(0.86, 1, 24); g.rotateX(-Math.PI / 2); return g; }, []);
  useLayoutEffect(() => {
    const a = anillos.current; if (!a) return;
    const m = new THREE.Matrix4();
    alcorques.forEach((pl, i) => { const r = Math.max(0.6, pl.esp.copa * 0.3); m.makeScale(r, 1, r); m.setPosition(pl.x, 0.025, -pl.y); a.setMatrixAt(i, m); });
    a.count = alcorques.length; a.instanceMatrix.needsUpdate = true;
  }, [alcorques]);
  return (
    <group position={[dx, 0, 0]}>
      <mesh rotation-x={-Math.PI / 2} position={[parcela.ancho / 2, 0, -parcela.largo / 2]} receiveShadow>
        <planeGeometry args={[parcela.ancho, parcela.largo]} />
        <meshStandardMaterial color={sintropico ? COLOR.acolchado : COLOR.desnudo} roughness={1} />
      </mesh>
      {parcela.rects.filter(r => r.tipo !== 'modulo').map((r, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[(r.x0 + r.x1) / 2, r.tipo === 'zanja' ? 0.012 : 0.008, -(r.y0 + r.y1) / 2]}>
          <planeGeometry args={[r.x1 - r.x0, r.y1 - r.y0]} />
          <meshStandardMaterial color={r.tipo === 'zanja' ? COLOR.agua : r.tipo === 'pavimento' ? COLOR.pavimento : COLOR.pasillo} roughness={r.tipo === 'zanja' ? 0.3 : 1} />
        </mesh>
      ))}
      {parcela.lunas.map((l, i) => (
        <group key={i} position={[l.cx, 0.02, -l.cy]} rotation-x={-Math.PI / 2}>
          <mesh><ringGeometry args={[l.r2, l.r2 + 0.25, 28, 1, l.a0, l.a1 - l.a0]} /><meshStandardMaterial color={COLOR.piedra} /></mesh>
          <mesh position={[0, 0, -0.005]}><ringGeometry args={[l.r1, l.r2, 28, 1, l.a0, l.a1 - l.a0]} /><meshStandardMaterial color={COLOR.sonrisa} /></mesh>
        </group>
      ))}
      <instancedMesh ref={anillos} args={[geoAnillo, undefined, Math.max(1, alcorques.length)]}>
        <meshStandardMaterial color={COLOR.alcorque} side={THREE.DoubleSide} />
      </instancedMesh>
      {/* a person for scale, at the south-west corner */}
      <mesh position={[-1.2, 0.85, 0.8]}><capsuleGeometry args={[0.22, 1.25, 4, 8]} /><meshStandardMaterial color={COLOR.persona} /></mesh>
    </group>
  );
}

function Camara({ objetivo, ancho, largo }: { objetivo: ObjetivoCamara; ancho: number; largo: number }) {
  const { camera, controls } = useThree() as any;
  useEffect(() => {
    const cx = ancho / 2, cz = -largo / 2, R = Math.max(ancho, largo);
    const pos = objetivo.vista === 'cenital' ? [cx, R * 1.15, cz + 0.01] : objetivo.vista === 'lateral' ? [cx * 0.5, 5, 16] : [cx - R * 0.15, R * 0.62, cz + R * 0.95];
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(cx, 0, cz);
    if (controls) { controls.target.set(cx, objetivo.vista === 'lateral' ? 3 : 0, cz); controls.update(); }
  }, [objetivo.nonce, objetivo.vista, ancho, largo, camera, controls]);
  return null;
}

export default function Escena3D({ parcela, convencional, p, t, resaltar, camara, onElegir }: Props) {
  const dx = parcela.ancho + SEPARACION;
  const { plantas, sintropico } = useMemo(() => {
    const a = parcela.plantas, b = convencional ? convencional.plantas.map(x => ({ ...x, x: x.x + dx })) : [];
    return { plantas: [...a, ...b], sintropico: [...a.map(() => true), ...b.map(() => false)] };
  }, [parcela, convencional, dx]);
  const alcorques = useMemo(() => p.diseno === 'modulo' || p.diseno === 'pistacho-vina' ? parcela.plantas.filter(x => rol(x.etiqueta) === 1) : [], [parcela, p.diseno]);
  const anchoTotal = convencional ? dx + parcela.ancho : parcela.ancho;
  return (
    <Canvas shadows={false} camera={{ fov: 40, near: 0.3, far: 4000, position: [60, 130, 150] }} gl={{ preserveDrawingBuffer: true, antialias: true }}
      onPointerMissed={() => onElegir(null)} style={{ background: COLOR.cielo }}>
      <hemisphereLight args={[COLOR.cieloLuz, COLOR.sueloLuz, 0.9]} />
      <directionalLight position={[-60, 120, 40]} intensity={1.6} />
      <mesh rotation-x={-Math.PI / 2} position={[anchoTotal / 2, -0.02, -parcela.largo / 2]}>
        <planeGeometry args={[anchoTotal + 200, parcela.largo + 200]} />
        <meshStandardMaterial color={COLOR.campo} roughness={1} />
      </mesh>
      <Suelo parcela={parcela} dx={0} sintropico alcorques={alcorques} />
      {convencional && <Suelo parcela={convencional} dx={dx} sintropico={false} alcorques={[]} />}
      <Plantas plantas={plantas} p={p} t={t} resaltar={resaltar} onElegir={onElegir} sintropico={sintropico} />
      <Html zIndexRange={[10, 0]} position={[parcela.ancho / 2, 0.2, 4]} center><div className="whitespace-nowrap rounded-full bg-emerald-700/90 px-3 py-1 text-xs font-bold text-white">Sintrópico</div></Html>
      {convencional && <Html zIndexRange={[10, 0]} position={[dx + parcela.ancho / 2, 0.2, 4]} center><div className="whitespace-nowrap rounded-full bg-amber-700/90 px-3 py-1 text-xs font-bold text-white">Modelo actual</div></Html>}
      <Html zIndexRange={[10, 0]} position={[-3, 0.2, -parcela.largo + 3]} center><div className="rounded bg-white/80 px-1.5 text-[10px] font-bold text-slate-700">N ↑</div></Html>
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.05} />
      <Camara objetivo={camara} ancho={anchoTotal} largo={parcela.largo} />
    </Canvas>
  );
}

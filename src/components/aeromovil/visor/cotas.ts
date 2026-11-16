// Dimension lines (cotas) for each vehicle and for garage cars.
// Moved out of Visor3D.tsx unchanged (2026-11-16, refactor «ordenar»). See ../CLAUDE.md for the layout.
import * as THREE from 'three';
import type { Modelo, ModeloBala, ModeloTriciclo } from '../geometria';
import { cotasBasculante } from '../basculante/modelo3d';
import type { V3 } from './capas';
import type { Mats } from './materiales';
import { _up } from './primitivas';

/** Cotas exteriores en el suelo y en vertical, con su número en mm. */
/** Las piezas de una cota (línea, flechas y etiqueta), para el Aeromóvil y para los coches del garaje. */
export function herramientasCota(g: THREE.Object3D, M: Mats) {
  const etiqueta = (texto: string, p: V3) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const x = c.getContext('2d')!;
    x.fillStyle = 'rgba(255,255,255,0.92)'; x.strokeStyle = '#0e5e6b'; x.lineWidth = 4;
    x.beginPath(); x.roundRect(4, 14, 504, 100, 20); x.fill(); x.stroke();
    x.fillStyle = '#0b3d45'; x.font = `600 ${texto.length > 15 ? 40 : 58}px "IBM Plex Mono", ui-monospace, monospace`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(texto, 256, 66);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    s.position.set(...p); s.scale.set(0.62, 0.155, 1); s.renderOrder = 10; g.add(s);
  };
  const flecha = (p: V3, dir: THREE.Vector3) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 12), M.cotaFlecha);
    c.position.set(...p).addScaledVector(dir, -0.035); c.quaternion.setFromUnitVectors(_up, dir.clone().normalize()); c.renderOrder = 10; g.add(c);
  };
  const linea = (pts: V3[]) => {
    const geo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p)));
    const l = new THREE.LineSegments(geo, M.cota); l.renderOrder = 10; g.add(l);
  };
  const cota = (a: V3, b: V3, ext: [V3, V3][], texto: string, offEtq: V3 = [0, 0.11, 0]) => {
    linea([a, b, ...ext.flat()]);
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    flecha(b, d.clone()); flecha(a, d.clone().negate());
    etiqueta(texto, [(a[0] + b[0]) / 2 + offEtq[0], (a[1] + b[1]) / 2 + offEtq[1], (a[2] + b[2]) / 2 + offEtq[2]]);
  };
  const mm = (v: number) => `${Math.round(v * 1000).toLocaleString('es-ES')} mm`;
  return { cota, mm, etiqueta };
}

/**
 * Cotas de un coche del garaje, en sus propios ejes (van dentro de su grupo):
 * vías delantera y trasera y alto total (2026-11-07, Eugenio: «que aparezcan
 * también en los modelos del garaje»).
 */
export function cotasGaraje(M: Mats, def: { batalla: number; alto: number; ancho: number; viaDel?: number; viaTras?: number; envolvente?: [number, number, number, number][] }): THREE.Group {
  const g = new THREE.Group(); g.name = 'cotas-garaje';
  const { cota, mm } = herramientasCota(g, M), y = 0.004;
  if (def.viaDel) cota([0, y, -def.viaDel / 2], [0, y, def.viaDel / 2], [], `vía del. ${mm(def.viaDel)}`, [0.30, 0.11, 0]);
  if (def.viaTras) cota([-def.batalla, y, -def.viaTras / 2], [-def.batalla, y, def.viaTras / 2], [], `vía tras. ${mm(def.viaTras)}`, [-0.30, 0.11, 0]);
  // El alto, de pie junto a la cola, con una línea hasta el punto más alto del techo.
  const env = def.envolvente;
  const xTope = env?.length ? env.reduce((a, e) => (e[2] > a[2] ? e : a))[0] : -def.batalla / 2;
  const xCola = env?.length ? Math.min(...env.map(e => e[0])) : -def.batalla - 0.4;
  const xH = xCola - 0.30, zL = -(def.ancho / 2 + 0.38);
  cota([xH, 0, zL], [xH, def.alto, zL], [[[xH - 0.05, def.alto, zL], [xTope, def.alto, zL]]], `alto ${mm(def.alto)}`, [-0.36, 0, 0]);
  return g;
}

export function cotas(g: THREE.Object3D, M: Mats, m: Modelo, espacio = false) {
  if (m.tipo === 'bala') { cotasBala(g, M, m); return; }
  if (m.tipo === 'basculante') { const { cota, mm } = herramientasCota(g, M); cotasBasculante(g, m, cota, mm); return; }
  if (m.tipo === 'triciclo') { cotasTriciclo(g, M, m); return; }
  const { cota, mm, etiqueta } = herramientasCota(g, M);
  const P = m.P, y = 0.004, zL = -(P.W / 2 + 0.38), zB = -(P.W / 2 + 0.16);
  cota([m.xt, y, zL], [m.xn, y, zL], [[[m.xt, y, 0], [m.xt, y, zL - 0.05]], [[m.xn, y, 0], [m.xn, y, zL - 0.05]]], `largo ${mm(m.Lf)}`, [0.55, 0.11, -0.08]);
  cota([m.xR, y, zB], [0, y, zB], [[[m.xR, y, 0], [m.xR, y, zB - 0.04]], [[0, y, 0], [0, y, zB - 0.04]]], `batalla ${mm(P.B)}`, [-0.35, 0.11, 0.04]);
  const xA = m.xn + 0.40;
  cota([xA, y, -P.W / 2], [xA, y, P.W / 2], [[[m.xn - 0.2, y, -P.W / 2], [xA + 0.05, y, -P.W / 2]], [[m.xn - 0.2, y, P.W / 2], [xA + 0.05, y, P.W / 2]]], `ancho ${mm(P.W)}`, [0.12, 0.1, 0]);
  const xH = m.xt - 0.30, xMax = m.tipo === 'a1' ? m.xn - 0.45 * m.Lf : m.frame(P.pmax).x;
  cota([xH, 0, zL], [xH, P.H, zL], [[[xH - 0.05, P.H, zL], [xMax, P.H, zL]]], `alto ${mm(P.H)}`, [-0.36, 0, 0]);
  if (m.tipo === 'a1') {
    cota([0, y, -P.viaF / 2], [0, y, P.viaF / 2], [], `vía del. ${mm(P.viaF)}`, [0.30, 0.11, 0]);
    cota([m.xR, y, -P.viaR / 2], [m.xR, y, P.viaR / 2], [], `vía tras. ${mm(P.viaR)}`, [-0.30, 0.11, 0]);
    if (espacio) {
      // El espacio trasero sin pasajero (maletero o cama): largo sobre el suelo, ancho y alto en el centro, y el volumen.
      const e = m.espacioTrasero, ys = e.y0 + 0.01, xm = (e.x0 + e.x1) / 2;
      cota([e.x0, ys, -e.hz], [e.x1, ys, -e.hz], [[[e.x0, ys, -e.hz], [e.x0, ys, e.hz]], [[e.x1, ys, -e.hz], [e.x1, ys, e.hz]]], `fondo ${mm(e.largo)}`, [0, 0.12, -0.05]);
      cota([xm, ys, -e.hz], [xm, ys, e.hz], [], `ancho ${mm(e.ancho)}`, [0, 0.12, 0]);
      cota([e.x1 + 0.25, e.y0, 0], [e.x1 + 0.25, e.y1, 0], [], `alto ${mm(e.alto)}`, [0, 0, 0.3]);
      etiqueta(`≈ ${e.litros.toLocaleString('es-ES')} L · ${(e.largo).toFixed(2).replace('.', ',')} × ${(e.ancho).toFixed(2).replace('.', ',')} m`, [xm, e.y1 + 0.18, 0]);
    }
  } else {
    cota([m.xL, y, -P.track / 2], [m.xL, y, P.track / 2], [], `vía ${mm(P.track)}`, [0, 0.11, 0]);
  }
}

/** Cotas del Cuadriciclo Bala en rombo: largo, batalla, ancho con los carenados y de la carrocería, alto y vía de las laterales. */
export function cotasBala(g: THREE.Object3D, M: Mats, m: ModeloBala) {
  const { cota, mm } = herramientasCota(g, M);
  const P = m.P, y = 0.004, W = m.anchoTotal, zL = -(W / 2 + 0.38), zB = -(W / 2 + 0.16);
  cota([m.xt, y, zL], [m.xn, y, zL], [[[m.xt, y, 0], [m.xt, y, zL - 0.05]], [[m.xn, y, 0], [m.xn, y, zL - 0.05]]], `largo ${mm(m.Lf)}`, [0.55, 0.11, -0.08]);
  cota([m.xR, y, zB], [0, y, zB], [[[m.xR, y, 0], [m.xR, y, zB - 0.04]], [[0, y, 0], [0, y, zB - 0.04]]], `batalla ${mm(P.B)}`, [-0.35, 0.11, 0.04]);
  const xA = m.xn + 0.40;
  cota([xA, y, -W / 2], [xA, y, W / 2], [[[m.xL, y, -W / 2], [xA + 0.05, y, -W / 2]], [[m.xL, y, W / 2], [xA + 0.05, y, W / 2]]], `ancho ${mm(W)}`, [0.12, 0.1, 0]);
  const xC = m.xn + 0.15, hw = m.anchoCuerpo / 2;
  cota([xC, 0.62, -hw], [xC, 0.62, hw], [], `carrocería ${mm(m.anchoCuerpo)}`, [0.10, 0.12, 0]);
  // the height stands by the tail, with a line to the canopy's crest (over the riders)
  const xH = m.xt - 0.30, xTope = (m.sillines.xPiloto + m.sillines.xPasajero) / 2;
  cota([xH, 0, zL], [xH, m.alto, zL], [[[xH - 0.05, m.alto, zL], [xTope, m.alto, zL]]], `alto ${mm(m.alto)}`, [-0.36, 0, 0]);
  cota([m.xL, y, -P.track / 2], [m.xL, y, P.track / 2], [], `vía ${mm(P.track)}`, [0, 0.11, 0]);
}

/** Cotas del Triciclo Bala: largo, batalla (de su eje delantero al trasero), ancho con los carenados y de la carrocería, alto y vía delantera. */
export function cotasTriciclo(g: THREE.Object3D, M: Mats, m: ModeloTriciclo) {
  const { cota, mm } = herramientasCota(g, M);
  const y = 0.004, W = m.anchoTotal, zL = -(W / 2 + 0.38), zB = -(W / 2 + 0.16);
  cota([m.xt, y, zL], [m.xn, y, zL], [[[m.xt, y, 0], [m.xt, y, zL - 0.05]], [[m.xn, y, 0], [m.xn, y, zL - 0.05]]], `largo ${mm(m.Lf)}`, [0.55, 0.11, -0.08]);
  cota([m.xR, y, zB], [m.xF, y, zB], [[[m.xR, y, 0], [m.xR, y, zB - 0.04]], [[m.xF, y, -W / 2 + 0.1], [m.xF, y, zB - 0.04]]], `batalla ${mm(m.batalla)}`, [-0.35, 0.11, 0.04]);
  const xA = m.xn + 0.40;
  cota([xA, y, -W / 2], [xA, y, W / 2], [[[m.xF, y, -W / 2], [xA + 0.05, y, -W / 2]], [[m.xF, y, W / 2], [xA + 0.05, y, W / 2]]], `ancho ${mm(W)}`, [0.12, 0.1, 0]);
  const xC = m.xn + 0.15, hw = m.anchoCuerpo / 2;
  cota([xC, 0.62, -hw], [xC, 0.62, hw], [], `carrocería ${mm(m.anchoCuerpo)}`, [0.10, 0.12, 0]);
  const xH = m.xt - 0.30, xTope = (m.sillines.xPiloto + m.sillines.xPasajero) / 2;
  cota([xH, 0, zL], [xH, m.alto, zL], [[[xH - 0.05, m.alto, zL], [xTope, m.alto, zL]]], `alto ${mm(m.alto)}`, [-0.36, 0, 0]);
  cota([m.xF, y, -m.via.del / 2], [m.xF, y, m.via.del / 2], [], `vía ${mm(m.via.del)}`, [0, 0.11, 0]);
  // four wheels (2026-11-11): the rear track too
  if (m.traseras) cota([m.xR, y, -m.via.tras / 2], [m.xR, y, m.via.tras / 2], [], `vía trasera ${mm(m.via.tras)}`, [0, 0.11, 0]);
}

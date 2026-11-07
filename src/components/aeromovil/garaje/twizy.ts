import * as THREE from 'three';
import type { VehiculoGaraje } from './tipos';

/**
 * Renault Twizy 80 (2012–), modelado por código.
 *
 * Medidas (ficha técnica de Renault, Twizy 80): largo 2 338 mm, ancho 1 237 mm
 * (1 381 con retrovisores), alto 1 454 mm, batalla 1 686 mm, vías 1 094 mm
 * delante y 1 080 mm detrás. Neumáticos 125/80 R13 delante (radio ~265 mm) y
 * 145/80 R13 detrás (~281 mm). Las proporciones de la carrocería (perfil, cortes
 * y planta) se han sacado del modelo de simulación «SD Twizy» de StreetDrone
 * (Gazebo, 2020) y se han contrastado con fotos de prensa de Renault.
 *
 * Ejes: X hacia delante, Y arriba, Z lateral (+ izquierda). Eje delantero en
 * x = 0, eje trasero en x = −1,686, suelo en y = 0. Metros.
 */

const BATALLA = 1.686;
const VIA_DEL = 1.094, VIA_TRAS = 1.080;
const R_DEL = 0.265, R_TRAS = 0.281;
const ANCHO_DEL = 0.125, ANCHO_TRAS = 0.145;
const R_LLANTA = 0.165; // 13 pulgadas

// ---------------------------------------------------------------- materiales
function materiales() {
  const D = THREE.DoubleSide;
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ side: D, ...p });
  return {
    blanco: fis({ color: 0xf3f4f2, roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05 }),
    acento: fis({ color: 0x1f78c8, roughness: 0.3, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06 }),
    negro: fis({ color: 0x1c1e21, roughness: 0.62, metalness: 0.02 }),
    grafito: fis({ color: 0x34383e, roughness: 0.45, metalness: 0.15, clearcoat: 0.4 }),
    tela: fis({ color: 0x2a2d32, roughness: 0.92, metalness: 0, sheen: 0.5, sheenColor: new THREE.Color(0x5a6070) }),
    goma: fis({ color: 0x151515, roughness: 0.88, metalness: 0 }),
    llanta: fis({ color: 0xc8ccd2, roughness: 0.22, metalness: 0.9, clearcoat: 1, clearcoatRoughness: 0.08 }),
    reflector: fis({ color: 0xf4f6fa, roughness: 0.12, metalness: 0.75, emissive: 0x30343a }),
    cromo: fis({ color: 0xe8eaee, roughness: 0.08, metalness: 1 }),
    acero: fis({ color: 0x6d7178, roughness: 0.4, metalness: 0.85 }),
    disco: fis({ color: 0x8a8d92, roughness: 0.35, metalness: 0.9 }),
    muelle: fis({ color: 0xc8372b, roughness: 0.35, metalness: 0.4, clearcoat: 0.6 }),
    cristal: fis({ color: 0xa9c4d6, roughness: 0.03, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.26, depthWrite: false }),
    cristalOscuro: fis({ color: 0x0d151c, roughness: 0.05, metalness: 0.2, clearcoat: 1, transparent: true, opacity: 0.8 }),
    faroLente: fis({ color: 0xffffff, roughness: 0.02, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.35, depthWrite: false }),
    luzBlanca: fis({ color: 0xfafcff, emissive: 0xdde8ff, emissiveIntensity: 0.6, roughness: 0.2 }),
    ambar: fis({ color: 0xff9a1a, emissive: 0xff7a00, emissiveIntensity: 0.35, roughness: 0.25, transparent: true, opacity: 0.9 }),
    rojo: fis({ color: 0xc0101a, emissive: 0x900008, emissiveIntensity: 0.55, roughness: 0.15, clearcoat: 1, transparent: true, opacity: 0.92 }),
    pantalla: fis({ color: 0x0a1a24, emissive: 0x1a6aa0, emissiveIntensity: 0.4, roughness: 0.1 }),
  };
}
type Mats = ReturnType<typeof materiales>;

// ---------------------------------------------------------------- utilidades
const malla = (g: THREE.BufferGeometry, m: THREE.Material, nombre?: string) => {
  const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; if (nombre) o.name = nombre; return o;
};
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Catmull-Rom uniforme de un número entre cuatro valores. */
function cr(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** Una estación de un cuerpo de revolución libre: sección superelíptica en x. */
interface Est { x: number; yb: number; yt: number; wb: number; wm: number; wt: number; n?: number }
const E = (x: number, yb: number, yt: number, wb: number, wm: number, wt: number, n = 3): Est => ({ x, yb, yt, wb, wm, wt, n });

function anillo(e: Est, N: number): [number, number][] {
  const n = e.n ?? 3, yc = (e.yb + e.yt) / 2, h = (e.yt - e.yb) / 2, out: [number, number][] = [];
  for (let j = 0; j < N; j++) {
    const th = (j / N) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    const y = yc + h * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    const t = (y - e.yb) / (e.yt - e.yb);
    const w = e.wb * (1 - t) * (1 - 2 * t) + 4 * e.wm * t * (1 - t) + e.wt * t * (2 * t - 1);
    out.push([y, w * Math.sign(c) * Math.pow(Math.abs(c), 2 / n)]);
  }
  return out;
}

/** Superficie suave que pasa por las estaciones (x creciente), con tapas. */
function loft(es: Est[], N = 64, sub = 8, tapas = true): THREE.BufferGeometry {
  const claves: (keyof Est)[] = ['x', 'yb', 'yt', 'wb', 'wm', 'wt', 'n'];
  const muestras: Est[] = [];
  for (let i = 0; i < es.length - 1; i++) {
    const a = es[Math.max(0, i - 1)], b = es[i], c = es[i + 1], d = es[Math.min(es.length - 1, i + 2)];
    const last = i === es.length - 2;
    for (let k = 0; k < (last ? sub + 1 : sub); k++) {
      const t = k / sub, e: Record<string, number> = {};
      for (const key of claves) e[key] = cr((a[key] ?? 3) as number, (b[key] ?? 3) as number, (c[key] ?? 3) as number, (d[key] ?? 3) as number, t);
      muestras.push(e as unknown as Est);
    }
  }
  const pos: number[] = [], idx: number[] = [];
  for (const m of muestras) for (const [y, z] of anillo(m, N)) pos.push(m.x, y, z);
  const M = muestras.length;
  for (let i = 0; i < M - 1; i++) for (let j = 0; j < N; j++) {
    const a = i * N + j, b = i * N + (j + 1) % N, c = (i + 1) * N + j, d = (i + 1) * N + (j + 1) % N;
    idx.push(a, c, b, b, c, d);
  }
  if (tapas) {
    for (const [ring, fin] of [[0, false], [M - 1, true]] as [number, boolean][]) {
      const m = muestras[ring], s = pos.length / 3;
      pos.push(m.x, (m.yb + m.yt) / 2, 0);
      for (let j = 0; j < N; j++) {
        const a = ring * N + j, b = ring * N + (j + 1) % N;
        if (fin) idx.push(s, b, a); else idx.push(s, a, b);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/**
 * Barrido de un perfil cerrado a lo largo de una curva contenida en un plano
 * z = cte. El perfil es (a, b): a en el plano de la curva (normal a ella), b en z.
 */
function barridoXY(camino: THREE.Vector2[], cerrado: boolean, perfil: [number, number][], z0: number): THREE.BufferGeometry {
  const P = perfil.length, M = camino.length, pos: number[] = [], idx: number[] = [];
  for (let i = 0; i < M; i++) {
    const p = camino[i];
    const pa = camino[cerrado ? (i - 1 + M) % M : Math.max(0, i - 1)], pb = camino[cerrado ? (i + 1) % M : Math.min(M - 1, i + 1)];
    const t = new THREE.Vector2().subVectors(pb, pa).normalize(), n = new THREE.Vector2(-t.y, t.x);
    for (const [a, b] of perfil) pos.push(p.x + n.x * a, p.y + n.y * a, z0 + b);
  }
  const segs = cerrado ? M : M - 1;
  for (let i = 0; i < segs; i++) for (let j = 0; j < P; j++) {
    const i2 = (i + 1) % M, a = i * P + j, b = i * P + (j + 1) % P, c = i2 * P + j, d = i2 * P + (j + 1) % P;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Puntos espaciados de una curva Catmull-Rom 2D. */
function curva2(pts: [number, number][], n: number, cerrada = false): THREE.Vector2[] {
  const c = new THREE.CatmullRomCurve3(pts.map(([x, y]) => v3(x, y, 0)), cerrada, 'centripetal');
  return c.getSpacedPoints(n).slice(0, cerrada ? n : n + 1).map(p => new THREE.Vector2(p.x, p.y));
}

/** Rectángulo de esquinas redondeadas como perfil de barrido. */
function perfilRect(w: number, h: number, r: number, k = 4): [number, number][] {
  const out: [number, number][] = [], cx = w / 2 - r, cy = h / 2 - r;
  const esquinas: [number, number, number][] = [[cx, cy, 0], [-cx, cy, Math.PI / 2], [-cx, -cy, Math.PI], [cx, -cy, 1.5 * Math.PI]];
  for (const [x, y, a0] of esquinas) for (let i = 0; i <= k; i++) { const a = a0 + (i / k) * Math.PI / 2; out.push([x + r * Math.cos(a), y + r * Math.sin(a)]); }
  return out;
}

/** Contorno 2D con las esquinas redondeadas (radio por esquina o común). */
function forma(pts: [number, number][], r: number | number[]): THREE.Shape {
  const s = new THREE.Shape(), n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = new THREE.Vector2(...pts[i]), a = new THREE.Vector2(...pts[(i - 1 + n) % n]), b = new THREE.Vector2(...pts[(i + 1) % n]);
    const rr = Array.isArray(r) ? r[i] : r;
    const da = a.clone().sub(p), db = b.clone().sub(p);
    const ra = Math.min(rr, da.length() / 2), rb = Math.min(rr, db.length() / 2);
    const p1 = p.clone().add(da.normalize().multiplyScalar(ra)), p2 = p.clone().add(db.normalize().multiplyScalar(rb));
    if (i === 0) s.moveTo(p1.x, p1.y); else s.lineTo(p1.x, p1.y);
    s.quadraticCurveTo(p.x, p.y, p2.x, p2.y);
  }
  s.closePath();
  return s;
}

function extruir(s: THREE.Shape, prof: number, bisel: number, curva = 10): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(s, { depth: prof, bevelEnabled: bisel > 0, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 3, curveSegments: curva });
  g.translate(0, 0, -prof / 2); g.computeVertexNormals();
  return g;
}

const tubo = (pts: THREE.Vector3[], r: number, seg = 24, rad = 10) =>
  new THREE.TubeGeometry(pts.length === 2 ? new THREE.LineCurve3(pts[0], pts[1]) : new THREE.CatmullRomCurve3(pts), seg, r, rad, false);

/** Cilindro (o tronco) entre dos puntos. */
function barra(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material, r2 = r, seg = 14) {
  const d = b.clone().sub(a), g = new THREE.CylinderGeometry(r2, r, d.length(), seg, 1);
  const o = malla(g, m); o.position.copy(a).add(b).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(v3(0, 1, 0), d.normalize()); return o;
}

// ---------------------------------------------------------------- rueda
/** Neumático por torno, con dibujo tallado en la banda de rodadura. Eje en Z. */
function neumatico(R: number, ancho: number): THREE.BufferGeometry {
  const hw = ancho / 2, perfil: THREE.Vector2[] = [];
  const rTalon = R_LLANTA + 0.004, hFlanco = R - rTalon;
  // flanco interior (de talón a hombro), banda, flanco exterior
  const flanco = (lado: number, inv: boolean) => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 7; i++) {
      const t = i / 7, r = rTalon + hFlanco * (0.08 + 0.84 * t);
      const bulto = Math.sin(Math.PI * Math.min(1, t * 1.15)) * 0.012;
      pts.push(new THREE.Vector2(r, lado * (hw * 0.86 + bulto + 0.01 * t)));
    }
    return inv ? pts.reverse() : pts;
  };
  perfil.push(new THREE.Vector2(rTalon - 0.004, -hw * 0.84));
  perfil.push(...flanco(-1, false));
  // hombro redondeado
  for (let i = 1; i <= 5; i++) { const a = Math.PI / 2 * (i / 5); perfil.push(new THREE.Vector2(R - 0.014 + 0.014 * Math.sin(a), -(hw - 0.006) + 0.006 * (1 - Math.cos(a)) - 0.004 * (1 - Math.sin(a)))); }
  const nb = 16;
  for (let i = 1; i < nb; i++) perfil.push(new THREE.Vector2(R, -(hw - 0.006) + (2 * (hw - 0.006)) * (i / nb)));
  for (let i = 0; i <= 5; i++) { const a = Math.PI / 2 * (1 - i / 5); perfil.push(new THREE.Vector2(R - 0.014 + 0.014 * Math.sin(a), (hw - 0.006) - 0.006 * (1 - Math.cos(a)) + 0.004 * (1 - Math.sin(a)))); }
  perfil.push(...flanco(1, true));
  perfil.push(new THREE.Vector2(rTalon - 0.004, hw * 0.84));
  const g = new THREE.LatheGeometry(perfil, 128);
  // dibujo: surcos circunferenciales y tacos en flecha
  const p = g.attributes.position as THREE.BufferAttribute, lim = hw - 0.008;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z);
    if (r < R - 0.0015 || Math.abs(y) > lim) continue;
    const phi = Math.atan2(z, x), ay = Math.abs(y);
    const u = phi * 32 / (2 * Math.PI) + ay * 9;
    const f = u - Math.floor(u);
    const surco = ay < 0.005 || Math.abs(ay - lim * 0.62) < 0.004 || (f < 0.2 && ay > 0.008);
    if (surco) { const k = (R - 0.007) / r; p.setX(i, x * k); p.setZ(i, z * k); }
  }
  g.rotateX(Math.PI / 2); g.computeVertexNormals();
  return g;
}

/** Rueda completa (neumático, llanta de 13", buje, tornillos), eje Z hacia fuera. */
function rueda(R: number, ancho: number, M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'rueda';
  g.add(malla(neumatico(R, ancho), M.goma, 'neumatico'));
  // tambor de la llanta
  const hw = ancho / 2;
  const tambor = new THREE.LatheGeometry([
    new THREE.Vector2(R_LLANTA + 0.006, -hw * 0.88), new THREE.Vector2(R_LLANTA - 0.004, -hw * 0.8), new THREE.Vector2(R_LLANTA - 0.008, -hw * 0.2),
    new THREE.Vector2(R_LLANTA - 0.008, hw * 0.55), new THREE.Vector2(R_LLANTA - 0.004, hw * 0.8), new THREE.Vector2(R_LLANTA + 0.007, hw * 0.88), new THREE.Vector2(R_LLANTA + 0.004, hw * 0.94),
  ], 72);
  tambor.rotateX(Math.PI / 2); g.add(malla(tambor, M.llanta));
  // cara: disco con 8 ventanas trapezoidales (radios)
  const cara = new THREE.Shape(); cara.absarc(0, 0, R_LLANTA - 0.006, 0, Math.PI * 2, false);
  const nv = 8;
  for (let k = 0; k < nv; k++) {
    const a0 = (k / nv) * Math.PI * 2 + 0.17, a1 = ((k + 1) / nv) * Math.PI * 2 - 0.17, r0 = 0.062, r1 = R_LLANTA - 0.024;
    const h = new THREE.Path();
    h.moveTo(r0 * Math.cos(a0 + 0.12), r0 * Math.sin(a0 + 0.12));
    h.lineTo(r1 * Math.cos(a0), r1 * Math.sin(a0));
    h.absarc(0, 0, r1, a0, a1, false);
    h.lineTo(r0 * Math.cos(a1 - 0.12), r0 * Math.sin(a1 - 0.12));
    h.absarc(0, 0, r0, a1 - 0.12, a0 + 0.12, true);
    cara.holes.push(h);
  }
  const gc = extruir(cara, 0.008, 0.004, 7); gc.translate(0, 0, hw * 0.45); g.add(malla(gc, M.llanta, 'llanta'));
  // tapacubos y tornillos
  const tapa = new THREE.LatheGeometry([new THREE.Vector2(0, 0.026), new THREE.Vector2(0.02, 0.024), new THREE.Vector2(0.034, 0.016), new THREE.Vector2(0.04, 0.004), new THREE.Vector2(0.041, 0)], 36);
  tapa.rotateX(Math.PI / 2); tapa.translate(0, 0, hw * 0.45 + 0.008); g.add(malla(tapa, M.grafito));
  const rombo = extruir(romboRenault(0.012), 0.002, 0.0006, 2); rombo.translate(0, 0, hw * 0.45 + 0.036); g.add(malla(rombo, M.cromo));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4, t = new THREE.CylinderGeometry(0.008, 0.009, 0.014, 6);
    t.rotateX(Math.PI / 2); t.translate(0.05 * Math.cos(a), 0.05 * Math.sin(a), hw * 0.45 + 0.012); g.add(malla(t, M.cromo));
  }
  return g;
}

/** El rombo de Renault: contorno con agujero, centrado en el origen, altura 2·s·1.6. */
function romboRenault(s: number): THREE.Shape {
  const h = s * 1.6, w = s;
  const ext = new THREE.Shape(); ext.moveTo(0, h); ext.lineTo(w, 0); ext.lineTo(0, -h); ext.lineTo(-w, 0); ext.closePath();
  const k = 0.55, hole = new THREE.Path();
  hole.moveTo(0, h * k); hole.lineTo(-w * k, 0); hole.lineTo(0, -h * k); hole.lineTo(w * k, 0); hole.closePath();
  ext.holes.push(hole); return ext;
}

/** Muelle helicoidal entre dos puntos. */
function muelle(a: THREE.Vector3, b: THREE.Vector3, r: number, vueltas: number, rh: number): THREE.BufferGeometry {
  const eje = b.clone().sub(a), L = eje.length(); eje.normalize();
  const u = new THREE.Vector3().crossVectors(eje, Math.abs(eje.y) < 0.9 ? v3(0, 1, 0) : v3(1, 0, 0)).normalize(), w = new THREE.Vector3().crossVectors(eje, u);
  const pts: THREE.Vector3[] = [], n = vueltas * 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n, ang = t * vueltas * Math.PI * 2;
    pts.push(a.clone().addScaledVector(eje, L * t).addScaledVector(u, r * Math.cos(ang)).addScaledVector(w, r * Math.sin(ang)));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.round(n * 1.5), rh, 6, false);
}

/**
 * Una esquina: rueda + mangueta + disco y pinza + trapecio inferior + amortiguador
 * con muelle + (delante) bieleta de dirección, (detrás) palier. Centro de la rueda
 * en el origen, Z hacia fuera del coche.
 */
function esquina(delantera: boolean, M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = delantera ? 'esquina-delantera' : 'esquina-trasera';
  const R = delantera ? R_DEL : R_TRAS, ancho = delantera ? ANCHO_DEL : ANCHO_TRAS, via = (delantera ? VIA_DEL : VIA_TRAS) / 2;
  g.add(rueda(R, ancho, M));
  const zi = -ancho / 2; // cara interior
  // disco y pinza
  const disco = new THREE.LatheGeometry([new THREE.Vector2(0.05, -0.006), new THREE.Vector2(0.118, -0.006), new THREE.Vector2(0.118, 0.006), new THREE.Vector2(0.05, 0.006)], 48);
  disco.rotateX(Math.PI / 2); disco.translate(0, 0, zi * 0.35); g.add(malla(disco, M.disco, 'disco'));
  const pinza = extruir(forma([[-0.05, 0.08], [0.05, 0.08], [0.04, 0.125], [-0.04, 0.125]], 0.012), 0.03, 0.004, 4);
  pinza.rotateZ(delantera ? -0.9 : 0.9 + Math.PI); pinza.translate(0, 0, zi * 0.35 - 0.004); g.add(malla(pinza, M.grafito, 'pinza'));
  // mangueta
  const mang = extruir(forma([[-0.03, -0.14], [0.03, -0.14], [0.045, 0.0], [0.03, 0.15], [-0.02, 0.15], [-0.045, 0.0]], 0.015), 0.03, 0.006, 4);
  mang.translate(0, 0, zi - 0.03); g.add(malla(mang, M.acero, 'mangueta'));
  // trapecio inferior (dos brazos hacia el bastidor)
  const zB = -(via - 0.27), rot = v3(0, -0.13, zi - 0.03);
  const brazo = tubo([v3(0.15, -0.1, zB), v3(0.06, -0.12, (zB + zi) / 2), rot], 0.012, 20, 8);
  const brazo2 = tubo([v3(-0.15, -0.1, zB), v3(-0.05, -0.12, (zB + zi) / 2), rot], 0.012, 20, 8);
  g.add(malla(brazo, M.negro, 'trapecio'), malla(brazo2, M.negro));
  for (const x of [0.15, -0.15]) { const s = new THREE.CylinderGeometry(0.02, 0.02, 0.04, 16); s.rotateZ(Math.PI / 2); s.translate(x, -0.1, zB); g.add(malla(s, M.goma)); }
  const rotula = new THREE.SphereGeometry(0.018, 12, 8); rotula.translate(rot.x, rot.y, rot.z); g.add(malla(rotula, M.acero));
  // amortiguador con muelle
  const a0 = v3(0, -0.09, zi - 0.06), a1 = v3(delantera ? -0.02 : 0.02, 0.24, zB - 0.02);
  g.add(barra(a0, a0.clone().lerp(a1, 0.55), 0.022, M.negro));
  g.add(barra(a0.clone().lerp(a1, 0.45), a1, 0.01, M.cromo));
  g.add(malla(muelle(a0.clone().lerp(a1, 0.18), a0.clone().lerp(a1, 0.9), 0.04, 6, 0.0065), M.muelle, 'muelle'));
  for (const t of [0.16, 0.92]) { const c = new THREE.CylinderGeometry(0.05, 0.05, 0.008, 24); const o = malla(c, M.acero); o.position.copy(a0.clone().lerp(a1, t)); o.quaternion.setFromUnitVectors(v3(0, 1, 0), a1.clone().sub(a0).normalize()); g.add(o); }
  if (delantera) {
    g.add(malla(tubo([v3(0.1, -0.02, zi - 0.04), v3(0.11, -0.03, zB + 0.02)], 0.008, 6, 8), M.acero, 'bieleta'));
    const fuelle = new THREE.LatheGeometry([0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => new THREE.Vector2(0.014 + (i % 2) * 0.005, i * 0.008)), 16);
    fuelle.rotateX(-Math.PI / 2); fuelle.translate(0.11, -0.03, zB + 0.03); g.add(malla(fuelle, M.goma));
  } else {
    g.add(barra(v3(0, 0, zi - 0.03), v3(0, -0.02, zB), 0.013, M.acero));
    const fuelle = new THREE.LatheGeometry([0, 1, 2, 3, 4, 5, 6].map(i => new THREE.Vector2(0.02 + (i % 2) * 0.008 + (i === 0 || i === 6 ? -0.006 : 0), i * 0.009)), 16);
    fuelle.rotateX(-Math.PI / 2); fuelle.translate(0, -0.005, zi - 0.04); g.add(malla(fuelle, M.goma));
  }
  return g;
}

/** Guardabarros: perfil en C barrido en arco alrededor de la rueda. */
function guardabarros(R: number, a0: number, a1: number, ancho: number, M: Mats): THREE.Mesh {
  const hw = ancho / 2 + 0.03, c: THREE.Vector2[] = [];
  for (let i = 0; i <= 60; i++) { const a = a0 + (a1 - a0) * (i / 60); c.push(new THREE.Vector2(R * Math.cos(a), R * Math.sin(a))); }
  // a > 0 apunta hacia el centro de la rueda (normal izquierda de un arco antihorario)
  const perfil: [number, number][] = [[0.0, hw + 0.006], [-0.022, hw - 0.002], [-0.032, 0.0], [-0.028, -hw + 0.01], [-0.022, -hw], [-0.016, -hw + 0.008], [-0.026, 0.0], [-0.016, hw - 0.01], [0.004, hw]];
  return malla(barridoXY(c, false, perfil, 0), M.negro, 'guardabarros');
}

// ---------------------------------------------------------------- carrocería
function carroceria(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'carroceria';

  // Bañera inferior (suelo y batería), plástico oscuro.
  g.add(malla(loft([
    E(-1.56, 0.16, 0.42, 0.28, 0.36, 0.36), E(-1.42, 0.13, 0.36, 0.3, 0.4, 0.41), E(-0.9, 0.12, 0.34, 0.31, 0.41, 0.42),
    E(-0.45, 0.12, 0.36, 0.31, 0.41, 0.42), E(-0.25, 0.14, 0.5, 0.3, 0.4, 0.41),
  ], 56, 6), M.grafito, 'banera'));

  // Frente: el morro entre las ruedas delanteras, que sube hasta la base del parabrisas.
  g.add(malla(loft([
    E(-0.34, 0.15, 0.8, 0.3, 0.43, 0.42, 3.4), E(-0.12, 0.16, 0.79, 0.3, 0.43, 0.41, 3.4), E(0.04, 0.17, 0.72, 0.29, 0.42, 0.38, 3.4),
    E(0.16, 0.18, 0.63, 0.28, 0.4, 0.33, 3.4), E(0.24, 0.2, 0.54, 0.26, 0.35, 0.27, 3.2), E(0.28, 0.23, 0.47, 0.22, 0.28, 0.22, 3), E(0.292, 0.27, 0.43, 0.15, 0.19, 0.15, 2.6),
  ], 64, 8), M.blanco, 'morro'));
  // Faldón delantero oscuro con rejilla
  g.add(malla(loft([
    E(0.0, 0.14, 0.32, 0.27, 0.3, 0.3, 3), E(0.15, 0.15, 0.31, 0.25, 0.28, 0.27, 3), E(0.255, 0.17, 0.3, 0.2, 0.22, 0.2, 2.6), E(0.285, 0.2, 0.29, 0.12, 0.13, 0.12, 2.4),
  ], 48, 6), M.negro, 'faldon'));

  // Módulo trasero (tras el pasajero), cerrado y redondeado.
  g.add(malla(loft([
    E(-2.048, 0.62, 1.3, 0.22, 0.27, 0.24, 2.6), E(-2.03, 0.54, 1.38, 0.3, 0.37, 0.33, 3), E(-1.97, 0.5, 1.43, 0.35, 0.41, 0.37, 3.2),
    E(-1.8, 0.47, 1.438, 0.37, 0.43, 0.4, 3.4), E(-1.56, 0.46, 1.44, 0.36, 0.43, 0.4, 3.4),
  ], 64, 8), M.blanco, 'modulo-trasero'));
  // Parte baja trasera: motor y paragolpes (negro)
  g.add(malla(loft([
    E(-2.0, 0.26, 0.54, 0.2, 0.26, 0.28, 3), E(-1.95, 0.21, 0.55, 0.23, 0.28, 0.31, 3.2), E(-1.6, 0.18, 0.54, 0.26, 0.3, 0.33, 3.2), E(-1.45, 0.2, 0.5, 0.26, 0.3, 0.32, 3),
  ], 48, 6), M.negro, 'paragolpes-trasero'));

  // Techo: losa arqueada desde la luneta hasta la visera sobre el parabrisas.
  g.add(malla(loft([
    E(-1.75, 1.37, 1.446, 0.38, 0.4, 0.37, 2.4), E(-1.3, 1.36, 1.448, 0.39, 0.41, 0.38, 2.4), E(-0.85, 1.35, 1.446, 0.39, 0.41, 0.38, 2.4),
    E(-0.6, 1.33, 1.42, 0.39, 0.4, 0.37, 2.4), E(-0.5, 1.33, 1.39, 0.37, 0.38, 0.35, 2.2),
  ], 56, 8), M.blanco, 'techo'));

  // Arco lateral de la célula: techo, montante C curvo, estribo, frente, montante A.
  const lazo = curva2([
    [-0.56, 1.385], [-0.3, 1.16], [-0.08, 0.91], [0.035, 0.75], [-0.13, 0.775], [-0.27, 0.7], [-0.31, 0.45], [-0.36, 0.23],
    [-0.8, 0.21], [-1.25, 0.21], [-1.48, 0.3], [-1.61, 0.58], [-1.66, 0.92], [-1.6, 1.22], [-1.46, 1.37], [-1.0, 1.39],
  ], 130, true);
  for (const s of [1, -1]) g.add(malla(barridoXY(lazo, true, perfilRect(0.08, 0.065, 0.024, 3), s * 0.43), M.blanco, 'marco-lateral'));

  // Parabrisas: superficie curva entre los montantes A, con su junta.
  const pb = parabrisas();
  g.add(malla(pb, M.cristal, 'parabrisas'));
  // Limpiaparabrisas (uno solo, como el Twizy)
  g.add(malla(tubo([v3(0.03, 0.735, 0.12), v3(-0.12, 0.92, 0.0), v3(-0.27, 1.1, -0.14)], 0.006, 16, 6), M.negro, 'limpia'));
  g.add(barra(v3(0.04, 0.72, 0.13), v3(0.0, 0.76, 0.13), 0.01, M.negro));

  // Puertas de tijera (cerradas)
  for (const s of [1, -1]) g.add(puerta(s, M));

  // Retrovisores
  for (const s of [1, -1]) g.add(retrovisor(s, M));

  // Luces delanteras: dos faros redondos por lado en una cápsula.
  for (const s of [1, -1]) g.add(faro(s, M));
  // Rombo de Renault en el morro
  const rg = extruir(romboRenault(0.032), 0.008, 0.003, 2); rg.rotateY(Math.PI / 2);
  const rombo = malla(rg, M.cromo, 'rombo-renault'); rombo.position.set(0.296, 0.37, 0); g.add(rombo);
  // Rejilla del faldón: lamas horizontales
  for (let i = 0; i < 4; i++) {
    const l = new THREE.CapsuleGeometry(0.006, 0.26 - i * 0.02, 4, 10); l.rotateX(Math.PI / 2);
    const o = malla(l, M.grafito); o.position.set(0.282 - i * 0.002, 0.21 + i * 0.022, 0); g.add(o);
  }

  // Trasera: pilotos verticales, tercera luz, luneta, matrícula.
  for (const s of [1, -1]) {
    const pil = extruir(forma([[-0.03, -0.18], [0.03, -0.18], [0.03, 0.18], [-0.03, 0.18]], 0.028), 0.02, 0.006, 8);
    pil.rotateY(Math.PI / 2); const o = malla(pil, M.rojo, 'piloto'); o.position.set(-2.025, 0.86, s * 0.315); o.rotation.y = -s * 0.25; g.add(o);
    const intermit = extruir(forma([[-0.025, -0.03], [0.025, -0.03], [0.025, 0.03], [-0.025, 0.03]], 0.02), 0.01, 0.004, 6);
    intermit.rotateY(Math.PI / 2); const oi = malla(intermit, M.ambar); oi.position.set(-2.03, 0.66, s * 0.31); oi.rotation.y = -s * 0.25; g.add(oi);
  }
  const tercera = extruir(forma([[-0.11, -0.012], [0.11, -0.012], [0.11, 0.012], [-0.11, 0.012]], 0.01), 0.01, 0.003, 4);
  tercera.rotateY(Math.PI / 2); const t3 = malla(tercera, M.rojo); t3.position.set(-2.035, 1.36, 0); g.add(t3);
  const luneta = extruir(forma([[-0.24, -0.13], [0.24, -0.13], [0.22, 0.14], [-0.22, 0.14]], 0.07), 0.006, 0.004, 10);
  luneta.rotateY(Math.PI / 2); const lu = malla(luneta, M.cristalOscuro, 'luneta'); lu.position.set(-2.042, 1.13, 0); g.add(lu);
  g.add(matricula(M));

  // Asideros / rejilla de ventilación del módulo trasero (detalle lateral)
  for (const s of [1, -1]) {
    const rej = extruir(forma([[-0.09, -0.018], [0.09, -0.018], [0.09, 0.018], [-0.09, 0.018]], 0.018), 0.008, 0.003, 6);
    const o = malla(rej, M.negro); o.position.set(-1.88, 1.2, s * 0.405); o.rotation.y = s > 0 ? 0 : Math.PI; o.rotation.x = 0; g.add(o);
  }
  return g;
}

function parabrisas(): THREE.BufferGeometry {
  // u: de abajo (base) a arriba; v: de lado a lado
  const nu = 24, nv = 32, pos: number[] = [], idx: number[] = [];
  const base = v3(0.035, 0.715, 0), techo = v3(-0.53, 1.37, 0);
  for (let i = 0; i <= nu; i++) {
    const u = i / nu;
    const p = base.clone().lerp(techo, u);
    const bombeo = Math.sin(Math.PI * u) * 0.035; // abombado hacia fuera (delante-arriba)
    const w = 0.395 - 0.01 * u;
    for (let j = 0; j <= nv; j++) {
      const v = (j / nv) * 2 - 1;
      const curva = 0.05 * v * v;
      pos.push(p.x + bombeo * 0.7 - curva * 0.8, p.y + bombeo * 0.7 - curva * 0.5, v * w);
    }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function puerta(s: number, M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'puerta';
  const contorno: [number, number][] = [[-0.3, 0.27], [-0.3, 0.76], [-0.7, 0.83], [-1.2, 0.92], [-1.46, 0.84], [-1.565, 0.68], [-1.55, 0.44], [-1.44, 0.29]];
  const sh = forma(contorno, [0.03, 0.04, 0.3, 0.12, 0.12, 0.1, 0.08, 0.06]);
  const p = malla(extruir(sh, 0.022, 0.009, 16), M.blanco, 'panel-puerta'); p.position.z = s * 0.445; g.add(p);
  // embellecedor de color y moldura negra inferior
  const franja = forma([[-0.36, 0.5], [-1.45, 0.47], [-1.5, 0.53], [-0.38, 0.565]], 0.02);
  const f = malla(extruir(franja, 0.006, 0.003, 6), M.acento, 'franja-puerta'); f.position.z = s * 0.4605; g.add(f);
  const mold = forma([[-0.33, 0.29], [-1.42, 0.31], [-1.48, 0.37], [-0.34, 0.36]], 0.02);
  const mo = malla(extruir(mold, 0.006, 0.003, 6), M.negro); mo.position.z = s * 0.4605; g.add(mo);
  // tirador empotrado
  const tir = extruir(forma([[-0.06, -0.012], [0.06, -0.012], [0.06, 0.012], [-0.06, 0.012]], 0.012), 0.006, 0.003, 6);
  const t = malla(tir, M.negro); t.position.set(-1.25, 0.76, s * 0.46); g.add(t);
  // bisagra (puerta de tijera: gira hacia arriba en el montante A)
  const bis = new THREE.CylinderGeometry(0.018, 0.018, 0.05, 16); bis.rotateX(Math.PI / 2);
  const b = malla(bis, M.grafito); b.position.set(-0.27, 0.8, s * 0.43); g.add(b);
  return g;
}

function retrovisor(s: number, M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'retrovisor';
  g.add(malla(tubo([v3(-0.4, 0.86, s * 0.455), v3(-0.44, 0.9, s * 0.54), v3(-0.5, 0.9, s * 0.57)], 0.011, 12, 8), M.negro));
  const carcasa = new THREE.SphereGeometry(1, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.62);
  carcasa.rotateZ(-Math.PI / 2); // cúpula hacia delante, boca (espejo) hacia atrás
  carcasa.scale(0.06, 0.055, 0.09);
  const c = malla(carcasa, M.acento, 'carcasa-retrovisor'); c.position.set(-0.5, 0.905, s * 0.6); c.rotation.y = s * 0.12; g.add(c);
  const espejo = new THREE.CircleGeometry(1, 28); espejo.rotateY(-Math.PI / 2); espejo.scale(1, 0.048, 0.08);
  const e = malla(espejo, M.cromo); e.position.set(-0.522, 0.905, s * 0.6); e.rotation.y = s * 0.12; g.add(e);
  return g;
}

function faro(s: number, M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'faro';
  g.position.set(0.225, 0.5, s * 0.255); g.rotation.y = s * 0.22; g.rotation.z = -0.06;
  // carcasa en cápsula (dos círculos), extruida hacia delante
  const cap = new THREE.Shape(); const r = 0.056, d = 0.045;
  cap.absarc(0, d, r, 0, Math.PI, false); cap.absarc(0, -d, r, Math.PI, Math.PI * 2, false); cap.closePath();
  const gc = extruir(cap, 0.07, 0.008, 20); gc.rotateY(Math.PI / 2); g.add(malla(gc, M.negro, 'carcasa-faro'));
  for (const [dy, rr] of [[d, 0.046], [-d, 0.04]] as [number, number][]) {
    const refl = new THREE.LatheGeometry([new THREE.Vector2(0.004, -0.02), new THREE.Vector2(rr * 0.5, -0.012), new THREE.Vector2(rr * 0.85, 0.0), new THREE.Vector2(rr, 0.014)], 28);
    refl.rotateZ(-Math.PI / 2); refl.translate(0.03, dy, 0); g.add(malla(refl, M.reflector));
    const bombilla = new THREE.SphereGeometry(0.013, 12, 8); bombilla.translate(0.022, dy, 0); g.add(malla(bombilla, M.luzBlanca));
    const anilloG = new THREE.TorusGeometry(rr + 0.003, 0.0045, 8, 32); anilloG.rotateY(Math.PI / 2); anilloG.translate(0.044, dy, 0); g.add(malla(anilloG, M.cromo));
  }
  const lente = new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.3); lente.rotateZ(-Math.PI / 2);
  lente.scale(0.08, 0.125, 0.07); lente.translate(-0.033, 0, 0); g.add(malla(lente, M.faroLente, 'lente'));
  // intermitente bajo el faro
  const int = extruir(forma([[-0.025, -0.008], [0.025, -0.008], [0.025, 0.008], [-0.025, 0.008]], 0.007), 0.01, 0.003, 4);
  int.rotateY(Math.PI / 2); int.translate(0.03, -0.11, 0); g.add(malla(int, M.ambar));
  return g;
}

function matricula(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'matricula';
  const placa = extruir(forma([[-0.27, -0.062], [0.27, -0.062], [0.27, 0.062], [-0.27, 0.062]], 0.012), 0.006, 0.002, 4);
  placa.rotateY(-Math.PI / 2);
  let mat: THREE.Material = M.blanco;
  if (typeof document !== 'undefined') {
    const cv = document.createElement('canvas'); cv.width = 1040; cv.height = 220;
    const c = cv.getContext('2d');
    if (c) {
      c.fillStyle = '#f7f7f2'; c.fillRect(0, 0, 1040, 220);
      c.fillStyle = '#1f4fb0'; c.fillRect(0, 0, 90, 220);
      c.fillStyle = '#ffd400'; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; c.beginPath(); c.arc(45 + 26 * Math.cos(a), 70 + 26 * Math.sin(a), 4, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#fff'; c.font = 'bold 54px sans-serif'; c.textAlign = 'center'; c.fillText('E', 45, 185);
      c.fillStyle = '#111'; c.font = 'bold 150px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('4821 KTW', 565, 118);
      c.strokeStyle = '#111'; c.lineWidth = 8; c.strokeRect(4, 4, 1032, 212);
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
      tx.wrapS = THREE.RepeatWrapping; tx.repeat.x = -1; // la cara mira hacia atrás: se invierte para leerse bien
      mat = new THREE.MeshPhysicalMaterial({ map: tx, roughness: 0.35, clearcoat: 0.5 });
    }
  }
  // UV de la cara trasera: la placa extruida no trae UV útiles, así que se usa un plano encima.
  const fondo = malla(placa, M.negro); fondo.position.set(-2.008, 0.42, 0); g.add(fondo);
  const cara = new THREE.PlaneGeometry(0.52, 0.11); cara.rotateY(-Math.PI / 2);
  const o = malla(cara, mat, 'placa'); o.position.set(-2.0155, 0.42, 0); g.add(o);
  return g;
}

// ---------------------------------------------------------------- interior
function interior(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'interior';
  // salpicadero
  const sal = forma([[0.03, 0.71], [-0.2, 0.86], [-0.27, 0.84], [-0.24, 0.66], [-0.12, 0.52], [0.02, 0.5]], [0.02, 0.05, 0.04, 0.08, 0.06, 0.02]);
  g.add(malla(extruir(sal, 0.72, 0.02, 12), M.grafito, 'salpicadero'));
  // pantalla de instrumentos
  const pan = extruir(forma([[-0.06, -0.035], [0.06, -0.035], [0.05, 0.035], [-0.05, 0.035]], 0.012), 0.02, 0.005, 6);
  pan.rotateY(-Math.PI / 2); pan.rotateZ(-0.5); const po = malla(pan, M.pantalla, 'cuadro'); po.position.set(-0.22, 0.9, 0); g.add(po);
  // volante + columna
  const vol = new THREE.Group(); vol.name = 'volante';
  const aro = new THREE.TorusGeometry(0.165, 0.016, 12, 48); vol.add(malla(aro, M.negro));
  for (const a of [Math.PI / 2 + Math.PI, Math.PI / 6, Math.PI - Math.PI / 6]) vol.add(barra(v3(0, 0, 0), v3(0.16 * Math.cos(a), 0.16 * Math.sin(a), 0), 0.012, M.negro, 0.016));
  const buje = new THREE.CylinderGeometry(0.05, 0.055, 0.04, 24); buje.rotateX(Math.PI / 2); vol.add(malla(buje, M.negro));
  const logo = extruir(romboRenault(0.012), 0.002, 0.0006, 2); logo.translate(0, 0, 0.022); vol.add(malla(logo, M.cromo));
  vol.position.set(-0.43, 0.89, 0); vol.rotation.y = -Math.PI / 2; vol.rotateX(-0.45);
  g.add(vol);
  g.add(barra(v3(-0.42, 0.88, 0), v3(-0.2, 0.74, 0), 0.03, M.negro, 0.04));
  // asiento del conductor (cojín + respaldo + reposacabezas)
  const cojin = forma([[-1.06, 0.4], [-0.62, 0.42], [-0.6, 0.5], [-1.04, 0.5]], [0.04, 0.04, 0.04, 0.04]);
  g.add(malla(extruir(cojin, 0.4, 0.03, 8), M.tela, 'asiento-conductor'));
  const resp = forma([[-1.1, 0.47], [-1.02, 0.5], [-1.09, 1.0], [-1.18, 1.02], [-1.19, 0.98]], [0.03, 0.04, 0.05, 0.05, 0.04]);
  g.add(malla(extruir(resp, 0.42, 0.03, 8), M.tela));
  const cab = forma([[-1.1, 1.04], [-1.13, 1.2], [-1.21, 1.2], [-1.19, 1.04]], 0.04);
  g.add(malla(extruir(cab, 0.24, 0.02, 8), M.tela));
  for (const z of [0.15, -0.15]) g.add(barra(v3(-0.85, 0.36, z), v3(-0.85, 0.42, z), 0.012, M.acero));
  g.add(malla(tubo([v3(-1.15, 0.42, 0.15), v3(-1.1, 0.75, 0.2), v3(-1.15, 1.05, 0.18)], 0.004, 12, 6), M.negro)); // cinturón
  // asiento trasero, más alto, a horcajadas detrás del conductor
  const cojT = forma([[-1.57, 0.6], [-1.24, 0.6], [-1.22, 0.68], [-1.56, 0.7]], 0.035);
  g.add(malla(extruir(cojT, 0.46, 0.03, 8), M.tela, 'asiento-trasero'));
  const respT = forma([[-1.6, 0.68], [-1.53, 0.7], [-1.55, 1.2], [-1.62, 1.22]], 0.035);
  g.add(malla(extruir(respT, 0.44, 0.03, 8), M.tela));
  // reposapiés del pasajero a los lados del conductor
  for (const s of [1, -1]) {
    const rp = extruir(forma([[-1.15, 0.0], [-0.85, 0.0], [-0.85, 0.03], [-1.15, 0.03]], 0.01), 0.06, 0.006, 4);
    const o = malla(rp, M.negro); o.position.set(0, 0.33, s * 0.32); g.add(o);
  }
  // pedales
  for (const z of [0.06, -0.06]) { const p = extruir(forma([[-0.03, -0.04], [0.03, -0.04], [0.03, 0.04], [-0.03, 0.04]], 0.01), 0.05, 0.004, 4); p.rotateZ(0.4); const o = malla(p, M.acero); o.position.set(-0.1, 0.42, z); g.add(o); }
  return g;
}

// ---------------------------------------------------------------- conjunto
function construir(): THREE.Group {
  const M = materiales();
  const g = new THREE.Group(); g.name = 'twizy';
  g.add(carroceria(M));
  g.add(interior(M));
  const ruedas: [number, number, boolean][] = [[0, R_DEL, true], [-BATALLA, R_TRAS, false]];
  for (const [x, R, del] of ruedas) for (const s of [1, -1]) {
    const via = (del ? VIA_DEL : VIA_TRAS) / 2;
    const e = esquina(del, M); e.position.set(x, R, s * via); e.scale.z = s; g.add(e);
    // guardabarros: delante cubre de 5° (delante) a 205° (detrás); detrás al revés
    const gb = del ? guardabarros(R + 0.028, 0.1, Math.PI * 1.13, ANCHO_DEL, M) : guardabarros(R + 0.028, -0.14 * Math.PI, Math.PI * 0.97, ANCHO_TRAS, M);
    gb.position.set(x, R, s * via); g.add(gb);
    // soporte del guardabarros
    const sop = tubo([v3(x + (del ? -0.04 : 0.04), R + 0.08, s * (via - 0.08)), v3(x, R + R * 0.95, s * (via - 0.05))], 0.01, 6, 8);
    g.add(malla(sop, M.negro));
  }
  return g;
}

export const VEHICULO: VehiculoGaraje = {
  id: 'twizy', nombre: 'Renault Twizy',
  largo: 2.338, ancho: 1.237, alto: 1.454, batalla: BATALLA,
  fuente: 'Renault, ficha técnica Twizy 80 (2012): largo 2 338 mm, ancho 1 237 mm (1 381 con retrovisores), alto 1 454 mm, batalla 1 686 mm, vías 1 094/1 080 mm; forma contrastada con el modelo «SD Twizy» de StreetDrone (2020)',
  construir,
};

import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { pedirTunel, type OpcionesTunel } from './tunel/cliente';
import { envolventeModelo, peticionDe, type CuerpoTunel } from './tunel/cuerpos';
import type { ResultadoTunel } from './tunel/calculo';
import { modeloEstela, puntosDe, type TipoPunto } from './tunel/puntos';
import { COLOR_ESTELA, colorDeCp } from './tunel/colores';
import { CALIBRACION } from './tunel/calibracion';

/**
 * Wind tunnel in the 3D view (2026-11-07, Eugenio: «un efecto túnel de viento
 * para comparar ambos vehículos»; 2026-11-09: «un mejor túnel de viento, con
 * mayor precisión, datos y visualizaciones de los puntos críticos con una mayor
 * granularidad»).
 *
 * Since 2026-11-09 the flow is computed, not drawn by hand: a potential-flow
 * panel method with the road as a mirror image (tunel/paneles.ts), a boundary
 * layer along surface streamlines to predict separation (tunel/capaLimite.ts)
 * and a drag estimate calibrated on the garage cars (tunel/arrastre.ts), all in
 * a Web Worker (tunel/cliente.ts). What this file draws, per body:
 *  · the skin: the body's silhouette painted with the computed Cp, panel by
 *    panel and smoothed between them, translucent so the real car shows through;
 *  · streamlines integrated through the computed velocity field, coloured by
 *    the local Cp, with smoke particles running at the local speed;
 *  · critical points: the stagnation point, the suction peaks, where the
 *    pressure starts to rise (adverse gradient) and the predicted separation line;
 *  · the wake behind the separation line. The wake's SHAPE is a model (a
 *    recirculation bubble about 1.2 × √(base area) long, then a slowly widening
 *    wake): potential flow has no wake, so inside it the smoke goes straight back.
 *
 * Viewer axes: X forward (the car drives to +X, so the air goes to −X), Y up, Z to the side. Metres.
 */

export { envolventeModelo };
export type { CuerpoTunel };
/** [x, y of the body's bottom, y of the roof, half width]. */
export type Envolvente = [number, number, number, number][];

const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Text label that always faces the camera: name on top and up to two lines of data (separated by «\n»). */
export function cartel(texto: string): THREE.Sprite {
  const lineas = texto.split('\n').slice(0, 3);
  const W = 720, H = lineas.length === 1 ? 120 : lineas.length === 2 ? 168 : 214;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  g.fillStyle = 'rgba(255,255,255,0.94)'; g.strokeStyle = 'rgba(15,23,42,0.18)'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(4, 4, W - 8, H - 8, 28); g.fill(); g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  lineas.forEach((l, k) => {
    let px = k === 0 ? 56 : k === 1 ? 44 : 34;
    const peso = k === 2 ? 500 : 700;
    // que quepa: se encoge la letra hasta que el texto entra en el cartel
    do { g.font = `${peso} ${px}px Inter, system-ui, sans-serif`; px -= 2; } while (g.measureText(l).width > W - 48 && px > 18);
    g.fillStyle = k === 0 ? '#0f172a' : k === 1 ? '#0369a1' : '#475569';
    g.fillText(l, W / 2, 58 + k * 50 - (lineas.length === 1 ? -2 : 0));
  });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  // Tamaño fijo en pantalla (no crece al acercarse): con la cámara de 32°, 0,042 es ~7 % del alto de la vista.
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, toneMapped: false, sizeAttenuation: false }));
  const alto = 0.042 * H / 214;
  sp.scale.set(alto * W / H, alto, 1); sp.renderOrder = 6; return sp;
}

/**
 * A short label for a critical point: one line, a coloured dot, small and fixed on screen.
 * `pulsable`: it opens its explanation, so it carries an «i» at the end (2026-11-09).
 */
function etiqueta(texto: string, color: string, pulsable = false): THREE.Sprite {
  const cv = document.createElement('canvas'), g = cv.getContext('2d')!, px = 30;
  g.font = `600 ${px}px Inter, system-ui, sans-serif`;
  const W = Math.ceil(g.measureText(texto).width) + 66 + (pulsable ? 44 : 0), H = 52;
  cv.width = W; cv.height = H;
  g.fillStyle = 'rgba(255,255,255,0.92)'; g.strokeStyle = pulsable ? 'rgba(3,105,161,0.55)' : 'rgba(15,23,42,0.22)'; g.lineWidth = pulsable ? 3 : 2;
  g.beginPath(); g.roundRect(2, 2, W - 4, H - 4, 14); g.fill(); g.stroke();
  g.fillStyle = color; g.beginPath(); g.arc(26, H / 2, 9, 0, Math.PI * 2); g.fill();
  g.font = `600 ${px}px Inter, system-ui, sans-serif`; g.fillStyle = '#0f172a'; g.textBaseline = 'middle'; g.fillText(texto, 44, H / 2 + 1);
  if (pulsable) {
    const cx = W - 30;
    g.fillStyle = '#0369a1'; g.beginPath(); g.arc(cx, H / 2, 14, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.font = `700 22px Georgia, serif`; g.textAlign = 'center'; g.fillText('i', cx, H / 2 + 1);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, toneMapped: false, sizeAttenuation: false }));
  const alto = 0.021; sp.scale.set(alto * W / H, alto, 1); sp.renderOrder = 7;
  sp.center.set(0, 0.5); // the label starts at the point and runs to the right
  return sp;
}

/** A critical point of one body: what a click on its label (or a row of the card) selects. */
export interface SeleccionTunel { cuerpo: string; punto: string }

export interface Tunel {
  grupo: THREE.Group;
  actualizar: (t: number, ancho: number, alto: number, camara?: THREE.Camera) => void;
  /** Visibility toggles and speed (no recalculation). */
  ajustar: (o: OpcionesTunel) => void;
  /** The point label under a click or a tap, if any. */
  elegir: (ray: THREE.Raycaster) => SeleccionTunel | null;
  /** Marks the label whose explanation is open. */
  resaltar: (sel: SeleccionTunel | null) => void;
  liberar: () => void;
}

const lin = (c: number) => Math.pow(c, 2.2); // sRGB → linear, for vertex colours

/**
 * Keeps an overlay out of the viewer's ambient-occlusion pass. GTAOPass draws every
 * mesh into its own depth/normal buffer and only skips objects flagged as points or
 * lines (`isPoints`, `isLine`, `isLine2`): a translucent wake tube counted as solid
 * and came out as a black band. The flag is read nowhere else in three.js.
 */
function sinAO<T extends THREE.Object3D>(o: T): T { (o as unknown as { isLine2: boolean }).isLine2 = true; return o; }
const CSS: Record<TipoPunto, string> = { remanso: '#dc2626', succion: '#1d4ed8', adverso: '#d97706', separacion: '#be185d', estela: '#7c3aed', burbuja: '#0f766e' };

/** Builds everything for one body once its result is there. */
function construirCuerpo(c: CuerpoTunel, R: ResultadoTunel, mats: Materiales, o: OpcionesTunel) {
  const grupo = new THREE.Group(), geos: (THREE.BufferGeometry | LineSegmentsGeometry)[] = [], etiquetas: THREE.Sprite[] = [], guias: THREE.Line[] = [];
  const partes = { piel: new THREE.Group(), lineas: new THREE.Group(), criticos: new THREE.Group(), estela: new THREE.Group() };
  Object.values(partes).forEach(p => grupo.add(p));
  const nuestro = c.id === 'aeromovil';

  // ---------- skin: both halves, pushed 8 mm out so it does not fight the car's own paint
  {
    const { nI, nJ, nodos, cp } = R.piel, W = nJ + 1, nv = (nI + 1) * W;
    const pos = new Float32Array(nv * 2 * 3), col = new Float32Array(nv * 2 * 3), idx: number[] = [], rgb = [0, 0, 0];
    for (let q = 0; q < nv; q++) {
      for (let h = 0; h < 2; h++) { const o3 = (q + h * nv) * 3; pos[o3] = nodos[3 * q]; pos[o3 + 1] = nodos[3 * q + 1]; pos[o3 + 2] = (h ? -1 : 1) * nodos[3 * q + 2]; }
      colorDeCp(cp[q], rgb); for (let h = 0; h < 2; h++) for (let k = 0; k < 3; k++) col[(q + h * nv) * 3 + k] = lin(rgb[k]);
    }
    // winding: outward on the + half, decided on a quad in the middle
    const i0 = nI >> 1, j0 = nJ >> 1, P = (i: number, j: number) => new THREE.Vector3(nodos[3 * (i * W + j)], nodos[3 * (i * W + j) + 1], nodos[3 * (i * W + j) + 2]);
    const a = P(i0, j0), b = P(i0 + 1, j0), d = P(i0, j0 + 1), n = b.clone().sub(a).cross(d.clone().sub(a));
    let yc = 0; for (let j = 0; j <= nJ; j++) yc += nodos[3 * (i0 * W + j) + 1]; yc /= W;
    const directo = n.y * (a.y - yc) + n.z * a.z > 0;
    for (let h = 0; h < 2; h++) for (let i = 0; i < nI; i++) for (let j = 0; j < nJ; j++) {
      const q00 = h * nv + i * W + j, q10 = q00 + W, q01 = q00 + 1, q11 = q10 + 1;
      if (directo !== (h === 1)) idx.push(q00, q10, q01, q01, q10, q11); else idx.push(q00, q01, q10, q01, q11, q10);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
    g.computeVertexNormals();
    const nrm = g.attributes.normal as THREE.BufferAttribute;
    for (let v = 0; v < pos.length / 3; v++) { pos[3 * v] += nrm.getX(v) * 0.008; pos[3 * v + 1] += nrm.getY(v) * 0.008; pos[3 * v + 2] += nrm.getZ(v) * 0.008; }
    const piel = sinAO(new THREE.Mesh(g, mats.piel)); piel.renderOrder = 1; partes.piel.add(piel); geos.push(g);
    // the panel grid, faint: it shows the granularity the flow was solved at
    const ej: number[] = [];
    for (let h = 0; h < 2; h++) for (let i = 0; i <= nI; i++) for (let j = 0; j <= nJ; j++) {
      const q = h * nv + i * W + j;
      if (i < nI) ej.push(q, q + W);
      if (j < nJ) ej.push(q, q + 1);
    }
    const gr = new THREE.BufferGeometry(); gr.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gr.setIndex(ej);
    const rejilla = new THREE.LineSegments(gr, mats.rejilla); rejilla.renderOrder = 1; partes.piel.add(rejilla); geos.push(gr);
  }

  // ---------- speed-dependent parts: streamlines (their wake), critical lines, wake
  const particulas: { geo: THREE.BufferGeometry; lineas: { p: Float32Array; t: Float32Array; T: number; estela: Float32Array }[] }[] = [];
  const porVelocidad = (kmh: number) => R.porVelocidad.find(q => q.kmh === kmh) ?? R.porVelocidad[1];
  const compartidos = new Set<unknown>([mats.piel, mats.rejilla, mats.linea, mats.punto, mats.estela, mats.bordeEstela, mats.guia]);
  const vaciar = (g: THREE.Group) => {
    for (const ch of [...g.children]) {
      g.remove(ch);
      ch.traverse((x: any) => {
        if (x.geometry && x.geometry !== mats.esfera) x.geometry.dispose();
        const m = x.material;
        if (m && !compartidos.has(m)) { m.map?.dispose(); m.dispose(); const i = mats.extra.indexOf(m); if (i >= 0) mats.extra.splice(i, 1); }
      });
    }
  };
  let kmhHecho = -1;
  const construirVelocidad = (kmh: number) => {
    if (kmh === kmhHecho) return; kmhHecho = kmh;
    vaciar(partes.lineas); vaciar(partes.criticos); vaciar(partes.estela); particulas.length = 0;
    for (let k = etiquetas.length - 1; k >= 0; k--) if (!etiquetas[k].parent) etiquetas.splice(k, 1);
    guias.length = 0;
    const q = porVelocidad(kmh), E = modeloEstela(q);

    // streamlines: computed through the potential flow up to the wake, then straight back (the wake's model)
    const seg: number[] = [], segCol: number[] = [], lineasP: { p: Float32Array; t: Float32Array; T: number; estela: Float32Array }[] = [];
    const L = R.lineas, nL = L.inicio.length, rgb = [0, 0, 0], viol = new THREE.Color(COLOR_ESTELA), gris = new THREE.Color(0xcbd5e1);
    for (let l = 0; l < nL; l++) {
      const a = L.inicio[l], b = l + 1 < nL ? L.inicio[l + 1] : L.v.length;
      if (b - a < 2) continue;
      const pts: number[] = [], vel: number[] = [], est: number[] = [];
      let enEstela = -1;
      for (let i = a; i < b; i++) {
        const x = L.p[3 * i], y = L.p[3 * i + 1], z = L.p[3 * i + 2];
        if (E.dentro(x, y, z) > 0) { enEstela = i; break; }
        pts.push(x, y, z); vel.push(L.v[i]); est.push(0);
      }
      if (enEstela >= 0) {
        const x0 = L.p[3 * enEstela], y0 = L.p[3 * enEstela + 1], z0 = L.p[3 * enEstela + 2], xFin = L.p[3 * (b - 1)];
        const fase = l * 1.37;
        for (let x = x0; x > xFin; x -= 0.06) {
          const d = (x0 - x) / E.Lmax, w = Math.max(0, 1 - d);
          const amp = 0.035 * w;
          pts.push(x, Math.max(0.01, y0 + amp * Math.sin(x * 7.3 + fase)), z0 + amp * Math.cos(x * 6.1 + fase * 1.7));
          vel.push(0.35 + 0.55 * Math.min(1, d)); est.push(w);
        }
      }
      for (const espejo of L.centro[l] ? [1] : [1, -1]) {
        const n = vel.length, p = new Float32Array(n * 3), t = new Float32Array(n), e = new Float32Array(est);
        let T = 0;
        for (let i = 0; i < n; i++) {
          p[3 * i] = pts[3 * i]; p[3 * i + 1] = pts[3 * i + 1]; p[3 * i + 2] = espejo * pts[3 * i + 2];
          if (i > 0) T += Math.hypot(p[3 * i] - p[3 * i - 3], p[3 * i + 1] - p[3 * i - 2], p[3 * i + 2] - p[3 * i - 1]) / Math.max(0.15, vel[i]);
          t[i] = T;
        }
        lineasP.push({ p, t, T, estela: e });
        for (let i = 0; i + 1 < n; i++) {
          seg.push(p[3 * i], p[3 * i + 1], p[3 * i + 2], p[3 * i + 3], p[3 * i + 4], p[3 * i + 5]);
          for (const k of [i, i + 1]) {
            if (est[k] > 0) { const cc = gris.clone().lerp(viol, Math.min(1, 0.35 + est[k])); segCol.push(cc.r, cc.g, cc.b); }
            else { colorDeCp(1 - vel[k] * vel[k], rgb); segCol.push(lin(rgb[0]), lin(rgb[1]), lin(rgb[2])); }
          }
        }
      }
    }
    if (seg.length) {
      const lg = new LineSegmentsGeometry(); lg.setPositions(seg); lg.setColors(segCol);
      const ls = sinAO(new LineSegments2(lg, mats.linea)); ls.renderOrder = 2; partes.lineas.add(ls);
      // smoke particles: 5 per line, running at the local speed
      const POR = 5, nP = lineasP.length * POR, pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nP * 3), 3));
      pg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nP * 3).fill(0.95), 3));
      const pts = new THREE.Points(pg, mats.punto); pts.frustumCulled = false; pts.renderOrder = 3; partes.lineas.add(pts);
      particulas.push({ geo: pg, lineas: lineasP });
    }

    // Critical points. The flow is symmetric, so each label goes on the −z side, the one the
    // default views look at, a little away from its point and tied to it by a thin leader.
    // Every label opens its explanation (2026-11-09, Eugenio): it carries which body and which point.
    const marcar = (p: number[], color: string, radio = 0.028) => {
      const m = sinAO(new THREE.Mesh(mats.esfera, new THREE.MeshBasicMaterial({ color: new THREE.Color(color), toneMapped: false, depthTest: false, transparent: true, opacity: 0.95 })));
      m.position.set(p[0], p[1], p[2]); m.scale.setScalar(radio); m.renderOrder = 6; partes.criticos.add(m);
      return m;
    };
    const puntos = puntosDe(R, kmh);
    const rotular = (grupoR: THREE.Group, punto: (typeof puntos)[number]) => {
      const p = punto.ancla, d = punto.desplaza, q2 = new THREE.Vector3(p[0] + d[0], p[1] + d[1], p[2] + d[2]);
      const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p[0], p[1], p[2]), q2.clone()]);
      const l = new THREE.Line(lg, mats.guia); l.renderOrder = 6; grupoR.add(l); guias.push(l);
      const e = etiqueta(punto.etiqueta, CSS[punto.tipo], true); e.position.copy(q2); grupoR.add(e); etiquetas.push(e);
      e.userData.tunel = { cuerpo: c.id, punto: punto.id };
      e.userData.base = q2.clone(); e.userData.guia = l;
    };
    for (const k of R.criticos) {
      if (k.tipo === 'remanso') { marcar(k.p, CSS.remanso, 0.035); continue; }
      if (k.p[0] < q.xSeparacion - 0.02) continue; // behind the separation the real air has left: no ideal-flow peak there
      marcar(k.p, CSS.succion); if (k.p[2] > 0.05) marcar([k.p[0], k.p[1], -k.p[2]], CSS.succion);
    }
    for (let k = 0; k < q.burbujas.length / 3; k++) marcar([q.burbujas[3 * k], q.burbujas[3 * k + 1], q.burbujas[3 * k + 2]], CSS.burbuja, 0.02);
    for (const pt of puntos) if (pt.tipo !== 'estela') rotular(partes.criticos, pt);
    const polilinea = (pts3: number[], color: string, ancho: number, discontinua: boolean) => {
      const K = pts3.length / 3, P: number[] = [];
      for (let k = 0; k < K; k++) P.push(pts3[3 * k], pts3[3 * k + 1], pts3[3 * k + 2]);
      for (let k = K - 1; k >= 0; k--) P.push(pts3[3 * k], pts3[3 * k + 1], -pts3[3 * k + 2]);
      const s: number[] = [];
      for (let k = 0; k + 1 < P.length / 3; k++) s.push(P[3 * k], P[3 * k + 1], P[3 * k + 2], P[3 * k + 3], P[3 * k + 4], P[3 * k + 5]);
      const g = new LineSegmentsGeometry(); g.setPositions(s);
      const m = new LineMaterial({ color: new THREE.Color(color).getHex(), linewidth: ancho, worldUnits: false, dashed: discontinua, dashSize: 0.05, gapSize: 0.035, depthTest: true, transparent: true, toneMapped: false });
      mats.extra.push(m);
      const l = sinAO(new LineSegments2(g, m)); if (discontinua) l.computeLineDistances(); l.renderOrder = 5; partes.criticos.add(l);
    };
    polilinea(q.separacion, CSS.separacion, 4, false);
    polilinea(q.adverso, CSS.adverso, 3, true);

    // wake: a translucent tube from the separation loop
    {
      const ring = E.anillo, nR = ring.length, pasos = 18, pos: number[] = [], idx: number[] = [];
      for (let s = 0; s <= pasos; s++) {
        const d = E.Lmax * s / pasos, f = E.f(d);
        for (const p of ring) pos.push(p.x - d, Math.max(0.005, E.yc + (p.y - E.yc) * f), p.z * f);
      }
      for (let s = 0; s < pasos; s++) for (let k = 0; k < nR; k++) {
        const a = s * nR + k, b = s * nR + (k + 1) % nR, cc = a + nR, dd = b + nR;
        idx.push(a, b, cc, b, dd, cc);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      const al = new Float32Array(pos.length / 3); for (let s = 0; s <= pasos; s++) for (let k = 0; k < nR; k++) al[s * nR + k] = 1 - s / pasos;
      g.setAttribute('alfa', new THREE.BufferAttribute(al, 1));
      const m = sinAO(new THREE.Mesh(g, mats.estela)); m.renderOrder = 1; partes.estela.add(m);
      // outline: the loop where the bubble closes, and the top and both side edges
      // (ring order: this half bottom → top, then the mirror half top → bottom)
      const borde = (sel: (s: number) => [number, number, number]) => { const s: number[] = []; for (let i = 0; i < pasos; i++) s.push(...sel(i), ...sel(i + 1)); return s; };
      const Kh = nR / 2, kArriba = Kh - 1, kLado = Kh >> 1, kLado2 = nR - 1 - (Kh >> 1);
      const punto = (s: number, k: number): [number, number, number] => [pos[3 * (s * nR + k)], pos[3 * (s * nR + k) + 1], pos[3 * (s * nR + k) + 2]];
      const sBurb = Math.max(1, Math.round(E.Lb / E.Lmax * pasos));
      const contorno: number[] = [...borde(s => punto(s, kArriba)), ...borde(s => punto(s, kLado)), ...borde(s => punto(s, kLado2))];
      for (let k = 0; k < nR; k++) contorno.push(...punto(sBurb, k), ...punto(sBurb, (k + 1) % nR));
      const lg = new LineSegmentsGeometry(); lg.setPositions(contorno);
      const ls = sinAO(new LineSegments2(lg, mats.bordeEstela)); ls.computeLineDistances(); ls.renderOrder = 4; partes.estela.add(ls);
      const pe = puntos.find(pt => pt.tipo === 'estela'); if (pe) rotular(partes.estela, pe);
    }
  };
  construirVelocidad(o.kmh);

  const ajustar = (op: OpcionesTunel) => {
    construirVelocidad(op.kmh);
    partes.piel.visible = op.piel; partes.lineas.visible = op.verLineas; partes.criticos.visible = op.criticos; partes.estela.visible = op.estela;
  };
  ajustar(o);
  const liberar = () => {
    vaciar(partes.lineas); vaciar(partes.criticos); vaciar(partes.estela);
    for (const g of geos) g.dispose();
  };
  return { grupo, particulas, etiquetas, guias, ajustar, liberar, nuestro, porVelocidad };
}

interface Materiales {
  piel: THREE.MeshBasicMaterial; rejilla: THREE.LineBasicMaterial; linea: LineMaterial; punto: THREE.PointsMaterial; esfera: THREE.SphereGeometry;
  estela: THREE.ShaderMaterial; bordeEstela: LineMaterial; guia: THREE.LineBasicMaterial; extra: LineMaterial[]; textura: THREE.Texture;
}

/** Round texture for the smoke particles. */
function puntoRedondo(): THREE.Texture {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Builds the tunnel for all bodies. Each body appears as soon as its flow is computed (ours first). */
export function crearTunel(cuerpos: CuerpoTunel[], opciones: OpcionesTunel): Tunel {
  const grupo = new THREE.Group(); grupo.name = 'tunel-de-viento';
  const textura = puntoRedondo();
  const mats: Materiales = {
    // translucent and unlit: the colours are exactly the legend's, and the real car shows through
    piel: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.62, depthWrite: false, toneMapped: false, side: THREE.FrontSide }),
    rejilla: new THREE.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.13, depthWrite: false }),
    linea: new LineMaterial({ linewidth: 1.6, vertexColors: true, transparent: true, opacity: 0.9, worldUnits: false, depthWrite: false, toneMapped: false }),
    punto: new THREE.PointsMaterial({ size: 0.16, sizeAttenuation: true, map: textura, vertexColors: true, transparent: true, depthWrite: false, opacity: 0.95 }),
    esfera: new THREE.SphereGeometry(1, 16, 10),
    estela: new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { color: { value: new THREE.Color(COLOR_ESTELA) } },
      vertexShader: 'attribute float alfa; varying float vA; void main(){ vA = alfa; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 color; varying float vA; void main(){ gl_FragColor = vec4(color, 0.16 * vA); }',
    }),
    bordeEstela: new LineMaterial({ color: COLOR_ESTELA, linewidth: 1.5, worldUnits: false, dashed: true, dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0.8, toneMapped: false }),
    guia: new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.7, depthTest: false, toneMapped: false }),
    extra: [], textura,
  };
  const hechos: ReturnType<typeof construirCuerpo>[] = [];
  let op = opciones, vivo = true;
  const carteles: (() => void)[] = [];
  /** Each car's own label (name and figures), an obstacle the point labels must not cover. */
  const rotulos = new Map<string, THREE.Sprite>();

  cuerpos.forEach((c, i) => {
    if (c.envolvente.length < 3) return;
    const g = new THREE.Group(); g.position.set(c.x, 0, c.z); g.rotation.y = c.giro; grupo.add(g);
    const xs = c.envolvente.map(e => e[0]), techo = Math.max(...c.envolvente.map(e => e[2])), xm = (Math.max(...xs) + Math.min(...xs)) / 2;
    // The car's label (name and the figures the page gives) with a third line: what the tunnel says.
    let rotulo: THREE.Sprite | null = null, R: ResultadoTunel | null = null, kmhRotulo = -1;
    const ponerCartel = () => {
      if (R && kmhRotulo === op.kmh && rotulo) return;
      if (rotulo) { g.remove(rotulo); rotulo.material.map?.dispose(); rotulo.material.dispose(); }
      const base = (c.etiqueta ?? c.nombre).split('\n').slice(0, 2);
      let linea = 'túnel: calculando el flujo…';
      if (R) {
        kmhRotulo = op.kmh;
        const cd = (R.porVelocidad.find(v => v.kmh === op.kmh) ?? R.porVelocidad[1]).cd.total;
        linea = c.id === 'aeromovil' ? `túnel: Cd ${fmt(cd, 3)} ± ${Math.round(CALIBRACION.banda * 100)} %` : c.cdPublicado != null ? `túnel: Cd ${fmt(cd, 3)} (publicado ${fmt(c.cdPublicado, 3)})` : `túnel: Cd ${fmt(cd, 3)}, sin dato publicado`;
      }
      rotulo = cartel([...base, linea].join('\n')); rotulo.position.set(xm, techo + 0.8, 0); rotulo.userData.base = rotulo.position.clone(); g.add(rotulo); rotulos.set(c.id, rotulo);
    };
    ponerCartel(); carteles.push(ponerCartel);
    pedirTunel(peticionDe(c, opciones.resolucion, opciones.lineas), i).then(r => {
      if (!vivo || !r) return;
      R = r; ponerCartel();
      const b = construirCuerpo(c, r, mats, op); g.add(b.grupo); hechos.push(b); resaltar(seleccion);
    });
  });

  const tmp = new THREE.Vector3(), mundo = new THREE.Vector3(), arribaCam = new THREE.Vector3(), derechaCam = new THREE.Vector3(), haciaCam = new THREE.Vector3();
  /** Screen rectangles (px) of what is already placed this frame. */
  type Caja = { x0: number; x1: number; y0: number; y1: number };
  const cajaDe = (e: THREE.Sprite, cam: THREE.PerspectiveCamera, ancho: number, alto: number, pos: THREE.Vector3): Caja | null => {
    tmp.copy(pos).project(cam);
    if (tmp.z > 1 || tmp.z < -1) return null;
    const w = e.scale.x * cam.projectionMatrix.elements[0] * ancho / 2, h = e.scale.y * cam.projectionMatrix.elements[5] * alto / 2;
    const sx = (tmp.x + 1) / 2 * ancho, sy = (1 - tmp.y) / 2 * alto;
    return { x0: sx - e.center.x * w, x1: sx + (1 - e.center.x) * w, y0: sy - (1 - e.center.y) * h, y1: sy + e.center.y * h };
  };
  const pisa = (a: Caja, b: Caja) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  /**
   * Point labels that would cover one another (or a car's own label) are pushed up on the
   * screen, in order: our design's first, then each car's in its own order; a label that
   * would run off the side of the view is pulled back in. The leader follows the label.
   * Recomputed every frame from each label's resting place, so it settles again as the
   * camera turns.
   */
  const repartir = (cam: THREE.PerspectiveCamera, ancho: number, alto: number) => {
    const puestas: Caja[] = [];
    arribaCam.set(0, 1, 0).applyQuaternion(cam.quaternion); derechaCam.set(1, 0, 0).applyQuaternion(cam.quaternion);
    // the cars' own labels first (two cars side by side can cover each other's name), then the points
    const orden = [...hechos].sort((a, b) => Number(b.nuestro) - Number(a.nuestro));
    const lista: THREE.Sprite[] = [...rotulos.values(), ...orden.flatMap(b => b.etiquetas)];
    for (const e of lista) {
      const base = e.userData.base as THREE.Vector3 | undefined, padre = e.parent;
      if (!base || !padre) continue;
      let vis = e.visible; for (let o: THREE.Object3D | null = padre; o && vis; o = o.parent) vis = o.visible;
      if (!vis) continue;
      mundo.copy(base); padre.localToWorld(mundo);
      const k = cajaDe(e, cam, ancho, alto, mundo);
      if (!k) continue;
      // inside the view sideways (a label runs to the right of its point and would be cut at the edge)
      let dx = 0;
      if (k.x1 > ancho - 6) dx = ancho - 6 - k.x1;
      if (k.x0 + dx < 6) dx = 6 - k.x0;
      // up past whatever it covers; if that leaves the view, down instead
      const buscar = (sube: boolean) => {
        let d = 0;
        for (let vuelta = 0; vuelta < 12; vuelta++) {
          const choca = puestas.find(p => pisa({ x0: k.x0 + dx, x1: k.x1 + dx, y0: k.y0 + d, y1: k.y1 + d }, p));
          if (!choca) break;
          d = sube ? choca.y0 - k.y1 - 3 : choca.y1 - k.y0 + 3;
        }
        return d;
      };
      let dy = buscar(true);
      if (k.y0 + dy < 4) dy = buscar(false);
      puestas.push({ x0: k.x0 + dx, x1: k.x1 + dx, y0: k.y0 + dy, y1: k.y1 + dy });
      // pixels → metres at this label's depth, along the camera's up and right directions
      const prof = haciaCam.copy(mundo).sub(cam.position).dot(tmp.set(0, 0, -1).applyQuaternion(cam.quaternion));
      const mPorPx = 2 * prof * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) / alto;
      mundo.addScaledVector(arribaCam, -dy * mPorPx).addScaledVector(derechaCam, dx * mPorPx);
      e.position.copy(padre.worldToLocal(mundo));
      const guia = e.userData.guia as THREE.Line | undefined;
      if (guia) { const at = guia.geometry.attributes.position as THREE.BufferAttribute; at.setXYZ(1, e.position.x, e.position.y, e.position.z); at.needsUpdate = true; }
    }
  };
  const actualizar = (t: number, ancho: number, alto: number, camara?: THREE.Camera) => {
    mats.linea.resolution.set(ancho, alto); mats.bordeEstela.resolution.set(ancho, alto);
    for (const m of mats.extra) m.resolution.set(ancho, alto);
    for (const b of hechos) {
      // Critical-point labels fade in as the camera comes close (with several cars in view they would cover
      // everything): within ~9 m for a garage car, ~13 m for our design. Markers and lines stay.
      if (camara) {
        b.grupo.getWorldPosition(tmp); tmp.x += -1.5;
        const lejos = b.nuestro ? 13 : 9, d = camara.position.distanceTo(tmp), a = Math.max(0, Math.min(1, (lejos - d) / 2.5));
        for (const e of b.etiquetas) { e.material.opacity = a; e.visible = a > 0.02; }
        for (const g of b.guias) g.visible = a > 0.02;
      }
      for (const { geo, lineas } of b.particulas) {
        const P = geo.attributes.position as THREE.BufferAttribute, POR = P.count / Math.max(1, lineas.length);
        lineas.forEach((L, l) => {
          const n = L.t.length;
          for (let k = 0; k < POR; k++) {
            const tau = ((t * 1.4) + (k / POR) * L.T + l * 0.37) % L.T;
            let lo = 0, hi = n - 1;
            while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L.t[m] < tau) lo = m; else hi = m; }
            const f = L.t[hi] > L.t[lo] ? (tau - L.t[lo]) / (L.t[hi] - L.t[lo]) : 0;
            let x = L.p[3 * lo] + (L.p[3 * hi] - L.p[3 * lo]) * f, y = L.p[3 * lo + 1] + (L.p[3 * hi + 1] - L.p[3 * lo + 1]) * f, z = L.p[3 * lo + 2] + (L.p[3 * hi + 2] - L.p[3 * lo + 2]) * f;
            const e = L.estela[lo];
            if (e > 0.01) { const ph = l * 1.37 + k * 2.1; y = Math.max(0.02, y + e * 0.1 * Math.sin(t * 6.3 + ph + x * 3.1)); z += e * 0.1 * Math.cos(t * 5.1 + ph * 1.3 + x * 2.3); }
            P.setXYZ(l * POR + k, x, y, z);
          }
        });
        P.needsUpdate = true;
      }
    }
    if (camara && (camara as THREE.PerspectiveCamera).isPerspectiveCamera) repartir(camara as THREE.PerspectiveCamera, ancho, alto);
  };
  const ajustar = (o: OpcionesTunel) => { op = o; for (const b of hechos) b.ajustar(o); for (const f of carteles) f(); resaltar(seleccion); };
  /** The point label under a ray (a click or a tap), if any. */
  const elegir = (ray: THREE.Raycaster): SeleccionTunel | null => {
    const candidatas: THREE.Sprite[] = [];
    for (const b of hechos) for (const e of b.etiquetas) {
      let vis = e.visible && e.material.opacity > 0.3; for (let o: THREE.Object3D | null = e.parent; o && vis; o = o.parent) vis = o.visible;
      if (vis && e.userData.tunel) candidatas.push(e);
    }
    const hit = ray.intersectObjects(candidatas, false)[0];
    return hit ? { ...(hit.object.userData.tunel as SeleccionTunel) } : null;
  };
  /** The open point's label a little bigger, so it is clear which one the panel talks about. */
  let seleccion: SeleccionTunel | null = null;
  const resaltar = (sel: SeleccionTunel | null) => {
    seleccion = sel;
    for (const b of hechos) for (const e of b.etiquetas) {
      if (!e.userData.escala) e.userData.escala = e.scale.clone();
      const s = e.userData.tunel && sel && e.userData.tunel.cuerpo === sel.cuerpo && e.userData.tunel.punto === sel.punto ? 1.25 : 1;
      e.scale.copy(e.userData.escala).multiplyScalar(s);
    }
  };
  const liberar = () => {
    vivo = false;
    for (const b of hechos) b.liberar();
    grupo.traverse((x: any) => { if (x.isSprite) { x.material.map?.dispose(); x.material.dispose(); } });
    for (const m of [mats.piel, mats.rejilla, mats.linea, mats.punto, mats.estela, mats.bordeEstela, mats.guia, ...mats.extra]) m.dispose();
    mats.esfera.dispose(); textura.dispose();
  };
  return { grupo, actualizar, ajustar, liberar, elegir, resaltar: (sel: SeleccionTunel | null) => resaltar(sel) };
}

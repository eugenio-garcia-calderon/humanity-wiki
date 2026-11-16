// Aeromóvil 1: accessories, fixed parts and the McPherson moving part.
// Moved out of Visor3D.tsx unchanged (2026-11-16, refactor «ordenar»). See ../CLAUDE.md for the layout.
import * as THREE from 'three';
import type { ModeloA1 } from '../geometria';
import { suspensionA1 } from '../geometriaA1';
import type { CapaId, V3 } from './capas';
import type { Mats } from './materiales';
import { _up, tube, sphere, box, vaciar, cajaRedonda, muelle, etiquetar } from './primitivas';
import { ruedaCoche } from './ocupante';

/** Faros en rendija, pilotos, intermitentes, retrovisores, limpiaparabrisas y toma de carga del Aeromóvil 1. */
export function accesoriosA1(g: THREE.Object3D, M: Mats, m: ModeloA1) {
  const sobre = (u: number, th: number, off = 0.004) => m.sec(m.frame(u), th, off);
  const sobreC = (u: number, th: number, off = 0.004) => m.secC(m.frameC(u), th, off);
  const tira = (pts: V3[], r: number, mat: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 24, r, 8, false), mat); g.add(mesh); return mesh;
  };
  // Faros: dos rendijas largas y finas en la arista del hombro del morro, a
  // la altura de la punta (0,42–0,46 del alto), embutidas en la piel, como en
  // el SZEmission.
  const thAltura = (u: number, y: number, lado: 1 | -1) => {
    const f = m.frame(u), ay = Math.max(0.01, f.top - f.zc), k = Math.min(0.98, Math.max(0.02, (y - f.zc) / ay));
    const th = Math.asin(Math.pow(k, m.P.nU / 2));
    return lado > 0 ? th : Math.PI - th;
  };
  // Luces como las del Aptera (2026-11-06, Eugenio): delante, una ceja de LED
  // fina que arranca en la pieza azul del morro y sigue el hombro hacia atrás,
  // y una barra blanca de luz diurna cruzando la punta; detrás, una barra roja
  // justo en el borde de fuga de la cola, de lado a lado, con dos cantos.
  for (const s of [1, -1] as (1 | -1)[]) {
    const ceja = [0, 0.2, 0.4, 0.6, 0.8, 1].map(k => { const u = 0.025 + 0.15 * k; return sobre(u, thAltura(u, (0.44 + 0.06 * k) * m.P.H, s), 0); });
    tira(ceja, 0.012, M.black);                           // el alojamiento, a ras de piel
    tira(ceja.map(q => [q[0] + 0.005, q[1] + 0.003, q[2] + s * 0.004] as V3), 0.0065, M.faro);
    tira([0, 1].map(k => { const u = 0.02 + 0.03 * k; return sobre(u, thAltura(u, 0.40 * m.P.H, s), 0.003); }), 0.005, s > 0 ? M.intermitenteI : M.intermitenteD);
    // Canto trasero: una pestaña roja vertical en cada esquina del labio de cola.
    tira([0, 0.5, 1].map(k => sobre(0.985, (s > 0 ? 0.14 + 0.08 * k : 0.86 - 0.08 * k) * Math.PI, 0.003)), 0.006, M.piloto);
  }
  // Barra de luz trasera en la punta misma de la cola, como el Aptera.
  { const barra: V3[] = []; for (let k = 0; k <= 24; k++) barra.push(sobre(0.993, (0.14 + 0.72 * k / 24) * Math.PI, 0.003)); tira(barra, 0.007, M.piloto); }
  // Matrícula (2026-11-06, Eugenio: «2727 ES, con la etiqueta de Europa»): en la cola.
  const placa = (c: V3, normal: THREE.Vector3) => {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.11), M.matricula); pl.position.set(...c); pl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize()); g.add(pl);
    const marco = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.13), M.black); marco.position.copy(pl.position).addScaledVector(normal.clone().normalize(), -0.002); marco.quaternion.copy(pl.quaternion); g.add(marco);
  };
  // Solo la trasera (2026-11-07, Eugenio: «quita la matrícula frontal y deja solo la trasera»); el morro queda limpio con el logo arriba.
  { const f1 = m.frame(0.996); placa([f1.x - 0.006, (f1.top + f1.bot) / 2 - 0.02, 0], new THREE.Vector3(-1, 0, 0)); }
  // Logo de Luz & Humanidad, circular y amarillo, en lo alto del morro (donde
  // el XL1 lleva el suyo), sobre la pieza azul, tumbado sobre la chapa.
  { const u = 0.055, p = sobre(u, Math.PI / 2, 0.003), a = sobre(u - 0.008, Math.PI / 2, 0), b = sobre(u + 0.008, Math.PI / 2, 0);
    const t = new THREE.Vector3(b[0] - a[0], b[1] - a[1], 0).normalize(), n = new THREE.Vector3(-t.y, t.x, 0); if (n.y < 0) n.negate();
    const logo = new THREE.Mesh(new THREE.CircleGeometry(0.055, 48), M.logo); logo.position.set(...p); logo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); g.add(logo);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.004, 8, 48), M.black); aro.position.copy(logo.position); aro.quaternion.copy(logo.quaternion); g.add(aro); }
  // Retrovisores como los del Aptera: una gota pequeña en un tallo corto, en la
  // base del montante, con el cristal mirando atrás.
  for (const s of [1, -1] as (1 | -1)[]) {
    const th = (t: number) => (s > 0 ? t : Math.PI - t), uR = m.uBase + 0.03;
    const base = sobreC(uR, th(Math.max(m.thAlfeizar(uR) - 0.01, 0.02)), 0), punta: V3 = [base[0] - 0.03, base[1] + 0.02, base[2] + s * 0.10];
    tube(g, base, punta, 0.016, M.black);
    const pod = sphere(g, punta, 0.05, M.body, [1.05, 0.55, 0.42]);
    pod.rotation.y = s * 0.15;
    const cristal = new THREE.Mesh(new THREE.CircleGeometry(0.023, 24), M.glass); cristal.position.set(punta[0] - 0.052, punta[1], punta[2]); cristal.rotation.y = -Math.PI / 2; g.add(cristal);
  }
  // Marcos de la cabina, a ras del cristal (tubos hundidos casi del todo):
  // el arco de arriba del parabrisas, los dos montantes inclinados (XL1,
  // Aptera), el contorno de cada ventanilla con el borde trasero inclinado
  // como un pilar B, y la línea de corte de cada puerta de gaviota.
  {
    // Los marcos van por el borde EXTERIOR de la goma: así tapan el diente
    // que deja la malla en todo borde inclinado, y la goma queda entre el
    // marco y el cristal, como en un coche de verdad.
    const R = 0.012, hund = -0.008, r2 = 0.009, hund2 = -0.006, gT = m.gomaT, gU = m.gomaU, arriba: V3[] = [];
    for (let k = 0; k <= 16; k++) arriba.push(sobreC(m.uW1 + gU, (m.thVentana / Math.PI + (1 - 2 * m.thVentana / Math.PI) * k / 16) * Math.PI, hund));
    tira(arriba, R, M.black);
    for (const s of [1, -1]) {
      const th = (t: number) => (s > 0 ? t : Math.PI - t);
      const pilar: V3[] = []; for (let k = 0; k <= 12; k++) { const u = m.uBase + (m.uW1 + gU - m.uBase) * k / 12; pilar.push(sobreC(u, th(Math.max(m.thPilar(u) - gT, m.thAlfeizar(u) - gT, m.thBase(u) + 0.005)), hund)); }
      tira(pilar, R, M.black);
      const techo: V3[] = []; for (let k = 0; k <= 14; k++) techo.push(sobreC(m.uW1 + (m.uVentA - m.uW1) * k / 14, th(m.thVentana), hund2));
      tira(techo, r2, M.black);
      const trasera: V3[] = []; for (let k = 0; k <= 10; k++) { const u = m.uVentA + (m.uVent1 - m.uVentA) * k / 10; trasera.push(sobreC(u, th(Math.min(m.thVentana, Math.max(m.thTrasera(u) + gT, m.thBase(u) + 0.02))), hund2)); }
      tira(trasera, r2, M.black);
      // La barra de abajo va por donde la cúpula sale de la carrocería: recta sobre el hombro.
      const abajo: V3[] = []; for (let k = 0; k <= 24; k++) { const u = m.uBase - gU + (m.uVent1 + 2 * gU - m.uBase) * k / 24; abajo.push(sobreC(u, th(Math.max(m.thAlfeizar(u) - gT, m.thBase(u) + 0.005)), hund2)); }
      tira(abajo, r2, M.black);
      // Líneas de corte de la puerta (2026-11-06, Eugenio: «visibles pero
      // elegantes, como en el XL1 y el Aptera»): una ranura fina y oscura.
      // En la cúpula, delante y detrás, del alféizar al canto del techo (el
      // techo es fijo, así que la línea no sube al centro); en la carrocería,
      // delante, detrás y por abajo, cerrando el panel lateral.
      for (const p of m.puertas.filter(q => q.tipo === 'puerta' && q.superficie === 'cupula' && (s > 0 ? q.id === 'izq' : q.id === 'der'))) {
        // Contorno de la puerta en la cúpula: montante (delante), canto redondeado de arriba y arco de seguridad (detrás)
        const corte: V3[] = [];
        for (let k = 0; k <= 40; k++) { const u = p.u0 + (p.u1 - p.u0) * k / 40; corte.push(sobreC(u, th(m.thPuertaArriba(u)), -0.0025)); }
        tira(corte, 0.0035, M.goma);
        for (const u of [p.u0 + 0.002, p.u1 - 0.002]) { const v: V3[] = []; for (let k = 0; k <= 8; k++) v.push(sobreC(u, th(m.thPuertaAbajo(u) + (m.thPuertaArriba(u) - m.thPuertaAbajo(u)) * k / 8), -0.0025)); tira(v, 0.0035, M.goma); }
        // Bisagras: un herraje en cada barra (montante del parabrisas y arco de seguridad), con su bulón en la línea del canto del techo
        for (const u of [m.uW1 + m.gomaU + 0.012, m.uArco - 0.012]) {
          const c = sobreC(u, th(m.thVentana), -0.012), a = sobreC(u - 0.012, th(m.thVentana), -0.012), b = sobreC(u + 0.012, th(m.thVentana), -0.012);
          const eje = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
          const bulon = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.075, 12), M.tuerca); bulon.position.set(...c); bulon.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), eje); g.add(bulon);
          const herraje = cajaRedonda(g, [c[0], c[1] - 0.014, c[2] - s * 0.006], [0.06, 0.028, 0.024], M.black, 0.006); herraje.quaternion.copy(bulon.quaternion); herraje.rotateX(Math.PI / 2);
        }
      }
      for (const p of m.puertas.filter(q => q.tipo === 'puerta' && q.superficie === 'cuerpo' && (s > 0 ? q.id === 'izq' : q.id === 'der'))) {
        const [ta, tb] = s > 0 ? [p.t0, p.t1] : [p.t1, p.t0];   // ta = arriba (junto a la cúpula), tb = abajo
        for (const u of [p.u0, p.u1]) { const corte: V3[] = []; for (let k = 0; k <= 10; k++) corte.push(sobre(u, ta + (tb - ta) * k / 10, -0.0025)); tira(corte, 0.0035, M.goma); }
        const abajo: V3[] = []; for (let k = 0; k <= 16; k++) abajo.push(sobre(p.u0 + (p.u1 - p.u0) * k / 16, tb, -0.0025)); tira(abajo, 0.0035, M.goma);
      }
    }
  }
  // Aleta de la cámara trasera sobre el techo, a dos tercios de la cola (no un cubo en lo alto).
  { const base = sobreC(m.uC0 + 0.56, Math.PI / 2, 0.002), punta = sobreC(m.uC0 + 0.60, Math.PI / 2, 0.045); tube(g, base, punta, 0.012, M.black); sphere(g, punta, 0.016, M.black); }
  // Tercera luz de freno en el borde de fuga del techo
  { const luz: V3[] = []; for (let k = 0; k <= 10; k++) luz.push(sobreC(m.uC1 - 0.03, (0.40 + 0.20 * k / 10) * Math.PI, 0.004)); tira(luz, 0.007, M.piloto); }
  // Limpiaparabrisas tumbado en la base del parabrisas
  const uL = m.uC0 + 0.012, piv = sobreC(uL, 0.36 * Math.PI, 0.010);
  const pts: V3[] = [];
  for (let k = 0; k <= 10; k++) pts.push(sobreC(uL + 0.004 * k, (0.37 + 0.28 * k / 10) * Math.PI, 0.010));
  tira(pts, 0.005, M.black); sphere(g, piv, 0.012, M.black);
  // Toma de carga: tapa cuadrada en el lado izquierdo del morro, junto al cargador
  box(g, sobre(0.12, 0.12 * Math.PI, 0.003), [0.10, 0.08, 0.004], M.black);
  // Suelo plano del maletero: una tapa ligera sobre motor, inversor y amortiguadores, con alfombra oscura
  { const f = m.sueloMaletero; const tapa = cajaRedonda(g, [(f.x0 + f.x1) / 2, f.y - 0.006, 0], [f.x0 - f.x1, 0.012, 2 * f.hz], M.seat, 0.006); tapa.userData.componente = 'maleteros'; tapa.receiveShadow = true; }
}

/** Lo fijo del Aeromóvil 1: volante, reposapiés, motor, reductora, inversor, cargador, baterías y cables. */
export function construirFijoA1(G: Record<CapaId, THREE.Group>, M: Mats, m: ModeloA1) {
  // Sin pasos de rueda (2026-11-06, Eugenio: «quita los guardabarros de las
  // ruedas»): la carrocería cubre la rueda y por el hueco del fondo solo se
  // ve el chasis.
  // Salpicadero: una tabla oscura sobre el arco del salpicadero, bajo la base del parabrisas, con la pantalla.
  { const tabla = cajaRedonda(G.direccion, [m.xD + 0.02, m.yDash - 0.02, 0], [0.30, 0.04, 0.72], M.black, 0.012); tabla.userData.componente = 'varios';
    const pantalla = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.16), M.glass); pantalla.position.set(m.xD - 0.10, m.yDash + 0.045, 0); pantalla.rotation.z = -0.3; pantalla.userData.componente = 'varios'; G.direccion.add(pantalla); }
  // Volante: aro inclinado, tres radios y el centro; la columna ya está en los tubos de Dirección.
  const v = m.volante, c: V3 = [v.c[0], v.c[1], 0];
  const aro = new THREE.Mesh(new THREE.TorusGeometry(v.r, 0.016, 12, 48), M.black); aro.position.set(...c); aro.rotation.y = Math.PI / 2; aro.rotation.x = -v.inclinacion; aro.castShadow = true; G.direccion.add(aro);
  const centro = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 20), M.black); centro.position.set(...c); centro.rotation.z = Math.PI / 2; centro.rotation.y = 0; centro.quaternion.copy(aro.quaternion); centro.rotateX(Math.PI / 2); G.direccion.add(centro);
  for (const ang of [Math.PI / 2, Math.PI / 2 + 2.2, Math.PI / 2 - 2.2]) {
    const p = new THREE.Vector3(0, v.r * Math.sin(ang), v.r * Math.cos(ang)).applyQuaternion(aro.quaternion);
    tube(G.direccion, c, [c[0] + p.x, c[1] + p.y, c[2] + p.z], 0.014, M.black);
  }
  // Cremallera: caja sobre el travesaño delantero
  cajaRedonda(G.direccion, m.cremallera, [0.07, 0.07, 0.16], M.black, 0.01);
  etiquetar(G.direccion, 'direccion');
  // Reposapiés: una chapa inclinada con dos nervios
  const rp = m.reposapies;
  const chapa = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.36), M.alu); chapa.position.set(rp[0] + 0.05, rp[1] + 0.06, 0); chapa.rotation.z = -0.5; chapa.castShadow = true; chapa.userData.componente = 'chasis'; G.chasis.add(chapa);
  // Motor transversal, reductora con diferencial, inversor encima y cargador delante
  const mo = new THREE.Mesh(new THREE.CylinderGeometry(m.motor.r, m.motor.r, m.motor.largo, 32), M.motor); mo.position.set(...m.motor.c); mo.rotation.x = Math.PI / 2; mo.castShadow = true; mo.userData.componente = 'motor'; G.motor.add(mo);
  for (const k of [-1, 1]) { const tapa = new THREE.Mesh(new THREE.CylinderGeometry(m.motor.r * 0.7, m.motor.r * 0.7, 0.02, 32), M.black); tapa.position.set(m.motor.c[0], m.motor.c[1], m.motor.c[2] + k * (m.motor.largo / 2 + 0.01)); tapa.rotation.x = Math.PI / 2; tapa.userData.componente = 'motor'; G.motor.add(tapa); }
  cajaRedonda(G.transmision, m.reductora.c, m.reductora.s, M.carcasa, 0.02).userData.componente = 'transmision';
  cajaRedonda(G.motor, m.inversor.c, m.inversor.s, M.carcasa, 0.015).userData.componente = 'inversor';
  cajaRedonda(G.motor, m.cargador.c, m.cargador.s, M.carcasa, 0.015).userData.componente = 'cargador';
  // Baterías: cada módulo, con su tapa; cable naranja de alta tensión hasta el inversor
  for (const b of m.baterias) {
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    cajaRedonda(G.baterias, [cx, cy, 0], [b.x1 - b.x0, b.y1 - b.y0, 2 * b.hz], M.batt, 0.015).userData.componente = 'bateria';
    cajaRedonda(G.baterias, [cx, b.y1 + 0.012, 0], [(b.x1 - b.x0) * 0.6, 0.02, b.hz], M.black, 0.006).userData.componente = 'bateria';
  }
  const b0 = m.baterias[0];
  const cable = new THREE.CatmullRomCurve3(([
    [b0.x0, b0.y1 + 0.03, 0.25], [b0.x0 - 0.3, m.ys + 0.08, 0.28], [m.xR + 0.4, m.ys + 0.10, 0.25], [m.inversor.c[0], m.inversor.c[1] - 0.02, m.inversor.c[2] + 0.12],
  ] as V3[]).map(p => new THREE.Vector3(...p)));
  const cab = new THREE.Mesh(new THREE.TubeGeometry(cable, 60, 0.008, 8, false), M.cableHV); cab.userData.componente = 'bateria'; G.baterias.add(cab);
  const cab2 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(([[m.inversor.c[0], m.inversor.c[1] - 0.04, 0.1], [m.motor.c[0], m.motor.c[1] + m.motor.r, 0.05]] as V3[]).map(p => new THREE.Vector3(...p))), 12, 0.007, 8, false), M.cableHV); cab2.userData.componente = 'motor'; G.motor.add(cab2);
}

/** Aeromóvil 1: cuatro McPherson con sus brazos, muelles y barras, y las ruedas (las delanteras giradas `giro` grados). */
export function construirMovilA1(G: Record<CapaId, THREE.Group>, M: Mats, m: ModeloA1, coche: THREE.Group, giro: number) {
  coche.rotation.x = 0;
  vaciar(G.suspension); vaciar(G.ruedas);
  const s = G.suspension, c = m.P.comp;
  for (let i = 0; i < 4; i++) {
    const r = m.ruedas[i], q = suspensionA1(m, i, c), sg = q.s;
    // Mangueta: del eje al vástago, y el pie hasta la rótula
    tube(s, q.rotula, q.arriba, 0.034, M.alu);
    tube(s, [r.x, r.r + c * 0.09, sg * (Math.abs(r.z) - 0.07)], [r.x, r.r + c * 0.09, sg * (Math.abs(r.z) - 0.02)], 0.03, M.black);
    sphere(s, q.rotula, 0.024, M.black);
    // Columna McPherson: cuerpo del amortiguador, vástago y muelle
    const A = new THREE.Vector3(...q.arriba), B = new THREE.Vector3(...q.torreta), d = B.clone().sub(A), L = d.length(); d.normalize();
    const mid: V3 = [A.x + d.x * L * 0.45, A.y + d.y * L * 0.45, A.z + d.z * L * 0.45];
    tube(s, q.arriba, mid, 0.046, M.susp);
    tube(s, mid, q.torreta, 0.022, M.stanch);
    const m0: V3 = [A.x + d.x * L * 0.30, A.y + d.y * L * 0.30, A.z + d.z * L * 0.30], m1: V3 = [A.x + d.x * L * 0.92, A.y + d.y * L * 0.92, A.z + d.z * L * 0.92];
    muelle(s, m0, m1, 0.062, 6, M.muelle);
    const platoA = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.008, 24), M.black); platoA.position.set(...m0); platoA.quaternion.setFromUnitVectors(_up, d); s.add(platoA);
    const platoB = platoA.clone(); platoB.position.set(...m1); s.add(platoB);
    // Brazos inferiores en A y rótulas en el chasis
    for (const [a, b] of q.brazos) { tube(s, a, b, 0.025, M.susp); sphere(s, a, 0.018, M.black); }
    // Barra estabilizadora con su bieleta
    if (sg > 0) tube(s, [r.x + 0.25, r.r - 0.02, -0.36], [r.x + 0.25, r.r - 0.02, 0.36], 0.018, M.black);
    tube(s, [r.x + 0.25, r.r - 0.02, sg * 0.36], [r.x + 0.12, r.r - 0.07, sg * (Math.abs(r.z) - 0.18)], 0.012, M.black);
    // La rueda, girada si es delantera
    ruedaCoche(G.ruedas, M, r.x, r.r + c * 0.09, r.z, r.r, r.w, q.disco, q.del ? giro * Math.PI / 180 : 0);
  }
  etiquetar(G.suspension, 'suspension'); etiquetar(G.ruedas, 'ruedas');
}

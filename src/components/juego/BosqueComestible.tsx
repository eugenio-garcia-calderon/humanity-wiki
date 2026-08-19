// ============================================================================
// JUEGO VITAL — EL BOSQUE COMESTIBLE (2026-08-19, petición de Eugenio: «haz
// que haya flores, arbustos con frutas y árboles en los laterales de los
// caminos, como si fuese un bosque comestible»).
//
// A los dos lados de cada una de las seis sendas se planta un bosque de
// alimento con las 48 especies ibéricas de `comestibles.ts`, en TRES
// ESTRATOS como en la agricultura sintrópica de verdad:
//
//   · borde  (2,5-5 m del camino): aromáticas, bayas y matas — estrato 1
//   · medio  (5-9 m):              frutales pequeños        — estrato 2
//   · fondo  (9-14 m):             árboles grandes          — estrato 3
//
// Y entre medias, manchas de FLORES para los polinizadores.
//
// Todo instanciado y agrupado por PORTE: nueve mallas para ~600 plantas y
// otra para los frutos. La siembra es determinista (misma semilla, mismo
// bosque siempre), así que puedes aprenderte dónde está tu cerezo.
// ============================================================================
import { useMemo } from 'react';
import * as THREE from 'three';
import { crearAzar } from './paleta';
import { mapasPBR } from './texturas';
import { SENDAS, PLAZA_R, enCamino } from './mapa';
import { ESPECIES, type Especie, type Porte } from './comestibles';

/** Radio libre alrededor de la plaza central: ni un árbol dentro. */
const CLARO_CENTRAL = 24;

/** Una planta sembrada: qué especie, dónde, y con qué porte de individuo. */
export interface Planta {
  especie: Especie;
  x: number;
  z: number;
  escala: number;
  giro: number;
}

/**
 * La siembra: recorre cada senda de 5,5 en 5,5 metros y planta a los dos
 * lados, alternando estratos. Es la ÚNICA fuente de verdad: la usan el
 * dibujo, los obstáculos (los troncos gordos frenan) y el rótulo que te
 * dice qué árbol tienes al lado.
 */
let cacheSiembra: Planta[] | null = null;
export function siembraComestible(): Planta[] {
  if (cacheSiembra) return cacheSiembra;
  const azar = crearAzar(48481);
  const plantas: Planta[] = [];
  const porEstrato: Record<number, Especie[]> = {
    1: ESPECIES.filter(e => e.estrato === 1),
    2: ESPECIES.filter(e => e.estrato === 2),
    3: ESPECIES.filter(e => e.estrato === 3),
  };
  // Contadores para repartir las especies en ronda: así salen TODAS, no
  // quince higueras y ningún nogal.
  const turno: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

  for (const s of SENDAS) {
    const dx = Math.cos(s.ang), dz = Math.sin(s.ang);
    // Perpendicular a la senda: el lado izquierdo y el derecho.
    const px = Math.cos(s.ang + Math.PI / 2), pz = Math.sin(s.ang + Math.PI / 2);
    // Un CLARO de 24 m alrededor de la plaza: si el bosque nace pegado al
    // empedrado, apareces dentro de un arbusto y no ves ni el ficus (visto
    // en la primera prueba).
    for (let d = CLARO_CENTRAL; d < s.largo - 6; d += 5.5) {
      for (const lado of [1, -1] as const) {
        // Tres filas por lado y por tramo, una de cada estrato.
        for (const estrato of [1, 2, 3] as const) {
          // Los estratos no se plantan a la vez en todos los tramos: el
          // bosque queda más natural con claros.
          if (estrato === 3 && azar() > 0.55) continue;
          if (estrato === 2 && azar() > 0.8) continue;
          const banda = estrato === 1 ? 2.8 + azar() * 2.2
            : estrato === 2 ? 5.6 + azar() * 3
              : 9.5 + azar() * 4.5;
          const avance = d + (azar() - 0.5) * 3.4;
          const x = dx * avance + px * banda * lado;
          const z = dz * avance + pz * banda * lado;
          // Ni encima del camino ni de una plaza.
          if (enCamino(x, z, 0.6)) continue;
          if (Math.hypot(x, z) < CLARO_CENTRAL) continue;
          const lista = porEstrato[estrato];
          const especie = lista[turno[estrato]++ % lista.length];
          plantas.push({
            especie,
            x,
            z,
            escala: 0.82 + azar() * 0.42,
            giro: azar() * Math.PI * 2,
          });
        }
      }
    }
  }
  cacheSiembra = plantas;
  return plantas;
}

/** La planta comestible más cercana a un punto, si está a menos de `radio`. */
export function plantaCerca(x: number, z: number, radio = 3.2): Planta | null {
  let mejor: Planta | null = null;
  let mejorD = radio;
  for (const p of siembraComestible()) {
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < mejorD) { mejorD = d; mejor = p; }
  }
  return mejor;
}

// ---------------------------------------------------------------------------
// Geometrías por porte. Cada una se construye UNA vez y la comparten todas
// las plantas de ese porte; el color y el tamaño van por instancia.
// ---------------------------------------------------------------------------
function abollar(geo: THREE.BufferGeometry, fuerza: number, achatar = 1): THREE.BufferGeometry {
  const p = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    const d = 1 + Math.sin(v.x * 6.7 + v.y * 5.3) * Math.cos(v.z * 6.1) * fuerza;
    v.normalize().multiplyScalar(d);
    p.setXYZ(i, v.x, v.y * achatar, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** La copa de cada porte, en unidades de radio 1 y centrada en su altura. */
function geoCopa(porte: Porte): THREE.BufferGeometry {
  switch (porte) {
    case 'columnar': return abollar(new THREE.SphereGeometry(1, 8, 10), 0.14, 2.1);
    case 'parasol': return abollar(new THREE.SphereGeometry(1, 12, 7), 0.16, 0.42);
    case 'palmera': return abollar(new THREE.SphereGeometry(1, 9, 6), 0.3, 0.5);
    case 'cactus': return abollar(new THREE.SphereGeometry(1, 7, 7), 0.34, 1.3);
    case 'mata': return abollar(new THREE.SphereGeometry(1, 8, 6), 0.24, 0.78);
    case 'trepadora': return abollar(new THREE.SphereGeometry(1, 9, 6), 0.3, 0.6);
    case 'arbusto': return abollar(new THREE.SphereGeometry(1, 9, 7), 0.22, 0.85);
    case 'arbolito': return abollar(new THREE.SphereGeometry(1, 10, 8), 0.17, 0.92);
    default: return abollar(new THREE.SphereGeometry(1, 11, 8), 0.15, 0.88);
  }
}

/** ¿Este porte lleva tronco visible? Las matas y la vid, no. */
const CON_TRONCO: Record<Porte, boolean> = {
  arbol: true, columnar: true, parasol: true, arbolito: true, arbusto: true,
  mata: false, trepadora: true, cactus: false, palmera: true,
};

export function BosqueComestible({ densidad = 1 }: { densidad?: number }) {
  const grupo = useMemo(() => {
    const g = new THREE.Group();
    const plantas = siembraComestible().filter((_, i) => i % Math.max(1, Math.round(1 / densidad)) === 0);
    const azar = crearAzar(9091);

    // --- Troncos: uno por planta con porte leñoso, todos en una malla.
    const conTronco = plantas.filter(p => CON_TRONCO[p.especie.porte]);
    const matCorteza = new THREE.MeshStandardMaterial({ ...mapasPBR('corteza', 1.4, 2) });
    const troncos = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.5, 0.8, 1, 7),
      matCorteza,
      Math.max(1, conTronco.length),
    );
    const M = new THREE.Matrix4();
    const Q = new THREE.Quaternion();
    const EJE = new THREE.Vector3(0, 1, 0);
    conTronco.forEach((p, i) => {
      const alto = p.especie.alto * p.escala;
      // El tronco llega hasta donde empieza la copa.
      const hTronco = alto * (p.especie.porte === 'palmera' ? 0.78 : 0.45);
      const grosor = Math.max(0.08, p.especie.copa * 0.085 * p.escala);
      Q.setFromAxisAngle(EJE, p.giro);
      M.compose(
        new THREE.Vector3(p.x, hTronco / 2, p.z),
        Q,
        new THREE.Vector3(grosor, hTronco, grosor),
      );
      troncos.setMatrixAt(i, M);
    });
    troncos.castShadow = true;
    troncos.receiveShadow = true;
    troncos.frustumCulled = false;
    g.add(troncos);

    // --- Copas: una malla POR PORTE, con el color de hoja por instancia.
    const matFollaje = new THREE.MeshStandardMaterial({ ...mapasPBR('follaje', 2, 1.4) });
    const porPorte = new Map<Porte, Planta[]>();
    for (const p of plantas) {
      const l = porPorte.get(p.especie.porte) || [];
      l.push(p);
      porPorte.set(p.especie.porte, l);
    }
    const color = new THREE.Color();
    for (const [porte, lista] of porPorte) {
      const malla = new THREE.InstancedMesh(geoCopa(porte), matFollaje, lista.length);
      lista.forEach((p, i) => {
        const alto = p.especie.alto * p.escala;
        const copa = p.especie.copa * p.escala;
        const yCopa = CON_TRONCO[porte]
          ? alto * (porte === 'palmera' ? 0.84 : 0.68)
          : alto * 0.45;
        Q.setFromAxisAngle(EJE, p.giro);
        M.compose(new THREE.Vector3(p.x, yCopa, p.z), Q, new THREE.Vector3(copa, copa, copa));
        malla.setMatrixAt(i, M);
        // Tinte: el color de hoja de la especie, con una pizca de variación
        // por individuo (dos manzanos no son idénticos).
        color.set(p.especie.hoja);
        color.offsetHSL(0, (azar() - 0.5) * 0.05, (azar() - 0.5) * 0.07);
        malla.setColorAt(i, color);
      });
      malla.castShadow = true;
      malla.receiveShadow = true;
      malla.frustumCulled = false;
      g.add(malla);
    }

    // --- FRUTOS: bolitas del color de cada especie, repartidas por la copa.
    const conFruta = plantas.filter(p => p.especie.fruta);
    const frutas: Array<{ m: THREE.Matrix4; c: string }> = [];
    for (const p of conFruta) {
      const alto = p.especie.alto * p.escala;
      const copa = p.especie.copa * p.escala;
      const yCopa = CON_TRONCO[p.especie.porte] ? alto * 0.68 : alto * 0.45;
      // Más frutos en los arbustos de baya que en un nogal (a escala se ven).
      const cuantos = p.especie.estrato === 1 ? 14 : 10;
      for (let k = 0; k < cuantos; k++) {
        const a = azar() * Math.PI * 2;
        const r = copa * (0.55 + azar() * 0.5);
        const m = new THREE.Matrix4();
        const s = p.especie.frutaR * 12; // se agrandan: a tamaño real no se verían
        m.compose(
          new THREE.Vector3(
            p.x + Math.cos(a) * r,
            yCopa + (azar() - 0.5) * copa * 0.75,
            p.z + Math.sin(a) * r,
          ),
          new THREE.Quaternion(),
          new THREE.Vector3(s, s, s),
        );
        frutas.push({ m, c: p.especie.fruta! });
      }
    }
    const mallaFrutas = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 7, 6),
      new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.02 }),
      Math.max(1, frutas.length),
    );
    frutas.forEach((f, i) => { mallaFrutas.setMatrixAt(i, f.m); mallaFrutas.setColorAt(i, color.set(f.c)); });
    mallaFrutas.count = frutas.length;
    mallaFrutas.castShadow = true;
    mallaFrutas.frustumCulled = false;
    g.add(mallaFrutas);

    // --- FLORES para polinizadores, en manchas junto al borde del camino.
    const FLORES = ['#e8617a', '#f0c04a', '#c78ce0', '#ffffff', '#f2874a', '#7fb3f0'];
    const petalos: Array<{ m: THREE.Matrix4; c: string }> = [];
    for (const s of SENDAS) {
      const dx = Math.cos(s.ang), dz = Math.sin(s.ang);
      const px = Math.cos(s.ang + Math.PI / 2), pz = Math.sin(s.ang + Math.PI / 2);
      for (let d = PLAZA_R + 4; d < s.largo - 4; d += 2.4) {
        for (const lado of [1, -1] as const) {
          if (azar() > 0.72) continue;
          // Una mancha de 5-9 flores de la MISMA especie: así se ven manchas
          // de color, no confeti.
          const c = FLORES[Math.floor(azar() * FLORES.length)];
          const cx = dx * (d + (azar() - 0.5) * 2) + px * (s.ancho / 2 + 0.9 + azar() * 1.7) * lado;
          const cz = dz * (d + (azar() - 0.5) * 2) + pz * (s.ancho / 2 + 0.9 + azar() * 1.7) * lado;
          if (enCamino(cx, cz, 0.2)) continue;
          const cuantas = 5 + Math.floor(azar() * 5);
          for (let k = 0; k < cuantas; k++) {
            const m = new THREE.Matrix4();
            const s2 = 0.09 + azar() * 0.06;
            m.compose(
              new THREE.Vector3(cx + (azar() - 0.5) * 1.5, 0.16 + azar() * 0.16, cz + (azar() - 0.5) * 1.5),
              new THREE.Quaternion(),
              new THREE.Vector3(s2, s2 * 0.75, s2),
            );
            petalos.push({ m, c });
          }
        }
      }
    }
    const mallaFlores = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 6, 5),
      new THREE.MeshStandardMaterial({ roughness: 0.75 }),
      Math.max(1, petalos.length),
    );
    petalos.forEach((f, i) => { mallaFlores.setMatrixAt(i, f.m); mallaFlores.setColorAt(i, color.set(f.c)); });
    mallaFlores.count = petalos.length;
    mallaFlores.frustumCulled = false;
    g.add(mallaFlores);

    return g;
  }, [densidad]);

  return <primitive object={grupo} />;
}

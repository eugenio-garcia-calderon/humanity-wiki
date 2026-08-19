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
import { ESPECIES, type Especie, type Porte, type HojaTipo } from './comestibles';

/** Radio libre alrededor de la plaza central: ni un árbol dentro. */
const CLARO_CENTRAL = 24;

/**
 * Cuánto encoge cada planta respecto a su altura real (2026-08-19, petición
 * de Eugenio: «haz todos los árboles un 33% más pequeños»). 0,67 = un tercio
 * menos. Multiplica a `escala`, que es de donde salen la copa, el tronco, el
 * choque, la altura a la que vuelan los bichos y el rótulo.
 */
const MENGUA_ARBOLES = 0.67;

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
            // El 33% menos que antes (2026-08-19, petición de Eugenio: «haz
            // todos los árboles un 33% más pequeños»). Va aquí y no en la
            // tabla de especies porque `comestibles.ts` guarda la altura
            // REAL de cada árbol adulto, que es un dato, no una decisión
            // de escenografía. Al tocar solo esta línea encogen a la vez la
            // copa, el tronco, el choque, los bichos y el rótulo.
            escala: (0.82 + azar() * 0.42) * MENGUA_ARBOLES,
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

/**
 * Deforma una esfera con un PERFIL: para cada altura de la copa dice cuánto
 * se ensancha. Es lo que separa un ciprés de un pino piñonero — el mismo
 * número de vértices, silueta distinta.
 */
function perfilar(
  geo: THREE.BufferGeometry,
  perfil: (t: number) => number,   // t: 0 abajo, 1 arriba
  fuerza: number,
  achatar = 1,
  facetas = 0,
): THREE.BufferGeometry {
  const p = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    const t = (v.y + 1) / 2;
    let d = 1 + Math.sin(v.x * 6.7 + v.y * 5.3) * Math.cos(v.z * 6.1) * fuerza;
    // Facetas: escalones angulares en el contorno. Da hoja recortada
    // (castaño, zarza) frente a hoja lisa (naranjo).
    if (facetas > 0) d *= 1 + Math.sin(Math.atan2(v.z, v.x) * facetas) * 0.09;
    const y = v.y;
    v.normalize().multiplyScalar(d);
    const ancho = perfil(t);
    p.setXYZ(i, v.x * ancho, y * achatar, v.z * ancho);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * La copa según el TIPO DE HOJA de la especie (petición de Eugenio: «hojas
 * distintas para cada especie»). El porte manda en lo achatada que es; la
 * hoja manda en el perfil, el desorden del borde y las facetas.
 */
const cacheCopas = new Map<string, THREE.BufferGeometry>();
function geoCopa(porte: Porte, hoja: HojaTipo): THREE.BufferGeometry {
  const clave = `${porte}|${hoja}`;
  const ya = cacheCopas.get(clave);
  if (ya) return ya;

  // Lo achatada que va según el porte: un parasol es un plato, un columnar
  // es un huso.
  const achatarPorte: Record<Porte, number> = {
    columnar: 2.1, parasol: 0.42, palmera: 0.5, cactus: 1.3,
    mata: 0.78, trepadora: 0.6, arbusto: 0.85, arbolito: 0.92, arbol: 0.88,
  };
  const achatar = achatarPorte[porte] ?? 0.88;

  let geo: THREE.BufferGeometry;
  switch (hoja) {
    case 'aciculada':
      // Cónica y ancha arriba: el piñonero es una sombrilla de agujas.
      geo = perfilar(new THREE.SphereGeometry(1, 10, 8), t => 0.5 + t * 0.75, 0.2, achatar, 9);
      break;
    case 'abanico':
      // La palmera: penacho de palmas, estrecho al pie y muy abierto arriba.
      geo = perfilar(new THREE.SphereGeometry(1, 9, 7), t => 0.28 + t * t * 1.35, 0.34, achatar, 7);
      break;
    case 'coriacea':
      // Hoja dura y perenne: copa densa, compacta y de borde limpio.
      geo = perfilar(new THREE.SphereGeometry(1, 12, 9), () => 1, 0.1, achatar, 0);
      break;
    case 'dentada':
      // Hoja grande y aserrada: borde muy recortado.
      geo = perfilar(new THREE.SphereGeometry(1, 11, 9), t => 0.86 + t * 0.24, 0.26, achatar, 13);
      break;
    case 'compuesta':
      // Hoja dividida: copa AIREADA, ancha por arriba y con huecos.
      geo = perfilar(new THREE.SphereGeometry(1, 12, 8), t => 0.74 + t * 0.5, 0.3, achatar * 0.92, 11);
      break;
    case 'palmeada':
      // Hoja de higuera o parra: lóbulos gordos, contorno abultado.
      geo = perfilar(new THREE.SphereGeometry(1, 10, 8), t => 0.9 + Math.sin(t * 3.1) * 0.2, 0.32, achatar, 6);
      break;
    case 'lanceolada':
      // Hoja estrecha: copa alargada y algo desflecada, como el olivo.
      geo = perfilar(new THREE.SphereGeometry(1, 10, 9), t => 0.82 + t * 0.3, 0.19, achatar * 1.12, 8);
      break;
    case 'carnosa':
      // Chumbera y alcaparra: paletas, no copa. Cuerpo grueso y anguloso.
      geo = perfilar(new THREE.SphereGeometry(1, 7, 6), t => 0.7 + t * 0.55, 0.36, achatar, 4);
      break;
    case 'aguja':
      // Aromáticas: mata prieta y redondeada, muy pequeña.
      geo = perfilar(new THREE.SphereGeometry(1, 8, 6), () => 1, 0.16, achatar * 0.86, 0);
      break;
    default: // 'ovalada', el frutal clásico
      geo = perfilar(new THREE.SphereGeometry(1, 11, 9), t => 0.9 + t * 0.16, 0.15, achatar, 0);
  }
  cacheCopas.set(clave, geo);
  return geo;
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

    // --- Copas: una malla por PORTE + TIPO DE HOJA, con el color por
    //     instancia. Antes solo se agrupaba por porte y todos los frutales
    //     eran la misma bola; ahora un castaño y un naranjo tienen silueta
    //     distinta aunque compartan porte.
    const matFollaje = new THREE.MeshStandardMaterial({ ...mapasPBR('follaje', 2, 1.4) });
    const porFamilia = new Map<string, { porte: Porte; hoja: HojaTipo; lista: Planta[] }>();
    for (const p of plantas) {
      const clave = `${p.especie.porte}|${p.especie.hojaTipo}`;
      const ya = porFamilia.get(clave);
      if (ya) ya.lista.push(p);
      else porFamilia.set(clave, { porte: p.especie.porte, hoja: p.especie.hojaTipo, lista: [p] });
    }
    const color = new THREE.Color();
    for (const { porte, hoja, lista } of porFamilia.values()) {
      const malla = new THREE.InstancedMesh(geoCopa(porte, hoja), matFollaje, lista.length);
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
      // Los frutos van a TAMAÑO REAL (2026-08-19, petición de Eugenio:
      // «frutos proporcionales a la vida real»). Antes se dibujaban ×12 y una
      // manzana medía un metro. A tamaño real cada uno se ve poco desde
      // lejos, así que se compensa con MUCHOS más por árbol: un cerezo
      // cargado se lee por la mancha de color, igual que en el campo.
      // 40 en los arbustos de baya, 30 en los árboles. Con ~600 plantas eso
      // son ~20.000 frutos en UNA malla instanciada de esferas de 24 caras:
      // medio millón de triángulos, que la tarjeta se come sin pestañear.
      // Poner 90 (lo primero que probé) se iba a 1,5 millones sin necesidad.
      const cuantos = p.especie.estrato === 1 ? 40 : 30;
      for (let k = 0; k < cuantos; k++) {
        const a = azar() * Math.PI * 2;
        // Los frutos cuelgan del BORDE de la copa, no del centro: por dentro
        // no hay luz y no hay fruta.
        const r = copa * (0.62 + azar() * 0.42);
        const m = new THREE.Matrix4();
        const s = p.especie.frutaR * (0.85 + azar() * 0.3);
        m.compose(
          new THREE.Vector3(
            p.x + Math.cos(a) * r,
            yCopa + (azar() - 0.5) * copa * 0.8,
            p.z + Math.sin(a) * r,
          ),
          new THREE.Quaternion(),
          new THREE.Vector3(s, s, s),
        );
        frutas.push({ m, c: p.especie.fruta! });
      }
    }
    const mallaFrutas = new THREE.InstancedMesh(
      // A tamaño real un fruto ocupa pocos píxeles: con 6×4 caras sobra y se
      // ahorra la mitad de la geometría.
      new THREE.SphereGeometry(1, 6, 4),
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

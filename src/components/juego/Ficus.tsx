// ============================================================================
// JUEGO VITAL — EL FICUS DEL CENTRO (2026-08-19, petición de Eugenio: «un
// árbol con agua alrededor en el centro, que sea un ficus con un nivel de
// detalle enorme, pero un ficus no muy alto»).
//
// Un ficus de verdad no es un pino: es BAJO y ANCHÍSIMO. Aquí mide ~6,4 m de
// alto y su copa pasa de 16 m de diámetro. El detalle sale de cuatro cosas
// que hacen que un ficus parezca un ficus:
//
//   1. RAÍCES TABULARES: la base no es un cilindro, son ocho contrafuertes
//      que salen del tronco y se hunden en el suelo.
//   2. RAMAS RECURSIVAS: un tronco que se abre en 5 ramas madre, cada una en
//      3 hijas, cada una en 3 nietas — 65 ramas reales, no una esfera.
//   3. RAÍCES AÉREAS: los hilos que cuelgan de las ramas hasta el suelo, la
//      firma del ficus (Ficus microcarpa, benjamina, banyan…).
//   4. COPA EN CAPAS: 90 racimos de hoja repartidos por las puntas de las
//      ramas, no una bola — por eso se ve luz entre el follaje.
//
// Todo lo repetido va INSTANCIADO (ramas, racimos, raíces): 4 llamadas de
// dibujo para ~200 piezas. La geometría se calcula UNA vez y se comparte.
// ============================================================================
import { useMemo } from 'react';
import * as THREE from 'three';
import { crearAzar } from './paleta';
import { mapasPBR } from './texturas';
import { MaterialAgua } from './Agua';

/** Radio del estanque que lo rodea y del brocal de piedra. */
export const FICUS_AGUA_R = 4.6;
const FICUS_BROCAL_R = 5.1;

interface Rama { m: THREE.Matrix4; punta: THREE.Vector3; grosor: number; nivel: number }

/**
 * Genera el esqueleto del árbol: una lista de ramas con su matriz (posición,
 * giro y escala) y dónde acaba cada una, para colgar de ahí el follaje.
 */
function esqueleto(): { ramas: Rama[]; puntas: Rama[] } {
  const azar = crearAzar(31415);
  const ramas: Rama[] = [];
  const puntas: Rama[] = [];
  const ARRIBA = new THREE.Vector3(0, 1, 0);

  const crecer = (base: THREE.Vector3, dir: THREE.Vector3, largo: number, grosor: number, nivel: number) => {
    const fin = base.clone().addScaledVector(dir, largo);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromUnitVectors(ARRIBA, dir.clone().normalize());
    // El cilindro de three nace centrado: se coloca a media rama.
    const centro = base.clone().addScaledVector(dir, largo / 2);
    m.compose(centro, q, new THREE.Vector3(grosor, largo, grosor));
    const rama = { m, punta: fin, grosor, nivel };
    ramas.push(rama);

    if (nivel >= 3) { puntas.push(rama); return; }
    // Tres hijas por rama, abriéndose y cayendo un poco: el ficus se
    // extiende a lo ancho, no hacia arriba.
    const hijas = nivel === 0 ? 5 : 3;
    for (let i = 0; i < hijas; i++) {
      const giro = (i / hijas) * Math.PI * 2 + azar() * 1.2 + nivel * 0.7;
      // Cuanto más alto el nivel, más horizontal va la rama.
      const apertura = 0.55 + nivel * 0.34 + azar() * 0.3;
      const d = new THREE.Vector3(
        Math.cos(giro) * Math.sin(apertura),
        Math.cos(apertura) * (nivel >= 2 ? 0.45 : 1),
        Math.sin(giro) * Math.sin(apertura),
      ).normalize();
      crecer(fin, d, largo * (0.62 + azar() * 0.16), grosor * 0.58, nivel + 1);
    }
  };

  // El tronco: corto y gordo, como manda el porte del ficus.
  crecer(new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(azar() * 0.05, 1, azar() * 0.05), 2.35, 0.95, 0);
  return { ramas, puntas };
}

export function Ficus() {
  const grupo = useMemo(() => {
    const azar = crearAzar(2718);
    const g = new THREE.Group();
    const { ramas, puntas } = esqueleto();

    // --- 1. Las RAMAS, todas en una malla instanciada.
    const geoRama = new THREE.CylinderGeometry(0.62, 1, 1, 7, 1, true);
    const matMadera = new THREE.MeshStandardMaterial({ ...mapasPBR('corteza', 1.2, 2.2) });
    const mallaRamas = new THREE.InstancedMesh(geoRama, matMadera, ramas.length);
    ramas.forEach((r, i) => mallaRamas.setMatrixAt(i, r.m));
    mallaRamas.castShadow = true;
    mallaRamas.receiveShadow = true;
    g.add(mallaRamas);

    // --- 2. RAÍCES TABULARES: contrafuertes que salen de la base.
    const contra = 9;
    const geoContra = new THREE.CylinderGeometry(0.06, 0.5, 1, 6);
    const mallaContra = new THREE.InstancedMesh(geoContra, matMadera, contra);
    const M = new THREE.Matrix4();
    const Q = new THREE.Quaternion();
    const ARRIBA = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < contra; i++) {
      const a = (i / contra) * Math.PI * 2 + azar() * 0.25;
      const largo = 0.85 + azar() * 0.7;
      // Nace BAJO en el tronco y muere en el suelo, hacia fuera: ensancha el
      // pie del árbol en vez de levantar una tienda de campaña (primera
      // versión: nacían a 1,5 m y parecían varas).
      const base = new THREE.Vector3(Math.cos(a) * 0.3, 0.95, Math.sin(a) * 0.3);
      const fin = new THREE.Vector3(Math.cos(a) * (0.75 + largo), 0, Math.sin(a) * (0.75 + largo));
      const dir = fin.clone().sub(base);
      const L = dir.length();
      Q.setFromUnitVectors(ARRIBA, dir.clone().normalize());
      M.compose(base.clone().addScaledVector(dir, 0.5), Q, new THREE.Vector3(1.15 + azar() * 0.45, L, 0.5 + azar() * 0.25));
      mallaContra.setMatrixAt(i, M);
    }
    mallaContra.castShadow = true;
    g.add(mallaContra);

    // --- 3. RAÍCES AÉREAS: hilos finos que cuelgan de las ramas altas.
    const colgantes: THREE.Matrix4[] = [];
    for (const r of ramas) {
      if (r.nivel < 3 || r.punta.y < 3.6) continue;
      if (azar() > 0.16) continue;
      // Casi todas cuelgan a media altura; solo una de cada cuatro llega al
      // suelo. Todas hasta abajo parecían los barrotes de una jaula.
      const hasta = azar() < 0.25 ? 0.15 : r.punta.y * (0.35 + azar() * 0.3);
      const largo = r.punta.y - hasta;
      if (largo < 0.9) continue;
      const base = r.punta.clone();
      const m = new THREE.Matrix4();
      m.compose(
        new THREE.Vector3(base.x + (azar() - 0.5) * 0.7, base.y - largo / 2, base.z + (azar() - 0.5) * 0.7),
        new THREE.Quaternion(),
        new THREE.Vector3(1, largo, 1),
      );
      colgantes.push(m);
    }
    const geoRaiz = new THREE.CylinderGeometry(0.022, 0.035, 1, 5);
    const mallaRaices = new THREE.InstancedMesh(geoRaiz, matMadera, Math.max(1, colgantes.length));
    colgantes.forEach((m, i) => mallaRaices.setMatrixAt(i, m));
    mallaRaices.count = colgantes.length;
    mallaRaices.castShadow = true;
    g.add(mallaRaices);

    // --- 4. LA COPA: racimos de hoja en las puntas, con tinte variado.
    //     Una esfera abollada por racimo; achatada, porque la hoja del ficus
    //     cae en mantos horizontales.
    const geoHoja = new THREE.SphereGeometry(1, 9, 7);
    {
      const p = geoHoja.attributes.position as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.set(p.getX(i), p.getY(i), p.getZ(i));
        const d = 1 + Math.sin(v.x * 6.1 + v.y * 4.3) * Math.cos(v.z * 5.7) * 0.22;
        v.normalize().multiplyScalar(d);
        p.setXYZ(i, v.x, v.y * 0.68, v.z);
      }
      geoHoja.computeVertexNormals();
    }
    const racimos: Array<{ m: THREE.Matrix4; c: THREE.Color }> = [];
    const tinte = new THREE.Color();
    for (const r of puntas) {
      // Tres racimos por punta, repartidos alrededor de ella.
      for (let k = 0; k < 3; k++) {
        const s = 1.25 + azar() * 0.95;
        const m = new THREE.Matrix4();
        m.compose(
          new THREE.Vector3(
            r.punta.x + (azar() - 0.5) * 1.7,
            r.punta.y + (azar() - 0.55) * 1.1,
            r.punta.z + (azar() - 0.5) * 1.7,
          ),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(azar() * 0.5, azar() * 6.3, azar() * 0.5)),
          new THREE.Vector3(s, s * 0.8, s),
        );
        racimos.push({ m, c: tinte.clone().setHSL(0.26 + azar() * 0.05, 0.42 + azar() * 0.2, 0.34 + azar() * 0.16) });
      }
    }
    const matHoja = new THREE.MeshStandardMaterial({ ...mapasPBR('follaje', 2.4, 1.6) });
    const mallaCopa = new THREE.InstancedMesh(geoHoja, matHoja, racimos.length);
    racimos.forEach((r, i) => { mallaCopa.setMatrixAt(i, r.m); mallaCopa.setColorAt(i, r.c); });
    mallaCopa.castShadow = true;
    mallaCopa.receiveShadow = true;
    g.add(mallaCopa);

    return g;
  }, []);

  return (
    <group>
      {/* El árbol, subido al islote del centro del estanque */}
      <group position={[0, 0.32, 0]}>
        <primitive object={grupo} />
      </group>

      {/* --- EL AGUA ALREDEDOR (petición de Eugenio) --- */}
      {/* Brocal de piedra que contiene el estanque */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[FICUS_BROCAL_R, FICUS_BROCAL_R + 0.15, 0.44, 40, 1, true]} />
        <meshStandardMaterial {...mapasPBR('roca', 8, 0.5)} side={THREE.DoubleSide} />
      </mesh>
      {/* El borde superior, para que no se vea el canto del cilindro */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.44, 0]} receiveShadow>
        <ringGeometry args={[FICUS_AGUA_R - 0.12, FICUS_BROCAL_R + 0.15, 40]} />
        <meshStandardMaterial {...mapasPBR('roca', 6, 1)} side={THREE.DoubleSide} />
      </mesh>
      {/* El agua: la misma que el río y los lagos, con sus olas */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
        <circleGeometry args={[FICUS_AGUA_R, 44]} />
        <MaterialAgua color="#3f7f9c" opacidad={0.9} repetirX={3} repetirY={3} velocidad={0.5} />
      </mesh>
      {/* El fondo del estanque, bajo el agua */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} receiveShadow>
        <circleGeometry args={[FICUS_AGUA_R, 32]} />
        <meshStandardMaterial {...mapasPBR('grava', 5)} />
      </mesh>
      {/* El islote de tierra donde arraiga, en medio del agua */}
      <mesh position={[0, 0.16, 0]} receiveShadow>
        <cylinderGeometry args={[2.35, 2.6, 0.34, 26]} />
        <meshStandardMaterial {...mapasPBR('tierra', 3, 0.4)} />
      </mesh>
      {/* Nenúfares: cuatro discos flotando, para que el agua no esté vacía */}
      {[0.7, 2.1, 3.6, 5.0].map((a, i) => {
        const r = 3.1 + (i % 2) * 0.75;
        return (
          <mesh key={a} rotation={[-Math.PI / 2, 0, 0]} position={[Math.cos(a) * r, 0.33, Math.sin(a) * r]}>
            <circleGeometry args={[0.42 + (i % 3) * 0.1, 14]} />
            <meshStandardMaterial color="#3f7f4a" roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

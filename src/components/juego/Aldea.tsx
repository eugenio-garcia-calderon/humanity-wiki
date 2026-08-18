// ============================================================================
// JUEGO VITAL — Eugenio's seed village: 14 houses around a plaza with a
// fountain, a winding river with a wooden bridge, 4 industrial naves, two
// lakes and ~1,100 instanced trees over 118 ha (1090×1090 m at 1 unit = 1 m).
// Everything is procedural low-poly (no external assets) and deterministic:
// the same seed builds the same village on every visit.
// ============================================================================
import { useMemo } from 'react';
import * as THREE from 'three';
import { PALETA, crearAzar, centroRio } from './paleta';
import { Detalles } from './Detalles';
import { Modelo, CASAS } from './Modelos';
// La distribución vive en mapa.ts y la comparten el mundo 3D y el minimapa,
// para que el mapa no pueda enseñar la aldea donde ya no está.
import { MITAD, PLAZA_R, CAMINOS, NAVES, LAGOS, casasAldea } from './mapa';

// ---------------------------------------------------------------------------
// Houses
// ---------------------------------------------------------------------------
/** Una casa de verdad del pack CC0, en lugar de la caja con tejado piramidal. */
function Casa({ x, z, rot, modelo }: { x: number; z: number; rot: number; modelo: string }) {
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <Modelo nombre={modelo} escala={3.2} />
    </group>
  );
}

function Casas() {
  const casas = useMemo(() => casasAldea(), []);
  return (
    <>
      {casas.map((c, i) => (
        <Casa key={i} x={c.x} z={c.z} rot={c.rot} modelo={CASAS[c.modelo % CASAS.length]} />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Industrial naves (west side)
// ---------------------------------------------------------------------------
function Nave({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow receiveShadow position={[0, 3.25, 0]}>
        <boxGeometry args={[16, 6.5, 10]} />
        <meshStandardMaterial color={PALETA.nave} />
      </mesh>
      {/* barrel roof: squashed cylinder lying along X, lower half hidden in the body */}
      <mesh castShadow position={[0, 6.4, 0]} rotation-z={Math.PI / 2} scale={[1, 1, 0.55]}>
        <cylinderGeometry args={[5, 5, 16.3, 20]} />
        <meshStandardMaterial color={PALETA.naveTecho} />
      </mesh>
      <mesh position={[0, 2.4, 5.02]}>
        <planeGeometry args={[4.6, 4.8]} />
        <meshStandardMaterial color={PALETA.navePuerta} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// River (winding ribbon) + bridge
// ---------------------------------------------------------------------------
function cintaRio(ancho: number, y: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const paso = 12;
  let fila = 0;
  for (let z = -MITAD - 15; z <= MITAD + 15; z += paso) {
    const cx = centroRio(z);
    pos.push(cx - ancho / 2, y, z, cx + ancho / 2, y, z);
    if (fila > 0) {
      const a = (fila - 1) * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    fila++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function Rio() {
  const orilla = useMemo(() => cintaRio(20, 0.03), []);
  const agua = useMemo(() => cintaRio(14, 0.07), []);
  return (
    <group>
      <mesh geometry={orilla}>
        <meshStandardMaterial color={PALETA.arena} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={agua}>
        <meshStandardMaterial color={PALETA.aguaRio} roughness={0.15} transparent opacity={0.92} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Puente() {
  const bx = centroRio(0);
  return (
    <group position={[bx, 0, 0]}>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[22, 0.5, 5]} />
        <meshStandardMaterial color={PALETA.madera} />
      </mesh>
      {[-2.4, 2.4].map((rz, i) => (
        <mesh key={i} castShadow position={[0, 1.25, rz]}>
          <boxGeometry args={[22, 0.7, 0.22]} />
          <meshStandardMaterial color={PALETA.madera} />
        </mesh>
      ))}
      {[-9, 9].flatMap(px => [-2.4, 2.4].map(pz => (
        <mesh key={`${px}-${pz}`} castShadow position={[px, 0.85, pz]}>
          <boxGeometry args={[0.35, 1.7, 0.35]} />
          <meshStandardMaterial color={PALETA.tronco} />
        </mesh>
      )))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Lakes
// ---------------------------------------------------------------------------
function Lagos() {
  return (
    <>
      {LAGOS.map((l, i) => (
        <group key={i} position={[l.x, 0, l.z]}>
          <mesh rotation-x={-Math.PI / 2} position-y={0.03} scale={[l.rx + 5, l.rz + 5, 1]}>
            <circleGeometry args={[1, 36]} />
            <meshStandardMaterial color={PALETA.arena} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={0.06} scale={[l.rx, l.rz, 1]}>
            <circleGeometry args={[1, 36]} />
            <meshStandardMaterial color={PALETA.aguaLago} roughness={0.15} transparent opacity={0.94} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Terrain, paths, plaza, fountain
// ---------------------------------------------------------------------------
function Terreno() {
  const parches = useMemo(() => {
    const azar = crearAzar(777);
    return Array.from({ length: 14 }, () => ({
      x: (azar() - 0.5) * 1000,
      z: (azar() - 0.5) * 1000,
      r: 30 + azar() * 45,
      color: azar() > 0.5 ? PALETA.pradoClaro : PALETA.pradoOscuro,
    }));
  }, []);
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[1100, 1100]} />
        <meshStandardMaterial color={PALETA.prado} />
      </mesh>
      {parches.map((p, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[p.x, 0.02, p.z]}>
          <circleGeometry args={[p.r, 24]} />
          <meshStandardMaterial color={p.color} transparent opacity={0.45} />
        </mesh>
      ))}
    </group>
  );
}

function Caminos() {
  return (
    <group>
      {CAMINOS.map(([cx, cz, w, l], i) => (
        <mesh key={i} position={[cx, 0.04, cz]} receiveShadow>
          <boxGeometry args={[w, 0.06, l]} />
          <meshStandardMaterial color={PALETA.camino} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position-y={0.05} receiveShadow>
        <circleGeometry args={[PLAZA_R, 36]} />
        <meshStandardMaterial color={PALETA.plaza} />
      </mesh>
    </group>
  );
}

function Fuente() {
  return (
    <group>
      <mesh castShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[2.3, 2.5, 0.7, 20]} />
        <meshStandardMaterial color={PALETA.fuentePiedra} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[2.0, 2.0, 0.06, 20]} />
        <meshStandardMaterial color={PALETA.aguaLago} roughness={0.1} />
      </mesh>
      <mesh castShadow position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.3, 0.42, 1.3, 10]} />
        <meshStandardMaterial color={PALETA.fuentePiedra} />
      </mesh>
      <mesh castShadow position={[0, 2.1, 0]}>
        <sphereGeometry args={[0.32, 12, 10]} />
        <meshStandardMaterial color={PALETA.aguaRio} roughness={0.1} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Instanced vegetation and props (built imperatively: full control over
// matrices/colors without TS friction, one draw call per mesh).
// ---------------------------------------------------------------------------
function libre(x: number, z: number): boolean {
  if (Math.abs(x) > 540 || Math.abs(z) > 540) return false;
  if (Math.hypot(x, z) < 52) return false;                          // village
  if (x > 28 && x < 96 && z > -62 && z < 18) return false;          // project district
  if (Math.abs(x - centroRio(z)) < 16) return false;                // river
  if (x > -94 && x < -46 && z > -50 && z < 50) return false;        // naves
  if (Math.abs(z) < 6 && x > -98 && x < 132) return false;          // E-W paths
  if (Math.abs(x) < 6 && Math.abs(z) < 68) return false;            // N-S paths
  for (const l of LAGOS) {
    if (Math.hypot((x - l.x) / (l.rx + 8), (z - l.z) / (l.rz + 8)) < 1) return false;
  }
  return true;
}

function Vegetacion() {
  const grupo = useMemo(() => {
    const azar = crearAzar(118);
    const g = new THREE.Group();

    // --- scatter tree positions: forest clusters + open sprinkle
    const arboles: Array<{ x: number; z: number; s: number; pino: boolean }> = [];
    const nucleos = [
      [-320, -180], [260, 130], [-150, -380], [320, -320],
      [-350, 260], [150, 330], [430, 80], [-80, 430],
    ];
    for (const [nx, nz] of nucleos) {
      for (let i = 0; i < 105; i++) {
        const x = nx + (azar() + azar() - 1) * 110;
        const z = nz + (azar() + azar() - 1) * 110;
        if (libre(x, z)) arboles.push({ x, z, s: 0.75 + azar() * 0.7, pino: azar() > 0.42 });
      }
    }
    for (let i = 0; i < 300; i++) {
      const x = (azar() - 0.5) * 1060;
      const z = (azar() - 0.5) * 1060;
      if (libre(x, z)) arboles.push({ x, z, s: 0.7 + azar() * 0.7, pino: azar() > 0.5 });
    }

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const escala = new THREE.Vector3();
    const posicion = new THREE.Vector3();
    const color = new THREE.Color();
    const colocar = (mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, s: number, rotY: number) => {
      posicion.set(x, y, z);
      escala.set(s, s, s);
      q.setFromAxisAngle(EJE_Y, rotY);
      m.compose(posicion, q, escala);
      mesh.setMatrixAt(i, m);
    };

    // trunks
    const troncos = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.28, 0.45, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: PALETA.tronco }),
      arboles.length,
    );
    arboles.forEach((a, i) => colocar(troncos, i, a.x, 1.1 * a.s, a.z, a.s, azar() * Math.PI));

    // crowns: pines (cones) and broadleaves (flattened icosahedra), tinted per instance
    const pinos = arboles.filter(a => a.pino);
    const hojas = arboles.filter(a => !a.pino);
    const copaPino = new THREE.InstancedMesh(
      new THREE.ConeGeometry(2.0, 4.8, 7),
      new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true }),
      pinos.length,
    );
    pinos.forEach((a, i) => {
      colocar(copaPino, i, a.x, (2.2 + 2.4) * a.s, a.z, a.s, azar() * Math.PI);
      copaPino.setColorAt(i, color.set(azar() > 0.5 ? PALETA.pino : PALETA.pinoClaro));
    });
    const copaHoja = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(2.1, 0),
      new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true }),
      hojas.length,
    );
    hojas.forEach((a, i) => {
      posicion.set(a.x, (2.2 + 1.7) * a.s, a.z);
      escala.set(a.s, a.s * 0.85, a.s);
      q.setFromAxisAngle(EJE_Y, azar() * Math.PI);
      m.compose(posicion, q, escala);
      copaHoja.setMatrixAt(i, m);
      copaHoja.setColorAt(i, color.set(azar() > 0.5 ? PALETA.hoja : PALETA.hojaClara));
    });

    // bushes, rocks and flowers for ground life
    const arbustos = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.75, 8, 6),
      new THREE.MeshStandardMaterial({ color: PALETA.arbusto, flatShading: true }),
      220,
    );
    for (let i = 0; i < 220; i++) {
      let x = 0, z = 0, intentos = 0;
      do { x = (azar() - 0.5) * 1040; z = (azar() - 0.5) * 1040; intentos++; } while (!libre(x, z) && intentos < 8);
      const s = 0.6 + azar() * 0.9;
      posicion.set(x, 0.45 * s, z);
      escala.set(s, s * 0.7, s);
      q.setFromAxisAngle(EJE_Y, azar() * Math.PI);
      m.compose(posicion, q, escala);
      arbustos.setMatrixAt(i, m);
    }

    const rocas = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.7, 0),
      new THREE.MeshStandardMaterial({ color: PALETA.piedra, flatShading: true }),
      90,
    );
    for (let i = 0; i < 90; i++) {
      let x = 0, z = 0, intentos = 0;
      do { x = (azar() - 0.5) * 1040; z = (azar() - 0.5) * 1040; intentos++; } while (!libre(x, z) && intentos < 8);
      const s = 0.4 + azar() * 1.1;
      colocar(rocas, i, x, 0.3 * s, z, s, azar() * Math.PI);
    }

    const flores = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.14, 6, 5),
      new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      260,
    );
    for (let i = 0; i < 260; i++) {
      // flowers concentrate near the village and paths, where the player walks
      const x = (azar() - 0.5) * 320;
      const z = (azar() - 0.5) * 320;
      colocar(flores, i, x, 0.12, z, 0.8 + azar() * 0.6, 0);
      flores.setColorAt(i, color.set(PALETA.flor[Math.floor(azar() * PALETA.flor.length)]));
    }

    for (const mesh of [troncos, copaPino, copaHoja, arbustos, rocas]) {
      mesh.castShadow = true;
      // Instanced bounding volumes ignore instance positions: culling would
      // make whole forests vanish at certain camera angles. Draw always.
      mesh.frustumCulled = false;
      g.add(mesh);
    }
    flores.frustumCulled = false;
    g.add(flores);
    return g;
  }, []);
  return <primitive object={grupo} />;
}

const EJE_Y = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------------------
export function Aldea() {
  return (
    <group>
      <Terreno />
      <Caminos />
      <Fuente />
      <Casas />
      {NAVES.map(n => <Nave key={n.z} x={n.x} z={n.z} />)}
      <Rio />
      <Puente />
      <Lagos />
      <Vegetacion />
      <Detalles />
    </group>
  );
}

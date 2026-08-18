// ============================================================================
// JUEGO VITAL — Eugenio's seed village: 14 houses around a plaza with a
// fountain, a winding river with a wooden bridge, 4 industrial naves, two
// lakes and ~1,100 instanced trees over 118 ha (1090×1090 m at 1 unit = 1 m).
// Everything is procedural low-poly (no external assets) and deterministic:
// the same seed builds the same village on every visit.
// ============================================================================
import { useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { PALETA, crearAzar, centroRio } from './paleta';
import { mapasPBR } from './texturas';
import { MaterialAgua } from './Agua';
import { Detalles, Banco, Farola, PuestoMercado, Pozo, Carro } from './Detalles';
import { Camper } from './Camper';
import { PantallaVisual } from './Pantalla';
import { SenalDePortal } from './Senales';
import { Modelo, CASAS } from './Modelos';
// La distribución vive en mapa.ts y la comparten el mundo 3D, el minimapa,
// el rebote y el editor: una pieza es LA MISMA en los cuatro sitios.
import { MITAD, PLAZA_R, CAMINOS, LAGOS, sueloLibre, type PiezaAldea } from './mapa';
import type { SeleccionMundo } from './tipos';

/** Nombre visible de cada tipo de pieza en el panel del editor. */
const ETIQUETAS: Record<string, string> = {
  casa: 'Casa', nave: 'Nave', fuente: 'Fuente', banco: 'Banco', farola: 'Farola',
  puesto: 'Puesto del mercado', pozo: 'Pozo', carro: 'Carro', arbol: 'Árbol',
  camper: 'Camión camperizado', pantalla: 'Gran pantalla',
};

function seleccionDe(p: PiezaAldea): SeleccionMundo {
  return {
    clase: 'semilla', id: p.seed_id, tipo: p.tipo,
    etiqueta: ETIQUETAS[p.tipo] || p.tipo,
    x: p.x, z: p.z, rot: p.rot,
    modelo: p.modelo != null ? String(p.modelo) : null,
  };
}

/**
 * Envuelve una pieza del pueblo y la hace pulsable: un clic abre sus opciones
 * directamente, sin activar ningún modo antes (petición de Eugenio). El umbral
 * de arrastre es el de siempre: arrastrar es girar la cámara, no pulsar.
 */
function Editable({ pieza, onPulsar, onAgarrar, children }: {
  pieza: PiezaAldea;
  onPulsar: (sel: SeleccionMundo) => void;
  onAgarrar: (sel: SeleccionMundo, punto: { x: number; y: number }) => void;
  children: React.ReactNode;
}) {
  return (
    <group
      position={[pieza.x, 0, pieza.z]}
      rotation-y={pieza.rot}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 6) return;
        e.stopPropagation();
        onPulsar(seleccionDe(pieza));
      }}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        // Pinchar y arrastrar MUEVE el objeto (petición de Eugenio). Aquí solo
        // se avisa del agarre; la página decide si fue arrastre o clic.
        if (e.nativeEvent.button !== undefined && e.nativeEvent.button !== 0) return;
        onAgarrar(seleccionDe(pieza), { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY });
      }}
    >
      {children}
      {/* Una pieza convertida en PORTAL conserva su forma: el nombre en
          verde y el aro son la única señal (aclaración de Eugenio). */}
      {pieza.portalProyectoId && (
        <SenalDePortal y={ALTO_SENAL[pieza.tipo] ?? 4.2} titulo={pieza.portalTitulo || ETIQUETAS[pieza.tipo] || 'Portal'} />
      )}
    </group>
  );
}

/** Dónde flota el rótulo de portal de cada tipo de pieza: por encima de su
 *  tejado, no dentro de él. */
const ALTO_SENAL: Record<string, number> = {
  casa: 8.6, nave: 9.2, camper: 4.6, fuente: 4.2, banco: 2.4, farola: 4.6, pantalla: 9.4,
  puesto: 3.6, pozo: 3.2, carro: 2.8, arbol: 6.2,
};

/** El aspecto de una pieza del pueblo, sin posición: lo usan el ensamblado y
 *  el FANTASMA que sigue al ratón mientras la arrastras. */
export function PiezaVisual({ pieza, indice = 0 }: { pieza: PiezaAldea; indice?: number }) {
  const s = pieza.escala || 1;
  switch (pieza.tipo) {
    // A 3,2 la casa medía 2,67 m — apenas más alta que el avatar (1,86 m).
    // A 6,4 queda en ~5,3 m: dos plantas creíbles. Radio de choque en mapa.ts.
    case 'casa': return <Modelo nombre={CASAS[(pieza.modelo ?? 0) % CASAS.length]} escala={6.4} />;
    case 'nave': return <Nave />;
    case 'fuente': return <Fuente />;
    case 'banco': return <Banco x={0} z={0} rot={0} />;
    case 'farola': return <Farola x={0} z={0} />;
    case 'puesto': return <PuestoMercado x={0} z={0} rot={0} color={PALETA.tela[indice % PALETA.tela.length]} />;
    case 'pozo': return <Pozo x={0} z={0} />;
    case 'carro': return <Carro x={0} z={0} rot={0} />;
    case 'camper': return <Camper />;
    // Solo para el FANTASMA del arrastre: en el mundo la pinta PantallaGrande
    // (con su clic de entrar al cine), no el ensamblado de Aldea.
    case 'pantalla': return <PantallaVisual />;
    case 'arbol': return (
      <group scale={s}>
        <mesh castShadow position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.28, 0.45, 2.4, 6]} />
          <meshStandardMaterial color={PALETA.tronco} />
        </mesh>
        {pieza.pino ? (
          <mesh castShadow position={[0, 4.6, 0]}>
            <coneGeometry args={[2.0, 4.8, 7]} />
            <meshStandardMaterial color={PALETA.pino} flatShading />
          </mesh>
        ) : (
          <mesh castShadow position={[0, 3.9, 0]} scale={[1, 0.85, 1]}>
            <icosahedronGeometry args={[2.1, 0]} />
            <meshStandardMaterial color={PALETA.hoja} flatShading />
          </mesh>
        )}
      </group>
    );
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Houses
// ---------------------------------------------------------------------------
// Las casas se pintan desde `piezas` (con los retoques del jugador aplicados)
// dentro del ensamblado de Aldea, envueltas en <Editable>.

// ---------------------------------------------------------------------------
// Industrial naves (west side)
// ---------------------------------------------------------------------------
function Nave() {
  return (
    <group>
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
  const uv: number[] = [];
  const idx: number[] = [];
  const paso = 12;
  let fila = 0;
  for (let z = -MITAD - 15; z <= MITAD + 15; z += paso) {
    const cx = centroRio(z);
    pos.push(cx - ancho / 2, y, z, cx + ancho / 2, y, z);
    // UVs para las texturas de la fase 1: u cruza la cinta, v recorre el
    // río (una vuelta de textura cada ~7 m).
    uv.push(0, z * 0.15, 1, z * 0.15);
    if (fila > 0) {
      const a = (fila - 1) * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    fila++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function Rio() {
  const orilla = useMemo(() => cintaRio(20, 0.03), []);
  const agua = useMemo(() => cintaRio(14, 0.07), []);
  return (
    <group>
      <mesh geometry={orilla} receiveShadow>
        <meshStandardMaterial {...mapasPBR('tierra', 2.4, 1)} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={agua}>
        <MaterialAgua color={PALETA.aguaRio} repetirX={1.6} repetirY={1} velocidad={2.2} />
      </mesh>
    </group>
  );
}

function Puente() {
  const bx = centroRio(0);
  return (
    <group position={[bx, 0, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[22, 0.5, 5]} />
        <meshStandardMaterial {...mapasPBR('madera', 7, 2)} />
      </mesh>
      {[-2.4, 2.4].map((rz, i) => (
        <mesh key={i} castShadow position={[0, 1.25, rz]}>
          <boxGeometry args={[22, 0.7, 0.22]} />
          <meshStandardMaterial {...mapasPBR('madera', 7, 1)} />
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
          <mesh rotation-x={-Math.PI / 2} position-y={0.03} scale={[l.rx + 5, l.rz + 5, 1]} receiveShadow>
            <circleGeometry args={[1, 36]} />
            <meshStandardMaterial {...mapasPBR('tierra', 9)} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={0.06} scale={[l.rx, l.rz, 1]}>
            <circleGeometry args={[1, 36]} />
            <MaterialAgua color={PALETA.aguaLago} opacidad={0.94} repetirX={7} repetirY={7} />
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
      {/* El prado con FOTO real de hierba (fase 1): la textura se repite
          cada ~5,5 m; los parches tintados de siempre disimulan la
          repetición a lo lejos. */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[1100, 1100]} />
        <meshStandardMaterial {...mapasPBR('hierba', 200)} />
      </mesh>
      {parches.map((p, i) => (
        <mesh key={i} rotation-x={-Math.PI / 2} position={[p.x, 0.02, p.z]}>
          <circleGeometry args={[p.r, 24]} />
          <meshStandardMaterial color={p.color} transparent opacity={0.28} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Caminos() {
  return (
    <group>
      {/* Caminos de grava real: la repetición de la textura se calcula del
          tamaño de cada tramo para que la piedra mida lo mismo en todos. */}
      {CAMINOS.map(([cx, cz, w, l], i) => (
        <mesh key={i} position={[cx, 0.04, cz]} receiveShadow>
          <boxGeometry args={[w, 0.06, l]} />
          <meshStandardMaterial {...mapasPBR('grava', Math.max(1, Math.round(w / 3)), Math.max(1, Math.round(l / 3)))} />
        </mesh>
      ))}
      {/* La plaza, ADOQUINADA de verdad: cada piedra con su relieve. */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.05} receiveShadow>
        <circleGeometry args={[PLAZA_R, 48]} />
        <meshStandardMaterial {...mapasPBR('adoquin', (PLAZA_R * 2) / 2.4)} />
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
        <MaterialAgua color={PALETA.aguaLago} repetirX={2} repetirY={2} velocidad={1.6} />
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
function Vegetacion({ arboles, onPulsar, onAgarrar }: {
  arboles: PiezaAldea[];
  onPulsar: (sel: SeleccionMundo) => void;
  onAgarrar: (sel: SeleccionMundo, punto: { x: number; y: number }) => void;
}) {
  const grupo = useMemo(() => {
    // Semilla 119 para arbustos, rocas y flores: antes compartían el chorro de
    // azar de los árboles (118); al mover los árboles a mapa.ts se les da el
    // suyo. Se recolocan una vez y quedan deterministas para siempre.
    const azar = crearAzar(119);
    const g = new THREE.Group();

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

    // Troncos: uno por árbol. `userData.arboles` mapea instancia → índice del
    // árbol en la lista, que es lo que hace el bosque PULSABLE en el editor.
    const troncos = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.28, 0.45, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: PALETA.tronco }),
      Math.max(1, arboles.length),
    );
    troncos.userData.arboles = arboles.map((_, i) => i);
    arboles.forEach((a, i) => colocar(troncos, i, a.x, 1.1 * (a.escala || 1), a.z, a.escala || 1, azar() * Math.PI));

    // Copas: pinos (conos) y frondosas (icosaedros), con su mapa de índices.
    const pinos: number[] = [];
    const hojas: number[] = [];
    arboles.forEach((a, i) => (a.pino ? pinos : hojas).push(i));
    const copaPino = new THREE.InstancedMesh(
      new THREE.ConeGeometry(2.0, 4.8, 7),
      new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true }),
      Math.max(1, pinos.length),
    );
    copaPino.userData.arboles = pinos;
    pinos.forEach((idx, i) => {
      const a = arboles[idx];
      const s = a.escala || 1;
      colocar(copaPino, i, a.x, (2.2 + 2.4) * s, a.z, s, azar() * Math.PI);
      copaPino.setColorAt(i, color.set(azar() > 0.5 ? PALETA.pino : PALETA.pinoClaro));
    });
    const copaHoja = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(2.1, 0),
      new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true }),
      Math.max(1, hojas.length),
    );
    copaHoja.userData.arboles = hojas;
    hojas.forEach((idx, i) => {
      const a = arboles[idx];
      const s = a.escala || 1;
      posicion.set(a.x, (2.2 + 1.7) * s, a.z);
      escala.set(s, s * 0.85, s);
      q.setFromAxisAngle(EJE_Y, azar() * Math.PI);
      m.compose(posicion, q, escala);
      copaHoja.setMatrixAt(i, m);
      copaHoja.setColorAt(i, color.set(azar() > 0.5 ? PALETA.hoja : PALETA.hojaClara));
    });

    // Arbustos, rocas y flores: vida de suelo, sin identidad (no editables).
    const arbustos = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.75, 8, 6),
      new THREE.MeshStandardMaterial({ color: PALETA.arbusto, flatShading: true }),
      220,
    );
    for (let i = 0; i < 220; i++) {
      let x = 0, z = 0, intentos = 0;
      do { x = (azar() - 0.5) * 1040; z = (azar() - 0.5) * 1040; intentos++; } while (!sueloLibre(x, z) && intentos < 8);
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
      do { x = (azar() - 0.5) * 1040; z = (azar() - 0.5) * 1040; intentos++; } while (!sueloLibre(x, z) && intentos < 8);
      const s = 0.4 + azar() * 1.1;
      colocar(rocas, i, x, 0.3 * s, z, s, azar() * Math.PI);
    }

    const flores = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.14, 6, 5),
      new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      260,
    );
    for (let i = 0; i < 260; i++) {
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
  }, [arboles]);

  return (
    <primitive
      object={grupo}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        const mapa = (e.object as THREE.Object3D).userData?.arboles as number[] | undefined;
        if (!mapa || e.instanceId == null || e.delta > 6) return;
        const pieza = arboles[mapa[e.instanceId]];
        if (!pieza) return;
        e.stopPropagation();
        onPulsar(seleccionDe(pieza));
      }}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        const mapa = (e.object as THREE.Object3D).userData?.arboles as number[] | undefined;
        if (!mapa || e.instanceId == null) return;
        const pieza = arboles[mapa[e.instanceId]];
        if (!pieza) return;
        if (e.nativeEvent.button !== undefined && e.nativeEvent.button !== 0) return;
        onAgarrar(seleccionDe(pieza), { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY });
      }}
    />
  );
}

const EJE_Y = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------------------
export function Aldea({ piezas, onPulsar, onAgarrar, ocultar }: {
  /** El pueblo con los retoques del jugador YA aplicados (los calcula Escena). */
  piezas: PiezaAldea[];
  /** Un clic en cualquier pieza abre sus opciones (mover, diseño, eliminar…). */
  onPulsar: (sel: SeleccionMundo) => void;
  /** Pinchar sin soltar: candidato a arrastre (la página decide). */
  onAgarrar: (sel: SeleccionMundo, punto: { x: number; y: number }) => void;
  /** La pieza que va agarrada: no se dibuja (la lleva el fantasma). */
  ocultar?: string;
}) {
  const de = (tipo: string) => piezas.filter(p => p.tipo === tipo && p.seed_id !== ocultar);
  const arboles = useMemo(
    () => piezas.filter(p => p.tipo === 'arbol' && p.seed_id !== ocultar),
    [piezas, ocultar],
  );
  return (
    <group>
      <Terreno />
      <Caminos />
      {['fuente', 'casa', 'nave', 'banco', 'farola', 'puesto', 'pozo', 'carro', 'camper'].map(tipo =>
        de(tipo).map((p, i) => (
          <Editable key={p.seed_id} pieza={p} onPulsar={onPulsar} onAgarrar={onAgarrar}>
            <PiezaVisual pieza={p} indice={i} />
          </Editable>
        )))}
      <Rio />
      <Puente />
      <Lagos />
      <Vegetacion arboles={arboles} onPulsar={onPulsar} onAgarrar={onAgarrar} />
      <Detalles />
    </group>
  );
}

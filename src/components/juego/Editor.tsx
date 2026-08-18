// ============================================================================
// JUEGO VITAL — el editor del mundo: un Miro en 3D (2026-08-18, petición de
// Eugenio: «click en cualquier elemento para eliminarlo o cambiar su diseño,
// click en el mapa para crear reutilizando los ya creados, notas, documentos
// y archivos flotando, y mover objetos con una UI genial»).
// ============================================================================
// Aquí viven las piezas 3D del editor:
//
//   <ObjetosMundo>   los objetos plantados por el jugador (props del catálogo,
//                    notas, imágenes y documentos) + sus hilos de conocimiento.
//   <SueloEditor>    el plano invisible que recoge los clics en el suelo:
//                    pulsar tierra vacía abre el panel de crear, y en modo
//                    «mover» es donde se suelta el objeto.
//   <MarcadorMover>  el anillo que sigue al ratón mientras mueves algo.
//   <AnilloSeleccion> el aro que late bajo el objeto seleccionado.
//
// Los paneles (catálogo, botones de editar) son HTML de la página: aquí solo
// está lo que se dibuja dentro del lienzo.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Billboard, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { PALETA } from './paleta';
import { Modelo, CASAS } from './Modelos';
import { Banco, Farola, PuestoMercado, Pozo } from './Detalles';
import type { ItemMundo, SeleccionMundo } from './tipos';

const ORO = '#f6c667';
const POSTIT = '#fbe28a';
const PAPEL = '#f7f3e9';

/** El clic solo cuenta si NO venías arrastrando la cámara (mismo umbral que
 *  Senales.tsx: arrastrar es girar la vista, no pulsar). */
const esClic = (e: ThreeEvent<MouseEvent>) => e.delta <= 6;

// ---------------------------------------------------------------------------
// Props procedurales del catálogo (los que no salen del pack de modelos)
// ---------------------------------------------------------------------------

function ArbolProc({ pino }: { pino: boolean }) {
  return (
    <group>
      <mesh castShadow position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.28, 0.45, 2.4, 6]} />
        <meshStandardMaterial color={PALETA.tronco} />
      </mesh>
      {pino ? (
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
}

function RocaProc() {
  return (
    <mesh castShadow position={[0, 0.35, 0]}>
      <dodecahedronGeometry args={[0.8, 0]} />
      <meshStandardMaterial color={PALETA.piedra} flatShading />
    </mesh>
  );
}

function ArbustoProc() {
  return (
    <mesh castShadow position={[0, 0.5, 0]} scale={[1, 0.7, 1]}>
      <sphereGeometry args={[0.85, 8, 6]} />
      <meshStandardMaterial color={PALETA.arbusto} flatShading />
    </mesh>
  );
}

/** Un prop del catálogo, por nombre. La casa elige su modelo con el id para
 *  que dos casas creadas no salgan clónicas. */
export function PropMundo({ modelo, semilla }: { modelo: string; semilla: string }) {
  switch (modelo) {
    case 'arbol': return <ArbolProc pino={false} />;
    case 'pino': return <ArbolProc pino />;
    case 'casa': {
      let h = 0;
      for (let i = 0; i < semilla.length; i++) h = (h * 31 + semilla.charCodeAt(i)) >>> 0;
      return <Modelo nombre={CASAS[h % CASAS.length]} escala={3.2} />;
    }
    case 'banco': return <Banco x={0} z={0} rot={0} />;
    case 'farola': return <Farola x={0} z={0} />;
    case 'puesto': return <PuestoMercado x={0} z={0} rot={0} color={PALETA.tela[0]} />;
    case 'pozo': return <Pozo x={0} z={0} />;
    case 'roca': return <RocaProc />;
    case 'arbusto': return <ArbustoProc />;
    default: return <RocaProc />;
  }
}

// ---------------------------------------------------------------------------
// Conocimiento plantado: notas, imágenes y documentos
// ---------------------------------------------------------------------------

/** Bamboleo suave: lo que flota se mueve un poco, como en la habitación. */
function Flota({ fase, children }: { fase: number; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((estado) => {
    if (!g.current) return;
    const t = estado.clock.elapsedTime + fase;
    g.current.position.y = Math.sin(t * 0.8) * 0.12;
    g.current.rotation.z = Math.sin(t * 0.5) * 0.015;
  });
  return <group ref={g}>{children}</group>;
}

/** Nota amarilla flotando a la altura de la vista, con su texto. */
function Nota3D({ texto }: { texto: string }) {
  return (
    <Billboard position={[0, 2.1, 0]}>
      <mesh>
        <planeGeometry args={[2.9, 2.1]} />
        <meshBasicMaterial color={POSTIT} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.02, 0.01]}>
        <planeGeometry args={[2.9, 0.14]} />
        <meshBasicMaterial color={ORO} toneMapped={false} />
      </mesh>
      <Text
        position={[-1.28, 0.78, 0.02]}
        fontSize={0.21}
        maxWidth={2.6}
        lineHeight={1.25}
        color="#4a3d18"
        anchorX="left"
        anchorY="top"
      >
        {(texto || 'Nota vacía').slice(0, 220)}
      </Text>
    </Billboard>
  );
}

/** Imagen subida, en un marco. La textura se carga a mano (una imagen rota no
 *  puede tumbar el Suspense) y el material se REMONTA con otra key al llegar:
 *  three no recompila el shader de un material que nació sin mapa. */
function Imagen3D({ url }: { url: string }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let vivo = true;
    new THREE.TextureLoader().load(url, (t) => {
      if (!vivo) return;
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    }, undefined, () => { /* la imagen no está: queda el marco */ });
    return () => { vivo = false; };
  }, [url]);
  const img = tex?.image as { width?: number; height?: number } | undefined;
  const prop = img?.width && img?.height ? img.height / img.width : 0.68;
  const ancho = 3;
  return (
    <Billboard position={[0, 2.2, 0]}>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[ancho + 0.24, ancho * prop + 0.24]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh>
        <planeGeometry args={[ancho, ancho * prop]} />
        {tex
          ? <meshBasicMaterial key="con" map={tex} toneMapped={false} />
          : <meshBasicMaterial key="sin" color="#d8dee6" />}
      </mesh>
    </Billboard>
  );
}

/** Documento subido: una hoja con su nombre. Pulsarlo (fuera del modo
 *  edición) lo abre. */
function Documento3D({ nombre }: { nombre: string }) {
  return (
    <Billboard position={[0, 2.1, 0]}>
      <mesh>
        <planeGeometry args={[2.1, 2.7]} />
        <meshBasicMaterial color={PAPEL} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.13, 0.01]}>
        <planeGeometry args={[2.1, 0.44]} />
        <meshBasicMaterial color={PALETA.robotLuz} toneMapped={false} />
      </mesh>
      {[0.45, 0.1, -0.25, -0.6].map((y, i) => (
        <mesh key={y} position={[0, y, 0.01]}>
          <planeGeometry args={[1.5 - (i % 2) * 0.35, 0.09]} />
          <meshBasicMaterial color="#c9cfd8" />
        </mesh>
      ))}
      <Text position={[0, -1.05, 0.02]} fontSize={0.17} maxWidth={1.9} color="#3a4552" anchorX="center" anchorY="middle" textAlign="center">
        {(nombre || 'Documento').slice(0, 40)}
      </Text>
    </Billboard>
  );
}

/** Poste que ancla al suelo lo que flota (nota, imagen, documento). */
function Poste() {
  return (
    <mesh castShadow position={[0, 0.55, 0]}>
      <cylinderGeometry args={[0.035, 0.05, 1.1, 6]} />
      <meshStandardMaterial color={PALETA.tronco} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Los objetos del jugador + sus hilos
// ---------------------------------------------------------------------------

/** Altura a la que sale el hilo de cada tipo de cosa. */
const alturaHilo = (tipo: string) =>
  tipo === 'nota' || tipo === 'documento' ? 2.1 : tipo === 'imagen' ? 2.2 : 1.2;

export function ObjetosMundo({ items, editando, onPulsar, onAbrir, resolverDestino }: {
  items: ItemMundo[];
  editando: boolean;
  onPulsar: (sel: SeleccionMundo) => void;
  /** Fuera del modo edición: pulsar una nota/imagen/documento lo abre para leer. */
  onAbrir: (item: ItemMundo) => void;
  /** Convierte 'agente:GA…' | 'proy:PRY…' | 'item:WM…' en una posición, o null. */
  resolverDestino: (ref: string) => { x: number; y: number; z: number } | null;
}) {
  // Los hilos de conocimiento: curvas de un objeto a lo que apunta.
  const hilos = useMemo(() => {
    const lista: Array<{ clave: string; puntos: THREE.Vector3[] }> = [];
    for (const it of items) {
      for (const [i, e] of (it.enlaces || []).entries()) {
        const destino = resolverDestino(e.a);
        if (!destino) continue;
        const a = new THREE.Vector3(it.x, alturaHilo(it.tipo), it.z);
        const b = new THREE.Vector3(destino.x, destino.y, destino.z);
        const medio = a.clone().lerp(b, 0.5);
        medio.y += Math.max(2, a.distanceTo(b) * 0.18);   // arco hacia arriba
        const curva = new THREE.QuadraticBezierCurve3(a, medio, b);
        lista.push({ clave: `${it.id}:${i}`, puntos: curva.getPoints(24) });
      }
    }
    return lista;
  }, [items, resolverDestino]);

  const pulsar = (e: ThreeEvent<MouseEvent>, it: ItemMundo) => {
    if (!esClic(e)) return;
    e.stopPropagation();
    if (editando) {
      onPulsar({
        clase: 'item', id: it.id, tipo: it.tipo,
        etiqueta: it.tipo === 'prop' ? `Objeto (${it.modelo})` : it.tipo === 'nota' ? 'Nota' : it.tipo === 'imagen' ? 'Imagen' : (it.nombre || 'Documento'),
        x: it.x, z: it.z, rot: it.rot, modelo: it.modelo, texto: it.texto, url: it.url,
      });
    } else if (it.tipo !== 'prop') {
      onAbrir(it);   // leer la nota, ver la imagen, abrir el documento
    }
  };

  return (
    <group>
      {items.map((it, i) => (
        <group key={it.id} position={[it.x, 0, it.z]} rotation-y={it.rot} onClick={(e) => pulsar(e, it)}>
          {it.tipo === 'prop' && <PropMundo modelo={it.modelo || 'roca'} semilla={it.id} />}
          {it.tipo === 'nota' && <><Poste /><Flota fase={i * 1.3}><Nota3D texto={it.texto || ''} /></Flota></>}
          {it.tipo === 'imagen' && it.url && <><Poste /><Flota fase={i * 1.3}><Imagen3D url={it.url} /></Flota></>}
          {it.tipo === 'documento' && <><Poste /><Flota fase={i * 1.3}><Documento3D nombre={it.nombre || ''} /></Flota></>}
          {/* Blanco generoso para el dedo en lo que flota fino */}
          {it.tipo !== 'prop' && (
            <mesh position={[0, 2, 0]}>
              <cylinderGeometry args={[1.6, 1.6, 3.2, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          )}
        </group>
      ))}
      {hilos.map(h => (
        <Line key={h.clave} points={h.puntos} color={ORO} lineWidth={2} transparent opacity={0.75} />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// El suelo del editor, el marcador de mover y el anillo de selección
// ---------------------------------------------------------------------------

export function SueloEditor({ moviendo, movil, onSuelo, onSoltar }: {
  moviendo: boolean;
  /** Compartido con la página: la última posición del ratón sobre el suelo. */
  movil: React.MutableRefObject<{ x: number; z: number } | null>;
  onSuelo: (p: { x: number; z: number }) => void;
  onSoltar: (p: { x: number; z: number }) => void;
}) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.01, 0]}
      onPointerMove={(e) => {
        if (moviendo) movil.current = { x: e.point.x, z: e.point.z };
      }}
      onClick={(e) => {
        if (!esClic(e)) return;
        const p = { x: e.point.x, z: e.point.z };
        if (moviendo) onSoltar(movil.current || p);
        else onSuelo(p);
      }}
    >
      <planeGeometry args={[1100, 1100]} />
      {/* Transparente pero NO visible={false}: lo invisible se salta el rayo. */}
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

/** El anillo que sigue al ratón mientras mueves un objeto. */
export function MarcadorMover({ movil }: {
  movil: React.MutableRefObject<{ x: number; z: number } | null>;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame((estado) => {
    const gr = g.current;
    if (!gr) return;
    const p = movil.current;
    gr.visible = !!p;
    if (p) {
      gr.position.x += (p.x - gr.position.x) * 0.4;
      gr.position.z += (p.z - gr.position.z) * 0.4;
      const s = 1 + Math.sin(estado.clock.elapsedTime * 5) * 0.08;
      gr.scale.setScalar(s);
    }
  });
  return (
    <group ref={g} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[1.0, 1.35, 40]} />
        <meshBasicMaterial color={ORO} toneMapped={false} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 5, 6]} />
        <meshBasicMaterial color={ORO} toneMapped={false} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/** El aro que late bajo el objeto seleccionado. */
export function AnilloSeleccion({ x, z }: { x: number; z: number }) {
  const m = useRef<THREE.Mesh>(null);
  useFrame((estado) => {
    if (!m.current) return;
    const s = 1 + Math.sin(estado.clock.elapsedTime * 3.2) * 0.1;
    m.current.scale.setScalar(s);
  });
  return (
    <mesh ref={m} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.06, z]}>
      <ringGeometry args={[1.4, 1.75, 44]} />
      <meshBasicMaterial color="#4ade80" toneMapped={false} transparent opacity={0.95} side={THREE.DoubleSide} />
    </mesh>
  );
}

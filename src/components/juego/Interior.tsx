// ============================================================================
// JUEGO VITAL — el interior de un proyecto (2026-08-18, petición de Eugenio).
// ============================================================================
// Chocar con el edificio de un proyecto te mete DENTRO: una sala diáfana con
// un núcleo que respira al ritmo de su avance real, y una puerta por cada
// grupo del tablero. Entrar por una puerta es abrir esa carpeta, y dentro
// flotan sus tarjetas, sus fotos y sus documentos.
//
// Nada de esto es decorado: los grupos son los del proyecto (`proyectos.grupos`),
// las tarjetas son sus `roadmap_items` y las fotos son las imágenes que hay de
// verdad en los bloques de cada tarjeta.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import {
  SALA_R, PUERTA_R, SALIDA, HAB_ANCHO, HAB_FONDO, HAB_SALIDA,
  PLAZA_LIM, PLAZA_SALIDA,
  posicionPuerta, posicionItem, posicionHabitante,
  agenteDeItem, habitantesDeSala, type Grupo,
} from './planta';
import { PortalVerde, LuzDePortal, VERDE_PORTAL } from './PortalVerde';
import type { Agente, ItemProyecto } from './tipos';
import { Persona3D, cuerpoDe } from './Modelos';
import { Halo, Interactivo, Rotulo } from './Senales';
import { PALETA } from './paleta';

const ORO = '#f6c667';
const CRISTAL = '#cfe4f2';
// Suelo y paredes claros a propósito: con los tonos casi negros del primer
// intento, la sala parecía una cueva y no se leía nada de lo que flota.
const SUELO = '#2b3442';
const PARED = '#3a4655';

/** Colores de estado del tablero, para que una tarjeta se lea de un vistazo. */
const COLOR_ESTADO: Record<string, string> = {
  hecho: '#34d399',
  en_curso: '#f6c667',
  por_hacer: '#7c8b9c',
};

// ---------------------------------------------------------------------------
// Piezas comunes
// ---------------------------------------------------------------------------

/** Flota y se balancea despacio. Todo lo que «no toca el suelo» usa esto. */
function Flotante({ fase, amplitud = 0.18, children }: {
  fase: number; amplitud?: number; children: React.ReactNode;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame((estado) => {
    const t = estado.clock.elapsedTime + fase;
    if (!g.current) return;
    g.current.position.y = Math.sin(t * 0.9) * amplitud;
    g.current.rotation.z = Math.sin(t * 0.6) * 0.02;
  });
  return <group ref={g}>{children}</group>;
}

/**
 * Una foto de verdad, flotando. La textura se carga a mano y no con `useTexture`
 * a propósito: una imagen que falle (borrada, sin permiso) tumbaría todo el
 * Suspense de la escena; así, simplemente, esa foto no aparece.
 */
function Foto({ url, ancho = 3 }: { url: string; ancho?: number }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let vivo = true;
    new THREE.TextureLoader().load(url, (t) => {
      if (!vivo) return;
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    }, undefined, () => { /* la foto no está: se queda el marco vacío */ });
    return () => { vivo = false; };
  }, [url]);

  const img = tex?.image as { width?: number; height?: number } | undefined;
  const prop = img?.width && img?.height ? img.height / img.width : 0.68;
  const alto = ancho * prop;

  return (
    <group>
      {/* Marco luminoso: hace que la foto se vea recortada contra la sala */}
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[ancho + 0.22, alto + 0.22]} />
        <meshBasicMaterial color={CRISTAL} transparent opacity={0.5} />
      </mesh>
      <mesh>
        <planeGeometry args={[ancho, alto]} />
        {/* La `key` NO es decorativa: sin ella React reutiliza el mismo
            material al llegar la textura, y three no recompila el shader de
            uno que nació sin mapa — la foto se quedaba NEGRA. Cambiar la key
            monta un material nuevo, que ya nace con su mapa. */}
        {tex
          ? <meshBasicMaterial key="con-foto" map={tex} toneMapped={false} />
          : <meshBasicMaterial key="sin-foto" color={PARED} />}
      </mesh>
    </group>
  );
}

/** Tarjeta del tablero, como una lámina de cristal con su título. */
function Tarjeta({ item, color }: { item: ItemProyecto; color: string }) {
  const estado = COLOR_ESTADO[item.estado] || COLOR_ESTADO.por_hacer;
  return (
    <group>
      <mesh>
        <planeGeometry args={[4.2, 2.6]} />
        <meshBasicMaterial color={PARED} transparent opacity={0.82} />
      </mesh>
      {/* Filo de color: el estado de la tarjeta, legible desde lejos */}
      <mesh position={[-2.05, 0, 0.01]}>
        <planeGeometry args={[0.16, 2.6]} />
        <meshBasicMaterial color={estado} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.36, 0.01]}>
        <planeGeometry args={[4.2, 0.08]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <Text
        position={[-1.75, 0.62, 0.03]}
        fontSize={0.28}
        maxWidth={3.5}
        lineHeight={1.2}
        color="#ffffff"
        anchorX="left"
        anchorY="top"
      >
        {item.titulo}
      </Text>
      {item.resumen && (
        <Text
          position={[-1.75, -0.35, 0.03]}
          fontSize={0.19}
          maxWidth={3.5}
          lineHeight={1.3}
          color="#a9b7c6"
          anchorX="left"
          anchorY="top"
        >
          {item.resumen.slice(0, 120)}
        </Text>
      )}
      <Text position={[-1.75, -1.12, 0.03]} fontSize={0.17} color={estado} anchorX="left" anchorY="middle">
        {item.estado === 'hecho' ? 'HECHO' : item.estado === 'en_curso' ? 'EN CURSO' : 'POR HACER'}
      </Text>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Personas dentro de una habitación
// ---------------------------------------------------------------------------

/**
 * Una persona real de tu mundo, de pie en la habitación. Es el MISMO avatar
 * que tiene en la aldea (su fenotipo y sus colores), no un muñeco genérico, y
 * al pulsarla se abre su conversación de siempre — con su memoria.
 */
function Habitante({ a, color, onHablar }: {
  a: Agente; color: string; onHablar: (a: Agente) => void;
}) {
  const fase = useMemo(() => Math.random() * Math.PI * 2, []);
  const g = useRef<THREE.Group>(null);
  useFrame((estado) => {
    if (g.current) g.current.rotation.y = Math.sin((estado.clock.elapsedTime + fase) * 0.3) * 0.4;
  });
  return (
    <group>
      {/* Peana de luz: la persona no flota, pero su suelo sí brilla */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[1.1, 1.45, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.75} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 2.4, 1.4]} color={CRISTAL} intensity={16} distance={9} />
      <Halo y={3.4} color={color} radio={0.75} />
      <Interactivo onPulsar={() => onHablar(a)}>
        {(resaltado) => (
          <group>
            <group ref={g}>
              <Persona3D
                cuerpo={a.apariencia?.cuerpo || cuerpoDe(a.nombre)}
                animacion="idle"
                aspecto={a.apariencia}
              />
            </group>
            {/* Blanco generoso para el dedo. Transparente, NO invisible: lo
                invisible se salta el rayo del ratón y no habría qué pulsar. */}
            <mesh position={[0, 1, 0]}>
              <cylinderGeometry args={[1.1, 1.1, 2.2, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <Rotulo
              y={2.8}
              texto={a.nombre}
              pie={a.rol || 'Pulsa para hablar'}
              color={PALETA.robotLuz}
              resaltado={resaltado}
            />
          </group>
        )}
      </Interactivo>
    </group>
  );
}

/** Documento: una hoja con su nombre. Lo que no es imagen, se ve así. */
function Documento({ nombre, color }: { nombre: string; color: string }) {
  return (
    <group>
      <mesh>
        <planeGeometry args={[2.2, 2.9]} />
        <meshBasicMaterial color="#f4efe2" />
      </mesh>
      <mesh position={[0, 1.18, 0.01]}>
        <planeGeometry args={[2.2, 0.5]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {[0.5, 0.15, -0.2, -0.55, -0.9].map((y, i) => (
        <mesh key={y} position={[0, y, 0.01]}>
          <planeGeometry args={[1.6 - (i % 2) * 0.4, 0.09]} />
          <meshBasicMaterial color="#c9cfd8" />
        </mesh>
      ))}
      <Text position={[0, -1.28, 0.02]} fontSize={0.19} maxWidth={2} color="#3a4552" anchorX="center" anchorY="middle">
        {nombre.slice(0, 28)}
      </Text>
    </group>
  );
}

// ---------------------------------------------------------------------------
// La sala diáfana
// ---------------------------------------------------------------------------

/** Núcleo del proyecto: late con su avance real (tareas hechas / totales). */
function Nucleo({ pct, color }: { pct: number; color: string }) {
  const anillo = useRef<THREE.Group>(null);
  const centro = useRef<THREE.Mesh>(null);
  useFrame((estado) => {
    const t = estado.clock.elapsedTime;
    if (anillo.current) anillo.current.rotation.y = t * 0.25;
    if (centro.current) {
      centro.current.rotation.x = t * 0.13;
      centro.current.rotation.y = t * 0.19;
      const r = 1 + Math.sin(t * 1.6) * 0.035;   // respira
      centro.current.scale.setScalar(r);
    }
  });
  return (
    <group position={[0, 4.6, 0]}>
      <mesh ref={centro}>
        <icosahedronGeometry args={[1.9, 1]} />
        <meshStandardMaterial
          color={color} emissive={color} emissiveIntensity={0.65}
          roughness={0.25} metalness={0.3} flatShading transparent opacity={0.92}
        />
      </mesh>
      <group ref={anillo}>
        {/* El arco lleno es el porcentaje de tareas hechas: el proyecto se ve */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3.1, 0.075, 10, 96, Math.PI * 2 * Math.max(0.02, pct)]} />
          <meshBasicMaterial color={ORO} toneMapped={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3.1, 0.03, 8, 96]} />
          <meshBasicMaterial color={CRISTAL} transparent opacity={0.25} />
        </mesh>
        <mesh rotation={[Math.PI / 2.6, 0.5, 0]}>
          <torusGeometry args={[4.1, 0.02, 8, 80]} />
          <meshBasicMaterial color={color} transparent opacity={0.35} toneMapped={false} />
        </mesh>
      </group>
      <Billboard position={[0, -3.1, 0]}>
        <Text fontSize={0.95} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
          {Math.round(pct * 100)}%
        </Text>
      </Billboard>
    </group>
  );
}

/** Una puerta = un grupo del tablero = una carpeta en la que entrar. */
function Puerta({ x, z, ang, grupo, n, unidad = 'tarjeta' }: {
  x: number; z: number; ang: number; grupo: Grupo; n: number; unidad?: string;
}) {
  const luz = useRef<THREE.Mesh>(null);
  const fase = useMemo(() => Math.random() * 6, []);
  useFrame((estado) => {
    if (!luz.current) return;
    const t = estado.clock.elapsedTime + fase;
    (luz.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(t * 1.4) * 0.16;
  });
  // La puerta mira al centro de la sala.
  const giro = -ang + Math.PI / 2;
  return (
    <group position={[x, 0, z]} rotation={[0, giro, 0]}>
      {/* Jambas y dintel */}
      {[-1.9, 1.9].map(dx => (
        <mesh key={dx} position={[dx, 2.6, 0]} castShadow>
          <boxGeometry args={[0.42, 5.2, 0.6]} />
          <meshStandardMaterial color={PARED} metalness={0.15} roughness={0.55} />
        </mesh>
      ))}
      <mesh position={[0, 5.35, 0]} castShadow>
        <boxGeometry args={[4.2, 0.55, 0.6]} />
        <meshStandardMaterial color={PARED} metalness={0.15} roughness={0.55} />
      </mesh>
      {/* El velo de luz del color del grupo: es lo que se ve desde el centro */}
      <mesh ref={luz} position={[0, 2.6, 0]}>
        <planeGeometry args={[3.4, 5.2]} />
        <meshBasicMaterial color={grupo.color} transparent opacity={0.55} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 2.6, 1.2]} color={grupo.color} intensity={9} distance={12} />
      <Billboard position={[0, 6.3, 0]}>
        <Text fontSize={0.52} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
          {grupo.label}
        </Text>
        <Text position={[0, -0.62, 0]} fontSize={0.32} color={grupo.color} anchorX="center" anchorY="middle">
          {n === 0 ? 'vacía' : `${n} ${unidad}${n === 1 ? '' : 's'}`}
        </Text>
      </Billboard>
    </group>
  );
}

/** Suelo, paredes de cristal y techo luminoso: el «diáfano» de la sala. */
function Envoltura({ color }: { color: string }) {
  const anillos = useRef<THREE.Group>(null);
  useFrame((estado) => {
    if (anillos.current) anillos.current.rotation.y = -estado.clock.elapsedTime * 0.04;
  });
  return (
    <group>
      {/* OJO con `metalness`: sin mapa de entorno, un material metálico no
          tiene nada que reflejar y sale NEGRO. El suelo de la sala salía como
          un agujero hasta que se bajó casi a cero. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[SALA_R, 64]} />
        <meshStandardMaterial color={SUELO} roughness={0.55} metalness={0.05} />
      </mesh>
      {/* Anillos de luz en el suelo: dan escala y movimiento a la sala */}
      <group ref={anillos}>
        {[6, 11, 16, 21].map((r, i) => (
          <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[r, r + 0.07, 96, 1, 0, Math.PI * (1.2 + i * 0.2)]} />
            <meshBasicMaterial color={i % 2 ? color : ORO} transparent opacity={0.5} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* Muro de cristal esmerilado, con juntas */}
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[SALA_R, SALA_R, 12, 48, 1, true]} />
        <meshStandardMaterial
          color={CRISTAL} transparent opacity={0.14} side={THREE.BackSide}
          roughness={0.1} metalness={0.2}
        />
      </mesh>
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * SALA_R, 6, Math.sin(a) * SALA_R]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.16, 12, 0.16]} />
            <meshStandardMaterial color={PARED} metalness={0.15} roughness={0.5} />
          </mesh>
        );
      })}
      {/* Techo: un plano luminoso, la fuente de luz de toda la sala */}
      <mesh position={[0, 12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[SALA_R, 48]} />
        <meshBasicMaterial color={CRISTAL} transparent opacity={0.16} />
      </mesh>
    </group>
  );
}

/** Portal de vuelta: siempre a tu espalda al entrar, siempre igual. */
function Portal({ x, z, texto, color = ORO }: { x: number; z: number; texto: string; color?: string }) {
  const aro = useRef<THREE.Mesh>(null);
  useFrame((estado) => {
    if (aro.current) aro.current.rotation.z = estado.clock.elapsedTime * 0.6;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh ref={aro} position={[0, 2.4, 0]}>
        <torusGeometry args={[1.9, 0.13, 10, 40]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.4, 0]}>
        <circleGeometry args={[1.85, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 2.4, 0]} color={color} intensity={7} distance={11} />
      <Billboard position={[0, 5, 0]}>
        <Text fontSize={0.42} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
          {texto}
        </Text>
      </Billboard>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Escena completa: sala o habitación
// ---------------------------------------------------------------------------

export interface DatosInterior {
  proyecto: { id: string; titulo: string; slug: string; tarjetas: number; hechas: number };
  grupos: Grupo[];
  items: ItemProyecto[];
  color: string;
  /** null = la sala diáfana; si no, el id del grupo en el que estás. */
  sala: string | null;
  /** La gente de tu mundo. Una tarjeta que ES una persona se dibuja como ella. */
  agentes: Agente[];
}

export function InteriorProyecto({ datos, onHablar }: {
  datos: DatosInterior;
  /** Pulsar a alguien dentro de una habitación abre SU conversación. */
  onHablar: (a: Agente) => void;
}) {
  const { proyecto, grupos, items, color, sala, agentes } = datos;
  const pct = proyecto.tarjetas > 0 ? proyecto.hechas / proyecto.tarjetas : 0;

  // --- Habitación: las tarjetas de un grupo, con sus fotos y documentos
  if (sala) {
    const grupo = grupos.find(g => g.id === sala);
    const suyos = items.filter(i => i.grupo === sala);
    // Las tarjetas que SON personas se sacan aparte: no se dibujan como una
    // lámina con su nombre, sino como la persona misma, de pie en la sala.
    const gente = habitantesDeSala(items, sala, agentes, proyecto.id);
    const cosas: Array<{ clave: string; tipo: 'tarjeta' | 'foto' | 'doc'; item?: ItemProyecto; url?: string; nombre?: string }> = [];
    for (const it of suyos) {
      if (agenteDeItem(it, agentes)) continue;   // esa tarjeta es una persona
      cosas.push({ clave: `t:${it.id}`, tipo: 'tarjeta', item: it });
      for (const [i, b] of (Array.isArray(it.bloques) ? it.bloques : []).entries()) {
        if (b?.tipo === 'imagen' && b.url) cosas.push({ clave: `f:${it.id}:${i}`, tipo: 'foto', url: b.url, nombre: b.pie });
        else if (b?.tipo === 'texto' && b.texto) cosas.push({ clave: `d:${it.id}:${i}`, tipo: 'doc', nombre: b.texto });
      }
    }
    const c = grupo?.color || color;

    return (
      <group>
        <ambientLight intensity={0.9} color={CRISTAL} />
        <hemisphereLight intensity={0.9} color={CRISTAL} groundColor={PARED} />
        <pointLight position={[0, 9, -2]} color={c} intensity={110} distance={50} />
        <pointLight position={[0, 6, 10]} color={ORO} intensity={55} distance={38} />
        <pointLight position={[-11, 7, 2]} color={CRISTAL} intensity={40} distance={30} />
        <pointLight position={[11, 7, 2]} color={CRISTAL} intensity={40} distance={30} />

        {/* Suelo y muros de la habitación */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[HAB_ANCHO, HAB_FONDO]} />
          <meshStandardMaterial color={SUELO} roughness={0.55} metalness={0.05} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[7.4, 7.6, 64]} />
          <meshBasicMaterial color={c} transparent opacity={0.4} toneMapped={false} />
        </mesh>
        {/* Los muros miran hacia DENTRO y solo se dibujan por esa cara: si la
            cámara acaba fuera de la habitación, la pared se esfuma y sigues
            viendo la escena (por eso la cámara ya no necesita acotarse). */}
        {([[0, -HAB_FONDO / 2, 0], [-HAB_ANCHO / 2, 0, Math.PI / 2], [HAB_ANCHO / 2, 0, -Math.PI / 2]] as const).map(([x, z, r], i) => (
          <mesh key={i} position={[x as number, 5, z as number]} rotation={[0, r as number, 0]}>
            <planeGeometry args={[i === 0 ? HAB_ANCHO : HAB_FONDO, 10]} />
            <meshStandardMaterial color={PARED} roughness={0.7} />
          </mesh>
        ))}
        {/* Franja de color del grupo en la pared del fondo: dice dónde estás */}
        <mesh position={[0, 7.4, -HAB_FONDO / 2 + 0.05]}>
          <planeGeometry args={[HAB_ANCHO, 0.35]} />
          <meshBasicMaterial color={c} toneMapped={false} />
        </mesh>
        <Billboard position={[0, 9.2, -HAB_FONDO / 2 + 1]}>
          <Text fontSize={1.15} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#000000">
            {grupo?.label || 'Habitación'}
          </Text>
        </Billboard>

        {cosas.length === 0 && gente.length === 0 && (
          <Billboard position={[0, 3.2, -4]}>
            <Text fontSize={0.5} maxWidth={16} textAlign="center" color="#8fa0b3" anchorX="center" anchorY="middle">
              Esta habitación está vacía. Todo lo que añadas a «{grupo?.label}» en el tablero aparecerá aquí flotando.
            </Text>
          </Billboard>
        )}

        {/* La gente de la habitación: los mismos avatares que en la aldea, con
            su memoria y su conversación. No son copias, son ellos. */}
        {gente.map((a, i) => {
          const p = posicionHabitante(i, gente.length);
          return (
            <group key={a.id} position={[p.x, 0, p.z]}>
              <Habitante a={a} color={c} onHablar={onHablar} />
            </group>
          );
        })}

        {cosas.map((cosa, i) => {
          const p = posicionItem(i, cosas.length);
          return (
            <group key={cosa.clave} position={[p.x, p.y, p.z]} rotation={[0, Math.atan2(-p.x, -p.z + 8), 0]}>
              <Flotante fase={i * 1.7}>
                {cosa.tipo === 'tarjeta' && cosa.item && <Tarjeta item={cosa.item} color={c} />}
                {cosa.tipo === 'foto' && cosa.url && <Foto url={cosa.url} />}
                {cosa.tipo === 'doc' && <Documento nombre={cosa.nombre || 'Nota'} color={c} />}
              </Flotante>
            </group>
          );
        })}

        <Portal x={HAB_SALIDA.x} z={HAB_SALIDA.z} texto="Volver a la sala" color={ORO} />
      </group>
    );
  }

  // --- La sala diáfana
  return (
    <group>
      <ambientLight intensity={0.85} color={CRISTAL} />
      <hemisphereLight intensity={0.9} color={CRISTAL} groundColor={PARED} />
      <pointLight position={[0, 10, 0]} color={CRISTAL} intensity={160} distance={70} />
      <pointLight position={[0, 5.5, 0]} color={color} intensity={70} distance={40} />
      {/* Cuatro focos altos: sin ellos el suelo se come toda la luz y la sala
          se ve como una cueva en vez de como un sitio diáfano. */}
      {[[16, 16], [-16, 16], [16, -16], [-16, -16]].map(([x, z]) => (
        <pointLight key={`${x},${z}`} position={[x, 9, z]} color={CRISTAL} intensity={45} distance={34} />
      ))}

      <Envoltura color={color} />
      <Nucleo pct={pct} color={color} />

      <Billboard position={[0, 10.2, 0]}>
        <Text fontSize={1.25} maxWidth={26} textAlign="center" color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#000000">
          {proyecto.titulo}
        </Text>
        <Text position={[0, -1.25, 0]} fontSize={0.46} color={CRISTAL} anchorX="center" anchorY="middle">
          {proyecto.hechas} de {proyecto.tarjetas} tareas · {grupos.length} habitaciones
        </Text>
      </Billboard>

      {grupos.map((g, i) => {
        const p = posicionPuerta(i, grupos.length);
        // La puerta de «Personas» cuenta a la GENTE del proyecto (miembros),
        // no tarjetas: las personas ya no viven en el kanban.
        const gente = habitantesDeSala(items, g.id, agentes, proyecto.id);
        const cosas = items.filter(it => it.grupo === g.id && !agenteDeItem(it, agentes)).length;
        return (
          <Puerta
            key={g.id}
            x={p.x} z={p.z} ang={p.ang}
            grupo={g}
            n={cosas + gente.length}
            unidad={g.id === 'personas' ? 'persona' : 'tarjeta'}
          />
        );
      })}

      <Portal x={SALIDA.x} z={SALIDA.z} texto="Salir a la aldea" />
    </group>
  );
}


// ---------------------------------------------------------------------------
// LA PLAZA DEL PROYECTO (2026-08-18, petición de Eugenio): al cruzar el
// portal verde ya no hay una sala oscura, sino un prado abierto con una
// plaza en el centro. Alrededor de la plaza: la gente del proyecto (de pie)
// y su conocimiento del tablero (tarjetas, fotos, textos) flotando. El resto
// del prado está VACÍO a propósito: es donde el jugador planta la
// información del proyecto con el editor de siempre (clic en el suelo).
// ---------------------------------------------------------------------------

export function PlazaProyecto({ datos, onHablar }: {
  datos: DatosInterior;
  onHablar: (a: Agente) => void;
}) {
  const { proyecto, items, color, agentes } = datos;
  const pct = proyecto.tarjetas > 0 ? proyecto.hechas / proyecto.tarjetas : 0;

  // La gente que FORMA PARTE del proyecto, de pie en la plaza.
  const gente = habitantesDeSala(items, 'personas', agentes, proyecto.id);

  // TODO el conocimiento del tablero, junto (ya no hay habitaciones).
  const cosas: Array<{ clave: string; tipo: 'tarjeta' | 'foto' | 'doc'; item?: ItemProyecto; url?: string; nombre?: string }> = [];
  for (const it of items) {
    if (agenteDeItem(it, agentes)) continue;   // esa tarjeta es una persona
    cosas.push({ clave: `t:${it.id}`, tipo: 'tarjeta', item: it });
    for (const [i, b] of (Array.isArray(it.bloques) ? it.bloques : []).entries()) {
      if (b?.tipo === 'imagen' && b.url) cosas.push({ clave: `f:${it.id}:${i}`, tipo: 'foto', url: b.url, nombre: b.pie });
      else if (b?.tipo === 'texto' && b.texto) cosas.push({ clave: `d:${it.id}:${i}`, tipo: 'doc', nombre: b.texto });
    }
  }

  return (
    <group>
      {/* El prado. La luz y el cielo los pone la escena (ambiente de día). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[PLAZA_LIM + 16, 64]} />
        <meshStandardMaterial color={PALETA.prado} roughness={0.9} />
      </mesh>
      {/* La plaza vacía del centro, empedrada y con el aro del proyecto */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[10, 48]} />
        <meshStandardMaterial color={PALETA.plaza} roughness={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[9.5, 10, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      {/* El camino de la entrada a la plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, (PLAZA_SALIDA.z + 10) / 2]} receiveShadow>
        <planeGeometry args={[3.4, PLAZA_SALIDA.z - 6]} />
        <meshStandardMaterial color={PALETA.camino} roughness={0.9} />
      </mesh>

      {/* El título del proyecto y su progreso real, flotando sobre la plaza */}
      <Billboard position={[0, 7.4, 0]}>
        <Text fontSize={1.15} maxWidth={16} color="#ffffff" anchorX="center" anchorY="middle" textAlign="center"
          outlineWidth={0.05} outlineColor="#1d3a24">
          {proyecto.titulo}
        </Text>
        <Text position={[0, -1.15, 0]} fontSize={0.42} color="#e8f5e0" anchorX="center" anchorY="middle"
          outlineWidth={0.02} outlineColor="#1d3a24">
          {proyecto.tarjetas > 0
            ? `${proyecto.hechas} de ${proyecto.tarjetas} tareas · ${Math.round(pct * 100)}%`
            : 'Pulsa el suelo para plantar la información de este proyecto'}
        </Text>
      </Billboard>

      {/* La gente del proyecto, de pie alrededor de la plaza */}
      {gente.map((a, i) => {
        const ang = (i / Math.max(gente.length, 1)) * Math.PI * 2 - Math.PI / 2;
        return (
          <group key={a.id} position={[Math.cos(ang) * 6.5, 0, Math.sin(ang) * 6.5]}>
            <Habitante a={a} color={color} onHablar={onHablar} />
          </group>
        );
      })}

      {/* El conocimiento del tablero, en corro alrededor de la plaza */}
      {cosas.map((cosa, i) => {
        const ang = (i / Math.max(cosas.length, 1)) * Math.PI * 2 + 0.35;
        const r = 13.5 + (i % 2) * 2.6;
        const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
        return (
          <group key={cosa.clave} position={[x, 2.1, z]} rotation={[0, Math.atan2(-x, -z), 0]}>
            <Flotante fase={i * 1.7}>
              {cosa.tipo === 'tarjeta' && cosa.item && <Tarjeta item={cosa.item} color={color} />}
              {cosa.tipo === 'foto' && cosa.url && <Foto url={cosa.url} />}
              {cosa.tipo === 'doc' && <Documento nombre={cosa.nombre || 'Nota'} color={color} />}
            </Flotante>
          </group>
        );
      })}

      {/* El portal verde de vuelta a la aldea */}
      <group position={[PLAZA_SALIDA.x, 0, PLAZA_SALIDA.z]}>
        <PortalVerde radio={2.1} />
        <LuzDePortal radio={2.1} />
        <Billboard position={[0, 5.1, 0]}>
          <Text fontSize={0.48} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#1d3a24">
            Salir a la aldea
          </Text>
        </Billboard>
        <pointLight position={[0, 2.4, 0]} color={VERDE_PORTAL} intensity={8} distance={12} />
      </group>
    </group>
  );
}

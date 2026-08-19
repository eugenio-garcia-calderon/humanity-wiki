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
import { mapasPBR } from './texturas';
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

/**
 * Tarjeta del tablero como MINI TABLERO (2026-08-19, petición de Eugenio:
 * «quiero que las notas sean como boards con preview del contenido de dentro,
 * como mini ventana que cargan lo que hay dentro, ya sea imágenes o notas»).
 *
 * Antes cada bloque de una tarjeta se soltaba como un objeto SUELTO flotando
 * al lado: una habitación con cuatro tarjetas y sus fotos era una nube de
 * catorce cosas sin saber cuál iba con cuál. Ahora la tarjeta enseña dentro lo
 * que lleva —la primera foto de verdad, el primer texto— y pulsarla la abre
 * entera, como hasta ahora.
 */
function Tarjeta({ item, color, onAbrir }: {
  item: ItemProyecto;
  color: string;
  onAbrir?: (it: ItemProyecto) => void;
}) {
  const estado = COLOR_ESTADO[item.estado] || COLOR_ESTADO.por_hacer;
  const bloques = Array.isArray(item.bloques) ? item.bloques : [];
  const foto = bloques.find(b => b?.tipo === 'imagen' && b.url)?.url;
  const nota = bloques.find(b => b?.tipo === 'texto' && b.texto)?.texto;
  const extra = Math.max(0, bloques.filter(b => b?.tipo === 'imagen' || b?.tipo === 'texto').length - 1);
  // Con contenido la tarjeta crece hacia abajo: la vista previa necesita
  // sitio, y una tarjeta vacía no debe ocupar el de una llena.
  const alto = foto || nota ? 4.5 : 2.6;
  const [encima, setEncima] = useState(false);

  return (
    <group
      onPointerOver={onAbrir ? (e) => { e.stopPropagation(); setEncima(true); document.body.style.cursor = 'pointer'; } : undefined}
      onPointerOut={onAbrir ? () => { setEncima(false); document.body.style.cursor = ''; } : undefined}
      onClick={onAbrir ? (e) => { e.stopPropagation(); onAbrir(item); } : undefined}
    >
      {/* Halo al pasar por encima: dice que se puede pulsar sin un cartel. */}
      {encima && (
        <mesh position={[0, -(alto - 2.6) / 2, -0.02]}>
          <planeGeometry args={[4.5, alto + 0.3]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.5} />
        </mesh>
      )}
      <mesh position={[0, -(alto - 2.6) / 2, 0]}>
        <planeGeometry args={[4.2, alto]} />
        <meshBasicMaterial color={PARED} transparent opacity={0.82} />
      </mesh>
      {/* Filo de color: el estado de la tarjeta, legible desde lejos */}
      <mesh position={[-2.05, -(alto - 2.6) / 2, 0.01]}>
        <planeGeometry args={[0.16, alto]} />
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
      {/* --- LA VISTA PREVIA: lo que lleva dentro, dentro. */}
      {foto && (
        <group position={[0, -1.35, 0.03]}>
          <Foto url={foto} ancho={3.5} />
        </group>
      )}
      {!foto && nota && (
        <group position={[0, -1.35, 0.02]}>
          <mesh>
            <planeGeometry args={[3.7, 1.9]} />
            <meshBasicMaterial color={CRISTAL} transparent opacity={0.14} />
          </mesh>
          <Text
            position={[-1.75, 0.8, 0.02]}
            fontSize={0.19}
            maxWidth={3.4}
            lineHeight={1.35}
            color="#dbe4ee"
            anchorX="left"
            anchorY="top"
            clipRect={[0, -1.7, 3.5, 0.1]}
          >
            {nota.slice(0, 260)}
          </Text>
        </group>
      )}
      {extra > 0 && (
        <Text position={[1.85, -(alto - 2.6) - 1.12, 0.03]} fontSize={0.16} color="#8fa0b3" anchorX="right" anchorY="middle">
          +{extra} más
        </Text>
      )}
      <Text position={[-1.75, -(alto - 2.6) - 1.12, 0.03]} fontSize={0.17} color={estado} anchorX="left" anchorY="middle">
        {item.estado === 'hecho' ? 'HECHO' : item.estado === 'en_curso' ? 'EN CURSO' : 'POR HACER'}
      </Text>
    </group>
  );
}

/**
 * El pedestal «+» de cada habitación (2026-08-19). Eugenio pidió LOS DOS
 * gestos para crear una tarea: este pilar, que se ve sin que nadie te lo
 * explique, y el doble clic en el suelo, que es el mismo gesto que fuera.
 */
function PedestalCrear({ color, onCrear }: { color: string; onCrear: () => void }) {
  const [encima, setEncima] = useState(false);
  const aro = useRef<THREE.Mesh>(null);
  useFrame((estado) => {
    if (aro.current) {
      const s = 1 + Math.sin(estado.clock.elapsedTime * 2.2) * 0.06;
      aro.current.scale.set(s, s, 1);
    }
  });
  return (
    <group
      onPointerOver={(e) => { e.stopPropagation(); setEncima(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setEncima(false); document.body.style.cursor = ''; }}
      onClick={(e) => { e.stopPropagation(); onCrear(); }}
    >
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.45, 0.6, 1, 16]} />
        <meshStandardMaterial color={PARED} roughness={0.6} />
      </mesh>
      <mesh ref={aro} position={[0, 1.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.46, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      <Billboard position={[0, 1.9, 0]}>
        <mesh>
          <circleGeometry args={[0.62, 28]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={encima ? 1 : 0.85} />
        </mesh>
        <Text position={[0, 0.02, 0.01]} fontSize={0.82} color="#0b1220" anchorX="center" anchorY="middle">+</Text>
        <Text position={[0, -0.95, 0.01]} fontSize={0.26} color="#e6edf5" anchorX="center" anchorY="middle"
              outlineWidth={0.02} outlineColor="#0b1220">
          Nueva tarea
        </Text>
      </Billboard>
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

export function InteriorProyecto({ datos, onHablar, onAbrirTarea, onCrearTarea }: {
  datos: DatosInterior;
  /** Pulsar a alguien dentro de una habitación abre SU conversación. */
  onHablar: (a: Agente) => void;
  /** Pulsar una tarjeta la abre entera, para marcarla, moverla o editarla. */
  onAbrirTarea?: (it: ItemProyecto) => void;
  /** Crear una tarea en ESTA habitación: el pedestal «+» y el doble clic. */
  onCrearTarea?: (grupoId: string) => void;
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
    // UNA cosa por tarjeta (2026-08-19). Las fotos y las notas de dentro ya
    // no se sueltan sueltas por la sala: se ven DENTRO de su tarjeta, que es
    // lo que las ata a algo. Antes, cuatro tarjetas con fotos eran catorce
    // objetos flotando sin saber cuál iba con cuál.
    const cosas: Array<{ clave: string; tipo: 'tarjeta' | 'foto' | 'doc'; item?: ItemProyecto; url?: string; nombre?: string }> = [];
    for (const it of suyos) {
      if (agenteDeItem(it, agentes)) continue;   // esa tarjeta es una persona
      cosas.push({ clave: `t:${it.id}`, tipo: 'tarjeta', item: it });
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
                {cosa.tipo === 'tarjeta' && cosa.item && <Tarjeta item={cosa.item} color={c} onAbrir={onAbrirTarea} />}
                {cosa.tipo === 'foto' && cosa.url && <Foto url={cosa.url} />}
                {cosa.tipo === 'doc' && <Documento nombre={cosa.nombre || 'Nota'} color={c} />}
              </Flotante>
            </group>
          );
        })}

        {/* CREAR una tarea, con los dos gestos que pidió Eugenio: el pedestal
            «+» (se ve solo) y el doble clic en el suelo (el mismo gesto que
            en la aldea). Los dos hacen exactamente lo mismo. */}
        {onCrearTarea && sala && (
          <>
            <group position={[6.2, 0, 5.4]}>
              <PedestalCrear color={c} onCrear={() => onCrearTarea(sala)} />
            </group>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.03, 0]}
              onDoubleClick={(e) => { e.stopPropagation(); onCrearTarea(sala); }}
            >
              <planeGeometry args={[HAB_ANCHO, HAB_FONDO]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </>
        )}

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

/**
 * El corro de conocimiento de la plaza, CON posiciones: lo comparten el
 * dibujo y los obstáculos de Escena (chocar con una tarjeta la abre) — si
 * cada uno calculara el anillo por su cuenta, chocarías con una tarjeta que
 * se dibuja en otro sitio.
 */
export function cosasDePlaza(items: ItemProyecto[], agentes: Agente[]): Array<{
  clave: string; tipo: 'tarjeta' | 'foto' | 'doc';
  item?: ItemProyecto; url?: string; nombre?: string; x: number; z: number;
}> {
  // UNA cosa por tarjeta (2026-08-19, petición de Eugenio: «que las notas sean
  // como boards con preview del contenido de dentro»). Las fotos y las notas
  // de una tarjeta ya NO se sueltan sueltas por el corro: se ven dentro de su
  // tarjeta. Antes, un proyecto con diez tarjetas con foto poblaba la plaza
  // con veinte objetos y no se sabía cuál iba con cuál — y además cada uno
  // era un obstáculo con el que chocabas por separado.
  const lista: Array<{ clave: string; tipo: 'tarjeta' | 'foto' | 'doc'; item?: ItemProyecto; url?: string; nombre?: string }> = [];
  for (const it of items) {
    if (agenteDeItem(it, agentes)) continue;   // esa tarjeta es una persona
    lista.push({ clave: `t:${it.id}`, tipo: 'tarjeta', item: it });
  }
  return lista.map((c, i) => {
    const ang = (i / Math.max(lista.length, 1)) * Math.PI * 2 + 0.35;
    const r = 13.5 + (i % 2) * 2.6;
    return { ...c, x: Math.cos(ang) * r, z: Math.sin(ang) * r };
  });
}

export function PlazaProyecto({ datos, onHablar, onSalir, onAbrirTarjeta, onCrearTarea }: {
  datos: DatosInterior;
  onHablar: (a: Agente) => void;
  /** Pulsar el portal de salida también te saca a la aldea (no solo chocar). */
  onSalir?: () => void;
  /** Pulsar (o chocar con) una tarjeta del corro: abre su ficha central. */
  onAbrirTarjeta?: (item: ItemProyecto) => void;
  /** Crear una tarea nueva aquí: el pedestal «+» y el doble clic en el suelo
   *  (2026-08-19, Eugenio pidió los DOS gestos). */
  onCrearTarea?: () => void;
}) {
  const { proyecto, items, color, agentes } = datos;
  const pct = proyecto.tarjetas > 0 ? proyecto.hechas / proyecto.tarjetas : 0;

  // La gente que FORMA PARTE del proyecto, de pie en la plaza.
  const gente = habitantesDeSala(items, 'personas', agentes, proyecto.id);

  // TODO el conocimiento del tablero, junto, con el anillo YA calculado
  // (compartido con los obstáculos de Escena: chocar con una tarjeta la abre).
  const cosas = cosasDePlaza(items, agentes);

  return (
    <group>
      {/* El prado, con la misma hierba FOTOGRÁFICA de la aldea (fase 1). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[PLAZA_LIM + 16, 64]} />
        <meshStandardMaterial {...mapasPBR('hierba', ((PLAZA_LIM + 16) * 2) / 5.5)} />
      </mesh>
      {/* La plaza vacía del centro, ADOQUINADA de verdad, con el aro. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[10, 48]} />
        <meshStandardMaterial {...mapasPBR('adoquin', 20 / 2.4)} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[9.5, 10, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      {/* El camino de la entrada a la plaza, de grava real */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, (PLAZA_SALIDA.z + 10) / 2]} receiveShadow>
        <planeGeometry args={[3.4, PLAZA_SALIDA.z - 6]} />
        <meshStandardMaterial {...mapasPBR('grava', 1, Math.max(1, Math.round((PLAZA_SALIDA.z - 6) / 3)))} />
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

      {/* El conocimiento del tablero, en corro alrededor de la plaza.
          Las TARJETAS se expanden con el ratón encima y se abren al pulsarlas
          (o al chocar con ellas — eso lo avisa Escena). */}
      {cosas.map((cosa, i) => (
        <group key={cosa.clave} position={[cosa.x, 2.1, cosa.z]} rotation={[0, Math.atan2(-cosa.x, -cosa.z), 0]}>
          <Flotante fase={i * 1.7}>
            {cosa.tipo === 'tarjeta' && cosa.item && (
              <Interactivo onPulsar={() => onAbrirTarjeta?.(cosa.item!)}>
                {(resaltado) => (
                  <group scale={resaltado ? 1.45 : 1}>
                    <Tarjeta item={cosa.item!} color={color} />
                    {/* Blanco generoso: la lámina fina era difícil de acertar.
                        Cubre TODO el alto, que ahora depende de si la tarjeta
                        lleva vista previa dentro. */}
                    <mesh position={[0, -1, 0.1]}>
                      <planeGeometry args={[4.4, 4.8]} />
                      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    </mesh>
                    {resaltado && (
                      <Text position={[0, -3.6, 0.12]} fontSize={0.26} color="#ffffff" anchorX="center" anchorY="middle"
                        outlineWidth={0.02} outlineColor="#1d3a24">
                        Pulsa para abrir la ficha
                      </Text>
                    )}
                  </group>
                )}
              </Interactivo>
            )}
          </Flotante>
        </group>
      ))}

      {/* CREAR una tarea sin salir del juego (2026-08-19). Los dos gestos que
          pidió Eugenio: el pedestal «+», que se ve solo, y el doble clic en
          el suelo, el mismo gesto que en la aldea. */}
      {onCrearTarea && (
        <>
          <group position={[0, 0, 7.5]}>
            <PedestalCrear color={color} onCrear={onCrearTarea} />
          </group>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.04, 0]}
            onDoubleClick={(e) => { e.stopPropagation(); onCrearTarea(); }}
          >
            <circleGeometry args={[PLAZA_LIM + 14, 48]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </>
      )}

      {/* El portal verde de vuelta a la aldea: chocar O PULSARLO te saca
          (petición de Eugenio: el clic en «Salir a la aldea» no hacía nada). */}
      <group position={[PLAZA_SALIDA.x, 0, PLAZA_SALIDA.z]}>
        <Interactivo onPulsar={() => onSalir?.()}>
          {(resaltado) => (
            <group>
              <PortalVerde radio={2.1} resaltado={resaltado} />
              {/* Blanco generoso e invisible para el clic y el dedo */}
              <mesh position={[0, 2.1, 0]}>
                <cylinderGeometry args={[2.3, 2.3, 4.6, 10]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
              <Billboard position={[0, 5.1, 0]}>
                <Text fontSize={resaltado ? 0.58 : 0.48} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#1d3a24">
                  Salir a la aldea
                </Text>
              </Billboard>
            </group>
          )}
        </Interactivo>
        <LuzDePortal radio={2.1} />
        <pointLight position={[0, 2.4, 0]} color={VERDE_PORTAL} intensity={8} distance={12} />
      </group>
    </group>
  );
}

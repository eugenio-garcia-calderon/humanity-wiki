// ============================================================================
// LAS PIEZAS DEL VISOR 3D (2026-08-22)
// ============================================================================
// Eugenio: «vamos a cambiar el concepto, ahora no será un mundo hiperrealista
// sino que será un mundo muy simplificado, con un centro y alrededor, y arriba
// elemento; sigue habiendo un suelo pero es de color blanco, no hay sombras ni
// efectos de luz, es todo como la sala del arquitecto de Matrix, con pantallas
// alrededor».
//
// LA REGLA DE ESTE FICHERO: NADA DE LUZ. Ni sombras, ni luces direccionales, ni
// reflejos, ni niebla de color. Todos los materiales son `meshBasicMaterial`,
// que es el único que ignora por completo la iluminación: pinta el color que
// le pones y punto. Con cualquier otro material, un blanco sale gris en cuanto
// una cara mira hacia otro lado, y la sala deja de ser blanca.
//
// Lo que sustituye a la luz para que se entienda el volumen: el CONTORNO. Una
// línea fina más oscura en el borde de cada cosa. Es como está dibujado un
// plano de arquitecto, y por eso funciona sin una sola sombra.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { enAnillo } from './anillo';

/** Los colores del visor. Pocos y planos, a propósito. */
export const TINTA = {
  suelo: '#ffffff',
  linea: '#e2e8f0',
  lineaFuerte: '#cbd5e1',
  contorno: '#94a3b8',
  texto: '#0f172a',
  /** El espíritu de quien juega: azul y verde (Eugenio). */
  espirituA: '#38bdf8',
  espirituB: '#34d399',
  portal: '#0f172a',
} as const;

/** Los colores con los que salen los demás: cada persona, el suyo, siempre el
 *  mismo. Sale de su id, no de un contador — así no cambia de color según
 *  quién se conecte antes. */
const COLORES_PERSONA = ['#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16', '#0ea5e9'];
export function colorDePersona(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORES_PERSONA[h % COLORES_PERSONA.length];
}

// ============================================================================
// EL SUELO
// ============================================================================
/**
 * Blanco, plano y con una retícula muy tenue.
 *
 * LA RETÍCULA NO ES DECORACIÓN: en una superficie blanca sin nada, moverse no
 * se nota —no hay contra qué medir el avance— y da la sensación de estar
 * quieto. Las líneas son la referencia. Muy claras, para que sigan diciendo
 * «blanco» y no «papel milimetrado».
 */
export function SueloBlanco({ lado = 400 }: { lado?: number }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[lado, lado]} />
        <meshBasicMaterial color={TINTA.suelo} />
      </mesh>
      {/* `gridHelper` y no un plano con textura: es una sola geometría de
          líneas, no gasta textura ni memoria de vídeo, y no se ve borrosa de
          cerca como se vería una imagen repetida. */}
      <gridHelper args={[lado, lado / 4, TINTA.lineaFuerte, TINTA.linea]} position={[0, 0.01, 0]} />
    </group>
  );
}

/** El círculo del anillo, dibujado en el suelo. Dice dónde están las cosas
 *  antes de llegar a ellas, que es lo que convierte un blanco infinito en un
 *  sitio con forma. */
export function AnilloGuia({ radio }: { radio: number }) {
  const puntos = useMemo(() => {
    const p: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      p.push(new THREE.Vector3(Math.cos(a) * radio, 0.02, Math.sin(a) * radio));
    }
    return p;
  }, [radio]);
  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(puntos), [puntos]);
  return (
    <lineLoop geometry={geo}>
      <lineBasicMaterial color={TINTA.lineaFuerte} />
    </lineLoop>
  );
}

// ============================================================================
// LA PREVIA CENITAL DE UN PORTAL — «el big bang»
// ============================================================================
/**
 * Eugenio: «que se pueda ver un poco desde arriba lo que hay al otro lado de
 * los portales cuando estás en una sala, como si hubiese un big bang donde se
 * ve de forma artística una preview desde la vista cenital de lo que hay al
 * otro lado del portal: se ve algún objeto, o persona, o publicación, imagen».
 *
 * QUÉ ES DE VERDAD: el otro lado, mirado desde arriba y en pequeño. Cada cosa
 * que hay allí es un punto de su color, colocado en el MISMO anillo que
 * ocupará cuando entres. No es un adorno: si al otro lado hay cuatro
 * proyectos, aquí se ven cuatro puntos, y en el mismo orden.
 *
 * POR QUÉ NO UNA FOTO NI UNA MINIATURA DE VERDAD. Una segunda cámara
 * renderizando cada portal a una textura son tantos dibujados por fotograma
 * como portales haya; en un portátil eso es la diferencia entre 60 y 20. Y una
 * foto fija mentiría en cuanto alguien creara algo. Esto se calcula de los
 * mismos datos que la sala de al lado, así que no puede desincronizarse.
 *
 * SI NO HAY NADA AL OTRO LADO, NO SE INVENTA UN PUNTO: se ve el disco vacío,
 * que es la verdad —esa sala está por estrenar— y se distingue de una sala
 * llena.
 */
export function PreviaCenital({ contenido, radio = 1.5 }: {
  /** Un color por cosa que hay al otro lado. */
  contenido: string[];
  radio?: number;
}) {
  const giro = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (giro.current) giro.current.rotation.z += dt * 0.15; });
  return (
    <group>
      {/* El disco: el «suelo» del otro lado visto desde arriba. */}
      <mesh>
        <circleGeometry args={[radio, 48]} />
        <meshBasicMaterial color="#f8fafc" transparent opacity={0.95} />
      </mesh>
      <mesh position={[0, 0, -0.002]}>
        <ringGeometry args={[radio, radio + 0.05, 48]} />
        <meshBasicMaterial color={TINTA.contorno} />
      </mesh>
      <group ref={giro}>
        {contenido.slice(0, 12).map((color, i) => {
          const p = enAnillo(i, Math.min(contenido.length, 12), radio * 0.62);
          return (
            <mesh key={i} position={[p.x, p.z, 0.01]}>
              <circleGeometry args={[radio * 0.11, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>
          );
        })}
        {/* El destello del centro: lo que hace que parezca que algo nace ahí
            dentro. Es un punto, no una explosión de partículas — la sala es de
            líneas y un efecto de fuego aquí sería lo único con brillo. */}
        {contenido.length > 0 && (
          <mesh position={[0, 0, 0.012]}>
            <circleGeometry args={[radio * 0.08, 16]} />
            <meshBasicMaterial color={TINTA.texto} />
          </mesh>
        )}
      </group>
    </group>
  );
}

// ============================================================================
// EL PORTAL
// ============================================================================
/**
 * Una puerta a otra sala. Un arco fino, su nombre, y dentro la previa cenital
 * de lo que hay al otro lado.
 *
 * SE ENTRA PULSÁNDOLO O CHOCANDO CON ÉL, igual que antes: cambiar las dos
 * formas de entrar a la vez habría dejado sin saber a quien ya se había
 * acostumbrado a una.
 */
export function Portal({ x, z, rot = 0, nombre, contenido, color = TINTA.portal, onEntrar, onAgarrar }: {
  x: number; z: number; rot?: number;
  nombre: string;
  /** Los colores de lo que hay al otro lado, para la previa. */
  contenido: string[];
  color?: string;
  onEntrar?: () => void;
  onAgarrar?: (e: any) => void;
}) {
  const ALTO = 5.2, ANCHO = 3.6;
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {/* El marco: dos jambas y un dintel, en línea fina. Un arco «de verdad»
          con geometría curva se vería idéntico a esta distancia y costaría
          diez veces más triángulos. */}
      {[[-ANCHO / 2, ALTO / 2], [ANCHO / 2, ALTO / 2]].map(([mx, my], i) => (
        <mesh key={i} position={[mx, my, 0]}>
          <boxGeometry args={[0.09, ALTO, 0.09]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
      <mesh position={[0, ALTO, 0]}>
        <boxGeometry args={[ANCHO + 0.09, 0.09, 0.09]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* El hueco de la puerta: se puede pulsar entero, no solo el marco.
          Pulsar «el aire» de una puerta es lo que hace todo el mundo. */}
      <mesh
        position={[0, ALTO / 2, 0]}
        onClick={onEntrar ? (e) => { e.stopPropagation(); onEntrar(); } : undefined}
        onPointerDown={onAgarrar}
      >
        <planeGeometry args={[ANCHO, ALTO]} />
        <meshBasicMaterial color="#f1f5f9" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>

      {/* LA PREVIA, TUMBADA HACIA EL QUE MIRA. Va inclinada 25°: de frente
          sería un círculo de canto (no se vería), y plana del todo solo se
          vería desde el aire. Inclinada se lee desde el suelo, que es donde
          está el jugador. */}
      <group position={[0, ALTO * 0.55, 0.06]} rotation={[-0.44, 0, 0]}>
        <PreviaCenital contenido={contenido} />
      </group>

      <Billboard position={[0, ALTO + 0.9, 0]}>
        <Text fontSize={0.62} color={TINTA.texto} anchorX="center" anchorY="middle" maxWidth={9}>
          {nombre}
        </Text>
      </Billboard>
    </group>
  );
}

// ============================================================================
// LA PANTALLA DE UN ELEMENTO
// ============================================================================
/**
 * «Con pantallas alrededor» (Eugenio). Cada proyecto, publicación o
 * herramienta es una pantalla de pie mirando al centro: un rectángulo blanco
 * con contorno, su nombre y, si tiene portada, su imagen.
 */
export function Pantalla({ x, z, rot = 0, titulo, subtitulo, portada, color = TINTA.contorno, onPulsar, onAgarrar }: {
  x: number; z: number; rot?: number;
  titulo: string;
  subtitulo?: string;
  portada?: string | null;
  color?: string;
  onPulsar?: () => void;
  onAgarrar?: (e: any) => void;
}) {
  const ANCHO = 5.4, ALTO = 3.4, PIE = 1.6;
  const tex = useTexturaSuave(portada);
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {/* El pie: dos líneas. Sin él la pantalla parece flotando y en un mundo
          sin sombras nada dice a qué altura está. */}
      <mesh position={[0, PIE / 2, 0]}>
        <boxGeometry args={[0.07, PIE, 0.07]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <group
        position={[0, PIE + ALTO / 2, 0]}
        onClick={onPulsar ? (e) => { e.stopPropagation(); onPulsar(); } : undefined}
        onPointerDown={onAgarrar}
      >
        <mesh>
          <planeGeometry args={[ANCHO, ALTO]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
        {/* El contorno, que es lo que hace de «volumen» sin una sola luz. */}
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(ANCHO, ALTO)]} />
          <lineBasicMaterial color={color} />
        </lineSegments>
        {tex && (
          <mesh position={[0, 0.35, 0.01]}>
            <planeGeometry args={[ANCHO - 0.5, ALTO - 1.5]} />
            <meshBasicMaterial map={tex} toneMapped={false} />
          </mesh>
        )}
        <Text
          position={[0, tex ? -1.15 : 0.2, 0.02]}
          fontSize={0.42} color={TINTA.texto}
          anchorX="center" anchorY="middle" maxWidth={ANCHO - 0.6}
        >
          {titulo}
        </Text>
        {subtitulo && (
          <Text
            position={[0, tex ? -1.55 : -0.35, 0.02]}
            fontSize={0.27} color={TINTA.contorno}
            anchorX="center" anchorY="middle" maxWidth={ANCHO - 0.6}
          >
            {subtitulo}
          </Text>
        )}
      </group>
    </group>
  );
}

/**
 * Carga una imagen sin tumbar la escena si falla.
 *
 * A MANO Y NO CON `useLoader`: aquél suspende el árbol mientras carga y, si la
 * imagen no existe, se queda suspendido para siempre — la sala entera en
 * blanco por una portada rota. Ya nos pasó con las fotos de los portales. Aquí
 * un fallo es simplemente «no hay textura», y la pantalla enseña su título.
 */
function useTexturaSuave(url?: string | null) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    setTex(null);
    if (!url) return;
    let vivo = true;
    new THREE.TextureLoader().load(
      url,
      t => {
        if (!vivo) { t.dispose(); return; }
        t.colorSpace = THREE.SRGBColorSpace;
        setTex(t);
      },
      undefined,
      () => { /* sin portada: la pantalla se queda con su nombre */ },
    );
    return () => { vivo = false; };
  }, [url]);
  // Se suelta al desmontar: son megabytes en la tarjeta gráfica.
  useEffect(() => () => { tex?.dispose(); }, [tex]);
  return tex;
}

// ============================================================================
// LAS PERSONAS: UN HAZ DE LUZ
// ============================================================================
/**
 * Eugenio: «elimina los personajes y haz que sea como un espíritu azul y
 * verde, un haz de luz que se mueve flotando […] el resto de usuarios hazlos
 * también haz de luz de otros colores, y con su nombre encima».
 *
 * ES UN CILINDRO CON DEGRADADO, no un efecto de luz: la luz de verdad
 * necesitaría un volumen y un blur que en esta sala están prohibidos. Un
 * cilindro que se desvanece hacia arriba, con la base más viva, se lee como un
 * haz y cuesta doce triángulos.
 */
export function HazDeLuz({ x, z, color, nombre, alto = 3, onPulsar, palpita = true }: {
  x: number; z: number;
  color: string;
  nombre?: string;
  alto?: number;
  onPulsar?: () => void;
  palpita?: boolean;
}) {
  const cuerpo = useRef<THREE.Group>(null);
  useFrame((estado) => {
    if (!palpita || !cuerpo.current) return;
    // Una respiración lenta. Es lo único que se mueve en toda la sala aparte
    // de la gente, y es lo que dice que un haz está VIVO y no es un objeto.
    const t = estado.clock.elapsedTime;
    cuerpo.current.scale.setScalar(1 + Math.sin(t * 1.6 + x) * 0.04);
  });
  return (
    <group position={[x, 0, z]}>
      <group ref={cuerpo} onClick={onPulsar ? (e) => { e.stopPropagation(); onPulsar(); } : undefined}>
        {/* El haz. Tres cilindros concéntricos cada vez más transparentes:
            en el centro casi opaco, fuera casi nada. Es el degradado del
            pobre, y a esta distancia no se distingue de uno de verdad. */}
        {[[0.22, 0.85], [0.42, 0.35], [0.72, 0.14]].map(([r, o], i) => (
          <mesh key={i} position={[0, alto / 2, 0]}>
            <cylinderGeometry args={[r * 0.6, r, alto, 14, 1, true]} />
            <meshBasicMaterial color={color} transparent opacity={o} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
        {/* La huella en el suelo: sin ella, en un suelo blanco sin sombras no
            se sabe dónde está plantado el haz. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <circleGeometry args={[0.95, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      </group>
      {nombre && (
        <Billboard position={[0, alto + 0.55, 0]}>
          <Text fontSize={0.4} color={TINTA.texto} anchorX="center" anchorY="middle" maxWidth={8}>
            {nombre}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

// ============================================================================
// JUEGO VITAL — el CINE por dentro (2026-08-19, petición de Eugenio): al
// entrar en la gran pantalla apareces en una sala 3D donde el AGENTE DE
// YOUTUBE cuelga sus recomendaciones ordenadas por la TEMÁTICA de cada
// portal: cada categoría es un panel en arco con su nombre y los vídeos como
// tarjetas con miniatura. Pulsar una tarjeta abre el vídeo en la ventana
// interna; el portal verde de la salida te devuelve a la aldea.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { Interactivo, Rotulo } from './Senales';
import { PortalVerde, LuzDePortal, VERDE_PORTAL } from './PortalVerde';

/** Radio jugable de la sala y dónde está la salida (los lee Escena). */
export const CINE_LIM = 30;
export const CINE_SALIDA = { x: 0, z: 24 };
export const CINE_ENTRADA = { x: 0, z: 16 };

const ROJO = '#ff0033';
const SUELO = '#141b2d';
const PALETA_TEMA = ['#f6c667', '#7dd3fc', '#86efac', '#f9a8d4', '#c4b5fd', '#fdba74', '#a5f3fc'];

export interface VideoCine {
  videoId: string;
  titulo: string;
  canal?: string;
  url?: string;
}
export interface CategoriaCine { tema: string; videos: VideoCine[] }

/** Una tarjeta de vídeo: miniatura real (i.ytimg, con CORS), título y canal.
 *  La textura se carga a mano: una miniatura rota no tumba la sala. */
function TarjetaVideo({ v, onVer }: { v: VideoCine; onVer: (v: VideoCine) => void }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let vivo = true;
    const cargador = new THREE.TextureLoader();
    cargador.setCrossOrigin('anonymous');
    cargador.load(`https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`, (t) => {
      if (!vivo) return;
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    }, undefined, () => { /* sin miniatura queda la placa oscura */ });
    return () => { vivo = false; };
  }, [v.videoId]);

  return (
    <Interactivo onPulsar={() => onVer(v)}>
      {(resaltado) => (
        <group scale={resaltado ? 1.08 : 1}>
          <mesh>
            <planeGeometry args={[3.2, 1.8]} />
            {/* key distinta: three no recompila un material que nació sin
                mapa (mismo truco que Imagen3D). */}
            {tex
              ? <meshBasicMaterial key="con-mini" map={tex} toneMapped={false} />
              : <meshBasicMaterial key="sin-mini" color="#0b1220" toneMapped={false} />}
          </mesh>
          {/* Marco fino y play al pasar por encima */}
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[3.36, 1.96]} />
            <meshBasicMaterial color={resaltado ? ROJO : '#0f172a'} toneMapped={false} />
          </mesh>
          {resaltado && (
            <mesh position={[0, 0, 0.01]}>
              <circleGeometry args={[0.36, 3]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.9} toneMapped={false} />
            </mesh>
          )}
          <Text position={[0, -1.18, 0]} fontSize={0.21} maxWidth={3.2} color="#e2e8f0"
            anchorX="center" anchorY="top" textAlign="center">
            {(v.titulo || 'Vídeo').slice(0, 64)}
          </Text>
          {v.canal && (
            <Text position={[0, -1.78, 0]} fontSize={0.16} maxWidth={3.2} color="#94a3b8"
              anchorX="center" anchorY="top">
              {v.canal.slice(0, 40)}
            </Text>
          )}
        </group>
      )}
    </Interactivo>
  );
}

/** El AGENTE DE YOUTUBE: un robot rojo con pantalla de play en la cara.
 *  Pulsar = volver a pedirle recomendaciones. */
function AgenteYoutube({ onActualizar }: { onActualizar: () => void }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) {
      g.current.position.y = Math.sin(clock.elapsedTime * 1.4) * 0.12 + 0.12;
      g.current.rotation.y = Math.sin(clock.elapsedTime * 0.5) * 0.3;
    }
  });
  return (
    <Interactivo onPulsar={onActualizar}>
      {(resaltado) => (
        <group>
          <group ref={g}>
            {/* cuerpo */}
            <mesh castShadow position={[0, 1.05, 0]}>
              <boxGeometry args={[1.0, 1.1, 0.7]} />
              <meshStandardMaterial color={ROJO} roughness={0.4} />
            </mesh>
            {/* cabeza-pantalla con el play */}
            <mesh castShadow position={[0, 2.05, 0]}>
              <boxGeometry args={[0.95, 0.75, 0.6]} />
              <meshStandardMaterial color="#1c1c1e" roughness={0.4} />
            </mesh>
            <mesh position={[0, 2.05, 0.31]}>
              <planeGeometry args={[0.75, 0.5]} />
              <meshBasicMaterial color="#0b1220" toneMapped={false} />
            </mesh>
            <mesh position={[0, 2.05, 0.32]}>
              <circleGeometry args={[0.16, 3]} />
              <meshBasicMaterial color={ROJO} toneMapped={false} />
            </mesh>
            {/* antena y brazos */}
            <mesh position={[0, 2.62, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.5, 6]} />
              <meshStandardMaterial color="#9aa0a4" />
            </mesh>
            <mesh position={[0, 2.92, 0]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshBasicMaterial color={ROJO} toneMapped={false} />
            </mesh>
            {[0.62, -0.62].map(x => (
              <mesh key={x} castShadow position={[x, 1.05, 0]}>
                <boxGeometry args={[0.2, 0.8, 0.3]} />
                <meshStandardMaterial color="#b3202f" roughness={0.5} />
              </mesh>
            ))}
          </group>
          <Rotulo y={3.6} texto="Agente de YouTube" pie="Pulsa para pedirle recomendaciones nuevas"
            color={ROJO} resaltado={resaltado} />
        </group>
      )}
    </Interactivo>
  );
}

/**
 * La sala entera. Las categorías se reparten en ARCO alrededor del centro:
 * el rótulo del tema arriba y sus vídeos en rejilla de 3 por fila debajo,
 * todos mirando al centro para leerse desde donde está el jugador.
 */
export function CineYouTube({ categorias, estado, onVer, onActualizar, onSalir }: {
  categorias: CategoriaCine[];
  /** 'ok' | 'sin_conexion' | 'cargando' */
  estado: string;
  onVer: (v: VideoCine) => void;
  onActualizar: () => void;
  /** Pulsar el portal de salida (chocar con él también sale, vía Escena). */
  onSalir: () => void;
}) {
  const n = Math.max(categorias.length, 1);
  return (
    <group>
      {/* Suelo de cine: oscuro, con un aro rojo alrededor del centro */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[CINE_LIM + 8, 48]} />
        <meshStandardMaterial color={SUELO} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[5.6, 5.9, 48]} />
        <meshBasicMaterial color={ROJO} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <Billboard position={[0, 7.6, 0]}>
        <Text fontSize={0.9} color="#ffffff" anchorX="center" anchorY="middle"
          outlineWidth={0.04} outlineColor="#0f172a">
          CINE · recomendado para tus portales
        </Text>
      </Billboard>

      {/* El agente, delante del centro */}
      <group position={[0, 0, 4]}>
        <AgenteYoutube onActualizar={onActualizar} />
      </group>

      {/* Mensajes de estado, a la altura de la vista */}
      {estado !== 'ok' && (
        <Billboard position={[0, 4.4, 0]}>
          <Text fontSize={0.5} maxWidth={16} color="#e2e8f0" anchorX="center" anchorY="middle" textAlign="center">
            {estado === 'cargando'
              ? 'El agente está buscando vídeos para tus portales…'
              : 'Conecta tu cuenta de YouTube en el panel para que el agente pueda recomendarte vídeos de tus suscripciones.'}
          </Text>
        </Billboard>
      )}

      {/* Las categorías, en arco: cada portal es una temática */}
      {categorias.map((c, i) => {
        const ang = (i / n) * Math.PI * 2 - Math.PI / 2;   // empezando al norte
        const cx = Math.cos(ang) * 17;
        const cz = Math.sin(ang) * 17;
        const mira = Math.atan2(-cx, -cz);                 // panel de cara al centro
        const color = PALETA_TEMA[i % PALETA_TEMA.length];
        return (
          <group key={`${c.tema}-${i}`} position={[cx, 0, cz]} rotation-y={mira}>
            {/* El rótulo de la temática */}
            <Text position={[0, 6.4, 0]} fontSize={0.85} maxWidth={10} color={color}
              anchorX="center" anchorY="middle" textAlign="center"
              outlineWidth={0.04} outlineColor="#0f172a">
              {c.tema}
            </Text>
            <mesh position={[0, 5.85, 0]}>
              <planeGeometry args={[Math.min(c.tema.length * 0.5 + 1, 10), 0.06]} />
              <meshBasicMaterial color={color} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
            {/* Vídeos en rejilla de 3 por fila */}
            {c.videos.map((v, j) => {
              const col = j % 3, fila = Math.floor(j / 3);
              return (
                <group key={v.videoId + j} position={[(col - 1) * 3.9, 4.0 - fila * 2.9, 0]}>
                  <TarjetaVideo v={v} onVer={onVer} />
                </group>
              );
            })}
            {/* Luz del color del tema al suelo */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 1.5]}>
              <circleGeometry args={[3.4, 24]} />
              <meshBasicMaterial color={color} transparent opacity={0.12} toneMapped={false} depthWrite={false} />
            </mesh>
          </group>
        );
      })}

      {/* La salida: el portal verde de siempre, chocar O pulsarlo */}
      <group position={[CINE_SALIDA.x, 0, CINE_SALIDA.z]}>
        <Interactivo onPulsar={onSalir}>
          {(resaltado) => (
            <group>
              <PortalVerde radio={2.1} resaltado={resaltado} />
              <mesh position={[0, 2.1, 0]}>
                <cylinderGeometry args={[2.3, 2.3, 4.6, 10]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
              <Billboard position={[0, 5.1, 0]}>
                <Text fontSize={resaltado ? 0.58 : 0.48} color="#ffffff" anchorX="center" anchorY="middle"
                  outlineWidth={0.02} outlineColor="#1d3a24">
                  Salir del cine
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

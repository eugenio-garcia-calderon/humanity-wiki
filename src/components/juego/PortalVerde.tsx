import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';

// ============================================================================
// EL PORTAL VERDE (2026-08-18, petición de Eugenio): los proyectos ya no son
// edificios sino portales al estilo Rick & Morty — borde verde brillante y
// espirales girando. Se usa en el distrito, en los proyectos construidos
// desde el juego y como salida de la plaza del proyecto.
// ============================================================================

export const VERDE_PORTAL = '#4be04b';
const VERDE_BORDE = '#8dff6e';
const VERDE_OSCURO = '#1e8f2f';
const CENTRO = '#eaffc9';

/**
 * La espiral se pinta UNA vez en un canvas y se comparte entre todos los
 * portales: girar un plano con textura cuesta nada; regenerar el dibujo, sí.
 */
let texturaEspiral: THREE.CanvasTexture | null = null;
function espiral(): THREE.CanvasTexture {
  if (texturaEspiral) return texturaEspiral;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.translate(128, 128);
  // Tres brazos que se enroscan hacia fuera, del verde claro al blanco.
  for (let brazo = 0; brazo < 3; brazo++) {
    ctx.rotate((Math.PI * 2) / 3);
    for (const [ancho, color] of [[13, 'rgba(120,230,90,0.9)'], [5, 'rgba(235,255,200,0.9)']] as const) {
      ctx.beginPath();
      for (let t = 0; t <= 1.001; t += 0.02) {
        const ang = t * Math.PI * 3.4;
        const r = 10 + t * 112;
        const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color as string;
      ctx.lineWidth = ancho as number;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }
  texturaEspiral = new THREE.CanvasTexture(c);
  texturaEspiral.colorSpace = THREE.SRGBColorSpace;
  return texturaEspiral;
}

/**
 * La foto de portada del portal (2026-08-18, petición de Eugenio): recortada
 * en CÍRCULO con borde blanco, flotando en el centro de la espiral. La
 * textura se carga a mano (una foto rota no puede tumbar el Suspense) y la
 * geometría circular ya recorta la imagen sola por sus UVs.
 */
function FotoDePortal({ url, radio }: { url: string; radio: number }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let vivo = true;
    const cargador = new THREE.TextureLoader();
    cargador.setCrossOrigin('anonymous');
    cargador.load(url, (t) => {
      if (!vivo) return;
      t.colorSpace = THREE.SRGBColorSpace;
      // Recorte centrado: la cara del círculo enseña el CENTRO de la foto
      // aunque no sea cuadrada, sin deformarla.
      const img = t.image as { width?: number; height?: number };
      if (img?.width && img?.height) {
        const prop = img.width / img.height;
        if (prop > 1) { t.repeat.set(1 / prop, 1); t.offset.set((1 - 1 / prop) / 2, 0); }
        else { t.repeat.set(1, prop); t.offset.set(0, (1 - prop) / 2); }
      }
      setTex(t);
    }, undefined, () => { /* sin foto queda la espiral, que ya es bonita */ });
    return () => { vivo = false; };
  }, [url]);
  if (!tex) return null;
  return (
    <group position={[0, 0, 0.05]}>
      {/* El borde blanco que pide Eugenio */}
      <mesh>
        <circleGeometry args={[radio * 0.56, 40]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[radio * 0.5, 40]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * El portal en sí, siempre de cara a la cámara. `radio` en metros;
 * `resaltado` (hover) lo aviva. `fotoUrl` es su PORTADA: una foto en
 * círculo con borde blanco en el centro de la espiral.
 */
export function PortalVerde({ radio = 2.6, resaltado = false, color = VERDE_PORTAL, fotoUrl }: {
  radio?: number; resaltado?: boolean; color?: string; fotoUrl?: string | null;
}) {
  const giroA = useRef<THREE.Mesh>(null);
  const giroB = useRef<THREE.Mesh>(null);
  const borde = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => espiral(), []);
  // Color por encima de 1: con el bloom de la fase 0 de realismo, el aro
  // RESPLANDECE de verdad (sin efectos activos se ve como siempre).
  const colorAro = useMemo(
    () => new THREE.Color(resaltado ? VERDE_BORDE : color).multiplyScalar(1.9),
    [resaltado, color],
  );

  useFrame(({ clock }, dt) => {
    if (giroA.current) giroA.current.rotation.z -= dt * 1.5;
    if (giroB.current) giroB.current.rotation.z += dt * 0.9;
    if (borde.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 2.2) * 0.02 + (resaltado ? 0.05 : 0);
      borde.current.scale.setScalar(s);
    }
  });

  return (
    <Billboard position={[0, radio + 0.15, 0]}>
      {/* El fondo del charco verde */}
      <mesh>
        <circleGeometry args={[radio * 0.98, 48]} />
        <meshBasicMaterial color={VERDE_OSCURO} toneMapped={false} transparent opacity={0.96} />
      </mesh>
      {/* El corazón claro del centro */}
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[radio * 0.42, 32]} />
        <meshBasicMaterial color={CENTRO} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      {/* Las DOS espirales girando en sentidos opuestos */}
      <mesh ref={giroA} position={[0, 0, 0.02]}>
        <circleGeometry args={[radio * 0.94, 48]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh ref={giroB} position={[0, 0, 0.03]}>
        <circleGeometry args={[radio * 0.7, 48]} />
        <meshBasicMaterial map={tex} transparent opacity={0.55} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* El borde verde brillante, latiendo */}
      <mesh ref={borde} position={[0, 0, 0.04]}>
        <ringGeometry args={[radio * 0.94, radio * 1.08, 48]} />
        <meshBasicMaterial color={colorAro} toneMapped={false} transparent opacity={0.95} />
      </mesh>
      {/* La portada del portal, si la tiene */}
      {fotoUrl && <FotoDePortal url={fotoUrl} radio={radio} />}
      <pointLight color={VERDE_PORTAL} intensity={resaltado ? 30 : 14} distance={radio * 6} />
    </Billboard>
  );
}

/** El charco de luz verde que el portal echa al suelo. Va FUERA del
 *  Billboard: el suelo no gira con la cámara. */
export function LuzDePortal({ radio = 2.6 }: { radio?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
      <circleGeometry args={[radio * 0.9, 32]} />
      <meshBasicMaterial color={VERDE_PORTAL} transparent opacity={0.22} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

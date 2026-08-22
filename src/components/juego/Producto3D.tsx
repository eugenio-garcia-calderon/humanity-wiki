// ============================================================================
// JUEGO VITAL — PRODUCTOS DEL MERCADO EN EL MUNDO (2026-08-19, petición de
// Eugenio: «crea la posibilidad de meter en el mapa 3D productos, en este caso
// tendrás que crear también el objeto 3D para que esté flotando»).
// ============================================================================
// Un producto plantado en la aldea es una VITRINA: una peana de luz, el objeto
// flotando y girando encima, y su precio delante. Al pulsarlo se abre la ficha
// real del Mercado.
//
// Dos formas de dibujarlo, y esa es toda la arquitectura:
//
//   - Si el producto tiene un MODELO propio (`modelo: 'estacion-energia'`), se
//     construye en 3D de verdad con geometría, como la DJI Power 1000 V2 de
//     aquí abajo. Es lo que hace que se vea como el aparato y no como un cartel.
//   - Si no lo tiene, se cae a la FOTO del catálogo sobre un panel flotante.
//     Así se puede plantar CUALQUIER producto desde el primer día, aunque
//     nadie le haya modelado nunca un objeto.
//
// Modelar cada producto a mano no escala; la foto sí. Por eso el modelo es la
// excepción bonita y la foto es el camino por defecto.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

/** Lo que el mundo necesita saber de un producto para dibujarlo. */
export interface ProductoJuego3D {
  id: string;
  name: string;
  price_cents: number | null;
  currency: string | null;
  images: string[];
  /** Nombre del objeto 3D, si alguien se lo ha modelado. */
  modelo?: string | null;
}

/** «649 €» — el precio como se dice, sin céntimos cuando son cero. */
export function precioLegible(cents: number | null, moneda = 'EUR'): string {
  if (cents == null) return 'Sin precio';
  const simbolo = moneda === 'EUR' ? '€' : moneda === 'USD' ? '$' : moneda;
  const v = cents / 100;
  return `${v % 1 === 0 ? v.toLocaleString('es-ES') : v.toLocaleString('es-ES', { minimumFractionDigits: 2 })} ${simbolo}`;
}

// ---------------------------------------------------------------------------
// LA ESTACIÓN DE ENERGÍA (la DJI Power 1000 V2)
// ---------------------------------------------------------------------------
const GRIS_CUERPO = '#3a3d42';
const GRIS_PANEL = '#26282c';
const GRIS_CLARO = '#8f959e';
const VERDE_LED = '#22e08a';

/**
 * La estación, a ojo desde sus medidas reales (448 × 225 × 230 mm) y aumentada
 * ×2,6 para que se lea de lejos: en el mundo mide 1,16 × 0,60 × 0,58.
 *
 * Todo son cajas y cilindros. Un modelo descargado pesaría megas y habría que
 * cargarlo; esto son 14 mallas que el navegador construye en un fotograma, y
 * el juego ya va justo de tiempo de carga.
 */
function EstacionDeEnergia() {
  const E = 2.6;
  const AN = 0.448 * E, AL = 0.225 * E, FO = 0.230 * E;

  // Las dos tomas de corriente europeas, los dos USB-C y los dos USB-A.
  const tomas = useMemo(() => [-0.26, 0.26].map(x => x * E), [E]);

  return (
    <group>
      {/* Cuerpo */}
      <mesh castShadow>
        <boxGeometry args={[AN, AL, FO]} />
        <meshStandardMaterial color={GRIS_CUERPO} roughness={0.55} metalness={0.25} />
      </mesh>

      {/* La banda superior más clara que lleva de verdad */}
      <mesh position={[0, AL / 2 - 0.02, 0]}>
        <boxGeometry args={[AN * 0.99, 0.035, FO * 0.99]} />
        <meshStandardMaterial color={GRIS_CLARO} roughness={0.4} metalness={0.35} />
      </mesh>

      {/* Asa: dos montantes y una barra */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * AN * 0.3, AL / 2 + 0.075, 0]} castShadow>
          <boxGeometry args={[0.05, 0.15, 0.075]} />
          <meshStandardMaterial color={GRIS_PANEL} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, AL / 2 + 0.14, 0]} castShadow>
        <boxGeometry args={[AN * 0.68, 0.05, 0.09]} />
        <meshStandardMaterial color={GRIS_PANEL} roughness={0.6} />
      </mesh>

      {/* Panel frontal hundido */}
      <mesh position={[0, 0, FO / 2 + 0.001]}>
        <boxGeometry args={[AN * 0.94, AL * 0.82, 0.02]} />
        <meshStandardMaterial color={GRIS_PANEL} roughness={0.7} />
      </mesh>

      {/* Pantalla, encendida: es lo que le da vida de lejos */}
      <mesh position={[-AN * 0.3, AL * 0.16, FO / 2 + 0.014]}>
        <planeGeometry args={[0.3, 0.13]} />
        <meshBasicMaterial color="#0e1512" toneMapped={false} />
      </mesh>
      <Text
        position={[-AN * 0.3, AL * 0.16, FO / 2 + 0.016]}
        fontSize={0.062} color={VERDE_LED} anchorX="center" anchorY="middle"
      >
        1024Wh
      </Text>

      {/* Dos tomas de corriente (redondas, tipo europeo) */}
      {tomas.map((x, i) => (
        <group key={i} position={[x, -AL * 0.16, FO / 2 + 0.014]}>
          <mesh>
            <circleGeometry args={[0.075, 20]} />
            <meshStandardMaterial color="#15171a" roughness={0.9} />
          </mesh>
          {[-0.03, 0.03].map(dx => (
            <mesh key={dx} position={[dx, 0, 0.002]}>
              <circleGeometry args={[0.013, 10]} />
              <meshBasicMaterial color="#05070a" toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}

      {/* USB-C (2) y USB-A (2): ranuras finas */}
      {[0, 1].map(i => (
        <mesh key={`c${i}`} position={[AN * 0.22 + i * 0.09, AL * 0.2, FO / 2 + 0.014]}>
          <planeGeometry args={[0.055, 0.02]} />
          <meshBasicMaterial color="#0b0d10" toneMapped={false} />
        </mesh>
      ))}
      {[0, 1].map(i => (
        <mesh key={`a${i}`} position={[AN * 0.22 + i * 0.09, AL * 0.06, FO / 2 + 0.014]}>
          <planeGeometry args={[0.06, 0.026]} />
          <meshBasicMaterial color="#0d2a5c" toneMapped={false} />
        </mesh>
      ))}

      {/* Rejilla de ventilación lateral */}
      {[-1, 1].map(s => (
        <group key={s} position={[s * (AN / 2 + 0.002), 0, 0]} rotation={[0, s * Math.PI / 2, 0]}>
          {[-0.12, -0.04, 0.04, 0.12].map(y => (
            <mesh key={y} position={[0, y, 0]}>
              <planeGeometry args={[FO * 0.7, 0.022]} />
              <meshBasicMaterial color="#191b1f" toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Tira de luz inferior: encendida, como cuando está dando corriente */}
      <mesh position={[0, -AL / 2 + 0.022, FO / 2 + 0.012]}>
        <planeGeometry args={[AN * 0.5, 0.016]} />
        <meshBasicMaterial color={VERDE_LED} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Los modelos 3D que hay escritos. Añadir uno es añadir una línea aquí. */
const MODELOS: Record<string, React.ComponentType> = {
  'estacion-energia': EstacionDeEnergia,
};

// ---------------------------------------------------------------------------
// La vitrina
// ---------------------------------------------------------------------------
/** La foto del catálogo sobre un panel, para los productos sin modelo. */
function FotoDeProducto({ url }: { url: string }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let vivo = true;
    new THREE.TextureLoader().load(url, t => {
      if (!vivo) return;
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    }, undefined, () => { /* sin foto queda el panel */ });
    return () => { vivo = false; };
  }, [url]);
  const img = tex?.image as { width?: number; height?: number } | undefined;
  const prop = img?.width && img?.height ? img.height / img.width : 1;
  const ancho = 1.5;
  return (
    <Billboard>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[ancho + 0.12, ancho * prop + 0.12]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh>
        <planeGeometry args={[ancho, ancho * prop]} />
        {tex
          ? <meshBasicMaterial key="con" map={tex} toneMapped={false} />
          : <meshBasicMaterial key="sin" color="#dfe4ea" />}
      </mesh>
    </Billboard>
  );
}

/**
 * Un producto en el mundo: peana de luz, el objeto flotando y girando despacio,
 * y el nombre con el precio delante.
 *
 * Gira SIEMPRE (no solo flota) porque un objeto de venta se enseña por todos
 * lados; una vuelta cada 14 segundos es lo bastante lenta para no marear a
 * quien pasa al lado.
 */
export default function Producto3D({ producto, fase = 0 }: {
  producto: ProductoJuego3D | null;
  fase?: number;
}) {
  const giro = useRef<THREE.Group>(null);
  const flota = useRef<THREE.Group>(null);

  useFrame((estado) => {
    const t = estado.clock.elapsedTime + fase;
    if (giro.current) giro.current.rotation.y = t * 0.45;
    if (flota.current) flota.current.position.y = 1.35 + Math.sin(t * 0.8) * 0.09;
  });

  // Un producto que ya no existe (o que aún no ha llegado) no puede quedar
  // como un hueco invisible: se ve la peana y un cartel diciéndolo.
  const nombre = producto?.name || 'Producto retirado';
  const precio = producto ? precioLegible(producto.price_cents, producto.currency || 'EUR') : '';
  const Modelo = producto?.modelo ? MODELOS[producto.modelo] : undefined;
  const foto = producto?.images?.[0];

  return (
    <group>
      {/* Peana: un disco y un aro de luz. Marca el sitio aunque el objeto
          flote alto, para que se sepa dónde está plantado y dónde se pulsa. */}
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[0.62, 0.7, 0.06, 24]} />
        <meshStandardMaterial color="#2b3038" roughness={0.65} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.62, 28]} />
        <meshBasicMaterial color={VERDE_LED} toneMapped={false} transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>

      {/* Haz de luz de la vitrina */}
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.62, 0.2, 1.4, 20, 1, true]} />
        <meshBasicMaterial color={VERDE_LED} toneMapped={false} transparent opacity={0.055} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <group ref={flota} position={[0, 1.35, 0]}>
        <group ref={giro}>
          {Modelo ? <Modelo /> : foto ? <FotoDeProducto url={foto} /> : (
            <mesh castShadow>
              <boxGeometry args={[0.8, 0.8, 0.8]} />
              <meshStandardMaterial color="#4b5563" roughness={0.7} />
            </mesh>
          )}
        </group>

        {/* Nombre y precio, siempre de cara */}
        <Billboard position={[0, 0.72, 0]}>
          <Text fontSize={0.2} color="#f8fafc" outlineWidth={0.014} outlineColor="#0f172a"
                anchorX="center" anchorY="middle" maxWidth={3.4} textAlign="center">
            {nombre.slice(0, 44)}
          </Text>
          {precio && (
            <group position={[0, -0.28, 0]}>
              <mesh>
                <planeGeometry args={[Math.max(0.75, precio.length * 0.115), 0.3]} />
                <meshBasicMaterial color={VERDE_LED} toneMapped={false} />
              </mesh>
              <Text position={[0, 0, 0.01]} fontSize={0.17} color="#052e1a" anchorX="center" anchorY="middle">
                {precio}
              </Text>
            </group>
          )}
        </Billboard>
      </group>
    </group>
  );
}

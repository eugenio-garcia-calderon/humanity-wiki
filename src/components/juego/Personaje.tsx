// ============================================================================
// JUEGO VITAL — third-person character. Reads the shared input ref (keyboard
// or touch joystick), moves with smoothed acceleration, faces its heading,
// and drags the follow camera and the shadow-casting light along with it.
//
// Desde 2026-08-18 la cámara GIRA (petición de Eugenio: «como en Call of Duty,
// mover el avatar o mover la vista»). Eso cambia una cosa de fondo: el mando ya
// no está en ejes del mundo, sino en ejes de la CÁMARA. Adelante es «lejos de
// la cámara», gires hacia donde gires.
// ============================================================================
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Camara, EntradaMando, Vehiculo } from './tipos';
import { Persona3D } from './Modelos';
import { Bici, Aptera, SombraVuelo } from './Vehiculos';
import type { Aspecto } from './aspecto';

/** Velocidad máxima en m/s. A pie es un paseo vivo; la bici, ciclismo urbano;
 *  la Aptera, la de un coche por ciudad (el mapa mide 1 km de lado). */
const VEL_MAX: Record<Vehiculo, number> = { pie: 8, bici: 17, aptera: 32 };
const LIMITE = 530;          // keep the player inside the 118 ha
const TECHO = 130;           // altura máxima de vuelo, en metros
const VEL_VERTICAL = 11;     // subir y bajar, en m/s

const tmpObjetivo = new THREE.Vector3();
const tmpCam = new THREE.Vector3();
const tmpMira = new THREE.Vector3();

/** Algo sólido del mundo: no se atraviesa, y chocar con ello «llama». */
export interface Obstaculo { id: string; x: number; z: number; radio: number }

export function Personaje({ entrada, camara, jugadorPos, luzRef, obstaculos, onChoque, destino, zoom, aspecto, vehiculo, alturaVuelo, limite }: {
  entrada: React.MutableRefObject<EntradaMando>;
  /** Hacia dónde mira la cámara. Lo escribe el arrastre de la pantalla. */
  camara: React.MutableRefObject<Camara>;
  jugadorPos: THREE.Vector3;
  luzRef: React.RefObject<THREE.DirectionalLight | null>;
  obstaculos: React.MutableRefObject<Obstaculo[]>;
  onChoque: (id: string) => void;
  /** Viaje rápido desde el mapa: se pone aquí y el personaje aparece allí. */
  destino: React.MutableRefObject<{ x: number; z: number } | null>;
  /** Cuánto se aleja la cámara: 1 = por encima del hombro, 6 = media aldea. */
  zoom: React.MutableRefObject<number>;
  /** Tu piel, pelo, ropa y fenotipo. */
  aspecto?: Aspecto;
  /** A pie, en bici o en el planeador. */
  vehiculo: Vehiculo;
  /** Altura sobre el suelo. Compartida con la página para enseñarla en pantalla. */
  alturaVuelo: React.MutableRefObject<number>;
  /** Hasta dónde puedes andar. Sin valor, las 118 ha; dentro de un proyecto,
   *  el tamaño de la sala (si no, te saldrías por las paredes). */
  limite?: number;
}) {
  const grupo = useRef<THREE.Group>(null);
  const vel = useRef(new THREE.Vector3());
  // Apareces mirando al norte, hacia la plaza (rumbo 0 sería de espaldas a ella).
  const rumbo = useRef(Math.PI);
  // Con quién estás chocando AHORA: el aviso salta una vez por encontronazo,
  // no cada fotograma mientras sigas pegado a él.
  const tocando = useRef<string | null>(null);
  // Andar o estar quieto: el modelo trae sus propias animaciones.
  const [andando, setAndando] = useState(false);
  const andandoRef = useRef(false);

  useFrame((estado, dtBruto) => {
    const g = grupo.current;
    if (!g) return;
    const dt = Math.min(dtBruto, 0.05); // tab-switch spikes must not teleport
    const vuela = vehiculo === 'aptera';

    // --- Viaje rápido: apareces junto al destino, mirándolo. La cámara NO
    // salta: sigue interpolando, así que hace un vuelo rasante por encima de
    // la aldea hasta alcanzarte. Ese barrido es la animación del viaje.
    const d = destino.current;
    if (d) {
      destino.current = null;
      // Se llega por el sur, a 5 m: distancia de conversación sin empotrarse.
      g.position.set(d.x, alturaVuelo.current, d.z + 5);
      vel.current.set(0, 0, 0);
      rumbo.current = Math.PI; // mirando al norte, hacia el destino
      g.rotation.y = rumbo.current;
      tocando.current = null; // el próximo contacto vuelve a contar como choque
      jugadorPos.copy(g.position);
      return;
    }

    // --- Altura: solo el planeador sube. Al bajarte, desciende solo hasta el
    // suelo, que es el «aterrizaje vertical».
    const subida = vuela ? entrada.current.y : -1;
    alturaVuelo.current = THREE.MathUtils.clamp(
      alturaVuelo.current + subida * VEL_VERTICAL * dt, 0, vuela ? TECHO : 0,
    );

    // --- Movimiento. El mando viene en ejes de PANTALLA; se gira con el rumbo
    // de la cámara para que «adelante» sea siempre adelante en la vista.
    const yaw = camara.current.yaw;
    const sx = entrada.current.x;
    const sz = entrada.current.z;
    tmpObjetivo.set(
      sx * Math.cos(yaw) + sz * Math.sin(yaw),
      0,
      -sx * Math.sin(yaw) + sz * Math.cos(yaw),
    );
    if (tmpObjetivo.lengthSq() > 1) tmpObjetivo.normalize();
    tmpObjetivo.multiplyScalar(VEL_MAX[vehiculo]);
    vel.current.lerp(tmpObjetivo, 1 - Math.exp(-(vuela ? 4 : 10) * dt));
    g.position.addScaledVector(vel.current, dt);
    const lim = limite ?? LIMITE;
    g.position.x = THREE.MathUtils.clamp(g.position.x, -lim, lim);
    g.position.z = THREE.MathUtils.clamp(g.position.z, -lim, lim);
    g.position.y = alturaVuelo.current;

    // --- Colisión: a la gente y a los edificios no se les atraviesa.
    // Al tocarlos te quedas fuera de su radio y se avisa a la página, que
    // abre su chat: chocarte con un amigo es empezar a hablar con él.
    // Volando por encima de los tejados no chocas con nada: pasas por arriba.
    let choque: string | null = null;
    if (alturaVuelo.current < 4) {
      for (const o of obstaculos.current) {
        const dx = g.position.x - o.x;
        const dz = g.position.z - o.z;
        const dd = Math.hypot(dx, dz);
        if (dd >= o.radio) continue;
        // Empujón hacia fuera justo al borde (si cayó en el centro exacto, se
        // sale hacia atrás para no dividir por cero).
        const nx = dd > 0.001 ? dx / dd : 0;
        const nz = dd > 0.001 ? dz / dd : 1;
        g.position.x = o.x + nx * o.radio;
        g.position.z = o.z + nz * o.radio;
        vel.current.multiplyScalar(0.2);
        choque = o.id;
      }
    }
    if (choque !== tocando.current) {
      tocando.current = choque;
      if (choque) onChoque(choque);
    }

    const moviendo = vel.current.lengthSq() > 0.4;
    // El cambio andar/parar se avisa a React solo cuando cambia de verdad.
    if (moviendo !== andandoRef.current) {
      andandoRef.current = moviendo;
      setAndando(moviendo);
    }
    if (moviendo) {
      const deseo = Math.atan2(vel.current.x, vel.current.z);
      const dif = Math.atan2(Math.sin(deseo - rumbo.current), Math.cos(deseo - rumbo.current));
      rumbo.current += dif * (1 - Math.exp(-(vuela ? 6 : 12) * dt));
      g.rotation.y = rumbo.current;
    }
    // El modelo tiene su propia animación de andar: ya no hace falta el
    // botecito que simulaba el paso.
    jugadorPos.copy(g.position);

    // --- Cámara orbital: gira alrededor de ti con el rumbo y la inclinación
    // que hayas elegido arrastrando. `dist` sale de la distancia de siempre
    // (11 de alto y 15 de fondo), para que el zoom siga midiendo lo mismo.
    const cam = estado.camera;
    // Dentro de un edificio la cámara se acerca: con los 18,6 m de fuera se
    // quedaría al otro lado de la pared y verías la sala a través del muro.
    const dist = (limite ? Math.min(10.5, limite * 0.55) : 18.6) * zoom.current;
    const { pitch } = camara.current;
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    tmpCam.set(
      g.position.x + Math.sin(yaw) * cp * dist,
      g.position.y + Math.max(1.5, sp * dist),
      g.position.z + Math.cos(yaw) * cp * dist,
    );
    // Y si aun así se saliera (estás pegado a la pared), se mete hacia dentro.
    if (limite) {
      const r = Math.hypot(tmpCam.x, tmpCam.z);
      if (r > limite) { tmpCam.x *= limite / r; tmpCam.z *= limite / r; }
    }
    cam.position.lerp(tmpCam, 1 - Math.exp(-6 * dt));
    tmpMira.set(g.position.x, g.position.y + 1.6 + (zoom.current - 1) * 1.5, g.position.z);
    cam.lookAt(tmpMira);

    // --- the shadow camera is small (sharp shadows): it must travel with us
    const luz = luzRef.current;
    if (luz) {
      luz.position.set(g.position.x + 60, 95 + alturaVuelo.current, g.position.z - 45);
      luz.target.position.set(g.position.x, 0, g.position.z);
      luz.target.updateMatrixWorld();
    }
  });

  return (
    // Spawn on the south path at the plaza edge: open view over the fountain,
    // no house blocking the camera.
    <group ref={grupo} position={[0, 0, 17]}>
      {/* El modelo de Kenney ya mira hacia +Z, que es nuestro rumbo 0: la media
          vuelta que había aquí hacía que anduviera de espaldas. */}
      {vehiculo !== 'aptera' && (
        // En bici va de pie sobre los pedales: sin este medio metro, el
        // personaje aparecería con las piernas dentro del cuadro.
        <group position={[0, vehiculo === 'bici' ? 0.45 : 0, 0]}>
          <Persona3D
            cuerpo={aspecto?.cuerpo || 'character-male-a'}
            animacion={andando ? 'walk' : 'idle'}
            aspecto={aspecto}
          />
        </group>
      )}
      {vehiculo === 'bici' && <Bici rodando={andando} />}
      {vehiculo === 'aptera' && (
        <>
          <Aptera alturaVuelo={alturaVuelo} avanzando={andando} />
          <SombraVuelo alturaVuelo={alturaVuelo} />
        </>
      )}
    </group>
  );
}

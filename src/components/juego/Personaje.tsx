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
/** Lo que multiplica Shift a pie y en bici (petición de Eugenio: «si pulso
 *  Shift el muñeco va más rápido»; antes era la barra, que ahora salta). */
const TURBO = 3;
/** Salto: velocidad inicial y gravedad. Da un brinco de ~1,3 m. */
const VEL_SALTO = 7.2;
const GRAVEDAD = 20;
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
  // El salto: velocidad vertical y altura sobre el suelo, solo a pie o en bici.
  const velSalto = useRef(0);
  const alturaSalto = useRef(0);
  // Apareces mirando al norte, hacia la plaza (rumbo 0 sería de espaldas a ella).
  const rumbo = useRef(Math.PI);
  // Con quién estás chocando AHORA: el aviso salta una vez por encontronazo,
  // no cada fotograma mientras sigas pegado a él.
  const tocando = useRef<string | null>(null);
  // Andar, correr o estar quieto: el modelo trae sus propias animaciones.
  const [andando, setAndando] = useState(false);
  const andandoRef = useRef(false);
  // La MARCHA a pie sale de la velocidad real: parado, paseo, trote,
  // esprint o en el aire (salto). Cada una es una pista distinta del modelo.
  const [paso, setPaso] = useState('idle');
  const pasoRef = useRef('idle');
  // Y la CADENCIA acompasa la zancada a los m/s reales (por ref, sin
  // re-render: la lee Persona3D cada fotograma).
  const ritmoAnim = useRef(1);

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
      // La vista se recoloca a la clásica (detrás del personaje). Sin esto,
      // al entrar en una habitación con la cámara girada de la aldea, te la
      // encontrabas pegada a una pared mirando a tu nuca (fallo de Eugenio).
      camara.current.yaw = 0;
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

    // --- Salto (petición de Eugenio: la barra salta). Solo a pie o en bici:
    // volando la altura ya la llevan W y S.
    if (!vuela) {
      if (entrada.current.salto && alturaSalto.current <= 0) velSalto.current = VEL_SALTO;
      entrada.current.salto = false;   // un toque = UN salto, no uno por frame
      if (alturaSalto.current > 0 || velSalto.current > 0) {
        alturaSalto.current = Math.max(0, alturaSalto.current + velSalto.current * dt);
        velSalto.current -= GRAVEDAD * dt;
        if (alturaSalto.current <= 0) velSalto.current = 0;
      }
    } else {
      entrada.current.salto = false;
      alturaSalto.current = 0;
      velSalto.current = 0;
    }

    // --- Movimiento. El mando viene en ejes de PANTALLA; se gira con el rumbo
    // de la cámara para que «adelante» sea siempre adelante en la vista.
    const yaw = camara.current.yaw;
    const sx = entrada.current.x;
    // La nave CRUZA sola: en el aire siempre avanza (se pilota con A/D y la
    // vista, y W/S llevan la altura — petición de Eugenio). En el suelo, no.
    const sz = vuela ? (alturaVuelo.current > 0.5 ? -1 : 0) : entrada.current.z;
    tmpObjetivo.set(
      sx * Math.cos(yaw) + sz * Math.sin(yaw),
      0,
      -sx * Math.sin(yaw) + sz * Math.cos(yaw),
    );
    if (tmpObjetivo.lengthSq() > 1) tmpObjetivo.normalize();
    // Correr: Shift multiplica por 3, salvo volando.
    const turbo = entrada.current.turbo && !vuela;
    tmpObjetivo.multiplyScalar(VEL_MAX[vehiculo] * (turbo ? TURBO : 1));
    vel.current.lerp(tmpObjetivo, 1 - Math.exp(-(vuela ? 4 : 10) * dt));
    g.position.addScaledVector(vel.current, dt);
    const lim = limite ?? LIMITE;
    g.position.x = THREE.MathUtils.clamp(g.position.x, -lim, lim);
    g.position.z = THREE.MathUtils.clamp(g.position.z, -lim, lim);
    g.position.y = alturaVuelo.current + alturaSalto.current;

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
        if (o.id.startsWith('deco:')) {
          // El mobiliario del pueblo (farolas, bancos, árboles, casas…) hace
          // REBOTAR (petición de Eugenio): se refleja la velocidad respecto a
          // la normal y se pierde algo de energía. No abre ninguna ficha.
          const dot = vel.current.x * nx + vel.current.z * nz;
          if (dot < 0) {
            vel.current.x = (vel.current.x - 2 * dot * nx) * 0.55;
            vel.current.z = (vel.current.z - 2 * dot * nz) * 0.55;
          }
          continue;
        }
        vel.current.multiplyScalar(0.2);
        choque = o.id;
      }
    }
    if (choque !== tocando.current) {
      tocando.current = choque;
      if (choque) onChoque(choque);
    }

    const rapidez = vel.current.length();
    const moviendo = rapidez > 0.65;
    // El cambio andar/parar se avisa a React solo cuando cambia de verdad.
    if (moviendo !== andandoRef.current) {
      andandoRef.current = moviendo;
      setAndando(moviendo);
    }
    // La marcha por VELOCIDAD REAL, no por tecla: paseo hasta 4 m/s, trote
    // hasta 12 y de ahí para arriba esprint. En el aire manda el salto. La
    // cadencia divide por la velocidad natural de cada clip y se acota para
    // que el turbo (24 m/s) no convierta la zancada en un aleteo.
    const enElAire = alturaSalto.current > 0.05;
    const pasoAhora = enElAire ? 'salto'
      : !moviendo ? 'idle'
        : rapidez < 4 ? 'walk'
          : rapidez < 12 ? 'jog' : 'sprint';
    if (pasoAhora !== pasoRef.current) {
      pasoRef.current = pasoAhora;
      setPaso(pasoAhora);
    }
    ritmoAnim.current = pasoAhora === 'walk' ? THREE.MathUtils.clamp(rapidez / 2.2, 0.75, 1.5)
      : pasoAhora === 'jog' ? THREE.MathUtils.clamp(rapidez / 5.5, 0.8, 1.5)
        : pasoAhora === 'sprint' ? THREE.MathUtils.clamp(rapidez / 10, 0.9, 1.6)
          : 1;
    if (moviendo) {
      const deseo = Math.atan2(vel.current.x, vel.current.z);
      const dif = Math.atan2(Math.sin(deseo - rumbo.current), Math.cos(deseo - rumbo.current));
      rumbo.current += dif * (1 - Math.exp(-(vuela ? 6 : 12) * dt));
      g.rotation.y = rumbo.current;
      // La cámara SIGUE el giro del muñeco (petición de Eugenio): al girar con
      // A/D la vista se va poniendo sola a su espalda, como en un juego de
      // conducción. Salvo cuando estás mirando tú con el ratón o el dedo
      // (`arrastrando`), y salvo andando hacia ATRÁS: reculando, girar la
      // cámara 180° sería marearte.
      if (!camara.current.arrastrando && sz <= 0.3) {
        const yawDeseo = rumbo.current - Math.PI;
        const dy = Math.atan2(Math.sin(yawDeseo - camara.current.yaw), Math.cos(yawDeseo - camara.current.yaw));
        camara.current.yaw += dy * (1 - Math.exp(-(vuela ? 2.4 : 3.2) * dt));
      }
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
    // Dentro de un edificio la cámara NO se acota contra el muro: empujarla
    // hacia dentro la dejaba clavada en tu nuca al andar pegado a la pared
    // (fallo que vio Eugenio). En su lugar, los muros de los interiores solo
    // se dibujan por su cara de dentro (culling): si la cámara queda al otro
    // lado, la pared desaparece y sigues viendo la sala, como en Los Sims.
    tmpCam.set(
      g.position.x + Math.sin(yaw) * cp * dist,
      g.position.y + Math.max(1.5, sp * dist),
      g.position.z + Math.cos(yaw) * cp * dist,
    );
    cam.position.lerp(tmpCam, 1 - Math.exp(-6 * dt));
    // La mirada va 20° más alta (petición de Eugenio): el punto de mira se
    // eleva dist·tan(20°) ≈ dist·0,364 — mismo ángulo a cualquier zoom, así
    // se ve más horizonte y cielo en vez de tanto suelo.
    tmpMira.set(
      g.position.x,
      g.position.y + 1.6 + (zoom.current - 1) * 1.5 + dist * 0.364,
      g.position.z,
    );
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
      {vehiculo === 'pie' && (
        <Persona3D
          cuerpo={aspecto?.cuerpo || 'character-male-a'}
          // La marcha sale de la velocidad real (paseo/trote/esprint/salto)
          // y el ritmo acompasa la zancada a los m/s de verdad.
          animacion={paso}
          aspecto={aspecto}
          ritmo={ritmoAnim}
        />
      )}
      {vehiculo === 'bici' && (
        <>
          {/* SENTADO en el sillín con la postura de conducir (manos al
              manillar), no de pie sobre los pedales como antes. */}
          <group position={[0, 0.56, -0.2]}>
            <Persona3D cuerpo={aspecto?.cuerpo || 'character-male-a'} animacion="conducir" aspecto={aspecto} />
          </group>
          <Bici velocidad={vel} />
        </>
      )}
      {vehiculo === 'aptera' && (
        <>
          {/* El PILOTO va visible dentro de la burbuja de la cabina. A 0,42
              quedaba sentado ENCIMA del fuselaje (visto en pruebas): la
              postura de conducir ya lleva las caderas altas. */}
          <group position={[0, 0.1, 0.55]}>
            <Persona3D cuerpo={aspecto?.cuerpo || 'character-male-a'} animacion="conducir" aspecto={aspecto} />
          </group>
          <Aptera alturaVuelo={alturaVuelo} avanzando={andando} entrada={entrada} />
          <SombraVuelo alturaVuelo={alturaVuelo} />
        </>
      )}
    </group>
  );
}

// ============================================================================
// EL QUE RECORRE EL VISOR — antes «el personaje» (2026-08-22)
// ============================================================================
// Eugenio: «elimina los personajes y haz que sea como un espíritu azul y verde,
// un haz de luz que se mueve flotando; no puede subir ni bajar, solo se mueve
// en el plano XY» y «elimina el tema de la bici y del avión».
//
// LO QUE SE FUE, Y POR QUÉ EL FICHERO ES LA MITAD: con la altura fuera se van
// de golpe el salto, la gravedad, el aterrizaje, el techo de vuelo, la
// pregunta de «¿choco con esto o paso por encima?», las tres velocidades por
// vehículo y las cuatro marchas de animación (parado, paseo, trote, esprint).
// No es que se hayan borrado: es que sin altura ni vehículos NO EXISTEN. Un
// mundo con menos reglas tiene menos sitios donde equivocarse.
//
// Lo que se queda intacto: el mando, la cámara orbital, el viaje rápido del
// minimapa, las colisiones y el aviso de choque —que es lo que abre las fichas
// y entra por los portales—. Todo eso no dependía de tener piernas.
//
// (Lo de antes, para quien busque el historial: third-person character. Reads the shared input ref (keyboard
// or touch joystick), moves with smoothed acceleration, faces its heading,
// and drags the follow camera and the shadow-casting light along with it.
//
// Desde 2026-08-18 la cámara GIRA (petición de Eugenio: «como en Call of Duty,
// mover el avatar o mover la vista»). Eso cambia una cosa de fondo: el mando ya
// no está en ejes del mundo, sino en ejes de la CÁMARA. Adelante es «lejos de
// la cámara», gires hacia donde gires.)
// ============================================================================
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Camara, EntradaMando } from './tipos';
import { Espiritu } from './visor/Espiritu';

/** Velocidad, en m/s. Un paseo vivo: el anillo entero se cruza en unos
 *  segundos y sigue dando tiempo a leer las pantallas al pasar. */
const VELOCIDAD = 9;
/** Lo que multiplica Shift (petición de Eugenio: «si pulso Shift va más
 *  rápido»). */
const TURBO = 3;
/** Hasta dónde llega el suelo. Antes eran 530 m —118 hectáreas de aldea—;
 *  ahora la sala más grande cabe de sobra en 120, y un límite honesto evita
 *  pasear diez minutos por un blanco donde no hay nada. */
const LIMITE = 120;

const tmpObjetivo = new THREE.Vector3();
const tmpCam = new THREE.Vector3();
const tmpMira = new THREE.Vector3();

/** Algo sólido del mundo: no se atraviesa, y chocar con ello «llama». */
export interface Obstaculo { id: string; x: number; z: number; radio: number }

export function Personaje({ entrada, camara, jugadorPos, obstaculos, onChoque, destino, zoom, limite }: {
  entrada: React.MutableRefObject<EntradaMando>;
  /** Hacia dónde mira la cámara. Lo escribe el arrastre de la pantalla. */
  camara: React.MutableRefObject<Camara>;
  jugadorPos: THREE.Vector3;
  obstaculos: React.MutableRefObject<Obstaculo[]>;
  onChoque: (id: string) => void;
  /** Viaje rápido desde el minimapa: se pone aquí y apareces allí. */
  destino: React.MutableRefObject<{ x: number; z: number } | null>;
  /** Cuánto se aleja la cámara. */
  zoom: React.MutableRefObject<number>;
  /** Hasta dónde llega esta sala. Sin valor, el límite general. */
  limite?: number;
}) {
  const grupo = useRef<THREE.Group>(null);
  const vel = useRef(new THREE.Vector3());
  // Apareces mirando al norte, hacia la plaza (rumbo 0 sería de espaldas a ella).
  const rumbo = useRef(Math.PI);
  // Con quién estás chocando AHORA: el aviso salta una vez por encontronazo,
  // no cada fotograma mientras sigas pegado a él.
  const tocando = useRef<string | null>(null);
  // Quieto o moviéndose. Es lo único que el espíritu necesita saber de sí
  // mismo: sus velos giran más deprisa cuando avanzas.
  const [andando, setAndando] = useState(false);
  const andandoRef = useRef(false);

  useFrame((estado, dtBruto) => {
    const g = grupo.current;
    if (!g) return;
    const dt = Math.min(dtBruto, 0.05); // tab-switch spikes must not teleport

    // --- Viaje rápido: apareces junto al destino, mirándolo. La cámara NO
    // salta: sigue interpolando, así que hace un vuelo rasante por encima de
    // la aldea hasta alcanzarte. Ese barrido es la animación del viaje.
    const d = destino.current;
    if (d) {
      destino.current = null;
      // Se llega por el sur, a 5 m: distancia de conversación sin empotrarse.
      g.position.set(d.x, 0, d.z + 5);
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

    // NI ALTURA NI SALTO: el espíritu vive en el plano (Eugenio). La `y` se
    // queda en 0 siempre y por eso no hay nada que calcular aquí.
    entrada.current.salto = false;

    // --- Movimiento. El mando viene en ejes de PANTALLA; se gira con el rumbo
    // de la cámara para que «adelante» sea siempre adelante en la vista.
    const yaw = camara.current.yaw;
    const sx = entrada.current.x;
    // La nave YA NO cruza sola (2026-08-19, petición de Eugenio): avanza solo
    // mientras mantienes adelante, igual que a pie. Antes, en cuanto
    // despegabas, salía disparada aunque no tocaras nada.
    const sz = entrada.current.z;
    tmpObjetivo.set(
      sx * Math.cos(yaw) + sz * Math.sin(yaw),
      0,
      -sx * Math.sin(yaw) + sz * Math.cos(yaw),
    );
    if (tmpObjetivo.lengthSq() > 1) tmpObjetivo.normalize();
    // Correr: Shift multiplica por 3, salvo volando.
    const turbo = entrada.current.turbo;
    tmpObjetivo.multiplyScalar(VELOCIDAD * (turbo ? TURBO : 1));
    vel.current.lerp(tmpObjetivo, 1 - Math.exp(-10 * dt));
    g.position.addScaledVector(vel.current, dt);
    const lim = limite ?? LIMITE;
    g.position.x = THREE.MathUtils.clamp(g.position.x, -lim, lim);
    g.position.z = THREE.MathUtils.clamp(g.position.z, -lim, lim);
    g.position.y = 0;

    // --- Colisión: a la gente y a los edificios no se les atraviesa.
    // Al tocarlos te quedas fuera de su radio y se avisa a la página, que
    // abre su chat: chocarte con un amigo es empezar a hablar con él.
    // Volando por encima de los tejados no chocas con nada: pasas por arriba.
    let choque: string | null = null;
    {
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
    if (moviendo) {
      const deseo = Math.atan2(vel.current.x, vel.current.z);
      const dif = Math.atan2(Math.sin(deseo - rumbo.current), Math.cos(deseo - rumbo.current));
      // GIRO MÁS LENTO Y MÁS PRECISO (2026-08-19, petición de Eugenio: «que
      // vaya más despacio la cámara y el personaje, para que sea más preciso
      // el giro»). Antes el muñeco se plantaba en el rumbo nuevo en unas 8
      // centésimas: con A/D era imposible apuntar a algo concreto, se pasaba
      // siempre. Ahora tarda casi el doble, y ese doble es lo que te deja
      // parar donde quieres.
      rumbo.current += dif * (1 - Math.exp(-7 * dt));
      g.rotation.y = rumbo.current;
      // La cámara SIGUE el giro del muñeco (petición de Eugenio): al girar con
      // A/D la vista se va poniendo sola a su espalda, como en un juego de
      // conducción. Salvo cuando estás mirando tú con el ratón o el dedo
      // (`arrastrando`), y salvo andando hacia ATRÁS: reculando, girar la
      // cámara 180° sería marearte.
      if (!camara.current.arrastrando && sz <= 0.3) {
        const yawDeseo = rumbo.current - Math.PI;
        const dy = Math.atan2(Math.sin(yawDeseo - camara.current.yaw), Math.cos(yawDeseo - camara.current.yaw));
        // La cámara persigue el rumbo aún más despacio que el muñeco: si
        // fuera igual de rápida, girar sería el mundo entero barriendo de
        // golpe. Yendo por detrás, el giro se lee y se puede parar a tiempo.
        camara.current.yaw += dy * (1 - Math.exp(-1.9 * dt));
      }
    }
    // El modelo tiene su propia animación de andar: ya no hace falta el
    // botecito que simulaba el paso.
    jugadorPos.copy(g.position);

    // --- Cámara orbital: gira alrededor de ti con el rumbo y la inclinación
    // que hayas elegido arrastrando. `dist` sale de la distancia de siempre
    // (11 de alto y 15 de fondo), para que el zoom siga midiendo lo mismo.
    const cam = estado.camera;
    // LA MISMA DISTANCIA EN TODAS LAS SALAS (2026-08-22). Antes, `limite`
    // acercaba la cámara a 10,5 m: era para las salas cerradas de antes, donde
    // con la distancia de fuera la cámara se quedaba al otro lado de la pared.
    // Ya no hay paredes, y ese acercamiento dejaba el visor con un portal
    // ocupando la pantalla entera (visto en pruebas). Ahora la distancia es
    // siempre la misma y quien quiera acercarse tiene la rueda.
    //
    // En una pantalla estrecha (un móvil de pie) el mismo ángulo enseña MUCHO
    // menos a lo ancho, así que la cámara se echa atrás en proporción, hasta
    // un 55% más lejos.
    const anchoRel = Math.min(1, estado.viewport.aspect / 1.6);
    const porPantalla = 1 + (1 - anchoRel) * 0.55;
    const dist = 26 * zoom.current * porPantalla;
    const { pitch } = camara.current;
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    // Dentro de un edificio la cámara NO se acota contra el muro: empujarla
    // hacia dentro la dejaba clavada en tu nuca al andar pegado a la pared
    // (fallo que vio Eugenio). En su lugar, los muros de los interiores solo
    // se dibujan por su cara de dentro (culling): si la cámara queda al otro
    // lado, la pared desaparece y sigues viendo la sala, como en Los Sims.
    // SOLO TERCERA PERSONA (2026-08-22). La primera persona se ha ido con el
    // cuerpo: sin piernas ni brazos que ver, «tus ojos» era una cámara a ras
    // de suelo en una sala que se entiende desde arriba.

      // En tercera persona vuelve el plano cercano de siempre: con la cámara
      // a metros del personaje no hace falta apurar, y 0,5 da más precisión
      // de profundidad en el horizonte.
      if (cam.near !== 0.5) { cam.near = 0.5; cam.updateProjectionMatrix(); }
      tmpCam.set(
        g.position.x + Math.sin(yaw) * cp * dist,
        g.position.y + Math.max(1.5, sp * dist),
        g.position.z + Math.cos(yaw) * cp * dist,
      );
      cam.position.lerp(tmpCam, 1 - Math.exp(-6 * dt));
      // SE MIRA AL SUELO, NO AL HORIZONTE (2026-08-22). Antes el punto de
      // mira se elevaba `dist·tan(20°)` para ver más cielo: tenía sentido con
      // un cielo que mirar. Aquí lo que hay que ver es el anillo, que está en
      // el suelo, y esos 20° lo empujaban fuera de la pantalla.
      tmpMira.set(g.position.x, g.position.y + 1.4, g.position.z);
      cam.lookAt(tmpMira);
    // Ya no se arrastra ninguna luz: en el visor no hay sol ni sombras que
    // mover con el jugador (`Piezas.tsx` explica por qué).
  });

  return (
    // Apareces cerca del centro, mirando al primero del anillo. A 6 m y no a
    // 9,5: el anillo está centrado en el origen, así que cuanto más cerca del
    // centro empieces, más entero se ve de una vez.
    <group ref={grupo} position={[0, 0, 6]}>
      <Espiritu moviendo={andando} />
    </group>
  );
}

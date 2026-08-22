// ============================================================================
// JUEGO VITAL — los habitantes que el jugador ha creado (Los Sims): personas
// reales de su vida y proyectos, plantados donde él estaba al crearlos.
// Cada uno lleva su nombre flotando encima y reporta su distancia para que la
// página ofrezca «Hablar con…».
//
// Desde 2026-08-19 tus amigos TIENEN VIDA (petición de Eugenio: «que se muevan
// como dando un paseo alrededor de la plaza o que se sienten en bancos»). Su
// rutina —cuándo pasean, cuándo se sientan, cuándo se paran— vive en
// `vidaSocial.ts`; aquí solo se dibuja lo que esa rutina dice.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Agente, Medidas } from './tipos';
import type { Obstaculo } from './Personaje';
import { PALETA } from './paleta';
import { Persona3D, cuerpoDe } from './Modelos';
import { Halo, Interactivo, Rotulo, SenalDePortal } from './Senales';
import { PortalDeProyecto } from './EdificiosProyectos';
import { rutinaDe, quehacerEn, asientoDe, puntoDePaseo } from './vidaSocial';

/**
 * Dónde está AHORA cada persona que se mueve. Lo escribe cada muñeco en su
 * fotograma y lo leen los choques y el «Hablar con…»: sin esto seguirían
 * chocando y saludando en el sitio donde estaban plantados hace media hora.
 */
export const POS_VIVAS = new Map<string, { x: number; z: number }>();

/** A cuánto se para a mirarte, y a cuánto vuelve a lo suyo. */
const RADIO_ATENCION = 5.5;

const tmpDir = new THREE.Vector3();

function Persona({ a, jugadorPos, onHablar }: {
  a: Agente;
  jugadorPos: THREE.Vector3;
  onHablar: (a: Agente) => void;
}) {
  const raiz = useRef<THREE.Group>(null);
  const cuerpo = useMemo(() => cuerpoDe(a.nombre), [a.nombre]);
  const rutina = useMemo(() => rutinaDe(a.id), [a.id]);
  const asiento = useMemo(() => asientoDe(rutina), [rutina]);

  // Una persona convertida en PORTAL no se mueve: su sitio lo manda el
  // editor, y un portal que se va de paseo sería imposible de encontrar.
  const quieto = !!a.proyecto_id;

  // La animación es estado (cambiarla cada fotograma sería recompilar el
  // mezclador 60 veces por segundo); solo se toca cuando cambia de quehacer.
  const [animacion, setAnimacion] = useState<'idle' | 'walk' | 'sit' | 'talk'>('idle');
  const animRef = useRef(animacion);
  const rumbo = useRef(0);
  const pos = useRef({ x: a.x, z: a.z, y: 0 });

  // Al plantarla, y si el editor la mueve, vuelve a su sitio de partida.
  useEffect(() => { pos.current = { x: a.x, z: a.z, y: 0 }; }, [a.x, a.z]);

  useEffect(() => () => { POS_VIVAS.delete(a.id); }, [a.id]);

  useFrame((estado, dt) => {
    const g = raiz.current;
    if (!g) return;
    const t = estado.clock.elapsedTime;

    // --- ¿Estás al lado? Entonces se para y te mira: perseguir a alguien que
    // no deja de andar para poder hablarle es lo más molesto que hay.
    const dx = jugadorPos.x - pos.current.x;
    const dz = jugadorPos.z - pos.current.z;
    const cerca = Math.hypot(dx, dz) < RADIO_ATENCION;

    const { hace } = quieto ? { hace: 'parado' as const } : quehacerEn(rutina, t);
    let quiere: typeof animacion = 'idle';

    if (cerca) {
      // Te mira de frente. Si estaba sentada, sigue sentada (te habla desde
      // el banco); si estaba de pie, se gira hacia ti.
      const objetivo = Math.atan2(dx, dz);
      rumbo.current += ((objetivo - rumbo.current + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 6);
      quiere = hace === 'sentado' ? 'sit' : 'talk';
      if (hace === 'sentado') { pos.current.x = asiento.x; pos.current.z = asiento.z; pos.current.y = asiento.alto; }
      else pos.current.y = 0;
    } else if (hace === 'paseo') {
      const p = puntoDePaseo(rutina, t);
      // Va hacia el punto de su carril, no salta a él: si el jugador la ha
      // apartado o venía de sentarse, se reincorpora andando.
      tmpDir.set(p.x - pos.current.x, 0, p.z - pos.current.z);
      const d = tmpDir.length();
      if (d > 0.05) {
        tmpDir.multiplyScalar(Math.min(1, (rutina.velocidad * dt) / d));
        pos.current.x += tmpDir.x;
        pos.current.z += tmpDir.z;
        const objetivo = Math.atan2(tmpDir.x, tmpDir.z);
        rumbo.current += ((objetivo - rumbo.current + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 5);
      }
      pos.current.y = 0;
      quiere = 'walk';
    } else if (hace === 'sentado') {
      // Camina hasta su banco y, al llegar, se sienta.
      tmpDir.set(asiento.x - pos.current.x, 0, asiento.z - pos.current.z);
      const d = tmpDir.length();
      if (d > 0.35) {
        tmpDir.multiplyScalar(Math.min(1, (rutina.velocidad * dt) / d));
        pos.current.x += tmpDir.x;
        pos.current.z += tmpDir.z;
        const objetivo = Math.atan2(tmpDir.x, tmpDir.z);
        rumbo.current += ((objetivo - rumbo.current + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 5);
        pos.current.y = 0;
        quiere = 'walk';
      } else {
        pos.current.x = asiento.x;
        pos.current.z = asiento.z;
        pos.current.y = asiento.alto;
        rumbo.current += ((asiento.rot - rumbo.current + Math.PI * 3) % (Math.PI * 2) - Math.PI) * Math.min(1, dt * 4);
        quiere = 'sit';
      }
    } else {
      // Parada: mira alrededor despacio, como antes.
      pos.current.y = 0;
      rumbo.current = Math.sin((t + rutina.radio) * 0.3) * 0.45;
      quiere = 'idle';
    }

    g.position.set(pos.current.x, pos.current.y, pos.current.z);
    g.rotation.y = rumbo.current;
    POS_VIVAS.set(a.id, { x: pos.current.x, z: pos.current.z });

    if (animRef.current !== quiere) {
      animRef.current = quiere;
      setAnimacion(quiere);
    }
  });

  return (
    <group ref={raiz} position={[a.x, 0, a.z]}>
      <Halo y={3.4} color={PALETA.robotLuz} radio={0.75} />
      {/* Una persona convertida en PORTAL sigue siendo un muñeco: solo lo
          delatan su nombre en verde y el aro (aclaración de Eugenio). */}
      {a.proyecto_id && <SenalDePortal y={4.3} titulo={a.nombre} />}
      <Interactivo onPulsar={() => onHablar(a)}>
        {(resaltado) => (
          <group>
            <Persona3D cuerpo={a.apariencia?.cuerpo || cuerpo} animacion={animacion} aspecto={a.apariencia} />
            {/* Cilindro transparente alrededor: acertarle a un muñeco pequeño
                con el dedo es difícil, y esto le da un blanco generoso.
                Transparente y NO `visible={false}`: lo invisible se salta el
                rayo del ratón, y entonces no habría blanco que acertar. */}
            <mesh position={[0, 1, 0]}>
              <cylinderGeometry args={[1.1, 1.1, 2.2, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            <Rotulo y={2.8} texto={a.nombre} pie="Pulsa para hablar" color={PALETA.robotLuz} resaltado={resaltado} />
          </group>
        )}
      </Interactivo>
    </group>
  );
}

function ProyectoAgente({ a, onHablar, onAgarrar }: {
  a: Agente;
  onHablar: (a: Agente) => void;
  onAgarrar?: (a: Agente, e: any) => void;
}) {
  const pct = a.tarjetas && a.tarjetas > 0 ? (a.hechas || 0) / a.tarjetas : 0;
  return (
    <group position={[a.x, 0, a.z]}>
      <Interactivo onPulsar={() => onHablar(a)}>
        {(resaltado) => (
          <PortalDeProyecto
            titulo={a.nombre}
            tarjetas={a.tarjetas || 0}
            pct={pct}
            radio={2.2}
            resaltado={resaltado}
            fotoUrl={a.foto_url}
            onAgarrar={onAgarrar ? (e) => onAgarrar(a, e) : undefined}
          />
        )}
      </Interactivo>
    </group>
  );
}

export function Agentes({ agentes, jugadorPos, medidas, obstaculos, onHablar, onAgarrarProyecto }: {
  agentes: Agente[];
  jugadorPos: THREE.Vector3;
  medidas: React.MutableRefObject<Medidas>;
  /** Los choques del mundo: se les corrige el sitio a los que andan. */
  obstaculos?: React.MutableRefObject<Obstaculo[]>;
  /** Pulsar abre su chat sin tener que acercarse (petición de Eugenio). */
  onHablar: (a: Agente) => void;
  /** Pinchar sin soltar un PORTAL de proyecto: se arrastra y se recoloca. */
  onAgarrarProyecto?: (a: Agente, e: any) => void;
}) {
  useFrame(() => {
    let mejor: Medidas['agente'] = null;
    for (const a of agentes) {
      // La posición VIVA si está paseando; la plantada si no se mueve.
      const v = POS_VIVAS.get(a.id);
      const ax = v?.x ?? a.x;
      const az = v?.z ?? a.z;
      const d = Math.hypot(jugadorPos.x - ax, jugadorPos.z - (az + (a.tipo === 'proyecto' ? 3 : 0)));
      if (d < (a.tipo === 'proyecto' ? 8 : 5) && (!mejor || d < mejor.d)) mejor = { a, d };
    }
    medidas.current.agente = mejor;

    // El bulto con el que chocas también se mueve con ellos: si no, te
    // estrellabas contra el aire donde estaba tu amigo hace un rato.
    if (obstaculos) {
      for (const o of obstaculos.current) {
        const v = POS_VIVAS.get(o.id);
        if (v) { o.x = v.x; o.z = v.z; }
      }
    }
  });

  return (
    <group>
      {agentes.map(a => a.tipo === 'persona'
        ? <Persona key={a.id} a={a} jugadorPos={jugadorPos} onHablar={onHablar} />
        : <ProyectoAgente key={a.id} a={a} onHablar={onHablar} onAgarrar={onAgarrarProyecto} />)}
    </group>
  );
}

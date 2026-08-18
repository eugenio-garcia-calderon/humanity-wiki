// ============================================================================
// JUEGO VITAL — el editor del mundo: un Miro en 3D (2026-08-18, petición de
// Eugenio: «click en cualquier elemento para eliminarlo o cambiar su diseño,
// click en el mapa para crear reutilizando los ya creados, notas, documentos
// y archivos flotando, y mover objetos con una UI genial»).
// ============================================================================
// Aquí viven las piezas 3D del editor:
//
//   <ObjetosMundo>   los objetos plantados por el jugador (props del catálogo,
//                    notas, imágenes y documentos) + sus hilos de conocimiento.
//   <SueloEditor>    el plano invisible que recoge los clics en el suelo:
//                    pulsar tierra vacía abre el panel de crear, y en modo
//                    «mover» es donde se suelta el objeto.
//   <MarcadorMover>  el anillo que sigue al ratón mientras mueves algo.
//   <AnilloSeleccion> el aro que late bajo el objeto seleccionado.
//
// Los paneles (catálogo, botones de editar) son HTML de la página: aquí solo
// está lo que se dibuja dentro del lienzo.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Billboard, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { PALETA } from './paleta';
import { Modelo, CASAS } from './Modelos';
import { Banco, Farola, PuestoMercado, Pozo } from './Detalles';
import { RELACIONES_HILO, nombreLimpio, type ItemMundo, type SeleccionHilo, type SeleccionMundo } from './tipos';
import { Rotulo } from './Senales';

const ORO = '#f6c667';
const POSTIT = '#fbe28a';
const PAPEL = '#f7f3e9';

/** El clic solo cuenta si NO venías arrastrando la cámara (mismo umbral que
 *  Senales.tsx: arrastrar es girar la vista, no pulsar). */
const esClic = (e: ThreeEvent<MouseEvent>) => e.delta <= 6;

/**
 * Hover con la misma GRACIA que las personas y los edificios (Senales.tsx):
 * salir no apaga en el acto — espera y se cancela si el ratón vuelve, porque
 * una tarjeta son varias mallas con huecos y el rótulo parpadeaba.
 */
function useHoverEstable(): [boolean, { onPointerOver: (e: ThreeEvent<PointerEvent>) => void; onPointerOut: () => void }] {
  const [resaltado, setResaltado] = useState(false);
  const salida = useRef<number | null>(null);
  const cancelar = () => { if (salida.current !== null) { clearTimeout(salida.current); salida.current = null; } };
  useEffect(() => cancelar, []);
  return [resaltado, {
    onPointerOver: (e) => {
      e.stopPropagation();
      cancelar();
      setResaltado(true);
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      cancelar();
      salida.current = window.setTimeout(() => {
        salida.current = null;
        setResaltado(false);
        document.body.style.cursor = '';
      }, 450);
    },
  }];
}

/** Color y pregunta de una relación de hilo. */
const relacionDe = (rel?: string) => RELACIONES_HILO.find(r => r.id === rel) || null;

// ---------------------------------------------------------------------------
// Props procedurales del catálogo (los que no salen del pack de modelos)
// ---------------------------------------------------------------------------

function ArbolProc({ pino }: { pino: boolean }) {
  return (
    <group>
      <mesh castShadow position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.28, 0.45, 2.4, 6]} />
        <meshStandardMaterial color={PALETA.tronco} />
      </mesh>
      {pino ? (
        <mesh castShadow position={[0, 4.6, 0]}>
          <coneGeometry args={[2.0, 4.8, 7]} />
          <meshStandardMaterial color={PALETA.pino} flatShading />
        </mesh>
      ) : (
        <mesh castShadow position={[0, 3.9, 0]} scale={[1, 0.85, 1]}>
          <icosahedronGeometry args={[2.1, 0]} />
          <meshStandardMaterial color={PALETA.hoja} flatShading />
        </mesh>
      )}
    </group>
  );
}

function RocaProc() {
  return (
    <mesh castShadow position={[0, 0.35, 0]}>
      <dodecahedronGeometry args={[0.8, 0]} />
      <meshStandardMaterial color={PALETA.piedra} flatShading />
    </mesh>
  );
}

function ArbustoProc() {
  return (
    <mesh castShadow position={[0, 0.5, 0]} scale={[1, 0.7, 1]}>
      <sphereGeometry args={[0.85, 8, 6]} />
      <meshStandardMaterial color={PALETA.arbusto} flatShading />
    </mesh>
  );
}

/** Un prop del catálogo, por nombre. La casa elige su modelo con el id para
 *  que dos casas creadas no salgan clónicas. */
export function PropMundo({ modelo, semilla }: { modelo: string; semilla: string }) {
  switch (modelo) {
    case 'arbol': return <ArbolProc pino={false} />;
    case 'pino': return <ArbolProc pino />;
    case 'casa': {
      let h = 0;
      for (let i = 0; i < semilla.length; i++) h = (h * 31 + semilla.charCodeAt(i)) >>> 0;
      // Misma escala que las casas de la aldea (Aldea.tsx): 6,4 ≈ 5,3 m de alto.
      return <Modelo nombre={CASAS[h % CASAS.length]} escala={6.4} />;
    }
    case 'banco': return <Banco x={0} z={0} rot={0} />;
    case 'farola': return <Farola x={0} z={0} />;
    case 'puesto': return <PuestoMercado x={0} z={0} rot={0} color={PALETA.tela[0]} />;
    case 'pozo': return <Pozo x={0} z={0} />;
    case 'roca': return <RocaProc />;
    case 'arbusto': return <ArbustoProc />;
    default: return <RocaProc />;
  }
}

// ---------------------------------------------------------------------------
// Conocimiento plantado: notas, imágenes y documentos
// ---------------------------------------------------------------------------

/** Bamboleo suave: lo que flota se mueve un poco, como en la habitación. */
function Flota({ fase, children }: { fase: number; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((estado) => {
    if (!g.current) return;
    const t = estado.clock.elapsedTime + fase;
    g.current.position.y = Math.sin(t * 0.8) * 0.12;
    g.current.rotation.z = Math.sin(t * 0.5) * 0.015;
  });
  return <group ref={g}>{children}</group>;
}

/** Nota amarilla flotando a la altura de la vista, con su texto. */
function Nota3D({ texto }: { texto: string }) {
  return (
    <Billboard position={[0, 2.1, 0]}>
      <mesh>
        <planeGeometry args={[2.9, 2.1]} />
        <meshBasicMaterial color={POSTIT} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.02, 0.01]}>
        <planeGeometry args={[2.9, 0.14]} />
        <meshBasicMaterial color={ORO} toneMapped={false} />
      </mesh>
      <Text
        position={[-1.28, 0.78, 0.02]}
        fontSize={0.21}
        maxWidth={2.6}
        lineHeight={1.25}
        color="#4a3d18"
        anchorX="left"
        anchorY="top"
      >
        {(texto || 'Nota vacía').slice(0, 220)}
      </Text>
    </Billboard>
  );
}

/** Imagen subida, en un marco. La textura se carga a mano (una imagen rota no
 *  puede tumbar el Suspense) y el material se REMONTA con otra key al llegar:
 *  three no recompila el shader de un material que nació sin mapa. */
function Imagen3D({ url }: { url: string }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let vivo = true;
    new THREE.TextureLoader().load(url, (t) => {
      if (!vivo) return;
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    }, undefined, () => { /* la imagen no está: queda el marco */ });
    return () => { vivo = false; };
  }, [url]);
  const img = tex?.image as { width?: number; height?: number } | undefined;
  const prop = img?.width && img?.height ? img.height / img.width : 0.68;
  const ancho = 3;
  return (
    <Billboard position={[0, 2.2, 0]}>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[ancho + 0.24, ancho * prop + 0.24]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh>
        <planeGeometry args={[ancho, ancho * prop]} />
        {tex
          ? <meshBasicMaterial key="con" map={tex} toneMapped={false} />
          : <meshBasicMaterial key="sin" color="#d8dee6" />}
      </mesh>
    </Billboard>
  );
}

/** Documento subido: una hoja con su nombre. Pulsarlo (fuera del modo
 *  edición) lo abre. */
function Documento3D({ nombre }: { nombre: string }) {
  return (
    <Billboard position={[0, 2.1, 0]}>
      <mesh>
        <planeGeometry args={[2.1, 2.7]} />
        <meshBasicMaterial color={PAPEL} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.13, 0.01]}>
        <planeGeometry args={[2.1, 0.44]} />
        <meshBasicMaterial color={PALETA.robotLuz} toneMapped={false} />
      </mesh>
      {[0.45, 0.1, -0.25, -0.6].map((y, i) => (
        <mesh key={y} position={[0, y, 0.01]}>
          <planeGeometry args={[1.5 - (i % 2) * 0.35, 0.09]} />
          <meshBasicMaterial color="#c9cfd8" />
        </mesh>
      ))}
      <Text position={[0, -1.05, 0.02]} fontSize={0.17} maxWidth={1.9} color="#3a4552" anchorX="center" anchorY="middle" textAlign="center">
        {(nombre || 'Documento').slice(0, 40)}
      </Text>
    </Billboard>
  );
}

/** Tarjeta base de las cosas que se ABREN en ventana interna: enlaces,
 *  vídeos, música, lienzos y mapas. Cada tipo tiene su cara. */
function TarjetaMedio({ ancho, alto, fondo, barra, icono, nombre, colorNombre = '#3a4552' }: {
  ancho: number; alto: number; fondo: string; barra: string;
  icono: string; nombre: string; colorNombre?: string;
}) {
  return (
    <Billboard position={[0, 2.1, 0]}>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[ancho + 0.2, alto + 0.2]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh>
        <planeGeometry args={[ancho, alto]} />
        <meshBasicMaterial color={fondo} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Barra superior tipo navegador, con sus tres puntos */}
      <mesh position={[0, alto / 2 - 0.16, 0.01]}>
        <planeGeometry args={[ancho, 0.32]} />
        <meshBasicMaterial color={barra} toneMapped={false} />
      </mesh>
      {[-1, 0, 1].map(i => (
        <mesh key={i} position={[-ancho / 2 + 0.22 + i * 0.16 + 0.16, alto / 2 - 0.16, 0.02]}>
          <circleGeometry args={[0.045, 10]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.8} />
        </mesh>
      ))}
      <Text position={[0, 0.1, 0.02]} fontSize={0.62} anchorX="center" anchorY="middle">
        {icono}
      </Text>
      <Text position={[0, -alto / 2 + 0.3, 0.02]} fontSize={0.18} maxWidth={ancho - 0.3} color={colorNombre} anchorX="center" anchorY="middle" textAlign="center">
        {(nombre || '').slice(0, 40)}
      </Text>
    </Billboard>
  );
}

/**
 * Vídeo de YouTube: la MINIATURA real, el título y las etiquetas (canal y
 * YouTube) — la URL no se pinta en ningún sitio (petición de Eugenio).
 * La miniatura sale de i.ytimg.com (pública y con CORS; `mqdefault` es 16:9
 * de verdad, sin franjas negras). El título y el canal los guardó el servidor
 * al crear el objeto preguntando al oEmbed de YouTube.
 */
function Video3D({ item }: { item: ItemMundo }) {
  const id = item.url?.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)?.[1];
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!id) return;
    let vivo = true;
    new THREE.TextureLoader().load(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`, (t) => {
      if (!vivo) return;
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    }, undefined, () => { /* sin miniatura queda la tarjeta oscura */ });
    return () => { vivo = false; };
  }, [id]);

  // Un vídeo que no es de YouTube sigue con la tarjeta genérica de siempre.
  if (!id) {
    return <TarjetaMedio ancho={3.1} alto={1.95} fondo="#1c1c22" barra="#e0245e" icono="▶️" nombre={item.nombre || 'Vídeo'} colorNombre="#e8e8ee" />;
  }

  // Si el nombre guardado es una URL (objetos de antes del enriquecido), se
  // esconde: mejor un genérico que enseñar la dirección.
  const titulo = nombreLimpio(item.nombre, 'Vídeo de YouTube');
  const canal = item.texto ? nombreLimpio(item.texto, '') || null : null;
  const A = 3.2, IMG = 1.8;
  const wCanal = canal ? Math.min(2.1, Math.max(0.8, canal.length * 0.095 + 0.3)) : 0;
  const wYT = 0.88;
  const chips = canal ? wCanal + 0.12 + wYT : wYT;
  return (
    <Billboard position={[0, 2.35, 0]}>
      {/* Marco blanco que envuelve miniatura + título + etiquetas */}
      <mesh position={[0, -0.5, -0.02]}>
        <planeGeometry args={[A + 0.24, IMG + 1.34]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      {/* La miniatura del vídeo */}
      <mesh>
        <planeGeometry args={[A, IMG]} />
        {tex
          ? <meshBasicMaterial key="con" map={tex} toneMapped={false} />
          : <meshBasicMaterial key="sin" color="#1c1c22" toneMapped={false} />}
      </mesh>
      {/* El play de YouTube encima */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[0.94, 0.66]} />
        <meshBasicMaterial color="#ff0033" toneMapped={false} transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <circleGeometry args={[0.2, 3]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      {/* El título (sin URL jamás) */}
      <Text
        position={[0, -IMG / 2 - 0.33, 0.02]} fontSize={0.185} maxWidth={A - 0.2}
        color="#101828" anchorX="center" anchorY="middle" textAlign="center" lineHeight={1.18}
      >
        {titulo.length > 64 ? `${titulo.slice(0, 63)}…` : titulo}
      </Text>
      {/* Etiquetas: el canal y YouTube */}
      <group position={[0, -IMG / 2 - 0.82, 0.02]}>
        {canal && (
          <group position={[-chips / 2 + wCanal / 2, 0, 0]}>
            <mesh>
              <planeGeometry args={[wCanal, 0.3]} />
              <meshBasicMaterial color="#eef2f7" toneMapped={false} />
            </mesh>
            <Text position={[0, 0, 0.01]} fontSize={0.14} color="#3a4552" anchorX="center" anchorY="middle">
              {canal.length > 20 ? `${canal.slice(0, 19)}…` : canal}
            </Text>
          </group>
        )}
        <group position={[chips / 2 - wYT / 2, 0, 0]}>
          <mesh>
            <planeGeometry args={[wYT, 0.3]} />
            <meshBasicMaterial color="#ff0033" toneMapped={false} />
          </mesh>
          <Text position={[0, 0, 0.01]} fontSize={0.14} color="#ffffff" anchorX="center" anchorY="middle">
            YouTube
          </Text>
        </group>
      </group>
    </Billboard>
  );
}

/** Poste que ancla al suelo lo que flota (nota, imagen, documento). */
function Poste() {
  return (
    <mesh castShadow position={[0, 0.55, 0]}>
      <cylinderGeometry args={[0.035, 0.05, 1.1, 6]} />
      <meshStandardMaterial color={PALETA.tronco} />
    </mesh>
  );
}

/** El aspecto de un objeto del jugador, sin posición: lo usan la lista y el
 *  FANTASMA que sigue al ratón mientras lo arrastras. */
export function ItemVisual({ item, fase = 0 }: { item: ItemMundo; fase?: number }) {
  return (
    <>
      {item.tipo === 'prop' && <PropMundo modelo={item.modelo || 'roca'} semilla={item.id} />}
      {item.tipo === 'nota' && <><Poste /><Flota fase={fase}><Nota3D texto={item.texto || ''} /></Flota></>}
      {item.tipo === 'imagen' && item.url && <><Poste /><Flota fase={fase}><Imagen3D url={item.url} /></Flota></>}
      {item.tipo === 'documento' && <><Poste /><Flota fase={fase}><Documento3D nombre={item.nombre || ''} /></Flota></>}
      {item.tipo === 'enlace' && <><Poste /><Flota fase={fase}>
        <TarjetaMedio ancho={2.7} alto={2} fondo="#f6f8fb" barra="#64748b" icono="🌐" nombre={item.nombre || item.url || 'Enlace'} /></Flota></>}
      {item.tipo === 'video' && <><Poste /><Flota fase={fase}><Video3D item={item} /></Flota></>}
      {item.tipo === 'musica' && <><Poste /><Flota fase={fase}>
        <TarjetaMedio ancho={2.4} alto={2.4} fondo="#173325" barra="#1db954" icono="🎵" nombre={item.nombre || 'Música'} colorNombre="#d9f2e4" /></Flota></>}
      {item.tipo === 'lienzo' && <><Poste /><Flota fase={fase}>
        <TarjetaMedio ancho={2.8} alto={2.1} fondo="#faf7ff" barra="#7c3aed" icono="🎨" nombre={item.nombre || 'Lienzo'} /></Flota></>}
      {item.tipo === 'mapa' && <><Poste /><Flota fase={fase}>
        <TarjetaMedio ancho={2.8} alto={2.1} fondo="#eefaf1" barra="#16a34a" icono="🗺️" nombre={item.nombre || 'Mapa'} /></Flota></>}
    </>
  );
}

/**
 * El fantasma de arrastre: lo que llevas agarrado, siguiendo al ratón por el
 * suelo (petición de Eugenio: «si pincho y arrastro, el objeto se mueve»).
 * El original se oculta mientras tanto; al soltar, se guarda donde caiga.
 */
export function MovilFantasma({ movil, rot, children }: {
  movil: React.MutableRefObject<{ x: number; z: number } | null>;
  rot: number;
  children: React.ReactNode;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const gr = g.current;
    if (!gr) return;
    const p = movil.current;
    gr.visible = !!p;
    if (p) {
      gr.position.x += (p.x - gr.position.x) * 0.5;
      gr.position.z += (p.z - gr.position.z) * 0.5;
    }
  });
  return <group ref={g} rotation-y={rot} visible={false}>{children}</group>;
}

// ---------------------------------------------------------------------------
// Los objetos del jugador + sus hilos
// ---------------------------------------------------------------------------

/** Altura a la que sale el hilo de cada tipo de cosa. */
const alturaHilo = (tipo: string) => (tipo === 'prop' ? 1.2 : 2.1);

export function ObjetosMundo({ items, onPulsar, onAgarrar, onPulsarHilo, ocultar, resolverDestino }: {
  items: ItemMundo[];
  /** Pulsar un objeto abre SUS OPCIONES directamente (petición de Eugenio:
   *  sin tener que activar antes ningún modo edición). */
  onPulsar: (sel: SeleccionMundo) => void;
  /** Pinchar (sin soltar) un objeto: candidato a arrastre. La página decide
   *  si es arrastre (se mueve) o clic (se abren sus opciones). */
  onAgarrar: (sel: SeleccionMundo, punto: { x: number; y: number }) => void;
  /** Pulsar un HILO: la página abre su editor (relación, texto, eliminar). */
  onPulsarHilo: (sel: SeleccionHilo) => void;
  /** El id del objeto que va agarrado: no se dibuja (lo lleva el fantasma). */
  ocultar?: string;
  /** Convierte 'agente:GA…' | 'proy:PRY…' | 'item:WM…' en una posición, o null. */
  resolverDestino: (ref: string) => { x: number; y: number; z: number } | null;
}) {
  // Los hilos de conocimiento: curvas de un objeto a lo que apunta, con el
  // color de su RELACIÓN y su texto flotando en el punto más alto del arco
  // (petición de Eugenio: hilos editables con información, como en los grafos).
  const hilos = useMemo(() => {
    const lista: Array<{
      clave: string; itemId: string; indice: number;
      puntos: THREE.Vector3[]; cima: THREE.Vector3; color: string; texto: string | null;
    }> = [];
    for (const it of items) {
      for (const [i, e] of (it.enlaces || []).entries()) {
        const destino = resolverDestino(e.a);
        if (!destino) continue;
        const a = new THREE.Vector3(it.x, alturaHilo(it.tipo), it.z);
        const b = new THREE.Vector3(destino.x, destino.y, destino.z);
        const medio = a.clone().lerp(b, 0.5);
        medio.y += Math.max(2, a.distanceTo(b) * 0.18);   // arco hacia arriba
        const curva = new THREE.QuadraticBezierCurve3(a, medio, b);
        const rel = relacionDe(e.rel);
        lista.push({
          clave: `${it.id}:${i}`, itemId: it.id, indice: i,
          puntos: curva.getPoints(24),
          cima: curva.getPoint(0.5),
          color: rel?.color || ORO,
          texto: e.texto || rel?.label || null,
        });
      }
    }
    return lista;
  }, [items, resolverDestino]);

  const selDe = (it: ItemMundo): SeleccionMundo => ({
    clase: 'item', id: it.id, tipo: it.tipo,
    etiqueta: it.tipo === 'prop' ? `Objeto (${it.modelo})`
      : it.tipo === 'nota' ? 'Nota'
        : it.tipo === 'imagen' ? 'Imagen'
          : nombreLimpio(it.nombre, ({ documento: 'Documento', enlace: 'Enlace', video: 'Vídeo', musica: 'Música', lienzo: 'Lienzo', mapa: 'Mapa' } as Record<string, string>)[it.tipo] || it.tipo),
    x: it.x, z: it.z, rot: it.rot, modelo: it.modelo, texto: it.texto, url: it.url,
  });
  const pulsar = (e: ThreeEvent<MouseEvent>, it: ItemMundo) => {
    if (!esClic(e)) return;
    e.stopPropagation();
    onPulsar(selDe(it));
  };

  return (
    <group>
      {items.filter(it => it.id !== ocultar).map((it, i) => (
        <ItemPulsable
          key={it.id}
          item={it}
          fase={i * 1.3}
          onClick={(e) => pulsar(e, it)}
          onAgarrar={(e) => {
            if (e.nativeEvent.button !== undefined && e.nativeEvent.button !== 0) return;
            onAgarrar(selDe(it), { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY });
          }}
        />
      ))}
      {hilos.map(h => (
        <group key={h.clave}>
          <Line
            points={h.puntos}
            color={h.color}
            lineWidth={2.5}
            transparent
            opacity={0.8}
            onClick={(e) => {
              if (e.delta > 6) return;
              e.stopPropagation();
              onPulsarHilo({ itemId: h.itemId, indice: h.indice });
            }}
          />
          {h.texto && (
            <Billboard position={[h.cima.x, h.cima.y + 0.35, h.cima.z]}>
              <Text
                fontSize={0.34}
                maxWidth={6}
                textAlign="center"
                color={h.color}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.045}
                outlineColor="#ffffff"
              >
                {h.texto.slice(0, 60)}
              </Text>
            </Billboard>
          )}
        </group>
      ))}
    </group>
  );
}

/** Etiqueta corta del rótulo flotante de un item al pasar el ratón. */
const nombreDe = (it: ItemMundo) =>
  it.tipo === 'prop' ? ({ arbol: 'Árbol', pino: 'Pino', casa: 'Casa', banco: 'Banco', farola: 'Farola', puesto: 'Puesto', pozo: 'Pozo', roca: 'Roca', arbusto: 'Arbusto' } as Record<string, string>)[it.modelo || ''] || 'Objeto'
    : it.tipo === 'nota' ? (it.texto || 'Nota').split('\n')[0].slice(0, 40)
      : nombreLimpio(it.nombre, ({ imagen: 'Imagen', documento: 'Documento', enlace: 'Enlace', video: 'Vídeo', musica: 'Música', lienzo: 'Lienzo', mapa: 'Mapa' } as Record<string, string>)[it.tipo] || it.tipo);

/**
 * Un objeto plantado, con el MISMO hover que las personas y los edificios
 * (petición de Eugenio): al pasar el ratón, su nombre crece medido en pantalla
 * y con la gracia de salida que evita el parpadeo.
 */
function ItemPulsable({ item, fase, onClick, onAgarrar }: {
  item: ItemMundo;
  fase: number;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onAgarrar: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const [resaltado, hover] = useHoverEstable();
  return (
    <group
      position={[item.x, 0, item.z]}
      rotation-y={item.rot}
      onClick={onClick}
      onPointerDown={onAgarrar}
      {...hover}
    >
      <ItemVisual item={item} fase={fase} />
      <Rotulo
        y={item.tipo === 'prop' ? 3.2 : 4.1}
        texto={nombreDe(item)}
        pie="Pulsa para abrir · arrastra para mover"
        color={ORO}
        resaltado={resaltado}
      />
      {/* Blanco generoso para el dedo en lo que flota fino */}
      {item.tipo !== 'prop' && (
        <mesh position={[0, 2, 0]}>
          <cylinderGeometry args={[1.6, 1.6, 3.2, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// El suelo del editor, el marcador de mover y el anillo de selección
// ---------------------------------------------------------------------------

export function SueloEditor({ moviendo, movil, onSuelo, onSoltar }: {
  moviendo: boolean;
  /** Compartido con la página: la última posición del ratón sobre el suelo. */
  movil: React.MutableRefObject<{ x: number; z: number } | null>;
  onSuelo: (p: { x: number; z: number }) => void;
  onSoltar: (p: { x: number; z: number }) => void;
}) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.01, 0]}
      onPointerMove={(e) => {
        // SIEMPRE se apunta dónde está el ratón sobre el suelo, no solo en
        // modo mover: el arrastre directo empieza en un pointermove y, si
        // esperase al re-render del estado, un arrastre rápido soltaría el
        // objeto en su sitio original (pasó en las pruebas).
        movil.current = { x: e.point.x, z: e.point.z };
      }}
      onClick={(e) => {
        if (!esClic(e)) return;
        const p = { x: e.point.x, z: e.point.z };
        if (moviendo) onSoltar(movil.current || p);
        else onSuelo(p);
      }}
    >
      <planeGeometry args={[1100, 1100]} />
      {/* Transparente pero NO visible={false}: lo invisible se salta el rayo. */}
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

/** El anillo que sigue al ratón mientras mueves un objeto. */
export function MarcadorMover({ movil }: {
  movil: React.MutableRefObject<{ x: number; z: number } | null>;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame((estado) => {
    const gr = g.current;
    if (!gr) return;
    const p = movil.current;
    gr.visible = !!p;
    if (p) {
      gr.position.x += (p.x - gr.position.x) * 0.4;
      gr.position.z += (p.z - gr.position.z) * 0.4;
      const s = 1 + Math.sin(estado.clock.elapsedTime * 5) * 0.08;
      gr.scale.setScalar(s);
    }
  });
  return (
    <group ref={g} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[1.0, 1.35, 40]} />
        <meshBasicMaterial color={ORO} toneMapped={false} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 5, 6]} />
        <meshBasicMaterial color={ORO} toneMapped={false} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/** El aro que late bajo el objeto seleccionado. */
export function AnilloSeleccion({ x, z }: { x: number; z: number }) {
  const m = useRef<THREE.Mesh>(null);
  useFrame((estado) => {
    if (!m.current) return;
    const s = 1 + Math.sin(estado.clock.elapsedTime * 3.2) * 0.1;
    m.current.scale.setScalar(s);
  });
  return (
    <mesh ref={m} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.06, z]}>
      <ringGeometry args={[1.4, 1.75, 44]} />
      <meshBasicMaterial color="#4ade80" toneMapped={false} transparent opacity={0.95} side={THREE.DoubleSide} />
    </mesh>
  );
}

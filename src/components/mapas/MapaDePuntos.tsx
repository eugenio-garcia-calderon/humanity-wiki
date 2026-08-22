// ============================================================================
// UN MAPA DE SITIOS CONCRETOS (2026-08-20, el fallo B23 del Tester: pidió los
// cinco puntos de ensayo de su prototipo y se publicó una pieza titulada
// «Puntos de ensayo HELIOS ONE» que enseñaba el mapamundi de Indicadores).
// ============================================================================
// LA CAUSA ERA QUE ESTO NO EXISTÍA. Un mapa de usuario solo sabía ser una
// VISTA del mapa de la humanidad —territorio, nivel, indicador—, así que la IA
// escribió los cinco sitios en la descripción, que era el único hueco de texto
// que tenía, y el mapa siguió enseñando otra cosa.
//
// Esto es lo otro que puede ser un mapa: LOS SITIOS DE ALGUIEN. Dónde se
// ensaya, dónde se mide, dónde está cada cosa. Con su nombre, su coordenada y
// opcionalmente el valor medido allí.
//
// SE PINTA AQUÍ Y NO DENTRO DE `/mapa`: el mapa de la humanidad tiene su
// propia lógica —territorios, puntuaciones, capas de color— y meterle puntos
// sueltos por la URL sería ensuciarlo para siempre por un caso que no es el
// suyo. Son dos mapas distintos porque son dos cosas distintas.
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';

const TOKEN = (import.meta as any).env.VITE_MAPBOX_TOKEN;

export interface Punto {
  nombre: string;
  lat: number;
  lon: number;
  descripcion?: string;
  valor?: string;
}

export default function MapaDePuntos({ puntos, unidad }: { puntos: Punto[]; unidad?: string }) {
  const caja = useRef<HTMLDivElement>(null);
  const [elegido, setElegido] = useState<number | null>(null);
  const [sinMapa, setSinMapa] = useState(!TOKEN);

  useEffect(() => {
    if (!TOKEN || !caja.current || !puntos.length) return;
    mapboxgl.accessToken = TOKEN;
    let mapa: mapboxgl.Map | null = null;
    try {
      mapa = new mapboxgl.Map({
        container: caja.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [puntos[0].lon, puntos[0].lat],
        zoom: 5,
      });
      mapa.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

      for (const [i, p] of puntos.entries()) {
        const marca = new mapboxgl.Marker({ color: '#059669' })
          .setLngLat([p.lon, p.lat])
          .setPopup(new mapboxgl.Popup({ offset: 24 }).setHTML(
            `<strong>${escapar(p.nombre)}</strong>` +
            (p.valor ? `<br><span style="color:#059669;font-weight:700">${escapar(p.valor)}</span>` : '') +
            (p.descripcion ? `<br><span style="color:#64748b">${escapar(p.descripcion)}</span>` : '')
          ))
          .addTo(mapa);
        marca.getElement().addEventListener('click', () => setElegido(i));
      }

      // Encuadre automático: con cinco puntos repartidos por España, dejar el
      // zoom fijo del primero escondería los otros cuatro.
      if (puntos.length > 1) {
        const caja2 = new mapboxgl.LngLatBounds();
        for (const p of puntos) caja2.extend([p.lon, p.lat]);
        mapa.fitBounds(caja2, { padding: 60, maxZoom: 9, duration: 0 });
      }
    } catch {
      setSinMapa(true);
    }
    return () => { mapa?.remove(); };
  }, [puntos]);

  // SIN CLAVE DE MAPBOX SE ENSEÑA LA LISTA, no un hueco gris. Los datos son
  // los mismos y siguen sirviendo: el mapa es una forma de verlos, no el dato.
  if (sinMapa) {
    return (
      <div className="p-4">
        <p className="text-[11px] text-slate-400 mb-3">
          El mapa no está disponible aquí, pero estos son los {puntos.length} puntos:
        </p>
        <Lista puntos={puntos} unidad={unidad} elegido={elegido} onElegir={setElegido} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row">
      <div ref={caja} className="flex-1 min-h-[45vh]" />
      {/* La lista al lado: un punto en un mapa sin su nombre escrito obliga a
          pinchar uno por uno para saber qué hay. */}
      <div className="md:w-72 shrink-0 border-t md:border-t-0 md:border-l border-slate-200 overflow-y-auto p-3 bg-white">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2 inline-flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {puntos.length} {puntos.length === 1 ? 'punto' : 'puntos'}
          {unidad ? ` · ${unidad}` : ''}
        </p>
        <Lista puntos={puntos} unidad={unidad} elegido={elegido} onElegir={setElegido} />
      </div>
    </div>
  );
}

function Lista({ puntos, elegido, onElegir }: {
  puntos: Punto[]; unidad?: string; elegido: number | null; onElegir: (i: number) => void;
}) {
  return (
    <ul className="space-y-1">
      {puntos.map((p, i) => (
        <li key={i}>
          <button
            onClick={() => onElegir(i)}
            className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${
              elegido === i ? 'bg-emerald-50 ring-1 ring-emerald-300' : 'hover:bg-slate-50'}`}
          >
            <span className="block text-xs font-bold text-slate-800 truncate">{p.nombre}</span>
            {p.valor && <span className="block text-[11px] font-bold text-emerald-700">{p.valor}</span>}
            <span className="block text-[10px] text-slate-400 tabular-nums">
              {p.lat.toFixed(4)}, {p.lon.toFixed(4)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** El nombre lo escribe una persona (o una IA) y acaba dentro de un popup en
 *  HTML: se escapa antes de meterlo ahí. */
const escapar = (t: string) =>
  String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

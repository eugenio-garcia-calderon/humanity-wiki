import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { mapService, MapFeature, TerritoryObjectives } from '../services/MapService';
import { mapDataProvider } from '../services/MapDataProvider';
import { createRoot } from 'react-dom/client';
import { Droplet, Wheat, Home, Heart, Users, Leaf } from 'lucide-react';

const MAPBOX_TOKEN = (import.meta as any).env.VITE_MAPBOX_TOKEN;
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

export type ObjectiveKey = keyof TerritoryObjectives;

interface HumanityMapProps {
  onFeatureClick?: (id: string, type: string) => void;
  onMapDoubleClick?: (lngLat: mapboxgl.LngLat) => void;
  onMapClick?: () => void;
  shouldReload?: boolean;
  activeObjective: ObjectiveKey;
  activeChallenge: string | null;
}

function getColorForScore(score: number): string {
  if (score >= 95) return '#14532d'; // green-900
  if (score >= 90) return '#166534'; // green-800
  if (score >= 85) return '#15803d'; // green-700
  if (score >= 80) return '#16a34a'; // green-600
  if (score >= 75) return '#22c55e'; // green-500
  if (score >= 70) return '#ca8a04'; // yellow-600
  if (score >= 65) return '#eab308'; // yellow-500
  if (score >= 50) return '#facc15'; // yellow-400
  if (score >= 30) return '#f97316'; // orange-500
  if (score >= 10) return '#b45309'; // amber-700
  return '#78350f'; // amber-900
}

function TooltipContent({ feature }: { feature: MapFeature }) {
  const { objectives } = feature;
  
  const items = [
    { key: 'agua', label: 'Agua', icon: Droplet, score: objectives.agua },
    { key: 'alimentacion', label: 'Alim.', icon: Wheat, score: objectives.alimentacion },
    { key: 'vivienda', label: 'Viv.', icon: Home, score: objectives.vivienda },
    { key: 'salud', label: 'Salud', icon: Heart, score: objectives.salud },
    { key: 'convivencia', label: 'Conv.', icon: Users, score: objectives.convivencia },
    { key: 'ecosistemas', label: 'Ecos.', icon: Leaf, score: objectives.ecosistemas },
  ];
  
  return (
    <div className="p-3 bg-white rounded-xl shadow-xl border border-slate-100 font-sans z-50 relative w-max">
      <div className="font-bold text-slate-800 text-sm mb-3 border-b border-slate-100 pb-2 flex justify-between items-center gap-6">
        <span>{feature.name}</span>
        <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
          Media 
          <span className="text-sm font-black" style={{ color: getColorForScore(objectives.overall) }}>
            {objectives.overall}%
          </span>
        </div>
      </div>
      <div className="flex flex-row gap-3">
        {items.map(item => {
          const Icon = item.icon;
          const color = getColorForScore(item.score);
          return (
            <div key={item.key} className="flex flex-col items-center">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm"
                style={{ backgroundColor: color }}
              >
                {item.score}%
              </div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500 mt-1 flex items-center gap-0.5">
                <Icon className="w-3 h-3" />
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function HumanityMap({ onFeatureClick, onMapDoubleClick, onMapClick, shouldReload, activeObjective, activeChallenge }: HumanityMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [zoom, setZoom] = useState(2.4);
  const [tokenError, setTokenError] = useState(!MAPBOX_TOKEN);
  const [mapError, setMapError] = useState<string | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupsRef = useRef<mapboxgl.Popup[]>([]);
  const hoveredPolygonIdRef = useRef<string | null>(null);
  const mapPopupRef = useRef<mapboxgl.Popup | null>(null);
  const mapFeaturesRef = useRef<MapFeature[]>([]);

  const onFeatureClickRef = useRef(onFeatureClick);
  useEffect(() => { onFeatureClickRef.current = onFeatureClick; }, [onFeatureClick]);

  // Initialize Mapbox
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;

    let resizeObserver: ResizeObserver | null = null;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [15, 25],
        zoom: zoom,
        doubleClickZoom: false
      });

      if (!mapPopupRef.current) {
        mapPopupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: 'custom-popup',
          anchor: 'top'
        });
      }

      map.current.on('style.load', () => {
        const layers = map.current!.getStyle().layers;
        if (layers) {
          for (const layer of layers) {
            if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
              map.current!.setLayoutProperty(layer.id, 'visibility', 'none');
            }
          }
        }
        
        // Add sources and layers for polygon rendering
        map.current!.addSource('planets', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.current!.addLayer({
          id: 'planets-fill',
          type: 'fill',
          source: 'planets',
          minzoom: 0,
          maxzoom: 2.5,
          paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.75 }
        });
        map.current!.addLayer({
          id: 'planets-line',
          type: 'line',
          source: 'planets',
          minzoom: 0,
          maxzoom: 2.5,
          paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-opacity': 0.8 }
        });

        map.current!.addSource('continents', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.current!.addLayer({
          id: 'continents-fill',
          type: 'fill',
          source: 'continents',
          minzoom: 2.5,
          maxzoom: 3.5,
          paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.75 }
        });
        map.current!.addLayer({
          id: 'continents-line',
          type: 'line',
          source: 'continents',
          minzoom: 2.5,
          maxzoom: 3.5,
          paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-opacity': 0.8 }
        });
        
        map.current!.addSource('countries', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.current!.addLayer({
          id: 'countries-fill',
          type: 'fill',
          source: 'countries',
          minzoom: 3.5,
          maxzoom: 4.5,
          paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.75 }
        });
        map.current!.addLayer({
          id: 'countries-line',
          type: 'line',
          source: 'countries',
          minzoom: 3.5,
          maxzoom: 4.5,
          paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-opacity': 0.8 }
        });

        map.current!.addSource('regions', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.current!.addLayer({
          id: 'regions-fill',
          type: 'fill',
          source: 'regions',
          minzoom: 4.5,
          paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.75 }
        });
        map.current!.addLayer({
          id: 'regions-line',
          type: 'line',
          source: 'regions',
          minzoom: 4.5,
          paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-opacity': 0.8 }
        });

        const handleMouseMove = (e: mapboxgl.MapMouseEvent & any) => {
          if (e.features && e.features.length > 0) {
            map.current!.getCanvas().style.cursor = 'pointer';
            const tid = e.features[0].properties.territoryId || e.features[0].properties.id;
            
            if (hoveredPolygonIdRef.current !== tid) {
              hoveredPolygonIdRef.current = tid;
              let feat = mapFeaturesRef.current.find(f => f.id === tid);
              if (!feat && e.features[0].properties) {
                const props = e.features[0].properties;
                let objs = props.objectives;
                if (typeof objs === 'string') {
                  try { objs = JSON.parse(objs); } catch (e) { objs = null; }
                }
                feat = {
                  id: tid,
                  name: props.name || tid,
                  type: props.type || 'region',
                  description: props.description || '',
                  coordinates: [e.lngLat.lng, e.lngLat.lat],
                  objectives: objs || { agua: 50, alimentacion: 50, vivienda: 50, salud: 50, convivencia: 50, ecosistemas: 50, overall: 50 },
                  challenges: []
                };
              }
              if (feat && mapPopupRef.current) {
                mapPopupRef.current.setLngLat([e.lngLat.lng, e.lngLat.lat]);
                const popupNode = document.createElement('div');
                const root = createRoot(popupNode);
                root.render(<TooltipContent feature={feat} />);
                mapPopupRef.current.setDOMContent(popupNode);
              }
            }
            
            if (mapPopupRef.current && !mapPopupRef.current.isOpen()) {
              mapPopupRef.current.addTo(map.current!);
            }
          }
        };

        const handleMouseLeave = () => {
          map.current!.getCanvas().style.cursor = '';
          if (mapPopupRef.current) mapPopupRef.current.remove();
          hoveredPolygonIdRef.current = null;
        };

        const handleClick = (e: mapboxgl.MapMouseEvent & any, type: string) => {
          if (e.features && e.features.length > 0) {
            const id = e.features[0].properties.territoryId || e.features[0].properties.id;
            if (id && onFeatureClickRef.current) {
              onFeatureClickRef.current(id, type);
            }
          }
        };

        map.current!.on('mousemove', 'planets-fill', handleMouseMove);
        map.current!.on('mouseleave', 'planets-fill', handleMouseLeave);
        map.current!.on('click', 'planets-fill', (e) => handleClick(e, 'planet'));

        map.current!.on('mousemove', 'continents-fill', handleMouseMove);
        map.current!.on('mouseleave', 'continents-fill', handleMouseLeave);
        map.current!.on('click', 'continents-fill', (e) => handleClick(e, 'continent'));
        
        map.current!.on('mousemove', 'countries-fill', handleMouseMove);
        map.current!.on('mouseleave', 'countries-fill', handleMouseLeave);
        map.current!.on('click', 'countries-fill', (e) => handleClick(e, 'country'));

        map.current!.on('mousemove', 'regions-fill', handleMouseMove);
        map.current!.on('mouseleave', 'regions-fill', handleMouseLeave);
        map.current!.on('click', 'regions-fill', (e) => handleClick(e, 'region'));
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('zoomend', () => {
        if (map.current) {
          setZoom(map.current.getZoom());
        }
      });

      map.current.on('moveend', () => {
        if (map.current) {
          setZoom(map.current.getZoom());
        }
      });

      map.current.on('click', (e) => { 
        const features = map.current!.queryRenderedFeatures(e.point, { layers: ['planets-fill', 'continents-fill', 'countries-fill', 'regions-fill'] });
        if (features.length === 0 && onMapClick) {
          onMapClick();
        }
      });
      
      map.current.on('dblclick', (e) => {
        if (onMapDoubleClick) onMapDoubleClick(e.lngLat);
      });
      
      map.current.on('error', (e) => {
        console.error("Mapbox error event:", e);
        if (e.error && e.error.message) {
          setMapError(e.error.message);
        }
      });
      
      resizeObserver = new ResizeObserver(() => {
        if (map.current) {
          map.current.resize();
        }
      });
      resizeObserver.observe(mapContainer.current);

    } catch (e: any) {
      console.error("Error initializing Mapbox:", e);
      setMapError(e.message || "Error initializing Mapbox");
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // PostGIS Viewport Data Fetching & Layer Updates
  useEffect(() => {
    if (!map.current) return;

    const loadPostGISViewportData = async () => {
      try {
        const bounds = map.current?.getBounds();
        const bbox: [number, number, number, number] | undefined = bounds ? [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth()
        ] : undefined;

        const currentZoom = map.current?.getZoom() || zoom;

        const [polygonsGeo, centroidsGeo] = await Promise.all([
          mapDataProvider.getTerritoryPolygonsInViewport({ bbox, zoom: currentZoom }),
          mapDataProvider.getTerritoriesInViewport({ bbox, zoom: currentZoom, activeObjective, activeChallenge })
        ]);

        // Convert centroid features to MapFeature array
        const mapFeatures: MapFeature[] = (centroidsGeo.features || []).map((f: any) => ({
          id: f.properties.id,
          name: f.properties.name,
          type: f.properties.type,
          description: f.properties.description,
          coordinates: f.geometry.coordinates as [number, number],
          objectives: f.properties.objectives || { agua: 50, alimentacion: 50, vivienda: 50, salud: 50, convivencia: 50, ecosistemas: 50, overall: 50 },
          challenges: f.properties.challenges || []
        }));

        const filteredFeatures = mapFeatures.filter(f => {
          if (!activeChallenge) return true;
          return f.challenges.includes(activeChallenge);
        });

        mapFeaturesRef.current = filteredFeatures;

        const activePolygonIds = new Set<string>();

        // Group polygons by layer source
        const sourceDataMap: Record<string, any[]> = {
          planets: [],
          continents: [],
          countries: [],
          regions: []
        };

        (polygonsGeo.features || []).forEach((feature: any) => {
          const tid = feature.properties.territoryId || feature.properties.id;
          const feat = filteredFeatures.find(ff => ff.id === tid);
          const objs = feat ? feat.objectives : feature.properties?.objectives;
          const score = objs ? (objs[activeObjective] ?? 50) : 50;
          const fillColor = getColorForScore(score);

          const styledFeature = {
            ...feature,
            properties: {
              ...feature.properties,
              territoryId: tid,
              fill: fillColor
            }
          };

          const type = feature.properties.type;
          if (type === 'planet') sourceDataMap.planets.push(styledFeature);
          else if (type === 'continent') sourceDataMap.continents.push(styledFeature);
          else if (type === 'country') sourceDataMap.countries.push(styledFeature);
          else sourceDataMap.regions.push(styledFeature);

          activePolygonIds.add(tid);
        });

        // Set Mapbox source data directly from PostGIS
        if (map.current.getSource('planets')) {
          (map.current.getSource('planets') as mapboxgl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: sourceDataMap.planets
          });
        }
        if (map.current.getSource('continents')) {
          (map.current.getSource('continents') as mapboxgl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: sourceDataMap.continents
          });
        }
        if (map.current.getSource('countries')) {
          (map.current.getSource('countries') as mapboxgl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: sourceDataMap.countries
          });
        }
        if (map.current.getSource('regions')) {
          (map.current.getSource('regions') as mapboxgl.GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: sourceDataMap.regions
          });
        }

        // Clean up old markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
        popupsRef.current.forEach(p => p.remove());
        popupsRef.current = [];

        // Render Centroid Markers
        filteredFeatures.forEach(feature => {
          const isPolygon = activePolygonIds.has(feature.id);
          const score = feature.objectives[activeObjective];
          const color = getColorForScore(score);
          
          let finalColor = color;
          let dotBorder = 'border-white';
          if (feature.objectives.overall === 0) {
            finalColor = '#f8fafc';
            dotBorder = 'border-slate-300';
          }
          
          const el = document.createElement('div');
          el.className = 'custom-mapbox-marker relative flex flex-col items-center justify-center z-10 group';
          if (!isPolygon) {
            el.className += ' cursor-pointer w-12 h-12';
          } else {
            el.className += ' pointer-events-none';
          }
          
          if (!isPolygon) {
            const dot = document.createElement('div');
            dot.className = `w-5 h-5 rounded-full shadow-md border-2 ${dotBorder} transition-transform group-hover:scale-125 absolute top-2`;
            dot.style.backgroundColor = finalColor;
            el.appendChild(dot);
          }
          
          const label = document.createElement('div');
          label.className = 'bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-800 shadow-sm pointer-events-none whitespace-nowrap transition-transform group-hover:scale-110';
          if (!isPolygon) {
            label.className += ' absolute top-8';
          }
          label.textContent = feature.name;
          el.appendChild(label);

          if (!isPolygon) {
            el.addEventListener('mouseenter', () => {
              if (map.current) {
                popupsRef.current.forEach(p => p.remove());
                popupsRef.current = [];
                if (mapPopupRef.current) mapPopupRef.current.remove();
                hoveredPolygonIdRef.current = null;
                
                const popupNode = document.createElement('div');
                const root = createRoot(popupNode);
                root.render(<TooltipContent feature={feature} />);
                
                const popup = new mapboxgl.Popup({
                  offset: 15,
                  closeButton: false,
                  closeOnClick: false,
                  className: 'custom-popup',
                  anchor: 'top'
                }).setDOMContent(popupNode);
                
                popup.setLngLat(feature.coordinates).addTo(map.current);
                popupsRef.current.push(popup);
                (el as any)._activePopup = popup;
              }
            });
            
            el.addEventListener('mouseleave', () => {
              if ((el as any)._activePopup) {
                (el as any)._activePopup.remove();
                (el as any)._activePopup = null;
              }
            });

            el.addEventListener('click', (e) => {
              e.stopPropagation();
              if (onFeatureClickRef.current) onFeatureClickRef.current(feature.id, feature.type);
            });
          }

          const marker = new mapboxgl.Marker(el)
            .setLngLat(feature.coordinates)
            .addTo(map.current!);
            
          markersRef.current.push(marker);
        });

      } catch (err) {
        console.error("Error loading PostGIS viewport data:", err);
      }
    };

    const timer = setTimeout(loadPostGISViewportData, 150);
    return () => clearTimeout(timer);
  }, [zoom, shouldReload, activeObjective, activeChallenge]);

  // CSS for custom popup
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .custom-popup { pointer-events: none; }
      .custom-popup .mapboxgl-popup-content {
        padding: 0;
        background: transparent;
        box-shadow: none;
        border-radius: 12px;
      }
      .custom-popup .mapboxgl-popup-tip {
        display: none;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  if (tokenError) {
    return (
      <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <h3 className="font-bold text-slate-800 text-lg mb-1">Falta el token de Mapbox</h3>
        <p className="text-slate-600 text-sm max-w-md">
          El mapa no puede cargar porque <strong>VITE_MAPBOX_TOKEN</strong> no está disponible.
        </p>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <h3 className="font-bold text-slate-800 text-lg mb-1">Error al cargar Mapbox</h3>
        <p className="text-slate-600 text-sm max-w-md">{mapError}</p>
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-full bg-slate-100" />;
}

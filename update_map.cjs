const fs = require('fs');
let code = fs.readFileSync('src/components/HumanityMap.tsx', 'utf8');

// 1. Add state
code = code.replace(
  'const [continentsGeo, setContinentsGeo] = useState<any>(null);',
  'const [planetGeo, setPlanetGeo] = useState<any>(null);\n  const [continentsGeo, setContinentsGeo] = useState<any>(null);'
);

// 2. Fetch planet.json
code = code.replace(
  "fetch('/geo/continents.json')",
  "fetch('/geo/planet.json').then(r => r.json()).then(setPlanetGeo).catch(e => console.error(e));\n    fetch('/geo/continents.json')"
);

// 3. Map check effect
code = code.replace(
  'if (!map.current || !continentsGeo || !countriesGeo || !regionsGeo) return;',
  'if (!map.current || !planetGeo || !continentsGeo || !countriesGeo || !regionsGeo) return;'
);
code = code.replace(
  '}, [zoom, shouldReload, activeObjective, activeChallenge, countriesGeo, regionsGeo]);',
  '}, [zoom, shouldReload, activeObjective, activeChallenge, planetGeo, continentsGeo, countriesGeo, regionsGeo]);'
);

// 4. Layers
const planetsLayers = `
        map.current!.addSource('planets', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.current!.addLayer({
          id: 'planets-fill',
          type: 'fill',
          source: 'planets',
          minzoom: 0,
          maxzoom: 2.0,
          paint: {
            'fill-color': ['get', 'fill'],
            'fill-opacity': 0.75
          }
        });
        map.current!.addLayer({
          id: 'planets-line',
          type: 'line',
          source: 'planets',
          minzoom: 0,
          maxzoom: 2.0,
          paint: {
            'line-color': '#ffffff',
            'line-width': 2,
            'line-opacity': 0.8
          }
        });
`;
code = code.replace(
  "map.current!.addSource('continents'",
  planetsLayers + "\n        map.current!.addSource('continents'"
);
code = code.replace(
  "minzoom: 0,\n          maxzoom: 3.5,\n          paint: {\n            'fill-color': ['get', 'fill']",
  "minzoom: 2.0,\n          maxzoom: 3.5,\n          paint: {\n            'fill-color': ['get', 'fill']"
);
code = code.replace(
  "minzoom: 0,\n          maxzoom: 3.5,\n          paint: {\n            'line-color': '#ffffff'",
  "minzoom: 2.0,\n          maxzoom: 3.5,\n          paint: {\n            'line-color': '#ffffff'"
);

// 5. Events
const planetsEvents = `
        map.current!.on('mousemove', 'planets-fill', handleMouseMove);
        map.current!.on('mouseleave', 'planets-fill', handleMouseLeave);
        map.current!.on('click', 'planets-fill', (e) => handleClick(e, 'planet'));
`;
code = code.replace(
  "map.current!.on('mousemove', 'continents-fill', handleMouseMove);",
  planetsEvents + "\n        map.current!.on('mousemove', 'continents-fill', handleMouseMove);"
);
code = code.replace(
  "layers: ['continents-fill', 'countries-fill', 'regions-fill']",
  "layers: ['planets-fill', 'continents-fill', 'countries-fill', 'regions-fill']"
);

// 6. Logic
code = code.replace(
  "const hasRegions = zoom >= 4.5;",
  "const hasRegions = zoom >= 4.5;\n        const hasPlanets = zoom < 2.0;"
);
code = code.replace(
  "const hasContinents = zoom < 3.5;",
  "const hasContinents = zoom >= 2.0 && zoom < 3.5;"
);

const planetsData = `
        if (map.current?.getSource('planets') && planetGeo) {
           const data = { type: 'FeatureCollection', features: [] as any[] };
           if (hasPlanets) {
             data.features = planetGeo.features.map((f: any) => {
               const tid = f.properties.territoryId;
               const feat = filteredFeatures.find((ff: any) => ff.id === tid);
               if (feat) {
                 activePolygonIds.add(tid);
                 return {
                   ...f,
                   properties: {
                     ...f.properties,
                     fill: getColorForScore(feat.objectives[activeObjective])
                   }
                 };
               }
               return null;
             }).filter(Boolean);
           }
           (map.current.getSource('planets') as mapboxgl.GeoJSONSource).setData(data as any);
        }
`;
code = code.replace(
  "if (map.current?.getSource('continents') && continentsGeo) {",
  planetsData + "\n        if (map.current?.getSource('continents') && continentsGeo) {"
);

// 7. Markers
const skipPlanet = `
          const isPlanetWithPolygon = planetGeo?.features.some((f: any) => f.properties.territoryId === feature.id);
          if (hasContinents && feature.type === 'planet' && isPlanetWithPolygon) {
            return; // Skip planet marker
          }
`;
code = code.replace(
  "const isCountryWithPolygon = countriesGeo?.features.some((f: any) => f.properties.territoryId === feature.id);",
  "const isCountryWithPolygon = countriesGeo?.features.some((f: any) => f.properties.territoryId === feature.id);" + skipPlanet
);

fs.writeFileSync('src/components/HumanityMap.tsx', code);

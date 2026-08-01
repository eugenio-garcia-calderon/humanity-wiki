const fs = require('fs');
let code = fs.readFileSync('src/components/HumanityMap.tsx', 'utf8');

// 1. Add continentsGeo state
code = code.replace(
  "const [countriesGeo, setCountriesGeo] = useState<any>(null);",
  "const [continentsGeo, setContinentsGeo] = useState<any>(null);\n  const [countriesGeo, setCountriesGeo] = useState<any>(null);"
);

// 2. Fetch continents.json
code = code.replace(
  "fetch('/geo/countries.json').then(r => r.json()).then(setCountriesGeo).catch(e => console.error(e));",
  "fetch('/geo/continents.json').then(r => r.json()).then(setContinentsGeo).catch(e => console.error(e));\n    fetch('/geo/countries.json').then(r => r.json()).then(setCountriesGeo).catch(e => console.error(e));"
);

// 3. Wait for continentsGeo in useEffect
code = code.replace(
  "if (!map.current || !countriesGeo || !regionsGeo) return;",
  "if (!map.current || !continentsGeo || !countriesGeo || !regionsGeo) return;"
);

// 4. Add layer and source for continents in map.on('style.load')
const mapAddSourceStr = `map.current!.addSource('countries', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });`;
const continentsSourceStr = `
        map.current!.addSource('continents', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.current!.addLayer({
          id: 'continents-fill',
          type: 'fill',
          source: 'continents',
          minzoom: 0,
          maxzoom: 3.5,
          paint: {
            'fill-color': ['get', 'fill'],
            'fill-opacity': 0.75
          }
        });
        map.current!.addLayer({
          id: 'continents-line',
          type: 'line',
          source: 'continents',
          minzoom: 0,
          maxzoom: 3.5,
          paint: {
            'line-color': '#ffffff',
            'line-width': 2,
            'line-opacity': 0.8
          }
        });
        
        map.current!.addSource('countries', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
`;
code = code.replace(mapAddSourceStr, continentsSourceStr);

// 5. Update minzoom/maxzoom for countries and regions
// Replace countries-fill minzoom and maxzoom
code = code.replace(
  "id: 'countries-fill',\n          type: 'fill',\n          source: 'countries',",
  "id: 'countries-fill',\n          type: 'fill',\n          source: 'countries',\n          minzoom: 3.5,\n          maxzoom: 4.5,"
);
code = code.replace(
  "id: 'countries-line',\n          type: 'line',\n          source: 'countries',",
  "id: 'countries-line',\n          type: 'line',\n          source: 'countries',\n          minzoom: 3.5,\n          maxzoom: 4.5,"
);

code = code.replace(
  "id: 'regions-fill',\n          type: 'fill',\n          source: 'regions',",
  "id: 'regions-fill',\n          type: 'fill',\n          source: 'regions',\n          minzoom: 4.5,"
);
code = code.replace(
  "id: 'regions-line',\n          type: 'line',\n          source: 'regions',",
  "id: 'regions-line',\n          type: 'line',\n          source: 'regions',\n          minzoom: 4.5,"
);

// 6. Add event listeners for continents
const countriesEvents = `map.current!.on('mousemove', 'countries-fill', handleMouseMove);`;
const continentsEvents = `
        map.current!.on('mousemove', 'continents-fill', handleMouseMove);
        map.current!.on('mouseleave', 'continents-fill', handleMouseLeave);
        map.current!.on('click', 'continents-fill', (e) => handleClick(e, 'continent'));
        
        map.current!.on('mousemove', 'countries-fill', handleMouseMove);
`;
code = code.replace(countriesEvents, continentsEvents);

// 7. Update queryRenderedFeatures for generic click
code = code.replace(
  "const features = map.current!.queryRenderedFeatures(e.point, { layers: ['countries-fill', 'regions-fill'] });",
  "const features = map.current!.queryRenderedFeatures(e.point, { layers: ['continents-fill', 'countries-fill', 'regions-fill'] });"
);

// 8. Add continents data update in loadFeatures
// Find hasRegions definition
code = code.replace(
  "const hasRegions = zoom >= 4.5;",
  "const hasRegions = zoom >= 4.5;\n        const hasCountries = zoom >= 3.5 && zoom < 4.5;\n        const hasContinents = zoom < 3.5;"
);

// We need to replace the countries condition
code = code.replace(
  "if (!hasRegions) {",
  "if (hasCountries) {"
);

const continentsDataUpdate = `
        if (map.current?.getSource('continents') && continentsGeo) {
           const data = { type: 'FeatureCollection', features: [] as any[] };
           if (hasContinents) {
             data.features = continentsGeo.features.map((f: any) => {
               const tid = f.properties.territoryId;
               const feat = filteredFeatures.find(ff => ff.id === tid);
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
           (map.current.getSource('continents') as mapboxgl.GeoJSONSource).setData(data as any);
        }
`;

// Insert before countries data update
code = code.replace(
  "if (map.current?.getSource('countries') && countriesGeo) {",
  continentsDataUpdate + "\n        if (map.current?.getSource('countries') && countriesGeo) {"
);

// Prevent rendering duplicate marker for continents
code = code.replace(
  "const isCountryWithPolygon = countriesGeo?.features.some((f: any) => f.properties.territoryId === feature.id);",
  "const isCountryWithPolygon = countriesGeo?.features.some((f: any) => f.properties.territoryId === feature.id);\n          const isContinentWithPolygon = continentsGeo?.features.some((f: any) => f.properties.territoryId === feature.id);"
);

code = code.replace(
  "if (hasRegions && feature.type === 'country' && isCountryWithPolygon) {\n            return; // Skip country marker (like Spain) when we are zoomed in and showing regions\n          }",
  `if (hasRegions && feature.type === 'country' && isCountryWithPolygon) {
            return; // Skip country marker (like Spain) when we are zoomed in and showing regions
          }
          if (hasCountries && feature.type === 'continent' && isContinentWithPolygon) {
            return; // Skip continent marker
          }
          if (hasContinents && feature.type === 'continent' && isContinentWithPolygon) {
            // Wait, if it has continents, we also want to skip the point marker, because the polygon is showing!
            // Wait, actually if ANY polygon is active, we skip the marker later via isPolygon.
            // Oh, look below:
          }`
);

fs.writeFileSync('src/components/HumanityMap.tsx', code);

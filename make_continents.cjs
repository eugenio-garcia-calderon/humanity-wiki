const fs = require('fs');
const world = JSON.parse(fs.readFileSync('world.geojson', 'utf8'));

const continentMap = {
  'Europe': 'T002',
  'Africa': 'T010',
  'South America': 'T006',
  'North America': 'T006' // treating all LatAm / Americas as T006 for this example if needed, but let's stick to Europe and Africa as requested
};

const features = world.features
  .filter(f => ['Europe', 'Africa'].includes(f.properties.continent))
  .map(f => {
    return {
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        name: f.properties.continent === 'Europe' ? 'Europa' : 'África',
        territoryId: continentMap[f.properties.continent]
      }
    };
  });

fs.writeFileSync('public/geo/continents.json', JSON.stringify({
  type: 'FeatureCollection',
  features: features
}));

// Regenerates public/geo/continents.json from world.geojson.
// Run from anywhere: node scripts/geo/make_continents.cjs
const fs = require('fs');
const path = require('path');

const here = __dirname;
const repoRoot = path.resolve(here, '../..');

const world = JSON.parse(fs.readFileSync(path.join(here, 'world.geojson'), 'utf8'));

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

fs.writeFileSync(path.join(repoRoot, 'public/geo/continents.json'), JSON.stringify({
  type: 'FeatureCollection',
  features: features
}));

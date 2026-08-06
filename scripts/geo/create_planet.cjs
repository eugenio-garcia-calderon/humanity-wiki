// Regenerates public/geo/planet.json by dissolving continents.json into one
// MultiPolygon. Run make_continents.cjs first.
// Run from anywhere: node scripts/geo/create_planet.cjs
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');

const continents = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public/geo/continents.json'), 'utf8'));
const planet = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { territoryId: "T001", name: "Mundo" },
      geometry: {
        type: "MultiPolygon",
        coordinates: continents.features.map(f => {
          if (f.geometry.type === "Polygon") {
            return [f.geometry.coordinates];
          } else if (f.geometry.type === "MultiPolygon") {
            return f.geometry.coordinates;
          }
          return [];
        }).flat()
      }
    }
  ]
};
fs.writeFileSync(path.join(repoRoot, 'public/geo/planet.json'), JSON.stringify(planet));

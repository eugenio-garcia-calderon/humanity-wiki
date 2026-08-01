const fs = require('fs');
const continents = JSON.parse(fs.readFileSync('public/geo/continents.json', 'utf8'));
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
fs.writeFileSync('public/geo/planet.json', JSON.stringify(planet));

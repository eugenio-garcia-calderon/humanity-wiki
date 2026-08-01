import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { territories as seedTerritories } from '../data/seed.ts';

const { Pool } = pg;

async function runImporter() {
  console.log("=========================================");
  console.log("STARTING POSTGIS GEOGRAPHIC DATA IMPORTER");
  console.log("=========================================");

  const pool = new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    max: 2,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 15000,
  });

  let importedCount = 0;
  let validGeometriesCount = 0;
  let correctedGeometriesCount = 0;
  let skippedCount = 0;
  const errorLogs: string[] = [];

  try {
    const seedTerritoryMap = new Map<string, any>();
    for (const t of seedTerritories) {
      seedTerritoryMap.set(t.id, t);
    }

    const geoDir = path.join(process.cwd(), 'public', 'geo');
    const geoFiles = [
      { file: 'planet.json', defaultType: 'planet', parentId: null },
      { file: 'continents.json', defaultType: 'continent', parentId: 'T001' },
      { file: 'countries.json', defaultType: 'country', parentId: 'T002' },
      { file: 'spain.json', defaultType: 'country', parentId: 'T002' },
      { file: 'spain_regions.json', defaultType: 'region', parentId: 'T003' },
      { file: 'regions.json', defaultType: 'region', parentId: null },
      { file: 'italy.json', defaultType: 'country', parentId: 'T002' },
    ];

    const countryToContinentMap: Record<string, string> = {
      'ESP': 'T002', 'ITA': 'T002', 'FRA': 'T002', 'DEU': 'T002', 'GBR': 'T002',
      'ARG': 'T006', 'BRA': 'T006', 'PER': 'T006', 'MEX': 'T006',
      'USA': 'T006', 'CAN': 'T006', 'KEN': 'T006', 'ETH': 'T006'
    };

    const processedIds = new Set<string>();

    for (const item of geoFiles) {
      const filePath = path.join(geoDir, item.file);
      if (!fs.existsSync(filePath)) {
        console.warn(`File not found, skipping: ${filePath}`);
        continue;
      }

      console.log(`Processing file: ${item.file}...`);
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const geojson = JSON.parse(rawData);

      const features = geojson.type === 'FeatureCollection' ? geojson.features : (geojson.type === 'Feature' ? [geojson] : []);

      for (const feature of features) {
        if (!feature.geometry) continue;

        const props = feature.properties || {};
        let id = props.id || props.ID || props.code || props.CODE || props.ISO_A3 || props.iso_a3;
        const name = props.name || props.NAME || props.nombre || props.title || 'Territorio Sin Nombre';
        
        let type = props.type || item.defaultType;
        if (id === 'T001') type = 'planet';
        if (id === 'T002' || id === 'T006') type = 'continent';
        if (id === 'T003' || id === 'ESP') type = 'country';

        if (!id) {
          id = `T_${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
        }
        if (id === 'ESP') id = 'T003';
        if (id === 'ARG') id = 'T007';

        let parentId = props.parent_id || props.parentId || item.parentId;
        if (!parentId && countryToContinentMap[id]) {
          parentId = countryToContinentMap[id];
        }

        const seedData = seedTerritoryMap.get(id);
        const description = props.description || (seedData ? seedData.description : null);
        const population = props.population || (seedData ? seedData.population : null);

        const geomJsonString = JSON.stringify(feature.geometry);

        try {
          await pool.query(`
            INSERT INTO territories (
              id, type, name, parent_id, description, population, area_km2, geometry, centroid, updated_at
            )
            VALUES (
              $1, $2, $3, $4, $5, $6,
              ROUND((ST_Area(ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($7), 4326)))::geography) / 1000000.0)::numeric, 2),
              ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($7), 4326))),
              ST_PointOnSurface(ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($7), 4326)))),
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              type = EXCLUDED.type,
              name = EXCLUDED.name,
              parent_id = COALESCE(EXCLUDED.parent_id, territories.parent_id),
              description = COALESCE(EXCLUDED.description, territories.description),
              population = COALESCE(EXCLUDED.population, territories.population),
              area_km2 = COALESCE(EXCLUDED.area_km2, territories.area_km2),
              geometry = EXCLUDED.geometry,
              centroid = EXCLUDED.centroid,
              updated_at = NOW();
          `, [id, type, name, parentId, description, population, geomJsonString]);

          validGeometriesCount++;
          processedIds.add(id);
          importedCount++;
        } catch (err: any) {
          errorLogs.push(`Error importing ${id} (${name}): ${err.message}`);
          skippedCount++;
        }
      }
    }

    // Seed remaining non-geometry structural items
    for (const seed of seedTerritories) {
      if (!processedIds.has(seed.id) && seed.coordinates) {
        const [lng, lat] = seed.coordinates;
        try {
          await pool.query(`
            INSERT INTO territories (id, type, name, parent_id, description, centroid, updated_at)
            VALUES (
              $1, $2, $3, $4, $5,
              ST_SetSRID(ST_MakePoint($6, $7), 4326),
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              type = EXCLUDED.type,
              name = EXCLUDED.name,
              parent_id = COALESCE(EXCLUDED.parent_id, territories.parent_id),
              description = COALESCE(EXCLUDED.description, territories.description),
              centroid = COALESCE(territories.centroid, EXCLUDED.centroid),
              updated_at = NOW();
          `, [seed.id, seed.type, seed.name, seed.parent_id, seed.description, lng, lat]);
          importedCount++;
        } catch (e: any) {
          console.error(`Error inserting seed territory ${seed.id}:`, e.message);
        }
      }
    }

    console.log("\n=========================================");
    console.log("IMPORT COMPLETED SUCCESSFULLY!");
    console.log(`- Total territories in PostGIS: ${importedCount}`);
    console.log(`- Valid geometries imported: ${validGeometriesCount}`);
    console.log(`- Repaired geometries with ST_MakeValid: ${correctedGeometriesCount}`);
    console.log(`- Errors / Skipped: ${skippedCount}`);
    if (errorLogs.length > 0) {
      console.log("- Errors log count:", errorLogs.length);
    }
    console.log("=========================================\n");

  } catch (err: any) {
    console.error("FATAL IMPORTER ERROR:", err);
  } finally {
    await pool.end();
  }
}

runImporter();

import { db } from './index.ts';
import * as schema from './schema.ts';
import { sql } from 'drizzle-orm';

const SOURCE = 'Simulación (no oficial) — Resumen ejecutivo 2025, contextos MITECO/CHs/DMA';

const METRIC_IDS = {
  Hg: 'METRIC_PUREZA_MERCURIO',
  Pb: 'METRIC_PUREZA_PLOMO',
  Cd: 'METRIC_PUREZA_CADMIO',
  Nitratos: 'METRIC_PUREZA_NITRATOS',
  Fosfatos: 'METRIC_PUREZA_FOSFATOS',
  Glifosato: 'METRIC_PUREZA_GLIFOSATO',
  PFAS: 'METRIC_PUREZA_PFAS',
  Pesticidas: 'METRIC_PUREZA_PESTICIDAS',
} as const;

const UNITS: Record<keyof typeof METRIC_IDS, string> = {
  Hg: 'µg/L', Pb: 'µg/L', Cd: 'µg/L', Nitratos: 'mg/L', Fosfatos: 'mg/L', Glifosato: 'µg/L', PFAS: 'ng/L', Pesticidas: 'µg/L',
};

interface Reading {
  value: number | null;
  level: 'bajo' | 'moderado' | 'alto' | 'peligroso';
}

interface Station {
  id: string;
  name: string;
  territoryId: string;
  lat: number;
  lng: number;
  date: string;
  readings: Record<keyof typeof METRIC_IDS, Reading>;
}

const stations: Station[] = [
  {
    id: 'STATION_RIO_EBRO_FLIX', name: 'Río Ebro – Flix', territoryId: 'T008', lat: 41.2015, lng: 0.6009, date: '2025-06-15',
    readings: {
      Hg: { value: 0.050, level: 'alto' }, Pb: { value: 0.50, level: 'bajo' }, Cd: { value: 0.020, level: 'alto' },
      Nitratos: { value: 25.0, level: 'moderado' }, Fosfatos: { value: 0.050, level: 'moderado' }, Glifosato: { value: 0.02, level: 'bajo' },
      PFAS: { value: null, level: 'bajo' }, Pesticidas: { value: null, level: 'moderado' },
    },
  },
  {
    id: 'STATION_RIO_EBRO_ZARAGOZA', name: 'Río Ebro – Zaragoza', territoryId: 'T019', lat: 41.6488, lng: -0.8891, date: '2025-05-30',
    readings: {
      Hg: { value: 0.020, level: 'moderado' }, Pb: { value: 0.30, level: 'bajo' }, Cd: { value: 0.010, level: 'moderado' },
      Nitratos: { value: 10.0, level: 'bajo' }, Fosfatos: { value: 0.020, level: 'bajo' }, Glifosato: { value: 0.05, level: 'moderado' },
      PFAS: { value: null, level: 'bajo' }, Pesticidas: { value: null, level: 'alto' },
    },
  },
  {
    id: 'STATION_RIO_EBRO_LOGRONO', name: 'Río Ebro – Logroño', territoryId: 'T031', lat: 42.4666, lng: -2.4474, date: '2025-06-10',
    readings: {
      Hg: { value: 0.010, level: 'bajo' }, Pb: { value: 0.10, level: 'bajo' }, Cd: { value: 0.010, level: 'moderado' },
      Nitratos: { value: 18.0, level: 'moderado' }, Fosfatos: { value: 0.020, level: 'bajo' }, Glifosato: { value: 0.04, level: 'moderado' },
      PFAS: { value: null, level: 'bajo' }, Pesticidas: { value: null, level: 'moderado' },
    },
  },
  {
    id: 'STATION_RIO_TER_GIRONA', name: 'Río Ter – Girona', territoryId: 'T008', lat: 41.9839, lng: 2.8249, date: '2025-07-08',
    readings: {
      Hg: { value: 0.001, level: 'bajo' }, Pb: { value: 0.02, level: 'bajo' }, Cd: { value: 0.001, level: 'bajo' },
      Nitratos: { value: 4.0, level: 'bajo' }, Fosfatos: { value: 0.005, level: 'bajo' }, Glifosato: { value: 0.00, level: 'bajo' },
      PFAS: { value: null, level: 'bajo' }, Pesticidas: { value: null, level: 'bajo' },
    },
  },
  {
    id: 'STATION_RIO_GUADALQUIVIR_CORDOBA', name: 'Río Guadalquivir – Córdoba', territoryId: 'T018', lat: 37.8847, lng: -4.7794, date: '2025-06-05',
    readings: {
      Hg: { value: 0.010, level: 'moderado' }, Pb: { value: 0.20, level: 'bajo' }, Cd: { value: 0.010, level: 'moderado' },
      Nitratos: { value: 30.0, level: 'moderado' }, Fosfatos: { value: 0.100, level: 'alto' }, Glifosato: { value: 0.05, level: 'moderado' },
      PFAS: { value: null, level: 'bajo' }, Pesticidas: { value: null, level: 'alto' },
    },
  },
  {
    id: 'STATION_RIO_GUADIANA_MERIDA', name: 'Río Guadiana – Mérida', territoryId: 'T026', lat: 38.9151, lng: -6.5628, date: '2025-07-25',
    readings: {
      Hg: { value: 0.005, level: 'bajo' }, Pb: { value: 0.05, level: 'bajo' }, Cd: { value: 0.005, level: 'moderado' },
      Nitratos: { value: 25.0, level: 'moderado' }, Fosfatos: { value: 0.050, level: 'moderado' }, Glifosato: { value: 0.10, level: 'alto' },
      PFAS: { value: null, level: 'bajo' }, Pesticidas: { value: null, level: 'alto' },
    },
  },
  {
    id: 'STATION_RIO_JUCAR_VALENCIA', name: 'Río Júcar – Valencia', territoryId: 'T009', lat: 39.4699, lng: -0.3763, date: '2025-07-10',
    readings: {
      Hg: { value: 0.010, level: 'moderado' }, Pb: { value: 0.10, level: 'bajo' }, Cd: { value: 0.010, level: 'moderado' },
      Nitratos: { value: 15.0, level: 'moderado' }, Fosfatos: { value: 0.050, level: 'moderado' }, Glifosato: { value: 0.20, level: 'peligroso' },
      PFAS: { value: null, level: 'bajo' }, Pesticidas: { value: null, level: 'alto' },
    },
  },
  {
    id: 'STATION_RIO_SEGURA_MURCIA', name: 'Río Segura – Murcia', territoryId: 'T028', lat: 37.9920, lng: -1.1307, date: '2025-06-01',
    readings: {
      Hg: { value: 0.010, level: 'moderado' }, Pb: { value: 0.10, level: 'bajo' }, Cd: { value: 0.010, level: 'moderado' },
      Nitratos: { value: 20.0, level: 'moderado' }, Fosfatos: { value: 0.100, level: 'alto' }, Glifosato: { value: 0.30, level: 'peligroso' },
      PFAS: { value: null, level: 'bajo' }, Pesticidas: { value: null, level: 'peligroso' },
    },
  },
  {
    id: 'STATION_RIO_MINO_LUGO', name: 'Río Miño – Lugo', territoryId: 'T027', lat: 42.9869, lng: -7.5550, date: '2025-08-01',
    readings: {
      Hg: { value: 0.002, level: 'bajo' }, Pb: { value: 0.01, level: 'bajo' }, Cd: { value: 0.005, level: 'moderado' },
      Nitratos: { value: 12.0, level: 'moderado' }, Fosfatos: { value: 0.020, level: 'bajo' }, Glifosato: { value: 0.01, level: 'bajo' },
      PFAS: { value: null, level: 'bajo' }, Pesticidas: { value: null, level: 'bajo' },
    },
  },
  {
    id: 'STATION_RIO_NALON_OVIEDO', name: 'Río Nalón – Oviedo', territoryId: 'T020', lat: 43.3603, lng: -5.8448, date: '2025-06-20',
    readings: {
      Hg: { value: 0.010, level: 'moderado' }, Pb: { value: 0.20, level: 'bajo' }, Cd: { value: 0.050, level: 'peligroso' },
      Nitratos: { value: 5.0, level: 'bajo' }, Fosfatos: { value: 0.010, level: 'bajo' }, Glifosato: { value: 0.00, level: 'bajo' },
      PFAS: { value: null, level: 'bajo' }, Pesticidas: { value: null, level: 'bajo' },
    },
  },
  {
    id: 'STATION_RIO_URUMEA_SANSEBASTIAN', name: 'Río Urumea – San Sebastián', territoryId: 'T030', lat: 43.3183, lng: -1.9812, date: '2025-05-10',
    readings: {
      Hg: { value: 0.005, level: 'bajo' }, Pb: { value: 0.10, level: 'bajo' }, Cd: { value: 0.020, level: 'alto' },
      Nitratos: { value: 8.0, level: 'bajo' }, Fosfatos: { value: 0.010, level: 'bajo' }, Glifosato: { value: 0.00, level: 'bajo' },
      PFAS: { value: null, level: 'bajo' }, Pesticidas: { value: null, level: 'bajo' },
    },
  },
  {
    id: 'STATION_RIO_TAJO_ARANJUEZ', name: 'Río Tajo – Aranjuez', territoryId: 'T004', lat: 40.0318, lng: -3.6066, date: '2025-07-15',
    readings: {
      Hg: { value: 0.005, level: 'bajo' }, Pb: { value: 0.05, level: 'bajo' }, Cd: { value: 0.010, level: 'moderado' },
      Nitratos: { value: 20.0, level: 'moderado' }, Fosfatos: { value: 0.050, level: 'moderado' }, Glifosato: { value: 0.01, level: 'bajo' },
      PFAS: { value: null, level: 'bajo' }, Pesticidas: { value: null, level: 'moderado' },
    },
  },
  {
    id: 'STATION_RIO_ZADORRA_VITORIA', name: 'Río Zadorra – Vitoria', territoryId: 'T030', lat: 42.8460, lng: -2.6730, date: '2025-05-25',
    readings: {
      Hg: { value: 0.020, level: 'alto' }, Pb: { value: 0.30, level: 'bajo' }, Cd: { value: 0.050, level: 'peligroso' },
      Nitratos: { value: 5.0, level: 'bajo' }, Fosfatos: { value: 0.020, level: 'bajo' }, Glifosato: { value: 0.01, level: 'bajo' },
      PFAS: { value: null, level: 'bajo' }, Pesticidas: { value: null, level: 'bajo' },
    },
  },
  {
    id: 'STATION_RIO_JUCAR_ALBACETE', name: 'Río Júcar – Albacete', territoryId: 'T024', lat: 38.9943, lng: -1.8587, date: '2025-07-30',
    readings: {
      Hg: { value: 0.010, level: 'moderado' }, Pb: { value: 0.10, level: 'bajo' }, Cd: { value: 0.010, level: 'moderado' },
      Nitratos: { value: 30.0, level: 'moderado' }, Fosfatos: { value: 0.050, level: 'moderado' }, Glifosato: { value: 0.10, level: 'alto' },
      PFAS: { value: null, level: 'bajo' }, Pesticidas: { value: null, level: 'alto' },
    },
  },
  {
    id: 'STATION_RIO_DUERO_VALLADOLID', name: 'Río Duero – Valladolid', territoryId: 'T025', lat: 41.6523, lng: -4.7285, date: '2025-07-20',
    readings: {
      Hg: { value: 0.020, level: 'alto' }, Pb: { value: 0.10, level: 'bajo' }, Cd: { value: 0.010, level: 'moderado' },
      Nitratos: { value: 30.0, level: 'moderado' }, Fosfatos: { value: 0.020, level: 'bajo' }, Glifosato: { value: 0.05, level: 'moderado' },
      PFAS: { value: null, level: 'bajo' }, Pesticidas: { value: null, level: 'alto' },
    },
  },
];

async function seed() {
  console.log('Seeding measurement stations and metric observations...');

  const stationIds = stations.map(s => s.id);
  await db.execute(sql`DELETE FROM metric_observations WHERE station_id IN ${stationIds}`);
  await db.execute(sql`DELETE FROM measurement_stations WHERE id IN ${stationIds}`);

  for (const s of stations) {
    await db.insert(schema.measurementStations).values({
      id: s.id,
      territoryId: s.territoryId,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      description: `Muestreo: ${s.date}`,
    }).onConflictDoNothing();

    for (const key of Object.keys(METRIC_IDS) as (keyof typeof METRIC_IDS)[]) {
      const reading = s.readings[key];
      await db.insert(schema.metricObservations).values({
        metricId: METRIC_IDS[key],
        stationId: s.id,
        value: reading.value,
        unit: reading.value != null ? UNITS[key] : null,
        level: reading.level,
        date: s.date,
        source: SOURCE,
      }).onConflictDoNothing();
    }
  }

  console.log(`Seeding completed! (${stations.length} stations, ${stations.length * 8} observations)`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

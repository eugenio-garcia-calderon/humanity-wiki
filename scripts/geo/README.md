# Geo artifact generators

Where two of the files in `public/geo/` come from. They are one-shot scripts:
the output is committed, so you only run them if the source data changes.

| Script | Reads | Writes |
|---|---|---|
| `make_continents.cjs` | `world.geojson` | `public/geo/continents.json` |
| `create_planet.cjs` | `public/geo/continents.json` | `public/geo/planet.json` |

Run in that order, from anywhere in the repo:

```bash
node scripts/geo/make_continents.cjs
node scripts/geo/create_planet.cjs
```

Both reproduce the committed files byte for byte as of 2026-08-06.

## What they actually produce

`continents.json` is **only Europe and Africa** (90 features, territory ids
`T002` and `T010`). The other continents were never generated. `world.geojson`
holds them all, so extending the filter in `make_continents.cjs` is the way in.

`planet.json` is a single `MultiPolygon` (`T001`, "Mundo") built by concatenating
every continent ring. It is a silhouette, not a dissolve: no rings are merged, so
internal borders exist in the data even though the map does not stroke them.

The rest of `public/geo/` (`countries`, `regions`, `spain*`, `italy`,
`madrid_municipios`, `incendios_espana`) has no generator here. Those were
sourced directly and are read by `src/db/import-geo.ts`.

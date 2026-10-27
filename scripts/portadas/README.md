# Cover generator (one-line drawings)

All covers of systems, objectives and Mobility indicators on luzhumanidad.com come from this code. They are
landscape SVGs 320×200 (16:10): thin navy ink `#23384d`, blue touches `#3b82c4`, light wash `#d4e6f5`, and a ground
line with a loop (`suelo(...)`). `referencia/` has contact sheets of what already exists: match that style.

- `arte.py`: shared pieces (people, houses, trees, hands, gears, coins, scales…) and `montaje()` for contact sheets.
- `piezas_mov.py`: transport pieces (bus, train, bike, traffic light, charger, speaker, bridge…).
- `obj_ind.py`: the 120 Mobility indicators, one drawing per code — the model to follow.
- `obj_a.py`: Water, Food, Coexistence and Culture objectives.
- `indicadores_pendientes.json`: the 1,440 indicators still without a cover (12 systems × 12 objectives × 10),
  with code, name, metric, unit, objective and page id.

Drawing: `python3 obj_xxx.py` writes `prev_xxx/<code>.svg` and `xxx_pN.html`; `./ver.sh xxx` renders the sheets with
headless Chrome (change the path in `render.sh` if Chrome lives elsewhere).

## How a cover reaches production

Uploaded covers live in the `uploads` volume (`/uploads/2026/10/…`), which needs SSH. Without SSH, commit the SVGs
to `public/portadas/indicadores/<code-lower>.svg` (served at `/portadas/indicadores/…`) and add a migration in
`drizzle/` that sets `knowledge_windows.config.portada` by joining on the indicator code
(`bd_filas.tabla_id = 'BDTMVOBDMUL001'`, code column `valores->>'BDCMVINCGM0000'`), bumping `version`, and only
where the page has no cover yet. `deploy/migrate.sh` applies it during the deploy.

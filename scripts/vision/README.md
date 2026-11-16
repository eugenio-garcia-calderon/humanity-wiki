# /vision content scripts

The ideal-vision site (`public/vision/`) is static. Its content was researched by agents and turned into
`public/vision/data.js` (12 sectors) and `public/vision/paises.js` (country models) by these scripts.

- `investigacion/*.json` — country models for España (energía, vivienda, movilidad, política, economía), as the
  researchers wrote them, following `investigacion/_plantilla.md`. Every figure carries its source and year.
- `build_pais.py` — turns those models into `paises.js`, makes their «patas» the parts of each sector and adds their
  retos/soluciones/proyectos at scale «país». It rebuilds from a saved copy of `data.js` taken before the first run;
  paths at the top of the file point at the session that created it and must be adjusted to rerun.
- `escalas.py`, `subtemas.py` — the rules that first assigned scales and parts to every item.

`data.js` is now the source of truth: small corrections can be made there by hand.

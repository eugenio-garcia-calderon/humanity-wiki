# Evaluador ciego

Eugenio, 2026-11-10: un bot que puntúe del 1 al 10 la sofisticación, la calidad del
contenido, la visualización, la experiencia de usuario y la comparativa con el modelo
anterior y el actual, **que no sepa de qué va la historia** y que diga qué entiende.
Lo que no ha entendido es lo que la página no está transmitiendo.

Two steps:

1. **Capture** the page (needs Playwright's Chromium or a system Chrome):

   ```bash
   node scripts/evaluador-ciego/capturar.mjs https://humanity.wiki/modelo-socioeconomico /tmp/eval-v1 estados.json
   ```

2. **Ask a fresh AI agent** — one that has not seen the conversation, the code or the
   brief — to read `PROMPT.md` and evaluate the folder. In Claude Code, that is a
   new sub-agent whose whole prompt is `PROMPT.md` plus the folder path. For a second
   round, give it the previous evaluation too, so it can score the comparison with
   the earlier version.

What the evaluator gets is only what a visitor would see. Never give it the brief or
the intention: the point is to find out whether the page says it on its own.

Eres investigador para humanity.wiki (proyecto Luz & Humanidad, fundador: Eugenio). La web muestra, para cada sector vital y cada escala (de la persona al planeta), la VISIÓN IDEAL, los RETOS, las SOLUCIONES y los PROYECTOS. Ahora construimos el MODELO A ESCALA PAÍS para ESPAÑA de tu sector: un esquema sencillo del sistema dividido en sus «patas» (los subsistemas que lo forman), y para cada pata cómo está hoy España, cuál es el ideal y qué equilibrio hay que alcanzar.

Reglas:
- Todo en español claro, para público general. Viñetas cortas (máx. ~20 palabras cada una). Poco texto.
- Verifica cada dato con WebSearch/WebFetch (fuentes oficiales primero: INE, ministerios, REE, CNMC, Banco de España, Eurostat, OCDE, BOE, Comisión Europea). Usa el dato más reciente (hoy es 16-11-2026) y di el año. No inventes: si no lo confirmas, déjalo fuera.
- El IDEAL debe apoyarse en objetivos oficiales (planes nacionales, directivas UE, ODS) o en evidencia/experiencias reales de otros países. Si un ideal es una propuesta propia de Luz & Humanidad, márcalo empezando la viñeta con «Propuesta L&H:». No tomes partido político: describe mecanismos y resultados, no culpables ni partidos.
- Las patas: 5 o 6, que cubran todo el sistema y se entiendan a la primera. Ids cortos en minúsculas sin tildes.
- Indicadores: 2 o 3 por pata, numéricos y comparables, con valor actual (España, año) y objetivo ideal (con su origen). «sentido»: "subir" si más es mejor, "bajar" si menos es mejor.

Escribe /home/claude/research/pais/<sector>.json con EXACTAMENTE esta estructura (valida con python3 -c "import json;json.load(open(...))"):
{
 "sector": "<id>",
 "pais": "es",
 "vision_general": {
   "titulo": "frase corta que nombre el ideal del sector en España",
   "ideal": ["5-6 viñetas: cómo sería el sistema completo funcionando de forma ideal"],
   "equilibrio": "1 frase: el equilibrio que hay que alcanzar a escala país"
 },
 "patas": [
  {"id":"...","nombre":"1-3 palabras","que_es":"1 frase muy corta",
   "actual":["3-4 viñetas: España hoy, con dato y año"],
   "ideal":["3-4 viñetas"],
   "equilibrio":"1 frase",
   "indicadores":[{"nombre":"...","actual":0,"objetivo":0,"unidad":"% | € | TWh | ...","sentido":"subir|bajar","año":2025,"fuente_url":"https://...","origen_objetivo":"p. ej. PNIEC 2030 / media UE / Propuesta L&H"}],
   "retos":[{"titulo":"frase corta","descripcion":"1-2 frases con dato y año","fuente_url":"https://..."}],
   "soluciones":[{"titulo":"...","descripcion":"1-2 frases: qué es y qué evidencia hay","fuente_url":"https://..."}],
   "proyectos":[{"nombre":"...","lugar":"...","descripcion":"1 frase","web":"https://... (verificada)"}]
  }
 ],
 "flujos":[{"de":"<id pata>","a":"<id pata>","etiqueta":"1-2 palabras: qué pasa de una a otra (dinero, energía, votos, viviendas...)"}],
 "reasignacion": {"<título EXACTO de un elemento existente>": ["<id pata>", "..."]}
}
- Por pata: 2 retos, 2 soluciones y 1-2 proyectos (proyectos reales; al menos la mitad en España).
- «flujos»: 5-8 flechas que expliquen cómo se conecta el sistema (para dibujar el esquema).
- «reasignacion»: el archivo /home/claude/research/pais/existentes_<sector>.json tiene los títulos de los retos, soluciones y proyectos que la web ya tiene en tu sector. Asigna CADA uno a la pata o patas a las que pertenece (copiando el título exacto). Si alguno no encaja en ninguna, asígnale la más cercana.

Al terminar, responde en máx. 12 líneas: las patas elegidas, qué datos quedaron dudosos y qué objetivos son propuesta propia.

# Esquema de datos de producto (W3a portátil)

Propuesto por el hilo «Productos portátiles» el 2026-10-18, a partir de `plan.md` §2.1.
Pensado para que `datos/domestico/` (W3b) use el mismo esqueleto y sólo cambie el bloque
`datos_tecnicos`. Un fichero JSON por subcategoría, más `marcas.json` y `distribuidores.json`.

## Regla de procedencia

Todo dato con valor lleva `fuente` (URL) y `fecha` (día de consulta, AAAA-MM-DD) y una
`naturaleza`:

| naturaleza | Significa | Se enseña como |
|---|---|---|
| `declarado` | Lo publica el fabricante o la marca | «Según la marca» |
| `medido` | Lo midió un tercero independiente (laboratorio, revista técnica) | «Medido por X» |
| `calculado` | Lo derivamos nosotros de datos con fuente (p. ej. Wh = mAh × V / 1000), con la fórmula en `nota` | «Calculado a partir de…» |
| `no_publicado` | Se buscó y no se encontró; `valor` es `null` | «El fabricante no publica…» |

Nada estimado se presenta como medido. Un dato sin fuente no entra.

Forma de un dato: `{ "valor": 25.6, "unidad": "Wh", "naturaleza": "declarado", "fuente": "https://…", "fecha": "2026-10-18", "nota": "opcional" }`

## Producto (una entrada de `productos[]`)

```jsonc
{
  "id": "anker-737-powercore-24k",          // slug único, estable
  "nombre": "Anker 737 Power Bank (PowerCore 24K)",
  "marca_id": "anker",                       // → marcas.json
  "modelo": "A1289",
  "subcategoria": "powerbanks" | "estaciones" | "paneles-solares-portatiles" | "luces-solares-portatiles",
  "ean": [ { "valor": "194644098636", "fuente": "…", "fecha": "…" } ],   // [] si no se encontró
  "estado": "a la venta" | "descatalogado" | "desconocido",
  "anio_lanzamiento": { dato },
  "foto": { "url": "…", "fuente": "…" },     // imagen oficial; no se descarga todavía
  "resumen": "3–5 frases neutras (guía de tono §2.6).",
  "datos_tecnicos": { "<campo>": { dato }, … },   // campos por subcategoría, abajo
  "origen": {
    "pais_marca": { dato }, "pais_fabricacion": { dato }, "fabrica": { dato },
    "materiales_principales": { dato }, "num_componentes": { dato },
    "reparabilidad": { dato }              // batería sustituible, piezas, manual de reparación
  },
  "documentos": [ { "tipo": "manual|ficha_tecnica|declaracion_ce|un38_3|certificado|otro", "titulo": "…", "url": "…", "fecha": "…" } ],
  "afirmaciones": [ {
    "afirmacion": "texto literal o casi literal de la publicidad",
    "donde": "URL de la página que la hace",
    "veredicto": "cierta" | "matizable" | "falsa" | "sin_pruebas",
    "explicacion": "frase neutra con el porqué",
    "fuentes": [ { "url": "…", "titulo": "…", "fecha": "…" } ]
  } ],
  "retiradas": [ {
    "pais": "EE. UU.", "organismo": "CPSC", "fecha": "2025-06-12",
    "motivo": "…", "referencia": "nº de retirada o alerta", "url": "…"
  } ],
  "retiradas_comprobadas": [               // también cuando no hay ninguna
    { "organismo": "EU Safety Gate", "fecha": "2026-10-18", "resultado": "ninguna encontrada", "url_busqueda": "…" }
  ],
  "ofertas": [ {
    "distribuidor_id": "amazon-es",       // → distribuidores.json
    "url": "…", "precio_eur": 99.99, "envio_eur": 0, "plazo": "1–2 días",
    "stock": "en stock" | "agotado" | "desconocido",
    "comision": "sin acuerdo", "fecha_comprobacion": "2026-10-18",
    "nota": "p. ej. precio leído en el buscador, no en la tienda"
  } ],
  "pendiente": [ "lo que se buscó y no se encontró, o hay que comprobar" ]
}
```

## `datos_tecnicos` por subcategoría

- **powerbanks** y **estaciones**: `capacidad_mah`, `tension_celda_v`, `capacidad_wh`,
  `potencia_salida_max_w`, `potencia_ac_continua_w` (estaciones), `potencia_ac_pico_w`
  (estaciones), `potencia_entrada_max_w`, `puertos` (texto: «2× USB-C PD 140 W, 1× USB-A»),
  `quimica` (Li-ion / LiPo / LiFePO₄ / NMC), `ciclos_declarados` (con % de capacidad restante en
  `nota`), `peso_kg`, `medidas_mm`, `carga_solar` (sí/no + entrada máx. W), `apto_avion`
  (calculado: < 100 Wh sí; 100–160 Wh con permiso de la aerolínea; > 160 Wh no; fuente IATA),
  `garantia_anios`, `energia_util_medida_wh` (sólo si un tercero lo midió).
- **paneles-solares-portatiles**: `potencia_pico_w`, `eficiencia_celula_pct`,
  `tipo_celula` (mono/poli/CIGS/ETFE…), `voc_v`, `isc_a`, `peso_kg`, `medidas_plegado_mm`,
  `medidas_desplegado_mm`, `conector` (MC4, XT60, Anderson, USB-C…), `ip`, `garantia_anios`,
  `salidas_usb` (si tiene).
- **luces-solares-portatiles**: `lumenes_max`, `autonomia_h` (con el modo en `nota`),
  `bateria_mah`, `bateria_wh`, `panel_solar_w`, `carga_usb`, `funcion_powerbank`, `ip`,
  `modos`, `peso_g`, `garantia_anios`.

## `marcas.json`

`{ "marcas": [ { "id", "nombre", "razon_social", "pais_sede", "matriz", "fundacion",
"web", "cotiza" , "datos_publicos": "texto neutro con fuente", "fuentes": [ … ] } ] }`

## `distribuidores.json`

`{ "distribuidores": [ { "id", "nombre", "razon_social", "pais", "cif" (si es público),
"web", "envio": "…", "devoluciones": "…", "fuentes": [ … ] } ] }`

## Ficheros de este hilo

| Fichero | Contenido |
|---|---|
| `powerbanks.json` | Powerbanks de bolsillo y de portátil |
| `estaciones.json` | Estaciones de energía portátiles (batería con salida AC) |
| `paneles.json` | Paneles solares portátiles |
| `luces.json` | Luces solares portátiles |
| `marcas.json`, `distribuidores.json` | Fusionados de los cuatro anteriores |
| `*.csv` | Vistas planas generadas desde los JSON (los JSON mandan) |

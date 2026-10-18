# Datos de productos domésticos (W3b) — esquema

Dueño: hilo «Productos domésticos». Sigue las listas de propiedades del plan (§2.1).

**Formato final = el de `../portatil/ESQUEMA.md`** (un JSON por subcategoría: `paneles.json`,
`baterias.json`, más `marcas.json` y `distribuidores.json`, `naturaleza`
declarado|medido|calculado|no_publicado, `marca_id`, `distribuidor_id`, `retiradas_comprobadas`).
Lo único propio de lo doméstico: `datos_tecnicos` (abajo), `garantias`, `certificados` y en las
ofertas `incluye_instalacion`.

Mientras se investiga, cada investigador escribe **un fichero por producto** en `paneles/` y `baterias/`
(abajo, «borrador»), para que varios trabajen a la vez sin pisar un fichero común. El script
`unir.mjs` los convierte al formato final (`origen`→`naturaleza`, `desconocido`→`no_publicado`,
`empresa`→`marcas.json`, distribuidor→`distribuidor_id`). Los JSON finales mandan.

## Borrador por producto

- `paneles/<slug>.json` — paneles solares domésticos (módulos fotovoltaicos)
- `baterias/<slug>.json` — baterías domésticas (almacenamiento para autoconsumo)
- `indice.csv` — una fila por producto (se genera desde los JSON con `generar_indice.mjs`)

## Regla de procedencia

Cada dato técnico es un objeto, nunca un valor suelto:

```json
{ "valor": 22.8, "unidad": "%", "origen": "declarado",
  "fuente": "https://…/ficha-tecnica.pdf", "fecha": "2026-10-18", "nota": "versión 480 W" }
```

`origen` es uno de:
- `declarado` — lo dice el fabricante (ficha técnica, web, manual). Es lo normal.
- `medido` — lo midió un tercero independiente (laboratorio, PVEL, Kiwa, test de batería de la
  HTW Berlin, revista técnica) y se cita ese informe.
- `calculado` — lo calculamos nosotros a partir de otros datos (p. ej. €/Wp = precio / Wp). La
  `nota` dice la fórmula.
- `desconocido` — no se ha encontrado; `valor` es `null` y la nota dice «el fabricante no lo
  publica» o dónde se buscó.

Nada estimado se presenta como medido. Si hay duda, `declarado`.
`fecha` = día en que se consultó la fuente.

## Estructura común

```jsonc
{
  "slug": "longi-hi-mo-x10-lr7-54hvh",
  "subcategoria": "Paneles solares domésticos",   // o "Baterías domésticas"
  "nombre": "LONGi Hi-MO X10 Explorer 54 células",
  "marca": "LONGi",
  "modelo": "LR7-54HVH-480M … 495M",             // familia y gama de potencias
  "variante_ficha": "LR7-54HVH-485M",             // la variante a la que se refieren los datos
  "ean": { "valor": null, … },                    // GTIN si es público
  "anio_lanzamiento": { … },
  "estado": "a la venta" | "descatalogado",
  "resumen": "3–5 frases neutras (guía de estilo §2.6)",
  "imagen": { "url": "…", "fuente": "…", "licencia": "propiedad del fabricante; solo enlace" },

  "datos_tecnicos": { … ver abajo según subcategoría … },

  "garantias": {
    "producto":    { "anios": …, "fuente", "fecha" },
    "rendimiento": { "anios": …, "porcentaje_final": …, "primer_anio_pct": …, "lineal_anual_pct": … },
    "letra_pequena": [ "condiciones que limitan la garantía, con fuente", … ],
    "quien_responde": "fabricante / distribuidor / aseguradora; qué pasa si el fabricante quiebra"
  },

  "empresa": {
    "razon_social", "pais_sede", "fundacion", "cotiza_en", "web",
    "fabricante_celulas", "pais_fabricacion", "fabricas_conocidas": [ … ],
    "notas": [ "hechos públicos relevantes: quiebras, sanciones, aranceles, trabajo forzoso (UFLPA)…, con fuente" ],
    "fuentes": [ … ]
  },
  "origen": {
    "pais_marca", "pais_fabricacion", "fabrica", "materiales_principales": [ … ],
    "num_componentes": { … dato con procedencia … },
    "reparabilidad": "texto con fuente"
  },
  "certificados": [ { "nombre": "IEC 61215", "emisor": "TÜV …", "fuente", "fecha" } ],
  "documentos":   [ { "tipo": "ficha técnica|manual|garantía|declaración CE|certificado", "url", "idioma", "fecha" } ],

  "afirmaciones": [
    { "afirmacion": "texto literal de la marca", "donde": "url de la marca",
      "veredicto": "cierta|matizable|falsa|sin pruebas",
      "explicacion": "neutra, 1–3 frases", "fuentes": [ … ], "fecha" }
  ],
  "retiradas": [
    { "pais", "organismo": "EU Safety Gate|CPSC|ACCC|Health Canada|BNetzA|fabricante…",
      "fecha", "motivo", "modelos_afectados", "url", "fecha_consulta" }
  ],
  "retiradas_busqueda": "dónde se buscó y cuándo, para poder decir «ninguna conocida a fecha X»",

  "ofertas": [
    { "distribuidor", "tipo": "tienda online|instalador|mayorista", "pais", "url",
      "precio_eur": …, "iva_incluido": true|false, "unidad": "por módulo|por pack|por kWh…",
      "incluye_instalacion": false, "envio": "…", "stock": "…",
      "comision": "sin acuerdo", "fecha_comprobacion": "2026-10-18" }
  ],
  "compatibles": [ "inversores o productos con los que funciona (sin ficha propia en el MVP)" ],
  "pendiente": [ "lo que no se pudo verificar" ]
}
```

## `datos_tecnicos` — panel solar doméstico

`potencia_pico_wp`, `gama_potencias_wp`, `eficiencia_pct`, `tecnologia_celula` (PERC, TOPCon,
HJT, IBC/ABC…), `tipo_celula` (mono/poli), `num_celulas`, `bifacial`, `bifacialidad_pct`,
`vidrio` (simple/doble), `marco` (color), `medidas_mm`, `peso_kg`,
`coef_temp_pmax_pct_c`, `noct_o_nmot_c`, `degradacion_primer_anio_pct`,
`degradacion_anual_pct`, `voc_v`, `isc_a`, `tension_max_sistema_v`,
`carga_mecanica_pa` (nieve/viento), `ip_caja_conexiones`, `conector`,
`precio_por_wp_eur` (calculado, de la oferta más barata con IVA),
`resultado_pvel` / `pruebas_independientes` (si existen, `medido`).

## `datos_tecnicos` — batería doméstica

`capacidad_total_kwh`, `capacidad_util_kwh`, `gama_capacidades_kwh`, `modular`,
`ampliable`, `ampliacion_max_kwh`, `potencia_continua_kw`, `potencia_pico_kw`,
`quimica` (LFP, NMC…), `fabricante_celulas`, `ciclos_declarados`,
`profundidad_descarga_pct`, `eficiencia_ida_vuelta_pct`, `tension` (alta/baja; V),
`acoplamiento` (AC/DC/híbrido con inversor integrado), `inversor_integrado`,
`inversores_compatibles`, `respaldo_apagones` (sí/no, y si es toda la casa o circuitos),
`instalacion` (interior/exterior), `ip`, `rango_temperatura_c`, `peso_kg`, `medidas_mm`,
`garantia_energia_mwh` (energía garantizada, si la dan),
`precio_por_kwh_util_eur` (calculado),
`pruebas_independientes` (p. ej. Stromspeicher-Inspektion HTW Berlin, `medido`).

## Ofertas

Precios reales de tiendas e instaladores de España/UE, con fecha. Precio sin instalación salvo
que se diga. `comision`: «sin acuerdo» mientras no haya acuerdo (plan §0.6).

## Ids y carga (2026-10-18)

- `id` del producto y `marca_id` son estables, en minúsculas y sin acentos; las URL del sitio
  (`/subcategoria/marca-modelo`) salen de ellos. Los ids de marca se fijan en `MARCA_ID` de
  `unir.mjs`; `anker` y `ecoflow` coinciden a propósito con `../portatil/marcas.json` (misma empresa).
- Ofertas → columnas de W5: `producto` ← id del producto, `distribuidor` ← `distribuidor_id`,
  `precio` ← `precio_eur` (mirar `iva_incluido` y `unidad`), `envio` ← `envio`, `stock` ← `stock`,
  `comision` ← vacío si «sin acuerdo», `enlace` ← `url`, `plazo` ← `plazo`,
  `comprobado` ← `fecha_comprobacion`, `instalacion` ← `incluye_instalacion`.
- Columnas de W1 (PR #600): `unir.mjs` aplana `garantias` en `datos_tecnicos.garantia_producto_anios`,
  `garantia_rendimiento_anios`, `garantia_rendimiento_final_pct` (fracción: 0,8 = 80 %),
  `garantia_letra_pequena` (una condición por línea) y `garantia_quien_responde`;
  `fabricas_conocidas` → `origen.fabrica`; `resultado_pvel` → `pruebas_independientes` (conserva su
  naturaleza: un comunicado de la marca sigue siendo «declarado»); en ofertas, `envio` (texto) →
  `envio_eur` vacío y el texto a `nota`. Los borradores no cambian.

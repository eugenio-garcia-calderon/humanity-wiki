# Documentación normativa de Humanity.wiki

Esta carpeta contiene los documentos que **definen** la plataforma. Tienen
prioridad sobre cualquier decisión de implementación.

Orden de prioridad (según `99_CONSTITUTION.md`):

> Constitución > Visión > Arquitectura > Base de datos > Requisitos > UI > Implementación

## Índice

| Documento | Contenido |
|---|---|
| [99_CONSTITUTION.md](99_CONSTITUTION.md) | Reglas fundamentales e inviolables |
| [00_VISION.md](00_VISION.md) | Misión, componentes y flujo principal |
| [01_PRINCIPLES.md](01_PRINCIPLES.md) | 14 principios de diseño |
| [02_DOMAIN_MODEL.md](02_DOMAIN_MODEL.md) | Entidades del dominio y sus relaciones |
| [03_ARCHITECTURE.md](03_ARCHITECTURE.md) | Arquitectura por capas |
| [04_DATABASE.md](04_DATABASE.md) | Modelo de datos, auditoría e historial |
| [05_KNOWLEDGE_GRAPH.md](05_KNOWLEDGE_GRAPH.md) | Grafo de conocimiento |
| [06_SOCIAL_NETWORK.md](06_SOCIAL_NETWORK.md) | Red social, roles y publicaciones |
| [07_MARKETPLACE.md](07_MARKETPLACE.md) | Mercado, productos y demandas |
| [08_ECONOMY.md](08_ECONOMY.md) | Sistema económico |
| [09_STRIPE.md](09_STRIPE.md) | Integración de pagos |
| [10_PRODUCT_REQUIREMENTS.md](10_PRODUCT_REQUIREMENTS.md) | Requisitos funcionales |
| [11_UI_GUIDELINES.md](11_UI_GUIDELINES.md) | Guía de interfaz |
| [12_KNOWLEDGE_GRAPHS.md](12_KNOWLEDGE_GRAPHS.md) | Ontología de los Grafos de Conocimiento (Fase 11) |

## Relación con `/memory`

- **`/docs`** (esta carpeta) = **qué debe ser** la plataforma. Fuente normativa.
- **`/memory`** = **qué se ha hecho y por qué**. Bitácora viva: decisiones
  tomadas (`03_DECISIONS.md`), changelog (`08_CHANGELOG.md`), estado real de la
  base de datos y de los indicadores.

Cuando la implementación se desvía de un documento normativo, la desviación se
razona y se registra en `/memory/03_DECISIONS.md`, nunca en silencio.

## Desviaciones vigentes respecto a estos documentos

Registradas en detalle en `/memory/03_DECISIONS.md`:

1. **UUID**: la Constitución exige UUID en toda entidad. Se cumple añadiendo
   una columna `uuid` permanente, pero conservando el `id` de texto legible
   (`T003`, `IND_AGUA_CALIDAD`…) como clave primaria e identificador público,
   porque está en URLs, iconos y archivos GeoJSON. Decisión del usuario.
2. **Objetivos**: los documentos listan 11; la plataforma tiene 14 (añadidos
   Gobernanza, Economía y Cultura a petición del usuario).
3. **Entidades no documentadas que sí existen**: Causa (con peso por reto),
   Métrica y Estación de medición. Son de primera clase en el grafo.
4. **Historial**: `04_DATABASE.md` propone una tabla de historial por entidad;
   se implementa una única tabla polimórfica `entity_history` con la misma
   garantía, para no multiplicar tablas al crecer el dominio.
5. **Iniciativas**: `projects` pasará a `initiatives` en la Fase 7.
6. **Faltan** `12_ROADMAP.md` y `13_TEST_DATA.md`, que el usuario decidió
   descartar. El plan por fases vive en `/memory/04_ROADMAP.md`.

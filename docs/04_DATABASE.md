# 04_DATABASE.md

# Modelo de Base de Datos

## Objetivo

Definir la estructura lógica de la base de datos de Humanity.wiki.

---

# Principios

- UUID en todas las entidades.
- Auditoría completa.
- Versionado.
- Integridad referencial.
- Relaciones explícitas.
- Sin duplicidad de información.

---

# Tablas principales

## territories
Información territorial.

## objectives
Grandes objetivos.

## indicators
Indicadores asociados a objetivos.

## markers
Marcadores asociados a indicadores.

## users
Usuarios de la plataforma.

## organizations
Organizaciones.

## roles
Niveles y permisos.

## publications
Publicaciones del muro.

## challenges
Retos.

## solutions
Soluciones.

## needs
Necesidades.

## products
Productos.

## demands
Demandas.

## initiatives
Iniciativas.

## success_cases
Casos de éxito.

## transactions
Transacciones económicas.

## subscriptions
Suscripciones.

## supports
Donaciones y patrocinios.

## stripe_accounts
Cuentas Stripe Connect.

---

# Tablas relacionales

- territory_objectives
- territory_indicators
- publication_tags
- publication_products
- publication_demands
- publication_challenges
- challenge_solutions
- solution_products
- solution_initiatives
- initiative_products
- initiative_participants
- initiative_results
- success_case_initiatives
- user_followers
- user_following

---

# Auditoría

Todas las tablas críticas tendrán:

- created_at
- updated_at
- created_by
- updated_by
- version
- uuid

---

# Historial

Toda modificación se almacenará en tablas de historial.

Ejemplos:

- publication_history
- challenge_history
- solution_history
- product_history
- initiative_history

---

# Relaciones

No se almacenarán relaciones mediante texto libre.

Todas las relaciones utilizarán claves foráneas y UUID.

---

# Escalabilidad

Preparada para millones de registros manteniendo consistencia y trazabilidad.


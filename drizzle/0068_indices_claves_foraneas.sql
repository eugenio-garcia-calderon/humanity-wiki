-- ============================================================================
-- LOS 94 ÍNDICES QUE FALTAN (2026-08-22) — Fase 1 de la optimización
-- ============================================================================
-- Medido contra la base de datos de producción, no estimado:
--
--     claves foráneas declaradas ............ 187
--     de ellas, SIN índice en su columna ....  94
--
-- Una clave foránea sin índice no da error nunca. Da un recorrido completo de
-- la tabla cada vez que se une por ella, y hoy no se nota porque la tabla mayor
-- tiene 20.557 filas: recorrerla entera cuesta milisegundos. Con dos millones
-- de filas, la misma consulta pasa de milisegundos a segundos, y **el día que
-- se nota ya es tarde**, porque para entonces hay tráfico encima.
--
-- Y hay un segundo efecto, menos conocido y peor: al borrar una fila padre,
-- Postgres COMPRUEBA todas las tablas hijas. Sin índice, borrar un territorio
-- recorre entera cada tabla que lo referencia. Aquí son 15.
--
-- ── LO QUE CUESTA, DICHO ENTERO ────────────────────────────────────────────
-- Un índice no es gratis: ocupa disco y hay que actualizarlo en cada INSERT y
-- cada UPDATE de esa columna. La regla que se aplica aquí es la estándar —se
-- indexa TODA clave foránea— y es la correcta en esta base de datos porque
-- casi todas estas tablas son de LECTURA: catálogos, uniones y observaciones
-- que se escriben una vez y se leen constantemente. Donde la escritura mande
-- de verdad (una tabla de eventos por segundo), habrá que revisarlo con la
-- medida delante, no con esta regla.
--
-- ── POR QUÉ NO `CONCURRENTLY` ──────────────────────────────────────────────
-- `deploy/migrate.sh` aplica cada fichero dentro de UNA transacción, todo o
-- nada, y `CREATE INDEX CONCURRENTLY` no puede ir en una transacción. Con las
-- tablas de hoy —la mayor de 20.557 filas— cada índice tarda milisegundos y el
-- bloqueo no se percibe. **Esto deja de valer cuando las tablas crezcan**: a
-- partir de ahí, un índice nuevo va en su propio despliegue y con
-- `CONCURRENTLY`, fuera de transacción. Queda dicho aquí para que quien venga
-- no copie este fichero sin pensarlo.
--
-- `IF NOT EXISTS` en todos: este fichero se puede volver a pasar sin miedo.

CREATE INDEX IF NOT EXISTS idx_agentes_ia_created_by ON agentes_ia (created_by);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_gaps_indicator_id ON ai_knowledge_gaps (indicator_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_gaps_objective_id ON ai_knowledge_gaps (objective_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_gaps_territory_id ON ai_knowledge_gaps (territory_id);
CREATE INDEX IF NOT EXISTS idx_ai_proposed_actions_conversation_id ON ai_proposed_actions (conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_proposed_actions_decided_by ON ai_proposed_actions (decided_by);
CREATE INDEX IF NOT EXISTS idx_ai_proposed_actions_user_id ON ai_proposed_actions (user_id);
CREATE INDEX IF NOT EXISTS idx_archivos_columna_id ON archivos (columna_id);
CREATE INDEX IF NOT EXISTS idx_archivos_subido_por ON archivos (subido_por);
CREATE INDEX IF NOT EXISTS idx_bd_filas_pagina_id ON bd_filas (pagina_id);
CREATE INDEX IF NOT EXISTS idx_challenge_causes_cause_id ON challenge_causes (cause_id);
CREATE INDEX IF NOT EXISTS idx_challenge_indicators_indicator_id ON challenge_indicators (indicator_id);
CREATE INDEX IF NOT EXISTS idx_challenge_markers_marker_id ON challenge_markers (marker_id);
CREATE INDEX IF NOT EXISTS idx_challenge_metrics_metric_id ON challenge_metrics (metric_id);
CREATE INDEX IF NOT EXISTS idx_challenge_objectives_objective_id ON challenge_objectives (objective_id);
CREATE INDEX IF NOT EXISTS idx_challenge_solutions_solution_id ON challenge_solutions (solution_id);
CREATE INDEX IF NOT EXISTS idx_challenge_territories_territory_id ON challenge_territories (territory_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_user_id ON comments (author_user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments (parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_user_id ON content_reports (reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reviewed_by ON content_reports (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_demand_challenges_challenge_id ON demand_challenges (challenge_id);
CREATE INDEX IF NOT EXISTS idx_demand_indicators_indicator_id ON demand_indicators (indicator_id);
CREATE INDEX IF NOT EXISTS idx_demand_needs_need_id ON demand_needs (need_id);
CREATE INDEX IF NOT EXISTS idx_demand_products_product_id ON demand_products (product_id);
CREATE INDEX IF NOT EXISTS idx_demand_territories_territory_id ON demand_territories (territory_id);
CREATE INDEX IF NOT EXISTS idx_demands_organization_id ON demands (organization_id);
CREATE INDEX IF NOT EXISTS idx_game_agents_persona_user_id ON game_agents (persona_user_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_from_window_id ON graph_edges (from_window_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_to_window_id ON graph_edges (to_window_id);
CREATE INDEX IF NOT EXISTS idx_graph_windows_window_id ON graph_windows (window_id);
CREATE INDEX IF NOT EXISTS idx_indicator_observations_indicator_id ON indicator_observations (indicator_id);
CREATE INDEX IF NOT EXISTS idx_indicator_observations_territory_id ON indicator_observations (territory_id);
CREATE INDEX IF NOT EXISTS idx_indicators_objective_id ON indicators (objective_id);
CREATE INDEX IF NOT EXISTS idx_initiative_challenges_challenge_id ON initiative_challenges (challenge_id);
CREATE INDEX IF NOT EXISTS idx_initiative_demands_demand_id ON initiative_demands (demand_id);
CREATE INDEX IF NOT EXISTS idx_initiative_objectives_objective_id ON initiative_objectives (objective_id);
CREATE INDEX IF NOT EXISTS idx_initiative_organizations_organization_id ON initiative_organizations (organization_id);
CREATE INDEX IF NOT EXISTS idx_initiative_participants_user_id ON initiative_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_initiative_products_product_id ON initiative_products (product_id);
CREATE INDEX IF NOT EXISTS idx_initiative_results_indicator_id ON initiative_results (indicator_id);
CREATE INDEX IF NOT EXISTS idx_initiative_results_marker_id ON initiative_results (marker_id);
CREATE INDEX IF NOT EXISTS idx_initiative_solutions_solution_id ON initiative_solutions (solution_id);
CREATE INDEX IF NOT EXISTS idx_initiative_territories_territory_id ON initiative_territories (territory_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_territory_id ON initiatives (territory_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_graphs_creator_user_id ON knowledge_graphs (creator_user_id);
CREATE INDEX IF NOT EXISTS idx_marker_observations_marker_id ON marker_observations (marker_id);
CREATE INDEX IF NOT EXISTS idx_marker_observations_territory_id ON marker_observations (territory_id);
CREATE INDEX IF NOT EXISTS idx_markers_indicator_id ON markers (indicator_id);
CREATE INDEX IF NOT EXISTS idx_measurement_stations_territory_id ON measurement_stations (territory_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_de_user_id ON mensajes (de_user_id);
CREATE INDEX IF NOT EXISTS idx_metric_observations_metric_id ON metric_observations (metric_id);
CREATE INDEX IF NOT EXISTS idx_metric_observations_station_id ON metric_observations (station_id);
CREATE INDEX IF NOT EXISTS idx_metrics_marker_id ON metrics (marker_id);
CREATE INDEX IF NOT EXISTS idx_need_territories_territory_id ON need_territories (territory_id);
CREATE INDEX IF NOT EXISTS idx_organization_objectives_objective_id ON organization_objectives (objective_id);
CREATE INDEX IF NOT EXISTS idx_organization_solutions_solution_id ON organization_solutions (solution_id);
CREATE INDEX IF NOT EXISTS idx_organizations_territory_id ON organizations (territory_id);
CREATE INDEX IF NOT EXISTS idx_pedido_lineas_producto_id ON pedido_lineas (producto_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_comprador_user_id ON pedidos (comprador_user_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_producto_id ON pedidos (producto_id);
CREATE INDEX IF NOT EXISTS idx_product_challenges_challenge_id ON product_challenges (challenge_id);
CREATE INDEX IF NOT EXISTS idx_product_indicators_indicator_id ON product_indicators (indicator_id);
CREATE INDEX IF NOT EXISTS idx_product_needs_need_id ON product_needs (need_id);
CREATE INDEX IF NOT EXISTS idx_product_objectives_objective_id ON product_objectives (objective_id);
CREATE INDEX IF NOT EXISTS idx_product_solutions_solution_id ON product_solutions (solution_id);
CREATE INDEX IF NOT EXISTS idx_product_territories_territory_id ON product_territories (territory_id);
CREATE INDEX IF NOT EXISTS idx_products_organization_id ON products (organization_id);
CREATE INDEX IF NOT EXISTS idx_project_challenges_challenge_id ON project_challenges (challenge_id);
CREATE INDEX IF NOT EXISTS idx_project_objectives_objective_id ON project_objectives (objective_id);
CREATE INDEX IF NOT EXISTS idx_project_organizations_organization_id ON project_organizations (organization_id);
CREATE INDEX IF NOT EXISTS idx_project_solutions_solution_id ON project_solutions (solution_id);
CREATE INDEX IF NOT EXISTS idx_projects_territory_id ON projects (territory_id);
CREATE INDEX IF NOT EXISTS idx_publications_author_organization_id ON publications (author_organization_id);
CREATE INDEX IF NOT EXISTS idx_refunds_created_by ON refunds (created_by);
CREATE INDEX IF NOT EXISTS idx_refunds_transaction_id ON refunds (transaction_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_autor_user_id ON roadmap_items (autor_user_id);
CREATE INDEX IF NOT EXISTS idx_solution_causes_cause_id ON solution_causes (cause_id);
CREATE INDEX IF NOT EXISTS idx_solution_needs_need_id ON solution_needs (need_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_organization_id ON stripe_accounts (organization_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_user_id ON stripe_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_success_case_initiatives_initiative_id ON success_case_initiatives (initiative_id);
CREATE INDEX IF NOT EXISTS idx_success_cases_initiative_id ON success_cases (initiative_id);
CREATE INDEX IF NOT EXISTS idx_success_cases_territory_id ON success_cases (territory_id);
CREATE INDEX IF NOT EXISTS idx_supports_beneficiary_organization_id ON supports (beneficiary_organization_id);
CREATE INDEX IF NOT EXISTS idx_supports_initiative_id ON supports (initiative_id);
CREATE INDEX IF NOT EXISTS idx_supports_supporter_user_id ON supports (supporter_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payee_organization_id ON transactions (payee_organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payee_user_id ON transactions (payee_user_id);
CREATE INDEX IF NOT EXISTS idx_user_indicators_indicator_id ON user_indicators (indicator_id);
CREATE INDEX IF NOT EXISTS idx_user_objectives_objective_id ON user_objectives (objective_id);
CREATE INDEX IF NOT EXISTS idx_user_territories_territory_id ON user_territories (territory_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users (organization_id);

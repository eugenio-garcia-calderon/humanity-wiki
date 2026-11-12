-- 2026-11-12 (Eugenio), luzhumanidad.com: «permite pinchar y arrastrar para ordenar las tarjetas
-- de la galería de proyectos». Desde ahora, dentro de cada sector de la portada manda el orden de
-- la tabla (el que se cambia arrastrando). Para que nada se mueva al desplegar, la tabla toma una
-- vez el orden que la portada enseñaba (categoría y, dentro, tabla): solo cambian de sitio Festival
-- Arte Ser Humano (tras Divulgación en Colegios) y el Observatorio (antes del Modelo Público).
-- Las filas que no están en la lista (ocultas o nuevas) no se tocan. Se puede aplicar dos veces.
UPDATE bd_filas f SET orden = x.o::int - 1
FROM jsonb_array_elements_text('["BDFMUQWKEQUSG60","BDFMVDP4SCGRXS9","BDFMUVFNHK2A3AJ","BDFNTODDDY2JEZ5S","BDFMUVMT739R7FA","BDFMUVNYY7WONCF","BDFMUZGRQ7R17WS","BDFNTSTY4XY5SH4B","BDFSOLSOLIDAR01","BDFNT8S61KE6A88E","BDFNT02K2JCL25BD","BDFMVDU4N2KAWOC","BDFMVDU8V45HILF","BDFNTHIX1L0M795D","BDFNTJ0N1NEAULJM","BDFNT4EAQR7DZYML","BDFNTUT0U667BPC1","BDFNTVJGQ1NQ04D9","BDFMVDXKJOXKN8D","BDFMVDXLR7NO8FR","BDFNTSJZVW6PBDPQ","BDFMVDY616C76ZH","BDFNTDZT1HORE597","BDFNTQY7O0GRDO60","BDFNTQXJ0188QSIS","BDFNT9W2HZNFZW27","BDFNTDOF56F159B6","BDFMVE3WNNR65YX","BDFNTXJQF1VH0BFF","BDFNTERGPU6IU32T","BDFCOMENERGPUE01","BDFNTK94IVQCCNSX","BDFNTRQ9WI5JQF95","BDFMUVNM5UY0H12","BDFMWAI4PYUAC65","BDFCONCIENCIASH1","BDFOBSPOLARIZ01","BDFMODELOSOCIO1","BDFOPTIMENERGI1"]'::jsonb) WITH ORDINALITY AS x(id, o)
WHERE f.id = x.id AND f.tabla_id = 'BDTMUOOFFNGJIEG' AND f.orden IS DISTINCT FROM x.o::int - 1;

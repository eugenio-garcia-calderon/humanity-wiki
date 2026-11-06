# Ilustración definitiva (versión pictórica de mural) — Calendario Arte para la Humanidad 2027

Lee primero `ILUSTRACIONES.md` en esta misma carpeta: estilo de referencia, y el encargo de tu mes
(escena, LUZ y SOMBRA). Mira también el boceto de composición de tu mes en
`/home/claude/humanity-wiki/public/calendario-arte/bocetos/mes-XX.svg` (rasterízalo con
`rsvg-convert -w 1485 entrada.svg -o salida.png` y míralo con Read): conserva su idea y su
composición general, pero la versión definitiva tiene que parecer **un mural pintado con spray y
pincel sobre pared**, no un icono vectorial.

## Técnica pictórica en SVG (obligatoria)
- **Volumen real**: cada forma importante con 3-5 capas de sombreado (luz, medio tono, sombra
  propia, sombra proyectada, reflejo), degradados radiales y bordes suaves (`feGaussianBlur`).
  Nada de formas planas de un solo color.
- **Textura de pintura**: `feTurbulence` + `feDisplacementMap` para que los bordes parezcan
  pinceladas irregulares; grano fino de pared (`feTurbulence` de alta frecuencia mezclado en
  multiply/soft-light) sobre todo el cuadro; algunos trazos de pincel visibles (paths largos,
  semitransparentes, con extremos afilados) para dar dirección al plumaje, pelaje o agua.
- **Ornamento geométrico con relieve** integrado en la figura (rombos, triángulos, escamas,
  anillos concéntricos), cada pieza con su propio claro/oscuro, como en los murales de referencia
  (jilguero-trompeta de latón, cigüeña con alas de hojas, ballena con criaturas, zorro coronado).
- **Detalle donde se mira**: ojos con iris, pupila y brillo; pliegues, garras, plumas finas.
- **Fondo pictórico** en capas difuminadas (cielo, nebulosa, pared, agua) que no compita con la
  figura. Paleta rica y cálida (ocres, dorados, violetas, turquesas) y un contraste claro entre
  el lado LUZ y el lado SOMBRA del tema.
- **Sin sobrecargar**: una figura protagonista grande y legible al primer vistazo, pocos elementos
  secundarios bien colocados.

## Formato técnico
- SVG puro, `viewBox="0 0 1485 850"`, sin width/height en la raíz, fondo completo.
- Prohibido: `<text>`, letras, números, `<image>`, scripts, fuentes externas, `href` externos.
- Peso máximo 700 kB.
- Guárdalo en `/home/claude/humanity-wiki/public/calendario-arte/ilustraciones/mes-XX.svg`
  (XX con dos cifras). No sobrescribas los bocetos ni toques ningún otro fichero del repositorio.

## Revisión
Rasterízalo a PNG en
`/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/pictorico/mes-XX.png`,
míralo con Read y haz al menos dos rondas de mejora comparándolo con un mural pintado de verdad:
¿se lee la figura?, ¿se ve la luz y la sombra del tema?, ¿tiene volumen y textura?, ¿está
sobrecargado? Comprueba que no hay texto ni imágenes externas y que el XML es válido.

Si recibes correcciones de un evaluador estético, aplícalas todas sobre el mismo fichero,
vuelve a rasterizar y comprueba que el cambio se ve.

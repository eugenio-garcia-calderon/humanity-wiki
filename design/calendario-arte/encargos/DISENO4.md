# Diseño 4 — el ideal · Calendario Arte para la Humanidad 2027

Eugenio (2026-11-09) pide un CUARTO diseño para cada mes, que será el favorito y el que se
imprima. Cambia el enfoque y cambia el estilo.

## 1. El enfoque: ya no dos mundos, solo el bien en su máximo ideal

«En vez de hacer dos mundos como el bien y el mal, una ilustración centrada en el bien,
entendido como su máximo ideal e inspiración, la propuesta que puedas hacer para ese mes.»

- NADA de mitad oscura, ni crítica, ni contraste luz/sombra moral. Una escena luminosa,
  feliz, que inspire a vivir ese tema mejor.
- Una escena con una idea central clara que se lee en tres segundos; elegante, con AIRE
  (mucho espacio de papel), sin abarrotar.
- Personas felices haciendo, compartiendo, creando. Diversidad natural de edades y orígenes.

## 2. El estilo: artesanal, acuarela y lápices de colores

«Que no sea tan artificial y digital, tan vectorial: un estilo artesanal de acuarela, de
lápices de colores, de transiciones suaves, de colores cálidos, donde se note la pincelada
y haya mucha armonía, elegancia, simplicidad y aire.»

Lo que tiene que verse:
- **Papel de acuarela**: textura de grano frío visible en toda la imagen; zonas de papel
  blanco/crema SIN pintar que respiran (bordes que se desvanecen, viñeta suave hacia el papel).
- **Aguadas transparentes** que se superponen (veladuras: los colores se multiplican, no se tapan).
- **Bordes húmedos**: el pigmento se acumula más oscuro en el borde de cada mancha; bordes
  irregulares, nunca geométricos ni perfectos; alguna floración (bloom) y colores que se
  mezclan en húmedo.
- **Granulación** sutil del pigmento.
- **Lápiz de color** encima para el dibujo y los detalles: trazos finos, sueltos, con
  textura del papel, en sepia/siena/colores (NUNCA contorno negro de pegatina).
- Paleta **cálida y armoniosa** (ocres, sienas, rosas, corales, verdes salvia, azules suaves),
  pocas tintas por imagen.
- Nada de degradados digitales lisos, nada de formas vectoriales planas, nada de grano
  uniforme tipo ruido.
- Figuras: dibujo de ilustración de libro ilustrado de calidad, caras sencillas y tiernas
  (ojos, mejillas sonrosadas, gestos), proporciones creíbles. Mejor pocas figuras bien
  dibujadas que muchas mal.
- NINGUNA letra, número ni palabra dentro de la ilustración (los textos van fuera, en la hoja).

Técnica recomendada (libre): Python + numpy + PIL generando un RASTER (no SVG): cada forma
como máscara → bordes desplazados con ruido (irregulares) → relleno con densidad de pigmento
modulada por ruido de baja frecuencia → oscurecer el borde (máscara − máscara difuminada) →
granulación (ruido fino) → fusión por MULTIPLICACIÓN sobre el papel (veladuras) → papel con
textura (ruido + relieve) → trazos de lápiz como muchas líneas finas temblorosas con textura.
Trabaja a 1485×850 para iterar; la versión final a 3508×2008 (misma proporción).

## 3. Enlazar la imagen con el texto de los días

«Que haya coherencia entre la ilustración y el texto: si un día dice que las espinacas son
importantes para tal vitamina, que aparezca ilustrado ese concepto de forma artística, para
fijar ese conocimiento.»

- Lee las frases de los días del mes (`dias` en el JSON del mes) y elige 3–5 que se puedan
  DIBUJAR dentro de la escena de forma natural (no como infografía). Dibújalas.
- Escribe al lado un fichero `mes-XX-d-datos.json` con la lista:
  `[{"dia": 14, "frase": "…", "como_aparece": "…"}]`. Si quieres dibujar un dato que no está en
  los días, añádelo con `"dia": null` y una frase propuesta (≤ 55 caracteres, dato cierto);
  otro equipo ajustará los días para que coincidan.

## 4. Ideas por mes (Eugenio dio algunas; si se te ocurre algo mejor, hazlo mejor)

1. **Cosmos y Vida** — la maravilla de estar vivos en el universo: personas tumbadas en un
   prado lleno de vida y luciérnagas bajo una Vía Láctea de acuarela.
2. **Relaciones** (idea de Eugenio) — un CORAZÓN REALISTA, con forma de músculo, muy luminoso,
   que late pleno y enamorado y que ES un hogar: ventanitas encendidas en él, un hilo rojo que
   lo recorre y une a personas, juego, gestos amorosos, algo de magia. Todo dentro de ese
   corazón. Tierno, no anatómico-médico: anatomía real tratada con delicadeza.
3. **Agua** — agua viva y compartida: un manantial o río limpio donde la gente se baña y juega,
   el ciclo del agua visible con delicadeza.
4. **Bosque y Naturaleza** — un bosque exuberante y diverso, gente plantando y cuidando,
   niños subidos a un árbol, la red de micelio bajo tierra, fauna.
5. **Arte** (idea de Eugenio) — destacar las artes manuales y la creación artesanal: gente
   bailando muy feliz, modelando barro, tejiendo, pintando, tocando música, construyendo con
   sus manos, y COMPARTIENDO lo que crean.
6. **Tecnología y Energía** — la técnica al servicio de la vida: un pueblo con sol y viento,
   un taller de reparación comunitario, bicicletas, manos que arreglan cosas juntas.
7. **Hogar y Vivienda** — un patio de vivienda cooperativa con huerto, vecinos que comparten,
   niños jugando, tejados verdes.
8. **Salud y Bienestar** — un amanecer en la naturaleza: caminar, estirarse, nadar, una comida
   sana compartida, luz natural, descanso.
9. **Economía** (idea de Eugenio) — una plaza de pueblo muy bonita con un mercado ideal: gente
   feliz intercambiando bienes y productos artesanos, mucha variedad, luminosidad. Una moneda
   con un SÍMBOLO de libertad (un pájaro en vuelo), sin letras.
10. **Alimentación** (idea de Eugenio) — un mercadito tradicional o una NEVERA muy bonita,
    artística y de colores, abierta, con productos de calidad, locales, de huerto: verduras,
    fruta, huevos, lácteos, algún pescado, ecológico. NO la típica nevera de libro de biología:
    los alimentos tienen caritas y personalidad, interactúan y hacen guiños a los alimentos con
    los que combinan. OJO al dato: las lentejas fijan mejor el hierro con vitamina C (pimiento,
    limón, tomate), y con el arroz forman una proteína completa: dibújalas abrazadas al
    pimiento o al limón y de la mano del arroz. Enlázalo con los días.
11. **Política** — una asamblea bajo un gran árbol en la plaza: todas las edades en corro,
    escuchándose, decidiendo juntas con las manos alzadas.
12. **Valores** — la bondad cotidiana: personas de todos los orígenes alrededor de una mesa
    larga bajo farolillos, manos que se ayudan, un puente que se construye entre todos.

## 5. Formato y entrega

- Raster final 3508×2008 px, guardado como JPG calidad 90 en
  `/home/claude/humanity-wiki/public/calendario-arte/ilustraciones/mes-XX-d.jpg`, y miniatura
  de 900 px de ancho en `/home/claude/humanity-wiki/public/calendario-arte/miniaturas/mes-XX-d.jpg`.
- Mientras iteras: 1485×850 en
  `/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/disenos4/mes-XX-d.png`.
  Míralo con Read (y recortes ampliados) en cada ronda; al menos tres rondas.
- El generador Python en
  `/home/claude/humanity-wiki/design/calendario-arte/generadores/diseno4/` (un script por mes y
  la biblioteca común de acuarela), con rutas de salida como argumentos o relativas.
- El fichero de datos `mes-XX-d-datos.json` en esa misma carpeta de generadores.
- No toques otros ficheros del repositorio. No hagas commits.
- La máquina va justa de memoria: libera arrays grandes, trabaja en float32, y no renderices
  a 3508 hasta que la versión de 1485 esté aprobada.

## 6. Referencia de estilo: Sonja Wimmer (2026-11-09, Eugenio)

Eugenio pide tomar como REFERENCIA el estilo de la ilustradora Sonja Wimmer (Barcelona;
«The Word Collector / La coleccionista de palabras», medalla de oro). Inspirarse en sus
cualidades, NUNCA copiar sus imágenes, personajes ni composiciones concretas. Lo que define
su manera de pintar y lo que hay que traer al Diseño 4, junto a la acuarela y el lápiz:

- **Luz mágica y cálida**: escenas luminosas, de ensueño, con objetos que brillan desde
  dentro (como faroles o tarros con luz) y un resplandor dorado que envuelve la escena.
- **Realismo mágico tierno**: lo cotidiano se vuelve maravilloso; elementos que flotan,
  vuelan o se transforman (pelo que se vuelve olas o pájaros, cintas, pétalos, chispas),
  pero con lógica emocional, nunca absurdos.
- **Textura pictórica rica y uniforme** en toda la página: capas de pintura, papel, algo de
  collage o papel recortado; superficies con grano y matices, nunca planas.
- **Figuras expresivas y entrañables**: personajes algo estilizados (cuello y extremidades
  finos y largos, cabezas con mejillas sonrosadas, ojos expresivos y cálidos), gestos
  vivos, alegría y un punto juguetón.
- **Perspectivas audaces**: planos muy cercanos, vistas desde arriba (balcón) o desde
  abajo (gusano), que dan movimiento y emoción, sin perder la claridad.
- **Paleta**: dorados, ocres y corales cálidos con contrapunto de azules verdosos profundos
  (teal) y rosados; armonía de pocos colores bien elegidos.
- **Atmósfera**: tierna, poética, optimista, con sensación de cuento ilustrado europeo.

Mantén además todo lo anterior: acuarela creíble y lápiz de color, mucho aire, simplicidad,
una idea central clara y ninguna letra.

## 7. Fondo blanco hueso, contraste alto, detallitos y silencio (2026-11-09, Eugenio)

Imagen de referencia que envió Eugenio (una doble página de un álbum ilustrado; mírala con
Read): `/tmp/claude-0/-home-claude/8eedf981-a923-582a-a454-bf675a620bf7/scratchpad/referencia/referencia-eugenio.jpg`.
Es REFERENCIA de recursos y de calidad, no un modelo para copiar: ninguna ilustración puede
reproducir su composición (la mano-bosque, el bebé en la burbuja, la mano-cosmos).

Lo que pide Eugenio, con sus palabras resumidas:
- **Fondo blanco hueso / blanco roto** en TODAS las ilustraciones, exactamente
  **RGB (244, 239, 228)** (#F4EFE4), el mismo que tendrá la hoja del calendario, para que la
  ilustración y la parte de texto no desentonen. Nada de cielos o fondos pintados de borde a
  borde: los elementos flotan sobre el papel hueso.
- **Contraste muy alto** entre ese fondo claro y los elementos, que tienen que ser mucho más
  **vivos y coloridos**, con **muchos detallitos y texturas en su interior** (flores, hojas,
  puntitos, estrellas, peces diminutos, rayitas de lápiz), todo muy artesanal.
- **Pero con silencio**: grandes espacios donde solo se ve el fondo, para que la mirada
  abarque el conjunto. Uno se puede perder en un detalle (una libélula que flota, unos
  planetas y estrellitas sueltas), pero la imagen respira.
- **Recursos mágicos que integran naturaleza, ser humano y cosmos**: una parte del cuerpo que
  ES un bosque o un jardín, una forma que es a la vez cosmos y océano, algo muy familiar y
  humano (un rostro dormido, unas manos, un abrazo) junto a lo mágico. Así se consiguen
  imágenes de 10.
- La referencia sirve en especial para **Cosmos y Vida** (origen de la vida y del universo):
  haz una composición PROPIA con esos recursos (p. ej. otra figura y otros elementos), no la
  de la foto.

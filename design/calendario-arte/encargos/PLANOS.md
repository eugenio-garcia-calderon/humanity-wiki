# Ilustraciones por planos de profundidad — la regla desde el 2026-11-15

Eugenio, 2026-11-15:

> «Quiero que a partir de ahora todas las ilustraciones que te pidamos utilices al menos
> entre 3 y 5 planos y capas de profundidad para que los diseños sean un poco más compuestos
> entre lo que está en primer plano y lo que está de fondo […] rellenando un poco más la
> imagen en su composición global para que haya detallitos que estén igual ocultos porque
> están más en el fondo pero que son igualmente importantes y están bien ilustrados. También
> juega con las luces para que haya luces y sombras y diferentes iluminaciones según los
> elementos […] que pongas unos delante de otros y que eso sea lo más realista. Genera un bot
> que evalúe tu trabajo y te dé mejoras.»

La referencia que dio fue la portada de un juego de mesa de un bosque a contraluz. Sirve como
ejemplo de **cómo** se construye la profundidad, no para copiar nada. Los primeros meses
hechos así son mayo y junio (diseño 5: `mes-05-e`, `mes-06-e`).

Esta regla **cambia** la del Diseño 4 de «mucho aire, mucho papel sin pintar»: la imagen
ahora se llena. Lo que se mantiene es el borde, que sigue fundiéndose con el papel hueso del
calendario.

## Lo que tiene que tener cada ilustración

1. **De 3 a 5 planos que se distingan de verdad.** Dos planos se separan cuando hay al menos
   dos de estas señales: tamaño, superposición (uno tapa al otro), aire (lo lejano más
   claro, menos contrastado y del color del aire), nitidez y valor.
   - **1 · Primer plano que enmarca**: cerca del espectador, en sombra o a contraluz,
     cortado por el borde (hierbas, hojas, una rama, una maceta, una mesa…). Más oscuro que
     el resto y con un filo de luz.
   - **2 · Los protagonistas**: a todo color, con todo el detalle.
   - **3 · El plano medio**: el lugar donde pasa la escena, con un poco de aire.
   - **4 y 5 · El fondo**: mucho aire, más claro y suave, del color de la luz.
2. **Detalles escondidos y bien dibujados** en los planos 3 y 4, que se descubren en el
   segundo vistazo (en junio, un tren solar sobre un puente, colmenas o un pueblo lejano con
   su iglesia reflejada en el lago; en mayo, un teatrillo de títeres, un gato, dibujos de
   tiza o dos vecinos en un café).
3. **Luz con una dirección clara**, la misma en toda la imagen:
   - la fuente se ve o se adivina (un sol, una ventana, unos farolillos);
   - cada cosa tiene su lado de sombra y su filo de luz en el lado que mira a la luz;
   - las cosas apoyadas tienen sombra proyectada, que cae en el lado contrario a la luz;
   - los rayos de luz pasan entre planos, con polvo o polen brillando en ellos;
   - las luces propias (bombillas, pantallas, farolillos) iluminan lo que tienen cerca.
4. **Una idea que se lee en tres segundos**, aunque la imagen esté más llena.
5. Lo de siempre: acuarela y lápiz de color, figuras de libro ilustrado, ninguna letra ni
   número, nada importante en la zona de los botones de la web (arriba a la izquierda,
   x 31-647, y 31-135).

## Cómo se hace

Con `generadores/diseno4/planos.py`. Cada elemento se pinta solo en una hoja limpia, se
convierte en una pieza con transparencia y recibe el tratamiento de su plano (aire, sombra,
filo de luz, sombra proyectada) antes de ponerse encima del resto. La imagen final **es** la
pila de piezas, y esas mismas piezas son las que se pueden mover en la web. El detalle
técnico está en el `README.md` de la carpeta de ilustraciones.

## El evaluador

`.claude/agents/evaluador-ilustraciones.md` es el bot que pidió Eugenio: un director de arte
ciego que no ha visto cómo se hizo la imagen. Juzga los planos, la luz, los detalles del
fondo, las figuras y el estilo. Devuelve una nota por criterio y hasta ocho mejoras concretas,
con coordenadas. **Cada ilustración pasa por él al menos dos veces** antes de darse por
buena. En la segunda ronda también dice si se hizo lo que pidió en la primera.

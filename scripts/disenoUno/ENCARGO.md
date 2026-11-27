# Encargo: ilustraciones de las herramientas de Luz & Humanidad (Diseño 1 de luzhumanidad.com)

Eres ilustrador/a de interfaz de primer nivel. Luz & Humanidad es un laboratorio de innovación (energía solar, movilidad
ultraligera, vivienda ecológica, política, economía…). Su portada nueva («Diseño 1») presenta cada herramienta en una
tarjeta: arriba una ILUSTRACIÓN, debajo título y subtítulo. Eugenio, el fundador, quiere «sacar pecho» de cada
herramienta: que la ilustración haga entender de un vistazo su valor, con calidad profesional, nivel de arte muy alto.
NADA de fotos ni retratos de personas reales.

## Referencia de estilo obligatoria
Lee `src/components/politica/VisualesHerramientas.tsx`: las 5 ilustraciones de Política son la referencia (ver
`/tmp/disenoUno/VisualGeometria.png` como ejemplo renderizado). Mismo lenguaje:
- SVG en React/TSX, dibujado a mano con formas limpias, colores Tailwind por clase (`fill-sky-500`, `stroke-slate-300`…),
  opacidades suaves, trazos finos, algo de texto pequeño en mayúsculas espaciadas como rótulo (`text-[9px] uppercase
  tracking-[0.14em] fill-slate-500`) y, si ayuda, una cifra o dato real destacado en negrita.
- Representa LO QUE LA HERRAMIENTA HACE O MUESTRA (su mecanismo, su dato clave, su objeto), no un icono plano genérico.
  Ejemplos: el autoconsumo remoto = tejados solares lejanos que envían energía a casas de un pueblo por la red, con un
  contador repartiendo kWh; el barco solar = la embarcación con techo de paneles en un río amazónico con 20 asientos…
- Composición equilibrada, aire alrededor, profundidad sutil (capas, sombras suaves con opacidad), paleta armónica de
  2-3 tonos principales + neutros slate. Que se lea a tamaño pequeño.
- Personas solo como siluetas sencillas y amables si hacen falta (sin caras detalladas). Sin logos de marcas.

## Formato técnico (obligatorio)
- Cada ilustración es un componente exportado `export function VisualXxx()` que devuelve un `<svg viewBox="0 0 320 128"
  className="h-full w-full" role="img" aria-label="…descripción en español…">`. La tarjeta muestra la imagen a 360×144 px
  (proporción 2,5:1): diseña para ese encuadre apaisado y bajo.
- Exporta también `export const FONDOS: Record<string, string>` con el fondo de la cabecera de cada tarjeta, en clases
  Tailwind tipo `bg-gradient-to-br from-amber-50 via-white to-sky-50` (como `acento.fondo` en PoliticaHerramientas.tsx).
- Ids internos de SVG (gradientes, clipPath, marker) con prefijo único por ilustración, p. ej. `du-barco-…`.
- Solo clases Tailwind completas y literales (no construidas con plantillas), o colores en `fill`/`stroke` directos si
  necesitas un tono exacto. Sin dependencias nuevas. Animación opcional y sutil con `group-hover:` (la tarjeta es `group`).
- Nada de imágenes externas, nada de `<foreignObject>`.
- TypeScript limpio: `npx tsc --noEmit -p .` sin errores nuevos en tu archivo.

## Cómo ver lo que dibujas (hazlo en cada iteración)
Desde /home/claude/humanity-wiki, con TU carpeta propia (no uses `dist/`, otros trabajan a la vez):
```
npx vite build --outDir /tmp/dist-<grupo> --emptyOutDir > /tmp/vb-<grupo>.log 2>&1      # ~50 s, compila las clases Tailwind nuevas
DIST=/tmp/dist-<grupo> OUT=/tmp/du-<grupo> npx tsx --tsconfig tsconfig.json scripts/disenoUno/render.tsx components/sitio/disenoUno/visuales/<grupo>.tsx VisualA VisualB …
OUT=/tmp/du-<grupo> python3 scripts/disenoUno/shoot.py
```
y mira cada `/tmp/du-<grupo>/<Visual>.png` con la herramienta Read. Haz AL MENOS 3 rondas: dibuja, mira, critica como un
director de arte exigente (¿se entiende el valor en 2 segundos?, ¿equilibrio?, ¿calidad comparable a las de Política?,
¿texto legible?, ¿nada recortado ni pegado al borde?) y mejora. No edites ningún otro archivo del repositorio.

## Al terminar
Responde en ≤12 líneas: los componentes exportados (nombre → herramienta), qué representa cada uno, y las rutas de los PNG finales.

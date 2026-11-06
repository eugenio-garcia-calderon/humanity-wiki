# Generadores de las ilustraciones (Diseño 3)

El código en Python que dibujó cada SVG de `../ilustraciones-fuente/mes-XX-c.svg`,
guardado para que el dibujante automático (`../DIBUJANTE.md`) pueda reutilizar sus
motores de figuras, cabezas, manos y pintura en lugar de empezar de cero.

- `meses-01-03/` — `comun3.py` (cabezas de perfil y de frente, bustos, manos), `pinta.py`
  (pinceladas, grano de pared), `m01c.py` … `m03c.py`.
- `meses-04-06/` — `fig.py` (cabezas de perfil, extremidades, manos, puño), `m04.py` … `m06.py`.
- `meses-07-12/` — `fig.py` (motor de figuras de perfil), `figura.py` (frente, espaldas,
  torso, brazo, mano), `m07c.py` … `m09c.py`, `m10.py` … `m12.py`.

Las rutas de salida dentro de los scripts apuntan a la carpeta de trabajo de la sesión
que los escribió (`/tmp/...`): cámbialas antes de ejecutarlos. Cada carpeta lleva su
propia copia de `comun.py`/`pinta.py` porque cada ilustrador ajustó la suya (por
ejemplo, el grano).

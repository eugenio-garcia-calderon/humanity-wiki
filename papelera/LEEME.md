# La papelera del código

Aquí cae lo que se retira del proyecto. Cada carpeta es el día en que se retiró
y guarda dentro la **ruta original** de cada fichero, para poder devolverlo a su
sitio sin adivinar de dónde salió.

- Lo que tiene más de **30 días** se puede borrar con
  `node scripts/papelera.mjs vaciar`, en una PR como cualquier otro cambio.
  (Hasta el 2026-10-05 lo intentaba una tarea diaria de GitHub, pero la rama
  principal sólo admite cambios por PR, así que fallaba cada día y mandaba un
  correo de «Run failed». Se quitó.)
- Para rescatar algo: muévelo de vuelta a la ruta que tiene dentro de su carpeta.
- Y aunque se vacíe, **nada se pierde del todo**: cada movimiento es un commit,
  así que el historial de git sigue teniéndolo.

Órdenes, si hace falta a mano:

```bash
node scripts/papelera.mjs mover src/components/juego/Ficus.tsx
node scripts/papelera.mjs vaciar --seco   # enseña qué borraría, sin borrarlo
```

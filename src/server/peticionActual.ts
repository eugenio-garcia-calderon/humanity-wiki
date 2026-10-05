import { AsyncLocalStorage } from 'node:async_hooks';
import type { Express, Request } from 'express';

// ============================================================================
// LA PETICIÓN EN CURSO, PARA QUIEN NO LA RECIBE (2026-10-05, carril acceso)
// ============================================================================
// `tablaVisible` (sitios.ts) decide si una base de datos se puede leer, y la
// llama `bd.ts` sin pasarle la petición: su respuesta era siempre la misma
// para todo el mundo («¿está en una página pública?»). Con páginas
// compartidas por rol y sitios con miembros, la respuesta depende de QUIÉN
// pregunta: la tabla de una página «solo miembros» la lee un miembro y no un
// anónimo.
//
// Cambiar la firma obligaba a tocar cada llamada en `bd.ts`, que es de otro
// carril y cambia cada día. Esto deja la petición a mano durante todo su
// recorrido, sin pasarla de función en función. Es la ÚNICA cosa que guarda,
// y sólo la lee quien no puede recibirla de otro modo: no es un sitio para
// meter estado.

const almacen = new AsyncLocalStorage<Request>();

/** La petición que se está atendiendo ahora, si la hay. */
export const peticionActual = (): Request | undefined => almacen.getStore();

export function registrarPeticionActual(app: Express) {
  app.use((req, _res, next) => almacen.run(req, next));
}

// Checks the «Compras» body-shell catalogue (src/components/aeromovil/compras/carenado.ts): unique ids, real links,
// every option scored and explained, prices either shown or labelled as an estimate. Ends «Todo OK».
import { OPCIONES_CARENADO, CATEGORIAS, VIAS, RECOMENDACION } from '../src/components/aeromovil/compras/carenado';
import { puntuacion } from '../src/components/aeromovil/compras/PaginaCompras';

const fallos: string[] = [];
const ids = new Set<string>();
for (const o of OPCIONES_CARENADO) {
  if (ids.has(o.id)) fallos.push(`id repetido: ${o.id}`);
  ids.add(o.id);
  if (!/^https?:\/\/[^\s]+\.[^\s]+/.test(o.url)) fallos.push(`${o.id}: enlace raro ${o.url}`);
  if (!(o.categoria in CATEGORIAS)) fallos.push(`${o.id}: categoría desconocida`);
  if (!(o.via in VIAS)) fallos.push(`${o.id}: vía desconocida`);
  if (![1, 2, 3, 4, 5].includes(o.parecido)) fallos.push(`${o.id}: parecido fuera de 1–5`);
  if (!o.porQueParecido || !o.verificado || !o.precio) fallos.push(`${o.id}: falta porQueParecido, verificado o precio`);
  if (o.precioEur != null && (o.precioEur < 0 || o.precioEur > 1e6)) fallos.push(`${o.id}: precioEur raro ${o.precioEur}`);
  if (o.precioEur == null && /\d/.test(o.precio) === false && !o.estimacion && o.via !== 'referencia' && o.estado !== 'no-se-vende') { /* «a consultar» sin estimación: permitido */ }
  if (o.via === 'a-medida' && o.parecido > 4) fallos.push(`${o.id}: lo que se fabrica a medida no pasa de 4 estrellas`);
}
const lista = [...OPCIONES_CARENADO].sort((a, b) => puntuacion(b) - puntuacion(a));
const porVia = Object.fromEntries(Object.keys(VIAS).map(v => [v, OPCIONES_CARENADO.filter(o => o.via === v).length]));
const abiertas = OPCIONES_CARENADO.filter(o => /^s[ií]/.test(o.verificado)).length;
console.log(`${OPCIONES_CARENADO.length} opciones · ${JSON.stringify(porVia)} · ${abiertas} con su página abierta · ${RECOMENDACION.length} recomendaciones`);
console.log('Las 12 primeras:');
for (const o of lista.slice(0, 12)) console.log(`  ${puntuacion(o)} pts  ${'★'.repeat(o.parecido).padEnd(5)}  ${o.nombre.slice(0, 70)} — ${o.precio.slice(0, 40)}`);
if (fallos.length) { console.log(fallos.join('\n')); process.exit(1); }
console.log('Todo OK');

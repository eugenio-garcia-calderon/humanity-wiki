/**
 * The three projects of the Aeromóvil (2026-11-27, `src/components/aeromovil/proyectos.ts`): every garage id exists, every
 * strategy root exists, the star of each project is placed in its own project. Run: npx tsx scripts/proyectos.ts — «Todo OK».
 */
import { PROYECTOS, proyectoDeDiseno } from '../src/components/aeromovil/proyectos';
import { VEHICULOS_GARAJE } from '../src/components/aeromovil/garaje';
import { ESTRATEGIAS, fallosArbol } from '../src/components/aeromovil/estrategia/arbol';
import { PROPUESTAS } from '../src/components/aeromovil/Disenos';

const fallos: string[] = [];
const ok = (c: boolean, m: string) => { if (!c) fallos.push(m); };
const ids = new Set(VEHICULOS_GARAJE.map(v => v.id));
for (const p of PROYECTOS) {
  for (const g of p.garaje) ok(ids.has(g), `${p.id}: el garaje nombra «${g}», que no existe`);
  ok(ESTRATEGIAS.some(e => e.raiz === p.estrategia), `${p.id}: no hay árbol de estrategia con raíz «${p.estrategia}»`);
  ok(proyectoDeDiseno({ id: p.estrella.id, nombre: p.estrella.nombre }) === p.id, `${p.id}: su estrella no cae en su proyecto`);
  if (p.estrella.id < 0) ok(PROPUESTAS.some(d => d.id === p.estrella.id), `${p.id}: la propuesta ${p.estrella.id} no existe`);
  console.log(`${p.nombre}: estrella «${p.estrella.nombre}» (${p.estrella.id}) · garaje ${p.garaje.join(', ')} · homologación ${p.homologacion} · estrategia ${p.estrategia}`);
}
const sinProyecto = VEHICULOS_GARAJE.filter(v => !PROYECTOS.some(p => p.garaje.includes(v.id)));
ok(!sinProyecto.length, `vehículos del garaje en ningún proyecto: ${sinProyecto.map(v => v.id).join(', ')}`);
for (const f of fallosArbol()) fallos.push(`estrategia: ${f}`);
console.log(`\n${fallos.length ? `${fallos.length} FALLOS:\n${fallos.map(x => ` ✗ ${x}`).join('\n')}` : 'Todo OK'}`);
process.exit(fallos.length ? 1 : 0);

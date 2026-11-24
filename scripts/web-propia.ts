/**
 * The rule «a project's own web does not carry its parent site's bar» (2026-11-25, `components/sitio/barraDelSitio.ts`),
 * on the hosts that exist today. Run: `npx tsx scripts/web-propia.ts`. Ends «Todo OK».
 */
import { esWebPropiaDeProyecto } from '../src/components/sitio/barraDelSitio';

let fallos = 0;
const ok = (c: boolean, m: string) => { if (!c) { fallos++; console.log(`  ✗ ${m}`); } else console.log(`  ✓ ${m}`); };

const LYH = 'KWMUO4S4V663', AERO = 'KWMUQWKEQYOVMC', SOLAR = 'KWMWAFZMATPX', WIKIP = 'KWMVDTQQ35QI';
// the host opens `raizId`; the page belongs to the site whose root is `raizDelSitio`
ok(esWebPropiaDeProyecto(LYH, { raizId: AERO }, 'aeromovil.org') === true, 'aeromovil.org (abre Aeromóvil, que cuelga de Luz & Humanidad): web propia, sin barra');
ok(esWebPropiaDeProyecto(LYH, { raizId: LYH }, 'luzhumanidad.com') === false, 'luzhumanidad.com: lleva su barra');
ok(esWebPropiaDeProyecto(LYH, { raizId: LYH }, 'lighthumanity.org') === false, 'lighthumanity.org (el mismo sitio en inglés): lleva su barra');
ok(esWebPropiaDeProyecto(LYH, { raizId: LYH }, 'pt.lighthumanity.org') === false, 'pt.lighthumanity.org: lleva su barra');
ok(esWebPropiaDeProyecto(SOLAR, { raizId: SOLAR }, 'solarcrowd.com') === false, 'solarcrowd.com (su propio sitio): no cambia');
ok(esWebPropiaDeProyecto(LYH, { raizId: WIKIP }, 'wikiproducts.humanity.wiki') === false, 'un subdominio de la plataforma conserva la barra');
ok(esWebPropiaDeProyecto(LYH, { raizId: AERO }, 'humanity.wiki') === false, 'humanity.wiki conserva la barra');
ok(esWebPropiaDeProyecto(LYH, null, 'aeromovil.org') === false, 'sin sitio de anfitrión (editor, /@quien): conserva la barra');
ok(esWebPropiaDeProyecto(LYH, { raizId: null }, 'aeromovil.org') === false, 'anfitrión sin raíz (el espacio entero de alguien): conserva la barra');
ok(esWebPropiaDeProyecto(null, { raizId: AERO }, 'aeromovil.org') === false, 'página sin sitio: nada que quitar');
ok(esWebPropiaDeProyecto(LYH, { raizId: AERO }, '') === false, 'sin anfitrión (servidor): no decide');

console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo OK');
process.exit(fallos ? 1 : 0);

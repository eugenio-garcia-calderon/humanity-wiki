// ============================================================================
// QUE LA TABLA DE PERMISOS CASE LAS RUTAS QUE CREE QUE CASA (2026-08-22)
// ============================================================================
//     npx tsx scripts/probar-politica.ts
//
// La parte peligrosa de `politica.ts` no son los niveles, es la coincidencia:
// `/api/admin/users` y `/api/admin/users/:id/puntos` se parecen lo justo para
// que un patrón mal escrito aplique el permiso de una a la otra. Si eso pasa,
// el guardián protege la ruta equivocada y nadie se entera, porque el registro
// dirá que todo va bien.
import { politicaDe, POLITICA, cuentaSinRevisar } from '../src/server/seguridad/politica.js';

let fallos = 0;
const comprobar = (que: string, real: unknown, esperado: unknown) => {
  const bien = JSON.stringify(real) === JSON.stringify(esperado);
  if (!bien) { fallos++; console.log(`  ✗ ${que}\n      esperaba ${JSON.stringify(esperado)}, salió ${JSON.stringify(real)}`); }
  else console.log(`  ✓ ${que}`);
};

console.log('\nCOINCIDENCIA DE RUTAS');

comprobar('la ruta exacta gana a la que lleva parámetro',
  politicaDe('POST', '/api/admin/users')?.ruta, '/api/admin/users');

comprobar('una ruta con parámetro casa con un id real',
  politicaDe('POST', '/api/admin/users/U_ADMIN_EUGENIO/puntos')?.ruta, '/api/admin/users/:id/puntos');

comprobar('el método importa: DELETE no cae en la entrada de PUT',
  politicaDe('DELETE', '/api/finanzas/objetivos/OF123')?.m, 'DELETE');

comprobar('una ruta que no existe no casa con nada',
  politicaDe('POST', '/api/no/existe/nada'), undefined);

comprobar('la barra final no cambia el resultado',
  politicaDe('POST', '/api/incidencias/')?.ruta, '/api/incidencias');

comprobar('el parámetro no se come una barra: :id no casa con dos tramos',
  politicaDe('POST', '/api/admin/users/uno/dos/puntos'), undefined);

console.log('\nLA TABLA');
comprobar('no hay dos entradas para el mismo método y ruta',
  POLITICA.length, new Set(POLITICA.map((e) => `${e.m} ${e.ruta}`)).size);

comprobar('toda entrada revisada dice de qué tipo es',
  POLITICA.filter((e) => !e.guardia?.tipo).length, 0);

console.log(`\n  (${cuentaSinRevisar()} rutas siguen sin revisar por una persona)\n`);

if (fallos) { console.log(`✗ ${fallos} comprobación(es) mal.\n`); process.exit(1); }
console.log('✓ Todo correcto.\n');

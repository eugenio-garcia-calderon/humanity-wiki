// ============================================================================
// QUE EL CIFRADO CIFRE, Y QUE SEPA DECIR QUE ALGO NO CUADRA (2026-08-22)
// ============================================================================
//     npx tsx scripts/probar-cifrado.ts
//
// Lo que hay que demostrar de un cifrado no es que descifre —eso lo hace
// cualquiera— sino que **se niegue** cuando debe: dato tocado, llave que no es
// la suya, llave destruida. Un cifrado que devuelve algo raro en vez de fallar
// es peor que no tener ninguno.
//
// Corre con su propia llave maestra de mentira, sin tocar el `.env`.
import crypto from 'node:crypto';
process.env.CLAVE_MAESTRA = crypto.randomBytes(32).toString('base64');

const { cifrar, descifrar, estadoDe, DatoAlterado, hayClaveMaestra } = await import('../src/server/seguridad/cifrado.js');

let fallos = 0;
const comprobar = (que: string, bien: boolean, detalle = '') => {
  if (bien) console.log(`  ✓ ${que}`);
  else { fallos++; console.log(`  ✗ ${que}${detalle ? `\n      ${detalle}` : ''}`); }
};

const SECRETO = 'Informe reservado: 1.200.000 € · Consejería de Hacienda · 2026-08-22';

console.log('\nIDA Y VUELTA');
const { paquete, llaveEnvuelta } = cifrar(SECRETO);
comprobar('lo cifrado no contiene el texto', !paquete.includes('Hacienda') && !paquete.includes('1.200.000'));
comprobar('descifrar devuelve exactamente lo mismo', descifrar(paquete, llaveEnvuelta) === SECRETO);
comprobar('el mismo texto cifrado dos veces da paquetes distintos',
  cifrar(SECRETO).paquete !== cifrar(SECRETO).paquete,
  'si salieran iguales, se podría saber quién guarda lo mismo que quién sin descifrar nada');

console.log('\nSE NIEGA CUANDO DEBE');
const tocado = paquete.slice(0, -4) + (paquete.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA');
let salto = false;
try { descifrar(tocado, llaveEnvuelta); } catch (e) { salto = e instanceof DatoAlterado; }
comprobar('un dato tocado no se descifra: da ALTERADO, no basura', salto);

const otra = cifrar('otra cosa');
salto = false;
try { descifrar(paquete, otra.llaveEnvuelta); } catch (e) { salto = e instanceof DatoAlterado; }
comprobar('con la llave de otro dato tampoco', salto);

console.log('\nLAS CUATRO RESPUESTAS');
comprobar('un dato sano: LEGIBLE', estadoDe(paquete, llaveEnvuelta) === 'LEGIBLE');
comprobar('un dato tocado: ALTERADO', estadoDe(tocado, llaveEnvuelta) === 'ALTERADO');
comprobar('sin su llave (borrado del RGPD): BORRADO', estadoDe(paquete, null) === 'BORRADO');

const guardada = process.env.CLAVE_MAESTRA;
delete process.env.CLAVE_MAESTRA;
comprobar('sin llave maestra dice que no sabe, no que esté mal', estadoDe(paquete, llaveEnvuelta) === 'NO_SE');
comprobar('y lo dice también antes de intentarlo', hayClaveMaestra() === false);
process.env.CLAVE_MAESTRA = guardada;

console.log('');
if (fallos) { console.log(`✗ ${fallos} comprobación(es) mal.\n`); process.exit(1); }
console.log('✓ Todo correcto.\n');

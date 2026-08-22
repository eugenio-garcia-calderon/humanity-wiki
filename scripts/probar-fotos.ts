/**
 * ¿Se sube cada foto UNA vez?
 *
 * La pregunta que esto contesta no es «¿se ve la imagen?» —eso se ve mirando—
 * sino «¿cuántas veces la pedimos?», que es lo que costaba 690 MB en el mundo
 * 3D y no se ve mirando, porque las copias se ven exactamente igual.
 *
 *   node --env-file=.env node_modules/.bin/tsx scripts/probar-fotos.ts
 */
import * as THREE from 'three';

// Se cambia el cargador de verdad por uno de mentira ANTES de importar el
// módulo: así se cuenta cuántas veces se pide cada URL sin tocar la red.
const pedidas: string[] = [];
const pendientes: Record<string, { ok: (t: any) => void; mal: () => void }> = {};
(THREE.TextureLoader.prototype as any).load = function (
  url: string, ok: (t: any) => void, _p: unknown, mal: () => void,
) {
  pedidas.push(url);
  pendientes[url] = { ok, mal };
  return {} as any;
};

const { pedirFoto, fotosEnMemoria, liberarTexturas } = await import('../src/components/juego/texturas.js');

let fallos = 0;
const comprobar = (que: string, real: unknown, esperado: unknown) => {
  const bien = JSON.stringify(real) === JSON.stringify(esperado);
  if (!bien) fallos++;
  console.log(bien ? '  ok  ' : ' FALLA', que, bien ? '' : `→ esperaba ${JSON.stringify(esperado)}, llegó ${JSON.stringify(real)}`);
};

console.log('\nLa misma foto en tres sitios');
let avisos = 0;
pedirFoto('/gato.jpg', () => avisos++);
pedirFoto('/gato.jpg', () => avisos++);
pedirFoto('/gato.jpg', () => avisos++);
comprobar('se pide una sola vez', pedidas.length, 1);
comprobar('los tres siguen esperando', avisos, 0);

pendientes['/gato.jpg'].ok({ colorSpace: '', dispose() {} });
comprobar('al llegar, avisa a los tres', avisos, 3);
comprobar('y queda una foto en memoria', fotosEnMemoria(), 1);

console.log('\nUn cuarto sitio que llega tarde');
let tarde = 0;
pedirFoto('/gato.jpg', () => tarde++);
comprobar('no vuelve a pedirla', pedidas.length, 1);
comprobar('y le contesta ya', tarde, 1);

console.log('\nUna foto que no existe');
let malos = 0;
pedirFoto('/no-esta.jpg', () => malos++);
pendientes['/no-esta.jpg'].mal();
comprobar('avisa al que esperaba', malos, 1);
pedirFoto('/no-esta.jpg', () => malos++);
comprobar('y no se vuelve a pedir nunca', pedidas.filter(u => u === '/no-esta.jpg').length, 1);
comprobar('no cuenta como foto en memoria', fotosEnMemoria(), 1);

console.log('\nEl que se va antes de que llegue');
let fantasma = 0;
const baja = pedirFoto('/lento.jpg', () => fantasma++);
baja();
pendientes['/lento.jpg'].ok({ colorSpace: '', dispose() {} });
comprobar('no se avisa a quien ya no está', fantasma, 0);
comprobar('pero la foto sí se guarda', fotosEnMemoria(), 2);

console.log('\nAl salir del juego');
const soltadas = liberarTexturas();
comprobar('se sueltan las fotos', fotosEnMemoria(), 0);
comprobar('y se dice cuántas', soltadas >= 2, true);
pedirFoto('/gato.jpg', () => {});
comprobar('después se vuelve a pedir de cero', pedidas.filter(u => u === '/gato.jpg').length, 2);

console.log(fallos ? `\n${fallos} comprobaciones FALLAN\n` : '\nLas 12 comprobaciones pasan\n');
process.exit(fallos ? 1 : 0);

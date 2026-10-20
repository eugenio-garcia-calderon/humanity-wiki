// Comprobación de `unir` (2026-10-20): `npx tsx src/server/voz/unir.prueba.ts`. Casos medidos con el transcriptor real.
import { unir } from './unir';
const casos: Array<[string, string, string, string]> = [
  ['frase nueva', 'Hola.', 'Ahora estoy', 'Hola. Ahora estoy'],
  ['primera', '', 'Hola, esto', 'Hola, esto'],
  ['acumulado exacto', 'Hola, esto es una prueba.', 'Hola, esto es una prueba. Ahora sigo', 'Hola, esto es una prueba. Ahora sigo'],
  ['acumulado con palabra corregida', 'Quiero crear una página nueva para el proyecto de bicicletas solares.', 'Quiero crear una página nueva para el proyecto de bici solares que estamos montando', 'Quiero crear una página nueva para el proyecto de bici solares que estamos montando'],
  ['repite la última frase cerrada', 'Hola, qué tal. Esto es una prueba del dictado.', 'Esto es una prueba del dictado.', 'Hola, qué tal. Esto es una prueba del dictado.'],
  ['repite la frase y sigue', 'Hola, qué tal. Esto es una prueba', 'Esto es una prueba del dictado de hoy', 'Hola, qué tal. Esto es una prueba del dictado de hoy'],
  ['en curso tras cerrar (misma frase)', 'Uno dos tres. Hola, esto es una prueba de la plataforma.', 'Hola, esto es una prueba de la plataforma.', 'Uno dos tres. Hola, esto es una prueba de la plataforma.'],
  ['acumulado de la sesión con comas cambiadas, tres veces', 'Me gustaría que la IA me ayude, explicando por qué es importante.', 'Me gustaría que la IA me ayude explicando por qué es importante. También', 'Me gustaría que la IA me ayude explicando por qué es importante. También'],
  ['palabra corta suelta no se come nada', 'La tercera frase habla del tiempo en', 'Il', 'La tercera frase habla del tiempo en Il'],
  ['corte a mitad de palabra', 'Quiero crear una página para la', 'la sostenible en las ciudades', 'Quiero crear una página para la sostenible en las ciudades'],
];
let ok = 0;
for (const [nombre, a, b, esperado] of casos) {
  const r = unir(a, b);
  const bien = r === esperado;
  if (bien) ok++;
  console.log(bien ? 'OK  ' : 'MAL ', nombre, bien ? '' : `\n     dio:      ${r}\n     esperado: ${esperado}`);
}
// Simulación: 4 reenvíos acumulados con revisiones → no debe crecer
let t = '';
for (const x of ['Hola, esto es una prueba.', 'Hola esto es una prueba. Sigo hablando', 'Hola, esto es una prueba. Sigo hablando de otra cosa.', 'hola esto es una prueba sigo hablando de otra cosa. Y otra']) t = unir(t, x);
console.log(t === 'hola esto es una prueba sigo hablando de otra cosa. Y otra' ? 'OK  ' : 'MAL ', 'cuatro reenvíos sin duplicar →', t);
console.log(`${ok}/${casos.length}`);
console.log(unir('', 'y otra cosaCambia el título') === 'y otra cosa Cambia el título' ? 'OK   palabras pegadas' : 'MAL  palabras pegadas: ' + unir('', 'y otra cosaCambia el título'));
console.log(unir('', 'mi iPhone nuevo') === 'mi iPhone nuevo' ? 'OK   iPhone intacto' : 'MAL  iPhone');
console.log(unir('', 'al 50Por último') === 'al 50 Por último' ? 'OK   número pegado' : 'MAL  número pegado');

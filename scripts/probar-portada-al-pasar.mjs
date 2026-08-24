// ============================================================================
// LA PORTADA AL PASAR EL RATÓN (2026-08-24, Programador 8)
// ============================================================================
//   BASE=http://localhost:3009 node scripts/probar-portada-al-pasar.mjs
//
// Eugenio: «se empieza a reproducir, pero no se escucha… aparecen los botones
// de pausa, adelante y atrás y el título que tapan la imagen… ponle el sonido
// activado por defecto, y haz que se amplíe».
//
// LO IMPORTANTE DE ESTA PRUEBA ES QUE MUEVE EL RATÓN. Los botones de YouTube no
// salen por estar encima: salen al MOVERSE por encima. Un `hover` que se queda
// quieto no los provoca, y por eso una prueba así puede pasar con el fallo
// intacto — que es exactamente lo que me pasó al mirarlo la primera vez.
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3009';
let fallos = 0;
const comprobar = (bien, texto) => { if (!bien) fallos++; console.log(`${bien ? '✅' : '❌'} ${texto}`); };

const nav = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const p = await (await nav.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
try {
  await p.request.post(`${BASE}/api/auth/register`, {
    data: { email: `port${Date.now()}@prueba.local`, password: 'Prueba1234!', name: 'Portada' },
  });
  await p.goto(`${BASE}/explorar`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(6000);

  // UN CLIC PRIMERO, y es parte de la prueba, no una preparación.
  // Sin ningún clic previo, Chrome no ignora el intento de quitar el silencio:
  // **pausa el vídeo**. El código lo comprueba con `navigator.userActivation` y
  // no lo intenta. Así que para probar el sonido hay que estar en la situación
  // real: alguien que ya ha usado la página.
  await p.mouse.click(750, 60);
  await p.waitForTimeout(400);

  const conVideo = p.locator('div.relative.aspect-video').filter({ has: p.locator('svg.lucide-play') }).first();
  comprobar(await conVideo.count() > 0, 'Hay una tarjeta con vídeo de portada');

  const caja = await conVideo.boundingBox();
  await p.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await p.waitForTimeout(4000);

  // EL MOVIMIENTO, que es lo que provocaba los botones.
  for (let i = 0; i < 12; i++) {
    await p.mouse.move(caja.x + 40 + i * 18, caja.y + 40 + (i % 4) * 22);
    await p.waitForTimeout(120);
  }
  await p.waitForTimeout(2500);

  const marco = await p.evaluate(() => {
    const i = document.querySelector('iframe[src*="youtube"]');
    if (!i) return null;
    const cs = getComputedStyle(i);
    return { pointerEvents: cs.pointerEvents, src: i.getAttribute('src') };
  });
  comprobar(Boolean(marco), 'El vídeo arranca al pasar el ratón');
  comprobar(marco?.pointerEvents === 'none',
    `El ratón ATRAVIESA el reproductor (${marco?.pointerEvents}) — es lo que impide que YouTube saque su barra`);
  comprobar(/enablejsapi=1/.test(marco?.src || ''),
    'Se le puede hablar al reproductor, que es como se le quita el silencio');
  comprobar(/controls=0/.test(marco?.src || ''), 'Y va sin controles');

  // ¿Ha crecido? SE MIDE LA CAJA, no la propiedad CSS.
  //
  // La primera versión de esta prueba leía `transform` y decía «×1.00» con la
  // ampliación funcionando perfectamente: en esta versión de Tailwind, `scale`
  // es su propia propiedad de CSS y `transform` se queda en `none`. Medir los
  // píxeles de verdad no depende de con qué propiedad se haya escrito.
  const crecido = await p.evaluate(() => {
    const i = document.querySelector('iframe[src*="youtube"]');
    return i ? i.parentElement.getBoundingClientRect().width : 0;
  });
  comprobar(crecido > caja.width * 1.15,
    `El vídeo se amplía al reproducirse (${Math.round(caja.width)} → ${Math.round(crecido)} px)`);

  // Y el sonido: se le pregunta al propio reproductor de YouTube.
  const sonando = await p.evaluate(() => new Promise(res => {
    const i = document.querySelector('iframe[src*="youtube"]');
    if (!i) return res(null);
    const oir = e => {
      try {
        const d = JSON.parse(e.data);
        if (d.info && typeof d.info.muted === 'boolean') { window.removeEventListener('message', oir); res(d.info.muted); }
      } catch {}
    };
    window.addEventListener('message', oir);
    i.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
    setTimeout(() => res('sin respuesta'), 4000);
  }));
  comprobar(sonando === false,
    `SUENA: el propio reproductor dice que no está silenciado (silenciado=${sonando})`);
} finally {
  await nav.close();
}

console.log(fallos === 0 ? '\n✅ TODO PASA' : `\n❌ ${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);

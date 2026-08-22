#!/usr/bin/env tsx
// ============================================================================
// ¿RETRANSMITE DE VERDAD? (2026-08-22, Programador 8)
// ============================================================================
//   node --env-file=.env node_modules/.bin/tsx scripts/probar-turn-real.ts
//
// Todas las demás pruebas del TURN son de mentira a propósito: un Cloudflare
// fingido, informes inventados, fallos provocados. Sirven para lo que sirven,
// pero ninguna contesta la única pregunta que importa —**¿pasa audio por ahí?**—
// porque en una mesa no hay dos redes hostiles con las que provocar el caso.
//
// Esta sí la contesta, con un truco: `iceTransportPolicy: 'relay'` le prohíbe
// al navegador usar los dos peldaños gratis. Si con eso se conectan dos
// navegadores, es que Cloudflare está retransmitiendo de verdad. Es simular la
// red de empresa sin necesidad de tener una.
//
// Gasta unos kilobytes del cupo. El cupo es de un millón.
//
// Sin llaves configuradas no falla: dice que no hay nada que probar y se va.
import { chromium } from 'playwright';

const llave = process.env.CLOUDFLARE_TURN_KEY_ID;
const ficha = process.env.CLOUDFLARE_TURN_API_TOKEN;
if (!llave || !ficha) {
  console.log('⏭️  Sin CLOUDFLARE_TURN_KEY_ID / CLOUDFLARE_TURN_API_TOKEN: no hay TURN que probar.');
  process.exit(0);
}

const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${llave}/credentials/generate-ice-servers`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${ficha}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ ttl: 600 }),
});
if (!r.ok) { console.log(`❌ Cloudflare contestó ${r.status}`); process.exit(1); }
const { iceServers } = await r.json() as any;
console.log(`✅ Credencial recién hecha, ${iceServers.flatMap((s: any) => s.urls).length} direcciones`);

const navegador = await chromium.launch();
const pagina = await (await navegador.newContext()).newPage();
await pagina.goto('about:blank');

const resultado = await pagina.evaluate(async (servidores) => {
  // Dos navegadores en uno. `relay` en los dos: los peldaños 1 y 2 quedan
  // prohibidos, así que o pasa por Cloudflare o no pasa.
  const opciones = { iceServers: servidores, iceTransportPolicy: 'relay' as RTCIceTransportPolicy };
  const a = new RTCPeerConnection(opciones);
  const b = new RTCPeerConnection(opciones);
  a.onicecandidate = e => e.candidate && b.addIceCandidate(e.candidate);
  b.onicecandidate = e => e.candidate && a.addIceCandidate(e.candidate);

  const canal = a.createDataChannel('prueba');
  // `connected` de la conexión NO quiere decir que el canal esté abierto: el
  // canal va por dentro y tarda un poco más. Enviar antes revienta con
  // «readyState is not open», que fue lo que pasó al escribir esto.
  const canalAbierto = new Promise<boolean>(res => {
    canal.onopen = () => res(true);
    setTimeout(() => res(false), 10000);
  });
  const recibido = new Promise<string>(res => {
    b.ondatachannel = e => { e.channel.onmessage = m => res(String(m.data)); };
  });

  await a.setLocalDescription(await a.createOffer());
  await b.setRemoteDescription(a.localDescription!);
  await b.setLocalDescription(await b.createAnswer());
  await a.setRemoteDescription(b.localDescription!);

  const conectado = await Promise.race([
    new Promise<boolean>(res => { a.onconnectionstatechange = () => { if (a.connectionState === 'connected') res(true); if (a.connectionState === 'failed') res(false); }; }),
    new Promise<boolean>(res => setTimeout(() => res(false), 20000)),
  ]);
  if (!conectado) { a.close(); b.close(); return { conectado: false }; }

  if (!(await canalAbierto)) { a.close(); b.close(); return { conectado: true, canal: false }; }
  canal.send('hola desde el otro lado');
  const mensaje = await Promise.race([recibido, new Promise<string>(res => setTimeout(() => res(''), 8000))]);

  const informe = await a.getStats();
  let tipos = { local: '', remoto: '' }, bytes = 0;
  let pareja: any = null;
  informe.forEach((d: any) => { if (d.type === 'candidate-pair' && d.state === 'succeeded' && (d.selected || d.nominated)) pareja = d; });
  if (pareja) {
    tipos = {
      local: (informe.get(pareja.localCandidateId) as any)?.candidateType || '?',
      remoto: (informe.get(pareja.remoteCandidateId) as any)?.candidateType || '?',
    };
    bytes = (pareja.bytesSent || 0) + (pareja.bytesReceived || 0);
  }
  a.close(); b.close();
  return { conectado: true, canal: true, mensaje, tipos, bytes };
}, iceServers);

await navegador.close();

let fallos = 0;
const comprobar = (bien: boolean, texto: string) => { if (!bien) fallos++; console.log(`${bien ? '✅' : '❌'} ${texto}`); };

comprobar(resultado.conectado, 'Conectan estando prohibido todo lo que no sea retransmisión');
if (resultado.conectado) {
  comprobar(resultado.canal !== false, 'El canal de datos llega a abrirse a través del relé');
}
if (resultado.conectado && resultado.canal !== false) {
  comprobar(resultado.tipos!.local === 'relay' && resultado.tipos!.remoto === 'relay',
    `Los dos extremos van por Cloudflare (${resultado.tipos!.local} ↔ ${resultado.tipos!.remoto})`);
  comprobar(resultado.mensaje === 'hola desde el otro lado',
    `Los datos llegan enteros al otro lado ${resultado.mensaje ? `(«${resultado.mensaje}»)` : '(no llegó nada)'}`);
  comprobar((resultado.bytes || 0) > 0, `Ha circulado tráfico de verdad (${resultado.bytes} bytes)`);
}
console.log(fallos === 0 ? '\n✅ EL TURN RETRANSMITE DE VERDAD' : `\n❌ ${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);

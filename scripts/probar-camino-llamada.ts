#!/usr/bin/env tsx
// ============================================================================
// ¿SABE LA APLICACIÓN POR DÓNDE FUE UNA LLAMADA? (2026-08-22, Programador 8)
// ============================================================================
//   node_modules/.bin/tsx scripts/probar-camino-llamada.ts
//
// De los tres caminos que puede tomar una llamada, **solo uno cuesta dinero**.
// Clasificarlo mal en un sentido esconde una factura que crece; en el otro,
// asusta con un gasto que no existe. Se prueba con informes de mentira porque
// montar las seis situaciones con navegadores de verdad exige seis redes
// distintas —una con NAT simétrico incluida— y eso no se tiene en una mesa.
import { clasificarCamino } from '../src/telecom/motor';

const informe = (local: string | null, remoto: string | null, opciones: any = {}) => {
  const m = new Map<string, any>();
  if (opciones.sinPareja) {
    m.set('p1', { id: 'p1', type: 'candidate-pair', state: 'in-progress', nominated: false });
    return m;
  }
  m.set('p1', {
    id: 'p1', type: 'candidate-pair', state: 'succeeded',
    nominated: opciones.soloSelected ? false : true,
    selected: opciones.soloSelected ? true : undefined,
    localCandidateId: 'l', remoteCandidateId: 'r',
  });
  if (local) m.set('l', { id: 'l', type: 'local-candidate', candidateType: local });
  if (remoto) m.set('r', { id: 'r', type: 'remote-candidate', candidateType: remoto });
  return m;
};

const casos: Array<[string, Map<string, any>, string]> = [
  ['los dos en el mismo wifi',            informe('host', 'host'),   'local'],
  ['redes distintas, directo con STUN',   informe('srflx', 'srflx'), 'directo'],
  ['directo, con candidata descubierta',  informe('srflx', 'prflx'), 'directo'],
  ['yo retransmito, el otro no',          informe('relay', 'srflx'), 'retransmitida'],
  ['el otro retransmite, yo no',          informe('host', 'relay'),  'retransmitida'],
  ['los dos retransmiten',                informe('relay', 'relay'), 'retransmitida'],
  // Firefox marca `selected` y no `nominated`. Sin esta rama, todas las
  // llamadas desde Firefox saldrían como «desconocido» y la cuenta del gasto
  // se quedaría corta justo donde no se nota.
  ['Firefox, que dice «selected»',        informe('relay', 'relay', { soloSelected: true }), 'retransmitida'],
  ['ninguna pareja ha ganado todavía',    informe(null, null, { sinPareja: true }), 'desconocido'],
  ['el navegador no cuenta nada',         new Map(),                 'desconocido'],
];

let fallos = 0;
for (const [nombre, entrada, esperado] of casos) {
  const salida = clasificarCamino(entrada);
  const bien = salida === esperado;
  if (!bien) fallos++;
  console.log(`${bien ? '✅' : '❌'} ${nombre.padEnd(36)} → ${salida}${bien ? '' : ` (se esperaba ${esperado})`}`);
}
console.log(fallos === 0 ? '\n✅ TODO PASA' : `\n❌ ${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);

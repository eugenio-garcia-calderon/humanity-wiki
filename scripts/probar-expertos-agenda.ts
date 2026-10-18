// La agenda de los expertos (W6 Wikiproducts), sin base de datos:
//   npx tsx scripts/probar-expertos-agenda.ts
import { huecosLibres, limpiarDisponibilidad, localAUtc, reparto } from '../src/server/expertosAgenda.ts';

let fallos = 0;
const ok = (cond: boolean, que: string) => { console.log(`${cond ? '✓' : '✗'} ${que}`); if (!cond) fallos++; };

// 1. La hora local se convierte con el desfase de ESE día (cambio de hora: 25-oct-2026).
ok(new Date(localAUtc(2026, 10, 20, 600, 'Europe/Madrid')).toISOString() === '2026-10-20T08:00:00.000Z', '10:00 en Madrid en octubre (verano) = 08:00 UTC');
ok(new Date(localAUtc(2026, 10, 27, 600, 'Europe/Madrid')).toISOString() === '2026-10-27T09:00:00.000Z', '10:00 en Madrid tras el cambio de hora = 09:00 UTC');
ok(new Date(localAUtc(2026, 10, 20, 600, 'Atlantic/Canary')).toISOString() === '2026-10-20T09:00:00.000Z', '10:00 en Canarias = 09:00 UTC');

// 2. Franjas: lo que no se entiende se descarta y se cuenta.
const l = limpiarDisponibilidad([{ dia: 2, desde: '10:00', hasta: '12:00' }, { dia: 8, desde: '10:00', hasta: '11:00' }, { dia: 3, desde: '12:00', hasta: '11:00' }, { dia: 1, desde: '9', hasta: '10:00' }]);
ok(l.franjas.length === 1 && l.descartadas === 3, 'una franja válida y tres descartadas');

// 3. Huecos: martes 20-oct-2026, 10–12 con 45 min caben 2 (10:00 y 10:45; 11:30 no cabe).
const ahora = Date.parse('2026-10-18T12:00:00Z'); // domingo
const base = { franjas: [{ dia: 2, desde: '10:00', hasta: '12:00' }], duracionMin: 45, antelacionHoras: 24, zona: 'Europe/Madrid', ahoraMs: ahora, dias: 3 };
const h = huecosLibres({ ...base, ocupados: new Set() });
ok(h.length === 2 && h[0].inicio === '2026-10-20T08:00:00.000Z' && h[1].inicio === '2026-10-20T08:45:00.000Z', 'dos huecos el martes a las 10:00 y 10:45');
ok(h[0].fin === '2026-10-20T08:45:00.000Z', 'cada hueco dura lo que la consulta');

// 4. Un hueco ocupado no sale.
const h2 = huecosLibres({ ...base, ocupados: new Set([Date.parse('2026-10-20T08:00:00Z')]) });
ok(h2.length === 1 && h2[0].inicio === '2026-10-20T08:45:00.000Z', 'el hueco ocupado desaparece');

// 5. La antelación: con 60 h, el martes a las 10 (en 52 h) ya no se puede.
ok(huecosLibres({ ...base, antelacionHoras: 60, ocupados: new Set() }).length === 0, 'la antelación mínima se respeta');

// 6. Franjas solapadas no duplican huecos.
const h3 = huecosLibres({ ...base, franjas: [...base.franjas, { dia: 2, desde: '10:00', hasta: '11:00' }], ocupados: new Set() });
ok(h3.length === 2, 'franjas solapadas no repiten huecos');

// 7. El reparto: 40 € con 10 % = 4 € para el sitio y 36 € para el experto.
const r = reparto(4000, 1000);
ok(r.comision === 400 && r.neto === 3600, '40 € al 10 %: 4 € sitio, 36 € experto');
ok(reparto(4000, 9999).comision === 2000, 'la comisión nunca pasa del 50 %');

console.log(fallos ? `\n✗ ${fallos} fallo(s)` : '\n✓ todo bien');
process.exit(fallos ? 1 : 0);

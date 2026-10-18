// Numbers into table cells (src/server/bd/tipos.ts). Run: npx tsx scripts/probar-tipos-numeros.ts
// 2026-10-18: a JS number 0.138 sent through /api/v1 to a «moneda» column was
// stored as 138 (the Spanish thousands rule read the text «0.138»).
import assert from 'node:assert/strict';
import { tipar } from '../src/server/bd/tipos';

let n = 0;
const es = (tipo: any, bruto: any, esperado: any, config: any = {}) => {
  const r = tipar(tipo, bruto, [], config) as any;
  assert.ok(r.ok, `${tipo} ${JSON.stringify(bruto)}: ${r.error}`);
  assert.equal(r.valor, esperado, `${tipo} ${JSON.stringify(bruto)}`);
  n++;
};

// A JS number is taken as it is, in every numeric type.
es('moneda', 0.138, 0.14);
es('moneda', 0.138, 0.138, { decimales: 3 });
es('moneda', 1.234, 1.23);
es('moneda', 149, 149);
es('numero', 1.234, 1.234);
es('numero', 0.138, 0.138);
es('porcentaje', 15, 0.15);
es('porcentaje', 1.234, 0.01234);
es('valoracion', 4, 4);
es('duracion', 90, 90);

// Text keeps the Spanish convention people type.
es('moneda', '120.000', 120000);
es('moneda', '1.500,50 €', 1500.5);
es('moneda', '0,138', 0.14);
es('numero', '1.234.567', 1234567);
es('numero', '120.5', 120.5);
es('porcentaje', '15 %', 0.15);
es('porcentaje', '12,5%', 0.125);

// A leading zero is never a thousands group.
es('moneda', '0.138', 0.14);
es('numero', '0.138', 0.138);
es('numero', '-0.250', -0.25);
es('numero', '-1.250', -1250);

console.log(`${n} comprobaciones, todas bien.`);

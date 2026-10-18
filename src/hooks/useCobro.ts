import { useEffect, useState } from 'react';

// ============================================================================
// IS CHARGING OPEN HERE? (Wikiproducts W5, 2026-10-18)
// ============================================================================
// `GET /api/publicar/cobro` says whether `/api/publicar/comprar` will take a
// purchase (`TIENDAS_COBRO=1`) and whether a payment gateway key is set. Asked
// once per page load and shared: a sheet with five offers and a cart would
// otherwise ask the same question six times.
//
// While it is unknown the answer is `null`, and callers paint nothing that
// buys: a button shown and then removed half a second later is worse than
// waiting half a second.

export type Cobro = { abierto: boolean; pruebas: boolean; con_pasarela: boolean };

let promesa: Promise<Cobro> | null = null;
const CERRADO: Cobro = { abierto: false, pruebas: false, con_pasarela: false };

export function pedirCobro(): Promise<Cobro> {
  if (!promesa) {
    promesa = fetch('/api/publicar/cobro')
      .then(r => (r.ok ? r.json() : CERRADO))
      .then(j => ({ abierto: !!j?.abierto, pruebas: !!j?.pruebas, con_pasarela: !!j?.con_pasarela }))
      // A failed question is not a «closed» answer forever: forget it so the next mount asks again.
      .catch(() => { promesa = null; return CERRADO; });
  }
  return promesa;
}

export function useCobro(): Cobro | null {
  const [cobro, setCobro] = useState<Cobro | null>(null);
  useEffect(() => {
    let vivo = true;
    pedirCobro().then(c => { if (vivo) setCobro(c); });
    return () => { vivo = false; };
  }, []);
  return cobro;
}

// The «Economía» window: Deuda, Banca and Moneda as three parts, each opening
// with its own «Otras propuestas» slider. Only the part in the address is drawn.
import { ESPECTROS } from '../../data/espectro';
import { BancaVentana } from './BancaVentana';
import { DeudaVentana } from './DeudaVentana';
import { EspectroPropuestas } from './EspectroPropuestas';
import { MonedaVentana } from './MonedaVentana';
import type { ParteEconomia } from './ventanas';

export function EconomiaVentana({ parte }: { parte: ParteEconomia }) {
  const espectro = ESPECTROS[parte];
  return (
    <>
      {espectro && <EspectroPropuestas key={parte} ventana={parte} datos={espectro} />}
      {parte === 'deuda' && <DeudaVentana />}
      {parte === 'banca' && <BancaVentana />}
      {parte === 'moneda' && <MonedaVentana />}
    </>
  );
}

// The options of each part of the running gear, in one shape (2026-11-24): the steering's (`direccion.ts`), and the
// brakes, the suspension and the wheels the project already had in `bici/catalogo.ts` and `ruedas/catalogo.ts`, dressed
// with what is in them. Nothing here makes a number up: a part's mass and price are the catalogue's own, said to be
// published or estimated as they were there; a part list that sums to the whole says so in `scripts/rodaje.ts`.
//
// THE FAVOURITE is a field of the design, not a second list: the star on a brake sets `tBiciFreno`, on a suspension
// `tBiciSusp`, on a wheel `tRuedaDel` / `tRuedaTras`, on a steering `tDirOpc` (`bici/pedales.ts`). So the mass list, the
// prices, the checks and every department tab already follow it, as they did when it was chosen in the side panel.
import { A_MEDIDA, BRAZOS_ESQUINA, BUJE_DISCO, DISCO_160, EUR_POR_GBP, FRENOS_BICI, PRECIO_RADIOS_CAMARA, PRECIO_RUEDA_BICI, SUSPENSIONES_BICI, type PiezaBici } from '../bici/catalogo';
import { fichaRueda } from '../ruedas/catalogo';
import { DIRECCION_OPCIONES } from './direccion';
import type { FuenteOpcion, IdSub, OpcionRodaje, ParteOpcion } from './tipos';

const LEIDO = '2026-11-24';
const eurRedondo = (v: number) => Math.round(v);
const fuenteDe = (p: PiezaBici): FuenteOpcion[] => [{ t: p.n, url: p.fuente, leido: LEIDO }];

// ---------------------------------------------------------------- brakes
const PARTES_FRENO: Record<string, ParteOpcion[]> = {
  tambor70: [{ n: 'Buje con tambor de 70 mm (Sturmey-Archer X-FD)', cantidad: 1, kg: 0.77, eur: eurRedondo(74.99 * EUR_POR_GBP), nota: 'El buje entero: la rueda no lleva otro buje, el freno va dentro.', origen: 'comprar', dato: 'publicado' }],
  tambor90: [{ n: 'Buje con tambor de 90 mm (Sturmey-Archer XL-FD)', cantidad: 1, kg: 0.97, eur: eurRedondo(89.99 * EUR_POR_GBP), nota: 'El buje entero con su tambor grande.', origen: 'comprar', dato: 'publicado' }],
  discoMecanico: [
    { n: 'Pinza mecánica de dos pistones (TRP Spyre)', cantidad: 1, kg: 0.154, nota: 'De cable, con las dos pastillas móviles. Peso del fabricante.', origen: 'comprar', dato: 'publicado' },
    { n: 'Disco de 160 mm', cantidad: 1, kg: DISCO_160, nota: 'Un disco de bicicleta de su tamaño.', origen: 'comprar', dato: 'estimado' },
    { n: 'Buje de disco', cantidad: 1, kg: BUJE_DISCO, nota: 'Un buje llano con las seis escotaduras del disco.', origen: 'comprar', dato: 'estimado' },
  ],
  discoHidraulico: [
    { n: 'Freno hidráulico de cuatro pistones (Shimano Deore M6120)', cantidad: 1, kg: 0.653, nota: 'Maneta, latiguillo y pinza, pesados por la tienda.', origen: 'comprar', dato: 'publicado' },
    { n: 'Disco de 160 mm', cantidad: 1, kg: DISCO_160, nota: 'Un disco de bicicleta de su tamaño.', origen: 'comprar', dato: 'estimado' },
    { n: 'Buje de disco', cantidad: 1, kg: BUJE_DISCO, nota: 'Un buje llano con las seis escotaduras del disco.', origen: 'comprar', dato: 'estimado' },
  ],
};
const PROS_CONTRAS_FRENO: Record<string, { pros: string[]; contras: string[] }> = {
  tambor70: { pros: ['Cerrado y sin mantenimiento', 'Es el freno de serie del Quattrovelo y de casi todos los velomóviles', 'Va montado en el buje: la rueda no lleva otro buje'], contras: ['Frena menos que un disco', 'Se calienta en bajadas largas'] },
  tambor90: { pros: ['El tambor grande: la opción del Quattrovelo para ir cargado o por montaña', 'Cerrado y sin mantenimiento'], contras: ['200 g más por rueda que el de 70 mm (en el Quattrovelo, 50 € y 580 g más la pareja)', 'Frena menos que un disco'] },
  discoMecanico: { pros: ['Frena más que un tambor', 'De cable: sin líquido que purgar'], contras: ['Necesita un buje de disco', 'Se ajusta a mano según se gastan las pastillas'] },
  discoHidraulico: { pros: ['El que más frena de la lista', 'El freno de bicicleta de montaña y de carga'], contras: ['Cada pinza trae su maneta: en cuatro ruedas hay que unir dos pinzas a cada maneta con un repartidor, que no está contado', 'Su precio es estimado: la tienda no lo mostraba'] },
};
const deFreno = (p: typeof FRENOS_BICI[number]): OpcionRodaje => ({
  id: p.id, n: p.n, resumen: p.nota, kg: p.kg, masa: p.masa, precio: p.precio, partes: PARTES_FRENO[p.id] ?? [], por: 'por rueda',
  ...PROS_CONTRAS_FRENO[p.id], fuentes: fuenteDe(p), datos: [['Tipo', p.tipo]],
});

// ---------------------------------------------------------------- suspension
const PARTES_SUSP: Record<string, ParteOpcion[]> = {
  rigida: [{ n: 'Mangueta y eje de la rueda', cantidad: 1, kg: 0.5, eur: 40, nota: 'Sin amortiguador: la suspensión la hace el neumático.', origen: 'fabricar', dato: 'estimado' }],
  aireMonarch: [
    { n: 'Amortiguador de aire RockShox Monarch RL (165 × 38 mm)', cantidad: 1, kg: 0.215, nota: 'Sin tornillería. Se ajusta con una bomba de aire.', origen: 'comprar', dato: 'publicado' },
    { n: 'Brazos, mangueta y eje de rueda', cantidad: 1, kg: BRAZOS_ESQUINA, nota: 'En tubo de bicicleta.', origen: 'fabricar', dato: 'estimado' },
  ],
  aireDNM: [
    { n: 'Amortiguador de aire DNM AOY-36RC (165 × 35 mm)', cantidad: 1, kg: 0.30, nota: 'Rebote, bloqueo y presión.', origen: 'comprar', dato: 'publicado' },
    { n: 'Brazos, mangueta y eje de rueda', cantidad: 1, kg: BRAZOS_ESQUINA, nota: 'En tubo de bicicleta.', origen: 'fabricar', dato: 'estimado' },
  ],
};
const PROS_CONTRAS_SUSP: Record<string, { pros: string[]; contras: string[] }> = {
  rigida: { pros: ['Lo más ligero y lo más barato', 'El eje trasero del Podbike Frikar va rígido, y muchos triciclos reclinados también'], contras: ['En mal asfalto se nota: la suspensión es solo un neumático balón a poca presión'] },
  aireMonarch: { pros: ['Un amortiguador de montaña por rueda, con brazos de tubo de bici', 'Se ajusta con una bomba de aire al peso que lleve', 'Como los trapecios delanteros del Podbike Frikar'], contras: ['El precio es estimado: ninguna tienda lo mostraba ese día'] },
  aireDNM: { pros: ['Más sencillo y más barato que el Monarch', 'Lo mismo: rebote, bloqueo y presión'], contras: ['El amortiguador pesa 85 g más', 'El precio es estimado: la tienda no lo mostraba'] },
};
const deSusp = (p: typeof SUSPENSIONES_BICI[number]): OpcionRodaje => ({
  id: p.id, n: p.n, resumen: p.nota, kg: p.kg, masa: p.masa, precio: p.precio, partes: PARTES_SUSP[p.id] ?? [], por: 'por esquina',
  ...PROS_CONTRAS_SUSP[p.id], fuentes: fuenteDe(p), datos: [['Recorrido en la rueda', p.recorrido ? `≈ ${p.recorrido} mm` : 'ninguno (el neumático)']],
});

// ---------------------------------------------------------------- wheels
const fmt = (v: number, d = 1) => v.toLocaleString('es-ES', { maximumFractionDigits: d });
function deRueda(id: string): OpcionRodaje | null {
  const f = fichaRueda(id), pr = PRECIO_RUEDA_BICI[id];
  if (!f || !pr) return null;
  const eur = eurRedondo(pr.neumatico + pr.llanta + PRECIO_RADIOS_CAMARA);
  const partes: ParteOpcion[] = [
    { n: 'Neumático', cantidad: 1, eur: eurRedondo(pr.neumatico), nota: pr.como, origen: 'comprar', dato: 'publicado' },
    { n: 'Llanta', cantidad: 1, eur: eurRedondo(pr.llanta), nota: `Llanta de ${f.llantaPulg}″ con radios.`, origen: 'comprar', dato: id === 'cargo20' ? 'publicado' : 'estimado' },
    { n: 'Radios, cámara y fondo de llanta', cantidad: 1, eur: PRECIO_RADIOS_CAMARA, nota: 'Treinta y seis radios con sus cabezas, la cámara y la cinta.', origen: 'comprar', dato: 'estimado' },
  ];
  return {
    id, n: `${f.grupo}: ${f.medida}`, resumen: f.ejemplos, kg: f.kg, masa: 'del catálogo de ruedas: la rueda con su neumático, sin el buje ni el freno', por: 'por rueda',
    precio: { eur, tipo: 'estimado', nota: `${pr.como}; llanta (≈ ${Math.round(pr.llanta)} €) y radios, cámara y fondo (≈ ${PRECIO_RADIOS_CAMARA} €): estimados salvo el neumático${id === 'cargo20' ? ' y la llanta, que son precios de tienda' : ''}` },
    partes, pros: [], contras: [], fuentes: [{ t: f.fuente, url: 'https://www.schwalbe.com', leido: LEIDO }],
    datos: [['Medida', f.medida], ['Diámetro y ancho', `${fmt(f.d * 1000, 0)} × ${fmt(f.w * 1000, 0)} mm`], ['Carga máxima', `${f.carga} kg por rueda`], ['Velocidad máxima del neumático', `${f.vmax} km/h`], ['Resistencia a la rodadura', `${fmt(f.crr, 4)} a ${fmt(f.bar, 1)} bar`]],
  };
}
export const IDS_RUEDAS_OPCION = Object.keys(PRECIO_RUEDA_BICI);

// ---------------------------------------------------------------- the lists
export const OPCIONES_FRENOS: OpcionRodaje[] = FRENOS_BICI.map(deFreno);
export const OPCIONES_SUSPENSION_RODAJE: OpcionRodaje[] = SUSPENSIONES_BICI.map(deSusp);
export const OPCIONES_RUEDAS: OpcionRodaje[] = IDS_RUEDAS_OPCION.map(deRueda).filter((o): o is OpcionRodaje => !!o);
export const OPCIONES_DIRECCION: OpcionRodaje[] = DIRECCION_OPCIONES;

export function opcionesDe(sub: IdSub): OpcionRodaje[] {
  return sub === 'frenos' ? OPCIONES_FRENOS : sub === 'suspension' ? OPCIONES_SUSPENSION_RODAJE : sub === 'ruedas' ? OPCIONES_RUEDAS : OPCIONES_DIRECCION;
}

/** The favourite of a part, read from the design: the option's id or `A_MEDIDA` («as before»). Wheels: one per axle. */
export function favoritaDe(sub: Exclude<IdSub, 'ruedas'>, P: object): string;
export function favoritaDe(sub: 'ruedas', P: object): { del: string; tras: string };
export function favoritaDe(sub: IdSub, P: object): string | { del: string; tras: string } {
  const Q = P as Record<string, unknown>, ids = (l: OpcionRodaje[], v: unknown) => (typeof v === 'string' && l.some(o => o.id === v) ? v : A_MEDIDA);
  if (sub === 'frenos') return ids(OPCIONES_FRENOS, Q.tBiciFreno);
  if (sub === 'suspension') return ids(OPCIONES_SUSPENSION_RODAJE, Q.tBiciSusp);
  if (sub === 'direccion') return ids(OPCIONES_DIRECCION, Q.tDirOpc);
  return { del: typeof Q.tRuedaDel === 'string' ? Q.tRuedaDel : '', tras: typeof Q.tRuedaTras === 'string' ? Q.tRuedaTras : '' };
}

/** The design's fields a star writes (`ponerFavorita`): a list of [field, value]. */
export function camposDeFavorita(sub: IdSub, id: string, eje?: 'del' | 'tras' | 'todas'): [string, string][] {
  if (sub === 'frenos') return [['tBiciFreno', id]];
  if (sub === 'suspension') return [['tBiciSusp', id]];
  if (sub === 'direccion') return [['tDirOpc', id]];
  const o: [string, string][] = [];
  if (eje !== 'tras') o.push(['tRuedaDel', id]);
  if (eje !== 'del') o.push(['tRuedaTras', id]);
  return o;
}

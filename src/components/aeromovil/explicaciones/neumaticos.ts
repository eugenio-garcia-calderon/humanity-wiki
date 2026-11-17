import type { Parametros } from '../geometria';
import type { ExplicacionParametro, Explicaciones } from './tipos';

// Explicaciones del tipo y la construcción del neumático (2026-11-17), iguales en el Triciclo (`t…`) y el Basculante (`q…`).
// Las cifras y sus fuentes están en `ruedas/neumaticos.ts`.
const E = (nombre: string, queEs: string, porQueImporta: string, relacionados: (keyof Parametros)[]): ExplicacionParametro =>
  ({ nombre, queEs, porQueImporta, masAlto: { ventajas: [], desventajas: [] }, masBajo: { ventajas: [], desventajas: [] }, relacionados,
    referencias: ['V. Cossalter, «Motorcycle Dynamics» (2006): rodadura y agarre de un neumático de moto', 'Reglamento (UE) 2020/740: etiqueta europea (rodadura y agarre en mojado)', 'blackcircles.com y tyrescart.ae: duración por tipo de neumático de moto'] });

const TIPO = 'Para la medida elegida, qué clase de neumático lleva: carretera o turismo, deportivo, hiperdeportivo (semi-slick), eco de baja rodadura, de lluvia, todo tiempo o invierno, trail 90/10 o 50/50, de tacos o de scooter. «De serie» es el que ya tenía esa medida (una deportiva, deportivo; una de enduro, de tacos): con él no cambia nada.';
const TIPO_POR = 'Cambia, respecto al de serie de esa medida, la rodadura (y con ella el consumo y la autonomía), la masa de la rueda, el agarre en seco y en mojado (la aceleración que cabe y, en el Basculante, el vuelco), cuánto dura y lo que cuesta. Un semi-slick agarra más en seco pero poco en mojado y dura unos 3.000 km; uno eco rueda un 15 % mejor y agarra algo menos; los tacos ruedan mucho peor en asfalto. Las cifras son estimaciones en el orden que dan las fuentes, no medidas de estas medidas.';
const CONS = 'Cómo está hecho el neumático: radial o diagonal, con cámara o sin ella, o run-flat (rueda un rato pinchado). «De serie» es lo que lleva esa medida (las de radios, con cámara; un código con R, radial).';
const CONS_POR = 'Un radial rueda con menos pérdidas que un diagonal (aquí, un 12 %) y agarra algo más; la cámara añade su peso (≈ 8 % de la rueda) y un 3 % de rodadura; un run-flat pesa ≈ 25 % más de neumático y rueda un 8 % peor, pero no te deja tirado con un pinchazo.';

export const EXPLICACIONES: Explicaciones = {
  tNeuDel: E('Neumáticos delanteros: tipo', TIPO, TIPO_POR, ['tRuedaDel', 'tConsDel']),
  tNeuTras: E('Neumático trasero: tipo', TIPO + ' En rombo vale también para la rueda del morro (las dos son de la medida «Rueda trasera»).', TIPO_POR, ['tRuedaTras', 'tConsTras']),
  tConsDel: E('Neumáticos delanteros: construcción', CONS, CONS_POR, ['tRuedaDel', 'tNeuDel']),
  tConsTras: E('Neumático trasero: construcción', CONS, CONS_POR, ['tRuedaTras', 'tNeuTras']),
  qNeuDel: E('Neumático delantero: tipo', TIPO, TIPO_POR, ['qRuedaDel', 'qConsDel']),
  qNeuTras: E('Neumático trasero: tipo', TIPO, TIPO_POR, ['qRuedaTras', 'qConsTras']),
  qConsDel: E('Neumático delantero: construcción', CONS, CONS_POR, ['qRuedaDel', 'qNeuDel']),
  qConsTras: E('Neumático trasero: construcción', CONS, CONS_POR, ['qRuedaTras', 'qNeuTras']),
};

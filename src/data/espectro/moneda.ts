// «Otras propuestas» for the «moneda» part (money and inflation). Camps checked on
// 2026-11-13, during the campaign for the general election of 29 November 2026,
// with prices rising again (4,9 % in October) after the war in the Middle East.
// What the camps propose on money is mostly what they propose against inflation;
// the digital euro and cash are where they differ most. Every card says when its
// proposals were published (`cuando`). Podemos is not cited.
import type { Espectro } from './tipos';

export const ESPECTRO: Espectro | null = {
  tema: 'la moneda y la inflación',
  modelo: [
    'El dinero debe conservar su valor: inflación baja y estable, el 2 % que busca el Banco Central Europeo.',
    'Ninguna administración debe, así que ninguna gana nada si suben los precios ni presiona al banco central.',
    'La economía crece produciendo más, no con más crédito: el crédito nuevo, solo para producir y para la vivienda propia.',
    'La deuda heredada se gestiona con prudencia y solo se reestructura si es impagable, diciendo quién pierde.',
    'Si el dinero nuevo debe nacer como deuda con un banco queda como debate abierto: dinero soberano, plan de Chicago, euro digital.',
  ],
  limites: [
    'España no controla el euro: casi todo lo que propone sobre la moneda depende del Banco Central Europeo y de las reglas europeas.',
    'Sin deuda, una crisis grande depende de que la caja de contingencias esté llena, y llenarla lleva años.',
    'Limitar el crédito al que produce puede frenar la economía si se define mal qué es producir.',
  ],
  posturas: [
    {
      id: 'izquierda',
      quien: 'Sumar (hoy en el Frente Amplio)',
      cuando: 'Propuestas de Sumar ante la subida de precios por la guerra de Irán, 9 de marzo de 2026',
      idea: 'Que el Estado frene los precios y que paguen más las empresas que ganan con la crisis.',
      propone: [
        'Recuperar el impuesto extraordinario a las empresas de energía.',
        'Volver a topar en 30 euros el precio del gas con el que se fija el de la luz (la «excepción ibérica» de 2022).',
        'Controlar el precio de los alimentos básicos, como se hizo con las mascarillas en la pandemia.',
        'Rebajar 20 céntimos el litro de carburante si pasa de 2 euros, con ayudas a transportistas, agricultores y pescadores.',
        'Prorrogar los alquileres que vencen para que nadie se quede sin casa.',
      ],
      nota: 'No hemos encontrado una propuesta concreta sobre el Banco Central Europeo o el euro digital en sus textos publicados.',
      argumento: 'Dicen que la subida viene de la guerra y del petróleo por encima de 100 dólares, que las familias ya la notan y que el Estado debe proteger sobre todo a las más vulnerables.',
      critica: 'Sus críticos dicen que fijar precios por ley provoca escasez y que los impuestos a las empresas acaban pasando al precio que paga el cliente.',
      fuentes: [
        { url: 'https://forbes.es/economia/886500/sumar-reclama-al-psoe-un-decreto-con-un-impuesto-a-energeticas-ayudas-a-transportistas-y-tope-a-los-precios/', titulo: 'Forbes · Sumar reclama al PSOE un decreto con un impuesto a energéticas, ayudas y tope a los precios (9-3-2026)' },
      ],
    },
    {
      id: 'centro-izquierda',
      quien: 'PSOE y el Gobierno',
      cuando: 'Decreto contra la subida de precios de septiembre de 2026 y carta al Consejo Europeo de marzo de 2026',
      idea: 'Bajar los impuestos de la energía mientras dure la subida y adelantar el euro digital.',
      propone: [
        'Rebajar el impuesto de los carburantes 20 céntimos por litro en octubre de 2026, 13 en noviembre y 6 en diciembre.',
        'Bajar el IVA (el impuesto que se suma al precio) de la luz y del gas del 21 % al 10 % si su precio sube más de un 15 % en un año.',
        'Un precio máximo para la bombona de butano, 19,55 euros, hasta junio de 2027.',
        'Adelantar el euro digital a 2028, por soberanía financiera (carta de Pedro Sánchez, marzo de 2026).',
      ],
      argumento: 'Dicen que la subida viene de la energía por la crisis de Oriente Medio y que hay que proteger a los hogares y a los sectores más expuestos mientras dure, sin perder el control de las cuentas.',
      critica: 'Se le reprocha que las rebajas son temporales y para todos, también para quien no las necesita, y que cuestan dinero público sin atacar la causa.',
      fuentes: [
        { url: 'https://www.hacienda.gob.es/gl-ES/Prensa/Noticias/Paginas/2026/20260929-NP-CM-MEDIDAS-FISCALES.aspx', titulo: 'Ministerio de Hacienda · Medidas fiscales aprobadas por el Consejo de Ministros (29-9-2026)' },
        { url: 'https://es.euronews.com/2026/10/01/plan-gobierno-espanol-contener-inflacion-crisis-oriente-medio', titulo: 'Euronews · El plan del Gobierno para contener la inflación (1-10-2026)' },
        { url: 'https://euroweeklynews.com/2026/04/19/digital-euro-by-2028-why-sweden-is-defending-cash-while-spain-pushes-for-digital-only/', titulo: 'Euro Weekly News · España pide adelantar el euro digital a 2028 (19-4-2026)' },
      ],
    },
    {
      id: 'centro-derecha',
      quien: 'Partido Popular (PP)',
      cuando: 'Programa para el 29-N, noviembre de 2026, y su negociador del euro digital en el Parlamento Europeo, julio de 2026',
      idea: 'Que el Estado no gane dinero con la inflación a costa de las familias.',
      propone: [
        'Subir cada año los tramos del impuesto sobre la renta (IRPF) con la inflación, para que no sea una subida de impuestos escondida (medida 178).',
        'IVA (el impuesto que se suma al precio) del 0 % para alimentos básicos, como carne, pescado y conservas, mientras dure la crisis de precios (medida 180).',
        'Que las pensiones suban cada año con el IPC, la subida de los precios (medida 108).',
        'Tratar igual en impuestos todas las formas de ahorro mientras sigan invertidas (medida 184).',
        'Un euro digital que complemente al efectivo y no lo sustituya (Fernando Navarrete, 2026).',
      ],
      argumento: 'Dicen que con la inflación Hacienda recauda más sin cambiar ninguna ley, porque los sueldos pasan a tramos más altos, y que eso es injusto con las familias.',
      critica: 'Sus críticos dicen que bajar impuestos en plena subida de precios aumenta el déficit y la demanda, y que el IVA cero no siempre llega al precio final.',
      fuentes: [
        { url: 'https://www.democrata.es/uploads/s1/35/09/79/8/la-reconstruccion-nacional.pdf', titulo: 'PP · La reconstrucción nacional, programa electoral 29N (10-11-2026), medidas 108, 178, 180 y 184' },
        { url: 'https://www.xatakamovil.com/movil-y-sociedad/navarrete-rojas-eurodiputado-circula-narrativa-que-describe-que-pagos-digitales-se-supervisan-controlan', titulo: 'Xataka Móvil · Navarrete: «El euro digital complementará al efectivo» (9-7-2026)' },
      ],
    },
    {
      id: 'derecha',
      quien: 'Vox',
      cuando: 'Propuestas de campaña de octubre de 2026 y vídeo de su delegación en el Parlamento Europeo, noviembre de 2025',
      idea: 'Bajar los impuestos de la energía y proteger el efectivo frente al euro digital.',
      propone: [
        'Que el ahorro no pague impuestos por lo que sube su valor solo por la inflación (2026).',
        'IVA (el impuesto que se suma al precio) del 4 % para la luz, el gas y el agua, y quitar los impuestos especiales de la electricidad y de los carburantes (2026).',
        'Un referéndum en todos los países de la Unión antes de cualquier paso para sustituir el efectivo (2025).',
        'Iniciativas en el Parlamento Europeo para proteger el derecho a pagar en efectivo y la privacidad de los pagos (2025).',
      ],
      argumento: 'Dicen que el euro digital puede servir para vigilar y limitar en qué gasta cada persona, y que los impuestos a la energía encarecen la vida de todos.',
      critica: 'Sus críticos dicen que el euro digital no sustituye al efectivo, como repite el Banco Central Europeo, y que quitar esos impuestos costaría miles de millones sin decir cómo se cubren.',
      fuentes: [
        { url: 'https://www.democrata.es/elecciones-generales-espana/vox-lleva-29n-su-receta-economica-con-rebajas-fiscales-recorte-gasto-reforma-pensiones/', titulo: 'Demócrata · Vox lleva al 29N su receta económica (7-10-2026)' },
        { url: 'https://okdiario.com/espana/video-viral-vox-contra-euro-digital-no-metodo-pago-herramienta-control-15708060', titulo: 'OKDiario · El vídeo de Vox contra el euro digital (5-11-2025)' },
      ],
    },
  ],
  revisado: '2026-11-13',
};

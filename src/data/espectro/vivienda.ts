// «Otras propuestas» for the «vivienda» window. Positions checked on 2026-11-12
// and updated on 2026-11-15: the PP (10-11-2026) and Vox (12-11-2026) from their
// 29-N programmes; the Frente Amplio from its «100+15» programme as reported by
// the press (12-11-2026); the PSOE from Government measures and its campaign
// proposals. The date is in each source title.
import type { Espectro } from './tipos';

export const ESPECTRO: Espectro | null = {
  tema: 'la vivienda',
  modelo: [
    'La casa en la que vives paga solo el tramo básico del impuesto único, un 10 %; una segunda vivienda, un 20 %. Desaparecen el IBI, el impuesto de transmisiones y la plusvalía.',
    'Cada escala usa su tercio para producir en comprar, construir o rehabilitar casas de alquiler que no se venden nunca.',
    'Los pisos vacíos pueden ir a una bolsa municipal: el municipio los alquila y paga al dueño cada mes, haya inquilino o no.',
    'Donde falta casa, la región publica un precio de referencia del alquiler; quien lo supera devuelve la diferencia y paga una multa.',
    'Cuando un campo pasa a urbanizable, su precio tiene un tope hasta que se construye, y la subida va a vivienda pública.',
  ],
  limites: [
    'Sus críticos dicen que el alquiler pagaría un 10 % de impuesto que hoy no paga, y que no se sabe si el dueño lo compensaría bajando la renta.',
    'También, que la bolsa de pisos vacíos es voluntaria y puede no mover casas si los dueños no quieren.',
    'Y que pasar de menos del 2 % de vivienda social a la media europea lleva años, y que una sola ley para todo el país exige cambiar el reparto de competencias.',
  ],
  posturas: [
    {
      id: 'izquierda',
      quien: 'Frente Amplio (Sumar, IU, Más Madrid y Comuns); Podemos va aparte; ERC, Bildu y BNG apoyan parte en el Congreso',
      cuando: 'Programa «100+15» del Frente Amplio, presentado el 12 de noviembre de 2026 (recogido por la prensa), e iniciativas en el Congreso de 2025 y 2026',
      idea: 'La vivienda es un derecho: menos compra para invertir, precios limitados y mucha más vivienda pública.',
      propone: [
        'Prohibir que los fondos de inversión compren vivienda (programa «100+15»; Sumar ya lo pidió en 2025 para empresas y fondos).',
        'Que la vivienda pública no pueda pasar nunca al mercado libre, por ley, y mantener las prórrogas de los contratos de alquiler (programa «100+15»).',
        'Controlar los pisos turísticos para que vuelvan al alquiler de larga duración (programa «100+15»).',
        'Quitar el régimen especial de las SOCIMI (sociedades que invierten en alquiler y pagan menos impuestos) (Sumar, 2025).',
        'Podemos, por su cuenta: bajar los alquileres por ley para que ningún hogar dedique más del 30 % de su renta, con contratos mucho más largos.',
      ],
      argumento: 'Dicen que, cuando empresas y fondos compran casas para ganar dinero, los precios suben y las familias se quedan fuera. Por eso piden sacar la vivienda del negocio y ampliar la vivienda pública.',
      critica: 'Sus críticos dicen que limitar precios y prohibir compras reduce los pisos en alquiler y choca con el derecho de propiedad y la libre circulación de capitales en la Unión Europea. También, que un parque público así tarda años y cuesta mucho.',
      fuentes: [
        { url: 'https://www.nosdiario.gal/politica/fronte-ampla-presenta-seu-programa-electoral-100-15-centrado-vivenda-salarios-autogoberno-da-galiza/20261112165631271586.html', titulo: 'Nós Diario (12-11-2026) · El Frente Amplio presenta su programa «100+15», centrado en la vivienda (lo recoge la prensa; el texto completo no está publicado)' },
        { url: 'https://www.bolsamania.com/noticias_print/economia/economia--sumar-exige-derogar-las-socimis-y-prohibir-a-empresas-y-fondos-buitre-la-compra-de-vivienda--19368462.html', titulo: 'Europa Press (16-4-2025) · Sumar pide prohibir a empresas y fondos comprar vivienda y derogar las socimis' },
        { url: 'https://brainsre.news/que-propone-cada-partido-vivienda-elecciones-29n/', titulo: 'Brains Real Estate News (26-10-2026) · Qué propone cada partido sobre vivienda para el 29-N' },
      ],
    },
    {
      id: 'centro-izquierda',
      quien: 'PSOE y el Gobierno de Pedro Sánchez',
      cuando: 'Medidas anunciadas por el Gobierno en 2025, enmiendas en el Congreso de 2026 y propuestas de campaña de noviembre de 2026',
      idea: 'Más vivienda pública que no se vende, ayudas, y límites al alquiler donde falta casa, sin prohibir la compra.',
      propone: [
        'Mantener la Ley de Vivienda (2023), que permite limitar el alquiler en las zonas con escasez que declare cada comunidad autónoma.',
        'Una empresa pública estatal de vivienda con casas y suelo del Estado y de la Sareb (la sociedad que guarda pisos de los bancos rescatados), para alquiler asequible, y que lo construido con dinero público siga siendo público para siempre.',
        'Llevar la vivienda pública por encima del 6 % de todas las viviendas, con el Plan Estatal de Vivienda 2026-2030, de 7.000 millones (propuesta de campaña, noviembre de 2026).',
        'Impuestos: hasta el 100 % del valor para quien compra sin vivir en la Unión Europea, IVA (el impuesto sobre lo que se compra) del 21 % en pisos turísticos y un 25 % a las SOCIMI que no alquilen a precio asequible.',
        'No pagar IRPF (el impuesto sobre la renta) por el alquiler si el casero cobra el precio de referencia.',
      ],
      argumento: 'Dicen que España tiene muy poca vivienda pública porque la protegida acabó pasando al mercado libre, y que la vivienda pagada con dinero de todos debe quedarse en manos públicas.',
      critica: 'Se le reprocha que buena parte de las medidas anunciadas en 2025 no se han aplicado, que solo unas pocas comunidades limitan el alquiler y que los precios siguen subiendo.',
      fuentes: [
        { url: 'https://www.lamoncloa.gob.es/presidente/actividades/paginas/2025/130125-sanchez-foro-vivienda.aspx', titulo: 'La Moncloa (13-1-2025) · Las medidas de vivienda anunciadas por Pedro Sánchez' },
        { url: 'https://www.idealista.com/news/node/898214', titulo: 'idealista (20-5-2026) · Las enmiendas del PSOE: gravar pisos vacíos, IVA turístico y socimis' },
        { url: 'https://www.elespanol.com/invertia/observatorios/vivienda/20260112/anuncios-sanchez-vivienda-medidas-ley-reales-decretos/1003744086413_0.html', titulo: 'El Español (12-1-2026) · Qué se ha aplicado de los anuncios de vivienda del Gobierno' },
        { url: 'https://www.telecinco.es/noticias/espana/20261113/elecciones-generales-2026-programas-electorales-pp-psoe-vox-sumar-podemos_18_020555572.html', titulo: 'Telecinco (13-11-2026) · Lo que proponen los partidos para el 29-N: la vivienda pública por encima del 6 % (lo recoge la prensa)' },
      ],
    },
    {
      id: 'centro-derecha',
      quien: 'Partido Popular (PP)',
      cuando: 'Programa para el 29-N, noviembre de 2026',
      idea: 'Construir mucho más y bajar los impuestos de la compra, sobre todo a los jóvenes, sin limitar el precio del alquiler.',
      propone: [
        'Un millón de viviendas en suelo público y privado, con una nueva Ley del Suelo y menos trámites: si no hay respuesta a una licencia en tres meses, se entiende concedida.',
        'Derogar la Ley de Vivienda de 2023.',
        'Primera vivienda de menores de 40 años: bajar al 4 % el IVA (el impuesto sobre lo que se compra) y el impuesto de transmisiones, avales para la hipoteca y una «Hucha Hogar Joven» para ahorrar.',
        'Ventajas fiscales para contratos de alquiler de tres años con subidas por debajo del IPC (la subida de los precios), y protección frente a impagos.',
        'Desalojar las ocupaciones ilegales en 48 horas por orden judicial.',
      ],
      argumento: 'Dicen que faltan casas y que con más suelo, menos trámites y menos impuestos se construirá más. Y que dar seguridad a los dueños hará que salgan más pisos al alquiler.',
      critica: 'Sus críticos dicen que bajar los impuestos de la compra puede subir los precios, porque el vendedor se queda parte de la rebaja, y que más suelo no asegura que la vivienda sea asequible.',
      fuentes: [
        { url: 'https://www.moncloa.com/2026/11/10/pp-plan-reconstruccion-3465233/', titulo: 'Moncloa.com (10-11-2026) · El programa electoral del PP para el 29-N' },
        { url: 'https://www.vozpopuli.com/espana/politica/feijoo-promete-construir-un-millon-de-viviendas-y-que-los-okupas-salgan-en-48-horas-por-orden-judicial.html', titulo: 'Vozpópuli (21-10-2026) · El plan de vivienda de Feijóo' },
        { url: 'https://brainsre.news/que-propone-cada-partido-vivienda-elecciones-29n/', titulo: 'Brains Real Estate News (26-10-2026) · Qué propone cada partido sobre vivienda para el 29-N' },
      ],
    },
    {
      id: 'derecha',
      quien: 'Vox',
      cuando: 'Programa para el 29-N, «Es sentido común», 12 de noviembre de 2026',
      idea: 'Menos impuestos y normas para construir, y prioridad para los españoles en la vivienda pública.',
      propone: [
        '«Prioridad nacional»: que la vivienda protegida, el alquiler social y las ayudas al alquiler vayan primero a los españoles (medida 27).',
        'Reformar la Ley del Suelo para construir más, y más vivienda protegida con empresas privadas (medidas 28 y 29).',
        'Primera vivienda de una familia española sin impuestos, y más impuestos a compradores de fuera de la Unión Europea y a fondos que especulan (medidas 34 y 35).',
        'Derogar la Ley de Vivienda, premiar el alquiler largo y regular los pisos turísticos (medida 30).',
        'Desalojar las ocupaciones en menos de 24 horas y prohibir alquilar a inmigrantes en situación irregular (medidas 31 y 32).',
      ],
      argumento: 'Dicen que el exceso de normas e impuestos encarece y retrasa la vivienda, y que los recursos públicos deben ir primero a los españoles.',
      critica: 'Sus críticos, entre ellos el Gobierno, dicen que la prioridad nacional es discriminatoria y contraria a la igualdad ante la ley; el PP votó en contra en el Congreso en junio de 2026. Otros dicen que quitar límites al suelo favorece construir de forma dispersa.',
      fuentes: [
        { url: 'https://men.gsstatic.es/sfAttachPlugin/4847171.pdf', titulo: 'Vox · «Es sentido común», programa electoral 29-N (12-11-2026), copia en PDF publicada por Menorca · Es Diari, medidas 27 a 35' },
        { url: 'https://www.infobae.com/espana/2026/11/13/consulta-en-pdf-el-programa-electoral-de-vox-deportacion-de-migrantes-prioridad-nacional-y-derogacion-de-leyes-de-genero/', titulo: 'Infobae · El programa electoral de Vox para el 29-N, en PDF (13-11-2026)' },
        { url: 'https://www.bolsamania.com/noticias_amp/empresas/economia--vox-plantea-al-congreso-una-votacion-para-pedir-la-prioridad-nacional-en-ayudas-para-vivienda--22717404.html', titulo: 'Europa Press (12-6-2026) · Vox lleva al Congreso la prioridad nacional en vivienda' },
      ],
    },
  ],
  revisado: '2026-11-15',
};

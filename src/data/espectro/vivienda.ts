// «Otras propuestas» for the «vivienda» window. Positions checked on 2026-11-12.
// On that date only the PP had published its programme for the 29 November 2026
// general election; the other camps are described from their latest documents and
// initiatives (2025-2026), with the date in each source title.
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
      cuando: 'Iniciativas en el Congreso de 2025 y 2026, y propuestas recogidas en octubre de 2026',
      idea: 'La vivienda es un derecho: menos compra para invertir, precios limitados y mucha más vivienda pública.',
      propone: [
        'Prohibir que empresas y fondos de inversión compren vivienda: solo podrían comprar personas.',
        'Quitar el régimen especial de las SOCIMI (sociedades que invierten en alquiler y pagan menos impuestos) y que las empresas paguen más que las familias por sus casas.',
        'Sumar (2024): 500.000 viviendas de alquiler social en una legislatura, con rentas de 400 a 600 euros al mes.',
        'Podemos, por su cuenta: bajar los alquileres por ley para que ningún hogar dedique más del 30 % de su renta, con contratos mucho más largos.',
      ],
      argumento: 'Dicen que, cuando empresas y fondos compran casas para ganar dinero, los precios suben y las familias se quedan fuera. Por eso piden sacar la vivienda del negocio y ampliar la vivienda pública.',
      critica: 'Sus críticos dicen que limitar precios y prohibir compras reduce los pisos en alquiler y choca con el derecho de propiedad y la libre circulación de capitales en la Unión Europea. También, que un parque público así tarda años y cuesta mucho.',
      fuentes: [
        { url: 'https://www.bolsamania.com/noticias_print/economia/economia--sumar-exige-derogar-las-socimis-y-prohibir-a-empresas-y-fondos-buitre-la-compra-de-vivienda--19368462.html', titulo: 'Europa Press (16-4-2025) · Sumar pide prohibir a empresas y fondos comprar vivienda y derogar las socimis' },
        { url: 'https://www.idealista.com/news/node/898214', titulo: 'idealista (20-5-2026) · El debate en el Congreso de la propuesta de Sumar y las enmiendas del PSOE' },
        { url: 'https://brainsre.news/que-propone-cada-partido-vivienda-elecciones-29n/', titulo: 'Brains Real Estate News (26-10-2026) · Qué propone cada partido sobre vivienda para el 29-N' },
      ],
    },
    {
      id: 'centro-izquierda',
      quien: 'PSOE y el Gobierno de Pedro Sánchez',
      cuando: 'Medidas anunciadas por el Gobierno en 2025 y enmiendas en el Congreso de 2026',
      idea: 'Más vivienda pública que no se vende, ayudas, y límites al alquiler donde falta casa, sin prohibir la compra.',
      propone: [
        'Mantener la Ley de Vivienda (2023), que permite limitar el alquiler en las zonas con escasez que declare cada comunidad autónoma.',
        'Una empresa pública estatal de vivienda con casas y suelo del Estado y de la Sareb (la sociedad que guarda pisos de los bancos rescatados), para alquiler asequible, y que lo construido con dinero público siga siendo público para siempre.',
        'Plan Estatal de Vivienda 2026-2030, con 7.000 millones de euros.',
        'Impuestos: hasta el 100 % del valor para quien compra sin vivir en la Unión Europea, IVA (el impuesto sobre lo que se compra) del 21 % en pisos turísticos y un 25 % a las SOCIMI que no alquilen a precio asequible.',
        'No pagar IRPF (el impuesto sobre la renta) por el alquiler si el casero cobra el precio de referencia.',
      ],
      argumento: 'Dicen que España tiene muy poca vivienda pública porque la protegida acabó pasando al mercado libre, y que la vivienda pagada con dinero de todos debe quedarse en manos públicas.',
      critica: 'Se le reprocha que buena parte de las medidas anunciadas en 2025 no se han aplicado, que solo unas pocas comunidades limitan el alquiler y que los precios siguen subiendo.',
      fuentes: [
        { url: 'https://www.lamoncloa.gob.es/presidente/actividades/paginas/2025/130125-sanchez-foro-vivienda.aspx', titulo: 'La Moncloa (13-1-2025) · Las medidas de vivienda anunciadas por Pedro Sánchez' },
        { url: 'https://www.idealista.com/news/node/898214', titulo: 'idealista (20-5-2026) · Las enmiendas del PSOE: gravar pisos vacíos, IVA turístico y socimis' },
        { url: 'https://www.elespanol.com/invertia/observatorios/vivienda/20260112/anuncios-sanchez-vivienda-medidas-ley-reales-decretos/1003744086413_0.html', titulo: 'El Español (12-1-2026) · Qué se ha aplicado de los anuncios de vivienda del Gobierno' },
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
      cuando: 'Propuesta en el Congreso y plan económico de junio de 2026, y propuestas recogidas en octubre de 2026',
      idea: 'Menos impuestos y normas para construir, y prioridad para los españoles en la vivienda pública.',
      propone: [
        '«Prioridad nacional»: que la vivienda protegida, el alquiler social y las ayudas vayan primero a los españoles.',
        'IVA cero en la compra de la primera vivienda y recuperar la deducción del IRPF (el impuesto sobre la renta) por vivienda habitual.',
        'Liberar suelo, quitar restricciones urbanísticas locales y regionales, no limitar el alquiler y derogar la Ley de Vivienda.',
        'Más control del padrón para evitar empadronamientos falsos y pisos sobreocupados.',
        'Desalojar a los ocupantes ilegales en 24 horas.',
      ],
      argumento: 'Dicen que el exceso de normas e impuestos encarece y retrasa la vivienda, y que los recursos públicos deben ir primero a los españoles.',
      critica: 'Sus críticos, entre ellos el Gobierno, dicen que la prioridad nacional es discriminatoria y contraria a la igualdad ante la ley; el PP votó en contra en el Congreso. Otros dicen que quitar límites al suelo favorece construir de forma dispersa.',
      fuentes: [
        { url: 'https://www.bolsamania.com/noticias_amp/empresas/economia--vox-plantea-al-congreso-una-votacion-para-pedir-la-prioridad-nacional-en-ayudas-para-vivienda--22717404.html', titulo: 'Europa Press (12-6-2026) · Vox lleva al Congreso la prioridad nacional en vivienda' },
        { url: 'https://www.elindependiente.com/espana/2026/06/27/plan-desregularizacion-vox-milei-elecciones-2027/', titulo: 'El Independiente (27-6-2026) · El plan de desregulación de Vox' },
        { url: 'https://brainsre.news/que-propone-cada-partido-vivienda-elecciones-29n/', titulo: 'Brains Real Estate News (26-10-2026) · Qué propone cada partido sobre vivienda para el 29-N' },
      ],
    },
  ],
  revisado: '2026-11-12',
};

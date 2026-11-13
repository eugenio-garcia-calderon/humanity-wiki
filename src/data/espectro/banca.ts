// «Otras propuestas» for the «banca» window. Positions checked on 2026-11-12/13.
// None of the camps has a proposal on *what* newly created bank money may finance;
// what they debate is the bank tax, mortgage guarantees, fees and cash. Each card
// says so in `nota` rather than inventing a position.
import type { Espectro } from './tipos';

export const ESPECTRO: Espectro | null = {
  tema: 'la banca',
  modelo: [
    'Los bancos crean dinero nuevo solo para producir (también para construir casas nuevas) y para la primera y la segunda vivienda de cada persona, con interés regulado.',
    'La tercera vivienda, y las empresas que compran casas o suelo, se pagan con dinero que ya existe: ahorro propio o inversores.',
    'Los bancos siguen siendo privados y compiten; el Banco de España pone topes a las hipotecas según el precio y el sueldo, y pide más capital si el crédito para comprar casas se dispara.',
    'Cuenta básica gratis para todos, atención en persona como derecho y más bancos locales y cooperativos.',
  ],
  limites: [
    'Sus críticos dicen que quien ya tiene dinero seguirá comprando casas al contado, y que los fondos pueden traer dinero de fuera, así que la regla frena el crédito pero no la compra.',
    'También, que España no controla el euro ni gran parte de las reglas bancarias, y que la regla necesitaría el visto bueno de la Unión Europea.',
    'Que poner un tope al interés hace que los bancos presten menos a quien tiene más riesgo, como jóvenes con contratos temporales, justo a quien se quiere ayudar.',
    'Y que contar cuántas casas tiene cada persona, también a través de empresas o familiares, exige un registro que hoy no existe.',
  ],
  posturas: [
    {
      id: 'izquierda',
      quien: 'Sumar (propuestas de 2025, hoy dentro del Frente Amplio); Podemos va aparte',
      cuando: 'Propuestas de Sumar de 2024 y 2025, y de Podemos en el Congreso en 2024',
      idea: 'La banca es un servicio de interés general: cuentas sin comisiones, hipotecas reguladas y más impuestos a sus beneficios.',
      propone: [
        'Declarar la banca «servicio de interés económico general», con obligaciones de servicio público.',
        'Obligar a todos los bancos a ofrecer una cuenta básica sin comisiones.',
        'Una hipoteca a tipo fijo regulada, ligada al interés de la deuda del Estado a diez años, de hasta 30 años y sin comisiones.',
        'Hacer permanente el impuesto a la banca (2024); Podemos, por su cuenta, pidió doblarlo (2024).',
        'Impulsar el euro digital para depender menos de las grandes empresas de tarjetas (2025).',
      ],
      nota: 'No hemos encontrado una propuesta concreta sobre para qué pueden crear dinero los bancos en sus textos publicados.',
      argumento: 'Dicen que los bancos obtienen grandes beneficios de un servicio que todos necesitan y que fue rescatado con dinero público, así que deben devolver parte a la sociedad.',
      critica: 'Sus críticos dicen que más impuestos y precios regulados encarecen el crédito o lo reducen, y que una hipoteca con interés fijado por ley puede dejar fuera a quien tiene más riesgo.',
      fuentes: [
        { url: 'https://www.helpmycash.com/blog/sumar-recupera-su-propuesta-de-cuentas-sin-comisiones-e-hipotecas-fijas-reguladas/', titulo: 'HelpMyCash (6-6-2025) · Sumar: cuentas sin comisiones e hipotecas fijas reguladas' },
        { url: 'https://www.moncloa.com/2024/04/09/psoe-podemos-impuesto-banca-2540532/', titulo: 'Moncloa.com (9-4-2024) · Debate en el Congreso de la propuesta de Podemos de doblar el impuesto a la banca' },
        { url: 'https://www.bolsamania.com/noticias/economia/economia--sumar-llama-a-promover-el-euro-digital-para-replicar-los-aranceles-de-trump-y-hacer-frente-a-visa-y-mastercard--19308122.html', titulo: 'Europa Press (7-4-2025) · Sumar pide impulsar el euro digital' },
      ],
    },
    {
      id: 'centro-izquierda',
      quien: 'PSOE y el Gobierno',
      cuando: 'Ley aprobada en diciembre de 2024, avales de 2023 ampliados en 2026 y acuerdo con la banca de 2022',
      idea: 'Que la banca aporte más en impuestos y garantice el servicio, y ayudar con avales públicos a comprar la primera vivienda.',
      propone: [
        'Un impuesto sobre lo que la banca gana con intereses y comisiones, del 1 % al 7 %, para 2024, 2025 y 2026 (Ley 7/2024).',
        'Avales del Estado, a través del ICO (Instituto de Crédito Oficial), del 20 % de la hipoteca de la primera vivienda para menores de 35 años y familias con hijos, ampliados hasta 2027.',
        'Acuerdo con los bancos (2022) para que haya algún punto de atención en persona en todos los municipios.',
        'Acuerdo con los bancos (2022) para dar horario ampliado y atención preferente a las personas mayores.',
      ],
      nota: 'No hemos encontrado una propuesta concreta sobre para qué pueden crear dinero los bancos en sus textos publicados.',
      argumento: 'Dicen que los bancos ganaron mucho con la subida de los tipos de interés y deben contribuir, y que el aval público ayuda a los jóvenes que pueden pagar una cuota pero no tienen ahorrada la entrada.',
      critica: 'Sus críticos dicen que el impuesto acaba en las comisiones y el precio del crédito, y que los avales para comprar empujan los precios de la vivienda; además, a enero de 2026 solo se había usado una pequeña parte.',
      fuentes: [
        { url: 'https://finreg360.com/alerta/la-ley-7-2024-introduce-un-impuesto-complementario-otro-sobre-los-intereses-y-comisiones-a-la-banca-y-nuevos-cambios-tributarios/', titulo: 'Finreg360 (diciembre de 2024) · La Ley 7/2024 y el impuesto sobre intereses y comisiones de la banca' },
        { url: 'https://www.eldebate.com/economia/20260114/gobierno-extiende-hasta-2027-avales-vivienda-pesar-solo-20-han-acogido-ellos_373978.html', titulo: 'El Debate (14-1-2026) · El Gobierno amplía hasta 2027 los avales ICO para la primera vivienda' },
        { url: 'https://clientebancario.bde.es/pcb/es/blog/las-entidades-de-credito-prestaran-servicios-financieros-presenciales-en-todos-los-municipios-espanoles.html', titulo: 'Banco de España (27-10-2022) · Servicio presencial en todos los municipios' },
      ],
    },
    {
      id: 'centro-derecha',
      quien: 'Partido Popular (PP)',
      cuando: 'Programa para el 29-N, noviembre de 2026, y posición en el Congreso en 2024',
      idea: 'Más avales y acuerdos con los bancos para que los jóvenes compren su primera casa, sin impuestos especiales a la banca.',
      propone: [
        'Avales públicos de hasta el 100 % para la hipoteca de la primera vivienda.',
        '«Hucha Hogar Joven»: el Estado avala una cantidad igual a lo que ahorre un menor de 40 años para su primera casa.',
        'Negociar con los bancos mejores condiciones de crédito para hipotecas y para construir, con el objetivo de un millón de viviendas.',
        'En contra del impuesto a la banca; en 2024 propuso dedicar lo que recauda a ayudas a hipotecas o a vivienda de precio tasado para jóvenes.',
      ],
      nota: 'No hemos encontrado una propuesta concreta sobre para qué pueden crear dinero los bancos en sus textos publicados.',
      argumento: 'Dicen que el problema de los jóvenes es reunir la entrada, y que con avales y más casas construidas podrán comprar; y que los impuestos especiales a la banca encarecen el crédito.',
      critica: 'Sus críticos dicen que avalar hipotecas de hasta el 100 % aumenta el endeudamiento de las familias y empuja los precios, y que sin el impuesto se pierde una recaudación que hoy financia servicios.',
      fuentes: [
        { url: 'https://www.democrata.es/actualidad/hucha-joven-feijoo-plan-vivienda-pp-elecciones-29n-bancos/', titulo: 'Demócrata (4-11-2026) · El plan de vivienda del PP para el 29-N: avales y bancos' },
        { url: 'https://www.pp.es/storage/2024/12/24.12.04.-Juan-Bravo-y-Alicia-Garcia-enmiendas-reforma-fiscal.pdf', titulo: 'PP (diciembre de 2024) · Enmiendas a la reforma fiscal y el impuesto a la banca' },
        { url: 'https://www.moncloa.com/2024/04/09/psoe-podemos-impuesto-banca-2540532/', titulo: 'Moncloa.com (9-4-2024) · Posición del PP sobre el impuesto a la banca' },
      ],
    },
    {
      id: 'derecha',
      quien: 'Vox',
      cuando: 'Propuestas de vivienda de 2026, posición en el Congreso en 2024 y campaña sobre el euro digital de noviembre de 2025',
      idea: 'Menos impuestos a la compra de vivienda y a la banca, y defensa del dinero en efectivo frente al euro digital.',
      propone: [
        'IVA cero (el impuesto sobre lo que se compra) en la primera vivienda (2026).',
        'Recuperar la deducción del IRPF (el impuesto sobre la renta) por pagar la hipoteca de la vivienda habitual (2026).',
        'En contra del impuesto a la banca: dice que crea inseguridad jurídica y aleja la inversión (2024).',
        'Proteger por ley el derecho a pagar en efectivo, rechazar el euro digital y pedir un referéndum en cada país ante cualquier paso para sustituir el efectivo (2025).',
      ],
      nota: 'No hemos encontrado una propuesta concreta sobre para qué pueden crear dinero los bancos en sus textos publicados.',
      argumento: 'Dicen que la presión fiscal aleja la inversión y que el efectivo protege la libertad y la intimidad de las personas frente a un control digital de los pagos.',
      critica: 'Sus críticos dicen que el euro digital sería voluntario y no sustituiría al efectivo, que la campaña describe usos que la propuesta de ley no prevé, y que bajar impuestos a la compra puede subir el precio de las casas.',
      fuentes: [
        { url: 'https://brainsre.news/que-propone-cada-partido-vivienda-elecciones-29n/', titulo: 'Brains Real Estate News (26-10-2026) · Qué propone cada partido sobre vivienda para el 29-N' },
        { url: 'https://www.moncloa.com/2024/04/09/psoe-podemos-impuesto-banca-2540532/', titulo: 'Moncloa.com (9-4-2024) · Posición de Vox sobre el impuesto a la banca' },
        { url: 'https://okdiario.com/espana/video-viral-vox-contra-euro-digital-no-metodo-pago-herramienta-control-15708060', titulo: 'OKDiario (5-11-2025) · Vox contra el euro digital y en defensa del efectivo' },
      ],
    },
  ],
  revisado: '2026-11-12',
};

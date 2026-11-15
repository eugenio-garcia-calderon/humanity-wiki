// The «onu» scale of the model: the planet, with the United Nations as today's example.
// Figures checked on 2026-11-13. Estimates (what the model would give) say so in the text:
// they come from `cuentasPais('literal').porEscala` (≈ 74.486 M€ a year from Spain alone)
// and the planet row of `MATRIZ`. Only what Spain would contribute is computed, never the
// whole world: the model's accounts exist for Spain only.
import type { Ambito, FuenteAmbito } from './tipos';

const F = {
  presupuesto2026: { titulo: 'Naciones Unidas · La Asamblea General aprueba 3.450 millones de dólares para 2026, un 7 % menos que lo aprobado para 2025 (30-12-2025)', url: 'https://www.un.org/en/node/238586' },
  propuestaSG: { titulo: 'Noticias ONU · El Secretario General propone recortar un 15,1 % el presupuesto ordinario de 2026 (octubre de 2025)', url: 'https://news.un.org/en/story/2025/10/1166128' },
  impagos: { titulo: 'The National (periódico) · La ONU avisa de riesgo de colapso financiero: 1.568 millones de dólares sin pagar al cierre de 2025 (30-1-2026)', url: 'https://www.thenationalnews.com/news/us/2026/01/30/un-warns-of-risk-of-imminent-financial-collapse' },
  escalaCuotas: { titulo: 'ONU · Resolución 79/249, escala de cuotas para 2025-2027', url: 'https://digitallibrary.un.org/record/4071844/files/A_RES_79_249-ES.pdf' },
  paz2025: { titulo: 'ONU Ginebra · La falta de fondos obliga a recortar las misiones de paz (presupuesto 2025-2026)', url: 'https://www.ungeneva.org/en/news-media/news/2025/10/111864/funding-crisis-forces-deep-cuts-un-peacekeeping-missions' },
  paz2026: { titulo: 'Misión de Japón ante la ONU (gobierno de un país) · Declaración de cierre sobre el presupuesto de paz 2026-2027 (30-6-2026)', url: 'https://www.un.emb-japan.go.jp/itpr_en/takehana063026.html' },
  poblacion: { titulo: 'Noticias ONU · Perspectivas de la Población Mundial 2024', url: 'https://news.un.org/en/story/2024/07/1151971' },
  ods2026: { titulo: 'ONU · Informe de los Objetivos de Desarrollo Sostenible 2026, nota de prensa (7-7-2026)', url: 'https://unstats.un.org/sdgs/files/report/2026/SDG_Report_2026_Press_Release_EN.pdf' },
  aod2025: { titulo: 'OCDE · La ayuda internacional cayó con fuerza en 2025 (datos de avance, abril de 2026)', url: 'https://www.oecd.org/en/about/news/press-releases/2026/04/international-aid-fell-sharply-in-2025-says-oecd.html' },
  aodEspana: { titulo: 'Ministerio de Asuntos Exteriores · Ayuda Oficial al Desarrollo de 2025', url: 'https://www.exteriores.gob.es/es/Comunicacion/NotasPrensa/Paginas/2026_NOTAS_P/La-Ayuda-Oficial-al-Desarrollo-espa%C3%B1ola-alcanza-su-mayor-cifra-de-los-ultimos-15-a%C3%B1os.aspx' },
  leyCooperacion: { titulo: 'La Moncloa · Ley de Cooperación para el Desarrollo Sostenible: el 0,7 % de la renta en 2030', url: 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/exteriores/Paginas/2023/090223-ley-cooperacion-desarrollo-solidaridad.aspx' },
  deudaUnctad: { titulo: 'UNCTAD (ONU) · Un mundo de deuda 2026', url: 'https://unctad.org/world-of-debt' },
  hipc: { titulo: 'Banco Mundial · Iniciativa para los países pobres muy endeudados', url: 'https://www.worldbank.org/en/topic/debt/brief/hipc' },
  convenioFiscal: { titulo: 'EY (consultora) · Quinta sesión del comité que negocia la convención fiscal de la ONU (28-8-2026)', url: 'https://taxnews.ey.com/news/2026-1864-un-intergovernmental-negotiating-committee-advances-negotiations-on-framework-convention-and-early-protocols-during-fifth-substantive-session' },
  convenioPlazo: { titulo: 'IISD (centro de estudios) · A mitad de la negociación de la convención fiscal de la ONU', url: 'https://www.iisd.org/articles/explainer/midpoint-un-tax-convention-negotiations-where-do-talks-stand' },
  eeuuFiscal: { titulo: 'Eurodad (red de organizaciones sociales) · Estados Unidos abandona la negociación de la convención fiscal (febrero de 2025)', url: 'https://www.eurodad.org/us-walks-out-tax-convention' },
  minimoGlobal: { titulo: 'Bruegel (centro de estudios) · ¿Ha sobrevivido el impuesto mínimo global? (13-1-2026)', url: 'https://www.bruegel.org/analysis/has-global-minimum-tax-survived-trump' },
  clima: { titulo: 'Noticias ONU · La cumbre del clima de Bakú (COP29) acuerda 300.000 millones de dólares al año', url: 'https://news.un.org/en/story/2024/11/1157416' },
  cijClima: { titulo: 'UNRIC (ONU) · Opinión de la Corte Internacional de Justicia sobre las obligaciones de los Estados ante el cambio climático', url: 'https://unric.org/en/climate-historic-icj-opinion-on-the-obligations-of-states/' },
  cpiEstados: { titulo: 'Corte Penal Internacional · Los Estados parte del Estatuto de Roma', url: 'https://asp.icc-cpi.int/states-parties' },
  hungria: { titulo: 'ASIL (sociedad de derecho internacional) · El Parlamento de Hungría revoca su salida de la Corte Penal Internacional (27-5-2026)', url: 'https://asil.org/ilib/hungarian-parliament-votes-to-reverse-icc-withdrawal/' },
  oms: { titulo: 'OMS · 78.ª Asamblea Mundial de la Salud, 20 de mayo de 2025', url: 'https://www.who.int/news/item/20-05-2025-seventy-eighth-world-health-assembly---daily-update--20-may-2025' },
  omsEeuu: { titulo: 'Gobierno de Estados Unidos (Departamento de Salud) · Hoja informativa sobre la salida de la OMS', url: 'https://www.hhs.gov/press-room/fact-sheet-us-withdrawal-from-the-world-health-organization.html' },
  habitat: { titulo: 'ONU DESA con datos de ONU-Hábitat · 318 millones de personas sin hogar y 2.800 millones sin vivienda adecuada', url: 'https://social.desa.un.org/world-summit-2025/blog/300million-people-homeless-worldwide' },
  carta: { titulo: 'ONU · Carta de las Naciones Unidas, capítulo V: el Consejo de Seguridad', url: 'https://www.un.org/es/about-us/un-charter/chapter-5' },
  itu: { titulo: 'UIT (ONU) · Datos y cifras 2025 de conexión a internet (17-11-2025)', url: 'https://www.itu.int/en/mediacentre/Pages/PR-2025-11-17-Facts-and-Figures.aspx' },
  pactoDigital: { titulo: 'ONU Ecuador · La ONU adopta el Pacto para el Futuro y el Pacto Digital Mundial (24-9-2024)', url: 'https://ecuador.un.org/es/279583-las-naciones-unidas-adoptan-un-innovador-pacto-para-el-futuro-con-el-fin-de-transformar-la' },
} satisfies Record<string, FuenteAmbito>;

export const AMBITO: Ambito | null = {
  id: 'onu',
  nombre: 'Naciones Unidas (el planeta)',
  escala: 'planeta',
  quien: 'Los 193 países de la Asamblea General de las Naciones Unidas, su Consejo de Seguridad y sus agencias',
  resumen: [
    'El planeta es la última de las ocho escalas del modelo. Recibe una octava parte de lo que se recauda y responde de lo que no tiene fronteras: el clima, los océanos, la paz, las catástrofes, el hambre, la salud global y la ciencia abierta.',
    'Hoy la ONU no recauda nada. Vive de las cuotas que pagan los países, cuando las pagan, y de donaciones voluntarias. Su presupuesto ordinario de 2026 es de 3.450 millones de dólares: alrededor de un 7 % menos que lo aprobado para 2025. El Secretario General había propuesto recortar un 15 %.',
    'Estimación del modelo: si España lo aplicara, la parte del planeta sería de unos 74.500 millones de euros al año, unos 1.516 € por habitante. Es más de veinte veces el presupuesto ordinario de toda la ONU, y unas 16 veces la ayuda al desarrollo que dio España en 2025. Es solo lo que pondría España.',
    'Lo que no le toca: no gobierna países ni pone multas. Reparte en tres tercios (producir, cuidar y libre), guarda al menos una quinta parte del libre para catástrofes y no puede endeudarse. Ayuda a escalas más pequeñas con préstamos sin intereses, solo ajustados a la subida de precios.',
    'Que el planeta reciba su parte directamente exige un acuerdo entre muchos países. Mientras no exista, cada país tendría que entregarla como aportación.',
  ],
  cifras: [
    { valor: '8.200 millones', texto: 'Personas en el mundo a mediados de 2024. La ONU calcula que llegarán a unos 10.300 millones hacia 2085.', fuente: F.poblacion },
    { valor: '3.450 M$', texto: 'Presupuesto ordinario de la ONU para 2026, alrededor de un 7 % menos que lo aprobado para 2025. Las misiones de paz van aparte: unos 5.100 millones de dólares entre julio de 2026 y junio de 2027.', fuente: F.presupuesto2026 },
    { valor: '111 billones $', texto: 'Deuda pública de todos los países del mundo en 2025. Los países en desarrollo pagaron 995.000 millones de dólares solo en intereses.', fuente: F.deudaUnctad },
    { valor: '36 %', texto: 'Metas de los Objetivos de Desarrollo Sostenible que avanzan bien o a ritmo moderado, a cuatro años de 2030. Un 15 % ha retrocedido.', fuente: F.ods2026 },
  ],
  areas: {
    escalas: {
      fuentes: [F.aod2025, F.leyCooperacion],
      hoy: 'La ayuda de los países ricos a los pobres la decide cada gobierno cada año. En 2025 cayó un 23,1 %, la mayor caída de la historia: 174.300 millones de dólares, el 0,26 % de su renta. Solo Dinamarca, Luxemburgo, Noruega y Suecia llegan al 0,7 % prometido.',
      propuesta: [
        'La ayuda deja de depender del gobierno de turno: la parte del planeta llega con cada pago, todos los meses.',
        'El planeta ayuda a los continentes y países donde falta lo básico. Con el tercio de producir, pone energía limpia, semillas y riego. Con el de cuidar, combate el hambre y responde a las catástrofes.',
        'Ejemplo: en el Sahel, en lugar de donaciones que cambian cada año, placas solares y pozos que se quedan en los pueblos, con préstamos sin intereses que vuelven al fondo común.',
      ],
      cifras: [
        { valor: '−23,1 %', texto: 'Caída de la ayuda oficial al desarrollo en 2025 respecto a 2024, descontada la inflación (datos de avance de la Organización para la Cooperación y el Desarrollo Económicos, OCDE).', fuente: F.aod2025 },
        { valor: '4.550 M€', texto: 'Ayuda oficial al desarrollo de España en 2025. Una ley de 2023 compromete a España a llegar al 0,7 % de su renta en 2030.', fuente: F.aodEspana },
      ],
    },
    impuestos: {
      fuentes: [F.convenioFiscal, F.convenioPlazo, F.eeuuFiscal, F.minimoGlobal],
      hoy: 'La ONU no cobra impuestos. Desde 2025 sus países negocian una convención marco de cooperación fiscal; el texto final debe llegar a la Asamblea General hacia 2027. Estados Unidos dejó la negociación en febrero de 2025. Aparte, la OCDE pactó un impuesto mínimo del 15 % a las grandes multinacionales, que ya aplican más de 55 países y territorios.',
      propuesta: [
        'El modelo no grava los beneficios de las empresas: grava cada pago, con cuatro tramos (10, 20, 40 y 60 %). Así una multinacional paga donde vende, y no puede llevarse la factura a otro país.',
        'La convención fiscal de la ONU sería el sitio para pactar dos cosas: que cada país envíe automáticamente la octava parte del planeta, y una lista común de qué es básico y qué es lujo.',
        'Mientras convivan los dos sistemas, el planeta publica los datos de cada país y de cada gran empresa, con las cuentas abiertas.',
      ],
      cifras: [
        { valor: '6.ª sesión', texto: 'La negociación de la convención fiscal sigue en Nairobi del 30 de noviembre al 10 de diciembre de 2026, con un protocolo para resolver disputas entre países.', fuente: F.convenioFiscal },
        { valor: '15 %', texto: 'Impuesto mínimo global a las grandes multinacionales. En enero de 2026 se acordó un sistema «lado a lado» que deja fuera de parte de las reglas a los grupos de Estados Unidos.', fuente: F.minimoGlobal },
      ],
    },
    presupuestos: {
      fuentes: [F.presupuesto2026, F.propuestaSG, F.escalaCuotas, F.impagos],
      hoy: 'Cada país paga una cuota según su riqueza: Estados Unidos el 22 % (el máximo), China el 20 % y España el 1,9 %. Al cerrar 2025 faltaban 1.568 millones de dólares por cobrar, un récord, y la ONU suprimió 2.900 puestos para 2026.',
      propuesta: [
        'La ONU deja de depender de que cada gobierno pague: su octava parte llega con cada compra y cada sueldo, en todo el mundo.',
        'Reparte en tres tercios. Producir: energía limpia, satélites y ciencia abierta. Cuidar: hambre cero, salud global y catástrofes. Libre: paz, océanos y exploración espacial, con al menos un 20 % de ese tercio para la caja de contingencias.',
        'Decide una asamblea de delegados de cada continente, con consultas abiertas a todas las personas y prioridades cada cinco años. Estimación con los datos de España: el clima, con el 18 %, recibiría unos 13.400 millones de euros al año solo de España.',
      ],
      cifras: [
        { valor: '1,895 %', texto: 'Cuota de España en el presupuesto ordinario de 2025 a 2027. Sobre 3.450 millones son unos 65 millones de dólares al año (cálculo aproximado).', fuente: F.escalaCuotas },
        { valor: '1.568 M$', texto: 'Cuotas sin pagar al cierre de 2025. Según la ONU, Estados Unidos debe cerca del 95 %. Dato publicado por la prensa a partir de la información de la ONU.', fuente: F.impagos },
      ],
    },
    deuda: {
      fuentes: [F.hipc, F.deudaUnctad],
      hoy: 'El Fondo Monetario Internacional y el Banco Mundial prestan a los países y, a veces, perdonan deuda. Desde 1996, su iniciativa para los países pobres muy endeudados ha aliviado a 37 países, 31 de ellos africanos. Aun así, 3.700 millones de personas viven en países que gastan más en intereses que en salud o en educación.',
      propuesta: [
        'Ninguna escala se endeuda, tampoco el planeta. Lo que tiene, lo presta sin intereses, solo ajustado a la subida de precios, y el dinero vuelve con el mismo valor.',
        'El planeta podría cambiar la deuda cara de un país pobre por un préstamo suyo sin intereses. Así el país deja de pagar intereses y puede gastar ese dinero en salud y escuelas.',
        'Para una catástrofe que no se puede devolver, una donación puntual de la caja de contingencias, no un préstamo.',
      ],
      cifras: [
        { valor: '3.700 millones', texto: 'Personas que viven en 51 países en desarrollo que gastan más en intereses de su deuda que en salud o en educación (2025).', fuente: F.deudaUnctad },
        { valor: '> 100.000 M$', texto: 'Deuda perdonada a 37 países pobres desde 1996 por el Fondo Monetario Internacional, el Banco Mundial y otros acreedores.', fuente: F.hipc },
      ],
    },
    banca: {
      hoy: 'No hay un banco mundial que regule a los bancos. Los acuerdos de Basilea, que redactan los bancos centrales y supervisores de muchos países, fijan cuánto capital propio debe tener un banco en casi todo el mundo.',
      propuesta: [
        'Que el crédito para comprar activos ya existentes (casas, acciones) pida más capital que el crédito para producir. Así la regla del modelo sería más fácil de aplicar en todas partes.',
        'El fondo del planeta presta sin intereses a los países, en lugar de que lo hagan bancos y fondos con intereses altos.',
      ],
    },
    vivienda: {
      fuentes: [F.habitat],
      hoy: 'ONU-Hábitat estudia, aconseja y apoya proyectos, pero no obliga a ningún país. En el mundo hay 318 millones de personas sin hogar y 2.800 millones sin una vivienda adecuada.',
      propuesta: [
        'Un estándar mínimo de vivienda digna para todos los países: techo seguro, agua, saneamiento y luz.',
        'Cada año publica, país por país, cuántas personas viven sin hogar o en una vivienda inadecuada. El país que no avanza lo explica ante la asamblea del planeta; no hay multas.',
        'Da refugio a quien huye de una guerra o un desastre. Estimación: con el 2 % de su parte, solo lo que pondría España serían unos 1.490 millones de euros al año.',
      ],
      cifras: [
        { valor: '2.800 millones', texto: 'Personas sin una vivienda adecuada en el mundo, según datos de ONU-Hábitat.', fuente: F.habitat },
      ],
    },
    seguridad: {
      fuentes: [F.carta, F.paz2025, F.paz2026],
      hoy: 'El Consejo de Seguridad tiene 15 miembros. Cinco son permanentes y tienen veto: China, Estados Unidos, Francia, Reino Unido y Rusia. Por falta de dinero, la ONU recortó en 2025 alrededor de una cuarta parte del personal de sus misiones de paz (los cascos azules).',
      propuesta: [
        'Las misiones de paz cobran su parte con cada pago y no se recortan porque un país no pague.',
        'El planeta dedica un 6 % a la paz (mediación, misiones y desarme) y otro 6 % a las catástrofes (alerta temprana de terremotos, tsunamis y huracanes, y vigilancia de asteroides).',
        'Las prioridades las fija la asamblea de delegados de los continentes. Cómo encajaría el veto de los cinco miembros permanentes es una pregunta abierta del modelo.',
      ],
      cifras: [
        { valor: '5.380 M$', texto: 'Presupuesto de las misiones de paz de julio de 2025 a junio de 2026, frente a 5.600 millones el periodo anterior.', fuente: F.paz2025 },
        { valor: '≈ 5.100 M$', texto: 'Presupuesto de paz de julio de 2026 a junio de 2027, según la declaración de Japón en la comisión de presupuesto.', fuente: F.paz2026 },
      ],
    },
    justicia: {
      fuentes: [F.cijClima, F.cpiEstados, F.hungria],
      hoy: 'La Corte Internacional de Justicia resuelve conflictos entre Estados. En julio de 2025 dijo, por unanimidad, que los Estados tienen obligaciones legales frente al cambio climático. La Corte Penal Internacional juzga a personas por genocidio y crímenes de guerra; tiene 125 Estados parte.',
      propuesta: [
        'Juzgar lo que ningún país puede juzgar solo: crímenes de guerra, genocidio y conflictos entre Estados.',
        'Las dos cortes se pagan con el tercio libre del planeta, con sus cuentas y sus datos abiertos, y no dependen de que un país pague o se vaya.',
        'Ejemplo: la opinión sobre el clima de 2025 serviría de base para el examen público que cada país pasa cada año ante la asamblea del planeta.',
      ],
      cifras: [
        { valor: '125', texto: 'Estados parte de la Corte Penal Internacional. Hungría iba a salir el 2 de junio de 2026 y su parlamento lo revocó en mayo.', fuente: F.cpiEstados },
      ],
    },
    sanidad: {
      fuentes: [F.oms, F.omsEeuu],
      hoy: 'La Organización Mundial de la Salud (OMS) aprobó para 2026 y 2027 un presupuesto base de 4.200 millones de dólares, recortado desde 5.300. Subió un 20 % las cuotas de los países y en mayo de 2025 adoptó un Acuerdo sobre Pandemias. Estados Unidos salió de la OMS en enero de 2026.',
      propuesta: [
        'La salud global recibe el 12 % de la parte del planeta. Estimación: solo lo que pondría España serían unos 8.900 millones de euros al año, más del doble del presupuesto base de la OMS para dos años.',
        'Se gasta en prevenir pandemias, en agua potable y en vacunas para todos, compradas en conjunto para pagar menos.',
        'Los comités científicos publican sus datos y sus métodos, para que cualquiera pueda comprobarlos.',
      ],
      cifras: [
        { valor: '4.200 M$', texto: 'Presupuesto base de la OMS para 2026 y 2027 (dos años).', fuente: F.oms },
        { valor: '22-1-2026', texto: 'Fecha en que se hizo efectiva la salida de Estados Unidos de la OMS.', fuente: F.omsEeuu },
      ],
    },
    educacion: {
      fuentes: [F.ods2026],
      hoy: 'La UNESCO, la agencia de la ONU para la educación, la ciencia y la cultura, coordina el objetivo de una educación de calidad para todos. Hoy 273 millones de niños y jóvenes no van a la escuela.',
      propuesta: [
        'Escuelas donde faltan, y aprendizaje abierto y gratuito en internet para cualquiera.',
        'La educación recibe el 6 % de la parte del planeta. Estimación: solo lo que pondría España serían unos 4.500 millones de euros al año.',
      ],
      cifras: [
        { valor: '273 millones', texto: 'Niños y jóvenes sin escolarizar en el mundo.', fuente: F.ods2026 },
      ],
    },
    legal: {
      fuentes: [F.clima],
      hoy: 'Los países firman acuerdos, pero cada uno decide si los cumple. En clima, la cumbre de Bakú de 2024 fijó que los países ricos aporten al menos 300.000 millones de dólares al año, dentro de un objetivo total de 1,3 billones para 2035.',
      propuesta: [
        'Acuerdos mínimos que todos cumplen: clima, océanos y sustancias peligrosas.',
        'Una lista mundial común de sustancias prohibidas, para que un producto no sea legal en un país y tóxico en el de al lado.',
        'Los fondos del clima dejan de ser promesas: el clima y los océanos son la partida mayor del planeta, el 18 % de lo que recibe.',
      ],
      cifras: [
        { valor: '300.000 M$', texto: 'Financiación del clima que los países ricos se comprometieron a aportar cada año en la cumbre de Bakú (2024).', fuente: F.clima },
      ],
    },
    digital: {
      fuentes: [F.pactoDigital, F.itu],
      hoy: 'En septiembre de 2024 la ONU adoptó el Pacto Digital Mundial: conectar a todas las personas, escuelas y hospitales, y crear un panel científico sobre inteligencia artificial. En 2025 seguían sin internet 2.200 millones de personas.',
      propuesta: [
        'Normas abiertas y comunes, como las llaves de acceso que ya funcionan en los navegadores, para que una firma digital se reconozca entre países.',
        'Ciencia abierta y bibliotecas libres, pagadas con el 9 % de la parte del planeta.',
        'Conectar primero las escuelas y los consultorios de los países donde menos gente usa internet.',
      ],
      cifras: [
        { valor: '94 % y 23 %', texto: 'Personas que usan internet en los países ricos y en los países pobres (2025).', fuente: F.itu },
        { valor: '2.200 millones', texto: 'Personas sin conexión a internet en 2025.', fuente: F.itu },
      ],
    },
  },
  revisado: '2026-11-13',
};


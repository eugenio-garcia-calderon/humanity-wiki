// Data for the «Digital» window of the «Modelo socioeconómico optimizado» (Eugenio, 2026-11-12):
// sign and identify yourself with the phone you already have — no certificates, no AutoFirma,
// nothing to install — with a phone line for whoever has no phone.
// Every real figure carries its source (FUENTES_DIGITAL). Searched on 2026-11-12.
import type { EscalaId } from './modeloSocioeconomico';

// `APARTADOS` drives the window's submenu (ventanas.tsx): the first id is the window's own id.
export const APARTADOS: { id: string; t: string }[] = [
  { id: 'digital', t: 'Resumen' },
  { id: 'digital-hoy', t: 'Cómo se firma hoy' },
  { id: 'digital-recorrido', t: 'Hoy y propuesta, paso a paso' },
  { id: 'digital-propuesta', t: 'La propuesta' },
  { id: 'digital-paises', t: 'Otros países' },
  { id: 'digital-escalas', t: 'Cada escala' },
  { id: 'digital-retos', t: 'Retos' },
  { id: 'digital-fuentes', t: 'Fuentes' },
];

export interface FuenteDigital { id: string; url: string; titulo: string }

export const FUENTES_DIGITAL: FuenteDigital[] = [
  { id: 'ine-tic', url: 'https://ine.es/dyngs/Prensa/TICH2025.htm', titulo: 'INE · Encuesta TIC en los hogares 2025 (20-11-2025)' },
  { id: 'carpeta', url: 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/transformacion-digital-y-funcion-publica/Paginas/2026/200526-lopez-carpeta-ciudadana.aspx', titulo: 'La Moncloa · «Mi Carpeta Ciudadana» supera los 9 millones de usuarios (20-05-2026)' },
  { id: 'aeat-clave-2022', url: 'https://sede.agenciatributaria.gob.es/Sede/en_gb/informacion-institucional/memorias/memoria-2022/4-principales-actuaciones/4_3-fomento-prestacion-servicios-medios-electronicos/4_3_1-identificacion-autenticacion-firma-clave-pin.html', titulo: 'Agencia Tributaria · Memoria 2022: personas registradas en Cl@ve (último dato publicado que hemos encontrado)' },
  { id: 'clave', url: 'https://clave.gob.es/clave_Home/en/clave/queEs.html', titulo: 'Cl@ve · Qué es Cl@ve (métodos y registro)' },
  { id: 'clave-pin', url: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/firma-digital-sistema-clave-pin-tecnica/caducidad-clave-pin.html', titulo: 'Agencia Tributaria · Caducidad de la petición y del PIN de Cl@ve' },
  { id: 'clave-telefono', url: 'https://sede.agenciatributaria.gob.es/Sede/ayuda/firma-electronica-sistema-clave-ayuda-tecnica/clave-ayuda-tecnica/incidencias-tecnicas-clave-pin/usuario-registrado-clave-sin-telefono-telefono.html', titulo: 'Agencia Tributaria · Usuario registrado en Cl@ve sin teléfono o con otro número' },
  { id: 'fnmt-pasos', url: 'https://www.sede.fnmt.gob.es/certificados/persona-fisica/obtener-certificado-software', titulo: 'FNMT · Obtener el certificado de persona física (cuatro pasos)' },
  { id: 'fnmt-config', url: 'https://www.sede.fnmt.gob.es/certificados/persona-fisica/obtener-certificado-software/configuracion-previa', titulo: 'FNMT · Configuración previa: instalar el Configurador FNMT-RCM' },
  { id: 'fnmt-validez', url: 'https://www.sede.fnmt.gob.es/documents/10445900/10573653/Condiciones_de_uso_certificados_de_persona_fisica.pdf', titulo: 'FNMT · Condiciones de uso del certificado de persona física (validez de 4 años)' },
  { id: 'autofirma', url: 'https://firmaelectronica.gob.es/Home/Descargas.html', titulo: 'Portal de firma electrónica · Descargas de AutoFirma' },
  { id: 'midni', url: 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/interior/Paginas/2025/nuevo-dni-digital.aspx', titulo: 'La Moncloa · DNI digital: qué es y cómo activarlo (abril de 2025)' },
  { id: 'midni-2026', url: 'https://www.applesfera.com/aplicaciones-ios/llevo-ano-dni-iphone-fin-totalmente-legal-esto-todo-que-puedes-no-puedes-hacer', titulo: 'Applesfera · Un año de DNI en el móvil: lo que se puede y no se puede hacer (02-04-2026)' },
  { id: 'tel-060', url: 'https://administracion.gob.es/pag_Home/contacto/telefono-060.html', titulo: 'administracion.gob.es · Teléfono 060' },
  { id: 'defensor-2025', url: 'https://www.defensordelpueblo.es/noticias/pleno-congreso-informe-2025/', titulo: 'Defensor del Pueblo · Informe 2025 presentado en el Congreso (28-05-2026)' },
  { id: 'defensor-2025-debate', url: 'https://www.defensordelpueblo.es/wp-content/uploads/2026/07/VOLUMEN-II-IA-2025.pdf', titulo: 'Defensor del Pueblo · Informe anual 2025, volumen II (debates)' },
  { id: 'incibe-sim', url: 'https://www.incibe.es/ciudadania/blog/sim-swapping-como-evitar-esta-estafa', titulo: 'INCIBE · SIM swapping: cómo evitar esta estafa' },
  { id: 'eidas-niveles', url: 'https://ec.europa.eu/digital-building-blocks/sites/display/DIGITAL/eIDAS+Levels+of+Assurance', titulo: 'Comisión Europea · Niveles de seguridad de eIDAS' },
  { id: 'eidas2', url: 'https://eur-lex.europa.eu/eli/reg/2024/1183/oj/spa', titulo: 'EUR-Lex · Reglamento (UE) 2024/1183 (eIDAS2, cartera europea de identidad digital)' },
  { id: 'eudi-ce', url: 'https://digital-strategy.ec.europa.eu/pt/policies/eudi-regulation', titulo: 'Comisión Europea · Reglamento de la identidad digital europea' },
  { id: 'eudi-calendario', url: 'https://www.garrigues.com/es_ES/garrigues-digital/cartera-europea-identidad-digital-ya-tiene-calendario-tareas-completar-antes', titulo: 'Garrigues · Calendario de la cartera europea de identidad digital (30-09-2026)' },
  { id: 'eudi-retraso', url: 'https://es.euronews.com/2026/09/16/solo-tres-paises-de-la-ue-cumplen-el-plazo-de-implantacion-de-la-cartera-digital-de-identi', titulo: 'Euronews · Solo tres países de la UE cumplen el plazo de la cartera (16-09-2026)' },
  { id: 'rd-cartera', url: 'https://digital.gob.es/ministerio/participacion-proyectos-normativos/informacion-publica/2026-09-30', titulo: 'Ministerio para la Transformación Digital · Proyecto de real decreto de la cartera europea en España' },
  { id: 'passkeys', url: 'https://fidoalliance.org/passkeys/', titulo: 'FIDO Alliance · Qué son las llaves de acceso (passkeys)' },
  { id: 'mitid', url: 'https://en.digst.dk/numbers-and-statistics/', titulo: 'Agencia Danesa de Digitalización · Cifras de MitID (abril de 2026)' },
  { id: 'bankid', url: 'https://www.riksbank.se/en-gb/payments--cash/payments-in-sweden/payments-report-2025/safety-efficiency-and-accessibility/are-payments-in-sweden-safe/a-government-e-id-could-strengthen-resilience/', titulo: 'Riksbank · Informe de pagos 2025: una identidad electrónica pública' },
  { id: 'estonia', url: 'https://e-estonia.com/service/estonian-e-identity/', titulo: 'e-Estonia · Identidad electrónica de Estonia' },
  { id: 'estonia-ria', url: 'https://www.ria.ee/sites/default/files/documents/2025-10/Estonian-eID-ecosystem.pdf', titulo: 'RIA (Estonia) · El ecosistema de identidad electrónica estonio (octubre de 2025)' },
  { id: 'esign-india', url: 'https://cca.gov.in/sites/files/pdf/esign/esignbrochure1.5.pdf', titulo: 'CCA (India) · eSign: firma electrónica en línea con Aadhaar' },
];

export const FUENTE_DIGITAL: Record<string, FuenteDigital> = Object.fromEntries(FUENTES_DIGITAL.map(f => [f.id, f]));

/** INE 2025, people aged 16–74, last 12 months, private reasons. */
export const INE_2025 = {
  usanInternet: 96.3,
  tratanConAdministracion: 80.7,
  usos: [
    { t: 'Consultar sus datos guardados en la administración', pct: 62.6 },
    { t: 'Pedir cita o hacer una reserva', pct: 61.9 },
    { t: 'Pedir documentos oficiales o reclamar', pct: 42.3 },
    { t: 'Descargar o imprimir un formulario oficial', pct: 41.2 },
    { t: 'Presentar ella misma la declaración de la renta', pct: 38.1 },
  ],
};

export const CIFRAS = {
  /** AEAT, 31-12-2022: people registered in Cl@ve PIN. */
  clavePin2022: 16_106_143,
  /** La Moncloa, 20-05-2026. */
  carpetaUsuarios: 9_200_000,
  /** FNMT: years a citizen certificate lasts. */
  fnmtValidezAnos: 4,
  /** AEAT: minutes a Cl@ve PIN lasts. */
  clavePinMinutos: 5,
  /** Defensor del Pueblo, 2025: people attended by phone and in person. */
  defensorTelefono: 42_785,
  defensorPresencial: 1_493,
  /** Denmark, digst.dk (April 2026). */
  mitidUsuarios: 5_300_000,
  mitidPct: 97.2,
  mitidMes: 94_400_000,
  mitidExentos: 225_120,
  /** Sweden, Riksbank 2025. */
  bankidUsuarios: 8_500_000,
};

/** The ways of identifying and signing with the Spanish administration today. */
export const METODOS_HOY: { id: string; t: string; que: string; necesitas: string; pega: string; fuentes: string[] }[] = [
  {
    id: 'fnmt', t: 'Certificado digital de la FNMT',
    que: 'Un archivo con tus claves que vive en un ordenador concreto. Sirve para casi todo.',
    necesitas: 'Instalar un programa (el Configurador FNMT), pedirlo por internet, ir en persona a una oficina con cita y descargarlo en el mismo ordenador.',
    pega: `Dura ${4} años. Si cambias de ordenador o lo formateas antes de descargarlo, empiezas de nuevo.`,
    fuentes: ['fnmt-pasos', 'fnmt-config', 'fnmt-validez'],
  },
  {
    id: 'dnie', t: 'DNI electrónico (DNIe)',
    que: 'El chip del carné lleva dos certificados: uno para identificarte y otro para firmar.',
    necesitas: 'Un lector de tarjetas o un móvil que lo lea, el PIN del chip y, para firmar, AutoFirma.',
    pega: 'Si olvidas el PIN, hay que cambiarlo en una máquina de la comisaría.',
    fuentes: ['midni'],
  },
  {
    id: 'clave', t: 'Cl@ve (PIN, Permanente y Móvil)',
    que: 'Lo más parecido a lo que pide la propuesta: un código por SMS o una confirmación en el móvil.',
    necesitas: 'Registrarse antes (en oficina, por carta de invitación, con certificado o por videollamada en la app Cl@ve). Cl@ve Móvil pide instalar la app.',
    pega: 'Cada código caduca a los 5 minutos y solo admite un teléfono. Si cambias de número, para actualizarlo necesitas certificado, DNIe o una cita en oficina.',
    fuentes: ['clave', 'clave-pin', 'clave-telefono'],
  },
  {
    id: 'autofirma', t: 'AutoFirma',
    que: 'El programa del Gobierno que firma los documentos cuando la sede te lo pide.',
    necesitas: 'Instalarlo en el ordenador (Windows, Mac o Linux) y tener ya un certificado o el DNIe. Hay versiones distintas según el sistema.',
    pega: 'No te identifica: solo firma con un certificado que ya tienes. Sin certificado, AutoFirma no sirve.',
    fuentes: ['autofirma'],
  },
  {
    id: 'midni', t: 'App MiDNI (desde abril de 2025)',
    que: 'El DNI en el móvil, con un código QR que caduca en segundos.',
    necesitas: 'El DNI físico en vigor, vincularlo (con lector de tarjetas, en comisaría o al renovar), una contraseña de 8 caracteres y un código por SMS.',
    pega: 'Sirve para enseñar el DNI en persona. Para trámites por internet y para firmar todavía no: llegará en una segunda fase.',
    fuentes: ['midni', 'midni-2026'],
  },
];

/** The path of signing something today with an FNMT certificate, step by step. */
export const PASOS_HOY: { t: string; d: string; instala?: boolean; oficina?: boolean }[] = [
  { t: 'Instalar el Configurador FNMT', d: 'Un programa que crea tus claves. El antivirus puede bloquearlo.', instala: true },
  { t: 'Pedir el certificado por internet', d: 'Te llega un código de solicitud al correo.' },
  { t: 'Pedir cita y acudir a una oficina', d: 'Con el código y el DNI, a Hacienda, la Seguridad Social u otra.', oficina: true },
  { t: 'Descargarlo en el mismo ordenador', d: 'Más o menos una hora después; sin formatear entre medias.' },
  { t: 'Instalar AutoFirma', d: 'La versión que toca para tu sistema.', instala: true },
  { t: 'Entrar en la sede y firmar', d: 'El navegador abre AutoFirma, eliges el certificado y firmas.' },
  { t: 'Repetirlo cada cuatro años', d: 'Y cada vez que cambias de ordenador, exportar una copia.' },
];

/** The same signature with the proposal. */
export const PASOS_PROPUESTA: { t: string; d: string; unaVez?: boolean }[] = [
  { t: 'Darte de alta, una sola vez', d: 'Tu móvil, tu correo y tu DNI, comprobado en persona o escaneándolo con la cámara.', unaVez: true },
  { t: 'Te llega el aviso al móvil', d: '«¿Firmas la solicitud de beca?», con un enlace al documento para leerlo.' },
  { t: 'Desbloqueas y escribes el código', d: 'El que te llega por SMS. Firmado.' },
];

/** The proposal as four pieces. The SMS code on the unlocked phone is the base; fingerprint/passkey is an optional upgrade. */
export const PIEZAS: { id: string; t: string; corto: string; d: string; vale: string }[] = [
  {
    id: 'alta', t: 'Alta, una sola vez', corto: 'Móvil + correo + DNI',
    d: 'Das tu móvil y tu correo, y se comprueba tu DNI una vez: en cualquier oficina pública o escaneándolo con la cámara junto a tu cara. Sin eso, cualquiera podría darse de alta en tu nombre.',
    vale: 'Se hace una vez y sirve para todo',
  },
  {
    id: 'normal', t: 'Firma normal', corto: 'Móvil desbloqueado + código por SMS',
    d: 'Para casi todo: una cita, una solicitud, un contrato de alquiler. Te llega el aviso, lees lo que firmas, y con el móvil desbloqueado escribes el código del SMS. Quien quiera puede usar además su huella o su cara.',
    vale: 'Valdría como la firma avanzada de hoy',
  },
  {
    id: 'reforzada', t: 'Firma reforzada', corto: 'Además, escanear el DNI y la cara',
    d: 'Para lo grave: vender una casa, una hipoteca, un poder, cambiar el móvil de tu alta. Además del código, escaneas el DNI y tu cara en ese momento, o lo haces en una oficina.',
    vale: 'Podría valer como firma cualificada si el servicio y el certificado están acreditados por un organismo oficial',
  },
  {
    id: 'telefono', t: 'Teléfono de atención', corto: 'Para quien no tiene móvil',
    d: 'Un número gratuito con personas al otro lado. Te ayudan a darte de alta, a firmar o a recuperar tu cuenta. Quien no tiene móvil se identifica una vez en persona y luego firma por teléfono con una clave, o en la oficina más cercana.',
    vale: 'Según lo que firmes',
  },
];

/** eIDAS assurance levels and what each is enough for (proposal's mapping). */
export const NIVELES: { id: string; t: string; exige: string; basta: string; propuesta: string }[] = [
  {
    id: 'bajo', t: 'Bajo',
    exige: 'Te registras tú en una web, sin que nadie compruebe quién eres.',
    basta: 'Cosas sin riesgo: suscribirte a avisos, opinar en una consulta pública.',
    propuesta: 'No hace falta firmar: basta con tu correo.',
  },
  {
    id: 'sustancial', t: 'Sustancial',
    exige: 'Se comprueba tu identidad al darte de alta, y entras con dos pruebas, por ejemplo contraseña y un código en el móvil.',
    basta: 'La mayoría de trámites: citas, solicitudes, recibos, contratos corrientes.',
    propuesta: 'La firma normal: móvil desbloqueado y código por SMS.',
  },
  {
    id: 'alto', t: 'Alto',
    exige: 'Alta en persona (o equivalente) y una prueba muy difícil de copiar, como el chip del DNI.',
    basta: 'Lo más delicado: Hacienda, la salud, comprar o vender una casa, poderes.',
    propuesta: 'La firma reforzada: escaneo del DNI y de la cara, o en persona.',
  },
];

/** Other countries. */
export const PAISES: { id: string; pais: string; sistema: string; d: string; leccion: string; fuentes: string[] }[] = [
  {
    id: 'dinamarca', pais: 'Dinamarca', sistema: 'MitID',
    d: `${CIFRAS.mitidPct.toLocaleString('es-ES')} % de los mayores de 15 años lo tienen activo: ${(CIFRAS.mitidUsuarios / 1e6).toLocaleString('es-ES')} millones de personas y ${(CIFRAS.mitidMes / 1e6).toLocaleString('es-ES')} millones de usos al mes (media de 2025).`,
    leccion: `Una sola llave para el Estado y para el banco. Y una salida para quien no puede: ${CIFRAS.mitidExentos.toLocaleString('es-ES')} personas están exentas de recibir el correo oficial por internet.`,
    fuentes: ['mitid'],
  },
  {
    id: 'suecia', pais: 'Suecia', sistema: 'BankID',
    d: `Lo dan los bancos y lo usan más de ${(CIFRAS.bankidUsuarios / 1e6).toLocaleString('es-ES')} millones de personas, para pagar y para identificarse.`,
    leccion: 'Al depender de los bancos, quien no tiene cuenta se queda fuera. El banco central sueco pide una identidad pública como alternativa, y el Gobierno encargó en 2025 a la policía crearla.',
    fuentes: ['bankid'],
  },
  {
    id: 'estonia', pais: 'Estonia', sistema: 'Carné, Mobile-ID y Smart-ID',
    d: 'El carné es obligatorio desde los 15 años y lleva firma. Además se puede firmar con la tarjeta SIM (Mobile-ID, de las operadoras) o con Smart-ID.',
    leccion: 'Calculan que la firma digital ahorra a cada persona unos cinco días de trabajo al año. Pero hace falta instalar algo o tener una SIM especial.',
    fuentes: ['estonia', 'estonia-ria'],
  },
  {
    id: 'india', pais: 'India', sistema: 'Aadhaar eSign',
    d: 'Para firmar un documento llega un código al móvil registrado (o se usa la huella). El certificado se crea para esa firma y se destruye después.',
    leccion: 'Lo más parecido a la propuesta: nada que instalar ni guardar, y valor legal. Su debilidad es la de todo código por SMS.',
    fuentes: ['esign-india'],
  },
];

/** What each scale does for digital identity (a proposal, not today's law). */
export const ESCALAS_DIGITAL: Record<EscalaId, string> = {
  persona: 'Tiene una sola alta: su móvil, su correo y su identidad comprobada. Ve en un sitio todo lo que ha firmado, y puede cortar el acceso si pierde el móvil.',
  vecindad: 'Las juntas de la comunidad votan y firman las actas desde el móvil, con la misma firma. Un vecino puede acompañar a quien no se maneja, sin firmar por él.',
  municipio: 'Cualquier oficina municipal hace altas en persona y ayuda a firmar. Es la puerta para quien no tiene móvil.',
  provincia: 'Lleva una oficina que va de pueblo en pueblo para hacer altas donde no hay oficina fija.',
  region: 'Usa la misma firma que todos, sin sistemas propios ni programas distintos en cada comunidad.',
  nacion: 'Mantiene el sistema único, el registro de altas y el teléfono de atención gratuito, y fija por ley qué nivel hace falta para cada trámite.',
  continente: 'La Unión Europea asegura que la firma valga en los 27 países, con la cartera europea de identidad digital.',
  planeta: 'Normas abiertas y comunes (como las llaves de acceso, que ya funcionan en los navegadores) para que la firma se pueda reconocer entre países.',
};

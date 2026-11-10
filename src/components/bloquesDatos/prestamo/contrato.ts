// ============================================================================
// FORMALIZAR UN PRÉSTAMO — EL CONTRATO, UNA SOLA VEZ (2026-11-10, SolarCrowd)
// ============================================================================
// Eugenio: «un botón que sea realizar préstamo y que ahí aparezca un formulario
// donde se rellene los datos del prestamista, se le explique las condiciones,
// que las acepte y que haga una firma; que realice la transferencia y adjunte el
// justificante, y que le dé a formalizar préstamo… y que se envíe una copia de
// lo que se ha firmado y lo que se ha aceptado al correo de esta persona».
//
// THIS FILE IS THE CONTRACT. The screen shows it (the «Leer el contrato» fold),
// the server rebuilds it from the block's config stored in the page (never from
// what the browser sends), prints it to the PDF, hashes it and mails it. One
// function, so what the person read is, word for word, what was signed and sent.
// If you change a clause, you change it for the next signature only: every
// signed loan stores its own text and its SHA-256 (`prestamos_firmados`).
//
// No React, no browser, no Node: the editor, the page and the server import it.

/** What the publisher configures in the block (`bloque.datos`). */
export type ConfigPrestamo = {
  /** Only an open loan takes signatures. */
  abierto: boolean;
  /** The borrower. */
  entidad: string;
  entidadNif: string;
  entidadDomicilio: string;
  /** Who signs for the borrower and in which capacity («presidenta», «tesorero»…). */
  representante: string;
  /** Where the lender sends the money. */
  titularCuenta: string;
  iban: string;
  /** What the money is for, one sentence. */
  destino: string;
  /** Optional: the grant the loan bridges («una subvención europea…»). Empty: no grant clause. */
  subvencion: string;
  /** Annual interest options the lender picks from, in % (0 = solidarity loan). */
  intereses: number[];
  plazoMin: number;
  plazoMax: number;
  /** From which month the borrower may repay early without penalty. */
  anticipadaDesde: number;
  importeMin: number;
  importeMax: number;
  /** Who supervises: the site's legal holder. */
  supervisor: string;
  supervisorNif: string;
  supervisorDomicilio: string;
  /** Who gets a copy of every signed loan (the site's administration). */
  avisar: string;
  /** The borrower's address: shown on the page and copied on every signature. Required to open. */
  correoEntidad: string;
  /** Contact shown to the lender for questions. */
  contacto: string;
};

export const CONFIG_POR_DEFECTO: ConfigPrestamo = {
  abierto: false,
  entidad: '', entidadNif: '', entidadDomicilio: '', representante: '',
  titularCuenta: '', iban: '',
  destino: '', subvencion: '',
  intereses: [0, 2.5], plazoMin: 6, plazoMax: 24, anticipadaDesde: 6,
  importeMin: 100, importeMax: 50000,
  supervisor: 'Asociación Light for Humanity (SolarCrowd)', supervisorNif: 'G88040563',
  supervisorDomicilio: 'Calle Bahía de Almería 30, 28042 Madrid',
  avisar: '', correoEntidad: '', contacto: '',
};

const txt = (v: unknown, max = 300) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const num = (v: unknown, def: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : def;
};

/** The block's `datos` turned into a complete, sane config. Anything missing takes its default. */
export function limpiarConfig(d: any): ConfigPrestamo {
  const c = CONFIG_POR_DEFECTO;
  const intereses = (Array.isArray(d?.intereses) ? d.intereses : c.intereses)
    .map((x: unknown) => Math.round(Number(x) * 100) / 100)
    .filter((x: number) => Number.isFinite(x) && x >= 0 && x <= 20);
  const plazoMin = Math.round(num(d?.plazoMin, c.plazoMin, 1, 120));
  const importeMin = Math.round(num(d?.importeMin, c.importeMin, 1, 1_000_000));
  return {
    abierto: d?.abierto === true,
    entidad: txt(d?.entidad, 200), entidadNif: txt(d?.entidadNif, 20), entidadDomicilio: txt(d?.entidadDomicilio, 200),
    representante: txt(d?.representante, 200),
    titularCuenta: txt(d?.titularCuenta, 200), iban: normalizarIban(d?.iban),
    destino: txt(d?.destino, 600), subvencion: txt(d?.subvencion, 400),
    intereses: [...new Set<number>(intereses.length ? intereses : c.intereses)].sort((a, b) => a - b),
    plazoMin, plazoMax: Math.max(plazoMin, Math.round(num(d?.plazoMax, c.plazoMax, 1, 120))),
    anticipadaDesde: Math.round(num(d?.anticipadaDesde, c.anticipadaDesde, 0, 120)),
    importeMin, importeMax: Math.max(importeMin, Math.round(num(d?.importeMax, c.importeMax, 1, 10_000_000))),
    supervisor: txt(d?.supervisor, 200) || c.supervisor, supervisorNif: txt(d?.supervisorNif, 20) || c.supervisorNif,
    supervisorDomicilio: txt(d?.supervisorDomicilio, 200) || c.supervisorDomicilio,
    avisar: correoOVacio(d?.avisar), correoEntidad: correoOVacio(d?.correoEntidad), contacto: txt(d?.contacto, 200),
  };
}

/** Why this config cannot take signatures yet, or `null` if it can. Shown to the publisher, not to visitors. */
export function faltaParaAbrir(c: ConfigPrestamo): string | null {
  if (!c.entidad) return 'Falta el nombre de la entidad que recibe el préstamo.';
  if (!c.titularCuenta || !ibanValido(c.iban)) return 'Falta el IBAN (válido) y el titular de la cuenta donde se transfiere.';
  if (!c.destino) return 'Falta para qué es el dinero.';
  if (!c.avisar) return 'Falta el correo de administración que recibe una copia de cada préstamo.';
  // Public on the page and copied on every signature (Eugenio, 2026-11-10): the lender
  // deals with the entity directly, so the entity's address is part of the offer.
  if (!c.correoEntidad) return 'Falta el correo de la entidad: se publica en la página y recibe una copia de cada préstamo.';
  return null;
}

/**
 * The supervisor's short name, used as the contract's defined term and on screen:
 * what is in brackets at the end of `supervisor` («Asociación Light for Humanity
 * (SolarCrowd)» → «SolarCrowd»), or the whole name. Never a literal: the block is
 * the platform's, and the next portal that uses it is not SolarCrowd.
 */
export const marca = (c: Pick<ConfigPrestamo, 'supervisor'>) => /\(([^()]+)\)\s*$/.exec(c.supervisor)?.[1].trim() || c.supervisor;

// ── Small validators, the same on both sides ────────────────────────────────

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const correoValido = (e: string) => e.length <= 254 && EMAIL.test(e);
const correoOVacio = (v: unknown) => { const e = txt(v, 254).toLowerCase(); return correoValido(e) ? e : ''; };

export const normalizarIban = (v: unknown) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 34);
/** ISO 13616 check (mod 97). */
export function ibanValido(iban: string): boolean {
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  if (iban.startsWith('ES') && iban.length !== 24) return false;
  const reordenado = iban.slice(4) + iban.slice(0, 4);
  let resto = 0;
  for (const ch of reordenado) {
    const v = ch >= 'A' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) resto = (resto * 10 + Number(d)) % 97;
  }
  return resto === 1;
}
/** «ES12 3456 …», for reading. */
export const ibanBonito = (iban: string) => iban.replace(/(.{4})/g, '$1 ').trim();

export const euros = (n: number) => `${n.toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
export const porcentaje = (n: number) => `${String(n).replace('.', ',')} %`;

// ── The lender ──────────────────────────────────────────────────────────────

export type Prestamista = {
  nombre: string; documento: string; domicilio: string; email: string; telefono: string;
  importe: number; interes: number; plazo: number; ibanDevolucion: string;
};

export type Errores = Partial<Record<keyof Prestamista | 'acepta' | 'firma' | 'justificante', string>>;

/** Checks what the lender typed against what the loan allows. Same rules in the browser and on the server. */
export function validarPrestamista(e: any, c: ConfigPrestamo): { datos: Prestamista } | { errores: Errores } {
  const errores: Errores = {};
  const nombre = txt(e?.nombre, 120);
  if (nombre.length < 5 || !/\s/.test(nombre)) errores.nombre = 'Escribe tu nombre y tus apellidos.';
  const documento = String(e?.documento ?? '').toUpperCase().replace(/[\s.-]/g, '').slice(0, 20);
  if (!/^[A-Z0-9]{5,20}$/.test(documento)) errores.documento = 'Escribe tu DNI, NIE o pasaporte.';
  else if (/^[0-9XYZ][0-9]{7}[A-Z]$/.test(documento) && !letraDniValida(documento)) errores.documento = 'La letra del DNI o NIE no cuadra. Revísalo.';
  const domicilio = txt(e?.domicilio, 200);
  if (domicilio.length < 8) errores.domicilio = 'Escribe tu dirección completa: calle, número, código postal y localidad.';
  const email = txt(e?.email, 254).toLowerCase();
  if (!correoValido(email)) errores.email = 'Escribe un correo válido: ahí te llegará la copia del contrato.';
  const telefono = String(e?.telefono ?? '').replace(/[^\d+]/g, '').slice(0, 16);
  if (telefono.replace(/\D/g, '').length < 9) errores.telefono = 'Escribe un teléfono de contacto.';
  const importe = Math.round(Number(String(e?.importe ?? '').replace(/\./g, '').replace(',', '.')) * 100) / 100;
  if (!Number.isFinite(importe) || importe < c.importeMin || importe > c.importeMax) errores.importe = `El importe va de ${euros(c.importeMin)} a ${euros(c.importeMax)}.`;
  const interes = Number(e?.interes);
  if (!c.intereses.includes(interes)) errores.interes = 'Elige el tipo de interés.';
  const plazo = Math.round(Number(e?.plazo));
  if (!Number.isFinite(plazo) || plazo < c.plazoMin || plazo > c.plazoMax) errores.plazo = `La duración va de ${c.plazoMin} a ${c.plazoMax} meses.`;
  const ibanDevolucion = normalizarIban(e?.ibanDevolucion);
  if (!ibanValido(ibanDevolucion)) errores.ibanDevolucion = 'Ese IBAN no es válido. Cópialo tal cual de tu banco.';
  if (Object.keys(errores).length) return { errores };
  return { datos: { nombre, documento, domicilio, email, telefono, importe, interes, plazo, ibanDevolucion } };
}

function letraDniValida(doc: string): boolean {
  const n = doc.replace(/^X/, '0').replace(/^Y/, '1').replace(/^Z/, '2');
  return 'TRWAGMYFPDXBNJZSQVHLCKE'[Number(n.slice(0, 8)) % 23] === n[8];
}

/** Gross interest at maturity (simple, 365-day basis, months ≈ 365/12 days). */
export const interesesBrutos = (p: Pick<Prestamista, 'importe' | 'interes' | 'plazo'>) =>
  Math.round(p.importe * (p.interes / 100) * (p.plazo / 12) * 100) / 100;

// ── What the lender accepts: three boxes, their exact words are stored ──────

export const aceptaciones = (c: Pick<ConfigPrestamo, 'supervisor'>) => [
  { id: 'contrato', texto: 'He leído el contrato de préstamo y acepto sus condiciones.' },
  { id: 'riesgo', texto: `Entiendo que prestar tiene riesgo: puedo perder una parte o la totalidad del dinero, ningún fondo de garantía lo cubre y ${marca(c)} no garantiza su devolución.` },
  { id: 'datos', texto: 'Acepto que mis datos se usen para formalizar, supervisar y gestionar este préstamo, como explica la información de protección de datos.' },
];
/** The ids the server requires, all three. */
export const IDS_ACEPTACION = ['contrato', 'riesgo', 'datos'] as const;

export const RIESGOS = [
  'Puedes perder una parte o la totalidad del dinero prestado, y también los intereses, si la entidad no puede devolverlo.',
  'Ningún fondo de garantía de depósitos o de inversiones cubre este préstamo. El supervisor no es una entidad de crédito ni una plataforma de financiación participativa autorizada por la CNMV, y no presta asesoramiento financiero.',
  'No puedes recuperar el dinero antes del vencimiento, salvo que la entidad incumpla el contrato.',
  'Si la devolución depende de una subvención, su pago puede retrasarse, reducirse o no llegar.',
  'No prestes dinero que necesites a corto plazo ni que no estés dispuesto a perder. Reparte lo que prestes entre varios préstamos.',
];

export function textoDatos(c: ConfigPrestamo): string {
  return `Tratan tus datos ${c.supervisor} (NIF ${c.supervisorNif}), como supervisor, y ${c.entidad || 'la entidad prestataria'}, como parte del contrato, solo para formalizar, supervisar y gestionar este préstamo y cumplir las obligaciones legales (art. 6.1.b y 6.1.c del RGPD). Se guardan tu firma y el justificante de la transferencia en una zona privada del servidor, en la Unión Europea, durante la vida del préstamo y los plazos que exige la ley. No se ceden a nadie más, salvo obligación legal. Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a ${c.avisar || c.contacto || 'la dirección de contacto de la web'}, y reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).`;
}

// ── The contract itself ─────────────────────────────────────────────────────

export type Seccion = { titulo: string; parrafos: string[] };

const ORD = ['Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta', 'Sexta', 'Séptima', 'Octava', 'Novena', 'Décima', 'Undécima', 'Duodécima'];

/**
 * The full contract for this lender, in plain text sections. `p` may be partial while the lender
 * is still typing: what is missing reads «[…]», so the fold shows the contract taking shape.
 */
export function contrato(c: ConfigPrestamo, p: Partial<Prestamista>, cuando?: Date): Seccion[] {
  const o = (v: unknown, hueco: string) => (v === undefined || v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v)) ? `[${hueco}]` : String(v));
  const fecha = cuando ? cuando.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' }) : '[fecha de la firma]';
  const entidad = c.entidad || '[entidad]';
  const importe = typeof p.importe === 'number' && Number.isFinite(p.importe) ? euros(p.importe) : '[importe]';
  const interes = typeof p.interes === 'number' && Number.isFinite(p.interes) ? p.interes : null;
  const plazo = typeof p.plazo === 'number' && Number.isFinite(p.plazo) ? p.plazo : null;
  const m = marca(c);
  const s: Seccion[] = [];
  s.push({ titulo: 'Reunidos', parrafos: [
    `En ${fecha}.`,
    `De una parte, ${o(p.nombre, 'nombre y apellidos')}, mayor de edad, con documento ${o(p.documento, 'DNI/NIE')}, domicilio en ${o(p.domicilio, 'domicilio')}, correo ${o(p.email, 'correo')} y teléfono ${o(p.telefono, 'teléfono')}, que actúa en su propio nombre («la Persona Prestamista»).`,
    `De otra parte, ${entidad}${c.entidadNif ? `, con NIF ${c.entidadNif}` : ''}${c.entidadDomicilio ? ` y domicilio en ${c.entidadDomicilio}` : ''}${c.representante ? `, representada por ${c.representante}` : ''} («la Entidad Prestataria»).`,
    `Y, como entidad supervisora, sin asumir ninguna obligación de pago ni de garantía, ${c.supervisor}, con NIF ${c.supervisorNif} y domicilio en ${c.supervisorDomicilio} («${m}»).`,
  ] });
  s.push({ titulo: 'Exponen', parrafos: [
    `I. Que la Entidad Prestataria necesita financiación para lo siguiente: ${c.destino || '[destino del préstamo]'}`,
    ...(c.subvencion ? [`II. Que la Entidad Prestataria espera recibir ${c.subvencion}, y este préstamo adelanta ese dinero para que el proyecto no se detenga mientras llega.`] : []),
    `${c.subvencion ? 'III' : 'II'}. Que la Entidad Prestataria ha superado el filtro de confianza de ${m}, que ha publicado su necesidad en su portal con las condiciones de este contrato, y que la Entidad Prestataria las acepta y queda obligada por ellas desde que recibe el dinero.`,
    `${c.subvencion ? 'IV' : 'III'}. Que la Persona Prestamista ha leído los riesgos, sabe que puede perder una parte o la totalidad del dinero prestado y desea prestar a la Entidad Prestataria la cantidad indicada.`,
  ] });
  const cl: Array<[string, string[]]> = [
    ['Objeto e importe', [`La Persona Prestamista presta a la Entidad Prestataria ${importe}, que esta recibe en concepto de préstamo (artículos 1740 y 1753 y siguientes del Código Civil). El préstamo se perfecciona con la entrega del dinero.`]],
    ['Entrega del dinero, directamente a la entidad', [
      `La Persona Prestamista transfiere el importe, desde una cuenta de la que es titular, a la cuenta de ${c.titularCuenta || entidad} con IBAN ${c.iban ? ibanBonito(c.iban) : '[IBAN de la entidad]'}, con el concepto «${conceptoTransferencia(c, p.nombre || '')}». El justificante de la transferencia, que adjunta al firmar, sirve de recibo. El préstamo cuenta desde la fecha en que el dinero llega a esa cuenta.`,
      `${m} no recibe, no custodia y no mueve el dinero en ningún momento.`,
    ]],
    ['Destino', [`La Entidad Prestataria destina el dinero exclusivamente a: ${c.destino || '[destino]'}`]],
    ['Tipo de interés', [interes === null ? '[tipo de interés elegido]'
      : interes === 0 ? 'Préstamo solidario, al 0 %: sin intereses. La Entidad Prestataria devuelve exactamente el importe recibido.'
      : `Interés nominal anual del ${porcentaje(interes)}, simple (los intereses no generan intereses), calculado sobre el capital pendiente por los días que el dinero esté prestado, en base de 365 días.`]],
    ['Duración y devolución', [
      `El préstamo dura ${plazo === null ? '[número de]' : plazo} meses desde la entrega. La Entidad Prestataria devuelve el capital${interes ? ' y los intereses' : ''} en un único pago, como tarde al vencimiento, mediante transferencia a la cuenta de la Persona Prestamista con IBAN ${p.ibanDevolucion ? ibanBonito(p.ibanDevolucion) : '[IBAN de devolución]'}, de la que esta es titular, y envía a ${m} el justificante.`,
      `${c.anticipadaDesde > 0 ? `A partir del mes ${c.anticipadaDesde}, la` : 'La'} Entidad Prestataria puede devolver antes, total o parcialmente y sin penalización${c.subvencion ? ', por ejemplo al cobrar la subvención' : ''}; los intereses se calculan hasta ese día. La Persona Prestamista no puede exigir la devolución antes del vencimiento, salvo incumplimiento o uso del dinero para otro fin.`,
    ]],
    ['Impuestos', [
      'Los intereses, si los hay, son rendimientos del capital mobiliario de la Persona Prestamista en su IRPF. La Entidad Prestataria practica e ingresa, en su caso, la retención a cuenta que corresponda y le entrega el certificado.',
      'El préstamo está sujeto pero exento del Impuesto sobre Transmisiones Patrimoniales (artículo 45.I.B.15 del Real Decreto Legislativo 1/1993). Si la normativa autonómica exige presentar la autoliquidación, la presenta la Entidad Prestataria.',
    ]],
    [`Qué hace ${m}`, [
      `${m} no es parte del préstamo, no recibe el dinero y no garantiza su devolución. Su papel, que la Entidad Prestataria acepta, es: haber revisado a la entidad antes de publicarla (filtro de confianza); comprobar el contrato y conservar una copia firmada y los justificantes; recibir de la Entidad Prestataria el aviso de cada pago` + (c.subvencion ? ' y del cobro de la subvención' : '') + '; y, si hay un retraso o cualquier problema, mediar entre las partes y apoyar a la Persona Prestamista para hacer todo lo posible por que recupere el dinero, empezando por buscar un acuerdo de pago.',
      `${m} no cobra comisión a la Persona Prestamista y no responde con su patrimonio de las obligaciones de la Entidad Prestataria.`,
    ]],
    ['Obligación de informar', [`La Entidad Prestataria comunica a la Persona Prestamista y a ${m}, en 15 días como máximo, cualquier hecho que pueda afectar a la devolución${c.subvencion ? ', en particular cualquier retraso, reducción o denegación de la subvención' : ''}.`]],
    ['Retrasos e incumplimiento', [`Si la Entidad Prestataria no paga al vencimiento, ${m} abre una mediación de hasta 60 días para acordar un calendario. Si no hay acuerdo o se incumple, la Persona Prestamista puede reclamar por las vías legales la cantidad debida y el interés legal del dinero desde el vencimiento (artículo 1108 del Código Civil).`]],
    ['Cesión', [`La Persona Prestamista puede ceder su derecho de cobro comunicándolo por escrito a la Entidad Prestataria y a ${m}. La Entidad Prestataria no puede ceder su obligación de devolver sin el consentimiento escrito de la Persona Prestamista.`]],
    ['Protección de datos', [textoDatos(c)]],
    ['Ley aplicable y firma', [
      `Este contrato se rige por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales que correspondan conforme a la ley, sin perjuicio de intentar antes la mediación de ${m}.`,
      `La Persona Prestamista lo firma electrónicamente en el portal ${m}: su firma manuscrita digitalizada, la fecha y la hora y la huella del texto firmado constan en la copia que recibe por correo. La Entidad Prestataria y ${m} reciben la misma copia.`,
    ]],
  ];
  cl.forEach(([t, ps], i) => s.push({ titulo: `${ORD[i]}. ${t}`, parrafos: ps }));
  return s;
}

/** What the lender writes as the transfer's concept. Shown on screen and written in the contract. */
export const conceptoTransferencia = (c: Pick<ConfigPrestamo, 'supervisor'>, nombre: string) => `Préstamo ${marca(c)} – ${nombre.trim() || '[nombre y apellidos]'}`;

/** The contract as one plain text, for hashing and for the e-mail body. */
export const contratoEnTexto = (secciones: Seccion[]) =>
  secciones.map(x => `${x.titulo.toUpperCase()}\n\n${x.parrafos.join('\n\n')}`).join('\n\n');

/** Limits for what travels with the signature. */
export const LIMITES_ADJUNTOS = { firmaBytes: 400_000, justificanteBytes: 8 * 1024 * 1024 } as const;
export const TIPOS_JUSTIFICANTE: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
/** A person needs at least this long to read and sign; a script does not. */
export const TIEMPO_MINIMO_MS = 15_000;
export const CAMPO_TRAMPA = 'web_empresa';

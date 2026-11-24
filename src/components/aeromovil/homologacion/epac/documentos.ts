// The legal documents of the pedal cycle (2026-11-24, Eugenio: «hay que generar todos los documentos legales de ficha
// técnica, advertencias, manual de instrucciones, certificado de conformidad del fabricante… tiene que haber un
// generador y un editor de esos documentos para que entre la IA y el ingeniero podamos ir resolviéndolos»).
//
// HOW IT WORKS: every document is a list of sections, and every section has a GENERATOR: a function that writes the
// draft from the 3D design (the numbers), the maker's details and the state of the matrix and the tests. The engineer
// reads each section, edits it if it needs it and marks it «revisada»; his text then replaces the draft (the page offers
// to go back to it). A `[por completar: …]` mark is something only a person can know: a document with one left is never
// «listo». The draft is a proposal to be checked, not legal advice: the page says so at the top of every document.
//
// Text format (small on purpose, so a person can edit it in a plain box): blank line = new paragraph; «- » = bullet;
// «| a | b |» rows = table (the first row is the header); **bold**.
import type { FichaHomologacion } from '../ficha';
import { OBLIGACIONES, TIPOS } from './catalogo';
import { ENSAYOS } from './ensayos';
import { pc, type EstadoDoc, type EstadoEnsayo, type EstadoHueco, type Fabricante } from './tipos';

export interface ContextoDoc {
  f: FichaHomologacion; fab: Fabricante; hoy: string;
  hueco: (oid: string, hid: string) => EstadoHueco;
  ensayo: (id: string) => { estado: EstadoEnsayo; fecha?: string; conclusion?: string; valores: Record<string, string>; intentos: number };
  doc: (id: string) => EstadoDoc;
}
export interface SeccionDoc { id: string; titulo: string; ayuda?: string; generar: (c: ContextoDoc) => string }
export interface Documento {
  id: string; codigo: string; titulo: string;
  /** 3: sin esto no se puede vender · 2: importante · 1: complementario. */
  peso: 1 | 2 | 3;
  /** The item of the «Carpeta legal del fabricante» (the eight documents) it belongs to, 1 to 8; none: a document of the product. */
  carpeta?: number;
  para: string;
  norma: string;
  secciones: SeccionDoc[];
}

const v = (x: string | undefined, que: string) => (x?.trim() ? x.trim() : pc(que));
const n = (x: number | null | undefined, d = 0) => x == null ? null : x.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const dato = (x: number | null | undefined, u: string, d = 0) => n(x, d) == null ? pc(`${u}: el modelo 3D no lo sabe`) : `${n(x, d)} ${u}`;
const celda = (s: string) => s.replace(/\|/g, '/').replace(/\n/g, ' ');
const tabla = (cab: string[], filas: string[][]) => [cab, ...filas].map(f => `| ${f.map(celda).join(' | ')} |`).join('\n');
const lista = (xs: string[]) => xs.map(x => `- ${x}`).join('\n');
const P = (...ps: string[]) => ps.join('\n\n');
const NOMBRE_ESTADO: Record<string, string> = { pendiente: 'Pendiente', enCurso: 'En curso', hecho: 'Hecho', noAplica: 'No aplica', noConforme: 'No conforme' };

const identificacion = (c: ContextoDoc) => P(
  lista([`Fabricante: ${v(c.fab.razon, 'razón social')}`, `Dirección completa: ${v(c.fab.direccion, 'dirección')}`, `Marca: ${v(c.fab.marca, 'marca')}`, `Modelo: ${v(c.fab.modelo, 'modelo')}`, `Persona responsable: ${v(c.fab.responsable, 'nombre')}, ${v(c.fab.cargo, 'cargo')}`]),
);
const datosVehiculo = (c: ContextoDoc) => tabla(['Dato', 'Valor'], [
  ['Número de ruedas', `${c.f.ruedasFisicas}`], ['Número de plazas (conductor incluido)', c.f.plazas == null ? pc('plazas') : `${c.f.plazas}`],
  ['Masa en vacío con batería', dato(c.f.masaVacio, 'kg')], ['Masa máxima (todas las plazas y el equipaje)', dato(c.f.masaMaxima, 'kg')],
  ['Carga máxima útil', c.f.masaMaxima != null && c.f.masaVacio != null ? `${n(c.f.masaMaxima - c.f.masaVacio)} kg` : pc('carga máxima')],
  ['Potencia nominal continua del motor', c.f.potenciaCategoria == null ? pc('potencia') : `${n(c.f.potenciaCategoria * 1000)} W (cifra del diseño: se confirma con el ensayo EN-01)`],
  ['La asistencia se corta a', '25 km/h (se confirma con el ensayo EN-02)'], ['Velocidad máxima con motor (diseño)', dato(c.f.vmax, 'km/h', 1)],
  ['Largo × ancho', c.f.largo != null && c.f.ancho != null ? `${n(c.f.largo * 1000)} × ${n(c.f.ancho * 1000)} mm` : pc('dimensiones')],
  ['Radio de giro declarado', dato(c.f.radioGiro, 'm', 1)], ['Tensión nominal de la batería', pc('tensión (48 V como máximo)')],
]);
const listaNormas = [
  'Real Decreto 339/2014 (anexos I a VI).', 'Reglamento General de Vehículos (art. 22: advertencia acústica).', 'Orden PJC/780/2025 (definición de ciclo de pedales con pedaleo asistido: 250 W y 25 km/h).',
  'UNE-EN 15194:2017+A1:2023, ciclos con pedaleo asistido (apartado 4.2, que cita el anexo VI.8).', 'UNE-EN ISO 12100, evaluación de riesgos.', 'Directiva 2006/42/CE o Reglamento (UE) 2023/1230, según la fecha de comercialización.',
  'Reglamento (UE) 2023/1542 (baterías).',
];

export const DOCUMENTOS: Documento[] = [
  {
    id: 'd01', codigo: 'D01', titulo: 'Declaración de clasificación como ciclo de pedales con pedaleo asistido', peso: 3, carpeta: 1,
    para: 'Es lo primero que mira una inspección: demuestra que el vehículo es un ciclo y no un vehículo a motor. Se firma con el diseño ya congelado.',
    norma: 'RD 339/2014, art. 2; Orden PJC/780/2025; Reglamento 168/2013, art. 2.2.h',
    secciones: [
      { id: 'ident', titulo: 'Quién declara y de qué vehículo', generar: identificacion },
      { id: 'definicion', titulo: 'Qué dice la ley', generar: () => P('Un **ciclo** es un vehículo de al menos dos ruedas propulsado exclusiva o principalmente por la energía muscular de las personas que lo utilizan (Real Decreto 339/2014, art. 2).', 'Es **de pedales con pedaleo asistido** si lleva pedales y un motor eléctrico auxiliar de potencia nominal continua de 250 W como máximo, cuya asistencia se interrumpe al dejar de pedalear y antes de superar los 25 km/h (Orden PJC/780/2025). El Reglamento (UE) 168/2013 excluye estos ciclos de la homologación de vehículos de categoría L (art. 2.2.h).') },
      { id: 'criterios', titulo: 'Cómo cumple cada criterio', ayuda: 'Cada fila apunta al ensayo que lo demuestra.', generar: c => tabla(['Criterio', 'El vehículo', 'Evidencia'], [
        ['Al menos dos ruedas', `${c.f.ruedasFisicas} ruedas`, 'Plano de conjunto'],
        ['Propulsión principalmente muscular, con pedales que mueven el vehículo', 'Transmisión de los pedales a las ruedas', 'Diagrama de transmisión y ensayo EN-03'],
        ['Potencia nominal continua de 250 W o menos', c.f.potenciaCategoria == null ? pc('potencia') : `${n(c.f.potenciaCategoria * 1000)} W (diseño)`, 'Ficha del motor y ensayo EN-01'],
        ['La asistencia se corta a 25 km/h', '25 km/h programados en el controlador', 'Ensayo EN-02'],
        ['La asistencia se corta al dejar de pedalear', 'Sensor de pedaleo', 'Ensayo EN-03'],
      ]) },
      { id: 'exclusiones', titulo: 'Lo que no tiene, y por qué lo mantiene como ciclo', ayuda: 'Revisa cada punto en el vehículo terminado: es lo que más cuidado exige con cuatro ruedas.', generar: () => lista(['No hay acelerador, puño ni botón que mueva el motor sin pedalear.', 'El volante, si lo hay, no cambia la propulsión: el motor sigue ayudando, no sustituyendo, a los pedales.', 'Los pedales mueven el vehículo (no son decorativos).', 'Los pasajeros, si los hay, no cambian la clasificación ni la masa declarada.', pc('confirmar cada punto en el vehículo congelado y anotar la fecha')]) },
      { id: 'decision', titulo: 'Decisión', generar: c => P(`Con el diseño y los ensayos que constan en el expediente, ${v(c.fab.razon, 'razón social')} clasifica el vehículo **${v(c.fab.marca, 'marca')} ${v(c.fab.modelo, 'modelo')}** como ciclo de pedales con pedaleo asistido, sujeto al Real Decreto 339/2014 y no al Reglamento (UE) 168/2013.`, `En ${v(c.fab.lugar, 'lugar')}, a ${c.hoy}.`, `Firma: ${v(c.fab.responsable, 'nombre')}, ${v(c.fab.cargo, 'cargo')}.`) },
    ],
  },
  {
    id: 'd02', codigo: 'D02', titulo: 'Matriz de requisitos legales y normativa aplicable', peso: 3, carpeta: 2,
    para: 'Es el documento clave: cada obligación legal con la evidencia que la demuestra. Se genera sola a partir de la pestaña «Matriz de conformidad».',
    norma: 'RD 339/2014, anexo III; texto aportado (sección 6)',
    secciones: [
      { id: 'leer', titulo: 'Cómo se lee', generar: () => P('Cada fila es una obligación legal. Cada obligación se demuestra con uno o más elementos de evidencia: un plano, un cálculo, un ensayo, una inspección o un documento. El estado de cada fila sale de la matriz de conformidad del expediente.', '**Peso**: 3 = sin esto no se puede vender; 2 = importante; 1 = complementario.') },
      { id: 'matriz', titulo: 'Matriz de conformidad', generar: c => tabla(['Obligación', 'Peso', 'Dónde lo dice', 'Evidencia', 'Estado'], OBLIGACIONES.map(o => [`${o.id} ${o.titulo}`, String(o.peso), o.ref, o.huecos.map(h => `${TIPOS[h.tipo].nombre}: ${h.que}`).join('; '), o.huecos.map(h => NOMBRE_ESTADO[c.hueco(o.id, h.id)]).join(' / ')])) },
      { id: 'normas', titulo: 'Normas aplicadas', ayuda: 'La declaración y el expediente deben citar las normas usadas (anexos I y III).', generar: () => lista(listaNormas) },
      { id: 'pendiente', titulo: 'Lo que falta', generar: c => {
        const falta = OBLIGACIONES.flatMap(o => o.huecos.filter(h => { const e = c.hueco(o.id, h.id); return e === 'pendiente' || e === 'enCurso'; }).map(h => `${o.id} ${o.titulo}: ${h.que} (${NOMBRE_ESTADO[c.hueco(o.id, h.id)].toLowerCase()})`));
        return falta.length ? lista(falta) : 'No queda ninguna evidencia pendiente.';
      } },
    ],
  },
  {
    id: 'd03', codigo: 'D03', titulo: 'Expediente técnico de diseño y fabricación (RD 339/2014)', peso: 3, carpeta: 3,
    para: 'El expediente que hay que tener antes de comercializar y conservar diez años. Es el índice que reúne todo lo demás.',
    norma: 'RD 339/2014, art. 4 y anexo III',
    secciones: [
      { id: 's01', titulo: '01 · Identificación del fabricante', generar: identificacion },
      { id: 's02', titulo: '02 · Descripción del vehículo', generar: c => P(`**${v(c.fab.marca, 'marca')} ${v(c.fab.modelo, 'modelo')}**: ${c.f.vehiculo}.`, datosVehiculo(c), lista(['Plano de conjunto: ' + pc('número y versión'), 'Planos constructivos: ' + pc('lista'), 'Especificación de materiales: ' + pc('lista'), 'Cálculos mecánicos y estructurales: ' + pc('referencias')])) },
      { id: 's03', titulo: '03 · Análisis de riesgos', generar: c => `Ver el documento D04 (estado: ${NOMBRE_ESTADO[c.doc('d04')].toLowerCase()}).` },
      { id: 's04', titulo: '04 · Componentes', ayuda: 'Marca, modelo y ficha del proveedor de cada uno.', generar: () => tabla(['Componente', 'Marca y modelo', 'Documentación'], ['Motor', 'Controlador', 'Sensor de pedaleo', 'Batería y BMS', 'Cargador', 'Frenos', 'Dirección', 'Ruedas y neumáticos', 'Cableado y protecciones', 'Iluminación y catadióptricos', 'Timbre'].map(x => [x, pc('marca y modelo'), pc('ficha o declaración')])) },
      { id: 's05', titulo: '05 · Ensayos y verificaciones', generar: c => tabla(['Ensayo', 'Estado', 'Fecha', 'Conclusión'], ENSAYOS.map(e => { const s = c.ensayo(e.id); return [`${e.codigo} ${e.titulo}`, NOMBRE_ESTADO[s.estado], s.fecha ?? '—', s.conclusion ?? '—']; })) },
      { id: 's06', titulo: '06 · Normativa aplicada', generar: () => P(lista(listaNormas), 'La justificación de lo que cubre cada norma está en el documento D02 (matriz).') },
      { id: 's07', titulo: '07 · Documentación del usuario', generar: c => lista([`Manual de instrucciones y mantenimiento (D08): ${NOMBRE_ESTADO[c.doc('d08')].toLowerCase()}`, `Ficha técnica (D10): ${NOMBRE_ESTADO[c.doc('d10')].toLowerCase()}`, `Advertencias y marcado (D11): ${NOMBRE_ESTADO[c.doc('d11')].toLowerCase()}`]) },
      { id: 's08', titulo: '08 · Producción en serie', generar: c => `Ver el plan de control de producción y trazabilidad (D09, estado: ${NOMBRE_ESTADO[c.doc('d09')].toLowerCase()}).` },
    ],
  },
  {
    id: 'd04', codigo: 'D04', titulo: 'Evaluación de riesgos y seguridad de máquinas', peso: 3, carpeta: 4,
    para: 'Lista de peligros, cómo se evita cada uno y qué riesgo queda. Es un borrador de peligros típicos de un ciclo eléctrico de varias ruedas: tú lo completas y lo ajustas al vehículo real.',
    norma: 'EN ISO 12100 (método); Directiva 2006/42/CE, anexo I; RD 339/2014, anexo III',
    secciones: [
      { id: 'alcance', titulo: 'Alcance y uso previsto', generar: c => P(`Vehículo: ${v(c.fab.marca, 'marca')} ${v(c.fab.modelo, 'modelo')}, ciclo de pedales con pedaleo asistido de ${c.f.ruedasFisicas} ruedas y ${c.f.plazas ?? pc('plazas')} plazas.`, `Uso previsto: ${pc('describir: calzada, carril bici, carga transportada')}.`) },
      { id: 'mal-uso', titulo: 'Mal uso razonablemente previsible', generar: () => lista(['Sobrecargar el vehículo por encima de la carga máxima.', 'Circular a más velocidad de la recomendada, cuesta abajo.', 'Modificar el controlador para saltar los límites.', 'Cargar la batería con un cargador que no es el suyo.', 'Circular sin luces de noche o con los frenos mal ajustados.']) },
      { id: 'peligros', titulo: 'Peligros, medidas y riesgo residual', ayuda: 'Revisa cada fila y añade las que falten.', generar: () => tabla(['Peligro', 'Situación', 'Medida', 'Riesgo residual', 'Evidencia'], [
        ['Atrapamiento en la transmisión', 'Ropa o dedos en cadena o correa', 'Protección de la transmisión', 'Bajo', 'EN-14'],
        ['Cortes por aristas', 'Manipulación y montaje', 'Aristas redondeadas', 'Bajo', 'EN-14'],
        ['Vuelco', 'Giro rápido o carga desplazada', 'Reparto de masas y vía ancha', pc('valorar'), 'EN-05'],
        ['Fallo de frenos', 'Frenada de emergencia', 'Frenos independientes delante y detrás', pc('valorar'), 'EN-04'],
        ['Pérdida de dirección', 'Rotura de pieza crítica', 'Dimensionado con factor de seguridad', pc('valorar'), 'EN-08'],
        ['Descarga eléctrica', 'Contacto con partes de potencia', 'Aislamiento y tensión de hasta 48 V', 'Bajo', 'EN-09'],
        ['Incendio o sobrecalentamiento', 'Fallo de la batería o del cableado', 'BMS, fusibles y ventilación', pc('valorar'), 'EN-09, EN-10, EN-11'],
        ['Aceleración inesperada', 'Fallo del controlador o del sensor', 'Corte al dejar de pedalear', pc('valorar'), 'EN-03'],
        ['No ser visto', 'Circular de noche', 'Luces y catadióptricos', 'Bajo', 'EN-13'],
      ]) },
      { id: 'residuales', titulo: 'Riesgos residuales que van al manual', generar: () => pc('lista final de riesgos residuales tras los ensayos') },
      { id: 'conclusion', titulo: 'Conclusión', generar: c => `Evaluación realizada el ${c.hoy} por ${v(c.fab.responsable, 'nombre')}. Se repetirá cada vez que cambie el diseño o un componente crítico.` },
    ],
  },
  {
    id: 'd05', codigo: 'D05', titulo: 'Plan de ensayos e informes de resultados', peso: 3, carpeta: 5,
    para: 'La lista de ensayos del modelo con su estado y su resultado. Se genera desde la pestaña «Ensayos»: cada informe firmado alimenta esta tabla.',
    norma: 'RD 339/2014, anexo III, apartados a) y b)',
    secciones: [
      { id: 'objeto', titulo: 'Objeto', generar: () => 'Estos ensayos los realiza el propio fabricante, que el anexo III del Real Decreto 339/2014 permite expresamente. Cada ensayo tiene un informe con su procedimiento, sus condiciones, sus resultados, su conclusión y su firma.' },
      { id: 'plan', titulo: 'Plan', generar: c => tabla(['Ensayo', 'Obligaciones que demuestra', 'Estado', 'Intentos'], ENSAYOS.map(e => [`${e.codigo} ${e.titulo}`, OBLIGACIONES.filter(o => o.huecos.some(h => h.ensayo === e.id)).map(o => o.id).join(', '), NOMBRE_ESTADO[c.ensayo(e.id).estado], String(c.ensayo(e.id).intentos)])) },
      { id: 'resultados', titulo: 'Resultados', generar: c => {
        const hechos = ENSAYOS.filter(e => c.ensayo(e.id).intentos > 0);
        return hechos.length ? lista(hechos.map(e => { const s = c.ensayo(e.id); return `${e.codigo}: ${s.conclusion ?? 'sin conclusión todavía'}${s.fecha ? ` (${s.fecha})` : ''}`; })) : 'Todavía no hay ningún ensayo realizado.';
      } },
      { id: 'noconformes', titulo: 'No conformidades y repeticiones', generar: c => { const m = ENSAYOS.filter(e => c.ensayo(e.id).estado === 'noConforme'); return m.length ? lista(m.map(e => `${e.codigo} ${e.titulo}: no conforme; qué se hizo: ${pc('describir')}`)) : 'Ningún ensayo está en no conforme.'; } },
    ],
  },
  {
    id: 'd06', codigo: 'D06', titulo: 'Declaración de conformidad del fabricante (RD 339/2014, anexo I)', peso: 3, carpeta: 6,
    para: 'El certificado de conformidad que acompaña a cada unidad. Los ocho datos son los que exige el anexo I; no hay que enviarlo a nadie, hay que tenerlo firmado.',
    norma: 'RD 339/2014, anexo I',
    secciones: [
      { id: 'a1', titulo: '1 · Fabricante', ayuda: 'Anexo I, dato 1.', generar: c => `${v(c.fab.razon, 'razón social')}, ${v(c.fab.direccion, 'dirección completa')}.` },
      { id: 'a2', titulo: '2 · Descripción e identificación del ciclo', ayuda: 'Anexo I, dato 2: marca y modelo.', generar: c => `Ciclo de pedales con pedaleo asistido de ${c.f.ruedasFisicas} ruedas. Marca: ${v(c.fab.marca, 'marca')}. Modelo: ${v(c.fab.modelo, 'modelo')}.` },
      { id: 'a3', titulo: '3 · Cumplimiento', ayuda: 'Anexo I, dato 3.', generar: () => 'Se declara que el ciclo descrito cumple todas las disposiciones aplicables del Real Decreto 339/2014, de 11 de abril, por el que se regulan los requisitos para la comercialización y puesta en servicio de las bicicletas y otros ciclos.' },
      { id: 'a4', titulo: '4 · Normas armonizadas utilizadas', ayuda: 'Anexo I, dato 4.', generar: () => P('UNE-EN 15194:2017+A1:2023 (apartado 4.2), citada por el anexo VI, punto 8.', pc('la lista del anexo IV del RD 339/2014 todavía cita la edición de 2009 de la EN 15194: confirmar qué edición declarar')) },
      { id: 'a5', titulo: '5 · Otras normas y especificaciones', ayuda: 'Anexo I, dato 5.', generar: () => lista(['UNE-EN ISO 12100 (evaluación de riesgos).', 'Reglamento (UE) 2023/1542 (batería).', pc('otras normas que se hayan usado')]) },
      { id: 'a6', titulo: '6 · Sistema de control de la producción', ayuda: 'Anexo I, dato 6.', generar: c => `Plan de control de producción y trazabilidad D09 (estado: ${NOMBRE_ESTADO[c.doc('d09')].toLowerCase()}), con hoja de control final por unidad y registro por número de serie.` },
      { id: 'a7', titulo: '7 · Lugar y fecha', ayuda: 'Anexo I, dato 7.', generar: c => `${v(c.fab.lugar, 'lugar')}, a ${c.hoy}.` },
      { id: 'a8', titulo: '8 · Identificación, cargo y firma', ayuda: 'Anexo I, dato 8.', generar: c => `${v(c.fab.responsable, 'nombre y apellidos')}, ${v(c.fab.cargo, 'cargo')}.\n\nFirma:` },
    ],
  },
  {
    id: 'd07', codigo: 'D07', titulo: 'Declaración UE de conformidad de máquinas y marcado CE', peso: 3, carpeta: 6,
    para: 'Es una segunda declaración, distinta de la anterior: una no sustituye a la otra. Hasta el 19-1-2027 rige la Directiva 2006/42/CE y desde el 20-1-2027 el Reglamento (UE) 2023/1230. Confírmalo con alguien que conozca la normativa de máquinas.',
    norma: 'Directiva 2006/42/CE; Reglamento (UE) 2023/1230; EN 15194, anexo ZA',
    secciones: [
      { id: 'fabricante', titulo: 'Fabricante', generar: identificacion },
      { id: 'legislacion', titulo: 'Legislación aplicable', generar: () => P('Si se comercializa antes del 20-1-2027: Directiva 2006/42/CE. Desde el 20-1-2027: Reglamento (UE) 2023/1230.', pc('decidir cuál aplica según la fecha prevista de la primera venta, y confirmar con un técnico de máquinas que a este vehículo le aplica')) },
      { id: 'maquina', titulo: 'Descripción de la máquina', generar: c => `${v(c.fab.marca, 'marca')} ${v(c.fab.modelo, 'modelo')}: ciclo con pedaleo asistido de ${c.f.ruedasFisicas} ruedas. Número de serie: ${pc('número de serie de la unidad')}.` },
      { id: 'normas', titulo: 'Normas aplicadas', generar: () => lista(['UNE-EN 15194:2017+A1:2023', 'UNE-EN ISO 12100', pc('otras')]) },
      { id: 'procedimiento', titulo: 'Procedimiento de evaluación', ayuda: 'Para una máquina ordinaria vale el control interno de la producción.', generar: () => `Control interno de la producción. ${pc('confirmar que la máquina no está entre las de alto riesgo que exigen organismo notificado')}` },
      { id: 'tecnica', titulo: 'Persona autorizada para la documentación técnica', generar: c => `${v(c.fab.responsable, 'nombre')}, ${v(c.fab.direccion, 'dirección')}.` },
      { id: 'firma', titulo: 'Lugar, fecha y firma', generar: c => `${v(c.fab.lugar, 'lugar')}, a ${c.hoy}. ${v(c.fab.responsable, 'nombre')}, ${v(c.fab.cargo, 'cargo')}.\n\nFirma:` },
    ],
  },
  {
    id: 'd08', codigo: 'D08', titulo: 'Manual de instrucciones y mantenimiento (anexo II)', peso: 3, carpeta: 7,
    para: 'Va con cada unidad, en castellano. Contiene el uso previsto y el mal uso previsible, la carga máxima, las plazas, los riesgos residuales, el montaje, el mantenimiento y la eliminación.',
    norma: 'RD 339/2014, anexo II y anexo VI, punto 12',
    secciones: [
      { id: 'uso', titulo: 'Para qué sirve', generar: c => `El ${v(c.fab.marca, 'marca')} ${v(c.fab.modelo, 'modelo')} es un ciclo de pedales con pedaleo asistido: el motor ayuda mientras pedaleas y se corta a 25 km/h. ${pc('uso previsto exacto: calzada, carril bici, carga transportada')}` },
      { id: 'datos', titulo: 'Datos del vehículo', generar: datosVehiculo },
      { id: 'mal-uso', titulo: 'Qué no debes hacer', generar: () => lista(['No superes la carga máxima ni el número de plazas.', 'No modifiques el controlador ni el motor.', 'No uses un cargador que no sea el original.', 'No circules con los frenos mal ajustados ni sin luces de noche.']) },
      { id: 'manejo', titulo: 'Puesta en marcha y manejo', generar: () => pc('cómo se enciende, niveles de asistencia, cómo se pedalea y qué indica la pantalla') },
      { id: 'frenos', titulo: 'Frenos y neumáticos', generar: () => lista(['La palanca izquierda frena la rueda delantera y la derecha la trasera.', `Presión de los neumáticos: ${pc('presión recomendada (bar)')}, marcada en cada neumático.`, 'Comprueba los frenos antes de cada uso.']) },
      { id: 'bateria', titulo: 'Batería y carga', generar: () => lista([`Batería: ${pc('modelo, tensión y capacidad')}.`, 'Carga solo con el cargador original, en un lugar ventilado y sin dejarla sin vigilancia.', 'No uses una batería dañada o hinchada.']) },
      { id: 'luces', titulo: 'Luces, reflectores y timbre', generar: () => 'Luz blanca delante y roja detrás; un reflector trasero rojo y cuatro laterales amarillos; timbre al alcance del conductor. Comprueba su funcionamiento y limpieza.' },
      { id: 'mantenimiento', titulo: 'Mantenimiento', generar: () => pc('tabla de revisiones: qué, cada cuánto y quién') },
      { id: 'residuales', titulo: 'Riesgos residuales', generar: () => pc('los de la evaluación de riesgos D04') },
      { id: 'eliminacion', titulo: 'Eliminación y reciclaje', generar: () => 'La batería y los componentes electrónicos no van a la basura doméstica: llévalos a un punto de recogida autorizado.' },
      { id: 'contacto', titulo: 'Contacto del fabricante', generar: c => `${v(c.fab.razon, 'razón social')}, ${v(c.fab.direccion, 'dirección')}. ${v(c.fab.contacto, 'correo o teléfono')}.` },
    ],
  },
  {
    id: 'd09', codigo: 'D09', titulo: 'Plan de control de producción y trazabilidad', peso: 2, carpeta: 8,
    para: 'Cómo te aseguras de que cada unidad es igual que la que ensayaste y cómo reconstruyes qué lleva cada una si te lo piden.',
    norma: 'RD 339/2014, anexo I (dato 6) y anexo III',
    secciones: [
      { id: 'alcance', titulo: 'Alcance', generar: () => `Serie prevista: ${pc('número de unidades')}. Una persona responsable de calidad: ${pc('nombre')}.` },
      { id: 'recepcion', titulo: 'Recepción de componentes y proveedores', generar: () => lista(['Lista de proveedores con su documentación (fichas, declaraciones CE).', 'Inspección a la entrada de motor, controlador, batería, frenos, neumáticos y catadióptricos.', 'Registro de lote de la batería y del cargador.']) },
      { id: 'montaje', titulo: 'Controles de montaje', generar: () => lista(['Par de apriete de uniones críticas.', 'Alineación de ruedas y dirección.', 'Ajuste de frenos.', 'Cableado y fusibles montados según el esquema.']) },
      { id: 'final', titulo: 'Verificación final de cada unidad', ayuda: 'Se genera con las comprobaciones «por unidad» de la matriz.', generar: () => tabla(['Obligación', 'Comprobación', 'OK'], OBLIGACIONES.flatMap(o => o.huecos.filter(h => h.porUnidad).map(h => [`${o.id} ${o.titulo}`, h.que, '☐']))) },
      { id: 'trazabilidad', titulo: 'Número de serie y trazabilidad', generar: () => P(`Formato del número de serie: ${pc('formato, por ejemplo año-modelo-contador')}.`, 'Registro por unidad: número de serie, fecha, lote de batería, componentes montados, hoja de control final y quién la firmó.') },
      { id: 'cambios', titulo: 'Gestión de modificaciones', generar: () => 'Todo cambio de diseño o de componente se registra con fecha y motivo, y se decide qué ensayos hay que repetir.' },
    ],
  },
  {
    id: 'd10', codigo: 'D10', titulo: 'Ficha técnica del vehículo', peso: 2,
    para: 'La hoja de datos del producto: se saca del diseño 3D. Cada unidad la lleva con su manual.',
    norma: 'RD 339/2014, anexo VI, punto 1',
    secciones: [
      { id: 'id', titulo: 'Identificación', generar: identificacion },
      { id: 'datos', titulo: 'Datos del vehículo', generar: datosVehiculo },
      { id: 'notas', titulo: 'De dónde salen las cifras', generar: c => lista(c.f.notas.length ? c.f.notas : [pc('origen de las cifras')]) },
    ],
  },
  {
    id: 'd11', codigo: 'D11', titulo: 'Advertencias y marcado del vehículo', peso: 3,
    para: 'Lo que va escrito en el vehículo: la placa, el número de serie, las etiquetas de advertencia y la carga máxima. Todo al menos en castellano.',
    norma: 'RD 339/2014, art. 3 y anexo VI, puntos 1, 4.1 y 7',
    secciones: [
      { id: 'placa', titulo: 'Placa de características', ayuda: 'Visible, legible e indeleble (art. 3).', generar: c => lista([`Razón social: ${v(c.fab.razon, 'razón social')}`, `Dirección completa: ${v(c.fab.direccion, 'dirección')}`, `Modelo: ${v(c.fab.modelo, 'modelo')}`, `Número de serie: ${pc('número de serie de cada unidad')}`, `Año de fabricación: ${pc('año')}`, 'Marcado CE, si aplica.']) },
      { id: 'carga', titulo: 'Carga máxima y plazas', generar: c => `Carga máxima: ${c.f.masaMaxima != null && c.f.masaVacio != null ? `${n(c.f.masaMaxima - c.f.masaVacio)} kg` : pc('carga máxima')}. Plazas: ${c.f.plazas ?? pc('plazas')}.` },
      { id: 'advertencias', titulo: 'Etiquetas de advertencia', generar: () => lista(['Lee el manual antes de usar el vehículo.', 'No superes la carga máxima ni las plazas.', 'La asistencia del motor se corta a 25 km/h.', 'Carga la batería solo con el cargador original.', pc('otras advertencias de la evaluación de riesgos')]) },
      { id: 'neumaticos', titulo: 'Presión de los neumáticos', generar: () => `Presión recomendada: ${pc('bar')}, marcada en cada neumático.` },
      { id: 'idioma', titulo: 'Idioma', generar: () => 'Toda la información y las advertencias, al menos en castellano.' },
    ],
  },
];

export const documento = (id: string) => DOCUMENTOS.find(d => d.id === id);
/** The eight documents of the «Carpeta legal del fabricante» of the text Eugenio pasted, with the documents behind each. */
export const CARPETA_LEGAL: { n: number; titulo: string; docs: string[] }[] = [
  { n: 1, titulo: 'Declaración de clasificación del vehículo como ciclo de pedales con pedaleo asistido', docs: ['d01'] },
  { n: 2, titulo: 'Matriz de requisitos legales y normativa aplicable', docs: ['d02'] },
  { n: 3, titulo: 'Expediente técnico de diseño y fabricación (RD 339/2014)', docs: ['d03'] },
  { n: 4, titulo: 'Evaluación de riesgos y seguridad de máquinas', docs: ['d04'] },
  { n: 5, titulo: 'Plan de ensayos e informes de resultados', docs: ['d05'] },
  { n: 6, titulo: 'Declaración de conformidad del RD 339/2014 y declaración UE de conformidad CE aplicable', docs: ['d06', 'd07'] },
  { n: 7, titulo: 'Manual de instrucciones y mantenimiento', docs: ['d08'] },
  { n: 8, titulo: 'Plan de control de producción y trazabilidad de las unidades', docs: ['d09'] },
];

import type { Parametros } from '../geometria';

/**
 * Un departamento del «fabricante» del Aeromóvil (2026-11-06, Eugenio: «divide
 * el menú por departamentos como si fuese una empresa de fabricación de
 * vehículos… y que al pinchar uno se abran debajo del 3D las responsabilidades
 * del equipo, las tareas para avanzar con el prototipo 1, las decisiones de
 * componentes, proveedores y diseño, los aliados y referencias a nivel CRM, y
 * los mensajes preparados para pedirles presupuesto»).
 *
 * Todo lo que hay aquí lo escribe un bot a partir de lo que ya existe en el
 * proyecto (`componentes.ts`, los planos, el changelog) y de lo que encuentra
 * en la web. Regla de oro: nada inventado. Un proveedor solo entra con su web
 * real encontrada; si un dato no se ha podido comprobar, se dice.
 */
export type IdDepartamento =
  | 'proyecto' | 'carroceria' | 'chasis' | 'rodaje' | 'propulsion' | 'energia'
  | 'interior' | 'accesos' | 'luces' | 'fabricacion' | 'homologacion';

export interface Tarea {
  titulo: string;
  detalle: string;                 // qué hay que hacer exactamente y qué sale de ahí
  prioridad: 'alta' | 'media' | 'baja';
  semanas?: number;                // estimación, en semanas de una persona
  dependeDe?: string[];            // títulos de otras tareas (de este u otro departamento)
  entregable?: string;             // qué documento, pieza o número queda al acabar
}
export interface Opcion { nombre: string; pros: string; contras: string; coste?: string }
export interface Decision {
  tema: string;                    // «Material de la carrocería»
  contexto: string;                // por qué hay que decidirlo para el prototipo 1
  opciones: Opcion[];
  recomendacion: string;           // la opción recomendada, en una frase
  porQue: string;                  // la razón, para alguien que no es ingeniero
  cuando: 'antes de diseñar' | 'antes de comprar' | 'antes de fabricar' | 'antes de probar';
}
export interface Partner {
  nombre: string;
  tipo: 'proveedor' | 'taller' | 'ingeniería' | 'laboratorio' | 'universidad' | 'institución' | 'comunidad' | 'fabricante';
  pais: string;
  web?: string;                    // solo si se ha encontrado de verdad
  que: string;                     // qué nos puede dar
  porQue: string;                  // por qué este y no otro
  estado: 'por contactar' | 'contactado' | 'en conversación' | 'descartado';
  verificado: boolean;             // false = el bot no ha podido confirmar que siga activo o que haga exactamente esto
}
export interface Mensaje {
  para: string;                    // nombre del partner (tiene que existir en `partners`)
  canal: 'correo' | 'formulario web' | 'teléfono' | 'LinkedIn';
  idioma: 'es' | 'en';
  asunto: string;
  cuerpo: string;                  // listo para copiar; con [corchetes] donde falte un dato nuestro
  quePedimos: string[];            // la lista de datos que queremos que nos devuelvan
}
export interface Referencia { titulo: string; url: string; nota: string }

export interface Departamento {
  id: IdDepartamento;
  nombre: string;                  // «Carrocería y aerodinámica»
  lema: string;                    // una línea
  mision: string;                  // un párrafo
  responsabilidades: string[];
  /** Qué deslizadores y selectores del lateral son de este departamento. */
  parametros: (keyof Parametros)[];
  /** Qué fichas de `componentes.ts` son de este departamento (sus `id`). */
  componentes: string[];
  tareas: Tarea[];
  decisiones: Decision[];
  partners: Partner[];
  mensajes: Mensaje[];
  referencias: Referencia[];
  /** Fecha y autor de la última revisión del contenido, para saber cuánto fiarse. */
  revisado: { fecha: string; por: string };
}

// Shapes shared by the pedal cycle's file (2026-11-24): what is stored on the server, and the states derived from it.
// Pure types and two tiny helpers: no React, so `scripts/expediente.ts` can import everything in Node.
import type { Adjunto } from '../../proveedores/datos';

export type { Adjunto };

/** A matrix slot: not started, being done, done, or not applicable (with the reason written down). */
export type EstadoHueco = 'pendiente' | 'enCurso' | 'hecho' | 'noAplica';
export type EstadoEnsayo = 'pendiente' | 'enCurso' | 'hecho' | 'noConforme';
export type EstadoDoc = 'pendiente' | 'enCurso' | 'hecho';

export interface HuecoGuardado { estado: EstadoHueco; nota?: string; /** why it does not apply */ motivo?: string; adjuntos?: Adjunto[] }
/** The value of one matrix key (`matriz-o03`): one obligation, its slots by letter (`a`, `b`…) and, if it does not apply, why. */
export interface ObligacionGuardada { huecos: Record<string, HuecoGuardado>; noAplica?: string; nota?: string }

export interface Firma { nombre: string; fecha: string }
/** One try of a test: how it was done and what came out. A test can have several (a failed one stays in the file). */
export interface Intento {
  id: string;
  fecha: string;
  unidad: string; configuracion: string; instrumentos: string; calibracion: string; condiciones: string; procedimiento: string; criterio: string;
  valores: Record<string, string>;
  observaciones: string;
  conclusion: '' | 'conforme' | 'noConforme';
  adjuntos: Adjunto[];
  firma?: Firma;
}
export interface EnsayoGuardado { intentos: Intento[]; nota?: string }

export interface SeccionGuardada { /** the engineer's text; absent: the automatic one */ texto?: string; revisada?: boolean }
export interface DocGuardado { secciones: Record<string, SeccionGuardada>; aprobado?: Firma; adjuntos?: Adjunto[] }

/** The maker's details: they go in the plate, the declarations and the manual. No identity-document numbers. */
export interface Fabricante { razon: string; direccion: string; marca: string; modelo: string; responsable: string; cargo: string; lugar: string; contacto: string }
export const FABRICANTE_VACIO: Fabricante = { razon: '', direccion: '', marca: '', modelo: '', responsable: '', cargo: '', lugar: '', contacto: '' };
export const CAMPOS_FABRICANTE: { id: keyof Fabricante; etiqueta: string; ayuda: string; obligatorio: boolean; grande?: boolean }[] = [
  { id: 'razon', etiqueta: 'Razón social', ayuda: 'Va en la placa y en las declaraciones (art. 3 y anexo I).', obligatorio: true },
  { id: 'direccion', etiqueta: 'Dirección completa', ayuda: 'Calle, número, código postal, localidad y país: la placa y la declaración la piden completa.', obligatorio: true, grande: true },
  { id: 'marca', etiqueta: 'Marca', ayuda: 'La marca comercial del vehículo.', obligatorio: true },
  { id: 'modelo', etiqueta: 'Modelo', ayuda: 'El nombre del modelo, tal como irá marcado de forma permanente en el vehículo.', obligatorio: true },
  { id: 'responsable', etiqueta: 'Persona que firma la declaración', ayuda: 'Nombre y apellidos de quien firma como apoderado (anexo I, dato 8).', obligatorio: true },
  { id: 'cargo', etiqueta: 'Cargo de esa persona', ayuda: 'Por ejemplo, administrador o ingeniero responsable.', obligatorio: true },
  { id: 'lugar', etiqueta: 'Lugar de la declaración', ayuda: 'La localidad donde se firma.', obligatorio: true },
  { id: 'contacto', etiqueta: 'Correo o teléfono de contacto', ayuda: 'Para el manual y las advertencias.', obligatorio: false },
];
export const faltanFabricante = (f: Fabricante) => CAMPOS_FABRICANTE.filter(c => c.obligatorio && !f[c.id]?.trim());

/** A `[por completar: …]` mark: the documents show it in amber and a document with one is never «listo». */
export const pc = (que: string) => `[por completar: ${que}]`;
export const conPendientes = (texto: string) => /\[por completar:/i.test(texto);

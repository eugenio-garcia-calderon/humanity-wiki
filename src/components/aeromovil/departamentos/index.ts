import type { Departamento, IdDepartamento } from './tipos';
import { DEPARTAMENTO as proyecto } from './proyecto';
import { DEPARTAMENTO as carroceria } from './carroceria';
import { DEPARTAMENTO as chasis } from './chasis';
import { DEPARTAMENTO as rodaje } from './rodaje';
import { DEPARTAMENTO as propulsion } from './propulsion';
import { DEPARTAMENTO as energia } from './energia';
import { DEPARTAMENTO as interior } from './interior';
import { DEPARTAMENTO as accesos } from './accesos';
import { DEPARTAMENTO as luces } from './luces';
import { DEPARTAMENTO as fabricacion } from './fabricacion';
import { DEPARTAMENTO as homologacion } from './homologacion';

export type { Departamento, IdDepartamento, Tarea, Decision, Partner, Mensaje, Referencia, Opcion, Objetivo, OpcionCompra, PreguntaBusqueda } from './tipos';
/** Los departamentos, en el orden de las pestañas del lateral. */
export const DEPARTAMENTOS: Departamento[] = [proyecto, carroceria, chasis, rodaje, propulsion, energia, interior, accesos, luces, fabricacion, homologacion];
export const departamento = (id: IdDepartamento) => DEPARTAMENTOS.find(d => d.id === id)!;

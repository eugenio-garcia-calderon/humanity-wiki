import type { PropsLectura } from '../tipos';
import { VistaPresentacion, type Seccion } from './Vista';

export default function Lectura({ datos }: PropsLectura) {
  const secciones = Array.isArray(datos.secciones) ? (datos.secciones as Seccion[]) : [];
  return <VistaPresentacion secciones={secciones} />;
}

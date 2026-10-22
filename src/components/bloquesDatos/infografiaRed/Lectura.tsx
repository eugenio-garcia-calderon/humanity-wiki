import type { PropsLectura } from '../tipos';
import { Infografia, type PasoInfografia } from './Infografia';

export default function Lectura({ datos }: PropsLectura) {
  return (
    <section className="my-6">
      <Infografia titulo={datos.titulo as string} texto={datos.texto as string} pasos={datos.pasos as PasoInfografia[]} />
    </section>
  );
}

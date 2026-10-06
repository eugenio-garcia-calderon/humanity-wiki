import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FormularioEnvio } from '../components/tablas/FormularioVista';

// ============================================================================
// EL FORMULARIO PÚBLICO — `/formulario/:token` (2026-10-06, carril «bd»)
// ============================================================================
// Sin cuenta, sin barra de trabajo, sin marca: quien llega aquí viene de un
// enlace que alguien le mandó y solo tiene que rellenar unos campos. Va FUERA
// del Layout, como las páginas publicadas. No se indexa: un formulario no es
// contenido para buscadores, y su enlace es la única llave.
export default function FormularioPublico() {
  const { token = '' } = useParams();
  useEffect(() => {
    document.title = 'Formulario';
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex,nofollow';
    document.head.appendChild(m);
    return () => { m.remove(); };
  }, []);
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-7">
        <FormularioEnvio token={token} />
      </div>
    </main>
  );
}

import { lazy, Suspense, useCallback, useState } from 'react';

// La página de gracias de una donación (`GraciasDonacion.tsx`), en cualquier raíz de la aplicación (plataforma,
// dominio propio, subdominio): solo se carga cuando la dirección trae la vuelta de Stripe, así nadie más la paga.
const GraciasDonacion = lazy(() => import('./GraciasDonacion'));

const sesionDeLaDireccion = () => {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  const s = q.get('sesion') || '';
  return q.get('donacion') === 'gracias' && /^cs_(live|test)_[A-Za-z0-9]{10,250}$/.test(s) ? s : null;
};

export default function MontarGraciasDonacion() {
  const [sesion, setSesion] = useState(sesionDeLaDireccion);
  const cerrar = useCallback(() => {
    import('./GraciasDonacion').then(m => m.cerrarGracias());
    setSesion(null);
  }, []);
  if (!sesion) return null;
  return <Suspense fallback={null}><GraciasDonacion sesion={sesion} onCerrar={cerrar} /></Suspense>;
}

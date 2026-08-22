// ============================================================================
// LA ENTRADA — YA NO ES LA PORTADA (2026-08-22)
// ============================================================================
// Nació el 20 de agosto como desvío de «/» al perfil («haz que la página de
// inicio por defecto sea la del Mi Perfil»). El 21 la portada pasó a ser
// Publicaciones y el 22 Eugenio lo confirmó: «la página por defecto cuando no
// hay página es Mi Perfil, pero cambia esto».
//
// SE QUEDA VIVA EN `/entrada` Y NO SE BORRA porque puede haber enlaces
// guardados apuntando aquí, y un enlace que muere en un 404 es peor que uno
// que te deja donde ibas. Lo que cambia es a DÓNDE lleva: al inicio, que ahora
// es la página de publicaciones.
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Entrada() {
  const { loading } = useAuth();
  if (loading) {
    return <div className="py-24 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;
  }
  // SIN SESIÓN TAMBIÉN AL INICIO, no al login: la portada ya se puede ver sin
  // cuenta, y mandar a alguien a iniciar sesión antes de enseñarle nada era
  // pedirle la cuenta a cambio de nada.
  return <Navigate to="/" replace />;
}

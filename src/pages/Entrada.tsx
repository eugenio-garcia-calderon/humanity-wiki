// ============================================================================
// LA ENTRADA (2026-08-20, petición de Eugenio: «haz que la página de inicio
// por defecto sea la del Mi Perfil»).
// ============================================================================
// No es una página: es el desvío. Con sesión te lleva a TU perfil —que es el
// muro donde enseñas tu trabajo—; sin ella, a iniciar sesión. Se hace con una
// ruta y no con una redirección del servidor para que el perfil siga teniendo
// su propia dirección compartible.
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Entrada() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="py-24 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>;
  }
  return <Navigate to={user ? `/personas/${user.id}` : '/login'} replace />;
}

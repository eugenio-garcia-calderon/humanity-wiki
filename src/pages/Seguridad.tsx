// ============================================================================
// SEGURIDAD — el tablero que NO es público (2026-08-22, prog6)
// ============================================================================
// Eugenio: «hay cuatro cosas de seguridad en el hormiguero […] trasládalas ahí
// para limpiar el hormiguero, que es un tema para el público».
//
// Y el aviso que le da sentido, de prog4 al revisarlo: un tablero de seguridad
// es LA LISTA DE POR DÓNDE ENTRAR. Las cuatro notas que se mudan aquí decían en
// texto llano que el login no tiene límite de intentos y que la aplicación
// entra a la base de datos como superusuario.
//
// EL CANDADO ESTÁ EN EL SERVIDOR, no aquí. Esta página no decide nada: pide
// `?area=seguridad` y el servidor contesta 403 a quien no sea del equipo. Si el
// filtro viviera en esta pantalla, la respuesta ya habría viajado entera al
// navegador y bastaría con mirarla. Lo de abajo es cortesía, no protección.
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Tablero from '../components/tablero/Tablero';
import { useAuth, ROLE } from '../contexts/AuthContext';

export default function Seguridad() {
  const { user } = useAuth();
  const delEquipo = (user?.roleLevel ?? 0) >= ROLE.ADMIN;

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-slate-900 font-display">
          <ShieldAlert className="w-7 h-7 text-amber-500" /> Seguridad
        </h1>
        <p className="mt-2 text-slate-600">
          Lo que hay que arreglar para que esta plataforma sea segura. Está
          separado del <Link to="/hormiguero" className="font-bold text-emerald-600 hover:text-emerald-700">Hormiguero</Link>{' '}
          a propósito: aquello lo lee cualquiera, y una lista de agujeros
          abiertos publicada es un mapa para quien quiera usarlos.
        </p>
      </div>

      {!delEquipo && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Este tablero es del equipo. No es un secreto por gusto: mientras algo
          esté sin arreglar, contar dónde está solo ayuda a quien quiera
          aprovecharlo. Cuando se arregla, se cuenta.
        </p>
      )}

      <Tablero area="seguridad" vacio="Nada abierto en seguridad ahora mismo." />
    </div>
  );
}

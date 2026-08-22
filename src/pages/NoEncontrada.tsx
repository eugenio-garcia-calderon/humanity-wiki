import { Link, useLocation } from 'react-router-dom';
import { Compass } from 'lucide-react';

// ============================================================================
// UNA DIRECCIÓN QUE NO EXISTE — y que hasta hoy no decía nada (2026-08-22)
// ============================================================================
// No había ninguna ruta para «cualquier otra cosa», así que escribir mal una
// dirección —o seguir un enlace viejo— dejaba la pantalla EN BLANCO. Sin aviso,
// sin menú, sin nada. Y una pantalla en blanco no dice «esto no existe»: dice
// «esto se ha roto». Quien la ve no vuelve a intentarlo, y encima cree que la
// culpa es suya o que la plataforma está caída.
//
// Lo encontró Eugenio abriendo una dirección que aún no estaba desplegada. Se
// arregla aquí y para todas: es la misma respuesta para las 40 rutas que
// existen y para las infinitas que no.

export default function NoEncontrada() {
  const { pathname } = useLocation();
  return (
    <div className="max-w-lg mx-auto text-center py-16 px-5">
      <Compass className="w-10 h-10 mx-auto text-slate-300" />
      <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
        Aquí no hay nada
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        La dirección <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 break-all">{pathname}</code> no
        lleva a ninguna parte. O se ha escrito con alguna letra de más, o lo que
        había aquí ya no está.
      </p>
      <Link to="/"
        className="inline-block mt-6 h-11 leading-[2.75rem] px-5 rounded-xl bg-slate-900 text-white text-sm font-bold">
        Volver al principio
      </Link>
    </div>
  );
}

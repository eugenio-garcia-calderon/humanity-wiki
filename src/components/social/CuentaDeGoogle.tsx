import { useCallback, useEffect, useState } from 'react';
import { Loader2, Check, Link2, Unlink, AlertTriangle, Youtube, Contact, CalendarDays } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// CONECTAR TU CUENTA DE GOOGLE (2026-08-23) — fase 2 de 5
// ============================================================================
// La pantalla de un permiso tiene una regla por encima de las demás: **decir
// exactamente qué se va a poder hacer con él, antes de pedirlo**. Nadie lee los
// términos y todo el mundo lee tres líneas que le dicen qué le van a tocar.
//
// Por eso aquí no hay un botón «Conectar Google» a secas. Hay una lista de lo
// que se va a poder ver, en las palabras de quien lo va a conceder, y al lado
// el botón. Y hay, con el mismo tamaño, cómo se retira.
//
// ── TRES ESTADOS, Y NO DOS ──────────────────────────────────────────────────
// «No disponible» no es lo mismo que «no conectada»: la primera no es culpa de
// nadie y no hay nada que hacer; la segunda es una decisión pendiente. Y hay
// una tercera que casi siempre se olvida —**se ha roto**—, que es lo que pasa
// cuando alguien retira el permiso desde su cuenta de Google o cambia la
// contraseña. Sin ese estado, la pantalla diría «conectada» de algo que ya no
// funciona, y las funciones fallarían sin explicación.

interface Estado {
  disponible: boolean;
  conectada: boolean;
  email: string | null;
  permisos: string[];
  desde: string | null;
  usada: string | null;
  rota: boolean;
  porque: string | null;
}

/** Lo que se va a poder ver, dicho como lo diría una persona. El orden es el de
 *  las fases: lo primero que funcionará es lo primero de la lista. */
const LO_QUE_DA = [
  { icono: Youtube, que: 'Tus vídeos de YouTube', detalle: 'Guardados, «me gusta» y suscripciones, pintados aquí' },
  { icono: Contact, que: 'Tus contactos', detalle: 'Para que tu agenda entre sola, sin exportar ficheros' },
  { icono: CalendarDays, que: 'Tu calendario', detalle: 'Tus citas, en la plataforma' },
];

export default function CuentaDeGoogle() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const mirar = useCallback(() => {
    fetch('/api/google/estado', { credentials: 'include' })
      .then(r => r.json()).then(setEstado).catch(() => setEstado(null));
  }, []);
  useEffect(mirar, [mirar]);

  // La vuelta de Google ocurre en OTRA ventana. Cuando termina, avisa por
  // `postMessage` y aquí se relee el estado: sin esto habría que recargar a
  // mano para ver que la conexión funcionó, que es la clase de detalle que
  // hace pensar que algo ha fallado cuando ha ido bien.
  useEffect(() => {
    const alVolver = (e: MessageEvent) => { if (e.data?.google) mirar(); };
    window.addEventListener('message', alVolver);
    return () => window.removeEventListener('message', alVolver);
  }, [mirar]);

  const conectar = () => {
    // En ventana aparte y no redirigiendo: quien conecta está a mitad de otra
    // cosa, y sacarle de la plataforma para volver a una pantalla en blanco es
    // perder lo que estuviera haciendo.
    window.open('/api/google/conectar', 'google', 'width=520,height=680');
  };

  const desconectar = async () => {
    setTrabajando(true);
    try {
      await fetch('/api/google/conexion', { method: 'DELETE', credentials: 'include' });
      mirar();
    } finally { setTrabajando(false); }
  };

  if (!estado) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 max-w-2xl">
      <h3 className="text-sm font-black text-slate-900">Tu cuenta de Google</h3>

      {!estado.disponible && (
        // NO ES LO MISMO QUE «no conectada». Aquí no hay nada que la persona
        // pueda hacer, y decirle «conecta tu cuenta» sería mandarla a un botón
        // que va a fallar.
        <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
          Todavía no está disponible: falta configurar la conexión con Google en el servidor.
          No es nada que puedas arreglar tú.
        </p>
      )}

      {estado.disponible && !estado.conectada && (
        <>
          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
            Conéctala y la plataforma podrá enseñarte aquí lo que tienes en Google, pintado a
            nuestra manera. <b className="text-slate-700">Nada se comparte con nadie</b> y puedes
            retirarlo en cualquier momento, desde aquí o desde tu propia cuenta de Google.
          </p>

          <ul className="mt-3 space-y-1.5">
            {LO_QUE_DA.map(({ icono: Icono, que, detalle }) => (
              <li key={que} className="flex items-start gap-2">
                <Icono className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span className="text-[11px] leading-snug">
                  <b className="text-slate-700">{que}</b>
                  <span className="block text-slate-400">{detalle}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* LO QUE NO SE PIDE, DICHO TAMBIÉN. Una lista de permisos que solo
              enumera lo que sí se toca deja a la gente imaginando el resto, y
              lo que imaginan siempre es peor. */}
          <p className="mt-2.5 text-[10px] text-slate-400 leading-snug">
            No se pide acceso a tu correo. Ese permiso es de otra categoría para Google y
            exige una auditoría anual de pago; si algún día se añade, se te preguntará aparte.
          </p>

          <button
            onClick={conectar}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" /> Conectar mi cuenta de Google
          </button>
        </>
      )}

      {estado.disponible && estado.rota && (
        <div className="mt-2.5 rounded-lg bg-amber-50 border border-amber-200 p-2.5">
          <p className="text-[11px] font-black text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> La conexión se ha soltado
          </p>
          <p className="mt-1 text-[10px] text-amber-800 leading-snug">
            {estado.porque || 'Google ya no acepta el permiso.'} Suele pasar al cambiar la contraseña
            de Google o al retirarlo desde tu cuenta. Vuelve a conectarla y sigue donde estaba.
          </p>
          <button
            onClick={conectar}
            className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold hover:bg-amber-600 transition-colors"
          >
            <Link2 className="w-3 h-3" /> Volver a conectarla
          </button>
        </div>
      )}

      {estado.disponible && estado.conectada && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
            <Check className="w-3 h-3" /> Conectada{estado.email ? ` como ${estado.email}` : ''}
          </span>
          <button
            onClick={desconectar}
            disabled={trabajando}
            className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-full border border-rose-200 text-[10px] font-bold text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
          >
            {trabajando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
            Retirar el permiso
          </button>
          <p className="w-full text-[10px] text-slate-400 leading-snug">
            Al retirarlo se le avisa a Google, no solo se borra aquí: dejaremos de aparecer en la
            lista de aplicaciones de tu cuenta.
          </p>
        </div>
      )}

      <p className={cn('mt-3 text-[10px] leading-snug', estado.conectada ? 'text-slate-400' : 'text-slate-300')}>
        La llave que nos deja pedirle cosas a Google se guarda cifrada, y no sale de aquí.
      </p>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

// ============================================================================
// BORRAR LA CUENTA (2026-08-22, Programador 3)
// ============================================================================
// VIVE DENTRO DE «CONFIGURACIÓN» Y NO EN UNA PÁGINA PROPIA. Configuración se
// describe a sí misma como «un sitio al que vas una vez y te olvidas», que es
// exactamente lo que es esto. Y de paso no hace falta ni ruta nueva ni entrada
// de menú: hoy hay nueve programadores y `App.tsx` y `Layout.tsx` son los dos
// ficheros por los que se hace cola. Una sección cuesta cero cola.
// Eugenio preguntó qué hace falta para publicar en la App Store y en Google
// Play. Esto es lo primero de la lista, y no por gusto: **las dos tiendas
// rechazan una aplicación que deje crear una cuenta y no deje borrarla desde
// dentro**. Apple lo exige desde 2022 y Google pide además una vía web. Sin
// esto no hay nada más que hablar con ninguna de las dos.
//
// LAS DOS DECISIONES SON DE EUGENIO, NO MÍAS, y cambian el diseño entero:
//
// 1. QUÉ PASA CON LO QUE HA PUBLICADO → se anonimiza y se queda. Su nombre pasa
//    a «Usuario eliminado» y sus proyectos, publicaciones y lienzos siguen
//    vivos. En una plataforma de conocimiento la alternativa es peligrosa: una
//    persona se borra en caliente y se lleva por delante lo que otros
//    construyeron encima. Es lo que hacen Wikipedia y GitHub.
//
// 2. CUÁNDO → papelera de 15 días, como el resto del contenido (regla 6 de la
//    Constitución). Volver a entrar dentro de esos 15 días cancela el borrado.
//    Un enfado a las dos de la mañana no debería ser irreversible.
//
// CONSECUENCIA TÉCNICA QUE NO ES OBVIA: la fila de `users` **no se borra, se
// vacía**. Si se borrara, todo lo que apunta a ella por clave ajena se rompería
// —y eso es precisamente el contenido que hemos decidido conservar—. Queda como
// lápida: sin nombre, sin correo, sin avatar, sin vínculo con Google.
//
// POR QUÉ LA CONTRASEÑA Y NO UN «¿ESTÁS SEGURO?». Un aviso que sale siempre se
// pulsa sin leer; es de los principios de la página de Usabilidad. La
// contraseña obliga a parar, y de paso hace imposible que un enlace malicioso
// dispare el borrado sin que la persona toque nada. La pide el servidor
// (`POST /api/auth/borrar-cuenta`), así que esto no es decoración: sin ella no
// borra.
//
// QUIÉN NO TIENE CONTRASEÑA: LO DICE EL SERVIDOR, NO LO ADIVINA ESTA PANTALLA.
// Quien entró con Google no tiene contraseña, y al principio el servidor le
// respondía «la contraseña no es correcta» — falso, y un callejón sin salida:
// esa persona no podía irse de la plataforma por ninguna vía. Programador 1 lo
// arregló aceptando el correo escrito a mano, y de paso hizo algo mejor que lo
// que yo le había pedido: **al llamar sin cuerpo, el servidor responde `pide`
// con la confirmación que hace falta** («contrasena» o «correo»).
//
// Por eso esta pantalla pregunta primero y pinta después. Podría deducirlo
// mirando si la cuenta tiene contraseña, pero entonces la regla viviría en dos
// sitios y el día que aparezca una tercera forma de entrar habría que acordarse
// de tocar los dos. Así, si el servidor cambia, esta pantalla ya lo soporta.

export function BorrarCuenta() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [confirmando, setConfirmando] = useState(false);
  /** Qué confirmación pide el servidor para ESTA cuenta. Lo dice él. */
  const [pide, setPide] = useState<'contrasena' | 'correo' | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [escrito, setEscrito] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const listo = escrito.trim().length > 0;

  /*
   * Se llama SIN cuerpo al abrir el diálogo. El servidor contesta 400 con
   * `pide`, que es cómo sabemos qué campo enseñar. No borra nada: sin
   * confirmación no pasa de ahí.
   */
  const preguntarQuePide = async () => {
    setConfirmando(true);
    setError(null);
    try {
      const r = await fetch('/api/auth/borrar-cuenta', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      const j = await r.json().catch(() => ({}));
      if (j.pide === 'correo' || j.pide === 'contrasena') {
        setPide(j.pide);
        setMotivo(j.error || null);
      } else {
        // Si no lo dice, se pide la contraseña, que es el caso mayoritario.
        setPide('contrasena');
      }
    } catch {
      setPide('contrasena');
    }
  };

  const borrar = async () => {
    if (!listo) return;
    setError(null);
    setOcupado(true);
    try {
      const r = await fetch('/api/auth/borrar-cuenta', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pide === 'correo' ? { correo: escrito.trim() } : { password: escrito.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se ha podido borrar la cuenta.');
      await refresh();
      navigate('/?cuenta=borrada');
    } catch (e: any) {
      setError(e.message);
      setOcupado(false);
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 mb-6">
        <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Qué pasa si borras tu cuenta
        </h2>
        <ul className="mt-3 space-y-2.5 text-sm text-slate-600 leading-relaxed">
          <li className="flex gap-2.5">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
            <span><strong className="text-slate-800">Tienes 15 días para arrepentirte.</strong> Basta con <strong className="text-slate-800">volver a entrar</strong> —con tu contraseña o con Google— y el borrado se cancela solo. Pasados los 15 días ya no hay vuelta atrás.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
            <span><strong className="text-slate-800">Tus datos personales se borran:</strong> tu nombre, tu correo, tu foto y tu vínculo con Google.</span>
          </li>
          <li className="flex gap-2.5">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
            <span>
              <strong className="text-slate-800">Lo que has publicado se queda, sin tu nombre.</strong> Tus
              proyectos, publicaciones y lienzos siguen ahí, firmados como «Usuario
              eliminado». Otras personas pueden haber construido encima, y borrarlo
              se llevaría por delante su trabajo también.
            </span>
          </li>
        </ul>
        <p className="mt-4 text-xs text-slate-400 leading-relaxed">
          Si además quieres que se borre lo que has publicado, pídelo desde{' '}
          <Link to="/hormiguero" className="font-semibold text-slate-500 hover:underline">Feedback</Link>{' '}
          antes de borrar la cuenta: cada cosa tiene su propia papelera de 15 días.
        </p>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
        <h2 className="text-sm font-black text-rose-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Borrar mi cuenta
        </h2>

        {!confirmando ? (
          <button
            type="button"
            onClick={preguntarQuePide}
            className="mt-3 min-h-[44px] px-4 rounded-xl border border-rose-300 bg-white text-sm font-bold text-rose-700 hover:bg-rose-50 transition-colors"
          >
            Quiero borrar mi cuenta
          </button>
        ) : (
          <div className="mt-3 space-y-3">
            {/* Escribir el correo, no un «¿estás seguro?». Un aviso que sale
                siempre se pulsa sin leer. Esto obliga a mirar QUÉ cuenta se
                está borrando. */}
            {/* El texto y el campo salen de lo que ha dicho el servidor. Si aún
                no ha contestado, no se enseña un campo a medias. */}
            {!pide ? (
              <p className="text-sm text-rose-900 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Un momento…
              </p>
            ) : (
              <>
                <label className="block text-sm text-rose-900" htmlFor="conf-borrado">
                  {pide === 'correo'
                    ? <>Esta cuenta entra con Google. Para confirmar que eres tú, escribe tu correo: <strong>{user.email}</strong></>
                    : 'Para confirmar que eres tú, escribe tu contraseña.'}
                </label>
                <input
                  id="conf-borrado"
                  type={pide === 'correo' ? 'email' : 'password'}
                  value={escrito}
                  onChange={e => setEscrito(e.target.value)}
                  autoComplete={pide === 'correo' ? 'email' : 'current-password'}
                  spellCheck={false}
                  placeholder={pide === 'correo' ? (user.email || '') : ''}
                  className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                />
                {motivo && pide === 'correo' && (
                  <p className="text-xs text-rose-700/80">{motivo}</p>
                )}
              </>
            )}

            {error && (
              <p className="text-sm text-rose-800 bg-rose-100 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={borrar}
                disabled={!listo || !pide || ocupado}
                className={cn(
                  'min-h-[44px] px-4 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors',
                  listo && pide && !ocupado
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-rose-200 text-rose-400 cursor-not-allowed',
                )}
              >
                {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Borrar mi cuenta
              </button>
              <button
                type="button"
                onClick={() => { setConfirmando(false); setEscrito(''); setError(null); setPide(null); setMotivo(null); }}
                disabled={ocupado}
                className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-slate-600 hover:bg-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

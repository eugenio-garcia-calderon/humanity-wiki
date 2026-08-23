import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button } from '../components/ui/core';

type Mode = 'login' | 'register' | 'forgot';

// Página única de acceso: iniciar sesión, crear cuenta y recuperar contraseña.
// Antes solo permitía iniciar sesión con las credenciales de administrador
// escritas en el propio código del cliente; ahora cualquiera puede registrarse
// (nivel 1) y la verificación la hace el servidor.
export default function Login() {
  /*
   * `?crear=1` ABRE DIRECTAMENTE «CREAR CUENTA» (2026-08-23).
   *
   * La portada de quien no tiene cuenta tiene UN botón y dice «Crear cuenta».
   * Sin esto lo llevaba al formulario de ENTRAR, con su correo y su contraseña
   * pidiéndole algo que todavía no tiene, y un enlace pequeño abajo para
   * corregir el error de la pantalla anterior. Un botón que promete una cosa y
   * abre otra es lo que enseña a no leer los botones.
   *
   * Se lee una sola vez, al montar: si se leyera en cada render, cambiar a
   * «Entrar» con el enlace de abajo volvería a saltar a «Crear cuenta» y la
   * pantalla se quedaría atascada en lo que dice la dirección.
   */
  const [mode, setMode] = useState<Mode>(
    () => (new URLSearchParams(window.location.search).get('crear') === '1' ? 'register' : 'login'),
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, register, refresh } = useAuth();
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // Login con Google (Fase 13): si el servidor tiene GOOGLE_CLIENT_ID
  // configurado, se carga Google Identity Services y se muestra el botón.
  // El ID token que devuelve Google se valida SIEMPRE en el servidor.
  // ---------------------------------------------------------------------------
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/config').then(r => r.json())
      .then(j => setGoogleClientId(j.googleClientId || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!googleClientId) return;
    const init = () => {
      const g = (window as any).google;
      if (!g?.accounts?.id || !googleBtnRef.current) return;
      g.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (resp: any) => {
          setBusy(true);
          setError('');
          try {
            const res = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ credential: resp.credential }),
            });
            const json = await res.json();
            if (res.ok) { await refresh(); navigate('/'); }
            else setError(json.error || 'No se pudo iniciar sesión con Google.');
          } finally {
            setBusy(false);
          }
        },
      });
      g.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline', size: 'large', width: 320, text: 'continue_with', locale: 'es',
      });
    };
    if ((window as any).google?.accounts?.id) { init(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = init;
    document.head.appendChild(s);
  }, [googleClientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const r = await login(email, password);
        if (r.ok) navigate('/'); else setError(r.error || 'No se pudo iniciar sesión.');
      } else if (mode === 'register') {
        const r = await register(email, password, name);
        if (r.ok) navigate('/'); else setError(r.error || 'No se pudo crear la cuenta.');
      } else {
        const res = await fetch('/api/auth/password/forgot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const json = await res.json();
        setInfo(json.message || 'Si existe una cuenta con ese email, recibirás instrucciones.');
        // Todavía no hay proveedor de correo configurado, así que en
        // desarrollo el servidor devuelve el enlace para poder probarlo.
        if (json.dev_token) {
          setInfo(`${json.message}\n\nAún no hay servicio de correo configurado. Enlace de prueba: /restablecer?token=${json.dev_token}`);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Mode, string> = {
    login: 'Iniciar sesión',
    register: 'Crear cuenta',
    forgot: 'Recuperar contraseña',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-300">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">RH</div>
          <h2 className="text-2xl font-light tracking-tighter italic">{titles[mode]}</h2>
          <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest">Humanity.wiki</p>
        </div>

        {googleClientId && mode !== 'forgot' && (
          <div className="mb-6">
            <div ref={googleBtnRef} className="flex justify-center" />
            <div className="flex items-center gap-3 mt-6">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">o con tu email</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'register' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:bg-white transition-all"
                placeholder="Tu nombre"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:bg-white transition-all"
              placeholder="tu@email.com"
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:bg-white transition-all"
                placeholder="••••••••••••"
                required
                minLength={mode === 'register' ? 8 : undefined}
              />
              {mode === 'register' && (
                <p className="text-[10px] text-slate-400 mt-1.5">Mínimo 8 caracteres.</p>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded text-center">{error}</p>}
          {info && <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded whitespace-pre-line break-all">{info}</p>}

          <Button type="submit" className="w-full py-3" disabled={busy}>
            {busy ? 'Un momento…' : titles[mode]}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center gap-3">
          {mode === 'login' && (
            <div className="w-full flex flex-col items-center gap-1.5 px-4 py-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
              <p className="text-xs text-slate-600">¿Todavía no tienes cuenta?</p>
              <button
                onClick={() => { setMode('register'); setError(''); setInfo(''); }}
                className="text-sm font-black text-emerald-700 hover:text-emerald-800 transition-colors"
              >
                Crear una cuenta →
              </button>
            </div>
          )}

          {mode !== 'login' && (
            <button onClick={() => { setMode('login'); setError(''); setInfo(''); }} className="text-xs font-bold text-slate-500 hover:text-emerald-600 uppercase tracking-widest">
              Ya tengo cuenta
            </button>
          )}

          {mode !== 'forgot' && (
            <button onClick={() => { setMode('forgot'); setError(''); setInfo(''); }} className="text-[11px] font-medium text-slate-400 hover:text-emerald-600 text-center">
              He olvidado mi contraseña
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { Card, Button } from '../components/ui/core';

// Página de restablecimiento de contraseña. El enlace llega con el token en
// la URL (?token=…), sea del flujo «he olvidado mi contraseña» o de un enlace
// generado por un administrador desde /admin/usuarios. Login.tsx llevaba
// tiempo enlazando aquí, pero la página no existía hasta 2026-08-08.
export default function Restablecer() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [repite, setRepite] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [hecho, setHecho] = useState(false);
  const navigate = useNavigate();

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== repite) return setError('Las dos contraseñas no coinciden.');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const json = await res.json();
      if (!res.ok) return setError(json.error || 'No se ha podido restablecer.');
      setHecho(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center px-5 py-16">
      <Card className="w-full max-w-sm p-7">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <KeyRound className="w-4.5 h-4.5" />
          </div>
          <h1 className="text-lg font-black text-slate-900">Nueva contraseña</h1>
        </div>

        {!token ? (
          <p className="text-sm text-slate-500">
            Falta el token del enlace. Pide uno nuevo desde{' '}
            <Link to="/login" className="text-emerald-700 font-bold hover:underline">la página de acceso</Link>.
          </p>
        ) : hecho ? (
          <p className="text-sm text-emerald-700 font-bold">
            Contraseña cambiada. Te llevamos a iniciar sesión…
          </p>
        ) : (
          <form onSubmit={enviar} className="space-y-3">
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Nueva contraseña (mínimo 8)" autoFocus
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300"
            />
            <input
              type="password" value={repite} onChange={e => setRepite(e.target.value)}
              placeholder="Repítela"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300"
            />
            {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Guardando…' : 'Cambiar la contraseña'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

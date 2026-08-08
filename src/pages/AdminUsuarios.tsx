import { useEffect, useState } from 'react';
import { Users2, Coins, KeyRound, Check, Copy, ShieldAlert, Trash2, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

// ============================================================================
// ADMINISTRACIÓN DE USUARIOS (2026-08-08, petición del usuario)
// ============================================================================
// «Una página que solo puedan ver los ADMINS que sea de usuarios registrados
// y que desde ahí se pueda dar puntos a los usuarios y se puedan reiniciar
// contraseñas, etc.»
//
// El listado y el cambio de rol ya existían en el backend desde la Fase de
// auth (`GET /api/admin/users`, `PUT /api/admin/users/:id/role`); lo nuevo de
// hoy son los puntos (`POST /api/admin/users/:id/puntos`) y el enlace de
// restablecimiento (`POST /api/admin/users/:id/reset-link`), que se copia y
// se entrega al usuario a mano porque todavía no hay proveedor de correo.

const ROLES: Record<number, string> = {
  0: 'Visitante', 1: 'Usuario', 2: 'Verificado', 3: 'Conocimiento', 4: 'Administrador',
};

interface Usuario {
  id: string; email: string; name: string | null; display_name: string | null;
  role_level: number; puntos: string; last_login_at: string | null;
  created_at: string; archived_at: string | null;
}

export default function AdminUsuarios() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  // Cantidad de puntos escrita por fila, antes de confirmar.
  const [puntosEdit, setPuntosEdit] = useState<Record<string, string>>({});
  const [enlaceCopiado, setEnlaceCopiado] = useState<string | null>(null);

  const cargar = () =>
    fetch('/api/admin/users', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setUsuarios(Array.isArray(j) ? j : []))
      .catch(() => setUsuarios([]))
      .finally(() => setCargando(false));

  useEffect(() => { if (user?.isAdmin) cargar(); else setCargando(false); }, [user]);

  const avisar = (texto: string) => { setAviso(texto); setTimeout(() => setAviso(null), 4000); };

  const cambiarRol = async (u: Usuario, nivel: number) => {
    const r = await fetch(`/api/admin/users/${u.id}/role`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_level: nivel }),
    });
    const j = await r.json();
    if (!r.ok) return avisar(j.error || 'No se ha podido cambiar el rol.');
    avisar(`${u.email} ahora es ${ROLES[nivel]}.`);
    cargar();
  };

  const darPuntos = async (u: Usuario) => {
    const cantidad = Number((puntosEdit[u.id] || '').replace(',', '.'));
    if (!Number.isFinite(cantidad) || cantidad === 0) return avisar('Escribe una cantidad (negativa para quitar).');
    const r = await fetch(`/api/admin/users/${u.id}/puntos`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidad }),
    });
    const j = await r.json();
    if (!r.ok) return avisar(j.error || 'No se han podido mover los puntos.');
    avisar(`${cantidad > 0 ? '+' : ''}${cantidad} puntos a ${u.email} (saldo: ${j.puntos.toFixed(2)}).`);
    setPuntosEdit(p => ({ ...p, [u.id]: '' }));
    cargar();
  };

  const borrar = async (u: Usuario) => {
    if (!confirm(`¿Borrar a ${u.email}?\n\nNo podrá volver a entrar y sus sesiones se cierran ahora mismo. Lo que publicó NO se destruye, y podrás restaurarlo desde esta misma página.`)) return;
    const r = await fetch(`/api/admin/users/${u.id}/archivar`, { method: 'POST', credentials: 'include' });
    const j = await r.json();
    if (!r.ok) return avisar(j.error || 'No se ha podido borrar.');
    avisar(`${u.email} borrado. Puedes restaurarlo cuando quieras.`);
    cargar();
  };

  const restaurar = async (u: Usuario) => {
    const r = await fetch(`/api/admin/users/${u.id}/restaurar`, { method: 'POST', credentials: 'include' });
    const j = await r.json();
    if (!r.ok) return avisar(j.error || 'No se ha podido restaurar.');
    avisar(`${u.email} restaurado: ya puede volver a entrar.`);
    cargar();
  };

  const generarEnlace = async (u: Usuario) => {
    const r = await fetch(`/api/admin/users/${u.id}/reset-link`, { method: 'POST', credentials: 'include' });
    const j = await r.json();
    if (!r.ok) return avisar(j.error || 'No se ha podido generar el enlace.');
    const url = `${window.location.origin}${j.url}`;
    try { await navigator.clipboard.writeText(url); } catch { /* sin permiso: se muestra igualmente */ }
    setEnlaceCopiado(u.id);
    setTimeout(() => setEnlaceCopiado(null), 4000);
    avisar(`Enlace copiado (caduca en ${j.caduca_horas} h): ${url}`);
  };

  if (!user?.isAdmin) {
    return (
      <div className="h-full flex items-center justify-center px-5">
        <div className="text-center">
          <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Esta página es solo para administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-5 sm:px-8 pt-8 pb-24">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 mb-2 inline-flex items-center gap-1.5">
          <Users2 className="w-3 h-3" /> Administración
        </p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Usuarios registrados</h1>
        <p className="text-sm text-slate-500 mt-2">
          Cambia roles, regala o retira puntos y genera enlaces para restablecer contraseñas.
          El enlace se copia al portapapeles: entrégaselo al usuario por el canal que uses con él.
        </p>

        {aviso && (
          <div className="mt-4 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold break-all">
            {aviso}
          </div>
        )}

        {cargando ? (
          <p className="text-sm text-slate-400 text-center py-24">Cargando usuarios…</p>
        ) : (
          <div className="mt-6 space-y-2.5">
            {usuarios.map(u => (
              <div key={u.id} className={cn('bg-white border border-slate-200 rounded-2xl px-4 py-3.5', u.archived_at && 'opacity-50')}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-900 truncate">
                      {u.display_name || u.name || u.email}
                      {u.id === user.id && <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-2">Tú</span>}
                      {u.archived_at && <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded ml-2">Archivado</span>}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 shrink-0" title="Saldo de puntos">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    {Number(u.puntos).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </div>

                  <select
                    value={u.role_level}
                    onChange={e => cambiarRol(u, Number(e.target.value))}
                    disabled={u.id === user.id}
                    title={u.id === user.id ? 'No puedes cambiar tu propio nivel' : 'Cambiar rol'}
                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-emerald-300 disabled:opacity-50 shrink-0"
                  >
                    {Object.entries(ROLES).map(([n, label]) => (
                      <option key={n} value={n}>{label}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      value={puntosEdit[u.id] || ''}
                      onChange={e => setPuntosEdit(p => ({ ...p, [u.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') darPuntos(u); }}
                      placeholder="±puntos"
                      className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300"
                    />
                    <button
                      onClick={() => darPuntos(u)}
                      title="Aplicar puntos (positivo da, negativo quita)"
                      className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => generarEnlace(u)}
                    title="Generar enlace para restablecer su contraseña"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors shrink-0"
                  >
                    {enlaceCopiado === u.id ? <Copy className="w-3.5 h-3.5 text-emerald-600" /> : <KeyRound className="w-3.5 h-3.5" />}
                    {enlaceCopiado === u.id ? 'Copiado' : 'Contraseña'}
                  </button>

                  {u.archived_at ? (
                    <button
                      onClick={() => restaurar(u)}
                      title="Restaurar: podrá volver a entrar"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold transition-colors shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                    </button>
                  ) : (
                    <button
                      onClick={() => borrar(u)}
                      disabled={u.id === user.id}
                      title={u.id === user.id ? 'No puedes borrarte a ti mismo' : 'Borrar: no podrá volver a entrar (restaurable)'}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:text-slate-300 disabled:hover:bg-transparent shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ============================================================================
// AuthContext — Fase 2
// ============================================================================
// Sustituye a la versión anterior, que comparaba email y contraseña
// literalmente EN EL CÓDIGO DEL CLIENTE y guardaba la sesión en localStorage.
// Eso significaba que las credenciales de administrador eran visibles para
// cualquiera que abriese las herramientas de desarrollo, y que bastaba editar
// localStorage para hacerse administrador.
//
// Ahora la autenticación ocurre en el servidor (`src/server/auth.ts`): la
// contraseña se verifica contra un hash scrypt y la sesión vive en una cookie
// httpOnly que el JavaScript de la página no puede leer ni falsificar.

export const ROLE = {
  VISITOR: 0,
  USER: 1,
  VERIFIED: 2,
  KNOWLEDGE: 3,
  ADMIN: 4,
} as const;

export interface AuthUser {
  id: string;
  uuid: string;
  email: string;
  name: string | null;
  displayName: string | null;
  roleLevel: number;
  roleLabel: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  socials: Record<string, string>;
  specialties: string[];
  organizationId: string | null;
  reputation: number;
  impactScore: number;
  isAdmin: boolean;
  uiSettings: Record<string, any>;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  /** Nivel de rol efectivo: 0 si no hay sesión. */
  level: number;
  /** ¿El usuario alcanza al menos este nivel? */
  can: (minLevel: number) => boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Record<string, any>) => Promise<{ ok: boolean; error?: string }>;
  /** Fusión superficial (jsonb `||`) sobre user.uiSettings — no toca el resto del perfil. */
  updateUiSettings: (patch: Record<string, any>) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // La sesión la determina siempre el servidor a partir de la cookie: el
  // cliente nunca decide quién es ni qué nivel tiene.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const json = await res.json();
      setUser(json.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Limpieza puntual: la versión anterior guardaba aquí un usuario falso
    // que podía editarse a mano para simular ser administrador.
    try { localStorage.removeItem('evo_auth_user'); } catch { /* ignorado */ }
    refresh();
  }, [refresh]);

  const login: AuthContextType['login'] = async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error || 'No se pudo iniciar sesión.' };
      setUser(json.user);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Error de red.' };
    }
  };

  const register: AuthContextType['register'] = async (email, password, name) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name }),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error || 'No se pudo crear la cuenta.' };
      setUser(json.user);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Error de red.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* la sesión se limpia igualmente en el cliente */ }
    setUser(null);
  };

  const updateProfile: AuthContextType['updateProfile'] = async (data) => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error || 'No se pudo guardar el perfil.' };
      setUser(json.user);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Error de red.' };
    }
  };

  // Sin sesión, no hay dónde grabar la preferencia en el servidor: el hook
  // que la usa (usePanelWidth) cae a localStorage por su cuenta.
  const updateUiSettings: AuthContextType['updateUiSettings'] = async (patch) => {
    if (!user) return;
    try {
      const res = await fetch('/api/auth/ui-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (res.ok && json.user) setUser(json.user);
    } catch { /* la próxima vez que ajuste el panel se reintenta */ }
  };

  const level = user?.roleLevel ?? ROLE.VISITOR;
  const can = (minLevel: number) => level >= minLevel;

  return (
    <AuthContext.Provider value={{ user, loading, level, can, login, register, logout, updateProfile, updateUiSettings, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

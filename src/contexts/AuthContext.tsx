import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: { email: string; isAdmin: boolean } | null;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<{ email: string; isAdmin: boolean } | null>(() => {
    try {
      const saved = localStorage.getItem('evo_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = (email: string, pass: string) => {
    // Hardcoded credentials for MVP
    if (email === 'eugenio@lighthumanity.org' && pass === 'AdminEvo2026!') {
      const newUser = { email, isAdmin: true };
      setUser(newUser);
      localStorage.setItem('evo_auth_user', JSON.stringify(newUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('evo_auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

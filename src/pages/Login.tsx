import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button } from '../components/ui/core';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      navigate('/');
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-300">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">EVO</div>
          <h2 className="text-2xl font-light tracking-tighter italic">Acceso Administrador</h2>
          <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest">Plataforma Evolución Humana</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:bg-white transition-all"
              placeholder="eugenio@lighthumanity.org"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:bg-white transition-all"
              placeholder="••••••••••••"
              required
            />
          </div>

          {error && <p className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded text-center">{error}</p>}

          <Button type="submit" className="w-full py-3">Iniciar Sesión</Button>
        </form>
      </Card>
    </div>
  );
}

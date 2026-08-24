import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, Plus, Loader2, MessagesSquare, Lock, Search, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button } from '../components/ui/core';
import { cn } from '../utils/cn';

// ============================================================================
// LOS DEBATES (2026-08-22, fase 4 de memory/13_VERACIDAD.md)
// ============================================================================
// La portada del área: lo que se está discutiendo, y la puerta para abrir algo
// nuevo. Los principios y el tablero viven en `/veracidad`; aquí se argumenta.
//
// ABRIR UN DEBATE ES NIVEL 1, el mismo que publicar. Una tesis no afirma nada
// sobre el común: pregunta. Lo que cuesta equivocarse aquí es un argumento en
// contra, que es justamente para lo que está hecho esto.

interface Debate {
  id: string; slug: string; tesis: string; contexto: string | null;
  estado: 'abierto' | 'cerrado';
  territory_id: string | null; territorio_nombre: string | null;
  autor_nombre: string | null; created_at: string;
  total_argumentos: number | string;
}

export default function Debates() {
  const { user } = useAuth();
  const [lista, setLista] = useState<Debate[] | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [abriendo, setAbriendo] = useState(false);
  const [tesis, setTesis] = useState('');
  const [contexto, setContexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recienCreado, setRecienCreado] = useState<string | null>(null);

  // `null` mientras carga: «no hay debates» y «todavía no lo sé» no pueden
  // pintarse igual (regla de la casa, src/server/CLAUDE.md).
  const cargar = (q?: string) => {
    setLista(null);
    return fetch(`/api/debates${q ? `?q=${encodeURIComponent(q)}` : ''}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => setLista(Array.isArray(j) ? j : []))
      .catch(() => setLista([]));
  };

  useEffect(() => { cargar(); }, []);

  const abrir = async () => {
    if (tesis.trim().length < 10) {
      setError('La tesis tiene que ser una frase que se pueda afirmar o negar.');
      return;
    }
    setGuardando(true); setError(null);
    try {
      const r = await fetch('/api/debates', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tesis: tesis.trim(), contexto: contexto.trim() || null }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'No se ha podido abrir el debate.');
      // El id que devuelve el servidor, no el que suponemos: si no vuelve
      // ninguno, no se enseña nada creado. Success is decided by the data.
      setRecienCreado(j.slug);
      setTesis(''); setContexto(''); setAbriendo(false);
      await cargar();
    } catch (e: any) { setError(e.message); } finally { setGuardando(false); }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 grid place-items-center shrink-0">
              <Scale className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">Debates</h1>
              <p className="text-sm text-slate-500">
                Una afirmación, sus razones a favor y en contra, y las fuentes de cada una.{' '}
                <Link to="/veracidad" className="font-bold text-purple-700 hover:underline inline-flex items-center gap-0.5">
                  Cómo funciona <ArrowUpRight className="w-3 h-3" />
                </Link>
              </p>
            </div>
          </div>
          {user && !abriendo && (
            <Button onClick={() => setAbriendo(true)} className="shrink-0">
              <Plus className="w-4 h-4 mr-1.5 inline" /> Abrir un debate
            </Button>
          )}
        </div>

        {recienCreado && (
          <Card className="p-3 mb-4 border-emerald-200 bg-emerald-50">
            <p className="text-sm font-bold text-emerald-800">
              Debate abierto.{' '}
              <Link to={`/debates/${recienCreado}`} className="underline">Ábrelo y escribe el primer argumento</Link>.
            </p>
          </Card>
        )}

        {abriendo && (
          <Card className="p-4 mb-5">
            <p className="text-sm font-black text-slate-800 mb-1">Abrir un debate</p>
            {/* LA TESIS TIENE QUE PODER NEGARSE. Es la única regla que decide si
                esto va a generar un debate o un hilo de comentarios. */}
            <p className="text-xs text-slate-500 mb-2.5">
              Escribe una <strong>afirmación</strong>, no una pregunta ni un tema. Si no se puede
              estar en contra de ella, no es una tesis.
            </p>
            <input
              value={tesis} onChange={e => setTesis(e.target.value)}
              placeholder="La energía nuclear es la vía más rápida para descarbonizar España"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm mb-2 focus:outline-none focus:border-purple-300"
            />
            <textarea
              value={contexto} onChange={e => setContexto(e.target.value)} rows={3}
              placeholder="Contexto: qué hay que saber antes de argumentar — definiciones, alcance, fechas. Sin esto, media discusión se va en aclarar qué querías decir."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm mb-2 resize-y focus:outline-none focus:border-purple-300"
            />
            {error && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-1.5 mb-2">{error}</p>}
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => { setAbriendo(false); setError(null); }}>Cancelar</Button>
              <Button onClick={abrir} disabled={guardando || tesis.trim().length < 10}>
                {guardando ? <Loader2 className="w-4 h-4 mr-1.5 inline animate-spin" /> : <Plus className="w-4 h-4 mr-1.5 inline" />}
                Abrir
              </Button>
            </div>
          </Card>
        )}

        {!user && (
          <Card className="p-4 mb-5">
            <p className="text-sm text-slate-500">
              <Link to="/login" className="font-bold text-purple-700 hover:underline">Inicia sesión</Link>{' '}
              para abrir un debate o argumentar. Leer no hace falta cuenta.
            </p>
          </Card>
        )}

        <div className="relative mb-4">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') cargar(busqueda.trim() || undefined); }}
            placeholder="Buscar en las tesis…"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-purple-300"
          />
        </div>

        {lista === null ? (
          <p className="text-sm text-slate-400 text-center py-16">Cargando…</p>
        ) : lista.length === 0 ? (
          <Card className="p-8 text-center">
            <MessagesSquare className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">
              {busqueda ? 'Ninguna tesis dice eso.' : 'Todavía no hay ningún debate.'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {busqueda ? 'Prueba con otras palabras.' : 'El primero puede ser el tuyo.'}
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {lista.map(d => (
              <li key={d.id}>
                <Link to={`/debates/${d.slug}`} className="block">
                  <Card className={cn('p-4 transition-colors hover:border-purple-300',
                    d.estado === 'cerrado' && 'bg-slate-50')}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-black text-slate-800 leading-snug">{d.tesis}</p>
                      {d.estado === 'cerrado' && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                          <Lock className="w-3 h-3" /> Cerrado
                        </span>
                      )}
                    </div>
                    {d.contexto && (
                      <p className="text-xs text-slate-500 leading-snug mt-1 line-clamp-2">{d.contexto}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-2">
                      {Number(d.total_argumentos)} {Number(d.total_argumentos) === 1 ? 'argumento' : 'argumentos'}
                      {' · '}{d.autor_nombre || 'Alguien'}
                      {/* Sin territorio NO es un territorio que falte: es un
                          debate que no es de ningún sitio. Se dice. */}
                      {' · '}{d.territorio_nombre || 'Global'}
                    </p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

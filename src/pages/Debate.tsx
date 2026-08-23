import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, ThumbsUp, ThumbsDown, Scale, Plus, Loader2, Quote, Lock,
  ChevronDown, ChevronRight, ExternalLink, BadgeCheck, Trash2,
} from 'lucide-react';
import { useAuth, ROLE } from '../contexts/AuthContext';
import { Card, Button } from '../components/ui/core';
import SelloVeracidad from '../components/ui/SelloVeracidad';
import { cn } from '../utils/cn';

// ============================================================================
// UN DEBATE (2026-08-22, fases 2 y 4 de memory/13_VERACIDAD.md)
// ============================================================================
// La tesis arriba, y debajo dos columnas: lo que la sostiene y lo que la tumba.
// Cada argumento se puede responder, y su respuesta vuelve a tener dos lados.
//
// EL ÁRBOL LO ARMA EL SERVIDOR, no esta pantalla: «este argumento cuelga de
// aquel» se decide una vez, en el lado que tiene los datos. Aquí solo se pinta
// lo que llega ya anidado.
//
// SE RECARGA EL ÁRBOL ENTERO DESPUÉS DE CADA ESCRITURA, en vez de coser la
// respuesta nueva en el sitio. Es una petición de más por argumento escrito, y
// a cambio la pantalla nunca enseña un árbol que la base de datos no tenga —
// que es el fallo que no se ve hasta que alguien discute sobre algo que no
// existe. Cuando un debate llegue a cientos de argumentos, esto se cambia por
// la carga por tramos de la fase 3, y hasta entonces no vale la pena.

interface Fuente {
  id: string; titulo: string; url: string | null; autor: string | null;
  publicado_en: string | null; tipo: string; cita: string | null;
  autor_user_id: string | null;
}

interface Argumento {
  id: string; parent_id: string | null; postura: 'a_favor' | 'en_contra' | 'matiza';
  texto: string; profundidad: number;
  veracidad: string; veracidad_por: string | null; veracidad_motivo: string | null;
  impacto: number | null; votos: number; mi_voto: number | null;
  autor_user_id: string | null; autor_nombre: string | null;
  created_at: string;
  fuentes: Fuente[]; hijos: Argumento[];
}

interface DebateCompleto {
  id: string; slug: string; tesis: string; contexto: string | null;
  estado: 'abierto' | 'cerrado'; territorio_nombre: string | null;
  autor_user_id: string | null; autor_nombre: string | null;
  fuentes: Fuente[]; argumentos: Argumento[];
  total_argumentos: number; a_favor: number; en_contra: number;
}

/** Los mismos tres colores que el grafo usa para apoya / contradice / matiza. */
const POSTURA = {
  a_favor: { label: 'A favor', icono: ThumbsUp, borde: 'border-l-emerald-400', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  en_contra: { label: 'En contra', icono: ThumbsDown, borde: 'border-l-rose-400', chip: 'bg-rose-50 text-rose-700 border-rose-200' },
  matiza: { label: 'Matiza', icono: Scale, borde: 'border-l-amber-400', chip: 'bg-amber-50 text-amber-800 border-amber-200' },
} as const;

const TIPOS_FUENTE = ['estudio', 'informe', 'noticia', 'dato', 'documento', 'observacion', 'otra'] as const;

export default function Debate() {
  const { slug } = useParams();
  const { user, can } = useAuth();
  const revisor = can(ROLE.KNOWLEDGE);
  const [d, setD] = useState<DebateCompleto | null | 'no-existe'>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`/api/debates/${slug}`, { credentials: 'include' });
      if (r.status === 404) { setD('no-existe'); return; }
      setD(await r.json());
    } catch { setError('No se ha podido cargar el debate.'); }
  }, [slug]);

  useEffect(() => { cargar(); }, [cargar]);

  if (d === 'no-existe') {
    return (
      <div className="h-full overflow-y-auto bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-lg font-black text-slate-800">Ese debate no existe.</p>
          <p className="text-sm text-slate-500 mt-1">
            Puede que se haya retirado, o que la dirección esté mal escrita.
          </p>
          <Link to="/debates" className="inline-block mt-4 text-sm font-bold text-purple-700 hover:underline">
            Ver todos los debates
          </Link>
        </div>
      </div>
    );
  }

  if (!d) {
    return <p className="text-sm text-slate-400 text-center py-24">Cargando el debate…</p>;
  }

  const cerrado = d.estado === 'cerrado';

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

        <Link to="/debates" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Debates
        </Link>

        {/* ── LA TESIS ────────────────────────────────────────────────────── */}
        <Card className="p-4 sm:p-5 border-purple-200">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">{d.tesis}</h1>
            {cerrado && (
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                <Lock className="w-3 h-3" /> Cerrado
              </span>
            )}
          </div>
          {d.contexto && <p className="text-sm text-slate-600 leading-relaxed mt-2">{d.contexto}</p>}
          <p className="text-[10px] text-slate-400 mt-2">
            {d.autor_nombre || 'Alguien'} · {d.territorio_nombre || 'Global'} ·{' '}
            {d.total_argumentos} {d.total_argumentos === 1 ? 'argumento' : 'argumentos'}
            {' · '}{d.a_favor} a favor, {d.en_contra} en contra
          </p>
          <Fuentes lista={d.fuentes} />
          {user && (
            <CitarFuente entidadTipo="debate" entidadId={d.id} onHecho={cargar} />
          )}
        </Card>

        {cerrado && (
          <p className="text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 mt-3">
            Este debate está cerrado: se puede leer, no argumentar. Lo que se argumentó
            sigue aquí — cerrar retrata en qué punto quedó, no borra al lado que perdió.
          </p>
        )}

        {/* ── LOS DOS LADOS ───────────────────────────────────────────────── */}
        {!cerrado && user && (
          <div className="mt-4">
            <Responder debateId={d.id} parentId={null} onHecho={cargar} />
          </div>
        )}
        {!user && (
          <p className="text-sm text-slate-500 mt-4">
            <Link to="/login" className="font-bold text-purple-700 hover:underline">Inicia sesión</Link>{' '}
            para argumentar. Leer no hace falta cuenta.
          </p>
        )}

        {error && <p className="text-xs text-rose-700 mt-3">{error}</p>}

        {d.argumentos.length === 0 ? (
          <Card className="p-8 text-center mt-4">
            <p className="text-sm font-bold text-slate-600">Nadie ha argumentado todavía.</p>
            <p className="text-xs text-slate-400 mt-1">
              Una tesis sin argumentos no es un debate: es una opinión con sitio reservado.
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <Columna
              titulo="A favor" postura="a_favor"
              lista={d.argumentos.filter(a => a.postura === 'a_favor')}
              debateId={d.id} cerrado={cerrado} revisor={revisor} user={user} onHecho={cargar}
            />
            <Columna
              titulo="En contra" postura="en_contra"
              lista={d.argumentos.filter(a => a.postura === 'en_contra')}
              debateId={d.id} cerrado={cerrado} revisor={revisor} user={user} onHecho={cargar}
            />
            {d.argumentos.some(a => a.postura === 'matiza') && (
              <div className="md:col-span-2">
                <Columna
                  titulo="Matiza" postura="matiza"
                  lista={d.argumentos.filter(a => a.postura === 'matiza')}
                  debateId={d.id} cerrado={cerrado} revisor={revisor} user={user} onHecho={cargar}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Columna({ titulo, postura, lista, debateId, cerrado, revisor, user, onHecho }: {
  titulo: string; postura: keyof typeof POSTURA; lista: Argumento[];
  debateId: string; cerrado: boolean; revisor: boolean; user: any; onHecho: () => void;
}) {
  const P = POSTURA[postura];
  return (
    <div>
      <p className={cn('inline-flex items-center gap-1.5 text-[11px] font-black rounded-full border px-2.5 py-1 mb-2', P.chip)}>
        <P.icono className="w-3.5 h-3.5" /> {titulo} <span className="opacity-60">{lista.length}</span>
      </p>
      {lista.length === 0 ? (
        <p className="text-xs text-slate-400 italic px-1">Nadie ha argumentado por aquí.</p>
      ) : (
        <ul className="space-y-2">
          {lista.map(a => (
            <li key={a.id}>
              <Nodo a={a} debateId={debateId} cerrado={cerrado} revisor={revisor} user={user} onHecho={onHecho} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Nodo({ a, debateId, cerrado, revisor, user, onHecho }: {
  a: Argumento; debateId: string; cerrado: boolean; revisor: boolean; user: any; onHecho: () => void;
}) {
  const P = POSTURA[a.postura];
  const [abierto, setAbierto] = useState(a.profundidad <= 2);
  const [respondiendo, setRespondiendo] = useState(false);
  const [citando, setCitando] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const propio = !!user && user.id === a.autor_user_id;

  return (
    <Card className={cn('p-3 border-l-4', P.borde)}>
      <p className="text-sm text-slate-800 leading-snug whitespace-pre-wrap">{a.texto}</p>

      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <SelloVeracidad
          estado={a.veracidad} por={a.veracidad_por} motivo={a.veracidad_motivo}
          fuentes={a.fuentes.length} compacto
        />
        <span className="text-[10px] text-slate-400">· {a.autor_nombre || 'Alguien'}</span>
      </div>

      <Votar a={a} puedeVotar={!!user && !cerrado} onHecho={onHecho} />

      <Fuentes lista={a.fuentes} />

      <div className="flex flex-wrap items-center gap-2 mt-2">
        {!cerrado && user && (
          <button onClick={() => setRespondiendo(o => !o)}
            className="text-[11px] font-bold text-slate-500 hover:text-purple-700">
            Responder
          </button>
        )}
        {user && (
          <button onClick={() => setCitando(o => !o)}
            className="text-[11px] font-bold text-slate-500 hover:text-purple-700 inline-flex items-center gap-1">
            <Quote className="w-3 h-3" /> Citar
          </button>
        )}
        {/* REVISAR NO ES EDITAR, y no puedes revisar lo tuyo: firmar tu propio
            argumento como verificado no es una revisión. El servidor también lo
            impide; esconder el botón solo evita el intento. */}
        {revisor && !propio && (
          <button onClick={() => setRevisando(o => !o)}
            className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1">
            <BadgeCheck className="w-3 h-3" /> Revisar
          </button>
        )}
        {a.hijos.length > 0 && (
          <button onClick={() => setAbierto(o => !o)}
            className="ml-auto text-[11px] font-bold text-slate-500 hover:text-slate-800 inline-flex items-center gap-0.5">
            {abierto ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {a.hijos.length} {a.hijos.length === 1 ? 'respuesta' : 'respuestas'}
          </button>
        )}
      </div>

      {respondiendo && (
        <div className="mt-2">
          <Responder debateId={debateId} parentId={a.id}
            onHecho={() => { setRespondiendo(false); onHecho(); }} />
        </div>
      )}
      {citando && (
        <CitarFuente entidadTipo="argumento" entidadId={a.id}
          onHecho={() => { setCitando(false); onHecho(); }} />
      )}
      {revisando && (
        <Revisar argumentoId={a.id} actual={a.veracidad}
          onHecho={() => { setRevisando(false); onHecho(); }} />
      )}

      {abierto && a.hijos.length > 0 && (
        <ul className="mt-2 space-y-2 pl-2 border-l border-slate-100">
          {a.hijos.map(h => (
            <li key={h.id}>
              <Nodo a={h} debateId={debateId} cerrado={cerrado} revisor={revisor} user={user} onHecho={onHecho} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Fuentes({ lista }: { lista: Fuente[] }) {
  if (!lista?.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {lista.map(f => (
        <li key={f.id} className="text-[11px] text-slate-500 leading-snug">
          <Quote className="w-3 h-3 inline text-slate-300 mr-1" />
          {f.url ? (
            <a href={f.url} target="_blank" rel="noreferrer"
              className="font-bold text-slate-600 hover:text-purple-700 underline decoration-slate-200">
              {f.titulo} <ExternalLink className="w-2.5 h-2.5 inline" />
            </a>
          ) : <span className="font-bold text-slate-600">{f.titulo}</span>}
          <span className="text-slate-400"> · {f.tipo}</span>
          {f.cita && <span className="block pl-4 italic text-slate-400">«{f.cita}»</span>}
        </li>
      ))}
    </ul>
  );
}

function Responder({ debateId, parentId, onHecho }: {
  debateId: string; parentId: string | null; onHecho: () => void;
}) {
  const [postura, setPostura] = useState<'a_favor' | 'en_contra' | 'matiza' | null>(null);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    // No se elige por ti: sin postura no se manda nada. Coger la primera de la
    // lista sería inventar un dato con pinta de correcto.
    if (!postura) { setError('Elige si estás a favor, en contra, o si matizas.'); return; }
    setGuardando(true); setError(null);
    try {
      const r = await fetch(`/api/debates/${debateId}/argumentos`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postura, texto: texto.trim(), parentId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'No se ha podido guardar.');
      setTexto(''); setPostura(null);
      onHecho();
    } catch (e: any) { setError(e.message); } finally { setGuardando(false); }
  };

  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {(['a_favor', 'en_contra', 'matiza'] as const).map(p => {
          const P = POSTURA[p];
          return (
            <button key={p} onClick={() => setPostura(p)}
              className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors',
                postura === p ? P.chip : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
              <P.icono className="w-3.5 h-3.5" /> {P.label}
            </button>
          );
        })}
      </div>
      <textarea
        value={texto} onChange={e => setTexto(e.target.value)} rows={2}
        placeholder={parentId ? 'Responde a este argumento…' : 'Un argumento, uno solo. Si tienes dos, escríbelos por separado: así se puede responder a cada uno.'}
        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-y focus:outline-none focus:border-purple-300"
      />
      {error && <p className="text-xs text-rose-700 mt-1.5">{error}</p>}
      <div className="flex justify-end mt-2">
        <Button onClick={enviar} disabled={guardando || texto.trim().length < 3}>
          {guardando ? <Loader2 className="w-4 h-4 mr-1.5 inline animate-spin" /> : <Plus className="w-4 h-4 mr-1.5 inline" />}
          Argumentar
        </Button>
      </div>
    </Card>
  );
}

function CitarFuente({ entidadTipo, entidadId, onHecho }: {
  entidadTipo: 'debate' | 'argumento'; entidadId: string; onHecho: () => void;
}) {
  const [abierto, setAbierto] = useState(entidadTipo === 'argumento');
  const [titulo, setTitulo] = useState('');
  const [url, setUrl] = useState('');
  const [cita, setCita] = useState('');
  const [tipo, setTipo] = useState<string>('documento');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    setGuardando(true); setError(null);
    try {
      const r = await fetch('/api/veracidad/fuentes', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entidadTipo, entidadId, titulo: titulo.trim(), url: url.trim() || null, cita: cita.trim() || null, tipo }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'No se ha podido guardar la fuente.');
      setTitulo(''); setUrl(''); setCita('');
      onHecho();
    } catch (e: any) { setError(e.message); } finally { setGuardando(false); }
  };

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)}
        className="mt-2 text-[11px] font-bold text-slate-500 hover:text-purple-700 inline-flex items-center gap-1">
        <Quote className="w-3 h-3" /> Citar una fuente
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
      <input value={titulo} onChange={e => setTitulo(e.target.value)}
        placeholder="Título: qué es lo que citas"
        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs mb-1.5 focus:outline-none focus:border-purple-300" />
      <input value={url} onChange={e => setUrl(e.target.value)}
        placeholder="Enlace (opcional)"
        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs mb-1.5 focus:outline-none focus:border-purple-300" />
      {/* LA CITA EXACTA. Enlazar 200 páginas no es citar: es dejarle la tarea
          al lector. */}
      <textarea value={cita} onChange={e => setCita(e.target.value)} rows={2}
        placeholder="La frase exacta que sostiene lo que dices"
        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs mb-1.5 resize-y focus:outline-none focus:border-purple-300" />
      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
        {TIPOS_FUENTE.map(t => (
          <button key={t} onClick={() => setTipo(t)}
            className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors',
              tipo === t ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
            {t}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-rose-700 mb-1.5">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setAbierto(false)}>Cerrar</Button>
        <Button onClick={enviar} disabled={guardando || !titulo.trim()}>
          {guardando ? <Loader2 className="w-4 h-4 mr-1.5 inline animate-spin" /> : null}
          Citar
        </Button>
      </div>
    </div>
  );
}

function Revisar({ argumentoId, actual, onHecho }: {
  argumentoId: string; actual: string; onHecho: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const marcar = async (veracidad: string) => {
    setGuardando(true); setError(null);
    try {
      const r = await fetch(`/api/argumentos/${argumentoId}/veracidad`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ veracidad, motivo: motivo.trim() || null }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'No se ha podido marcar.');
      onHecho();
    } catch (e: any) { setError(e.message); } finally { setGuardando(false); }
  };

  return (
    <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5">
      <p className="text-[11px] font-black text-slate-700 mb-1.5">
        Revisar. Ahora está como «{actual.replace('_', ' ')}».
      </p>
      <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2}
        placeholder="Por qué. Obligatorio para disputar o refutar: sin motivo no se puede responder ni comprobar."
        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs mb-1.5 resize-y focus:outline-none focus:border-emerald-300" />
      {error && <p className="text-xs text-rose-700 mb-1.5">{error}</p>}
      <div className="flex flex-wrap gap-1.5">
        <Button variant="outline" onClick={() => marcar('verificada')} disabled={guardando}>
          <BadgeCheck className="w-3.5 h-3.5 mr-1 inline" /> Verificada
        </Button>
        <Button variant="outline" onClick={() => marcar('disputada')} disabled={guardando}>Disputada</Button>
        <Button variant="outline" onClick={() => marcar('refutada')} disabled={guardando}>
          <Trash2 className="w-3.5 h-3.5 mr-1 inline" /> Refutada
        </Button>
      </div>
    </div>
  );
}

function Votar({ a, puedeVotar, onHecho }: {
  a: Argumento; puedeVotar: boolean; onHecho: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const votar = async (valor: number) => {
    setEnviando(true); setError(null);
    try {
      // Volver a pulsar el que ya tenías retira el voto: cambiar de opinión al
      // leer incluye dejar de tener opinión.
      const quitar = a.mi_voto === valor;
      const r = await fetch(`/api/argumentos/${a.id}/voto`, {
        method: quitar ? 'DELETE' : 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: quitar ? undefined : JSON.stringify({ valor }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'No se ha podido votar.');
      onHecho();
    } catch (e: any) { setError(e.message); } finally { setEnviando(false); }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {/* LA PREGUNTA NO ES SI TE GUSTA. Un argumento del bando contrario puede
          moverte mucho, y ese es justo el que tiene que subir. */}
      <span className="text-[10px] font-bold text-slate-400">¿Cuánto te mueve?</span>
      <div className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n}
            onClick={() => puedeVotar && votar(n)}
            disabled={!puedeVotar || enviando}
            title={puedeVotar
              ? (a.mi_voto === n ? 'Pulsa otra vez para retirar tu voto' : `Votar ${n} de 5`)
              : 'Inicia sesión para votar'}
            className={cn('w-5 h-5 rounded-md text-[10px] font-black transition-colors',
              a.mi_voto === n
                ? 'bg-purple-700 text-white'
                : puedeVotar
                  ? 'bg-slate-100 text-slate-500 hover:bg-purple-100 hover:text-purple-700'
                  : 'bg-slate-100 text-slate-300 cursor-default')}
          >
            {n}
          </button>
        ))}
      </div>
      {/* SIN VOTOS NO ES CERO. Un argumento recién escrito no vale cero: no ha
          sido valorado, y la pantalla lo dice con palabras y no con un número. */}
      <span className="text-[10px] text-slate-400">
        {a.impacto === null
          ? 'Sin votos todavía'
          : `${a.impacto.toFixed(1)} de 5 · ${a.votos} ${a.votos === 1 ? 'voto' : 'votos'}`}
      </span>
      {error && <span className="text-[10px] text-rose-700">{error}</span>}
    </div>
  );
}

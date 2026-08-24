import { useEffect, useRef, useState } from 'react';
import {
  X, ExternalLink, Globe, Lock, Trash2, Users, Check, Loader2, Pencil,
  CircleDot, CheckCircle2, AlertCircle, User as UserIcon, Eye, Sparkles,
} from 'lucide-react';
import WindowContent from './WindowContent';
import { KIND_TINT } from './esferaKit';
import { cn } from '../../utils/cn';

// ============================================================================
// FICHA DE UNA PUBLICACIÓN (2026-08-08, petición del usuario)
// ============================================================================
// «Un mapa, un lienzo, un proyecto, un libro, un documento es todo una
// publicación, y se puede editar si quien la abre es su autor.»
//
// Esta ficha es ese sitio: se abre en el centro al pulsar una tarjeta y desde
// aquí se hace todo lo que se puede hacer con una publicación propia —
// cambiarle el título, editar el contenido, decidir si es pública o privada,
// decir si está terminada o en desarrollo, invitar colaboradores y mandarla a
// la papelera. Si no es tuya, es exactamente lo que era antes: una ventana de
// lectura.
//
// Quién puede qué (lo decide el servidor, aquí sólo se dibuja):
//   puedo_editar  autor, colaborador o administrador → título y contenido
//   soy_autor     autor o administrador              → lo demás

export interface Publicacion {
  tipo: 'ventana' | 'muro' | 'lienzo' | 'proyecto' | 'mapa';
  id: string;
  titulo: string;
  kind: string;
  config: any;
  vistas: number;
  ia: boolean;
  fecha: string;
  autor_id: string | null;
  autor_nombre: string | null;
  /** La foto del autor. El servidor la manda desde que la tarjeta la enseña
   *  arriba; puede faltar, y entonces se pinta la inicial. */
  autor_avatar?: string | null;
  donde: string | null;
  donde_slug: string | null;
  /** Cuántas piezas tiene el lienzo donde vive. `null` cuando no vive en
   *  ninguno — que no es lo mismo que 0, y la etiqueta lo pinta distinto. */
  donde_piezas?: number | null;
  /** Lo republicado, ya armado por el servidor. `null` cuando esto no es una
   *  republicación. Se pregunta por este campo entero y no por sus trozos: así
   *  no se puede pintar media republicación si alguno viene vacío. */
  republica?: import('./Republicacion').Republicado | null;
  personal: boolean;
  ruta: string | null;
  publico: boolean;
  estado: 'en_desarrollo' | 'terminado';
  n_colaboradores: number;
  puedo_editar: boolean;
  soy_autor: boolean;
}

const TIPO_LABEL: Record<string, string> = {
  ventana: 'Publicación', muro: 'Del muro', lienzo: 'Lienzo',
  proyecto: 'Proyecto', mapa: 'Mapa',
};

/** El nombre del campo tal como lo espera el PATCH del servidor. */
const campoTexto = (p: Publicacion): 'cuerpo' | 'descripcion' | null =>
  p.tipo === 'muro' ? 'cuerpo'
  : p.tipo === 'lienzo' || p.tipo === 'proyecto' || p.tipo === 'mapa' ? 'descripcion'
  : null;

/** El texto largo vive bajo una clave distinta según el tipo dentro de `config`. */
const campoConfig = (p: Publicacion): 'body' | 'description' | 'goal' | null =>
  p.tipo === 'muro' ? 'body'
  : p.tipo === 'proyecto' ? 'goal'
  : p.tipo === 'lienzo' || p.tipo === 'mapa' ? 'description'
  : null;

const textoActual = (p: Publicacion): string => {
  const campo = campoConfig(p);
  return campo ? (p.config?.[campo] || '') : '';
};

export default function FichaPublicacion({ pub, onCerrar, onIr, onCambiada, editarAlAbrir }: {
  pub: Publicacion;
  onCerrar: () => void;
  onIr?: (ruta: string) => void;
  /** Se llama tras cualquier cambio para que la lista de detrás se refresque. */
  onCambiada: () => void;
  /** Entrar directamente en modo edición (al venir del menú de la tarjeta). */
  editarAlAbrir?: boolean;
}) {
  const tint = KIND_TINT[pub.kind] || '#64748b';
  const [editando, setEditando] = useState(!!editarAlAbrir && pub.puedo_editar);

  // `pub` es la foto del momento en que se abrió la ficha: no cambia aunque
  // se guarde un cambio (la lista de detrás sí se refresca vía onCambiada,
  // pero eso no toca esta prop). Por eso lo mostrado en modo lectura no puede
  // leer de `pub` directamente — se quedaría con el valor viejo hasta cerrar
  // y volver a abrir, que es justo el fallo que se ha reportado. En su lugar,
  // «guardado» es la última versión confirmada por el servidor, y es lo único
  // que se lee fuera de edición; los campos sueltos (titulo/texto/config) son
  // el borrador de la caja de edición y se inicializan y se resetean desde ahí.
  const [guardado, setGuardado] = useState({ titulo: pub.titulo, texto: textoActual(pub), config: pub.config || {} });
  const [titulo, setTitulo] = useState(guardado.titulo);
  const [texto, setTexto] = useState(guardado.texto);
  const [config, setConfig] = useState(guardado.config);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [panelColab, setPanelColab] = useState(false);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [invitado, setInvitado] = useState('');
  const cajaTitulo = useRef<HTMLInputElement>(null);

  // Espejo local de lo que ya está guardado, para no tener que recargar la
  // lista entera cada vez que se pulsa el candado.
  const [publico, setPublico] = useState(pub.publico);
  const [estado, setEstado] = useState(pub.estado);
  const [nColaboradores, setNColaboradores] = useState(pub.n_colaboradores);

  useEffect(() => { if (editando) cajaTitulo.current?.focus(); }, [editando]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !editando) onCerrar(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [editando, onCerrar]);

  const llamar = async (url: string, opciones: RequestInit) => {
    setError(null);
    const r = await fetch(url, { credentials: 'include', ...opciones });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setError(j.error || 'No se ha podido guardar.'); return null; }
    return j;
  };

  const patch = (cuerpo: any) =>
    llamar(`/api/publicaciones/${pub.tipo}/${pub.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });

  const guardar = async () => {
    setGuardando(true);
    const campo = campoTexto(pub);
    const cuerpo: any = { titulo };
    if (campo) cuerpo[campo] = texto;
    if (pub.tipo === 'ventana') cuerpo.config = config;
    const ok = await patch(cuerpo);
    setGuardando(false);
    // Éxito confirmado por el servidor: esto pasa a ser lo «guardado», así
    // que la vista de lectura lo enseña ya mismo, sin esperar a reabrir.
    if (ok) { setGuardado({ titulo, texto, config }); setEditando(false); onCambiada(); }
  };

  const cambiarVisibilidad = async () => {
    const nuevo = !publico;
    setGuardando(true);
    const ok = await patch({ publico: nuevo });
    setGuardando(false);
    if (ok) { setPublico(nuevo); onCambiada(); }
  };

  const cambiarEstado = async () => {
    const nuevo = estado === 'terminado' ? 'en_desarrollo' : 'terminado';
    setGuardando(true);
    const ok = await patch({ estado: nuevo });
    setGuardando(false);
    if (ok) { setEstado(nuevo); onCambiada(); }
  };

  const borrar = async () => {
    setGuardando(true);
    const ok = await llamar(`/api/publicaciones/${pub.tipo}/${pub.id}`, { method: 'DELETE' });
    setGuardando(false);
    if (ok) { onCambiada(); onCerrar(); }
  };

  const abrirColaboradores = async () => {
    setPanelColab(v => !v);
    if (panelColab) return;
    const j = await llamar(`/api/publicaciones/${pub.tipo}/${pub.id}/colaboradores`, {});
    if (Array.isArray(j)) setColaboradores(j);
  };

  const guardarColaboradores = async (personas: string[]) => {
    setGuardando(true);
    setAviso(null);
    const j = await llamar(`/api/publicaciones/${pub.tipo}/${pub.id}/colaboradores`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personas }),
    });
    setGuardando(false);
    if (!j) return;
    setColaboradores(j.colaboradores || []);
    setNColaboradores((j.colaboradores || []).length);
    if (j.no_encontrados?.length) {
      setAviso(`Todavía no hay nadie en humanity.wiki con ${j.no_encontrados.join(', ')}.`);
    }
    onCambiada();
  };

  const invitar = async () => {
    const correo = invitado.trim();
    if (!correo) return;
    await guardarColaboradores([...colaboradores.map(c => c.id), correo]);
    setInvitado('');
  };

  const puedeEditarTexto = pub.puedo_editar && (campoTexto(pub) !== null || pub.tipo === 'ventana');

  // Lo que se enseña fuera de edición: la config guardada, con el texto largo
  // (si el tipo lo tiene aparte) fusionado desde `guardado.texto`.
  const campoCfg = campoConfig(pub);
  const configLeido = pub.tipo === 'ventana'
    ? guardado.config
    : campoCfg ? { ...guardado.config, [campoCfg]: guardado.texto } : guardado.config;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={() => !editando && onCerrar()}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Cabecera */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-5 py-3 flex items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded shrink-0"
              style={{ color: tint, backgroundColor: `${tint}18` }}>
              {TIPO_LABEL[pub.tipo] || pub.kind}
            </span>
            <span className={cn('text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0',
              publico ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
              {publico ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
              {publico ? 'Pública' : 'Privada'}
            </span>
            <span className={cn('text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0',
              estado === 'terminado' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700')}>
              {estado === 'terminado' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <CircleDot className="w-2.5 h-2.5" />}
              {estado === 'terminado' ? 'Terminada' : 'En desarrollo'}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {pub.ruta && onIr && (
              <button onClick={() => onIr(pub.ruta!)} title="Abrir donde vive"
                className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-50 transition-colors">
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
            <button onClick={onCerrar} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {/* Título */}
          {editando ? (
            <input
              ref={cajaTitulo}
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              className="w-full text-xl font-black text-slate-900 leading-tight mb-2 px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400"
            />
          ) : (
            <h2 className="text-xl font-black text-slate-900 leading-tight mb-1">{guardado.titulo}</h2>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mb-4">
            <span className="inline-flex items-center gap-1">
              <UserIcon className="w-3 h-3" />{pub.autor_nombre || 'Anónimo'}
            </span>
            {pub.donde && <span>· {pub.donde}</span>}
            {pub.vistas > 0 && <span className="inline-flex items-center gap-0.5"><Eye className="w-3 h-3" />{pub.vistas}</span>}
            {pub.ia && <span className="inline-flex items-center gap-0.5 text-amber-600"><Sparkles className="w-3 h-3" />Escrito por la IA</span>}
            {nColaboradores > 0 && (
              <span className="inline-flex items-center gap-0.5"><Users className="w-3 h-3" />{nColaboradores}</span>
            )}
          </div>

          {/* Contenido */}
          {editando && campoTexto(pub) ? (
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              rows={8}
              placeholder="Escribe aquí…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm leading-relaxed focus:outline-none focus:border-emerald-400 resize-y"
            />
          ) : (
            <WindowContent
              kind={pub.kind}
              config={editando ? config : configLeido}
              variant="full"
              onConfigChange={editando && pub.tipo === 'ventana' ? setConfig : undefined}
            />
          )}

          {error && (
            <p className="mt-3 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 inline-flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />{error}
            </p>
          )}
          {aviso && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">{aviso}</p>
          )}

          {/* Colaboradores */}
          {panelColab && pub.soy_autor && (
            <div className="mt-4 border border-slate-200 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2.5">
                Quién más puede escribir aquí
              </p>
              {colaboradores.length ? (
                <div className="space-y-1.5 mb-3">
                  {colaboradores.map(c => (
                    <div key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-700">{c.display_name || c.email}</span>
                      <span className="text-slate-400 truncate">{c.email}</span>
                      <button
                        onClick={() => guardarColaboradores(colaboradores.filter(x => x.id !== c.id).map(x => x.id))}
                        className="ml-auto text-slate-300 hover:text-rose-500 transition-colors shrink-0"
                        title="Quitar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 mb-3">De momento sólo tú.</p>
              )}
              <form onSubmit={e => { e.preventDefault(); invitar(); }} className="flex gap-1.5">
                <input
                  value={invitado}
                  onChange={e => setInvitado(e.target.value)}
                  placeholder="Correo de la persona…"
                  className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300"
                />
                <button type="submit" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors">
                  Invitar
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Barra de acciones: solo si puedes hacer algo con ella */}
        {pub.puedo_editar && (
          <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-100 px-5 py-3 flex flex-wrap items-center gap-2">
            {editando ? (
              <>
                <button onClick={guardar} disabled={guardando}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-colors">
                  {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Guardar
                </button>
                <button onClick={() => {
                  setEditando(false); setTitulo(guardado.titulo);
                  setTexto(guardado.texto); setConfig(guardado.config); setError(null);
                }}
                  className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
                  Cancelar
                </button>
              </>
            ) : (
              <>
                {puedeEditarTexto && (
                  <button onClick={() => setEditando(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-xs font-black transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                )}
                {pub.soy_autor && (
                  <>
                    <button onClick={cambiarVisibilidad} disabled={guardando}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-400 rounded-xl text-xs font-bold text-slate-600 transition-colors disabled:opacity-50">
                      {publico ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                      {publico ? 'Hacer privada' : 'Hacer pública'}
                    </button>
                    <button onClick={cambiarEstado} disabled={guardando}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-400 rounded-xl text-xs font-bold text-slate-600 transition-colors disabled:opacity-50">
                      {estado === 'terminado' ? <CircleDot className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      {estado === 'terminado' ? 'Marcar en desarrollo' : 'Marcar terminada'}
                    </button>
                    <button onClick={abrirColaboradores}
                      className={cn('inline-flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-colors',
                        panelColab ? 'border-slate-900 text-slate-900' : 'border-slate-200 hover:border-slate-400 text-slate-600')}>
                      <Users className="w-3.5 h-3.5" /> Colaboradores
                    </button>
                    {confirmandoBorrado ? (
                      <div className="ml-auto flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">¿Seguro? Va a la papelera 15 días.</span>
                        <button onClick={borrar} disabled={guardando}
                          className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-colors disabled:opacity-50">
                          Sí, eliminar
                        </button>
                        <button onClick={() => setConfirmandoBorrado(false)}
                          className="px-2 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
                          No
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmandoBorrado(true)}
                        className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

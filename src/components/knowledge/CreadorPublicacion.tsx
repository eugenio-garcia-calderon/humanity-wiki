import { useRef, useState } from 'react';
import { subirArchivo } from '../../utils/subir';
import { Link, useNavigate } from 'react-router-dom';
import {
  X, Sparkles, FileText, Network, Map as MapIcon, FolderKanban,
  MessageSquare, Loader2, ArrowRight, MonitorPlay, Image as ImageIcon,
  Camera, Video, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import EditorImagen from './EditorImagen';
import { CapturaCamara } from '../ui/CapturaCamara';
import { DestinoCaptura, type Captura } from './DestinoCaptura';
import { cn } from '../../utils/cn';

// ============================================================================
// CREADOR DE PUBLICACIONES (2026-08-08, petición del usuario)
// ============================================================================
// «Un botón de creación en Explorar que abra un cuadro de creador de
// publicaciones con todas las opciones y asistencia de chat incluida.»
//
// Dos caminos, mismas tuberías que ya existían:
//  - CON IA: describes lo que quieres y se enruta a la maquinaria real —
//    documentos al streaming de /paginas/nuevo; lienzos y mapas al chat
//    (/api/ai/chat en modo autónomo, aceptando la acción igual que hace el
//    panel del asistente) que los crea de verdad y navega al resultado.
//  - A MANO: eliges el tipo, le pones título y se llama al endpoint de
//    creación de ese tipo (los mismos POST de siempre), abriéndolo al crear.

type TipoCreable = 'documento' | 'presentacion' | 'lienzo' | 'mapa' | 'imagen' | 'camara' | 'proyecto' | 'muro';

// ¿Sabe este navegador abrir la cámara desde un `<input type=file>`?
// En un móvil sí, y es el mejor camino: es la cámara del sistema, graba vídeo y
// no pide un permiso aparte. En un portátil el atributo se ignora y saldría el
// diálogo de ficheros, así que ahí usamos la vista en vivo. Se pregunta por la
// capacidad, no por el tamaño de la pantalla: una ventana estrecha en un
// ordenador sigue sin tener cámara trasera.
const CAPTURA_NATIVA = typeof document !== 'undefined' && 'capture' in document.createElement('input');

const TIPOS: { tipo: TipoCreable; label: string; icon: any; descripcion: string; conIA: boolean }[] = [
  { tipo: 'documento', label: 'Documento', icon: FileText, descripcion: 'Página estilo Notion con bloques, tablas e imágenes', conIA: true },
  { tipo: 'presentacion', label: 'Presentación', icon: MonitorPlay, descripcion: 'Frames horizontales estilo PowerPoint, exportable a .pptx', conIA: true },
  { tipo: 'lienzo', label: 'Lienzo', icon: Network, descripcion: 'Pizarra infinita con ventanas conectadas', conIA: true },
  { tipo: 'mapa', label: 'Mapa', icon: MapIcon, descripcion: 'Mapa con indicadores sobre el territorio', conIA: true },
  { tipo: 'imagen', label: 'Imagen', icon: ImageIcon, descripcion: 'Sube una foto y edítala: recorte, filtros, texto…', conIA: false },
  { tipo: 'camara', label: 'Cámara', icon: Camera, descripcion: 'Haz una foto o graba un vídeo aquí mismo y súbelo', conIA: false },
  { tipo: 'proyecto', label: 'Proyecto', icon: FolderKanban, descripcion: 'Tablero de tarjetas por hacer / en curso / hecho', conIA: false },
  { tipo: 'muro', label: 'Al muro', icon: MessageSquare, descripcion: 'Publicación breve en el muro de la comunidad', conIA: false },
];

export default function CreadorPublicacion({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<TipoCreable>('documento');
  const [prompt, setPrompt] = useState('');
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [ocupado, setOcupado] = useState<'ia' | 'mano' | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Editor de imágenes: solo si LO PIDES desde el selector de destino.
  const [imagenEnEdicion, setImagenEnEdicion] = useState<string | null>(null);
  // La foto o el vídeo recién subidos, esperando a que digas dónde van.
  const [capturaPendiente, setCapturaPendiente] = useState<Captura | null>(null);
  /*
   * HECHO, SIN ECHARTE DE AQUÍ (2026-08-22, Eugenio: «cuando le doy a crear
   * publicación, te lleva a la página de publicaciones, y esto hay que
   * mejorarlo y crear diferentemente desde la ventana de creación»).
   *
   * Crear un documento o un lienzo SÍ debe llevarte a él: lo siguiente que vas
   * a hacer es escribir dentro. Una publicación no: ya está terminada al
   * crearla, y mandarte a un listado te obliga a volver andando si querías
   * publicar otra cosa. Así que se queda aquí, te lo confirma, y tú decides si
   * la abres o si sigues creando.
   */
  const [creado, setCreado] = useState<{ texto: string; ruta: string } | null>(null);
  // Cámara en vivo: solo se usa donde `capture` no sirve, o sea en un ordenador.
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const entradaFoto = useRef<HTMLInputElement | null>(null);
  const entradaVideo = useRef<HTMLInputElement | null>(null);

  if (!abierto) return null;

  const elegido = TIPOS.find(t => t.tipo === tipo)!;

  const fallo = (mensaje: string) => { setError(mensaje); setOcupado(null); };

  /** El camino con IA: cada tipo va a su maquinaria real. */
  const crearConIA = async () => {
    const p = prompt.trim();
    if (!p) return fallo('Describe primero lo que quieres crear.');
    setError(null);
    if (tipo === 'documento') {
      onCerrar();
      navigate(`/paginas/nuevo?prompt=${encodeURIComponent(p)}`);
      return;
    }
    if (tipo === 'presentacion') {
      setOcupado('ia');
      try {
        const r = await fetch('/api/ai/presentacion', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: p }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'La IA no ha podido crearla.');
        onCerrar();
        navigate(`/presentaciones/${j.id}`);
      } catch (e: any) {
        fallo(e.message);
      } finally {
        setOcupado(o => (o === 'ia' ? null : o));
      }
      return;
    }
    // Lienzo o mapa: el chat en modo autónomo ya sabe crearlos de verdad —
    // se le pide, se acepta su acción y se abre lo creado (la misma pauta
    // que aplica AIAssistant cuando la acción trae autoApply).
    setOcupado('ia');
    try {
      const encargo = tipo === 'lienzo'
        ? `Crea un grafo de conocimiento sobre: ${p}`
        : `Crea un mapa sobre: ${p}`;
      const res = await fetch('/api/ai/chat', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: encargo, edit_mode: 'autonomo', search_web: false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'La IA no ha podido crearlo.');
      for (const a of json.proposed_actions || []) {
        if (!a.autoApply || a.status !== 'propuesta') continue;
        const rd = await fetch(`/api/ai/actions/${a.id}/decide`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision: 'aceptar' }),
        });
        const rj = await rd.json();
        if (rj?.ok && rj.slug) {
          onCerrar();
          navigate(rj.entityType === 'user_maps' ? `/mapas/${rj.slug}` : `/esquemas/${rj.slug}`);
          return;
        }
        if (rj && rj.ok === false && rj.error) throw new Error(rj.error);
      }
      throw new Error('La IA respondió pero no llegó a crear nada — prueba a describirlo de otra forma.');
    } catch (e: any) {
      fallo(e.message);
    } finally {
      setOcupado(o => (o === 'ia' ? null : o));
    }
  };

  /** El camino a mano: título (y texto si es al muro) → POST del tipo. */
  const crearAMano = async () => {
    const t = titulo.trim();
    if (!t && tipo !== 'muro') return fallo('Ponle un título.');
    if (tipo === 'muro' && !t && !cuerpo.trim()) return fallo('Escribe al menos un título o el texto.');
    setError(null);
    setOcupado('mano');
    try {
      const llamar = async (url: string, body: any) => {
        const r = await fetch(url, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'No se ha podido crear.');
        return j;
      };
      if (tipo === 'documento') {
        const j = await llamar('/api/documentos', { titulo: t });
        onCerrar(); navigate(`/paginas/${j.id}`);
      } else if (tipo === 'presentacion') {
        const j = await llamar('/api/presentaciones', { titulo: t });
        onCerrar(); navigate(`/presentaciones/${j.id}`);
      } else if (tipo === 'lienzo') {
        const j = await llamar('/api/graphs', { title: t, status: 'borrador' });
        onCerrar(); navigate(`/esquemas/${j.slug}`);
      } else if (tipo === 'mapa') {
        const j = await llamar('/api/maps', { title: t, status: 'borrador' });
        onCerrar(); navigate(`/mapas/${j.slug}`);
      } else if (tipo === 'proyecto') {
        const j = await llamar('/api/proyectos', { titulo: t });
        onCerrar(); navigate(`/proyectos/${j.slug}`);
      } else {
        await llamar('/api/publications', { title: t || null, body: cuerpo.trim() || null });
        setTitulo(''); setCuerpo('');
        setCreado({ texto: 'Publicado en el muro.', ruta: '/muro' });
      }
    } catch (e: any) {
      fallo(e.message);
    } finally {
      setOcupado(o => (o === 'mano' ? null : o));
    }
  };

  /** Imagen: se sube el original y se abre el editor encima. */
  /*
   * Sube la foto y PREGUNTA DÓNDE VA (2026-08-22, Eugenio: «que no te salte el
   * editor por defecto, sino que sea tal cual como está y que luego te
   * pregunte dónde guardarla»). Antes esto abría el editor de imagen sin que
   * nadie lo hubiera pedido: la foto ya estaba bien y lo que faltaba era el
   * destino. Editar sigue estando, un botón dentro del selector.
   */
  const subirCaptura = async (archivo: File, tipo: 'imagen' | 'video') => {
    setError(null);
    setOcupado('mano');
    try {
      const sub = await subirArchivo(archivo);
      if (sub.error) throw new Error(sub.error);
      if (!titulo.trim()) setTitulo(archivo.name.replace(/\.[^.]+$/, ''));
      setCapturaPendiente({ url: sub.url, tipo, nombre: archivo.name });
    } catch (e: any) {
      fallo(e.message);
    } finally {
      setOcupado(null);
    }
  };

  /** «Imagen»: subir una del carrete sigue el mismo camino que la cámara. */
  const subirParaEditar = (archivo: File) => subirCaptura(archivo, 'imagen');

  /*
   * Un vídeo va por el mismo sitio que una foto: se sube y se pregunta dónde.
   *
   * OJO, LÍMITE REAL DEL SERVIDOR: `POST /api/ventanas` solo admite
   * `kind: 'imagen'` (lista blanca en `src/server/documentos.ts`, área de
   * Programador 1), así que un vídeo NO puede ser todavía una publicación
   * suelta — falla con 400. En un lienzo sí entra, porque
   * `POST /api/graphs/:id/windows` no tiene esa lista. El selector lo dice con
   * esas palabras en vez de soltar un «no se ha podido».
   */
  const subirVideo = (archivo: File) => subirCaptura(archivo, 'video');

  const guardarImagenEditada = async (url: string) => {
    try {
      const r = await fetch('/api/ventanas', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'imagen', titulo: titulo.trim() || 'Imagen sin título', config: { image_url: url } }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'No se ha podido guardar.');
      setImagenEnEdicion(null);
      onCerrar();
      navigate('/mis-publicaciones');
    } catch (e: any) {
      setImagenEnEdicion(null);
      fallo(e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center pt-16 sm:pt-24 px-5 overflow-y-auto"
      onClick={onCerrar}>
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl mb-16" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-6 pt-5">
          <h2 className="text-lg font-black text-slate-900">Crear una publicación</h2>
          <button onClick={onCerrar} className="ml-auto p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!user ? (
          <p className="px-6 py-8 text-sm text-slate-500">
            <Link to="/login" className="font-black text-emerald-700 hover:underline">Inicia sesión</Link> para crear publicaciones.
          </p>
        ) : (
          <div className="px-6 pb-6">
            {/* Qué crear */}
            {/* HECHO. Se queda a la vista aquí dentro en vez de mandarte a un
                listado: si querías publicar dos cosas seguidas, ahora puedes. */}
            {creado && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-sm font-medium text-emerald-900 flex-1 min-w-0">{creado.texto}</p>
                <button
                  onClick={() => { const r = creado.ruta; setCreado(null); onCerrar(); navigate(r); }}
                  className="text-sm font-semibold text-emerald-700 underline underline-offset-2 min-h-[44px] px-1"
                >
                  Verlo
                </button>
                <button
                  onClick={() => setCreado(null)}
                  className="text-sm font-semibold text-slate-500 min-h-[44px] px-1"
                >
                  Crear otra
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
              {TIPOS.map(t => (
                <button key={t.tipo} onClick={() => { setTipo(t.tipo); setError(null); }}
                  className={cn('text-left p-3 rounded-2xl border transition-all',
                    tipo === t.tipo ? 'border-emerald-400 bg-emerald-50/60 shadow-sm' : 'border-slate-200 hover:border-emerald-200')}>
                  <t.icon className={cn('w-4 h-4 mb-1.5', tipo === t.tipo ? 'text-emerald-600' : 'text-slate-400')} />
                  <p className="text-xs font-black text-slate-800">{t.label}</p>
                  <p className="text-[10px] text-slate-400 leading-snug mt-0.5">{t.descripcion}</p>
                </button>
              ))}
            </div>

            {/* Con IA */}
            {elegido.conIA && (
              <div className="mt-5 border border-indigo-100 bg-indigo-50/40 rounded-2xl p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Pídeselo a la IA
                </p>
                <textarea
                  value={prompt} onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); crearConIA(); } }}
                  rows={2}
                  placeholder={tipo === 'documento'
                    ? 'p. ej. «Un informe sobre la calidad del agua en Madrid con tabla de datos»'
                    : tipo === 'lienzo' ? 'p. ej. «La deforestación del Amazonas: causas, datos y soluciones»'
                    : 'p. ej. «Un mapa de la calidad del aire en las capitales españolas»'}
                  className="w-full mt-2 px-3 py-2 border border-indigo-200 rounded-xl text-sm bg-white focus:outline-none focus:border-indigo-400 resize-none"
                />
                <button onClick={crearConIA} disabled={ocupado !== null}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-black transition-colors">
                  {ocupado === 'ia' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> La IA está creándolo…</> : <><Sparkles className="w-3.5 h-3.5" /> Crear con IA</>}
                </button>
                {tipo === 'documento' && (
                  <p className="text-[10px] text-indigo-400 mt-1.5">Verás el documento escribirse en directo.</p>
                )}
              </div>
            )}

            {/* A mano */}
            <div className="mt-4 border border-slate-200 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {elegido.conIA ? 'O créalo tú desde cero' : 'Créalo tú'}
              </p>
              {tipo === 'camara' ? (
                <>
                  <input
                    value={titulo} onChange={e => setTitulo(e.target.value)}
                    placeholder="Título (opcional)"
                    className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {/* En el móvil, `capture` abre la cámara del sistema: es la
                        que ya sabe grabar vídeo y no pide un permiso aparte. En
                        un portátil el atributo se ignora, así que la foto va por
                        la vista en vivo y el vídeo se queda en elegir fichero —
                        grabar vídeo desde el navegador es otra obra. */}
                    <button
                      type="button"
                      onClick={() => (CAPTURA_NATIVA ? entradaFoto.current?.click() : setCamaraAbierta(true))}
                      disabled={ocupado !== null}
                      className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-60 transition-colors"
                    >
                      {ocupado === 'mano' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      Hacer una foto
                    </button>
                    <button
                      type="button"
                      onClick={() => entradaVideo.current?.click()}
                      disabled={ocupado !== null}
                      className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-60 transition-colors"
                    >
                      {ocupado === 'mano' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                      Grabar un vídeo
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">
                    La foto se abre en el editor antes de guardarse. El vídeo se sube tal cual.
                  </p>
                  <input
                    ref={entradaFoto} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) subirParaEditar(f); }}
                  />
                  <input
                    ref={entradaVideo} type="file" accept="video/*" capture="environment" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) subirVideo(f); }}
                  />
                </>
              ) : tipo === 'imagen' ? (
                <>
                  <input
                    value={titulo} onChange={e => setTitulo(e.target.value)}
                    placeholder="Título de la imagen (opcional)"
                    className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300"
                  />
                  <label className="mt-2 flex items-center justify-center gap-2 px-4 py-5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 cursor-pointer hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                    {ocupado === 'mano' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    Elegir una foto — se abrirá el editor
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files?.[0] && subirParaEditar(e.target.files[0])} />
                  </label>
                </>
              ) : (
                <>
                  <input
                    value={titulo} onChange={e => setTitulo(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && tipo !== 'muro') crearAMano(); }}
                    placeholder={tipo === 'muro' ? 'Título (opcional)' : `Título de tu ${elegido.label.toLowerCase()}`}
                    className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300"
                  />
                  {tipo === 'muro' && (
                    <textarea
                      value={cuerpo} onChange={e => setCuerpo(e.target.value)}
                      rows={3} placeholder="¿Qué quieres contar?"
                      className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300 resize-none"
                    />
                  )}
                  <button onClick={crearAMano} disabled={ocupado !== null}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-700 disabled:opacity-60 text-white rounded-xl text-xs font-black transition-colors">
                    {ocupado === 'mano' ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creando…</> : <>Crear y abrir <ArrowRight className="w-3.5 h-3.5" /></>}
                  </button>
                </>
              )}
            </div>

            {error && (
              <p className="mt-3 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>
            )}
          </div>
        )}
      </div>

      {camaraAbierta && (
        <CapturaCamara
          onCaptura={f => { setCamaraAbierta(false); subirCaptura(f, 'imagen'); }}
          onCerrar={() => setCamaraAbierta(false)}
        />
      )}

      {capturaPendiente && (
        <DestinoCaptura
          captura={capturaPendiente}
          onEditar={capturaPendiente.tipo === 'imagen'
            ? () => { setImagenEnEdicion(capturaPendiente.url); setCapturaPendiente(null); }
            : undefined}
          onListo={destino => {
            setCapturaPendiente(null);
            if (destino.tipo === 'lienzo') {
              // A un lienzo sí se va: quieres verla colocada.
              onCerrar();
              navigate(`/esquemas/${destino.slug}`);
              return;
            }
            setTitulo('');
            setCreado({ texto: 'Guardado en tus publicaciones.', ruta: '/mis-publicaciones' });
          }}
          onCerrar={() => setCapturaPendiente(null)}
        />
      )}

      {imagenEnEdicion && (
        <EditorImagen
          src={imagenEnEdicion}
          onGuardar={guardarImagenEditada}
          onCerrar={() => setImagenEnEdicion(null)}
        />
      )}
    </div>
  );
}

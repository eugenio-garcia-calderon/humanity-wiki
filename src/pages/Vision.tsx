import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass, Layers, Map as MapIcon, Table2, Users, Store, Palette, Sparkles,
  Shield, Scale, FolderKanban, ArrowUpRight, Pencil, Check, X, Coins,
  Sparkle, TrendingUp, ShoppingBag, Server, Cpu, RefreshCw, Receipt, MessagesSquare,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import TableroKanban, { type ItemTablero, type Grupo } from '../components/tablero/TableroKanban';
import EmbeddedCheckoutModal from '../components/stripe/EmbeddedCheckoutModal';
import { cn } from '../utils/cn';

// ============================================================================
// VISIÓN Y HOJA DE RUTA (2026-08-08, petición del usuario)
// ============================================================================
// Para qué existe humanity.wiki, y el tablero operativo de qué está hecho,
// qué se está haciendo y qué falta. Nueve grupos para que cientos de
// funcionalidades sigan siendo legibles.
//
// El tablero es el mismo componente que usan los proyectos de cada persona.
//
// Todo el texto de esta página es editable por un administrador (petición
// del usuario, 2026-08-08): cada párrafo vive en `page_texts` bajo una
// clave; sin fila, se ve el texto por defecto de aquí abajo.
//
// La pestaña «Economía» (mismo día) presenta los Puntos de Humanity.wiki: un
// saldo interno con decimales, hoy sin blockchain detrás — "de momento es un
// sistema de puntos interno" — pensado para pagar dentro de la app y el uso
// de la IA.

const GRUPOS: Grupo[] = [
  { id: 'canvas', label: 'El lienzo', color: '#7c3aed', desc: 'La pizarra infinita estilo Miro' },
  { id: 'mapas', label: 'Los mapas', color: '#0284c7', desc: 'El conocimiento sobre el territorio' },
  { id: 'datos', label: 'Bases de datos', color: '#0d9488', desc: 'Tablas vivas estilo Notion' },
  { id: 'social', label: 'Red social', color: '#d97706', desc: 'Personas, roles y comunidad' },
  { id: 'mercado', label: 'Mercado', color: '#16a34a', desc: 'Pagos, productos y reparto' },
  { id: 'diseno', label: 'Diseño y UI', color: '#db2777', desc: 'Interfaz, onboarding y difusión' },
  { id: 'ia', label: 'La IA', color: '#4f46e5', desc: 'Modelos, agentes y veracidad' },
  { id: 'infra', label: 'Datos y seguridad', color: '#475569', desc: 'Almacenamiento e infraestructura' },
  { id: 'gobernanza', label: 'Gobernanza', color: '#b91c1c', desc: 'Veracidad, licencias y decisiones' },
  { id: 'veracidad', label: 'Veracidad', color: '#7e22ce', desc: 'Debates, argumentos y fuentes' },
];

const ICONOS: Record<string, any> = {
  canvas: Layers, mapas: MapIcon, datos: Table2, social: Users, mercado: Store,
  diseno: Palette, ia: Sparkles, infra: Shield, gobernanza: Scale, veracidad: MessagesSquare,
};

const DEFECTOS: Record<string, string> = {
  titular: 'Agregar el conocimiento de la humanidad\ny repartir lo que genere entre quienes lo crean',
  parrafo_1: 'Hoy el saber está partido: los datos en un sitio, los mapas en otro, las conversaciones en un tercero, y lo que cada persona sabe encerrado en su cabeza o en su Notion. humanity.wiki junta las tres formas de mirar — el dato en crudo, el conocimiento conectado y el conocimiento situado en el territorio — sobre una sola base.',
  economia_titular: 'Puntos de Humanity.wiki',
  economia_parrafo_1: 'Todo el mundo empieza con 100 puntos al registrarse. Los puntos se gastan dentro de la app — usar la IA, comprar en el Mercado — y tienen decimales: puedes tener 54,23 puntos, y ganas céntimos de punto cuando una publicación pública tuya recibe una visita de otra persona. Cuanto más útil sea lo que compartes, más puntos genera por sí solo.',
  economia_parrafo_2: 'Hoy son un saldo interno, sin nada por detrás salvo la base de datos de la plataforma. El plan es que, más adelante, se conviertan en un token real sobre blockchain — pero eso es el destino, no el punto de partida: primero funcionan aquí dentro, con las mismas reglas que tendrán después.',
};

/** Un bloque de texto que un administrador puede editar en el sitio. */
function TextoEditable({ pagina, clave, valor, defecto, esAdmin, onGuardado, multilinea = true, as: Tag = 'p', className }: {
  pagina: string; clave: string; valor: string | undefined; defecto: string;
  esAdmin: boolean; onGuardado: (clave: string, valor: string) => void;
  multilinea?: boolean; as?: any; className?: string;
}) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(valor ?? defecto);
  const [guardando, setGuardando] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setBorrador(valor ?? defecto); }, [valor, defecto]);
  useEffect(() => { if (editando) ref.current?.focus(); }, [editando]);

  const guardar = async () => {
    const nuevo = borrador.trim();
    if (!nuevo || nuevo === (valor ?? defecto)) { setEditando(false); return; }
    setGuardando(true);
    const r = await fetch(`/api/textos/${pagina}/${clave}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ valor: nuevo }),
    });
    setGuardando(false);
    if (r.ok) { onGuardado(clave, nuevo); setEditando(false); }
  };

  if (editando) {
    return (
      <div className="relative">
        <textarea
          ref={ref} value={borrador} onChange={e => setBorrador(e.target.value)}
          rows={multilinea ? Math.max(2, Math.ceil(borrador.length / 70)) : 1}
          className={cn('w-full px-3 py-2 border-2 border-emerald-300 rounded-xl focus:outline-none resize-y bg-emerald-50/30', className)}
        />
        <div className="flex items-center gap-1.5 mt-1.5">
          <button onClick={guardar} disabled={guardando}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold disabled:opacity-50">
            <Check className="w-3 h-3" /> Guardar
          </button>
          <button onClick={() => { setBorrador(valor ?? defecto); setEditando(false); }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-slate-800 rounded-lg text-[11px] font-bold">
            <X className="w-3 h-3" /> Cancelar
          </button>
        </div>
      </div>
    );
  }

  const texto = valor ?? defecto;
  return (
    <div className="group/texto relative">
      <Tag className={className}>
        {texto.split('\n').map((linea, i, arr) => (
          <span key={i}>{linea}{i < arr.length - 1 && <br />}</span>
        ))}
      </Tag>
      {esAdmin && (
        <button onClick={() => setEditando(true)} title="Editar este texto"
          className="absolute -right-7 top-0 p-1 text-slate-300 hover:text-emerald-600 rounded-md hover:bg-slate-50 opacity-0 group-hover/texto:opacity-100 transition-opacity">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

const MOTIVO_LABEL: Record<string, string> = {
  regalo_bienvenida: 'Regalo de bienvenida',
  compra: 'Compra',
  vista_publicacion: 'Vista de una publicación tuya',
  gasto_ia: 'Uso de la IA',
  ajuste_admin: 'Ajuste',
};

/** La pestaña Economía: qué son los puntos, y tu saldo si has iniciado sesión. */
function PestanaEconomia({ textos, esAdmin, guardadoTexto }: {
  textos: Record<string, string>; esAdmin: boolean; guardadoTexto: (c: string, v: string) => void;
}) {
  const { user } = useAuth();
  const [saldo, setSaldo] = useState<{ puntos: number; movimientos: any[] } | null>(null);
  const [comprando, setComprando] = useState(false);

  const cargarSaldo = () => {
    if (!user) return;
    fetch('/api/puntos/saldo', { credentials: 'include' })
      .then(r => r.json()).then(setSaldo).catch(() => setSaldo(null));
  };
  useEffect(() => { cargarSaldo(); }, [user]);

  return (
    <div className="max-w-3xl">
      <TextoEditable
        pagina="vision" clave="economia_titular" valor={textos.economia_titular} defecto={DEFECTOS.economia_titular}
        esAdmin={esAdmin} onGuardado={guardadoTexto}
        as="h1" className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-slate-900"
      />
      <div className="mt-4 space-y-3 text-sm text-slate-600 leading-relaxed">
        <TextoEditable pagina="vision" clave="economia_parrafo_1" valor={textos.economia_parrafo_1} defecto={DEFECTOS.economia_parrafo_1} esAdmin={esAdmin} onGuardado={guardadoTexto} />
        <TextoEditable pagina="vision" clave="economia_parrafo_2" valor={textos.economia_parrafo_2} defecto={DEFECTOS.economia_parrafo_2} esAdmin={esAdmin} onGuardado={guardadoTexto} />
      </div>

      {user ? (
        <div className="mt-7 bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-3xl p-6">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-amber-700 inline-flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5" /> Tu saldo
          </p>
          <p className="text-4xl font-black text-slate-900 mt-1.5">
            {saldo ? saldo.puntos.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
            <span className="text-base font-bold text-slate-400 ml-1.5">puntos</span>
          </p>
          <button
            onClick={() => setComprando(true)}
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Comprar 100 puntos por 100 €
          </button>

          {!!saldo?.movimientos?.length && (
            <div className="mt-5 pt-4 border-t border-amber-100 space-y-1.5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Últimos movimientos</p>
              {saldo.movimientos.slice(0, 8).map(m => (
                <div key={m.id} className="flex items-center gap-2 text-xs">
                  <span className={cn('font-black w-16 shrink-0 text-right', Number(m.cantidad) >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                    {Number(m.cantidad) >= 0 ? '+' : ''}{Number(m.cantidad).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-slate-500 truncate">{MOTIVO_LABEL[m.motivo] || m.motivo}</span>
                  <span className="text-slate-300 ml-auto shrink-0">{new Date(m.created_at).toLocaleDateString('es-ES')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-7 bg-slate-50 border border-slate-200 rounded-3xl p-6 text-center">
          <Sparkle className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Entra para ver tu saldo — todo el mundo empieza con 100 puntos.</p>
        </div>
      )}

      {comprando && (
        <EmbeddedCheckoutModal
          title="Comprar 100 Puntos de Humanity.wiki"
          onClose={() => { setComprando(false); cargarSaldo(); }}
          createSession={async () => {
            const res = await fetch('/api/stripe/checkout/puntos', { method: 'POST', credentials: 'include' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'No se pudo iniciar la compra.');
            return json;
          }}
        />
      )}
    </div>
  );
}

const eur = (n: number) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });

/** La pestaña Gasto: lo que cuesta mantener la plataforma, con datos reales. */
function PestanaGasto({ esAdmin }: { esAdmin: boolean }) {
  const [gasto, setGasto] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = (refrescar = false) => {
    setCargando(true);
    fetch(`/api/gasto${refrescar ? '?refrescar=1' : ''}`, { credentials: 'include' })
      .then(r => r.json()).then(setGasto).catch(() => setGasto(null))
      .finally(() => setCargando(false));
  };
  useEffect(() => { cargar(); }, []);

  if (cargando && !gasto) return <p className="text-sm text-slate-400 py-16 text-center">Consultando el gasto real…</p>;
  if (!gasto) return <p className="text-sm text-slate-400 py-16 text-center">No se ha podido cargar el gasto.</p>;

  const srv = gasto.servidores;
  const oficial = gasto.ia.oficial_anthropic;
  const interno = gasto.ia.interno;
  const iaMes = oficial.estado === 'ok'
    ? oficial.mes_actual_eur + interno.mes_actual.google_eur
    : interno.mes_actual.total_eur;
  // Si hay consumo real del mes (token de Hetzner), «Este mes» suma lo
  // consumido de verdad; si solo hay precio fijo, suma el precio mensual.
  const totalMes = (srv.estado === 'ok' ? (srv.consumo_mes_eur ?? srv.total_mes_eur) : 0) + iaMes;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Gasto de la plataforma</h1>
        <span className="text-[11px] text-slate-400 font-bold ml-auto inline-flex items-center gap-1.5">
          Actualizado {new Date(gasto.actualizado).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          · cada {gasto.cache_horas} h
          {esAdmin && (
            <button onClick={() => cargar(true)} title="Actualizar ahora"
              className="p-1 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-slate-50 transition-colors">
              <RefreshCw className={cn('w-3.5 h-3.5', cargando && 'animate-spin')} />
            </button>
          )}
        </span>
      </div>
      <p className="text-sm text-slate-500 mt-2">
        Lo que cuesta mantener humanity.wiki en marcha, con datos reales de cada proveedor. Transparencia total: este es el dinero que sale.
      </p>

      <div className="mt-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6">
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 inline-flex items-center gap-1.5">
          <Receipt className="w-3.5 h-3.5" /> Este mes
        </p>
        <p className="text-4xl font-black mt-1.5">{eur(totalMes)}</p>
        <p className="text-xs text-slate-400 mt-1">Servidores + modelos de IA</p>
      </div>

      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        {/* ------------------------- Servidores ------------------------- */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 inline-flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5" /> Servidores · Hetzner
          </p>
          {srv.estado === 'ok' ? (
            <>
              {/* Con token de Hetzner el dato protagonista es el CONSUMO del
                  mes en curso (el «Usage» de la consola); el precio mensual
                  queda como referencia. Sin token solo hay precio fijo. */}
              {typeof srv.consumo_mes_eur === 'number' ? (
                <p className="text-2xl font-black text-slate-900 mt-1.5">
                  {eur(srv.consumo_mes_eur)}<span className="text-sm font-bold text-slate-400"> consumido este mes · {eur(srv.total_mes_eur)}/mes</span>
                </p>
              ) : (
                <p className="text-2xl font-black text-slate-900 mt-1.5">{eur(srv.total_mes_eur)}<span className="text-sm font-bold text-slate-400"> /mes</span></p>
              )}
              <div className="mt-3 space-y-1.5">
                {srv.servidores.map((s: any) => (
                  <div key={s.nombre} className="flex items-center text-xs">
                    <span className="text-slate-600 font-bold truncate">{s.nombre}</span>
                    <span className="text-slate-400 ml-1.5 shrink-0">({s.tipo})</span>
                    <span className="text-slate-900 font-black ml-auto shrink-0">
                      {typeof s.consumo_eur === 'number' ? `${eur(s.consumo_eur)} · ${eur(s.eur_mes)}/mes` : eur(s.eur_mes)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {esAdmin ? srv.mensaje : 'Todavía sin conectar con el proveedor.'}
            </p>
          )}
        </div>

        {/* ------------------------ Modelos de IA ----------------------- */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 inline-flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" /> Modelos de IA
          </p>
          <p className="text-2xl font-black text-slate-900 mt-1.5">{eur(iaMes)}<span className="text-sm font-bold text-slate-400"> este mes</span></p>
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex items-center">
              <span className="text-slate-600 font-bold">Anthropic (Claude)</span>
              <span className="text-slate-900 font-black ml-auto">
                {eur(oficial.estado === 'ok' ? oficial.mes_actual_eur : interno.mes_actual.anthropic_eur)}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-slate-600 font-bold">Google (Gemini)</span>
              <span className="text-slate-900 font-black ml-auto">{eur(interno.mes_actual.google_eur)}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
            {oficial.estado === 'ok'
              ? 'Anthropic: dato oficial de facturación. Google: estimación por el registro interno de llamadas.'
              : 'Estimación por el registro interno de cada llamada a la IA.'}
            {esAdmin && oficial.estado !== 'ok' && ` ${oficial.mensaje}`}
          </p>
        </div>
      </div>

      {interno.historial.length > 1 && (
        <div className="mt-4 bg-white border border-slate-200 rounded-3xl p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Gasto en IA por mes (registro interno)</p>
          <div className="space-y-1.5">
            {interno.historial.map((h: any) => (
              <div key={h.mes} className="flex items-center gap-3 text-xs">
                <span className="text-slate-500 font-bold w-16 shrink-0">{h.mes}</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min(100, (h.total_eur / Math.max(...interno.historial.map((x: any) => x.total_eur), 0.01)) * 100)}%` }} />
                </div>
                <span className="text-slate-900 font-black w-20 text-right shrink-0">{eur(h.total_eur)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Vision() {
  const { user } = useAuth();
  const esAdmin = !!user?.isAdmin;
  const [items, setItems] = useState<ItemTablero[]>([]);
  const [cargando, setCargando] = useState(true);
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'hoja_de_ruta' | 'economia' | 'gasto'>('hoja_de_ruta');

  const cargar = () => fetch('/api/roadmap')
    .then(r => r.json())
    .then(j => setItems(Array.isArray(j) ? j : []))
    .catch(() => setItems([]))
    .finally(() => setCargando(false));

  useEffect(() => { cargar(); }, []);
  useEffect(() => {
    fetch('/api/textos/vision').then(r => r.json()).then(j => setTextos(j || {})).catch(() => setTextos({}));
  }, []);

  const guardadoTexto = (clave: string, valor: string) => setTextos(t => ({ ...t, [clave]: valor }));

  const total = items.length;
  const hechas = items.filter(i => i.estado === 'hecho').length;
  const avance = total ? Math.round((hechas / total) * 100) : 0;

  const texto = (clave: string) => (
    <TextoEditable
      pagina="vision" clave={clave} valor={textos[clave]} defecto={DEFECTOS[clave]}
      esAdmin={esAdmin} onGuardado={guardadoTexto}
    />
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 pt-10 pb-24">

        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 mb-3 inline-flex items-center gap-1.5">
            <Compass className="w-3 h-3" /> Visión y hoja de ruta
          </p>
          <TextoEditable
            pagina="vision" clave="titular" valor={textos.titular} defecto={DEFECTOS.titular}
            esAdmin={esAdmin} onGuardado={guardadoTexto}
            as="h1" className="text-3xl sm:text-4xl font-black tracking-tight leading-[1.1] text-slate-900"
          />
          {/* Un único bloque editable (2026-08-08, petición del usuario: «deja
              solo el primero») — admite varios párrafos separados por líneas
              en blanco dentro del mismo texto. */}
          <div className="mt-5 space-y-3 text-sm text-slate-600 leading-relaxed">
            {texto('parrafo_1')}
          </div>

          <div className="mt-7 flex items-center gap-4">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-md">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                style={{ width: `${avance}%` }} />
            </div>
            <p className="text-xs font-bold text-slate-500 shrink-0">
              <span className="text-slate-900">{hechas}</span> de {total} · {avance}%
            </p>
          </div>

          <Link to="/proyectos"
            className="inline-flex items-center gap-1.5 mt-5 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors">
            <FolderKanban className="w-3.5 h-3.5" />
            Este mismo tablero, para tus proyectos
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Pestañas: la hoja de ruta operativa, o la economía de puntos. */}
        <div className="mt-9 flex items-center gap-1 border-b border-slate-100">
          <button
            onClick={() => setTab('hoja_de_ruta')}
            className={cn('inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-black border-b-2 -mb-px transition-colors',
              tab === 'hoja_de_ruta' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700')}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Hoja de ruta
          </button>
          <button
            onClick={() => setTab('economia')}
            className={cn('inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-black border-b-2 -mb-px transition-colors',
              tab === 'economia' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700')}
          >
            <Coins className="w-3.5 h-3.5" /> Economía
          </button>
          <button
            onClick={() => setTab('gasto')}
            className={cn('inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-black border-b-2 -mb-px transition-colors',
              tab === 'gasto' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-700')}
          >
            <Receipt className="w-3.5 h-3.5" /> Gasto
          </button>
        </div>

        <div className="mt-7">
          {tab === 'economia' ? (
            <PestanaEconomia textos={textos} esAdmin={esAdmin} guardadoTexto={guardadoTexto} />
          ) : tab === 'gasto' ? (
            <PestanaGasto esAdmin={esAdmin} />
          ) : cargando ? (
            <p className="text-sm text-slate-400 text-center py-24">Cargando el tablero…</p>
          ) : (
            <TableroKanban
              items={items}
              grupos={GRUPOS.map(g => ({ ...g, icon: ICONOS[g.id] }))}
              puedeEditar={esAdmin}
              onRecargar={cargar}
            />
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass, Layers, Map as MapIcon, Table2, Users, Store, Palette, Sparkles,
  Shield, Scale, FolderKanban, ArrowUpRight, Pencil, Check, X, Coins,
  Sparkle, TrendingUp, ShoppingBag,
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
];

const ICONOS: Record<string, any> = {
  canvas: Layers, mapas: MapIcon, datos: Table2, social: Users, mercado: Store,
  diseno: Palette, ia: Sparkles, infra: Shield, gobernanza: Scale,
};

const DEFECTOS: Record<string, string> = {
  titular: 'Agregar el conocimiento de la humanidad\ny repartir lo que genere entre quienes lo crean',
  parrafo_1: 'Hoy el saber está partido: los datos en un sitio, los mapas en otro, las conversaciones en un tercero, y lo que cada persona sabe encerrado en su cabeza o en su Notion. humanity.wiki junta las tres formas de mirar — el dato en crudo, el conocimiento conectado y el conocimiento situado en el territorio — sobre una sola base.',
  parrafo_2: 'La plataforma tiene dos mitades que se necesitan. El común, donde se agrega lo que aporta todo el mundo y nada se duplica: si alguien ya lo escribió, se conecta. Y tu espacio propio, un lienzo infinito donde construyes lo tuyo y decides qué compartes.',
  parrafo_3: 'La inteligencia natural y la artificial trabajan aquí del mismo lado: la IA busca, contrasta, señala contradicciones y responde comentarios, pero todo lo que escribe queda marcado y pendiente de revisión humana. Y quien crea conocimiento que la gente lee, cobra por ello.',
  parrafo_estrategia: 'La estrategia de desarrollo de humanity.wiki es agregar todas las herramientas y funcionalidades relacionadas con la generación y el orden del conocimiento en un solo sitio: una herramienta todo en uno. Así el conocimiento se unifica en una base de datos universal, se puede aprender de lo que ya ha escrito otra persona, reciclar y reutilizar su contenido para el proyecto propio, y mostrar la complejidad de un proyecto o de un conocimiento de formas distintas — un mapa, un grafo, una tabla — sin cambiar nunca de aplicación.',
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

export default function Vision() {
  const { user } = useAuth();
  const esAdmin = !!user?.isAdmin;
  const [items, setItems] = useState<ItemTablero[]>([]);
  const [cargando, setCargando] = useState(true);
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'hoja_de_ruta' | 'economia'>('hoja_de_ruta');

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
          <div className="mt-5 space-y-3 text-sm text-slate-600 leading-relaxed">
            {texto('parrafo_1')}
            {texto('parrafo_2')}
            {texto('parrafo_3')}
            {texto('parrafo_estrategia')}
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
        </div>

        <div className="mt-7">
          {tab === 'economia' ? (
            <PestanaEconomia textos={textos} esAdmin={esAdmin} guardadoTexto={guardadoTexto} />
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

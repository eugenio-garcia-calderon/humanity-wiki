import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Search, Download, Inbox, Mail, MailCheck, Send, Archive, Trash2, Check,
  CircleDot, Reply, Clock, Info, UserMinus, ChevronDown,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { MOTIVOS, textoMotivo, enlaceCorreo, PLAZO_CONFIRMAR_DIAS } from '../components/sitio/formularios';

// ============================================================================
// LOS MENSAJES Y EL BOLETÍN DE UN SITIO (2026-11-07)
// ============================================================================
// `/paginas/:id/formularios`. Lo que llega por los formularios de un escaparate
// (`FormularioColabora.tsx` y el boletín del pie, `AltaBoletin.tsx`), para quien
// administra su página raíz: leer, contestar, marcar, archivar, borrar los datos
// de alguien que lo pida y exportar. Se llega desde «Compartir» (`TarjetaFormularios`).
// El servidor y el porqué de cada decisión: `src/server/formulariosSitio.ts`.

type Mensaje = {
  id: string; nombre: string | null; email: string | null; mensaje: string | null; motivo: string;
  proyecto_slug: string | null; proyecto_titulo: string | null; origen: string | null; estado: string;
  aviso_enviado_at: string | null; datos_borrados_at: string | null; created_at: string;
};
type Suscriptor = { id: string; email: string; estado: string; origen: string | null; confirmado_at: string | null; correo_enviado_at: string | null; created_at: string };
type Panel = {
  pagina: { id: string; titulo: string; nombre: string; escaparate: boolean };
  correo_activo: boolean; contacto: string | null;
  cifras: { mensajes_nuevos: number; mensajes: number; confirmados: number; pendientes: number; sin_correo: number; bajas: number };
  mensajes: Mensaje[]; suscriptores: Suscriptor[];
};

const ESTADOS: Record<string, { nombre: string; clase: string }> = {
  nuevo: { nombre: 'Nuevo', clase: 'bg-amber-100 text-amber-800' },
  leido: { nombre: 'Leído', clase: 'bg-slate-100 text-slate-600' },
  respondido: { nombre: 'Respondido', clase: 'bg-emerald-50 text-emerald-700' },
  archivado: { nombre: 'Archivado', clase: 'bg-slate-100 text-slate-500' },
};
const FILTROS = [['abiertos', 'Por atender'], ['todos', 'Todos'], ['respondido', 'Respondidos'], ['archivado', 'Archivados']] as const;

const json = (r: Response) => r.json().catch(() => ({}));
const pedir = (url: string, metodo = 'GET', cuerpo?: any) => fetch(url, {
  method: metodo, credentials: 'include',
  headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
  body: cuerpo ? JSON.stringify(cuerpo) : undefined,
});
const fecha = (iso: string | null) => iso
  ? new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';
const sinAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function FormulariosSitio() {
  const { id = '' } = useParams();
  const base = `/api/sitio/${encodeURIComponent(id)}/formularios`;
  const [p, setP] = useState<Panel | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [pestana, setPestana] = useState<'mensajes' | 'boletin'>('mensajes');
  const [aviso, setAviso] = useState<{ texto: string; error?: boolean } | null>(null);
  const refPestanas = useRef<HTMLDivElement>(null);

  const cargar = () => pedir(base).then(async r => {
    const j = await json(r);
    if (!r.ok) { setFallo(j.error || 'No se ha podido cargar.'); return; }
    setP(j);
  }).catch(() => setFallo('No se ha podido cargar.'));
  useEffect(() => { cargar(); }, [id]);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 5000); return () => clearTimeout(t); }, [aviso]);

  const accion: Accion = async (r, ok) => {
    const res = await r.catch(() => null);
    const j = res ? await json(res) : {};
    if (!res || !res.ok) setAviso({ texto: j.error || 'No se ha podido.', error: true });
    else { setAviso({ texto: typeof ok === 'function' ? ok(j) : ok }); await cargar(); }
    return j;
  };

  if (fallo) return <div className="mx-auto max-w-3xl p-6"><p className="rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{fallo}</p></div>;
  if (!p) return <div className="grid min-h-[50vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>;

  const c = p.cifras;
  // LAS PESTAÑAS, COMO PESTAÑAS (revisión del 2026-11-07): `role="tab"` pedía también
  // `aria-controls`, su `tabpanel` y moverse con las flechas (patrón de la WAI-ARIA):
  // Tab entra en la pestaña elegida y las flechas, Inicio y Fin cambian de una a otra.
  const PESTANAS = ['mensajes', 'boletin'] as const;
  const teclaPestana = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = PESTANAS.indexOf(pestana);
    const j = e.key === 'ArrowRight' ? (i + 1) % PESTANAS.length
      : e.key === 'ArrowLeft' ? (i - 1 + PESTANAS.length) % PESTANAS.length
      : e.key === 'Home' ? 0 : e.key === 'End' ? PESTANAS.length - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    setPestana(PESTANAS[j]);
    refPestanas.current?.querySelector<HTMLButtonElement>(`#pestana-${PESTANAS[j]}`)?.focus();
  };
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Link to={`/paginas/${id}`} className="inline-flex h-9 items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-3.5 w-3.5" /> Volver a la página
      </Link>
      <div className="mt-2">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Mensajes y boletín</h1>
        <p className="text-sm text-slate-500">de «{p.pagina.nombre || p.pagina.titulo || 'Sin título'}»</p>
      </div>

      <div className={cn('mt-4 flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm leading-relaxed', p.correo_activo ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900')}>
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {p.correo_activo
          ? <p>Cada mensaje nuevo avisa por correo a <strong>{p.contacto || 'la dirección de contacto del pie (no hay ninguna puesta)'}</strong>, con «Responder» hacia quien escribió. Las altas del boletín se confirman desde el correo.</p>
          : <p>El correo de la plataforma todavía no está configurado. Los mensajes se guardan aquí, pero no llega ningún aviso: <strong>pásate por esta pantalla de vez en cuando</strong>. Las altas del boletín quedan pendientes de confirmar hasta que se pueda mandar el correo de confirmación.</p>}
      </div>

      {!p.pagina.escaparate && <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Esta web ya no es un escaparate: sus formularios no aceptan envíos nuevos. Lo que llegó sigue aquí.</p>}

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cifra icono={<CircleDot className="h-4 w-4" />} valor={c.mensajes_nuevos} texto="Mensajes nuevos" tono={c.mensajes_nuevos ? 'ambar' : undefined} />
        <Cifra icono={<Inbox className="h-4 w-4" />} valor={c.mensajes} texto="Mensajes en total" />
        <Cifra icono={<MailCheck className="h-4 w-4" />} valor={c.confirmados} texto="Suscriptores confirmados" />
        <Cifra icono={<Clock className="h-4 w-4" />} valor={c.pendientes} texto="Pendientes de confirmar" />
      </dl>

      {aviso && <p role="status" className={cn('mt-4 rounded-xl px-3 py-2 text-sm font-bold', aviso.error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800')}>{aviso.texto}</p>}

      <div ref={refPestanas} className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="Mensajes y boletín">
        {([['mensajes', 'Mensajes', Inbox, c.mensajes_nuevos], ['boletin', 'Boletín', Mail, c.confirmados + c.pendientes]] as const).map(([k, t, Ic, n]) => (
          <button key={k} id={`pestana-${k}`} role="tab" aria-selected={pestana === k} aria-controls={`panel-${k}`} tabIndex={pestana === k ? 0 : -1}
            onClick={() => setPestana(k)} onKeyDown={teclaPestana}
            className={cn('-mb-px flex h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-bold transition-colors',
              pestana === k ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800')}>
            <Ic className="h-4 w-4" aria-hidden /> {t}
            {n > 0 && <span className={cn('rounded-full px-1.5 text-[11px]', k === 'mensajes' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')}>{n}</span>}
          </button>
        ))}
      </div>
      <div className="mt-4" id={`panel-${pestana}`} role="tabpanel" aria-labelledby={`pestana-${pestana}`}>
        {pestana === 'mensajes'
          ? <PestanaMensajes panel={p} base={base} accion={accion} />
          : <PestanaBoletin panel={p} base={base} accion={accion} />}
      </div>
    </div>
  );
}

function Cifra({ icono, valor, texto, tono }: { icono: ReactNode; valor: number; texto: string; tono?: 'ambar' }) {
  return (
    <div className={cn('rounded-2xl border p-4', tono === 'ambar' ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-white')}>
      <dt className="flex items-center gap-1.5 text-xs font-bold text-slate-500">{icono} {texto}</dt>
      <dd className="mt-1 text-2xl font-black tabular-nums text-slate-900">{valor.toLocaleString('es-ES')}</dd>
    </div>
  );
}

type Accion = (r: Promise<Response>, ok: string | ((j: any) => string)) => Promise<any>;

// ── MENSAJES ────────────────────────────────────────────────────────────────

function PestanaMensajes({ panel, base, accion }: { panel: Panel; base: string; accion: Accion }) {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number][0]>('abiertos');
  const [motivo, setMotivo] = useState('');
  const [q, setQ] = useState('');
  const lista = useMemo(() => {
    const b = sinAcentos(q.trim());
    return panel.mensajes.filter(m =>
      (filtro === 'todos' || (filtro === 'abiertos' ? m.estado === 'nuevo' || m.estado === 'leido' : m.estado === filtro))
      && (!motivo || m.motivo === motivo)
      && (!b || sinAcentos([m.nombre, m.email, m.mensaje, m.proyecto_titulo].filter(Boolean).join(' ')).includes(b)));
  }, [panel.mensajes, filtro, motivo, q]);
  const cuenta = (f: string) => panel.mensajes.filter(m => f === 'todos' || (f === 'abiertos' ? m.estado === 'nuevo' || m.estado === 'leido' : m.estado === f)).length;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map(([k, t]) => (
          <button key={k} onClick={() => setFiltro(k)} aria-pressed={filtro === k}
            className={cn('h-9 rounded-full border px-3.5 text-sm font-bold transition-colors', filtro === k ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400')}>
            {t} <span className={filtro === k ? 'text-white/70' : 'text-slate-400'}>{cuenta(k)}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, correo o texto" aria-label="Buscar en los mensajes"
            className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-base outline-none focus:border-slate-400 sm:text-sm" />
        </div>
        <div className="relative">
          <select value={motivo} onChange={e => setMotivo(e.target.value)} aria-label="Filtrar por cómo quiere colaborar"
            className="h-11 appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-sm text-slate-700">
            <option value="">Todas las formas de colaborar</option>
            {MOTIVOS.map(m => <option key={m.id} value={m.id}>{m.texto}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
        <a href={`${base}/mensajes.csv`} className="flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
          <Download className="h-4 w-4" /> CSV
        </a>
      </div>

      <ul className="mt-4 space-y-3">
        {lista.length === 0 && (
          <li className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            {panel.mensajes.length ? 'Ningún mensaje con ese filtro.' : 'Todavía no ha llegado ningún mensaje. Cuando alguien escriba desde el formulario de colaborar de la web, aparecerá aquí.'}
          </li>
        )}
        {lista.map(m => <TarjetaMensaje key={m.id} m={m} base={base} accion={accion} sitio={panel.pagina.nombre} />)}
      </ul>
    </div>
  );
}

function TarjetaMensaje({ m, base, accion, sitio }: { m: Mensaje; base: string; accion: Accion; sitio: string }) {
  const [abierto, setAbierto] = useState(m.estado === 'nuevo');
  const borrado = !!m.datos_borrados_at;
  const largo = (m.mensaje || '').length > 420;
  const estado = (e: string, ok: string) => accion(pedir(`${base}/mensajes/${m.id}`, 'PUT', { estado: e }), ok);
  // Codificado (`enlaceCorreo`): la dirección la escribió alguien de fuera.
  const responder = m.email ? enlaceCorreo(m.email, `Tu mensaje a ${sitio}`) : null;
  const boton = 'inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors';
  return (
    <li className={cn('rounded-2xl border bg-white p-4 sm:p-5', m.estado === 'nuevo' ? 'border-amber-200 shadow-sm' : 'border-slate-200')}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', ESTADOS[m.estado]?.clase)}>{ESTADOS[m.estado]?.nombre || m.estado}</span>
            <span className="text-base font-black text-slate-900">{borrado ? 'Datos borrados' : m.nombre}</span>
            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">{textoMotivo(m.motivo)}</span>
            {m.proyecto_titulo && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">{m.proyecto_titulo}</span>}
          </p>
          {!borrado && m.email && <p className="mt-1 truncate text-sm text-slate-500"><a href={enlaceCorreo(m.email)} className="hover:underline">{m.email}</a></p>}
        </div>
        <p className="shrink-0 text-xs text-slate-500" title={m.aviso_enviado_at ? `Aviso por correo: ${fecha(m.aviso_enviado_at)}` : undefined}>{fecha(m.created_at)}</p>
      </div>

      {!borrado && m.mensaje && (
        <div className="mt-3">
          <p className={cn('whitespace-pre-line break-words text-[15px] leading-relaxed text-slate-700', !abierto && largo && 'line-clamp-4')}>{m.mensaje}</p>
          {largo && <button onClick={() => setAbierto(v => !v)} className="mt-1 text-sm font-bold text-emerald-700 hover:underline">{abierto ? 'Ver menos' : 'Leer entero'}</button>}
          {m.origen && <p className="mt-2 text-xs text-slate-400">Enviado desde {m.origen}</p>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {responder && (
          <a href={responder} className={cn(boton, 'bg-slate-900 text-white hover:bg-slate-700')}><Reply className="h-3.5 w-3.5" /> Responder</a>
        )}
        {!borrado && m.estado !== 'respondido' && (
          <button onClick={() => estado('respondido', 'Marcado como respondido.')} className={cn(boton, 'border border-slate-200 text-slate-700 hover:bg-slate-50')}><Check className="h-3.5 w-3.5" /> Respondido</button>
        )}
        {m.estado === 'nuevo' && (
          <button onClick={() => estado('leido', 'Marcado como leído.')} className={cn(boton, 'border border-slate-200 text-slate-700 hover:bg-slate-50')}><MailCheck className="h-3.5 w-3.5" /> Leído</button>
        )}
        {m.estado !== 'archivado'
          ? <button onClick={() => estado('archivado', 'Archivado.')} className={cn(boton, 'text-slate-600 hover:bg-slate-100')}><Archive className="h-3.5 w-3.5" /> Archivar</button>
          : !borrado && <button onClick={() => estado('leido', 'Devuelto a «Por atender».')} className={cn(boton, 'text-slate-600 hover:bg-slate-100')}><Inbox className="h-3.5 w-3.5" /> Desarchivar</button>}
        {!borrado && (
          <button onClick={() => {
            if (!window.confirm(`¿Borrar el nombre, el correo y el mensaje de ${m.nombre}? Es lo que hay que hacer si te pide que borres sus datos. No se puede deshacer.`)) return;
            accion(pedir(`${base}/mensajes/${m.id}`, 'DELETE'), 'Datos borrados: queda solo la fecha y la forma de colaborar.');
          }} className={cn(boton, 'ml-auto text-rose-600 hover:bg-rose-50')}><Trash2 className="h-3.5 w-3.5" /> Borrar sus datos</button>
        )}
      </div>
    </li>
  );
}

// ── BOLETÍN ─────────────────────────────────────────────────────────────────

function PestanaBoletin({ panel, base, accion }: { panel: Panel; base: string; accion: Accion }) {
  const [filtro, setFiltro] = useState<'todos' | 'confirmado' | 'pendiente'>('todos');
  const [q, setQ] = useState('');
  const [enviando, setEnviando] = useState(false);
  const lista = panel.suscriptores.filter(s => (filtro === 'todos' || s.estado === filtro) && (!q.trim() || s.email.includes(q.trim().toLowerCase())));
  const c = panel.cifras;

  const confirmaciones = async () => {
    setEnviando(true);
    await accion(pedir(`${base}/confirmaciones`, 'POST'),
      j => j.fallidos ? `Enviados ${j.enviados}; ${j.fallidos} no han salido (se pueden volver a intentar).` : `Enviados ${j.enviados} correos de confirmación.`);
    setEnviando(false);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {([['todos', 'Todos', c.confirmados + c.pendientes], ['confirmado', 'Confirmados', c.confirmados], ['pendiente', 'Pendientes', c.pendientes]] as const).map(([k, t, n]) => (
          <button key={k} onClick={() => setFiltro(k)} aria-pressed={filtro === k}
            className={cn('h-9 rounded-full border px-3.5 text-sm font-bold transition-colors', filtro === k ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400')}>
            {t} <span className={filtro === k ? 'text-white/70' : 'text-slate-400'}>{n}</span>
          </button>
        ))}
        {c.bajas > 0 && <span className="ml-1 text-xs text-slate-500">{c.bajas} {c.bajas === 1 ? 'baja' : 'bajas'} (sus direcciones ya están borradas)</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar un correo" aria-label="Buscar un correo"
            className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-base outline-none focus:border-slate-400 sm:text-sm" />
        </div>
        {panel.correo_activo && c.sin_correo > 0 && (
          <button onClick={confirmaciones} disabled={enviando} className="flex h-11 items-center gap-1.5 rounded-xl bg-amber-400 px-3 text-sm font-black text-slate-900 hover:bg-amber-300 disabled:opacity-60">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Pedir confirmación a {c.sin_correo}
          </button>
        )}
        {/* Sólo los confirmados (el servidor los filtra): es el fichero que se lleva a una herramienta de envío. */}
        <a href={`${base}/suscriptores.csv`} className="flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
          <Download className="h-4 w-4" aria-hidden /> Confirmados (CSV)
        </a>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">Cuando mandes un boletín, envíalo solo a los <strong>confirmados</strong> y con un enlace para darse de baja: es lo que promete la política de privacidad de la web. Las altas sin confirmar se borran solas {PLAZO_CONFIRMAR_DIAS} días después del correo de confirmación.</p>

      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {lista.length === 0
          ? <p className="p-8 text-center text-sm text-slate-500">{panel.suscriptores.length ? 'Nadie con ese filtro.' : 'Todavía no se ha apuntado nadie. El alta está en el pie de todas las páginas de la web.'}</p>
          : lista.map(s => (
            // El estado junto a la dirección y la baja siempre a la derecha: en el teléfono, la fila
            // se partía y el botón de baja caía solo a una línea de abajo.
            <div key={s.id} className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
              <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-black uppercase text-slate-500">{s.email.charAt(0)}</span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 max-w-full truncate text-sm font-bold text-slate-800">{s.email}</span>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold', s.estado === 'confirmado' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800')}>
                    {s.estado === 'confirmado' ? 'Confirmado' : 'Pendiente'}
                  </span>
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  Alta: {fecha(s.created_at)}
                  {s.origen ? ` desde ${s.origen === '/' ? 'la portada' : s.origen}` : ''}
                  {s.estado === 'confirmado' ? ` · Confirmó: ${fecha(s.confirmado_at)}` : s.correo_enviado_at ? ` · Enlace enviado: ${fecha(s.correo_enviado_at)}` : ' · Sin correo de confirmación todavía'}
                </p>
              </div>
              <button onClick={() => {
                if (!window.confirm(`¿Dar de baja a ${s.email}? Se borra su dirección y no se puede deshacer.`)) return;
                accion(pedir(`${base}/suscriptores/${s.id}`, 'DELETE'), 'Baja hecha: su dirección se ha borrado.');
              }} aria-label={`Dar de baja a ${s.email}`} title="Dar de baja y borrar la dirección"
                className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                <UserMinus className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

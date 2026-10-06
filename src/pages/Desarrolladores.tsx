import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Loader2, Plus, RefreshCw, Send, Trash2, Webhook } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

// ============================================================================
// /desarrolladores — LA API PÚBLICA Y LOS WEBHOOKS (2026-10-06, #24)
// ============================================================================
// Documentación (para cualquiera) y, con sesión, la gestión de tus claves de
// API y tus webhooks. Lo que se enseña aquí es exactamente lo que hace el
// servidor (`apiPublica.ts` y `webhooks.ts`): si cambia uno, cambia el otro.
// Sin traducir al inglés todavía (ver el estado en `src/i18n/index.ts`).

const BASE = 'https://humanity.wiki/api/v1';

function Codigo({ children }: { children: string }) {
  return <pre className="my-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-800"><code>{children}</code></pre>;
}

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-16">
      <h2 className="mb-2 text-lg font-black text-slate-900">{titulo}</h2>
      <div className="space-y-2 text-[14px] leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

const ENDPOINTS: [string, string, string, string][] = [
  ['GET', '/me', 'lectura', 'Quién eres y qué alcance tiene la clave.'],
  ['GET', '/pages', 'lectura', 'Tus páginas y las que te han compartido (`limit`, `cursor`).'],
  ['GET', '/pages/{id}', 'lectura', 'Una página: título, `markdown`, `blocks` y `version`.'],
  ['POST', '/pages', 'escritura', 'Crea una página: `{ "title", "markdown", "folder_id" }`.'],
  ['PATCH', '/pages/{id}', 'escritura', 'Cambia `title` y/o `markdown`. Con `version` detecta ediciones simultáneas (409).'],
  ['GET', '/databases', 'lectura', 'Tus bases de datos.'],
  ['GET', '/databases/{id}', 'lectura', 'Su esquema: columnas con su tipo.'],
  ['GET', '/databases/{id}/rows', 'lectura', 'Las filas, ya calculadas (`limit`, `cursor`).'],
  ['GET', '/databases/{id}/rows/{rowId}', 'lectura', 'Una fila.'],
  ['POST', '/databases/{id}/rows', 'escritura', 'Crea una fila: `{ "values": { "Nombre": "…", "Importe": 12 } }`.'],
  ['PATCH', '/databases/{id}/rows/{rowId}', 'escritura', 'Cambia celdas de una fila: `{ "values": { … } }`.'],
];

const EJEMPLO_NODE = `import crypto from 'node:crypto';

// Express: usa el cuerpo SIN parsear (express.raw) para firmar sobre los mismos bytes.
app.post('/humanity', express.raw({ type: 'application/json' }), (req, res) => {
  const [t, v1] = req.get('X-Humanity-Signature').split(',').map(p => p.split('=')[1]);
  const esperada = crypto.createHmac('sha256', process.env.HUMANITY_WEBHOOK_SECRET)
    .update(t + '.' + req.body.toString()).digest('hex');
  const valida = esperada.length === v1.length &&
    crypto.timingSafeEqual(Buffer.from(esperada), Buffer.from(v1));
  if (!valida || Math.abs(Date.now() / 1000 - Number(t)) > 300) return res.sendStatus(400);
  const evento = JSON.parse(req.body.toString());   // { id, event, created_at, data }
  res.sendStatus(200);                               // responde rápido; trabaja después
});`;

type Clave = { id: string; nombre: string; prefijo: string; alcance: string; creada_en: string; ultimo_uso: string | null; revocada_en: string | null };
type Hook = { id: string; url: string; eventos: string[]; activo: boolean; motivo_pausa: string | null; fallos_seguidos: number; ultima_entrega: string | null; pendientes: number };
type Entrega = { id: string; evento: string; estado: string; intentos: number; ultimo_codigo: number | null; ultimo_error: string | null; creada_en: string; proximo_intento: string };

const fecha = (s: string | null) => (s ? new Date(s).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const pedir = async (url: string, init?: RequestInit) => {
  const r = await fetch(url, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...init });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Ha fallado. Prueba otra vez.');
  return j;
};

function Secreto({ texto, etiqueta, onCerrar }: { texto: string; etiqueta: string; onCerrar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div role="status" className="my-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
      <p className="text-[13px] font-bold text-amber-900">{etiqueta} Cópiala ahora: no se vuelve a enseñar.</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-white px-2 py-1.5 text-[12px] text-slate-900">{texto}</code>
        <button type="button" onClick={() => { navigator.clipboard?.writeText(texto).then(() => setCopiado(true)).catch(() => {}); }}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[12px] font-bold text-white">
          {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copiado ? 'Copiada' : 'Copiar'}
        </button>
        <button type="button" onClick={onCerrar} className="text-[12px] font-bold text-amber-800 hover:underline">Ya la he guardado</button>
      </div>
    </div>
  );
}

function Claves() {
  const [claves, setClaves] = useState<Clave[] | null>(null);
  const [nombre, setNombre] = useState('');
  const [alcance, setAlcance] = useState<'lectura' | 'escritura'>('lectura');
  const [nueva, setNueva] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cargar = useCallback(() => { pedir('/api/desarrolladores/claves').then(j => setClaves(j.claves)).catch(e => setError(e.message)); }, []);
  useEffect(cargar, [cargar]);
  const crear = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    try { const j = await pedir('/api/desarrolladores/claves', { method: 'POST', body: JSON.stringify({ nombre, alcance }) }); setNueva(j.clave); setNombre(''); cargar(); }
    catch (er: any) { setError(er.message); }
  };
  const revocar = async (c: Clave) => {
    if (!window.confirm(`¿Revocar la clave «${c.nombre}»? Lo que la use dejará de funcionar al instante.`)) return;
    try { await pedir(`/api/desarrolladores/claves/${c.id}`, { method: 'DELETE' }); cargar(); } catch (er: any) { setError(er.message); }
  };
  return (
    <div>
      {nueva && <Secreto texto={nueva} etiqueta="Esta es tu clave de API." onCerrar={() => setNueva(null)} />}
      <form onSubmit={crear} className="flex flex-wrap items-end gap-2">
        <label className="text-[12px] font-bold text-slate-500">Nombre
          <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Zapier, mi script…" maxLength={60} required
            className="mt-1 block h-9 w-52 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-normal text-slate-800 outline-none focus:border-emerald-400" />
        </label>
        <label className="text-[12px] font-bold text-slate-500">Alcance
          <select value={alcance} onChange={e => setAlcance(e.target.value as any)} className="mt-1 block h-9 rounded-lg border border-slate-200 bg-white px-2 text-[13px] font-normal text-slate-800">
            <option value="lectura">Solo lectura</option>
            <option value="escritura">Lectura y escritura</option>
          </select>
        </label>
        <button type="submit" className="inline-flex h-9 items-center gap-1 rounded-lg bg-slate-900 px-3 text-[13px] font-bold text-white hover:bg-slate-800"><Plus className="h-4 w-4" /> Crear clave</button>
      </form>
      {error && <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[12px] font-bold text-rose-700">{error}</p>}
      {claves === null ? <p className="mt-3 flex items-center gap-2 text-[13px] text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</p> : (
        <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {claves.length === 0 && <li className="px-3 py-3 text-[13px] text-slate-500">Todavía no tienes claves.</li>}
          {claves.map(c => (
            <li key={c.id} className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5', c.revocada_en && 'opacity-50')}>
              <KeyRound className="h-4 w-4 text-slate-400" />
              <span className="font-bold text-slate-900">{c.nombre}</span>
              <code className="text-[12px] text-slate-500">{c.prefijo}…</code>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{c.alcance === 'escritura' ? 'lectura y escritura' : 'solo lectura'}</span>
              <span className="text-[11px] text-slate-400">creada {fecha(c.creada_en)} · último uso {fecha(c.ultimo_uso)}</span>
              <span className="flex-1" />
              {c.revocada_en ? <span className="text-[12px] font-bold text-slate-400">revocada</span>
                : <button type="button" onClick={() => revocar(c)} className="inline-flex items-center gap-1 text-[12px] font-bold text-rose-600 hover:underline"><Trash2 className="h-3.5 w-3.5" /> Revocar</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Webhooks() {
  const [hooks, setHooks] = useState<Hook[] | null>(null);
  const [eventos, setEventos] = useState<string[]>([]);
  const [url, setUrl] = useState('');
  const [marcados, setMarcados] = useState<string[]>(['row.created', 'row.updated']);
  const [secreto, setSecreto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [entregas, setEntregas] = useState<Entrega[] | null>(null);
  const cargar = useCallback(() => { pedir('/api/desarrolladores/webhooks').then(j => { setHooks(j.webhooks); setEventos(j.eventos); }).catch(e => setError(e.message)); }, []);
  useEffect(cargar, [cargar]);
  const verEntregas = useCallback((id: string) => { pedir(`/api/desarrolladores/webhooks/${id}/entregas`).then(j => setEntregas(j.entregas)).catch(e => setError(e.message)); }, []);
  useEffect(() => { if (!abierto) { setEntregas(null); return; } verEntregas(abierto); const t = setInterval(() => verEntregas(abierto), 5000); return () => clearInterval(t); }, [abierto, verEntregas]);
  const act = async (f: () => Promise<any>) => { setError(null); try { await f(); cargar(); if (abierto) verEntregas(abierto); } catch (e: any) { setError(e.message); } };
  const crear = (e: React.FormEvent) => {
    e.preventDefault();
    void act(async () => { const j = await pedir('/api/desarrolladores/webhooks', { method: 'POST', body: JSON.stringify({ url, eventos: marcados }) }); setSecreto(j.secreto); setUrl(''); });
  };
  return (
    <div>
      {secreto && <Secreto texto={secreto} etiqueta="Este es el secreto con el que se firman los envíos." onCerrar={() => setSecreto(null)} />}
      <form onSubmit={crear} className="space-y-2">
        <label className="block text-[12px] font-bold text-slate-500">Dirección (https, pública)
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://tu-servidor.com/humanity" required type="url"
            className="mt-1 block h-9 w-full max-w-xl rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-normal text-slate-800 outline-none focus:border-emerald-400" />
        </label>
        <div className="flex flex-wrap items-center gap-3 text-[13px] text-slate-700">
          {eventos.map(ev => (
            <label key={ev} className="inline-flex items-center gap-1.5">
              <input type="checkbox" checked={marcados.includes(ev)} onChange={e => setMarcados(m => (e.target.checked ? [...m, ev] : m.filter(x => x !== ev)))} /> <code className="text-[12px]">{ev}</code>
            </label>
          ))}
          <button type="submit" className="inline-flex h-9 items-center gap-1 rounded-lg bg-slate-900 px-3 text-[13px] font-bold text-white hover:bg-slate-800"><Plus className="h-4 w-4" /> Crear webhook</button>
        </div>
      </form>
      {error && <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[12px] font-bold text-rose-700">{error}</p>}
      {hooks === null ? <p className="mt-3 flex items-center gap-2 text-[13px] text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</p> : (
        <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {hooks.length === 0 && <li className="px-3 py-3 text-[13px] text-slate-500">Todavía no tienes webhooks.</li>}
          {hooks.map(h => (
            <li key={h.id} className="px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Webhook className="h-4 w-4 text-slate-400" />
                <span className="min-w-0 truncate font-bold text-slate-900" title={h.url}>{h.url}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', h.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800')}>{h.activo ? 'activo' : 'pausado'}</span>
                <span className="text-[11px] text-slate-400">{h.eventos.join(', ')}</span>
                <span className="flex-1" />
                <button type="button" onClick={() => setAbierto(a => (a === h.id ? null : h.id))} className="text-[12px] font-bold text-slate-600 hover:underline">{abierto === h.id ? 'Ocultar registro' : 'Registro de entregas'}</button>
                <button type="button" onClick={() => act(() => pedir(`/api/desarrolladores/webhooks/${h.id}/probar`, { method: 'POST' }))} className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-700 hover:underline"><Send className="h-3.5 w-3.5" /> Probar</button>
                <button type="button" onClick={() => act(() => pedir(`/api/desarrolladores/webhooks/${h.id}`, { method: 'PUT', body: JSON.stringify({ activo: !h.activo }) }))} className="text-[12px] font-bold text-slate-600 hover:underline">{h.activo ? 'Pausar' : 'Reanudar'}</button>
                <button type="button" onClick={() => act(async () => { if (!window.confirm('¿Regenerar el secreto? El anterior dejará de valer.')) return; const j = await pedir(`/api/desarrolladores/webhooks/${h.id}/regenerar`, { method: 'POST' }); setSecreto(j.secreto); })} className="inline-flex items-center gap-1 text-[12px] font-bold text-slate-600 hover:underline"><RefreshCw className="h-3.5 w-3.5" /> Secreto</button>
                <button type="button" onClick={() => act(async () => { if (!window.confirm('¿Borrar este webhook y su registro?')) return; await pedir(`/api/desarrolladores/webhooks/${h.id}`, { method: 'DELETE' }); })} className="inline-flex items-center gap-1 text-[12px] font-bold text-rose-600 hover:underline"><Trash2 className="h-3.5 w-3.5" /> Borrar</button>
              </div>
              {h.motivo_pausa && !h.activo && <p className="mt-1 text-[12px] font-bold text-amber-800">{h.motivo_pausa}</p>}
              {abierto === h.id && (
                <div className="mt-2 overflow-x-auto rounded-lg border border-slate-100">
                  {entregas === null ? <p className="p-2 text-[12px] text-slate-500">Cargando…</p> : entregas.length === 0 ? <p className="p-2 text-[12px] text-slate-500">Aún no hay entregas. Pulsa «Probar».</p> : (
                    <table className="w-full text-left text-[12px]">
                      <thead className="text-slate-400"><tr><th className="p-1.5">Cuándo</th><th>Evento</th><th>Estado</th><th>Intentos</th><th>Respuesta</th><th /></tr></thead>
                      <tbody>
                        {entregas.map(en => (
                          <tr key={en.id} className="border-t border-slate-100">
                            <td className="p-1.5 whitespace-nowrap">{fecha(en.creada_en)}</td>
                            <td><code>{en.evento}</code></td>
                            <td className={cn('font-bold', en.estado === 'ok' ? 'text-emerald-700' : en.estado === 'fallo' ? 'text-rose-600' : 'text-amber-700')}>
                              {en.estado === 'pendiente' && en.intentos > 0 ? `reintentará ${fecha(en.proximo_intento)}` : en.estado}
                            </td>
                            <td>{en.intentos}</td>
                            <td className="max-w-[18rem] truncate" title={en.ultimo_error || ''}>{en.ultimo_codigo ?? ''} {en.ultimo_error || ''}</td>
                            <td>{en.estado === 'fallo' && <button type="button" className="font-bold text-emerald-700 hover:underline" onClick={() => act(() => pedir(`/api/desarrolladores/entregas/${en.id}/reintentar`, { method: 'POST' }))}>Reintentar</button>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Desarrolladores() {
  const { user } = useAuth();
  useEffect(() => { document.title = 'Desarrolladores · API y webhooks'; }, []);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-black tracking-tight text-slate-900">Desarrolladores</h1>
      <p className="mt-1 text-[14px] text-slate-600">Conecta humanity.wiki con tus herramientas: una API REST para leer y escribir páginas y bases de datos, y webhooks que te avisan cuando algo cambia.</p>
      <nav className="mt-3 flex flex-wrap gap-3 text-[13px] font-bold text-emerald-700">
        <a href="#empezar" className="hover:underline">Empezar</a><a href="#endpoints" className="hover:underline">Endpoints</a>
        <a href="#webhooks" className="hover:underline">Webhooks</a><a href="#gestion" className="hover:underline">Tus claves y webhooks</a>
      </nav>

      <Seccion id="empezar" titulo="Empezar">
        <p>1. Crea una clave abajo (en «Tus claves y webhooks»). Se muestra <b>una sola vez</b>; nosotros solo guardamos su huella, así que si la pierdes se crea otra.</p>
        <p>2. Mándala en la cabecera <code>Authorization</code>:</p>
        <Codigo>{`curl ${BASE}/pages?limit=5 \\\n  -H "Authorization: Bearer hw_live_..."`}</Codigo>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Alcance.</b> Una clave de <i>lectura</i> solo hace GET. Una de <i>lectura y escritura</i> también POST y PATCH.</li>
          <li><b>Permisos.</b> La clave ve y escribe lo mismo que tú, nunca más: las páginas que has creado o te han compartido, y las bases de datos que contienen. Una clave <b>nunca actúa como administradora</b>, aunque tú lo seas.</li>
          <li><b>Límite.</b> 120 peticiones por minuto (30 si escriben). Al pasarte: <code>429</code> con <code>Retry-After</code>. Cada respuesta trae <code>X-RateLimit-Remaining</code>.</li>
          <li><b>Errores.</b> JSON <code>{`{ "error": "…" }`}</code> con el código HTTP que toca: 400, 401, 403, 404, 409, 413, 429.</li>
          <li><b>Paginación.</b> <code>limit</code> (hasta 100) y <code>next_cursor</code>: pásalo como <code>cursor</code> para la página siguiente.</li>
          <li><b>CORS.</b> Abierto: la clave va en una cabecera, no en cookies, así que una web ajena no puede usar tu sesión contra la API.</li>
        </ul>
      </Seccion>

      <Seccion id="endpoints" titulo="Endpoints">
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="p-2">Método</th><th>Ruta</th><th>Clave</th><th>Qué hace</th></tr></thead>
            <tbody>
              {ENDPOINTS.map(([m, r, a, d]) => (
                <tr key={m + r} className="border-t border-slate-100 align-top">
                  <td className="p-2 font-black text-slate-800">{m}</td><td><code className="text-[12px]">{r}</code></td>
                  <td className="whitespace-nowrap text-[12px] text-slate-500">{a}</td><td className="pr-2 text-slate-600">{d.replace(/`/g, '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Las filas salen con <code>values</code> por nombre de columna (también vale el id de columna al escribir). Las relaciones son una lista de <code>{`{ id, label }`}</code>; una celda con error de cálculo sale como <code>{`{ "error": "…" }`}</code> y una vacía como <code>null</code>.</p>
        <Codigo>{`# Crear una fila\ncurl -X POST ${BASE}/databases/BDT.../rows \\\n  -H "Authorization: Bearer hw_live_..." -H "Content-Type: application/json" \\\n  -d '{"values": {"Nombre": "Pedido 17", "Importe": 125.5}}'\n\n# Crear una página desde Markdown\ncurl -X POST ${BASE}/pages \\\n  -H "Authorization: Bearer hw_live_..." -H "Content-Type: application/json" \\\n  -d '{"title": "Acta", "markdown": "# Reunión\\n\\n- Punto uno"}'`}</Codigo>
        <p>Si una celda no vale (un texto en una columna de números) no se crea ni se cambia <b>nada</b> y la respuesta dice qué columna falló.</p>
      </Seccion>

      <Seccion id="webhooks" titulo="Webhooks">
        <p>Cuando pasa algo en <b>lo tuyo</b> (tus bases de datos y tus páginas; nunca en lo que otra persona te ha compartido), enviamos un <code>POST</code> con JSON a tu dirección.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><code>row.created</code> y <code>row.updated</code>: una fila nueva o con celdas cambiadas. <code>data</code>: <code>database_id</code>, <code>database_title</code>, <code>row_id</code>, <code>values</code> (por nombre de columna, sin ficheros ni relaciones).</li>
          <li><code>page.published</code>: una página tuya se publica en la web. <code>data</code>: <code>page_id</code>, <code>title</code>, <code>slug</code>.</li>
          <li><code>ping</code>: el botón «Probar».</li>
        </ul>
        <Codigo>{`{ "id": "WD…", "event": "row.created", "created_at": "2026-10-06T10:00:00.000Z",\n  "data": { "database_id": "BDT…", "row_id": "BDF…", "values": { "Nombre": "Pedido 17" } } }`}</Codigo>
        <p><b>Firma.</b> Cada envío lleva <code>X-Humanity-Signature: t=&lt;segundos&gt;,v1=&lt;hmac&gt;</code>, con el HMAC-SHA256 de <code>"&lt;t&gt;.&lt;cuerpo&gt;"</code> y el secreto del webhook. Comprueba la firma y que <code>t</code> sea reciente (5 minutos) para rechazar envíos antiguos reenviados:</p>
        <Codigo>{EJEMPLO_NODE}</Codigo>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Respuesta.</b> Cualquier <code>2xx</code> cuenta como entregado. Responde en menos de 8 segundos.</li>
          <li><b>Reintentos.</b> Si falla (error de red o no-2xx) se reintenta a 1 min, 5 min, 30 min, 2 h y 12 h; después queda como «fallo» y puedes reintentarlo a mano. Tras 10 entregas fallidas seguidas el webhook se pausa solo.</li>
          <li><b>Registro.</b> Cada entrega, con su código y su error, se guarda 30 días (abajo, «Registro de entregas»).</li>
          <li><b>Seguridad de las direcciones.</b> Solo <code>https://</code>, puertos 443 y 8443, sin usuario ni contraseña en la URL. Se bloquean <code>localhost</code>, nombres internos y toda IP privada, de red local, reservada o de metadatos de la nube, y el nombre se vuelve a comprobar en cada envío. No se siguen redirecciones.</li>
          <li><b>Duplicados.</b> Un mismo evento puede llegar más de una vez si tu servidor tardó en responder: usa <code>X-Humanity-Delivery</code> (o el <code>id</code> del cuerpo) para ignorar repetidos.</li>
        </ul>
      </Seccion>

      <Seccion id="gestion" titulo="Tus claves y webhooks">
        {!user ? (
          <p className="rounded-xl bg-slate-50 p-3">Inicia sesión para crear claves y webhooks.</p>
        ) : (
          <div className="space-y-8">
            <div><h3 className="mb-2 text-[15px] font-black text-slate-900">Claves de API</h3><Claves /></div>
            <div><h3 className="mb-2 text-[15px] font-black text-slate-900">Webhooks</h3><Webhooks /></div>
          </div>
        )}
      </Seccion>
    </div>
  );
}

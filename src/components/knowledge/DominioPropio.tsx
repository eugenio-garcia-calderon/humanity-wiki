import { useEffect, useState } from 'react';
import { Globe, Loader2, Check, Copy, Trash2, AlertTriangle } from 'lucide-react';

// ============================================================================
// PONER TU PROPIO DOMINIO EN UNA PÁGINA — como en Notion (2026-08-22)
// ============================================================================
// Eugenio: «permitir que el usuario ponga su dominio propio en una de sus
// páginas como hace notion».
//
// ── LO DIFÍCIL AQUÍ NO ES EL FORMULARIO, ES LA ESPERA ───────────────────────
// Entre escribir el dominio y verlo funcionar hay un paso que no ocurre en
// esta pantalla ni en este servidor: cambiar el DNS en el panel donde se
// compró el dominio, y esperar a que se propague. Puede tardar minutos u
// horas, y durante ese rato TODO PARECE ROTO.
//
// Así que esta pantalla no dice «pendiente» y calla. Dice qué hay que poner,
// dónde, y qué va a pasar después. La causa más común de que alguien
// abandone no es que falle: es no saber si está esperando bien.

type Dominio = {
  id: string; dominio: string; estado: string; ultimo_error: string | null;
  pagina_id: string | null; pagina_titulo: string | null; activo_desde: string | null;
};

export default function DominioPropio({ paginaId }: { paginaId: string }) {
  const [dominios, setDominios] = useState<Dominio[] | null>(null);
  const [instrucciones, setInstrucciones] = useState<any>(null);
  const [escribiendo, setEscribiendo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasos, setPasos] = useState<string[] | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  async function cargar() {
    try {
      const r = await fetch('/api/dominios', { credentials: 'include' });
      if (!r.ok) { setDominios([]); return; }
      const j = await r.json();
      setDominios(j.dominios || []);
      setInstrucciones(j.instrucciones || null);
    } catch { setDominios([]); }
  }
  useEffect(() => { cargar(); }, []);

  async function anadir() {
    setError(null); setPasos(null);
    const d = escribiendo.trim();
    if (!d) return;
    setGuardando(true);
    try {
      const r = await fetch('/api/dominios', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dominio: d, pagina_id: paginaId }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j.error || 'No se ha podido guardar.'); setGuardando(false); return; }
      setPasos(j.pasos || null);
      setEscribiendo('');
      await cargar();
    } catch { setError('No hay conexión con el servidor.'); }
    setGuardando(false);
  }

  async function retirar(d: Dominio) {
    if (!window.confirm(`¿Quitar ${d.dominio}?\n\nDejará de servir esta página. El dominio sigue siendo tuyo y puedes volver a ponerlo.`)) return;
    await fetch(`/api/dominios/${d.id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ retirar: true }),
    });
    cargar();
  }

  function copiar(t: string, cual: string) {
    navigator.clipboard?.writeText(t);
    setCopiado(cual);
    window.setTimeout(() => setCopiado(null), 1500);
  }

  if (dominios === null) {
    return <p className="flex items-center gap-2 text-xs text-slate-400">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando…</p>;
  }

  // Los de esta página primero: son de los que se está hablando.
  const deEsta = dominios.filter(d => d.pagina_id === paginaId);
  const otros = dominios.filter(d => d.pagina_id !== paginaId);

  return (
    <div className="pt-3 mt-3 border-t border-slate-100">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5" /> Tu propio dominio
      </p>
      <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
        Si tienes un dominio comprado, esta página puede vivir ahí. Nadie verá que
        está alojada aquí.
      </p>

      {deEsta.map(d => (
        <div key={d.id} className="mt-2 p-2.5 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1">
              <a href={`https://${d.dominio}`} target="_blank" rel="noreferrer"
                 className="block font-mono text-xs text-slate-800 truncate hover:underline">
                {d.dominio}
              </a>
              <Estado d={d} />
            </span>
            <button onClick={() => retirar(d)} aria-label="Quitar este dominio"
              className="w-11 h-11 shrink-0 grid place-items-center rounded-xl hover:bg-slate-100">
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      ))}

      {deEsta.length === 0 && (
        <div className="mt-2 flex gap-2">
          {/* 16 px o más: por debajo, iOS hace zoom al tocar el campo. */}
          <input value={escribiendo} onChange={e => setEscribiendo(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); anadir(); } }}
            placeholder="midominio.com"
            className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-slate-200 text-base sm:text-sm
                       focus:border-emerald-400 focus:outline-none" />
          <button onClick={anadir} disabled={guardando || !escribiendo.trim()}
            className="h-11 px-4 shrink-0 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50">
            {guardando ? '…' : 'Añadir'}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] font-bold text-rose-600">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> {error}
        </p>
      )}

      {/* LO QUE HAY QUE HACER FUERA DE AQUÍ. Es la parte que se olvida y la que
          hace que alguien crea que no funciona: el DNS se cambia en el panel
          donde se compró el dominio, no en esta pantalla. */}
      {(pasos || deEsta.some(d => d.estado === 'pendiente')) && instrucciones && (
        <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-[11px] font-black text-amber-900">Falta un paso, y no es aquí</p>
          <p className="mt-1 text-[11px] text-amber-900/80 leading-relaxed">
            Entra donde compraste el dominio y crea estos dos registros:
          </p>
          <div className="mt-2 space-y-1.5">
            <Registro tipo="A" nombre={instrucciones.a.nombre} valor={instrucciones.a.valor}
              copiado={copiado === 'a'} onCopiar={() => copiar(instrucciones.a.valor, 'a')} />
            <Registro tipo="CNAME" nombre={instrucciones.cname.nombre} valor={instrucciones.cname.valor}
              copiado={copiado === 'cname'} onCopiar={() => copiar(instrucciones.cname.valor, 'cname')} />
          </div>
          <p className="mt-2 text-[11px] text-amber-900/80 leading-relaxed">
            Luego abre tu dominio en el navegador. El certificado de seguridad se
            crea solo en esa primera visita, y tarda unos segundos.
          </p>
          {/* EL MINUTO DE ESPERA, DICHO ANTES DE QUE OCURRA (2026-08-22).
              Lo señaló prog6 revisando: comprobamos el DNS y guardamos el
              resultado un minuto, también cuando sale que no. Eso protege de
              que golpear con dominios ajenos salga gratis, y a cambio quien
              ACABA de arreglar su DNS puede ver un error durante ese minuto.
              Decirlo antes cuesta una línea; no decirlo cuesta un «no me
              funciona» treinta segundos después. */}
          <p className="mt-1.5 text-[11px] text-amber-900/80 leading-relaxed">
            Si acabas de cambiar el DNS y todavía falla, espera un minuto y
            vuelve a probar: comprobamos el DNS una vez por minuto.
          </p>
        </div>
      )}

      {otros.length > 0 && (
        <p className="mt-2 text-[11px] text-slate-400">
          Tienes {otros.length} {otros.length === 1 ? 'dominio' : 'dominios'} más apuntando a otras páginas.
        </p>
      )}
    </div>
  );
}

/** Qué está pasando con este dominio, en una línea y sin tecnicismos. */
function Estado({ d }: { d: Dominio }) {
  if (d.estado === 'activo') {
    return <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
      <Check className="w-3 h-3" /> Funcionando
    </span>;
  }
  if (d.estado === 'fallo') {
    return <span className="text-[11px] text-rose-600">
      {/* El motivo tal cual, si lo hay. «Ha fallado» sin decir qué obliga a
          adivinar, y quien adivina mal cambia lo que no era. */}
      {d.ultimo_error || 'No se ha podido activar.'}
    </span>;
  }
  return <span className="text-[11px] text-amber-700">Esperando a que apunte aquí</span>;
}

function Registro({ tipo, nombre, valor, copiado, onCopiar }: {
  tipo: string; nombre: string; valor: string; copiado: boolean; onCopiar: () => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-amber-200">
      <span className="text-[10px] font-black text-amber-900 w-12 shrink-0">{tipo}</span>
      <span className="text-[10px] text-slate-500 w-8 shrink-0">{nombre}</span>
      <span className="font-mono text-[11px] text-slate-800 truncate flex-1">{valor}</span>
      <button onClick={onCopiar} aria-label={`Copiar el valor del registro ${tipo}`}
        className="w-8 h-8 shrink-0 grid place-items-center rounded-md hover:bg-amber-50">
        {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
      </button>
    </div>
  );
}

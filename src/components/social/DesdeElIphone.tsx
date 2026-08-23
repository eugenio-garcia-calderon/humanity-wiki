import { useEffect, useState } from 'react';
import { Loader2, Copy, Check, KeyRound, Smartphone, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// LA AGENDA DEL IPHONE SIN EXPORTAR NADA (2026-08-23)
// ============================================================================
// Eugenio: «haz que el importador de contactos funcione con el PWA de mi iPhone
// sin tener que exportarlo a un archivo y subirlo».
//
// Hay dos caminos y los dos están aquí, en el orden en que conviene probarlos:
//
//   1. ENCENDER EL SELECTOR. Safari trae el selector de contactos detrás de una
//      casilla experimental, apagada de fábrica. Un interruptor una vez y el
//      botón «De mi agenda» de al lado empieza a funcionar igual que en
//      Android: pantalla del sistema, marcas a quién traes, sin ficheros.
//   2. UN ATAJO. Toda la agenda de golpe, sin tocar ningún ajuste, y se puede
//      volver a ejecutar cuando quieras para traer lo nuevo. Es más pasos la
//      primera vez y ninguno las siguientes.
//
// ── POR QUÉ SE EXPLICA EL ATAJO EN VEZ DE DARLO HECHO ───────────────────────
// Un Atajo se reparte como fichero firmado o como enlace de iCloud, y las dos
// cosas salen de la aplicación Atajos de una persona — no se pueden generar
// desde un servidor. Se puede pedir a iOS que importe uno sin firmar, pero eso
// obliga a encender «Permitir atajos no fiables», que es pedirle a alguien que
// baje una protección de su teléfono para instalar algo nuestro. No merece la
// pena por ahorrar cuatro pasos que se dan una sola vez.

interface Estado { hay: boolean; creada: string | null; usada: string | null }

const cuandoFue = (iso: string | null) => {
  if (!iso) return null;
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} días`;
};

export default function DesdeElIphone() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [llave, setLlave] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  const mirar = () => {
    fetch('/api/agenda/llave', { credentials: 'include' })
      .then(r => r.json()).then(setEstado).catch(() => setEstado(null));
  };
  useEffect(mirar, []);

  const crear = async () => {
    setTrabajando(true);
    try {
      const r = await fetch('/api/agenda/llave', { method: 'POST', credentials: 'include' });
      const j = await r.json();
      if (j.llave) setLlave(j.llave);
      mirar();
    } finally { setTrabajando(false); }
  };

  const retirar = async () => {
    setTrabajando(true);
    try {
      await fetch('/api/agenda/llave', { method: 'DELETE', credentials: 'include' });
      setLlave(null);
      mirar();
    } finally { setTrabajando(false); }
  };

  const copiar = async (texto: string, cual: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(cual);
      setTimeout(() => setCopiado(c => (c === cual ? null : c)), 2000);
    } catch { /* sin portapapeles se puede seleccionar a mano */ }
  };

  const direccion = `${window.location.origin}/api/agenda/contactos`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 max-w-2xl">
      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
        <Smartphone className="w-4 h-4 text-slate-400" />
        Desde el iPhone, sin exportar ningún archivo
      </h3>

      {/* ── CAMINO 1 ── */}
      <div className="mt-3 rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-black text-slate-700">Lo más rápido: encender el selector de contactos</p>
        <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
          Safari sabe abrir la agenda, pero viene apagado de fábrica. En el iPhone:{' '}
          <b className="text-slate-700">Ajustes → Safari → Avanzado → Funciones experimentales</b>, y enciende{' '}
          <b className="text-slate-700">Contact Picker API</b>. Cierra la aplicación y vuelve a abrirla: el botón
          «De mi agenda» de aquí arriba ya funcionará, con la pantalla de contactos del sistema.
        </p>
        <p className="mt-1.5 text-[10px] text-slate-400">
          Es una función experimental de Apple: puede cambiar de sitio o desaparecer en una actualización. Si no
          la encuentras, usa el Atajo de abajo, que no depende de ningún ajuste.
        </p>
      </div>

      {/* ── CAMINO 2 ── */}
      <div className="mt-3 rounded-xl bg-slate-50 p-3">
        <p className="text-xs font-black text-slate-700">Sin tocar ajustes: un Atajo que manda toda la agenda</p>
        <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
          Se monta una vez y luego es un toque. Puedes volver a ejecutarlo cuando quieras: no duplica a nadie,
          reconoce a quien ya tienes por su número.
        </p>

        {!estado?.hay && !llave && (
          <button
            onClick={crear}
            disabled={trabajando}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {trabajando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
            Hacerme una llave
          </button>
        )}

        {/* LA LLAVE SE ENSEÑA UNA VEZ Y SE DICE QUE ES UNA VEZ. Guardar solo la
            huella es lo correcto; no avisar de que no se puede volver a ver
            sería dejar a alguien cerrando la pestaña y perdiéndola. */}
        {llave && (
          <div className="mt-2.5 rounded-lg bg-amber-50 border border-amber-200 p-2.5">
            <p className="text-[11px] font-black text-amber-900">
              Cópiala ahora: no se puede volver a ver
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <code className="flex-1 min-w-0 px-2 py-1.5 rounded bg-white text-[10px] font-mono text-slate-700 break-all">
                {llave}
              </code>
              <button
                onClick={() => copiar(llave, 'llave')}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded bg-amber-500 text-white text-[10px] font-bold hover:bg-amber-600 transition-colors"
              >
                {copiado === 'llave' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiado === 'llave' ? 'Copiada' : 'Copiar'}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-amber-800 leading-snug">
              Esta llave <b>solo sirve para añadir contactos a tu agenda</b>. No entra en tu cuenta, no lee
              mensajes y no cambia nada más. Si se te escapa, hazte otra: la anterior deja de valer.
            </p>
          </div>
        )}

        {estado?.hay && !llave && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
              <Check className="w-3 h-3" /> Tienes una llave activa
            </span>
            {/* CUÁNDO ENTRÓ ALGO POR ELLA. Es lo que convierte «he pulsado el
                Atajo y no sé si ha pasado algo» en una respuesta. */}
            <span className="text-[11px] text-slate-400">
              {estado.usada ? `Tu iPhone mandó contactos ${cuandoFue(estado.usada)}` : 'Todavía no ha entrado nada por ella'}
            </span>
            <button
              onClick={crear}
              disabled={trabajando}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-slate-200 text-[10px] font-bold text-slate-500 hover:border-slate-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Hacer otra
            </button>
            <button
              onClick={retirar}
              disabled={trabajando}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-rose-200 text-[10px] font-bold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Retirarla
            </button>
          </div>
        )}

        {/* LOS PASOS, SIEMPRE VISIBLES. Esconderlos detrás de «ver más» obliga a
            abrirlos justo cuando tienes el teléfono en la otra mano. */}
        <ol className="mt-3 space-y-1.5 text-[11px] text-slate-600 list-decimal list-inside leading-relaxed">
          <li>Abre <b>Atajos</b> en el iPhone y pulsa <b>+</b>.</li>
          <li>Añade <b>Buscar contactos</b>. Sin filtros, para que los coja todos.</li>
          <li>
            Añade <b>Obtener contenido de la URL</b> y pon esta dirección:
            <span className="mt-1 flex items-center gap-1.5">
              <code className="flex-1 min-w-0 px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-700 break-all">
                {direccion}
              </code>
              <button
                onClick={() => copiar(direccion, 'url')}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 text-[10px] font-bold text-slate-500 hover:border-slate-300 transition-colors"
              >
                {copiado === 'url' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </span>
          </li>
          <li>
            En esa acción: <b>Método POST</b>; en <b>Cabeceras</b>, una llamada{' '}
            <code className="px-1 rounded bg-white border border-slate-200 font-mono text-[10px]">Authorization</code>{' '}
            con el valor <code className="px-1 rounded bg-white border border-slate-200 font-mono text-[10px]">Bearer TU_LLAVE</code>.
          </li>
          <li>
            En <b>Cuerpo de la solicitud</b> elige <b>JSON</b>, añade un campo de tipo <b>Matriz</b> llamado{' '}
            <code className="px-1 rounded bg-white border border-slate-200 font-mono text-[10px]">contactos</code>, y dentro
            mete los contactos con <b>nombre</b> y <b>telefono</b>.
          </li>
          <li>Ponle nombre al Atajo y ejecútalo. Te dirá cuántos ha traído.</li>
        </ol>

        <p className="mt-2 text-[10px] text-slate-400 leading-snug">
          Si te lías con el paso 5, hay una salida más corta: monta el cuerpo como <b>texto</b>, con una línea por
          contacto en la forma <code className="font-mono">Nombre, +34600111222</code>. También se entiende.
        </p>
      </div>
    </div>
  );
}

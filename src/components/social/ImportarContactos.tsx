// ============================================================================
// TRAERSE LOS CONTACTOS DEL TELÉFONO (2026-08-22)
// ============================================================================
// Eugenio, en el hormiguero: «crear un sistema para sincronizar los contactos
// de mi teléfono y poder agregarles a proyectos, y también mandarles mensajes a
// través de WhatsApp, sea como sea».
//
// ── LO QUE UNA WEB PUEDE Y NO PUEDE HACER CON UNA AGENDA ────────────────────
// Conviene decirlo claro, porque marca lo que hay aquí:
//
//   · NINGUNA web puede leer la agenda por su cuenta. Ni ésta ni ninguna. Los
//     contactos los elige la persona, uno a uno o todos, y el navegador se los
//     entrega ya elegidos.
//   · El SELECTOR DE CONTACTOS del navegador (`navigator.contacts`) hace eso
//     mismo con una pantalla del sistema. Existe en Chrome de Android; en el
//     iPhone, no — Safari no lo ha implementado.
//   · Un fichero .VCF lo exporta cualquier teléfono, iPhone incluido, y
//     cualquiera lo puede leer. Es el camino que funciona en todos lados.
//
// Por eso hay DOS: el selector cuando el navegador lo tiene —un toque, sin
// ficheros— y el .vcf siempre. Con uno solo, media plataforma se quedaba fuera:
// con el selector, todos los iPhone; con el fichero, la comodidad.
//
// SE DICE CUÁL ESTÁ USANDO Y POR QUÉ. Un botón que en un teléfono abre una
// pantalla del sistema y en otro pide un fichero, sin explicar nada, parece
// roto en el segundo.
import { useRef, useState } from 'react';
import { UserPlus, Loader2, Upload, Check } from 'lucide-react';
import { leerVcf, normalizarTelefono } from '../../utils/telefono';
import { cn } from '../../utils/cn';

interface Contacto { nombre: string; telefono: string }

/** ¿Tiene este navegador el selector de contactos del sistema? */
const haySelector = () =>
  typeof navigator !== 'undefined'
  && 'contacts' in navigator
  && typeof (navigator as any).contacts?.select === 'function';

export default function ImportarContactos({ onImportado }: { onImportado?: () => void }) {
  const fichero = useRef<HTMLInputElement>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (contactos: Contacto[]) => {
    if (!contactos.length) {
      setError('No he encontrado ningún contacto con nombre y número.');
      return;
    }
    setTrabajando(true); setError(null); setResultado(null);
    try {
      const r = await fetch('/api/juego/agentes/importar', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactos }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'No se han podido importar.');
      // SE CUENTA LO QUE HA PASADO CON CADA UNO. «Importados: 40» cuando eran
      // 60 deja a alguien buscando a los veinte que faltan sin saber por qué.
      const partes = [
        j.nuevos ? `${j.nuevos} ${j.nuevos === 1 ? 'persona nueva' : 'personas nuevas'}` : null,
        j.actualizados ? `${j.actualizados} que ya ${j.actualizados === 1 ? 'estaba' : 'estaban'}` : null,
        j.ignorados ? `${j.ignorados} sin número (no entran)` : null,
      ].filter(Boolean);
      setResultado(partes.length ? partes.join(' · ') : 'No había nada nuevo que traer.');
      onImportado?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTrabajando(false);
    }
  };

  /** El selector del sistema (Android). Devuelve solo lo que la persona marque. */
  const conSelector = async () => {
    try {
      const elegidos = await (navigator as any).contacts.select(['name', 'tel'], { multiple: true });
      const contactos: Contacto[] = [];
      for (const c of elegidos || []) {
        const nombre = (c.name?.[0] || '').trim();
        for (const t of c.tel || []) {
          const n = normalizarTelefono(t);
          if (nombre && n) { contactos.push({ nombre, telefono: n }); break; }
        }
      }
      await enviar(contactos);
    } catch {
      // Cancelar no es un fallo: se cierra la pantalla del sistema y ya está.
      setError(null);
    }
  };

  const conFichero = async (f?: File) => {
    if (!f) return;
    const texto = await f.text();
    await enviar(leerVcf(texto));
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <div className="inline-flex items-center gap-1.5">
        {haySelector() && (
          <button
            onClick={conSelector}
            disabled={trabajando}
            title="Elegir contactos de la agenda del teléfono"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors disabled:opacity-50"
          >
            {trabajando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            De mi agenda
          </button>
        )}
        <input
          ref={fichero} type="file" accept=".vcf,text/vcard,text/x-vcard" className="hidden"
          onChange={e => { conFichero(e.target.files?.[0]); e.target.value = ''; }}
        />
        <button
          onClick={() => fichero.current?.click()}
          disabled={trabajando}
          title="Importar un archivo de contactos (.vcf) exportado del teléfono"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors disabled:opacity-50"
        >
          {trabajando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {haySelector() ? 'Desde un .vcf' : 'Importar contactos'}
        </button>
      </div>

      {/* QUÉ HA PASADO, debajo y en una línea. */}
      {resultado && (
        <p className={cn('inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700')}>
          <Check className="w-3 h-3" /> {resultado}
        </p>
      )}
      {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
      {!resultado && !error && !haySelector() && (
        // POR QUÉ NO HAY BOTÓN DE AGENDA EN ESTE APARATO. Sin esta línea, quien
        // entre desde un iPhone creerá que le falta algo.
        //
        // Y NO SE LE MANDA AL FICHERO COMO ANTES (2026-08-23): en el iPhone hay
        // dos caminos sin exportar nada —encender el selector, o un Atajo— y
        // decirle «expórtate un .vcf» era mandarle al peor de los tres.
        <p className="text-[10px] text-slate-400 max-w-[19rem] leading-snug">
          Este navegador no abre la agenda por su cuenta. En el iPhone se arregla
          sin exportar nada: mira <b className="text-slate-500">Desde el iPhone</b>, aquí debajo.
        </p>
      )}
    </div>
  );
}

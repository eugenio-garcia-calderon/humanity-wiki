import { useEffect, useState } from 'react';
import { CloudOff, Check, X } from 'lucide-react';
import { borrarBorrador, iniciarSinConexion, useEstadoSinConexion } from '../../utils/sinConexion';
import { bloquesAMarkdown } from '../../utils/bloques';
import { aplanar } from '../../utils/bloques';
import { t } from '../../i18n';

// ============================================================================
// EL AVISO DE LOS CAMBIOS SIN ENVIAR (2026-10-06, #33)
// ============================================================================
// Lo que se escribió sin red espera en este aparato (`utils/sinConexion.ts`).
// Esto lo dice, para que nadie cierre el portátil creyendo que está guardado:
//   · «N páginas con cambios sin enviar»: aparece mientras haya algo esperando.
//   · «Se han enviado…»: unos segundos, cuando vuelve la red y llegan al servidor.
//   · Un borrador que el servidor rechaza (te quitaron el acceso, la página se
//     borró) NO se tira: sale aquí con el motivo, y se puede copiar su texto o
//     descartar. Perder lo escrito sin decirlo es lo único inaceptable.
// También arranca el reenvío (`iniciarSinConexion`).

export default function AvisoBorradores() {
  const { borradores } = useEstadoSinConexion();
  const [enviado, setEnviado] = useState<string | null>(null);
  useEffect(() => { iniciarSinConexion(); }, []);
  useEffect(() => {
    const f = (e: Event) => {
      setEnviado((e as CustomEvent).detail?.titulo || '');
      setTimeout(() => setEnviado(null), 6000);
    };
    window.addEventListener('humanity:borrador-enviado', f);
    return () => window.removeEventListener('humanity:borrador-enviado', f);
  }, []);

  const pendientes = borradores.filter(b => !b.error);
  const rechazados = borradores.filter(b => b.error);
  if (!pendientes.length && !rechazados.length && enviado === null) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-9 z-[9985] flex flex-col items-center gap-2 px-3">
      {pendientes.length > 0 && (
        <p role="status" className="pointer-events-auto flex max-w-md items-center gap-2 rounded-xl bg-amber-700 px-3 py-2 text-[12px] font-bold text-white shadow-lg">
          <CloudOff className="h-4 w-4 shrink-0" />
          {pendientes.length === 1
            ? t('Tus cambios en «{titulo}» están guardados en este aparato y se enviarán al volver la conexión', { titulo: pendientes[0].titulo })
            : t('{n} páginas con cambios están guardadas en este aparato y se enviarán al volver la conexión', { n: pendientes.length })}
        </p>
      )}
      {enviado !== null && (
        <p role="status" className="pointer-events-auto flex max-w-md items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-[12px] font-bold text-white shadow-lg">
          <Check className="h-4 w-4 shrink-0" /> {enviado ? t('Se han enviado tus cambios sin conexión en «{titulo}».', { titulo: enviado }) : t('Se han enviado tus cambios sin conexión.')}
        </p>
      )}
      {rechazados.map(b => (
        <div key={b.pageId} role="alert" className="pointer-events-auto max-w-md rounded-xl bg-rose-700 px-3 py-2 text-[12px] text-white shadow-lg">
          <p className="font-bold">{t('No se han podido enviar tus cambios en «{titulo}»', { titulo: b.titulo })}</p>
          <p className="mt-0.5 opacity-90">{b.error}</p>
          <div className="mt-1.5 flex gap-3 font-bold">
            <button type="button" className="underline" onClick={() => { void navigator.clipboard?.writeText(`# ${b.titulo}\n\n${bloquesAMarkdown(aplanar(b.config?.bloques || []))}`); }}>{t('Copiar el texto')}</button>
            <button type="button" className="inline-flex items-center gap-1 underline" onClick={() => { void borrarBorrador(b.pageId); }}><X className="h-3 w-3" /> {t('Descartar')}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

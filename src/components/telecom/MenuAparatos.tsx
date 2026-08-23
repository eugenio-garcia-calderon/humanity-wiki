import { useEffect, useRef, useState } from 'react';
import { Settings2, Check, Mic, Video, Volume2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { cambiarCamara, cambiarMicro } from '../../telecom/motor';
import {
  listarAparatos, leerPreferencias, guardarPreferencia, sonarPor,
  type Aparatos,
} from '../../telecom/aparatos';

// ============================================================================
// POR DÓNDE ENTRA Y POR DÓNDE SALE (2026-08-22)
// ============================================================================
// El caso que arregla esto es de todos los días: te pones los cascos a mitad de
// llamada y sigues hablando por el micrófono de la pantalla. Antes la única
// salida era colgar, cambiarlo en el sistema y volver a llamar.
//
// ── LA LISTA SE PIDE AL ABRIR, NO AL MONTAR ─────────────────────────────────
// Los aparatos se enchufan y se desenchufan mientras hablas —eso es justo el
// momento en que alguien abre este menú—. Una lista pedida al empezar la
// llamada no tendría los cascos que te acabas de poner, que son exactamente los
// que vienes a elegir.
//
// Y además se escucha `devicechange`: si abres el menú y enchufas algo con el
// menú abierto, aparece solo. Es raro, pero cuando pasa, no ver el aparato que
// acabas de conectar hace pensar que la aplicación está rota.

export default function MenuAparatos({
  elementoAudio, className,
}: {
  /** El `<audio>` por el que suena el otro, para poder cambiarle el altavoz. */
  elementoAudio: HTMLAudioElement | null;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [aparatos, setAparatos] = useState<Aparatos | null>(null);
  const [elegido, setElegido] = useState(leerPreferencias());
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cargar = () => { listarAparatos().then(setAparatos); };
    cargar();
    navigator.mediaDevices?.addEventListener?.('devicechange', cargar);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', cargar);
  }, [abierto]);

  // Cerrar al pinchar fuera y con Escape. Sin esto, un menú abierto tapa el
  // botón de colgar, que es el que nunca puede quedar tapado.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setAbierto(false); } };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla, true);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla, true);
    };
  }, [abierto]);

  const elegir = async (cual: 'micro' | 'camara' | 'altavoz', id: string) => {
    setElegido(p => ({ ...p, [cual]: id }));
    if (cual === 'micro') await cambiarMicro(id);
    if (cual === 'camara') await cambiarCamara(id);
    if (cual === 'altavoz') {
      const fue = await sonarPor(elementoAudio, id);
      if (fue) guardarPreferencia('altavoz', id);
    }
  };

  const Grupo = ({ titulo, icono: Icono, lista, cual }: any) => {
    if (!lista?.length) return null;
    return (
      <div className="py-1">
        <p className="px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
          <Icono className="w-3 h-3" /> {titulo}
        </p>
        {lista.map((a: any) => (
          <button
            key={a.id}
            type="button"
            onClick={() => elegir(cual, a.id)}
            className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-xs text-slate-100 hover:bg-white/10 transition-colors"
          >
            <Check className={cn('w-3.5 h-3.5 shrink-0', elegido[cual as keyof typeof elegido] === a.id ? 'opacity-100 text-emerald-400' : 'opacity-0')} />
            <span className="truncate">{a.nombre}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div ref={caja} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        title="Elegir micrófono, cámara y altavoz"
        aria-label="Elegir micrófono, cámara y altavoz"
        aria-expanded={abierto}
        className={cn(
          'grid place-items-center rounded-full w-11 h-11 transition-colors shrink-0',
          abierto ? 'bg-white/30 text-white' : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur',
        )}
      >
        <Settings2 className="w-5 h-5" />
      </button>

      {abierto && (
        <div
          role="menu"
          className={cn(
            'absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 max-h-80 overflow-y-auto',
            'rounded-xl bg-slate-800 ring-1 ring-white/15 shadow-2xl py-1 z-10',
            'animate-in fade-in slide-in-from-bottom-1 duration-150',
          )}
        >
          {!aparatos && <p className="px-3 py-3 text-xs text-slate-400">Buscando aparatos…</p>}
          {aparatos && (
            <>
              <Grupo titulo="Micrófono" icono={Mic} lista={aparatos.micros} cual="micro" />
              <Grupo titulo="Cámara" icono={Video} lista={aparatos.camaras} cual="camara" />
              <Grupo titulo="Altavoz" icono={Volume2} lista={aparatos.altavoces} cual="altavoz" />
              {!aparatos.sePuedeElegirAltavoz && (
                // Se dice, en vez de callar: alguien que busca el altavoz y no
                // lo encuentra pensará que falta la función, no que su
                // navegador no la trae.
                <p className="px-3 py-2 text-[10px] text-slate-500 border-t border-white/10">
                  Este navegador no deja elegir el altavoz desde una página. Se cambia en el sistema.
                </p>
              )}
              {!aparatos.micros.length && !aparatos.camaras.length && (
                <p className="px-3 py-3 text-xs text-slate-400">No se ven aparatos.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

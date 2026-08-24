import { Link } from 'react-router-dom';
import { ExternalLink, Repeat2 } from 'lucide-react';
import { cn } from '../../utils/cn';

/*
 * LO REPUBLICADO, DEBAJO DE QUIEN LO REPARTE (2026-08-24)
 * ============================================================================
 * Eugenio: «que aparezca arriba el que republica con o sin comentario y abajo
 * el autor original y el contenido».
 *
 * ── EL ORDEN NO ES ESTÉTICA, ES ATRIBUCIÓN ─────────────────────────────────
 * Arriba va quien reparte, porque es quien ha decidido que esto salga en tu
 * muro y es a quien puedes seguir o dejar de seguir. Abajo, **dentro de su
 * propia caja**, va lo de otro: con su nombre, su foto y su marco.
 *
 * El marco es lo que hace el trabajo. Sin él, dos textos seguidos se leen como
 * uno solo y lo de otro acaba pareciendo tuyo — que es la única forma de
 * romper esto de verdad. Por eso el borde existe aunque no haya comentario, y
 * por eso el nombre de quien lo escribió va DENTRO y no en un pie en gris.
 *
 * ── DE FUERA SE DICE DE DÓNDE, Y CUÁNDO SE VIO ─────────────────────────────
 * De una publicación de aquí sabemos si sigue viva. De un tuit no: lo que se
 * enseña es la copia que se vio el día que se republicó, y eso se dice con
 * todas las letras. Enseñar una copia como si fuera lo que hay ahora es
 * exactamente el tipo de afirmación que esta plataforma no puede hacer.
 */

export type Republicado =
  | {
      de: 'aqui';
      id: string;
      retirado?: boolean;
      titulo?: string | null;
      texto?: string | null;
      media?: any[];
      fecha?: string | null;
      autor_id?: string | null;
      autor_nombre?: string | null;
      autor_avatar?: string | null;
    }
  | {
      de: 'fuera';
      url: string;
      red?: string | null;
      titulo?: string | null;
      texto?: string | null;
      imagen?: string | null;
      autor?: string | null;
      visto_el?: string | null;
    };

const fecha = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

export default function Republicacion({ r, compacto = false }: { r: Republicado; compacto?: boolean }) {
  return (
    <div
      onClick={e => e.stopPropagation()}
      className={cn(
        'rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden',
        compacto ? 'text-[12px]' : 'text-[13px]',
      )}
    >
      {r.de === 'aqui' ? <DeAqui r={r} /> : <DeFuera r={r} />}
    </div>
  );
}

function DeAqui({ r }: { r: Extract<Republicado, { de: 'aqui' }> }) {
  /*
   * RETIRADO NO ES «NO EXISTE» (y por eso se dice).
   *
   * Si quien lo escribió lo ha quitado, aquí no se puede seguir enseñando —
   * eso convertiría la republicación en una forma de que nada se pueda borrar
   * nunca—. Pero dejar un hueco vacío haría pensar que la aplicación falla.
   * Se dice lo que pasó.
   */
  if (r.retirado) {
    return (
      <p className="px-3 py-3 text-slate-400">
        Quien escribió esto lo ha retirado.
      </p>
    );
  }
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        {r.autor_avatar
          ? <img src={r.autor_avatar} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
          : <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-200 text-[9px] font-black text-slate-500">
              {(r.autor_nombre || '?').charAt(0).toUpperCase()}
            </span>}
        {/* El nombre lleva a su perfil también aquí dentro: quien escribió esto
            merece el mismo enlace tanto si lo ves en su muro como repartido por
            otro. `stopPropagation` porque esto vive dentro de una tarjeta que
            también es pulsable. */}
        {r.autor_id ? (
          <Link
            to={`/personas/${r.autor_id}`}
            onClick={e => e.stopPropagation()}
            className="truncate font-black text-slate-700 hover:underline"
          >
            {r.autor_nombre || 'Anónimo'}
          </Link>
        ) : (
          <span className="truncate font-black text-slate-700">{r.autor_nombre || 'Anónimo'}</span>
        )}
        {fecha(r.fecha) && <span className="shrink-0 text-[10px] text-slate-400">· {fecha(r.fecha)}</span>}
      </div>

      {r.titulo && <p className="mt-1.5 font-black leading-snug text-slate-900">{r.titulo}</p>}
      {r.texto && <p className="mt-1 leading-snug text-slate-600 line-clamp-4">{r.texto}</p>}

      {Array.isArray(r.media) && r.media[0]?.url && (
        <img
          src={r.media[0].url}
          alt=""
          loading="lazy"
          className="mt-2 max-h-64 w-full rounded-lg object-cover"
        />
      )}
    </div>
  );
}

function DeFuera({ r }: { r: Extract<Republicado, { de: 'fuera' }> }) {
  return (
    <a
      href={r.url}
      target="_blank"
      // `noopener` no es burocracia: sin él la página que se abre puede
      // manipular la nuestra desde `window.opener`. Y `noreferrer` evita
      // contarle a esa web desde qué publicación exacta se llegó.
      rel="noopener noreferrer nofollow"
      onClick={e => e.stopPropagation()}
      className="block transition-colors hover:bg-slate-100/70"
    >
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="truncate">{r.red || 'web'}</span>
          {r.autor && <span className="truncate normal-case tracking-normal text-slate-500">· {r.autor}</span>}
        </div>

        {r.titulo && <p className="mt-1.5 font-black leading-snug text-slate-900">{r.titulo}</p>}
        {r.texto && <p className="mt-1 leading-snug text-slate-600 line-clamp-3">{r.texto}</p>}

        {r.imagen && (
          <img src={r.imagen} alt="" loading="lazy" className="mt-2 max-h-64 w-full rounded-lg object-cover" />
        )}

        {/* CUÁNDO SE VIO, y no cuándo se publicó: de una página de fuera no se
            sabe lo segundo, y de lo que se enseña aquí sólo se puede afirmar
            que era así ese día. */}
        {r.visto_el && (
          <p className="mt-2 text-[10px] text-slate-400">
            Copia de lo que había el {fecha(r.visto_el)}. Pulsa para ver el original.
          </p>
        )}
      </div>
    </a>
  );
}

/** El renglón de «fulano ha republicado», para la cabecera de la tarjeta. */
export function SelloRepublicado({ nombre }: { nombre?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
      <Repeat2 className="h-3 w-3 shrink-0" />
      {nombre ? `${nombre} ha republicado` : 'Republicado'}
    </span>
  );
}

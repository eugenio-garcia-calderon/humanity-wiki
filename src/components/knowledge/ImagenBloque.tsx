import { useEffect, useRef, useState } from 'react';
import { Crop, Maximize, Loader2, Minimize2, Wand2, Check, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Bloque, Recorte } from '../../utils/bloques';

// ============================================================================
// LA IMAGEN DE UNA PÁGINA, COMO EN POWERPOINT (2026-10-06)
// ============================================================================
// Eugenio: «al seleccionar una imagen salen asas en las esquinas y los lados
// para hacerla más grande o más pequeña […], un modo Recortar con las asas
// negras de recorte de PowerPoint […] y que recortar no destruya nada».
//
// LO QUE SE GUARDA EN EL BLOQUE, Y NADA MÁS:
//   `anchoImagen` % del ancho de su columna (la imagen va centrada, como Notion).
//   `relacion` alto/ancho a la vista, sólo si se ha estirado con un asa de
//              un lado (si no, la de la imagen recortada).
//   `recorte`  la parte que se enseña, en fracciones de la imagen ORIGINAL
//              (x, y, ancho, alto de 0 a 1). El archivo no se toca: se puede
//              volver a recortar, o quitar el recorte, cuando se quiera.
//   `natural`  ancho y alto en píxeles del archivo, para reservar el hueco
//              antes de que cargue (sin saltos al leer).
// Sin `anchoImagen`, `relacion` ni `recorte` la imagen se pinta como siempre: las
// páginas de antes no cambian ni un píxel.
//
// `ImagenVista` es la que ven quien lee y el editor; `ImagenEditable` le pone
// encima las asas, el modo recortar, el pie y el peso.

const ENTERO: Recorte = { x: 0, y: 0, w: 1, h: 1 };
const LIMITE_PESO = 1.5 * 1024 * 1024;

const legible = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** ¿Tiene la imagen algo de lo nuevo, o se pinta como siempre? */
const esMoldeada = (b: Pick<Bloque, 'anchoImagen' | 'relacion' | 'recorte'>) => !!(b.anchoImagen || b.relacion || b.recorte);

/** Alto/ancho con que se ve: el estirado, o el de la parte recortada. */
function relacionDe(b: Pick<Bloque, 'relacion' | 'recorte' | 'natural'>, natural?: [number, number] | null): number | null {
  if (b.relacion) return b.relacion;
  const n = natural || b.natural;
  if (!n) return null;
  const r = b.recorte || ENTERO;
  return (n[1] * r.h) / (n[0] * r.w);
}

/** La imagen recortada y estirada dentro de su marco (sin asas). */
function Lienzo({ src, alt, recorte, onCarga }: { src: string; alt: string; recorte?: Recorte; onCarga?: (w: number, h: number) => void }) {
  const r = recorte || ENTERO;
  return (
    <img src={src} alt={alt} draggable={false}
      onLoad={e => onCarga?.(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
      style={{
        position: 'absolute', maxWidth: 'none',
        width: `${100 / r.w}%`, height: `${100 / r.h}%`,
        left: `${(-r.x / r.w) * 100}%`, top: `${(-r.y / r.h) * 100}%`,
      }} />
  );
}

/** La imagen como la ve quien lee la página publicada. */
export function ImagenVista({ b, clase }: { b: Bloque; clase?: string }) {
  if (!b.url) return null;
  const R = relacionDe(b);
  if (!esMoldeada(b) || !R) {
    return <img src={b.url} alt={b.pie || ''} loading="lazy" className={cn('w-full rounded-xl border border-slate-200', clase)} />;
  }
  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-slate-200 mx-auto max-w-full', clase)}
      style={{ width: `${b.anchoImagen || 100}%`, aspectRatio: `1 / ${R}` }}>
      <Lienzo src={b.url} alt={b.pie || ''} recorte={b.recorte} />
    </div>
  );
}

type Asa = 'n' | 's' | 'e' | 'o' | 'ne' | 'no' | 'se' | 'so';
const ASAS: { a: Asa; clase: string; cursor: string }[] = [
  { a: 'no', clase: '-left-1.5 -top-1.5', cursor: 'nwse-resize' },
  { a: 'n', clase: 'left-1/2 -translate-x-1/2 -top-1.5', cursor: 'ns-resize' },
  { a: 'ne', clase: '-right-1.5 -top-1.5', cursor: 'nesw-resize' },
  { a: 'e', clase: '-right-1.5 top-1/2 -translate-y-1/2', cursor: 'ew-resize' },
  { a: 'se', clase: '-right-1.5 -bottom-1.5', cursor: 'nwse-resize' },
  { a: 's', clase: 'left-1/2 -translate-x-1/2 -bottom-1.5', cursor: 'ns-resize' },
  { a: 'so', clase: '-left-1.5 -bottom-1.5', cursor: 'nesw-resize' },
  { a: 'o', clase: '-left-1.5 top-1/2 -translate-y-1/2', cursor: 'ew-resize' },
];

/**
 * LA IMAGEN EN EL EDITOR. Un clic la selecciona (borde y ocho asas, como
 * PowerPoint); las esquinas cambian el tamaño SIN deformarla y los lados la
 * estiran. «Recortar» pone las asas negras de recorte; Enter o un clic fuera
 * lo confirman, Esc lo deshace. Cada cambio llega a la página con `onCambio`
 * al soltar el ratón —uno solo, así ⌘Z lo deshace de una vez—.
 */
export function ImagenEditable({ b, onCambio, onNatural, onEditar, subirComprimida }: {
  b: Bloque;
  onCambio: (campos: Partial<Bloque>) => void;
  /** El tamaño real del archivo, medido al cargar: no es un cambio de quien escribe. */
  onNatural: (n: [number, number]) => void;
  onEditar?: () => void;
  /** Sube el archivo ya comprimido y devuelve su dirección y su peso. */
  subirComprimida: (f: File) => Promise<{ url: string; bytes: number } | { error: string }>;
}) {
  const figura = useRef<HTMLElement>(null);
  const marco = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState(false);
  const [recortando, setRecortando] = useState(false);
  /** Mientras se arrastra un asa: lo que se verá al soltar. */
  const [previa, setPrevia] = useState<{ ancho: number; relacion?: number } | null>(null);
  const [rc, setRc] = useState<Recorte>(b.recorte || ENTERO);
  const [natural, setNatural] = useState<[number, number] | null>(b.natural || null);
  const [pie, setPie] = useState(b.pie || '');
  const [peso, setPeso] = useState<number | null>(b.medioBytes ?? null);
  const [comprimiendo, setComprimiendo] = useState(false);
  const [nota, setNota] = useState<string | null>(null);

  useEffect(() => { setPie(b.pie || ''); }, [b.pie]);
  useEffect(() => { if (!recortando) setRc(b.recorte || ENTERO); }, [b.recorte, recortando]);

  // EL PESO DEL ARCHIVO. Lo apuntado al subirlo, o se pregunta al servidor
  // (sólo cabecera, sin descargarla). Una imagen de otra web que no lo diga
  // se queda sin indicador: mejor callar que inventar.
  useEffect(() => {
    if (b.medioBytes) { setPeso(b.medioBytes); return; }
    if (!b.url) return;
    let vivo = true;
    fetch(b.url, { method: 'HEAD' })
      .then(r => { const n = Number(r.headers.get('content-length')); if (vivo && r.ok && n > 0) setPeso(n); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [b.url, b.medioBytes]);

  const alCargar = (w: number, h: number) => {
    setNatural([w, h]);
    if (!b.natural || b.natural[0] !== w || b.natural[1] !== h) onNatural([w, h]);
  };

  // Un clic fuera la deselecciona (y, recortando, confirma el recorte).
  useEffect(() => {
    if (!sel && !recortando) return;
    const fuera = (e: PointerEvent) => {
      if (figura.current?.contains(e.target as Node)) return;
      if (recortando) confirmarRecorte();
      setSel(false);
    };
    document.addEventListener('pointerdown', fuera, true);
    return () => document.removeEventListener('pointerdown', fuera, true);
  });

  // Recortando, Enter confirma y Esc cancela. Se atienden aquí y no llegan al
  // editor: Enter no debe crear un bloque ni Esc cerrar nada más.
  useEffect(() => {
    if (!recortando) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); confirmarRecorte(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setRc(b.recorte || ENTERO); setRecortando(false); }
    };
    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  });

  const confirmarRecorte = () => {
    setRecortando(false);
    const viejo = b.recorte || ENTERO;
    const igual = Math.abs(rc.x - viejo.x) + Math.abs(rc.y - viejo.y) + Math.abs(rc.w - viejo.w) + Math.abs(rc.h - viejo.h) < 0.001;
    if (igual) return;
    const entero = rc.x < 0.001 && rc.y < 0.001 && rc.w > 0.999 && rc.h > 0.999;
    // Si estaba estirada, se conserva el estirado sobre la parte nueva.
    const relacion = b.relacion ? b.relacion * (rc.h / viejo.h) / (rc.w / viejo.w) : undefined;
    // Una imagen sin tamaño propio coge el que tenía en pantalla: recortarla
    // no debe hacerla de pronto más grande.
    const ancho = b.anchoImagen || anchoActual();
    onCambio({ recorte: entero ? undefined : rc, relacion, anchoImagen: ancho });
  };

  /** % del ancho de la columna que ocupa ahora mismo. */
  const anchoActual = () => {
    const cw = figura.current?.clientWidth || 1;
    const w = marco.current?.getBoundingClientRect().width || cw;
    return Math.min(100, Math.round((w / cw) * 1000) / 10);
  };

  /** Arrastrar un asa de tamaño. */
  const empezarTamano = (a: Asa, e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    const cw = figura.current?.clientWidth || 1;
    const caja = marco.current!.getBoundingClientRect();
    const w0 = caja.width, h0 = caja.height, x0 = e.clientX, y0 = e.clientY;
    const relacion0 = b.relacion;
    let fin: { ancho: number; relacion?: number } | null = null;
    const mover = (ev: PointerEvent) => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      // La imagen va centrada: tirar de un lado la agranda por los dos.
      const sx = a.includes('e') ? 2 : a.includes('o') ? -2 : 0;
      let w = w0, rel = relacion0;
      if (a === 'n' || a === 's') {
        const h = Math.max(40, h0 + (a === 's' ? dy : -dy));
        rel = h / w0;
      } else {
        w = Math.max(60, Math.min(cw, w0 + sx * dx));
        if (a === 'e' || a === 'o') rel = h0 / w;   // un lado estira
      }
      fin = { ancho: Math.round((w / cw) * 1000) / 10, relacion: rel };
      setPrevia(fin);
    };
    const soltar = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      setPrevia(null);
      if (fin) onCambio({ anchoImagen: fin.ancho, relacion: fin.relacion });
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  };

  /** Arrastrar un asa de recorte (o el recuadro entero, para moverlo). */
  const empezarRecorte = (a: Asa | 'mover', e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    const caja = (e.currentTarget as HTMLElement).closest('[data-recorte-marco]')!.getBoundingClientRect();
    const r0 = { ...rc }, x0 = e.clientX, y0 = e.clientY;
    const MIN = 0.05;
    const mover = (ev: PointerEvent) => {
      const fx = (ev.clientX - x0) / caja.width, fy = (ev.clientY - y0) / caja.height;
      let { x, y, w, h } = r0;
      if (a === 'mover') {
        x = Math.min(1 - w, Math.max(0, x + fx));
        y = Math.min(1 - h, Math.max(0, y + fy));
      } else {
        if (a.includes('o')) { const nx = Math.min(r0.x + r0.w - MIN, Math.max(0, r0.x + fx)); w = r0.w + (r0.x - nx); x = nx; }
        if (a.includes('e')) w = Math.min(1 - r0.x, Math.max(MIN, r0.w + fx));
        if (a.includes('n')) { const ny = Math.min(r0.y + r0.h - MIN, Math.max(0, r0.y + fy)); h = r0.h + (r0.y - ny); y = ny; }
        if (a.includes('s')) h = Math.min(1 - r0.y, Math.max(MIN, r0.h + fy));
      }
      setRc({ x, y, w, h });
    };
    const soltar = () => { window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  };

  // COMPRIMIR (2026-10-06). En el navegador: se descarga, se vuelve a pintar
  // en un canvas a 2000 px de lado como mucho (WebP si tiene transparencia,
  // JPEG si no) y se sube como archivo nuevo. El recorte y el tamaño siguen
  // valiendo: están en fracciones, no en píxeles.
  const comprimir = async () => {
    if (!b.url || peso === null) return;
    setComprimiendo(true); setNota(null);
    try {
      const r = await fetch(b.url);
      if (!r.ok) throw new Error('No he podido leer la imagen.');
      const blob = await r.blob();
      const antes = blob.size || peso;
      const nombre = (b.url.split('/').pop() || 'imagen').split('?')[0];
      const { comprimirImagen } = await import('../../utils/prepararImagen');
      const f = await comprimirImagen(new File([blob], nombre, { type: blob.type || 'image/jpeg' }), 2000, 0.82);
      if (f.size >= antes * 0.95) { setNota('Ya está todo lo comprimida que puede estar.'); return; }
      const sub = await subirComprimida(f);
      if ('error' in sub) throw new Error(sub.error);
      const bm = await createImageBitmap(f).catch(() => null);
      onCambio({ url: sub.url, medioBytes: sub.bytes || f.size, natural: bm ? [bm.width, bm.height] : undefined });
      bm?.close?.();
      setPeso(sub.bytes || f.size);
      setNota(`Ahorrados ${legible(antes - (sub.bytes || f.size))}: de ${legible(antes)} a ${legible(sub.bytes || f.size)}.`);
    } catch (e: any) { setNota(e.message || 'No se ha podido comprimir.'); }
    finally { setComprimiendo(false); }
  };

  if (!b.url) return null;
  const moldeada = esMoldeada(b) || !!previa;
  const R = previa?.relacion ?? relacionDe({ ...b, relacion: previa ? previa.relacion : b.relacion }, natural);
  const ancho = previa?.ancho ?? b.anchoImagen;
  const nat = natural || b.natural;

  return (
    <figure ref={figura} className="relative" onClick={e => { e.stopPropagation(); if (!recortando) setSel(true); }}>
      {/* LA BARRA DE LA IMAGEN, como la cinta «Formato de imagen». */}
      {(sel || recortando) && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-11 z-30 flex items-center gap-0.5 p-1 rounded-xl bg-white border border-slate-200 shadow-lg whitespace-nowrap"
          onPointerDown={e => e.stopPropagation()}>
          {recortando ? (
            <>
              <span className="px-2 text-[11px] font-bold text-slate-500">Arrastra las asas negras · Enter para aplicar</span>
              <BotonBarra icono={Check} texto="Aplicar" onClick={confirmarRecorte} />
              <BotonBarra icono={X} texto="Cancelar" onClick={() => { setRc(b.recorte || ENTERO); setRecortando(false); }} />
            </>
          ) : (
            <>
              <BotonBarra icono={Crop} texto="Recortar" onClick={() => { if (nat) { setRc(b.recorte || ENTERO); setRecortando(true); } }} />
              {(b.anchoImagen || b.relacion || b.recorte) && (
                <BotonBarra icono={Maximize} texto="Tamaño original" onClick={() => onCambio({ anchoImagen: undefined, relacion: undefined, recorte: undefined })} />
              )}
              {onEditar && <BotonBarra icono={Wand2} texto="Editar" onClick={onEditar} />}
            </>
          )}
        </div>
      )}

      {recortando && nat ? (
        // MODO RECORTAR: la imagen entera, lo que se quita atenuado, y el
        // recuadro con las asas negras de PowerPoint (esquinas en L, barras
        // en los lados). Dentro del recuadro se arrastra para moverlo.
        <div data-recorte-marco className="relative mx-auto max-w-full select-none touch-none"
          style={{ width: `${ancho || anchoActualSeguro(figura, marco)}%`, aspectRatio: `${nat[0]} / ${nat[1]}` }}>
          <img src={b.url} alt="" draggable={false} className="absolute inset-0 w-full h-full" />
          <Sombra rc={rc} />
          <div className="absolute cursor-move" onPointerDown={e => empezarRecorte('mover', e)}
            style={{ left: `${rc.x * 100}%`, top: `${rc.y * 100}%`, width: `${rc.w * 100}%`, height: `${rc.h * 100}%`, outline: '1px solid rgba(255,255,255,.9)', boxShadow: '0 0 0 1px rgba(15,23,42,.6)' }}>
            {ASAS.map(({ a, cursor }) => <AsaRecorte key={a} a={a} cursor={cursor} onPointerDown={e => empezarRecorte(a, e)} />)}
          </div>
        </div>
      ) : (
        <div ref={marco}
          className={cn('relative mx-auto max-w-full', moldeada && R ? 'overflow-visible' : 'w-fit')}
          style={moldeada && R ? { width: `${ancho || 100}%`, aspectRatio: `1 / ${R}` } : undefined}>
          {moldeada && R ? (
            <div className="absolute inset-0 overflow-hidden rounded-xl border border-slate-100">
              <Lienzo src={b.url} alt={b.pie || ''} recorte={b.recorte} onCarga={alCargar} />
            </div>
          ) : (
            <img src={b.url} alt={b.pie || ''} draggable={false} onLoad={e => alCargar(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
              className="block rounded-xl max-w-full border border-slate-100" />
          )}
          {sel && (
            <>
              <div className="pointer-events-none absolute inset-0 rounded-sm ring-2 ring-sky-500" />
              {ASAS.map(({ a, clase, cursor }) => (
                <span key={a} onPointerDown={e => empezarTamano(a, e)} style={{ cursor }}
                  className={cn('absolute z-10 w-3 h-3 rounded-full bg-white border-2 border-sky-500 shadow touch-none', clase)} />
              ))}
              {previa && marco.current && (
                <span className="absolute left-1/2 -translate-x-1/2 bottom-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-bold">
                  {Math.round((figura.current?.clientWidth || 0) * (previa.ancho / 100))} px · {Math.round(previa.ancho)} %
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* EL PESO, SÓLO EN EL EDITOR (2026-10-06): a partir de 1,5 MB se dice,
          con el botón para arreglarlo al lado. Quien lee nunca lo ve. */}
      {((peso !== null && peso > LIMITE_PESO) || nota) && (
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 text-[11px]" onClick={e => e.stopPropagation()}>
          {peso !== null && peso > LIMITE_PESO && (
            <>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 font-bold text-amber-700">{legible(peso)}</span>
              <button type="button" onClick={comprimir} disabled={comprimiendo}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-slate-900 text-white font-bold disabled:opacity-60">
                {comprimiendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Minimize2 className="w-3.5 h-3.5" />}
                {comprimiendo ? 'Comprimiendo…' : 'Comprimir imagen'}
              </button>
            </>
          )}
          {nota && <span className="font-bold text-emerald-700">{nota}</span>}
        </div>
      )}

      {/* EL PIE DE FOTO, editable en el sitio. Se guarda al salir del campo
          o con Enter: una tecla no es un paso de «deshacer». */}
      {(sel || b.pie) && (
        <input value={pie} onChange={e => setPie(e.target.value)}
          onClick={e => e.stopPropagation()}
          onBlur={() => { if (pie !== (b.pie || '')) onCambio({ pie: pie.trim() || undefined }); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
          placeholder="Escribe un pie de foto…" aria-label="Pie de foto"
          className="mt-1.5 block w-full text-center text-xs text-slate-500 bg-transparent outline-none placeholder:text-slate-300 focus:text-slate-700" />
      )}
    </figure>
  );
}

function anchoActualSeguro(figura: React.RefObject<HTMLElement | null>, marco: React.RefObject<HTMLDivElement | null>) {
  const cw = figura.current?.clientWidth || 1;
  const w = marco.current?.getBoundingClientRect().width || cw;
  return Math.min(100, (w / cw) * 100);
}

function BotonBarra({ icono: I, texto, onClick }: { icono: any; texto: string; onClick: () => void }) {
  return (
    <button type="button" onClick={e => { e.stopPropagation(); onClick(); }}
      className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-100">
      <I className="w-3.5 h-3.5" /> {texto}
    </button>
  );
}

/** Lo que el recorte va a quitar, atenuado: cuatro bandas alrededor. */
function Sombra({ rc }: { rc: Recorte }) {
  const c = 'absolute bg-slate-900/55 pointer-events-none';
  return (
    <>
      <div className={c} style={{ left: 0, top: 0, width: '100%', height: `${rc.y * 100}%` }} />
      <div className={c} style={{ left: 0, top: `${(rc.y + rc.h) * 100}%`, width: '100%', bottom: 0 }} />
      <div className={c} style={{ left: 0, top: `${rc.y * 100}%`, width: `${rc.x * 100}%`, height: `${rc.h * 100}%` }} />
      <div className={c} style={{ left: `${(rc.x + rc.w) * 100}%`, top: `${rc.y * 100}%`, right: 0, height: `${rc.h * 100}%` }} />
    </>
  );
}

/** Un asa negra de recorte: una L en las esquinas, una barra en los lados. */
function AsaRecorte({ a, cursor, onPointerDown }: { a: Asa; cursor: string; onPointerDown: (e: React.PointerEvent) => void }) {
  const G = 4, L = 18;   // grosor y largo, en px
  const negro = '#0f172a';
  const borde = '0 0 0 1px rgba(255,255,255,.85)';
  const esquina = a.length === 2;
  const pos: React.CSSProperties = {};
  if (a.includes('n')) pos.top = -G; if (a.includes('s')) pos.bottom = -G;
  if (a.includes('o')) pos.left = -G; if (a.includes('e')) pos.right = -G;
  if (!esquina && (a === 'n' || a === 's')) { pos.left = '50%'; pos.marginLeft = -L / 2; }
  if (!esquina && (a === 'e' || a === 'o')) { pos.top = '50%'; pos.marginTop = -L / 2; }
  // La zona que se agarra es algo más grande que lo que se ve.
  return (
    <span onPointerDown={onPointerDown} className="absolute z-10 touch-none" style={{ ...pos, width: esquina || a === 'n' || a === 's' ? L : G, height: esquina || a === 'e' || a === 'o' ? L : G, cursor }}>
      {esquina ? (
        <>
          <span className="absolute" style={{ background: negro, boxShadow: borde, height: G, width: L, [a.includes('n') ? 'top' : 'bottom']: 0, [a.includes('o') ? 'left' : 'right']: 0 }} />
          <span className="absolute" style={{ background: negro, boxShadow: borde, width: G, height: L, [a.includes('n') ? 'top' : 'bottom']: 0, [a.includes('o') ? 'left' : 'right']: 0 }} />
        </>
      ) : <span className="absolute inset-0" style={{ background: negro, boxShadow: borde }} />}
    </span>
  );
}

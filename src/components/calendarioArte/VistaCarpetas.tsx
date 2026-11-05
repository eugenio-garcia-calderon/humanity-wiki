// ============================================================================
// LAS CARPETAS DEL CALENDARIO (2026-11-05, Eugenio)
// ============================================================================
// «Si se pincha en carpetas aparezca una carpeta por cada mes. Ahí esté
// guardada la ilustración de cada mes y también se puedan añadir nuevas
// ilustraciones, bocetos y referencias para que luego la IA trabaje para
// generar nuevas ilustraciones.»
//
// Cada carpeta tiene tres cajones, que son la misma lista (`referencias` del
// mes) separada por `tipo`:
//   · Ilustraciones: la que está en el calendario, la original y las que se
//     suban. «Usar en el calendario» cambia la del mes sin perder la anterior.
//   · Bocetos: el boceto de composición original y los que se suban.
//   · Referencias: inspiración (sin tipo = referencia, como las de antes).
// Arriba, el ENCARGO de la ilustración (escena, luz y sombra): es lo que lee
// quien ilustra, persona o IA, junto con los bocetos y las referencias.
import { useRef, useState } from 'react';
import { ArrowLeft, Check, Eye, Folder, ImagePlus, Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import type { ContenidoMes, Referencia, TipoCarpeta } from '../../data/calendarioArteTipos';
import { ACENTOS, NOMBRES_MES } from './HojaMes';
import { miniaturaDe } from './HojaPortada';
import { Editable } from './Editable';
import { subirImagenCalendario } from './subirImagen';

const ETIQUETA_ANADIR: Record<TipoCarpeta, string> = { ilustracion: 'Añadir ilustración', boceto: 'Añadir boceto', referencia: 'Añadir referencia' };
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const tipoDe = (r: Referencia): TipoCarpeta => r.tipo ?? 'referencia';
const bocetoOriginal = (mes: number) => `/calendario-arte/bocetos/mes-${String(mes).padStart(2, '0')}.svg`;

interface Props {
  meses: ContenidoMes[];
  /** La ilustración original de cada mes (la del código), para no perderla nunca de vista. */
  originales: ContenidoMes[];
  carpetas: Record<number, Referencia[]>;
  abierta: number | null;
  editando: boolean;
  alAbrir: (mes: number | null) => void;
  alGuardar: (mes: number, refs: Referencia[]) => Promise<boolean>;
  alUsarIlustracion: (mes: number, url: string) => void;
  alCambiarMes: (mes: number, cambio: Partial<ContenidoMes>) => void;
  alVerMes: (mes: number) => void;
  alPedirIA: (mes: number) => Promise<boolean>;
}

export function VistaCarpetas(p: Props) {
  const [grande, setGrande] = useState<string | null>(null);
  return (
    <>
      {p.abierta === null ? <Rejilla {...p} /> : <Carpeta {...p} mes={p.abierta} verGrande={setGrande} />}
      {grande && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" onClick={() => setGrande(null)}>
          <img src={grande} alt="" className="max-h-full max-w-full object-contain" />
          <Button variant="ghost" className="absolute right-4 top-4 bg-white/10 px-2 text-white hover:bg-white/20" aria-label="Cerrar"><X className="h-5 w-5" /></Button>
        </div>
      )}
    </>
  );
}

function Rejilla({ meses, carpetas, alAbrir }: Props) {
  const cuenta = (mes: number, t: TipoCarpeta) => (carpetas[mes] ?? []).filter(r => tipoDe(r) === t).length;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h2 className="text-xl font-semibold text-stone-800">Carpetas</h2>
      <p className="mt-1 max-w-3xl text-sm text-stone-500">
        Una carpeta por mes con su ilustración, otras versiones, bocetos y referencias. Lo que dejéis aquí es lo que
        usará quien ilustre, persona o IA, para hacer ilustraciones nuevas.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <button type="button" onClick={() => alAbrir(0)}
          className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex aspect-[297/170] items-center justify-center bg-gradient-to-br from-amber-50 via-rose-50 to-sky-50">
            <Folder className="h-10 w-10 text-stone-400" />
          </div>
          <div className="p-3">
            <p className="text-[11px] uppercase tracking-widest text-stone-400">Todo el año</p>
            <p className="font-semibold text-stone-800">Estilo y referencias comunes</p>
            <p className="text-xs text-stone-500">{plural((carpetas[0] ?? []).length, 'imagen', 'imágenes')}</p>
          </div>
        </button>
        {meses.map(m => {
          const a = ACENTOS[(m.mes - 1) % 12];
          const img = miniaturaDe(m.imagen);
          return (
            <button key={m.mes} type="button" onClick={() => alAbrir(m.mes)}
              className={cn('group flex flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md', a.borde)}>
              <div className={cn('relative aspect-[297/170] overflow-hidden', a.suave)}>
                {img && <img src={img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                  <Folder className="h-3 w-3" />{NOMBRES_MES[m.mes - 1]}
                </span>
              </div>
              <div className="p-3">
                <p className={cn('font-semibold', a.texto)}>{m.tema}</p>
                <p className="text-xs text-stone-500">
                  {plural(1 + cuenta(m.mes, 'ilustracion'), 'ilustración', 'ilustraciones')} · {plural(1 + cuenta(m.mes, 'boceto'), 'boceto', 'bocetos')} · {plural(cuenta(m.mes, 'referencia'), 'referencia', 'referencias')}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Carpeta({ meses, originales, carpetas, mes, editando, alAbrir, alGuardar, alUsarIlustracion, alCambiarMes, alVerMes, alPedirIA, verGrande }: Props & { mes: number; verGrande: (u: string) => void }) {
  const refs = carpetas[mes] ?? [];
  const m = mes > 0 ? meses[mes - 1] : null;
  const original = mes > 0 ? originales[mes - 1]?.imagen : undefined;
  const a = mes > 0 ? ACENTOS[(mes - 1) % 12] : null;
  const [pedida, setPedida] = useState<'no' | 'enviando' | 'si'>('no');

  const guardar = (nuevas: Referencia[]) => alGuardar(mes, nuevas);
  const quitar = (url: string) => { if (confirm('¿Quitar esta imagen de la carpeta?')) guardar(refs.filter(r => r.url !== url)); };
  const anotar = (url: string, nota: string) => guardar(refs.map(r => r.url === url ? { ...r, nota: nota || undefined } : r));

  // Las ilustraciones: la del calendario, la original y las guardadas, sin repetir.
  const ilustraciones: { url: string; nota?: string; fija?: string }[] = [];
  const ya = new Set<string>();
  const poner = (url: string | undefined, extra: { nota?: string; fija?: string }) => { if (url && !ya.has(url)) { ya.add(url); ilustraciones.push({ url, ...extra }); } };
  if (m) poner(m.imagen, { fija: m.imagen === original ? 'Original' : undefined });
  poner(original, { fija: 'Original' });
  refs.filter(r => tipoDe(r) === 'ilustracion').forEach(r => poner(r.url, { nota: r.nota }));

  const bocetos: { url: string; nota?: string; fija?: string }[] = mes > 0 ? [{ url: bocetoOriginal(mes), fija: 'Boceto original' }] : [];
  refs.filter(r => tipoDe(r) === 'boceto').forEach(r => bocetos.push({ url: r.url, nota: r.nota }));
  const referencias = refs.filter(r => tipoDe(r) === 'referencia');

  const pedirIA = async () => {
    setPedida('enviando');
    setPedida((await alPedirIA(mes)) ? 'si' : 'no');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Button variant="ghost" className="-ml-2 mb-3 gap-1 px-2 normal-case tracking-normal text-sm" onClick={() => alAbrir(null)}>
        <ArrowLeft className="h-4 w-4" />Todas las carpetas
      </Button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-stone-400">{mes > 0 ? NOMBRES_MES[mes - 1] : 'Todo el año'}</p>
          <h2 className={cn('text-2xl font-semibold', a?.texto ?? 'text-stone-800')}>{m ? m.tema : 'Estilo y referencias comunes'}</h2>
        </div>
        {mes > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => alVerMes(mes)}><Eye className="h-4 w-4" />Ver la hoja del mes</Button>
            <Button className="gap-1.5" onClick={pedirIA} disabled={pedida !== 'no'}>
              {pedida === 'enviando' ? <Loader2 className="h-4 w-4 animate-spin" /> : pedida === 'si' ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {pedida === 'si' ? 'Pedido a la IA' : 'Pedir a la IA una ilustración nueva'}
            </Button>
          </div>
        )}
      </div>
      {pedida === 'si' && (
        <p className="mt-2 text-sm text-emerald-700">Anotado en «Tareas de mejora». La IA usará el encargo, los bocetos y las referencias de esta carpeta.</p>
      )}

      {m && (
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Encargo de la ilustración</h3>
          <p className="mb-2 text-xs text-stone-500">Qué se dibuja, cuál es la parte luminosa del tema y cuál la oscura. Pincha para cambiarlo.</p>
          <Editable as="p" valor={m.ilustracion_idea} editando={editando} alCambiar={v => alCambiarMes(mes, { ilustracion_idea: v })}
            vacio="Escena, parte luminosa y parte oscura del tema…" className="text-[15px] leading-relaxed text-stone-700" />
        </section>
      )}

      {mes > 0 && (
        <Cajon titulo="Ilustraciones" ayuda="La que está en el calendario y otras versiones. Sube las ilustraciones a máxima calidad: es lo que va a imprenta."
          items={ilustraciones} tipo="ilustracion" mes={mes} refs={refs} editando={editando} guardar={guardar} quitar={quitar} anotar={anotar} verGrande={verGrande}
          actual={m?.imagen} alUsar={url => alUsarIlustracion(mes, url)} />
      )}
      {mes > 0 && (
        <Cajon titulo="Bocetos" ayuda="Ideas de composición, a mano o digitales. Una foto de un dibujo en papel vale."
          items={bocetos} tipo="boceto" mes={mes} refs={refs} editando={editando} guardar={guardar} quitar={quitar} anotar={anotar} verGrande={verGrande} />
      )}
      <Cajon titulo="Referencias" ayuda={mes > 0 ? 'Imágenes de inspiración para este tema: estilo, colores, detalles.' : 'El estilo que comparten las doce ilustraciones: murales, paletas, artistas que nos inspiran.'}
        items={referencias} tipo="referencia" mes={mes} refs={refs} editando={editando} guardar={guardar} quitar={quitar} anotar={anotar} verGrande={verGrande} />
    </div>
  );
}

function Cajon({ titulo, ayuda, items, tipo, refs, editando, guardar, quitar, anotar, verGrande, actual, alUsar }: {
  titulo: string; ayuda: string; items: { url: string; nota?: string; fija?: string }[]; tipo: TipoCarpeta; mes: number;
  refs: Referencia[]; editando: boolean; guardar: (r: Referencia[]) => Promise<boolean>;
  quitar: (url: string) => void; anotar: (url: string, nota: string) => void; verGrande: (u: string) => void;
  actual?: string; alUsar?: (url: string) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subir = async (archivos: FileList | null) => {
    if (!archivos?.length) return;
    setError(null);
    const nuevas: Referencia[] = [];
    let i = 0;
    for (const f of Array.from(archivos)) {
      i++;
      setSubiendo(`Subiendo ${i} de ${archivos.length}…`);
      const r = await subirImagenCalendario(f, { original: tipo === 'ilustracion' });
      if ('error' in r) { setError(`${f.name}: ${r.error}`); continue; }
      nuevas.push({ url: r.url, tipo });
    }
    setSubiendo(null);
    if (nuevas.length) await guardar([...refs, ...nuevas]);
  };

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-stone-800">{titulo} <span className="text-sm font-normal text-stone-400">({items.length})</span></h3>
          <p className="text-sm text-stone-500">{ayuda}</p>
        </div>
        {editando && (
          <>
            <input ref={entrada} type="file" accept="image/*" multiple className="hidden" onChange={e => { subir(e.target.files); e.target.value = ''; }} />
            <Button variant="outline" className="gap-1.5" onClick={() => entrada.current?.click()} disabled={!!subiendo}>
              {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {subiendo ?? ETIQUETA_ANADIR[tipo]}
            </Button>
          </>
        )}
      </div>
      {error && <p className="mt-2 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}
      {items.length === 0 ? (
        <div className="mt-3 rounded-2xl border-2 border-dashed border-stone-200 p-8 text-center text-sm text-stone-400">Vacío. Añade la primera.</div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map(it => {
            const enCalendario = actual === it.url;
            return (
              <div key={it.url} className={cn('overflow-hidden rounded-xl border bg-white', enCalendario ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-stone-200')}>
                <div className="relative aspect-[297/170] cursor-zoom-in bg-stone-100" onClick={() => verGrande(it.url)}>
                  <img src={miniaturaDe(it.url)} alt={it.nota || titulo} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  {enCalendario && <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">En el calendario</span>}
                  {!enCalendario && it.fija && <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-stone-600">{it.fija}</span>}
                </div>
                <div className="space-y-1.5 p-2">
                  {it.fija ? (
                    <p className="text-xs text-stone-400">{it.fija}</p>
                  ) : editando ? (
                    <input defaultValue={it.nota ?? ''} key={`${it.url}-${it.nota ?? ''}`} placeholder="Nota…"
                      onBlur={e => { const v = e.target.value.trim(); if (v !== (it.nota ?? '')) anotar(it.url, v); }}
                      className="w-full rounded border border-stone-200 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-sky-400" />
                  ) : it.nota ? <p className="text-xs text-stone-600">{it.nota}</p> : null}
                  {editando && (
                    <div className="flex gap-1">
                      {alUsar && !enCalendario && (
                        <Button variant="outline" className="flex-1 px-1 py-1 text-[9px]" onClick={() => alUsar(it.url)}>Usar en el calendario</Button>
                      )}
                      {!it.fija && !enCalendario && (
                        <Button variant="ghost" className="ml-auto px-1.5 py-1 text-rose-600" aria-label="Quitar de la carpeta" onClick={() => quitar(it.url)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

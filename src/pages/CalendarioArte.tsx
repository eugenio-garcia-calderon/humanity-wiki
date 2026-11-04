// ============================================================================
// CALENDARIO ARTE PARA LA HUMANIDAD (2026-11-04, Eugenio)
// ============================================================================
// Doce meses, doce temáticas de la humanidad. Cada hoja es un A3 vertical:
// ilustración arriba (A4 apaisado), franja con una herramienta o juego, y el
// mes con una frase pedagógica por día abajo (A4 apaisado).
//
// · Todo se edita en su sitio, desde cualquier dispositivo, y se guarda solo.
// · Cada mes tiene una carpeta de referencias para el proceso creativo.
// · «Exportar» imprime o guarda en PDF solo el contenido definitivo, a tamaño
//   real: sin botones, sin carpeta, sin marcas de edición.
// · «Ideas» es el buzón que la IA lee para implementar mejoras pendientes.
//
// El contenido por defecto está en `src/data/calendarioArte.ts`; lo que se
// edita aquí vive en `calendario_arte_meses` (ver `src/server/calendarioArte.ts`).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Pencil, Eye, FolderOpen, Lightbulb, Download, Compass, Info, Loader2, ChevronLeft, ChevronRight, Check, AlertTriangle, RotateCcw,
} from 'lucide-react';
import { Button } from '../components/ui/core';
import { cn } from '../utils/cn';
import { subirArchivo } from '../utils/subir';
import { HojaMes, NOMBRES_MES, ANCHO_MM, ALTO_MM } from '../components/calendarioArte/HojaMes';
import { PanelCarpeta, PanelIdeas, PanelPrincipios, PanelConocer } from '../components/calendarioArte/Paneles';
import { INVESTIGACION_POR_MES } from '../data/calendarioArteInvestigacion';
import { PRINCIPIOS_POR_DEFECTO, type Principio } from '../data/calendarioArtePrincipios';
import { CALENDARIO_ARTE_ANIO, CALENDARIO_ARTE_POR_DEFECTO } from '../data/calendarioArte';
import type { ContenidoMes, Referencia } from '../data/calendarioArteTipos';

interface Guardado {
  // En la hoja 0 (lo común del año) el contenido es `{ principios }`.
  contenido: Partial<ContenidoMes> & { principios?: Principio[] };
  referencias: Referencia[];
  version: number;
}

type EstadoGuardado = 'listo' | 'pendiente' | 'guardando' | 'error' | 'conflicto';

const MM_A_PX = 96 / 25.4;
/** Ancho mínimo recomendable de la ilustración para un A4 a ~300 ppp. */
const PX_IMPRESION = 3500;

function mezclar(base: ContenidoMes, cambios?: Partial<ContenidoMes>): ContenidoMes {
  if (!cambios) return base;
  return { ...base, ...cambios, franja: { ...base.franja, ...(cambios.franja ?? {}) }, dias: cambios.dias ?? base.dias };
}

/** La hoja a tamaño real, encogida para que quepa en la pantalla. */
function HojaEscalada({ children }: { children: React.ReactNode }) {
  const caja = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0.5);
  useLayoutEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setEscala(Math.min(1, el.clientWidth / (ANCHO_MM * MM_A_PX)));
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={caja} className="w-full">
      <div style={{ height: ALTO_MM * MM_A_PX * escala, width: ANCHO_MM * MM_A_PX * escala }} className="mx-auto shadow-xl ring-1 ring-stone-200">
        <div style={{ transform: `scale(${escala})`, transformOrigin: 'top left', width: `${ANCHO_MM}mm` }}>{children}</div>
      </div>
    </div>
  );
}

export default function CalendarioArte() {
  const [params, setParams] = useSearchParams();
  const anio = CALENDARIO_ARTE_ANIO;
  const mes = Math.min(12, Math.max(1, Number(params.get('mes')) || 1));
  const irAMes = (m: number) => setParams(p => { p.set('mes', String(((m - 1 + 12) % 12) + 1)); return p; }, { replace: true });

  const [guardados, setGuardados] = useState<Record<number, Guardado>>({});
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [puedeProponer, setPuedeProponer] = useState(false);
  const [editando, setEditando] = useState(false);
  const [estado, setEstado] = useState<EstadoGuardado>('listo');
  const [mensaje, setMensaje] = useState<string | null>(null);
  // `?conocer=1` es a donde lleva el QR impreso: abre directamente la ficha del tema.
  const [panel, setPanel] = useState<'carpeta' | 'estilo' | 'ideas' | 'principios' | 'conocer' | null>(
    () => (params.get('conocer') === '1' ? 'conocer' : null));
  const [pendientes, setPendientes] = useState<number | null>(null);
  const [menuExportar, setMenuExportar] = useState(false);
  const [imprimiendo, setImprimiendo] = useState<number[] | null>(null);
  const [formato, setFormato] = useState<'a3' | 'a4'>('a3');
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [avisoImagen, setAvisoImagen] = useState<string | null>(null);
  const entradaImagen = useRef<HTMLInputElement>(null);

  // Cambios aún sin enviar, por mes. Se guardan solos al poco de dejar de escribir.
  const sucios = useRef<Set<number>>(new Set());
  const temporizador = useRef<number | null>(null);

  // Fetch directo en la página: la excepción legítima de `src/pages/CLAUDE.md`
  // (un endpoint que solo usa esta página; precargarlo en DataContext no sirve).
  const cargar = useCallback(async () => {
    setErrorCarga(null);
    try {
      const r = await fetch(`/api/calendario-arte/${anio}`, { credentials: 'include' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const mapa: Record<number, Guardado> = {};
      for (const f of j.meses as any[]) mapa[f.mes] = { contenido: f.contenido ?? {}, referencias: f.referencias ?? [], version: f.version ?? 0 };
      setGuardados(mapa);
      setPuedeEditar(!!j.puedeEditar);
      setPuedeProponer(!!j.puedeProponer);
      setEstado('listo');
    } catch (e: any) {
      setErrorCarga(e.message || 'No se ha podido cargar el calendario.');
    } finally {
      setCargando(false);
    }
    fetch(`/api/calendario-arte/${anio}/ideas?estado=pendiente`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null).then(j => { if (Array.isArray(j)) setPendientes(j.length); }).catch(() => {});
  }, [anio]);
  useEffect(() => { cargar(); }, [cargar]);

  const meses = useMemo(
    () => CALENDARIO_ARTE_POR_DEFECTO.map(base => mezclar(base, guardados[base.mes]?.contenido)),
    [guardados],
  );
  const actual = meses[mes - 1];

  // ── GUARDAR ──────────────────────────────────────────────────────────────
  const guardadosRef = useRef(guardados);
  guardadosRef.current = guardados;

  const enviarPendientes = useCallback(async () => {
    const lista = [...sucios.current];
    if (!lista.length) return;
    setEstado('guardando');
    for (const m of lista) {
      const g = guardadosRef.current[m];
      try {
        const r = await fetch(`/api/calendario-arte/${anio}/${m}`, {
          method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contenido: g?.contenido ?? {}, version: g?.version ?? 0 }),
        });
        const j = await r.json();
        if (r.status === 409) { setEstado('conflicto'); setMensaje(j.error); return; }
        if (!r.ok) throw new Error(j.error);
        sucios.current.delete(m);
        setGuardados(prev => ({ ...prev, [m]: { ...prev[m], referencias: j.referencias ?? prev[m]?.referencias ?? [], version: j.version } }));
      } catch (e: any) {
        setEstado('error'); setMensaje(e.message || 'No se ha podido guardar.'); return;
      }
    }
    setEstado(sucios.current.size ? 'pendiente' : 'listo');
  }, [anio]);

  const cambiar = useCallback((m: number, cambio: Guardado['contenido']) => {
    setGuardados(prev => {
      const g = prev[m] ?? { contenido: {}, referencias: [], version: 0 };
      return { ...prev, [m]: { ...g, contenido: { ...g.contenido, ...cambio } } };
    });
    sucios.current.add(m);
    setEstado('pendiente');
    if (temporizador.current) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => { enviarPendientes(); }, 1200);
  }, [enviarPendientes]);

  // No perder lo escrito al cerrar la pestaña.
  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => { if (sucios.current.size) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, []);

  const guardarReferencias = (hoja: number) => async (refs: Referencia[]): Promise<boolean> => {
    try {
      const r = await fetch(`/api/calendario-arte/${anio}/${hoja}/referencias`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referencias: refs }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setGuardados(prev => ({
        ...prev,
        [hoja]: { contenido: prev[hoja]?.contenido ?? {}, referencias: j.referencias ?? refs, version: prev[hoja]?.version ?? j.version ?? 0 },
      }));
      return true;
    } catch (e: any) {
      setMensaje(e.message || 'No se ha podido guardar la carpeta.'); setEstado('error');
      return false;
    }
  };

  const restaurarMes = async () => {
    if (!confirm(`¿Volver ${NOMBRES_MES[mes - 1]} al contenido original? Se pierden los textos editados de este mes (la carpeta de referencias se conserva).`)) return;
    const r = await fetch(`/api/calendario-arte/${anio}/${mes}`, { method: 'DELETE', credentials: 'include' });
    if (!r.ok) { const j = await r.json().catch(() => ({})); setMensaje(j.error || 'No se ha podido restaurar.'); setEstado('error'); return; }
    sucios.current.delete(mes);
    await cargar();
  };

  // ── ILUSTRACIÓN ──────────────────────────────────────────────────────────
  const comprobarResolucion = (url: string) => {
    const img = new Image();
    img.onload = () => setAvisoImagen(img.naturalWidth < PX_IMPRESION
      ? `La ilustración mide ${img.naturalWidth} px de ancho. Para imprimir a máxima calidad conviene al menos ${PX_IMPRESION} px.`
      : null);
    img.src = url;
  };
  // Un SVG es vectorial: su «ancho en píxeles» no dice nada de cómo se imprime.
  useEffect(() => {
    const img = actual.imagen;
    if (editando && img && !/\.svg($|\?)/i.test(img)) comprobarResolucion(img); else setAvisoImagen(null);
  }, [editando, actual.imagen]);

  const subirIlustracion = async (f: File | undefined) => {
    if (!f) return;
    setSubiendoImagen(true);
    // Se sube el ORIGINAL, sin comprimir: es lo que va a imprenta. Solo las
    // fotos HEIC del iPhone pasan por la conversión (el servidor no las admite).
    const heic = /hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);
    const r = heic ? await subirArchivo(f) : await subirArchivo(f, f.type || 'image/jpeg');
    setSubiendoImagen(false);
    if (r.error) { setMensaje(r.error); setEstado('error'); return; }
    cambiar(mes, { imagen: r.url });
  };

  // ── EXPORTAR / IMPRIMIR ──────────────────────────────────────────────────
  const exportar = (cuales: number[], f: 'a3' | 'a4') => { setMenuExportar(false); setFormato(f); setImprimiendo(cuales); };

  useEffect(() => {
    if (!imprimiendo) return;
    let vivo = true;
    const fin = () => { if (vivo) setImprimiendo(null); };
    window.addEventListener('afterprint', fin);
    // Antes de abrir el diálogo, que estén cargadas todas las ilustraciones:
    // si no, el PDF sale con huecos en blanco.
    const t = window.setTimeout(async () => {
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('.ca-impresion img'));
      await Promise.all(imgs.map(i => i.complete ? Promise.resolve() : new Promise(res => { i.onload = i.onerror = () => res(null); })));
      if (vivo) window.print();
    }, 50);
    return () => { vivo = false; window.clearTimeout(t); window.removeEventListener('afterprint', fin); };
  }, [imprimiendo]);

  if (cargando) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando el calendario…</div>;
  }

  const refsMes = guardados[mes]?.referencias ?? [];
  const principios = guardados[0]?.contenido.principios ?? PRINCIPIOS_POR_DEFECTO;

  return (
    <div className="h-full overflow-y-auto bg-stone-100">
      <style>{CSS_PANTALLA + (formato === 'a3' ? CSS_A3 : CSS_A4)}</style>

      {/* ── BARRA SUPERIOR ─────────────────────────────────────────────── */}
      <div className="ca-no-imprimir sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-3 py-2">
          <div className="mr-auto min-w-0">
            <h1 className="truncate text-base font-semibold text-stone-800">Calendario Arte para la Humanidad {anio}</h1>
            <p className="text-xs text-stone-500">
              {estado === 'guardando' && <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Guardando…</span>}
              {estado === 'pendiente' && 'Cambios sin guardar…'}
              {estado === 'listo' && (editando ? <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="h-3 w-3" />Todo guardado</span> : '12 meses · 12 ilustraciones')}
              {(estado === 'error' || estado === 'conflicto') && <span className="inline-flex items-center gap-1 text-rose-600"><AlertTriangle className="h-3 w-3" />{mensaje}</span>}
            </p>
          </div>

          <Button variant="outline" className="gap-1.5 px-3" onClick={() => setPanel('carpeta')}>
            <FolderOpen className="h-4 w-4" />Carpeta{refsMes.length ? ` (${refsMes.length})` : ''}
          </Button>
          <Button variant="outline" className="gap-1.5 px-3" onClick={() => setPanel('conocer')}>
            <Info className="h-4 w-4" />Conocer más
          </Button>
          <Button variant="outline" className="gap-1.5 px-3" onClick={() => setPanel('principios')}>
            <Compass className="h-4 w-4" />Principios
          </Button>
          <Button variant="outline" className="gap-1.5 px-3" onClick={() => setPanel('ideas')}>
            <Lightbulb className="h-4 w-4" />Ideas{pendientes ? ` (${pendientes})` : ''}
          </Button>
          {puedeEditar && (
            <Button variant={editando ? 'primary' : 'outline'} className="gap-1.5 px-3" onClick={() => { if (editando) enviarPendientes(); setEditando(e => !e); }}>
              {editando ? <><Eye className="h-4 w-4" />Ver</> : <><Pencil className="h-4 w-4" />Editar</>}
            </Button>
          )}
          <div className="relative">
            <Button className="gap-1.5 px-3" onClick={() => setMenuExportar(v => !v)} disabled={!!imprimiendo}>
              {imprimiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Exportar
            </Button>
            {menuExportar && (
              <div className="absolute right-0 top-full z-40 mt-1 w-72 rounded-xl border border-stone-200 bg-white p-2 shadow-xl">
                <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">A3 vertical (ilustración + calendario en una hoja)</p>
                <Button variant="ghost" className="w-full justify-start normal-case tracking-normal text-sm" onClick={() => exportar([mes], 'a3')}>Este mes ({NOMBRES_MES[mes - 1]})</Button>
                <Button variant="ghost" className="w-full justify-start normal-case tracking-normal text-sm" onClick={() => exportar(meses.map(m => m.mes), 'a3')}>Los 12 meses</Button>
                <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">A4 apaisado (dos páginas por mes)</p>
                <Button variant="ghost" className="w-full justify-start normal-case tracking-normal text-sm" onClick={() => exportar([mes], 'a4')}>Este mes ({NOMBRES_MES[mes - 1]})</Button>
                <Button variant="ghost" className="w-full justify-start normal-case tracking-normal text-sm" onClick={() => exportar(meses.map(m => m.mes), 'a4')}>Los 12 meses</Button>
                <p className="px-3 pb-1 pt-2 text-[11px] leading-snug text-stone-500">
                  Se abre el diálogo de impresión a tamaño real, solo con el contenido definitivo. Para un PDF de
                  imprenta elige «Guardar como PDF», el mismo tamaño (A3 o A4), márgenes <b>Ninguno</b> y activa
                  <b> Gráficos de fondo</b>. Textos e ilustraciones vectoriales salen a resolución completa.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Los doce meses */}
        <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-3 pb-2">
          <Button variant="ghost" className="px-1.5" onClick={() => irAMes(mes - 1)} aria-label="Mes anterior"><ChevronLeft className="h-4 w-4" /></Button>
          {meses.map(m => (
            <Button
              key={m.mes}
              variant={m.mes === mes ? 'primary' : 'ghost'}
              className={cn('shrink-0 px-2.5 py-1.5 normal-case tracking-normal text-xs', m.mes !== mes && 'text-stone-500')}
              onClick={() => irAMes(m.mes)}
              title={m.tema}
            >
              {NOMBRES_MES[m.mes - 1].slice(0, 3)}
            </Button>
          ))}
          <Button variant="ghost" className="px-1.5" onClick={() => irAMes(mes + 1)} aria-label="Mes siguiente"><ChevronRight className="h-4 w-4" /></Button>
        </div>

        {editando && (
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 border-t border-stone-100 px-3 py-2 text-xs text-stone-600">
            <span>Pulsa cualquier texto de la hoja para cambiarlo. Se guarda solo.</span>
            {actual.imagen && (
              <>
                <label className="flex items-center gap-1">Encuadre ↔
                  <input type="range" min={0} max={100} value={actual.imagen_x ?? 50} onChange={e => cambiar(mes, { imagen_x: Number(e.target.value) })} />
                </label>
                <label className="flex items-center gap-1">↕
                  <input type="range" min={0} max={100} value={actual.imagen_y ?? 50} onChange={e => cambiar(mes, { imagen_y: Number(e.target.value) })} />
                </label>
                <Button variant="ghost" className="px-2 py-1 text-[10px] text-rose-600" onClick={() => cambiar(mes, { imagen: '' })}>Quitar ilustración</Button>
              </>
            )}
            <Button variant="ghost" className="ml-auto gap-1 px-2 py-1 text-[10px]" onClick={restaurarMes}><RotateCcw className="h-3 w-3" />Restaurar original del mes</Button>
            {avisoImagen && <p className="w-full text-amber-700">{avisoImagen}</p>}
          </div>
        )}
      </div>

      {errorCarga && (
        <div className="ca-no-imprimir mx-auto mt-4 max-w-3xl rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {errorCarga} Se muestra el contenido original, sin los cambios guardados.
        </div>
      )}
      {estado === 'conflicto' && (
        <div className="ca-no-imprimir mx-auto mt-4 flex max-w-3xl items-center justify-between gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {mensaje}
          <Button variant="outline" onClick={() => { sucios.current.clear(); cargar(); }}>Recargar</Button>
        </div>
      )}

      {/* ── LA HOJA ────────────────────────────────────────────────────── */}
      <div className="ca-no-imprimir mx-auto max-w-6xl px-3 py-5">
        <HojaEscalada>
          <HojaMes
            anio={anio}
            contenido={actual}
            editando={editando}
            alCambiar={c => cambiar(mes, c)}
            alElegirImagen={() => entradaImagen.current?.click()}
            subiendoImagen={subiendoImagen}
          />
        </HojaEscalada>
        <input ref={entradaImagen} type="file" accept="image/*" className="hidden" onChange={e => { subirIlustracion(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      {panel === 'carpeta' && (
        <PanelCarpeta
          mes={mes}
          referencias={refsMes}
          puedeEditar={puedeEditar}
          alGuardar={guardarReferencias(mes)}
          alUsarComoIlustracion={url => { cambiar(mes, { imagen: url }); setPanel(null); }}
          alCerrar={() => setPanel(null)}
        />
      )}
      {panel === 'estilo' && (
        <PanelCarpeta
          mes={0}
          referencias={guardados[0]?.referencias ?? []}
          puedeEditar={puedeEditar}
          alGuardar={guardarReferencias(0)}
          alUsarComoIlustracion={() => {}}
          alCerrar={() => setPanel('principios')}
        />
      )}
      {panel === 'conocer' && (
        <PanelConocer
          contenido={actual}
          datos={INVESTIGACION_POR_MES[mes]?.datos_clave ?? []}
          candidatas={INVESTIGACION_POR_MES[mes]?.iniciativas ?? []}
          puedeEditar={puedeEditar}
          alElegir={iniciativa => cambiar(mes, { iniciativa })}
          alCambiarQR={qr_url => cambiar(mes, { qr_url })}
          alCerrar={() => { setPanel(null); if (params.get('conocer')) setParams(p => { p.delete('conocer'); return p; }, { replace: true }); }}
        />
      )}
      {panel === 'principios' && (
        <PanelPrincipios
          principios={principios}
          puedeEditar={puedeEditar}
          mes={mes}
          evaluacion={actual.evaluacion ?? {}}
          nota={actual.evaluacion_nota ?? ''}
          alGuardarPrincipios={p => cambiar(0, { principios: p })}
          alEvaluar={(evaluacion, evaluacion_nota) => cambiar(mes, { evaluacion, evaluacion_nota })}
          alAbrirEstilo={() => setPanel('estilo')}
          alCerrar={() => setPanel(null)}
        />
      )}
      {panel === 'ideas' && (
        <PanelIdeas
          anio={anio}
          mesActual={mes}
          puedeProponer={puedeProponer}
          puedeEditar={puedeEditar}
          alCambiarPendientes={setPendientes}
          alCerrar={() => setPanel(null)}
        />
      )}

      {/* ── LO QUE SE IMPRIME ──────────────────────────────────────────── */}
      {/* Fuera de la aplicación (directamente en <body>), para que ni el menú
          ni el contenedor con scroll recorten las hojas al imprimir. */}
      {imprimiendo && createPortal(
        <div className="ca-impresion">
          {imprimiendo.map(m => (
            <HojaMes key={m} anio={anio} contenido={meses[m - 1]} editando={false} alCambiar={() => {}} />
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

// Fuera de pantalla mientras se prepara la impresión.
const CSS_PANTALLA = `
@media screen {
  .ca-impresion { position: fixed; left: -100000px; top: 0; }
}
@media print {
  html, body { margin: 0 !important; padding: 0 !important; background: white !important; height: auto !important; overflow: visible !important; }
  body > *:not(.ca-impresion) { display: none !important; }
  .ca-impresion { position: static; }
  .ca-no-imprimir { display: none !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
`;

/** A3 vertical: una página por mes, las dos mitades juntas. */
const CSS_A3 = `
@media print {
  @page { size: 297mm 420mm; margin: 0; }
  .ca-impresion .ca-hoja { break-after: page; page-break-after: always; }
  .ca-impresion .ca-hoja:last-child { break-after: auto; page-break-after: auto; }
}
`;

/** A4 apaisado: cada mitad en su página (ilustración, luego calendario). */
const CSS_A4 = `
@media print {
  @page { size: 297mm 210mm; margin: 0; }
  .ca-impresion .ca-hoja { height: auto !important; overflow: visible !important; }
  .ca-impresion .ca-mitad { break-after: page; page-break-after: always; overflow: hidden; }
  .ca-impresion .ca-hoja:last-child .ca-mitad:last-child { break-after: auto; page-break-after: auto; }
}
`;

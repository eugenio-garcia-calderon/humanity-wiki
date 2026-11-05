// ============================================================================
// CALENDARIO ARTE PARA LA HUMANIDAD (2026-11-04, Eugenio)
// ============================================================================
// Doce meses, doce temáticas de la humanidad. Cada hoja es un A3 vertical:
// ilustración arriba (A4 apaisado), franja con una herramienta o juego, y el
// mes con una frase pedagógica por día abajo (A4 apaisado).
//
// · Todo se edita en su sitio, desde cualquier dispositivo y sin cuenta, y se
//   guarda solo (con historial para deshacer).
// · Cada mes tiene su carpeta: ilustraciones, bocetos y referencias.
// · «Exportar» imprime o guarda en PDF solo el contenido definitivo, a tamaño
//   real: sin botones, sin carpeta, sin marcas de edición.
// · «Tareas de mejora» es el buzón que la IA lee para implementar mejoras;
//   se llena con el botón de abajo, «Añadir propuesta de mejora».
//
// PÁGINA PROPIA (2026-11-05, Eugenio): vive FUERA del Layout de la plataforma.
// Quien diseña entra por el enlace, sin cuenta, y no debe ver Humanity.Wiki:
// ni sus herramientas, ni iniciar sesión, ni el buscador, ni el feedback o la
// IA flotantes. Lleva su logo («Arte para la Humanidad») y su propio menú.
//
// El contenido por defecto está en `src/data/calendarioArte.ts`; lo que se
// edita aquí vive en `calendario_arte_meses` (ver `src/server/calendarioArte.ts`).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Pencil, Eye, FolderOpen, ListChecks, Download, Compass, Info, History, Loader2, ChevronLeft, ChevronRight, Check, AlertTriangle, RotateCcw, Type, Menu, X, Star,
} from 'lucide-react';
import { Button } from '../components/ui/core';
import { cn } from '../utils/cn';
import { subirImagenCalendario } from '../components/calendarioArte/subirImagen';
import { HojaMes, NOMBRES_MES, ANCHO_MM, ALTO_MM, ACENTOS, type DisenoVista, type EncargoDiseno } from '../components/calendarioArte/HojaMes';
import { NuevoDiseno, AvisoDisenoListo, type EstadoRobot } from '../components/calendarioArte/NuevoDiseno';
import { PanelIdeas, PanelPrincipios, PanelConocer, PanelHistorial } from '../components/calendarioArte/Paneles';
import { VistaCarpetas } from '../components/calendarioArte/VistaCarpetas';
import { BotonPropuesta } from '../components/calendarioArte/BotonPropuesta';
import { TIPOGRAFIAS, TIPOGRAFIA_POR_DEFECTO, cargarTipografias, estiloTipografia, type EleccionTipografia } from '../components/calendarioArte/tipografias';
import { HojaPortada, ALTO_PORTADA_MM } from '../components/calendarioArte/HojaPortada';
import { INVESTIGACION_POR_MES } from '../data/calendarioArteInvestigacion';
import { PRINCIPIOS_POR_DEFECTO, type Principio } from '../data/calendarioArtePrincipios';
import { CALENDARIO_ARTE_ANIO, CALENDARIO_ARTE_POR_DEFECTO } from '../data/calendarioArte';
import { PORTADA_POR_DEFECTO, type ContenidoMes, type PortadaCalendario, type Referencia } from '../data/calendarioArteTipos';

interface Guardado {
  // En la hoja 0 (lo común del año) el contenido es `{ principios }`.
  contenido: Partial<ContenidoMes> & { principios?: Principio[]; portada?: Partial<PortadaCalendario>; tipografia?: EleccionTipografia };
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
function HojaEscalada({ children, altoMm = ALTO_MM }: { children: React.ReactNode; altoMm?: number }) {
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
      <div style={{ height: altoMm * MM_A_PX * escala, width: ANCHO_MM * MM_A_PX * escala }} className="mx-auto shadow-xl ring-1 ring-stone-200">
        <div style={{ transform: `scale(${escala})`, transformOrigin: 'top left', width: `${ANCHO_MM}mm` }}>{children}</div>
      </div>
    </div>
  );
}

/** El logo provisional: doce puntos de los colores del año en círculo y el nombre. */
function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative h-8 w-8 shrink-0" aria-hidden>
        {ACENTOS.map((a, i) => {
          const ang = (i / 12) * Math.PI * 2 - Math.PI / 2;
          return <span key={i} className={cn('absolute h-[7px] w-[7px] rounded-full', a.fondo)} style={{ left: `${50 + 36 * Math.cos(ang)}%`, top: `${50 + 36 * Math.sin(ang)}%`, transform: 'translate(-50%, -50%)' }} />;
        })}
      </span>
      <span className="font-serif text-[17px] font-semibold leading-tight text-stone-800 sm:text-lg">Arte para la Humanidad</span>
    </span>
  );
}

/** Un diseño pedido con «Crear nuevo diseño», tal como lo da el servidor. */
interface DisenoServidor {
  id: number; mes: number; prompt: string; estado: 'en_cola' | 'dibujando' | 'listo' | 'error' | 'descartado';
  url: string | null; nota: string | null; listo_hacia: string | null; created_at: string; terminado_at: string | null;
}

export default function CalendarioArte() {
  const [params, setParams] = useSearchParams();
  const anio = CALENDARIO_ARTE_ANIO;
  // `mes` 0 es el CALENDARIO COMPLETO (2026-11-05, Eugenio: «que se pueda ver
  // el calendario entero haciendo scroll down sin pinchar en cada mes»): la
  // portada y debajo los doce meses seguidos. Es lo que se ve al entrar sin
  // `?mes=`. Las flechas dan la vuelta: completo → enero → … → diciembre → completo.
  const mesParam = params.get('mes');
  const mes = mesParam === null ? 0 : Math.min(12, Math.max(0, Math.trunc(Number(mesParam)) || 0));
  const esPortada = mes === 0;
  // La otra vista: las carpetas (`?vista=carpetas`, y `&carpeta=N` dentro de una).
  const enCarpetas = params.get('vista') === 'carpetas';
  const carpetaParam = params.get('carpeta');
  const carpeta = carpetaParam === null ? null : Math.min(12, Math.max(0, Math.trunc(Number(carpetaParam)) || 0));
  const irAMes = (m: number) => setParams(p => {
    p.set('mes', String(((m % 13) + 13) % 13)); p.delete('vista'); p.delete('carpeta'); return p;
  }, { replace: true });
  const irACarpeta = (c: number | null) => setParams(p => {
    p.set('vista', 'carpetas'); if (c === null) p.delete('carpeta'); else p.set('carpeta', String(c)); return p;
  }, { replace: true });

  // Al cambiar de vista se empieza arriba: viniendo del calendario completo
  // (muy largo) el mes suelto aparecería ya bajado o en blanco.
  useEffect(() => { window.scrollTo({ top: 0 }); }, [mes, enCarpetas, carpeta]);

  const [guardados, setGuardados] = useState<Record<number, Guardado>>({});
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [puedeEditar, setPuedeEditar] = useState(false);
  // Se edita siempre, como en las páginas: pinchar un texto es cambiarlo. La
  // «Vista final» quita los marcos y botones para ver cómo quedará impreso.
  const [vistaFinal, setVistaFinal] = useState(false);
  const editando = puedeEditar && !vistaFinal;
  const [menuMovil, setMenuMovil] = useState(false);
  const [menuLetra, setMenuLetra] = useState(false);
  const [recargaIdeas, setRecargaIdeas] = useState(0);
  // Qué diseño se mira. Por defecto el FAVORITO de cada mes (Eugenio: «se
  // enseñe el favorito cuando se carga la página»). `modoVista` cambia los doce
  // meses a la vez (para comparar el año entero en el diseño 1, 2 o 3) y
  // `vistoPorMes` es lo que alguien eligió en un mes concreto.
  const [modoVista, setModoVista] = useState<'fav' | number>('fav');
  const [vistoPorMes, setVistoPorMes] = useState<Record<number, string>>({});
  // Los diseños pedidos con «Crear nuevo diseño» (cola del dibujante automático).
  const [disenosIA, setDisenosIA] = useState<DisenoServidor[]>([]);
  const [robot, setRobot] = useState<EstadoRobot | null>(null);
  const [creandoMes, setCreandoMes] = useState<number | null>(null);
  const [avisos, setAvisos] = useState<{ mes: number; url: string }[]>([]);
  const estadosPrevios = useRef<Map<number, string> | null>(null);
  const [estado, setEstado] = useState<EstadoGuardado>('listo');
  const [mensaje, setMensaje] = useState<string | null>(null);
  // `?conocer=1` es a donde lleva el QR impreso: abre directamente la ficha del tema.
  const [panel, setPanel] = useState<'ideas' | 'principios' | 'conocer' | 'historial' | null>(
    () => (params.get('conocer') === '1' ? 'conocer' : null));
  const [pendientes, setPendientes] = useState<number | null>(null);
  const [menuExportar, setMenuExportar] = useState(false);
  const [imprimiendo, setImprimiendo] = useState<number[] | null>(null);
  const [formato, setFormato] = useState<'a3' | 'a4'>('a3');
  // El mes cuya ilustración se está subiendo (en el calendario completo hay doce).
  const [subiendoImagen, setSubiendoImagen] = useState<number | null>(null);
  const mesSubida = useRef(0);
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

  // ── DISEÑOS NUEVOS ───────────────────────────────────────────────────────
  // Se leen al entrar y, mientras haya alguno en camino, cada 30 segundos.
  // Cuando uno pasa a «listo», aviso: «Diseño listo · Ver».
  const cargarDisenos = useCallback(async () => {
    try {
      const r = await fetch(`/api/calendario-arte/${anio}/disenos`, { credentials: 'include' });
      if (!r.ok) return;
      const j = await r.json();
      const lista: DisenoServidor[] = j.disenos ?? [];
      const antes = estadosPrevios.current;
      if (antes) {
        const nuevos = lista.filter(d => d.estado === 'listo' && d.url && (antes.get(d.id) === 'en_cola' || antes.get(d.id) === 'dibujando'));
        if (nuevos.length) setAvisos(v => [...v, ...nuevos.map(d => ({ mes: d.mes, url: d.url! }))]);
      }
      estadosPrevios.current = new Map(lista.map(d => [d.id, d.estado]));
      setDisenosIA(lista);
      setRobot(j.robot ?? null);
    } catch { /* sin red: se reintenta en la siguiente vuelta */ }
  }, [anio]);
  useEffect(() => { cargarDisenos(); }, [cargarDisenos]);
  const hayEnCamino = disenosIA.some(d => d.estado === 'en_cola' || d.estado === 'dibujando');
  useEffect(() => {
    if (!hayEnCamino) return;
    const t = window.setInterval(cargarDisenos, 30_000);
    const alVolver = () => { if (!document.hidden) cargarDisenos(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', alVolver); };
  }, [hayEnCamino, cargarDisenos]);

  // Que los buscadores no lo indexen (Eugenio, 2026-11-05). El servidor ya
  // manda `X-Robots-Tag: noindex`; la etiqueta es para quien solo lee el HTML
  // ya pintado. Se quita al salir: el resto de la plataforma sí se indexa.
  useEffect(() => {
    const titulo = document.title;
    document.title = `Arte para la Humanidad ${anio}`;
    return () => { document.title = titulo; };
  }, [anio]);
  useEffect(() => {
    const m = document.createElement('meta');
    m.name = 'robots';
    m.content = 'noindex, nofollow, noarchive, noimageindex';
    document.head.appendChild(m);
    return () => { m.remove(); };
  }, []);

  const meses = useMemo(
    () => CALENDARIO_ARTE_POR_DEFECTO.map(base => mezclar(base, guardados[base.mes]?.contenido)),
    [guardados],
  );
  // En la portada no hay mes: se usa enero para que los ganchos no cambien de forma.
  const actual = meses[Math.max(1, mes) - 1];

  // ── GUARDAR ──────────────────────────────────────────────────────────────
  const guardadosRef = useRef(guardados);
  guardadosRef.current = guardados;
  const eleccionLetraRef = useRef<EleccionTipografia>(TIPOGRAFIA_POR_DEFECTO);
  eleccionLetraRef.current = { ...TIPOGRAFIA_POR_DEFECTO, ...(guardados[0]?.contenido.tipografia ?? {}) };

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
    if (!confirm(`¿Volver ${NOMBRES_MES[mes - 1]} al contenido original? Lo de ahora queda guardado en el Historial (la carpeta de referencias se conserva).`)) return;
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
    const m = mesSubida.current || mes;
    if (!m) return;
    setSubiendoImagen(m);
    // Se sube el ORIGINAL, sin comprimir: es lo que va a imprenta. Solo las
    // fotos HEIC del iPhone pasan por la conversión (el servidor no las admite).
    // Por la puerta del calendario, que no pide cuenta (2026-11-05).
    const r = await subirImagenCalendario(f, { original: true });
    setSubiendoImagen(null);
    if ('error' in r) { setMensaje(r.error); setEstado('error'); return; }
    cambiar(m, { imagen: r.url });
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
      await cargarTipografias(eleccionLetraRef.current);
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('.ca-impresion img'));
      await Promise.all(imgs.map(i => i.complete ? Promise.resolve() : new Promise(res => { i.onload = i.onerror = () => res(null); })));
      if (vivo) window.print();
    }, 50);
    return () => { vivo = false; window.clearTimeout(t); window.removeEventListener('afterprint', fin); };
  }, [imprimiendo]);

  // ── TIPO DE LETRA ────────────────────────────────────────────────────────
  const eleccionLetra: EleccionTipografia = { ...TIPOGRAFIA_POR_DEFECTO, ...(guardados[0]?.contenido.tipografia ?? {}) };
  useEffect(() => { cargarTipografias(eleccionLetra); }, [eleccionLetra.titulos, eleccionLetra.texto]);
  const elegirLetra = (c: Partial<EleccionTipografia>) => cambiar(0, { tipografia: { ...eleccionLetra, ...c } });

  // ── CARPETAS ─────────────────────────────────────────────────────────────
  /** Poner otra ilustración en el calendario sin perder la que había: si la
   *  de ahora no está guardada en la carpeta (ni es la original), se guarda. */
  const usarIlustracion = async (m: number, url: string) => {
    const ahora = meses[m - 1]?.imagen;
    const original = CALENDARIO_ARTE_POR_DEFECTO[m - 1]?.imagen;
    const refs = guardados[m]?.referencias ?? [];
    if (ahora && ahora !== original && !refs.some(r => r.url === ahora)) {
      await guardarReferencias(m)([...refs, { url: ahora, tipo: 'ilustracion' }]);
    }
    cambiar(m, { imagen: url });
  };
  const pedirIlustracionIA = async (m: number): Promise<boolean> => {
    try {
      const r = await fetch(`/api/calendario-arte/${anio}/ideas`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes: m, texto: `Generar una ilustración nueva para ${NOMBRES_MES[m - 1]} (${meses[m - 1]?.tema}) a partir del encargo, los bocetos y las referencias de su carpeta (humanity.wiki/calendario-arte?vista=carpetas&carpeta=${m}). Guardarla en la carpeta como ilustración, sin quitar la actual.` }),
      });
      if (!r.ok) return false;
      setRecargaIdeas(n => n + 1); setPendientes(p => (p ?? 0) + 1);
      return true;
    } catch { return false; }
  };

  if (cargando) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-stone-100 text-sm text-stone-400"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando el calendario…</div>;
  }

  const principios = guardados[0]?.contenido.principios ?? PRINCIPIOS_POR_DEFECTO;
  const portada: PortadaCalendario = { ...PORTADA_POR_DEFECTO, ...(guardados[0]?.contenido.portada ?? {}) };
  const cambiarPortada = (c: Partial<PortadaCalendario>) => cambiar(0, { portada: { ...(guardados[0]?.contenido.portada ?? {}), ...c } });
  const carpetas: Record<number, Referencia[]> = Object.fromEntries(Array.from({ length: 13 }, (_, i) => [i, guardados[i]?.referencias ?? []]));
  const vistaLetra = estiloTipografia(eleccionLetra) as React.CSSProperties;

  // ── LOS DISEÑOS DE CADA MES ──────────────────────────────────────────────
  /** Los de la casa (1, 2, 3… del código), los pedidos que ya están listos y,
   *  si alguien subió otra ilustración, esa también. */
  const disenosDe = (m: ContenidoMes): DisenoVista[] => {
    const casa = m.disenos ?? (m.imagen ? [m.imagen] : []);
    const urls = [...casa];
    for (const d of disenosIA) if (d.mes === m.mes && d.estado === 'listo' && d.url && !urls.includes(d.url)) urls.push(d.url);
    if (m.imagen && !urls.includes(m.imagen)) urls.push(m.imagen);
    return urls.map((url, i) => ({ url, n: i + 1, generado: !casa.includes(url), nota: disenosIA.find(d => d.url === url)?.prompt ?? null }));
  };
  /** Sin elegir, el favorito es el Diseño 2 (Eugenio, 2026-11-05: «marca como
   *  favoritos todos los diseños número 2, son los mejores hasta ahora»). */
  const favoritoDe = (m: ContenidoMes, lista: DisenoVista[]) =>
    m.favorito && lista.some(d => d.url === m.favorito) ? m.favorito : (lista[1]?.url ?? lista[0]?.url);
  const vistoDe = (m: ContenidoMes, lista = disenosDe(m)) => {
    const elegido = vistoPorMes[m.mes];
    if (elegido && lista.some(d => d.url === elegido)) return elegido;
    if (modoVista !== 'fav' && lista[modoVista - 1]) return lista[modoVista - 1].url;
    return favoritoDe(m, lista);
  };
  /** Lo pedido para el mes que aún no está (y los fallos del último día). */
  const encargosDe = (mes: number): EncargoDiseno[] => disenosIA
    .filter(d => d.mes === mes && (d.estado === 'en_cola' || d.estado === 'dibujando'
      || (d.estado === 'error' && Date.now() - new Date(d.terminado_at ?? d.created_at).getTime() < 86_400_000)))
    .map(d => ({ id: d.id, mes: d.mes, estado: d.estado as EncargoDiseno['estado'], listo_hacia: d.listo_hacia, prompt: d.prompt, nota: d.nota }));
  const maxDisenosCasa = Math.max(1, ...meses.map(m => m.disenos?.length ?? 1));

  /** La hoja de un mes en pantalla, editable y con el cambio de diseño. En la
   *  «Vista final» no hay selector: se ve lo que se imprime. */
  const hojaDeMes = (m: ContenidoMes, perezosa: boolean) => {
    const lista = disenosDe(m);
    return (
      <HojaMes
        anio={anio}
        contenido={m}
        editando={editando}
        alCambiar={c => cambiar(m.mes, c)}
        alElegirImagen={() => { mesSubida.current = m.mes; entradaImagen.current?.click(); }}
        alAbrirCarpeta={() => irACarpeta(m.mes)}
        subiendoImagen={subiendoImagen === m.mes}
        {...(editando ? {
          disenos: lista,
          visto: vistoDe(m, lista),
          favorito: favoritoDe(m, lista),
          alVer: (url: string) => setVistoPorMes(v => ({ ...v, [m.mes]: url })),
          alFavorito: (url: string) => cambiar(m.mes, { favorito: url }),
          encargos: encargosDe(m.mes),
          alCrearDiseno: () => setCreandoMes(m.mes),
        } : {})}
        perezosa={perezosa}
      />
    );
  };

  /** Un botón del menú del proyecto. */
  const itemMenu = (activo: boolean, onClick: () => void, icono: React.ReactNode, texto: string) => (
    <Button variant={activo ? 'primary' : 'ghost'} onClick={() => { onClick(); setMenuMovil(false); }}
      className={cn('justify-start gap-1.5 px-3 normal-case tracking-normal text-sm', !activo && 'text-stone-600')}>
      {icono}{texto}
    </Button>
  );

  return (
    <div className="min-h-[100dvh] bg-stone-100 pb-24 text-stone-800">
      <style>{CSS_PANTALLA + (formato === 'a3' ? CSS_A3 : CSS_A4)}</style>

      {/* ── CABECERA PROPIA: LOGO + MENÚ DEL PROYECTO ──────────────────── */}
      <header className="ca-no-imprimir sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2">
          <button type="button" onClick={() => irAMes(0)} className="mr-auto min-w-0 text-left" title="Ver el calendario completo"><Logo /></button>

          <nav className="hidden items-center gap-1 lg:flex">
            {itemMenu(!enCarpetas, () => irAMes(mes), <Eye className="h-4 w-4" />, 'Calendario')}
            {itemMenu(enCarpetas, () => irACarpeta(null), <FolderOpen className="h-4 w-4" />, 'Carpetas')}
            {itemMenu(panel === 'principios', () => setPanel('principios'), <Compass className="h-4 w-4" />, 'Principios')}
            {itemMenu(panel === 'ideas', () => setPanel('ideas'), <ListChecks className="h-4 w-4" />, `Tareas de mejora${pendientes ? ` (${pendientes})` : ''}`)}
          </nav>
          <div className="relative">
            <Button className="gap-1.5 px-3" onClick={() => setMenuExportar(v => !v)} disabled={!!imprimiendo}>
              {imprimiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}<span className="hidden sm:inline">Exportar</span>
            </Button>
            {menuExportar && (
              <div className="absolute right-0 top-full z-40 mt-1 w-72 rounded-xl border border-stone-200 bg-white p-2 shadow-xl">
                <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">A3 vertical (ilustración + calendario en una hoja)</p>
                {!enCarpetas && <Button variant="ghost" className="w-full justify-start normal-case tracking-normal text-sm" onClick={() => exportar([mes], 'a3')}>{esPortada ? 'Solo la portada' : `Este mes (${NOMBRES_MES[mes - 1]})`}</Button>}
                <Button variant="ghost" className="w-full justify-start normal-case tracking-normal text-sm" onClick={() => exportar([0, ...meses.map(m => m.mes)], 'a3')}>Portada y los 12 meses</Button>
                <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">A4 apaisado (dos páginas por mes)</p>
                {!enCarpetas && <Button variant="ghost" className="w-full justify-start normal-case tracking-normal text-sm" onClick={() => exportar([mes], 'a4')}>{esPortada ? 'Solo la portada' : `Este mes (${NOMBRES_MES[mes - 1]})`}</Button>}
                <Button variant="ghost" className="w-full justify-start normal-case tracking-normal text-sm" onClick={() => exportar([0, ...meses.map(m => m.mes)], 'a4')}>Portada y los 12 meses</Button>
                <p className="px-3 pb-1 pt-2 text-[11px] leading-snug text-stone-500">
                  Se abre el diálogo de impresión a tamaño real, solo con el contenido definitivo. Para un PDF de
                  imprenta elige «Guardar como PDF», el mismo tamaño (A3 o A4), márgenes <b>Ninguno</b> y activa
                  <b> Gráficos de fondo</b>.
                </p>
              </div>
            )}
          </div>
          <Button variant="ghost" className="px-2 lg:hidden" onClick={() => setMenuMovil(v => !v)} aria-label="Menú">
            {menuMovil ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        {menuMovil && (
          <nav className="mx-auto grid max-w-6xl gap-1 border-t border-stone-100 px-3 py-2 lg:hidden">
            {itemMenu(!enCarpetas, () => irAMes(mes), <Eye className="h-4 w-4" />, 'Calendario')}
            {itemMenu(enCarpetas, () => irACarpeta(null), <FolderOpen className="h-4 w-4" />, 'Carpetas')}
            {itemMenu(panel === 'principios', () => setPanel('principios'), <Compass className="h-4 w-4" />, 'Principios de diseño')}
            {itemMenu(panel === 'ideas', () => setPanel('ideas'), <ListChecks className="h-4 w-4" />, `Tareas de mejora${pendientes ? ` (${pendientes})` : ''}`)}
          </nav>
        )}

        {/* El calendario completo y los doce meses sueltos */}
        {!enCarpetas && (
          <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-3 pb-2">
            <Button variant="ghost" className="px-1.5" onClick={() => irAMes(mes - 1)} aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant={esPortada ? 'primary' : 'ghost'} className={cn('shrink-0 px-2.5 py-1.5 normal-case tracking-normal text-xs', !esPortada && 'text-stone-500')} onClick={() => irAMes(0)}>
              Calendario completo
            </Button>
            {meses.map(m => (
              <Button key={m.mes} variant={m.mes === mes ? 'primary' : 'ghost'}
                className={cn('shrink-0 px-2.5 py-1.5 normal-case tracking-normal text-xs', m.mes !== mes && 'text-stone-500')}
                onClick={() => irAMes(m.mes)} title={m.tema}>
                {NOMBRES_MES[m.mes - 1].slice(0, 3)}
              </Button>
            ))}
            <Button variant="ghost" className="px-1.5" onClick={() => irAMes(mes + 1)} aria-label="Siguiente"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}

        {/* Herramientas de la hoja: guardar, letra, vista final, historial… */}
        {!enCarpetas && puedeEditar && (
          <div className="mx-auto flex max-w-6xl flex-col gap-1 border-t border-stone-100 px-3 py-1.5 text-xs text-stone-600 md:flex-row md:flex-wrap md:items-center md:gap-x-3">
            <span className="min-w-0">
              {estado === 'guardando' && <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Guardando…</span>}
              {estado === 'pendiente' && 'Cambios sin guardar…'}
              {estado === 'listo' && (editando ? <span className="inline-flex items-center gap-1 text-emerald-700"><Check className="h-3 w-3" />Pincha cualquier texto para cambiarlo<span className="hidden sm:inline"> · se guarda solo</span></span> : 'Vista final: así se imprimirá')}
              {(estado === 'error' || estado === 'conflicto') && <span className="inline-flex items-center gap-1 text-rose-600"><AlertTriangle className="h-3 w-3" />{mensaje}</span>}
            </span>
            <span className="-mx-1 flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap md:mx-0 md:ml-auto md:flex-wrap md:overflow-visible">
              {!esPortada && editando && actual.imagen && (
                <>
                  <label className="hidden items-center gap-1 md:flex">↔<input type="range" min={0} max={100} value={actual.imagen_x ?? 50} onChange={e => cambiar(mes, { imagen_x: Number(e.target.value) })} className="w-20" /></label>
                  <label className="hidden items-center gap-1 md:flex">↕<input type="range" min={0} max={100} value={actual.imagen_y ?? 50} onChange={e => cambiar(mes, { imagen_y: Number(e.target.value) })} className="w-20" /></label>
                </>
              )}
              <span className="relative">
                <Button variant="ghost" className="gap-1 px-2 py-1 text-[10px]" onClick={() => setMenuLetra(v => !v)}><Type className="h-3.5 w-3.5" />Letra</Button>
                {menuLetra && (
                  <div className="absolute right-0 top-full z-40 mt-1 w-64 space-y-2 rounded-xl border border-stone-200 bg-white p-3 shadow-xl">
                    {(['titulos', 'texto'] as const).map(k => (
                      <label key={k} className="block text-xs font-semibold text-stone-600">
                        {k === 'titulos' ? 'Títulos' : 'Texto'}
                        <select value={eleccionLetra[k]} onChange={e => elegirLetra({ [k]: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm font-normal">
                          {TIPOGRAFIAS.map(t => <option key={t.id} value={t.id} style={{ fontFamily: t.familia }}>{t.nombre}</option>)}
                        </select>
                      </label>
                    ))}
                    <p className="text-[11px] text-stone-400">Se aplica a la portada y a los doce meses, también al exportar.</p>
                  </div>
                )}
              </span>
              {!esPortada && <Button variant="ghost" className="gap-1 px-2 py-1 text-[10px]" onClick={() => setPanel('conocer')}><Info className="h-3.5 w-3.5" />Conocer más</Button>}
              {!esPortada && <Button variant="ghost" className="gap-1 px-2 py-1 text-[10px]" onClick={() => irACarpeta(mes)}><FolderOpen className="h-3.5 w-3.5" />Carpeta del mes</Button>}
              <Button variant="ghost" className="gap-1 px-2 py-1 text-[10px]" onClick={() => setPanel('historial')}><History className="h-3.5 w-3.5" />Historial</Button>
              {!esPortada && editando && <Button variant="ghost" className="gap-1 px-2 py-1 text-[10px]" onClick={restaurarMes}><RotateCcw className="h-3.5 w-3.5" />Volver al original</Button>}
              <Button variant={vistaFinal ? 'primary' : 'outline'} className="gap-1 px-2 py-1 text-[10px]" onClick={() => { if (!vistaFinal) enviarPendientes(); setVistaFinal(v => !v); }}>
                {vistaFinal ? <><Pencil className="h-3.5 w-3.5" />Volver a editar</> : <><Eye className="h-3.5 w-3.5" />Vista final</>}
              </Button>
            </span>
            {avisoImagen && editando && !esPortada && <p className="w-full text-amber-700">{avisoImagen}</p>}
          </div>
        )}
      </header>

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

      {enCarpetas ? (
        <div className="ca-no-imprimir">
          <VistaCarpetas
            meses={meses}
            originales={CALENDARIO_ARTE_POR_DEFECTO}
            carpetas={carpetas}
            abierta={carpeta}
            editando={puedeEditar}
            alAbrir={irACarpeta}
            alGuardar={(m, refs) => guardarReferencias(m)(refs)}
            alUsarIlustracion={usarIlustracion}
            alCambiarMes={(m, c) => cambiar(m, c)}
            alVerMes={irAMes}
            alPedirIA={pedirIlustracionIA}
          />
        </div>
      ) : (
        <div className="ca-no-imprimir mx-auto max-w-6xl px-3 py-5" style={vistaLetra}>
          {esPortada ? (
            // EL CALENDARIO COMPLETO: la portada y debajo los doce meses, con
            // scroll. Pinchar un tema de la portada baja hasta su mes.
            <div className="space-y-10">
              {editando && (
                <div className="-mb-6 flex flex-wrap items-center justify-center gap-1 text-xs text-stone-500">
                  <span className="mr-1">Ver en los doce meses:</span>
                  <Button variant={modoVista === 'fav' ? 'primary' : 'ghost'} className="gap-1 px-2.5 py-1 normal-case tracking-normal text-xs"
                    onClick={() => { setModoVista('fav'); setVistoPorMes({}); }}>
                    <Star className="h-3.5 w-3.5" />Favoritos
                  </Button>
                  {Array.from({ length: maxDisenosCasa }, (_, i) => i + 1).map(n => (
                    <Button key={n} variant={modoVista === n ? 'primary' : 'ghost'} className="px-2.5 py-1 normal-case tracking-normal text-xs"
                      onClick={() => { setModoVista(n); setVistoPorMes({}); }}>
                      Diseño {n}
                    </Button>
                  ))}
                </div>
              )}
              <HojaEscalada altoMm={ALTO_PORTADA_MM}>
                <HojaPortada anio={anio} meses={meses} portada={portada} editando={editando} alCambiar={cambiarPortada}
                  imagenes={editando ? Object.fromEntries(meses.map(m => [m.mes, vistoDe(m)])) : undefined}
                  alAbrirMes={m => document.getElementById(`ca-mes-${m}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
              </HojaEscalada>
              {meses.map(m => (
                <section key={m.mes} id={`ca-mes-${m.mes}`} className="scroll-mt-36">
                  <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h2 className="text-sm font-semibold text-stone-700">{NOMBRES_MES[m.mes - 1]} · {m.tema}</h2>
                    <span className="ml-auto flex items-center gap-1">
                      <Button variant="ghost" className="gap-1 px-2 py-1 text-[10px]" onClick={() => irAMes(m.mes)}><Eye className="h-3.5 w-3.5" />Solo este mes</Button>
                      <Button variant="ghost" className="gap-1 px-2 py-1 text-[10px]" onClick={() => irACarpeta(m.mes)}><FolderOpen className="h-3.5 w-3.5" />Carpeta</Button>
                    </span>
                  </div>
                  <HojaEscalada>{hojaDeMes(m, true)}</HojaEscalada>
                </section>
              ))}
            </div>
          ) : (
            <HojaEscalada>{hojaDeMes(actual, false)}</HojaEscalada>
          )}
          <input ref={entradaImagen} type="file" accept="image/*" className="hidden" onChange={e => { subirIlustracion(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      )}

      {/* Abajo y centrado, siempre: proponer una mejora (texto, voz o imágenes). */}
      <BotonPropuesta anio={anio} mes={enCarpetas ? (carpeta || null) : (esPortada ? null : mes)}
        alEnviada={() => { setRecargaIdeas(n => n + 1); setPendientes(p => (p ?? 0) + 1); }} />

      {panel === 'historial' && (
        <PanelHistorial anio={anio} mes={mes} alRestaurado={() => { sucios.current.delete(mes); cargar(); }} alCerrar={() => setPanel(null)} />
      )}
      {panel === 'conocer' && !esPortada && (
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
          mes={Math.max(1, mes)}
          evaluacion={actual.evaluacion ?? {}}
          nota={actual.evaluacion_nota ?? ''}
          alGuardarPrincipios={p => cambiar(0, { principios: p })}
          alEvaluar={(evaluacion, evaluacion_nota) => cambiar(Math.max(1, mes), { evaluacion, evaluacion_nota })}
          alAbrirEstilo={() => { setPanel(null); irACarpeta(0); }}
          alCerrar={() => setPanel(null)}
        />
      )}
      {panel === 'ideas' && (
        <PanelIdeas
          anio={anio}
          puedeEditar={puedeEditar}
          recarga={recargaIdeas}
          alCambiarPendientes={setPendientes}
          alCerrar={() => setPanel(null)}
        />
      )}

      {creandoMes !== null && (
        <NuevoDiseno
          anio={anio}
          mes={creandoMes}
          tema={meses[creandoMes - 1]?.tema ?? ''}
          robot={robot}
          alCerrar={() => setCreandoMes(null)}
          alPedido={e => {
            if (e.id) {
              setDisenosIA(v => [...v.filter(d => d.id !== e.id), { ...e, url: null, created_at: new Date().toISOString(), terminado_at: null } as DisenoServidor]);
              estadosPrevios.current?.set(e.id, e.estado);
            }
            if (e.robot) setRobot(e.robot);
            setCreandoMes(null);
            cargarDisenos();
          }}
        />
      )}
      {avisos[0] && (() => {
        const a = avisos[0];
        const m = meses[a.mes - 1];
        const n = m ? disenosDe(m).find(d => d.url === a.url)?.n ?? 0 : 0;
        return (
          <AvisoDisenoListo mes={a.mes} n={n}
            alVer={() => { setVistoPorMes(v => ({ ...v, [a.mes]: a.url })); setVistaFinal(false); irAMes(a.mes); setAvisos(v => v.slice(1)); }}
            alCerrar={() => setAvisos(v => v.slice(1))} />
        );
      })()}

      {/* ── LO QUE SE IMPRIME ──────────────────────────────────────────── */}
      {/* Fuera de la aplicación (directamente en <body>), para que nada
          recorte las hojas al imprimir. */}
      {imprimiendo && createPortal(
        <div className="ca-impresion" style={vistaLetra}>
          {imprimiendo.map(m => m === 0 ? (
            <HojaPortada key={0} anio={anio} meses={meses} portada={portada} editando={false} alCambiar={() => {}} />
          ) : (
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
.ca-hoja { font-family: var(--ca-texto, ui-serif, Georgia, Cambria, "Times New Roman", serif); -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
/* El navegador del móvil agranda el texto de las columnas que cree estrechas
   («text autosizing») y la hoja deja de parecerse a lo impreso. Lo desactivan
   el text-size-adjust (Safari) y un max-height enorme (Chrome, que no aumenta
   bloques con la altura acotada). :where() no pesa: cualquier clase gana. */
.ca-hoja :where(*) { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; max-height: 1000000px; }
.ca-hoja .ca-titulo { font-family: var(--ca-titulos, inherit); }
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

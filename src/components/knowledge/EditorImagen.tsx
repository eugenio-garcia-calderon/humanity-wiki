import { useCallback, useEffect, useRef, useState } from 'react';
import { subirArchivo } from '../../utils/subir';
import {
  X, Crop, RotateCw, FlipHorizontal, FlipVertical, Type, Pencil, Undo2,
  Check, Loader2, SunMedium, Contrast, Droplets, Wand2,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// EDITOR DE IMÁGENES (2026-08-08, petición del usuario) — sin dependencias:
// un <canvas> con pila de deshacer. Recibe una imagen (URL del propio
// dominio), deja recortar, rotar, voltear, ajustar luz/contraste/saturación,
// aplicar presets, escribir texto encima y dibujar a mano; al guardar sube el
// resultado a /api/uploads y devuelve la URL nueva por onGuardar.
// ============================================================================

type Herramienta = 'mover' | 'recortar' | 'texto' | 'pincel';

const PRESETS: { nombre: string; filtro: string }[] = [
  { nombre: 'Original', filtro: 'none' },
  { nombre: 'B/N', filtro: 'grayscale(1)' },
  { nombre: 'Sepia', filtro: 'sepia(0.8)' },
  { nombre: 'Cálida', filtro: 'sepia(0.25) saturate(1.3)' },
  { nombre: 'Fría', filtro: 'saturate(0.9) hue-rotate(15deg) brightness(1.05)' },
  { nombre: 'Dramática', filtro: 'contrast(1.35) saturate(1.15) brightness(0.95)' },
];

export default function EditorImagen({
  src, onGuardar, onCerrar,
}: { src: string; onGuardar: (url: string) => void; onCerrar: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [herramienta, setHerramienta] = useState<Herramienta>('mover');
  // Ajustes en vivo (se aplican al guardar o al pulsar Aplicar)
  const [brillo, setBrillo] = useState(100);
  const [contraste, setContraste] = useState(100);
  const [saturacion, setSaturacion] = useState(100);
  const [preset, setPreset] = useState('none');
  // Texto
  const [textoNuevo, setTextoNuevo] = useState('');
  const [colorTexto, setColorTexto] = useState('#ffffff');
  const [tamanoTexto, setTamanoTexto] = useState(48);
  // Pincel
  const [colorPincel, setColorPincel] = useState('#ef4444');
  const [grosorPincel, setGrosorPincel] = useState(6);
  // Recorte (rectángulo en coordenadas del canvas mostrado)
  const [recorte, setRecorte] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const arrastre = useRef<{ x0: number; y0: number } | null>(null);
  const pintando = useRef(false);
  // Pila de deshacer: instantáneas del canvas.
  const historial = useRef<ImageData[]>([]);
  const [pasos, setPasos] = useState(0);

  const ctx = () => canvasRef.current!.getContext('2d')!;

  const guardarPaso = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    historial.current.push(ctx().getImageData(0, 0, c.width, c.height));
    if (historial.current.length > 20) historial.current.shift();
    setPasos(historial.current.length);
  }, []);

  const deshacer = () => {
    const previo = historial.current.pop();
    if (!previo || !canvasRef.current) return;
    canvasRef.current.width = previo.width;
    canvasRef.current.height = previo.height;
    ctx().putImageData(previo, 0, 0);
    setPasos(historial.current.length);
  };

  // Cargar la imagen inicial en el canvas.
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = canvasRef.current;
      if (!c) return;
      // Techo de 2200px de lado para que el editor vuele incluso con fotos grandes.
      const escala = Math.min(1, 2200 / Math.max(img.width, img.height));
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      ctx().drawImage(img, 0, 0, c.width, c.height);
      setListo(true);
    };
    img.onerror = () => setError('No se ha podido cargar la imagen.');
    img.src = src;
  }, [src]);

  // ---- Operaciones de píxeles -----------------------------------------------
  const transformar = (rotar90: boolean, voltearH = false, voltearV = false) => {
    const c = canvasRef.current!;
    guardarPaso();
    const copia = document.createElement('canvas');
    copia.width = c.width; copia.height = c.height;
    copia.getContext('2d')!.drawImage(c, 0, 0);
    if (rotar90) { c.width = copia.height; c.height = copia.width; }
    const g = ctx();
    g.save();
    if (rotar90) { g.translate(c.width / 2, c.height / 2); g.rotate(Math.PI / 2); g.translate(-copia.width / 2, -copia.height / 2); }
    else { g.translate(voltearH ? c.width : 0, voltearV ? c.height : 0); g.scale(voltearH ? -1 : 1, voltearV ? -1 : 1); }
    g.drawImage(copia, 0, 0);
    g.restore();
  };

  const aplicarAjustes = () => {
    const c = canvasRef.current!;
    guardarPaso();
    const copia = document.createElement('canvas');
    copia.width = c.width; copia.height = c.height;
    copia.getContext('2d')!.drawImage(c, 0, 0);
    const g = ctx();
    g.save();
    g.filter = `brightness(${brillo}%) contrast(${contraste}%) saturate(${saturacion}%)${preset !== 'none' ? ` ${preset}` : ''}`;
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(copia, 0, 0);
    g.restore();
    setBrillo(100); setContraste(100); setSaturacion(100); setPreset('none');
  };

  const aplicarRecorte = () => {
    const c = canvasRef.current!;
    if (!recorte || recorte.w < 8 || recorte.h < 8) return;
    guardarPaso();
    // El rectángulo llega en píxeles del canvas MOSTRADO: escala a los reales.
    const factor = c.width / c.getBoundingClientRect().width;
    const rx = Math.max(0, recorte.x * factor);
    const ry = Math.max(0, recorte.y * factor);
    const rw = Math.min(c.width - rx, recorte.w * factor);
    const rh = Math.min(c.height - ry, recorte.h * factor);
    const datos = ctx().getImageData(rx, ry, rw, rh);
    c.width = rw; c.height = rh;
    ctx().putImageData(datos, 0, 0);
    setRecorte(null);
    setHerramienta('mover');
  };

  const ponerTexto = (x: number, y: number) => {
    if (!textoNuevo.trim()) return;
    const c = canvasRef.current!;
    guardarPaso();
    const factor = c.width / c.getBoundingClientRect().width;
    const g = ctx();
    g.font = `bold ${Math.round(tamanoTexto * factor)}px system-ui, sans-serif`;
    g.fillStyle = colorTexto;
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = Math.max(2, (tamanoTexto * factor) / 16);
    g.strokeText(textoNuevo, x * factor, y * factor);
    g.fillText(textoNuevo, x * factor, y * factor);
  };

  // ---- Ratón sobre el canvas ------------------------------------------------
  const posicion = (e: React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const alBajar = (e: React.MouseEvent) => {
    const p = posicion(e);
    if (herramienta === 'recortar') { arrastre.current = { x0: p.x, y0: p.y }; setRecorte({ x: p.x, y: p.y, w: 0, h: 0 }); }
    else if (herramienta === 'texto') ponerTexto(p.x, p.y);
    else if (herramienta === 'pincel') {
      guardarPaso();
      pintando.current = true;
      const c = canvasRef.current!;
      const factor = c.width / c.getBoundingClientRect().width;
      const g = ctx();
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.strokeStyle = colorPincel; g.lineWidth = grosorPincel * factor;
      g.beginPath(); g.moveTo(p.x * factor, p.y * factor);
    }
  };
  const alMover = (e: React.MouseEvent) => {
    const p = posicion(e);
    if (herramienta === 'recortar' && arrastre.current) {
      const { x0, y0 } = arrastre.current;
      setRecorte({ x: Math.min(x0, p.x), y: Math.min(y0, p.y), w: Math.abs(p.x - x0), h: Math.abs(p.y - y0) });
    } else if (herramienta === 'pincel' && pintando.current) {
      const c = canvasRef.current!;
      const factor = c.width / c.getBoundingClientRect().width;
      const g = ctx();
      g.lineTo(p.x * factor, p.y * factor); g.stroke();
    }
  };
  const alSoltar = () => { arrastre.current = null; pintando.current = false; };

  // ---- Guardar --------------------------------------------------------------
  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      // Los ajustes pendientes de los deslizadores viajan aplicados.
      if (brillo !== 100 || contraste !== 100 || saturacion !== 100 || preset !== 'none') aplicarAjustes();
      const blob: Blob = await new Promise((ok, ko) =>
        canvasRef.current!.toBlob(b => (b ? ok(b) : ko(new Error('No se ha podido generar la imagen.'))), 'image/png'));
      const sub = await subirArchivo(blob, 'image/png');
      if (sub.error) throw new Error(sub.error);
      onGuardar(sub.url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const filtroVivo = `brightness(${brillo}%) contrast(${contraste}%) saturate(${saturacion}%)${preset !== 'none' ? ` ${preset}` : ''}`;

  return (
    // stopPropagation: este editor puede vivir DENTRO de otro modal (el
    // creador de publicaciones) cuyo fondo se cierra al hacer clic — sin
    // esto, cualquier clic aquí cerraba el editor entero sin guardar.
    <div className="fixed inset-0 z-[60] bg-slate-900/80 flex flex-col" onMouseUp={alSoltar}
      onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
      {/* Barra superior */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white">
        <p className="text-sm font-black">Editor de imagen</p>
        <div className="flex items-center gap-1 ml-6">
          {([
            { h: 'mover' as Herramienta, icon: Wand2, label: 'Ajustes' },
            { h: 'recortar' as Herramienta, icon: Crop, label: 'Recortar' },
            { h: 'texto' as Herramienta, icon: Type, label: 'Texto' },
            { h: 'pincel' as Herramienta, icon: Pencil, label: 'Dibujar' },
          ]).map(t => (
            <button key={t.h} onClick={() => { setHerramienta(t.h); setRecorte(null); }}
              className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors',
                herramienta === t.h ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:bg-slate-800')}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
          <span className="w-px h-5 bg-slate-700 mx-1" />
          <button onClick={() => transformar(true)} title="Rotar 90°" className="p-1.5 text-slate-300 hover:bg-slate-800 rounded-lg"><RotateCw className="w-4 h-4" /></button>
          <button onClick={() => transformar(false, true, false)} title="Voltear horizontal" className="p-1.5 text-slate-300 hover:bg-slate-800 rounded-lg"><FlipHorizontal className="w-4 h-4" /></button>
          <button onClick={() => transformar(false, false, true)} title="Voltear vertical" className="p-1.5 text-slate-300 hover:bg-slate-800 rounded-lg"><FlipVertical className="w-4 h-4" /></button>
          <button onClick={deshacer} disabled={!pasos} title="Deshacer" className="p-1.5 text-slate-300 hover:bg-slate-800 rounded-lg disabled:opacity-30"><Undo2 className="w-4 h-4" /></button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={guardar} disabled={guardando || !listo}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 rounded-lg text-xs font-black transition-colors">
            {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Guardar
          </button>
          <button onClick={onCerrar} className="p-1.5 text-slate-400 hover:text-white rounded-lg"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Zona central */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-6 relative select-none">
        <div className="relative inline-block">
          <canvas
            ref={canvasRef}
            onMouseDown={alBajar}
            onMouseMove={alMover}
            style={{ filter: filtroVivo, maxWidth: '78vw', maxHeight: '74vh' }}
            className={cn('rounded-lg shadow-2xl bg-white',
              herramienta === 'recortar' && 'cursor-crosshair',
              herramienta === 'texto' && 'cursor-text',
              herramienta === 'pincel' && 'cursor-crosshair')}
          />
          {recorte && (
            <div className="absolute border-2 border-emerald-400 bg-emerald-400/10 pointer-events-none"
              style={{ left: recorte.x, top: recorte.y, width: recorte.w, height: recorte.h }} />
          )}
        </div>
        {!listo && !error && <p className="absolute text-sm text-slate-300">Cargando la imagen…</p>}
        {error && <p className="absolute text-sm text-rose-400">{error}</p>}
      </div>

      {/* Panel inferior contextual */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center gap-4 flex-wrap">
        {herramienta === 'mover' && (
          <>
            {[
              { icon: SunMedium, label: 'Luz', valor: brillo, set: setBrillo },
              { icon: Contrast, label: 'Contraste', valor: contraste, set: setContraste },
              { icon: Droplets, label: 'Color', valor: saturacion, set: setSaturacion },
            ].map(a => (
              <label key={a.label} className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-300">
                <a.icon className="w-3.5 h-3.5" /> {a.label}
                <input type="range" min={40} max={180} value={a.valor}
                  onChange={e => a.set(Number(e.target.value))} className="w-28 accent-emerald-500" />
              </label>
            ))}
            <div className="flex items-center gap-1.5">
              {PRESETS.map(p => (
                <button key={p.nombre} onClick={() => setPreset(p.filtro)}
                  className={cn('px-2 py-1 rounded-lg text-[10px] font-black transition-colors',
                    preset === p.filtro ? 'bg-emerald-500' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}>
                  {p.nombre}
                </button>
              ))}
            </div>
            {(brillo !== 100 || contraste !== 100 || saturacion !== 100 || preset !== 'none') && (
              <button onClick={aplicarAjustes} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-[11px] font-black">
                Aplicar ajustes
              </button>
            )}
          </>
        )}
        {herramienta === 'recortar' && (
          <>
            <p className="text-[11px] text-slate-400 font-bold">Arrastra sobre la imagen para marcar el recorte.</p>
            <button onClick={aplicarRecorte} disabled={!recorte || recorte.w < 8}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg text-[11px] font-black">
              Recortar
            </button>
          </>
        )}
        {herramienta === 'texto' && (
          <>
            <input value={textoNuevo} onChange={e => setTextoNuevo(e.target.value)}
              placeholder="Escribe el texto y pulsa sobre la imagen…"
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs w-72 focus:outline-none focus:border-emerald-500" />
            <label className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-300">
              Tamaño
              <input type="range" min={16} max={140} value={tamanoTexto} onChange={e => setTamanoTexto(Number(e.target.value))} className="w-24 accent-emerald-500" />
            </label>
            <input type="color" value={colorTexto} onChange={e => setColorTexto(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent" />
          </>
        )}
        {herramienta === 'pincel' && (
          <>
            <label className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-300">
              Grosor
              <input type="range" min={2} max={30} value={grosorPincel} onChange={e => setGrosorPincel(Number(e.target.value))} className="w-24 accent-emerald-500" />
            </label>
            <input type="color" value={colorPincel} onChange={e => setColorPincel(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent" />
            <p className="text-[11px] text-slate-400 font-bold">Dibuja directamente sobre la imagen.</p>
          </>
        )}
        {error && <p className="text-[11px] font-bold text-rose-400 ml-auto">{error}</p>}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';

// ============================================================================
// LA LISTA DE ATAJOS (2026-10-06, carril editorB, #30)
// ============================================================================
// Se abre con «?» (fuera de un texto) y con el botón del teclado de la barra
// de la página. Agrupada y con buscador: quien busca «sangrar» o «Tab» lo
// encuentra a la primera.
//
// FIEL A LO QUE HACE EL EDITOR. Cada fila de aquí está sacada de un manejador
// real de `Documento.tsx` (el nombre del manejador va al lado, en el
// comentario): una lista de ayuda que promete un atajo que no existe es peor
// que no tener lista. Si se añade un atajo al editor, se añade aquí; y si se
// quita, se quita. Lo que NO existe (⌘B, ⌘I…) no está, a propósito.

const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');
const MOD = MAC ? '⌘' : 'Ctrl';

type Atajo = { teclas: string[][]; que: string; claves?: string };
type Grupo = { titulo: string; atajos: Atajo[] };

export const GRUPOS_ATAJOS: Grupo[] = [
  {
    titulo: 'Escribir y moverse',
    atajos: [
      // alTeclear: «/» en un bloque vacío
      { teclas: [['/']], que: 'Abrir el menú de bloques (en una línea vacía)', claves: 'insertar añadir bloque titulo lista imagen' },
      // alTeclear: Enter
      { teclas: [['Intro']], que: 'Nuevo bloque (parte el texto por el cursor)', claves: 'enter salto parrafo' },
      // alTeclear: Enter en lista vacía
      { teclas: [['Intro']], que: 'En un ítem de lista vacío: salir de la lista (o un nivel de sangría)', claves: 'enter lista' },
      // Shift+Enter lo deja el navegador
      { teclas: [['⇧', 'Intro']], que: 'Salto de línea dentro del mismo bloque', claves: 'enter linea' },
      // alTeclear: Tab
      { teclas: [['Tab']], que: 'Sangrar el bloque (con todo lo que lleva dentro)', claves: 'anidar indentar hijo' },
      { teclas: [['⇧', 'Tab']], que: 'Quitar la sangría', claves: 'anidar desindentar sangrar' },
      // alTeclear: Backspace
      { teclas: [['Retroceso']], que: 'Al principio de un bloque: vuelve a texto, luego quita sangría, luego se junta con el de encima', claves: 'borrar backspace unir' },
      // alTeclear: ⌘A
      { teclas: [[MOD, 'A']], que: 'Seleccionar el texto de este bloque (no la página entera)', claves: 'todo' },
    ],
  },
  {
    titulo: 'Bloques',
    atajos: [
      // alTeclear: ⌘D
      { teclas: [[MOD, 'D']], que: 'Duplicar el bloque', claves: 'copiar clonar' },
      // clicSeleccion
      { teclas: [[MOD, 'clic']], que: 'Marcar o desmarcar un bloque (selección múltiple)', claves: 'seleccionar varios' },
      { teclas: [['⇧', 'clic']], que: 'Marcar un tramo de bloques', claves: 'seleccionar rango' },
      { teclas: [['Arrastrar ⋮⋮']], que: 'Mover un bloque; soltarlo a un lado lo pone en columnas', claves: 'mover columnas' },
    ],
  },
  {
    titulo: 'Deshacer',
    atajos: [
      // useEffect de ⌘Z
      { teclas: [[MOD, 'Z']], que: 'Deshacer (escribir una frase seguida es un solo paso)', claves: 'undo' },
      { teclas: [[MOD, '⇧', 'Z'], [MOD, 'Y']], que: 'Rehacer', claves: 'redo' },
    ],
  },
  {
    titulo: 'Markdown al principio de una línea',
    atajos: [
      // autoformato
      { teclas: [['#', 'Espacio']], que: 'Título 1', claves: 'encabezado h1' },
      { teclas: [['##', 'Espacio']], que: 'Título 2', claves: 'encabezado h2' },
      { teclas: [['###', 'Espacio']], que: 'Título 3', claves: 'encabezado h3' },
      { teclas: [['-', 'Espacio'], ['*', 'Espacio']], que: 'Lista con viñetas', claves: 'lista' },
      { teclas: [['1.', 'Espacio']], que: 'Lista numerada', claves: 'numerada' },
      { teclas: [['[]', 'Espacio']], que: 'Lista de tareas con casilla', claves: 'tarea check' },
      { teclas: [['>', 'Espacio']], que: 'Cita', claves: 'quote' },
      { teclas: [['```']], que: 'Bloque de código', claves: 'codigo' },
      { teclas: [['$$', 'Espacio']], que: 'Ecuación LaTeX', claves: 'formula latex katex matematicas' },
    ],
  },
  {
    titulo: 'Formato dentro del texto',
    atajos: [
      // marcadoVivo / TextoEnriquecido
      { teclas: [['**texto**']], que: 'Negrita', claves: 'bold' },
      { teclas: [['*texto*']], que: 'Cursiva', claves: 'italic' },
      { teclas: [['`texto`']], que: 'Código en línea', claves: 'code' },
      { teclas: [['[texto](dirección)']], que: 'Enlace con texto', claves: 'link url' },
      { teclas: [['$fórmula$']], que: 'Fórmula LaTeX en línea', claves: 'latex katex matematicas' },
    ],
  },
  {
    titulo: 'Menciones y enlaces',
    atajos: [
      // vigilarMencion / MencionesMenu
      { teclas: [['@']], que: 'Mencionar a una persona, una página o una fecha', claves: 'persona fecha hoy calendario aviso' },
      { teclas: [['[[']], que: 'Enlazar una página (o crear una nueva)', claves: 'pagina enlace wiki' },
      { teclas: [['↑'], ['↓']], que: 'Recorrer las opciones del selector («@», «[[», «/»)', claves: 'flechas menu' },
      { teclas: [['Intro'], ['Tab']], que: 'Elegir la opción marcada', claves: 'enter' },
      { teclas: [['Esc']], que: 'Cerrar el selector', claves: 'escape' },
      // alPegar
      { teclas: [[MOD, 'V']], que: 'Pegar un enlace: enlace, marcador o insertar (Figma, Maps, Spotify, YouTube…)', claves: 'pegar embed incrustar video' },
    ],
  },
  {
    titulo: 'La página',
    atajos: [
      // Documento: ⌘F propio
      { teclas: [[MOD, 'F']], que: 'Buscar en la página (Intro: siguiente · ⇧Intro: anterior · Esc: cerrar)', claves: 'buscar encontrar' },
      // Documento: «?»
      { teclas: [['?']], que: 'Abrir esta lista de atajos (fuera de un texto)', claves: 'ayuda' },
    ],
  },
];

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function AtajosAyuda({ onCerrar }: { onCerrar: () => void }) {
  const [q, setQ] = useState('');
  const entrada = useRef<HTMLInputElement>(null);
  useEffect(() => { entrada.current?.focus(); }, []);
  useEffect(() => {
    const t = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCerrar(); } };
    window.addEventListener('keydown', t, true);
    return () => window.removeEventListener('keydown', t, true);
  }, [onCerrar]);

  const grupos = useMemo(() => {
    const t = sinTildes(q.trim());
    if (!t) return GRUPOS_ATAJOS;
    return GRUPOS_ATAJOS
      .map(g => ({ ...g, atajos: g.atajos.filter(a => sinTildes(`${g.titulo} ${a.que} ${a.claves || ''} ${a.teclas.flat().join(' ')}`).includes(t)) }))
      .filter(g => g.atajos.length);
  }, [q]);

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-start sm:items-center justify-center bg-slate-900/30 p-3" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-label="Atajos de teclado" data-atajos onClick={e => e.stopPropagation()}
        className="w-full max-w-xl max-h-[88vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-slate-100">
          <label className="flex-1 flex items-center gap-2 h-10 px-3 rounded-xl bg-slate-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-400/60">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input ref={entrada} value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar un atajo…" aria-label="Buscar un atajo"
              className="flex-1 min-w-0 bg-transparent text-sm outline-none text-slate-800" />
          </label>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="w-11 h-11 grid place-items-center text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-5">
          {grupos.length === 0 && <p className="text-sm text-slate-400 text-center py-8">Ningún atajo se llama así.</p>}
          {grupos.map(g => (
            <section key={g.titulo}>
              <h2 className="text-[11px] font-black uppercase tracking-wide text-slate-400 mb-1.5">{g.titulo}</h2>
              <ul className="divide-y divide-slate-100">
                {g.atajos.map((a, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 py-2">
                    <span className="text-sm text-slate-700">{a.que}</span>
                    <span className="flex flex-wrap justify-end gap-x-1.5 gap-y-1 shrink-0 max-w-[48%]">
                      {a.teclas.map((combo, k) => (
                        <span key={k} className="inline-flex items-center gap-1">
                          {k > 0 && <span className="text-[11px] text-slate-300">o</span>}
                          {combo.map((t, j) => (
                            <kbd key={j} className="px-1.5 min-w-[1.5rem] h-6 inline-grid place-items-center rounded-md border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 font-sans whitespace-nowrap">{t}</kbd>
                          ))}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

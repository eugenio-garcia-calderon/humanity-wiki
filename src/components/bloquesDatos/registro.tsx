import { Component, Suspense, type ReactNode } from 'react';
import { lecturaPrecargada } from './precarga';
import { AlertTriangle, Construction } from 'lucide-react';
import { esBloqueDatos, TIPOS_BLOQUE_DATOS, type Bloque, type TipoBloqueDatos } from '../../utils/bloques';
import type { OpcionBloque } from '../knowledge/SelectorBloques';
import type { DefinicionBloque, PropsEditor } from './tipos';

// ============================================================================
// EL REGISTRO DE BLOQUES DE DATOS (2026-10-18, Wikiproducts, frente W0)
// ============================================================================
// Hasta hoy, un bloque nuevo había que enseñárselo a mano a dos ficheros
// enormes: `Documento.tsx` (el editor, 4.800 líneas) y `BloquesLectura.tsx`
// (la página publicada). Con cuatro frentes construyendo bloques a la vez, eso
// eran cuatro personas editando los mismos dos ficheros la misma tarde.
//
// Ahora cada bloque vive en SU carpeta y se apunta solo:
//
//   src/components/bloquesDatos/
//     registro.tsx              ← esto. Nadie lo toca para añadir un bloque
//     tipos.ts                  ← `definirBloque` y las props de los componentes
//     comparador/
//       definicion.tsx          ← `export default definirBloque({ … })`
//       Lectura.tsx             ← lo que ve quien lee (se carga al pintarlo)
//       Editor.tsx              ← opcional: lo que ve quien escribe
//
// `import.meta.glob` encuentra todas las `definicion.tsx` al compilar. El tipo
// tiene que estar declarado en `TIPOS_BLOQUE_DATOS` (`utils/bloques.ts`): ésa
// es la única lista, y ya trae los nueve del plan de Wikiproducts.
//
// ── UNA DEFINICIÓN NUNCA IMPORTA DE AQUÍ ────────────────────────────────────
// Importa de `./tipos`. Este fichero importa todas las definiciones al
// cargarse; si una importara de vuelta de aquí, leería `definirBloque` antes
// de que exista y la aplicación entera se quedaría en blanco (pasó al
// probarlo, 2026-10-18).
//
// ── LA DEFINICIÓN ES LIGERA ─────────────────────────────────────────────────
// Las definiciones se importan enteras con el editor y con cada página
// publicada. Sus componentes, NO: van con `lazy(() => import('./Lectura'))`,
// para que quien lee una página sin comparador no descargue el comparador.
//
// ── UN BLOQUE ROTO NO ROMPE LA PÁGINA ───────────────────────────────────────
// Cada bloque registrado se pinta dentro de su propio cortafuegos (`Aislado`):
// si falla, en su sitio sale una línea que lo dice y el resto de la página se
// sigue leyendo. Un bloque recién hecho es justo el que más puede fallar.

const modulos = import.meta.glob<{ default: DefinicionBloque }>('./*/definicion.tsx', { eager: true });

const REGISTRO = new Map<TipoBloqueDatos, DefinicionBloque>();
for (const [ruta, m] of Object.entries(modulos)) {
  const d = m?.default;
  // Un error de quien añade un bloque se dice en la consola y se salta: no
  // tumba el editor de todo el mundo.
  if (!d || !esBloqueDatos(d.tipo)) {
    console.error(`[bloquesDatos] ${ruta}: «${d?.tipo}» no está en TIPOS_BLOQUE_DATOS (utils/bloques.ts).`);
    continue;
  }
  if (REGISTRO.has(d.tipo)) {
    console.error(`[bloquesDatos] ${ruta}: el tipo «${d.tipo}» ya lo define otra carpeta.`);
    continue;
  }
  REGISTRO.set(d.tipo, d);
}

export const bloqueRegistrado = (tipo: unknown): DefinicionBloque | undefined =>
  esBloqueDatos(tipo) ? REGISTRO.get(tipo) : undefined;

/** Las entradas del menú, en el orden de `TIPOS_BLOQUE_DATOS`. */
export const OPCIONES_BLOQUES_DATOS: (OpcionBloque & { tipo: TipoBloqueDatos })[] = TIPOS_BLOQUE_DATOS
  .map(t => REGISTRO.get(t))
  .filter((d): d is DefinicionBloque => !!d && d.enMenu !== false)
  .map(d => ({ tipo: d.tipo, label: d.label, icon: d.icon, grupo: d.grupo || 'datos', desc: d.desc, color: d.color, claves: d.claves }));

/** Los `datos` con los que nace un bloque de este tipo. */
export const datosIniciales = (tipo: unknown) => bloqueRegistrado(tipo)?.datosIniciales?.();

class Aislado extends Component<{ tipo: string; children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false };
  static getDerivedStateFromError() { return { fallo: true }; }
  componentDidCatch(e: unknown) { console.error(`[bloquesDatos:${this.props.tipo}]`, e); }
  render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <p className="flex items-center gap-1.5 text-sm text-slate-400">
        <AlertTriangle className="h-3.5 w-3.5" /> Este bloque no se ha podido mostrar.
      </p>
    );
  }
}

const Cargando = () => <div className="h-16 animate-pulse rounded-xl bg-slate-50" />;

/** El bloque en la página publicada. Un tipo declarado sin construir no pinta
 *  nada: quien lee no tiene por qué saber qué falta por hacer. */
export function LecturaBloqueDatos({ bloque, paginaId }: { bloque: Bloque; paginaId?: string }) {
  const def = bloqueRegistrado(bloque.tipo);
  if (!def) return null;
  // Preloaded before the first paint (`precarga.ts`): painted directly, so
  // the block never shows its placeholder.
  const Lectura = lecturaPrecargada(def.tipo) || def.Lectura;
  return (
    <Aislado tipo={def.tipo}>
      <Suspense fallback={<Cargando />}>
        <Lectura bloque={bloque} datos={bloque.datos || {}} paginaId={paginaId} />
      </Suspense>
    </Aislado>
  );
}

/** El bloque en el editor. Aquí sí se dice si aún no existe: quien escribe
 *  tiene que saber por qué un bloque de su página no se ve. */
export function EditorBloqueDatos({ bloque, paginaId, editable, cambiarDatos }: {
  bloque: Bloque; paginaId?: string; editable: boolean; cambiarDatos: PropsEditor['cambiarDatos'];
}) {
  const def = bloqueRegistrado(bloque.tipo);
  if (!def) {
    return (
      <p className="flex items-center gap-1.5 rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-400">
        <Construction className="h-4 w-4" /> El bloque «{bloque.tipo}» todavía no está disponible. Se guarda tal cual y no se ve al publicar.
      </p>
    );
  }
  const Pintar = def.Editor;
  return (
    <Aislado tipo={def.tipo}>
      <Suspense fallback={<Cargando />}>
        {Pintar
          ? <Pintar bloque={bloque} datos={bloque.datos || {}} paginaId={paginaId} editable={editable} cambiarDatos={cambiarDatos} />
          : <def.Lectura bloque={bloque} datos={bloque.datos || {}} paginaId={paginaId} />}
      </Suspense>
    </Aislado>
  );
}

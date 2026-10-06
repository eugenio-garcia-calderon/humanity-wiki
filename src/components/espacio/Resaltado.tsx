import { Boxes, FileText, FolderKanban, UserRound } from 'lucide-react';
import { componenteDeTrazo } from '../ui/iconosDeTrazo';
import { t } from '../../i18n';

// El servidor marca lo hallado entre ⟦ y ⟧. Se parte el texto y se pintan
// <mark> como nodos de React: nunca se inyecta HTML, así que una página que
// contenga «<script>» se ve como texto y no hace nada.
export function Resaltado({ texto }: { texto: string }) {
  const partes = texto.split(/(⟦[^⟧]*⟧)/g);
  return <>{partes.map((p, i) => (p.startsWith('⟦') && p.endsWith('⟧')
    ? <mark key={i} className="rounded bg-amber-200/70 px-0.5 text-inherit">{p.slice(1, -1)}</mark>
    : <span key={i}>{p}</span>))}</>;
}

export type TipoResultado = 'pagina' | 'bd' | 'carpeta' | 'persona';
/** Función y no objeto: el texto depende del idioma de ahora. */
export const etiquetaTipo = (t_: TipoResultado) => t({ pagina: 'Página', bd: 'Base de datos', carpeta: 'Carpeta', persona: 'Persona' }[t_]);

export function IconoResultado({ tipo, icono }: { tipo: TipoResultado; icono: string | null }) {
  if (icono && [...icono].length <= 2 && !/^[\w-]+$/.test(icono)) return <span className="w-5 text-center text-[16px] leading-none shrink-0">{icono}</span>;
  const C = tipo === 'carpeta' ? (icono ? componenteDeTrazo(icono) : FolderKanban) : tipo === 'bd' ? Boxes : tipo === 'persona' ? UserRound : FileText;
  return <C className="h-5 w-5 shrink-0 text-slate-400" />;
}

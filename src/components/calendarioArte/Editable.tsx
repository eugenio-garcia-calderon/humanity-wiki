// Un texto que se edita en su sitio: igual que se imprime, solo que se puede
// escribir encima. Se guarda al salir del campo, no a cada tecla, para que el
// cursor no salte mientras alguien escribe en el móvil.
import { useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

interface Props {
  valor: string;
  editando: boolean;
  alCambiar: (v: string) => void;
  className?: string;
  /** Lo que se ve en modo edición cuando el texto está vacío. */
  vacio?: string;
  multilinea?: boolean;
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3';
  style?: React.CSSProperties;
}

export function Editable({ valor, editando, alCambiar, className, vacio = 'Escribe aquí…', multilinea = true, as = 'span', style }: Props) {
  const ref = useRef<HTMLElement>(null);
  const Tag = as as any;

  // Si el valor cambia desde fuera (otra persona guardó, se restauró el mes)
  // y no se está escribiendo en este campo, se refleja.
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerText !== valor) el.innerText = valor;
  }, [valor, editando]);

  if (!editando) {
    return <Tag className={cn('whitespace-pre-line', className)} style={style}>{valor}</Tag>;
  }
  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-vacio={vacio}
      style={style}
      className={cn(
        'whitespace-pre-line outline-none rounded-sm cursor-text ring-1 ring-sky-300/60 hover:ring-sky-400 focus:ring-2 focus:ring-sky-500 focus:bg-white/80',
        'empty:before:content-[attr(data-vacio)] empty:before:text-slate-400',
        className,
      )}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (!multilinea && e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur(); }
      }}
      onPaste={(e: React.ClipboardEvent) => {
        // Se pega como texto plano: un párrafo copiado de una web trae
        // fuentes y colores que luego salen en la impresión.
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const v = e.currentTarget.innerText.replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim();
        if (v !== valor) alCambiar(v);
      }}
    />
    // Sin hijos a propósito: el texto lo pone el efecto de arriba. Si React
    // también pintara `{valor}` dentro, al reconciliar chocaría con lo que la
    // persona ha escrito a mano en el campo.
  );
}

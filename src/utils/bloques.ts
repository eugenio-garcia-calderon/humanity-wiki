// ============================================================================
// Bloques de documento (2026-08-08) — el modelo de datos del editor estilo
// Notion. Compartido a propósito entre el cliente (render en directo mientras
// la IA escribe, editor) y el servidor (guardado final): un único parser para
// que lo que se ve generándose y lo que queda guardado no puedan divergir.
// ============================================================================
// El texto de cada bloque conserva el marcado inline de markdown (**negrita**,
// *cursiva*, `código`, [enlaces](url)) tal cual; quien pinta decide cómo
// renderizarlo. Un bloque por línea/elemento — las listas son un bloque por
// ítem, como en Notion, para que Enter cree el siguiente con naturalidad.

export type TipoBloque =
  | 'parrafo' | 'titulo1' | 'titulo2' | 'titulo3'
  | 'lista' | 'numerada' | 'tarea'
  | 'cita' | 'separador' | 'codigo' | 'imagen' | 'tabla'
  | 'publicacion' | 'medio'
  // 2026-08-20 (Eugenio: «en el creador de páginas añade la opción de agregar
  // un producto»). Es primo de `publicacion`: se reutilizan sus campos
  // (`entityId`, `pubTitulo`, `pubUrl`) porque es lo mismo —una cosa de la
  // plataforma embebida— y duplicar campos sería duplicar los fallos.
  | 'producto';

/** Qué es un bloque `medio`. La imagen tiene su propio tipo desde el principio
 *  (se escribe `![pie](url)` en markdown); esto es todo lo demás que se puede
 *  pegar y que hay que REPRODUCIR o LEER dentro del documento, no descargar. */
export type ClaseMedio = 'video' | 'youtube' | 'vimeo' | 'audio' | 'pdf' | 'archivo';

export interface Bloque {
  id: string;
  tipo: TipoBloque;
  /** Texto con marcado inline markdown (no aplica a separador/imagen/tabla). */
  texto?: string;
  /** Solo tarea. */
  hecho?: boolean;
  /** Solo codigo. */
  lenguaje?: string;
  /** Imagen y medio. */
  url?: string;
  pie?: string;
  /** Solo medio: qué es y, si es de una plataforma, su identificador. */
  medio?: ClaseMedio;
  medioId?: string;
  /** Solo medio: tamaño del archivo subido, para el pie. */
  medioBytes?: number;
  /** Solo tabla: la primera fila es la cabecera. */
  filas?: string[][];
  /** Solo publicacion (Fase 2): una publicación de la plataforma embebida.
   *  Se captura lo necesario al insertarla para pintar la tarjeta sin otra
   *  consulta; el contenido real de una ventana sí se carga en vivo. */
  pubTipo?: string;   // ventana | lienzo | mapa | proyecto | muro
  entityId?: string;
  pubKind?: string;   // el kind si es una ventana (tabla, imagen, …)
  pubTitulo?: string;
  pubAutor?: string;
  pubUrl?: string;    // /esquemas/:slug, /mapas/:slug, /proyectos/:slug…
}

/** Un tramo de texto con su formato resuelto — para las exportaciones (Word,
 *  PDF), que no pueden renderizar marcado markdown por sí mismas. */
export interface TramoInline {
  texto: string;
  negrita?: boolean;
  cursiva?: boolean;
  codigo?: boolean;
  enlace?: string;
}

export function tokenizarInline(texto: string): TramoInline[] {
  const out: TramoInline[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\(([^)]+)\))/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) out.push({ texto: texto.slice(ultimo, m.index) });
    const s = m[0];
    if (s.startsWith('**')) out.push({ texto: s.slice(2, -2), negrita: true });
    else if (s.startsWith('`')) out.push({ texto: s.slice(1, -1), codigo: true });
    else if (s.startsWith('*')) out.push({ texto: s.slice(1, -1), cursiva: true });
    else {
      const link = s.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) out.push({ texto: link[1], enlace: link[2] });
      else out.push({ texto: s });
    }
    ultimo = m.index + s.length;
  }
  if (ultimo < texto.length) out.push({ texto: texto.slice(ultimo) });
  return out.length ? out : [{ texto: '' }];
}

export const nuevoIdBloque = () =>
  `B${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`;

const filaTabla = (linea: string): string[] | null => {
  const t = linea.trim();
  if (!t.startsWith('|') || !t.endsWith('|')) return null;
  return t.slice(1, -1).split('|').map(c => c.trim());
};
const esSeparadorTabla = (linea: string) => /^\|?\s*:?-{2,}/.test(linea.trim()) && /-/.test(linea);

/** Markdown → bloques. Tolerante: lo que no reconoce, es un párrafo. */
export function markdownABloques(md: string): Bloque[] {
  const bloques: Bloque[] = [];
  const lineas = md.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < lineas.length) {
    const linea = lineas[i];
    const t = linea.trim();

    if (!t) { i++; continue; }

    // Bloque de código con vallas ```
    const valla = t.match(/^```(\w*)\s*$/);
    if (valla) {
      const cuerpo: string[] = [];
      i++;
      while (i < lineas.length && !lineas[i].trim().startsWith('```')) { cuerpo.push(lineas[i]); i++; }
      i++; // cierra la valla
      bloques.push({ id: nuevoIdBloque(), tipo: 'codigo', texto: cuerpo.join('\n'), lenguaje: valla[1] || undefined });
      continue;
    }

    // Tabla GFM: fila | separador | filas…
    if (filaTabla(t) && i + 1 < lineas.length && esSeparadorTabla(lineas[i + 1])) {
      const filas: string[][] = [filaTabla(t)!];
      i += 2;
      while (i < lineas.length) {
        const f = filaTabla(lineas[i]);
        if (!f) break;
        filas.push(f); i++;
      }
      bloques.push({ id: nuevoIdBloque(), tipo: 'tabla', filas });
      continue;
    }

    const titulo = t.match(/^(#{1,3})\s+(.*)$/);
    if (titulo) {
      bloques.push({ id: nuevoIdBloque(), tipo: `titulo${titulo[1].length}` as TipoBloque, texto: titulo[2] });
      i++; continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { bloques.push({ id: nuevoIdBloque(), tipo: 'separador' }); i++; continue; }

    const tarea = t.match(/^[-*]\s+\[( |x|X)\]\s+(.*)$/);
    if (tarea) {
      bloques.push({ id: nuevoIdBloque(), tipo: 'tarea', texto: tarea[2], hecho: tarea[1].toLowerCase() === 'x' });
      i++; continue;
    }

    const vinyeta = t.match(/^[-*]\s+(.*)$/);
    if (vinyeta) { bloques.push({ id: nuevoIdBloque(), tipo: 'lista', texto: vinyeta[1] }); i++; continue; }

    const numerada = t.match(/^\d+[.)]\s+(.*)$/);
    if (numerada) { bloques.push({ id: nuevoIdBloque(), tipo: 'numerada', texto: numerada[1] }); i++; continue; }

    const cita = t.match(/^>\s?(.*)$/);
    if (cita) {
      // Citas de varias líneas seguidas → un solo bloque.
      const partes = [cita[1]];
      i++;
      while (i < lineas.length) {
        const c = lineas[i].trim().match(/^>\s?(.*)$/);
        if (!c) break;
        partes.push(c[1]); i++;
      }
      bloques.push({ id: nuevoIdBloque(), tipo: 'cita', texto: partes.join('\n') });
      continue;
    }

    const imagen = t.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imagen) {
      bloques.push({ id: nuevoIdBloque(), tipo: 'imagen', url: imagen[2], pie: imagen[1] || undefined });
      i++; continue;
    }

    // Párrafo: líneas seguidas hasta una en blanco o un arranque especial.
    const partes = [t];
    i++;
    while (i < lineas.length) {
      const s = lineas[i].trim();
      if (!s || /^(#{1,3}\s|[-*]\s|\d+[.)]\s|>|```|\||!\[|-{3,}$)/.test(s)) break;
      partes.push(s); i++;
    }
    bloques.push({ id: nuevoIdBloque(), tipo: 'parrafo', texto: partes.join(' ') });
  }
  return bloques;
}

/** Bloques → markdown (descarga y viaje de vuelta). */
export function bloquesAMarkdown(bloques: Bloque[]): string {
  const salida: string[] = [];
  for (const b of bloques) {
    switch (b.tipo) {
      case 'titulo1': salida.push(`# ${b.texto || ''}`); break;
      case 'titulo2': salida.push(`## ${b.texto || ''}`); break;
      case 'titulo3': salida.push(`### ${b.texto || ''}`); break;
      case 'lista': salida.push(`- ${b.texto || ''}`); break;
      case 'numerada': salida.push(`1. ${b.texto || ''}`); break;
      case 'tarea': salida.push(`- [${b.hecho ? 'x' : ' '}] ${b.texto || ''}`); break;
      case 'cita': salida.push((b.texto || '').split('\n').map(l => `> ${l}`).join('\n')); break;
      case 'separador': salida.push('---'); break;
      case 'codigo': salida.push('```' + (b.lenguaje || '') + '\n' + (b.texto || '') + '\n```'); break;
      case 'imagen': salida.push(`![${b.pie || ''}](${b.url || ''})`); break;
      // Markdown no sabe de vídeo ni de PDF: un enlace es lo más fiel que se
      // puede exportar. El tipo real no se pierde — los bloques se guardan como
      // JSON, y el markdown solo es la descarga.
      case 'medio': salida.push(`[${b.pie || 'Archivo'}](${b.url || ''})`); break;
      case 'publicacion': salida.push(`[${b.pubTitulo || 'Publicación'}](${b.pubUrl || ''})`); break;
      case 'producto': salida.push(`[${b.pubTitulo || 'Producto'}](${b.pubUrl || ''})`); break;
      case 'tabla': {
        const filas = b.filas || [];
        if (!filas.length) break;
        salida.push(`| ${filas[0].join(' | ')} |`);
        salida.push(`| ${filas[0].map(() => '---').join(' | ')} |`);
        for (const f of filas.slice(1)) salida.push(`| ${f.join(' | ')} |`);
        break;
      }
      default: salida.push(b.texto || '');
    }
    salida.push('');
  }
  return salida.join('\n').trim() + '\n';
}

/** El título del documento: el primer título 1, o la primera línea con algo. */
export function tituloDeBloques(bloques: Bloque[], porDefecto = 'Documento sin título'): string {
  const h1 = bloques.find(b => b.tipo === 'titulo1' && b.texto?.trim());
  if (h1) return h1.texto!.trim().slice(0, 120);
  const primero = bloques.find(b => b.texto?.trim());
  return primero ? primero.texto!.trim().slice(0, 120) : porDefecto;
}

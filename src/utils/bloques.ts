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
  // `basedatos` SUSTITUYE a `tabla` para lo nuevo. `tabla` se queda porque hay
  // páginas que la usan: convertir texto plano a columnas tipadas obliga a
  // adivinar el tipo de cada columna, y adivinar mal destruiría datos de
  // alguien. Las viejas siguen viéndose; las nuevas nacen ya como base de datos.
  | 'basedatos'
  | 'publicacion' | 'medio'
  // 2026-08-20 (Eugenio: «en el creador de páginas añade la opción de agregar
  // un producto»). Es primo de `publicacion`: se reutilizan sus campos
  // (`entityId`, `pubTitulo`, `pubUrl`) porque es lo mismo —una cosa de la
  // plataforma embebida— y duplicar campos sería duplicar los fallos.
  | 'producto'
  // 2026-08-22, bloques de tienda (fase 9 de tiendas, fase 2 de Comercio).
  // Se pintan desde entonces, pero hasta hoy sólo se podían crear escribiendo
  // el JSON a mano: no estaban en el menú ni en este tipo. Un bloque que sólo
  // sabe poner quien conoce la base de datos no existe para quien usa la
  // aplicación.
  | 'portada' | 'rejilla' | 'columnas' | 'franja'
  // 2026-08-23. Los tres que más se usan en Notion y que aquí no existían.
  // Salieron de comparar herramienta contra herramienta, no de suponerlo:
  //
  //   `desplegable` un título que esconde lo de dentro. Es lo que permite que
  //                 una página larga se lea: sin él, todo está siempre abierto
  //                 y hay que leerlo entero para saber si te interesa.
  //   `aviso`       el recuadro con icono. Lo que se quiere destacar sin
  //                 gritar en mayúsculas ni poner tres signos de admiración.
  //   `indice`      la lista de títulos de la propia página. No guarda nada:
  //                 se calcula al pintar, así que nunca se queda vieja.
  | 'desplegable' | 'aviso' | 'indice'
  // 2026-09-30. Una página dentro de la página, como en Notion: el bloque es
  // el enlace y la página vive aparte (`entityId`), con su propio contenido.
  | 'subpagina'
  // 2026-10-01. Una pizarra estilo Miro (la de «Esquemas»), incrustada o como
  // enlace. `entityId` es la pizarra; `vista` dice cuál de las dos formas.
  | 'pizarra'
  // 2026-10-02 (Eugenio: «al pegar un enlace, escoger si se embebe la web, si
  // se hace una tarjeta con imagen, título y descripción, o si se pega normal,
  // como Notion»). `marcador` es la tarjeta; `web`, la página dentro de la
  // página. Los dos guardan `url`; el marcador, además, lo que se leyó de ella.
  | 'marcador' | 'web'
  // 2026-10-05 (carril editorA, «al nivel de Notion»). `migas` es la ruta de
  // páginas madre (no guarda nada: se pregunta al pintar). `boton` hace algo
  // al pulsarlo (ver `AccionBoton`); su plantilla son sus `bloques` hijos.
  | 'migas' | 'boton';

/** Lo que hace un bloque `boton` (2026-10-05, como los botones de Notion). */
export interface AccionBoton {
  /** `plantilla` copia sus bloques hijos debajo; `pagina` crea una página
   *  dentro de ésta (con la plantilla como contenido); `fila` añade una fila
   *  a una base de datos de la página; `enlace` abre una dirección. */
  tipo: 'plantilla' | 'pagina' | 'fila' | 'enlace';
  url?: string;
  tabla_id?: string;
  /** Título de la página o la fila nueva; admite «{fecha}». */
  titulo?: string;
  estilo?: 'oscuro' | 'claro';
}

/** Qué es un bloque `medio`. La imagen tiene su propio tipo desde el principio
 *  (se escribe `![pie](url)` en markdown); esto es todo lo demás que se puede
 *  pegar y que hay que REPRODUCIR o LEER dentro del documento, no descargar. */
export type TamanoGaleria = 'pequeno' | 'mediano' | 'grande' | 'muy-grande';

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
  /** Marcador (2026-10-02): lo que se leyó de la web al pegarla. Se guarda
   *  y no se vuelve a pedir en cada visita: la página publicada no debe
   *  depender de que otra web conteste. */
  enlaceTitulo?: string;
  enlaceDescripcion?: string;
  enlaceImagen?: string;
  enlaceSitio?: string;
  enlaceIcono?: string;
  /** Web insertada: su alto en píxeles. */
  alto?: number;
  /** Solo medio: qué es y, si es de una plataforma, su identificador. */
  medio?: ClaseMedio;
  medioId?: string;
  /** Solo medio: tamaño del archivo subido, para el pie. */
  medioBytes?: number;
  /** ══ CÓMO SE ENSEÑA UN ARCHIVO (2026-08-22) ═════════════════════════════
   *  Eugenio: «que dé la opción, una vez insertado, con 3 puntitos, de abrirlo,
   *  cerrarlo o embeberlo; si es una imagen por defecto la embebes, si es un
   *  pdf por defecto le haces una tarjetita con el nombre».
   *
   *  `embebido` = se ve dentro del documento (una imagen, un vídeo, el PDF
   *  entero). `tarjeta` = una línea con su nombre y, si es un PDF, la primera
   *  página en pequeño.
   *
   *  SIN VALOR TAMBIÉN ES UNA RESPUESTA: significa «lo que le toque a su
   *  tipo», que es lo que ya hacían los documentos escritos hasta hoy. Poner
   *  un valor por defecto al leer habría reescrito en silencio la forma de
   *  todos los adjuntos que ya existen. */
  vista?: 'tarjeta' | 'embebido';
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
  // ── LOS BLOQUES NUEVOS (2026-08-23) ──────────────────────────────────────
  /** `aviso`: cuál de los cuatro colores. Cerrado a propósito — un color libre
   *  acaba en texto ilegible sobre su propio fondo. */
  tono?: 'info' | 'ojo' | 'idea' | 'hecho';
  /** `desplegable`: si al llegar se ve abierto. Lo decide quien escribe, no
   *  quien lee: guardar la preferencia de cada lector obligaría a saber quién
   *  es, y quien abre una página pública no tiene por qué serlo. */
  abierto?: boolean;
  /** `basedatos`: la tabla a la que apunta. */
  tabla_id?: string;
  /** `basedatos`: con qué vista se abre (2026-09-30). Sin valor, galería —
   *  la de por defecto, como pidió Eugenio—; `tabla` si quien escribe la
   *  cambió. Se guarda en el bloque y no en la tabla: la misma tabla puede
   *  verse como galería en una página y como rejilla en otra. */
  vistaBd?: 'galeria' | 'tabla';
  /** `basedatos` en galería: el tamaño de las tarjetas (2026-10-01, como
   *  Notion). Sin valor, mediano. */
  tamanoGaleria?: TamanoGaleria;
  /** El tamaño del título de la base de datos (2026-10-02). */
  tamanoTitulo?: TamanoGaleria;
  /** El título de la base de datos no se enseña al publicar (2026-10-02). */
  tituloOculto?: boolean;
  /** `basedatos` en galería: qué columnas se ven en las tarjetas (ids, en
   *  orden). Sin valor, las tres primeras. */
  propsGaleria?: string[];
  /** Color de texto (`rojo`) o de fondo (`fondo-rojo`). Ver `coloresBloque.ts`. */
  color?: string;
  /** ══ BLOQUES EN COLUMNAS (2026-09-30) ══════════════════════════════════
   *  Eugenio: «que se pueda arrastrar y poner un bloque al lado de otro, como
   *  en Notion». Los bloques seguidos con el mismo `grupo` se pintan uno al
   *  lado del otro. La lista sigue siendo PLANA a propósito: todo lo que ya
   *  sabe tratar bloques (guardar, exportar a Word, la IA, los comentarios)
   *  sigue funcionando sin saber de columnas; quien no las entiende las lee
   *  una debajo de otra, que es lo que se ve en un teléfono. */
  grupo?: string;
  /** ══ BLOQUES DENTRO DE BLOQUES (2026-10-05) ═══════════════════════════
   *  Eugenio quiere el editor «al nivel de Notion»: Tab sangra, ⇧Tab quita la
   *  sangría, y un desplegable guarda dentro lo que se quiera. Lo guardado es
   *  un ÁRBOL —cada bloque lleva a sus hijos en `bloques`—, que es lo que ya
   *  sabía leer la página pública (`BloquesLectura`).
   *
   *  El editor, en cambio, trabaja con la lista PLANA de siempre y un número
   *  de sangría (`nivel`): mover, partir con Enter, pegar, las columnas… todo
   *  lo que ya funcionaba sobre una lista sigue funcionando, y los hijos de un
   *  bloque son sencillamente los que van detrás con más sangría. `aArbol` y
   *  `aplanar` traducen de una forma a la otra al guardar y al abrir. `nivel`
   *  NUNCA se guarda: dos formas de decir lo mismo acabarían diciendo cosas
   *  distintas. */
  bloques?: Bloque[];
  nivel?: number;
  /** Un título que pliega lo que lleva dentro (2026-10-05, como los
   *  «toggle headings» de Notion). Sólo en `titulo1`–`titulo3`; lo de dentro
   *  son sus `bloques`, igual que en un desplegable. */
  plegable?: boolean;
  /** `boton`: qué hace al pulsarlo. Su texto es `texto`. */
  boton?: AccionBoton;
}

// ── EL ÁRBOL Y LA LISTA PLANA (2026-10-05) ───────────────────────────────
// Ver el comentario de `bloques` en la interfaz. Las cuatro funciones son
// puras y no saben de React: las usan el editor, la lectura y el servidor.

/** Los bloques que se pueden abrir y cerrar con su flecha. */
export const esPlegable = (b: Pick<Bloque, 'tipo' | 'plegable'>) =>
  b.tipo === 'desplegable' || (!!b.plegable && /^titulo[123]$/.test(b.tipo));

/** Los que llevan bloques DENTRO que en el editor se abren y se cierran: los
 *  plegables y el botón (cuyos hijos son su plantilla). */
export const esContenedor = (b: Pick<Bloque, 'tipo' | 'plegable'>) => esPlegable(b) || b.tipo === 'boton';

/** Árbol → lista plana con `nivel`. Lo que se abre en el editor. */
export function aplanar(arbol: Bloque[] | undefined, nivel = 0, out: Bloque[] = []): Bloque[] {
  for (const b of Array.isArray(arbol) ? arbol : []) {
    if (!b || typeof b !== 'object') continue;
    const { bloques: hijos, ...resto } = b;
    out.push({ ...resto, nivel: nivel || undefined });
    if (Array.isArray(hijos) && hijos.length) aplanar(hijos, nivel + 1, out);
  }
  return out;
}

/** Que ningún bloque tenga más de un nivel de sangría que el de encima: un
 *  hueco (de 0 a 2) no tiene madre que lo contenga. Devuelve la misma lista
 *  si no había nada que arreglar, para no provocar repintados de balde. */
export function normalizarNiveles<T extends { nivel?: number }>(plano: T[]): T[] {
  let previo = -1;
  let cambio = false;
  const out = plano.map(b => {
    const n = Math.max(0, Math.min(b.nivel || 0, previo + 1));
    previo = n;
    if (n === (b.nivel || 0)) return b;
    cambio = true;
    return { ...b, nivel: n || undefined };
  });
  return cambio ? out : plano;
}

/** Lista plana → árbol. Lo que se guarda. */
export function aArbol(plano: Bloque[]): Bloque[] {
  const raiz: Bloque[] = [];
  // pila[n] = la lista donde van los bloques de nivel n.
  const pila: Bloque[][] = [raiz];
  for (const b of normalizarNiveles(plano)) {
    const n = b.nivel || 0;
    const { nivel: _n, bloques: _h, ...resto } = b;
    const limpio: Bloque = resto;
    pila.length = n + 1;
    pila[n].push(limpio);
    pila[n + 1] = (limpio.bloques = []);
  }
  // Sin listas vacías en lo guardado: `bloques: []` no dice nada.
  const podar = (bs: Bloque[]) => { for (const b of bs) { if (b.bloques?.length) podar(b.bloques); else delete b.bloques; } };
  podar(raiz);
  return raiz;
}

/** El índice del último descendiente de `plano[i]` (o `i` si no tiene). */
export function finSubarbol(plano: { nivel?: number }[], i: number): number {
  const n = plano[i]?.nivel || 0;
  let j = i;
  while (j + 1 < plano.length && (plano[j + 1].nivel || 0) > n) j++;
  return j;
}

/** Todos los bloques del árbol, a cualquier profundidad, en orden de lectura.
 *  Para quien sólo quiere MIRAR (buscar texto, exportar, la primera imagen). */
export function todosLosBloques(arbol: any[] | undefined): any[] {
  const out: any[] = [];
  const ir = (bs: any) => { for (const b of Array.isArray(bs) ? bs : []) { if (!b || typeof b !== 'object') continue; out.push(b); ir(b.bloques); } };
  ir(arbol);
  return out;
}

/** Quita del árbol el primer bloque que cumpla `si`, esté donde esté.
 *  Devuelve el árbol nuevo y lo quitado (con sus hijos). */
export function quitarDelArbol(arbol: any[] | undefined, si: (b: any) => boolean): { arbol: any[]; quitado: any | null } {
  let quitado: any = null;
  const ir = (bs: any[]): any[] => {
    const out: any[] = [];
    for (const b of bs) {
      if (!quitado && b && si(b)) { quitado = b; continue; }
      out.push(b && Array.isArray(b.bloques) && !quitado ? { ...b, bloques: ir(b.bloques) } : b);
    }
    return out;
  };
  const nuevo = ir(Array.isArray(arbol) ? arbol : []);
  return { arbol: quitado ? nuevo : (arbol || []), quitado };
}

/** Parte la lista en filas: un bloque suelto, o varios seguidos con el mismo
 *  `grupo`. Compartido por el editor y la lectura para que no se separen. */
export function enFilas<T extends { grupo?: string }>(bloques: T[]): T[][] {
  const out: T[][] = [];
  for (const b of bloques) {
    const ultima = out[out.length - 1];
    if (b.grupo && ultima && ultima[0].grupo === b.grupo) ultima.push(b);
    else out.push([b]);
  }
  return out;
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
  // Las listas con sangría («  - hijo») salen anidadas: se apunta el nivel de
  // cada ítem y al final se convierte en árbol (`aArbol`). Dos espacios o un
  // tabulador por nivel, que es lo que escriben casi todos los editores.
  const sangria = (linea: string) => {
    const m = linea.match(/^[ \t]*/)?.[0] || '';
    const n = Math.floor(m.replace(/\t/g, '  ').length / 2);
    return n || undefined;
  };
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
      bloques.push({ id: nuevoIdBloque(), tipo: 'tarea', texto: tarea[2], hecho: tarea[1].toLowerCase() === 'x', nivel: sangria(linea) });
      i++; continue;
    }

    const vinyeta = t.match(/^[-*]\s+(.*)$/);
    if (vinyeta) { bloques.push({ id: nuevoIdBloque(), tipo: 'lista', texto: vinyeta[1], nivel: sangria(linea) }); i++; continue; }

    const numerada = t.match(/^\d+[.)]\s+(.*)$/);
    if (numerada) { bloques.push({ id: nuevoIdBloque(), tipo: 'numerada', texto: numerada[1], nivel: sangria(linea) }); i++; continue; }

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
  return bloques.some(b => b.nivel) ? aArbol(bloques) : bloques;
}

/** Bloques → markdown (descarga y viaje de vuelta). */
export function bloquesAMarkdown(bloques: Bloque[]): string {
  const salida: string[] = [];
  // Los hijos se escriben debajo con dos espacios por nivel: es como markdown
  // anida las listas, y para el resto es lo más fiel que cabe en texto.
  const plano = bloques.some(b => b.bloques?.length) ? aplanar(bloques) : bloques;
  for (const b of plano) {
    const antes = salida.length;
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
      case 'marcador': salida.push(`[${b.enlaceTitulo || b.url || ''}](${b.url || ''})`); break;
      case 'web': salida.push(b.url || ''); break;
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
    if (b.nivel) {
      const pre = '  '.repeat(b.nivel);
      for (let k = antes; k < salida.length; k++) salida[k] = salida[k].split('\n').map(l => pre + l).join('\n');
    }
    // Los ítems de una misma lista van seguidos: con una línea en blanco entre
    // medias, markdown los leería como listas sueltas.
    const sig = plano[plano.indexOf(b) + 1];
    const enLista = (x?: Bloque) => !!x && (x.tipo === 'lista' || x.tipo === 'numerada' || x.tipo === 'tarea');
    if (!(enLista(b) && enLista(sig))) salida.push('');
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

/**
 * EL AIRE ALREDEDOR DE UNA BASE DE DATOS (2026-10-02, Eugenio: «que el hueco
 * entre bases de datos sea mayor, para que a nivel estético quede bien»).
 * Los bloques van separados 8–10 px, que para dos párrafos está bien y para
 * dos galerías seguidas las pega. Una sola clase para el editor y la página
 * publicada: si se separan, lo que se ve al escribir deja de ser lo que sale.
 */
export const AIRE_BASE_DATOS = 'py-5 sm:py-8';

import { useEffect, useMemo, useRef, useState , Fragment, type ReactNode} from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, User as UserIcon, Eye, Sparkles, Network, LayoutGrid,
  MoreVertical, Pencil, Globe, Lock, Trash2, Trash, RotateCcw, CircleDot,
  Folder, FolderPlus, FolderOpen, Download, Bookmark, X, Check, Loader2,
  ArrowLeft, Users2, Globe2, Plus, Flag, Ban,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEsMovil } from '../hooks/useEsMovil';
import WindowContent from '../components/knowledge/WindowContent';
import FichaPublicacion, { type Publicacion } from '../components/knowledge/FichaPublicacion';
import CreadorPublicacion from '../components/knowledge/CreadorPublicacion';
import { cn } from '../utils/cn';
import { PersonalizarPortada } from '../components/portada/PersonalizarPortada';
import { Denunciar } from '../components/moderacion/Denunciar';
import { Bloquear } from '../components/moderacion/Bloquear';
import {
  leerPortada, PORTADA_POR_DEFECTO, type IdBloque, type Portada,
} from '../components/portada/portadaBloques';
import { OBJETIVOS, hablaDe } from '../utils/objetivos';
import { portadaDe, ImagenDePortada, EtiquetasDeTema, AvatarAutor, textoDe } from '../components/portada/PortadaTarjeta';
import CirculosDePersonas from '../components/social/CirculosDePersonas';
import TuTrabajo from '../components/social/TuTrabajo';

// ============================================================================
// PUBLICACIONES — Explorar + Mis publicaciones fusionadas (2026-08-08)
// ============================================================================
// «Fusión de la página de Mis Publicaciones y Explorar, con un filtro muy
// visual grande y centrado arriba que permita elegir entre publicaciones de
// la Humanidad o publicaciones propias.»
//
// Una sola página, un solo componente. El interruptor grande de arriba decide
// de quién son las publicaciones que se ven; el menú lateral de carpetas
// (solo con sesión) decide cómo las tiene ordenadas quien mira, sea de quien
// sea cada cosa — las carpetas son marcadores personales, no propiedad.
//
// /explorar y /mis-publicaciones siguen existiendo como atajos: cada una
// simplemente abre esta página con el interruptor en una posición distinta.

const TIPOS: { label: string; kinds: string[] | null }[] = [
  { label: 'Todo', kinds: null },
  // Los cuatro grandes primero: son lo que la gente construye.
  { label: 'Mapas', kinds: ['mapa'] },
  { label: 'Lienzos', kinds: ['grafo'] },
  { label: 'Presentaciones', kinds: ['presentacion'] },
  { label: 'Proyectos', kinds: ['proyecto'] },
  { label: 'Bases de datos', kinds: ['tabla', 'ficha'] },
  { label: 'Imágenes', kinds: ['imagen'] },
  { label: 'Vídeos', kinds: ['video'] },
  { label: 'Notas', kinds: ['texto'] },
  { label: 'Documentos', kinds: ['documento', 'pagina'] },
  { label: 'Datos', kinds: ['grafica'] },
  { label: 'Enlaces', kinds: ['enlace', 'wikipedia'] },
  { label: 'Del muro', kinds: ['publicacion'] },
];

const COLORES_CARPETA = ['#0d9488', '#7c3aed', '#d97706', '#db2777', '#0284c7', '#16a34a', '#b91c1c', '#475569'];
const colorDe = (id: string) => COLORES_CARPETA[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORES_CARPETA.length];

interface Carpeta { id: string; nombre: string; color: string | null; piezas: number; }

// -- Descargar: cada tipo ofrece los formatos que de verdad tienen sentido --
function descargarBlob(nombre: string, contenido: string, mime: string) {
  const blob = new Blob([contenido], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
const slugArchivo = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60) || 'publicacion';

const textoLargo = (pub: Publicacion): string => {
  const c: any = pub.config || {};
  return c.body || c.description || c.goal || c.caption || '';
};

function formatosDescarga(pub: Publicacion): { id: string; label: string; accion: () => void }[] {
  const base = slugArchivo(pub.titulo);
  const salida: { id: string; label: string; accion: () => void }[] = [];
  const c: any = pub.config || {};

  if (pub.kind === 'tabla') {
    salida.push({
      id: 'csv', label: 'Tabla (.csv)', accion: () => {
        const cols: any[] = c.cols || [];
        const rows: any[] = c.rows || [];
        const linea = (vals: string[]) => vals.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
        const csv = [linea(cols.map(x => x.name)), ...rows.map(r => linea(cols.map(x => r[x.id])))].join('\n');
        descargarBlob(`${base}.csv`, csv, 'text/csv;charset=utf-8');
      },
    });
  }
  const archivo = c.image_url || (pub.kind === 'enlace' || pub.kind === 'documento' ? c.url : null);
  if (archivo) {
    salida.push({
      id: 'archivo', label: 'Archivo original', accion: () => {
        const a = document.createElement('a');
        a.href = archivo; a.download = ''; a.target = '_blank'; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
      },
    });
  }
  salida.push({
    id: 'md', label: 'Texto (.md)', accion: () => {
      const texto = textoLargo(pub);
      const md = `# ${pub.titulo}\n\n${pub.autor_nombre ? `*de ${pub.autor_nombre}*\n\n` : ''}${texto || '_(sin contenido de texto)_'}\n`;
      descargarBlob(`${base}.md`, md, 'text/markdown;charset=utf-8');
    },
  });
  salida.push({
    id: 'json', label: 'Datos (.json)', accion: () => {
      descargarBlob(`${base}.json`, JSON.stringify({
        titulo: pub.titulo, tipo: pub.tipo, kind: pub.kind, autor: pub.autor_nombre, fecha: pub.fecha, config: pub.config,
      }, null, 2), 'application/json');
    },
  });
  return salida;
}

export default function Explorar() {
  const { user, updateUiSettings } = useAuth();
  const esMovil = useEsMovil();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // -- El interruptor grande: de quién son las publicaciones que se ven --
  // Vive en la query string de esta MISMA ruta (`/mis-publicaciones` ahora
  // solo redirige aquí con `?mias=1`) para que cambiar de modo no desmonte
  // el componente ni pierda la carpeta que se estaba explorando (2026-08-08).
  const modo: 'humanidad' | 'mias' = searchParams.get('mias') === '1' ? 'mias' : 'humanidad';
  const cambiarModo = (m: 'humanidad' | 'mias') => {
    setSearchParams(m === 'mias' ? { mias: '1' } : {}, { replace: true });
  };

  const [items, setItems] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  // El buscador arranca con lo que traiga la dirección (`?q=`): es lo que
  // permite que un enlace de fuera —el buscador del chat— deje esta lista ya
  // filtrada por lo que se buscó.
  const [busqueda, setBusqueda] = useState(() => searchParams.get('q') || '');
  const [tipo, setTipo] = useState<string>('Todo');
  /** El objetivo elegido en la tira de arriba, o null para «Todos». */
  /*
   * EL TEMA VIENE DE LA DIRECCIÓN (2026-08-24). Eugenio: «la funcionalidad del
   * menú izquierdo es que el contenido que se muestra en pantalla esté
   * relacionado con la temática… por ejemplo de "Energía" te muestra todo lo
   * relacionado con energía en un grid».
   *
   * El filtro por objetivo ya existía aquí —son las pastillas de arriba— pero
   * vivía sólo en la memoria de esta pantalla, así que **nadie de fuera podía
   * pedirlo**. Bastaba con leerlo de `?objetivo=` para que el menú de Explorar,
   * un enlace compartido o el buscador puedan dejar esta rejilla ya filtrada.
   *
   * Y se sincroniza en los dos sentidos: pulsar una pastilla cambia la
   * dirección, así que lo que estás viendo se puede copiar y mandar. Un filtro
   * que no cabe en una URL es un filtro que no se puede enseñar a nadie.
   */
  const objetivo = searchParams.get('objetivo');
  const setObjetivo = (id: string | null) => {
    const q = new URLSearchParams(searchParams);
    if (id) q.set('objetivo', id); else q.delete('objetivo');
    setSearchParams(q, { replace: true });
  };
  const [abierta, setAbierta] = useState<{ pub: Publicacion; editar: boolean } | null>(null);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  /*
   * LA PAPELERA Y EL PERSONALIZADOR SE ABREN POR DIRECCIÓN (2026-08-24). Sus
   * botones se fueron con la barra de arriba y ahora los abre el menú de la
   * derecha, que está fuera de esta página: por eso el estado arranca leyendo
   * `?papelera=1` y `?portada=1`. Se limpian del enlace en cuanto se abren, así
   * que cerrar la papelera no te deja con una dirección que la vuelve a abrir
   * al recargar.
   */
  const [verPapelera, setVerPapelera] = useState(() => new URLSearchParams(window.location.search).get('papelera') === '1');
  const [creadorAbierto, setCreadorAbierto] = useState(false);
  const [papelera, setPapelera] = useState<any[]>([]);
  const debounce = useRef<any>(null);

  /*
   * TU PORTADA. Se lee de `user.uiSettings.portada`, que ya existe y viaja con
   * la cuenta a cualquier dispositivo. Quien no ha entrado ve la plantilla
   * completa: sin cuenta no hay dónde guardarlo, y guardarlo solo en este
   * navegador sería prometer algo que se pierde al cambiar de móvil.
   */
  const portada: Portada = user ? leerPortada(user.uiSettings?.portada) : PORTADA_POR_DEFECTO;
  const [personalizando, setPersonalizando] = useState(() => new URLSearchParams(window.location.search).get('portada') === '1');

  /*
   * Y VUELVEN A ABRIRSE SI YA ESTABAS AQUÍ. El valor inicial de arriba sólo
   * sirve la primera vez: pulsando «Papelera» en el menú de la derecha estando
   * ya en `/explorar`, React Router cambia el enlace pero no vuelve a montar
   * esta página, así que sin este efecto el botón no haría nada la segunda vez.
   * Se borra el parámetro al abrirlo para que recargar no lo reabra.
   */
  useEffect(() => {
    const papelera = searchParams.get('papelera') === '1';
    const portada = searchParams.get('portada') === '1';
    if (!papelera && !portada) return;
    if (papelera) setVerPapelera(true);
    if (portada) setPersonalizando(true);
    const q = new URLSearchParams(searchParams);
    q.delete('papelera'); q.delete('portada');
    setSearchParams(q, { replace: true });
  }, [searchParams]);
  const [denunciando, setDenunciando] = useState<{ tipo: string; id: string; titulo?: string; autor_id?: string; autor_nombre?: string } | null>(null);
  const [bloqueando, setBloqueando] = useState<{ id: string; nombre?: string } | null>(null);

  // -- Carpetas --
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [carpetaActiva, setCarpetaActiva] = useState<Carpeta | null>(null);
  const [nuevaCarpeta, setNuevaCarpeta] = useState('');
  const [creandoCarpeta, setCreandoCarpeta] = useState(false);
  const [organizando, setOrganizando] = useState(false);
  const [avisoIA, setAvisoIA] = useState<string | null>(null);
  const [sobreCarpeta, setSobreCarpeta] = useState<string | null>(null);
  const [guardarEnAbierto, setGuardarEnAbierto] = useState<string | null>(null);
  const [carpetasDeItem, setCarpetasDeItem] = useState<Record<string, string[]>>({});
  const [descargarAbierto, setDescargarAbierto] = useState<string | null>(null);

  const cargarCarpetas = () =>
    fetch('/api/carpetas', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setCarpetas(Array.isArray(j) ? j : []))
      .catch(() => setCarpetas([]));

  useEffect(() => { if (user) cargarCarpetas(); }, [user]);

  const cargar = () => {
    if (carpetaActiva) {
      return fetch(`/api/carpetas/${carpetaActiva.id}/publicaciones`, { credentials: 'include' })
        .then(r => r.json())
        .then(j => setItems(Array.isArray(j) ? j : []))
        .catch(() => setItems([]))
        .finally(() => setCargando(false));
    }
    const p = new URLSearchParams();
    if (modo === 'mias' && user) p.set('autor', user.id);
    if (busqueda.trim()) p.set('q', busqueda.trim());
    return fetch(`/api/publicaciones?${p}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => setItems(Array.isArray(j) ? j : []))
      .catch(() => setItems([]))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    if (modo === 'mias' && !user) { setCargando(false); return; }
    setCargando(true);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(cargar, carpetaActiva ? 0 : 280);
    return () => clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, user, busqueda, carpetaActiva]);

  const cargarPapelera = () =>
    fetch('/api/papelera', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setPapelera(Array.isArray(j) ? j : []))
      .catch(() => setPapelera([]));

  useEffect(() => { if (modo === 'mias' && user) cargarPapelera(); }, [modo, user]);

  // ══ ABRIR UNA PUBLICACIÓN DESDE FUERA ═════════════════════════════════════
  // (2026-08-22) El buscador del chat devuelve publicaciones y hay que poder
  // pinchar en una. No hay ruta propia por publicación —se abren en una ficha
  // encima de esta lista—, así que la dirección es esta misma con `?abrir=`.
  //
  // SI NO ESTÁ, SE DICE. Puede haberse archivado, o no entrar en el filtro de
  // ahora; entonces sale un aviso en vez de dejar la lista quieta, que desde
  // fuera se ve igual que un enlace roto.
  const [noEncontrada, setNoEncontrada] = useState(false);
  const pedida = searchParams.get('abrir');
  useEffect(() => {
    if (!pedida || cargando) return;
    const p = items.find(i => i.id === pedida);
    if (p) {
      setAbierta({ pub: p, editar: false });
      setNoEncontrada(false);
      // Se quita de la dirección: si se quedara, cerrar la ficha y recargar
      // la volvería a abrir sola.
      const q = new URLSearchParams(searchParams); q.delete('abrir');
      setSearchParams(q, { replace: true });
    } else {
      setNoEncontrada(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedida, cargando, items]);

  // Cerrar cualquier menú/popover flotante al pulsar fuera.
  useEffect(() => {
    if (!menuAbierto && !guardarEnAbierto && !descargarAbierto) return;
    const fuera = () => { setMenuAbierto(null); setGuardarEnAbierto(null); setDescargarAbierto(null); };
    window.addEventListener('click', fuera);
    return () => window.removeEventListener('click', fuera);
  }, [menuAbierto, guardarEnAbierto, descargarAbierto]);

  const visibles = useMemo(() => {
    const kinds = TIPOS.find(t => t.label === tipo)?.kinds;
    let lista = kinds ? items.filter(i => kinds.includes(i.kind)) : items;
    // Dentro de una carpeta el buscador no ha ido al servidor (esa llamada
    // trae el contenido de la carpeta entera): se filtra aquí por título.
    if (carpetaActiva && busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      lista = lista.filter(i => i.titulo.toLowerCase().includes(q));
    }
    // POR OBJETIVO. Se filtra AQUÍ y no en el servidor porque no hay nada que
    // preguntarle: una publicación no tiene vínculo con ningún objetivo, así
    // que esto es buscar sus palabras en lo que ya está cargado. Ver
    // `src/utils/objetivos.ts` para por qué se dice «habla de» y no
    // «pertenece a».
    if (objetivo) {
      const o = OBJETIVOS.find(x => x.id === objetivo);
      if (o) lista = lista.filter(i => hablaDe(`${i.titulo} ${(i as any).resumen || ''} ${(i as any).descripcion || ''}`, o));
    }
    /*
     * CON UN TEMA ELEGIDO, MANDA LA POPULARIDAD (2026-08-24).
     *
     * Eugenio: «que cuando hagas click en uno de esos temas te abra
     * publicaciones y contenido ordenado de mayor a menor visualizaciones y
     * likes relacionado con ese tema».
     *
     * Y sólo entonces. Sin tema elegido esta lista es «lo último», que es lo
     * que quieres al entrar: enterarte de lo que ha pasado. Con un tema
     * elegido la pregunta cambia a «¿qué hay de bueno sobre energía?», y ahí lo
     * nuevo importa menos que lo que le ha servido a alguien.
     *
     * Un apoyo pesa 3 y una vista 1. No es una fórmula fina, es una decisión:
     * dar «me gusta» cuesta un gesto y ver algo no cuesta nada, así que
     * contarlos igual dejaría que un enlace muy visitado y que no le gustó a
     * nadie ganara a algo que ayudó a diez personas. El número está aquí, en
     * una línea, para que se pueda discutir.
     */
    /*
     * ARRIBA LO QUE TIENE PORTADA, Y EL VÍDEO ANTES QUE LA FOTO (2026-08-24).
     *
     * Eugenio: «pon publicaciones que sean más relevantes y muestra arriba solo
     * las que tengan alguna imagen o vídeo de portada, las que tengan vídeo
     * dales prioridad».
     *
     * No es una preferencia estética: una rejilla donde la mitad de las
     * tarjetas son un rectángulo de texto y la otra mitad una foto se lee mal
     * en cualquier orden. Juntando primero las que tienen imagen, la parte de
     * arriba es una rejilla de verdad y la de abajo una lista de títulos, y
     * cada una se lee como lo que es.
     *
     * Y DENTRO DE CADA GRUPO, LA POPULARIDAD. Un apoyo pesa 3 y una vista 1:
     * dar «me gusta» cuesta un gesto y ver algo no cuesta nada. El número está
     * en una línea para que se pueda discutir.
     *
     * `sort` es estable en JavaScript desde hace años, así que dentro del mismo
     * rango se conserva el orden que traía —lo más nuevo primero—, que es el
     * desempate correcto cuando dos cosas gustan lo mismo.
     */
    const peso = (i: any) => (Number(i.apoyos) || 0) * 3 + (Number(i.vistas) || 0);
    const rango = (i: any) => {
      const p = portadaDe(i);
      return p?.clase === 'video' ? 0 : p ? 1 : 2;
    };
    lista = [...lista].sort((a, b) => rango(a) - rango(b) || peso(b) - peso(a));
    return lista;
  }, [items, tipo, carpetaActiva, busqueda, objetivo]);

  const accion = async (url: string, opciones: RequestInit) => {
    const r = await fetch(url, { credentials: 'include', ...opciones });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error || 'No se ha podido hacer.');
      return false;
    }
    await cargar();
    if (modo === 'mias') cargarPapelera();
    return true;
  };

  const cambiarVisibilidad = (pub: Publicacion) =>
    accion(`/api/publicaciones/${pub.tipo}/${pub.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publico: !pub.publico }),
    });

  const eliminar = (pub: Publicacion) => {
    if (!confirm(`«${pub.titulo}» irá a la papelera y se borrará del todo en 15 días. ¿Seguir?`)) return;
    return accion(`/api/publicaciones/${pub.tipo}/${pub.id}`, { method: 'DELETE' });
  };

  const restaurar = async (fila: any) => {
    await fetch(`/api/publicaciones/${fila.tipo}/${fila.id}/restaurar`, { method: 'POST', credentials: 'include' });
    await cargarPapelera();
    cargar();
  };

  // -- Carpetas: crear, arrastrar, guardar en, quitar --
  const crearCarpeta = async () => {
    const nombre = nuevaCarpeta.trim();
    if (!nombre) return;
    const r = await fetch('/api/carpetas', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
    });
    const j = await r.json();
    if (!r.ok) { alert(j.error || 'No se ha podido crear la carpeta.'); return; }
    setNuevaCarpeta(''); setCreandoCarpeta(false);
    cargarCarpetas();
  };

  const borrarCarpeta = async (c: Carpeta) => {
    if (!confirm(`¿Borrar la carpeta «${c.nombre}»? Lo que hay dentro no se borra, solo deja de estar ahí.`)) return;
    await fetch(`/api/carpetas/${c.id}`, { method: 'DELETE', credentials: 'include' });
    if (carpetaActiva?.id === c.id) setCarpetaActiva(null);
    cargarCarpetas();
  };

  const carpetasDe = async (pub: Publicacion) => {
    const clave = `${pub.tipo}-${pub.id}`;
    if (carpetasDeItem[clave]) return carpetasDeItem[clave];
    const r = await fetch(`/api/publicaciones/${pub.tipo}/${pub.id}/carpetas`, { credentials: 'include' });
    const j = await r.json().catch(() => []);
    const ids = (Array.isArray(j) ? j : []).map((c: any) => c.id);
    setCarpetasDeItem(prev => ({ ...prev, [clave]: ids }));
    return ids;
  };

  const guardarEnCarpetas = async (pub: Publicacion, ids: string[]) => {
    const clave = `${pub.tipo}-${pub.id}`;
    setCarpetasDeItem(prev => ({ ...prev, [clave]: ids }));
    await fetch(`/api/publicaciones/${pub.tipo}/${pub.id}/carpetas`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carpeta_ids: ids }),
    });
    cargarCarpetas();
    if (carpetaActiva) cargar();
  };

  const alternarCarpeta = async (pub: Publicacion, carpetaId: string) => {
    const actuales = await carpetasDe(pub);
    const nuevas = actuales.includes(carpetaId) ? actuales.filter(x => x !== carpetaId) : [...actuales, carpetaId];
    await guardarEnCarpetas(pub, nuevas);
  };

  const soltarEnCarpeta = async (carpetaId: string, e: React.DragEvent) => {
    e.preventDefault();
    setSobreCarpeta(null);
    let ref: { tipo: string; id: string } | null = null;
    try { ref = JSON.parse(e.dataTransfer.getData('application/json')); } catch { /* no era una tarjeta */ }
    if (!ref) return;
    const pub = items.find(i => i.tipo === ref!.tipo && i.id === ref!.id);
    if (!pub) return;
    const actuales = await carpetasDe(pub);
    if (actuales.includes(carpetaId)) return;
    await guardarEnCarpetas(pub, [...actuales, carpetaId]);
  };

  const ordenarConIA = async () => {
    setOrganizando(true);
    setAvisoIA(null);
    const r = await fetch('/api/carpetas/auto-organizar', { method: 'POST', credentials: 'include' });
    const j = await r.json();
    setOrganizando(false);
    if (!r.ok) { setAvisoIA(j.error || 'No se ha podido organizar.'); return; }
    const resumen = (j.carpetas || []).map((c: any) => `${c.nombre} (${c.piezas})`).join(', ');
    setAvisoIA(resumen ? `Hecho: ${resumen}.` : 'No ha encontrado ningún tema claro todavía.');
    cargarCarpetas();
    if (carpetaActiva) cargar();
    setTimeout(() => setAvisoIA(null), 8000);
  };

  if (modo === 'mias' && !user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <UserIcon className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h1 className="text-xl font-black text-slate-900">Mis publicaciones</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Entra y aquí tendrás todo lo que publicas —tus mapas, tus lienzos, tus proyectos,
            tus documentos— para editarlo, decidir quién lo ve y ordenarlo en tus carpetas.
          </p>
          <Link to="/login" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors">
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">

      {/* LA COLUMNA DE CARPETAS SE FUE (2026-08-22, Eugenio: «elimina las
          carpetas en el lateral izquierdo… y así el inicio es pantalla
          completa»). Eran 224 px fijos delante del contenido en TODAS las
          pantallas, para un filtro que casi nadie usa a diario.

          Las carpetas NO desaparecen: la tira horizontal que ya existía para
          el móvil pasa a ser un bloque más de la portada, apagado por defecto
          y encendible desde «Tu portada». Quitar el sitio donde vivía una
          función no es lo mismo que quitar la función. */}

      {/* ------------------------------------------------------------------ */}
      {/* Contenido principal                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 overflow-y-auto min-w-0">


        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 pt-5 pb-24">

          {/* ══ LA BARRA DE ARRIBA SE HA IDO (2026-08-24) ═══════════════════
              Eugenio: «elimina también la parte de arriba de esa página donde se
              ven los proyectos, y donde sale el botón de crear, y debajo todo
              limpio, sólo con las publicaciones».

              Llevaba «Crear», «Tu portada», «Papelera» y el contador. Las cuatro
              siguen existiendo, en un sitio donde no le quitan la primera
              pantalla a lo que has venido a leer:
                · Crear      → el círculo verde de abajo, que está en TODAS las
                               páginas y lleva las dieciséis herramientas.
                · Papelera   → el menú de la derecha (`/explorar?papelera=1`).
                · Tu portada → el menú de la derecha (`/explorar?portada=1`).
                · el contador → no estaba contando nada que hiciera falta.

              QUEDAN LAS DOS QUE NO SON ADORNO: «Solo mías» y la carpeta abierta.
              Las dos aparecen sólo porque tú has entrado en ese estado, y son la
              única forma de salir de él. Un filtro puesto sin manera visible de
              quitarlo es una aplicación rota, no una aplicación limpia. */}
          {(modo === 'mias' || carpetaActiva) && (
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {modo === 'mias' && (
                <button
                  onClick={() => cambiarModo('humanidad')}
                  title="Ver todo lo que hay publicado"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-black shrink-0"
                >
                  <Users2 className="w-3.5 h-3.5" /> Solo mías
                  <X className="w-3 h-3 opacity-70" />
                </button>
              )}

              {carpetaActiva && (
                <button onClick={() => setCarpetaActiva(null)}
                  className="inline-flex items-center gap-1.5 shrink-0 pl-1.5 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-slate-300 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: carpetaActiva.color || colorDe(carpetaActiva.id) }} />
                  {carpetaActiva.nombre}
                </button>
              )}
            </div>
          )}

          {/* LA PAPELERA SÍ SE ANUNCIA CUANDO ESTÁS DENTRO: es una lista de cosas
              borradas y confundirla con la portada sería grave. */}
          {verPapelera && !carpetaActiva && (
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setVerPapelera(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-black shrink-0">
                <Trash className="w-3.5 h-3.5" /> Papelera · {papelera.length}
                <X className="w-3 h-3 opacity-70" />
              </button>
            </div>
          )}

          {verPapelera && !carpetaActiva ? (
            <div className="mt-5">
              <p className="text-xs text-slate-500 mb-4">
                Lo que has eliminado se guarda 15 días. Después se borra de verdad y no hay vuelta atrás.
              </p>
              {!papelera.length ? (
                <div className="text-center py-24">
                  <Trash className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">La papelera está vacía.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {papelera.map(f => (
                    <div key={`${f.tipo}-${f.id}`} className="bg-white border border-slate-200 rounded-2xl p-4">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">{f.kind}</p>
                          <p className="text-[13px] font-black text-slate-900 leading-snug line-clamp-2 mt-0.5">{f.titulo}</p>
                        </div>
                        <button onClick={() => restaurar(f)} title="Restaurar"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-50 transition-colors shrink-0">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                      <p className={cn('text-[11px] font-bold mt-2 inline-flex items-center gap-1',
                        f.dias_restantes <= 3 ? 'text-rose-600' : 'text-slate-400')}>
                        <CircleDot className="w-3 h-3" />
                        {f.dias_restantes > 0 ? `Quedan ${f.dias_restantes} ${f.dias_restantes === 1 ? 'día' : 'días'}` : 'Se borra hoy'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Buscador y tipos: se quedan también dentro de una carpeta —
                  el tipo filtra su contenido igual que el de fuera, y el
                  buscador filtra por título lo que ya se ha cargado. Una sola
                  fila compacta y pegajosa; los tipos se desplazan en horizontal
                  en vez de envolver en varias líneas (2026-08-08). */}
              {/* LAS PERSONAS, ANTES QUE NADA (2026-08-21). Van encima de los
                  objetivos porque la portada es de gente: primero a quién
            <>
              {/* CADA TROZO DE LA PORTADA, SUELTO, PARA PODER ORDENARLOS
                  (2026-08-22, Eugenio: «que puedas escoger los elementos que se
                  muestran y el orden de los mismos»).

                  Antes esto era una lista fija de JSX y el orden era el orden en
                  que estaba escrito. Ahora cada bloque es una entrada de este
                  objeto y lo que manda es `portada.bloques`. El contenido de
                  cada uno no ha cambiado ni una línea: solo ha dejado de estar
                  clavado. */}
              {(() => {
                const trozos: Record<IdBloque, ReactNode> = {
                  /* LAS PERSONAS (2026-08-21): a quién sigues y qué han
                     publicado. */
                  carpetas: user ? (
                    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100">
                    <div className="relative">
                    <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button
                    onClick={() => setCarpetaActiva(null)}
                    className={cn('shrink-0 h-11 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-colors',
                    !carpetaActiva ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600')}
                    >
                    <LayoutGrid className="w-3.5 h-3.5 shrink-0" /> Todas
                    </button>

                    {carpetas.map(c => (
                    <button
                    key={c.id}
                    onClick={() => setCarpetaActiva(c)}
                    className={cn('shrink-0 h-11 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-colors max-w-[11rem]',
                    carpetaActiva?.id === c.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600')}
                    >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color || colorDe(c.id) }} />
                    <span className="truncate">{c.nombre}</span>
                    <span className={cn('text-[10px] font-black shrink-0', carpetaActiva?.id === c.id ? 'text-white/60' : 'text-slate-400')}>{c.piezas}</span>
                    </button>
                    ))}

                    <button
                    onClick={() => setCreandoCarpeta(v => !v)}
                    title="Nueva carpeta" aria-label="Nueva carpeta"
                    className="shrink-0 w-11 h-11 grid place-items-center rounded-xl bg-slate-100 text-slate-500 active:bg-slate-200 transition-colors"
                    >
                    <FolderPlus className="w-4 h-4" />
                    </button>
                    <button
                    onClick={ordenarConIA} disabled={organizando}
                    title="Ordenar con IA" aria-label="Ordenar con IA"
                    className="shrink-0 w-11 h-11 grid place-items-center rounded-xl bg-indigo-50 disabled:opacity-60 text-indigo-700 transition-colors"
                    >
                    {organizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    </button>
                    </div>
                    {/* El degradado que dice «sigue habiendo cosas». No captura
                    toques: el dedo tiene que poder deslizar a través de él. */}
                    <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
                    </div>

                    {creandoCarpeta && (
                    <form onSubmit={e => { e.preventDefault(); crearCarpeta(); }} className="px-3 pb-2 flex gap-1.5">
                    <input
                    autoFocus value={nuevaCarpeta} onChange={e => setNuevaCarpeta(e.target.value)}
                    placeholder="p. ej. Salud" onBlur={() => !nuevaCarpeta && setCreandoCarpeta(false)}
                    /* `text-base` = 16 px, y no es una decisión estética: Safari
                    de iOS hace zoom sobre la página entera al enfocar un
                    campo con letra por debajo de 16 px, y luego te deja la
                    página descolocada. La versión de escritorio se queda en
                    `text-xs` porque allí eso no pasa. */
                    className="flex-1 min-w-0 h-11 px-3 border border-slate-200 rounded-xl text-base focus:outline-none focus:border-emerald-300 bg-white"
                    />
                    <button type="submit" className="w-11 h-11 grid place-items-center bg-slate-900 text-white rounded-xl shrink-0"><Check className="w-4 h-4" /></button>
                    </form>
                    )}
                    {avisoIA && <p className="px-3 pb-2 text-[11px] text-slate-500 leading-relaxed">{avisoIA}</p>}
                    </div>
                  ) : null,

                  contenido: (
                    <>

                      {cargando ? (
                      <p className="text-sm text-slate-400 text-center py-24">Buscando…</p>
                      ) : !visibles.length ? (
                      <div className="text-center py-24">
                      <LayoutGrid className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">
                      {objetivo
                      ? `Ninguna publicación habla de ${(OBJETIVOS.find(o => o.id === objetivo)?.titulo || '').toLowerCase()} todavía.`
                      : carpetaActiva ? 'Esta carpeta está vacía. Arrastra una tarjeta hasta ella, o usa «Guardar en».'
                      : busqueda ? `Nada sobre «${busqueda}».`
                      : modo === 'mias' ? 'Todavía no has publicado nada.' : 'Aún no hay publicaciones.'}
                      </p>
                      </div>
                      ) : (
                      // DOS POR FILA, Y UNA EN EL MÓVIL (2026-08-24). Eugenio:
                      // «haz que se muestren 2 publicaciones por línea, así se
                      // puede ver más grande, y 1 publicación por línea en móvil».
                      //
                      // El corte es `md` (768 px) y no `sm` (640): entre 640 y 768
                      // están las tabletas de pie y los móviles apaisados, y ahí
                      // dos columnas dejan cada portada en 300 px de ancho, que es
                      // justo lo que se acaba de decidir que era pequeño.
                      //
                      // (Aquí va un comentario de `//` y no uno de JSX: esto es la
                      //  rama de un `? :`, o sea una expresión, y unas llaves en
                      //  este sitio empiezan un objeto, no un comentario.)
                      <div className="grid gap-4 mt-4 md:grid-cols-2">
                      {visibles.map(it => {
                      const clave = `${it.tipo}-${it.id}`;
                      return (
                      <div
                      key={clave}
                      draggable={!!user}
                      onDragStart={e => e.dataTransfer.setData('application/json', JSON.stringify({ tipo: it.tipo, id: it.id }))}
                      onClick={() => it.kind === 'pagina' ? navigate(`/paginas/${it.id}`)
                      : it.kind === 'presentacion' ? navigate(`/presentaciones/${it.id}`)
                      : setAbierta({ pub: it, editar: false })}
                      /* SIN MARCO Y SIN FONDO (2026-08-24). Eugenio: «quita el
                         borde externo que envuelve a la publicación, hazlo
                         transparente, que no se vea».

                         Lo que separa una publicación de la siguiente ya no es
                         una raya: es el hueco entre ellas y la portada, que
                         tiene su propio recorte. La caja blanca sólo repetía ese
                         límite una segunda vez, y con tres tarjetas por fila la
                         página era una rejilla de marcos antes que una lista de
                         cosas.

                         Se va también `overflow-hidden`, que era del marco: con
                         él, el vídeo que crece al pasar el ratón se recortaba
                         justo en el borde de la tarjeta, o sea que no podía
                         salirse — que es lo que se le pidió. Y con la sombra:
                         una sombra sin caja es una mancha. Queda el empujón de
                         medio píxel al pasar por encima, que es lo único que
                         hacía falta para saber cuál estás señalando. */
                      className="relative text-left rounded-2xl hover:-translate-y-0.5 transition-all flex flex-col cursor-pointer"
                      >
                      {/* ARRIBA VA QUIÉN LO PUBLICA (2026-08-24). Eugenio: «haz
                          que el nombre de usuario y su foto de perfil estén arriba
                          y se vea mejor, como en Twitter», y «elimina la etiqueta
                          que describe si es un vídeo, una foto o un grafo».

                          Las dos cosas son la misma decisión: en ese renglón sólo
                          cabe un dato, y el que importa es de quién es esto. Que
                          sea un vídeo ya lo dice la portada —con su triángulo—, y
                          que sea un grafo lo dice el dibujo; el rótulo repetía en
                          letras lo que la imagen ya había dicho. De quién es no lo
                          decía nadie hasta el pie, en gris de 10 px.

                          La foto es de 26 px y con inicial de respaldo: sin foto
                          guardada, un círculo vacío es peor que una letra. */}
                      <div className="px-3.5 pt-3 flex items-center gap-1.5">
                      <AvatarAutor url={it.autor_avatar} nombre={it.autor_nombre} />
                      <span className="truncate text-[12px] font-black text-slate-800">{it.autor_nombre || 'Anónimo'}</span>
                      {it.ia && <Sparkles className="w-2.5 h-2.5 shrink-0 text-amber-500" />}
                      {!it.publico && (
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                      <Lock className="w-2 h-2" />Privada
                      </span>
                      )}
                      {it.estado === 'terminado' && (
                      <span className="text-[8px] font-black uppercase tracking-wider text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">Terminada</span>
                      )}
                      {it.personal && (
                      <span className="text-[8px] font-black uppercase tracking-wider text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">Tuyo</span>
                      )}

                      <div className="ml-auto relative">
                      <button
                      onClick={e => {
                      e.stopPropagation();
                      setMenuAbierto(menuAbierto === clave ? null : clave);
                      setGuardarEnAbierto(null); setDescargarAbierto(null);
                      if (user) carpetasDe(it);
                      }}
                      className="p-1 -mr-1 text-slate-300 hover:text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
                      title="Opciones"
                      >
                      <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {menuAbierto === clave && (
                      <div onClick={e => e.stopPropagation()}
                      className="absolute right-0 top-6 z-30 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1">
                      {it.puedo_editar && (
                      <button onClick={() => { setMenuAbierto(null); setAbierta({ pub: it, editar: true }); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
                      <Pencil className="w-3.5 h-3.5 text-slate-400" /> Editar
                      </button>
                      )}
                      {user && (
                      <button onClick={() => { setGuardarEnAbierto(clave); setMenuAbierto(null); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
                      <Bookmark className="w-3.5 h-3.5 text-slate-400" /> Guardar en…
                      </button>
                      )}
                      {carpetaActiva && (
                      <button
                      onClick={async () => {
                      setMenuAbierto(null);
                      const actuales = await carpetasDe(it);
                      await guardarEnCarpetas(it, actuales.filter(x => x !== carpetaActiva.id));
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
                      <FolderOpen className="w-3.5 h-3.5 text-slate-400" /> Quitar de esta carpeta
                      </button>
                      )}
                      <button onClick={() => { setDescargarAbierto(clave); setMenuAbierto(null); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
                      <Download className="w-3.5 h-3.5 text-slate-400" /> Descargar
                      </button>
                      {/* DENUNCIAR: solo sobre lo de otros. Denunciarte a ti
                          mismo no es una acción, es una confusión — y quien
                          quiera quitar lo suyo tiene «Eliminar» ahí debajo. */}
                      {user && !it.soy_autor && (
                      <>
                      <div className="h-px bg-slate-100 my-1" />
                      <button onClick={() => { setMenuAbierto(null); setDenunciando({ tipo: it.tipo, id: it.id, titulo: it.titulo, autor_id: it.autor_id, autor_nombre: it.autor_nombre }); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 inline-flex items-center gap-2">
                      <Flag className="w-3.5 h-3.5 text-slate-400" /> Denunciar
                      </button>
                      {/* BLOQUEAR va junto a denunciar y NO en su lugar: una
                          es sobre esta publicación y la revisa alguien; la
                          otra es sobre la persona y surte efecto ya. Quien
                          está siendo molestado necesita la segunda. */}
                      {it.autor_id && (
                      <button onClick={() => { setMenuAbierto(null); setBloqueando({ id: it.autor_id!, nombre: it.autor_nombre }); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 inline-flex items-center gap-2">
                      <Ban className="w-3.5 h-3.5 text-slate-400" /> Bloquear a {it.autor_nombre || 'esta persona'}
                      </button>
                      )}
                      </>
                      )}
                      {it.soy_autor && (
                      <>
                      <div className="h-px bg-slate-100 my-1" />
                      <button onClick={() => { setMenuAbierto(null); cambiarVisibilidad(it); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
                      {it.publico ? <><Lock className="w-3.5 h-3.5 text-slate-400" /> Hacer privada</> : <><Globe className="w-3.5 h-3.5 text-slate-400" /> Hacer pública</>}
                      </button>
                      <button onClick={() => { setMenuAbierto(null); eliminar(it); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 inline-flex items-center gap-2">
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </button>
                      </>
                      )}
                      </div>
                      )}

                      {guardarEnAbierto === clave && (
                      <div onClick={e => e.stopPropagation()}
                      className="absolute right-0 top-6 z-30 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-2">
                      <p className="px-3 pb-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Guardar en</p>
                      {carpetas.length ? carpetas.map(c => {
                      const marcada = (carpetasDeItem[clave] || []).includes(c.id);
                      return (
                      <button key={c.id} onClick={() => alternarCarpeta(it, c.id)}
                      className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
                      <span className={cn('w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center',
                      marcada ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300')}>
                      {marcada && <Check className="w-2.5 h-2.5 text-white" />}
                      </span>
                      <span className="truncate flex-1">{c.nombre}</span>
                      </button>
                      );
                      }) : (
                      <p className="px-3 py-1.5 text-[11px] text-slate-400">Crea una carpeta primero: enciende «Tus carpetas» en el botón «Tu portada».</p>
                      )}
                      </div>
                      )}

                      {descargarAbierto === clave && (
                      <div onClick={e => e.stopPropagation()}
                      className="absolute right-0 top-6 z-30 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1">
                      {formatosDescarga(it).map(f => (
                      <button key={f.id} onClick={() => { f.accion(); setDescargarAbierto(null); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
                      <Download className="w-3.5 h-3.5 text-slate-400" /> {f.label}
                      </button>
                      ))}
                      </div>
                      )}
                      </div>
                      </div>

                      {/* LA PORTADA, CUANDO LA HAY. Y sólo cuando la hay: una
                          tarjeta sin foto no recibe un relleno, porque si todas
                          tuvieran imagen «tener imagen» dejaría de ser el
                          criterio con el que está ordenada esta página. */}
                      {(() => { const p = portadaDe(it); return p ? (
                      <div className="px-2.5 pt-2.5">
                      <ImagenDePortada portada={p} titulo={it.titulo} />
                      </div>
                      ) : null; })()}

                      <p className="px-3.5 pt-2 text-[15px] font-black text-slate-900 leading-snug line-clamp-2">{it.titulo}</p>

                      {/* EL TEXTO, DEBAJO DEL TÍTULO (2026-08-24). Eugenio: «haz
                          que el texto descriptivo también se lea debajo del
                          título».

                          Va antes que las etiquetas y antes que `WindowContent`,
                          y ya no depende de que haya portada: un título de seis
                          palabras no dice de qué va nada, y estas dos líneas sí.
                          Se le quitan las marcas de Markdown porque el cuerpo se
                          guarda en Markdown y aquí se lee como texto: sin esto
                          salían almohadillas y asteriscos sueltos. */}
                      {(() => {
                      const texto = textoDe(it);
                      return texto ? (
                      <p className="px-3.5 pt-1.5 text-[12px] leading-snug text-slate-500 line-clamp-2">{texto}</p>
                      ) : null;
                      })()}

                      {/* DE QUÉ HABLA. Sale de las mismas palabras con las que
                          filtra el menú de la izquierda, así que la etiqueta y
                          el filtro nunca se contradicen: si una tarjeta dice
                          «Energía», está en «Energía». */}
                      <div className="px-3.5 pt-1.5 pb-1">
                      <EtiquetasDeTema item={it} />
                      </div>

                      {/* EL CONTENIDO SÓLO CUANDO NO HAY NADA MÁS QUE ENSEÑAR.
                          `WindowContent` vuelve a dibujar la misma foto o el mismo
                          vídeo que ya está de portada —la tarjeta enseñaba la imagen
                          dos veces— y, si ya hay dos líneas de texto, repite también
                          el texto. Así que se pinta cuando la tarjeta no tiene ni
                          portada ni cuerpo: un grafo o una tabla, donde el dibujo ES
                          la publicación. */}
                      {!portadaDe(it) && !textoDe(it) && (
                      <div className="px-3.5 py-2 flex-1 min-h-0 overflow-hidden">
                      <WindowContent kind={it.kind} config={it.config || {}} variant="node" />
                      </div>
                      )}
                      {/* EL PIE YA NO REPITE AL AUTOR: está arriba, con su foto. */}
                      <div className="px-3.5 py-2 flex items-center gap-2 text-[10px] text-slate-400">
                      {it.donde && (
                      <span className="inline-flex items-center gap-1 truncate">
                      <Network className="w-2.5 h-2.5 shrink-0" />{it.donde}
                      </span>
                      )}
                      {it.vistas > 0 && (
                      <span className="inline-flex items-center gap-0.5 shrink-0"><Eye className="w-2.5 h-2.5" />{it.vistas}</span>
                      )}
                      </div>
                      </div>
                      );
                      })}
                      </div>
                      )}
                    </>
                  ),
                };
                return portada.bloques.map(id => <Fragment key={id}>{trozos[id]}</Fragment>);
              })()}
            </>
          )}
        </div>
      </div>

      {noEncontrada && (
        <div className="mx-auto max-w-5xl px-4 mb-3">
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            No he podido abrir esa publicación aquí: puede estar archivada, o quedar fuera de lo que estás viendo ahora.{' '}
            <button onClick={() => { setNoEncontrada(false); const q = new URLSearchParams(searchParams); q.delete('abrir'); setSearchParams(q, { replace: true }); }}
              className="font-black underline">Entendido</button>
          </p>
        </div>
      )}

      {abierta && (
        <FichaPublicacion
          pub={abierta.pub}
          editarAlAbrir={abierta.editar}
          onIr={ruta => navigate(ruta)}
          onCambiada={() => { cargar(); if (modo === 'mias') cargarPapelera(); }}
          onCerrar={() => setAbierta(null)}
        />
      )}

      <CreadorPublicacion abierto={creadorAbierto} onCerrar={() => setCreadorAbierto(false)} />

      {denunciando && (
        <Denunciar
          tipo={denunciando.tipo}
          id={denunciando.id}
          titulo={denunciando.titulo}
          autorNombre={denunciando.autor_nombre}
          onBloquear={denunciando.autor_id
            ? () => { setBloqueando({ id: denunciando.autor_id!, nombre: denunciando.autor_nombre }); setDenunciando(null); }
            : undefined}
          onCerrar={() => setDenunciando(null)}
        />
      )}

      {bloqueando && (
        <Bloquear
          usuarioId={bloqueando.id}
          nombre={bloqueando.nombre}
          // Recargar no es cosmético: lo suyo acaba de dejar de existir para
          // ti, y una lista que sigue enseñándolo dice que el bloqueo no ha
          // funcionado.
          onBloqueado={() => cargar()}
          onCerrar={() => setBloqueando(null)}
        />
      )}

      {personalizando && (
        <PersonalizarPortada
          portada={portada}
          onCambiar={p => updateUiSettings({ portada: p })}
          onCerrar={() => setPersonalizando(false)}
        />
      )}
    </div>
  );
}

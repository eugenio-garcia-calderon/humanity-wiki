// ============================================================================
// EL ICONO QUE LE TOCA A UN NOMBRE (D90, 2026-08-21, Eugenio: «haz que los
// iconos sean siempre en blanco y negro y que no sean letras […] y cuando se
// cree un nuevo proyecto, haz que el icono se guarde automáticamente en
// función del nombre del proyecto»).
// ============================================================================
// LO ELIGE UN DICCIONARIO, NO LA IA. Pedírselo a un modelo costaría dinero en
// cada creación, tardaría segundos y podría devolver el nombre de un icono que
// no existe. Un diccionario acierta siempre lo que sabe y falla de forma
// predecible, que es justo lo que se quiere de algo que se ejecuta solo.
//
// SI NINGUNA PALABRA CASA, SE PONE EL GENÉRICO. No un icono al azar, y sobre
// todo no «el primero de la lista»: ese es el fallo que ya costó dos bugs el
// 20 de agosto (B13 y B34), donde caer en `grupos[0]` guardaba una tarea en el
// grupo equivocado sin decir nada. Un icono neutro es la forma honesta de
// decir «no sé qué representa esto». El usuario siempre puede cambiarlo.
//
// AQUÍ NO SE IMPORTA NINGÚN ICONO. Este fichero lo usa también el servidor,
// para guardar el icono al crear un proyecto, y traerse lucide-react —que es
// React— dentro del servidor sería meter la interfaz en el backend. Aquí solo
// vive el DICCIONARIO, que son palabras. Los dibujos están en
// `src/components/ui/iconosDeTrazo.ts`, que solo usa el navegador.

/** El que se pone cuando ninguna palabra casa. Neutro a propósito. */
export const ICONO_GENERICO = 'Box';

/** Prefijo que distingue un icono de trazo de un emoji o de una imagen. Se
 *  reconoce mirando el valor, como ya se hacía con las imágenes: una columna
 *  «tipo» al lado sería un dato que puede contradecir al otro. */
export const PREFIJO = 'lucide:';

/**
 * Palabras clave en español → icono. EL ORDEN MANDA: gana la primera que casa,
 * así que lo específico va antes que lo general. «Camión camperizado» tiene que
 * dar camión y no vivienda, y por eso «camion» está por delante de «casa».
 */
const PALABRAS: Array<[string[], string]> = [
  // LOS VEHÍCULOS VAN PRIMERO, y antes que «solar», porque en «coche
  // ultraligero solar volador» la cosa es el COCHE y lo demás lo describe.
  // Probado con los nombres reales: sin esto salía un sol.
  [['camion', 'furgoneta', 'furgon', 'camperizado', 'caravana'], 'Truck'],
  [['coche', 'automovil', 'vehiculo', 'movilidad'], 'Car'],
  [['barco', 'velero', 'nautic', 'puerto', 'botadura', 'embarcacion'], 'Ship'],
  [['tren', 'ferrocarril', 'metro'], 'Train'],
  [['bici', 'bicicleta', 'ciclismo'], 'Bike'],
  [['avion', 'vuelo', 'volador', 'aereo', 'dron'], 'Plane'],
  [['solar', 'sol', 'fotovoltaic', 'fotovoltaica'], 'Sun'],
  [['cohete', 'espacio', 'espacial', 'lanzamiento'], 'Rocket'],
  [['bosque', 'arbol', 'arboles', 'reforest', 'selva'], 'Trees'],
  [['huerto', 'huerta', 'semilla', 'siembra', 'cultivo', 'agricultura', 'permacultura'], 'Sprout'],
  [['agua', 'hidric', 'rio', 'acuifero', 'riego', 'lluvia'], 'Droplet'],
  [['mar', 'oceano', 'ola', 'olas', 'marino', 'costa'], 'Waves'],
  [['pez', 'peces', 'pesca', 'acuicultura'], 'Fish'],
  [['montana', 'sierra', 'cumbre', 'monte'], 'Mountain'],
  [['viento', 'eolic', 'eolica'], 'Wind'],
  [['bateria', 'almacenamiento', 'pila'], 'Battery'],
  [['energia', 'electric', 'electricidad', 'potencia'], 'Zap'],
  [['residuo', 'residuos', 'reciclaje', 'reciclar', 'circular', 'compost'], 'Recycle'],
  [['mapa', 'territorio', 'geografia', 'cartografia'], 'Map'],
  [['aldea', 'pueblo', 'comunidad', 'vecin', 'cooperativa'], 'Users'],
  [['casa', 'vivienda', 'hogar', 'domestic', 'construccion', 'obra'], 'Home'],
  [['edificio', 'urbanismo', 'ciudad', 'urbana'], 'Building2'],
  [['fabrica', 'industrial', 'industria', 'produccion', 'manufactura'], 'Factory'],
  [['taller', 'herramienta', 'reparacion', 'mantenimiento', 'chasis', 'mecanic'], 'Wrench'],
  [['carpinteria', 'madera', 'construir'], 'Hammer'],
  [['salud', 'medic', 'sanitario', 'hospital', 'bienestar'], 'HeartPulse'],
  [['farmac', 'medicamento', 'tratamiento'], 'Pill'],
  [['comida', 'cocina', 'aliment', 'restaurante', 'nutricion', 'menu'], 'Utensils'],
  [['ropa', 'textil', 'moda', 'costura'], 'Shirt'],
  [['animal', 'animales', 'ganader', 'mascota', 'fauna'], 'PawPrint'],
  [['tienda', 'comercio', 'venta', 'ventas', 'mercado', 'compra'], 'ShoppingBag'],
  [['inversion', 'inversiones', 'finanza', 'finanzas', 'dinero', 'presupuesto', 'economia'], 'Wallet'],
  [['empresa', 'negocio', 'trabajo', 'cliente', 'clientes', 'comercial'], 'Briefcase'],
  [['ley', 'legal', 'juridic', 'norma', 'derecho', 'gobierno', 'politica'], 'Landmark'],
  [['justicia', 'equidad', 'balance'], 'Scale'],
  [['libro', 'lectura', 'documentacion', 'manual', 'guia', 'wiki'], 'BookOpen'],
  [['escuela', 'educacion', 'formacion', 'curso', 'aprendizaje', 'ensenanza'], 'GraduationCap'],
  [['ciencia', 'investigacion', 'laboratorio', 'ensayo', 'experimento'], 'FlaskConical'],
  [['software', 'codigo', 'programacion', 'informatica', 'tecnologia', 'tecnico', 'datos'], 'Cpu'],
  [['ia', 'ai', 'inteligencia', 'robot', 'agente', 'automatizacion'], 'Bot'],
  [['red', 'internet', 'conexion', 'telecomunicaciones'], 'Wifi'],
  [['foto', 'fotografia', 'imagen', 'camara'], 'Camera'],
  [['video', 'audiovisual', 'cine', 'pelicula'], 'Video'],
  [['musica', 'sonido', 'audio', 'cancion'], 'Music'],
  [['diseno', 'arte', 'creativo', 'ilustracion', 'marca'], 'Palette'],
  [['prensa', 'noticia', 'noticias', 'comunicacion', 'medios', 'dossier'], 'Newspaper'],
  [['evento', 'agenda', 'calendario', 'planificacion', 'fase', 'fases'], 'Calendar'],
  [['camping', 'acampada', 'refugio', 'campamento'], 'Tent'],
  [['dormir', 'descanso', 'cama', 'alojamiento'], 'Bed'],
  [['idea', 'innovacion', 'propuesta', 'mejora', 'mejoras'], 'Lightbulb'],
  [['objetivo', 'meta', 'reto', 'retos', 'desafio'], 'Target'],
  [['mundo', 'global', 'planeta', 'humanidad', 'tierra'], 'Globe2'],
];

/** Sin tildes y en minúsculas. Un nombre escrito «Técnico» y otro «Tecnico»
 *  son la misma palabra, y confundirlos ya nos costó un bug (B34). */
const limpiar = (t: string) =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * El icono que le toca a un nombre, como valor listo para guardar
 * («lucide:Truck»). Si ninguna palabra casa, el genérico.
 *
 * Se compara PALABRA A PALABRA, no buscando el trozo dentro del texto: sin
 * eso, «consolar» contendría «solar» y un proyecto de acompañamiento saldría
 * con un sol. Se admite que la palabra del título EMPIECE por la clave, para
 * que los plurales y los derivados entren solos («camiones», «eolica»).
 */
export function iconoDeNombre(nombre: string): string {
  const palabras = limpiar(nombre || '')
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!palabras.length) return PREFIJO + ICONO_GENERICO;

  for (const [claves, icono] of PALABRAS) {
    for (const clave of claves) {
      if (palabras.some(p => p === clave || (clave.length >= 4 && p.startsWith(clave)))) {
        return PREFIJO + icono;
      }
    }
  }
  return PREFIJO + ICONO_GENERICO;
}

/** ¿Ese valor de `icono` es uno de trazo? */
export const esDeTrazo = (icono?: string | null) => !!icono && icono.startsWith(PREFIJO);

/**
 * El icono que se PINTA para un proyecto.
 *
 * Vale el que haya elegido su dueño mientras sea una imagen o uno de trazo. Un
 * EMOJI guardado se sustituye por el que le toca al nombre (D90, Eugenio: «que
 * los iconos sean siempre en blanco y negro»). Se puede hacer sin mentirle a
 * nadie porque desde D90 los emojis ya no se pueden elegir: los únicos que
 * quedan son anteriores a la regla. Si volvieran a poder elegirse, esto
 * pasaría a ser la interfaz enseñando algo distinto de lo que acabas de
 * guardar, y habría que quitarlo.
 */
export function iconoDeProyecto(icono: string | null | undefined, titulo: string): string {
  if (icono && (esDeTrazo(icono) || icono.startsWith('/') || icono.startsWith('http'))) return icono;
  return iconoDeNombre(titulo);
}

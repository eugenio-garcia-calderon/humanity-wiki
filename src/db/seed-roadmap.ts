import { sql } from 'drizzle-orm';
import { db } from './index.js';

// ============================================================================
// SEMILLA DE LA HOJA DE RUTA (2026-08-08, petición del usuario)
// ============================================================================
// Todo lo construido hasta hoy, en su grupo, atribuido a Eugenio; más lo que
// falta para que humanity.wiki sea de primera división. Idempotente: se puede
// volver a ejecutar y solo actualiza.
//
// Los estados son los del tablero: hecho | en_curso | por_hacer.

const AUTOR = 'U_ADMIN_EUGENIO';

type Item = [grupo: string, titulo: string, resumen: string, estado: string, prioridad: string];

const ITEMS: Item[] = [
  // ==========================================================================
  // 1. EL LIENZO, ESTILO MIRO
  // ==========================================================================
  ['canvas', 'Lienzo infinito de grafos de conocimiento', 'React Flow con nodo central, círculos de categoría y ventanas arrastrables cuya posición se guarda.', 'hecho', 'alta'],
  ['canvas', 'Mi Conocimiento: el lienzo personal', 'Un lienzo por persona cuyo centro es ella misma; todo lo que crea cuelga de su nombre y vive en la base de datos general.', 'hecho', 'alta'],
  ['canvas', 'Barra de herramientas de creación (14 herramientas)', 'Grafo, mapa, producto, proyecto, tarea, tabla, texto, publicación, imagen, vídeo, enlace, Wikipedia, conectar y recomendador.', 'hecho', 'alta'],
  ['canvas', 'Pegar en el lienzo (Cmd+V)', 'Imágenes, texto, enlaces y vídeos de YouTube se convierten en la ventana que corresponde.', 'hecho', 'media'],
  ['canvas', 'Arrastrar archivos desde el escritorio', 'Caen en el punto donde los sueltas; imágenes, PDF y hojas de cálculo se suben, .txt y .md se leen como nota.', 'hecho', 'media'],
  ['canvas', 'Seleccionar: redimensionar, rotar y 4 puntos de conexión', 'Tiradores en las esquinas, giro con Shift a 15°, y cuatro puntos en los lados para conectar de un clic.', 'hecho', 'alta'],
  ['canvas', 'Barra flotante del elemento', 'Renombrar, convertir de tipo, reemplazar archivo, descargar, ALT, recortar, comentar, bloquear, IA y menú de acciones.', 'hecho', 'alta'],
  ['canvas', 'Recorte de imagen no destructivo', 'Se guarda un rectángulo en porcentajes; el archivo original nunca se toca y cada lienzo puede tener su encuadre.', 'hecho', 'media'],
  ['canvas', 'Papelera de 15 días', 'Quitar del lienzo conserva el conocimiento; borrar lo manda a la papelera y a los 15 días se elimina de verdad.', 'hecho', 'media'],
  ['canvas', 'Zoom semántico en la Red de Datos', 'Al acercarte a una esfera se despliegan sus publicaciones; al alejarte se colapsan en satélites.', 'hecho', 'alta'],
  ['canvas', 'Edición completa de las conexiones', 'Puntas de flecha, invertir sentido, tipo de línea, color y grosor, etiqueta, curvar y reenganchar extremos.', 'en_curso', 'alta'],
  ['canvas', 'Selección múltiple y acciones en grupo', 'Marcar varios elementos con un rectángulo y moverlos, alinearlos, agruparlos o borrarlos a la vez.', 'por_hacer', 'alta'],
  ['canvas', 'Deshacer y rehacer (Cmd+Z)', 'Historial de acciones en el lienzo. Hoy cualquier error obliga a corregirlo a mano.', 'por_hacer', 'alta'],
  ['canvas', 'Colaboración en vivo con varios cursores', 'Ver quién más está en el lienzo y qué toca, en tiempo real. Es la pieza que convierte el lienzo en un espacio compartido.', 'por_hacer', 'alta'],
  ['canvas', 'Marcos y agrupaciones', 'Contenedores con título para organizar zonas del lienzo, como los frames de Miro.', 'por_hacer', 'media'],
  ['canvas', 'Plantillas de lienzo', 'Arrancar de un esquema ya hecho: análisis de un reto, mapa de actores, cronología, árbol de causas.', 'por_hacer', 'media'],
  ['canvas', 'Notas adhesivas y dibujo libre', 'Post-its de colores y trazo a mano alzada sobre el lienzo.', 'por_hacer', 'baja'],
  ['canvas', 'Exportar el lienzo a imagen o PDF', 'Compartir un grafo fuera de la plataforma sin perder su disposición.', 'por_hacer', 'media'],
  ['canvas', 'Alineado y guías inteligentes', 'Imanes y líneas guía al arrastrar, para que las cosas queden derechas sin pelearse.', 'por_hacer', 'baja'],

  // ==========================================================================
  // 2. LOS MAPAS
  // ==========================================================================
  ['mapas', 'Mapa mundial con zoom por niveles', 'Del planeta al municipio, con polígonos reales y cambio de capa según el zoom.', 'hecho', 'alta'],
  ['mapas', '242 territorios y los 179 municipios de Madrid', 'Jerarquía territorial real con sus polígonos.', 'hecho', 'alta'],
  ['mapas', '14 objetivos con indicadores, marcadores y métricas', 'Cuatro niveles de medición encadenados y filtrables sobre el mapa.', 'hecho', 'alta'],
  ['mapas', 'Explorador del territorio como grafo', 'El panel central es un lienzo: la entidad al centro, sus retos orbitando en rojo y sus soluciones en verde.', 'hecho', 'alta'],
  ['mapas', 'Estaciones de medición reales', '15 estaciones con datos oficiales de calidad del agua.', 'hecho', 'media'],
  ['mapas', 'Geometría real en la base de datos (PostGIS)', 'Hoy los 242 territorios tienen la geometría vacía y los polígonos viven en ficheros. PostGIS está instalado y sin usar.', 'por_hacer', 'alta'],
  ['mapas', 'Marcar las 17.421 observaciones fabricadas', 'Datos clonados que hoy no están señalados como generados por IA. Es una deuda de honestidad, no estética.', 'por_hacer', 'alta'],
  ['mapas', 'Mapas propios de cada usuario', 'Crear un mapa temático con tus capas y publicarlo, no solo usar el mapa de indicadores.', 'en_curso', 'media'],
  ['mapas', 'Series temporales sobre el mapa', 'Ver cómo cambia un indicador en el tiempo, con una línea del tiempo que se puede arrastrar.', 'por_hacer', 'alta'],
  ['mapas', 'Comparador de territorios', 'Poner dos o más territorios lado a lado y ver en qué se diferencian de verdad.', 'por_hacer', 'media'],
  ['mapas', 'Importar datos geográficos (GeoJSON, CSV)', 'Que cualquiera suba una capa y la publique con su fuente citada.', 'por_hacer', 'media'],
  ['mapas', 'Cobertura fuera de España', 'Hoy solo España tiene datos reales; Europa está con valores aleatorios de prueba.', 'por_hacer', 'alta'],
  ['mapas', 'Atribución de Mapbox', 'Se retiró conscientemente, incumpliendo sus condiciones. Riesgo de suspensión de la cuenta.', 'por_hacer', 'alta'],

  // ==========================================================================
  // 3. LAS BASES DE DATOS, ESTILO NOTION
  // ==========================================================================
  ['datos', 'Página Base de Datos', 'Las 92 tablas reales agrupadas por familia, con pop-up que enseña su contenido.', 'hecho', 'alta'],
  ['datos', 'Tablas editables dentro del lienzo', 'Rejilla tipo Notion: renombrar columnas, añadir y borrar filas, celdas que guardan al escribir.', 'hecho', 'alta'],
  ['datos', 'Tareas y proyectos como elementos de conocimiento', 'Casillas que se marcan, estados y listas de pasos, guardados en la base de datos general.', 'hecho', 'media'],
  ['datos', 'Historial y versionado de cada entidad', 'Cada cambio queda registrado con su autor.', 'hecho', 'alta'],
  ['datos', 'Vistas de una misma tabla', 'La misma información como tabla, tablero, calendario o galería, con filtros y orden guardados.', 'por_hacer', 'alta'],
  ['datos', 'Columnas con tipo de verdad', 'Número, fecha, selección, casilla, persona, relación a otra tabla y fórmulas.', 'por_hacer', 'alta'],
  ['datos', 'Relaciones entre tablas', 'Que una fila apunte a otra tabla, como las relaciones de Notion — la base de una wiki de datos.', 'por_hacer', 'alta'],
  ['datos', 'Importar y exportar CSV / Excel', 'Traer una hoja de cálculo y convertirla en tabla viva, y sacarla de vuelta.', 'por_hacer', 'alta'],
  ['datos', 'API pública de solo lectura', 'Que cualquiera (persona o IA) consulte el conocimiento común con una clave, con límites de uso.', 'por_hacer', 'alta'],
  ['datos', 'Buscador global de verdad', 'Búsqueda por texto completo sobre todo el conocimiento, con ranking y filtros.', 'por_hacer', 'alta'],
  ['datos', 'Sacar server.ts de en medio', '1.891 líneas de SQL en bruto con las rutas heredadas. Es el mayor freno técnico del proyecto.', 'por_hacer', 'media'],

  // ==========================================================================
  // 4. LA RED SOCIAL
  // ==========================================================================
  ['social', 'Usuarios, sesiones y 5 niveles de rol', 'Visitante, usuario, verificado, conocimiento y administrador, con permisos reales en cada ruta.', 'hecho', 'alta'],
  ['social', 'Login con Google', 'Entrar sin crear otra contraseña más.', 'hecho', 'media'],
  ['social', 'Muro y perfil público', 'Publicaciones, reacciones, seguir a personas y la carta de presentación de cada una.', 'hecho', 'alta'],
  ['social', 'Comentarios en cualquier cosa', 'Comentarios polimórficos sobre ventanas, conexiones y publicaciones.', 'hecho', 'alta'],
  ['social', 'La IA responde a cada comentario', 'Reconoce lo válido, aporta un matiz y corrige con delicadeza lo que no encaja con las fuentes.', 'hecho', 'alta'],
  ['social', 'Valoración 0-10 de cada pieza', 'El conocimiento se valora, y la valoración es pública.', 'hecho', 'media'],
  ['social', 'Verificación del correo electrónico', 'Hoy no hay proveedor de correo conectado: nadie puede verificar su cuenta ni recuperar su contraseña.', 'por_hacer', 'alta'],
  ['social', 'Notificaciones', 'Que te enteres de que alguien comentó, conectó o valoró algo tuyo. Sin esto no hay comunidad.', 'por_hacer', 'alta'],
  ['social', 'Mensajes directos entre personas', 'Conversaciones privadas, y con la IA como participante opcional.', 'por_hacer', 'media'],
  ['social', 'Grupos y comunidades por territorio o tema', 'Espacios donde varias personas construyen conocimiento juntas.', 'por_hacer', 'alta'],
  ['social', 'Sistema de Debates', 'Confrontar posturas sobre un reto con argumentos citados, ya propuesto y sin aprobar.', 'por_hacer', 'alta'],
  ['social', 'Reputación y contribución visible', 'Qué ha aportado cada persona y cuánto se apoya en ello el resto.', 'por_hacer', 'media'],
  ['social', 'Invitaciones y onboarding social', 'Traer a alguien y que encuentre a su gente el primer día.', 'por_hacer', 'media'],

  // ==========================================================================
  // 5. EL MERCADO
  // ==========================================================================
  ['mercado', 'Productos y página de Mercado', 'Catálogo con categorías, precios y vínculo a territorios, retos y soluciones.', 'hecho', 'alta'],
  ['mercado', 'Stripe Connect y cobro de productos', 'Pagos reales con cuentas de vendedor, en modo de prueba.', 'hecho', 'alta'],
  ['mercado', 'Donaciones y contribución', 'Apoyar económicamente a la plataforma y a quien crea conocimiento.', 'hecho', 'media'],
  ['mercado', 'Facturación del uso de la IA', 'Coste por modelo y comisión, con límites por nivel de usuario.', 'hecho', 'media'],
  ['mercado', 'Reparto de ingresos por conocimiento visto', 'Que quien escribe lo que la gente lee cobre por ello. Es el corazón económico de la visión y aún no existe.', 'por_hacer', 'alta'],
  ['mercado', 'Panel del vendedor y del creador', 'Cuánto se ha visto lo tuyo, cuánto has ganado y cuándo cobras.', 'por_hacer', 'alta'],
  ['mercado', 'Pasar Stripe a producción', 'Hoy está en modo de prueba: no entra ni sale dinero real.', 'por_hacer', 'alta'],
  ['mercado', 'Facturas, impuestos y cumplimiento', 'IVA, facturas y las obligaciones de una plataforma que mueve dinero de terceros.', 'por_hacer', 'alta'],
  ['mercado', 'Suscripciones y membresías', 'Apoyo recurrente con contrapartidas claras.', 'por_hacer', 'media'],
  ['mercado', 'Demandas y necesidades del territorio', 'Que un territorio publique lo que necesita y alguien pueda responder con una oferta.', 'en_curso', 'media'],

  // ==========================================================================
  // 6. DISEÑO, UI Y ONBOARDING
  // ==========================================================================
  ['diseno', 'Portada con tres ventanas vivas', 'Red, Geolocalización y Base de Datos previsualizadas cargando la página real dentro.', 'hecho', 'alta'],
  ['diseno', 'Menú superior con las cinco puertas', 'Inicio, Geolocalización, Red de Datos, Base de Datos, Mi Conocimiento y Universo.', 'hecho', 'alta'],
  ['diseno', 'Paneles redimensionables que recuerdan tu ajuste', 'El ancho queda grabado en tu cuenta.', 'hecho', 'baja'],
  ['diseno', 'Página Universo', 'El cosmos del conocimiento con zoom semántico.', 'hecho', 'media'],
  ['diseno', 'Sistema de diseño de verdad', 'Hoy hay 24 colores escritos a mano y 127 botones sin primitiva. Es lo más barato de arreglar y empeora cada día.', 'por_hacer', 'alta'],
  ['diseno', 'Onboarding del usuario nuevo', 'Los primeros cinco minutos: qué es esto, qué puedo hacer y por dónde empiezo.', 'por_hacer', 'alta'],
  ['diseno', 'Versión móvil de verdad', 'Hoy el lienzo y el mapa asumen ratón y pantalla grande.', 'por_hacer', 'alta'],
  ['diseno', 'Accesibilidad (WCAG)', 'Contraste, foco visible, navegación por teclado y lectores de pantalla.', 'por_hacer', 'alta'],
  ['diseno', 'Varios idiomas', 'La plataforma es de la humanidad y hoy solo habla español.', 'por_hacer', 'alta'],
  ['diseno', 'SEO y compartir en redes', 'Que una publicación se vea bien al compartirla y que Google la encuentre.', 'por_hacer', 'alta'],
  ['diseno', 'Modo oscuro', 'Para trabajar de noche sin quemarse los ojos.', 'por_hacer', 'baja'],
  ['diseno', 'Rendimiento del primer cargado', 'Hoy son 3,17 MB en un solo paquete: Mapbox y React Flow se descargan aunque no los uses.', 'por_hacer', 'media'],

  // ==========================================================================
  // 7. LA IA
  // ==========================================================================
  ['ia', 'Asistente de conocimiento en toda la app', 'Barra inferior con contexto de dónde estás, que busca y crea de verdad.', 'hecho', 'alta'],
  ['ia', 'Búsqueda real en internet', 'La herramienta nativa de Claude, con las fuentes citadas.', 'hecho', 'alta'],
  ['ia', 'Adjuntar imágenes y PDF', 'El chat entiende lo que le enseñas.', 'hecho', 'media'],
  ['ia', 'La IA crea grafos y mapas de verdad', 'No describe lo que haría: lo ejecuta contra la base de datos, con permisos por nivel.', 'hecho', 'alta'],
  ['ia', 'Preguntas con opciones, estilo Claude Code', 'Cuando le falta un dato, pregunta con 1, 2 y Otro en vez de inventárselo.', 'hecho', 'media'],
  ['ia', 'Dictado por voz', 'Hablarle en vez de escribir.', 'hecho', 'baja'],
  ['ia', 'Elegir entre varios modelos de IA', 'Conectar más proveedores y que cada persona elija con cuál trabaja y a qué coste.', 'por_hacer', 'alta'],
  ['ia', 'La IA lee el conocimiento común antes de responder', 'Recuperación sobre todo el grafo, no solo sobre palabras clave, para que responda con lo que la plataforma ya sabe.', 'por_hacer', 'alta'],
  ['ia', 'Agentes que trabajan solos', 'Que revisen datos, detecten contradicciones entre fuentes y propongan conexiones sin que nadie lo pida.', 'por_hacer', 'alta'],
  ['ia', 'Detección de contradicciones y bulos', 'Que la plataforma avise cuando dos piezas de conocimiento se contradicen.', 'por_hacer', 'alta'],
  ['ia', 'Resúmenes y traducción automática', 'Leer cualquier grafo en tu idioma y en dos minutos.', 'por_hacer', 'media'],
  ['ia', 'Historial y coste visible del uso de IA', 'Saber en qué se gasta y poner un tope.', 'por_hacer', 'media'],

  // ==========================================================================
  // 8. ALMACENAMIENTO Y SEGURIDAD
  // ==========================================================================
  ['infra', 'Producción en humanity.wiki', 'Cloudflare delante, servidor propio detrás, certificado automático y despliegue con cada cambio.', 'hecho', 'alta'],
  ['infra', 'Subida de archivos con volumen propio', 'Los archivos sobreviven a cada despliegue y solo las imágenes se muestran dentro de la web.', 'hecho', 'alta'],
  ['infra', 'Cierre de la escritura anónima', 'Había un agujero real en producción: cualquiera podía escribir en 14 tablas sin cuenta. Cerrado y verificado.', 'hecho', 'alta'],
  ['infra', 'Archivado en vez de borrado', 'Nada se destruye sin querer; todo queda recuperable.', 'hecho', 'alta'],
  ['infra', 'Copias de seguridad', 'Hoy NO hay ninguna. Ni de la base de datos ni de los archivos subidos. Es el riesgo más grave del proyecto.', 'por_hacer', 'alta'],
  ['infra', 'Pruebas automáticas', 'Cero tests hoy. Cada cambio se verifica a mano y cada refactor es a ciegas.', 'por_hacer', 'alta'],
  ['infra', 'Política de permisos en un solo sitio', 'Hoy está repartida entre el catálogo de la IA y cada ruta; unificarla evita el próximo agujero.', 'por_hacer', 'alta'],
  ['infra', 'Vigilancia y avisos de caída', 'Enterarse de que algo falla antes de que lo cuente un usuario.', 'por_hacer', 'alta'],
  ['infra', 'Límite de peticiones y anti-abuso', 'Protección contra el uso masivo automatizado.', 'por_hacer', 'alta'],
  ['infra', 'RGPD: exportar y borrar tus datos', 'Obligación legal en Europa y compromiso con quien confía en la plataforma.', 'por_hacer', 'alta'],
  ['infra', 'Escalado horizontal', 'Hoy todo corre en una sola máquina.', 'por_hacer', 'media'],
  ['infra', 'Auditoría de seguridad externa', 'Que alguien de fuera intente romperlo antes de que se abra al mundo.', 'por_hacer', 'media'],

  // ==========================================================================
  // 9. GOBERNANZA Y VERACIDAD (grupo propuesto por Claude)
  // ==========================================================================
  ['gobernanza', 'Constitución del proyecto escrita', 'Las reglas que mandan sobre el código, con jerarquía explícita.', 'hecho', 'alta'],
  ['gobernanza', 'Marcado de contenido generado por IA', 'Lo que escribe una máquina lleva su etiqueta y queda pendiente de revisión.', 'hecho', 'alta'],
  ['gobernanza', 'Categorías semánticas del conocimiento', 'Contexto, causa, dato, fuente, apoya, contradice y matiza: cada conexión dice qué tipo de verdad es.', 'hecho', 'alta'],
  ['gobernanza', 'Separación entre hecho e hipótesis', 'Como en el grafo del Estrecho: lo observable arriba, lo interpretado abajo, y se ve la diferencia.', 'hecho', 'alta'],
  ['gobernanza', 'Revisión por pares del conocimiento', 'Que alguien de nivel Conocimiento valide una pieza antes de que pese en el común.', 'por_hacer', 'alta'],
  ['gobernanza', 'Citas y fuentes obligatorias', 'Que un dato sin fuente no pueda presentarse como dato.', 'por_hacer', 'alta'],
  ['gobernanza', 'Moderación y denuncias', 'Qué se hace cuando alguien publica algo falso, ofensivo o ilegal, y quién decide.', 'por_hacer', 'alta'],
  ['gobernanza', 'Licencias del contenido', 'Bajo qué licencia se publica lo que sube cada persona y qué puede hacer el resto con ello.', 'por_hacer', 'alta'],
  ['gobernanza', 'Historial público de cambios', 'Ver quién cambió qué y cuándo, y poder volver atrás — como el historial de Wikipedia.', 'por_hacer', 'alta'],
  ['gobernanza', 'Decisiones colectivas', 'Cómo se decide lo que afecta a todos: votaciones, propuestas, quórum.', 'por_hacer', 'media'],
];

async function main() {
  console.log(`Sembrando ${ITEMS.length} tarjetas de la hoja de ruta…`);
  const porGrupo: Record<string, number> = {};
  for (let i = 0; i < ITEMS.length; i++) {
    const [grupo, titulo, resumen, estado, prioridad] = ITEMS[i];
    porGrupo[grupo] = (porGrupo[grupo] || 0) + 1;
    // Id estable a partir del título: volver a ejecutar actualiza, no duplica.
    const id = 'RM_' + titulo.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48).toUpperCase();
    await db.execute(sql`
      INSERT INTO roadmap_items (id, grupo, titulo, resumen, estado, prioridad, autor_user_id, orden, created_by, updated_by)
      VALUES (${id}, ${grupo}, ${titulo}, ${resumen}, ${estado}, ${prioridad}, ${AUTOR}, ${i}, ${AUTOR}, ${AUTOR})
      ON CONFLICT (id) DO UPDATE SET
        grupo = EXCLUDED.grupo, titulo = EXCLUDED.titulo, resumen = EXCLUDED.resumen,
        estado = EXCLUDED.estado, prioridad = EXCLUDED.prioridad, orden = EXCLUDED.orden,
        updated_at = now(), updated_by = ${AUTOR}
    `);
  }
  console.log('Por grupo:', porGrupo);
  const r = await db.execute(sql`
    SELECT estado, count(*)::int AS n FROM roadmap_items WHERE archived_at IS NULL GROUP BY estado
  `);
  console.log('Por estado:', r.rows);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

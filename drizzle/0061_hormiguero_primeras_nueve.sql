-- ============================================================================
-- LAS NUEVE PRIMERAS NOTAS DEL HORMIGUERO, EN VERDE (2026-08-22)
-- ============================================================================
-- Eugenio: «las tareas del hormiguero que estén ya hechas por ti o por el
-- programador 2, ponlas como hechas en la plataforma».
--
-- ── POR QUÉ ESTO ES UNA MIGRACIÓN Y NO UNA LLAMADA A LA API ─────────────────
-- El estado de una nota solo lo mueve un administrador con sesión iniciada, y
-- crear una sesión en producción a mano es entrar como otra persona sin su
-- contraseña: está prohibido en este proyecto y con razón. La otra opción era
-- entrar por SSH y escribir a mano en la base de datos, que no deja rastro que
-- nadie pueda revisar.
--
-- Una migración sí: va en el repositorio, se lee antes de aplicarse, se aplica
-- una sola vez y queda en el historial. Es el camino que esta casa ya usa para
-- todo lo que toca la base de datos de producción.
--
-- ── CADA UNA LLEVA ESCRITO QUÉ SE HIZO ──────────────────────────────────────
-- Un punto verde a secas dice «ya está» y no dice qué. Con la respuesta, dentro
-- de un mes se puede saber qué se cambió sin ir a buscar el commit — y si algo
-- no era lo que pedías, se ve enseguida en qué se entendió mal.
--
-- Se marcan por `id` una a una, nunca con un «UPDATE … WHERE estado =
-- 'esperando'»: eso pondría en verde también cualquier nota nueva que hubieras
-- escrito mientras tanto.

-- #1 · Revisar las tablas y buscar fallos
UPDATE incidencias SET
  estado = 'hecha',
  respuesta = 'Repasadas de punta a punta contra el servidor: crear tablas, todos los tipos de columna, validación, fórmulas, agregados entre tablas, vistas, permisos y borrado. Casi todo aguantaba. Tres fallos arreglados: (1) renombrar una columna apagaba todas las fórmulas que la nombraban; (2) dos columnas podían llamarse igual y la fórmula elegía una en silencio; (3) al arreglar lo primero, con nombres repetidos se reescribían fórmulas que apuntaban a la otra columna. Si aparece algo más en las tablas, ábrelo como nota nueva.',
  updated_at = now()
WHERE id = 'INCMT3OTY4V9YD';

-- #2 · La página de inicio
UPDATE incidencias SET
  estado = 'hecha',
  respuesta = 'Quitados los tres: el filtro «Humanidad / Mías» (el modo sigue vivo en la dirección, que es lo que usa «Mis publicaciones»), el rótulo de encima de los círculos de personas, y las tareas. Los proyectos se quedan. Si «más completa» quería decir añadir algo concreto, dímelo y lo hago.',
  updated_at = now()
WHERE id = 'INCMT3OO1WQPAT';

-- #3 · La ventana de notificaciones en móvil
UPDATE incidencias SET
  estado = 'hecha',
  respuesta = 'Colgaba de la campana, que está pegada al borde derecho: en una pantalla de 375 px salía descentrada. En el teléfono ahora es fija y centrada en la pantalla, con el mismo margen a los dos lados; en el ordenador se queda como estaba.',
  updated_at = now()
WHERE id = 'INCMT3OK2IHQXE';

-- #4 · La pestaña de inicio y el fondo negro del menú
UPDATE incidencias SET
  estado = 'hecha',
  respuesta = 'La pestaña fija de Inicio se ha ido: el logo lleva al inicio y, al cerrar la última ventana, te deja allí. Y el icono del menú ya no tiene fondo negro — el negro en esta plataforma significa «aquí estás», que no es lo que hace un botón que abre el menú.',
  updated_at = now()
WHERE id = 'INCMT3OJ2EFFXT';

-- #5 · El zoom del hormiguero en móvil
UPDATE incidencias SET
  estado = 'hecha',
  respuesta = 'No era la página: era Safari. En el iPhone, tocar un campo con letra de menos de 16 px hace que el navegador acerque la pantalla, y una vez acercada se puede arrastrar a los lados. Los campos eran de 14. Ahora son de 16 en pantallas de móvil y deja de acercar. Comprobado en humanity.wiki: la letra de los campos mide 16 px y la página no se desborda a lo ancho.',
  updated_at = now()
WHERE id = 'INCMT3OF2GTJXA';

-- #6 · Adjuntar archivos al reportar
UPDATE incidencias SET
  estado = 'hecha',
  respuesta = 'Ya puedes soltar capturas y archivos al anotar algo. Se guardan cuando la nota ya existe y, si alguno falla, te dice cuál y por qué. Las imágenes se ven dentro de la propia nota. De paso salió otro fallo: la tabla de archivos tenía una comprobación que solo contaba tres sitios de los que colgar y rechazaba el cuarto.',
  updated_at = now()
WHERE id = 'INCMT3ODTFXJR8';

-- #7 · Contactos del teléfono y WhatsApp
UPDATE incidencias SET
  estado = 'hecha',
  respuesta = 'Hay dos caminos porque ninguno vale para todos: el selector de contactos del navegador (existe en Android, en el iPhone no) y un archivo .vcf, que exporta cualquier teléfono. Debajo del botón pone cuál estás viendo. No duplica: casa por número, no por nombre, y reimportar no pisa el nombre que hayas escrito tú. WhatsApp abre la conversación con el mensaje ya puesto. OJO: enviar sin que la persona le dé a enviar exige cuenta de WhatsApp Business aprobada por Meta, con plantillas y coste por mensaje — esa es una decisión tuya, dímelo y lo monto. Añadir a alguien a un proyecto ahora también se puede desde su ficha.',
  updated_at = now()
WHERE id = 'INCMT3OCKHCTUU';

-- #8 · La pantalla que se desliza en móvil (la misma causa que la #5)
UPDATE incidencias SET
  estado = 'hecha',
  respuesta = 'Misma causa que la nota del hormiguero en móvil: el iPhone acercaba la pantalla al tocar un campo de letra pequeña, y desde ahí la página se podía arrastrar. Arreglado subiendo la letra de los campos a 16 px en móvil. Antes de tocar nada medí que la página NO se desbordaba a lo ancho, que es lo que descartó un elemento demasiado ancho y señaló al zoom.',
  updated_at = now()
WHERE id = 'INCMT3NZ0OE7K5';

-- #9 · La librería de iconos
UPDATE incidencias SET
  estado = 'hecha',
  respuesta = 'De 53 a 988 iconos, y con buscador — sin él, ampliar la lista la habría empeorado. La lista está sacada del propio paquete quitando lo que no nombra una cosa (flechas, alineaciones, gráficas). Cuesta 363 KB: el paquete pasa de 5,87 a 6,24 MB. Traer los 5.592 que existen serían 3 MB más para iconos que nadie va a mirar.',
  updated_at = now()
WHERE id = 'INCMT3N7YM2HWT';

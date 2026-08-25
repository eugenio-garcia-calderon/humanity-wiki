// ============================================================================
// LA LISTA DE MÓDULOS (2026-08-22)
// ============================================================================
// Registrar un módulo era **una reserva de `server.ts`**. En una sola hora ese
// fichero tuvo tres reservas seguidas —prog5, prog1 y prog2— por tres cosas
// que no se tocaban entre sí, y antes de eso alguien tuvo que colgar
// `/api/herramientas` de `publicar.ts`, donde no le corresponde, solo para no
// entrar. Eso no es disciplina: es una cola disfrazada de norma.
//
// Y encima `server.ts` está congelado (prohibición 8 del `CLAUDE.md` de la
// raíz), pero todo el mundo escribía en él igual, porque era el único sitio
// donde se podía enchufar un módulo. Una prohibición que hay que saltarse para
// trabajar deja de proteger nada.
//
// Ahora los módulos viven aquí. **Añadir uno es una línea en esta lista**, en
// la PR de quien lo escribe, sin reservar nada de nadie.
//
// ── EL ORDEN DE ESTA LISTA ES COMPORTAMIENTO, NO ESTILO ────────────────────
// En Express, montar antes o después cambia lo que pasa. Hoy mismo costó un
// 403 con una sesión de nivel 4 perfectamente válida: la ruta se registraba
// antes de que `registerAuthRoutes` hubiera instalado `req.user`, así que para
// ella no había nadie identificado.
//
// Por eso esta lista **no se ordena alfabéticamente y no se reordena por
// gusto**. Se añade al final del grupo que corresponda. Donde hay una
// dependencia de verdad, está escrita al lado — que es mejor que vivir en la
// cabeza de quien lo montó.
//
// ── LO QUE NO ESTÁ AQUÍ, Y POR QUÉ ─────────────────────────────────────────
// `registerAuthRoutes` se queda en `server.ts`: instala el middleware del que
// dependen todos los demás, así que no es un elemento de la lista, es la
// condición para que la lista funcione. Y el cronómetro de la medición se monta
// aún antes, porque mide el tiempo que espera quien pide.
import type { Express } from 'express';

import { registrarGuardia } from './seguridad/guardia.js';
import { registrarSelladoAutomatico } from './seguridad/selladoAutomatico.js';
import { registrarTransparencia } from './seguridad/transparencia.js';
import { registrarAnclajeAutomatico } from './seguridad/anclaje.js';
import { registerMedicionRoutes } from './medicion.js';
import { registerGraphRoutes } from './graph.js';
import { registerSocialRoutes } from './social.js';
import { registerBloqueosRoutes } from './bloqueos.js';
import { registerAIRoutes } from './ai/assistant.js';
import { registerKnowledgeRoutes } from './knowledge.js';
import { registerUploadRoutes } from './uploads.js';
import { registerRoadmapRoutes } from './roadmap.js';
import { registerJuegoRoutes } from './juego.js';
import { registerNavegadorRoutes } from './navegador.js';
import { registerArchivosRoutes } from './archivos.js';
import { registerArchivoRoutes } from './archivo.js';
import { registerIncidenciasRoutes } from './incidencias.js';
import { registerBdRoutes } from './bd.js';
import { registerPublicarRoutes } from './publicar.js';
import { registerHerramientasRoutes } from './herramientas.js';
import { registerDominiosRoutes } from './dominios.js';
import { registerBuscadorRoutes } from './buscador.js';
import { registrarRepublicar } from './republicar.js';
import { registrarFuente } from './fuente.js';
import { registrarTemas } from './temas.js';
import { registrarAgregador } from './agregador.js';
import { registerNavegadorRemotoRoutes } from './navegadorRemoto.js';
import { registerFinanzasRoutes } from './finanzas.js';
import { registerYoutubeRoutes } from './youtube.js';
import { registerSpotifyRoutes } from './spotify.js';
import { registerStripeRoutes } from './stripe.js';
import { registerPuntosRoutes } from './puntos.js';
import { registerGastoRoutes } from './gasto.js';
import { registerDocumentosRoutes } from './documentos.js';
import { registerMenuRoutes } from './menu.js';
import { registerMensajesRoutes } from './mensajes.js';
import { registerCalendarioRoutes } from './calendario.js';
import { registerPersonasRoutes } from './personas.js';
import { registerGuardarRoutes } from './guardar.js';
import { registerVeracidadRoutes } from './veracidad.js';
import { registerAgendaRoutes } from './agenda.js';
import { registerGoogleRoutes } from './google.js';
import { registerMisVideosRoutes } from './misVideos.js';
import { registerContactosGoogleRoutes } from './contactosGoogle.js';
import { registerCalendarioGoogleRoutes } from './calendarioGoogle.js';
import { registerTelecomRoutes } from './telecom.js';
import { registerTextosRoutes } from './textos.js';

/**
 * Un módulo de la API.
 *
 * `nota` no es adorno: es donde se dice **por qué está donde está**, si es que
 * el sitio importa. Si no dice nada, es que da igual y se puede mover.
 */
export type Modulo = {
  nombre: string;
  montar: (app: Express, db: any) => void;
  nota?: string;
};

export const MODULOS: Modulo[] = [
  {
    nombre: 'seguridad/guardia',
    montar: app => registrarGuardia(app),
    nota: 'EL PRIMERO DE LA LISTA, y aquí el orden importa más que en ningún otro sitio: '
        + 'mira TODAS las escrituras de la API contra la tabla de permisos, así que un módulo '
        + 'montado antes que él quedaría fuera de la comprobación sin que nadie lo notara. '
        + 'Va después de `registerAuthRoutes` como todos —necesita `req.user` para saber el nivel— '
        + 'y arranca en modo avisar: anota lo que habría rechazado y no rechaza nada. '
        + 'Se enciende con SEGURIDAD_MODO=exigir, sin desplegar. Ver src/server/seguridad/CLAUDE.md.',
  },

  {
    nombre: 'seguridad/transparencia',
    montar: (app, db) => registrarTransparencia(app, db),
    nota: 'DESPUÉS del guardián y ANTES que todo lo demás, y aquí el orden vuelve a ser '
        + 'comportamiento: cierra `GET /api/db/tables/:name` para un puñado de tablas que son '
        + 'de las personas y no nuestras, y para eso tiene que llegar antes que la ruta de '
        + '`server.ts` que las serviría. Lo que sí se permite, lo anota en el registro sellado. '
        + 'No decide permisos: eso lo hacen las rutas.',
  },

  {
    nombre: 'seguridad/anclaje',
    montar: (app, db) => registrarAnclajeAutomatico(app, db),
    nota: 'No registra rutas: publica una vez al día, FUERA de aquí, el resumen de lo anotado en el '
        + 'registro sellado. Es lo que convierte «verificable por nosotros» en «verificable por '
        + 'cualquiera», y lo único que sale son 32 bytes. El sitio en la lista da igual; está aquí '
        + 'para que se vea que existe.',
  },

  {
    nombre: 'seguridad/sellado',
    montar: (app, db) => registrarSelladoAutomatico(app, db),
    nota: 'No registra ninguna ruta: vacía cada dos minutos el buzón de cambios que llenan los '
        + 'disparadores de la base de datos, encadenando y firmando. Sale JUNTO con esos disparadores '
        + 'a propósito: ponerlos sin nada que vacíe el buzón es un grifo con el desagüe tapado. '
        + 'El sitio en la lista da igual; está aquí para que se vea que existe.',
  },

  {
    nombre: 'medicion',
    montar: (app, db) => registerMedicionRoutes(app, db),
    nota: 'DESPUÉS de la autenticación: comprueba que quien mira es administrador, '
        + 'y `req.user` lo instala `registerAuthRoutes`. El cronómetro se monta antes, en `server.ts`.',
  },

  // Grafo de conocimiento, red social y mercado (fases 3-5). Van después de la
  // autenticación porque dependen de `req.user` para los niveles de rol.
  { nombre: 'graph', montar: (app, db) => registerGraphRoutes(app, db) },
  { nombre: 'social', montar: (app, db) => registerSocialRoutes(app, db) },

  {
    nombre: 'bloqueos',
    montar: app => registerBloqueosRoutes(app),
    nota: 'Bloquear a una persona: último requisito de la App Store que dependía de nosotros. '
        + 'Va DESPUÉS de `social`, que es donde vive seguir a alguien — bloquear rompe el '
        + 'seguimiento, y eso lo hace un disparador de la base de datos (migración 0091), no este '
        + 'módulo. La regla de quién ve a quién tampoco está aquí: es la función SQL '
        + '`bloqueado_entre(a, b)`, para que las consultas que filtran digan todas lo mismo en vez '
        + 'de repetir cinco veces un NOT IN que se olvida en el sexto sitio.',
  },

  // Grafos de conocimiento (fase 11) y todo lo que se apoya en ellos.
  { nombre: 'knowledge', montar: (app, db) => registerKnowledgeRoutes(app, db) },
  { nombre: 'uploads', montar: (app, db) => registerUploadRoutes(app, db) },
  { nombre: 'roadmap', montar: (app, db) => registerRoadmapRoutes(app, db) },
  { nombre: 'juego', montar: (app, db) => registerJuegoRoutes(app, db) },
  { nombre: 'navegador', montar: app => registerNavegadorRoutes(app) },
  { nombre: 'archivos', montar: (app, db) => registerArchivosRoutes(app, db) },
  // Estaba colgado de `publicar` porque `server.ts` no se podía tocar. Vuelve
  // aquí el mismo día que existe esta lista: un apaño que funciona es el que
  // se queda diez meses, y el peligro no es que falle, es que nadie recuerde
  // por qué está donde está.
  { nombre: 'herramientas', montar: (app, db) => registerHerramientasRoutes(app, db) },
  // Dominios propios. Lleva la ruta que Caddy consulta ANTES de emitir un
  // certificado, así que si este módulo no monta, nadie puede estrenar un
  // dominio nuevo — pero los que ya tienen certificado siguen funcionando.
  { nombre: 'dominios', montar: (app, db) => registerDominiosRoutes(app, db) },
  { nombre: 'buscador', montar: (app, db) => registerBuscadorRoutes(app, db) },
  { nombre: 'republicar', montar: (app, db) => registrarRepublicar(app, db) },
  { nombre: 'fuente', montar: (app, db) => registrarFuente(app, db) },
  { nombre: 'temas', montar: (app, db) => registrarTemas(app, db) },
  // Va DESPUÉS de `temas`: lee el árbol que aquel crea. Sus rutas cuelgan de
  // `/api/agregador/…` y no de `/api/temas/…` a propósito — `/api/temas/:objetivo`
  // es un comodín de un segmento y cualquier ruta nueva ahí se le puede colar.
  { nombre: 'agregador', montar: (app, db) => registrarAgregador(app, db) },
  { nombre: 'archivo', montar: (app, db) => registerArchivoRoutes(app, db) },
  { nombre: 'incidencias', montar: (app, db) => registerIncidenciasRoutes(app, db) },
  { nombre: 'bd', montar: (app, db) => registerBdRoutes(app, db) },
  { nombre: 'publicar', montar: (app, db) => registerPublicarRoutes(app, db) },
  { nombre: 'navegadorRemoto', montar: app => registerNavegadorRemotoRoutes(app) },
  { nombre: 'finanzas', montar: (app, db) => registerFinanzasRoutes(app, db) },
  { nombre: 'youtube', montar: (app, db) => registerYoutubeRoutes(app, db) },
  { nombre: 'spotify', montar: (app, db) => registerSpotifyRoutes(app, db) },

  {
    nombre: 'ai',
    montar: (app, db) => registerAIRoutes(app, db),
    nota: 'Se enruta siempre. Sin ANTHROPIC_API_KEY responde 503 con un mensaje claro, '
        + 'en vez de fallar de forma opaca.',
  },

  // Economía y mercado (fase 6): Connect, checkout embebido, apoyo a creadores
  // y reembolsos. Convive con el flujo de socios que sigue en `server.ts`.
  { nombre: 'stripe', montar: (app, db) => registerStripeRoutes(app, db) },
  { nombre: 'puntos', montar: (app, db) => registerPuntosRoutes(app, db) },
  { nombre: 'gasto', montar: (app, db) => registerGastoRoutes(app, db) },
  { nombre: 'documentos', montar: (app, db) => registerDocumentosRoutes(app, db) },
  { nombre: 'menu', montar: (app, db) => registerMenuRoutes(app, db) },
  { nombre: 'mensajes', montar: (app, db) => registerMensajesRoutes(app, db) },
  { nombre: 'calendario', montar: (app, db) => registerCalendarioRoutes(app, db) },
  { nombre: 'personas', montar: (app, db) => registerPersonasRoutes(app, db) },
  { nombre: 'guardar', montar: (app, db) => registerGuardarRoutes(app, db) },
  { nombre: 'veracidad', montar: (app, db) => registerVeracidadRoutes(app, db) },
  {
    nombre: 'agenda',
    montar: (app, db) => registerAgendaRoutes(app, db),
    nota: 'Rutas concretas bajo `/api/agenda/…`, nunca un comodín: un catch-all por '
        + 'delante de `telecom` apagaría los teléfonos de toda la plataforma, porque '
        + '`/api/telecom/conexion` es una respuesta que no termina nunca. '
        + 'Una de sus rutas NO mira la sesión a propósito: por ahí entra el Atajo del '
        + 'iPhone, que no tiene navegador y se identifica con su propia llave.',
  },
  {
    nombre: 'textos',
    montar: (app, db) => registerTextosRoutes(app, db),
    nota: 'Los textos de las páginas de información, editables por un administrador. '
        + 'Comprueba el nivel, así que necesita `req.user`: después de la autenticación.',
  },

  {
    nombre: 'telecom',
    montar: (app, db) => registerTelecomRoutes(app, db),
    nota: 'Mensajes en vivo, llamadas y videollamadas. DESPUÉS de la autenticación: '
        + 'todas sus rutas empiezan por «¿quién eres?». Su conexión abierta (SSE) es una '
        + 'respuesta que no termina nunca, así que cualquier cosa que capture «/api» '
        + 'entero tiene que ir después de esta línea, no antes.',
  },
  {
    nombre: 'google',
    montar: (app, db) => registerGoogleRoutes(app, db),
    nota: 'Una de sus rutas, `/api/google/vuelta`, la abre Google en el navegador de la '
        + 'persona y NO lleva sesión: se identifica con un pase firmado que viaja en el '
        + '`state`. Es a propósito y está explicado en el módulo.',
  },
  {
    nombre: 'misVideos',
    montar: (app, db) => registerMisVideosRoutes(app, db),
    nota: 'NO es `youtube`, que ya está en esta lista y es la pantalla de cine de la '
        + 'aldea. Aquella recomienda lo que no has visto; esta enseña lo que ya has '
        + 'guardado. Depende de `google` para la llave, pero no del orden: se la pide '
        + 'en cada petición, no al montarse.',
  },
  {
    nombre: 'contactosGoogle',
    montar: (app, db) => registerContactosGoogleRoutes(app, db),
    nota: 'La cuarta puerta de la agenda, con el .vcf, el Atajo del iPhone y el selector '
        + 'del navegador. Las cuatro pasan por `importarContactosDe()`: son las reglas de '
        + 'no duplicar y no pisar nombres, y no puede haber dos copias.',
  },
  {
    nombre: 'calendarioGoogle',
    montar: (app, db) => registerCalendarioGoogleRoutes(app, db),
    nota: 'El único de los tres de Google que NO guarda copia: un calendario cambia '
        + 'mientras lo miras, y una cita vieja te presenta a la hora que no es. El '
        + 'porqué está escrito en la cabecera del módulo.',
  },
];

/**
 * Monta todos, en el orden de la lista.
 *
 * Si uno revienta al montarse, **se dice cuál y se para**. Un servidor que
 * arranca con la mitad de la API en pie es peor que uno que no arranca: la
 * mitad que falta se manifiesta como 404 sueltos, y un 404 no dice que el
 * módulo no llegó a montarse.
 */
export function montarModulos(app: Express, db: any) {
  for (const m of MODULOS) {
    try {
      m.montar(app, db);
    } catch (e: any) {
      console.error(`[modulos] «${m.nombre}» no se ha podido montar:`, e?.message || e);
      throw e;
    }
  }
}

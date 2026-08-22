import { Link } from 'react-router-dom';
import { Building2, Cookie, Database, EyeOff, Server, Share2, ShieldCheck, UserX } from 'lucide-react';

// ============================================================================
// PRIVACIDAD · PÁGINA PÚBLICA (2026-08-22, agente de APP/UX)
// ============================================================================
// LA EXIGEN LAS DOS TIENDAS, y no como recomendación: App Store Connect no deja
// enviar la aplicación sin una dirección de política de privacidad que
// responda, y la ficha de Google Play tampoco. Además, el formulario de
// **Seguridad de los datos** de Play y las **etiquetas de privacidad** de Apple
// son declaraciones: lo que digan tiene que coincidir con lo que la aplicación
// hace de verdad, o es motivo de retirada.
//
// POR ESO ESTE TEXTO SE ESCRIBIÓ MIDIENDO, NO RECORDANDO. Cada afirmación de
// abajo sale de leer el esquema de la base de datos y el código:
//
//   · Las columnas de `users`, `sessions` e `intentos_fallidos`.
//   · Un `grep` de rastreadores conocidos en todo `src/` y en `index.html`:
//     cero resultados. No hay Analytics, ni píxel, ni Sentry, ni nada.
//   · Las cookies que pone el servidor: una, `rh_session`.
//   · Los dominios de terceros a los que llama la aplicación.
//
// Y ESE ÚLTIMO PUNTO CAMBIÓ EL CÓDIGO ANTES QUE EL TEXTO. Al medirlo
// aparecieron dos cosas que nadie había decidido: cuatro vídeos incrustados
// desde `youtube.com` (que sí deja cookie) mientras otros cuatro ya usaban
// `youtube-nocookie.com`, y un fondo decorativo pedido a
// `transparenttextures.com` en cada visita a un objetivo o a un reto. Las dos se
// arreglaron primero. **Una política de privacidad no describe la aplicación
// que te gustaría tener; si al escribirla encuentras algo que no quieres tener
// que declarar, lo que se cambia es la aplicación.**
//
// LO QUE ESTA PÁGINA NO PUEDE DECIR TODAVÍA está marcado en pantalla, no
// escondido: quién es el responsable del tratamiento (la sociedad, su domicilio
// y su contacto), la base jurídica de cada tratamiento y los plazos de
// conservación más allá de lo que hace el código. Eso lo decide Eugenio, y
// inventarlo sería peor que dejarlo en blanco: una política que afirma cosas
// falsas sobre quién responde de tus datos es exactamente lo que no debe
// existir.

const GUARDAMOS = [
  { que: 'Tu cuenta', detalle: 'Correo, nombre, nombre público, foto y portada, biografía, sitio web, redes, especialidades y, si lo pones, tu teléfono y tu ubicación. Todo salvo el correo es opcional.' },
  { que: 'Cómo entras', detalle: 'Una contraseña cifrada, o tu identificador de Google si entras con Google. Nunca guardamos tu contraseña en claro ni la de Google.' },
  { que: 'Lo que publicas', detalle: 'Publicaciones, comentarios, lienzos, proyectos, tareas, mapas y las fotos o vídeos que subes. Es el contenido de la plataforma: para eso está.' },
  { que: 'Tus mensajes y llamadas', detalle: 'Los mensajes directos se guardan para poder enseñártelos. De las llamadas se guarda que existieron y cuánto duraron, no lo que dijisteis.' },
  { que: 'Tus sesiones', detalle: 'Por cada aparato desde el que entras: la fecha, tu IP y el navegador. Sirve para mantenerte dentro y para que puedas cerrar sesiones que no reconozcas.' },
  { que: 'Intentos fallidos de entrar', detalle: 'La IP desde la que se falla al entrar, para frenar a quien prueba contraseñas a lo bruto. Se guarda poco tiempo y no se cruza con nada.' },
  { que: 'Lo que le preguntas a la IA', detalle: 'Las conversaciones con el asistente se guardan en tu cuenta para que puedas volver a ellas.' },
];

const TERCEROS = [
  { quien: 'Anthropic', que: 'El texto que le escribes al asistente', porque: 'Es quien hace funcionar la IA. Sin enviarle tu pregunta no hay respuesta.' },
  { quien: 'Google', que: 'Solo si entras con Google', porque: 'Para comprobar que eres tú. Si entras con correo y contraseña, Google no se entera de nada.' },
  { quien: 'Stripe', que: 'Solo si pagas o donas', porque: 'Procesa el pago. Los datos de tu tarjeta van a Stripe, no a nosotros: aquí no se guarda ningún número de tarjeta.' },
  { quien: 'YouTube y Vimeo', que: 'Tu IP, al ver un vídeo incrustado', porque: 'Es el reproductor. YouTube se carga desde su dominio sin cookies, que es la versión que no te sigue.' },
  { quien: 'Spotify', que: 'Solo si conectas tu cuenta a mano', porque: 'Para enseñarte tu música. Si no la conectas, no existe.' },
  { quien: 'Hetzner', que: 'Todo, como servidor', porque: 'Es donde vive la plataforma: la base de datos y los ficheros que subes están en sus máquinas, en Alemania.' },
  { quien: 'Cloudflare', que: 'Tu IP y tu petición, en cada visita', porque: 'Está delante de la web: acelera la carga y para ataques. Toda visita pasa por ahí antes de llegar a nuestro servidor.' },
  { quien: 'Un segundo proveedor de almacenamiento', que: 'La copia de seguridad diaria de la base de datos', porque: 'Guardar la copia en el mismo sitio que el original no protege de perder el servidor. Por eso sale fuera.' },
];

export default function Privacidad() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-8 pb-[calc(2rem+var(--hueco-muelle,0px))]">
      <header className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Privacidad</p>
        <h1 className="text-3xl font-black text-slate-900 mt-1">Qué hacemos con tus datos</h1>
        <p className="mt-3 text-slate-600 leading-relaxed">
          Escrito leyendo el código, no de memoria. Si algo de esta página no
          coincide con lo que hace la aplicación, es un fallo nuestro y queremos
          saberlo.
        </p>
      </header>

      {/* LO MÁS IMPORTANTE, PRIMERO Y SIN RODEOS. Una política que empieza por
          «la presente política tiene por objeto» enseña a no leerla. */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 mb-5">
        <h2 className="text-sm font-black text-emerald-900 mb-2 inline-flex items-center gap-2">
          <EyeOff className="w-4 h-4" /> Lo primero: no te seguimos
        </h2>
        <ul className="space-y-1.5 text-sm text-emerald-900/80 leading-relaxed">
          <li>· <strong>No hay publicidad</strong> en la plataforma, ni la habrá con tus datos.</li>
          <li>· <strong>No vendemos ni cedemos tus datos</strong> a nadie.</li>
          <li>· <strong>No hay analítica ni rastreadores</strong>: ni Google Analytics, ni píxeles, ni herramientas que midan lo que haces. Ninguno.</li>
          <li>· <strong>Una sola cookie</strong>, la que te mantiene dentro. Por eso no hay ventana de cookies: no hay nada que aceptar.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
        <h2 className="text-sm font-black text-slate-900 mb-3 inline-flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-400" /> Qué guardamos
        </h2>
        <dl className="space-y-3">
          {GUARDAMOS.map(g => (
            <div key={g.que}>
              <dt className="text-sm font-bold text-slate-800">{g.que}</dt>
              <dd className="text-sm text-slate-600 leading-relaxed">{g.detalle}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
        <h2 className="text-sm font-black text-slate-900 mb-1 inline-flex items-center gap-2">
          <Share2 className="w-4 h-4 text-slate-400" /> Con quién se comparte, y por qué
        </h2>
        <p className="text-sm text-slate-500 mb-3 leading-relaxed">
          Esta lista está entera. Si una empresa no está aquí, no recibe nada tuyo.
        </p>
        <dl className="space-y-3">
          {TERCEROS.map(t => (
            <div key={t.quien}>
              <dt className="text-sm font-bold text-slate-800">
                {t.quien} <span className="font-medium text-slate-500">— {t.que}</span>
              </dt>
              <dd className="text-sm text-slate-600 leading-relaxed">{t.porque}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
        <h2 className="text-sm font-black text-slate-900 mb-3 inline-flex items-center gap-2">
          <Cookie className="w-4 h-4 text-slate-400" /> Cookies
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Una: <code className="px-1 py-0.5 rounded bg-slate-100 text-xs">rh_session</code>.
          Es la que recuerda que has entrado. Si la borras, se cierra tu sesión y
          no pasa nada más. No hay cookies de publicidad ni de medición, y por eso
          esta web no te enseña un cartel pidiéndote permiso: la ley solo lo exige
          para las que no son imprescindibles, y aquí no hay ninguna.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
        <h2 className="text-sm font-black text-slate-900 mb-3 inline-flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400" /> Lo que puedes hacer
        </h2>
        <ul className="space-y-2 text-sm text-slate-600 leading-relaxed">
          <li>· <strong>Ver y cambiar</strong> lo tuyo, desde tu perfil y desde <Link to="/configuracion" className="font-bold text-emerald-700 hover:underline">Configuración</Link>.</li>
          <li>· <strong>Borrar tu cuenta</strong> cuando quieras. Cómo funciona y qué pasa con lo que publicaste está explicado en <Link to="/borrar-cuenta" className="font-bold text-emerald-700 hover:underline">Borrar tu cuenta</Link>.</li>
          <li>· <strong>Bloquear a alguien</strong>, y deshacerlo, desde Configuración.</li>
          <li>· <strong>Llevarte tus datos</strong> o pedir que los corrijamos: escríbenos y te contestamos.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
        <h2 className="text-sm font-black text-slate-900 mb-3 inline-flex items-center gap-2">
          <UserX className="w-4 h-4 text-slate-400" /> Cuánto tiempo se guarda
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Mientras tengas la cuenta. Cuando pides borrarla, entra en una papelera
          de <strong>15 días</strong> —por si te arrepientes o por si no fuiste
          tú— y después se borran tus datos personales de verdad. Lo que
          publicaste en abierto no desaparece, se queda <strong>sin tu nombre</strong>:
          está contado entero en <Link to="/borrar-cuenta" className="font-bold text-emerald-700 hover:underline">Borrar tu cuenta</Link>.
        </p>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Hacemos copias de seguridad diarias fuera del servidor. Una copia puede
          conservar durante un tiempo datos que ya has borrado aquí: es lo que
          permite recuperar la plataforma si algo se rompe, y las copias antiguas
          se van sustituyendo solas.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
        <h2 className="text-sm font-black text-slate-900 mb-3 inline-flex items-center gap-2">
          <Server className="w-4 h-4 text-slate-400" /> Dónde está
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Tus datos —la base de datos y los ficheros que subes— están en
          servidores de <strong>Hetzner en Alemania</strong>, dentro de la Unión
          Europea.
        </p>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Delante hay <strong>Cloudflare</strong>, que acelera la carga y para
          ataques; tu visita pasa por el punto suyo más cercano a ti, que puede
          estar fuera de la Unión Europea. Y algunos de los servicios de la lista
          de arriba —Anthropic, Google, Stripe— también tratan datos fuera, con
          las garantías que exige la normativa europea.
        </p>
      </section>

      {/*
        QUIÉN RESPONDE. Estaba en blanco y en ámbar hasta que Eugenio dio los
        datos (2026-08-23). No es un trámite: el RGPD exige que el responsable
        del tratamiento sea identificable y localizable, y las dos tiendas
        enseñan esta identidad en la ficha del producto.

        El dato vive además en `memory/14_SOCIEDAD.md`, porque hasta ese día no
        estaba escrito en ningún sitio del proyecto — ni en la memoria, ni en la
        documentación, ni en el código — y hacen falta en cuatro sitios más.
      */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
        <h2 className="text-sm font-black text-slate-900 mb-3 inline-flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" /> Quién responde de tus datos
        </h2>
        <address className="not-italic text-sm text-slate-600 leading-relaxed">
          <strong className="text-slate-800">Light for Humanity</strong><br />
          CIF G88040563<br />
          Calle Bahía de Almería 30, Bajo C<br />
          28042 Madrid, España
        </address>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          Para ver, corregir, llevarte o borrar tus datos puedes escribir a esa
          dirección, o decírnoslo desde{' '}
          <Link to="/hormiguero" className="font-bold text-emerald-700 hover:underline">Feedback</Link>,
          que llega a una persona y es bastante más rápido.
        </p>
      </section>

      <p className="mt-6 text-xs text-slate-400">Última revisión: 23 de agosto de 2026.</p>
    </div>
  );
}

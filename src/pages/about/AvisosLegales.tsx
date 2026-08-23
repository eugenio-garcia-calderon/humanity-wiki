import { Link, useSearchParams } from 'react-router-dom';
import { Scale, FileText, Lock, AlertTriangle, ArrowLeft } from 'lucide-react';
import Privacidad from '../Privacidad';

// ============================================================================
// AVISOS LEGALES (2026-08-23, Eugenio: «haz tú mismo los términos y
// condiciones, y colócalo donde tenga sentido en el menú, quizás en un apartado
// que sea avisos legales, y le pones ahí la política de privacidad también»)
// ============================================================================
// Un solo sitio para lo que la ley pide que exista y que la gente casi nunca
// lee: los términos de uso y la política de privacidad. Dos vistas de la misma
// página (`?vista=terminos`, `?vista=privacidad`), el patrón de la casa para
// «dos maneras de mirar el mismo sitio». La privacidad NO se reescribe: se
// enseña la misma página que ya existía (y que las tiendas de aplicaciones
// citan por su dirección, `/privacidad`, que sigue viva).
//
// LOS TÉRMINOS LOS HA REDACTADO EL EQUIPO, NO UN ABOGADO, y lo dice arriba del
// todo. Cada regla de abajo describe lo que la plataforma HACE HOY — lo que el
// código impone, medido — más las decisiones de producto que Eugenio ya tomó
// (puntos transferibles, caducidad a 10 años, inactividad de 24 meses,
// comisión 5 % / 2,5 %). Lo que solo él o un abogado pueden rellenar va
// marcado [PENDIENTE]: la entidad que presta el servicio y el contacto. Es la
// misma regla que en la política de privacidad: mejor un hueco visible que
// una afirmación falsa sobre quién responde.
// ============================================================================

const VERSION = 'v1.0 · 23 de agosto de 2026';

const TERMINOS: { titulo: string; parrafos: string[] }[] = [
  {
    titulo: '1 · Quién presta el servicio y qué aceptas',
    parrafos: [
      'Humanity.wiki es una plataforma para reunir, organizar y compartir conocimiento, con una red de personas, un mercado y un sistema de puntos. La presta [PENDIENTE: la persona jurídica titular — la fundación u otra entidad —, con su domicilio y su identificación; lo decide el emisor].',
      'Al crear una cuenta o usar la plataforma aceptas estos términos y la política de privacidad. Si no estás de acuerdo, no uses el servicio. Para tener cuenta debes tener al menos 14 años; para vender en el mercado o cobrar, la mayoría de edad.',
    ],
  },
  {
    titulo: '2 · Tu cuenta',
    parrafos: [
      'Una persona, una cuenta. Eres responsable de lo que se haga con la tuya y de mantener tu contraseña a salvo; puedes ver y cerrar tus sesiones abiertas desde Configuración. Si crees que alguien ha entrado en tu cuenta, cambia la contraseña y avísanos.',
      'Las cuentas tienen niveles (usuario, verificado, generador de conocimiento, administrador) que abren o cierran herramientas. La verificación y los niveles los concede la plataforma y se pueden retirar si se usan mal.',
      'Puedes borrar tu cuenta en cualquier momento desde «Borrar tu cuenta». Queda 15 días en una papelera, por si te arrepientes; después se borra de forma definitiva según se explica en la política de privacidad. Lo que hayas publicado al común puede quedarse como contenido sin autor identificable, porque el común no se rompe porque una persona se vaya.',
    ],
  },
  {
    titulo: '3 · Lo que publicas',
    parrafos: [
      'Lo que publicas sigue siendo tuyo. Al publicarlo nos das el permiso necesario para guardarlo, mostrarlo y distribuirlo dentro de la plataforma (y en tu subdominio o tu tienda, si lo compartes allí), sin exclusiva y sin pagarte por ello. Lo que marques como público al común se publica bajo la licencia que la plataforma indique en el momento de publicar, para que cualquiera pueda reutilizarlo en las condiciones que ahí se digan.',
      'Solo publica lo que tengas derecho a publicar: nada que infrinja derechos de terceros, nada ilegal, nada que suplante a otra persona, ni spam ni contenido que dañe a menores. Si alguien denuncia un contenido o lo detectamos, podemos retirarlo o archivarlo, y te lo diremos.',
      'Tú decides quién ve cada cosa (privado, compartido, público). Lo público lo puede ver cualquiera, también sin cuenta, y los buscadores pueden indexarlo si así lo marcas.',
    ],
  },
  {
    titulo: '4 · Convivencia',
    parrafos: [
      'Puedes bloquear a una persona: deja de ver lo tuyo y tú lo suyo, y no se le avisa. Puedes denunciar contenido y cuentas. Nos reservamos suspender o cerrar cuentas que incumplan estos términos, con aviso salvo que la gravedad aconseje no darlo, y registrando el motivo.',
      'La plataforma tiene un asistente de inteligencia artificial. Lo que produce es una ayuda, no una verdad: puede equivocarse, y es responsabilidad de quien lo usa revisar lo que publica con su ayuda. Las conversaciones con el asistente se guardan en tu cuenta; el coste de usarlo se mide y, cuando se cobre, se cobrará en puntos y se dirá antes.',
    ],
  },
  {
    titulo: '5 · El mercado: vender y comprar',
    parrafos: [
      'Quien vende es responsable de lo que vende: de que exista, de describirlo con verdad, de su precio, de su envío, de su garantía y de atender devoluciones según lo que haya publicado en la ficha. La plataforma pone el escaparate, el carrito, el cobro y el seguimiento del pedido; no es parte del contrato de compraventa entre vendedor y comprador, salvo en lo que vende ella misma (planes y puntos).',
      'Los pagos con tarjeta los procesa Stripe; no vemos ni guardamos tu tarjeta. Por cada venta cobrada en euros la plataforma retiene una comisión del 5 % del precio de los productos. Cada pedido tiene un código; con él y el correo de compra (o tu sesión, si compraste con cuenta) puedes consultar su estado en cualquier momento. Un producto digital se entrega como descarga desde el pedido, solo a quien lo pagó.',
      'Las devoluciones y reembolsos de ventas en euros las gestiona el vendedor a través de la plataforma, según la política que haya publicado y la ley aplicable. Nada de esto limita los derechos que tienes como consumidor.',
      'Los vendedores pueden crear cupones de descuento: el descuento lo asume el vendedor, y la comisión se calcula sobre lo que realmente se cobra.',
    ],
  },
  {
    titulo: '6 · Los puntos',
    parrafos: [
      'Los puntos son un crédito de uso dentro de la plataforma: sirven para pagar servicios de la plataforma y para comprar en el mercado a los vendedores que los aceptan. No son dinero, no son una inversión, no dan intereses ni rendimiento y no se cambian de vuelta a euros. Todo lo que describe la página de Tokenomics forma parte de estos términos.',
      'Cómo se obtienen: un regalo al crear la cuenta, céntimos de punto cuando otras personas ven tus publicaciones públicas, comprándolos a la plataforma, y, cuando esté activo, el reparto mensual del bote de comisiones. Cómo circulan: puedes enviarlos a otras personas de la plataforma, con un tope diario, y pagar con ellos en el mercado; al vendedor le llegan sus puntos menos una comisión de la plataforma del 2,5 % (la mitad que en euros). Cada movimiento queda anotado en un libro que no se edita: una corrección es siempre un apunte contrario.',
      'Caducidad y cuentas dormidas: los puntos caducan a los diez años de obtenerse, y una cuenta sin actividad durante veinticuatro meses pierde su saldo. Antes de que cualquiera de las dos cosas ocurra te avisaremos por los medios de la plataforma, con tiempo para usarlos.',
      'Devoluciones en puntos: si un vendedor devuelve una compra pagada con puntos, los puntos vuelven a tu cuenta íntegros. Si un movimiento fuera erróneo, se corrige con el apunte contrario y se te explica.',
      'Los precios en puntos de los servicios de la plataforma se publican y pueden cambiar; lo que un punto compra no está garantizado. Los puntos no se transfieren fuera de la plataforma ni se negocian en ningún mercado externo.',
    ],
  },
  {
    titulo: '7 · Opiniones',
    parrafos: [
      'Puedes dejar una opinión con estrellas y texto sobre un producto; una por persona y producto, y el vendedor no puede opinar sobre lo suyo. Las opiniones de quien ha comprado llevan la marca «compra verificada», que pone el servidor y no se puede pedir. Una opinión falsa, pagada o que insulte se puede retirar.',
    ],
  },
  {
    titulo: '8 · La plataforma y sus cambios',
    parrafos: [
      'El software, la marca y el diseño de Humanity.wiki son de su titular; el conocimiento que la gente publica, de quien lo publica, con las licencias dichas arriba. La plataforma se ofrece tal cual, con el esfuerzo razonable por mantenerla disponible y segura, pero sin garantía de disponibilidad ininterrumpida ni de ausencia de errores. Nuestra responsabilidad se limita a lo que la ley no permita limitar; en ningún caso respondemos de lo que un vendedor venda o una persona publique.',
      'Podemos cambiar estos términos. Cuando el cambio importe, lo anunciaremos dentro de la plataforma con antelación y aquí aparecerá la nueva versión con su fecha; seguir usando la plataforma después es aceptarla. Las versiones anteriores quedan archivadas.',
      'Estos términos se rigen por la ley española y la europea que corresponda. Si eres consumidor conservas todos los derechos que esa ley te da, incluidos los tribunales de tu domicilio. Contacto para cualquier cuestión sobre estos términos: [PENDIENTE: correo de contacto del titular].',
    ],
  },
];

function Terminos() {
  return (
    <div className="space-y-8">
      <div>
        <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-3">
          <FileText className="w-3.5 h-3.5" /> Términos y condiciones · {VERSION}
        </p>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-display mb-4">Las reglas de usar Humanity.wiki</h1>
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 leading-relaxed">
            <strong>Redactados por el equipo de la plataforma, no por un abogado.</strong> Describen lo que
            la plataforma hace hoy y las decisiones ya tomadas; los huecos marcados [PENDIENTE]
            esperan al titular del servicio. Están pendientes de revisión legal y se actualizarán
            aquí, con fecha, cuando cambien.
          </p>
        </div>
      </div>
      {TERMINOS.map(({ titulo, parrafos }) => (
        <section key={titulo}>
          <h2 className="text-xl font-bold text-slate-900 font-display mb-3">{titulo}</h2>
          <div className="space-y-3">
            {parrafos.map((p, i) => (
              <p key={i} className={p.includes('[PENDIENTE') ? 'text-sm leading-relaxed text-slate-600 border-l-2 border-amber-300 pl-3' : 'text-sm leading-relaxed text-slate-600'}>{p}</p>
            ))}
          </div>
        </section>
      ))}
      <p className="text-xs text-slate-400 pt-4 border-t border-slate-100">
        Ver también: <Link to="/avisos-legales?vista=privacidad" className="underline">política de privacidad</Link> ·{' '}
        <Link to="/tokenomics" className="underline">tokenomics: el punto</Link> ·{' '}
        <Link to="/borrar-cuenta" className="underline">borrar tu cuenta</Link>
      </p>
    </div>
  );
}

export default function AvisosLegales() {
  const [params] = useSearchParams();
  const vista = params.get('vista');

  if (vista === 'privacidad') {
    return (
      <div>
        <div className="max-w-2xl mx-auto px-5 pt-6">
          <Link to="/avisos-legales" className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Avisos legales
          </Link>
        </div>
        <Privacidad />
      </div>
    );
  }
  if (vista === 'terminos') {
    return (
      <div className="max-w-3xl mx-auto px-5 py-8 pb-16">
        <Link to="/avisos-legales" className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors mb-5">
          <ArrowLeft className="w-4 h-4" /> Avisos legales
        </Link>
        <Terminos />
      </div>
    );
  }
  return (
    <div className="max-w-3xl mx-auto px-5 py-8 pb-16">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-3">
        <Scale className="w-3.5 h-3.5" /> Avisos legales
      </p>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-display mb-2">Lo que la ley pide que esté escrito</h1>
      <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mb-6">
        Las reglas de usar la plataforma y qué hacemos con tus datos. Dos documentos, en
        lenguaje llano, con fecha y con los huecos que aún faltan a la vista.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/avisos-legales?vista=terminos" className="group block p-5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-lg transition-all duration-300">
          <h3 className="text-sm font-bold text-slate-900 mb-1 inline-flex items-center gap-2 group-hover:text-emerald-600 transition-colors"><FileText className="w-4 h-4" /> Términos y condiciones</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Cuenta, publicaciones, convivencia, mercado, puntos, opiniones y cambios. {VERSION}.</p>
        </Link>
        <Link to="/avisos-legales?vista=privacidad" className="group block p-5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-lg transition-all duration-300">
          <h3 className="text-sm font-bold text-slate-900 mb-1 inline-flex items-center gap-2 group-hover:text-emerald-600 transition-colors"><Lock className="w-4 h-4" /> Política de privacidad</h3>
          <p className="text-xs text-slate-500 leading-relaxed">Qué guardamos, con quién se comparte, cuánto tiempo y cómo borrarlo. Medido sobre el código, no recordado.</p>
        </Link>
      </div>
    </div>
  );
}

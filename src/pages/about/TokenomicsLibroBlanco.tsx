import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, AlertTriangle } from 'lucide-react';

// ============================================================================
// LIBRO BLANCO DEL PUNTO — BORRADOR (2026-08-22, Eugenio: «ponte a crear el
// libro blanco dentro de la página de tokenomics para que lo revisemos»)
// ============================================================================
// Sigue la estructura del Anexo I de MiCA (información del emisor, del
// proyecto, derechos, tecnología, riesgos, sostenibilidad) TRADUCIDA a
// lenguaje llano, porque su primer lector es Eugenio y sus siguientes
// lectores son usuarios, no reguladores. Cuando llegue la revisión legal, el
// abogado partirá de esto y lo formalizará; escribirlo ya en jerga sería
// hacer dos veces el trabajo del abogado y ninguna el nuestro.
//
// ES UN BORRADOR Y LO DICE EN GRANDE. La página vive detrás de /tokenomics
// (que a su vez espera la firma de Eugenio) y cada afirmación sobre el
// futuro usa el condicional o está marcada como pendiente. Los huecos que
// solo Eugenio o un abogado pueden rellenar están señalados con [PENDIENTE].
// ============================================================================

const SECCIONES: { titulo: string; parrafos: string[] }[] = [
  {
    titulo: '1 · Quién emite',
    parrafos: [
      'El punto lo emite Light for Humanity (CIF G88040563, Calle Bahía de Almería 30, Bajo C, 28042 Madrid, España), entidad sin ánimo de lucro titular de la plataforma Humanity.wiki. Tiene personalidad jurídica propia, que es lo que MiCA exige al emisor de una oferta pública.',
      'El emisor es también el único lugar donde el punto se acepta como pago. No hay, y no se promete, ningún mercado externo.',
    ],
  },
  {
    titulo: '2 · Qué es el punto',
    parrafos: [
      'Un crédito de uso de los servicios de la plataforma: almacenamiento en la nube, procesamiento, modelos avanzados de inteligencia artificial y descuentos en el mercado interno. Lo llamamos «token de conocimiento» porque los servicios que compra existen para crear y compartir conocimiento.',
      'Hoy es un saldo interno en la base de datos de la plataforma, con un libro de movimientos donde cada entrada y salida queda anotada con su motivo. No existe ningún token emitido en ninguna cadena de bloques.',
      'El punto está pensado como token de utilidad en el sentido de MiCA: da acceso a servicios y no representa dinero, inversión ni participación en nada.',
    ],
  },
  {
    titulo: '3 · Qué derechos da, y cuáles no',
    parrafos: [
      'Da derecho a usar los servicios de la plataforma según los precios publicados en cada momento.',
      'No da derecho a: reembolso en euros a un valor garantizado, intereses ni rendimiento de ningún tipo, participación en beneficios o en decisiones, ni propiedad sobre ningún activo — tampoco sobre el hardware que produce los servicios.',
      'El respaldo del punto es una promesa de uso: detrás de los servicios hay capacidad real de máquinas (almacenamiento y cómputo), y el punto compra esa capacidad a los precios publicados. Es un compromiso de servicio, no una garantía de valor monetario.',
    ],
  },
  {
    titulo: '4 · Cómo se obtiene y cómo circula',
    parrafos: [
      'Se obtiene al crear la cuenta (regalo de bienvenida), cuando otras personas ven tus publicaciones públicas, comprándolo dentro de la plataforma, y con el reparto mensual entre personas verificadas: al principio un bote fijo de 1.000 puntos al mes (decisión del emisor, 23 de agosto de 2026), más adelante la mitad de la comisión del mercado; la mitad del bote se reparte por igual y la otra mitad según el éxito de lo que cada persona aporta. El precio de venta se publica en cada momento y puede cambiar; ninguna compra pasada garantiza el precio de las siguientes. La unidad de referencia de la cesta es una tarea simple con el modelo de IA más barato: 1 punto.',
      'Transferencias entre personas (activadas el 23 de agosto de 2026 como piloto, por decisión del emisor): los puntos pueden enviarse entre cuentas de la plataforma, con un tope diario por persona y quedando cada envío anotado en el libro de movimientos de las dos cuentas. También pueden pagar compras en el mercado cuando el vendedor acepta puntos; en ese caso la plataforma retiene una comisión en puntos (2,5 %, la mitad de la comisión de las ventas en euros) que queda anotada en su propia cuenta del libro. Fuera de la plataforma el punto no circula y nunca se canjea por euros.',
      'El abanico de productos y servicios que aceptan puntos durante el piloto es limitado y está publicado dentro de la plataforma. [PENDIENTE: la lista concreta del piloto la decide el emisor.]',
    ],
  },
  {
    titulo: '5 · Tecnología',
    parrafos: [
      'Hoy: base de datos de la plataforma, con libro de movimientos y salvaguardas de integridad (el saldo no puede quedar negativo, y saldo y libro se escriben juntos o no se escribe ninguno).',
      'Futuro condicionado: la anotación del punto en una cadena de bloques solo se plantearía cuando al menos tres instituciones independientes operasen un nodo, y con la regla europea de protección de datos por delante — en una cadena nunca viajarían datos personales, ni cifrados ni en forma de huella; solo anotaciones de capacidad.',
    ],
  },
  {
    titulo: '6 · Riesgos que quien usa puntos debe conocer',
    parrafos: [
      'Riesgo de servicio: los precios en puntos de los servicios pueden cambiar, y con ellos lo que un punto compra. El punto no tiene un valor garantizado.',
      'Riesgo de plataforma: si la plataforma cesara su actividad, los puntos perderían su utilidad. [PENDIENTE: la política de cese ordenado — qué pasa con los saldos si la plataforma cierra — debe definirse antes de cualquier oferta pública.]',
      'Riesgo regulatorio: el marco de los criptoactivos y del dinero electrónico evoluciona; activar transferencias o la anotación en cadena puede exigir licencias o cambiar las condiciones. Cualquier cambio se anunciará en /tokenomics antes de aplicarse.',
      'Riesgo tecnológico: errores de software. El libro de movimientos y sus salvaguardas existen para que cualquier error sea visible y corregible, no invisible.',
      'Riesgo de cuenta: las salvaguardas del libro prueban que una transferencia no se alteró después de hacerse, no que quien la ordenó fuera el dueño de la cuenta. Proteger tu contraseña y tu sesión es parte del sistema; la firma del propio emisor sobre cada orden está en el plan de seguridad como fase posterior, antes de que las transferencias salgan del piloto.',
    ],
  },
  {
    titulo: '7 · Sostenibilidad',
    parrafos: [
      'Los servicios que el punto compra consumen energía en servidores. [PENDIENTE: MiCA exige publicar indicadores del impacto energético; los datos de consumo real de los servidores ya se recogen en el panel de gasto de la plataforma y se publicarán aquí en forma de indicador.]',
      'El diseño evita deliberadamente las tecnologías de consenso de alto consumo energético: si algún día hubiera cadena, sería de instituciones con nodos autorizados, no de minería.',
    ],
  },
  {
    titulo: '8 · Avisos',
    parrafos: [
      'Este documento es un BORRADOR de trabajo para revisión interna y no constituye una oferta de criptoactivos, una invitación a comprar ni asesoramiento legal o financiero.',
      'No ha sido revisado ni aprobado por ninguna autoridad. Antes de cualquier oferta pública deberá pasar revisión legal especializada y, si procede, notificarse conforme a MiCA.',
      'La versión que rige es siempre la publicada en esta página; las anteriores quedan archivadas con su fecha.',
    ],
  },
];

export default function TokenomicsLibroBlanco() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <div>
        <Link to="/tokenomics" className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors mb-5">
          <ArrowLeft className="w-4 h-4" /> Tokenomics
        </Link>
        <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-3">
          <FileText className="w-3.5 h-3.5" /> Libro blanco
        </p>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-display mb-4">El punto de Humanity.wiki, por escrito</h1>
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 leading-relaxed">
            <strong>Borrador en revisión.</strong> Este documento sigue la estructura que pide la
            normativa europea de criptoactivos (MiCA), traducida a lenguaje llano. No es una
            oferta ni ha sido revisado por ninguna autoridad; los huecos marcados
            [PENDIENTE] esperan decisión del emisor o revisión legal.
          </p>
        </div>
      </div>

      {SECCIONES.map(({ titulo, parrafos }) => (
        <section key={titulo}>
          <h2 className="text-xl font-bold text-slate-900 font-display mb-3">{titulo}</h2>
          <div className="space-y-3">
            {parrafos.map((p, i) => (
              <p key={i} className={
                p.includes('[PENDIENTE') || p.includes('BORRADOR')
                  ? 'text-sm leading-relaxed text-slate-600 border-l-2 border-amber-300 pl-3'
                  : 'text-sm leading-relaxed text-slate-600'
              }>{p}</p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

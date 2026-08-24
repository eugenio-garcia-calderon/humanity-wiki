// ============================================================================
// CONTRATO DE SERVICIO DE COBRO (2026-08-24, prog7)
// ============================================================================
// Eugenio (24-08): «crea tú esos contratos como si fueses mi asesor y avanza
// lo que puedas con la programación y la parte legal».
//
// Esto es el contrato que hace posible lo que pidió: que alguien pague de una
// sola vez un carrito con cosas de tres tiendas. Para eso la plataforma cobra
// el dinero de las tres y luego se lo entrega a cada una — y eso, en Europa,
// no se puede hacer sin un acuerdo escrito con cada tienda.
//
// LO REDACTA EL EQUIPO, NO UN ABOGADO, y lo dice arriba del todo. Está escrito
// para que un abogado lo revise deprisa: cada cláusula dice lo que el código
// HACE (comisión, plazos, devoluciones) y lo que aún no hace se marca.
//
// Las dos decisiones de Eugenio que aún no estaban tomadas se resuelven aquí
// del lado prudente y se dicen en voz alta:
//   · los contracargos los adelanta la plataforma (no hay alternativa: el
//     banco los cobra de quien cobró) pero los soporta finalmente la tienda,
//     compensándolos de sus liquidaciones;
//   · la liquidación es a los 14 días de la entrega, no al instante, que es
//     lo que protege a la plataforma del pedido que se devuelve.
// Cambiar cualquiera de las dos es cambiar una línea de aquí y una constante
// del servidor.
import { Link } from 'react-router-dom';
import { Scale, ArrowLeft, AlertTriangle } from 'lucide-react';

export const VERSION_COBRO = 'v1.0 · 24 de agosto de 2026';

export const CLAUSULAS: { titulo: string; parrafos: string[] }[] = [
  {
    titulo: '1 · Quiénes firman',
    parrafos: [
      'De una parte, **Light for Humanity** (CIF G88040563), con domicilio en Calle Bahía de Almería 30, Bajo C, 28042 Madrid (España), que presta la plataforma humanity.wiki y que en este contrato se llama «la plataforma».',
      'De otra, la persona o entidad titular de una tienda en humanity.wiki que acepta este contrato desde su panel de Comercio, y que en este contrato se llama «la tienda». La aceptación queda registrada con la fecha, la versión aceptada y los datos técnicos de la conexión, y la tienda puede descargarla o consultarla cuando quiera.',
      'Este contrato se añade a los términos y condiciones generales de la plataforma y a la política de privacidad, que siguen aplicándose en todo lo que aquí no se diga.',
    ],
  },
  {
    titulo: '2 · Qué se contrata: un servicio de cobro, no una venta',
    parrafos: [
      'La tienda encarga a la plataforma que **cobre en su nombre y por su cuenta** el precio de lo que la tienda vende a través de humanity.wiki, y que después le entregue ese dinero descontando la comisión pactada.',
      '**La venta sigue siendo de la tienda.** La plataforma no compra ni revende: no es la vendedora de los productos, no responde de su calidad, su legalidad ni su entrega, y no emite la factura de la venta. Quien vende es la tienda, y a ella le corresponde la relación con quien compra.',
      'La plataforma **no custodia el dinero por su cuenta**: el cobro y el movimiento de fondos los realiza un proveedor de servicios de pago autorizado (hoy, Stripe), a través de las cuentas que la propia tienda abre y verifica. La plataforma se limita a ordenar los cobros y las liquidaciones.',
      'Este encargo **no es exclusivo** ni obliga a la tienda a vender solo aquí.',
    ],
  },
  {
    titulo: '3 · Cómo se cobra',
    parrafos: [
      'Cuando alguien compra en una sola operación cosas de varias tiendas, el importe total se cobra de una vez a través de la plataforma y se reparte después entre las tiendas que corresponda. Cuando la compra es de una sola tienda, el cobro puede ir directamente a la cuenta de esa tienda.',
      'Quien compra ve, antes de pagar, que el cobro lo gestiona la plataforma en nombre de la tienda, y de qué tienda es cada cosa que lleva.',
      'La tienda autoriza a la plataforma a emitir los recibos del cobro y a facilitar a quien compra la información del pedido. Esto no sustituye a la factura de la venta, que corresponde a la tienda.',
    ],
  },
  {
    titulo: '4 · Comisión y factura del servicio',
    parrafos: [
      'La plataforma cobra por este servicio una comisión del **5 % del importe de los productos** (sin contar los gastos de envío) cuando el pago es en euros, y del **2,5 %** cuando el pago se hace con puntos de la plataforma. La comisión se descuenta de la liquidación.',
      'Las comisiones bancarias o de la pasarela de pago no van incluidas en esa comisión y se descuentan también de la liquidación cuando el proveedor de pago las repercuta.',
      'Por este servicio la plataforma **emite a la tienda una factura** con su IVA correspondiente. Esa factura es del servicio de cobro, distinta y separada de la factura de la venta, que sigue siendo cosa de la tienda.',
      'La plataforma puede cambiar la comisión avisando con **treinta días** de antelación. Si la tienda no está de acuerdo, puede terminar este contrato antes de que el cambio entre en vigor, sin penalización.',
    ],
  },
  {
    titulo: '5 · Cuándo cobra la tienda',
    parrafos: [
      'La plataforma liquida a la tienda lo cobrado **a los 14 días naturales desde que el pedido consta como entregado** (o desde la compra, si lo vendido es digital y se entrega en el acto). Este plazo existe porque durante ese tiempo puede haber devoluciones y reclamaciones, y liquidar antes obligaría a reclamar después dinero ya entregado.',
      'Si un pedido no llega a constar como entregado, la liquidación se hace a los **30 días** desde la compra, salvo que haya una devolución o una reclamación abierta.',
      'La tienda puede ver en su panel qué tiene cobrado, qué tiene pendiente de liquidar y cuándo le toca.',
      'La plataforma no paga intereses por el dinero durante ese periodo, ni lo utiliza para otra cosa que no sea liquidarlo.',
    ],
  },
  {
    titulo: '6 · Devoluciones, reclamaciones y contracargos',
    parrafos: [
      'Cuando quien compra tiene derecho a que le devuelvan el dinero —por desistimiento, por un producto defectuoso o por acuerdo con la tienda—, la devolución se hace con cargo a lo que la tienda tenga pendiente de liquidar y, si no alcanza, la tienda debe reintegrarlo a la plataforma.',
      'Si quien compra reclama el cargo a su banco (**contracargo**), el banco lo cobra de quien cobró: es decir, de la plataforma. La plataforma lo adelanta y después lo **compensa de las liquidaciones pendientes de la tienda**, o se lo reclama si no hubiera pendiente. La tienda se compromete a facilitar en 72 horas las pruebas de la entrega o del servicio para poder defender el cargo.',
      'La plataforma puede **retener cautelarmente** una liquidación cuando haya una reclamación abierta sobre ese pedido, un contracargo en curso, o indicios razonables de fraude. La retención se comunica a la tienda con su motivo y dura lo que dure la causa.',
      'Nada de esto cambia los derechos de quien compra frente a la tienda, que son los que la ley de consumo le reconoce.',
    ],
  },
  {
    titulo: '7 · Obligaciones de la tienda',
    parrafos: [
      'Vender solo lo que puede vender legalmente, describirlo con verdad, entregarlo en el plazo que anuncia y atender las devoluciones que la ley reconoce.',
      'Mantener sus datos fiscales al día en la plataforma y **emitir sus propias facturas** cuando corresponda. La plataforma no factura por ella.',
      'Declarar e ingresar los impuestos de sus ventas. La plataforma no retiene ni ingresa impuestos por cuenta de la tienda.',
      'Responder a quien compra en un plazo razonable y resolver las incidencias de sus pedidos.',
      'No usar el servicio de cobro para nada distinto de sus ventas en la plataforma.',
    ],
  },
  {
    titulo: '8 · Obligaciones de la plataforma',
    parrafos: [
      'Cobrar, llevar la cuenta de lo cobrado y liquidar en los plazos pactados, con el detalle a la vista de la tienda.',
      'Mantener el dinero pendiente de liquidar identificado como ajeno y no disponer de él para otros fines.',
      'Avisar a la tienda de cada pedido, de cada devolución pedida y de cada retención, y darle las herramientas para responder.',
      'Tratar los datos personales de quien compra conforme a la política de privacidad y a la normativa de protección de datos. Cuando la plataforma trate datos por cuenta de la tienda, lo hará solo para prestar este servicio y siguiendo sus instrucciones.',
    ],
  },
  {
    titulo: '9 · Duración y terminación',
    parrafos: [
      'El contrato dura mientras la tienda use el servicio de cobro. Cualquiera de las dos partes puede terminarlo avisando con **quince días**.',
      'La plataforma puede suspenderlo de inmediato si hay un incumplimiento grave, una obligación legal que lo imponga o un riesgo serio de fraude; lo comunicará con su motivo.',
      'Al terminar, la plataforma liquida lo que quede pendiente una vez transcurridos los plazos de devolución y reclamación de los pedidos ya hechos.',
    ],
  },
  {
    titulo: '10 · Responsabilidad',
    parrafos: [
      'La plataforma responde de prestar el servicio de cobro con la diligencia debida. No responde de la venta en sí, ni de los daños que se deriven de lo que la tienda venda o deje de entregar.',
      'La tienda mantiene indemne a la plataforma frente a reclamaciones de terceros que tengan su origen en sus productos, sus servicios o el incumplimiento de sus obligaciones.',
      'Ninguna de las dos partes responde de lo que no puede evitar (caídas de proveedores, incidentes de fuerza mayor), y ambas se comprometen a avisar y a colaborar para reducir el daño.',
    ],
  },
  {
    titulo: '11 · Ley aplicable y dónde se discute',
    parrafos: [
      'Este contrato se rige por la ley española. Para cualquier discrepancia, las partes se someten a los juzgados y tribunales de Madrid, salvo que una norma imperativa señale otros.',
      'Si alguna cláusula fuera nula, el resto sigue en pie.',
    ],
  },
];

/** Un párrafo con **negritas** en Markdown mínimo, sin traerse una librería. */
function Parrafo({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="text-[15px] leading-relaxed text-slate-700">
      {partes.map((t, i) => t.startsWith('**') && t.endsWith('**')
        ? <strong key={i} className="text-slate-900">{t.slice(2, -2)}</strong>
        : <span key={i}>{t}</span>)}
    </p>
  );
}

export default function ContratoCobro() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <Link to="/avisos-legales" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">
        <ArrowLeft className="w-3.5 h-3.5" /> Avisos legales
      </Link>
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 inline-flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5" /> Contrato de servicio de cobro · {VERSION_COBRO}
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Cómo cobra la plataforma en nombre de tu tienda
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Este contrato es el que permite que alguien pague de una sola vez un carrito con cosas de
          varias tiendas. Lo acepta cada tienda desde su panel de Comercio, y queda registrado con su fecha.
        </p>
      </div>

      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-900 leading-relaxed">
          <b>Redactado por el equipo de la plataforma, no por un abogado.</b> Está escrito en lenguaje
          llano y describe lo que el sistema hace hoy. Antes de usarse con terceros debe revisarlo un
          profesional: es un contrato entre empresas y una revisión puede cambiar plazos, responsabilidades
          o la forma de las liquidaciones.
        </p>
      </div>

      {CLAUSULAS.map(c => (
        <section key={c.titulo} className="space-y-2">
          <h2 className="text-lg font-black text-slate-900">{c.titulo}</h2>
          {c.parrafos.map((p, i) => <Parrafo key={i} texto={p} />)}
        </section>
      ))}

      <p className="text-xs text-slate-400 pt-4 border-t border-slate-100">
        Versión {VERSION_COBRO}. Cuando cambie, se avisará con treinta días y habrá que aceptar la nueva
        para seguir usando el servicio de cobro; las aceptaciones anteriores se conservan tal como fueron.
      </p>
    </div>
  );
}

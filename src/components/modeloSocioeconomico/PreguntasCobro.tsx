// How the payment system knows what to do: the mechanics the blind evaluator
// could not work out from the rest of the page (the tier of a purchase, the size
// of a company, what counts as a payment, public wages, what «per inhabitant»
// means, Europe and the planet, privacy).
// Native <details>: keyboard and screen readers work without any script.
import { ChevronDown } from 'lucide-react';
import { type Modo, cuentasPais, millones, porcentaje, TIPO_GENERAL } from '../../data/modeloSocioeconomico';

export function PreguntasCobro({ modo }: { modo: Modo }) {
  const pais = cuentasPais(modo);
  const preguntas: { p: string; r: React.ReactNode }[] = [
    {
      p: '¿Cómo sabe en qué tramo va cada compra?',
      r: <>Cada producto o servicio lleva su tramo, igual que hoy lleva su tipo de IVA (4, 10 o 21 %), y la caja o el datáfono lo pasa con el pago.
        La vivienda en la que vives y tu primer vehículo van en el tramo 1: el registro de la propiedad y el de vehículos ya saben si es el primero o el segundo de tu hogar.</>,
    },
    {
      p: '¿Y cómo sabe el tamaño de una empresa?',
      r: <>Por las personas que tiene dadas de alta, contando todo el grupo de empresas: menos de 50, pequeña; de 50 a 249, mediana; 250 o más, grande.
        Se cuenta el grupo para que partir una empresa en varias no sirva para pagar menos.</>,
    },
    {
      p: '¿Cómo distingue una compra de un sueldo o de un Bizum a un amigo?',
      r: <>Cada cuenta de pago está dada de alta como persona, hogar, empresa o administración. Lo que cobra una empresa o un profesional es una venta y aparta su tramo; una nómina, el de la empresa que la paga.
        Pasar dinero entre tus cuentas, devolver un préstamo o enviárselo a un amigo no es comprar nada ni pagar un trabajo, así que no aparta nada.
        Las operaciones financieras (ahorrar, pedir un préstamo, comprar acciones) tampoco pagan en las cuentas de esta página.</>,
    },
    {
      p: '¿Y cuando compra una empresa?',
      r: <>Depende de la decisión que viene justo debajo. Sin cascada, el sistema sabe que quien compra es una empresa y le devuelve lo que pagó en cuanto vende, como hoy el IVA.
        Al pie de la letra, las compras entre empresas pagan el tipo general, un {porcentaje(TIPO_GENERAL * 100, 0)}, y no se devuelve.</>,
    },
    {
      p: '¿Pagan los sueldos que pagan las administraciones?',
      r: <>No. Una médica del hospital de la región cobra de la escala regional; si su nómina pagara, la región se cobraría a sí misma y movería dinero público de una escala a otra.
        Esta página lo deja en el 0 %, como el de una empresa pequeña.</>,
    },
    {
      p: '¿Qué quiere decir «lo mismo por habitante»?',
      r: <>Lo apartado no se queda donde se pagó: se junta en un fondo y cada escala recibe la misma cantidad por cada persona que vive en ella.
        Un pueblo de 400 habitantes recibe 400 veces la parte por habitante aunque allí se compre poco, y una ciudad no recibe más por tener más tiendas.</>,
    },
    {
      p: '¿Qué recibe España de Europa y del planeta?',
      r: <>España aporta un octavo de lo que recauda a la escala europea y otro a la planetaria: {millones(pais.porEscala)} a cada una.
        No vuelve como transferencia, sino como lo que hacen esas escalas: trenes entre países, investigación, defensa común, clima y océanos. Sus asambleas también son de toda la gente que vive en ellas, la de aquí incluida.</>,
    },
    {
      p: '¿Qué sabe el sistema de mí?',
      r: <>Para apartar y repartir le basta con el importe, el tramo de cada pago y dónde vives, para saber a qué escalas perteneces. Sabe el tramo, no qué compraste: una cena y una entrada de cine son las dos tramo 3.
        Lo que sí es público es cuánto recauda cada escala y en qué lo gasta. Los pagos en efectivo están entre <a href="#retos" className="underline decoration-slate-300 underline-offset-2 hover:text-slate-900">lo que falta por resolver</a>.</>,
    },
  ];
  return (
    <div className="mt-12">
      <h3 className="text-lg font-bold">Cómo sabe el sistema de pago qué hacer</h3>
      <div className="mt-3 grid gap-x-8 md:grid-cols-2">
        {preguntas.map(q => (
          <details key={q.p} className="group border-b border-slate-200 py-3">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded text-[15px] font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 [&::-webkit-details-marker]:hidden">
              {q.p}
              <ChevronDown aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{q.r}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

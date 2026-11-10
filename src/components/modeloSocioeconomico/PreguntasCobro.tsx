// How the payment system knows what to do: the mechanics the blind evaluator
// could not work out from the rest of the page (what counts as a payment, public
// wages, what «per inhabitant» means, Europe and the planet, privacy).
// Native <details>: keyboard and screen readers work without any script.
import { ChevronDown } from 'lucide-react';
import { type Modo, cuentasPais, millones, porcentaje, TIPO, PARTE_ESCALA } from '../../data/modeloSocioeconomico';

export function PreguntasCobro({ modo }: { modo: Modo }) {
  const pais = cuentasPais(modo);
  const tipo = porcentaje(TIPO * 100, 0);
  const preguntas: { p: string; r: React.ReactNode }[] = [
    {
      p: '¿Cómo distingue una compra de un sueldo o de un Bizum a un amigo?',
      r: <>Cada cuenta de pago está dada de alta como persona, hogar, empresa o administración. Lo que cobra una empresa o un profesional es una venta y aparta el {tipo}; una nómina, también.
        Pasar dinero entre tus cuentas, devolver un préstamo o enviárselo a un amigo no es comprar nada ni pagar un trabajo, así que no aparta nada.
        Las operaciones financieras (ahorrar, pedir un préstamo, comprar acciones) tampoco pagan en las cuentas de esta página. Quien vende o trabaja por su cuenta se da de alta como tal, igual que hoy.</>,
    },
    {
      p: '¿Y cuando compra una empresa?',
      r: <>Depende de la decisión que viene justo debajo. Sin cascada, el sistema sabe que quien compra es una empresa y le devuelve ese {tipo} en cuanto vende, como hoy el IVA. Al pie de la letra, no se devuelve.</>,
    },
    {
      p: '¿Pagan también los sueldos que pagan las administraciones?',
      r: <>Sí. Una médica del hospital de la región cobra de la escala regional, y su nómina aparta el {tipo} como cualquier otra: una parte vuelve al fondo común.
        Hoy ocurre lo mismo con el IRPF y las cotizaciones de quienes trabajan en lo público. Las cuentas de la página ya lo tienen en cuenta.</>,
    },
    {
      p: '¿Qué quiere decir «lo mismo por habitante»?',
      r: <>Lo apartado no se queda donde se pagó: se junta en un fondo y cada escala recibe la misma cantidad por cada persona que vive en ella.
        Un pueblo de 400 habitantes recibe 400 veces la parte por habitante aunque allí se compre poco, y una ciudad no recibe más por tener más tiendas.</>,
    },
    {
      p: '¿Qué recibe España de Europa y del planeta?',
      r: <>España aporta su {porcentaje(PARTE_ESCALA * 100)} a la escala europea y otro tanto a la planetaria: {millones(pais.porEscala)} a cada una.
        No vuelve como transferencia, sino como lo que hacen esas escalas: trenes entre países, investigación, defensa común, clima y océanos. Sus asambleas también son de toda la gente que vive en ellas, la de aquí incluida.</>,
    },
    {
      p: '¿Qué sabe el sistema de mí?',
      r: <>Para apartar y repartir le basta con el importe, si el cobro es una venta o un sueldo, y dónde vives, para saber a qué escalas perteneces. No necesita saber qué compras.
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

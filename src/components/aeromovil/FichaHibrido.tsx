// ============================================================================
// The plug-in hybrid's sheet in the side panel (2026-11-16, Eugenio: «que aparezca
// también más información del engranaje planetario y las opciones que hay para
// conectar el motor híbrido y el eléctrico»)
// ============================================================================
// Shown inside the «Híbrido enchufable» block (Motor tab): the chosen architecture
// with its pros and cons next to the other two, the figures at the speed of
// calculation (rpm of the engine, the ring and MG1, the planetary's ratio, the
// efficiency), the planetary gear explained (sun, carrier, ring, Willis equation,
// what each machine does in each mode), and where the parts are drawn.

import { Fragment } from 'react';
import { CORONA_A_100, DIENTES_PLANETARIO, MOTOR_A_100_PARALELO, RAZON_PLANETARIO, REND_PLANETARIO, RPM_MAX_MOTOR, cifrasHibrido, type ArqHibrido } from './hibrido';
import type { ModeloTriciclo } from './geometriaTriciclo';

const f = (v: number, d = 0) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const rpm = (v: number) => `${f(Math.round(v / 10) * 10)} rpm`;

const OPCIONES: Record<ArqHibrido, { n: string; como: string; pros: string[]; contras: string[] }> = {
  reparto: {
    n: 'Reparto con engranaje planetario (Toyota Prius)',
    como: 'El motor de gasolina mueve el portasatélites; el generador MG1, el sol; la corona va a las ruedas por una cadena, y el motor de buje de la rueda trasera hace de MG2. Una parte de la fuerza va directa, otra se hace electricidad en el MG1.',
    pros: ['El motor de gasolina gira siempre a sus mejores vueltas: es una caja de cambios continua, sin embrague ni marchas', 'Arranca el motor con el MG1, sin motor de arranque', 'Muy probado: es el sistema de Toyota desde 1997'],
    contras: ['Un engranaje y una máquina eléctrica más (el MG1)', 'Cuanta más potencia pasa por el camino eléctrico, más se pierde'],
  },
  serie: {
    n: 'En serie (BMW i3 REx, Nissan e-Power)',
    como: 'El motor de gasolina solo mueve un generador pegado a él; un cable naranja lleva la electricidad al controlador y al motor de buje. Las ruedas las mueve siempre el motor eléctrico.',
    pros: ['Lo más sencillo: sin cadena, sin engranajes, sin embrague', 'El motor de gasolina va donde quepa y gira a sus mejores vueltas', 'Se conduce siempre como un eléctrico'],
    contras: ['Toda la energía pasa por el camino eléctrico (80–85 %)', 'El motor de buje tiene que poder con todo: con gasolina sostenida no va más rápido que su potencia nominal'],
  },
  paralelo: {
    n: 'En paralelo P2 (embrague, motor-generador y caja)',
    como: 'Motor de gasolina → embrague → un motor-generador delgado (P2) → caja de tres marchas → cadena a la rueda trasera. Con el embrague abierto, en eléctrico; cerrado, la gasolina empuja directa.',
    pros: ['A velocidad alta y constante es lo que menos pierde (≈ 93 %)', 'El P2 arranca el motor y recarga la batería'],
    contras: ['El motor de gasolina va atado a las ruedas: con la poca potencia que pide este coche, trabaja lejos de su mejor punto', 'Más piezas mecánicas: embrague y marchas'],
  },
};

export function FichaHibrido({ modelo, vel, hib }: {
  modelo: ModeloTriciclo; vel: number;
  hib: { rendTrans: number; rendTermVel: number; cifras: ReturnType<typeof cifrasHibrido> } | null;
}) {
  const p = modelo.phev; if (!p) return null;
  const arq = p.arq, d = p.disp, op = OPCIONES[arq];
  // without the tunnel's Cd yet: the figures that do not need the power (the power split's rpm)
  const k = hib?.cifras ?? cifrasHibrido(arq, vel, 2 * modelo.rR, 0, p.kW, p.mec);
  const filas: [string, string][] = [
    ['Del eje del motor de gasolina a la rueda', `${f(p.rendTrans * 100, 1)} %`],
  ];
  if (arq === 'reparto') filas.push(
    ['Planetario: dientes de la corona / del sol', `${DIENTES_PLANETARIO.corona} / ${DIENTES_PLANETARIO.sol} = ${f(RAZON_PLANETARIO, 2)}`],
    ['Parte directa · parte eléctrica', `${f(p.mec * 100)} % (al ${f(REND_PLANETARIO * 100)} %) · ${f(100 - p.mec * 100)} % (al ${f(p.rendElec * 100, 1)} %)`],
    ['Cadena de la corona a la rueda', `1 : ${f(k.cadena, 2)} (corona a ${f(CORONA_A_100)} rpm a 100 km/h)`],
    [`A ${f(vel)} km/h: rueda · corona`, `${rpm(k.rueda)} · ${rpm(k.corona)}`],
    [`A ${f(vel)} km/h: motor de gasolina`, `${rpm(k.motor)}${k.motor > RPM_MAX_MOTOR ? ' (demasiado: sube la parte directa)' : ''}`],
    [`A ${f(vel)} km/h: generador MG1 (sol)`, `${rpm(Math.abs(k.mg1))}${k.mg1 < -1 ? ', al revés: hace de motor' : k.mg1 > 1 ? ', genera' : ', parado (punto mecánico)'}`],
  );
  if (arq === 'serie') filas.push(
    [`A ${f(vel)} km/h: motor de gasolina y generador`, hib ? `${rpm(k.motor)} (no depende de la velocidad: de la potencia que se pide)` : '—'],
    ['Velocidad sostenida con gasolina, limitada por', `el motor de buje (${f(modelo.campos.tKWNom, 1)} kW nominales)`],
  );
  if (arq === 'paralelo') filas.push(
    ['Reducción total en la marcha más larga', `1 : ${f(k.cadena, 2)} (motor a ${f(MOTOR_A_100_PARALELO)} rpm a 100 km/h)`],
    [`A ${f(vel)} km/h: motor de gasolina`, rpm(k.motor)],
    [`A ${f(vel)} km/h: carga del motor · su rendimiento`, hib ? `${f(k.carga * 100)} % · ${f(hib.rendTermVel * 100, 1)} % (en su mejor punto, ${f(p.rendTerm * 100, 1)} %)` : '—'],
  );
  filas.push(
    ['Motor de gasolina', `${d.motor.n} cilindro${d.motor.n > 1 ? 's' : ''}, ${f(Math.round(d.motor.cc / 10) * 10)} cm³, ${f(p.kgMotor, 0)} kg con su escape`],
    [p.transmision.map(t => t.nombre.replace('Motor: ', '')).join(' + '), `${f(p.transmision.reduce((a, t) => a + t.kg, 0), 1)} kg`],
  );
  return (
    <div className="-mt-1 flex flex-col gap-2 text-xs text-slate-600">
      <p><span className="font-semibold text-slate-800">{op.n}.</span> {op.como}</p>
      <dl className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-x-3 gap-y-1 text-[12.5px]">
        {filas.map(([a, b]) => (<Fragment key={a}><dt className="text-slate-600">{a}</dt><dd className="text-right font-mono text-[11px] leading-snug tabular-nums">{b}</dd></Fragment>))}
      </dl>
      <details className="rounded-lg border border-slate-200 px-2 py-1.5">
        <summary className="cursor-pointer font-semibold text-slate-700">Las tres maneras de unir la gasolina con las ruedas: ventajas y pegas</summary>
        <div className="mt-1.5 flex flex-col gap-2">
          {(Object.keys(OPCIONES) as ArqHibrido[]).map(a => (
            <div key={a} className={a === arq ? 'rounded-md bg-emerald-50 px-2 py-1' : 'px-2 py-1'}>
              <p className="font-semibold text-slate-800">{OPCIONES[a].n}{a === arq ? ' (la elegida)' : ''}</p>
              <p>{OPCIONES[a].como}</p>
              <ul className="mt-0.5 list-disc pl-4">{OPCIONES[a].pros.map(x => <li key={x}><span className="text-emerald-700">+</span> {x}</li>)}{OPCIONES[a].contras.map(x => <li key={x}><span className="text-rose-700">−</span> {x}</li>)}</ul>
            </div>
          ))}
          <p className="px-2">No se ofrece P4 (gasolina en un eje y electricidad en el otro): las ruedas de delante giran dentro de sus carenados, sobre brazos carenados (o es la del morro, en rombo), y llevarles un palier no cabe en esta carrocería.</p>
        </div>
      </details>
      <details className="rounded-lg border border-slate-200 px-2 py-1.5" open={arq === 'reparto'}>
        <summary className="cursor-pointer font-semibold text-slate-700">Cómo funciona el engranaje planetario</summary>
        <div className="mt-1.5 flex flex-col gap-1.5">
          <p>Tres piezas giran sobre el mismo eje. En el centro, el <b>sol</b> ({DIENTES_PLANETARIO.sol} dientes en el Prius). Alrededor, cuatro <b>satélites</b> que engranan con él, sujetos a un <b>portasatélites</b>. Por fuera, la <b>corona</b> ({DIENTES_PLANETARIO.corona} dientes, por dentro), que engrana con los satélites. En el Prius el motor de gasolina mueve el portasatélites, el generador MG1 va en el sol y la corona va a las ruedas y al motor eléctrico MG2. Aquí, la corona va por una cadena a la rueda trasera, y el motor de buje de esa rueda hace de MG2.</p>
          <p>Las tres velocidades están atadas por la <b>ecuación de Willis</b>: <span className="font-mono">ω_corona·R + ω_sol·S = ω_portasatélites·(R + S)</span>, con R = {DIENTES_PLANETARIO.corona} y S = {DIENTES_PLANETARIO.sol} (la razón R/S = {f(RAZON_PLANETARIO, 2)}). Sabiendo dos, sale la tercera. La corona va con las ruedas; el MG1, frenando más o menos, decide a qué vueltas gira el motor de gasolina. Y la fuerza se reparte siempre igual: de cada 108 partes del par del motor, 78 van a la corona y 30 al sol.</p>
          <p>La parte de potencia que va directa es (R/(R+S)) × vueltas de la corona / vueltas del motor. Por eso «Reparto: parte que va directa» fija las vueltas del motor: con el 100 %, el sol se para y todo va directo (el «punto mecánico»).</p>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1">
            {([
              ['Eléctrico (EV)', 'Motor de gasolina parado (el portasatélites, quieto). El MG2, el de buje, mueve el coche con la batería; el MG1 gira suelto hacia atrás, sin hacer fuerza.'],
              ['Híbrido', 'Motor de gasolina en marcha, en su mejor punto. Una parte de su fuerza va directa a la corona; el MG1 frena el sol y genera, y esa electricidad mueve el MG2. Si se pide más, la batería ayuda al MG2.'],
              ['Mantener la carga', 'Con la batería en su reserva: el motor de gasolina da un poco más de lo que piden las ruedas y el MG1 manda lo que sobra a la batería, que se queda en su nivel. Es el modo de los viajes largos, el que cuentan los litros a los 100 km.'],
              ['Frenada (regeneración)', 'Motor de gasolina parado. El MG2 frena la rueda haciendo de generador y carga la batería; los frenos de disco solo para el final o para frenar fuerte.'],
              ['Arranque del motor', 'El MG1 hace de motor de arranque: empuja el sol, la corona se apoya en las ruedas y el portasatélites hace girar el motor de gasolina hasta que prende.'],
            ] as [string, string][]).map(([a, b]) => (<Fragment key={a}><dt className="font-semibold text-slate-700">{a}</dt><dd>{b}</dd></Fragment>))}
          </dl>
        </div>
      </details>
      <p>En 3D (capa «Motor», mejor con rayos X): el motor de gasolina va atravesado, de serie {modelo.cuatro ? 'justo delante del diferencial, con dos palieres hasta las ruedas traseras' : 'lo más cerca de la rueda trasera que cabe: justo delante del amortiguador trasero y su torreta'} y lo más bajo que deja lo que tiene debajo (el suelo, la batería o el controlador); {arq === 'reparto' ? 'el MG1 pegado a su izquierda y, por fuera, el planetario en una carcasa transparente para verlo por dentro (sol, satélites y corona), con la caja de salida y la cadena' : arq === 'serie' ? 'el generador pegado a su izquierda, y el cable naranja hasta el controlador' : 'el embrague, el P2 y la caja de cambios a su izquierda, con la cadena'}; el depósito, de serie, en el suelo justo delante del motor si cabe ahí (cerca del centro de gravedad), y si no {modelo.cuatro ? 'sobre el diferencial' : 'sobre la rueda trasera'}; y el escape hasta la cola. Los dos se mueven libremente con «Motor de gasolina: adelante…» y «Depósito: adelante…» (cero es su sitio de serie), y las comprobaciones dicen si tocan la rueda y su recorrido, el basculante, el amortiguador, los asientos, la batería o la piel. Su masa cuenta donde se dibuja (pestaña «Masas»). Si una pieza no cabe, se pinta en rojo y la comprobación dice cuántos centímetros. Al pinchar en cualquiera se abre este bloque.</p>
      <p className="text-[11px] text-slate-400">Estimaciones de un primer diseño: tamaño y masa del motor por reglas de motores de su clase (24 cm³ y 1,4 kg por kW), rendimientos típicos, la curva de carga parcial del paralelo aproximada. No medido.</p>
    </div>
  );
}

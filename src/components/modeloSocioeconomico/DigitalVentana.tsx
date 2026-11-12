// The «Digital» window (Eugenio, 2026-11-12): remove the hurdles of signing
// online — certificates, AutoFirma, things to install — and replace them with
// the phone everybody already has: register once with phone + e-mail (+ ID
// checked), sign by unlocking the phone and confirming a code, scan the ID or
// the face for serious things, and a phone line for whoever has no mobile.
// Simple first; the detail behind «Más». Data: src/data/digital.ts.
import type { ReactNode } from 'react';
import { Building2, Check, Download, Headphones, IdCard, Mail, RefreshCw, ScanFace, Smartphone, type LucideIcon } from 'lucide-react';
import { ESCALAS, numero, porcentaje } from '../../data/modeloSocioeconomico';
import {
  CIFRAS, ESCALAS_DIGITAL, FUENTES_DIGITAL, FUENTE_DIGITAL, INE_2025, METODOS_HOY, NIVELES, PAISES, PASOS_HOY, PASOS_PROPUESTA, PIEZAS,
} from '../../data/digital';
import { Apartado, Cifra, Mas } from './ventanas';
import { Fuente, Muestra } from './piezas';
import { cn } from '../../utils/cn';

/** A source link by id from this window's own list. */
function F({ id }: { id: string }) {
  const f = FUENTE_DIGITAL[id];
  return f ? <Fuente url={f.url} titulo={f.titulo} /> : null;
}

const millones = (n: number) => `${numero(n / 1e6, 1)} millones`;
const ICONO_PIEZA: Record<string, LucideIcon> = { alta: IdCard, normal: Smartphone, reforzada: ScanFace, telefono: Headphones };

export function DigitalVentana() {
  const instalar = PASOS_HOY.filter(p => p.instala).length;
  return (
    <>
      {/* ── 1. Summary ── */}
      <Apartado id="digital" titulo="Firmar con el móvil que ya tienes"
        entradilla={<>Hoy, para firmar algo con la administración hay que conseguir un certificado, instalar programas y a veces pedir cita en una oficina.
          La propuesta: te das de alta una vez con tu móvil y tu correo, y para firmar desbloqueas el móvil y escribes el código que te llega por SMS. Sin instalar nada.
          Y un teléfono de atención para quien no tenga móvil.</>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Cifra valor={`${PASOS_HOY.length} pasos`} tono="mal"
            texto={<>para firmar por primera vez con el certificado de la FNMT: {instalar} programas que instalar y una visita a una oficina<F id="fnmt-pasos" /></>} />
          <Cifra valor={`${CIFRAS.fnmtValidezAnos} años`} tono="mal"
            texto={<>dura ese certificado. Luego, o si cambias de ordenador, vuelta a empezar<F id="fnmt-validez" /></>} />
          <Cifra valor={porcentaje(INE_2025.tratanConAdministracion, 1)}
            texto={<>de las personas de 16 a 74 años hizo algún trámite por internet en 2025; solo el {porcentaje(INE_2025.usos[4].pct, 1)} presentó ella misma la renta<F id="ine-tic" /></>} />
          <Cifra valor="3 pasos" tono="bien" nota="Propuesta, aún no existe"
            texto="alta una vez; luego, aviso en el móvil, desbloquear y escribir el código del SMS. Ningún programa que instalar" />
        </div>
      </Apartado>

      {/* ── 2. Today ── */}
      <Apartado id="digital-hoy" titulo="Cómo se firma hoy: cinco caminos que no se hablan" fondo="blanco"
        entradilla={<>Hay cinco sistemas distintos para identificarse y firmar. Para firmar documentos casi siempre acabas necesitando un certificado y un programa instalado.</>}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {METODOS_HOY.map(m => (
            <article key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="font-bold text-slate-900">{m.t}</h3>
              <p className="mt-1 text-[15px] leading-snug text-slate-700">{m.que}</p>
              <p className="mt-2 text-sm leading-snug text-rose-800"><span className="font-semibold">La pega: </span>{m.pega}{m.fuentes.map(f => <F key={f} id={f} />)}</p>
            </article>
          ))}
        </div>

        <Mas titulo="qué pide cada uno">
          <dl className="max-w-3xl space-y-3 text-[15px] leading-relaxed">
            {METODOS_HOY.map(m => (
              <div key={m.id}><dt className="font-semibold text-slate-900">{m.t}</dt><dd className="text-slate-700">{m.necesitas}</dd></div>
            ))}
          </dl>
        </Mas>

        <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-slate-700">
          Lo que sí funciona ya es el código por SMS de Cl@ve: <strong>{millones(CIFRAS.clavePin2022)} de personas</strong> registradas a finales de 2022, el último dato publicado que hemos encontrado<F id="aeat-clave-2022" />.
        </p>
        <Mas titulo="qué hace la gente con la administración por internet">
          <figure>
            <figcaption className="text-sm text-slate-600">Personas de 16 a 74 años, en 2025. El {porcentaje(INE_2025.usanInternet, 1)} usa internet.<F id="ine-tic" /></figcaption>
            <ul className="mt-4 max-w-3xl space-y-3" role="img"
              aria-label={INE_2025.usos.map(u => `${u.t}: ${numero(u.pct, 1)} %`).join('; ')}>
              {INE_2025.usos.map(u => (
                <li key={u.t} className="grid gap-1 sm:grid-cols-[280px_1fr] sm:items-center sm:gap-4">
                  <span className="text-sm text-slate-700">{u.t}</span>
                  <span className="flex items-center gap-2">
                    <span className="h-4 rounded-r-[4px] bg-sky-700" style={{ width: `${u.pct * 0.8}%` }} />
                    <span className="text-sm font-semibold tabular-nums text-slate-900">{porcentaje(u.pct, 1)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">Mirar y pedir cita lo hace mucha gente; presentar o firmar algo, bastante menos. El INE no publica en esta nota por qué. La app Mi Carpeta Ciudadana tiene {millones(CIFRAS.carpetaUsuarios)} de usuarios<F id="carpeta" />: la gente ya usa el móvil con la administración.</p>
          </figure>
        </Mas>
        <Mas titulo="la ayuda por teléfono y en persona, hoy">
          <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
            <p>El teléfono general de la administración, el <strong>060</strong>, informa y da ayuda técnica, pero no sirve para hacer el trámite ni para firmar. Y no es gratis: cada llamada cuesta como un minuto<F id="tel-060" />.</p>
            <p>El Defensor del Pueblo repite cada año que la atención con cita previa sigue siendo un problema<F id="defensor-2025-debate" />. Y en la oficina del propio Defensor, en 2025 se atendió a {numero(CIFRAS.defensorTelefono)} personas por teléfono y solo a {numero(CIFRAS.defensorPresencial)} en persona<F id="defensor-2025" />: quien pide ayuda, llama.</p>
            <p>Si cambias de número de móvil, Cl@ve deja de llegarte. Para poner el nuevo necesitas un certificado, el DNI electrónico o una cita en una oficina<F id="clave-telefono" />.</p>
          </div>
        </Mas>
      </Apartado>

      {/* ── 3. The path, today and proposed ── */}
      <Recorrido />

      {/* ── 4. The proposal ── */}
      <Apartado id="digital-propuesta" titulo="La propuesta: alta una vez, firmar con el móvil" fondo="blanco"
        entradilla="Que cualquiera con un móvil pueda desbloquearlo, confirmar con un código y firmar. Sin nada que instalar. Cuatro piezas:">
        <div className="grid gap-4 md:grid-cols-2">
          {PIEZAS.map(p => {
            const I = ICONO_PIEZA[p.id];
            return (
              <article key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <I aria-hidden className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{p.t}</h3>
                    <p className="text-sm font-semibold text-emerald-800">{p.corto}</p>
                  </div>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{p.d}</p>
                <p className="mt-3 border-t border-slate-100 pt-2 text-sm font-medium text-slate-700">{p.vale}</p>
              </article>
            );
          })}
        </div>
        <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-slate-700">
          <strong>Qué valdría cada firma.</strong> La ley europea distingue hoy la firma <em>avanzada</em>, que identifica a quien firma y detecta si el documento se cambia después, y la <em>cualificada</em>, que vale lo mismo que una firma a mano en toda la Unión Europea<F id="eidas2" />. La firma normal sería una firma avanzada; la reforzada podría ser cualificada si el servicio y el certificado están acreditados por un organismo oficial.
        </p>

        <Mas titulo="cuánta seguridad hace falta para cada cosa">
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
            El reglamento europeo de identidad electrónica (se le llama eIDAS) fija tres niveles de seguridad. Pedir una cita no es vender una casa<F id="eidas-niveles" />.
          </p>
          <ul className="mt-4 grid gap-3 lg:grid-cols-3">
            {NIVELES.map(n => (
              <li key={n.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-lg font-bold text-slate-900">Nivel {n.t.toLowerCase()}</p>
                <dl className="mt-2 space-y-2 text-[15px] leading-snug">
                  <div><dt className="text-sm font-semibold text-slate-500">Qué exige</dt><dd className="text-slate-700">{n.exige}</dd></div>
                  <div><dt className="text-sm font-semibold text-slate-500">Para qué basta</dt><dd className="text-slate-700">{n.basta}</dd></div>
                  <div><dt className="text-sm font-semibold text-emerald-800">Con la propuesta</dt><dd className="text-slate-900">{n.propuesta}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">Qué trámite va en cada nivel es una propuesta de este modelo; la definición de los niveles es la de la Comisión Europea.</p>
        </Mas>

        <Mas titulo="cómo funciona sin instalar nada">
          <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
            <p>El aviso llega por SMS con un enlace. Se abre en el navegador que el móvil ya trae. Ahí lees el documento, pulsas «Firmar» y escribes el código del SMS.</p>
            <p>Ojo: el código por SMS es vulnerable al duplicado de la tarjeta SIM. Por eso cambiar de móvil o de número exige la firma reforzada, cada firma se avisa por correo y se puede anular durante un plazo, y lo grave nunca se firma solo con el SMS.</p>
            <p>La firma en sí se hace en un servidor público seguro, con un certificado tuyo guardado allí. Es lo que ya hacen la firma en la nube de Cl@ve<F id="clave" /> y la India con eSign<F id="esign-india" />. Tú no guardas ningún archivo.</p>
            <p>Como mejora opcional, quien quiera puede firmar también con su huella o su cara. Usa las «llaves de acceso»: una llave secreta que se crea en tu móvil y nunca sale de él, y que los móviles y navegadores ya traen<F id="passkeys" />.</p>

            <Mas titulo="y si pierdes el móvil o cambias de número">
              <div className="space-y-3">
                <p>Llamas al teléfono de atención o entras desde otro aparato con tu correo, y bloqueas el móvil perdido en ese momento.</p>
                <p>Para poner el móvil nuevo hace falta la firma reforzada: escanear tu DNI y tu cara, o ir a una oficina. Es justo lo que intentaría un estafador, así que es el paso más vigilado.</p>
                <p>Cada firma te llega también por correo. Si no fuiste tú, lo dices y se revisa.</p>
              </div>
            </Mas>

            <Mas titulo="y la cartera europea de identidad digital">
              <div className="space-y-3">
                <p>La Unión Europea obliga a cada país a ofrecer, antes del <strong>24 de diciembre de 2026</strong>, una cartera de identidad digital gratuita en el móvil. Su uso será siempre voluntario, y firmar con ella será gratis para uso personal<F id="eudi-calendario" /><F id="eudi-ce" />.</p>
                <p>Desde el 24 de diciembre de 2027, bancos, eléctricas, operadoras y grandes plataformas tendrán que aceptarla<F id="eudi-calendario" />. España sacó a consulta en septiembre de 2026 el real decreto que la regula<F id="rd-cartera" />, y la mayoría de países llegarán tarde al plazo<F id="eudi-retraso" />.</p>
                <p>La cartera es una app. La propuesta no la descarta: sería una forma más de firmar para quien la quiera, pero no la única, porque nadie debería tener que instalar nada para firmar.</p>
              </div>
            </Mas>
          </div>
        </Mas>
      </Apartado>

      {/* ── 5. Other countries ── */}
      <Apartado id="digital-paises" titulo="Lo que ya hacen otros países"
        entradilla={<>Dinamarca, Suecia, Estonia y la India ya firman con el móvil. En Dinamarca lo tiene activo el {numero(CIFRAS.mitidPct, 1)} % de los mayores de 15 años<F id="mitid" />. Ninguno lo ha resuelto todo.</>}>
        <Mas titulo="cada país y lo que enseña" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2">
            {PAISES.map(p => (
              <article key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-lg font-bold text-slate-900">{p.pais} <span className="font-medium text-slate-500">· {p.sistema}</span></h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-700">{p.d}{p.fuentes.map(f => <F key={f} id={f} />)}</p>
                <p className="mt-3 border-t border-slate-100 pt-3 text-[15px] leading-relaxed text-slate-600"><span className="font-semibold text-slate-800">Lo que enseña: </span>{p.leccion}</p>
              </article>
            ))}
          </div>
        </Mas>
      </Apartado>

      {/* ── 6. Scales ── */}
      <Apartado id="digital-escalas" titulo="Qué hace cada escala" fondo="blanco"
        entradilla="Una sola firma para todas las escalas, de la comunidad de vecinos a Europa. Esto es la propuesta, no lo que hay hoy.">
        <ol className="grid gap-3 md:grid-cols-2">
          {ESCALAS.map(e => (
            <li key={e.id} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <Muestra color={e.color} className="mt-1.5" />
              <div>
                <p className="font-bold text-slate-900">{e.nombre}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{ESCALAS_DIGITAL[e.id]}</p>
              </div>
            </li>
          ))}
        </ol>
      </Apartado>

      {/* ── 7. Challenges ── */}
      <Retos />

      {/* ── 8. Sources ── */}
      <Apartado id="digital-fuentes" titulo="Fuentes" fondo="blanco"
        entradilla="Consultadas en noviembre de 2026. Las cifras de esta ventana salen de aquí; lo demás es la propuesta.">
        <ul className="grid max-w-4xl gap-2 text-sm">
          {FUENTES_DIGITAL.map(f => (
            <li key={f.id}><a href={f.url} target="_blank" rel="noreferrer" className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">{f.titulo}</a></li>
          ))}
        </ul>
      </Apartado>
    </>
  );
}

/** Today's path against the proposal's, as two step lists side by side. */
function Recorrido() {
  return (
    <Apartado id="digital-recorrido" titulo="Firmar por primera vez: hoy y con la propuesta"
      entradilla={<>El mismo trámite, una solicitud firmada, por los dos caminos. Hoy, con el certificado de la FNMT y AutoFirma<F id="fnmt-pasos" /><F id="autofirma" />. Con la propuesta, con el móvil.</>}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Columna titulo="Hoy" tono="mal" resumen={`${PASOS_HOY.length} pasos · 2 programas · 1 cita en oficina · cada 4 años`}>
          {PASOS_HOY.map((p, i) => (
            <Paso key={p.t} n={i + 1} t={p.t} d={p.d} tono="mal"
              marca={p.instala ? { i: Download, t: 'Instalar' } : p.oficina ? { i: Building2, t: 'Oficina' } : i === PASOS_HOY.length - 1 ? { i: RefreshCw, t: 'Repetir' } : undefined} />
          ))}
        </Columna>
        <Columna titulo="Con la propuesta" tono="bien" resumen="3 pasos · nada que instalar · el alta, una sola vez (aún no existe)">
          {PASOS_PROPUESTA.map((p, i) => (
            <Paso key={p.t} n={i + 1} t={p.t} d={p.d} tono="bien"
              marca={p.unaVez ? { i: Mail, t: 'Una vez' } : i === PASOS_PROPUESTA.length - 1 ? { i: Check, t: 'Firmado' } : undefined} />
          ))}
          <li className="ml-11 rounded-xl border border-dashed border-slate-300 p-3 text-sm leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-800">Para algo grave</span> (una casa, una hipoteca), un paso más: escanear el DNI y la cara.
            <span className="font-semibold text-slate-800"> Sin móvil</span>, lo mismo por teléfono o en la oficina.
          </li>
        </Columna>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">Los pasos de hoy son los que indica la FNMT para el certificado con visita a la oficina; también se puede pedir por videollamada o con el DNI electrónico, con otros requisitos. Los de la propuesta son un diseño, no un servicio que exista.</p>
    </Apartado>
  );
}

function Columna({ titulo, tono, resumen, children }: { titulo: string; tono: 'bien' | 'mal'; resumen: string; children: ReactNode }) {
  return (
    <section aria-label={`${titulo}: ${resumen}`} className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className={cn('text-xl font-bold', tono === 'mal' ? 'text-rose-800' : 'text-emerald-800')}>{titulo}</h3>
      <p className="mt-1 text-sm font-medium text-slate-600">{resumen}</p>
      <ol className="mt-5 space-y-4">{children}</ol>
    </section>
  );
}

function Paso({ n, t, d, tono, marca }: { n: number; t: string; d: string; tono: 'bien' | 'mal'; marca?: { i: LucideIcon; t: string } }) {
  return (
    <li className="relative flex gap-3">
      <span aria-hidden className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums',
        tono === 'mal' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800')}>{n}</span>
      <div className="min-w-0">
        <p className="font-semibold text-slate-900">
          {t}
          {marca && (
            <span className={cn('ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 align-middle text-xs font-medium',
              tono === 'mal' ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800')}>
              <marca.i aria-hidden className="h-3 w-3" />{marca.t}
            </span>
          )}
        </p>
        <p className="text-sm leading-relaxed text-slate-600">{d}</p>
      </div>
    </li>
  );
}

function Reto({ t, d, respuesta }: { t: string; d: ReactNode; respuesta: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-lg font-bold text-slate-900">{t}</h3>
      <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{d}</p>
      <p className="mt-3 border-t border-slate-100 pt-3 text-[15px] leading-relaxed text-emerald-800"><span className="font-semibold">Cómo se plantea: </span>{respuesta}</p>
    </article>
  );
}

/** What is not solved yet, said plainly. */
function Retos() {
  const retos: { t: string; d: ReactNode; respuesta: string }[] = [
    {
      t: 'Un SMS solo no basta',
      d: <>Con el «SIM swapping» un estafador consigue un duplicado de tu tarjeta SIM haciéndose pasar por ti, y recibe tus SMS<F id="incibe-sim" />. El código por SMS es vulnerable a este engaño.</>,
      respuesta: 'Cambiar de móvil o de número exige la firma reforzada; cada firma se avisa por correo y se puede anular durante un plazo; lo grave nunca se firma solo con el SMS; y quien quiera más protección activa la huella o la cara.',
    },
    {
      t: 'Un móvil robado y desbloqueado',
      d: 'Si alguien te quita el móvil abierto, o te obliga a desbloquearlo, puede intentar firmar en tu nombre.',
      respuesta: 'Lo grave pide escanear la cara en ese momento. Cada firma te llega por correo, se puede anular en un plazo corto y el móvil se bloquea con una llamada.',
    },
    {
      t: 'Quien no tiene móvil, o no se maneja',
      d: 'Hay personas mayores, con discapacidad o sin dinero para un móvil. Que «todo el mundo tiene móvil» es casi verdad, pero no del todo.',
      respuesta: 'El teléfono gratuito con personas y la oficina municipal no son un parche: son parte del sistema. Un familiar puede ayudar, pero no firmar por otra persona sin un poder.',
    },
    {
      t: 'Un móvil muy antiguo',
      d: 'Abrir el enlace y firmar en el navegador pide un móvil con internet. Un móvil sin datos solo recibe el SMS.',
      respuesta: 'Para esos casos, la firma por teléfono con una clave o en la oficina. No hay dato oficial de cuántas personas en España tienen un móvil sin internet.',
    },
    {
      t: 'Depender de Apple y Google',
      d: 'La huella opcional (las llaves de acceso) vive en el sistema del móvil, que hacen dos empresas de Estados Unidos.',
      respuesta: 'Por eso es una mejora y no la base: la base es el código por SMS, y la firma en sí se hace en un servidor público.',
    },
    {
      t: 'Un registro único guarda mucho',
      d: 'Si todo pasa por un solo sistema, un fallo o un abuso afecta a todos.',
      respuesta: 'Guardar lo mínimo, que cada persona vea quién ha consultado sus datos y cuándo, y auditorías independientes.',
    },
    {
      t: 'El coste y la ley',
      d: 'No hay un cálculo oficial de cuánto costaría el sistema único ni de cuánto se ahorraría al cerrar los cinco de hoy.',
      respuesta: 'Habría que adaptar la ley española para que la firma normal valga en casi todos los trámites, y encajarla con la cartera europea.',
    },
  ];
  return (
    <Apartado id="digital-retos" titulo="Lo que falta por resolver"
      entradilla="La idea es sencilla; hacerla segura es lo difícil. Esto es lo que hay que resolver, y cómo lo plantea la propuesta.">
      <div className="grid gap-4 lg:grid-cols-3">{retos.slice(0, 3).map(r => <Reto key={r.t} {...r} />)}</div>
      <Mas titulo={`otros ${retos.length - 3} retos: el móvil antiguo, Apple y Google, la privacidad, el coste y la ley`}>
        <div className="grid gap-4 md:grid-cols-2">{retos.slice(3).map(r => <Reto key={r.t} {...r} />)}</div>
      </Mas>
    </Apartado>
  );
}

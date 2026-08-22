import { Link } from 'react-router-dom';
import { ArrowLeft, ListChecks, CheckCircle2 } from 'lucide-react';

// ============================================================================
// TAREAS DEL TOKEN — (2026-08-22, Eugenio: «haz un listado de tareas dentro
// de la página de tokenomics: tareas necesarias para dar por concluida esta
// funcionalidad de crear un token de conocimiento que pueda ser funcional a
// nivel internacional y cotice en el mercado de valores»)
// ============================================================================
// La lista es honesta en dos sentidos: cada tarea lleva su estado real (lo
// hecho, hecho; lo demás, pendiente o decisión), y las que son de abogado
// están marcadas «legal» — el equipo puede prepararlas pero no cerrarlas.
//
// SOBRE «COTIZAR»: la petición original contenía una bifurcación — bolsa de
// valores (MiFID, security) o plataforma de criptoactivos (MiCA, utilidad).
// El mismo 2026-08-22 Eugenio la RESOLVIÓ: «vamos por la Rama A, elimina las
// tareas de la Rama B». El token se negociará, si llega el día, en una
// plataforma de criptoactivos y sigue siendo de utilidad; el token NO
// cotizará en bolsa de valores. Si algún día se buscara capital en bolsa,
// quien cotizaría sería la entidad emisora (sus acciones), nunca el token —
// inversores compran acciones, usuarios gastan puntos, y ningún régimen
// contamina al otro. Las tareas de la rama B se quitaron de la lista por esa
// decisión; este comentario es lo que queda de ellas.
// ============================================================================

type Estado = 'hecha' | 'en_revision' | 'pendiente' | 'decision' | 'legal';

const ESTADO_UI: Record<Estado, { label: string; clase: string }> = {
  hecha:       { label: 'Hecha',        clase: 'bg-emerald-100 text-emerald-700' },
  en_revision: { label: 'En revisión',  clase: 'bg-sky-100 text-sky-700' },
  pendiente:   { label: 'Pendiente',    clase: 'bg-slate-100 text-slate-500' },
  decision:    { label: 'Decisión',     clase: 'bg-amber-100 text-amber-700' },
  legal:       { label: 'Legal',        clase: 'bg-violet-100 text-violet-700' },
};

const BLOQUES: { titulo: string; nota?: string; tareas: { texto: string; estado: Estado }[] }[] = [
  {
    titulo: 'Piloto interno (~1.000 usuarios)',
    nota: 'Probar la experiencia de tener, gastar y enviar puntos con el sistema interno, antes de cualquier token.',
    tareas: [
      { texto: 'Saldo interno con libro de movimientos y motivo en cada apunte', estado: 'hecha' },
      { texto: 'Transferencias entre cuentas: envío por correo o nombre, tope diario, saldo y libro en una sola transacción, interruptor apagado en producción', estado: 'en_revision' },
      { texto: 'Salvaguarda en base de datos: ningún saldo puede quedar negativo', estado: 'en_revision' },
      { texto: 'Libro de movimientos de solo-añadir: ni editar ni borrar apuntes — una corrección es un apunte contrario (lo hace cumplir la propia base de datos)', estado: 'en_revision' },
      { texto: 'El libro manda: el saldo se deriva de los movimientos y se cuadra cada noche contra ellos', estado: 'en_revision' },
      { texto: 'Sello de integridad sobre el libro (registro encadenado del área de seguridad): la prueba de que ningún apunte se reescribió', estado: 'en_revision' },
      { texto: 'Dicho antes de encender, no después: el sello prueba que una transferencia no se alteró, NO que quien envió quisiera enviar — quien fabrique una petición con la sesión de otro transfiere en su nombre. La firma del propio emisor sobre cada orden es una fase posterior del área de seguridad', estado: 'pendiente' },
      { texto: 'Elegir el abanico limitado de productos y servicios que aceptan puntos en el piloto', estado: 'decision' },
      { texto: 'Seleccionar e invitar al grupo de ~1.000 usuarios del piloto', estado: 'decision' },
      { texto: 'Encender los usos reales del punto: almacenamiento, cómputo y modelos de IA cobrando en puntos', estado: 'pendiente' },
      { texto: 'Medir el piloto: transferencias por día, saldos, en qué se gastan los puntos, dónde se atasca la gente', estado: 'pendiente' },
    ],
  },
  {
    titulo: 'Base económica',
    nota: 'El punto tiene que explicarse por lo que compra antes de poder ser otra cosa.',
    tareas: [
      { texto: 'API pública de precios: qué compra un punto en cada momento, consultable por cualquiera', estado: 'pendiente' },
      { texto: 'Publicar el indicador de respaldo: capacidad de hardware disponible frente a puntos en circulación', estado: 'pendiente' },
      { texto: 'Retirar «100 puntos = 100 €» como identidad fija; el precio de venta se publica y puede cambiar', estado: 'decision' },
      { texto: 'Decidido (2026-08-22): el bote es el 50% de la COMISIÓN de la plataforma, no de la facturación bruta; reparto MIXTO proporcional al éxito de las publicaciones (vistas válidas, interacción, reseñas positivas); caducidad a 10 años y pérdida de saldo tras 24 meses de inactividad; sin canje a euros; descuento en el mercado hasta el 100%', estado: 'hecha' },
      { texto: 'Construir el reparto mensual sobre esos parámetros: cálculo del bote, pesos del éxito, avisos de caducidad e inactividad', estado: 'pendiente' },
      { texto: 'Caducidad y pérdida por inactividad: reflejarlas en los términos de uso ANTES de activarlas — quitar saldo sin condiciones escritas es un pleito servido', estado: 'legal' },
      { texto: 'Venta de puntos ENTRE personas (mercado secundario del punto): solo con dictamen legal delante — es distinta de donarlos, que va en el piloto', estado: 'legal' },
      { texto: 'Contar y pagar como dos cosas: vistas VÁLIDAS (una por persona, ventana y día, con sesión) separadas del contador bruto; solo las válidas acuñan y solo ellas leerá el reparto. Construido (vistas_validas): el techo de acuñación baja de 0,50 puntos × ventanas propias/día a ~0,10', estado: 'en_revision' },
      { texto: 'Política de cese ordenado: qué pasa con los saldos si la plataforma cierra', estado: 'decision' },
    ],
  },
  {
    titulo: 'Marco legal (ninguna de estas la cierra el equipo)',
    tareas: [
      { texto: 'Elegir la persona jurídica emisora (¿la fundación?) — MiCA exige emisor con personalidad jurídica', estado: 'decision' },
      { texto: 'Revisión por abogado especialista en MiCA y dinero electrónico ANTES de activar transferencias en producción', estado: 'legal' },
      { texto: 'Dictamen sobre las transferencias sin cadena: dinero electrónico, exención de red limitada, o licencia', estado: 'legal' },
      { texto: 'Cerrar el libro blanco: rellenar los [PENDIENTE] y formalizarlo para notificación si procede', estado: 'legal' },
      { texto: 'Obligaciones internacionales si el punto cruza fronteras: identificación de usuarios (KYC), blanqueo (AML), sanciones y fiscalidad por país', estado: 'legal' },
    ],
  },
  {
    titulo: 'Token en cadena (fase C, condicionada)',
    tareas: [
      { texto: 'Tres instituciones independientes con nodo — condición escrita, sin ella no hay cadena', estado: 'pendiente' },
      { texto: 'Cadena sin datos personales: solo anotaciones de capacidad (regla CEPD)', estado: 'pendiente' },
      { texto: 'Emitir el token dando acceso a servicios QUE YA EXISTEN (la vía de la exención del libro blanco del art. 4.3 de MiCA)', estado: 'pendiente' },
      { texto: 'Auditoría externa del contrato y del puente entre libro interno y cadena', estado: 'pendiente' },
    ],
  },
  {
    titulo: 'Negociación pública (decidido: plataforma de criptoactivos)',
    nota: 'Decisión del emisor (2026-08-22): el token se negociará, si llega el día, en una plataforma de criptoactivos y sigue siendo de utilidad (MiCA). No cotizará en bolsa de valores — si algún día se buscara capital en bolsa, cotizaría la entidad emisora, nunca el token.',
    tareas: [
      { texto: 'Elegir plataforma de negociación con licencia CASP y pedir la admisión del token', estado: 'legal' },
      { texto: 'Cumplimiento de mercado al cotizar: normas de abuso de mercado de MiCA, comunicación de operaciones, información al público', estado: 'legal' },
      { texto: 'Análisis país a país fuera de la UE antes de admitir compradores de fuera (en EE.UU. un token comprado esperando ganancia puede ser tratado como valor negociable)', estado: 'legal' },
    ],
  },
];

export default function TokenomicsTareas() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <div>
        <Link to="/tokenomics" className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors mb-5">
          <ArrowLeft className="w-4 h-4" /> Tokenomics
        </Link>
        <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-3">
          <ListChecks className="w-3.5 h-3.5" /> Tareas
        </p>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-display mb-4">Del punto interno al token de conocimiento</h1>
        <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
          Todo lo que falta, con su estado real. Las tareas marcadas
          <span className="mx-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-black uppercase">decisión</span>
          las decide el emisor; las marcadas
          <span className="mx-1 px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[10px] font-black uppercase">legal</span>
          necesitan abogado y el equipo solo puede prepararlas.
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-900 leading-relaxed">
          <strong>Decisión tomada (2026-08-22):</strong> el punto seguirá siendo un token de
          utilidad y, si llega a negociarse públicamente, será en una plataforma de
          criptoactivos bajo MiCA — nunca en una bolsa de valores, donde pasaría a ser un
          valor negociable y dejaría de ser lo que esta página describe. Si algún día se
          buscara capital en bolsa, cotizaría la entidad emisora; el token, no.
        </p>
      </div>

      {BLOQUES.map(({ titulo, nota, tareas }) => (
        <section key={titulo}>
          <h2 className="text-xl font-bold text-slate-900 font-display mb-1">{titulo}</h2>
          {nota && <p className="text-xs text-slate-500 leading-relaxed mb-3 max-w-2xl">{nota}</p>}
          <div className="mt-3 space-y-2">
            {tareas.map(({ texto, estado }) => (
              <div key={texto} className="flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl">
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${ESTADO_UI[estado].clase}`}>
                  {ESTADO_UI[estado].label}
                </span>
                <p className="text-sm text-slate-700 leading-relaxed">{texto}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

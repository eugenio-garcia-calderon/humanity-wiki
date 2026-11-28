import type { ComponentType } from 'react';
import { VisualDemocracia, VisualEconomia, VisualGeometria, VisualObservatorio, VisualPerfiles } from '../../politica/VisualesHerramientas';
import * as Energia from './visuales/energia';
import * as Movilidad from './visuales/movilidad';
import * as Vivienda from './visuales/vivienda';
import * as Otras from './visuales/otras';
import * as Salud from './visuales/salud';
import * as Seguridad from './visuales/seguridad';

/** The sliders of «Democracia directa» are laid out in HTML for the taller card of /politica: here they are
 *  drawn at 75 % so the four rows fit the 144 px header instead of being cut at the top and bottom. */
function DemocraciaCompacta() {
  return (
    <span className="block h-[133.4%] w-[133.4%] origin-top-left scale-75">
      <VisualDemocracia />
    </span>
  );
}

// ============================================================================
// LAS HERRAMIENTAS DEL LABORATORIO, CON SU ILUSTRACIÓN (Diseño 1, 2026-11-27)
// ============================================================================
// One entry per row of the «Proyectos» table of luzhumanidad.com (`BDTMUOOFFNGJIEG`), by row id: the drawing,
// a short title, ONE line of subtitle («la gente se va a quedar con lo básico del titular y subtitular») and its
// place in its area (`orden`: the three lowest are the ones shown before «Ver más herramientas»).
// A row that is not here still shows, with its area's icon and its page's description.
// Texts are Spanish only: unlike `sitio.*` they are not translated on lighthumanity.org.

export type Herramienta = { Visual: ComponentType; fondo: string; titulo?: string; texto: string; orden: number };

const f = (m: Record<string, unknown>, n: string) => ((m.FONDOS as Record<string, string> | undefined)?.[n]) || 'bg-gradient-to-br from-slate-50 via-white to-sky-50';

export const HERRAMIENTAS: Record<string, Herramienta> = {
  // ── Energía ──
  BDFMUVNYY7WONCF: { Visual: Energia.VisualComercializadora, fondo: f(Energia, 'VisualComercializadora'), orden: 1,
    titulo: 'Autoconsumo remoto', texto: 'Energía solar e hidroeléctrica comunitaria para tu casa, aunque no tengas tejado.' },
  BDFCOMENERGPUE01: { Visual: Energia.VisualComunidadesPueblos, fondo: f(Energia, 'VisualComunidadesPueblos'), orden: 2,
    texto: 'Ayuntamiento y vecinos comparten la energía de los tejados públicos.' },
  BDFSOLSOLIDAR01: { Visual: Energia.VisualSolSolidario, fondo: f(Energia, 'VisualSolSolidario'), orden: 3,
    texto: 'Luz solar para centros de acogida y comunidades sin electricidad.' },
  BDFOPTIMENERGI1: { Visual: Energia.VisualOptimizacionEnergia, fondo: f(Energia, 'VisualOptimizacionEnergia'), orden: 4,
    texto: 'IA y software para toda la cadena de valor de la energía solar.' },
  BDFMVDU4N2KAWOC: { Visual: Energia.VisualTiendaSolar, fondo: f(Energia, 'VisualTiendaSolar'), orden: 5,
    texto: 'Productos solares cuyos beneficios financian proyectos sociales.' },
  // ── Movilidad ──
  BDFMUQWKEQUSG60: { Visual: Movilidad.VisualAeromovil, fondo: f(Movilidad, 'VisualAeromovil'), orden: 1,
    titulo: 'Aeromóvil ultraligero solar', texto: 'Un vehículo en forma de gota que se mueve con muy poca energía. Diseño abierto.' },
  BDFMUVMT739R7FA: { Visual: Movilidad.VisualBarcoSolar, fondo: f(Movilidad, 'VisualBarcoSolar'), orden: 2,
    texto: 'Transporte solar y seguro para 20 pasajeros por el río Amazonas.' },
  BDFMUVNM5UY0H12: { Visual: Movilidad.VisualBicicletaSolar, fondo: f(Movilidad, 'VisualBicicletaSolar'), orden: 3,
    texto: 'Bicicleta eléctrica con remolque solar: 3.890 km por España.' },
  BDFNT02K2JCL25BD: { Visual: Movilidad.VisualTriciclosReparto, fondo: f(Movilidad, 'VisualTriciclosReparto'), orden: 4,
    texto: 'Reparto urbano en triciclos eléctricos cargados con sol.' },
  BDFMWAI4PYUAC65: { Visual: Movilidad.VisualCompeticionSolar, fondo: f(Movilidad, 'VisualCompeticionSolar'), orden: 5,
    titulo: 'Competición de vehículos solares', texto: 'Equipos que diseñan en abierto el vehículo solar más eficiente.' },
  BDFNTODDDY2JEZ5S: { Visual: Movilidad.VisualAptera, fondo: f(Movilidad, 'VisualAptera'), orden: 6,
    titulo: 'Aptera, coche solar', texto: 'El coche de producción más eficiente: hasta 64 km al día solo con sol.' },
  // ── Vivienda ──
  BDFMUZGRQ7R17WS: { Visual: Vivienda.VisualUrbanismoOrganico, fondo: f(Vivienda, 'VisualUrbanismoOrganico'), orden: 1,
    texto: 'Comunidades, pueblos y ciudades autosuficientes integrados en la naturaleza.' },
  BDFNT8S61KE6A88E: { Visual: Vivienda.VisualFabricaCasas, fondo: f(Vivienda, 'VisualFabricaCasas'), orden: 2,
    texto: 'Casas ecológicas de madera, fabricadas en taller y montadas en días.' },
  BDFMUVFNHK2A3AJ: { Visual: Vivienda.VisualViviendasMinimas, fondo: f(Vivienda, 'VisualViviendasMinimas'), orden: 3,
    texto: 'Viviendas pequeñas, eficientes y ecológicas al alcance de todos.' },
  // ── Agricultura ──
  BDFAGRISINTROP1: { Visual: Vivienda.VisualAgriculturaSintropica, fondo: f(Vivienda, 'VisualAgriculturaSintropica'), orden: 1,
    texto: 'Diseña y simula bosques de almendro, olivo, viña y pistacho.' },
  // ── Política ──
  BDFGEOPOLARIZ01: { Visual: VisualGeometria, fondo: 'bg-gradient-to-br from-sky-50 via-white to-amber-50', orden: 1,
    texto: 'Cada partido como una figura: qué cuida y qué deja fuera frente a un ideal.' },
  BDFDEMODIRECT01: { Visual: DemocraciaCompacta, fondo: 'bg-gradient-to-br from-emerald-50 via-white to-sky-50', orden: 2,
    texto: 'Votar cosas concretas, no colores, con los datos de cada tema.' },
  BDFMODELOSOCIO1: { Visual: VisualEconomia, fondo: 'bg-gradient-to-br from-yellow-50 via-white to-teal-50', orden: 3,
    texto: 'Un solo impuesto repartido entre ocho escalas, de la persona al planeta.' },
  BDFOBSERVPOL01: { Visual: VisualObservatorio, fondo: 'bg-gradient-to-br from-rose-50 via-white to-indigo-50', orden: 4,
    texto: 'Cómo está dividida España y cómo se pasa del desacuerdo al enemigo.' },
  BDFPERFILESPOL1: { Visual: VisualPerfiles, fondo: 'bg-gradient-to-br from-amber-50 via-white to-violet-50', orden: 5,
    texto: 'Doce perfiles políticos: su relato, sus contradicciones y cómo se miran.' },
  // ── Economía ──
  BDFNTSTY4XY5SH4B: { Visual: Otras.VisualCrowd, fondo: f(Otras, 'VisualCrowd'), orden: 1,
    titulo: 'Solar Crowd', texto: 'Préstamos colectivos para instalar energía solar donde más se necesita.' },
  // ── Informática ──
  // ── Seguridad ──
  BDFDESMILITAR01: { Visual: Seguridad.VisualDesmantelamiento, fondo: f(Seguridad, 'VisualDesmantelamiento'), orden: 1,
    titulo: 'Desmantelamiento militar progresivo', texto: 'De los ejércitos a una seguridad cercana y en paz, paso a paso. En construcción.' },
  // ── Salud ──
  BDFSALUDMEDIC01: { Visual: Salud.VisualConocimientoMedicina, fondo: f(Salud, 'VisualConocimientoMedicina'), orden: 1,
    titulo: 'Conocimiento de la medicina', texto: 'Una plataforma que une todas las ramas de la medicina en un solo mapa.' },
  BDFMVDP4SCGRXS9: { Visual: Otras.VisualHumanityWiki, fondo: f(Otras, 'VisualHumanityWiki'), orden: 1,
    texto: 'El conocimiento de la humanidad, abierto y organizado por territorio.' },
  // ── Cultura y conciencia ──
  BDFCONCIENCIASH1: { Visual: Otras.VisualConciencia, fondo: f(Otras, 'VisualConciencia'), orden: 1,
    texto: 'El mapa de la teoría sintérgica de Jacobo Grinberg.' },
  BDFNTSJZVW6PBDPQ: { Visual: Otras.VisualFestivalArte, fondo: f(Otras, 'VisualFestivalArte'), orden: 2,
    texto: 'Encuentros artísticos para explorar la conciencia del ser humano.' },
};

/** Each area: its short name and one line. Keys are those of `IconoArea`. */
export const AREAS: Record<string, { nombre: string; corto?: string; lema: string }> = {
  energia: { nombre: 'Energía', lema: 'Energía limpia, local y al alcance de todos.' },
  movilidad: { nombre: 'Movilidad', lema: 'Moverse con muy poca energía, por tierra y por agua.' },
  politica: { nombre: 'Política', lema: 'Herramientas para entender la política y decidir mejor.' },
  economia: { nombre: 'Economía', lema: 'Dinero que financia lo que de verdad importa.' },
  vivienda: { nombre: 'Vivienda', lema: 'Hogares y pueblos ecológicos, integrados en la naturaleza.' },
  agricultura: { nombre: 'Agricultura', lema: 'Cultivos que regeneran la tierra.' },
  informatica: { nombre: 'Informática', lema: 'Conocimiento abierto para toda la humanidad.' },
  conciencia: { nombre: 'Cultura y conciencia', corto: 'Conciencia', lema: 'Arte y ciencia para explorar la conciencia.' },
  salud: { nombre: 'Salud', lema: 'Todo lo que se sabe de la salud, unido y al alcance de todos.' },
  seguridad: { nombre: 'Seguridad', lema: 'Una protección cercana, que cuida la paz y la libertad.' },
};

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** The area key of a sector of `sitio.sectores`, by its icon (or, failing that, its title). */
export function areaDeIcono(icono: string, titulo = ''): string {
  const t = sinTildes(`${icono} ${titulo}`);
  if (/salud|medicin/.test(t)) return 'salud';
  if (/seguridad|defensa/.test(t)) return 'seguridad';
  if (/energ/.test(t)) return 'energia';
  if (/movilidad/.test(t)) return 'movilidad';
  if (/politic/.test(t)) return 'politica';
  if (/econom/.test(t)) return 'economia';
  if (/vivienda/.test(t)) return 'vivienda';
  if (/agricult|alimenta/.test(t)) return 'agricultura';
  if (/informat|otras/.test(t)) return 'informatica';
  if (/educa|cultura|concien|arte/.test(t)) return 'conciencia';
  return 'informatica';
}

import * as THREE from 'three';
import type { PivoteGaraje, VehiculoGaraje } from './tipos';
import { PARAMETROS_BASCULANTE, crearModelo, type Modelo, type Parametros } from '../geometria';
import { posarBasculante, type CapaB } from '../basculante/modelo3d';
import { PARAMETROS_SMERA, SMERA_REF } from '../basculante/smera';
import type { ModeloBasculante } from '../geometriaBasculante';

/*
 * Lumeneo Smera: a French four-wheel tilting electric tandem (1 + 1), shown
 * at the Paris Motor Show in October 2008.
 *
 * 2026-11-15, the replica (Eugenio: «recréalo esta vez más fiel a la realidad…
 * que incluso se abran las puertas… haz también el piloto e interior… permite
 * que también bascule»): it is now the Cuadriciclo Basculante's own model with
 * the Smera's body (`qCarroceria: 'smera'`, basculante/smera.ts), its lines
 * traced from Lumeneo's press photos. So it has the real linkage, both doors
 * open, the driver and the passenger are inside, and «Crear editable» saves
 * exactly this car as a design to change. `scripts/smera-realidad.ts` scores
 * how close it is to the photos. The first model (smeraForma/smeraModelo,
 * built from figures with no photo) is gone. Added 2026-11-15 (Eugenio: «falta
 * un vehículo de cuatro ruedas basculantes entre la moto y el microcoche tipo
 * Twizy… ahí añade el vehículo Lumeneo Smera»). A fixed reference car: the
 * editable design family inspired by it is another branch's work.
 *
 * WHICH SMERA. Two sets of figures are published and they do not agree:
 * - The 2008 show car, the same in three independent sources: 2 380–2 400 ×
 *   800 mm, 1 450 mm high, wheelbase 1 700 mm, track 655 mm front and rear,
 *   350 kg (770 lb), two motors, 30 kW (40 hp) in all, 1 000 N·m at the
 *   wheels, 130 km/h (80 mph), 0–100 km/h in 8 s, 150 km of range.
 *   · auto-swiat.pl, «Lumeneo Smera: samochód z szerokością motocykla»
 *     (https://www.auto-swiat.pl/wiadomosci/aktualnosci/lumeneo-smera-samochod-z-szerokoscia-motocykla/88z4s47):
 *     every figure above, the only source with the height and the wheelbase.
 *   · seriouswheels.com, «2009 Lumeneo Smera» (https://seriouswheels.com/2009-lumeneo-smera.htm):
 *     2.40 m × 80 cm, 770 lb, 40 hp, 80 mph, 0–62 mph in 8 s; the tilt is set
 *     by a computer from an inertial unit and «a DC servo-motor moves the
 *     cabin and the four wheels».
 *   · caradisiac.com, «Lumeneo Smera en direct: l'ORNI du Mondial»
 *     (https://www.caradisiac.com/Lumeneo-Smera-en-direct-l-ORNI-du-Mondial-53890.htm):
 *     80 cm wide, 2.40 m long, two seats one behind the other, 130 km/h, 0–100 in 8 s, 150 km.
 * - The later pre-series car: 2 500 × 960 mm, track 655 mm, 110 km/h, 100 km,
 *   «tilts up to 25° in curves» (Wikipedia, «Lumeneo SMERA»,
 *   https://en.wikipedia.org/wiki/Lumeneo_SMERA); 2.50 m × 86 cm, 30 kW, a
 *   10 kWh lithium-ion battery under the driver's seat, 110 km/h, the tilt
 *   driven by actuators at the dampers (techno-science.net,
 *   https://www.techno-science.net/fr/dossiers/lumeneo-smera-entre-scooter-et-voiture-41);
 *   96 cm wide, 550 kg «en orden de marcha», a 9 kWh battery, about €25 000
 *   (diariomotor.com, 8 October 2012,
 *   https://www.diariomotor.com/tecmovia/2012/10/08/lumeneo-smera-mas-adaptado-que-el-twizy-pero-mas-caro/).
 * The garage shows the 2008 car: it is the only one with a complete,
 * consistent set (height and wheelbase are only published for it), and its
 * track is the same as the later car's. The 25° lean is from Wikipedia, about
 * the later car; nothing suggests the linkage changed.
 *
 * - auto123.com, «The Lumeneo Smera prototype» (page 2), as cited by the
 *   cornering circuit's table (`circuito/datos.ts`; that page was not fetched
 *   from here): 2 500 × 860 × 1 480 mm, wheelbase 1 700 mm, track 655 mm,
 *   500 kg with batteries, 145/70 R14, 130 km/h, a 20° lean. The tyres are
 *   the only published size, so the model uses them.
 * Not published for either: ground clearance, the centre of gravity, a drag
 * coefficient or a frontal area.
 * The circuit (merged 2026-11-15) reads the wheelbase, the tracks and the
 * height from this car: the wheelbase and tracks are the same in every
 * source; the height here is the 2008 car's 1.45 m (auto123: 1.48 m).
 *
 * MEASURED on the photos (basculante/smera.ts): the overhangs, the 0.29 m
 * sill, the roof line, the windows, the door, the lamps, the 0.52 m tyres.
 * ESTIMATED: the linkage's geometry, the masses, the inside.
 */

/** The replica's parameters: this family's defaults with the Smera's own. */
export const PARAMETROS_REPLICA_SMERA = { ...PARAMETROS_BASCULANTE, ...PARAMETROS_SMERA } as unknown as Parametros;
let modelo: ModeloBasculante | null = null;
const modeloSmera = () => modelo ?? (modelo = crearModelo(PARAMETROS_REPLICA_SMERA) as ModeloBasculante);

/**
 * The viewer's builder for a design (Visor3D's `construirDisenoGaraje`), registered by the viewer: this file cannot
 * import it (the viewer imports the garage).
 */
type Constructor = (m: Modelo) => { grupo: THREE.Group; pivotes: PivoteGaraje[] };
let constructor: Constructor | null = null;
export function registrarConstructorSmera(f: Constructor) { constructor = f; }
let pivotes: PivoteGaraje[] | null = null;

/**
 * The Smera's dynamics, for the cornering simulation (circuito/datos.ts reads the garage car's sizes). Metres,
 * kilograms, degrees. `estimado` lists the fields that are not published figures.
 */
export const SMERA_DINAMICA = {
  /** Kerb mass of the 2008 show car (auto-swiat.pl; seriouswheels.com gives 770 lb = 349 kg). The later car: 550 kg (diariomotor.com). */
  masa: 350,
  masaVersionPosterior: 550,
  viaDel: PARAMETROS_SMERA.qViaDel, viaTras: PARAMETROS_SMERA.qViaTras,
  batalla: SMERA_REF.batalla,
  /** Maximum lean, either way (Wikipedia: «tilts up to 25° in curves»; auto123.com: 20°). */
  inclinacionMax: PARAMETROS_SMERA.qBascMax,
  /** Centre of gravity height, kerb and with the driver: ESTIMATED (the replica's own mass list gives its values). */
  alturaCdg: 0.48,
  alturaCdgConConductor: 0.55,
  neumaticos: { delante: '145/70 R14', detras: '145/70 R14', diametro: 0.52, ancho: 0.145 },
  potenciaKw: 30, vmaxKmh: 130, plazas: 2,
  estimado: ['alturaCdg', 'alturaCdgConConductor'],
} as const;

export const VEHICULO: VehiculoGaraje = {
  id: 'smera', nombre: 'Lumeneo Smera (2008)',
  largo: 2.38, ancho: 0.80, alto: 1.45, batalla: SMERA_REF.batalla, viaDel: PARAMETROS_SMERA.qViaDel, viaTras: PARAMETROS_SMERA.qViaTras,
  masa: SMERA_DINAMICA.masa,
  fuente: 'Cuadriciclo basculante francés, dos plazas una detrás de otra, presentado en el Salón de París de 2008. auto-swiat.pl: 2 380 × 800 × 1 450 mm, batalla 1 700 mm, vías 655 / 655 mm, 350 kg, dos motores de 30 kW en total (40 CV), 130 km/h, 0–100 en 8 s, 150 km de autonomía. seriouswheels.com y caradisiac.com: 2,40 m × 80 cm, 770 lb (349 kg), y que un servomotor inclina la cabina y las cuatro ruedas. Wikipedia: se inclina hasta 25° en las curvas. auto123.com: dos puertas, 1+1 plazas, el asiento del conductor se abate para pasar atrás, pantalla LCD, neumáticos 145/70 R14. La réplica (2026-11-15) está calcada de las fotos de prensa de Lumeneo: la línea del techo, la panza a 0,29 m, las ventanas, la puerta, los faros, las ruedas de 0,52 m medidas en la foto. Estimado: el paralelogramo, las masas y el interior. No hay Cd publicado.',
  get envolvente() { return modeloSmera().F.envolvente(); },
  seccion: SMERA_REF.nU,
  construir: () => {
    // the design's group inside one that the viewer places; the inner one leans (`bascula`)
    if (!constructor) throw new Error('El visor no ha registrado el constructor del Smera');
    const { grupo, pivotes: p } = constructor(modeloSmera());
    pivotes = p; grupo.name = 'bascula';
    const fuera = new THREE.Group(); fuera.add(grupo); return fuera;
  },
  get pivotes() { if (!pivotes && constructor) { const r = constructor(modeloSmera()); pivotes = r.pivotes; r.grupo.traverse((o: any) => o.geometry?.dispose?.()); } return pivotes ?? []; },
  bascula: {
    angulo: PARAMETROS_SMERA.qBascMax,
    poner: (grupo: THREE.Object3D, f: number) => {
      const b = grupo.getObjectByName('bascula'), m = modeloSmera(); if (!b) return;
      const phi = f * m.phiMax; b.rotation.x = phi;
      const G = b.userData.capas as Record<CapaB, THREE.Group> | undefined; if (G) posarBasculante(G, m, phi, 0);
    },
  },
};

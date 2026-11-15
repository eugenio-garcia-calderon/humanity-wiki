// ============================================================================
// CUADRICICLO BASCULANTE · body «como el Lumeneo Smera» (2026-11-15)
// ============================================================================
// Eugenio: «mejora el modelo del Lumeneo Smera… recréalo esta vez más fiel a la
// realidad, a un nivel extraordinario, que incluso se abran las puertas… y a
// partir de esa réplica permite crear un modelo 3D editable… más alargado, más
// bajito, que el conductor vaya un poco más reclinado, y ponerle paneles
// solares en el techo y cola».
//
// The replica is this family's own model with the body `qCarroceria: 'smera'`:
// the same tilting linkage, masses, checks, tunnel and circuit, and the same
// sliders, so «hacer editable» is just saving it as a design.
//
// THE LINES. Traced by hand from Lumeneo's press side view of the car (the
// silver one on a grey background with the logo), which Eugenio sent: the two
// wheel centres are 328.7 px apart, the published wheelbase is 1.70 m, so the
// scale is 193.4 px/m; the ground is the tyres' bottom. Every number below is
// that tracing in metres (x from the front axle, + forwards; y from the ground).
// Checked against the press front view (widths at seven heights) and the
// published sizes: 2 380 × 800 × 1 450 mm (the 2008 Paris car, auto-swiat.pl,
// seriouswheels.com, caradisiac.com). The photo gives 2.33 m from the bumper
// bar to the tail and a 1.437 m roof. The tyres measure 0.52 m across in it
// (auto123.com publishes 145/70 R14, 0.56 m, for the later prototype).
// `scripts/smera-realidad.ts` scores the model against all of it.
//
// Pure (no three.js): the model, the checks, the tunnel and the 3D read it.

/** The reference car as traced (m). */
export const SMERA_REF = {
  batalla: 1.70,
  /** the body's nose (the bumper bar reaches 7.7 cm further) and the tail's back face */
  morro: 0.25, cola: 0.305,
  /** the roof's highest point and the sill (the belly between the wheels) */
  alto: 1.437, suelo: 0.29,
  /** the body's widest (at the belt, about 0.85 m up) */
  ancho: 0.80,
  /** the roof line, nose to tail */
  techo: [
    [0.250, 0.430], [0.234, 0.476], [0.214, 0.564], [0.180, 0.649], [0.137, 0.735], [0.051, 0.843], [-0.057, 0.941],
    [-0.164, 1.050], [-0.272, 1.144], [-0.380, 1.210], [-0.531, 1.284], [-0.634, 1.334], [-0.747, 1.391], [-0.897, 1.418],
    [-1.069, 1.433], [-1.242, 1.437], [-1.414, 1.433], [-1.565, 1.429], [-1.736, 1.418], [-1.844, 1.400], [-1.900, 1.320],
    [-1.945, 1.190], [-1.975, 1.100], [-1.993, 0.990], [-2.003, 0.900], [-2.005, 0.860],
  ] as [number, number][],
  /** the belly on the centre line: up to the nose's tip, flat between the wheels, rising under the tail */
  bajos: [[0.250, 0.430], [0.220, 0.340], [0.150, 0.300], [0.0, 0.290], [-1.400, 0.290], [-1.700, 0.300], [-1.850, 0.330], [-1.950, 0.400], [-1.990, 0.480], [-2.005, 0.540]] as [number, number][],
  /** the half-width in plan */
  ancho2: [[0.250, 0.250], [0.200, 0.300], [0.120, 0.335], [0.0, 0.360], [-0.200, 0.388], [-0.400, 0.400], [-1.500, 0.400], [-1.750, 0.390], [-1.900, 0.372], [-1.950, 0.355], [-1.975, 0.335], [-1.993, 0.300], [-2.003, 0.255], [-2.005, 0.240]] as [number, number][],
  /** the section: the upper half's and the lower half's exponents, the waist's height (fraction, belly → roof) */
  nU: 2.0, nL: 2.0, centro: 0.48,
  /** the waist's height (m): the press front view is widest 0.85 m up, and narrows a lot below, a keel between the wheels */
  cintura: 0.85,
  /** the lower half: a bathtub falling from a shoulder at the waist to a flat floor 0.42 m wide (the front view's widths) */
  quilla: { zb: 0.21, p: 0.8 },
  /** the nose's rounded cap: its length (m) and roundness */
  capLargo: 0.06, capRedondo: 0.95,
  // ── what is drawn on it (side view: x, y)
  /** the door: its outline, front edge first (vertical, hinge), then up the A-pillar, along the roof edge, down the curved back edge */
  puerta: [[-0.386, 0.300], [-0.392, 0.894], [-0.560, 1.120], [-0.745, 1.362], [-1.370, 1.362], [-1.430, 1.120], [-1.460, 0.874], [-1.415, 0.708], [-1.297, 0.569], [-1.180, 0.476], [-1.062, 0.415], [-0.700, 0.330]] as [number, number][],
  /** the door's window and the rear quarter window */
  ventana: [[-0.555, 1.000], [-1.330, 1.132], [-1.335, 1.350], [-0.790, 1.350]] as [number, number][],
  ventanaTras: [[-1.390, 1.150], [-1.651, 1.149], [-1.543, 1.364], [-1.390, 1.364]] as [number, number][],
  /** the windscreen: its foot (the black mask under it ends there) and the A-pillar, from its foot to the roof */
  capoAlto: 0.985, mascaraBaja: 0.800, pilarA: [[-0.392, 0.894], [-0.745, 1.362]] as [number, number][],
  /** the rear window: from the roof's end down to the tail's top */
  lunetaX: -1.850,
  /** the door handle (its centre) */
  manilla: [-1.265, 0.965] as [number, number],
  /** the bumper bar at the front, low between the wheels: x from–to, y from–to, half-width */
  barra: { x0: 0.10, x1: 0.327, y0: 0.25, y1: 0.38, hz: 0.31 },
  /** the roof's back edge, a visor over the rear window, with a fin each side */
  visera: [[-1.790, 1.398], [-1.915, 1.386], [-1.930, 1.360], [-1.800, 1.366]] as [number, number][],
  aleta: [[-1.840, 1.390], [-1.925, 1.392], [-1.935, 1.180], [-1.890, 1.230]] as [number, number][],
  /** the headlamp clusters (front view): centre height, centre off the centre line, height and width of the housing */
  faro: { y: 0.905, z: 0.272, alto: 0.37, ancho: 0.15 },
  /** the tail: two round lamps a side (height, off-centre), the plate and the bumper (heights) */
  pilotos: [[0.86, 0.285], [0.73, 0.285]] as [number, number][],
  matricula: { y: 0.63, ancho: 0.20, alto: 0.11 }, paragolpesTras: { y0: 0.45, y1: 0.53, hz: 0.31 },
  /** the mudguards over the wheels: from–to, angle from the top (°, − forwards) */
  guardabarrosDel: [-42, 45] as [number, number], guardabarrosTras: [-52, 59] as [number, number],
} as const;

/** The replica's own parameters: the Smera as Lumeneo showed it in 2008, with this family's sliders. */
export const PARAMETROS_SMERA = {
  disposicion: 'basculante', qCarroceria: 'smera', qRuedasDel: 'morro',
  qMorro: 0.25, qCola: 0.305, qBatalla: 1.70, qAlto: 1.437, qAncho: 0.80, qSuelo: 0.29,
  qSeccion: 2.0, qPanza: 2.0, qCentro: 0.48,
  qViaDel: 0.655, qViaTras: 0.655, qRuedaDel: 's14', qRuedaTras: 's14', qBascMax: 25, qGiro: 27,
  qPasoHueco: 0.025, qPasoAbre: 0.45,
  // the two upright, the driver over the front of the door, the passenger behind and higher, his feet beside the seat
  qPilX: 0.52, qPilY: 0.40, qRecPil: 22, qPasX: 1.17, qPasY: 0.46, qRecPas: 24, qPedX: -0.05, qPedY: 0.0,
  qSolarTecho: 'no', qSolarMorro: 'no', qSolarCola: 'no',
  qMatCarenado: 'vidrio', qEspCarenado: 2.4, qKWNom: 15, qKWPico: 30, qKWh: 3, qVel: 80,
} as const;

/** The map from the reference car to a design: x stretches by part (nose, wheelbase, tail), y by the height over the sill. */
export interface MapaSmera {
  x: (x: number) => number; y: (y: number) => number; hz: (z: number) => number;
  /** the scale along x in the wheelbase and of the height (for sizes of the details) */
  kx: number; ky: number; kz: number;
}
export function mapaSmera(d: { morro: number; cola: number; batalla: number; alto: number; suelo: number; ancho: number }): MapaSmera {
  const R = SMERA_REF, kM = d.morro / R.morro, kB = d.batalla / R.batalla, kC = d.cola / R.cola;
  const ky = (d.alto - d.suelo) / (R.alto - R.suelo), kz = d.ancho / R.ancho;
  return {
    x: x => x >= 0 ? x * kM : x >= -R.batalla ? x * kB : -d.batalla + (x + R.batalla) * kC,
    y: y => d.suelo + (y - R.suelo) * ky,
    hz: z => z * kz,
    kx: kB, ky, kz,
  };
}

/** The body's lines for crearForma, mapped to a design. */
export function perfilSmera(M: MapaSmera) {
  const R = SMERA_REF;
  return {
    techo: R.techo.map(([x, y]) => [M.x(x), M.y(y)] as [number, number]),
    bajos: R.bajos.map(([x, y]) => [M.x(x), M.y(y)] as [number, number]),
    ancho: R.ancho2.map(([x, z]) => [M.x(x), M.hz(z)] as [number, number]),
    cintura: M.y(R.cintura),
    quilla: { zb: M.hz(R.quilla.zb), p: R.quilla.p },
  };
}

/** A side-view polygon mapped to a design. */
export const mapearPoligono = (M: MapaSmera, p: readonly (readonly [number, number])[]) => p.map(([x, y]) => [M.x(x), M.y(y)] as [number, number]);

/** Is (x, y) inside a polygon (side view)? */
export function dentroPoligono(p: readonly (readonly [number, number])[], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Everything drawn on the replica, mapped to the design (side-view polygons, heights, positions). */
export function detallesSmera(M: MapaSmera) {
  const R = SMERA_REF, pol = (p: readonly (readonly [number, number])[]) => mapearPoligono(M, p);
  const pilar = pol(R.pilarA);
  return {
    puerta: pol(R.puerta), ventana: pol(R.ventana), ventanaTras: pol(R.ventanaTras),
    capoAlto: M.y(R.capoAlto), mascaraBaja: M.y(R.mascaraBaja),
    /** the A-pillar's x at a height (it leans back), and the roof's front (the windscreen's top) */
    pilarX: (y: number) => { const [[x0, y0], [x1, y1]] = pilar; const t = (y - y0) / (y1 - y0); return x0 + (x1 - x0) * t; },
    techoIni: pilar[1][0], lunetaX: M.x(R.lunetaX),
    manilla: [M.x(R.manilla[0]), M.y(R.manilla[1])] as [number, number],
    barra: { x0: M.x(R.barra.x0), x1: M.x(R.barra.x1), y0: M.y(R.barra.y0), y1: M.y(R.barra.y1), hz: M.hz(R.barra.hz) },
    visera: pol(R.visera), aleta: pol(R.aleta),
    faro: { y: M.y(R.faro.y), z: M.hz(R.faro.z), alto: R.faro.alto * M.ky, ancho: R.faro.ancho * M.kz },
    pilotos: R.pilotos.map(([y, z]) => [M.y(y), M.hz(z)] as [number, number]),
    matricula: { y: M.y(R.matricula.y), ancho: R.matricula.ancho, alto: R.matricula.alto },
    paragolpesTras: { y0: M.y(R.paragolpesTras.y0), y1: M.y(R.paragolpesTras.y1), hz: M.hz(R.paragolpesTras.hz) },
    guardabarrosDel: R.guardabarrosDel, guardabarrosTras: R.guardabarrosTras,
  };
}
export type DetallesSmera = ReturnType<typeof detallesSmera>;

import { Territory, Challenge, Cause, Solution, Indicator, Organization, Project, Content, Objective } from '../types';

export const objectives: Objective[] = [
  { 
    id: "O001", 
    title: "AGUA", 
    description: "Acceso a agua potable segura", 
    indicator_ids: [], 
    challenge_ids: [],
    progress_by_territory: { "T001": 74, "T002": 100, "T003": 98, "T004": 99, "T005": 100, "T014": 85, "T017": 92, "T006": 78, "T007": 91, "T008": 99, "T009": 98, "T018": 95, "T019": 96, "T020": 98, "T021": 99, "T022": 98, "T023": 99, "T024": 96, "T025": 97, "T026": 96, "T027": 99, "T028": 97, "T029": 99, "T030": 99, "T031": 98 } 
  },
  { 
    id: "O002", 
    title: "ALIMENTACIÓN", 
    description: "Seguridad alimentaria, nutrición y acceso estable a alimentos", 
    indicator_ids: [], 
    challenge_ids: [],
    progress_by_territory: { "T001": 63, "T002": 89, "T003": 86, "T004": 90, "T005": 89, "T014": 70, "T017": 95, "T006": 68, "T007": 82, "T008": 86, "T009": 83, "T018": 82, "T019": 88, "T020": 90, "T021": 80, "T022": 78, "T023": 90, "T024": 85, "T025": 87, "T026": 84, "T027": 91, "T028": 79, "T029": 91, "T030": 92, "T031": 90 } 
  },
  { 
    id: "O003", 
    title: "VIVIENDA", 
    description: "Acceso a vivienda digna, segura, saludable y asequible", 
    indicator_ids: [], 
    challenge_ids: [],
    progress_by_territory: { "T001": 59, "T002": 72, "T003": 67, "T004": 57, "T005": 82, "T014": 60, "T017": 88, "T006": 58, "T007": 71, "T008": 60, "T009": 62, "T018": 63, "T019": 72, "T020": 67, "T021": 55, "T022": 57, "T023": 70, "T024": 72, "T025": 74, "T026": 73, "T027": 71, "T028": 63, "T029": 79, "T030": 68, "T031": 78 } 
  },
  { 
    id: "O004", 
    title: "SALUD", 
    description: "Esperanza de vida, prevención y acceso a servicios sanitarios", 
    indicator_ids: [], 
    challenge_ids: [],
    progress_by_territory: { "T001": 68, "T002": 89, "T003": 91, "T004": 93, "T005": 91, "T014": 80, "T017": 90, "T006": 71, "T007": 84, "T008": 91, "T009": 90, "T018": 88, "T019": 91, "T020": 92, "T021": 91, "T022": 89, "T023": 92, "T024": 90, "T025": 92, "T026": 88, "T027": 93, "T028": 89, "T029": 94, "T030": 94, "T031": 93 } 
  },
  { 
    id: "O005", 
    title: "CONVIVENCIA", 
    description: "Paz social, seguridad, libertades, cohesión y confianza institucional", 
    indicator_ids: [], 
    challenge_ids: [],
    progress_by_territory: { "T001": 57, "T002": 85, "T003": 85, "T004": 87, "T005": 94, "T014": 75, "T017": 98, "T006": 52, "T007": 69, "T008": 79, "T009": 80, "T018": 78, "T019": 88, "T020": 87, "T021": 82, "T022": 79, "T023": 89, "T024": 84, "T025": 89, "T026": 82, "T027": 90, "T028": 77, "T029": 91, "T030": 88, "T031": 90 } 
  },
  { 
    id: "O006", 
    title: "ECOSISTEMAS", 
    description: "Estado de los ecosistemas, resiliencia ecológica y conservación", 
    indicator_ids: [], 
    challenge_ids: [],
    progress_by_territory: { "T001": 49, "T002": 70, "T003": 76, "T004": 61, "T005": 90, "T014": 65, "T017": 85, "T006": 66, "T007": 72, "T008": 71, "T009": 69, "T018": 68, "T019": 82, "T020": 78, "T021": 66, "T022": 64, "T023": 84, "T024": 79, "T025": 86, "T026": 81, "T027": 85, "T028": 58, "T029": 90, "T030": 81, "T031": 87 } 
  }
];

export const territories: Territory[] = [
  { id: "T010", type: "continent", name: "África", parent_id: "T001", description: "Perfil territorial continental.", key_indicators: [], active_challenges: [], featured_objectives: [], coordinates: [17.0, 8.0] },
  { id: "T011", type: "country", name: "Italia", parent_id: "T002", description: "Perfil territorial nacional.", key_indicators: [], active_challenges: [], featured_objectives: [], coordinates: [12.5, 41.8] },
  { id: "T012", type: "country", name: "Guinea Ecuatorial", parent_id: "T010", description: "Perfil territorial nacional.", key_indicators: [], active_challenges: [], featured_objectives: [], coordinates: [10.2, 1.6] },
  { id: "T013", type: "country", name: "Etiopía", parent_id: "T010", description: "Perfil territorial nacional.", key_indicators: [], active_challenges: [], featured_objectives: [], coordinates: [39.7, 9.1] },
  { id: "T014", type: "municipality", name: "Talamanca del Jarama", parent_id: "T004", description: "Municipio de la Comunidad de Madrid.", key_indicators: [], active_challenges: [], featured_objectives: [], coordinates: [-3.515, 40.745] },
  { id: "T001", type: "planet", name: "Mundo", parent_id: null, description: "Perfil global del planeta para explorar el estado de la humanidad, los ecosistemas y los grandes retos sistémicos.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [0.0, 0.0] },
  { id: "T002", type: "continent", name: "Europa", parent_id: "T001", description: "Perfil territorial continental.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [15.2, 54.5] },
  { id: "T003", type: "country", name: "España", parent_id: "T002", description: "Perfil territorial nacional.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-3.703, 40.416] },
  { id: "T004", type: "region", name: "Comunidad de Madrid", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-3.702, 40.416] },
  { id: "T008", type: "region", name: "Cataluña", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [1.820, 41.820] },
  { id: "T009", type: "region", name: "Comunidad Valenciana", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-0.376, 39.469] },
  { id: "T005", type: "municipality", name: "Montejo de la Sierra", parent_id: "T004", description: "Perfil de la comunidad de la Sierra.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-3.530, 41.060] },
  { id: "T006", type: "continent", name: "Latinoamérica", parent_id: "T001", description: "Perfil territorial continental de Latinoamérica.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-60.0, -15.0] },
  { id: "T007", type: "country", name: "Argentina", parent_id: "T006", description: "Perfil territorial nacional de Argentina.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-63.6, -38.4] },
  { id: "T015", type: "region", name: "Ciudad de Buenos Aires", parent_id: "T007", description: "Perfil territorial de la Ciudad Autónoma de Buenos Aires.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-58.381, -34.603] },
  { id: "T016", type: "municipality", name: "Villa General Belgrano", parent_id: "T007", description: "Perfil municipal de Villa General Belgrano (Córdoba).", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-64.556, -31.977] },
  { id: "T017", type: "comunidad_vecinos", name: "Villabosque", parent_id: "T014", description: "Comunidad de Vecinos en Talamanca del Jarama.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-3.520, 40.750] }
,
  { id: "T018", type: "region", name: "Andalucía", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-4.77, 37.38] },
  { id: "T019", type: "region", name: "Aragón", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-0.88, 41.65] },
  { id: "T020", type: "region", name: "Principado de Asturias", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-5.84, 43.36] },
  { id: "T021", type: "region", name: "Illes Balears", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [2.88, 39.56] },
  { id: "T022", type: "region", name: "Canarias", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-15.53, 28.29] },
  { id: "T023", type: "region", name: "Cantabria", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-4.03, 43.18] },
  { id: "T024", type: "region", name: "Castilla-La Mancha", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-3, 39.5] },
  { id: "T025", type: "region", name: "Castilla y León", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-4.72, 41.65] },
  { id: "T026", type: "region", name: "Extremadura", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-6.34, 39.47] },
  { id: "T027", type: "region", name: "Galicia", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-7.86, 42.75] },
  { id: "T028", type: "region", name: "Región de Murcia", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-1.13, 37.99] },
  { id: "T029", type: "region", name: "Comunidad Foral de Navarra", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-1.64, 42.81] },
  { id: "T030", type: "region", name: "País Vasco", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-2.67, 42.98] },
  { id: "T031", type: "region", name: "La Rioja", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-2.44, 42.27] },
  { id: "T032", type: "region", name: "Ceuta", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-5.31, 35.88] },
  { id: "T033", type: "region", name: "Melilla", parent_id: "T003", description: "Perfil regional de la comunidad autónoma.", key_indicators: [], active_challenges: [], featured_objectives: ["O001", "O002", "O003", "O004", "O005", "O006"], coordinates: [-2.93, 35.29] }];

export const challenges: Challenge[] = [
  {
    "id": "R001",
    "title": "Escasez de agua",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Escasez de agua",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S001",
      "S002",
      "S003"
    ],
    "objectives": [
      "O001"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R002",
    "title": "Sequías",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Sequías",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S004",
      "S005",
      "S006"
    ],
    "objectives": [
      "O001"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R003",
    "title": "Desperdicio alimentario",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Desperdicio alimentario",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S007",
      "S008",
      "S009"
    ],
    "objectives": [
      "O002"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R004",
    "title": "Acceso vivienda",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Acceso vivienda",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S010",
      "S011",
      "S012"
    ],
    "objectives": [
      "O003"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R005",
    "title": "Pobreza energética",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Pobreza energética",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S013",
      "S014",
      "S015"
    ],
    "objectives": [
      "O003"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R006",
    "title": "Envejecimiento",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Envejecimiento",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S016",
      "S017",
      "S018"
    ],
    "objectives": [
      "O004"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R007",
    "title": "Listas espera",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Listas espera",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S019",
      "S020",
      "S021"
    ],
    "objectives": [
      "O004"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R008",
    "title": "Salud mental",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Salud mental",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S022",
      "S023",
      "S024"
    ],
    "objectives": [
      "O004"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R009",
    "title": "Contaminación aire",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Contaminación aire",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S025",
      "S026",
      "S027"
    ],
    "objectives": [
      "O004"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R010",
    "title": "Baja natalidad",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Baja natalidad",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S028",
      "S029",
      "S030"
    ],
    "objectives": [
      "O005"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R011",
    "title": "Despoblación",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Despoblación",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S031",
      "S032",
      "S033"
    ],
    "objectives": [
      "O005"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R012",
    "title": "Desigualdad",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Desigualdad",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S034",
      "S035",
      "S036"
    ],
    "objectives": [
      "O005"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R013",
    "title": "Corrupción",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Corrupción",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S037",
      "S038",
      "S039"
    ],
    "objectives": [
      "O005"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R014",
    "title": "Desinformación",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Desinformación",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S040",
      "S041",
      "S042"
    ],
    "objectives": [
      "O005"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R015",
    "title": "Delincuencia",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Delincuencia",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S043",
      "S044",
      "S045"
    ],
    "objectives": [
      "O005"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R016",
    "title": "Dependencia energética",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Dependencia energética",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S046",
      "S047",
      "S048"
    ],
    "objectives": [
      "O005"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R017",
    "title": "Incendios",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Incendios",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S049",
      "S050",
      "S051"
    ],
    "objectives": [
      "O006"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R018",
    "title": "Plásticos",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Plásticos",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S052",
      "S053",
      "S054"
    ],
    "objectives": [
      "O006"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R019",
    "title": "Biodiversidad",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Biodiversidad",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S055",
      "S056",
      "S057"
    ],
    "objectives": [
      "O006"
    ],
    "indicators": [],
    "progress": 0
  },
  {
    "id": "R020",
    "title": "Inundaciones",
    "scope": "global",
    "territory_ids": ["T003"],
    "description": "Inundaciones",
    "priority": "medium",
    "sectors": [],
    "causes": [],
    "solutions": [
      "S058",
      "S059",
      "S060"
    ],
    "objectives": [
      "O006"
    ],
    "indicators": [],
    "progress": 0
  }
];

export const causes: Cause[] = [
  { id: "C001", title: "Dependencia de combustibles fósiles", challenge_ids: ["R001"], type: "structural" },
  { id: "C002", title: "Infraestructura energética insuficiente", challenge_ids: ["R001"], type: "structural" },
  { id: "C003", title: "Barreras regulatorias y financieras", challenge_ids: ["R001"], type: "institutional" },
  { id: "C301", title: "Baja generación renovable local", challenge_ids: ["R301"], type: "technical" },
  { id: "C302", title: "Ausencia de almacenamiento suficiente", challenge_ids: ["R301"], type: "technical" }
];

export const solutions: Solution[] = [
  {
    "id": "S001",
    "title": "Desalación",
    "challenge_ids": [
      "R001"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Desalación"
  },
  {
    "id": "S002",
    "title": "Reutilización",
    "challenge_ids": [
      "R001"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Reutilización"
  },
  {
    "id": "S003",
    "title": "Modernizar regadío",
    "challenge_ids": [
      "R001"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Modernizar regadío"
  },
  {
    "id": "S004",
    "title": "Embalses",
    "challenge_ids": [
      "R002"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Embalses"
  },
  {
    "id": "S005",
    "title": "Restauración hidrológica",
    "challenge_ids": [
      "R002"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Restauración hidrológica"
  },
  {
    "id": "S006",
    "title": "Gestión consumo",
    "challenge_ids": [
      "R002"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Gestión consumo"
  },
  {
    "id": "S007",
    "title": "Redistribución",
    "challenge_ids": [
      "R003"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Redistribución"
  },
  {
    "id": "S008",
    "title": "Logística",
    "challenge_ids": [
      "R003"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Logística"
  },
  {
    "id": "S009",
    "title": "Educación",
    "challenge_ids": [
      "R003"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Educación"
  },
  {
    "id": "S010",
    "title": "Construcción industrializada",
    "challenge_ids": [
      "R004"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Construcción industrializada"
  },
  {
    "id": "S011",
    "title": "Suelo",
    "challenge_ids": [
      "R004"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Suelo"
  },
  {
    "id": "S012",
    "title": "Vivienda pública",
    "challenge_ids": [
      "R004"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Vivienda pública"
  },
  {
    "id": "S013",
    "title": "Rehabilitación",
    "challenge_ids": [
      "R005"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Rehabilitación"
  },
  {
    "id": "S014",
    "title": "Ayudas",
    "challenge_ids": [
      "R005"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Ayudas"
  },
  {
    "id": "S015",
    "title": "Autoconsumo",
    "challenge_ids": [
      "R005"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Autoconsumo"
  },
  {
    "id": "S016",
    "title": "Envejecimiento activo",
    "challenge_ids": [
      "R006"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Envejecimiento activo"
  },
  {
    "id": "S017",
    "title": "Robótica",
    "challenge_ids": [
      "R006"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Robótica"
  },
  {
    "id": "S018",
    "title": "Prevención",
    "challenge_ids": [
      "R006"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Prevención"
  },
  {
    "id": "S019",
    "title": "IA",
    "challenge_ids": [
      "R007"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "IA"
  },
  {
    "id": "S020",
    "title": "Más personal",
    "challenge_ids": [
      "R007"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Más personal"
  },
  {
    "id": "S021",
    "title": "Telemedicina",
    "challenge_ids": [
      "R007"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Telemedicina"
  },
  {
    "id": "S022",
    "title": "Atención temprana",
    "challenge_ids": [
      "R008"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Atención temprana"
  },
  {
    "id": "S023",
    "title": "Prevención",
    "challenge_ids": [
      "R008"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Prevención"
  },
  {
    "id": "S024",
    "title": "Terapias",
    "challenge_ids": [
      "R008"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Terapias"
  },
  {
    "id": "S025",
    "title": "Electrificación",
    "challenge_ids": [
      "R009"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Electrificación"
  },
  {
    "id": "S026",
    "title": "Control emisiones",
    "challenge_ids": [
      "R009"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Control emisiones"
  },
  {
    "id": "S027",
    "title": "ZBE",
    "challenge_ids": [
      "R009"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "ZBE"
  },
  {
    "id": "S028",
    "title": "Incentivos",
    "challenge_ids": [
      "R010"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Incentivos"
  },
  {
    "id": "S029",
    "title": "Conciliación",
    "challenge_ids": [
      "R010"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Conciliación"
  },
  {
    "id": "S030",
    "title": "Vivienda",
    "challenge_ids": [
      "R010"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Vivienda"
  },
  {
    "id": "S031",
    "title": "Empresas",
    "challenge_ids": [
      "R011"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Empresas"
  },
  {
    "id": "S032",
    "title": "Fibra",
    "challenge_ids": [
      "R011"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Fibra"
  },
  {
    "id": "S033",
    "title": "Servicios",
    "challenge_ids": [
      "R011"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Servicios"
  },
  {
    "id": "S034",
    "title": "Infraestructuras",
    "challenge_ids": [
      "R012"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Infraestructuras"
  },
  {
    "id": "S035",
    "title": "Descentralización",
    "challenge_ids": [
      "R012"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Descentralización"
  },
  {
    "id": "S036",
    "title": "Fiscalidad",
    "challenge_ids": [
      "R012"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Fiscalidad"
  },
  {
    "id": "S037",
    "title": "Transparencia",
    "challenge_ids": [
      "R013"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Transparencia"
  },
  {
    "id": "S038",
    "title": "Digitalización",
    "challenge_ids": [
      "R013"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Digitalización"
  },
  {
    "id": "S039",
    "title": "Penas",
    "challenge_ids": [
      "R013"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Penas"
  },
  {
    "id": "S040",
    "title": "Verificación",
    "challenge_ids": [
      "R014"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Verificación"
  },
  {
    "id": "S041",
    "title": "Educación",
    "challenge_ids": [
      "R014"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Educación"
  },
  {
    "id": "S042",
    "title": "Algoritmos",
    "challenge_ids": [
      "R014"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Algoritmos"
  },
  {
    "id": "S043",
    "title": "Policía",
    "challenge_ids": [
      "R015"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Policía"
  },
  {
    "id": "S044",
    "title": "Integración",
    "challenge_ids": [
      "R015"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Integración"
  },
  {
    "id": "S045",
    "title": "Videovigilancia",
    "challenge_ids": [
      "R015"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Videovigilancia"
  },
  {
    "id": "S046",
    "title": "Diversificación",
    "challenge_ids": [
      "R016"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Diversificación"
  },
  {
    "id": "S047",
    "title": "Producción",
    "challenge_ids": [
      "R016"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Producción"
  },
  {
    "id": "S048",
    "title": "Interconexiones",
    "challenge_ids": [
      "R016"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Interconexiones"
  },
  {
    "id": "S049",
    "title": "Gestión forestal",
    "challenge_ids": [
      "R017"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Gestión forestal"
  },
  {
    "id": "S050",
    "title": "IA",
    "challenge_ids": [
      "R017"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "IA"
  },
  {
    "id": "S051",
    "title": "Mosaicos",
    "challenge_ids": [
      "R017"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Mosaicos"
  },
  {
    "id": "S052",
    "title": "Biodegradables",
    "challenge_ids": [
      "R018"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Biodegradables"
  },
  {
    "id": "S053",
    "title": "Reciclaje",
    "challenge_ids": [
      "R018"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Reciclaje"
  },
  {
    "id": "S054",
    "title": "Restricción",
    "challenge_ids": [
      "R018"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Restricción"
  },
  {
    "id": "S055",
    "title": "Restauración",
    "challenge_ids": [
      "R019"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Restauración"
  },
  {
    "id": "S056",
    "title": "Espacios protegidos",
    "challenge_ids": [
      "R019"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Espacios protegidos"
  },
  {
    "id": "S057",
    "title": "Control invasoras",
    "challenge_ids": [
      "R019"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Control invasoras"
  },
  {
    "id": "S058",
    "title": "Infraestructuras",
    "challenge_ids": [
      "R020"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Infraestructuras"
  },
  {
    "id": "S059",
    "title": "Restauración",
    "challenge_ids": [
      "R020"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Restauración"
  },
  {
    "id": "S060",
    "title": "Alerta",
    "challenge_ids": [
      "R020"
    ],
    "cause_ids": [],
    "type": "general",
    "description": "Alerta"
  }
];

export const indicators: Indicator[] = [
  { id: "I001", name: "Emisiones globales de CO2", unit: "GtCO2/año", category: "climate", direction: "lower_is_better", value: 42.4 },
  { id: "I002", name: "Porcentaje de energía renovable", unit: "%", category: "energy", direction: "higher_is_better", value: 38 },
  { id: "I003", name: "Población con acceso a agua segura", unit: "%", category: "water", direction: "higher_is_better", value: 72 },
  { id: "I004", name: "Índice de biodiversidad", unit: "index", category: "nature", direction: "higher_is_better", value: 68 },
  { id: "I101", name: "Población de España", unit: "personas", category: "population", value: 48345223 },
  { id: "I301", name: "Potencia solar instalada", unit: "kWp", category: "energy", value: 150 },
  { id: "I303", name: "Superficie natural protegida", unit: "%", category: "nature", value: 45 }
];

export const organizations: Organization[] = [
  { id: "ORG_ACCIONA", name: "ACCIONA", type: "company", scale: "national", territory_id: "T001", focus_areas: ["agua"], objective_ids: ["O001"] },
  { id: "ORG_CITYWATER", name: "Municipios y entidades públicas participantes", type: "government", scale: "regional", territory_id: "T002", focus_areas: ["agua"], objective_ids: ["O001"] },
  { id: "ORG_WEAREWATER", name: "We Are Water Foundation + socios locales", type: "community", scale: "national", territory_id: "T001", focus_areas: ["agua"], objective_ids: ["O001"] },
  { id: "ORG_TGTG", name: "Too Good To Go", type: "company", scale: "global", territory_id: "T001", focus_areas: ["alimentación"], objective_ids: ["O002"] },
  { id: "ORG_EU", name: "Comisión Europea + Estados miembros", type: "government", scale: "regional", territory_id: "T002", focus_areas: ["alimentación"], objective_ids: ["O002"] },
  { id: "ORG_WFP", name: "World Food Programme", type: "community", scale: "global", territory_id: "T001", focus_areas: ["alimentación"], objective_ids: ["O002"] },
  { id: "ORG_IKEA", name: "IKEA U.S. + WestEast Design Group", type: "company", scale: "national", territory_id: "T001", focus_areas: ["vivienda"], objective_ids: ["O003"] },
  { id: "ORG_KENYA", name: "Gobierno de Kenia + UN-Habitat", type: "government", scale: "national", territory_id: "T001", focus_areas: ["vivienda"], objective_ids: ["O003"] },
  { id: "ORG_HABITAT", name: "Habitat for Humanity", type: "community", scale: "national", territory_id: "T001", focus_areas: ["vivienda"], objective_ids: ["O003"] },
  { id: "ORG_SANOFI", name: "Sanofi", type: "company", scale: "global", territory_id: "T001", focus_areas: ["salud"], objective_ids: ["O004"] },
  { id: "ORG_OMS", name: "OMS Europa + Estados miembros", type: "government", scale: "regional", territory_id: "T002", focus_areas: ["salud"], objective_ids: ["O004"] },
  { id: "ORG_UNICEF", name: "UNICEF + socios públicos", type: "community", scale: "regional", territory_id: "T002", focus_areas: ["salud"], objective_ids: ["O004"] },
  { id: "ORG_GOOGLE", name: "Google Jigsaw", type: "company", scale: "global", territory_id: "T001", focus_areas: ["convivencia"], objective_ids: ["O005"] },
  { id: "ORG_BCN", name: "Ayuntamiento de Barcelona", type: "government", scale: "municipal", territory_id: "T008", focus_areas: ["convivencia"], objective_ids: ["O005"] },
  { id: "ORG_TI", name: "Transparency International + socios públicos europeos", type: "community", scale: "regional", territory_id: "T002", focus_areas: ["convivencia"], objective_ids: ["O005"] },
  { id: "ORG_MSFT", name: "Microsoft Research / AI for Earth", type: "company", scale: "global", territory_id: "T001", focus_areas: ["ecosistemas"], objective_ids: ["O006"] },
  { id: "ORG_MITECO", name: "MITECO + administraciones y socios científicos", type: "government", scale: "national", territory_id: "T003", focus_areas: ["ecosistemas"], objective_ids: ["O006"] },
  { id: "ORG_WWF", name: "WWF España + universidades y entidades científicas", type: "community", scale: "national", territory_id: "T003", focus_areas: ["ecosistemas"] }
,
  { id: "ORG001", name: "Ayuntamiento de Montejo de la Sierra", type: "government", scale: "municipal", territory_id: "T004", focus_areas: ["energía", "agua", "naturaleza"] },
  { id: "ORG003", name: "Comunidad Energética de Montejo", type: "community", scale: "local", territory_id: "T004", focus_areas: ["energía", "autoconsumo"] },
  { id: "P001", name: "Clara Álvarez (Especialista en regulación)", type: "professional", scale: "national", territory_id: "T002", focus_areas: ["energía", "regulación"], objective_ids: [] }
];

export const projects: Project[] = [
  { id: "PRJ_AGUA_1", name: "La Chira Wastewater Treatment Plant, Lima", type: "Empresarial", territory_id: "T_PERU", challenge_ids: [], solution_ids: [], objective_ids: ["O001"], organization_ids: ["ORG_ACCIONA"], status: "active", description: "Planta de tratamiento de aguas residuales que reduce la contaminación y permite tratar aguas de una amplia zona de Lima.", impact_metrics: [] },
  { id: "PRJ_AGUA_2", name: "City Water Circles", type: "Público", territory_id: "T_EUROPA_CENTRAL", challenge_ids: [], solution_ids: [], objective_ids: ["O001"], organization_ids: ["ORG_CITYWATER"], status: "active", description: "Proyecto europeo para introducir eficiencia hídrica, captación de lluvia, recuperación de aguas grises y soluciones de economía circular.", impact_metrics: [] },
  { id: "PRJ_AGUA_3", name: "Acceso a agua, saneamiento e higiene en comunidades rurales de Madagascar", type: "Tercer sector", territory_id: "T_MADAGASCAR", challenge_ids: [], solution_ids: [], objective_ids: ["O001"], organization_ids: ["ORG_WEAREWATER"], status: "active", description: "Proyecto para mejorar agua potable, saneamiento e higiene mediante pozos, bombas, letrinas y gestión comunitaria.", impact_metrics: [] },

  { id: "PRJ_ALI_1", name: "Too Good To Go Food Waste Platform", type: "Empresarial", territory_id: "T002", challenge_ids: [], solution_ids: [], objective_ids: ["O002"], organization_ids: ["ORG_TGTG"], status: "active", description: "Plataforma que conecta comercios con consumidores para aprovechar alimentos excedentes y evitar su desperdicio.", impact_metrics: [] },
  { id: "PRJ_ALI_2", name: "EU School Scheme", type: "Público", territory_id: "T002", challenge_ids: [], solution_ids: [], objective_ids: ["O002"], organization_ids: ["ORG_EU"], status: "active", description: "Programa europeo que facilita frutas, verduras y productos lácteos en centros escolares y acompaña la distribución con educación alimentaria.", impact_metrics: [] },
  { id: "PRJ_ALI_3", name: "USDA McGovern-Dole School Feeding Programme - Etiopía", type: "Tercer sector", territory_id: "T013", challenge_ids: [], solution_ids: [], objective_ids: ["O002"], organization_ids: ["ORG_WFP"], status: "active", description: "Programa de alimentación escolar que integra comidas, WASH, salud, nutrición, alfabetización y apoyo a pequeños agricultores.", impact_metrics: [] },

  { id: "PRJ_VIV_1", name: "Towne Twin Village Small Home", type: "Empresarial", territory_id: "T_TEXAS", challenge_ids: [], solution_ids: [], objective_ids: ["O003"], organization_ids: ["ORG_IKEA"], status: "active", description: "Vivienda de pequeño formato diseñada con criterios de seguridad, dignidad y diseño informado por trauma para vivienda de apoyo permanente.", impact_metrics: [] },
  { id: "PRJ_VIV_2", name: "Kenya Affordable Housing Project", type: "Público", territory_id: "T_KENIA", challenge_ids: [], solution_ids: [], objective_ids: ["O003"], organization_ids: ["ORG_KENYA"], status: "active", description: "Programa nacional de vivienda asequible orientado a hogares de ingresos bajos y medios.", impact_metrics: [] },
  { id: "PRJ_VIV_3", name: "Carter Work Project 2026 - Langston Park", type: "Tercer sector", territory_id: "T_ATLANTA", challenge_ids: [], solution_ids: [], objective_ids: ["O003"], organization_ids: ["ORG_HABITAT"], status: "active", description: "Construcción colaborativa de viviendas asequibles con participación de voluntariado, familias y socios locales.", impact_metrics: [] },

  { id: "PRJ_SAL_1", name: "Programas de vacunación y desarrollo de vacunas", type: "Empresarial", territory_id: "T001", challenge_ids: [], solution_ids: [], objective_ids: ["O004"], organization_ids: ["ORG_SANOFI"], status: "active", description: "Desarrollo, fabricación y distribución de vacunas para prevenir enfermedades infecciosas y mejorar la salud pública.", impact_metrics: [] },
  { id: "PRJ_SAL_2", name: "Regional Digital Health Action Plan 2023-2030", type: "Público", territory_id: "T002", challenge_ids: [], solution_ids: [], objective_ids: ["O004"], organization_ids: ["ORG_OMS"], status: "active", description: "Marco regional para acelerar la transformación digital de los sistemas sanitarios.", impact_metrics: [] },
  { id: "PRJ_SAL_3", name: "RM Child-Health", type: "Tercer sector", territory_id: "T002", challenge_ids: [], solution_ids: [], objective_ids: ["O004"], organization_ids: ["ORG_UNICEF"], status: "active", description: "Proyecto para mejorar el acceso a atención sanitaria, vacunación, salud mental, nutrición e información sanitaria de menores migrantes y refugiados.", impact_metrics: [] },

  { id: "PRJ_CON_1", name: "Perspective API", type: "Empresarial", territory_id: "T001", challenge_ids: [], solution_ids: [], objective_ids: ["O005"], organization_ids: ["ORG_GOOGLE"], status: "active", description: "Herramienta de aprendizaje automático para ayudar a detectar y moderar contenido potencialmente tóxico en conversaciones online.", impact_metrics: [] },
  { id: "PRJ_CON_2", name: "Decidim Barcelona", type: "Público", territory_id: "T008", challenge_ids: [], solution_ids: [], objective_ids: ["O005"], organization_ids: ["ORG_BCN"], status: "active", description: "Plataforma de participación democrática para deliberación, propuestas, colaboración y seguimiento de procesos públicos.", impact_metrics: [] },
  { id: "PRJ_CON_3", name: "Integrity Pacts", type: "Tercer sector", territory_id: "T002", challenge_ids: [], solution_ids: [], objective_ids: ["O005"], organization_ids: ["ORG_TI"], status: "active", description: "Mecanismo de control ciudadano de la contratación pública para reducir riesgos de corrupción y reforzar transparencia y rendición de cuentas.", impact_metrics: [] },

  { id: "PRJ_ECO_1", name: "Accelerating Biodiversity Surveys with AI", type: "Empresarial", territory_id: "T001", challenge_ids: [], solution_ids: [], objective_ids: ["O006"], organization_ids: ["ORG_MSFT"], status: "active", description: "Uso de inteligencia artificial para acelerar el análisis de imágenes y sonidos de fauna y mejorar la monitorización de biodiversidad.", impact_metrics: [] },
  { id: "PRJ_ECO_2", name: "LIFE Cerceta Pardilla", type: "Público", territory_id: "T009", challenge_ids: [], solution_ids: [], objective_ids: ["O006"], organization_ids: ["ORG_MITECO"], status: "active", description: "Proyecto de conservación y restauración de humedales para recuperar el hábitat de la cerceta pardilla.", impact_metrics: [] },
  { id: "PRJ_ECO_3", name: "TERECOVA - Recuperando nuestros paisajes", type: "Tercer sector", territory_id: "T009", challenge_ids: [], solution_ids: [], objective_ids: ["O006"], organization_ids: ["ORG_WWF"], status: "active", description: "Proyecto participativo para identificar y priorizar zonas de restauración de paisajes degradados.", impact_metrics: [] }
,
  {
    id: "PR001", name: "Comunidad energética local de Montejo", type: "energy", territory_id: "T004", challenge_ids: ["R301"], solution_ids: ["S301", "S302"], objective_ids: [], organization_ids: ["ORG003"],
    status: "concept",
    description: "Proyecto de referencia para representar generación solar distribuida y almacenamiento compartido.",
    impact_metrics: ["I301"]
  }
];

export const content: Content[] = [
  {
    id: "PUB001",
    title: "Cómo puede una comunidad rural alcanzar mayor resiliencia energética",
    type: "article",
    author_id: "P002",
    territory_ids: ["T004"],
    challenge_ids: ["R301"],
    solution_ids: ["S301", "S302"],
    sectors: ["energía", "comunidad"],
    summary: "Análisis de un modelo energético comunitario basado en generación renovable y almacenamiento."
  },
  {
    id: "RES001",
    title: "Modelos distribuidos de generación para comunidades",
    type: "scientific_paper",
    author_id: "P001",
    territory_ids: ["T002", "T004"],
    challenge_ids: ["R001", "R301"],
    solution_ids: ["S001", "S301"],
    sectors: ["energía", "renovables"],
    summary: "Investigación de referencia para conectar evidencia científica con retos y soluciones territoriales."
  }

];



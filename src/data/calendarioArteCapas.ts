// GENERADO por design/calendario-arte/generadores/diseno4/capas_a_ts.py -- no editar a mano.
//
// Las ilustraciones que existen también como elementos sueltos (2026-11-12,
// Eugenio: «que cada elemento de la ilustración se pueda pinchar y arrastrar…
// y agrandar o hacer más pequeño»). Cada una vive en
// /calendario-arte/capas/<clave>/: el papel (fondo) y un WebP con transparencia
// por elemento. x, y, w, h son fracciones de la hoja; el orden es el de pintado
// (el primero, el más al fondo). `fija`: el paisaje, la luz o el borde de papel de
// una ilustración por planos (planos.py): se ve, pero no se arrastra.

export interface CapaIlustracion { id: string; nombre: string; src: string; x: number; y: number; w: number; h: number; fija?: boolean }
export interface ManifiestoCapas { ancho: number; alto: number; fondo: string; capas: CapaIlustracion[] }

export const CAPAS_ILUSTRACIONES: Record<string, ManifiestoCapas> = {
  "mes-05-d": {
    "ancho": 3508,
    "alto": 2008,
    "fondo": "fondo.jpg?v=d74f8883",
    "capas": [
      {
        "id": "guitarrista",
        "nombre": "El guitarrista",
        "src": "guitarrista.webp?v=bb98933b",
        "x": 0.07269,
        "y": 0.30478,
        "w": 0.15165,
        "h": 0.3252
      },
      {
        "id": "musica",
        "nombre": "La música",
        "src": "musica.webp?v=56b4fd37",
        "x": 0.13569,
        "y": 0.05777,
        "w": 0.31727,
        "h": 0.41285
      },
      {
        "id": "falda",
        "nombre": "La falda-jardín",
        "src": "falda.webp?v=324d61dc",
        "x": 0.2577,
        "y": 0.29183,
        "w": 0.43158,
        "h": 0.65886
      },
      {
        "id": "bailarina",
        "nombre": "La bailarina",
        "src": "bailarina.webp?v=76ffa1dd",
        "x": 0.3797,
        "y": 0.09412,
        "w": 0.14652,
        "h": 0.2749
      },
      {
        "id": "abuela",
        "nombre": "La abuela que teje",
        "src": "abuela.webp?v=4ce6667d",
        "x": 0.12742,
        "y": 0.66783,
        "w": 0.17104,
        "h": 0.33217
      },
      {
        "id": "nina",
        "nombre": "La niña del barro",
        "src": "nina.webp?v=ab755179",
        "x": 0.58124,
        "y": 0.75797,
        "w": 0.13597,
        "h": 0.23357
      },
      {
        "id": "flores",
        "nombre": "Las flores que despegan",
        "src": "flores.webp?v=71af8aeb",
        "x": 0.69242,
        "y": 0.45916,
        "w": 0.02708,
        "h": 0.05528
      },
      {
        "id": "pajaro1",
        "nombre": "El pájaro coral",
        "src": "pajaro1.webp?v=e0591dd5",
        "x": 0.73204,
        "y": 0.38645,
        "w": 0.03278,
        "h": 0.04731
      },
      {
        "id": "pajaro2",
        "nombre": "El pájaro turquesa",
        "src": "pajaro2.webp?v=5c336b07",
        "x": 0.79333,
        "y": 0.30876,
        "w": 0.02993,
        "h": 0.03934
      },
      {
        "id": "pajaro3",
        "nombre": "El pájaro dorado",
        "src": "pajaro3.webp?v=3cb68e94",
        "x": 0.8549,
        "y": 0.25896,
        "w": 0.02338,
        "h": 0.03536
      }
    ]
  },
  "mes-05-e": {
    "ancho": 3508,
    "alto": 2008,
    "fondo": "fondo.jpg?v=a17bc77b",
    "capas": [
      {
        "id": "colinas",
        "nombre": "Las colinas",
        "src": "colinas.webp?v=ce5d7f93",
        "x": 0.0,
        "y": 0.35259,
        "w": 1.0,
        "h": 0.31275,
        "fija": true
      },
      {
        "id": "pueblo_lejano",
        "nombre": "El pueblo amurallado",
        "src": "pueblo_lejano.webp?v=3faaae85",
        "x": 0.10348,
        "y": 0.28386,
        "w": 0.10034,
        "h": 0.11753
      },
      {
        "id": "casas",
        "nombre": "Las casas de la plaza",
        "src": "casas.webp?v=a2c15622",
        "x": 0.0,
        "y": 0.28536,
        "w": 1.0,
        "h": 0.27839,
        "fija": true
      },
      {
        "id": "mural",
        "nombre": "El mural",
        "src": "mural.webp?v=2b4f7dd7",
        "x": 0.28107,
        "y": 0.43327,
        "w": 0.07554,
        "h": 0.13496
      },
      {
        "id": "plaza",
        "nombre": "La plaza",
        "src": "plaza.webp?v=377724e9",
        "x": 0.0,
        "y": 0.53984,
        "w": 1.0,
        "h": 0.46016,
        "fija": true
      },
      {
        "id": "pintora",
        "nombre": "La pintora del caballete",
        "src": "pintora.webp?v=323f899c",
        "x": 0.24629,
        "y": 0.51245,
        "w": 0.10747,
        "h": 0.16285
      },
      {
        "id": "teatrillo",
        "nombre": "El teatrillo de títeres",
        "src": "teatrillo.webp?v=23648f9a",
        "x": 0.75656,
        "y": 0.58466,
        "w": 0.15137,
        "h": 0.18675
      },
      {
        "id": "publico",
        "nombre": "Los niños del teatrillo",
        "src": "publico.webp?v=1799af55",
        "x": 0.75627,
        "y": 0.69422,
        "w": 0.12571,
        "h": 0.17131
      },
      {
        "id": "gato",
        "nombre": "El gato",
        "src": "gato.webp?v=730f1781",
        "x": 0.72178,
        "y": 0.82271,
        "w": 0.02052,
        "h": 0.03635
      },
      {
        "id": "cafe",
        "nombre": "La mesa del café",
        "src": "cafe.webp?v=1103d513",
        "x": 0.86488,
        "y": 0.54432,
        "w": 0.09436,
        "h": 0.10259
      },
      {
        "id": "arbol",
        "nombre": "El árbol de los farolillos",
        "src": "arbol.webp?v=90949a32",
        "x": 0.811,
        "y": 0.11753,
        "w": 0.189,
        "h": 0.68028
      },
      {
        "id": "luces_plaza",
        "nombre": "La luz de los farolillos",
        "src": "luces_plaza.webp?v=3c3fec81",
        "x": 0.10376,
        "y": 0.22112,
        "w": 0.89624,
        "h": 0.43476,
        "fija": true
      },
      {
        "id": "rayos",
        "nombre": "Los rayos de sol",
        "src": "rayos.webp?v=86ce3afe",
        "x": 0.0,
        "y": 0.0,
        "w": 0.76026,
        "h": 0.96066,
        "fija": true
      },
      {
        "id": "verbena",
        "nombre": "Las luces de verbena",
        "src": "verbena.webp?v=9672184d",
        "x": 0.10034,
        "y": 0.3755,
        "w": 0.7959,
        "h": 0.15339
      },
      {
        "id": "guitarrista",
        "nombre": "El guitarrista",
        "src": "guitarrista.webp?v=ef46b726",
        "x": 0.06357,
        "y": 0.46315,
        "w": 0.26995,
        "h": 0.27938
      },
      {
        "id": "musica",
        "nombre": "La música",
        "src": "musica.webp?v=93592765",
        "x": 0.0992,
        "y": 0.1494,
        "w": 0.40336,
        "h": 0.46813
      },
      {
        "id": "falda",
        "nombre": "La falda-jardín",
        "src": "falda.webp?v=176cc946",
        "x": 0.3646,
        "y": 0.35608,
        "w": 0.33951,
        "h": 0.62948
      },
      {
        "id": "bailarina",
        "nombre": "La bailarina",
        "src": "bailarina.webp?v=71c7aa31",
        "x": 0.42617,
        "y": 0.17729,
        "w": 0.13084,
        "h": 0.24402
      },
      {
        "id": "flores",
        "nombre": "Las flores que se vuelven pájaros",
        "src": "flores.webp?v=7859a697",
        "x": 0.69612,
        "y": 0.42878,
        "w": 0.0439,
        "h": 0.13147
      },
      {
        "id": "lana",
        "nombre": "La lana",
        "src": "lana.webp?v=37016ea2",
        "x": 0.25855,
        "y": 0.70568,
        "w": 0.10889,
        "h": 0.1504
      },
      {
        "id": "abuela",
        "nombre": "La abuela que teje",
        "src": "abuela.webp?v=7356f3b2",
        "x": 0.12799,
        "y": 0.66882,
        "w": 0.34863,
        "h": 0.32968
      },
      {
        "id": "nina",
        "nombre": "La niña del barro",
        "src": "nina.webp?v=88723782",
        "x": 0.58181,
        "y": 0.75797,
        "w": 0.22634,
        "h": 0.2246
      },
      {
        "id": "pajaro1",
        "nombre": "El pájaro coral",
        "src": "pajaro1.webp?v=08e6b107",
        "x": 0.73404,
        "y": 0.38098,
        "w": 0.03164,
        "h": 0.04482
      },
      {
        "id": "pajaro2",
        "nombre": "El pájaro turquesa",
        "src": "pajaro2.webp?v=883ba131",
        "x": 0.79361,
        "y": 0.31026,
        "w": 0.02851,
        "h": 0.03685
      },
      {
        "id": "pajaro3",
        "nombre": "El pájaro dorado",
        "src": "pajaro3.webp?v=96fa8075",
        "x": 0.85576,
        "y": 0.25996,
        "w": 0.02109,
        "h": 0.03287
      },
      {
        "id": "parra",
        "nombre": "La parra de arriba",
        "src": "parra.webp?v=091e4508",
        "x": 0.0,
        "y": 0.0,
        "w": 0.24116,
        "h": 0.32171
      },
      {
        "id": "maceta",
        "nombre": "La maceta de geranios",
        "src": "maceta.webp?v=8721f8d3",
        "x": 0.00257,
        "y": 0.60259,
        "w": 0.17161,
        "h": 0.38845
      },
      {
        "id": "mesa",
        "nombre": "La mesa de los pinceles",
        "src": "mesa.webp?v=53f50c1a",
        "x": 0.75627,
        "y": 0.76444,
        "w": 0.24373,
        "h": 0.23556
      },
      {
        "id": "luz_farolillos",
        "nombre": "La luz de los farolillos de arriba",
        "src": "luz_farolillos.webp?v=611f9d4d",
        "x": 0.70924,
        "y": 0.0,
        "w": 0.29076,
        "h": 0.28735,
        "fija": true
      },
      {
        "id": "farolillos",
        "nombre": "Los farolillos de arriba",
        "src": "farolillos.webp?v=01ff3fd3",
        "x": 0.78107,
        "y": 0.0,
        "w": 0.19014,
        "h": 0.19671
      },
      {
        "id": "marco",
        "nombre": "El borde de papel",
        "src": "marco.webp?v=309bc5e7",
        "x": 0.0,
        "y": 0.0,
        "w": 1.0,
        "h": 1.0,
        "fija": true
      }
    ]
  },
  "mes-06-d": {
    "ancho": 3508,
    "alto": 2008,
    "fondo": "fondo.jpg?v=d74f8883",
    "capas": [
      {
        "id": "sol",
        "nombre": "El sol",
        "src": "sol.webp?v=21948fa2",
        "x": 0.77537,
        "y": 0.0,
        "w": 0.22463,
        "h": 0.31424
      },
      {
        "id": "suelo",
        "nombre": "El suelo bajo el tallo",
        "src": "suelo.webp?v=73ce4766",
        "x": 0.27566,
        "y": 0.88944,
        "w": 0.30673,
        "h": 0.11056
      },
      {
        "id": "girasol",
        "nombre": "El girasol",
        "src": "girasol.webp?v=8dde70c3",
        "x": 0.19812,
        "y": 0.06424,
        "w": 0.43101,
        "h": 0.93376
      },
      {
        "id": "abuelo",
        "nombre": "El abuelo y la lámpara",
        "src": "abuelo.webp?v=f901c756",
        "x": 0.25884,
        "y": 0.43924,
        "w": 0.17218,
        "h": 0.3745
      },
      {
        "id": "nina",
        "nombre": "La niña",
        "src": "nina.webp?v=9a99e4ed",
        "x": 0.35718,
        "y": 0.46215,
        "w": 0.08637,
        "h": 0.30428
      },
      {
        "id": "nino",
        "nombre": "El niño",
        "src": "nino.webp?v=7a82e6ff",
        "x": 0.52309,
        "y": 0.26594,
        "w": 0.12087,
        "h": 0.27241
      },
      {
        "id": "semillas",
        "nombre": "Las semillas-molinillo",
        "src": "semillas.webp?v=d4ccdafd",
        "x": 0.63626,
        "y": 0.22361,
        "w": 0.20239,
        "h": 0.42032
      },
      {
        "id": "pueblo",
        "nombre": "El pueblo",
        "src": "pueblo.webp?v=55459849",
        "x": 0.61146,
        "y": 0.59313,
        "w": 0.36773,
        "h": 0.375
      },
      {
        "id": "velomoviles",
        "nombre": "Los velomóviles y la bici",
        "src": "velomoviles.webp?v=295ed409",
        "x": 0.61916,
        "y": 0.81624,
        "w": 0.15593,
        "h": 0.09811
      },
      {
        "id": "hilos",
        "nombre": "Los hilos de luz",
        "src": "hilos.webp?v=4eb8d45b",
        "x": 0.54732,
        "y": 0.35408,
        "w": 0.35775,
        "h": 0.44173
      },
      {
        "id": "planeador1",
        "nombre": "El planeador grande",
        "src": "planeador1.webp?v=3cf39fa5",
        "x": 0.66619,
        "y": 0.08167,
        "w": 0.09578,
        "h": 0.07869
      },
      {
        "id": "planeador2",
        "nombre": "El planeador pequeño",
        "src": "planeador2.webp?v=f1addd4d",
        "x": 0.85804,
        "y": 0.45369,
        "w": 0.08409,
        "h": 0.09213
      },
      {
        "id": "abeja",
        "nombre": "La abeja",
        "src": "abeja.webp?v=d91af298",
        "x": 0.31357,
        "y": 0.13695,
        "w": 0.01539,
        "h": 0.03635
      },
      {
        "id": "satelite",
        "nombre": "El satélite",
        "src": "satelite.webp?v=527b8c20",
        "x": 0.00684,
        "y": 0.28287,
        "w": 0.20639,
        "h": 0.18576
      },
      {
        "id": "mano",
        "nombre": "La mano con el móvil",
        "src": "mano.webp?v=e47c56ab",
        "x": 0.0,
        "y": 0.55478,
        "w": 0.15707,
        "h": 0.28735
      },
      {
        "id": "golondrina",
        "nombre": "La golondrina",
        "src": "golondrina.webp?v=a95c4425",
        "x": 0.1126,
        "y": 0.48456,
        "w": 0.08067,
        "h": 0.13098
      }
    ]
  },
  "mes-06-e": {
    "ancho": 3508,
    "alto": 2008,
    "fondo": "fondo.jpg?v=f1baab60",
    "capas": [
      {
        "id": "cordillera",
        "nombre": "La cordillera",
        "src": "cordillera.webp?v=3fec8d25",
        "x": 0.0,
        "y": 0.5996,
        "w": 1.0,
        "h": 0.25199,
        "fija": true
      },
      {
        "id": "eolico",
        "nombre": "El parque eólico lejano",
        "src": "eolico.webp?v=b4b18ff3",
        "x": 0.20353,
        "y": 0.55827,
        "w": 0.78449,
        "h": 0.10657
      },
      {
        "id": "lomas",
        "nombre": "Las lomas",
        "src": "lomas.webp?v=ba7ce7f8",
        "x": 0.0,
        "y": 0.69671,
        "w": 1.0,
        "h": 0.2007,
        "fija": true
      },
      {
        "id": "lago",
        "nombre": "El lago",
        "src": "lago.webp?v=f225248e",
        "x": 0.50086,
        "y": 0.74203,
        "w": 0.248,
        "h": 0.0493,
        "fija": true
      },
      {
        "id": "pueblo_lejano",
        "nombre": "El pueblo lejano",
        "src": "pueblo_lejano.webp?v=84afaa38",
        "x": 0.56613,
        "y": 0.68526,
        "w": 0.0439,
        "h": 0.04283
      },
      {
        "id": "globo",
        "nombre": "El globo",
        "src": "globo.webp?v=a199e310",
        "x": 0.28164,
        "y": 0.34612,
        "w": 0.0268,
        "h": 0.06574
      },
      {
        "id": "bandada",
        "nombre": "Las cigüeñas",
        "src": "bandada.webp?v=bd35bdfd",
        "x": 0.16192,
        "y": 0.31125,
        "w": 0.08637,
        "h": 0.15886
      },
      {
        "id": "planeador2",
        "nombre": "El planeador pequeño",
        "src": "planeador2.webp?v=9f23810e",
        "x": 0.87628,
        "y": 0.45418,
        "w": 0.0496,
        "h": 0.04133
      },
      {
        "id": "praderas",
        "nombre": "Las praderas",
        "src": "praderas.webp?v=63431450",
        "x": 0.0,
        "y": 0.77639,
        "w": 1.0,
        "h": 0.22361,
        "fija": true
      },
      {
        "id": "rio",
        "nombre": "El río",
        "src": "rio.webp?v=517008d3",
        "x": 0.13284,
        "y": 0.79233,
        "w": 0.3683,
        "h": 0.12898,
        "fija": true
      },
      {
        "id": "puente",
        "nombre": "El puente y el tren solar",
        "src": "puente.webp?v=a9d79306",
        "x": 0.07298,
        "y": 0.82321,
        "w": 0.36545,
        "h": 0.10657
      },
      {
        "id": "campo_girasoles",
        "nombre": "El campo de girasoles",
        "src": "campo_girasoles.webp?v=da01c055",
        "x": 0.42959,
        "y": 0.76992,
        "w": 0.26539,
        "h": 0.23008
      },
      {
        "id": "colmenas",
        "nombre": "Las colmenas",
        "src": "colmenas.webp?v=9d769aec",
        "x": 0.59379,
        "y": 0.92231,
        "w": 0.05815,
        "h": 0.04681
      },
      {
        "id": "pueblo",
        "nombre": "El pueblo",
        "src": "pueblo.webp?v=79eb01c4",
        "x": 0.69099,
        "y": 0.60608,
        "w": 0.29361,
        "h": 0.29731
      },
      {
        "id": "velomoviles",
        "nombre": "Los velomóviles y la bici",
        "src": "velomoviles.webp?v=5731c4fb",
        "x": 0.69869,
        "y": 0.78187,
        "w": 0.12372,
        "h": 0.07769
      },
      {
        "id": "planeador1",
        "nombre": "El planeador grande",
        "src": "planeador1.webp?v=09c3cb38",
        "x": 0.66676,
        "y": 0.08317,
        "w": 0.09464,
        "h": 0.0762
      },
      {
        "id": "rayos",
        "nombre": "Los rayos de sol",
        "src": "rayos.webp?v=808b1a14",
        "x": 0.63597,
        "y": 0.26793,
        "w": 0.27223,
        "h": 0.45867,
        "fija": true
      },
      {
        "id": "satelite",
        "nombre": "El satélite",
        "src": "satelite.webp?v=e629d7ac",
        "x": 0.13284,
        "y": 0.29482,
        "w": 0.0362,
        "h": 0.02938
      },
      {
        "id": "girasol",
        "nombre": "El girasol",
        "src": "girasol.webp?v=ec351dee",
        "x": 0.19897,
        "y": 0.07968,
        "w": 0.43044,
        "h": 0.91833
      },
      {
        "id": "abuelo",
        "nombre": "El abuelo y la lámpara",
        "src": "abuelo.webp?v=1b9cc661",
        "x": 0.23261,
        "y": 0.48108,
        "w": 0.13911,
        "h": 0.33118
      },
      {
        "id": "nina",
        "nombre": "La niña",
        "src": "nina.webp?v=0e12b3f7",
        "x": 0.32241,
        "y": 0.46365,
        "w": 0.12001,
        "h": 0.30129
      },
      {
        "id": "hilos",
        "nombre": "Los hilos de luz",
        "src": "hilos.webp?v=011fe44b",
        "x": 0.56072,
        "y": 0.31873,
        "w": 0.36802,
        "h": 0.4507
      },
      {
        "id": "nino",
        "nombre": "El niño",
        "src": "nino.webp?v=95ab72ef",
        "x": 0.48603,
        "y": 0.26793,
        "w": 0.15678,
        "h": 0.2749
      },
      {
        "id": "luz_bombilla",
        "nombre": "La luz de la bombilla",
        "src": "luz_bombilla.webp?v=6a1e77f0",
        "x": 0.29818,
        "y": 0.45369,
        "w": 0.12856,
        "h": 0.22261,
        "fija": true
      },
      {
        "id": "bombilla",
        "nombre": "La bombilla",
        "src": "bombilla.webp?v=194df2e2",
        "x": 0.34094,
        "y": 0.54831,
        "w": 0.02737,
        "h": 0.04333
      },
      {
        "id": "semillas",
        "nombre": "Las semillas-molinillo",
        "src": "semillas.webp?v=4c6ea740",
        "x": 0.63597,
        "y": 0.2256,
        "w": 0.19128,
        "h": 0.39741
      },
      {
        "id": "abeja",
        "nombre": "La abeja",
        "src": "abeja.webp?v=4fda9837",
        "x": 0.60547,
        "y": 0.18327,
        "w": 0.01368,
        "h": 0.03386
      },
      {
        "id": "rama",
        "nombre": "La rama de arriba",
        "src": "rama.webp?v=f792c824",
        "x": 0.0,
        "y": 0.01693,
        "w": 0.27509,
        "h": 0.31474
      },
      {
        "id": "hierbas",
        "nombre": "Las hierbas del primer plano",
        "src": "hierbas.webp?v=68f4b891",
        "x": 0.0,
        "y": 0.6743,
        "w": 1.0,
        "h": 0.3257
      },
      {
        "id": "mano",
        "nombre": "La mano con el móvil",
        "src": "mano.webp?v=0b10fcda",
        "x": 0.0,
        "y": 0.55627,
        "w": 0.1565,
        "h": 0.28486
      },
      {
        "id": "golondrina",
        "nombre": "La golondrina",
        "src": "golondrina.webp?v=7280db23",
        "x": 0.11345,
        "y": 0.48655,
        "w": 0.07896,
        "h": 0.12799
      },
      {
        "id": "marco",
        "nombre": "El borde de papel",
        "src": "marco.webp?v=a58760d4",
        "x": 0.0,
        "y": 0.0,
        "w": 1.0,
        "h": 1.0,
        "fija": true
      }
    ]
  }
};

/** La clave («mes-06-d») de una ilustración que tiene elementos sueltos, o null. */
export function claveCapas(url?: string | null): string | null {
  const m = url?.match(/\/(mes-\d{2}(?:-[a-z])?)\.(?:jpe?g|png|webp)$/);
  return m && CAPAS_ILUSTRACIONES[m[1]] ? m[1] : null;
}

export const carpetaCapas = (clave: string) => `/calendario-arte/capas/${clave}/`;

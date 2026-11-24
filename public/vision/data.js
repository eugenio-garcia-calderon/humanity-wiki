// The 12 sectors of the ideal-vision site. Generated from research JSON; edit freely.
const SECTORES = [
 {
  "id": "energia",
  "nombre": "Energía",
  "resumen": "Energía limpia, cercana y asequible: hogares que casi no la necesitan, pueblos que la producen juntos y redes que la reparten con inteligencia.",
  "ambito": "Cómo producimos, guardamos, repartimos y usamos la energía en casa, en la comunidad y en el territorio: electricidad, calor, frío y el acceso de todas las personas a ella.",
  "vision": {
   "escena3d": "pueblo",
   "intro": "Imaginamos un mundo en el que la energía venga del sol, del viento y del agua del propio lugar, pertenezca a quienes la usan y no le falte a nadie para vivir con calor en invierno y frescor en verano. Casas que casi no necesitan energía, vecinos que la comparten y redes que la mueven sin despilfarro: la energía como un bien común, no como una preocupación.",
   "equipo": "Un equipo humano recopila esta visión y la comunica a través del arte digital y físico para que sea accesible a todos los seres humanos. El botón «Ver la visión en 3D» abre la herramienta de visualización del ideal de Luz & Humanidad.",
   "bloques": [
    {
     "titulo": "El hogar: consumir poco y producir lo propio",
     "texto": "La energía más limpia es la que no hace falta gastar. Una casa bien aislada, orientada al sol y ventilada con cabeza mantiene una temperatura agradable casi sola; lo poco que necesita lo produce en su propio tejado.",
     "puntos": [
      "Viviendas rehabilitadas con aislamiento, buenas ventanas y sin puentes térmicos, siguiendo estándares como Passivhaus (casa pasiva)",
      "Placas solares en el tejado o el balcón para el autoconsumo (producir y gastar la propia electricidad)",
      "Bombas de calor eficientes en lugar de calderas de gas o gasóleo",
      "Pequeñas baterías y electrodomésticos que se ponen en marcha cuando hay sol",
      "Ningún hogar sin poder mantener su casa a una temperatura saludable",
      "Facturas sencillas que cualquiera entiende"
     ],
     "imagenes": [
      {
       "titulo": "Casa pasiva de Darmstadt-Kranichstein",
       "lugar": "Darmstadt (Alemania)",
       "src": "https://commons.wikimedia.org/wiki/Special:FilePath/Passivhaus_Darmstadt_Kranichstein_Fruehling_2006.JPG?width=640",
       "fuente": "https://commons.wikimedia.org/wiki/File:Passivhaus_Darmstadt_Kranichstein_Fruehling_2006.JPG"
      }
     ],
     "escena3d": "hogar",
     "escalas": [
      "individuo"
     ],
     "subtemas": []
    },
    {
     "titulo": "La comunidad y el pueblo: energía compartida",
     "texto": "Los tejados de colegios, naves y polideportivos se convierten en centrales solares de todo el barrio. Las personas vecinas se organizan en comunidades energéticas y cooperativas que producen, guardan y reparten la energía, y los beneficios se quedan en el pueblo.",
     "puntos": [
      "Comunidades energéticas locales abiertas a cualquier vecino, con o sin tejado propio",
      "Autoconsumo colectivo: una instalación que abastece a muchos hogares cercanos",
      "Almacenamiento compartido (baterías de barrio) para usar de noche la energía del día",
      "Cooperativas de energía renovable gobernadas de forma democrática: una persona, un voto",
      "Prioridad para los hogares vulnerables en el reparto de la energía y del ahorro",
      "Oficinas de barrio que asesoran sobre ahorro, ayudas y rehabilitación"
     ],
     "imagenes": [],
     "escena3d": "comunidad",
     "escalas": [
      "comunidad",
      "pueblo"
     ],
     "subtemas": []
    },
    {
     "titulo": "El territorio y la red: renovables con la tierra y redes inteligentes",
     "texto": "Los parques solares y eólicos se planifican con el territorio y no contra él: en suelos de poco valor, compartidos con ganadería o cultivos, y con parte de la propiedad y los beneficios para la población local. Una red eléctrica moderna y bien dimensionada conecta todo esto, equilibra la producción y el consumo y evita apagones y desperdicio.",
     "puntos": [
      "Renovables planificadas con participación vecinal y respeto al paisaje, la biodiversidad y el suelo fértil",
      "Parte de la propiedad de los grandes parques en manos de vecinos y municipios",
      "Redes con capacidad suficiente para conectar nuevo autoconsumo, viviendas y vehículos eléctricos",
      "Almacenamiento a gran escala (bombeo hidráulico, baterías) y gestión flexible de la demanda",
      "Control de tensión y estabilidad garantizado por todas las tecnologías de generación",
      "Electricidad limpia y cocina sin humos para todas las personas del planeta"
     ],
     "imagenes": [],
     "escena3d": "pueblo",
     "escalas": [
      "provincia",
      "region",
      "pais"
     ],
     "subtemas": []
    }
   ],
   "arte": {
    "src": "/calendario-arte/miniaturas/mes-06-b.jpg",
    "grande": "/calendario-arte/ilustraciones/mes-06-b.jpg",
    "tema": "Tecnología y Energía"
   }
  },
  "retos": [
   {
    "ambito": "España",
    "titulo": "Pobreza energética: casas frías en invierno",
    "texto": "En 2024, el 17,6 % de la población no podía permitirse mantener su vivienda a una temperatura adecuada en invierno, frente al 9,1 % de 2018. Además, el 9,7 % se retrasó en el pago de las facturas de suministros de la vivienda.",
    "fuente": "https://www.miteco.gob.es/content/dam/miteco/es/energia/files-1/bono-social/informes-indicadores/5.%20Indicadores%20de%20pobreza%20energética%202022-2024,%20balance%20y%20cierre%20ENPE%2019-24.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "mercado",
     "consumo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Dependencia de la energía importada",
    "texto": "En 2024 España importó el 68,9 % de la energía que consume, por encima del 61,4 % de la zona euro. El petróleo sigue siendo la primera fuente de energía primaria, seguido del gas natural, que se compran casi por completo fuera.",
    "fuente": "https://ine.es/prodyser/espa_cifras/13_ENERGIA.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "generacion",
     "consumo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Viviendas que pierden el calor",
    "texto": "Casi el 58 % de los edificios españoles se construyó antes de la primera norma de condiciones térmicas (NBE-CT-79), es decir, sin exigencias mínimas de aislamiento. Alrededor del 55 % es anterior a 1980.",
    "fuente": "https://www.miteco.gob.es/eu/cambio-climatico/temas/mitigacion-politicas-y-medidas/edificacion.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "consumo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Redes eléctricas sin hueco para conectar más",
    "texto": "Según los mapas de capacidad publicados en 2026 por las distribuidoras (asociación aelec), el 83,4 % de los nudos de la red de distribución no admite nueva demanda. En 2025 se desaprovecharon además unos 2.183 GWh de autoconsumo por limitaciones de la red, valorados en unos 82 millones de euros.",
    "fuente": "https://www.renewableenergymagazine.com/panorama/el-83-de-los-nudos-de-la-20260724",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "distribucion",
     "transporte"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Estabilidad de la red: la lección del apagón",
    "texto": "El 28 de abril de 2025 la España peninsular y Portugal se quedaron sin electricidad. El informe final de los operadores europeos (ENTSO-E, marzo de 2026) concluye que no hubo una causa única, sino una cadena de subidas de tensión y desconexiones, con deficiencias en el control de tensión de distintos tipos de generación y un marco regulatorio que no lo incentivaba.",
    "fuente": "https://sciencemediacentre.es/en/final-blackout-report-european-operators-confirms-event-was-caused-multiple-factors-recommends",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "transporte",
     "almacenamiento"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Millones de personas sin luz ni cocina limpia",
    "texto": "En 2023, más de 666 millones de personas en el mundo no tenían acceso a la electricidad, el 85 % de ellas en África subsahariana. Unos 2.100 millones seguían cocinando con combustibles y tecnologías contaminantes.",
    "fuente": "https://www.worldbank.org/en/news/press-release/2025/06/25/energy-access-has-improved-yet-international-financial-support-still-needed-to-boost-progress-and-address-disparities",
    "escalas": [
     "planeta"
    ],
    "subtemas": [
     "mercado",
     "distribucion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Seguimos importando casi 7 de cada 10 unidades de energía",
    "texto": "La dependencia exterior fue del 68,6% en 2025, por encima del 61% previsto por el PNIEC para ese año; el petróleo del transporte pesa mucho.",
    "fuente": "https://www.foronuclear.org/wp-content/uploads/2026/06/Energia_2026.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "generacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "El sol del mediodía vale cada vez menos",
    "texto": "En 2025 la electricidad costó 33 €/MWh de media en horas solares y 101 €/MWh por la tarde-noche, lo que resta ingresos a nuevas plantas solares.",
    "fuente": "https://www.energias-renovables.com/panorama/el-precio-de-la-electricidad-en-espa-20260107",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "generacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Una isla eléctrica",
    "texto": "Con unos 3 GW de intercambio, la Península es de las zonas peor conectadas de Europa (REE); el enlace por el golfo de Bizkaia llevará Francia de 2.800 a 5.000 MW.",
    "fuente": "https://www.ree.es/en/ecological-transition/interconnections",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "transporte"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Estabilidad de la red tras el apagón",
    "texto": "ENTSO-E (marzo 2026) señala un control de tensión insuficiente, desconexiones en cascada y normas que no exigían control dinámico; reparte responsabilidades entre varios actores.",
    "fuente": "https://www.eldiario.es/economia/expertos-europeos-reparten-culpas-gran-apagon-espana-fallo-sistemico-impulsado-problemas-tecnicos-operativos-regulatorios_1_13082766.amp.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "transporte"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Redes sin hueco para conectar más",
    "texto": "Las grandes distribuidoras publicaron en septiembre de 2025 que el 83,4% de sus nudos estaba saturado, frenando viviendas, industria y recarga.",
    "fuente": "https://forbes.es/economia/794008/el-834-de-los-nudos-de-la-red-de-distribucion-electrica-estan-ya-saturados-segun-las-grandes-electricas/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "distribucion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "El autoconsumo se frena",
    "texto": "En 2025 se instalaron 1.214 MW, un 15% menos: tercer año seguido de caída, lejos del ritmo del PNIEC (APPA).",
    "fuente": "https://www.appa.es/wp-content/uploads/2026/02/NdP-APPA-Renovables-El-autoconsumo-consolida-su-aportacion-pero-encadena-tres-anos-de-contraccion-y-reclama-una-fiscalidad-estable_vf.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "distribucion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Una factura que sube aunque el sol abarate la luz",
    "texto": "El usuario medio pagó 975,88 € en 2025, un 15,5% más que en 2024, según FACUA.",
    "fuente": "https://roams.es/actualidad/energia/el-palo-de-la-factura-de-luz-en-2025-los-tres-motivos-por-los-que-fue-la-tercera-mas-alta-de-la-historia/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "mercado"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Electrificación lenta",
    "texto": "Solo una cuarta parte de la energía final es electricidad (2024); en transporte, apenas el 2% (AIE).",
    "fuente": "https://www.hibridosyelectricos.com/energia/56-electricidad-produce-espana-ya-es-renovable-aie-destapa-gran-agujero-pais-todavia-no-ha-cerrado_90431_102.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "consumo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Muy poco almacenamiento para tanto sol",
    "texto": "Con 3,4 GW en 2025, España está lejos de los 22,5 GW del PNIEC; las baterías apenas suman 96 MW (REE).",
    "fuente": "https://www.ree.es/sites/default/files/2026-03/1103_NP_ISE_2025.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "almacenamiento"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Proyectos de baterías atascados en trámites",
    "texto": "Un informe del Foro Regulación Inteligente (2026) estima más de 20 GW de proyectos de almacenamiento bloqueados en la tramitación.",
    "fuente": "https://www.merca2.es/2026/07/19/dependencia-energetica-espana-68-por-ciento-2420141/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "almacenamiento"
    ]
   }
  ],
  "soluciones": [
   {
    "ambito": "Hogar",
    "titulo": "Rehabilitar con el estándar de casa pasiva",
    "texto": "La casa pasiva (Passivhaus) combina mucho aislamiento, hermeticidad, ventanas de calidad y ventilación con recuperación de calor. Las mediciones en más de 1.800 viviendas nuevas y unas 170 rehabilitadas muestran un ahorro de alrededor del 90 % de la calefacción frente a los edificios antiguos, y del 80 % de media frente a las exigencias legales para obra nueva.",
    "supera": "Viviendas que pierden el calor",
    "fuente": "https://passivehouse.com/05_service/03_literature/0303_energy_efficiency/0303_energy-efficiency_of_passive_houses.htm",
    "escalas": [
     "individuo"
    ],
    "subtemas": [
     "consumo"
    ]
   },
   {
    "ambito": "Hogar",
    "titulo": "Autoconsumo solar en tejados",
    "texto": "Producir la propia electricidad con placas solares reduce las compras de energía de fuera. En 2025 España sumaba 9.590 MW de autoconsumo, que cubrieron el 4,1 % de la demanda eléctrica; en una vivienda tipo de 5,5 kW la inversión se recupera en unos 6 a 7 años.",
    "supera": "Dependencia de la energía importada",
    "fuente": "https://www.appa.es/wp-content/uploads/2026/02/NdP-APPA-Renovables-El-autoconsumo-consolida-su-aportacion-pero-encadena-tres-anos-de-contraccion-y-reclama-una-fiscalidad-estable_vf.pdf",
    "escalas": [
     "individuo"
    ],
    "subtemas": [
     "distribucion",
     "generacion"
    ]
   },
   {
    "ambito": "Comunidad",
    "titulo": "Comunidades energéticas y autoconsumo colectivo",
    "texto": "Vecinos, comercios y ayuntamientos comparten instalaciones renovables y se reparten la energía. En Crevillent (Alicante) un hogar medio ahorra alrededor del 15 % en la factura sin pagar nada al entrar, y más del 25 % cuando la inversión está amortizada; desde marzo de 2026 la ley permite compartir energía hasta 5 km de distancia (Real Decreto-ley 7/2026). En 2025 había 837 comunidades energéticas activas en España.",
    "supera": "Pobreza energética: casas frías en invierno",
    "fuente": "https://www.energias-renovables.com/autoconsumo/crevillent-la-capital-de-la-espa-a-20250707",
    "escalas": [
     "individuo",
     "comunidad",
     "pueblo"
    ],
    "subtemas": [
     "distribucion",
     "mercado"
    ]
   },
   {
    "ambito": "Territorio",
    "titulo": "Almacenamiento y flexibilidad",
    "texto": "Guardar la energía cuando sobra y usarla cuando falta alivia las redes y evita tirar electricidad renovable. En 2025 el almacenamiento instalado en España era de 3.427 MW, casi todo bombeo hidráulico y solo 96 MW de baterías a gran escala, mientras las baterías domésticas de autoconsumo crecieron un 119 %.",
    "supera": "Redes eléctricas sin hueco para conectar más",
    "fuente": "https://www.energias-renovables.com/panorama/la-energ-a-solar-adelanta-a-la-20260311",
    "escalas": [
     "region"
    ],
    "subtemas": [
     "almacenamiento"
    ]
   },
   {
    "ambito": "Territorio",
    "titulo": "Control de tensión exigido a todas las centrales",
    "texto": "Los expertos europeos que analizaron el apagón recomiendan revisar el procedimiento de control de tensión, coordinar las protecciones, extender los servicios de apoyo a la red a todos los tipos de generación (también a las renovables pequeñas) y compartir más datos entre operadores. Como resumió ENTSO-E, el problema no son las renovables, sino el control de tensión, sea cual sea la tecnología.",
    "supera": "Estabilidad de la red: la lección del apagón",
    "fuente": "https://sciencemediacentre.es/en/final-blackout-report-european-operators-confirms-event-was-caused-multiple-factors-recommends",
    "escalas": [
     "region"
    ],
    "subtemas": [
     "transporte"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Solar descentralizada y minirredes en zonas rurales",
    "texto": "El 84 % de las personas sin electricidad vive en zonas rurales, donde los sistemas solares domésticos y las minirredes suelen encajar mejor que extender la red. Fondos como el Universal Energy Facility (de 8,5 a 67,3 millones de dólares desde 2020, en seis países africanos) financian estas instalaciones por resultados.",
    "supera": "Millones de personas sin luz ni cocina limpia",
    "fuente": "https://www.seforall.org/news/powering-progress-7-opportunities-to-close-the-energy-access-gap-and-accelerate-the-clean",
    "escalas": [
     "planeta"
    ],
    "subtemas": [
     "distribucion",
     "generacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Parques renovables con participación ciudadana",
    "texto": "Vecinos y municipios son copropietarios de los parques; en Copenhague una cooperativa posee la mitad del parque marino de Middelgrunden desde 2000.",
    "fuente": "https://en.wikipedia.org/wiki/Middelgrunden_wind_farm",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "generacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Mezclar mejor sol, viento e híbridos",
    "texto": "La AIE (2026) recomienda equilibrar eólica, solar y plantas híbridas para producir también fuera de las horas de sol.",
    "fuente": "https://roams.es/actualidad/energia/espana-paso-35-56-electricidad-renovable-aie-pide-mas-electrificacion/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "generacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Control de tensión también con renovables",
    "texto": "La CNMC aprobó en julio de 2026 que plantas y baterías de 1 MW o más presten control de tensión, con pago por el servicio.",
    "fuente": "https://cnmc.es/prensa/procedimientos-control-tension-20260710?back=news&page=0",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "transporte"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Más red e interconexiones planificadas",
    "texto": "La planificación a 2030 prevé más de 17.000 M€, 193 subestaciones y 8.164 km de líneas repotenciadas (propuesta, septiembre 2026).",
    "fuente": "https://www.miteco.gob.es/es/prensa/ultimas-noticias/2026/septiembre/sara-aagesen-anuncia-una-inversion-superior-a-17-000-millones-en.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "transporte"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Retribución y límites de inversión revisados",
    "texto": "La CNMC fijó una rentabilidad del 6,58% para redes en 2026-2031, y el Gobierno propuso superar los límites de inversión ligados a nuevas demandas.",
    "fuente": "https://www.cnmc.es/prensa/circulares-retribucion-electrica-20251222",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "distribucion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Tarifa regulada menos expuesta a sobresaltos",
    "texto": "Desde la reforma del PVPC, el 55% de su precio en 2026 sale de contratos a plazo, que suavizan los picos del mercado diario (CNMC).",
    "fuente": "https://www.diariodeleon.es/economia/260814/2094189/numero-consumidores-acogidos-pvpc-luz-cae.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "mercado"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Reequilibrar impuestos y cargos",
    "texto": "La AIE (2026) recomienda cargar menos la electricidad y proteger a los vulnerables para acelerar la electrificación.",
    "fuente": "https://roams.es/actualidad/energia/espana-paso-35-56-electricidad-renovable-aie-pide-mas-electrificacion/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "mercado"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Rehabilitación por barrios con oficina local",
    "texto": "Una oficina de barrio gestiona obras, ayudas y financiación por edificio; el modelo Opengela se aplica en barrios vulnerables de Euskadi.",
    "fuente": "https://www.euskadi.eus/gobierno-vasco/-/noticia/2025/ana-telleria-gobierno-vasco-ha-demostrado-que-es-posible-regenerar-barrios-vulnerables-enfoque-integral-y-justo/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "consumo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Electrificar edificios, industria y transporte",
    "texto": "La AIE (2026) señala la electrificación como la vía para aprovechar del todo las renovables españolas.",
    "fuente": "https://roams.es/actualidad/energia/espana-paso-35-56-electricidad-renovable-aie-pide-mas-electrificacion/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "consumo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Pagar por estar disponible: mecanismo de capacidad",
    "texto": "Aprobado por la Comisión Europea en 2026 (9.000 M€): paga a baterías, bombeo, gas y demanda flexible por estar listos cuando la red lo necesita.",
    "fuente": "https://www.merca2.es/2026/06/02/bruselas-aprueba-mecanismo-capacidad-espana-2388439/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "almacenamiento"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Baterías que estabilizan la red",
    "texto": "En Australia, la batería de Hornsdale (150 MW) presta servicios de estabilidad y fue autorizada a dar inercia a la red en 2022.",
    "fuente": "https://www.spglobal.com/energy/en/news-research/latest-news/energy-transition/072722-neoens-150-mw-south-australian-battery-cleared-to-provide-inertia-services",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "almacenamiento"
    ]
   }
  ],
  "proyectos": [
   {
    "nombre": "Som Energia",
    "lugar": "España",
    "tipo": "Cooperativa de energía renovable",
    "texto": "Cooperativa sin ánimo de lucro que comercializa y produce electricidad renovable, con más de 87.000 personas y entidades socias y más de 119.000 contratos en 2025. Su producción propia, 39,8 GWh al año, cubre el 10,5 % de la energía que vende.",
    "web": "https://www.somenergia.coop",
    "fuente": "https://www.energias-renovables.com/autoconsumo/som-impulsa-en-2025-la-creaci-n-20260520",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "mercado",
     "generacion"
    ]
   },
   {
    "nombre": "Comunidad energética Comptem (Enercoop)",
    "lugar": "Crevillent, Alicante",
    "tipo": "Cooperativa eléctrica centenaria / comunidad energética local",
    "texto": "Enercoop, cooperativa fundada en 1925 con unos 10.000 hogares socios, lanzó en 2019 Comptem, que en 2025 tenía 4,4 MW en funcionamiento sobre cubiertas municipales y una planta solar. Unos 3.000 hogares recibían ya energía de alguno de sus nodos, con ahorros del 15 % al 25 % en la factura.",
    "web": null,
    "fuente": "https://www.energias-renovables.com/autoconsumo/crevillent-la-capital-de-la-espa-a-20250707",
    "escalas": [
     "comunidad",
     "pueblo"
    ],
    "subtemas": [
     "distribucion"
    ]
   },
   {
    "nombre": "GoiEner",
    "lugar": "Euskadi y Navarra (sede en Ordizia, Gipuzkoa)",
    "tipo": "Cooperativa de energía renovable",
    "texto": "Cooperativa nacida en 2012 que comercializa electricidad renovable, centrada en Euskadi y Navarra; recibió el Premio Euskadi 2024. Tiene más de 11.000 personas socias y 14.000 contratos (cifra de un comparador, por verificar).",
    "web": null,
    "fuente": "https://www.energias-renovables.com/panorama/la-cooperativa-goiener-premio-euskadi-2024-por-20241213/",
    "escalas": [
     "comunidad",
     "region"
    ],
    "subtemas": [
     "mercado"
    ]
   },
   {
    "nombre": "Ecooo Energía Ciudadana",
    "lugar": "Madrid",
    "tipo": "Cooperativa de trabajo sin ánimo de lucro",
    "texto": "Lleva más de 20 años abriendo la inversión en plantas solares a la ciudadanía e impulsando autoconsumos y comunidades energéticas. Desde su origen han participado 4.772 personas y ha repartido más de 18 millones de euros; en 2025 sumó 670 kW de autoconsumo en 48 instalaciones.",
    "web": "https://ecooo.es",
    "fuente": "https://ecooo.es/wp-content/uploads/2026/01/informe-2025-Ecooo.pdf",
    "escalas": [
     "comunidad",
     "pais"
    ],
    "subtemas": [
     "generacion",
     "distribucion"
    ]
   },
   {
    "nombre": "Parque eólico de Middelgrunden",
    "lugar": "Copenhague (Dinamarca)",
    "tipo": "Cooperativa ciudadana con empresa municipal",
    "texto": "Parque eólico marino de 20 aerogeneradores y 40 MW que funciona desde 2001. La mitad pertenece a unas 10.000 personas de la cooperativa Middelgrunden y la otra mitad a la empresa municipal; produce alrededor del 4 % de la electricidad de Copenhague.",
    "web": "https://www.middelgrunden.dk",
    "fuente": "https://en.wikipedia.org/wiki/Middelgrunden_wind_farm",
    "escalas": [
     "comunidad",
     "pueblo"
    ],
    "subtemas": [
     "generacion"
    ]
   },
   {
    "nombre": "Samsø, isla de energía renovable",
    "lugar": "Samsø (Dinamarca)",
    "tipo": "Programa comunitario y Academia de la Energía",
    "texto": "En 1997 la isla fue elegida para un plan de 10 años y en 2007 se declaró 100 % autosuficiente en energía gracias al viento, el sol y la biomasa. Su Academia de la Energía recibe cada año a miles de visitantes y la isla se ha marcado dejar los combustibles fósiles en 2030.",
    "web": "https://www.visitsamsoe.dk/en/inspiration/energy-academy/",
    "fuente": "https://www.visitsamsoe.dk/en/inspiration/20-years-denmarks-renewable-energy-island/",
    "escalas": [
     "comunidad",
     "pueblo"
    ],
    "subtemas": [
     "generacion",
     "consumo"
    ]
   },
   {
    "nombre": "SolarCrowd (Luz & Humanidad)",
    "lugar": "España",
    "tipo": "Portal de préstamos colectivos",
    "texto": "Portal de préstamos colectivos para energía, vivienda y movilidad sostenible, iniciado en 2021 por el Laboratorio Luz y Humanidad: publica entidades de confianza y ayuda a formalizar préstamos directos de persona a entidad.",
    "web": "https://solarcrowd.com",
    "fuente": null,
    "escalas": [
     "comunidad",
     "pais"
    ],
    "subtemas": [
     "generacion",
     "distribucion"
    ]
   },
   {
    "nombre": "Interconexión del golfo de Bizkaia",
    "lugar": "Gatika (Bizkaia) – Cubnezais (Francia)",
    "tipo": null,
    "texto": "Cable submarino de 276 km de REE y RTE que elevará el intercambio con Francia a 5.000 MW.",
    "web": "https://www.ree.es/en/press-office/news/press-release/2026/07/red-electrica-trasladara-grandes-equipamientos-golfo-bizkaia",
    "fuente": null,
    "escalas": [
     "pais",
     "planeta"
    ],
    "subtemas": [
     "transporte"
    ]
   },
   {
    "nombre": "Opengela",
    "lugar": "Euskadi (Otxarkoaga, Bilbao, y otros barrios)",
    "tipo": null,
    "texto": "Programa de regeneración urbana con oficinas de barrio para rehabilitar edificios y ganar eficiencia.",
    "web": "https://www.euskadi.eus/gobierno-vasco/-/noticia/2021/orain-otxar-avanza-rehabilitacion-edificios-proyecto-autoconsumo-energia-y-propuestas-mejora-habilitabilidad/",
    "fuente": null,
    "escalas": [
     "pais",
     "planeta"
    ],
    "subtemas": [
     "consumo"
    ]
   },
   {
    "nombre": "Central de bombeo Salto de Chira",
    "lugar": "Gran Canaria",
    "tipo": null,
    "texto": "Bombeo reversible de 200 MW y 3,5 GWh de REE que elevará un 37% la renovable de la isla.",
    "web": "https://www.ree.es/sites/default/files/2025-03/NdP_Salto_Chira_visita_Calvino_Aagesen.pdf",
    "fuente": null,
    "escalas": [
     "pais",
     "planeta"
    ],
    "subtemas": [
     "almacenamiento"
    ]
   },
   {
    "nombre": "Hornsdale Power Reserve",
    "lugar": "Australia Meridional",
    "tipo": null,
    "texto": "Gran batería de 150 MW que estabiliza la red junto a un parque eólico.",
    "web": "https://www.pv-tech.org/news/neoen-lauds-grid-stability-gains-as-south-australian-battery-reaches-150mw-capacity",
    "fuente": null,
    "escalas": [
     "pais",
     "planeta"
    ],
    "subtemas": [
     "almacenamiento"
    ]
   }
  ],
  "preguntas": [
   "¿Quieres que la parte de «territorio» hable de los conflictos por grandes parques solares y eólicos en zonas rurales, o prefieres mantenerla solo en propuestas (propiedad local, agrovoltaica)?",
   "¿SolarCrowd tiene ya entidades o proyectos de energía publicados que podamos enlazar desde aquí, con cifras (préstamos, euros, kW)?",
   "¿Te interesa añadir la escala de la movilidad eléctrica (coche, bici, Aeromóvil) dentro de Energía o la dejamos en el sector de Movilidad?",
   "¿Tienes contacto con alguna comunidad energética o cooperativa (Som Energia, GoiEner, Enercoop, Ecooo) que quiera revisar o ampliar su ficha?"
  ],
  "subtemas": [
   {
    "id": "generacion",
    "nombre": "Generación"
   },
   {
    "id": "transporte",
    "nombre": "Red de transporte"
   },
   {
    "id": "distribucion",
    "nombre": "Distribución"
   },
   {
    "id": "mercado",
    "nombre": "Mercado y precio"
   },
   {
    "id": "consumo",
    "nombre": "Consumo y eficiencia"
   },
   {
    "id": "almacenamiento",
    "nombre": "Almacenamiento y flexibilidad"
   }
  ]
 },
 {
  "id": "movilidad",
  "nombre": "Movilidad",
  "resumen": "Moverse de forma ligera, limpia y segura, sin depender del coche.",
  "ambito": "Cómo nos desplazamos: a pie, en bici, en vehículos ligeros, en transporte público y entre territorios.",
  "vision": {
   "escena3d": "movilidad",
   "intro": "Una movilidad ligera, solar y a escala humana, donde la calle vuelve a ser de las personas. Comunicada a través de las bellas artes.",
   "equipo": "Un equipo humano recopila esta visión y la comunica a través del arte digital y físico. El Aeromóvil de Luz & Humanidad es una de sus expresiones: un diseño 3D abierto de vehículo ultraligero.",
   "bloques": [
    {
     "titulo": "Vehículo personal ligero",
     "texto": "Imaginamos un día a día en el que moverse sea ligero en todos los sentidos: vehículos que pesan decenas de kilos y no toneladas, carenados en forma de gota que cortan el aire, techos que recogen el sol y piernas que pedalean por gusto y por salud. La bicicleta, el velomóvil y los vehículos ligeros eléctricos (VLE) cubren la mayoría de los trayectos cotidianos, y el coche deja de ser la opción por defecto para pasar a ser la excepción.",
     "puntos": [
      "La bicicleta y la bici de pedaleo asistido como columna vertebral de los trayectos cortos.",
      "Velomóviles carenados (con techo y protección frente a la lluvia) para distancias medias y climas variables.",
      "Vehículos ligeros eléctricos (categorías L) de una o dos plazas, con un consumo de energía mucho menor que el de un turismo.",
      "Aerodinámica de gota y peso mínimo, en la tradición de los Kabinenroller de los años 50 (Messerschmitt KR200, Fend) y de prototipos solares actuales como Aptera.",
      "Energía solar a bordo y recarga en casa o en la comunidad: kilómetros cotidianos casi sin coste.",
      "Diseño reparable, modular y de código abierto, con fabricación local."
     ],
     "imagenes": [
      {
       "titulo": "Velomóvil Podbike Frikar",
       "lugar": "Noruega",
       "src": "https://upload.wikimedia.org/wikipedia/commons/d/d9/Podbike_FRIKAR_velomobile.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:Podbike_FRIKAR_velomobile.jpg"
      },
      {
       "titulo": "Velomóvil Leiba X-Stream",
       "lugar": "Europa (por verificar lugar exacto)",
       "src": "https://upload.wikimedia.org/wikipedia/commons/7/71/Leiba_x-stream_velomobile.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:Leiba_x-stream_velomobile.jpg"
      },
      {
       "titulo": "Aptera (prototipo 2019)",
       "lugar": "California, EE. UU.",
       "src": "https://upload.wikimedia.org/wikipedia/commons/c/c3/APTERA2019_ASPHALT-DOORS-CLOSED_crop.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:APTERA2019_ASPHALT-DOORS-CLOSED_crop.jpg"
      },
      {
       "titulo": "Messerschmitt KR200",
       "lugar": "Alemania (vehículo histórico)",
       "src": "https://upload.wikimedia.org/wikipedia/commons/2/2f/Messerschmitt_KR200_%288757326643%29.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:Messerschmitt_KR200_(8757326643).jpg"
      }
     ],
     "escena3d": "movilidad",
     "escalas": [
      "individuo"
     ],
     "subtemas": []
    },
    {
     "titulo": "Movilidad urbana",
     "texto": "Soñamos con ciudades donde todo lo esencial (escuela, centro de salud, mercado, trabajo, parque) esté a 15 minutos a pie o en bici. Las calles vuelven a ser lugares de encuentro: los niños juegan, los mayores pasean y el aire está limpio. Pontevedra, las superillas de Barcelona, Groningen y Ámsterdam demuestran que no es una utopía, sino una decisión política y ciudadana.",
     "puntos": [
      "Ciudad de los 15 minutos (concepto de Carlos Moreno): proximidad de servicios y usos mixtos.",
      "Centros peatonales con prioridad absoluta del peatón y acceso motorizado solo para servicios, como en Pontevedra desde 1999.",
      "Supermanzanas (superilles): calles pacificadas convertidas en ejes verdes y plazas.",
      "Redes de carril bici continuas, seguras y separadas, y aparcamientos masivos de bicis junto a las estaciones.",
      "Planes de circulación que impiden atravesar el centro en coche, como el de Groningen (1977).",
      "Calles a 30 km/h o menos, con más arbolado, sombra y bancos."
     ],
     "imagenes": [
      {
       "titulo": "Calle Marqués de Riestra peatonal",
       "lugar": "Pontevedra, España",
       "src": "https://upload.wikimedia.org/wikipedia/commons/c/cd/Calle_Marqu%C3%A9s_de_Riestra_peatonal_-_Pontevedra_capital.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:Calle_Marqu%C3%A9s_de_Riestra_peatonal_-_Pontevedra_capital.jpg"
      },
      {
       "titulo": "Superilla de Sant Antoni",
       "lugar": "Barcelona, España",
       "src": "https://upload.wikimedia.org/wikipedia/commons/9/97/Superilla_del_barri_de_Sant_Antoni%2C_Barcelona_2.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:Superilla_del_barri_de_Sant_Antoni,_Barcelona_2.jpg"
      },
      {
       "titulo": "Bicicletas en Groningen",
       "lugar": "Groningen, Países Bajos",
       "src": "https://upload.wikimedia.org/wikipedia/commons/6/6c/Swapfiets%2C_Groningen_%282023%29_01.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:Swapfiets,_Groningen_(2023)_01.jpg"
      },
      {
       "titulo": "Fietsflat de Ámsterdam",
       "lugar": "Ámsterdam, Países Bajos",
       "src": "https://upload.wikimedia.org/wikipedia/commons/7/7f/Fietsflat_bike_parking_AMS_12_2016_0068.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:Fietsflat_bike_parking_AMS_12_2016_0068.jpg"
      }
     ],
     "escena3d": "movilidad",
     "escalas": [
      "pueblo"
     ],
     "subtemas": []
    },
    {
     "titulo": "Movilidad territorial",
     "texto": "Imaginamos un territorio conectado en el que vivir en un pueblo no obligue a tener un coche por adulto. El tren regional vuelve a ser la espina dorsal; autobuses y taxis a demanda, coches compartidos de la comunidad y vehículos ligeros completan el último kilómetro. Las antiguas vías se transforman en vías verdes que unen pueblos a pie y en bici y reactivan la economía local.",
     "puntos": [
      "Tren regional frecuente, con horarios coordinados con autobús y bici (bici a bordo).",
      "Transporte a demanda rural: autobús o taxi que se reserva por teléfono o por app y para en cada pueblo.",
      "Carsharing cooperativo y municipal, con vehículos eléctricos compartidos entre vecinos.",
      "Movilidad como servicio (MaaS) en los pueblos: un solo billete y una sola app para tren, bus, taxi compartido y bici.",
      "Vías verdes: antiguos trazados ferroviarios convertidos en itinerarios para caminar y pedalear.",
      "Comunidades energéticas que recargan los vehículos compartidos con sol local."
     ],
     "imagenes": [
      {
       "titulo": "Tren Renfe serie 599 en Puebla de Valverde",
       "lugar": "Puebla de Valverde (Teruel), España",
       "src": "https://upload.wikimedia.org/wikipedia/commons/3/38/RENFE_599_Puebla_de_Valverde.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:RENFE_599_Puebla_de_Valverde.jpg"
      },
      {
       "titulo": "Media Distancia Barcelona–Girona",
       "lugar": "Maçanet-Massanes (Girona), España",
       "src": "https://upload.wikimedia.org/wikipedia/commons/e/e4/Media_distancia_Barcelona_Girona_RENFE_Class_449_EMU_Macanet-Massanes.JPG",
       "fuente": "https://commons.wikimedia.org/wiki/File:Media_distancia_Barcelona_Girona_RENFE_Class_449_EMU_Macanet-Massanes.JPG"
      },
      {
       "titulo": "Vía Verde Benicàssim–Orpesa",
       "lugar": "Castellón, España",
       "src": "https://upload.wikimedia.org/wikipedia/commons/5/55/V%C3%ADa_Verde_Beni-Orpesa10.JPG",
       "fuente": "https://commons.wikimedia.org/wiki/File:V%C3%ADa_Verde_Beni-Orpesa10.JPG"
      },
      {
       "titulo": "Navajas desde la Vía Verde",
       "lugar": "Navajas (Castellón), España",
       "src": "https://upload.wikimedia.org/wikipedia/commons/4/49/Navajas._Vista_desde_la_V%C3%ADa_Verde_3.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:Navajas._Vista_desde_la_V%C3%ADa_Verde_3.jpg"
      }
     ],
     "escena3d": "pueblo",
     "escalas": [
      "provincia",
      "region"
     ],
     "subtemas": []
    }
   ],
   "arte": {
    "src": "/calendario-arte/miniaturas/mes-06-d.jpg",
    "grande": "/calendario-arte/ilustraciones/mes-06-d.jpg",
    "tema": "Tecnología y Energía"
   }
  },
  "retos": [
   {
    "ambito": "España",
    "titulo": "Dependencia del coche y vehículos cada vez más grandes y pesados",
    "texto": "Los SUV superan ya la mitad de las matriculaciones en España: 309.477 de 535.423 turismos en el primer semestre de 2024 (≈58 %), y fuentes del sector sitúan su cuota por encima del 60 % en 2026. En Europa, el peso medio de los coches más populares ha crecido en siete de ocho segmentos; en el segmento C, de 1.274 kg (2001) a 1.454 kg (2024), según datos de JATO.",
    "fuente": "https://www.diariomotor.com/noticia/segmentos-matriculaciones-espana-suv-utilitarios-compactos-2024/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "vehiculo",
     "movilidad_activa"
    ]
   },
   {
    "ambito": "España",
    "titulo": "El transporte, primera fuente de emisiones",
    "texto": "En 2024 el transporte supuso el 33,7 % de las emisiones de gases de efecto invernadero de España (total bruto de 267,7 Mt CO2-eq), y el transporte por carretera por sí solo el 31,3 % del total nacional, según el Inventario Nacional del MITECO.",
    "fuente": "https://www.miteco.gob.es/content/dam/miteco/es/calidad-y-evaluacion-ambiental/temas/sistema-espanol-de-inventario-sei-/inventario-gases-efecto-invernadero/resumen-Inventario-GEI-2026.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "vehiculo",
     "mercancias"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Despoblación y falta de transporte público rural",
    "texto": "De los 8.131 municipios españoles, 6.650 son rurales; en el medio rural hay 698 vehículos por cada 1.000 habitantes (470 en las ciudades) y el vehículo privado supuso el 96,2 % del gasto en transporte en 2023. Según un estudio de BeConfluence (2024) citado por la DGT, el 46,8 % de la población rural considera claramente insuficiente la frecuencia del transporte público, y hay que recorrer de media 22 km para acceder a equipamientos básicos.",
    "fuente": "https://www.dgt.es/comunicacion/noticias/20250801-el-rural-se-mueve-con-dificultad",
    "escalas": [
     "pueblo",
     "pais"
    ],
    "subtemas": [
     "transporte_publico"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Calles ocupadas por el coche",
    "texto": "El estudio «Callegrafías» de la Red de Ciudades que Caminan, con unas 950 calles de 85 ciudades españolas, calcula que el 68 % del espacio público se reserva al coche y solo el 32 % al peatón (25 % en las periferias). El 51,1 % de las calles analizadas no tiene una acera accesible de 2,4 m (estudio de una asociación pro peatón, con muestra limitada).",
    "fuente": "https://www.motorpasion.com/futuro-movimiento/coches-solo-dejan-30-nuestras-calles-a-peatones-mitad-no-accesibles-este-estudio",
    "escalas": [
     "pueblo",
     "pais"
    ],
    "subtemas": [
     "movilidad_activa"
    ]
   },
   {
    "ambito": "España",
    "titulo": "El coste de moverse pesa en los hogares",
    "texto": "Según la Encuesta de Presupuestos Familiares del INE, el gasto medio por hogar fue de 34.044 euros en 2024, y el transporte supuso el 11,4 % (unos 3.877 euros al año). Los hogares rurales gastan además un 10,9 % más en transporte que los urbanos, según datos recogidos por la DGT.",
    "fuente": "https://ine.es/dyngs/Prensa/es/EPF2024.htm",
    "escalas": [
     "individuo",
     "pueblo",
     "pais"
    ],
    "subtemas": [
     "transporte_publico",
     "vehiculo"
    ]
   },
   {
    "ambito": "UE / España",
    "titulo": "Normativa que frena los vehículos ultraligeros",
    "texto": "El Reglamento (UE) 168/2013 solo excluye de la homologación las bicicletas de pedaleo asistido con motor de 250 W como máximo cuya asistencia se corte antes de los 25 km/h. Cualquier velomóvil o vehículo ultraligero que supere esos límites pasa a las categorías L (L1e–L7e), con homologación, matrícula, seguro y casco obligatorios, unos costes que frenan a los pequeños fabricantes. La Comisión Europea anunció en 2020 una revisión de la homologación de los vehículos eléctricos ligeros (estado actual por verificar).",
    "fuente": "https://www.legislation.gov.uk/eur/2013/168/article/2",
    "escalas": [
     "pais",
     "continente"
    ],
    "subtemas": [
     "vehiculo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Siniestralidad vial",
    "texto": "En 2025 murieron 1.119 personas en las vías interurbanas (dato provisional a 24 horas), 35 menos que en 2024, y 4.936 resultaron heridas con hospitalización. Los usuarios vulnerables (motoristas, peatones y ciclistas) suman el 40 % de las víctimas mortales: 304 motoristas, 103 peatones y 40 ciclistas.",
    "fuente": "https://www.dgt.es/comunicacion/notas-de-prensa/20260108-2025-finaliza-1119-fallecidos-en-siniestros-de-trafico-en-vias-interurbanas",
    "escalas": [
     "pueblo",
     "pais"
    ],
    "subtemas": [
     "seguridad_vial"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Carreteras que se rompen más rápido de lo que se arreglan",
    "texto": "54.373 de los 101.700 km de la red necesitan actuación en menos de cuatro años; en 2022 eran unos 13.000 km muy graves (AEC, 2025).",
    "fuente": "https://asefma.es/wp-content/uploads/2025/07/NP-Auditoria-estado-carreteras-AEC-2025_DEF_con-QR_03-07-25.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "infraestructuras"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Corredores ferroviarios a medio hacer",
    "texto": "El Corredor Mediterráneo tiene 658 km en servicio de 1.838; el resto está en obras o en proyecto (marzo 2026).",
    "fuente": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/transportes-movilidad-sostenible/paginas/2026/220426-puente-corredor-mediterraneo.aspx",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "infraestructuras"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Un territorio muy disperso",
    "texto": "Solo en Castilla y León hacen falta 1.840 rutas a demanda para llegar a 5.094 núcleos de población (2024).",
    "fuente": "https://elmirondesoria.es/cyl/junta-de-castilla-y-leon/el-bono-rural-gratuito-de-transporte-a-la-demanda-crece-en-2024-hasta-los-249-238-usuarios/amp",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "transporte_publico"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Descuentos que dependen de prórrogas",
    "texto": "Las ayudas al transporte costaron 3.400 millones hasta diciembre de 2024 y se renuevan año a año.",
    "fuente": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/transportes-movilidad-sostenible/Paginas/2025/240125-uso-transporte-publico-descuentos.aspx",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "transporte_publico"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Un parque cada vez más viejo",
    "texto": "La edad media llega a 14,6 años, con grandes diferencias: 11,3 en Madrid y 16,9 en Castilla y León (ANFAC, 2025).",
    "fuente": "https://es.motor1.com/news/804445/coches-espana-edad-media-antiguos/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "vehiculo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Coches más grandes y pesados",
    "texto": "Los SUV ya son unos 6 de cada 10 turismos matriculados (2026), lo que sube el consumo y el espacio ocupado.",
    "fuente": "https://www.motor16.com/las-ultimas-noticias/coches-suv-dominan-mercado-espanol/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "vehiculo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "La bici aún es minoritaria",
    "texto": "Solo un 3,2% la usa a diario para ir a trabajar o estudiar (2024), frente al 27% de viajes en bici en Países Bajos.",
    "fuente": "https://www.industriambiente.com/media/uploads/noticias/documentos/2024_RedBici_Barometro_Bicicleta_Informe.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "movilidad_activa"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Calles peligrosas para quien camina",
    "texto": "En 2025 murieron 222 peatones y 29 ciclistas en vías urbanas (DGT).",
    "fuente": "https://www.dgt.es/comunicacion/notas-de-prensa/20261015-balance-de-seguridad-vial-2025/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "movilidad_activa"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Casi todo va por carretera",
    "texto": "El tren solo mueve el 4% de las toneladas-kilómetro; la Ley 9/2025 lo reconoce como cuota baja.",
    "fuente": "https://www.boe.es/eli/es/l/2025/12/03/9",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "mercancias"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Emisiones que siguen subiendo",
    "texto": "El transporte supone el 33,7% de las emisiones de España y la carretera el 31,3% (2024).",
    "fuente": "https://www.miteco.gob.es/content/dam/miteco/es/calidad-y-evaluacion-ambiental/temas/sistema-espanol-de-inventario-sei-/inventario-gases-efecto-invernadero/resumen-Inventario-GEI-2026.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "mercancias"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Diez años sin bajar",
    "texto": "Las muertes apenas bajaron un 0,6% en 2025 y siguen por encima de las 1.755 de 2019.",
    "fuente": "https://www.dgt.es/comunicacion/notas-de-prensa/20261015-balance-de-seguridad-vial-2025/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "seguridad_vial"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Motoristas y carreteras secundarias",
    "texto": "En vías interurbanas murieron 304 motoristas en 2025 (+5), y 232 de ellos en carreteras convencionales.",
    "fuente": "https://www.dgt.es/comunicacion/notas-de-prensa/20260108-2025-finaliza-1119-fallecidos-en-siniestros-de-trafico-en-vias-interurbanas",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "seguridad_vial"
    ]
   }
  ],
  "soluciones": [
   {
    "ambito": "Internacional",
    "titulo": "Vehículos ultraligeros, aerodinámicos y solares",
    "texto": "Vehículos de tres ruedas en forma de gota, como Aptera, prometen hasta 643 km de autonomía y hasta 64 km diarios recargados solo con sus paneles solares; en 2026 fabricó sus primeros vehículos de validación. Los velomóviles de pedaleo asistido (unos 100 kg y 250 W) ofrecen protección frente a la lluvia con un consumo mínimo.",
    "fuente": "https://www.electrive.com/es/2026/03/04/aptera-builds-first-solar-ev-on-validation-production-line/",
    "escalas": [
     "planeta"
    ],
    "subtemas": [
     "vehiculo"
    ]
   },
   {
    "ambito": "Internacional / España",
    "titulo": "Ciudad de proximidad (15 minutos)",
    "texto": "La propuesta del urbanista Carlos Moreno, aplicada en París, consiste en organizar la ciudad para que las funciones básicas de la vida diaria queden a unos 15 minutos a pie o en bici, lo que reduce la necesidad de desplazarse en coche. Las supermanzanas de Barcelona son una de sus aplicaciones en España.",
    "fuente": "https://www.bbva.com/es/sostenibilidad/siete-lugares-donde-si-avanza-la-ciudad-de-los-15-minutos/",
    "escalas": [
     "pueblo",
     "pais",
     "planeta"
    ],
    "subtemas": [
     "movilidad_activa"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Prioridad peatonal y ciclista: supermanzanas",
    "texto": "En la supermanzana del mercado de Sant Antoni (Barcelona) se midió un descenso del 25 % en los niveles de NO2, según la OMS. Extendido a toda la ciudad, el modelo podría evitar casi 700 muertes al año.",
    "fuente": "https://www.who.int/news-room/feature-stories/detail/barcelona-using-urban-design-to-improve-urban-health",
    "escalas": [
     "pueblo",
     "pais"
    ],
    "subtemas": [
     "movilidad_activa",
     "seguridad_vial"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Transporte a demanda rural",
    "texto": "Castilla y León lleva el sistema más desarrollado: 123 zonas, 1.966 rutas y más de 4 millones de viajes desde 2004, con un Bono Transporte Rural gratuito desde 2021. Otros ejemplos son Sierracar (28 taxis para 42 localidades de la sierra norte de Madrid, a 4 euros por viaje) y Celering (Valle de Arratia, Bizkaia).",
    "fuente": "https://www.dgt.es/comunicacion/noticias/20250801-el-rural-se-mueve-con-dificultad",
    "escalas": [
     "pueblo",
     "pais"
    ],
    "subtemas": [
     "transporte_publico"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Carsharing comunitario y cooperativo",
    "texto": "Cooperativas de consumo sin ánimo de lucro, como Som Mobilitat, ofrecen vehículos eléctricos compartidos a vecinos y ayuntamientos; hacerse socio cuesta una cuota única de 10 euros. Varios municipios catalanes (Santa Perpètua de Mogoda, Castellbisbal, Rubí, Torelló) comparten así coches con su plantilla y sus vecinos.",
    "fuente": "https://www.sostenible.cat/print/noticia/santa-perpetua-castellbisbal-rubi-i-torello-promouen-la-mobilitat-electrica-compartida",
    "escalas": [
     "comunidad",
     "pueblo",
     "pais"
    ],
    "subtemas": [
     "vehiculo",
     "transporte_publico"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Electrificación con energía solar comunitaria",
    "texto": "En 2025, el MITECO apoyó con 10,7 millones de euros (programa CE Implementa, IDAE) 106 nuevas comunidades energéticas. Incluyen 62 puntos de recarga para vehículos eléctricos, cinco sistemas de vehículos eléctricos compartidos y cuatro de préstamo de bicis eléctricas; 44 proyectos se dirigen a la movilidad sostenible.",
    "fuente": "https://www.miteco.gob.es/content/dam/miteco/es/prensa/20251030_NdP_El_MITECO_apoya_la_creaci%C3%B3n_de_106_nuevas_comunidades%20(2).pdf",
    "escalas": [
     "comunidad",
     "pais"
    ],
    "subtemas": [
     "vehiculo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Tren y vías verdes",
    "texto": "El Programa Vías Verdes, coordinado desde 1993 por la Fundación de los Ferrocarriles Españoles, ha recuperado más de 3.600 km de antiguas líneas en desuso en 143 itinerarios para peatones y ciclistas. Solo en 1984 se cerraron 914 km de vías férreas consideradas deficitarias, una red que hoy sirve como corredor verde y que podría complementar el tren regional.",
    "fuente": "https://www.viasverdes.com/",
    "escalas": [
     "region",
     "pais"
    ],
    "subtemas": [
     "infraestructuras",
     "movilidad_activa"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Conservar a tiempo",
    "texto": "Arreglar pronto sale más barato: el déficit subió un 43% desde 2022, y casi la mitad del aumento se debe al propio deterioro (AEC, 2025).",
    "fuente": "https://asefma.es/wp-content/uploads/2025/07/NP-Auditoria-estado-carreteras-AEC-2025_DEF_con-QR_03-07-25.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "infraestructuras"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Priorizar el ferrocarril que conecta",
    "texto": "Concentrar la inversión en corredores y terminales de mercancías; Adif ejecutó 5.230 millones en 2025 (+16%).",
    "fuente": "https://www.cnmc.es/sites/default/files/6703004.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "infraestructuras"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Abonos baratos y sencillos",
    "texto": "Desde los descuentos de 2022 hay unos 100 millones de viajes más al mes, un 12% por encima de 2019 (2024).",
    "fuente": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/transportes-movilidad-sostenible/Paginas/2025/240125-uso-transporte-publico-descuentos.aspx",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "transporte_publico"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Coche eléctrico compartido y cooperativo",
    "texto": "Cooperativas de consumo ponen coches eléctricos al servicio de barrios y pueblos para que no haga falta tener uno propio.",
    "fuente": "https://www.cidob.org/en/publications/som-mobilitat-cooperative-whose-services-are-increasing-sustainable-mobility",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "vehiculo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Ciudad a 30 km/h",
    "texto": "Con el límite de 30, en 2024 murieron un 16% menos de peatones y un 19% menos de ciclistas en ciudad que en 2019.",
    "fuente": "https://www.dgt.es/comunicacion/notas-de-prensa/20260511-celebracion-implantacion-30-kmh",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "movilidad_activa"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Prioridad peatonal",
    "texto": "Pontevedra peatonalizó su centro desde 1999: más de una década sin muertes por atropello y comercio local +7%.",
    "fuente": "https://es.euronews.com/2022/09/16/la-premiada-transformacion-de-pontevedra-en-favor-de-la-peatonalizacion-y-la-mejora-de-la-",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "movilidad_activa"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Autopistas ferroviarias",
    "texto": "Trenes que llevan los remolques de camión en largos trayectos; el Ministerio licitó 110 millones para el eje Algeciras–Zaragoza.",
    "fuente": "https://www.bolsamania.com/noticias/empresas/economia--transportes-licita-dos-contratos-de-110-millones-para-la-autopista-ferroviaria-entre-algeciras-y-zaragoza--16464668.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "mercancias"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Política estable de cambio al tren",
    "texto": "Suiza combina túneles de base y reglas al camión: el tren lleva el 72,3% del tráfico que cruza los Alpes (2024).",
    "fuente": "https://www.verkehrsrundschau.de/nachrichten/transport-logistik/schweiz-leicht-ruecklaeufiger-bahnanteil-am-alpenquerenden-gueterverkehr-3555225",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "mercancias"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Visión Cero",
    "texto": "Suecia diseña vías y velocidades para que ningún error sea mortal; hoy tiene 20 muertes por millón, de las más bajas de la UE.",
    "fuente": "https://bransch.trafikverket.se/en/startpage/operations/Operations-road/vision-zero-academy/Effects-of-Vision-Zero/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "seguridad_vial"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Velocidad adaptada a la vía",
    "texto": "Con 30 km/h el riesgo de morir atropellado baja del 80% al 10%; casi 4 de cada 10 ciudades grandes redujeron su siniestralidad.",
    "fuente": "https://www.dgt.es/comunicacion/notas-de-prensa/20260511-celebracion-implantacion-30-kmh",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "seguridad_vial"
    ]
   }
  ],
  "proyectos": [
   {
    "nombre": "Som Mobilitat",
    "lugar": "Cataluña, España",
    "tipo": "Cooperativa de carsharing eléctrico",
    "texto": "Cooperativa de consumo sin ánimo de lucro, nacida de un grupo de activistas en 2016, que ofrece servicios de vehículo eléctrico compartido y construye de forma colectiva una red de carsharing que quiere llegar a todos los barrios y municipios de Cataluña. Colabora con ayuntamientos. Número actual de socios y vehículos: por verificar.",
    "web": "https://www.sommobilitat.coop/",
    "fuente": "https://www.cidob.org/en/publications/som-mobilitat-cooperative-whose-services-are-increasing-sustainable-mobility",
    "escalas": [
     "comunidad",
     "region"
    ],
    "subtemas": [
     "vehiculo"
    ]
   },
   {
    "nombre": "Modelo urbano de Pontevedra",
    "lugar": "Pontevedra, Galicia, España",
    "tipo": "Modelo urbano / peatonalización",
    "texto": "Desde 1999 Pontevedra peatonalizó todo su casco antiguo y dio prioridad absoluta al peatón en el centro, donde el tráfico está limitado a 10 km/h y solo se admite el acceso justificado. Según Euronews, en más de una década no ha habido ninguna muerte por atropello, y en 2014 recibió un reconocimiento de la ONU como ciudad más cómoda de Europa para vivir (por verificar el nombre exacto del premio).",
    "web": "https://www.pontevedra.gal/",
    "fuente": "https://es.euronews.com/2022/09/16/la-premiada-transformacion-de-pontevedra-en-favor-de-la-peatonalizacion-y-la-mejora-de-la-",
    "escalas": [
     "pueblo"
    ],
    "subtemas": [
     "movilidad_activa",
     "seguridad_vial"
    ]
   },
   {
    "nombre": "Aptera",
    "lugar": "California, EE. UU.",
    "tipo": "Vehículo eléctrico solar ultraeficiente",
    "texto": "Vehículo de tres ruedas con carrocería en gota y paneles solares integrados: hasta 643 km de autonomía y hasta 64 km diarios de recarga solar. En 2026 puso en marcha una línea de validación de 14 estaciones y ha fabricado sus primeros vehículos de prueba; las entregas a clientes están previstas para finales de 2026 (pendiente de certificación).",
    "web": "https://aptera.us/",
    "fuente": "https://www.electrive.com/es/2026/03/04/aptera-builds-first-solar-ev-on-validation-production-line/",
    "escalas": [
     "individuo",
     "planeta"
    ],
    "subtemas": [
     "vehiculo"
    ]
   },
   {
    "nombre": "Podbike Frikar (velomóvil)",
    "lugar": "Noruega",
    "tipo": "Velomóvil eléctrico de pedaleo asistido",
    "texto": "Velomóvil cerrado de cuatro ruedas, con pedaleo asistido sin cadena (250 W, 25 km/h), unos 100 kg de peso y unos 84 cm de ancho; costaba unos 10.900 euros. Referente de diseño, aunque la empresa anunció su quiebra el 16 de mayo de 2025: sirve como caso de estudio sobre lo difícil que es industrializar el sector.",
    "web": "https://podbike.com/",
    "fuente": "https://veemo.ca/blogs/news/podbike-frikar-vs-veemo-se-what-to-buy-now-that-frikar-is-gone",
    "escalas": [
     "individuo",
     "continente"
    ],
    "subtemas": [
     "vehiculo",
     "movilidad_activa"
    ]
   },
   {
    "nombre": "Groningen, ciudad ciclista",
    "lugar": "Groningen, Países Bajos",
    "tipo": "Plan de circulación / ciudad ciclista",
    "texto": "En 1977 el plan de circulación dividió el centro en cuatro sectores que no pueden cruzarse directamente en coche, de modo que los conductores deben usar la ronda exterior. Hoy cerca del 61 % de los desplazamientos de la ciudad, de algo más de 200.000 habitantes, se hacen en bicicleta.",
    "web": "https://gemeente.groningen.nl/",
    "fuente": "https://www.archdaily.com/1114738/groningen-a-dutch-benchmark-for-urban-mobility",
    "escalas": [
     "pueblo"
    ],
    "subtemas": [
     "movilidad_activa"
    ]
   },
   {
    "nombre": "Transporte a la Demanda de Castilla y León",
    "lugar": "Castilla y León, España",
    "tipo": "Transporte público rural a demanda",
    "texto": "Sistema autonómico en el que el autobús rural solo circula si se reserva: 123 zonas, 1.966 rutas y más de 4 millones de viajes desde 2004. El Bono Transporte Rural es gratuito desde 2021 y tuvo 354.699 viajeros en 2023.",
    "web": "https://www.jcyl.es/",
    "fuente": "https://www.dgt.es/comunicacion/noticias/20250801-el-rural-se-mueve-con-dificultad",
    "escalas": [
     "region"
    ],
    "subtemas": [
     "transporte_publico"
    ]
   },
   {
    "nombre": "Programa Vías Verdes",
    "lugar": "España",
    "tipo": "Reconversión de ferrocarriles en desuso",
    "texto": "Programa coordinado por la Fundación de los Ferrocarriles Españoles desde 1993, que ha convertido más de 3.600 km de líneas ferroviarias abandonadas en 143 itinerarios para caminar y pedalear, con un fuerte impacto en el turismo rural.",
    "web": "https://www.viasverdes.com/",
    "fuente": "https://www.viasverdes.com/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "movilidad_activa",
     "infraestructuras"
    ]
   },
   {
    "nombre": "Aeromóvil (Luz & Humanidad)",
    "lugar": "España",
    "tipo": "Prototipo propio",
    "texto": "Vehículo ultraligero aerodinámico de bajo consumo, inspirado en Fend 2000 / Kabinenroller y Aptera: carenado en gota, techo solar, pedaleo asistido sin cadena.",
    "web": "https://humanity.wiki/aeromovil",
    "fuente": "",
    "escalas": [
     "individuo"
    ],
    "subtemas": [
     "vehiculo"
    ]
   },
   {
    "nombre": "Corredor Mediterráneo",
    "lugar": "España (de Algeciras a la frontera francesa)",
    "tipo": null,
    "texto": "Eje ferroviario de pasajeros y mercancías; el 83% del trazado ya está en obras o terminado (2026).",
    "web": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/transportes-movilidad-sostenible/paginas/2026/220426-puente-corredor-mediterraneo.aspx",
    "fuente": null,
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "infraestructuras"
    ]
   },
   {
    "nombre": "Autopista ferroviaria Algeciras–Zaragoza",
    "lugar": "España",
    "tipo": null,
    "texto": "Adaptación de la línea para subir semirremolques de camión al tren.",
    "web": "https://www.bolsamania.com/noticias/empresas/economia--transportes-licita-dos-contratos-de-110-millones-para-la-autopista-ferroviaria-entre-algeciras-y-zaragoza--16464668.html",
    "fuente": null,
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "mercancias"
    ]
   },
   {
    "nombre": "Traslado de mercancías al tren en los Alpes",
    "lugar": "Suiza",
    "tipo": null,
    "texto": "Túneles de base (Gotardo, Lötschberg) y política de traslado de camiones al ferrocarril.",
    "web": "https://www.bav.admin.ch/dam/bav/it/dokumente/verkehrstraeger/eisenbahn/gueterverkehr/1-semesterbericht-2024-aqgv.pdf.download.pdf/1.%20Semesterbericht%202024.pdf",
    "fuente": null,
    "escalas": [
     "pais",
     "planeta"
    ],
    "subtemas": [
     "mercancias"
    ]
   },
   {
    "nombre": "Visión Cero",
    "lugar": "Suecia",
    "tipo": null,
    "texto": "Política nacional desde 1997 que busca cero muertos y heridos graves en la vía.",
    "web": "https://bransch.trafikverket.se/en/startpage/operations/Operations-road/vision-zero-academy/Effects-of-Vision-Zero/",
    "fuente": null,
    "escalas": [
     "pais",
     "planeta"
    ],
    "subtemas": [
     "seguridad_vial"
    ]
   },
   {
    "nombre": "Bilbao, ciudad 30",
    "lugar": "Bilbao, España",
    "tipo": null,
    "texto": "Gran ciudad con 30 km/h en la mayoría de sus calles y menos siniestros (DGT, 2024).",
    "web": "https://revista.dgt.es/images/1-La-nueva-transformacion-de-Bilbao.-Ayto-Bilbao.pdf",
    "fuente": null,
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "seguridad_vial"
    ]
   }
  ],
  "preguntas": [
   "¿El Aeromóvil debe ser el proyecto destacado del sector, con enlace a humanity.wiki/aeromovil y su visor 3D?",
   "Podbike (velomóvil) quebró en 2025: ¿lo mantenemos como referente de diseño o buscamos un fabricante activo?",
   "¿Qué escala te importa más mostrar primero: vehículo personal, ciudad o territorio rural?",
   "¿Conoces proyectos de transporte compartido en pueblos o comunidades que quieras añadir?"
  ],
  "subtemas": [
   {
    "id": "infraestructuras",
    "nombre": "Infraestructuras"
   },
   {
    "id": "transporte_publico",
    "nombre": "Transporte público"
   },
   {
    "id": "vehiculo",
    "nombre": "Vehículo privado"
   },
   {
    "id": "movilidad_activa",
    "nombre": "A pie y en bici"
   },
   {
    "id": "mercancias",
    "nombre": "Mercancías"
   },
   {
    "id": "seguridad_vial",
    "nombre": "Seguridad vial"
   }
  ]
 },
 {
  "id": "politica",
  "nombre": "Política",
  "resumen": "Decidir juntos lo que nos afecta: participación cercana, cuentas claras y deliberación informada por temas.",
  "ambito": "Cómo tomamos las decisiones colectivas, desde la asamblea del barrio hasta el país y el planeta: participación, transparencia, deliberación y voto.",
  "vision": {
   "escena3d": "comunidad",
   "intro": "Imaginamos una política en la que cada persona entiende lo que se decide, puede aportar lo que sabe y ve qué pasa con su voz. Las diferencias no se convierten en trincheras: se ponen sobre la mesa, con datos y con respeto, hasta encontrar lo que nos une.",
   "equipo": "Un equipo humano recopila esta visión y la comunica a través del arte digital y físico para que sea accesible a todos los seres humanos. El botón «Ver la visión en 3D» abre la herramienta de visualización del ideal de Luz & Humanidad.",
   "bloques": [
    {
     "titulo": "Comunidad: decisiones cercanas",
     "texto": "Lo que afecta a una calle, un edificio o un pueblo se decide entre quienes lo viven. Las asambleas vecinales son lugares de escucha, donde se proponen ideas, se comparan opciones y se acuerdan prioridades con calma.",
     "puntos": [
      "Asambleas abiertas y periódicas en cada barrio o pueblo, con horarios que permitan ir a quien trabaja o cuida.",
      "Información previa sencilla: qué se decide, cuánto cuesta y qué opciones hay.",
      "Turnos de palabra cuidados y moderación neutral, para que hablen también las personas que suelen callar.",
      "Acuerdos escritos y públicos, con una persona responsable de cada uno.",
      "Seguimiento visible: en la siguiente reunión se cuenta qué se ha hecho con lo acordado.",
      "Herramientas digitales como complemento, nunca como sustituto del encuentro cara a cara."
     ],
     "imagenes": [],
     "escena3d": "comunidad",
     "escalas": [
      "comunidad"
     ],
     "subtemas": []
    },
    {
     "titulo": "Municipio y región: presupuestos participativos y cuentas claras",
     "texto": "Los vecinos y vecinas proponen y votan en qué se gasta una parte del presupuesto público, y pueden seguir cada euro hasta la obra terminada. La administración publica sus datos de forma comprensible, y cualquiera puede consultarlos sin pedir permiso.",
     "puntos": [
      "Una parte del presupuesto municipal y regional decidida directamente por la ciudadanía, en ciclos anuales.",
      "Propuestas evaluadas técnicamente (viabilidad y coste) antes de la votación final, con explicación pública de por qué se descarta cada una.",
      "Presupuestos, contratos, subvenciones y agendas publicados como datos abiertos y en lenguaje claro.",
      "Mapa público de cada proyecto votado con su estado: pendiente, en obra o terminado.",
      "Asambleas ciudadanas por sorteo para los asuntos complejos o a largo plazo.",
      "Plataformas de participación de software libre, auditables y reutilizables entre ayuntamientos."
     ],
     "imagenes": [],
     "escena3d": "pueblo",
     "escalas": [
      "pueblo",
      "region"
     ],
     "subtemas": []
    },
    {
     "titulo": "País y mundo: deliberación ciudadana y democracia directa por temas",
     "texto": "Las grandes cuestiones se estudian en asambleas de personas elegidas por sorteo que escuchan a especialistas de todas las posturas y redactan recomendaciones. Además, cada persona puede votar tema a tema, viendo la evolución histórica de cada materia y los pros y contras de cada medida.",
     "puntos": [
      "Asambleas ciudadanas por sorteo, representativas por edad, género, territorio y nivel de estudios, con respuesta pública obligatoria de las instituciones.",
      "Órganos de diálogo ciudadano permanentes, no solo procesos puntuales.",
      "Iniciativas populares y referéndums por temas con reglas claras de firmas y plazos.",
      "Fichas neutrales por cada tema: datos históricos, alternativas y argumentos a favor y en contra.",
      "Votación informada: antes de votar, cada persona puede ver el estado actual de la materia y lo que se ha probado en otros lugares.",
      "Cooperación entre países para los retos que no tienen fronteras, con participación ciudadana también a escala global."
     ],
     "imagenes": [],
     "escena3d": "pueblo",
     "escalas": [
      "pueblo",
      "pais",
      "continente",
      "planeta"
     ],
     "subtemas": []
    }
   ],
   "arte": {
    "src": "/calendario-arte/miniaturas/mes-11-d.jpg",
    "grande": "/calendario-arte/ilustraciones/mes-11-d.jpg",
    "tema": "Política"
   }
  },
  "retos": [
   {
    "ambito": "España",
    "titulo": "Poca confianza en los partidos",
    "texto": "Según la encuesta de la OCDE sobre confianza en las instituciones (trabajo de campo 2025), solo el 21% de las personas en España confía alta o moderadamente en los partidos políticos. La confianza en el Gobierno nacional es del 43%, algo por encima de la media OCDE (40%).",
    "fuente": "https://www.oecd.org/en/publications/oecd-survey-on-drivers-of-trust-in-public-institutions-2026-results_c88c8869-en/spain_8443a0c4-en.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "partidos"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Mucha gente siente que no tiene voz",
    "texto": "En 2025, solo el 38% de la población en España cree que la gente como ella tiene voz en lo que hace el Gobierno, según la OCDE. Es una mejora frente al 31% de 2023, pero sigue siendo una minoría.",
    "fuente": "https://www.oecd.org/en/publications/oecd-survey-on-drivers-of-trust-in-public-institutions-2026-results_c88c8869-en/spain_8443a0c4-en.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "participacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "La percepción de corrupción no mejora",
    "texto": "En el Índice de Percepción de la Corrupción 2025 de Transparencia Internacional, España obtuvo 55 puntos sobre 100 y quedó en el puesto 49. Es un punto menos que en 2024 (56).",
    "fuente": "https://www.idealista.com/news/node/900419",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "justicia",
     "partidos"
    ]
   },
   {
    "ambito": "UE",
    "titulo": "Baja participación en las elecciones europeas",
    "texto": "En las elecciones al Parlamento Europeo de 2024 votó el 49,21% del censo en España, frente a una media del 51% en la UE. Más de la mitad de la población con derecho a voto no participó en decisiones que le afectan a escala europea.",
    "fuente": "https://maldita.es/malditodato/20240612/participacion-elecciones-europeas-historico/",
    "escalas": [
     "continente"
    ],
    "subtemas": [
     "participacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Una polarización que rompe relaciones",
    "texto": "Según el Atlas de la Polarización 2025 de More in Common (2.508 entrevistas, noviembre de 2025), un 14% de las personas en España ha roto amistades o relaciones familiares por motivos políticos en el último año. Aun así, la mayoría sigue creyendo que nuestras diferencias no impiden unirnos.",
    "fuente": "https://www.moreincommon.com/media/fiiclx3k/atlas-de-la-polarizacio-n-2025-more-in-common-espan-a.pdf",
    "escalas": [
     "individuo",
     "pais"
    ],
    "subtemas": [
     "partidos",
     "participacion"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Retroceso democrático en el mundo",
    "texto": "El Informe sobre la Democracia 2026 del instituto V-Dem estima que alrededor del 74% de la población mundial vive en autocracias, con 92 autocracias frente a 87 democracias. El nivel de democracia que disfruta la persona media ha vuelto al de 1978.",
    "fuente": "https://www.democracywithoutborders.org/41651/v-dem-report-finds-global-democracy-is-back-at-1978-levels/",
    "escalas": [
     "planeta"
    ],
    "subtemas": [
     "justicia",
     "cortes"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Pocas vías de decisión directa",
    "texto": "De 143 iniciativas legislativas populares (1986-2023) solo 4 se aprobaron; el último referéndum estatal fue en 2005.",
    "fuente": "https://maldita.es/malditodato/20240411/iniciativa-legislativa-popular-aprobadas-presentadas/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "participacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Sensación de no tener voz",
    "texto": "Solo el 38 % cree que la gente como él tiene voz en lo que hace el Gobierno (OCDE, 2025; 31 % en 2023).",
    "fuente": "https://www.oecd.org/en/publications/oecd-survey-on-drivers-of-trust-in-public-institutions-2026-results_c88c8869-en/spain_8443a0c4-en.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "participacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Confianza muy baja en los partidos",
    "texto": "Solo el 21 % confía en los partidos, frente al 62 % en la policía (OCDE, 2025).",
    "fuente": "https://www.oecd.org/en/publications/oecd-survey-on-drivers-of-trust-in-public-institutions-2026-results_c88c8869-en/spain_8443a0c4-en.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "partidos"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Cuentas de partidos poco visibles",
    "texto": "32 de 63 partidos fiscalizados no publicaron sus subvenciones de 2023 (informe 1.596 del Tribunal de Cuentas).",
    "fuente": "https://www.boe.es/boe/dias/2025/08/16/pdfs/BOE-A-2025-16946.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "partidos"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Presupuestos sin aprobar",
    "texto": "Las cuentas de 2023 llevan tres años prorrogadas; 2026 es el tercer año consecutivo de prórroga.",
    "fuente": "https://theobjective.com/espana/2025-12-23/gobierno-prorroga-ano-consecutivo-presupuestos-2023/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "cortes"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Mayorías frágiles",
    "texto": "Tras perder votaciones clave, el BOE publicó el 6-10-2026 la disolución de las Cortes y elecciones para el 29-N.",
    "fuente": "https://www.legaltoday.com/actualidad-juridica/noticias-de-derecho/el-boe-publica-el-real-decreto-de-disolucion-de-las-cortes-y-la-convocatoria-electoral-para-el-29-de-noviembre-2026-10-06/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "cortes"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Administración envejecida",
    "texto": "Solo el 8 % del personal de la Administración central tiene 18-34 años, frente al 19 % OCDE (2023).",
    "fuente": "https://www.oecd.org/en/publications/government-at-a-glance-2025-country-notes_da3361e1-en/spain_57f4ebd0-en.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "gobierno"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Integridad de altos cargos",
    "texto": "La Comisión Europea (2026) ve avances limitados en conflictos de interés, lobbies y declaraciones de bienes.",
    "fuente": "https://en.ara.cat/politics/brussels-taps-sanchez-the-wrist-for-spain-s-limited-fight-against-corruption_1_5801318.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "gobierno"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Baja confianza en la independencia judicial",
    "texto": "El 39 % la valora como buena, 15 puntos por debajo de la media de la UE (2025).",
    "fuente": "https://agenceurope.eu/en/bulletin/article/13688/8/according-to-eurobarometer-54-of-european-citizens-have-a-positive-opinion-of-their-justice-systems-independence",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "justicia"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Faltan jueces",
    "texto": "España tiene 11,9 jueces por 100.000 habitantes, frente a 17,4 de media europea (datos 2022).",
    "fuente": "https://www.legaltoday.com/actualidad-juridica/noticias-de-derecho/el-consejo-de-europa-mantiene-a-espana-muy-por-encima-en-presupuesto-judicial-por-habitante-pero-por-debajo-en-jueces-2024-10-17/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "justicia"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Financiación autonómica caducada",
    "texto": "El modelo de 2009 debía renovarse en 2014; la propuesta de enero de 2026 quedó paralizada.",
    "fuente": "https://www.elsaltodiario.com/economia/nuevo-modelo-financiacion-autonomica-propone-gobierno-se-congelo-puede-pasar-ahora",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "territorio"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Ayuntamientos con poco peso",
    "texto": "Los municipios gestionan el 12,2 % del gasto público (2020), frente a ~22 % de media en la UE (2024).",
    "fuente": "https://sng-wofi.org/country_profiles/spain.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "territorio"
    ]
   }
  ],
  "soluciones": [
   {
    "ambito": "Mundial",
    "titulo": "Asambleas ciudadanas por sorteo",
    "texto": "Grupos de personas elegidas al azar, representativas de la población, que estudian un tema con especialistas y redactan recomendaciones. La OCDE ha registrado 716 procesos de este tipo en 28 países entre 1979 y 2023, con más de 80.000 participantes; en Irlanda, una de estas asambleas llevó a un referéndum en 2018.",
    "supera": "Poca confianza en los partidos",
    "fuente": "https://www.oecd.org/en/publications/government-at-a-glance-2025_0efd0bcd-en/full-report/citizen-participation-and-deliberation_52b90285.html",
    "escalas": [
     "comunidad",
     "pueblo",
     "planeta"
    ],
    "subtemas": [
     "participacion"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Presupuestos participativos",
    "texto": "La ciudadanía propone y vota en qué se invierte una parte del presupuesto público. Un estudio de Touchton y Wampler (2020) encontró que en los municipios brasileños con presupuestos participativos la mortalidad infantil bajó de forma sustancial, más aún donde el programa estaba consolidado.",
    "supera": "Mucha gente siente que no tiene voz",
    "fuente": "https://www.peoplepowered.org/resources-content/public-engagement-for-public-health",
    "escalas": [
     "pueblo",
     "planeta"
    ],
    "subtemas": [
     "participacion",
     "territorio"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Datos públicos abiertos y vigilados por la ciudadanía",
    "texto": "Organizaciones independientes convierten presupuestos, boletines oficiales e indultos en herramientas que cualquiera puede consultar. En 2022, la herramienta «¿Dónde van mis impuestos?» de Civio superó los 111.000 usuarios y su asistente del bono eléctrico atendió cerca de un millón de consultas.",
    "supera": "La percepción de corrupción no mejora",
    "fuente": "https://civio.es/en/report-2022/",
    "escalas": [
     "pueblo",
     "pais"
    ],
    "subtemas": [
     "gobierno",
     "justicia"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Deliberar con quien piensa distinto",
    "texto": "Las encuestas deliberativas reúnen a una muestra representativa de personas de todas las ideologías para informarse y debatir en grupos pequeños con moderación. En el encuentro de Pensilvania de 2025 (175 votantes), el respeto por las opiniones contrarias pasó del 72% al 91% y la disposición a llegar a acuerdos, del 80% al 90%.",
    "supera": "Una polarización que rompe relaciones",
    "fuente": "https://fsi.stanford.edu/news/pennsylvania-voters-bridge-deep-political-divides-reduce-polarization-groundbreaking",
    "escalas": [
     "planeta"
    ],
    "subtemas": [
     "participacion"
    ]
   },
   {
    "ambito": "UE",
    "titulo": "Diálogo ciudadano permanente por ley",
    "texto": "En lugar de asambleas sueltas, un consejo ciudadano permanente elige los temas y convoca asambleas por sorteo cada año, con un procedimiento de seguimiento en el parlamento. La Comunidad germanófona de Bélgica lo creó en 2019 y, al estar fijado por decreto, se ha mantenido tras las elecciones: seis asambleas en sus primeros cinco años.",
    "supera": "Retroceso democrático en el mundo",
    "fuente": "https://publicdeliberation.net/?p=1375",
    "escalas": [
     "comunidad",
     "pueblo",
     "continente"
    ],
    "subtemas": [
     "participacion",
     "cortes"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Votar por temas: iniciativas y referéndums",
    "texto": "En Suiza, con 100.000 firmas en 18 meses se puede proponer un cambio constitucional, y con 50.000 firmas en 100 días se puede someter una ley a referéndum. Se vota tres o cuatro veces al año a escala federal, y desde 1848 la ciudadanía ha sido llamada a las urnas 332 veces.",
    "supera": "Baja participación en las elecciones europeas",
    "fuente": "https://www.swissinfo.ch/spa/democracia-suiza/c%C3%B3mo-funciona-la-democracia-directa-en-suiza/89088930",
    "escalas": [
     "pueblo",
     "planeta"
    ],
    "subtemas": [
     "participacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Asambleas ciudadanas con seguimiento",
    "texto": "Personas elegidas por sorteo deliberan y proponen. En Irlanda sus informes llevaron a referéndums en 2015 y 2018.",
    "fuente": "https://oecd-opsi.org/innovations/the-irish-citizens-assembly/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "participacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Iniciativa ciudadana accesible",
    "texto": "En Finlandia, 50.000 firmas obligan al Parlamento a debatir una propuesta de ley ciudadana.",
    "fuente": "https://www.eduskunta.fi/EN/naineduskuntatoimii/eduskunnan_tehtavat/lakiensaataminen/kansalaisaloite",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "participacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Autoridad electoral independiente",
    "texto": "Irlanda creó en 2023 An Coimisiún Toghcháin para gestionar circunscripciones, registro e información electoral.",
    "fuente": "https://www.electoralcommission.ie/about-us/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "partidos"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Cuentas de partidos en datos abiertos",
    "texto": "Publicar ingresos, subvenciones y donaciones en formato reutilizable y cumplir los plazos que vigila el Tribunal de Cuentas.",
    "fuente": "https://www.boe.es/boe/dias/2025/08/16/pdfs/BOE-A-2025-16946.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "partidos"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Paridad obligatoria en listas",
    "texto": "La Ley Orgánica 2/2024 exige listas electorales con presencia equilibrada de mujeres y hombres.",
    "fuente": "https://boe.es/buscar/pdf/2024/BOE-A-2024-15936-consolidado.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "cortes"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Registro de grupos de interés",
    "texto": "La Comisión Europea (2026) recomienda a España aprobar una ley de lobbies con registro público de reuniones.",
    "fuente": "https://en.ara.cat/politics/brussels-taps-sanchez-the-wrist-for-spain-s-limited-fight-against-corruption_1_5801318.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "cortes"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Datos abiertos por defecto",
    "texto": "datos.gob.es ha situado a España 5.ª de 40 países en el índice OURdata de la OCDE (2023).",
    "fuente": "https://datos.gob.es/en/noticia/spain-fifth-world-power-open-data-according-latest-ourdata-report-oecd",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "gobierno"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Evaluar el impacto de las normas",
    "texto": "España puntúa 2,6 sobre 4 en calidad de evaluación de impacto regulatorio, sobre la media OCDE de 2,3 (2024).",
    "fuente": "https://www.oecd.org/en/publications/government-at-a-glance-2025-country-notes_da3361e1-en/spain_57f4ebd0-en.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "gobierno"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Jueces eligen a los vocales judiciales",
    "texto": "La Comisión de Venecia (2025) recomienda que al menos la mitad del CGPJ la elijan los jueces, con garantías.",
    "fuente": "https://blog-iacl-aidc.org/2026-posts/2026/2/3/setting-standards-on-judicial-councils-the-spanish-case-before-the-venice-commission-a-rare-request-from-a-non-political-institution",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "justicia"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Fiscalía con mandato propio",
    "texto": "El Informe sobre el Estado de Derecho 2026 pide separar el mandato del Fiscal General del del Gobierno.",
    "fuente": "https://commission.europa.eu/publications/2026-rule-law-report-communication-and-country-chapters_es",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "justicia"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Revisión periódica de la financiación",
    "texto": "Renovar el modelo en el plazo previsto, con criterios públicos de reparto, evita bloqueos de más de una década.",
    "fuente": "https://www.elsaltodiario.com/economia/nuevo-modelo-financiacion-autonomica-propone-gobierno-se-congelo-puede-pasar-ahora",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "territorio"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Más poder y recursos locales",
    "texto": "En la UE los gobiernos locales gestionan de media ~22 % del gasto público, acercando las decisiones a la gente.",
    "fuente": "https://www.kdz.eu/system/files/downloads/2026-03/European%20Local%20Government%20Report%202025.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "territorio"
    ]
   }
  ],
  "proyectos": [
   {
    "nombre": "Asamblea Ciudadana para el Clima",
    "lugar": "España",
    "tipo": "Programa público (proceso deliberativo, finalizado en 2022)",
    "texto": "Cien personas elegidas al azar, representativas de la sociedad española por edad, género, estudios, territorio y entorno rural o urbano, respondieron a la pregunta «Una España más segura ante el cambio climático, ¿cómo lo hacemos?». En junio de 2022 entregaron 172 recomendaciones agrupadas en 58 objetivos, que el Gobierno remitió al Congreso.",
    "web": "https://www.lamoncloa.gob.es/presidente/actividades/paginas/2022/060622-sanchez-clima.aspx",
    "fuente": "https://www.miteco.gob.es/es/prensa/210526qaasambleaciudadana_tcm30-526725.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "participacion"
    ]
   },
   {
    "nombre": "Decide Madrid · Presupuestos participativos",
    "lugar": "Madrid, España",
    "tipo": "Programa público municipal",
    "texto": "La 7.ª edición de los presupuestos participativos de Madrid (2026) reparte 50 millones de euros: 35 millones para proyectos de distrito y 15 para toda la ciudad. Puede proponer cualquier persona mayor de 16 años, y los vecinos empadronados votan en la fase final, prevista para febrero de 2027.",
    "web": "https://decide.madrid.es",
    "fuente": "https://diario.madrid.es/blog/2026/02/24/presupuestos-participativos-2026-guia-mejorar-madrid/",
    "escalas": [
     "pueblo"
    ],
    "subtemas": [
     "participacion",
     "territorio"
    ]
   },
   {
    "nombre": "Decidim",
    "lugar": "Barcelona, España (uso internacional)",
    "tipo": "Software libre de participación (asociación sin ánimo de lucro)",
    "texto": "Plataforma de código abierto nacida en Barcelona para organizar procesos participativos, presupuestos, asambleas y consultas. Su informe de 2025 cita más de 500 instalaciones; entre sus socios institucionales están el Ayuntamiento de Barcelona, la Generalitat de Cataluña, la ciudad de Nueva York y el Gobierno federal de Brasil.",
    "web": "https://decidim.org",
    "fuente": "https://decidim.org/pdf/decidim_activity_report_2025.pdf",
    "escalas": [
     "continente",
     "planeta"
    ],
    "subtemas": [
     "participacion",
     "territorio"
    ]
   },
   {
    "nombre": "Fundación Ciudadana Civio",
    "lugar": "Madrid, España",
    "tipo": "Fundación independiente (periodismo de datos y transparencia)",
    "texto": "Vigila el sector público y explica cada día el BOE en lenguaje claro, con herramientas gratuitas como «¿Dónde van mis impuestos?» y el Indultómetro. En 2022 tenía 1.490 socios, que aportaban alrededor de un tercio de sus ingresos, y sigue publicando en noviembre de 2026.",
    "web": "https://civio.es",
    "fuente": "https://civio.es/en/report-2022/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "gobierno",
     "justicia"
    ]
   },
   {
    "nombre": "Asamblea Ciudadana de Irlanda (Citizens' Assembly)",
    "lugar": "Irlanda",
    "tipo": "Programa público (asambleas ciudadanas convocadas por el Parlamento)",
    "texto": "Entre 2016 y 2018, 99 personas elegidas al azar estudiaron cinco temas, entre ellos el envejecimiento, el cambio climático y la forma de celebrar referéndums. Una de sus recomendaciones pasó a una comisión parlamentaria y después a un referéndum en 2018; la última asamblea listada en su web es la de 2023 sobre consumo de drogas.",
    "web": "https://citizensassembly.ie",
    "fuente": "https://oecd-opsi.org/innovations/the-irish-citizens-assembly/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "participacion"
    ]
   },
   {
    "nombre": "Modelo Ostbelgien · Diálogo ciudadano permanente",
    "lugar": "Comunidad germanófona de Bélgica",
    "tipo": "Programa público (institución creada por decreto parlamentario)",
    "texto": "Desde 2019 un Consejo Ciudadano permanente, formado por antiguos participantes que se renuevan por tercios, elige los temas y convoca asambleas por sorteo, con unas cinco por legislatura. La 7.ª asamblea (8 de noviembre de 2025) trató cómo hacer atractiva la vida de las personas mayores en la región.",
    "web": "https://pdg.be",
    "fuente": "https://publicdeliberation.net/?p=1375",
    "escalas": [
     "region"
    ],
    "subtemas": [
     "participacion",
     "cortes"
    ]
   },
   {
    "nombre": "Democracia directa suiza (votaciones populares federales)",
    "lugar": "Suiza",
    "tipo": "Programa público (sistema constitucional)",
    "texto": "La ciudadanía vota varias veces al año sobre temas concretos mediante iniciativas populares (100.000 firmas) y referéndums (50.000 firmas). Desde 1848 ha sido llamada a las urnas 332 veces a escala federal; hay votaciones programadas también en 2026.",
    "web": "https://www.admin.ch/en/popular-votes-chronology",
    "fuente": "https://www.swissinfo.ch/spa/democracia-suiza/c%C3%B3mo-funciona-la-democracia-directa-en-suiza/89088930",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "participacion"
    ]
   },
   {
    "nombre": "Política · Votar por temas (Luz & Humanidad)",
    "lugar": "España",
    "tipo": "Proyecto propio",
    "texto": "Observatorio que representa cada partido como una geometría con sus aristas débiles, y propuesta de democracia directa por temas: cada persona ve el estado de cada materia con datos históricos y elige su posición, con los pros y contras de cada medida.",
    "web": "https://humanity.wiki/observatorio-polarizacion/",
    "fuente": null,
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "participacion"
    ]
   },
   {
    "nombre": "Iniciativa ciudadana al Parlamento (Kansalaisaloite)",
    "lugar": "Finlandia",
    "tipo": null,
    "texto": "Con 50.000 firmas la ciudadanía lleva sus propuestas de ley al Parlamento.",
    "web": "https://www.eduskunta.fi/EN/naineduskuntatoimii/eduskunnan_tehtavat/lakiensaataminen/kansalaisaloite",
    "fuente": null,
    "escalas": [
     "pais",
     "planeta"
    ],
    "subtemas": [
     "participacion"
    ]
   },
   {
    "nombre": "An Coimisiún Toghcháin (Comisión Electoral)",
    "lugar": "Irlanda",
    "tipo": null,
    "texto": "Comisión electoral independiente creada en 2023 que revisa circunscripciones e informa a la ciudadanía.",
    "web": "https://www.electoralcommission.ie/about-us/",
    "fuente": null,
    "escalas": [
     "pais",
     "planeta"
    ],
    "subtemas": [
     "partidos"
    ]
   },
   {
    "nombre": "Portal de Transparencia del Congreso",
    "lugar": "España",
    "tipo": null,
    "texto": "Publica la actividad parlamentaria y datos de diputados y diputadas.",
    "web": "https://www.congreso.es/es/transparencia/actividad-parlamentaria",
    "fuente": null,
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "cortes"
    ]
   },
   {
    "nombre": "datos.gob.es",
    "lugar": "España",
    "tipo": null,
    "texto": "Catálogo nacional de datos abiertos de las administraciones públicas.",
    "web": "https://datos.gob.es",
    "fuente": null,
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "gobierno"
    ]
   },
   {
    "nombre": "Consejo de Transparencia y Buen Gobierno",
    "lugar": "España",
    "tipo": null,
    "texto": "Autoridad independiente que resuelve reclamaciones de acceso a la información pública.",
    "web": "https://www.consejodetransparencia.es",
    "fuente": null,
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "justicia"
    ]
   },
   {
    "nombre": "Red de Entidades Locales por la Transparencia y Participación Ciudadana (FEMP)",
    "lugar": "España",
    "tipo": null,
    "texto": "Red de ayuntamientos que comparten herramientas de transparencia y participación.",
    "web": "https://www.femp.es/sites/default/files/multimedia/Red%20de%20Entidades%20Locales%20por%20la%20Transparencia%20y%20la%20Participaci%C3%B3n%20Ciudadana.pdf",
    "fuente": null,
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "territorio"
    ]
   }
  ],
  "preguntas": [
   "¿Quieres que el sector ponga el acento en mecanismos para tu municipio (asambleas, presupuestos participativos) o en la escala nacional (votar por temas)?",
   "Para «votar por temas», ¿qué materias quieres mostrar primero (vivienda, energía, sanidad…) y de qué fuentes oficiales sacamos los datos históricos de cada una?",
   "¿Cómo garantizamos la neutralidad de las fichas de pros y contras: un comité con personas de distintas sensibilidades, revisión por pares, o citar siempre fuentes de todas las posturas?",
   "¿Conoces asambleas ciudadanas o presupuestos participativos en tu zona que debamos añadir como proyectos?"
  ],
  "subtemas": [
   {
    "id": "participacion",
    "nombre": "Ciudadanía y participación"
   },
   {
    "id": "partidos",
    "nombre": "Partidos y elecciones"
   },
   {
    "id": "cortes",
    "nombre": "Cortes Generales"
   },
   {
    "id": "gobierno",
    "nombre": "Gobierno y Administración"
   },
   {
    "id": "justicia",
    "nombre": "Justicia y control"
   },
   {
    "id": "territorio",
    "nombre": "Organización territorial"
   }
  ]
 },
 {
  "id": "economia",
  "nombre": "Economía",
  "resumen": "Una economía al servicio de la vida: hogares con lo básico cubierto, comunidades que cooperan y reglas fiscales simples y justas.",
  "ambito": "Cómo producimos, intercambiamos, ahorramos, financiamos y repartimos los recursos: desde la economía de cada hogar hasta la banca, los impuestos y las finanzas mundiales.",
  "vision": {
   "escena3d": "pueblo",
   "intro": "Imaginamos una economía en la que nadie tema llegar a fin de mes y el dinero circule hacia lo que de verdad cuida a las personas y al planeta. Una economía sencilla de entender, donde cada cual sabe qué aporta, qué recibe y para qué sirve.",
   "equipo": "Un equipo humano recopila esta visión y la comunica a través del arte digital y físico para que sea accesible a todos los seres humanos. El botón «Ver la visión en 3D» abre la herramienta de visualización del ideal de Luz & Humanidad.",
   "bloques": [
    {
     "titulo": "Hogar: necesidades cubiertas y ahorro tranquilo",
     "texto": "Cada hogar tiene garantizado lo esencial (comida, energía, vivienda, cuidados) y un colchón para los imprevistos. Las cuentas domésticas son fáciles de entender y ahorrar se convierte en la opción por defecto, no en un esfuerzo heroico.",
     "puntos": [
      "Ingresos suficientes para cubrir lo básico, sin depender de la suerte.",
      "Un fondo de emergencia en cada hogar, alimentado con ahorro automático.",
      "Educación financiera práctica desde la escuela: presupuestos, deudas e intereses explicados con ejemplos reales.",
      "Productos bancarios sencillos, sin letra pequeña ni comisiones ocultas.",
      "Deuda solo para lo que genera valor (vivienda, formación, herramientas de trabajo), nunca para sobrevivir.",
      "Tiempo libre y de cuidados reconocido como parte de la riqueza del hogar."
     ],
     "imagenes": [],
     "escena3d": "hogar",
     "escalas": [
      "individuo"
     ],
     "subtemas": []
    },
    {
     "titulo": "Comunidad: economía social, cooperativas y monedas locales",
     "texto": "Las empresas pertenecen en buena parte a quienes trabajan en ellas o a quienes usan sus servicios, y el dinero da varias vueltas en el barrio antes de salir. Cooperativas, mercados sociales y monedas complementarias tejen una red que aguanta mejor las crisis.",
     "puntos": [
      "Cooperativas de trabajo, consumo y energía donde cada persona tiene un voto.",
      "Mercados sociales que conectan a quien produce con quien consume bajo criterios éticos y ecológicos.",
      "Monedas locales o complementarias que mantienen la actividad del comercio cercano.",
      "Bancos de tiempo para intercambiar servicios y cuidados.",
      "Balances sociales públicos: cada empresa muestra su impacto en las personas y el entorno, no solo su beneficio.",
      "Compra pública que prioriza a proveedores locales y de economía social."
     ],
     "imagenes": [],
     "escena3d": "comunidad",
     "escalas": [
      "comunidad"
     ],
     "subtemas": []
    },
    {
     "titulo": "País y planeta: fiscalidad simple y justa, banca al servicio de la producción",
     "texto": "Los impuestos son pocos, claros y difíciles de esquivar, y cada persona puede ver a dónde va lo que aporta. Los bancos prestan sobre todo para producir bienes y servicios útiles, no para inflar burbujas.",
     "puntos": [
      "Un sistema fiscal con pocas excepciones, cobrado de forma automática y transparente.",
      "Facturación y pagos digitales trazables que reducen el fraude sin cargar de papeleo a la gente.",
      "Reparto claro de lo recaudado entre las distintas escalas: local, regional, nacional y global.",
      "Banca ética y cooperativa que publica a quién presta su dinero.",
      "Crédito orientado a la economía productiva y a la transición ecológica.",
      "Cooperación internacional contra la evasión fiscal y para un endeudamiento sostenible."
     ],
     "imagenes": [],
     "escena3d": "pueblo",
     "escalas": [
      "pais",
      "continente",
      "planeta"
     ],
     "subtemas": []
    }
   ],
   "arte": {
    "src": "/calendario-arte/miniaturas/mes-09-d.jpg",
    "grande": "/calendario-arte/ilustraciones/mes-09-d.jpg",
    "tema": "Economía"
   }
  },
  "retos": [
   {
    "ambito": "España",
    "titulo": "Una de cada cuatro personas en riesgo de pobreza o exclusión",
    "texto": "Según la Encuesta de Condiciones de Vida 2025 del INE, el 25,7% de la población está en riesgo de pobreza o exclusión social (tasa AROPE) y el 19,5% en riesgo de pobreza. Un 8,1% sufre carencia material y social severa.",
    "fuente": "https://ine.es/dyngs/Prensa/ECV2025.htm",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "hogares"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Sin colchón para los imprevistos",
    "texto": "El 36,4% de la población vive en hogares que no pueden afrontar gastos imprevistos, y un 8,5% llega a fin de mes con mucha dificultad (INE, Encuesta de Condiciones de Vida 2025).",
    "fuente": "https://ine.es/dyngs/Prensa/ECV2025.htm",
    "escalas": [
     "individuo",
     "pais"
    ],
    "subtemas": [
     "hogares"
    ]
   },
   {
    "ambito": "España",
    "titulo": "IVA que no se llega a cobrar",
    "texto": "La Comisión Europea estima que en 2023 España dejó de recaudar 7.771 millones de euros de IVA por fraude, evasión, impagos o errores, el 7,6% de lo que debería haberse ingresado. En el conjunto de la UE la cifra fue de 128.000 millones (9,5%).",
    "fuente": "https://taxation-customs.ec.europa.eu/taxation/vat/fight-against-vat-fraud/vat-gap_en",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "publico"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Un sistema fiscal lleno de excepciones",
    "texto": "Según la Comisión Europea (datos de 2023), los tipos reducidos y las exenciones hacen que España recaude por IVA un 38,3% menos de lo que obtendría con un tipo único sobre todo el consumo. Cada excepción puede tener una razón, pero juntas hacen el sistema más complejo y difícil de vigilar.",
    "fuente": "https://taxation-customs.ec.europa.eu/taxation/vat/fight-against-vat-fraud/vat-gap_en",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "publico"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Una economía mundial muy endeudada",
    "texto": "Según el FMI (septiembre de 2025), la deuda mundial supera el 235% del PIB del planeta, unos 251 billones de dólares. De ella, cerca del 93% del PIB es deuda pública y casi el 143%, privada.",
    "fuente": "https://www.imf.org/en/Blogs/Articles/2025/09/17/global-debt-remains-above-235-of-world-GDP",
    "escalas": [
     "planeta"
    ],
    "subtemas": [
     "publico",
     "dinero",
     "exterior"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "La riqueza, muy concentrada",
    "texto": "El Informe sobre la Desigualdad Mundial 2026 calcula que el 10% más rico posee alrededor del 75% de la riqueza del planeta, mientras que la mitad más pobre tiene en torno al 2%. Ese 10% también recibe más ingresos que el 90% restante junto.",
    "fuente": "https://www.irishexaminer.com/news/arid-41757617.html?type=am",
    "escalas": [
     "planeta"
    ],
    "subtemas": [
     "hogares",
     "dinero"
    ]
   },
   {
    "ambito": "España",
    "titulo": "El paro más alto de la zona euro",
    "texto": "En el 3.er trimestre de 2026 el paro fue del 10,18 %, frente al 6,5 % de la zona euro en septiembre.",
    "fuente": "https://www.que.es/2026/10/28/epa-tercer-trimestre-2026-paro-2/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "trabajo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Productividad por debajo de Europa",
    "texto": "La brecha con la zona euro bajó del 12 % (2013) al 8 % (2025), pero el PIB por ocupado apenas ha crecido en cinco años.",
    "fuente": "https://www.bde.es/f/webbe/SES/Secciones/Publicaciones/PublicacionesAnuales/InformesAnuales/25/InfAnual_2025_Breve.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "trabajo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Empresas demasiado pequeñas",
    "texto": "El 99,8 % de las empresas son pymes y dan el 61,3 % del empleo (2025); el tamaño pequeño frena la inversión y la productividad.",
    "fuente": "https://ipyme.org/es-es/politicasymedidas/consejo-estatal/Documents/CE_PYME_julio_2025.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "empresas"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Poca inversión en I+D",
    "texto": "España invierte el 1,5 % del PIB en I+D (2024); la parte de las empresas está 11 puntos por debajo de la media UE.",
    "fuente": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/ciencia-innovacion-universidades/paginas/2025/201125-morant-gasto-id-aumenta.aspx",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "empresas"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Pensiones que dependen cada vez más del Estado",
    "texto": "El gasto en pensiones fue del 12,9 % del PIB en 2025 y el déficit contributivo, del 3,4 % del PIB.",
    "fuente": "https://institutosantalucia.es/sala-de-prensa/el-sistema-publico-de-pensiones-necesito-56-946-millones-de-euros-del-estado-para-cubrir-su-componente-contributivo-en-2025/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "publico"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Crédito que sube más rápido que la vivienda",
    "texto": "Las hipotecas nuevas crecieron un 27,5 % en 2025 mientras se terminaron 92.000 viviendas para 240.000 hogares nuevos.",
    "fuente": "https://www.esdiario.com/economia/260618/190880/banco-espana-vuelve-reiterarse-espana-deficit-750-000-viviendas.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "dinero"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Una economía muy endeudada con el exterior",
    "texto": "España debe al exterior en términos netos el 44,8 % de su PIB y su deuda externa bruta llega al 163,6 % (2025).",
    "fuente": "https://www.bde.es/wbe/es/noticias-eventos/actualidad-banco-espana/notas-banco-espana/bop-pii-4t2025.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "exterior"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Dependencia de la energía importada",
    "texto": "España importa el 68,4 % de su energía (2024), lo que la expone a crisis de precios.",
    "fuente": "https://www.eldebate.com/economia/20260719/espana-importa-casi-70-energia-consume-pese-avance-renovables_441118.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "exterior"
    ]
   }
  ],
  "soluciones": [
   {
    "ambito": "UE",
    "titulo": "Banca ética que presta a la economía real",
    "texto": "Son bancos que solo financian proyectos con impacto social o ambiental positivo y publican a quién prestan. Según el 8.º Informe sobre finanzas éticas en Europa (datos de 2023), dedican el 67,9% de su balance a préstamos (frente al 60,9% de los grandes bancos), tienen más capital propio (17,86% frente a 17,25%) y una rentabilidad sobre activos algo mayor (0,75% frente a 0,64%).",
    "supera": "Una economía mundial muy endeudada",
    "fuente": "https://febea.org/wp-content/uploads/2025/12/8-Report-on-ethical-finance-in-Europe.pdf",
    "escalas": [
     "continente"
    ],
    "subtemas": [
     "dinero"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Cooperativas y economía social",
    "texto": "Empresas en las que la propiedad y las decisiones se reparten entre quienes trabajan o consumen. Un estudio de Abay Analistas para CEPES (2023) concluye que la economía social española resistió mejor la destrucción de empleo entre 2017 y 2021, con la covid incluida, y estima que unos 222.000 trabajadores tendrían periodos de paro si estas entidades se comportaran como empresas convencionales.",
    "supera": "La riqueza, muy concentrada",
    "fuente": "https://www.andaluciaescoop.org/el-impacto-de-la-economia-social-mas-presencia-en-zonas-rurales-y-ciudades-medias-y-mayor-resistencia-a-la-destruccion-de-empleo",
    "escalas": [
     "comunidad",
     "pais"
    ],
    "subtemas": [
     "empresas",
     "trabajo"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Ahorro automático por defecto",
    "texto": "En lugar de pedir a cada persona que se apunte a un plan de ahorro, se la inscribe automáticamente y puede salirse si quiere. En Reino Unido, tras introducir la inscripción automática en los planes de pensiones de empresa, la participación de los trabajadores con derecho pasó del 55% en 2012 al 88% en 2019.",
    "supera": "Sin colchón para los imprevistos",
    "fuente": "https://www.pensionsage.com/pa/Pension-participation-up-33-percentage-points-since-AE-implementation.php",
    "escalas": [
     "planeta"
    ],
    "subtemas": [
     "hogares"
    ]
   },
   {
    "ambito": "UE",
    "titulo": "Factura electrónica obligatoria",
    "texto": "Todas las facturas entre empresas pasan por un sistema digital de la administración, que puede detectar el fraude antes de que ocurra. Según la Agencia Tributaria italiana, tras implantarla en 2019 la recaudación de IVA en operaciones internas creció un 3,6% (unos 3.600 millones de euros) y se detectaron 1.100 millones en créditos de IVA indebidos.",
    "supera": "IVA que no se llega a cobrar",
    "fuente": "https://www.oecd.org/tax/forum-on-tax-administration/publications-and-products/Italy-Electronic-invoicing-May-2021.pdf",
    "escalas": [
     "continente"
    ],
    "subtemas": [
     "publico"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Impuestos con base amplia y pocas excepciones",
    "texto": "Gravar todo el consumo o todas las transacciones con un tipo bajo y uniforme, y proteger a quien lo necesita con ayudas directas en lugar de exenciones. Las cifras de la Comisión Europea muestran el margen: en España, los tipos reducidos suponen un 16,5% de la recaudación potencial de IVA y las exenciones nacionales un 18,7% (2023). Es un cálculo de potencial: no prueba por sí solo que el cambio funcione.",
    "supera": "Un sistema fiscal lleno de excepciones",
    "fuente": "https://taxation-customs.ec.europa.eu/taxation/vat/fight-against-vat-fraud/vat-gap_en",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "publico"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Monedas complementarias para las pymes",
    "texto": "Son redes de crédito entre empresas que funcionan en paralelo a la moneda oficial. El estudio de James Stodder sobre el WIR suizo, en funcionamiento desde los años treinta, muestra que su uso crece cuando hay recesión y escasea el dinero oficial, lo que ayuda a sostener la actividad de las pequeñas empresas.",
    "supera": "Una de cada cuatro personas en riesgo de pobreza o exclusión",
    "fuente": "https://ripess.socioeco.org/bdf_fiche-document-264_en.html",
    "escalas": [
     "planeta"
    ],
    "subtemas": [
     "empresas",
     "dinero"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Educación financiera desde la escuela",
    "texto": "El Plan de Educación Financiera del Banco de España y la CNMV forma a escolares y adultos en presupuesto, ahorro y deuda.",
    "fuente": "https://www.bde.es/wbe/es/areas-actuacion/educacion-financiera/comprometidos-con-la-educacion-financiera/la-educacion-financiera-en-espana/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "hogares"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Cooperativas de trabajo",
    "texto": "Empresas propiedad de sus trabajadores. Mondragón suma 71.415 empleos y dedica el 4,4 % de sus ventas industriales a I+D (2025).",
    "fuente": "https://www.thenews.coop/mondragon-posts-positive-2025-revenue-and-job-figures/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "trabajo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Más inversión en innovación y digitalización",
    "texto": "El Banco de España señala la poca I+D y la fragmentación normativa como los grandes frenos de la productividad.",
    "fuente": "https://www.bde.es/f/webbe/SES/Secciones/Publicaciones/PublicacionesAnuales/InformesAnuales/25/InfAnual_2025_Breve.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "trabajo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Orientar el crédito a la producción",
    "texto": "Werner mostró en 2014 que cada banco crea dinero al prestar; dirigirlo a la producción genera crecimiento sin burbujas.",
    "fuente": "https://eprints.soton.ac.uk/372866",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "dinero"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Energía renovable propia",
    "texto": "El PNIEC prevé bajar la dependencia energética del 73 % (2019) al 50 % (2030) con renovables y eficiencia.",
    "fuente": "https://www.miteco.gob.es/es/prensa/ultimas-noticias/2024/septiembre/el-gobierno-aprueba-la-actualizacion-del-plan-nacional-integrado.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "exterior"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Comercio justo",
    "texto": "Importaciones con precio mínimo y prima social para productores; en España sus ventas alcanzaron 146 M€ en 2022.",
    "fuente": "https://www.corresponsables.com/actualidad/ventas-comercio-justo-espana-2022-146-millones-euros/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "exterior"
    ]
   }
  ],
  "proyectos": [
   {
    "nombre": "Fiare Banca Etica",
    "lugar": "España (grupo Banca Etica, Italia y España)",
    "tipo": "Banca ética cooperativa",
    "texto": "Banco cooperativo que solo financia proyectos de impacto social y ambiental y publica a quién presta. A 31 de octubre de 2026 tenía en España 4.105 socios, 310,6 millones de euros de ahorro y 175,9 millones en 474 préstamos concedidos.",
    "web": "https://www.fiarebancaetica.coop",
    "fuente": "https://www.fiarebancaetica.coop/ca/?p=316952",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "dinero"
    ]
   },
   {
    "nombre": "Mondragón",
    "lugar": "País Vasco, España",
    "tipo": "Grupo de cooperativas",
    "texto": "Uno de los mayores grupos cooperativos del mundo, propiedad en buena parte de sus trabajadores. En 2025 facturó 11.322 millones de euros, dio empleo a 71.415 personas y creó 1.346 puestos nuevos.",
    "web": "https://www.mondragon-corporation.com",
    "fuente": "https://www.thenews.coop/mondragon-posts-positive-2025-revenue-and-job-figures/",
    "escalas": [
     "region"
    ],
    "subtemas": [
     "trabajo",
     "empresas"
    ]
   },
   {
    "nombre": "REAS Red de Redes de Economía Alternativa y Solidaria · Mercado Social",
    "lugar": "España",
    "tipo": "Red de economía social y solidaria",
    "texto": "Agrupa 1.028 entidades con más de 22.000 empleos directos y unos 1.307 millones de euros de ingresos. Cada año 685 de ellas pasan una auditoría social pública sobre igualdad, democracia interna y medio ambiente (informe 2024, datos de 2023).",
    "web": "https://www.economiasolidaria.org",
    "fuente": "https://wecoop.es/wp-content/uploads/2025/02/Informe_Auditoria_Social_Estatal_2024_REAS_RdR.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "empresas"
    ]
   },
   {
    "nombre": "Asociación Federal Española para el Fomento de la Economía del Bien Común",
    "lugar": "España",
    "tipo": "Asociación sin ánimo de lucro",
    "texto": "Promueve el modelo de Economía del Bien Común, nacido en Viena en 2010: las organizaciones elaboran un «balance del bien común» que puntúa, hasta un máximo de 1.000 puntos, su impacto en dignidad humana, solidaridad, sostenibilidad y transparencia. No hemos podido confirmar cuántas organizaciones lo aplican hoy en España (por verificar).",
    "web": "https://economiadelbiencomun.org",
    "fuente": "https://www.ui1.es/blog-ui1/sabes-que-es-la-economia-del-bien-comun",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "empresas"
    ]
   },
   {
    "nombre": "Triodos Bank",
    "lugar": "Países Bajos, con sucursal en España",
    "tipo": "Banca ética",
    "texto": "Banco que solo presta a proyectos de transición social y ecológica. En 2025 el grupo tenía 748.619 clientes, 15.100 millones de euros en depósitos y 6.100 millones en préstamos a empresas de sus áreas de transición.",
    "web": "https://www.triodos.es",
    "fuente": "https://www.triodos.es/binaries/content/assets/tbes/informe-anual/informe-anual-2025/infografia-ar25_es.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "dinero"
    ]
   },
   {
    "nombre": "Banco WIR",
    "lugar": "Suiza",
    "tipo": "Banco cooperativo con moneda complementaria",
    "texto": "Cooperativa con más de 90 años de historia que gestiona el WIR, una moneda complementaria para pequeñas y medianas empresas. En 2025 tuvo un balance de 6.740 millones de francos suizos y un beneficio de 17,7 millones.",
    "web": "https://www.wir.ch",
    "fuente": "https://www.wir.ch/fileadmin/downloads/Publikationen/Medienmitteilungen/2026-02-13-Jahresergebnis-de.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "empresas",
     "dinero"
    ]
   },
   {
    "nombre": "Turuta, moneda social de Vilanova i la Geltrú",
    "lugar": "Vilanova i la Geltrú (Barcelona), España",
    "tipo": "Moneda social comunitaria",
    "texto": "Proyecto nacido en 2010 como microeconomía experimental: cada participante tiene una cuenta en línea y paga con turutas bienes y servicios locales en el «mercado turuta». La plataforma europea de economía circular lo recoge como proyecto vivo, pero no hemos podido comprobar su actividad actual (por verificar).",
    "web": "https://turuta.cat",
    "fuente": "https://circulareconomy.europa.eu/platform/en/dialogue/existing-eu-platforms/turuta-social-currency-promoting-local-production-and-exchange",
    "escalas": [
     "pueblo"
    ],
    "subtemas": [
     "dinero",
     "hogares"
    ]
   },
   {
    "nombre": "Economía pública optimizada (Luz & Humanidad)",
    "lugar": "España",
    "tipo": "Proyecto propio",
    "texto": "Un único impuesto sobre cada transacción, cobrado automáticamente y repartido a partes iguales entre ocho escalas (persona, comunidad vecinal, municipio, provincia, región, nación, continente y planeta), con asambleas que eligen prioridades y comités técnicos que ejecutan.",
    "web": "https://humanity.wiki/economia-publica-optimizada",
    "fuente": null,
    "escalas": [
     "individuo",
     "comunidad",
     "pueblo",
     "provincia",
     "region",
     "pais",
     "continente",
     "planeta"
    ],
    "subtemas": [
     "publico",
     "dinero"
    ]
   },
   {
    "nombre": "Finanzas para Todos",
    "lugar": "España",
    "tipo": null,
    "texto": "Plan de Educación Financiera del Banco de España y la CNMV.",
    "web": "https://www.bde.es/wbe/es/areas-actuacion/educacion-financiera/comprometidos-con-la-educacion-financiera/la-educacion-financiera-en-espana/",
    "fuente": null,
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "hogares"
    ]
   },
   {
    "nombre": "Coordinadora Estatal de Comercio Justo",
    "lugar": "España",
    "tipo": null,
    "texto": "Red de organizaciones que importan y venden productos de comercio justo.",
    "web": "https://comerciojusto.org",
    "fuente": null,
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "exterior"
    ]
   }
  ],
  "preguntas": [
   "Para el bloque del hogar, ¿quieres incluir propuestas de garantía de ingresos (renta básica, ingreso mínimo) o prefieres centrarte en ahorro y educación financiera?",
   "En tu modelo de impuesto único por transacción, ¿qué tipo aproximado tienes en mente y cómo se protege a los hogares con menos ingresos? Así podemos enlazarlo con los retos de pobreza y fiscalidad.",
   "¿Conoces cooperativas, bancos de tiempo o monedas locales en tu zona que debamos añadir como proyectos?",
   "¿Tienes relación con Fiare, Triodos o alguna cooperativa de crédito (Caixa Popular, Laboral Kutxa…) que quieras destacar?"
  ],
  "subtemas": [
   {
    "id": "hogares",
    "nombre": "Hogares"
   },
   {
    "id": "trabajo",
    "nombre": "Trabajo"
   },
   {
    "id": "empresas",
    "nombre": "Empresas"
   },
   {
    "id": "publico",
    "nombre": "Sector público"
   },
   {
    "id": "dinero",
    "nombre": "Dinero y banca"
   },
   {
    "id": "exterior",
    "nombre": "Sector exterior"
   }
  ]
 },
 {
  "id": "seguridad",
  "nombre": "Seguridad",
  "resumen": "Vivir sin miedo: calles tranquilas, hogares preparados y territorios que se anticipan a incendios, inundaciones y olas de calor.",
  "ambito": "Abarca la seguridad física de las personas en casa, en la calle y en el territorio: seguridad vial y del espacio público, prevención del delito y preparación y respuesta comunitaria ante emergencias y catástrofes (incendios, DANA e inundaciones, olas de calor).",
  "vision": {
   "escena3d": "movilidad",
   "intro": "Imaginamos una sociedad donde la seguridad no se basa en el miedo sino en el cuidado mutuo: calles por las que un niño puede ir solo al colegio, vecinos que se conocen y se avisan, y paisajes vivos que frenan el fuego y el agua. Prevenir es la forma más profunda de proteger: cada hogar preparado y cada barrio organizado hacen que la próxima emergencia sea más pequeña.",
   "equipo": "Un equipo humano recopila esta visión y la comunica a través del arte digital y físico para que sea accesible a todos los seres humanos. El botón «Ver la visión en 3D» abre la herramienta de visualización del ideal de Luz & Humanidad.",
   "bloques": [
    {
     "titulo": "Hogar: casa segura y preparada",
     "texto": "La seguridad empieza en casa: hogares sin riesgos evitables y familias que saben qué hacer cuando llega una emergencia. La preparación no es alarmismo, es tranquilidad: unos pocos hábitos y un pequeño kit permiten pasar las primeras horas de una crisis con calma.",
     "puntos": [
      "Cada hogar tiene un kit básico para ser autosuficiente al menos 72 horas (agua, alimentos, linterna, radio, botiquín, documentos), como recomienda la Unión Europea.",
      "Plan familiar de emergencia: punto de encuentro, teléfonos clave y quién recoge a quién.",
      "Viviendas adaptadas al clima: sombra, ventilación y aislamiento para soportar olas de calor sin poner en riesgo a mayores y enfermos.",
      "Personas que conocen el 112, los avisos ES-Alert y las normas básicas de autoprotección ante inundaciones e incendios.",
      "Formación en primeros auxilios y reanimación extendida en la población.",
      "Hábitos digitales seguros: saber reconocer estafas por teléfono, SMS o correo y a quién pedir ayuda (017)."
     ],
     "imagenes": [],
     "escena3d": "hogar",
     "escalas": [
      "individuo"
     ],
     "subtemas": [
      "hogar",
      "clima",
      "emergencias",
      "digital"
     ]
    },
    {
     "titulo": "Barrio: calles vivas y vecinos que se cuidan",
     "texto": "Un barrio seguro es un barrio habitado: calles tranquilas, comercios abiertos, niños jugando y mayores paseando. La convivencia, la mediación y una policía cercana previenen más que cualquier muro.",
     "puntos": [
      "Calles a 30 km/h o menos y prioridad peatonal, con entornos escolares pacificados.",
      "Caminos escolares seguros por los que los niños pueden ir andando solos al colegio.",
      "Espacio público con luz, sombra, bancos y vida a todas horas: más ojos en la calle.",
      "Policía de proximidad que conoce al vecindario y trabaja con él en la prevención.",
      "Mediación vecinal para resolver conflictos antes de que escalen.",
      "Refugios climáticos a pocos minutos a pie para protegerse del calor extremo."
     ],
     "imagenes": [],
     "escena3d": "movilidad",
     "escalas": [
      "comunidad"
     ],
     "subtemas": [
      "calle",
      "clima"
     ]
    },
    {
     "titulo": "Territorio: gestión del riesgo y protección civil",
     "texto": "El territorio seguro es el que se anticipa: paisajes cuidados que frenan el fuego, ríos con espacio para crecer y sistemas de alerta que llegan a tiempo. La protección civil es tarea de todos, con profesionales bien dotados y voluntariado formado.",
     "puntos": [
      "Paisaje en mosaico (cultivos, pastos y bosque gestionado) y pastoreo extensivo que reduce el combustible vegetal.",
      "Urbanismo que respeta las zonas inundables y deja espacio a ríos y barrancos.",
      "Avisos tempranos claros que llegan a todos los teléfonos con tiempo para actuar.",
      "Planes municipales de emergencia conocidos y ensayados por la población.",
      "Agrupaciones de voluntariado de protección civil y de defensa forestal arraigadas en cada municipio.",
      "Coordinación ágil entre administraciones, bomberos, servicios sanitarios y vecinos."
     ],
     "imagenes": [],
     "escena3d": "naturaleza",
     "escalas": [
      "provincia",
      "region"
     ],
     "subtemas": [
      "clima",
      "emergencias"
     ]
    }
   ],
   "arte": {
    "src": "/calendario-arte/miniaturas/mes-07-b.jpg",
    "grande": "/calendario-arte/ilustraciones/mes-07-b.jpg",
    "tema": "Hogar y Vivienda"
   }
  },
  "retos": [
   {
    "ambito": "España",
    "titulo": "Las carreteras siguen costando más de mil vidas al año",
    "texto": "En 2025 murieron 1.119 personas en vías interurbanas (cómputo a 24 horas), 35 menos que en 2024 y la segunda cifra más baja desde 1960. Aun así, el 40 % de los fallecidos fueron usuarios vulnerables: 304 motoristas, 103 peatones y 40 ciclistas.",
    "fuente": "https://www.dgt.es/comunicacion/notas-de-prensa/20260108-2025-finaliza-1119-fallecidos-en-siniestros-de-trafico-en-vias-interurbanas",
    "escalas": [
     "pueblo",
     "pais"
    ],
    "subtemas": [
     "calle"
    ]
   },
   {
    "ambito": "UE",
    "titulo": "Incendios forestales cada vez más extensos",
    "texto": "Según el informe avanzado del Sistema Europeo de Información sobre Incendios Forestales (EFFIS) publicado en marzo de 2026, en 2025 ardieron más de un millón de hectáreas en la Unión Europea, el peor año desde que hay registros. En España la superficie quemada rondó las 400.000 hectáreas (cifra citada por expertos a partir del informe; por verificar en la estadística oficial del MITECO).",
    "fuente": "https://sciencemediacentre.es/los-incendios-forestales-en-2025-quemaron-mas-de-un-millon-de-hectareas-de-la-union-europea-casi-la",
    "escalas": [
     "provincia",
     "continente"
    ],
    "subtemas": [
     "clima"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Inundaciones repentinas que sorprenden a la población",
    "texto": "La DANA del 29 de octubre de 2024 causó más de 220 víctimas mortales, sobre todo en la provincia de Valencia, según los datos difundidos por el Tribunal Superior de Justicia de la Comunitat Valenciana (la cifra judicial se ha ido actualizando después). Fue una de las catástrofes naturales más graves de la historia reciente de España.",
    "fuente": "https://www.poderjudicial.es/cgpj/es/Poder-Judicial/Tribunales-Superiores-de-Justicia/TSJ-Comunidad-Valenciana/Oficina-de-Comunicacion/Notas-de-prensa/La-cifra-de-victimas-mortales-por-la-Dana-se-mantiene-en-222--todas-con-autopsia-y-ya-identificadas--y-los-expedientes-activos-por-desaparicion-bajan-a-4",
    "escalas": [
     "provincia",
     "pais"
    ],
    "subtemas": [
     "clima"
    ]
   },
   {
    "ambito": "UE",
    "titulo": "El calor extremo se cobra miles de vidas cada verano",
    "texto": "Un estudio de ISGlobal publicado en Nature Medicine (septiembre de 2025) estima unas 62.775 muertes relacionadas con el calor en Europa durante el verano de 2024. España fue el segundo país más afectado, con unas 6.743 muertes estimadas.",
    "fuente": "https://www.isglobal.org/-/62.700-muertes-asociadas-con-el-calor-del-verano-de-2024",
    "escalas": [
     "continente"
    ],
    "subtemas": [
     "clima"
    ]
   },
   {
    "ambito": "UE",
    "titulo": "Poca preparación ciudadana ante emergencias",
    "texto": "En el Eurobarómetro de 2024 sobre riesgo de catástrofes, casi dos de cada tres europeos dijeron necesitar más información para prepararse y más de un tercio tiene dificultades para encontrarla en las autoridades. Solo un 7 % colabora como voluntario en organizaciones de emergencia o resiliencia comunitaria.",
    "fuente": "https://civil-protection-humanitarian-aid.ec.europa.eu/news-stories/news/europeans-believe-they-need-more-information-prepare-emergencies-recent-eurobarometer-survey-shows-2024-09-30_en",
    "escalas": [
     "comunidad",
     "pueblo",
     "provincia",
     "continente"
    ],
    "subtemas": [
     "clima",
     "emergencias"
    ]
   },
   {
    "ambito": "España",
    "titulo": "La delincuencia se desplaza a internet",
    "texto": "Según el Balance de Criminalidad del Ministerio del Interior, en 2025 se registraron 489.248 ciberdelitos, el 19,8 % de todas las infracciones penales y un 5,3 % más que en 2024; la mayoría son estafas informáticas. La criminalidad convencional, en cambio, bajó un 0,2 % y su tasa está en la franja más baja de su serie histórica.",
    "fuente": "https://estadisticasdecriminalidad.ses.mir.es/publico/portalestadistico/dam/jcr:7d3776cd-9ca4-4c02-8ca4-96b2571dbee4/Balance%20de%20Criminalidad%20Cuarto%20Trimestre%202025.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "digital"
    ]
   }
  ],
  "soluciones": [
   {
    "ambito": "España",
    "titulo": "Calles a 30 km/h y Visión Cero",
    "texto": "Limitar la velocidad urbana y dar prioridad al peatón reduce la gravedad de los atropellos. Cinco años después de generalizar el límite de 30 km/h (mayo de 2021), la DGT informa de que en 2024 murieron en ciudad casi un 19 % menos de ciclistas y más de un 16 % menos de peatones que en 2019, y nueve ciudades de más de 100.000 habitantes no tuvieron ningún fallecido; la DGT lo presenta como tendencia, no como efecto causal medido.",
    "supera": "Las carreteras siguen costando más de mil vidas al año",
    "fuente": "https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/nota_prensa/2026/20260511-NP-Quinto-aniversario-entrada-vigor-30km.pdf",
    "escalas": [
     "pueblo",
     "pais"
    ],
    "subtemas": [
     "calle"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Paisaje en mosaico y pastoreo preventivo",
    "texto": "Rebaños que pastan en zonas estratégicas elegidas por los bomberos mantienen limpio el sotobosque y crean franjas donde el fuego pierde fuerza, a la vez que sostienen la ganadería extensiva. El modelo Ramats de Foc, iniciado en 2016 por la Fundación Pau Costa en Cataluña, reúne ya a un centenar de ganaderos; su impacto se evalúa zona a zona y no hay aún una cifra global publicada.",
    "supera": "Incendios forestales cada vez más extensos",
    "fuente": "https://www.bbva.com/es/juntos-creando-oportunidades/rebanos-de-fuego-gestion-sostenible-del-riesgo-de-incendios-forestales/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "clima"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Alertas tempranas y autoprotección",
    "texto": "Sistemas de aviso que llegan a tiempo a cada teléfono, unidos a una población que sabe qué hacer (subir a pisos altos, no bajar a garajes, no cruzar cauces). Según la ONU, avisar con solo 24 horas de antelación puede reducir los daños económicos un 30 %, y los países con buena cobertura de alerta temprana tienen una mortalidad por desastres ocho veces menor.",
    "supera": "Inundaciones repentinas que sorprenden a la población",
    "fuente": "https://www.un.org/sites/un2.un.org/files/climate-change-fast-facts-updates/EarlyWarnings_FastFacts.pdf",
    "escalas": [
     "planeta"
    ],
    "subtemas": [
     "clima",
     "emergencias"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Planes de calor y refugios climáticos",
    "texto": "Avisos sanitarios, atención a personas mayores y solas, y espacios frescos de acceso libre (bibliotecas, escuelas, parques con sombra). Un estudio de ISGlobal (PLOS Medicine, 2018) mostró que, aunque los veranos se calentaron más de 1 °C desde 1980, el riesgo de morir por calor disminuyó en España, algo que los autores relacionan con mejoras en vivienda, servicios sanitarios y campañas de concienciación.",
    "supera": "El calor extremo se cobra miles de vidas cada verano",
    "fuente": "https://www.eurekalert.org/news-releases/484017",
    "escalas": [
     "individuo",
     "pais"
    ],
    "subtemas": [
     "calle",
     "clima"
    ]
   },
   {
    "ambito": "UE",
    "titulo": "Comunidades preparadas y voluntariado de protección civil",
    "texto": "La Estrategia de la Unión de Preparación (marzo de 2025) propone que la población pueda ser autosuficiente al menos 72 horas y que la preparación se enseñe en escuelas y barrios. Experiencias como las agrupaciones de voluntariado de protección civil o los barrios Firewise de Estados Unidos muestran que vecinos organizados y formados multiplican la capacidad de respuesta en las primeras horas.",
    "supera": "Poca preparación ciudadana ante emergencias",
    "fuente": "https://www.euskadi.eus/contenidos/documentacion/inf_estrategia2030/es_def/20250327_Estrategia-UE-Preparacion-2030.pdf",
    "escalas": [
     "comunidad",
     "continente"
    ],
    "subtemas": [
     "hogar",
     "calle",
     "clima",
     "emergencias"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Ayuda y educación en ciberseguridad",
    "texto": "Una línea pública, gratuita y especializada (el 017 de INCIBE) orienta a ciudadanos, empresas y menores ante estafas, suplantaciones o acoso en línea. Recibió más de 138.000 consultas en 2025, un 40 % más que el año anterior, y las suplantaciones por teléfono, SMS o correo son el primer motivo de consulta.",
    "supera": "La delincuencia se desplaza a internet",
    "fuente": "https://digital.gob.es/en/comunicacion/notas-prensa/secretaria-estado-telecomunicaciones-e-infraestructuras-digitales/2025/12/2025-12-26",
    "escalas": [
     "pueblo",
     "pais"
    ],
    "subtemas": [
     "digital"
    ]
   }
  ],
  "proyectos": [
   {
    "nombre": "Modelo urbano de Pontevedra",
    "lugar": "Pontevedra (Galicia, España)",
    "tipo": "programa público municipal",
    "texto": "Desde 1999 la ciudad ha dado prioridad al peatón: el tráfico a motor bajó un 92 % en el centro histórico y un 77 % en el centro, con límites de 10 a 30 km/h. Según la DGT, no registra muertes por tráfico urbano desde 2007 y los heridos graves pasaron de 129 (1999) a 4 (2020); el programa de caminos escolares se suprimió porque la mayoría de los niños ya va andando al colegio.",
    "web": "https://www.pontevedra.gal",
    "fuente": "https://www.DGT.es/.galleries/downloads/conoce_la_dgt/que-hacemos/estrategias-y-planes/Experiencias-urbanas/pdf/84000-Pontevedra.pdf",
    "escalas": [
     "pueblo"
    ],
    "subtemas": [
     "calle"
    ]
   },
   {
    "nombre": "Protegim les escoles (Protegemos las escuelas)",
    "lugar": "Barcelona (España)",
    "tipo": "programa público municipal",
    "texto": "Transforma los entornos escolares calmando el tráfico, mejorando los accesos y ganando espacio de estancia y verde. Empezó en 2020 con 26 escuelas, sumó 75 en 2021 y preveía 54 más en 2022, con el objetivo de llegar a todos los centros de la ciudad.",
    "web": "https://ajuntament.barcelona.cat/educacio/es/protegemos-las-escuelas",
    "fuente": "https://ajuntament.barcelona.cat/educacio/es/protegemos-las-escuelas",
    "escalas": [
     "pueblo"
    ],
    "subtemas": [
     "calle"
    ]
   },
   {
    "nombre": "Xarxa de Refugis Climàtics",
    "lugar": "Barcelona (España)",
    "tipo": "programa público municipal",
    "texto": "Red de espacios frescos y gratuitos (bibliotecas, escuelas, equipamientos y parques) para protegerse del calor. Nació en 2020 con unos 70 refugios y en el verano de 2026 supera los 500; según el Ayuntamiento, el 99,2 % de los vecinos tiene uno a menos de diez minutos a pie.",
    "web": "https://datos.gob.es/ca/catalogo/l01080193-red-de-refugios-climaticos-en-la-ciudad-de-barcelona",
    "fuente": "https://www.moncloa.com/2026/06/16/refugios-climaticos-barcelona-verano-3385427/",
    "escalas": [
     "pueblo"
    ],
    "subtemas": [
     "calle",
     "clima"
    ]
   },
   {
    "nombre": "Ramats de Foc (Rebaños de Fuego)",
    "lugar": "Cataluña (España)",
    "tipo": "proyecto de fundación (Fundación Pau Costa)",
    "texto": "Une a ganaderos de pastoreo extensivo con las zonas estratégicas de prevención de incendios definidas por los bomberos de la Generalitat. Iniciado en 2016 con tres explotaciones, hoy cuenta con alrededor de un centenar de ganaderos y una marca y mapa de productos «que cuidan los bosques».",
    "web": "https://www.ramatsdefoc.org",
    "fuente": "https://www.vinetur.com/2025122994452/ramats-de-foc-lanza-un-mapa-interactivo-para-localizar-productos-que-cuidan-los-bosques.html",
    "escalas": [
     "region"
    ],
    "subtemas": [
     "clima"
    ]
   },
   {
    "nombre": "Agrupaciones de Defensa Forestal (ADF)",
    "lugar": "Cataluña (España)",
    "tipo": "asociaciones de voluntariado, propietarios y ayuntamientos",
    "texto": "Nacidas de grupos vecinales de los años 60 y reconocidas oficialmente en 1986, hacen prevención, vigilancia y primera intervención en incendios hasta la llegada de los bomberos. En 2022 eran más de 300 agrupaciones con más de 6.000 voluntarios.",
    "web": "http://www.federacioadfbages.org",
    "fuente": "https://www.3cat.cat/3catinfo/les-adf-molestes-perque-es-limiten-les-seves-tasques/noticia/3170421/",
    "escalas": [
     "region"
    ],
    "subtemas": [
     "clima",
     "emergencias"
    ]
   },
   {
    "nombre": "Voluntariado de Protección Civil",
    "lugar": "Toda España (ejemplo: Comunitat Valenciana)",
    "tipo": "agrupaciones municipales de voluntariado",
    "texto": "Vecinos formados que apoyan a los servicios profesionales en prevención y emergencias. Solo en la Comunitat Valenciana hay más de 3.000 voluntarios en 164 agrupaciones y asociaciones, que durante la DANA de 2024 participaron en búsquedas, limpieza, achique de agua y reparto de ayuda.",
    "web": "https://www.proteccioncivil.es",
    "fuente": "https://valencianews.es/comunidad-valenciana/emergencias-destaca-la-labor-de-los-voluntarios-en-el-dia-internacional-de-proteccion-civil/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "clima",
     "emergencias"
    ]
   },
   {
    "nombre": "Firewise USA",
    "lugar": "Estados Unidos",
    "tipo": "programa de reconocimiento comunitario (NFPA, entidad sin ánimo de lucro)",
    "texto": "Los vecinos de una urbanización forman un comité, evalúan su riesgo de incendio, hacen un plan de acción a tres años y lo aplican juntos (limpieza de vegetación, accesos, viviendas más resistentes). En mayo de 2026 California reconoció su comunidad Firewise número 1.500.",
    "web": "https://www.nfpa.org/firewise",
    "fuente": "https://wildfiretaskforce.org/california-continues-to-lead-nation-with-recognition-of-1500th-firewise-community/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "clima",
     "emergencias"
    ]
   }
  ],
  "preguntas": [
   "¿Quieres que el sector incluya también la seguridad frente a la violencia (violencia de género, acoso escolar) o la dejamos para otros sectores como Igualdad o Educación?",
   "¿Damos el mismo peso a las catástrofes naturales (incendios, DANA, calor) que a la seguridad vial y ciudadana, o prefieres que el territorio y las emergencias sean el eje principal?",
   "¿Conoces alguna agrupación de Protección Civil, ADF o red vecinal cercana a ti que quieras destacar como proyecto propio de Luz & Humanidad?",
   "¿Te gustaría ofrecer en la web una guía práctica de preparación del hogar (kit de 72 horas, plan familiar) o prefieres enlazar a los recursos oficiales?"
  ],
  "subtemas": [
   {
    "id": "hogar",
    "nombre": "Hogar preparado"
   },
   {
    "id": "calle",
    "nombre": "Calle y seguridad vial"
   },
   {
    "id": "clima",
    "nombre": "Incendios, inundaciones y calor"
   },
   {
    "id": "emergencias",
    "nombre": "Emergencias y protección civil"
   },
   {
    "id": "digital",
    "nombre": "Seguridad digital"
   }
  ]
 },
 {
  "id": "justicia",
  "nombre": "Justicia",
  "resumen": "Una justicia cercana, comprensible y rápida, que repara el daño, reconcilia a las personas y ayuda a quien ha fallado a volver a la comunidad.",
  "ambito": "Abarca el acceso de las personas a la justicia y su comprensión, las vías comunitarias para resolver conflictos (mediación, justicia restaurativa) y el funcionamiento del sistema judicial y penitenciario: rapidez, transparencia y reinserción.",
  "vision": {
   "escena3d": "comunidad",
   "intro": "Imaginamos una justicia que no solo castiga, sino que repara: que escucha a la víctima, ayuda a quien causó el daño a hacerse responsable y devuelve la paz a la comunidad. Una justicia que todos entienden, a la que todos pueden acudir y que llega a tiempo.",
   "equipo": "Un equipo humano recopila esta visión y la comunica a través del arte digital y físico para que sea accesible a todos los seres humanos. El botón «Ver la visión en 3D» abre la herramienta de visualización del ideal de Luz & Humanidad.",
   "bloques": [
    {
     "titulo": "Personas: acceso a la justicia y lenguaje claro",
     "texto": "Cualquier persona, tenga o no recursos, sabe dónde acudir cuando tiene un problema legal y entiende lo que se le dice. Las sentencias, citaciones y trámites están escritos para ser comprendidos, no solo para ser válidos.",
     "puntos": [
      "Orientación jurídica gratuita y cercana, también en pueblos y en línea.",
      "Resoluciones y notificaciones redactadas en lenguaje claro, con resúmenes comprensibles.",
      "Apoyos para personas con discapacidad, mayores o que no hablan el idioma (facilitadores, intérpretes, lectura fácil).",
      "Víctimas informadas y acompañadas en todo el proceso.",
      "Costes previsibles y justicia gratuita real para quien la necesita.",
      "Educación jurídica básica en la escuela: conocer los propios derechos y deberes."
     ],
     "imagenes": [],
     "escena3d": "comunidad",
     "escalas": [
      "individuo"
     ],
     "subtemas": [
      "acceso",
      "restaurativa"
     ]
    },
    {
     "titulo": "Comunidad: mediación y justicia restaurativa",
     "texto": "Muchos conflictos se resuelven mejor hablando que litigando. La mediación y la justicia restaurativa devuelven a las personas el protagonismo para reparar el daño y recomponer la convivencia.",
     "puntos": [
      "Servicios de mediación familiar, vecinal, escolar y comunitaria accesibles y de calidad.",
      "Encuentros restaurativos voluntarios entre víctima, autor y comunidad, con profesionales formados.",
      "Reparación del daño (material y emocional) como objetivo central, no solo la pena.",
      "Círculos y conferencias restaurativas también en escuelas y barrios para prevenir la escalada de conflictos.",
      "Respeto absoluto a la voluntad de la víctima: nunca se le obliga a participar.",
      "Profesionales de la mediación reconocidos y con estándares comunes."
     ],
     "imagenes": [],
     "escena3d": "comunidad",
     "escalas": [
      "comunidad"
     ],
     "subtemas": [
      "mediacion",
      "restaurativa"
     ]
    },
    {
     "titulo": "Sistema: justicia ágil y reinserción",
     "texto": "Los juzgados resuelven en plazos razonables, con medios suficientes y datos abiertos que permiten a la ciudadanía conocer cómo funcionan. La prisión es el último recurso y, cuando se usa, se orienta a que la persona vuelva a la sociedad sin reincidir.",
     "puntos": [
      "Plazos razonables y previsibles en todas las jurisdicciones.",
      "Expedientes digitales interoperables y estadísticas judiciales abiertas y comprensibles.",
      "Penas alternativas a la prisión cuando sean adecuadas (trabajos en beneficio de la comunidad, programas formativos).",
      "Prisiones basadas en el principio de normalidad: formación, trabajo, convivencia y contacto con la familia.",
      "Acompañamiento a la salida de prisión: vivienda, empleo y red de apoyo.",
      "Instituciones independientes y transparentes que generan confianza ciudadana."
     ],
     "imagenes": [],
     "escena3d": "pueblo",
     "escalas": [
      "pais"
     ],
     "subtemas": [
      "acceso",
      "juzgados",
      "reinsercion"
     ]
    }
   ],
   "arte": {
    "src": "/calendario-arte/miniaturas/mes-12-d.jpg",
    "grande": "/calendario-arte/ilustraciones/mes-12-d.jpg",
    "tema": "Valores"
   }
  },
  "retos": [
   {
    "ambito": "España",
    "titulo": "Millones de asuntos esperando en los juzgados",
    "texto": "Al cierre del tercer trimestre de 2025 había 4.696.050 asuntos en trámite en los órganos judiciales españoles, un 6,7 % más que un año antes, según el Consejo General del Poder Judicial. Aunque los juzgados resolvieron casi tantos asuntos como entraron, la acumulación sigue creciendo.",
    "fuente": "https://www.poderjudicial.es/cgpj/es/Poder-Judicial/En-Portada/Los-organos-judiciales-de-toda-Espana-registraron-un-total-de-1-519-584-nuevos-asuntos-en-el-tercer-trimestre-de-2025--un-12-5---menos-que-hace-un-ano",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "juzgados"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Un lenguaje jurídico que muchos no entienden",
    "texto": "Los barómetros de opinión del CGPJ recogidos en el informe de la Comisión para la Modernización del Lenguaje Jurídico (2011) mostraban que el 82 % de la ciudadanía considera el lenguaje jurídico excesivamente complicado y difícil de entender. No hay una medición oficial más reciente comparable (por verificar).",
    "fuente": "https://www.administracionpublica.com/lenguaje-criptico-y-modernidad",
    "escalas": [
     "pueblo",
     "pais"
    ],
    "subtemas": [
     "acceso",
     "juzgados"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Baja confianza en la independencia judicial",
    "texto": "Según los datos de Eurostat que utiliza el Cuadro de Indicadores de la Justicia de la UE, en 2025 el 39 % de la población española valoraba como buena o muy buena la independencia de jueces y tribunales. En 2021 la cifra era del 35 %, la sexta más baja de los 27 países de la UE.",
    "fuente": "https://tradingeconomics.com/spain/perceived-independence-of-the-justice-system-very-good-or-fairly-good-eurostat-data.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "juzgados"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Una brecha mundial de acceso a la justicia",
    "texto": "El World Justice Project estimó en 2019 que unos 5.000 millones de personas en el mundo tienen necesidades de justicia no resueltas: problemas legales cotidianos (vivienda, trabajo, familia, deudas) que no consiguen solucionar o falta de documentos y protección básica.",
    "fuente": "https://worldjusticeproject.org/news/estimated-5-billion-people-have-unmet-justice-needs-globally",
    "escalas": [
     "individuo",
     "planeta"
    ],
    "subtemas": [
     "acceso"
    ]
   },
   {
    "ambito": "España",
    "titulo": "La reinserción todavía no llega a todos",
    "texto": "El último estudio de reincidencia de Instituciones Penitenciarias indica que casi 9 de cada 10 personas excarceladas en 2020 no volvieron a prisión en el periodo analizado; es decir, alrededor de una de cada diez sí lo hizo. Reducir esa cifra depende de la formación, el empleo y el apoyo tras la salida (periodo exacto de seguimiento: por verificar).",
    "fuente": "https://www.interior.gob.es/opencms/es/detalle/articulo/El-nuevo-estudio-de-reincidencia-penitenciaria-recoge-que-casi-9-de-cada-10-excarcelados-en-2020-no-volvieron-a-prision-durante-el-periodo-examinado/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "reinsercion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Un cambio de modelo que aún se está asentando",
    "texto": "La Ley Orgánica 1/2025 de eficiencia del Servicio Público de Justicia obliga desde abril de 2025 a intentar un medio adecuado de solución de controversias (MASC) antes de demandar en la vía civil y reorganiza los juzgados en tribunales de instancia. Colegios de la abogacía como el de Madrid señalan, un año después, criterios de aplicación desiguales, costes para personas con pocos recursos e incidencias en la puesta en marcha.",
    "fuente": "https://elderecho.com/el-icam-hace-balance-de-un-ano-de-la-ley-de-eficiencia",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "mediacion",
     "juzgados"
    ]
   }
  ],
  "soluciones": [
   {
    "ambito": "España",
    "titulo": "Mediación y medios adecuados de solución de controversias",
    "texto": "Antes o durante un juicio, una persona mediadora neutral ayuda a las partes a llegar a su propio acuerdo, de forma voluntaria y confidencial. El CGPJ impulsa la mediación intrajudicial con protocolos para lo civil, familiar, penal, laboral y contencioso, y señala un aumento notable de los juzgados que derivan casos (sin cifras publicadas en la guía); cada acuerdo alcanzado es un juicio menos.",
    "supera": "Millones de asuntos esperando en los juzgados",
    "fuente": "https://mediacion.icav.es/wp-content/uploads/2024/10/Guia-practica-de-la-mediacion-intrajudicial-CGPJ-2024.pdf",
    "escalas": [
     "individuo",
     "pais"
    ],
    "subtemas": [
     "mediacion",
     "juzgados"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Lenguaje claro y facilitadores procesales",
    "texto": "Redactar sentencias y notificaciones para que se entiendan, y ofrecer apoyos a quien lo necesita. La Ley 8/2021 reconoce la figura del profesional facilitador para que las personas con discapacidad participen en los procesos en igualdad, y el informe de 2011 de la Comisión para la Modernización del Lenguaje Jurídico dejó recomendaciones concretas para jueces, abogados y administraciones; su impacto aún no se ha medido de forma sistemática.",
    "supera": "Un lenguaje jurídico que muchos no entienden",
    "fuente": "https://elderecho.com/convenio-abogacia-plena-inclusion-acceso-justicia-personas-discapacidad",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "acceso"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Transparencia y datos judiciales abiertos",
    "texto": "Publicar datos comprensibles sobre plazos, nombramientos, indultos o algoritmos que afectan a la ciudadanía permite evaluar el sistema con hechos y no con impresiones. Organizaciones como Civio ofrecen bases de datos públicas (como el Indultómetro) y en 2025 lograron que el Tribunal Supremo les diera la razón en su demanda de acceso al código del algoritmo BOSCO.",
    "supera": "Baja confianza en la independencia judicial",
    "fuente": "https://civio.es/en/report-2025/",
    "escalas": [
     "pueblo",
     "pais"
    ],
    "subtemas": [
     "acceso",
     "juzgados"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Justicia centrada en las personas",
    "texto": "En lugar de partir de los tribunales, se parte de los problemas reales de la gente (vivienda, trabajo, familia) y se ofrecen soluciones sencillas: orientación jurídica de primer nivel, servicios en línea y en la comunidad, y vías rápidas. El World Justice Project mide la brecha de justicia con encuestas a la población para orientar estos servicios.",
    "supera": "Una brecha mundial de acceso a la justicia",
    "fuente": "https://worldjusticeproject.org/news/estimated-5-billion-people-have-unmet-justice-needs-globally",
    "escalas": [
     "individuo",
     "planeta"
    ],
    "subtemas": [
     "acceso"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Justicia restaurativa",
    "texto": "Encuentros voluntarios y preparados entre víctima, autor y comunidad para hablar del daño y acordar cómo repararlo. Una revisión sistemática de la Colaboración Campbell (Strang y otros, 2013; 10 estudios) halló menos reincidencia en quienes participaron (en Reino Unido, un 27 % menos de nuevas condenas en dos años) y mayor satisfacción y menos estrés postraumático en las víctimas.",
    "supera": "La reinserción todavía no llega a todos",
    "fuente": "https://phys.org/news/2014-02-justice-victims-crime.html",
    "escalas": [
     "planeta"
    ],
    "subtemas": [
     "restaurativa",
     "reinsercion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Protocolos comunes y evaluación de la reforma",
    "texto": "Guías prácticas compartidas por juzgados, abogacía y mediadores (como la Guía de mediación intrajudicial del CGPJ, actualizada en 2024) ayudan a aplicar las nuevas normas de forma homogénea. Evaluar con datos públicos la Ley 1/2025 (casos derivados, acuerdos, plazos y costes) permitiría corregir los problemas que señalan los profesionales.",
    "supera": "Un cambio de modelo que aún se está asentando",
    "fuente": "https://mediacion.icav.es/wp-content/uploads/2024/10/Guia-practica-de-la-mediacion-intrajudicial-CGPJ-2024.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "mediacion",
     "juzgados"
    ]
   }
  ],
  "proyectos": [
   {
    "nombre": "Servicio de Justicia Restaurativa de Euskadi",
    "lugar": "País Vasco (España)",
    "tipo": "programa público (Gobierno Vasco)",
    "texto": "Ofrece mediación, conferencias y círculos restaurativos con víctima, autor y comunidad en casos penales derivados por los juzgados. Atiende unos 1.400 casos al año y la mitad terminan con acuerdos restaurativos; en justicia juvenil, 1.165 de 1.505 procesos (2020-2022) tuvieron resultado positivo.",
    "web": "https://www.justizia.eus",
    "fuente": "https://www.euskadi.eus/gobierno-vasco/-/noticia/2023/la-mitad-casos-penales-del-servicio-justicia-restaurativa-terminan-medidas-alternativas-al-ingreso-prision/",
    "escalas": [
     "region"
    ],
    "subtemas": [
     "mediacion",
     "restaurativa",
     "juzgados"
    ]
   },
   {
    "nombre": "Mediación intrajudicial del CGPJ",
    "lugar": "Toda España",
    "tipo": "programa público (Consejo General del Poder Judicial)",
    "texto": "Red de juzgados que derivan casos a mediación con apoyo de convenios con la abogacía, la procura y otras entidades, y una guía práctica con protocolos para lo civil, familiar, penal, laboral y contencioso. La guía, aprobada en 2016, se actualizó en 2024.",
    "web": "https://www.poderjudicial.es/cgpj/es/Temas/Mediacion/",
    "fuente": "https://mediacion.icav.es/wp-content/uploads/2024/10/Guia-practica-de-la-mediacion-intrajudicial-CGPJ-2024.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "mediacion",
     "juzgados"
    ]
   },
   {
    "nombre": "Módulos de respeto",
    "lugar": "Centro penitenciario de León (Villahierro, Mansilla de las Mulas) y resto de España",
    "tipo": "programa público penitenciario",
    "texto": "Unidades de convivencia donde las personas presas asumen voluntariamente normas de respeto, higiene, responsabilidades y participación en grupos. Nacieron en la prisión de León y se extendieron al resto de centros penitenciarios españoles (número actual de módulos e internos: por verificar).",
    "web": "https://www.institucionpenitenciaria.es",
    "fuente": "https://www.diariodeleon.es/leon/240924/1626499/marlaska-recuerda-villahierro-exporto-nivel-mundial-modulos-respeto.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "reinsercion"
    ]
   },
   {
    "nombre": "Civio",
    "lugar": "España",
    "tipo": "fundación sin ánimo de lucro de periodismo de datos",
    "texto": "Vigila el poder y defiende el acceso a la información pública con periodismo, herramientas y acciones legales, como el Indultómetro o un simulador del algoritmo que usan las prisiones para decidir permisos. En 2025 tenía 2.297 socios, publicó 18 grandes investigaciones y el 42 % de sus ingresos procedió de donaciones.",
    "web": "https://civio.es",
    "fuente": "https://civio.es/en/report-2025/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "acceso",
     "juzgados",
     "reinsercion"
    ]
   },
   {
    "nombre": "Facilitación del acceso a la justicia (Plena inclusión y Abogacía Española)",
    "lugar": "Toda España",
    "tipo": "ONG en alianza con la abogacía",
    "texto": "Plena inclusión y el Consejo General de la Abogacía colaboran desde 2013 en formación y desde 2022 por convenio para impulsar los ajustes de procedimiento y la figura del facilitador reconocida por la Ley 8/2021. El objetivo es que las personas con discapacidad intelectual entiendan y participen en igualdad en los procesos judiciales.",
    "web": "https://www.plenainclusion.org",
    "fuente": "https://elderecho.com/convenio-abogacia-plena-inclusion-acceso-justicia-personas-discapacidad",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "acceso"
    ]
   },
   {
    "nombre": "Servicio Penitenciario de Noruega (prisión de Halden)",
    "lugar": "Noruega",
    "tipo": "servicio público penitenciario",
    "texto": "Aplica el principio de normalidad: la pena es la pérdida de libertad, pero se conservan los demás derechos, y la vida en prisión se parece lo más posible a la de fuera, con formación y trabajo. Según un estudio encargado por el propio servicio, la tasa de nueva condena a dos años fue del 18 % en 2018.",
    "web": "https://www.kriminalomsorgen.no",
    "fuente": "https://www.thelocal.no/20231213/explained-how-different-is-the-norwegian-prison-system-really",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "reinsercion"
    ]
   },
   {
    "nombre": "World Justice Project",
    "lugar": "Internacional (sede en Washington, EE. UU.)",
    "tipo": "organización internacional sin ánimo de lucro",
    "texto": "Mide el Estado de derecho y el acceso a la justicia en numerosos países mediante encuestas a la población y a expertos. Sus estimaciones sobre la «brecha de justicia» (unos 5.000 millones de personas con necesidades no resueltas, 2019) orientan políticas de justicia centrada en las personas.",
    "web": "https://worldjusticeproject.org",
    "fuente": "https://worldjusticeproject.org/news/estimated-5-billion-people-have-unmet-justice-needs-globally",
    "escalas": [
     "continente",
     "planeta"
    ],
    "subtemas": [
     "acceso"
    ]
   }
  ],
  "preguntas": [
   "¿Quieres que el sector trate también la justicia social y económica (desigualdad, derechos laborales) o lo limitamos al sistema de justicia y la resolución de conflictos?",
   "¿Cómo quieres abordar la Ley 1/2025 y los MASC: como solución en marcha, como reto, o presentando ambas visiones (apoyos y críticas) de forma neutral?",
   "¿Te interesa que la Comunidad Circular Humana tenga su propio modelo de resolución de conflictos (círculos restaurativos, mediación vecinal) y lo enlacemos desde aquí?",
   "¿Prefieres centrar la reinserción en la prisión (módulos de respeto, modelo noruego) o dar más peso a las penas alternativas y la prevención?"
  ],
  "subtemas": [
   {
    "id": "acceso",
    "nombre": "Acceso y lenguaje claro"
   },
   {
    "id": "mediacion",
    "nombre": "Mediación"
   },
   {
    "id": "restaurativa",
    "nombre": "Justicia restaurativa"
   },
   {
    "id": "juzgados",
    "nombre": "Juzgados ágiles"
   },
   {
    "id": "reinsercion",
    "nombre": "Reinserción"
   }
  ]
 },
 {
  "id": "salud",
  "nombre": "Salud",
  "resumen": "Vivir más años y con más salud: prevenir antes que curar, cuidar la mente, moverse, comer bien y respirar aire limpio en barrios que cuidan.",
  "ambito": "Abarca la salud física y mental de las personas, la atención primaria y comunitaria, y los factores del entorno (aire, ruido, naturaleza, ciudad) que deciden buena parte de la salud de una población.",
  "vision": {
   "escena3d": "naturaleza",
   "intro": "Imaginamos una sociedad donde la salud se construye cada día en la mesa, en la calle, en el barrio y en la escuela, y no solo en el hospital. Cada persona tiene un equipo de salud que la conoce, una comunidad que la acompaña y un entorno que la protege, sin que el código postal o la renta decidan cuánto vive.",
   "equipo": "Un equipo humano recopila esta visión y la comunica a través del arte digital y físico para que sea accesible a todos los seres humanos. El botón «Ver la visión en 3D» abre la herramienta de visualización del ideal de Luz & Humanidad.",
   "bloques": [
    {
     "titulo": "La persona: prevención, alimentación, movimiento y salud mental",
     "texto": "La salud empieza en los hábitos de cada día, pero elegir bien tiene que ser fácil para todos y no un privilegio. Comer de forma mediterránea, moverse cada día y cuidar la mente se aprenden desde la infancia y se acompañan desde la consulta, con información basada en pruebas científicas y sin promesas milagrosas.",
     "puntos": [
      "Alimentación de patrón mediterráneo (verdura, legumbre, fruta, frutos secos, aceite de oliva virgen extra) accesible y asequible en todos los barrios",
      "Al menos 150 minutos semanales de actividad física moderada en adultos y una hora diaria en la infancia, como recomienda la OMS",
      "Comedores escolares y entornos sin publicidad de ultraprocesados dirigida a niños y niñas",
      "Salud mental tratada con la misma normalidad que la física: psicología accesible en la sanidad pública y programas escolares de prevención con eficacia demostrada",
      "Vacunación y cribados con evidencia (por ejemplo, de cáncer de colon, mama y cuello de útero) al alcance de toda la población",
      "Personas con enfermedades crónicas formadas para cuidarse a sí mismas, con información fiable y apoyo entre pacientes"
     ],
     "imagenes": [],
     "escena3d": "hogar",
     "escalas": [
      "individuo"
     ],
     "subtemas": [
      "prevencion",
      "mental",
      "primaria",
      "comunitaria"
     ]
    },
    {
     "titulo": "La comunidad: atención primaria cercana y activos en salud",
     "texto": "El centro de salud es la puerta de entrada y también un nodo del barrio: conoce a sus vecinos y vecinas, colabora con asociaciones, ayuntamientos y escuelas, y recomienda recursos que mejoran la salud más allá de los medicamentos. La continuidad con el mismo equipo profesional es un valor que se protege.",
     "puntos": [
      "Médico y enfermera de familia que conocen a cada paciente a lo largo de los años (continuidad asistencial)",
      "Cita en atención primaria en pocos días y tiempo suficiente en consulta",
      "Mapas de activos en salud: cada barrio sabe qué grupos, paseos, huertos, talleres y asociaciones tiene a su alcance",
      "Recomendación de activos o prescripción social desde la consulta, con seguimiento y evaluación de resultados",
      "Escuelas de pacientes en las que personas que conviven con una enfermedad enseñan a otras junto a profesionales",
      "Participación vecinal en los consejos de salud de cada zona"
     ],
     "imagenes": [],
     "escena3d": "comunidad",
     "escalas": [
      "comunidad"
     ],
     "subtemas": [
      "primaria",
      "comunitaria"
     ]
    },
    {
     "titulo": "El entorno: aire limpio, silencio, naturaleza y ciudades saludables",
     "texto": "Gran parte de la salud se decide fuera del sistema sanitario: en el aire que se respira, el ruido que se soporta y la naturaleza que se tiene cerca. Una ciudad saludable se diseña para caminar, ir en bici, jugar y descansar, y reparte de forma justa sus zonas verdes.",
     "puntos": [
      "Calidad del aire dentro de los valores guía de la OMS, con zonas de bajas emisiones y menos tráfico en los barrios",
      "Calles a 30 km/h, pavimentos y diseño urbano que reducen el ruido, sobre todo de noche",
      "Zonas verdes de calidad a pocos minutos a pie de cada vivienda, con anillos verdes y corredores naturales",
      "Ciudades caminables y ciclables que integran el movimiento en la vida diaria",
      "Sombra, arbolado y refugios climáticos frente a las olas de calor",
      "Municipios que evalúan el impacto en salud de sus decisiones (urbanismo, movilidad, vivienda), como propone la Red Española de Ciudades Saludables"
     ],
     "imagenes": [],
     "escena3d": "naturaleza",
     "escalas": [
      "pueblo",
      "provincia",
      "region"
     ],
     "subtemas": [
      "prevencion",
      "comunitaria",
      "ambiental"
     ]
    }
   ],
   "arte": {
    "src": "/calendario-arte/miniaturas/mes-08-d.jpg",
    "grande": "/calendario-arte/ilustraciones/mes-08-d.jpg",
    "tema": "Salud y Bienestar"
   }
  },
  "retos": [
   {
    "ambito": "España",
    "titulo": "Más de un tercio de los escolares con exceso de peso",
    "texto": "El estudio ALADINO 2023 encontró que el 36,1 % de los niños y niñas de 6 a 9 años tiene exceso de peso (20,2 % sobrepeso y 15,9 % obesidad). Ha bajado desde el 40,6 % de 2019, pero la brecha social crece: en familias con menos de 18.000 € al año la obesidad llega al 23,6 %, frente al 10,9 % en las de más de 30.000 €.",
    "fuente": "https://www.dsca.gob.es/sites/default/files/publicaciones/estudio-aladino-2023.pdf",
    "escalas": [
     "individuo",
     "pais"
    ],
    "subtemas": [
     "prevencion"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Un tercio de los adultos no se mueve lo suficiente",
    "texto": "Según la OMS, el 31 % de los adultos del mundo (unos 1.800 millones de personas) no alcanza la actividad física recomendada, 5 puntos más que en 2010; si sigue la tendencia llegará al 35 % en 2030. Entre adolescentes, el 86 % no cumple las recomendaciones.",
    "fuente": "https://www.who.int/es/news-room/fact-sheets/detail/physical-activity",
    "escalas": [
     "individuo",
     "planeta"
    ],
    "subtemas": [
     "prevencion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "El suicidio sigue siendo una herida abierta",
    "texto": "En 2024 murieron por suicidio 3.953 personas en España (datos definitivos del INE), 163 menos que en 2023. Tres de cada cuatro eran hombres, y entre los menores de 20 años los casos subieron de 76 a 90.",
    "fuente": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/sanidad14/Paginas/2025/181225-descenso-suicidios-prevencion.aspx",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "mental"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Atención primaria con esperas de más de una semana",
    "texto": "Según el Barómetro Sanitario 2024, solo el 22,3 % de los pacientes fue atendido en atención primaria el mismo día o al día siguiente de pedir cita; el resto esperó una media de 8,7 días. La atención primaria es la puerta de entrada del sistema y su saturación retrasa la prevención y el seguimiento de enfermedades crónicas.",
    "fuente": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/sanidad14/Paginas/2025/270225-barometro-sanitario-2024.aspx",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "prevencion",
     "primaria"
    ]
   },
   {
    "ambito": "UE",
    "titulo": "El aire contaminado acorta vidas",
    "texto": "La Agencia Europea de Medio Ambiente estima que en 2022 al menos 239.000 muertes en la UE fueron atribuibles a la exposición a partículas finas (PM2,5) por encima del nivel guía de la OMS, además de unas 70.000 por ozono y 48.000 por dióxido de nitrógeno (NO2).",
    "fuente": "https://www.eea.europa.eu/en/newsroom/news/health-and-environment-impacts-of-air-pollution",
    "escalas": [
     "continente"
    ],
    "subtemas": [
     "ambiental"
    ]
   },
   {
    "ambito": "UE",
    "titulo": "Más de 110 millones de europeos viven con ruido dañino",
    "texto": "El informe «Environmental noise in Europe 2025» de la Agencia Europea de Medio Ambiente calcula que más del 20 % de la población europea (más de 110 millones de personas) está expuesta a niveles dañinos de ruido de tráfico; con los niveles de la OMS serían unos 150 millones. Se asocia a unas 66.000 muertes prematuras al año.",
    "fuente": "https://www.eea.europa.eu/en/newsroom/news/europeans-exposed-to-harmful-noise-pollution-levels/",
    "escalas": [
     "continente"
    ],
    "subtemas": [
     "mental",
     "ambiental"
    ]
   }
  ],
  "soluciones": [
   {
    "ambito": "Persona",
    "titulo": "Alimentación de patrón mediterráneo",
    "texto": "Dieta basada en verduras, legumbres, frutas, frutos secos y aceite de oliva virgen extra. El ensayo español PREDIMED (7.447 participantes, publicado en The New England Journal of Medicine en 2013 y reanalizado en 2018) mostró un 30 % menos de infartos, ictus y muertes cardiovasculares frente a una dieta baja en grasa. Su efecto en la infancia depende de que esa comida sea asequible y esté presente en comedores escolares y barrios de renta baja.",
    "supera": "Más de un tercio de los escolares con exceso de peso",
    "fuente": "https://www.wikijournalclub.org/wiki/PREDIMED",
    "escalas": [
     "individuo",
     "comunidad"
    ],
    "subtemas": [
     "prevencion",
     "comunitaria"
    ]
   },
   {
    "ambito": "Persona / atención primaria",
    "titulo": "Consejo y prescripción de actividad física desde la consulta",
    "texto": "Profesionales de atención primaria que valoran, aconsejan y derivan a programas de ejercicio supervisado. Un metaanálisis de ensayos clínicos con unas 16.000 personas (BMJ, 2022) halló que estas intervenciones aumentan las probabilidades de cumplir las recomendaciones de actividad física (odds ratio 1,33), con más efecto cuando hay cinco o más contactos; el efecto medido con dispositivos fue menor, por lo que la evidencia se considera moderada.",
    "supera": "Un tercio de los adultos no se mueve lo suficiente",
    "fuente": "https://orca.cardiff.ac.uk/id/eprint/182834/1/bmj-2021-068465.full.pdf",
    "escalas": [
     "individuo",
     "comunidad"
    ],
    "subtemas": [
     "prevencion",
     "primaria"
    ]
   },
   {
    "ambito": "Persona / escuela",
    "titulo": "Programas escolares de prevención del suicidio con eficacia probada",
    "texto": "El programa «Youth Aware of Mental Health» enseña al alumnado a reconocer el malestar y pedir ayuda. En el ensayo europeo SEYLE (11.110 adolescentes de 168 centros en 10 países de la UE, The Lancet, 2015) redujo a la mitad los nuevos intentos de suicidio y la ideación suicida grave a los 12 meses.",
    "supera": "El suicidio sigue siendo una herida abierta",
    "fuente": "https://read.qxmd.com/read/25579833/school-based-suicide-prevention-programmes-the-seyle-cluster-randomised-controlled-trial",
    "escalas": [
     "individuo",
     "comunidad"
    ],
    "subtemas": [
     "prevencion",
     "mental"
    ]
   },
   {
    "ambito": "Comunidad / sistema sanitario",
    "titulo": "Continuidad con el mismo médico de familia",
    "texto": "Que cada persona sea atendida a lo largo del tiempo por el mismo equipo de atención primaria, lo que exige plantillas suficientes y estables. Una revisión sistemática publicada en BMJ Open (2018) encontró que en 18 de 22 estudios de calidad (82 %) la continuidad asistencial se asociaba a menor mortalidad.",
    "supera": "Atención primaria con esperas de más de una semana",
    "fuente": "https://news-archive.exeter.ac.uk/2018/june/title_667526_en.html",
    "escalas": [
     "individuo",
     "comunidad",
     "pais"
    ],
    "subtemas": [
     "primaria"
    ]
   },
   {
    "ambito": "Entorno",
    "titulo": "Zonas de bajas emisiones y menos tráfico en el centro",
    "texto": "Áreas urbanas donde se restringe la entrada de los vehículos más contaminantes. Un estudio de la Universidad Complutense, la Universidad de Oviedo y la Universidad de Lisboa (revista Transportation Research; nota de prensa de 2021) mostró que Madrid Central redujo el NO2 lo suficiente para cumplir el límite anual de la UE en su estación de referencia, sin desplazar la contaminación a los barrios vecinos.",
    "supera": "El aire contaminado acorta vidas",
    "fuente": "https://www.ucm.es/fueron-eficaces-las-restricciones-de-trafico-en-madrid-para-reducir-los-niveles-de-no2",
    "escalas": [
     "comunidad",
     "pueblo"
    ],
    "subtemas": [
     "comunitaria",
     "ambiental"
    ]
   },
   {
    "ambito": "Entorno",
    "titulo": "Calles a 30 km/h y más naturaleza urbana",
    "texto": "Bajar la velocidad urbana de 50 a 30 km/h reduce el ruido en origen. En Zúrich, en 15 tramos de calle, el ruido en la fachada más expuesta bajó 1,6 dB de día y 1,7 dB de noche y disminuyó la molestia de los vecinos (Environment International, 2022). La OMS Europa recoge además que las zonas verdes urbanas reducen la exposición al ruido, la contaminación y el calor y favorecen la salud mental y la actividad física.",
    "supera": "Más de 110 millones de europeos viven con ruido dañino",
    "fuente": "https://www.pubmed.gov/36434886/",
    "escalas": [
     "individuo",
     "comunidad",
     "pueblo"
    ],
    "subtemas": [
     "prevencion",
     "mental",
     "ambiental"
    ]
   }
  ],
  "proyectos": [
   {
    "nombre": "Estrategia de Atención Comunitaria y Recomendación de Activos para la Salud",
    "lugar": "Aragón (España)",
    "tipo": "programa público (Servicio Aragonés de Salud)",
    "texto": "Desde 2018 los centros de salud pueden recomendar desde la historia clínica recursos del barrio (grupos de paseo, talleres, asociaciones) y más de 17.000 pacientes ya han recibido una recomendación. De las más de 7.000 personas con seguimiento, más del 80 % se declara satisfecha y cerca del 70 % refiere mejoras en su salud o bienestar (datos de seguimiento, no de un ensayo controlado).",
    "web": "https://atencioncomunitaria.aragon.es",
    "fuente": "https://www.redaccionmedica.com/autonomies/20261030/la-estrategia-d-atencio-comunitaria-ja-ha-beneficiat-mes-aragonesos/363930_0.html",
    "escalas": [
     "region"
    ],
    "subtemas": [
     "primaria",
     "comunitaria"
    ]
   },
   {
    "nombre": "Asturias Actúa (Observatorio de Salud en Asturias)",
    "lugar": "Asturias (España)",
    "tipo": "programa público (Consejería de Salud del Principado de Asturias)",
    "texto": "Sección del Observatorio de Salud en Asturias que recoge programas e intervenciones comunitarias de salud de toda la región, clasificados por áreas y con ficha descriptiva y contacto. El anteproyecto de ley de salud pública asturiana (2025) prevé dar rango legal al Observatorio como órgano asesor y le encarga el mapa de activos para la salud.",
    "web": "https://obsaludasturias.com",
    "fuente": "https://scielosp.org/pdf/gs/2014.v28n3/183-189/es",
    "escalas": [
     "region"
    ],
    "subtemas": [
     "comunitaria"
    ]
   },
   {
    "nombre": "Programa ACTIVA",
    "lugar": "Región de Murcia (España)",
    "tipo": "programa público (Servicio Murciano de Salud con ayuntamientos)",
    "texto": "Nacido en 2011, prescribe ejercicio físico terapéutico desde la consulta de medicina o enfermería de atención primaria a personas sedentarias con enfermedades crónicas, y lo dirigen graduados en ciencias de la actividad física y del deporte en 24 localidades. Más de 4.500 personas lo habían completado (dato de 2016); su continuidad actual está (por verificar).",
    "web": "https://www.murciasalud.es",
    "fuente": "https://www.sanidad.gob.es/areas/promocionPrevencion/entornosSaludables/local/estrategia/jornadas/docs/III_Jornada_ImplementacionLocal/Programa_Activa_Murcia.pdf",
    "escalas": [
     "region"
    ],
    "subtemas": [
     "prevencion",
     "primaria"
    ]
   },
   {
    "nombre": "PACAP – Programa de Actividades Comunitarias en Atención Primaria (semFYC)",
    "lugar": "España (ámbito estatal)",
    "tipo": "programa de una sociedad científica (Sociedad Española de Medicina de Familia y Comunitaria)",
    "texto": "Impulsa, forma y reconoce a los equipos de atención primaria que trabajan con su comunidad en promoción de la salud. Sigue activo: en abril de 2026 celebró su XXIII Encuentro en Pontevedra y entregó sus premios a proyectos comunitarios.",
    "web": "https://www.semfyc.es",
    "fuente": "https://cms.semfyc.es/storage/13224/Premios-PACAP_2026.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "primaria",
     "comunitaria"
    ]
   },
   {
    "nombre": "Escuela de Pacientes de Andalucía",
    "lugar": "Andalucía (España)",
    "tipo": "programa público (Consejería de Salud y Escuela Andaluza de Salud Pública)",
    "texto": "Desde 2008 forma a pacientes con enfermedades crónicas para que enseñen a otros pacientes y familias junto a profesionales sanitarios, con materiales sobre cáncer de mama, diabetes, EPOC, insuficiencia cardiaca y otras. Solo en el primer semestre de 2026 el Hospital Torrecárdenas (Almería) organizó 15 sesiones con 61 pacientes y 10 pacientes expertos.",
    "web": "https://escueladepacientes.es",
    "fuente": "https://www.juntadeandalucia.es/organismos/presidenciasanidadyemergencias/servicios/actualidad/noticias/detalle/677953.html",
    "escalas": [
     "region"
    ],
    "subtemas": [
     "primaria"
    ]
   },
   {
    "nombre": "Anillo Verde de Vitoria-Gasteiz",
    "lugar": "Vitoria-Gasteiz (España)",
    "tipo": "programa público municipal (Centro de Estudios Ambientales, CEA)",
    "texto": "Red de parques periurbanos (Salburua, Zadorra, Armentia, Olarizu, Zabalgana, Errekaleor) que rodea la ciudad desde los años 90 y le valió ser Capital Verde Europea en 2012. La ciudad tiene unos 46 m² de zona verde por habitante y el 76 % de la población tiene servicios deportivos, culturales, educativos o sanitarios a menos de 600 metros (diagnóstico de 2022).",
    "web": "https://cea.vitoria-gasteiz.org",
    "fuente": "https://www.eldiario.es/euskadi/vitoria-celebra-diez-anos-capitalidad-verde-europea-pone-deberes-seguir-siendolo-2030_1_9303089.html",
    "escalas": [
     "pueblo"
    ],
    "subtemas": [
     "ambiental"
    ]
   },
   {
    "nombre": "Prescripción social del NHS",
    "lugar": "Inglaterra (Reino Unido)",
    "tipo": "programa público (Servicio Nacional de Salud británico)",
    "texto": "Desde 2019 los centros de salud cuentan con más de 3.300 «link workers» (profesionales de enlace) que conectan a pacientes con recursos comunitarios; en 2023 se derivó a 1,3 millones de personas, y la proporción procedente de zonas desfavorecidas pasó del 23 % al 42 % (The Lancet Public Health, 2025). Su eficacia en salud aún no está bien demostrada: la agencia sueca de evaluación SBU (2025) no encontró revisiones sistemáticas de bajo riesgo de sesgo sobre su efecto en la soledad.",
    "web": "https://socialprescribingacademy.org.uk",
    "fuente": "https://www.ucl.ac.uk/news/2025/sep/social-prescribing-rises-sharply-among-englands-gps",
    "escalas": [
     "region"
    ],
    "subtemas": [
     "mental",
     "primaria",
     "comunitaria"
    ]
   }
  ],
  "preguntas": [
   "¿Quieres que la página de Salud incluya salud mental como bloque propio o integrada en «persona», como está ahora?",
   "La prescripción social tiene aún evidencia débil: ¿la presentamos como «prometedora, en evaluación» o prefieres dejar en Soluciones solo lo que tiene ensayos clínicos?",
   "¿Conoces algún centro de salud, grupo de paseos o programa municipal concreto (por ejemplo, de la Red Española de Ciudades Saludables, que suma 547 ayuntamientos) que quieras destacar como proyecto?",
   "¿Incluimos la sanidad como sistema (listas de espera hospitalarias, financiación, personal) o este sector se centra solo en prevención, comunidad y entorno?"
  ],
  "subtemas": [
   {
    "id": "prevencion",
    "nombre": "Prevención y hábitos"
   },
   {
    "id": "mental",
    "nombre": "Salud mental"
   },
   {
    "id": "primaria",
    "nombre": "Atención primaria"
   },
   {
    "id": "comunitaria",
    "nombre": "Salud comunitaria"
   },
   {
    "id": "ambiental",
    "nombre": "Salud ambiental"
   }
  ]
 },
 {
  "id": "vivienda",
  "nombre": "Vivienda",
  "resumen": "Hogares sanos, pueblos habitables y naturaleza accesible.",
  "ambito": "Gestión urbanística y arquitectónica del espacio del hogar, el trabajo, la infraestructura y la naturaleza.",
  "vision": {
   "escena3d": "hogar",
   "intro": "Cómo serían nuestros hogares, pueblos y espacios naturales si los diseñáramos para la vida. Comunicada a través de las bellas artes.",
   "equipo": "Un equipo humano recopila esta visión y la comunica a través del arte digital y físico para que sea accesible a todos los seres humanos. Luz & Humanidad desarrolla una herramienta única de visualización del ideal (casa, comunidad, pueblo, naturaleza): es la que se abre con el botón «Ver la visión en 3D».",
   "bloques": [
    {
     "titulo": "Hogares",
     "texto": "Hogares que se integran en la tierra y el clima del lugar: semienterrados o cubiertos de vegetación para aprovechar la inercia térmica del suelo, construidos con materiales naturales, locales y transpirables (tierra, paja, madera, piedra, cal), con bajo consumo energético y diseñados para la convivencia: espacios privados suficientes y espacios comunes generosos (cocinas, lavanderías, huertos, talleres).",
     "puntos": [
      "Materiales transpirables, saludables y no contaminantes",
      "Accesibles y de origen local",
      "Casas integradas en la tierra",
      "Materiales transpirables, sanos y de proximidad: tapial, adobe, bloque de tierra comprimida, balas de paja, madera, cal y corcho",
      "Arquitectura integrada en la tierra (casas cueva, casas de turba, viviendas semienterradas) que aprovecha la inercia térmica del terreno",
      "Diseño bioclimático y pasivo: orientación solar, ventilación cruzada, aislamiento natural y demanda energética casi nula",
      "Autosuficiencia básica: energía solar, captación de agua de lluvia, depuración natural de aguas grises y compostaje",
      "Convivencia: viviendas compactas con amplios espacios comunes (en La Borda en torno al 25 % de la superficie construida)",
      "Tenencia no especulativa: el hogar como bien de uso, no de inversión (cooperativas en cesión de uso, suelo comunitario)"
     ],
     "imagenes": [
      {
       "titulo": "Casas cueva de Guadix",
       "lugar": "Guadix, Granada (España)",
       "src": "https://upload.wikimedia.org/wikipedia/commons/5/59/Guadix_H%C3%B6hlenwohnungen.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:Guadix_H%C3%B6hlenwohnungen.jpg"
      },
      {
       "titulo": "Casa de turba de Sænautasel",
       "lugar": "Sænautasel, Islandia",
       "src": "https://upload.wikimedia.org/wikipedia/commons/d/d2/Iceland_Saenautasel_Earth_covered_home_outside.JPG",
       "fuente": "https://commons.wikimedia.org/wiki/File:Iceland_Saenautasel_Earth_covered_home_outside.JPG"
      },
      {
       "titulo": "Conjunto de casas-tierra de Peter Vetsch",
       "lugar": "Dietikon, Suiza",
       "src": "https://upload.wikimedia.org/wikipedia/commons/7/7a/Earth_house_estate.JPG",
       "fuente": "https://commons.wikimedia.org/wiki/File:Earth_house_estate.JPG"
      },
      {
       "titulo": "Earthship Brighton",
       "lugar": "Brighton, Inglaterra",
       "src": "https://upload.wikimedia.org/wikipedia/commons/b/bb/Earthship_Brighton_Front.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:Earthship_Brighton_Front.jpg"
      },
      {
       "titulo": "Casa de balas de paja revocada con barro",
       "lugar": "Swalmen, Países Bajos",
       "src": "https://upload.wikimedia.org/wikipedia/commons/f/fe/Lehmverputztes_Strohballenhaus.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:Lehmverputztes_Strohballenhaus.jpg"
      },
      {
       "titulo": "Muro de tapial",
       "lugar": "(sin ubicación concreta)",
       "src": "https://upload.wikimedia.org/wikipedia/commons/6/62/Tapialdebarro.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:Tapialdebarro.jpg"
      },
      {
       "titulo": "Vivienda de adobe en Rebollar",
       "lugar": "Rebollar, Cáceres (España)",
       "src": "https://upload.wikimedia.org/wikipedia/commons/d/dd/Viviendadeadoberebollar.JPG",
       "fuente": "https://commons.wikimedia.org/wiki/File:Viviendadeadoberebollar.JPG"
      }
     ],
     "escena3d": "hogar",
     "escalas": [
      "individuo"
     ],
     "subtemas": []
    },
    {
     "titulo": "Urbanismo",
     "texto": "Barrios a escala humana donde caminar es seguro y agradable, el coche deja de ocupar el espacio público, la naturaleza entra en la ciudad mediante vías y anillos verdes y bosques comestibles, y cada comunidad cuenta con un centro de soberanía esencial que garantiza energía, movilidad y alimento de proximidad.",
     "puntos": [
      "Seguridad peatonal",
      "Vías verdes",
      "Bosques comestibles",
      "Centro de soberanía esencial: energía, movilidad y alimento",
      "Seguridad peatonal: prioridad al peatón, calles de coexistencia y supermanzanas que liberan las calles interiores del tráfico de paso",
      "Ciudad compacta y de proximidad frente a la dispersión dependiente del coche",
      "Vías verdes y anillos verdes que conectan parques, ríos y humedales con el campo circundante",
      "Bosques comestibles y huertos comunitarios en espacios públicos",
      "Centro de soberanía esencial en cada barrio: comunidad energética solar, nodo de movilidad compartida (bici, transporte público, vehículo compartido) y abastecimiento de alimentos locales",
      "Suelo público o comunitario cedido en derecho de superficie para vivienda asequible y equipamientos"
     ],
     "imagenes": [
      {
       "titulo": "Superilles del Eixample",
       "lugar": "Barcelona (España)",
       "src": "https://upload.wikimedia.org/wikipedia/commons/1/19/Eixample_aire_cropped.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:Eixample_aire_cropped.jpg"
      },
      {
       "titulo": "Humedales de Salburua, Anillo Verde",
       "lugar": "Vitoria-Gasteiz (España)",
       "src": "https://upload.wikimedia.org/wikipedia/commons/7/7d/Vitoria_05_2012_Anillo_Verde_1922.JPG",
       "fuente": "https://commons.wikimedia.org/wiki/File:Vitoria_05_2012_Anillo_Verde_1922.JPG"
      },
      {
       "titulo": "Parque de Olarizu, Anillo Verde",
       "lugar": "Vitoria-Gasteiz (España)",
       "src": "https://upload.wikimedia.org/wikipedia/commons/a/a9/Vitoria_-_Campas_de_Ol%C3%A1rizu_01.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:Vitoria_-_Campas_de_Ol%C3%A1rizu_01.jpg"
      },
      {
       "titulo": "Bosque comestible de Robert Hart",
       "lugar": "Shropshire, Inglaterra",
       "src": "https://upload.wikimedia.org/wikipedia/commons/d/d5/Forestgarden2.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:Forestgarden2.jpg"
      }
     ],
     "escena3d": "pueblo",
     "escalas": [
      "pueblo"
     ],
     "subtemas": []
    },
    {
     "titulo": "Naturaleza",
     "texto": "Una relación cotidiana y respetuosa con la naturaleza: redes de senderos y vías verdes accesibles desde cada pueblo y ciudad, aprovechamiento sostenible del monte y de la tierra, centros de interpretación que enseñan a conocer y cuidar el territorio, y experiencias de inmersión (observatorios de fauna, baños de bosque, voluntariado ambiental).",
     "puntos": [
      "Senderos",
      "Aprovechamiento cuidadoso de los recursos",
      "Centros de interpretación",
      "Experiencias de inmersión",
      "Senderos señalizados y vías verdes sobre antiguos trazados ferroviarios que unen núcleos y espacios naturales",
      "Aprovechamiento sostenible: pastoreo, recolección, gestión forestal y agricultura regenerativa que evitan el abandono",
      "Centros de interpretación y de visitantes que divulgan los valores del territorio",
      "Experiencias de inmersión: observatorios de aves, baños de bosque, campos de trabajo y custodia del territorio",
      "Corredores ecológicos que conectan espacios protegidos con la ciudad"
     ],
     "imagenes": [
      {
       "titulo": "Sendero en el bosque del valle de Ordesa",
       "lugar": "Parque Nacional de Ordesa y Monte Perdido, Huesca (España)",
       "src": "https://upload.wikimedia.org/wikipedia/commons/5/5d/Forest_inside_Ordesa_Valley,_Ordesa_y_Monte_Perdido_National_Park,_Spain.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:Forest_inside_Ordesa_Valley,_Ordesa_y_Monte_Perdido_National_Park,_Spain.jpg"
      },
      {
       "titulo": "Vía Verde de las Vegas del Guadiana y las Villuercas",
       "lugar": "Extremadura (España)",
       "src": "https://upload.wikimedia.org/wikipedia/commons/7/7f/Camino_natural_vegas_del_guadiana_2.JPG",
       "fuente": "https://commons.wikimedia.org/wiki/File:Camino_natural_vegas_del_guadiana_2.JPG"
      },
      {
       "titulo": "Centro de visitantes El Acebuche",
       "lugar": "Parque Nacional de Doñana, Huelva (España)",
       "src": "https://upload.wikimedia.org/wikipedia/commons/4/4a/El_Acebuche_03.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:El_Acebuche_03.jpg"
      },
      {
       "titulo": "Observatorio de El Porrón",
       "lugar": "Parque Nacional de Doñana (España)",
       "src": "https://upload.wikimedia.org/wikipedia/commons/8/8b/El_Porr%C3%B3n.jpg",
       "fuente": "https://commons.wikimedia.org/wiki/File:El_Porr%C3%B3n.jpg"
      }
     ],
     "escena3d": "naturaleza",
     "escalas": [
      "provincia",
      "region"
     ],
     "subtemas": []
    }
   ],
   "arte": {
    "src": "/calendario-arte/miniaturas/mes-07-d.jpg",
    "grande": "/calendario-arte/ilustraciones/mes-07-d.jpg",
    "tema": "Hogar y Vivienda"
   }
  },
  "retos": [
   {
    "ambito": "España",
    "titulo": "El suelo se ha privatizado y parcelado de forma permanente",
    "texto": "El territorio está dividido en parcelas privadas a perpetuidad: se compra, se vende y se hereda como mercancía, aunque esté abandonado o se use en contra del bien común. La propiedad privada perpetua y fragmentada del suelo dificulta usarlo para el bien común. En Galicia, solo las 130 concentraciones parcelarias abiertas en 2016 afectaban a unas 117.000 hectáreas y a casi 92.000 propietarios, unas 1,3 ha por propietario según cálculo propio. Cuando el titular deja la tierra, nadie más puede trabajarla sin su permiso.",
    "fuente": "https://www.agronewscastillayleon.com/la-xunta-destinara-285-millones-de-euros-en-2017-para-impulsar-la-reestructuracion-de-la-propiedad/",
    "escalas": [
     "provincia",
     "pais"
    ],
    "subtemas": [
     "suelo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Precio de la vivienda desconectado de los salarios",
    "texto": "Según el Banco de España, comprar una vivienda exige de media casi siete años de renta familiar, y hasta diez en Madrid y Málaga. El esfuerzo de compra ha subido un 88,6 % desde 1980, frente a alrededor de un 10 % en la eurozona. El precio de acceso a la propiedad se ha multiplicado por 3,5 y las rentas de los hogares por 1,8.",
    "fuente": "https://roams.es/actualidad/finanzas/banco-espana-casi-7-anos-renta-necesaria-comprar-casa/",
    "escalas": [
     "individuo",
     "pais"
    ],
    "subtemas": [
     "acceso",
     "financiacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Especulación y concentración de la propiedad",
    "texto": "Las viviendas en manos de propietarios con más de 10 inmuebles pasaron de unas 138.000 en 2008 a unas 626.000 en 2025, mientras caía el peso de quienes tienen una sola vivienda (-3,7 %). El Banco de España cifra en unas 400.000 las viviendas de uso turístico o de temporada y estima un déficit de unas 750.000 viviendas.",
    "fuente": "https://www.diariodeleon.es/economia/260427/2083021/espana-deja-pais-propietarios-vivienda-pasa-grandes-tenedores.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "financiacion",
     "parque"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Casas sin gente y gente sin casa",
    "texto": "El Censo 2021 del INE contabilizó 3.837.328 viviendas vacías, el 14,4 % de un parque de 26,6 millones. Los municipios de menos de 10.000 habitantes, con el 20,3 % de la población, concentran el 45 % de esas viviendas vacías.",
    "fuente": "https://valenciaplaza.com/ine-cifra-numero-viviendas-vacias-mas-de-3-8-millones",
    "escalas": [
     "individuo",
     "pueblo",
     "pais"
    ],
    "subtemas": [
     "parque",
     "acceso"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Abandono rural y tierras abandonadas",
    "texto": "Según AVA-ASAJA, con datos de la encuesta ESYRCE del Ministerio de Agricultura, en 2023 había en España 1.037.874 hectáreas de cultivo abandonadas. La Comunitat Valenciana encabeza la lista con 173.676 ha, un récord. Las causas principales son la falta de rentabilidad y de relevo generacional.",
    "fuente": "https://alicanteplaza.es/alicanteplaza/lacomunitatvalencianabatesurecordhistoricodetierrasabandonadas173676hectareas",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "suelo",
     "urbanismo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Normativa que penaliza la bioconstrucción",
    "texto": "La tierra cruda no es un material estandarizado y solo el bloque de tierra comprimida tiene norma propia (UNE 41410). Por eso construir con tierra cumpliendo la normativa y siendo viable económicamente resulta muy difícil. En la práctica se usa sobre todo en restauraciones menores o en autopromoción, donde no se exige seguro decenal ni control técnico (OCT). La construcción con paja tampoco tiene una norma española específica (por verificar el estado actual).",
    "fuente": "https://www.certicalia.com/blog/arquitectura-de-tierra",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "construccion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Dispersión urbana dependiente del coche",
    "texto": "Entre 1987 y 2000 la superficie artificial de España creció un 29,5 %, con una tasa anual del 1,9 % frente al 0,68 % del conjunto de 23 países europeos analizados. El Observatorio de la Sostenibilidad lo atribuye en parte al 'nuevo modelo de ciudad dispersa'. El 34 % del primer kilómetro de costa mediterránea está artificializado. (Datos antiguos: por verificar una serie más reciente).",
    "fuente": "https://www.construible.es/2006/06/14/cambios-de-ocupacion-del-suelo-en-espana-implicaciones",
    "escalas": [
     "pueblo",
     "pais"
    ],
    "subtemas": [
     "urbanismo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Planeamiento lento y fragmentado",
    "texto": "El Banco de España (2025) señala trámites, normas solapadas entre administraciones y planeamiento lento como frenos a la oferta.",
    "fuente": "https://es.euronews.com/business/2026/06/18/el-banco-de-espana-senala-un-deficit-de-750000",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "suelo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Tierra rural sin relevo",
    "texto": "Solo 0,49% de los titulares agrarios tiene menos de 25 años; la tierra queda sin uso (Censo Agrario 2020).",
    "fuente": "https://maldita.es/prebunking/20260429/faltan-jovenes-en-el-campo-es-el-acceso-a-la-tierra-el-problema/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "suelo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Falta de mano de obra",
    "texto": "Más de la mitad de las constructoras tiene serias dificultades para encontrar trabajadores (Comisión Europea, 2025).",
    "fuente": "https://www.bolsamania.com/noticias_print/empresas/economia--bruselas-pide-a-espana-incrementar-su-oferta-de-vivienda-publica-y-asequible-muy-por-debajo-de-la-media-ue--19909798.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "construccion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Rehabilitar cuesta demasiado al hogar",
    "texto": "El 35,4% necesita mejoras y no las hace; el 78% de ellos por el coste (2025).",
    "fuente": "https://www.esade.edu/ecpol/wp-content/uploads/2026/07/Brief-Rehabilitacion-de-Vivienda.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "construccion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Casas vacías donde no hay demanda",
    "texto": "Unas 450.000 viviendas de la burbuja siguen desocupadas y muchas vacías están lejos de donde se necesita vivienda (Banco de España, 2025).",
    "fuente": "https://es.euronews.com/business/2026/06/18/el-banco-de-espana-senala-un-deficit-de-750000",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "parque"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Viviendas desviadas a usos temporales",
    "texto": "Unas 400.000 se usan como alquiler turístico o de temporada (Banco de España, 2025).",
    "fuente": "https://es.euronews.com/business/2026/06/18/el-banco-de-espana-senala-un-deficit-de-750000",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "parque"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Precios que crecen más que los sueldos",
    "texto": "Desde 2023 el precio subió un 30% y los salarios un 7,75%.",
    "fuente": "https://www.vozpopuli.com/economia/la-vivienda-sube-un-30-en-la-era-sin-presupuestos-con-el-gasto-estancado-en-el-05-del-pib.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "acceso"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Búsquedas sin éxito",
    "texto": "El 7,6% buscó vivienda en el último año sin lograrlo; el 67,2% por precios excesivos (INE, 2025).",
    "fuente": "https://ine.es/dyngs/Prensa/es/m3ECV2025.htm",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "acceso"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Concentración de la propiedad",
    "texto": "Los hogares con una sola vivienda cayeron un 22,4% entre 2008 y 2022 mientras crecían los grandes tenedores (2026).",
    "fuente": "https://brainsre.news/espana-propietarios-mengua-grandes-tenedores/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "financiacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Poca inversión pública",
    "texto": "Unos 7.613 M€ en 2024, apenas el 1% del gasto público total.",
    "fuente": "https://www.vozpopuli.com/economia/la-vivienda-sube-un-30-en-la-era-sin-presupuestos-con-el-gasto-estancado-en-el-05-del-pib.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "financiacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Demanda concentrada en pocas ciudades",
    "texto": "En Madrid solo el 9,9% del parque podría ampliarse, frente al 27,1% de media (Banco de España, 2025).",
    "fuente": "https://es.euronews.com/business/2026/06/18/el-banco-de-espana-senala-un-deficit-de-750000",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "urbanismo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Falta de naturaleza urbana",
    "texto": "En Valencia y Ourense casi el 80% carece de un parque grande cerca de casa (2026).",
    "fuente": "https://www.elsaltodiario.com/cambio-climatico/ciudades-espanolas-suspenden-acceso-zonas-verdes-seis-cada-diez-vecinos-carecen-ellas-cerca",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "urbanismo"
    ]
   }
  ],
  "soluciones": [
   {
    "ambito": "España",
    "titulo": "Propiedad comunitaria de la tierra con cesión de uso temporal",
    "texto": "La tierra es de la comunidad y se cede su uso a seres o comunidades mientras la utilicen de acuerdo con los valores comunes. Así se evita el abandono de tierras, el lucro por su venta y los usos no aprobados por la comunidad.",
    "supera": "Suelo privatizado y parcelado de forma permanente",
    "fuente": "https://barcelona.cat/metropolis/en/node/1743",
    "escalas": [
     "comunidad",
     "pais"
    ],
    "subtemas": [
     "suelo"
    ]
   },
   {
    "ambito": "España / Escandinavia",
    "titulo": "Cooperativas de vivienda en cesión de uso (modelo Andel)",
    "texto": "La cooperativa es siempre la propietaria del edificio y las socias tienen un derecho de uso indefinido a cambio de una aportación inicial retornable y una cuota mensual. La vivienda se trata como bien de uso, no de inversión. En Cataluña hay más de cincuenta proyectos con más de mil viviendas. El modelo nórdico Andel lleva más de un siglo funcionando: en Dinamarca supone en torno al 10 % de las viviendas y en Suecia el 35 %.",
    "fuente": "https://www.consumer.es/medio-ambiente/viviendas-colaborativas.html",
    "escalas": [
     "comunidad",
     "pais"
    ],
    "subtemas": [
     "acceso",
     "financiacion"
    ]
   },
   {
    "ambito": "Internacional / Barcelona",
    "titulo": "Community Land Trust (fideicomiso comunitario de suelo)",
    "texto": "Una entidad sin ánimo de lucro conserva la propiedad del suelo a perpetuidad y vende o alquila los edificios con cláusulas de asequibilidad permanente. La gobernanza se reparte a partes iguales entre administración, comunidad del entorno y residentes. En 2020 Barcelona firmó un acuerdo inspirado en los CLT para unas 1.000 viviendas (40 % en cooperativa, 60 % en alquiler asequible) sobre suelo municipal con arrendamiento de larga duración.",
    "fuente": "https://www.housingeurope.eu/barcelona-launches-its-first-clt-inspired-housing-initiative/",
    "escalas": [
     "comunidad",
     "pueblo",
     "provincia",
     "planeta"
    ],
    "subtemas": [
     "suelo",
     "acceso"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Bancos de tierras y movilización de tierra abandonada",
    "texto": "Son instrumentos públicos que ponen en contacto a propietarios de fincas sin uso con personas que quieren trabajarlas, mediante arrendamientos o cesiones. Galicia cuenta además con la Ley 11/2021 de recuperación de la tierra agraria, que crea polígonos agroforestales, aldeas modelo y agrupaciones de gestión conjunta. En su convocatoria de 2021 recibió cerca de 1.000 solicitudes para unas 21.400 hectáreas.",
    "fuente": "https://www.xunta.gal/es/hemeroteca/-/nova/128920/feijoo-constata-gran-demanda-tierra-que-existe-galicia-con-cerca-1-000-solicitudes",
    "escalas": [
     "provincia",
     "pais"
    ],
    "subtemas": [
     "suelo"
    ]
   },
   {
    "ambito": "España (Cataluña)",
    "titulo": "Masovería urbana",
    "texto": "La persona propietaria cede una vivienda vacía y los ocupantes asumen su rehabilitación y mantenimiento en lugar de pagar renta, o pagando una renta reducida. Está recogida en la Ley catalana 18/2007 del derecho a la vivienda, Barcelona ha facilitado acuerdos en Sarrià, Sants y el Eixample, y Cardona aprobó en 2024 un reglamento municipal. No existe ley estatal específica.",
    "fuente": "https://www.infobae.com/espana/2025/06/24/pagar-el-alquiler-con-reformas-y-mantenimiento-la-masoveria-urbana-un-modelo-de-vivienda-que-beneficia-al-inquilino-y-al-propietario/",
    "escalas": [
     "pueblo",
     "region",
     "pais"
    ],
    "subtemas": [
     "parque",
     "construccion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Derecho de superficie sobre suelo público",
    "texto": "La administración conserva la propiedad del suelo y cede el derecho a construir y usar por un plazo máximo de 99 años (art. 53 del TR de la Ley de Suelo, RDL 7/2015). Al terminar, lo edificado revierte al propietario del suelo. Es la base jurídica de proyectos como La Borda, sobre solar municipal cedido por 75 años, y evita que el suelo público se privatice.",
    "fuente": "https://www.boe.es/eli/es/rdlg/2015/10/30/7",
    "escalas": [
     "pueblo",
     "provincia",
     "pais"
    ],
    "subtemas": [
     "suelo",
     "financiacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Bioconstrucción y adaptación normativa",
    "texto": "Se propone desarrollar normas técnicas, documentos de idoneidad y guías para tierra (tapial, adobe, BTC) y paja, de modo que puedan cumplir el Código Técnico y ser asegurables. El propio CTE ya obliga a calcular el potencial de calentamiento global del edificio en su ciclo de vida, lo que favorece a los materiales de bajo carbono incorporado. Se están desarrollando paneles prefabricados de paja y madera con certificación Passivhaus.",
    "fuente": "https://www.interempresas.net/Madera/651121-paja-madera-regresan-construccion-transformar-sector-sumidero-carbono-reducir-impacto.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "construccion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Bancos de tierras municipales",
    "texto": "Registran parcelas abandonadas y conectan propietarios con quien busca tierra; Red Terrae lo hace desde 2010 en unos 40 municipios.",
    "fuente": "https://accesstoland.gitbook.io/makingfarmlandwork/case-studies/red-terrae-the-network-of-municipalities-working-for-sustainable-land-use",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "suelo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Suelo público cedido, no vendido",
    "texto": "Barcelona cedió el solar de La Borda a una cooperativa: el suelo sigue siendo público y la vivienda, asequible.",
    "fuente": "https://www.construible.es/2018/10/16/barcelona-acoge-primer-proyecto-covivienda-edificio-sostenible-madera-consumo",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "suelo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Vivienda industrializada",
    "texto": "El PERTE dedica 1.300 M€ en 10 años a fabricar 15.000-20.000 viviendas al año en fábrica.",
    "fuente": "https://www.lamoncloa.gob.es/consejodeministros/resumenes/Documents/2025/060525-PERTE-%20RESUMEN%20EJECUTIVO.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "construccion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Rehabilitación por barrios con oficina local",
    "texto": "Euskadi gestiona la reforma de edificios enteros desde oficinas de barrio (Opengela), con ayudas y trámites unificados.",
    "fuente": "https://www.euskadi.eus/gobierno-vasco/-/noticia/2025/ana-telleria-gobierno-vasco-ha-demostrado-que-es-posible-regenerar-barrios-vulnerables-enfoque-integral-y-justo/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "construccion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Alquiler garantizado de pisos vacíos",
    "texto": "Bizigune (Euskadi): el propietario cede su piso vacío al Gobierno Vasco, que lo alquila a precio protegido y le garantiza la renta.",
    "fuente": "https://www.euskadi.eus/gobierno-vasco/-/si-tienes-tu-vivienda-vacia/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "parque"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Parque público permanente",
    "texto": "Viena tiene unas 220.000 viviendas municipales y el 60% vive en vivienda social o subvencionada.",
    "fuente": "https://brainsre.news/viena-concentra-60-poblacion-vivienda-social/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "parque"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Empresa pública de vivienda",
    "texto": "CASA47 invertirá 13.000 M€ en 10 años en alquiler asequible: ningún alquiler superará el 30% de la renta media de la zona.",
    "fuente": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/vivienda-agenda-urbana/Paginas/2026/solicitud-casa-47.aspx",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "acceso"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Cooperativas en cesión de uso",
    "texto": "En Cataluña ya hay más de 500 pisos: la cooperativa es dueña y los socios tienen uso indefinido sin especular.",
    "fuente": "https://www.publico.es/economia/vivienda-cooperativa-consolida-catalunya-500-pisos-edificados.amp.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "acceso"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Protección pública permanente",
    "texto": "El Plan Estatal 2026-2030 exige que la vivienda protegida financiada siga siempre en el parque público.",
    "fuente": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/vivienda-agenda-urbana/Paginas/2025/plan-estatal-de-vivienda-2026-2030.aspx",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "financiacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Banca ética para cooperativas",
    "texto": "En Cataluña la vivienda cooperativa se financia con banca ética y el Institut Català de Finances.",
    "fuente": "https://www.publico.es/economia/vivienda-cooperativa-consolida-catalunya-500-pisos-edificados.amp.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "financiacion"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Ciudad para el peatón",
    "texto": "Pontevedra peatonalizó su centro desde 1999: el comercio creció un 7% y lleva más de una década sin muertes por atropello.",
    "fuente": "https://es.euronews.com/2022/09/16/la-premiada-transformacion-de-pontevedra-en-favor-de-la-peatonalizacion-y-la-mejora-de-la-",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "urbanismo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Repoblar el medio rural",
    "texto": "El 79% de los municipios pequeños tuvo saldo migratorio positivo en 2018-2024, prueba de que el campo puede atraer población.",
    "fuente": "https://www.miteco.gob.es/es/prensa/ultimas-noticias/2025/diciembre/la-poblacion-del-medio-rural-crece-en-espana-por-septimo-ano-con.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "urbanismo"
    ]
   }
  ],
  "proyectos": [
   {
    "nombre": "Comunidad Mapunchi",
    "lugar": "Por confirmar",
    "tipo": "Cesión de uso vitalicio",
    "texto": "Comunidad con cesión de uso vitalicio de la vivienda y la tierra. (Ubicación y web por confirmar con el equipo.)",
    "web": null,
    "fuente": null,
    "escalas": [
     "comunidad"
    ],
    "subtemas": [
     "suelo",
     "construccion"
    ]
   },
   {
    "nombre": "Entrepatios – Las Carolinas",
    "lugar": "Barrio de Las Carolinas, Usera, Madrid",
    "tipo": "cooperativa de vivienda en cesión de uso (derecho de uso) / cohousing ecosocial",
    "texto": "Es un edificio de 17 viviendas construido completamente en madera, con paneles solares y recuperación de agua de lluvia, y se presenta como el primer edificio de viviendas ecológico de este tipo en España. Las familias entraron hacia mediados de 2021. Se pagó una entrada de 30.000 a 50.000 € (en torno al 20 % del coste), que se devuelve al salir, más una cuota mensual muy por debajo del mercado. Arquitecto: Iñaki Alonso (sAtt). Financiación de Triodos Bank y Fiare Banca Ética. El barrio (Usera) está por verificar.",
    "web": "https://www.entrepatios.org",
    "fuente": "https://arquitecturaviva.com/articulos/el-edificio-de-viviendas-donde-reina-el-derecho-de-uso",
    "escalas": [
     "comunidad"
    ],
    "subtemas": [
     "acceso",
     "construccion"
    ]
   },
   {
    "nombre": "La Borda",
    "lugar": "C/ Constitució 85-89, La Bordeta (Sants-Montjuïc), Barcelona",
    "tipo": "cooperativa de vivienda en cesión de uso sobre suelo público (derecho de superficie 75 años)",
    "texto": "Tiene 28 viviendas en seis plantas, en el límite del recinto de Can Batlló. Se construyó entre 2017 y 2018, aunque el proceso comenzó en 2012. La estructura es de madera contralaminada (CLT) y es el edificio de madera laminada más alto de España. Los espacios comunes ocupan alrededor del 25 % de la superficie: cocina comunitaria de 80 m², sala polivalente, habitaciones de invitados, lavandería y terrazas. Arquitectura: Lacol.",
    "web": "https://www.laborda.coop",
    "fuente": "https://www.metalocus.es/es/noticias/decidir-en-comunidad-cooperativa-de-vivienda-la-borda-por-lacol-arquitectura-cooperativa",
    "escalas": [
     "comunidad"
    ],
    "subtemas": [
     "acceso",
     "construccion"
    ]
   },
   {
    "nombre": "Sostre Cívic",
    "lugar": "Cataluña (sede en Barcelona)",
    "tipo": "cooperativa promotora de vivienda en cesión de uso (modelo Andel)",
    "texto": "Nació como asociación en 2004 y se constituyó como cooperativa en 2010. Su web indica más de 1.000 socias. Las cifras de proyectos y viviendas varían según la fuente: 17 proyectos y 86 viviendas habitadas en su página institucional, frente a unos 25 proyectos y más de 500 viviendas según el Ayuntamiento de Barcelona. Entre sus proyectos están Princesa49, La Balma, Walden XXI, Cirerers, La Voliana y La Corrala. También compra edificios mediante el derecho de tanteo.",
    "web": "https://www.sostrecivic.coop",
    "fuente": "https://sostrecivic.coop/es/who-we-are/?lang=en",
    "escalas": [
     "comunidad",
     "pueblo"
    ],
    "subtemas": [
     "acceso",
     "financiacion"
    ]
   },
   {
    "nombre": "Cal Cases",
    "lugar": "Masía en Santa Maria d'Oló (Moianès, Barcelona)",
    "tipo": "cooperativa de vivienda en cesión de uso rural",
    "texto": "Se considera la primera cooperativa en cesión de uso de Cataluña. Se inició hacia 2008 en una masía con espacios comunes y módulos privados de unos 40-50 m² por familia. En 2011 vivían allí 20 adultos y 11 niños, con funcionamiento asambleario y abastecimiento como cooperativa de consumo ecológico. En 2009 acogió el II Encuentro de la Red de Construcción con Paja. La comarca (Moianès) es dato propio por verificar.",
    "web": null,
    "fuente": "https://naciodigital.cat/manresa/societat/quedem-va-visitar-la-cooperativa-dhabitatges-cal-cases.html",
    "escalas": [
     "comunidad",
     "provincia"
    ],
    "subtemas": [
     "suelo",
     "acceso"
    ]
   },
   {
    "nombre": "La Raval",
    "lugar": "Plaça de l'Hospital 10, centro histórico de Manresa",
    "tipo": "cooperativa de vivienda en cesión de uso",
    "texto": "La impulsaron sus propias socias con apoyo de La Dinamo y se terminó en 2024. La arquitectura es de Lacol. Es un ejemplo de cooperativa en cesión de uso que regenera un casco histórico. Número de viviendas: por verificar. (Se incluye como alternativa porque no se pudo identificar «Matriu»).",
    "web": null,
    "fuente": "https://www.metalocus.es/es/noticias/habitar-los-espacios-compartidos-la-raval-por-lacol",
    "escalas": [
     "comunidad"
    ],
    "subtemas": [
     "suelo",
     "acceso"
    ]
   },
   {
    "nombre": "Champlain Housing Trust",
    "lugar": "Burlington, Vermont (EE. UU.)",
    "tipo": "Community Land Trust",
    "texto": "Es el mayor Community Land Trust de Estados Unidos. Sus organizaciones predecesoras se fundaron en 1984 con apoyo del Ayuntamiento de Burlington y se fusionaron en 2006. Recibió el World Habitat Award en 2008. Según su informe anual de 2025, gestiona 2.929 apartamentos asequibles y más de 700 viviendas (706) en propiedad compartida, en las que el suelo queda en el fideicomiso y la asequibilidad es permanente.",
    "web": "https://www.getahome.org",
    "fuente": "https://www.getahome.org/wp-content/uploads/CHT-Annual-Report-2025.pdf",
    "escalas": [
     "pueblo"
    ],
    "subtemas": [
     "suelo",
     "acceso"
    ]
   },
   {
    "nombre": "Comunidad Circular Humana (Luz & Humanidad)",
    "lugar": "Diseño",
    "tipo": "Proyecto propio · cesión vitalicia",
    "texto": "Diseño biomimético: 10 familias por comunidad en cesión vitalicia y heredable, espacio común productivo y ciclo de 4 generaciones. Se puede ver en el visor 3D (escala «Comunidad»).",
    "web": null,
    "fuente": null,
    "escalas": [
     "comunidad",
     "pueblo"
    ],
    "subtemas": [
     "suelo",
     "urbanismo"
    ]
   },
   {
    "nombre": "Red Terrae",
    "lugar": "España (≈40 municipios, 8 comunidades)",
    "tipo": null,
    "texto": "Red de ayuntamientos con bancos de tierras agroecológicos para frenar el abandono rural.",
    "web": "https://accesstoland.gitbook.io/makingfarmlandwork/case-studies/red-terrae-the-network-of-municipalities-working-for-sustainable-land-use",
    "fuente": null,
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "suelo"
    ]
   },
   {
    "nombre": "Opengela",
    "lugar": "Euskadi",
    "tipo": null,
    "texto": "Programa público de regeneración integral de barrios vulnerables con oficinas de barrio.",
    "web": "https://www.euskadi.eus/gobierno-vasco/-/noticia/2025/ana-telleria-gobierno-vasco-ha-demostrado-que-es-posible-regenerar-barrios-vulnerables-enfoque-integral-y-justo/",
    "fuente": null,
    "escalas": [
     "pais",
     "planeta"
    ],
    "subtemas": [
     "construccion"
    ]
   },
   {
    "nombre": "Bizigune",
    "lugar": "Euskadi",
    "tipo": null,
    "texto": "Programa público que moviliza viviendas vacías hacia alquiler protegido.",
    "web": "https://www.euskadi.eus/gobierno-vasco/-/si-tienes-tu-vivienda-vacia/",
    "fuente": null,
    "escalas": [
     "pais",
     "planeta"
    ],
    "subtemas": [
     "parque"
    ]
   },
   {
    "nombre": "Vivienda social de Viena",
    "lugar": "Viena (Austria)",
    "tipo": null,
    "texto": "Parque municipal y cooperativo donde vive el 60% de la población.",
    "web": "https://brainsre.news/viena-concentra-60-poblacion-vivienda-social/",
    "fuente": null,
    "escalas": [
     "pais",
     "planeta"
    ],
    "subtemas": [
     "parque"
    ]
   },
   {
    "nombre": "CASA47",
    "lugar": "España",
    "tipo": null,
    "texto": "Entidad pública estatal para crear un parque de alquiler asequible de larga duración.",
    "web": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/vivienda-agenda-urbana/Paginas/2026/solicitud-casa-47.aspx",
    "fuente": null,
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "acceso"
    ]
   },
   {
    "nombre": "Plan Estatal de Vivienda 2026-2030",
    "lugar": "España",
    "tipo": null,
    "texto": "7.000 M€ entre Estado (60%) y comunidades (40%) para vivienda asequible y rehabilitación.",
    "web": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/vivienda-agenda-urbana/Paginas/2025/plan-estatal-de-vivienda-2026-2030.aspx",
    "fuente": null,
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "financiacion"
    ]
   },
   {
    "nombre": "Modelo urbano de Pontevedra",
    "lugar": "Pontevedra",
    "tipo": null,
    "texto": "Centro peatonal y velocidad de 10 km/h que devolvió la calle a los vecinos.",
    "web": "https://es.euronews.com/2022/09/16/la-premiada-transformacion-de-pontevedra-en-favor-de-la-peatonalizacion-y-la-mejora-de-la-",
    "fuente": null,
    "escalas": [
     "pais",
     "planeta"
    ],
    "subtemas": [
     "urbanismo"
    ]
   }
  ],
  "preguntas": [
   "¿Dónde está la Comunidad Mapunchi y cómo funciona exactamente su cesión de uso vitalicio? ¿Tienes web o contacto?",
   "Entre Patios: ¿es Entrepatios (Madrid) u otro proyecto? ¿Cuál de sus promociones quieres destacar?",
   "¿Qué casas reales integradas en la tierra quieres mostrar como ejemplo principal (cuevas de Guadix, Villa Vals, Earthship…)?",
   "¿La solución de propiedad comunitaria debe proponerse a escala municipal, comarcal o estatal?",
   "¿Qué personas o artistas forman el equipo que comunica la visión de Vivienda?"
  ],
  "subtemas": [
   {
    "id": "suelo",
    "nombre": "Suelo"
   },
   {
    "id": "construccion",
    "nombre": "Construcción y rehabilitación"
   },
   {
    "id": "parque",
    "nombre": "Parque de viviendas"
   },
   {
    "id": "acceso",
    "nombre": "Acceso"
   },
   {
    "id": "financiacion",
    "nombre": "Financiación"
   },
   {
    "id": "urbanismo",
    "nombre": "Arquitectura y urbanismo"
   }
  ]
 },
 {
  "id": "alimentacion",
  "nombre": "Alimentación",
  "resumen": "Comida sana, de temporada y cercana para todas las personas, cultivada por un campo vivo que cuida el suelo.",
  "ambito": "Todo el camino de los alimentos: cómo se cultivan y crían, quién trabaja la tierra, cómo llegan a la mesa, qué comemos en casa y en los comedores, y qué hacemos con lo que sobra.",
  "vision": {
   "escena3d": "comunidad",
   "intro": "Imaginamos un mundo en el que nadie pase hambre ni coma mal por falta de dinero, y en el que cada comida cuente una historia de suelo fértil, agua limpia y personas que viven dignamente del campo. Huertos en casas y barrios, mercados llenos de productos de temporada y pueblos con gente joven que cultiva: la alimentación como cuidado de la salud y de la tierra.",
   "equipo": "Un equipo humano recopila esta visión y la comunica a través del arte digital y físico para que sea accesible a todos los seres humanos. El botón «Ver la visión en 3D» abre la herramienta de visualización del ideal de Luz & Humanidad.",
   "bloques": [
    {
     "titulo": "El huerto y la cocina de casa",
     "texto": "Comer bien empieza en la cocina: alimentos frescos y de temporada, recetas sencillas y nada que acabe en la basura. Quien tiene un balcón, un patio o una parcela puede cultivar parte de lo que come y aprender así de dónde vienen los alimentos.",
     "puntos": [
      "Dieta basada en verduras, frutas, legumbres y cereales integrales, al estilo de la dieta mediterránea",
      "Huertos en balcones, patios y terrazas, y compost con los restos de cocina",
      "Compras planificadas y aprovechamiento de sobras: cero desperdicio en casa",
      "Menos ultraprocesados y menos carne, pero de mejor calidad",
      "Cocinar y comer en familia como momento de salud y convivencia",
      "Ningún hogar sin poder permitirse una dieta sana"
     ],
     "imagenes": [],
     "escena3d": "hogar",
     "escalas": [
      "individuo"
     ],
     "subtemas": [
      "huerto",
      "desperdicio"
     ]
    },
    {
     "titulo": "La comunidad: huertos, grupos de consumo y comedores",
     "texto": "Los barrios y pueblos se organizan para comer mejor juntos: huertos comunitarios, bosques comestibles en parques públicos y grupos de consumo que compran directamente a quien cultiva. Los comedores de escuelas, hospitales y residencias cocinan con productos frescos, ecológicos y de la zona.",
     "puntos": [
      "Huertos urbanos comunitarios en solares y parques, gestionados por las propias vecinas y vecinos",
      "Bosques comestibles: árboles frutales, arbustos y hierbas en espacios públicos para recolectar libremente",
      "Grupos de consumo y cestas semanales que pagan un precio justo a quien produce (agricultura sostenida por la comunidad)",
      "Comedores escolares con cocina propia, menús de temporada y alimentos ecológicos y locales",
      "Recuperación de excedentes y cocinas comunitarias para que la comida sobrante llegue a quien la necesita",
      "Escuelas donde el alumnado cultiva, cocina y aprende sobre nutrición"
     ],
     "imagenes": [],
     "escena3d": "comunidad",
     "escalas": [
      "comunidad"
     ],
     "subtemas": [
      "huerto",
      "consumo",
      "desperdicio",
      "comedores"
     ]
    },
    {
     "titulo": "El territorio: soberanía alimentaria y campo vivo",
     "texto": "Cada comarca produce buena parte de lo que come, con una agricultura y una ganadería que regeneran el suelo, ahorran agua y protegen la biodiversidad. La tierra está al alcance de quien quiere cultivarla y vivir del campo es un proyecto de vida atractivo para la gente joven.",
     "puntos": [
      "Agroecología: cultivos que cuidan el suelo, la biodiversidad y el agua, con pocos insumos químicos",
      "Bancos de tierras que ponen las fincas abandonadas en manos de nuevas personas agricultoras",
      "Relevo generacional: acceso a tierra, formación y vivienda para la gente joven que quiere quedarse en el campo",
      "Mercados locales y de productores en cada pueblo y barrio, con precios justos para ambas partes",
      "Semillas y razas locales conservadas y compartidas",
      "Suelos sanos y vivos, vigilados y cuidados como un bien común"
     ],
     "imagenes": [],
     "escena3d": "pueblo",
     "escalas": [
      "provincia",
      "region"
     ],
     "subtemas": [
      "consumo",
      "campo"
     ]
    }
   ],
   "arte": {
    "src": "/calendario-arte/miniaturas/mes-10-d.jpg",
    "grande": "/calendario-arte/ilustraciones/mes-10-d.jpg",
    "tema": "Alimentación"
   }
  },
  "retos": [
   {
    "ambito": "España",
    "titulo": "Comida que acaba en la basura",
    "texto": "En 2024 los hogares españoles tiraron unos 1.097 millones de kilos o litros de alimentos y bebidas, 23,6 kg por persona. Es un 4,3 % menos que en 2023, pero más de tres cuartas partes son productos que se compraron y nunca se usaron.",
    "fuente": "https://www.madridactual.es/images/documentos/informe-del-desperdicio-alimentario-en-espana-2024--mapa--.pdf",
    "escalas": [
     "individuo",
     "pais"
    ],
    "subtemas": [
     "huerto",
     "desperdicio"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Un campo envejecido sin relevo",
    "texto": "Según el Censo Agrario 2020, el 41 % de las personas al frente de una explotación agraria tiene más de 65 años y solo alrededor del 8 % tiene 40 años o menos. La tierra es cara y difícil de conseguir: la hectárea costaba de media 10.248 euros en 2024.",
    "fuente": "https://mapa.gob.es/en/ministerio/servicios/analisis-y-prospectiva/informemapa_ca2020_tcm38-653742.pdf",
    "escalas": [
     "provincia",
     "pais"
    ],
    "subtemas": [
     "campo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Cada vez menos explotaciones",
    "texto": "Entre 2009 y 2020 España perdió casi 75.000 explotaciones agrarias, un 7,6 % (de 989.796 a 914.871), y el propio Ministerio advierte de que la caída real de las pequeñas fue mayor. Con cada explotación que cierra se pierden empleo, paisaje y producción cercana.",
    "fuente": "https://www.INE.es/prensa/cea_2020.pdf",
    "escalas": [
     "provincia",
     "pais"
    ],
    "subtemas": [
     "campo"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Exceso de peso infantil, ligado a la renta",
    "texto": "En 2023 el 36,1 % de los escolares de 6 a 9 años tenía exceso de peso (20,2 % sobrepeso y 15,9 % obesidad). En los hogares con menos de 18.000 euros al año la cifra sube al 46,7 %, frente al 29,2 % en los de más de 30.000 euros.",
    "fuente": "https://www.dsca.gob.es/sites/default/files/publicaciones/estudio-aladino-2023.pdf",
    "escalas": [
     "individuo",
     "pais"
    ],
    "subtemas": [
     "huerto",
     "comedores"
    ]
   },
   {
    "ambito": "UE",
    "titulo": "Suelos agotados",
    "texto": "Se calcula que entre el 60 % y el 70 % de los suelos de la Unión Europea no están sanos. Su degradación cuesta al menos 50.000 millones de euros al año, según la Comisión Europea (2025).",
    "fuente": "https://www.europarl.europa.eu/news/en/press-room/20251017IPR31009/soil-monitoring-parliament-adopts-new-eu-law-with-better-support-for-farmers",
    "escalas": [
     "provincia",
     "continente"
    ],
    "subtemas": [
     "campo"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Hambre y dietas sanas inalcanzables",
    "texto": "En 2024 unos 673 millones de personas (el 8,2 % de la humanidad) pasaron hambre, y 2.600 millones no podían permitirse una dieta saludable. En África el hambre siguió creciendo y ya afecta a más del 20 % de la población.",
    "fuente": "https://www.who.int/news/item/28-07-2025-global-hunger-declines-but-rises-in-africa-and-western-asia-un-report",
    "escalas": [
     "planeta"
    ],
    "subtemas": [
     "huerto",
     "hambre"
    ]
   }
  ],
  "soluciones": [
   {
    "ambito": "España",
    "titulo": "Prevenir el desperdicio y redistribuir los excedentes",
    "texto": "La Ley 1/2025 obliga a la cadena alimentaria a tener planes de prevención, a priorizar el consumo humano (donación, transformación) antes que el reciclaje y, en los restaurantes, a dejar llevarse las sobras; las obligaciones de planes y donación rigen desde abril de 2026. Entidades como Espigoladors llevan desde 2014 recuperando en el campo cosechas que se perderían.",
    "supera": "Comida que acaba en la basura",
    "fuente": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/agricultura/Paginas/2025/020425-ley-desperdicio-alimentos.aspx",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "consumo",
     "campo",
     "desperdicio"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Bancos de tierras",
    "texto": "Conectan fincas sin uso con personas que quieren cultivarlas, dando confianza a ambas partes. El banco del Parque Agrario de la Conca d'Òdena (Barcelona) ofrecía 226 hectáreas en julio de 2025, un 36 % más en seis semanas, y el Ministerio de Agricultura anunció en 2026 el programa estatal Tierra Joven (despliegue por verificar).",
    "supera": "Un campo envejecido sin relevo",
    "fuente": "https://bcnagraria.diba.cat/en/land-banks",
    "escalas": [
     "provincia",
     "pais"
    ],
    "subtemas": [
     "campo"
    ]
   },
   {
    "ambito": "Comunidad",
    "titulo": "Agricultura sostenida por la comunidad y canales cortos",
    "texto": "Las familias se comprometen a comprar la cosecha de una huerta durante todo el año con una cuota fija, lo que da a quien cultiva un ingreso estable y sin intermediarios. En la CSA Vega de Jarama (Madrid) las cuotas de unas 140 familias sostienen los sueldos de sus trabajadores, y otra iniciativa madrileña pasó de 2 a 5 empleos rurales en siete años.",
    "supera": "Cada vez menos explotaciones",
    "fuente": "https://www.mercasa.es/wp-content/uploads/2022/10/08_Produccion-y-consumo-agroecologicos-y-su-compromiso-con-el-medio-rural.pdf",
    "escalas": [
     "individuo",
     "comunidad"
    ],
    "subtemas": [
     "consumo",
     "campo"
    ]
   },
   {
    "ambito": "Comunidad",
    "titulo": "Comedores públicos ecológicos con cocina propia",
    "texto": "Copenhague sirve unas 115.000 comidas diarias en más de 1.000 cocinas públicas con cerca del 88 % de alimentos ecológicos, cocinando desde cero, con menús de temporada y menos carne, sin aumentar el presupuesto. Ha reducido además un 32 % las emisiones de CO2 de sus menús.",
    "supera": "Exceso de peso infantil, ligado a la renta",
    "fuente": "https://www.milanurbanfoodpolicypact.org/wp-content/uploads/2025/10/COPENHAGEN_Implementing-Food-Policies_MPA2025.pdf",
    "escalas": [
     "comunidad"
    ],
    "subtemas": [
     "huerto",
     "comedores"
    ]
   },
   {
    "ambito": "UE",
    "titulo": "Vigilar y regenerar los suelos",
    "texto": "La primera ley europea de suelos (2025) fija el objetivo de suelos sanos en 2050, obliga a los países a medir su salud con criterios comunes y a ayudar a agricultores y silvicultores a mejorarlos. Las prácticas agroecológicas (cubiertas vegetales, rotaciones, compost) son la vía para lograrlo; su efecto en España está por medir con estos nuevos datos.",
    "supera": "Suelos agotados",
    "fuente": "https://www.europarl.europa.eu/news/en/press-room/20251017IPR31009/soil-monitoring-parliament-adopts-new-eu-law-with-better-support-for-farmers",
    "escalas": [
     "provincia",
     "continente"
    ],
    "subtemas": [
     "campo"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Protección social y comedores escolares",
    "texto": "La FAO atribuye la bajada del hambre en Sudamérica a la combinación de transferencias de dinero, comedores escolares y más productividad agraria, como en Brasil y México. A escala mundial el hambre bajó del 8,7 % en 2022 al 8,2 % en 2024.",
    "supera": "Hambre y dietas sanas inalcanzables",
    "fuente": "https://www.fao.org/newsroom/detail/beating-hunger-through-social-protection--investments-and-resilience--fao-chief-economist/en",
    "escalas": [
     "provincia",
     "planeta"
    ],
    "subtemas": [
     "huerto",
     "campo",
     "comedores",
     "hambre"
    ]
   }
  ],
  "proyectos": [
   {
    "nombre": "BAH! Bajo el Asfalto está la Huerta",
    "lugar": "Madrid y Perales de Tajuña",
    "tipo": "Cooperativa agroecológica de producción y consumo",
    "texto": "Nacida hacia 1999, reúne a personas que cultivan y personas que consumen en huertas periurbanas, con asambleas mensuales. En 2024 la cuota era de 70 euros al mes por una cesta semanal de al menos cinco productos de temporada.",
    "web": "https://bahperales.org",
    "fuente": "https://lamarea.com/2024/03/14/las-canastas-de-verduras-de-la-militancia-a-una-necesidad",
    "escalas": [
     "pueblo"
    ],
    "subtemas": [
     "consumo",
     "campo"
    ]
   },
   {
    "nombre": "Fundació Espigoladors",
    "lugar": "El Prat de Llobregat, Barcelona",
    "tipo": "Fundación / empresa social",
    "texto": "Desde 2014 recupera en el campo frutas y verduras que se perderían, con recolectas solidarias, y las transforma bajo su marca imperfect®. Participa en La Botiga, el servicio municipal de garantía alimentaria de El Prat.",
    "web": "https://espigoladors.cat",
    "fuente": "https://abd.ong/wp-content/uploads/2025/12/Mapeo-de-buenas-propuestas-sociales-en-comunidades-agroalimentarias-en-Espana.-2.pdf",
    "escalas": [
     "pueblo"
    ],
    "subtemas": [
     "campo",
     "desperdicio"
    ]
   },
   {
    "nombre": "Banco de tierras del Parque Agrario de la Conca d'Òdena",
    "lugar": "Conca d'Òdena, Barcelona",
    "tipo": "Programa público (Diputació de Barcelona)",
    "texto": "Forma parte de la red de bancos de tierras de la Diputació de Barcelona, que en enero de 2025 había aumentado un 30 % su superficie. En julio de 2025 ofrecía 226 hectáreas para uso agrícola y ganadero.",
    "web": "https://bcnagraria.diba.cat/en/land-banks",
    "fuente": "https://bcnagraria.diba.cat/en/land-banks",
    "escalas": [
     "provincia"
    ],
    "subtemas": [
     "campo"
    ]
   },
   {
    "nombre": "Red Terrae",
    "lugar": "España (unos 40 municipios de 8 comunidades autónomas)",
    "tipo": "Red intermunicipal",
    "texto": "Creada en 2010, ayuda a los ayuntamientos a montar bancos de tierras agroecológicos que conectan fincas infrautilizadas con personas que quieren producir alimentos. Ha devuelto al cultivo tierras abandonadas, aunque no publica cifras globales de hectáreas (por verificar).",
    "web": null,
    "fuente": "https://accesstoland.gitbook.io/makingfarmlandwork/case-studies/red-terrae-the-network-of-municipalities-working-for-sustainable-land-use",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "campo"
    ]
   },
   {
    "nombre": "Programa municipal de huertos urbanos comunitarios",
    "lugar": "Madrid",
    "tipo": "Programa público con gestión vecinal",
    "texto": "Desde 2014 el Ayuntamiento cede gratis parcelas de unos 1.000 m² a asociaciones vecinales, que las cultivan con prácticas agroecológicas; empezó con 17 huertos y en 2019 superaba los 55. En noviembre de 2025 autorizó 8 huertos más.",
    "web": "https://madrid.es/go/huertosurbanoscomunitarios",
    "fuente": "https://diario.madrid.es/huertos/programa-municipal-de-huertos-urbanos-comunitarios/",
    "escalas": [
     "comunidad",
     "pueblo"
    ],
    "subtemas": [
     "huerto",
     "campo"
    ]
   },
   {
    "nombre": "Guía Slow Food Barcelona",
    "lugar": "Barcelona",
    "tipo": "Asociación (Slow Food Barcelona)",
    "texto": "Su séptima edición, presentada en noviembre de 2025, reúne 100 restaurantes, bares y heladerías comprometidos con el producto local, la biodiversidad y la gastronomía responsable. Treinta tienen el distintivo del caracol Slow Food por su apuesta por los productores de la zona.",
    "web": "https://slowfoodguide.barcelona",
    "fuente": "https://ajuntament.barcelona.cat/comerc/en/actuality/news/barcelona-hosts-the-presentation-of-the-new-slow-food-guide-featuring-more-than-100-sustainable-restaurants-1577575",
    "escalas": [
     "pueblo"
    ],
    "subtemas": [
     "consumo"
    ]
   },
   {
    "nombre": "Cocinas públicas ecológicas de Copenhague",
    "lugar": "Copenhague (Dinamarca)",
    "tipo": "Programa público municipal",
    "texto": "Unas 115.000 comidas al día en más de 1.000 cocinas públicas (escuelas, guarderías, residencias) con cerca del 88 % de alimentos ecológicos, logrado sin subir el presupuesto. Desde 2019 ha reducido un 32 % el CO2 de sus menús, por encima del objetivo del 25 %.",
    "web": null,
    "fuente": "https://www.milanurbanfoodpolicypact.org/wp-content/uploads/2025/10/COPENHAGEN_Implementing-Food-Policies_MPA2025.pdf",
    "escalas": [
     "pueblo"
    ],
    "subtemas": [
     "huerto",
     "comedores"
    ]
   }
  ],
  "preguntas": [
   "¿Quieres incluir los bosques comestibles con un proyecto concreto (por ejemplo, uno de Luz & Humanidad o de tu entorno) que podamos verificar y mostrar?",
   "¿Cómo encaja la Comunidad Circular Humana en este sector: produciría sus propios alimentos y deberíamos enlazarla como proyecto?",
   "¿Prefieres que la visión hable de reducir el consumo de carne o mantenerla neutral sobre la dieta (solo «más vegetal y de temporada»)?",
   "¿Conoces algún grupo de consumo, mercado de productores o comedor escolar ecológico en tu zona que quiera tener ficha propia?"
  ],
  "subtemas": [
   {
    "id": "huerto",
    "nombre": "Huerto y cocina"
   },
   {
    "id": "consumo",
    "nombre": "Grupos de consumo y mercados"
   },
   {
    "id": "campo",
    "nombre": "Campo y relevo agrario"
   },
   {
    "id": "desperdicio",
    "nombre": "Desperdicio"
   },
   {
    "id": "comedores",
    "nombre": "Comedores y cocinas públicas"
   },
   {
    "id": "hambre",
    "nombre": "Hambre y derecho a la alimentación"
   }
  ]
 },
 {
  "id": "informatica",
  "nombre": "Informática",
  "resumen": "Una tecnología digital al servicio de las personas: abierta, segura, sostenible y al alcance de todos.",
  "ambito": "Abarca la tecnología digital en sentido amplio: dispositivos, internet, software, datos, nube e inteligencia artificial, y cómo afectan a las personas, las comunidades y la sociedad.",
  "vision": {
   "escena3d": "pueblo",
   "intro": "Imaginamos un mundo digital que funciona como un bien común: cada persona entiende y controla sus datos, las comunidades construyen sus propias herramientas y redes, y la sociedad decide cómo se usa la inteligencia artificial. La tecnología deja de competir por nuestra atención y vuelve a ser lo que prometía: una herramienta para aprender, cooperar y cuidar el planeta.",
   "equipo": "Un equipo humano recopila esta visión y la comunica a través del arte digital y físico para que sea accesible a todos los seres humanos. El botón «Ver la visión en 3D» abre la herramienta de visualización del ideal de Luz & Humanidad.",
   "bloques": [
    {
     "titulo": "Persona: privacidad, soberanía de los datos y bienestar digital",
     "texto": "Cada persona sabe qué datos genera, decide quién los usa y puede llevárselos o borrarlos. Los dispositivos duran años, se reparan y están diseñados para servirnos, no para engancharnos.",
     "puntos": [
      "Privacidad por defecto: los servicios recogen solo los datos imprescindibles y explican para qué en lenguaje claro.",
      "Soberanía de los datos: cada persona puede descargar, trasladar o borrar su información con un clic.",
      "Competencias digitales para todas las edades, incluida la capacidad de detectar fraudes y bulos.",
      "Bienestar digital: aplicaciones sin diseños adictivos y con protección especial para la infancia y la adolescencia.",
      "Dispositivos duraderos y reparables, con piezas y actualizaciones disponibles durante muchos años.",
      "Ayuda accesible y gratuita ante problemas de ciberseguridad."
     ],
     "imagenes": [],
     "escena3d": "hogar",
     "escalas": [
      "individuo"
     ],
     "subtemas": [
      "privacidad",
      "brecha"
     ]
    },
    {
     "titulo": "Comunidad: software libre, redes comunitarias y conocimiento abierto",
     "texto": "Las comunidades no solo consumen tecnología: la construyen y la gobiernan. El software libre, las redes de internet compartidas y las enciclopedias abiertas demuestran que lo digital puede gestionarse como un procomún.",
     "puntos": [
      "Software libre que cualquiera puede usar, estudiar, mejorar y compartir.",
      "Redes de internet comunitarias, gestionadas por vecinos, ayuntamientos y cooperativas como infraestructura común.",
      "Conocimiento abierto: enciclopedias, mapas y materiales educativos editados de forma colaborativa.",
      "Redes sociales descentralizadas (Fediverso), donde cada comunidad gestiona su propio servidor y sus normas.",
      "Plataformas de participación ciudadana de código abierto para decidir en común.",
      "Asociaciones locales que acompañan a quien da sus primeros pasos en lo digital."
     ],
     "imagenes": [],
     "escena3d": "comunidad",
     "escalas": [
      "comunidad"
     ],
     "subtemas": [
      "libre",
      "redes"
     ]
    },
    {
     "titulo": "Sociedad: infraestructura pública digital, IA al servicio de las personas y cierre de la brecha digital",
     "texto": "La sociedad dispone de una infraestructura digital pública, abierta y eficiente, y de reglas claras para que la inteligencia artificial respete los derechos de las personas. Nadie queda atrás por edad, renta o lugar de residencia.",
     "puntos": [
      "Administraciones que priorizan el software libre y los estándares abiertos, evitando depender de un único proveedor.",
      "Datos públicos abiertos y reutilizables por cualquier persona, empresa o investigador.",
      "Inteligencia artificial transparente, supervisada por personas y con prohibición de los usos que vulneran derechos.",
      "Centros de datos eficientes, alimentados con energía renovable y que informan públicamente de su consumo.",
      "Conectividad de calidad y formación digital en todo el territorio, también en el medio rural y para las personas mayores.",
      "Economía circular de los aparatos electrónicos: reparación, reutilización y reciclaje real."
     ],
     "imagenes": [],
     "escena3d": "pueblo",
     "escalas": [
      "individuo",
      "pais",
      "continente",
      "planeta"
     ],
     "subtemas": [
      "libre",
      "redes",
      "brecha",
      "sostenible",
      "ia"
     ]
    }
   ],
   "arte": {
    "src": "/calendario-arte/miniaturas/mes-06-c.jpg",
    "grande": "/calendario-arte/ilustraciones/mes-06-c.jpg",
    "tema": "Tecnología y Energía"
   }
  },
  "retos": [
   {
    "ambito": "España",
    "titulo": "Una de cada tres personas sin competencias digitales básicas",
    "texto": "En 2025, el 66,5 % de los españoles de 16 a 74 años tenía competencias digitales básicas o superiores, por encima de la media de la UE (60,4 %) pero lejos del objetivo europeo del 80 % para 2030. La encuesta del INE de 2026 sube la cifra al 70,9 %, pero la brecha por edad sigue siendo enorme: el uso de IA generativa va del 83,3 % (16-24 años) al 19,5 % (65-74 años).",
    "fuente": "https://digital-skills-jobs.europa.eu/en/latest/news/two-out-three-spaniards-have-basic-digital-skills-security-and-content-creation-are",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "brecha",
     "ia"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Los fraudes y ataques en línea no paran de crecer",
    "texto": "INCIBE gestionó 122.223 incidentes de ciberseguridad en 2025, un 26 % más que en 2024. Cuatro de cada diez fueron fraudes en línea (45.445 casos), sobre todo suplantaciones por correo o SMS (phishing).",
    "fuente": "https://espanadigital.gob.es/actualidad/incibe-gestiono-122223-incidentes-de-ciberseguridad-en-2025-un-26-mas-que-el-ano",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "privacidad"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Uso problemático de internet en adolescentes",
    "texto": "Según la encuesta ESTUDES 2025, el 19,4 % de los estudiantes de 14 a 18 años presenta un posible uso problemático de internet (23,4 % de las chicas y 15,5 % de los chicos) y el 15,3 % un posible uso problemático de redes sociales. La tendencia del primer indicador es a la baja, pero sigue afectando a uno de cada cinco.",
    "fuente": "https://pnsd.sanidad.gob.es/profesionales/sistemasInformacion/sistemaInformacion/pdf/2026/2025_OEDA_AdiccionesComportamentales_ResumenEjecutivo.pdf",
    "escalas": [
     "individuo",
     "pais"
    ],
    "subtemas": [
     "privacidad"
    ]
   },
   {
    "ambito": "UE",
    "titulo": "Dependencia de unos pocos proveedores de nube",
    "texto": "Amazon, Microsoft y Google suman el 70 % del mercado europeo de servicios en la nube, mientras que los proveedores europeos se han estancado en torno al 15 % (eran el 29 % en 2017). Los datos son de Synergy Research Group, julio de 2025.",
    "fuente": "https://srgresearch.com/articles/european-cloud-providers-local-market-share-now-holds-steady-at-15",
    "escalas": [
     "continente"
    ],
    "subtemas": [
     "privacidad",
     "sostenible"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Montañas de basura electrónica",
    "texto": "En 2022 se generaron en el mundo 62 millones de toneladas de residuos electrónicos, un 82 % más que en 2010, y solo el 22,3 % se recogió y recicló de forma documentada. Si nada cambia, en 2030 se llegará a unos 82 millones de toneladas.",
    "fuente": "https://unitar.org/about/news-stories/press/global-e-waste-monitor-2024-electronic-waste-rising-five-times-faster-documented-e-waste-recycling",
    "escalas": [
     "planeta"
    ],
    "subtemas": [
     "sostenible"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "El consumo eléctrico de los centros de datos se dispara",
    "texto": "Los centros de datos consumieron unos 415 TWh en 2024, alrededor del 1,5 % de la electricidad mundial. La Agencia Internacional de la Energía prevé que lleguen a unos 945 TWh en 2030 (casi el 3 %), impulsados sobre todo por la inteligencia artificial.",
    "fuente": "https://iea.org/reports/energy-and-ai/energy-demand-from-ai",
    "escalas": [
     "planeta"
    ],
    "subtemas": [
     "sostenible",
     "ia"
    ]
   }
  ],
  "soluciones": [
   {
    "ambito": "España",
    "titulo": "Formación digital masiva y gratuita",
    "texto": "El Plan Nacional de Competencias Digitales ha formado a más de 2 millones de personas (más de 1 millón de docentes y unas 650.000 personas, el 66 % de colectivos vulnerables), según el Gobierno en octubre de 2025. En paralelo, la población con competencias básicas ha pasado del 66,5 % (2025) al 70,9 % (INE, 2026), aunque no hay una evaluación independiente que atribuya esa mejora al plan.",
    "supera": "Una de cada tres personas sin competencias digitales básicas",
    "fuente": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/transformacion-digital-y-funcion-publica/Paginas/2025/231025-plan-nacional-competencias-digitales.aspx",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "brecha"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Una línea de ayuda gratuita en ciberseguridad (017)",
    "texto": "La Línea de Ayuda en Ciberseguridad 017 de INCIBE atiende gratis a ciudadanía y empresas por teléfono y chat. En 2025 resolvió 142.767 consultas (un 44,9 % más) y casi la mitad fueron preventivas, es decir, antes de caer en el engaño; además, INCIBE y Red.es cerraron 4.600 dominios fraudulentos.",
    "supera": "Los fraudes y ataques en línea no paran de crecer",
    "fuente": "https://espanadigital.gob.es/actualidad/incibe-gestiono-122223-incidentes-de-ciberseguridad-en-2025-un-26-mas-que-el-ano",
    "escalas": [
     "pueblo",
     "pais"
    ],
    "subtemas": [
     "privacidad"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Proteger a la infancia en los entornos digitales",
    "texto": "El proyecto de Ley Orgánica de protección de menores en entornos digitales, aprobado por el Gobierno en marzo de 2025, eleva de 14 a 16 años la edad para consentir el uso de datos, exige verificar la edad y obliga a incluir controles parentales gratuitos activados por defecto en móviles, tabletas y televisores. Su tramitación parlamentaria y su eficacia están por verificar.",
    "supera": "Uso problemático de internet en adolescentes",
    "fuente": "https://www.osborneclarke.com/es/insights/espana-busca-proteger-los-menores-en-el-entorno-digital-claves-del-proyecto-de-ley",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "privacidad"
    ]
   },
   {
    "ambito": "UE",
    "titulo": "Software libre en la administración pública",
    "texto": "El estado alemán de Schleswig-Holstein ha migrado cerca del 80 % de los puestos de su administración a programas libres como LibreOffice. Su Gobierno calcula un ahorro de más de 15 millones de euros al año en licencias desde 2026, con una inversión única de 9 millones.",
    "supera": "Dependencia de unos pocos proveedores de nube",
    "fuente": "https://itsfoss.com/news/german-state-ditch-microsoft/",
    "escalas": [
     "continente"
    ],
    "subtemas": [
     "libre",
     "sostenible"
    ]
   },
   {
    "ambito": "UE",
    "titulo": "Derecho a reparar los aparatos",
    "texto": "La Directiva (UE) 2024/1799 obliga a los fabricantes de móviles, tabletas, electrodomésticos o pantallas a ofrecer reparación a precio razonable y a dar acceso a piezas y herramientas, y amplía 12 meses la garantía si el cliente elige reparar. Los países debían aplicarla antes del 31 de julio de 2026; móviles como el Fairphone 6, con 12 piezas sustituibles y 8 años de actualizaciones, muestran que es viable.",
    "supera": "Montañas de basura electrónica",
    "fuente": "https://www.garrigues.com/es_ES/noticia/europa-avanza-economia-circular-fomento-reparacion-bienes",
    "escalas": [
     "continente"
    ],
    "subtemas": [
     "sostenible"
    ]
   },
   {
    "ambito": "UE",
    "titulo": "Transparencia energética de los centros de datos",
    "texto": "Desde 2024, los centros de datos de la UE con una potencia informática de 500 kW o más deben informar cada año de su consumo y otros indicadores a una base de datos europea (Reglamento Delegado 2024/1364), y parte de esa información debe hacerse pública. Medir es el primer paso para exigir eficiencia; sus resultados aún están por evaluar.",
    "supera": "El consumo eléctrico de los centros de datos se dispara",
    "fuente": "https://www.miteco.gob.es/es/energia/eficiencia/centros-de-datos/preguntas-frecuentes.html",
    "escalas": [
     "continente"
    ],
    "subtemas": [
     "brecha",
     "sostenible"
    ]
   }
  ],
  "proyectos": [
   {
    "nombre": "Decidim",
    "lugar": "Barcelona (España) y más de 450 ciudades y organizaciones del mundo",
    "tipo": "Software libre / asociación",
    "texto": "Plataforma de código abierto para la participación ciudadana y la democracia, nacida en Barcelona en 2017 y gobernada desde 2019 por la Asociación de Software Libre Decidim. La usan más de 450 ciudades y organizaciones en todo el mundo.",
    "web": "https://decidim.org",
    "fuente": "https://decidim.org/es/about",
    "escalas": [
     "pais",
     "planeta"
    ],
    "subtemas": [
     "privacidad",
     "libre"
    ]
   },
   {
    "nombre": "Guifi.net",
    "lugar": "Cataluña y resto de España",
    "tipo": "Red comunitaria / fundación",
    "texto": "Red de telecomunicaciones libre, abierta y neutral nacida en 2004 en Osona (Cataluña) por iniciativa de vecinos voluntarios y gestionada como procomún. En 2017 sumaba más de 33.000 nodos activos (cifra actual por verificar).",
    "web": "https://guifi.net",
    "fuente": "https://www.uoc.edu/es/news/2017/188-guifinet",
    "escalas": [
     "region"
    ],
    "subtemas": [
     "privacidad",
     "redes"
    ]
   },
   {
    "nombre": "Wikimedia España",
    "lugar": "España",
    "tipo": "Asociación sin ánimo de lucro (utilidad pública)",
    "texto": "Capítulo español del movimiento Wikimedia, constituido en 2011, que impulsa Wikipedia y el conocimiento libre mediante acuerdos con museos, universidades y otras entidades. Por ejemplo, en 2024 firmó un convenio con el Museo Reina Sofía.",
    "web": "https://www.wikimedia.es",
    "fuente": "https://meta.wikimedia.org/wiki/Wikimedia_Espa%C3%B1a/en",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "libre"
    ]
   },
   {
    "nombre": "datos.gob.es (Iniciativa Aporta)",
    "lugar": "España",
    "tipo": "Programa público",
    "texto": "Portal nacional de datos abiertos de las administraciones públicas españolas. En 2025 ofrecía casi 100.000 conjuntos de datos reutilizables (un 9 % más que el año anterior) y España figura entre los países de referencia en datos abiertos de la UE.",
    "web": "https://datos.gob.es",
    "fuente": "https://datos.gob.es/es/noticias/balance-de-la-iniciativa-aporta-2025",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "libre"
    ]
   },
   {
    "nombre": "Fairphone",
    "lugar": "Países Bajos (venta en toda Europa)",
    "tipo": "Empresa social",
    "texto": "Fabricante de móviles modulares y reparables. Su Fairphone 6 (junio de 2025, 599 €) tiene 12 piezas que se cambian con un destornillador, 5 años de garantía y 8 años de actualizaciones.",
    "web": "https://www.fairphone.com",
    "fuente": "https://www.androidheadlines.com/2025/06/fairphone-6-launches-specs-price-support.html",
    "escalas": [
     "continente",
     "planeta"
    ],
    "subtemas": [
     "sostenible"
    ]
   },
   {
    "nombre": "Framasoft",
    "lugar": "Lyon (Francia)",
    "tipo": "Asociación de educación popular",
    "texto": "Asociación financiada por donaciones que ofrece alternativas libres a los servicios de las grandes plataformas (campaña «Desgooglicemos internet») y desarrolla PeerTube y Mobilizon. En 2025 mantenía 26 servicios en línea éticos, con 10 empleados y más de 10.400 donantes.",
    "web": "https://framasoft.org",
    "fuente": "https://framasoft.org/en/association",
    "escalas": [
     "pueblo"
    ],
    "subtemas": [
     "libre"
    ]
   },
   {
    "nombre": "Mastodon (Fediverso)",
    "lugar": "Internacional",
    "tipo": "Software libre / organización sin ánimo de lucro",
    "texto": "Red social descentralizada en la que miles de servidores independientes se comunican entre sí, sin un único dueño. Tiene unos 10 millones de cuentas registradas y menos de 1 millón de usuarios activos al mes, y en 2025 pasó a gobernarse por una junta sin ánimo de lucro.",
    "web": "https://joinmastodon.org",
    "fuente": "https://techcrunch.com/2025/11/18/mastodon-ceo-steps-down-as-the-social-network-restructures",
    "escalas": [
     "continente",
     "planeta"
    ],
    "subtemas": [
     "libre"
    ]
   },
   {
    "nombre": "humanity.wiki (Luz & Humanidad)",
    "lugar": "España",
    "tipo": "Proyecto propio",
    "texto": "Plataforma de conocimiento abierta organizada por territorio: recopila la visión ideal, los retos, las soluciones y los proyectos de cada sector vital.",
    "web": "https://humanity.wiki",
    "fuente": null,
    "escalas": [
     "comunidad",
     "pueblo",
     "pais",
     "planeta"
    ],
    "subtemas": [
     "libre"
    ]
   }
  ],
  "preguntas": [
   "¿Quieres que humanity.wiki se defina públicamente como software libre (publicar su código y su licencia) para ser coherente con esta visión?",
   "¿Conoces redes comunitarias, cooperativas tecnológicas o asociaciones de alfabetización digital en tu territorio que debamos añadir como proyectos?",
   "En inteligencia artificial, ¿qué línea roja quieres que destaque la visión: la privacidad, el empleo, el consumo de energía o la desinformación?",
   "¿Te interesa incluir la reparación y reutilización de aparatos (talleres de reparación, móviles reacondicionados) como parte de este sector o de otro?"
  ],
  "subtemas": [
   {
    "id": "privacidad",
    "nombre": "Privacidad y bienestar digital"
   },
   {
    "id": "libre",
    "nombre": "Software libre y conocimiento abierto"
   },
   {
    "id": "redes",
    "nombre": "Redes comunitarias"
   },
   {
    "id": "brecha",
    "nombre": "Brecha digital"
   },
   {
    "id": "sostenible",
    "nombre": "Tecnología sostenible"
   },
   {
    "id": "ia",
    "nombre": "Inteligencia artificial"
   }
  ]
 },
 {
  "id": "educacion",
  "nombre": "Educación",
  "resumen": "Aprender jugando, en comunidad y durante toda la vida, para que cada persona despliegue lo mejor de sí.",
  "ambito": "Abarca el aprendizaje en todas las etapas de la vida: la infancia, la escuela y su relación con el barrio, la formación profesional y la educación de personas adultas, incluido el desarrollo emocional y el sentido de la vida.",
  "vision": {
   "escena3d": "naturaleza",
   "intro": "Imaginamos una educación en la que cada niña y cada niño aprende jugando, en contacto con la naturaleza y acompañado en sus emociones, y en la que la escuela es el corazón abierto del barrio. Aprender no termina nunca: cada persona puede seguir formándose, descubrirse y encontrar sentido en cualquier momento de su vida.",
   "equipo": "Un equipo humano recopila esta visión y la comunica a través del arte digital y físico para que sea accesible a todos los seres humanos. El botón «Ver la visión en 3D» abre la herramienta de visualización del ideal de Luz & Humanidad.",
   "bloques": [
    {
     "titulo": "Infancia: aprender jugando, en la naturaleza y con las emociones",
     "texto": "Los primeros años se viven como una etapa para explorar, moverse y jugar, no para correr detrás de contenidos. La naturaleza es aula y las emociones se nombran, se acompañan y se aprenden.",
     "puntos": [
      "Juego libre y experimentación como forma principal de aprender en la primera infancia.",
      "Tiempo diario al aire libre y en la naturaleza, también en la ciudad.",
      "Educación emocional: aprender a reconocer y expresar lo que se siente y a cuidar de los demás.",
      "Escuela infantil de calidad al alcance de todas las familias, empezando por las que menos recursos tienen.",
      "Movimiento y actividad física cada día, como parte natural del aprendizaje.",
      "Ritmo propio: cada niño avanza a su paso, sin etiquetas tempranas."
     ],
     "imagenes": [],
     "escena3d": "naturaleza",
     "escalas": [
      "individuo",
      "provincia",
      "region"
     ],
     "subtemas": [
      "infancia",
      "escuela",
      "naturaleza"
     ]
    },
    {
     "titulo": "Escuela y comunidad: aprender haciendo, con el barrio",
     "texto": "La escuela trabaja por proyectos conectados con la vida real y abre sus puertas a familias, vecinos y entidades. Nadie repite curso por falta de apoyo: la ayuda llega a tiempo y en grupos pequeños.",
     "puntos": [
      "Aprendizaje por proyectos y por retos reales del entorno.",
      "Familias y voluntariado dentro del aula, como en los grupos interactivos de las comunidades de aprendizaje.",
      "Apoyo temprano y en grupos reducidos en lugar de repetir curso.",
      "Escuelas socialmente mezcladas, sin concentrar al alumnado vulnerable en unos pocos centros.",
      "Escuela abierta al barrio fuera del horario lectivo: biblioteca, deporte, huerto y actividades culturales.",
      "Equipos docentes estables y bien formados, con recursos extra donde más se necesitan."
     ],
     "imagenes": [],
     "escena3d": "comunidad",
     "escalas": [
      "comunidad"
     ],
     "subtemas": [
      "escuela",
      "equidad"
     ]
    },
    {
     "titulo": "Toda la vida: formación continua, conciencia y sentido",
     "texto": "Aprender es un derecho a cualquier edad: para cambiar de oficio, para entender el mundo o para conocerse mejor. La educación también cultiva la conciencia, el pensamiento crítico y la pregunta por el sentido.",
     "puntos": [
      "Formación profesional flexible, con pasarelas para volver a estudiar sin perder el empleo.",
      "Centros de educación de personas adultas y universidades populares en cada municipio.",
      "Competencias básicas (lectura, cálculo, digital) reforzadas para toda la población adulta.",
      "Espacios de aprendizaje entre generaciones, donde mayores y jóvenes se enseñan mutuamente.",
      "Educación en la conciencia: atención plena, autoconocimiento y estudio de la mente.",
      "Acceso universal a la escuela en todo el planeta, también en zonas de conflicto."
     ],
     "imagenes": [],
     "escena3d": "pueblo",
     "escalas": [
      "individuo"
     ],
     "subtemas": [
      "escuela",
      "vida"
     ]
    }
   ],
   "arte": {
    "src": "/calendario-arte/miniaturas/mes-05-d.jpg",
    "grande": "/calendario-arte/ilustraciones/mes-05-d.jpg",
    "tema": "Arte"
   }
  },
  "retos": [
   {
    "ambito": "España",
    "titulo": "Demasiados jóvenes dejan de estudiar pronto",
    "texto": "En 2025, el 12,8 % de los jóvenes de 18 a 24 años dejó los estudios sin pasar de la ESO: es el mínimo histórico, pero sigue 3,4 puntos por encima de la media de la UE (9,4 % en 2024). La tasa es del 15,9 % en los chicos y del 9,5 % en las chicas.",
    "fuente": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/educacion-fp-deportes/Paginas/2026/280126-abandono-educativo-minimo-historico.aspx",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "equidad"
    ]
   },
   {
    "ambito": "España",
    "titulo": "El origen familiar pesa demasiado",
    "texto": "Según la EPA de 2025 analizada por Funcas, el abandono temprano es del 32,9 % cuando la madre solo tiene estudios primarios y del 2,4 % cuando tiene estudios superiores. Entre los jóvenes de nacionalidad extranjera alcanza el 30,7 %, frente al 9,8 % de los españoles.",
    "fuente": "https://www.funcas.es/wp-content/uploads/2026/02/Informe-sobre-el-abandono-educativo-temprano-en-Espana.pdf",
    "escalas": [
     "individuo",
     "pais"
    ],
    "subtemas": [
     "equidad"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Se repite curso mucho más que en otros países",
    "texto": "Según PISA 2025, el 22 % del alumnado español de 15 años ha repetido algún curso, más del doble que la media de la OCDE (9,8 %); en el cuarto de alumnos con menos recursos llega al 40 %. Además, la puntuación en lectura bajó a 451 puntos, 23 menos que en 2022.",
    "fuente": "https://www.esade.edu/ecpol/es/publicaciones/pisa-2025-equidad/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "equidad"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Muchas personas adultas con competencias básicas bajas",
    "texto": "En la evaluación PIAAC de la OCDE (datos de 2023, publicados en diciembre de 2024), los adultos españoles obtuvieron 247 puntos en lectura y 250 en matemáticas, por debajo de las medias de la OCDE (260 y 263). Alrededor de tres de cada diez adultos tienen un nivel bajo en cada competencia.",
    "fuente": "https://www.ondavasca.com/los-adultos-del-estado-estan-por-debajo-de-la-ue-y-la-ocde-en-matematicas-lectura-y-resolucion-de-problemas/",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "vida"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Infancia y adolescencia sin moverse lo suficiente",
    "texto": "Según la Organización Mundial de la Salud, el 86 % de los adolescentes de 11 a 17 años del mundo no alcanza los niveles de actividad física recomendados. La falta de juego activo y de tiempo al aire libre afecta a la salud, al ánimo y al aprendizaje.",
    "fuente": "https://www.who.int/news-room/fact-sheets/detail/physical-activity",
    "escalas": [
     "individuo",
     "planeta"
    ],
    "subtemas": [
     "infancia",
     "naturaleza"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "272 millones de niños y jóvenes sin escuela",
    "texto": "El Informe de Seguimiento de la Educación en el Mundo de la UNESCO estimó en junio de 2025 que 272 millones de niños y jóvenes están fuera de la escuela, 21 millones más que en la estimación anterior. UNICEF advierte de que los recortes de ayuda internacional podrían sumar otros 6 millones en 2026.",
    "fuente": "https://www.orissapost.com/unesco-report-over-272-million-children-worldwide-remain-out-of-school",
    "escalas": [
     "individuo",
     "planeta"
    ],
    "subtemas": [
     "infancia",
     "escuela",
     "equidad"
    ]
   }
  ],
  "soluciones": [
   {
    "ambito": "España",
    "titulo": "Una Formación Profesional que retiene y da empleo",
    "texto": "La FP ofrece una vía práctica para seguir estudiando. Entre las promociones de 2016-2017 y 2019-2020, el porcentaje de alumnado de FP de grado medio que la deja sin título bajó del 30,7 % al 25,4 %, y la afiliación laboral al cuarto año ronda el 67 %; Funcas advierte de que son tendencias, no una medición del efecto causal.",
    "supera": "Demasiados jóvenes dejan de estudiar pronto",
    "fuente": "https://www.funcas.es/wp-content/uploads/2026/02/Informe-sobre-el-abandono-educativo-temprano-en-Espana.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "equidad",
     "vida"
    ]
   },
   {
    "ambito": "España / UE",
    "titulo": "Comunidades de aprendizaje y actuaciones educativas de éxito",
    "texto": "Las escuelas que se transforman en comunidades de aprendizaje abren el aula a familias y voluntariado con grupos interactivos, tertulias dialógicas y más tiempo de aprendizaje. Se basan en el proyecto europeo INCLUD-ED (2006-2011, 15 instituciones de 14 países), que la Comisión Europea destacó entre sus diez historias de éxito en investigación; los centros que las aplican describen mejoras en resultados y menos absentismo (cifras de impacto por verificar).",
    "supera": "Se repite curso mucho más que en otros países",
    "fuente": "https://redined.educacion.gob.es/xmlui/bitstream/handle/11162/115683/actuaciones.pdf?sequence=1",
    "escalas": [
     "individuo",
     "pais",
     "continente"
    ],
    "subtemas": [
     "escuela"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Escuelas mezcladas socialmente",
    "texto": "Para que el origen pese menos, se proponen plazas reservadas para alumnado vulnerable, fondos extra para los centros que lo escolarizan y mejor información a las familias. En el piloto «Mézclate conmigo» de Save the Children (182 familias de Lleida y Tarragona), el 56 % comprendió la importancia de elegir una escuela diversa, aunque la propia evaluación reconoce que no pudo medir el impacto real en la matrícula.",
    "supera": "El origen familiar pesa demasiado",
    "fuente": "https://www.savethechildren.es/sites/default/files/2025-07/Dossier%20Toolkit%20Mezclate%20Conmigo%20%28castellano%29.pdf",
    "escalas": [
     "individuo",
     "pais"
    ],
    "subtemas": [
     "escuela",
     "equidad"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Universidades populares y educación de personas adultas",
    "texto": "Las universidades populares, la primera de ellas creada en Oviedo en 1901, ofrecen formación cercana y barata en los municipios. Según datos de 2008, había más de 300 y atendían a más de 500.000 personas en cursos (cifras actuales por verificar); su efecto sobre las competencias medidas por PIAAC no está evaluado.",
    "supera": "Muchas personas adultas con competencias básicas bajas",
    "fuente": "https://www.consumer.es/educacion/universidades-populares.html",
    "escalas": [
     "pueblo",
     "pais"
    ],
    "subtemas": [
     "vida"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Educación en la naturaleza",
    "texto": "Las escuelas y grupos de juego en la naturaleza hacen del bosque, el campo o el parque el aula principal, con juego libre y movimiento diario. La Asociación EdNa publicó en 2020 una guía práctica con criterios de calidad para estos proyectos; la evidencia sobre sus efectos en España está por verificar.",
    "supera": "Infancia y adolescencia sin moverse lo suficiente",
    "fuente": "https://www.miteco.gob.es/en/ceneam/recursos/materiales/guia-escuelas-naturaleza.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "infancia",
     "escuela",
     "naturaleza"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Priorizar la ayuda a la educación infantil y primaria",
    "texto": "UNICEF propone dirigir al menos la mitad de la ayuda educativa a los países menos adelantados, proteger la educación en emergencias y concentrarse en el aprendizaje básico (preescolar y primaria), la etapa con mayor retorno de la inversión.",
    "supera": "272 millones de niños y jóvenes sin escuela",
    "fuente": "https://www.unicef.org/es/comunicados-prensa/recortes-financiacion-mundial-podrian-dejar-sin-escolarizar-seis-millones-ninos",
    "escalas": [
     "planeta"
    ],
    "subtemas": [
     "infancia",
     "escuela",
     "equidad"
    ]
   }
  ],
  "proyectos": [
   {
    "nombre": "Comunidades de Aprendizaje (CREA, Universidad de Barcelona)",
    "lugar": "España y otros países",
    "tipo": "Proyecto educativo basado en investigación universitaria",
    "texto": "Modelo de transformación de escuelas basado en el aprendizaje dialógico y en las actuaciones educativas de éxito del proyecto europeo INCLUD-ED, coordinado por el centro CREA de la Universidad de Barcelona. Pasó de 5 escuelas en 1995 a 194 en España en 2015 (cifra actual por verificar).",
    "web": null,
    "fuente": "https://redined.educacion.gob.es/xmlui/bitstream/handle/11162/115683/actuaciones.pdf?sequence=1",
    "escalas": [
     "comunidad",
     "planeta"
    ],
    "subtemas": [
     "escuela"
    ]
   },
   {
    "nombre": "Red de Centros Comunidades de Aprendizaje de Castilla-La Mancha",
    "lugar": "Castilla-La Mancha (España)",
    "tipo": "Programa público",
    "texto": "Red creada por una orden de la Consejería de Educación de 18 de junio de 2021 para reconocer y acompañar a los centros públicos y concertados que se transforman en comunidades de aprendizaje. Exige el apoyo de dos tercios del claustro y del consejo escolar y ofrece formación, intercambio de experiencias e investigación con la universidad regional.",
    "web": "https://educacion.castillalamancha.es",
    "fuente": "https://educacion.castillalamancha.es/sites/default/files/2025-01/Orden%2018-06-2021%20Red%20COMUNIDADES%20DE%20APRENDIZAJE.pdf",
    "escalas": [
     "region"
    ],
    "subtemas": [
     "escuela"
    ]
   },
   {
    "nombre": "Red Amara Berri",
    "lugar": "País Vasco (España)",
    "tipo": "Red de escuelas públicas",
    "texto": "Sistema pedagógico nacido en Donostia que organiza toda la vida del centro en torno a cada alumno, el juego y el trabajo en equipo de alumnado, profesorado y familias. Un documento del Gobierno Vasco recoge 18 centros en la red (11 en Bizkaia, 5 en Gipuzkoa y 2 en Álava; fecha del dato por verificar).",
    "web": null,
    "fuente": "https://redined.educacion.gob.es/xmlui/bitstream/handle/11162/203726/210004c_Doc_BGN_Hezkuntza_sareak_c.pdf?sequence=1",
    "escalas": [
     "region"
    ],
    "subtemas": [
     "infancia",
     "escuela",
     "vida"
    ]
   },
   {
    "nombre": "EdNa, Educación en la Naturaleza",
    "lugar": "España",
    "tipo": "Asociación sin ánimo de lucro",
    "texto": "Asociación de ámbito nacional que reúne y asesora a escuelas y grupos de juego en la naturaleza, organiza un encuentro nacional anual y ha definido criterios de calidad para estos proyectos. Publicó en 2020 la «Guía de escuelas en la naturaleza».",
    "web": "https://asociacionedna.wordpress.com",
    "fuente": "https://www.miteco.gob.es/es/ceneam/recursos/quien-es-quien/edna.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "infancia",
     "escuela",
     "naturaleza"
    ]
   },
   {
    "nombre": "Universidades Populares (FEUP)",
    "lugar": "España",
    "tipo": "Red municipal de educación de personas adultas",
    "texto": "Centros de educación y cultura para adultos, la mayoría dependientes de ayuntamientos y agrupados en la Federación Española de Universidades Populares. En 2008 había más de 300 en 12 comunidades autónomas, con más de 500.000 personas en cursos (cifras actuales por verificar).",
    "web": null,
    "fuente": "https://www.consumer.es/educacion/universidades-populares.html",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "escuela",
     "vida"
    ]
   },
   {
    "nombre": "Mézclate conmigo (Save the Children)",
    "lugar": "Cataluña (España)",
    "tipo": "ONG",
    "texto": "Caja de herramientas de Save the Children para talleres con familias que buscan una escolarización más diversa e inclusiva. Su piloto reunió a 21 escuelas infantiles y 182 familias de Lleida y Tarragona, y el 78 % valoró positivamente el taller.",
    "web": "https://www.savethechildren.es",
    "fuente": "https://www.savethechildren.es/sites/default/files/2025-07/Dossier%20Toolkit%20Mezclate%20Conmigo%20%28castellano%29.pdf",
    "escalas": [
     "region"
    ],
    "subtemas": [
     "infancia",
     "escuela",
     "equidad"
    ]
   },
   {
    "nombre": "Estudio sobre la conciencia del ser humano (Luz & Humanidad)",
    "lugar": "España",
    "tipo": "Proyecto propio",
    "texto": "Mapa visual editable de la teoría sintérgica de Jacobo Grinberg (vigilia, sueño, meditación y comunicación entre campos mentales) con sus estudios científicos citados.",
    "web": "https://humanity.wiki/conciencia",
    "fuente": null,
    "escalas": [
     "individuo"
    ],
    "subtemas": [
     "vida"
    ]
   }
  ],
  "preguntas": [
   "¿Quieres incluir el sistema educativo de Finlandia y Escola Nova 21 como referentes? No he podido verificar fuentes actuales en esta sesión (y Escola Nova 21 podría haber terminado en 2022).",
   "¿Conoces escuelas bosque, escuelas rurales o comunidades de aprendizaje concretas en tu territorio que quieras destacar con nombre propio?",
   "En el bloque «toda la vida», ¿la conciencia y el sentido deben conectar directamente con tu Estudio sobre la conciencia, o prefieres tratarlos como un sector aparte?",
   "¿Qué peso quieres dar a la educación fuera de España (los 272 millones de niños sin escuela) frente a los retos de aquí?"
  ],
  "subtemas": [
   {
    "id": "infancia",
    "nombre": "Infancia"
   },
   {
    "id": "escuela",
    "nombre": "Escuela y comunidad"
   },
   {
    "id": "equidad",
    "nombre": "Equidad"
   },
   {
    "id": "naturaleza",
    "nombre": "Educación en la naturaleza"
   },
   {
    "id": "vida",
    "nombre": "Aprender toda la vida"
   }
  ]
 },
 {
  "id": "cuidados",
  "nombre": "Cuidados",
  "resumen": "Cuidar y ser cuidado con dignidad en cada etapa de la vida: tiempo para la familia, barrios que acompañan y servicios cercanos que no dejan a nadie esperando.",
  "ambito": "Abarca el cuidado de la infancia, de las personas mayores, de quienes viven con dependencia o discapacidad, y de las personas que cuidan, ya sea en casa, en la comunidad o desde los servicios públicos.",
  "vision": {
   "escena3d": "comunidad",
   "intro": "Imaginamos una sociedad que reconoce el cuidado como el trabajo que sostiene todos los demás, y lo reparte con justicia entre mujeres y hombres, familias, vecindario y Estado. Nadie envejece solo ni espera años una ayuda a la que tiene derecho, y quien cuida también es cuidado.",
   "equipo": "Un equipo humano recopila esta visión y la comunica a través del arte digital y físico para que sea accesible a todos los seres humanos. El botón «Ver la visión en 3D» abre la herramienta de visualización del ideal de Luz & Humanidad.",
   "bloques": [
    {
     "titulo": "Hogar y familia: tiempo para cuidar",
     "texto": "Cuidar a un bebé, a una madre mayor o a un familiar con discapacidad requiere tiempo, y ese tiempo no debería costar el empleo ni la salud de nadie. El ideal es que los horarios, los permisos y los servicios permitan cuidar sin que la carga recaiga casi siempre en las mujeres.",
     "puntos": [
      "Permisos por nacimiento iguales e intransferibles para cada progenitor, y efectivamente usados por los padres",
      "Escuelas infantiles de 0 a 3 años accesibles y asequibles para todas las familias",
      "Jornadas laborales flexibles y racionales que permitan cuidar sin renunciar al empleo",
      "Reparto equilibrado entre mujeres y hombres de las reducciones de jornada y excedencias por cuidado",
      "Apoyo, formación y descanso (respiro) para las personas cuidadoras familiares",
      "Viviendas adaptadas que permiten envejecer en casa con autonomía y seguridad"
     ],
     "imagenes": [],
     "escena3d": "hogar",
     "escalas": [
      "individuo"
     ],
     "subtemas": [
      "familia",
      "dependencia",
      "profesionales",
      "vivienda"
     ]
    },
    {
     "titulo": "Comunidad: barrios que acompañan",
     "texto": "La soledad no deseada se previene con vínculos: vecinos que se conocen, comercios y farmacias atentos, voluntariado que acompaña y espacios donde se encuentran generaciones distintas. La comunidad no sustituye a los servicios públicos, pero llega a donde estos no ven.",
     "puntos": [
      "Redes vecinales que detectan a tiempo a personas mayores solas o en riesgo (vecindario, comercios, farmacias)",
      "Acompañamiento voluntario estable que crea amistad y no solo asistencia",
      "Viviendas colaborativas (cohousing) de personas mayores gestionadas por ellas mismas",
      "Viviendas y proyectos intergeneracionales donde jóvenes y mayores se apoyan mutuamente",
      "Espacios de encuentro en cada barrio y pueblo, también para jóvenes, que sufren mucha soledad",
      "Participación activa de las personas mayores en la vida del barrio, como protagonistas y no solo como receptoras de ayuda"
     ],
     "imagenes": [],
     "escena3d": "comunidad",
     "escalas": [
      "comunidad"
     ],
     "subtemas": [
      "soledad",
      "vivienda"
     ]
    },
    {
     "titulo": "Sistema: cuidados cercanos, profesionales y a tiempo",
     "texto": "Un sistema público de cuidados que responde en semanas, no en años, y que prioriza servicios en el propio hogar y el barrio. Los profesionales del cuidado trabajan con autonomía, en equipos pequeños y con salarios dignos, porque la calidad del cuidado depende de su bienestar.",
     "puntos": [
      "Valoración y ayuda de la dependencia en pocas semanas, sin personas fallecidas en lista de espera",
      "Ayuda a domicilio y enfermería de barrio con horas suficientes y equipos estables que conocen a cada persona",
      "Atención centrada en la persona: sus deseos y su proyecto de vida guían el plan de cuidados",
      "Profesionales de cuidados en número suficiente, bien formados y con salarios dignos",
      "Financiación pública del cuidado de larga duración al nivel de la media europea",
      "Coordinación real entre servicios sociales y sanitarios"
     ],
     "imagenes": [],
     "escena3d": "pueblo",
     "escalas": [
      "pais"
     ],
     "subtemas": [
      "familia",
      "dependencia",
      "profesionales"
     ]
    }
   ],
   "arte": {
    "src": "/calendario-arte/miniaturas/mes-02-d.jpg",
    "grande": "/calendario-arte/ilustraciones/mes-02-d.jpg",
    "tema": "Relaciones"
   }
  },
  "retos": [
   {
    "ambito": "España",
    "titulo": "Morir esperando la ayuda a la dependencia",
    "texto": "Según el XXVI Dictamen del Observatorio Estatal de la Dependencia, en 2025 fallecieron 32.704 personas en lista de espera, y la tramitación media fue de 341 días. A 31 de diciembre de 2025, 148.907 personas con derecho reconocido seguían esperando su prestación.",
    "fuente": "https://blogs.uned.es/catedraunedfuenlabrada/wp-content/uploads/sites/313/2026/07/XXVI-DICTAMEN-OBSERVATORIO-DE-LA-DEPENDENCIA.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "dependencia"
    ]
   },
   {
    "ambito": "España",
    "titulo": "La dependencia recibe la mitad que en Europa",
    "texto": "España destina en torno al 0,8 % del PIB a la atención a la dependencia, frente a una media europea cercana al 1,6 %, según Fedea (2026). Las comunidades autónomas financian alrededor del 74 % del sistema.",
    "fuente": "https://documentos.fedea.net/pubs/fpp/2026/07/FPP2026-04.pdf",
    "escalas": [
     "region",
     "pais"
    ],
    "subtemas": [
     "dependencia"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Una de cada cinco personas se siente sola",
    "texto": "El Barómetro de la soledad no deseada 2024 (Fundación ONCE y Fundación AXA) indica que el 20 % de la población sufre soledad no deseada y el 13,5 % lleva más de dos años así; afecta más a jóvenes y a personas con discapacidad. Su coste se estima en 14.141 millones de euros al año, el 1,17 % del PIB (2021).",
    "fuente": "https://lamoncloa.gob.es/serviciosdeprensa/notasprensa/derechos-sociales-consumo-agenda-2030/Documents/2024/10-06-24-barometro-soledad-2024.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "soledad",
     "dependencia"
    ]
   },
   {
    "ambito": "España",
    "titulo": "El cuidado sigue recayendo en las mujeres",
    "texto": "Según el módulo de conciliación de la EPA 2025 (INE), el 8,3 % de las mujeres ocupadas con responsabilidades de cuidado ha reducido su jornada para cuidar, frente al 0,8 % de los hombres. Además, entre las personas mayores de 50 años que cuidan de manera informal, el 76 % son mujeres, una de las proporciones más altas de la OCDE (Fedea, 2026).",
    "fuente": "https://www.ine.es/dyngs/Prensa/es/mEPA2025.htm",
    "escalas": [
     "individuo",
     "pais"
    ],
    "subtemas": [
     "familia",
     "soledad"
    ]
   },
   {
    "ambito": "España",
    "titulo": "Pocas manos profesionales y mal pagadas",
    "texto": "España cuenta con 4,9 trabajadores de cuidados de larga duración por cada 100 personas mayores de 65 años, frente a 5,7 de media en la OCDE, y sus salarios rondan el 60-63 % del salario medio (Fedea, 2026).",
    "fuente": "https://documentos.fedea.net/pubs/fpp/2026/07/FPP2026-04.pdf",
    "escalas": [
     "individuo",
     "pais"
    ],
    "subtemas": [
     "soledad",
     "profesionales"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Un trabajo inmenso, invisible y desigual",
    "texto": "La Organización Internacional del Trabajo calculó en 2018 que cada día se dedican 16.400 millones de horas a cuidados no remunerados, el equivalente a 2.000 millones de personas trabajando ocho horas sin cobrar. Las mujeres realizan el 76,2 % de ese trabajo, y 606 millones de mujeres en edad de trabajar no podían acceder a un empleo por cuidar.",
    "fuente": "https://news.un.org/es/story/2018/06/1436912",
    "escalas": [
     "planeta"
    ],
    "subtemas": [
     "familia"
    ]
   }
  ],
  "soluciones": [
   {
    "ambito": "Sistema",
    "titulo": "Enfermería de barrio con equipos pequeños y autónomos",
    "texto": "Modelo nacido en Países Bajos (Buurtzorg): equipos de 10 a 12 enfermeras que se organizan solos y atienden a 50-60 personas de un barrio, reforzando la autonomía del paciente y sus redes. Un estudio de KPMG (2015) lo identificó como proveedor de bajo coste no explicado por el tipo de pacientes, y encabeza la satisfacción de usuarios en Países Bajos; aún faltan datos sólidos sobre resultados en salud.",
    "supera": "Pocas manos profesionales y mal pagadas",
    "fuente": "https://en.wikipedia.org/wiki/Buurtzorg_Nederland",
    "escalas": [
     "comunidad",
     "pais"
    ],
    "subtemas": [
     "profesionales"
    ]
   },
   {
    "ambito": "Sistema",
    "titulo": "Financiar la dependencia al nivel europeo y priorizar servicios",
    "texto": "Aumentar la financiación estatal del sistema de dependencia: el Real Decreto-ley 17/2026 la eleva a 5.514 millones de euros en 2026 y 7.239 millones en 2027, con el objetivo de cubrir el 50 % del coste. Coincidiendo con más recursos, la lista de espera bajó un 21 % en un año, hasta 142.887 personas en junio de 2026, aunque el tiempo medio (314 días) sigue siendo muy alto.",
    "supera": "La dependencia recibe la mitad que en Europa",
    "fuente": "https://www.dsca.gob.es/en/comunicacion/notas-prensa/lista-espera-dependencia-acelera-su-descenso-baja-21-ultimo-ano",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "dependencia"
    ]
   },
   {
    "ambito": "Sistema",
    "titulo": "Agilizar la valoración y atender mientras se tramita",
    "texto": "Reducir plazos de valoración y resolución y empezar a prestar servicios básicos mientras se resuelve el expediente. Cataluña muestra que es posible acortar plazos: su tiempo total de espera era de 270 días en julio de 2025 (Fedea), frente a 341 de media estatal en 2025, aunque sigue muy por encima de un plazo razonable. No hay aún evaluaciones rigurosas de qué medidas concretas acortan más la espera (por verificar).",
    "supera": "Morir esperando la ayuda a la dependencia",
    "fuente": "https://documentos.fedea.net/pubs/fpp/2026/07/FPP2026-04.pdf",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "dependencia"
    ]
   },
   {
    "ambito": "Hogar y familia",
    "titulo": "Permisos por nacimiento iguales e intransferibles",
    "texto": "Cada progenitor tiene su propio permiso, que no puede ceder al otro, de modo que los padres lo usan. La EPA 2025 muestra que el 56,4 % de los padres que criaron a menores usó el permiso por nacimiento, pero las reducciones de jornada siguen siendo diez veces más frecuentes en mujeres: el permiso igual es necesario, aunque no suficiente.",
    "supera": "El cuidado sigue recayendo en las mujeres",
    "fuente": "https://www.ine.es/dyngs/Prensa/es/mEPA2025.htm",
    "escalas": [
     "individuo"
    ],
    "subtemas": [
     "familia"
    ]
   },
   {
    "ambito": "Comunidad",
    "titulo": "Redes vecinales de detección y acompañamiento",
    "texto": "Vecinos, comercios, farmacias y voluntariado se coordinan con los servicios sociales para detectar a personas mayores solas y conectarlas con su barrio, como hace Radars en Barcelona. Más del 80 % de las personas atendidas por Radars declara sentirse menos sola y más integrada; la evidencia científica sobre intervenciones contra la soledad todavía es escasa y heterogénea, por lo que conviene evaluarlas.",
    "supera": "Una de cada cinco personas se siente sola",
    "fuente": "https://www.fundacionpilares.org/wp-content/uploads/2024/04/Radars.pdf",
    "escalas": [
     "individuo",
     "comunidad"
    ],
    "subtemas": [
     "soledad"
    ]
   },
   {
    "ambito": "Mundial",
    "titulo": "Invertir en cuidados como infraestructura social",
    "texto": "Tratar el cuidado como inversión pública, igual que carreteras o escuelas. La OIT estima que elevar la inversión en cuidados hasta el 18,3 % del PIB permitiría crear 475 millones de empleos en 2030, 269 millones más que en 2015, aliviando el trabajo no pagado de las mujeres.",
    "supera": "Un trabajo inmenso, invisible y desigual",
    "fuente": "https://news.un.org/es/story/2018/06/1436912",
    "escalas": [
     "planeta"
    ],
    "subtemas": [
     "familia"
    ]
   }
  ],
  "proyectos": [
   {
    "nombre": "Radars",
    "lugar": "Barcelona (España)",
    "tipo": "programa público municipal con red comunitaria",
    "texto": "Desde 2008-2009, vecinos, comercios, farmacias, voluntariado y entidades detectan y acompañan a personas mayores solas mediante llamadas de compañía y actividades del barrio. En 2024 atendió a 2.487 personas con 304 voluntarios y 58.340 llamadas, y estaba presente en 57 de los 73 barrios de la ciudad (dato de 2022).",
    "web": "https://ajuntament.barcelona.cat/usosdeltemps/en/actuacio/radars",
    "fuente": "https://ajuntament.barcelona.cat/usosdeltemps/en/actuacio/radars",
    "escalas": [
     "pueblo"
    ],
    "subtemas": [
     "soledad"
    ]
   },
   {
    "nombre": "Fundación Grandes Amigos",
    "lugar": "Madrid, Cantabria, Galicia, País Vasco, Extremadura y Comunidad Valenciana (España)",
    "tipo": "ONG / fundación",
    "texto": "Desde 2003 combate la soledad de las personas mayores creando vínculos de amistad y vecindad con voluntariado. En 2022 acompañó a 1.635 personas mayores con 2.152 voluntarios.",
    "web": "https://www.grandesamigos.org",
    "fuente": "https://fundacionlealtad.org/conoce-la-fundacion-grandes-amigos-ong-acreditada-por-fundacion-lealtad",
    "escalas": [
     "comunidad",
     "pais"
    ],
    "subtemas": [
     "soledad"
    ]
   },
   {
    "nombre": "Madrid Vecina",
    "lugar": "Madrid (barrios de Chopera, Pacífico y Los Ángeles) (España)",
    "tipo": "programa público municipal con ONG (Ayuntamiento de Madrid y Grandes Amigos)",
    "texto": "Red vecinal piloto para detectar la soledad de las personas mayores en la que participan 482 comercios y supermercados, 28 farmacias, 27 centros sociales y sanitarios y 41 recursos para mayores. El informe municipal no aporta aún evaluación de resultados ni fecha de inicio (por verificar).",
    "web": "https://www.madrid.es",
    "fuente": "https://www.madrid.es/UnidadesDescentralizadas/Mayores/Especial%20informativo/Soledad/Informe_MadridVecina.pdf",
    "escalas": [
     "comunidad"
    ],
    "subtemas": [
     "soledad"
    ]
   },
   {
    "nombre": "Observatorio Estatal de la Soledad No Deseada (SoledadES)",
    "lugar": "España (ámbito estatal)",
    "tipo": "observatorio impulsado por una fundación (Fundación ONCE)",
    "texto": "Mide y difunde datos sobre la soledad no deseada: su Barómetro 2024 (2.900 entrevistas) fijó la prevalencia en el 20 % de la población, y su estudio de costes la estimó en 14.141 millones de euros al año. Publica también un decálogo de políticas públicas contra la soledad.",
    "web": "https://www.soledades.es",
    "fuente": "https://sciencemediacentre.es/soledad-no-deseada-datos-evidencias-y-conceptos-para-informar-sobre-un-problema-de-salud-publica",
    "escalas": [
     "pais"
    ],
    "subtemas": [
     "soledad"
    ]
   },
   {
    "nombre": "Trabensol (por verificar)",
    "lugar": "Torremocha del Jarama, Madrid (España)",
    "tipo": "cooperativa de vivienda colaborativa sénior (cohousing)",
    "texto": "Cooperativa de personas mayores que diseñaron y gestionan su propio conjunto de viviendas con amplios espacios comunes para envejecer juntas con autonomía (por verificar: año de apertura, número de viviendas y actividad actual; no se pudo acceder a su web en esta investigación).",
    "web": "https://www.trabensol.org",
    "fuente": "https://www.trabensol.org",
    "escalas": [
     "comunidad",
     "pueblo"
    ],
    "subtemas": [
     "soledad",
     "vivienda"
    ]
   },
   {
    "nombre": "Viviendas intergeneracionales Plaza de América (por verificar)",
    "lugar": "Alicante (España)",
    "tipo": "programa público municipal de vivienda",
    "texto": "Edificio municipal de alquiler en el que conviven personas mayores y jóvenes que se comprometen a dedicar tiempo de ayuda vecinal a sus vecinos mayores (por verificar: cifras, año de inicio, web oficial y continuidad; no se pudo confirmar con fuentes en esta investigación).",
    "web": null,
    "fuente": null,
    "escalas": [
     "pueblo"
    ],
    "subtemas": [
     "soledad",
     "vivienda"
    ]
   },
   {
    "nombre": "Buurtzorg",
    "lugar": "Países Bajos (con réplicas en otros países)",
    "tipo": "empresa social sin ánimo de lucro de enfermería a domicilio",
    "texto": "Fundada en 2006 en Almelo por Jos de Blok, organiza la atención a domicilio en equipos autogestionados de 10-12 enfermeras por barrio y hoy reúne a más de 14.000 profesionales. Atiende a unas 80.000 personas y KPMG (2015) la identificó como proveedor de bajo coste.",
    "web": "https://www.buurtzorg.com",
    "fuente": "https://www.buurtzorg.com/about-us/",
    "escalas": [
     "continente",
     "planeta"
    ],
    "subtemas": [
     "profesionales"
    ]
   }
  ],
  "preguntas": [
   "Trabensol y las viviendas intergeneracionales de Alicante no se pudieron verificar con fuentes en esta ronda: ¿las mantenemos marcadas «por verificar» o las sustituimos por otros proyectos (por ejemplo, Siempre Acompañados de la Fundación «la Caixa» o Senda de Cuidados)?",
   "¿Incluimos la discapacidad como bloque propio (vida independiente, asistencia personal) o la dejamos integrada en el sistema de cuidados?",
   "¿El sector debe tratar también el cuidado de la infancia 0-3 años con datos de plazas y precios, o lo dejamos para el sector de Educación?",
   "¿Quieres destacar algún proyecto de cuidados cercano a la Comunidad Circular Humana (por ejemplo, una cooperativa de cuidados) como ejemplo propio?"
  ],
  "subtemas": [
   {
    "id": "familia",
    "nombre": "Familia y conciliación"
   },
   {
    "id": "soledad",
    "nombre": "Mayores y soledad"
   },
   {
    "id": "dependencia",
    "nombre": "Dependencia"
   },
   {
    "id": "profesionales",
    "nombre": "Profesionales del cuidado"
   },
   {
    "id": "vivienda",
    "nombre": "Vivienda colaborativa e intergeneracional"
   }
  ]
 }
];

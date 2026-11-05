// ============================================================================
// INVESTIGACIÓN POR TEMÁTICA (bots de búsqueda web, 2026-11-04)
// ============================================================================
// Datos clave con su fuente y las iniciativas CANDIDATAS a recibir parte de lo
// recaudado cada mes. Son candidatas, no elegidas: elegir a quién va el dinero
// es decisión de Eugenio y se hace en «Conocer más» con un clic. Comprobad cada
// una antes de comprometer dinero (web, forma jurídica, si acepta donaciones).
// Un mes ausente aquí es un mes sin investigar todavía, no un mes sin datos.
export interface DatoClave { dato: string; fuente: string; url: string }
export interface IniciativaCandidata { nombre: string; que_hace: string; ambito: string; web: string; por_que: string; donaciones: string }

export const INVESTIGACION_POR_MES: Record<number, { datos_clave: DatoClave[]; iniciativas: IniciativaCandidata[] }> = {
  "1": {
    "datos_clave": [
      {
        "dato": "El lince ibérico pasó de menos de 100 ejemplares en 2002 a 2.663 en 2025.",
        "fuente": "MITECO, censo de lince ibérico 2025 (junio 2026)",
        "url": "https://www.miteco.gob.es/es/prensa/ultimas-noticias/2026/junio/la-poblacion-de-lince-iberico-alcanzo-los-2-663-ejemplares-en-20.html"
      },
      {
        "dato": "De 273 linces muertos por causas no naturales en 2025, 212 murieron atropellados.",
        "fuente": "MITECO, censo de lince ibérico 2025 (junio 2026)",
        "url": "https://www.miteco.gob.es/es/prensa/ultimas-noticias/2026/junio/la-poblacion-de-lince-iberico-alcanzo-los-2-663-ejemplares-en-20.html"
      },
      {
        "dato": "49.505 de las 175.909 especies evaluadas por la UICN están amenazadas de extinción.",
        "fuente": "UICN, actualización de la Lista Roja (julio 2026)",
        "url": "https://iucn.org/press-release/202607/desert-frog-deep-sea-molluscs-remarkable-species-risk-iucn-red-list"
      },
      {
        "dato": "Las poblaciones de fauna salvaje vigiladas han caído un 73 % de media desde 1970.",
        "fuente": "WWF, Informe Planeta Vivo 2026",
        "url": "https://www.worldwildlife.org/news/press-releases/wildlife-population-sizes-decline-73-on-average-but-tiger-elephant-turtle-and-tuna-recoveries-offer-hope/"
      },
      {
        "dato": "El 61 % de las especies de aves del mundo tiene poblaciones en declive.",
        "fuente": "UICN, actualización de la Lista Roja (octubre 2025)",
        "url": "https://iucn.org/press-release/202510/arctic-seals-threatened-climate-change-birds-decline-globally-iucn-red-list"
      },
      {
        "dato": "El 44 % de las 892 especies de coral formador de arrecifes está amenazado de extinción.",
        "fuente": "UICN (octubre 2026)",
        "url": "https://iucn.org/press-release/202610/virtually-all-coral-reef-ecosystems-face-high-risk-collapse-50-years-iucn-red"
      },
      {
        "dato": "Ya conocemos 6.000 planetas fuera del sistema solar y hay más de 8.000 candidatos.",
        "fuente": "NASA (septiembre 2025)",
        "url": "https://www.nasa.gov/universe/exoplanets/nasas-tally-of-planets-outside-our-solar-system-reaches-6000/"
      },
      {
        "dato": "El cielo nocturno se ilumina un 9,6 % al año por la contaminación lumínica.",
        "fuente": "Kyba et al., Science (2023), vía NOIRLab",
        "url": "https://kpno.noirlab.edu/news/noirlab2302"
      }
    ],
    "iniciativas": [
      {
        "nombre": "GREFA (Grupo de Rehabilitación de la Fauna Autóctona y su Hábitat)",
        "que_hace": "Hospital de fauna salvaje que rescata, cura y libera animales, y cría y reintroduce especies amenazadas como el buitre negro.",
        "ambito": "España / local (Majadahonda, Madrid)",
        "web": "https://www.grefa.org",
        "por_que": "Protege especies concretas de nuestro entorno; más de 120.000 animales atendidos.",
        "donaciones": "sí"
      },
      {
        "nombre": "Fundación Oso Pardo",
        "que_hace": "Conserva al oso pardo cantábrico y su hábitat con patrullas de vigilancia, seguimiento científico y educación ambiental.",
        "ambito": "España (Cordillera Cantábrica)",
        "web": "https://fundacionosopardo.org",
        "por_que": "Un caso de recuperación de una especie al borde de la extinción en España.",
        "donaciones": "sí"
      },
      {
        "nombre": "Fundación Starlight",
        "que_hace": "Promovida por el Instituto de Astrofísica de Canarias, defiende el cielo nocturno y certifica destinos libres de contaminación lumínica.",
        "ambito": "España / Internacional",
        "web": "https://fundacionstarlight.org",
        "por_que": "Une cosmos y vida: proteger el cielo oscuro beneficia a las personas y a la fauna nocturna.",
        "donaciones": "no consta"
      },
      {
        "nombre": "DarkSky International",
        "que_hace": "ONG que combate la contaminación lumínica, impulsa leyes de iluminación responsable y certifica lugares de cielo oscuro.",
        "ambito": "Internacional",
        "web": "https://darksky.org",
        "por_que": "Recupera la vista de las estrellas, que perdemos un 9,6 % cada año.",
        "donaciones": "sí"
      },
      {
        "nombre": "Re:wild",
        "que_hace": "ONG que protege y restaura la naturaleza salvaje y busca especies perdidas para la ciencia con socios locales.",
        "ambito": "Internacional",
        "web": "https://www.rewild.org",
        "por_que": "Trabaja directamente contra la extinción a escala global.",
        "donaciones": "sí"
      }
    ]
  },
  "2": {
    "datos_clave": [
      {
        "dato": "La soledad afecta a 1 de cada 6 personas en el mundo.",
        "fuente": "OMS, Comisión sobre Conexión Social (junio 2025)",
        "url": "https://www.who.int/es/news-room/30-06-2025-social-connection-linked-to-improved-heath-and-reduced-risk-of-early-death"
      },
      {
        "dato": "La soledad se asocia a unas 871.000 muertes al año en el mundo.",
        "fuente": "OMS, Comisión sobre Conexión Social (junio 2025)",
        "url": "https://www.who.int/es/news-room/30-06-2025-social-connection-linked-to-improved-heath-and-reduced-risk-of-early-death"
      },
      {
        "dato": "Entre adolescentes, hasta 1 de cada 5 se siente solo, según la OMS.",
        "fuente": "OMS (2025), vía Chequeado",
        "url": "https://chequeado.com/el-explicador/salud-mental-1-de-cada-5-adolescentes-en-el-mundo-se-ven-afectados-por-la-soledad/"
      },
      {
        "dato": "1 de cada 5 personas en España sufre soledad no deseada.",
        "fuente": "Barómetro de la Soledad No Deseada en España 2024",
        "url": "https://lamoncloa.gob.es/serviciosdeprensa/notasprensa/derechos-sociales-consumo-agenda-2030/Documents/2024/10-06-24-barometro-soledad-2024.pdf"
      },
      {
        "dato": "En personas con discapacidad, la soledad no deseada es 30 puntos más frecuente.",
        "fuente": "Barómetro de la Soledad No Deseada 2024 (Fundación ONCE), vía Discapnet",
        "url": "https://www.discapnet.es/noticia/el-20-de-espanoles-se-siente-solo-y-la-prevalencia-de-soledad-es-30-puntos-superior-en"
      },
      {
        "dato": "840 millones de mujeres han sufrido violencia de pareja o sexual a lo largo de su vida.",
        "fuente": "OMS (noviembre 2025)",
        "url": "https://www.who.int/news/item/19-11-2025-lifetime-toll--840-million-women-faced-partner-or-sexual-violence"
      },
      {
        "dato": "Un estudio de Harvard de 85 años: las buenas relaciones nos hacen más felices y sanos.",
        "fuente": "Harvard Study of Adult Development, vía Harvard Gazette (2023)",
        "url": "https://news.harvard.edu/gazette/story/2023/02/work-out-daily-ok-but-how-socially-fit-are-you"
      }
    ],
    "iniciativas": [
      {
        "nombre": "Fundación Grandes Amigos",
        "que_hace": "Acompaña a personas mayores que viven solas con voluntariado y crea redes vecinales como el programa Grandes Vecinos.",
        "ambito": "España (Madrid, Barcelona y otras ciudades)",
        "web": "https://grandesamigos.org",
        "por_que": "Combate la soledad no deseada creando amistad y comunidad.",
        "donaciones": "sí"
      },
      {
        "nombre": "Fundación Adopta Un Abuelo",
        "que_hace": "Une a jóvenes voluntarios con personas mayores en residencias o en sus casas mediante visitas y llamadas.",
        "ambito": "España",
        "web": "https://adoptaunabuelo.org",
        "por_que": "Crea lazos entre generaciones y alivia la soledad de los mayores.",
        "donaciones": "sí"
      },
      {
        "nombre": "Fundación ANAR",
        "que_hace": "Teléfono y chat gratuitos y confidenciales para niños, adolescentes y familias en riesgo, con apoyo psicológico y jurídico.",
        "ambito": "España",
        "web": "https://www.anar.org",
        "por_que": "Protege a la infancia y ayuda a las familias a cuidar sus vínculos.",
        "donaciones": "sí"
      },
      {
        "nombre": "Equimundo",
        "que_hace": "Organización que promueve paternidades cuidadoras, masculinidades sanas y la prevención de la violencia en las relaciones.",
        "ambito": "Internacional",
        "web": "https://equimundo.org",
        "por_que": "Impulsa relaciones igualitarias, cuidado compartido y sin violencia.",
        "donaciones": "sí"
      }
    ]
  },
  "3": {
    "datos_clave": [
      {
        "dato": "2.100 millones de personas (1 de cada 4) aún no tienen agua potable segura.",
        "fuente": "OMS y UNICEF, informe JMP (agosto 2025)",
        "url": "https://www.who.int/news/item/26-08-2025-1-in-4-people-globally-still-lack-access-to-safe-drinking-water---who--unicef"
      },
      {
        "dato": "La ONU afirma que el mundo ha entrado en una era de «bancarrota hídrica» global.",
        "fuente": "Universidad de las Naciones Unidas, UNU-INWEH (enero 2026)",
        "url": "https://unu.edu/inweh/news/world-enters-era-of-global-water-bankruptcy"
      },
      {
        "dato": "El calor acumulado en los océanos batió un nuevo récord en 2025.",
        "fuente": "Cheng et al., Advances in Atmospheric Sciences (2026), vía UCAR",
        "url": "https://impacts.ucar.edu/en/publications/ocean-heat-content-sets-another-record-in-2025/"
      },
      {
        "dato": "Cada año llegan a ríos, lagos y mares entre 19 y 23 millones de toneladas de plástico.",
        "fuente": "PNUMA (Programa de la ONU para el Medio Ambiente)",
        "url": "https://www.unep.org/plastic-pollution"
      },
      {
        "dato": "La agricultura usa cerca del 70 % del agua dulce que se extrae en el mundo.",
        "fuente": "FAO AQUASTAT, vía Our World in Data",
        "url": "https://ourworldindata.org/grapher/agricultural-water-as-a-share-of-total-water-withdrawals"
      },
      {
        "dato": "Casi la mitad de los acuíferos de España (353 de 804) está en mal estado.",
        "fuente": "Planes hidrológicos 2022-2027, vía iAgua",
        "url": "https://www.iagua.es/noticias/redaccion/los-planes-2022-2027-situan-en-mal-estado-353-de-las-804-masas-de-agua-subterranea-espanolas"
      },
      {
        "dato": "En 2022 el Mar Menor fue el primer ecosistema de Europa con personalidad jurídica.",
        "fuente": "Ley 19/2022, BOE",
        "url": "https://www.boe.es/eli/es/l/2022/09/30/19"
      },
      {
        "dato": "En 2026 entró en vigor el Tratado de Alta Mar, que busca proteger el 30 % del océano.",
        "fuente": "ONU, vía Dawn (enero 2026)",
        "url": "https://www.dawn.com/news/1967482"
      }
    ],
    "iniciativas": [
      {
        "nombre": "ONGAWA Ingeniería para el Desarrollo Humano",
        "que_hace": "ONG de desarrollo que garantiza el derecho humano al agua y al saneamiento en comunidades de África y América Latina.",
        "ambito": "España (Madrid) / Internacional",
        "web": "https://ongawa.org",
        "por_que": "Lleva agua segura a quien no la tiene, con enfoque de derechos humanos.",
        "donaciones": "sí"
      },
      {
        "nombre": "ANSE (Asociación de Naturalistas del Sureste)",
        "que_hace": "Asociación que protege el Mar Menor y la costa de Murcia y restaura humedales como las salinas de Marchamalo.",
        "ambito": "España / local (Región de Murcia)",
        "web": "https://www.asociacionanse.org",
        "por_que": "Defiende un ecosistema acuático emblemático y amenazado de España.",
        "donaciones": "no consta"
      },
      {
        "nombre": "Surfrider Foundation Europe",
        "que_hace": "ONG que protege océanos, ríos y costas frente a la contaminación con ciencia ciudadana, recogidas de residuos e incidencia.",
        "ambito": "Europa (con antena en España)",
        "web": "https://surfrider.eu",
        "por_que": "Combate el plástico y la contaminación en el agua implicando a la ciudadanía.",
        "donaciones": "sí"
      },
      {
        "nombre": "charity: water",
        "que_hace": "ONG que financia pozos, sistemas de agua y saneamiento con socios locales en países con escasez de agua potable.",
        "ambito": "Internacional",
        "web": "https://www.charitywater.org",
        "por_que": "El 100 % de las donaciones públicas va a proyectos de agua.",
        "donaciones": "sí"
      }
    ]
  },
  "4": {
    "datos_clave": [
      {
        "dato": "Los bosques cubren 4.140 millones de hectáreas: el 32 % de la tierra emergida.",
        "fuente": "FAO, Evaluación de los Recursos Forestales Mundiales 2025",
        "url": "https://www.fao.org/newsroom/detail/global-deforestation-slows--but-forests-remain-under-pressure--fao-report-shows/en"
      },
      {
        "dato": "Entre 2015 y 2025 se deforestaron 10,9 millones de hectáreas de bosque cada año.",
        "fuente": "FAO, Evaluación de los Recursos Forestales Mundiales 2025",
        "url": "https://www.fao.org/newsroom/detail/global-deforestation-slows--but-forests-remain-under-pressure--fao-report-shows/en"
      },
      {
        "dato": "En 2024 se perdieron 6,7 millones de ha de selva tropical virgen: 18 campos de fútbol por min.",
        "fuente": "WRI / Global Forest Watch (2025)",
        "url": "https://wri.org/news/release-global-forest-loss-shatters-records-2024-fueled-massive-fires"
      },
      {
        "dato": "En 2024 el fuego causó casi la mitad de la pérdida de selva tropical virgen, por primera vez.",
        "fuente": "WRI / Global Forest Watch (2025)",
        "url": "https://wri.org/news/release-global-forest-loss-shatters-records-2024-fueled-massive-fires"
      },
      {
        "dato": "Las poblaciones de fauna salvaje vigiladas han caído de media un 73 % desde 1970.",
        "fuente": "WWF, Informe Planeta Vivo 2024",
        "url": "https://wwf.ca/media-releases/lpr-2024/"
      },
      {
        "dato": "Unas 48.646 de las 172.620 especies evaluadas por la UICN están amenazadas de extinción.",
        "fuente": "UICN, Lista Roja (actualización oct. 2025)",
        "url": "https://iucn.org/press-release/202510/arctic-seals-threatened-climate-change-birds-decline-globally-iucn-red-list"
      },
      {
        "dato": "En 2025 ardieron en España 354.747 ha forestales, más del triple de la media de la década.",
        "fuente": "MITECO, Avance estadístico de incendios forestales 2025",
        "url": "https://www.miteco.gob.es/content/dam/miteco/es/biodiversidad/temas/incendios-forestales/Avance_IIFF_2025_.pdf"
      },
      {
        "dato": "El 56 % de España es superficie forestal: 28,6 millones de hectáreas.",
        "fuente": "MITECO, Anuario de Estadística Forestal 2024",
        "url": "https://www.miteco.gob.es/content/dam/miteco/es/biodiversidad/estadisticas/aef/aef2024/anuario-estadistica-forestal-2024-datos.pdf"
      }
    ],
    "iniciativas": [
      {
        "nombre": "Fundación Lurgaia Fundazioa",
        "que_hace": "Compra o recibe en custodia terrenos degradados y los restaura con bosque autóctono; más de 870 ha en la costa cantábrica, con voluntariado.",
        "ambito": "España (Bizkaia y Gipuzkoa)",
        "web": "https://www.lurgaia.org/",
        "por_que": "Recupera bosque nativo y biodiversidad de forma permanente mediante la custodia del territorio.",
        "donaciones": "sí"
      },
      {
        "nombre": "Asociación para la Recuperación del Bosque Autóctono (ARBA)",
        "que_hace": "Asociación sin ánimo de lucro que recupera bosque autóctono con viveros, plantaciones voluntarias y educación ambiental.",
        "ambito": "España (Madrid y grupos locales)",
        "web": "https://www.arba-s.org/",
        "por_que": "Reforestación de base y comunitaria con especies autóctonas, hecha por voluntariado local.",
        "donaciones": "sí"
      },
      {
        "nombre": "Fundació Pau Costa",
        "que_hace": "Fundación dedicada a la ecología y prevención de incendios forestales: investigación, formación, paisajes resilientes y concienciación.",
        "ambito": "España (Taradell, Barcelona) / Europa",
        "web": "https://www.paucostafoundation.org/",
        "por_que": "Ataca el gran problema del bosque mediterráneo: los incendios, con prevención y cultura del riesgo.",
        "donaciones": "sí"
      },
      {
        "nombre": "WeForest",
        "que_hace": "ONG que restaura bosques y paisajes con comunidades locales en África y Sudamérica, midiendo carbono, biodiversidad y bienestar.",
        "ambito": "Internacional (sede en Bruselas)",
        "web": "https://www.weforest.org/",
        "por_que": "Restauración forestal a gran escala con resultados medidos y beneficio para las comunidades.",
        "donaciones": "sí"
      },
      {
        "nombre": "Rainforest Trust",
        "que_hace": "ONG que protege de forma permanente hábitats tropicales críticos con socios locales; más de 70 millones de acres protegidos.",
        "ambito": "Internacional (EE. UU. y Reino Unido)",
        "web": "https://www.rainforesttrust.org/",
        "por_que": "Protege selvas y especies amenazadas; destina el 100 % de las donaciones a proyectos.",
        "donaciones": "sí"
      }
    ]
  },
  "5": {
    "datos_clave": [
      {
        "dato": "El 64,9 % de la población de España lee al menos un libro al año, la cifra más alta registrada.",
        "fuente": "Ministerio de Cultura, Encuesta de Hábitos y Prácticas Culturales 2024-2025",
        "url": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/cultura/paginas/2025/081025-mejores-datos-consumo-cultural.aspx"
      },
      {
        "dato": "El 47,6 % de la población visitó un museo, una exposición o una galería en el último año.",
        "fuente": "Ministerio de Cultura, Encuesta de Hábitos y Prácticas Culturales 2024-2025",
        "url": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/cultura/paginas/2025/081025-mejores-datos-consumo-cultural.aspx"
      },
      {
        "dato": "Solo una de cada cuatro personas (24,7 %) fue al teatro en el último año.",
        "fuente": "Ministerio de Cultura, Encuesta de Hábitos y Prácticas Culturales 2024-2025",
        "url": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/cultura/paginas/2025/081025-mejores-datos-consumo-cultural.aspx"
      },
      {
        "dato": "La cultura da trabajo a 771.000 personas en España, el 3,6 % del empleo total (2024).",
        "fuente": "Ministerio de Cultura a partir de la EPA (INE), 2025",
        "url": "https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/cultura/paginas/2025/200225-empleo-cultural-2024.aspx"
      },
      {
        "dato": "Más de 3.000 estudios respaldan el papel de las artes en la prevención y cuidado de la salud.",
        "fuente": "OMS Europa, revisión de alcance sobre artes y salud (2019)",
        "url": "https://www.who.int/europe/publications/i/item/9789289054553"
      },
      {
        "dato": "La cultura genera el 3,39 % del PIB mundial y el 3,55 % del empleo.",
        "fuente": "UNESCO, Informe Mundial sobre Políticas Culturales 2025 (vía RTP)",
        "url": "https://www.rtp.pt/noticias/cultura/unesco-revela-que-cultura-gera-339-do-pib-mundial-e-355-do-emprego_n1687073"
      },
      {
        "dato": "Músicos, cineastas y escritores podrían perder hasta un 24 % de ingresos por la IA en 2028.",
        "fuente": "UNESCO, Re|Shaping Policies for Creativity 2026 (Noticias ONU)",
        "url": "https://news.un.org/es/story/2026/02/1541153"
      },
      {
        "dato": "La música está presente en todas las sociedades humanas estudiadas: es un rasgo universal.",
        "fuente": "Mehr et al., Science (2019)",
        "url": "https://pubmed.ncbi.nlm.nih.gov/31753969/"
      }
    ],
    "iniciativas": [
      {
        "nombre": "Fundación Cultura en Vena",
        "que_hace": "Lleva música en directo, artes y mediación cultural a hospitales públicos (Málaga, Pamplona, Zaragoza, Palma…) para pacientes y personal.",
        "ambito": "España",
        "web": "https://www.culturaenvena.org/",
        "por_que": "Usa el arte como cuidado y humaniza los hospitales; une arte y salud.",
        "donaciones": "sí"
      },
      {
        "nombre": "Barrios Orquestados",
        "que_hace": "Proyecto social que crea orquestas en barrios vulnerables y enseña música gratis a niños, niñas y familias.",
        "ambito": "Local (Canarias)",
        "web": "https://barriosorquestados.org/",
        "por_que": "Arte comunitario que transforma barrios; en 2026 evitó su cierre gracias a donaciones.",
        "donaciones": "sí"
      },
      {
        "nombre": "Payasos Sin Fronteras",
        "que_hace": "ONG que lleva espectáculos de payasos y artes escénicas a niñez y personas refugiadas en crisis humanitarias y conflictos.",
        "ambito": "España (Barcelona) / Internacional",
        "web": "https://clowns.org/",
        "por_que": "Demuestra que el arte y la risa son también ayuda humanitaria y alivio emocional.",
        "donaciones": "sí"
      },
      {
        "nombre": "Musicians without Borders",
        "que_hace": "ONG que usa la música para construir paz y sanar comunidades afectadas por guerras (Palestina, Kosovo, Ruanda, RD Congo…).",
        "ambito": "Internacional (sede en Ámsterdam)",
        "web": "https://www.musicianswithoutborders.org/",
        "por_que": "Música comunitaria como herramienta de paz, reconciliación y bienestar.",
        "donaciones": "sí"
      }
    ]
  },
  "6": {
    "datos_clave": [
      {
        "dato": "Unos 2.200 millones de personas en el mundo siguen sin usar Internet (2025).",
        "fuente": "UIT, Facts and Figures 2025",
        "url": "https://www.itu.int/itu-d/reports/statistics/facts-figures-2025/"
      },
      {
        "dato": "En 2025 el mundo instaló un récord de casi 700 GW de potencia renovable.",
        "fuente": "IRENA, Renewable Capacity Statistics 2026",
        "url": "https://www.irena.org/News/pressreleases/2026/Apr/Near-700-GW-Surge-in-2025-Proves-Renewable-Energy-Resilience-ES"
      },
      {
        "dato": "Las renovables ya son casi la mitad (49 %) de la potencia eléctrica instalada del mundo.",
        "fuente": "IRENA, Renewable Capacity Statistics 2026",
        "url": "https://www.irena.org/Publications/2026/Mar/Renewable-capacity-statistics-2026"
      },
      {
        "dato": "En 2024 se instalaron 585 GW renovables: más del 90 % de toda la nueva potencia eléctrica.",
        "fuente": "IRENA, Renewable Capacity Statistics 2025",
        "url": "https://www.irena.org/-/media/Files/IRENA/Agency/Publication/2025/Mar/IRENA_DAT_RE_Capacity_Statistics_2025.pdf"
      },
      {
        "dato": "En 2025 el 56,6 % de la electricidad generada en España fue renovable.",
        "fuente": "Red Eléctrica, balance 2025 (vía Review Energy)",
        "url": "https://www.review-energy.com/otras-fuentes/espana-aumenta-su-consumo-electrico-y-alcanza-un-56-6-de-generacion-renovable-en-2025"
      },
      {
        "dato": "El consumo eléctrico de los centros de datos se duplicará de aquí a 2030, impulsado por la IA.",
        "fuente": "Agencia Internacional de la Energía, Energy and AI (2025)",
        "url": "https://www.iea.org/reports/energy-and-ai/executive-summary"
      },
      {
        "dato": "La basura electrónica crece cinco veces más rápido que su reciclaje documentado.",
        "fuente": "UNITAR / UIT, Global E-waste Monitor 2024",
        "url": "https://unitar.org/index.php/about/news-stories/press/global-e-waste-monitor-2024-electronic-waste-rising-five-times-faster-documented-e-waste-recycling"
      }
    ],
    "iniciativas": [
      {
        "nombre": "Som Energia",
        "que_hace": "Cooperativa de consumo de energía verde sin ánimo de lucro: comercializa y produce electricidad renovable e impulsa autoconsumo colectivo.",
        "ambito": "España (sede en Girona)",
        "web": "https://www.somenergia.coop/es/",
        "por_que": "Energía renovable en manos de la ciudadanía, con gestión democrática y comunidades energéticas.",
        "donaciones": "no consta"
      },
      {
        "nombre": "ECODES (Fundación Ecología y Desarrollo)",
        "que_hace": "Fundación que combate la pobreza energética (iniciativa «Ni un hogar sin energía») y apoya comunidades energéticas y acción climática.",
        "ambito": "España (sede en Zaragoza)",
        "web": "https://ecodes.org/",
        "por_que": "Une transición energética y justicia social: que nadie se quede sin luz ni calefacción.",
        "donaciones": "sí"
      },
      {
        "nombre": "Fundación Esplai Ciudadanía Comprometida",
        "que_hace": "Fundación que reduce la brecha digital con formación TIC, la Red Conecta de puntos de inclusión digital y digitalización de ONG.",
        "ambito": "España",
        "web": "https://fundacionesplai.org/",
        "por_que": "Lleva la tecnología a quienes se quedan fuera: personas mayores, jóvenes vulnerables y entidades.",
        "donaciones": "no consta"
      },
      {
        "nombre": "AlgorithmWatch",
        "que_hace": "ONG que investiga y vigila los sistemas automatizados y la IA para proteger los derechos y combatir la discriminación algorítmica.",
        "ambito": "Internacional (Berlín y Zúrich)",
        "web": "https://algorithmwatch.org/en/",
        "por_que": "Defiende una IA ética, transparente y al servicio de las personas.",
        "donaciones": "sí"
      }
    ]
  },
  "7": {
    "datos_clave": [
      {
        "dato": "28.552 personas sin hogar fueron atendidas en centros en España en 2022: +24,5% desde 2012",
        "fuente": "INE, Encuesta a las Personas sin Hogar 2022",
        "url": "https://www.ine.es/prensa/epsh_2022.pdf"
      },
      {
        "dato": "2.800 millones de personas, el 40% de la humanidad, no tienen una vivienda adecuada",
        "fuente": "ONU-Hábitat (Noticias ONU, 2025)",
        "url": "https://news.un.org/en/story/2025/05/1163851"
      },
      {
        "dato": "Más de 1.120 millones viven en asentamientos informales y 300 millones no tienen ningún techo",
        "fuente": "ONU-Hábitat (Noticias ONU, 2025)",
        "url": "https://news.un.org/en/story/2025/05/1163851"
      },
      {
        "dato": "En 2024, el 17,5% de la población española no pudo mantener su casa caliente (UE: 9,2%)",
        "fuente": "Eurostat, 2026",
        "url": "https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20260202-2"
      },
      {
        "dato": "España tenía 3,84 millones de viviendas vacías en 2021: el 14,4% del parque",
        "fuente": "INE, Censo de Población y Viviendas 2021",
        "url": "https://ine.es/prensa/censo_2021_jun.pdf"
      },
      {
        "dato": "Faltan unas 750.000 viviendas en España para cubrir los hogares que se han formado",
        "fuente": "Banco de España, Informe Anual 2025 (vía Euronews)",
        "url": "https://es.euronews.com/business/2026/06/18/el-banco-de-espana-senala-un-deficit-de-750000"
      },
      {
        "dato": "El 45% de quienes alquilan en España está en riesgo de pobreza o exclusión: récord en la UE",
        "fuente": "Cáritas, IX Informe FOESSA (2025)",
        "url": "https://www.caritas.es/main-files/uploads/2025/11/20251105_NdP_IXInformeFOESSA.pdf"
      },
      {
        "dato": "Los edificios generan cerca del 37% de las emisiones de CO2 de la energía y los procesos",
        "fuente": "PNUMA, Global Status Report for Buildings and Construction 2024/2025",
        "url": "https://unep.org/news-and-stories/press-release/not-yet-built-purpose-global-building-sector-emissions-still-high"
      }
    ],
    "iniciativas": [
      {
        "nombre": "Arrels Fundació",
        "que_hace": "Acompaña a personas sin hogar en Barcelona: equipo de calle, centro abierto, vivienda y defensa de derechos.",
        "ambito": "local (Barcelona)",
        "web": "https://www.arrelsfundacio.org",
        "por_que": "ONG mediana y cercana que saca a gente de la calle y le da un hogar",
        "donaciones": "sí"
      },
      {
        "nombre": "Sostre Cívic",
        "que_hace": "Cooperativa sin ánimo de lucro que impulsa vivienda cooperativa en cesión de uso, asequible y no especulativa.",
        "ambito": "local (Cataluña)",
        "web": "https://sostrecivic.coop",
        "por_que": "Modelo de vivienda cooperativa: casa estable, precio justo y gestión comunitaria",
        "donaciones": "no consta"
      },
      {
        "nombre": "Provivienda",
        "que_hace": "Entidad social que trabaja desde 1989 por el derecho a la vivienda: inclusión residencial y alquiler asequible.",
        "ambito": "España",
        "web": "https://www.provivienda.org",
        "por_que": "Abre puertas a personas vulnerables y a un alquiler asequible",
        "donaciones": "sí"
      },
      {
        "nombre": "Arquitectura Sin Fronteras España",
        "que_hace": "ONG de arquitectos que mejora la habitabilidad de barrios vulnerables en España y en América Latina y África.",
        "ambito": "España / Internacional",
        "web": "https://asfes.org",
        "por_que": "Une vivienda digna, construcción sostenible y participación vecinal",
        "donaciones": "sí"
      },
      {
        "nombre": "Habitat for Humanity",
        "que_hace": "ONG internacional que construye y repara viviendas con las propias familias y voluntariado, en más de 60 países.",
        "ambito": "Internacional",
        "web": "https://www.habitat.org",
        "por_que": "Referente mundial en vivienda digna construida en comunidad",
        "donaciones": "sí"
      }
    ]
  },
  "8": {
    "datos_clave": [
      {
        "dato": "Más de 1.000 millones de personas en el mundo viven con un trastorno de salud mental",
        "fuente": "OMS, 2025",
        "url": "https://www.paho.org/en/news/2-9-2025-over-billion-people-living-mental-health-conditions-services-require-urgent-scale"
      },
      {
        "dato": "1 de cada 6 personas se siente sola; la soledad se asocia a 871.000 muertes al año",
        "fuente": "OMS, Comisión sobre Conexión Social (2025)",
        "url": "https://www.who.int/news/item/30-06-2025-social-connection-linked-to-improved-heath-and-reduced-risk-of-early-death"
      },
      {
        "dato": "1 de cada 5 personas en España sufre soledad no deseada",
        "fuente": "Barómetro de la Soledad No Deseada en España 2024",
        "url": "https://lamoncloa.gob.es/serviciosdeprensa/notasprensa/derechos-sociales-consumo-agenda-2030/Documents/2024/10-06-24-barometro-soledad-2024.pdf"
      },
      {
        "dato": "En 2021 hubo unos 727.000 suicidios en el mundo: más de 1 de cada 100 muertes",
        "fuente": "OMS, Suicide worldwide in 2021",
        "url": "https://www.who.int/publications/i/item/9789240110069"
      },
      {
        "dato": "En España se registraron 3.808 suicidios en 2025: más de 10 al día (datos provisionales)",
        "fuente": "INE, Defunciones según la causa de muerte 2025",
        "url": "https://ine.es/dyngs/Prensa/pEDCM2025.htm"
      },
      {
        "dato": "1.800 millones de adultos (31%) no hacen la actividad física mínima recomendada",
        "fuente": "OMS, 2024",
        "url": "https://www.who.int/news/item/26-06-2024-nearly-1.8-billion-adults-at-risk-of-disease-from-not-doing-enough-physical-activity"
      },
      {
        "dato": "Los cuidados no remunerados dejan a 708 millones de mujeres fuera del mercado laboral",
        "fuente": "OIT, 2024",
        "url": "https://www.ilo.org/resource/news/unpaid-care-work-prevents-708-million-women-participating-labour-market"
      },
      {
        "dato": "4.600 millones de personas no acceden a servicios de salud esenciales",
        "fuente": "OMS y Banco Mundial, informe de cobertura sanitaria universal 2025",
        "url": "https://www.who.int/news/item/06-12-2025-most-countries-make-progress-towards-universal-health-coverage-but-major-challenges-remain-who-world-bank-report-finds"
      }
    ],
    "iniciativas": [
      {
        "nombre": "Confederación SALUD MENTAL ESPAÑA",
        "que_hace": "Agrupa a federaciones y asociaciones de personas con problemas de salud mental y sus familias; defiende sus derechos.",
        "ambito": "España",
        "web": "https://consaludmental.org",
        "por_que": "Movimiento asociativo de base que lucha contra el estigma en salud mental",
        "donaciones": "sí"
      },
      {
        "nombre": "Teléfono de la Esperanza",
        "que_hace": "Ofrece atención telefónica gratuita y anónima en crisis emocionales, prevención del suicidio, talleres y grupos.",
        "ambito": "España",
        "web": "https://telefonodelaesperanza.org",
        "por_que": "Voluntariado que escucha en crisis y ayuda a prevenir el suicidio",
        "donaciones": "sí"
      },
      {
        "nombre": "Fundación Grandes Amigos",
        "que_hace": "Moviliza voluntariado que acompaña a personas mayores en situación de soledad no deseada en sus barrios.",
        "ambito": "España (Madrid, Barcelona y otras ciudades)",
        "web": "https://grandesamigos.org",
        "por_que": "Combate la soledad no deseada con vínculos vecinales",
        "donaciones": "sí"
      },
      {
        "nombre": "Fundación ANAR",
        "que_hace": "Teléfono y chat gratuito de ayuda a niños, niñas y adolescentes en riesgo, con atención psicológica, social y jurídica.",
        "ambito": "España",
        "web": "https://www.anar.org",
        "por_que": "La conducta suicida es el primer motivo de consulta de los menores en su línea",
        "donaciones": "sí"
      },
      {
        "nombre": "StrongMinds",
        "que_hace": "Trata la depresión en mujeres y adolescentes de África con terapia de grupo gratuita dirigida por personas formadas.",
        "ambito": "Internacional (África subsahariana)",
        "web": "https://strongminds.org",
        "por_que": "Salud mental accesible y de bajo coste donde casi no hay atención",
        "donaciones": "sí"
      }
    ]
  },
  "9": {
    "datos_clave": [
      {
        "dato": "Solo el 6,9% de los materiales que usa la economía mundial procede de material reciclado",
        "fuente": "Circle Economy, Circularity Gap Report 2025",
        "url": "https://circularity-gap.world/updates-collection/global-circularity-rate-fell-to-6-9---despite-growing-recycling"
      },
      {
        "dato": "En 2022 se generaron 62 millones de toneladas de basura electrónica; solo el 22,3% se recicló",
        "fuente": "UNITAR/UIT, Global E-waste Monitor 2024",
        "url": "https://unitar.org/about/news-stories/press/global-e-waste-monitor-2024-electronic-waste-rising-five-times-faster-documented-e-waste-recycling"
      },
      {
        "dato": "Algo más del 12% de los materiales que usa la UE proceden del reciclaje (récord en 2024)",
        "fuente": "Eurostat (Plataforma Europea de Economía Circular)",
        "url": "https://circulareconomy.europa.eu/platform/en/news-and-events/all-news/circular-material-use-rate-eu-reached-highest-level-yet-2024"
      },
      {
        "dato": "3 millones de cooperativas dan empleo a cerca del 10% de la población ocupada del mundo",
        "fuente": "Alianza Cooperativa Internacional",
        "url": "https://www.ica.coop/en/facts-and-figures"
      },
      {
        "dato": "La economía social supone en torno al 10% del PIB español, con más de 70.000 empresas",
        "fuente": "CEPES (vía Economía de Mallorca, 2025)",
        "url": "https://www.economiademallorca.com/articulo/economia-nacional/economia-social-representa-torno-10-pib-espanol-mas-70000-empresas/20251219094050114733.html"
      },
      {
        "dato": "La riqueza de los milmillonarios alcanzó en 2025 un récord de 18,3 billones de dólares",
        "fuente": "Oxfam, informe sobre desigualdad (Davos 2026)",
        "url": "https://www.oxfam.org.uk/get-involved/campaign-with-oxfam/fight-inequality/oxfams-global-inequality-report/"
      },
      {
        "dato": "Cerca de 1 de cada 4 personas en España está en riesgo de pobreza o exclusión social",
        "fuente": "INE, Encuesta de Condiciones de Vida 2025",
        "url": "https://ine.es/dyngs/Prensa/ECV2025.htm"
      },
      {
        "dato": "La precariedad laboral afecta al 47,5% de la población activa española: 11,5 millones",
        "fuente": "Cáritas, IX Informe FOESSA (2025)",
        "url": "https://www.caritas.es/main-files/uploads/2025/11/20251105_NdP_IXInformeFOESSA.pdf"
      }
    ],
    "iniciativas": [
      {
        "nombre": "REAS Red de Redes de Economía Alternativa y Solidaria",
        "que_hace": "Red estatal que agrupa redes territoriales y sectoriales de economía solidaria; impulsa mercados sociales y la auditoría social.",
        "ambito": "España",
        "web": "https://www.economiasolidaria.org",
        "por_que": "Articula desde hace 30 años la economía social y solidaria en España",
        "donaciones": "no consta"
      },
      {
        "nombre": "Coop57",
        "que_hace": "Cooperativa de servicios financieros éticos: con el ahorro de sus socias presta dinero a cooperativas y entidades de la economía social.",
        "ambito": "España (Cataluña, Madrid, Andalucía y otras)",
        "web": "https://coop57.coop",
        "por_que": "Finanzas éticas cooperativas: el ahorro se queda en proyectos transformadores",
        "donaciones": "no consta"
      },
      {
        "nombre": "Emaús Fundación Social",
        "que_hace": "Fundación que une economía circular e inclusión: recoge, repara y revende ropa, muebles y aparatos y crea empleo para personas vulnerables.",
        "ambito": "local (Gipuzkoa, País Vasco)",
        "web": "https://www.emaus.com",
        "por_que": "Une reutilización de residuos y empleo para personas en exclusión",
        "donaciones": "sí"
      },
      {
        "nombre": "Oikocredit",
        "que_hace": "Cooperativa internacional de inversión de impacto que financia microfinanzas, agricultura y energía renovable en África, Asia y América Latina.",
        "ambito": "Internacional",
        "web": "https://www.oikocredit.coop",
        "por_que": "50 años llevando finanzas éticas a comunidades de bajos ingresos",
        "donaciones": "no consta"
      },
      {
        "nombre": "Ellen MacArthur Foundation",
        "que_hace": "Organización benéfica británica que impulsa la transición a una economía circular con investigación, educación y redes de empresas y gobiernos.",
        "ambito": "Internacional",
        "web": "https://www.ellenmacarthurfoundation.org",
        "por_que": "Referente mundial que difunde y promueve la economía circular",
        "donaciones": "sí"
      }
    ]
  },
  "10": {
    "datos_clave": [
      {
        "dato": "En 2025 unos 645 millones de personas pasaron hambre: el 7,8 % de la humanidad.",
        "fuente": "FAO y otros, SOFI 2026 (Noticias ONU, 22/07/2026)",
        "url": "https://www.un.org/es/node/246095"
      },
      {
        "dato": "2.690 millones de personas no pueden permitirse una dieta saludable (2025).",
        "fuente": "FAO y otros, SOFI 2026 (Noticias ONU)",
        "url": "https://www.un.org/es/node/246095"
      },
      {
        "dato": "En 2022 se tiraron 1.050 millones de toneladas de comida; el 60 % en los hogares.",
        "fuente": "PNUMA, Food Waste Index Report 2024 (Noticias ONU)",
        "url": "https://news.un.org/en/node/1148036"
      },
      {
        "dato": "El desperdicio de alimentos genera hasta el 10 % de las emisiones mundiales de GEI.",
        "fuente": "PNUMA, Food Waste Index Report 2024 (Noticias ONU)",
        "url": "https://news.un.org/en/node/1148036"
      },
      {
        "dato": "En 2024 España desperdició 1.125 millones de kg de alimentos: 24,4 kg por persona.",
        "fuente": "Ministerio de Agricultura, Pesca y Alimentación (MAPA), informe 2024",
        "url": "https://www.mapa.gob.es/es/prensa/ultimas-noticias/detalle_noticias/el-desperdicio-alimentario-en-espa-a-se-ha-reducido-el-4-4---en-2024--hasta-los-1.125-millones-de-kilos/6b13413a-ce02-436a-820a-c1e0f8387cb5"
      },
      {
        "dato": "Unos 4,7 millones de personas en España (≈10 %) sufren inseguridad alimentaria leve o moderada.",
        "fuente": "Cáritas Española, nota de prensa Día Mundial de la Alimentación 2025",
        "url": "https://www.caritas.es/main-files/uploads/2025/10/20251016NdP_DiaAlimentacion.pdf"
      },
      {
        "dato": "El 95 % de los alimentos que comemos se produce directamente en el suelo.",
        "fuente": "FAO",
        "url": "https://www.fao.org/countryprofiles/news-archive/detail-news/en/c/1729967/"
      },
      {
        "dato": "España lidera la UE en superficie ecológica: 2,94 millones de ha en 2024 (12,3 % de la SAU).",
        "fuente": "Ministerio de Agricultura, Pesca y Alimentación (MAPA), producción ecológica 2024",
        "url": "https://www.mapa.gob.es/es/prensa/ultimas-noticias/detalle_noticias/espa-a-se-consolida-como-primer-pa-s-europeo-en-superficie-de-producci-n-ecol-gica--con-casi-tres-millones-de-hect-reas/3a22a874-d824-4cd7-afdd-f09fb40ebf8a"
      }
    ],
    "iniciativas": [
      {
        "nombre": "Fundació Espigoladors",
        "que_hace": "Recupera en el campo fruta y verdura descartada con voluntariado, la reparte a entidades sociales y la convierte en conservas con empleo de inserción.",
        "ambito": "local (Cataluña)",
        "web": "https://espigoladors.cat/",
        "por_que": "Une la lucha contra el desperdicio, el derecho a la alimentación y la inclusión laboral.",
        "donaciones": "no consta"
      },
      {
        "nombre": "Justicia Alimentaria",
        "que_hace": "ONG que desde 1987 investiga, denuncia, hace campañas y cooperación por una alimentación saludable, justa y sostenible.",
        "ambito": "España / Internacional",
        "web": "https://justiciaalimentaria.org/",
        "por_que": "Trabaja la soberanía alimentaria y los comedores escolares, con independencia política.",
        "donaciones": "sí"
      },
      {
        "nombre": "CERAI (Centro de Estudios Rurales y de Agricultura Internacional)",
        "que_hace": "ONGD que impulsa la agroecología y la soberanía alimentaria con proyectos rurales en España y de cooperación internacional.",
        "ambito": "España (València, Aragón) / Internacional",
        "web": "https://cerai.org/",
        "por_que": "Apoya a pequeños productores y sistemas alimentarios locales y sostenibles.",
        "donaciones": "no consta"
      },
      {
        "nombre": "Acción contra el Hambre",
        "que_hace": "Previene y trata la desnutrición y trabaja en seguridad alimentaria, agua y saneamiento en unos 55 países, además de acción social en España.",
        "ambito": "Internacional / España",
        "web": "https://www.accioncontraelhambre.org/es",
        "por_que": "Actúa directamente contra el hambre en las crisis alimentarias más graves del mundo.",
        "donaciones": "sí"
      },
      {
        "nombre": "Slow Food (Fondazione Slow Food ETS)",
        "que_hace": "Movimiento presente en más de 160 países que protege alimentos tradicionales en riesgo (Arca del Gusto, Baluartes) y crea huertos en África.",
        "ambito": "Internacional",
        "web": "https://www.slowfood.com/",
        "por_que": "Defiende la biodiversidad alimentaria, la cultura culinaria y a quienes producen.",
        "donaciones": "sí"
      }
    ]
  },
  "11": {
    "datos_clave": [
      {
        "dato": "La democracia en el mundo ha retrocedido a niveles de 1978.",
        "fuente": "V-Dem Institute, Informe sobre la Democracia 2026",
        "url": "https://www.v-dem.net/documents/76/V-Dem_Institute_Democracy_Report_2026_Spanish_lowres.pdf"
      },
      {
        "dato": "La libertad global ha caído por 20.º año consecutivo, según Freedom House (2026).",
        "fuente": "Freedom House, Freedom in the World 2026 (vía Renascença)",
        "url": "https://rr.pt/noticia/mundo/2026/03/19/liberdade-global-cai-pelo-20-ano-consecutivo/463606/"
      },
      {
        "dato": "La participación electoral mundial ha caído unos 10 puntos desde 2008.",
        "fuente": "International IDEA, The Global State of Democracy 2024",
        "url": "https://www.idea.int/news/credibility-elections-under-threat-worldwide"
      },
      {
        "dato": "Las mujeres ocupan solo el 27,5 % de los escaños parlamentarios del mundo (2026).",
        "fuente": "Unión Interparlamentaria (UIP), Women in Parliament",
        "url": "https://www.ipu.org/news/press-releases/2026-03/womens-representation-in-parliament-sees-sluggish-gains"
      },
      {
        "dato": "Solo 1 de cada 7 países del mundo está liderado por una mujer.",
        "fuente": "Datos de la ONU (vía Down To Earth)",
        "url": "https://www.downtoearth.org.in/governance/women-still-shut-out-of-global-political-power-only-1-in-7-countries-led-by-women-un-data-shows"
      },
      {
        "dato": "En la OCDE solo el 31 % siente que tiene voz en las decisiones públicas (2024).",
        "fuente": "OCDE, Encuesta sobre los motores de la confianza 2024 (vía Portafolio)",
        "url": "https://www.portafolio.co/internacional/ocde-confianza-en-los-gobiernos-se-estabiliza-pero-el-31-siente-que-tiene-voz-en-las-decisiones-publicas-497139"
      },
      {
        "dato": "El 37 % de los españoles confía alto o moderadamente en el Gobierno, algo bajo la media OCDE.",
        "fuente": "OCDE, Encuesta sobre los motores de la confianza 2024: España",
        "url": "https://www.oecd.org/es/publications/encuesta-de-la-ocde-sobre-los-motores-de-la-confianza-2024_85bdcdc0-es/espana_8001cc25-es"
      },
      {
        "dato": "España obtuvo 55/100 en el Índice de Percepción de la Corrupción 2025: puesto 49.",
        "fuente": "Transparency International España, IPC 2025",
        "url": "https://transparencia.org.es/actualidad/indice-de-percepcion-de-la-corrupcion-2025/"
      }
    ],
    "iniciativas": [
      {
        "nombre": "Transparency International España",
        "que_hace": "Capítulo español de Transparency International: promueve la transparencia y la lucha contra la corrupción y publica el IPC en España.",
        "ambito": "España",
        "web": "https://transparencia.org.es/",
        "por_que": "Mejora la rendición de cuentas de las instituciones, sin vínculos partidistas.",
        "donaciones": "no consta"
      },
      {
        "nombre": "Political Watch",
        "que_hace": "Organización independiente que analiza políticas públicas y la actividad parlamentaria para hacerlas más transparentes y comprensibles.",
        "ambito": "España",
        "web": "https://politicalwatch.es/",
        "por_que": "Acerca a la ciudadanía lo que hacen sus representantes, con datos y sin partidismo.",
        "donaciones": "no consta"
      },
      {
        "nombre": "Fundación Ciudadana Civio",
        "que_hace": "Periodismo de datos y vigilancia de los poderes públicos: investiga y explica presupuestos, BOE, contratos y ayudas, y defiende el acceso a datos públicos.",
        "ambito": "España",
        "web": "https://civio.es/",
        "por_que": "Refuerza la transparencia y el derecho a saber, con independencia y sin partidismo.",
        "donaciones": "sí"
      },
      {
        "nombre": "Access Info Europe",
        "que_hace": "ONG con sede en Madrid que defiende el derecho de acceso a la información pública en España y Europa, con litigios, campañas e investigación.",
        "ambito": "Internacional (sede en Madrid)",
        "web": "https://www.access-info.org/es/",
        "por_que": "Defiende el derecho ciudadano a saber qué deciden las instituciones y por qué.",
        "donaciones": "no consta"
      },
      {
        "nombre": "CIVICUS",
        "que_hace": "Alianza mundial de sociedad civil que mide y defiende el espacio cívico (libertad de asociación, reunión y expresión) con el CIVICUS Monitor.",
        "ambito": "Internacional",
        "web": "https://www.civicus.org/",
        "por_que": "Protege las libertades que hacen posible la participación ciudadana en todo el mundo.",
        "donaciones": "no consta"
      }
    ]
  },
  "12": {
    "datos_clave": [
      {
        "dato": "En 2025 hubo 65 conflictos armados con Estados implicados, el nivel más alto desde 1946.",
        "fuente": "Uppsala Conflict Data Program (UCDP), Universidad de Uppsala, junio 2026",
        "url": "https://www.uu.se/en/press/press-releases/2026/2026-06-09-ucdp-record-number-of-conflicts-between-states"
      },
      {
        "dato": "El Índice de Paz Global 2026 sitúa la paz mundial en su nivel más bajo registrado.",
        "fuente": "Institute for Economics and Peace, Global Peace Index 2026",
        "url": "https://www.visionofhumanity.org/record-conflicts-drive-peace-to-historic-low-as-ai-warfare-surges/"
      },
      {
        "dato": "El gasto militar mundial batió récord en 2025: 2,89 billones de dólares.",
        "fuente": "SIPRI, Trends in World Military Expenditure 2025",
        "url": "https://www.sipri.org/publications/2026/sipri-fact-sheets/trends-world-military-expenditure-2025"
      },
      {
        "dato": "117 millones de personas vivían desplazadas por la fuerza a finales de 2025.",
        "fuente": "ACNUR, Tendencias Globales 2025 (junio 2026)",
        "url": "https://www.acnur.org/tendencias-globales"
      },
      {
        "dato": "1 de cada 5 niños y niñas del mundo (unos 520 millones) vivía en zonas de conflicto en 2024.",
        "fuente": "PRIO / Save the Children, Children affected by armed conflict 1990–2024",
        "url": "https://www.prio.org/comments/1829"
      },
      {
        "dato": "Los delitos e incidentes de odio en España subieron un 23,6 % en 2025: récord histórico.",
        "fuente": "Ministerio del Interior, Informe sobre delitos de odio 2025",
        "url": "https://www.interior.gob.es/opencms/es/detalle/articulo/Los-delitos-e-incidentes-de-odio-aumentaron-un-236-por-ciento-en-2025-y-registraron-la-mayor-cifra-de-la-serie-historica/"
      },
      {
        "dato": "En 2024, la mitad de los delitos de odio en España fueron por racismo o xenofobia.",
        "fuente": "Ministerio del Interior, Informe sobre delitos de odio 2024 (vía EFE/ABC)",
        "url": "https://www.abc.com.py/internacionales/2025/07/18/la-mitad-de-los-delitos-de-odio-en-espana-en-2024-fueron-por-racismo-segun-informe/"
      }
    ],
    "iniciativas": [
      {
        "nombre": "Gernika Gogoratuz – Centro de Investigación por la Paz",
        "que_hace": "Centro nacido de la memoria del bombardeo de Gernika que investiga, educa y acompaña procesos de paz, reconciliación y transformación de conflictos.",
        "ambito": "local (Gernika, Euskadi)",
        "web": "https://www.gernikagogoratuz.org/",
        "por_que": "Convierte la memoria de la guerra en educación para la paz y la convivencia.",
        "donaciones": "no consta"
      },
      {
        "nombre": "CEAR (Comisión Española de Ayuda al Refugiado)",
        "que_hace": "ONG que acoge y acompaña a personas refugiadas y migrantes en España, con asistencia jurídica, inclusión y defensa del derecho de asilo.",
        "ambito": "España",
        "web": "https://www.cear.es/",
        "por_que": "Defiende la dignidad y los derechos humanos de quienes huyen de guerras y persecución.",
        "donaciones": "no consta"
      },
      {
        "nombre": "Asociación Comunicación Noviolenta (ACNV)",
        "que_hace": "Asociación que difunde la Comunicación No Violenta de Marshall Rosenberg en España con formación y actividades; recauda microdonaciones en Teaming.",
        "ambito": "España",
        "web": "https://www.teaming.net/asociacion-comunicacion-noviolenta-acnv",
        "por_que": "Encaja de lleno con la CNV que el calendario propone practicar este mes.",
        "donaciones": "sí"
      },
      {
        "nombre": "Peace Brigades International (PBI)",
        "que_hace": "Envía equipos internacionales de acompañamiento protector a defensoras y defensores de derechos humanos amenazados; tiene sección en el Estado español.",
        "ambito": "Internacional / España",
        "web": "https://peacebrigades.org/en",
        "por_que": "Protege, desde la noviolencia, a quienes defienden los derechos humanos.",
        "donaciones": "no consta"
      },
      {
        "nombre": "Center for Nonviolent Communication (CNVC)",
        "que_hace": "Organización sin ánimo de lucro fundada por Marshall Rosenberg que forma y certifica en CNV y la difunde por todo el mundo.",
        "ambito": "Internacional",
        "web": "https://www.cnvc.org/",
        "por_que": "Es la entidad de origen de la CNV, eje de la franja de este mes.",
        "donaciones": "sí"
      }
    ]
  }
};

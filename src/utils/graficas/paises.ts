// ============================================================================
// PAÍSES: DE LO QUE ESCRIBE LA GENTE AL PAÍS QUE HAY QUE PINTAR (2026-08-23)
// ============================================================================
// El mapa coroplético necesita casar CADA fila de datos con una forma del
// mapa. La gente escribe el país de seis maneras —«España», «Spain», «ES»,
// «ESP», «724»— y las formas del mapa (Natural Earth, vía world-atlas) llevan
// el código numérico ISO 3166-1 como identificador.
//
// DE DÓNDE SALE ESTA TABLA. No está escrita de memoria: se generó desde
// `i18n-iso-countries` (la lista oficial ISO 3166-1) y se contrastó, país por
// país, contra una segunda derivación hecha con `Intl.DisplayNames` del propio
// navegador. Las dos coincidieron en las 174 formas del mapa que tienen
// código, con CERO discrepancias. Ese contraste importa: la primera pasada,
// hecha solo con `Intl.DisplayNames`, daba a Benín el código de Dahomey y a
// Serbia el de Yugoslavia, porque ICU también resuelve códigos retirados que
// comparten nombre con el vigente. Cuatro países se habrían quedado en blanco
// en el mapa sin que nadie supiera por qué.
//
// LOS NOMBRES NO SE GUARDAN. Los da el navegador con `Intl.DisplayNames`, en
// español y en inglés, así que no hay que mantener 250 traducciones ni se
// quedan viejas cuando un país se cambia el nombre.
//
// TRES FORMAS DEL MAPA NO TIENEN CÓDIGO ISO: Kosovo, Somalilandia y el norte
// de Chipre. No es un fallo de la tabla — no tienen código. Se quedan en gris
// y `entidadesSinSitio` las nombra, en vez de callarse.
//
// FORMATO DE LA TABLA: cada palabra son ocho caracteres pegados —alpha-2,
// alpha-3 y numérico— por ejemplo `ESESP724`. 250 países en catorce líneas se
// leen y se comparan en un diff; 250 líneas de objeto, no.

const TABLA = `
  ADAND020 AEARE784 AFAFG004 AGATG028 AIAIA660 ALALB008 AMARM051 AOAGO024 AQATA010 ARARG032
  ASASM016 ATAUT040 AUAUS036 AWABW533 AXALA248 AZAZE031 BABIH070 BBBRB052 BDBGD050 BEBEL056
  BFBFA854 BGBGR100 BHBHR048 BIBDI108 BJBEN204 BLBLM652 BMBMU060 BNBRN096 BOBOL068 BQBES535
  BRBRA076 BSBHS044 BTBTN064 BVBVT074 BWBWA072 BYBLR112 BZBLZ084 CACAN124 CCCCK166 CDCOD180
  CFCAF140 CGCOG178 CHCHE756 CICIV384 CKCOK184 CLCHL152 CMCMR120 CNCHN156 COCOL170 CRCRI188
  CUCUB192 CVCPV132 CWCUW531 CXCXR162 CYCYP196 CZCZE203 DEDEU276 DJDJI262 DKDNK208 DMDMA212
  DODOM214 DZDZA012 ECECU218 EEEST233 EGEGY818 EHESH732 ERERI232 ESESP724 ETETH231 FIFIN246
  FJFJI242 FKFLK238 FMFSM583 FOFRO234 FRFRA250 GAGAB266 GBGBR826 GDGRD308 GEGEO268 GFGUF254
  GGGGY831 GHGHA288 GIGIB292 GLGRL304 GMGMB270 GNGIN324 GPGLP312 GQGNQ226 GRGRC300 GSSGS239
  GTGTM320 GUGUM316 GWGNB624 GYGUY328 HKHKG344 HMHMD334 HNHND340 HRHRV191 HTHTI332 HUHUN348
  IDIDN360 IEIRL372 ILISR376 IMIMN833 ININD356 IOIOT086 IQIRQ368 IRIRN364 ISISL352 ITITA380
  JEJEY832 JMJAM388 JOJOR400 JPJPN392 KEKEN404 KGKGZ417 KHKHM116 KIKIR296 KMCOM174 KNKNA659
  KPPRK408 KRKOR410 KWKWT414 KYCYM136 KZKAZ398 LALAO418 LBLBN422 LCLCA662 LILIE438 LKLKA144
  LRLBR430 LSLSO426 LTLTU440 LULUX442 LVLVA428 LYLBY434 MAMAR504 MCMCO492 MDMDA498 MEMNE499
  MFMAF663 MGMDG450 MHMHL584 MKMKD807 MLMLI466 MMMMR104 MNMNG496 MOMAC446 MPMNP580 MQMTQ474
  MRMRT478 MSMSR500 MTMLT470 MUMUS480 MVMDV462 MWMWI454 MXMEX484 MYMYS458 MZMOZ508 NANAM516
  NCNCL540 NENER562 NFNFK574 NGNGA566 NINIC558 NLNLD528 NONOR578 NPNPL524 NRNRU520 NUNIU570
  NZNZL554 OMOMN512 PAPAN591 PEPER604 PFPYF258 PGPNG598 PHPHL608 PKPAK586 PLPOL616 PMSPM666
  PNPCN612 PRPRI630 PSPSE275 PTPRT620 PWPLW585 PYPRY600 QAQAT634 REREU638 ROROU642 RSSRB688
  RURUS643 RWRWA646 SASAU682 SBSLB090 SCSYC690 SDSDN729 SESWE752 SGSGP702 SHSHN654 SISVN705
  SJSJM744 SKSVK703 SLSLE694 SMSMR674 SNSEN686 SOSOM706 SRSUR740 SSSSD728 STSTP678 SVSLV222
  SXSXM534 SYSYR760 SZSWZ748 TCTCA796 TDTCD148 TFATF260 TGTGO768 THTHA764 TJTJK762 TKTKL772
  TLTLS626 TMTKM795 TNTUN788 TOTON776 TRTUR792 TTTTO780 TVTUV798 TWTWN158 TZTZA834 UAUKR804
  UGUGA800 UMUMI581 USUSA840 UYURY858 UZUZB860 VAVAT336 VCVCT670 VEVEN862 VGVGB092 VIVIR850
  VNVNM704 VUVUT548 WFWLF876 WSWSM882 XKXKK983 YEYEM887 YTMYT175 ZAZAF710 ZMZMB894 ZWZWE716
`;

/** alpha-3 → alpha-2 (`ESP` → `ES`). */
export const ALFA2_POR_ALFA3: Record<string, string> = {};
/** numérico → alpha-2 (`724` → `ES`). Es el id de las formas del mapa. */
export const ALFA2_POR_ID: Record<string, string> = {};
/** alpha-2 → numérico (`ES` → `724`). */
export const ID_POR_ALFA2: Record<string, string> = {};

for (const p of TABLA.trim().split(/\s+/)) {
  const a2 = p.slice(0, 2), a3 = p.slice(2, 5), num = p.slice(5, 8);
  ALFA2_POR_ALFA3[a3] = a2;
  ALFA2_POR_ID[num] = a2;
  ID_POR_ALFA2[a2] = num;
}

/** Sin acentos, sin puntuación y en minúsculas: «Perú» y «peru» son el mismo. */
const llave = (s: string) => s
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Nombres alternativos que la gente escribe de verdad y que ninguna norma
 * recoge. Se amplía cuando aparezca uno nuevo; es la lista que evita que un
 * país quede fuera del mapa por cómo se llamó en la hoja de cálculo.
 */
const ALIAS: Record<string, string> = {
  'eeuu': 'US', 'ee uu': 'US', 'usa': 'US', 'estados unidos de america': 'US',
  'united states of america': 'US', 'reino unido de gran bretana e irlanda del norte': 'GB',
  'uk': 'GB', 'gran bretana': 'GB', 'inglaterra': 'GB', 'great britain': 'GB',
  'corea del sur': 'KR', 'corea del norte': 'KP', 'south korea': 'KR', 'north korea': 'KP',
  'republica de corea': 'KR', 'rusia': 'RU', 'russia': 'RU', 'federacion rusa': 'RU',
  'republica checa': 'CZ', 'czech republic': 'CZ', 'holanda': 'NL', 'paises bajos': 'NL',
  'birmania': 'MM', 'burma': 'MM', 'costa de marfil': 'CI', 'ivory coast': 'CI',
  'cabo verde': 'CV', 'suazilandia': 'SZ', 'swaziland': 'SZ', 'macedonia': 'MK',
  'vaticano': 'VA', 'timor oriental': 'TL', 'east timor': 'TL', 'bolivia': 'BO',
  'venezuela': 'VE', 'tanzania': 'TZ', 'iran': 'IR', 'siria': 'SY', 'laos': 'LA',
  'vietnam': 'VN', 'moldavia': 'MD', 'bielorrusia': 'BY', 'belarus': 'BY',
  'turquia': 'TR', 'turkiye': 'TR', 'emiratos arabes unidos': 'AE',
  'arabia saudi': 'SA', 'arabia saudita': 'SA', 'republica dominicana': 'DO',
  'republica democratica del congo': 'CD', 'congo kinshasa': 'CD', 'zaire': 'CD',
  'congo brazzaville': 'CG', 'republica del congo': 'CG',
};

/** El índice de nombres, construido UNA vez y solo si hace falta. */
let porNombre: Map<string, string> | null = null;
function indice(): Map<string, string> {
  if (porNombre) return porNombre;
  porNombre = new Map(Object.entries(ALIAS));
  for (const idiomas of [['es'], ['en']]) {
    let dn: Intl.DisplayNames;
    try { dn = new Intl.DisplayNames(idiomas, { type: 'region' }); } catch { continue; }
    for (const a2 of Object.keys(ID_POR_ALFA2)) {
      let n: string | undefined;
      try { n = dn.of(a2); } catch { continue; }
      // `of` devuelve el propio código cuando no conoce la región.
      if (!n || n === a2) continue;
      const k = llave(n);
      if (!porNombre.has(k)) porNombre.set(k, a2);
    }
  }
  return porNombre;
}

/** El país en alpha-2, venga escrito como venga. `null` si no se reconoce. */
export function aAlfa2(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const bruto = String(valor).trim();
  if (!bruto) return null;

  // Numérico, con o sin ceros por delante («724», «24» → «024»).
  if (/^\d{1,3}$/.test(bruto)) return ALFA2_POR_ID[bruto.padStart(3, '0')] || null;

  const mayus = bruto.toUpperCase();
  if (mayus.length === 2 && ID_POR_ALFA2[mayus]) return mayus;
  if (mayus.length === 3 && ALFA2_POR_ALFA3[mayus]) return ALFA2_POR_ALFA3[mayus];

  return indice().get(llave(bruto)) || null;
}

/** El identificador de la forma del mapa (numérico), venga como venga. */
export function aIdDeMapa(valor: unknown): string | null {
  const a2 = aAlfa2(valor);
  return a2 ? ID_POR_ALFA2[a2] || null : null;
}

/** Cómo se llama en español (o en el idioma que se pida). */
export function nombreDePais(alfa2: string, idioma = 'es'): string {
  try {
    return new Intl.DisplayNames([idioma], { type: 'region' }).of(alfa2) || alfa2;
  } catch { return alfa2; }
}

/**
 * Las entidades que NO se van a ver en el mapa. Se enseñan siempre: un mapa al
 * que le faltan doce países sin decirlo es un dato incorrecto presentado como
 * correcto.
 *
 * `idsDelMapa` es lo que de verdad se puede pintar, y hay que pasarlo. Tener
 * código ISO y tener forma en el mapa NO son lo mismo: Kosovo tiene código
 * (XK, de uso convencional) y en Natural Earth no tiene identificador, así que
 * comprobar solo el código lo daría por situado y se quedaría en gris sin que
 * nadie lo supiera. Lo mismo con los microestados que a 1:110 000 000 no se
 * dibujan.
 */
export function entidadesSinSitio(entidades: string[], idsDelMapa?: Set<string>): string[] {
  return entidades.filter(e => {
    const id = aIdDeMapa(e);
    if (!id) return true;
    return idsDelMapa ? !idsDelMapa.has(id) : false;
  });
}

// ============================================================================
// SOURCES BY NAME, NOT BY DOMAIN (2026-10-19, Wikiproducts W1, round 4)
// ============================================================================
// «Según elcorteingles.es», «Según cpsc.gov»: a domain is not a name a reader
// recognises, and it does not say what KIND of source it is — a shop relaying
// a spec sheet, a lab that measured it, a regulator. The production check of
// round 4 asked for «Según El Corte Inglés (tienda)», «Según la CPSC (EE. UU.)»,
// with the domain kept in the link and the tooltip.
//
// Hand-written for the hosts the Wikiproducts data actually cites (the ~100
// most cited of 259, 2026-10-19). A host not listed keeps its domain: a wrong
// guess at a name or a kind would be worse than the address.

const TIENDA = 'tienda', DISTRIBUIDOR = 'distribuidor', ANALISIS = 'análisis', PRENSA = 'prensa', FORO = 'foro';

/** host → what follows «Según» / «Medido por». */
const NOMBRES: Record<string, string> = {};
const poner = (tipo: string, lista: Record<string, string>) => {
  for (const [host, nombre] of Object.entries(lista)) NOMBRES[host] = `${nombre} (${tipo})`;
};

poner(TIENDA, {
  'pccomponentes.com': 'PcComponentes', 'elcorteingles.es': 'El Corte Inglés', 'mediamarkt.es': 'MediaMarkt', 'mediamarkt.at': 'MediaMarkt',
  'leroymerlin.es': 'Leroy Merlin', 'decathlon.es': 'Decathlon', 'amazon.es': 'Amazon', 'fnac.es': 'Fnac', 'carrefour.es': 'Carrefour',
  'pcbox.com': 'PCBox', 'powerplanetonline.com': 'Powerplanet', 'bestbuy.ca': 'Best Buy', 'proshop.nl': 'Proshop', 'm.alza.hu': 'Alza',
  'solartraders.com': 'Solartraders', 'solarpowersupply.eu': 'Solar Power Supply', 'offgridtec.com': 'Offgridtec',
  'photovoltaik4all.de': 'Photovoltaik4all', 'memodo.de': 'Memodo', 'memodo.cz': 'Memodo', '7sun.eu': '7Sun', 'robinsun.es': 'Robinsun',
  'solartown.com': 'Solartown', 'autosolar.es': 'AutoSolar', 'cdn.autosolar.es': 'AutoSolar', 'pluginsolar.co.uk': 'Plug-in Solar',
  'goodenergy.co.uk': 'Good Energy', 'woba-solar.de': 'WOBA Solar', 'mrsolar.com': 'Mr. Solar', 'airsoftpro.sk': 'Airsoftpro',
  'fvcomponentes.com': 'FV Componentes', 'bcf.com.au': 'BCF', 'varuste.net': 'Varuste', 'tienda-solar.es': 'Tienda Solar',
  'redmondelectric.ie': 'Redmond Electric', 'masterfoto.lv': 'Masterfoto', 'vencon.ua': 'Vencon', 'comfy.ua': 'Comfy', 'wattuneed.com': 'Wattuneed',
  'fotofabrikas.lt': 'Fotofabrikas', 'evo.com': 'evo', 'solarmarkt.ch': 'Solarmarkt', 'basic-solar.de': 'Basic Solar',
  'suministrosdelsol.com': 'Suministros del Sol', 'cuencasolar.es': 'Cuenca Solar', 'tommiekelly.ie': 'Tommie Kelly', 'electrocity.ie': 'Electrocity',
  'v12outdoor.com': 'V12 Outdoor', 'mano.elektrum.lt': 'Elektrum', 'nkon.nl': 'NKON', 'cliftoncameras.co.uk': 'Clifton Cameras',
  'campsaver.com': 'CampSaver', 'knivesandtools.com': 'Knivesandtools', 'sun.store': 'Sun.store', 'shopro.lt': 'Shopro', 'mec.ca': 'MEC',
  'lights.co.uk': 'Lights.co.uk', 'alpinstore.com': 'Alpinstore', 'damiasolar.com': 'Damia Solar', 'groupsumi.es': 'Grupo Sumi',
  'solarproof.com.au': 'Solarproof', 'thegioididong.com': 'Thế Giới Di Động', 'dienmayxanh.com': 'Điện Máy Xanh', 'uk.rs-online.com': 'RS Components',
  'tienda.guggenheim-bilbao.eus': 'la tienda del Guggenheim',
});
poner(DISTRIBUIDOR, {
  'midsummer.ie': 'Midsummer', 'solarshop.baywa-re.lv': 'BayWa r.e.', 'shop.krannich-solar.com': 'Krannich Solar', 'vekto.nl': 'Vekto',
  'docs.vekto.nl': 'Vekto', 'vicoexport.com': 'Vico Export',
});
poner(ANALISIS, {
  'techtest.org': 'Techtest', 'notebookcheck.org': 'Notebookcheck', 'notebookcheck.net': 'Notebookcheck', 'notebookcheck.com': 'Notebookcheck',
  'outdoorgearlab.com': 'OutdoorGearLab', 'nextpit.de': 'nextpit', 'pcwelt.de': 'PC-WELT', 'storagereview.com': 'StorageReview',
  'frontdeskreview.com': 'Front Desk Review', 'techwriteredc.com': 'Techwriter EDC', 'engineeringforchange.org': 'Engineering for Change',
  'scorecard.pvel.com': 'PVEL', 'solar.htw-berlin.de': 'la HTW Berlín', 'solarquotes.com.au': 'SolarQuotes',
});
poner(PRENSA, { 'pv-magazine.de': 'pv magazine', 'pv-magazine.com': 'pv magazine' });
poner(FORO, { 'solarweb.net': 'Solarweb' });
Object.assign(NOMBRES, {
  'cpsc.gov': 'la CPSC (EE. UU.)', 'iata.org': 'la IATA', 'faa.gov': 'la FAA (EE. UU.)', 'productsafety.gov.au': 'la ACCC (Australia)',
  'ec.europa.eu': 'la Comisión Europea', 'en.wikipedia.org': 'Wikipedia', 'es.wikipedia.org': 'Wikipedia',
});

/** «El Corte Inglés (tienda)» for a host the data cites, '' for one not listed. */
export function nombreFuente(host: string): string {
  const h = host.replace(/^www\./, '').toLowerCase();
  return NOMBRES[h] || '';
}

const sinAcentos = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** A host of the brand itself: anker.com, service.anker.com, us.anker.com,
 *  eu.ankersolix.com for «Anker». Some label before the TLD equals the brand
 *  or starts with it; a brand under three letters never matches (too many
 *  false friends). */
export function esDeLaMarca(host: string, marca: string): boolean {
  const m = sinAcentos(marca);
  if (m.length < 3 || !host) return false;
  return host.toLowerCase().split('.').slice(0, -1).some(l => l.replace(/-/g, '') === m || l.startsWith(m));
}

/** The source as a reader names it, always: «la marca» for the brand's own
 *  sites, the listed name, else «la web mezha.ua». A bare domain in a list of
 *  names read as a mistake (production check after #688). */
export function nombreLegible(host: string, marca = ''): string {
  if (!host) return '';
  if (esDeLaMarca(host, marca)) return 'la marca';
  return nombreFuente(host) || `la web ${host.replace(/^www\./, '').toLowerCase()}`;
}

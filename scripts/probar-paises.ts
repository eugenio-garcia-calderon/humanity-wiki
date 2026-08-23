import { aAlfa2, aIdDeMapa, nombreDePais, entidadesSinSitio } from '../src/utils/graficas/paises';
const casos = ['España','spain','ES','ESP','724','24','Perú','peru','EEUU','United States','US','USA','840','Reino Unido','UK','Côte d’Ivoire','Costa de Marfil','CIV','Corea del Sur','KOR','Chequia','Czechia','CZE','Marte','', '  '];
for (const c of casos) console.log(JSON.stringify(c).padEnd(22), '→', String(aAlfa2(c)).padEnd(5), String(aIdDeMapa(c)).padEnd(6), aAlfa2(c) ? nombreDePais(aAlfa2(c)!) : '—');
console.log('sin sitio:', entidadesSinSitio(['España','Marte','Kosovo','Francia']));

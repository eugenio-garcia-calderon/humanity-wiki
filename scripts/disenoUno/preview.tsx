// Full-page preview of Diseño 1 with the real list of luzhumanidad.com projects (27-11-2026), no database.
// npx vite build --outDir /tmp/dist-x … then: DIST=/tmp/dist-x npx tsx --tsconfig tsconfig.json scripts/disenoUno/preview.tsx
import React from 'react';
(globalThis as any).React = React;
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import fs from 'fs';
import path from 'path';
import PortadaDisenoUno from '../../src/components/sitio/disenoUno/PortadaDisenoUno';

const DIST = process.env.DIST || 'dist';
const css = fs.readdirSync(path.join(DIST, 'assets')).filter(f => f.endsWith('.css'))
  .map(f => path.resolve(DIST, 'assets', f)).sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
const F = (id: string, titulo: string, orden = 0) => ({ id, pagina_id: 'KW' + id, orden, pagina: { titulo, descripcion: '' } });
// The visions as migration 0250 writes them (copied here when the preview was made, 2026-11-28).
const VISIONES: Record<string, { texto: string; claves: string[] }> = {"Movilidad": {"texto": "Una movilidad que nos lleve del punto A al punto B lo antes posible, con la menor energía y sin dejar a nadie atrás.", "claves": ["Eficiente", "Ligera", "Segura", "Accesible", "Ecológica", "Compartida"]}, "Energía": {"texto": "Una energía limpia, generada cerca de donde se usa, a un precio justo y con una red en manos de la ciudadanía, no de unas pocas empresas. Con la tecnología a nuestro alcance para que nunca falte: estable hoy, mañana y dentro de décadas.", "claves": ["Ecológica", "Local", "Económica", "Ciudadana", "Estable"]}, "Política": {"texto": "Una política del debate y no de los colores, que trascienda las ideologías y busque lo que nos une. Que respete a quien piensa distinto, se enriquezca con la diversidad y escuche a quien tiene experiencia y sabiduría, lejos del populismo y la revancha. Una democracia directa, basada en el mérito y en la participación de cada día, no en un voto cada cuatro años.", "claves": ["Debate", "Encuentro", "Respeto", "Diversidad", "Experiencia", "Democracia directa"]}, "Economía": {"texto": "Una economía al servicio de las personas y del planeta: que financie lo que de verdad importa, reparta oportunidades y deje la riqueza donde se crea.", "claves": ["Justa", "Ciudadana", "Transparente", "Local"]}, "Vivienda": {"texto": "Hogares con sitio para varias generaciones, cerca de la familia, en barrios pensados para crear comunidad. Autosuficientes de la persona al pueblo, para resistir lo que venga, y que reúnan energía, movilidad, educación, salud y seguridad para vivir en armonía con la naturaleza: el lugar donde el ser humano se regenera y crea paraísos en la Tierra.", "claves": ["Intergeneracional", "Comunitaria", "Autosuficiente", "Resiliente", "En armonía con la naturaleza"]}, "Agricultura": {"texto": "Una agricultura que regenera la tierra en vez de agotarla: suelos vivos, agua cuidada, alimentos sanos y cercanos, y campos que vuelven a dar vida a los pueblos.", "claves": ["Regenerativa", "Sana", "Cercana", "Biodiversa"]}, "Educación": {"texto": "Una educación de nuestro tiempo, que deje crecer a cada persona con todas sus diferencias, basada en el progreso, la cooperación y la paz. Y una cultura que trascienda lo que nos separa y nos centre en lo que nos une.", "claves": ["Actual", "Diversa", "Cooperativa", "En paz", "Unión"]}, "Salud": {"texto": "Todas las ciencias de la salud unidas, para que ante cualquier enfermedad tengamos a mano todos los caminos hacia la salud. Una sanidad humana, accesible, cuidadosa y bien dotada, que no esté dominada por el interés económico.", "claves": ["Integradora", "Humana", "Accesible", "Cuidadosa", "Bien dotada"]}, "Seguridad": {"texto": "Una seguridad cercana y descentralizada: la persona protege a su familia, la comunidad a sus familias, el pueblo a sus comunidades y la región a sus pueblos. Un solo cuerpo, con valores altísimos y las personas de más capacidad y corazón al frente, que sepa combinar mano izquierda y firmeza para garantizar el orden y la paz sin recortar la libertad de pueblos y personas.", "claves": ["Cercana", "Descentralizada", "Unificada", "Con valores", "En paz", "Libre"]}, "Informática": {"texto": "Un conocimiento libre, diverso, profundo y conectado, en todos los formatos. Y unas redes de comunicación en manos de la ciudadanía, no de unas pocas empresas.", "claves": ["Libre", "Diverso", "Profundo", "Conectado", "Ciudadano"]}};
const grupos0 = [
  { titulo: 'Innovación en Energía', icono: 'Energía', filas: [F('BDFMUVNYY7WONCF', 'Comercializadora Comunidad Solar'), F('BDFSOLSOLIDAR01', 'Sol Solidario'), F('BDFMVDU4N2KAWOC', 'Tienda Solar Solidaria'), F('BDFCOMENERGPUE01', 'Comunidades energéticas en pueblos'), F('BDFOPTIMENERGI1', 'Optimización del sistema de energía')] },
  { titulo: 'Innovación en Movilidad', icono: 'Movilidad', filas: [F('BDFMUQWKEQUSG60', 'Aeromóvil'), F('BDFNTODDDY2JEZ5S', 'Aptera Coche Solar Aerodinámico'), F('BDFMUVMT739R7FA', 'Barco Solar Eléctrico'), F('BDFNT02K2JCL25BD', 'Triciclos Solares de Reparto'), F('BDFMUVNM5UY0H12', 'Bicicleta Solar'), F('BDFMWAI4PYUAC65', 'Competición para el desarrollo de un Vehículo Eficiente y Solar de código abierto')] },
  { titulo: 'Innovación en Política', icono: 'Política', filas: [F('BDFOBSERVPOL01', 'Observatorio de polarización'), F('BDFPERFILESPOL1', 'Perfiles políticos'), F('BDFGEOPOLARIZ01', 'Geometría política'), F('BDFDEMODIRECT01', 'Democracia directa'), F('BDFMODELOSOCIO1', 'Economía pública optimizada')] },
  { titulo: 'Innovación en Economía', icono: 'Economía', filas: [F('BDFNTSTY4XY5SH4B', 'Plataforma de Inversión Solar Crowd')] },
  { titulo: 'Innovación en Vivienda', icono: 'Vivienda', filas: [F('BDFMUVFNHK2A3AJ', 'Viviendas Mínimas Viables'), F('BDFMUZGRQ7R17WS', 'Modelo Urbanístico Orgánico'), F('BDFNT8S61KE6A88E', 'Fábrica de Casas Ecológicas')] },
  { titulo: 'Innovación en Agricultura', icono: 'Agricultura', filas: [F('BDFAGRISINTROP1', 'Agricultura sintrópica')] },
  { titulo: 'Innovación en Cultura', icono: 'Educación', filas: [F('BDFCONCIENCIASH1', 'Conciencia del ser humano'), F('BDFNTSJZVW6PBDPQ', 'Festival Arte Ser Humano')] },
  { titulo: 'Informática', icono: 'Informática', filas: [F('BDFMVDP4SCGRXS9', 'Humanity.wiki')] },
  { titulo: 'Innovación en Salud', icono: 'Salud', filas: [F('BDFSALUDMEDIC01', 'Plataforma de agregación del conocimiento de la medicina')] },
  { titulo: 'Innovación en Seguridad', icono: 'Seguridad', filas: [F('BDFDESMILITAR01', 'Desmantelamiento militar progresivo')] },
];
const grupos = grupos0.map(g => ({ ...g, vision: VISIONES[g.icono] || null }));
const FOTOS = ['bosque-sintropico/portada.jpg', 'observatorio-polarizacion/portada.jpg', 'estudio-conciencia/mapa-teoria-sintergica.jpg', ''];
const conFoto = (f: any, i: number) => ({ ...f, orden: i, pagina: { ...f.pagina, imagen: FOTOS[i % 4] ? `file://${process.cwd()}/public/${FOTOS[i % 4]}` : null } });
const benef = [
  { titulo: 'Innovación en Energía', icono: 'Energía', filas: ['Luz para Kenia', 'Luz del Amazonas', 'Cañada Solar', 'Hogar Lázaro Solar', 'Comunidad Solar Mazarrón', 'Comunidad Villalbilla'].map((t, i) => conFoto(F('B' + i, t), i * 2)) },
  { titulo: 'Innovación en Vivienda', icono: 'Vivienda', filas: ['Comunidad Ikigaia', 'Comunidad Oasis del Jarama', 'Comunidad y Ecoaldea Villabosque'].map((t, i) => conFoto(F('V' + i, t), i * 2 + 1)) },
];
const principios = { titulo: 'Nuestros principios', texto: 'Los valores que guían cada innovación del laboratorio.', lista: [
  { id: 'a', icono: 'escalas', titulo: 'De abajo hacia arriba', resumen: 'Innovamos desde la persona hacia el planeta.' },
  { id: 'b', icono: 'naturaleza', titulo: 'En sintonía con la naturaleza', resumen: 'El ser humano forma parte de la naturaleza.' },
  { id: 'c', icono: 'paz', titulo: 'Paz y cooperación', resumen: 'Soluciones que nos acercan a la paz.' },
  { id: 'd', icono: 'oportunidades', titulo: 'Igualdad de oportunidades y cuidado', resumen: 'Que todos puedan prosperar.' }] };
const html = renderToStaticMarkup(
  <MemoryRouter>
    <PortadaDisenoUno grupos={grupos as any} beneficiarias={benef as any}
      nombreFila={f => f.pagina?.titulo || ''} destino={f => ({ href: '/' + f.pagina_id, fuera: false })} />
  </MemoryRouter>);
fs.writeFileSync('/tmp/disenoUno-portada.html', `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="file://${css}"></head>
<body class="bg-slate-50"><header data-cabecera-sitio style="height:76px;background:#fff;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:center;font:900 28px system-ui">Luz &amp; Humanidad</header>
<main class="mx-auto max-w-6xl px-4 sm:px-6">${html}</main></body></html>`);
console.log('ok /tmp/disenoUno-portada.html');

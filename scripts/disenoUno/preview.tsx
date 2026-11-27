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
const grupos = [
  { titulo: 'Innovación en Energía', icono: 'Energía', filas: [F('BDFMUVNYY7WONCF', 'Comercializadora Comunidad Solar'), F('BDFSOLSOLIDAR01', 'Sol Solidario'), F('BDFMVDU4N2KAWOC', 'Tienda Solar Solidaria'), F('BDFCOMENERGPUE01', 'Comunidades energéticas en pueblos'), F('BDFOPTIMENERGI1', 'Optimización del sistema de energía')] },
  { titulo: 'Innovación en Movilidad', icono: 'Movilidad', filas: [F('BDFMUQWKEQUSG60', 'Aeromóvil'), F('BDFNTODDDY2JEZ5S', 'Aptera Coche Solar Aerodinámico'), F('BDFMUVMT739R7FA', 'Barco Solar Eléctrico'), F('BDFNT02K2JCL25BD', 'Triciclos Solares de Reparto'), F('BDFMUVNM5UY0H12', 'Bicicleta Solar'), F('BDFMWAI4PYUAC65', 'Competición para el desarrollo de un Vehículo Eficiente y Solar de código abierto')] },
  { titulo: 'Innovación en Política', icono: 'Política', filas: [F('BDFOBSERVPOL01', 'Observatorio de polarización'), F('BDFPERFILESPOL1', 'Perfiles políticos'), F('BDFGEOPOLARIZ01', 'Geometría política'), F('BDFDEMODIRECT01', 'Democracia directa'), F('BDFMODELOSOCIO1', 'Economía pública optimizada')] },
  { titulo: 'Innovación en Economía', icono: 'Economía', filas: [F('BDFNTSTY4XY5SH4B', 'Plataforma de Inversión Solar Crowd')] },
  { titulo: 'Innovación en Vivienda', icono: 'Vivienda', filas: [F('BDFMUVFNHK2A3AJ', 'Viviendas Mínimas Viables'), F('BDFMUZGRQ7R17WS', 'Modelo Urbanístico Orgánico'), F('BDFNT8S61KE6A88E', 'Fábrica de Casas Ecológicas')] },
  { titulo: 'Innovación en Agricultura', icono: 'Agricultura', filas: [F('BDFAGRISINTROP1', 'Agricultura sintrópica')] },
  { titulo: 'Innovación en Cultura', icono: 'Educación', filas: [F('BDFCONCIENCIASH1', 'Conciencia del ser humano'), F('BDFNTSJZVW6PBDPQ', 'Festival Arte Ser Humano')] },
  { titulo: 'Informática', icono: 'Informática', filas: [F('BDFMVDP4SCGRXS9', 'Humanity.wiki')] },
];
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
    <PortadaDisenoUno grupos={grupos as any} beneficiarias={benef as any} principios={principios as any}
      nombreFila={f => f.pagina?.titulo || ''} destino={f => ({ href: '/' + f.pagina_id, fuera: false })} />
  </MemoryRouter>);
fs.writeFileSync('/tmp/disenoUno-portada.html', `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="file://${css}"></head>
<body class="bg-slate-50"><header data-cabecera-sitio style="height:76px;background:#fff;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:center;font:900 28px system-ui">Luz &amp; Humanidad</header>
<main class="mx-auto max-w-6xl px-4 sm:px-6">${html}</main></body></html>`);
console.log('ok /tmp/disenoUno-portada.html');

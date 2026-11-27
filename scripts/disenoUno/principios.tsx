// Renders «Nuestros principios» with the texts of migration 0249 to /tmp/principios.html, for review.
// DIST=/tmp/dist-x npx tsx --tsconfig tsconfig.json scripts/disenoUno/principios.tsx
import React from 'react';
(globalThis as any).React = React;
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import PrincipiosSitio from '../../src/components/sitio/PrincipiosSitio';

const DIST = process.env.DIST || 'dist';
const css = fs.readdirSync(path.join(DIST, 'assets')).filter(f => f.endsWith('.css'))
  .map(f => path.resolve(DIST, 'assets', f)).sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
const cfg = { titulo: 'Nuestros principios', texto: 'Los valores que guían cada innovación del laboratorio.', lista: [
  { id: 'a', icono: 'escalas', titulo: 'De abajo hacia arriba', resumen: 'Innovamos desde la persona hacia el planeta, sobre una base social sólida.', puntos: ['Lo fundamental no depende de grandes estructuras: más resiliencia y eficiencia.', 'Innovaciones accesibles, descentralizadas y al servicio de la vida.'] },
  { id: 'b', icono: 'naturaleza', titulo: 'En sintonía con la naturaleza', resumen: 'Somos parte de la naturaleza: es nuestro hogar último.', puntos: ['No contaminar y sumar en positivo con cada acción.', 'Tener en cuenta a los demás seres vivos y sus ecosistemas.'] },
  { id: 'c', icono: 'paz', titulo: 'Paz y cooperación', resumen: 'Frente a la guerra y la rivalidad, soluciones que nos acercan.', puntos: ['Fomentar lo que une a los seres humanos.', 'Alejarnos de la violencia en todos sus ámbitos.'] },
  { id: 'd', icono: 'oportunidades', titulo: 'Igualdad de oportunidades y cuidado', resumen: 'Que todo ser humano pueda prosperar en su vida.', puntos: ['Las mismas oportunidades para todas las personas.', 'Cuidado para quien no puede prosperar por su cuenta.'] },
] };
fs.writeFileSync('/tmp/principios.html', `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="file://${css}"></head>
<body style="margin:0;background:#fff"><div class="mx-auto max-w-6xl px-6 pb-10">${renderToStaticMarkup(<PrincipiosSitio cfg={cfg} />)}</div></body></html>`);
console.log('ok');

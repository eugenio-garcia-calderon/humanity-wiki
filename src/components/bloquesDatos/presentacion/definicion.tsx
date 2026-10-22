import { lazy } from 'react';
import { Presentation } from 'lucide-react';
import { definirBloque } from '../tipos';

// La presentación en formato web (2026-10-22, Eugenio). Ver `Vista.tsx`.
export default definirBloque({
  tipo: 'presentacion',
  label: 'Presentación web',
  icon: Presentation,
  grupo: 'herramienta',
  desc: 'Portada, historia, capturas, infografía, cifras y llamada a participar',
  claves: 'presentacion landing web pitch proyecto portada historia cifras capturas',
  color: 'bg-indigo-100 text-indigo-700',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({
    secciones: [
      { id: 'inicio', tipo: 'portada', antetitulo: 'Nuestro proyecto', titulo: 'Una frase que lo diga **todo**', texto: 'Qué hacemos, para quién y por qué importa, en dos líneas.', botones: [{ texto: 'Quiero participar', url: '#participa' }] },
      { id: 'historia', tipo: 'linea', titulo: 'De dónde venimos', items: [{ fecha: '2020', titulo: 'Empezamos', texto: 'El primer paso.' }, { fecha: '2024', titulo: 'Crecemos', texto: 'Lo que vino después.' }, { fecha: '2027', titulo: 'Lanzamos', texto: 'Lo que viene.' }] },
      { id: 'participa', tipo: 'llamada', titulo: 'Súmate', texto: 'Cómo puede ayudar quien lee esto.', botones: [{ texto: 'Escríbenos', url: '#' }] },
    ],
  }),
});

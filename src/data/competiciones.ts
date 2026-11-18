// Catálogo de competiciones (página «Competiciones»). Primer lote: España, grupos 1 (estudiantil) y 2 (aficionados).
// Los ingresos sólo se ponen cuando una fuente pública los da; si no, `ingresos` queda en null y se ordena al final.
// Cada ficha dice qué se ha verificado y con qué fuente. (2026-11-18)

export type GrupoCompeticion = 1 | 2 | 3 | 4 | 5;
export type AmbitoCompeticion = 'España' | 'Europa' | 'Mundo';

export interface Competicion {
  id: string;
  nombre: string;
  ambito: AmbitoCompeticion;
  grupo: GrupoCompeticion;
  categoria: string;
  que: string;
  organiza: string;
  ingresos: number | null;
  ingresosNota: string;
  fuentes: string[];
}

export const GRUPOS: Record<GrupoCompeticion, string> = {
  1: 'Estudiantil',
  2: 'Aficionados',
  3: 'Semiprofesional',
  4: 'Profesional',
  5: 'Élite',
};

export const COMPETICIONES: Competicion[] = [
  {
    id: 'formula-student-spain', nombre: 'Fórmula Student Spain', ambito: 'España', grupo: 1,
    categoria: 'Monoplazas universitarios',
    que: 'Equipos universitarios diseñan y construyen un monoplaza de competición que se juzga en pruebas estáticas y dinámicas.',
    organiza: 'No verificado en la fuente consultada.',
    ingresos: null, ingresosNota: 'No publicado.',
    fuentes: ['https://www.eldebate.com/espana/castilla-la-mancha/20260801/formula-1-creado-60-estudiantes-castilla-mancha-desafiara-73-equipos-montmelo_445592.html'],
  },
  {
    id: 'motostudent', nombre: 'MotoStudent', ambito: 'España', grupo: 1,
    categoria: 'Motos de competición universitarias (eléctricas y térmicas)',
    que: 'Equipos universitarios construyen una moto de carreras que se evalúa en diseño, costes y pruebas en pista.',
    organiza: 'No verificado en la fuente consultada (edición IX, con equipos de 16 países).',
    ingresos: null, ingresosNota: 'No publicado.',
    fuentes: ['https://www.lacomarca.net/ix-edicion-motostudent-arranca-equipos-16-paises/amp/'],
  },
  {
    id: 'shell-eco-marathon-europa', nombre: 'Shell Eco-marathon Europa', ambito: 'Europa', grupo: 1,
    categoria: 'Vehículos innovadores (eficiencia energética)',
    que: 'Prototipos de bajo consumo, que se miden en kilómetros por energía. Hay equipos españoles, incluido un prototipo de combustión de hidrógeno de la UPV (Alcoy).',
    organiza: 'Shell.',
    ingresos: null, ingresosNota: 'No publicado.',
    fuentes: ['https://www.upv.es/entidades/epsa/2026/07/01/upv-eco-marathon-del-campus-de-alcoy-primer-equipo-espanol-en-participar-con-prototipo-de-combustion-de-hidrogeno-en-la-shell-eco-marathon-europa/'],
  },
  {
    id: 'ceea-race', nombre: 'Campeonato de España de Energías Alternativas (CEEA RACE)', ambito: 'España', grupo: 2,
    categoria: 'Vehículos innovadores (energías alternativas)',
    que: 'Campeonato nacional de vehículos con energías alternativas, con reglamento deportivo y técnico publicado cada año.',
    organiza: 'CEEA RACE (reglamento 2025 publicado)',
    ingresos: null, ingresosNota: 'No publicado.',
    fuentes: ['https://app-cdn.sportity.com/e7015c52-31f8-4687-8bd5-b6a1f9c9b4bd/2e4903f3-9b54-4d31-8482-d1e79cee4c62_CEEA RACE 2025 Reglamento Deportivo 2025.pdf'],
  },
  {
    id: 'open-espana-ekarting', nombre: 'Open de España de eKarting', ambito: 'España', grupo: 2,
    categoria: 'Karts eléctricos',
    que: 'Carreras de karts eléctricos a nivel de aficionado.',
    organiza: 'No verificado en la fuente consultada.',
    ingresos: null, ingresosNota: 'No publicado.',
    fuentes: ['https://movilidadelectrica.com/open-de-espana-de-ekarting/'],
  },
  {
    id: 'minivelocidad', nombre: 'MiniVelocidad', ambito: 'España', grupo: 2,
    categoria: 'Minimotos de velocidad',
    que: 'Carreras de minimotos con reglamento de competición de la temporada 2026.',
    organiza: 'RFME (Real Federación Motociclista Española)',
    ingresos: null, ingresosNota: 'No publicado.',
    fuentes: ['https://rfme.com/wp-content/uploads/2026/06/Reglas-de-la-Competicion_MiniVelocidad_2026_2jun.pdf'],
  },
  {
    id: 'enduro-espana', nombre: 'Campeonato de España de Enduro', ambito: 'España', grupo: 2,
    categoria: 'Motos de enduro',
    que: 'Campeonato nacional de enduro con protocolo de 2026.',
    organiza: 'RFME (Real Federación Motociclista Española)',
    ingresos: null, ingresosNota: 'No publicado.',
    fuentes: ['https://rfme.com/wp-content/uploads/2026/02/RFME-Protocolo-Enduro_2026.pdf'],
  },
  {
    id: 'bmw-rr-iberia-cup', nombre: 'BMW Motorrad RR Iberia Cup', ambito: 'España', grupo: 2,
    categoria: 'Copa monomarca de motos',
    que: 'Copa de motos BMW en la península ibérica.',
    organiza: 'BMW Motorrad (monomarca)',
    ingresos: null, ingresosNota: 'No publicado.',
    fuentes: ['https://soymotero.net/competicion/bmw-motorrad-rr-iberia-cup-2026/'],
  },
  {
    id: 'trofeo-sandero-rfeda', nombre: 'Trofeo Renault Sandero (RFEDA)', ambito: 'España', grupo: 2,
    categoria: 'Rallies de coches de aficionado',
    que: 'Campeonato de rallies con coches de serie preparados, reglamento RFEDA 2026.',
    organiza: 'RFEDA (Real Federación Española de Automovilismo)',
    ingresos: null, ingresosNota: 'No publicado.',
    fuentes: ['https://www.drivelandmotorsport.es/wp-content/uploads/2026/03/7.-RD-SANDERO-2026.-RFEDA.pdf'],
  },
];

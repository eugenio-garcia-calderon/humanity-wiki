// Catálogo de competiciones (página «Competiciones»). Segundo lote: España, grupos 1 a 4 (estudiantil, aficionados, semiprofesional y profesional).
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
  {
    id: 'sandero-eco-cup-spain', nombre: 'Sandero Eco Cup Spain', ambito: 'España', grupo: 3,
    categoria: 'Rallyes, copa monomarca (Dacia Sandero GLP)',
    que: 'Copa monomarca de rallyes con el Dacia Sandero de GLP. En 2026 es su decimotercera temporada: cinco pruebas, tres de asfalto y dos de tierra.',
    organiza: 'Dacia, con el respaldo de la RFEDA. El coche lo desarrolla Driveland Motorsport.',
    ingresos: null, ingresosNota: 'No publicado. El bote de premios supera los 33.000 €; son premios, no ingresos de la competición.',
    fuentes: ['https://www.motor16.com/las-ultimas-noticias/exito-dacia-sandero-eco-spain/'],
  },
  {
    id: 'clio-trophy-spain-asfalto', nombre: 'Clio Trophy Spain Asfalto', ambito: 'España', grupo: 3,
    categoria: 'Rallyes, copa monomarca (Renault Clio R.S.)',
    que: 'Serie monomarca de rallyes de asfalto con un único modelo, el Renault Clio. Puntúa dentro del CERA y del S-CER. Cinco rallyes en el calendario previsto. Cuota de 2.200 € + IVA por temporada.',
    organiza: 'Renault Group España con su promotor Driveland, en colaboración con la RFEDA.',
    ingresos: null, ingresosNota: 'No publicado. Premios por rallye de hasta 4.000 € al ganador; son premios, no ingresos.',
    fuentes: ['https://www.drivelandmotorsport.es/wp-content/uploads/2026/03/1.-RD-ASFALTO-2026-CLEAN.pdf'],
  },
  {
    id: 'clio-trophy-spain-tierra', nombre: 'Clio Trophy Spain Tierra', ambito: 'España', grupo: 3,
    categoria: 'Rallyes de tierra, copa monomarca (Renault Clio R.S.)',
    que: 'Serie monomarca de rallyes de tierra con un único modelo, el Renault Clio, dentro del CERT y del S-CER. Cuatro rallyes puntuables. Cuota de 1.700 € + IVA por temporada.',
    organiza: 'Renault Group España con su promotor Driveland, en colaboración con la RFEDA.',
    ingresos: null, ingresosNota: 'No publicado. Premios por rallye de hasta 3.000 € al ganador; son premios, no ingresos.',
    fuentes: ['https://www.drivelandmotorsport.es/wp-content/uploads/2026/03/2.-RD-TIERRA-2026-CLEAN.pdf'],
  },
  {
    id: 'motocross-espana', nombre: 'Campeonato de España de Motocross', ambito: 'España', grupo: 3,
    categoria: 'Motocross (MX1 y MX2 de élite, MX65, MX85, femenino y junior)',
    que: 'Campeonato nacional de motocross con pruebas organizadas por moto clubes bajo supervisión de la RFME. El calendario oficial no figura en el manual consultado.',
    organiza: 'RFME (Real Federación Motociclista Española).',
    ingresos: null, ingresosNota: 'No publicado.',
    fuentes: ['https://rfme.com/wp-content/uploads/2026/01/2026-manual-organizadores-mx.pdf'],
  },
  {
    id: 'f4-spanish-championship', nombre: 'Campeonato de España de Fórmula 4 (CEF4)', ambito: 'España', grupo: 4,
    categoria: 'Monoplazas (Fórmula 4, certificado por la FIA)',
    que: 'Campeonato nacional de monoplazas certificado por la FIA. En 2026 lo disputan 12 equipos con 36 monoplazas. Es uno de los pasos de la escalera hacia la competición profesional de monoplazas.',
    organiza: 'Comité organizador del CEF4, con la ratificación del comité directivo de la RFEDA.',
    ingresos: null, ingresosNota: 'No publicado.',
    fuentes: ['https://f4spain.org/en/equipos/'],
  },
  {
    id: 'cera-asfalto', nombre: 'Campeonato de España de Rallyes de Asfalto (CERA)', ambito: 'España', grupo: 4,
    categoria: 'Rallyes de asfalto (turismos de competición)',
    que: 'Campeonato nacional de rallyes sobre asfalto. Incluye series monomarca como la Clio Trophy Spain Asfalto, que puntúa en él.',
    organiza: 'RFEDA (Real Federación Española de Automovilismo). Reglamento general no consultado.',
    ingresos: null, ingresosNota: 'No publicado.',
    fuentes: ['https://www.drivelandmotorsport.es/wp-content/uploads/2026/03/1.-RD-ASFALTO-2026-CLEAN.pdf'],
  },
  {
    id: 'cert-tierra', nombre: 'Campeonato de España de Rallyes de Tierra (CERT)', ambito: 'España', grupo: 4,
    categoria: 'Rallyes de tierra (turismos de competición)',
    que: 'Campeonato nacional de rallyes sobre tierra. Incluye la serie Clio Trophy Spain Tierra. Calendario de 2026 sólo parcial en el reglamento consultado: Pozoblanco y Granada.',
    organiza: 'No verificado: el reglamento de la serie lo menciona en colaboración con la RFEDA.',
    ingresos: null, ingresosNota: 'No publicado.',
    fuentes: ['https://www.drivelandmotorsport.es/wp-content/uploads/2026/03/2.-RD-TIERRA-2026-CLEAN.pdf'],
  },
];

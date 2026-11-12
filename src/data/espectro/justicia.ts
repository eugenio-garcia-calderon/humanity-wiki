// «Otras propuestas» for the «justicia» window. Positions checked on 2026-11-12.
// Sumar's and Vox's cards rest partly on their 2023 programmes (no 2026
// programme on justice found); the date is in every source title.
import type { Espectro } from './tipos';

export const ESPECTRO: Espectro | null = {
  tema: 'la justicia',
  modelo: [
    'Una sola puerta: se denuncia una vez, y la propia justicia decide si es civil, penal, administrativo o laboral.',
    'Un juez de guardia en la comisaría, en persona o por videollamada, y lo civil y lo penal en un solo expediente.',
    'Plazos máximos públicos para cada paso: por ejemplo, seis meses para la sentencia en primera instancia, con más jueces para cumplirlos.',
    'Con el robo, una oportunidad pero no dos: la primera vez, centro de reinserción y devolver diez veces lo robado; la segunda, prisión.',
    'Una ocupación se desaloja rápido por el juez y los guardianes públicos, sin empresas privadas, y la persona desalojada recibe una alternativa pública.',
  ],
  limites: [
    'Sus críticos dicen que un juez en la comisaría y los juicios por videollamada pueden poner en riesgo la independencia del juez y las garantías de quien es acusado.',
    'También, que los plazos máximos no se cumplen sin muchos más jueces, y formarlos lleva años.',
    'Y que la cárcel a la segunda vez cuesta unos 30.000 € al año por preso y no siempre reduce el delito, y que devolver diez veces lo robado se queda en papel si no hay con qué pagar.',
  ],
  posturas: [
    {
      id: 'izquierda',
      quien: 'Sumar (programa de 2023), con Podemos y Bildu en algunas votaciones',
      cuando: 'Programa electoral de 2023 y votación en el Congreso de febrero de 2026',
      idea: 'Menos cárcel y más reinserción, y más medios para la justicia en lugar de más penas.',
      propone: [
        'Eliminar la prisión permanente revisable.',
        'Una ley de prevención y convivencia que dé prioridad a la mediación y a la justicia restaurativa (reparar el daño) frente a las sanciones.',
        'Programas de tratamiento y reinserción para evitar que se vuelva a delinquir.',
        'En 2026 votaron en contra de la ley que lleva a prisión el hurto repetido (ERC se abstuvo), y piden más jueces y medios.',
      ],
      argumento: 'Dicen que subir penas castiga sobre todo a quien menos tiene, y que el delito no baja por cambiar el Código Penal, sino con más medios en la justicia y con reinserción.',
      critica: 'Sus críticos dicen que no responden a la preocupación por los robos repetidos, y muchas familias de víctimas defienden la prisión permanente revisable.',
      fuentes: [
        { url: 'https://www.eldiario.es/politica/sumar-prohibira-pelotas-goma-convertir-delito-devolucion-migrantes-frontera_1_10356866.html', titulo: 'elDiario.es (6-7-2023) · Las propuestas de seguridad y justicia del programa de Sumar' },
        { url: 'https://www.3cat.cat/3catinfo/el-congres-debat-i-vota-la-llei-contra-la-multireincidencia-que-es-reforma/noticia-amp/3393727/', titulo: '3Cat (12-2-2026) · El Congreso aprueba la ley contra la multirreincidencia: quién votó qué y por qué' },
      ],
    },
    {
      id: 'centro-izquierda',
      quien: 'PSOE y el Gobierno (Ministerio de Justicia)',
      cuando: 'Ley aprobada en 2025, reforma en el Congreso desde 2025 y votación de 2026',
      idea: 'Reorganizar los juzgados, abrir la carrera judicial a más gente y crear más plazas de jueces.',
      propone: [
        'Ley de eficiencia de 2025: los juzgados de un solo juez se agrupan en 431 tribunales de instancia, y en lo civil hay que intentar un acuerdo antes de demandar.',
        'Casi 1.500 plazas de jueces y fiscales de 2025 a 2027, y un proceso para dar plaza fija a los jueces sustitutos.',
        'Becas de al menos el salario mínimo para preparar la oposición a juez, y un examen escrito anónimo además del oral.',
        'Votó a favor de la ley de 2026 que castiga con prisión el hurto repetido.',
      ],
      argumento: 'Dicen que el acceso a la carrera judicial sigue reglas del siglo XIX, y que abrirlo a quien no puede pagarse años de oposición atrae talento y da igualdad de oportunidades.',
      critica: 'Sus críticos, entre ellos las asociaciones de jueces y fiscales, dicen que la reforma del acceso pone en riesgo la independencia judicial, y que España sigue teniendo la mitad de jueces por habitante que la Unión Europea.',
      fuentes: [
        { url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2025-76', titulo: 'BOE · Ley Orgánica 1/2025, de eficiencia del Servicio Público de Justicia' },
        { url: 'https://www.mjusticia.gob.es/es/institucional/gabinete-comunicacion/noticias-ministerio/reforma-carreras', titulo: 'Ministerio de Justicia (12-6-2025) · Reforma del acceso a las carreras judicial y fiscal' },
        { url: 'https://www.3cat.cat/3catinfo/el-congres-debat-i-vota-la-llei-contra-la-multireincidencia-que-es-reforma/noticia-amp/3393727/', titulo: '3Cat (12-2-2026) · El Congreso aprueba la ley contra la multirreincidencia' },
      ],
    },
    {
      id: 'centro-derecha',
      quien: 'Partido Popular (PP)',
      cuando: 'Programa para el 29-N (noviembre de 2026) y propuestas de diciembre de 2025 y junio de 2026',
      idea: 'Que los jueces elijan a sus representantes, y penas más duras para quien repite.',
      propone: [
        'Que los jueces elijan directamente a los 12 vocales judiciales del Consejo General del Poder Judicial (CGPJ, el órgano que gobierna a los jueces), sin Parlamento ni Gobierno.',
        'Un Fiscal General con un mandato que no coincida con el del Gobierno.',
        'Prisión permanente revisable para violadores reincidentes, y más pena por usar armas blancas.',
        'Prohibir que los indultos sirvan para lograr o mantener la presidencia del Gobierno, y derogar la Ley de Amnistía.',
      ],
      argumento: 'Dicen que la Comisión Europea y el Consejo de Europa piden que los jueces elijan a sus representantes, y que perseguir el delito sirve de poco sin una respuesta judicial firme.',
      critica: 'Se le reprocha que mantuvo bloqueada la renovación del CGPJ más de cinco años, de 2018 a 2024, y que subir penas no reduce por sí solo los delitos.',
      fuentes: [
        { url: 'https://www.moncloa.com/2026/06/10/pp-senado-ley-despolitizacion-cgpj-3383758/', titulo: 'Moncloa.com (10-6-2026) · La ley del PP para que los jueces elijan el CGPJ' },
        { url: 'https://www.elindependiente.com/espana/2025/12/03/feijoo-propone-prision-permanente-revisable-para-violadores-reincidentes-y-que-la-violencia-machista-dependa-de-interior/', titulo: 'El Independiente (3-12-2025) · Las propuestas penales de Feijóo' },
        { url: 'https://www.moncloa.com/2026/11/10/pp-plan-reconstruccion-3465233/', titulo: 'Moncloa.com (10-11-2026) · El programa electoral del PP para el 29-N' },
      ],
    },
    {
      id: 'derecha',
      quien: 'Vox',
      cuando: 'Programa electoral de 2023',
      idea: 'Una justicia del Estado, gobernada por los jueces, y penas más duras.',
      propone: [
        'Que todos los miembros del CGPJ (el órgano que gobierna a los jueces) los elijan o propongan los jueces, y que la justicia vuelva a ser del Estado, con un solo sistema de expedientes en todo el país.',
        'Integrar el Tribunal Constitucional en el Tribunal Supremo como una sala más; mientras, que resuelva los recursos en tres meses.',
        'Prisión permanente para violadores, bajar la edad penal y endurecer la ley del menor.',
        'Suprimir los juzgados de violencia sobre la mujer.',
        'Prohibir los indultos por corrupción y por delitos contra la unidad de España.',
      ],
      argumento: 'Dicen que la justicia solo es independiente si los partidos no eligen a quienes la gobiernan, y que penas más duras protegen mejor a las víctimas.',
      critica: 'Sus críticos dicen que suprimir los juzgados de violencia sobre la mujer quitaría protección a las víctimas, y que unir el Constitucional al Supremo exige reformar la Constitución.',
      fuentes: [
        { url: 'https://theobjective.com/wp-content/uploads/2023/07/programa-vox-23j.pdf', titulo: 'Vox · Programa electoral de las elecciones generales de 2023 (PDF)' },
      ],
    },
  ],
  revisado: '2026-11-12',
};

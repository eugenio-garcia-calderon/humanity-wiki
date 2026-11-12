// «Otras propuestas» for the «educacion» window: what other political camps in
// Spain propose on schooling, from left to right. Checked on 2026-11-12.
import type { Espectro } from './tipos';

export const ESPECTRO: Espectro | null = {
  tema: 'la educación',
  modelo: [
    'Cada bebé recibe una «mochila educativa»: el dinero de su formación hasta los 25 años.',
    'La familia elige escuela y el dinero va con el alumno. Las escuelas que aceptan la mochila son gratis y no eligen a sus alumnos: si faltan plazas, se sortea.',
    'La mochila de quien más lo necesita lleva una parte más.',
    'Los alumnos mayores enseñan a los pequeños, se trabaja en grupos de avance dentro de la clase, y los oficios entran en el currículo normal.',
    'Lo que no se usa a los 25 años se convierte en crédito para formarse toda la vida.',
  ],
  limites: [
    'Sus críticos dicen que la mochila costaría más que el gasto público actual, y que aún no está decidido de dónde sale la diferencia.',
    'También, que donde se dio a cada alumno su dinero para elegir escuela sin reglas, se separó a ricos y pobres, y que sin ayuda las familias con menos recursos eligen peor.',
    'Y que una escuela de pueblo que pierde alumnos pierde dinero y puede cerrar.',
  ],
  posturas: [
    {
      id: 'izquierda',
      quien: 'Frente Amplio (Sumar, Izquierda Unida, Más Madrid y Comuns)',
      cuando: 'Enmiendas a la ley de ratios en el Congreso, septiembre de 2026',
      idea: 'Que la nueva demanda de plazas la cubra la escuela pública, con clases más pequeñas y más apoyo.',
      propone: [
        'Como máximo 20 alumnos por clase en primaria y secundaria obligatoria, y las comunidades pueden bajar más.',
        'No ampliar ni renovar los conciertos con colegios privados: las nuevas plazas, en la pública.',
        'Sacar la clase de religión del horario obligatorio.',
        'Un orientador a jornada completa por cada 350 alumnos.',
        'Mejorar la categoría del profesorado y permitirle jubilarse antes.',
      ],
      argumento: 'Dicen que la escuela pública es la que garantiza la igualdad de oportunidades, y que la doble red de pública y concertada separa a los alumnos según su origen.',
      critica: 'Sus críticos dicen que limitar los conciertos reduce la libertad de las familias para elegir colegio, y que bajar a 20 alumnos exige muchos más profesores y aulas sin decir quién los paga.',
      fuentes: [
        { url: 'https://www.democrata.es/fr/politique/congres-et-senat/somar-propose-que-la-loi-de-reduction-des-ratios-empeche-d-elargir-ou-de-renouveler-les-contrats-educatifs-en-cours/', titulo: 'Demócrata · Las enmiendas de Sumar a la ley de ratios (16-09-2026)' },
      ],
    },
    {
      id: 'centro-izquierda',
      quien: 'PSOE y el Gobierno',
      cuando: 'Anteproyecto de ley aprobado en noviembre de 2025, en trámite en el Congreso en 2026',
      idea: 'Mantener la ley educativa actual y bajar los alumnos por clase y las horas de clase del profesorado.',
      propone: [
        'Como máximo 22 alumnos por clase en primaria y 25 en secundaria obligatoria (hoy 25 y 30).',
        'Como máximo 23 horas de clase a la semana para los maestros de primaria y 18 en secundaria.',
        'Que un alumno con necesidades especiales cuente como dos al calcular el tamaño de la clase.',
        'Aplicarlo poco a poco: las horas de clase desde el curso 2026-27 y las nuevas clases por etapas hasta el curso 2031-32.',
      ],
      argumento: 'Dicen que con menos alumnos por clase y profesores menos cargados se puede atender a cada alumno, y que eso es lo que más ayuda a quien va atrasado.',
      critica: 'Sus críticos dicen que la medida la pagan las comunidades, que tardará años en notarse y que faltan profesores para cubrirla; y que la ley educativa actual baja la exigencia al permitir pasar de curso con suspensos.',
      fuentes: [
        { url: 'https://www.legaltoday.com/actualidad-juridica/noticias-de-derecho/el-gobierno-aprueba-en-primera-vuelta-el-anteproyecto-de-ley-que-reduce-las-ratios-en-primaria-y-eso-y-la-carga-lectiva-de-los-docentes-2025-11-12/', titulo: 'Legal Today · El Gobierno aprueba el anteproyecto de ley que reduce alumnos por clase y horas de clase (12-11-2025; en el Congreso en 2026)' },
      ],
    },
    {
      id: 'centro-derecha',
      quien: 'Partido Popular (PP)',
      cuando: 'Programa para el 29-N, noviembre de 2026',
      idea: 'Cambiar la ley educativa actual por otra más exigente, igual en toda España.',
      propone: [
        'Sustituir la ley educativa actual (la LOMLOE, de 2020) por una nueva.',
        'Pasar de curso en secundaria solo aprobando las asignaturas.',
        'Una nota mínima para entrar a estudiar Magisterio.',
        'Una misma prueba de acceso a la universidad en toda España.',
        'Escuela infantil de 0 a 3 años gratuita al final de la legislatura, y derecho a estudiar en castellano en todas las etapas.',
      ],
      argumento: 'Dicen que el esfuerzo y la exigencia son lo que mejora los resultados, y que unos mismos exámenes en toda España hacen que el título valga lo mismo en todas partes.',
      critica: 'Sus críticos dicen que cambiar otra vez la ley educativa obliga a escuelas y profesores a empezar de nuevo, y que endurecer el paso de curso aumenta la repetición, que no mejora el aprendizaje.',
      fuentes: [
        { url: 'https://www.democrata.es/elecciones-generales-espana/programa-electoral-pp-29n-propuestas/', titulo: 'Demócrata · El programa del PP para las elecciones del 29-N, «La Reconstrucción Nacional» (noviembre de 2026)' },
      ],
    },
    {
      id: 'derecha',
      quien: 'Vox',
      cuando: 'Programa electoral de 2023',
      idea: 'Que el Estado recupere la educación, con una sola ley, exámenes nacionales y más peso de los padres.',
      propone: [
        'Devolver al Estado las competencias de educación y sustituir la ley actual por una ley nacional.',
        'Que los padres conozcan y acepten antes cualquier contenido afectivo-sexual o ideológico en clase.',
        'Una sola prueba de acceso a la universidad y exámenes nacionales en varias etapas.',
        'Garantizar el derecho a estudiar en español en toda España.',
        'Que no se pase de curso con asignaturas suspensas.',
      ],
      nota: 'No hemos encontrado propuestas de Vox sobre educación para 2026, de ámbito nacional, en sus textos publicados.',
      argumento: 'Dicen que diecisiete sistemas educativos crean desigualdad entre españoles, y que los padres son los primeros responsables de la educación de sus hijos.',
      critica: 'Sus críticos dicen que el permiso previo de los padres puede dejar a alumnos sin contenidos del currículo, y que una sola ley nacional deja sin margen a las comunidades con lengua propia.',
      fuentes: [
        { url: 'https://theobjective.com/wp-content/uploads/2023/07/programa-vox-23j.pdf', titulo: 'Vox · Programa electoral 2023 (medidas 47 a 51)' },
        { url: 'https://www.eldebate.com/educacion/20230716/futuro-ley-celaa-23-j-asi-son-propuestas-educacion-principales-partidos_128172.html', titulo: 'El Debate · Las propuestas de educación de los partidos en sus programas electorales 2023 (16-07-2023)' },
      ],
    },
  ],
  revisado: '2026-11-12',
};

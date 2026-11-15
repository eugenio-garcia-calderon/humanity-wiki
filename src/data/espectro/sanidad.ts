// «Otras propuestas» for the «sanidad» window: what other political camps in
// Spain propose on public health, from left to right. Checked on 2026-11-12;
// Vox updated on 2026-11-15 from its 29-N programme.
import type { Espectro } from './tipos';

export const ESPECTRO: Espectro | null = {
  tema: 'la sanidad',
  modelo: [
    'Un único expediente sanitario por persona, para toda la vida: lo ven la pública y la privada, en cualquier comunidad, si la persona da permiso.',
    'La persona lo controla desde el móvil: da y quita permisos y ve quién ha entrado.',
    'Plazos máximos para cada puerta: 48 horas para el médico de familia, 30 días para el especialista y las pruebas, 90 días para operarse.',
    'Si se pasa el plazo, la persona elige otro centro, público o privado, y lo paga la sanidad pública.',
    'Una sola lista de espera por región, publicada centro a centro cada mes.',
  ],
  limites: [
    'Sus críticos dicen que un expediente que lo reúne todo es muy delicado: un fallo de privacidad o un ataque informático expondría la salud de millones de personas.',
    'También, que garantizar plazos máximos exige personal y quirófanos que hoy faltan, y que su coste aún no está calculado.',
    'Y que unir los programas de diecisiete comunidades y de la privada es caro y lento.',
  ],
  posturas: [
    {
      id: 'izquierda',
      quien: 'Frente Amplio (Sumar, Izquierda Unida, Más Madrid y Comuns); el Ministerio de Sanidad lo dirige Más Madrid',
      cuando: 'Presentación de la coalición (febrero de 2026) y proyecto de ley del Ministerio de Sanidad (mayo de 2026)',
      idea: 'Blindar la sanidad pública frente a la gestión privada y obligar a invertir más en atención primaria.',
      propone: [
        'Una ley que haga de la gestión pública directa la norma y de la privada una excepción justificada; deroga la ley de 1997 que abrió la gestión privada.',
        'Prohibir que una misma empresa construya un centro sanitario y además lo gestione.',
        'Facilitar que las comunidades recuperen para la gestión pública los servicios hoy privatizados.',
        'Una financiación más finalista, que obligue a las comunidades a invertir más en atención primaria.',
        'Publicar cada año los resultados en salud de todos los centros.',
      ],
      argumento: 'Dicen que el dinero público debe reforzar los centros públicos y no los beneficios de grandes empresas, y que solo así se garantiza la misma atención para todos.',
      critica: 'Sus críticos dicen que limitar la gestión privada puede alargar las esperas mientras la pública no tenga personal suficiente, y que la ley no trae por sí misma más dinero ni más profesionales.',
      fuentes: [
        { url: 'https://www.redaccionmedica.com/politica/sanidad-hoy/20260221/el-nuevo-sumar-vamos-blindar-la-sanidad-publica/258420_0.amp.html', titulo: 'Redacción Médica · El nuevo Sumar: «Vamos a blindar la sanidad pública» (21-02-2026)' },
        { url: 'https://www.redaccionmedica.com/politica/20260213/mas-primaria-financiacion-coto-la-privada-ejes-de-nueva-sumar/258547_0.amp.html', titulo: 'Redacción Médica · Más primaria, financiación y coto a la privada, ejes del nuevo Sumar (13-02-2026)' },
        { url: 'https://www.sanidad.gob.es/gabinete/notasPrensa.do?id=6906', titulo: 'Ministerio de Sanidad · Proyecto de Ley de Gestión Pública e Integridad del Sistema Nacional de Salud (12-05-2026)' },
      ],
    },
    {
      id: 'centro-izquierda',
      quien: 'PSOE',
      cuando: 'Propuestas para su programa del 29-N, presentadas en noviembre de 2026',
      idea: 'Reforzar la atención primaria y el gasto público con objetivos de cita medibles.',
      propone: [
        'Que el 85 % de quienes piden cita en atención primaria la tengan en 48 horas como máximo.',
        'Dedicar al menos el 7 % de lo que produce el país en un año (PIB) a la sanidad.',
        'Una nueva ley del medicamento, para mejorar el acceso y producir en España los medicamentos clave.',
        'Poner en marcha la Agencia Estatal de Salud Pública.',
        'Renovar por consenso el estatuto laboral de los profesionales sanitarios.',
      ],
      argumento: 'Dicen que la puerta de entrada al sistema es el médico de familia, y que si da cita rápido se descongestiona todo lo demás.',
      critica: 'Sus críticos dicen que fija objetivos que dependen de las comunidades, que son las que gestionan la sanidad, y que gobierna desde 2018 sin que las esperas hayan bajado.',
      fuentes: [
        { url: 'https://www.diarioestrategia.cl/texto-diario/mostrar/6081934/psoe-propone-85-pacientes-consiga-cita-atencion-primaria-menos-48-horas', titulo: 'Europa Press, en Diario Estrategia · El PSOE propone que el 85 % consiga cita en primaria en menos de 48 horas (06-11-2026)' },
      ],
    },
    {
      id: 'centro-derecha',
      quien: 'Partido Popular (PP)',
      cuando: 'Programa para el 29-N (noviembre de 2026) y propuesta de mayo de 2026',
      idea: 'Un pacto con las comunidades para reducir esperas, con más médicos y una financiación propia para la sanidad.',
      propone: [
        'Un pacto de Estado por la sanidad pública con las comunidades autónomas.',
        'Un plan urgente para reducir las listas de espera.',
        'Al menos 4.500 médicos más en atención primaria.',
        'Que la sanidad tenga una pieza separada, con cuentas propias, en la financiación de las comunidades.',
        'Una historia clínica y social única para cada persona.',
      ],
      argumento: 'Dicen que el problema es la falta de médicos y de coordinación entre comunidades, y que se resuelve con más plantilla, mejores condiciones y un acuerdo de todos.',
      critica: 'Sus críticos dicen que el plan de esperas no tiene cifras ni plazos, y que en las comunidades que gobierna recurre a conciertos con la privada en vez de reforzar la pública.',
      fuentes: [
        { url: 'https://www.diarioestrategia.cl/texto-diario/mostrar/6086068/pp-promete-pacto-estado-sanidad-publica-reducir-listas-espera-e-incorporar-4500-medicos-ap', titulo: 'Europa Press, en Diario Estrategia · Las propuestas sanitarias del programa del PP para el 29-N (10-11-2026)' },
        { url: 'https://www.democrata.es/elecciones-generales-espana/programa-electoral-pp-29n-propuestas/', titulo: 'Demócrata · El programa del PP para las elecciones del 29-N, «La Reconstrucción Nacional» (noviembre de 2026)' },
        { url: 'https://www.eldebate.com/espana/20260518/feijoo-compromete-modificar-sistema-salud-asumir-compromisos-sanitarios-presidente_418989.html', titulo: 'El Debate · Feijóo propone una pieza separada para la sanidad en la financiación autonómica (18-05-2026)' },
      ],
    },
    {
      id: 'derecha',
      quien: 'Vox',
      cuando: 'Programa para el 29-N, «Es sentido común», 12 de noviembre de 2026',
      idea: 'La misma sanidad para todos los españoles en todo el país, y solo urgencias graves para quien está en situación irregular.',
      propone: [
        'Una tarjeta sanitaria única con historia clínica compartida en toda España, y que no saber la lengua regional no impida optar a una plaza (medida 60).',
        'Un plan contra las listas de espera, con ayuda de la privada solo si da resultados, y publicar indicadores cada cierto tiempo (medida 62).',
        'Reforzar la atención primaria y la de pediatría, sobre todo en los pueblos (medida 61).',
        'Mejores sueldos, incentivos para las plazas rurales y un programa para que vuelvan los sanitarios que emigraron (medida 63).',
        'Atender a los inmigrantes en situación irregular solo en urgencias graves, y auditar ese coste (medida 20).',
      ],
      argumento: 'Dicen que diecisiete sistemas distintos crean desigualdad entre españoles y gastos duplicados, y que la sanidad pública no puede cargar con la inmigración ilegal.',
      critica: 'Sus críticos dicen que dejar sin atención ordinaria a los inmigrantes irregulares pone en riesgo la salud pública y acaba llenando las urgencias, y que el plan de esperas no tiene cifras ni plazos.',
      fuentes: [
        { url: 'https://men.gsstatic.es/sfAttachPlugin/4847171.pdf', titulo: 'Vox · «Es sentido común», programa electoral 29-N (12-11-2026), copia en PDF publicada por Menorca · Es Diari, medidas 20 y 60 a 63' },
        { url: 'https://www.menorca.info/actualidad/elecciones-29n/2026/11/15/2748997/programa-completo-vox-para-elecciones-generales-2026.html', titulo: 'Menorca · Es Diari · El programa completo de Vox para el 29-N (15-11-2026)' },
      ],
    },
  ],
  revisado: '2026-11-15',
};

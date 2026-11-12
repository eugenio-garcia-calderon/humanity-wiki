// «Otras propuestas» for the «sanidad» window: what other political camps in
// Spain propose on public health, from left to right. Checked on 2026-11-12.
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
      cuando: 'Programa para las elecciones andaluzas de 2026 y propuesta en el Congreso (enero de 2026)',
      idea: 'Una sanidad coordinada desde el Estado, igual en toda España y con preferencia para los españoles.',
      propone: [
        'Un modelo sanitario coordinado desde el Estado, que acabe con las diferencias y duplicidades entre comunidades.',
        'Una tarjeta sanitaria individual y una historia clínica y de farmacia digital unificada.',
        'Auditar a fondo las listas de espera, y colaboración con la privada con control de resultados y marcha atrás si no cumple.',
        'Que los españoles tengan acceso preferente a ayudas y servicios públicos, y publicar cuánto usan la sanidad los extranjeros.',
        'Un código laboral propio para los médicos, y retirar el estatuto pactado entre el Ministerio y los sindicatos.',
      ],
      argumento: 'Dicen que diecisiete sistemas distintos crean desigualdad entre españoles y gastos duplicados, y que quien sostiene el sistema con sus impuestos debe ser atendido primero.',
      critica: 'Sus críticos dicen que dar preferencia por nacionalidad choca con la igualdad que garantiza la Constitución, y que un mando desde el Estado no acortaría por sí solo las esperas.',
      fuentes: [
        { url: 'https://diariofarma.com/wp-content/uploads/2026/05/Programa-electoral-de-Vox-para-las-elecciones-andaluzas.pdf', titulo: 'Vox · Programa electoral para las elecciones andaluzas de 2026, sanidad (medidas 64 a 103)' },
        { url: 'https://www.redaccionmedica.com/politica/20260130/omnibus-sanitario-de-vox-en-el-congreso-con-un-estatuto-para-medicos/257285_0.amp.html', titulo: 'Redacción Médica · La proposición de Vox en el Congreso sobre sanidad (30-01-2026)' },
      ],
    },
  ],
  revisado: '2026-11-12',
};

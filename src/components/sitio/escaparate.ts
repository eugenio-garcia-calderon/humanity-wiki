import { createContext, useContext } from 'react';

// EL ESCAPARATE (`sitio.escaparate`, 2026-11-06, Eugenio en luzhumanidad.com): un sitio que
// solo enseña, sin menú, sin cuenta, sin filtros ni ruta. La página lo sabe por la config de
// su raíz y se lo pasa a sus bloques (el perfil: el nombre entero y sin seguir ni conectar).
export const EscaparateContexto = createContext(false);
export const useEscaparate = () => useContext(EscaparateContexto);

/** LA RAÍZ DEL ESCAPARATE EN EL QUE SE LEE LA PÁGINA (2026-11-07): la necesitan los bloques que
 *  enseñan datos del sitio (`bloquesDatos/escaparate`: el formulario, las cifras…). Fuera de un
 *  escaparate, `null`. La pone `VistaPagina`; en el editor no hay y el bloque usa su `datos.raiz`. */
export const RaizEscaparateContexto = createContext<string | null>(null);
export const useRaizEscaparate = () => useContext(RaizEscaparateContexto);

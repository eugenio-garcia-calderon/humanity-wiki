import { createContext, useContext } from 'react';

// EL ESCAPARATE (`sitio.escaparate`, 2026-11-06, Eugenio en luzhumanidad.com): un sitio que
// solo enseña, sin menú, sin cuenta, sin filtros ni ruta. La página lo sabe por la config de
// su raíz y se lo pasa a sus bloques (el perfil: el nombre entero y sin seguir ni conectar).
export const EscaparateContexto = createContext(false);
export const useEscaparate = () => useContext(EscaparateContexto);

import React, { createContext, useContext, useState, useEffect } from 'react';

type DesignContextType = {
  objectiveImages: Record<string, string>;
  setObjectiveImage: (title: string, base64: string) => void;
  logoImage: string | null;
  setLogoImage: (base64: string) => void;
};

const DesignContext = createContext<DesignContextType | undefined>(undefined);

/**
 * De lo guardado, solo lo que alguien ELIGIÓ de verdad.
 *
 * `evo_objective_images` se escribe cuando un administrador cambia UNA imagen,
 * y guarda el mapa entero — o sea, se lleva congeladas también las rutas por
 * defecto que hubiera en ese momento. Eso convirtió un fallo en uno permanente:
 * SALUD y CONVIVENCIA apuntaban a un `.jpg` que no existe, y quien hubiera
 * tocado cualquier otra imagen se quedó con esas dos rutas rotas grabadas en su
 * navegador. Arreglar el valor por defecto no le habría llegado nunca.
 *
 * Una imagen elegida a mano es un `data:` (la sube el administrador y se guarda
 * en base64). Una que empieza por `/illustrations/` no es una elección: es una
 * foto de cómo estaba el código ese día. Se descarta y manda el valor actual.
 */
function soloLoElegido(guardado: string | null): Record<string, string> {
  if (!guardado) return {};
  try {
    const leido = JSON.parse(guardado);
    if (!leido || typeof leido !== 'object') return {};
    return Object.fromEntries(
      Object.entries(leido as Record<string, unknown>)
        .filter(([, v]) => typeof v === 'string' && !v.startsWith('/illustrations/')),
    ) as Record<string, string>;
  } catch (e) {
    console.error('evo_objective_images no se pudo leer:', e);
    return {};
  }
}

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const [logoImage, setLogoImageState] = useState<string | null>(() => {
    return localStorage.getItem('evo_logo_image') || null;
  });

  const [objectiveImages, setObjectiveImages] = useState<Record<string, string>>(() => {
    // LAS SEIS SON `.svg`, Y LAS SEIS ESTABAN ROTAS.
    //
    // Javier encontró el 6 de agosto (PR #33) que SALUD y CONVIVENCIA pedían un
    // `.jpg` inexistente. Al arreglar esas dos apareció lo de debajo: los seis
    // ficheros eran SVG **con la extensión `.png`**, así que el servidor los
    // servía como `image/png` y el navegador no los sabía descodificar. Las
    // otras cuatro también estaban rotas, solo que por un motivo distinto.
    //
    // Comprobado abriendo cada una en el navegador: las seis daban `onerror`
    // antes, y las seis pintan ahora. Lo que NO servía para verlo es el código
    // de estado: `/illustrations/salud.jpg` devolvía **200** — la aplicación
    // entera en HTML, porque el servidor responde cualquier ruta — y
    // `salud.png` devolvía 200 con `image/png` y bytes de SVG dentro. Un 200
    // por partida doble encima de dos fallos distintos.
    const defaults = {
      'AGUA': '/illustrations/agua.svg',
      'ALIMENTACIÓN': '/illustrations/alimentacion.svg',
      'VIVIENDA': '/illustrations/vivienda.svg',
      'SALUD': '/illustrations/salud.svg',
      'CONVIVENCIA': '/illustrations/convivencia.svg',
      'ECOSISTEMAS': '/illustrations/ecosistemas.svg',
    };
    return { ...defaults, ...soloLoElegido(localStorage.getItem('evo_objective_images')) };
  });

  const setLogoImage = (base64: string) => {
    setLogoImageState(base64);
    localStorage.setItem('evo_logo_image', base64);
  };

  const setObjectiveImage = (title: string, base64: string) => {
    setObjectiveImages(prev => {
      const newImages = { ...prev, [title]: base64 };
      localStorage.setItem('evo_objective_images', JSON.stringify(newImages));
      return newImages;
    });
  };

  useEffect(() => {
    const handleStorage = () => {
      // SE MEZCLA CON LOS VALORES POR DEFECTO, no se sustituyen. Antes esto
      // hacía `setObjectiveImages(JSON.parse(saved))` a pelo: una copia
      // guardada a la que le faltara un objetivo lo dejaba SIN imagen, y no
      // por decisión de nadie.
      setObjectiveImages(prev => ({ ...prev, ...soloLoElegido(localStorage.getItem('evo_objective_images')) }));

      const savedLogo = localStorage.getItem('evo_logo_image');
      if (savedLogo) {
        setLogoImageState(savedLogo);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <DesignContext.Provider value={{ objectiveImages, setObjectiveImage, logoImage, setLogoImage }}>
      {children}
    </DesignContext.Provider>
  );
}

export function useDesign() {
  const context = useContext(DesignContext);
  if (context === undefined) {
    throw new Error('useDesign must be used within a DesignProvider');
  }
  return context;
}

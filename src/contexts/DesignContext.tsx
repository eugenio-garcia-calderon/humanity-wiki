import React, { createContext, useContext, useState, useEffect } from 'react';

type DesignContextType = {
  objectiveImages: Record<string, string>;
  setObjectiveImage: (title: string, base64: string) => void;
  logoImage: string | null;
  setLogoImage: (base64: string) => void;
};

const DesignContext = createContext<DesignContextType | undefined>(undefined);

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const [logoImage, setLogoImageState] = useState<string | null>(() => {
    return localStorage.getItem('evo_logo_image') || null;
  });

  const [objectiveImages, setObjectiveImages] = useState<Record<string, string>>(() => {
    const defaults = {
      'AGUA': '/illustrations/agua.png',
      'ALIMENTACIÓN': '/illustrations/alimentacion.png',
      'VIVIENDA': '/illustrations/vivienda.png',
      'SALUD': '/illustrations/salud.png',
      'CONVIVENCIA': '/illustrations/convivencia.png',
      'ECOSISTEMAS': '/illustrations/ecosistemas.png',
    };
    const saved = localStorage.getItem('evo_objective_images');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaults, ...parsed };
      } catch (e) {
        console.error(e);
      }
    }
    return defaults;
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
      const saved = localStorage.getItem('evo_objective_images');
      if (saved) {
        try {
          setObjectiveImages(JSON.parse(saved));
        } catch (e) {}
      }

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

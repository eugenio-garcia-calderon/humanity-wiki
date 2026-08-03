import React, { createContext, useContext, useState, useEffect } from 'react';

export type FontScaleKey = 'sm' | 'md' | 'lg' | 'xl';

// Percentage applied to the root font-size — every rem-based Tailwind text
// utility in the app scales proportionally from this.
export const FONT_SCALE_PERCENT: Record<FontScaleKey, number> = {
  sm: 87.5,
  md: 100,
  lg: 112.5,
  xl: 125,
};

export const FONT_SCALE_LABELS: Record<FontScaleKey, string> = {
  sm: 'Pequeño',
  md: 'Normal',
  lg: 'Grande',
  xl: 'Muy grande',
};

type SettingsContextType = {
  fontScale: FontScaleKey;
  setFontScale: (scale: FontScaleKey) => void;
};

const SettingsContext = createContext<SettingsContextType>({
  fontScale: 'md',
  setFontScale: () => {},
});

const STORAGE_KEY = 'evo_font_scale';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [fontScale, setFontScaleState] = useState<FontScaleKey>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && saved in FONT_SCALE_PERCENT ? (saved as FontScaleKey) : 'md';
  });

  // Scaling the <html> root font-size, not individual components, so every
  // rem-based Tailwind size (text-sm, text-lg, etc.) across the whole app
  // scales together — no per-component wiring needed.
  useEffect(() => {
    document.documentElement.style.fontSize = `${FONT_SCALE_PERCENT[fontScale]}%`;
  }, [fontScale]);

  const setFontScale = (scale: FontScaleKey) => {
    setFontScaleState(scale);
    localStorage.setItem(STORAGE_KEY, scale);
  };

  return (
    <SettingsContext.Provider value={{ fontScale, setFontScale }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

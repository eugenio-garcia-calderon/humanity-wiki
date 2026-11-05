// Los tipos de letra que se pueden elegir para el calendario (2026-11-05,
// Eugenio: «permite editar el tipo de letra para que se pueda elegir otro»).
//
// Servidos desde nuestro propio dominio (@fontsource), NO desde Google Fonts:
// cargarlos de Google mandaría la IP de cada visitante a un tercero, y en
// Europa eso ya ha costado multas. Cada familia se descarga solo cuando
// alguien la elige; las dos primeras son del sistema y no descargan nada.

export interface Tipografia {
  id: string;
  nombre: string;
  familia: string;
  cargar?: () => Promise<unknown>;
}

export const TIPOGRAFIAS: Tipografia[] = [
  { id: 'serif', nombre: 'Serif clásica', familia: 'ui-serif, Georgia, Cambria, "Times New Roman", serif' },
  { id: 'sans', nombre: 'Sans moderna', familia: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' },
  { id: 'playfair', nombre: 'Playfair Display', familia: '"Playfair Display", Georgia, serif',
    cargar: () => Promise.all([import('@fontsource/playfair-display/400.css'), import('@fontsource/playfair-display/700.css'), import('@fontsource/playfair-display/400-italic.css')]) },
  { id: 'lora', nombre: 'Lora', familia: '"Lora", Georgia, serif',
    cargar: () => Promise.all([import('@fontsource/lora/400.css'), import('@fontsource/lora/700.css'), import('@fontsource/lora/400-italic.css')]) },
  { id: 'cormorant', nombre: 'Cormorant Garamond', familia: '"Cormorant Garamond", Georgia, serif',
    cargar: () => Promise.all([import('@fontsource/cormorant-garamond/400.css'), import('@fontsource/cormorant-garamond/700.css'), import('@fontsource/cormorant-garamond/400-italic.css')]) },
  { id: 'merriweather', nombre: 'Merriweather', familia: '"Merriweather", Georgia, serif',
    cargar: () => Promise.all([import('@fontsource/merriweather/400.css'), import('@fontsource/merriweather/700.css'), import('@fontsource/merriweather/400-italic.css')]) },
  { id: 'cinzel', nombre: 'Cinzel (mayúsculas clásicas)', familia: '"Cinzel", Georgia, serif',
    cargar: () => Promise.all([import('@fontsource/cinzel/400.css'), import('@fontsource/cinzel/700.css')]) },
  { id: 'montserrat', nombre: 'Montserrat', familia: '"Montserrat", system-ui, sans-serif',
    cargar: () => Promise.all([import('@fontsource/montserrat/400.css'), import('@fontsource/montserrat/700.css'), import('@fontsource/montserrat/400-italic.css')]) },
  { id: 'nunito', nombre: 'Nunito', familia: '"Nunito", system-ui, sans-serif',
    cargar: () => Promise.all([import('@fontsource/nunito/400.css'), import('@fontsource/nunito/700.css'), import('@fontsource/nunito/400-italic.css')]) },
  { id: 'josefin', nombre: 'Josefin Sans', familia: '"Josefin Sans", system-ui, sans-serif',
    cargar: () => Promise.all([import('@fontsource/josefin-sans/400.css'), import('@fontsource/josefin-sans/700.css'), import('@fontsource/josefin-sans/400-italic.css')]) },
  { id: 'caveat', nombre: 'Caveat (manuscrita)', familia: '"Caveat", cursive',
    cargar: () => Promise.all([import('@fontsource/caveat/400.css'), import('@fontsource/caveat/700.css')]) },
  { id: 'amatic', nombre: 'Amatic SC (dibujada)', familia: '"Amatic SC", cursive',
    cargar: () => Promise.all([import('@fontsource/amatic-sc/400.css'), import('@fontsource/amatic-sc/700.css')]) },
];

export interface EleccionTipografia { titulos: string; texto: string }
export const TIPOGRAFIA_POR_DEFECTO: EleccionTipografia = { titulos: 'serif', texto: 'serif' };

export const tipografia = (id?: string) => TIPOGRAFIAS.find(t => t.id === id) ?? TIPOGRAFIAS[0];

/** Descarga las familias elegidas (si hace falta) y espera a que estén listas:
 *  imprimir con la letra a medio cargar saca la página con la de reserva. */
export async function cargarTipografias(e: EleccionTipografia): Promise<void> {
  await Promise.all([tipografia(e.titulos), tipografia(e.texto)].map(t => t.cargar?.().catch(() => {})));
  try { await (document as any).fonts?.ready; } catch { /* sin API de fuentes: se sigue */ }
}

/** Las variables CSS que leen las hojas (`.ca-hoja`). */
export const estiloTipografia = (e: EleccionTipografia): Record<string, string> => ({
  '--ca-titulos': tipografia(e.titulos).familia,
  '--ca-texto': tipografia(e.texto).familia,
});

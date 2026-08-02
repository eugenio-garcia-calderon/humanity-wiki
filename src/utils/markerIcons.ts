import { Wind, FlaskConical, Thermometer, ShieldCheck, Microscope, Fish, Trash2, Info } from 'lucide-react';

// Keyed by marker id (same reasoning as indicator icons: names could repeat
// across indicators in the future).
export const MARKER_ICONS: Record<string, any> = {
  MARKER_AGUA_CALIDAD_OXIGENACION: Wind,
  MARKER_AGUA_CALIDAD_NUTRIENTES: FlaskConical,
  MARKER_AGUA_CALIDAD_FISICOQUIMICA: Thermometer,
  MARKER_AGUA_CALIDAD_PUREZA: ShieldCheck,
  MARKER_AGUA_CALIDAD_MICROBIOLOGIA: Microscope,
  MARKER_AGUA_CALIDAD_BIODIVERSIDAD: Fish,
  MARKER_AGUA_CALIDAD_RESIDUOS: Trash2,
};

export const DEFAULT_MARKER_ICON = Info;

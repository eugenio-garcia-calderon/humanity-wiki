import { Thermometer, Weight, Battery, Sprout, FlaskConical, Leaf, Atom, Bug, Info } from 'lucide-react';

export const METRIC_ICONS: Record<string, any> = {
  METRIC_PUREZA_MERCURIO: Thermometer,
  METRIC_PUREZA_PLOMO: Weight,
  METRIC_PUREZA_CADMIO: Battery,
  METRIC_PUREZA_NITRATOS: Sprout,
  METRIC_PUREZA_FOSFATOS: FlaskConical,
  METRIC_PUREZA_GLIFOSATO: Leaf,
  METRIC_PUREZA_PFAS: Atom,
  METRIC_PUREZA_PESTICIDAS: Bug,
};

export const DEFAULT_METRIC_ICON = Info;

// Discrete risk levels used for water-contaminant metrics, distinct from the
// continuous 0-100 score scale used for objectives/indicators/markers.
export const LEVEL_COLORS: Record<string, string> = {
  bajo: '#22c55e', // green-500
  moderado: '#facc15', // yellow-400
  alto: '#f97316', // orange-500
  peligroso: '#dc2626', // red-600
};

export const LEVEL_LABELS: Record<string, string> = {
  bajo: 'Bajo',
  moderado: 'Moderado',
  alto: 'Alto',
  peligroso: 'Peligroso',
};

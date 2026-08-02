import {
  Droplet, Beaker, Waves, Gauge, AlertTriangle, GlassWater, Wrench, Recycle, Sun,
  ShoppingBasket, Apple, Scale, ShieldCheck, Sprout, Trash2, Tractor, TrendingUp,
  KeyRound, Wallet, Building2, Zap, Maximize, Anchor,
  Handshake, Vote, HeartHandshake, Split, Globe2, Gift,
  PawPrint, TreePine, Factory,
  Info,
} from 'lucide-react';

// Keyed by indicator id (not name) since the same name (e.g. "Acceso", "Seguridad",
// "Sostenibilidad", "Productividad") is reused across different objectives.
export const INDICATOR_ICONS: Record<string, any> = {
  // AGUA
  IND_AGUA_ACCESO: Droplet,
  IND_AGUA_CALIDAD: Beaker,
  IND_AGUA_SANEAMIENTO: Waves,
  IND_AGUA_DISPONIBILIDAD: Gauge,
  IND_AGUA_ESTRES: AlertTriangle,
  IND_AGUA_CONSUMO: GlassWater,
  IND_AGUA_PERDIDAS: Wrench,
  IND_AGUA_REUTILIZACION: Recycle,
  IND_AGUA_SEQUIA: Sun,

  // ALIMENTACIÓN
  IND_ALIMENTACION_ACCESO: ShoppingBasket,
  IND_ALIMENTACION_NUTRICION: Apple,
  IND_ALIMENTACION_OBESIDAD: Scale,
  IND_ALIMENTACION_SEGURIDAD: ShieldCheck,
  IND_ALIMENTACION_SOSTENIBILIDAD: Sprout,
  IND_ALIMENTACION_DESPERDICIO: Trash2,
  IND_ALIMENTACION_AUTOSUFICIENCIA: Tractor,
  IND_ALIMENTACION_PRODUCTIVIDAD: TrendingUp,

  // VIVIENDA
  IND_VIVIENDA_ACCESO: KeyRound,
  IND_VIVIENDA_ASEQUIBILIDAD: Wallet,
  IND_VIVIENDA_CALIDAD: Building2,
  IND_VIVIENDA_EFICIENCIA: Zap,
  IND_VIVIENDA_ESPACIO: Maximize,
  IND_VIVIENDA_SOSTENIBILIDAD: Sprout,
  IND_VIVIENDA_ESTABILIDAD: Anchor,
  IND_VIVIENDA_PRODUCTIVIDAD: TrendingUp,

  // CONVIVENCIA
  IND_CONVIVENCIA_SEGURIDAD: ShieldCheck,
  IND_CONVIVENCIA_CONFIANZA: Handshake,
  IND_CONVIVENCIA_PARTICIPACION: Vote,
  IND_CONVIVENCIA_IGUALDAD: Scale,
  IND_CONVIVENCIA_INCLUSION: HeartHandshake,
  IND_CONVIVENCIA_POLARIZACION: Split,
  IND_CONVIVENCIA_DIVERSIDAD: Globe2,
  IND_CONVIVENCIA_SOLIDARIDAD: Gift,

  // ECOSISTEMAS
  IND_ECOSISTEMAS_BIODIVERSIDAD: PawPrint,
  IND_ECOSISTEMAS_PROTECCION: ShieldCheck,
  IND_ECOSISTEMAS_BOSQUES: TreePine,
  IND_ECOSISTEMAS_AGUA: Droplet,
  IND_ECOSISTEMAS_EMISIONES: Factory,
  IND_ECOSISTEMAS_REGENERACION: Sprout,
  IND_ECOSISTEMAS_CIRCULARIDAD: Recycle,
  IND_ECOSISTEMAS_PRODUCTIVIDAD: TrendingUp,
};

export const DEFAULT_INDICATOR_ICON = Info;

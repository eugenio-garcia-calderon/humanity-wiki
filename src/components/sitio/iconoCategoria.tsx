import type { ReactNode } from 'react';
import {
  BarChart3, Bot, Gauge, Banknote, Briefcase, Building2, Car, CloudSun, Coins, Construction, Cpu, Droplet, Factory, FlaskConical, GraduationCap, HandHeart, Handshake,
  HeartPulse, Home, Landmark, Layers, Leaf, Lightbulb, Music, Palette, PersonStanding, RadioTower, Recycle, Scale, Shirt, ShoppingCart, Sparkles, Store, Sun,
  Tag, Tent, Users, Wheat, Wind, Zap, type LucideIcon,
} from 'lucide-react';

// EL ICONO DE CADA CATEGORÍA (2026-11-10, Eugenio: «un icono muy sencillito por cada categoría»).
// Se busca por el nombre de la fila de Sistemas, sin tildes ni mayúsculas. Una categoría nueva
// lleva la etiqueta genérica hasta que se le ponga el suyo aquí.
const ICONOS: Record<string, LucideIcon> = {
  movilidad: Car, economia: Coins, salud: HeartPulse, ecologia: Leaf, relaciones: Users, energia: Zap, alimentacion: Wheat, convivencia: Handshake,
  trabajo: Briefcase, climatologia: CloudSun, educacion: GraduationCap, informatica: Cpu, cultura: Palette, agua: Droplet, empresas: Building2,
  vivienda: Home, politica: Landmark, telecomunicaciones: RadioTower, materiales: Layers, finanzas: Banknote, vestimenta: Shirt, fabricacion: Factory,
  residuos: Recycle, justicia: Scale, comercio: Store, ciencia: FlaskConical, conciencia: Sparkles, demografia: PersonStanding,
  infraestructuras: Construction, consumo: ShoppingCart, 'vehiculo solar': Sun, 'vehiculo aerodinamico': Wind, 'mini casas': Tent,
  'contact improvisacion': HandHeart, biodanza: Music,
  // «Otras innovaciones», el último sector de la portada (2026-11-12).
  otras: Lightbulb,
  'datos abiertos': BarChart3, robotica: Bot, 'competicion solar': Sun, 'eficiencia energetica': Gauge,
  // En los dominios traducidos la categoría llega en su idioma.
  mobilidade: Car, saude: HeartPulse, habitacao: Home, alimentacao: Wheat, 'dados abertos': BarChart3, 'competicao solar': Sun, consciencia: Sparkles, educacao: GraduationCap,
  'open data': BarChart3, robotics: Bot, 'solar competition': Sun, 'solar racing': Sun, 'energy efficiency': Gauge,
  mobility: Car, economy: Coins, health: HeartPulse, ecology: Leaf, relationships: Users, energy: Zap, food: Wheat, coexistence: Handshake, work: Briefcase,
  climatology: CloudSun, education: GraduationCap, 'computer science': Cpu, computing: Cpu, culture: Palette, water: Droplet, companies: Building2, housing: Home,
  politics: Landmark, telecommunications: RadioTower, materials: Layers, finance: Banknote, clothing: Shirt, manufacturing: Factory, waste: Recycle, justice: Scale,
  commerce: Store, science: FlaskConical, consciousness: Sparkles, demographics: PersonStanding, infrastructure: Construction, consumption: ShoppingCart,
};

const clave = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function iconoCategoria(nombre: string, clase = 'h-4 w-4 shrink-0 text-slate-700'): ReactNode {
  const Icono = ICONOS[clave(nombre)] || Tag;
  return <Icono aria-hidden className={clase} strokeWidth={2.25} />;
}

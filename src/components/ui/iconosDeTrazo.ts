// ============================================================================
// LOS DIBUJOS DE LOS ICONOS DE TRAZO (D90, 2026-08-21)
// ============================================================================
// El diccionario que decide QUÉ icono le toca a un nombre vive en
// `src/utils/iconoDeNombre.ts`, y no importa nada de aquí: lo usa también el
// servidor al crear un proyecto, y meterle lucide-react sería meter React en
// el backend. Aquí están los DIBUJOS, que solo hacen falta en el navegador.
//
// SE IMPORTAN UNO A UNO A PROPÓSITO. lucide-react trae 5.592 iconos; traerlos
// todos metería megas en un paquete que ya son 3,5 MB. Solo entran los que el
// diccionario puede llegar a devolver, así que el coste es el de esta lista.
import {
  Box, Truck, Sun, Ship, Home, Trees, Droplet, Zap, Map, Car, Plane, Rocket,
  Wallet, HeartPulse, BookOpen, Wrench, Cpu, Camera, Music, Utensils, Sprout,
  Recycle, Wind, Building2, Users, Target, Lightbulb, Globe2, GraduationCap,
  Bike, Tent, Hammer, FlaskConical, Bot, ShoppingBag, Briefcase, Calendar,
  PawPrint, Fish, Mountain, Waves, Factory, Battery, Bed, Shirt, Pill, Scale,
  Landmark, Palette, Newspaper, Video, Wifi, Train,
  type LucideIcon,
} from 'lucide-react';
import { PREFIJO, ICONO_GENERICO } from '../../utils/iconoDeNombre';

export const ICONOS: Record<string, LucideIcon> = {
  Box, Truck, Sun, Ship, Home, Trees, Droplet, Zap, Map, Car, Plane, Rocket,
  Wallet, HeartPulse, BookOpen, Wrench, Cpu, Camera, Music, Utensils, Sprout,
  Recycle, Wind, Building2, Users, Target, Lightbulb, Globe2, GraduationCap,
  Bike, Tent, Hammer, FlaskConical, Bot, ShoppingBag, Briefcase, Calendar,
  PawPrint, Fish, Mountain, Waves, Factory, Battery, Bed, Shirt, Pill, Scale,
  Landmark, Palette, Newspaper, Video, Wifi, Train,
};

/** El dibujo de un valor «lucide:Truck». Si el nombre no está en la lista
 *  —porque alguien lo escribió a mano, o porque se quitó de aquí— se devuelve
 *  el genérico en vez de nada: un hueco vacío no dice qué ha pasado. */
export const componenteDeTrazo = (icono: string): LucideIcon =>
  ICONOS[icono.slice(PREFIJO.length)] || ICONOS[ICONO_GENERICO];

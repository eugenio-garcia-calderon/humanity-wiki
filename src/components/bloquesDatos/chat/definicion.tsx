import { lazy } from 'react';
import { MessageCircle } from 'lucide-react';
import { definirBloque } from '../tipos';

// 3.12 del plan de Wikiproducts: el chat de ayuda del sitio. El servidor es
// `src/server/soporte.ts`.
//
// FUERA DEL MENÚ por decisión de Eugenio (2026-10-18): «de momento no añadas lo
// del chat de ayuda». El código se queda: el servidor de conversaciones lo usa
// también la reserva de expertos (el chat con el experto tras pagar), y un
// bloque ya puesto en una página se sigue pintando. Volver a ofrecerlo es
// borrar `enMenu: false`.
export default definirBloque({
  tipo: 'chat',
  label: 'Chat de ayuda',
  icon: MessageCircle,
  desc: 'Los visitantes preguntan y el equipo del sitio responde',
  color: 'text-emerald-600',
  claves: 'soporte atención cliente ayuda contacto mensajes',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  enMenu: false,
  datosIniciales: () => ({ titulo: '¿Tienes una duda?', intro: '', flotante: false }),
});

import { lazy } from 'react';
import { MessageCircle } from 'lucide-react';
import { definirBloque } from '../tipos';

// 3.12 del plan de Wikiproducts: el chat de ayuda del sitio. El servidor es
// `src/server/soporte.ts`.
export default definirBloque({
  tipo: 'chat',
  label: 'Chat de ayuda',
  icon: MessageCircle,
  desc: 'Los visitantes preguntan y el equipo del sitio responde',
  color: 'text-emerald-600',
  claves: 'soporte atención cliente ayuda contacto mensajes',
  Lectura: lazy(() => import('./Lectura')),
  Editor: lazy(() => import('./Editor')),
  datosIniciales: () => ({ titulo: '¿Tienes una duda?', intro: '', flotante: false }),
});

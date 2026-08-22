import { useEffect, useState } from 'react';
import { PhoneOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { conectar, desconectar, desbloquearAudio } from '../../telecom/motor';
import LlamadaEntrante from './LlamadaEntrante';
import PanelLlamada from './PanelLlamada';

// ============================================================================
// LA CAPA DE TELECOMUNICACIONES (2026-08-22)
// ============================================================================
// Se monta UNA VEZ, en `Layout`, y por eso el teléfono suena estés en la
// página que estés. Montarla en la pantalla de Mensajes habría sido más
// sencillo y habría significado que solo te llaman si ya estabas mirando los
// mensajes, que es como tener el timbre dentro de casa.
//
// TRES COSAS Y NADA MÁS: abre el cable cuando hay sesión, lo cierra cuando no,
// y pinta el timbre y la llamada. Todo lo que piensa está en `telecom/motor`.

export default function CapaTelecom() {
  const { user } = useAuth();
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { desconectar(); return; }
    conectar();
    // EL SONIDO SE DESBLOQUEA CON EL PRIMER TOQUE, sea cual sea. El navegador
    // no deja sonar a una página que no ha recibido ninguna interacción, y
    // cuando te llaman ya es tarde para pedirla. Un solo oyente, y se va.
    const abrirAudio = () => desbloquearAudio();
    window.addEventListener('pointerdown', abrirAudio, { once: true });
    window.addEventListener('keydown', abrirAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', abrirAudio);
      window.removeEventListener('keydown', abrirAudio);
    };
  }, [user]);

  // «No ha contestado», «no tiene la aplicación abierta». Se enseña abajo y se
  // va solo: es información de hace cinco segundos, no un error que resolver.
  useEffect(() => {
    const alAvisar = (e: any) => {
      setAviso(e.detail?.texto || null);
      setTimeout(() => setAviso(null), 6000);
    };
    window.addEventListener('telecom:aviso', alAvisar as any);
    return () => window.removeEventListener('telecom:aviso', alAvisar as any);
  }, []);

  if (!user) return null;

  return (
    <>
      <LlamadaEntrante />
      <PanelLlamada />
      {aviso && (
        <p className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[65] inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <PhoneOff className="w-3.5 h-3.5 text-rose-400" /> {aviso}
        </p>
      )}
    </>
  );
}

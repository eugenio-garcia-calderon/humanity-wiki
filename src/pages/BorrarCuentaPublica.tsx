import { Link } from 'react-router-dom';
import { Clock, Mail, Trash2, UserX } from 'lucide-react';

// ============================================================================
// CÓMO BORRAR TU CUENTA · PÁGINA PÚBLICA (2026-08-22, Programador 3)
// ============================================================================
// La exige Google Play: una dirección **pública**, alcanzable **sin tener la
// aplicación instalada y sin iniciar sesión**, donde cualquiera pueda ver cómo
// se borra su cuenta y qué pasa con sus datos. Sin ella, la ficha de Play no se
// aprueba.
//
// LA DIRECCIÓN NO SE CAMBIA NUNCA MÁS. Se pega en la ficha de Play, y cambiarla
// después obliga a volver a pasar revisión. Es `/borrar-cuenta` a propósito:
// corta, evidente y sin nada que pueda reorganizarse luego. Si algún día se
// mueve, hay que dejar una redirección, no un 404.
//
// POR QUÉ DICE TAMBIÉN LO QUE **NO** SE BORRA. Es la parte que la gente
// descubre después y que provoca la queja —y el rechazo de la tienda—: sus
// publicaciones siguen ahí, sin su nombre. Decirlo antes no es un trámite
// legal, es la diferencia entre una decisión informada y una sorpresa.
//
// Y NO ES UN FORMULARIO. Un formulario público que dispara borrados de cuenta
// es una máquina de borrar cuentas ajenas: cualquiera escribe el correo de otro.
// El borrado real se pide desde dentro, ya identificado. Aquí se explica cómo, y
// se da una vía humana para quien no pueda entrar.

export default function BorrarCuentaPublica() {
  return (
    <div className="max-w-2xl mx-auto px-5 py-8 pb-[calc(2rem+var(--hueco-muelle,0px))]">
      <header className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tu cuenta</p>
        <h1 className="text-3xl font-black text-slate-900 mt-1">Borrar tu cuenta</h1>
        <p className="mt-3 text-slate-600 leading-relaxed">
          Puedes borrar tu cuenta de humanity.wiki cuando quieras, sin pedir permiso
          a nadie y sin dar explicaciones. Aquí está cómo, y qué pasa exactamente
          con lo tuyo.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
        <h2 className="text-sm font-black text-slate-900 mb-3">Cómo se pide</h2>
        <ol className="space-y-3 text-sm text-slate-600 leading-relaxed list-none">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black grid place-items-center">1</span>
            <span>Entra en tu cuenta, en la aplicación o en <strong>humanity.wiki</strong>.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black grid place-items-center">2</span>
            <span>Abre <Link to="/configuracion" className="font-bold text-emerald-700 hover:underline">Configuración</Link>, desde tu foto arriba a la derecha.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black grid place-items-center">3</span>
            <span>Abajo del todo, <strong>«Borrar mi cuenta»</strong>. Te pedirá tu contraseña para confirmar que eres tú.</span>
          </li>
        </ol>
        <p className="mt-4 text-xs text-slate-500 leading-relaxed flex gap-2">
          <Mail className="w-4 h-4 shrink-0 text-slate-400 mt-px" />
          <span>
            ¿No puedes entrar en tu cuenta? Escribe a{' '}
            <a href="mailto:hola@lighthumanity.org?subject=Borrar%20mi%20cuenta" className="font-bold text-emerald-700 hover:underline">
              hola@lighthumanity.org
            </a>{' '}
            desde el correo con el que te registraste y lo hacemos nosotros.
          </span>
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
        <h2 className="text-sm font-black text-slate-900 mb-3">Qué se borra</h2>
        <ul className="space-y-2.5 text-sm text-slate-600 leading-relaxed">
          {[
            'Tu nombre',
            'Tu correo electrónico',
            'Tu foto de perfil',
            'Tu contraseña y tu vínculo con Google, si lo usabas',
            'Tus sesiones abiertas, en todos tus dispositivos',
          ].map(t => (
            <li key={t} className="flex gap-2.5">
              <Trash2 className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 mb-5">
        <h2 className="text-sm font-black text-amber-900 mb-2 flex items-center gap-2">
          <UserX className="w-4 h-4" /> Qué NO se borra, y por qué
        </h2>
        <p className="text-sm text-amber-900/90 leading-relaxed">
          <strong>Lo que hayas publicado se queda, pero sin tu nombre.</strong> Tus
          proyectos, publicaciones y lienzos siguen ahí firmados como «Usuario
          eliminado».
        </p>
        <p className="mt-2.5 text-sm text-amber-900/80 leading-relaxed">
          Esto es una plataforma de conocimiento común: otras personas construyen
          encima de lo que se publica. Borrar tus aportaciones se llevaría por
          delante el trabajo de gente que no ha decidido irse. Si además quieres
          que desaparezca algo concreto que escribiste,{' '}
          <Link to="/hormiguero" className="font-bold underline">pídelo por Feedback</Link>{' '}
          antes de borrar la cuenta: cada cosa tiene su propia papelera.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-black text-slate-900 mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" /> Cuánto tarda
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          <strong>15 días.</strong> Al pedirlo se cierran todas tus sesiones y tu
          cuenta queda en una papelera. Durante esos 15 días puedes arrepentirte:
          basta con volver a entrar y el borrado se cancela. Pasados los 15 días,
          tus datos personales se borran de verdad y ya no hay vuelta atrás.
        </p>
      </section>
    </div>
  );
}

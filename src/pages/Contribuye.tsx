import React, { useEffect, useState } from 'react';
import { Mail, Heart, Copy, Check, Sparkles, ShieldCheck, ExternalLink, UserPlus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// Declare custom Web Component for Stripe Buy Button in TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-buy-button': any;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-buy-button': any;
    }
  }
}

export default function Contribuye() {
  const [copied, setCopied] = useState(false);
  const email = "administracion@lighthumanity.org";

  useEffect(() => {
    const scriptId = 'stripe-buy-button-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://js.stripe.com/v3/buy-button.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 sm:py-10 px-4">
      {/* Header Banner */}
      <div className="text-center mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-4">
          <Heart className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
          <span>Red Humana de Bienestar Colectivo</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Contribuye al proyecto
        </h1>
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Tu apoyo nos permite mantener libre y abierta esta plataforma sistémica de diagnóstico territorial, catalizar soluciones regenerativas e impactar comunidades en todo el mundo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12">
        {/* Card 1: Hazte Socio (Destacado) */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-md hover:shadow-xl transition-all flex flex-col justify-between relative overflow-hidden md:col-span-3 lg:col-span-1">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
              <UserPlus className="w-6 h-6" />
            </div>
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-2">
              Suscripción Embebida
            </div>
            <h2 className="text-xl font-bold mb-2">
              Hazte Socio de Red Humana
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Únete como socio para sostener activamente la red, participar en decisiones y acceder a informes exclusivos.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <Link
              to="/hazte-socio"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-md"
            >
              <span>Hazte Socio Ahora</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Card 2: Sugerencias e Ideas */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Sugerencias e Ideas
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              ¿Tienes propuestas para mejorar los indicadores territoriales, propones nuevas soluciones sistémicas o detectaste algún dato a actualizar? Nos encantaría escucharte.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-mono font-medium text-slate-800 truncate pr-2">
                {email}
              </span>
              <button
                onClick={handleCopyEmail}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition-colors flex items-center gap-1 text-xs shrink-0"
                title="Copiar email"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
            
            <a
              href={`mailto:${email}?subject=Sugerencia%20Red%20Humana`}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
            >
              <span>Enviar un correo</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Card 2: Donaciones */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
              <Heart className="w-6 h-6 fill-emerald-500 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Donaciones
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              Cada aportación directa fortalece la investigación, el desarrollo del software abierto y el sostenimiento técnico del mapa planetario de necesidades básicas.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col items-center">
            <div className="w-full flex justify-center py-2">
              <stripe-buy-button
                buy-button-id="buy_btn_1TzON7JaJSkpTAGB8a17mEZI"
                publishable-key="pk_live_iDi7hxy87hT19E0rqb2O3LJJ"
              >
              </stripe-buy-button>
            </div>
            <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pago seguro procesado mediante Stripe</span>
            </p>
          </div>
        </div>
      </div>

      {/* Trust & Open Transparency Footer Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1">Impacto Transparente</h3>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Red Humana forma parte de la iniciativa de Light Humanity para garantizar el acceso a las necesidades humanas fundamentales en todos los territorios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

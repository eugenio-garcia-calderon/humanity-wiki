import { Link } from 'react-router-dom';

export default function AboutRoot() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight font-display mb-4">Sobre Humanity.wiki</h1>
        <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
          La Plataforma para la Evolución de la Humanidad. Un sistema para monitorizar y mejorar el estado de nuestros territorios a través de datos objetivos, retos compartidos y soluciones sistémicas.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Link to="/sobre-red-humana/puntuacion-territorios" className="group block p-6 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-lg transition-all duration-300">
          <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">Puntuación de Territorios</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Descubre cómo se calculan los indicadores de progreso para cada objetivo en las diferentes regiones, y cómo evolucionará este sistema en el futuro.
          </p>
        </Link>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function AboutScoring() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Link to="/sobre-red-humana" className="inline-flex items-center text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver a Sobre Red Humana
      </Link>
      
      <div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight font-display mb-4">Puntuación de Territorios</h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          Comprendiendo los indicadores de progreso y evolución de nuestros territorios.
        </p>
      </div>
      
      <div className="prose prose-slate prose-emerald max-w-none">
        <p className="text-slate-700 leading-relaxed mb-6">
          El mapa de Red Humana utiliza un sistema de puntuación de 0 a 100 para evaluar el estado de los territorios en cada uno de los grandes Objetivos Universales (Agua, Alimentación, Vivienda, Salud, Convivencia, Ecosistemas, Educación, Movilidad, Energía, Tecnología, Empleo, Gobernanza, Economía y Cultura). Este índice permite identificar visualmente las áreas que requieren mayor atención y recursos.
        </p>
        
        <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl mb-8">
          <h3 className="text-lg font-bold text-emerald-900 mb-2">Fase actual (Prototipo MVP)</h3>
          <p className="text-emerald-800 text-sm leading-relaxed">
            En la versión actual de la plataforma, los indicadores son establecidos de forma centralizada por el equipo de Red Humana, sirviendo como datos de referencia y calibración inicial para el funcionamiento técnico del mapa.
          </p>
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 mb-4">El futuro de las métricas territoriales</h2>
        <p className="text-slate-700 leading-relaxed mb-4">
          La visión de Red Humana no es ser un árbitro central de la verdad, sino una herramienta de autoconocimiento sistémico. En futuras versiones de la plataforma, el cálculo de las puntuaciones evolucionará hacia un modelo dinámico y distribuido:
        </p>
        
        <ul className="space-y-4 mb-8 list-none pl-0">
          <li className="flex gap-4 items-start">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm mt-1">1</span>
            <div>
              <strong className="block text-slate-900 mb-1">Métricas relativas al entorno</strong>
              <span className="text-slate-600 text-sm leading-relaxed">Los indicadores de tu territorio serán relativos a tus vecinos geográficos y contextos sociodemográficos similares, ofreciendo una perspectiva mucho más realista de los retos y oportunidades de mejora a escala local.</span>
            </div>
          </li>
          <li className="flex gap-4 items-start">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm mt-1">2</span>
            <div>
              <strong className="block text-slate-900 mb-1">Expectativas ciudadanas</strong>
              <span className="text-slate-600 text-sm leading-relaxed">La puntuación ideal no será un estándar global estático. Las propias expectativas de la sociedad y lo que los ciudadanos marquen como sus prioridades y necesidades aceptables definirán las metas de éxito para cada indicador.</span>
            </div>
          </li>
          <li className="flex gap-4 items-start">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm mt-1">3</span>
            <div>
              <strong className="block text-slate-900 mb-1">Datos abiertos y participativos</strong>
              <span className="text-slate-600 text-sm leading-relaxed">Integración con bases de datos públicas, censos y herramientas de reporte ciudadano para alimentar el sistema con información en tiempo real, validada por la propia comunidad.</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}

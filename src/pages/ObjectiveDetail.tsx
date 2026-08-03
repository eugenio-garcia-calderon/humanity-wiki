import { useHelpers } from '../contexts/DataContext';
import React from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';

import { useDesign } from '../contexts/DesignContext';
import { cn } from '../utils/cn';
import { slugify } from '../utils/slugify';

// Colors for each objective
const objectiveColors: Record<string, { from: string; to: string; bg: string; text: string; border: string }> = {
  'AGUA': { from: 'from-cyan-500', to: 'to-blue-600', bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100' },
  'ALIMENTACIÓN': { from: 'from-orange-400', to: 'to-red-500', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
  'VIVIENDA': { from: 'from-yellow-400', to: 'to-amber-500', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
  'SALUD': { from: 'from-rose-400', to: 'to-red-500', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
  'CONVIVENCIA': { from: 'from-purple-500', to: 'to-pink-500', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  'ECOSISTEMAS': { from: 'from-emerald-400', to: 'to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  'EDUCACIÓN': { from: 'from-sky-500', to: 'to-blue-600', bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-100' },
  'MOVILIDAD': { from: 'from-orange-400', to: 'to-amber-600', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
  'ENERGÍA': { from: 'from-yellow-400', to: 'to-orange-500', bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100' },
  'TECNOLOGÍA': { from: 'from-cyan-500', to: 'to-sky-600', bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100' },
  'EMPLEO': { from: 'from-lime-500', to: 'to-green-600', bg: 'bg-lime-50', text: 'text-lime-600', border: 'border-lime-100' },
  'GOBERNANZA': { from: 'from-fuchsia-500', to: 'to-purple-600', bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', border: 'border-fuchsia-100' },
  'ECONOMÍA': { from: 'from-violet-500', to: 'to-indigo-600', bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100' },
  'CULTURA': { from: 'from-pink-500', to: 'to-rose-600', bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100' },
};

const defaultColors = { from: 'from-slate-400', to: 'to-slate-600', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100' };

export default function ObjectiveDetail() {
  const { objectives, challenges, solutions, loading } = useHelpers();
  const { id } = useParams<{ id: string }>();
  const { objectiveImages } = useDesign();
  if(loading) return <div>Cargando...</div>;
  
  const decodedId = decodeURIComponent(id || '');
  
  const objective = objectives.find(o => 
    o.title.toLowerCase() === decodedId.toLowerCase() || 
    o.id.toLowerCase() === decodedId.toLowerCase()
  );

  if (!objective) {
    return <Navigate to="/" replace />;
  }

  const objChallenges = challenges.filter(c => 
    (c.objectives && c.objectives.includes(objective.id)) || 
    (objective.challenge_ids && objective.challenge_ids.includes(c.id))
  );

  const image = objectiveImages[objective.title];
  const colors = objectiveColors[objective.title.toUpperCase()] || defaultColors;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 min-h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
          <Link to="/" className={`hover:${colors.text} transition-colors`}>Inicio</Link>
          <span>/</span>
          <Link to="/objetivos" className={`hover:${colors.text} transition-colors`}>Objetivos</Link>
          <span>/</span>
          <span className={colors.text}>{objective.title}</span>
        </div>
      </div>

      {/* Hero Section */}
      <div className={`bg-gradient-to-r ${colors.from} ${colors.to} rounded-3xl p-8 md:p-12 text-white shadow-lg relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 md:w-48 md:h-48 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md p-4 shrink-0 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
            {image ? (
              <img src={image} alt={objective.title} className="w-full h-full object-contain filter drop-shadow-md brightness-0 invert" />
            ) : (
              <span className="text-6xl">🎯</span>
            )}
          </div>
          <div>
            <span className="text-xs font-bold text-white/80 uppercase tracking-widest bg-black/20 px-4 py-2 rounded-full inline-block mb-4">
              Página de Objetivo
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 drop-shadow-sm">{objective.title}</h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl leading-relaxed">{objective.description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Challenges */}
        <div className="flex flex-col gap-4">
          <h3 className={`text-sm font-bold ${colors.text} uppercase tracking-widest mb-2 border-b ${colors.border} pb-2 flex items-center gap-2`}>
            <span>RETOS DEL OBJETIVO</span>
            <span className={`${colors.bg} ${colors.text} px-2 py-0.5 rounded-full text-[10px]`}>{objChallenges.length}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
            {objChallenges.map(challenge => (
              <Link 
                key={challenge.id} 
                to={`/retos/${slugify(challenge.title)}`}
                className={`bg-white border ${colors.border} rounded-2xl p-5 hover:border-slate-300 hover:shadow-md hover:-translate-y-1 transition-all group block relative overflow-hidden`}
              >
                <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl ${colors.from} to-transparent opacity-10 -mr-8 -mt-8 rounded-full transition-transform group-hover:scale-150`}></div>
                <div className="flex items-start gap-4 relative z-10">
                  <div>
                    <h4 className={`font-bold text-sm text-slate-900 group-hover:${colors.text} transition-colors mb-1`}>{challenge.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{challenge.description}</p>
                  </div>
                </div>
              </Link>
            ))}
            {objChallenges.length === 0 && (
              <div className="text-center p-8 border border-dashed border-slate-200 rounded-xl col-span-full">
                <span className="text-sm text-slate-400 italic">No hay retos vinculados.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Solutions */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-2 border-b border-slate-200 pb-2">SOLUCIONES</h3>
          <div className="flex flex-col gap-3">
            {objChallenges.flatMap(challenge => {
              const chalSolutions = solutions.filter(s => s.challenge_ids && s.challenge_ids.includes(challenge.id));
              return chalSolutions.map(solution => (
                <Link 
                  key={solution.id} 
                  to={`/soluciones/${slugify(solution.title)}`}
                  className="bg-white border border-slate-100 rounded-2xl p-4 hover:border-slate-300 hover:shadow-md transition-all group block"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-slate-600 transition-colors">{solution.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">Para combatir: <span className={colors.text}>{challenge.title}</span></p>
                    </div>
                  </div>
                </Link>
              ));
            })}
            {objChallenges.length === 0 && (
              <div className="text-center p-8 border border-dashed border-slate-200 rounded-xl">
                <span className="text-sm text-slate-400 italic">Añade retos para ver soluciones.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

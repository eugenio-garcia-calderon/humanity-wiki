import { useHelpers } from '../contexts/DataContext';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { cn } from '../utils/cn';
import { Search } from 'lucide-react';
import { slugify } from '../utils/slugify';
import { AdminMenu } from '../components/ui/AdminMenu';
import { useEdit } from '../contexts/EditContext';

export default function Solutions() {
  const { objectives, challenges, solutions, loading } = useHelpers();
  if(loading) return <div>Cargando...</div>;

  const [searchTerm, setSearchTerm] = useState('');
  
  const { openEdit, updateCounter, triggerUpdate } = useEdit();
  const navigate = useNavigate();

  return (
    <div key={updateCounter} className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Soluciones</h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          Explora las soluciones propuestas para cada reto, agrupadas por objectives principales.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Buscar soluciones..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
        />
      </div>

      <div className="flex flex-col gap-12">
        {objectives.map(obj => {
          const objChallenges = challenges.filter(c => c.objectives.includes(obj.id));
          
          let hasMatchingSolutions = false;
          
          const challengesWithSolutions = objChallenges.map(challenge => {
            const chalSolutions = solutions.filter(s => s.challenge_ids.includes(challenge.id) && s.title.toLowerCase().includes(searchTerm.toLowerCase()));
            if (chalSolutions.length > 0) hasMatchingSolutions = true;
            return { challenge, solutions: chalSolutions };
          }).filter(item => item.solutions.length > 0);
          
          if (!hasMatchingSolutions) return null;

          return (
            <div key={obj.id} className="space-y-6">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-2 h-6 bg-emerald-500 rounded-full inline-block"></span>
                {obj.title}
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {challengesWithSolutions.map(({ challenge, solutions: chalSolutions }) => (
                  <div key={challenge.id} className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                    <div className="mb-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">RETO</span>
                      <h3 className="font-bold text-sm text-slate-900">
                        {challenge.title}
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {chalSolutions.map(solution => (
                        <div 
                          key={solution.id} 
                          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-emerald-500 hover:shadow-sm transition-all h-full flex flex-col relative group cursor-pointer"
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('.admin-menu-trigger')) return;
                            navigate(`/soluciones/${slugify(solution.title)}`);
                          }}
                        >
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity admin-menu-trigger z-10">
                            <AdminMenu onEdit={() => {
                              openEdit('Solución', solution, (data) => {
                                Object.assign(solution, data);
                                triggerUpdate();
                              }, (data) => {
                                const idx = solutions.findIndex(s => s.id === data.id);
                                if (idx > -1) solutions.splice(idx, 1);
                                triggerUpdate();
                              });
                            }} />
                          </div>
                          
                          <span className="text-[10px] font-bold text-emerald-600 mb-2">SOLUCIÓN</span>
                          <h4 className="font-bold text-xs text-slate-900 group-hover:text-emerald-600 transition-colors leading-tight">
                            {solution.title}
                          </h4>
                          {solution.description && (
                            <p className="text-[10px] text-slate-500 mt-2 line-clamp-2">{solution.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

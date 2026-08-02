import { useHelpers } from '../contexts/DataContext';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { cn } from '../utils/cn';
import { Search, MapPin } from 'lucide-react';
import { slugify } from '../utils/slugify';
import { AdminMenu } from '../components/ui/AdminMenu';
import { useEdit } from '../contexts/EditContext';

export default function Challenges() {
  const { objectives, challenges, territories, loading } = useHelpers();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('');

  const { openEdit, updateCounter, triggerUpdate } = useEdit();
  const navigate = useNavigate();
  if(loading) return <div>Cargando...</div>;

  const typeTerritories = territories.filter(t => t.type === 'municipality' || t.type === 'region' || t.type === 'country');

  const filteredObjectives = objectives.filter(obj => {
    const objChallenges = challenges.filter(c => c.objectives.includes(obj.id));
    return objChallenges.some(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div key={updateCounter} className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Retos</h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          Explora los diferentes retos agrupados por objectives principales.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar retos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>
        
        <div className="relative md:w-64">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 flex items-center justify-center pointer-events-none">
            <MapPin className="w-4 h-4" />
          </div>
          <select 
            value={selectedTerritoryId}
            onChange={(e) => setSelectedTerritoryId(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all appearance-none cursor-pointer"
          >
            <option value="">Todos los territories</option>
            {typeTerritories.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      
      <div className="flex flex-col gap-12">
        {(searchTerm ? filteredObjectives : objectives).map(obj => {
          let objChallenges = challenges.filter(c => c.objectives && c.objectives.includes(obj.id) && c.title.toLowerCase().includes(searchTerm.toLowerCase()));
          
          if (selectedTerritoryId) {
            objChallenges = objChallenges.filter(c => c.territory_ids && c.territory_ids.includes(selectedTerritoryId));
          }
          
          if (objChallenges.length === 0) return null;
          return (
            <div key={obj.id} className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-500 rounded-full inline-block"></span>
                {obj.title}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {objChallenges.map(challenge => (
                  <div 
                    key={challenge.id} 
                    className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-500 hover:shadow-md transition-all h-full flex flex-col relative group cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('.admin-menu-trigger')) return;
                      navigate(`/retos/${slugify(challenge.title)}`);
                    }}
                  >
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity admin-menu-trigger z-10">
                      <AdminMenu onEdit={() => {
                        openEdit('Reto', challenge, (data) => {
                          Object.assign(challenge, data);
                          triggerUpdate();
                        }, (data) => {
                          const idx = challenges.findIndex(c => c.id === data.id);
                          if (idx > -1) challenges.splice(idx, 1);
                          triggerUpdate();
                        });
                      }} />
                    </div>
                    
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">RETO</span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors pr-6">
                      {challenge.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-3 mt-auto">
                      {challenge.description || "Sin descripción detallada."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        
        {/* Unassigned challenges */}
        {(() => {
          let unassigned = challenges.filter(c => (!c.objectives || c.objectives.length === 0) && c.title.toLowerCase().includes(searchTerm.toLowerCase()));
          if (selectedTerritoryId) {
            unassigned = unassigned.filter(c => c.territory_ids && c.territory_ids.includes(selectedTerritoryId));
          }
          if (unassigned.length === 0) return null;
          
          return (
            <div className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight text-slate-400 flex items-center gap-2">
                <span className="w-2 h-6 bg-slate-300 rounded-full inline-block"></span>
                Retos sin clasificar
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75 hover:opacity-100 transition-opacity">
                {unassigned.map(challenge => (
                  <div 
                    key={challenge.id} 
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all h-full flex flex-col relative group cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('.admin-menu-trigger')) return;
                      navigate(`/retos/${slugify(challenge.title)}`);
                    }}
                  >
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity admin-menu-trigger z-10">
                      <AdminMenu onEdit={() => {
                        openEdit('Reto', challenge, (data) => {
                          Object.assign(challenge, data);
                          triggerUpdate();
                        }, (data) => {
                          const idx = challenges.findIndex(c => c.id === data.id);
                          if (idx > -1) challenges.splice(idx, 1);
                          triggerUpdate();
                        });
                      }} />
                    </div>
                    
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">NO ASIGNADO</span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-600 mb-2 group-hover:text-slate-900 transition-colors pr-6">
                      {challenge.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-3 mt-auto">
                      {challenge.description || "Sin descripción detallada."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

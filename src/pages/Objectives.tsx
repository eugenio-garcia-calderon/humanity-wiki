import { useHelpers } from '../contexts/DataContext';
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { AdminMenu } from '../components/ui/AdminMenu';
import { useEdit } from '../contexts/EditContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/core';
import { slugify } from '../utils/slugify';
import { MapPin, X, ArrowRight, ArrowDown, Droplets, Wheat, Home as HomeIcon, HeartPulse, Users, TreePine, ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';

const typeLabels: Record<string, string> = {
  'planet': 'Mundo',
  'continent': 'Continente',
  'country': 'País',
  'region': 'Región',
  'municipality': 'Municipio',
  'comunidad_vecinos': 'Comunidad de Vecinos',
  'aldea': 'Aldea'
};

const iconMap: Record<string, any> = {
  'AGUA': Droplets,
  'ALIMENTACIÓN': Wheat,
  'VIVIENDA': HomeIcon,
  'SALUD': HeartPulse,
  'CONVIVENCIA': Users,
  'ECOSISTEMAS': TreePine,
};

const territoryTypes = ['country', 'region', 'municipality', 'comunidad_vecinos', 'aldea'];

function AddChallengeSelector({ objId, selectedTerritoryId, onAddExisting, onCreateNew }: { objId: string, selectedTerritoryId: string, onAddExisting: (id: string) => void, onCreateNew: () => void }) {
  const { challenges } = useHelpers();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) {
    return (
      <Button 
        variant="outline" 
        className="w-full mt-2 text-xs border-dashed text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
        onClick={() => setIsOpen(true)}
      >
        + Añadir Reto
      </Button>
    );
  }

  const filteredChallenges = challenges.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !(
      ((c.objectives && c.objectives.includes(objId))) &&
      (c.territory_ids && c.territory_ids.includes(selectedTerritoryId))
    )
  );

  return (
    <div className="mt-2 bg-white border border-slate-200 rounded-xl p-3 shadow-lg relative z-30">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Añadir Reto</span>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:bg-slate-100 p-1 rounded-full"><X className="w-4 h-4" /></button>
      </div>
      <input 
        type="text"
        placeholder="Buscar retos..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg mb-2 focus:outline-none focus:border-red-300"
      />
      <div className="max-h-40 overflow-y-auto space-y-1 mb-2">
        {filteredChallenges.map(c => (
          <button
            key={c.id}
            onClick={() => {
              onAddExisting(c.id);
              setIsOpen(false);
            }}
            className="w-full text-left text-xs p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100 flex justify-between items-center group"
          >
            <span className="line-clamp-1 flex-1 pr-2 text-slate-700 group-hover:text-emerald-600 transition-colors">{c.title}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">Global</span>
          </button>
        ))}
        {filteredChallenges.length === 0 && (
          <div className="text-xs text-slate-400 text-center py-2">No hay resultados</div>
        )}
      </div>
      <Button 
        variant="outline" 
        className="w-full text-xs bg-slate-50 hover:bg-slate-100 border-dashed text-slate-600"
        onClick={() => {
          onCreateNew();
          setIsOpen(false);
        }}
      >
        Crear nuevo reto
      </Button>
    </div>
  );
}

export default function Objectives({ embeddedTerritoryId }: { embeddedTerritoryId?: string }) {
  const { challenges, solutions, territories, objectives, getTerritory, loading } = useHelpers();
  if (loading) return <div>Cargando...</div>;

  const { openEdit, updateCounter, triggerUpdate } = useEdit();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTerritory = embeddedTerritoryId || searchParams.get('territorio') || "T003";
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>(initialTerritory);
  
  React.useEffect(() => {
    if (embeddedTerritoryId) setSelectedTerritoryId(embeddedTerritoryId);
  }, [embeddedTerritoryId]);
  
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [expandedObjIds, setExpandedObjIds] = useState<Set<string>>(new Set());

  const handleTerritoryChange = (id: string) => {
    setSelectedTerritoryId(id);
    if (!embeddedTerritoryId) setSearchParams({ territorio: id });
    setSelectorOpen(false);
  };

  const selectedTerritory = territories.find(t => t.id === selectedTerritoryId);

  return (
    <div key={updateCounter} className={cn("animate-in fade-in duration-500 pb-12", embeddedTerritoryId ? "space-y-4" : "space-y-8")}>
      {!embeddedTerritoryId && (<div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-2">Objetivos Globales</h2>
          <p className="text-base text-slate-500 max-w-2xl leading-relaxed">
            Explora los retos y soluciones asociados a cada objetivo en el territorio seleccionado.
          </p>
        </div>
        {user?.isAdmin && (
          <Button 
            onClick={() => {
              const newObj = {
                id: `O${Math.floor(Math.random() * 1000)}`,
                title: 'Nuevo Objetivo',
                description: '',
                indicator_ids: [],
                challenge_ids: []
              };
              openEdit('Nuevo Objetivo', newObj, (data) => {
                objectives.push(data as any);
                triggerUpdate();
              });
            }}
            className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            + Añadir Objetivo
          </Button>
        )}
      </div>)}

      {/* Territory Selector */}
      <div className={cn("relative transition-all", embeddedTerritoryId ? "py-2 mb-2 flex items-center justify-between" : "bg-slate-50 p-4 sm:p-6 rounded-3xl border border-slate-200")}>
        <div className={cn("flex flex-col justify-between", embeddedTerritoryId ? "gap-2" : "xl:flex-row xl:items-center gap-6")}>
          <div className="flex items-center gap-4">
            <div>
              <h2 className={cn("font-black tracking-tight flex items-center gap-3 text-slate-800", embeddedTerritoryId ? "text-2xl" : "text-2xl sm:text-3xl")}>
                {selectedTerritory?.name}
                <button 
                  onClick={() => setSelectorOpen(!selectorOpen)}
                  className={cn("font-medium rounded-full bg-white hover:bg-slate-100 border border-black/5 shadow-sm transition-all flex items-center gap-1.5 text-slate-700", embeddedTerritoryId ? "text-xs px-2.5 py-1" : "text-sm px-3 py-1.5")}
                >
                  <MapPin className={embeddedTerritoryId ? "w-3 h-3" : "w-4 h-4"} />
                  Elegir otro territorio
                </button>
              </h2>
              {!embeddedTerritoryId && <p className="text-xs font-bold uppercase tracking-widest opacity-60 mt-1 text-slate-500">
                {typeLabels[selectedTerritory?.type || '']}
              </p>}
            </div>
          </div>
        </div>

        {selectorOpen && (
          <div className={cn("absolute z-30 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl flex flex-wrap items-center gap-2", embeddedTerritoryId ? "top-12 left-0 right-0" : "top-24 left-4 right-4")}>
            <div className="w-full flex justify-between items-center mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Seleccionar territorio</span>
              <button onClick={() => setSelectorOpen(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            {territoryTypes.map(type => {
              const typeTerritories = territories.filter(t => t.type === type);
              if (typeTerritories.length === 0) return null;
              
              return (
                <div key={type} className="flex-1 min-w-[100px]">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 px-1">{typeLabels[type]}</label>
                  <select
                    value={typeTerritories.find(t => t.id === selectedTerritoryId) ? selectedTerritoryId : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleTerritoryChange(e.target.value);
                      }
                    }}
                    className={cn(
                      "w-full px-2 py-1.5 border rounded-lg text-xs transition-all focus:outline-none focus:ring-2",
                      typeTerritories.find(t => t.id === selectedTerritoryId) 
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900 font-medium shadow-sm focus:ring-emerald-200" 
                        : "border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <option value="" disabled className="text-slate-400">Seleccionar...</option>
                    {typeTerritories.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Objectives Grid */}
      <div className="grid grid-cols-1 gap-6">
        {objectives.map(obj => {
          // Filter challenges for this objective AND this territory
          const objChallenges = challenges.filter(c => 
            ((c.objectives && c.objectives.includes(obj.id)) || (obj.challenge_ids && obj.challenge_ids.includes(c.id))) &&
            (c.territory_ids && c.territory_ids.includes(selectedTerritoryId))
          );
          
          // Get solutions linked to these challenges
          const objSolutions = objChallenges.flatMap(c => 
            solutions.filter(s => s.challenge_ids && s.challenge_ids.includes(c.id))
          );

          // Remove duplicates
          const uniqueSolutions = Array.from(new Set(objSolutions.map(s => s.id)))
            .map(id => objSolutions.find(s => s.id === id)!);

          const isExpanded = expandedObjIds.has(obj.id);
          const toggleExpanded = () => {
            setExpandedObjIds(prev => {
              const next = new Set(prev);
              if (next.has(obj.id)) next.delete(obj.id);
              else next.add(obj.id);
              return next;
            });
          };

          return (
            <div key={obj.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm relative overflow-visible group transition-all">
                {(() => {
    const Icon = iconMap[obj.title] || TreePine;
    const progress = obj.progress_by_territory?.[selectedTerritoryId] || 0;

    return (
      <div className={cn("flex flex-col items-center", isExpanded ? "mb-6" : "")}>
        <div onClick={toggleExpanded} className="cursor-pointer block w-max mx-auto hover:scale-105 transition-transform group/title relative">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3 bg-slate-50 py-3 pl-6 pr-12 rounded-full border border-slate-100 shadow-sm group-hover/title:border-emerald-200 transition-colors relative">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100 shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-800">{obj.title}</h3>
              <div className="flex flex-col items-end ml-4 pl-4 border-l border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }}></div>
                  </div>
                  <span className="text-xl font-black text-emerald-600 leading-none">{progress}%</span>
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Progreso</span>
              </div>
              
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform mr-8", isExpanded ? "rotate-180" : "")} />
              </div>
            </div>
            {!isExpanded && (
              <div className="flex items-center gap-1.5 mt-3">
                <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-[10px] font-bold border border-red-100">
                  {objChallenges.length} Reto{objChallenges.length !== 1 ? 's' : ''}
                </span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100">
                  {uniqueSolutions.length} Soluci{uniqueSolutions.length !== 1 ? 'ones' : 'ón'}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* We moved the admin menu out of the clickable title so we don't accidentally toggle it when editing */}
        <div className="absolute top-4 right-4 z-20">
          <AdminMenu onEdit={() => {
            let initialData = { ...obj };
            if (selectedTerritoryId && initialData.progress_by_territory) {
              initialData.progress_by_territory = { [selectedTerritoryId]: initialData.progress_by_territory[selectedTerritoryId] || 0 };
            }
            openEdit('Objetivo', initialData, (data) => {
              if (selectedTerritoryId && data.progress_by_territory) {
                data.progress_by_territory = {
                  ...(obj.progress_by_territory || {}),
                  [selectedTerritoryId]: data.progress_by_territory[selectedTerritoryId]
                };
              }
              Object.assign(obj, data);
              triggerUpdate();
            });
          }} />
        </div>

        <p className="text-center text-slate-600 text-sm max-w-2xl mt-4 px-4 leading-relaxed">{obj.description}</p>
        
        {isExpanded && (
           <div className="mt-4 flex items-center justify-center">
             <Link to={`/objetivos/${obj.title.toLowerCase()}`} className="text-xs font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700 underline underline-offset-4 decoration-emerald-200 hover:decoration-emerald-500 transition-colors">
               Ver detalle completo del objetivo
             </Link>
           </div>
        )}
      </div>
    );
  })()}
                {isExpanded && (
                  <div className="flex flex-col md:flex-row gap-6 relative animate-in fade-in slide-in-from-top-4 duration-300">
                {/* Visual Connector for Desktop */}
                <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full border-4 border-slate-50 text-slate-300 items-center justify-center pointer-events-none z-10 shadow-sm">
                  <ArrowRight className="w-8 h-8" />
                </div>

                {/* Visual Connector for Mobile */}
                <div className="md:hidden flex justify-center text-slate-200 pointer-events-none my-[-10px] relative z-10">
                  <ArrowDown className="w-6 h-6" />
                </div>

                {/* Left: Challenges */}
                <div className="flex-1 space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-50 relative z-20">
                  <h4 className="text-xs font-bold tracking-widest uppercase text-red-500 border-b border-red-100 pb-2 mb-3">Retos en {selectedTerritory?.name}</h4>
                  
                  {objChallenges.map(challenge => (
                    <div key={challenge.id} className="relative group/card bg-white p-3 rounded-xl border border-slate-100 hover:border-red-200 shadow-sm">
                      <Link to={`/retos/${slugify(challenge.title)}`} className="block">
                        <h5 className="text-sm font-bold text-slate-900 group-hover/card:text-red-600 line-clamp-1">{challenge.title}</h5>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">{challenge.description}</p>
                      </Link>
                      <div className="absolute top-1 right-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-20">
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
                    </div>
                  ))}

                  {objChallenges.length === 0 && (
                    <div className="text-center p-4 border border-dashed border-slate-200 rounded-xl">
                      <span className="text-xs text-slate-400 italic">No hay retos para este territorio.</span>
                    </div>
                  )}

                  {user?.isAdmin && (
                    <AddChallengeSelector 
                      objId={obj.id} 
                      selectedTerritoryId={selectedTerritoryId}
                      onCreateNew={() => {
                        const newChallenge = {
                          id: `R${Math.floor(Math.random() * 1000)}`,
                          title: 'Nuevo Reto',
                          description: '',
                          priority: 'medium',
                          scope: 'global',
                          objectives: [obj.id],
                          territory_ids: [selectedTerritoryId]
                        };
                        openEdit('Nuevo Reto', newChallenge, (data) => {
                          challenges.push(data as any);
                          triggerUpdate();
                        });
                      }}
                      onAddExisting={(id) => {
                        const challenge = challenges.find(c => c.id === id);
                        if (challenge) {
                          if (!challenge.territory_ids) challenge.territory_ids = [];
                          if (!challenge.territory_ids.includes(selectedTerritoryId)) {
                            challenge.territory_ids.push(selectedTerritoryId);
                          }
                          if (!challenge.objectives) challenge.objectives = [];
                          if (!challenge.objectives.includes(obj.id)) {
                            challenge.objectives.push(obj.id);
                          }
                          triggerUpdate();
                        }
                      }}
                    />
                  )}
                </div>

                {/* Right: Solutions */}
                <div className="flex-1 space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                  <h4 className="text-xs font-bold tracking-widest uppercase text-emerald-500 border-b border-emerald-100 pb-2 mb-3">Soluciones vinculadas</h4>
                  
                  {uniqueSolutions.map(solution => (
                    <div key={solution.id} className="relative group/card bg-white p-3 rounded-xl border border-slate-100 hover:border-emerald-200 shadow-sm">
                      <Link to={`/soluciones/${slugify(solution.title)}`} className="block">
                        <h5 className="text-sm font-bold text-slate-900 group-hover/card:text-emerald-600 line-clamp-1">{solution.title}</h5>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">{solution.description || "Sin descripción"}</p>
                      </Link>
                      <div className="absolute top-1 right-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-20">
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
                    </div>
                  ))}

                  {uniqueSolutions.length === 0 && (
                    <div className="text-center p-4 border border-dashed border-slate-200 rounded-xl">
                      <span className="text-xs text-slate-400 italic">No hay soluciones vinculadas.</span>
                    </div>
                  )}

                  {user?.isAdmin && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-2 text-xs border-dashed text-slate-500 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50"
                      onClick={() => {
                        const newSolution = {
                          id: `S${Math.floor(Math.random() * 1000)}`,
                          title: 'Nueva Solución',
                          description: '',
                          type: 'technical',
                          challenge_ids: objChallenges.length > 0 ? [objChallenges[0].id] : []
                        };
                        openEdit('Nueva Solución', newSolution, (data) => {
                          solutions.push(data as any);
                          triggerUpdate();
                        });
                      }}
                    >
                      + Añadir Solución
                    </Button>
                  )}
                </div>
              </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

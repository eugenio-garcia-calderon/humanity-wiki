import { useHelpers } from '../contexts/DataContext';
import React from 'react';
import { useParams, Link } from 'react-router-dom';

import { Card, Button } from '../components/ui/core';
import { AdminMenu } from '../components/ui/AdminMenu';
import { useEdit } from '../contexts/EditContext';
import { slugify } from '../utils/slugify';
import { TEXTURA_CUBOS } from '../utils/texturaCubos';

export default function ChallengeProfile() {
  const { getChallengeCauses, getChallengeSolutions, getChallengeProjects, territories, challenges, loading } = useHelpers();
  const { id } = useParams();
  const { openEdit, updateCounter, triggerUpdate } = useEdit();
  if(loading) return <div>Cargando...</div>;
  
  const decodedId = decodeURIComponent(id || '');
  
  const challenge = challenges.find(c => 
    c.id.toLowerCase() === decodedId.toLowerCase() || 
    slugify(c.title) === decodedId.toLowerCase() ||
    c.title.toLowerCase() === decodedId.toLowerCase()
  );

  if (!challenge) return <div className="p-8 text-center text-slate-500">Reto no encontrado</div>;

  const solutions = getChallengeSolutions(challenge.id);
  const projects = getChallengeProjects(challenge.id);
  
  const activeTerritories = territories
    .filter(t => t.type === 'municipality' || t.type === 'region')
    .slice(0, 5 + (challenge.title.length % 4))
    .map(t => {
      const relevanceScore = ((t.id.charCodeAt(t.id.length-1) + challenge.title.charCodeAt(0)) % 100);
      let level = "Media";
      let colorClass = "bg-yellow-100 text-yellow-700";
      if (relevanceScore > 75) {
        level = "Alta";
        colorClass = "bg-red-100 text-red-700";
      } else if (relevanceScore < 30) {
        level = "Baja";
        colorClass = "bg-emerald-100 text-emerald-700";
      }
      return { ...t, relevance: level, colorClass, score: relevanceScore };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <div key={updateCounter} className="space-y-8 animate-in fade-in duration-300 pb-12">
      
      {/* Hero Section for Challenge */}
      <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-3xl p-8 md:p-12 text-white shadow-lg relative overflow-hidden">
        {/* La textura se dibuja en el propio código, no se le pide a
            transparenttextures.com: un fondo decorativo no justifica
            mandarle la IP de cada visitante a un servidor ajeno — y las
            tiendas obligan a declarar con quién se comparten datos. */}
        <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={TEXTURA_CUBOS}></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md p-4 shrink-0 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
            <span className="text-5xl md:text-6xl">🔥</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold text-red-100 uppercase tracking-widest bg-black/20 px-4 py-2 rounded-full inline-block">
                Página de Reto
              </span>
              <AdminMenu 
                onEdit={() => openEdit('Reto', challenge, (data) => {
                  Object.assign(challenge, data);
                  triggerUpdate();
                }, (data) => {
                  const idx = challenges.findIndex(c => c.id === data.id);
                  if (idx > -1) challenges.splice(idx, 1);
                  triggerUpdate();
                })} 
              />
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 drop-shadow-sm">{challenge.title}</h1>
            <p className="text-base md:text-lg text-red-50 max-w-3xl leading-relaxed">{challenge.description || 'Descripción detallada no disponible.'}</p>
          </div>
          <div className="flex flex-col gap-3 shrink-0 mt-4 md:mt-0 w-full md:w-auto">
            <Button className="w-full bg-white text-red-600 hover:bg-red-50">Unirme al reto</Button>
            <Button className="w-full bg-red-700/50 text-white hover:bg-red-700/70 border-0" variant="outline">Compartir</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Center Column: Relevance & Territories */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
             <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold tracking-widest text-slate-900 uppercase">Territorios y Relevancia</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeTerritories.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t.type === 'municipality' ? 'Municipio' : 'Región'}</span>
                    <span className="text-sm font-bold text-slate-900">{t.name}</span>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${t.colorClass}`}>
                    {t.relevance}
                  </div>
                </div>
              ))}
            </div>
          </section>
          
          {/* Projects Section */}
          {projects.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold tracking-widest text-slate-900 uppercase">Proyectos en ejecución</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {projects.map(project => (
                  <Card key={project.id} className="flex flex-col h-full hover:border-red-300 transition-all cursor-pointer group">
                    <div className="p-4 flex-1 flex flex-col relative">
                      <div className="absolute top-2 right-2">
                        <AdminMenu onEdit={() => openEdit('Proyecto', project, (data) => Object.assign(project, data))} />
                      </div>
                      <h4 className="text-sm font-bold mb-2 pr-6 group-hover:text-red-600">{project.name}</h4>
                      <p className="text-[10px] text-slate-500 mb-4 flex-1 line-clamp-2">{project.description}</p>
                      <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-full">{project.status}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Solutions & Causes */}
        <div className="space-y-6">
          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-sm font-bold tracking-widest text-red-600 uppercase">Soluciones ({solutions.length})</h3>
            </div>
            <div className="space-y-3">
              {solutions.map(sol => (
                <Link key={sol.id} to={`/soluciones/${slugify(sol.title)}`} className="block group">
                  <div className="bg-white p-4 border border-slate-200 rounded-xl hover:border-red-500 transition-all shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Solución</span>
                    <h5 className="font-bold text-slate-900 text-sm group-hover:text-red-600 leading-tight">{sol.title}</h5>
                  </div>
                </Link>
              ))}
              {solutions.length === 0 && (
                <div className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-300 rounded-xl">No hay soluciones propuestas aún.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useHelpers } from '../contexts/DataContext';
import React from 'react';
import { useParams, Link } from 'react-router-dom';

import { Card, Button } from '../components/ui/core';
import { AdminMenu } from '../components/ui/AdminMenu';
import { useEdit } from '../contexts/EditContext';
import { slugify } from '../utils/slugify';

export default function ProjectProfile() {
  const { projects, objectives, organizations, solutions, territories, loading } = useHelpers();
  if(loading) return <div>Cargando...</div>;

  const { id } = useParams();
  const { openEdit, updateCounter, triggerUpdate } = useEdit();
  
  const decodedId = decodeURIComponent(id || '');
  
  const project = projects.find(c => 
    c.id.toLowerCase() === decodedId.toLowerCase() || 
    slugify(c.name) === decodedId.toLowerCase() ||
    c.name.toLowerCase() === decodedId.toLowerCase()
  );

  if (!project) return <div className="p-8 text-center text-slate-500">Proyecto no encontrado</div>;

  const projectObjectives = objectives.filter(o => project.objective_ids?.includes(o.id));
  const projectOrgs = organizations.filter(o => project.organization_ids?.includes(o.id));

  return (
    <div key={updateCounter} className="space-y-8 animate-in fade-in duration-500 pb-12 relative group">
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <AdminMenu onEdit={() => {
          openEdit('Proyecto', project, (data) => {
            Object.assign(project, data);
            triggerUpdate();
          });
        }} />
      </div>

      <div className="bg-emerald-900 -mx-4 sm:-mx-8 -mt-8 px-4 sm:px-8 py-12 md:py-16 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="relative z-10">
          <div className="flex gap-2 mb-6">
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-widest uppercase backdrop-blur-sm">PROYECTO</span>
            {project.type && <span className="px-3 py-1 bg-emerald-500/40 rounded-full text-xs font-bold tracking-widest uppercase backdrop-blur-sm border border-emerald-400/30">{project.type}</span>}
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 drop-shadow-sm">{project.name}</h1>
          <p className="text-base md:text-lg text-emerald-50 max-w-3xl leading-relaxed">{project.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 border-b border-slate-100 pb-2">Organizaciones Participantes</h2>
            <div className="grid grid-cols-1 gap-4">
              {projectOrgs.length > 0 ? projectOrgs.map(org => (
                <Link to={`/organizaciones/${slugify(org.name)}`} key={org.id} className="block p-4 border border-slate-200 rounded-xl hover:border-emerald-500 transition-colors">
                  <h3 className="font-bold text-slate-900">{org.name}</h3>
                  <p className="text-sm text-slate-500 capitalize">{org.type}</p>
                </Link>
              )) : <p className="text-sm text-slate-500 italic">No hay organizaciones vinculadas.</p>}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold tracking-widest text-slate-900 uppercase mb-4">Objetivos Relacionados</h3>
            <div className="space-y-2">
              {projectObjectives.map(obj => (
                <Link key={obj.id} to={`/objetivos/${obj.title.toLowerCase()}`} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group/obj">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs shrink-0 group-hover/obj:bg-emerald-500 group-hover/obj:text-white transition-colors">
                    {obj.id}
                  </div>
                  <span className="font-bold text-sm text-slate-700 group-hover/obj:text-emerald-700 transition-colors uppercase tracking-tight">{obj.title}</span>
                </Link>
              ))}
              {projectObjectives.length === 0 && <p className="text-xs text-slate-500">Ningún objetivo vinculado.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

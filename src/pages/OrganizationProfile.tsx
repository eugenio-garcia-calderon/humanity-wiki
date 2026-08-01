import { useHelpers } from '../contexts/DataContext';
import React from 'react';
import { useParams, Link } from 'react-router-dom';

import { Card, Button } from '../components/ui/core';
import { AdminMenu } from '../components/ui/AdminMenu';
import { useEdit } from '../contexts/EditContext';
import { slugify } from '../utils/slugify';

export default function OrganizationProfile() {
  const { organizations, objectives, projects, territories, loading } = useHelpers();
  if(loading) return <div>Cargando...</div>;

  const { id } = useParams();
  const { openEdit, updateCounter, triggerUpdate } = useEdit();
  
  const decodedId = decodeURIComponent(id || '');
  
  const organization = organizations.find(c => 
    c.id.toLowerCase() === decodedId.toLowerCase() || 
    slugify(c.name) === decodedId.toLowerCase() ||
    c.name.toLowerCase() === decodedId.toLowerCase()
  );

  if (!organization) return <div className="p-8 text-center text-slate-500">Organización no encontrada</div>;

  const orgProjects = projects.filter(p => p.organization_ids?.includes(organization.id));
  const orgObjectives = objectives.filter(o => organization.objective_ids?.includes(o.id));

  return (
    <div key={updateCounter} className="space-y-8 animate-in fade-in duration-500 pb-12 relative group">
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <AdminMenu onEdit={() => {
          openEdit('Organización', organization, (data) => {
            Object.assign(organization, data);
            triggerUpdate();
          });
        }} />
      </div>

      <div className="bg-slate-900 -mx-4 sm:-mx-8 -mt-8 px-4 sm:px-8 py-12 md:py-16 text-white overflow-hidden relative">
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
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-widest uppercase backdrop-blur-sm">ORGANIZACIÓN</span>
            {organization.type && <span className="px-3 py-1 bg-blue-500/40 rounded-full text-xs font-bold tracking-widest uppercase backdrop-blur-sm border border-blue-400/30">{organization.type}</span>}
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 drop-shadow-sm">{organization.name}</h1>
          <p className="text-base md:text-lg text-slate-300 max-w-3xl leading-relaxed">Escala: <span className="capitalize">{organization.scale}</span> | Áreas: {organization.focus_areas?.join(', ')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 border-b border-slate-100 pb-2">Proyectos Relacionados</h2>
            <div className="grid grid-cols-1 gap-4">
              {orgProjects.length > 0 ? orgProjects.map(proj => (
                <Link to={`/proyectos/${slugify(proj.name)}`} key={proj.id} className="block p-4 border border-slate-200 rounded-xl hover:border-blue-500 transition-colors">
                  <h3 className="font-bold text-slate-900">{proj.name}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2">{proj.description}</p>
                </Link>
              )) : <p className="text-sm text-slate-500 italic">No hay proyectos vinculadas.</p>}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold tracking-widest text-slate-900 uppercase mb-4">Objetivos Relacionados</h3>
            <div className="space-y-2">
              {orgObjectives.map(obj => (
                <Link key={obj.id} to={`/objetivos/${obj.title.toLowerCase()}`} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group/obj">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs shrink-0 group-hover/obj:bg-blue-500 group-hover/obj:text-white transition-colors">
                    {obj.id}
                  </div>
                  <span className="font-bold text-sm text-slate-700 group-hover/obj:text-blue-700 transition-colors uppercase tracking-tight">{obj.title}</span>
                </Link>
              ))}
              {orgObjectives.length === 0 && <p className="text-xs text-slate-500">Ningún objetivo vinculado.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

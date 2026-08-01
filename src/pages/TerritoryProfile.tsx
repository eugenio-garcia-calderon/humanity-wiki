import { useHelpers } from '../contexts/DataContext';
import { useParams, Link, useNavigate } from 'react-router-dom';

import { Card, Badge, Button } from '../components/ui/core';
import { AdminMenu } from '../components/ui/AdminMenu';
import { useEdit } from '../contexts/EditContext';
import { cn } from '../utils/cn';
import { slugify } from '../utils/slugify';

export default function TerritoryProfile() {
  const { getTerritory, getTerritoryChallenges, territories, challenges, projects, organizations, loading } = useHelpers();
  if(loading) return <div>Cargando...</div>;

  const { id } = useParams();
  const navigate = useNavigate();
  const territory = getTerritory(id || 'T004');
  const { openEdit, updateCounter, triggerUpdate } = useEdit();

  if (!territory) return <div>Territorio no encontrado</div>;

  const activeChallenges = getTerritoryChallenges(territory.id);
  const territoryProjects = projects.filter(p => p.territory_id === territory.id);
  const territoryOrganizations = organizations.filter(a => a.territory_id === territory.id);

  const getBreadcrumbs = (tid: string) => {
    const crumbs = [];
    let current = getTerritory(tid);
    while (current) {
      crumbs.unshift(current);
      current = current.parent_id ? getTerritory(current.parent_id) : undefined;
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs(territory.id);

  return (
    <div key={updateCounter} className="space-y-8 animate-in fade-in duration-300 relative group pb-12">
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <AdminMenu onEdit={() => openEdit('Territorio', territory, (data) => {
          Object.assign(territory, data);
          triggerUpdate();
        })} />
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {breadcrumbs.map((b, i) => (
              <span key={b.id} className="flex items-center gap-2">
                {i > 0 && <span className="text-slate-300">/</span>}
                <Link to={`/territorios/${b.id}`} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-emerald-500 transition-colors">{b.name}</Link>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono text-emerald-500 mb-1">[ ESCALA: {territory.type.toUpperCase()} ]</p>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">{territory.name}</h1>
          <p className="text-slate-500 max-w-2xl mt-4 leading-relaxed">{territory.description || 'Descripción detallada no disponible.'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-slate-300 rounded-full inline-block"></span>
              Retos Activos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeChallenges.length > 0 ? activeChallenges.map(challenge => (
                <Card 
                  key={challenge.id} 
                  className="p-5 flex flex-col justify-between group hover:border-emerald-300 transition-all cursor-pointer relative"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('.admin-menu-trigger')) return;
                    navigate(`/retos/${slugify(challenge.title)}`);
                  }}
                >
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity admin-menu-trigger">
                    <AdminMenu onEdit={() => openEdit('Reto', challenge, (data) => Object.assign(challenge, data))} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm leading-tight group-hover:text-emerald-600 mb-2">{challenge.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{challenge.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <Badge variant={challenge.priority === 'critical' ? 'danger' : 'warning'}>{challenge.priority}</Badge>
                  </div>
                </Card>
              )) : (
                <div className="col-span-full p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Ningún reto activo registrado
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-300 rounded-full inline-block"></span>
              Proyectos Registrados
            </h2>
            <div className="space-y-4">
              {territoryProjects.length > 0 ? territoryProjects.map(project => (
                <Link to={`/proyectos/${slugify(project.name)}`} key={project.id} className="block">
                  <Card className="p-5 flex flex-col sm:flex-row gap-4 justify-between sm:items-start group hover:border-emerald-300 transition-all cursor-pointer relative">
                    <div className="pr-8 sm:pr-0">
                      <h4 className="text-lg font-medium leading-tight group-hover:text-emerald-600">{project.name}</h4>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{project.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="info">{project.type}</Badge>
                    </div>
                  </Card>
                </Link>
              )) : (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Ningún proyecto registrado
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6 flex flex-col h-full">
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
             <h3 className="text-sm font-bold tracking-widest text-slate-900 uppercase mb-4">Organizaciones Locales</h3>
             <div className="space-y-3">
               {territoryOrganizations.length > 0 ? territoryOrganizations.map(organization => (
                 <Link to={`/organizaciones/${slugify(organization.name)}`} key={organization.id} className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-lg transition-colors">
                   <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0 uppercase">
                     {organization.name.charAt(0)}
                   </div>
                   <div className="flex-1">
                     <p className="text-xs font-bold text-slate-900 leading-tight">{organization.name}</p>
                     <p className="text-[10px] text-slate-400 uppercase tracking-tighter mt-1">{organization.type}</p>
                   </div>
                 </Link>
               )) : (
                 <div className="text-sm text-slate-400 italic">Sin organizaciones registradas</div>
               )}
             </div>
          </section>
          
          <section className="mt-auto">
            <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-[10px] text-emerald-800 font-bold uppercase mb-1 italic">Colaboración</p>
              <h4 className="font-medium text-emerald-900 text-sm mb-2">¿Quieres participar en {territory.name}?</h4>
              <p className="text-xs text-emerald-700 leading-relaxed mb-4">
                Conecta con el ecosistema local, participa en proyectos y ayuda a resolver sus retos.
              </p>
              <Button className="w-full">Unirme a la comunidad</Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

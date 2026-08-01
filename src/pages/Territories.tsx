import { useHelpers } from '../contexts/DataContext';
import { useState } from 'react';

import { Card, Button } from '../components/ui/core';
import { AdminMenu } from '../components/ui/AdminMenu';
import { useEdit } from '../contexts/EditContext';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const typeLabels: Record<string, string> = {
  planet: 'Mundo',
  continent: 'Continente',
  country: 'País',
  region: 'Región',
  municipality: 'Municipio',
  community: 'Comunidad'
};

export default function Territories() {
  const { territories, loading } = useHelpers();
  if(loading) return <div>Cargando...</div>;

  const { openEdit, triggerUpdate, updateCounter } = useEdit();
  const { user } = useAuth();
  const [filter, setFilter] = useState('');

  const filteredTerritories = territories.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()));

  const handleAddTerritory = () => {
    const newTerritory = {
      id: `T${Math.floor(Math.random() * 1000)}`,
      type: 'region',
      name: 'Nuevo Territorio',
      parent_id: null,
      description: '',
      key_indicators: [],
      active_challenges: [],
      featured_objectives: []
    };
    openEdit('Nuevo Territorio', newTerritory, (data) => {
      territories.push(data);
    });
  };

  return (
    <div key={updateCounter} className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-xs font-mono text-emerald-500 mb-1">[ MÓDULO: ESPACIAL ]</p>
          <h2 className="text-4xl sm:text-5xl font-light tracking-tighter italic">Territorios</h2>
          <p className="text-sm text-slate-500 mt-2">Explora las diferentes escalas territoriales y su evolución.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="Buscar territories..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-64 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:bg-white transition-all"
          />
          {user?.isAdmin && (
            <Button onClick={handleAddTerritory} className="shrink-0">
              + Nuevo Territorio
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTerritories.map((territory) => (
          <Link key={territory.id} to={`/territorios/${territory.id}`}>
            <Card className="p-6 h-full flex flex-col relative group hover:border-emerald-300 transition-all">
              <div className="absolute top-4 right-4">
                <AdminMenu onEdit={() => openEdit('Territorio', territory, (data) => {
                  Object.assign(territory, data);
                  triggerUpdate();
                }, (data) => {
                  const idx = territories.findIndex(t => t.id === data.id);
                  if (idx !== -1) territories.splice(idx, 1);
                  triggerUpdate();
                })} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 pr-6">
                {typeLabels[territory.type] || territory.type}
              </p>
              <h4 className="text-xl font-medium leading-tight mb-2 group-hover:text-emerald-600">{territory.name}</h4>
              <p className="text-sm text-slate-500 line-clamp-3 mb-6 flex-1">
                {territory.description}
              </p>
              <div className="mt-auto pt-4 border-t border-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-900 group-hover:text-emerald-600">
                Ver perfil territorial →
              </div>
            </Card>
          </Link>
        ))}
      </div>
      {filteredTerritories.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No se encontraron territories.
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { Button } from './core';
import { useHelpers } from '../../contexts/DataContext';




function getEntityName(id: string, list: any[]) {
  if (!id) return '';
  const item = list.find(i => i.id === id);
  return item ? (item.title || item.name) : id;
}

function RelationEditor({ relationKey, ids = [], onChange }: { relationKey: string, ids: string[], onChange: (ids: string[]) => void }) {
  const { territories, challenges, solutions, causes, projects, organizations, objectives } = useHelpers();
  const allTerritories = territories;
  const allItems = [...territories, ...challenges, ...solutions, ...causes, ...projects, ...organizations, ...objectives];
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  
  let availableItems: any[] = [];
  if (relationKey === 'objective_ids') availableItems = objectives;
  if (relationKey === 'challenge_ids') availableItems = challenges;
  if (relationKey === 'solution_ids') availableItems = solutions;
  if (relationKey === 'territory_ids') availableItems = allTerritories;
  if (relationKey === 'indicator_ids') return null; // Simplified for this demo
  
  const handleAdd = () => {
    if (selectedId && !ids.includes(selectedId)) {
      onChange([...ids, selectedId]);
    }
    setAdding(false);
    setSelectedId('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {ids.map(id => (
          <div key={id} className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-200">
            <span>{getEntityName(id, allItems)}</span>
            <button 
              type="button" 
              onClick={() => onChange(ids.filter(i => i !== id))}
              className="p-0.5 hover:bg-emerald-200 rounded-full transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {ids.length === 0 && <span className="text-xs text-slate-400 italic">Ninguno vinculado</span>}
      </div>
      
      {adding ? (
        <div className="flex gap-2 items-center mt-2">
          <select 
            value={selectedId} 
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-300"
          >
            <option value="">Seleccionar...</option>
            {availableItems.map(item => (
              <option key={item.id} value={item.id}>{(item as any).title || (item as any).name}</option>
            ))}
          </select>
          <Button type="button"  onClick={handleAdd}>Añadir</Button>
          <Button type="button" variant="outline"  onClick={() => setAdding(false)}>Cancelar</Button>
        </div>
      ) : (
        <button 
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-emerald-600 font-bold uppercase tracking-widest mt-2 hover:text-emerald-700"
        >
          <Plus className="w-3 h-3" /> Vincular existente
        </button>
      )}
    </div>
  );
}

export function EditModal({ title, initialData, onSave, onClose, onDelete }: any) {
  const { territories: allTerritories, challenges, solutions, causes, projects, organizations, objectives } = useHelpers();
  const [formData, setFormData] = useState(initialData);
  const [saved, setSaved] = useState(false);

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSaved(true);
  };

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => {
        onClose();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [saved, onClose]);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    if (onDelete) {
      if (confirmDelete) {
        onDelete(formData);
        onClose();
      } else {
        setConfirmDelete(true);
      }
    }
  };

  const renderField = (key: string, value: any) => {

    if (key === 'territory_id') {
      return (
        <div key={key} className="mb-4">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{key}</label>
          <select 
            value={value || ''} 
            onChange={(e) => handleChange(key, e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:bg-white transition-all"
          >
            <option value="">Seleccionar territorio...</option>
            {allTerritories.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      );
    }

    if (key === 'id' || key === 'parent_id' || key === 'author_id') {
      return (
        <div key={key} className="mb-4">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{key}</label>
          <input 
            type="text" 
            value={value || ''} 
            disabled
            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 cursor-not-allowed"
          />
        </div>
      );
    }
    
    if (key === 'type' && (title.toLowerCase().includes('territorio'))) {
      const typeOptions = [
        { value: 'planet', label: 'Mundo' },
        { value: 'continent', label: 'Continente' },
        { value: 'country', label: 'País' },
        
        { value: 'region', label: 'Región' },
        { value: 'municipality', label: 'Municipio' },
        { value: 'comunidad_vecinos', label: 'Comunidad de Vecinos' },
        { value: 'aldea', label: 'Aldea' },
      ];
      return (
        <div key={key} className="mb-4">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tipo de territorio</label>
          <select 
            value={value} 
            onChange={(e) => handleChange(key, e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:bg-white transition-all"
          >
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    }

    if (Array.isArray(value)) {
      if (typeof value[0] === 'string' || value.length === 0) {
        return (
          <div key={key} className="mb-4">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{key}</label>
            <RelationEditor relationKey={key} ids={value} onChange={(newIds) => handleChange(key, newIds)} />
          </div>
        );
      }
    }
    
    if (typeof value === 'number') {
      return (
        <div key={key} className="mb-4">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{key}</label>
          <input 
            type="number" 
            value={value} 
            onChange={(e) => handleChange(key, Number(e.target.value))}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:bg-white transition-all"
          />
        </div>
      );
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return (
        <div key={key} className="mb-4">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{key}</label>
          <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
            {Object.entries(value).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="text-xs font-medium w-40 truncate" title={getEntityName(k, allTerritories) || k}>
                  {getEntityName(k, allTerritories) || k}
                </span>
                <input 
                  type="number" 
                  value={v as string | number} 
                  onChange={(e) => handleChange(key, { ...value, [k]: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-300 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (typeof value === 'string' && (key === 'description' || key === 'summary' || value.length > 50)) {
      return (
        <div key={key} className="mb-4">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{key}</label>
          <textarea 
            value={value} 
            onChange={(e) => handleChange(key, e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:bg-white transition-all min-h-[100px]"
          />
        </div>
      );
    }

    return (
      <div key={key} className="mb-4">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{key}</label>
        <input 
          type="text" 
          value={value || ''} 
          onChange={(e) => handleChange(key, e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:bg-white transition-all"
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col relative overflow-hidden">
        {saved && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <Check className="w-12 h-12" />
            </div>
            
          </div>
        )}
        
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Editor</p>
            <h2 className="text-xl font-medium text-slate-900">Editar {title}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <form id="edit-form" onSubmit={handleSubmit}>
            {Object.entries(formData).map(([key, value]) => renderField(key, value))}
          </form>
        </div>
        
        <div className="p-6 border-t border-slate-100 flex justify-between gap-3 bg-slate-50 rounded-b-2xl">
          {onDelete ? (
            <Button variant="outline" type="button" onClick={handleDelete} className={confirmDelete ? "bg-red-600 text-white hover:bg-red-700" : "text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"}>{confirmDelete ? "¿Confirmar?" : "Eliminar"}</Button>
          ) : (
            <div></div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} type="button">Cancelar</Button>
            <Button form="edit-form" type="submit">Guardar Cambios</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

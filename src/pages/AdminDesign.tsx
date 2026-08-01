import { useHelpers } from '../contexts/DataContext';
import React, { useRef } from 'react';
import { useDesign } from '../contexts/DesignContext';

import { Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '../utils/cn';

export default function AdminDesign() {
  const { objectives, loading } = useHelpers();
  if(loading) return <div>Cargando...</div>;

  const { objectiveImages, setObjectiveImage, logoImage, setLogoImage } = useDesign();

  const handleFileUpload = (title: string, file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        setObjectiveImage(title, base64);
        window.dispatchEvent(new Event('storage'));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        setLogoImage(base64);
        window.dispatchEvent(new Event('storage'));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Diseño</h1>
        <p className="text-sm text-slate-500">Gestiona las ilustraciones y el aspecto visual de la plataforma.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-emerald-500" />
          Logo de la plataforma
        </h2>
        
        <div className="border border-slate-200 rounded-2xl p-4 flex flex-col gap-4 max-w-sm">
          <div className="flex flex-col gap-1">
            <h3 className="font-bold text-sm text-slate-900">Logotipo</h3>
          </div>
          
          <div className="flex-1 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 relative overflow-hidden group min-h-[160px]">
            {logoImage ? (
              <>
                <img src={logoImage} alt="Logo" className="max-w-full max-h-full object-contain mix-blend-multiply opacity-80" />
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2">
                     <Upload className="w-4 h-4" /> Cambiar
                   </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-emerald-500 transition-colors">
                <Upload className="w-8 h-8" />
                <span className="text-xs font-medium">Subir logo</span>
              </div>
            )}
            
            <input 
              type="file" 
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleLogoUpload(e.target.files[0]);
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-emerald-500" />
          Ilustraciones de Objetivos
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {objectives.map(obj => {
            const currentImg = objectiveImages[obj.title];
            
            return (
              <div key={obj.id} className="border border-slate-200 rounded-2xl p-4 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{obj.id}</span>
                  <h3 className="font-bold text-sm text-slate-900">{obj.title}</h3>
                </div>
                
                <div className="flex-1 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 relative overflow-hidden group min-h-[160px]">
                  {currentImg ? (
                    <>
                      <img src={currentImg} alt={obj.title} className="max-w-full max-h-full object-contain mix-blend-multiply opacity-80" />
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2">
                           <Upload className="w-4 h-4" /> Cambiar
                         </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-emerald-500 transition-colors">
                      <Upload className="w-8 h-8" />
                      <span className="text-xs font-medium">Subir ilustración</span>
                    </div>
                  )}
                  
                  <input 
                    type="file" 
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(obj.title, e.target.files[0]);
                      }
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

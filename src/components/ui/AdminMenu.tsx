import { useState, useRef } from 'react';
import { MoreVertical, Edit2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';
import { useCerrarAlPulsarFuera } from '../../hooks/useCerrarAlPulsarFuera';

export function AdminMenu({ onEdit, className }: { onEdit?: () => void, className?: string }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useCerrarAlPulsarFuera(menuRef, isOpen, () => setIsOpen(false));

  if (!user?.isAdmin) return null;

  return (
    <div className={cn("relative z-20", className)} ref={menuRef} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      <button 
        onClick={(e) => { 
          e.preventDefault(); 
          e.stopPropagation(); 
          setIsOpen(!isOpen); 
        }}
        className="p-1.5 text-slate-300 hover:text-emerald-500 hover:bg-slate-50 rounded-full transition-colors flex items-center justify-center"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-100 rounded-lg shadow-lg overflow-hidden py-1">
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
              if (onEdit) {
                onEdit();
              }
            }}
            className="w-full text-left px-4 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2 uppercase tracking-widest"
          >
            <Edit2 className="w-3 h-3" />
            Editar
          </button>
        </div>
      )}
    </div>
  );
}

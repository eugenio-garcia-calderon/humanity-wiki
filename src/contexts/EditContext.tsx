import React, { createContext, useContext, useState } from 'react';
import { EditModal } from '../components/ui/EditModal';
import { useData } from './DataContext';

interface EditModalState {
  isOpen: boolean;
  title: string;
  data: any;
  onSave: (newData: any) => void;
  onDelete?: (data: any) => void;
}

interface EditContextType {
  openEdit: (title: string, data: any, onSave: (newData: any) => void, onDelete?: (data: any) => void) => void;
  closeEdit: () => void;
  updateCounter: number;
  triggerUpdate: () => void;
}

const EditContext = createContext<EditContextType | null>(null);

function getEntityTypeFromTitle(title: string, data: any): string {
  const t = (title || '').toLowerCase();
  if (t.includes('territorio')) return 'territories';
  if (t.includes('objetivo')) return 'objectives';
  if (t.includes('indicador')) return 'indicators';
  if (t.includes('marcador')) return 'markers';
  if (t.includes('métrica') || t.includes('metrica')) return 'metrics';
  if (t.includes('reto')) return 'challenges';
  if (t.includes('solución') || t.includes('solucion')) return 'solutions';
  if (t.includes('causa')) return 'causes';
  if (t.includes('proyecto')) return 'projects';
  if (t.includes('organización') || t.includes('organizacion')) return 'organizations';
  return 'territories';
}

export const EditProvider = ({ children }: { children: React.ReactNode }) => {
  const { saveEntity, deleteEntity, refetchData } = useData();
  const [modalState, setModalState] = useState<EditModalState>({
    isOpen: false,
    title: '',
    data: null,
    onSave: () => {}
  });
  
  const [updateCounter, setUpdateCounter] = useState(0);

  const openEdit = (title: string, data: any, onSave: (newData: any) => void, onDelete?: (data: any) => void) => {
    const entityType = getEntityTypeFromTitle(title, data);
    setModalState({ 
      isOpen: true, 
      title, 
      data, 
      onSave: async (newData) => {
        onSave(newData);
        try {
          await saveEntity(entityType, newData);
        } catch (e) {
          console.error("Error saving entity via REST:", e);
        }
        triggerUpdate();
      }, 
      onDelete: onDelete ? async (delData) => {
        onDelete(delData);
        try {
          if (delData && delData.id) {
            await deleteEntity(entityType, delData.id);
          }
        } catch (e) {
          console.error("Error deleting entity via REST:", e);
        }
        triggerUpdate();
      } : undefined 
    });
  };

  const closeEdit = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const triggerUpdate = () => {
    setUpdateCounter(c => c + 1);
    refetchData();
  };

  return (
    <EditContext.Provider value={{ openEdit, closeEdit, updateCounter, triggerUpdate }}>
      {children}
      {modalState.isOpen && (
        <EditModal 
          title={modalState.title} 
          initialData={modalState.data} 
          onSave={modalState.onSave} 
          onClose={closeEdit}
          onDelete={modalState.onDelete}
        />
      )}
    </EditContext.Provider>
  );
};

export const useEdit = () => {
  const ctx = useContext(EditContext);
  if (!ctx) throw new Error('useEdit must be used within EditProvider');
  return ctx;
};

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

type DataContextType = {
  territories: any[];
  objectives: any[];
  challenges: any[];
  solutions: any[];
  projects: any[];
  organizations: any[];
  causes: any[];
  indicators: any[];
  loading: boolean;
  refetchData: () => Promise<void>;
  /** Pide los catálogos si nadie los ha pedido todavía. La llama `useData()`
   *  por su cuenta: ningún componente tiene que acordarse. */
  asegurar: () => void;
  saveEntity: (entity: string, data: any) => Promise<void>;
  deleteEntity: (entity: string, id: string) => Promise<void>;
};

const DataContext = createContext<DataContextType>({
  territories: [],
  objectives: [],
  challenges: [],
  solutions: [],
  projects: [],
  organizations: [],
  causes: [],
  indicators: [],
  loading: true,
  refetchData: async () => {},
  asegurar: () => {},
  saveEntity: async () => {},
  deleteEntity: async () => {}
});

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [data, setData] = useState<Omit<DataContextType, 'loading' | 'refetchData' | 'saveEntity' | 'deleteEntity' | 'asegurar'>>({
    territories: [],
    objectives: [],
    challenges: [],
    solutions: [],
    projects: [],
    organizations: [],
    causes: [],
    indicators: []
  });
  const [loading, setLoading] = useState(true);

  const refetchData = async () => {
    try {
      const [territories, objectives, challenges, solutions, projects, organizations, causes, indicators] = await Promise.all([
        fetch('/api/data/territories').then(r => r.json()),
        fetch('/api/data/objectives').then(r => r.json()),
        fetch('/api/data/challenges').then(r => r.json()),
        fetch('/api/data/solutions').then(r => r.json()),
        fetch('/api/data/projects').then(r => r.json()),
        fetch('/api/data/organizations').then(r => r.json()),
        fetch('/api/data/causes').then(r => r.json()),
        fetch('/api/data/indicators').then(r => r.json())
      ]);
      setData({ territories, objectives, challenges, solutions, projects, organizations, causes, indicators });
    } catch (e) {
      console.error(e);
    }
  };

  const saveEntity = async (entity: string, entityData: any) => {
    const method = entityData.id ? 'PUT' : 'POST';
    const url = entityData.id ? `/api/data/${entity}/${entityData.id}` : `/api/data/${entity}`;
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entityData)
    });
    await refetchData();
  };

  const deleteEntity = async (entity: string, id: string) => {
    await fetch(`/api/data/${entity}/${id}`, { method: 'DELETE' });
    await refetchData();
  };

  // ══ LOS OCHO CATÁLOGOS, SOLO CUANDO ALGUIEN LOS PIDE (2026-08-22) ═══════
  // Esto era un `useEffect` de arranque: al entrar en humanity.wiki, **por
  // cualquier puerta**, salían ocho peticiones a la vez. Medido en producción,
  // en frío: entre 311 y 537 ms cada una.
  //
  // Y la portada —`Explorar`, que es por donde entra casi todo el mundo— **no
  // usa ni una de las ocho**: comprobado, no llama a `useData` ni a
  // `useHelpers`. Los territorios, los objetivos y los indicadores hacen falta
  // en el mapa y en objetivos, no en el muro de publicaciones.
  //
  // Ahora los pide el primero que los necesita. Quien no abra esas pantallas no
  // los descarga nunca, y quien las abra los tiene igual que antes: `loading`
  // se comporta exactamente igual, porque quien los pide es quien los estaba
  // esperando.
  //
  // ── POR QUÉ SE DISPARA DESDE `useData` Y NO DESDE CADA PÁGINA ─────────────
  // Porque una regla que hay que recordar se olvida. Si dependiera de que cada
  // página llame a `asegurar()`, la primera que se escriba sin llamarla
  // enseñará listas vacías sin decir por qué. Al colgarlo del propio hook,
  // pedir los datos y usarlos son la misma acción.
  const pedido = useRef(false);
  const asegurar = useCallback(() => {
    if (pedido.current) return;
    pedido.current = true;
    refetchData().finally(() => setLoading(false));
  }, []);

  return (
    <DataContext.Provider value={{ ...data, loading, refetchData, saveEntity, deleteEntity, asegurar }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  // Usar los datos ES pedirlos. Ver el porqué en el proveedor.
  useEffect(() => { ctx.asegurar(); }, [ctx.asegurar]);
  return ctx;
};

/**
 * Los mismos datos, **sin pedirlos**.
 *
 * Para quien los usa si están y sigue funcionando si no. El caso real es el
 * asistente de IA: mira los territorios solo para comprobar que un destino
 * existe antes de navegar, y su propio código ya dice qué hacer si no han
 * llegado — «mejor dejar pasar que impedir algo que sí existe».
 *
 * Ese detalle costaba las ocho peticiones de arranque a TODO el mundo: el
 * asistente se monta en todas las páginas, así que con `useData()` normal los
 * catálogos se pedían siempre aunque nadie fuera a abrir el mapa.
 */
export const useDataSinPedir = () => useContext(DataContext);

export const useHelpers = () => {
  const data = useData();
  
  return {
    ...data,
    getTerritory: (id: string) => data.territories.find(t => t.id === id),
    getTerritoryChallenges: (territoryId: string) => data.challenges.filter(c => c.territory_ids?.includes(territoryId)),
    getChallengeCauses: (challengeId: string) => data.causes.filter(c => c.challenge_ids?.includes(challengeId)),
    getChallengeSolutions: (challengeId: string) => data.solutions.filter(s => s.challenge_ids?.includes(challengeId)),
    getChallengeProjects: (challengeId: string) => data.projects.filter(p => p.challenge_ids?.includes(challengeId)),
    getProjectOrganizations: (projectId: string) => data.organizations.filter(o => data.projects.find(p => p.id === projectId)?.organization_ids?.includes(o.id)),
    getIndicatorsByObjective: (objectiveId: string) => data.indicators.filter(i => i.objective_id === objectiveId),
  };
};

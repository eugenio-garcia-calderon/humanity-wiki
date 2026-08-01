import React, { createContext, useContext, useState, useEffect } from 'react';

type DataContextType = {
  territories: any[];
  objectives: any[];
  challenges: any[];
  solutions: any[];
  projects: any[];
  organizations: any[];
  causes: any[];
  loading: boolean;
  refetchData: () => Promise<void>;
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
  loading: true,
  refetchData: async () => {},
  saveEntity: async () => {},
  deleteEntity: async () => {}
});

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [data, setData] = useState<Omit<DataContextType, 'loading' | 'refetchData' | 'saveEntity' | 'deleteEntity'>>({
    territories: [],
    objectives: [],
    challenges: [],
    solutions: [],
    projects: [],
    organizations: [],
    causes: []
  });
  const [loading, setLoading] = useState(true);

  const refetchData = async () => {
    try {
      const [territories, objectives, challenges, solutions, projects, organizations, causes] = await Promise.all([
        fetch('/api/data/territories').then(r => r.json()),
        fetch('/api/data/objectives').then(r => r.json()),
        fetch('/api/data/challenges').then(r => r.json()),
        fetch('/api/data/solutions').then(r => r.json()),
        fetch('/api/data/projects').then(r => r.json()),
        fetch('/api/data/organizations').then(r => r.json()),
        fetch('/api/data/causes').then(r => r.json())
      ]);
      setData({ territories, objectives, challenges, solutions, projects, organizations, causes });
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

  useEffect(() => {
    refetchData().finally(() => setLoading(false));
  }, []);

  return (
    <DataContext.Provider value={{ ...data, loading, refetchData, saveEntity, deleteEntity }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);

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
  };
};

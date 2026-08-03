import { OBJECTIVE_ID_BY_KEY } from '../utils/objectiveIds';

// One entry per objective key (see objectiveIds.ts) plus 'overall'. A generic
// dictionary rather than fixed fields so adding a new objective never requires
// touching this type — score is null when a territory has no data yet.
export type TerritoryObjectives = Record<string, number | null>;

export interface MapFeature {
  id: string;
  name: string;
  type: string;
  description?: string;
  coordinates: [number, number];
  objectives: TerritoryObjectives;
  indicatorScores?: Record<string, number>;
  markerScores?: Record<string, number>;
  challenges: string[];
}

export class MapService {
  async getTerritories(zoom: number, bbox?: [number, number, number, number]): Promise<MapFeature[]> {
    try {
      const res = await fetch(`/api/map/territories?zoom=${zoom}`);
      if (res.ok) {
        const data = await res.json();
        return data.features.map((f: any) => ({
          id: f.properties.id,
          name: f.properties.name,
          type: f.properties.type,
          description: f.properties.description,
          coordinates: f.geometry.coordinates as [number, number],
          objectives: f.properties.objectives,
          challenges: f.properties.challenges
        }));
      }
      return [];
    } catch (e) {
      console.error("Failed to fetch territories", e);
      return [];
    }
  }

  async createTerritory(data: { name: string, type: string, description?: string, coordinates: [number, number] }): Promise<MapFeature> {
    try {
      const res = await fetch("/api/map/territories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const json = await res.json();
        return {
          id: json.id,
          name: json.name,
          type: json.type,
          description: data.description,
          coordinates: json.coordinates,
          objectives: {
            ...Object.fromEntries(Object.keys(OBJECTIVE_ID_BY_KEY).map(key => [key, 0])),
            overall: 0
          },
          challenges: []
        };
      }
      throw new Error("Failed to create territory");
    } catch (e) {
      console.error("Failed to create territory", e);
      throw e;
    }
  }
}

export const mapService = new MapService();

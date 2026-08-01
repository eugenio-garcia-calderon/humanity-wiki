export type EntityType = 'planet' | 'continent' | 'country'  | 'region' | 'municipality' | 'aldea' | 'comunidad_vecinos';
export type ChallengePriority = 'critical' | 'high' | 'medium' | 'low';

export interface Objective {
  id: string;
  title: string;
  description: string;
  indicator_ids: string[];
  challenge_ids: string[];
  progress_by_territory?: Record<string, number>;
}

export interface Territory {
  id: string;
  type: EntityType;
  name: string;
  parent_id: string | null;
  description: string;
  population?: number;
  area_km2?: number;
  coordinates?: [number, number];
  key_indicators: string[];
  active_challenges: string[];
  featured_objectives: string[];
}

export interface Challenge {
  id: string;
  title: string;
  scope: 'global' | 'national' | 'regional' | 'municipal';
  territory_ids: string[];
  description: string;
  priority: ChallengePriority;
  sectors: string[];
  causes: string[];
  solutions: string[];
  objectives: string[];
  indicators: string[];
  progress?: number;
}

export interface Cause {
  id: string;
  title: string;
  challenge_ids: string[];
  type: string;
}

export interface Solution {
  id: string;
  title: string;
  challenge_ids: string[];
  cause_ids: string[];
  type: string;
  description?: string;
  impact?: string;
  cost?: string;
  readiness?: string;
}

export interface Indicator {
  id: string;
  name: string;
  unit: string;
  category: string;
  direction?: 'higher_is_better' | 'lower_is_better';
  value?: number | null;
}

export interface Organization {
  id: string;
  description?: string;
  name: string;
  type: 'government' | 'community' | 'professional' | 'company' | string;
  scale: string;
  territory_id: string;
  focus_areas: string[];
  objective_ids?: string[];
  solution_ids?: string[];
  image?: string;
}

export interface Project {
  id: string;
  name: string;
  type: string;
  territory_id: string;
  challenge_ids: string[];
  solution_ids: string[];
  objective_ids: string[];
  organization_ids: string[];
  status: string;
  description: string;
  impact_metrics: string[];
  image?: string;
}

export interface Content {
  id: string;
  title: string;
  type: string; // article, video, scientific_paper
  author_id?: string;
  territory_ids: string[];
  challenge_ids: string[];
  solution_ids: string[];
  sectors: string[];
  summary: string;
}

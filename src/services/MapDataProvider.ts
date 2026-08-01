export interface TerritoryViewportFilter {
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  zoom: number;
  type?: string;
  parentId?: string;
  activeObjective?: string;
  activeChallenge?: string | null;
}

export interface MapDataProvider {
  getTerritoriesInViewport(filter: TerritoryViewportFilter): Promise<GeoJSON.FeatureCollection>;
  getTerritoryPolygonsInViewport(filter: TerritoryViewportFilter): Promise<GeoJSON.FeatureCollection>;
  getProjectsInViewport(filter: TerritoryViewportFilter): Promise<GeoJSON.FeatureCollection>;
  getChallengesInViewport(filter: TerritoryViewportFilter): Promise<GeoJSON.FeatureCollection>;
  getEntitiesNearPoint(lng: number, lat: number, radiusKm?: number): Promise<any>;
  getVectorTileUrl(layer: string): string;
}

export class PostGISMapDataProvider implements MapDataProvider {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async getTerritoriesInViewport(filter: TerritoryViewportFilter): Promise<GeoJSON.FeatureCollection> {
    try {
      const params = new URLSearchParams();
      params.set('zoom', filter.zoom.toString());
      if (filter.bbox) params.set('bbox', filter.bbox.join(','));
      if (filter.type) params.set('type', filter.type);
      if (filter.parentId) params.set('parentId', filter.parentId);

      const res = await fetch(`${this.baseUrl}/api/geo/territories/centroids?${params.toString()}`);
      if (res.ok) {
        return await res.json();
      }
      return { type: "FeatureCollection", features: [] };
    } catch (e) {
      console.error("[PostGISMapDataProvider] getTerritoriesInViewport error:", e);
      return { type: "FeatureCollection", features: [] };
    }
  }

  async getTerritoryPolygonsInViewport(filter: TerritoryViewportFilter): Promise<GeoJSON.FeatureCollection> {
    try {
      const params = new URLSearchParams();
      params.set('zoom', filter.zoom.toString());
      if (filter.bbox) params.set('bbox', filter.bbox.join(','));
      if (filter.type) params.set('type', filter.type);
      if (filter.parentId) params.set('parentId', filter.parentId);

      const res = await fetch(`${this.baseUrl}/api/geo/territories/polygons?${params.toString()}`);
      if (res.ok) {
        return await res.json();
      }
      return { type: "FeatureCollection", features: [] };
    } catch (e) {
      console.error("[PostGISMapDataProvider] getTerritoryPolygonsInViewport error:", e);
      return { type: "FeatureCollection", features: [] };
    }
  }

  async getProjectsInViewport(filter: TerritoryViewportFilter): Promise<GeoJSON.FeatureCollection> {
    try {
      const params = new URLSearchParams();
      params.set('zoom', filter.zoom.toString());
      if (filter.bbox) params.set('bbox', filter.bbox.join(','));

      const res = await fetch(`${this.baseUrl}/api/geo/projects?${params.toString()}`);
      if (res.ok) {
        return await res.json();
      }
      return { type: "FeatureCollection", features: [] };
    } catch (e) {
      console.error("[PostGISMapDataProvider] getProjectsInViewport error:", e);
      return { type: "FeatureCollection", features: [] };
    }
  }

  async getChallengesInViewport(filter: TerritoryViewportFilter): Promise<GeoJSON.FeatureCollection> {
    try {
      const params = new URLSearchParams();
      params.set('zoom', filter.zoom.toString());
      if (filter.bbox) params.set('bbox', filter.bbox.join(','));

      const res = await fetch(`${this.baseUrl}/api/geo/challenges?${params.toString()}`);
      if (res.ok) {
        return await res.json();
      }
      return { type: "FeatureCollection", features: [] };
    } catch (e) {
      console.error("[PostGISMapDataProvider] getChallengesInViewport error:", e);
      return { type: "FeatureCollection", features: [] };
    }
  }

  async getEntitiesNearPoint(lng: number, lat: number, radiusKm: number = 50): Promise<any> {
    try {
      const res = await fetch(`${this.baseUrl}/api/geo/near?lng=${lng}&lat=${lat}&radiusKm=${radiusKm}`);
      if (res.ok) {
        return await res.json();
      }
      return { territories: [], projects: [] };
    } catch (e) {
      console.error("[PostGISMapDataProvider] getEntitiesNearPoint error:", e);
      return { territories: [], projects: [] };
    }
  }

  getVectorTileUrl(layer: string): string {
    return `${this.baseUrl}/api/geo/tiles/{z}/{x}/{y}.pbf?layer=${encodeURIComponent(layer)}`;
  }
}

export const mapDataProvider = new PostGISMapDataProvider();

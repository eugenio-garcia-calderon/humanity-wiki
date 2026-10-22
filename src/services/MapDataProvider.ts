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

  /**
   * LA MISMA PREGUNTA, LA MISMA DIRECCIÓN (2026-10-22, «el mapa tarda mucho»). El
   * zoom y el encuadre iban con todos sus decimales, así que cada visita pedía
   * una dirección distinta y ni el navegador ni Cloudflare reutilizaban nada
   * (el servidor ya decía «guárdalo 5 minutos»). El servidor sólo usa el zoom
   * para elegir el nivel (continente, país, región, municipio) y el encuadre
   * para filtrar: se manda un zoom por nivel y el encuadre redondeado HACIA
   * FUERA a una rejilla, que trae lo mismo o un poco más.
   */
  private parametros(filter: TerritoryViewportFilter) {
    const z = filter.zoom;
    const zoom = z < 2 ? 1.5 : z < 3.5 ? 3 : z < 4.5 ? 4 : z < 7 ? 6 : z < 9 ? 8 : 10;
    const paso = zoom <= 3 ? 30 : zoom <= 4 ? 10 : zoom <= 6 ? 5 : 1;
    const params = new URLSearchParams();
    params.set('zoom', String(zoom));
    if (filter.bbox) {
      const [w, s, e, n] = filter.bbox;
      const abajo = (x: number) => Math.floor(x / paso) * paso, arriba = (x: number) => Math.ceil(x / paso) * paso;
      params.set('bbox', [Math.max(-180, abajo(w)), Math.max(-90, abajo(s)), Math.min(180, arriba(e)), Math.min(90, arriba(n))].join(','));
    }
    if (filter.type) params.set('type', filter.type);
    if (filter.parentId) params.set('parentId', filter.parentId);
    return params;
  }

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async getTerritoriesInViewport(filter: TerritoryViewportFilter): Promise<GeoJSON.FeatureCollection> {
    try {
      const params = this.parametros(filter);
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
      const params = this.parametros(filter);
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

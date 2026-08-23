// `topojson-client` ya está en el árbol (lo arrastra otra dependencia) pero sin
// sus tipos, y añadir un paquete más al `node_modules` COMPARTIDO por las nueve
// copias de trabajo obliga a todo el mundo a reinstalar. Se declara aquí lo
// único que usamos: convertir un objeto de una topología en GeoJSON.
declare module 'topojson-client' {
  import type { FeatureCollection, Geometry } from 'geojson';
  export function feature(topology: any, objeto: any): FeatureCollection<Geometry, any>;
  export function mesh(topology: any, objeto?: any, filtro?: (a: any, b: any) => boolean): any;
}

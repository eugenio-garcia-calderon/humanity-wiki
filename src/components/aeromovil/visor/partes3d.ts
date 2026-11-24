// Which part of the vehicle each mesh of the Bala and the Triciclo is (2026-11-24, Eugenio: «paneles solares pincho y no se
// muestran los paneles solares, o retrovisores pincho y se muestra todo el vehículo salvo la cúpula … pincho en mando,
// salpicadero, asientos y no cambia lo que se ve en 3D»).
//
// Until now a menu entry («Retrovisores», «Salpicadero»…) could only switch whole layers (capas.ts) on, and the mirrors, the
// solar panels or the dashboard are a few meshes inside the layers of the body and of the cabin: selecting one showed the
// whole layer (or, for the solar panels, an empty one). Now every mesh of those layers carries `userData.componente` = the
// part it belongs to, and each entry of `partes/subsistemas.ts` lists the parts it shows (`componentes`); `fichaSolo.ts` does
// the filtering.
//
// Two ways a mesh gets its part, both reading the builders' own names (garaje/bala*.ts):
//  · the cabin's blocks (`balaPiezas.ts` `cabina`) tag themselves while they are built: their meshes have no names;
//  · everything else gets it here, from the mesh's own name and its parents' (`parteDeMalla`).
// A mesh that already has a `componente` (the cooling grille, the brake discs…) keeps it.
import type * as THREE from 'three';
import type { CapaId } from './capas';

/** Every value `userData.componente` takes on the body, glass and cabin layers. `partes/subsistemas.ts` lists them per entry. */
export const PARTES_3D = [
  'carroceria', 'cupula', 'cristal-puerta', 'cristal-maletero', 'solar', 'puertas', 'maletero', 'retrovisores', 'luces',
  'asientos', 'mandos', 'salpicadero', 'acabado', 'pedales', 'reposapies', 'cabina-varios',
  // the running gear's layer: the brake discs, calipers and hoses are tagged `frenos` where they are drawn (ocupante.ts,
  // ruedaCatalogo.ts); every other mesh of the layer is the wheel itself
  'rueda', 'frenos',
] as const;
export type Parte3D = (typeof PARTES_3D)[number];

/**
 * The part of a mesh, from its own name and its parents' (nearest first, up to the layer). The order of the rules is the
 * order of precedence: a solar panel on the boot lid is a solar panel, a mirror on a door is a mirror.
 */
export function parteDeMalla(capa: CapaId, propio: string, padres: string[]): Parte3D {
  const dentro = (re: RegExp) => padres.some(n => re.test(n));
  if (capa === 'ruedas') return 'rueda';
  if (propio === 'panel-solar' || propio === 'cuello-panel') return 'solar';
  // (the mirrors of the doors and the tear-drop ones, `retrovisor`; the cameras in capsules of the nose design, `camara-lateral`)
  if (propio === 'retrovisor-casco' || propio === 'capsula' || dentro(/^(retrovisor|camara-lateral)$/)) return 'retrovisores';
  if (/^(faro|faro-led|lente-faro|piloto|piloto-led|intermitente)$/.test(propio) || dentro(/^faro(-barra)?$/)) return 'luces';
  if (/^cinturon/.test(propio)) return 'asientos';
  // the trim of the walls, roof, floor and doors (interiorTriciclo.ts «Interior: …»), wherever it hangs
  if (/^(forro-|borde-ventana$|suelo-moqueta$|funda-torreta$|moldura$|luz-ambiente$|consola-|foco|reposabrazos$|portavasos)/.test(propio)) return 'acabado';
  if (capa === 'cristales') return dentro(/^puerta-/) ? 'cristal-puerta' : dentro(/^porton-/) ? 'cristal-maletero' : 'cupula';
  if (capa === 'carenado') {
    if (propio === 'aleta' || padres.includes('aleta')) return 'carroceria';
    if (/^(montante-|bisagra-|junta-puerta$)/.test(propio) || dentro(/^puerta-/)) return 'puertas';
    if (propio === 'porton' || propio === 'junta-porton' || dentro(/^porton-maletero$/)) return 'maletero';
    return 'carroceria';
  }
  return padres.includes('interior') ? 'acabado' : 'cabina-varios';
}

/** Tags every untagged mesh of the body, glass, cabin and wheel layers with its part. Call it after (re)building them. */
export function etiquetarPartes(G: Record<CapaId, THREE.Object3D>) {
  for (const k of ['carenado', 'cristales', 'asientos', 'ruedas'] as CapaId[]) {
    const raiz = G[k]; if (!raiz) continue;
    raiz.traverse((o: any) => {
      if (!o.isMesh || o.userData.componente) return;
      const padres: string[] = [];
      for (let p = o.parent; p && p !== raiz; p = p.parent) padres.push(p.name);
      o.userData.componente = parteDeMalla(k, o.name, padres);
    });
  }
}

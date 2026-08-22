// ============================================================================
// JUEGO VITAL — efectos de imagen (2026-08-19, fase 0 del realismo). La capa
// que convierte el render crudo en imagen «de cine»: oclusión ambiental
// (sombreado de contacto), bloom para lo que brilla de verdad, viñeta suave y
// antialiasing fino. En calidad baja no se monta nada: el composer entero
// cuesta más que todo lo demás junto en una GPU débil.
// ============================================================================
import { EffectComposer, N8AO, Bloom, SMAA, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { AJUSTES, type NivelCalidad } from './calidad';

export function Efectos({ nivel }: { nivel: NivelCalidad }) {
  const a = AJUSTES[nivel];
  if (!a.efectos) return null;
  // El umbral de bloom queda por encima del blanco puro (1.05): solo brillan
  // los materiales que se salen del rango, como la espiral de los portales.
  // OJO: el composer apaga el tone mapping del renderizador — la curva ACES
  // se aplica AQUÍ como efecto, después del bloom, o los colores salen crudos.
  const comunes = (
    <>
      <Bloom mipmapBlur intensity={0.55} luminanceThreshold={1.05} luminanceSmoothing={0.2} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.45} />
      <SMAA />
    </>
  );
  // Dos árboles separados: el composer recorre a sus hijos y un `false`
  // condicional en medio no le sienta bien.
  return a.ao ? (
    <EffectComposer multisampling={0}>
      <N8AO halfRes quality="medium" aoRadius={1.5} intensity={2.2} distanceFalloff={0.7} />
      {comunes}
    </EffectComposer>
  ) : (
    <EffectComposer multisampling={0}>{comunes}</EffectComposer>
  );
}

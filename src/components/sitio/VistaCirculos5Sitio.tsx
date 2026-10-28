import { Arco } from './VistaCirculos4Sitio';
import { PanelCirculo, useCirculoElegido, useCirculosTerritorio } from './PanelCirculo';

// ============================================================================
// CÍRCULO 5.0 (2026-10-28, Eugenio)
// ============================================================================
// «Un círculo 5.0 con 4 patas: la humanología, la sociología, la tecnología y la
// ecología. En la humanología, lo de Personas, una tarjeta nueva de Potencial
// humano y Relaciones (llamado Relaciones interpersonales); y Energía, en
// tecnología.» Es el arco de Círculo 4.0 con otro reparto: la columna de selección
// «Pata» de la base de datos de Sistemas (sus opciones, en orden, de abajo arriba).
// La columna «Círculo» de las otras vistas no cambia.

const PATAS = /^patas?$/i;
const DIBUJOS: Record<string, string> = { humanologia: 'personas', sociologia: 'sociedad', tecnologia: 'tecnologia', ecologia: 'ecologia' };
const dibujoPata = (clave: string) => (DIBUJOS[clave] ? `/circulos/${DIBUJOS[clave]}.svg` : null);

export default function VistaCirculos5Sitio({ raizId }: { raizId: string }) {
  const t = useCirculosTerritorio(raizId, PATAS);
  const { circulos } = t;
  const { elegido, ver, elegir } = useCirculoElegido(circulos, 'data-circulo-elegido-c5');
  if (!circulos) return <div className="py-24 text-center text-slate-400">Cargando…</div>;
  if (!circulos.length) return <div className="py-24 text-center text-slate-500">Los sistemas aún no tienen pata: añade a su base de datos una columna de selección «Pata».</div>;
  const c = circulos[Math.min(elegido, circulos.length - 1)];
  return (
    <div className="mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)] items-start gap-6 pt-1 lg:grid-cols-[minmax(0,9fr)_minmax(0,11fr)] lg:gap-10" data-vista-circulos5>
      <div className="mx-auto w-full max-w-[520px] lg:sticky lg:top-24 lg:mx-0">
        <Arco circulos={circulos} elegido={elegido} elegir={elegir} ver={ver} dibujoDe={dibujoPata} />
      </div>
      <PanelCirculo c={c} t={t} compacto ancla="data-circulo-elegido-c5" />
    </div>
  );
}

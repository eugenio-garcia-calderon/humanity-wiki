import { Arco } from './ArcoCapas';
import { PanelCirculo, useCirculoElegido, useCirculosTerritorio } from './PanelCirculo';

// ============================================================================
// LA VISTA «CÍRCULO» DEL SITIO (Círculo 5.0, 2026-10-28, Eugenio)
// ============================================================================
// «Un círculo con 4 patas: la humanología, la sociología, la tecnología y la
// ecología…» Y el mismo día: «elimina los círculos 1, 2, 3 y 4; deja solo el 5 y
// llámalo Círculo; que sea la vista al iniciar la página». El arco (`ArcoCapas`)
// con el reparto de la columna de selección «Pata» de la base de datos de Sistemas
// (sus opciones, en orden, de abajo arriba) y, al lado, el panel del elegido
// (`PanelCirculo`: «Tecnología en [territorio ▾]», su nota y sus tarjetas).

const PATAS = /^patas?$/i;
// La ilustración de cada rama. Desde el 2026-10-28 (Eugenio: «cambia Humanología por Ser humano, Sociología por
// Sociedad, Tecnología por Técnica y Ecología por Ecosistema, en singular») las ramas se llaman así; se aceptan
// también los nombres anteriores.
const DIBUJOS: Record<string, string> = {
  'ser-humano': 'personas', sociedad: 'sociedad', tecnica: 'tecnologia', ecosistema: 'ecologia',
  humanologia: 'personas', sociologia: 'sociedad', tecnologia: 'tecnologia', ecologia: 'ecologia',
};
const dibujoPata = (clave: string) => (DIBUJOS[clave] ? `/circulos/${DIBUJOS[clave]}.svg` : null);

export default function VistaCirculoSitio({ raizId }: { raizId: string }) {
  const t = useCirculosTerritorio(raizId, PATAS);
  const { circulos } = t;
  const { elegido, ver, elegir } = useCirculoElegido(circulos, 'data-circulo-elegido');
  if (!circulos) return <div className="py-24 text-center text-slate-400">Cargando…</div>;
  if (!circulos.length) return <div className="py-24 text-center text-slate-500">Los sistemas aún no tienen pata: añade a su base de datos una columna de selección «Pata».</div>;
  const c = circulos[Math.min(elegido, circulos.length - 1)];
  return (
    <div className="mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)] items-start gap-6 pt-1 lg:grid-cols-[minmax(0,10fr)_minmax(0,11fr)] lg:gap-10" data-vista-circulo>
      <div className="mx-auto w-full max-w-[580px] lg:sticky lg:top-24 lg:mx-0">
        <Arco circulos={circulos} elegido={elegido} elegir={elegir} ver={ver} dibujoDe={dibujoPata} />
      </div>
      <PanelCirculo c={c} t={t} compacto ancla="data-circulo-elegido" />
    </div>
  );
}

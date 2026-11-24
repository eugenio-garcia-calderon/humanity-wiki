import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import '@fontsource-variable/public-sans';
import { AmbitoBloque, SelectorAmbito } from '../components/modeloSocioeconomico/ambito';
import { EspectroPropuestas } from '../components/modeloSocioeconomico/EspectroPropuestas';
import { Presupuestos } from '../components/modeloSocioeconomico/Presupuestos';
import { Apartado } from '../components/modeloSocioeconomico/ventanas';
import { ESPECTROS } from '../data/espectro';

// ============================================================================
// ECONOMÍA PÚBLICA (2026-11-24, Eugenio)
// ============================================================================
// «Otra [herramienta] es la de economía pública… ahí metes todo lo desarrollado
// en el otro chat de economía pública, que es todo el tema de los presupuestos.»
// And, asked whether the budgets should also stay in the socioeconomic model:
// «sí, pon una copia en cada sitio».
//
// So this is the «Presupuestos» window of the socioeconomic model
// (ModeloSocioeconomico.tsx), standing alone at luzhumanidad.com/economia-publica,
// one of the five cards of /politica (PoliticaHerramientas.tsx). It is the same
// three pieces the model draws for that window — the scale block, the spectrum of
// proposals and the budgets themselves — imported, not copied: a change to the
// budgets shows in both places. Only the frame is its own: no window menu, a way
// back to Política, and a pointer to the whole model.

export default function EconomiaPublica({ inicio }: { inicio: string }) {
  const enSitio = inicio === '/';
  const raiz = enSitio ? '' : inicio.replace(/\/$/, '');
  const espectro = ESPECTROS.presupuestos;

  useEffect(() => {
    const titulo = document.title;
    document.title = 'Economía pública · En qué se gasta cada escala · Luz & Humanidad';
    return () => { document.title = titulo; };
  }, []);

  const volver = 'inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900';
  return (
    <div data-modelo className="min-h-screen bg-slate-100 text-slate-900 antialiased" style={{ fontFamily: '"Public Sans Variable", ui-sans-serif, system-ui, sans-serif' }}>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          {enSitio
            ? <Link to="/politica" className={volver}><ArrowLeft aria-hidden className="h-4 w-4" />Política</Link>
            : <a href={`${raiz}/politica`} className={volver}><ArrowLeft aria-hidden className="h-4 w-4" />Política</a>}
          <SelectorAmbito />
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-6xl px-4 pb-2 pt-10 sm:px-6 sm:pt-14">
          <h1 className="text-[2.2rem] font-[800] leading-[1.03] tracking-[-0.035em] sm:text-[3.2rem]">Economía pública</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600">
            En qué se gasta el dinero público en cada escala, de la Unión Europea a una familia, y una propuesta para ordenarlo.
          </p>
        </div>
        <AmbitoBloque area="presupuestos" />
        {espectro && <EspectroPropuestas ventana="presupuestos" datos={espectro} />}
        <Apartado id="presupuestos" titulo="En qué se gasta cada escala"
          entradilla="El presupuesto de hoy de la Unión Europea, España, la Comunidad de Madrid, un municipio, una comunidad de vecinos y una familia, cada uno en su quesito. Abajo, todas juntas.">
          <Presupuestos />
        </Apartado>
      </main>

      <footer className="border-t border-slate-200 px-4 pb-16 pt-8 text-center text-sm text-slate-500">
        Forma parte del{' '}
        <a href="https://humanity.wiki/modelo-socioeconomico#presupuestos" className="underline decoration-slate-300 underline-offset-2 hover:text-slate-900">Modelo de optimización socioeconómica</a>,
        donde está junto a los impuestos, las pensiones y el resto de áreas. Un proyecto de{' '}
        {enSitio
          ? <Link to="/" className="underline decoration-slate-300 underline-offset-2 hover:text-slate-900">Luz &amp; Humanidad</Link>
          : <a href={inicio} className="underline decoration-slate-300 underline-offset-2 hover:text-slate-900">Luz &amp; Humanidad</a>}.
      </footer>
    </div>
  );
}

import { useEffect } from 'react';
import { Globe, Monitor, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { esPreferenciaTema, hayTemaElegido, leerTema, ponerTema, useTema, type PreferenciaTema } from '../../utils/tema';
import { esIdioma, hayIdiomaElegido, IDIOMAS, idiomaActual, ponerIdioma, t, useIdioma, type Idioma } from '../../i18n';
import { cn } from '../../utils/cn';

// ============================================================================
// APARIENCIA E IDIOMA, EN EL MENÚ DEL PERFIL (2026-10-06, #25 y #34)
// ============================================================================
// Dos selectores de tres y dos botones. Se guardan en este navegador (así los
// tiene también quien mira sin cuenta) y, si has entrado, en tu cuenta
// (`ui_settings.tema` / `.idioma`), para que te sigan a otros dispositivos.

const TEMAS: { id: PreferenciaTema; nombre: string; icono: typeof Sun }[] = [
  { id: 'claro', nombre: 'Claro', icono: Sun },
  { id: 'oscuro', nombre: 'Oscuro', icono: Moon },
  { id: 'sistema', nombre: 'Sistema', icono: Monitor },
];

/** Al entrar con tu cuenta, lo que guardaste manda sobre lo de este navegador. */
export function SincronizarPreferencias() {
  const { user, updateUiSettings } = useAuth();
  const id = user?.id;
  useEffect(() => {
    if (!user) return;
    const ui = user.uiSettings || {};
    if (esPreferenciaTema(ui.tema)) { if (ui.tema !== leerTema()) ponerTema(ui.tema); }
    else if (hayTemaElegido()) void updateUiSettings({ tema: leerTema() });
    if (esIdioma(ui.idioma)) { if (ui.idioma !== idiomaActual()) void ponerIdioma(ui.idioma); }
    else if (hayIdiomaElegido()) void updateUiSettings({ idioma: idiomaActual() });
  // Solo al entrar: si no, cada guardado volvería a pisar lo que acabas de elegir.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return null;
}

export default function AparienciaIdioma({ desplegado }: { desplegado: boolean }) {
  const { updateUiSettings } = useAuth();
  const { tema } = useTema();
  const { idioma } = useIdioma();
  const elegirTema = (p: PreferenciaTema) => { ponerTema(p); void updateUiSettings({ tema: p }); };
  const elegirIdioma = (i: Idioma) => { void ponerIdioma(i); void updateUiSettings({ idioma: i }); };

  if (!desplegado) {
    // Columna estrecha: un solo botón por cosa, que va rotando.
    const sig = TEMAS[(TEMAS.findIndex(x => x.id === tema) + 1) % TEMAS.length];
    const actual = TEMAS.find(x => x.id === tema)!;
    return (
      <div className="flex flex-col items-center gap-1 py-1">
        <button type="button" onClick={() => elegirTema(sig.id)} title={`${t('Apariencia')}: ${t(actual.nombre)}`} aria-label={`${t('Apariencia')}: ${t(actual.nombre)}`}
          className="grid h-9 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"><actual.icono className="h-4 w-4" /></button>
        <button type="button" onClick={() => elegirIdioma(idioma === 'es' ? 'en' : 'es')} title={t('Idioma')} aria-label={t('Idioma')}
          className="grid h-9 w-10 place-items-center rounded-xl text-[11px] font-black text-slate-500 hover:bg-slate-100 hover:text-slate-900">{idioma.toUpperCase()}</button>
      </div>
    );
  }
  return (
    <div className="space-y-2 px-1.5 py-2">
      <div>
        <p className="mb-1 px-0.5 text-[10px] font-black uppercase tracking-wider text-slate-400">{t('Apariencia')}</p>
        <div role="radiogroup" aria-label={t('Apariencia')} className="grid grid-cols-3 gap-0.5 rounded-xl bg-slate-100 p-0.5">
          {TEMAS.map(x => (
            <button key={x.id} type="button" role="radio" aria-checked={tema === x.id} onClick={() => elegirTema(x.id)}
              className={cn('flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition-colors',
                tema === x.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
              <x.icono className="h-3.5 w-3.5" /> {t(x.nombre)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 flex items-center gap-1 px-0.5 text-[10px] font-black uppercase tracking-wider text-slate-400"><Globe className="h-3 w-3" /> {t('Idioma')}</p>
        <div role="radiogroup" aria-label={t('Idioma')} className="grid grid-cols-2 gap-0.5 rounded-xl bg-slate-100 p-0.5">
          {IDIOMAS.map(x => (
            <button key={x.id} type="button" role="radio" aria-checked={idioma === x.id} onClick={() => elegirIdioma(x.id)}
              className={cn('rounded-lg py-1.5 text-[11px] font-bold transition-colors',
                idioma === x.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
              {x.nombre}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Los dos mismos botones en una fila de 24 px, para el pie de todas las páginas (también las públicas, sin cuenta). */
export function SelectorMini() {
  const { updateUiSettings } = useAuth();
  const { tema } = useTema();
  const { idioma } = useIdioma();
  const sig = TEMAS[(TEMAS.findIndex(x => x.id === tema) + 1) % TEMAS.length];
  const actual = TEMAS.find(x => x.id === tema)!;
  return (
    <span className="ml-2 inline-flex items-center gap-0.5">
      <button type="button" onClick={() => { ponerTema(sig.id); void updateUiSettings({ tema: sig.id }); }}
        title={`${t('Apariencia')}: ${t(actual.nombre)}`} aria-label={`${t('Apariencia')}: ${t(actual.nombre)}`}
        className="grid h-5 w-5 place-items-center rounded hover:bg-slate-100 hover:text-slate-800"><actual.icono className="h-3 w-3" /></button>
      <button type="button" onClick={() => { const i: Idioma = idioma === 'es' ? 'en' : 'es'; void ponerIdioma(i); void updateUiSettings({ idioma: i }); }}
        title={t('Idioma')} aria-label={t('Idioma')}
        className="grid h-5 min-w-5 place-items-center rounded px-0.5 text-[10px] font-black hover:bg-slate-100 hover:text-slate-800">{idioma.toUpperCase()}</button>
    </span>
  );
}

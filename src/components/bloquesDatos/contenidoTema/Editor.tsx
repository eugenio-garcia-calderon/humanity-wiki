import type { PropsEditor } from '../tipos';
import { Ajustes, Campo, Elegir, Escribir } from '../ficha/editor';
import { OBJETIVOS } from '../../../utils/objetivos';
import { cn } from '../../../utils/cn';
import { VistaContenidoTema } from './Lectura';
import { SECCIONES } from './secciones';

export default function Editor({ datos, editable, cambiarDatos }: PropsEditor) {
  const elegidas = Array.isArray(datos.secciones) ? (datos.secciones as string[]) : null;
  const alternar = (clave: string) => {
    const actuales = elegidas ?? SECCIONES.map(([c]) => c);
    const nuevas = actuales.includes(clave) ? actuales.filter(c => c !== clave) : [...actuales, clave];
    // Todas marcadas = sin filtro (así, una sección nueva del servidor sale sola).
    cambiarDatos({ secciones: nuevas.length === SECCIONES.length ? null : nuevas });
  };
  return (
    <div className="space-y-3">
      <Ajustes>
        <Campo etiqueta="Tema">
          <Elegir valor={String(datos.tema || 'O001')} editable={editable} cambiar={v => cambiarDatos({ tema: v })}
            opciones={OBJETIVOS.map(o => [o.id, o.titulo.charAt(0) + o.titulo.slice(1).toLocaleLowerCase('es')] as [string, string])} />
        </Campo>
        <Campo etiqueta="Título">
          <Escribir valor={String(datos.titulo ?? '')} editable={editable} cambiar={v => cambiarDatos({ titulo: v })} placeholder="El nombre del tema" />
        </Campo>
        <Campo etiqueta="Por sección">
          <Elegir valor={String(datos.porSeccion || 6)} editable={editable} cambiar={v => cambiarDatos({ porSeccion: Number(v) })}
            opciones={[['3', '3'], ['6', '6'], ['9', '9'], ['12', '12']]} />
        </Campo>
      </Ajustes>
      {editable && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Secciones que se ven">
          <span className="text-[11px] font-bold text-slate-500">Se ven:</span>
          {SECCIONES.map(([clave, nombre]) => {
            const puesta = !elegidas || elegidas.includes(clave);
            return (
              <button key={clave} type="button" aria-pressed={puesta} onClick={() => alternar(clave)}
                className={cn('h-7 rounded-full px-2.5 text-[11px] font-bold', puesta ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>{nombre}</button>
            );
          })}
        </div>
      )}
      <VistaContenidoTema datos={datos} enEditor />
    </div>
  );
}

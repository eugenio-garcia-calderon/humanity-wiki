import { Badge } from '../../ui/core';
import TextoConEnlaces from '../../ui/TextoConEnlaces';
import type { PropsLectura } from '../tipos';
import { useFicha } from '../ficha/useFicha';
import { vistaPropiedad, DESCRIPCION_NATURALEZA, type Valor } from '../ficha/vistas';
import { fechaCorta } from '../ficha/modelo';
import { AvisoVistaPrevia, Cargando, MarcaProcedencia, Seccion, SinFila, useEnlaceFila } from '../ficha/comunes';

// PROPERTIES OF THE CURRENT ROW (plan §3.2). What it shows is decided in
// `ficha/vistas.ts` (`vistaPropiedad`); the server writes the same thing in
// `ficha/html.ts`. This file only draws.

function ValorConEnlace({ v }: { v: Valor }) {
  const enlace = useEnlaceFila();
  const href = enlace(v.paginaId);
  if (href) return <a href={href} className="font-semibold text-sky-700 hover:underline">{v.texto}</a>;
  if (v.enlace) return <a href={v.enlace} target="_blank" rel="noopener nofollow" className="text-sky-700 hover:underline">{v.texto}</a>;
  return <TextoConEnlaces texto={v.texto} />;
}

export function VistaPropiedad({ datos, paginaId, enEditor }: PropsLectura & { enEditor?: boolean }) {
  const { ficha, cargando } = useFicha(paginaId);
  if (cargando) return <Cargando />;
  if (!ficha) return enEditor ? <SinFila que="Este bloque enseña los datos de una fila." /> : null;
  const v = vistaPropiedad(ficha, datos);
  const aviso = enEditor && ficha.vista_previa ? <AvisoVistaPrevia nombre={ficha.tabla.filas.find(x => x.id === ficha.fila_id)?.titulo || ''} /> : null;
  if (!v) return enEditor ? <>{aviso}<p className="text-sm text-slate-400">Esta fila no tiene datos para este bloque.</p></> : null;

  if (v.estilo === 'cabecera') {
    return (
      <div className="my-2">
        {aviso}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {v.imagen ? (
            <img src={v.imagen} alt={v.nombre} loading="eager" className="h-48 w-48 shrink-0 rounded-2xl border border-slate-100 bg-white object-contain p-2" />
          ) : null}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {v.marca ? <><dt className="text-slate-500">Marca</dt><dd><ValorConEnlace v={v.marca} /></dd></> : null}
            {v.modelo ? <><dt className="text-slate-500">Modelo</dt><dd className="text-slate-800">{v.modelo}</dd></> : null}
            <dt className="text-slate-500">Categoría</dt><dd className="text-slate-800">{v.categoria}</dd>
            {v.estado ? <><dt className="text-slate-500">Estado</dt><dd><Badge variant={/venta/i.test(v.estado) ? 'success' : 'default'}>{v.estado}</Badge></dd></> : null}
            {v.gtin ? <><dt className="text-slate-500">EAN</dt><dd className="font-mono text-xs text-slate-600">{v.gtin}</dd></> : null}
          </dl>
        </div>
      </div>
    );
  }

  if (v.estilo === 'texto') {
    return (
      <Seccion titulo={v.titulo}>
        {aviso}
        <p className="text-base leading-relaxed text-slate-700"><TextoConEnlaces texto={v.texto} /></p>
        <MarcaProcedencia p={v.procedencia} />
      </Seccion>
    );
  }

  if (v.estilo === 'pie') {
    return (
      <footer className="my-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
        {aviso}
        <p>
          {v.revisado ? <>Datos revisados el {fechaCorta(v.revisado)}. </> : <>Estos datos todavía no tienen fecha de revisión. </>}
          {v.fuentes.length ? <>Fuentes: {v.fuentes.join(', ')}.</> : null}
        </p>
        <p>{DESCRIPCION_NATURALEZA}</p>
      </footer>
    );
  }

  if (v.estilo === 'lista') {
    return (
      <Seccion titulo={v.titulo}>
        {aviso}
        <ul className="space-y-1.5 text-sm">
          {v.lineas.map(l => (
            <li key={l.columnaId} className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-slate-500">{l.etiqueta}:</span>
              <span className="text-slate-800"><ValorConEnlace v={l.valor} /></span>
              <MarcaProcedencia p={l.valor.procedencia} />
            </li>
          ))}
        </ul>
      </Seccion>
    );
  }

  return (
    <Seccion titulo={v.titulo}>
      {aviso}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <tbody>
            {v.lineas.map(l => (
              <tr key={l.columnaId} className="border-b border-slate-100 last:border-0">
                <th scope="row" className="w-2/5 bg-slate-50/60 px-3 py-2 text-left align-top font-medium text-slate-600">{l.etiqueta}</th>
                <td className="px-3 py-2 align-top text-slate-800">
                  <div><ValorConEnlace v={l.valor} /></div>
                  <MarcaProcedencia p={l.valor.procedencia} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Seccion>
  );
}

export default function Lectura(p: PropsLectura) {
  return <VistaPropiedad {...p} />;
}

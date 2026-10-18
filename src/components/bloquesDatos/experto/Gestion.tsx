import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Save, MessageCircle } from 'lucide-react';
import { Button, Badge } from '../../ui/core';
import { cn } from '../../../utils/cn';
import { pedir, euros, ESTADO_CONSULTA } from '../chat/api';
import Conversacion from '../chat/Conversacion';

type Franja = { dia: number; desde: string; hasta: string };
type ExpertoGestion = {
  id: string; nombre: string; especialidad: string | null; bio: string | null; foto: string | null;
  precioCentimos: number; moneda: string; duracionMin: number; comisionBps: number; zonaHoraria: string;
  activo: boolean; orden: number; disponibilidad: Franja[]; antelacionHoras: number; enlaceReunion: string;
  cuentaEmail: string | null;
};
type Consulta = {
  id: string; experto: string; inicio: string; estado: string; cliente: string; email: string | null; tema: string | null;
  importeCentimos: number; comisionCentimos: number; netoExpertoCentimos: number; moneda: string; cobro: string;
  seLeDebe: boolean; pagadoExperto: string | null; transferencia: string | null; reembolsada: string | null; conversacion: string | null;
};
type Datos = { equipo: boolean; pagosActivos: boolean; expertos: ExpertoGestion[]; consultas: Consulta[] };

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const CAMPO = 'w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-emerald-400 focus:outline-none';
const nuevo = (): ExpertoGestion => ({
  id: '', nombre: '', especialidad: '', bio: '', foto: '', precioCentimos: 4000, moneda: 'EUR', duracionMin: 45,
  comisionBps: 1000, zonaHoraria: 'Europe/Madrid', activo: true, orden: 0, antelacionHoras: 24, enlaceReunion: '',
  disponibilidad: [{ dia: 2, desde: '10:00', hasta: '13:00' }, { dia: 4, desde: '16:00', hasta: '19:00' }], cuentaEmail: '',
});

/**
 * El panel del equipo (todos los expertos y sus consultas, lo que se le debe
 * a cada uno) y del experto (sólo lo suyo: agenda, bio, enlace y consultas).
 * Qué ve cada cual lo decide el servidor; aquí sólo se pinta.
 */
export default function Gestion({ paginaId, onCambio }: { paginaId: string; onCambio?: () => void }) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<ExpertoGestion | null>(null);
  const [chat, setChat] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try { setDatos(await pedir<Datos>(`/api/expertos/gestion/${encodeURIComponent(paginaId)}`)); setError(null); }
    catch (e: any) { setError(e.message); }
  }, [paginaId]);
  useEffect(() => { void cargar(); }, [cargar]);

  if (error) return <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{error}</p>;
  if (!datos) return <div className="p-4 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /></div>;

  const accion = async (c: Consulta, a: 'hecha' | 'cancelar' | 'pagado_experto') => {
    let cuerpo: any = { accion: a };
    if (a === 'cancelar') {
      if (!window.confirm(`¿Cancelar la consulta de ${c.cliente}?${c.importeCentimos ? ` Se le devolverán ${euros(c.importeCentimos, c.moneda)} por Stripe.` : ''}`)) return;
      cuerpo.motivo = window.prompt('Motivo (lo verá el cliente, opcional):') || '';
    }
    if (a === 'pagado_experto') {
      const ref = window.prompt(`Referencia de la transferencia de ${euros(c.netoExpertoCentimos, c.moneda)} al experto:`);
      if (!ref) return;
      cuerpo.ref = ref;
    }
    try { await pedir(`/api/expertos/gestion/consulta/${encodeURIComponent(c.id)}`, { metodo: 'PUT', cuerpo }); await cargar(); }
    catch (e: any) { window.alert(e.message); }
  };

  const nombreDe = (id: string) => datos.expertos.find(e => e.id === id)?.nombre || '—';
  const deuda = datos.consultas.filter(c => c.seLeDebe).reduce((s, c) => s + c.netoExpertoCentimos, 0);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-semibold text-slate-800">{datos.equipo ? 'Expertos del sitio' : 'Tu ficha de experto'}</h4>
        {!datos.pagosActivos && <Badge variant="warning">Pagos sin activar</Badge>}
        {datos.equipo && (
          <Button variant="outline" className="ml-auto normal-case tracking-normal" onClick={() => setEditando(nuevo())}>
            <Plus className="mr-1 h-4 w-4" /> Añadir experto
          </Button>
        )}
      </div>

      {editando && (
        <Ficha experto={editando} equipo={datos.equipo} cerrar={() => setEditando(null)}
          guardado={async () => { setEditando(null); await cargar(); onCambio?.(); }} paginaId={paginaId} />
      )}

      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {datos.expertos.length === 0 && <li className="p-3 text-sm text-slate-500">Aún no hay expertos.</li>}
        {datos.expertos.map(e => (
          <li key={e.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
            <span className="font-medium text-slate-800">{e.nombre}</span>
            <span className="text-slate-500">{e.especialidad}</span>
            <span className="text-slate-500">· {e.precioCentimos ? euros(e.precioCentimos, e.moneda) : 'gratis'} · {e.duracionMin} min · comisión {(e.comisionBps / 100).toLocaleString('es-ES')} %</span>
            {!e.activo && <Badge>Oculto</Badge>}
            {!e.cuentaEmail && datos.equipo && <Badge variant="info">Sin cuenta: cobra la plataforma</Badge>}
            <Button variant="ghost" className="ml-auto normal-case tracking-normal" onClick={() => setEditando(e)}>Editar</Button>
          </li>
        ))}
      </ul>

      <div>
        <h4 className="mb-2 flex items-center gap-2 font-semibold text-slate-800">
          Consultas
          {datos.equipo && deuda > 0 && <Badge variant="warning">Se debe a expertos: {euros(deuda)}</Badge>}
        </h4>
        {datos.consultas.length === 0 ? <p className="text-sm text-slate-500">Todavía no hay consultas pagadas.</p> : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr><th className="p-2">Cuándo</th><th className="p-2">Cliente</th><th className="p-2">Experto</th><th className="p-2">Importe</th><th className="p-2">Estado</th><th className="p-2" /></tr>
              </thead>
              <tbody>
                {datos.consultas.map(c => (
                  <tr key={c.id} className="border-t border-slate-100 align-top">
                    <td className="p-2 whitespace-nowrap">{new Date(c.inicio).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-2">{c.cliente}{c.tema && <span className="block text-xs text-slate-500">«{c.tema}»</span>}</td>
                    <td className="p-2">{nombreDe(c.experto)}</td>
                    <td className="p-2 whitespace-nowrap">
                      {c.importeCentimos ? euros(c.importeCentimos, c.moneda) : 'Gratis'}
                      {c.importeCentimos > 0 && (
                        <span className="block text-xs text-slate-500">
                          experto {euros(c.netoExpertoCentimos, c.moneda)} · sitio {euros(c.comisionCentimos, c.moneda)}
                          {' · '}{c.cobro === 'directo' ? 'cobró el experto' : c.seLeDebe ? 'se le debe' : c.pagadoExperto ? `pagado (${c.transferencia})` : 'cobró la plataforma'}
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      <Badge variant={c.estado === 'pagada' ? 'success' : c.estado === 'cancelada' ? 'danger' : 'default'}>{ESTADO_CONSULTA[c.estado] || c.estado}</Badge>
                      {c.reembolsada && <span className="block text-xs text-slate-500">devuelta</span>}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {c.conversacion && (
                          <Button variant="ghost" className="px-2 py-1 normal-case tracking-normal" onClick={() => setChat(chat === c.conversacion ? null : c.conversacion)}>
                            <MessageCircle className="mr-1 h-3.5 w-3.5" /> Chat
                          </Button>
                        )}
                        {c.estado === 'pagada' && <Button variant="ghost" className="px-2 py-1 normal-case tracking-normal" onClick={() => accion(c, 'hecha')}>Hecha</Button>}
                        {c.estado === 'pagada' && <Button variant="ghost" className="px-2 py-1 normal-case tracking-normal text-rose-600" onClick={() => accion(c, 'cancelar')}>Cancelar</Button>}
                        {datos.equipo && c.seLeDebe && <Button variant="ghost" className="px-2 py-1 normal-case tracking-normal" onClick={() => accion(c, 'pagado_experto')}>Apuntar pago al experto</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {chat && <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white"><Conversacion key={chat} id={chat} alto="h-72" /></div>}
      </div>
    </div>
  );
}

/** Alta o edición de un experto. El experto (no equipo) sólo toca lo suyo. */
function Ficha({ experto, equipo, cerrar, guardado, paginaId }: {
  experto: ExpertoGestion; equipo: boolean; cerrar: () => void; guardado: () => void; paginaId: string;
}) {
  const [f, setF] = useState<ExpertoGestion>(experto);
  const [precio, setPrecio] = useState((experto.precioCentimos / 100).toString());
  const [comision, setComision] = useState((experto.comisionBps / 100).toString());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pon = (c: Partial<ExpertoGestion>) => setF(x => ({ ...x, ...c }));
  const franja = (i: number, c: Partial<Franja>) => pon({ disponibilidad: f.disponibilidad.map((x, j) => (j === i ? { ...x, ...c } : x)) });

  const guardar = async () => {
    setGuardando(true); setError(null);
    const propios = {
      bio: f.bio || '', foto: f.foto || '', zonaHoraria: f.zonaHoraria, disponibilidad: f.disponibilidad,
      antelacionHoras: Number(f.antelacionHoras), enlaceReunion: f.enlaceReunion || '',
    };
    const cuerpo = equipo ? {
      ...propios, nombre: f.nombre, especialidad: f.especialidad || '', activo: f.activo, orden: Number(f.orden) || 0,
      precioCentimos: Math.round(Number(precio.replace(',', '.')) * 100), duracionMin: Number(f.duracionMin),
      comisionBps: Math.round(Number(comision.replace(',', '.')) * 100), cuentaEmail: f.cuentaEmail || '',
    } : propios;
    try {
      if (f.id) await pedir(`/api/expertos/gestion/experto/${encodeURIComponent(f.id)}`, { metodo: 'PUT', cuerpo });
      else await pedir(`/api/expertos/gestion/${encodeURIComponent(paginaId)}`, { metodo: 'POST', cuerpo });
      guardado();
    } catch (e: any) { setError(e.message); }
    setGuardando(false);
  };

  const archivar = async () => {
    if (!window.confirm(`¿Quitar a ${f.nombre} del sitio? Sus consultas ya pagadas siguen en pie.`)) return;
    try { await pedir(`/api/expertos/gestion/experto/${encodeURIComponent(f.id)}`, { metodo: 'DELETE' }); guardado(); }
    catch (e: any) { setError(e.message); }
  };

  return (
    <div className="space-y-3 rounded-xl border border-emerald-200 bg-white p-4">
      {equipo && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-slate-600">Nombre<input className={CAMPO} value={f.nombre} onChange={e => pon({ nombre: e.target.value })} /></label>
          <label className="text-xs text-slate-600">Especialidad<input className={CAMPO} value={f.especialidad || ''} placeholder="Instaladora fotovoltaica certificada" onChange={e => pon({ especialidad: e.target.value })} /></label>
          <label className="text-xs text-slate-600">Precio (€, 0 = gratis)<input className={CAMPO} inputMode="decimal" value={precio} onChange={e => setPrecio(e.target.value)} /></label>
          <label className="text-xs text-slate-600">Duración (minutos)<input className={CAMPO} type="number" min={15} max={240} value={f.duracionMin} onChange={e => pon({ duracionMin: Number(e.target.value) })} /></label>
          <label className="text-xs text-slate-600">Comisión del sitio (%) — se enseña al cliente<input className={CAMPO} inputMode="decimal" value={comision} onChange={e => setComision(e.target.value)} /></label>
          <label className="text-xs text-slate-600">Correo de la cuenta del experto (para que conteste y cobre)
            <input className={CAMPO} type="email" value={f.cuentaEmail || ''} placeholder="Vacío: contesta el equipo y cobra la plataforma" onChange={e => pon({ cuentaEmail: e.target.value })} />
          </label>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-slate-600 sm:col-span-2">Presentación<textarea className={cn(CAMPO, 'resize-y')} rows={3} value={f.bio || ''} onChange={e => pon({ bio: e.target.value })} /></label>
        <label className="text-xs text-slate-600">Foto (dirección https)<input className={CAMPO} value={f.foto || ''} onChange={e => pon({ foto: e.target.value })} /></label>
        <label className="text-xs text-slate-600">Enlace de la videollamada (Meet, Zoom…)<input className={CAMPO} value={f.enlaceReunion || ''} placeholder="https://" onChange={e => pon({ enlaceReunion: e.target.value })} /></label>
        <label className="text-xs text-slate-600">Zona horaria de la agenda<input className={CAMPO} value={f.zonaHoraria} onChange={e => pon({ zonaHoraria: e.target.value })} /></label>
        <label className="text-xs text-slate-600">Antelación mínima para reservar (horas)<input className={CAMPO} type="number" min={0} max={720} value={f.antelacionHoras} onChange={e => pon({ antelacionHoras: Number(e.target.value) })} /></label>
      </div>
      <div>
        <p className="text-xs font-medium text-slate-600">Horario semanal</p>
        {f.disponibilidad.map((x, i) => (
          <div key={i} className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <select className="rounded-lg border border-slate-200 px-2 py-1" value={x.dia} onChange={e => franja(i, { dia: Number(e.target.value) })} aria-label="Día">
              {DIAS.slice(1).map((d, j) => <option key={d} value={j + 1}>{d}</option>)}
            </select>
            de <input type="time" className="rounded-lg border border-slate-200 px-2 py-1" value={x.desde} onChange={e => franja(i, { desde: e.target.value })} aria-label="Desde" />
            a <input type="time" className="rounded-lg border border-slate-200 px-2 py-1" value={x.hasta} onChange={e => franja(i, { hasta: e.target.value })} aria-label="Hasta" />
            <Button variant="ghost" className="px-2 py-1" aria-label="Quitar franja" onClick={() => pon({ disponibilidad: f.disponibilidad.filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
        <Button variant="ghost" className="mt-1 px-2 py-1 normal-case tracking-normal" onClick={() => pon({ disponibilidad: [...f.disponibilidad, { dia: 1, desde: '09:00', hasta: '13:00' }] })}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Añadir franja
        </Button>
      </div>
      {equipo && (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={f.activo} onChange={e => pon({ activo: e.target.checked })} /> Visible en el sitio
        </label>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={guardar} disabled={guardando}>{guardando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Guardar</Button>
        <Button variant="outline" onClick={cerrar}>Cancelar</Button>
        {equipo && f.id && <Button variant="ghost" className="ml-auto text-rose-600" onClick={archivar}><Trash2 className="mr-1 h-4 w-4" /> Quitar del sitio</Button>}
      </div>
    </div>
  );
}

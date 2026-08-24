/**
 * ACEPTAR EL CONTRATO DE SERVICIO DE COBRO (2026-08-24, prog7).
 *
 * Lo que permite que alguien pague de una vez un carrito con cosas de varias
 * tiendas. Sin esta firma, la tienda sigue vendiendo igual —cobrando ella en
 * su cuenta— pero no entra en los carritos compartidos.
 *
 * No se pide al registrarse ni se cuela en unos términos generales: se acepta
 * aquí, a la vista, con el contrato a un clic y con la fecha registrada.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, Check } from 'lucide-react';

export default function ContratoDeCobro() {
  const [estado, setEstado] = useState<any>(null);
  const [enviando, setEnviando] = useState(false);
  const [leido, setLeido] = useState(false);
  const cargar = () => {
    fetch('/api/publicar/acuerdos', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null).then(j => { if (j) setEstado(j.cobro); }).catch(() => {});
  };
  useEffect(cargar, []);
  async function aceptar() {
    setEnviando(true);
    try {
      await fetch('/api/publicar/acuerdos', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acuerdo: 'cobro' }),
      });
      cargar();
    } catch { /* sin conexión */ }
    finally { setEnviando(false); }
  }
  if (!estado) return null;

  if (estado.aceptado) {
    return (
      <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
        <p className="text-sm font-black text-emerald-900 inline-flex items-center gap-1.5">
          <Check className="w-4 h-4" /> Contrato de cobro aceptado
        </p>
        <p className="text-[11px] text-emerald-800 mt-0.5">
          {estado.version_vigente} · {estado.aceptado_en ? new Date(estado.aceptado_en).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}.{' '}
          <Link to="/avisos-legales?vista=cobro" className="underline">Leerlo</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border border-slate-300 bg-white p-4">
      <p className="text-sm font-black text-slate-900 inline-flex items-center gap-1.5">
        <Scale className="w-4 h-4 text-slate-400" /> Contrato de servicio de cobro
      </p>
      {estado.version_anterior && (
        <p className="mt-1 text-[11px] font-bold text-amber-800">
          Aceptaste una versión anterior ({estado.version_anterior}). Hay una nueva y hay que aceptarla para seguir.
        </p>
      )}
      <p className="mt-1 text-sm text-slate-600 leading-relaxed">
        Si lo aceptas, la plataforma podrá <b>cobrar en tu nombre</b> cuando alguien lleve en el mismo
        carrito cosas tuyas y de otras tiendas, y luego te liquida lo tuyo menos la comisión.
        <b> La venta sigue siendo tuya</b>: tú facturas, tú entregas y tú atiendes las devoluciones.
      </p>
      <ul className="mt-2 space-y-0.5 text-[11px] text-slate-500">
        <li>· Comisión 5 % en euros y 2,5 % en puntos, descontada de la liquidación.</li>
        <li>· Se te liquida a los 14 días de que el pedido conste entregado.</li>
        <li>· Las devoluciones y los contracargos se descuentan de lo que tengas pendiente.</li>
        <li>· Puedes dejarlo cuando quieras avisando con 15 días.</li>
      </ul>
      <label className="mt-3 flex items-start gap-2 cursor-pointer">
        <input type="checkbox" checked={leido} onChange={e => setLeido(e.target.checked)} className="mt-1" />
        <span className="text-xs text-slate-700">
          He leído el <Link to="/avisos-legales?vista=cobro" className="underline font-bold">contrato de servicio de cobro</Link> ({estado.version_vigente}) y lo acepto.
        </span>
      </label>
      <button type="button" onClick={aceptar} disabled={!leido || enviando}
        className="mt-2 h-10 px-4 rounded-xl bg-slate-900 text-white text-xs font-black disabled:opacity-40">
        {enviando ? 'Guardando…' : 'Aceptar el contrato'}
      </button>
      <p className="mt-1.5 text-[11px] text-slate-400">
        Si no lo aceptas no pasa nada: sigues vendiendo igual y cobrando tú en tu cuenta. Solo te quedas
        fuera de los carritos con varias tiendas.
      </p>
    </div>
  );
}

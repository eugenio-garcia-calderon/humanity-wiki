import { useEffect, useRef, useState } from 'react';
import type { Colab, PresenciaPersona } from '../../utils/colabCliente';
import { crudoAVisible, rectasDeTramo } from '../../utils/colabDom';

// ============================================================================
// LOS CURSORES Y SELECCIONES DE LOS DEMÁS (2026-10-06, carril colab)
// ============================================================================
// Una capa transparente encima de la página. Para cada persona que NO eres tú:
//   · en un bloque de texto, su cursor (barra de su color con su nombre) y, si
//     tiene algo seleccionado, el tramo sombreado. La posición viaja como
//     posición RELATIVA de Yjs, así que sigue en su sitio aunque alguien
//     escriba delante. Si el bloque se ve ya con formato aquí (`**negrita**`
//     sin sus asteriscos), el desplazamiento se traduce del texto crudo al
//     visible (`crudoAVisible`); si no cuadra con el DOM, sólo se marca el bloque.
//   · en un bloque que no es texto (imagen, base de datos, tabla…), el bloque
//     que tiene seleccionado: un filo de su color a la izquierda y su nombre.
// No toca el DOM de la página ni coge clics (`pointer-events-none`).
// Se recalcula al cambiar la presencia y cada 400 ms (la página puede moverse
// sola: una imagen que carga, un bloque que se pliega).
// ============================================================================

interface Marca {
  clave: string; color: string; nombre: string;
  filo: { x: number; y: number; h: number } | null;
  barras: { x: number; y: number; w: number; h: number }[];
  cursor: { x: number; y: number; h: number } | null;
}

export default function CursoresAjenos({ personas, contenedor, colab }: {
  personas: PresenciaPersona[];
  contenedor: React.RefObject<HTMLElement | null>;
  colab: React.RefObject<Colab | null>;
}) {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const ultimo = useRef('');

  useEffect(() => {
    const calcular = () => {
      const cont = contenedor.current;
      const c = colab.current;
      if (!cont || !c) { if (ultimo.current !== '[]') { ultimo.current = '[]'; setMarcas([]); } return; }
      const base = cont.getBoundingClientRect();
      const out: Marca[] = [];
      for (const p of personas) {
        if (p.yo || !p.bloque) continue;
        const caja = cont.querySelector(`[data-bloque-caja="${CSS.escape(p.bloque)}"]`) as HTMLElement | null;
        if (!caja) continue;
        const rc = caja.getBoundingClientRect();
        const m: Marca = { clave: `${p.clientId}`, color: p.color, nombre: p.nombre.split(' ')[0], filo: { x: rc.left - base.left - 6, y: rc.top - base.top, h: rc.height }, barras: [], cursor: null };
        if (p.cursor) {
          const ia = c.indiceDesdeRelativa(p.bloque, p.cursor.a), ih = c.indiceDesdeRelativa(p.bloque, p.cursor.h);
          // El texto crudo de este bloque, tal como está en el documento.
          const raw = (c.textoDe(p.bloque) ?? '');
          const activo = caja.querySelector('[data-bloque]') as HTMLElement | null;
          const el = activo || (caja.querySelector('.cursor-text') as HTMLElement | null) || caja;
          if (ia !== null && ih !== null) {
            let a = ia, h = ih, ok = true;
            if (!activo) {
              const va = crudoAVisible(raw, ia), vh = crudoAVisible(raw, ih);
              a = va.visible; h = vh.visible;
              // Sólo si el DOM dice lo mismo que el texto: si no, no se adivina.
              ok = (el.textContent || '').length === va.largo;
            } else ok = (el.textContent || '').length === raw.length;
            if (ok) {
              const rs = rectasDeTramo(el, cont, a, h);
              if (rs.length) {
                if (a === h) { const r = rs[rs.length - 1]; m.cursor = { x: r.x, y: r.y, h: r.h || 18 }; m.filo = null; }
                else { m.barras = rs.filter(r => r.w > 0); const u = rs[rs.length - 1]; m.cursor = { x: u.x + u.w, y: u.y, h: u.h || 18 }; m.filo = null; }
              }
            }
          }
        }
        out.push(m);
      }
      const f = JSON.stringify(out);
      if (f !== ultimo.current) { ultimo.current = f; setMarcas(out); }
    };
    calcular();
    const t = setInterval(calcular, 400);
    return () => clearInterval(t);
  }, [personas, contenedor, colab]);

  if (!marcas.length) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-visible">
      {marcas.map(m => (
        <div key={m.clave}>
          {m.filo && (
            <>
              <span className="absolute w-[3px] rounded-full" style={{ left: m.filo.x, top: m.filo.y, height: m.filo.h, background: m.color }} />
              <span className="absolute text-[10px] font-bold text-white px-1.5 py-px rounded-t rounded-br whitespace-nowrap" style={{ left: m.filo.x, top: m.filo.y - 15, background: m.color }}>{m.nombre}</span>
            </>
          )}
          {m.barras.map((b, i) => <span key={i} className="absolute rounded-sm" style={{ left: b.x, top: b.y, width: b.w, height: b.h, background: m.color, opacity: 0.22 }} />)}
          {m.cursor && (
            <>
              <span className="absolute w-[2px]" style={{ left: m.cursor.x, top: m.cursor.y, height: m.cursor.h, background: m.color }} />
              <span className="absolute text-[10px] font-bold text-white px-1.5 py-px rounded-t rounded-br whitespace-nowrap" style={{ left: m.cursor.x, top: m.cursor.y - 15, background: m.color }}>{m.nombre}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

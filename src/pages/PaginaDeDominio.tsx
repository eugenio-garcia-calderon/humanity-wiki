import { useEffect, useState } from 'react';
import PortadaEspacio from './PortadaEspacio';
import Cesta from '../components/knowledge/Cesta';
import VistaPagina, { Cargando, SinPagina, type DatosPagina } from '../components/sitio/VistaPagina';
import { paginaPrecargada } from '../utils/precargado';

// ============================================================================
// LO QUE SE VE EN UN DOMINIO PROPIO — `lamieldelasierra.com` (2026-08-22)
// ============================================================================
// Eugenio: «permitir que el usuario ponga su dominio propio en una de sus
// páginas como hace notion».
//
// ── AQUÍ NO SE MENCIONA HUMANITY.WIKI, Y ESE ES EL PUNTO ────────────────────
// Quien compra un dominio lo compra para que su sitio sea SUYO. Un pie que
// diga «publicado en humanity.wiki» convierte su web en la página de alguien
// alojada en otro sitio, que es justo lo que ha pagado por evitar.
//
// ── UN DOMINIO PUEDE APUNTAR A DOS COSAS ────────────────────────────────────
// A una PÁGINA suelta —una tienda, un manifiesto, un currículum— o al ESPACIO
// entero de esa persona. El servidor dice cuál con `tipo`.
//
// ── EL CONTENIDO SE PIDE APARTE (2026-09-30) ────────────────────────────────
// El resolvedor de dominios dice A QUÉ apunta, no trae los bloques. Esta
// pantalla leía `datos.config` de su respuesta, que nunca venía: un dominio
// propio enseñaba el título y la página vacía. Ahora el contenido se pide a
// `/api/sitio/pagina/:id`, el mismo sitio que sirve las subpáginas.

export type Resuelto = {
  estado: 'pagina' | 'espacio' | 'despublicada' | 'no-existe' | 'fallo';
  datos?: any;
};

export default function PaginaDeDominio({ host, resuelto }: { host: string; resuelto: Resuelto }) {
  // Lo normal es que venga dentro del HTML: ver `precargado.ts`.
  const [pagina, setPagina] = useState<DatosPagina | null>(
    () => resuelto.estado === 'pagina' ? paginaPrecargada(resuelto.datos?.id) : null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    if (resuelto.estado !== 'pagina' || !resuelto.datos?.id) return;
    if (pagina?.id === resuelto.datos.id) return;
    let vivo = true;
    fetch(`/api/sitio/pagina/${encodeURIComponent(resuelto.datos.id)}`)
      .then(async r => { if (!vivo) return; if (!r.ok) { setFallo(true); return; } setPagina(await r.json()); })
      .catch(() => vivo && setFallo(true));
    return () => { vivo = false; };
  }, [resuelto]);

  if (resuelto.estado === 'espacio' && resuelto.datos?.handle) {
    return <PortadaEspacio handle={resuelto.datos.handle} />;
  }

  if (resuelto.estado !== 'pagina' || fallo) {
    const e = fallo ? 'fallo' : resuelto.estado;
    return (
      <SinPagina
        titulo={e === 'despublicada' ? 'Esta página ya no está publicada'
          : e === 'no-existe' ? 'Este dominio todavía no apunta a nada'
          : 'No se ha podido cargar'}
        texto={e === 'despublicada'
          ? 'Quien la escribió ha dejado de compartirla.'
          : e === 'no-existe'
            // Quien ve esto suele ser el dueño, minutos después de configurar
            // el DNS: se le dice qué falta, no «no encontrado».
            ? `El dominio ${host} llega hasta aquí, pero nadie lo ha asociado todavía a una página.`
            : 'Inténtalo dentro de un momento.'}
      />
    );
  }

  if (!pagina) return <Cargando />;

  return (
    <VistaPagina pagina={pagina} propio
      // Si la página vende algo, la cesta va igual: el dominio cambia la
      // dirección, no lo que la página es.
      pie={resuelto.datos?.autor?.handle ? <Cesta tienda={resuelto.datos.autor.handle} /> : null} />
  );
}

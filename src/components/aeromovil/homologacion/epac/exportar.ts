// The pedal cycle's documents and test reports as one self-contained HTML page (2026-11-24, Eugenio: «cuando pongo los
// resultados pues se genera el documento»). The same page is the preview on screen, the file that is downloaded and what
// is printed (the browser's «guardar como PDF»). No scripts but the print button, no external files: it opens anywhere.
// Every piece of text is escaped here: what the engineer typed is data, never markup.
import { bloques, trozos } from './ui';
import { OBLIGACIONES } from './catalogo';
import type { Ensayo } from './ensayos';
import type { Fabricante, Intento } from './tipos';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const inline = (s: string) => trozos(s).map(t => t.k === 'b' ? `<strong>${esc(t.x)}</strong>` : t.k === 'i' ? `<em>${esc(t.x)}</em>` : t.k === 'pc' ? `<mark>${esc(t.x)}</mark>` : t.k === 'a' ? `<a href="${esc(t.url)}">${esc(t.x)}</a>` : esc(t.x)).join('');

export function mdAHtml(md: string): string {
  return bloques(md).map(b => b.t === 'h' ? `<h4>${esc(b.x)}</h4>`
    : b.t === 'p' ? `<p>${inline(b.x).replace(/\n/g, '<br>')}</p>`
    : b.t === 'ul' ? `<ul>${b.xs.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`
    : b.t === 'ol' ? `<ol>${b.xs.map(x => `<li>${inline(x)}</li>`).join('')}</ol>`
    : `<table><thead><tr>${b.cab.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${b.filas.map(f => `<tr>${f.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('\n');
}

const CSS = `
body{font:14px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;max-width:820px;margin:24px auto;padding:0 20px}
h1{font-size:20px;margin:0 0 2px}h2{font-size:15px;margin:22px 0 6px;padding-bottom:3px;border-bottom:1px solid #cbd5e1}h4{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin:10px 0 2px}
.sub{color:#475569;margin:0 0 14px}.aviso{border:1px solid #fcd34d;background:#fffbeb;color:#78350f;padding:6px 10px;border-radius:6px;font-size:12px;margin:10px 0}
table{border-collapse:collapse;width:100%;font-size:12.5px;margin:6px 0}th,td{border:1px solid #cbd5e1;padding:4px 7px;text-align:left;vertical-align:top}th{background:#f1f5f9}
mark{background:#fef3c7;color:#78350f;padding:0 3px;border-radius:3px}ul,ol{margin:4px 0;padding-left:22px}p{margin:5px 0}a{color:#0f766e}
.pie{margin-top:28px;font-size:11.5px;color:#64748b;border-top:1px solid #cbd5e1;padding-top:6px}
button{font:inherit;padding:5px 12px;border:1px solid #0f766e;background:#0f766e;color:#fff;border-radius:6px;cursor:pointer;margin-bottom:10px}
@media print{.noprint{display:none}body{margin:0;max-width:none}h2{break-after:avoid}table,li{break-inside:avoid}}`;

export interface PaginaExportable { titulo: string; subtitulo?: string; aviso?: string; secciones: { titulo: string; md: string }[]; pie?: string }

export function paginaHtml(p: PaginaExportable, conBoton = true): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p.titulo)}</title><style>${CSS}</style></head><body>
${conBoton ? '<div class="noprint"><button onclick="window.print()">Imprimir o guardar como PDF</button></div>' : ''}
<h1>${esc(p.titulo)}</h1>${p.subtitulo ? `<p class="sub">${esc(p.subtitulo)}</p>` : ''}${p.aviso ? `<div class="aviso">${esc(p.aviso)}</div>` : ''}
${p.secciones.map(s => `<h2>${esc(s.titulo)}</h2>\n${mdAHtml(s.md)}`).join('\n')}
${p.pie ? `<div class="pie">${esc(p.pie)}</div>` : ''}
</body></html>`;
}

const celdaMd = (s: string) => s.replace(/\|/g, '/').replace(/\n/g, ' ');
const tablaMd = (cab: string[], filas: string[][]) => [cab, ...filas].map(f => `| ${f.map(celdaMd).join(' | ')} |`).join('\n');
const SI_NO: Record<string, string> = { si: 'Sí', no: 'No' };

/** The report of one attempt of one test: every field the pasted text asks a report to carry. */
export function informeEnsayo(e: Ensayo, i: Intento, n: number, fab: Fabricante, origen: string): PaginaExportable {
  const obligaciones = OBLIGACIONES.filter(o => o.huecos.some(h => h.ensayo === e.id));
  const fila = (c: Ensayo['campos'][number]) => {
    const v = (i.valores[c.id] ?? '').trim();
    const mostrado = c.tipo === 'sino' ? (SI_NO[v] ?? '—') : v ? `${v}${c.unidad ? ` ${c.unidad}` : ''}` : '—';
    return [c.etiqueta, mostrado];
  };
  const lista = (t: string) => t.trim() || '—';
  return {
    titulo: `Informe de ensayo ${e.codigo} · ${e.titulo}`,
    subtitulo: `${fab.razon || 'Fabricante por completar'} · ${fab.marca || ''} ${fab.modelo || ''}`.trim(),
    aviso: i.conclusion && i.firma ? undefined : 'Borrador sin firmar: no es un informe válido hasta que el responsable lo firme.',
    secciones: [
      { titulo: 'Identificación', md: tablaMd(['Dato', 'Valor'], [['Código del ensayo', `${e.codigo}, intento ${n}`], ['Fecha', i.fecha || '—'], ['Unidad ensayada', i.unidad || '—'], ['Norma y apartado', e.norma], ['Obligaciones que demuestra', obligaciones.map(o => `${o.id} ${o.titulo}`).join('; ') || '—']]) },
      { titulo: 'Objetivo', md: e.objetivo },
      { titulo: 'Configuración del vehículo y componentes', md: lista(i.configuracion) },
      { titulo: 'Instrumentos de medida', md: lista(i.instrumentos) },
      { titulo: 'Identificación y calibración de los instrumentos', md: lista(i.calibracion) },
      { titulo: 'Condiciones del ensayo', md: lista(i.condiciones) },
      { titulo: 'Procedimiento de ensayo (cómo se ha hecho)', md: lista(i.procedimiento) },
      { titulo: 'Criterio de aceptación', md: `${lista(i.criterio)}\n\n${e.criterioLegal ? 'La cifra de este criterio sale de la ley.' : 'La ley no da la cifra de este criterio: es el que adopta el responsable del ensayo.'}` },
      { titulo: 'Resultados medidos', md: tablaMd(['Resultado', 'Valor'], e.campos.map(fila)) },
      { titulo: 'Observaciones', md: lista(i.observaciones) },
      { titulo: 'Fotografías y evidencias', md: i.adjuntos.length ? i.adjuntos.map(a => `- [${a.nombre}](${origen}${a.url})`).join('\n') : 'Sin archivos adjuntos.' },
      { titulo: 'Conclusión', md: i.conclusion === 'conforme' ? '**CONFORME**' : i.conclusion === 'noConforme' ? '**NO CONFORME**' : pc0('conclusión') },
      { titulo: 'Firma del responsable', md: i.firma ? `${i.firma.nombre}, el ${i.firma.fecha}.` : pc0('firma del responsable') },
    ],
    pie: `Generado desde el expediente del ${fab.marca || 'ciclo'} ${fab.modelo || ''}. Los resultados son los anotados por el responsable del ensayo.`,
  };
}
const pc0 = (que: string) => `[por completar: ${que}]`;

export function descargarHtml(nombre: string, html: string) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `${nombre.replace(/[^\p{L}\p{N}._-]+/gu, '-')}.html`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
export function abrirHtml(html: string) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

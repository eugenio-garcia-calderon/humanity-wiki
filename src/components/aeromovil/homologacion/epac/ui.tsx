// Shared pieces of the pedal cycle's page (2026-11-24): the fold-away box, the progress bar, the verdict chips and the
// tiny text format the documents and the stored reference are written in (paragraphs, «- » bullets, «1. » lists,
// «| a | b |» tables, «## » headings, **bold**, *italic*, [text](https://…), and the amber `[por completar: …]` mark).
// `bloques()` parses it once; the page (`Texto`) and the downloadable HTML (`exportar.ts`) both draw from that.
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '../../../ui/core';
import { cn } from '../../../../utils/cn';
import { enlaceSeguro } from '../../proveedores/datos';

/** The sections of the pedal cycle's page, and how any of them sends the engineer to another (with the id of what to open). */
export type Seccion = 'resumen' | 'matriz' | 'ensayos' | 'documentos' | 'archivos' | 'normativa';
export type Ir = (s: Seccion, id?: string) => void;

/** A box closed by default: a title that opens its content (the page unfolds as it is tapped). */
export function Desplegable({ titulo, resumen, children, abierto, marca, derecha, className }: { titulo: React.ReactNode; resumen?: React.ReactNode; children: React.ReactNode; abierto?: boolean; marca?: React.ReactNode; derecha?: React.ReactNode; className?: string }) {
  const [a, setA] = useState(!!abierto);
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white', className)}>
      <Button variant="ghost" onClick={() => setA(v => !v)} aria-expanded={a}
        className="flex w-full items-start gap-2 p-2.5 text-left text-[13px] font-normal normal-case tracking-normal hover:bg-slate-50">
        {marca}
        <span className="min-w-0 flex-1"><span className="font-semibold text-slate-900">{titulo}</span>{resumen && <span className="mt-0.5 block text-slate-600">{resumen}</span>}</span>
        {derecha}
        <ChevronDown className={cn('mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform', a && 'rotate-180')} />
      </Button>
      {a && <div className="border-t border-slate-100 p-2.5 text-[13px] leading-relaxed text-slate-700">{children}</div>}
    </div>
  );
}

/** A percentage bar; red under 34, amber under 100, green at 100. */
export function Barra({ pct, className, etiqueta }: { pct: number; className?: string; etiqueta?: string }) {
  const color = pct >= 100 ? 'bg-emerald-500' : pct >= 34 ? 'bg-amber-500' : pct > 0 ? 'bg-rose-500' : 'bg-slate-300';
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={etiqueta} className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-200', className)}>
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }} />
    </div>
  );
}

export const COLOR_ESTADO: Record<string, string> = {
  pendiente: 'border-slate-300 bg-slate-50 text-slate-600',
  enCurso: 'border-amber-300 bg-amber-50 text-amber-900',
  hecho: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  noAplica: 'border-sky-300 bg-sky-50 text-sky-800',
  noConforme: 'border-rose-300 bg-rose-50 text-rose-800',
};
export const NOMBRE_ESTADO: Record<string, string> = { pendiente: 'Pendiente', enCurso: 'En curso', hecho: 'Hecho', noAplica: 'No aplica', noConforme: 'No conforme' };
export const Chip = ({ estado, children, className }: { estado: string; children?: React.ReactNode; className?: string }) => (
  <span className={cn('inline-block whitespace-nowrap rounded-full border px-1.5 text-[10px] font-bold uppercase', COLOR_ESTADO[estado], className)}>{children ?? NOMBRE_ESTADO[estado]}</span>
);

/** The weight as dots: ●●● cannot be skipped, ●●○ important, ●○○ complementary. */
export const Peso = ({ peso }: { peso: 1 | 2 | 3 }) => (
  <span className="whitespace-nowrap font-mono text-[11px] tracking-tighter text-slate-700" title={peso === 3 ? 'Imprescindible: sin esto no se puede vender' : peso === 2 ? 'Importante' : 'Complementario'} aria-label={`Peso ${peso} de 3`}>
    {'●'.repeat(peso)}<span className="text-slate-300">{'●'.repeat(3 - peso)}</span>
  </span>
);

// ───────────────────────────────────────────────────────────── the text format
export type Bloque =
  | { t: 'h'; x: string }
  | { t: 'p'; x: string }
  | { t: 'ul'; xs: string[] }
  | { t: 'ol'; xs: string[] }
  | { t: 'tabla'; cab: string[]; filas: string[][] };

const celdas = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

export function bloques(md: string): Bloque[] {
  const out: Bloque[] = [];
  let p: string[] = [], ul: string[] = [], ol: string[] = [], tb: string[][] = [];
  const cierra = () => {
    if (p.length) out.push({ t: 'p', x: p.join('\n') }); if (ul.length) out.push({ t: 'ul', xs: ul }); if (ol.length) out.push({ t: 'ol', xs: ol });
    if (tb.length) { const filas = tb.filter(r => !r.every(c => /^:?-{2,}:?$/.test(c))); out.push({ t: 'tabla', cab: filas[0] ?? [], filas: filas.slice(1) }); }
    p = []; ul = []; ol = []; tb = [];
  };
  for (const l of md.replace(/\r/g, '').split('\n')) {
    const t = l.trim();
    if (!t) { cierra(); continue; }
    if (/^#{1,3}\s/.test(t)) { cierra(); out.push({ t: 'h', x: t.replace(/^#{1,3}\s+/, '').replace(/\*\*/g, '') }); continue; }
    if (t.startsWith('|')) { if (p.length || ul.length || ol.length) cierra(); tb.push(celdas(t)); continue; }
    if (/^[-•]\s/.test(t)) { if (p.length || ol.length || tb.length) cierra(); ul.push(t.replace(/^[-•]\s+/, '')); continue; }
    if (/^\d+\.\s/.test(t)) { if (p.length || ul.length || tb.length) cierra(); ol.push(t.replace(/^\d+\.\s+/, '')); continue; }
    if (ul.length || ol.length || tb.length) cierra();
    p.push(t);
  }
  cierra();
  return out;
}

/** Inline pieces: **bold**, *italic*, [text](https://link), [por completar: …]. Anything else is plain text. */
export type Trozo = { k: 'txt' | 'b' | 'i' | 'pc'; x: string } | { k: 'a'; x: string; url: string };
const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|\[por completar:[^\]]*\]|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
export function trozos(s: string): Trozo[] {
  return s.split(INLINE).filter(Boolean).map((x): Trozo => {
    if (x.startsWith('**') && x.endsWith('**') && x.length > 4) return { k: 'b', x: x.slice(2, -2) };
    if (x.startsWith('*') && x.endsWith('*') && x.length > 2) return { k: 'i', x: x.slice(1, -1) };
    if (/^\[por completar:/i.test(x)) return { k: 'pc', x };
    const m = x.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (m) { const url = enlaceSeguro(m[2]); if (url) return { k: 'a', x: m[1], url }; }
    return { k: 'txt', x };
  });
}

export function Inline({ s }: { s: string }) {
  return <>{trozos(s).map((t, i) => t.k === 'b' ? <strong key={i}>{t.x}</strong> : t.k === 'i' ? <em key={i}>{t.x}</em>
    : t.k === 'pc' ? <mark key={i} className="rounded bg-amber-100 px-1 text-amber-900">{t.x}</mark>
    : t.k === 'a' ? <a key={i} href={t.url} target="_blank" rel="noreferrer" className="text-teal-700 underline">{t.x}</a> : <span key={i}>{t.x}</span>)}</>;
}

export function Texto({ md, className }: { md: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2 text-[13px] leading-relaxed text-slate-800', className)}>
      {bloques(md).map((b, i) => b.t === 'h' ? <h4 key={i} className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{b.x}</h4>
        : b.t === 'p' ? <p key={i} className="whitespace-pre-line"><Inline s={b.x} /></p>
        : b.t === 'ul' ? <ul key={i} className="list-disc pl-5">{b.xs.map((x, j) => <li key={j}><Inline s={x} /></li>)}</ul>
        : b.t === 'ol' ? <ol key={i} className="list-decimal pl-5">{b.xs.map((x, j) => <li key={j}><Inline s={x} /></li>)}</ol>
        : (
          <div key={i} className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[28rem] border-collapse text-left text-xs">
              <thead className="bg-slate-100"><tr>{b.cab.map((c, j) => <th key={j} className="px-2 py-1 font-semibold text-slate-700"><Inline s={c} /></th>)}</tr></thead>
              <tbody>{b.filas.map((f, j) => <tr key={j} className="border-t border-slate-100 align-top">{f.map((c, k) => <td key={k} className="px-2 py-1"><Inline s={c} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        ))}
    </div>
  );
}

export const hoyIso = () => new Date().toISOString().slice(0, 10);
export const hoyLargo = () => new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
export const fechaCorta = (iso?: string) => { if (!iso) return '—'; const d = new Date(iso); return isNaN(+d) ? iso : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }); };
export const idNuevo = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** A labelled text box for what the engineer writes (how a test was done, the text of a section…). */
export function Area({ etiqueta, valor, alCambiar, filas = 3, ayuda, disabled, max = 3000, className }: { etiqueta: string; valor: string; alCambiar: (v: string) => void; filas?: number; ayuda?: React.ReactNode; disabled?: boolean; max?: number; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-0.5 text-xs font-semibold text-slate-700', className)}>
      {etiqueta}
      <textarea value={valor} rows={filas} maxLength={max} disabled={disabled} onChange={e => alCambiar(e.target.value)}
        className="resize-y rounded-md border border-slate-300 px-2 py-1.5 text-[13px] font-normal leading-relaxed text-slate-900 disabled:bg-slate-50 disabled:text-slate-700" />
      {ayuda && <span className="text-[11px] font-normal text-slate-500">{ayuda}</span>}
    </label>
  );
}

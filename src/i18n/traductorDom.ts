// ============================================================================
// LO ESCRITO EN EL CÓDIGO, EN EL DOMINIO TRADUCIDO (2026-11-10, regla 11 de la Constitución)
// ============================================================================
// Botones, formularios y esquemas llevan su texto en español dentro del programa. En el dominio
// traducido, este vigilante cambia cada texto por el suyo antes de que se pinte (los
// `MutationObserver` corren antes del pintado). Lo que aún no tiene traducción se avisa al servidor
// y entra en la lista de tareas. El contenido de las páginas ya llega traducido del servidor.

const ATRIBUTOS = ['placeholder', 'aria-label', 'title', 'alt'];
const PARECE_ESPANOL = /[áéíóúñ¿¡]|\b(de|la|el|los|las|en|para|con|del|una?|que|tu|más|por|al)\b/i;

export function iniciarTraductorDom() {
  const w = window as any;
  const d: Record<string, string> | undefined = w.__TRADUCCIONES__;
  if (!d) return;
  const valores = new Set(Object.values(d));
  const faltan = new Set<string>();
  let temporizador = 0;
  const avisar = () => {
    temporizador = 0;
    const textos = [...faltan].slice(0, 40);
    faltan.clear();
    if (textos.length) navigator.sendBeacon?.('/api/traducciones/faltan', new Blob([JSON.stringify({ textos, camino: location.pathname })], { type: 'application/json' }));
  };
  const nota = (t: string) => {
    if (t.length > 300 || !PARECE_ESPANOL.test(t) || valores.has(t)) return;
    faltan.add(t);
    if (!temporizador) temporizador = window.setTimeout(avisar, 4000);
  };
  const excluido = (e: Element | null) => !e || !!e.closest('script,style,textarea,input,[contenteditable="true"],[data-no-traducir],[data-tipo],article p,article li');
  const cambiar = (s: string, mirar: boolean): string | null => {
    const t = s.trim();
    if (!t) return null;
    const v = d[t];
    if (v !== undefined) return v === t ? null : s.replace(t, () => v);
    if (mirar) nota(t);
    return null;
  };
  const textoDe = (n: Text) => {
    const p = n.parentElement;
    const excl = excluido(p);
    const c = cambiar(n.nodeValue || '', !excl);
    if (c !== null && !p?.closest('textarea,input,script,style')) n.nodeValue = c;
  };
  const elementoDe = (e: Element) => {
    for (const a of ATRIBUTOS) {
      const v = e.getAttribute(a);
      if (!v) continue;
      const c = cambiar(v, false);
      if (c !== null) e.setAttribute(a, c);
    }
  };
  const recorrer = (raiz: Node) => {
    if (raiz.nodeType === Node.TEXT_NODE) { textoDe(raiz as Text); return; }
    if (raiz.nodeType !== Node.ELEMENT_NODE) return;
    elementoDe(raiz as Element);
    const it = document.createTreeWalker(raiz, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    while (it.nextNode()) { const n = it.currentNode; if (n.nodeType === Node.TEXT_NODE) textoDe(n as Text); else elementoDe(n as Element); }
  };
  new MutationObserver(lista => {
    for (const m of lista) {
      if (m.type === 'characterData') textoDe(m.target as Text);
      else if (m.type === 'attributes') elementoDe(m.target as Element);
      else m.addedNodes.forEach(recorrer);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS });
  if (document.body) recorrer(document.body);
}

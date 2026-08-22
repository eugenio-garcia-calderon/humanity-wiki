// ============================================================================
// TABLAS · FASE 6 y 7 — FÓRMULAS Y CONDICIONES
// ============================================================================
// Un intérprete completo: analizador, evaluador y funciones. Se escribe entero
// y no se trae una librería porque una fórmula que se evalúa con `eval` es un
// agujero por el que se ejecuta código ajeno en nuestro servidor, y las
// librerías de expresiones generales traen mucho más de lo que hace falta.
//
// ── LA REGLA QUE MANDA SOBRE TODAS LAS DEMÁS ────────────────────────────────
// LOS CUATRO ESTADOS DE CELDA SOBREVIVEN A TODOS LOS OPERADORES.
//
//   vacío + 10        = 10        (sumar ignora lo que no hay)
//   vacío * 10        = vacío     (multiplicar por nada no da nada)
//   10 / 0            = error     (y lo dice, no da infinito ni cero)
//   error + lo que sea= error     (un error se propaga, no se traga)
//
// Ésa es la diferencia entre esto y una hoja de cálculo que rellena huecos con
// ceros: aquí un total que salió de datos incompletos NO puede disfrazarse de
// número correcto. Es la regla de la casa —todo tiene que poder decir «no lo
// sé»— llevada al sitio donde más fácil es romperla sin que se note.
//
// ── LA SINTAXIS ─────────────────────────────────────────────────────────────
//   {Nombre de columna}          una celda de esta misma fila
//   + - * / %  ( )               aritmética
//   = <> < <= > >=               comparación
//   & 						                concatenar texto
//   SI(cond; entonces; si_no)    condicional
//   Y(...) O(...) NO(...)        lógica
//   SUMA MEDIA MIN MAX REDONDEAR ABS ...
//
// El separador es `;` y no `,` porque aquí el decimal es la coma: `SUMA(1,5; 2)`
// tiene que poder significar «uno coma cinco, y dos».
import { type Celda, VACIA, valor, error } from './celdas';

// ── ANALIZADOR ──────────────────────────────────────────────────────────────

type Tk =
  | { t: 'num'; v: number } | { t: 'txt'; v: string } | { t: 'col'; v: string }
  | { t: 'fn'; v: string } | { t: 'op'; v: string } | { t: 'par'; v: '(' | ')' }
  | { t: 'sep' };

function analizar(entrada: string): Tk[] | string {
  const tks: Tk[] = [];
  let i = 0;
  const s = entrada;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }

    // {Columna}
    if (c === '{') {
      const fin = s.indexOf('}', i);
      if (fin < 0) return 'Falta cerrar una llave «}».';
      tks.push({ t: 'col', v: s.slice(i + 1, fin).trim() });
      i = fin + 1; continue;
    }
    // "texto"
    if (c === '"') {
      const fin = s.indexOf('"', i + 1);
      if (fin < 0) return 'Falta cerrar unas comillas.';
      tks.push({ t: 'txt', v: s.slice(i + 1, fin) });
      i = fin + 1; continue;
    }
    // número: acepta coma decimal
    if (/[0-9]/.test(c)) {
      const m = /^[0-9]+([.,][0-9]+)?/.exec(s.slice(i))!;
      tks.push({ t: 'num', v: Number(m[0].replace(',', '.')) });
      i += m[0].length; continue;
    }
    // operadores de dos caracteres primero: <= >= <>
    const dos = s.slice(i, i + 2);
    if (['<=', '>=', '<>'].includes(dos)) { tks.push({ t: 'op', v: dos }); i += 2; continue; }
    if ('+-*/%&=<>'.includes(c)) { tks.push({ t: 'op', v: c }); i++; continue; }
    if (c === '(') { tks.push({ t: 'par', v: '(' }); i++; continue; }
    if (c === ')') { tks.push({ t: 'par', v: ')' }); i++; continue; }
    if (c === ';') { tks.push({ t: 'sep' }); i++; continue; }
    // Nombre de función. El PUNTO forma parte del nombre —`SI.ERROR`,
    // `ESTA.VACIO`— y por eso va en la expresión: sin él, el analizador partía
    // `SI.ERROR` en «SI», un punto suelto y «ERROR», y se quejaba del punto.
    // Se exige que el punto vaya seguido de letra para no confundirlo con un
    // decimal mal escrito.
    if (/[A-Za-zÁÉÍÓÚÑáéíóúñ_]/.test(c)) {
      const m = /^[A-Za-zÁÉÍÓÚÑáéíóúñ_0-9]+(\.[A-Za-zÁÉÍÓÚÑáéíóúñ_][A-Za-zÁÉÍÓÚÑáéíóúñ_0-9]*)*/.exec(s.slice(i))!;
      tks.push({ t: 'fn', v: m[0].toUpperCase() });
      i += m[0].length; continue;
    }
    return `No entiendo el carácter «${c}».`;
  }
  return tks;
}

// ── ÁRBOL ───────────────────────────────────────────────────────────────────

type Nodo =
  | { n: 'num'; v: number } | { n: 'txt'; v: string } | { n: 'col'; v: string }
  | { n: 'bin'; op: string; a: Nodo; b: Nodo }
  | { n: 'neg'; a: Nodo }
  | { n: 'fn'; nombre: string; args: Nodo[] };

/** Precedencia: comparar < concatenar < sumar < multiplicar. */
const PRECEDENCIA: Record<string, number> = {
  '=': 1, '<>': 1, '<': 1, '<=': 1, '>': 1, '>=': 1,
  '&': 2,
  '+': 3, '-': 3,
  '*': 4, '/': 4, '%': 4,
};

function construir(tks: Tk[]): { nodo: Nodo; columnas: string[] } | string {
  let p = 0;
  const columnas: string[] = [];
  let fallo: string | null = null;

  const mirar = () => tks[p];
  const comer = () => tks[p++];

  function expr(minPrec = 0): Nodo {
    let izq = unario();
    while (!fallo) {
      const t = mirar();
      if (!t || t.t !== 'op' || !PRECEDENCIA[t.v] || PRECEDENCIA[t.v] < minPrec) break;
      const op = (comer() as any).v as string;
      const der = expr(PRECEDENCIA[op] + 1);
      izq = { n: 'bin', op, a: izq, b: der };
    }
    return izq;
  }

  function unario(): Nodo {
    const t = mirar();
    if (t && t.t === 'op' && t.v === '-') { comer(); return { n: 'neg', a: unario() }; }
    return primario();
  }

  function primario(): Nodo {
    const t = comer();
    if (!t) { fallo = fallo || 'La fórmula está incompleta.'; return { n: 'num', v: 0 }; }
    if (t.t === 'num') return { n: 'num', v: t.v };
    if (t.t === 'txt') return { n: 'txt', v: t.v };
    if (t.t === 'col') { columnas.push(t.v); return { n: 'col', v: t.v }; }
    if (t.t === 'par' && t.v === '(') {
      const dentro = expr(0);
      const cierre = comer();
      if (!cierre || cierre.t !== 'par' || cierre.v !== ')') fallo = fallo || 'Falta un paréntesis de cierre.';
      return dentro;
    }
    if (t.t === 'fn') {
      const abre = mirar();
      if (!abre || abre.t !== 'par' || abre.v !== '(') {
        fallo = fallo || `A «${t.v}» le falta el paréntesis de apertura.`;
        return { n: 'num', v: 0 };
      }
      comer();
      const args: Nodo[] = [];
      if (mirar() && (mirar() as any).t === 'par' && (mirar() as any).v === ')') comer();
      else {
        for (;;) {
          args.push(expr(0));
          const sig = comer();
          if (!sig) { fallo = fallo || `A «${t.v}» le falta el paréntesis de cierre.`; break; }
          if (sig.t === 'sep') continue;
          if (sig.t === 'par' && sig.v === ')') break;
          fallo = fallo || `En «${t.v}» esperaba «;» o «)».`;
          break;
        }
      }
      return { n: 'fn', nombre: t.v, args };
    }
    fallo = fallo || 'No entiendo esa parte de la fórmula.';
    return { n: 'num', v: 0 };
  }

  const nodo = expr(0);
  if (fallo) return fallo;
  if (p < tks.length) return 'Sobra algo al final de la fórmula.';
  return { nodo, columnas };
}

/** Analiza una fórmula. Devuelve el árbol y de qué columnas depende —eso último
 *  es lo que la fase 8 necesita para saber en qué orden calcular. */
export function compilar(texto: string): { nodo: Nodo; columnas: string[] } | { error: string } {
  const tks = analizar(String(texto || ''));
  if (typeof tks === 'string') return { error: tks };
  if (!tks.length) return { error: 'La fórmula está vacía.' };
  const r = construir(tks);
  if (typeof r === 'string') return { error: r };
  return r;
}

// ── EVALUADOR ───────────────────────────────────────────────────────────────

const num = (c: Celda): number | null =>
  c.estado === 'ok' ? (typeof c.valor === 'number' ? c.valor : typeof c.valor === 'boolean' ? (c.valor ? 1 : 0) : null) : null;

const txt = (c: Celda): string =>
  c.estado === 'ok' ? (Array.isArray(c.valor) ? c.valor.join(', ') : String(c.valor)) : '';

const verdad = (c: Celda): boolean | null => {
  if (c.estado !== 'ok') return null;
  if (typeof c.valor === 'boolean') return c.valor;
  if (typeof c.valor === 'number') return c.valor !== 0;
  if (typeof c.valor === 'string') return c.valor.length > 0;
  return null;
};

/** El primer error que aparezca entre unas celdas, si lo hay.
 *  Un error NUNCA se traga: se propaga hasta arriba y llega a la pantalla. */
const primerError = (cs: Celda[]): Celda | null => cs.find(c => c.estado === 'error') || null;

export type Contexto = {
  /** El valor de cada columna de ESTA fila, ya calculado. */
  celdas: Record<string, Celda>;
  /** Nombre de columna → id. Las fórmulas se escriben con nombres y se guardan
   *  con nombres, pero se resuelven contra ids: así renombrar una columna sigue
   *  funcionando si se actualiza el nombre en la fórmula, y sobre todo NO se
   *  puede confundir con otra columna que se llame igual. */
  porNombre: Record<string, string>;
};

/** La marca que ocupa el sitio de un id cuando DOS columnas comparten nombre.
 *  No es un id válido a propósito: cualquier sitio que la trate como tal fallará
 *  a la vista en vez de calcular con la columna equivocada. */
export const AMBIGUO = '__AMBIGUO__';

export function evaluar(nodo: Nodo, ctx: Contexto): Celda {
  switch (nodo.n) {
    case 'num': return valor(nodo.v);
    case 'txt': return valor(nodo.v);

    case 'col': {
      const id = ctx.porNombre[nodo.v.toLowerCase()];
      // DOS COLUMNAS CON ESE NOMBRE: no se elige una. Ver `calculo.ts`.
      if (id === AMBIGUO) {
        return error(`Hay más de una columna que se llama «${nodo.v}»: cámbiale el nombre a una para saber a cuál te refieres.`);
      }
      // Una columna que no existe es un ERROR, no un vacío. Tratarla como vacía
      // haría que una fórmula con el nombre mal escrito diera un resultado
      // creíble en vez de avisar.
      if (!id) return error(`No hay ninguna columna que se llame «${nodo.v}».`);
      return ctx.celdas[id] ?? VACIA;
    }

    case 'neg': {
      const a = evaluar(nodo.a, ctx);
      const e = primerError([a]); if (e) return e;
      const n = num(a);
      return n === null ? VACIA : valor(-n);
    }

    case 'bin': {
      const a = evaluar(nodo.a, ctx);
      const b = evaluar(nodo.b, ctx);
      const e = primerError([a, b]); if (e) return e;
      return binaria(nodo.op, a, b);
    }

    case 'fn': return funcion(nodo.nombre, nodo.args, ctx);
  }
}

function binaria(op: string, a: Celda, b: Celda): Celda {
  // Comparar y concatenar tratan el vacío como vacío, no como cero.
  if (op === '&') return valor(txt(a) + txt(b));

  if (['=', '<>', '<', '<=', '>', '>='].includes(op)) {
    // Comparar con un vacío da vacío, no falso: «¿está esto por encima del
    // umbral?» sin dato no es «no», es «no se sabe». Devolver falso sería
    // afirmar algo que nadie ha comprobado.
    if (a.estado !== 'ok' || b.estado !== 'ok') return VACIA;
    const na = num(a), nb = num(b);
    const [x, y] = na !== null && nb !== null ? [na, nb] : [txt(a), txt(b)] as any;
    switch (op) {
      case '=':  return valor(x === y);
      case '<>': return valor(x !== y);
      case '<':  return valor(x < y);
      case '<=': return valor(x <= y);
      case '>':  return valor(x > y);
      case '>=': return valor(x >= y);
    }
  }

  const na = num(a), nb = num(b);

  // SUMAR Y RESTAR IGNORAN LOS HUECOS; MULTIPLICAR Y DIVIDIR NO.
  // No es una inconsistencia: sumar es acumular lo que hay, y un hueco no
  // aporta. Multiplicar por «no se sabe» sí destruye el resultado, así que el
  // resultado tiene que decir que no se sabe.
  if (op === '+' || op === '-') {
    if (na === null && nb === null) return VACIA;
    const x = na ?? 0, y = nb ?? 0;
    return valor(op === '+' ? x + y : x - y);
  }

  if (na === null || nb === null) return VACIA;

  switch (op) {
    case '*': return valor(Number((na * nb).toFixed(10)));
    case '/':
      // Dividir entre cero DICE que no se puede. No devuelve cero, ni
      // infinito, ni vacío: los tres se confundirían con un resultado.
      if (nb === 0) return error('No se puede dividir entre cero.');
      return valor(Number((na / nb).toFixed(10)));
    case '%':
      if (nb === 0) return error('No se puede sacar el resto entre cero.');
      return valor(na % nb);
  }
  return error(`Operador desconocido: ${op}`);
}

function funcion(nombre: string, args: Nodo[], ctx: Contexto): Celda {
  const ev = (n: Nodo) => evaluar(n, ctx);

  // SI se evalúa PEREZOSAMENTE: solo la rama que toca. Así
  // `SI({Divisor}=0; "sin datos"; {Total}/{Divisor})` no revienta cuando el
  // divisor es cero — que es justo para lo que se usa.
  if (nombre === 'SI') {
    if (args.length < 2) return error('SI necesita al menos condición y resultado.');
    const cond = ev(args[0]);
    if (cond.estado === 'error') return cond;
    const v = verdad(cond);
    if (v === null) return args.length > 2 ? ev(args[2]) : VACIA;
    return v ? ev(args[1]) : (args.length > 2 ? ev(args[2]) : VACIA);
  }

  if (nombre === 'Y' || nombre === 'O') {
    const cs = args.map(ev);
    const e = primerError(cs); if (e) return e;
    const vs = cs.map(verdad).filter((x): x is boolean => x !== null);
    if (!vs.length) return VACIA;
    return valor(nombre === 'Y' ? vs.every(Boolean) : vs.some(Boolean));
  }
  if (nombre === 'NO') {
    const c = ev(args[0]);
    if (c.estado === 'error') return c;
    const v = verdad(c);
    return v === null ? VACIA : valor(!v);
  }

  // SI.ERROR y SI.VACIO: la forma de dar un valor por defecto A PROPÓSITO.
  // Existen para que rellenar huecos sea una decisión visible de quien escribe
  // la fórmula, y no algo que el motor haga por su cuenta.
  if (nombre === 'SI.ERROR') {
    const c = ev(args[0]);
    return c.estado === 'error' ? (args[1] ? ev(args[1]) : VACIA) : c;
  }
  if (nombre === 'SI.VACIO') {
    const c = ev(args[0]);
    return c.estado === 'vacia' ? (args[1] ? ev(args[1]) : VACIA) : c;
  }

  const cs = args.map(ev);
  const e = primerError(cs); if (e) return e;
  const nums = cs.map(num).filter((n): n is number => n !== null);
  const red = (n: number) => Number(n.toFixed(10));

  switch (nombre) {
    case 'SUMA':  return nums.length ? valor(red(nums.reduce((a, b) => a + b, 0))) : VACIA;
    case 'MEDIA': return nums.length ? valor(red(nums.reduce((a, b) => a + b, 0) / nums.length)) : VACIA;
    case 'MIN':   return nums.length ? valor(Math.min(...nums)) : VACIA;
    case 'MAX':   return nums.length ? valor(Math.max(...nums)) : VACIA;
    case 'CONTAR': return valor(nums.length);
    case 'ABS':   return nums.length ? valor(Math.abs(nums[0])) : VACIA;
    case 'RAIZ':
      if (!nums.length) return VACIA;
      if (nums[0] < 0) return error('No se puede sacar la raíz de un número negativo.');
      return valor(red(Math.sqrt(nums[0])));
    case 'REDONDEAR': {
      if (!nums.length) return VACIA;
      const dec = nums.length > 1 ? Math.min(Math.max(Math.round(nums[1]), 0), 10) : 0;
      return valor(Number(nums[0].toFixed(dec)));
    }
    case 'TECHO':  return nums.length ? valor(Math.ceil(nums[0])) : VACIA;
    case 'SUELO':  return nums.length ? valor(Math.floor(nums[0])) : VACIA;
    case 'POTENCIA': return nums.length > 1 ? valor(red(Math.pow(nums[0], nums[1]))) : VACIA;

    case 'CONCATENAR': return valor(cs.map(txt).join(''));
    case 'MAYUSCULAS': return cs[0]?.estado === 'ok' ? valor(txt(cs[0]).toUpperCase()) : VACIA;
    case 'MINUSCULAS': return cs[0]?.estado === 'ok' ? valor(txt(cs[0]).toLowerCase()) : VACIA;
    case 'LARGO':      return cs[0]?.estado === 'ok' ? valor(txt(cs[0]).length) : VACIA;
    case 'CONTIENE':
      if (cs.length < 2 || cs[0].estado !== 'ok' || cs[1].estado !== 'ok') return VACIA;
      return valor(txt(cs[0]).toLowerCase().includes(txt(cs[1]).toLowerCase()));

    case 'ESTA.VACIO': return valor(cs[0] ? cs[0].estado === 'vacia' : true);
    case 'HOY':        return valor(new Date().toISOString().slice(0, 10));

    case 'DIAS': {
      // Días entre dos fechas. Si falta cualquiera de las dos, vacío: la
      // alternativa sería contar los días desde el año cero.
      if (cs.length < 2 || cs[0].estado !== 'ok' || cs[1].estado !== 'ok') return VACIA;
      const a = Date.parse(`${txt(cs[0])}T00:00:00Z`), b = Date.parse(`${txt(cs[1])}T00:00:00Z`);
      if (Number.isNaN(a) || Number.isNaN(b)) return error('DIAS necesita dos fechas.');
      return valor(Math.round((a - b) / 86400000));
    }

    default:
      return error(`No conozco la función «${nombre}».`);
  }
}

/** Compila y evalúa de una vez. Para una sola fila. */
export function calcular(texto: string, ctx: Contexto): Celda {
  const c = compilar(texto);
  if ('error' in c) return error(c.error);
  return evaluar(c.nodo, ctx);
}

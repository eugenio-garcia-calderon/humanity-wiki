"""
capas_a_ts.py -- write src/data/calendarioArteCapas.ts from the capas.json files.

The web needs to know, without waiting for a request, which illustrations exist
as separate elements and where each element sits: the print copy collects its
<img> 50 ms after it is drawn, so a manifest fetched over the network would
arrive too late and the PDF would come out without the movable elements.

Run after regenerating any illustration with a capas folder:
    python3 design/calendario-arte/generadores/diseno4/capas_a_ts.py
"""
import glob
import hashlib
import json
import os

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
CAPAS = os.path.join(RAIZ, 'public', 'calendario-arte', 'capas')
SALIDA = os.path.join(RAIZ, 'src', 'data', 'calendarioArteCapas.ts')


def con_version(carpeta, nombre):
    """`satelite.webp?v=1a2b3c4d`: the address changes when the drawing does.
    The positions travel inside the web bundle and arrive with the deploy; the
    pictures are files that the browser and Cloudflare keep for hours. Redrawn
    under the same name, the new box would be filled with the old picture."""
    h = hashlib.md5(open(os.path.join(carpeta, nombre), 'rb').read()).hexdigest()[:8]
    return f'{nombre}?v={h}'


manifiestos = {}
for f in sorted(glob.glob(os.path.join(CAPAS, '*', 'capas.json'))):
    carpeta = os.path.dirname(f)
    clave = os.path.basename(carpeta)
    m = json.load(open(f))
    m['fondo'] = con_version(carpeta, m['fondo'])
    for c in m['capas']:
        c['src'] = con_version(carpeta, c['src'])
    manifiestos[clave] = m

cuerpo = json.dumps(manifiestos, ensure_ascii=False, indent=2)
ts = f'''// GENERADO por design/calendario-arte/generadores/diseno4/capas_a_ts.py -- no editar a mano.
//
// Las ilustraciones que existen también como elementos sueltos (2026-11-12,
// Eugenio: «que cada elemento de la ilustración se pueda pinchar y arrastrar…
// y agrandar o hacer más pequeño»). Cada una vive en
// /calendario-arte/capas/<clave>/: el papel (fondo) y un WebP con transparencia
// por elemento. x, y, w, h son fracciones de la hoja; el orden es el de pintado
// (el primero, el más al fondo).

export interface CapaIlustracion {{ id: string; nombre: string; src: string; x: number; y: number; w: number; h: number }}
export interface ManifiestoCapas {{ ancho: number; alto: number; fondo: string; capas: CapaIlustracion[] }}

export const CAPAS_ILUSTRACIONES: Record<string, ManifiestoCapas> = {cuerpo};

/** La clave («mes-06-d») de una ilustración que tiene elementos sueltos, o null. */
export function claveCapas(url?: string | null): string | null {{
  const m = url?.match(/\\/(mes-\\d{{2}}(?:-[a-z])?)\\.(?:jpe?g|png|webp)$/);
  return m && CAPAS_ILUSTRACIONES[m[1]] ? m[1] : null;
}}

export const carpetaCapas = (clave: string) => `/calendario-arte/capas/${{clave}}/`;
'''
open(SALIDA, 'w').write(ts)
print(f'{len(manifiestos)} ilustraciones con capas -> {SALIDA}')

#!/usr/bin/env python3
"""
LA CONSTELACIÓN: AGRUPAR LAS PIEZAS POR LO QUE DICEN (2026-08-25)
================================================================

Eugenio: «que esa página tenga inteligencia en cuanto a cómo ordenar las
publicaciones, categorizándolas en función de lo que hablen […] esto es como una
red neuronal de conocimiento, tiene que estar todo interconectado […] si hay dos
vídeos que hablan de algo muy parecido o son un tipo de vídeo, deberían estar en
un cluster».

── EL ÁRBOL DICE DÓNDE ESTÁ; ESTO DICE A QUÉ SE PARECE ──────────────────────
Son dos ejes distintos. `subtemas` archiva una pieza en un sitio; aquí se mide
qué piezas se parecen entre sí, que es una relación de todas contra todas y no
cabe en un árbol. Las aristas de esa segunda relación son la «red» que pide.

── SE CALCULA AQUÍ Y SE GUARDA, NO SE CALCULA AL PINTAR ─────────────────────
Un vector por pieza, una posición y un grupo. La pantalla sólo lee columnas. Si
esto se hiciera al abrir la página, cada visita costaría 64 llamadas a un modelo
y medio segundo de matemáticas para enseñar exactamente lo mismo que ayer.

── LO QUE MEDÍ ANTES DE ELEGIR EL MODELO ────────────────────────────────────
`gemini-embedding-001`, 768 dimensiones, con la clave que ya está en el `.env`.
Cruza idiomas, que aquí es lo que decide: la colección es casi toda en inglés y
la plataforma es española.

    «reparto urbano en bici» (es) ↔ «DHL cargo bike delivering» (en)  0,72
    esa misma ↔ un texto sobre incendios de batería                   0,47

Y un aviso que me tragué yo: en una primera prueba ordené los vectores por el
md5 del fichero donde los guardé, comparé los que no eran y estuve a punto de
concluir que los embeddings no distinguían nada. **El número era correcto; la
pareja, no.**

    python3 scripts/agregador/constelacion.py > drizzle/0126_constelacion.sql
"""
import json, math, os, re, subprocess, sys, urllib.request
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))


def clave_gemini() -> str:
    for linea in open(os.path.join(RAIZ, '.env'), encoding='utf-8'):
        if linea.startswith('GEMINI_API_KEY='):
            return linea.split('=', 1)[1].strip().strip('"\'')
    sys.exit('Sin GEMINI_API_KEY en el .env')


K = clave_gemini()


def psql(sql: str) -> list[list[str]]:
    r = subprocess.run(['psql', '-h', 'localhost', '-U', 'eugenio', '-d', 'evolucion_humanidad',
                        '-t', '-A', '-F', '\x1f', '-c', sql],
                       capture_output=True, text=True, check=True)
    return [l.split('\x1f') for l in r.stdout.strip().split('\n') if l.strip()]


def embed(textos: list[str]) -> np.ndarray:
    """Un vector por texto. De uno en uno: la API por lotes pide otro formato y
    con 64 piezas la diferencia es de segundos, no de minutos.

    Se guardan en disco por el texto exacto. La primera vez que esto falló fue
    DESPUÉS de calcular los 64 —por el nombre de otro modelo, en el paso
    siguiente— y volver a lanzarlo los recalculaba todos para nada."""
    import hashlib
    cache_f = os.path.join(AQUI, '.vectores.json')
    cache = json.load(open(cache_f)) if os.path.exists(cache_f) else {}
    fuera = []
    for i, t in enumerate(textos):
        h = hashlib.sha1(t.encode()).hexdigest()
        if h in cache:
            fuera.append(cache[h])
            print(f'\r  vectores {i + 1}/{len(textos)} (guardado)', end='', file=sys.stderr)
            continue
        cuerpo = json.dumps({
            'model': 'models/gemini-embedding-001',
            'content': {'parts': [{'text': t[:2000]}]},
            'outputDimensionality': 768,
        }).encode()
        req = urllib.request.Request(
            f'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={K}',
            data=cuerpo, headers={'Content-Type': 'application/json'})
        d = json.load(urllib.request.urlopen(req, timeout=60))
        cache[h] = d['embedding']['values']
        fuera.append(cache[h])
        print(f'\r  vectores {i + 1}/{len(textos)}', end='', file=sys.stderr)
    print(file=sys.stderr)
    json.dump(cache, open(cache_f, 'w'))
    v = np.array(fuera, dtype=np.float64)
    # Normalizados: así el coseno es un producto escalar y k-means por distancia
    # euclídea agrupa por ángulo, que es lo que significa «parecido» aquí.
    return v / np.linalg.norm(v, axis=1, keepdims=True)


def kmeans(v: np.ndarray, k: int, semilla: int = 7, vueltas: int = 60):
    """k-means++ sencillo. Determinista a propósito: la misma colección tiene
    que dar los mismos grupos cada vez que esto se ejecute, o el mapa se
    reordenaría solo entre despliegues y nadie entendería por qué."""
    rng = np.random.default_rng(semilla)
    centros = [v[rng.integers(len(v))]]
    for _ in range(k - 1):
        d = np.min([[1 - c @ x for x in v] for c in centros], axis=0) ** 2
        centros.append(v[rng.choice(len(v), p=d / d.sum())])
    centros = np.array(centros)
    for _ in range(vueltas):
        asig = np.argmax(v @ centros.T, axis=1)
        nuevos = np.array([v[asig == i].mean(axis=0) if (asig == i).any() else centros[i]
                           for i in range(k)])
        nuevos /= np.linalg.norm(nuevos, axis=1, keepdims=True)
        if np.allclose(nuevos, centros):
            break
        centros = nuevos
    return np.argmax(v @ centros.T, axis=1), centros


def dos_dimensiones(v: np.ndarray) -> np.ndarray:
    """768 dimensiones a 2, por PCA.

    No es t-SNE ni UMAP y es a propósito: PCA es **lineal y determinista**, así
    que dos piezas que salen juntas en el mapa están juntas de verdad y no por
    cómo empezó un azar. Se pierde detalle; se gana que el mapa signifique lo
    mismo mañana."""
    c = v - v.mean(axis=0)
    _, _, vt = np.linalg.svd(c, full_matrices=False)
    xy = c @ vt[:2].T
    # A un cuadrado de 0..100, que es lo que la pantalla va a usar como
    # porcentaje. Sin esto cada colección tendría su propia escala.
    for j in (0, 1):
        lo, hi = xy[:, j].min(), xy[:, j].max()
        xy[:, j] = (xy[:, j] - lo) / (hi - lo or 1) * 100
    return xy


def preguntar(prompt: str) -> str:
    cuerpo = json.dumps({'contents': [{'parts': [{'text': prompt}]}],
                         'generationConfig': {'temperature': 0.2}}).encode()
    # `gemini-2.5-flash` sale en la lista de modelos y **contesta 404**: «no
    # longer available to new users». Estar listado no es estar disponible, y el
    # error no lo dice hasta que llamas.
    req = urllib.request.Request(
        f'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={K}',
        data=cuerpo, headers={'Content-Type': 'application/json'})
    d = json.load(urllib.request.urlopen(req, timeout=90))
    return d['candidates'][0]['content']['parts'][0]['text']


def q(s):
    return 'NULL' if s is None else "'" + str(s).replace("'", "''") + "'"


# ── LAS PIEZAS ──────────────────────────────────────────────────────────────
filas = psql("""
  SELECT a.id, a.formato, a.titulo, coalesce(a.fuente,''), coalesce(a.nota_ia,''), a.calidad,
         coalesce(a.a_mano, false)::text, coalesce(a.cluster_id, '')
  FROM contenido_agregado a
  WHERE a.archived_at IS NULL
    AND EXISTS (SELECT 1 FROM subtema_contenido c
                 WHERE c.entity_id = a.id AND c.tipo='agregado'
                   AND c.subtema_id IN (SELECT id FROM subtemas WHERE objetivo_id='O008'))
  ORDER BY a.id
""")
print(f'{len(filas)} piezas', file=sys.stderr)

# El texto que se convierte en vector: título + la nota de la IA. La nota es lo
# que dice DE QUÉ VA, y sin ella dos títulos parecidos de canales distintos se
# irían al mismo sitio por el nombre y no por el contenido.
textos = [f'{f[2]}. {f[4]}' for f in filas]
V = embed(textos)

K_GRUPOS = 7   # Con 64 piezas: siete grupos de nueve. Menos, y son cajones de
               # sastre; más, y salen grupos de dos que no son un grupo.
asig, centros = kmeans(V, K_GRUPOS)
XY = dos_dimensiones(V)

# ── LOS GRUPOS DE DOS NO SON GRUPOS ─────────────────────────────────────────
# k-means da siempre exactamente k grupos, tenga sentido o no, y con 64 piezas
# suele soltar uno de dos que es ruido con nombre. Se absorben en el grupo cuyo
# centro está más cerca: mejor un grupo de nueve que uno de siete y otro de dos.
MINIMO = 3
for g in range(K_GRUPOS):
    idx = np.where(asig == g)[0]
    if 0 < len(idx) < MINIMO:
        otros = [o for o in range(K_GRUPOS) if o != g and (asig == o).sum() >= MINIMO]
        destino = max(otros, key=lambda o: float(centros[g] @ centros[o]))
        print(f'  grupo {g} ({len(idx)}) absorbido por {destino}', file=sys.stderr)
        asig[idx] = destino

vivos = [g for g in range(K_GRUPOS) if (asig == g).any()]

# ── EL NOMBRE DE CADA GRUPO, TODOS A LA VEZ ─────────────────────────────────
# La primera versión pedía un nombre por grupo en llamadas separadas y salieron
# tres nombres que decían lo mismo: «Vehículos eléctricos ligeros urbanos»,
# «Bicicletas eléctricas y movilidad urbana» y «Vehículos de movilidad personal
# eléctricos». Ninguno estaba mal; juntos no servían para nada, porque nadie
# sabría a cuál entrar.
#
# **Un nombre que distingue no se puede escribir sin ver de qué distingue.** Es
# el mismo fallo que mirar si dos temas están duplicados de uno en uno. Así que
# van los siete en una sola pregunta, con los demás delante.
bloques = []
for g in vivos:
    idx = [i for i in range(len(filas)) if asig[i] == g]
    titulos = '\n'.join(f'   - {filas[i][2][:90]}' for i in idx[:12])
    bloques.append(f'GRUPO {g} ({len(idx)} publicaciones):\n{titulos}')

txt = preguntar(
    'Estos grupos salen de medir de qué habla cada publicación. Ponle NOMBRE a cada uno.\n\n'
    'Reglas:\n'
    '- En castellano, de 2 a 5 palabras.\n'
    '- Los nombres tienen que DISTINGUIRSE ENTRE SÍ: alguien que los lea debe saber\n'
    '  a cuál entrar. Si dos grupos acaban con nombres parecidos, es que has elegido mal\n'
    '  el rasgo que los separa: busca el que de verdad los diferencia.\n'
    '- Nada de «Publicaciones sobre…» ni «Contenido de…»: el nombre es el tema.\n'
    '- Y una frase de una línea por grupo.\n\n'
    'Responde una línea por grupo, exactamente así:\n'
    'GRUPO <n> | <nombre> | <frase>\n\n' + '\n\n'.join(bloques))

nombres = {}
for m in re.finditer(r'GRUPO\s+(\d+)\s*\|\s*([^|\n]+)\|\s*([^\n]+)', txt):
    nombres[int(m.group(1))] = (m.group(2).strip()[:60], m.group(3).strip()[:200])

grupos = []
for g in vivos:
    idx = [i for i in range(len(filas)) if asig[i] == g]
    nombre, frase = nombres.get(g, (f'Grupo {g + 1}', ''))
    cx, cy = XY[idx].mean(axis=0)
    grupos.append({'g': g, 'nombre': nombre, 'frase': frase, 'x': cx, 'y': cy, 'cuantas': len(idx)})
    print(f'  grupo {g}: {nombre} ({len(idx)})', file=sys.stderr)

# ── QUÉ TIPO DE PIEZA ES CADA UNA ───────────────────────────────────────────
# El otro eje que pidió Eugenio: «o son un tipo de vídeo». Va aparte del tema y
# de la agrupación, porque una reseña de producto y un informe pueden hablar de
# lo mismo y no se leen igual.
GENEROS = ['reseña', 'reportaje', 'divulgación', 'informe', 'norma', 'datos', 'testimonio', 'imagen']
lote = '\n'.join(f'{i}. [{filas[i][1]}] {filas[i][2]}' for i in range(len(filas)))
txt = preguntar(
    'Clasifica cada publicación por QUÉ TIPO DE PIEZA es, no por su tema.\n'
    'Elige una de: ' + ', '.join(GENEROS) + '.\n'
    'Una línea por publicación, exactamente «numero=tipo», sin nada más.\n\n' + lote)
genero = {}
for m in re.finditer(r'(\d+)\s*=\s*([a-záéíóúñ]+)', txt.lower()):
    i, g = int(m.group(1)), m.group(2)
    if i < len(filas) and g in GENEROS:
        genero[i] = g
print(f'  géneros asignados: {len(genero)}/{len(filas)}', file=sys.stderr)

# ── LOS VECINOS DE CADA PIEZA ───────────────────────────────────────────────
# Las aristas de la red: las tres más parecidas a cada una. Tres y no diez
# porque esto se enseña en una tarjeta, y una lista de diez «parecidos» es otra
# vez el problema que se venía a resolver.
S = V @ V.T
np.fill_diagonal(S, -1)
vecinos = {i: [(int(j), float(S[i, j])) for j in np.argsort(-S[i])[:3]] for i in range(len(filas))}

# ── LA SALIDA ───────────────────────────────────────────────────────────────
o = []
w = o.append
w("""-- ============================================================================
-- LA CONSTELACIÓN DE MOVILIDAD (2026-08-25)
-- ============================================================================
-- Generado por `scripts/agregador/constelacion.py`, que lleva escrito el porqué
-- de cada decisión. Lo que llega aquí son sólo los resultados.
--
-- Tres cosas por pieza, y las tres son ejes distintos:
--   · `cluster`  — con qué otras habla de lo mismo (medido, no opinado);
--   · `genero`   — qué TIPO de pieza es (reseña, informe, reportaje…);
--   · `mapa_x/y` — dónde cae en el mapa, por significado.
--
-- Y `contenido_vecino`, que son las aristas: las tres piezas más parecidas a
-- cada una. Ésa es la parte de «red» del asunto — el árbol de temas no puede
-- expresar «esto se parece a aquello» porque no es una jerarquía.

ALTER TABLE contenido_agregado ADD COLUMN IF NOT EXISTS cluster_id text;
ALTER TABLE contenido_agregado ADD COLUMN IF NOT EXISTS genero text;
ALTER TABLE contenido_agregado ADD COLUMN IF NOT EXISTS mapa_x real;
ALTER TABLE contenido_agregado ADD COLUMN IF NOT EXISTS mapa_y real;

-- Los grupos, con su nombre y su sitio en el mapa. `tema_id` porque cada tema
-- tendrá los suyos: agrupar las piezas de MOVILIDAD con las de AGUA daría
-- grupos ciertos y completamente inútiles.
CREATE TABLE IF NOT EXISTS contenido_cluster (
  id          text PRIMARY KEY,
  tema_id     text NOT NULL,
  nombre      text NOT NULL,
  frase       text,
  x           real, y real,
  cuantas     integer NOT NULL DEFAULT 0,
  modelo      text,
  calculado_el timestamp DEFAULT now()
);

-- Las aristas. `parecido` de 0 a 1 se guarda **con** la arista y no se
-- recalcula al pintar: es lo que permite decir «se parecen un 72 %» en vez de
-- pedirle al lector que se fíe.
CREATE TABLE IF NOT EXISTS contenido_vecino (
  id        text NOT NULL,
  vecino_id text NOT NULL,
  parecido  real NOT NULL,
  PRIMARY KEY (id, vecino_id)
);
CREATE INDEX IF NOT EXISTS contenido_vecino_por_id ON contenido_vecino (id);
""")

# Los grupos NO se borran y se vuelven a crear: se actualizan. Borrarlos se
# llevaría por delante el nombre que alguien les hubiera puesto a mano, y
# `a_mano` en el `ON CONFLICT` es lo que decide si el nombre nuevo entra.
w('INSERT INTO contenido_cluster (id, tema_id, nombre, frase, x, y, cuantas, modelo) VALUES')
w(',\n'.join(
    f"  ('CL_O008_{g['g']}', 'O008', {q(g['nombre'])}, {q(g['frase'])}, "
    f"{g['x']:.2f}, {g['y']:.2f}, {g['cuantas']}, 'gemini-embedding-001 + gemini-3.6-flash')"
    for g in grupos) + '''
ON CONFLICT (id) DO UPDATE SET
  x = EXCLUDED.x, y = EXCLUDED.y, cuantas = EXCLUDED.cuantas, modelo = EXCLUDED.modelo,
  -- El nombre y la frase sólo si nadie los ha tocado.
  nombre = CASE WHEN contenido_cluster.a_mano THEN contenido_cluster.nombre ELSE EXCLUDED.nombre END,
  frase  = CASE WHEN contenido_cluster.a_mano THEN contenido_cluster.frase  ELSE EXCLUDED.frase  END,
  calculado_el = now();''')

w('''
-- Cada pieza: su grupo, su tipo y su sitio.
--
-- LO QUE MOVIÓ UNA PERSONA NO SE TOCA. Las piezas con `a_mano` conservan su
-- grupo y sólo se les actualiza la posición y el género. Sin esto, cada
-- recálculo devolvería a su sitio equivocado todo lo que un administrador
-- hubiera corregido — y nadie corrige dos veces la misma cosa.''')
for i, f in enumerate(filas):
    if len(f) > 6 and f[6] == 'true':
        w(f"UPDATE contenido_agregado SET "
          f"genero={q(genero.get(i))}, mapa_x={XY[i][0]:.2f}, mapa_y={XY[i][1]:.2f} "
          f"WHERE id={q(f[0])};  -- movida a mano: se le respeta el grupo")
        continue
    w(f"UPDATE contenido_agregado SET cluster_id='CL_O008_{asig[i]}', "
      f"genero={q(genero.get(i))}, mapa_x={XY[i][0]:.2f}, mapa_y={XY[i][1]:.2f} WHERE id={q(f[0])};")

w('\n-- Las aristas.')
w('DELETE FROM contenido_vecino WHERE id IN (' + ','.join(q(f[0]) for f in filas) + ');')
w('INSERT INTO contenido_vecino (id, vecino_id, parecido) VALUES')
w(',\n'.join(f"  ({q(filas[i][0])}, {q(filas[j][0])}, {p:.4f})"
             for i in range(len(filas)) for j, p in vecinos[i]) + '\nON CONFLICT DO NOTHING;')

print('\n'.join(o))

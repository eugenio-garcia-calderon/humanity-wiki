"""Tag every vision block, reto, solución and proyecto in public/vision/data.js with the scales
(of the 8) it belongs to. Rules from each item's `ambito` / `lugar` / title, plus named overrides."""
import json, re
P = '/home/claude/humanity-wiki/public/vision/data.js'
src = open(P).read()
head = src[:src.index('[')]
data = json.loads(src[src.index('['):src.rindex(']') + 1])

def norm(t): return (t or '').lower()

# --- vision blocks: by the scale their title names ---
def bloque(sid, t):
    t = norm(t)
    out = set()
    if re.search(r'hogar|persona|infancia|vehículo personal|huerto y la cocina|toda la vida', t): out.add('individuo')
    if re.search(r'comunidad|barrio|escuela', t): out.add('comunidad')
    if re.search(r'pueblo|municipio|urban|ciudad|entorno', t): out.add('pueblo')
    if re.search(r'territori|naturaleza', t): out |= {'provincia', 'region'}
    if re.search(r'región', t): out.add('region')
    if re.search(r'país|sistema|sociedad', t): out.add('pais')
    if re.search(r'mundo|planeta|sociedad', t): out |= {'continente', 'planeta'}
    if re.search(r'red', t) and sid == 'energia': out.add('pais')
    return out

# --- retos / soluciones: by `ambito` ---
def ambito(a):
    a = norm(a); out = set()
    if re.search(r'hogar|persona|familia', a): out.add('individuo')
    if re.search(r'comunidad|escuela|atención primaria', a): out.add('comunidad')
    if re.search(r'barcelona|entorno', a): out.add('pueblo')
    if re.search(r'territorio|cataluña', a): out.add('region')
    if re.search(r'españa|sistema|escandinavia', a): out.add('pais')
    if re.search(r'\bue\b|europa', a): out.add('continente')
    if re.search(r'mundial|internacional', a): out.add('planeta')
    return out or {'pais'}

# --- what a reto or solución talks about (title + text) adds the scales it touches ---
def contenido(t):
    t = norm(t); out = set()
    if re.search(r'\bhogar|\bfamilia|personas mayores|niñ[oa]s|adolescentes|\bcasa\b|individual|salario|sueldo|renta familiar|cuidadoras|alimentación infantil|exceso de peso|actividad física', t): out.add('individuo')
    if re.search(r'barrio|vecin|comunitari|cooperativ|grupos? de consumo|huerto|asamblea', t): out.add('comunidad')
    if re.search(r'municip|ayuntamiento|ciudad|calles?\b|urban|\bpueblos?\b|medio rural|local', t): out.add('pueblo')
    if re.search(r'comarca|provinc|incendio|forestal|inundac|dana\b|cuenca|espacios? natural|tierras? de cultivo|agrari|\bsuelo|parcel', t): out.add('provincia')
    if re.search(r'comunidad(es)? autónoma|region|autonómic|autonómica', t): out.add('region')
    return out

# --- proyectos: by `lugar` (most specific place wins) and `tipo` ---
CIUDADES = r'barcelona|madrid|pontevedra|vitoria|crevillent|manresa|burlington|groningen|lyon|copenhague|el prat|vilanova|alicante|torremocha|perales|bordeta|carolinas|usera|chopera|samsø'
REGIONES = r'cataluña|país vasco|euskadi|aragón|asturias|murcia|andalucía|castilla|california|inglaterra|germanófona|navarra|galicia|vermont'
PAISES = r'españa|noruega|suiza|irlanda|países bajos|estados unidos|dinamarca'
def proyecto(p):
    l, t = norm(p.get('lugar')), norm(p.get('tipo')) + ' ' + norm(p.get('nombre'))
    out = set()
    if re.search(r'conca|comarca|moianès', l): out.add('provincia')
    elif re.search(r'calle|c/ |plaça|barrio|masía', l): out.add('comunidad')
    elif re.search(CIUDADES, l) and not re.search(r'toda españa|resto de españa|ámbito estatal|uso internacional|más de 450', l): out.add('pueblo')
    elif re.search(REGIONES, l): out.add('region')
    if not out:
        if re.search(r'internacional|europa|otros países|réplicas', l): out |= {'continente', 'planeta'}
        elif re.search(PAISES, l): out.add('pais')
    if re.search(r'internacional|venta en toda europa|más de 450|otros países|réplicas', l): out.add('planeta')
    if re.search(r'cooperativa de vivienda|cesión de uso|cohousing|comunidad energética|huerto|grupo de consumo|vecinal|csa|agricultura sostenida', t): out.add('comunidad')
    return out or {'pais'}

OVERRIDE = {  # Eugenio's own projects, and places the rules cannot read
    'Modelo de optimización socioeconómica (Luz & Humanidad)': ['individuo', 'comunidad', 'pueblo', 'provincia', 'region', 'pais', 'continente', 'planeta'],
    'Comunidad Circular Humana (Luz & Humanidad)': ['comunidad', 'pueblo'],
    'Comunidad Mapunchi': ['comunidad'],
    'humanity.wiki (Luz & Humanidad)': ['comunidad', 'pueblo', 'pais', 'planeta'],
    'Política · Votar por temas (Luz & Humanidad)': ['pais'],
    'SolarCrowd (Luz & Humanidad)': ['comunidad', 'pais'],
    'Estudio sobre la conciencia del ser humano (Luz & Humanidad)': ['individuo'],
    'Aeromóvil (Luz & Humanidad)': ['individuo'],
    'Samsø, isla de energía renovable': ['comunidad', 'pueblo'],
    'Ecooo Energía Ciudadana': ['comunidad', 'pais'],
    'Fundación Ciudadana Civio': ['pais'],
    'Fundación Grandes Amigos': ['comunidad', 'pais'],
    'Aptera': ['individuo', 'planeta'],
    'Podbike Frikar (velomóvil)': ['individuo', 'continente'],
    'Som Mobilitat': ['comunidad', 'region'],
    'Parque eólico de Middelgrunden': ['comunidad', 'pueblo'],
    'Comunidades de Aprendizaje (CREA, Universidad de Barcelona)': ['comunidad', 'planeta'],
    'GoiEner': ['comunidad', 'region'],
}
ORDEN = ['individuo', 'comunidad', 'pueblo', 'provincia', 'region', 'pais', 'continente', 'planeta']
srt = lambda s: [e for e in ORDEN if e in s]
for s in data:
    for b in s['vision']['bloques']: b['escalas'] = srt(bloque(s['id'], b['titulo'])) or ORDEN
    for r in s['retos'] + s['soluciones']: r['escalas'] = srt(ambito(r.get('ambito')) | contenido(r['titulo'] + ' ' + (r.get('texto') or '')))
    for p in s['proyectos']: p['escalas'] = OVERRIDE.get(p['nombre']) or srt(proyecto(p))

open(P, 'w').write(head + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
from collections import Counter
for kind in ('bloques', 'retos', 'soluciones', 'proyectos'):
    c = Counter()
    for s in data:
        for x in (s['vision']['bloques'] if kind == 'bloques' else s[kind]): c.update(x['escalas'])
    print(f'{kind:10}', {e: c[e] for e in ORDEN})
for s in data:
    for p in s['proyectos']: print(f"  {','.join(p['escalas']):28} {p['nombre'][:45]:45} | {p.get('lugar','')[:50]}")

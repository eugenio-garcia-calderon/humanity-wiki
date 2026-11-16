"""Give each sector its parts (subtemas) and tag every block, reto, solución and proyecto
with the parts it talks about. Keyword rules over title + text (+ tipo/lugar for projects)."""
import json, re, sys
P = '/home/claude/humanity-wiki/public/vision/data.js'
src = open(P).read(); head = src[:src.index('[')]
data = json.loads(src[src.index('['):src.rindex(']') + 1])

# sector -> [(id, nombre, regex)]
S = {
 'energia': [
  ('hogar', 'Hogar y eficiencia', r'hogar|casa|vivienda|aislamiento|eficien|pasiv|edificio|calefacci|rehabilit'),
  ('comunidades', 'Comunidades energéticas', r'comunidad(es)? energ|cooperativ|vecin|compartid|colectiv|socios|ciudadan'),
  ('renovables', 'Renovables y territorio', r'renovable|solar|eólic|fotovolt|parque|placas|isla|territorio|aerogenerador'),
  ('red', 'Red y almacenamiento', r'\bred(es)?\b|almacen|bater|apagón|tensión|nudos|distribu|intelig|importa|dependencia'),
  ('pobreza', 'Pobreza y acceso', r'pobreza|acceso|sin electricidad|factura|vulnerab|asequib|préstamo'),
 ],
 'movilidad': [
  ('vehiculo', 'Vehículo ligero', r'vehícul|velomóvil|aptera|aeromóvil|ligero|suv|peso|homolog|bici(cleta)?s? eléctric|epac'),
  ('ciudad', 'Ciudad y calle', r'ciudad|urban|calle|peaton|supermanzana|superilla|15 minutos|pontevedra|groningen|bici'),
  ('transporte', 'Transporte público y compartido', r'transporte público|tren|autobús|compartid|carsharing|cooperativ|demanda|tranv'),
  ('rural', 'Mundo rural y territorio', r'rural|despobla|pueblo|territori|vías? verdes?|comarca'),
  ('emisiones', 'Emisiones y energía', r'emision|co2|clima|electrific|solar|recarga|energ'),
  ('seguridad', 'Seguridad vial', r'siniestral|muert|fallec|seguridad vial|vulnerables|atropell'),
 ],
 'politica': [
  ('participacion', 'Participación', r'particip|presupuestos? participativ|decide|decidim|votó|elecciones|voz'),
  ('transparencia', 'Transparencia y cuentas claras', r'transparen|datos abiertos|corrupci|civio|cuentas|rendición'),
  ('deliberacion', 'Deliberación por sorteo', r'sorteo|asamblea|delibera|diálogo ciudadano|ostbelgien|irlanda'),
  ('directa', 'Democracia directa', r'referéndum|democracia directa|votaciones populares|suiza|votar por temas|iniciativa popular'),
  ('confianza', 'Confianza y polarización', r'confianza|polariza|autocrac|democrátic|relaciones|desconfian'),
 ],
 'economia': [
  ('hogar', 'Economía del hogar', r'hogar|familia|imprevist|ahorro|pobreza|exclusión|gastos|renta'),
  ('social', 'Economía social y cooperativas', r'cooperativ|economía social|mondragón|reas|mercado social|bien común'),
  ('fiscalidad', 'Fiscalidad', r'impuesto|iva|fiscal|tributa|recaud|factura electrónica'),
  ('banca', 'Banca y dinero', r'banca|banco|dinero|moneda|deuda|crédito|financia|triodos|fiare|wir|turuta'),
  ('desigualdad', 'Desigualdad', r'desigual|riqueza|más rico'),
 ],
 'seguridad': [
  ('hogar', 'Hogar preparado', r'hogar|casa|kit|familia|plan familiar|72 horas'),
  ('calle', 'Calle y seguridad vial', r'calle|30 km|vial|carretera|tráfico|escuela|escolar|barrio|pontevedra'),
  ('clima', 'Incendios, inundaciones y calor', r'incendi|forestal|inundac|dana|calor|refugio|clima|pastoreo|ramats|adf'),
  ('emergencias', 'Emergencias y protección civil', r'emergenc|protección civil|alerta|voluntari|preparaci|112|firewise'),
  ('digital', 'Seguridad digital', r'ciber|digital|017|internet|incibe'),
 ],
 'justicia': [
  ('acceso', 'Acceso y lenguaje claro', r'acceso|lenguaje|claro|comprensi|facilita|discapacidad|plena inclusión'),
  ('mediacion', 'Mediación', r'mediaci|masc|acuerdo|medios? adecuados'),
  ('restaurativa', 'Justicia restaurativa', r'restaurativ|repar|víctima'),
  ('juzgados', 'Juzgados ágiles', r'juzgad|asuntos|pendiente|tramit|eficiencia|independencia|cgpj|datos abiertos|civio'),
  ('reinsercion', 'Reinserción', r'reinser|prisi|penitenci|reincid|excarcel|módulos de respeto|halden'),
 ],
 'salud': [
  ('prevencion', 'Prevención y hábitos', r'prevenc|aliment|dieta|mediterrán|actividad física|ejercicio|peso|obesidad|movimiento|sedentar'),
  ('mental', 'Salud mental', r'mental|suicid|ansiedad|depresi|emocional|soledad'),
  ('primaria', 'Atención primaria', r'atención primaria|médic|consulta|espera|continuidad|enfermer|pacientes'),
  ('comunitaria', 'Salud comunitaria', r'comunitari|activos|prescripción social|barrio|pacap'),
  ('ambiental', 'Salud ambiental', r'aire|contamina|partículas|ruido|no2|verde|naturaleza|ciudad|anillo'),
 ],
 'vivienda': [
  ('arquitectura', 'Arquitectura del hogar', r'hogar|casa|material|transpir|tapial|paja|adobe|bioconstru|madera|integrada|cueva|earthship|tierra cruda|edificio'),
  ('urbanismo', 'Urbanismo', r'urban|ciudad|peaton|vías? verdes?|calle|dispersión|supermanzana|superilla|barrio|centro de soberanía'),
  ('comunidad', 'Comunidad y cooperativas', r'comunidad|cooperativ|cesión de uso|cohousing|andel|vecin|colectiv|comunitari'),
  ('suelo', 'Suelo y acceso a la vivienda', r'suelo|precio|alquiler|especula|vacía|propiedad|land trust|superficie|asequib|salario|gran tenedor|inmuebles'),
  ('naturaleza', 'Naturaleza y territorio', r'naturaleza|sender|bosque|rural|abandon|tierras|interpretación|parque|humedal|campo'),
 ],
 'alimentacion': [
  ('huerto', 'Huerto y cocina', r'huerto|cocina|casa|hogar|dieta|peso|infantil'),
  ('consumo', 'Grupos de consumo y mercados', r'consumo|cooperativ|agricultura sostenida|mercado|slow food|cesta|local'),
  ('campo', 'Campo y relevo agrario', r'agrari|campo|relevo|explotaci|tierras|banco de tierras|agroecol|suelos'),
  ('desperdicio', 'Desperdicio', r'desperdici|basura|espigolador|excedente'),
  ('comedores', 'Comedores y cocinas públicas', r'comedor|escolar|cocinas públicas|copenhague'),
  ('hambre', 'Hambre y derecho a la alimentación', r'hambre|protección social|fao|inseguridad alimentaria'),
 ],
 'informatica': [
  ('privacidad', 'Privacidad y bienestar digital', r'privacidad|datos personales|menores|adolescentes|uso problemático|017|ciber|incidentes'),
  ('libre', 'Software libre y conocimiento abierto', r'software libre|código abierto|wiki|decidim|framasoft|abierto|mastodon|fediverso|datos abiertos'),
  ('redes', 'Redes comunitarias', r'guifi|red comunitaria|redes comunitarias|conectividad'),
  ('brecha', 'Brecha digital', r'brecha|competencias digitales|inclusión digital|formación'),
  ('sostenible', 'Tecnología sostenible', r'reparar|basura electrónica|residuos|fairphone|centros de datos|consumo|energía|twh|nube'),
  ('ia', 'Inteligencia artificial', r'\bia\b|inteligencia artificial|algoritm'),
 ],
 'educacion': [
  ('infancia', 'Infancia', r'infancia|infantil|niñ|jugando|juego|emocion'),
  ('escuela', 'Escuela y comunidad', r'escuela|centro|comunidades de aprendizaje|proyectos|amara berri|barrio|familias'),
  ('equidad', 'Equidad', r'abandono|dejan de estudiar|desigual|origen familiar|repet|segrega|mézclate|mezcla|sin escuela'),
  ('naturaleza', 'Educación en la naturaleza', r'naturaleza|bosque|aire libre|edna|actividad física'),
  ('vida', 'Aprender toda la vida', r'adult|toda la vida|universidad popular|formación profesional|piaac|conciencia|continua'),
 ],
 'cuidados': [
  ('familia', 'Familia y conciliación', r'familia|concilia|permiso|nacimiento|reduc.* jornada|mujeres|hogar'),
  ('soledad', 'Mayores y soledad', r'soledad|mayores|acompañ|grandes amigos|radars|vecin'),
  ('dependencia', 'Dependencia', r'dependencia|lista de espera|valoración|discapacidad'),
  ('profesionales', 'Profesionales del cuidado', r'profesional|trabajador|enfermer|buurtzorg|domicilio|cuidadoras'),
  ('vivienda', 'Vivienda colaborativa e intergeneracional', r'cohousing|intergeneracional|trabensol|vivienda'),
 ],
}

def texto(x):
    return ' '.join(str(x.get(k) or '') for k in ('titulo', 'nombre', 'texto', 'tipo', 'supera') ) + ' ' + ' '.join(x.get('puntos') or [])

sin = []
for s in data:
    defs = S[s['id']]
    s['subtemas'] = [{'id': i, 'nombre': n} for i, n, _ in defs]
    elems = [('bloque', b) for b in s['vision']['bloques']] + [(k, x) for k in ('retos', 'soluciones', 'proyectos') for x in s[k]]
    for kind, x in elems:
        t = texto(x).lower()
        x['subtemas'] = [i for i, _, rx in defs if re.search(rx, t)]
        if not x['subtemas']: sin.append(f"{s['id']}/{kind}: {x.get('titulo') or x.get('nombre')}")

open(P, 'w').write(head + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
for s in data:
    from collections import Counter
    c = Counter(i for k in ('retos', 'soluciones', 'proyectos') for x in s[k] for i in x['subtemas'])
    c.update(i for b in s['vision']['bloques'] for i in b['subtemas'])
    print(s['id'], {d['id']: c[d['id']] for d in s['subtemas']})
print('SIN SUBTEMA', len(sin)); print('\n'.join(sin))

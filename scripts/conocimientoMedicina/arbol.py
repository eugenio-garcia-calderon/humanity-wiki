import math, sys
W,H = int(sys.argv[1]), int(sys.argv[2]); conTexto = sys.argv[3] == '1'
CX, CY = W/2, H/2 + (10 if conTexto else 40)
RAMAS = [
 ('Cardiología', '#ef4444', ['Hipertensión','Arritmias','Válvulas']),
 ('Nutrición', '#10b981', ['Microbiota','Metabolismo','Alimentación']),
 ('Salud pública', '#0ea5e9', ['Epidemiología','Prevención','Entorno']),
 ('Psiquiatría', '#8b5cf6', ['Ansiedad','Depresión','Sueño']),
 ('Pediatría', '#f59e0b', ['Recién nacidos','Vacunas','Crecimiento']),
 ('Inmunología', '#14b8a6', ['Alergias','Autoinmunidad','Infecciones']),
 ('Neurología', '#3b82f6', ['Migraña','Epilepsia','Memoria']),
 ('Medicina integrativa', '#ec4899', ['Fitoterapia','Mente y cuerpo','Hábitos']),
]
k = min(W/1600, H/900)
RX1, RY1 = 300*k*(W/H)/(16/9), 230*k
RX2, RY2 = 560*k*(W/H)/(16/9), 370*k
out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Inter, Helvetica, Arial, sans-serif">',
 '<defs><radialGradient id="bg" cx="50%" cy="55%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="#fff5f5"/><stop offset="1" stop-color="#eef6ff"/></radialGradient>',
 '<radialGradient id="halo"><stop offset="0" stop-color="#fecaca" stop-opacity="0.9"/><stop offset="1" stop-color="#fecaca" stop-opacity="0"/></radialGradient></defs>',
 f'<rect width="{W}" height="{H}" fill="url(#bg)"/>']
# faint grid of dots
for x in range(0,W,int(28*k)+1):
  for y in range(0,H,int(28*k)+1):
    out.append(f'<circle cx="{x}" cy="{y}" r="{1.1*k:.2f}" fill="#e2e8f0"/>')
out.append(f'<ellipse cx="{CX}" cy="{CY}" rx="{RX1}" ry="{RY1}" fill="none" stroke="#e2e8f0" stroke-width="{1.5*k}" stroke-dasharray="{5*k} {8*k}"/>')
out.append(f'<ellipse cx="{CX}" cy="{CY}" rx="{RX2}" ry="{RY2}" fill="none" stroke="#eef2f7" stroke-width="{1.5*k}" stroke-dasharray="{5*k} {8*k}"/>')
P=lambda a,rx,ry:(CX+rx*math.cos(math.radians(a)), CY+ry*math.sin(math.radians(a)))
n=len(RAMAS); textos=[]
for i,(nom,col,subs) in enumerate(RAMAS):
  a = -90 + i*360/n
  x1,y1 = P(a,RX1,RY1)
  for j,s in enumerate(subs):
    d=(j-1)*13
    x2,y2=P(a+d,RX2,RY2); mx,my=P(a+d/2,(RX1+RX2)/2,(RY1+RY2)/2)
    out.append(f'<path d="M{x1:.1f},{y1:.1f} Q{mx:.1f},{my:.1f} {x2:.1f},{y2:.1f}" fill="none" stroke="{col}" stroke-opacity="0.5" stroke-width="{2.2*k}"/>')
    out.append(f'<circle cx="{x2:.1f}" cy="{y2:.1f}" r="{7*k}" fill="{col}" fill-opacity="0.35"/><circle cx="{x2:.1f}" cy="{y2:.1f}" r="{3.6*k}" fill="{col}"/>')
    if conTexto:
      c=math.cos(math.radians(a+d)); anc='start' if c>0.25 else 'end' if c<-0.25 else 'middle'
      tx=x2+(14*k if anc=='start' else -14*k if anc=='end' else 0); ty=y2+(5*k if anc!='middle' else (-14*k if math.sin(math.radians(a+d))<0 else 24*k))
      textos.append(f'<text x="{tx:.1f}" y="{ty:.1f}" text-anchor="{anc}" font-size="{17*k:.1f}" fill="#64748b" paint-order="stroke" stroke="#fff" stroke-width="{5*k}">{s}</text>')
  mx,my=P(a-14,RX1*0.5,RY1*0.5)
  out.append(f'<path d="M{CX},{CY} Q{mx:.1f},{my:.1f} {x1:.1f},{y1:.1f}" fill="none" stroke="{col}" stroke-width="{5*k}" stroke-linecap="round"/>')
  out.append(f'<circle cx="{x1:.1f}" cy="{y1:.1f}" r="{14*k}" fill="{col}" stroke="#fff" stroke-width="{4*k}"/>')
  if conTexto:
    c=math.cos(math.radians(a)); anc='start' if c>0.25 else 'end' if c<-0.25 else 'middle'
    tx=x1+(22*k if anc=='start' else -22*k if anc=='end' else 0); ty=y1+(7*k if anc!='middle' else (-24*k if math.sin(math.radians(a))<0 else 38*k))
    textos.append(f'<text x="{tx:.1f}" y="{ty:.1f}" text-anchor="{anc}" font-size="{22*k:.1f}" font-weight="700" fill="#334155" paint-order="stroke" stroke="#fff" stroke-width="{6*k}">{nom}</text>')
out.append(f'<circle cx="{CX}" cy="{CY}" r="{120*k}" fill="url(#halo)"/>')
out.append(f'<circle cx="{CX}" cy="{CY}" r="{56*k}" fill="#fee2e2"/><circle cx="{CX}" cy="{CY}" r="{42*k}" fill="#ef4444"/>')
s=k*2.6
out.append(f'<path transform="translate({CX} {CY}) scale({s})" d="M-8,0.7h3.8l1.9-4.3 3,8.1 2.3-5.9 1.4,2.1h4" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>')
if conTexto:
  out.append(f'<text x="{CX}" y="{CY+90*k}" text-anchor="middle" font-size="{24*k:.1f}" font-weight="800" fill="#0f172a" paint-order="stroke" stroke="#fff" stroke-width="{6*k}">Medicina</text>')
out+=textos
out.append('</svg>')
print('\n'.join(out))

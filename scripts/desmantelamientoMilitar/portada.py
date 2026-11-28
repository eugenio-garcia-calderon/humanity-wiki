W,H=1600,900
CX,CY=W/2,H/2+30
an=[(70,'#2563eb','#dbeafe'),(150,'#3b82f6','#eff6ff'),(235,'#60a5fa','#ffffff'),(320,'#93c5fd','#ffffff'),(405,'#bfdbfe','#ffffff')]
o=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
'<defs><radialGradient id="bg" cx="50%" cy="55%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.7" stop-color="#eff6ff"/><stop offset="1" stop-color="#ecfdf5"/></radialGradient></defs>',
f'<rect width="{W}" height="{H}" fill="url(#bg)"/>']
for r,c,f in reversed(an):
    o.append(f'<ellipse cx="{CX}" cy="{CY}" rx="{r*1.35}" ry="{r*0.85}" fill="{f}" stroke="{c}" stroke-width="5"/>')
# small figures on each ring (people protecting the inner ring)
import math
for k,(r,c,f) in enumerate(an[1:],1):
    n=4+k*3
    for i in range(n):
        a=2*math.pi*i/n+k*0.3
        x=CX+r*1.35*math.cos(a); y=CY+r*0.85*math.sin(a)
        o.append(f'<circle cx="{x:.1f}" cy="{y-16:.1f}" r="7" fill="{c}"/><path d="M{x-10:.1f},{y+4:.1f} C{x-10:.1f},{y-10:.1f} {x+10:.1f},{y-10:.1f} {x+10:.1f},{y+4:.1f}z" fill="{c}"/>')
o.append(f'<circle cx="{CX}" cy="{CY-14}" r="16" fill="#1d4ed8"/><path d="M{CX-24},{CY+30} C{CX-24},{CY} {CX+24},{CY} {CX+24},{CY+30}z" fill="#1d4ed8"/>')
# olive branch
bx,by=CX-200,CY-360
o.append(f'<path d="M{bx},{by+40} C{bx+120},{by} {bx+260},{by-10} {bx+400},{by+16}" fill="none" stroke="#059669" stroke-width="8" stroke-linecap="round"/>')
for i in range(9):
    x=bx+30+i*42; y=by+30-i*3+(14 if i%2 else -14)
    o.append(f'<ellipse cx="{x}" cy="{y}" rx="26" ry="10" fill="#34d399" transform="rotate({-25 if i%2==0 else 25} {x} {y})"/>')
o.append(f'<circle cx="{bx+400}" cy="{by+16}" r="12" fill="#047857"/>')
o.append('</svg>')
open('/tmp/seg/portada.svg','w').write('\n'.join(o))

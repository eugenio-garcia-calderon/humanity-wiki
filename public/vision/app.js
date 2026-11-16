// Humanity.wiki · /vision — the ideal vision of the 12 sectors, filterable by the 8 scales.
// Hash router: #/  and  #/sector/<id>/<pilar>, both with an optional ?e=<scale>.
const PILARES = [
  {id:'vision', nombre:'Visión ideal', c:'var(--vision)', desc:'Comunicada a través de las bellas artes'},
  {id:'retos', nombre:'Retos', c:'var(--retos)', desc:'Lo que nos aleja del ideal'},
  {id:'soluciones', nombre:'Soluciones', c:'var(--soluciones)', desc:'Conocimiento y técnicas que nos acercan'},
  {id:'proyectos', nombre:'Proyectos', c:'var(--proyectos)', desc:'Quienes hacen realidad la visión'}
];
// The 8 scales, from the person to the planet. `escena` = the 3D viewer scale that shows it.
const ESCALAS = [
  {id:'individuo', nombre:'Individuo', desc:'La persona y su hogar', escena:'hogar'},
  {id:'comunidad', nombre:'Comunidad', desc:'Familias y vecindad', escena:'comunidad'},
  {id:'pueblo', nombre:'Pueblo', desc:'Municipio, pueblo o ciudad', escena:'pueblo'},
  {id:'provincia', nombre:'Provincia', desc:'Comarca y provincia', escena:'naturaleza'},
  {id:'region', nombre:'Región', desc:'Comunidad autónoma', escena:'naturaleza'},
  {id:'pais', nombre:'País', desc:'El Estado', escena:null},
  {id:'continente', nombre:'Continente', desc:'Europa', escena:null},
  {id:'planeta', nombre:'Planeta', desc:'La Tierra y toda la humanidad', escena:null}
];
const ESC_DEFECTO = 'pais';   // the site opens at country scale (2026-11-16)
let ESC = ESC_DEFECTO;   // selected scale id, or null = all scales
let PAIS = 'es';         // country shown at «país» scale (only España has models so far)
let VISTA = '2d';        // country model view: '2d' diagram or '3d'
// Countries offered in the selector; only those in PAISES (paises.js) have content yet.
const LISTA_PAISES = [['es','España'],['pt','Portugal'],['fr','Francia'],['it','Italia'],['de','Alemania'],['mx','México'],['ar','Argentina'],['co','Colombia'],['cl','Chile']];
let PIL = null;   // selected pillar id, or null = all four
let SUB = null;   // selected part (subtema) of the open sector, or null = the whole sector
// Which 3D viewer scene shows each part best (parts not listed use the sector's own scene).
const ESCENA_SUBTEMA = {
  vivienda:{arquitectura:'hogar', urbanismo:'pueblo', comunidad:'comunidad', suelo:'pueblo', naturaleza:'naturaleza'},
  movilidad:{vehiculo:'movilidad', ciudad:'movilidad', transporte:'movilidad', rural:'pueblo', seguridad:'movilidad'},
  energia:{hogar:'hogar', comunidades:'comunidad', renovables:'pueblo', red:'pueblo'},
  alimentacion:{huerto:'hogar', consumo:'comunidad', campo:'comunidad', comedores:'comunidad'},
  seguridad:{hogar:'hogar', calle:'movilidad', clima:'naturaleza'},
  salud:{prevencion:'naturaleza', comunitaria:'comunidad', ambiental:'naturaleza'},
  educacion:{naturaleza:'naturaleza', escuela:'comunidad'},
  cuidados:{familia:'hogar', soledad:'comunidad', vivienda:'comunidad'}
};
let SECTOR = null;

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ICON3D = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 22V12M21 7l-9 5-9-5"/></svg>';
// Concentric rings: one ring per step up the scale, so the icon grows from person to planet.
const icono = n => `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true">${Array.from({length:Math.min(n,4)},(_,k)=>
  `<circle cx="12" cy="12" r="${3+k*2.8}" fill="${k===0?'currentColor':'none'}" stroke="currentColor" stroke-width="1.4" opacity="${1-k*.18}"/>`).join('')}${n>4?`<circle cx="12" cy="12" r="11.2" fill="none" stroke="currentColor" stroke-width="${(n-4)*.6}" stroke-dasharray="${n>6?'none':'2 2'}"/>`:''}</svg>`;

// Large line icons for each scale, shown at the left of the white panel when a scale is chosen.
const ICONO_ESCALA = {
  individuo:'<circle cx="24" cy="14" r="7"/><path d="M10 42c0-8 6.3-14 14-14s14 6 14 14"/>',
  comunidad:'<circle cx="24" cy="15" r="5.5"/><circle cx="11" cy="19" r="4.5"/><circle cx="37" cy="19" r="4.5"/><path d="M14 40c0-6.6 4.5-11 10-11s10 4.4 10 11M3 38c0-5 3.6-9 8-9 2 0 3.8.7 5.2 2M45 38c0-5-3.6-9-8-9-2 0-3.8.7-5.2 2"/>',
  pueblo:'<path d="M4 42h40"/><path d="M7 42V28l7-6 7 6v14M27 42V24l8-7 8 7v18"/><path d="M35 17V9l-2 2M35 9l2 2M35 9V6"/><rect x="11" y="32" width="6" height="10"/><rect x="32" y="29" width="6" height="5"/>',
  provincia:'<path d="M3 40l11-16 8 10 7-9 16 15z"/><circle cx="35" cy="11" r="4"/><path d="M14 40v-4h4v4M28 40v-3h3v3"/>',
  region:'<path d="M9 9l10-4 10 4 10-4v34l-10 4-10-4-10 4z"/><path d="M19 5v34M29 9v34"/><circle cx="24" cy="21" r="3"/>',
  pais:'<path d="M10 44V5"/><path d="M10 7c6-3 11 3 17 0s9-2 12 0v18c-3-2-6-3-12 0s-11-3-17 0"/>',
  continente:'<rect x="4" y="6" width="40" height="36" rx="6"/><path d="M12 15c4-3 8-1 9 2s5 2 7 0 7 0 6 4-5 3-6 6-5 6-8 4-1-5-4-6-6-2-6-5 0-3 2-5z"/>',
  planeta:'<circle cx="24" cy="24" r="19"/><ellipse cx="24" cy="24" rx="8" ry="19"/><path d="M5 24h38M8 14h32M8 34h32"/>'
};
const iconoEscala = id => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONO_ESCALA[id]||''}</svg>`;
// One short sentence out of a longer text: the site shows bullets, not paragraphs.
function corto(t){
  t = String(t||'').trim(); if(!t) return '';
  let f = t.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡«"0-9])/)[0];
  if(f.length > 170) f = f.slice(0,160).replace(/\s+\S*$/,'') + '…';
  if(/por verificar/i.test(t) && !/por verificar/i.test(f)) f += ' (por verificar)';
  return f;
}

// Filter by the chosen scale and, inside a sector, by the chosen part.
const deEscala = list => (list||[]).filter(x => (!ESC || (x.escalas||[]).includes(ESC)) && (!SUB || !SECTOR || (x.subtemas||[]).includes(SUB)));
// Every link keeps the current scale and pillar unless told otherwise.
function link({sector=SECTOR, e=ESC, p=PIL, s, v=VISTA, c=PAIS}={}){
  if(s === undefined) s = sector===SECTOR ? SUB : null;   // a part belongs to its sector
  const qs = new URLSearchParams(); if(s && sector) qs.set('s', s);
  if(e !== ESC_DEFECTO) qs.set('e', e || 'todas');         // country scale is the default: no parameter
  if(p) qs.set('p', p); if(v !== '2d') qs.set('v', v); if(c !== 'es') qs.set('c', c);
  return `#${sector?`/sector/${sector}`:'/'}${qs.toString()?'?'+qs:''}`;
}
const cuentaPilar = (s, pid) => pid==='vision' ? deEscala(s.vision.bloques).length : deEscala(s[pid]).length;
const nombreEscala = () => ESCALAS.find(e=>e.id===ESC)?.nombre;
const total = s => deEscala(s.vision.bloques).length + deEscala(s.retos).length + deEscala(s.soluciones).length + deEscala(s.proyectos).length;

// A menu row whose chosen item always sits in the exact centre, big, with the others split
// to its left and right (the list rotates so the chosen one lands in the middle).
function filaCentrada(items, elegido, clase){
  if(!elegido) return `<div class="fila sin-eleccion ${clase}">${items.map(x=>x.html).join('')}</div>`;
  const i = items.findIndex(x=>x.id===elegido);
  const resto = [...items.slice(i+1), ...items.slice(0,i)];
  const mitad = Math.ceil(resto.length/2);
  const izq = resto.slice(mitad), der = resto.slice(0,mitad);
  return `<div class="fila ${clase}"><div class="lado izq">${izq.map(x=>x.html).join('')}</div>
    <div class="centro">${items[i].html}</div><div class="lado der">${der.map(x=>x.html).join('')}</div></div>`;
}

function nav(){
  $('#nav').innerHTML = filaCentrada(SECTORES.map(s=>({id:s.id,
    html:`<a href="${link({sector:s.id})}" class="${s.id===SECTOR?'on':''}">${esc(s.nombre)}</a>`})), SECTOR, 'f-sectores');
}

function menuSubtemas(){
  const s = SECTORES.find(x=>x.id===SECTOR);
  const el = $('#subnav');
  if(!s || !(s.subtemas||[]).length){ el.innerHTML=''; el.hidden=true; return; }
  el.hidden=false;
  // «Todo» is only offered while a part is chosen: it is the way back to the whole sector.
  const items = (SUB ? [{id:'_todo', html:`<a href="${link({s:null})}">Todas las partes</a>`}] : []).concat(
    s.subtemas.map(t=>({id:t.id, html:`<a href="${link({s:t.id})}" class="${t.id===SUB?'on':''}">${esc(t.nombre)}</a>`})));
  el.innerHTML = filaCentrada(items, SUB, 'f-partes');
}

// Side menus: icon and one word only, so they stay narrow against the edges.
function menuEscalas(){
  $('#escalas').innerHTML = `
    <div class="esc-tit">Escalas</div>
    <a href="${link({e:null})}" class="${!ESC?'on':''}">${icono(4)}<b>Todas</b></a>
    ${ESCALAS.map((e,i)=>`<a href="${link({e:e.id})}" class="${e.id===ESC?'on':''}" title="${esc(e.desc)}">${iconoEscala(e.id)}<b>${e.nombre}</b></a>${e.id==='pais'?selectorPais():''}`).join('')}`;
  if(matchMedia('(max-width:900px)').matches) $('#escalas .on')?.scrollIntoView({block:'nearest', inline:'center'});
}

const ICONOS_PILAR = {
  todo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></svg>',
  vision:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  retos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 20h18L12 4z"/><path d="M12 10v4M12 17h.01"/></svg>',
  soluciones:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
  proyectos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/></svg>'
};
// Which country «País» means. Only countries with content can be chosen; the rest say so.
function selectorPais(){
  return `<label class="selpais" title="País"><span class="vh">País</span><select onchange="location.hash=link({e:'pais',c:this.value})">
    ${LISTA_PAISES.map(([id,n])=>`<option value="${id}" ${id===PAIS?'selected':''} ${PAISES[id]?'':'disabled'}>${n}${PAISES[id]?'':' · pronto'}</option>`).join('')}</select></label>`;
}

const NOMBRE_CORTO = {vision:'Visión', retos:'Retos', soluciones:'Soluciones', proyectos:'Proyectos'};
function menuPilares(){
  $('#pilares').innerHTML = `
    <div class="esc-tit">Contenido</div>
    <a href="${link({p:null})}" class="${!PIL?'on':''}" style="--c:#e9eef7">${ICONOS_PILAR.todo}<b>Todo</b></a>
    ${PILARES.map(p=>`<a href="${link({p:p.id})}" class="${p.id===PIL?'on':''}" style="--c:${p.c}" title="${esc(p.desc)}">${ICONOS_PILAR[p.id]}<b>${NOMBRE_CORTO[p.id]}</b></a>`).join('')}`;
  if(matchMedia('(max-width:900px)').matches) $('#pilares .on')?.scrollIntoView({block:'nearest', inline:'center'});
}

function home(){
  if(PIL) return homePilar();
  $('#app').innerHTML = `
  <section class="hero">
    <h1>La visión ideal de miles de seres, en cada área de la vida.</h1>
    <p>Humanity.wiki recopila y divulga la visión ideal de cada sector vital, los retos que nos impiden alcanzarla,
    las soluciones que superan esos retos y los proyectos humanos que las hacen realidad, en cada escala: de la persona al planeta.</p>
  </section>
  <div class="pilares">
    ${PILARES.map(p=>`<a class="pilar" href="${link({p:p.id})}" style="--c:${p.c}"><b>${p.nombre}</b><small>${p.desc}</small></a>`).join('')}
  </div>
  ${insignia()}
  <div class="grid">
    ${SECTORES.map((s,i)=>`
      <a class="card ${ESC&&!total(s)?'vacia':''}" href="${link({sector:s.id})}">
        ${s.vision.arte?`<img class="mini" loading="lazy" src="${esc(s.vision.arte.src)}" alt="">`:''}
        <span class="n">${String(i+1).padStart(2,'0')}</span>
        <h3>${esc(s.nombre)}</h3>
        <p>${esc(s.resumen)}</p>
        <span class="estado">${deEscala(s.retos).length} retos · ${deEscala(s.soluciones).length} soluciones · ${deEscala(s.proyectos).length} proyectos</span>
      </a>`).join('')}
  </div>`;
}

// Home with one pillar chosen: that pillar only, for all 12 sectors, one block per sector.
function homePilar(){
  const p = PILARES.find(x=>x.id===PIL);
  const conAlgo = SECTORES.filter(s=>cuentaPilar(s,p.id));
  $('#app').innerHTML = `${insignia()}
  ${conAlgo.length ? conAlgo.map(s=>`
    <section class="grupo" style="--c:${p.c}">
      <h2><a href="${link({sector:s.id})}">${esc(s.nombre)}</a></h2>
      ${render[p.id](s, true)}
    </section>`).join('') : `<div class="vacio">Pendiente: todavía no hay ${p.nombre.toLowerCase()} a esta escala.</div>`}`;
}

// The 3D scene that fits what is on screen, or null when there is no model yet (pending).
function escenaActual(s){
  const e = ESC && ESCALAS.find(x=>x.id===ESC);
  if(e && !e.escena) return null;                          // País, Continente, Planeta: no model yet
  // The chosen part decides first (Calle → street scene), then the scale, then the sector.
  return (SUB && ESCENA_SUBTEMA[s.id]?.[SUB]) || e?.escena || s.vision.escena3d || null;
}
const nombreSub = s => s.subtemas?.find(t=>t.id===SUB)?.nombre;
function visor3D(s){
  const escena = escenaActual(s);
  if(!escena) return `<div class="visor pendiente"><div>${ICON3D}<b>${ESC==='pais' ? `Modelo país de ${esc(PAISES[PAIS]?.nombre||'')} pendiente` : 'Modelo 3D pendiente'}</b></div></div>`;
  return `<div class="visor"><iframe src="vision3d.html?embed#${escena}" title="Visión en 3D" loading="lazy"></iframe>
    <button class="btn-mini completa" onclick="abrir3D('${escena}')">⛶ Pantalla completa</button></div>`;
}

// ---------- Country model: the sector split into its «patas», today vs ideal ----------
const modelo = s => ESC==='pais' ? PAISES[PAIS]?.modelos?.[s.id] : null;
// Progress of one indicator towards its ideal, 0..1 («subir»: more is better, «bajar»: less is better).
function progreso(i){
  const a = +i.actual, o = +i.objetivo;
  if(!isFinite(a) || !isFinite(o)) return null;
  const r = i.sentido==='bajar' ? (a<=0 ? 1 : o/a) : (o<=0 ? 1 : a/o);
  return Math.max(0, Math.min(1, r));
}
const media = xs => { xs = xs.filter(x=>x!=null); return xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : null; };
const progPata = p => media((p.indicadores||[]).map(progreso));
const progSector = m => media(m.patas.map(progPata));
const colorProg = x => x==null ? '#9aa6b8' : x<.4 ? '#c0504d' : x<.7 ? '#d9962b' : '#3d8a5f';
const pct = x => x==null ? '—' : Math.round(x*100)+' %';
const num = v => typeof v==='number' ? v.toLocaleString('es-ES') : esc(v);

function esquema2D(s, m){
  const W=900, H=500, cx=W/2, cy=H/2, rx=330, ry=178, n=m.patas.length, NW=184, NH=72;
  const ang = {}, pos = {};
  m.patas.forEach((p,k)=>{ const a = -Math.PI/2 + k*2*Math.PI/n; ang[p.id]=a; pos[p.id] = [cx+rx*Math.cos(a), cy+ry*Math.sin(a)]; });
  // Arrows run around the ring, never through the centre: the control point sits outside the ring at the
  // middle angle, further out the further apart the two patas are. A reverse arrow takes a wider path.
  const pares = new Set(m.flujos.map(f=>f.de+'>'+f.a));
  const borde = (x,y,tx,ty) => { const dx=tx-x, dy=ty-y, t=Math.min(Math.abs((NW/2+6)/(dx||1e-6)), Math.abs((NH/2+6)/(dy||1e-6))); return [x+dx*t, y+dy*t]; };
  const flecha = f => {
    let a1=ang[f.de], a2=ang[f.a], d=a2-a1; while(d>Math.PI) d-=2*Math.PI; while(d<-Math.PI) d+=2*Math.PI;
    const am=a1+d/2, k=1.12+0.55*Math.abs(d)/Math.PI + (pares.has(f.a+'>'+f.de) && f.de>f.a ? .28 : 0);
    const c=[cx+rx*k*Math.cos(am), cy+ry*k*Math.sin(am)];
    const a=borde(...pos[f.de], ...c), b=borde(...pos[f.a], ...c);
    const lx=(a[0]+2*c[0]+b[0])/4, ly=(a[1]+2*c[1]+b[1])/4;
    return `<path d="M${a[0]},${a[1]} Q${c[0]},${c[1]} ${b[0]},${b[1]}" class="flujo" marker-end="url(#punta)"/>
      <text x="${lx}" y="${ly+4}" class="flujo-t">${esc(f.etiqueta)}</text>`; };
  // Long names wrap onto two lines at the word nearest the middle.
  const lineas = t => { if(t.length<=16) return [t]; const w=t.split(' '); let best=[t], dif=1e9;
    for(let i=1;i<w.length;i++){ const A=w.slice(0,i).join(' '), B=w.slice(i).join(' '), dd=Math.abs(A.length-B.length); if(dd<dif){dif=dd; best=[A,B];} } return best; };
  const g = progSector(m);
  return `<svg viewBox="-40 -30 ${W+80} ${H+60}" class="esq2d" role="img" aria-label="Esquema de ${esc(s.nombre)} en ${esc(PAISES[PAIS].nombre)}">
    <defs><marker id="punta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#7d8ca3"/></marker></defs>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" class="anillo"/>
    ${m.patas.map(p=>`<line x1="${cx}" y1="${cy}" x2="${pos[p.id][0]}" y2="${pos[p.id][1]}" class="radio"/>`).join('')}
    ${m.flujos.map(flecha).join('')}
    <a href="${link({s:null})}"><circle cx="${cx}" cy="${cy}" r="74" class="hub ${!SUB?'on':''}"/>
      <text x="${cx}" y="${cy-12}" class="hub-t">${esc(s.nombre)}</text>
      <text x="${cx}" y="${cy+15}" class="hub-p" fill="${colorProg(g)}">${pct(g)}</text>
      <text x="${cx}" y="${cy+33}" class="hub-s">hacia el ideal</text></a>
    ${m.patas.map(p=>{ const [x,y]=pos[p.id], v=progPata(p), L=lineas(p.nombre);
      return `<a href="${link({s:SUB===p.id?null:p.id})}" class="nodo ${SUB===p.id?'on':''} ${SUB&&SUB!==p.id?'apagado':''}">
        <rect x="${x-NW/2}" y="${y-NH/2}" width="${NW}" height="${NH}" rx="14"/>
        ${L.map((t,i)=>`<text x="${x}" y="${y-(L.length===2?20:9)+i*16}" class="nodo-t ${L.length===2?'dos':''}">${esc(t)}</text>`).join('')}
        <rect x="${x-62}" y="${y+12}" width="124" height="8" rx="4" class="barra-f"/>
        <rect x="${x-62}" y="${y+12}" width="${124*(v??0)}" height="8" rx="4" fill="${colorProg(v)}"/>
        <text x="${x}" y="${y+32}" class="nodo-p">${pct(v)}</text></a>`; }).join('')}
  </svg>`;
}

function esquema(s, m){
  const p = m.patas.find(x=>x.id===SUB);
  const ruta3d = `esquema:${s.id}:${PAIS}${SUB?':'+SUB:''}`;
  return `<div class="esquema">
    <div class="esq-barra"><span class="esq-pais">${esc(PAISES[PAIS].nombre)} · modelo país</span>
      <span class="conmuta"><a href="${link({v:'2d'})}" class="${VISTA==='2d'?'on':''}">2D</a><a href="${link({v:'3d'})}" class="${VISTA==='3d'?'on':''}">3D</a></span></div>
    ${VISTA==='3d' ? `<div class="visor"><iframe src="vision3d.html?embed#${ruta3d}" title="Esquema 3D"></iframe>
        <button class="btn-mini completa" onclick="abrir3D('${ruta3d}')">⛶ Pantalla completa</button></div>` : esquema2D(s, m)}
    <div class="esq-leyenda"><span><i style="background:#c0504d"></i>lejos del ideal</span><span><i style="background:#d9962b"></i>a medio camino</span><span><i style="background:#3d8a5f"></i>cerca del ideal</span><span class="nota">% = avance medio de sus indicadores hacia el objetivo · pincha una pata</span></div>
  </div>
  ${p ? detallePata(p) : detalleGeneral(s, m)}`;
}

function detalleGeneral(s, m){
  return `<div class="esq-detalle">
    <h3>${esc(m.vision.titulo)}</h3>
    <div class="equilibrio">⚖ ${esc(m.vision.equilibrio)}</div>
    <ul class="lista">${m.vision.ideal.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
    <div class="patas">${m.patas.map(p=>{ const v=progPata(p); return `<a class="pata" href="${link({s:p.id})}">
      <b>${esc(p.nombre)}</b><small>${esc(p.que_es||'')}</small>
      <span class="barra"><i style="width:${(v??0)*100}%;background:${colorProg(v)}"></i></span><em>${pct(v)}</em></a>`; }).join('')}</div>
  </div>`;
}

function detallePata(p){
  return `<div class="esq-detalle">
    <div class="equilibrio">⚖ ${esc(p.equilibrio)}</div>
    <div class="hoy-ideal">
      <div><h4>Hoy en ${esc(PAISES[PAIS].nombre)}</h4><ul class="lista">${(p.actual||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="ideal"><h4>Ideal</h4><ul class="lista">${(p.ideal||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
    </div>
    ${(p.indicadores||[]).length ? `<h4>Indicadores</h4><div class="indicadores">${p.indicadores.map(i=>{ const v=progreso(i);
      return `<div class="ind"><span class="ind-n">${esc(i.nombre)}</span>
        <span class="barra"><i style="width:${(v??0)*100}%;background:${colorProg(v)}"></i></span>
        <span class="ind-v"><b>${num(i.actual)}</b> → ${num(i.objetivo)} ${esc(i.unidad||'')}</span>
        <small>${esc(i.año||'')}${i.origen_objetivo?` · objetivo: ${esc(i.origen_objetivo)}`:''}${i.fuente_url?` · <a href="${esc(i.fuente_url)}" target="_blank" rel="noopener">fuente</a>`:''}</small></div>`; }).join('')}</div>` : ''}
  </div>`;
}

// The scale icon at the left of the white panel, near the scales menu.
const insignia = () => '';   // the scale icon in the panel was removed (2026-11-16): the left menu already shows it

function sector(){
  const s = SECTORES.find(x=>x.id===SECTOR);
  // With «Todo», empty pillars are not drawn one by one: a single line lists them at the end.
  const visibles = PIL ? PILARES.filter(x=>x.id===PIL) : PILARES.filter(p=>cuentaPilar(s,p.id));
  const vacios = PIL ? [] : PILARES.filter(p=>!cuentaPilar(s,p.id) && !(modelo(s) && p.id==='vision'));
  const m = modelo(s);
  $('#app').innerHTML = `
  ${!PIL || PIL==='vision' ? (m ? esquema(s, m) : visor3D(s)) : ''}
  ${visibles.filter(p=>!(m && p.id==='vision')).map(p=>`
  <section class="seccion" style="--c:${p.c}">
    ${PIL ? '' : `<h2 class="sec-tit">${p.nombre}</h2>`}
    ${cuentaPilar(s,p.id) ? render[p.id](s) : vacio(p)}
  </section>`).join('')}
  ${vacios.length ? `<div class="vacio">Aún sin contenido aquí: ${vacios.map(p=>p.nombre).join(', ')}.</div>` : ''}
  ${(s.preguntas||[]).length ? `<details class="preguntas"><summary>Preguntas abiertas para el equipo</summary><ul>${s.preguntas.map(q=>`<li>${esc(q)}</li>`).join('')}</ul></details>`:''}`;
}

const vacio = p => `<div class="vacio">Pendiente: todavía no hay ${p.nombre.toLowerCase()} aquí.</div>`;

function intro(pid, s){
  return {
    vision: s.vision.intro || 'Cómo sería este sector si funcionara de forma ideal para todos los seres.',
    retos: 'Problemas, conflictos y dificultades identificados que nos alejan de la visión ideal.',
    soluciones: 'Conocimiento y técnicas agregadas que permiten superar los retos.',
    proyectos: 'Proyectos humanos reales que implementan las soluciones y se acercan al ideal.'
  }[pid];
}

const enlace = (u, t) => u ? ` <a class="ext" href="${esc(u)}" target="_blank" rel="noopener">${t}</a>` : '';
const render = {
  // Vision: each block as a short heading with its bullet points; the artwork closes the section.
  vision: (s, compacto) => `
    ${deEscala(s.vision.bloques).map(b=>`
      <div class="bloque"><h3>${esc(b.titulo)}</h3>
        <ul>${(b.puntos?.length ? b.puntos : [corto(b.texto)]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}
    ${s.vision.arte && !compacto ? `<figure class="arte"><a href="${esc(s.vision.arte.grande)}" target="_blank" rel="noopener"><img src="${esc(s.vision.arte.src)}" alt="Ilustración «${esc(s.vision.arte.tema)}»"></a>
      <figcaption>«${esc(s.vision.arte.tema)}» · <a href="/calendario-arte">Calendario Arte para la Humanidad 2027</a></figcaption></figure>` : ''}`,
  retos: s => `<ul class="lista">${deEscala(s.retos).map(r=>`<li><b>${esc(r.titulo)}.</b> ${esc(corto(r.texto))}${enlace(r.fuente,'fuente')}</li>`).join('')}</ul>`,
  soluciones: s => `<ul class="lista">${deEscala(s.soluciones).map(r=>`<li><b>${esc(r.titulo)}.</b> ${esc(corto(r.texto))}${enlace(r.fuente,'fuente')}</li>`).join('')}</ul>`,
  proyectos: s => `<ul class="lista">${deEscala(s.proyectos).map(r=>`<li><b>${esc(r.nombre)}</b>${r.lugar?` <span class="lugar">${esc(r.lugar)}</span>`:''}. ${esc(corto(r.texto))}${enlace(r.web,'web')}</li>`).join('')}</ul>`
};

function abrir3D(escena){
  $('#frame3d').src = 'vision3d.html#' + escena;
  $('#overlay3d').classList.add('on');
}
function cerrar3D(){ $('#overlay3d').classList.remove('on'); $('#frame3d').src='about:blank'; }
document.addEventListener('keydown', e=>{ if(e.key==='Escape') cerrar3D(); });

let ultimaVista = '';
function route(){
  const [ruta, consulta=''] = (location.hash || '#/').slice(1).split('?');
  const qs = new URLSearchParams(consulta);
  const [, tipo, id, pilarRuta] = ruta.split('/');
  const e = qs.get('e');
  ESC = !e ? ESC_DEFECTO : ESCALAS.some(x=>x.id===e) ? e : null;   // 'todas' (or anything unknown) = all scales
  PAIS = PAISES[qs.get('c')] ? qs.get('c') : 'es';
  VISTA = qs.get('v')==='3d' ? '3d' : '2d';
  // Old links carried the pillar in the path (#/sector/x/retos): still understood.
  const p = qs.get('p') || pilarRuta;
  PIL = PILARES.some(x=>x.id===p) ? p : null;
  SECTOR = tipo==='sector' && SECTORES.some(s=>s.id===id) ? id : null;
  const sec = SECTORES.find(x=>x.id===SECTOR);
  SUB = sec?.subtemas?.some(t=>t.id===qs.get('s')) ? qs.get('s') : null;
  nav(); menuSubtemas(); menuEscalas(); menuPilares();
  SECTOR ? sector() : home();
  $('#escalas').classList.toggle('con-eleccion', true);
  $('#pilares').classList.toggle('con-eleccion', true);
  altoCabecera();
  // Phones: the rows scroll sideways, so bring the chosen sector and part into view.
  if(matchMedia('(max-width:900px)').matches) document.querySelectorAll('.fila .on').forEach(e=>e.scrollIntoView({block:'nearest', inline:'center'}));
  // Jump to the top when the page or the pillar changes, not when only the scale changes.
  const vista = ruta.split('/').slice(0,3).join('/') + '|' + PIL;
  if(vista !== ultimaVista) window.scrollTo(0,0);
  ultimaVista = vista;
}
// The side menus stick just below the header, whose height changes with what it shows.
function altoCabecera(){ document.body.style.setProperty('--alto-cab', $('header.top').offsetHeight + 'px'); }
addEventListener('resize', altoCabecera);
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);

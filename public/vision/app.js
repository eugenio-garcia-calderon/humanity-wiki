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
let ESC = null;   // selected scale id, or null = all scales
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
function link({sector=SECTOR, e=ESC, p=PIL, s}={}){
  if(s === undefined) s = sector===SECTOR ? SUB : null;   // a part belongs to its sector
  const qs = new URLSearchParams(); if(s && sector) qs.set('s', s); if(e) qs.set('e', e); if(p) qs.set('p', p);
  return `#${sector?`/sector/${sector}`:'/'}${qs.toString()?'?'+qs:''}`;
}
const cuentaPilar = (s, pid) => pid==='vision' ? deEscala(s.vision.bloques).length : deEscala(s[pid]).length;
const nombreEscala = () => ESCALAS.find(e=>e.id===ESC)?.nombre;
const total = s => deEscala(s.vision.bloques).length + deEscala(s.retos).length + deEscala(s.soluciones).length + deEscala(s.proyectos).length;

function nav(){
  $('#nav').innerHTML = SECTORES.map(s =>
    `<a href="${link({sector:s.id})}" class="${s.id===SECTOR?'on':''}">${esc(s.nombre)}</a>`).join('');
  $('#nav').classList.toggle('con-eleccion', !!SECTOR);
  $('#nav .on')?.scrollIntoView({block:'nearest', inline:'center'});
}

function menuSubtemas(){
  const s = SECTORES.find(x=>x.id===SECTOR);
  const el = $('#subnav');
  if(!s || !(s.subtemas||[]).length){ el.innerHTML=''; el.hidden=true; return; }
  el.hidden=false;
  el.innerHTML = `<div class="wrap ancho">
    <a href="${link({s:null})}" class="${!SUB?'on':''}">Todo</a>
    ${s.subtemas.map(t=>`<a href="${link({s:t.id})}" class="${t.id===SUB?'on':''}">${esc(t.nombre)}</a>`).join('')}</div>`;
  el.querySelector('.on')?.scrollIntoView({block:'nearest', inline:'center'});
}

// What is selected, centred at the top: the sector big, and under it the part, scale and content type.
function seleccion(){
  const s = SECTORES.find(x=>x.id===SECTOR);
  const p = PILARES.find(x=>x.id===PIL);
  const chip = (txt, quitar, extra='') => `<span class="chip" ${extra}>${txt}<a href="${quitar}" title="Quitar">×</a></span>`;
  const chips = [
    s && SUB && chip(esc(nombreSub(s)), link({s:null})),
    ESC && chip(`${iconoEscala(ESC)}${esc(nombreEscala())}`, link({e:null}), 'data-t="escala"'),
    p && chip(esc(p.nombre), link({p:null}), `style="--c:${p.c}" data-t="pilar"`)
  ].filter(Boolean);
  $('#seleccion').innerHTML = `<div class="sel-tit">${s ? esc(s.nombre) : 'Los 12 sectores'}</div>
    <div class="sel-linea">${chips.length ? chips.join('') : '<span class="sel-ayuda">Elige parte, escala o tipo de contenido en los menús</span>'}</div>`;
}

function menuEscalas(){
  const sectores = SECTOR ? SECTORES.filter(s=>s.id===SECTOR) : SECTORES;
  const cuenta = id => sectores.reduce((n,s)=>n+['retos','soluciones','proyectos'].reduce((m,k)=>m+s[k].filter(x=>(x.escalas||[]).includes(id)).length,0)
    + s.vision.bloques.filter(b=>(b.escalas||[]).includes(id)).length, 0);
  $('#escalas').innerHTML = `
    <div class="esc-tit">Escalas</div>
    <a href="${link({e:null})}" class="todas ${!ESC?'on':''}">${icono(0)}<span><b>Todas las escalas</b><small>De la persona al planeta</small></span></a>
    ${ESCALAS.map((e,i)=>`<a href="${link({e:e.id})}" class="${e.id===ESC?'on':''}">${icono(i+1)}<span><b>${e.nombre}</b><small>${e.desc}</small></span><em>${cuenta(e.id)}</em></a>`).join('')}`;
  // On phones the menu is a sideways strip: keep the chosen scale in view.
  if(matchMedia('(max-width:900px)').matches) $('#escalas .on')?.scrollIntoView({block:'nearest', inline:'center'});
}

const ICONOS_PILAR = {
  todo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></svg>',
  vision:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  retos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 20h18L12 4z"/><path d="M12 10v4M12 17h.01"/></svg>',
  soluciones:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
  proyectos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/></svg>'
};
function menuPilares(){
  const sectores = SECTOR ? SECTORES.filter(s=>s.id===SECTOR) : SECTORES;
  const n = pid => sectores.reduce((a,s)=>a+cuentaPilar(s,pid),0);
  $('#pilares').innerHTML = `
    <div class="esc-tit">Ver</div>
    <a href="${link({p:null})}" class="todo ${!PIL?'on':''}" style="--c:var(--ink)">${ICONOS_PILAR.todo}<span><b>Todo</b><small>Visión, retos, soluciones y proyectos</small></span></a>
    ${PILARES.map(p=>`<a href="${link({p:p.id})}" class="${p.id===PIL?'on':''}" style="--c:${p.c}">${ICONOS_PILAR[p.id]}<span><b>${p.nombre}</b><small>${p.desc}</small></span><em>${n(p.id)}</em></a>`).join('')}`;
  if(matchMedia('(max-width:1150px)').matches) $('#pilares .on')?.scrollIntoView({block:'nearest', inline:'center'});
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
  if(ESC) return ESCALAS.find(e=>e.id===ESC).escena;      // País, Continente, Planeta: no model yet
  return (SUB && ESCENA_SUBTEMA[s.id]?.[SUB]) || s.vision.escena3d || null;
}
const nombreSub = s => s.subtemas?.find(t=>t.id===SUB)?.nombre;
function visor3D(s){
  const escena = escenaActual(s);
  if(!escena) return `<div class="visor pendiente"><div>${ICON3D}<b>Modelo 3D pendiente</b></div></div>`;
  return `<div class="visor"><iframe src="vision3d.html?embed#${escena}" title="Visión en 3D" loading="lazy"></iframe>
    <button class="btn-mini completa" onclick="abrir3D('${escena}')">⛶ Pantalla completa</button></div>`;
}

// The scale icon at the left of the white panel, near the scales menu.
const insignia = () => ESC ? `<div class="insignia" title="Escala: ${esc(nombreEscala())}">${iconoEscala(ESC)}<span>${esc(nombreEscala())}</span></div>` : '';

function sector(){
  const s = SECTORES.find(x=>x.id===SECTOR);
  const visibles = PIL ? PILARES.filter(x=>x.id===PIL) : PILARES;
  $('#app').innerHTML = `${insignia()}
  ${!PIL || PIL==='vision' ? visor3D(s) : ''}
  ${visibles.map(p=>`
  <section class="seccion" style="--c:${p.c}">
    ${PIL ? '' : `<h2 class="sec-tit">${p.nombre}</h2>`}
    ${cuentaPilar(s,p.id) ? render[p.id](s) : vacio(p)}
  </section>`).join('')}
  ${(s.preguntas||[]).length ? `<div class="preguntas"><h3>Preguntas abiertas</h3><ul>${s.preguntas.map(q=>`<li>${esc(q)}</li>`).join('')}</ul></div>`:''}`;
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
  ESC = ESCALAS.some(x=>x.id===qs.get('e')) ? qs.get('e') : null;
  // Old links carried the pillar in the path (#/sector/x/retos): still understood.
  const p = qs.get('p') || pilarRuta;
  PIL = PILARES.some(x=>x.id===p) ? p : null;
  SECTOR = tipo==='sector' && SECTORES.some(s=>s.id===id) ? id : null;
  const sec = SECTORES.find(x=>x.id===SECTOR);
  SUB = sec?.subtemas?.some(t=>t.id===qs.get('s')) ? qs.get('s') : null;
  nav(); seleccion(); menuSubtemas(); menuEscalas(); menuPilares();
  SECTOR ? sector() : home();
  $('#escalas').classList.toggle('con-eleccion', true);
  $('#pilares').classList.toggle('con-eleccion', true);
  altoCabecera();
  // Jump to the top when the page or the pillar changes, not when only the scale changes.
  const vista = ruta.split('/').slice(0,3).join('/') + '|' + PIL + '|' + SUB;
  if(vista !== ultimaVista) window.scrollTo(0,0);
  ultimaVista = vista;
}
// The side menus stick just below the header, whose height changes with what it shows.
function altoCabecera(){ document.body.style.setProperty('--alto-cab', $('header.top').offsetHeight + 'px'); }
addEventListener('resize', altoCabecera);
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);

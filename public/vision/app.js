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
let SECTOR = null;

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ICON3D = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 22V12M21 7l-9 5-9-5"/></svg>';
// Concentric rings: one ring per step up the scale, so the icon grows from person to planet.
const icono = n => `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true">${Array.from({length:Math.min(n,4)},(_,k)=>
  `<circle cx="12" cy="12" r="${3+k*2.8}" fill="${k===0?'currentColor':'none'}" stroke="currentColor" stroke-width="1.4" opacity="${1-k*.18}"/>`).join('')}${n>4?`<circle cx="12" cy="12" r="11.2" fill="none" stroke="currentColor" stroke-width="${(n-4)*.6}" stroke-dasharray="${n>6?'none':'2 2'}"/>`:''}</svg>`;

const deEscala = list => ESC ? (list||[]).filter(x => (x.escalas||[]).includes(ESC)) : (list||[]);
// Every link keeps the current scale and pillar unless told otherwise.
function link({sector=SECTOR, e=ESC, p=PIL}={}){
  const qs = new URLSearchParams(); if(e) qs.set('e', e); if(p) qs.set('p', p);
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
  <h2 class="sec">12 sectores${ESC?` · escala ${esc(nombreEscala())}`:''}</h2>
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
  $('#app').innerHTML = `
  <div class="sector-head"><div>
    <div class="nota"><a href="${link({p:null})}">Inicio</a> · 12 sectores${ESC?` · <span class="chip-esc">Escala: ${esc(nombreEscala())} <a href="${link({e:null})}" title="Ver todas las escalas">×</a></span>`:''}</div>
    <h1 style="color:${p.c}">${p.nombre}</h1><p>${esc(p.desc)} · ${intro(p.id,{vision:{}})}</p></div></div>
  ${conAlgo.length ? conAlgo.map(s=>`
    <section class="grupo" style="--c:${p.c}">
      <h2><a href="${link({sector:s.id})}">${esc(s.nombre)}</a><span class="cnt">${cuentaPilar(s,p.id)}</span></h2>
      ${render[p.id](s, true)}
    </section>`).join('') : `<div class="vacio">Todavía no hay ${p.nombre.toLowerCase()} a escala <b>${esc(nombreEscala())}</b> en ningún sector.</div>`}`;
}

function sector(){
  const s = SECTORES.find(x=>x.id===SECTOR);
  const escena = (ESC && ESCALAS.find(e=>e.id===ESC).escena) || s.vision.escena3d;
  const visibles = PIL ? PILARES.filter(x=>x.id===PIL) : PILARES;
  $('#app').innerHTML = `
  <div class="sector-head">
    <div>
      <div class="nota"><a href="${link({sector:null})}">Inicio</a> · Sector${ESC?` · <span class="chip-esc">Escala: ${esc(nombreEscala())} <a href="${link({e:null})}" title="Ver todas las escalas">×</a></span>`:''}</div>
      <h1>${esc(s.nombre)}</h1>
      <p>${esc(s.ambito || s.resumen)}</p>
    </div>
    ${escena ? `<button class="btn3d" onclick="abrir3D('${escena}')">${ICON3D} VER LA VISIÓN EN 3D</button>`:''}
  </div>
  ${visibles.map(p=>`
  <section class="seccion" style="--c:${p.c}">
    <div class="pilar-intro"><div><b>${p.nombre}${ESC?` · escala ${esc(nombreEscala())}`:''}</b> <span class="cnt">${cuentaPilar(s,p.id)}</span><p>${esc(intro(p.id, s))}</p></div></div>
    ${cuentaPilar(s,p.id) || p.id==='vision' ? render[p.id](s) : vacio(p)}
  </section>`).join('')}
  ${(s.preguntas||[]).length ? `<div class="preguntas"><h3>Preguntas abiertas para completar este sector</h3><ol>${s.preguntas.map(q=>`<li>${esc(q)}</li>`).join('')}</ol></div>`:''}`;
}

const vacio = p => `<div class="vacio">Todavía no hay ${p.nombre.toLowerCase()} de este sector a escala <b>${esc(nombreEscala())}</b>.
  Es un hueco por llenar: si conoces alguno, compártelo con el equipo de humanity.wiki.
  <a href="${link({e:null})}">Ver todas las escalas</a></div>`;

function intro(pid, s){
  return {
    vision: s.vision.intro || 'Cómo sería este sector si funcionara de forma ideal para todos los seres.',
    retos: 'Problemas, conflictos y dificultades identificados que nos alejan de la visión ideal.',
    soluciones: 'Conocimiento y técnicas agregadas que permiten superar los retos.',
    proyectos: 'Proyectos humanos reales que implementan las soluciones y se acercan al ideal.'
  }[pid];
}

const etiquetas = x => (x.escalas||[]).length && (x.escalas||[]).length < 8
  ? `<div class="escs">${x.escalas.map(e=>`<span class="${e===ESC?'on':''}">${esc(ESCALAS.find(z=>z.id===e)?.nombre)}</span>`).join('')}</div>` : '';
const fuente = u => u ? ` · <a href="${esc(u)}" target="_blank" rel="noopener">fuente</a>` : '';
const render = {
  vision: (s, compacto) => `
    ${s.vision.arte && !compacto?`<figure class="arte"><a href="${esc(s.vision.arte.grande)}" target="_blank" rel="noopener"><img src="${esc(s.vision.arte.src)}" alt="Ilustración «${esc(s.vision.arte.tema)}»"></a>
      <figcaption>«${esc(s.vision.arte.tema)}» · Ilustración del <a href="/calendario-arte">Calendario Arte para la Humanidad 2027</a> · Luz &amp; Humanidad</figcaption></figure>`:''}
    ${deEscala(s.vision.bloques).length || compacto ? '' : vacio(PILARES[0])}
    ${deEscala(s.vision.bloques).map(b=>`
      <div class="bloque">
        <div class="acc"><h3>${esc(b.titulo)}</h3>
          ${b.escena3d?`<button class="btn-mini" onclick="abrir3D('${b.escena3d}')">${'Ver en 3D →'}</button>`:''}</div>
        ${etiquetas(b)}
        ${b.texto?`<p class="lead">${esc(b.texto)}</p>`:''}
        ${b.puntos?.length?`<ul>${b.puntos.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
        ${b.imagenes?.length?`<div class="galeria">${b.imagenes.map(im=>`
          <figure><img loading="lazy" src="${esc(im.src)}" alt="${esc(im.titulo)}" onerror="this.outerHTML='<div class=&quot;sinimg&quot;>Imagen no disponible</div>'">
          <figcaption><b>${esc(im.titulo)}</b><small>${esc(im.lugar||'')}</small>${im.fuente?`<br><a href="${esc(im.fuente)}" target="_blank" rel="noopener">Wikimedia Commons</a>`:''}</figcaption></figure>`).join('')}</div>`:''}
      </div>`).join('')}
    ${compacto?'':`<div class="equipo"><b>Equipo de la visión.</b> ${esc(s.vision.equipo || 'Un equipo humano recopila esta visión y la comunica a través del arte digital y físico para que sea accesible a todos los seres humanos.')}</div>`}`,
  retos: s => `<div class="items">${deEscala(s.retos).map(r=>`
    <div class="item"><span class="amb">${esc(r.ambito||'General')}</span><h4>${esc(r.titulo)}</h4><p>${esc(r.texto)}</p>${etiquetas(r)}<div class="meta">${fuente(r.fuente).replace(/^ · /,'')}</div></div>`).join('')}</div>`,
  soluciones: s => `<div class="items">${deEscala(s.soluciones).map(r=>`
    <div class="item"><span class="amb">${esc(r.ambito||'General')}</span><h4>${esc(r.titulo)}</h4><p>${esc(r.texto)}</p>${r.supera?`<div class="meta">Supera: ${esc(r.supera)}</div>`:''}${etiquetas(r)}<div class="meta">${fuente(r.fuente).replace(/^ · /,'')}</div></div>`).join('')}</div>`,
  proyectos: s => `<div class="items">${deEscala(s.proyectos).map(r=>`
    <div class="item"><span class="amb">${esc(r.lugar||'')}</span><h4>${esc(r.nombre)}</h4>
    <div>${r.tipo?`<span class="tag">${esc(r.tipo)}</span>`:''}</div><p>${esc(r.texto)}</p>${etiquetas(r)}
    <div class="meta">${r.web?`<a href="${esc(r.web)}" target="_blank" rel="noopener">${esc(r.web.replace(/^https?:\/\//,''))}</a>`:''}${r.web?fuente(r.fuente):fuente(r.fuente).replace(/^ · /,'')}</div></div>`).join('')}</div>`
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
  nav(); menuEscalas(); menuPilares();
  SECTOR ? sector() : home();
  $('#escalas').classList.toggle('con-eleccion', true);
  $('#pilares').classList.toggle('con-eleccion', true);
  // Jump to the top when the page or the pillar changes, not when only the scale changes.
  const vista = ruta.split('/').slice(0,3).join('/') + '|' + PIL;
  if(vista !== ultimaVista) window.scrollTo(0,0);
  ultimaVista = vista;
}
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);

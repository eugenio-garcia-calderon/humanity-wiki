// Humanity.wiki — prototipo local. Router por hash: #/  y  #/sector/<id>/<pilar>
const PILARES = [
  {id:'vision', nombre:'Visión ideal', c:'var(--vision)', desc:'Comunicada a través de las bellas artes'},
  {id:'retos', nombre:'Retos', c:'var(--retos)', desc:'Lo que nos aleja del ideal'},
  {id:'soluciones', nombre:'Soluciones', c:'var(--soluciones)', desc:'Conocimiento y técnicas que nos acercan'},
  {id:'proyectos', nombre:'Proyectos', c:'var(--proyectos)', desc:'Quienes hacen realidad la visión'}
];
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ICON3D = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 22V12M21 7l-9 5-9-5"/></svg>';

function nav(activeId){
  $('#nav').innerHTML = SECTORES.map(s =>
    `<a href="#/sector/${s.id}" class="${s.id===activeId?'on':''}">${esc(s.nombre)}</a>`).join('');
}

function home(){
  nav(null);
  $('#app').innerHTML = `
  <section class="hero">
    <h1>La visión ideal de miles de seres, en cada área de la vida.</h1>
    <p>Humanity.wiki recopila y divulga la visión ideal de cada sector vital, los retos que nos impiden alcanzarla,
    las soluciones que superan esos retos y los proyectos humanos que las hacen realidad.</p>
  </section>
  <div class="pilares">
    ${PILARES.map(p=>`<div class="pilar" style="--c:${p.c}"><b>${p.nombre}</b><small>${p.desc}</small></div>`).join('')}
  </div>
  <h2 class="sec">12 sectores</h2>
  <div class="grid">
    ${SECTORES.map((s,i)=>`
      <a class="card" href="#/sector/${s.id}">
        <span class="n">${String(i+1).padStart(2,'0')}</span>
        <h3>${esc(s.nombre)}</h3>
        <p>${esc(s.resumen)}</p>
        <span class="estado ${s.estado}">${s.estado==='completo'?'Contenido completo':'Borrador · 1 ejemplo por pilar'}</span>
      </a>`).join('')}
  </div>`;
}

function sector(id, pilar='vision'){
  const s = SECTORES.find(x=>x.id===id); if(!s) return home();
  nav(id);
  const p = PILARES.find(x=>x.id===pilar) || PILARES[0];
  const cnt = {vision:(s.vision.bloques||[]).length, retos:s.retos.length, soluciones:s.soluciones.length, proyectos:s.proyectos.length};
  $('#app').innerHTML = `
  <div class="sector-head">
    <div>
      <div class="nota"><a href="#/">Inicio</a> · Sector</div>
      <h1>${esc(s.nombre)}</h1>
      <p>${esc(s.ambito || s.resumen)}</p>
    </div>
    ${s.vision.escena3d ? `<button class="btn3d" onclick="abrir3D('${s.vision.escena3d}')">${ICON3D} VER LA VISIÓN EN 3D</button>`:''}
  </div>
  <div class="tabs">
    ${PILARES.map(x=>`<button style="--c:${x.c}" class="${x.id===p.id?'on':''}" onclick="location.hash='#/sector/${s.id}/${x.id}'">${x.nombre}<span class="cnt">${cnt[x.id]}</span></button>`).join('')}
  </div>
  <div style="--c:${p.c}">
    <div class="pilar-intro"><div><b>${p.nombre}</b><p>${esc(intro(p.id, s))}</p>
      <div class="flow"><i style="--c:var(--vision)">Visión</i>→<i style="--c:var(--retos)">Retos</i>→<i style="--c:var(--soluciones)">Soluciones</i>→<i style="--c:var(--proyectos)">Proyectos</i></div></div></div>
    ${render[p.id](s)}
  </div>
  ${(s.preguntas||[]).length ? `<div class="preguntas"><h3>Preguntas abiertas para completar este sector</h3><ol>${s.preguntas.map(q=>`<li>${esc(q)}</li>`).join('')}</ol></div>`:''}`;
  window.scrollTo(0,0);
}

function intro(pid, s){
  return {
    vision: s.vision.intro || 'Cómo sería este sector si funcionara de forma ideal para todos los seres.',
    retos: 'Problemas, conflictos y dificultades identificados que nos alejan de la visión ideal.',
    soluciones: 'Conocimiento y técnicas agregadas que permiten superar los retos.',
    proyectos: 'Proyectos humanos reales que implementan las soluciones y se acercan al ideal.'
  }[pid];
}

const fuente = u => u ? ` · <a href="${esc(u)}" target="_blank" rel="noopener">fuente</a>` : '';
const render = {
  vision: s => `
    ${(s.vision.bloques||[]).map(b=>`
      <div class="bloque">
        <div class="acc"><h3>${esc(b.titulo)}</h3>
          ${b.escena3d?`<button class="btn-mini" onclick="abrir3D('${b.escena3d}')">${'Ver en 3D →'}</button>`:''}</div>
        ${b.texto?`<p class="lead">${esc(b.texto)}</p>`:''}
        ${b.puntos?.length?`<ul>${b.puntos.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
        ${b.imagenes?.length?`<div class="galeria">${b.imagenes.map(im=>`
          <figure><img loading="lazy" src="${esc(im.src)}" alt="${esc(im.titulo)}" onerror="this.outerHTML='<div class=&quot;sinimg&quot;>Imagen no disponible</div>'">
          <figcaption><b>${esc(im.titulo)}</b><small>${esc(im.lugar||'')}</small>${im.fuente?`<br><a href="${esc(im.fuente)}" target="_blank" rel="noopener">Wikimedia Commons</a>`:''}</figcaption></figure>`).join('')}</div>`:''}
      </div>`).join('')}
    <div class="equipo"><b>Equipo de la visión.</b> ${esc(s.vision.equipo || 'Un equipo humano recopila esta visión y la comunica a través del arte digital y físico para que sea accesible a todos los seres humanos.')}</div>`,
  retos: s => `<div class="items">${s.retos.map(r=>`
    <div class="item"><span class="amb">${esc(r.ambito||'General')}</span><h4>${esc(r.titulo)}</h4><p>${esc(r.texto)}</p><div class="meta">${fuente(r.fuente).replace(/^ · /,'')}</div></div>`).join('')}</div>`,
  soluciones: s => `<div class="items">${s.soluciones.map(r=>`
    <div class="item"><span class="amb">${esc(r.ambito||'General')}</span><h4>${esc(r.titulo)}</h4><p>${esc(r.texto)}</p>${r.supera?`<div class="meta">Supera: ${esc(r.supera)}</div>`:''}<div class="meta">${fuente(r.fuente).replace(/^ · /,'')}</div></div>`).join('')}</div>`,
  proyectos: s => `<div class="items">${s.proyectos.map(r=>`
    <div class="item"><span class="amb">${esc(r.lugar||'')}</span><h4>${esc(r.nombre)}</h4>
    <div>${r.tipo?`<span class="tag">${esc(r.tipo)}</span>`:''}</div><p>${esc(r.texto)}</p>
    <div class="meta">${r.web?`<a href="${esc(r.web)}" target="_blank" rel="noopener">${esc(r.web.replace(/^https?:\/\//,''))}</a>`:''}${r.web?fuente(r.fuente):fuente(r.fuente).replace(/^ · /,'')}</div></div>`).join('')}</div>`
};

function abrir3D(escena){
  $('#frame3d').src = 'vision3d.html#' + escena;
  $('#overlay3d').classList.add('on');
}
function cerrar3D(){ $('#overlay3d').classList.remove('on'); $('#frame3d').src='about:blank'; }
document.addEventListener('keydown', e=>{ if(e.key==='Escape') cerrar3D(); });

function route(){
  const [, tipo, id, pilar] = (location.hash || '#/').split('/');
  if(tipo==='sector') sector(id, pilar); else home();
}
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);

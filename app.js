const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const opening = document.querySelector('#opening');
const spacer = document.querySelector('#intro-spacer');
const header = document.querySelector('#header');
let introDismissed = reducedMotion || Boolean(location.hash);
let stopFire = () => {};
let introTimer;
spacer.hidden = true;
history.scrollRestoration = 'manual';
function dismissIntro(instant = false) {
  if (introDismissed && !instant) return;
  introDismissed = true;
  if (instant) {
    clearTimeout(introTimer);
    document.body.classList.remove('intro-pending','intro-transitioning');
    stopFire();
  } else {
    document.body.classList.add('intro-transitioning');
    // Finish independently of scroll distance, including in a background tab.
    introTimer = setTimeout(finishIntro, 1950);
  }
  opening.classList.add(instant ? 'inactive' : 'leaving');
  opening.setAttribute('aria-hidden', 'true');
  header.style.opacity = '1';
  header.inert = false;
  document.querySelector('#home').inert = false;
  document.querySelector('footer').inert = false;
  if (opening.contains(document.activeElement)) {
    const heading = document.querySelector('#hero h1');
    heading.tabIndex = -1; heading.focus({preventScroll:true});
  }
}
function finishIntro() {
  clearTimeout(introTimer);
  opening.classList.add('inactive');
  document.body.classList.remove('intro-pending','intro-transitioning');
  stopFire();
}
opening.addEventListener('animationend', event => {
  if (event.target === opening && event.animationName === 'opening-reveal' && introDismissed) {
    finishIntro();
  }
});
document.querySelector('#enter-button').addEventListener('click', () => dismissIntro());
addEventListener('wheel', event => {
  if (!introDismissed && event.deltaY > 0) {event.preventDefault();dismissIntro();}
}, {passive:false});
let touchY = 0;
opening.addEventListener('touchstart', event => {touchY=event.touches[0].clientY;}, {passive:true});
opening.addEventListener('touchmove', event => {
  if (!introDismissed && touchY-event.touches[0].clientY > 12) {event.preventDefault();dismissIntro();}
}, {passive:false});
addEventListener('keydown', event => {
  if (!introDismissed && ['ArrowDown','PageDown',' ','End'].includes(event.key)) {event.preventDefault();dismissIntro();}
});
if (introDismissed) dismissIntro(true);
else {
  scrollTo({top:0,behavior:'instant'});
  document.body.classList.add('intro-pending'); header.inert = true;
  document.querySelector('#home').inert = true; document.querySelector('footer').inert = true;
}
if (!introDismissed) stopFire = createLogoFire(document.querySelector('#logo-fire'));
const home = document.querySelector('#home');
const reading = document.querySelector('#reading');
const locality = document.querySelector('#locality');
const age = document.querySelector('#age');
const navigation = document.querySelector('#navigation');
const menu = document.querySelector('#menu-button');
const parser = new DOMParser();
let records = [];
let sedes = [];
let observer;
const escapeHTML = text => String(text).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const documentFor = record => parser.parseFromString(record.html,'text/html');
function closeMenu() { navigation.classList.remove('open'); menu.setAttribute('aria-expanded','false'); }
menu.addEventListener('click', () => { const isOpen = menu.getAttribute('aria-expanded') !== 'true'; navigation.classList.toggle('open',isOpen); menu.setAttribute('aria-expanded',String(isOpen)); });
navigation.addEventListener('click', event => { if(event.target.closest('a')) closeMenu(); });
addEventListener('keydown', event => { if(event.key === 'Escape') {closeMenu(); menu.focus();} });
function deactivateIntro() { dismissIntro(true); }
function formatReading(record) {
  const content=document.querySelector('#reading-content');
  content.dataset.kind=record.slug;
  // Flatten builder wrappers while retaining content and its order.
  [...content.querySelectorAll('div,section')].reverse().forEach(el=>el.replaceWith(...el.childNodes));
  content.querySelectorAll('p').forEach(p=>{if(!p.textContent.trim() && !p.querySelector('img,iframe,input'))p.remove();});
  content.querySelectorAll('img').forEach(img=>{
    img.removeAttribute('width');img.removeAttribute('height');
    const link=img.closest('a');
    const media=link && link.querySelectorAll('img').length===1 ? link : img;
    const figure=img.closest('figure') || document.createElement('figure');
    figure.classList.add('editorial-media');
    if(!figure.contains(img)) {media.replaceWith(figure);figure.append(media);}
    const enclosing=figure.closest('p,h2,h3,h4');
    if(enclosing) enclosing.after(figure);
    if(link) link.addEventListener('click',event=>{
      event.preventDefault();
      document.querySelector('#full-photo').src=link.getAttribute('href') || img.src;
      document.querySelector('#full-photo').alt=img.alt;
      document.querySelector('#photo-caption').textContent=link.title || img.alt;
      document.querySelector('#photo-viewer').showModal();
    });
  });
  const lead=[...content.querySelectorAll('p')].find(p=>p.textContent.trim().length>80);
  if(lead)lead.classList.add('reading-lead');
  if(record.slug==='maestro') {
    const first=content.firstElementChild;
    if(first?.matches('figure')) {
      const profile=document.createElement('div');profile.className='master-profile';
      first.before(profile);profile.append(first);
      const details=document.createElement('div');profile.append(details);
      while(profile.nextElementSibling?.matches('ul')) details.append(profile.nextElementSibling);
    }
  }
  if(record.slug==='documentos-historicos') {
    let gallery;
    [...content.children].forEach(el=>{
      if(el.matches('figure.editorial-media')) {
        if(!gallery){gallery=document.createElement('div');gallery.className='document-gallery';el.before(gallery);}
        gallery.append(el);
      } else gallery=null;
    });
  }
}
document.querySelector('#close-photo').addEventListener('click',()=>document.querySelector('#photo-viewer').close());
function observeSections() {
  if(reducedMotion) return;
  document.body.classList.add('motion-ready');
  observer?.disconnect();
  observer = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting) {entry.target.classList.add('visible'); observer.unobserve(entry.target);} }),{threshold:.08});
  document.querySelectorAll('.reveal').forEach(element=>observer.observe(element));
}
function readSedes(record) {
  const document = documentFor(record);
  const elements = [...document.querySelectorAll('h2,h3,p,img,table')];
  const blocks = [];
  let current;
  for(const element of elements) {
    const text = element.textContent.trim();
    if(element.tagName === 'H2' && text.startsWith('KWOON')) {
      current = {title:text,index:blocks.length,image:'',teacher:'',address:'',schedule:'',groups:[]};
      blocks.push(current);
    } else if(current) {
      if(element.tagName === 'H2' && /Maestro|Profesora?\s/i.test(text)) current.teacher = text;
      if(element.tagName === 'IMG' && !current.image) current.image = element.getAttribute('src');
      if(element.tagName === 'P' && !current.address && /Argentina|Buenos Aires|Córdoba|Cordoba|Misiones|Neuquén/.test(text) && text.length < 240) current.address = text;
      if(element.tagName === 'TABLE' && !current.schedule) {
        current.schedule = element.outerHTML;
        const normalized = text.toLowerCase();
        if(/menores|niños/.test(normalized)) current.groups.push('menores');
        if(/juveniles|jovenes|adolesc/.test(normalized)) current.groups.push('juveniles');
        if(/adultos/.test(normalized)) current.groups.push('adultos');
      }
    }
  }
  const cities = ['Longchamps','Posadas','Neuquén','Lanús','Monte Grande','Monte Chingolo','Burzaco','Villa Allende','Posadas'];
  blocks.forEach((block,index)=>block.locality=cities[index]);
  return blocks;
}
function renderSedes() {
  const filtered = sedes.filter(sede=>(!locality.value || sede.locality===locality.value) && (!age.value || sede.groups.includes(age.value)));
  document.querySelector('#result-count').textContent = `${filtered.length} ${filtered.length===1?'sede':'sedes'}`;
  const grid = document.querySelector('#sede-grid');
  grid.innerHTML = filtered.length ? filtered.map(sede=>`<article class="sede-card"><img src="${escapeHTML(sede.image)}" alt="${escapeHTML(sede.title)}" loading="lazy"><p class="location">${escapeHTML(sede.locality)}</p><h3>${escapeHTML(sede.title.replace(/^KWOON\s/,''))}</h3><p>${escapeHTML(sede.teacher)}</p><p>${escapeHTML(sede.address)}</p><a href="#/sedes/${sede.index}">Ver sede y horarios</a></article>`).join('') : '<p class="empty">No hay sedes para esta selección. Probá otra localidad o grupo.</p>';
}
document.querySelector('#finder').addEventListener('submit',event=>{event.preventDefault();renderSedes(); document.querySelector('#result-count').scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'center'});});
locality.addEventListener('change',renderSedes);
age.addEventListener('change',renderSedes);
function showRoute(initial=false) {
  const hash = location.hash;
  const parts = hash.replace(/^#\/?/,'').split('/');
  const slug = parts[0];
  const record = hash.startsWith('#/') ? records.find(item=>item.slug===slug) : null;
  if(record) {
    deactivateIntro(); home.hidden=true;reading.hidden=false;
    document.querySelector('#reading-title').textContent=record.title;
    document.querySelector('#reading-content').innerHTML=record.html;
    document.querySelector('#reading-category').textContent=record.type==='post'?'ARTÍCULOS · TAIKACHISU':'LA ESCUELA · TAIKACHISU';
    formatReading(record);
    if(slug==='contacto') {
      const form=document.querySelector('#reading-content form');
      if(form) {
        form.addEventListener('submit',event=>event.preventDefault());
        const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true;
        const note=document.createElement('p');note.className='contact-note';note.innerHTML='Para enviar una consulta, <a href="https://taikachisu.com/contacto/" target="_blank" rel="noopener">abrí el formulario de contacto de la escuela</a>.';form.append(note);
      }
    }
    document.title = `${record.title} · Taikachisu`;
    if(slug==='sedes') {
      [...document.querySelectorAll('#reading-content h2')].filter(element=>element.textContent.startsWith('KWOON')).forEach((element,index)=>element.id='sede-'+index);
    }
    if(parts[1] && slug==='sedes') requestAnimationFrame(()=>document.querySelector('#sede-'+parts[1])?.scrollIntoView());
    else scrollTo({top:0,behavior:'instant'});
  } else {
    home.hidden=false;reading.hidden=true;document.title='Taikachisu · Wushu Kung Fu';
    if(hash || !initial) {
      deactivateIntro();
      const target = ['sedes','clases','escuela','articulos'].includes(slug) ? document.getElementById(slug) : null;
      requestAnimationFrame(()=> target ? target.scrollIntoView({behavior:reducedMotion?'instant':'smooth'}) : scrollTo({top:0,behavior:'instant'}));
    }
    observeSections();
  }
  closeMenu();
}
addEventListener('hashchange',()=>showRoute());
fetch('content.json').then(response=>{if(!response.ok)throw new Error('content');return response.json();}).then(data=>{
  records=data.records;
  document.querySelector('#hero-image').src=data.assets['https://taikachisu.com/wp-content/uploads/2017/02/Sifu002.jpg'];
  document.querySelector('#practice-image').src=data.assets['https://taikachisu.com/wp-content/uploads/2026/01/central.jpg'];
  const practice=records.find(item=>item.slug==='la-practica-de-taikachisu');
  const school=records.find(item=>item.slug==='escuela');
  document.querySelector('#practice-text').textContent=documentFor(practice).querySelector('p')?.textContent || '';
  document.querySelector('#school-text').textContent=[...documentFor(school).querySelectorAll('p')].find(p=>p.textContent.trim().length>30)?.textContent || '';
  const articles=records.filter(item=>item.type==='post');
  document.querySelector('#article-list').innerHTML=articles.map((item,index)=>`<a class="article-row reveal" href="#/${escapeHTML(item.slug)}"><span>${String(index+1).padStart(2,'0')}</span><h3>${escapeHTML(item.title)}</h3></a>`).join('');
  sedes=readSedes(records.find(item=>item.slug==='sedes'));
  [...new Set(sedes.map(sede=>sede.locality))].sort().forEach(city=>{const option=document.createElement('option');option.value=city;option.textContent=city;locality.append(option);});
  renderSedes();showRoute(true);
}).catch(()=>{
  deactivateIntro();
  const message=document.createElement('p');message.className='data-error';message.textContent='No se pudo cargar el contenido. Recargá la página para volver a intentarlo.';home.prepend(message);
});

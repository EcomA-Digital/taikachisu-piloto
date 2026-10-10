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
function closeNavGroups() { navigation.querySelectorAll('.nav-group[open]').forEach(group => { group.open = false; }); }
function closeMenu() { navigation.classList.remove('open'); menu.setAttribute('aria-expanded','false'); closeNavGroups(); }
navigation.querySelectorAll('.nav-group').forEach(group => {
  group.querySelector('summary').addEventListener('click', () => {
    navigation.querySelectorAll('.nav-group').forEach(other => { if(other !== group) other.open = false; });
  });
});
document.addEventListener('click', event => { if(!event.target.closest('.header')) closeMenu(); });
navigation.addEventListener('focusout', () => {
  requestAnimationFrame(() => { if(!navigation.contains(document.activeElement)) closeNavGroups(); });
});
menu.addEventListener('click', () => { const isOpen = menu.getAttribute('aria-expanded') !== 'true'; navigation.classList.toggle('open',isOpen); menu.setAttribute('aria-expanded',String(isOpen)); });
navigation.addEventListener('click', event => { if(event.target.closest('a')) closeMenu(); });
addEventListener('keydown', event => { if(event.key === 'Escape') {closeMenu(); menu.focus();} });
function deactivateIntro() { dismissIntro(true); }
function formatReading(record) {
  const content=document.querySelector('#reading-content');
  content.dataset.kind=record.slug;
  SchoolFeatures.prepareVideos(content);

  // Flatten builder wrappers while retaining content and its order.
  [...content.querySelectorAll('div,section')].reverse().forEach(el=>el.replaceWith(...el.childNodes));
  content.querySelectorAll('p').forEach(p=>{if(!p.textContent.trim() && !p.querySelector('img,iframe,input'))p.remove();});
  content.querySelectorAll('img').forEach(img=>{
    img.removeAttribute('width');img.removeAttribute('height');
    const link=img.closest('a');
    const media=link && link.querySelectorAll('img').length===1 ? link : img;
    const figure=img.closest('figure') || document.createElement('figure');
    figure.classList.add('editorial-media');
    if(img.classList.contains('section-photo')) figure.classList.add('section-media');
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
  if(record.slug==='escuela') {
    content.querySelectorAll(':scope>ul').forEach(list=>{
      list.classList.add('history-timeline');
      list.querySelectorAll(':scope>li').forEach(item=>item.classList.add('timeline-step','reveal'));
    });
    observeSections();
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
  const doc = documentFor(record);
  [...doc.querySelectorAll('div,section')].reverse().forEach(el=>el.replaceWith(...el.childNodes));
  const blocks=[]; let current;
  for(const element of doc.body.children) {
    const text=element.textContent.trim();
    if(element.matches('h2') && text.startsWith('KWOON')) {
      current={title:text,index:blocks.length,image:'',teacher:'',address:'',venue:'',schedule:'',map:'',notes:[],groups:[]};
      blocks.push(current);
    } else if(current) {
      const img=element.matches('img') ? element : element.querySelector('img');
      const frame=element.matches('iframe') ? element : element.querySelector('iframe');
      if(img && !current.image) current.image=img.getAttribute('src');
      else if(frame) current.map=frame.getAttribute('src');
      else if(element.matches('h2') && /Maestro|Profesora?\s/i.test(text)) current.teacher=text;
      else if(element.matches('h2')) current.venue=text;
      else if(element.matches('p') && !current.address && /Argentina|Buenos Aires|Córdoba|Cordoba|Misiones|Neuquén/.test(text) && text.length<240) current.address=text;
      else if(element.matches('table')) {
        current.schedule=element.outerHTML;
        const normalized=text.toLowerCase();
        if(/menores|niños/.test(normalized)) current.groups.push('menores');
        if(/juveniles|jovenes|adolesc/.test(normalized)) current.groups.push('juveniles');
        if(/adultos/.test(normalized)) current.groups.push('adultos');
      } else if(text) current.notes.push(element.outerHTML);
    }
  }
  const cities=['Longchamps','Posadas','Neuquén','Lanús','Monte Grande','Monte Chingolo','Burzaco','Villa Allende','Posadas'];
  const slugs=['sede-central','nea','neuquen','lanus','monte-grande','monte-chingolo','burzaco','villa-allende','asociacion-misionera'];
  blocks.forEach((sede,index)=>{sede.locality=cities[index];sede.slug=slugs[index];});
  return blocks;
}
const groupNames={menores:'Niños',juveniles:'Juveniles',adultos:'Adultos'};
function groupTags(sede) {return sede.groups.map(group=>`<span>${groupNames[group]}</span>`).join('');}
function renderSedes() {
  const filtered=sedes.filter(sede=>(!locality.value || sede.locality===locality.value) && (!age.value || sede.groups.includes(age.value)));
  document.querySelector('#result-count').textContent=`${filtered.length} ${filtered.length===1?'sede':'sedes'}`;
  document.querySelector('#sede-grid').innerHTML=filtered.length ? filtered.map(sede=>`<article class="sede-card"><a class="sede-photo" href="#/sedes/${sede.slug}" aria-label="Ver ${escapeHTML(sede.title)}"><img src="${escapeHTML(sede.image)}" alt="${escapeHTML(sede.title)}" loading="lazy"><span>${escapeHTML(sede.locality)}</span></a><div class="sede-card-body"><h3>${escapeHTML(sede.title.replace(/^KWOON\s/,''))}</h3><p class="sede-teacher">${escapeHTML(sede.teacher)}</p><p class="sede-address">${escapeHTML(sede.address)}</p><div class="sede-tags">${groupTags(sede)}</div><a class="sede-card-link" href="#/sedes/${sede.slug}">Ver sede y horarios <span aria-hidden="true">↗</span></a></div></article>`).join('') : '<p class="empty">No hay sedes para esta selección. Probá otra localidad o grupo.</p>';
}
function scheduleCards(sede) {
  const doc=parser.parseFromString(sede.schedule,'text/html');
  const rows=[...doc.querySelectorAll('tr')];
  const sections=[]; let section;
  for(const row of rows) {
    const cells=[...row.children];
    if(/^(Horarios|Nuevo Turno)$/i.test(cells[0]?.textContent.trim())) {
      section={title:cells[0].textContent.trim(),days:cells.slice(1).map((cell,index)=>({name:cell.textContent.trim(),index,slots:[]}))};
      sections.push(section);
    } else if(section) {
      const labels=[...cells[0].querySelectorAll('p')].map(p=>p.textContent.trim()).filter(Boolean);
      const fallback=cells[0].textContent.trim();
      section.days.forEach(day=>{
        const cell=cells[day.index+1]; if(!cell)return;
        const times=[...cell.querySelectorAll('p')].map(p=>p.textContent.trim()).filter(Boolean);
        if(labels.length>1 && times.length===labels.length) times.forEach((time,i)=>day.slots.push({label:labels[i],time}));
        else day.slots.push({label:fallback,time:cell.textContent.trim()});
      });
    }
  }
  const hasTime=text=>/\d/.test(text);
  const dayName=(day,index)=>sede.slug==='neuquen' ? ['Lunes','Martes','Miércoles','Jueves','Sábado'][index] : day;
  return sections.map(section=>{
    const active=section.days.filter(day=>day.name && day.slots.some(slot=>hasTime(slot.time)));
    if(!active.length) return `<p class="schedule-pending">Horarios a confirmar con la sede.</p><p class="schedule-groups">${escapeHTML(section.days[0]?.slots.map(slot=>slot.label).join(' · ') || '')}</p>`;
    return `${section.title==='Nuevo Turno'?'<h3 class="schedule-turn">Nuevo Turno</h3>':''}<div class="schedule-days">${active.map(day=>`<section class="schedule-day"><h3>${escapeHTML(dayName(day.name,day.index))}</h3>${day.slots.filter(slot=>hasTime(slot.time)).map(slot=>`<div class="schedule-slot"><span>${escapeHTML(slot.label)}</span><strong>${escapeHTML(slot.time)}</strong></div>`).join('')}</section>`).join('')}</div>`;
  }).join('');
}
function renderSedeDetail(sede) {
  const detail=document.querySelector('#sede-detail');
  const mapsLink='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(sede.address);
  detail.innerHTML=`<section class="sede-heading"><a class="reading-back" href="#sedes">← Volver al buscador de sedes</a><div class="sede-heading-grid"><div><p class="eyebrow">TAIKACHISU · ${escapeHTML(sede.locality)}</p><h1 tabindex="-1">${escapeHTML(sede.title)}</h1>${sede.venue?`<p class="sede-venue">${escapeHTML(sede.venue)}</p>`:''}<div class="sede-tags">${groupTags(sede)}</div><a class="button gold" href="#horarios-${sede.slug}">Ver horarios ↓</a></div><figure class="sede-detail-photo"><img src="${escapeHTML(sede.image)}" alt="${escapeHTML(sede.title)}"><figcaption>${escapeHTML(sede.locality)} · Wushu Kung Fu</figcaption></figure></div></section><div class="sede-detail-body"><section class="sede-instructor"><p class="eyebrow dark-label">QUIÉN GUÍA LA PRÁCTICA</p><h2>${escapeHTML(sede.teacher)}</h2>${sede.notes.length?`<div class="sede-notes">${sede.notes.join('')}</div>`:''}</section><section class="sede-schedule" id="horarios-${sede.slug}"><div class="sede-section-title"><div><p class="eyebrow dark-label">LA PRÁCTICA</p><h2>Días y horarios.</h2></div><span>Información publicada por la escuela</span></div>${scheduleCards(sede)}<details class="original-schedule"><summary>Ver tabla de horarios original</summary><div class="schedule-table">${sede.schedule}</div></details></section><section class="sede-location"><div><p class="eyebrow dark-label">DÓNDE ENTRENAR</p><h2>La ubicación.</h2><p>${escapeHTML(sede.address)}</p><a class="button dark" href="${escapeHTML(mapsLink)}" target="_blank" rel="noopener">Abrir en Google Maps ↗</a></div>${sede.map?`<iframe title="Mapa de ${escapeHTML(sede.title)}" src="${escapeHTML(sede.map)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`:''}</section><div class="sede-detail-end"><a class="underlined" href="#sedes">← Buscar otra sede</a><a class="button dark" href="#/inscripcion">Inscripción</a></div></div>`;
  // The schedule anchor belongs to this view; keep its route when navigating within it.
  detail.querySelector('a[href^="#horarios-"]').addEventListener('click',event=>{event.preventDefault();detail.querySelector('.sede-schedule').scrollIntoView({behavior:reducedMotion?'instant':'smooth'});});
  document.title=`${sede.title} · Taikachisu`;
  scrollTo({top:0,behavior:'instant'});
  detail.querySelector('h1').focus({preventScroll:true});
}

document.querySelector('#finder').addEventListener('submit',event=>{event.preventDefault();renderSedes(); document.querySelector('#result-count').scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'center'});});
locality.addEventListener('change',renderSedes);
age.addEventListener('change',renderSedes);
function showRoute(initial=false) {
  const hash = location.hash;
  const parts = hash.replace(/^#\/?/,'').split('/');
  const slug = parts[0];
  const record = hash.startsWith('#/') ? records.find(item=>item.slug===slug) : null;
  const detail=document.querySelector('#sede-detail');
  detail.hidden=true;
  const features=document.querySelector('#features');features.hidden=true;
  document.querySelector('.article-related')?.remove();
  document.querySelector('#reading .reading-back').href='#/';
  document.querySelector('#reading .reading-back').textContent='← Volver al inicio';
  if(['camino-marcial','calendario','evento'].includes(slug)) {
    deactivateIntro();home.hidden=true;reading.hidden=true;features.hidden=false;
    SchoolFeatures.route(parts);closeMenu();return;
  }
  if(slug==='sedes' && parts[1]) {
    const sede=sedes.find(item=>item.slug===parts[1] || String(item.index)===parts[1]);
    if(sede) {
      deactivateIntro();home.hidden=true;reading.hidden=true;detail.hidden=false;
      renderSedeDetail(sede);closeMenu();return;
    }
  }
  if(record && slug!=='sedes') {
    deactivateIntro(); home.hidden=true;reading.hidden=false;
    document.querySelector('#reading-title').textContent=record.title;
    document.querySelector('#reading-content').innerHTML=record.html;
    document.querySelector('#reading-category').textContent=record.type==='post'?'ARTÍCULOS · TAIKACHISU':'LA ESCUELA · TAIKACHISU';
    formatReading(record);
    SchoolFeatures.decorateArticle(record);
    if(slug==='contacto') {
      const form=document.querySelector('#reading-content form');
      if(form) {
        form.addEventListener('submit',event=>event.preventDefault());
        const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true;
        const note=document.createElement('p');note.className='contact-note';note.innerHTML='Para enviar una consulta, <a href="https://taikachisu.com/contacto/" target="_blank" rel="noopener">abrí el formulario de contacto de la escuela</a>.';form.append(note);
      }
    }
    document.title = `${record.title} · Taikachisu`;
    scrollTo({top:0,behavior:'instant'});
  } else {
    home.hidden=false;reading.hidden=true;document.title='Taikachisu · Wushu Kung Fu';
    if(hash || !initial) {
      deactivateIntro();
      const target = ['sedes','clases','escuela','articulos','practice-film'].includes(slug) ? document.getElementById(slug) : null;
      requestAnimationFrame(()=> target ? target.scrollIntoView({behavior:reducedMotion?'instant':'smooth'}) : scrollTo({top:0,behavior:'instant'}));
    }
    observeSections();
  }
  closeMenu();
}
addEventListener('hashchange',()=>showRoute());
fetch('content.json?v=20261010-photos1').then(response=>{if(!response.ok)throw new Error('content');return response.json();}).then(async data=>{
  records=data.records;
  document.querySelector('#practice-image').src='assets/practica-inicio.jpg';
  const practice=records.find(item=>item.slug==='la-practica-de-taikachisu');
  const school=records.find(item=>item.slug==='escuela');
  document.querySelector('#practice-text').textContent=documentFor(practice).querySelector('p')?.textContent || '';
  document.querySelector('#school-text').textContent=[...documentFor(school).querySelectorAll('p')].find(p=>p.textContent.trim().length>30)?.textContent || '';
  const style=records.find(r=>r.slug==='que-es-taikachisu-wushu-kung-fu');
  document.querySelector('#style-text').textContent=style?[...documentFor(style).querySelectorAll('p')].find(p=>p.textContent.trim().length>40)?.textContent||'':'';
  sedes=readSedes(records.find(item=>item.slug==='sedes'));
  const articles=await SchoolFeatures.init(records,sedes);
  records=[...records.filter(item=>item.type!=='post'),...articles];
  SchoolFeatures.setupMotion();
  const management=document.createElement('a');management.href='admin.html';management.className='management-link';management.textContent='Gestión de la escuela';document.querySelector('.footer-bottom').append(management);
  [...new Set(sedes.map(sede=>sede.locality))].sort().forEach(city=>{const option=document.createElement('option');option.value=city;option.textContent=city;locality.append(option);});
  renderSedes();showRoute(true);
}).catch(()=>{
  deactivateIntro();
  const message=document.createElement('p');message.className='data-error';message.textContent='No se pudo cargar el contenido. Recargá la página para volver a intentarlo.';home.prepend(message);
});

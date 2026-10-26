/* Instructor profiles group only the responsibilities already published by each sede. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.SchoolTeachers=api;})(typeof globalThis!=='undefined'?globalThis:this,root=>{
  const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const titleCase=value=>value.toLocaleLowerCase('es-AR').split(/\s+/).map(word=>word.charAt(0).toLocaleUpperCase('es-AR')+word.slice(1)).join(' ');
  function parse(raw){
    const match=String(raw).trim().match(/^(Maestro|Profesor|Profesora)\s+(.+?)\s+(\d+\s*[°ºª]?\s*Tuan)$/i);
    const name=titleCase(match?match[2]:raw);
    return {slug:normalize(name).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),name,role:match?titleCase(match[1]):'Responsable de sede',grade:match?match[3]:''};
  }
  function groupSedes(sedes){
    const groups=new Map();
    for(const sede of sedes){const teacher=parse(sede.teacher);if(!groups.has(teacher.slug))groups.set(teacher.slug,{...teacher,sedeSlugs:[],localities:[]});const profile=groups.get(teacher.slug);profile.sedeSlugs.push(sede.slug);if(!profile.localities.includes(sede.locality))profile.localities.push(sede.locality);}
    return [...groups.values()];
  }
  function filterSedes(sedes,{teacher='',locality='',age=''}={}){
    return sedes.filter(s=>(!teacher||parse(s.teacher).slug===teacher)&&(!locality||s.locality===locality)&&(!age||s.groups.includes(age)));
  }
  function render(parts,sedes,sedeCard){
    const E=root.SchoolCore.escapeHTML,main=document.querySelector('#features'),profiles=groupSedes(sedes),profile=profiles.find(p=>p.slug===parts[1]);
    if(parts[1]&&!profile){main.innerHTML='<section class="teachers-heading"><h1>Ficha no disponible.</h1><a class="text-link" href="#/maestros">Ver maestros y profesores ↗</a></section>';return;}
    if(profile){
      const assigned=sedes.filter(s=>profile.sedeSlugs.includes(s.slug));
      main.innerHTML=`<section class="teachers-heading"><a class="reading-back" href="#/maestros">← Todos los maestros y profesores</a><p class="eyebrow dark-label">${E(profile.role)} · ${E(profile.grade)}</p><h1 tabindex="-1">${E(profile.name)}</h1><p class="teachers-intro">${E(profile.localities.join(' · '))}</p></section><section class="teachers-body" aria-labelledby="teacher-sedes-heading"><div class="teachers-section-heading"><h2 id="teacher-sedes-heading">Sedes a cargo</h2><p>${assigned.length} ${assigned.length===1?'sede':'sedes'}</p></div><div class="sede-grid">${assigned.map(sedeCard).join('')}</div><a class="text-link teachers-all-sedes" href="#/sedes">Explorá todas las sedes ↗</a></section>`;
    }else{
      main.innerHTML=`<section class="teachers-heading"><p class="eyebrow dark-label">LA ESCUELA TAIKACHISU</p><h1 tabindex="-1">Maestros y profesores.</h1><p class="teachers-intro">Conocé a los responsables de la enseñanza y encontrá las sedes donde entrenar.</p></section><section class="teachers-body" aria-label="Directorio de maestros y profesores"><div class="teachers-grid">${profiles.map(p=>`<article class="teacher-card"><p class="teacher-role">${E(p.role)} · ${E(p.grade)}</p><h2><a href="#/maestros/${E(p.slug)}">${E(p.name)}</a></h2><p class="teacher-localities">${E(p.localities.join(' · '))}</p><p class="teacher-sede-count">${p.sedeSlugs.length} ${p.sedeSlugs.length===1?'sede a cargo':'sedes a cargo'}</p><a class="text-link" href="#/maestros/${E(p.slug)}" aria-label="Ver ficha y sedes de ${E(p.name)}">Ver ficha y sedes ↗</a></article>`).join('')}</div></section>`;
    }
    main.querySelector('h1')?.focus({preventScroll:true});scrollTo({top:0,behavior:'instant'});
  }
  return {groupSedes,filterSedes,teacherSlug:raw=>parse(raw).slug,render};
});

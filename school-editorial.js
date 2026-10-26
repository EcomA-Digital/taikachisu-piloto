/* Magazine layouts built from the original nodes: no rewritten or hidden text. */
window.SchoolEditorial=(()=>{
  const titles={
    'documentos-historicos':'Documentos históricos','que-es-taikachisu-wushu-kung-fu':'Qué es Taikachisu Wushu Kung Fu',
    'nuestra-tecnica':'Nuestra técnica','la-practica-de-taikachisu':'La práctica de Taikachisu',
    'videos-de-taikachisu':'Videos de Taikachisu','nuestra-base-filosofica':'Nuestra base filosófica',
    'el-camino-del-practicante-de-artes-marciales':'El camino del practicante de artes marciales',
    'la-filosofia-lo-simple':'La filosofía de lo simple'
  };
  const quotes={
    institucional:'La obtención de la personería',escuela:'Formar parte de nuestra escuela',
    'secreto-del-estilo-taikachisu':'«El Poder de la Mente',
    'lao-ying':'A veces cuando hablo de comunicarnos',
    'que-es-taikachisu-wushu-kung-fu':'Los movimientos son fáciles de aprender',
    'nuestra-tecnica':'La Lucha Mongol apunta',
    'la-practica-de-taikachisu':'Los movimientos son fáciles y simples',
    'nuestra-base-filosofica':'La enseñanza filosófica está basada',
    'el-camino-del-practicante-de-artes-marciales':'La profundidad en la búsqueda',
    'la-filosofia-lo-simple':'El camino de cada artista marcial',
    'documentos-historicos':'Si tenés material digitalizado'
  };
  const text=node=>node.textContent.trim().replace(/\s+/g,' ');
  const paragraph=node=>node?.matches('p')&&!node.querySelector('img,iframe,input,button,textarea');
  function adjacent(first,last){
    for(let node=first.nextSibling;node&&node!==last;node=node.nextSibling){
      if(node.nodeType!==Node.TEXT_NODE||node.textContent.trim())return false;
    }
    return true;
  }
  function groupBefore(nodes,className){
    const group=document.createElement('div');group.className=className;
    nodes[0].before(group);nodes.forEach(node=>group.append(node));return group;
  }
  function mediaSpreads(root){
    for(const media of [...root.children]){
      const singlePhoto=media.matches('figure.editorial-media')&&!media.matches('.institutional-logos')&&media.querySelectorAll('img').length===1;
      if(!singlePhoto&&!media.matches('.school-video'))continue;
      let copy=[],node=media.previousElementSibling;
      while(paragraph(node)&&copy.length<2&&adjacent(node,copy[0]||media)){
        if(text(node).length<100)break;
        copy.unshift(node);node=node.previousElementSibling;
      }
      let copyFirst=copy.length>0;
      if(!copyFirst){
        node=media.nextElementSibling;
        while(paragraph(node)&&copy.length<2&&adjacent(copy.at(-1)||media,node)){
          if(text(node).length<100)break;
          copy.push(node);node=node.nextElementSibling;
        }
      }
      if(!copy.length)continue;
      const ordered=copyFirst?[...copy,media]:[media,...copy];
      const spread=groupBefore(ordered,'editorial-spread'+(copyFirst?' editorial-spread--copy-first':''));
      const column=document.createElement('div');column.className='editorial-spread-copy';
      if(copyFirst)spread.prepend(column);else spread.append(column);
      copy.forEach(node=>column.append(node));
    }
  }
  function columns(root){
    for(const first of [...root.children]){
      const second=first.nextElementSibling;
      if(!paragraph(first)||!paragraph(second)||!adjacent(first,second))continue;
      if(first.matches('.reading-lead,.editorial-kicker')||second.matches('.reading-lead,.editorial-kicker'))continue;
      const a=text(first).length,b=text(second).length;
      if(a<180||b<180||a>1400||b>1400||Math.max(a,b)/Math.min(a,b)>2.8)continue;
      groupBefore([first,second],'editorial-columns');
    }
  }
  function chapters(root){
    const headings=[...root.children].filter(node=>node.matches('h2,h3')&&text(node));
    if(headings.length<2)return;
    let section;
    for(const node of [...root.childNodes]){
      if(node.nodeType===Node.ELEMENT_NODE&&headings.includes(node)){
        section=document.createElement('section');section.className='editorial-chapter';node.before(section);
        if(node.tagName==='H3'){
          const heading=document.createElement('h2');heading.append(...node.childNodes);node.replaceWith(heading);section.append(heading);continue;
        }
      }
      if(section)section.append(node);
    }
  }
  function enhance(root,record){
    const reading=document.querySelector('#reading'),masthead=reading.querySelector('.reading-heading');
    masthead.querySelector('.editorial-cover')?.remove();masthead.classList.remove('has-editorial-cover');
    const previousCopy=masthead.querySelector('.editorial-heading-copy');
    if(previousCopy)previousCopy.replaceWith(...previousCopy.childNodes);
    reading.classList.toggle('reading--editorial',record.type==='post');
    const end=reading.querySelector('.reading-end .text-link');
    end.href=record.type==='post'?'#/camino-marcial':'#/';end.textContent=record.type==='post'?'← Volver al camino marcial':'← Volver al inicio';
    root.classList.toggle('editorial-article',record.type==='post');
    if(record.type!=='post')return;
    reading.querySelector('#reading-title').textContent=titles[record.slug]||record.title;
    root.querySelectorAll('h2,h3,h4').forEach(node=>{if(!text(node)&&!node.querySelector('img'))node.remove();});
    const lead=root.querySelector('.reading-lead');
    root.querySelectorAll('p').forEach(node=>{if(text(node).length<120&&/\bTuan\b/.test(text(node)))node.classList.add('editorial-kicker');});
    if(quotes[record.slug]){
      const candidate=[...root.querySelectorAll('p')].find(node=>node!==lead&&paragraph(node)&&text(node).includes(quotes[record.slug]));
      if(candidate){const quote=document.createElement('blockquote');quote.className='editorial-pullquote';quote.append(...candidate.childNodes);candidate.replaceWith(quote);}
    }
    root.querySelectorAll('blockquote').forEach(node=>node.classList.add('editorial-pullquote'));
    root.querySelectorAll('figure.editorial-media').forEach(figure=>{
      const link=figure.querySelector('a[title]'),image=figure.querySelector('img');
      if(link?.title&&!figure.querySelector('figcaption')){
        const caption=document.createElement('figcaption');caption.className='editorial-supplement';caption.textContent=link.title.trim();figure.append(caption);
        if(image&&!image.alt)image.alt=link.title.trim();
      }
    });
    root.querySelectorAll('.document-gallery').forEach(gallery=>{
      gallery.classList.add('editorial-document-strip');gallery.tabIndex=0;gallery.setAttribute('role','region');gallery.setAttribute('aria-label','Documentos históricos: deslizá o usá las flechas para explorar');
      const tools=document.createElement('div');tools.className='editorial-gallery-tools editorial-supplement';
      const count=document.createElement('span');count.textContent=`${gallery.querySelectorAll('img').length} documentos`;tools.append(count);
      for(const direction of [-1,1]){
        const button=document.createElement('button');button.type='button';button.textContent=direction===1?'→':'←';
        button.setAttribute('aria-label',direction===1?'Documentos siguientes':'Documentos anteriores');
        button.addEventListener('click',()=>gallery.scrollBy({left:direction*((gallery.firstElementChild?.getBoundingClientRect().width||280)+20),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));tools.append(button);
      }
      gallery.before(tools);
      gallery.addEventListener('keydown',event=>{if(event.target!==gallery||!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();gallery.scrollBy({left:(event.key==='ArrowRight'?1:-1)*300,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
    });
    root.querySelectorAll('ul,ol').forEach(list=>{
      const items=[...list.children];
      if(items.length>=3&&items.length<=8&&items.every(item=>text(item).length<220&&!item.querySelector('img,ul,ol')))list.classList.add('editorial-principles');
    });
    mediaSpreads(root);columns(root);chapters(root);
    if(record.image&&!root.querySelector('figure img,.school-video,iframe')){
      masthead.classList.add('has-editorial-cover');
      const copy=document.createElement('div');copy.className='editorial-heading-copy';
      copy.append(...masthead.childNodes);masthead.append(copy);
      const figure=document.createElement('figure');figure.className='editorial-cover';
      const image=document.createElement('img');image.src=record.image;image.alt='';image.decoding='async';image.loading='eager';figure.append(image);masthead.append(figure);
    }
  }
  return {enhance};
})();

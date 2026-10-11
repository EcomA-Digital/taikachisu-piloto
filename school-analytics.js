/* Optional statistics. No form values, search text, contact details or chat content. */
window.SchoolAnalytics = (() => {
  const config = window.TAIKA_ANALYTICS;
  const consentKey = 'taikachisu:statistics:v1';
  let allowed = false, loaded = false, lastPage = null, panel;
  const environment = location.pathname.startsWith('/preview/') ? 'preview' : 'production';
  window.dataLayer = window.dataLayer || [];
  function command() { window.dataLayer.push(arguments); }
  command('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  function cleanURL(value) {
    try {
      const url = new URL(value,location.href); url.hash='';
      const params = new URLSearchParams();
      for (const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']) {
        if (url.searchParams.has(key)) params.set(key,url.searchParams.get(key).slice(0,100));
      }
      url.search = params.toString(); return url.href;
    } catch { return ''; }
  }
  function emit(name, details = {}) {
    if (!allowed) return;
    const context = {
      event:'taika_measure',ga4_event_name:name,site_environment:environment,
      page_location:cleanURL(location.href),page_title:document.title,
      page_referrer:document.referrer ? cleanURL(document.referrer).split('?')[0] : '',
      page_type:document.body.dataset.page?.split('/')[0] || 'home',
      sede_id:'',article_id:'',activity_id:'',contact_method:'',video_id:'',filter_locality:'',
      ...details
    };
    window.dataLayer.push(context);
  }
  function pageView() {
    if (!allowed || lastPage === location.pathname) return;
    lastPage = location.pathname;
    emit('page_view');
    const route = window.SchoolSEO?.key() || '';
    if (route.startsWith('sedes/')) emit('view_sede',{sede_id:route.split('/')[1]});
    if (document.querySelector('#reading:not([hidden]) .article-byline')) emit('view_article',{article_id:route});
  }
  function loadContainer() {
    if (loaded || !/^GTM-[A-Z0-9]+$/.test(config?.containerId || '')) return;
    // Local/build checks never send data to Google.
    if (!['taikachisu.com','www.taikachisu.com'].includes(location.hostname)) return;
    loaded=true;
    window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
    const script=document.createElement('script');script.async=true;
    script.src='https://www.googletagmanager.com/gtm.js?id='+config.containerId;
    document.head.append(script);
  }
  function choose(value) {
    const previouslyAllowed=allowed;allowed=value==='accepted';
    try { localStorage.setItem(consentKey,value); } catch {}
    command('consent','update',{analytics_storage:allowed?'granted':'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    if(panel)panel.hidden=true;
    if(allowed){lastPage=null;pageView();loadContainer();}
    else if(previouslyAllowed){
      // Remove this site's analytics cookies and stop its event instrumentation.
      for(const item of document.cookie.split(';')){
        const name=item.split('=')[0].trim();
        if(!/^_ga(?:_|$)|^_gid$|^_gat/.test(name))continue;
        for(const domain of ['', '; domain='+location.hostname,'; domain=.taikachisu.com'])document.cookie=name+'=; Max-Age=0; path=/'+domain+'; SameSite=Lax';
      }
      location.reload();
    }
  }
  function init() {
    panel=document.createElement('section');panel.id='statistics-choice';panel.className='statistics-choice';
    panel.setAttribute('aria-label','Privacidad y medición de visitas');
    panel.innerHTML='<div><strong>Medición de visitas</strong><p>Podemos usar Google Analytics para mejorar la web. Estas cookies son opcionales.</p><details><summary>Privacidad y cookies</summary><p>La Asociación Taika-Chisu usa estadísticas de navegación y clics. No enviamos nombres, correos, textos de búsqueda ni contenido de formularios. No activamos personalización publicitaria. Podés cambiar tu elección desde el pie de página.</p><a href="https://policies.google.com/technologies/partner-sites?hl=es" target="_blank" rel="noopener noreferrer">Cómo utiliza Google los datos ↗</a></details></div><div class="statistics-actions"><button type="button" class="button gold" id="accept-statistics">Aceptar estadísticas</button><button type="button" class="underlined" id="reject-statistics">Continuar sin ellas</button></div>';
    document.body.append(panel);
    panel.querySelector('#accept-statistics').addEventListener('click',()=>choose('accepted'));
    panel.querySelector('#reject-statistics').addEventListener('click',()=>choose('rejected'));
    const footer=document.querySelector('.footer-bottom');
    if(footer){const button=document.createElement('button');button.type='button';button.className='statistics-settings';button.textContent='Privacidad y cookies';button.addEventListener('click',()=>{panel.hidden=false;panel.querySelector('#accept-statistics').focus();});footer.append(button);}
    let saved;try{saved=localStorage.getItem(consentKey);}catch{}
    if(saved==='accepted'||saved==='rejected')choose(saved);
    document.addEventListener('click',event=>{
      const target=event.target.closest('a,button');if(!target)return;
      const href=target.getAttribute('href')||'';
      if(target.dataset.videoId)emit('select_video',{video_id:target.dataset.videoId});
      else if(target.dataset.eventId)emit('view_calendar_event',{activity_id:target.dataset.eventId});
      else if(target.id==='download-event'||target.id==='download-calendar')emit('calendar_download',{activity_id:target.id==='download-event'?(document.querySelector('#event-dialog')?.dataset.eventId||''):''});
      else if(/^(mailto:|tel:)|^https:\/\/(wa.me|api.whatsapp.com)\//.test(href)){
        // Sharing an activity is not an enquiry to the school.
        if(target.closest('.event-actions'))return;
        emit('contact_click',{contact_method:href.startsWith('mailto:')?'email':href.startsWith('tel:')?'phone':'whatsapp',sede_id:window.SchoolSEO?.key()?.startsWith('sedes/')?window.SchoolSEO.key().split('/')[1]:''});
      }else if(/\/inscripcion\/?(?:#.*)?$|^#\/inscripcion$/.test(href))emit('registration_interest');
    });
    document.addEventListener('change',event=>{
      if(event.target.id==='locality')emit('sede_filter',{filter_locality:event.target.value.slice(0,80)});
    });
    addEventListener('taika:page',pageView);
    pageView();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  return {cleanURL};
})();

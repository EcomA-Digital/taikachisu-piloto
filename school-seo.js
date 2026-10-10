/* Real document URLs with progressive enhancement; HTML remains readable without JS. */
window.SchoolSEO = (() => {
  const config = window.TAIKA_SEO;
  if (!config) return null;
  const base = config.base;
  const root = new URL(base, location.origin);
  function key(url = new URL(location.href)) {
    if (url.hash.startsWith('#/')) return url.hash.slice(2).replace(/\/$/, '');
    if (!url.pathname.startsWith(base)) return null;
    return decodeURIComponent(url.pathname.slice(base.length)).replace(/\/$/, '');
  }
  function route() {
    const value = key();
    if (!value) return location.hash && !location.hash.startsWith('#/') ? location.hash : '';
    return '#/' + value;
  }
  function urlFor(value) { return new URL(value ? value + '/' : '', root).href; }
  function linkURL(href) {
    if (href.startsWith('#/')) return urlFor(href.slice(2).replace(/\/$/, ''));
    if (href === '#sedes') return urlFor('sedes');
    if (['#escuela', '#clases', '#articulos', '#practice-film'].includes(href)) return root.href + href;
    const url = new URL(href, document.baseURI);
    if (url.origin === location.origin && !url.pathname.startsWith(base)) {
      const candidate = url.pathname.replace(/^\/|\/$/g, '');
      if (config.pages[candidate]) return urlFor(candidate) + url.hash;
    }
    return url.href;
  }
  function rewriteLinks() {
    document.querySelectorAll('a[href]').forEach(anchor => {
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#horarios-')) return;
      const resolved = linkURL(href);
      const value = key(new URL(resolved));
      if (value?.startsWith('evento/')) anchor.dataset.eventId = value.split('/')[1];
      if (resolved !== anchor.href || href.startsWith('#/')) anchor.setAttribute('href', resolved);
    });
  }
  function navigate(url, replace = false) {
    history[replace ? 'replaceState' : 'pushState'](null, '', url);
    dispatchEvent(new Event('site:navigate'));
  }
  function apply() {
    const value = key() || '';
    const page = config.pages[value];
    if (!page) return;
    document.title = page.title;
    document.body.dataset.page = value;
    const directoryHeading = document.querySelector('#directory-title');
    if (directoryHeading) directoryHeading.hidden = value !== 'sedes';
    const currentURL = urlFor(value);
    document.querySelector('meta[name="description"]').content = page.description;
    document.querySelector('link[rel="canonical"]').href = currentURL;
    const fields = {'og:title':page.title,'og:description':page.description,'og:url':currentURL,'og:image':page.image,'og:type':page.type,'og:image:alt':page.imageAlt,'twitter:title':page.title,'twitter:description':page.description,'twitter:image':page.image};
    for (const [name, content] of Object.entries(fields)) {
      const node = document.querySelector(`meta[property="${name}"],meta[name="${name}"]`);
      if (node) node.content = content;
    }
    document.querySelectorAll('meta[property^="article:"]').forEach(node => node.remove());
    for (const [name, content] of Object.entries(page.articleMeta || {})) {
      const node = document.createElement('meta');node.setAttribute('property',name);node.content = content;document.head.append(node);
    }
    document.querySelector('#page-schema').textContent = JSON.stringify(page.schema);
    rewriteLinks();
  }
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href]');
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
    const url = new URL(linkURL(anchor.getAttribute('href')));
    const value = key(url);
    if (url.origin !== location.origin || value === null || !config.pages[value]) return;
    if (value.startsWith('evento/')) return; // Calendar opens its existing dialog.
    event.preventDefault();navigate(url);
  });
  addEventListener('popstate', () => dispatchEvent(new Event('site:navigate')));
  addEventListener('hashchange', () => {
    if (location.hash.startsWith('#/') && config.pages[key()]) history.replaceState(null, '', urlFor(key()));
  });
  if (location.hash.startsWith('#/') && config.pages[key()]) history.replaceState(null, '', urlFor(key()));
  new MutationObserver(rewriteLinks).observe(document.body, {childList:true,subtree:true});
  rewriteLinks();
  return {route, apply, navigate, urlFor, key};
})();

/* A short, optional entrance and a small shared vocabulary of martial movement. */
window.SchoolMotion = (() => {
  function startIntro({opening, header, home, footer, reduced}) {
    const sessionKey = 'taikachisu:intro:native-smoke-v16';
    let seen = false, state = 'waiting', holdTimer, exitTimer, safetyTimer, smokeTimer, fireTimer, filmTimer, smoke, stopFire;
    const fist = opening.querySelector('#intro-fist'), film = opening.querySelector('#intro-fire-film'), still = opening.querySelector('#intro-fire-still');
    if(film&&window.SchoolIntroMedia)film.introMedia=window.SchoolIntroMedia;
    try { seen = sessionStorage.getItem(sessionKey) === 'seen'; } catch {}
    const remember = () => { try { sessionStorage.setItem(sessionKey, 'seen'); } catch {} };
    function stopFilm() {
      opening.classList.remove('film-playing');
      film?.introMedia?.controller.abort();
      if(film?.hasAttribute('src')){film.pause();film.removeAttribute('src');film.load();}
      if(film?.introMedia?.url){URL.revokeObjectURL(film.introMedia.url);film.introMedia.url=null;}
    }
    function useStillFire() {
      if(state==='done'||opening.classList.contains('film-fallback'))return;
      if(still)still.src=still.dataset.src;
      opening.classList.add('film-fallback');
      stopFilm();
    }
    function finish() {
      clearTimeout(holdTimer); clearTimeout(exitTimer); clearTimeout(safetyTimer);clearTimeout(smokeTimer);clearTimeout(fireTimer);clearTimeout(filmTimer);
      const wasDone = state === 'done'; state = 'done';
      smoke?.stop();stopFire?.();stopFilm();
      opening.classList.remove('film-fallback');
      still?.removeAttribute('src');
      const poster=film?.introMedia?.poster;
      if(poster){poster.removeAttribute('src');film.introMedia.poster=null;}
      opening.classList.add('inactive'); opening.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('intro-pending', 'intro-transitioning');
      document.body.classList.add('intro-complete'); header.style.opacity = '1';
      header.inert = home.inert = footer.inert = false;
      if (!wasDone) window.dispatchEvent(new Event('taika:intro-complete'));
      if (opening.contains(document.activeElement)) {
        const heading = home.querySelector('h1');
        heading.tabIndex = -1; heading.focus({preventScroll:true});
      }
    }
    function dismiss(instant = false) {
      if (state === 'done') return;
      remember();
      if (instant) { finish(); return; }
      if (state !== 'waiting') return;
      state = 'leaving'; clearTimeout(holdTimer);
      // The fist triggers fire over the emblem; vapor clears as the veil grows.
      smokeTimer=setTimeout(()=>smoke?.stop(),1005);
      // Optional artwork never delays entry when a connection is slow.
      if (fist?.complete && fist.naturalWidth >= 512) fist.classList.add('ready');
      header.style.opacity = '1'; document.body.classList.add('intro-transitioning');
      fireTimer=setTimeout(() => {
        try {if(typeof createLogoFire==='function')stopFire=createLogoFire(opening.querySelector('#intro-fire'),{size:innerWidth<761?256:320,fps:20,ignite:false});} catch {}
      },1541);
      filmTimer=setTimeout(() => {
        // Missing media may replace the fire layer, never skip the seal or the sequence.
        if(!film || film.readyState<2){useStillFire();return;}
        film.muted=true;film.defaultMuted=true;film.playsInline=true;
        try{Promise.resolve(film.play()).then(()=>{
          if(state!=='done'&&!opening.classList.contains('film-fallback'))opening.classList.add('film-playing');
        }).catch(useStillFire);}catch{useStillFire();}
      },704);
      opening.classList.add('leaving'); exitTimer = setTimeout(finish, 3350);
    }
    film?.addEventListener('error',()=>{if(state==='leaving')useStillFire();});
    document.querySelector('#intro-spacer').hidden = true;
    history.scrollRestoration = 'manual';
    const skip = () => dismiss(true);
    opening.querySelector('#enter-button').addEventListener('click', skip);
    opening.addEventListener('wheel', skip, {passive:true});
    opening.addEventListener('touchmove', skip, {passive:true});
    document.addEventListener('keydown', event => {
      if (state !== 'done' && ['Escape', 'ArrowDown', 'PageDown', ' ', 'End'].includes(event.key)) {
        event.preventDefault(); skip();
      }
    });
    document.addEventListener('visibilitychange', () => {if (document.hidden && state !== 'done') skip();});
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {if (event.matches) skip();});
    if (reduced || seen || location.hash || window.SchoolSEO?.key() || navigator.connection?.saveData) {
      finish();
    } else {
      scrollTo({top:0, behavior:'instant'});
      opening.classList.remove('inactive', 'leaving'); opening.removeAttribute('aria-hidden');
      document.body.classList.add('intro-pending'); header.inert = home.inert = footer.inert = true;
      window.dispatchEvent(new Event('taika:intro-start'));
      // Time is independent of media loading and autoplay policies.
      holdTimer = setTimeout(() => dismiss(), 650);
      if (fist) {fist.fetchPriority = 'high'; fist.src = fist.dataset.src;}
      if(film){film.preload='auto';film.muted=true;film.defaultMuted=true;if(film.introMedia?.ready){film.introMedia.ready.then(url=>{if(url&&state!=='done')film.src=url;});}else if(!film.hasAttribute('src'))film.src=film.getBoundingClientRect().width<=384?film.dataset.mobileSrc:film.dataset.desktopSrc;}
      safetyTimer = setTimeout(() => {remember(); finish();}, 4400);
      try {smoke = window.SchoolSmoke?.start(opening.querySelector('#intro-smoke'), opening.querySelector('.intro-native-stage'));} catch {}
    }
    return {dismiss};
  }

  function initHome() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('.home-editorial h2').forEach(heading => {
      if (heading.querySelector('.motion-title-line')) return;
      const lines = heading.innerHTML.split(/<br\s*\/?\s*>/i);
      heading.replaceChildren();
      lines.forEach((html, index) => {
        const line = document.createElement('span'); line.className = 'motion-title-line';
        const text = document.createElement('span'); text.innerHTML = html;
        text.style.setProperty('--line-index', index); line.append(text); heading.append(line);
        if (index < lines.length - 1) heading.append(document.createTextNode(' '));
      });
    });
    // Static SEO snapshots are visible by default. Re-arm only the home reveals.
    document.querySelectorAll('.home-editorial .reveal').forEach(node => node.classList.remove('visible'));
    document.body.classList.add('home-motion-ready');
  }
  return {startIntro, initHome};
})();

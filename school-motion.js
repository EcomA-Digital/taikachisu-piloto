/* A short, optional entrance and a small shared vocabulary of martial movement. */
window.SchoolMotion = (() => {
  function startIntro({opening, header, home, footer, reduced}) {
    const sessionKey = 'taikachisu:intro:flow-first-v1';
    const video = opening.querySelector('#intro-video');
    let seen = false, state = 'waiting', loadTimer, exitTimer, deadline;
    try { seen = sessionStorage.getItem(sessionKey) === 'seen'; } catch {}
    const remember = () => { try { sessionStorage.setItem(sessionKey, 'seen'); } catch {} };
    function finish() {
      clearTimeout(loadTimer); clearTimeout(exitTimer); clearTimeout(deadline);
      state = 'done';
      video.pause();
      // Release the decoder and cancel any pending transfer after a skip/failure.
      if (video.hasAttribute('src')) { video.removeAttribute('src'); video.load(); }
      opening.classList.add('inactive'); opening.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('intro-pending', 'intro-transitioning');
      document.body.classList.add('intro-complete'); header.style.opacity = '1';
      header.inert = home.inert = footer.inert = false;
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
      state = 'leaving'; clearTimeout(loadTimer); clearTimeout(deadline);
      header.style.opacity = '1'; document.body.classList.add('intro-transitioning');
      opening.classList.add('leaving'); exitTimer = setTimeout(finish, 650);
    }
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
    video.addEventListener('playing', () => {
      if (state !== 'waiting') return;
      clearTimeout(loadTimer);
      // A stalled video must not leave the navigation locked indefinitely.
      clearTimeout(deadline); deadline = setTimeout(skip, 9000);
    }, {once:true});
    video.addEventListener('ended', () => dismiss());
    video.addEventListener('error', () => {if (state !== 'done') skip();});
    if (reduced || seen || location.hash || window.SchoolSEO?.key() || navigator.connection?.saveData) {
      finish();
    } else {
      scrollTo({top:0, behavior:'instant'});
      opening.classList.remove('inactive', 'leaving'); opening.removeAttribute('aria-hidden');
      document.body.classList.add('intro-pending'); header.inert = home.inert = footer.inert = true;
      video.muted = true; video.defaultMuted = true; video.loop = false;
      video.poster = video.dataset.poster; video.src = video.dataset.src;
      loadTimer = setTimeout(skip, 2000);
      deadline = setTimeout(skip, 11000);
      const playback = video.play();
      if (playback) playback.catch(() => {if (state !== 'done') skip();});
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

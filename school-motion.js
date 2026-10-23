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
      const wasDone = state === 'done';
      state = 'done';
      video.pause();
      // Release the decoder and cancel any pending transfer after a skip/failure.
      if (video.hasAttribute('src')) { video.removeAttribute('src'); video.load(); }
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
    function prepareFist() {
      const image = opening.querySelector('#intro-fist');
      if (!image.complete || image.naturalWidth < 1000) return;
      // AI-restored standalone artwork replaces the tiny compressed video crop.
      const w = video.videoWidth || 960, h = video.videoHeight || 540;
      const x = w * .5, y = h * .578;
      const width = w * .04, height = width * image.naturalHeight / image.naturalWidth;
      image.style.left = `${x/w*100}%`; image.style.top = `${y/h*100}%`;
      image.style.width = `${width/w*100}%`; image.style.height = `${height/h*100}%`;
      const stage = image.parentElement.getBoundingClientRect();
      image.style.setProperty('--fist-x', `${(.5-(x+width/2)/w)*stage.width}px`);
      image.style.setProperty('--fist-y', `${(.5-(y+height/2)/h)*stage.height}px`);
      image.classList.add('ready');
    }
    function dismiss(instant = false) {
      if (state === 'done') return;
      remember();
      if (instant) { finish(); return; }
      if (state !== 'waiting') return;
      prepareFist(); state = 'leaving'; clearTimeout(loadTimer); clearTimeout(deadline);
      header.style.opacity = '1'; document.body.classList.add('intro-transitioning');
      opening.classList.add('leaving'); exitTimer = setTimeout(finish, 1100);
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
      opening.classList.add('film-playing');
      const fist = opening.querySelector('#intro-fist');
      if (!fist.hasAttribute('src')) fist.src = fist.dataset.src;
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
      video.src = video.dataset.src;
      loadTimer = setTimeout(skip, 6500);
      deadline = setTimeout(skip, 15500);
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

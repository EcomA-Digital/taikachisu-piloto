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
    function prepareFist() {
      // Sample the actual last frame: keep the emblem's original red mark.
      const canvas = opening.querySelector('#intro-fist');
      if (!video.videoWidth || video.readyState < 2) return;
      try {
        const w = video.videoWidth, h = video.videoHeight;
        const x = Math.round(w * .5), y = Math.round(h * .578);
        canvas.width = Math.round(w * .04); canvas.height = Math.round(h * .065);
        const ctx = canvas.getContext('2d', {willReadFrequently:true});
        ctx.drawImage(video, x, y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < pixels.data.length; i += 4) {
          const r = pixels.data[i], g = pixels.data[i+1], b = pixels.data[i+2];
          pixels.data[i+3] = Math.round(255 * Math.max(0, Math.min(1, (r - Math.max(g,b) - r * .2) / 18)));
        }
        ctx.putImageData(pixels, 0, 0);
        canvas.style.left = `${x/w*100}%`; canvas.style.top = `${y/h*100}%`;
        canvas.style.width = `${canvas.width/w*100}%`; canvas.style.height = `${canvas.height/h*100}%`;
        const stage = canvas.parentElement.getBoundingClientRect();
        canvas.style.setProperty('--fist-x', `${(.5-(x+canvas.width/2)/w)*stage.width}px`);
        canvas.style.setProperty('--fist-y', `${(.5-(y+canvas.height/2)/h)*stage.height}px`);
        canvas.classList.add('ready');
      } catch { /* Fall back to the same clean fade if a frame cannot be sampled. */ }
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

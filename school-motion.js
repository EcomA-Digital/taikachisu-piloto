/* A short, optional entrance and a small shared vocabulary of martial movement. */
window.SchoolMotion = (() => {
  function startIntro({opening, header, home, footer, reduced}) {
    const sessionKey = 'taikachisu:intro:native-smoke-v19';
    let seen = false, state = 'waiting', holdTimer, exitTimer, safetyTimer, smoke;
    try { seen = sessionStorage.getItem(sessionKey) === 'seen'; } catch {}
    const remember = () => { try { sessionStorage.setItem(sessionKey, 'seen'); } catch {} };
    function finish() {
      clearTimeout(holdTimer); clearTimeout(exitTimer); clearTimeout(safetyTimer);
      const wasDone = state === 'done'; state = 'done';
      smoke?.stop();
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
      // Keep native smoke running through the entire emblem-to-seal dissolve.
      header.style.opacity = '1'; document.body.classList.add('intro-transitioning');
      opening.classList.add('leaving'); exitTimer = setTimeout(finish, 2850);
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
    if (reduced || seen || location.hash || window.SchoolSEO?.key() || navigator.connection?.saveData) {
      finish();
    } else {
      scrollTo({top:0, behavior:'instant'});
      opening.classList.remove('inactive', 'leaving'); opening.removeAttribute('aria-hidden');
      document.body.classList.add('intro-pending'); header.inert = home.inert = footer.inert = true;
      window.dispatchEvent(new Event('taika:intro-start'));
      // Time is independent of media loading and autoplay policies.
      holdTimer = setTimeout(() => dismiss(), 550);
      safetyTimer = setTimeout(() => {remember(); finish();}, 3500);
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

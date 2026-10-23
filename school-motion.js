/* A short, optional entrance and a small shared vocabulary of martial movement. */
window.SchoolMotion = (() => {
  function startIntro({opening, header, home, footer, reduced}) {
    const sessionKey = 'taikachisu:intro:2027';
    let seen = false, state = 'waiting', autoTimer, exitTimer, deadline;
    try { seen = sessionStorage.getItem(sessionKey) === 'seen'; } catch {}
    const remember = () => { try { sessionStorage.setItem(sessionKey, 'seen'); } catch {} };
    function finish() {
      clearTimeout(autoTimer); clearTimeout(exitTimer); clearTimeout(deadline);
      state = 'done';
      opening.classList.add('inactive');
      opening.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('intro-pending', 'intro-transitioning');
      document.body.classList.add('intro-complete');
      header.style.opacity = '1';
      header.inert = home.inert = footer.inert = false;
      if (opening.contains(document.activeElement)) {
        const heading = home.querySelector('h1');
        heading.tabIndex = -1; heading.focus({preventScroll:true});
      }
    }
    function dismiss(instant = false) {
      if (instant) { finish(); return; }
      if (state !== 'waiting') return;
      state = 'leaving'; remember(); clearTimeout(autoTimer);
      header.style.opacity = '1';
      document.body.classList.add('intro-transitioning');
      opening.classList.add('leaving');
      // The timer is also a fallback if animation events are interrupted.
      exitTimer = setTimeout(finish, 1100);
    }
    document.querySelector('#intro-spacer').hidden = true;
    history.scrollRestoration = 'manual';
    opening.querySelector('#enter-button').addEventListener('click', () => {remember(); dismiss(true);});
    opening.addEventListener('animationend', event => {
      if (event.target === opening && event.animationName === 'portal-open') finish();
    });
    // Input can skip the presentation, but is never required to progress.
    const skip = () => { if (state === 'waiting') {remember(); dismiss(true);} };
    opening.addEventListener('wheel', skip, {passive:true});
    opening.addEventListener('touchmove', skip, {passive:true});
    document.addEventListener('keydown', event => {
      if (state === 'waiting' && ['Escape', 'ArrowDown', 'PageDown', ' ', 'End'].includes(event.key)) {
        event.preventDefault(); skip();
      }
    });
    document.addEventListener('visibilitychange', () => {if (document.hidden && state !== 'done') {remember(); finish();}});
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {if (event.matches) finish();});
    if (reduced || seen || location.hash || window.SchoolSEO?.key()) {
      finish();
    } else {
      scrollTo({top:0, behavior:'instant'});
      opening.classList.remove('inactive', 'leaving'); opening.removeAttribute('aria-hidden');
      document.body.classList.add('intro-pending');
      header.inert = home.inert = footer.inert = true;
      autoTimer = setTimeout(() => dismiss(), 1450);
      deadline = setTimeout(() => {remember(); finish();}, 3200);
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

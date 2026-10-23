/* New article/cards receive the same responsive sources as static SEO documents. */
window.SchoolImages = (() => {
  function enhance(image) {
    const info = window.TAIKA_IMAGES?.[image.getAttribute('src')];
    if (!info || image.hasAttribute('srcset') || info.variants.length < 2) return;
    image.sizes = image.closest('.journal-card,.sede-card')
      ? '(max-width:760px) 88vw, (max-width:1100px) 44vw, 400px'
      : image.closest('.home-editorial-photo')
        ? '(max-width:760px) calc(100vw - 48px), 44vw'
        : '(max-width:760px) calc(100vw - 48px), 960px';
    image.srcset = info.variants.map(v => `${v.src} ${v.width}w`).join(', ');
    image.decoding = 'async';
  }
  function apply(root) {
    if (root.matches?.('img')) enhance(root);
    root.querySelectorAll?.('img[src]').forEach(enhance);
  }
  apply(document);
  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === 1) apply(node);
    }));
  }).observe(document.documentElement, {childList:true, subtree:true});
  return {apply};
})();

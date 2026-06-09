// Back-to-top floating button: appears after scrolling, smooth-scrolls up.

export function initFloating() {
  const btn = document.querySelector('[data-back-to-top]');
  if (!btn) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const onScroll = () => {
    btn.classList.toggle('is-visible', window.scrollY > 600);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
}

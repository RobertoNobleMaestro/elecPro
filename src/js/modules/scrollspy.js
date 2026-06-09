// Highlight the nav link of the section currently in view.
//
// Scroll-position based (not IntersectionObserver) so that EXACTLY ONE link is
// ever active — robust even when a spy target (#contacto) is nested inside
// another (#opiniones), or when nav order differs from DOM order
// (e.g. "Urgencias 24h" sits after "Sobre nosotros" in the document).

export function initScrollspy() {
  const links = Array.from(document.querySelectorAll('[data-spy]'));
  if (!links.length) return;

  const header = document.querySelector('[data-header]');

  const targets = links
    .map((link) => {
      const id = link.getAttribute('href')?.replace('#', '');
      const section = id && document.getElementById(id);
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  if (!targets.length) return;

  const setActive = (activeLink) => {
    links.forEach((l) => {
      if (l === activeLink) l.setAttribute('aria-current', 'true');
      else l.removeAttribute('aria-current');
    });
  };

  let ticking = false;

  const update = () => {
    ticking = false;
    const line = (header ? header.offsetHeight : 72) + 24;

    // Pick the section whose top is closest to — but not below — the line.
    // Order-independent: compares actual positions, so it's correct regardless
    // of nav order vs. DOM order and for nested targets.
    let active = targets[0].link;
    let bestTop = -Infinity;
    for (const { link, section } of targets) {
      const top = section.getBoundingClientRect().top;
      if (top <= line && top > bestTop) {
        bestTop = top;
        active = link;
      }
    }

    // At the very bottom, force the lowest section (so "Contacto" wins even if
    // its top never reaches the line on tall viewports).
    const atBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 2;
    if (atBottom) {
      active = targets.reduce((a, b) =>
        b.section.offsetTop > a.section.offsetTop ? b : a
      ).link;
    }

    setActive(active);
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

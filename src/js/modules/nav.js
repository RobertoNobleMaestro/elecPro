// Header behaviour: scroll shadow + accessible mobile drawer.

export function initNav() {
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  const backdrop = document.querySelector('[data-nav-backdrop]');

  // --- Sticky header shadow on scroll ---
  if (header) {
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (!toggle || !nav) return;

  const mqDesktop = window.matchMedia('(min-width: 64em)');

  const openMenu = () => {
    nav.classList.add('is-open');
    backdrop?.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
    // Move focus into the drawer for keyboard users.
    nav.querySelector('a, button')?.focus();
  };

  const closeMenu = ({ returnFocus = false } = {}) => {
    nav.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
    if (returnFocus) toggle.focus();
  };

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

  toggle.addEventListener('click', () => {
    isOpen() ? closeMenu({ returnFocus: true }) : openMenu();
  });

  backdrop?.addEventListener('click', () => closeMenu());

  // Close after navigating to an in-page section.
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a') && !mqDesktop.matches) closeMenu();
  });

  // Escape closes the drawer.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) closeMenu({ returnFocus: true });
  });

  // Reset state when crossing into desktop layout.
  mqDesktop.addEventListener('change', (e) => {
    if (e.matches) closeMenu();
  });

  // Simple focus trap while the drawer is open.
  nav.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !isOpen() || mqDesktop.matches) return;
    const focusables = nav.querySelectorAll(
      'a[href], button:not([disabled]), input, select, textarea'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

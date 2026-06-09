// ELEC PRO — app entry point. Wires every interactive module.
import { initNav } from './modules/nav.js';
import { initScrollspy } from './modules/scrollspy.js';
import { initReveal } from './modules/reveal.js';
import { initReviews } from './modules/reviews.js';
import { initForm } from './modules/form.js';
import { initFloating } from './modules/floating.js';

function init() {
  initNav();
  initScrollspy();
  initReveal();
  initReviews();
  initForm();
  initFloating();

  // Footer year
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

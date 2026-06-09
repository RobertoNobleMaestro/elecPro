// Reviews carousel: scroll-snap track + synced dots (mobile),
// plus a "Ver más opiniones" button that appends extra reviews.

import { moreReviews } from '../data/reviews.js';

const STAR =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 2.9 6.26 6.6.5-5 4.3 1.5 6.44L12 16.9 5.99 19.5l1.5-6.44-5-4.3 6.6-.5L12 2z"/></svg>';

function buildCard({ name, role, rating, quote }) {
  const li = document.createElement('li');
  li.className = 'review-card reveal';
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  li.innerHTML = `
    <div class="review-card__top">
      <div class="review-card__stars" role="img" aria-label="${rating} de 5 estrellas">
        ${STAR.repeat(rating)}
      </div>
      <svg class="rating__google" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M21.6 12.2c0-.6-.1-1.2-.2-1.8H12v3.4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.1z"/>
        <path fill="#34A853" d="M12 22c2.7 0 5-1 6.6-2.6l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/>
        <path fill="#FBBC05" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.6H3.1a10 10 0 0 0 0 8.8l3.3-2.6z"/>
        <path fill="#EA4335" d="M12 6.3c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.6l3.3 2.6C7.2 8 9.4 6.3 12 6.3z"/>
      </svg>
    </div>
    <p class="review-card__quote">"${quote}"</p>
    <div class="review-card__author">
      <span class="review-card__avatar" aria-hidden="true">${initials}</span>
      <span>
        <span class="review-card__name">${name}</span>
        <span class="review-card__role">${role}</span>
      </span>
    </div>`;
  return li;
}

export function initReviews() {
  const track = document.querySelector('[data-reviews-track]');
  const dotsWrap = document.querySelector('[data-reviews-dots]');
  const moreBtn = document.querySelector('[data-reviews-more]');
  if (!track) return;

  const cards = () => Array.from(track.children);

  // --- Dots reflect the cards and the current scroll position ---
  function renderDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = '';
    cards().forEach((_card, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'reviews__dot';
      dot.setAttribute('aria-label', `Ir a la opinión ${i + 1}`);
      dot.addEventListener('click', () => {
        cards()[i].scrollIntoView({
          behavior: 'smooth',
          inline: 'start',
          block: 'nearest',
        });
      });
      dotsWrap.appendChild(dot);
    });
    syncDots();
  }

  function syncDots() {
    if (!dotsWrap) return;
    const items = cards();
    // Index closest to the track's left edge.
    const left = track.scrollLeft;
    let active = 0;
    let min = Infinity;
    items.forEach((card, i) => {
      const d = Math.abs(card.offsetLeft - track.offsetLeft - left);
      if (d < min) {
        min = d;
        active = i;
      }
    });
    Array.from(dotsWrap.children).forEach((dot, i) =>
      dot.classList.toggle('is-active', i === active)
    );
  }

  let raf = 0;
  track.addEventListener(
    'scroll',
    () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncDots);
    },
    { passive: true }
  );

  // --- Load more reviews on demand ---
  moreBtn?.addEventListener('click', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    moreReviews.forEach((r) => {
      const card = buildCard(r);
      if (reduce) card.classList.add('is-visible');
      track.appendChild(card);
      // Trigger the reveal transition on the next frame.
      if (!reduce) requestAnimationFrame(() => card.classList.add('is-visible'));
    });
    renderDots();
    moreBtn.remove();
  });

  renderDots();
}
